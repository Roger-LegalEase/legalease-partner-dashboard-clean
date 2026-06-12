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

const minimumPasswordLength = 8;
const invalidInviteMessage = "This invite link is expired or invalid. Ask your LegalEase program lead for a new invitation.";

export default function SetPasswordPage() {
  const [state, setState] = useState<InviteState>("checking");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [nextPath, setNextPath] = useState(defaultNextPath);
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
        await supabase.auth.exchangeCodeForSession(code);
      } else if (accessToken && refreshToken) {
        await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      }

      scrubAuthUrl(detectedNextPath);

      const { data } = await supabase.auth.getSession();
      if (!isMounted) {
        return;
      }

      setState(data.session ? "ready" : "invalid");
    }

    detectInviteSession().catch(() => {
      scrubAuthUrl(safeAppRedirectPath(new URLSearchParams(window.location.search).get("next")));
      if (isMounted) {
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

    if (password.length < minimumPasswordLength) {
      setErrorMessage(`Use at least ${minimumPasswordLength} characters for your password.`);
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords must match.");
      return;
    }

    setState("saving");
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMessage("We could not set your password. Please use the latest invitation link and try again.");
      setState("ready");
      return;
    }

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
              {invalidInviteMessage}
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mt-6 rounded-md border border-orange/30 bg-orange/10 px-4 py-3 text-sm font-semibold text-orange">
              {errorMessage}
            </div>
          ) : null}

          {successMessage ? (
            <div className="mt-6 rounded-md border border-teal/25 bg-teal/10 px-4 py-3 text-sm font-semibold text-teal">
              {successMessage}
            </div>
          ) : null}

          {state === "ready" || state === "saving" || state === "saved" ? (
            <form className="mt-6 grid gap-4" onSubmit={setPassword}>
              <label className="grid gap-1.5">
                <span className="text-sm font-bold text-navy">New password</span>
                <input
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
