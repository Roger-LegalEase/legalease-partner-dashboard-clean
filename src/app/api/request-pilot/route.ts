import { NextResponse } from "next/server";
import { getSafeRequestId, logSecurityError, logSecurityInfo, logSecurityWarn } from "@/lib/observability/logger";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { createLaunchOsEvent, sourceDomainFromRequest } from "@/lib/legalease/launch-os-events";
import { checkPilotRequestRateLimit } from "@/lib/request-pilot/rate-limit";
import { checkSharedPilotRequestRateLimit, derivePilotRequestRateLimitBucket, safeBucketPrefix } from "@/lib/request-pilot/shared-rate-limit";
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

  const bucket = safeDeriveRateLimitBucket(request);
  if (!bucket.ok) {
    logSecurityError({ event: "rate_limit_config_error", route: "/api/request-pilot", outcome: "config_error", requestId, error: bucket.error });
    return NextResponse.json({ ok: false, error: "Request intake is temporarily unavailable. Please try again later." }, { status: 503 });
  }

  const localRateLimit = checkPilotRequestRateLimit(bucket.value.bucketKey);
  if (!localRateLimit.ok) {
    logSecurityWarn({
      event: "rate_limit_local_blocked",
      route: "/api/request-pilot",
      outcome: "rate_limited",
      requestId,
      metadata: { retry_after_seconds: localRateLimit.retryAfterSeconds }
    });
    return NextResponse.json(
      { ok: false, error: "Too many requests" },
      {
        status: 429,
        headers: {
          "retry-after": String(localRateLimit.retryAfterSeconds)
        }
      }
    );
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    logSecurityError({ event: "pilot_request insert fail", route: "/api/request-pilot", outcome: "supabase_not_configured", requestId });
    return NextResponse.json({ ok: false, error: "Request intake is temporarily unavailable." }, { status: 503 });
  }

  const sharedRateLimit = await checkSharedPilotRequestRateLimit(supabase, request);
  if (!sharedRateLimit.ok) {
    if (sharedRateLimit.reason === "blocked") {
      logSecurityWarn({
        event: "rate_limit_shared_blocked",
        route: "/api/request-pilot",
        outcome: "rate_limited",
        requestId,
        metadata: {
          retry_after_seconds: sharedRateLimit.retryAfterSeconds,
          bucket_prefix: safeBucketPrefix(sharedRateLimit.bucketKey)
        }
      });
      return NextResponse.json(
        { ok: false, error: "Too many requests" },
        {
          status: 429,
          headers: {
            "retry-after": String(sharedRateLimit.retryAfterSeconds)
          }
        }
      );
    }

    logSecurityError({
      event: sharedRateLimit.reason === "config_error" ? "rate_limit_config_error" : "rate_limit_shared_error",
      route: "/api/request-pilot",
      outcome: sharedRateLimit.reason,
      requestId,
      error: sharedRateLimit.error
    });
    return NextResponse.json({ ok: false, error: "Request intake is temporarily unavailable. Please try again later." }, { status: 503 });
  }

  logSecurityInfo({
    event: "rate_limit_shared_allowed",
    route: "/api/request-pilot",
    outcome: "allowed",
    requestId,
    metadata: { bucket_prefix: safeBucketPrefix(sharedRateLimit.bucketKey) }
  });

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

  const osEvent = await createLaunchOsEvent({
    sourceProduct: "rcap_partner",
    sourceDomain: sourceDomainFromRequest(request),
    sourceRoute: "/api/request-pilot",
    workflowType: "partner_pilot_request",
    loopCategory: "partner_followup",
    email: validation.data.email,
    message: `Partner pilot request submitted by ${validation.data.organization_name} for ${validation.data.state_or_jurisdiction}.`,
    userAgent: request.headers.get("user-agent"),
    metadata: {
      organization_type: validation.data.organization_type,
      state_or_jurisdiction: validation.data.state_or_jurisdiction,
      interested_workflow: validation.data.interested_workflow ?? null,
      consent_to_contact: validation.data.consent_to_contact
    }
  });

  if (!osEvent.ok) {
    logSecurityError({ event: "pilot_request os mirror fail", route: "/api/request-pilot", outcome: "os_mirror_failed", requestId });
    return NextResponse.json({ ok: false, error: "Request intake is temporarily unavailable. Please try again later." }, { status: 503 });
  }

  logSecurityInfo({ event: "pilot_request insert ok", route: "/api/request-pilot", outcome: "ok", requestId });
  return NextResponse.json({ ok: true });
}

function safeDeriveRateLimitBucket(request: Request) {
  try {
    return {
      ok: true as const,
      value: derivePilotRequestRateLimitBucket(request)
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error : new Error("Unable to derive rate-limit bucket.")
    };
  }
}
