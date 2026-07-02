import { NextResponse } from "next/server";
import { safeAppRedirectPath } from "@/lib/auth/redirect";
import { getRcapBriefcaseAuthState } from "@/lib/rcap/briefcase/auth";
import { saveScreeningResultToBriefcase } from "@/lib/expungement-ai/briefcase";
import { buildSaveInput, normalizePacketType } from "@/lib/expungement-ai/save-result-policy";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { ExpungementAiResultCode } from "@/lib/expungement-ai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PendingRow = {
  pending_id: string;
  claimed_user_id: string | null;
  product: "expungement_ai_dtc" | "rcap_partner";
  jurisdiction: string;
  result_code: ExpungementAiResultCode;
  pathway_label: string | null;
  packet_type: string | null;
  payment_allowed: boolean;
  summary: string;
  next_steps: string[];
};

export async function POST(request: Request) {
  const auth = await getRcapBriefcaseAuthState();
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json({ ok: false, error: "auth_required" }, { status: 401 });
  }

  const body = await request.json().catch(() => null) as { pendingId?: string; next?: string } | null;
  const pendingId = body?.pendingId?.trim() ?? "";
  if (!uuidPattern.test(pendingId)) {
    return NextResponse.json({ ok: false, error: "invalid_pending" }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return NextResponse.json({ ok: false, error: "pending_storage_unavailable" }, { status: 503 });
  }

  const { data, error } = await supabase
    .from("consumer_pending_screening_results")
    .select("pending_id, claimed_user_id, product, jurisdiction, result_code, pathway_label, packet_type, payment_allowed, summary, next_steps")
    .eq("pending_id", pendingId)
    .maybeSingle<PendingRow>();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "pending_not_found" }, { status: 404 });
  }
  if (data.claimed_user_id && data.claimed_user_id !== auth.userId) {
    return NextResponse.json({ ok: false, error: "pending_claimed" }, { status: 403 });
  }

  const item = await saveScreeningResultToBriefcase(buildSaveInput({
    userId: auth.userId,
    jurisdiction: data.jurisdiction,
    resultCode: data.result_code,
    pathwayLabel: data.pathway_label ?? undefined,
    packetType: normalizePacketType(data.packet_type),
    paymentAllowed: data.payment_allowed,
    summary: data.summary,
    nextSteps: Array.isArray(data.next_steps) ? data.next_steps : [],
    sourceSessionId: data.product === "rcap_partner" ? data.pending_id : undefined
  }, { isPartnerSession: data.product === "rcap_partner" }));

  await supabase
    .from("consumer_pending_screening_results")
    .update({ claimed_at: new Date().toISOString(), claimed_user_id: auth.userId })
    .eq("pending_id", pendingId)
    .is("claimed_user_id", null);

  const fallbackNext = safeAppRedirectPath(body?.next, "/briefcase");
  const redirectTo = data.product === "rcap_partner" || !item.paymentAllowed
    ? "/briefcase"
    : `/expungement-ai/pay?briefcaseItemId=${encodeURIComponent(item.id)}`;

  return NextResponse.json({ ok: true, itemId: item.id, redirectTo: safeAppRedirectPath(redirectTo, fallbackNext) });
}
