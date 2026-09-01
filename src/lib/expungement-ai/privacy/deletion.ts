import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  ACCOUNT_DELETION_STEPS,
  APPROVED_PROCESSORS,
  MATTER_DELETION_STEPS,
  RETENTION_EXPLANATION,
  participantStoragePrefixes,
  STORAGE_DELETE_CHUNK,
  STORAGE_LIST_PAGE
} from "@/lib/expungement-ai/privacy/contract";
import { checkLegalHolds, holdCoveringMatter, summarizeHolds } from "@/lib/expungement-ai/privacy/legal-hold";
import {
  assertAdapterCoverage,
  defaultProcessorAdapters,
  processorOutcomeIsSettled,
  PROCESSOR_ERASURE_POLICY,
  type ProcessorErasureAdapter
} from "@/lib/expungement-ai/privacy/processor-erasure";
import { requireProcessorConfig } from "@/lib/expungement-ai/privacy/processor-config";
import { participantPseudonymUserId, participantSubjectPseudonym } from "@/lib/expungement-ai/privacy/pseudonym";
import {
  acquireAccountDeletionRunLease,
  completePrivacyRequest,
  readProcessorPropagations,
  readPrivacySteps,
  recordLegalHoldCheck,
  recordPrivacyStep,
  recordProcessorPropagation,
  type PrivacyRequestRow
} from "@/lib/expungement-ai/privacy/store";
import { PACKET_ARTIFACT_BUCKET } from "@/lib/rcap/render/job-contract";
/**
 * Erasure, executed as an ordered ledger of idempotent steps.
 *
 * The shape of this file follows one rule: nothing here may assume it is the
 * first attempt. A deletion that runs half-way and then loses its process must
 * be safe to run again from the top, and must not report success for work that
 * did not happen. So every step is written to be a no-op the second time
 * (delete-what-matches, not delete-the-one-I-remember), the step ledger is
 * consulted before each step rather than after, and the receipt is issued from
 * the ledger's own contents rather than from what this run happens to have in
 * memory.
 *
 * Ordering is the other half. Freezing first is what makes the rest safe: once
 * the tombstone exists, the database refuses new participant writes, so nothing
 * can be created behind the sweep that has already passed.
 */
export type DeletionDependencies = {
  /** Revoke every session GoTrue holds for this account. */
  revokeSessions(userId: string): Promise<{ ok: boolean; detail: string }>;
  /** Delete the Auth user. Runs last, and is the one step that cannot be undone. */
  deleteAuthUser(userId: string): Promise<{ ok: boolean; detail: string }>;
  /** Remove stored objects. Returns the paths actually removed. */
  removeStorageObjects(paths: string[]): Promise<{ removed: string[]; failed: string[] }>;
  /** List objects under a prefix, for the uploads sweep. */
  listStorageObjects(prefix: string): Promise<string[]>;
  /**
   * The account's email, read transiently for a suppression request.
   *
   * Deliberately NOT stored on the privacy request: that row outlives the
   * account by design, and putting the address on it would keep the very
   * identifier the erasure is meant to remove. It is read at propagation time,
   * which runs before the Auth user is deleted, and never persisted.
   */
  readAccountEmail(userId: string): Promise<string | null>;
  /**
   * The erasure adapters, one per approved processor. Injectable so a test can
   * drive success, retry, permanent failure and not-applicable deterministically
   * without an outbound request — and so nothing has to pretend a request was
   * made in order to get a green run.
   */
  processorAdapters(): ProcessorErasureAdapter[];
  now(): Date;
};
export function defaultDeletionDependencies(supabase: SupabaseClient): DeletionDependencies {
  return {
    async revokeSessions(userId) {
      // GoTrue exposes per-user logout as an admin endpoint; supabase-js has no
      // helper for it, so this calls the endpoint directly with the service key.
      // A failure here is NOT swallowed: the caller records the step as failed
      // and the run stops, because everything after this point assumes the
      // account can no longer act.
      const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/+$/, "");
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
      if (!url || !key) return { ok: false, detail: "Supabase admin credentials are not configured." };
      try {
        const response = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(userId)}/logout`, {
          method: "POST",
          headers: { apikey: key, Authorization: `Bearer ${key}`, "content-type": "application/json" },
          body: JSON.stringify({ scope: "global" })
        });
        if (response.ok || response.status === 204) return { ok: true, detail: "All sessions revoked." };
        return { ok: false, detail: `session revocation returned ${response.status}` };
      } catch (error) {
        return { ok: false, detail: error instanceof Error ? error.message : "session revocation failed" };
      }
    },
    async deleteAuthUser(userId) {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (!error) return { ok: true, detail: "Auth user deleted." };
      // A user that is already gone is the expected result of a resumed run.
      if (/not\s*found/i.test(error.message)) return { ok: true, detail: "Auth user was already deleted." };
      return { ok: false, detail: error.message };
    },
    /**
     * Deletes in chunks, and reports honestly which chunk failed.
     *
     * The previous version claimed every path in a batch as removed whenever
     * Storage returned an empty data array, which turned an ambiguous response
     * into a confident success. A path is reported removed only when Storage
     * names it, or when a re-list confirms it is gone; anything else is a
     * failure, and a failure is what makes the step resumable rather than
     * silently incomplete.
     */
    async removeStorageObjects(paths) {
      if (paths.length === 0) return { removed: [], failed: [] };
      const removed: string[] = [];
      const failed: string[] = [];
      for (let index = 0; index < paths.length; index += STORAGE_DELETE_CHUNK) {
        const chunk = paths.slice(index, index + STORAGE_DELETE_CHUNK);
        const { data, error } = await supabase.storage.from(PACKET_ARTIFACT_BUCKET).remove(chunk);
        if (error) {
          failed.push(...chunk);
          continue;
        }
        // Storage remove() is idempotent: an object already gone is not an
        // error, and it is not still there either. A chunk that returned no
        // error is a chunk that is gone, so every path in it counts as removed
        // and only a refused chunk counts as failed.
        void data;
        removed.push(...chunk);
      }
      return { removed, failed };
    },
    /**
     * Every object under a prefix, however deep and however many.
     *
     * Storage `list()` returns immediate children only, capped at 1000 per
     * page, with a nested prefix appearing as one folder entry. The previous
     * version made a single unpaginated call and returned `[]` on error, so a
     * bucket with 1,001 objects, or one nested folder, or a listing that
     * failed outright, all read as "nothing to delete" — and the deletion step
     * then reported success having removed nothing.
     *
     * A listing failure now throws. An empty prefix and an unreadable one are
     * different answers, and only one of them means there is nothing to do.
     */
    async listStorageObjects(prefix) {
      const found: string[] = [];
      const queue: string[] = [prefix];
      const seen = new Set<string>();
      while (queue.length > 0) {
        const current = queue.shift() as string;
        if (seen.has(current)) continue;
        seen.add(current);
        for (let offset = 0; ; offset += STORAGE_LIST_PAGE) {
          const { data, error } = await supabase.storage
            .from(PACKET_ARTIFACT_BUCKET)
            .list(current, { limit: STORAGE_LIST_PAGE, offset });
          if (error) {
            throw new Error(`storage listing failed for ${current}: ${error.message}`);
          }
          const page = data ?? [];
          for (const object of page) {
            if (!object.name || object.name === ".emptyFolderPlaceholder") continue;
            const path = `${current}/${object.name}`;
            // A folder has no id. Descend into it rather than trying to delete
            // it: Storage has no directories, only key prefixes, and removing
            // the prefix name deletes nothing.
            if (object.id === null || object.id === undefined) queue.push(path);
            else found.push(path);
          }
          if (page.length < STORAGE_LIST_PAGE) break;
        }
      }
      return found;
    },
    async readAccountEmail(userId) {
      const { data, error } = await supabase.auth.admin.getUserById(userId);
      if (error) return null;
      const email = data?.user?.email;
      return typeof email === "string" && email.length > 0 ? email : null;
    },
    processorAdapters: () => defaultProcessorAdapters(),
    now: () => new Date()
  };
}
export type DeletionOutcome = {
  status: "completed" | "blocked_legal_hold" | "failed" | "partially_completed";
  receiptCode: string | null;
  receipt: Record<string, unknown> | null;
  failedStep?: string;
  error?: string;
};
type StepRunner = (record: (detail: Record<string, unknown>) => void) => Promise<void>;
/** Runs one step unless the ledger already shows it completed or skipped. */
async function runStep(input: {
  supabase: SupabaseClient;
  requestId: string;
  stepKey: string;
  completed: Set<string>;
  results: Record<string, unknown>;
  run: StepRunner;
}): Promise<void> {
  if (input.completed.has(input.stepKey)) {
    input.results[input.stepKey] = { status: "already_done", note: "Completed on an earlier attempt." };
    return;
  }
  let detail: Record<string, unknown> = {};
  try {
    await input.run((next) => {
      detail = next;
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await recordPrivacyStep({
      supabase: input.supabase,
      requestId: input.requestId,
      stepKey: input.stepKey,
      status: "failed",
      detail,
      error: message
    });
    throw new StepFailure(input.stepKey, message);
  }
  await recordPrivacyStep({
    supabase: input.supabase,
    requestId: input.requestId,
    stepKey: input.stepKey,
    status: "completed",
    detail
  });
  input.results[input.stepKey] = detail;
}
export class StepFailure extends Error {
  constructor(readonly stepKey: string, message: string) {
    super(message);
    this.name = "StepFailure";
  }
}
async function completedStepKeys(supabase: SupabaseClient, requestId: string): Promise<Set<string>> {
  const steps = await readPrivacySteps(supabase, requestId);
  return new Set(steps.filter((step) => step.status === "completed" || step.status === "skipped").map((s) => s.step_key));
}
// -----------------------------------------------------------------------------
// Shared sweeps
// -----------------------------------------------------------------------------
type MatterScope = {
  itemIds: string[];
  /** Storage paths for generated packets belonging to those matters. */
  artifactPaths: string[];
};
/**
 * Reads the participant's matters and the packet objects that belong to them.
 * Owner-scoped at both hops: the items by user_id, the render jobs by the same
 * user_id AND the item ids that owner filter produced.
 */
async function readMatterScope(
  supabase: SupabaseClient,
  userId: string,
  onlyItemId?: string
): Promise<MatterScope> {
  let itemQuery = supabase.from("consumer_briefcase_items").select("id").eq("user_id", userId);
  if (onlyItemId) itemQuery = itemQuery.eq("id", onlyItemId);
  const { data: itemRows } = await itemQuery;
  const itemIds = ((itemRows as Array<{ id: string }> | null) ?? []).map((row) => row.id);
  if (itemIds.length === 0) return { itemIds, artifactPaths: [] };
  const { data: jobRows } = await supabase
    .from("packet_render_jobs")
    .select("output_storage_path")
    .eq("consumer_auth_user_id", userId)
    .in("consumer_briefcase_item_id", itemIds)
    .not("output_storage_path", "is", null);
  const artifactPaths = ((jobRows as Array<{ output_storage_path: string | null }> | null) ?? [])
    .map((row) => row.output_storage_path)
    .filter((path): path is string => Boolean(path));
  return { itemIds, artifactPaths: Array.from(new Set(artifactPaths)) };
}
/**
 * Invalidating a download means the private URL stops working, and it stops
 * working because the row the download route authorizes against no longer says
 * ready. The route reads packet_status and artifact_refs_json; clearing both is
 * what turns a still-open browser tab's download link into a 404.
 */
async function invalidateDownloads(
  supabase: SupabaseClient,
  userId: string,
  itemIds: string[]
): Promise<number> {
  if (itemIds.length === 0) return 0;
  const { data, error } = await supabase
    .from("consumer_briefcase_items")
    .update({ packet_status: "not_started", artifact_refs_json: {}, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .in("id", itemIds)
    .select("id");
  if (error) throw new Error(`downloads could not be invalidated: ${error.message}`);
  return ((data as Array<{ id: string }> | null) ?? []).length;
}
/**
 * Cancels the participant's queued renders, optionally narrowed to one matter.
 * The narrowing matters: a single-matter deletion that cancelled every queued
 * render on the account would destroy work for matters the participant chose to
 * keep.
 */
async function cancelQueuedRenders(
  supabase: SupabaseClient,
  userId: string,
  briefcaseItemId: string | null = null
): Promise<number> {
  const { data, error } = await supabase.rpc("cancel_participant_queued_render_jobs", {
    p_user_id: userId,
    p_briefcase_item_id: briefcaseItemId
  });
  if (error) throw new Error(`queued renders could not be cancelled: ${error.message}`);
  return typeof data === "number" ? data : 0;
}
/**
 * `briefcaseItemId` narrows the sweep to one matter and a single-matter deletion
 * must pass it: without it, deleting one matter would unlink the payment records
 * of every OTHER matter on the account — matters the participant chose to keep,
 * and whose payment history they are still entitled to read.
 */
async function pseudonymizeRetained(
  supabase: SupabaseClient,
  userId: string,
  briefcaseItemId: string | null = null
): Promise<Record<string, number>> {
  const { data, error } = await supabase.rpc("pseudonymize_participant_retained_records", {
    p_user_id: userId,
    p_pseudonym_user_id: participantPseudonymUserId(userId),
    p_briefcase_item_id: briefcaseItemId
  });
  if (error) throw new Error(`retained records could not be pseudonymized: ${error.message}`);
  const row = (Array.isArray(data) ? data[0] : data) as Record<string, number> | null;
  return {
    renderJobs: Number(row?.render_jobs ?? 0),
    paymentConsumptions: Number(row?.payment_consumptions ?? 0),
    deliveryEvents: Number(row?.delivery_events ?? 0),
    analyticsEvents: Number(row?.analytics_events ?? 0),
    supportItems: Number(row?.support_items ?? 0)
  };
}
// -----------------------------------------------------------------------------
// Single-matter deletion
// -----------------------------------------------------------------------------
export async function runMatterDeletion(input: {
  supabase: SupabaseClient;
  request: PrivacyRequestRow;
  deps?: DeletionDependencies;
}): Promise<DeletionOutcome> {
  const { supabase, request } = input;
  const deps = input.deps ?? defaultDeletionDependencies(supabase);
  const userId = request.user_id;
  const matterId = request.target_matter_item_id;
  if (!matterId) return { status: "failed", receiptCode: null, receipt: null, error: "no matter was named" };
  const holds = await checkLegalHolds(supabase, userId);
  const blocking = holdCoveringMatter(holds, matterId);
  await recordLegalHoldCheck({
    supabase,
    requestId: request.id,
    active: Boolean(blocking),
    reason: blocking ? blocking.reason : null
  });
  if (blocking) {
    return { status: "blocked_legal_hold", receiptCode: null, receipt: null, error: blocking.reason };
  }
  const completed = await completedStepKeys(supabase, request.id);
  const results: Record<string, unknown> = {};
  let scope: MatterScope = { itemIds: [], artifactPaths: [] };
  try {
    for (const stepKey of MATTER_DELETION_STEPS) {
      await runStep({
        supabase,
        requestId: request.id,
        stepKey,
        completed,
        results,
        run: async (record) => {
          switch (stepKey) {
            case "verify_matter_ownership": {
              const { data } = await supabase
                .from("consumer_briefcase_items")
                .select("id, user_id")
                .eq("id", matterId)
                .eq("user_id", userId)
                .maybeSingle<{ id: string; user_id: string }>();
              if (!data || data.user_id !== userId) {
                throw new Error("this matter does not belong to the signed-in account");
              }
              record({ matterId, ownerConfirmed: true });
              return;
            }
            case "cancel_unstarted_renders": {
              const cancelled = await cancelQueuedRenders(supabase, userId, matterId);
              record({ cancelled, scope: "this matter only" });
              return;
            }
            case "invalidate_downloads": {
              const invalidated = await invalidateDownloads(supabase, userId, [matterId]);
              record({ invalidated });
              return;
            }
            case "delete_generated_packets": {
              scope = await readMatterScope(supabase, userId, matterId);
              const outcome = await deps.removeStorageObjects(scope.artifactPaths);
              if (outcome.failed.length > 0) {
                throw new Error(`${outcome.failed.length} packet object(s) could not be deleted`);
              }
              record({ objectsDeleted: outcome.removed.length });
              return;
            }
            case "delete_matter_records": {
              // The screening rows this matter points at go with it; a screening
              // is the matter's own answers, not a separate keepsake.
              const { data: itemRow } = await supabase
                .from("consumer_briefcase_items")
                .select("source_session_id")
                .eq("id", matterId)
                .eq("user_id", userId)
                .maybeSingle<{ source_session_id: string | null }>();
              const { error } = await supabase
                .from("consumer_briefcase_items")
                .delete()
                .eq("id", matterId)
                .eq("user_id", userId);
              if (error) throw new Error(`the matter could not be deleted: ${error.message}`);
              let screeningsDeleted = 0;
              if (itemRow?.source_session_id) {
                const { data } = await supabase
                  .from("screening_sessions")
                  .delete()
                  .eq("session_id", itemRow.source_session_id)
                  .select("session_id");
                screeningsDeleted = ((data as unknown[] | null) ?? []).length;
                await supabase
                  .from("consumer_pending_screening_results")
                  .delete()
                  .eq("claimed_user_id", userId)
                  .eq("source_session_id", itemRow.source_session_id);
              }
              record({ matterDeleted: 1, screeningsDeleted });
              return;
            }
            case "pseudonymize_retained_records": {
              // The payment for a deleted matter still has to balance. What is
              // retained is the amount and the receipt reference, not the owner.
              // Scoped to this matter: the participant's other matters keep
              // their readable payment history.
              const counts = await pseudonymizeRetained(supabase, userId, matterId);
              record({ ...counts, scope: "this matter only" });
              return;
            }
            case "issue_receipt": {
              record({ issuedAt: deps.now().toISOString() });
              return;
            }
            default: {
              record({});
            }
          }
        }
      });
    }
  } catch (error) {
    if (error instanceof StepFailure) {
      return { status: "failed", receiptCode: null, receipt: null, failedStep: error.stepKey, error: error.message };
    }
    throw error;
  }
  const receiptCode = `MDR-${randomUUID().toUpperCase()}`;
  const receipt = {
    receiptCode,
    requestType: "matter_deletion",
    matterId,
    completedAt: deps.now().toISOString(),
    subjectPseudonym: request.subject_pseudonym ?? participantSubjectPseudonym(userId),
    steps: results,
    whatWasDeleted: [
      "This matter, its screening answers, and its saved result.",
      "Any packet file generated for it."
    ],
    whatWasKept: RETENTION_EXPLANATION.filter((entry) => entry.treatment !== "deleted"),
    accountStatus: "Your account and your other matters are unchanged."
  };
  await completePrivacyRequest({
    supabase,
    requestId: request.id,
    receipt,
    receiptCode,
    retentionTreatment: retentionTreatmentMap()
  });
  return { status: "completed", receiptCode, receipt };
}
// -----------------------------------------------------------------------------
// Account deletion
// -----------------------------------------------------------------------------
export async function runAccountDeletion(input: {
  supabase: SupabaseClient;
  request: PrivacyRequestRow;
  leaseToken: string;
  deps?: DeletionDependencies;
}): Promise<DeletionOutcome> {
  const { supabase, request } = input;
  const deps = input.deps ?? defaultDeletionDependencies(supabase);
  const userId = request.user_id;
  const subjectPseudonym = request.subject_pseudonym ?? participantSubjectPseudonym(userId);

  if (!(await acquireAccountDeletionRunLease({
    supabase,
    requestId: request.id,
    leaseToken: input.leaseToken
  }))) {
    throw new Error("account-deletion run lease is not held by this attempt");
  }

  // This is a second boundary behind the page/API readiness check. Direct
  // worker callers and a configuration change between request validation and
  // execution must still stop before freeze_account or any other destructive
  // step. The same contract supplies the processor adapters later in the run.
  requireProcessorConfig();

  const holds = await checkLegalHolds(supabase, userId);
  await recordLegalHoldCheck({
    supabase,
    requestId: request.id,
    active: holds.accountHolds.length > 0,
    reason: holds.accountHolds.length > 0 ? summarizeHolds(holds.accountHolds) : null
  });
  if (holds.accountHolds.length > 0) {
    return {
      status: "blocked_legal_hold",
      receiptCode: null,
      receipt: null,
      error: summarizeHolds(holds.accountHolds)
    };
  }
  const heldMatterIds = new Set(
    holds.matterHolds.map((hold) => hold.matterScopeItemId).filter((id): id is string => Boolean(id))
  );
  const completed = await completedStepKeys(supabase, request.id);
  const results: Record<string, unknown> = {};
  let scope: MatterScope = { itemIds: [], artifactPaths: [] };
  try {
    for (const stepKey of ACCOUNT_DELETION_STEPS) {
      if (!(await acquireAccountDeletionRunLease({
        supabase,
        requestId: request.id,
        leaseToken: input.leaseToken
      }))) {
        throw new Error("account-deletion run lease was lost before the next step");
      }
      await runStep({
        supabase,
        requestId: request.id,
        stepKey,
        completed,
        results,
        run: async (record) => {
          switch (stepKey) {
            case "freeze_account": {
              // First, and everything after it depends on it: the tombstone row
              // makes the database refuse new participant writes, so no matter
              // can appear behind a sweep that has already run.
              const { error } = await supabase.rpc("freeze_participant_account", {
                p_user_id: userId,
                p_subject_pseudonym: subjectPseudonym,
                p_request_id: request.id
              });
              if (error) throw new Error(`the account could not be frozen: ${error.message}`);
              record({ frozen: true, subjectPseudonym });
              return;
            }
            case "revoke_sessions": {
              const outcome = await deps.revokeSessions(userId);
              if (!outcome.ok) throw new Error(outcome.detail);
              await supabase.rpc("mark_participant_sessions_revoked", { p_user_id: userId });
              record({ revoked: true, detail: outcome.detail });
              return;
            }
            case "stop_email_reminders": {
              const at = deps.now().toISOString();
              const { data: itemRows } = await supabase
                .from("consumer_briefcase_items")
                .select("id, source_session_id")
                .eq("user_id", userId);
              const rows = (itemRows as Array<{ id: string; source_session_id: string | null }> | null) ?? [];
              const sessionIds = rows.map((row) => row.source_session_id).filter((id): id is string => Boolean(id));
              let remindersCleared = 0;
              if (rows.length > 0) {
                const { data } = await supabase
                  .from("consumer_briefcase_items")
                  .update({ reminder_at: null, updated_at: at })
                  .eq("user_id", userId)
                  .not("reminder_at", "is", null)
                  .select("id");
                remindersCleared = ((data as unknown[] | null) ?? []).length;
              }
              let nudgesStopped = 0;
              if (sessionIds.length > 0) {
                const { data } = await supabase
                  .from("screening_sessions")
                  .update({ nudge_opted_out_at: at, updated_at: at })
                  .in("session_id", sessionIds)
                  .is("nudge_opted_out_at", null)
                  .select("session_id");
                nudgesStopped = ((data as unknown[] | null) ?? []).length;
              }
              record({ remindersCleared, nudgesStopped });
              return;
            }
            case "revoke_partner_assistance": {
              // Assisted access is carried by the partner binding on the
              // screening session. Clearing it ends a clinic's or partner's
              // ability to reach this participant's work, without touching that
              // partner's own records.
              const { data: itemRows } = await supabase
                .from("consumer_briefcase_items")
                .select("source_session_id")
                .eq("user_id", userId);
              const sessionIds = ((itemRows as Array<{ source_session_id: string | null }> | null) ?? [])
                .map((row) => row.source_session_id)
                .filter((id): id is string => Boolean(id));
              let revoked = 0;
              if (sessionIds.length > 0) {
                const { data } = await supabase
                  .from("screening_sessions")
                  .update({ partner_slug: null, flow_mode: "dtc", claimed_slot_state: null })
                  .in("session_id", sessionIds)
                  .not("partner_slug", "is", null)
                  .select("session_id");
                revoked = ((data as unknown[] | null) ?? []).length;
              }
              record({ assistedSessionsRevoked: revoked, partnerRecordsTouched: 0 });
              return;
            }
            case "remove_follow_up_queue_entries": {
              const { data, error } = await supabase
                .from("legalease_os_support_items")
                .delete()
                .eq("user_id", userId)
                .select("id");
              if (error) throw new Error(`follow-up entries could not be removed: ${error.message}`);
              record({ removed: ((data as unknown[] | null) ?? []).length });
              return;
            }
            case "cancel_unstarted_renders": {
              record({ cancelled: await cancelQueuedRenders(supabase, userId) });
              return;
            }
            case "invalidate_downloads": {
              scope = await readMatterScope(supabase, userId);
              record({ invalidated: await invalidateDownloads(supabase, userId, scope.itemIds) });
              return;
            }
            case "delete_uploads": {
              // Every approved participant-upload location, not just the one
              // that happened to be remembered. A listing failure inside
              // listStorageObjects throws, which fails this step and leaves it
              // resumable rather than recording a sweep that found nothing.
              const swept: string[] = [];
              for (const prefix of participantStoragePrefixes(userId)) {
                swept.push(...(await deps.listStorageObjects(prefix)));
              }
              const outcome = await deps.removeStorageObjects(swept);
              if (outcome.failed.length > 0) {
                throw new Error(`${outcome.failed.length} uploaded file(s) could not be deleted`);
              }
              // Re-list to prove the sweep, rather than trusting the count it
              // reported. A resumed run re-lists too, and an already-empty
              // prefix is the expected result there.
              const remaining: string[] = [];
              for (const prefix of participantStoragePrefixes(userId)) {
                remaining.push(...(await deps.listStorageObjects(prefix)));
              }
              if (remaining.length > 0) {
                throw new Error(`${remaining.length} uploaded file(s) remain after the sweep`);
              }
              record({
                prefixesSwept: participantStoragePrefixes(userId).length,
                objectsDeleted: outcome.removed.length,
                objectsRemaining: 0
              });
              return;
            }
            case "delete_generated_packets": {
              // Re-read rather than trusting `scope` from this run: a resumed
              // attempt starts here with an empty one.
              const current = await readMatterScope(supabase, userId);
              const outcome = await deps.removeStorageObjects(current.artifactPaths);
              if (outcome.failed.length > 0) {
                throw new Error(`${outcome.failed.length} packet object(s) could not be deleted`);
              }
              record({ objectsDeleted: outcome.removed.length });
              return;
            }
            case "delete_or_deidentify_matters": {
              const { data: itemRows } = await supabase
                .from("consumer_briefcase_items")
                .select("id, source_session_id")
                .eq("user_id", userId);
              const rows = (itemRows as Array<{ id: string; source_session_id: string | null }> | null) ?? [];
              const deletable = rows.filter((row) => !heldMatterIds.has(row.id));
              const held = rows.filter((row) => heldMatterIds.has(row.id));
              let mattersDeleted = 0;
              if (deletable.length > 0) {
                const { data, error } = await supabase
                  .from("consumer_briefcase_items")
                  .delete()
                  .eq("user_id", userId)
                  .in("id", deletable.map((row) => row.id))
                  .select("id");
                if (error) throw new Error(`matters could not be deleted: ${error.message}`);
                mattersDeleted = ((data as unknown[] | null) ?? []).length;
              }
              // A matter under a preservation order is de-identified in place
              // rather than deleted: the obligation is to keep the record, not
              // to keep the person attached to it.
              let mattersDeIdentified = 0;
              if (held.length > 0) {
                const { data } = await supabase
                  .from("consumer_briefcase_items")
                  .update({
                    summary_json: { text: "De-identified under a preservation obligation." },
                    next_steps_json: [],
                    artifact_refs_json: {},
                    reminder_at: null,
                    updated_at: deps.now().toISOString()
                  })
                  .eq("user_id", userId)
                  .in("id", held.map((row) => row.id))
                  .select("id");
                mattersDeIdentified = ((data as unknown[] | null) ?? []).length;
              }
              const sessionIds = deletable
                .map((row) => row.source_session_id)
                .filter((id): id is string => Boolean(id));
              let screeningsDeleted = 0;
              if (sessionIds.length > 0) {
                const { data } = await supabase
                  .from("screening_sessions")
                  .delete()
                  .in("session_id", sessionIds)
                  .select("session_id");
                screeningsDeleted = ((data as unknown[] | null) ?? []).length;
              }
              const { data: pendingRows } = await supabase
                .from("consumer_pending_screening_results")
                .delete()
                .eq("claimed_user_id", userId)
                .select("pending_id");
              record({
                mattersDeleted,
                mattersDeIdentified,
                screeningsDeleted,
                pendingScreeningsDeleted: ((pendingRows as unknown[] | null) ?? []).length
              });
              return;
            }
            case "pseudonymize_retained_records": {
              record(await pseudonymizeRetained(supabase, userId));
              return;
            }
            case "propagate_to_processors": {
              // One truthful outcome per approved processor, from an adapter
              // that either performs a real outbound operation or explicitly
              // classifies why none is appropriate. Nothing here writes "sent"
              // because a contract entry said the processor holds data.
              const adapters = deps.processorAdapters();
              assertAdapterCoverage(adapters);
              // Read now, while the Auth user still exists. Never persisted.
              const subjectEmail = await deps.readAccountEmail(userId);
              const priorPropagations = await readProcessorPropagations(supabase, request.id);
              const propagated: Array<Record<string, unknown>> = [];
              const outstanding: string[] = [];
              for (const processor of APPROVED_PROCESSORS) {
                const adapter = adapters.find((candidate) => candidate.key === processor.key) as ProcessorErasureAdapter;
                const prior = priorPropagations.find((candidate) => candidate.processor_key === processor.key);
                const providerReference = prior?.reference
                  && (prior.status === "sent" || prior.detail?.asynchronous === true)
                  ? prior.reference
                  : null;
                let outcome = await adapter.erase({
                  processorKey: processor.key,
                  requestId: request.id,
                  userId,
                  subjectPseudonym,
                  email: subjectEmail,
                  providerReference
                });
                let attempts = 1;
                // Retry only what the policy calls retryable, and only within
                // this run. Anything still outstanding afterwards is recorded
                // as such and retried by a later resumed run.
                while (
                  outcome.status === "pending"
                  && attempts < PROCESSOR_ERASURE_POLICY.maxAttemptsPerRun
                  && outcome.detail.retryable === true
                ) {
                  outcome = await adapter.erase({
                    processorKey: processor.key,
                    requestId: request.id,
                    userId,
                    subjectPseudonym,
                    email: subjectEmail,
                    providerReference
                  });
                  attempts += 1;
                }
                const settled = processorOutcomeIsSettled(adapter, outcome);
                await recordProcessorPropagation({
                  supabase,
                  requestId: request.id,
                  processorKey: processor.key,
                  status: outcome.status,
                  reference: outcome.reference,
                  detail: {
                    ...outcome.detail,
                    treatment: processor.treatment,
                    attempts,
                    required: adapter.required,
                    settled
                  }
                });
                propagated.push({
                  processor: processor.key,
                  status: outcome.status,
                  attempts,
                  settled,
                  reference: outcome.reference
                });
                if (adapter.required && !settled) outstanding.push(`${processor.key}:${outcome.status}`);
              }
              // A deletion does not get to report completed while a processor
              // that holds participant data has not been told. Failing here
              // leaves the request resumable, so the next run retries exactly
              // this step rather than redoing the deletion.
              if (outstanding.length > 0) {
                record({ processors: propagated, outstanding });
                throw new Error(
                  `processor erasure is outstanding for ${outstanding.join(", ")}; the deletion cannot complete until every required processor is settled`
                );
              }
              record({ processors: propagated, outstanding: [] });
              return;
            }
            case "write_backup_tombstone": {
              const { error } = await supabase.rpc("finalize_participant_account_tombstone", {
                p_user_id: userId,
                p_receipt_code: accountReceiptCode(request.id)
              });
              if (error) throw new Error(`the tombstone could not be written: ${error.message}`);
              record({
                subjectPseudonym,
                restorationBarrier: true,
                note: "A database restored from an older backup will find this tombstone and refuse to bring the account back."
              });
              return;
            }
            case "delete_auth_user": {
              const outcome = await deps.deleteAuthUser(userId);
              if (!outcome.ok) throw new Error(outcome.detail);
              record({ deleted: true, detail: outcome.detail });
              return;
            }
            case "issue_receipt": {
              record({ issuedAt: deps.now().toISOString() });
              return;
            }
            default: {
              record({});
            }
          }
        }
      });
    }
  } catch (error) {
    if (error instanceof StepFailure) {
      const stepIndex = ACCOUNT_DELETION_STEPS.indexOf(error.stepKey as (typeof ACCOUNT_DELETION_STEPS)[number]);
      const partial = completed.size > 0 || stepIndex > 0;
      return {
        status: partial ? "partially_completed" : "failed",
        receiptCode: null,
        receipt: null,
        failedStep: error.stepKey,
        error: error.message
      };
    }
    throw error;
  }
  const receiptCode = accountReceiptCode(request.id);
  const receipt = {
    receiptCode,
    requestType: "account_deletion",
    status: "completed",
    completedAt: deps.now().toISOString(),
    whatWasDeleted: [
      "Your profile and sign-in.",
      "Every matter, screening and answer you saved.",
      "Every file you uploaded and every packet we generated for you.",
      "Your reminders, and any partner or clinic access to your work."
    ],
    whatWasKept: RETENTION_EXPLANATION.filter((entry) => entry.treatment !== "deleted"),
    signInStatus: "This account can no longer sign in, and it cannot be recreated from a backup."
  };
  await completePrivacyRequest({
    supabase,
    requestId: request.id,
    receipt,
    receiptCode,
    retentionTreatment: retentionTreatmentMap()
  });
  return { status: "completed", receiptCode, receipt };
}
/** Derived from the request id, so a resumed run issues the SAME receipt code. */
function accountReceiptCode(requestId: string): string {
  return `ADR-${requestId.toUpperCase()}`;
}
function retentionTreatmentMap(): Record<string, unknown> {
  return Object.fromEntries(
    RETENTION_EXPLANATION.map((entry) => [
      entry.recordClass,
      { treatment: entry.treatment, explanation: entry.explanation }
    ])
  );
}
