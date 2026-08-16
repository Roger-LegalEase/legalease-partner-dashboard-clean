import { NextResponse } from "next/server";
import { logSecurityError, logSecurityWarn } from "@/lib/observability/logger";
import { PartnerAccessCodeError } from "@/lib/partners/partner-access-codes";

const ROUTE = "/api/partners/access-codes";

export function accessCodeErrorResponse(
  error: unknown,
  requestId: string,
  operation: string
) {
  if (error instanceof PartnerAccessCodeError) {
    const status =
      error.code === "unknown_partner" || error.code === "not_found"
        ? 404
        : error.code === "invalid_input"
          ? 400
          : error.code === "duplicate_code"
            ? 409
            : error.code === "supabase_unconfigured"
              ? 503
              : 500;
    logSecurityWarn({
      event: "access code op failed",
      route: ROUTE,
      outcome: error.code,
      requestId,
      metadata: { operation }
    });
    return NextResponse.json(
      { success: false, error: error.message, code: error.code },
      { status }
    );
  }
  logSecurityError({
    event: "access code op error",
    route: ROUTE,
    outcome: "error",
    requestId,
    error
  });
  throw error;
}
