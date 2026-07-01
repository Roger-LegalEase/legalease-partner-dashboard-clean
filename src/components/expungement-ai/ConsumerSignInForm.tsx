"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { authCaptchaFailureMessage, captchaOptions, isAuthCaptchaRequired } from "@/lib/auth/captcha";
import { safeAppRedirectPath } from "@/lib/auth/redirect";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";

const genericError = "We could not sign you in. Check your email and password and try again.";

export function ConsumerSignInForm() {
  const { t: translate } = useLocalization();
  const [errorMessage, setErrorMessage] = useState("");
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
      setErrorMessage(translate("signin.error", genericError));
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
      setErrorMessage(isCaptchaError(error) ? authCaptchaFailureMessage : translate("signin.error", genericError));
      setIsSubmitting(false);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      setErrorMessage(translate("signin.error", genericError));
      setIsSubmitting(false);
      return;
    }

    const next = new URLSearchParams(window.location.search).get("next");
    window.location.assign(safeAppRedirectPath(next, "/briefcase"));
  }

  return (
    <>
      {errorMessage ? (
        <div className="mt-6 rounded-md border border-[#FF3B00]/30 bg-[#FF3B00]/10 px-4 py-3 text-sm font-semibold text-[#FF3B00]">
          {errorMessage}
        </div>
      ) : null}

      <form className="mt-6 grid gap-4" onSubmit={signInWithPassword}>
        <label className="grid gap-1.5">
          <span className="text-sm font-bold text-[#0B1320]">{translate("common.email", "Email")}</span>
          <input
            autoComplete="email"
            className="min-h-11 rounded-md border border-[#ECEFF4] bg-white px-3 text-sm text-[#0B1320] shadow-sm outline-none transition focus:border-[#00A99D] focus:ring-2 focus:ring-[#00A99D]/25"
            name="email"
            required
            type="email"
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-bold text-[#0B1320]">{translate("common.password", "Password")}</span>
          <div className="flex min-h-11 overflow-hidden rounded-md border border-[#ECEFF4] bg-white shadow-sm transition focus-within:border-[#00A99D] focus-within:ring-2 focus-within:ring-[#00A99D]/25">
            <input
              autoComplete="current-password"
              className="min-w-0 flex-1 bg-transparent px-3 text-sm text-[#0B1320] outline-none"
              name="password"
              required
              type={isPasswordVisible ? "text" : "password"}
            />
            <button
              aria-label={isPasswordVisible ? translate("signin.hide_password", "Hide password") : translate("signin.show_password", "Show password")}
              className="border-l border-[#ECEFF4] px-3 text-sm font-bold text-[#00A99D] transition hover:bg-[#F4F6FA] hover:text-[#0B1320] disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSubmitting}
              onClick={() => setIsPasswordVisible((visible) => !visible)}
              type="button"
            >
              {isPasswordVisible ? translate("common.hide", "Hide") : translate("common.show", "Show")}
            </button>
          </div>
        </label>
        <TurnstileWidget onTokenChange={setCaptchaToken} />
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-md bg-[#FF3B00] px-5 text-sm font-bold text-white transition hover:bg-[#E63500] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? translate("signin.signing_in", "Signing in...") : translate("common.sign_in", "Sign in")}
        </button>
      </form>

      <div className="mt-5">
        <Link href="/auth/forgot-password" className="text-sm font-semibold text-[#00A99D] hover:text-[#0B1320]">
          {translate("signin.forgot", "Forgot your password?")}
        </Link>
      </div>
    </>
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
