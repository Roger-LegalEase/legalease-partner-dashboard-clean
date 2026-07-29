import { NextRequest, NextResponse } from "next/server";
import {
  getSafeRequestId,
  logSecurityError,
  logSecurityInfo,
  logSecurityWarn
} from "@/lib/observability/logger";
import { requireInternalAdminRouteAccess } from "@/lib/partners/internal-admin-gate";
import {
  createPartnerOnboarding,
  listOnboardingSummaries
} from "@/lib/partners/partner-onboarding";
import { SessionPartnerError } from "@/lib/partners/session-partner";
import { isRcapPartnerOnboardingEnabled } from "@/lib/partners/onboarding/feature";
import {
  onboardingErrorResponse
} from "@/lib/partners/onboarding/legacy-internal-http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/internal/partners/onboarding";

export async function GET(request: NextRequest) {
  const requestId = getSafeRequestId(request);
  const denied = await denyUnlessInternalAdmin(requestId);
  if (denied) return denied;
  try {
    const partners = await listOnboardingSummaries();
    return NextResponse.json({ success: true, partners });
  } catch (error) {
    return onboardingErrorResponse(error, requestId, "list");
  }
}

export async function POST(request: NextRequest) {
  const requestId = getSafeRequestId(request);
  const denied = await denyUnlessInternalAdmin(requestId);
  if (denied) return denied;
  if (isRcapPartnerOnboardingEnabled()) {
    return NextResponse.json(
      {
        success: false,
        error: "Legacy partner creation is unavailable while Phase 1 onboarding is enabled."
      },
      {
        status: 410,
        headers: { "Cache-Control": "private, no-store, max-age=0" }
      }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON." }, { status: 400 });
  }

  try {
    const onboarding = await createPartnerOnboarding({
      partnerSlug: str(body.partnerSlug),
      organizationName: str(body.organizationName),
      publicDisplayName: strOrNull(body.publicDisplayName),
      website: strOrNull(body.website),
      organizationType: strOrNull(body.organizationType),
      primaryContactName: strOrNull(body.primaryContactName),
      primaryContactEmail: strOrNull(body.primaryContactEmail),
      primaryContactPhone: strOrNull(body.primaryContactPhone),
      targetState: strOrNull(body.targetState),
      targetCounty: strOrNull(body.targetCounty),
      programDescription: strOrNull(body.programDescription),
      internalNotes: strOrNull(body.internalNotes)
    });
    logSecurityInfo({ event: "partner onboarding created", route: ROUTE, outcome: "ok", requestId });
    return NextResponse.json({ success: true, onboarding });
  } catch (error) {
    return onboardingErrorResponse(error, requestId, "create");
  }
}

async function denyUnlessInternalAdmin(requestId: string) {
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

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}
function strOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}
