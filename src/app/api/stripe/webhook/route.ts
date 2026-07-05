import { NextResponse } from "next/server";
import Stripe from "stripe";
import {
  isExpungementAiCheckoutEvent,
  reconcileExpungementAiCheckoutEvent
} from "@/lib/expungement-ai/checkout-reconciliation";
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
    console.warn("Stripe webhook rejected invalid signature", {
      route: "/api/stripe/webhook",
      hasSignature: true
    });
    return NextResponse.json({ error: "Invalid Stripe webhook signature." }, { status: 400 });
  }

  try {
    if (isExpungementAiCheckoutEvent(event)) {
      const outcome = await reconcileExpungementAiCheckoutEvent(event);
      console.info("Stripe webhook processed", {
        route: "/api/stripe/webhook",
        eventId: event.id,
        eventType: event.type,
        flow: "expungement_ai_consumer_checkout",
        outcome
      });
      return NextResponse.json({ received: true, outcome });
    }

    const outcome = await reconcileStripeInvoiceEvent(event);
    console.info("Stripe webhook processed", {
      route: "/api/stripe/webhook",
      eventId: event.id,
      eventType: event.type,
      flow: "partner_invoice",
      outcome
    });
    return NextResponse.json({ received: true, outcome });
  } catch (error) {
    console.error("Stripe webhook processing failed", {
      route: "/api/stripe/webhook",
      eventId: event.id,
      eventType: event.type,
      message: error instanceof Error ? error.message : "Unknown webhook processing error"
    });
    return NextResponse.json({ error: "Unable to process Stripe webhook." }, { status: 500 });
  }
}
