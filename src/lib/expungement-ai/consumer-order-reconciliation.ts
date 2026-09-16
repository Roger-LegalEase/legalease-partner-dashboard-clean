import type Stripe from "stripe";

import {
  CONSUMER_PACKET_CURRENCY,
  CONSUMER_PACKET_PRICE_CENTS,
  CONSUMER_PACKET_PRODUCT_ID
} from "@/lib/expungement-ai/consumer-payment-authority";

/**
 * What a consumer packet order actually is, read from Stripe and nowhere else.
 *
 * The old rule was a single equality: `amount_total === 5000`. That rule was
 * correct only because no discount could exist. Now that customers may redeem
 * Stripe promotion codes, the amount due is a *derived* fact — list price minus
 * the discount the provider applied — and the thing worth checking is that the
 * derivation reconciles, not that the total is one particular number.
 *
 * So this module answers one question: does this Checkout Session describe our
 * product, bound to this matter and owner, at our regular price, reduced only
 * by a discount the provider itself applied, arriving at the amount Stripe says
 * is due? A session that cannot answer yes is refused with a reason, exactly as
 * a wrong-amount session was refused before.
 *
 * Two rules are worth stating because they are easy to lose:
 *
 *   - The regular price is still fixed. A discount changes what is collected;
 *     it never changes what the packet costs, and it never changes eligibility,
 *     ownership, verification or access. A session whose list price is not the
 *     regular price is not our product being discounted, it is a different
 *     order, and it is refused.
 *
 *   - Nothing here reads a request body. Every field comes from a Session the
 *     caller retrieved from Stripe with the secret key, or from a signature
 *     verified event. A client-supplied amount, discount claim or payment
 *     status has no path into this function.
 */

export type ConsumerOrderBinding = {
  userId: string;
  briefcaseItemId: string;
  pathwayId: string;
  verificationHash: string;
};

export type ReconciledConsumerOrder = {
  /** The undiscounted price of the packet, which a discount never changes. */
  regularPriceCents: number;
  /** What the provider itself took off, never what a client claimed. */
  discountCents: number;
  /** What Stripe says is due after the provider applied the discount. */
  amountDueCents: number;
  /** What Stripe reports as actually collected. Zero on a no-cost order. */
  amountCollectedCents: number;
  currency: typeof CONSUMER_PACKET_CURRENCY;
  productId: typeof CONSUMER_PACKET_PRODUCT_ID;
  quantity: number;
  /**
   * False only when an authorized discount brought the total to zero. Stripe
   * creates no PaymentIntent for such a session and reports
   * `payment_status: "no_payment_required"`, so a caller that waits for a
   * charge on one of these waits forever.
   */
  paymentRequired: boolean;
  /** True once the order is settled: paid, or completed at no cost. */
  settled: boolean;
  checkoutSessionId: string;
  paymentIntentId: string | null;
  /**
   * Provider identities of the promotion codes Stripe applied, for the audit
   * trail. Ids only: a code's human-facing text is not evidence of anything.
   */
  appliedPromotionCodeIds: readonly string[];
};

export type ConsumerOrderReconciliation =
  | { ok: true; order: ReconciledConsumerOrder }
  | { ok: false; reason: string };

const PACKET_PRODUCT_NAME = "Expungement.ai self-help packet";

function productNameOf(line: Stripe.LineItem | undefined): string | null {
  const product = line?.price?.product;
  if (!product || typeof product === "string" || "deleted" in product) return null;
  return product.name ?? null;
}

function paymentIntentIdOf(session: Stripe.Checkout.Session): string | null {
  const intent = session.payment_intent;
  if (!intent) return null;
  return typeof intent === "string" ? intent : intent.id;
}

function promotionCodeIdsOf(session: Stripe.Checkout.Session): string[] {
  const discounts = session.discounts ?? [];
  const ids: string[] = [];
  for (const discount of discounts) {
    const promotionCode = discount?.promotion_code;
    if (!promotionCode) continue;
    ids.push(typeof promotionCode === "string" ? promotionCode : promotionCode.id);
  }
  return ids;
}

/**
 * `lineItems` is passed separately because a retrieved Session carries them
 * only when the caller expanded them, and a silently missing line item must be
 * a refusal rather than an empty list that happens to satisfy nothing.
 */
export function reconcileConsumerOrder(
  session: Stripe.Checkout.Session,
  lineItems: readonly Stripe.LineItem[],
  binding: ConsumerOrderBinding,
  options: {
    /**
     * False while the session is still open, where the customer has not paid
     * and may still enter a code. Structure, product, bindings and the
     * arithmetic are checked either way; only settlement is deferred.
     */
    expectSettled?: boolean;
  } = {}
): ConsumerOrderReconciliation {
  const expectSettled = options.expectSettled ?? true;
  const refuse = (reason: string): ConsumerOrderReconciliation => ({ ok: false, reason });

  if (session.mode !== "payment") return refuse(`mode ${session.mode} is not payment`);
  if (session.client_reference_id !== binding.briefcaseItemId) {
    return refuse("client_reference_id is not this briefcase item");
  }
  if (session.metadata?.channel !== "expungement_ai_consumer") {
    return refuse("channel metadata is not the consumer channel");
  }
  if (session.metadata?.user_id !== binding.userId) return refuse("user_id metadata does not match the owner");
  if (session.metadata?.briefcase_item_id !== binding.briefcaseItemId) {
    return refuse("briefcase_item_id metadata does not match the matter");
  }
  if (session.metadata?.pathway_id !== binding.pathwayId) return refuse("pathway_id metadata does not match");
  if (session.metadata?.verification_hash !== binding.verificationHash) {
    return refuse("verification_hash metadata is not the current verification");
  }

  if ((session.currency ?? "").toLowerCase() !== CONSUMER_PACKET_CURRENCY) {
    return refuse(`currency ${session.currency ?? "(absent)"} is not ${CONSUMER_PACKET_CURRENCY}`);
  }
  if (lineItems.length !== 1) return refuse(`expected exactly one line item, found ${lineItems.length}`);

  const line = lineItems[0];
  if (line.quantity !== 1) return refuse(`quantity ${line.quantity ?? "(absent)"} is not 1`);
  if (productNameOf(line) !== PACKET_PRODUCT_NAME) return refuse("the line item is not the packet product");
  if ((line.currency ?? "").toLowerCase() !== CONSUMER_PACKET_CURRENCY) {
    return refuse("the line item currency is not usd");
  }

  // The regular price, read two independent ways. `amount_subtotal` is what
  // Stripe charged before discounts; `unit_amount * quantity` is what the price
  // object says the packet costs. A release that changed one without the other
  // would be a pricing bug, and this refuses rather than picking a winner.
  const unitAmount = line.price?.unit_amount ?? null;
  if (unitAmount === null) return refuse("the line item carries no unit amount");
  const listPriceCents = unitAmount * line.quantity;
  if (line.amount_subtotal !== listPriceCents) {
    return refuse(`line subtotal ${line.amount_subtotal} disagrees with the unit price ${listPriceCents}`);
  }
  if (listPriceCents !== CONSUMER_PACKET_PRICE_CENTS) {
    return refuse(`regular price must be ${CONSUMER_PACKET_PRICE_CENTS}, found ${listPriceCents}`);
  }

  const amountDueCents = session.amount_total;
  if (typeof amountDueCents !== "number") return refuse("the session carries no total");
  if (session.amount_subtotal !== listPriceCents) {
    return refuse(`session subtotal ${session.amount_subtotal ?? "(absent)"} is not the regular price`);
  }

  const discountCents = session.total_details?.amount_discount ?? 0;
  if (discountCents < 0) return refuse("a negative discount is not a discount");
  if (discountCents > listPriceCents) return refuse("the discount exceeds the regular price");

  // Shipping and tax are not configured for this product, and a session that
  // acquired them is not the order this application created.
  const shippingCents = session.total_details?.amount_shipping ?? 0;
  const taxCents = session.total_details?.amount_tax ?? 0;
  if (shippingCents !== 0 || taxCents !== 0) {
    return refuse("this order carries no shipping or tax, so a session with either is not ours");
  }

  // The arithmetic is the check. This is what replaces "amount must be 5000":
  // the total is whatever remains after the provider's own discount, and it has
  // to be exactly that.
  if (listPriceCents - discountCents !== amountDueCents) {
    return refuse(
      `order does not reconcile: regular ${listPriceCents} minus discount ${discountCents} is not the total ${amountDueCents}`
    );
  }
  if (line.amount_total !== amountDueCents) {
    return refuse(`line total ${line.amount_total} disagrees with the session total ${amountDueCents}`);
  }

  const paymentRequired = amountDueCents > 0;
  const paymentStatus = session.payment_status;
  const paymentIntentId = paymentIntentIdOf(session);

  if (expectSettled) {
    if (!paymentRequired) {
      // Stripe's documented zero-total flow: no PaymentIntent is created and
      // the session reports no_payment_required. Waiting for a charge here, or
      // inventing a PaymentIntent to satisfy an older assumption, would both be
      // wrong. A session that claims a charge on a zero total is not ours.
      if (paymentStatus !== "no_payment_required" && paymentStatus !== "paid") {
        return refuse(`a zero-total order must be no_payment_required, found ${paymentStatus}`);
      }
      if (paymentIntentId) return refuse("a zero-total order has no payment intent");
    } else if (paymentStatus !== "paid") {
      return refuse(`payment_status ${paymentStatus} is not paid on an order with ${amountDueCents} due`);
    }
  } else if (paymentIntentId && !paymentRequired) {
    return refuse("a zero-total order has no payment intent");
  }

  const settled = paymentRequired
    ? paymentStatus === "paid"
    : paymentStatus === "no_payment_required" && session.status === "complete";

  return {
    ok: true,
    order: {
      regularPriceCents: listPriceCents,
      discountCents,
      amountDueCents,
      // Nothing is collected on a no-cost order, and the record must say so
      // rather than carrying the regular price as though it had been charged.
      amountCollectedCents: paymentRequired && paymentStatus === "paid" ? amountDueCents : 0,
      currency: CONSUMER_PACKET_CURRENCY,
      productId: CONSUMER_PACKET_PRODUCT_ID,
      quantity: line.quantity,
      paymentRequired,
      settled,
      checkoutSessionId: session.id,
      paymentIntentId,
      appliedPromotionCodeIds: promotionCodeIdsOf(session)
    }
  };
}
