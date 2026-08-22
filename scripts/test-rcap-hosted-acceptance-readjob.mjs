#!/usr/bin/env node
// The hosted matrix's job read, executed from the shipped bytes.
//
// It used to hash the fencing token in SQL, with extensions.digest(...). That
// function is not available to the Management API on the acceptance project, so
// the whole query errored, the non-array error body fell through an
// `Array.isArray(...) ? ... : null` and readJob returned null — and run
// 32195867963 reported a job that plainly existed, and that the binding case
// read successfully moments later, as "(no job row)". A broken diagnostic
// reported itself as a finding about the product.
//
// So: the token is fetched raw and hashed in Node, and a failed query is a
// different outcome from an empty result. This drives the real function with a
// stubbed transport across every case and checks what it returns and what it
// leaks.

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = path.join(rootDir, "scripts/rcap-hosted-acceptance-payment.mjs");
const source = fs.readFileSync(TARGET, "utf8");

// ---------------------------------------------------------------------------
// --mutations: put each defect back and require this file to go red for it.
// ---------------------------------------------------------------------------
if (process.argv.includes("--mutations")) {
  const { spawnSync } = await import("node:child_process");
  const { registerMutationRestore } = await import("./lib/mutation-restore-guard.mjs");
  const { registerTrackedMutation } = await import("./lib/tracked-mutation-guard.mjs");
  const REL = "scripts/rcap-hosted-acceptance-payment.mjs";
  registerTrackedMutation("test-rcap-hosted-acceptance-readjob.mjs", [REL]);
  const original = fs.readFileSync(TARGET);
  const restore = () => fs.writeFileSync(TARGET, original);
  const disposeGuard = registerMutationRestore(restore);
  const swap = (find, replacement) => {
    const current = fs.readFileSync(TARGET, "utf8");
    const at = current.indexOf(find);
    if (at < 0) throw new Error(`could not locate: ${find.slice(0, 80)}`);
    if (current.indexOf(find, at + find.length) >= 0) throw new Error(`ambiguous: ${find.slice(0, 80)}`);
    fs.writeFileSync(TARGET, current.slice(0, at) + replacement + current.slice(at + find.length));
  };
  let caught = 0;
  let broken = 0;
  const mutation = (name, mutate, marker) => {
    restore();
    try { mutate(); } catch (error) { console.error(`  ERROR    ${name}: ${error.message}`); broken += 1; restore(); return; }
    const run = spawnSync(process.execPath, [path.join(rootDir, "scripts/test-rcap-hosted-acceptance-readjob.mjs")],
      { cwd: rootDir, encoding: "utf8", timeout: 120000 });
    restore();
    const out = `${run.stdout ?? ""}${run.stderr ?? ""}`;
    if (run.status === 0) { console.error(`  SURVIVED ${name}`); broken += 1; return; }
    if (!out.includes(marker)) {
      console.error(`  WRONG    ${name}: red, but not for the expected reason\n           expected: ${marker}`);
      broken += 1; return;
    }
    caught += 1;
    console.log(`  caught   ${name}`);
  };

  // 1 — the exact defect: hash in SQL again, through a function the acceptance
  //     project does not expose.
  // Each anchor runs to the FOLLOWING line. The target-aware journey added a
  // claim-state snapshot and a claim-order read that select the same columns
  // and guard the same non-array error body, so the one-line anchors these
  // mutations used became prefixes of three different queries — `swap` then
  // refused them as ambiguous rather than silently mutating the wrong one.
  mutation("the token is hashed in SQL again", () => {
    swap("           fencing_token, next_attempt_at,\n           error_code, failure_disposition,",
      "           encode(extensions.digest(convert_to(coalesce(fencing_token::text, ''), 'utf8'), 'sha256'), 'hex') as fencing_token_sha256, next_attempt_at,\n           error_code, failure_disposition,");
  }, "FAIL R-source-no-sql-hash");

  // 2 — a failed query is reported as an absent job, which is what turned a
  //     broken diagnostic into a finding about the product.
  mutation("a failed query is reported as no_row", () => {
    swap("  if (!Array.isArray(res.json)) {\n    const detail =", "  if (false) {\n    const detail =");
    swap("  const row = res.json[0] ?? null;", "  const row = Array.isArray(res.json) ? res.json[0] ?? null : null;");
  }, "FAIL R-6");

  // 3 — the raw claim token is carried out on the row.
  mutation("the raw claim token is returned on the row", () => {
    swap("  const rawToken = row.fencing_token;\n  delete row.fencing_token;", "  const rawToken = row.fencing_token;");
  }, "FAIL R-5");

  restore();
  disposeGuard();
  if (!fs.readFileSync(TARGET).equals(original)) { console.error(`  DIRTY    ${REL}`); broken += 1; }
  console.log("");
  if (broken > 0) {
    console.error(`test-rcap-hosted-acceptance-readjob --mutations FAILED: ${broken} did not hold.`);
    process.exit(1);
  }
  console.log(`test-rcap-hosted-acceptance-readjob --mutations passed: ${caught}/${caught} mutations red, file restored.`);
  process.exit(0);
}

let failed = 0;
function check(id, title, ok, observed) {
  if (!ok) failed += 1;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${id}  ${title}${ok ? "" : `\n         observed: ${observed}`}`);
}

// ---------------------------------------------------------------------------
// Extract readJob and jobRowOrNull from the shipped bytes and run them against
// an injected transport. Reimplementing them here would prove nothing.
// ---------------------------------------------------------------------------
// The signature carries the target id now: the read is bound to the job the
// paid render returned, not to "the newest row for this briefcase item". A
// webhook replay enqueues a second job for the same item, so the old anchor
// would silently start describing a different row than the one that was paid
// for. Anchored on the name and the opening brace so the parameter list can
// evolve without this extractor going quietly stale.
const start = source.search(/async function readJob\([^)]*\) \{/);
const end = source.indexOf("const jobRowOrNull =", start);
const tail = source.indexOf("\n", source.indexOf("readOutcome === \"row\" ? read : null)", end));
if (start < 0 || end < 0 || tail < 0) {
  console.error("  FAIL extract  could not locate readJob in the hosted acceptance script");
  process.exit(1);
}
const extracted = `
import crypto from "node:crypto";
export let sqlCalls = [];
export let nextResponse = null;
const sql = async (query) => { sqlCalls.push(query); return nextResponse; };
const itemId = "22222222-2222-4222-8222-222222222222";
export const targetJobId = "14c626c2-d287-4d5f-8fef-172fec8e52b9";
const sqlText = (value) => String(value).split("'").join("''");
const redactSecrets = (text) => String(text ?? "").replace(/eyJ[A-Za-z0-9_.-]{20,}/g, "***REDACTED***");
export const setResponse = (value) => { nextResponse = value; };
${source.slice(start, tail)}
export { readJob, jobRowOrNull };
`;
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-readjob-"));
const temp = path.join(tempDir, "readjob.mjs");
fs.writeFileSync(temp, extracted);
const mod = await import(pathToFileURL(temp).href);

const RAW_TOKEN = "c6323322-9cc3-4005-8031-99ffe025ef06";
const ROW = {
  id: "ca12bf6b-6ace-4e02-af5c-70e1bfb7d331",
  status: "artifact_validated",
  attempt_count: 1,
  fencing_token: RAW_TOKEN,
  person_id: "c2b1ec38-1ef9-4ad1-a20f-4bf574f20ea2",
  matter_id: "71c73560-c0f4-4feb-9aaf-ddc00e65a17f",
  output_storage_path: "consumer/x/y.pdf",
  output_sha256: "e".repeat(64)
};

// 1 — a real row comes back with no pgcrypto anywhere in the query.
mod.setResponse({ status: 200, json: [structuredClone(ROW)] });
const row = await mod.readJob();
check("R-1", "a real row is returned, and the query never asks the database to hash",
  row.readOutcome === "row" && row.id === ROW.id && !/digest\s*\(/i.test(mod.sqlCalls.join("\n")) && !/pgcrypto|extensions\./i.test(mod.sqlCalls.join("\n")),
  `outcome=${row.readOutcome}; query mentions digest/extensions: ${/digest\s*\(|extensions\./i.test(mod.sqlCalls.join("\n"))}`);

// 5 — a deterministic fingerprint, and the raw token gone from the result.
check("R-5", "the claim token is recorded as a deterministic sha256 fingerprint, never itself",
  row.fencingTokenOutcome === "hashed"
  && row.fencingTokenSha256 === crypto.createHash("sha256").update(RAW_TOKEN, "utf8").digest("hex")
  && !("fencing_token" in row),
  `outcome=${row.fencingTokenOutcome}; fingerprint=${row.fencingTokenSha256}; fencing_token still present=${"fencing_token" in row}`);

// 2, 3, 4 — the raw token appears in nothing the run emits.
{
  const serialized = JSON.stringify(row);
  const printed = [];
  const originalLog = console.log;
  const originalError = console.error;
  console.log = (...args) => printed.push(args.join(" "));
  console.error = (...args) => printed.push(args.join(" "));
  console.log(`  worker cycle 1: job ${row.status}`);
  console.log(JSON.stringify({ jobStateAfter: row }));
  console.log = originalLog;
  console.error = originalError;
  check("R-2-3-4", "the raw claim token reaches neither the serialized diagnostics nor stdout nor stderr",
    !serialized.includes(RAW_TOKEN) && !printed.join("\n").includes(RAW_TOKEN),
    `in serialized diagnostics: ${serialized.includes(RAW_TOKEN)}; in printed output: ${printed.join("\n").includes(RAW_TOKEN)}`);
}

// 8, 9 — the fields the other cases depend on survive the change.
check("R-8", "the binding case can still read person_id and matter_id",
  row.person_id === ROW.person_id && row.matter_id === ROW.matter_id,
  `person_id=${row.person_id} matter_id=${row.matter_id}`);
check("R-9", "the artifact identity the worker case compares against survives",
  row.output_storage_path === ROW.output_storage_path && row.output_sha256 === ROW.output_sha256,
  `path=${row.output_storage_path} sha=${row.output_sha256}`);

// The read follows the id it is given, and defaults to the run's target. This
// is the whole point of the signature change: a webhook replay enqueues a
// second job for the same briefcase item, and the old read took whichever was
// newest.
{
  mod.sqlCalls.length = 0;
  mod.setResponse({ status: 200, json: [structuredClone(ROW)] });
  await mod.readJob();
  const defaulted = mod.sqlCalls.at(-1);
  mod.sqlCalls.length = 0;
  const OTHER = "cab14012-a0ad-44d1-80d2-d0d4bebc87d8";
  await mod.readJob(OTHER);
  const explicit = mod.sqlCalls.at(-1);
  check("R-target-bound", "the read selects the id it is given, and defaults to this run's target job",
    defaulted.includes(`where id = '${mod.targetJobId}'`)
    && explicit.includes(`where id = '${OTHER}'`)
    && !explicit.includes(mod.targetJobId)
    // consumer_briefcase_item_id is legitimately SELECTED — the binding case
    // reads it. What must not come back is a WHERE that picks the row by item.
    && !/where\s+(consumer_)?briefcase_item_id/.test(defaulted),
    `defaulted query names the target: ${defaulted.includes(mod.targetJobId)}; explicit query names the id passed: ${explicit.includes(OTHER)}`);
}

// 7 — an actually empty result is no_row.
mod.setResponse({ status: 200, json: [] });
const empty = await mod.readJob();
check("R-7", "an empty result is reported as no_row", empty.readOutcome === "no_row", `outcome=${empty.readOutcome}`);

// 6 — a failed query is query_error, never no_row.
for (const [label, response] of [
  ["a PostgREST error body", { status: 400, json: { code: "42883", message: 'function extensions.digest(bytea, unknown) does not exist' } }],
  ["an unparseable body", { status: 500, json: null }],
  ["an error string", { status: 403, json: { error: "permission denied for schema extensions" } }]
]) {
  mod.setResponse(response);
  const errored = await mod.readJob();
  check(`R-6-${label.replace(/\W+/g, "-")}`, `${label} is reported as query_error, not no_row`,
    errored.readOutcome === "query_error"
    && typeof errored.readErrorClass === "string" && errored.readErrorClass.length > 0
    && typeof errored.readErrorMessage === "string",
    `outcome=${errored.readOutcome} class=${errored.readErrorClass} message=${errored.readErrorMessage}`);
}

// A query error carries a sanitized message and no credential.
mod.setResponse({ status: 400, json: { code: "42501", message: "denied for eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.aaaaaaaaaaaaaaaaaaaaaa" } });
const sanitized = await mod.readJob();
check("R-6-sanitized", "a query error carries a sanitized class and message, with no credential",
  sanitized.readErrorClass === "42501"
  && sanitized.readErrorMessage.includes("***REDACTED***")
  && !/eyJ[A-Za-z0-9_.-]{20,}/.test(sanitized.readErrorMessage),
  sanitized.readErrorMessage);

// jobRowOrNull is what every downstream case must use, so an errored read can
// never be mistaken for a job.
check("R-guard", "only a genuine row passes jobRowOrNull",
  mod.jobRowOrNull(row)?.id === ROW.id
  && mod.jobRowOrNull(empty) === null
  && mod.jobRowOrNull(sanitized) === null
  && mod.jobRowOrNull(null) === null,
  "jobRowOrNull admitted something other than a row");

// ---------------------------------------------------------------------------
// Shape, in the shipped bytes.
// ---------------------------------------------------------------------------
// Comments describe the defect and have to be able to name it; only code counts.
const code = source
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");
check("R-source-no-sql-hash", "the job query does not depend on a database hashing function",
  !/extensions\.digest/.test(code) && !/encode\(\s*digest/.test(code),
  "the query still hashes in SQL, which is what broke the read");
check("R-source-outcomes", "the read distinguishes row, no_row and query_error",
  /readOutcome: "query_error"/.test(source) && /readOutcome: "no_row"/.test(source) && /readOutcome: "row"/.test(source),
  "the three read outcomes are not all distinguished");
check("R-source-downstream", "downstream cases consume the row through jobRowOrNull",
  /jobRowOrNull\(jobAfter\);/.test(source),
  "a read outcome is being used directly as a job row");
// The read is bound to the job the paid render returned. Selecting the newest
// row for the briefcase item was safe only while exactly one job existed per
// item — and the replay case deliberately makes a second one, so the artifact,
// delivery and replay cases could each have been describing a different row.
check("R-source-target-bound", "the job read selects by the target job id, not by the newest row for the item",
  /where id = '\$\{sqlText\(jobId\)\}'/.test(source)
  && !/from public\.packet_render_jobs\s*\n\s*where briefcase_item_id/.test(source),
  "the read still takes the newest row for the briefcase item, so a replay-enqueued second job can silently replace the paid one");

fs.rmSync(tempDir, { recursive: true, force: true });
console.log("");
assert.equal(typeof mod.readJob, "function");
if (failed > 0) {
  console.error(`test-rcap-hosted-acceptance-readjob FAILED: ${failed} check(s) did not hold.`);
  process.exit(1);
}
console.log("test-rcap-hosted-acceptance-readjob passed: a failed query is never reported as a missing job, and the claim token never leaves as itself.");
