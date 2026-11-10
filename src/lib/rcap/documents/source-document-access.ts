import "server-only";
import { getRcapBriefcaseAuthState } from "@/lib/rcap/briefcase/auth";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { isParticipantAccountBlocked } from "@/lib/expungement-ai/privacy/account-status";
const CLINIC_DOCUMENT_CONSENT_VERSION = "clinic-assistance-documents-v2";

export type SourceDocumentAccess = Readonly<{ userId: string; actorUserId: string; clinicCaseId?: string; matterId?: string; partnerSlug?: string }>;
const issued = new WeakSet<object>();
const uuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export async function resolveSourceDocumentAccess(context?: { clinicCaseId?: string | null }): Promise<
  { ok: true; access: SourceDocumentAccess } | { ok: false; status: number; error: string }
> {
  try {
    const auth = await getRcapBriefcaseAuthState();
    if (!auth.isAuthenticated || !auth.userId) return { ok: false, status: 401, error: "Sign in to continue." };
    if (auth.isVerified !== true || await isParticipantAccountBlocked(auth.userId)) return denied();
    let access: SourceDocumentAccess = { userId: auth.userId, actorUserId: auth.userId };
    if (context?.clinicCaseId) {
      if (!uuid(context.clinicCaseId)) return denied();
      const db = getSupabaseAdminClient();
      if (!db) return denied();
      const member = await db.from("partner_users").select("id,partner_slug,role")
        .eq("auth_user_id", auth.userId).eq("status", "active").maybeSingle();
      if (member.error || !member.data?.partner_slug || !["partner_staff", "partner_admin"].includes(member.data.role)) return denied();
      const c = await db.from("clinic_cases").select("id,event_id,participant_user_id,assisted_session_id,screening_session_id,matter_id")
        .eq("id", context.clinicCaseId).maybeSingle();
      if (c.error || !c.data?.matter_id || !c.data.assisted_session_id || !c.data.screening_session_id) return denied();
      const s = await db.from("clinic_assisted_sessions")
        .select("id,event_staff_id,consent_version,consented_at,status,expires_at,ended_at")
        .eq("id", c.data.assisted_session_id).eq("event_id", c.data.event_id)
        .eq("participant_user_id", c.data.participant_user_id).eq("screening_session_id", c.data.screening_session_id)
        .in("status", ["active", "handed_off"]).is("ended_at", null).gt("expires_at", new Date().toISOString()).maybeSingle();
      if (s.error || !s.data || s.data.consent_version !== CLINIC_DOCUMENT_CONSENT_VERSION
        || !Number.isFinite(Date.parse(s.data.consented_at)) || Date.parse(s.data.consented_at) > Date.now()) return denied();
      const staff = await db.from("clinic_event_staff").select("id")
        .eq("id", s.data.event_staff_id).eq("event_id", c.data.event_id).eq("partner_user_id", member.data.id)
        .eq("status", "approved").is("revoked_at", null).contains("permissions", ["assist"]).maybeSingle();
      const event = await db.from("clinic_events").select("id").eq("id", c.data.event_id)
        .eq("partner_slug", member.data.partner_slug).in("status", ["published", "paused"]).maybeSingle();
      if (staff.error || !staff.data || event.error || !event.data || await isParticipantAccountBlocked(c.data.participant_user_id)) return denied();
      const item = await db.from("consumer_briefcase_items").select("id,source_session_id")
        .eq("id", c.data.matter_id).eq("user_id", c.data.participant_user_id).eq("source_session_id", c.data.screening_session_id).maybeSingle();
      if (item.error || !item.data) return denied();
      access = { userId: c.data.participant_user_id, actorUserId: auth.userId, clinicCaseId: c.data.id, matterId: item.data.id, partnerSlug: member.data.partner_slug };
    }
    access = Object.freeze(access); issued.add(access);
    return { ok: true, access };
  } catch { return { ok: false, status: 503, error: "Document access could not be verified." }; }
}
function denied() { return { ok: false as const, status: 403, error: "This document is not available." }; }

export async function sourceDocumentAccessIsCurrent(access: SourceDocumentAccess): Promise<boolean> {
  if (!access || !issued.has(access)) return false;
  const current = await resolveSourceDocumentAccess({ clinicCaseId: access.clinicCaseId });
  return current.ok && JSON.stringify(current.access) === JSON.stringify(access);
}

/** A staff grant must join the exact immutable packet-created event before any packet body is read. */
export async function sourceAccessOwnsPacket(packetId: string, access: SourceDocumentAccess): Promise<boolean> {
  if (!await sourceDocumentAccessIsCurrent(access)) return false;
  if (!access.clinicCaseId) return true;
  const db = getSupabaseAdminClient(); if (!db) return false;
  const { data, error } = await db.from("rcap_record_events").select("partner_slug,metadata")
    .eq("record_type", "document_packet").eq("record_id", packetId).eq("event_type", "created").limit(2);
  return !error && data?.length === 1 && data[0].partner_slug === access.partnerSlug
    && data[0].metadata?.source === "rcap_document_packet_repository"
    && data[0].metadata.consumer_auth_user_id === access.userId
    && data[0].metadata.consumer_briefcase_item_id === access.matterId;
}

export async function sourceMatterIsCurrent(userId: string, matterId: string): Promise<boolean> {
  if (await isParticipantAccountBlocked(userId)) return false;
  const db = getSupabaseAdminClient(); if (!db) return false;
  const result = await db.from("consumer_briefcase_items").select("id").eq("id", matterId).eq("user_id", userId).maybeSingle();
  return !result.error && !!result.data;
}
