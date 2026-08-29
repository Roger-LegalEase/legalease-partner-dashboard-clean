import "server-only";

import { admitCommercial } from "@/lib/rcap/fulfillment/grade-a-admission";
import {
  routeIdFor,
  type AdmissionRequestIdentity,
  type CommercialAdmissionDecision,
  type CommercialAdmissionPoint
} from "@/lib/rcap/fulfillment/grade-a-authority";
import type {
  ArtifactStorageContext,
  EntitlementContext,
  EntitlementKind,
  FinalVerificationSnapshot,
  FulfillmentRequestContext
} from "@/lib/rcap/fulfillment/grade-a-request-context";
import { packetSpecificationFor } from "@/lib/rcap/grade-a/packet-specification";
import type { PacketVerificationSnapshot } from "@/lib/expungement-ai/types";

/**
 * How Lane F consumes the Grade-A authority. It decides nothing.
 *
 * Every commercial admission point in this product calls `admitCommercial` and
 * only `admitCommercial`. What this module adds is the part that is not a rule:
 * turning one denial into one typed refusal, with an HTTP status and a sentence
 * a participant can read. There is no eligibility logic here, no override, and
 * no argument by which a caller can assert a conclusion — `governCommercialAdmission`
 * forwards its three arguments and throws on whatever comes back denied.
 *
 * That distinction is the whole point of the lane. A second place that decides
 * commercial eligibility is the failure this wiring exists to remove, so the
 * only branch below is on a denial that has *already been decided elsewhere*.
 *
 * `scripts/verify-rcap-lane-f-commercial-admission.mjs` imports
 * COMMERCIAL_ADMISSION_POINTS from the authority and fails unless every exported
 * point has exactly one governed call site. A point added upstream fails the
 * build until it is gated here; a point removed upstream fails until its call
 * site goes. Neither list can drift silently, because neither list is restated.
 */

/**
 * A refused commercial admission.
 *
 * `contextDenials` names matter ids, owner ids and verification state, so it is
 * carried for the server log and deliberately kept off `participantMessage`.
 * Callers serialising this error must send `denialCode` and `participantMessage`
 * and nothing else.
 */
export class CommercialAdmissionDeniedError extends Error {
  readonly admissionPoint: CommercialAdmissionPoint;
  readonly denialCode: string;
  readonly httpStatus: number;
  readonly participantMessage: string;
  readonly contextDenials: readonly string[];
  readonly decision: CommercialAdmissionDecision;

  constructor(decision: CommercialAdmissionDecision) {
    const denialCode = decision.denialCode ?? "fulfillment_no_record";
    super(`${decision.admissionPoint} refused (${denialCode}): ${decision.reason}`);
    this.name = "CommercialAdmissionDeniedError";
    this.admissionPoint = decision.admissionPoint;
    this.denialCode = denialCode;
    this.contextDenials = Object.freeze([...decision.contextDenials]);
    this.httpStatus = commercialAdmissionHttpStatus(denialCode, decision.contextDenials);
    this.participantMessage = participantCopyFor(denialCode, decision.contextDenials);
    this.decision = decision;
  }
}

/** The contract's status table. A stale proof is a retry; a missing one is not. */
export function commercialAdmissionHttpStatus(denialCode: string, contextDenials: readonly string[] = []): number {
  switch (denialCode) {
    case "fulfillment_stale":
    case "fulfillment_superseded":
      return 409;
    case "client_supplied_authority":
    case "route_identity_required":
      return 400;
    case "unknown_admission_point":
      return 500;
    case "participant_context_denied":
      // A verification that went stale under the participant is a retry once
      // they re-verify. Every other participant denial is a refusal.
      return contextDenials.some((denial) => denial.startsWith("final_verification:")) ? 409 : 403;
    default:
      return 403;
  }
}

const UNAVAILABLE = "This isn’t available yet. Your information is saved in your Briefcase.";

/**
 * What the participant is told.
 *
 * `route_binding_mismatch` deliberately returns the generic refusal: naming the
 * other route would confirm which routes hold proven records to anyone able to
 * vary a request.
 */
export function participantCopyFor(denialCode: string, contextDenials: readonly string[] = []): string {
  switch (denialCode) {
    case "fulfillment_stale":
      return "We’re re-checking this route. Your information is saved — please try again shortly.";
    case "fulfillment_superseded":
      return "This route was just updated. Please try again.";
    case "participant_context_denied":
      return participantContextCopyFor(contextDenials);
    case "unknown_admission_point":
    case "client_supplied_authority":
    case "route_identity_required":
      return "Something went wrong on our side. Your information is saved. Please try again, and contact support if the problem continues.";
    default:
      return UNAVAILABLE;
  }
}

function participantContextCopyFor(contextDenials: readonly string[]): string {
  const has = (prefix: string) => contextDenials.some((denial) => denial.startsWith(prefix));

  if (has("ownership:")) {
    return "Please sign in again to continue with this case.";
  }
  if (has("final_verification:")) {
    // The invalidated case is the one the participant caused and can fix, so it
    // gets the sentence that says what changed. The payment is untouched.
    return contextDenials.some((denial) => denial.includes("invalidated"))
      ? "Your answers changed, so we need to re-check your information before continuing. Your payment is safe."
      : "Please finish reviewing your information before continuing.";
  }
  if (has("entitlement:")) {
    return "We couldn’t confirm your payment for this packet. Your information is saved in your Briefcase.";
  }
  if (has("storage:")) {
    return "Your packet isn’t ready to download yet.";
  }
  return UNAVAILABLE;
}

/**
 * The one call every admission point makes.
 *
 * It forwards to `admitCommercial` unchanged and throws on a denial. It takes no
 * flag that could soften the answer, and it returns the decision rather than a
 * boolean so a caller cannot mistake "denied" for "false".
 */
export function governCommercialAdmission(
  admissionPoint: CommercialAdmissionPoint,
  identity: AdmissionRequestIdentity,
  context?: FulfillmentRequestContext | null
): CommercialAdmissionDecision {
  const decision = admitCommercial(admissionPoint, identity, context ?? null);
  if (!decision.admitted) throw new CommercialAdmissionDeniedError(decision);
  return decision;
}

/**
 * The packet family a route delivers, resolved from the packet specification.
 *
 * Deliberately NOT read from the fulfillment record. The admission compares the
 * family the server believes this route delivers against the family the record
 * proves; taking that value from the record itself would make the comparison
 * agree with itself and quietly retire a real check. The specification is the
 * independent server-side statement of the same fact, and a route with no
 * specification resolves to null, which the authority refuses against any record
 * that names a family.
 */
export function resolvePacketFamilyId(routeId: string): string | null {
  return packetSpecificationFor(routeId)?.packetFamily ?? null;
}

/** The route identity an admission asks about, assembled from server facts only. */
export function commercialRouteIdentity(input: {
  jurisdiction: string | null | undefined;
  pathwayId: string | null | undefined;
  packetFamilyId?: string | null;
}): AdmissionRequestIdentity {
  const jurisdiction = String(input.jurisdiction ?? "").trim().toUpperCase();
  const routeId = routeIdFor(jurisdiction, String(input.pathwayId ?? "").trim());
  return {
    routeId,
    jurisdiction,
    packetFamilyId: input.packetFamilyId === undefined ? resolvePacketFamilyId(routeId) : input.packetFamilyId
  };
}

/**
 * The stage-8 snapshot, translated from the shape this product already stores.
 *
 * The translation is total and lossless in the direction that matters: every
 * field the authority checks is carried across, and a field this product cannot
 * supply becomes an empty string rather than a plausible default, because the
 * authority denies on a missing binding and inventing one would be the second
 * rule this lane exists to avoid.
 *
 * `invalidated` is passed in rather than read from the snapshot: a
 * PacketVerificationSnapshot is the *verified* record, and whether a material
 * answer changed after it was taken lives on the surrounding
 * PacketVerificationRecord.
 */
export function finalVerificationSnapshotFrom(input: {
  snapshot: PacketVerificationSnapshot;
  verificationHash: string;
  matterId: string;
  ownerUserId: string;
  packetFamilyId: string | null;
  invalidated?: boolean;
  invalidationReason?: string | null;
}): FinalVerificationSnapshot {
  const { snapshot } = input;
  const jurisdiction = String(snapshot.jurisdiction ?? "").trim().toUpperCase();
  return {
    snapshotId: input.verificationHash,
    outcome: "VERIFIED_PACKET_READY",
    matterId: input.matterId,
    ownerUserId: input.ownerUserId,
    boundRouteId: routeIdFor(jurisdiction, String(snapshot.pathwayId ?? "").trim()),
    boundPacketFamilyId: input.packetFamilyId,
    routeContractVersion: snapshot.profileVersion ?? "",
    legalRuleVersion: snapshot.profileAuthorityFingerprint ?? "",
    factSnapshotSha256: input.verificationHash,
    formSetVersion: snapshot.packetFamilyIdentifiers?.mode ?? "",
    formSetSha256: snapshot.profileSourceFingerprint ?? "",
    verifiedAt: snapshot.verifiedAt,
    invalidated: input.invalidated === true,
    invalidationReason: input.invalidationReason ?? null
  };
}

/** A verification the server could not produce. Denied, and denied by name. */
export function unverifiedFinalVerification(input: {
  matterId: string;
  ownerUserId: string;
  routeId: string;
  packetFamilyId: string | null;
  outcome: "VERIFICATION_PENDING" | "VERIFICATION_FAILED" | "VERIFICATION_INVALIDATED";
  reason: string | null;
}): FinalVerificationSnapshot {
  return {
    snapshotId: "",
    outcome: input.outcome,
    matterId: input.matterId,
    ownerUserId: input.ownerUserId,
    boundRouteId: input.routeId,
    boundPacketFamilyId: input.packetFamilyId,
    routeContractVersion: "",
    legalRuleVersion: "",
    factSnapshotSha256: "",
    formSetVersion: "",
    formSetSha256: "",
    verifiedAt: "",
    invalidated: input.outcome === "VERIFICATION_INVALIDATED",
    invalidationReason: input.reason
  };
}

/**
 * A consumer payment or a sponsored credit, in the one shape the authority
 * takes. Both kinds go through this function precisely so that neither can grow
 * a field the other lacks.
 */
export function entitlementContext(input: {
  kind: EntitlementKind;
  idempotencyKey: string | null;
  alreadyConsumed: boolean;
  serverVerified: boolean;
}): EntitlementContext {
  return {
    kind: input.kind,
    idempotencyKey: input.idempotencyKey,
    alreadyConsumed: input.alreadyConsumed,
    serverVerified: input.serverVerified
  };
}

export function artifactStorageContext(input: {
  privateStorage: boolean;
  artifactSha256: string | null;
  repeatDownload: boolean;
}): ArtifactStorageContext {
  return {
    privateStorage: input.privateStorage,
    artifactSha256: input.artifactSha256,
    repeatDownload: input.repeatDownload
  };
}

export function fulfillmentRequestContext(input: {
  participantUserId: string;
  matterId: string;
  matterOwnerUserId: string;
  finalVerification?: FinalVerificationSnapshot | null;
  entitlement?: EntitlementContext | null;
  storage?: ArtifactStorageContext | null;
}): FulfillmentRequestContext {
  return {
    participantUserId: input.participantUserId,
    matterId: input.matterId,
    matterOwnerUserId: input.matterOwnerUserId,
    finalVerification: input.finalVerification ?? null,
    entitlement: input.entitlement ?? null,
    storage: input.storage ?? null
  };
}

/**
 * The refusal body. `denialCode` and one sentence — never `contextDenials`,
 * never `authority.missingProof`, never the route a mismatched record proves.
 */
export function commercialAdmissionRefusalBody(error: CommercialAdmissionDeniedError): {
  error: string;
  resultCode: string;
} {
  return { error: error.participantMessage, resultCode: error.denialCode };
}
