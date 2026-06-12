import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";

export const addPartnerUserRoles = ["partner_admin", "partner_staff"] as const;

export type AddPartnerUserRole = (typeof addPartnerUserRoles)[number];

export type AddPartnerUserInput = {
  partnerSlug?: unknown;
  email?: unknown;
  role?: unknown;
  name?: unknown;
};

export type AddPartnerUserResult =
  | {
      ok: true;
      status: "invited_and_mapped" | "existing_user_mapped" | "already_mapped";
      authUserId: string;
      partnerUserId?: string;
      partnerSlug: string;
      role: AddPartnerUserRole;
    }
  | {
      ok: false;
      error: string;
      code:
        | "invalid_input"
        | "supabase_not_configured"
        | "partner_not_found"
        | "auth_invite_failed"
        | "auth_user_lookup_failed"
        | "mapping_failed"
        | "partial_state";
      authUserId?: string;
    };

type AuthUser = {
  id: string;
  email?: string;
};

type PartnerUserRow = {
  id: string;
  auth_user_id: string;
  partner_slug: string | null;
  role: string;
  status: string;
};

const maxEmailLength = 254;
const maxNameLength = 120;
const maxPartnerSlugLength = 120;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateAddPartnerUserInput(input: AddPartnerUserInput):
  | { ok: true; partnerSlug: string; email: string; role: AddPartnerUserRole; name?: string }
  | { ok: false; error: string } {
  const partnerSlug = normalizeString(input.partnerSlug).toLowerCase();
  const email = normalizeString(input.email).toLowerCase();
  const role = normalizeString(input.role);
  const name = normalizeString(input.name);

  if (!partnerSlug || partnerSlug.length > maxPartnerSlugLength || !/^[a-z0-9][a-z0-9-]*$/.test(partnerSlug)) {
    return { ok: false, error: "Choose a valid partner." };
  }

  if (!email || email.length > maxEmailLength || !emailPattern.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }

  if (!isAllowedAddPartnerUserRole(role)) {
    return { ok: false, error: "Choose partner_admin or partner_staff." };
  }

  if (name.length > maxNameLength) {
    return { ok: false, error: "Shorten the name or label and try again." };
  }

  return {
    ok: true,
    partnerSlug,
    email,
    role,
    name: name || undefined
  };
}

export async function inviteAndMapPartnerUser(input: AddPartnerUserInput): Promise<AddPartnerUserResult> {
  const validated = validateAddPartnerUserInput(input);
  if (!validated.ok) {
    return { ok: false, code: "invalid_input", error: validated.error };
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { ok: false, code: "supabase_not_configured", error: "Supabase admin access is not configured." };
  }

  const redirectTo = getInviteAcceptanceRedirectUrl();
  if (!redirectTo) {
    return { ok: false, code: "supabase_not_configured", error: "Invite redirect is not configured." };
  }

  const partnerExists = await validatePartnerExists(supabase, validated.partnerSlug);
  if (!partnerExists.ok) {
    return partnerExists;
  }

  const invited = await inviteOrFindAuthUser(supabase, validated.email, redirectTo, validated.name);
  if (!invited.ok) {
    return invited;
  }

  const existingMapping = await findPartnerUserMapping(supabase, invited.authUser.id);
  if (!existingMapping.ok) {
    return existingMapping;
  }

  if (existingMapping.row) {
    if (
      existingMapping.row.partner_slug === validated.partnerSlug &&
      existingMapping.row.role === validated.role &&
      existingMapping.row.status === "active"
    ) {
      return {
        ok: true,
        status: "already_mapped",
        authUserId: invited.authUser.id,
        partnerUserId: existingMapping.row.id,
        partnerSlug: validated.partnerSlug,
        role: validated.role
      };
    }

    return {
      ok: false,
      code: "mapping_failed",
      error: "That auth user already has a different partner identity.",
      authUserId: invited.authUser.id
    };
  }

  const mapping = await insertPartnerUserMapping(supabase, {
    authUserId: invited.authUser.id,
    partnerSlug: validated.partnerSlug,
    role: validated.role,
    invitedEmail: validated.email
  });

  if (!mapping.ok) {
    if (invited.createdByInvite) {
      const cleanup = await supabase.auth.admin.deleteUser(invited.authUser.id);
      if (cleanup.error) {
        return {
          ok: false,
          code: "partial_state",
          error: "Invite was created, but partner mapping failed and cleanup did not complete. Resolve this auth user manually.",
          authUserId: invited.authUser.id
        };
      }
    }

    return {
      ok: false,
      code: "mapping_failed",
      error: mapping.error,
      authUserId: invited.authUser.id
    };
  }

  return {
    ok: true,
    status: invited.createdByInvite ? "invited_and_mapped" : "existing_user_mapped",
    authUserId: invited.authUser.id,
    partnerUserId: mapping.partnerUserId,
    partnerSlug: validated.partnerSlug,
    role: validated.role
  };
}

function isAllowedAddPartnerUserRole(role: string): role is AddPartnerUserRole {
  return addPartnerUserRoles.includes(role as AddPartnerUserRole);
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getInviteAcceptanceRedirectUrl() {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (!appUrl) {
    return null;
  }

  try {
    const url = new URL(appUrl);
    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    url.pathname = "/auth/set-password";
    url.search = "?next=/partner/dashboard";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

async function validatePartnerExists(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  partnerSlug: string
): Promise<{ ok: true } | Extract<AddPartnerUserResult, { ok: false }>> {
  const { data, error } = await supabase
    .from("partner_records")
    .select("partner_slug")
    .eq("partner_slug", partnerSlug)
    .maybeSingle();

  if (error || !data) {
    return { ok: false, code: "partner_not_found", error: "Choose an existing partner." };
  }

  return { ok: true };
}

async function inviteOrFindAuthUser(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  email: string,
  redirectTo: string,
  name?: string
): Promise<
  | { ok: true; authUser: AuthUser; createdByInvite: boolean }
  | Extract<AddPartnerUserResult, { ok: false }>
> {
  const metadata = name ? { name } : undefined;
  const invite = await supabase.auth.admin.inviteUserByEmail(email, {
    ...(metadata ? { data: metadata } : {}),
    redirectTo
  });
  const invitedUser = invite.data.user as AuthUser | null;

  if (!invite.error && invitedUser?.id) {
    return { ok: true, authUser: invitedUser, createdByInvite: true };
  }

  const existing = await findAuthUserByEmail(supabase, email);
  if (existing.ok && existing.authUser) {
    return { ok: true, authUser: existing.authUser, createdByInvite: false };
  }

  if (!existing.ok) {
    return existing;
  }

  return {
    ok: false,
    code: "auth_invite_failed",
    error: "Unable to invite that user."
  };
}

async function findAuthUserByEmail(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  email: string
): Promise<
  | { ok: true; authUser: AuthUser | null }
  | Extract<AddPartnerUserResult, { ok: false }>
> {
  const normalizedEmail = email.toLowerCase();
  const perPage = 1000;
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      return { ok: false, code: "auth_user_lookup_failed", error: "Unable to check existing auth users." };
    }

    const match = data.users.find((user) => user.email?.toLowerCase() === normalizedEmail) as AuthUser | undefined;
    if (match) {
      return { ok: true, authUser: match };
    }

    if (data.users.length < perPage) {
      return { ok: true, authUser: null };
    }
  }

  return { ok: false, code: "auth_user_lookup_failed", error: "Unable to check existing auth users within the safety limit." };
}

async function findPartnerUserMapping(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  authUserId: string
): Promise<
  | { ok: true; row: PartnerUserRow | null }
  | Extract<AddPartnerUserResult, { ok: false }>
> {
  const { data, error } = await supabase
    .from("partner_users")
    .select("id, auth_user_id, partner_slug, role, status")
    .eq("auth_user_id", authUserId)
    .maybeSingle();

  if (error) {
    return { ok: false, code: "mapping_failed", error: "Unable to check existing partner mapping.", authUserId };
  }

  return { ok: true, row: (data as PartnerUserRow | null) ?? null };
}

async function insertPartnerUserMapping(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>,
  mapping: {
    authUserId: string;
    partnerSlug: string;
    role: AddPartnerUserRole;
    invitedEmail: string;
  }
): Promise<{ ok: true; partnerUserId: string } | { ok: false; error: string }> {
  const { data, error } = await supabase
    .from("partner_users")
    .insert({
      auth_user_id: mapping.authUserId,
      partner_slug: mapping.partnerSlug,
      role: mapping.role,
      status: "active",
      invited_email: mapping.invitedEmail
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: "Unable to create the partner user mapping." };
  }

  return { ok: true, partnerUserId: String(data.id) };
}
