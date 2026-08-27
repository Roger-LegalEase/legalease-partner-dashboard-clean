/**
 * Application contract for the captain-owned database compare-and-set gate.
 *
 * These names deliberately describe the target RPC surface before the
 * migration lands. Current callers still perform server-side verification
 * immediately before each operation; only the database can close the final
 * read/write race by comparing the protected current hash in the same
 * transaction that performs the mutation.
 */
export const PACKET_VERIFICATION_CAS_HANDOFF = {
  checkout_binding: {
    rpcName: "bind_consumer_checkout_verification",
    expectedHashParameter: "p_expected_verification_hash"
  },
  payment_entitlement: {
    rpcName: "record_consumer_packet_payment",
    expectedHashParameter: "p_expected_verification_hash"
  },
  artifact_attach: {
    rpcName: "attach_consumer_packet_artifact_if_verified",
    expectedHashParameter: "p_expected_verification_hash"
  },
  render_enqueue: {
    rpcName: "enqueue_verified_consumer_packet_render",
    expectedHashParameter: "p_expected_verification_hash",
    atomicPayloadParameters: ["p_render_packet", "p_render_input_payload"]
  },
  sponsored_slot_consumption: {
    rpcName: "finalize_sponsored_packet_generation_if_verified",
    expectedHashParameter: "p_expected_verification_hash"
  }
} as const;

export type PacketVerificationCasPoint = keyof typeof PACKET_VERIFICATION_CAS_HANDOFF;

/** Exact captain migration/RPC application handoff; no SQL is owned here. */
export const PACKET_VERIFICATION_CAS_CALL_SITES = {
  checkout_binding: {
    applicationFunction: "payment-adapter.persistCheckoutBinding -> consumer-payment-authority.persistConsumerCheckoutBinding",
    currentMutation: "direct consumer_briefcase_items UPDATE",
    requiredAtomicMutation: "lock protected verification; compare expected hash; bind checkout/product/person/matter",
    failureCompensation: "expire a newly-created open Stripe Checkout Session when the CAS refuses"
  },
  payment_entitlement: {
    applicationFunction: "checkout-reconciliation.recordVerifiedConsumerPayment -> consumer-payment-authority.recordConsumerPacketPayment",
    currentMutation: "record_consumer_packet_payment RPC",
    requiredAtomicMutation: "compare protected hash while recording provider evidence and entitlement",
    captainWarning: "RecordConsumerPaymentInput validates expectedVerificationHash, but the live RPC payload does not yet send p_expected_verification_hash"
  },
  artifact_attach: {
    applicationFunction: "packet-generation.attachPacketToBriefcaseItem -> briefcase.updateBriefcasePacketMetadata{,ForWebhook}",
    currentMutation: "application read/merge/UPDATE",
    requiredAtomicMutation: "compare protected hash; merge current artifact envelope; attach DTC Ready without replacing commercialFlow/verification"
  },
  render_enqueue: {
    applicationFunction: "consumer-render-request.requestConsumerPacketRenderInternal -> job-queue.enqueueVerifiedConsumerRender",
    currentMutation: "enqueue_verified_consumer_packet_render RPC (captain SQL pending)",
    requiredAtomicMutation: "lock protected hash; immutable-insert exact render packet/input keyed by packet id + input hash; enqueue one job"
  },
  sponsored_slot_consumption: {
    applicationFunction: "packet/generate route -> rcap-slot-lifecycle.finalizeSponsoredPacketGeneration",
    currentMutation: "finalize_sponsored_packet_generation_if_verified RPC (captain SQL pending)",
    requiredAtomicMutation: "lock protected hash; consume included/overage credit; merge artifact; set Ready together; refusal mutates nothing"
  }
} as const;

export type ExpectedPacketVerification = {
  expectedVerificationHash: string;
};

export function assertExpectedPacketVerificationHash(value: string): string {
  if (!/^[a-f0-9]{64}$/.test(value)) {
    throw new Error("A canonical 64-character packet verification hash is required.");
  }
  return value;
}

/** Transitional reader for application-level checks until verification moves to protected storage. */
export function storedPacketVerificationHash(artifactRefs: unknown): string | null {
  if (!isRecord(artifactRefs)) return null;
  const commercialFlow = artifactRefs.commercialFlow;
  if (!isRecord(commercialFlow)) return null;
  const verification = commercialFlow.verification;
  if (!isRecord(verification) || verification.status !== "verified" || typeof verification.hash !== "string") return null;
  return /^[a-f0-9]{64}$/.test(verification.hash) ? verification.hash : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
