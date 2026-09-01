import { NextRequest, NextResponse } from "next/server";
import { clinicErrorResponse } from "@/app/api/clinic/error-response";
import { reserveClinicPacketCredit } from "@/lib/clinic-mode/reporting-service";
import { parseEventId } from "@/lib/clinic-mode/validation";
import { getServerAuthState } from "@/lib/supabase/auth-server";
import { assertClinicMutationRequest } from "@/lib/clinic-mode/request-security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    assertClinicMutationRequest(request);
    const auth = await getServerAuthState();
    if (!auth.isAuthenticated) return NextResponse.json({ success: false, error: "Sign in to reserve sponsored packet generation." }, { status: 401 });
    const body = await request.json() as { renderJobId?: unknown };
    const renderJobId = parseEventId(typeof body.renderJobId === "string" ? body.renderJobId : "");
    const accounting = await reserveClinicPacketCredit(renderJobId);
    const accepted = ["reserved", "already_reserved", "already_consumed"].includes(accounting.outcome);
    return NextResponse.json({ success: accepted, accounting }, { status: accepted ? 200 : 409 });
  } catch (error) {
    return clinicErrorResponse(error);
  }
}
