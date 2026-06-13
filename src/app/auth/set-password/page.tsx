"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { safeAppRedirectPath } from "@/lib/auth/redirect";
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
const weakPasswordMessage = passwordRequirementsMessage;
const fallbackPasswordMessage = "We could not set your password. Please try again or request a new invitation.";

export default function SetPasswordPage() {
  const [state, setState] = useState<InviteState>("checking");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [nextPath, setNextPath] = useState(defaultNextPath);
  const [diagnostic, setDiagnostic] = useState<SafeAuthDiagnostic>({ status: "checking" });
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);

  useEffect(() => {
    let isMounted = true;

    async function detectInviteSession() {
      const detectedNextPath = safeAppRedirectPath(new URLSearchParams(window.location.search).get("next"));
      setNextPath(detectedNextPath);

      const code = new URLSearchParams(window.location.search).get("code");
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

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
    };
  }, [supabase]);

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

    setDiagnostic({ status: "success" });
    setSuccessMessage("Password set. Opening your partner dashboard...");
    setState("saved");
    window.location.assign(safeAppRedirectPath(nextPath));
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
            <div className="mt-6 rounded-md border border-orange/30 bg-orange/10 px-4 py-3 text-sm font-semibold text-orange">
              {errorMessage || invalidOrExpiredInviteMessage}
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
              <label className="grid gap-1.5">
                <span className="text-sm font-bold text-navy">New password</span>
                <input
                  aria-describedby="password-requirements"
                  autoComplete="new-password"
                  className="min-h-11 rounded-md border border-grayWilma-200 bg-white px-3 text-sm text-navy shadow-sm outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/25"
                  disabled={isBusy}
                  minLength={minimumPasswordLength}
                  name="password"
                  required
                  type="password"
                />
              </label>
              <label className="grid gap-1.5">
                <span className="text-sm font-bold text-navy">Confirm password</span>
                <input
                  aria-describedby="password-requirements"
                  autoComplete="new-password"
                  className="min-h-11 rounded-md border border-grayWilma-200 bg-white px-3 text-sm text-navy shadow-sm outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/25"
                  disabled={isBusy}
                  minLength={minimumPasswordLength}
                  name="confirmPassword"
                  required
                  type="password"
                />
              </label>
              <Button className="min-h-11" disabled={isBusy} type="submit">
                {state === "saving" || state === "saved" ? "Setting password..." : "Set password"}
              </Button>
            </form>
          ) : null}

          <div className="mt-5 text-center">
            <Link href="/sign-in?next=/partner/dashboard" className="text-sm font-semibold text-teal hover:text-navy">
              Back to sign in
            </Link>
          </div>
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
    return "Passwords must match.";
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

function scrubAuthUrl(nextPath: string) {
  const cleanParams = new URLSearchParams({ next: safeAppRedirectPath(nextPath) });
  window.history.replaceState({}, document.title, `${window.location.pathname}?${cleanParams.toString()}`);
}
