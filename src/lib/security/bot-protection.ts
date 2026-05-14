import { env, type Env } from "@/lib/env";

export type BotProtectionPayload = {
  honeypot?: string;
  botToken?: string;
};

export type BotProtectionResult = {
  allowed: boolean;
  reason?: "honeypot" | "missing_token" | "invalid_token" | "verification_failed";
};

export async function verifyBotProtection(
  payload: BotProtectionPayload,
  dependencies: {
    configEnv?: Env;
    fetcher?: typeof fetch;
    remoteIp?: string | null;
  } = {}
): Promise<BotProtectionResult> {
  const configEnv = dependencies.configEnv ?? env;

  if (payload.honeypot?.trim()) {
    return { allowed: false, reason: "honeypot" };
  }

  if (!configEnv.BOT_PROTECTION_SECRET) {
    return { allowed: true };
  }

  if (!payload.botToken) {
    return { allowed: false, reason: "missing_token" };
  }

  try {
    const response = await (dependencies.fetcher ?? fetch)("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: configEnv.BOT_PROTECTION_SECRET,
        response: payload.botToken,
        ...(dependencies.remoteIp ? { remoteip: dependencies.remoteIp } : {})
      })
    });
    const result = (await response.json()) as { success?: boolean };

    return result.success ? { allowed: true } : { allowed: false, reason: "invalid_token" };
  } catch {
    return { allowed: false, reason: "verification_failed" };
  }
}
