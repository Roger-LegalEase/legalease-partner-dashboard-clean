export const authCaptchaFailureMessage = "Please complete the security check and try again.";

export function getTurnstileSiteKey() {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
}

export function isAuthCaptchaEnabled() {
  return getTurnstileSiteKey().length > 0;
}

export function isAuthCaptchaRequired() {
  const configuredRequirement = process.env.NEXT_PUBLIC_AUTH_CAPTCHA_REQUIRED?.trim().toLowerCase();

  if (configuredRequirement === "false") {
    return false;
  }

  if (configuredRequirement === "true") {
    return true;
  }

  return process.env.NODE_ENV === "production" || isAuthCaptchaEnabled();
}

export function captchaOptions(captchaToken: string) {
  const token = captchaToken.trim();
  return token ? { captchaToken: token } : undefined;
}
