import "server-only";

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
