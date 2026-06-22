import "server-only";

import { emitPartnerUsageWindowEvent } from "@/lib/expungement-ai/nudge-os-events";
import { getSupabaseAdminClient } from "@/lib/supabase/server";

export type RcapSlotLifecycleResult = {
  ok: boolean;
  error?: string;
};

type UsageWindowRow = {
  partner_slug: string;
  screenings_used: number;
  screenings_allowed: number;
  period_label?: string | null;
};

export async function consumeRcapScreeningSession(sessionId: string): Promise<RcapSlotLifecycleResult> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, error: "supabase_not_configured" };

  try {
    const { error } = await supabase.rpc("consume_rcap_screening_session", {
      p_session_id: sessionId
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "consume_failed" };
  }
}

export async function releaseExpiredRcapScreeningSlots(now?: string): Promise<RcapSlotLifecycleResult> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, error: "supabase_not_configured" };

  try {
    const { data, error } = await supabase.rpc("release_expired_rcap_screening_slots", {
      p_now: now ?? new Date().toISOString()
    });
    if (error) return { ok: false, error: error.message };
    await emitUsageRows(data);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "release_failed" };
  }
}

export async function recomputeRcapPartnerEntitlements(options: {
  partnerSlug?: string;
  now?: string;
} = {}): Promise<RcapSlotLifecycleResult> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, error: "supabase_not_configured" };

  try {
    const { data, error } = await supabase.rpc("recompute_rcap_partner_entitlements", {
      p_partner_slug: options.partnerSlug ?? null,
      p_now: options.now ?? new Date().toISOString()
    });
    if (error) return { ok: false, error: error.message };
    await emitUsageRows(data);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "recompute_failed" };
  }
}

async function emitUsageRows(rows: unknown) {
  if (!Array.isArray(rows)) return;
  await Promise.all(rows.map((row) => emitUsageRow(row as UsageWindowRow)));
}

async function emitUsageRow(row: UsageWindowRow) {
  await emitPartnerUsageWindowEvent({
    partner_slug: row.partner_slug,
    screenings_allowed: row.screenings_allowed,
    screenings_used: row.screenings_used,
    at_capacity: row.screenings_used >= row.screenings_allowed,
    period_label: row.period_label ?? undefined
  });
}
