import "server-only";

import Stripe from "stripe";

let stripeServerClient: Stripe | null = null;
let stripeServerClientKey: string | null = null;

export const stripeClientErrorMessage = "Stripe billing is not available. Contact LegalEase support.";

export class StripeConfigurationError extends Error {
  constructor(
    message: string,
    readonly envVar: string
  ) {
    super(message);
    this.name = "StripeConfigurationError";
  }
}

export function getStripeServerClient(): Stripe {
  const secretKey = getRequiredStripeEnv("STRIPE_SECRET_KEY", "sk_");

  if (!stripeServerClient || stripeServerClientKey !== secretKey) {
    stripeServerClient = new Stripe(secretKey);
    stripeServerClientKey = secretKey;
  }

  return stripeServerClient;
}

export function getStripeWebhookSecret(): string {
  return getRequiredStripeEnv("STRIPE_WEBHOOK_SECRET", "whsec_");
}

export function isStripeConfigurationError(error: unknown): error is StripeConfigurationError {
  return error instanceof StripeConfigurationError;
}

function getRequiredStripeEnv(envVar: string, requiredPrefix: string): string {
  const value = process.env[envVar]?.trim();

  if (!value) {
    throw new StripeConfigurationError(`${envVar} is required.`, envVar);
  }

  if (!value.startsWith(requiredPrefix)) {
    throw new StripeConfigurationError(`${envVar} has an invalid Stripe value.`, envVar);
  }

  if (envVar === "STRIPE_SECRET_KEY" && isProductionRuntime()) {
    if (value.startsWith("sk_test_")) {
      throw new StripeConfigurationError(`${envVar} must not use a test key in production.`, envVar);
    }

    if (!value.startsWith("sk_live_")) {
      throw new StripeConfigurationError(`${envVar} must use a live key in production.`, envVar);
    }
  }

  return value;
}

export function isProductionRuntime(): boolean {
  return process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
}
