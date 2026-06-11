import { NextResponse } from "next/server";
import { getSafeRequestId, logSecurityError, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";
import {
  validateAdminActionRequest
} from "@/lib/partners/admin-actions";
import { runPartnerAdminAction } from "@/lib/partners/admin-action-runner";
import { requireInternalAdminRouteAccess } from "@/lib/partners/internal-admin-gate";
import { getPartnerRecordBySlug } from "@/lib/partners/partner-repository";
import { SessionPartnerError } from "@/lib/partners/session-partner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = getSafeRequestId(request);
  const denied = await denyUnlessInternalAdmin(requestId);
  if (denied) {
    return denied;
  }
  logSecurityInfo({ event: "legacy_admin action allowed", route: "/api/internal/partners/admin-action", outcome: "allowed", requestId });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    logSecurityWarn({ event: "legacy_admin action validation failed", route: "/api/internal/partners/admin-action", outcome: "invalid_json", requestId });
    return NextResponse.json({ error: "Invalid admin action request." }, { status: 400 });
  }

  const validation = validateAdminActionRequest(body && typeof body === "object" ? body : {});
  if (!validation.success) {
    logSecurityWarn({ event: "legacy_admin action validation failed", route: "/api/internal/partners/admin-action", outcome: "invalid_payload", requestId });
    return NextResponse.json({ success: false, error: validation.error }, { status: 400 });
  }

  const { action, partnerSlug, assetKey, note } = validation.data;
  const partner = await getPartnerRecordBySlug(partnerSlug);
  if (!partner) {
    logSecurityWarn({ event: "legacy_admin action failed", route: "/api/internal/partners/admin-action", outcome: "unknown_partner", requestId, metadata: { action } });
    return NextResponse.json({ success: false, error: "Unknown partner." }, { status: 404 });
  }

  const result = await runPartnerAdminAction({ action, partnerSlug, assetKey, note, currentProvisioningStatus: partner.provisioningStatus });
  const status = result.success ? 200 : 500;
  if (result.success) {
    logSecurityInfo({ event: "legacy_admin action success", route: "/api/internal/partners/admin-action", outcome: "ok", requestId, metadata: { action, mode: result.mode } });
  } else {
    logSecurityError({ event: "legacy_admin action failed", route: "/api/internal/partners/admin-action", outcome: "error", requestId, metadata: { action, mode: result.mode } });
  }

  return NextResponse.json(
    {
      success: result.success,
      persisted: result.persisted,
      mode: result.mode,
      action,
      partnerSlug,
      message: result.message,
      error: result.error
    },
    { status }
  );
}

async function denyUnlessInternalAdmin(requestId: string) {
  try {
    await requireInternalAdminRouteAccess();
    return undefined;
  } catch (error) {
    if (error instanceof SessionPartnerError && error.code === "unauthenticated") {
      logSecurityWarn({ event: "legacy_admin action denied", route: "/api/internal/partners/admin-action", outcome: "unauthenticated", requestId, error });
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    if (error instanceof SessionPartnerError) {
      logSecurityWarn({ event: "legacy_admin action denied", route: "/api/internal/partners/admin-action", outcome: "forbidden", requestId, error });
      return NextResponse.json({ success: false, error: "Internal admin access required." }, { status: 403 });
    }

    logSecurityError({ event: "legacy_admin action denied", route: "/api/internal/partners/admin-action", outcome: "error", requestId, error });
    throw error;
  }
}
