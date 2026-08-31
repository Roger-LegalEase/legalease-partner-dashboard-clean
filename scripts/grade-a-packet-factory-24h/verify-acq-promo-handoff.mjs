#!/usr/bin/env node
/**
 * Does the ACQ -> PROMO handoff actually refuse what it claims to refuse?
 *
 *   node scripts/grade-a-packet-factory-24h/verify-acq-promo-handoff.mjs [--mutations]
 *
 * The materializer compares a receipt's run id and artifact name against the
 * ones it is handed and refuses on a mismatch. It always did. The defect was
 * that NOTHING UPSTREAM WROTE EITHER FIELD, so the comparison could only ever
 * fail, on a difference no one could inspect — a gate that refuses everything
 * is indistinguishable from a gate that refuses nothing, because neither tells
 * you anything about the thing being gated.
 *
 * So this exercises the whole chain against a real temporary artifact: the
 * planner derives the name, the acquisition receipt carries the name and the
 * run id, and the materializer accepts. Then each link is broken in turn and
 * the refusal is required.
 *
 * A positive control runs first. A negative test whose subject cannot exist
 * proves nothing, and this file exists because that is exactly what happened.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(ROOT);
const MUTATIONS = process.argv.includes("--mutations");
const MATERIALIZER = "scripts/rcap-materialize-acquisition-handoff.mjs";
const PLANNER = "scripts/rcap-plan-source-acquisition-batch.mjs";
const ACQUIRE = "scripts/rcap-acquire-official-source.mjs";
const WORKFLOW = ".github/workflows/rcap-official-source-acquisition-batch.yml";

const results = [];
const check = (id, title, ok, observed = "") => { results.push({ id, title, ok, observed }); };

const stage = fs.mkdtempSync(path.join(os.tmpdir(), "rcap-handoff-"));
const body = Buffer.from("%PDF-1.4\nnot a real form, only bytes to hash\n");
const bodyPath = path.join(stage, "source-body.pdf");
fs.writeFileSync(bodyPath, body);
const sha = crypto.createHash("sha256").update(body).digest("hex");
const RUN_ID = "33418043514";
const ARTIFACT = "rcap-source-VT-200-00130";

const writeReceipt = (over = {}) => {
  const receipt = { acquisitionRunId: RUN_ID, artifactName: ARTIFACT, sha256: sha, jurisdiction: "VT", formNumber: "200-00130", bodyCommitted: false, ...over };
  for (const [k, v] of Object.entries(over)) if (v === undefined) delete receipt[k];
  const p = path.join(stage, `receipt-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(p, JSON.stringify(receipt, null, 2));
  return p;
};

const materialize = (receiptPath, { runId = RUN_ID, artifactName = ARTIFACT, expected = sha } = {}) => {
  const out = spawnSync(process.execPath, [MATERIALIZER,
    "--run-id", runId, "--artifact-name", artifactName,
    "--input", bodyPath, "--expected-sha256", expected, "--receipt", receiptPath],
    { cwd: ROOT, encoding: "utf8" });
  return { code: out.status, stdout: out.stdout ?? "", stderr: out.stderr ?? "" };
};

/* ---- the chain, end to end -------------------------------------------- */
const plannerText = fs.readFileSync(path.join(ROOT, PLANNER), "utf8");
const acquireText = fs.readFileSync(path.join(ROOT, ACQUIRE), "utf8");
const workflowText = fs.readFileSync(path.join(ROOT, WORKFLOW), "utf8");

const chain = [];
if (!/artifactNameFor/.test(plannerText)) chain.push("the planner derives no artifact name");
if (!/artifactName: artifactNameFor\(e\)/.test(plannerText)) chain.push("the planner does not put the derived name in the matrix");
if (!/both derive artifact name/.test(plannerText)) chain.push("the planner does not prove derived names are unique");
if (!/RCAP_ACQUISITION_RUN_ID/.test(acquireText)) chain.push("the acquisition script does not read a run id");
if (!/acquisitionRunId: acquisitionRunId \|\| null/.test(acquireText)) chain.push("the acquisition script does not record the run id in the receipt");
if (!/artifactName: artifactName \|\| null/.test(acquireText)) chain.push("the acquisition script does not record the artifact name in the receipt");
if (!/GITHUB_ACTIONS === "true"/.test(acquireText)) chain.push("the acquisition script does not require provenance inside a workflow");
if (!/RCAP_ACQUISITION_RUN_ID: \$\{\{ github\.run_id \}\}/.test(workflowText)) chain.push("the workflow does not pass the exact run id");
if (!/RCAP_ARTIFACT_NAME: \$\{\{ matrix\.entry\.artifactName \}\}/.test(workflowText)) chain.push("the workflow does not pass the planner's artifact name");
if (!/name: \$\{\{ matrix\.entry\.artifactName \}\}/.test(workflowText)) chain.push("upload-artifact does not use the planner's artifact name");
check("H1", "the planner, the workflow, the acquisition script and the upload all name one string",
  chain.length === 0, `${chain.length} broken link(s): ${chain.slice(0, 2).join(" | ")}`);

/* Positive control FIRST: a complete receipt must be accepted, or every
 * refusal below is meaningless. */
const control = materialize(writeReceipt());
check("H2", "a complete, matching receipt is accepted (the control)",
  control.code === 0 && /ACQ_TO_PROMO_HANDOFF_READY/.test(control.stdout),
  control.code === 0 ? "accepted" : `REFUSED: ${control.stderr.trim().split("\n")[0]}`);

check("H3", "no source body is committed by the handoff",
  !/git (add|commit)/.test(fs.readFileSync(path.join(ROOT, MATERIALIZER), "utf8"))
  && /private\/source-acquisition-handoff/.test(fs.readFileSync(path.join(ROOT, MATERIALIZER), "utf8")),
  "the handoff writes under gitignored private storage and runs no git command");

for (const r of results) console.log(`  ${r.ok ? "ok  " : "FAIL"} ${r.id.padEnd(3)} ${r.title}${r.ok ? "" : `\n         observed: ${r.observed}`}`);
console.log(`\n${results.filter((r) => r.ok).length}/${results.length} handoff checks passed.`);

if (MUTATIONS) {
  console.log("\nmutations:");
  const cases = [
    { name: "a receipt with no acquisitionRunId is refused", receipt: { acquisitionRunId: undefined }, expect: /run id does not match/ },
    { name: "a receipt with no artifactName is refused", receipt: { artifactName: undefined }, expect: /artifact name does not match/ },
    { name: "a receipt from a different run is refused", receipt: { acquisitionRunId: "99999999999" }, expect: /run id does not match/ },
    { name: "a receipt naming a different artifact is refused", receipt: { artifactName: "rcap-source-VT-something-else" }, expect: /artifact name does not match/ },
    { name: "a receipt whose hash does not match the bytes is refused", receipt: { sha256: "0".repeat(64) }, expect: /receipt hash does not match/ },
    { name: "a non-numeric run id on the command line is refused", args: { runId: "not-a-run" }, expect: /exact numeric GitHub Actions run id/ },
    { name: "an empty artifact name on the command line is refused", args: { artifactName: "" }, expect: /exact artifact name is required/ },
    { name: "an expected hash that disagrees with the bytes is refused", args: { expected: "1".repeat(64) }, expect: /expected hash does not match/ }
  ];
  let allCaught = true;
  for (const c of cases) {
    const p = writeReceipt(c.receipt ?? {});
    const out = materialize(p, c.args ?? {});
    const refused = out.code !== 0 && c.expect.test(out.stderr);
    if (!refused) allCaught = false;
    console.log(`  ${refused ? "detected" : "MISSED  "} [${c.name}]${refused ? "" : ` — exit ${out.code}, said: ${out.stderr.trim().split("\n")[0] || out.stdout.trim()}`}`);
  }
  fs.rmSync(stage, { recursive: true, force: true });
  fs.rmSync(path.join(ROOT, "private/source-acquisition-handoff"), { recursive: true, force: true });
  if (!allCaught) { console.error("\nFAIL handoff mutations"); process.exit(1); }
  console.log(`\nOK handoff mutations — ${cases.length} case(s), every mutation refused.`);
} else {
  fs.rmSync(stage, { recursive: true, force: true });
  fs.rmSync(path.join(ROOT, "private/source-acquisition-handoff"), { recursive: true, force: true });
}

if (results.some((r) => !r.ok)) process.exit(1);
