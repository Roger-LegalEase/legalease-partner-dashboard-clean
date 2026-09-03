#!/usr/bin/env node

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";

import { register } from "node:module";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SPECIFICATION = path.join(
  ROOT,
  "data/record-clearing/packet-specifications/MS-nonconviction-expungement-99-19-71-4.v1.json"
);

assert.ok(
  fs.existsSync(SPECIFICATION),
  "the exact Mississippi non-conviction Grade A packet specification is missing"
);

const ROUTE = "MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";
const FAMILY = "ms-nonconv-set";
const FIXTURE = path.join(ROOT, "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.fixture.json");
const EVIDENCE = path.join(ROOT, "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.artifacts.json");
const RASTER_REVIEW = path.join(ROOT, "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.raster-review.json");
const PARTICIPANT_A_FIXTURE = path.join(ROOT, "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.participant-a.fixture.json");
const PARTICIPANT_B_FIXTURE = path.join(ROOT, "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.participant-b.fixture.json");
const PARTICIPANT_DELIVERY_RASTER_REVIEW = path.join(ROOT, "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.participant-delivery.raster-review.json");
const COUNSEL_DECISION = "docs/rcap/grade-a/MS_CLINIC_DEMO_COUNSEL_DECISION_SHEET.md";
const COUNSEL_REVIEW_PACKAGE = "docs/rcap/grade-a/MS_CLINIC_DEMO_PARTICIPANT_DELIVERY_COUNSEL_REVIEW.md";
const PARTICIPANT_CANONICAL_SHA256 = "413f6226500a5dc13cbad2ce7ec664a55dcdb48d80cd8bef9fa746f369c6553f";
const PARTICIPANT_BOUNDARY_SHA256 = "9f766f22524dcac9edfc340e1a77efda8e7cc821cce8672bc8daf9e853c738e1";
const HISTORICAL_CANONICAL_SHA256 = "294e871e192719fa2c542947f8177be1621ea8ce13429f2186df63d8daff9c40";
const HISTORICAL_BOUNDARY_SHA256 = "fe639ff544055e1440d069417d9e8c9fc5a7b366499c51111bd6d3377f7615b4";

const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const specificationBytes = fs.readFileSync(SPECIFICATION);
const specification = JSON.parse(specificationBytes);
assert.equal(specification.routeKey, ROUTE);
assert.equal(specification.jurisdiction, "MS");
assert.equal(specification.pathwayId, ROUTE.slice(3));
assert.equal(specification.packetFamily, FAMILY);
assert.equal(specification.specificationVersion, "2.0.0");
assert.equal(specification.legalSectionsBound, true);
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
assert.deepEqual(
  specification.documents.flatMap((document) => document.manifestComponentIds ?? []),
  [
    "ms-nonconv-primary-filing-1",
    "ms-nonconv-proposed-order-2",
    "ms-nonconv-certificate-of-service-3",
    "ms-nonconv-attachment-4",
    "ms-nonconv-instructions-5"
  ],
  "the rendered documents are not bound to the exact owner-approved manifest components"
);

const facts = new Map(specification.requiredFacts.map((fact) => [fact.factId, fact]));
for (const factId of [
  "participant_full_legal_name",
  "case_caption_plaintiff_name",
  "case_caption_defendant_name",
  "name_used_at_arrest",
  "aliases",
  "date_of_birth",
  "social_security_number",
  "social_security_number_last_four",
  "race",
  "sex",
  "mailing_address",
  "phone_number",
  "email_address",
  "court_type",
  "court_name",
  "filing_location",
  "case_number",
  "charge",
  "charge_legal_citation",
  "charge_classification",
  "offense_date",
  "actual_arrest",
  "arrest_date",
  "arrest_location",
  "arresting_agency",
  "agency_case_number",
  "release_confirmed",
  "release_date_or_record_source",
  "disposition_date",
  "statutory_disposition_category",
  "prosecuting_authority_name",
  "prosecuting_authority_service_address",
  "service_address_confirmation_status",
  "other_recordkeeping_agencies",
  "mcic_identifier_delivery_method",
  "mcic_identifier_method_confirmation_source",
  "personal_impact_confirmed",
  "personal_impact_statement",
  "certified_disposition_exhibit_status",
  "docket_sheet_exhibit_status",
  "case_outcome",
  "pending_cases",
  "record_type",
  "trafficking_status",
  "disposition_record_wording",
  "nonadjudication_or_diversion",
  "open_co_defendant_matter"
]) {
  assert.ok(facts.has(factId), `missing required Mississippi packet fact ${factId}`);
}
for (const fact of facts.values()) {
  assert.match(fact.ownership, /^(participant|server)$/);
  assert.ok(fact.use?.trim(), `${fact.factId} has no documented use`);
}
assert.deepEqual(new Set(specification.fieldOwnership.participantOwnedFacts), new Set(facts.keys()));
assert.deepEqual(
  specification.fieldOwnership.serverOwnedRouteFacts,
  ["jurisdiction", "pathway_id", "route_key", "packet_family"]
);
for (const ownershipGroup of [
  "participantAtSigningFields",
  "participantAtServiceFields",
  "notaryOwnedFields",
  "prosecutorOwnedFields",
  "courtOwnedFields"
]) assert.ok(specification.fieldOwnership[ownershipGroup].length > 0, `${ownershipGroup} is empty`);
for (const fact of facts.values()) {
  assert.ok(fact.prompt?.trim(), `${fact.factId} needs a plain-language prompt`);
  assert.match(fact.helperText ?? "", /volunteer/i, `${fact.factId} must say how a volunteer can help`);
  assert.match(fact.helperText ?? "", /stop/i, `${fact.factId} must name the unclear-record stopping rule`);
}

const { packetSpecificationFor, composablePacketSpecificationFor } =
  await import("../src/lib/rcap/grade-a/packet-specification.ts");
const registered = packetSpecificationFor(ROUTE);
assert.equal(registered?.packetFamily, FAMILY);
assert.equal(composablePacketSpecificationFor(ROUTE)?.routeKey, ROUTE);

const profile = JSON.parse(read("src/lib/rcap-engine/compiled/profiles/MS-mississippi.json"));
const { packetPlanForPathway } = await import("../src/lib/rcap-engine/packet-planner.ts");
const plan = packetPlanForPathway(profile, specification.pathwayId);
assert.ok(plan, "the authoritative Mississippi packet plan did not resolve");
for (const factId of facts.keys()) {
  assert.ok(plan.requiredInputIds.includes(factId), `${factId} is not required by the runtime packet plan`);
}
for (const safetyFactId of ["case_outcome", "pending_cases", "record_type", "trafficking_status"]) {
  assert.ok(plan.requiredInputIds.includes(safetyFactId), `${safetyFactId} route-safety context was not preserved`);
}

const ledger = JSON.parse(read("data/rcap-ledger/packet-fulfillment-records.json"));
const fulfillment = ledger.records.find((record) => record.routeKey === ROUTE);
assert.ok(fulfillment, "the exact Mississippi fulfillment record is missing");
assert.equal(fulfillment.packetFamily, FAMILY);
assert.equal(fulfillment.packetSpecificationSha256, createHash("sha256").update(specificationBytes).digest("hex"));
assert.equal(fulfillment.artifactProvider, "rcap_grade_a_composer_v1");
assert.equal(fulfillment.contentType, "application/pdf");
assert.equal(fulfillment.privateDelivery, true);
assert.equal(fulfillment.repeatDownload, true);
assert.equal(fulfillment.consumerPosture, "held");
assert.equal(fulfillment.sponsoredPosture, "held");
assert.match(fulfillment.holdReason, /technical|corrected immutable worker/i);
assert.equal(fulfillment.outputLegalReview.status, "approved_exact_participant_delivery_hashes");
assert.equal(fulfillment.outputLegalReview.state, "passed");
assert.equal(fulfillment.outputLegalReview.reviewerId, "Lawrence Blackmon");
assert.equal(fulfillment.outputLegalReview.decision, "APPROVE");
assert.equal(fulfillment.outputLegalReview.decidedAt, "2026-09-03");
assert.deepEqual(fulfillment.outputLegalReview.qualifications, []);
assert.equal(fulfillment.outputLegalReview.authenticationKind, "owner_attestation");
assert.match(fulfillment.outputLegalReview.authenticatedApprovalReference, /^Owner attestation by Roger Roman/);
assert.deepEqual(fulfillment.outputLegalReview.approvedArtifactHashes, [
  PARTICIPANT_CANONICAL_SHA256,
  PARTICIPANT_BOUNDARY_SHA256
]);
assert.equal(fulfillment.outputLegalReview.priorApprovalReused, false);
assert.deepEqual(fulfillment.outputLegalReview.historicalInternalReviewApproval.approvedArtifactHashes, [
  HISTORICAL_CANONICAL_SHA256,
  HISTORICAL_BOUNDARY_SHA256
]);

const authorityRegistry = JSON.parse(read("data/rcap-grade-a/fulfillment-authority-registry.json"));
const authorityRecord = authorityRegistry.records.find((record) => record.routeId === ROUTE);
assert.ok(authorityRecord, "the canonical Grade-A authority has no exact Mississippi clinic record");
assert.equal(authorityRecord.packetFamilyId, FAMILY);
assert.equal(authorityRecord.packetSpecification.sha256, fulfillment.packetSpecificationSha256);
assert.equal(authorityRecord.outputLegalApproval.state, "passed");
assert.equal(authorityRecord.outputLegalApproval.reviewerId, "Lawrence Blackmon");
assert.equal(authorityRecord.outputLegalApproval.decidedAt, "2026-09-03");
assert.match(authorityRecord.outputLegalApproval.scopeSha256, /^[a-f0-9]{64}$/);
assert.equal(authorityRecord.finalVerification.state, "unbound");
const authorityProjection = JSON.parse(read("data/rcap-grade-a/fulfillment-authority-projection.json"));
const projectedAuthority = authorityProjection.routes.find((record) => record.routeId === ROUTE);
assert.equal(projectedAuthority?.state, "INCOMPLETE");
assert.notEqual(projectedAuthority?.commercialStatus, "open");

assert.ok(fs.existsSync(FIXTURE), "the synthetic verified Mississippi matter fixture is missing");
const fixture = JSON.parse(fs.readFileSync(FIXTURE, "utf8"));
const { composeGradeAPacket, GradeAPacketCompositionError } = await import("../src/lib/rcap/grade-a/composer.ts");
const { mississippiNonConvictionPacketSafety } = await import("../src/lib/expungement-ai/packet-information.ts");
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
  disposition_record_wording: "Charges dropped"
};
assert.equal(mississippiNonConvictionPacketSafety(safeRouteAnswers).safe, true);
for (const id of ["nonadjudication_or_diversion", "open_co_defendant_matter"]) {
  for (const answer of ["Yes", "Unsure"]) {
    const unsafe = mississippiNonConvictionPacketSafety({ ...safeRouteAnswers, [id]: answer });
    assert.deepEqual(unsafe, { safe: false, reason: `route_changing_answer:${id}` });
  }
}
for (const id of ["actual_arrest", "release_confirmed"]) {
  for (const answer of ["No", "Unsure"]) {
    const unsafe = mississippiNonConvictionPacketSafety({ ...safeRouteAnswers, [id]: answer });
    assert.deepEqual(unsafe, { safe: false, reason: `route_changing_answer:${id}` });
  }
}
for (const wording of ["Passed to the file", "Retired to file", "Remanded", "Diversion", "Status unclear"]) {
  assert.deepEqual(
    mississippiNonConvictionPacketSafety({ ...safeRouteAnswers, disposition_record_wording: wording }),
    { safe: false, reason: "route_changing_answer:disposition_record_wording" }
  );
}
const { renderGradeAPacketPdf } = await import("../src/lib/rcap/grade-a/renderer.ts");
const packet = composeGradeAPacket(registered, fixture);
assert.equal(fixture.generationPurpose, "internal_review", "the historically approved fixture must remain internal-review only");
assert.throws(
  () => composeGradeAPacket(registered, { ...fixture, generationPurpose: "participant_delivery" }),
  (error) => error instanceof GradeAPacketCompositionError && /route-specific filing gate failed/.test(error.message),
  "the historical internal-review fixture must not pass as participant-deliverable"
);
assert.equal(packet.documents.length, 5);
assert.doesNotMatch(JSON.stringify(packet), /\{\{[a-z0-9_]+\}\}/, "the composed packet contains unresolved template facts");
const firstRender = await renderGradeAPacketPdf(packet);
const secondRender = await renderGradeAPacketPdf(composeGradeAPacket(registered, fixture));
assert.deepEqual(firstRender, secondRender, "the Mississippi packet is not deterministic");
assert.ok(firstRender.subarray(0, 5).equals(Buffer.from("%PDF-")));
const parsedPdf = await PDFDocument.load(firstRender);
assert.ok(parsedPdf.getPageCount() >= 8, "the filing-revision packet rendered fewer than eight pages");
for (const factId of facts.keys()) {
  const incomplete = structuredClone(fixture);
  delete incomplete.facts[factId];
  assert.throws(
    () => composeGradeAPacket(registered, incomplete),
    (error) => error instanceof GradeAPacketCompositionError && error.missingFactIds.includes(factId),
    `composition did not fail closed when ${factId} was removed`
  );
}

assert.ok(fs.existsSync(EVIDENCE), "the exact Mississippi canonical/boundary artifact evidence is missing");
const evidence = JSON.parse(fs.readFileSync(EVIDENCE, "utf8"));
assert.equal(evidence.routeKey, ROUTE);
assert.equal(evidence.packetFamily, FAMILY);
assert.equal(evidence.specificationSha256, fulfillment.packetSpecificationSha256);
assert.equal(evidence.deterministic, true);
assert.equal(evidence.artifacts.length, 4);
assert.equal(evidence.participantDeliveryReview.state, "approved");
assert.equal(evidence.participantDeliveryReview.reviewerId, "Lawrence Blackmon");
assert.equal(evidence.participantDeliveryReview.decision, "APPROVE");
assert.equal(evidence.participantDeliveryReview.decidedAt, "2026-09-03");
assert.deepEqual(evidence.participantDeliveryReview.qualifications, []);
assert.equal(evidence.participantDeliveryReview.authenticationKind, "owner_attestation");
assert.match(evidence.participantDeliveryReview.authenticatedApprovalReference, /^Owner attestation by Roger Roman/);
assert.deepEqual(evidence.participantDeliveryReview.approvedArtifactHashes, [
  PARTICIPANT_CANONICAL_SHA256,
  PARTICIPANT_BOUNDARY_SHA256
]);
assert.equal(evidence.participantDeliveryReview.priorApprovalReused, false);
assert.equal(evidence.participantDeliveryReview.approvalRecorded, true);
assert.equal(evidence.participantDeliveryReview.consumerPaidAuthorized, false);
assert.equal(evidence.participantDeliveryReview.productionAuthorized, false);
assert.equal(evidence.outputLegalApproval.canonicalSha256, HISTORICAL_CANONICAL_SHA256);
assert.equal(evidence.outputLegalApproval.boundarySha256, HISTORICAL_BOUNDARY_SHA256);
for (const artifact of evidence.artifacts) {
  const bytes = fs.readFileSync(path.join(ROOT, artifact.file));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), artifact.sha256);
  assert.equal(bytes.length, artifact.byteLength);
  assert.ok(artifact.pageCount >= 5);
}

for (const [fixturePath, artifactFixture] of [
  [PARTICIPANT_A_FIXTURE, "participant_delivery_canonical"],
  [PARTICIPANT_B_FIXTURE, "participant_delivery_boundary"]
]) {
  const participantFixture = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
  assert.equal(participantFixture.generationPurpose, "participant_delivery");
  assert.equal(participantFixture.facts.actual_arrest, "Yes");
  assert.equal(participantFixture.facts.release_confirmed, "Yes");
  assert.equal(participantFixture.facts.service_address_confirmation_status, "Confirmed by court or prosecutor");
  assert.equal(participantFixture.facts.certified_disposition_exhibit_status, "Attached as Exhibit A");
  assert.equal(participantFixture.facts.docket_sheet_exhibit_status, "Inserted as Exhibit B");
  assert.match(participantFixture.facts.social_security_number, /^\d{3}-\d{2}-\d{4}$/);
  assert.ok(participantFixture.facts.social_security_number.endsWith(participantFixture.facts.social_security_number_last_four));
  assert.match(participantFixture.facts.mcic_identifier_method_confirmation_source, /^Confirmed by .+(?:Court|Clerk)(?:'s Office)? on 2026-09-03$/i);
  const participantPacket = composeGradeAPacket(registered, participantFixture);
  const participantFirst = await renderGradeAPacketPdf(participantPacket);
  const participantSecond = await renderGradeAPacketPdf(composeGradeAPacket(registered, participantFixture));
  assert.deepEqual(participantFirst, participantSecond, `${artifactFixture} is not byte deterministic`);
  const recordedArtifact = evidence.artifacts.find((artifact) => artifact.fixture === artifactFixture);
  assert.ok(recordedArtifact, `${artifactFixture} artifact evidence is missing`);
  assert.equal(createHash("sha256").update(participantFirst).digest("hex"), recordedArtifact.sha256);
}

const rasterReview = JSON.parse(fs.readFileSync(RASTER_REVIEW, "utf8"));
assert.deepEqual(rasterReview.independentReview.summary, { pass: 15, fail: 0, hold: 0 });
assert.deepEqual(
  rasterReview.independentReview.obligations.map(({ label, verdict }) => [label, verdict]),
  [
    "ROUTE_IDENTITY",
    "SOURCE_IDENTITY",
    "COMPONENT_SET",
    "KNOWN_PREFILLS",
    "REQUIRED_BEFORE_FILING",
    "ROUTE_OPTIONS",
    "REPEATING_ROWS",
    "PROTECTED_FIELDS",
    "ARTIFACTS",
    "PAGE_ORDER",
    "CLIPPING_AND_OVERLAP",
    "FILING_DESTINATION",
    "FEE_AND_WAIVER",
    "SERVICE",
    "SELF_HELP_STOP"
  ].map((label) => [label, "pass"]),
  "the independent review does not score the exact fifteen-obligation rubric"
);
const participantRasterReview = JSON.parse(fs.readFileSync(PARTICIPANT_DELIVERY_RASTER_REVIEW, "utf8"));
assert.equal(participantRasterReview.status, "passed");
assert.equal(participantRasterReview.priorApprovalReused, false);
assert.equal(participantRasterReview.findings.everyPageOpened, true);
assert.equal(participantRasterReview.findings.everyPageRastered, true);
assert.equal(participantRasterReview.findings.everyPageReviewed, true);
assert.equal(participantRasterReview.artifacts.reduce((count, artifact) => count + artifact.pagesReviewed, 0), 25);
for (const reviewed of participantRasterReview.artifacts) {
  assert.equal(reviewed.pagesReviewed, reviewed.pageCount);
  assert.equal(reviewed.pageSha256.length, reviewed.pageCount);
  for (const [index, expectedHash] of reviewed.pageSha256.entries()) {
    const rasterPath = path.join(ROOT, reviewed.rasterDirectory, `page-${String(index + 1).padStart(2, "0")}.png`);
    assert.ok(fs.existsSync(rasterPath), `${reviewed.fixture} page ${index + 1} raster is missing`);
    assert.equal(createHash("sha256").update(fs.readFileSync(rasterPath)).digest("hex"), expectedHash);
  }
}

const matterPage = read("src/app/briefcase/[packetId]/page.tsx");
for (const copy of [
  "Your Mississippi clinic packet",
  "Continue my Mississippi clinic packet",
  "Download Mississippi non-conviction expungement packet"
]) assert.ok(matterPage.includes(copy), `matter page is missing: ${copy}`);
const reviewPage = read("src/app/briefcase/[packetId]/review/page.tsx");
for (const copy of [
  "Prefilled by LegalEase",
  "Confirmed from the participant’s records",
  "Completed by the participant when signing or serving",
  "Reserved for the prosecutor or court"
]) assert.ok(reviewPage.includes(copy), `final review is missing ownership copy: ${copy}`);
const verificationAction = read("src/components/expungement-ai/PacketVerificationAction.tsx");
assert.ok(verificationAction.includes("Verify and prepare clinic packet"));
assert.ok(verificationAction.includes("Preparing clinic packet"));
const screeningResult = read("src/components/expungement-ai/screening/ScreeningResult.tsx");
for (const copy of [
  "A Mississippi non-conviction expungement path may be available.",
  "Your packet is covered by",
  "Save this result to your Briefcase and continue."
]) assert.ok(screeningResult.includes(copy), `partner result is missing: ${copy}`);

const clinicEntry = read("src/components/clinic-mode/ClinicEntryClient.tsx");
for (const copy of [
  "screening is free",
  "partner covers the packet",
  "court or arrest records",
  "does not file"
]) assert.ok(clinicEntry.toLowerCase().includes(copy), `clinic entry is missing: ${copy}`);
const assistance = read("src/components/clinic-mode/ClinicAssistanceClient.tsx");
assert.ok(assistance.includes("event.jurisdiction"), "clinic assistance does not enforce the event jurisdiction");
const assistanceRoute = read("src/app/api/clinic/assistance/start/route.ts");
assert.ok(assistanceRoute.includes("entry.jurisdiction"), "clinic assistance API does not enforce the event jurisdiction server-side");

const queue = read("src/components/clinic-mode/ClinicQueueClient.tsx");
for (const label of [
  "Screening in progress",
  "Result saved",
  "Packet information needed",
  "Packet prepared",
  "Attorney review requested"
]) assert.ok(queue.includes(label), `clinic queue is missing status label: ${label}`);

const wiring = JSON.parse(read("data/rcap-all50/overlays/census-v1/ms/ms-nonconv-set--custom-pleading/product-wiring.json"));
assert.equal(wiring.routeKey, ROUTE);
assert.equal(wiring.family, FAMILY);
assert.equal(wiring.currentState.generationAllowed, false);
assert.equal(wiring.binding.paymentEligible, false);
assert.equal(wiring.binding.sponsorshipEligible, false, "sponsorship must stay held until every technical Preview predicate passes");
assert.equal(wiring.binding.counselReview.status, "approved_exact_participant_delivery_hashes");
assert.equal(wiring.binding.counselReview.state, "passed");
assert.equal(wiring.binding.counselReview.reviewerId, "Lawrence Blackmon");
assert.deepEqual(wiring.binding.counselReview.approvedArtifactHashes, [
  PARTICIPANT_CANONICAL_SHA256,
  PARTICIPANT_BOUNDARY_SHA256
]);
assert.equal(wiring.binding.counselReview.priorApprovalReused, false);
assert.equal(wiring.binding.packetSpecificationSha256, fulfillment.packetSpecificationSha256);
assert.equal(wiring.binding.artifacts.canonical.sha256, evidence.artifacts.find((artifact) => artifact.fixture === "participant_delivery_canonical").sha256);

for (const counselPath of [COUNSEL_DECISION, COUNSEL_REVIEW_PACKAGE]) {
  const counselRecord = read(counselPath);
  for (const exactValue of [
    "Lawrence Blackmon",
    "2026-09-03",
    "APPROVE",
    PARTICIPANT_CANONICAL_SHA256,
    PARTICIPANT_BOUNDARY_SHA256,
    HISTORICAL_CANONICAL_SHA256,
    HISTORICAL_BOUNDARY_SHA256,
    fulfillment.packetSpecificationSha256,
    "sponsored_preview_only_two_synthetic_staging_participants_after_all_technical_gates_pass"
  ]) assert.ok(counselRecord.includes(exactValue), `${counselPath} is missing ${exactValue}`);
  assert.match(counselRecord, /owner attestation by Roger Roman/i);
  assert.match(counselRecord, /not reused/i);
  assert.match(counselRecord, /consumer-paid|consumer payment/i);
  assert.match(counselRecord, /Production delivery/i);
}

const previewHandoff = read("docs/rcap/grade-a/MS_CLINIC_DEMO_PREVIEW_HANDOFF.md");
for (const requirement of [
  "VERCEL_ENV` is `preview",
  "RCAP_CONSUMER_DELIVERY_ROUTE_STATE=staging_scoped",
  "RCAP_CONSUMER_DELIVERY_STAGING_SCOPE",
  "mvl-demo",
  "jurisdiction `MS`",
  "production"
]) assert.ok(previewHandoff.toLowerCase().includes(requirement.toLowerCase()), `Preview handoff is missing: ${requirement}`);

console.log(`Mississippi Clinic Mode demo approval: ${packet.documents.length} documents; 25 participant-delivery pages deterministic and raster-reviewed; exact hashes approved and all technical delivery held.`);
