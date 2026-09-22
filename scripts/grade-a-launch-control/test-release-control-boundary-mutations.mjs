#!/usr/bin/env node
/*
 * The release-control boundary, mutated.
 *
 * Three defects made this necessary, and each one is a way a control can exist
 * and still prove nothing:
 *
 *   1. The exact release/tools binding had a verifier and no caller. No
 *      workflow invoked it, and executing the module did nothing and exited 0.
 *   2. The verifier never read the image acceptance, so a candidate whose
 *      worker had been published and never accepted verified CURRENT.
 *   3. The Production gate read acceptance fields the evidence schema does not
 *      carry, so its clause tripped on `undefined` rather than checking
 *      anything.
 *
 * So the mutations below come in two kinds. The static ones cut the gate out of
 * the hosted workflow and out of the Production gate and require the cut to be
 * detected. The fixture ones build a small real Git repository and move one
 * identity at a time.
 *
 * Nothing here touches the working tree: workflow mutations are applied to
 * strings in memory, and every repository mutation happens inside a temporary
 * fixture that is deleted afterwards. A mutation that fails because an import
 * broke is not a detection, so each fixture case starts from a proven-green
 * baseline and is asserted to refuse for its own named reason.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  verifyReleaseCandidateBinding,
  imageAcceptanceRefusals,
  runReleaseCandidateBindingCli
} from "./verify-release-candidate-binding.mjs";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const HOSTED = path.join(REPO, ".github/workflows/rcap-hosted-acceptance-staging.yml");
const PRODUCTION = path.join(REPO, ".github/workflows/deploy-rcap-render-worker-production.yml");
const VERIFIER_CALL = "node scripts/grade-a-launch-control/verify-release-candidate-binding.mjs";

const results = [];
const deny = (label, run) => {
  let threw = false;
  try { run(); } catch { threw = true; }
  assert.ok(threw, `MISSED: ${label}`);
  results.push(label);
};

/* ---------------------------------------------------------------- static --
 * The hosted gate, read out of the real workflow rather than assumed.
 */
const PHASES_THAT_MUST_BE_COVERED = [
  "full", "deploy", "replace_preview", "accept", "payment", "browser",
  "checkout_gate", "worker_contract", "clinic_preview", "legal_aid_browser",
  "stripe_retarget"
];
// Phases that cannot create release evidence: Supabase-only migrations and the
// read-only diagnostics. Listing them explicitly means a NEW phase is covered
// by default rather than silently exempt.
const PHASES_LEGITIMATELY_EXEMPT = [
  "migrate", "clinic_migrate", "legal_aid_migrate",
  "preflight", "vercel_identity", "vercel_audit"
];

/** Find the gate step and return the raw `if:` expression guarding it. */
function hostedGateGuard(yaml) {
  const idx = yaml.indexOf(VERIFIER_CALL);
  if (idx === -1) throw new Error("the hosted workflow does not invoke the release binding verifier");
  const before = yaml.slice(0, idx);
  const stepStart = before.lastIndexOf("\n      - name:");
  if (stepStart === -1) throw new Error("the verifier call is not inside a workflow step");
  const step = yaml.slice(stepStart, idx);
  const guard = /\n\s+if:\s*(.+)/.exec(step);
  if (!guard) throw new Error("the release binding step carries no phase guard");
  return guard[1].trim();
}

/** Does the guard admit this phase? Evaluated, not pattern-matched. */
function guardAdmits(guard, phase) {
  const expression = guard.replace(/inputs\.phase/g, JSON.stringify(phase)).replace(/\s*&&\s*/g, " && ");
  // eslint-disable-next-line no-new-func
  return Boolean(new Function(`return (${expression});`)());
}

function assertHostedGateCoversEveryEvidencePhase(yaml) {
  const guard = hostedGateGuard(yaml);
  const missed = PHASES_THAT_MUST_BE_COVERED.filter((phase) => !guardAdmits(guard, phase));
  if (missed.length) throw new Error(`hosted release-binding gate does not cover: ${missed.join(", ")}`);
  return guard;
}

const hostedYaml = fs.readFileSync(HOSTED, "utf8");
const guard = assertHostedGateCoversEveryEvidencePhase(hostedYaml);
for (const phase of PHASES_LEGITIMATELY_EXEMPT) {
  assert.equal(guardAdmits(guard, phase), false, `${phase} should be exempt but the gate runs for it`);
}

// 1. The step removed entirely.
deny("hosted: release-binding step removed", () =>
  assertHostedGateCoversEveryEvidencePhase(hostedYaml.replace(VERIFIER_CALL, "echo skipped")));
// 2. `full` quietly carved out of the guard.
deny("hosted: `full` no longer covered", () =>
  assertHostedGateCoversEveryEvidencePhase(
    hostedYaml.replace(`if: inputs.phase != 'migrate'`, `if: inputs.phase != 'full' && inputs.phase != 'migrate'`)));

/* The Production gate's acceptance clause, read out of the real workflow. */
const productionYaml = fs.readFileSync(PRODUCTION, "utf8");
function assertProductionReadsTheRecordedSchema(yaml) {
  for (const required of [
    'acceptance.conclusion !== "success"',
    "acceptance.digest !== digest",
    "acceptance.tag !== sha",
    "publication.runtimeAccepted !== true"
  ]) if (!yaml.includes(required)) throw new Error(`production gate no longer checks: ${required}`);
  for (const stale of ["imageAcceptance?.workflowConclusion", "imageAcceptance?.immutableRegistryDigest"]) {
    if (yaml.includes(stale)) throw new Error(`production gate reads a field the evidence schema does not carry: ${stale}`);
  }
}
assertProductionReadsTheRecordedSchema(productionYaml);
deny("production: acceptance conclusion check removed", () =>
  assertProductionReadsTheRecordedSchema(productionYaml.replace('acceptance.conclusion !== "success"', "false")));
deny("production: acceptance digest check removed", () =>
  assertProductionReadsTheRecordedSchema(productionYaml.replace("acceptance.digest !== digest", "false")));
deny("production: acceptance tag check removed", () =>
  assertProductionReadsTheRecordedSchema(productionYaml.replace("acceptance.tag !== sha", "false")));
deny("production: reverted to the absent-field schema", () =>
  assertProductionReadsTheRecordedSchema(
    productionYaml.replace('acceptance.conclusion !== "success"', 'publication.imageAcceptance?.workflowConclusion !== "success"')));

/* --------------------------------------------------------------- fixture --
 * A small real repository, so the tuple logic is measurable without cloning
 * several gigabytes.
 */
const root = fs.mkdtempSync(path.join(os.tmpdir(), "release-control-boundary-"));
const git = (...args) => execFileSync("git", args, { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
const write = (rel, body) => {
  fs.mkdirSync(path.join(root, path.dirname(rel)), { recursive: true });
  fs.writeFileSync(path.join(root, rel), typeof body === "string" ? body : JSON.stringify(body, null, 2));
};
const TOOLING = "data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json";
const CANDIDATE = "data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json";
const PUBLICATION = "data/rcap-render/worker-publication-evidence.json";

try {
  git("init", "-b", "main");
  git("config", "user.email", "fixture@example.invalid");
  git("config", "user.name", "Release control fixture");

  write("package.json", { name: "fixture", private: true });
  write("package-lock.json", { lockfileVersion: 3 });
  write("tsconfig.json", { compilerOptions: {} });
  write("scripts/rcap-render-worker.mjs", "// fixture worker\n");
  write("scripts/lib/placeholder.mjs", "export const placeholder = true;\n");
  write("src/placeholder.ts", "export const placeholder = true;\n");
  write("deploy/rcap-render-worker/Dockerfile", "FROM node:22-slim\nCOPY package.json ./\n");
  write("deploy/rcap-render-worker/Dockerfile.dockerignore", "node_modules\n");
  write("data/record-clearing/supplemental-guides/placeholder.json", { placeholder: true });
  write("data/record-clearing/brand/legalease-logo.png", "fixture-logo-bytes");
  git("add", "-f", "package.json", "package-lock.json", "tsconfig.json", "scripts", "src", "deploy", "data");
  git("commit", "-q", "-m", "worker source");
  const workerSourceSha = git("rev-parse", "HEAD");

  const workerDigest = "sha256:" + "ab".repeat(32);
  const acceptanceRunId = 424242;
  // The application freeze IS the worker source here, as in the real successor.
  write("docs/note.md", "application freeze\n");
  git("add", "-f", "docs/note.md");
  git("commit", "-q", "-m", "application freeze");
  const applicationSha = git("rev-parse", "HEAD");

  const goodPublication = {
    sourceSha: workerSourceSha,
    immutableRegistryDigest: workerDigest,
    workflowConclusion: "success",
    runtimeAccepted: true,
    imageAcceptance: {
      runId: acceptanceRunId,
      conclusion: "success",
      digest: workerDigest,
      tag: workerSourceSha,
      readOnly: true
    }
  };
  write(PUBLICATION, goodPublication);
  git("add", "-f", PUBLICATION);
  git("commit", "-q", "-m", "publication evidence");

  write("scripts/rcap-vercel-identity-recheck.mjs", "// tooling change\n");
  git("add", "-f", "scripts/rcap-vercel-identity-recheck.mjs");
  git("commit", "-q", "-m", "bounded tooling change");
  const toolsSha = git("rev-parse", "HEAD");

  const { createWorkerInputPlan } = await import("../rcap-hosted-acceptance-worker-input-plan.mjs");
  const workerInputFingerprint = createWorkerInputPlan({
    rootDir: root, candidateSha: toolsSha, acceptedSourceSha: workerSourceSha, acceptedDigest: workerDigest
  }).aggregateInputSha256;

  const candidate = {
    applicationSha, workerSourceSha, workerDigest, workerInputFingerprint,
    readOnlyImageAcceptance: { runId: acceptanceRunId, conclusion: "success" }
  };
  const orchestrationFiles = git("diff", "--name-only", applicationSha, toolsSha)
    .split("\n").filter((p) => p.startsWith("scripts/") || p.startsWith(".github/"));
  const binding = { ...candidate, toolsSha, orchestrationFiles };

  const commitJson = (rel, body, message) => { write(rel, body); git("add", "-f", rel); git("commit", "-q", "-m", message); };
  commitJson(TOOLING, binding, "tooling binding");
  const bound = git("rev-parse", "HEAD");
  const reset = () => { git("reset", "-q", "--hard", bound); git("clean", "-qfd"); };

  // BASELINE. Everything below is measured against this being green.
  const green = verifyReleaseCandidateBinding(root, candidate);
  assert.equal(green.current, true, `fixture baseline is not CURRENT: ${green.reasons.join("; ")}`);
  assert.equal(green.status, "CURRENT");

  const refuses = (label, mutatedCandidate = candidate, mutate = null) => {
    reset();
    if (mutate) mutate();
    const result = verifyReleaseCandidateBinding(root, mutatedCandidate);
    assert.equal(result.current, false, `MISSED: ${label}`);
    assert.ok(result.reasons.length > 0, `${label}: refused with no stated reason`);
    results.push(label);
    reset();
  };

  // 3-6. Wrong identities in the candidate.
  refuses("candidate: wrong application SHA", { ...candidate, applicationSha: workerSourceSha.replace(/.$/, "0") });
  refuses("candidate: wrong worker source", { ...candidate, workerSourceSha: "0".repeat(40) });
  refuses("candidate: wrong worker digest", { ...candidate, workerDigest: "sha256:" + "cd".repeat(32) });
  refuses("candidate: wrong worker fingerprint", { ...candidate, workerInputFingerprint: "sha256:" + "0".repeat(64) });

  // 7-11. Publication succeeded, acceptance did not follow.
  const withPublication = (patch) => () => commitJson(PUBLICATION, { ...goodPublication, ...patch }, "mutated publication");
  refuses("acceptance: runtimeAccepted false", candidate, withPublication({ runtimeAccepted: false }));
  refuses("acceptance: no image acceptance recorded", candidate, withPublication({ imageAcceptance: null }));
  refuses("acceptance: image acceptance failed", candidate,
    withPublication({ imageAcceptance: { ...goodPublication.imageAcceptance, conclusion: "failure" } }));
  refuses("acceptance: digest mismatch", candidate,
    withPublication({ imageAcceptance: { ...goodPublication.imageAcceptance, digest: "sha256:" + "ef".repeat(32) } }));
  refuses("acceptance: source/tag mismatch", candidate,
    withPublication({ imageAcceptance: { ...goodPublication.imageAcceptance, tag: "0".repeat(40) } }));

  // 12-14. The tools binding.
  refuses("tools: wrong tools SHA", candidate, () => commitJson(TOOLING, { ...binding, toolsSha: applicationSha }, "wrong tools sha"));
  refuses("tools: unknown orchestration file", candidate, () => {
    write("scripts/rcap-not-in-the-bounded-set.mjs", "// unknown tooling\n");
    git("add", "-f", "scripts/rcap-not-in-the-bounded-set.mjs");
    git("commit", "-q", "-m", "unknown tooling");
    const sha = git("rev-parse", "HEAD");
    commitJson(TOOLING, { ...binding, toolsSha: sha, orchestrationFiles: [...orchestrationFiles, "scripts/rcap-not-in-the-bounded-set.mjs"] }, "bind unknown tooling");
  });
  refuses("tools: bound orchestration file modified after the tools SHA", candidate, () => {
    write("scripts/rcap-vercel-identity-recheck.mjs", "// tooling change, moved after the binding\n");
    git("add", "-f", "scripts/rcap-vercel-identity-recheck.mjs");
    git("commit", "-q", "-m", "post-binding orchestration drift");
  });

  // 15. A canonical worker input moved after the successor freeze.
  refuses("worker: canonical input moved after the freeze", candidate, () => {
    write("scripts/lib/placeholder.mjs", "export const placeholder = 'moved';\n");
    git("add", "-f", "scripts/lib/placeholder.mjs");
    git("commit", "-q", "-m", "canonical worker input moved");
  });

  // The CLI is the thing workflows call, so prove IT refuses too, and that it
  // exits 0 only on CURRENT.
  reset();
  const silent = { log() {}, error() {} };
  commitJson(CANDIDATE, candidate, "candidate record");
  assert.equal(runReleaseCandidateBindingCli(root, silent), 0, "CLI did not accept the green baseline");
  commitJson(CANDIDATE, { ...candidate, workerDigest: "sha256:" + "cd".repeat(32) }, "wrong candidate digest");
  assert.equal(runReleaseCandidateBindingCli(root, silent), 1, "CLI accepted a wrong digest");
  results.push("cli: exits nonzero unless CURRENT");
  reset();

  // The acceptance conditions are separately callable, so they are proven
  // directly rather than only through the fixture repository.
  assert.deepEqual(imageAcceptanceRefusals(goodPublication, candidate), []);
  for (const [label, publication] of [
    ["direct: runtimeAccepted missing", { ...goodPublication, runtimeAccepted: undefined }],
    ["direct: acceptance absent", { ...goodPublication, imageAcceptance: undefined }],
    ["direct: acceptance is not an object", { ...goodPublication, imageAcceptance: [] }],
    ["direct: acceptance run id missing", { ...goodPublication, imageAcceptance: { ...goodPublication.imageAcceptance, runId: null } }],
    ["direct: acceptance not read-only", { ...goodPublication, imageAcceptance: { ...goodPublication.imageAcceptance, readOnly: false } }]
  ]) {
    assert.ok(imageAcceptanceRefusals(publication, candidate).length > 0, `MISSED: ${label}`);
    results.push(label);
  }
  assert.ok(
    imageAcceptanceRefusals(goodPublication, { ...candidate, readOnlyImageAcceptance: { runId: 999 } }).length > 0,
    "MISSED: direct: candidate cites a different acceptance run"
  );
  results.push("direct: candidate cites a different acceptance run");
} finally {
  fs.rmSync(root, { recursive: true, force: true });
}

for (const label of results) console.log(`RED  ${label}`);
console.log(`\nRelease-control boundary mutations: ${results.length}/${results.length} refused.`);
