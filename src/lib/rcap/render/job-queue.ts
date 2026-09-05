import "server-only";

// Thin adapter over the phase-48 functions. Every rule lives in the database
// and in job-contract.ts; this file only moves calls. It returns null rather
// than throwing when Supabase is unconfigured, matching the rest of the
// repository layer, so a local run without a database degrades instead of
// crashing.
//
// There is deliberately no direct-table write in this file: inserts go through
// enqueue_packet_render_job, transitions through their canonical functions,
// accounting through finalize_packet_render_job, and delivery events through
// record_packet_delivery_event. The database triggers refuse anything else.

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type {
  DeliveryEligibility,
  DeliveryEventType,
  PacketAccountingResult,
  RenderJobClaim,
  RenderJobSpec,
  RenderJobStatus
} from "@/lib/rcap/render/job-contract";

export type RenderJobRow = {
  id: string;
  packetId: string;
  routeId: string;
  briefcaseItemId: string | null;
  partnerId: string | null;
  personId: string | null;
  matterId: string | null;
  rendererKind: string;
  rendererVersion: string;
  status: RenderJobStatus;
  attemptCount: number;
  maxAttempts: number;
  failureDisposition: "retryable" | "terminal" | null;
  lastErrorCode: string | null;
  outputStoragePath: string | null;
  outputSha256: string | null;
  normalizedOutputSha256: string | null;
  deliveryEligibility: DeliveryEligibility;
  accountingResult: PacketAccountingResult | null;
  /**
   * The consumer briefcase item this job was bound to at enqueue, and the
   * participant the enqueue RPC canonicalised as its owner. Both are written in
   * the same statement that creates the row, so there is no window in which the
   * job exists unbound.
   *
   * They are surfaced here so the RCAP job-id download can assemble the
   * server-side context the Grade-A authority needs -- the exact matter and the
   * current final verification -- without a second source of truth. No new
   * column was needed: the table has carried both since the enqueue RPC was
   * written, and only the select was missing them.
   */
  consumerBriefcaseItemId: string | null;
  consumerAuthUserId: string | null;
  consumerVerificationHash?: string | null;
  personalizedBinding?: { trackId: string; packetFamilyId: string; specificationSha256: string } | null;
};

function rowFromRecord(record: Record<string, unknown>): RenderJobRow {
  return {
    id: String(record.id),
    packetId: String(record.packet_id),
    routeId: String(record.route_id),
    briefcaseItemId: record.briefcase_item_id === null ? null : String(record.briefcase_item_id),
    partnerId: record.partner_id === null ? null : String(record.partner_id),
    personId: record.person_id === null ? null : String(record.person_id),
    matterId: record.matter_id === null ? null : String(record.matter_id),
    rendererKind: String(record.renderer_kind),
    rendererVersion: String(record.renderer_version),
    status: String(record.status) as RenderJobStatus,
    attemptCount: Number(record.attempt_count ?? 0),
    maxAttempts: Number(record.max_attempts ?? 0),
    failureDisposition: record.failure_disposition === null ? null : (String(record.failure_disposition) as "retryable" | "terminal"),
    lastErrorCode: record.error_code === null || record.error_code === undefined ? null : String(record.error_code),
    outputStoragePath: record.output_storage_path === null ? null : String(record.output_storage_path),
    outputSha256: record.output_sha256 === null ? null : String(record.output_sha256),
    normalizedOutputSha256: record.normalized_output_sha256 === null ? null : String(record.normalized_output_sha256),
    consumerBriefcaseItemId: record.consumer_briefcase_item_id === null || record.consumer_briefcase_item_id === undefined
      ? null : String(record.consumer_briefcase_item_id),
    consumerAuthUserId: record.consumer_auth_user_id === null || record.consumer_auth_user_id === undefined
      ? null : String(record.consumer_auth_user_id),
    consumerVerificationHash: typeof record.consumer_verification_hash === "string" ? record.consumer_verification_hash : null,
    deliveryEligibility: String(record.delivery_eligibility ?? "not_evaluated") as DeliveryEligibility,
    accountingResult: record.accounting_result === null || record.accounting_result === undefined
      ? null
      : (String(record.accounting_result) as PacketAccountingResult)
  };
}

/**
 * Which kind of job is being created. The two modes are a discriminated union
 * rather than a bag of optional fields because the database refuses a job that
 * mixes them: a sponsored job carrying consumer bindings, or an unsponsored one
 * without them, is an error there. Modelling that here means the mistake is a
 * type error rather than a runtime exception from Postgres.
 */
export type RenderJobIdentity =
  | {
      mode: "sponsored";
      partnerId: string;
      personId?: string | null;
      matterId?: string | null;
    }
  | {
      mode: "consumer";
      /** The Briefcase item the packet is being rendered for. */
      consumerBriefcaseItemId: string;
      /**
       * Derived from the VERIFIED server-side session and nothing else.
       *
       * This must never be read from request JSON, form data, query parameters
       * or any other client-controlled input. The database independently loads
       * the Briefcase item, reads its canonical owner, and refuses the insert
       * unless the two agree — so a spoofed value cannot create a job. Passing
       * client input here would not breach the gate, but it would turn a
       * server-side identity check into a round-trip that only looks like one.
       */
      expectedConsumerAuthUserId: string;
      personId: string;
      matterId: string;
      /** Compared by the captain-owned enqueue RPC against protected verification. */
      expectedVerificationHash: string;
    };

export type VerifiedConsumerRenderPayload = {
  /** Exact worker row. The RPC immutable-inserts it; it must never upsert it. */
  renderPacket: Record<string, unknown>;
  /** Full canonical review payload bound to spec.inputHash. */
  renderInputPayload: Record<string, unknown>;
};

/**
 * Idempotent by (packet_id, input_hash) inside the database function: a retry
 * of an identical request returns the live or completed job rather than
 * queueing a second one that could deliver twice.
 *
 * A consumer job is created with its identity bound in the same insert. There
 * is deliberately no follow-up call that attaches the binding afterwards: the
 * phase-52 immutability trigger exists precisely to forbid that window, and
 * service_role holds no direct UPDATE on the table to perform it with.
 */
export async function enqueueRenderJob(
  spec: RenderJobSpec,
  identity: RenderJobIdentity,
  options: { maxAttempts?: number } = {}
): Promise<RenderJobRow | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const sponsored = identity.mode === "sponsored";

  // The migration handoff adds p_expected_verification_hash to this RPC. It is
  // intentionally not sent to the old production signature before that lands.
  const { data, error } = await supabase.rpc("enqueue_packet_render_job", {
    p_packet_id: spec.packetId,
    p_route_id: spec.routeId,
    p_renderer_kind: spec.rendererKind,
    p_renderer_version: spec.rendererVersion,
    p_source_sha256: spec.sourceSha256,
    p_profile_id: spec.profileId,
    p_profile_version: spec.profileVersion,
    p_input_hash: spec.inputHash,
    p_briefcase_item_id: spec.briefcaseItemId,
    p_partner_id: sponsored ? identity.partnerId : null,
    p_person_id: identity.personId ?? null,
    p_matter_id: identity.matterId ?? null,
    p_max_attempts: options.maxAttempts ?? 5,
    p_consumer_briefcase_item_id: sponsored ? null : identity.consumerBriefcaseItemId,
    p_expected_consumer_auth_user_id: sponsored ? null : identity.expectedConsumerAuthUserId
  });
  if (error || !data) return null;
  const record = Array.isArray(data) ? data[0] : data;
  return record ? rowFromRecord(record as Record<string, unknown>) : null;
}

/**
 * The only durable boundary for a verified consumer render.
 *
 * Captain-owned SQL must lock the protected Briefcase verification, compare
 * p_expected_verification_hash, immutable-insert both payloads keyed by
 * (packet_id, input_hash), and enqueue the job in that same transaction. A
 * conflict may return the existing identical job but must never update packet
 * bytes or input JSON for an already queued input hash.
 */
export async function enqueueVerifiedConsumerRender(
  spec: RenderJobSpec,
  identity: Extract<RenderJobIdentity, { mode: "consumer" }>,
  payload: VerifiedConsumerRenderPayload,
  options: { maxAttempts?: number } = {}
): Promise<RenderJobRow | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  // All existing consumer entry points converge here. The exact assigned route
  // carries the protected snapshot and specification into the durable input;
  // the RPC still owns atomic verification/payment comparison and insertion.
  const { PERSONALIZED_DELIVERY_ROUTE, currentPersonalizedVerification, preparePersonalizedPacket } = await import("@/lib/rcap/render/personalized-packet");
  if (spec.routeId === PERSONALIZED_DELIVERY_ROUTE) {
    const verification = await currentPersonalizedVerification(identity.expectedConsumerAuthUserId, identity.consumerBriefcaseItemId);
    if (verification.hash !== identity.expectedVerificationHash) return null;
    const prepared = preparePersonalizedPacket({
      authUserId: identity.expectedConsumerAuthUserId, briefcaseItemId: identity.consumerBriefcaseItemId,
      personId: identity.personId, matterId: identity.matterId,
      verificationHash: verification.hash, snapshot: verification.snapshot
    });
    spec = prepared.spec;
    payload = prepared.payload;
    // The existing enqueue RPC creates a new attempt after a failed row. A
    // failed input already belongs to the worker's retry/terminal lifecycle;
    // participant double-clicks must not create a second job beside it.
    const { data: retries, error: retryError } = await supabase.from("packet_render_jobs")
      .select("*").eq("packet_id", spec.packetId).eq("input_hash", spec.inputHash)
      .eq("consumer_auth_user_id", identity.expectedConsumerAuthUserId)
      .eq("consumer_briefcase_item_id", identity.consumerBriefcaseItemId)
      .eq("consumer_verification_hash", identity.expectedVerificationHash)
      .eq("status", "failed");
    if (retryError) return null;
    if (retries?.length) return rowFromRecord(retries[0] as Record<string, unknown>);
  }

  const { data, error } = await supabase.rpc("enqueue_verified_consumer_packet_render", {
    p_packet_id: spec.packetId,
    p_route_id: spec.routeId,
    p_renderer_kind: spec.rendererKind,
    p_renderer_version: spec.rendererVersion,
    p_source_sha256: spec.sourceSha256,
    p_profile_id: spec.profileId,
    p_profile_version: spec.profileVersion,
    p_input_hash: spec.inputHash,
    p_briefcase_item_id: spec.briefcaseItemId,
    p_person_id: identity.personId,
    p_matter_id: identity.matterId,
    p_max_attempts: options.maxAttempts ?? 5,
    p_consumer_briefcase_item_id: identity.consumerBriefcaseItemId,
    p_expected_consumer_auth_user_id: identity.expectedConsumerAuthUserId,
    p_expected_verification_hash: identity.expectedVerificationHash,
    p_render_packet: payload.renderPacket,
    p_render_input_payload: payload.renderInputPayload
  });
  if (error || !data) return null;
  const record = Array.isArray(data) ? data[0] : data;
  return record ? rowFromRecord(record as Record<string, unknown>) : null;
}

export async function claimNextRenderJob(
  workerId: string,
  rendererKinds: string[],
  claimSeconds = 600
): Promise<RenderJobClaim | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase.rpc("claim_packet_render_job", {
    p_worker_id: workerId,
    p_renderer_kinds: rendererKinds,
    p_claim_seconds: claimSeconds
  });
  if (error || !data || !Array.isArray(data) || data.length === 0) return null;

  const row = data[0] as Record<string, unknown>;
  return {
    id: String(row.id),
    packetId: String(row.packet_id),
    routeId: String(row.route_id),
    rendererKind: String(row.renderer_kind),
    rendererVersion: String(row.renderer_version),
    sourceSha256: row.source_sha256 === null ? null : String(row.source_sha256),
    profileId: String(row.profile_id),
    profileVersion: String(row.profile_version),
    inputHash: String(row.input_hash),
    attemptCount: Number(row.attempt_count ?? 0),
    maxAttempts: Number(row.max_attempts ?? 0),
    partnerId: row.partner_id === null ? null : String(row.partner_id),
    personId: row.person_id === null ? null : String(row.person_id),
    matterId: row.matter_id === null ? null : String(row.matter_id),
    fencingToken: String(row.fencing_token),
    claimExpiresAt: String(row.claim_expires_at)
  };
}

export async function startRender(jobId: string, fencingToken: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("start_packet_render", {
    p_job_id: jobId,
    p_fencing_token: fencingToken
  });
  return !error && data === true;
}

export async function startValidation(jobId: string, fencingToken: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("start_packet_validation", {
    p_job_id: jobId,
    p_fencing_token: fencingToken
  });
  return !error && data === true;
}

export async function failRenderJob(
  jobId: string,
  fencingToken: string,
  errorCode: string,
  errorDetail: string,
  retryable: boolean
): Promise<"retryable" | "terminal" | "not_found" | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("fail_packet_render_job", {
    p_job_id: jobId,
    p_fencing_token: fencingToken,
    p_error_code: errorCode,
    p_error_detail: errorDetail,
    p_retryable: retryable
  });
  if (error) return null;
  return data as "retryable" | "terminal" | "not_found";
}

export type FinalizeOutcome = {
  accountingResult: PacketAccountingResult;
  deliveryEligibility: DeliveryEligibility;
  consumptionUnitHash: string | null;
  creditLedgerId: string | null;
};

/**
 * The canonical finalization: fencing, stored-byte identity, artifact
 * evidence, the exactly-once ledger event, the typed accounting result and
 * delivery eligibility, in one database transaction. The worker passes both
 * the locally computed hashes and the hashes recomputed from the re-read
 * stored bytes; the database refuses a mismatch.
 */
export async function finalizeRenderJob(input: {
  jobId: string;
  fencingToken: string;
  outputStoragePath: string;
  localSha256: string;
  localNormalizedSha256: string;
  storedSha256: string;
  storedNormalizedSha256: string;
  outputByteCount: number;
  outputPageCount: number;
  containerDigest: string;
}): Promise<FinalizeOutcome | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("finalize_packet_render_job", {
    p_job_id: input.jobId,
    p_fencing_token: input.fencingToken,
    p_output_storage_path: input.outputStoragePath,
    p_local_sha256: input.localSha256,
    p_local_normalized_sha256: input.localNormalizedSha256,
    p_stored_sha256: input.storedSha256,
    p_stored_normalized_sha256: input.storedNormalizedSha256,
    p_output_byte_count: input.outputByteCount,
    p_output_page_count: input.outputPageCount,
    p_container_digest: input.containerDigest
  });
  if (error || !data) return null;
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, unknown>;
  return {
    accountingResult: String(row.accounting_result) as PacketAccountingResult,
    deliveryEligibility: String(row.delivery_eligibility) as DeliveryEligibility,
    consumptionUnitHash: row.consumption_unit_hash === null ? null : String(row.consumption_unit_hash),
    creditLedgerId: row.credit_ledger_id === null ? null : String(row.credit_ledger_id)
  };
}

export async function releaseExpiredRenderClaims() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return 0;
  const { data, error } = await supabase.rpc("release_expired_packet_render_claims");
  return error ? 0 : Number(data ?? 0);
}

export async function requeueRetryableRenderJobs() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return 0;
  const { data, error } = await supabase.rpc("requeue_retryable_packet_render_jobs");
  return error ? 0 : Number(data ?? 0);
}

/**
 * Delivery is its own authorization domain. This is called only by the
 * authenticated download route after its own participant, ownership and
 * artifact checks; it takes no worker token because a worker token is never
 * authority to record delivery.
 */
export async function recordDeliveryEvent(input: {
  jobId: string;
  eventType: DeliveryEventType;
  actorUserId: string | null;
  requestContext?: Record<string, unknown>;
}) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("record_packet_delivery_event", {
    p_job_id: input.jobId,
    p_event_type: input.eventType,
    p_actor_user_id: input.actorUserId,
    p_request_context: input.requestContext ?? {}
  });
  return error ? null : String(data);
}

export async function getRenderJob(jobId: string): Promise<RenderJobRow | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("packet_render_jobs")
    .select(
      "id, packet_id, route_id, briefcase_item_id, partner_id, person_id, matter_id, renderer_kind, renderer_version, status, attempt_count, max_attempts, failure_disposition, error_code, output_storage_path, output_sha256, normalized_output_sha256, delivery_eligibility, accounting_result, consumer_briefcase_item_id, consumer_auth_user_id, consumer_verification_hash"
    )
    .eq("id", jobId)
    .maybeSingle();
  if (error || !data) return null;
  const job = rowFromRecord(data as Record<string, unknown>);
  if (job.routeId === "IL:felony-prostitution-relief") {
    const { data: input } = await supabase.from("rcap_document_packet_inputs")
      .select("input_payload").eq("document_packet_id", job.packetId).maybeSingle();
    const payload = input?.input_payload;
    if (payload?.schemaVersion === "rcap-personalized-render/v1") {
      job.personalizedBinding = { trackId: payload.trackId, packetFamilyId: payload.packetFamilyId,
        specificationSha256: payload.specificationSha256 };
    }
  }
  return job;
}
