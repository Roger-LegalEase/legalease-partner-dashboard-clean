import "server-only";

/**
 * The per-request half of a commercial admission.
 *
 * A fulfillment record proves things about a ROUTE: this jurisdiction, this
 * packet family, this specification, this provider. It says nothing about the
 * person in front of us. `docs/PRODUCT_CONTRACT.md` is explicit that route
 * provenness is not sufficient on its own — stage 8 requires a versioned,
 * server-authoritative final verification bound to `matter_id · owner_user_id ·
 * fact snapshot · route contract version · legal-rule version · waiting-period
 * calculation · packet family · form-set version · form-set hash`, and only
 * `VERIFIED_PACKET_READY` may enter checkout or sponsored entitlement.
 *
 * Correction 5 of that contract is the reason this is a separate layer rather
 * than more fields on the record: a payment is a durable financial fact, and it
 * is NOT permanent authority to generate any future packet configuration. When a
 * participant changes a material answer, the payment survives and the
 * verification snapshot does not. A route-level record cannot express that,
 * because the route did not change — the matter did.
 *
 * So an admission needs both halves, and every field here is server-resolved.
 * None of it may arrive in a request body: a participant who can assert their own
 * verification outcome has the same power as a participant who can assert their
 * own payment status, which phase 52 already took away.
 */

// Type-only, and deliberately so: the authority imports this module's
// collectContextDenials at runtime, so a value import here would close a cycle.
// TypeScript erases this line, leaving no runtime edge. The requirement table
// below is the runtime membership check, and a test asserts its keys are exactly
// the authority's declared admission points, so the two cannot drift apart.
import type { CommercialAdmissionPoint } from "@/lib/rcap/fulfillment/grade-a-authority";

/** The contract's stage-8 outcome vocabulary. Only the first one proceeds. */
export type FinalVerificationOutcome =
  | "VERIFIED_PACKET_READY"
  | "VERIFICATION_PENDING"
  | "VERIFICATION_FAILED"
  | "VERIFICATION_INVALIDATED";

/**
 * The stage-8 snapshot, as the contract enumerates it. The bindings are carried
 * so the admission can prove the snapshot is about THIS route and THIS form set,
 * rather than merely existing and being recent.
 */
export type FinalVerificationSnapshot = {
  snapshotId: string;
  outcome: FinalVerificationOutcome;
  matterId: string;
  ownerUserId: string;
  boundRouteId: string;
  boundPacketFamilyId: string | null;
  routeContractVersion: string;
  legalRuleVersion: string;
  factSnapshotSha256: string;
  formSetVersion: string;
  formSetSha256: string;
  verifiedAt: string;
  /** Set when a material answer changed after verification. */
  invalidated: boolean;
  invalidationReason: string | null;
};

export type EntitlementKind = "consumer_payment" | "sponsored_credit";

/**
 * How this admission is being paid for, and the key that makes it exactly-once.
 *
 * Consumer and sponsored entitlements are the same shape on purpose. The
 * contract requires both to pass the same legal, verification, packet and
 * Grade-A authority, and a differently-shaped sponsored path is how that
 * requirement quietly stops being true.
 */
export type EntitlementContext = {
  kind: EntitlementKind;
  /** Absent means the caller cannot make this exactly-once, so it may not proceed. */
  idempotencyKey: string | null;
  /** True once this entitlement has already been consumed by a first generation. */
  alreadyConsumed: boolean;
  /**
   * For sponsored: whether the sponsor's own eligibility still holds. For
   * consumer: whether a server-verified payment event exists. Never a client fact.
   */
  serverVerified: boolean;
};

export type ArtifactStorageContext = {
  /** Private storage only. A publicly reachable artifact is not deliverable. */
  privateStorage: boolean;
  artifactSha256: string | null;
  /** True when this is not the participant's first download of the same artifact. */
  repeatDownload: boolean;
};

export type FulfillmentRequestContext = {
  /** The authenticated participant. A Briefcase may not be anonymous. */
  participantUserId: string;
  matterId: string;
  /** The matter's owner as the server knows it, not as the request claims. */
  matterOwnerUserId: string;
  finalVerification: FinalVerificationSnapshot | null;
  entitlement: EntitlementContext | null;
  storage: ArtifactStorageContext | null;
};

/** What each admission point needs from the context beyond a proven route. */
export type ContextRequirement = {
  ownership: boolean;
  finalVerification: boolean;
  entitlement: boolean;
  storage: boolean;
};

/**
 * The requirement table.
 *
 * `launch_graph_commercial_status` is the one point that asks about a route
 * without a participant in front of it — it reports whether a route COULD be
 * sold, not whether this person may buy it — so it requires no context. Every
 * other point touches a participant's money, credit, matter or files.
 */
export const ADMISSION_CONTEXT_REQUIREMENTS: Record<CommercialAdmissionPoint, ContextRequirement> = {
  consumer_checkout: { ownership: true, finalVerification: true, entitlement: false, storage: false },
  sponsored_entitlement: { ownership: true, finalVerification: true, entitlement: true, storage: false },
  packet_credit_admission: { ownership: true, finalVerification: true, entitlement: true, storage: false },
  generation_admission: { ownership: true, finalVerification: true, entitlement: true, storage: false },
  provider_dispatch: { ownership: true, finalVerification: true, entitlement: true, storage: false },
  artifact_commercial_attachment: { ownership: true, finalVerification: true, entitlement: false, storage: true },
  briefcase_ready: { ownership: true, finalVerification: true, entitlement: false, storage: true },
  private_download: { ownership: true, finalVerification: true, entitlement: false, storage: true },
  repeat_download: { ownership: true, finalVerification: true, entitlement: false, storage: true },
  launch_graph_commercial_status: { ownership: false, finalVerification: false, entitlement: false, storage: false }
};

function nonEmpty(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Every reason this participant may not take this action on this route, given a
 * route that is otherwise proven. Sorted for determinism.
 *
 * The route bindings are checked against the record's own identity, so a
 * verification snapshot taken for one route cannot admit another — the same rule
 * the route-level authority applies to itself, applied to the snapshot.
 */
export function collectContextDenials(input: {
  admissionPoint: CommercialAdmissionPoint;
  context: FulfillmentRequestContext | null | undefined;
  routeId: string;
  packetFamilyId: string | null;
}): string[] {
  const { admissionPoint, context, routeId, packetFamilyId } = input;

  if (!Object.prototype.hasOwnProperty.call(ADMISSION_CONTEXT_REQUIREMENTS, admissionPoint)) {
    return [`context: ${String(admissionPoint)} is not a recognised commercial admission point`];
  }

  const required = ADMISSION_CONTEXT_REQUIREMENTS[admissionPoint];
  const needsAnything = required.ownership || required.finalVerification || required.entitlement || required.storage;
  if (!needsAnything) return [];

  if (!context) {
    return ["context: this admission point requires a server-resolved participant context and none was supplied"];
  }

  const denials: string[] = [];

  if (required.ownership) {
    if (!nonEmpty(context.participantUserId)) {
      denials.push("ownership: no authenticated participant; a Briefcase may not be anonymous");
    }
    if (!nonEmpty(context.matterId)) {
      denials.push("ownership: no matter; a pending result is not a matter");
    }
    if (!nonEmpty(context.matterOwnerUserId) || context.matterOwnerUserId !== context.participantUserId) {
      denials.push("ownership: the participant does not own this matter");
    }
  }

  if (required.finalVerification) {
    const snapshot = context.finalVerification;
    if (!snapshot) {
      denials.push("final_verification: no verification snapshot is bound to this matter");
    } else {
      if (snapshot.outcome !== "VERIFIED_PACKET_READY") {
        denials.push(`final_verification: outcome is ${snapshot.outcome}, and only VERIFIED_PACKET_READY proceeds`);
      }
      if (snapshot.invalidated) {
        denials.push(`final_verification: the snapshot was invalidated (${snapshot.invalidationReason ?? "no reason recorded"}); a payment survives this, generation authority does not`);
      }
      if (snapshot.boundRouteId !== routeId) {
        denials.push(`final_verification: the snapshot verifies ${snapshot.boundRouteId}, not ${routeId}`);
      }
      if ((snapshot.boundPacketFamilyId ?? null) !== (packetFamilyId ?? null)) {
        denials.push(`final_verification: the snapshot verifies packet family ${snapshot.boundPacketFamilyId ?? "none"}, not ${packetFamilyId ?? "none"}`);
      }
      if (required.ownership && snapshot.matterId !== context.matterId) {
        denials.push("final_verification: the snapshot belongs to a different matter");
      }
      if (required.ownership && snapshot.ownerUserId !== context.matterOwnerUserId) {
        denials.push("final_verification: the snapshot belongs to a different owner");
      }
      for (const [label, value] of [
        ["routeContractVersion", snapshot.routeContractVersion],
        ["legalRuleVersion", snapshot.legalRuleVersion],
        ["factSnapshotSha256", snapshot.factSnapshotSha256],
        ["formSetVersion", snapshot.formSetVersion],
        ["formSetSha256", snapshot.formSetSha256]
      ] as const) {
        if (!nonEmpty(value)) denials.push(`final_verification: the snapshot has no ${label}`);
      }
    }
  }

  if (required.entitlement) {
    const entitlement = context.entitlement;
    if (!entitlement) {
      denials.push("entitlement: no consumer payment or sponsored credit backs this admission");
    } else {
      if (!entitlement.serverVerified) {
        denials.push(`entitlement: the ${entitlement.kind} was not verified server-side`);
      }
      if (!nonEmpty(entitlement.idempotencyKey)) {
        denials.push("entitlement: an idempotency key is required so this cannot charge or consume twice");
      }
      if (entitlement.alreadyConsumed && admissionPoint !== "provider_dispatch") {
        // A retry of the same render against an already-consumed entitlement is
        // the behaviour the contract requires on render failure: retry safely
        // with the same idempotency key, do not consume another credit. Every
        // other point consuming a spent entitlement is a double charge.
        denials.push("entitlement: this entitlement was already consumed; a second consumption is a double charge");
      }
    }
  }

  if (required.storage) {
    const storage = context.storage;
    if (!storage) {
      denials.push("storage: no artifact storage context was supplied");
    } else {
      if (!storage.privateStorage) {
        denials.push("storage: the artifact is not in private storage; packet files are never publicly reachable");
      }
      if (!nonEmpty(storage.artifactSha256)) {
        denials.push("storage: the stored artifact has no SHA-256 to bind delivery to");
      }
      if (admissionPoint === "repeat_download" && !storage.repeatDownload) {
        denials.push("storage: repeat_download was asked about an artifact with no prior download");
      }
    }
  }

  return denials.sort();
}

/**
 * True when two admissions differ only in how they are paid for.
 *
 * Used to prove consumer/sponsored parity: the same route, matter and
 * verification must produce the same denials whichever entitlement backs it, and
 * the only permitted difference is the entitlement kind itself.
 */
export function withEntitlementKind(
  context: FulfillmentRequestContext,
  kind: EntitlementKind
): FulfillmentRequestContext {
  return {
    ...context,
    entitlement: context.entitlement ? { ...context.entitlement, kind } : null
  };
}
