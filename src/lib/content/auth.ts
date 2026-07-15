import "server-only";

import { NextResponse } from "next/server";
import { redirect } from "next/navigation";

import { getServerAuthState } from "@/lib/supabase/auth-server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { requireInternalAdminSession } from "@/lib/partners/session-partner";
import { logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";
import {
  type ContentCapability,
  type ContentRole,
  isContentRole,
  roleHasCapability
} from "@/lib/content/types";

/**
 * Content-platform authorization.
 *
 * Reuses the existing Supabase auth and the existing internal-admin identity — there is no second
 * login system and no hardcoded administrator email anywhere. An existing trusted internal admin
 * (public.is_internal_admin(), phase 21) is a content primary_admin implicitly; everyone else needs
 * an explicit row in content_admin_users.
 *
 * This mirrors, in the app layer, exactly what the RLS policies in phase-43 enforce in the database.
 * Both layers are load-bearing: the app gives good errors, the database is the thing that cannot be
 * bypassed.
 */

export type ContentSession = {
  userId: string;
  role: ContentRole;
  partnerSlug: string | null;
};

export class ContentAuthError extends Error {
  constructor(
    readonly code: "unauthenticated" | "forbidden",
    message: string
  ) {
    super(message);
    this.name = "ContentAuthError";
  }
}

/**
 * Resolve the caller's content session, or throw. Internal admins short-circuit to primary_admin.
 */
export async function resolveContentSession(): Promise<ContentSession> {
  const auth = await getServerAuthState();
  if (!auth.isAuthenticated || !auth.userId) {
    throw new ContentAuthError("unauthenticated", "Authentication required.");
  }

  // Existing internal admins get Primary Admin content privileges.
  try {
    await requireInternalAdminSession();
    return { userId: auth.userId, role: "primary_admin", partnerSlug: null };
  } catch {
    // Not an internal admin — fall through to an explicit content role.
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new ContentAuthError("forbidden", "Content platform storage is not configured.");
  }

  const { data, error } = await supabase
    .from("content_admin_users")
    .select("content_role, partner_slug")
    .eq("auth_user_id", auth.userId)
    .eq("status", "active")
    .limit(2);

  if (error) {
    throw new ContentAuthError("forbidden", "Could not resolve a content role.");
  }
  if (!data || data.length !== 1) {
    // Zero rows: no content role. Two rows: ambiguous identity — fail closed rather than pick one.
    throw new ContentAuthError("forbidden", "No content role is assigned to this account.");
  }

  const row = data[0] as { content_role: unknown; partner_slug: unknown };
  if (!isContentRole(row.content_role)) {
    throw new ContentAuthError("forbidden", "Unrecognized content role.");
  }

  return {
    userId: auth.userId,
    role: row.content_role,
    partnerSlug: typeof row.partner_slug === "string" ? row.partner_slug : null
  };
}

export async function requireContentCapability(capability: ContentCapability): Promise<ContentSession> {
  const session = await resolveContentSession();
  if (!roleHasCapability(session.role, capability)) {
    throw new ContentAuthError("forbidden", `The ${session.role} role cannot ${capability}.`);
  }
  return session;
}

// --- Page gate ------------------------------------------------------------------------------------

export type ContentPageAccess =
  | { kind: "allowed"; session: ContentSession }
  | { kind: "denied"; title: string; body: string };

/**
 * Gate a CMS page. Mirrors the shape of the existing internal-admin page gate: unauthenticated
 * users are redirected to sign-in with a `next` param; an authenticated user without a content role
 * gets a denial page rather than a redirect loop.
 *
 * IMPORTANT: call this before any data read in the page component — the legacy gate verifier
 * asserts gate-before-read ordering textually, and it is a good rule regardless.
 */
export async function resolveContentPageAccess(nextPath: string): Promise<ContentPageAccess> {
  try {
    const session = await resolveContentSession();
    logSecurityInfo({ event: "content gate allow", route: nextPath, outcome: "allowed" });
    return { kind: "allowed", session };
  } catch (error) {
    if (error instanceof ContentAuthError && error.code === "unauthenticated") {
      logSecurityWarn({ event: "content gate denied", route: nextPath, outcome: "unauthenticated", error });
      redirect(`/sign-in?next=${encodeURIComponent(nextPath)}`);
    }

    if (error instanceof ContentAuthError) {
      logSecurityWarn({ event: "content gate denied", route: nextPath, outcome: "forbidden", error });
      return {
        kind: "denied",
        title: "Content access denied",
        body: "Your authenticated account is not authorized for the LegalEase content platform."
      };
    }

    throw error;
  }
}

// --- Route gate -----------------------------------------------------------------------------------

/**
 * Gate an /api/internal/content route. Returns `undefined` when allowed, or a NextResponse to
 * return immediately when denied. Call it BEFORE reading the request body — an unauthorized caller
 * should never get as far as having their payload parsed.
 */
export async function denyUnlessContentCapability(
  capability: ContentCapability,
  route: string,
  requestId: string
): Promise<{ denied: NextResponse } | { denied: null; session: ContentSession }> {
  try {
    const session = await requireContentCapability(capability);
    return { denied: null, session };
  } catch (error) {
    if (error instanceof ContentAuthError && error.code === "unauthenticated") {
      logSecurityWarn({ event: "content route denied", route, outcome: "unauthenticated", requestId, error });
      return {
        denied: NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 })
      };
    }

    if (error instanceof ContentAuthError) {
      logSecurityWarn({ event: "content route denied", route, outcome: "forbidden", requestId, error });
      return {
        denied: NextResponse.json({ success: false, error: "Content access required." }, { status: 403 })
      };
    }

    logSecurityWarn({ event: "content route denied", route, outcome: "error", requestId, error });
    return {
      denied: NextResponse.json({ success: false, error: "Unexpected error." }, { status: 500 })
    };
  }
}
