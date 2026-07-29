import "server-only";

import type { WebAnalyticsEventRow } from "@/lib/analytics/build-event";
import type { WebAnalyticsEventName } from "@/lib/analytics/event-names";
import {
  emitProductEvent,
  hashProductEventIdentity,
  type ProductEventInput,
  type ProductEventOptions,
  type ProductEventResult,
  type ProductEventType
} from "@/lib/analytics/product-events";

// Bridge: first-party web analytics → LegalEase Command Center product events.
//
// Rather than instrumenting four product surfaces separately, we forward the analytics rows the
// product ALREADY writes server-side. Those rows are bot-filtered, throttled, event-name validated,
// PII-sanitized, and idempotent on `event_id` before they reach us, so the Command Center funnel
// inherits the same guarantees as the internal funnel and the two can be reconciled row-for-row.
//
// Only the Expungement.ai consumer surface is bridged. RCAP partner funnel events live on a
// different surface and would pollute the `expungement_ai` product funnel.

/** Analytics event name → Command Center product event type. */
const EVENT_TYPE_BY_NAME: Partial<Record<WebAnalyticsEventName, ProductEventType>> = {
  screening_started: "expungement_intake_started",
  checkout_started: "payment_started",
  checkout_completed: "payment_completed",
  packet_generated: "packet_generated"
};

/** Paths that count as the Expungement.ai landing page (bare host, and the internal rewrite target). */
const LANDING_PATHS = new Set(["/", "/expungement-ai"]);

/**
 * Forward one stored analytics row to the Command Center, if it maps to a product event.
 *
 * Fire-and-forget: callers invoke as `void forwardEventToCommandCenter(row)`. Never throws.
 *
 * IMPORTANT: only call this for rows that were genuinely newly stored. The receiver dedupes on
 * (product, eventType, id, timestamp, campaignSlug); `occurred_at` differs between two deliveries of
 * the same logical event, so a re-delivery would NOT dedupe server-side and would double-count
 * revenue. The `event_id` upsert is what actually collapses re-deliveries — gate on it.
 */
export async function forwardEventToCommandCenter(
  row: WebAnalyticsEventRow,
  options: ProductEventOptions = {}
): Promise<ProductEventResult | null> {
  try {
    const event = mapRowToProductEvent(row);
    if (!event) {
      return null;
    }
    return await emitProductEvent(event, options);
  } catch {
    // Analytics egress must never break a user flow.
    return null;
  }
}

/** Pure mapper — exported so verifiers can exercise it without a network or a database. */
export function mapRowToProductEvent(row: WebAnalyticsEventRow): ProductEventInput | null {
  if (row.product_surface !== "expungement_ai") {
    return null;
  }

  const eventType = resolveEventType(row);
  if (!eventType) {
    return null;
  }

  const event: ProductEventInput = {
    eventType,
    // Stable + opaque. Prefer the durable visitor id, fall back to the session, then to the event
    // itself (a cookie-less visit is still a real visit; retries reuse the same body, so it dedupes).
    anonymousId: hashProductEventIdentity(row.visitor_id ?? row.session_id ?? row.event_id),
    timestamp: row.occurred_at,
    campaignSlug: row.utm_campaign ?? "",
    partnerId: row.partner_slug ?? "",
    state: row.jurisdiction ?? "",
    source: row.utm_source ?? "",
    metadata: buildMetadata(row, eventType)
  };

  if (row.user_id) {
    event.userId = hashProductEventIdentity(row.user_id);
  }

  return event;
}

function resolveEventType(row: WebAnalyticsEventRow): ProductEventType | null {
  if (row.event_name === "pageview") {
    return row.path && LANDING_PATHS.has(row.path) ? "landing_page_viewed" : null;
  }
  return EVENT_TYPE_BY_NAME[row.event_name] ?? null;
}

/**
 * Counts and amounts only. `metadata.amount` on `payment_completed` is what records revenue; the
 * receiver treats amounts over 1000 as cents, which is exactly what `amount_cents` already holds.
 */
function buildMetadata(row: WebAnalyticsEventRow, eventType: ProductEventType): Record<string, unknown> {
  if (eventType !== "payment_completed") {
    return {};
  }

  const amount = row.event_meta.amount_cents;
  return typeof amount === "number" && Number.isFinite(amount) && amount > 0 ? { amount: Math.round(amount) } : {};
}
