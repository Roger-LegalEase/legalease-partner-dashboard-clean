import { NextRequest, NextResponse } from "next/server";
import { getSafeRequestId, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";
import { isRcapPartnerOnboardingEnabled } from "@/lib/partners/onboarding/feature";
import { requirePartnerSession, SessionPartnerError } from "@/lib/partners/session-partner";
import {
  getOnboardingForPartner,
  PartnerOnboardingError,
  updatePartnerOwnedTask,
  type TaskStatus
} from "@/lib/partners/partner-onboarding";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/partners/onboarding/checklist";

// Partner admins/staff only. Always scoped to the caller's own partner — the
// slug comes from the session, never from the request, so a partner can never
// read or change another partner's onboarding.
export async function GET(request: NextRequest) {
  const requestId = getSafeRequestId(request);
  let partnerSlug: string;
  try {
    ({ partnerSlug } = await requirePartnerSession());
  } catch (error) {
    return authError(error, requestId);
  }
  if (isRcapPartnerOnboardingEnabled()) {
    return phase1Only();
  }
  try {
    const onboarding = await getOnboardingForPartner(partnerSlug);
    return NextResponse.json({ success: true, onboarding });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

export async function POST(request: NextRequest) {
  const requestId = getSafeRequestId(request);
  let partnerSlug: string;
  let role: string;
  try {
    const session = await requirePartnerSession();
    partnerSlug = session.partnerSlug;
    role = session.role;
  } catch (error) {
    return authError(error, requestId);
  }
  if (isRcapPartnerOnboardingEnabled()) {
    return phase1Only();
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON." }, { status: 400 });
  }

  const taskKey = typeof body.taskKey === "string" ? body.taskKey : "";
  const status = typeof body.status === "string" ? (body.status as TaskStatus) : "complete";
  if (!taskKey) {
    return NextResponse.json({ success: false, error: "taskKey is required." }, { status: 400 });
  }

  try {
    await updatePartnerOwnedTask(partnerSlug, taskKey, status, `partner:${role}`);
    logSecurityInfo({ event: "partner onboarding task updated", route: ROUTE, outcome: "ok", requestId });
    const onboarding = await getOnboardingForPartner(partnerSlug);
    return NextResponse.json({ success: true, onboarding });
  } catch (error) {
    return errorResponse(error, requestId);
  }
}

function phase1Only() {
  return NextResponse.json(
    {
      success: false,
      error: "The legacy onboarding checklist is unavailable while Phase 1 is enabled.",
      canonicalRoute: "/partner/onboarding"
    },
    {
      status: 410,
      headers: { "Cache-Control": "private, no-store, max-age=0" }
    }
  );
}

function authError(error: unknown, requestId: string) {
  if (error instanceof SessionPartnerError) {
    const status = error.code === "unauthenticated" ? 401 : 403;
    logSecurityWarn({ event: "partner onboarding denied", route: ROUTE, outcome: error.code, requestId, error });
    return NextResponse.json({ success: false, error: "Partner access required." }, { status });
  }
  throw error;
}

function errorResponse(error: unknown, requestId: string) {
  if (error instanceof PartnerOnboardingError) {
    const status = error.code === "not_found" ? 404 : error.code === "invalid_input" ? 400 : error.code === "supabase_unconfigured" ? 503 : 500;
    logSecurityWarn({ event: "partner onboarding failed", route: ROUTE, outcome: error.code, requestId });
    return NextResponse.json({ success: false, error: error.message, code: error.code }, { status });
  }
  throw error;
}
