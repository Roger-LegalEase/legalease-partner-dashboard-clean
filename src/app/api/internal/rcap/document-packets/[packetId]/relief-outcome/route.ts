import { NextResponse } from "next/server";
import { getSafeRequestId, logSecurityError, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";
import { requireInternalAdminRouteAccess } from "@/lib/partners/internal-admin-gate";
import { SessionPartnerError } from "@/lib/partners/session-partner";
import { setRcapDocumentPacketReliefOutcome } from "@/lib/rcap/documents/source-repository";
import { type RcapReliefOutcome, rcapReliefOutcomeValues } from "@/lib/rcap/documents/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ packetId: string }> }
) {
  const requestId = getSafeRequestId(request);
  const denied = await denyUnlessInternalAdmin(requestId);
  if (denied) return denied;

  const { packetId } = await params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    logSecurityWarn({ event: "rcap relief outcome validation failed", route: "/api/internal/rcap/document-packets/[packetId]/relief-outcome", outcome: "invalid_json", requestId });
    return NextResponse.json({ success: false, error: "Invalid relief outcome request." }, { status: 400 });
  }

  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const partnerSlug = typeof input.partnerSlug === "string" ? input.partnerSlug.trim() : "";
  const reliefOutcome = typeof input.reliefOutcome === "string" ? input.reliefOutcome : "";
  if (!partnerSlug || !isRcapReliefOutcome(reliefOutcome)) {
    logSecurityWarn({ event: "rcap relief outcome validation failed", route: "/api/internal/rcap/document-packets/[packetId]/relief-outcome", outcome: "invalid_payload", requestId });
    return NextResponse.json({ success: false, error: "A partner slug and supported relief outcome are required." }, { status: 400 });
  }

  const result = await setRcapDocumentPacketReliefOutcome({ packetId, partnerSlug, reliefOutcome });
  if (!result.ok) {
    logSecurityError({ event: "rcap relief outcome update failed", route: "/api/internal/rcap/document-packets/[packetId]/relief-outcome", outcome: "error", requestId, metadata: { packetId, partnerSlug } });
    return NextResponse.json({ success: false, error: result.error }, { status: 500 });
  }

  logSecurityInfo({ event: "rcap relief outcome update success", route: "/api/internal/rcap/document-packets/[packetId]/relief-outcome", outcome: "ok", requestId, metadata: { packetId, partnerSlug, changed: result.changed } });
  return NextResponse.json({ success: true, changed: result.changed, packet: result.packet });
}

function isRcapReliefOutcome(value: string): value is RcapReliefOutcome {
  return rcapReliefOutcomeValues.includes(value as RcapReliefOutcome);
}

async function denyUnlessInternalAdmin(requestId: string) {
  try {
    await requireInternalAdminRouteAccess();
    return undefined;
  } catch (error) {
    if (error instanceof SessionPartnerError && error.code === "unauthenticated") {
      logSecurityWarn({ event: "rcap relief outcome denied", route: "/api/internal/rcap/document-packets/[packetId]/relief-outcome", outcome: "unauthenticated", requestId, error });
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    if (error instanceof SessionPartnerError) {
      logSecurityWarn({ event: "rcap relief outcome denied", route: "/api/internal/rcap/document-packets/[packetId]/relief-outcome", outcome: "forbidden", requestId, error });
      return NextResponse.json({ success: false, error: "Internal admin access required." }, { status: 403 });
    }

    logSecurityError({ event: "rcap relief outcome denied", route: "/api/internal/rcap/document-packets/[packetId]/relief-outcome", outcome: "error", requestId, error });
    throw error;
  }
}
