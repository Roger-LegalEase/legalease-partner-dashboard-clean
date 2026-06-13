import "server-only";

import Stripe from "stripe";

let stripeServerClient: Stripe | null = null;

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

  if (!stripeServerClient) {
    stripeServerClient = new Stripe(secretKey);
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

  return value;
}
