import "server-only";

import type { PacketVerificationRecord, PacketVerificationSnapshot } from "@/lib/expungement-ai/types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

/** Exact application surface for the captain-owned protected-state migration. */
export const PACKET_VERIFICATION_CAS_HANDOFF = {
  verification_persistence: {
    rpcName: "persist_consumer_packet_verification",
    atomicPayloadParameters: [
      "p_consumer_auth_user_id",
      "p_briefcase_item_id",
      "p_expected_prior_hash",
      "p_expected_prior_revision",
      "p_answer_delta",
      "p_packet_information_metadata",
      "p_next_draft_hash",
      "p_next_draft_snapshot",
      "p_next_verification_status",
      "p_next_verification_reason",
      "p_next_verification_hash",
      "p_next_verification_snapshot",
      "p_next_verification_invalidated_at"
    ]
  },
  artifact_authority: {
    rpcName: "get_consumer_packet_artifact_authority",
    atomicPayloadParameters: ["p_consumer_auth_user_id", "p_briefcase_item_id"]
  },
  presentation_source: {
    rpcName: "get_consumer_briefcase_presentation_source",
    atomicPayloadParameters: ["p_consumer_auth_user_id", "p_briefcase_item_id"]
  },
  checkout_binding: {
    rpcName: "bind_consumer_checkout_verification",
    expectedHashParameter: "p_expected_verification_hash",
    atomicPayloadParameters: [
      "p_consumer_auth_user_id",
      "p_briefcase_item_id",
      "p_checkout_session_id",
      "p_payment_provider",
      "p_product_id",
      "p_person_id",
      "p_matter_id",
      "p_expected_verification_hash"
    ]
  },
  payment_entitlement: {
    rpcName: "record_consumer_packet_payment",
    expectedHashParameter: "p_expected_verification_hash",
    atomicPayloadParameters: [
      "p_briefcase_item_id",
      "p_payment_status",
      "p_amount_cents",
      "p_currency",
      "p_payment_provider",
      "p_provider_event_id",
      "p_checkout_session_id",
      "p_payment_intent_id",
      "p_receipt_url",
      "p_authority",
      "p_recorded_by",
      "p_product_id",
      "p_person_id",
      "p_matter_id",
      "p_expected_verification_hash"
    ]
  },
  artifact_attach: {
    rpcName: "attach_consumer_packet_artifact_if_verified",
    expectedHashParameter: "p_expected_verification_hash",
    atomicPayloadParameters: [
      "p_consumer_auth_user_id",
      "p_briefcase_item_id",
      "p_expected_verification_hash",
      "p_entitlement_source",
      "p_artifact"
    ]
  },
  render_enqueue: {
    rpcName: "enqueue_verified_consumer_packet_render",
    expectedHashParameter: "p_expected_verification_hash",
    atomicPayloadParameters: [
      "p_packet_id",
      "p_route_id",
      "p_renderer_kind",
      "p_renderer_version",
      "p_source_sha256",
      "p_profile_id",
      "p_profile_version",
      "p_input_hash",
      "p_briefcase_item_id",
      "p_person_id",
      "p_matter_id",
      "p_max_attempts",
      "p_consumer_briefcase_item_id",
      "p_expected_consumer_auth_user_id",
      "p_expected_verification_hash",
      "p_render_packet",
      "p_render_input_payload"
    ]
  },
  sponsored_slot_consumption: {
    rpcName: "finalize_sponsored_packet_generation_if_verified",
    expectedHashParameter: "p_expected_verification_hash",
    atomicPayloadParameters: [
      "p_session_id",
      "p_briefcase_item_id",
      "p_expected_verification_hash",
      "p_packet_artifact"
    ]
  }
} as const;

export type PacketVerificationCasPoint = keyof typeof PACKET_VERIFICATION_CAS_HANDOFF;

/** Exact captain migration/RPC application handoff; no SQL is owned here. */
export const PACKET_VERIFICATION_CAS_CALL_SITES = {
  verification_persistence: {
    applicationFunction: "packet-information route -> verification-cas.persistProtectedPacketVerification",
    currentMutation: "persist_consumer_packet_verification RPC (captain SQL pending)",
    requiredAtomicMutation: "lock protected verification; compare prior hash/revision; merge only answer delta and canonical metadata; save protected transition and JSON display mirror together",
    permissions: "service_role only; authenticated/anon receive no table or function grant",
    concurrency: "revision mismatch refuses without retry; caller reloads and rederives before any later attempt"
  },
  artifact_authority: {
    applicationFunction: "packet status/download/generation -> verification-cas.readProtectedPacketArtifact",
    currentMutation: "read-only get_consumer_packet_artifact_authority RPC (captain SQL pending)",
    requiredAtomicMutation: "return protected immutable artifact provenance/status/revision or protected absent state; never infer from artifact_refs_json or packet_status",
    legacyBackfill: "captain must backfill already-issued artifacts into protected provenance before they remain accessible"
  },
  presentation_source: {
    applicationFunction: "briefcase-presentation-authority.readTrustedPendingSource",
    currentMutation: "read-only get_consumer_briefcase_presentation_source RPC (captain SQL pending)",
    requiredAtomicMutation: "return one claimed server-owned screening source with exact owner/item/matter/source identity plus canonical answer and linkage digests; post-claim reads ignore the pre-claim replay expiry",
    permissions: "service_role only; unclaimed, ambiguous, wrong-owner, or digest-mismatched sources return no row"
  },
  checkout_binding: {
    applicationFunction: "payment-adapter.persistCheckoutBinding -> consumer-payment-authority.persistConsumerCheckoutBinding",
    currentMutation: "bind_consumer_checkout_verification RPC (captain SQL pending)",
    requiredAtomicMutation: "lock protected verification; compare expected hash; bind checkout/product/person/matter; return ok:true for the identical binding, ok:false for a definitive conflict, and preserve transport errors as errors",
    failureCompensation: "expire any newly-created or reused open Stripe Checkout Session when the CAS refuses"
  },
  payment_entitlement: {
    applicationFunction: "checkout-reconciliation.recordVerifiedConsumerPayment -> consumer-payment-authority.recordConsumerPacketPayment",
    currentMutation: "record_consumer_packet_payment RPC with protected expected hash",
    requiredAtomicMutation: "compare protected hash while recording provider evidence and entitlement"
  },
  artifact_attach: {
    applicationFunction: "packet-generation.attachPacketToBriefcaseItem -> verification-cas.attachConsumerPacketArtifactIfVerified",
    currentMutation: "attach_consumer_packet_artifact_if_verified RPC (captain SQL pending)",
    requiredAtomicMutation: "compare protected verification; immutable-write protected artifact provenance; merge the JSON display mirror; set Ready together"
  },
  render_enqueue: {
    applicationFunction: "consumer-render-request.requestConsumerPacketRenderInternal -> job-queue.enqueueVerifiedConsumerRender",
    currentMutation: "enqueue_verified_consumer_packet_render RPC (captain SQL pending)",
    requiredAtomicMutation: "lock protected hash; immutable-insert exact render packet/input keyed by packet id + input hash; enqueue one job"
  },
  sponsored_slot_consumption: {
    applicationFunction: "packet/generate route -> rcap-slot-lifecycle.finalizeSponsoredPacketGeneration",
    currentMutation: "finalize_sponsored_packet_generation_if_verified RPC (captain SQL pending)",
    requiredAtomicMutation: "lock protected hash; consume included/overage credit; protected-write artifact provenance; merge mirror; set Ready together; refusal mutates nothing"
  }
} as const;

export type ExpectedPacketVerification = { expectedVerificationHash: string };

export type ProtectedPacketDraftSnapshot = Omit<PacketVerificationSnapshot, "schemaVersion" | "verifiedAt"> & {
  schemaVersion: "expungement-ai/protected-packet-draft/v1";
  capturedAt: string;
};

export type ProtectedPacketVerificationRecord = PacketVerificationRecord & {
  revision: number;
  draftHash: string;
  draftSnapshot: ProtectedPacketDraftSnapshot;
};

type ProtectedLegacyArtifactEvidenceBase = {
  consumerAuthUserId: string;
  briefcaseItemId: string;
  matterId: string;
  artifactSource: string;
  packetPlanId: string;
  artifactSha256: string;
  outputId: string;
  verificationHash: string | null;
};

export type ProtectedLegacyArtifactEvidence = ProtectedLegacyArtifactEvidenceBase & (
  | {
    kind: "consumer_payment_render_output";
    paymentProviderEventId: string;
    renderJobId: string;
  }
  | {
    kind: "sponsored_generation_record";
    sourceSessionId: string;
    generationRecordId: string;
    creditRecordId: string;
  }
);

export type ProtectedPacketArtifactRecord = {
  status: "absent" | "ready";
  revision: number;
  verificationHash: string | null;
  entitlementSource: "consumer_payment" | "partner_sponsorship" | "legacy_backfill" | null;
  artifact: Record<string, unknown> | null;
  consumerAuthUserId?: string;
  briefcaseItemId?: string;
  matterId?: string;
  legacyEvidence?: ProtectedLegacyArtifactEvidence;
};

export type ProtectedReadResult<T> =
  | { ok: true; value: T }
  | { ok: false; reason: string };

export type ProtectedPacketVerificationTransition = {
  expectedPriorHash: string | null;
  expectedPriorRevision: number;
  answerDelta: Record<string, unknown>;
  packetInformationMetadata: Record<string, unknown>;
  nextVerification: ProtectedPacketVerificationRecord;
};

export function assertExpectedPacketVerificationHash(value: string): string {
  if (!/^[a-f0-9]{64}$/.test(value)) {
    throw new Error("A canonical 64-character packet verification hash is required.");
  }
  return value;
}

export async function readProtectedPacketVerification(input: {
  consumerAuthUserId: string;
  briefcaseItemId: string;
}): Promise<ProtectedReadResult<ProtectedPacketVerificationRecord>> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, reason: "protected_verification_storage_unavailable" };
  const { data, error } = await supabase.rpc("get_consumer_packet_verification_authority", {
    p_consumer_auth_user_id: input.consumerAuthUserId,
    p_briefcase_item_id: input.briefcaseItemId
  });
  if (error) return { ok: false, reason: error.message };
  const value = protectedVerificationRecord(rowFor(data));
  return value ? { ok: true, value } : { ok: false, reason: "protected_verification_authority_missing" };
}

export async function persistProtectedPacketVerification(input: {
  consumerAuthUserId: string;
  briefcaseItemId: string;
  transition: ProtectedPacketVerificationTransition;
}): Promise<ProtectedReadResult<ProtectedPacketVerificationRecord>> {
  if (!validRevision(input.transition.expectedPriorRevision)) {
    return { ok: false, reason: "invalid_expected_prior_revision" };
  }
  if (input.transition.expectedPriorHash !== null) {
    try {
      assertExpectedPacketVerificationHash(input.transition.expectedPriorHash);
    } catch {
      return { ok: false, reason: "invalid_expected_prior_hash" };
    }
  }
  if (input.transition.nextVerification.status === "verified") {
    try {
      assertExpectedPacketVerificationHash(input.transition.nextVerification.hash ?? "");
    } catch {
      return { ok: false, reason: "invalid_next_verification_hash" };
    }
  }
  if (!input.transition.nextVerification.draftHash || !input.transition.nextVerification.draftSnapshot) {
    return { ok: false, reason: "next_draft_required" };
  }
  try {
    assertExpectedPacketVerificationHash(input.transition.nextVerification.draftHash);
  } catch {
    return { ok: false, reason: "invalid_next_draft_hash" };
  }
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, reason: "protected_verification_storage_unavailable" };

  // One call and no application retry: a stale revision must be reloaded and
  // the evaluator rerun, never merged over a later participant fact save.
  const { data, error } = await supabase.rpc("persist_consumer_packet_verification", {
    p_consumer_auth_user_id: input.consumerAuthUserId,
    p_briefcase_item_id: input.briefcaseItemId,
    p_expected_prior_hash: input.transition.expectedPriorHash,
    p_expected_prior_revision: input.transition.expectedPriorRevision,
    p_answer_delta: input.transition.answerDelta,
    p_packet_information_metadata: input.transition.packetInformationMetadata,
    p_next_draft_hash: input.transition.nextVerification.draftHash ?? null,
    p_next_draft_snapshot: input.transition.nextVerification.draftSnapshot ?? null,
    p_next_verification_status: input.transition.nextVerification.status,
    p_next_verification_reason: input.transition.nextVerification.reason,
    p_next_verification_hash: input.transition.nextVerification.hash ?? null,
    p_next_verification_snapshot: input.transition.nextVerification.snapshot ?? null,
    p_next_verification_invalidated_at: input.transition.nextVerification.invalidatedAt ?? null
  });
  if (error) return { ok: false, reason: error.message };
  const value = protectedVerificationRecord(rowFor(data));
  return value ? { ok: true, value } : { ok: false, reason: "protected_verification_transition_refused" };
}

export async function readProtectedPacketArtifact(input: {
  consumerAuthUserId: string;
  briefcaseItemId: string;
}): Promise<ProtectedReadResult<ProtectedPacketArtifactRecord>> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, reason: "protected_artifact_storage_unavailable" };
  const { data, error } = await supabase.rpc("get_consumer_packet_artifact_authority", {
    p_consumer_auth_user_id: input.consumerAuthUserId,
    p_briefcase_item_id: input.briefcaseItemId
  });
  if (error) return { ok: false, reason: error.message };
  const value = protectedArtifactRecord(rowFor(data), input);
  return value ? { ok: true, value } : { ok: false, reason: "protected_artifact_authority_missing" };
}

export async function attachConsumerPacketArtifactIfVerified(input: {
  consumerAuthUserId: string;
  briefcaseItemId: string;
  expectedVerificationHash: string;
  entitlementSource: "consumer_payment" | "partner_sponsorship";
  artifact: Record<string, unknown>;
}): Promise<ProtectedReadResult<ProtectedPacketArtifactRecord>> {
  try {
    assertExpectedPacketVerificationHash(input.expectedVerificationHash);
  } catch {
    return { ok: false, reason: "invalid_expected_verification_hash" };
  }
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, reason: "protected_artifact_storage_unavailable" };
  const { data, error } = await supabase.rpc("attach_consumer_packet_artifact_if_verified", {
    p_consumer_auth_user_id: input.consumerAuthUserId,
    p_briefcase_item_id: input.briefcaseItemId,
    p_expected_verification_hash: input.expectedVerificationHash,
    p_entitlement_source: input.entitlementSource,
    p_artifact: input.artifact
  });
  if (error) return { ok: false, reason: error.message };
  const value = protectedArtifactRecord(rowFor(data), {
    consumerAuthUserId: input.consumerAuthUserId,
    briefcaseItemId: input.briefcaseItemId
  });
  return value?.status === "ready" ? { ok: true, value } : { ok: false, reason: "protected_artifact_attach_refused" };
}

function protectedVerificationRecord(value: unknown): ProtectedPacketVerificationRecord | null {
  if (!isRecord(value) || !validRevision(value.revision)) return null;
  if (value.status !== "unverified" && value.status !== "verified" && value.status !== "invalidated") return null;
  if (typeof value.reason !== "string" || value.reason.length === 0) return null;
  if (value.status === "verified") {
    if (typeof value.hash !== "string" || !/^[a-f0-9]{64}$/.test(value.hash)) return null;
    if (!isRecord(value.snapshot) || value.snapshot.schemaVersion !== "expungement-ai/final-verification/v1") return null;
  }
  const draftHash = value.draft_hash ?? value.draftHash;
  const draftSnapshot = protectedDraftSnapshot(value.draft_snapshot ?? value.draftSnapshot);
  if (typeof draftHash !== "string" || !/^[a-f0-9]{64}$/.test(draftHash) || !draftSnapshot) return null;
  return {
    status: value.status,
    reason: value.reason,
    revision: value.revision,
    ...(typeof value.hash === "string" ? { hash: value.hash } : {}),
    ...(isRecord(value.snapshot) ? { snapshot: value.snapshot as PacketVerificationSnapshot } : {}),
    draftHash,
    draftSnapshot,
    ...(typeof value.invalidated_at === "string"
      ? { invalidatedAt: value.invalidated_at }
      : typeof value.invalidatedAt === "string" ? { invalidatedAt: value.invalidatedAt } : {})
  };
}

function protectedDraftSnapshot(value: unknown): ProtectedPacketDraftSnapshot | null {
  if (!isRecord(value)
    || value.schemaVersion !== "expungement-ai/protected-packet-draft/v1"
    || !nonEmpty(value.capturedAt)
    || !nonEmpty(value.jurisdiction)
    || !nonEmpty(value.profileVersion)
    || !nonEmpty(value.profileAuthorityFingerprint)
    || !Array.isArray(value.requiredInputIds)
    || !isRecord(value.packetFamilyIdentifiers)
    || !isRecord(value.screeningAnswers)
    || !isRecord(value.packetAnswers)
    || !isRecord(value.serverFacts)
    || !isRecord(value.prefilledAnswers)
    || !isRecord(value.dependencies)) return null;
  return value as ProtectedPacketDraftSnapshot;
}

function protectedArtifactRecord(
  value: unknown,
  expected?: { consumerAuthUserId: string; briefcaseItemId: string }
): ProtectedPacketArtifactRecord | null {
  if (!isRecord(value) || !validRevision(value.revision)) return null;
  if (value.status !== "absent" && value.status !== "ready") return null;
  const verificationHash = typeof value.verification_hash === "string"
    ? value.verification_hash
    : typeof value.verificationHash === "string" ? value.verificationHash : null;
  if (verificationHash !== null && !/^[a-f0-9]{64}$/.test(verificationHash)) return null;
  const entitlementSource = value.entitlement_source ?? value.entitlementSource ?? null;
  if (entitlementSource !== null
    && entitlementSource !== "consumer_payment"
    && entitlementSource !== "partner_sponsorship"
    && entitlementSource !== "legacy_backfill") return null;
  const artifact = isRecord(value.artifact) ? value.artifact : null;
  if (value.status === "ready") {
    if (!artifact || entitlementSource === null) return null;
    if (entitlementSource !== "legacy_backfill" && verificationHash === null) return null;
  }
  const record: ProtectedPacketArtifactRecord = {
    status: value.status,
    revision: value.revision,
    verificationHash,
    entitlementSource,
    artifact,
    ...(typeof value.consumer_auth_user_id === "string"
      ? { consumerAuthUserId: value.consumer_auth_user_id }
      : typeof value.consumerAuthUserId === "string" ? { consumerAuthUserId: value.consumerAuthUserId } : {}),
    ...(typeof value.briefcase_item_id === "string"
      ? { briefcaseItemId: value.briefcase_item_id }
      : typeof value.briefcaseItemId === "string" ? { briefcaseItemId: value.briefcaseItemId } : {}),
    ...(typeof value.matter_id === "string"
      ? { matterId: value.matter_id }
      : typeof value.matterId === "string" ? { matterId: value.matterId } : {}),
    ...(protectedLegacyEvidence(value.legacy_evidence ?? value.legacyEvidence)
      ? { legacyEvidence: protectedLegacyEvidence(value.legacy_evidence ?? value.legacyEvidence) ?? undefined }
      : {})
  };
  if (entitlementSource === "legacy_backfill" && !validProtectedLegacyArtifactEvidence(record, expected)) return null;
  return record;
}

export function validProtectedLegacyArtifactEvidence(
  record: ProtectedPacketArtifactRecord,
  expected?: { consumerAuthUserId: string; briefcaseItemId: string }
): boolean {
  if (record.status !== "ready" || record.entitlementSource !== "legacy_backfill" || !record.artifact) return false;
  const evidence = record.legacyEvidence;
  if (!evidence
    || !record.consumerAuthUserId
    || !record.briefcaseItemId
    || !record.matterId
    || evidence.consumerAuthUserId !== record.consumerAuthUserId
    || evidence.briefcaseItemId !== record.briefcaseItemId
    || evidence.matterId !== record.matterId
    || (expected && (evidence.consumerAuthUserId !== expected.consumerAuthUserId
      || evidence.briefcaseItemId !== expected.briefcaseItemId))
    || record.artifact.source !== evidence.artifactSource
    || record.artifact.packetPlanId !== evidence.packetPlanId
    || record.artifact.artifactSha256 !== evidence.artifactSha256
    || record.verificationHash !== evidence.verificationHash) return false;
  if (evidence.kind === "consumer_payment_render_output") {
    return nonEmpty(evidence.paymentProviderEventId)
      && nonEmpty(evidence.renderJobId)
      && nonEmpty(evidence.outputId);
  }
  return nonEmpty(evidence.sourceSessionId)
    && nonEmpty(evidence.generationRecordId)
    && nonEmpty(evidence.creditRecordId)
    && nonEmpty(evidence.outputId);
}

function protectedLegacyEvidence(value: unknown): ProtectedLegacyArtifactEvidence | null {
  if (!isRecord(value)
    || (value.kind !== "consumer_payment_render_output" && value.kind !== "sponsored_generation_record")
    || !nonEmpty(value.consumerAuthUserId)
    || !nonEmpty(value.briefcaseItemId)
    || !nonEmpty(value.matterId)
    || !nonEmpty(value.artifactSource)
    || !nonEmpty(value.packetPlanId)
    || typeof value.artifactSha256 !== "string"
    || !/^[a-f0-9]{64}$/.test(value.artifactSha256)
    || !nonEmpty(value.outputId)
    || (value.verificationHash !== null
      && (typeof value.verificationHash !== "string" || !/^[a-f0-9]{64}$/.test(value.verificationHash)))) return null;
  if (value.kind === "consumer_payment_render_output") {
    if (!nonEmpty(value.paymentProviderEventId) || !nonEmpty(value.renderJobId)) return null;
    return value as ProtectedLegacyArtifactEvidence;
  }
  if (!nonEmpty(value.sourceSessionId)
    || !nonEmpty(value.generationRecordId)
    || !nonEmpty(value.creditRecordId)) return null;
  return value as ProtectedLegacyArtifactEvidence;
}

function nonEmpty(value: unknown): value is string {
  return typeof value === "string" && Boolean(value.trim());
}

function rowFor(data: unknown): unknown {
  return Array.isArray(data) ? data[0] : data;
}

function validRevision(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
