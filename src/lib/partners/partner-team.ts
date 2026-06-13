import "server-only";

import { inviteAndMapPartnerUser, validateAddPartnerUserInput, type AddPartnerUserResult } from "@/lib/partners/add-partner-user";
import { getPartnerRecordBySlug } from "@/lib/partners/partner-repository";
import { resolveSessionPartner, SessionPartnerError } from "@/lib/partners/session-partner";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export type ResolvedPartnerSession = {
  kind: "partner";
  authUserId: string;
  partnerSlug: string;
  role: "partner_admin" | "partner_staff";
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
  role: "partner_admin" | "partner_staff";
  status: string;
  createdAt?: string;
};

export type PartnerStaffInviteInput = {
  email?: unknown;
  name?: unknown;
};

type PartnerUserTeamRow = {
  id: string;
  invited_email: string | null;
  partner_slug: string | null;
  role: string;
  status: string;
  created_at: string | null;
};

export async function invitePartnerStaffForCurrentPartner(input: PartnerStaffInviteInput): Promise<AddPartnerUserResult> {
  const sessionPartner = await resolvePartnerAdminSession();
  return inviteAndMapPartnerUser({
    partnerSlug: sessionPartner.partnerSlug,
    email: input.email,
    name: input.name,
    role: "partner_staff"
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
  return validateAddPartnerUserInput({
    partnerSlug: sessionPartner.partnerSlug,
    email: input.email,
    name: input.name,
    role: "partner_staff"
  });
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
    .in("role", ["partner_admin", "partner_staff"])
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

function isPartnerTeamRole(role: string): role is "partner_admin" | "partner_staff" {
  return role === "partner_admin" || role === "partner_staff";
}

function toTitleCase(value: string) {
  return value
    .split("-")
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}
