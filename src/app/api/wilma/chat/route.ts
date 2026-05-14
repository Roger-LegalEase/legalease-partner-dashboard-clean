import { NextResponse } from "next/server";
import type { AppUser } from "@/lib/auth";
import type { checkCompositeRateLimit } from "@/lib/security/rate-limit";
import {
  createOpenAIWilmaFactExtractor,
  runWilmaChat,
  type WilmaChatBackend,
  type WilmaFactExtractor
} from "@/wilma/chat/orchestrator";
import { trackWilmaEvent } from "@/wilma/analytics/trackWilmaEvent";
import { createEnvWilmaLaunchBackend, type WilmaLaunchBackend } from "@/wilma/adapters/launchBackend";
import { evaluateWilmaLaunchAccess } from "@/wilma/launch/evaluateLaunchAccess";

type VerifyBotProtection = (
  input: { honeypot?: string; botToken?: string },
  context?: { remoteIp?: string }
) => Promise<{ allowed: boolean }>;

type WilmaChatRequestBody = {
  sessionId?: string;
  message?: string;
  state?: string;
  email?: string;
  anonymousId?: string;
  deviceId?: string;
  betaToken?: string;
  botToken?: string;
  company?: string;
};

type WilmaChatRouteDependencies = {
  backend?: WilmaChatBackend;
  extractor?: WilmaFactExtractor;
  currentUser?: () => Promise<AppUser | null>;
  verifyBotProtection?: VerifyBotProtection;
  checkRateLimit?: typeof checkCompositeRateLimit;
  launchBackend?: WilmaLaunchBackend;
};

export function createWilmaChatRouteHandler(dependencies: WilmaChatRouteDependencies = {}) {
  return async function POST(request: Request) {
    const body = (await request.json().catch(() => null)) as WilmaChatRequestBody | null;

    if (!body?.message?.trim()) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    const remoteIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? request.headers.get("x-real-ip");
    const user = await resolveWilmaChatUser(
      body,
      dependencies.currentUser ?? (await import("@/lib/auth")).currentUser
    );
    const launchBackend = dependencies.launchBackend ?? createEnvWilmaLaunchBackend();
    const launchAccess = evaluateWilmaLaunchAccess(await launchBackend.getLaunchConfig(), {
      state: body.state?.trim().toUpperCase(),
      email: validEmail(body.email) ? body.email?.trim().toLowerCase() : user.email,
      betaToken: body.betaToken ?? request.headers.get("x-wilma-beta-token"),
      anonymousId: body.anonymousId,
      deviceId: body.deviceId ?? request.headers.get("x-legalease-device-id"),
      remoteIp,
      user
    });

    if (!launchAccess.allowed) {
      if (launchAccess.reason === "state_not_enabled_for_beta") {
        return NextResponse.json(
          {
            sessionId: body.sessionId ?? "",
            assistantMessage: "Wilma is not available for that state during this rollout.",
            status: "outside_supported_scope",
            requiresEmailGate: false,
            allowPaidCta: false,
            emailCaptured: false,
            showEmailGate: false,
            showPaidCta: false,
            reasonCodes: ["state_not_enabled_for_beta"]
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        {
          error: launchAccess.reason ?? "wilma_unavailable",
          message: launchAccess.message ?? "Wilma is not available right now. Please check back soon."
        },
        { status: 503 }
      );
    }

    const botVerifier = dependencies.verifyBotProtection ?? (await import("@/lib/security/bot-protection")).verifyBotProtection;
    const bot = await botVerifier(
      { honeypot: body.company, botToken: body.botToken },
      { remoteIp: remoteIp ?? undefined }
    );

    if (!bot.allowed) {
      const backend = dependencies.backend ?? (await import("@/wilma/adapters/backend")).createBackendWilmaChatAdapter();
      await trackWilmaEvent(backend, {
        event: "wilma_session_flagged",
        wilmaSessionId: body.sessionId ?? "wilma_blocked",
        reasonCodes: ["bot_protection_failed"],
        riskFlags: ["bot_protection_failed"],
        metadata: {
          deviceId: body.deviceId || body.anonymousId ? "present" : "missing",
          ip: remoteIp ? "present" : "missing"
        }
      });
      return NextResponse.json({ error: "Request could not be verified." }, { status: 403 });
    }

    const rateLimiter = dependencies.checkRateLimit ?? (await import("@/lib/security/rate-limit")).checkCompositeRateLimit;
    const rateLimit = await rateLimiter({
      scope: "wilma:chat",
      identity: localRateLimitIdentity(request, {
        email: body.email ?? user.email,
        deviceId: body.deviceId ?? body.anonymousId
      }),
      limit: 60,
      windowMs: 60 * 60_000
    });

    if (!rateLimit.allowed) {
      const backend = dependencies.backend ?? (await import("@/wilma/adapters/backend")).createBackendWilmaChatAdapter();
      await trackWilmaEvent(backend, {
        event: "wilma_session_flagged",
        wilmaSessionId: body.sessionId ?? "wilma_blocked",
        actorUserId: user.id,
        actorEmail: validEmail(body.email) ? body.email : user.email,
        reasonCodes: ["ip_rate_limited"],
        riskFlags: ["rate_limit_hit"],
        metadata: {
          resetAt: rateLimit.resetAt.toISOString(),
          deviceId: body.deviceId || body.anonymousId ? "present" : "missing",
          ip: remoteIp ? "present" : "missing"
        }
      });
      const { rateLimitedResponse } = await import("@/lib/security/api-errors");
      return rateLimitedResponse(rateLimit.resetAt);
    }

    try {
      const backend = dependencies.backend ?? (await import("@/wilma/adapters/backend")).createBackendWilmaChatAdapter();
      const configEnv = dependencies.extractor ? null : (await import("@/lib/env")).env;
      const response = await runWilmaChat(
        {
          sessionId: body.sessionId,
          userId: user.id,
          email: validEmail(body.email) ? body.email?.trim().toLowerCase() : undefined,
          message: body.message,
          state: body.state,
          ip: remoteIp,
          deviceId: body.deviceId ?? body.anonymousId ?? request.headers.get("x-legalease-device-id")
        },
        {
          backend,
          extractor:
            dependencies.extractor ??
            createOpenAIWilmaFactExtractor({
              apiKey: configEnv?.OPENAI_API_KEY,
              model: configEnv?.OPENAI_MODEL ?? "gpt-4o-mini"
            })
        }
      );

      return NextResponse.json(response, { status: 200 });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Wilma chat failed.";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}

export const POST = createWilmaChatRouteHandler();

async function resolveWilmaChatUser(
  body: WilmaChatRequestBody,
  currentUserResolver: () => Promise<AppUser | null>
): Promise<AppUser> {
  const user = await currentUserResolver();

  if (user) {
    return user;
  }

  const email = validEmail(body.email) ? body.email?.trim().toLowerCase() : undefined;

  if (email) {
    return {
      id: `wilma-${email}`,
      email,
      role: "CUSTOMER"
    };
  }

  const anonymousId = sanitizeAnonymousId(body.anonymousId ?? body.deviceId);
  const anonymousEmail = `${anonymousId}@wilma.local`;

  return {
    id: `wilma-${anonymousId}`,
    email: anonymousEmail,
    role: "CUSTOMER"
  };
}

function validEmail(email: string | undefined): boolean {
  return Boolean(email?.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()));
}

function sanitizeAnonymousId(anonymousId: string | undefined): string {
  const sanitized = anonymousId?.toLowerCase().replace(/[^a-z0-9_-]/g, "").slice(0, 64);

  return sanitized || "anonymous";
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
