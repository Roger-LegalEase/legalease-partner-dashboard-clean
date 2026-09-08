import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { assessWashingtonReviewedGuidance, WA_GUIDANCE_REVIEW } from "./wa-reviewed-guidance.mjs";
import { WA_AUTOMATIC, WA_GUIDANCE_DIRECTORY, WA_GUIDANCE_ROUTES, WA_MOTION_ROUTE,
  loadTreatmentReconciliations, preserveTreatmentAcceptance } from "./treatment-reconciliation.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const manifestPath = `${WA_GUIDANCE_DIRECTORY}/guidance-manifest.json`;
const bytes = relative => fs.readFileSync(path.join(root, relative));
const digest = value => crypto.createHash("sha256").update(value).digest("hex");
const manifestBytes = bytes(manifestPath);
const manifest = JSON.parse(manifestBytes);
// This synthetic review exists only in this test's memory. It tests the binding
// adapter; it is never published and does not establish independent acceptance.
const syntheticReview = {
  schemaVersion: "rcap-terminal-treatment-independent-verification/v1",
  reviewer: "SYNTHETIC TEST ONLY", lane: "SYNTHETIC TEST ONLY",
  verifiedAtBase: "0".repeat(40), authoredByADifferentLaneThanTheTreatmentRecord: true,
  editsNothingItVerifies: true, createsNoApproval: true, opensNoRoute: true,
  families: [{ familyId: WA_AUTOMATIC, verdict: "TREATMENT_CORRECT", recordedTreatment: "GUIDANCE_READY",
    scope: "static_family_treatment", runtimeInstalled: false, participantMotionDischarged: false,
    routeKeys: WA_GUIDANCE_ROUTES, preservedSeparateObligationRouteKey: WA_MOTION_ROUTE,
    verdictScope: "Synthetic in-memory positive control for exact code, source, route and complete-output identity checks.",
    manifest: { path: manifestPath, sha256: digest(manifestBytes) }, reviewedInputs: manifest.inputs,
    reviewedOutputs: manifest.outputs, failedObligations: [], unmeasuredObligations: [] }]
};
function run(mutateReview = () => {}, alterBytes = null, alterHistorical = null) {
  const review = structuredClone(syntheticReview);
  mutateReview(review);
  return assessWashingtonReviewedGuidance(root, {
    readBytes: relative => relative === WA_GUIDANCE_REVIEW ? Buffer.from(JSON.stringify(review))
      : alterBytes?.(relative) ?? bytes(relative),
    readHistorical: (_commit, relative) => alterHistorical?.(relative) ?? bytes(relative)
  });
}
const good = run();
assert.equal(good.eligible, true, good.reason);
const controls = [
  () => run(review => { review.authoredByADifferentLaneThanTheTreatmentRecord = false; }),
  () => run(review => { review.families[0].reviewedOutputs.pop(); }),
  () => run(review => { review.families[0].routeKeys.pop(); }),
  () => run(review => { review.families[0].participantMotionDischarged = true; }),
  () => run(review => { review.families[0].runtimeInstalled = true; }),
  () => run(review => { review.families[0].unmeasuredObligations = ["destination"]; }),
  () => run(() => {}, relative => relative === manifest.outputs[0].path ? Buffer.from("changed guide") : null),
  () => run(() => {}, relative => relative === manifest.inputs[0].path ? Buffer.from("changed generator") : null),
  () => run(() => {}, relative => relative.endsWith("wa-13-50-260.html.gz") ? Buffer.from("changed authority") : null),
  () => run(() => {}, null, relative => relative === manifestPath ? Buffer.from("unpublished manifest") : null)
];
for (const [index, control] of controls.entries()) assert.equal(control().eligible, false, `negative control ${index + 1}`);
const treatment = loadTreatmentReconciliations(root).get(WA_AUTOMATIC);
assert.equal(preserveTreatmentAcceptance("PRODUCT_PATH_PENDING", treatment, good), "GUIDANCE_READY");
for (const state of ["LEGAL_BLOCKED", "WRONG_DELIVERY_TYPE", "SOURCE_BLOCKED", "FAIL_REPAIR_REQUIRED"]) {
  assert.equal(preserveTreatmentAcceptance(state, treatment, good), state);
}
assert.equal(preserveTreatmentAcceptance("GUIDANCE_READY", treatment, { eligible: false }), "PRODUCT_PATH_PENDING");
console.log(`WA guidance admission adapter: synthetic positive and ${controls.length} causal refusals passed; actual independent review was neither authored nor inferred.`);
