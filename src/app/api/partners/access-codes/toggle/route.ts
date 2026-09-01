import { NextRequest, NextResponse } from "next/server";
import { getSafeRequestId, logSecurityError, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";
import { SessionPartnerError } from "@/lib/partners/session-partner";
import { isSameOriginPartnerMutation, partnerAuthStatus, resolveAuthorizedPartnerSlug } from "@/lib/partners/partner-scope-auth";
import { PartnerAccessCodeError, setPartnerAccessCodeLifecycle } from "@/lib/partners/partner-access-codes";
import { accessCodeErrorResponse } from "../error-response";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/partners/access-codes/toggle";

export async function POST(request: NextRequest) {
  const requestId = getSafeRequestId(request);

  if (!isSameOriginPartnerMutation(request)) {
    return NextResponse.json({ success: false, error: "Invalid request origin." }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON." }, { status: 400 });
  }

  const codeId = typeof body.codeId === "string" ? body.codeId : "";
  const status = body.lifecycleStatus === "revoked"
    ? "revoked"
    : body.isActive === true ? "live" : "paused";
  if (!codeId) {
    return NextResponse.json({ success: false, error: "codeId is required." }, { status: 400 });
  }

  let partnerSlug: string;
  let actorUserId: string;
  try {
    ({ partnerSlug, authUserId: actorUserId } = await resolveAuthorizedPartnerSlug(
      typeof body.partnerSlug === "string" ? body.partnerSlug : null,
      { requireAdministrator: true }
    ));
  } catch (error) {
    if (error instanceof SessionPartnerError) {
      logSecurityWarn({ event: "access code toggle denied", route: ROUTE, outcome: error.code, requestId, error });
      return NextResponse.json({ success: false, error: "Access denied." }, { status: partnerAuthStatus(error) });
    }
    throw error;
  }

  try {
    const code = await setPartnerAccessCodeLifecycle({ partnerSlug, codeId, status, actorUserId });
    logSecurityInfo({ event: "access code lifecycle changed", route: ROUTE, outcome: status, requestId });
    return NextResponse.json({ success: true, code });
  } catch (error) {
    if (error instanceof PartnerAccessCodeError) {
      return accessCodeErrorResponse(error, requestId, "lifecycle");
    }
    logSecurityError({ event: "access code toggle error", route: ROUTE, outcome: "error", requestId, error });
    throw error;
  }
}
