import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import assert from "node:assert/strict";

const FAMILY = "rcap-sc-custom-pleading";
const ADMISSION = "data/rcap-grade-a/legal-decisions/SC_SOLICITOR_GUIDANCE_ADMISSION_2026-09-14.json";

// Additive admission of the owner's branch B. The prior shared treatment and
// refusal records remain byte-for-byte unchanged. A candidate alone grants nothing.
export function loadScReviewedGuidance(root, refusals) {
  const file = path.join(root, ADMISSION);
  if (!fs.existsSync(file)) return null;
  const admission = JSON.parse(fs.readFileSync(file, "utf8"));
  const bound = (ref) => {
    assert.ok(ref && typeof ref.path === "string" && !path.isAbsolute(ref.path)
      && !ref.path.split("/").includes(".."), "SC: invalid evidence path");
    const bytes = fs.readFileSync(path.join(root, ref.path));
    assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"), ref.sha256, `SC: stale ${ref.path}`);
    assert.equal(bytes.length, ref.byteLength, `SC: byte length ${ref.path}`);
    return bytes;
  };
  const readBound = (ref) => JSON.parse(bound(ref));
  assert.equal(admission.schemaVersion, "rcap-sc-guidance-admission/v1");
  assert.equal(admission.familyId, FAMILY);
  assert.equal(admission.commercialRoutesOpened, 0);
  const review = readBound(admission.independentReview);
  assert.equal(review.familyId, FAMILY);
  assert.equal(review.verdict, "PASS_COMPLETE_INDEPENDENT");
  assert.equal(review.acceptedTreatment, "GUIDANCE_READY");
  assert.equal(review.acceptanceGranted, true);
  assert.ok(review.reviewerSession && review.authorSession && review.reviewerSession !== review.authorSession);
  assert.deepEqual(review.failures, []);
  assert.equal(review.candidateBindings.length, 7);
  review.candidateBindings.forEach(bound);
  const candidateRef = review.candidateBindings.find(r => r.path.endsWith("/SC_GUIDANCE_TERMINAL_TREATMENT_CANDIDATE.json"));
  const candidate = readBound(candidateRef);
  assert.equal(candidate.families.length, 1);
  const treatment = candidate.families[0];
  assert.equal(treatment.familyId, FAMILY);
  assert.equal(treatment.terminalTreatment, "GUIDANCE_READY");
  assert.equal(treatment.runtimeExpression.paymentAuthority, "closed");
  const owner = refusals.get(FAMILY);
  assert.ok(owner?.refused && owner.decisionId === "OWN-DT-2026-09-02-SC-223A1");
  const { quotedFrom, ...quotedOwner } = treatment.ownerDecision;
  bound(quotedFrom);
  assert.deepEqual(quotedOwner, owner);
  assert.match(owner.theSplitTreatmentOrdered.B, /GUIDANCE_READY/);
  const measured = readBound(admission.measurements);
  assert.equal(measured.familyId, FAMILY);
  assert.equal(measured.allMeasuredChecksPass, true);
  assert.equal(measured.bindings.length, 27);
  measured.bindings.forEach(bound);
  assert.equal(admission.installedGuidance.path,
    "data/rcap-all50/terminalization-treatments/sc_solicitor_guidance_20260914.json");
  const installed = readBound(admission.installedGuidance);
  const guideRef = review.candidateBindings.find(r => r.path.endsWith("/guidance.json"));
  assert.equal(admission.installedGuidance.sha256, guideRef.sha256);
  const tracks = treatment.routes.map(r => r.trackId).sort();
  assert.equal(new Set(tracks).size, 10);
  assert.deepEqual(installed.treatments.map(r => r.trackId).sort(), tracks);
  // Match the existing registry's sorted-file, last-entry selection. An exact
  // archived guide is insufficient if the runtime selects another treatment.
  const selected = new Map();
  const directory = path.join(root, "data/rcap-all50/terminalization-treatments");
  for (const name of fs.readdirSync(directory).sort()) {
    if (!name.endsWith(".json") || name.startsWith("_")) continue;
    let record;
    try { record = JSON.parse(fs.readFileSync(path.join(directory, name), "utf8")); }
    catch { continue; }
    for (const row of record.treatments ?? []) if (row.trackId) selected.set(row.trackId, row);
  }
  for (const row of installed.treatments) assert.deepEqual(selected.get(row.trackId), row);
  assert.ok(treatment.destination.perRoute.every(r => r.quote.kind === "prosecutor"));
  const runtime = readBound(admission.runtimeBindingEvidence);
  assert.equal(runtime.familyId, FAMILY);
  assert.equal(runtime.status, "PASS");
  assert.deepEqual(runtime.consumerBindings.map(r => r.path).sort(), [
    "src/lib/rcap/documents/guidance-packet-registry.ts",
    "src/lib/rcap/documents/packet-route-resolver.ts",
    "src/lib/rcap/render/job-contract.ts",
    "src/lib/expungement-ai/payment-adapter.ts"
  ].sort());
  runtime.consumerBindings.forEach(bound);
  assert.deepEqual(runtime.rows.map(r => r.trackId).sort(), tracks);
  assert.ok(runtime.rows.every(r => r.savedGuidanceExact && r.bothLocaleBundlesExact
    && r.renderSpecRefused && r.paymentPlaceholderDisabled && r.checkoutRefused
    && r.route.sellable === false && r.route.creditConsumable === false && r.route.rendererKind === "none"));
  return { ...treatment, independentVerification: { ...review.independentVerification,
    evidence: admission.independentReview, runtimeBinding: admission.runtimeBindingEvidence },
    routes: treatment.routes.map(r => ({ ...r, registeredTreatment: {
      ...admission.installedGuidance, trackId: r.trackId }, boundBy: admission.runtimeBindingEvidence,
      bindingState: "exact_native_guidance_binding_verified" })) };
}
