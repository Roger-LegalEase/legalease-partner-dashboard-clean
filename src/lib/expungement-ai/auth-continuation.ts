import { safeAppRedirectPath } from "@/lib/auth/redirect";
import {
  CLAIM_TOKEN_PARAM,
  isWellFormedClaimTokenValue,
  type ClaimAttempt
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

export type ConsumerClaimRecoveryHandoffKind =
  | "none"
  | "retry"
  | "definitive_error";

export type ConsumerClaimRecoveryAttempt =
  | { kind: "attempted"; result: ClaimAttempt }
  | { kind: "duplicate"; result: ClaimAttempt };

const automaticRecoveryClaims = new Map<string, Promise<ClaimAttempt>>();

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

/**
 * A direct sign-in URL belongs to returning participants. Account creation is
 * inferred only from an explicit, validated conversion destination; the
 * fallback Briefcase path is not itself evidence of conversion intent.
 */
export function consumerAuthModeFrom(search: URLSearchParams): "create" | "signin" {
  if (search.get("mode") === "create") return "create";
  if (search.get("mode") === "signin") return "signin";
  const requestedNext = search.get("next");
  if (!requestedNext) return "signin";
  const next = consumerAuthContinuationFrom(search).nextPath;
  if (next !== requestedNext) return "signin";
  return isConversionNextPath(next) ? "create" : "signin";
}

function isConversionNextPath(next: string) {
  return next.startsWith("/expungement-ai/pay")
    || next.startsWith("/expungement-ai/packet-ready")
    || next.startsWith("/briefcase");
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

/**
 * Parses only the two server-produced post-reset flags. Any malformed,
 * conflicting, or token-less retry handoff is a definitive failure: it never
 * falls through to a credential form and never submits an unvalidated token.
 */
export function consumerClaimRecoveryHandoffFrom(
  search: URLSearchParams
): ConsumerClaimRecoveryHandoffKind {
  const hasRetry = search.has("claimRetry");
  const hasError = search.has("claimError");
  if (!hasRetry && !hasError) return "none";

  const continuation = consumerAuthContinuationFrom(search);
  if (hasRetry
    && !hasError
    && search.get("claimRetry") === "1"
    && continuation.claimToken) return "retry";
  if (hasError
    && !hasRetry
    && search.get("claimError") === "1") return "definitive_error";
  return "definitive_error";
}

/** Rebuilds the URL from validated continuation fields and consumes flags. */
export function consumerSignInAfterRecoveryPath(
  continuation: ConsumerAuthContinuation,
  handoff: Exclude<ConsumerClaimRecoveryHandoffKind, "none">
): string {
  const safeContinuation = handoff === "retry"
    ? continuation
    : { ...continuation, claimToken: "" };
  return `/expungement-ai/sign-in?${consumerAuthContinuationQuery(safeContinuation, {
    mode: "signin"
  })}`;
}

/**
 * React Strict Mode deliberately runs mount effects twice. This browser-memory
 * guard allows one automatic claim request for an opaque token across effect
 * replays and remounts. Manual participant retries remain available after a
 * retryable response and do not pass through this one-shot guard.
 */
export async function runConsumerClaimRecoveryOnce(
  claimToken: string,
  attempt: (token: string) => Promise<ClaimAttempt>
): Promise<ConsumerClaimRecoveryAttempt> {
  if (!isWellFormedClaimTokenValue(claimToken)) {
    return {
      kind: "attempted",
      result: { ok: false, status: 400, retryable: false }
    };
  }
  const existing = automaticRecoveryClaims.get(claimToken);
  if (existing) return { kind: "duplicate", result: await existing };
  const pending = attempt(claimToken);
  automaticRecoveryClaims.set(claimToken, pending);
  return { kind: "attempted", result: await pending };
}
