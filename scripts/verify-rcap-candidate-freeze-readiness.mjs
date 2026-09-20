#!/usr/bin/env node
// The candidate-freeze checklist, evaluated but deliberately not satisfiable yet.
//
// WHY THIS EXISTS
//
// A candidate freeze pins one exact SHA as the thing everything downstream is
// built, published, deployed and rolled back against. Freezing early is worse
// than not freezing: it names a commit that will need superseding, and every
// artifact keyed to it then describes a candidate nobody is shipping.
//
// So this states the gates in one place and evaluates each of them now. It is
// expected to report NOT READY, and the value is in which gates are open: three
// are mechanical and closeable by the captain, and the rest wait on decisions
// that are not the captain's to make. A checklist that only goes green is a
// checklist nobody reads until the day it matters.
//
// This freezes nothing. It writes no candidate SHA anywhere.
//
//   node scripts/verify-rcap-candidate-freeze-readiness.mjs
//   node scripts/verify-rcap-candidate-freeze-readiness.mjs --write

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
const WRITE = process.argv.includes("--write");
const OUT = "docs/rcap/grade-a/captain/decision-waiting/candidate-freeze-checklist.json";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const run = (cmd, args) => {
  try { execFileSync(cmd, args, { cwd: rootDir, stdio: "pipe" }); return true; } catch { return false; }
};
const git = (...a) => { try { return execFileSync("git", a, { cwd: rootDir, encoding: "utf8" }).trim(); } catch { return null; } };

console.log("candidate-freeze checklist — evaluated, nothing frozen\n");

const projection = read("data/rcap-grade-a/fulfillment-authority-projection.json");
const matrix = read("docs/rcap/grade-a/lane-j/blocker-4-decision-matrix.json");
const held = matrix.records.filter((r) => r.classification === "INSUFFICIENT_AUTHORITY");
const readiness = fs.existsSync(path.join(rootDir, "docs/rcap/grade-a/captain/decision-waiting/nonproduction-readiness-audit.json"))
  ? read("docs/rcap/grade-a/captain/decision-waiting/nonproduction-readiness-audit.json")
  : null;

// Which legal questions are still open, read from the decision record rather
// than listed here. A checklist that keeps a gate open because a literal in it
// says so will still be reporting "waiting on counsel" long after counsel
// answered, which is the exact failure this file exists to prevent elsewhere.
const DECISIONS = "data/record-clearing/legal-decisions/2026-08-29-lawrence-six-decisions.json";
const decisions = fs.existsSync(path.join(rootDir, DECISIONS)) ? read(DECISIONS) : null;
const answeredQuestionIds = new Set((decisions?.decisions ?? []).map((d) => d.questionId).filter(Boolean));
const answerFor = (questionId) => (decisions?.decisions ?? []).find((d) => d.questionId === questionId) ?? null;

// The Oregon configurations, if they have been implemented.
const OR_CONFIGS = "data/record-clearing/packet-specifications/OR-disposition-configurations.v1.json";
const orConfigs = fs.existsSync(path.join(rootDir, OR_CONFIGS)) ? read(OR_CONFIGS) : null;
// An artifact exists for a configuration only when its specification names one.
const orArtifactsMissing = (orConfigs?.configurations ?? []).filter((c) => !c.artifact?.sha256).map((c) => c.label);

// Terminalization is counted from the verifier's own output rather than
// restated, so this cannot report a number the verifier disagrees with.
const terminalizationFailures = (() => {
  try {
    execFileSync("node", ["scripts/verify-rcap-terminalize-c1.mjs"], { cwd: rootDir, stdio: "pipe" });
    return 0;
  } catch (error) {
    const out = String(error.stdout ?? "") + String(error.stderr ?? "");
    return out.split("\n").filter((l) => l.trimStart().startsWith("- ") && !l.includes("working-tree change")).length;
  }
})();

const gates = [
  {
    gate: "legal:blocker-4-answers",
    owner: "Lawrence (counsel)",
    // Held only while a question is unanswered. The records stay classified
    // INSUFFICIENT_AUTHORITY in the matrix -- that is the record of what they
    // were -- so the gate reads the answers, not the classification.
    open: held.some((r) => !answeredQuestionIds.has(
      { "il-immediate-seal": "Q-J-01", "ky_void_seal_controlled_substance": "Q-J-02",
        "ky_void_seal_marijuana_synthetic_salvia": "Q-J-03", "wv_dui_deferral_expungement": "Q-J-04" }[r.trackId],
    )),
    state: held.every((r) => answeredQuestionIds.size >= 4)
      ? `all 4 questions answered 2026-08-29; ${held.length} record(s) dispositioned`
      : `${held.length} record(s) held behind unanswered questions`,
    why: "A frozen candidate carrying eight records whose provenance nobody has dispositioned is a candidate that cannot be described honestly. The eight are Illinois 1, Kentucky 2, West Virginia 5.",
    closeable: "by an answer, not by the captain"
  },
  {
    gate: "legal:oregon-subsection",
    owner: "Lawrence (counsel)",
    open: !answeredQuestionIds.has("OR-Q1-SUBSECTION"),
    state: answerFor("OR-Q1-SUBSECTION")
      ? `answered 2026-08-29: ${answerFor("OR-Q1-SUBSECTION").answer}`
      : "ORS 137.225(1)(c) vs (1)(d) unanswered",
    why: "The subsection decides which routes may exist at all. Freezing before it pins a candidate whose route identity is in question.",
    closeable: "by an answer, not by the captain"
  },
  {
    gate: "legal:oregon-packet-scope",
    owner: "Lawrence (counsel)",
    open: !answeredQuestionIds.has("OR-Q2-PACKET-SCOPE"),
    state: answerFor("OR-Q2-PACKET-SCOPE")
      ? `answered 2026-08-29: ${answerFor("OR-Q2-PACKET-SCOPE").answer}`
      : "acquittal-only vs three routes unanswered",
    why: "The scope decides how many routes and configurations exist. Freezing before it pins a candidate whose route set is in question.",
    closeable: "by an answer, not by the captain"
  },
  {
    gate: "oregon:artifacts",
    owner: "captain",
    open: orConfigs === null || orArtifactsMissing.length > 0,
    state: orConfigs === null
      ? "the three configurations are not implemented"
      : orArtifactsMissing.length === 0
        ? "all three configurations name a rendered artifact"
        : `no rendered artifact for: ${orArtifactsMissing.join(", ")}`,
    why: "The legal-design answers settled which routes exist. They did not produce the PDFs those routes deliver, and a candidate is frozen around artifacts, not around intentions.",
    closeable: "by rendering and verifying the Option 2 and Option 3 artifacts"
  },
  {
    gate: "oregon:output-approval",
    owner: "Lawrence (counsel)",
    open: true,
    state: "not requested; the prior package is superseded and the route-specific packages need final artifacts first",
    why: "Output-level approval is of an exact artifact for an exact route. The legal-design answers are not that approval and were expressly recorded as not being it.",
    closeable: "by an approval, after the artifacts exist"
  },
  {
    gate: "chain:terminalization",
    owner: "follows the Blocker-4 answers",
    open: terminalizationFailures !== 0,
    state: `verify-rcap-terminalize-c1 reports ${terminalizationFailures} drift failure(s)`,
    why: "Red by design while the eight are held. It is listed as a gate so nobody reads a red chain as an accident, and so the count is checked rather than assumed: 8 is correct, 18 means the ten mechanical repins were lost, 0 means eight records were re-pinned without an answer.",
    closeable: "by the Blocker-4 answers, then the prepared bundles"
  },
  {
    gate: "publication:branch-literal",
    owner: "captain",
    open: readiness ? readiness.releaseIntegrationBranch?.candidateContainedInMain !== true
      && readiness.releaseIntegrationBranch?.candidateContainedInLiteral !== true : true,
    state: readiness?.releaseIntegrationBranch?.consequence ?? "not audited",
    why: "The publish workflow refuses any SHA not contained in main or in the branch it pins by literal name. A candidate the workflow would refuse is not a candidate.",
    closeable: "by a captain-owned workflow edit, made before dispatch"
  },
  {
    gate: "commercial:eligibility-zero",
    owner: "captain",
    open: projection.counters.commerciallyEligible !== 0 || projection.counters.completePacketProven !== 0,
    state: `commerciallyEligible ${projection.counters.commerciallyEligible}, COMPLETE_PACKET_PROVEN ${projection.counters.completePacketProven}`,
    why: "A freeze is a statement about what the candidate contains. It must contain no open route.",
    closeable: "already closed; this gate exists to stay closed"
  },
  {
    gate: "chain:worktree-clean",
    owner: "captain",
    open: (git("status", "--porcelain") ?? "x") !== "",
    state: (git("status", "--porcelain") ?? "") === "" ? "clean" : "dirty",
    why: "A candidate SHA names a commit. Uncommitted work is not in it.",
    closeable: "by committing"
  }
];

for (const g of gates) {
  console.log(`  ${g.open ? "OPEN  " : "closed"}  ${g.gate}  [${g.owner}] — ${g.state}`);
}

const open = gates.filter((g) => g.open);
const doc = {
  schemaVersion: "rcap-candidate-freeze-checklist/v1",
  generatedBy: "scripts/verify-rcap-candidate-freeze-readiness.mjs",
  status: open.length === 0 ? "READY_TO_FREEZE" : "NOT_READY",
  frozen: false,
  candidateSha: null,
  candidateShaNote:
    "Deliberately null. Naming a candidate before the gates close would pin a commit that will need superseding, and every artifact keyed to it would then describe a candidate nobody is shipping.",
  evaluatedAt: { captainHead: git("rev-parse", "HEAD") },
  gates,
  openGates: open.length,
  openGatesOwnedByCounsel: open.filter((g) => g.owner.includes("counsel")).length,
  openGatesOwnedByCaptain: open.filter((g) => g.owner === "captain").length,
  freezeProcedureWhenTheGatesClose: [
    "Record every legal answer in its controlling registry first. The decision is the authority; the freeze records a state that already holds.",
    "Apply only the prepared bundles whose question and answer match what was recorded, then re-run verify-rcap-terminalize-c1 and confirm the failure count fell by exactly the records those bundles name.",
    "Correct RELEASE_INTEGRATION_BRANCH in the publish workflow, or land the candidate on a branch the workflow already accepts. Not both, and not at dispatch time.",
    "Run the full chain on the exact candidate commit with no worker mutation harness running.",
    "Only then write the candidate SHA here, and only as a full 40 characters: the workflow refuses an abbreviated SHA before it fetches anything, because two commits could share an alias.",
    "Publication is a separate authorization after the freeze, not part of it."
  ],
  whatAFreezeDoesNotAuthorize: [
    "Publication of the worker image.",
    "Any Preview deployment.",
    "Any Production action.",
    "Any change of commercial status."
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
console.log(`candidate freeze: ${open.length} of ${gates.length} gate(s) open. NOT frozen; no candidate SHA is named.`);
console.log(`  ${doc.openGatesOwnedByCounsel} wait on counsel; ${doc.openGatesOwnedByCaptain} are the captain's.`);
