#!/usr/bin/env node
import assert from "node:assert/strict";
import {
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

console.log("OK post-repair reread preserves byte movement and admits only exact ARTIFACTS bookkeeping evidence");
