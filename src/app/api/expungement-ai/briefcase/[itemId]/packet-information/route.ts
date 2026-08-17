import { NextResponse } from "next/server";

import { getRcapBriefcaseAuthState } from "@/lib/rcap/briefcase/auth";
import {
  getBriefcaseItem,
  isPartnerSponsoredPacketItem,
  mergeBriefcaseArtifactRefs
} from "@/lib/expungement-ai/briefcase";
import { packetInformationPatch } from "@/lib/expungement-ai/packet-information";
import type { AnswerValue } from "@/lib/expungement-ai/frontend/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxPayloadBytes = 60_000;

export async function POST(
  request: Request,
  context: { params: Promise<{ itemId: string }> }
) {
  const auth = await getRcapBriefcaseAuthState();
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });
  }

  const { itemId } = await context.params;
  const item = await getBriefcaseItem(auth.userId, itemId);
  if (!item) {
    return NextResponse.json({ ok: false, error: "matter_not_found" }, { status: 404 });
  }

  const packetResult = item.resultCode === "packet_ready" || item.resultCode === "packet_ready_with_caution";
  const sponsored = await isPartnerSponsoredPacketItem(item);
  if (!packetResult || (!item.paymentAllowed && !sponsored)) {
    return NextResponse.json({ ok: false, error: "packet_information_unavailable" }, { status: 403 });
  }

  const parsed = await readBody(request);
  if (!parsed.ok) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const update = packetInformationPatch({
    existingItem: item,
    answers: parsed.answers,
    reviewed: parsed.reviewed
  });
  if (!update) {
    return NextResponse.json({ ok: false, error: "packet_plan_unavailable" }, { status: 409 });
  }

  const saved = await mergeBriefcaseArtifactRefs(auth.userId, item.id, update.patch);
  if (!saved) {
    return NextResponse.json({ ok: false, error: "save_failed" }, { status: 503 });
  }

  return NextResponse.json({
    ok: true,
    itemId: item.id,
    readyToGenerate: update.readyToGenerate,
    reviewReason: update.reviewReason,
    missingInputIds: update.missingInputIds,
    reviewPath: `/briefcase/${encodeURIComponent(item.id)}/review`
  });
}

async function readBody(request: Request): Promise<
  { ok: true; answers: Record<string, AnswerValue>; reviewed: boolean }
  | { ok: false }
> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxPayloadBytes) return { ok: false };
  const text = await request.text().catch(() => "");
  if (new TextEncoder().encode(text).length > maxPayloadBytes) return { ok: false };
  try {
    const body = JSON.parse(text) as { answers?: unknown; reviewed?: unknown };
    if (!body.answers || typeof body.answers !== "object" || Array.isArray(body.answers)) return { ok: false };
    return {
      ok: true,
      answers: body.answers as Record<string, AnswerValue>,
      reviewed: body.reviewed === true
    };
  } catch {
    return { ok: false };
  }
}
