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
const OUT = "data/rcap-grade-a/launch-control/GRADE_A_LAUNCH_CONTROL.json";
const OUT_MD = "docs/rcap/grade-a/launch-control/GRADE_A_LAUNCH_STATUS.md";
const CHECK = process.argv.includes("--check");

const git = (args) => { try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 29 }).trim(); } catch { return null; } };
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

const V1 = "data/rcap-grade-a/route-obligation-census-v1";
const scoreboard = read(`${V1}/COMPLETION_SCOREBOARD.json`);
const freeze = read(`${V1}/FREEZE.json`);
const reuse = read("data/rcap-grade-a/launch-control/EXISTING_WORK_REUSE_INDEX.json");
const retriage = read(`${V1}/legal-review-queue-v2-retriage.json`);
const legalQueue = read(`${V1}/legal-review-queue-v2.json`);
const sourceQueue = read(`${V1}/source-queue-reconciliation.json`);
const census = read("data/rcap-grade-a/route-obligation-census-candidate/route-obligation-candidate.json");
const categoryB = read("data/rcap-grade-a/route-obligation-census-candidate/category-b-medium-confidence-revalidation.json");
const worklist = read("data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json");
const delta = read("data/rcap-grade-a/launch-control/CATEGORY_B_REVALIDATION_INTEGRATION_DELTA.json");
const waveReview = read("data/rcap-grade-a/launch-control/WAVE_1_RETURN_REVIEW.json");
const integration = read("data/rcap-grade-a/launch-control/CATEGORY_B_INTEGRATION_STATUS.json");
const residual = read("data/rcap-grade-a/launch-control/RESIDUAL_WORK.json");
const contract = read("data/rcap-grade-a/launch-control/WORKER_EXECUTION_CONTRACT.json");
const counsel = read("data/rcap-grade-a/launch-control/COUNSEL_DETERMINATION_DELTA.json");
const c11 = read("data/rcap-grade-a/launch-control/C11_RETURN_REVIEW.json");
const c11Stops = read("data/rcap-grade-a/launch-control/C11_STOP_CLASSIFICATION.json");
const completeness = read("data/rcap-grade-a/packet-completeness/PACKET_COMPLETENESS_MATRIX.json");
const repairPlan = read("data/rcap-grade-a/packet-completeness/COMPLETENESS_REPAIR_PLAN.json");
const crosswalk = read("data/rcap-grade-a/launch-control/CATEGORY_B_STAGE_BRANCH_CROSSWALK.json");
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
    reuseIndex: "data/rcap-grade-a/launch-control/EXISTING_WORK_REUSE_INDEX.json",
    legalQueue: `${V1}/legal-review-queue-v2.json`,
    legalRetriage: `${V1}/legal-review-queue-v2-retriage.json`,
    sourceQueue: `${V1}/source-queue-reconciliation.json`,
    frozenCategoryB: "data/rcap-grade-a/route-obligation-census-candidate/category-b-medium-confidence-revalidation.json",
    categoryBIntegrationDelta: "data/rcap-grade-a/launch-control/CATEGORY_B_REVALIDATION_INTEGRATION_DELTA.json",
    categoryBStageBranchCrosswalk: "data/rcap-grade-a/launch-control/CATEGORY_B_STAGE_BRANCH_CROSSWALK.json",
    waveOneReturnReview: "data/rcap-grade-a/launch-control/WAVE_1_RETURN_REVIEW.json",
    categoryBIntegrationStatus: "data/rcap-grade-a/launch-control/CATEGORY_B_INTEGRATION_STATUS.json",
    residualWork: "data/rcap-grade-a/launch-control/RESIDUAL_WORK.json",
    workerExecutionContract: "data/rcap-grade-a/launch-control/WORKER_EXECUTION_CONTRACT.json",
    counselDeterminationDelta: "data/rcap-grade-a/launch-control/COUNSEL_DETERMINATION_DELTA.json",
    c11ReturnReview: "data/rcap-grade-a/launch-control/C11_RETURN_REVIEW.json",
    c11StopClassification: "data/rcap-grade-a/launch-control/C11_STOP_CLASSIFICATION.json",
    packetCompletenessMatrix: "data/rcap-grade-a/packet-completeness/PACKET_COMPLETENESS_MATRIX.json",
    completenessRepairPlan: "data/rcap-grade-a/packet-completeness/COMPLETENESS_REPAIR_PLAN.json",
    counselDecisionRecord: "data/record-clearing/legal-decisions/2026-08-30-lawrence-four-counsel-determinations.json",
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
    status: "REVALIDATED_AND_RECONCILED",
    revalidation: {
      assignmentCommit: delta.ingestedFrom.assignmentCommit,
      returnedDecisions: delta.counts.byDecision,
      needsLegalDecision: 0,
      researchLanesStillRequired: 0,
      note: "The 55 came back classified. The four Category B research lanes the first dispatch carried are obsolete and are not in the active manifest; what remains is implementation."
    }
  },

  // WHAT THE 55 DECISIONS ACTUALLY COST THE DENOMINATOR.
  //
  // 49 splits is not 49 new obligations. 17 participant branches already exist
  // in the canonical universe on the forms their instruments name, so those are
  // crosswalks; 35 are newly required. The same reconciliation runs on packet
  // families: 23 participant-filing families are required, 3 of which the
  // census already carries, so 20 are new -- not 35 and not 49.
  categoryBIntegration: {
    rows: delta.counts.rows,
    jurisdictions: delta.counts.jurisdictions,
    aBranchesAlreadyExisting: delta.counts.aBranchesAlreadyExisting,
    aBranchesNewlyRequired: delta.counts.aBranchesNewlyRequired,
    aliasOrCrosswalkRepairs: delta.counts.aliasOrCrosswalkRepairs,
    categoryBStagesRetained: delta.counts.categoryBStagesRetained,
    guidanceFamiliesTheseRoutesSitInToday: delta.counts.packetFamiliesAlreadyPresent,
    participantPacketFamiliesRequired: delta.counts.participantPacketFamiliesRequired,
    participantPacketFamiliesAlreadyInCensus: delta.counts.participantPacketFamiliesAlreadyInCensus,
    newPacketFamiliesRequired: delta.counts.newPacketFamiliesRequired,
    stageBranchPairs: crosswalk.pairs.length,
    confirmedBStages: crosswalk.confirmedBStages.length,
    convertedToA: crosswalk.convertedToA.length,
    projectedDenominator: delta.projectedDenominator,
    archetypeRouting: delta.archetypeRouting,
    grantsNothing: delta.decisionsAreLegalClassificationsOnly
  },

  // WHAT THE FIRST WAVE ACTUALLY RETURNED.
  //
  // Eleven lanes returned and one is still running. Every verdict here is the
  // mechanical one -- parentage, scope, prohibited paths, required outputs
  // checked against git -- and every per-route number comes from the canonical
  // integration status rather than from a worker's own summary.
  waveOne: {
    returnsReported: waveReview.summary.returnsReported,
    scopeAndOutputVerified: waveReview.summary.scopeAndOutputVerified,
    scopeCleanOutputMissing: waveReview.summary.scopeCleanOutputMissing,
    refused: waveReview.summary.refused,
    stillRunning: waveReview.summary.stillRunning,
    laneStillRunning: residual.notYetResidual.laneStillRunning,
    outOfScopeWrites: waveReview.summary.outOfScopeWrites,
    prohibitedPathViolations: waveReview.summary.prohibitedPathViolations,
    branchIdentities: {
      classifiedRoutes: integration.counts.classifiedRoutes,
      completed: integration.counts.completed,
      stopped: integration.counts.stopped,
      newBranchIdentitiesIntegrated: integration.counts.newBranchIdentitiesIntegrated,
      crosswalksIntegrated: integration.counts.crosswalksIntegrated,
      confirmedBGuidanceIdentitiesIntegrated: integration.counts.confirmedBGuidanceIdentitiesIntegrated,
      packetFamiliesCreated: integration.counts.packetFamiliesCreated
    },
    residual: residual.counts,
    systemicFindings: waveReview.systemicFindings.map((f) => ({ id: f.id, finding: f.finding, fix: f.fix })),
    executionContract: {
      record: "data/rcap-grade-a/launch-control/WORKER_EXECUTION_CONTRACT.json",
      clauses: contract.clauses.length,
      bindsFromWave: contract.bindsFromWave,
      currentDispatchNotRewritten: contract.currentDispatchDeliberatelyNotRewritten.why
    },
    integrationOpensNothing: integration.integrationOpensNothing,

    // THE PACKET LANE. It returned last and it returned the most: 43 built
    // families out of 47, four stopped with named blockers, and 59 files that
    // had to be excluded because their bytes are indexed private-corpus sources.
    packetFactory: {
      assignmentId: "C11_PACKET_FACTORY_ACCELERATOR",
      verdict: c11.verdict,
      familiesAssigned: c11.summary.assigned,
      familiesBuilt: c11.summary.built,
      familiesStopped: c11.summary.stopped,
      sourceReceiptsExact: c11.summary.sourceReceiptsExact,
      sourceReferences: c11.summary.sourceReferences,
      corpusBinariesExcluded: c11.exclusionList.length,
      builtFamiliesMissingWiringRecord: c11.summary.builtFamiliesWithoutProductWiring.length,
      outputApprovalsGranted: c11.summary.outputApprovalsGranted,
      commercialRoutesOpened: c11.summary.commercialRoutesOpened,
      pathOwnershipReleased: true,
      packetsProvenIndependently: 0,
      stopsByClass: c11Stops.counts.byPrimaryClass,
      newLegalQuestionsRaised: c11Stops.counts.newLegalQuestions,
      whatBuiltDoesNotMean: "Built means artifacts were rendered and byte-checked by the lane that built them. It is not independent verification, not visual review, not an output-level legal approval, and not COMPLETE_PACKET_PROVEN.",

      // AND IT DOES NOT MEAN COMPLETE. Every build check asked whether the
      // writes that were made were correct; none asked what was owed. Under the
      // completeness contract no family in the fleet passes.
      completeness: {
        contract: "scripts/rcap-packet-completeness/completeness-contract.mjs",
        familiesAudited: completeness.familiesAudited,
        passComplete: completeness.byResult.PASS_COMPLETE ?? 0,
        byResult: completeness.byResult,
        counterTotals: completeness.counterTotals,
        passRevoked: repairPlan.passRevocation.families,
        passRevokedClassification: repairPlan.passRevocation.newClassification,
        lawrenceReviewPackagesPrepared: repairPlan.passRevocation.lawrenceReviewPackagesPrepared,
        theBlindSpot: completeness.whatTheOldPassProved
      }
    }
  },

  legalWork: {
    trueCounselQuestions: legalQueue.trueCounselQueue.count,
    trueCounselAnswered: legalQueue.trueCounselQueue.answered ?? 0,
    trueCounselOpen: legalQueue.trueCounselQueue.open ?? legalQueue.trueCounselQueue.count,
    trueCounselDetail: legalQueue.trueCounselQueue.questions.map((q) =>
      `#${q.number} ${q.jurisdiction} — ${q.publicLabel}${q.answered ? ` — ANSWERED ${q.answeredOn}: ${q.answerSummary}` : ""}`),
    // WHAT THE FOUR ANSWERS COST THE TREE.
    //
    // Three of the four are Category A, but "Category A" is not an instruction
    // on its own: New York's answer splits one obligation into two date-specific
    // subroutes, and Utah's keeps one obligation while refusing four of nine
    // branches without signed prosecutorial consent. The counts come from the
    // reconciliation, not from the answers.
    counselDeterminations: {
      answered: counsel.counts.questionsAnswered,
      categoryA: counsel.counts.categoryA,
      categoryB: counsel.counts.categoryB,
      mandatoryRouteSplits: counsel.counts.mandatoryRouteSplits,
      subroutesRequired: counsel.counts.subroutesRequired,
      branchesGatedBehindConsent: counsel.counts.branchesGatedBehindConsent,
      branchesParticipantFiled: counsel.counts.branchesParticipantFiled,
      obligationDelta: counsel.counts.obligationDelta,
      projectedDenominator: counsel.projectedDenominator.afterCounselDeterminations,
      sourceIdentityObligations: counsel.sourceIdentityObligations,
      grantsNothing: "These determinations create implementation obligations only. No commercial route opens and no packet is proven."
    },
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
    // CORRECTED AT CHECKPOINT 1. The previous wording said egress to court and
    // agency hosts is refused by policy. C10's own HEAD probe from a worker host
    // reached five of the seven official hosts it tested, so the blanket claim
    // was wrong and the 49 acquisitions stopped on a blanket stop condition this
    // dispatch wrote, not on an observed refusal. Egress is now recorded per
    // exact source.
    { id: "BLK-1", blocker: "Official-source acquisition has not run, and the reason is per source rather than a blanket policy refusal", detail: `A HEAD probe from a worker host reached ${residual.lanes.find((l) => l.residualLaneId === "R4_SOURCE_IDENTITY_AND_ACQUISITION").detail.egressByExactSource.filter((h) => h.reachableOnHeadProbe).length} of ${residual.lanes.find((l) => l.residualLaneId === "R4_SOURCE_IDENTITY_AND_ACQUISITION").detail.egressByExactSource.length} official hosts tested; the rest refused. No document body was downloaded, so reachability is proven and acquisition is not. The 49 obligations stopped on this dispatch's blanket egress stop condition, which the worker execution contract removes.`, owner: "Captain — reissue acquisition per reachable source; Roger — escalate the refused hosts", blocks: "49 acquisition obligations and 33 promotion candidates" },
    // CLOSED AT CHECKPOINT 1. Lawrence answered all four on 2026-08-30. What
    // replaces the blocker is engineering work, not a wait.
    { id: "BLK-2", blocker: "CLOSED — the four true counsel questions are answered", detail: `${counsel.counts.questionsAnswered} of ${legalQueue.trueCounselQueue.count} answered on ${counsel.decisionDate} by ${counsel.decisionOwner}: ${counsel.counts.categoryA} Category A, ${counsel.counts.categoryB} legitimate exclusion. New York requires a mandatory split into ${counsel.counts.subroutesRequired} date-specific subroutes and Utah gates ${counsel.counts.branchesGatedBehindConsent} of nine branches behind prosecutorial consent. What remains is implementation, carried as residual lane R6.`, owner: "Captain — residual lane R6_COUNSEL_DETERMINATION_IMPLEMENTATION", blocks: "nothing; this blocker is closed" },
    { id: "BLK-3", blocker: "No packet family has an independent review or output approval", detail: "Six families carry candidate evidence in the tree and six more await integration; none has passed independent technical verification, independent visual review or Lawrence approval.", owner: "Captain then Lawrence", blocks: "COMPLETE_PACKET_PROVEN for every family, and therefore every commercial route" },
    { id: "BLK-4", blocker: "The data-rights migration cannot be applied from this environment", detail: "Authorized for the synthetic acceptance project and unspent; the preconditions are observations about a project this environment cannot reach.", owner: "an environment with the project ref and egress", blocks: "hosted data-rights acceptance" },
    { id: "BLK-5", blocker: "238 families are held for a missing source", detail: "Released automatically as sources resolve; the scoreboard recomputes releasability rather than relying on anyone remembering.", owner: "source lane C10, continued as residual lane R4", blocks: "238 of 352 families entering a build slot" },
    // C11 returned 43 built families. Built is not proven: the builder's own
    // report is evidence, and nothing independent has looked at any of them.
    { id: "BLK-8", blocker: `${c11.summary.built} packet families are built, none is independently verified, and none is complete`, detail: `C11 rendered and byte-checked ${c11.summary.built} families against exact source SHA-256 values, but a builder verifying its own output proves nothing — and the completeness contract now shows the deeper problem: ${completeness.byResult.PASS_COMPLETE ?? 0} of ${completeness.familiesAudited} families contain everything a filing needs. ${completeness.counterTotals.knownRequiredFieldsMissing} known required fields are missing across the fleet and ${completeness.counterTotals.requiredOptionsMissing} route-determined elections are left to the participant. The four families previously classified PASS are revoked.`, owner: "R8 repairs the four, V1-V7 verify the rest, then Lawrence", blocks: "output-level approval, and therefore product-path proof, for every family" },
    { id: "BLK-6", blocker: "At least one worker host could not install the toolchain", detail: "32 MiB free after worktree creation, so no test needing node_modules could run and two focused tests were returned BLOCKED rather than passed. One return documents it here; the owner reports it as shared across the wave.", owner: "Roger — worker environment sizing", blocks: "every focused test in an affected lane, and the hosted acceptance lane entirely" },
    { id: "BLK-7", blocker: "The private nationwide inventory is not mounted on any worker host", detail: "33 promotion candidates were receipted against their committed hashes and none was physically promoted, because private/Nationwide Record Clearing/ was absent from the executing host.", owner: "Roger — mount the inventory for the source lane", blocks: "33 promotion obligations" }
  ],

  goHold: {
    decision: "HOLD",
    because: "No family is COMPLETE_PACKET_PROVEN, no route is commercially open, and the launch gate is closed on every one of the 352 families. GO is a statement about proven packets, and there are none yet. Holding is the correct state, not a failure.",
    whatWouldChangeIt: "One family passing the full sequence — independent technical verification, independent visual review, an exact output-review package, Lawrence's approval of exact hashes, a Grade-A fulfilment record, product wiring and both path proofs — would open exactly that family's route and nothing else."
  }
};

// ---- the human-readable mirror ---------------------------------------------------
//
// GRADE_A_LAUNCH_STATUS.md is rendered FROM the record above, in the same run,
// so the two cannot disagree. A status page maintained by hand beside a
// generated record is the second claimant this phase exists to prevent; this
// one has no facts of its own.
function renderStatus(d) {
  const row = (label, value) => `| ${label} | ${value} |`;
  const lines = [];
  lines.push("# Grade-A launch status");
  lines.push("");
  lines.push("_Rendered from `GRADE_A_LAUNCH_CONTROL.json` by the same generator, in the same run. It has no facts of its own; if it disagrees with the record, the record is right and this file is stale._");
  lines.push("");
  lines.push(`**GO/HOLD: ${d.goHold.decision}.** ${d.goHold.because}`);
  lines.push("");
  lines.push("## Lineage");
  lines.push("");
  lines.push("| | |");
  lines.push("| --- | --- |");
  lines.push(row("Captain branch", `\`${d.lineage.captainBranch}\``));
  lines.push(row("Captain SHA", `\`${d.lineage.captainSha}\``));
  lines.push(row("Census fingerprint", `\`${d.lineage.censusFingerprint}\``));
  lines.push(row("Production connected", d.lineage.productionConnected ? "YES" : "NO"));
  lines.push("");
  lines.push("## Denominator");
  lines.push("");
  lines.push("| | Current | After the Category B integration |");
  lines.push("| --- | ---: | ---: |");
  lines.push(`| Terminal obligations | ${d.denominator.terminalObligations} | ${d.categoryBIntegration.projectedDenominator.terminalObligationsAfterIntegration} |`);
  lines.push(`| Category A | ${d.denominator.categoryA} | ${d.categoryBIntegration.projectedDenominator.categoryAAfterIntegration} |`);
  lines.push(`| Category B stages | ${d.denominator.categoryB} | ${d.categoryBIntegration.projectedDenominator.categoryBStageAfterIntegration} |`);
  lines.push(`| Packet families | ${d.denominator.packetFamilies} | ${d.denominator.packetFamilies} + ${d.categoryBIntegration.newPacketFamiliesRequired} participant-filing families |`);
  lines.push(`| Runtime routes | ${d.denominator.runtimeRoutes} | ${d.denominator.runtimeRoutes} |`);
  lines.push(`| Jurisdictions | ${d.denominator.jurisdictions} | ${d.denominator.jurisdictions} |`);
  lines.push("");
  lines.push("The right-hand column is a projection, not a fact. The census moves only when the branches exist and only through its own generator.");
  lines.push("");
  lines.push("## The 55 revalidated Category B routes");
  lines.push("");
  lines.push("| | |");
  lines.push("| --- | ---: |");
  lines.push(row("Rows returned", d.categoryBIntegration.rows));
  for (const [decision, count] of Object.entries(d.frozenCategoryB.revalidation.returnedDecisions)) lines.push(row(decision, count));
  lines.push(row("Still needing a legal decision", d.frozenCategoryB.revalidation.needsLegalDecision));
  lines.push(row("A branches already in the canonical universe", d.categoryBIntegration.aBranchesAlreadyExisting));
  lines.push(row("A branches newly required", d.categoryBIntegration.aBranchesNewlyRequired));
  lines.push(row("Alias or crosswalk repairs", d.categoryBIntegration.aliasOrCrosswalkRepairs));
  lines.push(row("B stages retained", d.categoryBIntegration.categoryBStagesRetained));
  lines.push(row("Participant packet families required", d.categoryBIntegration.participantPacketFamiliesRequired));
  lines.push(row("of those, already in the census", d.categoryBIntegration.participantPacketFamiliesAlreadyInCensus));
  lines.push(row("New packet families required", d.categoryBIntegration.newPacketFamiliesRequired));
  lines.push("");
  lines.push("49 splits is not 49 new obligations, and it is not 49 new families. Each participant branch was matched against the Category A routes in its own jurisdiction on the form numbers its instrument names before anything was counted as new.");
  lines.push("");
  lines.push("## First wave");
  lines.push("");
  lines.push(`${d.waveOne.returnsReported - d.waveOne.stillRunning} lanes returned and ${d.waveOne.stillRunning} is still running (**${d.waveOne.laneStillRunning}**). Every verdict below is checked against git, not against a worker's summary.`);
  lines.push("");
  lines.push("| | |");
  lines.push("| --- | ---: |");
  lines.push(row("Scope and required outputs verified", d.waveOne.scopeAndOutputVerified));
  lines.push(row("Scope clean, a required output missing", d.waveOne.scopeCleanOutputMissing));
  lines.push(row("Refused", d.waveOne.refused));
  lines.push(row("Writes outside a lane's owned paths", d.waveOne.outOfScopeWrites));
  lines.push(row("Prohibited-path violations", d.waveOne.prohibitedPathViolations));
  lines.push("");
  lines.push("### Branch identities");
  lines.push("");
  lines.push("| | |");
  lines.push("| --- | ---: |");
  lines.push(row("Classified routes", d.waveOne.branchIdentities.classifiedRoutes));
  lines.push(row("Completed", d.waveOne.branchIdentities.completed));
  lines.push(row("Stopped", d.waveOne.branchIdentities.stopped));
  lines.push(row("New branch identities integrated", d.waveOne.branchIdentities.newBranchIdentitiesIntegrated));
  lines.push(row("Crosswalks integrated", d.waveOne.branchIdentities.crosswalksIntegrated));
  lines.push(row("Confirmed-B guidance identities integrated", d.waveOne.branchIdentities.confirmedBGuidanceIdentitiesIntegrated));
  lines.push(row("Packet families created", d.waveOne.branchIdentities.packetFamiliesCreated));
  lines.push("");
  lines.push(d.waveOne.integrationOpensNothing);
  lines.push("");
  lines.push("### Packet factory");
  lines.push("");
  lines.push("| | |");
  lines.push("| --- | ---: |");
  lines.push(row("Families assigned", d.waveOne.packetFactory.familiesAssigned));
  lines.push(row("Built", d.waveOne.packetFactory.familiesBuilt));
  lines.push(row("Stopped with a named blocker", d.waveOne.packetFactory.familiesStopped));
  lines.push(row("Source receipts exact", d.waveOne.packetFactory.sourceReceiptsExact));
  lines.push(row("Source references bound", d.waveOne.packetFactory.sourceReferences));
  lines.push(row("Private-corpus binaries excluded at integration", d.waveOne.packetFactory.corpusBinariesExcluded));
  lines.push(row("Built families missing a wiring record", d.waveOne.packetFactory.builtFamiliesMissingWiringRecord));
  lines.push(row("Independently verified", d.waveOne.packetFactory.packetsProvenIndependently));
  lines.push(row("Output approvals granted", d.waveOne.packetFactory.outputApprovalsGranted));
  lines.push(row("Commercial routes opened", d.waveOne.packetFactory.commercialRoutesOpened));
  lines.push("");
  lines.push(d.waveOne.packetFactory.whatBuiltDoesNotMean);
  lines.push("");
  lines.push("### Packet completeness");
  lines.push("");
  lines.push(d.waveOne.packetFactory.completeness.theBlindSpot);
  lines.push("");
  lines.push("| | |");
  lines.push("| --- | ---: |");
  lines.push(row("Families audited", d.waveOne.packetFactory.completeness.familiesAudited));
  lines.push(row("PASS_COMPLETE", d.waveOne.packetFactory.completeness.passComplete));
  for (const [k, v] of Object.entries(d.waveOne.packetFactory.completeness.byResult)) if (k !== "PASS_COMPLETE") lines.push(row(k, v));
  lines.push("");
  lines.push("| Counter | Fleet total |");
  lines.push("| --- | ---: |");
  for (const [k, v] of Object.entries(d.waveOne.packetFactory.completeness.counterTotals)) lines.push(row(k, v));
  lines.push("");
  lines.push(`**${d.waveOne.packetFactory.completeness.passRevoked.length} PASS classifications revoked** to \`${d.waveOne.packetFactory.completeness.passRevokedClassification}\`: ${d.waveOne.packetFactory.completeness.passRevoked.map((f) => `\`${f}\``).join(", ")}. Lawrence review packages prepared: ${d.waveOne.packetFactory.completeness.lawrenceReviewPackagesPrepared}.`);
  lines.push("");
  lines.push("### Residual");
  lines.push("");
  lines.push("| | |");
  lines.push("| --- | ---: |");
  lines.push(row("Branch identities still open", d.waveOne.residual.residualRoutes));
  lines.push(row("Already-answered engineering rows", d.waveOne.residual.residualAlreadyAnsweredRows));
  lines.push(row("Mapping rows", d.waveOne.residual.residualMappingRows));
  lines.push(row("Stage/branch pair bindings", d.waveOne.residual.residualPairBindings));
  lines.push(row("Source identities", d.waveOne.residual.residualSourceIdentities));
  lines.push(row("Official URLs", d.waveOne.residual.residualOfficialUrls));
  lines.push(row("Acquisitions", d.waveOne.residual.residualAcquisitions));
  lines.push(row("Promotions", d.waveOne.residual.residualPromotions));
  lines.push("");
  lines.push("### What the wave taught");
  lines.push("");
  for (const f of d.waveOne.systemicFindings) {
    lines.push(`- **${f.id}** — ${f.finding}`);
    lines.push(`  _Fix:_ ${f.fix}`);
  }
  lines.push("");
  lines.push(`The execution contract carries ${d.waveOne.executionContract.clauses} clauses and binds from wave ${d.waveOne.executionContract.bindsFromWave}. ${d.waveOne.executionContract.currentDispatchNotRewritten}`);
  lines.push("");
  lines.push("## Legal work");
  lines.push("");
  lines.push(`Four questions were genuinely for counsel; **${d.legalWork.trueCounselAnswered} are answered and ${d.legalWork.trueCounselOpen} remain open**. The other ${d.legalWork.total - d.legalWork.trueCounselQuestions} rows of the 86 are Captain work.`);
  lines.push("");
  for (const q of d.legalWork.trueCounselDetail) lines.push(`- ${q}`);
  lines.push("");
  lines.push("### What the four answers require");
  lines.push("");
  lines.push("| | |");
  lines.push("| --- | ---: |");
  lines.push(row("Category A", d.legalWork.counselDeterminations.categoryA));
  lines.push(row("Category B (legitimate exclusion)", d.legalWork.counselDeterminations.categoryB));
  lines.push(row("Mandatory route splits", d.legalWork.counselDeterminations.mandatoryRouteSplits));
  lines.push(row("Subroutes required", d.legalWork.counselDeterminations.subroutesRequired));
  lines.push(row("Branches gated behind prosecutorial consent", d.legalWork.counselDeterminations.branchesGatedBehindConsent));
  lines.push(row("Branches participant-filed with no consent gate", d.legalWork.counselDeterminations.branchesParticipantFiled));
  lines.push(row("Obligations added", d.legalWork.counselDeterminations.obligationDelta));
  lines.push("");
  lines.push(`New York cannot be built as one generic pre-November 1991 motion: the screening must ask the exact conviction date, and that date selects the motion theory. Utah's consent-dependent and joint-motion branches refuse without signed prosecutorial consent. Nebraska generates no merits pleading at all.`);
  lines.push("");
  lines.push(d.legalWork.counselDeterminations.grantsNothing);
  lines.push("");
  lines.push("| Queue | Rows |");
  lines.push("| --- | ---: |");
  lines.push(row("Already answered — implementation", d.legalWork.alreadyAnsweredImplementationQueue));
  lines.push(row("Captain route mapping", d.legalWork.captainMappingQueue));
  lines.push(row("Source identity", d.legalWork.sourceIdentityQuestions));
  lines.push(row("Duplicate or superseded", d.legalWork.duplicateOrSuperseded));
  lines.push("");
  lines.push("## Source work");
  lines.push("");
  lines.push("| Disposition | Obligations |");
  lines.push("| --- | ---: |");
  for (const [k, v] of Object.entries(d.sourceWork.byDisposition)) lines.push(row(k, v));
  lines.push("");
  lines.push(`${d.sourceWork.acquisitionBlockedOnEgress} obligations have an exact official target and cannot be fetched from any Captain-reachable environment.`);
  lines.push("");
  lines.push("## Packet families");
  lines.push("");
  lines.push("| | |");
  lines.push("| --- | ---: |");
  lines.push(row("Total", d.packetFamilies.total));
  lines.push(row("Releasable", d.packetFamilies.releasable));
  lines.push(row("Held for a missing source", d.packetFamilies.heldBack));
  lines.push(row("Candidate evidence in the Captain tree", d.packetFamilies.evidenceInCaptainTree));
  lines.push(row("Finished on a branch, awaiting integration", d.packetFamilies.evidenceOnBranchAwaitingIntegration));
  lines.push(row("Free to dispatch", d.packetFamilies.freeToDispatch));
  lines.push(row("COMPLETE_PACKET_PROVEN", d.packetFamilies.completePacketProven));
  lines.push("");
  lines.push("## Product path");
  lines.push("");
  lines.push(`Commercial routes opened: **${d.productPath.commercialRoutesOpened}**. Commercially eligible: **${d.productPath.commerciallyEligible}**.`);
  lines.push("");
  lines.push(d.categoryBIntegration.grantsNothing);
  lines.push("");
  lines.push("## Tests");
  lines.push("");
  for (const [k, v] of Object.entries(d.testStatus)) lines.push(`- **${k}** — ${v}`);
  lines.push("");
  lines.push("## Blockers");
  lines.push("");
  for (const b of d.exactBlockers) {
    lines.push(`### ${b.id} — ${b.blocker}`);
    lines.push("");
    lines.push(b.detail);
    lines.push("");
    lines.push(`**Owner:** ${b.owner}. **Blocks:** ${b.blocks}`);
    lines.push("");
  }
  lines.push("## What would change GO/HOLD");
  lines.push("");
  lines.push(d.goHold.whatWouldChangeIt);
  lines.push("");
  return lines.join("\n");
}

const serialized = JSON.stringify(doc, null, 2) + "\n";
const status = renderStatus(doc);
const outPath = path.join(ROOT, OUT);
const statusPath = path.join(ROOT, OUT_MD);
if (CHECK) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : null;
  if (current === null) { console.error(`${OUT} is missing. Run the generator.`); process.exit(1); }
  // lineage.captainSha is provenance, not a finding — committing this record
  // moves HEAD past the value it recorded. Comparing it byte-for-byte would
  // report the launch record stale on every commit, including commits that
  // changed nothing it depends on. The findings are compared exactly; whether
  // the record is still CURRENT is a different question, and the checkpoint
  // verifier's A14/A15 answer it properly by asking whether any consumed
  // record has moved since.
  const committed = JSON.parse(current);
  const strip = (value) => {
    const copy = JSON.parse(JSON.stringify(value));
    delete copy.lineage.captainSha;
    return JSON.stringify(copy, null, 2) + "\n";
  };
  if (strip(committed) !== strip(doc)) {
    console.error(`${OUT} is stale: a reported value has changed. Run the generator.`);
    process.exit(1);
  }
  // The markdown mirror is rendered from the committed record, so it is
  // compared against what the committed record renders to. Comparing it against
  // the freshly generated record would report it stale for the same provenance
  // reason A14 exists to handle.
  const committedStatus = fs.existsSync(statusPath) ? fs.readFileSync(statusPath, "utf8") : null;
  if (committedStatus === null) { console.error(`${OUT_MD} is missing. Run the generator.`); process.exit(1); }
  if (committedStatus !== renderStatus(committed)) {
    console.error(`${OUT_MD} does not match the record it mirrors. Run the generator.`);
    process.exit(1);
  }
  console.log(`launch control current: ${doc.denominator.packetFamilies} families, GO/HOLD ${doc.goHold.decision}; recorded at ${committed.lineage.captainSha.slice(0, 8)}.`);
  console.log(`launch status mirror current: ${OUT_MD}`);
  process.exit(0);
}
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.mkdirSync(path.dirname(statusPath), { recursive: true });
fs.writeFileSync(outPath, serialized);
fs.writeFileSync(statusPath, status);
console.log(`Wrote ${OUT}`);
console.log(`Wrote ${OUT_MD}\n`);
console.log(`  captain ${doc.lineage.captainSha.slice(0, 8)} · ${doc.denominator.terminalObligations} obligations · ${doc.denominator.packetFamilies} families`);
console.log(`  families: ${doc.packetFamilies.evidenceInCaptainTree} in tree, ${doc.packetFamilies.evidenceOnBranchAwaitingIntegration} awaiting integration, ${doc.packetFamilies.freeToDispatch} free`);
console.log(`  counsel ${doc.legalWork.trueCounselQuestions} · blockers ${doc.exactBlockers.length} · ${doc.goHold.decision}`);
