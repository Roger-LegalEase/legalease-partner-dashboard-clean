export type RcapCaptchaResult = { ok: true; enabled: boolean } | { ok: false; error: string };

export function isRcapCaptchaEnabled() {
  return process.env.ENABLE_RCAP_CAPTCHA === "true";
}

export async function verifyRcapCaptchaToken(token: unknown): Promise<RcapCaptchaResult> {
  if (!isRcapCaptchaEnabled()) {
    return { ok: true, enabled: false };
  }

  if (typeof token !== "string" || !token.trim()) {
    return { ok: false, error: "CAPTCHA verification is required." };
  }

  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) {
    return { ok: false, error: "CAPTCHA is enabled but not configured." };
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ secret, response: token })
  });
  const payload = (await response.json().catch(() => null)) as { success?: boolean } | null;
  return payload?.success ? { ok: true, enabled: true } : { ok: false, error: "CAPTCHA verification failed." };
}
