"use client";

import { useEffect } from "react";
import { trackFunnelEvent } from "@/lib/analytics/client";
import type { WebAnalyticsEventName } from "@/lib/analytics/event-names";

// Fire-once funnel beacon for server-rendered pages. Drop this into a server component (e.g. a
// partner landing or intake page) to emit a single funnel event on mount without converting the page
// to a client component. Renders nothing and never blocks the flow.
//
// `meta` must be low-cardinality, public-safe values only (state code, result_code, partner_slug).
// Never pass screening answers, PII, or record details — the sanitizer drops them, but don't rely on
// that as the first line of defense.
export function FunnelBeacon({
  event,
  meta
}: {
  event: WebAnalyticsEventName;
  meta?: Record<string, string | number | boolean | undefined>;
}) {
  useEffect(() => {
    trackFunnelEvent(event, meta);
    // Serialize meta so a new object identity each render doesn't refire the beacon.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, JSON.stringify(meta ?? {})]);

  return null;
}
