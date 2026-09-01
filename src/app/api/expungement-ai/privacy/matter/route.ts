import { NextRequest } from "next/server";

import { requireParticipantPrivacyApiSession } from "@/lib/expungement-ai/privacy/api-session";
import { PRIVACY_RATE_LIMIT_POLICIES } from "@/lib/expungement-ai/privacy/contract";
import { runMatterDeletion } from "@/lib/expungement-ai/privacy/deletion";
import { participantSubjectPseudonym } from "@/lib/expungement-ai/privacy/pseudonym";
import { verifyRecentAuthProof } from "@/lib/expungement-ai/privacy/recent-auth";
import {
  assertSameOrigin,
  PrivacyOriginError,
  PrivacyRequestError,
  privacyJson,
  readPrivacyJsonBody,
  requireIdempotencyKey,
  requireUuid
} from "@/lib/expungement-ai/privacy/request-security";
import {
  openPrivacyRequest,
  PrivacyStoreUnavailableError,
  readPrivacyRequest,
  requirePrivacyAdminClient
} from "@/lib/expungement-ai/privacy/store";
import { checkResumeRateLimit } from "@/lib/expungement-ai/screening-resume-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Delete one matter. Destructive, so it needs a recent-auth proof. */
export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
  } catch (error) {
    if (error instanceof PrivacyOriginError) return privacyJson({ error: error.message, code: error.code }, error.status);
    throw error;
  }

  const session = await requireParticipantPrivacyApiSession();
  if (!session.ok) return session.response;

  let matterId: string;
  let idempotencyKey: string;
  let proofToken: unknown;
  try {
    const body = await readPrivacyJsonBody(request);
    matterId = requireUuid(body.matterId, "matter");
    idempotencyKey = requireIdempotencyKey(body.idempotencyKey);
    proofToken = body.proof;
  } catch (error) {
    if (error instanceof PrivacyRequestError) return privacyJson({ error: error.message, code: error.code }, error.status);
    throw error;
  }

  // The proof is bound to this account and to matter deletion specifically. A
  // proof minted for the account-deletion button cannot delete a matter, and a
  // proof minted for another account cannot do anything here at all.
  const proof = verifyRecentAuthProof({ token: proofToken, userId: session.userId, purpose: "matter_deletion" });
  if (!proof.ok) {
    return privacyJson(
      { error: "Confirm your password again to delete this matter.", code: "recent_auth_required", reason: proof.reason },
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
      requestType: "matter_deletion",
      idempotencyKey,
      subjectPseudonym: participantSubjectPseudonym(session.userId),
      recentAuthVerifiedAt: proof.issuedAt,
      recentAuthMethod: "password_reauthentication",
      recentAuthProofHash: proof.proofHash,
      targetMatterItemId: matterId
    });
  } catch (error) {
    // The unique index on the proof hash is what refuses a replayed proof.
    const message = error instanceof Error ? error.message : String(error);
    if (/participant_privacy_requests_proof_uk/.test(message)) {
      return privacyJson(
        { error: "Confirm your password again to delete this matter.", code: "recent_auth_required", reason: "replayed" },
        401
      );
    }
    throw error;
  }

  // An idempotent retry of a finished request returns the receipt it already
  // has rather than deleting a second time.
  if (privacyRequest.status === "completed") {
    return privacyJson({
      status: "completed",
      requestId: privacyRequest.id,
      receiptCode: privacyRequest.receipt_code,
      receipt: privacyRequest.completion_receipt,
      repeated: true
    });
  }

  if (privacyRequest.target_matter_item_id !== matterId) {
    return privacyJson(
      { error: "That confirmation was for a different matter.", code: "idempotency_key_reused" },
      409
    );
  }

  const outcome = await runMatterDeletion({ supabase, request: privacyRequest });

  if (outcome.status === "blocked_legal_hold") {
    return privacyJson(
      {
        status: "blocked_legal_hold",
        requestId: privacyRequest.id,
        error:
          "We cannot delete this matter right now because we are required to preserve it. Nothing else has changed, and you can still download a copy of your data.",
        reason: outcome.error
      },
      409
    );
  }

  if (outcome.status === "failed") {
    const latest = await readPrivacyRequest(supabase, privacyRequest.id);
    return privacyJson(
      {
        status: "failed",
        requestId: privacyRequest.id,
        failedStep: outcome.failedStep,
        resumable: true,
        error:
          "We could not finish deleting this matter. Nothing was left half-done that we cannot pick up: submit the same request again and we resume from where it stopped.",
        lastError: latest?.last_error ?? outcome.error
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
