import { NextResponse } from "next/server";
import { getSafeRequestId, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";
import { inviteAndMapPartnerUser } from "@/lib/partners/add-partner-user";
import { requireInternalAdminRouteAccess } from "@/lib/partners/internal-admin-gate";
import { SessionPartnerError } from "@/lib/partners/session-partner";

export const dynamic = "force-dynamic";

type InviteSuccessOutcome = "invited_and_mapped" | "already_mapped" | "existing_user_mapped" | "mapped_existing_user";
type InviteFailureOutcome =
  | "validation_failed"
  | "partner_not_found"
  | "conflicting_mapping"
  | "auth_invite_failed"
  | "email_delivery_failed"
  | "mapping_failed"
  | "unknown_error";

export async function POST(request: Request) {
  const requestId = getSafeRequestId(request);

  if (!isSameOriginRequest(request)) {
    logSecurityWarn({ event: "partner_user_invite denied", route: "/internal/partner-users/invite", outcome: "cross_origin", requestId });
    return failureResponse("unknown_error", "Invalid request origin.", { status: 403 });
  }

  try {
    await requireInternalAdminRouteAccess();
  } catch (error) {
    if (error instanceof SessionPartnerError && error.code === "unauthenticated") {
      logSecurityWarn({ event: "partner_user_invite denied", route: "/internal/partner-users/invite", outcome: "unauthenticated", requestId, error });
      return failureResponse("unknown_error", "Authentication required.", { status: 401 });
    }

    if (error instanceof SessionPartnerError) {
      logSecurityWarn({ event: "partner_user_invite denied", route: "/internal/partner-users/invite", outcome: "forbidden", requestId, error });
      return failureResponse("unknown_error", "Internal admin access required.", { status: 403 });
    }

    logSecurityWarn({ event: "partner_user_invite denied", route: "/internal/partner-users/invite", outcome: "unknown_error", requestId, error });
    return failureResponse("unknown_error", "Unable to add the partner user right now.", { status: 500 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return failureResponse("validation_failed", "Invalid request.", { status: 400 });
  }

  let result: Awaited<ReturnType<typeof inviteAndMapPartnerUser>>;
  try {
    result = await inviteAndMapPartnerUser(body as { partnerSlug?: unknown; email?: unknown; role?: unknown; name?: unknown });
  } catch (error) {
    logSecurityWarn({
      event: "partner_user_invite failed",
      route: "/internal/partner-users/invite",
      outcome: "unknown_error",
      requestId,
      error,
      metadata: { action: "partner_user_invite", error_code: "unknown_error" }
    });
    return failureResponse("unknown_error", "Unable to add the partner user right now.", { status: 500 });
  }

  if (!result.ok) {
    const outcome = failureOutcome(result.code, result.error);
    logSecurityWarn({
      event: "partner_user_invite failed",
      route: "/internal/partner-users/invite",
      outcome,
      requestId,
      metadata: { action: "partner_user_invite", error_code: outcome }
    });

    const status = result.code === "invalid_input" || result.code === "partner_not_found" ? 400 : result.code === "partial_state" ? 500 : 409;
    return failureResponse(outcome, result.error, { status });
  }

  const outcome = successOutcome(result.status);
  logSecurityInfo({
    event: "partner_user_invite succeeded",
    route: "/internal/partner-users/invite",
    outcome,
    requestId,
    metadata: { action: "partner_user_invite", status: outcome, row_id: result.partnerUserId }
  });

  return NextResponse.json({
    ok: true,
    outcome,
    message: successMessage(outcome),
    email: result.email,
    partnerSlug: result.partnerSlug,
    role: result.role
  });
}

export function GET() {
  return failureResponse("unknown_error", "Method not allowed.", { status: 405 });
}

function successOutcome(status: string): InviteSuccessOutcome {
  if (status === "mapped_existing_user") {
    return "mapped_existing_user";
  }

  if (status === "already_mapped" || status === "existing_user_mapped") {
    return status;
  }

  return "invited_and_mapped";
}

function successMessage(outcome: InviteSuccessOutcome) {
  if (outcome === "already_mapped") {
    return "That user already has the requested partner access.";
  }

  if (outcome === "existing_user_mapped" || outcome === "mapped_existing_user") {
    return "Existing user was granted partner access.";
  }

  return "Partner user invitation created.";
}

function failureOutcome(code: string, error: string): InviteFailureOutcome {
  if (code === "invalid_input") {
    return "validation_failed";
  }

  if (code === "partner_not_found") {
    return "partner_not_found";
  }

  if (code === "auth_invite_failed" || code === "auth_user_lookup_failed") {
    return "auth_invite_failed";
  }

  if (code === "mapping_failed" && error.toLowerCase().includes("different partner identity")) {
    return "conflicting_mapping";
  }

  if (code === "mapping_failed" || code === "partial_state") {
    return "mapping_failed";
  }

  return "unknown_error";
}

function failureResponse(outcome: InviteFailureOutcome, message: string, init: { status: number }) {
  return NextResponse.json(
    {
      ok: false,
      outcome,
      message
    },
    init
  );
}

function isSameOriginRequest(request: Request) {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  if (origin) {
    return origin === requestOrigin;
  }

  const referer = request.headers.get("referer");
  if (!referer) {
    return false;
  }

  try {
    return new URL(referer).origin === requestOrigin;
  } catch {
    return false;
  }
}
