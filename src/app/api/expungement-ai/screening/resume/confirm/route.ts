import { NextResponse } from "next/server";
import { getSafeRequestId, logSecurityError, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { confirmScreeningResume, SupabaseScreeningResumeStorage } from "@/lib/expungement-ai/screening-resume-service";
import { genericResumeFailureResponse } from "@/lib/expungement-ai/screening-resume-security";
import { checkResumeRateLimit, resumeClientIp, resumeRateLimitPolicies } from "@/lib/expungement-ai/screening-resume-rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = getSafeRequestId(request);
  const supabase = getSupabaseAdminClient();
  const payload = await safeJson(request);
  const token = typeof payload?.token === "string" ? payload.token : "";
  const email = typeof payload?.email === "string" ? payload.email : "";

  const policy = resumeRateLimitPolicies.confirmIp;
  const rateLimit = await checkResumeRateLimit({
    supabase,
    scope: policy.scope,
    keyParts: [resumeClientIp(request)],
    maxAttempts: policy.maxAttempts,
    windowMs: policy.windowMs
  });
  if (!rateLimit.ok) {
    logSecurityWarn({ event: "screening_resume_confirm_rate_limited", route: "/api/expungement-ai/screening/resume/confirm", outcome: "rate_limited", requestId, metadata: { retry_after_seconds: rateLimit.retryAfterSeconds } });
    return NextResponse.json(genericResumeFailureResponse(), { status: 200 });
  }

  if (!supabase) {
    logSecurityError({ event: "screening_resume_confirm_unavailable", route: "/api/expungement-ai/screening/resume/confirm", outcome: "supabase_not_configured", requestId });
    return NextResponse.json(genericResumeFailureResponse(), { status: 200 });
  }

  try {
    const result = await confirmScreeningResume(new SupabaseScreeningResumeStorage(supabase), { token, email });
    logSecurityInfo({ event: "screening_resume_confirm_complete", route: "/api/expungement-ai/screening/resume/confirm", outcome: result.ok ? "ok" : "generic_failure", requestId });
    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    logSecurityError({ event: "screening_resume_confirm_failed", route: "/api/expungement-ai/screening/resume/confirm", outcome: "generic_failure", requestId, error });
    return NextResponse.json(genericResumeFailureResponse(), { status: 200 });
  }
}

async function safeJson(request: Request) {
  try {
    return await request.json() as Record<string, unknown>;
  } catch {
    return null;
  }
}
