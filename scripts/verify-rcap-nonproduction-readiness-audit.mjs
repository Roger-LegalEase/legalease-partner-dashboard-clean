#!/usr/bin/env node
// What publication would need, audited without dispatching anything.
//
// WHY THIS EXISTS
//
// Worker republication is held behind a candidate freeze, and the freeze is held
// behind four legal answers. That is a good reason not to publish and a bad
// reason not to look. Every input publication depends on can be checked now, and
// the ones that are wrong are cheaper to find now than at dispatch with an
// authorization in hand and a decision waiting on it.
//
// This audits READINESS, not secrets. It records whether each credential is
// present in the environment it would be needed in, never its value, and it does
// not read, print, log or transmit one. Absence in this session is not a defect:
// these are workflow secrets and this session is not the workflow. What matters
// is that the audit says which of the two it is.
//
// It dispatches nothing, publishes nothing, deploys nothing and touches no
// Production configuration.
//
//   node scripts/verify-rcap-nonproduction-readiness-audit.mjs
//   node scripts/verify-rcap-nonproduction-readiness-audit.mjs --write

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const WRITE = process.argv.includes("--write");

const WORKFLOW = ".github/workflows/publish-rcap-render-worker.yml";
const EVIDENCE = "data/rcap-render/worker-publication-evidence.json";
const RUNBOOK = "docs/rcap/grade-a/lane-j/BLOCKER-1-WORKER-REPUBLICATION-RUNBOOK.md";
const OUT = "docs/rcap/grade-a/captain/decision-waiting/nonproduction-readiness-audit.json";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const text = (rel) => fs.readFileSync(path.join(rootDir, rel), "utf8");
const git = (...a) => { try { return execFileSync("git", a, { cwd: rootDir, encoding: "utf8" }).trim(); } catch { return null; } };

const findings = [];
const note = (id, status, what, detail) => {
  findings.push({ id, status, what, detail });
  const mark = status === "ready" ? "ok  " : status === "blocked" ? "BLOCK" : "note";
  console.log(`  ${mark}  ${id}  ${what}${detail ? ` — ${detail}` : ""}`);
};

console.log("nonproduction readiness audit — nothing dispatched\n");

// ---- credentials: presence only ---------------------------------------------
//
// The name is recorded, never the value. A secret that is present is reported as
// "present" and nothing more; there is no code path here that can print one.
const CREDENTIALS = [
  { env: "VERCEL_TOKEN", neededBy: "Preview deployment binding the worker digest", scope: "nonproduction preview only" },
  { env: "VERCEL_AUTOMATION_BYPASS_SECRET", neededBy: "hosted acceptance reaching a protected Preview", scope: "nonproduction preview only" },
  { env: "SUPABASE_ACCESS_TOKEN", neededBy: "the acceptance project's management API", scope: "acceptance project only, never Production" },
  { env: "SUPABASE_PROJECT_REF", neededBy: "naming the acceptance project", scope: "acceptance project only, never Production" },
  { env: "STRIPE_TEST_SECRET_KEY", neededBy: "synthetic consumer payment in acceptance", scope: "test mode only" },
  { env: "GHCR_TOKEN", neededBy: "resolving the published tag to a digest and proving the package is not anonymously pullable", scope: "read + write packages" }
];
const credentials = CREDENTIALS.map((c) => ({
  ...c,
  presentInThisSession: Boolean(process.env[c.env] && String(process.env[c.env]).length > 0),
  valueRecorded: false
}));
for (const c of credentials) {
  note(
    `cred:${c.env}`,
    "note",
    `${c.env} is ${c.presentInThisSession ? "present" : "absent"} in this session`,
    c.presentInThisSession
      ? "a workflow secret, supplied here; its value is not read or recorded"
      : "expected: this is a workflow secret and this session is not the workflow"
  );
}

// ---- the branch literal, which is the one live blocker ----------------------
const workflow = text(WORKFLOW);
const literal = /RELEASE_INTEGRATION_BRANCH:\s*(\S+)/.exec(workflow)?.[1] ?? null;
const head = git("rev-parse", "HEAD");
const containedInMain = literal && git("merge-base", "--is-ancestor", head, "origin/main") !== null
  ? (() => { try { execFileSync("git", ["merge-base", "--is-ancestor", head, "origin/main"], { cwd: rootDir, stdio: "ignore" }); return true; } catch { return false; } })()
  : false;
let containedInLiteral = false;
if (literal) {
  try { execFileSync("git", ["merge-base", "--is-ancestor", head, `origin/${literal}`], { cwd: rootDir, stdio: "ignore" }); containedInLiteral = true; } catch { containedInLiteral = false; }
}
const literalExists = literal ? Boolean(git("rev-parse", "--verify", `origin/${literal}`)) : false;

note("branch:literal-present", literal ? "ready" : "blocked",
  `the workflow pins RELEASE_INTEGRATION_BRANCH by literal name`, literal ?? "no literal found");
note("branch:literal-exists", literalExists ? "ready" : "blocked",
  `the pinned branch resolves on origin`, literal);
note("branch:candidate-containment", containedInMain || containedInLiteral ? "ready" : "blocked",
  "the workflow would accept the current captain head as a candidate SHA",
  containedInMain || containedInLiteral
    ? `contained in ${containedInMain ? "main" : literal}`
    : `NOT contained in main and NOT contained in ${literal}. The workflow refuses a SHA on any other branch, so publication of this candidate would be refused before anything is fetched. Fixing it is a captain-owned workflow edit made BEFORE dispatch, not worked around at dispatch time.`);

// ---- rollback digest ---------------------------------------------------------
const evidence = read(EVIDENCE);
const currentDigest = evidence.immutableRegistryDigest ?? null;
const priorDigests = JSON.stringify(evidence).match(/sha256:[0-9a-f]{64}/g) ?? [];
const distinct = [...new Set(priorDigests)];
note("rollback:current-digest", /^sha256:[0-9a-f]{64}$/.test(String(currentDigest)) ? "ready" : "blocked",
  "the committed publication evidence names an immutable digest", currentDigest);
note("rollback:prior-digest-retained", distinct.length > 1 ? "ready" : "blocked",
  "a prior digest is retained to roll back to",
  `${distinct.length} distinct digest(s) in the evidence; the prior digest must remain in GHCR, never deleted and never retagged`);

// ---- GHCR privacy ------------------------------------------------------------
// The privacy guard is in the acceptance workflow, not the publish one, and
// looking only at the publish workflow reported a blocker that does not exist.
// Both halves matter: an anonymous pull must be refused AND an authenticated one
// must succeed, or "private" would also be satisfied by a package nobody can
// reach at all.
const ACCEPTANCE_WORKFLOW = ".github/workflows/rcap-worker-image-acceptance.yml";
const acceptance = fs.existsSync(path.join(rootDir, ACCEPTANCE_WORKFLOW)) ? text(ACCEPTANCE_WORKFLOW) : "";
const anonymousRefused = /anonymous pull token; the worker package is not private/i.test(acceptance);
const bothHalvesAsserted = /anonymous refused, authenticated accepted/i.test(acceptance);
note("ghcr:privacy-guard", anonymousRefused ? "ready" : "blocked",
  "an anonymous pull of the worker package fails the run",
  anonymousRefused
    ? `asserted in ${ACCEPTANCE_WORKFLOW}${bothHalvesAsserted ? ", with the authenticated half asserted too" : ""}`
    : "no anonymous-pull check found in either workflow");
const failsWithoutDigest = /A local image ID is not acceptable evidence|no digest/i.test(workflow);
note("ghcr:digest-required", failsWithoutDigest ? "ready" : "note",
  "the workflow refuses to record a local image ID as evidence",
  failsWithoutDigest ? "fail-if-no-digest present" : "not detected in the workflow text");

// ---- what is deliberately not exercised -------------------------------------
note("dispatch:none", "ready", "nothing was dispatched, published, deployed or configured",
  "this audit reads committed files, the workflow text and the local git graph, and nothing else");

const blocked = findings.filter((f) => f.status === "blocked");
const doc = {
  schemaVersion: "rcap-nonproduction-readiness-audit/v1",
  generatedBy: "scripts/verify-rcap-nonproduction-readiness-audit.mjs",
  status: blocked.length === 0 ? "READY_PENDING_FREEZE" : "BLOCKED_ON_INPUTS",
  posture:
    "Readiness only. No dispatch, no publication, no deployment, no environment change, no Production action. Credential presence is recorded by name; no value is read, printed, logged or transmitted.",
  auditedAt: { captainHead: head },
  runbook: RUNBOOK,
  credentials,
  credentialPolicy:
    "Absence in this session is expected and is not a defect: these are workflow secrets and this session is not the workflow. What this audit establishes is which secrets the workflow needs and what each is scoped to, so a missing one is discovered here rather than mid-dispatch.",
  releaseIntegrationBranch: {
    literal,
    pinnedIn: WORKFLOW,
    existsOnOrigin: literalExists,
    candidateHead: head,
    candidateContainedInMain: containedInMain,
    candidateContainedInLiteral: containedInLiteral,
    consequence: containedInMain || containedInLiteral
      ? "The workflow would accept this candidate."
      : "The workflow would REFUSE this candidate before fetching anything. This must be corrected in the workflow before any dispatch."
  },
  rollback: {
    currentDigest,
    distinctDigestsInEvidence: distinct.length,
    rule: "The prior digest remains unchanged in GHCR. Do not delete it and do not retag it: a tag is an alias and only the sha256 digest is immutable."
  },
  findings,
  blockedCount: blocked.length,
  whatThisDoesNotEstablish: [
    "That any credential is valid, or that any service would accept it. Nothing was authenticated.",
    "That the Preview host is reachable or correctly configured. Nothing was deployed.",
    "That publication is authorized. It is not: the candidate is not frozen and four legal answers are outstanding."
  ]
};

const outPath = path.join(rootDir, OUT);
const serialized = `${JSON.stringify(doc, null, 2)}\n`;
if (WRITE) {
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, serialized);
  console.log(`\n  wrote ${OUT}`);
}

console.log("");
console.log(`nonproduction readiness: ${findings.length} input(s) audited, ${blocked.length} blocked. Nothing dispatched.`);
if (blocked.length) {
  console.log("Blocked inputs must be corrected before any publication dispatch:");
  for (const b of blocked) console.log(`  - ${b.id}: ${b.detail}`);
}
