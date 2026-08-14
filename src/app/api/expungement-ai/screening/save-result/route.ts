import { NextResponse } from "next/server";

import { getRcapBriefcaseAuthState } from "@/lib/rcap/briefcase/auth";
import { isRcapPartnerScreeningSession, saveScreeningResultToBriefcase } from "@/lib/expungement-ai/briefcase";
import { recordScreeningEligibilityResult } from "@/lib/expungement-ai/rcap-screening-analytics";
import { attachMississippiPacketInformationRequest } from "@/lib/expungement-ai/packet-generation";
import { buildSaveInput, isStorableResultCode, normalizePacketType } from "@/lib/expungement-ai/save-result-policy";
import { resolveSessionRouteIdentity } from "@/lib/expungement-ai/screening-session-route-identity";
import { forbiddenRouteIdentityFields } from "@/lib/rcap-engine/composed-route-selector";
import { componentDeferralBundle, normalizeDeferralLocale } from "@/lib/rcap/documents/guidance-packet-registry";
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

  // Route and treatment identity are server-owned. A body that asserts them is
  // rejected outright: a participant does not get to declare which legal route
  // — and therefore which payment posture — their saved matter carries.
  const asserted = forbiddenRouteIdentityFields(body);
  if (asserted.length > 0) {
    logSecurityWarn({ event: "briefcase_save_client_route_identity", route: "/api/expungement-ai/screening/save-result", outcome: asserted.join(","), requestId });
    return NextResponse.json({ ok: false, error: "route_identity_is_server_owned", fields: asserted }, { status: 400 });
  }

  const sourceSessionId = typeof body.sourceSessionId === "string" && uuidPattern.test(body.sourceSessionId) ? body.sourceSessionId : undefined;
  const isPartnerSession = sourceSessionId ? await isRcapPartnerScreeningSession(sourceSessionId) : false;

  const jurisdiction = body.jurisdiction.trim().slice(0, 120);

  // Re-derive route identity from the saved session's own stored answers. A
  // body claiming a different jurisdiction than the session it names is a
  // mismatch, not a save.
  const identity = await resolveSessionRouteIdentity(sourceSessionId, jurisdiction);
  if (identity.status === "jurisdiction_mismatch") {
    logSecurityWarn({ event: "briefcase_save_route_mismatch", route: "/api/expungement-ai/screening/save-result", outcome: "jurisdiction_mismatch", requestId });
    return NextResponse.json({ ok: false, error: "route_identity_mismatch" }, { status: 409 });
  }

  const locale = normalizeDeferralLocale(request.headers.get("accept-language"));
  const deferral = identity.status === "resolved" ? componentDeferralBundle(identity.trackId, locale) : null;

  const input = buildSaveInput(
    {
      userId: auth.userId,
      jurisdiction,
      resultCode: body.resultCode,
      pathwayLabel: typeof body.pathwayLabel === "string" ? body.pathwayLabel.slice(0, 200) : undefined,
      packetType: normalizePacketType(body.packetType),
      paymentAllowed: body.paymentAllowed === true,
      summary: typeof body.summary === "string" ? body.summary.slice(0, 500) : "Saved from your screening.",
      nextSteps: Array.isArray(body.nextSteps) ? body.nextSteps.filter((s): s is string => typeof s === "string").slice(0, 40) : [],
      sourceSessionId,
      // On an affected route the client's payment flag, packet type, summary
      // and next steps are all replaced by the registry bundle.
      ...(deferral
        ? {
          summary: deferral.summary,
          nextSteps: deferral.nextSteps,
          selectedTrackId: deferral.trackId,
          treatmentClassification: "component_deferral" as const,
          deferralComponentIds: deferral.componentIds,
          componentDeferralTreatment: deferral as unknown as Record<string, unknown>
        }
        : {})
    },
    { isPartnerSession }
  );

  const item = await saveScreeningResultToBriefcase(input);

  // Best-effort partner analytics: record the coarse outcome category by code.
  // No answers or record detail are stored; the RPC no-ops for DTC sessions.
  if (isPartnerSession && sourceSessionId) {
    await recordScreeningEligibilityResult(sourceSessionId, body.resultCode);
  }

  if (!deferral && isPartnerSession && isPacketReadyResult(body.resultCode) && isMississippiJurisdiction(body.jurisdiction)) {
    const packet = await attachMississippiPacketInformationRequest({
      userId: auth.userId,
      briefcaseItemId: item.id
    });
    return NextResponse.json({ ok: true, itemId: item.id, packetStatus: packet.packetStatus });
  }

  return NextResponse.json({ ok: true, itemId: item.id, packetStatus: item.packetStatus ?? "not_started" });
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

function isPacketReadyResult(resultCode: unknown): resultCode is "packet_ready" | "packet_ready_with_caution" {
  return resultCode === "packet_ready" || resultCode === "packet_ready_with_caution";
}

function isMississippiJurisdiction(jurisdiction: unknown) {
  if (typeof jurisdiction !== "string") return false;
  const normalized = jurisdiction.trim().toLowerCase();
  return normalized === "ms" || normalized === "mississippi";
}
