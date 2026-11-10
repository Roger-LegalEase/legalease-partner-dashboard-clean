import { claimTokenHash, isWellFormedClaimToken } from "@/lib/expungement-ai/claim/claim-token";
import { exactMatterPath } from "@/lib/expungement-ai/claim/matter-path";
import type { CreateConsumerBriefcaseItemInput } from "@/lib/expungement-ai/types";
import { NextResponse } from "next/server";
import { evaluateAuthoritativeScreeningResult } from "@/lib/expungement-ai/authoritative-screening-result";
import { getRcapBriefcaseAuthState } from "@/lib/rcap/briefcase/auth";
import {
  isRcapPartnerScreeningSession,
  clampAuthoritativeMatterInput
} from "@/lib/expungement-ai/briefcase";
import { recordScreeningEligibilityResult } from "@/lib/expungement-ai/rcap-screening-analytics";
import { buildSaveInput } from "@/lib/expungement-ai/save-result-policy";
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
  screening_correlation_id: string | null;
  anonymous_session_id: string | null;
};

export async function POST(request: Request) {
  const requestId = getSafeRequestId(request);
  const auth = await getRcapBriefcaseAuthState();
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });
  }

  if (auth.isVerified !== true) {
    return NextResponse.json({ ok: false, error: "account_not_verified" }, { status: 403 });
  }
  const body = await request.json().catch(() => null) as { claimToken?: unknown } | null;
  const claimToken = typeof body?.claimToken === "string" ? body.claimToken.trim() : "";
  if (!isWellFormedClaimToken(claimToken)) {
    return NextResponse.json({ ok: false, error: "claim_rejected" }, { status: 404 });
  }
  const supabase = getSupabaseAdminClient();
  if (!supabase) return NextResponse.json({ ok: false, error: "claim_unavailable" }, { status: 503 });
  const { data, error } = await supabase
    .from("consumer_pending_screening_results")
    .select("pending_id, claimed_user_id, expires_at, product, jurisdiction, screening_answers, profile_version, screening_correlation_id, anonymous_session_id")
    .eq("claim_token_hash", claimTokenHash(claimToken))
    .maybeSingle<PendingRow>();
  if (error) return NextResponse.json({ ok: false, error: "claim_unavailable" }, { status: 503 });
  if (!data) return NextResponse.json({ ok: false, error: "claim_rejected" }, { status: 404 });
  if (!data.profile_version || !data.screening_correlation_id) {
    return NextResponse.json({ ok: false, error: "result_could_not_be_verified" }, { status: 409 });
  }

  // Re-evaluate from the stored inputs. The coarse result fields saved during
  // the anonymous handoff are never trusted to choose a pathway, packet type,
  // payment posture, or Briefcase status.
  let authoritative: ReturnType<typeof evaluateAuthoritativeScreeningResult>;
  try {
    authoritative = evaluateAuthoritativeScreeningResult({
      jurisdiction: data.jurisdiction,
      profileVersion: data.profile_version,
      matterId: data.screening_correlation_id,
      answers: data.screening_answers ?? {}
    });
  } catch {
    return NextResponse.json({ ok: false, error: "pending_could_not_be_verified" }, { status: 409 });
  }

  const { evaluation, pathwayLabel, packetType, selectedTrackId } = authoritative;
  const isPartnerSession = data.product === "rcap_partner"
    && Boolean(data.anonymous_session_id)
    && await isRcapPartnerScreeningSession(data.anonymous_session_id ?? "");
  const sourceSessionId = isPartnerSession ? data.anonymous_session_id ?? undefined : data.pending_id;

  const saveInput = clampAuthoritativeMatterInput(buildSaveInput({
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
  }, { isPartnerSession }));

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

  const claim = await supabase.rpc("claim_pending_screening_result", {
    p_claim_token: claimToken,
    p_user_id: auth.userId,
    p_matter: matterPayload(saveInput, data.product),
    p_request_id: requestId
  });
  if (claim.error) {
    return NextResponse.json({ ok: false, error: "claim_unavailable" }, { status: 503 });
  }
  const returned = Array.isArray(claim.data) ? claim.data[0] : claim.data;
  if (!["claimed", "idempotent_replay"].includes(returned?.outcome) || !returned?.matter_id) {
    return NextResponse.json({ ok: false, error: "claim_rejected" }, { status: 404 });
  }
  if (returned.outcome === "claimed" && isPartnerSession && data.anonymous_session_id) {
    try {
      await recordScreeningEligibilityResult(data.anonymous_session_id, evaluation.resultCode);
    } catch {
      logSecurityError({ event: "screening result analytics failed after claim", route, outcome: "analytics_failed", requestId });
    }
  }
  return NextResponse.json({ ok: true, matterId: returned.matter_id, redirectTo: exactMatterPath(returned.matter_id) });
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

function matterPayload(input: CreateConsumerBriefcaseItemInput, product: PendingRow["product"]) {
  return {
    product, item_type: input.itemType, jurisdiction: input.jurisdiction,
    pathway_label: input.pathwayLabel ?? null, result_code: input.resultCode ?? null,
    packet_type: input.packetType ?? null, payment_allowed: input.paymentAllowed,
    status: input.status, summary_json: { text: input.summary }, next_steps_json: input.nextSteps,
    artifact_refs_json: input.artifactRefs ?? {},
    payment_status: input.paymentAllowed ? "unpaid" : "not_applicable",
    amount_cents: input.paymentAllowed ? 5000 : null,
    packet_status: input.packetStatus ?? "not_started", reminder_at: input.reminderAt ?? null,
    source_session_id: input.sourceSessionId ?? null
  };
}
