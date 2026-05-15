import type { AppUser } from "@/lib/auth";
import type { Env } from "@/lib/env";
import { env } from "@/lib/env";
import {
  documentPrepProductKey,
  getMonitoringPriceId,
  type MonitoringPlanKey,
  recordCheckProductKey
} from "@/lib/billing/products";
import { getStripe } from "@/lib/billing/stripe";
import { prisma } from "@/lib/prisma";

const recordCheckAmountCents = 19_900;
const documentPrepAmountCents = 5_000;

type CheckoutSession = {
  url: string | null;
};

export type CheckoutStripeClient = {
  checkout: {
    sessions: {
      create(args: unknown): Promise<CheckoutSession>;
    };
  };
  billingPortal: {
    sessions: {
      create(args: unknown): Promise<CheckoutSession>;
    };
  };
};

export type BillingPortalDatabase = {
  user: {
    findUnique(args: {
      where: { email: string };
      select: { stripeCustomerId: true };
    }): Promise<{ stripeCustomerId: string | null } | null>;
  };
};

export type CheckoutServiceDependencies = {
  configEnv?: Env;
  stripeClient?: CheckoutStripeClient;
  db?: BillingPortalDatabase;
};

export async function createRecordCheckCheckoutSession(
  user: AppUser,
  dependencies: CheckoutServiceDependencies = {}
): Promise<CheckoutSession> {
  const configEnv = dependencies.configEnv ?? env;
  assertCheckoutEnv(configEnv, ["STRIPE_PRICE_RECORD_CHECK"]);
  const stripeClient = dependencies.stripeClient ?? getStripe();

  return stripeClient.checkout.sessions.create({
    mode: "payment",
    customer_email: user.email,
    line_items: [
      {
        price: configEnv.STRIPE_PRICE_RECORD_CHECK,
        quantity: 1
      }
    ],
    metadata: {
      userId: user.id,
      email: user.email,
      productKey: recordCheckProductKey,
      expectedAmountCents: String(recordCheckAmountCents)
    },
    success_url: `${configEnv.APP_BASE_URL}/dashboard?checkout=started`,
    cancel_url: `${configEnv.APP_BASE_URL}/dashboard?checkout=canceled`
  });
}

export async function createDocumentPrepCheckoutSession(
  input: {
    email: string;
    userId?: string;
    wilmaSessionId: string;
    wilmaDecisionId: string;
  },
  dependencies: CheckoutServiceDependencies = {}
): Promise<CheckoutSession> {
  const configEnv = dependencies.configEnv ?? env;
  assertCheckoutEnv(configEnv, ["STRIPE_PRICE_RECORD_CHECK"]);
  const stripeClient = dependencies.stripeClient ?? getStripe();

  return stripeClient.checkout.sessions.create({
    mode: "payment",
    customer_email: input.email,
    line_items: [
      {
        price: configEnv.STRIPE_PRICE_RECORD_CHECK,
        quantity: 1
      }
    ],
    metadata: {
      userId: input.userId ?? "",
      email: input.email,
      productKey: documentPrepProductKey,
      expectedAmountCents: String(documentPrepAmountCents),
      wilmaSessionId: input.wilmaSessionId,
      wilmaDecisionId: input.wilmaDecisionId
    },
    success_url: `${configEnv.APP_BASE_URL}/dashboard?checkout=document-prep-started`,
    cancel_url: `${configEnv.APP_BASE_URL}/dashboard?checkout=canceled`
  });
}

export async function createMonitoringCheckoutSession(
  user: AppUser,
  planKey: MonitoringPlanKey,
  dependencies: CheckoutServiceDependencies = {}
): Promise<CheckoutSession> {
  const configEnv = dependencies.configEnv ?? env;
  assertCheckoutEnv(configEnv, [
    "STRIPE_PRICE_MONITORING_LITE_MONTHLY",
    "STRIPE_PRICE_MONITORING_LITE_ANNUAL",
    "STRIPE_PRICE_MONITORING_PLUS_MONTHLY"
  ]);
  const stripeClient = dependencies.stripeClient ?? getStripe();

  return stripeClient.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email,
    line_items: [
      {
        price: getMonitoringPriceId(planKey, configEnv),
        quantity: 1
      }
    ],
    metadata: {
      userId: user.id,
      email: user.email,
      productKey: planKey
    },
    subscription_data: {
      metadata: {
        userId: user.id,
        email: user.email,
        productKey: planKey
      }
    },
    success_url: `${configEnv.APP_BASE_URL}/dashboard?checkout=started`,
    cancel_url: `${configEnv.APP_BASE_URL}/dashboard?checkout=canceled`
  });
}

export async function createBillingPortalSession(
  user: AppUser,
  dependencies: CheckoutServiceDependencies = {}
): Promise<CheckoutSession | null> {
  const configEnv = dependencies.configEnv ?? env;
  const stripeClient = dependencies.stripeClient ?? getStripe();
  const db = dependencies.db ?? prisma;
  const dbUser = await db.user.findUnique({
    where: { email: user.email },
    select: { stripeCustomerId: true }
  });

  if (!dbUser?.stripeCustomerId) {
    return null;
  }

  return stripeClient.billingPortal.sessions.create({
    customer: dbUser.stripeCustomerId,
    return_url: `${configEnv.APP_BASE_URL}/dashboard`
  });
}

function assertCheckoutEnv(configEnv: Env, keys: Array<keyof Env>): void {
  const missing = keys.filter((key) => !configEnv[key]);
  if (missing.length > 0) {
    throw new Error(`Stripe checkout is not configured: missing ${missing.join(", ")}.`);
  }
}
