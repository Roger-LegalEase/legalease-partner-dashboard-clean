import { safeAppRedirectPath } from "@/lib/auth/redirect";
import {
  CLAIM_TOKEN_PARAM,
  isWellFormedClaimTokenValue
} from "@/lib/expungement-ai/claim/claim-handoff";

export type ConsumerAuthContinuation = {
  nextPath: string;
  claimToken: string;
  locale: string | null;
};

const localePattern = /^[a-z]{2}(?:-[A-Z]{2})?$/;

/**
 * The browser carries only the opaque claim capability and display context.
 * Screening answers, attribution, route identity, and the pending-result id
 * remain in the protected pending row and cross the auth boundary only when
 * the server atomically claims that row.
 */
export function consumerAuthContinuationFrom(search: URLSearchParams): ConsumerAuthContinuation {
  const rawToken = search.get(CLAIM_TOKEN_PARAM);
  const rawLocale = search.get("locale");
  return {
    nextPath: safeAppRedirectPath(search.get("next"), "/briefcase"),
    claimToken: isWellFormedClaimTokenValue(rawToken) ? rawToken : "",
    locale: rawLocale && localePattern.test(rawLocale) ? rawLocale : null
  };
}

export function consumerAuthContinuationQuery(
  continuation: ConsumerAuthContinuation,
  extras: Record<string, string | null | undefined> = {}
) {
  const params = new URLSearchParams({ next: safeAppRedirectPath(continuation.nextPath, "/briefcase") });
  if (continuation.claimToken) params.set(CLAIM_TOKEN_PARAM, continuation.claimToken);
  if (continuation.locale) params.set("locale", continuation.locale);
  for (const [key, value] of Object.entries(extras)) {
    if (value) params.set(key, value);
  }
  return params.toString();
}

