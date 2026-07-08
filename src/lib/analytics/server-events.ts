import "server-only";

import { buildWebAnalyticsRow, deterministicEventId } from "@/lib/analytics/build-event";
import { recordWebAnalyticsEvent } from "@/lib/analytics/web-analytics-repository";
import type { WebAnalyticsEventName } from "@/lib/analytics/event-names";

// Server-side funnel emitter for events that must be server-confirmed (checkout_completed,
// partner_packet_generated). Derives product_surface/domain from the request Host, never trusts a
// client for the fact, and is fully guarded so it can never throw into the calling flow.
//
// Callers should NOT await this — invoke as `void recordServerFunnelEvent(...)`.
export async function recordServerFunnelEvent(
  request: Request,
  eventName: WebAnalyticsEventName,
  options: {
    // A stable seed makes the event idempotent (e.g. the Stripe checkout session id).
    idempotencySeed?: string;
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
        host: request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
        ip: null, // Server-emitted events are not IP-attributed.
        userAgent: request.headers.get("user-agent"),
        country: request.headers.get("x-vercel-ip-country"),
        region: request.headers.get("x-vercel-ip-country-region"),
        ipSalt: process.env.WEB_ANALYTICS_IP_SALT ?? null
      }
    );
    if (!built.ok) return;
    await recordWebAnalyticsEvent(built.row);
  } catch {
    // Analytics must never break a payment/packet flow.
  }
}
