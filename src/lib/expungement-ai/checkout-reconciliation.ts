import "server-only";

import Stripe from "stripe";

import {
  getBriefcaseItemForWebhook,
  updateBriefcasePaymentMetadataForWebhook
} from "@/lib/expungement-ai/briefcase";
import { recordConsumerCheckoutCompleted } from "@/lib/expungement-ai/checkout-analytics";
import { generatePaidConsumerPacket } from "@/lib/expungement-ai/packet-generation";
import { consumerPacketPriceCents, type ConsumerCheckoutStatus } from "@/lib/expungement-ai/payment-adapter";
import type { ConsumerBriefcaseItem } from "@/lib/expungement-ai/types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

const CONSUMER_CHANNEL = "expungement_ai_consumer";
const CHECKOUT_EVENTS = new Set(["checkout.session.completed", "checkout.session.async_payment_succeeded"]);

export type ConsumerCheckoutReconciliationOutcome = "processed" | "recovered" | "duplicate" | "ignored";

export async function reconcileExpungementAiCheckoutEvent(
  event: Stripe.Event
): Promise<ConsumerCheckoutReconciliationOutcome> {
  if (!CHECKOUT_EVENTS.has(event.type)) return "ignored";

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.metadata?.channel !== CONSUMER_CHANNEL) {
    await claimProcessedStripeEvent(event.id, event.type, session.id);
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

  const claimedEvent = await claimProcessedStripeEvent(event.id, event.type, session.id);
  if (!claimedEvent) {
    // Duplicate delivery of this exact event id (Stripe retry, or the same event fanned
    // out to the canonical + legacy endpoints). Never regenerate a packet that is already
    // ready, but recover a paid-but-unfinished packet — e.g. the first delivery claimed the
    // event then failed mid-generation. finalizePaidCheckoutSession is fully idempotent:
    // the metadata update is keyed by (userId, itemId) and generation is re-entrant, so no
    // duplicate charge or duplicate artifact can result.
    if (item.packetStatus === "ready") return "duplicate";
    await finalizePaidCheckoutSession(userId, item, session);
    return "recovered";
  }

  await finalizePaidCheckoutSession(userId, item, session);
  return "processed";
}

async function finalizePaidCheckoutSession(
  userId: string,
  item: ConsumerBriefcaseItem,
  session: Stripe.Checkout.Session
): Promise<void> {
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

  // Authoritative paid signal: unlike the polled confirmation route, this fires even if the user
  // never returns to the site. Both producers are deduped to one funnel event by the shared
  // checkout-session seed. Fire-and-forget — analytics must never fail a paid reconciliation, and it
  // must not run before the payment state is durably recorded above.
  void recordConsumerCheckoutCompleted({
    request: null,
    checkoutSessionId: session.id,
    state: item.state ?? undefined,
    amountCents: consumerPacketPriceCents,
    mode: "stripe"
  });

  await generatePaidConsumerPacket({
    userId,
    briefcaseItemId: item.id,
    webhookMode: true
  });
}

function paymentIntentIdFor(session: Stripe.Checkout.Session): string | undefined {
  if (typeof session.payment_intent === "string") return session.payment_intent;
  return session.payment_intent?.id;
}

async function claimProcessedStripeEvent(stripeEventId: string, eventType: string, relatedObjectId?: string) {
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

  return !error;
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
