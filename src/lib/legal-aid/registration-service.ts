import "server-only";

import { ClinicServiceError } from "@/lib/clinic-mode/errors";
import { participantSubjectPseudonym } from "@/lib/expungement-ai/privacy/pseudonym";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { ClinicRegistration, LegalAidEventSummary, RegistrationStatus } from "./types";

// Clinic registration for the legal-aid experience. Every write goes through a
// security-definer RPC that enforces the event's experience, publication,
// registration window and capacity atomically; this module resolves identity,
// validates input shape and maps rows.

export type RegisterForClinicInput = {
  eventId: string;
  userId: string;
  idempotencyKey: string;
  contactName: string;
  contactEmail: string | null;
  contactPhone: string | null;
  preferredContact: "email" | "phone" | "text" | "either";
  languagePreference: string | null;
  assistanceNeeds: string | null;
  source?: "public_web" | "staff_assisted";
  assistedByEventStaffId?: string | null;
};

export type RegisterForClinicResult = {
  outcome: "registered" | "waitlisted" | "already_registered" | "registration_closed" | "event_unavailable";
  registrationId: string | null;
  status: RegistrationStatus | null;
};

const EVENT_COLUMNS = "id,partner_slug,public_slug,name,starts_at,ends_at,timezone,location_name,geography,jurisdiction,capacity,status,experience,policy_profile_id,registration_opens_at,registration_closes_at,appointment_policy,participant_cost_note,public_description";

export function requireLegalAidDatabase() {
  const db = getSupabaseAdminClient();
  if (!db) throw new ClinicServiceError("unavailable", "Clinic services require configured Supabase services.");
  return db;
}

export async function listOpenLegalAidEvents(partnerSlug: string): Promise<LegalAidEventSummary[]> {
  const db = requireLegalAidDatabase();
  const result = await db.from("clinic_events").select(EVENT_COLUMNS)
    .eq("partner_slug", partnerSlug).eq("experience", "legal_aid").eq("status", "published")
    .gte("ends_at", new Date().toISOString()).order("starts_at", { ascending: true });
  if (result.error) throw new ClinicServiceError("unavailable", "Clinic events are temporarily unavailable.");
  const events = (result.data ?? []) as Record<string, unknown>[];
  return Promise.all(events.map((row) => summarizeEvent(row)));
}

export async function getLegalAidEventBySlug(publicSlug: string): Promise<LegalAidEventSummary | null> {
  const db = requireLegalAidDatabase();
  const result = await db.from("clinic_events").select(EVENT_COLUMNS).eq("public_slug", publicSlug).eq("experience", "legal_aid").maybeSingle();
  if (result.error) throw new ClinicServiceError("unavailable", "Clinic event is temporarily unavailable.");
  if (!result.data) return null;
  return summarizeEvent(result.data as Record<string, unknown>);
}

export async function getLegalAidEventById(eventId: string): Promise<LegalAidEventSummary | null> {
  const db = requireLegalAidDatabase();
  const result = await db.from("clinic_events").select(EVENT_COLUMNS).eq("id", eventId).maybeSingle();
  if (result.error) throw new ClinicServiceError("unavailable", "Clinic event is temporarily unavailable.");
  if (!result.data) return null;
  return summarizeEvent(result.data as Record<string, unknown>);
}

async function summarizeEvent(row: Record<string, unknown>): Promise<LegalAidEventSummary> {
  const db = requireLegalAidDatabase();
  const count = await db.from("clinic_registrations").select("id", { count: "exact", head: true })
    .eq("event_id", String(row.id)).in("status", ["received", "confirmed"]);
  const active = count.error ? null : count.count ?? 0;
  const now = Date.now();
  const opensAt = row.registration_opens_at ? Date.parse(String(row.registration_opens_at)) : null;
  const closesAt = row.registration_closes_at ? Date.parse(String(row.registration_closes_at)) : null;
  const registrationOpen = row.status === "published" && (opensAt === null || opensAt <= now) && (closesAt === null || closesAt > now);
  return {
    id: String(row.id),
    partnerSlug: String(row.partner_slug),
    publicSlug: String(row.public_slug),
    name: String(row.name),
    startsAt: String(row.starts_at),
    endsAt: String(row.ends_at),
    timezone: String(row.timezone),
    locationName: String(row.location_name),
    geography: String(row.geography),
    jurisdiction: row.jurisdiction ? String(row.jurisdiction) : null,
    capacity: Number(row.capacity),
    status: String(row.status),
    experience: row.experience === "legal_aid" ? "legal_aid" : "standard",
    policyProfileId: row.policy_profile_id ? String(row.policy_profile_id) : null,
    registrationOpensAt: row.registration_opens_at ? String(row.registration_opens_at) : null,
    registrationClosesAt: row.registration_closes_at ? String(row.registration_closes_at) : null,
    appointmentPolicy: (row.appointment_policy as LegalAidEventSummary["appointmentPolicy"]) ?? "walk_in",
    participantCostNote: row.participant_cost_note ? String(row.participant_cost_note) : null,
    publicDescription: row.public_description ? String(row.public_description) : null,
    registrationOpen,
    seatsRemaining: active === null ? null : Math.max(0, Number(row.capacity) - active)
  };
}

export async function registerForClinic(input: RegisterForClinicInput): Promise<RegisterForClinicResult> {
  const db = requireLegalAidDatabase();
  const result = await db.rpc("legal_aid_register", {
    p_event_id: input.eventId,
    p_participant_user_id: input.userId,
    p_participant_pseudonym: participantSubjectPseudonym(input.userId),
    p_idempotency_key: input.idempotencyKey,
    p_contact_name: input.contactName,
    p_contact_email: input.contactEmail,
    p_contact_phone: input.contactPhone,
    p_preferred_contact: input.preferredContact,
    p_language_preference: input.languagePreference,
    p_assistance_needs: input.assistanceNeeds,
    p_source: input.source ?? "public_web",
    p_assisted_by_event_staff_id: input.assistedByEventStaffId ?? null
  });
  if (result.error) {
    if (result.error.message?.includes("staff_not_approved")) throw new ClinicServiceError("forbidden", "The assisting staff member is not approved for this clinic.");
    throw new ClinicServiceError("unavailable", "Registration could not be saved. Nothing was recorded; please try again.");
  }
  const row = (Array.isArray(result.data) ? result.data[0] : result.data) as Record<string, unknown> | undefined;
  if (!row) throw new ClinicServiceError("unavailable", "Registration could not be saved.");
  return {
    outcome: String(row.outcome) as RegisterForClinicResult["outcome"],
    registrationId: row.registration_id ? String(row.registration_id) : null,
    status: row.status ? (String(row.status) as RegistrationStatus) : null
  };
}

export async function getParticipantRegistration(eventId: string, userId: string): Promise<ClinicRegistration | null> {
  const db = requireLegalAidDatabase();
  const result = await db.from("clinic_registrations").select("*").eq("event_id", eventId)
    .eq("participant_pseudonym", participantSubjectPseudonym(userId)).maybeSingle();
  if (result.error) throw new ClinicServiceError("unavailable", "Registration is temporarily unavailable.");
  return result.data ? mapRegistration(result.data as Record<string, unknown>) : null;
}

export async function listParticipantRegistrations(userId: string): Promise<{ registration: ClinicRegistration; event: LegalAidEventSummary }[]> {
  const db = requireLegalAidDatabase();
  const result = await db.from("clinic_registrations").select("*").eq("participant_pseudonym", participantSubjectPseudonym(userId))
    .order("created_at", { ascending: false });
  if (result.error) throw new ClinicServiceError("unavailable", "Registrations are temporarily unavailable.");
  const rows = (result.data ?? []) as Record<string, unknown>[];
  const output: { registration: ClinicRegistration; event: LegalAidEventSummary }[] = [];
  for (const row of rows) {
    const event = await getLegalAidEventById(String(row.event_id));
    if (event) output.push({ registration: mapRegistration(row), event });
  }
  return output;
}

export async function setRegistrationStatus(registrationId: string, actorUserId: string, status: RegistrationStatus): Promise<string> {
  const db = requireLegalAidDatabase();
  const result = await db.rpc("legal_aid_set_registration_status", { p_registration_id: registrationId, p_actor_user_id: actorUserId, p_status: status });
  if (result.error) throw new ClinicServiceError("unavailable", "The registration could not be updated.");
  const outcome = String(result.data);
  if (outcome === "forbidden") throw new ClinicServiceError("forbidden", "You cannot change this registration.");
  if (outcome === "not_found") throw new ClinicServiceError("not_found", "Registration was not found.");
  return outcome;
}

export function mapRegistration(row: Record<string, unknown>): ClinicRegistration {
  return {
    id: String(row.id),
    eventId: String(row.event_id),
    status: String(row.status) as RegistrationStatus,
    contactName: String(row.contact_name),
    contactEmail: row.contact_email ? String(row.contact_email) : null,
    contactPhone: row.contact_phone ? String(row.contact_phone) : null,
    preferredContact: String(row.preferred_contact) as ClinicRegistration["preferredContact"],
    languagePreference: row.language_preference ? String(row.language_preference) : null,
    assistanceNeeds: row.assistance_needs ? String(row.assistance_needs) : null,
    createdAt: String(row.created_at),
    confirmedAt: row.confirmed_at ? String(row.confirmed_at) : null,
    waitlistedAt: row.waitlisted_at ? String(row.waitlisted_at) : null,
    cancelledAt: row.cancelled_at ? String(row.cancelled_at) : null
  };
}

export function parseRegistrationInput(body: unknown): Omit<RegisterForClinicInput, "userId"> {
  if (!body || typeof body !== "object") throw new ClinicServiceError("conflict", "Registration details are required.");
  const record = body as Record<string, unknown>;
  const eventId = typeof record.eventId === "string" ? record.eventId : "";
  const idempotencyKey = typeof record.idempotencyKey === "string" ? record.idempotencyKey.trim() : "";
  const contactName = typeof record.contactName === "string" ? record.contactName.trim() : "";
  const contactEmail = typeof record.contactEmail === "string" && record.contactEmail.trim() ? record.contactEmail.trim().toLowerCase() : null;
  const contactPhone = typeof record.contactPhone === "string" && record.contactPhone.trim() ? record.contactPhone.trim() : null;
  const preferredContact = record.preferredContact;
  const languagePreference = typeof record.languagePreference === "string" && record.languagePreference.trim() ? record.languagePreference.trim().slice(0, 80) : null;
  const assistanceNeeds = typeof record.assistanceNeeds === "string" && record.assistanceNeeds.trim() ? record.assistanceNeeds.trim().slice(0, 1000) : null;
  const fail = (message: string) => { throw new RegistrationInputError(message); };
  if (!/^[0-9a-f-]{36}$/i.test(eventId)) fail("Choose a clinic.");
  if (idempotencyKey.length < 8 || idempotencyKey.length > 120) fail("The registration request is missing its reference.");
  if (contactName.length < 2 || contactName.length > 160) fail("Enter your name.");
  if (!contactEmail && !contactPhone) fail("Enter an email address or a phone number so MVLP can reach you.");
  if (contactEmail && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail) || contactEmail.length > 254)) fail("Enter a valid email address.");
  if (contactPhone && contactPhone.replace(/\D/g, "").length < 10) fail("Enter a phone number with area code.");
  if (preferredContact !== "email" && preferredContact !== "phone" && preferredContact !== "text" && preferredContact !== "either") fail("Choose how MVLP should contact you.");
  if (preferredContact === "email" && !contactEmail) fail("Enter an email address, or choose a different way to be contacted.");
  if ((preferredContact === "phone" || preferredContact === "text") && !contactPhone) fail("Enter a phone number, or choose a different way to be contacted.");
  return { eventId, idempotencyKey, contactName, contactEmail, contactPhone, preferredContact: preferredContact as RegisterForClinicInput["preferredContact"], languagePreference, assistanceNeeds };
}

export class RegistrationInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RegistrationInputError";
  }
}
