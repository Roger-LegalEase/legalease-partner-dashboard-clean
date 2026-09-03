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
const { mississippiNonConvictionPacketSafety } = await import(
  "../src/lib/expungement-ai/packet-information.ts"
);

const safeRouteAnswers = {
  pending_cases: "No",
  trafficking_status: "No",
  prior_relief: "No",
  sentence_completion_date: "Yes",
  financial_obligations: "Yes",
  nonadjudication_or_diversion: "No",
  open_co_defendant_matter: "No",
  actual_arrest: "Yes",
  release_confirmed: "Yes",
  disposition_record_wording: "Charge dropped"
};
assert.deepEqual(
  mississippiNonConvictionPacketSafety(safeRouteAnswers),
  { safe: true, reason: "route_safety_confirmed" }
);
for (const id of ["actual_arrest", "release_confirmed"]) {
  for (const answer of ["No", "Unsure"]) {
    assert.deepEqual(
      mississippiNonConvictionPacketSafety({ ...safeRouteAnswers, [id]: answer }),
      { safe: false, reason: `route_changing_answer:${id}` }
    );
  }
}

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
const orderIdentity = order?.blocks.find(({ kind }) => kind === "pleading_identity_list");
assert.ok(
  orderIdentity?.kind === "pleading_identity_list"
  && orderIdentity.items.some(({ label }) => label === "Charge Classification"),
  "the proposed order identity block omits the charge classification"
);
const courtSignature = order?.blocks.find(
  (block) => block.kind === "official_signature" && /JUDGE$/.test(block.role)
);
assert.ok(courtSignature?.kind === "official_signature");
assert.equal(courtSignature.title, "", "the dated SO ORDERED line is duplicated by a separate heading");
assert.doesNotMatch(
  JSON.stringify(service),
  /(?<!\.)\.\.(?!\.)/,
  "participant-supplied terminal punctuation creates a doubled period in the service certificate"
);

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
  /\b(his|her) Motion\b/i,
  /\bat To be confirmed\b/i
]) assert.doesNotMatch(packetText, prohibited);
assert.match(
  JSON.stringify(boundaryPacket),
  /39225-2747\. Deliver it/,
  "the service-address insertion must end before the next instruction sentence"
);

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
participantDelivery.facts.mcic_identifier_delivery_method = "Confidential court-approved MCIC identifier addendum";
participantDelivery.facts.mcic_identifier_method_confirmation_source =
  "Confirmed by the Hinds County Circuit Clerk on 2026-09-03";
participantDelivery.facts.service_address_confirmation_status =
  "Confirmed by the Hinds County District Attorney's Office on 2026-09-03";
participantDelivery.facts.certified_disposition_exhibit_status = "Attached as Exhibit A";
participantDelivery.facts.docket_sheet_exhibit_status = "Inserted as Exhibit B";
assert.doesNotThrow(() => composeGradeAPacket(specification, participantDelivery));
for (const [factId, unsafeValue] of [
  ["mcic_identifier_delivery_method", "None"],
  ["mcic_identifier_method_confirmation_source", "banana"],
  ["service_address_confirmation_status", "banana"],
  ["certified_disposition_exhibit_status", "Not attached"],
  ["docket_sheet_exhibit_status", "Not inserted"]
]) {
  const unsafe = structuredClone(participantDelivery);
  unsafe.facts[factId] = unsafeValue;
  assert.throws(
    () => composeGradeAPacket(specification, unsafe),
    GradeAPacketCompositionError,
    `${factId}=${unsafeValue} bypassed the participant-delivery gate`
  );
}

const noImpact = structuredClone(boundaryFixture);
noImpact.facts.personal_impact_confirmed = "No";
noImpact.facts.personal_impact_statement = "This sentence must not render.";
assert.doesNotMatch(JSON.stringify(composeGradeAPacket(specification, noImpact)), /This sentence must not render/);

const firstRender = await renderGradeAPacketPdf(packet);
const secondRender = await renderGradeAPacketPdf(composeGradeAPacket(specification, fixture));
assert.deepEqual(firstRender, secondRender, "filing-revision PDF bytes are not deterministic");
const parsed = await PDFDocument.load(firstRender);
assert.ok(parsed.getPageCount() >= 8);
assert.ok(parsed.getPageCount() <= 12, "canonical guidance spills a final line onto an otherwise blank page");
for (const page of parsed.getPages()) {
  const { width, height } = page.getSize();
  assert.equal(width, 612);
  assert.equal(height, 792);
}

const boundaryRender = await renderGradeAPacketPdf(boundaryPacket);
const boundaryPageCount = (await PDFDocument.load(boundaryRender)).getPageCount();
assert.ok(boundaryPageCount >= parsed.getPageCount());
assert.ok(boundaryPageCount <= 13, "boundary guidance spills onto an avoidable extra page");

console.log(
  `Mississippi filing revision: ${packet.documents.length} documents, ${parsed.getPageCount()} pages; `
  + "arrest, release, notary, privacy, and MCIC gates verified."
);
