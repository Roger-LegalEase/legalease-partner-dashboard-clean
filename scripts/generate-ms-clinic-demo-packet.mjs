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
const PARTICIPANT_DELIVERY_RASTER_REVIEW_FILE = "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.participant-delivery.raster-review.json";
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
  },
  {
    fixture: "participant_delivery_canonical",
    source: "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.participant-a.fixture.json",
    file: `${ARTIFACT_DIRECTORY}/ms-nonconviction-clinic-demo-participant-a-canonical.pdf`
  },
  {
    fixture: "participant_delivery_boundary",
    source: "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.participant-b.fixture.json",
    file: `${ARTIFACT_DIRECTORY}/ms-nonconviction-clinic-demo-participant-b-boundary.pdf`
  }
];

const absolute = (relative) => path.join(ROOT, relative);
const readJson = (relative) => JSON.parse(fs.readFileSync(absolute(relative), "utf8"));
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

const specificationBytes = fs.readFileSync(absolute(SPECIFICATION_FILE));
const specification = JSON.parse(specificationBytes);
const existingEvidence = fs.existsSync(absolute(EVIDENCE_FILE)) ? readJson(EVIDENCE_FILE) : null;
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
    generationPurpose: matter.generationPurpose ?? "participant_delivery",
    verificationHash: matter.verificationHash
  });
}

const existingApproval = existingEvidence?.outputLegalApproval;
const approvalStillBinds = existingApproval?.state === "approved"
  && existingApproval.decision === "APPROVE"
  && existingApproval.routeId === specification.routeKey
  && existingApproval.packetFamily === specification.packetFamily
  && existingApproval.specificationSha256 === sha256(specificationBytes)
  && existingApproval.canonicalSha256 === artifacts.find((artifact) => artifact.fixture === "canonical")?.sha256
  && existingApproval.boundarySha256 === artifacts.find((artifact) => artifact.fixture === "boundary")?.sha256;
const existingParticipantApproval = existingEvidence?.participantDeliveryReview;
const approvalCanonicalArtifact = artifacts.find((artifact) => artifact.fixture === "participant_delivery_canonical");
const approvalBoundaryArtifact = artifacts.find((artifact) => artifact.fixture === "participant_delivery_boundary");
const participantDeliveryApprovalStillBinds = existingParticipantApproval?.state === "approved"
  && existingParticipantApproval.decision === "APPROVE"
  && existingParticipantApproval.reviewerId === "Lawrence Blackmon"
  && existingParticipantApproval.routeId === specification.routeKey
  && existingParticipantApproval.packetFamily === specification.packetFamily
  && existingParticipantApproval.previewPartnerSlug === "mvl-demo"
  && existingParticipantApproval.packetSpecificationSha256 === sha256(specificationBytes)
  && existingParticipantApproval.canonical?.sha256 === approvalCanonicalArtifact?.sha256
  && existingParticipantApproval.canonical?.byteLength === approvalCanonicalArtifact?.byteLength
  && existingParticipantApproval.canonical?.pageCount === approvalCanonicalArtifact?.pageCount
  && existingParticipantApproval.boundary?.sha256 === approvalBoundaryArtifact?.sha256
  && existingParticipantApproval.boundary?.byteLength === approvalBoundaryArtifact?.byteLength
  && existingParticipantApproval.boundary?.pageCount === approvalBoundaryArtifact?.pageCount
  && existingParticipantApproval.priorApprovalReused === false
  && existingParticipantApproval.consumerPaidAuthorized === false
  && existingParticipantApproval.productionAuthorized === false;
const evidence = {
  schemaVersion: "rcap-grade-a-ms-clinic-demo-artifacts/v4",
  generatedBy: "scripts/generate-ms-clinic-demo-packet.mjs",
  generatedOn: "2026-09-03",
  routeKey: specification.routeKey,
  packetFamily: specification.packetFamily,
  specificationPath: SPECIFICATION_FILE,
  specificationSha256: sha256(specificationBytes),
  renderer: "rcap_grade_a_document_v1@2.0.0",
  contentType: "application/pdf",
  deterministic: true,
  ...(approvalStillBinds ? { outputLegalApproval: existingApproval } : {}),
  participantDeliveryReview: participantDeliveryApprovalStillBinds
    ? existingParticipantApproval
    : {
        state: "pending_named_mississippi_counsel_exact_hash_approval",
        priorApprovalReused: false,
        approvalRecorded: false,
        scope: "The exact participant-delivery canonical and boundary PDFs for the two synthetic mvl-demo Preview participants; sponsored Preview only after every technical predicate passes.",
        consumerPaidAuthorized: false,
        productionAuthorized: false
      },
  artifacts
};
fs.writeFileSync(absolute(EVIDENCE_FILE), `${JSON.stringify(evidence, null, 2)}\n`);
const canonical = artifacts.find((artifact) => artifact.fixture === "canonical");
const boundary = artifacts.find((artifact) => artifact.fixture === "boundary");
const deliveryCanonical = artifacts.find((artifact) => artifact.fixture === "participant_delivery_canonical");
const deliveryBoundary = artifacts.find((artifact) => artifact.fixture === "participant_delivery_boundary");
const rasterReview = fs.existsSync(absolute(RASTER_REVIEW_FILE)) ? readJson(RASTER_REVIEW_FILE) : null;
const participantDeliveryRasterReview = fs.existsSync(absolute(PARTICIPANT_DELIVERY_RASTER_REVIEW_FILE))
  ? readJson(PARTICIPANT_DELIVERY_RASTER_REVIEW_FILE)
  : null;
const reviewedArtifactsMatch = [canonical, boundary].every((artifact) => {
  const reviewed = rasterReview?.artifacts?.find((candidate) => candidate.fixture === artifact.fixture);
  return reviewed?.sourcePdfSha256 === artifact.sha256 && reviewed?.pageCount === artifact.pageCount;
});
const independentReviewPassed = reviewedArtifactsMatch
  && rasterReview?.independentReview?.status === "passed"
  && rasterReview.independentReview.summary?.pass === 15
  && rasterReview.independentReview.summary?.fail === 0
  && rasterReview.independentReview.summary?.hold === 0;
const outputLegalApprovalPassed = approvalStillBinds;
const participantDeliveryApprovalPassed = participantDeliveryApprovalStillBinds;
const participantDeliveryVisualReviewPassed = [deliveryCanonical, deliveryBoundary].every((artifact) => {
  const reviewed = participantDeliveryRasterReview?.artifacts?.find((candidate) => candidate.fixture === artifact.fixture);
  return reviewed?.sourcePdfSha256 === artifact.sha256
    && reviewed?.pageCount === artifact.pageCount
    && reviewed?.pagesReviewed === artifact.pageCount;
}) && participantDeliveryRasterReview?.status === "passed";
const wiring = {
  schemaVersion: "rcap-census-v1-product-wiring/v1",
  family: specification.packetFamily,
  routeKey: specification.routeKey,
  routeKeys: [specification.routeKey],
  workType: "GRADE_A_PRODUCT_WIRING",
  status: participantDeliveryVisualReviewPassed && participantDeliveryApprovalPassed
    ? "INSTALLED_LEGAL_APPROVAL_PASSED_HELD_FOR_TECHNICAL_PREVIEW_ACCEPTANCE"
    : participantDeliveryVisualReviewPassed
    ? "INSTALLED_HELD_FOR_NAMED_COUNSEL_APPROVAL"
    : independentReviewPassed
      ? "INSTALLED_HELD_FOR_PARTICIPANT_DELIVERY_VISUAL_REVIEW"
    : "INSTALLED_HELD_FOR_REVISION_REVIEW",
  authorityCreated: "held_grade_a_fulfillment_record",
  generatedBy: "scripts/generate-ms-clinic-demo-packet.mjs",
  derivedFrom: EVIDENCE_FILE,
  explicitNonGrants: [
    "This record authorizes deterministic build and controlled review only.",
    "It opens no consumer sale and grants no production deployment.",
    "Sponsored delivery remains closed until every technical Preview acceptance predicate passes."
  ],
  currentState: {
    serviceDisposition: "exact_runtime_route_and_grade_a_specification_installed",
    commercialState: participantDeliveryVisualReviewPassed && participantDeliveryApprovalPassed
      ? "HELD_PENDING_CORRECTED_WORKER_AND_TECHNICAL_PREVIEW_ACCEPTANCE"
      : participantDeliveryVisualReviewPassed
      ? "HELD_PENDING_NEW_PARTICIPANT_DELIVERY_HASH_APPROVAL_AND_PREVIEW_ACCEPTANCE"
      : independentReviewPassed
        ? "HELD_PENDING_PARTICIPANT_DELIVERY_VISUAL_REVIEW_AND_NEW_COUNSEL_APPROVAL"
      : "HELD_PENDING_FILING_REVISION_REVIEW_AND_NAMED_COUNSEL_APPROVAL",
    existingArtifactIds: [deliveryCanonical.sha256, deliveryBoundary.sha256],
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
    artifacts: { canonical: deliveryCanonical, boundary: deliveryBoundary },
    historicalInternalReviewArtifacts: { canonical, boundary },
    fieldMap: "data/rcap-all50/overlays/census-v1/ms/ms-nonconv-set--custom-pleading/production-field-map.json",
    instructions: "data/rcap-all50/overlays/census-v1/ms/ms-nonconv-set--custom-pleading/participant-instructions.md",
    rasterReview: PARTICIPANT_DELIVERY_RASTER_REVIEW_FILE,
    independentReview: participantDeliveryVisualReviewPassed
      ? {
          status: "participant_delivery_all_pages_reviewed",
          receipt: PARTICIPANT_DELIVERY_RASTER_REVIEW_FILE,
          externalDeliveryHolds: participantDeliveryApprovalPassed
            ? [
                "corrected_immutable_worker_publication_and_ingestion",
                "bounded_nonproduction_migration_application",
                "current_preview_and_two_participant_staging_scope",
                "complete_nonproduction_hosted_acceptance"
              ]
            : [
                "named_mississippi_counsel_and_current_law_approval",
                "court_confirmed_mcic_identifier_channel",
                "participant_supplied_exhibits",
                "classified_nonproduction_preview_acceptance"
              ]
        }
      : { status: "pending_participant_delivery_page_review" },
    counselReview: participantDeliveryApprovalPassed
      ? {
          ...existingParticipantApproval,
          status: "approved_exact_participant_delivery_hashes",
          state: "passed",
          historicalInternalReviewApproval: outputLegalApprovalPassed ? {
            reviewerId: existingApproval.reviewerId,
            decidedAt: existingApproval.decidedAt,
            approvedArtifactHashes: [existingApproval.canonicalSha256, existingApproval.boundarySha256]
          } : null
        }
      : {
          status: "pending_named_mississippi_counsel_for_new_participant_delivery_hashes",
          approvedArtifactHashes: [],
          priorApprovalReused: false,
          historicalInternalReviewApproval: outputLegalApprovalPassed ? {
            reviewerId: existingApproval.reviewerId,
            decidedAt: existingApproval.decidedAt,
            approvedArtifactHashes: [existingApproval.canonicalSha256, existingApproval.boundarySha256]
          } : null
        },
    paymentEligible: false,
    sponsorshipEligible: false,
    whyPaymentIsClosed: "Consumer launch is outside the Clinic Mode Preview and remains held regardless of sponsored Preview acceptance.",
    whySponsorshipIsClosed: participantDeliveryVisualReviewPassed && participantDeliveryApprovalPassed
      ? "Lawrence Blackmon approved the two exact participant-delivery hashes. Sponsored generation remains held until the corrected immutable worker, bounded nonproduction migrations, current Preview, two-participant scope, and complete hosted acceptance journey all pass."
      : participantDeliveryVisualReviewPassed
      ? "The participant-delivery pair is built and page-reviewed, but sponsored generation stays held until Lawrence Blackmon approves these new exact hashes and the nonproduction acceptance journey passes."
      : independentReviewPassed
        ? "The historical internal-review pair remains approved, but it is non-deliverable. Sponsored generation stays held until the new participant-delivery pages pass review, Lawrence approves their exact hashes, and nonproduction acceptance passes."
      : "The filing-document revision remains held until the independent second pass and named Mississippi counsel approval are recorded.",
    maintenanceRelationship: {
      rebuiltFrom: "scripts/generate-ms-clinic-demo-packet.mjs",
      reRasterRequiredWhen: "either current participant-delivery artifact hash changes",
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
fulfillment.artifactApprovalStatus = participantDeliveryVisualReviewPassed && participantDeliveryApprovalPassed
  ? "participant_delivery_exact_hashes_approved_held_for_technical_preview_acceptance"
  : participantDeliveryVisualReviewPassed
  ? "participant_delivery_artifacts_built_and_rastered_pending_new_exact_hash_counsel_approval"
  : independentReviewPassed
    ? "historical_internal_review_approved_but_non_deliverable_participant_delivery_review_pending"
  : "revision_artifacts_built_pending_fresh_visual_independent_and_counsel_review";
fulfillment.holdReason = participantDeliveryVisualReviewPassed && participantDeliveryApprovalPassed
  ? "Lawrence Blackmon approved the two exact participant-delivery hashes without qualifications. Sponsored delivery remains held for a corrected immutable worker, the bounded nonproduction migrations, a current Preview, two-participant staging scope, and the complete hosted acceptance journey. The historical internal-review approval remains separate and was not reused. Consumer launch and Production remain held."
  : participantDeliveryVisualReviewPassed
  ? "The new participant-delivery canonical and boundary PDFs are deterministic and all pages have been raster reviewed. Delivery remains held for Lawrence Blackmon's approval of these new exact hashes, a new immutable worker, the bounded nonproduction migrations, and hosted Preview acceptance. The historical internal-review approval is not reused. Consumer launch remains held."
  : independentReviewPassed
    ? "The historical internal-review PDFs and their approval remain evidence but are non-deliverable. Delivery remains held for completed raster review and new exact-hash counsel approval of the participant-delivery pair, then a new immutable worker and hosted Preview acceptance. Consumer launch remains held."
  : "The first artifact set was rejected for filing. These revised conventional pleadings remain held for fresh raster review, independent review, named Mississippi counsel approval, court confirmation of the MCIC identifier channel, participant exhibits, and nonproduction browser acceptance.";
fulfillment.proofSummary = `Five participant-delivery documents render as ${deliveryCanonical.pageCount} canonical pages and ${deliveryBoundary.pageCount} boundary pages from the same guarded composer path used by the hosted journey. Both fixtures carry court-confirmed MCIC channels, confirmed service addresses, and inserted Exhibit A/B states while preserving participant and official signature blanks.`;
fulfillment.historicalInternalReviewArtifacts = [canonical, boundary].map((artifact) => ({
  fixture: artifact.fixture,
  file: artifact.file,
  sha256: artifact.sha256,
  bytes: artifact.byteLength,
  pages: artifact.pageCount,
  counselApproval: "historical_exact_hash_approval_not_reused"
}));
fulfillment.artifacts = [deliveryCanonical, deliveryBoundary].map((artifact) => ({
  fixture: artifact.fixture,
  file: artifact.file,
  sha256: artifact.sha256,
  bytes: artifact.byteLength,
  pages: artifact.pageCount
}));
fulfillment.visualReview = {
  status: participantDeliveryVisualReviewPassed
    ? "participant_delivery_all_pages_raster_review_pass"
    : "pending_participant_delivery_raster_review",
  receipt: PARTICIPANT_DELIVERY_RASTER_REVIEW_FILE,
  pagesReviewed: participantDeliveryVisualReviewPassed
    ? deliveryCanonical.pageCount + deliveryBoundary.pageCount
    : 0
};
fulfillment.independentReview = {
  status: participantDeliveryVisualReviewPassed ? "participant_delivery_all_pages_reviewed" : "pending_participant_delivery_page_review",
  externalDeliveryHolds: participantDeliveryApprovalPassed
    ? [
        "corrected_immutable_worker_publication_and_ingestion",
        "bounded_nonproduction_migration_application",
        "current_preview_and_two_participant_staging_scope",
        "complete_nonproduction_hosted_acceptance"
      ]
    : [
        "new_participant_delivery_exact_hash_approval_by_lawrence_blackmon",
        "court_confirmed_mcic_identifier_channel",
        "participant_supplied_exhibits",
        "nonproduction_browser_acceptance"
      ]
};
fulfillment.outputLegalReview = participantDeliveryApprovalPassed
  ? {
      ...existingParticipantApproval,
      status: "approved_exact_participant_delivery_hashes",
      state: "passed",
      historicalInternalReviewApproval: outputLegalApprovalPassed ? {
        reviewerId: existingApproval.reviewerId,
        decidedAt: existingApproval.decidedAt,
        approvedArtifactHashes: [existingApproval.canonicalSha256, existingApproval.boundarySha256]
      } : null
    }
  : {
      status: "pending_named_mississippi_counsel_for_new_participant_delivery_hashes",
      reviewerId: null,
      decidedAt: null,
      qualifications: [],
      authenticationKind: null,
      authenticatedApprovalReference: null,
      approvedArtifactHashes: [],
      priorApprovalReused: false,
      historicalInternalReviewApproval: outputLegalApprovalPassed ? {
        reviewerId: existingApproval.reviewerId,
        decidedAt: existingApproval.decidedAt,
        approvedArtifactHashes: [existingApproval.canonicalSha256, existingApproval.boundarySha256]
      } : null
    };
fs.writeFileSync(absolute(FULFILLMENT_LEDGER_FILE), `${JSON.stringify(fulfillmentLedger, null, 2)}\n`);
console.log(JSON.stringify(evidence, null, 2));
