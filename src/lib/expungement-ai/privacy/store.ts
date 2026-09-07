import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import {
  stepsForRequestType,
  type PrivacyRequestStatus,
  type PrivacyRequestType,
  type PrivacyStepStatus
} from "@/lib/expungement-ai/privacy/contract";

/**
 * The durable half of the workflow.
 *
 * There is no in-memory fallback here, unlike the Briefcase store. A Briefcase
 * that degrades to memory when Supabase is unconfigured shows a local developer
 * some rows; a DELETION that degrades to memory tells a participant their data
 * is gone and deletes nothing. Every entry point below fails closed when the
 * service-role client is absent, and the routes turn that into a 503 that says
 * so.
 */

export class PrivacyStoreUnavailableError extends Error {
  readonly code = "privacy_store_unavailable";
  constructor() {
    super("Participant data-rights requests need the configured Supabase service client.");
    this.name = "PrivacyStoreUnavailableError";
  }
}

export type PrivacyRequestRow = {
  id: string;
  user_id: string;
  subject_pseudonym: string | null;
  request_type: PrivacyRequestType;
  idempotency_key: string;
  status: PrivacyRequestStatus;
  requested_at: string;
  recent_auth_verified_at: string | null;
  recent_auth_method: string | null;
  legal_hold_checked_at: string | null;
  legal_hold_active: boolean | null;
  legal_hold_reason: string | null;
  retention_treatment: Record<string, unknown>;
  target_matter_item_id: string | null;
  completed_at: string | null;
  completion_receipt: Record<string, unknown> | null;
  receipt_code: string | null;
  failure_code: string | null;
  last_error: string | null;
};

export type PrivacyStepRow = {
  step_key: string;
  step_order: number;
  status: PrivacyStepStatus;
  started_at: string | null;
  completed_at: string | null;
  attempt_count: number;
  detail: Record<string, unknown>;
  error: string | null;
};

export function requirePrivacyAdminClient(): SupabaseClient {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new PrivacyStoreUnavailableError();
  return supabase;
}

export async function openPrivacyRequest(input: {
  supabase: SupabaseClient;
  userId: string;
  requestType: PrivacyRequestType;
  idempotencyKey: string;
  subjectPseudonym: string;
  recentAuthVerifiedAt: string | null;
  recentAuthMethod: string | null;
  recentAuthProofHash: string | null;
  targetMatterItemId: string | null;
}): Promise<PrivacyRequestRow> {
  const { data, error } = await input.supabase.rpc("open_participant_privacy_request", {
    p_user_id: input.userId,
    p_request_type: input.requestType,
    p_idempotency_key: input.idempotencyKey,
    p_subject_pseudonym: input.subjectPseudonym,
    p_recent_auth_verified_at: input.recentAuthVerifiedAt,
    p_recent_auth_method: input.recentAuthMethod,
    p_recent_auth_proof_hash: input.recentAuthProofHash,
    p_target_matter_item_id: input.targetMatterItemId,
    p_step_keys: [...stepsForRequestType(input.requestType)]
  });

  if (error) throw new Error(`could not open the privacy request: ${error.message}`);
  const row = (Array.isArray(data) ? data[0] : data) as PrivacyRequestRow | null;
  if (!row?.id) throw new Error("the privacy request could not be opened.");
  return row;
}

export async function acquireAccountDeletionRunLease(input: {
  supabase: SupabaseClient;
  requestId: string;
  leaseToken: string;
}): Promise<boolean> {
  const { data, error } = await input.supabase.rpc(
    "acquire_participant_account_deletion_run_lease",
    { p_request_id: input.requestId, p_lease_token: input.leaseToken }
  );
  if (error) throw new Error(`could not acquire account-deletion run lease: ${error.message}`);
  return data === true;
}

export async function releaseAccountDeletionRunLease(input: {
  supabase: SupabaseClient;
  requestId: string;
  leaseToken: string;
}): Promise<void> {
  const { error } = await input.supabase.rpc(
    "release_participant_account_deletion_run_lease",
    { p_request_id: input.requestId, p_lease_token: input.leaseToken }
  );
  if (error) throw new Error(`could not release account-deletion run lease: ${error.message}`);
}

export const ACCOUNT_DELETION_RUN_LEASE_HEARTBEAT_MS = 5_000;

export function startAccountDeletionRunLeaseHeartbeat(input: {
  supabase: SupabaseClient;
  requestId: string;
  leaseToken: string;
}): { stop: () => Promise<void> } {
  let stopped = false;
  let inFlight = Promise.resolve();
  const renew = () => {
    inFlight = inFlight.then(async () => {
      if (stopped) return;
      try {
        await acquireAccountDeletionRunLease(input);
      } catch {
        // A transient renewal error does not end the request. The existing
        // fifteen-minute lease remains authoritative and the next heartbeat
        // retries; a competing request still cannot acquire it meanwhile.
      }
    });
  };
  const timer = setInterval(renew, ACCOUNT_DELETION_RUN_LEASE_HEARTBEAT_MS);
  timer.unref?.();

  return {
    async stop() {
      stopped = true;
      clearInterval(timer);
      await inFlight;
    }
  };
}

export async function readPrivacyRequest(
  supabase: SupabaseClient,
  requestId: string
): Promise<PrivacyRequestRow | null> {
  const { data } = await supabase
    .from("participant_privacy_requests")
    .select("*")
    .eq("id", requestId)
    .maybeSingle<PrivacyRequestRow>();
  return data ?? null;
}

export async function listPrivacyRequests(
  supabase: SupabaseClient,
  userId: string
): Promise<PrivacyRequestRow[]> {
  const { data } = await supabase
    .from("participant_privacy_requests")
    .select("*")
    .eq("user_id", userId)
    .order("requested_at", { ascending: false })
    .limit(50);
  return (data as PrivacyRequestRow[] | null) ?? [];
}

export async function readPrivacySteps(
  supabase: SupabaseClient,
  requestId: string
): Promise<PrivacyStepRow[]> {
  const { data } = await supabase
    .from("participant_privacy_request_steps")
    .select("step_key, step_order, status, started_at, completed_at, attempt_count, detail, error")
    .eq("request_id", requestId)
    .order("step_order", { ascending: true });
  return (data as PrivacyStepRow[] | null) ?? [];
}

export type PrivacyProcessorPropagationRow = {
  processor_key: string;
  status: "pending" | "sent" | "acknowledged" | "not_applicable" | "failed";
  reference: string | null;
  detail: Record<string, unknown> | null;
};

export async function readProcessorPropagations(
  supabase: SupabaseClient,
  requestId: string
): Promise<PrivacyProcessorPropagationRow[]> {
  const { data, error } = await supabase
    .from("participant_processor_propagations")
    .select("processor_key, status, reference, detail")
    .eq("request_id", requestId);
  if (error) throw new Error(`could not read processor propagation ledger: ${error.message}`);
  return (data as PrivacyProcessorPropagationRow[] | null) ?? [];
}

export async function recordPrivacyStep(input: {
  supabase: SupabaseClient;
  requestId: string;
  stepKey: string;
  status: PrivacyStepStatus;
  detail?: Record<string, unknown>;
  error?: string | null;
}): Promise<void> {
  const { error } = await input.supabase.rpc("record_participant_privacy_step", {
    p_request_id: input.requestId,
    p_step_key: input.stepKey,
    p_status: input.status,
    p_detail: input.detail ?? {},
    p_error: input.error ?? null
  });
  if (error) throw new Error(`could not record step ${input.stepKey}: ${error.message}`);
}

export async function recordLegalHoldCheck(input: {
  supabase: SupabaseClient;
  requestId: string;
  active: boolean;
  reason: string | null;
}): Promise<void> {
  const { error } = await input.supabase.rpc("record_participant_privacy_legal_hold_check", {
    p_request_id: input.requestId,
    p_active: input.active,
    p_reason: input.reason
  });
  if (error) throw new Error(`could not record the legal-hold check: ${error.message}`);
}

export async function completePrivacyRequest(input: {
  supabase: SupabaseClient;
  requestId: string;
  receipt: Record<string, unknown>;
  receiptCode: string;
  retentionTreatment: Record<string, unknown>;
}): Promise<PrivacyRequestRow> {
  const { data, error } = await input.supabase.rpc("complete_participant_privacy_request", {
    p_request_id: input.requestId,
    p_receipt: input.receipt,
    p_receipt_code: input.receiptCode,
    p_retention_treatment: input.retentionTreatment
  });
  if (error) throw new Error(`could not complete the privacy request: ${error.message}`);
  const row = (Array.isArray(data) ? data[0] : data) as PrivacyRequestRow | null;
  if (!row?.id) throw new Error("the privacy request could not be completed.");
  return row;
}

export async function recordProcessorPropagation(input: {
  supabase: SupabaseClient;
  requestId: string;
  processorKey: string;
  status: "pending" | "sent" | "acknowledged" | "not_applicable" | "failed";
  reference?: string | null;
  detail?: Record<string, unknown>;
}): Promise<void> {
  await input.supabase
    .from("participant_processor_propagations")
    .upsert(
      {
        request_id: input.requestId,
        processor_key: input.processorKey,
        status: input.status,
        reference: input.reference ?? null,
        detail: input.detail ?? {},
        acknowledged_at: input.status === "acknowledged" ? new Date().toISOString() : null
      },
      { onConflict: "request_id,processor_key" }
    );
}
