import "server-only";

import Stripe from "stripe";

import {
  getBriefcaseItemForWebhook,
  updateBriefcasePaymentMetadataForWebhook
} from "@/lib/expungement-ai/briefcase";
import { generatePaidConsumerPacket } from "@/lib/expungement-ai/packet-generation";
import { consumerPacketPriceCents, type ConsumerCheckoutStatus } from "@/lib/expungement-ai/payment-adapter";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

const CONSUMER_CHANNEL = "expungement_ai_consumer";
const CHECKOUT_EVENTS = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded"]);

export type ConsumerCheckoutReconciliationOutcome = "processed" | "duplicate" | "ignored";

export async function reconcileExpungementAiCheckoutEvent(
  event: Stripe.Event
): Promise<ConsumerCheckoutReconciliationOutcome> {
  if (!CHECKOUT_EVENTS.has(event.type)) return "ignored";

  if (await hasProcessedStripeEvent(event.id)) return "duplicate";

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.metadata?.channel !== CONSUMER_CHANNEL) {
    await recordProcessedStripeEvent(event.id, event.type, session.id);
    return "ignored";
  }

  const userId = session.metadata.user_id;
  const briefcaseItemId = session.metadata.briefcase_item_id;
  if (!userId || !briefcaseItemId) {
    return "ignored";
  }

  if (session.payment_status !== "paid") {
    return "ignored";
  }

  if (session.client_reference_id !== briefcaseItemId) {
    throw new Error("Consumer checkout session reference mismatch.");
  }

  const item = await getBriefcaseItemForWebhook(userId, briefcaseItemId);
  if (!item) {
    throw new Error("Consumer checkout Briefcase item not found.");
  }

  if (item.checkoutSessionId && item.checkoutSessionId !== session.id) {
    throw new Error("Consumer checkout session does not match Briefcase item.");
  }

  const updated = await updateBriefcasePaymentMetadataForWebhook(userId, item.id, {
    paymentStatus: "paid",
    paymentProvider: "stripe",
    checkoutSessionId: session.id,
    paymentIntentId: paymentIntentIdFor(session),
    amountCents: consumerPacketPriceCents,
    receiptUrl: undefined,
    packetStatus: item.packetStatus === "ready" ? "ready" : "pending"
  });

  if (!updated) {
    throw new Error("Unable to update consumer checkout payment state.");
  }

  await generatePaidConsumerPacket({
    userId,
    briefcaseItemId: item.id,
    webhookMode: true
  });

  await recordProcessedStripeEvent(event.id, event.type, session.id);
  return "processed";
}

function paymentIntentIdFor(session: Stripe.Checkout.Session): string | undefined {
  if (typeof session.payment_intent === "string") return session.payment_intent;
  return session.payment_intent?.id;
}

async function hasProcessedStripeEvent(stripeEventId: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error("Stripe webhook idempotency store is not configured.");

  const { data, error } = await supabase
    .from("processed_stripe_events")
    .select("stripe_event_id")
    .eq("stripe_event_id", stripeEventId)
    .maybeSingle();

  if (error) throw new Error("Unable to check Stripe webhook idempotency.");
  return Boolean(data);
}

async function recordProcessedStripeEvent(stripeEventId: string, eventType: string, relatedObjectId?: string) {
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error("Stripe webhook idempotency store is not configured.");

  const { error } = await supabase
    .from("processed_stripe_events")
    .insert({
      stripe_event_id: stripeEventId,
      event_type: eventType,
      related_object_id: relatedObjectId ?? null
    });

  if (error && error.code !== "23505") {
    throw new Error("Unable to record processed Stripe webhook event.");
  }
}

export function isExpungementAiCheckoutEvent(event: Stripe.Event): boolean {
  return CHECKOUT_EVENTS.has(event.type);
}

export function consumerCheckoutStatusFromSession(session: Stripe.Checkout.Session): ConsumerCheckoutStatus {
  return {
    paid: session.payment_status === "paid",
    mode: "stripe",
    checkoutSessionId: session.id,
    paymentIntentId: paymentIntentIdFor(session),
    amountCents: consumerPacketPriceCents
  };
}
