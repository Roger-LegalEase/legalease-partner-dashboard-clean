// How a pending first-administrator invitation survives an ordinary sign-in.
//
// The existing-account path deliberately does not authenticate anyone itself:
// it sends the invited person through the normal application sign-in and needs
// the invitation to still be identifiable when they come back. The one-time
// token rides along in an HttpOnly cookie — unreadable to page scripts, scoped
// to the claim path, and short-lived — rather than in a URL that would land in
// browser history, referrers, and server logs.
//
// The cookie is not authorization. It only says which invitation to look at;
// the invitation is consumed only after the live session's email matches.

export const FIRST_ADMIN_CLAIM_COOKIE = "legalease_first_admin_claim";
export const FIRST_ADMIN_CLAIM_PATH = "/partner/first-admin/claim";

// Long enough to sign in, including a password reset detour, and far shorter
// than the invitation itself.
const CLAIM_COOKIE_MAX_AGE_SECONDS = 60 * 60;

export type FirstAdminClaimCookie = {
  name: string;
  value: string;
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: string;
  maxAge: number;
};

export function firstAdminClaimCookie(token: string): FirstAdminClaimCookie {
  return {
    name: FIRST_ADMIN_CLAIM_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CLAIM_COOKIE_MAX_AGE_SECONDS
  };
}

export function expiredFirstAdminClaimCookie(): FirstAdminClaimCookie {
  return {
    name: FIRST_ADMIN_CLAIM_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  };
}
