import { NextResponse } from "next/server";
import { getSafeRequestId, logSecurityError, logSecurityInfo } from "@/lib/observability/logger";
import { optOutScreeningDropPointNudges, SupabaseScreeningNudgeStorage } from "@/lib/expungement-ai/screening-drop-point-nudge-service";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const responseText = "These reminders are turned off.";

export async function GET(request: Request) {
  const requestId = getSafeRequestId(request);
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const supabase = getSupabaseAdminClient();

  if (!supabase) {
    logSecurityError({ event: "screening_nudge_opt_out_unavailable", route: "/api/expungement-ai/screening/nudge/opt-out", outcome: "supabase_not_configured", requestId });
    return plainResponse();
  }

  try {
    await optOutScreeningDropPointNudges(new SupabaseScreeningNudgeStorage(supabase), token);
    logSecurityInfo({ event: "screening_nudge_opt_out_complete", route: "/api/expungement-ai/screening/nudge/opt-out", outcome: "neutral_complete", requestId });
    return plainResponse();
  } catch (error) {
    logSecurityError({ event: "screening_nudge_opt_out_failed", route: "/api/expungement-ai/screening/nudge/opt-out", outcome: "neutral_failure", requestId, error });
    return plainResponse();
  }
}

function plainResponse() {
  return new NextResponse(responseText, {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" }
  });
}
