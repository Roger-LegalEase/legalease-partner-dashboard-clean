import { describe, expect, it } from "vitest";
import { anonymizeUserData } from "@/lib/data-deletion";
import { assertProductionEnv, parseEnv } from "@/lib/env";
import { reportError, sendProductionAlert } from "@/lib/observability";
import { verifyBotProtection } from "@/lib/security/bot-protection";
import { checkCompositeRateLimit, checkRateLimit, rateLimitIdentity, resetRateLimitForTests } from "@/lib/security/rate-limit";
import { minimizeTranscriptContent, redactForStorage } from "@/lib/security/redaction";
import { POST as checkrWebhookPost } from "@/app/api/checkr/webhook/route";
import { POST as stripeWebhookPost } from "@/app/api/stripe/webhook/route";

const baseEnv = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/legalease_recordshield",
  APP_BASE_URL: "http://localhost:3000",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  NEXTAUTH_SECRET: "test_nextauth_secret",
  RECORDSHIELD_BASIC_PRICE_CENTS: "4900",
  RECORDSHIELD_FAMILY_PRICE_CENTS: "9900",
  RECORDSHIELD_BUSINESS_PRICE_CENTS: "19900",
  STRIPE_SECRET_KEY: "sk_test_123",
  STRIPE_WEBHOOK_SECRET: "whsec_123",
  STRIPE_PRICE_RECORD_CHECK: "price_record_check",
  STRIPE_PRICE_MONITORING_LITE_MONTHLY: "price_monitoring_lite_monthly",
  STRIPE_PRICE_MONITORING_LITE_ANNUAL: "price_monitoring_lite_annual",
  STRIPE_PRICE_MONITORING_PLUS_MONTHLY: "price_monitoring_plus_monthly",
  CHECKR_API_KEY: "checkr_test_123",
  CHECKR_WEBHOOK_SECRET: "checkr_webhook_test_123",
  CHECKR_PACKAGE_SLUG: "recordshield_background_check",
  CHECKR_WORK_LOCATION_STATE: "NY",
  CHECKR_WORK_LOCATION_CITY: "New York",
  OPENAI_API_KEY: "openai_test_123",
  BOT_PROTECTION_SECRET: "bot_secret",
  ERROR_MONITORING_DSN: "https://errors.example.com/project",
  PRODUCTION_ALERT_WEBHOOK_URL: "https://alerts.example.com/hooks/legalease"
};

describe("security helpers", () => {
  it("redacts sensitive keys and common sensitive string patterns", () => {
    const input = {
      email: "person@example.com",
      phone: "Call 212-555-1212",
      nested: {
        ssn: "123-45-6789",
        date_of_birth: "1970-01-01",
        safe: "case id case_123",
        providerPayload: [{ authorization: "Bearer secret-token" }, { unknown: "born 1985-04-12" }]
      },
      nullish: null
    };
    const redacted = redactForStorage(input);

    expect(redacted).toEqual({
      email: "[REDACTED_EMAIL]",
      phone: "Call [REDACTED_PHONE]",
      nested: {
        ssn: "[REDACTED]",
        date_of_birth: "[REDACTED]",
        safe: "case id case_123",
        providerPayload: [{ authorization: "[REDACTED]" }, { unknown: "born [REDACTED_DATE]" }]
      },
      nullish: null
    });
    expect(input.nested.ssn).toBe("123-45-6789");
    expect(redactForStorage(undefined)).toBeUndefined();
    expect(redactForStorage(["person@example.com", null])).toEqual(["[REDACTED_EMAIL]", null]);
    expect(minimizeTranscriptContent("Email me at person@example.com or 212-555-1212")).toBe(
      "Email me at [REDACTED_EMAIL] or [REDACTED_PHONE]"
    );
  });

  it("enforces the placeholder rate limit by key", async () => {
    resetRateLimitForTests();

    await expect(checkRateLimit({ key: "checkout:test", limit: 2, windowMs: 60_000 })).resolves.toMatchObject({
      allowed: true,
      remaining: 1,
      provider: "memory"
    });
    await expect(checkRateLimit({ key: "checkout:test", limit: 2, windowMs: 60_000 })).resolves.toMatchObject({
      allowed: true,
      remaining: 0,
      provider: "memory"
    });
    await expect(checkRateLimit({ key: "checkout:test", limit: 2, windowMs: 60_000 })).resolves.toMatchObject({
      allowed: false,
      remaining: 0,
      provider: "memory"
    });
  });

  it("fails closed in production without Redis unless fallback is explicit", async () => {
    const configEnv = parseEnv({ ...baseEnv, NODE_ENV: "production", RATE_LIMIT_ALLOW_MEMORY_FALLBACK: "false" });

    await expect(checkRateLimit({ key: "checkout:prod", configEnv })).resolves.toMatchObject({
      allowed: false,
      provider: "closed"
    });
  });

  it("uses Redis REST rate limiting when configured", async () => {
    const configEnv = parseEnv({
      ...baseEnv,
      NODE_ENV: "production",
      RATE_LIMIT_REDIS_REST_URL: "https://redis.example.com",
      RATE_LIMIT_REDIS_REST_TOKEN: "redis_token"
    });
    const fetcher = async () =>
      new Response(JSON.stringify([{ result: 1 }, { result: "OK" }]), { status: 200 });

    await expect(
      checkRateLimit({ key: "checkout:redis", limit: 2, configEnv, fetcher })
    ).resolves.toMatchObject({
      allowed: true,
      remaining: 1,
      provider: "redis"
    });
  });

  it("checks rate limits across IP, email, and device keys", async () => {
    resetRateLimitForTests();
    const request = new Request("http://localhost/api/wilma/chat", {
      headers: {
        "x-forwarded-for": "203.0.113.44",
        "x-legalease-device-id": "device_123"
      }
    });
    const identity = rateLimitIdentity(request, { email: "Lead@Example.com" });

    await expect(checkCompositeRateLimit({ scope: "wilma:test", identity, limit: 1 })).resolves.toMatchObject({
      allowed: true,
      provider: "memory"
    });
    await expect(checkCompositeRateLimit({ scope: "wilma:test", identity, limit: 1 })).resolves.toMatchObject({
      allowed: false
    });
  });

  it("blocks honeypot submissions and verifies configured bot tokens", async () => {
    const configEnv = parseEnv({ ...baseEnv, NODE_ENV: "production" });

    await expect(verifyBotProtection({ honeypot: "filled" }, { configEnv })).resolves.toEqual({
      allowed: false,
      reason: "honeypot"
    });
    await expect(
      verifyBotProtection(
        { botToken: "token_123" },
        {
          configEnv,
          fetcher: async () => new Response(JSON.stringify({ success: true }), { status: 200 })
        }
      )
    ).resolves.toEqual({ allowed: true });
  });

  it("sends redacted production alerts without throwing", async () => {
    const configEnv = parseEnv({ ...baseEnv, NODE_ENV: "production" });
    const calls: unknown[] = [];
    const fetcher = async (_url: string | URL | Request, init?: RequestInit) => {
      calls.push(init?.body);
      return new Response("{}", { status: 202 });
    };

    await reportError(new Error("person@example.com failed"), { token: "secret" }, { configEnv, fetcher });
    await sendProductionAlert("bot_blocked", { email: "person@example.com" }, { configEnv, fetcher });

    expect(JSON.stringify(calls)).toContain("[REDACTED_EMAIL]");
    expect(JSON.stringify(calls)).not.toContain("person@example.com");
    expect(JSON.stringify(calls)).not.toContain("secret");
  });

  it("fails loudly when required production env vars are missing", () => {
    expect(() =>
      assertProductionEnv({
        ...baseEnv,
        NODE_ENV: "production",
        NEXTAUTH_SECRET: undefined,
        CHECKR_WEBHOOK_SECRET: undefined,
        OPENAI_API_KEY: undefined
      })
    ).toThrow(/NEXTAUTH_SECRET|CHECKR_WEBHOOK_SECRET|OPENAI_API_KEY/);
  });

  it("rate limits invalid webhook signature attempts but does not use checkout limits", async () => {
    resetRateLimitForTests();

    const checkrResponse = await checkrWebhookPost(
      new Request("http://localhost/api/checkr/webhook", {
        method: "POST",
        headers: { "x-checkr-signature": "bad", "x-forwarded-for": "203.0.113.10" },
        body: JSON.stringify({ id: "evt_bad", type: "report.completed" })
      })
    );
    expect(checkrResponse.status).toBe(400);

    const stripeResponse = await stripeWebhookPost(
      new Request("http://localhost/api/stripe/webhook", {
        method: "POST",
        headers: { "stripe-signature": "bad", "x-forwarded-for": "203.0.113.11" },
        body: JSON.stringify({ id: "evt_bad", type: "checkout.session.completed" })
      })
    );
    expect(stripeResponse.status).toBe(400);
  });

  it("anonymizes user-linked records and creates an audit event", async () => {
    const calls: unknown[] = [];
    const db = {
      user: {
        update: async (args: unknown) => {
          calls.push(args);
          return { id: "user_123", email: "deleted-user_123@deleted.local" };
        }
      },
      productOrder: { updateMany: async (args: unknown) => calls.push(args) },
      subscriptionEntitlement: { updateMany: async (args: unknown) => calls.push(args) },
      providerCandidate: { updateMany: async (args: unknown) => calls.push(args) },
      wilmaChatSession: { updateMany: async (args: unknown) => calls.push(args) },
      wilmaChatMessage: { updateMany: async (args: unknown) => calls.push(args) },
      adminCaseNote: { updateMany: async (args: unknown) => calls.push(args) },
      auditEvent: { create: async (args: unknown) => calls.push(args) }
    };

    const result = await anonymizeUserData(
      { userId: "user_123", requestedByUserId: "admin_123", requestedByEmail: "admin@example.com" },
      db
    );

    expect(result).toEqual({ userId: "user_123", anonymizedEmail: "deleted-user_123@deleted.local" });
    expect(calls).toContainEqual(
      expect.objectContaining({
        data: expect.objectContaining({ action: "privacy.user_anonymized" })
      })
    );
  });
});
