import { describe, expect, it } from "vitest";
import { createProductConfig } from "@/lib/product-config";
import { parseEnv } from "@/lib/env";

const env = parseEnv({
  DATABASE_URL: "postgresql://postgres:postgres@localhost:5432/legalease_recordshield",
  NEXT_PUBLIC_APP_URL: "http://localhost:3000",
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
  CHECKR_WORK_LOCATION_COUNTRY: "US",
  CHECKR_WORK_LOCATION_STATE: "NY",
  CHECKR_WORK_LOCATION_CITY: "New York"
});

describe("createProductConfig", () => {
  it("maps env prices into product config", () => {
    const config = createProductConfig(env);

    expect(config.basic).toMatchObject({
      key: "basic",
      name: "RecordShield Basic",
      priceCents: 4900,
      formattedPrice: "$49"
    });
    expect(config.family.formattedPrice).toBe("$99");
    expect(config.business.formattedPrice).toBe("$199");
  });
});
