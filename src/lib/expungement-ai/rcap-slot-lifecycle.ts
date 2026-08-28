import "server-only";
import { assertPacketFulfillmentProven } from "@/lib/expungement-ai/packet-fulfillment-authority";

import { emitPartnerUsageWindowEvent } from "@/lib/expungement-ai/nudge-os-events";
import { assertExpectedPacketVerificationHash } from "@/lib/expungement-ai/verification-cas";
import type { ConsumerPacketArtifactRefs } from "@/lib/expungement-ai/packet-generation";
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

export function shouldConsumePartnerPacketCap(input: {
  isPartnerCovered: boolean;
  packetWasAlreadyReady: boolean;
}) {
  return input.isPartnerCovered && !input.packetWasAlreadyReady;
}

export async function recordPartnerPacketUsage(sessionId: string): Promise<RcapSlotLifecycleResult> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, error: "supabase_not_configured" };

  try {
    const { error } = await supabase.rpc("record_rcap_partner_packet_generation", {
      p_session_id: sessionId
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "record_packet_usage_failed" };
  }
}

export type PartnerPacketRecordResult = {
  ok: boolean;
  recorded: boolean;
  countedAs: "included" | "overage" | "capped" | "not_counted";
  reason?: string;
  error?: string;
};

/**
 * Atomic sponsored completion boundary. Captain-owned SQL compares protected
 * verification, consumes exactly one included/overage credit, merges the
 * prepared artifact into the existing envelope, and sets Ready in one locked
 * transaction. A refusal must perform none of those mutations.
 */
export async function finalizeSponsoredPacketGeneration(input: {
  sessionId: string;
  briefcaseItemId: string;
  expectedVerificationHash: string;
  artifactRefs: ConsumerPacketArtifactRefs;
  /**
   * The route the credit is being spent on. Optional only because existing
   * callers predate the fulfillment gate; when supplied it is checked, and a
   * caller that omits it cannot use that omission to spend a credit on an
   * unproven route because the generation surface has already refused.
   */
  fulfillmentRoute?: { jurisdiction: string | null | undefined; pathwayId: string | null | undefined };
}): Promise<PartnerPacketRecordResult> {
  try {
    // Packet credit consumption. A credit is spent once and is not refunded by
    // discovering afterwards that the artifact was a text file.
    if (input.fulfillmentRoute) {
      assertPacketFulfillmentProven(
        input.fulfillmentRoute.jurisdiction,
        input.fulfillmentRoute.pathwayId,
        "packet credit consumption"
      );
    }
    assertExpectedPacketVerificationHash(input.expectedVerificationHash);
  } catch (error) {
    return {
      ok: false,
      recorded: false,
      countedAs: "not_counted",
      error: error instanceof Error ? error.message : "invalid_verification_hash"
    };
  }
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, recorded: false, countedAs: "not_counted", error: "supabase_not_configured" };

  try {
    const { data, error } = await supabase.rpc("finalize_sponsored_packet_generation_if_verified", {
      p_session_id: input.sessionId,
      p_briefcase_item_id: input.briefcaseItemId,
      p_expected_verification_hash: input.expectedVerificationHash,
      p_packet_artifact: input.artifactRefs
    });
    if (error) return { ok: false, recorded: false, countedAs: "not_counted", error: error.message };
    const row = (Array.isArray(data) ? data[0] : data) as
      | { ok?: boolean; recorded?: boolean; counted_as?: string; reason?: string | null }
      | undefined;
    if (row?.ok !== true) {
      return {
        ok: false,
        recorded: false,
        countedAs: "not_counted",
        reason: row?.reason ?? "sponsored_finalization_refused"
      };
    }
    return {
      ok: true,
      recorded: Boolean(row.recorded),
      countedAs: (row.counted_as ?? "not_counted") as PartnerPacketRecordResult["countedAs"],
      reason: row.reason ?? undefined
    };
  } catch (error) {
    return {
      ok: false,
      recorded: false,
      countedAs: "not_counted",
      error: error instanceof Error ? error.message : "sponsored_finalization_failed"
    };
  }
}

// Overage-aware packet-credit consumption. Idempotent at the database level
// (a slot is consumed only once), so duplicate webhook/generation retries never
// double-count. Kept separate from the DTC generator so consumer packet
// generation carries no partner cap logic.
export async function recordPartnerPacketGeneration(input: {
  sessionId: string;
  briefcaseItemId: string;
  expectedVerificationHash: string;
}): Promise<PartnerPacketRecordResult> {
  try {
    assertExpectedPacketVerificationHash(input.expectedVerificationHash);
  } catch (error) {
    return {
      ok: false,
      recorded: false,
      countedAs: "not_counted",
      error: error instanceof Error ? error.message : "invalid_verification_hash"
    };
  }
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, recorded: false, countedAs: "not_counted", error: "supabase_not_configured" };

  try {
    // The captain-owned migration adds briefcase-item and expected-hash CAS
    // parameters to this RPC; the existing production signature is preserved
    // until that database change lands.
    const { data, error } = await supabase.rpc("record_partner_packet_generation", {
      p_session_id: input.sessionId
    });
    if (error) return { ok: false, recorded: false, countedAs: "not_counted", error: error.message };
    const row = (Array.isArray(data) ? data[0] : data) as
      | { recorded?: boolean; counted_as?: string; reason?: string | null }
      | undefined;
    return {
      ok: true,
      recorded: Boolean(row?.recorded),
      countedAs: (row?.counted_as ?? "not_counted") as PartnerPacketRecordResult["countedAs"],
      reason: row?.reason ?? undefined
    };
  } catch (error) {
    return {
      ok: false,
      recorded: false,
      countedAs: "not_counted",
      error: error instanceof Error ? error.message : "record_partner_packet_generation_failed"
    };
  }
}

export type PartnerPacketCapDecision = {
  // Whether this session is a partner-benefit session at all.
  partnerBenefit: boolean;
  // When true, sponsored generation must not be promised (pause_at_cap at cap).
  pausedAtCap: boolean;
};

// Read-only check used to decide whether to promise sponsored packet generation.
// Never mutates. Fails open to partnerBenefit=false when data is missing.
export async function resolvePartnerPacketCapDecision(sessionId: string): Promise<PartnerPacketCapDecision> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { partnerBenefit: false, pausedAtCap: false };

  const { data: session } = await supabase
    .from("screening_sessions")
    .select("partner_slug, partner_benefit_active, flow_mode")
    .eq("session_id", sessionId)
    .maybeSingle<{ partner_slug: string | null; partner_benefit_active: boolean | null; flow_mode: string | null }>();

  if (!session || session.flow_mode !== "rcap" || !session.partner_slug || session.partner_benefit_active !== true) {
    return { partnerBenefit: false, pausedAtCap: false };
  }

  const { data: ent } = await supabase
    .from("partner_entitlement")
    .select("screenings_allowed, screenings_used, pause_at_cap")
    .eq("partner_slug", session.partner_slug)
    .maybeSingle<{ screenings_allowed: number; screenings_used: number; pause_at_cap: boolean }>();

  if (!ent) return { partnerBenefit: true, pausedAtCap: false };

  const atCap = ent.screenings_used >= ent.screenings_allowed;
  return { partnerBenefit: true, pausedAtCap: Boolean(ent.pause_at_cap) && atCap };
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
