"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { KeyRound } from "lucide-react";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { authCaptchaFailureMessage, captchaOptions, isAuthCaptchaRequired } from "@/lib/auth/captcha";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";

const successMessage = "If an account exists for that email, we sent password reset instructions.";
const invalidEmailMessage = "Enter a valid email address.";

export default function ForgotPasswordPage() {
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");

  async function requestPasswordReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setStatusMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();

    if (!isValidEmail(email)) {
      setErrorMessage(invalidEmailMessage);
      setIsSubmitting(false);
      return;
    }

    if (isAuthCaptchaRequired() && !captchaToken.trim()) {
      setErrorMessage(authCaptchaFailureMessage);
      setIsSubmitting(false);
      return;
    }

    const supabase = createBrowserSupabaseClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: passwordResetRedirectTo(),
      captchaToken: captchaOptions(captchaToken)?.captchaToken
    });

    if (error && isCaptchaError(error)) {
      setErrorMessage(authCaptchaFailureMessage);
      setIsSubmitting(false);
      return;
    }

    setStatusMessage(successMessage);
    setIsSubmitting(false);
  }

  return (
    <main className="min-h-screen bg-[#f7f8f6] text-navy">
      <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 md:px-6">
        <Card className="w-full rounded-md p-6">
          <div className="text-center">
            <Badge tone="blue">LegalEase account access</Badge>
            <span className="mx-auto mt-5 flex h-12 w-12 items-center justify-center rounded-md bg-teal/10 text-teal">
              <KeyRound className="h-6 w-6" aria-hidden="true" />
            </span>
            <h1 className="mt-5 text-3xl font-black text-navy">Reset your password</h1>
            <p className="mt-3 text-sm leading-6 text-grayWilma-700">
              Enter the email address approved for your LegalEase partner account.
            </p>
          </div>

          {errorMessage ? (
            <div className="mt-6 rounded-md border border-orange/30 bg-orange/10 px-4 py-3 text-sm font-semibold text-orange">
              {errorMessage}
            </div>
          ) : null}

          {statusMessage ? (
            <div className="mt-6 rounded-md border border-teal/25 bg-teal/10 px-4 py-3 text-sm font-semibold text-teal">
              {statusMessage}
            </div>
          ) : null}

          <form className="mt-6 grid gap-4" onSubmit={requestPasswordReset}>
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
            <TurnstileWidget onTokenChange={setCaptchaToken} />
            <Button className="min-h-11" disabled={isSubmitting} type="submit">
              {isSubmitting ? "Sending instructions..." : "Send reset instructions"}
            </Button>
          </form>

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

function passwordResetRedirectTo() {
  const configuredAppUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  const baseUrl = configuredAppUrl || window.location.origin;
  const url = new URL("/auth/set-password", baseUrl);
  url.search = "?next=/partner/dashboard";
  return url.toString();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isCaptchaError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message = "message" in error && typeof error.message === "string" ? error.message.toLowerCase() : "";
  const code = "code" in error && typeof error.code === "string" ? error.code.toLowerCase() : "";
  return message.includes("captcha") || code.includes("captcha");
}
