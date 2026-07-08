// First-party web analytics — event-name allowlist (isomorphic).
//
// The ingestion route validates every inbound `event_name` against this allowlist and drops
// anything else. Keeping the list here (no server-only guard) lets the browser tracker, the
// server route, and the verifiers all reference one source of truth.

export const PAGEVIEW_EVENT = "pageview" as const;

// DTC (Expungement.ai consumer) funnel events.
export const DTC_FUNNEL_EVENTS = [
  "screening_started",
  "state_selected",
  "screening_result_viewed",
  "save_progress_clicked",
  "account_created_started",
  "account_created_completed",
  "checkout_started",
  "checkout_completed",
  "packet_builder_started",
  "packet_generated"
] as const;

// RCAP partner funnel events.
export const PARTNER_FUNNEL_EVENTS = [
  "partner_landing_viewed",
  "partner_intake_started",
  "partner_account_started",
  "partner_screening_started",
  "partner_result_viewed",
  "partner_packet_builder_started",
  "partner_packet_generated"
] as const;

export const FUNNEL_EVENT_NAMES = [...DTC_FUNNEL_EVENTS, ...PARTNER_FUNNEL_EVENTS] as const;

export const ALLOWED_EVENT_NAMES = [PAGEVIEW_EVENT, ...FUNNEL_EVENT_NAMES] as const;

export type WebAnalyticsEventName = (typeof ALLOWED_EVENT_NAMES)[number];

const allowedEventNameSet = new Set<string>(ALLOWED_EVENT_NAMES);

export function isAllowedEventName(value: unknown): value is WebAnalyticsEventName {
  return typeof value === "string" && allowedEventNameSet.has(value);
}
