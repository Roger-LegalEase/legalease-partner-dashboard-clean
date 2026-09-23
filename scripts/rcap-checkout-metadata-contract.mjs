// Acceptance expectations only. Application authority remains in the protected
// verification record, consumer identity helpers and the real render preflight.
export function expectedCheckoutMetadata({ userId, stored, personId, matterId, productId, verification, renderInputHash }) {
  if (stored?.user_id !== userId || !stored?.id) throw new Error("metadata authority: owned item required");
  if (!Object.hasOwn(stored, "source_session_id")) throw new Error("metadata authority: source_session_id must be read from the item");
  const expected = {
    channel: "expungement_ai_consumer",
    user_id: userId,
    briefcase_item_id: stored.id,
    product_id: productId,
    person_id: personId,
    matter_id: matterId,
    result_code: stored.result_code,
    source_session_id: stored.source_session_id ?? "",
    jurisdiction: stored.jurisdiction,
    packet_type: stored.packet_type,
    pathway_id: verification.snapshot.pathwayId,
    verification_hash: verification.hash,
    render_input_hash: renderInputHash
  };
  for (const [key, value] of Object.entries(expected)) {
    if (typeof value !== "string" || (!value && key !== "source_session_id")) {
      throw new Error(`metadata authority: ${key} is absent`);
    }
  }
  for (const key of ["verification_hash", "render_input_hash"]) {
    if (!/^[a-f0-9]{64}$/.test(expected[key])) throw new Error(`metadata authority: ${key} is not an exact hash`);
  }
  return expected;
}

export async function checkoutMetadataExpectation({ userId, stored, personRow, protectedVerification }) {
  const { consumerMatterIdForItem, consumerPersonMatchKey, CONSUMER_PERSON_NAMESPACE } =
    await import("../src/lib/expungement-ai/consumer-identity.ts");
  const { CONSUMER_PACKET_PRODUCT_ID } = await import("../src/lib/expungement-ai/consumer-payment-authority.ts");
  const { requireCurrentPacketVerificationRecord } = await import("../src/lib/expungement-ai/packet-information.ts");
  const { readyToPurchase } = await import("../src/lib/expungement-ai/render-preflight.ts");
  if (!personRow?.id || personRow.partner_slug !== CONSUMER_PERSON_NAMESPACE
    || personRow.match_key !== consumerPersonMatchKey(userId)) throw new Error("metadata authority: consumer person mismatch");
  const verification = requireCurrentPacketVerificationRecord(
    { id: stored.id, state: stored.jurisdiction, artifactRefs: {} }, protectedVerification
  );
  const snapshot = verification.snapshot;
  const preflight = readyToPurchase({
    snapshot,
    verificationHash: verification.hash,
    facts: {
      ...snapshot.screeningAnswers,
      ...snapshot.prefilledAnswers,
      ...snapshot.packetAnswers,
      ...snapshot.serverFacts
    }
  });
  if (!preflight.ready) throw new Error(`metadata authority: render preflight refused: ${preflight.reason}`);
  return expectedCheckoutMetadata({
    userId, stored, personId: personRow.id,
    matterId: consumerMatterIdForItem(stored.id), productId: CONSUMER_PACKET_PRODUCT_ID,
    verification, renderInputHash: preflight.renderInputHash
  });
}

export function checkoutMetadataEvidence(actual, expected) {
  const failures = [];
  if (!actual || typeof actual !== "object" || Array.isArray(actual)) {
    return { passed: false, failures: ["metadata: missing object"] };
  }
  for (const [key, value] of Object.entries(expected)) {
    // Stripe may omit an empty value, but only an actually null/empty server
    // source session permits that equivalence. A claimed item's UUID must match.
    const observed = key === "source_session_id" && value === "" ? (actual[key] ?? "") : actual[key];
    if (observed !== value) failures.push(`${key}: binding mismatch`);
  }
  for (const key of Object.keys(actual)) {
    if (!Object.hasOwn(expected, key)) failures.push(`${key}: unexpected metadata key`);
  }
  return { passed: failures.length === 0, failures };
}
