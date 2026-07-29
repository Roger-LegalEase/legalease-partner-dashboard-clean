import "server-only";

import { NextResponse } from "next/server";
import {
  logSecurityError,
  logSecurityWarn
} from "@/lib/observability/logger";
import { requireInternalAdminRouteAccess } from "@/lib/partners/internal-admin-gate";
import {
  PartnerOnboardingError
} from "@/lib/partners/partner-onboarding";
import { SessionPartnerError } from "@/lib/partners/session-partner";

const ROUTE = "/api/internal/partners/onboarding";

export async function denyUnlessInternalAdmin(requestId: string) {
  try {
    await requireInternalAdminRouteAccess();
    return undefined;
  } catch (error) {
    if (error instanceof SessionPartnerError) {
      const status = error.code === "unauthenticated" ? 401 : 403;
      logSecurityWarn({
        event: "partner onboarding denied",
        route: ROUTE,
        outcome: error.code,
        requestId,
        error
      });
      return NextResponse.json(
        { success: false, error: "Internal admin access required." },
        { status }
      );
    }
    logSecurityError({
      event: "partner onboarding denied",
      route: ROUTE,
      outcome: "error",
      requestId,
      error
    });
    throw error;
  }
}

export function onboardingErrorResponse(
  error: unknown,
  requestId: string,
  operation: string
) {
  if (error instanceof PartnerOnboardingError) {
    const status =
      error.code === "invalid_input"
        ? 400
        : error.code === "duplicate_slug"
          ? 409
          : error.code === "unknown_partner" || error.code === "not_found"
            ? 404
            : error.code === "not_ready"
              ? 409
              : error.code === "supabase_unconfigured"
                ? 503
                : 500;
    logSecurityWarn({
      event: "partner onboarding failed",
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
    event: "partner onboarding failed",
    route: ROUTE,
    outcome: "error",
    requestId,
    error
  });
  throw error;
}
