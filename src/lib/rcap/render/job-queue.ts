import "server-only";

// Thin adapter over the phase-48 job table. All of the rules live in
// job-contract.ts and in the database; this file only moves rows. It returns
// null rather than throwing when Supabase is unconfigured, matching the rest of
// the repository layer, so a local run without a database degrades instead of
// crashing.

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  canTransition,
  type RenderJobClaim,
  type RenderJobSpec,
  type RenderJobStatus,
  type RenderOutputValidation
} from "@/lib/rcap/render/job-contract";

type JobRow = {
  id: string;
  packet_id: string;
  route_id: string;
  renderer_kind: string;
  renderer_version: string;
  source_sha256: string | null;
  profile_id: string;
  profile_version: string;
  input_hash: string;
  status: RenderJobStatus;
  attempt_count: number;
  consumed_credit: boolean;
};

/**
 * Idempotent by (packet_id, input_hash): a retry of an identical request
 * returns the live job rather than queueing a second one that could deliver
 * twice. The partial unique index enforces this even if two callers race.
 */
export async function enqueueRenderJob(spec: RenderJobSpec) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const existing = await supabase
    .from("packet_render_jobs")
    .select("id, packet_id, route_id, renderer_kind, renderer_version, source_sha256, profile_id, profile_version, input_hash, status, attempt_count, consumed_credit")
    .eq("packet_id", spec.packetId)
    .eq("input_hash", spec.inputHash)
    .in("status", ["queued", "claimed", "rendering", "validating", "artifact_validated", "delivered"])
    .maybeSingle();

  if (existing.data) return existing.data as JobRow;

  const inserted = await supabase
    .from("packet_render_jobs")
    .insert({
      packet_id: spec.packetId,
      route_id: spec.routeId,
      renderer_kind: spec.rendererKind,
      renderer_version: spec.rendererVersion,
      source_sha256: spec.sourceSha256,
      profile_id: spec.profileId,
      profile_version: spec.profileVersion,
      input_hash: spec.inputHash,
      partner_slug: spec.partnerSlug,
      briefcase_item_id: spec.briefcaseItemId
    })
    .select("id, packet_id, route_id, renderer_kind, renderer_version, source_sha256, profile_id, profile_version, input_hash, status, attempt_count, consumed_credit")
    .maybeSingle();

  if (inserted.error) {
    // A concurrent enqueue won the unique index. Read its row instead of
    // failing the participant's request.
    const raced = await supabase
      .from("packet_render_jobs")
      .select("id, packet_id, route_id, renderer_kind, renderer_version, source_sha256, profile_id, profile_version, input_hash, status, attempt_count, consumed_credit")
      .eq("packet_id", spec.packetId)
      .eq("input_hash", spec.inputHash)
      .maybeSingle();
    return (raced.data as JobRow | null) ?? null;
  }

  return (inserted.data as JobRow | null) ?? null;
}

export async function claimNextRenderJob(workerId: string, rendererKinds: string[], claimSeconds = 600): Promise<RenderJobClaim | null> {
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
    attemptCount: Number(row.attempt_count ?? 0)
  };
}

export async function advanceRenderJob(jobId: string, from: RenderJobStatus, to: RenderJobStatus) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return false;
  // Checked here as well as in the database trigger, so an illegal transition
  // costs no round trip and reads the same in both places.
  if (!canTransition(from, to)) return false;

  const { error } = await supabase
    .from("packet_render_jobs")
    .update({ status: to })
    .eq("id", jobId)
    .eq("status", from);
  return !error;
}

/**
 * Writes the proof and moves the job to artifact_validated in one update. The
 * table's check constraint refuses the status without the proof, so a status
 * flip with no artifact behind it cannot be written.
 */
export async function recordValidatedArtifact(input: {
  jobId: string;
  validation: Extract<RenderOutputValidation, { ok: true }>;
  outputStoragePath: string;
  containerDigest: string;
}) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return false;

  const { error } = await supabase
    .from("packet_render_jobs")
    .update({
      status: "artifact_validated",
      output_storage_path: input.outputStoragePath,
      output_sha256: input.validation.outputSha256,
      normalized_output_sha256: input.validation.normalizedOutputSha256,
      output_byte_count: input.validation.byteCount,
      output_page_count: input.validation.pageCount,
      container_digest: input.containerDigest,
      validated_at: new Date().toISOString()
    })
    .eq("id", input.jobId)
    .eq("status", "validating");
  return !error;
}

export async function failRenderJob(jobId: string, errorCode: string, errorDetail?: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return false;
  const { error } = await supabase
    .from("packet_render_jobs")
    .update({ status: "failed", error_code: errorCode, error_detail: errorDetail ?? null })
    .eq("id", jobId);
  return !error;
}

/**
 * The only path by which a sponsored allocation or paid entitlement moves.
 * Returns false when the job has not validated an artifact or the unit was
 * already counted, which is what makes a retry free.
 */
export async function consumeRenderJobCredit(jobId: string, consumptionUnitKey: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return false;
  const { data, error } = await supabase.rpc("consume_packet_render_credit", {
    p_job_id: jobId,
    p_consumption_unit_key: consumptionUnitKey
  });
  return !error && data === true;
}

export async function releaseExpiredRenderClaims() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return 0;
  const { data, error } = await supabase.rpc("release_expired_packet_render_claims");
  return error ? 0 : Number(data ?? 0);
}
