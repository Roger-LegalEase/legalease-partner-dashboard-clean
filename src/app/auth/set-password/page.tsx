"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PartnerRecoveryState } from "@/components/partners/PartnerRecoveryState";
import { safeAppRedirectPath } from "@/lib/auth/redirect";
import {
  CLAIM_TOKEN_PARAM,
  isWellFormedClaimTokenValue,
  submitClaim
} from "@/lib/expungement-ai/claim/claim-handoff";
import {
  consumerAuthContinuationFrom,
  consumerAuthContinuationQuery
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
  const [isRecovery, setIsRecovery] = useState(false);
  const initialization = useRef<Promise<PasswordSessionResult> | null>(null);

  useEffect(() => {
    let isMounted = true;
    // React Strict Mode replays effects. Keep the one-time callback promise,
    // including its validated flow intent, rather than exchanging it again.
    initialization.current ??= initializePasswordSession();
    initialization.current.then(async (result) => {
      if (!isMounted) return;
      setNextPath(result.nextPath);
      setIsRecovery(result.recovery);
      setIsFirstAdminSetup(result.firstAdmin);
      if (!result.ready) {
        setDiagnostic({ status: result.status, error: safeAuthDiagnostic(result.error) });
        setErrorMessage(result.recovery ? recoverySessionErrorMessage(result.error) : authSessionErrorMessage(result.error));
        setState("invalid");
        return;
      }
      if (result.clinicSignIn) {
        window.location.assign("/clinic/reset");
        return;
      }
      if (!result.recovery && isExpungementNext(result.nextPath)) {
        const claimedNext = await claimExpungementPending(result.nextPath);
        if (isMounted) window.location.assign(claimedNext);
        return;
      }
      setErrorMessage("");
      setState("ready");
    }).catch(() => {
      if (!isMounted) return;
      setErrorMessage("We could not check this link. Request a new link and try again.");
      setDiagnostic({ status: "code_exchange_failed" });
      setState("invalid");
    });
    return () => { isMounted = false; };
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
      setErrorMessage(isRecovery ? recoverySessionErrorMessage(sessionError) : sessionError ? authSessionErrorMessage(sessionError) : inactiveInviteMessage);
      setState("invalid");
      return;
    }

    let error: unknown;
    try {
      ({ error } = await supabase.auth.updateUser({ password }));
    } catch {
      setDiagnostic({ status: "update_user_failed" });
      setErrorMessage("We could not save your password. Please try again.");
      setState("ready");
      return;
    }

    if (error) {
      setDiagnostic({ status: "update_user_failed", error: safeAuthDiagnostic(error) });
      setErrorMessage(isRecovery ? "We could not save your password. Please try again or request a new reset link." : updateUserErrorMessage(error));
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

    if (!isFirstAdminSetup && isExpungementNext(redirectPath)) {
      redirectPath = await claimExpungementPending(redirectPath);
    }
    setDiagnostic({ status: "success" });
    setSuccessMessage(
      isFirstAdminSetup
        ? "Password set. Opening your partner workspace..."
        : "Password saved. Opening your account..."
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
            <Badge tone="blue">{isRecovery ? "LegalEase password recovery" : "LegalEase account setup"}</Badge>
            <span className="mx-auto mt-5 flex h-12 w-12 items-center justify-center rounded-md bg-teal/10 text-teal">
              <KeyRound className="h-6 w-6" aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-3xl font-black text-navy">Set your LegalEase password</h1>
            <p className="mt-3 text-sm leading-6 text-grayWilma-700">
              {isRecovery ? "Save a new password to continue to your account." : "Use the email address that received the invitation to set your password and continue."}
            </p>
          </div>

          {state === "checking" ? (
            <div className="mt-6 rounded-md border border-grayWilma-200 bg-grayWilma-100 px-4 py-3 text-sm font-semibold text-grayWilma-700">
              {isRecovery ? "Checking your recovery link..." : "Checking your account link..."}
            </div>
          ) : null}

          {state === "invalid" ? (
            <div className="mt-6">
              {isRecovery ? (
                <div role="alert">
                  <h2 className="text-lg font-black text-navy">This password reset link cannot be used</h2>
                  <p className="mt-2 text-sm text-grayWilma-700">{errorMessage}</p>
                  <Link className="mt-4 inline-flex min-h-11 items-center font-bold text-teal focus-visible:outline focus-visible:outline-2" href={`/auth/forgot-password?${consumerAuthContinuationQuery({ ...consumerAuthContinuationFrom(new URLSearchParams(typeof window === "undefined" ? "" : window.location.search)), nextPath })}`}>
                    Request a new password reset
                  </Link>
                </div>
              ) : <PartnerRecoveryState code="invitation_unavailable" genericHeading="This account setup link cannot be used" />}
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
            <Link href={`/sign-in?next=${encodeURIComponent(nextPath)}`} className="text-sm font-semibold text-teal hover:text-navy">
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

  return safeAppRedirectPath(new URLSearchParams(window.location.search).get("next"));
}

// Strips the Supabase auth fragment and query while preserving the claim token,
// which is still needed one call further on. submitClaim removes the token
// itself the moment the server has seen it.
function scrubAuthUrl(nextPath: string) {
  const search = new URLSearchParams(window.location.search);
  const cleanParams = new URLSearchParams(consumerAuthContinuationQuery({
    ...consumerAuthContinuationFrom(search),
    nextPath: safeAppRedirectPath(nextPath)
  }));
  if (["recovery", "signin"].includes(search.get("flow") ?? "")) cleanParams.set("flow", search.get("flow")!);
  if (search.get("first_admin") === "1" && search.get("flow") !== "recovery") cleanParams.set("first_admin", "1");
  window.history.replaceState({}, document.title, `${window.location.pathname}?${cleanParams.toString()}`);
}

function isExpungementNext(nextPath: string) {
  return nextPath.startsWith("/expungement-ai") || nextPath.startsWith("/briefcase");
}

// Email verification and password reset both land here. After verification or
// a successful password save, the interrupted continuation finishes and
// they land on the exact matter rather than a generic Briefcase.
async function claimExpungementPending(nextPath: string) {
  const params = new URLSearchParams(window.location.search);
  const claimToken = params.get(CLAIM_TOKEN_PARAM);
  if (!isWellFormedClaimTokenValue(claimToken)) return safeAppRedirectPath(nextPath, "/briefcase");
  const claimed = await submitClaim(claimToken);
  if (claimed.ok) return claimed.redirectTo;
  const continuation = consumerAuthContinuationFrom(params);
  return `/expungement-ai/sign-in?${consumerAuthContinuationQuery(continuation, {
    mode: "signin",
    claimRetry: "1"
  })}`;
}


type PasswordSessionResult = {
  nextPath: string;
  recovery: boolean;
  firstAdmin: boolean;
  clinicSignIn: boolean;
  ready: boolean;
  status: DiagnosticStatus;
  error?: unknown;
};

async function initializePasswordSession(): Promise<PasswordSessionResult> {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const nextPath = safeAppRedirectPath(search.get("next"));
  const result: PasswordSessionResult = {
    nextPath,
    recovery: search.get("flow") === "recovery" || hash.get("type") === "recovery",
    firstAdmin: search.get("first_admin") === "1",
    clinicSignIn: nextPath === "/clinic/reset" && search.get("flow") === "signin",
    ready: false,
    status: "no_session_found"
  };
  const supabase = createBrowserSupabaseClient();
  try {
    const code = search.get("code");
    const accessToken = hash.get("access_token");
    const refreshToken = hash.get("refresh_token");
    if (code) {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code);
      result.status = "code_exchange_failed";
      if (error) { result.error = error; return result; }
      result.recovery ||= (data as typeof data & { redirectType?: string | null }).redirectType === "recovery";
    } else if (accessToken && refreshToken) {
      const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      result.status = "hash_session_failed";
      if (error) { result.error = error; return result; }
    } else if (result.recovery || (!result.firstAdmin && !result.clinicSignIn)) {
      // A scrubbed, missing or reused callback cannot borrow a cached session.
      return result;
    }
    if (search.get("first_admin_error") === "inactive") return result;
    if (result.recovery) { result.firstAdmin = false; result.clinicSignIn = false; }
    const { data, error } = await supabase.auth.getSession();
    result.error = error;
    result.ready = !error && Boolean(data.session);
    result.status = result.ready ? "checking" : "no_session_found";
    return result;
  } catch (error) {
    result.error = error;
    result.status = "code_exchange_failed";
    return result;
  } finally {
    scrubAuthUrl(nextPath);
  }
}

function recoverySessionErrorMessage(error: unknown) {
  const candidate = error && typeof error === "object" ? error as { name?: unknown; code?: unknown } : null;
  if (candidate?.name === "AuthPKCECodeVerifierMissingError" || candidate?.code === "pkce_code_verifier_not_found") {
    return "Open the reset email in the same browser where you requested it. If that browser is unavailable, request a new reset here.";
  }
  return "This reset link is missing, expired, or has already been used. Request a new reset and open it in the browser where you made the request.";
}
