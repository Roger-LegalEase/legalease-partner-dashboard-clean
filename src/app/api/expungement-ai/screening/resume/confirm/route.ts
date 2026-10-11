import { NextRequest, NextResponse } from "next/server";
import { RCAP_DRAFT_COOKIE, sealRcapDraft, rcapDraftCookieOptions } from "@/lib/expungement-ai/rcap-screening-draft";
import { assertSameOrigin, ONBOARDING_PRIVATE_RESPONSE_HEADERS } from "@/lib/partners/onboarding/request-security";
import { getSafeRequestId, logSecurityError, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { confirmScreeningResume, SupabaseScreeningResumeStorage } from "@/lib/expungement-ai/screening-resume-service";
import { genericResumeFailureResponse } from "@/lib/expungement-ai/screening-resume-security";
import { checkResumeRateLimit, resumeClientIp, resumeRateLimitPolicies } from "@/lib/expungement-ai/screening-resume-rate-limit";
import { waitForResumeConfirmFailureFloor } from "@/lib/expungement-ai/screening-resume-confirm-failure-floor";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
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
    return resumeConfirmFailure(startedAt);
  }

  if (!supabase) {
    logSecurityError({ event: "screening_resume_confirm_unavailable", route: "/api/expungement-ai/screening/resume/confirm", outcome: "supabase_not_configured", requestId });
    return resumeConfirmFailure(startedAt);
  }

  try {
    const result = await confirmScreeningResume(new SupabaseScreeningResumeStorage(supabase), { token, email });
    logSecurityInfo({ event: "screening_resume_confirm_complete", route: "/api/expungement-ai/screening/resume/confirm", outcome: result.ok ? "ok" : "generic_failure", requestId });
    if (!result.ok) return resumeConfirmFailure(startedAt);
    const source = await supabase.from("screening_sessions").select("flow_mode").eq("session_id", result.session.sessionId).maybeSingle();
    if (source.error) return resumeConfirmFailure(startedAt);
    if (source.data?.flow_mode === "rcap") {
      assertSameOrigin(request);
      const clinic = await supabase.from("clinic_assisted_sessions").select("id").eq("screening_session_id", result.session.sessionId).limit(1);
      if (clinic.error) return resumeConfirmFailure(startedAt);
      // Preserve the existing Clinic resume/consent path; its sessions never
      // receive the ordinary anonymous RCAP draft capability.
      if (clinic.data?.length) return NextResponse.json(result, {headers: ONBOARDING_PRIVATE_RESPONSE_HEADERS});
      const screeningUrl = `/expungement-ai/screening/${encodeURIComponent(result.session.jurisdiction)}?session=${encodeURIComponent(result.session.sessionId)}`;
      const response = NextResponse.json({...result, screeningUrl}, {headers: ONBOARDING_PRIVATE_RESPONSE_HEADERS});
      response.cookies.set(RCAP_DRAFT_COOKIE, sealRcapDraft(result.session.sessionId), rcapDraftCookieOptions);
      return response;
    }
    return NextResponse.json(result, { status: 200, headers: ONBOARDING_PRIVATE_RESPONSE_HEADERS });
  } catch (error) {
    logSecurityError({ event: "screening_resume_confirm_failed", route: "/api/expungement-ai/screening/resume/confirm", outcome: "generic_failure", requestId, error });
    return resumeConfirmFailure(startedAt);
  }
}

async function resumeConfirmFailure(startedAt: number) {
  await waitForResumeConfirmFailureFloor(startedAt);
  return NextResponse.json(genericResumeFailureResponse(), { status: 200 });
}

async function safeJson(request: Request) {
  try {
    return await request.json() as Record<string, unknown>;
  } catch {
    return null;
  }
}
