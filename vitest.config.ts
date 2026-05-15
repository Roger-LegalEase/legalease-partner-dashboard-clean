import { defineConfig } from "vitest/config";

const srcPath = new URL("./src", import.meta.url).pathname;
const serverOnlyFixturePath = new URL("./tests/fixtures/server-only-empty.ts", import.meta.url).pathname;

export default defineConfig({
	  test: {
	    setupFiles: ["tests/setup/vitest.setup.ts"],
	    pool: "forks",
	    fileParallelism: false,
	    testTimeout: 10_000,
	    hookTimeout: 10_000,
	    env: {
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
      STRIPE_PRICE_MONITORING_MONTHLY: "price_monitoring_monthly",
      STRIPE_PRICE_MONITORING_ANNUAL: "price_monitoring_annual",
      STRIPE_PRICE_MONITORING_PLUS_MONTHLY: "price_monitoring_plus_monthly",
      CHECKR_API_KEY: "checkr_test_123",
      CHECKR_WEBHOOK_SECRET: "checkr_webhook_test_123",
      CHECKR_BASE_URL: "https://api.checkr-staging.com/v1",
      CHECKR_PACKAGE_SLUG: "recordshield_background_check",
      CHECKR_NODE_CUSTOM_ID: "legal_ease_node",
      CHECKR_WORK_LOCATION_COUNTRY: "US",
      CHECKR_WORK_LOCATION_STATE: "NY",
      CHECKR_WORK_LOCATION_CITY: "New York",
      OPENAI_API_KEY: "openai_test_123"
    },
    environment: "node",
    globals: false,
    include: [
	      "tests/analytics.test.ts",
	      "tests/env.test.ts",
	      "tests/product-config.test.ts",
	      "tests/checkr.test.ts",
	      "tests/provider-runtime-guards.test.ts",
	      "tests/beta-launch.test.ts",
	      "tests/admin-case-actions.test.ts",
      "tests/admin-ops.test.ts",
      "tests/document-prep-handoff.test.ts",
      "tests/document-prep-stripe-webhook.test.ts",
      "tests/expungement-readiness.test.ts",
      "tests/monitoring.test.ts",
      "tests/security.test.ts",
      "tests/state-rule-tables.test.ts",
      "tests/stripe-webhooks.test.ts",
      "tests/checkr-webhooks.test.ts",
      "tests/staging-e2e.test.ts",
      "tests/wilma-chat-orchestrator.test.ts",
      "tests/wilma-chat-route.test.ts",
      "tests/wilma-analytics-events.test.ts",
      "tests/wilma-admin-view.test.ts",
      "tests/wilma-admin-access.test.ts",
      "tests/wilma-abuse-controls.test.ts",
      "tests/wilma-session-limits.test.ts",
      "tests/wilma-checkout-gating.test.ts",
      "tests/wilma-checkout-route.test.ts",
      "tests/wilma-email-gate.test.ts",
      "tests/wilma-risk-flags.test.ts",
      "tests/wilma-order-fulfillment.test.ts",
      "tests/wilma-order-idempotency.test.ts",
      "tests/wilma-payment-success.test.ts",
      "tests/wilma-document-prep-chat.test.ts",
      "tests/wilma-launch-access.test.ts",
      "tests/wilma-launch-config-route.test.ts"
    ]
  },
	  resolve: {
	    alias: {
	      "@": srcPath,
	      "server-only": serverOnlyFixturePath
	    }
	  }
});
