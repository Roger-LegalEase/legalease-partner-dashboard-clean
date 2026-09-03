#!/usr/bin/env node

import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument } from "pdf-lib";
import { register } from "node:module";

register("./lib/ts-esm-loader.mjs", import.meta.url);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SPECIFICATION_FILE = "data/record-clearing/packet-specifications/MS-nonconviction-expungement-99-19-71-4.v1.json";
const EVIDENCE_FILE = "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.artifacts.json";
const RASTER_REVIEW_FILE = "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.raster-review.json";
const FULFILLMENT_LEDGER_FILE = "data/rcap-ledger/packet-fulfillment-records.json";
const WIRING_FILE = "data/rcap-all50/overlays/census-v1/ms/ms-nonconv-set--custom-pleading/product-wiring.json";
const ARTIFACT_DIRECTORY = "data/rcap-ledger/grade-a/artifacts";
const variants = [
  {
    fixture: "canonical",
    source: "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.fixture.json",
    file: `${ARTIFACT_DIRECTORY}/ms-nonconviction-clinic-demo-canonical.pdf`
  },
  {
    fixture: "boundary",
    source: "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.boundary.fixture.json",
    file: `${ARTIFACT_DIRECTORY}/ms-nonconviction-clinic-demo-boundary.pdf`
  }
];

const absolute = (relative) => path.join(ROOT, relative);
const readJson = (relative) => JSON.parse(fs.readFileSync(absolute(relative), "utf8"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const specificationBytes = fs.readFileSync(absolute(SPECIFICATION_FILE));
const specification = JSON.parse(specificationBytes);
const { composeGradeAPacket } = await import("../src/lib/rcap/grade-a/composer.ts");
const { renderGradeAPacketPdf } = await import("../src/lib/rcap/grade-a/renderer.ts");

fs.mkdirSync(absolute(ARTIFACT_DIRECTORY), { recursive: true });
const artifacts = [];
for (const variant of variants) {
  const matter = readJson(variant.source);
  const packet = composeGradeAPacket(specification, matter);
  if (/\{\{[a-z0-9_]+\}\}/.test(JSON.stringify(packet))) {
    throw new Error(`${variant.fixture} contains an unresolved template fact`);
  }
  const bytes = await renderGradeAPacketPdf(packet);
  const repeat = await renderGradeAPacketPdf(composeGradeAPacket(specification, matter));
  if (!bytes.equals(repeat)) throw new Error(`${variant.fixture} is not byte deterministic`);
  const parsed = await PDFDocument.load(bytes);
  fs.writeFileSync(absolute(variant.file), bytes);
  artifacts.push({
    fixture: variant.fixture,
    fixtureFile: variant.source,
    file: variant.file,
    sha256: sha256(bytes),
    byteLength: bytes.length,
    pageCount: parsed.getPageCount(),
    documentCount: packet.documents.length,
    verificationHash: matter.verificationHash
  });
}

const evidence = {
  schemaVersion: "rcap-grade-a-ms-clinic-demo-artifacts/v2",
  generatedBy: "scripts/generate-ms-clinic-demo-packet.mjs",
  generatedOn: "2026-09-03",
  routeKey: specification.routeKey,
  packetFamily: specification.packetFamily,
  specificationPath: SPECIFICATION_FILE,
  specificationSha256: sha256(specificationBytes),
  renderer: "rcap_grade_a_document_v1@2.0.0",
  contentType: "application/pdf",
  deterministic: true,
  artifacts
};
fs.writeFileSync(absolute(EVIDENCE_FILE), `${JSON.stringify(evidence, null, 2)}\n`);
const canonical = artifacts.find((artifact) => artifact.fixture === "canonical");
const boundary = artifacts.find((artifact) => artifact.fixture === "boundary");
const rasterReview = fs.existsSync(absolute(RASTER_REVIEW_FILE)) ? readJson(RASTER_REVIEW_FILE) : null;
const reviewedArtifactsMatch = artifacts.every((artifact) => {
  const reviewed = rasterReview?.artifacts?.find((candidate) => candidate.fixture === artifact.fixture);
  return reviewed?.sourcePdfSha256 === artifact.sha256 && reviewed?.pageCount === artifact.pageCount;
});
const independentReviewPassed = reviewedArtifactsMatch
  && rasterReview?.independentReview?.status === "passed"
  && rasterReview.independentReview.summary?.pass === 15
  && rasterReview.independentReview.summary?.fail === 0
  && rasterReview.independentReview.summary?.hold === 0;
const wiring = {
  schemaVersion: "rcap-census-v1-product-wiring/v1",
  family: specification.packetFamily,
  routeKey: specification.routeKey,
  routeKeys: [specification.routeKey],
  workType: "GRADE_A_PRODUCT_WIRING",
  status: independentReviewPassed
    ? "INSTALLED_HELD_FOR_NAMED_COUNSEL_APPROVAL"
    : "INSTALLED_HELD_FOR_REVISION_REVIEW",
  authorityCreated: "held_grade_a_fulfillment_record",
  generatedBy: "scripts/generate-ms-clinic-demo-packet.mjs",
  derivedFrom: EVIDENCE_FILE,
  explicitNonGrants: [
    "This record authorizes deterministic build and controlled review only.",
    "It opens no consumer sale and grants no production deployment.",
    "Sponsored delivery remains closed until the independent revision review and named Mississippi counsel approve these exact artifact hashes."
  ],
  currentState: {
    serviceDisposition: "exact_runtime_route_and_grade_a_specification_installed",
    commercialState: independentReviewPassed
      ? "HELD_PENDING_NAMED_COUNSEL_AND_PREVIEW_ACCEPTANCE"
      : "HELD_PENDING_FILING_REVISION_REVIEW_AND_NAMED_COUNSEL_APPROVAL",
    existingArtifactIds: artifacts.map((artifact) => artifact.sha256),
    generationAllowed: false
  },
  proposedRepresentation: {
    note: "The revised five-document packet uses conventional pleading pages, a mandatory jurat, and a confidential synthetic MCIC identifier addendum. Delivery authority remains held.",
    packetSetId: specification.packetSetId,
    outputStrategy: "custom_pleading",
    components: specification.documents.map((document) => ({
      documentId: document.documentId,
      role: document.role,
      order: document.order,
      requirement: document.requirement,
      manifestComponentIds: document.manifestComponentIds
        ?? (document.manifestComponentId ? [document.manifestComponentId] : [])
    }))
  },
  binding: {
    family: specification.packetFamily,
    jurisdiction: specification.jurisdiction,
    routeKeys: [specification.routeKey],
    deliveryType: "custom_pleading",
    packetSpecification: SPECIFICATION_FILE,
    packetSpecificationSha256: evidence.specificationSha256,
    artifactEvidence: EVIDENCE_FILE,
    artifacts: { canonical, boundary },
    fieldMap: "data/rcap-all50/overlays/census-v1/ms/ms-nonconv-set--custom-pleading/production-field-map.json",
    instructions: "data/rcap-all50/overlays/census-v1/ms/ms-nonconv-set--custom-pleading/participant-instructions.md",
    rasterReview: "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.raster-review.json",
    independentReview: independentReviewPassed
      ? {
          status: "15_pass_0_fail_0_hold",
          obligations: 15,
          receipt: RASTER_REVIEW_FILE,
          externalDeliveryHolds: [
            "named_mississippi_counsel_and_current_law_approval",
            "court_confirmed_mcic_identifier_channel",
            "participant_supplied_exhibits",
            "classified_nonproduction_preview_acceptance"
          ]
        }
      : { status: "pending_independent_second_pass", obligations: 15 },
    counselReview: { status: "revision_pending_named_mississippi_counsel", approvedArtifactHashes: [] },
    paymentEligible: false,
    sponsorshipEligible: false,
    whyPaymentIsClosed: "Consumer launch is outside the clinic demo and named counsel has not approved these exact artifact hashes.",
    whySponsorshipIsClosed: independentReviewPassed
      ? "The packet is built and independently reviewed, but sponsored generation stays held until named Mississippi counsel approves the exact artifacts and the nonproduction acceptance journey passes."
      : "The filing-document revision remains held until the independent second pass and named Mississippi counsel approval are recorded.",
    maintenanceRelationship: {
      rebuiltFrom: "scripts/generate-ms-clinic-demo-packet.mjs",
      reRasterRequiredWhen: "either artifact hash changes",
      reVerificationRequiredWhen: "the route, specification, facts, renderer, or artifact bytes change"
    }
  }
};
fs.writeFileSync(absolute(WIRING_FILE), `${JSON.stringify(wiring, null, 2)}\n`);

const fulfillmentLedger = readJson(FULFILLMENT_LEDGER_FILE);
const fulfillment = fulfillmentLedger.records.find((record) => record.routeKey === specification.routeKey);
if (!fulfillment) throw new Error(`No fulfillment ledger record exists for ${specification.routeKey}`);
fulfillment.packetSpecificationVersion = specification.specificationVersion;
fulfillment.packetSpecificationSha256 = evidence.specificationSha256;
fulfillment.sourceIdentities = specification.sourceIdentities;
fulfillment.artifactProviderVersion = "2.0.0";
fulfillment.rendererVersion = "2.0.0";
fulfillment.requiredFacts = specification.requiredFacts.map((fact) => fact.factId);
fulfillment.finalVerificationRequirements = specification.finalVerificationRequirements;
fulfillment.artifactApprovalStatus = independentReviewPassed
  ? "artifacts_built_and_independently_rastered_pending_counsel_and_preview_acceptance"
  : "revision_artifacts_built_pending_fresh_visual_independent_and_counsel_review";
fulfillment.holdReason = independentReviewPassed
  ? "The exact canonical and boundary PDFs are deterministic and passed author and independent visual review. Delivery remains held for named Mississippi counsel approval of these exact hashes, court confirmation of the MCIC identifier channel, participant insertion of the required exhibits, and the nonproduction browser acceptance journey. Consumer launch remains outside this demo in every event."
  : "The first artifact set was rejected for filing. These revised conventional pleadings remain held for fresh raster review, independent review, named Mississippi counsel approval, court confirmation of the MCIC identifier channel, participant exhibits, and nonproduction browser acceptance.";
fulfillment.proofSummary = `Five documents render as ${canonical.pageCount} canonical pages and ${boundary.pageCount} boundary pages. The revision adds docket-exact captions, actual-arrest and release gates, exact charge details, a mandatory jurat, MCIC identifiers in a confidential synthetic addendum, corrected record-destruction language, clerk certification, pro-se signatures, unconfirmed-address treatment, and Exhibit A/B assembly holds.`;
fulfillment.artifacts = artifacts.map((artifact) => ({
  fixture: artifact.fixture,
  file: artifact.file,
  sha256: artifact.sha256,
  bytes: artifact.byteLength,
  pages: artifact.pageCount
}));
fulfillment.visualReview = {
  status: independentReviewPassed
    ? "author_and_independent_visual_review_pass"
    : "pending_fresh_revision_raster_review",
  receipt: RASTER_REVIEW_FILE,
  pagesReviewed: independentReviewPassed
    ? artifacts.reduce((total, artifact) => total + artifact.pageCount, 0)
    : 0
};
fulfillment.independentReview = {
  status: independentReviewPassed ? "15_pass_0_fail_0_hold" : "pending_revision_second_pass",
  obligations: 15,
  externalDeliveryHolds: [
    "named_mississippi_counsel_and_current_law",
    "court_confirmed_mcic_identifier_channel",
    "participant_supplied_exhibits",
    "nonproduction_browser_acceptance"
  ]
};
fulfillment.outputLegalReview = {
  status: "revision_pending_named_mississippi_counsel",
  approvedArtifactHashes: []
};
fs.writeFileSync(absolute(FULFILLMENT_LEDGER_FILE), `${JSON.stringify(fulfillmentLedger, null, 2)}\n`);
console.log(JSON.stringify(evidence, null, 2));
