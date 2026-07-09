import { NextRequest, NextResponse } from "next/server";
import { getSafeRequestId, logSecurityError, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";
import { SessionPartnerError } from "@/lib/partners/session-partner";
import { partnerAuthStatus, resolveAuthorizedPartnerSlug } from "@/lib/partners/partner-scope-auth";
import {
  PARTNER_ACCESS_MODES,
  PartnerAccessCodeError,
  updatePartnerAccessMode,
  type PartnerAccessMode
} from "@/lib/partners/partner-access-codes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/partners/access-mode";

export async function POST(request: NextRequest) {
  const requestId = getSafeRequestId(request);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON." }, { status: 400 });
  }

  const accessMode = body.accessMode;
  if (typeof accessMode !== "string" || !(PARTNER_ACCESS_MODES as string[]).includes(accessMode)) {
    return NextResponse.json({ success: false, error: "A valid access mode is required." }, { status: 400 });
  }

  let partnerSlug: string;
  try {
    ({ partnerSlug } = await resolveAuthorizedPartnerSlug(typeof body.partnerSlug === "string" ? body.partnerSlug : null));
  } catch (error) {
    if (error instanceof SessionPartnerError) {
      logSecurityWarn({ event: "access mode denied", route: ROUTE, outcome: error.code, requestId, error });
      return NextResponse.json({ success: false, error: "Access denied." }, { status: partnerAuthStatus(error) });
    }
    throw error;
  }

  try {
    const mode = await updatePartnerAccessMode({ partnerSlug, accessMode: accessMode as PartnerAccessMode });
    logSecurityInfo({ event: "access mode updated", route: ROUTE, outcome: "ok", requestId, metadata: { accessMode: mode } });
    return NextResponse.json({ success: true, accessMode: mode });
  } catch (error) {
    if (error instanceof PartnerAccessCodeError) {
      const status = error.code === "unknown_partner" ? 404 : error.code === "invalid_input" ? 400 : error.code === "supabase_unconfigured" ? 503 : 500;
      logSecurityWarn({ event: "access mode failed", route: ROUTE, outcome: error.code, requestId });
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status });
    }
    logSecurityError({ event: "access mode error", route: ROUTE, outcome: "error", requestId, error });
    throw error;
  }
}
