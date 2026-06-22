import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";

export type RcapPartnerIntakeContext = {
  partnerSlug: string;
  partnerName: string;
  organizationName: string;
  programName: string | null;
  serviceArea: string | null;
  jurisdiction: string;
  logoUrl: string | null;
};

export type RcapPartnerClaimResult =
  | {
      ok: true;
      sessionId: string;
      screeningsUsed: number;
      screeningsAllowed: number;
    }
  | {
      ok: false;
      reason: "partner_inactive" | "capacity_full";
      screeningsUsed: number | null;
      screeningsAllowed: number | null;
    };

type PartnerContextRow = {
  partner_slug: string;
  partner_name: string | null;
  organization_name: string | null;
  program_name: string | null;
  service_area: string | null;
  target_state: string | null;
  state: string | null;
  logo_url: string | null;
  payment_status: string | null;
  qualification_status: string | null;
  provisioning_status: string | null;
};

type ClaimRpcRow = {
  ok: boolean;
  session_id: string | null;
  reason: string | null;
  screenings_used: number | null;
  screenings_allowed: number | null;
};

export async function resolveRcapPartnerIntakeContext(partnerSlug: string): Promise<RcapPartnerIntakeContext | null> {
  const slug = normalizePartnerSlug(partnerSlug);
  if (!slug) return null;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("partner_records")
    .select("partner_slug, partner_name, organization_name, program_name, service_area, target_state, state, logo_url, payment_status, qualification_status, provisioning_status")
    .eq("partner_slug", slug)
    .maybeSingle<PartnerContextRow>();

  if (error || !data || !isActiveRcapPartner(data)) return null;

  const jurisdiction = normalizeJurisdiction(data.target_state ?? data.state);
  if (!jurisdiction) return null;

  return {
    partnerSlug: data.partner_slug,
    partnerName: data.partner_name ?? data.partner_slug,
    organizationName: data.organization_name ?? data.partner_name ?? data.partner_slug,
    programName: data.program_name,
    serviceArea: data.service_area,
    jurisdiction,
    logoUrl: data.logo_url
  };
}

export async function claimRcapPartnerScreeningSession(input: {
  partnerSlug: string;
  jurisdiction: string;
}): Promise<RcapPartnerClaimResult> {
  const slug = normalizePartnerSlug(input.partnerSlug);
  const jurisdiction = normalizeJurisdiction(input.jurisdiction);
  if (!slug || !jurisdiction) {
    return { ok: false, reason: "partner_inactive", screeningsUsed: null, screeningsAllowed: null };
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { ok: false, reason: "partner_inactive", screeningsUsed: null, screeningsAllowed: null };
  }

  const { data, error } = await supabase.rpc("claim_rcap_screening_session", {
    p_partner_slug: slug,
    p_jurisdiction: jurisdiction
  });

  if (error) {
    return { ok: false, reason: "partner_inactive", screeningsUsed: null, screeningsAllowed: null };
  }

  const row = Array.isArray(data) ? data[0] as ClaimRpcRow | undefined : data as ClaimRpcRow | undefined;
  if (!row) {
    return { ok: false, reason: "partner_inactive", screeningsUsed: null, screeningsAllowed: null };
  }

  if (row.ok && row.session_id) {
    return {
      ok: true,
      sessionId: row.session_id,
      screeningsUsed: row.screenings_used ?? 0,
      screeningsAllowed: row.screenings_allowed ?? 0
    };
  }

  return {
    ok: false,
    reason: row.reason === "capacity_full" ? "capacity_full" : "partner_inactive",
    screeningsUsed: row.screenings_used,
    screeningsAllowed: row.screenings_allowed
  };
}

function isActiveRcapPartner(row: PartnerContextRow) {
  return (
    (row.payment_status === "paid" || row.payment_status === "demo_paid") &&
    row.qualification_status === "qualified" &&
    (row.provisioning_status === "provisioned" || row.provisioning_status === "active")
  );
}

function normalizePartnerSlug(value: string) {
  const trimmed = value.trim();
  return /^[a-zA-Z0-9_-]+$/.test(trimmed) ? trimmed : "";
}

function normalizeJurisdiction(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase() ?? "";
  return /^[A-Z]{2,3}$/.test(normalized) ? normalized : "";
}
