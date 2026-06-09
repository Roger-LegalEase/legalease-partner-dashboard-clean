import "server-only";

import { createServerSupabaseAuthClient } from "@/lib/supabase/auth-server";

export type PartnerUserRole = "partner_admin" | "partner_staff";
export type InternalAdminRole = "internal_admin";

export type SessionPartner =
  | {
      kind: "partner";
      authUserId: string;
      partnerSlug: string;
      role: PartnerUserRole;
    }
  | {
      kind: "internal_admin";
      authUserId: string;
      role: InternalAdminRole;
    };

export type SessionPartnerErrorCode =
  | "unauthenticated"
  | "partner_identity_missing"
  | "partner_identity_ambiguous"
  | "partner_identity_invalid";

export class SessionPartnerError extends Error {
  readonly code: SessionPartnerErrorCode;

  constructor(code: SessionPartnerErrorCode, message: string) {
    super(message);
    this.name = "SessionPartnerError";
    this.code = code;
  }
}

type PartnerUserRow = {
  auth_user_id: string;
  partner_slug: string | null;
  role: string;
  status: string;
};

export async function resolveSessionPartner(): Promise<SessionPartner> {
  const supabase = await createServerSupabaseAuthClient();
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData.user) {
    throw new SessionPartnerError("unauthenticated", "An authenticated Supabase session is required.");
  }

  const { data, error } = await supabase
    .from("partner_users")
    .select("auth_user_id, partner_slug, role, status")
    .eq("auth_user_id", userData.user.id)
    .eq("status", "active")
    .limit(2);

  if (error) {
    throw new SessionPartnerError("partner_identity_missing", "Unable to load partner identity.");
  }

  const rows = (data ?? []) as PartnerUserRow[];

  if (rows.length === 0) {
    throw new SessionPartnerError("partner_identity_missing", "No active partner identity exists for this user.");
  }

  if (rows.length > 1) {
    throw new SessionPartnerError("partner_identity_ambiguous", "More than one active partner identity exists for this user.");
  }

  const row = rows[0];

  if (row.auth_user_id !== userData.user.id || row.status !== "active") {
    throw new SessionPartnerError("partner_identity_invalid", "Partner identity is invalid.");
  }

  if (isPartnerRole(row.role)) {
    if (!row.partner_slug) {
      throw new SessionPartnerError("partner_identity_invalid", "Partner identity is missing a partner slug.");
    }

    return {
      kind: "partner",
      authUserId: userData.user.id,
      partnerSlug: row.partner_slug,
      role: row.role
    };
  }

  if (row.role === "internal_admin") {
    if (row.partner_slug !== null) {
      throw new SessionPartnerError("partner_identity_invalid", "Internal admin identity must not be partner-scoped.");
    }

    return {
      kind: "internal_admin",
      authUserId: userData.user.id,
      role: "internal_admin"
    };
  }

  throw new SessionPartnerError("partner_identity_invalid", "Partner identity role is not supported.");
}

export async function requirePartnerSession() {
  const sessionPartner = await resolveSessionPartner();

  if (sessionPartner.kind !== "partner") {
    throw new SessionPartnerError("partner_identity_invalid", "A partner-scoped identity is required.");
  }

  return sessionPartner;
}

export async function requireInternalAdminSession() {
  const sessionPartner = await resolveSessionPartner();

  if (sessionPartner.kind !== "internal_admin") {
    throw new SessionPartnerError("partner_identity_invalid", "An internal admin identity is required.");
  }

  return sessionPartner;
}

function isPartnerRole(role: string): role is PartnerUserRole {
  return role === "partner_admin" || role === "partner_staff";
}
