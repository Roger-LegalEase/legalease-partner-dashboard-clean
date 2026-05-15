import { afterEach, describe, expect, it, vi } from "vitest";
import { parseEnv } from "@/lib/env";
import { parsePublicEnv } from "@/lib/public-env";

const validEnv = {
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/legalease_recordshield",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
  DEV_AUTH_EMAIL: "admin@example.com",
  DEV_AUTH_ROLE: "ADMIN",
  RECORDSHIELD_BASIC_PRICE_CENTS: "4900",
  RECORDSHIELD_FAMILY_PRICE_CENTS: "9900",
  RECORDSHIELD_BUSINESS_PRICE_CENTS: "19900",
  STRIPE_SECRET_KEY: "sk_test_123",
  STRIPE_WEBHOOK_SECRET: "whsec_123",
  STRIPE_PRICE_RECORD_CHECK: "price_record_check",
  STRIPE_PRICE_MONITORING_MONTHLY: "price_monitoring_monthly",
  STRIPE_PRICE_MONITORING_ANNUAL: "price_monitoring_annual",
  STRIPE_PRICE_MONITORING_PLUS_MONTHLY: "price_monitoring_plus_monthly",
  CHECKR_API_KEY: "checkr_test_123",
  CHECKR_BASE_URL: "https://api.checkr-staging.com/v1",
  CHECKR_PACKAGE_SLUG: "recordshield_background_check",
  CHECKR_NODE_CUSTOM_ID: "legal_ease_node",
  CHECKR_WORK_LOCATION_COUNTRY: "US",
  CHECKR_WORK_LOCATION_STATE: "NY",
  CHECKR_WORK_LOCATION_CITY: "New York"
};

describe("parseEnv", () => {
  it("accepts a complete valid environment", () => {
    expect(parseEnv(validEnv)).toMatchObject({
      DEV_AUTH_ROLE: "ADMIN",
      RECORDSHIELD_BASIC_PRICE_CENTS: 4900,
      CHECKR_PACKAGE_SLUG: "recordshield_background_check"
    });
  });

  it("rejects non-PostgreSQL database URLs", () => {
    expect(() =>
      parseEnv({
        ...validEnv,
        DATABASE_URL: "mysql://user:password@localhost:3306/app"
      })
    ).toThrow(/DATABASE_URL/);
  });

  it("rejects invalid prices", () => {
    expect(() =>
      parseEnv({
        ...validEnv,
        RECORDSHIELD_BASIC_PRICE_CENTS: "0"
      })
    ).toThrow(/RECORDSHIELD_BASIC_PRICE_CENTS/);
  });

  it("parses only NEXT_PUBLIC values for client-safe env", () => {
    expect(parsePublicEnv(validEnv)).toEqual({
      NEXT_PUBLIC_APP_URL: "http://localhost:3000"
    });
    expect(parsePublicEnv(validEnv)).not.toHaveProperty("STRIPE_SECRET_KEY");
  });

  it("falls back public app URL to VERCEL_URL", () => {
    expect(parsePublicEnv({ VERCEL_URL: "recordshield-staging.vercel.app" })).toEqual({
      NEXT_PUBLIC_APP_URL: "https://recordshield-staging.vercel.app"
    });
  });

  it("falls back APP_BASE_URL to NEXT_PUBLIC_APP_URL, then VERCEL_URL, then localhost", () => {
    expect(parseEnv({ NEXT_PUBLIC_APP_URL: "https://public.example.com" }).APP_BASE_URL).toBe(
      "https://public.example.com"
    );
    expect(parseEnv({ VERCEL_URL: "recordshield-staging.vercel.app" }).APP_BASE_URL).toBe(
      "https://recordshield-staging.vercel.app"
    );
    expect(parseEnv({}).APP_BASE_URL).toBe("http://localhost:3000");
  });

  it("uses build-safe price cent defaults", () => {
    expect(parseEnv({})).toMatchObject({
      RECORDSHIELD_BASIC_PRICE_CENTS: 19900,
      RECORDSHIELD_FAMILY_PRICE_CENTS: 29900,
      RECORDSHIELD_BUSINESS_PRICE_CENTS: 49900
    });
  });

  it("imports analytics without provider or database environment variables", async () => {
    const originalEnv = process.env;
    vi.resetModules();
    process.env = {
      NODE_ENV: "production",
      VERCEL_URL: "recordshield-staging.vercel.app"
    };

    try {
      await expect(import("@/lib/analytics")).resolves.toHaveProperty("trackAnalyticsEvent");
    } finally {
      process.env = originalEnv;
    }
  });
});

afterEach(() => {
  vi.resetModules();
});
