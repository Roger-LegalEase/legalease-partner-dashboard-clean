import { NextResponse } from "next/server";
import { getSafeRequestId, logSecurityError, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { resumeEmailSendFailureMessage, saveScreeningResumeLink, SupabaseScreeningResumeStorage } from "@/lib/expungement-ai/screening-resume-service";
import type { AnswerValue } from "@/lib/expungement-ai/frontend/contracts";
import { checkResumeRateLimit, resumeClientIp, resumeRateLimitPolicies } from "@/lib/expungement-ai/screening-resume-rate-limit";
import { normalizeResumeEmail } from "@/lib/expungement-ai/screening-resume-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxPayloadBytes = 40_000;

export async function POST(request: Request) {
  const requestId = getSafeRequestId(request);
  const body = await readJson(request);
  if (!body.ok) {
    logSecurityWarn({ event: "screening_resume_save_invalid", route: "/api/expungement-ai/screening/save-resume", outcome: body.reason, requestId });
    return NextResponse.json({ ok: false, message: "We couldn't save that progress right now." }, { status: 400 });
  }

  const payload = body.value as Partial<{
    sessionId: string;
    jurisdiction: string;
    answers: Record<string, AnswerValue>;
    currentQuestionId: string | null;
    furthestStage: string | null;
    lastDropQuestion: string | null;
    email: string;
  }>;

  if (!payload.jurisdiction || !payload.answers || typeof payload.email !== "string") {
    return NextResponse.json({ ok: false, message: "We couldn't save that progress right now." }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    logSecurityError({ event: "screening_resume_save_unavailable", route: "/api/expungement-ai/screening/save-resume", outcome: "supabase_not_configured", requestId });
    return NextResponse.json({ ok: false, message: "We couldn't save that progress right now." }, { status: 503 });
  }

  for (const check of [
    { policy: resumeRateLimitPolicies.resendIp, parts: [resumeClientIp(request)] },
    { policy: resumeRateLimitPolicies.resendEmail, parts: [normalizeResumeEmail(payload.email)] }
  ]) {
    const rateLimit = await checkResumeRateLimit({
      supabase,
      scope: check.policy.scope,
      keyParts: check.parts,
      maxAttempts: check.policy.maxAttempts,
      windowMs: check.policy.windowMs
    });
    if (!rateLimit.ok) {
      logSecurityWarn({ event: "screening_resume_save_rate_limited", route: "/api/expungement-ai/screening/save-resume", outcome: "rate_limited", requestId, metadata: { retry_after_seconds: rateLimit.retryAfterSeconds } });
      return NextResponse.json({ ok: false, message: "We couldn't save that progress right now." }, { status: 429 });
    }
  }

  try {
    const result = await saveScreeningResumeLink(new SupabaseScreeningResumeStorage(supabase), {
      sessionId: payload.sessionId,
      jurisdiction: payload.jurisdiction,
      answers: payload.answers,
      email: payload.email,
      position: {
        currentQuestionId: payload.currentQuestionId ?? null,
        furthestStage: payload.furthestStage ?? null,
        lastDropQuestion: payload.lastDropQuestion ?? payload.currentQuestionId ?? null
      }
    });
    logSecurityInfo({ event: "screening_resume_save_ok", route: "/api/expungement-ai/screening/save-resume", outcome: "ok", requestId });
    return NextResponse.json(result);
  } catch (error) {
    logSecurityError({ event: "screening_resume_save_failed", route: "/api/expungement-ai/screening/save-resume", outcome: "failed", requestId, error });
    return NextResponse.json({ ok: false, message: resumeEmailSendFailureMessage }, { status: 503 });
  }
}

async function readJson(request: Request) {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxPayloadBytes) return { ok: false as const, reason: "payload_too_large" };
  let text = "";
  try {
    text = await request.text();
  } catch {
    return { ok: false as const, reason: "body_read_failed" };
  }
  if (new TextEncoder().encode(text).length > maxPayloadBytes) return { ok: false as const, reason: "payload_too_large" };
  try {
    return { ok: true as const, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false as const, reason: "invalid_json" };
  }
}
