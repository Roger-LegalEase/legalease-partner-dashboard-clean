import "server-only";

import type { NextResponse } from "next/server";

import { getRcapBriefcaseAuthState } from "@/lib/rcap/briefcase/auth";
import { isParticipantAccountBlocked } from "@/lib/expungement-ai/privacy/account-status";
import { privacyJson } from "@/lib/expungement-ai/privacy/request-security";

export type PrivacyApiSession =
  | { ok: true; userId: string; userEmail?: string }
  | { ok: false; response: NextResponse };

/**
 * The API-route counterpart to requireConsumerBriefcaseSession.
 *
 * The page helper redirects; a fetch() caller needs a status code, not a 307 to
 * a sign-in page it will try to parse as JSON. Same two checks, same order: a
 * session, and an account that has not been frozen or erased.
 *
 * `allowFrozen` exists for exactly one caller, and it is not a convenience.
 * Freezing the account is the FIRST step of an account deletion, so from that
 * moment on the participant's own session is refused everywhere — including, if
 * this option did not exist, by the deletion route itself. A run that failed
 * half-way could then never be resumed by the person it belongs to: the account
 * would sit frozen, unusable and undeleted, which is the one outcome worse than
 * either finishing or not starting. Nothing else is relaxed for a frozen
 * account: the recent-auth proof, the typed confirmation, the same-origin check
 * and the rate limit all still apply, and the only thing the route can do is
 * finish the deletion that froze it.
 */
export async function requireConsumerBriefcaseApiSession(
  { allowFrozen = false }: { allowFrozen?: boolean } = {}
): Promise<PrivacyApiSession> {
  const auth = await getRcapBriefcaseAuthState();
  if (!auth.isAuthenticated || !auth.userId) {
    return { ok: false, response: privacyJson({ error: "Sign in to continue.", code: "not_authenticated" }, 401) };
  }
  if (!allowFrozen && (await isParticipantAccountBlocked(auth.userId))) {
    return { ok: false, response: privacyJson({ error: "This account has been deleted.", code: "account_deleted" }, 403) };
  }
  return { ok: true, userId: auth.userId, userEmail: auth.userEmail };
}
