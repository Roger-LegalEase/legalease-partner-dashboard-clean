import "server-only";

import { NextResponse } from "next/server";
import Stripe from "stripe";

import {
  isExpungementAiCheckoutEvent,
  reconcileExpungementAiCheckoutEvent
} from "@/lib/expungement-ai/checkout-reconciliation";
import { reconcileStripeInvoiceEvent } from "@/lib/partners/billing";
import { getStripeServerClient, getStripeWebhookSecret, isStripeConfigurationError } from "@/lib/stripe/server";

export type StripeWebhookRoute = "/api/stripe/webhook" | "/api/method/expungement.api.payment.stripe_webhook";
export type StripeWebhookSecretEnvVar = "STRIPE_WEBHOOK_SECRET" | "STRIPE_LEGACY_WEBHOOK_SECRET";

export async function handleStripeWebhookPost(
  request: Request,
  {
    route,
    secretEnvVar,
    logLegacyDiagnostics = false
  }: {
    route: StripeWebhookRoute;
    secretEnvVar: StripeWebhookSecretEnvVar;
    logLegacyDiagnostics?: boolean;
  }
) {
  let endpointSecret: string;
  let stripe: Stripe;

  try {
    endpointSecret = getStripeWebhookSecret(secretEnvVar);
    stripe = getStripeServerClient();
  } catch (error) {
    if (isStripeConfigurationError(error)) {
      console.error("Stripe webhook configuration error", { route, envVar: error.envVar });
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
    if (logLegacyDiagnostics) {
      const legacySecret = process.env.STRIPE_LEGACY_WEBHOOK_SECRET;
      console.info("Stripe legacy webhook diagnostics", {
        route: "legacy",
        hasSignatureHeader: Boolean(signature),
        hasLegacySecret: Boolean(legacySecret),
        legacySecretPrefix: legacySecret?.slice(0, 6),
        legacySecretLength: legacySecret?.length,
        rawBodyLength: rawBody.length
      });
    }

    event = stripe.webhooks.constructEvent(rawBody, signature, endpointSecret);
  } catch {
    console.warn("Stripe webhook rejected invalid payload or signature", {
      route,
      hasSignature: true
    });
    return NextResponse.json({ error: "Invalid Stripe webhook payload or signature." }, { status: 400 });
  }

  return handleVerifiedStripeWebhookEvent(event, route);
}

export async function handleVerifiedStripeWebhookEvent(event: Stripe.Event, route: StripeWebhookRoute) {
  try {
    if (isExpungementAiCheckoutEvent(event)) {
      const outcome = await reconcileExpungementAiCheckoutEvent(event);
      console.info("Stripe webhook processed", {
        route,
        eventId: event.id,
        eventType: event.type,
        flow: "expungement_ai_consumer_checkout",
        outcome
      });
      return NextResponse.json({ received: true, outcome });
    }

    const outcome = await reconcileStripeInvoiceEvent(event);
    console.info("Stripe webhook processed", {
      route,
      eventId: event.id,
      eventType: event.type,
      flow: "partner_invoice",
      outcome
    });
    return NextResponse.json({ received: true, outcome });
  } catch (error) {
    console.error("Stripe webhook processing failed", {
      route,
      eventId: event.id,
      eventType: event.type,
      message: error instanceof Error ? error.message : "Unknown webhook processing error"
    });
    return NextResponse.json({ error: "Unable to process Stripe webhook." }, { status: 500 });
  }
}
