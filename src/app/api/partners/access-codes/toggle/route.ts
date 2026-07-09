import { NextRequest, NextResponse } from "next/server";
import { getSafeRequestId, logSecurityError, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";
import { SessionPartnerError } from "@/lib/partners/session-partner";
import { partnerAuthStatus, resolveAuthorizedPartnerSlug } from "@/lib/partners/partner-scope-auth";
import { PartnerAccessCodeError, setPartnerAccessCodeActive } from "@/lib/partners/partner-access-codes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/partners/access-codes/toggle";

export async function POST(request: NextRequest) {
  const requestId = getSafeRequestId(request);

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON." }, { status: 400 });
  }

  const codeId = typeof body.codeId === "string" ? body.codeId : "";
  const isActive = body.isActive === true;
  if (!codeId) {
    return NextResponse.json({ success: false, error: "codeId is required." }, { status: 400 });
  }

  let partnerSlug: string;
  try {
    ({ partnerSlug } = await resolveAuthorizedPartnerSlug(typeof body.partnerSlug === "string" ? body.partnerSlug : null));
  } catch (error) {
    if (error instanceof SessionPartnerError) {
      logSecurityWarn({ event: "access code toggle denied", route: ROUTE, outcome: error.code, requestId, error });
      return NextResponse.json({ success: false, error: "Access denied." }, { status: partnerAuthStatus(error) });
    }
    throw error;
  }

  try {
    const code = await setPartnerAccessCodeActive({ partnerSlug, codeId, isActive });
    logSecurityInfo({ event: "access code toggled", route: ROUTE, outcome: isActive ? "enabled" : "disabled", requestId });
    return NextResponse.json({ success: true, code });
  } catch (error) {
    if (error instanceof PartnerAccessCodeError) {
      const status = error.code === "not_found" ? 404 : error.code === "supabase_unconfigured" ? 503 : 500;
      logSecurityWarn({ event: "access code toggle failed", route: ROUTE, outcome: error.code, requestId });
      return NextResponse.json({ success: false, error: error.message, code: error.code }, { status });
    }
    logSecurityError({ event: "access code toggle error", route: ROUTE, outcome: "error", requestId, error });
    throw error;
  }
}
