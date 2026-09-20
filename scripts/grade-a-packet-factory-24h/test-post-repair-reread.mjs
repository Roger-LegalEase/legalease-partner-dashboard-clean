#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  repairRowDischargesFailure,
  repairRowsJointlyDischargeFailure,
  artifactsOnlyBookkeepingRepairsFailure,
  canRereadAfterRepair,
  repairSupersedesFailedVerdict
} from "./post-repair-reread.mjs";

const valid = {
  state: "VERIFY_PENDING",
  completedRepairMatchesFailure: true,
  repairEvidenceChangedAfterVerdict: true,
  artifactsChangedAfterVerdict: true,
  allNineCountersZero: true,
  releasedRepairGrantExists: true,
  liveRepairGrantExists: false,
  liveVerificationGrantExists: true,
  verificationDispatchExists: true
};

assert.equal(canRereadAfterRepair(valid), true, "a fully evidenced reread must remain executable");
for (const key of Object.keys(valid)) {
  const broken = { ...valid };
  broken[key] = key === "state" ? "FAIL_REPAIR_REQUIRED" : !valid[key];
  assert.equal(canRereadAfterRepair(broken), false, `${key} must be required`);
}

const canonical = "2a7e3fa6eb3b583fdbddc5a365b6c2678e7a37ad0f8ebdd6b78a230eb39d98ad";
const boundary = "d1ddb77c651df332ffa5c1fcb1593d1d1b7dfa913c39b42484b31830347389b7";
const exactPin = (artifact, sha256) => ({
  artifact,
  declaredSha256: sha256,
  recomputedSha256: sha256
});
const artifactsOnly = {
  ...valid,
  artifactsChangedAfterVerdict: false,
  failedObligationNames: ["ARTIFACTS"],
  artifactBookkeeping: {
    changedAfterVerdict: true,
    completedRepairNamesExactlyArtifacts: true,
    completedRepairHasExactlyNineZeroCounters: true,
    currentCompletenessHasExactlyNineZeroCounters: true,
    currentArtifactHashes: { canonical, boundary },
    productWiring: {
      present: true,
      familyMatches: true,
      proposalPins: [exactPin("canonical", canonical)],
      acceptanceReceipt: {
        verdict: "RASTER_PASS",
        workflowRunId: "33596784162",
        coversTheWholeFamily: true,
        pins: [exactPin("canonical", canonical)]
      }
    },
    rasterReceipt: {
      currentRasterState: "RASTER_PASS",
      verdict: "RASTER_PASS",
      workflowRunId: "33596784162",
      coverageComplete: true,
      coversTheWholeFamily: true,
      pins: [exactPin("canonical", canonical), exactPin("boundary", boundary)]
    }
  }
};

assert.equal(artifactsOnlyBookkeepingRepairsFailure(artifactsOnly), true,
  "exact current wiring and whole-family raster pins answer an ARTIFACTS-only failure");
assert.equal(repairSupersedesFailedVerdict(artifactsOnly), true,
  "ARTIFACTS-only bookkeeping may supersede without packet-byte movement");
assert.equal(canRereadAfterRepair(artifactsOnly), true,
  "the no-byte-movement repair becomes executable only with the verifier grant and dispatch");

const replaceBookkeeping = (change) => ({
  ...artifactsOnly,
  artifactBookkeeping: { ...artifactsOnly.artifactBookkeeping, ...change }
});
const replaceWiring = (change) => replaceBookkeeping({
  productWiring: { ...artifactsOnly.artifactBookkeeping.productWiring, ...change }
});
const replaceAcceptance = (change) => replaceWiring({
  acceptanceReceipt: {
    ...artifactsOnly.artifactBookkeeping.productWiring.acceptanceReceipt,
    ...change
  }
});
const replaceRaster = (change) => replaceBookkeeping({
  rasterReceipt: { ...artifactsOnly.artifactBookkeeping.rasterReceipt, ...change }
});

const negativeBookkeepingCases = [
  ["absent bookkeeping", { ...artifactsOnly, artifactBookkeeping: null }],
  ["mixed obligations", { ...artifactsOnly, failedObligationNames: ["ARTIFACTS", "SERVICE"] }],
  ["pre-verdict bookkeeping", replaceBookkeeping({ changedAfterVerdict: false })],
  ["repair row names another obligation", replaceBookkeeping({ completedRepairNamesExactlyArtifacts: false })],
  ["incomplete repair counters", replaceBookkeeping({ completedRepairHasExactlyNineZeroCounters: false })],
  ["incomplete current counters", replaceBookkeeping({ currentCompletenessHasExactlyNineZeroCounters: false })],
  ["mismatched proposal pin", replaceWiring({
    proposalPins: [{
      artifact: "canonical",
      declaredSha256: "9f00da8f072069098dce0b465bbc242d5713730f5472a6f9d6a104699bd1428a",
      recomputedSha256: canonical
    }]
  })],
  ["stale acceptance", replaceAcceptance({ verdict: "RASTER_FAIL" })],
  ["mismatched acceptance pin", replaceAcceptance({
    pins: [exactPin("canonical", "9f00da8f072069098dce0b465bbc242d5713730f5472a6f9d6a104699bd1428a")]
  })],
  ["mismatched raster boundary", replaceRaster({
    pins: [exactPin("canonical", canonical), exactPin("boundary", "f".repeat(64))]
  })],
  ["partial raster coverage", replaceRaster({ coversTheWholeFamily: false })],
  ["different raster run", replaceRaster({ workflowRunId: "older-run" })],
  ["missing acceptance workflow run", replaceAcceptance({ workflowRunId: null })],
  ["missing raster workflow run", replaceRaster({ workflowRunId: null })],
  ["matching null local workflow runs", replaceBookkeeping({
    productWiring: {
      ...artifactsOnly.artifactBookkeeping.productWiring,
      acceptanceReceipt: {
        ...artifactsOnly.artifactBookkeeping.productWiring.acceptanceReceipt,
        workflowRunId: null
      }
    },
    rasterReceipt: { ...artifactsOnly.artifactBookkeeping.rasterReceipt, workflowRunId: null }
  })],
  ["pre-verdict repair evidence", { ...artifactsOnly, repairEvidenceChangedAfterVerdict: false }],
  ["unreleased repair grant", { ...artifactsOnly, releasedRepairGrantExists: false }],
  ["live repair grant", { ...artifactsOnly, liveRepairGrantExists: true }],
  ["absent independent claim", { ...artifactsOnly, liveVerificationGrantExists: false }],
  ["absent independent dispatch", { ...artifactsOnly, verificationDispatchExists: false }]
];
for (const [name, broken] of negativeBookkeepingCases) {
  assert.equal(canRereadAfterRepair(broken), false, `${name} must not transition`);
}

for (const substantiveObligation of [
  "SOURCE_IDENTITY",
  "LEGAL_INPUT",
  "CONTENT",
  "FEE_AND_WAIVER",
  "SERVICE",
  "FILING_DESTINATION",
  "SELF_HELP_STOP",
  "COMPONENT_SET",
  "CLIPPING_AND_OVERLAP",
  "KNOWN_PREFILLS"
]) {
  assert.equal(canRereadAfterRepair({
    ...artifactsOnly,
    failedObligationNames: [substantiveObligation]
  }), false, `${substantiveObligation} must retain the packet-byte-movement requirement`);
}

/* A row that names what it did NOT repair must not be read as having repaired it. */
const threeFailed = ["KNOWN_PREFILLS", "REQUIRED_BEFORE_FILING", "SELF_HELP_STOP"];
const fix24Shaped = {
  itemId: "rcap-tx-custom-pleading", status: "COMPLETED", laneKind: "repair", repairedByThisLane: true,
  obligationRepaired: ["SOURCE_CARRIED_VALUE_ON_A_SWORN_DOCUMENT"],
  theThreeNamedObligations: "VF10 failed KNOWN_PREFILLS, REQUIRED_BEFORE_FILING and SELF_HELP_STOP; this repair closes a defect none of them named.",
  obligationsThisRowDoesNotDischarge: ["KNOWN_PREFILLS", "SELF_HELP_STOP"],
  countersAfter: { knownRequiredFieldsMissing: 0, requiredFactsNotCollected: 0, unclassifiedBlanks: 0, incompleteRows: 0, requiredOptionsMissing: 0, requiredComponentsMissing: 0, invisibleWrites: 0, protectedWrites: 0, visualDefects: 0 }
};
assert.equal(repairRowDischargesFailure(fix24Shaped, threeFailed), false,
  "a row whose prose names every failed obligation but whose repaired list does not must not supersede the FAIL");
assert.equal(repairRowDischargesFailure({ ...fix24Shaped, obligationsThisRowDoesNotDischarge: undefined }, threeFailed), false,
  "the structured repaired list decides even without an explicit not-discharged list");
assert.equal(repairRowDischargesFailure({ ...fix24Shaped, obligationRepaired: threeFailed, obligationsThisRowDoesNotDischarge: undefined }, threeFailed), true,
  "a row whose repaired list covers every failed obligation supersedes");
assert.equal(repairRowDischargesFailure({ ...fix24Shaped, obligationsRepaired: threeFailed, obligationRepaired: undefined, obligationsThisRowDoesNotDischarge: undefined }, threeFailed), true,
  "obligationsRepaired (plural) is honoured the same way");
assert.equal(repairRowDischargesFailure({ ...fix24Shaped, obligationsRepaired: threeFailed, obligationRepaired: undefined }, threeFailed), false,
  "a not-discharged list naming a failed obligation wins over a repaired list that also names it");
assert.equal(repairRowDischargesFailure({ ...fix24Shaped, obligationRepaired: "KNOWN_PREFILLS", obligationsThisRowDoesNotDischarge: undefined }, ["KNOWN_PREFILLS"]), true,
  "the older singular string form is honoured");
const legacyRow = { itemId: "x", status: "COMPLETED", repairedByThisLane: true, whatChanged: "Repaired KNOWN_PREFILLS, REQUIRED_BEFORE_FILING and SELF_HELP_STOP on both fixtures", countersAfter: fix24Shaped.countersAfter };
assert.equal(repairRowDischargesFailure(legacyRow, threeFailed), true,
  "a row with no structured repaired list still falls back to text inclusion, as every earlier return relied on");
assert.equal(repairRowDischargesFailure(legacyRow, [...threeFailed, "PAGE_ORDER"]), false,
  "text inclusion still requires every failed name");
assert.equal(repairRowDischargesFailure(legacyRow, []), false, "no failed names means nothing to discharge");
const fix18Shaped = { ...legacyRow, obligationRepaired: "REQUIRED_BEFORE_FILING. participant-instructions.md said three times that the packet filled the caption on the Appearance only; Form ACR and the pages stamped NOT FOR PUBLIC RECORD are named. assertRepairInvariants() re-runs after every build." };
assert.equal(repairRowDischargesFailure(fix18Shaped, ["REQUIRED_BEFORE_FILING"]), true,
  "a singular prose field that opens with the obligation name states a repair of it");
assert.equal(repairRowDischargesFailure(fix18Shaped, ["REQUIRED_BEFORE_FILING", "SELF_HELP_STOP"]), false,
  "prose in the repaired field does not discharge an obligation it never names, even if the rest of the row does");
assert.equal(repairRowDischargesFailure({ ...fix18Shaped, whatChanged: "SELF_HELP_STOP remains open" }, ["REQUIRED_BEFORE_FILING", "SELF_HELP_STOP"]), false,
  "an obligation named only outside the repaired field is not repaired");

/* Two honest rows discharge one verdict jointly; a name nobody claims stays open. */
const fix29Shaped = { ...fix24Shaped, obligationRepaired: undefined, obligationsRepaired: ["KNOWN_PREFILLS", "REQUIRED_BEFORE_FILING"], obligationsThisRowDoesNotDischarge: ["SELF_HELP_STOP"] };
const bookkeepingShaped = { ...fix24Shaped, obligationRepaired: undefined, obligationsRepaired: ["SELF_HELP_STOP"], obligationsThisRowDoesNotDischarge: ["KNOWN_PREFILLS", "REQUIRED_BEFORE_FILING"] };
assert.equal(repairRowsJointlyDischargeFailure([fix29Shaped], threeFailed), false, "one row that disclaims a failed name does not discharge the verdict alone");
assert.equal(repairRowsJointlyDischargeFailure([fix29Shaped, bookkeepingShaped], threeFailed), true, "two rows whose claims together cover every failed name discharge it jointly");
assert.equal(repairRowsJointlyDischargeFailure([fix29Shaped, fix24Shaped], threeFailed), false, "a name no row claims (SELF_HELP_STOP) stays open");
assert.equal(repairRowsJointlyDischargeFailure([bookkeepingShaped, { ...fix29Shaped, obligationsThisRowDoesNotDischarge: ["REQUIRED_BEFORE_FILING"] }], threeFailed), false, "a row's own disclaimer withdraws only its own claim, so the disclaimed name must come from another row");
assert.equal(repairRowsJointlyDischargeFailure([], threeFailed), false, "no rows discharge nothing");

console.log("OK post-repair reread preserves byte movement, admits only exact ARTIFACTS bookkeeping evidence, reads what a repair row says it repaired, and lets honest rows discharge a verdict jointly");
