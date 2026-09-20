import "server-only";

import fs from "node:fs";
import path from "node:path";
import { ClinicServiceError } from "@/lib/clinic-mode/errors";
import { resolveSessionPartner, SessionPartnerError } from "@/lib/partners/session-partner";
import { requireLegalAidDatabase } from "./registration-service";
import { LEGAL_AID_STAFF_PERMISSIONS } from "./types";

// Partner administration for the legal-aid experience: policy profiles
// (prepare, approve), event configuration, and a readable list of the
// tenant's staff so assignments are made by name and email.

export type PolicyProfileSummary = {
  id: string;
  partnerSlug: string;
  version: number;
  status: "draft" | "approved" | "retired";
  intakeSchemaVersion: string;
  preparedAt: string;
  approvedAt: string | null;
  approvalNote: string | null;
  profile: Record<string, unknown>;
};

export async function requireLegalAidAdministrator() {
  try {
    const actor = await resolveSessionPartner();
    if (actor.kind === "partner" && actor.role !== "partner_admin") throw new ClinicServiceError("forbidden", "Partner administrator access is required.");
    return actor;
  } catch (error) {
    if (error instanceof SessionPartnerError) throw new ClinicServiceError(error.code === "unauthenticated" ? "unauthenticated" : "forbidden", "Clinic access is denied.");
    throw error;
  }
}

export async function listPolicyProfiles(partnerSlug: string): Promise<PolicyProfileSummary[]> {
  const db = requireLegalAidDatabase();
  const result = await db.from("legal_aid_policy_profiles").select("*").eq("partner_slug", partnerSlug).order("version", { ascending: false });
  if (result.error) throw new ClinicServiceError("unavailable", "Policy profiles are temporarily unavailable.");
  return (result.data ?? []).map((row) => ({
    id: String(row.id), partnerSlug: String(row.partner_slug), version: Number(row.version), status: String(row.status) as PolicyProfileSummary["status"],
    intakeSchemaVersion: String(row.intake_schema_version), preparedAt: String(row.created_at), approvedAt: row.approved_at ? String(row.approved_at) : null,
    approvalNote: row.approval_note ? String(row.approval_note) : null, profile: (row.profile as Record<string, unknown>) ?? {}
  }));
}

export function loadProfileTemplate(partnerSlug: string): Record<string, unknown> | null {
  const file = path.join(process.cwd(), "data", "legal-aid", "profiles", `${partnerSlug}-v1.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
}

export async function preparePolicyProfile(input: { actorUserId: string; partnerSlug: string; intakeSchemaVersion: string; profile: Record<string, unknown> }): Promise<string> {
  const db = requireLegalAidDatabase();
  const result = await db.rpc("legal_aid_prepare_policy_profile", { p_actor_user_id: input.actorUserId, p_partner_slug: input.partnerSlug, p_intake_schema_version: input.intakeSchemaVersion, p_profile: input.profile });
  if (result.error) {
    if (result.error.message?.includes("forbidden")) throw new ClinicServiceError("forbidden", "Only the partner administrator can prepare a policy profile.");
    throw new ClinicServiceError("unavailable", "The policy profile could not be prepared.");
  }
  return String(result.data);
}

export async function approvePolicyProfile(input: { actorUserId: string; profileId: string; note: string | null }): Promise<string> {
  const db = requireLegalAidDatabase();
  const result = await db.rpc("legal_aid_approve_policy_profile", { p_actor_user_id: input.actorUserId, p_profile_id: input.profileId, p_note: input.note });
  if (result.error) throw new ClinicServiceError("unavailable", "The policy profile could not be approved.");
  const outcome = String(result.data);
  if (outcome === "forbidden") throw new ClinicServiceError("forbidden", "Only the partner's designated administrator can approve a profile.");
  if (outcome === "same_person") throw new ClinicServiceError("conflict", "A profile is approved by a second administrator, not the person who prepared it.");
  if (outcome === "not_draft") throw new ClinicServiceError("conflict", "Only a draft profile can be approved.");
  if (outcome === "not_found") throw new ClinicServiceError("not_found", "Policy profile was not found.");
  return outcome;
}

export type ConfigureLegalAidEventInput = {
  policyProfileId: string;
  registrationOpensAt: string | null;
  registrationClosesAt: string | null;
  appointmentPolicy: "walk_in" | "appointment" | "mixed";
  participantCostNote: string | null;
  publicDescription: string | null;
};

export async function configureLegalAidEvent(eventId: string, actorUserId: string, input: ConfigureLegalAidEventInput): Promise<string> {
  const db = requireLegalAidDatabase();
  const result = await db.rpc("legal_aid_configure_event", {
    p_actor_user_id: actorUserId, p_event_id: eventId, p_policy_profile_id: input.policyProfileId,
    p_registration_opens_at: input.registrationOpensAt, p_registration_closes_at: input.registrationClosesAt,
    p_appointment_policy: input.appointmentPolicy, p_participant_cost_note: input.participantCostNote, p_public_description: input.publicDescription
  });
  if (result.error) throw new ClinicServiceError("unavailable", "The clinic could not be configured.");
  const outcome = String(result.data);
  if (outcome === "forbidden") throw new ClinicServiceError("forbidden", "Only the partner administrator can configure this clinic.");
  if (outcome === "not_found") throw new ClinicServiceError("not_found", "Clinic event was not found.");
  if (outcome === "profile_mismatch") throw new ClinicServiceError("conflict", "Choose one of this organization's policy profiles.");
  if (outcome === "profile_not_approved") throw new ClinicServiceError("conflict", "A published clinic needs an approved policy profile.");
  return outcome;
}

export type StaffCandidate = { partnerUserId: string; email: string; role: string; assigned: boolean; permissions: string[]; status: string | null };

/** The tenant's active staff with their emails, so the coordinator assigns people, not identifiers. */
export async function listStaffCandidates(eventId: string, actor: { kind: "partner"; partnerSlug: string } | { kind: "internal_admin" }): Promise<StaffCandidate[]> {
  const db = requireLegalAidDatabase();
  const event = await db.from("clinic_events").select("id,partner_slug").eq("id", eventId).maybeSingle();
  if (event.error || !event.data) throw new ClinicServiceError("not_found", "Clinic event was not found.");
  if (actor.kind === "partner" && actor.partnerSlug !== event.data.partner_slug) throw new ClinicServiceError("forbidden", "Cross-tenant Clinic access is denied.");
  const [users, staff] = await Promise.all([
    db.from("partner_users").select("id,invited_email,role,status").eq("partner_slug", String(event.data.partner_slug)).eq("status", "active").in("role", ["partner_admin", "partner_staff"]).order("invited_email"),
    db.from("clinic_event_staff").select("partner_user_id,status,permissions").eq("event_id", eventId)
  ]);
  if (users.error || staff.error) throw new ClinicServiceError("unavailable", "Staff are temporarily unavailable.");
  const assignments = new Map((staff.data ?? []).map((row) => [String(row.partner_user_id), row]));
  return (users.data ?? []).map((user) => {
    const assignment = assignments.get(String(user.id));
    return {
      partnerUserId: String(user.id),
      email: user.invited_email ? String(user.invited_email) : "(email not recorded)",
      role: String(user.role),
      assigned: assignment?.status === "approved",
      permissions: assignment ? ((assignment.permissions as string[]) ?? []) : [],
      status: assignment ? String(assignment.status) : null
    };
  });
}

export function isLegalAidPermission(value: string): boolean {
  return (LEGAL_AID_STAFF_PERMISSIONS as readonly string[]).includes(value);
}
