#!/usr/bin/env node
// Proves the hosted acceptance matrix cannot report a verdict it has not earned.
//
// Two false greens have already been shipped by this one file, and neither
// looked like a bug from the log: a four-argument record() call slid a
// non-empty string into `passed`, and the worker case accepted `exit 0 and the
// job is not failed` for a job still sitting in 'claimed' with no artifact path
// and nothing in storage. Both printed "ok".
//
// The hosted script itself cannot run here — it needs Stripe, Vercel and the
// acceptance project — so this checks the two things that do not need them:
// the verdict function's actual behaviour, extracted from the shipped bytes and
// executed, and the shape of every call site and verdict expression in the file.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TARGET = path.join(rootDir, "scripts/rcap-hosted-acceptance-payment.mjs");
const source = fs.readFileSync(TARGET, "utf8");

let failed = 0;
function check(id, title, ok, observed) {
  if (!ok) failed += 1;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${id}  ${title}${ok ? "" : `\n         observed: ${observed}`}`);
}

// ---------------------------------------------------------------------------
// 1. record() behaviour, executed. Extracted from the shipped bytes rather than
//    reimplemented, so this cannot pass against a copy that no longer matches.
// ---------------------------------------------------------------------------
const start = source.indexOf("const verdicts = new Map();");
const bodyStart = source.indexOf("function record(caseId, passed, observed) {", start);
const bodyEnd = source.indexOf("\n}\n", bodyStart);
if (start < 0 || bodyStart < 0 || bodyEnd < 0) {
  console.error("  FAIL extract  could not locate the verdict function in the hosted acceptance script");
  process.exit(1);
}
const extracted = `${source.slice(start, bodyEnd + 3)}\nexport { record, verdicts };\n`;
const temp = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "rcap-verdicts-")), "record.mjs");
fs.writeFileSync(temp, extracted);
const { record, verdicts } = await import(pathToFileURL(temp).href);

const REJECTED = [
  ["a string", () => record("case", "seeded_item_agrees_with_the_authoritative_resolver", "observed")],
  ["an empty string", () => record("case", "", "observed")],
  ["a number", () => record("case", 1, "observed")],
  ["zero", () => record("case", 0, "observed")],
  ["an object", () => record("case", {}, "observed")],
  ["an array", () => record("case", [], "observed")],
  ["null", () => record("case", null, "observed")],
  ["undefined", () => record("case", undefined, "observed")],
  ["a Boolean object", () => record("case", new Boolean(true), "observed")],
  ["two arguments", () => record("case", true)],
  ["one argument", () => record("case")],
  ["four arguments", () => record("case", "stray", true, "observed")],
  ["an empty case id", () => record("", true, "observed")],
  ["an empty observation", () => record("case", true, "")]
];
for (const [name, call] of REJECTED) {
  let threw = false;
  try { call(); } catch { threw = true; }
  check(
    `R-${name.replace(/\W+/g, "-")}`,
    `record() refuses ${name}`,
    threw && verdicts.size === 0,
    threw ? `it threw but left ${verdicts.size} verdict(s) behind` : "it returned instead of throwing"
  );
  verdicts.clear();
}

// The accepting cases, so this is a verdict function and not a wall. record()
// prints, and its printing here would read as matrix output in a CI log, so the
// two proving calls are made quietly.
let accepted = true;
const printed = console.log;
console.log = () => {};
try {
  record("passing", true, "an observation");
  record("failing", false, "another observation");
  console.log = printed;
} catch (error) {
  console.log = printed;
  accepted = false;
  check("R-accepts", "record() still accepts real boolean verdicts", false, String(error.message));
}
if (accepted) {
  check("R-accepts", "record() accepts real boolean verdicts",
    verdicts.get("passing")?.passed === true && verdicts.get("failing")?.passed === false,
    JSON.stringify([...verdicts]));
  let duplicated = false;
  console.log = () => {};
  try { record("passing", false, "a contradicting observation"); } catch { duplicated = true; }
  console.log = printed;
  check("R-duplicate", "a second verdict for the same case throws instead of overwriting",
    duplicated && verdicts.get("passing")?.passed === true,
    `passing is now ${JSON.stringify(verdicts.get("passing"))}`);
}
fs.rmSync(path.dirname(temp), { recursive: true, force: true });

// ---------------------------------------------------------------------------
// 2. Every call site passes exactly three arguments.
//
//    The four-argument call was invisible to node --check and to eslint, and it
//    made its case incapable of failing. Counting arguments needs a scanner
//    that understands strings and template literals, because the observations
//    are template literals full of commas.
// ---------------------------------------------------------------------------
/**
 * Replaces the CONTENTS of every string, template chunk and comment with a
 * placeholder, leaving quotes, braces, parentheses and interpolated code in
 * place. Newlines survive so line numbers stay true. Without this the scanner
 * finds `record(` inside record()'s own error messages and counts the commas of
 * every observation template as arguments.
 */
function maskLiterals(text) {
  const out = text.split("");
  const blank = (from, to) => {
    for (let i = from; i < to && i < out.length; i += 1) if (out[i] !== "\n") out[i] = "x";
  };
  const stack = [{ kind: "code" }];
  let i = 0;
  while (i < text.length) {
    const top = stack[stack.length - 1];
    const ch = text[i];
    const next = text[i + 1];
    if (top.kind === "line") { if (ch === "\n") stack.pop(); else blank(i, i + 1); i += 1; continue; }
    if (top.kind === "block") {
      if (ch === "*" && next === "/") { blank(i, i + 2); stack.pop(); i += 2; continue; }
      blank(i, i + 1); i += 1; continue;
    }
    if (top.kind === "string") {
      if (ch === "\\") { blank(i, i + 2); i += 2; continue; }
      if (ch === top.quote) { stack.pop(); i += 1; continue; }
      blank(i, i + 1); i += 1; continue;
    }
    if (top.kind === "template") {
      if (ch === "\\") { blank(i, i + 2); i += 2; continue; }
      if (ch === "`") { stack.pop(); i += 1; continue; }
      if (ch === "$" && next === "{") { stack.push({ kind: "code", interpolation: true, braces: 0 }); i += 2; continue; }
      blank(i, i + 1); i += 1; continue;
    }
    // code
    if (ch === "/" && next === "/") { stack.push({ kind: "line" }); blank(i, i + 2); i += 2; continue; }
    if (ch === "/" && next === "*") { stack.push({ kind: "block" }); blank(i, i + 2); i += 2; continue; }
    if (ch === "'" || ch === '"') { stack.push({ kind: "string", quote: ch }); i += 1; continue; }
    if (ch === "`") { stack.push({ kind: "template" }); i += 1; continue; }
    // Brace bookkeeping, so an ordinary block's closing brace does not get
    // mistaken for the end of a `${...}` interpolation.
    if (ch === "{") { top.braces = (top.braces ?? 0) + 1; i += 1; continue; }
    if (ch === "}") {
      if ((top.braces ?? 0) > 0) top.braces -= 1;
      else if (top.interpolation) stack.pop();
      i += 1; continue;
    }
    i += 1;
  }
  return out.join("");
}

function argumentCounts(text) {
  const masked = maskLiterals(text);
  const sites = [];
  const CALL = /(^|[^.\w])record\s*\(/g;
  let match;
  while ((match = CALL.exec(masked)) !== null) {
    const open = masked.indexOf("(", match.index);
    let depth = 0;
    let commas = 0;
    let empty = true;
    for (let i = open; i < masked.length; i += 1) {
      const ch = masked[i];
      if (ch === "(" || ch === "[" || ch === "{") { depth += 1; continue; }
      if (ch === ")" || ch === "]" || ch === "}") {
        depth -= 1;
        if (depth === 0) {
          sites.push({ line: masked.slice(0, match.index).split("\n").length, args: empty ? 0 : commas + 1 });
          break;
        }
        continue;
      }
      if (ch === "," && depth === 1) { commas += 1; continue; }
      if (depth >= 1 && !/\s/.test(ch)) empty = false;
    }
  }
  return sites;
}
// The scanner has to be right, so it is checked against known shapes first.
const SCANNER_FIXTURES = [
  ["record(\"a\", true, \"b\")", 3],
  ["record(\"a\", true, `b, c ${d}, e`)", 3],
  ["record(\"a\", \"stray\", true, \"b\")", 4],
  ["record(\"a\", f(x, y), `${g(1, 2)}, h`)", 3],
  ["record(\"a\", cond ? x : y, \"b\")", 3]
];
for (const [fixture, expected] of SCANNER_FIXTURES) {
  const counted = argumentCounts(fixture)[0]?.args;
  check(`S-${expected}-${fixture.length}`, `the argument scanner reads ${expected} arguments in ${fixture}`,
    counted === expected, `counted ${counted}`);
}

const declaration = /function record\s*\(/;
const callSites = argumentCounts(source).filter((site) => !declaration.test(source.split("\n")[site.line - 1] ?? ""));
const wrongArity = callSites.filter((site) => site.args !== 3);
check("C-arity", `all ${callSites.length} record() call sites pass exactly three arguments`,
  callSites.length > 0 && wrongArity.length === 0,
  wrongArity.map((site) => `line ${site.line}: ${site.args} arguments`).join("; ") || "no call sites were found at all");

// ---------------------------------------------------------------------------
// 3. The verdict function's own guards are present in the shipped bytes.
// ---------------------------------------------------------------------------
const GUARDS = [
  ["G-arity", "record() refuses the wrong argument count", /arguments\.length !== 3/],
  ["G-boolean", "record() refuses a non-boolean verdict", /typeof passed !== "boolean"/],
  ["G-observed", "record() refuses an empty observation", /typeof observed !== "string"/],
  ["G-duplicate", "record() refuses a second verdict for the same case", /verdicts\.has\(caseId\)/]
];
for (const [id, title, pattern] of GUARDS) {
  check(id, title, pattern.test(source), `${pattern} is absent`);
}

// ---------------------------------------------------------------------------
// 4. The worker case requires delivery, not an exit code.
// ---------------------------------------------------------------------------
const NINE = [
  "terminal_successful_state", "not_in_flight", "artifact_path_present",
  "nonzero_stored_byte_count", "storage_object_exists", "exact_bytes_re_read",
  "pdf_parses", "page_proof", "immutable_hash_agrees"
];
const missingConditions = NINE.filter((name) => !new RegExp(`${name}\\s*:`).test(source));
check("W-conditions", "the worker case names all nine delivery conditions",
  missingConditions.length === 0, `missing: ${missingConditions.join(", ")}`);

// Anchored on the CALL, not on the case name: the name also appears in
// REQUIRED_CASES, where the next line is a different case id entirely.
const workerVerdict = source.match(/record\(\s*\n\s*"worker_renders_and_stores_the_artifact",\s*\n\s*([^\n]+),\s*\n/);
check("W-verdict", "the worker verdict is the conjunction of those conditions, not an exit code",
  Boolean(workerVerdict) && workerVerdict[1].trim() === "unmet.length === 0",
  `the verdict expression is ${workerVerdict?.[1]?.trim() ?? "(not found)"}`);

check("W-non-terminal", "queued, claimed, rendering and validating are all failures",
  /NON_TERMINAL = new Set\(\["queued", "claimed", "rendering", "validating"\]\)/.test(source)
  && /not_in_flight:\s*Boolean\(job\) && !NON_TERMINAL\.has\(job\.status\)/.test(source),
  "the non-terminal state set or its use is not in the shipped bytes");

check("W-exit-code", "no verdict in the file is decided by a process exit code",
  !/record\([^)]*run\.status === 0/s.test(source),
  "a record() verdict still reads a process exit code");

check("W-logs", "both worker streams are captured in full and written to the evidence directory",
  /stdout: redact\(run\.stdout\)/.test(source)
  && /stderr: redact\(run\.stderr\)/.test(source)
  && /worker-console\.log/.test(source)
  && /worker-diagnostics\.json/.test(source)
  && !/\$\{output\.slice\(-\d+\)\}/.test(source),
  "the streams are still concatenated, truncated, or not written out");

// ---------------------------------------------------------------------------
// 5. The four cases that were conflated are independent again.
//
//    Binding is written in the enqueue INSERT; the consumption row and the
//    ledger event are written inside finalize_packet_render_job. A binding case
//    that reads the consumption row is asserting finalization, which is how one
//    unfinalized job produced four failures and hid its own cause.
// ---------------------------------------------------------------------------
function caseBody(marker, next) {
  const from = source.indexOf(marker);
  const to = next ? source.indexOf(next, from) : source.length;
  return from < 0 ? "" : source.slice(from, to < 0 ? source.length : to);
}
const bindingBody = caseBody("// --- 8b.", "// --- 8c.");
check("I-binding", "the binding case does not depend on the post-validation accounting row",
  bindingBody.length > 0
  && !/consumer_packet_payment_consumption/.test(bindingBody)
  && /consumer_matter_id_for_briefcase_item/.test(bindingBody),
  "the binding case still joins the consumption row that finalization writes");

const replayBody = caseBody("// --- 10.", null);
check("I-replay", "the replay case does not require the artifact to exist",
  replayBody.length > 0
  && !/entitlements\)\s*===\s*"1"/.test(replayBody)
  && /provider_event_records/.test(replayBody)
  && /moved\.length === 0/.test(replayBody),
  "the replay case still demands a finalization-written entitlement count");

// The verdict EXPRESSION, not merely the presence of the word: a body that
// computes whether the owner was served and then does not consult it is exactly
// the shape that let two 4xx refusals stand in for a delivery.
const deliveryBody = caseBody("// --- 9.", "// --- 10.");
const deliveryVerdict = deliveryBody.match(/record\(\s*\n\s*"delivery_serves_the_owner_and_refuses_everyone_else",\s*\n\s*([^\n]+),\s*\n/);
check("I-delivery", "the delivery verdict requires the owner to receive the validated artifact",
  Boolean(deliveryVerdict)
  && /\bownerServed\b/.test(deliveryVerdict[1])
  && /ownerHash === \(evidence\.worker\?\.validation \? finalJob\?\.output_sha256 : null\)/.test(deliveryBody),
  `the verdict expression is ${deliveryVerdict?.[1]?.trim() ?? "(not found)"}`);

// The RCAP artifact route, not the legacy DTC one. /api/expungement-ai/packet/
// download serves artifactRefs.text and requires packetStatus === "ready", so
// it answers 409 for a render-job artifact no matter how healthy the worker is:
// a delivery case pointed there can only ever report a defect that is not one.
check("I-delivery-route", "the delivery case calls the route that actually serves the artifact",
  /const download = `\/api\/rcap\/packets\/\$\{jobId\}\/download`;/.test(deliveryBody),
  "the delivery case is not calling /api/rcap/packets/<jobId>/download");

console.log("");
if (failed > 0) {
  console.error(`verify-rcap-hosted-acceptance-verdicts FAILED: ${failed} check(s) did not hold.`);
  process.exit(1);
}
console.log("verify-rcap-hosted-acceptance-verdicts passed: the matrix cannot report a verdict it has not earned.");
