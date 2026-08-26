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
    rpcName: "enqueue_packet_render_job",
    expectedHashParameter: "p_expected_verification_hash"
  },
  sponsored_slot_consumption: {
    rpcName: "record_partner_packet_generation",
    expectedHashParameter: "p_expected_verification_hash"
  }
} as const;

export type PacketVerificationCasPoint = keyof typeof PACKET_VERIFICATION_CAS_HANDOFF;

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
