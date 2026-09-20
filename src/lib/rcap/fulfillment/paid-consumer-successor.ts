import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const MS_PAID_SUCCESSOR_DECISION_PATH = "data/record-clearing/legal-decisions/2026-09-20-ms-nonconv-paid-consumer-successor-v3.json";
/**
 * The decision this one supersedes: the 2026-09-20 approval, signed against the
 * pre-correction bytes. The shared §7 Fees & costs fix moved this route's full
 * EN and full ES artifacts, so it stopped describing what the product composes.
 * Preserved exactly as signed, never edited.
 */
export const MS_PAID_SUCCESSOR_PRIOR_DECISION_PATH = "data/record-clearing/legal-decisions/2026-09-20-ms-nonconv-paid-consumer-successor-v2.json";
/**
 * And the one BEFORE that, kept in the chain so custody is transitive.
 *
 * Checking only the immediate predecessor would let the tail of the chain be
 * rewritten while every loaded decision still verified -- which is the failure
 * "supersede, do not rewrite history" exists to prevent, one link further back.
 */
export const MS_PAID_SUCCESSOR_FIRST_DECISION_PATH = "data/record-clearing/legal-decisions/2026-09-14-ms-nonconv-paid-consumer-successor.json";
export const MS_PAID_SUCCESSOR_ROUTE = "MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";
const SPECIFICATION = "data/record-clearing/packet-specifications/MS-nonconviction-expungement-99-19-71-4.v1.json";
const SUPPLEMENTAL_GUIDE = "data/record-clearing/supplemental-guides/MS-nonconviction-expungement-99-19-71-4.v1.json";
const REVIEW_EVIDENCE = "data/rcap-ledger/grade-a/ms-nonconviction-successor-review.evidence.json";
const ARTIFACTS = "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.artifacts.json";
const RASTER_REVIEW = "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.participant-delivery.raster-review.json";

/** The three artifacts the owner approved, at statically identifiable paths.
 * A loop variable must never decide which file the filesystem is asked for. */
const APPROVED_ARTIFACT_PATHS: Record<string, string> = {
  "full-en": "data/rcap-ledger/grade-a/artifacts/ms-nonconviction-successor-review-full-en.pdf",
  "full-es": "data/rcap-ledger/grade-a/artifacts/ms-nonconviction-successor-review-full-es.pdf",
  "court-only": "data/rcap-ledger/grade-a/artifacts/ms-nonconviction-successor-review-court-only.pdf"
};

const digest = (bytes: Buffer | string) => crypto.createHash("sha256").update(bytes).digest("hex");

export interface MsPaidSuccessorArtifact {
  id: string;
  variant: "full" | "court_only";
  locale: string;
  guideAssembled: boolean;
  path: string;
  sha256: string;
  pageCount: number;
}

/**
 * Exact commercial-scope adoption of one reviewed packet set, not a new packet
 * verdict and not an exception to the legacy retirement.
 *
 * The 2026-09-20 decision differs from its predecessor in one way that matters
 * to every control downstream: the packet contents DID change. The §7
 * supplemental guide is assembled into the full packet and the specification's
 * own filing page is retired in its favour. So this loader can no longer accept
 * `packetContentsChanged: false` — it requires the change to be declared, and
 * requires the decision to name the exact bytes that carry it.
 *
 * Missing or changed evidence supplies no successor. Every technical, payment
 * and acceptance gate still applies, and none of them is waived here.
 */
export function loadMsPaidConsumerSuccessor(root = process.cwd()) {
  try {
    const bytes = fs.readFileSync(path.join(root, MS_PAID_SUCCESSOR_DECISION_PATH));
    const decision = JSON.parse(bytes.toString("utf8"));
    if (decision.schemaVersion !== "rcap-owner-paid-consumer-successor/v3"
      || decision.decisionId !== "MS-NONCONV-PAID-CONSUMER-SUCCESSOR-20260920-V3"
      || decision.status !== "APPROVED_EXACT_PAID_CONSUMER_SUCCESSOR"
      || decision.owner !== "Roger Roman" || decision.decidedAt !== "2026-09-20"
      || decision.authenticationKind !== "owner_instruction_in_current_conversation"
      || decision.newApproval !== true || decision.priorPaidApprovalInvented !== false
      || decision.routeId !== MS_PAID_SUCCESSOR_ROUTE || decision.jurisdiction !== "MS"
      || decision.pathwayId !== MS_PAID_SUCCESSOR_ROUTE.slice(3)
      || decision.trackId !== "ms-nonconv" || decision.packetSetId !== "ms-nonconv-set"
      || decision.consumerPaidAuthorized !== true || decision.priceCents !== 5000 || decision.currency !== "USD"
      || decision.providerId !== "rcap_grade_a_composer_v1" || decision.rendererKind !== "rcap_grade_a_document_v1"
      // The contents change is declared, not assumed, and nothing else is.
      || decision.packetContentsChanged !== true
      || decision.packetContentsChange?.supersededPacketComponentId !== "ms-filing-and-next-steps"
      || decision.packetContentsChange?.supersededBy !== "supplemental_guide"
      || ["eligibilityChanged", "selfHelpStopsChanged", "legalTreatmentChanged", "paymentSecurityWaived", "technicalAcceptanceWaived", "productionAuthorized"].some(key => decision[key] !== false)
      || decision.legacyRetirementPreserved !== true || decision.historicalSponsoredPreviewApprovalPreserved !== true) return null;

    /*
     * Custody of the chain, not just of the immediate predecessor.
     *
     * Each superseded decision must still be present and still be exactly the
     * bytes its successor says it superseded, all the way back to the first one.
     * A check that stopped at the immediate predecessor would let the tail be
     * rewritten while everything loaded, which is the failure this is for.
     */
    const priorBytes = fs.readFileSync(path.join(root, MS_PAID_SUCCESSOR_PRIOR_DECISION_PATH));
    const prior = JSON.parse(priorBytes.toString("utf8"));
    if (decision.supersedes?.path !== MS_PAID_SUCCESSOR_PRIOR_DECISION_PATH
      || decision.supersedes?.decisionId !== "MS-NONCONV-PAID-CONSUMER-SUCCESSOR-20260920"
      || decision.supersedes?.sha256 !== digest(priorBytes)
      || decision.supersedes?.priorDecisionMutated !== false
      || prior.decisionId !== decision.supersedes.decisionId) return null;

    const firstBytes = fs.readFileSync(path.join(root, MS_PAID_SUCCESSOR_FIRST_DECISION_PATH));
    const first = JSON.parse(firstBytes.toString("utf8"));
    if (prior.supersedes?.path !== MS_PAID_SUCCESSOR_FIRST_DECISION_PATH
      || prior.supersedes?.decisionId !== "MS-NONCONV-PAID-CONSUMER-SUCCESSOR-20260914"
      || prior.supersedes?.sha256 !== digest(firstBytes)
      || prior.supersedes?.priorDecisionMutated !== false
      || first.decisionId !== prior.supersedes.decisionId
      || first.packetContentsChanged !== false) return null;

    /*
     * And which bytes moved, stated artifact by artifact against the record being
     * superseded rather than left for a reader to infer from two hashes. The
     * superseding decision has to be RIGHT about what changed: claiming an
     * artifact moved when it did not, or holding one still when it did, is the
     * same defect as an approval that names the wrong bytes.
     */
    const movedFrom = new Map<string, string>(
      (prior.approvedArtifacts ?? []).map((entry: { id: string; sha256: string }) => [entry.id, entry.sha256]));
    const moved = decision.supersedes?.movedArtifacts;
    if (!Array.isArray(moved) || moved.length !== movedFrom.size) return null;
    for (const entry of moved) {
      if (movedFrom.get(entry.id) !== entry.from) return null;
      if (entry.moved !== (entry.from !== entry.to)) return null;
    }
    if (!moved.some((entry: { moved: boolean }) => entry.moved)) return null;

    // Read the exact evidence bytes at statically identifiable paths. Neither an
    // evidence record nor a loop variable can widen filesystem tracing.
    const evidenceBytes = new Map<string, Buffer>([
      [SPECIFICATION, fs.readFileSync(path.join(root, "data/record-clearing/packet-specifications/MS-nonconviction-expungement-99-19-71-4.v1.json"))],
      [SUPPLEMENTAL_GUIDE, fs.readFileSync(path.join(root, "data/record-clearing/supplemental-guides/MS-nonconviction-expungement-99-19-71-4.v1.json"))],
      [REVIEW_EVIDENCE, fs.readFileSync(path.join(root, "data/rcap-ledger/grade-a/ms-nonconviction-successor-review.evidence.json"))],
      [ARTIFACTS, fs.readFileSync(path.join(root, "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.artifacts.json"))],
      [RASTER_REVIEW, fs.readFileSync(path.join(root, "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.participant-delivery.raster-review.json"))]
    ]);
    const expected = [SPECIFICATION, SUPPLEMENTAL_GUIDE, REVIEW_EVIDENCE, ARTIFACTS, RASTER_REVIEW];
    if (!Array.isArray(decision.preservedEvidence) || decision.preservedEvidence.length !== expected.length) return null;
    for (const file of expected) {
      const refs = decision.preservedEvidence.filter((entry: { path?: string }) => entry.path === file);
      if (refs.length !== 1 || refs[0].sha256 !== digest(evidenceBytes.get(file)!)) return null;
    }

    // The approved bytes themselves, read from disk and matched to the decision.
    const approvedArtifacts = decision.approvedArtifacts;
    if (!Array.isArray(approvedArtifacts) || approvedArtifacts.length !== 3) return null;
    const artifactBytes = new Map<string, Buffer>([
      ["full-en", fs.readFileSync(path.join(root, "data/rcap-ledger/grade-a/artifacts/ms-nonconviction-successor-review-full-en.pdf"))],
      ["full-es", fs.readFileSync(path.join(root, "data/rcap-ledger/grade-a/artifacts/ms-nonconviction-successor-review-full-es.pdf"))],
      ["court-only", fs.readFileSync(path.join(root, "data/rcap-ledger/grade-a/artifacts/ms-nonconviction-successor-review-court-only.pdf"))]
    ]);
    const approved: MsPaidSuccessorArtifact[] = [];
    for (const id of ["full-en", "full-es", "court-only"]) {
      const refs = approvedArtifacts.filter((entry: { id?: string }) => entry.id === id);
      if (refs.length !== 1) return null;
      const entry = refs[0];
      if (entry.path !== APPROVED_ARTIFACT_PATHS[id]
        || entry.sha256 !== digest(artifactBytes.get(id)!)
        || typeof entry.pageCount !== "number" || entry.pageCount <= 0) return null;
      // The variant decides whether the guide belongs in the packet, so the
      // decision must say which variant each set of approved bytes is.
      if (id === "court-only"
        ? entry.variant !== "court_only" || entry.guideAssembled !== false
        : entry.variant !== "full" || entry.guideAssembled !== true) return null;
      // The supersession's "to" side is the approved digest, so the account of
      // what moved cannot name bytes this decision does not approve.
      if (moved.find((row: { id?: string }) => row.id === id)?.to !== entry.sha256) return null;
      approved.push(entry as MsPaidSuccessorArtifact);
    }
    if (new Set(approved.map(entry => entry.locale)).size !== 2) return null;

    // The review evidence must describe these exact bytes, produced from this
    // exact specification, guide and assembly, under a participant-delivery
    // fixture with the composer's filing gate enforced.
    const review = JSON.parse(evidenceBytes.get(REVIEW_EVIDENCE)!.toString("utf8"));
    const binding = decision.assemblyBinding ?? {};
    if (review.schemaVersion !== "rcap-successor-review-output/v1"
      || review.routeId !== MS_PAID_SUCCESSOR_ROUTE
      || review.commercialAuthority !== false || review.productionAuthorized !== false
      || review.filingGateEnforced !== true
      || review.generatedFrom?.specificationSha256 !== digest(evidenceBytes.get(SPECIFICATION)!)
      || review.generatedFrom?.supplementalGuideSha256 !== digest(evidenceBytes.get(SUPPLEMENTAL_GUIDE)!)
      || review.generatedFrom?.supplementalGuideIdentity?.contentSha256 !== binding.supplementalGuideContentSha256
      || review.generatedFrom?.assemblyKind !== binding.assemblyKind
      || review.generatedFrom?.assemblyVersion !== binding.assemblyVersion
      || review.generatedFrom?.fixturePath !== binding.reviewFixturePath
      || review.generatedFrom?.fixtureGenerationPurpose !== "participant_delivery"
      || review.generatedFrom?.verificationHash !== binding.reviewFixtureVerificationHash
      || review.generatedFrom?.verifiedAt !== binding.reviewFixtureVerifiedAt
      || review.rasterReview?.status !== "passed") return null;
    for (const entry of approved) {
      const reviewed = review.artifacts?.filter((row: { id?: string }) => row.id === entry.id) ?? [];
      const rastered = review.rasterReview?.artifacts?.filter((row: { id?: string }) => row.id === entry.id) ?? [];
      if (reviewed.length !== 1 || rastered.length !== 1
        || reviewed[0].sha256 !== entry.sha256 || reviewed[0].pageCount !== entry.pageCount
        || reviewed[0].variant !== entry.variant || reviewed[0].locale !== entry.locale
        || reviewed[0].guideAssembled !== entry.guideAssembled
        || rastered[0].sourcePdfSha256 !== entry.sha256
        || rastered[0].pagesReviewed !== entry.pageCount
        || rastered[0].pageSha256?.length !== entry.pageCount) return null;
    }

    const specification = JSON.parse(evidenceBytes.get(SPECIFICATION)!.toString("utf8"));
    const historical = JSON.parse(evidenceBytes.get(ARTIFACTS)!.toString("utf8")).participantDeliveryReview;
    if (specification.routeKey !== decision.routeId || specification.packetFamily !== decision.packetSetId
      || specification.trackId !== decision.trackId
      || specification.specificationId !== binding.specificationId
      || specification.specificationVersion !== binding.specificationVersion
      || historical?.state !== "approved" || historical.decision !== "APPROVE"
      || historical.routeId !== decision.routeId || historical.packetFamily !== decision.packetSetId
      || historical.consumerPaidAuthorized !== false || historical.productionAuthorized !== false
      // The historical review pins the SUPERSEDED specification. Asserting it
      // against the current one would be a false claim that the old approval
      // describes today's bytes, and that is exactly what changed.
      || historical.packetSpecificationSha256 !== decision.supersedes.specificationSha256
      || decision.historicalApprovalStatus?.artifactBytesStillReproduce !== false) return null;

    return {
      decisionId: String(decision.decisionId), routeId: MS_PAID_SUCCESSOR_ROUTE,
      jurisdiction: "MS", pathwayId: MS_PAID_SUCCESSOR_ROUTE.slice(3), trackId: "ms-nonconv", packetFamilyId: "ms-nonconv-set",
      decisionPath: MS_PAID_SUCCESSOR_DECISION_PATH, decisionSha256: digest(bytes),
      supersededDecisionPath: MS_PAID_SUCCESSOR_PRIOR_DECISION_PATH, supersededDecisionSha256: digest(priorBytes),
      specificationPath: SPECIFICATION, specificationSha256: digest(evidenceBytes.get(SPECIFICATION)!),
      supplementalGuidePath: SUPPLEMENTAL_GUIDE, supplementalGuideSha256: digest(evidenceBytes.get(SUPPLEMENTAL_GUIDE)!),
      supplementalGuideContentSha256: String(binding.supplementalGuideContentSha256),
      assemblyKind: String(binding.assemblyKind), assemblyVersion: String(binding.assemblyVersion),
      reviewEvidencePath: REVIEW_EVIDENCE, reviewEvidenceSha256: digest(evidenceBytes.get(REVIEW_EVIDENCE)!),
      reviewFixturePath: String(binding.reviewFixturePath),
      packetContentsChanged: true as const,
      approvedArtifacts: approved,
      historicalApprovalPath: ARTIFACTS, historicalApprovalSha256: digest(evidenceBytes.get(ARTIFACTS)!),
      historicalRasterReviewPath: RASTER_REVIEW, historicalRasterReviewSha256: digest(evidenceBytes.get(RASTER_REVIEW)!)
    };
  } catch { return null; }
}

/** Channel scope only. Callers must establish canonical technical admission
 * first; the historical sponsored posture is never changed by this predicate. */
export function msPaidSuccessorConsumerScope(record: {
  recordId: string; routeId: string; packetFamilyId: string | null;
  packetSpecification: { sha256: string };
}): boolean {
  const approval = loadMsPaidConsumerSuccessor();
  return !!approval && record.recordId === "grade-a-ms-nonconv-paid-consumer-successor-20260920"
    && record.routeId === approval.routeId && record.packetFamilyId === approval.packetFamilyId
    && record.packetSpecification.sha256 === approval.specificationSha256;
}
