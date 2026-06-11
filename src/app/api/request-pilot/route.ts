import { NextResponse } from "next/server";
import { getSafeRequestId, logSecurityError, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { checkPilotRequestRateLimit } from "@/lib/request-pilot/rate-limit";
import { capRequestMetadata, validatePilotRequestPayload } from "@/lib/request-pilot/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxPayloadBytes = 12_000;

export async function POST(request: Request) {
  const requestId = getSafeRequestId(request);
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    logSecurityWarn({ event: "pilot_request validation failed", route: "/api/request-pilot", outcome: "invalid_content_type", requestId });
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 415 });
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxPayloadBytes) {
    logSecurityWarn({ event: "pilot_request validation failed", route: "/api/request-pilot", outcome: "payload_too_large", requestId });
    return NextResponse.json({ ok: false, error: "Request is too large." }, { status: 413 });
  }

  let bodyText = "";
  try {
    bodyText = await request.text();
  } catch {
    logSecurityWarn({ event: "pilot_request validation failed", route: "/api/request-pilot", outcome: "body_read_failed", requestId });
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  if (new TextEncoder().encode(bodyText).length > maxPayloadBytes) {
    logSecurityWarn({ event: "pilot_request validation failed", route: "/api/request-pilot", outcome: "payload_too_large", requestId });
    return NextResponse.json({ ok: false, error: "Request is too large." }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    logSecurityWarn({ event: "pilot_request validation failed", route: "/api/request-pilot", outcome: "invalid_json", requestId });
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const validation = validatePilotRequestPayload(payload);
  if (validation.ok && validation.honeypot) {
    logSecurityInfo({ event: "pilot_request honeypot triggered", route: "/api/request-pilot", outcome: "ok_no_insert", requestId });
    return NextResponse.json({ ok: true });
  }

  if (!validation.ok) {
    logSecurityWarn({ event: "pilot_request validation failed", route: "/api/request-pilot", outcome: "invalid_payload", requestId });
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  const rateLimit = checkPilotRequestRateLimit(getClientIp(request));
  if (!rateLimit.ok) {
    logSecurityWarn({
      event: "pilot_request rate limit hit",
      route: "/api/request-pilot",
      outcome: "rate_limited",
      requestId,
      metadata: { retry_after_seconds: rateLimit.retryAfterSeconds }
    });
    return NextResponse.json(
      { ok: false, error: "Too many requests" },
      {
        status: 429,
        headers: {
          "retry-after": String(rateLimit.retryAfterSeconds)
        }
      }
    );
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    logSecurityError({ event: "pilot_request insert fail", route: "/api/request-pilot", outcome: "supabase_not_configured", requestId });
    return NextResponse.json({ ok: false, error: "Request intake is temporarily unavailable." }, { status: 503 });
  }

  const { error } = await supabase.from("partner_pilot_requests").insert({
    ...validation.data,
    source: "legaleasepartner.com",
    status: "new",
    user_agent: capRequestMetadata(request.headers.get("user-agent"), "user_agent"),
    referrer: capRequestMetadata(request.headers.get("referer") ?? request.headers.get("referrer"), "referrer")
  });

  if (error) {
    logSecurityError({ event: "pilot_request insert fail", route: "/api/request-pilot", outcome: "db_error", requestId, error });
    return NextResponse.json({ ok: false, error: "Unable to submit request." }, { status: 500 });
  }

  logSecurityInfo({ event: "pilot_request insert ok", route: "/api/request-pilot", outcome: "ok", requestId });
  return NextResponse.json({ ok: true });
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
