import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { isStorableResultCode, normalizePacketType } from "@/lib/expungement-ai/save-result-policy";
import type { AnswerValue } from "@/lib/expungement-ai/frontend/contracts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const maxPayloadBytes = 40_000;
const packetReadyCodes = new Set(["packet_ready", "packet_ready_with_caution"]);

export async function POST(request: Request) {
  const parsed = await readJson(request);
  if (!parsed.ok) return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });

  const body = parsed.value;
  if (
    typeof body.jurisdiction !== "string" ||
    !isStorableResultCode(body.resultCode) ||
    body.paymentAllowed !== true ||
    !packetReadyCodes.has(body.resultCode)
  ) {
    return NextResponse.json({ ok: false, error: "invalid_request" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "pending_storage_unavailable" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("consumer_pending_screening_results")
    .insert({
      product: body.product === "rcap_partner" ? "rcap_partner" : "expungement_ai_dtc",
      jurisdiction: body.jurisdiction.slice(0, 120),
      result_code: body.resultCode,
      pathway_label: typeof body.pathwayLabel === "string" ? body.pathwayLabel.slice(0, 200) : null,
      packet_type: normalizePacketType(body.packetType) ?? null,
      payment_allowed: true,
      summary: typeof body.summary === "string" ? body.summary.slice(0, 500) : "Saved from your screening.",
      next_steps: Array.isArray(body.nextSteps) ? body.nextSteps.filter((step): step is string => typeof step === "string").slice(0, 40) : [],
      screening_answers: isRecord(body.answers) ? body.answers : {},
      profile_version: typeof body.profileVersion === "string" ? body.profileVersion.slice(0, 120) : null,
      matter_id: typeof body.matterId === "string" ? body.matterId.slice(0, 120) : null,
      packet_plan: isRecord(body.packetPlan) ? body.packetPlan : {}
    })
    .select("pending_id")
    .single<{ pending_id: string }>();

  if (error || !data?.pending_id) {
    return NextResponse.json({ ok: false, error: "pending_storage_failed" }, { status: 503 });
  }

  return NextResponse.json({ ok: true, pendingId: data.pending_id });
}

type PendingCreateBody = {
  product?: unknown;
  jurisdiction?: unknown;
  resultCode?: unknown;
  pathwayLabel?: unknown;
  packetType?: unknown;
  paymentAllowed?: unknown;
  summary?: unknown;
  nextSteps?: unknown;
  answers?: Record<string, AnswerValue>;
  profileVersion?: unknown;
  matterId?: unknown;
  packetPlan?: unknown;
};

async function readJson(request: Request): Promise<{ ok: true; value: PendingCreateBody } | { ok: false }> {
  const contentLength = request.headers.get("content-length");
  if (contentLength && Number(contentLength) > maxPayloadBytes) return { ok: false };
  const text = await request.text().catch(() => "");
  if (new TextEncoder().encode(text).length > maxPayloadBytes) return { ok: false };
  try {
    return { ok: true, value: JSON.parse(text) as PendingCreateBody };
  } catch {
    return { ok: false };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}
