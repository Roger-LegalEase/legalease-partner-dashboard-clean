#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const sha256 = (p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
const reclassification = read("data/rcap-grade-a/legal-decisions/LEGAL_HOLD_RECLASSIFICATION_2026-09-04.json");
const indiana = reclassification.families.find((row) => row.familyId === "in_infraction_nondisclosure-set");
const california = reclassification.families.find((row) => row.familyId === "ca-prop64-set");
const colorado = reclassification.families.find((row) => row.familyId === "co_decriminalized_conduct_seal-set");

assert.deepEqual(
  reclassification.families.map((row) => row.familyId).sort(),
  ["ca-prop64-set", "co_decriminalized_conduct_seal-set", "in_infraction_nondisclosure-set"]
);
assert.equal(reclassification.commercialRoutesOpened, 0);
assert.equal(reclassification.productionTouched, false);

assert.equal(indiana.disposition, "POST_REPAIR_REREAD_REQUIRED");
assert.equal(indiana.nextState, "VERIFY_PENDING");
assert.equal(indiana.priorIndependentVerdict.bindsCurrentBytes, false);
assert.deepEqual(
  [
    sha256("data/rcap-all50/overlays/census-v1/in/in-infraction-nondisclosure-set--custom-pleading/fixtures/canonical.pdf"),
    sha256("data/rcap-all50/overlays/census-v1/in/in-infraction-nondisclosure-set--custom-pleading/fixtures/boundary.pdf")
  ],
  [indiana.repairEvidence.canonical.sha256, indiana.repairEvidence.boundary.sha256]
);

const vf02 = read(california.historicalVerdictPreserved.evidencePath).rows.find((row) =>
  row.itemId === california.familyId
  && row.verdict === california.historicalVerdictPreserved.verdict
  && row.verifiedAtBase === california.historicalVerdictPreserved.verifiedAtBase
);
const vf12 = read(california.selectedVerdict.evidencePath).rows.find((row) =>
  row.itemId === california.familyId
  && row.verdict === california.selectedVerdict.verdict
  && row.verifiedAtBase === california.selectedVerdict.verifiedAtBase
);
assert.ok(vf02, "the historical VF02 source refusal must remain in its owned return");
assert.ok(vf12, "the selected substantive VF12 verdict must exist at the exact declared base");
assert.equal(california.disposition, "SELECT_SUBSTANTIVE_VERDICT");
assert.equal(california.nextState, "VERIFY_PENDING");
assert.equal(california.currentByteBinding.bindsSelectedVerdict, false);
assert.notDeepEqual(
  california.currentByteBinding.selectedBasePrimaryHashes,
  california.currentByteBinding.currentPrimaryHashes
);

assert.equal(colorado.disposition, "OWNER_CONFIRMED_ROUTE_MAPPING_COMPLETE");
assert.equal(colorado.nextState, "SOURCE_READY");
assert.equal(colorado.mappingEvidence.trackId, "co_decriminalized_conduct_seal");
assert.equal(colorado.mappingEvidence.primaryFormId, "JDF-2371");
assert.equal(colorado.mappingEvidence.status, "MAPPED");
assert.equal(colorado.legacyBlocksReclassified.length, 2);
assert.ok(colorado.legacyBlocksReclassified.every((row) => row.executionTreatment.includes("hard-stop")));
assert.equal(colorado.laneReturnQuestionsDisposed.length, 2);
assert.ok(colorado.laneReturnQuestionsDisposed.some((row) => row.laneQuestion.startsWith("JDF-2371:")));
assert.ok(colorado.laneReturnQuestionsDisposed.some((row) => row.laneQuestion.startsWith("JDF-2374:")));
assert.ok(colorado.laneReturnQuestionsDisposed.find((row) => row.laneQuestion.startsWith("JDF-2374:")).disposition.includes("remains protected and blank"));
assert.ok(colorado.preservedReleaseLimits.some((limit) => limit.includes("commercial-permission")));
assert.ok(colorado.preservedReleaseLimits.some((limit) => limit.includes("No checkout")));

const currentPrimaryPaths = [
  "fixtures/hs-11361-8-completed-sentence-application-canonical/cr-400-filled.pdf",
  "fixtures/hs-11361-8-completed-sentence-application-boundary/cr-400-filled.pdf",
  "fixtures/hs-11361-8-currently-serving-petition-canonical/cr-400-filled.pdf",
  "fixtures/hs-11361-8-currently-serving-petition-boundary/cr-400-filled.pdf"
].map((suffix) => `data/rcap-all50/overlays/census-v1/ca/ca-prop64-set--official-pdf-fill/${suffix}`);
assert.deepEqual(
  currentPrimaryPaths.map(sha256),
  california.currentByteBinding.currentPrimaryHashes
);

console.log("LEGAL_PURGE_WORKER_2_EVIDENCE_OK: 2 exact reread records plus 1 owner-confirmed fail-closed Colorado mapping; 0 PASS promotions");
