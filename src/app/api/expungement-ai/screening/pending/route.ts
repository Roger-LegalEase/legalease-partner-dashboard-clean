import { NextResponse } from "next/server";
import { evaluateAuthoritativeScreeningResult } from "@/lib/expungement-ai/authoritative-screening-result";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { ScreeningAnswerValue } from "@/lib/rcap-engine/contracts";
import {
  InvalidAnswerError,
  ProfileVersionMismatchError,
  UnsupportedJurisdictionError
} from "@/lib/rcap-engine/evaluator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxPayloadBytes = 40_000;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const parsed = await readJson(request);
  if (!parsed.ok) return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });

  const body = parsed.value;
  if (typeof body.jurisdiction !== "string"
    || typeof body.profileVersion !== "string"
    || typeof body.matterId !== "string"
    || !isScreeningAnswers(body.answers)) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  let authoritative: ReturnType<typeof evaluateAuthoritativeScreeningResult>;
  try {
    authoritative = evaluateAuthoritativeScreeningResult({
      jurisdiction: body.jurisdiction,
      profileVersion: body.profileVersion,
      matterId: body.matterId,
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

  const { data, error } = await supabase
    .from("consumer_pending_screening_results")
    .insert({
      product: body.product === "rcap_partner" ? "rcap_partner" : "expungement_ai_dtc",
      jurisdiction: evaluation.jurisdiction.slice(0, 120),
      result_code: evaluation.resultCode,
      pathway_label: pathwayLabel?.slice(0, 200) ?? null,
      packet_type: packetType ?? null,
      payment_allowed: evaluation.paymentAllowed,
      summary: evaluation.userLabel.slice(0, 500),
      next_steps: evaluation.nextSteps.slice(0, 40),
      screening_answers: body.answers,
      result_payload: evaluation,
      profile_version: evaluation.profileVersion.slice(0, 120),
      matter_id: evaluation.matterId.slice(0, 120),
      packet_plan: evaluation.packetPlan ?? {},
      source_session_id: typeof body.sourceSessionId === "string" && uuidPattern.test(body.sourceSessionId)
        ? body.sourceSessionId
        : null
    })
    .select("pending_id")
    .single<{ pending_id: string }>();

  if (error || !data?.pending_id) {
    return NextResponse.json({ ok: false, error: "pending_storage_failed" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, pendingId: data.pending_id });
}

type PendingCreateBody = {
  product?: unknown;
  jurisdiction?: unknown;
  answers?: Record<string, ScreeningAnswerValue>;
  profileVersion?: unknown;
  matterId?: unknown;
  sourceSessionId?: unknown;
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
