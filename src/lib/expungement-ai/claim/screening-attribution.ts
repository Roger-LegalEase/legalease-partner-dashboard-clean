import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/server";

/**
 * Attribution is read from the server's own record of the anonymous screening
 * session. It is never accepted from the browser.
 *
 * Contract §5: attribution does not become ownership. Partner, program, event,
 * campaign, access code, consent and locale travel with the pending result and
 * are copied onto the matter at claim time, which is what lets a partner sponsor
 * a matter it does not own.
 */

export type ScreeningAttribution = {
  /** True only when the server can see a sponsored RCAP partner session. */
  isPartnerSession: boolean;
  partnerSlug: string | null;
  programId: string | null;
  eventId: string | null;
  campaignName: string | null;
  accessCodeId: string | null;
  consentGrantId: string | null;
};

export const emptyScreeningAttribution: ScreeningAttribution = {
  isPartnerSession: false,
  partnerSlug: null,
  programId: null,
  eventId: null,
  campaignName: null,
  accessCodeId: null,
  consentGrantId: null
};

type ScreeningSessionRow = {
  session_id: string;
  flow_mode: string | null;
  partner_slug: string | null;
  partner_benefit_active: boolean | null;
  campaign_name: string | null;
  partner_access_code_id: string | null;
};

type AssistedSessionRow = {
  id: string;
  event_id: string;
};

type ClinicEventRow = {
  id: string;
  program_key: string | null;
};

/**
 * Resolves what the server knows about an anonymous screening session.
 *
 * A caller that passes an unknown or non-partner session gets the empty
 * attribution rather than an error: an ordinary DTC screening has no partner,
 * and that is not a failure.
 */
export async function resolveScreeningAttribution(
  anonymousSessionId: string | null | undefined
): Promise<ScreeningAttribution> {
  if (!anonymousSessionId) return emptyScreeningAttribution;

  const supabase = getSupabaseAdminClient();
  if (!supabase) return emptyScreeningAttribution;

  const session = await supabase
    .from("screening_sessions")
    .select("session_id, flow_mode, partner_slug, partner_benefit_active, campaign_name, partner_access_code_id")
    .eq("session_id", anonymousSessionId)
    .maybeSingle<ScreeningSessionRow>();

  if (session.error || !session.data) return emptyScreeningAttribution;

  const row = session.data;
  const isPartnerSession = row.flow_mode === "rcap"
    && row.partner_benefit_active === true
    && Boolean(row.partner_slug);

  // The Clinic assisted session is the consent record. Only a live one counts:
  // consent that has ended, expired or been reset is not consent.
  const assisted = await supabase
    .from("clinic_assisted_sessions")
    .select("id, event_id")
    .eq("screening_session_id", anonymousSessionId)
    .in("status", ["active", "handed_off"])
    .gt("expires_at", new Date().toISOString())
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle<AssistedSessionRow>();

  const eventId = assisted.error ? null : assisted.data?.event_id ?? null;
  const consentGrantId = assisted.error ? null : assisted.data?.id ?? null;

  let programId: string | null = null;
  if (eventId) {
    const event = await supabase
      .from("clinic_events")
      .select("id, program_key")
      .eq("id", eventId)
      .maybeSingle<ClinicEventRow>();
    programId = event.error ? null : event.data?.program_key ?? null;
  }

  return {
    isPartnerSession,
    partnerSlug: row.partner_slug ?? null,
    programId,
    eventId,
    campaignName: row.campaign_name ?? null,
    accessCodeId: row.partner_access_code_id ?? null,
    consentGrantId
  };
}
