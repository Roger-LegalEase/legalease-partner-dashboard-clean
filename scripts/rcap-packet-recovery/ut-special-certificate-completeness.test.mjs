import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  COMPONENTS,
  FAMILY_ID,
  resolveExactSources,
  specialCertificateStageGate
} from "../build-census-v1-ut_pet_special_certificate-set.mjs";
import { auditFamily } from "../rcap-packet-completeness/verify-packet-completeness.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT_REL = "data/rcap-all50/overlays/census-v1/ut/ut-pet-special-certificate-set--official-pdf-fill";
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

const exact = resolveExactSources();
assert.equal(exact.length, 9);
assert.equal(new Set(exact.map((row) => row.formNumber)).size, 9);
assert.ok(exact.every((row) => row.sha256Exact && /^[0-9a-f]{64}$/.test(row.sha256) && row.byteLength > 0));

// Build a disposable root from links to the held bytes, corrupt one linked copy,
// and prove the production resolver refuses an exact-source identity mismatch.
const mismatchRoot = path.join(ROOT, ".pf02-ut-special-source-mismatch-test");
fs.rmSync(mismatchRoot, { recursive: true, force: true });
try {
  for (const [, formNumber, rel] of COMPONENTS) {
    if (!formNumber || !rel) continue;
    const target = path.join(mismatchRoot, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.symlinkSync(path.join(ROOT, rel), target);
  }
  const corruptRel = COMPONENTS.find(([, formNumber]) => formNumber === "1001EX")[2];
  const corrupt = path.join(mismatchRoot, corruptRel);
  fs.unlinkSync(corrupt);
  fs.writeFileSync(corrupt, Buffer.from("deliberately not the pinned 1001EX bytes"));
  assert.throws(() => resolveExactSources(mismatchRoot), /source SHA-256 drift/);
} finally {
  fs.rmSync(mismatchRoot, { recursive: true, force: true });
}

const asOf = new Date("2026-09-11T00:00:00Z");
const hash = "a".repeat(64);
const valid = {
  type: "UT_BCI_SPECIAL_CERTIFICATE", familyId: FAMILY_ID,
  documentSha256: hash, episodeId: "episode-1",
  issuedAt: "2026-08-01T00:00:00Z", expiresAt: "2027-01-28T00:00:00Z"
};
assert.equal(specialCertificateStageGate({ certificate: { ...valid, type: "UT_BCI_CERTIFICATE" }, episodeId: "episode-1", expectedDocumentSha256: hash, asOf }).reason, "WRONG_CERTIFICATE_TYPE");
assert.equal(specialCertificateStageGate({ certificate: { ...valid, episodeId: undefined }, episodeId: "episode-1", expectedDocumentSha256: hash, asOf }).reason, "CERTIFICATE_EPISODE_REQUIRED");
assert.equal(specialCertificateStageGate({ certificate: valid, episodeId: "episode-2", expectedDocumentSha256: hash, asOf }).reason, "WRONG_CERTIFICATE_EPISODE");
assert.equal(specialCertificateStageGate({ certificate: valid, episodeId: "episode-1", expectedDocumentSha256: "b".repeat(64), asOf }).reason, "CERTIFICATE_IDENTITY_MISMATCH");
assert.equal(specialCertificateStageGate({ certificate: { ...valid, expiresAt: "2026-09-10T00:00:00Z" }, episodeId: "episode-1", expectedDocumentSha256: hash, asOf }).reason, "SPECIAL_CERTIFICATE_EXPIRED");
assert.equal(specialCertificateStageGate({ certificate: { ...valid, expiresAt: "2027-03-01T00:00:00Z" }, episodeId: "episode-1", expectedDocumentSha256: hash, asOf }).reason, "SPECIAL_CERTIFICATE_VALIDITY_EXCEEDS_180_DAYS");
assert.equal(specialCertificateStageGate({ certificate: valid, episodeId: "episode-1", expectedDocumentSha256: hash, asOf }).status, "ALLOW_STAGE_2");

const census = read(`${OUT_REL}/field-census.census-v1.json`);
const map = read(`${OUT_REL}/production-field-map.json`);
const receipt = read(`${OUT_REL}/source-receipt.json`);
const rendered = read(`${OUT_REL}/reports/rendered-artifacts.json`);
const writes = read(`${OUT_REL}/reports/actual-writes.json`);
const roles = read(`${OUT_REL}/reports/conditional-role-review.json`);
const instructions = fs.readFileSync(path.join(ROOT, OUT_REL, "participant-instructions.md"), "utf8");

assert.equal(census.documents.length, 9);
assert.equal(receipt.documents.length, 9);
assert.equal(receipt.component10.officialPdf, null);
assert.equal(receipt.component10.fakeHash, false);
for (const document of census.documents) {
  const source = exact.find((row) => row.formNumber === document.formNumber);
  const formMap = map.maps.find((row) => row.formNumber === document.formNumber);
  assert.ok(source && formMap);
  assert.equal(document.sourceSha256, source.sha256);
  assert.equal(document.fields.length, document.fieldCount);
  assert.equal(document.selectionControls.length, document.selectionControlCount);
  const disposed = new Set([
    ...formMap.canonicalWrites.map((row) => row.fieldId),
    ...formMap.boundaryWrites.map((row) => row.fieldId),
    ...formMap.roleRefusals.map((row) => row.blankId)
  ]);
  assert.ok(document.fields.filter((row) => row.blankId).every((row) => disposed.has(row.blankId)), `${document.formNumber}: an observed blank is not disposed`);
  assert.equal(formMap.selectionControls.length, document.selectionControlCount);
}

const conditions = Object.fromEntries(map.maps.filter((row) => row.componentCondition)
  .map((row) => [row.formNumber, row.componentCondition.factId]));
assert.deepEqual(conditions, {
  "UT-BCI-THIRD-PARTY-RELEASE": "matter.third_party_recipient_requested",
  "1149XX": "matter.victim_exists_and_prosecutor_requests_statement",
  "1169XX": "matter.reply_elected_after_statement_received"
});
for (const formNumber of ["1146XX", "1148XX", "1149XX"]) {
  const formMap = map.maps.find((row) => row.formNumber === formNumber);
  assert.ok(formMap.roleRefusals.every((row) => row.actorOwner && row.actorOwner !== "participant"));
  assert.ok(formMap.roleRefusals.every((row) => /court, clerk, prosecutor, agency, or hearing field|signature or date field|viewer UI control/.test(row.why)));
}
assert.equal(roles.protectedWrites, 0);
assert.equal(rendered.conditionalRasterContract.omittedSelectableVariants.length, 0);

assert.equal(writes.artifacts.length, 2);
for (const artifact of writes.artifacts) {
  assert.equal(artifact.valuesReportedByFinalizer, artifact.fixture === "canonical" ? 42 : 59);
  assert.ok(artifact.addedGlyphsReadFromOutputBytes > 0);
  assert.equal(artifact.nonWhitespaceGlyphsOutsideMeasuredWriteBoxes, 0);
  assert.deepEqual(artifact.refusedFieldsWithInk, []);
  assert.ok(artifact.actualWrites.filter((row) => row.kind === "selection")
    .every((row) => !row.factId.startsWith("route.")), `${artifact.fixture}: selection inferred from route`);
}
const boundaryMail = writes.artifacts.find((row) => row.fixture === "boundary").actualWrites
  .find((row) => row.factId === "participant.mailing_address");
assert.ok(boundaryMail.textReadFromOutputBytes.length > 100, "boundary fixture does not exercise overlong fitting");
assert.ok(boundaryMail.glyphCountReadFromOutputBytes > 100, "overlong value was not read back from the output bytes");
const boundaryWrites = writes.artifacts.find((row) => row.fixture === "boundary").actualWrites;
assert.equal(boundaryWrites.filter((row) => row.formNumber === "UT-BCI-THIRD-PARTY-RELEASE" && row.kind === "text").length, 6);
assert.equal(boundaryWrites.filter((row) => row.formNumber === "1169XX" && row.kind === "text").length, 10);
assert.ok(boundaryWrites.some((row) => row.formNumber === "UT-BCI-EXP-APPLICATION"
  && row.factId === "matter.bci_fee_waiver_requested" && row.kind === "selection"));
assert.ok(boundaryWrites.some((row) => row.formNumber === "1169XX"
  && row.factId === "participant.self_represented" && row.kind === "selection"));
assert.ok(map.maps.flatMap((row) => row.selectionControls)
  .every((row) => Array.isArray(row.selectedInFixtures)), "a conditional control omits its fixture selection record");

for (const required of ["180 days", "60 days", "35-day", "14 days", "28 days", "$65", "$150", "$135", "fee waiver", "confirm current BCI amounts", "no approval date", "not a tenth PDF"]) {
  assert.ok(instructions.includes(required), `guidance omits ${required}`);
}

const audit = auditFamily(OUT_REL, FAMILY_ID);
assert.equal(audit.result, "PASS_COMPLETE");
assert.ok(Object.values(audit.counters).every((count) => count === 0));
console.log("UT special-certificate completeness tests passed: 9 exact sources, 10 components, 459 measured terminals, 2 byte-read fixtures, PASS_COMPLETE");
