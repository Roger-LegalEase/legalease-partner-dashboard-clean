import "server-only";

import { buildWebAnalyticsRow, deterministicEventId } from "@/lib/analytics/build-event";
import { forwardEventToCommandCenter } from "@/lib/analytics/command-center-bridge";
import { recordWebAnalyticsEvent } from "@/lib/analytics/web-analytics-repository";
import type { WebAnalyticsEventName } from "@/lib/analytics/event-names";
import type { ProductSurface } from "@/lib/analytics/product-surface";

// Server-side funnel emitter for events that must be server-confirmed (checkout_completed,
// partner_packet_generated). Derives product_surface/domain from the request Host, never trusts a
// client for the fact, and is fully guarded so it can never throw into the calling flow.
//
// Callers should NOT await this — invoke as `void recordServerFunnelEvent(...)`.
export async function recordServerFunnelEvent(
  // Null when there is no user-facing request to derive a surface from (e.g. a Stripe webhook, which
  // arrives on a host that carries no product surface). Pass `productSurface` in that case.
  request: Request | null,
  eventName: WebAnalyticsEventName,
  options: {
    // A stable seed makes the event idempotent (e.g. the Stripe checkout session id).
    idempotencySeed?: string;
    // Asserted surface, used when the request Host cannot supply one. Trusted: server-emitted only.
    productSurface?: ProductSurface;
    partnerSlug?: string;
    state?: string;
    meta?: Record<string, string | number | boolean | undefined>;
  } = {}
): Promise<void> {
  try {
    const built = buildWebAnalyticsRow(
      {
        event_name: eventName,
        event_id: options.idempotencySeed ? deterministicEventId(`${eventName}:${options.idempotencySeed}`) : undefined,
        partner_slug: options.partnerSlug,
        state: options.state,
        meta: options.meta
      },
      {
        host: request?.headers.get("x-forwarded-host") ?? request?.headers.get("host") ?? null,
        ip: null, // Server-emitted events are not IP-attributed.
        userAgent: request?.headers.get("user-agent") ?? null,
        country: request?.headers.get("x-vercel-ip-country"),
        region: request?.headers.get("x-vercel-ip-country-region"),
        ipSalt: process.env.WEB_ANALYTICS_IP_SALT ?? null
      }
    );
    if (!built.ok) return;

    // An asserted surface is authoritative for server-emitted events. `buildWebAnalyticsRow` derives
    // the surface from the request Host, but Stripe posts its webhook to whatever host the endpoint
    // is configured on — which may be no product surface at all, or the wrong one. Without this, the
    // paid event would be dropped by the Command Center bridge or attributed to another product.
    if (options.productSurface) {
      built.row.product_surface = options.productSurface;
    }

    const result = await recordWebAnalyticsEvent(built.row);

    // Mirror to the Command Center funnel only when this call actually inserted the row. This route
    // is polled and Stripe redelivers webhooks, so the `event_id` upsert (seeded with the checkout
    // session id) is what guarantees `payment_completed` revenue is counted exactly once.
    if (result.stored) {
      await forwardEventToCommandCenter(built.row);
    }
  } catch {
    // Analytics must never break a payment/packet flow.
  }
}
