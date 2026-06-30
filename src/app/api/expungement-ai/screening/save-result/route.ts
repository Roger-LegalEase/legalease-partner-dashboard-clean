import { NextResponse } from "next/server";

import { getRcapBriefcaseAuthState } from "@/lib/rcap/briefcase/auth";
import { isRcapPartnerScreeningSession, saveScreeningResultToBriefcase } from "@/lib/expungement-ai/briefcase";
import { buildSaveInput, isStorableResultCode, normalizePacketType } from "@/lib/expungement-ai/save-result-policy";
import { getSafeRequestId, logSecurityWarn } from "@/lib/observability/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxPayloadBytes = 8_000;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const requestId = getSafeRequestId(request);

  // Signed-out: tell the client to route to sign-in and retry the save after login.
  const auth = await getRcapBriefcaseAuthState();
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });
  }

  const parsed = await readJson(request);
  if (!parsed.ok) {
    logSecurityWarn({ event: "briefcase_save_invalid", route: "/api/expungement-ai/screening/save-result", outcome: parsed.reason, requestId });
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  // NOTE: we deliberately read only the result fields below. Raw screening answers are never read
  // or stored on consumer_briefcase_items.
  const body = parsed.value;
  if (!isStorableResultCode(body.resultCode) || typeof body.jurisdiction !== "string" || !body.jurisdiction.trim()) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const sourceSessionId = typeof body.sourceSessionId === "string" && uuidPattern.test(body.sourceSessionId) ? body.sourceSessionId : undefined;
  const isPartnerSession = sourceSessionId ? await isRcapPartnerScreeningSession(sourceSessionId) : false;

  const input = buildSaveInput(
    {
      userId: auth.userId,
      jurisdiction: body.jurisdiction.trim().slice(0, 120),
      resultCode: body.resultCode,
      pathwayLabel: typeof body.pathwayLabel === "string" ? body.pathwayLabel.slice(0, 200) : undefined,
      packetType: normalizePacketType(body.packetType),
      paymentAllowed: body.paymentAllowed === true,
      summary: typeof body.summary === "string" ? body.summary.slice(0, 500) : "Saved from your screening.",
      nextSteps: Array.isArray(body.nextSteps) ? body.nextSteps.filter((s): s is string => typeof s === "string").slice(0, 40) : [],
      sourceSessionId
    },
    { isPartnerSession }
  );

  const item = await saveScreeningResultToBriefcase(input);
  return NextResponse.json({ ok: true, itemId: item.id });
}

type SaveBody = {
  resultCode?: unknown;
  jurisdiction?: unknown;
  pathwayLabel?: unknown;
  packetType?: unknown;
  paymentAllowed?: unknown;
  summary?: unknown;
  nextSteps?: unknown;
  sourceSessionId?: unknown;
};

async function readJson(request: Request): Promise<{ ok: true; value: SaveBody } | { ok: false; reason: "payload_too_large" | "body_read_failed" | "invalid_json" }> {
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
    return { ok: true, value: JSON.parse(text) as SaveBody };
  } catch {
    return { ok: false, reason: "invalid_json" };
  }
}
