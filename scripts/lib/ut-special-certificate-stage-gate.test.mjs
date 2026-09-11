import assert from "node:assert/strict";
import {
  specialCertificateStageGate,
  SPECIAL_CERTIFICATE_FIXTURE_STAGE_INPUT,
  FAMILY_ID
} from "../build-census-v1-ut_pet_special_certificate-set.mjs";

const valid = structuredClone(SPECIAL_CERTIFICATE_FIXTURE_STAGE_INPUT);
assert.equal(specialCertificateStageGate(valid).status, "ALLOW_STAGE_2");
assert.equal(specialCertificateStageGate({ asOf: valid.asOf }).reason, "SPECIAL_CERTIFICATE_REQUIRED");

for (const [mutate, reason] of [
  [(input) => { input.certificate.type = "UT_BCI_CERTIFICATE"; }, "WRONG_CERTIFICATE_TYPE"],
  [(input) => { input.certificate.familyId = "other"; }, "WRONG_CERTIFICATE_FAMILY"],
  [(input) => { delete input.episodeId; delete input.certificate.episodeId; }, "CERTIFICATE_EPISODE_REQUIRED"],
  [(input) => { input.episodeId = "   "; input.certificate.episodeId = "   "; }, "CERTIFICATE_EPISODE_REQUIRED"],
  [(input) => { input.certificate.episodeId = "different"; }, "WRONG_CERTIFICATE_EPISODE"],
  [(input) => { delete input.expectedDocumentSha256; }, "EXPECTED_CERTIFICATE_IDENTITY_REQUIRED"],
  [(input) => { input.expectedDocumentSha256 = "f".repeat(64); }, "CERTIFICATE_IDENTITY_MISMATCH"],
  [(input) => { input.certificate.documentSha256 = "invalid"; }, "CERTIFICATE_IDENTITY_PROOF_REQUIRED"],
  [(input) => { input.certificate.expiresAt = "2026-09-11T00:00:00.000Z"; }, "SPECIAL_CERTIFICATE_EXPIRED"],
  [(input) => { input.certificate.expiresAt = "2027-03-01T00:00:00.000Z"; }, "SPECIAL_CERTIFICATE_VALIDITY_EXCEEDS_180_DAYS"]
]) {
  const input = structuredClone(valid);
  mutate(input);
  assert.equal(specialCertificateStageGate(input).reason, reason);
}

assert.equal(valid.certificate.familyId, FAMILY_ID);
console.log("UT special-certificate stage-gate tests passed");
