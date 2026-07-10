import "server-only";

import { after } from "next/server";

import { recordServerFunnelEvent } from "@/lib/analytics/server-events";

// The paid event has TWO producers for a single payment:
//   1. the Stripe webhook (`checkout-reconciliation.ts`) — authoritative, fires even if the user
//      never returns to the site;
//   2. the polled `/api/expungement-ai/payment/confirm` route — fires when the user lands back on
//      packet-ready.
//
// Both are expected to fire for the same payment. They are collapsed to one funnel event because
// this helper is the single definition of the idempotency seed: the Stripe checkout session id. That
// seed derives a deterministic `event_id`, the analytics upsert ignores the duplicate, and only the
// insert that actually stored a row is mirrored to the Command Center. Change the seed in one place
// and the paid count doubles, so it lives here and nowhere else.
/**
 * Schedule the paid event to be emitted after the response is flushed.
 *
 * Both producers sit in request paths that must not wait on analytics — and a bare `void` would be
 * worse than waiting: serverless freezes the invocation once the response is sent, silently dropping
 * the floating promise. `after()` keeps the invocation alive just long enough.
 *
 * Falls back to a floating promise outside a request scope (scripts, verifiers), where `after()`
 * throws and nothing is going to freeze anyway.
 */
export function scheduleConsumerCheckoutCompleted(options: ConsumerCheckoutCompletedOptions): void {
  try {
    after(() => recordConsumerCheckoutCompleted(options));
  } catch {
    void recordConsumerCheckoutCompleted(options);
  }
}

type ConsumerCheckoutCompletedOptions = {
  request: Request | null;
  checkoutSessionId: string;
  state?: string;
  amountCents?: number;
  mode?: string;
};

export async function recordConsumerCheckoutCompleted(options: {
  /** Absent on the webhook path — Stripe posts to a host that carries no product surface. */
  request: Request | null;
  checkoutSessionId: string;
  state?: string;
  amountCents?: number;
  mode?: string;
}): Promise<void> {
  await recordServerFunnelEvent(options.request, "checkout_completed", {
    idempotencySeed: options.checkoutSessionId,
    // Server-emitted, so the surface is asserted rather than derived from an untrusted Host.
    productSurface: "expungement_ai",
    state: options.state,
    // Amounts only. `amount_cents` carries the Command Center funnel's revenue figure; no payment
    // identifiers are recorded.
    meta: { result: "paid", mode: options.mode, amount_cents: options.amountCents }
  });
}
