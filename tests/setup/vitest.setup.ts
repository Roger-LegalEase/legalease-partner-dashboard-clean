import { afterEach, beforeEach, vi } from "vitest";

const originalEnv = { ...process.env };
const allowedLocalHosts = new Set(["localhost", "127.0.0.1", "::1"]);

beforeEach(() => {
  process.env = {
    ...originalEnv,
    NODE_ENV: "test",
    DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/legalease_recordshield",
    APP_BASE_URL: "http://localhost:3000",
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    NEXTAUTH_SECRET: "test_nextauth_secret",
    STRIPE_SECRET_KEY: "sk_test_123",
    STRIPE_WEBHOOK_SECRET: "whsec_123",
    STRIPE_PRICE_RECORD_CHECK: "price_record_check",
    STRIPE_PRICE_MONITORING_LITE_MONTHLY: "price_monitoring_lite_monthly",
    STRIPE_PRICE_MONITORING_LITE_ANNUAL: "price_monitoring_lite_annual",
    STRIPE_PRICE_MONITORING_PLUS_MONTHLY: "price_monitoring_plus_monthly",
    CHECKR_API_KEY: "checkr_test_123",
    CHECKR_WEBHOOK_SECRET: "checkr_webhook_test_123",
    CHECKR_BASE_URL: "https://api.checkr-staging.com/v1",
    CHECKR_PACKAGE_SLUG: "recordshield_background_check",
    CHECKR_WORK_LOCATION_COUNTRY: "US",
    CHECKR_WORK_LOCATION_STATE: "NY",
    CHECKR_WORK_LOCATION_CITY: "New York",
    OPENAI_API_KEY: "openai_test_123",
    BETA_ACCESS_ENABLED: "true",
    BETA_INVITE_ONLY: "false",
    RECORD_CHECK_PURCHASE_ENABLED: "true",
    MONITORING_PURCHASE_ENABLED: "true",
    AI_SUMMARY_ENABLED: "true",
    ADMIN_RETRY_ENABLED: "true",
    DATA_DELETION_REQUEST_ENABLED: "true"
  };
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

const realFetch = globalThis.fetch;

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" || input instanceof URL ? new URL(input) : new URL(input.url);
  if (!allowedLocalHosts.has(url.hostname)) {
    throw new Error(`Unexpected external network call during tests: ${url.origin}`);
  }
  return realFetch(input, init);
}) as typeof fetch;
