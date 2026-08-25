import "server-only";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { getServerAuthState } from "@/lib/supabase/auth-server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { resolveSessionPartner } from "@/lib/partners/session-partner";
import { ClinicServiceError } from "@/lib/clinic-mode/service";
import type { ClinicParticipantSession, ClinicQueueCase, PublicClinicEvent } from "@/lib/clinic-mode/types";

export async function getPublicClinicEvent(eventSlug: string): Promise<PublicClinicEvent> {
  const db = requireDatabase();
  const result = await db.from("clinic_events").select("id,public_slug,name,starts_at,ends_at,timezone,location_name,geography,status")
    .eq("public_slug", normalizeSlug(eventSlug)).eq("status", "published").maybeSingle();
  if (result.error) throw new ClinicServiceError("unavailable", "Clinic entry is temporarily unavailable.");
  if (!result.data) throw new ClinicServiceError("not_found", "This Clinic event is not open.");
  return mapPublicEvent(result.data);
}

export async function getClinicParticipantSession(eventSlug: string): Promise<ClinicParticipantSession> {
  const auth = await getServerAuthState();
  if (!auth.isAuthenticated) throw new ClinicServiceError("unauthenticated", "Sign in as the participant to continue.");
  const rawToken = (await cookies()).get("clinic_session")?.value;
  if (!rawToken) throw new ClinicServiceError("forbidden", "This device has no active Clinic handoff.");
  const tokenHash = sha256(rawToken);
  const db = requireDatabase();
  const sessionResult = await db.from("clinic_assisted_sessions")
    .select("id,event_id,participant_user_id,screening_session_id,status,expires_at")
    .eq("handoff_token_hash", tokenHash).eq("participant_user_id", auth.userId)
    .in("status", ["active", "handed_off"]).gt("expires_at", new Date().toISOString()).maybeSingle();
  if (sessionResult.error) throw new ClinicServiceError("unavailable", "Clinic handoff validation failed.");
  if (!sessionResult.data?.screening_session_id) throw new ClinicServiceError("forbidden", "The Clinic handoff is no longer active.");
  const eventResult = await db.from("clinic_events").select("public_slug").eq("id", sessionResult.data.event_id).eq("public_slug", normalizeSlug(eventSlug)).maybeSingle();
  if (eventResult.error || !eventResult.data) throw new ClinicServiceError("forbidden", "The Clinic event does not match this handoff.");
  const screeningResult = await db.from("screening_sessions").select("jurisdiction").eq("session_id", sessionResult.data.screening_session_id).maybeSingle();
  if (screeningResult.error || !screeningResult.data) throw new ClinicServiceError("forbidden", "The nationwide screening session is unavailable.");
  return {
    id: String(sessionResult.data.id), eventId: String(sessionResult.data.event_id), eventSlug: String(eventResult.data.public_slug),
    participantUserId: String(sessionResult.data.participant_user_id), screeningSessionId: String(sessionResult.data.screening_session_id),
    jurisdiction: String(screeningResult.data.jurisdiction),
    status: sessionResult.data.status as ClinicParticipantSession["status"], expiresAt: String(sessionResult.data.expires_at)
  };
}

export async function getClinicEntryContext(eventSlug: string) {
  const rawToken = (await cookies()).get("clinic_entry")?.value;
  if (!rawToken) throw new ClinicServiceError("forbidden", "Enter the event access code on this device first.");
  const db = requireDatabase();
  const redemption = await db.from("clinic_event_access_redemptions").select("event_id,redeemed_at")
    .eq("redemption_nonce_hash", sha256(rawToken)).gt("redeemed_at", new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()).maybeSingle();
  if (redemption.error || !redemption.data) throw new ClinicServiceError("forbidden", "The event entry handoff expired.");
  const event = await db.from("clinic_events").select("id,partner_slug,public_slug,name,status")
    .eq("id", redemption.data.event_id).eq("public_slug", normalizeSlug(eventSlug)).eq("status", "published").maybeSingle();
  if (event.error || !event.data) throw new ClinicServiceError("forbidden", "The event entry handoff does not match this Clinic.");
  return { eventId: String(event.data.id), partnerSlug: String(event.data.partner_slug), eventSlug: String(event.data.public_slug), eventName: String(event.data.name) };
}

export async function listApprovedClinicStaff(eventId: string) {
  const db = requireDatabase();
  const result = await db.from("clinic_event_staff").select("id,permissions").eq("event_id", eventId).eq("status", "approved").contains("permissions", ["assist"]).order("approved_at");
  if (result.error) throw new ClinicServiceError("unavailable", "Approved Clinic staff are unavailable.");
  return (result.data ?? []).map((row, index) => ({ id: String(row.id), label: `Approved staff ${index + 1}` }));
}

export async function listClinicQueue(eventId: string): Promise<ClinicQueueCase[]> {
  await assertQueueAccess(eventId);
  const result = await requireDatabase().from("clinic_cases")
    .select("id,event_id,participant_user_id,queue_status,route_disposition,jurisdiction,court_identity_verified,county_name,court_name,follow_up_due_at,last_activity_at")
    .eq("event_id", eventId).order("last_activity_at", { ascending: false });
  if (result.error) throw new ClinicServiceError("unavailable", "Clinic queue is temporarily unavailable.");
  return (result.data ?? []).map((row) => ({
    id: String(row.id), eventId: String(row.event_id), participantUserId: String(row.participant_user_id),
    queueStatus: row.queue_status as ClinicQueueCase["queueStatus"], routeDisposition: row.route_disposition as ClinicQueueCase["routeDisposition"],
    jurisdiction: String(row.jurisdiction), courtIdentityVerified: Boolean(row.court_identity_verified),
    countyName: row.county_name ? String(row.county_name) : null, courtName: row.court_name ? String(row.court_name) : null,
    followUpDueAt: row.follow_up_due_at ? String(row.follow_up_due_at) : null, lastActivityAt: String(row.last_activity_at)
  }));
}

export async function transitionClinicQueueCase(eventId: string, caseId: string, queueStatus: ClinicQueueCase["queueStatus"]) {
  const actor = await assertQueueAccess(eventId);
  const db = requireDatabase();
  const scope = await db.from("clinic_cases").select("id").eq("id", caseId).eq("event_id", eventId).maybeSingle();
  if (scope.error || !scope.data) throw new ClinicServiceError("not_found", "Clinic case was not found in this event.");
  const result = await db.rpc("clinic_transition_case", {
    p_case_id: caseId, p_actor_user_id: actor.authUserId, p_queue_status: queueStatus,
    p_follow_up_owner_staff_id: null, p_follow_up_due_at: null
  });
  if (result.error || result.data !== "updated") throw new ClinicServiceError(result.data === "forbidden" ? "forbidden" : "conflict", "Clinic queue transition was denied.");
  return "updated";
}

async function assertQueueAccess(eventId: string) {
  const actor = await resolveSessionPartner();
  const db = requireDatabase();
  const event = await db.from("clinic_events").select("partner_slug").eq("id", eventId).maybeSingle();
  if (event.error || !event.data) throw new ClinicServiceError("not_found", "Clinic event was not found.");
  if (actor.kind === "internal_admin") return actor;
  if (actor.partnerSlug !== event.data.partner_slug) throw new ClinicServiceError("forbidden", "Cross-tenant Clinic queue access is denied.");
  if (actor.role === "partner_admin") return actor;
  const staff = await db.from("clinic_event_staff").select("id").eq("event_id", eventId).eq("status", "approved")
    .contains("permissions", ["queue"]).eq("partner_user_id", (await partnerUserId(actor.authUserId))).maybeSingle();
  if (staff.error || !staff.data) throw new ClinicServiceError("forbidden", "Approved event staff access is required.");
  return actor;
}

async function partnerUserId(authUserId: string) {
  const result = await requireDatabase().from("partner_users").select("id").eq("auth_user_id", authUserId).eq("status", "active").maybeSingle();
  if (result.error || !result.data) throw new ClinicServiceError("forbidden", "Partner identity is unavailable.");
  return String(result.data.id);
}

function requireDatabase() {
  const db = getSupabaseAdminClient();
  if (!db) throw new ClinicServiceError("unavailable", "Clinic Mode requires configured Supabase services.");
  return db;
}

function normalizeSlug(value: string) { return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) ? value : "invalid"; }
function sha256(value: string) { return createHash("sha256").update(value).digest("hex"); }
function mapPublicEvent(row: Record<string, unknown>): PublicClinicEvent {
  return { id: String(row.id), publicSlug: String(row.public_slug), name: String(row.name), startsAt: String(row.starts_at), endsAt: String(row.ends_at), timezone: String(row.timezone), locationName: String(row.location_name), geography: String(row.geography), status: row.status as PublicClinicEvent["status"] };
}
