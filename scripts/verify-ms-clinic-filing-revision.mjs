#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";
import { register } from "node:module";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(ROOT, relative), "utf8"));
const ROUTE = "MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";
const specification = readJson(
  "data/record-clearing/packet-specifications/MS-nonconviction-expungement-99-19-71-4.v1.json"
);
const fixture = readJson("data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.fixture.json");
const boundaryFixture = readJson("data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.boundary.fixture.json");

assert.equal(specification.routeKey, ROUTE);
assert.equal(specification.specificationVersion, "2.0.0");
assert.deepEqual(
  specification.documents.map(({ role }) => role),
  [
    "cover_and_contents",
    "primary_filing",
    "proposed_order",
    "certificate_of_service_and_attachment_checklist",
    "filing_and_next_steps"
  ]
);

const required = new Set(specification.requiredFacts.map(({ factId }) => factId));
for (const id of [
  "case_caption_plaintiff_name",
  "case_caption_defendant_name",
  "name_used_at_arrest",
  "aliases",
  "actual_arrest",
  "arrest_date",
  "arrest_location",
  "arresting_agency",
  "agency_case_number",
  "release_confirmed",
  "release_date_or_record_source",
  "charge",
  "charge_legal_citation",
  "charge_classification",
  "date_of_birth",
  "social_security_number",
  "social_security_number_last_four",
  "race",
  "sex",
  "mcic_identifier_delivery_method",
  "mcic_identifier_method_confirmation_source",
  "personal_impact_confirmed",
  "personal_impact_statement",
  "service_address_confirmation_status",
  "certified_disposition_exhibit_status",
  "docket_sheet_exhibit_status"
]) assert.ok(required.has(id), `missing revised Mississippi packet fact ${id}`);

for (const removed of [
  "arrest_or_citation_date",
  "arresting_or_citing_agency",
  "agency_case_or_citation_number",
  "indictment_record"
]) assert.equal(required.has(removed), false, `obsolete fact remains in the filing specification: ${removed}`);

const documentById = new Map(specification.documents.map((document) => [document.documentId, document]));
const petitionSpecification = documentById.get("ms-petition-for-expungement");
const orderSpecification = documentById.get("ms-proposed-order");
const serviceSpecification = documentById.get("ms-service-and-attachments");
assert.equal(petitionSpecification?.presentation, "pleading");
assert.equal(orderSpecification?.presentation, "pleading");
assert.equal(serviceSpecification?.presentation, "pleading");
for (const kind of [
  "pleading_caption",
  "pleading_paragraph",
  "pleading_numbered_assertions",
  "pleading_identity_list",
  "pro_se_signature_block",
  "verification_on_oath"
]) assert.ok(petitionSpecification.sections.some((section) => section.kind === kind), `petition lacks ${kind}`);
for (const kind of [
  "pleading_caption",
  "pleading_paragraph",
  "pleading_numbered_assertions",
  "pleading_identity_list",
  "court_signature_block",
  "prosecutor_signature_block",
  "clerk_certification_block",
  "confidential_identifier_addendum"
]) assert.ok(orderSpecification.sections.some((section) => section.kind === kind), `order lacks ${kind}`);
assert.ok(serviceSpecification.sections.some((section) => section.kind === "service_certificate"));

const specificationText = JSON.stringify(specification);
for (const prohibited of [
  /fingerprint records are not expunged/i,
  /fingerprint records are excepted/i,
  /no notarization is required/i,
  /verified record facts/i,
  /no indictment was returned/i,
  /confirmed service address/i
]) assert.doesNotMatch(specificationText, prohibited);

const { composeGradeAPacket, GradeAPacketCompositionError } = await import(
  "../src/lib/rcap/grade-a/composer.ts"
);
const { renderGradeAPacketPdf, GRADE_A_RENDERER_VERSION } = await import(
  "../src/lib/rcap/grade-a/renderer.ts"
);

assert.equal(fixture.generationPurpose, "internal_review");
assert.equal(boundaryFixture.generationPurpose, "internal_review");
const packet = composeGradeAPacket(specification, fixture);
const boundaryPacket = composeGradeAPacket(specification, boundaryFixture);
assert.equal(packet.documents.length, 5);
assert.equal(GRADE_A_RENDERER_VERSION, "2.0.0");

const petition = packet.documents.find(({ documentId }) => documentId === "ms-petition-for-expungement");
const order = packet.documents.find(({ documentId }) => documentId === "ms-proposed-order");
const service = packet.documents.find(({ documentId }) => documentId === "ms-service-and-attachments");
assert.equal(petition?.presentation, "pleading");
assert.equal(order?.presentation, "pleading");
assert.equal(service?.presentation, "pleading");

const packetText = JSON.stringify(packet);
for (const requiredPhrase of [
  "COMES NOW",
  "appearing pro se",
  "was arrested",
  "was thereafter released",
  "Exhibit A",
  "Exhibit B",
  "WHEREFORE, PREMISES CONSIDERED",
  "Petitioner, Pro Se",
  "VERIFICATION",
  "Signed and sworn to or affirmed",
  "purge, expunge, or destroy",
  "CERTIFIED TRUE COPY",
  "Mississippi Criminal Information Center",
  "DO NOT INCLUDE IN PUBLIC OR SERVICE COPIES"
]) assert.match(packetText, new RegExp(requiredPhrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
for (const prohibited of [
  /fingerprint records are not expunged/i,
  /no notarization is required/i,
  /Lawrence Blackmon/i,
  /Tracy Woodley/i,
  /SAMPLE PERSON/i,
  /MSB\s*#/i,
  /by and through (his|her|their) attorney/i,
  /\b(his|her) Motion\b/i
]) assert.doesNotMatch(packetText, prohibited);

const fullSsn = fixture.facts.social_security_number;
const blocksWithFullSsn = packet.documents.flatMap((document) =>
  document.blocks.filter((block) => JSON.stringify(block).includes(fullSsn))
);
assert.ok(blocksWithFullSsn.length > 0, "MCIC processing copy does not receive the full SSN");
assert.ok(
  blocksWithFullSsn.every(({ kind }) => kind === "confidential_identifier_addendum"),
  "the full SSN escaped the confidential MCIC addendum"
);
assert.doesNotMatch(JSON.stringify(petition), new RegExp(fullSsn.replaceAll("-", "\\-")));
assert.doesNotMatch(JSON.stringify(service), new RegExp(fullSsn.replaceAll("-", "\\-")));

for (const [factId, unsafeValue] of [
  ["actual_arrest", "No"],
  ["actual_arrest", "Unsure"],
  ["release_confirmed", "No"],
  ["release_confirmed", "Unsure"],
  ["certified_disposition_exhibit_status", "Missing"],
  ["docket_sheet_exhibit_status", "Missing"]
]) {
  const unsafe = structuredClone(fixture);
  unsafe.facts[factId] = unsafeValue;
  assert.throws(
    () => composeGradeAPacket(specification, unsafe),
    (error) => error instanceof GradeAPacketCompositionError,
    `${factId}=${unsafeValue} did not fail closed`
  );
}

const citationOnly = structuredClone(fixture);
citationOnly.facts.actual_arrest = "No";
citationOnly.facts.record_type = "Citation only; no custodial arrest shown";
assert.throws(() => composeGradeAPacket(specification, citationOnly), GradeAPacketCompositionError);

const wrongLastFour = structuredClone(fixture);
wrongLastFour.facts.social_security_number_last_four = "0000";
assert.throws(() => composeGradeAPacket(specification, wrongLastFour), GradeAPacketCompositionError);

const participantDelivery = structuredClone(fixture);
participantDelivery.generationPurpose = "participant_delivery";
participantDelivery.facts.mcic_identifier_method_confirmation_source = "Not yet confirmed";
assert.throws(() => composeGradeAPacket(specification, participantDelivery), GradeAPacketCompositionError);

const noImpact = structuredClone(boundaryFixture);
noImpact.facts.personal_impact_confirmed = "No";
noImpact.facts.personal_impact_statement = "This sentence must not render.";
assert.doesNotMatch(JSON.stringify(composeGradeAPacket(specification, noImpact)), /This sentence must not render/);

const firstRender = await renderGradeAPacketPdf(packet);
const secondRender = await renderGradeAPacketPdf(composeGradeAPacket(specification, fixture));
assert.deepEqual(firstRender, secondRender, "filing-revision PDF bytes are not deterministic");
const parsed = await PDFDocument.load(firstRender);
assert.ok(parsed.getPageCount() >= 8);
for (const page of parsed.getPages()) {
  const { width, height } = page.getSize();
  assert.equal(width, 612);
  assert.equal(height, 792);
}

const boundaryRender = await renderGradeAPacketPdf(boundaryPacket);
assert.ok((await PDFDocument.load(boundaryRender)).getPageCount() >= parsed.getPageCount());

console.log(
  `Mississippi filing revision: ${packet.documents.length} documents, ${parsed.getPageCount()} pages; `
  + "arrest, release, notary, privacy, and MCIC gates verified."
);
