import { NextResponse } from "next/server";
import { getSafeRequestId, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";
import {
  managePartnerTeamMemberForCurrentPartner,
  type PartnerMembershipAction
} from "@/lib/partners/partner-team";
import { isSameOriginPartnerMutation } from "@/lib/partners/partner-scope-auth";
import { SessionPartnerError, type PartnerUserRole } from "@/lib/partners/session-partner";

export const dynamic = "force-dynamic";

const ROUTE = "/partner/team/members/[memberId]";
const roles: PartnerUserRole[] = ["partner_admin", "partner_staff", "partner_viewer"];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ memberId: string }> }
) {
  const requestId = getSafeRequestId(request);
  if (!isSameOriginPartnerMutation(request)) {
    return NextResponse.json({ ok: false, outcome: "forbidden", message: "Invalid request origin." }, { status: 403 });
  }

  const { memberId } = await params;
  const body = await request.json().catch(() => null) as { action?: unknown; role?: unknown } | null;
  const action = normalizeAction(memberId, body);
  if (!action) {
    return NextResponse.json({ ok: false, outcome: "invalid_input", message: "Choose a valid team action." }, { status: 400 });
  }

  try {
    const result = await managePartnerTeamMemberForCurrentPartner(action);
    const status = statusForOutcome(result.outcome);
    const ok = status < 400;
    const message = messageForOutcome(result.outcome);
    (ok ? logSecurityInfo : logSecurityWarn)({
      event: ok ? "partner membership changed" : "partner membership change denied",
      route: ROUTE,
      outcome: result.outcome,
      requestId,
      metadata: { action: action.action, row_id: result.memberId }
    });
    return NextResponse.json({ ok, ...result, message }, { status });
  } catch (error) {
    const status = error instanceof SessionPartnerError && error.code === "unauthenticated" ? 401 : 403;
    logSecurityWarn({ event: "partner membership change denied", route: ROUTE, outcome: status === 401 ? "unauthenticated" : "forbidden", requestId, error });
    return NextResponse.json({ ok: false, outcome: "forbidden", message: status === 401 ? "Authentication required." : "Partner administrator access is required." }, { status });
  }
}

function normalizeAction(
  memberId: string,
  body: { action?: unknown; role?: unknown } | null
): PartnerMembershipAction | null {
  if (body?.action === "revoke") return { action: "revoke", memberId };
  if (body?.action === "change_role" && typeof body.role === "string" && roles.includes(body.role as PartnerUserRole)) {
    return { action: "change_role", memberId, role: body.role as PartnerUserRole };
  }
  return null;
}

function statusForOutcome(outcome: string) {
  if (["role_changed", "revoked", "unchanged", "already_revoked"].includes(outcome)) return 200;
  if (outcome === "not_found") return 404;
  if (["self_admin_protected", "last_admin_protected", "membership_inactive"].includes(outcome)) return 409;
  if (outcome === "forbidden") return 403;
  return 400;
}

function messageForOutcome(outcome: string) {
  const messages: Record<string, string> = {
    role_changed: "Team role updated.",
    revoked: "Team access revoked immediately.",
    unchanged: "That team member already has this role.",
    already_revoked: "That team member is already offboarded.",
    self_admin_protected: "You cannot remove or demote your own administrator access.",
    last_admin_protected: "Assign another administrator before removing the last active administrator.",
    membership_inactive: "Offboarded memberships cannot be changed.",
    not_found: "Team member not found.",
    forbidden: "Partner administrator access is required.",
    invalid_role: "Choose a valid partner role.",
    invalid_input: "Choose a valid team action."
  };
  return messages[outcome] ?? "The team change could not be completed.";
}
