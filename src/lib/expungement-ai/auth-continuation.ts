import { safeAppRedirectPath } from "@/lib/auth/redirect";
import {
  CLAIM_TOKEN_PARAM,
  isWellFormedClaimTokenValue
} from "@/lib/expungement-ai/claim/claim-handoff";

export type ConsumerAuthLocale = "en" | "es";

export type ConsumerAuthContinuation = {
  nextPath: string;
  claimToken: string;
  locale: ConsumerAuthLocale | null;
};

type ConsumerContinuationExtras = {
  mode?: "create" | "signin";
  product?: "expungement";
  recovery?: "1";
  claimRetry?: "1";
  claimError?: "1";
};

/**
 * The only browser-carried DTC authentication continuation.
 *
 * The opaque claim and display context may cross the auth interruption. Route,
 * answer, partner, program, event and campaign authority never do: those stay
 * on the protected pending-result row and are copied only by the atomic server
 * claim.
 */
export function consumerAuthContinuationFrom(search: URLSearchParams): ConsumerAuthContinuation {
  const rawToken = search.get(CLAIM_TOKEN_PARAM);
  const rawLocale = search.get("locale");
  return {
    nextPath: safeAppRedirectPath(search.get("next"), "/briefcase"),
    claimToken: isWellFormedClaimTokenValue(rawToken) ? rawToken : "",
    locale: rawLocale === "en" || rawLocale === "es" ? rawLocale : null
  };
}

export function consumerAuthContinuationQuery(
  continuation: ConsumerAuthContinuation,
  extras: ConsumerContinuationExtras = {}
): string {
  const params = new URLSearchParams({
    next: safeAppRedirectPath(continuation.nextPath, "/briefcase")
  });
  if (isWellFormedClaimTokenValue(continuation.claimToken)) {
    params.set(CLAIM_TOKEN_PARAM, continuation.claimToken);
  }
  if (continuation.locale === "en" || continuation.locale === "es") {
    params.set("locale", continuation.locale);
  }
  if (extras.mode) params.set("mode", extras.mode);
  if (extras.product) params.set("product", extras.product);
  if (extras.recovery) params.set("recovery", extras.recovery);
  if (extras.claimRetry) params.set("claimRetry", extras.claimRetry);
  if (extras.claimError) params.set("claimError", extras.claimError);
  return params.toString();
}

export function consumerForgotPasswordPath(continuation: ConsumerAuthContinuation): string {
  return `/auth/forgot-password?${consumerAuthContinuationQuery(continuation, { product: "expungement" })}`;
}

export function consumerAuthCallbackPath(
  continuation: ConsumerAuthContinuation,
  purpose?: "password_recovery"
): string {
  return `/auth/set-password?${consumerAuthContinuationQuery(
    continuation,
    purpose === "password_recovery" ? { recovery: "1" } : {}
  )}`;
}

export function consumerSignInRecoveryPath(
  continuation: ConsumerAuthContinuation,
  retryable: boolean
): string {
  const recoverable = retryable
    ? continuation
    : { ...continuation, claimToken: "" };
  return `/expungement-ai/sign-in?${consumerAuthContinuationQuery(recoverable, {
    mode: "signin",
    ...(retryable ? { claimRetry: "1" as const } : { claimError: "1" as const })
  })}`;
}
