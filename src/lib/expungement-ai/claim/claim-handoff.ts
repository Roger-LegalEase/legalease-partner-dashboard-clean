import { safeAppRedirectPath } from "@/lib/auth/redirect";
import { isExactMatterPath } from "@/lib/expungement-ai/claim/matter-path";

/**
 * The browser half of the claim handoff.
 *
 * Contract §3 and §7. The claim token is the only thing the browser carries
 * between a preliminary result and the matter it becomes. It travels in the
 * query string because it has to survive an email round trip, and it is removed
 * from the URL the moment it has been used.
 *
 * It is never written to localStorage or sessionStorage, never sent to
 * analytics, and never logged. Everything else -- who owns the matter, which
 * partner sponsored it, what it is worth -- is decided on the server.
 */

export const CLAIM_TOKEN_PARAM = "claim";
const TOKEN_SHAPE = /^[A-Za-z0-9_-]{32,200}$/;

export function isWellFormedClaimTokenValue(value: string | null | undefined): value is string {
  return typeof value === "string" && TOKEN_SHAPE.test(value);
}

/** Reads the claim token from the current URL. Returns "" when there is none. */
export function readClaimTokenFromUrl(): string {
  if (typeof window === "undefined") return "";
  const value = new URLSearchParams(window.location.search).get(CLAIM_TOKEN_PARAM);
  return isWellFormedClaimTokenValue(value) ? value : "";
}

/**
 * Removes the claim token from the address bar without adding a history entry,
 * so Back does not replay a used token and the value does not travel on in a
 * Referer header.
 */
export function stripClaimTokenFromUrl(): void {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(CLAIM_TOKEN_PARAM)) return;
  url.searchParams.delete(CLAIM_TOKEN_PARAM);
  const search = url.searchParams.toString();
  window.history.replaceState(window.history.state, "", `${url.pathname}${search ? `?${search}` : ""}${url.hash}`);
}

/** The authentication handoff URL that carries the token through sign-in. */
export function claimHandoffPath(
  claimToken: string,
  mode: "create" | "signin" = "create",
  locale?: string | null
): string {
  const params = new URLSearchParams({ mode });
  if (isWellFormedClaimTokenValue(claimToken)) params.set(CLAIM_TOKEN_PARAM, claimToken);
  if (locale === "en" || locale === "es") params.set("locale", locale);
  return `/expungement-ai/sign-in?${params.toString()}`;
}

export type ClaimAttempt =
  | { ok: true; redirectTo: string }
  | { ok: false; status: number; retryable: boolean };

export function isRetryableClaimStatus(status: number): boolean {
  return status === 0 || status === 401 || status === 403 || status === 409 || status >= 500;
}

/**
 * Submits the claim. Success and definitive denials strip the token. Auth,
 * verification, conflict, transport and server failures retain it only in the
 * URL so the participant can retry without repeating the screening.
 */
export async function submitClaim(claimToken: string): Promise<ClaimAttempt> {
  if (!isWellFormedClaimTokenValue(claimToken)) return { ok: false, status: 400, retryable: false };

  let status = 0;
  try {
    const response = await fetch("/api/expungement-ai/screening/pending/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ claimToken })
    });
    status = response.status;
    const payload = await response.json().catch(() => null) as { redirectTo?: string } | null;
    if (!response.ok || !payload?.redirectTo) return { ok: false, status, retryable: isRetryableClaimStatus(status) };

    // The server produced this path with exactMatterPath(). Validate it with the
    // same predicate before navigating, so a redirect can never leave the app.
    const redirectTo = safeAppRedirectPath(payload.redirectTo, "");
    if (!isExactMatterPath(redirectTo)) return { ok: false, status, retryable: false };
    return { ok: true, redirectTo };
  } catch {
    return { ok: false, status: status || 0, retryable: true };
  } finally {
    if (!isRetryableClaimStatus(status)) stripClaimTokenFromUrl();
  }
}
