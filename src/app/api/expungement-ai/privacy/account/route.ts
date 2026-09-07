import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";

import { requireParticipantPrivacyApiSession } from "@/lib/expungement-ai/privacy/api-session";
import { PRIVACY_RATE_LIMIT_POLICIES } from "@/lib/expungement-ai/privacy/contract";
import { runAccountDeletion, type DeletionOutcome } from "@/lib/expungement-ai/privacy/deletion";
import { participantPrivacyReadiness } from "@/lib/expungement-ai/privacy/readiness";
import { PrivacyProcessorConfigError } from "@/lib/expungement-ai/privacy/processor-config";
import { participantSubjectPseudonym } from "@/lib/expungement-ai/privacy/pseudonym";
import { verifyRecentAuthProof } from "@/lib/expungement-ai/privacy/recent-auth";
import {
  assertSameOrigin,
  PrivacyOriginError,
  PrivacyRequestError,
  privacyJson,
  readPrivacyJsonBody,
  requireIdempotencyKey
} from "@/lib/expungement-ai/privacy/request-security";
import {
  acquireAccountDeletionRunLease,
  openPrivacyRequest,
  PrivacyStoreUnavailableError,
  releaseAccountDeletionRunLease,
  requirePrivacyAdminClient,
  startAccountDeletionRunLeaseHeartbeat
} from "@/lib/expungement-ai/privacy/store";
import { checkResumeRateLimit } from "@/lib/expungement-ai/screening-resume-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The exact words the participant has to type. Not localized on purpose. */
export const ACCOUNT_DELETION_CONFIRMATION = "DELETE MY ACCOUNT";

/**
 * Delete my account and personal data.
 *
 * Three independent things have to be true before a single row is touched: a
 * live session, a password proof minted for THIS purpose in the last ten
 * minutes, and the typed confirmation phrase. The typed phrase is not security
 * — anyone who has the other two can type it — it is there so that nobody
 * arrives here by clicking.
 */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
  } catch (error) {
    if (error instanceof PrivacyOriginError) return privacyJson({ error: error.message, code: error.code }, error.status);
    throw error;
  }

  // A frozen account is admitted HERE and nowhere else, so a participant whose
  // deletion stopped half-way can resume it. See the helper for why.
  const session = await requireParticipantPrivacyApiSession({ allowFrozen: true });
  if (!session.ok) return session.response;

  // The page and API intentionally call the same runtime readiness contract.
  // This happens before the request row is opened and, critically, before the
  // account can be frozen or any session, render, download or object changed.
  const readiness = await participantPrivacyReadiness();
  if (!readiness.ready) {
    return privacyJson(
      {
        error: "Account deletion is temporarily unavailable. Nothing has been changed. Try again later.",
        code: "privacy_not_ready"
      },
      503
    );
  }

  let idempotencyKey: string;
  let proofToken: unknown;
  let confirmation: string;
  try {
    const body = await readPrivacyJsonBody(request);
    idempotencyKey = requireIdempotencyKey(body.idempotencyKey);
    proofToken = body.proof;
    confirmation = typeof body.confirmation === "string" ? body.confirmation.trim() : "";
  } catch (error) {
    if (error instanceof PrivacyRequestError) return privacyJson({ error: error.message, code: error.code }, error.status);
    throw error;
  }

  if (confirmation !== ACCOUNT_DELETION_CONFIRMATION) {
    return privacyJson(
      { error: `Type ${ACCOUNT_DELETION_CONFIRMATION} to confirm.`, code: "confirmation_required" },
      400
    );
  }

  const proof = verifyRecentAuthProof({ token: proofToken, userId: session.userId, purpose: "account_deletion" });
  if (!proof.ok) {
    return privacyJson(
      { error: "Confirm your password again to delete your account.", code: "recent_auth_required", reason: proof.reason },
      401
    );
  }

  let supabase;
  try {
    supabase = requirePrivacyAdminClient();
  } catch (error) {
    if (error instanceof PrivacyStoreUnavailableError) {
      return privacyJson({ error: "Deletion is not available in this environment.", code: error.code }, 503);
    }
    throw error;
  }

  const limit = await checkResumeRateLimit({
    supabase,
    scope: PRIVACY_RATE_LIMIT_POLICIES.destructiveUser.scope,
    keyParts: [session.userId],
    maxAttempts: PRIVACY_RATE_LIMIT_POLICIES.destructiveUser.maxAttempts,
    windowMs: PRIVACY_RATE_LIMIT_POLICIES.destructiveUser.windowMs
  });
  if (!limit.ok) {
    return privacyJson({ error: "Too many requests. Try again a little later.", code: "rate_limited" }, 429);
  }

  let privacyRequest;
  try {
    privacyRequest = await openPrivacyRequest({
      supabase,
      userId: session.userId,
      requestType: "account_deletion",
      idempotencyKey,
      subjectPseudonym: participantSubjectPseudonym(session.userId),
      recentAuthVerifiedAt: proof.issuedAt,
      recentAuthMethod: "password_reauthentication",
      recentAuthProofHash: proof.proofHash,
      targetMatterItemId: null
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (/participant_privacy_requests_proof_uk/.test(message)) {
      return privacyJson(
        { error: "Confirm your password again to delete your account.", code: "recent_auth_required", reason: "replayed" },
        401
      );
    }
    if (/participant_privacy_requests_live_account_deletion_uk/.test(message)) {
      return privacyJson(
        { error: "A deletion is already in progress for this account.", code: "deletion_in_progress" },
        409
      );
    }
    throw error;
  }

  if (privacyRequest.status === "completed") {
    return privacyJson({
      status: "completed",
      requestId: privacyRequest.id,
      receiptCode: privacyRequest.receipt_code,
      receipt: privacyRequest.completion_receipt,
      repeated: true
    });
  }

  const leaseToken = randomUUID();
  const leaseAcquired = await acquireAccountDeletionRunLease({
    supabase,
    requestId: privacyRequest.id,
    leaseToken
  });
  if (!leaseAcquired) {
    return privacyJson(
      {
        error: "A deletion attempt is already running for this account. Try again shortly.",
        code: "deletion_in_progress"
      },
      409
    );
  }
  const leaseHeartbeat = startAccountDeletionRunLeaseHeartbeat({
    supabase,
    requestId: privacyRequest.id,
    leaseToken
  });

  let outcome: DeletionOutcome;
  try {
    try {
      outcome = await runAccountDeletion({ supabase, request: privacyRequest, leaseToken });
    } catch (error) {
      if (error instanceof PrivacyProcessorConfigError) {
        return privacyJson(
          {
            error: "Account deletion is temporarily unavailable. Nothing has been changed. Try again later.",
            code: "privacy_not_ready"
          },
          503
        );
      }
      throw error;
    }
  } finally {
    await leaseHeartbeat.stop();
    try {
      await releaseAccountDeletionRunLease({ supabase, requestId: privacyRequest.id, leaseToken });
    } catch {
      // Completion and its durable receipt take precedence over best-effort
      // lease cleanup. A failed release cannot expose the private row and its
      // short expiry still permits a later resumable attempt.
    }
  }

  if (outcome.status === "blocked_legal_hold") {
    return privacyJson(
      {
        status: "blocked_legal_hold",
        requestId: privacyRequest.id,
        error:
          "We cannot delete this account right now because we are required to preserve its records. Your account is unchanged and you can still download a copy of your data.",
        reason: outcome.error
      },
      409
    );
  }

  if (outcome.status === "failed" || outcome.status === "partially_completed") {
    return privacyJson(
      {
        status: outcome.status,
        requestId: privacyRequest.id,
        resumable: true,
        code: "deletion_incomplete",
        error:
          outcome.status === "partially_completed"
            ? "We could not finish every deletion step. Your account is locked for your protection. Send the same request again and we will resume safely."
            : "We could not begin deleting your account. Nothing was changed. Send the same request again to retry."
      },
      500
    );
  }

  return privacyJson({
    status: "completed",
    requestId: privacyRequest.id,
    receiptCode: outcome.receiptCode,
    receipt: outcome.receipt
  });
}
