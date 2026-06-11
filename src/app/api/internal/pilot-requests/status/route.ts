import { NextResponse } from "next/server";
import { getSafeRequestId, logSecurityError, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";
import { updatePilotRequestStatusForInternalAdmin } from "@/lib/partners/pilot-requests";
import { isPilotRequestStatus } from "@/lib/partners/pilot-request-status";
import { SessionPartnerError } from "@/lib/partners/session-partner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = getSafeRequestId(request);
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      logSecurityWarn({ event: "pilot_queue status_update validation failed", route: "/api/internal/pilot-requests/status", outcome: "invalid_json", requestId });
      return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      logSecurityWarn({ event: "pilot_queue status_update validation failed", route: "/api/internal/pilot-requests/status", outcome: "invalid_payload", requestId });
      return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
    }

    const payload = body as Record<string, unknown>;
    const id = typeof payload.id === "string" ? payload.id.trim() : "";
    const status = payload.status;

    if (!id || !isPilotRequestStatus(status)) {
      logSecurityWarn({ event: "pilot_queue status_update validation failed", route: "/api/internal/pilot-requests/status", outcome: "invalid_status", requestId });
      return NextResponse.json({ ok: false, error: "Invalid pilot request status update." }, { status: 400 });
    }

    logSecurityInfo({ event: "pilot_queue status_update allowed", route: "/api/internal/pilot-requests/status", outcome: "attempt", requestId, metadata: { row_id: id, new_status: status } });
    await updatePilotRequestStatusForInternalAdmin(id, status);
    logSecurityInfo({ event: "pilot_queue status_update success", route: "/api/internal/pilot-requests/status", outcome: "ok", requestId, metadata: { row_id: id, new_status: status } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof SessionPartnerError) {
      if (error.code === "unauthenticated") {
        logSecurityWarn({ event: "pilot_queue status_update denied", route: "/api/internal/pilot-requests/status", outcome: "unauthenticated", requestId, error });
        return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
      }

      logSecurityWarn({ event: "pilot_queue status_update denied", route: "/api/internal/pilot-requests/status", outcome: "forbidden", requestId, error });
      return NextResponse.json({ ok: false, error: "Internal admin access required." }, { status: 403 });
    }

    logSecurityError({ event: "pilot_queue status_update failure", route: "/api/internal/pilot-requests/status", outcome: "error", requestId, error });
    return NextResponse.json({ ok: false, error: "Unable to update pilot request." }, { status: 500 });
  }
}
