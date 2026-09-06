"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PartnerRecoveryState } from "@/components/partners/PartnerRecoveryState";
import { safeAppRedirectPath } from "@/lib/auth/redirect";
import { submitClaim } from "@/lib/expungement-ai/claim/claim-handoff";
import {
  consumerAuthContinuationFrom,
  consumerAuthContinuationQuery,
  consumerSignInRecoveryPath
} from "@/lib/expungement-ai/auth-continuation";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

type InviteState = "checking" | "ready" | "invalid" | "saving" | "saved";
type DiagnosticStatus =
  | "checking"
  | "no_session_found"
  | "code_exchange_failed"
  | "hash_session_failed"
  | "update_user_failed"
  | "password_validation_failed"
  | "success";
type SafeAuthDiagnostic = {
  status: DiagnosticStatus;
  error?: {
    name?: string;
    status?: number;
    code?: string;
    message?: string;
  };
};

const minimumPasswordLength = 12;
const invalidInviteMessage = "This invite link is expired or invalid. Ask your LegalEase program lead for a new invitation.";
const inactiveInviteMessage = "This invite link is no longer active. Please request a new invitation.";
const invalidOrExpiredInviteMessage = "This invite link is invalid or has expired. Please request a new invitation.";
const passwordRequirementsMessage = "Use at least 12 characters with a letter, a number, and a symbol.";
const passwordMismatchMessage = "Passwords do not match.";
const weakPasswordMessage = "That password does not meet Supabase password requirements. Try a different password with at least 12 characters, a number, and a symbol.";
const fallbackPasswordMessage = "We could not set your password. Please try a different password or request a new invitation.";

export default function SetPasswordPage() {
  const [state, setState] = useState<InviteState>("checking");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [nextPath, setNextPath] = useState(defaultNextPath);
  const [diagnostic, setDiagnostic] = useState<SafeAuthDiagnostic>({ status: "checking" });
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] = useState(false);
  const [isFirstAdminSetup, setIsFirstAdminSetup] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let passwordRecoveryObserved = false;
    const supabase = createBrowserSupabaseClient();
    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" && session && isMounted) {
        passwordRecoveryObserved = true;
        setErrorMessage("");
        setState("ready");
      }
    });

    async function detectInviteSession() {
      const searchParams = new URLSearchParams(window.location.search);
      const continuation = consumerAuthContinuationFrom(searchParams);
      const detectedNextPath = continuation.nextPath;
      const firstAdminSetup = searchParams.get("first_admin") === "1";
      setIsFirstAdminSetup(firstAdminSetup);
      setNextPath(detectedNextPath);

      const code = searchParams.get("code");
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      const recoveryRequested = searchParams.get("recovery") === "1"
        || searchParams.get("type") === "recovery"
        || hashParams.get("type") === "recovery";

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          scrubAuthUrl(detectedNextPath);
          if (isMounted) {
            setDiagnostic({ status: "code_exchange_failed", error: safeAuthDiagnostic(error) });
            setErrorMessage(authSessionErrorMessage(error));
            setState("invalid");
          }
          return;
        }
      } else if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        if (error) {
          scrubAuthUrl(detectedNextPath);
          if (isMounted) {
            setDiagnostic({ status: "hash_session_failed", error: safeAuthDiagnostic(error) });
            setErrorMessage(authSessionErrorMessage(error));
            setState("invalid");
          }
          return;
        }
      }

      if (searchParams.get("first_admin_error") === "inactive") {
        scrubAuthUrl(detectedNextPath);
        if (isMounted) {
          setDiagnostic({ status: "no_session_found" });
          setErrorMessage(inactiveInviteMessage);
          setState("invalid");
        }
        return;
      }

      scrubAuthUrl(detectedNextPath);

      const { data, error } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }

      if (error) {
        setDiagnostic({ status: "no_session_found", error: safeAuthDiagnostic(error) });
        setErrorMessage(authSessionErrorMessage(error));
        setState("invalid");
        return;
      }

      if (data.session) {
        // A password-recovery session earns the right to set a new password;
        // it does not claim the pending result early. The claim runs only after
        // updateUser succeeds below.
        if (passwordRecoveryObserved || recoveryRequested) {
          setState("ready");
          return;
        }
        if (isExpungementNext(detectedNextPath)) {
          const claimedNext = await claimExpungementPending(detectedNextPath);
          window.location.assign(claimedNext);
          return;
        }
        setState("ready");
        return;
      }

      setDiagnostic({ status: "no_session_found" });
      setErrorMessage(inactiveInviteMessage);
      setState("invalid");
    }

    detectInviteSession().catch((error) => {
      scrubAuthUrl(safeAppRedirectPath(new URLSearchParams(window.location.search).get("next")));
      if (isMounted) {
        setDiagnostic({ status: "code_exchange_failed", error: safeAuthDiagnostic(error) });
        setErrorMessage(authSessionErrorMessage(error));
        setState("invalid");
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function setPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    const formData = new FormData(event.currentTarget);
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");
    const validationMessage = validatePassword(password, confirmPassword);

    if (validationMessage) {
      setDiagnostic({ status: "password_validation_failed" });
      setErrorMessage(validationMessage);
      return;
    }

    setState("saving");
    const supabase = createBrowserSupabaseClient();
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !sessionData.session) {
      setDiagnostic({ status: "no_session_found", error: safeAuthDiagnostic(sessionError) });
      setErrorMessage(sessionError ? authSessionErrorMessage(sessionError) : inactiveInviteMessage);
      setState("invalid");
      return;
    }

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setDiagnostic({ status: "update_user_failed", error: safeAuthDiagnostic(error) });
      setErrorMessage(updateUserErrorMessage(error));
      setState("ready");
      return;
    }

    let redirectPath = safeAppRedirectPath(nextPath);
    if (isFirstAdminSetup) {
      try {
        const response = await fetch("/api/partners/first-admin/accept", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{}"
        });
        const result = (await response.json().catch(() => null)) as {
          ok?: boolean;
          redirectTo?: string;
          message?: string;
        } | null;
        if (!response.ok || result?.ok !== true) {
          setDiagnostic({ status: "update_user_failed" });
          setErrorMessage(
            result?.message ??
              "Your password was saved, but partner access could not be activated. Please retry or contact your LegalEase program lead."
          );
          setState("ready");
          return;
        }
        redirectPath = safeAppRedirectPath(
          result.redirectTo,
          "/partner/dashboard"
        );
      } catch {
        setDiagnostic({ status: "update_user_failed" });
        setErrorMessage(
          "Your password was saved, but partner access could not be activated. Please retry or contact your LegalEase program lead."
        );
        setState("ready");
        return;
      }
    }

    if (!isFirstAdminSetup && isExpungementNext(nextPath)) {
      redirectPath = await claimExpungementPending(nextPath);
    }

    setDiagnostic({ status: "success" });
    setSuccessMessage(
      isFirstAdminSetup
        ? "Password set. Opening your partner workspace..."
        : isExpungementNext(nextPath)
          ? "Password set. Saving your result..."
          : "Password set. Opening your partner dashboard..."
    );
    setState("saved");
    window.location.assign(safeAppRedirectPath(redirectPath));
  }

  const isBusy = state === "checking" || state === "saving" || state === "saved";

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 md:px-6">
        <Card className="w-full rounded-md p-6">
          <div className="text-center">
            <Badge tone="blue">LegalEase account setup</Badge>
            <span className="mx-auto mt-5 flex h-12 w-12 items-center justify-center rounded-md bg-teal/10 text-teal">
              <KeyRound className="h-6 w-6" aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-3xl font-black text-navy">Set your LegalEase password</h1>
            <p className="mt-3 text-sm leading-6 text-grayWilma-700">
              Use the email address that received the invitation. After setting your password, you&apos;ll go to your partner dashboard.
            </p>
          </div>

          {state === "checking" ? (
            <div className="mt-6 rounded-md border border-grayWilma-200 bg-grayWilma-100 px-4 py-3 text-sm font-semibold text-grayWilma-700">
              Checking your invite link...
            </div>
          ) : null}

          {state === "invalid" ? (
            <div className="mt-6">
              <PartnerRecoveryState
                code="invitation_unavailable"
                genericHeading="This account setup link cannot be used"
              />
            </div>
          ) : null}

          {errorMessage && state !== "invalid" ? (
            <div className="mt-6 rounded-md border border-orange/30 bg-orange/10 px-4 py-3 text-sm font-semibold text-orange">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="mt-6 rounded-md border border-teal/25 bg-teal/10 px-4 py-3 text-sm font-semibold text-teal">
              {successMessage}
            </div>
          ) : null}

          {process.env.NODE_ENV !== "production" ? (
            <pre className="sr-only" data-auth-diagnostic={diagnostic.status}>
              {JSON.stringify(diagnostic)}
            </pre>
          ) : null}

          {state === "ready" || state === "saving" || state === "saved" ? (
            <form className="mt-6 grid gap-4" onSubmit={setPassword}>
              <p
                id="password-requirements"
                className="rounded-md border border-grayWilma-200 bg-grayWilma-100 px-3 py-2 text-sm font-semibold text-grayWilma-700"
              >
                {passwordRequirementsMessage}
              </p>
              <div className="grid gap-1.5">
                <label className="text-sm font-bold text-navy" htmlFor="new-password">
                  New password
                </label>
                <div className="flex min-h-11 overflow-hidden rounded-md border border-grayWilma-200 bg-white shadow-sm transition focus-within:border-teal focus-within:ring-2 focus-within:ring-teal/25">
                  <input
                    aria-describedby="password-requirements"
                    autoComplete="new-password"
                    className="min-w-0 flex-1 bg-transparent px-3 text-sm text-navy outline-none"
                    disabled={isBusy}
                    id="new-password"
                    minLength={minimumPasswordLength}
                    name="password"
                    required
                    type={isNewPasswordVisible ? "text" : "password"}
                  />
                  <button
                    aria-controls="new-password"
                    aria-label={isNewPasswordVisible ? "Hide new password" : "Show new password"}
                    className="border-l border-grayWilma-200 px-3 text-sm font-bold text-teal transition hover:bg-grayWilma-100 hover:text-navy disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isBusy}
                    onClick={() => setIsNewPasswordVisible((visible) => !visible)}
                    type="button"
                  >
                    {isNewPasswordVisible ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <div className="grid gap-1.5">
                <label className="text-sm font-bold text-navy" htmlFor="confirm-password">
                  Confirm password
                </label>
                <div className="flex min-h-11 overflow-hidden rounded-md border border-grayWilma-200 bg-white shadow-sm transition focus-within:border-teal focus-within:ring-2 focus-within:ring-teal/25">
                  <input
                    aria-describedby="password-requirements"
                    autoComplete="new-password"
                    className="min-w-0 flex-1 bg-transparent px-3 text-sm text-navy outline-none"
                    disabled={isBusy}
                    id="confirm-password"
                    minLength={minimumPasswordLength}
                    name="confirmPassword"
                    required
                    type={isConfirmPasswordVisible ? "text" : "password"}
                  />
                  <button
                    aria-controls="confirm-password"
                    aria-label={isConfirmPasswordVisible ? "Hide confirmed password" : "Show confirmed password"}
                    className="border-l border-grayWilma-200 px-3 text-sm font-bold text-teal transition hover:bg-grayWilma-100 hover:text-navy disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isBusy}
                    onClick={() => setIsConfirmPasswordVisible((visible) => !visible)}
                    type="button"
                  >
                    {isConfirmPasswordVisible ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
              <Button className="min-h-11" disabled={isBusy} type="submit">
                {state === "saving" || state === "saved" ? "Setting password..." : "Set password"}
              </Button>
            </form>
          ) : null}

          {state !== "invalid" ? (
          <div className="mt-5 text-center">
            <Link href="/sign-in?next=/partner/dashboard" className="text-sm font-semibold text-teal hover:text-navy">
              Back to sign in
            </Link>
          </div>
          ) : null}
        </Card>
      </div>
    </main>
  );
}

function validatePassword(password: string, confirmPassword: string) {
  if (password.length < minimumPasswordLength) {
    return passwordRequirementsMessage;
  }

  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return passwordRequirementsMessage;
  }

  if (password !== confirmPassword) {
    return passwordMismatchMessage;
  }

  return "";
}

function authSessionErrorMessage(error: unknown) {
  const diagnostic = safeAuthDiagnostic(error) ?? {};
  const normalized = `${diagnostic.name ?? ""} ${diagnostic.code ?? ""} ${diagnostic.message ?? ""}`.toLowerCase();

  if (normalized.includes("session missing") || normalized.includes("no active session")) {
    return inactiveInviteMessage;
  }

  if (normalized.includes("expired") || normalized.includes("invalid") || normalized.includes("token") || diagnostic.status === 400 || diagnostic.status === 401) {
    return invalidOrExpiredInviteMessage;
  }

  return invalidInviteMessage;
}

function updateUserErrorMessage(error: unknown) {
  const diagnostic = safeAuthDiagnostic(error) ?? {};
  const normalized = `${diagnostic.name ?? ""} ${diagnostic.code ?? ""} ${diagnostic.message ?? ""}`.toLowerCase();

  if (normalized.includes("weak_password") || normalized.includes("weak password") || normalized.includes("password")) {
    return weakPasswordMessage;
  }

  if (normalized.includes("session missing") || normalized.includes("no active session")) {
    return inactiveInviteMessage;
  }

  if (normalized.includes("expired") || normalized.includes("invalid") || normalized.includes("jwt") || normalized.includes("token") || diagnostic.status === 401) {
    return invalidOrExpiredInviteMessage;
  }

  return fallbackPasswordMessage;
}

function safeAuthDiagnostic(error: unknown): SafeAuthDiagnostic["error"] {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  const candidate = error as { name?: unknown; status?: unknown; code?: unknown; message?: unknown };

  return {
    name: safeDiagnosticText(candidate.name),
    status: typeof candidate.status === "number" ? candidate.status : undefined,
    code: safeDiagnosticText(candidate.code),
    message: safeDiagnosticText(candidate.message)
  };
}

function safeDiagnosticText(value: unknown) {
  if (typeof value !== "string") {
    return undefined;
  }

  return value
    .replace(/https?:\/\/\S+/gi, "[redacted-url]")
    .replace(/[?#][^\s]+/g, "[redacted-url-part]")
    .replace(/[A-Za-z0-9_-]{24,}/g, "[redacted]")
    .slice(0, 180);
}

function defaultNextPath() {
  if (typeof window === "undefined") {
    return "/partner/dashboard";
  }

  return consumerAuthContinuationFrom(new URLSearchParams(window.location.search)).nextPath;
}

// Strips the Supabase auth fragment and query while preserving the claim token,
// which is still needed one call further on. submitClaim removes the token
// itself the moment the server has seen it.
function scrubAuthUrl(nextPath: string) {
  const search = new URLSearchParams(window.location.search);
  const cleanParams = new URLSearchParams(consumerAuthContinuationQuery({
    ...consumerAuthContinuationFrom(search),
    nextPath: safeAppRedirectPath(nextPath, "/briefcase")
  }, search.get("recovery") === "1" ? { recovery: "1" } : {}));
  window.history.replaceState({}, document.title, `${window.location.pathname}?${cleanParams.toString()}`);
}

function isExpungementNext(nextPath: string) {
  return nextPath.startsWith("/expungement-ai") || nextPath.startsWith("/briefcase");
}

// Email verification and password reset both land here. If the participant
// arrived carrying a claim token, the interrupted continuation finishes now and
// they land on the exact matter rather than a generic Briefcase.
async function claimExpungementPending(nextPath: string) {
  const params = new URLSearchParams(window.location.search);
  const continuation = {
    ...consumerAuthContinuationFrom(params),
    nextPath: safeAppRedirectPath(nextPath, "/briefcase")
  };
  if (!continuation.claimToken) return continuation.nextPath;
  const claimed = await submitClaim(continuation.claimToken);
  return claimed.ok
    ? claimed.redirectTo
    : consumerSignInRecoveryPath(continuation, claimed.retryable);
}
