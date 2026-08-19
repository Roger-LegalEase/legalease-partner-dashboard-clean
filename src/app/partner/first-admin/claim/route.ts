import { NextResponse } from "next/server";
import { absolutePartnerAppUrl } from "@/lib/app-url";
import {
  getSafeRequestId,
  logSecurityInfo,
  logSecurityWarn
} from "@/lib/observability/logger";
import {
  acceptFirstAdminInvitationForExistingUser,
  FirstAdminProvisioningError
} from "@/lib/partners/first-admin-service";
import {
  FIRST_ADMIN_CLAIM_COOKIE,
  FIRST_ADMIN_CLAIM_PATH,
  expiredFirstAdminClaimCookie
} from "@/lib/partners/first-admin-claim-cookie";
import { createServerSupabaseAuthClient } from "@/lib/supabase/auth-server";
import type { PartnerRecoveryCode } from "@/lib/partners/onboarding/brand-page-presentation";

export const dynamic = "force-dynamic";

const routeName = "/partner/first-admin/claim";

/**
 * Where an invited administrator who already had an account lands after signing
 * in normally.
 *
 * A route handler rather than a page because the outcome has to clear the claim
 * cookie, and only a handler can. Every failure ends on a designed recovery
 * state with one next action; none of them says whether the address has an
 * account, which organization the invitation belongs to, or what the token was.
 */
export async function GET(request: Request) {
  const requestId = getSafeRequestId(request);
  const token = readClaimCookie(request);
  if (!token) {
    return recovery("invitation_unavailable");
  }

  const auth = await createServerSupabaseAuthClient();
  const { data, error } = await auth.auth.getUser();
  if (error || !data.user) {
    // The cookie survives on purpose: the person still has to sign in, and
    // making them re-open the emailed link would be the wrong lesson.
    const response = NextResponse.redirect(
      absolutePartnerAppUrl(
        `/sign-in?next=${encodeURIComponent(FIRST_ADMIN_CLAIM_PATH)}`
      ),
      303
    );
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  }

  try {
    const result = await acceptFirstAdminInvitationForExistingUser({
      rawToken: token,
      authUser: data.user
    });
    logSecurityInfo({
      event: "first_admin existing account claim succeeded",
      route: routeName,
      outcome: result.replayPrevented ? "replay_prevented" : "accepted",
      requestId,
      metadata: {
        action: "first_admin_existing_account_claim",
        status: result.replayPrevented ? "replay_prevented" : "accepted"
      }
    });
    const response = NextResponse.redirect(
      absolutePartnerAppUrl(result.redirectTo),
      303
    );
    response.cookies.set(expiredFirstAdminClaimCookie());
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch (error) {
    const known =
      error instanceof FirstAdminProvisioningError ? error : null;
    logSecurityWarn({
      event: "first_admin existing account claim failed",
      route: routeName,
      outcome: known?.code ?? "unknown_error",
      requestId,
      error,
      metadata: {
        action: "first_admin_existing_account_claim",
        error_code: known?.code ?? "unknown_error"
      }
    });
    return recovery(recoveryCodeFor(known?.code));
  }
}

export function POST() {
  return NextResponse.json(
    { ok: false, message: "Method not allowed." },
    { status: 405 }
  );
}

/**
 * A wrong signed-in email is not an expired invitation, and telling someone to
 * "ask for a new invitation" when the invitation is fine would send them down
 * the wrong path. Everything genuinely unusable collapses into one message.
 */
function recoveryCodeFor(code: string | undefined): PartnerRecoveryCode {
  switch (code) {
    case "wrong_account":
      return "wrong_signed_in_email";
    case "auth_conflict":
    case "administrator_exists":
      return "account_already_connected";
    case "membership_failed":
      return "invitation_already_used";
    default:
      return "invitation_unavailable";
  }
}

function recovery(code: PartnerRecoveryCode) {
  const response = NextResponse.redirect(
    absolutePartnerAppUrl(
      `${FIRST_ADMIN_CLAIM_PATH}/unavailable?code=${encodeURIComponent(code)}`
    ),
    303
  );
  response.cookies.set(expiredFirstAdminClaimCookie());
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}

function readClaimCookie(request: Request): string | null {
  const header = request.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === FIRST_ADMIN_CLAIM_COOKIE) {
      const value = decodeURIComponent(rest.join("="));
      return /^[A-Za-z0-9_-]{43}$/.test(value) ? value : null;
    }
  }
  return null;
}
