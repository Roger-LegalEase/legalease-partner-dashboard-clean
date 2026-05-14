import { NextResponse } from "next/server";
import type { checkCompositeRateLimit } from "@/lib/security/rate-limit";
import { captureWilmaLead, type WilmaChatBackend } from "@/wilma/chat/orchestrator";

type VerifyBotProtection = (
  input: { honeypot?: string; botToken?: string },
  context?: { remoteIp?: string }
) => Promise<{ allowed: boolean }>;

type WilmaLeadRequestBody = {
  email?: string;
  consent?: boolean;
  sessionId?: string;
  deviceId?: string;
  botToken?: string;
  company?: string;
};

type WilmaLeadRouteDependencies = {
  backend?: WilmaChatBackend;
  verifyBotProtection?: VerifyBotProtection;
  checkRateLimit?: typeof checkCompositeRateLimit;
};

export function createWilmaLeadRouteHandler(dependencies: WilmaLeadRouteDependencies = {}) {
  return async function POST(request: Request) {
    const body = (await request.json().catch(() => null)) as WilmaLeadRequestBody | null;

    if (!body?.sessionId) {
      return NextResponse.json({ error: "Session is required." }, { status: 400 });
    }
    if (!body.email || !validEmail(body.email)) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }
    if (!body.consent) {
      return NextResponse.json({ error: "Consent is required." }, { status: 400 });
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
      scope: "wilma:lead",
      identity: localRateLimitIdentity(request, { email: body.email, deviceId: body.deviceId ?? body.sessionId }),
      limit: 10,
      windowMs: 10 * 60_000
    });

    if (!rateLimit.allowed) {
      const { rateLimitedResponse } = await import("@/lib/security/api-errors");
      return rateLimitedResponse(rateLimit.resetAt);
    }

    try {
      const response = await captureWilmaLead(
        {
          sessionId: body.sessionId,
          email: body.email,
          consent: body.consent
        },
        { backend: dependencies.backend ?? (await import("@/wilma/adapters/backend")).createBackendWilmaChatAdapter() }
      );

      return NextResponse.json(response, { status: 201 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Wilma could not save your email.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  };
}

export const POST = createWilmaLeadRouteHandler();

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function localRateLimitIdentity(request: Request, input: { email?: string | null; deviceId?: string | null }) {
  return {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip"),
    email: normalizeRateLimitValue(input.email),
    deviceId: normalizeRateLimitValue(input.deviceId ?? request.headers.get("x-legalease-device-id"))
  };
}

function normalizeRateLimitValue(value: string | null | undefined): string | null {
  const normalized = value?.trim().toLowerCase().replace(/[^a-z0-9@._-]/g, "").slice(0, 128);
  return normalized || null;
}
