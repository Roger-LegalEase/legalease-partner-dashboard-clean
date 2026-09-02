"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { TurnstileWidget } from "@/components/auth/TurnstileWidget";
import { authCaptchaFailureMessage, captchaOptions, isAuthCaptchaRequired } from "@/lib/auth/captcha";
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
import { absoluteExpungementAiUrl } from "@/lib/app-url";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { useLocalization } from "@/components/expungement-ai/LocalizationProvider";

const genericError = "We could not sign you in. Check your email and password and try again.";
const genericCreateError = "We could not create your account. Check your email and password and try again.";
const confirmationMessage = "Check your email to finish creating your account.";
const pendingClaimError = "You are signed in, but we could not save your result yet. Retry saving it. Your preliminary result is still waiting for you.";
type AuthMode = "create" | "signin";
type PasswordlessState = "idle" | "magic" | "oauth";

export function ConsumerSignInForm({ initialMode = "signin" }: { initialMode?: AuthMode }) {
  const { t: translate } = useLocalization();
  // The server derives the initial state from the request URL, so hydration
  // cannot render "sign in" on the server and "create" in the browser.
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [errorMessage, setErrorMessage] = useState("");
  const [noticeMessage, setNoticeMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingClaimFailed, setPendingClaimFailed] = useState(false);
  const [captchaToken, setCaptchaToken] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [passwordlessState, setPasswordlessState] = useState<PasswordlessState>("idle");
  const { claimToken } = readAuthRequestContext();

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("claimRetry") === "1" && claimToken) {
      setPendingClaimFailed(true);
      setErrorMessage(translate("signin.pending_claim_error", pendingClaimError));
    }
  }, [claimToken, translate]);

  // The claim token is read from the URL on every attempt and never stashed in
  // localStorage. submitClaim strips it from the address bar once the server has
  // seen it.
  async function finishPendingClaim() {
    const requestContext = readAuthRequestContext();
    setIsSubmitting(true);
    setErrorMessage("");
    const claimed = await submitClaim(requestContext.claimToken);
    if (!claimed.ok) {
      setPendingClaimFailed(true);
      setErrorMessage(translate("signin.pending_claim_error", pendingClaimError));
      setIsSubmitting(false);
      return;
    }
    window.location.assign(claimed.redirectTo);
  }

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requestContext = readAuthRequestContext();
    setIsSubmitting(true);
    setErrorMessage("");
    setNoticeMessage("");
    setPendingClaimFailed(false);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const errorCopy = mode === "create"
      ? translate("signin.create_error", genericCreateError)
      : translate("signin.error", genericError);

    if (!email || !password) {
      setErrorMessage(errorCopy);
      setIsSubmitting(false);
      return;
    }

    if (isAuthCaptchaRequired() && !captchaToken.trim()) {
      setErrorMessage(authCaptchaFailureMessage);
      setIsSubmitting(false);
      return;
    }

    const supabase = createBrowserSupabaseClient();
    const response = mode === "create"
      ? await supabase.auth.signUp({
        email,
        password,
        options: {
          ...captchaOptions(captchaToken),
          emailRedirectTo: expungementAuthRedirectTo(requestContext.nextPath, requestContext.claimToken)
        }
      })
      : await supabase.auth.signInWithPassword({ email, password, options: captchaOptions(captchaToken) });

    if (response.error) {
      setErrorMessage(isCaptchaError(response.error) ? authCaptchaFailureMessage : errorCopy);
      setIsSubmitting(false);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session) {
      if (mode === "create") {
        setNoticeMessage(translate("signin.confirm_email", confirmationMessage));
      } else {
        setErrorMessage(errorCopy);
      }
      setIsSubmitting(false);
      return;
    }

    if (requestContext.claimToken) {
      await finishPendingClaim();
      return;
    }

    window.location.assign(requestContext.nextPath);
  }

  async function sendMagicLink(event: FormEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    const email = String(new FormData(form ?? undefined).get("email") ?? "").trim();
    if (!email || (isAuthCaptchaRequired() && !captchaToken.trim())) {
      setErrorMessage(!email ? genericError : authCaptchaFailureMessage);
      return;
    }
    const requestContext = readAuthRequestContext();
    setPasswordlessState("magic");
    setErrorMessage("");
    setNoticeMessage("");
    const { error } = await createBrowserSupabaseClient().auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: expungementAuthRedirectTo(requestContext.nextPath, requestContext.claimToken, requestContext.locale),
        ...captchaOptions(captchaToken)
      }
    });
    setPasswordlessState("idle");
    if (error) {
      setErrorMessage(isCaptchaError(error) ? authCaptchaFailureMessage : genericError);
      return;
    }
    setNoticeMessage("Check your email for a secure sign-in link. Your saved result will still be here.");
  }

  async function continueWithGoogle() {
    const requestContext = readAuthRequestContext();
    setPasswordlessState("oauth");
    setErrorMessage("");
    const { error } = await createBrowserSupabaseClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: expungementAuthRedirectTo(requestContext.nextPath, requestContext.claimToken, requestContext.locale),
        skipBrowserRedirect: false
      }
    });
    if (error) {
      setPasswordlessState("idle");
      setErrorMessage(genericError);
    }
  }

  const createMode = mode === "create";

  return (
    <>
      <div data-auth-mode={mode}>
        <p className="text-xs font-bold uppercase text-[#00A99D]">{translate("signin.account", "Your Expungement.ai account")}</p>
        <h1 className="mt-3 text-3xl font-extrabold">
          {createMode ? translate("signin.create_title", "Create your account") : translate("signin.title", "Sign in to continue")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-[#5A6275]">
          {createMode
            ? translate("signin.create_body", "Create an account to save this result in your free Briefcase, complete packet information, and return later.")
            : translate("signin.body", "Sign in to return to your Briefcase and continue where you left off.")}
        </p>
      </div>

      {errorMessage ? (
        <div className="mt-6 rounded-md border border-[#FF3B00]/30 bg-[#FF3B00]/10 px-4 py-3 text-sm font-semibold text-[#FF3B00]">
          {errorMessage}
          {pendingClaimFailed && claimToken ? (
            <button
              className="mt-3 block min-h-10 rounded-md bg-[#FF3B00] px-4 py-2 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
              data-pending-claim-retry="true"
              disabled={isSubmitting}
              onClick={() => void finishPendingClaim()}
              type="button"
            >
              {isSubmitting ? "Retrying..." : "Retry saving my result"}
            </button>
          ) : null}
        </div>
      ) : null}

      {noticeMessage ? (
        <div className="mt-6 rounded-md border border-[#00A99D]/30 bg-[#00A99D]/10 px-4 py-3 text-sm font-semibold text-[#0B6F68]">
          {noticeMessage}
        </div>
      ) : null}

      <form className="mt-6 grid gap-4" onSubmit={submitAuth}>
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
              autoComplete={createMode ? "new-password" : "current-password"}
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
          {isSubmitting
            ? createMode
              ? translate("signin.creating", "Creating account...")
              : translate("signin.signing_in", "Signing in...")
            : createMode
              ? translate("signin.create_submit", "Create account and continue")
              : translate("common.sign_in", "Sign in")}
        </button>
        {!createMode ? (
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-[#00A99D] bg-white px-5 text-sm font-bold text-[#0B6F68] transition hover:bg-[#00A99D]/5 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting || passwordlessState !== "idle"}
            onClick={sendMagicLink}
            type="button"
          >
            {passwordlessState === "magic" ? "Sending secure link..." : "Email me a secure sign-in link"}
          </button>
        ) : null}
      </form>

      <div className="my-5 flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-[#ECEFF4]" />
        <span className="text-xs font-bold uppercase text-[#5A6275]">or</span>
        <span className="h-px flex-1 bg-[#ECEFF4]" />
      </div>
      <button
        className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-[#ECEFF4] bg-white px-5 text-sm font-bold text-[#0B1320] transition hover:border-[#00A99D] disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isSubmitting || passwordlessState !== "idle"}
        onClick={() => void continueWithGoogle()}
        type="button"
      >
        {passwordlessState === "oauth" ? "Opening Google..." : "Continue with Google"}
      </button>

      <div className="mt-5 flex flex-col gap-3">
        <button
          className="text-left text-sm font-semibold text-[#00A99D] hover:text-[#0B1320]"
          onClick={() => {
            setMode(createMode ? "signin" : "create");
            setErrorMessage("");
            setNoticeMessage("");
            setPendingClaimFailed(false);
          }}
          type="button"
        >
          {createMode
            ? translate("signin.switch_to_signin", "Already have an account? Sign in")
            : translate("signin.switch_to_create", "New here? Create account")}
        </button>
        {!createMode ? <Link href={forgotPasswordHref()} className="text-sm font-semibold text-[#00A99D] hover:text-[#0B1320]">
          {translate("signin.forgot", "Forgot your password?")}
        </Link> : null}
      </div>
    </>
  );
}

function expungementAuthRedirectTo(nextPath: string, claimToken: string, locale: string | null = null) {
  const path = `/auth/set-password?${consumerAuthContinuationQuery({ nextPath, claimToken, locale })}`;
  if (typeof window !== "undefined" && isExpungementHost(window.location.hostname)) {
    return `${window.location.origin}${path}`;
  }
  return absoluteExpungementAiUrl(path);
}

function isExpungementHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".vercel.app") || hostname === "expungement.ai" || hostname === "www.expungement.ai";
}

function readAuthRequestContext() {
  if (typeof window === "undefined") {
    return { nextPath: "/briefcase", claimToken: "", locale: null };
  }
  return consumerAuthContinuationFrom(new URLSearchParams(window.location.search));
}

function forgotPasswordHref() {
  if (typeof window === "undefined") return "/auth/forgot-password?product=expungement";
  const continuation = readAuthRequestContext();
  return `/auth/forgot-password?${consumerAuthContinuationQuery(continuation, { product: "expungement" })}`;
}

function isCaptchaError(error: unknown) {
  if (!error || typeof error !== "object") {
    return false;
  }

  const message = "message" in error && typeof error.message === "string" ? error.message.toLowerCase() : "";
  const code = "code" in error && typeof error.code === "string" ? error.code.toLowerCase() : "";
  return message.includes("captcha") || code.includes("captcha");
}
