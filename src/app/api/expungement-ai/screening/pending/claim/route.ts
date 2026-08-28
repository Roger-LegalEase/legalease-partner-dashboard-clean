import { NextResponse } from "next/server";
import { claimPendingScreeningResult } from "@/lib/expungement-ai/claim/claim-service";
import { getRcapBriefcaseAuthState } from "@/lib/rcap/briefcase/auth";
import { recordScreeningEligibilityResult } from "@/lib/expungement-ai/rcap-screening-analytics";
import { createClinicReviewFollowUpForSavedMatter } from "@/lib/clinic-mode/result-follow-up";
import { getSafeRequestId, logSecurityError } from "@/lib/observability/logger";
import { recordOutstandingClinicFollowUp } from "@/lib/expungement-ai/claim/claim-obligations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Claims a pending result into a participant-owned matter.
 *
 * The browser submits one opaque single-use claim token and nothing else. It
 * does not submit an owner, a matter identifier, a partner, a payment posture,
 * a sponsorship or a packet authority, and none of those would be believed.
 *
 * Everything that decides ownership happens inside one database transaction --
 * see src/lib/expungement-ai/claim/claim-service.ts. Analytics and Clinic
 * follow-up run strictly after that transaction commits and can never turn a
 * successful claim into a failure: the matter is already durable and owned.
 */

const route = "/api/expungement-ai/screening/pending/claim";

export async function POST(request: Request) {
  const requestId = getSafeRequestId(request);
  const auth = await getRcapBriefcaseAuthState();
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { claimToken?: unknown } | null;
  const claimToken = typeof body?.claimToken === "string" ? body.claimToken.trim() : "";

  const claim = await claimPendingScreeningResult({
    claimToken,
    authenticatedUserId: auth.userId,
    accountVerified: auth.isVerified === true,
    requestId
  });

  if (!claim.ok) {
    // Every denial answers the same way. Telling a caller whether a result
    // exists, has expired, or belongs to someone else is the disclosure the
    // generic answer exists to prevent.
    const status = claim.reason === "unverified_account" ? 403
      : claim.reason === "storage_unavailable" ? 503
        : claim.reason === "could_not_verify" ? 409
          : 404;
    if (claim.reason === "storage_unavailable" || claim.reason === "could_not_verify") {
      logSecurityError({ event: "pending result claim could not complete", route, outcome: claim.reason, requestId });
    }
    return NextResponse.json({ ok: false, error: genericError(claim.reason) }, { status });
  }

  // --- after the ownership transaction has committed -------------------------
  // Both of these are idempotent and both are secondary. A failure here is
  // logged and does not change the participant's answer, because the matter
  // exists and is theirs.

  if (claim.pending.product === "rcap_partner" && claim.pending.anonymous_session_id) {
    try {
      await createClinicReviewFollowUpForSavedMatter({
        participantUserId: auth.userId,
        screeningSessionId: claim.pending.anonymous_session_id,
        matterId: claim.matterId,
        evaluation: claim.evaluation
      });
    } catch {
      // Contract §4: follow-up creation happens after the ownership transaction
      // and can never fail it. The obligation is not dropped -- it is written to
      // the append-only claim audit, and it is retried idempotently every time
      // this claim is replayed, which is what a returning participant does.
      logSecurityError({
        event: "clinic review follow-up failed after a successful claim",
        route,
        outcome: "clinic_follow_up_failed",
        requestId
      });
      await recordOutstandingClinicFollowUp({
        pendingResultId: claim.pending.pending_id,
        matterId: claim.matterId,
        actorUserId: auth.userId,
        product: claim.pending.product,
        jurisdiction: claim.pending.jurisdiction,
        partnerSlug: claim.pending.partner_slug,
        eventId: claim.pending.event_id,
        requestId
      });
    }

    // The pending result's PENDING -> CLAIMED transition is the idempotency
    // gate: only the transaction that actually claimed emits. A replay reports
    // idempotent_replay and stays silent.
    if (claim.outcome === "claimed") {
      const analytics = await recordScreeningEligibilityResult(
        claim.pending.anonymous_session_id,
        claim.evaluation.resultCode
      );
      if (!analytics.ok) {
        logSecurityError({
          event: "screening result analytics failed after a successful claim",
          route,
          outcome: analytics.reason,
          requestId
        });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    matterId: claim.matterId,
    redirectTo: claim.redirectTo
  });
}

function genericError(reason: string) {
  if (reason === "unverified_account") return "account_not_verified";
  if (reason === "storage_unavailable") return "claim_unavailable";
  if (reason === "could_not_verify") return "result_could_not_be_verified";
  return "claim_rejected";
}
