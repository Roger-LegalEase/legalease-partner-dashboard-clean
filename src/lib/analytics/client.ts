// First-party web analytics — browser tracker helpers.
//
// Runs only in the browser. Manages the anonymous visitor cookie/id, the idle-based session id, and
// UTM capture, then POSTs privacy-safe events to /api/analytics/web via sendBeacon (fetch keepalive
// fallback). Nothing here blocks navigation and every call is wrapped so a tracker failure can never
// surface to the user.

import { isProductSurface, productSurfaceForHost, type ProductSurface } from "@/lib/analytics/product-surface";
import { PAGEVIEW_EVENT, type WebAnalyticsEventName } from "@/lib/analytics/event-names";
import { sanitizeEventMeta } from "@/lib/analytics/sanitize";

const ENDPOINT = "/api/analytics/web";
const VISITOR_KEY = "le_vid";
const SESSION_KEY = "le_sid";
const SESSION_TS_KEY = "le_sid_ts";
const UTM_KEY = "le_utm";
const SESSION_IDLE_MS = 30 * 60 * 1000; // 30-minute idle window closes a session.

type FunnelMeta = Record<string, string | number | boolean | undefined> | undefined;

// Master client gate. Honors Do Not Track (privacy-first choice — documented in docs/WEB_ANALYTICS.md)
// and an explicit build-time disable. Returns false during SSR.
export function analyticsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  if (process.env.NEXT_PUBLIC_WEB_ANALYTICS_DISABLED === "true") return false;
  if (isDoNotTrack()) return false;
  return true;
}

function isDoNotTrack(): boolean {
  try {
    const nav = navigator as Navigator & { msDoNotTrack?: string };
    const win = window as Window & { doNotTrack?: string };
    const signal = nav.doNotTrack ?? win.doNotTrack ?? nav.msDoNotTrack;
    return signal === "1" || signal === "yes";
  } catch {
    return false;
  }
}

function uuid(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* fall through to manual generation */
  }
  // RFC4122-ish fallback for older/secure-context-less browsers.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rand = (Math.random() * 16) | 0;
    const value = char === "x" ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

function safeLocalStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function getVisitorId(): string {
  const store = safeLocalStorage();
  if (!store) return uuid();
  let id = store.getItem(VISITOR_KEY);
  if (!id) {
    id = uuid();
    store.setItem(VISITOR_KEY, id);
    // Mirror into a first-party cookie so the server could correlate if ever needed. 13-month TTL.
    try {
      document.cookie = `${VISITOR_KEY}=${id}; Max-Age=${60 * 60 * 24 * 400}; Path=/; SameSite=Lax`;
    } catch {
      /* cookies may be blocked; localStorage id still works */
    }
  }
  return id;
}

function getSessionId(): string {
  const store = safeLocalStorage();
  if (!store) return uuid();
  const now = Date.now();
  const existing = store.getItem(SESSION_KEY);
  const lastTs = Number(store.getItem(SESSION_TS_KEY) ?? 0);
  let id = existing;
  if (!id || !lastTs || now - lastTs > SESSION_IDLE_MS) {
    id = uuid();
    store.setItem(SESSION_KEY, id);
  }
  store.setItem(SESSION_TS_KEY, String(now));
  return id;
}

// Capture UTM params once per session (first page wins) so downstream events keep the attribution.
function getSessionUtm(): Record<string, string> {
  const store = safeLocalStorage();
  const params = new URLSearchParams(window.location.search);
  const fresh: Record<string, string> = {};
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"]) {
    const value = params.get(key);
    if (value) fresh[key] = value.slice(0, 120);
  }

  if (!store) return fresh;

  if (Object.keys(fresh).length > 0) {
    try {
      store.setItem(UTM_KEY, JSON.stringify(fresh));
    } catch {
      /* ignore quota errors */
    }
    return fresh;
  }

  try {
    const stored = store.getItem(UTM_KEY);
    return stored ? (JSON.parse(stored) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function currentSurface(): ProductSurface | null {
  const resolved = productSurfaceForHost(window.location.hostname);
  return resolved?.surface ?? null;
}

function post(body: Record<string, unknown>) {
  const payload = JSON.stringify(body);
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([payload], { type: "application/json" });
      if (navigator.sendBeacon(ENDPOINT, blob)) return;
    }
  } catch {
    /* fall through to fetch */
  }
  try {
    void fetch(ENDPOINT, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
      credentials: "same-origin"
    }).catch(() => {});
  } catch {
    /* analytics must never throw into a user flow */
  }
}

function baseEnvelope() {
  const surface = currentSurface();
  const envelope: Record<string, unknown> = {
    event_id: uuid(),
    occurred_at: new Date().toISOString(),
    visitor_id: getVisitorId(),
    session_id: getSessionId(),
    ...getSessionUtm()
  };
  if (surface) envelope.product_surface = surface;
  return envelope;
}

export function trackPageview(extra?: { path?: string; title?: string }) {
  if (!analyticsEnabled()) return;
  try {
    post({
      ...baseEnvelope(),
      event_name: PAGEVIEW_EVENT,
      path: extra?.path ?? window.location.pathname,
      query: window.location.search,
      page_title: (extra?.title ?? document.title ?? "").slice(0, 190),
      referrer: document.referrer || undefined
    });
  } catch {
    /* swallow */
  }
}

export function trackFunnelEvent(eventName: WebAnalyticsEventName, meta?: FunnelMeta) {
  if (!analyticsEnabled()) return;
  try {
    const safeMeta = sanitizeEventMeta(meta);
    const surfaceHint = maybeSurface(meta);
    post({
      ...baseEnvelope(),
      event_name: eventName,
      path: window.location.pathname,
      partner_slug: typeof meta?.partner_slug === "string" ? meta.partner_slug : undefined,
      state: typeof meta?.state === "string" ? meta.state : undefined,
      ...(surfaceHint ? { product_surface: surfaceHint } : {}),
      meta: safeMeta
    });
  } catch {
    /* swallow */
  }
}

function maybeSurface(meta: FunnelMeta): ProductSurface | undefined {
  const value = meta?.product_surface;
  return isProductSurface(value) ? value : undefined;
}
