#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  CT_CURRENT_GUIDANCE_CANDIDATE,
  CT_CURRENT_GUIDANCE_REVIEW,
  CT_GUIDANCE_FAMILIES,
  assessConnecticutReviewedGuidance,
  applyConnecticutGuidanceAcceptance,
  connecticutCurrentGuidanceCandidate
} from "./ct-reviewed-guidance.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => fs.readFileSync(path.join(root, relative));
const inventories = CT_GUIDANCE_FAMILIES.map((familyId) =>
  connecticutCurrentGuidanceCandidate(root, familyId));
assert.equal(inventories.length, 3);
assert(inventories.every((row) => row.reviewedOutputs.length === 3));
assert(inventories.every((row) => row.currentFailedFindings.length === 1
  && row.currentFailedFindings[0].obligation === "ARTIFACTS"));

// A current implementation candidate is evidence for review, never review.
for (const familyId of CT_GUIDANCE_FAMILIES) {
  const pending = assessConnecticutReviewedGuidance(root, familyId);
  assert.equal(pending.eligible, false);
  assert.match(pending.reason, /current-guidance-review\.json|ENOENT/);
}

const candidateBytes = read(CT_CURRENT_GUIDANCE_CANDIDATE);
const candidate = JSON.parse(candidateBytes);
const candidateSha256 = crypto.createHash("sha256").update(candidateBytes).digest("hex");
const review = {
  schemaVersion: "rcap-ct-current-guidance-independent-review/v1",
  reviewer: "SYNTHETIC TEST ONLY",
  lane: "SYNTHETIC TEST ONLY",
  verifiedAtBase: "a".repeat(40),
  authoredByADifferentLaneThanTheCandidate: true,
  editsNothingItVerifies: true,
  createsNoApproval: true,
  opensNoRoute: true,
  reviewedCandidate: {
    path: CT_CURRENT_GUIDANCE_CANDIDATE,
    sha256: candidateSha256,
    candidateVersion: candidate.candidateVersion
  },
  families: inventories.map((inventory) => ({
    familyId: inventory.familyId,
    verdict: "TREATMENT_CORRECT",
    recordedTreatment: "GUIDANCE_READY",
    scope: "current_static_family_treatment",
    verdictScope: "Synthetic static guidance acceptance only; the participant still performs the separate receiving-authority process.",
    runtimeInstalled: false,
    participantFilesGeneratedOutput: false,
    participantApplicationDischarged: false,
    commercialAuthority: false,
    routeKeys: inventory.routeKeys,
    reviewedInputs: inventory.reviewedInputs,
    reviewedOutputs: inventory.reviewedOutputs,
    sourceBindings: inventory.sourceBindings,
    failedObligations: [],
    unmeasuredObligations: [],
    closedCurrentFindings: inventory.currentFailedFindings.map((finding) => ({
      ...finding,
      result: "CLOSED_BY_INDEPENDENT_DELTA",
      finding: "Synthetic review confirms the direct participant copy removes the exact historical internal-artifact finding.",
      evidence: [inventory.reviewedOutputs[0]]
    }))
  }))
};
const makeReviewBytes = (mutate = () => {}) => {
  const value = structuredClone(review);
  mutate(value);
  return Buffer.from(JSON.stringify(value));
};
const assess = (familyId, reviewBytes, changedPath = null, headChangedPath = null) => assessConnecticutReviewedGuidance(root, familyId, {
  preferCurrentCandidate: true,
  reviewPublicationCommit: "a".repeat(40),
  currentIntegrationCommit: "b".repeat(40),
  readBytes: (relative) => relative === CT_CURRENT_GUIDANCE_REVIEW ? reviewBytes
    : relative === changedPath ? Buffer.from("changed") : read(relative),
  readHistorical: (commit, relative) => commit === "b".repeat(40) && relative === headChangedPath
    ? Buffer.from("changed at HEAD") : relative === CT_CURRENT_GUIDANCE_REVIEW ? reviewBytes : read(relative)
});

let accepted = 0;
for (const inventory of inventories) {
  const result = assess(inventory.familyId, makeReviewBytes());
  assert.equal(result.eligible, true, result.reason);
  assert.equal(applyConnecticutGuidanceAcceptance("FAIL_REPAIR_REQUIRED", result, {
    independentReturn: inventory.priorSelectedReturn,
    readiness: { ready: true },
    nineZero: true,
    legalBlocked: false,
    deliveryTypeRefusal: null
  }), "GUIDANCE_READY");
  accepted += 1;
}

const target = inventories[0];
const closure = { verdictSha256: "1".repeat(64), result: "CLOSED_BY_INDEPENDENT_DELTA",
  finding: "Synthetic exact current finding closure supported by the same immutable reviewed participant artifact.",
  evidence: [target.reviewedOutputs[0]] };
const rejected = [
  assess(target.familyId, makeReviewBytes((value) => { value.authoredByADifferentLaneThanTheCandidate = false; })),
  assess(target.familyId, makeReviewBytes((value) => { value.reviewedCandidate.sha256 = "0".repeat(64); })),
  assess(target.familyId, makeReviewBytes((value) => { value.families[0].reviewedOutputs.pop(); })),
  assess(target.familyId, makeReviewBytes((value) => { value.families[0].unmeasuredObligations = ["ARTIFACTS"]; })),
  assess(target.familyId, makeReviewBytes(), target.reviewedOutputs[0].path),
  assess(target.familyId, makeReviewBytes(), null, CT_CURRENT_GUIDANCE_REVIEW),
  assess(target.familyId, makeReviewBytes(), null, target.reviewedOutputs[0].path),
  assess(target.familyId, makeReviewBytes(value => { value.families[0].participantFilesGeneratedOutput = true; })),
  assess(target.familyId, makeReviewBytes(value => { delete value.families[0].verdictScope; })),
  assess(target.familyId, makeReviewBytes(value => { value.families[0].closedCurrentVerdicts = [{ ...closure, verdictSha256: "invalid" }]; })),
  assess(target.familyId, makeReviewBytes(value => { value.families[0].closedCurrentVerdicts = [{ ...closure, result: "NOT_CLOSED" }]; })),
  assess(target.familyId, makeReviewBytes(value => { value.families[0].closedCurrentVerdicts = [closure, closure]; })),
  assess(target.familyId, makeReviewBytes(value => { value.families[0].closedCurrentVerdicts = [{ ...closure, evidence: [] }]; })),
  assess(target.familyId, makeReviewBytes(value => { value.families[0].closedCurrentVerdicts = [{ ...closure,
    evidence: [{ ...target.reviewedOutputs[0], sha256: "0".repeat(64) }] }]; })),
  assess(target.familyId, makeReviewBytes(value => { value.families[0].closedSourceHolds = [{ ...closure, holdSha256: "invalid" }]; })),
  assess(target.familyId, makeReviewBytes(value => { value.families[0].closedSourceHolds = [{ ...closure, holdSha256: "2".repeat(64),
    evidence: [{ ...target.reviewedOutputs[0], sha256: "0".repeat(64) }] }]; }))
];
assert(rejected.every((row) => row.eligible === false));

console.log(JSON.stringify({
  status: "PASS",
  currentCandidatesValidated: inventories.length,
  syntheticIndependentAcceptances: accepted,
  rejectionControls: rejected.length,
  actualIndependentReviewCreated: false,
  actualTreatmentGranted: false
}));
