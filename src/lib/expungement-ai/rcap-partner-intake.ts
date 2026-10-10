import { getProfileByJurisdiction } from "@/lib/rcap-engine/profile-registry";
import "server-only";
import { createHmac } from "node:crypto";

import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { hashAccessCode, normalizeAccessCode } from "@/lib/partners/access-code-crypto";
import type { PartnerAccessMode } from "@/lib/partners/partner-access-codes";
import {getApprovedPublicPageConfiguration} from "@/lib/partners/onboarding/public-page-configuration";
import { isPartnerActivationAuthorized } from "@/lib/partners/partner-public-eligibility";

export type RcapPartnerIntakeContext = {
  partnerSlug: string;
  partnerName: string;
  organizationName: string;
  programName: string | null;
  serviceArea: string | null;
  jurisdiction: string;
  jurisdictions: string[];
  spanishEnabled: boolean;
  logoUrl: string | null;
  accessMode: PartnerAccessMode;
};

// Result of the code-aware claim. On rejection the caller routes the user into
// the standard consumer experience (no partner benefit, no allocation used).
export type RcapPartnerCodeClaimResult =
  | {
      ok: true;
      sessionId: string;
      attributionSource: "partner_page" | "partner_code";
      campaignName: string | null;
    }
  | {
      ok: false;
      reason: "partner_inactive" | "jurisdiction_not_authorized" | "code_required" | "invalid" | "inactive" | "expired" | "exhausted";
    };

type CodeClaimRpcRow = {
  ok: boolean;
  session_id: string | null;
  reason: string | null;
  benefit_active: boolean | null;
  attribution_source: string | null;
  campaign_name: string | null;
  access_mode: string | null;
  code_id: string | null;
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
      reason: "partner_inactive" | "jurisdiction_not_authorized" | "code_required" | "capacity_full";
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
  access_mode: string | null;
};

type ClaimRpcRow = {
  ok: boolean;
  session_id: string | null;
  reason: string | null;
  screenings_used: number | null;
  screenings_allowed: number | null;
};

export async function resolveRcapPartnerIntakeContext(partnerSlug: string, selectedJurisdiction?: string): Promise<RcapPartnerIntakeContext | null> {
  const slug = normalizePartnerSlug(partnerSlug);
  if (!slug) return null;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("partner_records")
    .select("partner_slug, partner_name, organization_name, program_name, service_area, target_state, state, logo_url, payment_status, qualification_status, provisioning_status, access_mode")
    .eq("partner_slug", slug)
    .maybeSingle<PartnerContextRow>();

  const publication=await supabase.from("partner_onboarding").select("*").eq("partner_slug",slug).maybeSingle();
  const launchActivation=publication.data&&Object.prototype.hasOwnProperty.call(publication.data,"rcap_launch_operation_id")?await supabase.rpc("rcap_partner_activation_for_launch",{p_slug:slug}):null;
  if (
    error ||
    !data ||
    publication.error ||
    (launchActivation?launchActivation.error||launchActivation.data!==true:!isPartnerActivationAuthorized({
      paymentStatus: data.payment_status,
      qualificationStatus: data.qualification_status,
      provisioningStatus: data.provisioning_status
    }))
  ) {
    return null;
  }

  const scope = await supabase.rpc("rcap_program_screening_jurisdictions", { p_slug: slug });
  if (scope.error || !Array.isArray(scope.data)) return null;
  const jurisdictions = scope.data.filter((code:unknown):code is string => typeof code==="string" && Boolean(getProfileByJurisdiction(code)));
  if (!jurisdictions.length || jurisdictions.length!==scope.data.length) return null;
  const requested = selectedJurisdiction ? normalizeJurisdiction(selectedJurisdiction) : "";
  if (requested && !jurisdictions.includes(requested)) return null;
  const jurisdiction = requested || (jurisdictions.length===1 ? jurisdictions[0] : "");
  const branding = publication.data?.rcap_launch_operation_id ? await getApprovedPublicPageConfiguration(slug) : null;
  if (publication.data?.rcap_launch_operation_id && !branding) return null;

  return {
    partnerSlug: data.partner_slug,
    partnerName: data.partner_name ?? data.partner_slug,
    organizationName: branding?.preview.publicName.value ?? data.organization_name ?? data.partner_name ?? data.partner_slug,
    programName: branding?.preview.programName.value ?? data.program_name,
    serviceArea: data.service_area,
    jurisdiction, jurisdictions, spanishEnabled: branding?.preview.spanishEnabled === true,
    logoUrl: branding?.preview.showPartnerLogo&&branding.preview.logo.assetId?`/api/partners/public-page/${slug}/assets/${branding.preview.logo.assetId}`:data.logo_url,
    accessMode: normalizeAccessMode(branding?.accessMode ?? data.access_mode)
  };
}

export async function claimRcapPartnerScreeningSession(input: {
  partnerSlug: string;
  jurisdiction: string;
  clinicRedemptionHash?: string;
  requestId?: string;
  participantUserId?: string;
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

  const context = await resolveRcapPartnerIntakeContext(slug, jurisdiction);
  if (!context) return { ok:false, reason:"jurisdiction_not_authorized", screeningsUsed:null, screeningsAllowed:null };
  const { data, error } = input.requestId ? await supabase.rpc("rcap_service_claim_program_screening",{
    p_partner_slug:slug,p_jurisdiction:jurisdiction,p_mode:input.clinicRedemptionHash?"clinic":"ordinary",p_request_hash:screeningEntryRequestHash(input.requestId,input.participantUserId),p_clinic_redemption:input.clinicRedemptionHash??null
  }) : await supabase.rpc("claim_rcap_screening_session", {
    p_partner_slug: slug,
    p_jurisdiction: jurisdiction,
    ...(input.clinicRedemptionHash ? {p_clinic_redemption:input.clinicRedemptionHash} : {})
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
    reason: row.reason === "capacity_full" ? "capacity_full" : row.reason === "code_required" ? "code_required" : row.reason === "jurisdiction_not_authorized" ? "jurisdiction_not_authorized" : "partner_inactive",
    screeningsUsed: row.screenings_used,
    screeningsAllowed: row.screenings_allowed
  };
}

// Code-aware claim. The server resolves attribution from the partner's
// access_mode and the (optional) code; the client never asserts partner
// benefit. On rejection the caller sends the user to the standard consumer flow.
export async function claimPartnerScreeningSessionWithCode(input: {
  partnerSlug: string;
  jurisdiction: string;
  accessCode?: string | null;
  requestId?: string;
}): Promise<RcapPartnerCodeClaimResult> {
  const slug = normalizePartnerSlug(input.partnerSlug);
  const jurisdiction = normalizeJurisdiction(input.jurisdiction);
  if (!slug || !jurisdiction) {
    return { ok: false, reason: "partner_inactive" };
  }

  const normalizedCode = input.accessCode ? normalizeAccessCode(input.accessCode) : "";
  const codeHash = normalizedCode ? hashAccessCode(normalizedCode) : null;

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { ok: false, reason: "partner_inactive" };
  }

  const context = await resolveRcapPartnerIntakeContext(slug, jurisdiction);
  if (!context) return { ok:false, reason:"jurisdiction_not_authorized" };
  const { data, error } = input.requestId ? await supabase.rpc("rcap_service_claim_program_screening",{
    p_partner_slug:slug,p_jurisdiction:jurisdiction,p_mode:"code",p_request_hash:screeningEntryRequestHash(input.requestId),p_code_hash:codeHash
  }) : await supabase.rpc("claim_partner_screening_session", {
    p_partner_slug: slug,
    p_jurisdiction: jurisdiction,
    p_code_hash: codeHash
  });

  if (error) {
    return { ok: false, reason: "partner_inactive" };
  }

  const row = (Array.isArray(data) ? data[0] : data) as CodeClaimRpcRow | undefined;
  if (!row) {
    return { ok: false, reason: "partner_inactive" };
  }

  if (row.ok && row.session_id) {
    return {
      ok: true,
      sessionId: row.session_id,
      attributionSource: row.attribution_source === "partner_code" ? "partner_code" : "partner_page",
      campaignName: row.campaign_name ?? null
    };
  }

  return { ok: false, reason: normalizeClaimReason(row.reason) };
}

export function screeningEntryRequestHash(requestId:string,participantUserId?:string){
 const key=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!key||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId))throw new Error("The screening request could not be verified. Reload entry and try again.");
 return createHmac("sha256",key).update(JSON.stringify(["rcap-screening-entry-v1",requestId,participantUserId??null])).digest("hex");
}

type CodeClaimRejectReason = "partner_inactive" | "jurisdiction_not_authorized" | "code_required" | "invalid" | "inactive" | "expired" | "exhausted";

function normalizeClaimReason(reason: string | null): CodeClaimRejectReason {
  switch (reason) {
    case "jurisdiction_not_authorized":
    case "code_required":
    case "invalid":
    case "inactive":
    case "expired":
    case "exhausted":
      return reason;
    default:
      return "partner_inactive";
  }
}

function normalizeAccessMode(value: string | null | undefined): PartnerAccessMode {
  const modes: PartnerAccessMode[] = ["open", "optional_code", "required_code", "invite_only"];
  return value && (modes as string[]).includes(value) ? (value as PartnerAccessMode) : "open";
}

function normalizePartnerSlug(value: string) {
  const trimmed = value.trim();
  return /^[a-zA-Z0-9_-]+$/.test(trimmed) ? trimmed : "";
}

function normalizeJurisdiction(value: string | null | undefined) {
  const normalized = value?.trim().toUpperCase() ?? "";
  return /^[A-Z]{2,3}$/.test(normalized) ? normalized : "";
}
