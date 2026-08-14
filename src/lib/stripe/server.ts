import "server-only";

import Stripe from "stripe";

import { isProductionRuntimeEnvironment, resolveDeploymentEnvironment } from "@/lib/server-runtime-environment";

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

export function getStripeWebhookSecret(
  envVar: "STRIPE_WEBHOOK_SECRET" | "STRIPE_LEGACY_WEBHOOK_SECRET" = "STRIPE_WEBHOOK_SECRET"
): string {
  return getRequiredStripeEnv(envVar, "whsec_");
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

  if (envVar === "STRIPE_SECRET_KEY") {
    // Three-way, because two-way was the bug. The old rule asked only "is this
    // production?" via `VERCEL_ENV === "production" || NODE_ENV === "production"`,
    // and on Vercel EVERY optimized Next.js build sets NODE_ENV=production —
    // Preview included. So a Preview deployment was classified production and a
    // sandbox key was refused with "must not use a test key in production",
    // which surfaced to the participant as a generic 503.
    const environment = resolveDeploymentEnvironment();

    if (environment === "production") {
      if (value.startsWith("sk_test_")) {
        throw new StripeConfigurationError(`${envVar} must not use a test key in production.`, envVar);
      }
      if (!value.startsWith("sk_live_")) {
        throw new StripeConfigurationError(`${envVar} must use a live key in production.`, envVar);
      }
    } else if (environment === "preview" || environment === "development") {
      // The symmetric rule, and it is the one that matters for acceptance: a
      // LIVE key must never be reachable from a non-production deployment. A
      // hosted acceptance environment that could charge a real card is a worse
      // failure than one that cannot charge at all.
      if (value.startsWith("sk_live_")) {
        throw new StripeConfigurationError(`${envVar} must not use a live key outside production.`, envVar);
      }
      if (!value.startsWith("sk_test_")) {
        throw new StripeConfigurationError(`${envVar} must use a test key outside production.`, envVar);
      }
    } else {
      // Contradictory, malformed, unsupported or absent. Refuse to initialise
      // Stripe at all rather than pick a key policy for a runtime this process
      // cannot identify.
      throw new StripeConfigurationError(
        `${envVar} cannot be validated because the deployment environment could not be identified.`,
        envVar
      );
    }
  }

  return value;
}

/**
 * True for a real production runtime and for one that cannot be identified.
 * Unchanged in meaning for its callers — the dry-run gate must stay closed when
 * the runtime is unknown — but it no longer treats every Vercel build as
 * production.
 */
export function isProductionRuntime(): boolean {
  return isProductionRuntimeEnvironment();
}
