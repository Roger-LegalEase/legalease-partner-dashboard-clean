import { NextResponse } from "next/server";
import { getSafeRequestId, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";
import { failureMessageForAddPartnerUser, invitePartnerStaffForCurrentPartner, validatePartnerStaffInviteInput, type ResolvedPartnerAdminSession } from "@/lib/partners/partner-team";
import { checkPartnerTeamInviteRateLimit } from "@/lib/partners/partner-team-rate-limit";
import { resolveSessionPartner, SessionPartnerError } from "@/lib/partners/session-partner";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PartnerTeamInviteSuccessOutcome = "invited_and_mapped" | "already_mapped" | "existing_user_mapped" | "mapped_existing_user";
type PartnerTeamInviteFailureOutcome =
  | "validation_failed"
  | "forbidden"
  | "rate_limited"
  | "conflicting_mapping"
  | "auth_invite_failed"
  | "mapping_failed"
  | "unknown_error";

export async function POST(request: Request) {
  const requestId = getSafeRequestId(request);

  if (!isSameOriginRequest(request)) {
    logSecurityWarn({ event: "partner_team_invite denied", route: "/partner/team/invite", outcome: "cross_origin", requestId });
    return failureResponse("forbidden", "Invalid request origin.", { status: 403 });
  }

  const gate = await requirePartnerAdmin(requestId);
  if (!gate.ok) {
    return gate.response;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return failureResponse("validation_failed", "Invalid request.", { status: 400 });
  }

  const input = body && typeof body === "object" ? (body as { email?: unknown; name?: unknown }) : {};
  const validated = validatePartnerStaffInviteInput(gate.sessionPartner, input);
  if (!validated.ok) {
    return failureResponse("validation_failed", validated.error, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return failureResponse("unknown_error", "Unable to invite partner staff right now.", { status: 500 });
  }

  const rateLimit = await checkPartnerTeamInviteRateLimit(supabase, {
    partnerSlug: gate.sessionPartner.partnerSlug,
    email: validated.email
  });
  if (!rateLimit.ok) {
    logSecurityWarn({
      event: "partner_team_invite denied",
      route: "/partner/team/invite",
      outcome: rateLimit.reason === "blocked" ? "rate_limited" : "unknown_error",
      requestId,
      error: rateLimit.error,
      metadata: { action: "partner_team_invite", error_code: rateLimit.reason }
    });

    if (rateLimit.reason === "blocked") {
      return failureResponse("rate_limited", "Too many invite attempts. Please try again later.", { status: 429 });
    }

    return failureResponse("unknown_error", "Unable to invite partner staff right now.", { status: 500 });
  }

  let result: Awaited<ReturnType<typeof invitePartnerStaffForCurrentPartner>>;
  try {
    result = await invitePartnerStaffForCurrentPartner(input);
  } catch (error) {
    logSecurityWarn({
      event: "partner_team_invite failed",
      route: "/partner/team/invite",
      outcome: "unknown_error",
      requestId,
      error,
      metadata: { action: "partner_team_invite", error_code: "unknown_error" }
    });
    return failureResponse("unknown_error", "Unable to invite partner staff right now.", { status: 500 });
  }

  if (!result.ok) {
    const outcome = failureOutcome(result.code, result.error);
    logSecurityWarn({
      event: "partner_team_invite failed",
      route: "/partner/team/invite",
      outcome,
      requestId,
      metadata: { action: "partner_team_invite", error_code: outcome }
    });

    const status = result.code === "invalid_input" ? 400 : result.code === "partial_state" ? 500 : outcome === "conflicting_mapping" ? 409 : 500;
    return failureResponse(outcome, failureMessageForAddPartnerUser(result), { status });
  }

  const outcome = successOutcome(result.status);
  logSecurityInfo({
    event: "partner_team_invite succeeded",
    route: "/partner/team/invite",
    outcome,
    requestId,
    metadata: { action: "partner_team_invite", status: outcome, row_id: result.partnerUserId }
  });

  return NextResponse.json({
    ok: true,
    outcome,
    message: successMessage(outcome),
    email: result.email,
    partnerSlug: gate.sessionPartner.partnerSlug,
    role: "partner_staff"
  });
}

export function GET() {
  return failureResponse("unknown_error", "Method not allowed.", { status: 405 });
}

async function requirePartnerAdmin(requestId: string): Promise<
  | { ok: true; sessionPartner: ResolvedPartnerAdminSession }
  | { ok: false; response: NextResponse }
> {
  try {
    const sessionPartner = await resolveSessionPartner();
    if (sessionPartner.kind !== "partner" || sessionPartner.role !== "partner_admin") {
      logSecurityWarn({ event: "partner_team_invite denied", route: "/partner/team/invite", outcome: "forbidden", requestId });
      return { ok: false, response: failureResponse("forbidden", "Partner admin access is required.", { status: 403 }) };
    }

    return { ok: true, sessionPartner: { ...sessionPartner, role: "partner_admin" } };
  } catch (error) {
    if (error instanceof SessionPartnerError && error.code === "unauthenticated") {
      logSecurityWarn({ event: "partner_team_invite denied", route: "/partner/team/invite", outcome: "unauthenticated", requestId, error });
      return { ok: false, response: failureResponse("unknown_error", "Authentication required.", { status: 401 }) };
    }

    logSecurityWarn({ event: "partner_team_invite denied", route: "/partner/team/invite", outcome: "forbidden", requestId, error });
    return { ok: false, response: failureResponse("forbidden", "Partner admin access is required.", { status: 403 }) };
  }
}

function successOutcome(status: string): PartnerTeamInviteSuccessOutcome {
  if (status === "mapped_existing_user") {
    return "mapped_existing_user";
  }

  if (status === "already_mapped" || status === "existing_user_mapped") {
    return status;
  }

  return "invited_and_mapped";
}

function successMessage(outcome: PartnerTeamInviteSuccessOutcome) {
  if (outcome === "already_mapped") {
    return "That user already has partner staff access.";
  }

  if (outcome === "existing_user_mapped" || outcome === "mapped_existing_user") {
    return "Existing user was granted partner staff access.";
  }

  return "Partner staff invitation created.";
}

function failureOutcome(code: string, error: string): PartnerTeamInviteFailureOutcome {
  if (code === "invalid_input") {
    return "validation_failed";
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

function failureResponse(outcome: PartnerTeamInviteFailureOutcome, message: string, init: { status: number }) {
  return NextResponse.json({ ok: false, outcome, message }, init);
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
