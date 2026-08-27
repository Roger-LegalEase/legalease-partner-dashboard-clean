import "server-only";

import { createHash, randomBytes } from "node:crypto";
import QRCode from "qrcode";
import { ClinicServiceError } from "@/lib/clinic-mode/errors";
import { absolutePartnerAppUrl } from "@/lib/app-url";
import { resolveSessionPartner, SessionPartnerError, type SessionPartner } from "@/lib/partners/session-partner";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type {
  ClinicAccessCodeSummary,
  ClinicAuditEntry,
  ClinicEvent,
  ClinicEventStaff,
  ClinicEventStatus,
  ClinicEventWorkspace,
  CreateClinicAccessCodeInput,
  CreateClinicEventInput,
  SetClinicStaffInput
} from "@/lib/clinic-mode/types";

export { ClinicServiceError } from "@/lib/clinic-mode/errors";

type ClinicActor = SessionPartner;

export async function requireClinicPartnerAdmin() {
  const actor = await resolveClinicActor();
  if (actor.kind !== "partner" || actor.role !== "partner_admin") {
    throw new ClinicServiceError("forbidden", "Partner administrator access is required.");
  }
  return actor;
}

export async function listClinicEvents(): Promise<ClinicEvent[]> {
  const actor = await resolveClinicActor();
  const db = requireDatabase();
  let query = db.from("clinic_events").select("*").order("starts_at", { ascending: false });
  if (actor.kind === "partner") query = query.eq("partner_slug", actor.partnerSlug);
  const result = await query;
  if (result.error) throw new ClinicServiceError("unavailable", "Clinic events are temporarily unavailable.");
  return (result.data ?? []).map(mapEvent);
}

export async function getClinicEventWorkspace(eventId: string): Promise<ClinicEventWorkspace> {
  const actor = await resolveClinicActor();
  const db = requireDatabase();
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
  const entryUrl = absolutePartnerAppUrl(`/clinic/${event.publicSlug}`);
  return {
    event,
    entryUrl,
    qrDataUrl: await QRCode.toDataURL(entryUrl, { margin: 1, width: 320, errorCorrectionLevel: "M" }),
    staff: (staffResult.data ?? []).map(mapStaff),
    accessCodes: (codesResult.data ?? []).map(mapCode),
    audit: (auditResult.data ?? []).map(mapAudit)
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
    p_sponsorship_allocation: input.sponsorshipAllocation
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
  const rawCode = `CLINIC-${randomBytes(9).toString("base64url").toUpperCase()}`;
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
  if (message?.includes("forbidden") || message?.includes("cross_tenant")) return new ClinicServiceError("forbidden", "Clinic mutation is not authorized.");
  if (message?.includes("duplicate") || message?.includes("unique")) return new ClinicServiceError("conflict", "A Clinic record with those details already exists.");
  return new ClinicServiceError("unavailable", "The Clinic mutation could not be completed.");
}

function mapEvent(row: Record<string, unknown>): ClinicEvent {
  return {
    id: String(row.id), partnerSlug: String(row.partner_slug), publicSlug: String(row.public_slug), name: String(row.name),
    startsAt: String(row.starts_at), endsAt: String(row.ends_at), timezone: String(row.timezone),
    locationName: String(row.location_name), geography: String(row.geography), capacity: Number(row.capacity),
    status: row.status as ClinicEventStatus, sponsorshipAllocation: row.sponsorship_allocation === null ? null : Number(row.sponsorship_allocation),
    createdAt: String(row.created_at), updatedAt: String(row.updated_at)
  };
}

function mapStaff(row: Record<string, unknown>): ClinicEventStaff {
  return { id: String(row.id), eventId: String(row.event_id), partnerUserId: String(row.partner_user_id), status: row.status as ClinicEventStaff["status"], permissions: row.permissions as ClinicEventStaff["permissions"], approvedAt: String(row.approved_at) };
}

function mapCode(row: Record<string, unknown>): ClinicAccessCodeSummary {
  return { id: String(row.id), eventId: String(row.event_id), codeHint: String(row.code_hint), maxUses: row.max_uses === null ? null : Number(row.max_uses), usesCount: Number(row.uses_count), startsAt: row.starts_at ? String(row.starts_at) : null, expiresAt: row.expires_at ? String(row.expires_at) : null, isActive: Boolean(row.is_active) };
}

function mapAudit(row: Record<string, unknown>): ClinicAuditEntry {
  return { id: String(row.id), action: String(row.action), targetType: String(row.target_type), targetId: row.target_id ? String(row.target_id) : null, metadata: (row.metadata ?? {}) as Record<string, unknown>, occurredAt: String(row.occurred_at) };
}
