import { NextResponse } from "next/server";
import Stripe from "stripe";
import { reconcileStripeInvoiceEvent } from "@/lib/partners/billing";
import { getStripeServerClient, getStripeWebhookSecret, isStripeConfigurationError } from "@/lib/stripe/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let webhookSecret: string;
  let stripe: Stripe;

  try {
    webhookSecret = getStripeWebhookSecret();
    stripe = getStripeServerClient();
  } catch (error) {
    if (isStripeConfigurationError(error)) {
      console.error("Stripe webhook configuration error", { envVar: error.envVar });
    }

    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
  }

  try {
    const outcome = await reconcileStripeInvoiceEvent(event);
    return NextResponse.json({ received: true, outcome });
  } catch {
    return NextResponse.json({ error: "Unable to process Stripe webhook." }, { status: 500 });
  }
}
