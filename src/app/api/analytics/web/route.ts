import { NextResponse } from "next/server";
import { getSafeRequestId, logSecurityError, logSecurityWarn } from "@/lib/observability/logger";
import { buildWebAnalyticsRow } from "@/lib/analytics/build-event";
import { recordWebAnalyticsEvent } from "@/lib/analytics/web-analytics-repository";
import { PAGEVIEW_EVENT } from "@/lib/analytics/event-names";
import { getServerAuthState } from "@/lib/supabase/auth-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ROUTE = "/api/analytics/web";
const MAX_PAYLOAD_BYTES = 16_000;

// Best-effort in-memory throttle. This is a soft abuse guard, not a security control — analytics is
// fire-and-forget, so we cap events per source per window and silently drop the overflow.
const THROTTLE_WINDOW_MS = 60_000;
const THROTTLE_MAX_PER_WINDOW = 240;
const throttleBuckets = new Map<string, { count: number; resetAt: number }>();

// Fire-and-forget ingestion. This endpoint must NEVER block or break a user flow: it always
// responds fast, never surfaces user-facing errors, and swallows storage failures.
export async function POST(request: Request) {
  const requestId = getSafeRequestId(request);

  if (process.env.WEB_ANALYTICS_ENABLED === "false") {
    return noContent();
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ ok: false }, { status: 413 });
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return noContent();
  }
  if (new TextEncoder().encode(text).length > MAX_PAYLOAD_BYTES) {
    return NextResponse.json({ ok: false }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    // Do not error the client for malformed beacons; just ignore.
    return noContent();
  }

  const ip = clientIp(request);
  if (isThrottled(ip)) {
    return noContent();
  }

  const built = buildWebAnalyticsRow(payload, {
    host: request.headers.get("x-forwarded-host") ?? request.headers.get("host"),
    ip,
    userAgent: request.headers.get("user-agent"),
    country: request.headers.get("x-vercel-ip-country"),
    region: request.headers.get("x-vercel-ip-country-region"),
    userId: await resolveUserId(payload),
    ipSalt: process.env.WEB_ANALYTICS_IP_SALT ?? null
  });

  if (!built.ok) {
    // Reject only clearly invalid submissions (unknown event name / bad shape). Harmless to the
    // client (beacons ignore the response) but gives verifiers + logs a signal.
    logSecurityWarn({ event: "web analytics rejected", route: ROUTE, outcome: built.reason, requestId });
    return NextResponse.json({ ok: false, error: built.reason }, { status: 400 });
  }

  // Drop obvious bots after validation (don't overfit): no store, but a clean 204.
  if (built.isBot) {
    return noContent();
  }

  const result = await recordWebAnalyticsEvent(built.row);
  if (!result.ok) {
    // Never fail the user flow; log for operators and still return success to the beacon.
    logSecurityError({ event: "web analytics store failed", route: ROUTE, outcome: result.reason ?? "insert_failed", requestId });
  }

  return noContent();
}

// Only trust a server-resolved session for user_id, and only spend the auth roundtrip on
// low-volume funnel events (not high-volume pageviews) to keep ingestion cheap.
async function resolveUserId(payload: unknown): Promise<string | null> {
  const eventName = (payload as Record<string, unknown> | null)?.event_name;
  if (eventName === PAGEVIEW_EVENT) {
    return null;
  }
  try {
    const auth = await getServerAuthState();
    return auth.isAuthenticated ? auth.userId : null;
  } catch {
    return null;
  }
}

function clientIp(request: Request): string | null {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("x-vercel-forwarded-for") ??
    null
  );
}

function isThrottled(ip: string | null): boolean {
  if (!ip) return false;
  const now = Date.now();
  const bucket = throttleBuckets.get(ip);
  if (!bucket || bucket.resetAt <= now) {
    throttleBuckets.set(ip, { count: 1, resetAt: now + THROTTLE_WINDOW_MS });
    if (throttleBuckets.size > 5000) {
      // Bound memory: drop expired buckets opportunistically.
      for (const [key, value] of throttleBuckets) {
        if (value.resetAt <= now) throttleBuckets.delete(key);
      }
    }
    return false;
  }
  bucket.count += 1;
  return bucket.count > THROTTLE_MAX_PER_WINDOW;
}

function noContent() {
  return new NextResponse(null, { status: 204, headers: { "cache-control": "no-store" } });
}
