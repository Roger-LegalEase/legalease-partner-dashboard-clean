import "server-only";

// Cloudflare Turnstile verification for the anonymous Wilma endpoint.
//
// Posture mirrors the rate-limit store:
//   - TURNSTILE_SECRET_KEY ABSENT  -> challenge DISABLED (verification passes). Lets staging
//     drive the endpoint for the adversarial suite before the prod challenge is wired.
//   - TURNSTILE_SECRET_KEY PRESENT -> the request MUST carry a valid token; missing/invalid
//     tokens are rejected.

const TURNSTILE_SECRET = process.env.TURNSTILE_SECRET_KEY || "";
const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function isBotChallengeConfigured(): boolean {
  return Boolean(TURNSTILE_SECRET);
}

export type ChallengeResult = { ok: boolean; reason?: string };

export async function verifyTurnstileToken(token: string | undefined, remoteIp?: string): Promise<ChallengeResult> {
  if (!isBotChallengeConfigured()) return { ok: true, reason: "challenge_disabled" };
  if (!token || typeof token !== "string") return { ok: false, reason: "missing_token" };

  try {
    const form = new URLSearchParams();
    form.set("secret", TURNSTILE_SECRET);
    form.set("response", token);
    if (remoteIp && remoteIp !== "0.0.0.0") form.set("remoteip", remoteIp);

    const res = await fetch(VERIFY_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(3000),
      body: form.toString()
    });
    if (!res.ok) return { ok: false, reason: "verify_unreachable" };
    const body = await res.json() as { success?: boolean };
    return body.success ? { ok: true } : { ok: false, reason: "challenge_failed" };
  } catch {
    return { ok: false, reason: "verify_unreachable" };
  }
}
