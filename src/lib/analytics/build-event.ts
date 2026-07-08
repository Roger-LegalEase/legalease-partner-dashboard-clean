import "server-only";

import { createHash, createHmac, randomUUID } from "node:crypto";
import { isAllowedEventName, PAGEVIEW_EVENT, type WebAnalyticsEventName } from "@/lib/analytics/event-names";
import { isProductSurface, productSurfaceForHost, type ProductSurface } from "@/lib/analytics/product-surface";
import {
  referrerDomain,
  sanitizeEventMeta,
  sanitizePath,
  sanitizeQueryString,
  sanitizeReferrerUrl,
  sanitizeShortText
} from "@/lib/analytics/sanitize";

// A fully-validated, storage-ready analytics row. Matches columns in
// supabase/phase-40-web-analytics-events.sql.
export type WebAnalyticsEventRow = {
  event_id: string;
  occurred_at: string;
  domain: string | null;
  product_surface: ProductSurface | null;
  event_name: WebAnalyticsEventName;
  path: string | null;
  query: string | null;
  page_title: string | null;
  referrer_domain: string | null;
  referrer_url: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_term: string | null;
  utm_content: string | null;
  visitor_id: string | null;
  session_id: string | null;
  user_id: string | null;
  partner_slug: string | null;
  jurisdiction: string | null;
  device_type: string | null;
  user_agent_family: string | null;
  ip_hash: string | null;
  country: string | null;
  region: string | null;
  event_meta: Record<string, string | number | boolean>;
};

export type BuildEventContext = {
  host: string | null;
  ip: string | null;
  userAgent: string | null;
  country?: string | null;
  region?: string | null;
  userId?: string | null;
  ipSalt?: string | null;
};

export type BuildEventResult =
  | { ok: true; row: WebAnalyticsEventRow; isBot: boolean }
  | { ok: false; reason: "invalid_event_name" | "invalid_payload" };

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BOT_PATTERN = /(bot|crawler|spider|crawl|slurp|bingpreview|headlesschrome|phantomjs|puppeteer|playwright|lighthouse|monitor|preview|facebookexternalhit|embedly|curl|wget|python-requests|axios|go-http)/i;
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;
const STATE_CODE_PATTERN = /^[A-Za-z]{2}$/;

export function buildWebAnalyticsRow(payload: unknown, context: BuildEventContext): BuildEventResult {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, reason: "invalid_payload" };
  }
  const body = payload as Record<string, unknown>;

  const eventName = body.event_name;
  if (!isAllowedEventName(eventName)) {
    return { ok: false, reason: "invalid_event_name" };
  }

  // Surface + domain are authoritative from the server-observed Host. We only fall back to a
  // client-declared surface hint on hosts the server can't classify (localhost, previews).
  const serverSurface = productSurfaceForHost(context.host);
  const clientSurface = isProductSurface(body.product_surface) ? body.product_surface : null;
  const surface = serverSurface?.surface ?? clientSurface;
  const domain = serverSurface?.domain ?? normalizeHostForStorage(context.host);

  const utm = extractUtm(body);

  const row: WebAnalyticsEventRow = {
    event_id: coerceUuid(body.event_id) ?? randomUUID(),
    occurred_at: normalizeOccurredAt(body.occurred_at),
    domain: domain ?? null,
    product_surface: surface,
    event_name: eventName,
    path: eventName === PAGEVIEW_EVENT ? sanitizePath(body.path) : optionalPath(body.path),
    query: sanitizeQueryString(body.query) ?? null,
    page_title: sanitizeShortText(body.page_title, 190) ?? null,
    referrer_domain: referrerDomain(body.referrer) ?? sanitizeShortText(body.referrer_domain, 190) ?? null,
    referrer_url: sanitizeReferrerUrl(body.referrer) ?? null,
    utm_source: utm.utm_source,
    utm_medium: utm.utm_medium,
    utm_campaign: utm.utm_campaign,
    utm_term: utm.utm_term,
    utm_content: utm.utm_content,
    visitor_id: coerceUuid(body.visitor_id),
    session_id: coerceUuid(body.session_id),
    // user_id is only ever trusted from the server-resolved session, never from the client payload.
    user_id: coerceUuid(context.userId),
    partner_slug: coerceSlug(body.partner_slug),
    jurisdiction: coerceStateCode(body.jurisdiction ?? body.state),
    device_type: deriveDeviceType(context.userAgent),
    user_agent_family: deriveUserAgentFamily(context.userAgent),
    ip_hash: hashIp(context.ip, context.ipSalt),
    country: sanitizeShortText(context.country, 8) ?? null,
    region: sanitizeShortText(context.region, 24) ?? null,
    event_meta: sanitizeEventMeta(body.meta ?? body.event_meta) ?? {}
  };

  return { ok: true, row, isBot: isBotUserAgent(context.userAgent) };
}

function extractUtm(body: Record<string, unknown>) {
  // UTM may arrive as a nested `utm` object or as flat utm_* keys.
  const nested = body.utm && typeof body.utm === "object" && !Array.isArray(body.utm)
    ? (body.utm as Record<string, unknown>)
    : {};
  const pick = (key: string) => sanitizeShortText(body[key] ?? nested[key.replace(/^utm_/, "")], 120) ?? null;
  return {
    utm_source: pick("utm_source"),
    utm_medium: pick("utm_medium"),
    utm_campaign: pick("utm_campaign"),
    utm_term: pick("utm_term"),
    utm_content: pick("utm_content")
  };
}

function optionalPath(path: unknown): string | null {
  return typeof path === "string" && path ? sanitizePath(path) : null;
}

function coerceUuid(value: unknown): string | null {
  return typeof value === "string" && UUID_PATTERN.test(value.trim()) ? value.trim().toLowerCase() : null;
}

function coerceSlug(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return SLUG_PATTERN.test(normalized) ? normalized : null;
}

function coerceStateCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return STATE_CODE_PATTERN.test(trimmed) ? trimmed.toUpperCase() : null;
}

function normalizeOccurredAt(value: unknown): string {
  if (typeof value === "string") {
    const date = new Date(value);
    if (Number.isFinite(date.getTime())) {
      // Reject implausible client clocks (far future / far past) to keep time-range queries sane.
      const skewMs = Math.abs(date.getTime() - Date.now());
      if (skewMs < 1000 * 60 * 60 * 24 * 2) {
        return date.toISOString();
      }
    }
  }
  return new Date().toISOString();
}

function normalizeHostForStorage(host: string | null): string | null {
  if (!host) return null;
  const normalized = host.split(":")[0]?.trim().toLowerCase();
  return normalized ? normalized.slice(0, 190) : null;
}

// Salted, non-reversible IP hash. Returns null (never a weak hash) when the salt is unconfigured,
// so we never persist anything IP-derived without a rotation-capable secret.
export function hashIp(ip: string | null, salt: string | null | undefined): string | null {
  const trimmedIp = (ip ?? "").split(",")[0]?.trim();
  if (!trimmedIp || !salt) {
    return null;
  }
  return createHmac("sha256", salt).update(trimmedIp).digest("hex");
}

// Stable, valid UUID derived from a seed. Used to make server-confirmed funnel events (e.g. a
// checkout completion polled multiple times) idempotent — the same seed always yields the same
// event_id, so upsert-ignore-duplicates records it exactly once.
export function deterministicEventId(seed: string): string {
  const hash = createHash("sha256").update(seed).digest("hex");
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-8${hash.slice(17, 20)}-${hash.slice(20, 32)}`;
}

export function isBotUserAgent(userAgent: string | null): boolean {
  return typeof userAgent === "string" && BOT_PATTERN.test(userAgent);
}

function deriveDeviceType(userAgent: string | null): string | null {
  if (!userAgent) return null;
  if (/ipad|tablet|kindle|playbook|silk/i.test(userAgent)) return "tablet";
  if (/mobi|iphone|ipod|android.*mobile|windows phone/i.test(userAgent)) return "mobile";
  return "desktop";
}

function deriveUserAgentFamily(userAgent: string | null): string | null {
  if (!userAgent) return null;
  if (BOT_PATTERN.test(userAgent)) return "bot";
  if (/edg\//i.test(userAgent)) return "edge";
  if (/chrome|crios/i.test(userAgent) && !/edg\//i.test(userAgent)) return "chrome";
  if (/firefox|fxios/i.test(userAgent)) return "firefox";
  if (/safari/i.test(userAgent) && !/chrome|crios/i.test(userAgent)) return "safari";
  return "other";
}
