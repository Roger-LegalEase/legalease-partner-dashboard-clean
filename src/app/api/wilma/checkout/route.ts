import { NextResponse } from "next/server";
import type { checkCompositeRateLimit } from "@/lib/security/rate-limit";
import {
  createWilmaCheckoutHandoff,
  type WilmaCheckoutBackend
} from "@/wilma/chat/checkout";

type VerifyBotProtection = (
  input: { honeypot?: string; botToken?: string },
  context?: { remoteIp?: string }
) => Promise<{ allowed: boolean }>;

type WilmaCheckoutRequestBody = {
  sessionId?: string;
  deviceId?: string;
  botToken?: string;
  company?: string;
};

type WilmaCheckoutRouteDependencies = {
  backend?: WilmaCheckoutBackend;
  verifyBotProtection?: VerifyBotProtection;
  checkRateLimit?: typeof checkCompositeRateLimit;
};

export function createWilmaCheckoutRouteHandler(dependencies: WilmaCheckoutRouteDependencies = {}) {
  return async function POST(request: Request) {
    const body = (await request.json().catch(() => null)) as WilmaCheckoutRequestBody | null;

    if (!body?.sessionId) {
      return NextResponse.json(
        { error: "checkout_not_available", reason: "missing_session" },
        { status: 400 }
      );
    }

    const botVerifier = dependencies.verifyBotProtection ?? (await import("@/lib/security/bot-protection")).verifyBotProtection;
    const bot = await botVerifier(
      { honeypot: body.company, botToken: body.botToken },
      { remoteIp: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() }
    );

    if (!bot.allowed) {
      return NextResponse.json({ error: "Request could not be verified." }, { status: 403 });
    }

    const rateLimiter = dependencies.checkRateLimit ?? (await import("@/lib/security/rate-limit")).checkCompositeRateLimit;
    const rateLimit = await rateLimiter({
      scope: "wilma:checkout",
      identity: localRateLimitIdentity(request, { deviceId: body.deviceId ?? body.sessionId }),
      limit: 5,
      windowMs: 10 * 60_000
    });

    if (!rateLimit.allowed) {
      const { rateLimitedResponse } = await import("@/lib/security/api-errors");
      return rateLimitedResponse(rateLimit.resetAt);
    }

    try {
      const result = await createWilmaCheckoutHandoff(
        { sessionId: body.sessionId },
        { backend: dependencies.backend ?? (await import("@/wilma/adapters/checkoutBackend")).createBackendWilmaCheckoutAdapter() }
      );

      if (!result.ok) {
        return NextResponse.json(
          { error: result.error, reason: result.reason },
          { status: result.reason === "missing_session" ? 404 : 400 }
        );
      }

      return NextResponse.json(
        {
          checkoutUrl: result.checkoutUrl,
          sessionId: result.sessionId
        },
        { status: 201 }
      );
    } catch {
      return NextResponse.json(
        { error: "checkout_not_available", reason: "not_likely_eligible" },
        { status: 400 }
      );
    }
  };
}

export const POST = createWilmaCheckoutRouteHandler();

function localRateLimitIdentity(request: Request, input: { deviceId?: string | null }) {
  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip"),
    email: null,
    deviceId: normalizeRateLimitValue(input.deviceId ?? request.headers.get("x-legalease-device-id"))
  };
}

function normalizeRateLimitValue(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase().replace(/[^a-z0-9@._-]/g, "").slice(0, 128);
  return normalized || null;
}
