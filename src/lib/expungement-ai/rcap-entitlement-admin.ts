import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";

export type RcapPartnerAllowance = {
  partnerSlug: string;
  screeningsAllowed: number;
  screeningsUsed: number;
  contractNote: string | null;
  periodLabel: string | null;
  warning: string | null;
  hasEntitlement: boolean;
};

export type UpdateRcapPartnerAllowanceInput = {
  partnerSlug: string;
  screeningsAllowed: number;
  contractNote?: string | null;
  periodLabel?: string | null;
};

type PartnerEntitlementRow = {
  partner_slug: string;
  screenings_allowed: number;
  screenings_used: number;
  contract_note: string | null;
  period_label: string | null;
};

export class RcapPartnerAllowanceError extends Error {
  constructor(
    readonly code: "supabase_unconfigured" | "unknown_partner" | "invalid_allowance" | "read_failed" | "write_failed",
    message: string
  ) {
    super(message);
    this.name = "RcapPartnerAllowanceError";
  }
}

export async function getRcapPartnerAllowance(partnerSlug: string): Promise<RcapPartnerAllowance> {
  const slug = normalizePartnerSlug(partnerSlug);
  const supabase = requireAdminClient();
  await assertPartnerExists(supabase, slug);

  const { data, error } = await supabase
    .from("partner_entitlement")
    .select("partner_slug, screenings_allowed, screenings_used, contract_note, period_label")
    .eq("partner_slug", slug)
    .maybeSingle<PartnerEntitlementRow>();

  if (error) {
    throw new RcapPartnerAllowanceError("read_failed", "Could not read RCAP partner allowance.");
  }

  return allowanceFromRow(slug, data ?? null);
}

export async function updateRcapPartnerAllowance(input: UpdateRcapPartnerAllowanceInput): Promise<RcapPartnerAllowance> {
  const slug = normalizePartnerSlug(input.partnerSlug);
  assertValidAllowance(input.screeningsAllowed);
  const supabase = requireAdminClient();
  await assertPartnerExists(supabase, slug);

  const { data, error } = await supabase
    .from("partner_entitlement")
    .upsert({
      partner_slug: slug,
      screenings_allowed: input.screeningsAllowed,
      contract_note: cleanOptionalText(input.contractNote),
      period_label: cleanOptionalText(input.periodLabel)
    }, { onConflict: "partner_slug" })
    .select("partner_slug, screenings_allowed, screenings_used, contract_note, period_label")
    .single<PartnerEntitlementRow>();

  if (error || !data) {
    throw new RcapPartnerAllowanceError("write_failed", "Could not update RCAP partner allowance.");
  }

  return allowanceFromRow(slug, data);
}

export function validateScreeningsAllowed(value: unknown): number {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) return value;
  if (typeof value === "string" && /^\d+$/.test(value.trim())) return Number(value.trim());
  throw new RcapPartnerAllowanceError("invalid_allowance", "screenings_allowed must be a non-negative integer.");
}

function allowanceFromRow(partnerSlug: string, row: PartnerEntitlementRow | null): RcapPartnerAllowance {
  const screeningsAllowed = row?.screenings_allowed ?? 0;
  const screeningsUsed = row?.screenings_used ?? 0;
  return {
    partnerSlug,
    screeningsAllowed,
    screeningsUsed,
    contractNote: row?.contract_note ?? null,
    periodLabel: row?.period_label ?? null,
    warning: screeningsAllowed < screeningsUsed
      ? `Allowance is below current used count (${screeningsUsed}). New claims will stay blocked until usage falls below the allowance.`
      : null,
    hasEntitlement: Boolean(row)
  };
}

function requireAdminClient() {
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    throw new RcapPartnerAllowanceError("supabase_unconfigured", "Supabase service-role access is not configured.");
  }
  return supabase;
}

async function assertPartnerExists(supabase: NonNullable<ReturnType<typeof getSupabaseAdminClient>>, partnerSlug: string) {
  const { data, error } = await supabase
    .from("partner_records")
    .select("partner_slug")
    .eq("partner_slug", partnerSlug)
    .maybeSingle<{ partner_slug: string }>();

  if (error || !data) {
    throw new RcapPartnerAllowanceError("unknown_partner", "Unknown partner_slug.");
  }
}

function normalizePartnerSlug(value: string) {
  const slug = value.trim();
  if (!slug) throw new RcapPartnerAllowanceError("unknown_partner", "partner_slug is required.");
  return slug;
}

function assertValidAllowance(value: number) {
  if (!Number.isInteger(value) || value < 0) {
    throw new RcapPartnerAllowanceError("invalid_allowance", "screenings_allowed must be a non-negative integer.");
  }
}

function cleanOptionalText(value: string | null | undefined) {
  const text = value?.trim();
  return text ? text : null;
}
