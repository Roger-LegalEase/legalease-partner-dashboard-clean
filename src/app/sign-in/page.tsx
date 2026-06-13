"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { LogIn } from "lucide-react";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { authCaptchaFailureMessage, captchaOptions, isAuthCaptchaRequired } from "@/lib/auth/captcha";
import { safeAppRedirectPath } from "@/lib/auth/redirect";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const genericError = "We could not sign you in with those credentials.";

export default function SignInPage() {
  const [errorMessage, setErrorMessage] = useState("");
  const [isSignedOut] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return new URLSearchParams(window.location.search).get("signedOut") === "1";
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  async function signInWithPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage("");

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    if (!email || !password) {
      setErrorMessage(genericError);
      setIsSubmitting(false);
      return;
    }

    if (isAuthCaptchaRequired() && !captchaToken.trim()) {
      setErrorMessage(authCaptchaFailureMessage);
      setIsSubmitting(false);
      return;
    }

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: captchaOptions(captchaToken)
    });

    if (error) {
      setErrorMessage(isCaptchaError(error) ? authCaptchaFailureMessage : genericError);
      setIsSubmitting(false);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      setErrorMessage("We could not confirm your signed-in session. Please try again.");
      setIsSubmitting(false);
      return;
    }

    const next = new URLSearchParams(window.location.search).get("next");
    window.location.assign(safeAppRedirectPath(next, "/briefcase"));
  }

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 md:px-6">
        <Card className="w-full rounded-md p-6">
          <div className="text-center">
            <Badge tone="blue">LegalEase account access</Badge>
            <span className="mx-auto mt-5 flex h-12 w-12 items-center justify-center rounded-md bg-teal/10 text-teal">
              <LogIn className="h-6 w-6" aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-3xl font-black text-navy">Sign in or create your account</h1>
            <p className="mt-3 text-sm leading-6 text-grayWilma-700">
              Partner access is invite-only. Use the email approved by LegalEase.
            </p>
          </div>

          {isSignedOut ? (
            <div className="mt-6 rounded-md border border-teal/25 bg-teal/10 px-4 py-3 text-sm font-semibold text-teal">
              You are signed out.
            </div>
          ) : null}

          {errorMessage ? (
            <div className="mt-6 rounded-md border border-orange/30 bg-orange/10 px-4 py-3 text-sm font-semibold text-orange">
              {errorMessage}
            </div>
          ) : null}

          <form className="mt-6 grid gap-4" onSubmit={signInWithPassword}>
            <label className="grid gap-1.5">
              <span className="text-sm font-bold text-navy">Email</span>
              <input
                autoComplete="email"
                className="min-h-11 rounded-md border border-grayWilma-200 bg-white px-3 text-sm text-navy shadow-sm outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/25"
                name="email"
                required
                type="email"
              />
            </label>
            <label className="grid gap-1.5">
              <span className="text-sm font-bold text-navy">Password</span>
              <div className="flex min-h-11 overflow-hidden rounded-md border border-grayWilma-200 bg-white shadow-sm transition focus-within:border-teal focus-within:ring-2 focus-within:ring-teal/25">
                <input
                  autoComplete="current-password"
                  className="min-w-0 flex-1 bg-transparent px-3 text-sm text-navy outline-none"
                  name="password"
                  required
                  type={isPasswordVisible ? "text" : "password"}
                />
                <button
                  aria-label={isPasswordVisible ? "Hide password" : "Show password"}
                  className="border-l border-grayWilma-200 px-3 text-sm font-bold text-teal transition hover:bg-grayWilma-100 hover:text-navy disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                  onClick={() => setIsPasswordVisible((visible) => !visible)}
                  type="button"
                >
                  {isPasswordVisible ? "Hide" : "Show"}
                </button>
              </div>
            </label>
            <TurnstileWidget onTokenChange={setCaptchaToken} />
            <Button className="min-h-11" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="mt-5 text-center">
            <Link href="/auth/forgot-password" className="text-sm font-semibold text-teal hover:text-navy">
              Forgot your password?
            </Link>
          </div>

          <p className="mt-5 text-center text-sm leading-6 text-grayWilma-600">
            Need access? Contact your LegalEase program lead for an invitation.
          </p>
          <div className="mt-5 text-center">
            <Link href="/" className="text-sm font-semibold text-teal hover:text-navy">
              Back home
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
}

function isCaptchaError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message = "message" in error && typeof error.message === "string" ? error.message.toLowerCase() : "";
  const code = "code" in error && typeof error.code === "string" ? error.code.toLowerCase() : "";
  return message.includes("captcha") || code.includes("captcha");
}
