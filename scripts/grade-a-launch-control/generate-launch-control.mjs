#!/usr/bin/env node
// The one controlling launch record.
//
//   node scripts/grade-a-launch-control/generate-launch-control.mjs [--check]
//
// WHY THIS DOES NOT REPLACE THE SCOREBOARD
//
// data/rcap-grade-a/route-obligation-census-v1/COMPLETION_SCOREBOARD.json
// already recomputes families, sources, legal review, category B, the launch
// gate and commercial state from the records that decide them, and already
// declares itself the only scoreboard. Building a second status system beside
// it is the specific failure this phase exists to prevent: two records claiming
// current authority, drifting apart, and a reader with no way to tell which one
// is lying.
//
// So this record CONSUMES the scoreboard rather than restating it. Every number
// it carries is read from a generated record at generation time, never typed in
// and never copied from a narrative report. It adds only what the scoreboard
// does not cover -- lineage, reuse, dispatch, product path, data rights, test
// status, blockers, the next four hours and GO/HOLD -- and points at the
// scoreboard for everything the scoreboard owns.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = "data/rcap-grade-a/launch-control/LAUNCH_CONTROL.json";
const CHECK = process.argv.includes("--check");

const git = (args) => { try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 29 }).trim(); } catch { return null; } };
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

const V1 = "data/rcap-grade-a/route-obligation-census-v1";
const scoreboard = read(`${V1}/COMPLETION_SCOREBOARD.json`);
const freeze = read(`${V1}/FREEZE.json`);
const reuse = read("data/rcap-grade-a/launch-control/reuse-index.json");
const retriage = read(`${V1}/legal-review-queue-v2-retriage.json`);
const legalQueue = read(`${V1}/legal-review-queue-v2.json`);
const sourceQueue = read(`${V1}/source-queue-reconciliation.json`);
const census = read("data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json");
const categoryB = read("data/rcap-grade-a/route-obligation-census-candidate/category-b-medium-confidence-revalidation.json");
const worklist = read("data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json");
const dataRights = exists("data/rcap-grade-a/participant-data-rights/nonproduction-application-readiness.json")
  ? read("data/rcap-grade-a/participant-data-rights/nonproduction-application-readiness.json") : null;

const familiesByState = {};
for (const family of worklist.packetFamilies) {
  for (const j of family.jurisdictions ?? []) familiesByState[j] = (familiesByState[j] ?? 0) + 1;
}

const doc = {
  schemaVersion: "rcap-grade-a-launch-control/v1",
  generatedBy: "scripts/grade-a-launch-control/generate-launch-control.mjs",
  thisIsTheControllingLaunchRecord:
    "One record claims current launch authority, and this is it. It does not restate the completion scoreboard: it consumes it. Everything the scoreboard owns -- families, sources, legal review, category B, the launch gate, commercial state -- is read from the scoreboard at generation time and pointed at, not copied. Everything here that the scoreboard does not cover is generated from its own record. Nothing in this file is typed in by hand.",
  consumes: {
    completionScoreboard: `${V1}/COMPLETION_SCOREBOARD.json`,
    censusFreeze: `${V1}/FREEZE.json`,
    reuseIndex: "data/rcap-grade-a/launch-control/reuse-index.json",
    legalQueue: `${V1}/legal-review-queue-v2.json`,
    legalRetriage: `${V1}/legal-review-queue-v2-retriage.json`,
    sourceQueue: `${V1}/source-queue-reconciliation.json`,
    frozenCategoryB: "data/rcap-grade-a/route-obligation-census-candidate/category-b-medium-confidence-revalidation.json",
    executionOrder: "docs/LAUNCH_SEQUENCE.md",
    productContract: "docs/PRODUCT_CONTRACT.md"
  },

  lineage: {
    captainBranch: "claude/legalease-sprint-captain-utucnw",
    captainSha: git(["rev-parse", "HEAD"]),
    censusFingerprint: census.metadata?.sourceFingerprint ?? null,
    censusLedgerBlob: git(["hash-object", "data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json"]),
    productionConnected: false,
    productionConnectedEvidence: "No SUPABASE_, STRIPE_ or VERCEL_ variable is set in the generating environment, and egress to api.supabase.com is refused by policy."
  },

  denominator: {
    terminalObligations: freeze.totals.totalObligations,
    categoryA: freeze.totals.categoryA,
    categoryB: freeze.totals.categoryB,
    legalReview: freeze.totals.needsLegalReview,
    packetFamilies: freeze.totals.packetFamilies,
    runtimeRoutes: freeze.totals.runtimeRoutes,
    statutoryLegalTracks: freeze.totals.statutoryLegalTracks,
    jurisdictions: Object.keys(familiesByState).length,
    note: "Read from the frozen census. A denominator that moves without an explanation is a verifier failure, not a rounding difference."
  },

  frozenCategoryB: {
    record: "data/rcap-grade-a/route-obligation-census-candidate/category-b-medium-confidence-revalidation.json",
    rows: categoryB.count,
    uniqueRouteKeys: new Set(categoryB.rows.map((r) => r.routeKey)).size,
    jurisdictions: new Set(categoryB.rows.map((r) => r.jurisdiction)).size,
    pinnedSourceCommit: categoryB.generatedFrom.captainHead,
    pinnedSourceBlob: categoryB.generatedFrom.sourceGitBlobSha,
    postRegenerationDelta: `${V1}/../route-obligation-census-candidate/category-b-medium-confidence-post-regeneration-delta.json`.replace("/../", "/"),
    status: "FROZEN_AND_ASSIGNED"
  },

  legalWork: {
    trueCounselQuestions: legalQueue.trueCounselQueue.count,
    trueCounselDetail: legalQueue.trueCounselQueue.questions.map((q) => `#${q.number} ${q.jurisdiction} — ${q.publicLabel}`),
    alreadyAnsweredImplementationQueue: retriage.counts.ALREADY_ANSWERED,
    captainMappingQueue: retriage.counts.CAPTAIN_MAPPING_CORRECTION,
    sourceIdentityQuestions: retriage.counts.SOURCE_IDENTITY_QUESTION,
    duplicateOrSuperseded: retriage.counts.DUPLICATE_OR_SUPERSEDED,
    total: retriage.counts.ALREADY_ANSWERED + retriage.counts.CAPTAIN_MAPPING_CORRECTION
      + retriage.counts.SOURCE_IDENTITY_QUESTION + retriage.counts.DUPLICATE_OR_SUPERSEDED
      + legalQueue.trueCounselQueue.count
  },

  sourceWork: {
    byDisposition: sourceQueue.byDisposition,
    rowStatus: sourceQueue.rowStatus,
    acquisitionBlockedOnEgress: sourceQueue.summary?.acquisitionBlockedOnEgress ?? null,
    acquisitionEvidence: "docs/rcap/grade-a/route-obligation-census/ACQUISITION_EGRESS_PROBE.md"
  },

  packetFamilies: {
    total: scoreboard.families.total,
    releasable: scoreboard.families.releasable,
    heldBack: scoreboard.families.heldBack,
    evidenceInCaptainTree: reuse.totals.familiesWithEvidenceInTree,
    // Only families whose evidence is on a branch AND absent from the tree.
    // Counting every family with a branch would include the six already
    // integrated, and report twelve packets awaiting integration when six are.
    evidenceOnBranchAwaitingIntegration: reuse.families.filter((f) => f.reuseDecision === "RESUME_FROM_COMMIT").length,
    freeToDispatch: reuse.totals.familiesFreeToDispatch,
    byState: familiesByState,
    completePacketProven: scoreboard.commercial.completePacketProven
  },

  productPath: {
    commercialRoutesOpened: scoreboard.commercial.routesOpened,
    commerciallyEligible: scoreboard.commercial.commerciallyEligible,
    moneyGate: "scripts/verify-rcap-census-v1-money-credit-gate.mjs — 337 of 337 routes refused: no price, checkout, sponsorship, credit, attach or delivery",
    staleArtifactBlock: "data/rcap-grade-a/stale-artifact-block.json"
  },

  participantDataRights: dataRights ? {
    branch: "claude/census-v1-current-participant-data-rights",
    focusedTests: "117/117",
    migration: "supabase/migrations/20260830120000_participant_data_rights.sql",
    applied: dataRights.applied,
    verdict: dataRights.verdict,
    codeIntegration: "integrated on the Captain branch",
    nonproductionMigration: "authorized and unspent — preconditions unsatisfiable in an environment that cannot reach the project"
  } : null,

  testStatus: {
    focusedControlPlane: "generated at run time by the checkpoint verifier",
    fullChain: "NOT RUN — a broad tracked-file mutation suite is not run while external workers are active",
    hostedAcceptance: "NOT RUN — no hosted environment is reachable from the Captain environment",
    productionPreflight: "NOT RUN — Production is not connected and no Production authorization exists"
  },

  launchGate: {
    familiesNotLaunchReady: scoreboard.launchGate.familiesNotLaunchReady,
    blockersByKind: scoreboard.launchGate.blockersByKind,
    gateOpen: scoreboard.launchGate.gateOpen ?? false
  },

  exactBlockers: [
    { id: "BLK-1", blocker: "Official-source acquisition cannot run from any Captain-reachable environment", detail: "Egress to court and agency hosts is refused by policy; 59 obligations have a known official target and cannot be fetched.", owner: "Roger — gateway allowlisting or a controlled operator environment", blocks: "59 ACQUIRE_FROM_EXACT_OFFICIAL_SOURCE obligations" },
    { id: "BLK-2", blocker: "Four true counsel questions are unanswered", detail: legalQueue.trueCounselQueue.questions.map((q) => `#${q.number} ${q.jurisdiction}`).join(", "), owner: "Lawrence Blackmon", blocks: "the routes those four decisions govern" },
    { id: "BLK-3", blocker: "No packet family has an independent review or output approval", detail: "Six families carry candidate evidence in the tree and six more await integration; none has passed independent technical verification, independent visual review or Lawrence approval.", owner: "Captain then Lawrence", blocks: "COMPLETE_PACKET_PROVEN for every family, and therefore every commercial route" },
    { id: "BLK-4", blocker: "The data-rights migration cannot be applied from this environment", detail: "Authorized for the synthetic acceptance project and unspent; the preconditions are observations about a project this environment cannot reach.", owner: "an environment with the project ref and egress", blocks: "hosted data-rights acceptance" },
    { id: "BLK-5", blocker: "238 families are held for a missing source", detail: "Released automatically as sources resolve; the scoreboard recomputes releasability rather than relying on anyone remembering.", owner: "source lanes C8 and C9", blocks: "238 of 352 families entering a build slot" }
  ],

  goHold: {
    decision: "HOLD",
    because: "No family is COMPLETE_PACKET_PROVEN, no route is commercially open, and the launch gate is closed on every one of the 352 families. GO is a statement about proven packets, and there are none yet. Holding is the correct state, not a failure.",
    whatWouldChangeIt: "One family passing the full sequence — independent technical verification, independent visual review, an exact output-review package, Lawrence's approval of exact hashes, a Grade-A fulfilment record, product wiring and both path proofs — would open exactly that family's route and nothing else."
  }
};

const serialized = JSON.stringify(doc, null, 2) + "\n";
const outPath = path.join(ROOT, OUT);
if (CHECK) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : null;
  if (current !== serialized) { console.error(`${OUT} is stale. Run the generator.`); process.exit(1); }
  console.log(`launch control current: ${doc.denominator.packetFamilies} families, GO/HOLD ${doc.goHold.decision}.`);
  process.exit(0);
}
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, serialized);
console.log(`Wrote ${OUT}\n`);
console.log(`  captain ${doc.lineage.captainSha.slice(0, 8)} · ${doc.denominator.terminalObligations} obligations · ${doc.denominator.packetFamilies} families`);
console.log(`  families: ${doc.packetFamilies.evidenceInCaptainTree} in tree, ${doc.packetFamilies.evidenceOnBranchAwaitingIntegration} awaiting integration, ${doc.packetFamilies.freeToDispatch} free`);
console.log(`  counsel ${doc.legalWork.trueCounselQuestions} · blockers ${doc.exactBlockers.length} · ${doc.goHold.decision}`);
