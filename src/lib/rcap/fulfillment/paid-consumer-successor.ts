import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export const MS_PAID_SUCCESSOR_DECISION_PATH = "data/record-clearing/legal-decisions/2026-09-14-ms-nonconv-paid-consumer-successor.json";
export const MS_PAID_SUCCESSOR_ROUTE = "MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal";
const SPECIFICATION = "data/record-clearing/packet-specifications/MS-nonconviction-expungement-99-19-71-4.v1.json";
const ARTIFACTS = "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.artifacts.json";
const RASTER_REVIEW = "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.participant-delivery.raster-review.json";
const digest = (bytes: Buffer | string) => crypto.createHash("sha256").update(bytes).digest("hex");

/** Exact commercial-scope adoption of unchanged approved output, not a new
 * packet verdict or an exception to the legacy retirement. Missing or changed
 * evidence supplies no successor; every technical/payment gate still applies. */
export function loadMsPaidConsumerSuccessor(root = process.cwd()) {
  try {
    const bytes = fs.readFileSync(path.join(root, MS_PAID_SUCCESSOR_DECISION_PATH));
    const decision = JSON.parse(bytes.toString("utf8"));
    if (decision.schemaVersion !== "rcap-owner-paid-consumer-successor/v1"
      || decision.decisionId !== "MS-NONCONV-PAID-CONSUMER-SUCCESSOR-20260914"
      || decision.status !== "APPROVED_EXACT_PAID_CONSUMER_SUCCESSOR"
      || decision.owner !== "Roger Roman" || decision.decidedAt !== "2026-09-14"
      || decision.authenticationKind !== "owner_instruction_in_current_conversation"
      || decision.newApproval !== true || decision.priorPaidApprovalInvented !== false
      || decision.routeId !== MS_PAID_SUCCESSOR_ROUTE || decision.jurisdiction !== "MS"
      || decision.pathwayId !== MS_PAID_SUCCESSOR_ROUTE.slice(3)
      || decision.trackId !== "ms-nonconv" || decision.packetSetId !== "ms-nonconv-set"
      || decision.consumerPaidAuthorized !== true || decision.priceCents !== 5000 || decision.currency !== "USD"
      || decision.providerId !== "rcap_grade_a_composer_v1" || decision.rendererKind !== "rcap_grade_a_document_v1"
      || ["packetContentsChanged", "eligibilityChanged", "selfHelpStopsChanged", "legalTreatmentChanged", "paymentSecurityWaived", "technicalAcceptanceWaived", "productionAuthorized"].some(key => decision[key] !== false)
      || decision.legacyRetirementPreserved !== true || decision.historicalSponsoredPreviewApprovalPreserved !== true) return null;
    const expected = [SPECIFICATION, ARTIFACTS, RASTER_REVIEW];
    if (!Array.isArray(decision.preservedEvidence) || decision.preservedEvidence.length !== expected.length) return null;
    // Read the exact original evidence bytes at statically identifiable paths.
    // Neither an evidence record nor a loop variable can widen filesystem tracing.
    const evidenceBytes = new Map<string, Buffer>([
      [SPECIFICATION, fs.readFileSync(path.join(root, "data/record-clearing/packet-specifications/MS-nonconviction-expungement-99-19-71-4.v1.json"))],
      [ARTIFACTS, fs.readFileSync(path.join(root, "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.artifacts.json"))],
      [RASTER_REVIEW, fs.readFileSync(path.join(root, "data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.participant-delivery.raster-review.json"))]
    ]);
    for (const file of expected) {
      const refs = decision.preservedEvidence.filter((entry: {path?:string}) => entry.path === file);
      if (refs.length !== 1 || refs[0].sha256 !== digest(evidenceBytes.get(file)!)) return null;
    }
    const specification = JSON.parse(evidenceBytes.get(SPECIFICATION)!.toString("utf8"));
    const artifacts = JSON.parse(evidenceBytes.get(ARTIFACTS)!.toString("utf8"));
    const prior = artifacts.participantDeliveryReview;
    if (specification.routeKey !== decision.routeId || specification.packetFamily !== decision.packetSetId
      || specification.trackId !== decision.trackId || prior?.state !== "approved" || prior.decision !== "APPROVE"
      || prior.routeId !== decision.routeId || prior.packetFamily !== decision.packetSetId
      || prior.consumerPaidAuthorized !== false || prior.productionAuthorized !== false
      || prior.packetSpecificationSha256 !== digest(evidenceBytes.get(SPECIFICATION)!)) return null;
    return {
      decisionId: String(decision.decisionId), routeId: MS_PAID_SUCCESSOR_ROUTE,
      jurisdiction: "MS", pathwayId: MS_PAID_SUCCESSOR_ROUTE.slice(3), trackId: "ms-nonconv", packetFamilyId: "ms-nonconv-set",
      decisionPath: MS_PAID_SUCCESSOR_DECISION_PATH, decisionSha256: digest(bytes),
      specificationPath: SPECIFICATION, specificationSha256: digest(evidenceBytes.get(SPECIFICATION)!),
      historicalApprovalPath: ARTIFACTS, historicalApprovalSha256: digest(evidenceBytes.get(ARTIFACTS)!)
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
  return !!approval && record.recordId === "grade-a-ms-nonconv-paid-consumer-successor-20260914"
    && record.routeId === approval.routeId && record.packetFamilyId === approval.packetFamilyId
    && record.packetSpecification.sha256 === approval.specificationSha256;
}
