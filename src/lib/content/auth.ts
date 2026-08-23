import "server-only";

import { NextResponse } from "next/server";
import { redirect } from "next/navigation";

import { requireInternalAdminSession } from "@/lib/partners/session-partner";
import { logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";
import {
  type ContentCapability,
  type ContentRole,
  roleHasCapability
} from "@/lib/content/types";

/**
 * Content-platform authorization.
 *
 * Reuses the UUID-bound internal-admin membership. Content capabilities remain
 * useful for workflow decisions, but a content role is never an alternate door
 * into an /internal page or API.
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
  try {
    const internal = await requireInternalAdminSession();
    return { userId: internal.authUserId, role: "primary_admin", partnerSlug: null };
  } catch (error) {
    const code = error instanceof Error && "code" in error && error.code === "unauthenticated"
      ? "unauthenticated"
      : "forbidden";
    throw new ContentAuthError(
      code,
      code === "unauthenticated" ? "Authentication required." : "Internal administrator access is required."
    );
  }
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
