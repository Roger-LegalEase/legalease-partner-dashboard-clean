import { NextResponse } from "next/server";
import { evaluateAuthoritativeScreeningResult } from "@/lib/expungement-ai/authoritative-screening-result";
import { claimTokenHash, mintClaimToken } from "@/lib/expungement-ai/claim/claim-token";
import { resolveScreeningAttribution } from "@/lib/expungement-ai/claim/screening-attribution";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { ScreeningAnswerValue } from "@/lib/rcap-engine/contracts";
import {
  InvalidAnswerError,
  ProfileVersionMismatchError,
  UnsupportedJurisdictionError
} from "@/lib/rcap-engine/evaluator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Creates a pending result from a completed anonymous screening.
 *
 * Contract §7. The row this writes is not a matter and not a Briefcase: it holds
 * no owner, no entitlement, no payment, no artifact and no verification
 * snapshot. It becomes a matter only through the atomic claim.
 *
 * The response carries the single-use claim token exactly once. The pending id
 * is never returned, because possession of an identifier must not authorize
 * anything.
 */

const maxPayloadBytes = 40_000;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const localePattern = /^[a-z]{2}(-[A-Za-z0-9]{2,8})?$/;

export async function POST(request: Request) {
  const parsed = await readJson(request);
  if (!parsed.ok) return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });

  const body = parsed.value;
  if (typeof body.jurisdiction !== "string"
    || typeof body.profileVersion !== "string"
    || typeof body.screeningCorrelationId !== "string"
    || !isScreeningAnswers(body.answers)) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  let authoritative: ReturnType<typeof evaluateAuthoritativeScreeningResult>;
  try {
    authoritative = evaluateAuthoritativeScreeningResult({
      jurisdiction: body.jurisdiction,
      profileVersion: body.profileVersion,
      matterId: body.screeningCorrelationId,
      answers: body.answers
    });
  } catch (error) {
    if (error instanceof UnsupportedJurisdictionError) {
      return NextResponse.json({ ok: false, error: "unsupported_jurisdiction" }, { status: 404 });
    }
    if (error instanceof ProfileVersionMismatchError) {
      return NextResponse.json({
        ok: false,
        error: "profile_version_mismatch",
        currentProfileVersion: error.currentProfileVersion
      }, { status: 409 });
    }
    if (error instanceof InvalidAnswerError) {
      return NextResponse.json({
        ok: false,
        error: "invalid_question_ids",
        invalidQuestionIds: error.invalidQuestionIds
      }, { status: 400 });
    }
    throw error;
  }

  const { evaluation, pathwayLabel, packetType } = authoritative;

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "pending_storage_unavailable" }, { status: 503 });
  }

  // Attribution comes from the server's own record of the anonymous session.
  // The browser may say which session it was; it may not say who sponsored it.
  const anonymousSessionId = typeof body.anonymousSessionId === "string" && uuidPattern.test(body.anonymousSessionId)
    ? body.anonymousSessionId
    : null;
  const attribution = await resolveScreeningAttribution(anonymousSessionId);

  const claimToken = mintClaimToken();

  const { error } = await supabase
    .from("consumer_pending_screening_results")
    .insert({
      status: "PENDING",
      claim_token_hash: claimTokenHash(claimToken),
      product: attribution.isPartnerSession ? "rcap_partner" : "expungement_ai_dtc",
      jurisdiction: evaluation.jurisdiction.slice(0, 120),
      result_code: evaluation.resultCode,
      pathway_label: pathwayLabel?.slice(0, 200) ?? null,
      packet_type: packetType ?? null,
      payment_allowed: evaluation.paymentAllowed,
      summary: evaluation.userLabel.slice(0, 500),
      next_steps: evaluation.nextSteps.slice(0, 40),
      screening_answers: body.answers,
      result_payload: evaluation,
      candidate_route_context: {
        pathwayId: evaluation.pathwayId ?? null,
        packetType: packetType ?? null,
        treatmentClassification: evaluation.treatmentClassification ?? null
      },
      profile_version: evaluation.profileVersion.slice(0, 120),
      screening_correlation_id: evaluation.matterId.slice(0, 120),
      packet_plan: evaluation.packetPlan ?? {},
      anonymous_session_id: anonymousSessionId,
      locale: typeof body.locale === "string" && localePattern.test(body.locale) ? body.locale : null,
      partner_slug: attribution.partnerSlug,
      program_id: attribution.programId,
      event_id: attribution.eventId,
      campaign_name: attribution.campaignName,
      access_code_id: attribution.accessCodeId,
      consent_grant_id: attribution.consentGrantId
    });

  if (error) {
    return NextResponse.json({ ok: false, error: "pending_storage_failed" }, { status: 503 });
  }

  // The token is returned once and never stored server-side in plaintext. It is
  // deliberately not accompanied by the pending id.
  return NextResponse.json({ ok: true, claimToken });
}

type PendingCreateBody = {
  jurisdiction?: unknown;
  answers?: Record<string, ScreeningAnswerValue>;
  profileVersion?: unknown;
  screeningCorrelationId?: unknown;
  anonymousSessionId?: unknown;
  locale?: unknown;
};

async function readJson(request: Request): Promise<{ ok: true; value: PendingCreateBody } | { ok: false }> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxPayloadBytes) return { ok: false };
  const text = await request.text().catch(() => "");
  if (new TextEncoder().encode(text).length > maxPayloadBytes) return { ok: false };
  try {
    return { ok: true, value: JSON.parse(text) as PendingCreateBody };
  } catch {
    return { ok: false };
  }
}

function isScreeningAnswers(value: unknown): value is Record<string, ScreeningAnswerValue> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  return Object.values(value).every((answer) => {
    if (answer === null || typeof answer === "string" || typeof answer === "number" || typeof answer === "boolean") {
      return true;
    }
    return Array.isArray(answer) && answer.every((entry) => typeof entry === "string");
  });
}
