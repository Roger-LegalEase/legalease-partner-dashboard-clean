import { NextRequest, NextResponse } from "next/server";
import { getSafeRequestId, logSecurityError, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";
import { requireInternalAdminRouteAccess } from "@/lib/partners/internal-admin-gate";
import { SessionPartnerError } from "@/lib/partners/session-partner";
import {
  getRcapPartnerAllowance,
  RcapPartnerAllowanceError,
  updateRcapPartnerAllowance,
  validateScreeningsAllowed
} from "@/lib/expungement-ai/rcap-entitlement-admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const requestId = getSafeRequestId(request);
  const denied = await denyUnlessInternalAdmin(requestId);
  if (denied) return denied;

  const partnerSlug = request.nextUrl.searchParams.get("partnerSlug") ?? "";
  try {
    const allowance = await getRcapPartnerAllowance(partnerSlug);
    logSecurityInfo({ event: "rcap allowance read", route: "/api/internal/partners/rcap-allowance", outcome: "ok", requestId });
    return NextResponse.json({ success: true, allowance });
  } catch (error) {
    return entitlementErrorResponse(error, requestId, "read");
  }
}

export async function POST(request: Request) {
  const requestId = getSafeRequestId(request);
  const denied = await denyUnlessInternalAdmin(requestId);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    logSecurityWarn({ event: "rcap allowance validation failed", route: "/api/internal/partners/rcap-allowance", outcome: "invalid_json", requestId });
    return NextResponse.json({ success: false, error: "Invalid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ success: false, error: "Invalid request body." }, { status: 400 });
  }

  const input = body as {
    partnerSlug?: unknown;
    screeningsAllowed?: unknown;
    contractNote?: unknown;
    periodLabel?: unknown;
  };
  if (typeof input.partnerSlug !== "string") {
    return NextResponse.json({ success: false, error: "partnerSlug is required." }, { status: 400 });
  }

  let screeningsAllowed: number;
  try {
    screeningsAllowed = validateScreeningsAllowed(input.screeningsAllowed);
  } catch (error) {
    return entitlementErrorResponse(error, requestId, "validation");
  }

  try {
    const allowance = await updateRcapPartnerAllowance({
      partnerSlug: input.partnerSlug,
      screeningsAllowed,
      contractNote: typeof input.contractNote === "string" ? input.contractNote : null,
      periodLabel: typeof input.periodLabel === "string" ? input.periodLabel : null
    });
    logSecurityInfo({ event: "rcap allowance updated", route: "/api/internal/partners/rcap-allowance", outcome: "ok", requestId });
    return NextResponse.json({ success: true, allowance });
  } catch (error) {
    return entitlementErrorResponse(error, requestId, "write");
  }
}

async function denyUnlessInternalAdmin(requestId: string) {
  try {
    await requireInternalAdminRouteAccess();
    return undefined;
  } catch (error) {
    if (error instanceof SessionPartnerError && error.code === "unauthenticated") {
      logSecurityWarn({ event: "rcap allowance denied", route: "/api/internal/partners/rcap-allowance", outcome: "unauthenticated", requestId, error });
      return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
    }

    if (error instanceof SessionPartnerError) {
      logSecurityWarn({ event: "rcap allowance denied", route: "/api/internal/partners/rcap-allowance", outcome: "forbidden", requestId, error });
      return NextResponse.json({ success: false, error: "Internal admin access required." }, { status: 403 });
    }

    logSecurityError({ event: "rcap allowance denied", route: "/api/internal/partners/rcap-allowance", outcome: "error", requestId, error });
    throw error;
  }
}

function entitlementErrorResponse(error: unknown, requestId: string, operation: string) {
  if (error instanceof RcapPartnerAllowanceError) {
    const status = error.code === "unknown_partner"
      ? 404
      : error.code === "invalid_allowance"
        ? 400
        : error.code === "supabase_unconfigured"
          ? 503
          : 500;
    logSecurityWarn({ event: "rcap allowance failed", route: "/api/internal/partners/rcap-allowance", outcome: error.code, requestId, metadata: { operation } });
    return NextResponse.json({ success: false, error: error.message, code: error.code }, { status });
  }

  logSecurityError({ event: "rcap allowance failed", route: "/api/internal/partners/rcap-allowance", outcome: "error", requestId, error });
  throw error;
}
