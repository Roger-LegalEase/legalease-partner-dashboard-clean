import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { checkPilotRequestRateLimit } from "@/lib/request-pilot/rate-limit";
import { capRequestMetadata, validatePilotRequestPayload } from "@/lib/request-pilot/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxPayloadBytes = 12_000;

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 415 });
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxPayloadBytes) {
    return NextResponse.json({ ok: false, error: "Request is too large." }, { status: 413 });
  }

  let bodyText = "";
  try {
    bodyText = await request.text();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request." }, { status: 400 });
  }

  if (new TextEncoder().encode(bodyText).length > maxPayloadBytes) {
    return NextResponse.json({ ok: false, error: "Request is too large." }, { status: 413 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(bodyText);
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 });
  }

  const validation = validatePilotRequestPayload(payload);
  if (validation.ok && validation.honeypot) {
    return NextResponse.json({ ok: true });
  }

  if (!validation.ok) {
    return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
  }

  const rateLimit = checkPilotRequestRateLimit(getClientIp(request));
  if (!rateLimit.ok) {
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
    return NextResponse.json({ ok: false, error: "Unable to submit request." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip")?.trim() || "unknown";
}
