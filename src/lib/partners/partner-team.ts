import "server-only";

import { inviteAndMapPartnerUser, validateAddPartnerUserInput, type AddPartnerUserResult } from "@/lib/partners/add-partner-user";
import { getPartnerRecordBySlug } from "@/lib/partners/partner-repository";
import { resolveSessionPartner, SessionPartnerError, type PartnerUserRole } from "@/lib/partners/session-partner";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export type ResolvedPartnerSession = {
  kind: "partner";
  authUserId: string;
  partnerSlug: string;
  role: PartnerUserRole;
};

export type ResolvedPartnerAdminSession = {
  kind: "partner";
  authUserId: string;
  partnerSlug: string;
  role: "partner_admin";
};

export type PartnerTeamMember = {
  id: string;
  email?: string;
  role: PartnerUserRole;
  status: string;
  createdAt?: string;
};

export type PartnerStaffInviteInput = {
  email?: unknown;
  name?: unknown;
  role?: unknown;
};

export type PartnerManagedInviteRole = "partner_staff" | "partner_viewer";

export type PartnerMembershipAction =
  | { action: "change_role"; memberId: string; role: PartnerUserRole }
  | { action: "revoke"; memberId: string };

export type PartnerMembershipActionResult = {
  outcome:
    | "role_changed"
    | "revoked"
    | "unchanged"
    | "already_revoked"
    | "self_admin_protected"
    | "last_admin_protected"
    | "membership_inactive"
    | "not_found"
    | "forbidden"
    | "invalid_role"
    | "invalid_input";
  memberId: string | null;
  role: PartnerUserRole | null;
  status: string | null;
};

type PartnerUserTeamRow = {
  id: string;
  invited_email: string | null;
  partner_slug: string | null;
  role: string;
  status: string;
  created_at: string | null;
};

export async function invitePartnerTeamMemberForCurrentPartner(input: PartnerStaffInviteInput): Promise<AddPartnerUserResult> {
  const sessionPartner = await resolvePartnerAdminSession();
  const role = normalizeManagedInviteRole(input.role);
  return inviteAndMapPartnerUser({
    partnerSlug: sessionPartner.partnerSlug,
    email: input.email,
    name: input.name,
    role
  });
}

export async function resolvePartnerAdminSession(): Promise<ResolvedPartnerAdminSession> {
  const sessionPartner = await resolveSessionPartner();

  if (sessionPartner.kind !== "partner" || sessionPartner.role !== "partner_admin") {
    throw new SessionPartnerError("partner_identity_invalid", "Partner admin access is required.");
  }

  return { ...sessionPartner, role: "partner_admin" };
}

export function failureMessageForAddPartnerUser(result: Extract<AddPartnerUserResult, { ok: false }>) {
  if (result.code === "invalid_input") {
    return result.error;
  }

  if (result.code === "mapping_failed" && result.error.toLowerCase().includes("different partner identity")) {
    return "That user already has different partner access.";
  }

  if (result.code === "auth_invite_failed" || result.code === "auth_user_lookup_failed") {
    return "Unable to invite that user.";
  }

  if (result.code === "mapping_failed" || result.code === "partial_state") {
    return "Unable to create partner staff access.";
  }

  return "Unable to invite partner staff right now.";
}

export function validatePartnerStaffInviteInput(sessionPartner: ResolvedPartnerSession, input: PartnerStaffInviteInput) {
  const role = normalizeManagedInviteRole(input.role);
  return validateAddPartnerUserInput({
    partnerSlug: sessionPartner.partnerSlug,
    email: input.email,
    name: input.name,
    role
  });
}

export async function managePartnerTeamMemberForCurrentPartner(
  input: PartnerMembershipAction
): Promise<PartnerMembershipActionResult> {
  const sessionPartner = await resolvePartnerAdminSession();
  const memberId = normalizeUuid(input.memberId);
  if (!memberId) {
    return { outcome: "invalid_input", memberId: null, role: null, status: null };
  }

  const role = input.action === "change_role" && isPartnerTeamRole(input.role)
    ? input.role
    : null;
  if (input.action === "change_role" && !role) {
    return { outcome: "invalid_role", memberId, role: null, status: null };
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new SessionPartnerError("partner_identity_missing", "Partner membership management is unavailable.");
  }

  const { data, error } = await supabase.rpc("manage_partner_membership", {
    p_actor_user_id: sessionPartner.authUserId,
    p_partner_slug: sessionPartner.partnerSlug,
    p_member_id: memberId,
    p_action: input.action,
    p_role: role
  });
  if (error) {
    throw new SessionPartnerError("partner_identity_missing", "Partner membership management failed.");
  }
  const row = (Array.isArray(data) ? data[0] : data) as {
    outcome?: PartnerMembershipActionResult["outcome"];
    member_id?: string | null;
    member_role?: string | null;
    member_status?: string | null;
  } | null;
  return {
    outcome: row?.outcome ?? "invalid_input",
    memberId: row?.member_id ?? null,
    role: row?.member_role && isPartnerTeamRole(row.member_role) ? row.member_role : null,
    status: row?.member_status ?? null
  };
}

export async function getPartnerTeamPageData(sessionPartner: ResolvedPartnerSession) {
  const [partner, members] = await Promise.all([
    getPartnerRecordBySlug(sessionPartner.partnerSlug),
    listPartnerTeamMembersForResolvedSession(sessionPartner)
  ]);

  return {
    partnerName: partner?.organizationName || partner?.partnerName || toTitleCase(sessionPartner.partnerSlug),
    partnerSlug: sessionPartner.partnerSlug,
    members
  };
}

export async function listPartnerTeamMembersForResolvedSession(
  sessionPartner: ResolvedPartnerSession
): Promise<PartnerTeamMember[]> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("partner_users")
    .select("id, invited_email, partner_slug, role, status, created_at")
    .eq("partner_slug", sessionPartner.partnerSlug)
    .in("role", ["partner_admin", "partner_staff", "partner_viewer"])
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return (data as PartnerUserTeamRow[])
    .flatMap((row) => {
      if (row.partner_slug !== sessionPartner.partnerSlug || !isPartnerTeamRole(row.role)) {
        return [];
      }

      return [{
        id: row.id,
        email: row.invited_email ?? undefined,
        role: row.role,
        status: row.status,
        createdAt: row.created_at ?? undefined
      }];
    });
}

function isPartnerTeamRole(role: string): role is PartnerUserRole {
  return role === "partner_admin" || role === "partner_staff" || role === "partner_viewer";
}

function normalizeManagedInviteRole(role: unknown): PartnerManagedInviteRole {
  return role === "partner_viewer" ? "partner_viewer" : "partner_staff";
}

function normalizeUuid(value: string) {
  const normalized = value.trim().toLowerCase();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(normalized)
    ? normalized
    : null;
}

function toTitleCase(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
