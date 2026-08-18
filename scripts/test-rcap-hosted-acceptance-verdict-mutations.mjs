#!/usr/bin/env node
// Proves every part of the hosted-acceptance verdict guard is load-bearing.
//
// The guard exists because two false greens shipped: a four-argument record()
// call that made its case incapable of failing, and a worker case that read an
// exit code as a delivery. A guard that has never gone red is not evidence, so
// each case below puts one of those defects back and requires the verifier to
// fail for the right reason.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { registerMutationRestore } from "./lib/mutation-restore-guard.mjs";
import { registerTrackedMutation } from "./lib/tracked-mutation-guard.mjs";

const TARGET = "scripts/rcap-hosted-acceptance-payment.mjs";
registerTrackedMutation("test-rcap-hosted-acceptance-verdict-mutations.mjs", [TARGET]);

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const original = fs.readFileSync(path.join(rootDir, TARGET));
function restore() { fs.writeFileSync(path.join(rootDir, TARGET), original); }
const disposeGuard = registerMutationRestore(restore);

const read = () => fs.readFileSync(path.join(rootDir, TARGET), "utf8");
const write = (s) => fs.writeFileSync(path.join(rootDir, TARGET), s);
/** Replaces exactly once, and refuses to pretend it mutated anything if it did not. */
function swap(find, replacement) {
  const s = read();
  const at = s.indexOf(find);
  if (at < 0) throw new Error(`could not locate: ${find.slice(0, 90)}`);
  if (s.indexOf(find, at + find.length) >= 0) throw new Error(`ambiguous, appears more than once: ${find.slice(0, 90)}`);
  write(s.slice(0, at) + replacement + s.slice(at + find.length));
}

let caught = 0;
let failed = 0;
function mutation(name, mutate, marker) {
  restore();
  try { mutate(); } catch (error) { console.error(`  ERROR    ${name}: ${error.message}`); failed += 1; restore(); return; }
  const run = spawnSync(process.execPath, [path.join(rootDir, "scripts/verify-rcap-hosted-acceptance-verdicts.mjs")],
    { cwd: rootDir, encoding: "utf8", timeout: 120000 });
  restore();
  const out = `${run.stdout ?? ""}${run.stderr ?? ""}`;
  if (run.status === 0) { console.error(`  SURVIVED ${name}`); failed += 1; return; }
  if (!out.includes(marker)) {
    console.error(`  WRONG    ${name}: red, but not for the expected reason\n           expected: ${marker}`);
    failed += 1; return;
  }
  caught += 1;
  console.log(`  caught   ${name}`);
}

// 1 — the argument count is no longer checked, so a stray argument slides a
//     truthy string into the verdict position exactly as it did on main.
mutation("record() stops checking its argument count", () => {
  swap(`  if (arguments.length !== 3) {
    throw new TypeError(\`record(caseId, passed, observed) takes exactly 3 arguments; \${arguments.length} given for "\${caseId}"\`);
  }
`, "");
}, "FAIL G-arity");

// 2 — a truthiness test instead of a type test: every non-empty string passes.
mutation("record() accepts anything truthy as a verdict", () => {
  swap(`if (typeof passed !== "boolean") {`, "if (!passed && passed !== false) {");
}, "FAIL R-a-string");

// 3 — a second verdict silently overwrites the first.
mutation("a case can be recorded twice", () => {
  swap(`  if (verdicts.has(caseId)) {
    throw new Error(\`record("\${caseId}") was called twice; a second verdict would silently overwrite the first\`);
  }
`, "");
}, "FAIL R-duplicate");

// 4 — an unexplained verdict is accepted.
mutation("record() accepts an empty observation", () => {
  swap(`if (typeof observed !== "string" || observed.trim() === "") {`, "if (false) {");
}, "FAIL R-an-empty-observation");

// 5 — the exact defect that shipped: a fourth argument at a real call site.
mutation("a call site passes four arguments again", () => {
  swap(`    "unpaid_render_is_refused_for_payment",
    res.status === 402,`, `    "unpaid_render_is_refused_for_payment",
    "seeded_item_agrees_with_the_authoritative_resolver",
    res.status === 402,`);
}, "FAIL C-arity");

// 6 — the worker verdict goes back to reading a process exit code, which is
//     how a claimed job with no artifact was reported ok.
mutation("the worker verdict reads the process exit code again", () => {
  swap("    unmet.length === 0 && contradiction === null,",
    "    lastCycle?.exitCode === 0 && Boolean(job) && job.status !== \"failed\",");
}, "FAIL W-verdict");

// 7 — a claimed job stops counting as in flight.
mutation("a claimed job is no longer a failure", () => {
  swap(`const NON_TERMINAL = new Set(["queued", "claimed", "rendering", "validating", "failed", "retryable", "expired"]);`,
    `const NON_TERMINAL = new Set(["queued", "rendering", "validating"]);`);
}, "FAIL W-non-terminal");

// 7a — the cycle result is read from the stream docker also writes to, which is
//      exactly how it was lost the first time.
mutation("the cycle result is parsed from stdout and stderr together", () => {
  swap("    const cycleResult = parseCycleResult(run.stdout);",
    "    const cycleResult = parseCycleResult(`${run.stdout}${run.stderr}`);");
}, "FAIL W-cycle-result");

// 7b — the worker's own account and the database are no longer cross-checked.
mutation("a worker account contradicting the database is tolerated", () => {
  const s = read();
  const start = s.indexOf("  const contradiction =");
  const end = s.indexOf("  record(\n    \"worker_renders_and_stores_the_artifact\",");
  if (start < 0 || end <= start) throw new Error("could not locate the contradiction cross-check");
  write(`${s.slice(0, start)}  const contradiction = null;\n${s.slice(end)}`);
}, "FAIL W-contradiction");

// 7c — the container inherits the 600-second default lease again, under which a
//      stuck claim can never be recovered inside the run.
mutation("the claim duration goes back to the worker default", () => {
  swap("const WORKER_CLAIM_SECONDS = 120;", "const WORKER_CLAIM_SECONDS = 600;");
}, "FAIL W-claim-seconds");

// 7d — the delivery conditions lose the immutable-digest and cycle-identity
//      requirements, so any image and any job could satisfy the case.
mutation("the worker case stops requiring an immutable digest", () => {
  swap("    pulled_by_immutable_digest: /@sha256:[0-9a-f]{64}$/.test(WORKER_DIGEST_REF),",
    "    pulled_by_immutable_digest_removed: true,");
}, "FAIL W-conditions");

// 7e — the binding case loses its negative controls, leaving a binding that
//      nothing can violate.
mutation("the binding case stops proving a substitution is refused", () => {
  swap(`    && isFalse(auth?.other_person_valid)
    && isFalse(auth?.other_matter_valid)
    && isFalse(auth?.other_user_valid);`, "    ;");
}, "FAIL I-binding-negatives");

// 7f — the owner's content type stops being checked, so any 200 with the right
//      bytes would pass however it was labelled.
mutation("the owner's content type is no longer required to be PDF", () => {
  swap(`  const ownerServed = ownerPdf && ownerPdfContentType
    && ownerHash === (evidence.worker?.validation ? finalJob?.output_sha256 : null);`,
    "  const ownerServed = ownerPdf\n    && ownerHash === (evidence.worker?.validation ? finalJob?.output_sha256 : null);");
}, "FAIL I-delivery-content-type");

// 7g — the jurisdiction scope disappears, letting a green matrix read as
//      Pennsylvania or Illinois coverage it never performed.
mutation("the evidence stops separating the matrix from the PA and IL findings", () => {
  swap("  evidence.jurisdictionScope = JURISDICTION_SCOPE;\n", "");
}, "FAIL J-scope");

// 8 — the streams are concatenated and cut down again, which is what left one
//     character of the worker's own output in the log.
mutation("the worker output is truncated to a tail again", () => {
  swap("      stdout: redact(run.stdout),", "      stdout: `${redact(run.stdout)}${redact(run.stderr)}`.slice(-260),");
}, "FAIL W-logs");

// 9 — the binding case depends on finalization again, so one unfinalized job
//     produces a second, misattributed failure.
mutation("the binding case joins the post-validation accounting row again", () => {
  swap("           public.consumer_matter_id_for_briefcase_item(b.id) as canonical_matter_id",
    "           c.person_id as consumption_person_id from public.consumer_packet_payment_consumption c --");
}, "FAIL I-binding");

// 10 — the replay case demands an entitlement that only finalization writes.
mutation("the replay case requires a finalization-written entitlement", () => {
  swap("    replayRes.status === 200 && moved.length === 0,",
    "    replayRes.status === 200 && moved.length === 0 && String(a?.entitlements) === \"1\",");
}, "FAIL I-replay");

// 11 — delivery passes on refusals alone, with nobody receiving anything.
mutation("delivery passes without the owner receiving the artifact", () => {
  swap("    ownerServed && refused(stranger) && refused(anonymous) && refused(legacy),",
    "    refused(stranger) && refused(anonymous) && refused(legacy),");
}, "FAIL I-delivery");

// 12 — delivery goes back to the legacy DTC route, which cannot serve a
//      render-job artifact and answers 409 however healthy the worker is.
mutation("delivery is pointed back at the legacy consumer route", () => {
  swap("  const download = `/api/rcap/packets/${jobId}/download`;",
    "  const download = `/api/expungement-ai/packet/download?briefcaseItemId=${itemId}`;");
}, "FAIL I-delivery-route");

restore();
disposeGuard();
if (!fs.readFileSync(path.join(rootDir, TARGET)).equals(original)) {
  console.error(`  DIRTY    ${TARGET}`);
  failed += 1;
}
console.log("");
if (failed > 0) {
  console.error(`test-rcap-hosted-acceptance-verdict-mutations FAILED: ${failed} did not hold.`);
  process.exit(1);
}
console.log(`test-rcap-hosted-acceptance-verdict-mutations passed: ${caught}/${caught} mutations red, file restored.`);
