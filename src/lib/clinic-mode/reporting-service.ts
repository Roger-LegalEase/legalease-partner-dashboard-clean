import "server-only";
import { clinicCaseReference } from "./case-reference";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";
import { getServerAuthState } from "@/lib/supabase/auth-server";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { ClinicServiceError } from "@/lib/clinic-mode/errors";
import type {
  ClinicEventReport,
  ClinicFollowUp,
  ClinicPacketAccountingOutcome,
  SaveClinicFollowUpInput
} from "@/lib/clinic-mode/types";

type AccountingRow = { outcome?: string; reservation_id?: string | null };

export async function getClinicEventReport(eventId: string): Promise<ClinicEventReport> {
  const actorUserId = await authenticatedUserId();
  const db = requireDatabase();
  const result = await db.rpc("clinic_get_event_report", {
    p_event_id: eventId,
    p_actor_user_id: actorUserId
  });
  if (result.error || !result.data || typeof result.data !== "object") throw readError(result.error?.message, "Clinic reporting is unavailable.");
  const report = normalizeReport(result.data as Record<string, unknown>);
  // The RPC above authorizes this exact event before any service-role reads.
  if (report.eventId !== eventId) throw readError(undefined, "Clinic reporting is unavailable.");
  const [funding, cases, reservations] = await Promise.all([
    readPages(() => db.from("clinic_packet_funding").select("briefcase_item_id,funding_mode").eq("event_id", eventId).order("briefcase_item_id")),
    readPages(() => db.from("clinic_cases").select("id,matter_id").eq("event_id", eventId).order("id")),
    readPages(() => db.from("clinic_packet_reservations").select("clinic_case_id,status").eq("event_id", eventId).order("id"))
  ]);
  if (funding.error || cases.error || reservations.error) throw readError(undefined, "Clinic sponsorship reporting is unavailable.");
  const itemIds = [...new Set([
    ...(funding.data ?? []).map(row => String(row.briefcase_item_id)),
    ...(cases.data ?? []).flatMap(row => row.matter_id ? [String(row.matter_id)] : [])
  ])];
  const generated: { briefcase_item_id: string }[] = [];
  for (let offset = 0; offset < itemIds.length; offset += 100) {
    const page = await readPages(() => db.from("consumer_packet_artifact_provenance")
      .select("briefcase_item_id").in("briefcase_item_id", itemIds.slice(offset, offset + 100))
      .eq("entitlement_source", "partner_sponsorship").order("briefcase_item_id"));
    if (page.error) throw readError(undefined, "Clinic sponsorship reporting is unavailable.");
    generated.push(...page.data);
  }
  report.sponsorship = { ...report.sponsorship, ...sponsoredReportCounts(
    funding.data ?? [], cases.data ?? [], reservations.data ?? [], generated
  ) };
  return report;
}

export async function listClinicFollowUps(eventId: string): Promise<ClinicFollowUp[]> {
  const actorUserId = await authenticatedUserId();
  const result = await requireDatabase().rpc("clinic_get_follow_ups", {
    p_event_id: eventId,
    p_actor_user_id: actorUserId
  });
  if (result.error) throw readError(result.error.message, "Clinic follow-up is unavailable.");
  return ((result.data ?? []) as Record<string, unknown>[]).map(row => mapFollowUp(row, eventId));
}

export async function saveClinicFollowUp(eventId: string, input: SaveClinicFollowUpInput): Promise<string> {
  const actorUserId = await authenticatedUserId();
  const db = requireDatabase();
  const access = await db.rpc("clinic_actor_can_event", {
    p_event_id: eventId,
    p_actor_user_id: actorUserId,
    p_permission: "follow_up"
  });
  if (access.error || access.data !== true) throw new ClinicServiceError("forbidden", "Event-scoped follow-up access is required.");
  const result = await db.rpc("clinic_upsert_event_follow_up", {
    p_event_id: eventId,
    p_follow_up_id: input.id,
    p_case_id: input.clinicCaseId,
    p_actor_user_id: actorUserId,
    p_owner_event_staff_id: input.ownerEventStaffId,
    p_due_at: input.dueAt,
    p_status: input.status,
    p_communication_state: input.communicationState,
    p_participant_safe_message: input.participantSafeMessage,
    p_internal_notes: input.internalNotes
  });
  if (result.error || typeof result.data !== "string") throw writeError(result.error?.message);
  return result.data;
}

export async function reserveClinicPacketCredit(renderJobId: string) {
  const actorUserId = await authenticatedUserId();
  const handoffToken = (await cookies()).get("clinic_session")?.value;
  if (!handoffToken) throw new ClinicServiceError("forbidden", "An active Clinic participant handoff is required.");
  const result = await requireDatabase().rpc("clinic_reserve_participant_packet_credit", {
    p_render_job_id: renderJobId,
    p_actor_user_id: actorUserId,
    p_handoff_token_hash: createHash("sha256").update(handoffToken).digest("hex")
  });
  return accountingResult(result, "Clinic sponsorship reservation failed.");
}

export async function finalizeClinicPacketCredit(renderJobId: string) {
  const result = await requireDatabase().rpc("clinic_finalize_packet_credit", { p_render_job_id: renderJobId });
  return accountingResult(result, "Clinic sponsorship finalization failed.");
}

export async function releaseClinicPacketCredit(renderJobId: string, reason: "generation_failed" | "route_changed" | "event_closed" | "manual_cancellation") {
  const result = await requireDatabase().rpc("clinic_release_packet_credit", { p_render_job_id: renderJobId, p_reason: reason });
  return accountingResult(result, "Clinic sponsorship release failed.");
}

async function authenticatedUserId() {
  const auth = await getServerAuthState();
  if (!auth.isAuthenticated) throw new ClinicServiceError("unauthenticated", "Sign in to continue.");
  return auth.userId;
}

function requireDatabase() {
  const db = getSupabaseAdminClient();
  if (!db) throw new ClinicServiceError("unavailable", "Clinic Mode requires configured Supabase services.");
  return db;
}

function accountingResult(result: { data: unknown; error: { message?: string } | null }, fallback: string) {
  const row = (Array.isArray(result.data) ? result.data[0] : result.data) as AccountingRow | null;
  if (result.error || !row?.outcome) throw writeError(result.error?.message, fallback);
  return {
    outcome: row.outcome as ClinicPacketAccountingOutcome,
    reservationId: row.reservation_id ? String(row.reservation_id) : null
  };
}

function mapFollowUp(row: Record<string, unknown>, eventId: string): ClinicFollowUp {
  return {
    id: String(row.id),
    clinicCaseId: String(row.clinic_case_id),
    caseReference: clinicCaseReference(eventId, String(row.clinic_case_id)),
    ownerEventStaffId: row.owner_event_staff_id ? String(row.owner_event_staff_id) : null,
    jurisdiction: String(row.jurisdiction),
    dueAt: row.due_at ? String(row.due_at) : null,
    status: row.status as ClinicFollowUp["status"],
    communicationState: row.communication_state as ClinicFollowUp["communicationState"],
    participantSafeMessage: row.participant_safe_message ? String(row.participant_safe_message) : null,
    internalNotes: row.internal_notes ? String(row.internal_notes) : null,
    updatedAt: String(row.updated_at)
  };
}

function normalizeReport(value: Record<string, unknown>): ClinicEventReport {
  const sponsorship = object(value.sponsorship);
  const incidents = object(value.incidents);
  return {
    eventId: String(value.eventId),
    eventName: String(value.eventName),
    eventStatus: value.eventStatus as ClinicEventReport["eventStatus"],
    capacity: Number(value.capacity),
    entries: Number(value.entries),
    participants: Number(value.participants),
    queueCounts: countMap(value.queueCounts),
    routeCounts: countMap(value.routeCounts),
    followUpCounts: countMap(value.followUpCounts),
    sponsorship: {
      allocation: sponsorship.allocation === null || sponsorship.allocation === undefined ? null : Number(sponsorship.allocation),
      reserved: Number(sponsorship.reserved ?? 0),
      consumed: Number(sponsorship.consumed ?? 0),
      released: Number(sponsorship.released ?? 0)
    },
    incidents: { open: Number(incidents.open ?? 0), resolved: Number(incidents.resolved ?? 0) }
  };
}

function countMap(value: unknown) {
  return Object.fromEntries(Object.entries(object(value)).map(([key, count]) => [key, Number(count)]));
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function readError(message: string | undefined, fallback: string) {
  if (message?.includes("forbidden")) return new ClinicServiceError("forbidden", "Event-scoped Clinic access is required.");
  if (message?.includes("not_found")) return new ClinicServiceError("not_found", "Clinic event was not found.");
  return new ClinicServiceError("unavailable", fallback);
}

function writeError(message?: string, fallback = "The Clinic mutation could not be completed.") {
  if (message?.includes("forbidden") || message?.includes("owner")) return new ClinicServiceError("forbidden", "The Clinic mutation is outside this event or participant boundary.");
  return new ClinicServiceError("conflict", fallback);
}

// Merge the legacy reservation path with immutable funding choices by matter.
// A committed choice is not a generated packet; DTC never counts as sponsored.
export function sponsoredReportCounts(
  funding: { briefcase_item_id: string; funding_mode: string }[],
  cases: { id: string; matter_id: string | null }[],
  reservations: { clinic_case_id: string; status: string }[],
  generated: { briefcase_item_id: string }[]
) {
  const caseKeys = new Map(cases.map(row => [row.id, row.matter_id ?? `case:${row.id}`]));
  const states = new Map<string, string>();
  for (const row of reservations) {
    const key = caseKeys.get(row.clinic_case_id);
    if (key) states.set(key, row.status);
  }
  for (const row of funding) {
    if (row.funding_mode === "sponsored") {
      if (states.get(row.briefcase_item_id) !== "consumed") states.set(row.briefcase_item_id, "reserved");
    }
    else states.delete(row.briefcase_item_id);
  }
  const dtc = new Set(funding.filter(row => row.funding_mode === "dtc").map(row => row.briefcase_item_id));
  for (const row of generated) if (!dtc.has(row.briefcase_item_id)) states.set(row.briefcase_item_id, "consumed");
  return {
    reserved: [...states.values()].filter(value => value === "reserved").length,
    consumed: [...states.values()].filter(value => value === "consumed").length,
    released: [...states.values()].filter(value => value === "released").length
  };
}

async function readPages<T>(query: () => { range: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }> }) {
  const data: T[] = [];
  for (let offset = 0; ; offset += 500) {
    const page = await query().range(offset, offset + 499);
    if (page.error) return { data, error: page.error };
    data.push(...(page.data ?? []));
    if ((page.data?.length ?? 0) < 500) return { data, error: null };
  }
}
