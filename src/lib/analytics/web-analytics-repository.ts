import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { WebAnalyticsEventRow } from "@/lib/analytics/build-event";
import { PAGEVIEW_EVENT } from "@/lib/analytics/event-names";

const TABLE = "web_analytics_events";

export type RecordEventResult = {
  ok: boolean;
  stored: boolean;
  reason?: "db_unconfigured" | "insert_failed";
};

// Insert one analytics event. Idempotent on event_id (duplicate deliveries are ignored, not errored).
// This function NEVER throws — analytics must never break a user flow. Callers can ignore the result.
export async function recordWebAnalyticsEvent(row: WebAnalyticsEventRow): Promise<RecordEventResult> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    // In production a missing service-role client means analytics is simply off; treat as a
    // non-fatal no-op so the DTC/partner flow the caller sits in is unaffected.
    return { ok: true, stored: false, reason: "db_unconfigured" };
  }

  try {
    const { error } = await supabase
      .from(TABLE)
      .upsert(row, { onConflict: "event_id", ignoreDuplicates: true });
    if (error) {
      return { ok: false, stored: false, reason: "insert_failed" };
    }
    return { ok: true, stored: true };
  } catch {
    return { ok: false, stored: false, reason: "insert_failed" };
  }
}

export type SummaryRange = "1d" | "7d" | "30d";

export type WebAnalyticsSummary = {
  range: SummaryRange;
  generatedAt: string;
  totals: { pageviews: number; visitors: number; sessions: number };
  byDomain: Array<{ domain: string; pageviews: number; visitors: number }>;
  topPages: Array<{ path: string; domain: string; pageviews: number }>;
  topReferrers: Array<{ referrer: string; pageviews: number }>;
  utmCampaigns: Array<{ campaign: string; source: string | null; pageviews: number }>;
  byPartner: Array<{ partner_slug: string; pageviews: number; events: number }>;
  funnels: {
    expungementAi: {
      screeningStarted: number;
      resultViewed: number;
      checkoutStarted: number;
      checkoutCompleted: number;
      packetGenerated: number;
    };
    rcap: {
      partnerLandingViewed: number;
      partnerScreeningStarted: number;
      partnerResultViewed: number;
      partnerPacketGenerated: number;
    };
  };
  meta: { rowsScanned: number; truncated: boolean };
};

const RANGE_DAYS: Record<SummaryRange, number> = { "1d": 1, "7d": 7, "30d": 30 };

// Cap the row scan so a summary request can never read unbounded rows. At early-stage volume this
// reads everything; if it is ever hit, `truncated` is surfaced so the number is not silently wrong.
const SCAN_CAP = 100_000;

export function normalizeSummaryRange(value: unknown): SummaryRange {
  return value === "1d" || value === "30d" ? value : "7d";
}

// Minimal projection of the columns the summary needs (keeps the scan light + PII-free).
type SummaryRow = Pick<
  WebAnalyticsEventRow,
  | "event_name"
  | "domain"
  | "product_surface"
  | "path"
  | "referrer_domain"
  | "utm_campaign"
  | "utm_source"
  | "visitor_id"
  | "session_id"
  | "partner_slug"
>;

export async function getWebAnalyticsSummary(
  range: SummaryRange,
  client?: SupabaseClient
): Promise<WebAnalyticsSummary | null> {
  const supabase = client ?? getSupabaseAdminClient();
  if (!supabase) {
    return null;
  }

  const since = new Date(Date.now() - RANGE_DAYS[range] * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase
    .from(TABLE)
    .select(
      "event_name,domain,product_surface,path,referrer_domain,utm_campaign,utm_source,visitor_id,session_id,partner_slug"
    )
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: false })
    .limit(SCAN_CAP);

  if (error) {
    return null;
  }

  return aggregateSummary(range, (data ?? []) as SummaryRow[]);
}

// Pure aggregation — exported so verifiers can exercise it without a database.
export function aggregateSummary(range: SummaryRange, rows: SummaryRow[]): WebAnalyticsSummary {
  const visitors = new Set<string>();
  const sessions = new Set<string>();
  const domainVisitors = new Map<string, Set<string>>();
  const domainPageviews = new Map<string, number>();
  const pageCounts = new Map<string, { path: string; domain: string; count: number }>();
  const referrerCounts = new Map<string, number>();
  const campaignCounts = new Map<string, { campaign: string; source: string | null; count: number }>();
  const partnerAgg = new Map<string, { pageviews: number; events: number }>();
  const funnel = new Map<string, number>();

  let pageviews = 0;

  for (const row of rows) {
    const isPageview = row.event_name === PAGEVIEW_EVENT;
    if (row.visitor_id) visitors.add(row.visitor_id);
    if (row.session_id) sessions.add(row.session_id);

    if (row.event_name) {
      funnel.set(row.event_name, (funnel.get(row.event_name) ?? 0) + 1);
    }

    if (row.partner_slug) {
      const agg = partnerAgg.get(row.partner_slug) ?? { pageviews: 0, events: 0 };
      agg.events += 1;
      if (isPageview) agg.pageviews += 1;
      partnerAgg.set(row.partner_slug, agg);
    }

    if (!isPageview) continue;
    pageviews += 1;

    const domain = row.domain ?? "unknown";
    domainPageviews.set(domain, (domainPageviews.get(domain) ?? 0) + 1);
    if (row.visitor_id) {
      const set = domainVisitors.get(domain) ?? new Set<string>();
      set.add(row.visitor_id);
      domainVisitors.set(domain, set);
    }

    if (row.path) {
      const key = `${domain}${row.path}`;
      const entry = pageCounts.get(key) ?? { path: row.path, domain, count: 0 };
      entry.count += 1;
      pageCounts.set(key, entry);
    }

    if (row.referrer_domain) {
      referrerCounts.set(row.referrer_domain, (referrerCounts.get(row.referrer_domain) ?? 0) + 1);
    }

    if (row.utm_campaign) {
      const entry = campaignCounts.get(row.utm_campaign) ?? {
        campaign: row.utm_campaign,
        source: row.utm_source ?? null,
        count: 0
      };
      entry.count += 1;
      campaignCounts.set(row.utm_campaign, entry);
    }
  }

  const funnelCount = (name: string) => funnel.get(name) ?? 0;

  return {
    range,
    generatedAt: new Date().toISOString(),
    totals: { pageviews, visitors: visitors.size, sessions: sessions.size },
    byDomain: [...domainPageviews.entries()]
      .map(([domain, count]) => ({ domain, pageviews: count, visitors: domainVisitors.get(domain)?.size ?? 0 }))
      .sort((a, b) => b.pageviews - a.pageviews),
    topPages: [...pageCounts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
      .map((entry) => ({ path: entry.path, domain: entry.domain, pageviews: entry.count })),
    topReferrers: [...referrerCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([referrer, count]) => ({ referrer, pageviews: count })),
    utmCampaigns: [...campaignCounts.values()]
      .sort((a, b) => b.count - a.count)
      .slice(0, 20)
      .map((entry) => ({ campaign: entry.campaign, source: entry.source, pageviews: entry.count })),
    byPartner: [...partnerAgg.entries()]
      .map(([partner_slug, agg]) => ({ partner_slug, pageviews: agg.pageviews, events: agg.events }))
      .sort((a, b) => b.events - a.events)
      .slice(0, 20),
    funnels: {
      expungementAi: {
        screeningStarted: funnelCount("screening_started"),
        resultViewed: funnelCount("screening_result_viewed"),
        checkoutStarted: funnelCount("checkout_started"),
        checkoutCompleted: funnelCount("checkout_completed"),
        packetGenerated: funnelCount("packet_generated")
      },
      rcap: {
        partnerLandingViewed: funnelCount("partner_landing_viewed"),
        partnerScreeningStarted: funnelCount("partner_screening_started"),
        partnerResultViewed: funnelCount("partner_result_viewed"),
        partnerPacketGenerated: funnelCount("partner_packet_generated")
      }
    },
    meta: { rowsScanned: rows.length, truncated: rows.length >= SCAN_CAP }
  };
}
