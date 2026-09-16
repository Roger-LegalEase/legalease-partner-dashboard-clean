import "server-only";

import Stripe from "stripe";

import {
  getBriefcaseItemForWebhook,
  updateBriefcasePacketStatusForWebhook
} from "@/lib/expungement-ai/briefcase";
import {
  CONSUMER_PACKET_CURRENCY,
  CONSUMER_PACKET_PRODUCT_ID,
  isAlreadyRecordedOutcome,
  isPaidOutcome,
  recordConsumerPacketPayment
} from "@/lib/expungement-ai/consumer-payment-authority";
import { scheduleConsumerCheckoutCompleted } from "@/lib/expungement-ai/checkout-analytics";
import { consumerMatterIdForItem, resolveConsumerPersonId } from "@/lib/expungement-ai/consumer-identity";
import { requestConsumerPacketRenderForWebhook } from "@/lib/expungement-ai/consumer-render-request";
import { type ConsumerCheckoutStatus } from "@/lib/expungement-ai/payment-adapter";
import {
  reconcileConsumerOrder,
  type ConsumerOrderBinding,
  type ReconciledConsumerOrder
} from "@/lib/expungement-ai/consumer-order-reconciliation";
import { getStripeServerClient } from "@/lib/stripe/server";
import { requireCurrentPacketVerification } from "@/lib/expungement-ai/packet-information";
import { readProtectedPacketArtifact } from "@/lib/expungement-ai/verification-cas";
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
    throw new ConsumerCheckoutEvidenceError("consumer user and Briefcase item metadata are required");
  }

  // A settled order is one Stripe collected on, or one an authorized discount
  // cleared to zero. Stripe reports the second as `no_payment_required` and
  // creates no PaymentIntent for it, so the old `!== "paid"` test dropped every
  // 100%-off order on the floor: the customer completed Checkout and nothing
  // was ever recorded or queued.
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    return "ignored";
  }

  if (session.client_reference_id !== briefcaseItemId) {
    throw new ConsumerCheckoutEvidenceError("Checkout Session reference does not match its Briefcase item");
  }
  if (session.mode !== "payment") {
    throw new ConsumerCheckoutEvidenceError(`Checkout Session mode ${String(session.mode)} is not payment`);
  }

  if ((session.currency ?? "").toLowerCase() !== CONSUMER_PACKET_CURRENCY) {
    throw new ConsumerCheckoutEvidenceError(`currency ${String(session.currency)} is not ${CONSUMER_PACKET_CURRENCY}`);
  }

  const item = await getBriefcaseItemForWebhook(userId, briefcaseItemId);
  if (!item) {
    throw new Error("Consumer checkout Briefcase item not found.");
  }

  await assertConsumerItemIsNotSponsored(item);
  const protectedArtifact = await readProtectedPacketArtifact({
    consumerAuthUserId: userId,
    briefcaseItemId: item.id
  });
  if (!protectedArtifact.ok) {
    throw new ConsumerCheckoutEvidenceError(`protected artifact authority is unavailable: ${protectedArtifact.reason}`);
  }
  if (item.paymentStatus === "paid" && protectedArtifact.value.status === "ready") {
    return "duplicate";
  }
  let verification;
  try {
    verification = await requireCurrentPacketVerification(userId, item);
  } catch {
    throw new ConsumerCheckoutEvidenceError("current final verification is required");
  }

  const person = await resolveConsumerPersonId(userId);
  if (!person.ok) {
    throw new ConsumerCheckoutEvidenceError(`canonical consumer person could not be resolved: ${person.reason}`);
  }
  const matterId = consumerMatterIdForItem(item.id);
  if (session.metadata.product_id !== CONSUMER_PACKET_PRODUCT_ID
    || session.metadata.person_id !== person.personId
    || session.metadata.matter_id !== matterId) {
    throw new ConsumerCheckoutEvidenceError("product, person or matter metadata does not match the canonical Briefcase binding");
  }
  if (!session.metadata.verification_hash || session.metadata.verification_hash !== verification.hash) {
    throw new ConsumerCheckoutEvidenceError("final verification changed after Checkout creation");
  }

  if (item.checkoutSessionId !== session.id) {
    throw new ConsumerCheckoutEvidenceError("Checkout Session does not match the persisted Briefcase binding");
  }

  // The event carries the Session but not its line items, so the regular price,
  // the quantity and the product cannot be read from it. Those are retrieved
  // from Stripe with the secret key and reconciled: an order is what the
  // provider says it is, and a signed event that merely asserts a total is not
  // evidence of what was sold.
  const order = await reconcileOrderFromStripe(session.id, {
    userId,
    briefcaseItemId: item.id,
    pathwayId: verification.snapshot.pathwayId,
    verificationHash: verification.hash
  });

  const claimedEvent = await claimProcessedStripeEvent(event.id, event.type, session.id);
  if (!claimedEvent) {
    // Duplicate delivery of this exact event id (Stripe retry, or the same event fanned
    // out to the canonical + legacy endpoints). Never regenerate a packet that is already
    // ready, but recover a paid-but-unfinished packet — e.g. the first delivery claimed the
    // event then failed before enqueue completed. finalizePaidCheckoutSession is
    // idempotent: the payment writer converges on already_paid and the Phase 53
    // queue converges on the same packet/input job, so no duplicate entitlement
    // or duplicate artifact can result.
    await finalizePaidCheckoutSession(userId, item, order, event.id, person.personId, matterId, verification.hash);
    return "recovered";
  }

  await finalizePaidCheckoutSession(userId, item, order, event.id, person.personId, matterId, verification.hash);
  return "processed";
}

async function finalizePaidCheckoutSession(
  userId: string,
  item: ConsumerBriefcaseItem,
  order: ReconciledConsumerOrder,
  providerEventId: string,
  personId: string,
  matterId: string,
  expectedVerificationHash: string
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
    // Collected, not quoted. A $50 packet with a $50 discount is $0 collected.
    amountCents: order.amountCollectedCents,
    regularPriceCents: order.regularPriceCents,
    discountCents: order.discountCents,
    paymentRequired: order.paymentRequired,
    currency: order.currency,
    paymentProvider: "stripe",
    providerEventId,
    checkoutSessionId: order.checkoutSessionId,
    paymentIntentId: order.paymentIntentId,
    receiptUrl: null,
    productId: CONSUMER_PACKET_PRODUCT_ID,
    personId,
    matterId,
    expectedVerificationHash,
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

  const render = await requestConsumerPacketRenderForWebhook({
    authUserId: userId,
    briefcaseItemId: item.id
  });
  if (render.status !== "queued") {
    throw new Error(`Durable consumer render job was not queued (${render.status}).`);
  }

  // Packet status is not payment authority. It follows the durable queue and
  // is never marked ready by the webhook itself; only validated stored bytes
  // may produce Ready.
  const statusUpdated = await updateBriefcasePacketStatusForWebhook(
    userId,
    item.id,
    "pending"
  );
  if (!statusUpdated) throw new Error("Unable to record the queued packet status.");

  // Authoritative paid signal: unlike the polled confirmation route, this fires even if the user
  // never returns to the site. Both producers are deduped to one funnel event by the shared
  // checkout-session seed. Scheduled after the response so analytics can never fail — or delay — a
  // paid reconciliation, and never before the payment state is durably recorded above.
  scheduleConsumerCheckoutCompleted({
    request: null,
    checkoutSessionId: order.checkoutSessionId,
    state: item.state ?? undefined,
    amountCents: order.amountCollectedCents,
    mode: "stripe"
  });

}

async function assertConsumerItemIsNotSponsored(item: ConsumerBriefcaseItem): Promise<void> {
  if (!item.sourceSessionId) return;
  const supabase = getSupabaseAdminClient();
  if (!supabase) throw new Error("Stripe webhook sponsorship authority is not configured.");

  const { data, error } = await supabase
    .from("screening_sessions")
    .select("session_id, flow_mode, partner_benefit_active, partner_slug")
    .eq("session_id", item.sourceSessionId)
    .maybeSingle<{
      session_id: string;
      flow_mode: string | null;
      partner_benefit_active: boolean | null;
      partner_slug: string | null;
    }>();

  if (error) throw new Error("Unable to verify Checkout sponsorship authority.");
  if (data?.flow_mode === "rcap" && data.partner_benefit_active === true && data.partner_slug) {
    throw new ConsumerCheckoutEvidenceError("partner-sponsored RCAP matters cannot enter the consumer payment writer");
  }
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
  // Settled covers both shapes: collected, or completed at no cost because a
  // discount cleared the total. Reporting only `paid` would leave a customer
  // who redeemed a 100%-off code looking unpaid on the return page forever.
  const noCost = session.payment_status === "no_payment_required";
  return {
    paid: session.payment_status === "paid" || (noCost && session.status === "complete"),
    mode: "stripe",
    checkoutSessionId: session.id,
    paymentIntentId: paymentIntentIdFor(session),
    amountCents: noCost ? 0 : session.amount_total ?? 0
  };
}

/**
 * Retrieve the Session from Stripe and reconcile it, or refuse.
 *
 * Retrieval is what makes this evidence rather than assertion: line items,
 * product, quantity and the applied discounts are expanded from the provider
 * with the secret key. Nothing here reads the webhook body's numbers.
 */
async function reconcileOrderFromStripe(
  checkoutSessionId: string,
  binding: ConsumerOrderBinding
): Promise<ReconciledConsumerOrder> {
  const stripe = getStripeServerClient();
  const retrieved = await stripe.checkout.sessions.retrieve(checkoutSessionId, {
    expand: ["line_items.data.price.product", "payment_intent", "discounts.promotion_code"]
  });
  const reconciliation = reconcileConsumerOrder(
    retrieved,
    retrieved.line_items?.data ?? [],
    binding
  );
  if (!reconciliation.ok) {
    throw new ConsumerCheckoutEvidenceError(reconciliation.reason);
  }
  return reconciliation.order;
}
