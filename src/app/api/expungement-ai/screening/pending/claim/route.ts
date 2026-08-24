import { NextResponse } from "next/server";
import { evaluateAuthoritativeScreeningResult } from "@/lib/expungement-ai/authoritative-screening-result";
import { getRcapBriefcaseAuthState } from "@/lib/rcap/briefcase/auth";
import {
  isRcapPartnerScreeningSession,
  saveAuthoritativeScreeningResultToBriefcase
} from "@/lib/expungement-ai/briefcase";
import { recordScreeningEligibilityResult } from "@/lib/expungement-ai/rcap-screening-analytics";
import { buildSaveInput } from "@/lib/expungement-ai/save-result-policy";
import { packetInformationAvailability } from "@/lib/expungement-ai/packet-information";
import { getSafeRequestId, logSecurityError } from "@/lib/observability/logger";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { ScreeningAnswerValue, ScreeningEvaluation } from "@/lib/rcap-engine/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const route = "/api/expungement-ai/screening/pending/claim";
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PendingRow = {
  pending_id: string;
  claimed_user_id: string | null;
  expires_at: string;
  product: "expungement_ai_dtc" | "rcap_partner";
  jurisdiction: string;
  screening_answers: Record<string, ScreeningAnswerValue>;
  profile_version: string | null;
  matter_id: string | null;
  source_session_id: string | null;
};

export async function POST(request: Request) {
  const requestId = getSafeRequestId(request);
  const auth = await getRcapBriefcaseAuthState();
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { pendingId?: string; next?: string } | null;
  const pendingId = body?.pendingId?.trim() ?? "";
  if (!uuidPattern.test(pendingId)) {
    return NextResponse.json({ ok: false, error: "invalid_pending" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "pending_storage_unavailable" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("consumer_pending_screening_results")
    .select("pending_id, claimed_user_id, expires_at, product, jurisdiction, screening_answers, profile_version, matter_id, source_session_id")
    .eq("pending_id", pendingId)
    .maybeSingle<PendingRow>();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "pending_not_found" }, { status: 404 });
  }
  if (data.claimed_user_id && data.claimed_user_id !== auth.userId) {
    return NextResponse.json({ ok: false, error: "pending_claimed" }, { status: 403 });
  }
  if (new Date(data.expires_at).getTime() <= Date.now()) {
    return NextResponse.json({ ok: false, error: "pending_expired" }, { status: 410 });
  }
  if (!data.profile_version || !data.matter_id) {
    return NextResponse.json({ ok: false, error: "pending_incomplete" }, { status: 409 });
  }

  // Re-evaluate from the stored inputs. The coarse result fields saved during
  // the anonymous handoff are never trusted to choose a pathway, packet type,
  // payment posture, or Briefcase status.
  let authoritative: ReturnType<typeof evaluateAuthoritativeScreeningResult>;
  try {
    authoritative = evaluateAuthoritativeScreeningResult({
      jurisdiction: data.jurisdiction,
      profileVersion: data.profile_version,
      matterId: data.matter_id,
      answers: data.screening_answers ?? {}
    });
  } catch {
    return NextResponse.json({ ok: false, error: "pending_could_not_be_verified" }, { status: 409 });
  }

  const { evaluation, pathwayLabel, packetType, selectedTrackId } = authoritative;
  const isPartnerSession = data.product === "rcap_partner"
    && Boolean(data.source_session_id)
    && await isRcapPartnerScreeningSession(data.source_session_id ?? "");
  const sourceSessionId = isPartnerSession ? data.source_session_id ?? undefined : data.pending_id;

  const saveInput = buildSaveInput({
    userId: auth.userId,
    jurisdiction: evaluation.jurisdiction,
    resultCode: evaluation.resultCode,
    pathwayLabel: pathwayLabel ?? evaluation.pathwayId ?? undefined,
    packetType,
    paymentAllowed: evaluation.paymentAllowed,
    summary: evaluation.userLabel,
    nextSteps: evaluation.nextSteps,
    sourceSessionId,
    selectedTrackId,
    treatmentClassification: evaluation.treatmentClassification ?? null,
    deferralComponentIds: evaluation.deferralComponentIds ?? []
  }, { isPartnerSession });

  saveInput.artifactRefs = {
    ...(saveInput.artifactRefs ?? {}),
    selectedTrackId,
    ...(isPacketResult(evaluation.resultCode) ? { productId: "expungement_packet" } : {}),
    commercialFlow: initialCommercialFlow({
      evaluation,
      pathwayLabel,
      packetType,
      screeningAnswers: data.screening_answers ?? {},
      isPartnerSession
    })
  };

  let item;
  try {
    item = await saveAuthoritativeScreeningResultToBriefcase({
      authenticatedUserId: auth.userId,
      item: saveInput
    });
  } catch {
    // The pending result remains unclaimed so the authenticated user can retry.
    // Never report an in-memory item when a configured database rejected the
    // server-authoritative route/payment insert.
    return NextResponse.json({ ok: false, error: "briefcase_persistence_failed" }, { status: 503 });
  }

  // The null-to-user transition is the stable idempotency gate for result
  // analytics. Persistence happens first. Exactly one successful claimant can
  // win this update, so retries and Briefcase refreshes cannot emit again.
  const claim = await supabase
    .from("consumer_pending_screening_results")
    .update({ claimed_at: new Date().toISOString(), claimed_user_id: auth.userId })
    .eq("pending_id", pendingId)
    .is("claimed_user_id", null)
    .select("pending_id")
    .maybeSingle<{ pending_id: string }>();

  if (claim.error) {
    // The case is already durable. Keep the successful participant response;
    // the unclaimed pending row remains available for a later safe retry.
    logSecurityError({
      event: "rcap screening result claim marker failed",
      route,
      outcome: "claim_marker_failed",
      requestId,
      error: claim.error
    });
  }

  if (claim.data && isPartnerSession && data.source_session_id) {
    const analytics = await recordScreeningEligibilityResult(
      data.source_session_id,
      evaluation.resultCode
    );
    if (!analytics.ok) {
      // Analytics is secondary to the persisted case. The claimed pending row,
      // exact Briefcase matter, and source session retain stable reconciliation
      // identity without exposing provider errors to the participant.
      logSecurityError({
        event: "rcap screening result analytics failed",
        route,
        outcome: analytics.reason,
        requestId
      });
    }
  }

  // UX-GLOBAL-003 — "continue" must land on the saved matter's NEXT ACTION, not
  // on a list and not on a page that will refuse. The availability predicate is
  // the same one both Briefcase pages use, so the destination can never be a
  // step the participant is not allowed to take.
  const matterPath = `/briefcase/${encodeURIComponent(item.id)}`;
  const availability = packetInformationAvailability(item, { sponsored: false });
  const nextActionPath = availability.available && availability.model.stage !== "ready_to_generate"
    ? `${matterPath}/packet-information`
    : availability.available
      ? `${matterPath}/review`
      : matterPath;

  return NextResponse.json({
    ok: true,
    itemId: item.id,
    // The exact saved matter remains the claim's redirect target.
    redirectTo: `/briefcase/${encodeURIComponent(item.id)}`,
    nextActionPath
  });
}

function initialCommercialFlow(input: {
  evaluation: ScreeningEvaluation;
  pathwayLabel: string | null;
  packetType: string | undefined;
  screeningAnswers: Record<string, ScreeningAnswerValue>;
  isPartnerSession: boolean;
}) {
  const requiredInputIds = input.evaluation.packetPlan?.requiredInputIds ?? [];
  const serverFacts: Record<string, ScreeningAnswerValue> = {
    jurisdiction: input.evaluation.jurisdiction,
    ...(input.evaluation.pathwayId ? { pathway_id: input.evaluation.pathwayId } : {})
  };
  const prefilledAnswers = Object.fromEntries(
    requiredInputIds
      .filter((id) => id in input.screeningAnswers)
      .map((id) => [id, input.screeningAnswers[id]])
  );

  return {
    version: 1,
    entitlementSource: input.isPartnerSession ? "partner_sponsorship" : "consumer_payment",
    productId: isPacketResult(input.evaluation.resultCode) ? "expungement_packet" : null,
    screening: {
      profileVersion: input.evaluation.profileVersion,
      screeningMatterId: input.evaluation.matterId,
      pathwayId: input.evaluation.pathwayId ?? null,
      pathwayLabel: input.pathwayLabel,
      resultCode: input.evaluation.resultCode,
      paymentAllowed: input.evaluation.paymentAllowed,
      packetType: input.packetType ?? null,
      packetPlan: input.evaluation.packetPlan ?? null,
      answers: input.screeningAnswers
    },
    packetInformation: {
      stage: "not_started",
      requiredInputIds,
      serverFacts,
      prefilledAnswers,
      answers: {},
      missingInputIds: requiredInputIds.filter((id) => !(id in serverFacts) && !(id in prefilledAnswers)),
      updatedAt: null,
      reviewedAt: null
    }
  };
}

function isPacketResult(resultCode: string) {
  return resultCode === "packet_ready" || resultCode === "packet_ready_with_caution";
}
