import "server-only";

import { createHash, createHmac, randomBytes } from "node:crypto";
import QRCode from "qrcode";
import { ClinicServiceError } from "@/lib/clinic-mode/errors";
import { absolutePartnerAppUrl } from "@/lib/app-url";
import { resolveSessionPartner, SessionPartnerError, type SessionPartner } from "@/lib/partners/session-partner";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type {
  ClinicAccessCodeSummary,
  ClinicAuditEntry,
  ClinicEvent,
  ClinicProgramOption,
  ClinicEventStaff,
  ClinicEventStatus,
  ClinicEventWorkspace,
  CreateClinicAccessCodeInput,
  CreateClinicEventInput,
  SetClinicStaffInput
} from "@/lib/clinic-mode/types";

export { ClinicServiceError } from "@/lib/clinic-mode/errors";

type ClinicActor = SessionPartner;

export async function requireClinicPartnerActor() {
  const actor = await resolveClinicActor();
  if (actor.kind !== "partner") throw new ClinicServiceError("forbidden", "A partner account is required.");
  return actor;
}

export async function requireClinicPartnerAdmin() {
  const actor = await resolveClinicActor();
  if (actor.kind !== "partner" || actor.role !== "partner_admin") {
    throw new ClinicServiceError("forbidden", "Partner administrator access is required.");
  }
  return actor;
}

/** Program choices come from the same administrator scope as event creation. */
export async function listClinicPrograms(): Promise<ClinicProgramOption[]> {
  const actor = await requireClinicEventAdministrator();
  const result = await requireDatabase().rpc("rcap_service_clinic_program_options", { p_actor: actor.authUserId });
  if (result.error || !Array.isArray(result.data) || !result.data.every(row => row && typeof row.slug === "string" && Array.isArray(row.jurisdictions) && typeof row.canCreate === "boolean" && typeof row.canSponsor === "boolean")) {
    throw new ClinicServiceError("unavailable", "Program permissions could not be loaded. Please retry.");
  }
  return result.data as ClinicProgramOption[];
}

export async function listClinicEvents(): Promise<ClinicEvent[]> {
  const actor = await resolveClinicActor();
  const db = requireDatabase();
  let query = db.from("clinic_events").select("*").order("starts_at", { ascending: false });
  if (actor.kind === "partner") query = query.eq("partner_slug", actor.partnerSlug);
  let assignments: Array<{event_id: string; permissions: ClinicEventStaff["permissions"]}> = [];
  if (actor.kind === "partner" && actor.role !== "partner_admin") {
    const member = await db.from("partner_users").select("id").eq("auth_user_id", actor.authUserId).eq("partner_slug", actor.partnerSlug).eq("status", "active").single();
    if (member.error) throw new ClinicServiceError("forbidden", "Your partner team access could not be verified.");
    const assigned = await db.from("clinic_event_staff").select("event_id,permissions").eq("partner_user_id", member.data.id).eq("status", "approved");
    if (assigned.error) throw new ClinicServiceError("unavailable", "Assigned clinics could not be loaded. Please retry.");
    assignments = assigned.data ?? [];
    if (!assignments.length) return [];
    query = query.in("id", assignments.map(row => row.event_id));
  }
  const result = await query;
  if (result.error) throw new ClinicServiceError("unavailable", "Clinic events are temporarily unavailable.");
  return (result.data ?? []).map(row => ({...mapEvent(row), staffPermissions: assignments.find(assignment => assignment.event_id === row.id)?.permissions}));
}

export async function getClinicEventWorkspace(eventId: string, purpose: "administration" | "follow_up" = "administration"): Promise<ClinicEventWorkspace> {
  const actor = await resolveClinicActor();
  const db = requireDatabase();
  if (actor.kind === "partner" && actor.role !== "partner_admin") {
    if (purpose !== "follow_up") throw new ClinicServiceError("forbidden", "Program administrator access is required for event controls.");
    const permission = await db.rpc("clinic_actor_can_event", { p_event_id: eventId, p_actor_user_id: actor.authUserId, p_permission: "follow_up" });
    if (permission.error || permission.data !== true) throw new ClinicServiceError("forbidden", "This event requires an approved follow-up assignment.");
  }
  let eventQuery = db.from("clinic_events").select("*").eq("id", eventId);
  if (actor.kind === "partner") eventQuery = eventQuery.eq("partner_slug", actor.partnerSlug);
  const eventResult = await eventQuery.maybeSingle();
  if (eventResult.error) throw new ClinicServiceError("unavailable", "Clinic event is temporarily unavailable.");
  if (!eventResult.data) throw new ClinicServiceError("not_found", "Clinic event was not found.");

  const [staffResult, codesResult, auditResult] = await Promise.all([
    db.from("clinic_event_staff").select("id,event_id,partner_user_id,status,permissions,approved_at").eq("event_id", eventId).order("approved_at"),
    db.from("clinic_event_access_codes").select("id,event_id,code_hint,max_uses,uses_count,starts_at,expires_at,is_active").eq("event_id", eventId).order("created_at", { ascending: false }),
    db.from("clinic_event_audit").select("id,action,target_type,target_id,metadata,occurred_at").eq("event_id", eventId).order("occurred_at", { ascending: false }).limit(100)
  ]);
  if (staffResult.error || codesResult.error || auditResult.error) {
    throw new ClinicServiceError("unavailable", "Clinic workspace details are temporarily unavailable.");
  }
  const event = mapEvent(eventResult.data);
  // Use the event's already-authorized tenant, never a client-supplied scope.
  let membersQuery = db.from("partner_users").select("id,invited_email")
    .eq("partner_slug", event.partnerSlug).eq("status", "active").in("role", ["partner_admin", "partner_staff"]);
  const staffOnly = actor.kind === "partner" && actor.role !== "partner_admin";
  if (staffOnly) membersQuery = membersQuery.in("id", (staffResult.data ?? []).map(row => row.partner_user_id));
  const members = staffOnly && !staffResult.data?.length ? {data: [], error: null} : await membersQuery;
  if (members.error) throw new ClinicServiceError("unavailable", "The partner team could not be loaded. Please retry.");
  const partner = await db.from("partner_records").select("organization_name,partner_name").eq("partner_slug", event.partnerSlug).maybeSingle();
  const legalAid = !staffOnly && event.status === "draft" ? await db.rpc("rcap_program_legal_aid_available", { p_slug: event.partnerSlug }) : null;
  if (legalAid?.error) throw new ClinicServiceError("unavailable", "Event mode availability could not be checked. Please retry.");
  const readiness = !staffOnly && ["draft","paused"].includes(event.status) ? await db.rpc("rcap_clinic_open_issue", {p_event:event.id}) : null;
  if(readiness?.error)throw new ClinicServiceError("unavailable","Event opening conditions could not be checked. Reload to retry.");
  const entryUrl = absolutePartnerAppUrl(`/clinic/${event.publicSlug}${event.experience === "legal_aid" ? "/register" : ""}`);
  return {
    event,
    legalAidAvailable: legalAid?.data === true,
    openingIssue:readiness?.data ? clinicOpeningIssue(String(readiness.data)) : null,
    partnerName: partner.data?.organization_name || partner.data?.partner_name || "Partner program",
    entryUrl,
    qrDataUrl: staffOnly ? "" : await QRCode.toDataURL(entryUrl, { margin: 1, width: 320, errorCorrectionLevel: "M" }),
    staff: (staffResult.data ?? []).map(mapStaff),
    staffOptions: (members.data ?? []).flatMap(member => member.invited_email ? [{ id: member.id, email: member.invited_email }] : []),
    accessCodes: staffOnly ? [] : (codesResult.data ?? []).map(mapCode),
    audit: staffOnly ? [] : (auditResult.data ?? []).map(mapAudit)
  };
}

export async function createClinicEvent(input: CreateClinicEventInput): Promise<string> {
  const actor = await requireClinicEventAdministrator();
  const partnerSlug = actor.kind === "partner" ? actor.partnerSlug : input.partnerSlug;
  if (!partnerSlug) throw new ClinicServiceError("conflict", "Internal administrators must select a partner.");
  if (actor.kind === "partner" && input.partnerSlug && input.partnerSlug !== actor.partnerSlug) {
    throw new ClinicServiceError("forbidden", "A partner cannot create another tenant's event.");
  }
  const result = await requireDatabase().rpc("clinic_create_event", {
    p_actor_user_id: actor.authUserId,
    p_partner_slug: partnerSlug,
    p_public_slug: input.publicSlug,
    p_name: input.name,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_timezone: input.timezone,
    p_location_name: input.locationName,
    p_geography: input.geography,
    p_capacity: input.capacity,
    p_sponsorship_allocation: input.sponsorshipAllocation,
    p_jurisdiction: input.jurisdiction ?? null
  });
  if (result.error || typeof result.data !== "string") throw writeError(result.error?.message);
  return result.data;
}

export async function setClinicEventStatus(eventId: string, status: ClinicEventStatus) {
  const actor = await requireClinicEventAdministrator();
  await assertEventScope(actor, eventId);
  const result = await requireDatabase().rpc("clinic_set_event_status", {
    p_event_id: eventId,
    p_actor_user_id: actor.authUserId,
    p_status: status
  });
  if (result.error) throw writeError(result.error.message);
  if (result.data === "forbidden") throw new ClinicServiceError("forbidden", "Event status change is not authorized.");
  if (result.data === "not_found") throw new ClinicServiceError("not_found", "Clinic event was not found.");
  if (result.data === "invalid_transition") throw new ClinicServiceError("conflict", "That event status transition is not allowed.");
  return String(result.data);
}

export async function setClinicEventStaff(eventId: string, input: SetClinicStaffInput) {
  const actor = await requireClinicEventAdministrator();
  await assertEventScope(actor, eventId);
  const result = await requireDatabase().rpc("clinic_set_event_staff", {
    p_actor_user_id: actor.authUserId,
    p_event_id: eventId,
    p_partner_user_id: input.partnerUserId,
    p_status: input.status,
    p_permissions: input.permissions
  });
  if (result.error || typeof result.data !== "string") throw writeError(result.error?.message);
  return result.data;
}

export async function createClinicAccessCode(eventId: string, input: CreateClinicAccessCodeInput) {
  const actor = await requireClinicEventAdministrator();
  await assertEventScope(actor, eventId);
  // A retry after a lost response returns the original code without storing a
  // readable secret. Identity includes actor, event and exact requested limits.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (input.requestId && !key) throw new ClinicServiceError("unavailable", "Event code preparation is unavailable. Retry later.");
  const rawCode = `CLINIC-${input.requestId
    ? createHmac("sha256", key!).update(JSON.stringify(["clinic-code-v1", actor.authUserId, eventId, input.requestId, input.maxUses, input.startsAt, input.expiresAt])).digest("base64url").slice(0,24).toUpperCase()
    : randomBytes(9).toString("base64url").toUpperCase()}`;
  const codeHash = createHash("sha256").update(rawCode.normalize("NFKC").trim().toUpperCase()).digest("hex");
  const result = await requireDatabase().rpc("clinic_create_access_code", {
    p_actor_user_id: actor.authUserId,
    p_event_id: eventId,
    p_code_hash: codeHash,
    p_code_hint: rawCode.slice(-6),
    p_max_uses: input.maxUses,
    p_starts_at: input.startsAt,
    p_expires_at: input.expiresAt
  });
  if (result.error || typeof result.data !== "string") throw writeError(result.error?.message);
  return { id: result.data, code: rawCode };
}

async function requireClinicEventAdministrator(): Promise<ClinicActor> {
  const actor = await resolveClinicActor();
  if (actor.kind === "internal_admin" || actor.role === "partner_admin") return actor;
  throw new ClinicServiceError("forbidden", "Clinic event administration is restricted to administrators.");
}

async function resolveClinicActor(): Promise<ClinicActor> {
  try {
    return await resolveSessionPartner();
  } catch (error) {
    if (error instanceof SessionPartnerError) {
      throw new ClinicServiceError(error.code === "unauthenticated" ? "unauthenticated" : "forbidden", "Clinic access is denied.");
    }
    throw error;
  }
}

async function assertEventScope(actor: ClinicActor, eventId: string) {
  if (actor.kind === "internal_admin") return;
  const result = await requireDatabase().from("clinic_events").select("id").eq("id", eventId).eq("partner_slug", actor.partnerSlug).maybeSingle();
  if (result.error) throw new ClinicServiceError("unavailable", "Clinic authorization is temporarily unavailable.");
  if (!result.data) throw new ClinicServiceError("forbidden", "Cross-tenant Clinic access is denied.");
}

function requireDatabase() {
  const db = getSupabaseAdminClient();
  if (!db) throw new ClinicServiceError("unavailable", "Clinic Mode requires configured Supabase services.");
  return db;
}

function writeError(message?: string) {
  if(message?.startsWith("clinic_open_"))return new ClinicServiceError("conflict",clinicOpeningIssue(message.slice("clinic_open_".length)).reason);
  if (message?.includes("clinic_request_conflict")) return new ClinicServiceError("conflict", "This request already created an event or code with different details. Open the existing event before creating another.");
  if (message?.includes("clinic_code_inactive")) return new ClinicServiceError("conflict", "The original code is no longer active. Review the event's current codes before creating another.");
  if (message?.includes("forbidden") || message?.includes("cross_tenant")) return new ClinicServiceError("forbidden", "Clinic mutation is not authorized.");
  if (message?.includes("duplicate") || message?.includes("unique")) return new ClinicServiceError("conflict", "A Clinic record with those details already exists.");
  return new ClinicServiceError("unavailable", "The Clinic mutation could not be completed.");
}

export function clinicOpeningIssue(code:string):NonNullable<ClinicEventWorkspace["openingIssue"]>{
 if(code==="staff_required")return {reason:"Assign an active team member with Assist participants permission before opening this clinic.",destination:"staff"};
 if(code==="code_required")return {reason:"Generate an available event access code before opening this clinic. Expired, exhausted or future codes cannot admit participants now.",destination:"codes"};
 if(code==="event_ended")return {reason:"This event has ended. Create a new clinic with future operating hours.",destination:"clinics"};
 if(code==="event_full")return {reason:"This event has reached its intake capacity. Create another clinic for additional participants.",destination:"clinics"};
 return {reason:"The current event could not be verified. Return to Clinics and reload it.",destination:"clinics"};
}

function mapEvent(row: Record<string, unknown>): ClinicEvent {
  return {
    id: String(row.id), partnerSlug: String(row.partner_slug), publicSlug: String(row.public_slug), name: String(row.name),
    startsAt: String(row.starts_at), endsAt: String(row.ends_at), timezone: String(row.timezone),
    locationName: String(row.location_name), geography: String(row.geography), capacity: Number(row.capacity),
    jurisdiction: row.jurisdiction ? String(row.jurisdiction) : null,
    status: row.status as ClinicEventStatus, sponsorshipAllocation: row.sponsorship_allocation === null ? null : Number(row.sponsorship_allocation),
    experience: row.experience === "legal_aid" ? "legal_aid" : "standard",
    createdAt: String(row.created_at), updatedAt: String(row.updated_at)
  };
}

function mapStaff(row: Record<string, unknown>): ClinicEventStaff {
  return { id: String(row.id), eventId: String(row.event_id), partnerUserId: String(row.partner_user_id), status: row.status as ClinicEventStaff["status"], permissions: row.permissions as ClinicEventStaff["permissions"], approvedAt: String(row.approved_at) };
}

function mapCode(row: Record<string, unknown>): ClinicAccessCodeSummary {
  return { id: String(row.id), eventId: String(row.event_id), codeHint: String(row.code_hint), maxUses: row.max_uses === null ? null : Number(row.max_uses), usesCount: Number(row.uses_count), startsAt: row.starts_at ? String(row.starts_at) : null, expiresAt: row.expires_at ? String(row.expires_at) : null, isActive: Boolean(row.is_active) };
}

/**
 * Keys the Clinic mutation functions write into `clinic_event_audit.metadata`.
 * The column is free-form jsonb and this trail is rendered in the partner
 * console, so the projection is an allowlist rather than a pass-through: a
 * mutation that later starts recording a participant fact -- a name, a birth
 * date, a case number, a claim token, a signed URL, a private storage path --
 * cannot reach a partner administrator through this surface without the key
 * being added here deliberately.
 *
 * Values are lifecycle facts, so they are also constrained to primitives; a
 * nested object cannot smuggle a participant record under an allowed key.
 */
const AUDIT_METADATA_KEYS = new Set(["status", "from", "to", "reason", "consent_version", "ledger_id"]);

export function projectAuditMetadata(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const projected: Record<string, unknown> = {};
  let withheld = 0;
  for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
    if (AUDIT_METADATA_KEYS.has(key) && (entry === null || ["string", "number", "boolean"].includes(typeof entry))) {
      projected[key] = entry;
    } else {
      withheld += 1;
    }
  }
  if (withheld > 0) projected.withheldKeys = withheld;
  return projected;
}

function mapAudit(row: Record<string, unknown>): ClinicAuditEntry {
  return { id: String(row.id), action: String(row.action), targetType: String(row.target_type), targetId: row.target_id ? String(row.target_id) : null, metadata: projectAuditMetadata(row.metadata), occurredAt: String(row.occurred_at) };
}
