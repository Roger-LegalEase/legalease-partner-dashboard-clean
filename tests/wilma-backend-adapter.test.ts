import { describe, expect, it, vi } from "vitest";
import { parseEnv } from "@/lib/env";
import {
  createBackendBillingPortal,
  createBackendCase,
  createBackendMonitoringCheckout,
  createBackendRecordCheckCheckout,
  evaluateBackendEligibility,
  getBackendUserAccount,
  listBackendCases,
  updateBackendCase,
  type WilmaBackendAdapterDependencies,
  type WilmaBackendCase
} from "@/wilma/adapters/backend";

const testEnv = parseEnv({
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
  CHECKR_NODE_CUSTOM_ID: "legal_ease_node",
  CHECKR_WORK_LOCATION_COUNTRY: "US",
  CHECKR_WORK_LOCATION_STATE: "NY",
  CHECKR_WORK_LOCATION_CITY: "New York"
});

const user = {
  id: "user_123",
  email: "customer@example.com",
  role: "CUSTOMER" as const
};

const existingCase: WilmaBackendCase = {
  id: "case_123",
  ownerId: user.id,
  status: "DRAFT",
  productKey: "record_check",
  displayName: "Record check",
  notes: null,
  createdAt: new Date("2026-05-13T12:00:00.000Z"),
  updatedAt: new Date("2026-05-13T12:00:00.000Z")
};

function createDependencies(): WilmaBackendAdapterDependencies {
  const db = {
    user: {
      findUnique: vi.fn(async () => ({
        id: user.id,
        email: user.email,
        name: "Customer Example",
        role: user.role,
        stripeCustomerId: "cus_123"
      }))
    },
    shieldCase: {
      create: vi.fn(async ({ data }) => ({
        ...existingCase,
        ...data,
        id: "case_created"
      })),
      findMany: vi.fn(async () => [existingCase]),
      findFirst: vi.fn(async () => existingCase),
      update: vi.fn(async ({ data }) => ({
        ...existingCase,
        ...data,
        updatedAt: new Date("2026-05-13T12:05:00.000Z")
      }))
    }
  };
  const stripeClient = {
    checkout: {
      sessions: {
        create: vi.fn(async () => ({ url: "https://checkout.stripe.test/session" }))
      }
    },
    billingPortal: {
      sessions: {
        create: vi.fn(async () => ({ url: "https://billing.stripe.test/session" }))
      }
    }
  };

  return {
    auth: {
      currentUser: vi.fn(async () => user),
      requireUser: vi.fn(async () => user)
    },
    configEnv: testEnv,
    db,
    stripeClient,
    now: () => new Date("2026-05-13T12:00:00.000Z")
  };
}

describe("Wilma backend adapter", () => {
  it("loads the current account through the existing user store", async () => {
    const dependencies = createDependencies();

    await expect(getBackendUserAccount(dependencies)).resolves.toMatchObject({
      id: user.id,
      email: user.email,
      stripeCustomerId: "cus_123"
    });
    expect(dependencies.db?.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: user.email }
      })
    );
  });

  it("creates and lists cases through the existing ShieldCase model", async () => {
    const dependencies = createDependencies();

    const createdCase = await createBackendCase(
      {
        productKey: "record_check",
        displayName: "New record check",
        notes: "Customer-provided notes"
      },
      dependencies
    );
    const cases = await listBackendCases(dependencies);

    expect(createdCase).toMatchObject({
      ownerId: user.id,
      displayName: "New record check"
    });
    expect(cases).toEqual([existingCase]);
    expect(dependencies.db?.shieldCase.findMany).toHaveBeenCalledWith({
      where: { ownerId: user.id },
      orderBy: { createdAt: "desc" }
    });
  });

  it("only updates cases owned by the current user", async () => {
    const dependencies = createDependencies();

    await expect(
      updateBackendCase("case_123", { status: "IN_REVIEW" }, dependencies)
    ).resolves.toMatchObject({
      id: "case_123",
      status: "IN_REVIEW"
    });
    expect(dependencies.db?.shieldCase.findFirst).toHaveBeenCalledWith({
      where: { id: "case_123", ownerId: user.id }
    });
  });

  it("reuses checkout services for record checks and monitoring", async () => {
    const dependencies = createDependencies();

    await expect(createBackendRecordCheckCheckout(dependencies)).resolves.toEqual({
      url: "https://checkout.stripe.test/session"
    });
    await expect(createBackendMonitoringCheckout("monitoring_annual", dependencies)).resolves.toEqual({
      url: "https://checkout.stripe.test/session"
    });

    expect(dependencies.stripeClient?.checkout.sessions.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        mode: "payment",
        customer_email: user.email,
        metadata: expect.objectContaining({ productKey: "record_check" })
      })
    );
    expect(dependencies.stripeClient?.checkout.sessions.create).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        mode: "subscription",
        customer_email: user.email,
        metadata: expect.objectContaining({ productKey: "monitoring_annual" })
      })
    );
  });

  it("reuses the existing Stripe customer for billing portal sessions", async () => {
    const dependencies = createDependencies();

    await expect(createBackendBillingPortal(dependencies)).resolves.toEqual({
      url: "https://billing.stripe.test/session"
    });
    expect(dependencies.stripeClient?.billingPortal.sessions.create).toHaveBeenCalledWith({
      customer: "cus_123",
      return_url: "http://localhost:3000/dashboard"
    });
  });

  it("evaluates eligibility through the Wilma backend scaffold", () => {
    const result = evaluateBackendEligibility(
      {
        applicant: {
          userId: user.id,
          state: "CA"
        },
        case: {
          sentenceCompleted: "yes",
          hasOpenCase: "no",
          hasOutstandingBalance: "no"
        }
      },
      createDependencies()
    );

    expect(result).toEqual({
      status: "likely_eligible",
      reasons: [],
      evaluatedAt: "2026-05-13T12:00:00.000Z"
    });
  });
});
