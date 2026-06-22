import { NextResponse } from "next/server";

import { consumeRcapScreeningSession } from "@/lib/expungement-ai/rcap-slot-lifecycle";
import { getSafeRequestId, logSecurityError, logSecurityWarn } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxPayloadBytes = 2_000;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const requestId = getSafeRequestId(request);
  const body = await readJson(request);
  if (!body.ok) {
    logSecurityWarn({ event: "screening_complete_invalid", route: "/api/expungement-ai/screening/complete", outcome: body.reason, requestId });
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const sessionId = typeof body.value.sessionId === "string" ? body.value.sessionId : "";
  if (!uuidPattern.test(sessionId)) {
    logSecurityWarn({ event: "screening_complete_invalid", route: "/api/expungement-ai/screening/complete", outcome: "invalid_session_id", requestId });
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const result = await consumeRcapScreeningSession(sessionId);
  if (!result.ok) {
    logSecurityError({ event: "screening_complete_slot_consume_failed", route: "/api/expungement-ai/screening/complete", outcome: "failed", requestId, error: result.error });
  }

  return NextResponse.json({ ok: true });
}

async function readJson(request: Request): Promise<
  | { ok: true; value: { sessionId?: unknown } }
  | { ok: false; reason: "payload_too_large" | "body_read_failed" | "invalid_json" }
> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxPayloadBytes) return { ok: false, reason: "payload_too_large" };
  let text = "";
  try {
    text = await request.text();
  } catch {
    return { ok: false, reason: "body_read_failed" };
  }
  if (new TextEncoder().encode(text).length > maxPayloadBytes) return { ok: false, reason: "payload_too_large" };
  try {
    return { ok: true, value: JSON.parse(text) as { sessionId?: unknown } };
  } catch {
    return { ok: false, reason: "invalid_json" };
  }
}
