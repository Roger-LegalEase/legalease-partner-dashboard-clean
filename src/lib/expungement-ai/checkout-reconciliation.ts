import "server-only";

import Stripe from "stripe";

import {
  getBriefcaseItemForWebhook,
  updateBriefcasePacketStatusForWebhook
} from "@/lib/expungement-ai/briefcase";
import {
  CONSUMER_PACKET_CURRENCY,
  isAlreadyRecordedOutcome,
  isPaidOutcome,
  recordConsumerPacketPayment
} from "@/lib/expungement-ai/consumer-payment-authority";
import { scheduleConsumerCheckoutCompleted } from "@/lib/expungement-ai/checkout-analytics";
import { generatePaidConsumerPacket } from "@/lib/expungement-ai/packet-generation";
import { consumerPacketPriceCents, type ConsumerCheckoutStatus } from "@/lib/expungement-ai/payment-adapter";
import type { ConsumerBriefcaseItem } from "@/lib/expungement-ai/types";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * A rejected provider event, distinguishable from an ordinary processing fault.
 *
 * The webhook returns 500 for both, so Stripe retries either way, but the type
 * makes "we refused this evidence" auditable separately from "we fell over".
 */
export class ConsumerCheckoutEvidenceError extends Error {
  constructor(readonly detail: string) {
    super(`Consumer checkout evidence rejected: ${detail}`);
    this.name = "ConsumerCheckoutEvidenceError";
  }
}

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

  // Amount and currency come from the signed event, never from the constant we
  // happen to charge. Reading `consumerPacketPriceCents` here instead would make
  // the check tautological: a session for $5 would be recorded as $50 because
  // that is what the code assumed it must be.
  if (session.amount_total !== consumerPacketPriceCents) {
    throw new ConsumerCheckoutEvidenceError(
      `amount_total ${String(session.amount_total)} is not ${consumerPacketPriceCents}`
    );
  }
  if ((session.currency ?? "").toLowerCase() !== CONSUMER_PACKET_CURRENCY) {
    throw new ConsumerCheckoutEvidenceError(`currency ${String(session.currency)} is not ${CONSUMER_PACKET_CURRENCY}`);
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
    await finalizePaidCheckoutSession(userId, item, session, event.id);
    return "recovered";
  }

  await finalizePaidCheckoutSession(userId, item, session, event.id);
  return "processed";
}

async function finalizePaidCheckoutSession(
  userId: string,
  item: ConsumerBriefcaseItem,
  session: Stripe.Checkout.Session,
  providerEventId: string
): Promise<void> {
  // The payment fact goes through the server-only writer, never through a
  // column update. Phase 52 revoked the application's privilege to set these
  // columns precisely because holding it is what let a payer forge them, and
  // the `paid_requires_server_evidence` constraint refuses a paid row that
  // carries no provider event and no named server authority — which a direct
  // update cannot supply.
  const recorded = await recordConsumerPacketPayment({
    briefcaseItemId: item.id,
    paymentStatus: "paid",
    amountCents: session.amount_total,
    currency: session.currency,
    paymentProvider: "stripe",
    providerEventId,
    checkoutSessionId: session.id,
    paymentIntentId: paymentIntentIdFor(session) ?? null,
    receiptUrl: null,
    authority: "server_webhook",
    recordedBy: "expungement_ai_stripe_webhook"
  });

  // A replayed provider event is a success for this caller: the payment is
  // already on the row and no second entitlement was created. Anything else
  // that is not a fresh paid record must stop the journey here.
  if (!isPaidOutcome(recorded.outcome) && !isAlreadyRecordedOutcome(recorded.outcome)) {
    throw new ConsumerCheckoutEvidenceError(
      `payment writer refused the event: ${recorded.outcome}${recorded.reason ? ` (${recorded.reason})` : ""}`
    );
  }

  // Packet status is not a payment fact and is still the application's to set.
  await updateBriefcasePacketStatusForWebhook(
    userId,
    item.id,
    item.packetStatus === "ready" ? "ready" : "pending"
  );

  // Authoritative paid signal: unlike the polled confirmation route, this fires even if the user
  // never returns to the site. Both producers are deduped to one funnel event by the shared
  // checkout-session seed. Scheduled after the response so analytics can never fail — or delay — a
  // paid reconciliation, and never before the payment state is durably recorded above.
  scheduleConsumerCheckoutCompleted({
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
