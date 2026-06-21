import { NextResponse } from "next/server";
import { getSafeRequestId, logSecurityError, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { requestFreshScreeningResumeLink, SupabaseScreeningResumeStorage } from "@/lib/expungement-ai/screening-resume-service";
import { checkResumeRateLimit, resumeClientIp, resumeRateLimitPolicies } from "@/lib/expungement-ai/screening-resume-rate-limit";
import { normalizeResumeEmail } from "@/lib/expungement-ai/screening-resume-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const neutralResponse = { ok: true, message: "If that saved session can be resumed, a new link has been sent." };

export async function POST(request: Request) {
  const requestId = getSafeRequestId(request);
  const supabase = getSupabaseAdminClient();
  const payload = await safeJson(request);
  const token = typeof payload?.token === "string" ? payload.token : "";
  const email = typeof payload?.email === "string" ? payload.email : "";
  const normalizedEmail = normalizeResumeEmail(email || "unknown@example.invalid");

  for (const check of [
    { policy: resumeRateLimitPolicies.resendIp, parts: [resumeClientIp(request)] },
    { policy: resumeRateLimitPolicies.resendEmail, parts: [normalizedEmail] }
  ]) {
    const rateLimit = await checkResumeRateLimit({
      supabase,
      scope: check.policy.scope,
      keyParts: check.parts,
      maxAttempts: check.policy.maxAttempts,
      windowMs: check.policy.windowMs
    });
    if (!rateLimit.ok) {
      logSecurityWarn({ event: "screening_resume_resend_rate_limited", route: "/api/expungement-ai/screening/resume/resend", outcome: "rate_limited", requestId, metadata: { retry_after_seconds: rateLimit.retryAfterSeconds } });
      return NextResponse.json(neutralResponse, { status: 200 });
    }
  }

  if (!supabase) {
    logSecurityError({ event: "screening_resume_resend_unavailable", route: "/api/expungement-ai/screening/resume/resend", outcome: "supabase_not_configured", requestId });
    return NextResponse.json(neutralResponse, { status: 200 });
  }

  try {
    const result = await requestFreshScreeningResumeLink(new SupabaseScreeningResumeStorage(supabase), { token, email });
    logSecurityInfo({ event: "screening_resume_resend_complete", route: "/api/expungement-ai/screening/resume/resend", outcome: "neutral_complete", requestId });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    logSecurityError({ event: "screening_resume_resend_failed", route: "/api/expungement-ai/screening/resume/resend", outcome: "neutral_failure", requestId, error });
    return NextResponse.json(neutralResponse, { status: 200 });
  }
}

async function safeJson(request: Request) {
  try {
    return await request.json() as Record<string, unknown>;
  } catch {
    return null;
  }
}
