import { NextResponse } from "next/server";
import { getSafeRequestId, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";
import { inviteAndMapPartnerUser } from "@/lib/partners/add-partner-user";
import { requireInternalAdminRouteAccess } from "@/lib/partners/internal-admin-gate";
import { SessionPartnerError } from "@/lib/partners/session-partner";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = getSafeRequestId(request);

  try {
    await requireInternalAdminRouteAccess();
  } catch (error) {
    if (error instanceof SessionPartnerError && error.code === "unauthenticated") {
      logSecurityWarn({ event: "partner_user_invite denied", route: "/internal/partner-users/invite", outcome: "unauthenticated", requestId, error });
      return NextResponse.json({ ok: false, error: "Authentication required." }, { status: 401 });
    }

    if (error instanceof SessionPartnerError) {
      logSecurityWarn({ event: "partner_user_invite denied", route: "/internal/partner-users/invite", outcome: "forbidden", requestId, error });
      return NextResponse.json({ ok: false, error: "Internal admin access required." }, { status: 403 });
    }

    throw error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  const result = await inviteAndMapPartnerUser(body as { partnerSlug?: unknown; email?: unknown; role?: unknown; name?: unknown });

  if (!result.ok) {
    logSecurityWarn({
      event: "partner_user_invite failed",
      route: "/internal/partner-users/invite",
      outcome: result.code,
      requestId,
      metadata: { action: "partner_user_invite", error_code: result.code }
    });

    const status = result.code === "invalid_input" || result.code === "partner_not_found" ? 400 : result.code === "partial_state" ? 500 : 409;
    return NextResponse.json(
      {
        ok: false,
        error: result.error,
        code: result.code,
        authUserId: result.code === "partial_state" ? result.authUserId : undefined
      },
      { status }
    );
  }

  logSecurityInfo({
    event: "partner_user_invite succeeded",
    route: "/internal/partner-users/invite",
    outcome: result.status,
    requestId,
    metadata: { action: "partner_user_invite", status: result.status, row_id: result.partnerUserId }
  });

  return NextResponse.json({
    ok: true,
    status: result.status,
    partnerSlug: result.partnerSlug,
    role: result.role
  });
}

export function GET() {
  return NextResponse.json({ ok: false, error: "Method not allowed." }, { status: 405 });
}
