import Stripe from "stripe";

let stripeServerClient: Stripe | null = null;

export function getStripeServerClient(): Stripe {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("STRIPE_SECRET_KEY is required to create Stripe Checkout sessions.");
  }

  if (!stripeServerClient) {
    stripeServerClient = new Stripe(secretKey);
  }

  return stripeServerClient;
}
