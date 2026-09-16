import "server-only";

import { createHash } from "node:crypto";
import { ClinicServiceError } from "@/lib/clinic-mode/errors";
import { participantSubjectPseudonym } from "@/lib/expungement-ai/privacy/pseudonym";
import { computeEligibilitySummary, type EligibilitySummary, type FinancePolicy } from "./eligibility";
import {
  applicableStatements, canonicalAnswersJson, INTAKE_SCHEMA_VERSION, INTAKE_STATEMENTS, normalizeSsn, sanitizeIntakeAnswers,
  SSN_FIELD_KEY, validateIntakeAnswers, type IntakeAnswers, type StatementKey
} from "./intake-schema";
import { getLegalAidEventById, getParticipantRegistration, mapRegistration, requireLegalAidDatabase } from "./registration-service";
import { decryptRestrictedValue, encryptRestrictedValue, RestrictedFieldError, restrictedFieldsConfigured, ssnDisplayHint } from "./restricted-fields";
import type {
  DocumentTask, InformationRequest, IntakeDocument, IntakeSignatureSummary, IntakeStatus, NextStep, ParticipantIntakeView,
  ReviewDecision, StaffIntakeDetail, StaffIntakeListItem
} from "./types";

// Confidential intake: participant side and staff side. Every mutation is a
// security-definer RPC that re-derives authority from the database; this
// module validates shape, hashes answer versions, encrypts restricted values
// and projects rows for the UI. Ordinary reads never include restricted
// ciphertext; the reveal path is separate and audited.

export const REVIEW_PERMISSIONS = ["coordinator", "intake_review", "program_review", "attorney"] as const;

const sha256 = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

export function statementHash(key: StatementKey): { version: string; hash: string; text: string } {
  const statement = INTAKE_STATEMENTS.find((entry) => entry.key === key);
  if (!statement) throw new ClinicServiceError("conflict", "Unknown statement.");
  return { version: statement.version, hash: sha256(`${statement.key}:${statement.version}:${statement.text}`), text: statement.text };
}

// ---------------------------------------------------------------------------
// Participant side
// ---------------------------------------------------------------------------

export async function getParticipantIntake(eventId: string, userId: string): Promise<ParticipantIntakeView | null> {
  const db = requireLegalAidDatabase();
  const result = await db.from("legal_aid_intakes").select("*").eq("event_id", eventId)
    .eq("participant_pseudonym", participantSubjectPseudonym(userId)).maybeSingle();
  if (result.error) throw new ClinicServiceError("unavailable", "Your application is temporarily unavailable.");
  if (!result.data) return null;
  return projectParticipantView(result.data as Record<string, unknown>);
}

export async function getParticipantIntakeById(intakeId: string, userId: string): Promise<ParticipantIntakeView | null> {
  const db = requireLegalAidDatabase();
  const result = await db.from("legal_aid_intakes").select("*").eq("id", intakeId).eq("participant_user_id", userId).maybeSingle();
  if (result.error) throw new ClinicServiceError("unavailable", "Your application is temporarily unavailable.");
  if (!result.data) return null;
  return projectParticipantView(result.data as Record<string, unknown>);
}

async function projectParticipantView(row: Record<string, unknown>): Promise<ParticipantIntakeView> {
  const db = requireLegalAidDatabase();
  const intakeId = String(row.id);
  const [signatures, documents, requests, steps, tasks, restricted] = await Promise.all([
    db.from("legal_aid_intake_signatures").select("id,statement_key,statement_version,answers_version,answers_hash,signer_name,signature_method,signed_at,status").eq("intake_id", intakeId).order("signed_at", { ascending: false }),
    db.from("legal_aid_documents").select("id,category,original_filename,content_type,size_bytes,uploaded_role,created_at,removed_at").eq("intake_id", intakeId).is("removed_at", null).order("created_at", { ascending: false }),
    db.from("legal_aid_information_requests").select("id,request_text,status,created_at,fulfilled_at").eq("intake_id", intakeId).eq("status", "open").order("created_at"),
    db.from("legal_aid_next_steps").select("id,title,detail,status,due_at,owner_event_staff_id,completed_at").eq("intake_id", intakeId).neq("status", "cancelled").order("due_at", { ascending: true, nullsFirst: false }),
    db.from("legal_aid_document_tasks").select("*").eq("intake_id", intakeId).order("created_at"),
    db.from("legal_aid_restricted_fields").select("display_hint").eq("intake_id", intakeId).eq("field_key", SSN_FIELD_KEY).maybeSingle()
  ]);
  if (signatures.error || documents.error || requests.error || steps.error || tasks.error || restricted.error) {
    throw new ClinicServiceError("unavailable", "Your application is temporarily unavailable.");
  }
  const answersHash = row.answers_hash ? String(row.answers_hash) : null;
  return {
    id: intakeId,
    eventId: String(row.event_id),
    status: String(row.status) as IntakeStatus,
    currentVersion: Number(row.current_version),
    answersHash,
    answers: sanitizeIntakeAnswers(row.answers),
    legalMatter: row.legal_matter ? String(row.legal_matter) : null,
    ssnHint: restricted.data?.display_hint ? String(restricted.data.display_hint) : null,
    signatures: (signatures.data ?? []).map((entry) => mapSignature(entry as Record<string, unknown>, answersHash)),
    documents: (documents.data ?? []).map((entry) => mapDocument(entry as Record<string, unknown>)),
    openRequests: (requests.data ?? []).map((entry) => mapRequest(entry as Record<string, unknown>)),
    nextSteps: (steps.data ?? []).map((entry) => mapNextStep(entry as Record<string, unknown>)),
    documentTasks: (tasks.data ?? []).map((entry) => mapTask(entry as Record<string, unknown>)),
    submittedAt: row.submitted_at ? String(row.submitted_at) : null,
    lastActivityAt: String(row.last_activity_at)
  };
}

export type SaveDraftResult = { outcome: "created" | "saved" | "version_conflict" | "not_editable" | "registration_required" | "event_unavailable"; intakeId: string | null; version: number | null; validation: ReturnType<typeof validateIntakeAnswers> };

export async function saveIntakeDraft(input: { eventId: string; userId: string; answers: unknown; expectedVersion: number | null; legalMatter: string | null }): Promise<SaveDraftResult> {
  const answers = sanitizeIntakeAnswers(input.answers);
  const validation = validateIntakeAnswers(answers);
  const legalMatter = input.legalMatter === "felony_expungement" || input.legalMatter === "misdemeanor_expungement" ? input.legalMatter : null;
  const db = requireLegalAidDatabase();
  const result = await db.rpc("legal_aid_save_intake_draft", {
    p_event_id: input.eventId,
    p_participant_user_id: input.userId,
    p_participant_pseudonym: participantSubjectPseudonym(input.userId),
    p_answers: answers,
    p_answers_hash: sha256(canonicalAnswersJson(answers)),
    p_legal_matter: legalMatter,
    p_expected_version: input.expectedVersion
  });
  if (result.error) throw new ClinicServiceError("unavailable", "Your answers could not be saved. Nothing was lost on your screen; please try again.");
  const row = (Array.isArray(result.data) ? result.data[0] : result.data) as Record<string, unknown> | undefined;
  if (!row) throw new ClinicServiceError("unavailable", "Your answers could not be saved.");
  return {
    outcome: String(row.outcome) as SaveDraftResult["outcome"],
    intakeId: row.intake_id ? String(row.intake_id) : null,
    version: row.version === null || row.version === undefined ? null : Number(row.version),
    validation
  };
}

export async function setIntakeSsn(input: { intakeId: string; actorUserId: string; ssn: string }): Promise<{ hint: string }> {
  const digits = normalizeSsn(input.ssn);
  if (!digits) throw new ClinicServiceError("conflict", "Enter a nine-digit Social Security number.");
  if (!restrictedFieldsConfigured()) throw new ClinicServiceError("unavailable", "The protected field is not available right now. Your other answers are saved; please try this step again later.");
  let encrypted;
  try {
    encrypted = encryptRestrictedValue(digits);
  } catch (error) {
    if (error instanceof RestrictedFieldError) throw new ClinicServiceError("unavailable", "The protected field is not available right now.");
    throw error;
  }
  const hint = ssnDisplayHint(digits);
  const db = requireLegalAidDatabase();
  const result = await db.rpc("legal_aid_set_restricted_field", {
    p_intake_id: input.intakeId, p_actor_user_id: input.actorUserId, p_field_key: SSN_FIELD_KEY,
    p_ciphertext: encrypted.ciphertext, p_key_version: encrypted.keyVersion, p_display_hint: hint
  });
  if (result.error) {
    if (result.error.message?.includes("restricted_forbidden")) throw new ClinicServiceError("forbidden", "You cannot change this field.");
    if (result.error.message?.includes("not_editable")) throw new ClinicServiceError("conflict", "The application is no longer editable.");
    throw new ClinicServiceError("unavailable", "The protected field could not be saved.");
  }
  return { hint };
}

export async function signIntakeStatement(input: { intakeId: string; userId: string; statementKey: StatementKey; signerName: string; signatureMethod: "typed" | "drawn"; signatureData: string | null }): Promise<string> {
  const signerName = input.signerName.trim();
  if (signerName.length < 2 || signerName.length > 160) throw new ClinicServiceError("conflict", "Type your full name to sign.");
  if (input.signatureMethod === "drawn" && (!input.signatureData || input.signatureData.length > 60000)) throw new ClinicServiceError("conflict", "Draw your signature to continue.");
  const statement = statementHash(input.statementKey);
  const db = requireLegalAidDatabase();
  const result = await db.rpc("legal_aid_sign_intake", {
    p_intake_id: input.intakeId, p_participant_user_id: input.userId, p_statement_key: input.statementKey,
    p_statement_version: statement.version, p_statement_hash: statement.hash, p_signer_name: signerName,
    p_signature_method: input.signatureMethod, p_signature_data: input.signatureMethod === "drawn" ? input.signatureData : null
  });
  if (result.error) {
    if (result.error.message?.includes("signer_mismatch")) throw new ClinicServiceError("forbidden", "Only the applicant can sign this statement.");
    if (result.error.message?.includes("not_editable")) throw new ClinicServiceError("conflict", "The application is no longer editable.");
    if (result.error.message?.includes("answers_required")) throw new ClinicServiceError("conflict", "Answer the questions before signing.");
    throw new ClinicServiceError("unavailable", "The signature could not be saved.");
  }
  return String(result.data);
}

export type SubmitIntakeResult = { outcome: "submitted" | "already_submitted" | "withdrawn" | "not_found" | "forbidden" | "answers_required" | "validation_failed" | "ssn_required" | "signature_required"; missing?: string[]; errors?: Record<string, string>; statementKey?: string };

export async function submitIntake(input: { intakeId: string; userId: string }): Promise<SubmitIntakeResult> {
  const view = await getParticipantIntakeById(input.intakeId, input.userId);
  if (!view) return { outcome: "not_found" };
  const validation = validateIntakeAnswers(view.answers);
  if (!validation.valid) return { outcome: "validation_failed", missing: validation.missingRequired, errors: validation.errors };
  if (!view.ssnHint) return { outcome: "ssn_required" };
  const required = applicableStatements(view.answers).map((statement) => statement.key);
  for (const key of required) {
    const current = view.signatures.find((signature) => signature.statementKey === key && signature.status === "active" && signature.current);
    if (!current) return { outcome: "signature_required", statementKey: key };
  }
  const db = requireLegalAidDatabase();
  const result = await db.rpc("legal_aid_submit_intake", { p_intake_id: input.intakeId, p_participant_user_id: input.userId, p_required_statement_keys: required });
  if (result.error) throw new ClinicServiceError("unavailable", "Your application could not be submitted. Please try again.");
  const outcome = String(result.data);
  if (outcome.startsWith("signature_required:")) return { outcome: "signature_required", statementKey: outcome.split(":")[1] };
  return { outcome: outcome as SubmitIntakeResult["outcome"] };
}

export async function withdrawIntake(input: { intakeId: string; userId: string }): Promise<string> {
  const db = requireLegalAidDatabase();
  const result = await db.rpc("legal_aid_withdraw_intake", { p_intake_id: input.intakeId, p_participant_user_id: input.userId });
  if (result.error) throw new ClinicServiceError("unavailable", "The application could not be withdrawn.");
  return String(result.data);
}

// ---------------------------------------------------------------------------
// Staff side
// ---------------------------------------------------------------------------

export async function eventPermissionsFor(eventId: string, actorUserId: string): Promise<string[]> {
  const db = requireLegalAidDatabase();
  const [event, membership] = await Promise.all([
    db.from("clinic_events").select("id,partner_slug").eq("id", eventId).maybeSingle(),
    db.from("partner_users").select("id,role,partner_slug,status").eq("auth_user_id", actorUserId).eq("status", "active").limit(2)
  ]);
  if (event.error || membership.error || !event.data) return [];
  const rows = (membership.data ?? []) as { id: string; role: string; partner_slug: string | null }[];
  if (rows.length !== 1) return [];
  const user = rows[0];
  if ((user.role === "internal_admin" && user.partner_slug === null) || (user.role === "partner_admin" && user.partner_slug === event.data.partner_slug)) {
    return ["coordinator", "intake_review", "program_review", "attorney", "notary", "follow_up", "reporting", "export", "queue", "assist"];
  }
  if (user.partner_slug !== event.data.partner_slug) return [];
  const staff = await db.from("clinic_event_staff").select("permissions,status").eq("event_id", eventId).eq("partner_user_id", user.id).maybeSingle();
  if (staff.error || !staff.data || staff.data.status !== "approved") return [];
  return (staff.data.permissions as string[]) ?? [];
}

export async function intakePermissionsFor(intakeId: string, actorUserId: string): Promise<string[]> {
  const db = requireLegalAidDatabase();
  const result = await db.rpc("legal_aid_actor_permissions", { p_intake_id: intakeId, p_actor_user_id: actorUserId });
  if (result.error) throw new ClinicServiceError("unavailable", "Authorization is temporarily unavailable.");
  return Array.isArray(result.data) ? result.data.map(String) : [];
}

export function hasReviewPermission(permissions: string[]): boolean {
  return permissions.some((permission) => (REVIEW_PERMISSIONS as readonly string[]).includes(permission));
}

export async function listEventIntakes(eventId: string, actorUserId: string): Promise<StaffIntakeListItem[]> {
  const permissions = await eventPermissionsFor(eventId, actorUserId);
  if (!hasReviewPermission(permissions)) throw new ClinicServiceError("forbidden", "You are not assigned to review applications for this clinic.");
  const db = requireLegalAidDatabase();
  const [intakes, registrations, requests] = await Promise.all([
    db.from("legal_aid_intakes").select("id,status,legal_matter,registration_id,attorney_review_status,program_decision,submitted_at,last_activity_at").eq("event_id", eventId).order("last_activity_at", { ascending: false }),
    db.from("clinic_registrations").select("id,status,contact_name").eq("event_id", eventId),
    db.from("legal_aid_information_requests").select("intake_id").eq("status", "open")
  ]);
  if (intakes.error || registrations.error || requests.error) throw new ClinicServiceError("unavailable", "Applications are temporarily unavailable.");
  const registrationById = new Map((registrations.data ?? []).map((row) => [String(row.id), row]));
  const openCounts = new Map<string, number>();
  for (const row of requests.data ?? []) openCounts.set(String(row.intake_id), (openCounts.get(String(row.intake_id)) ?? 0) + 1);
  return (intakes.data ?? []).map((row) => {
    const registration = row.registration_id ? registrationById.get(String(row.registration_id)) : undefined;
    return {
      id: String(row.id),
      status: String(row.status) as IntakeStatus,
      contactName: registration ? String(registration.contact_name) : "Registered applicant",
      legalMatter: row.legal_matter ? String(row.legal_matter) : null,
      registrationStatus: registration ? (String(registration.status) as StaffIntakeListItem["registrationStatus"]) : null,
      attorneyReviewStatus: String(row.attorney_review_status),
      programDecision: row.program_decision ? String(row.program_decision) : null,
      openRequestCount: openCounts.get(String(row.id)) ?? 0,
      submittedAt: row.submitted_at ? String(row.submitted_at) : null,
      lastActivityAt: String(row.last_activity_at)
    };
  });
}

export async function getStaffIntakeDetail(intakeId: string, actorUserId: string): Promise<StaffIntakeDetail & { eligibility: EligibilitySummary | null }> {
  const permissions = await intakePermissionsFor(intakeId, actorUserId);
  if (!hasReviewPermission(permissions)) throw new ClinicServiceError("forbidden", "You are not assigned to review this application.");
  const db = requireLegalAidDatabase();
  const intake = await db.from("legal_aid_intakes").select("*").eq("id", intakeId).maybeSingle();
  if (intake.error) throw new ClinicServiceError("unavailable", "The application is temporarily unavailable.");
  if (!intake.data) throw new ClinicServiceError("not_found", "Application was not found.");
  const row = intake.data as Record<string, unknown>;
  const base = await projectParticipantView(row);
  const [registration, decisions, requests, exports, profile] = await Promise.all([
    row.registration_id ? db.from("clinic_registrations").select("*").eq("id", String(row.registration_id)).maybeSingle() : Promise.resolve({ data: null, error: null }),
    db.from("legal_aid_review_decisions").select("id,decision_type,outcome,rationale,policy_basis,reviewer_permission,decided_at").eq("intake_id", intakeId).order("decided_at", { ascending: false }),
    db.from("legal_aid_information_requests").select("id,request_text,status,created_at,fulfilled_at").eq("intake_id", intakeId).order("created_at", { ascending: false }),
    db.from("legal_aid_case_exports").select("id,export_version,includes_restricted,created_at").eq("intake_id", intakeId).order("export_version", { ascending: false }),
    db.from("legal_aid_policy_profiles").select("profile").eq("id", String(row.policy_profile_id)).maybeSingle()
  ]);
  if (registration.error || decisions.error || requests.error || exports.error || profile.error) throw new ClinicServiceError("unavailable", "The application is temporarily unavailable.");
  await db.rpc("legal_aid_record_intake_view", { p_intake_id: intakeId, p_actor_user_id: actorUserId });
  const finance = (profile.data?.profile as { finance?: FinancePolicy } | null)?.finance;
  return {
    ...base,
    partnerSlug: String(row.partner_slug),
    policyProfileId: String(row.policy_profile_id),
    intakeSchemaVersion: String(row.intake_schema_version),
    registration: registration.data ? mapRegistration(registration.data as Record<string, unknown>) : null,
    attorneyReviewStatus: String(row.attorney_review_status),
    programDecision: row.program_decision ? String(row.program_decision) : null,
    externalCaseReference: row.external_case_reference ? String(row.external_case_reference) : null,
    clinicCaseId: row.clinic_case_id ? String(row.clinic_case_id) : null,
    decisions: (decisions.data ?? []).map((entry) => mapDecision(entry as Record<string, unknown>)),
    allRequests: (requests.data ?? []).map((entry) => mapRequest(entry as Record<string, unknown>)),
    exports: (exports.data ?? []).map((entry) => ({ id: String(entry.id), exportVersion: Number(entry.export_version), includesRestricted: Boolean(entry.includes_restricted), createdAt: String(entry.created_at) })),
    permissions,
    eligibility: finance && Array.isArray(finance.countableReceiptCategories) ? computeEligibilitySummary(base.answers, finance) : null
  };
}

/** Notary view: execution tasks and the applicant's name only. Never the intake answers. */
export async function getNotaryTaskView(intakeId: string, actorUserId: string) {
  const permissions = await intakePermissionsFor(intakeId, actorUserId);
  if (!permissions.includes("notary") && !hasReviewPermission(permissions)) throw new ClinicServiceError("forbidden", "You are not assigned to this application.");
  const db = requireLegalAidDatabase();
  const [intake, tasks, docs] = await Promise.all([
    db.from("legal_aid_intakes").select("id,event_id,registration_id,status").eq("id", intakeId).maybeSingle(),
    db.from("legal_aid_document_tasks").select("*").eq("intake_id", intakeId).order("created_at"),
    db.from("legal_aid_documents").select("id,category,original_filename,content_type,size_bytes,uploaded_role,created_at,removed_at").eq("intake_id", intakeId).eq("category", "executed_document").is("removed_at", null)
  ]);
  if (intake.error || tasks.error || docs.error || !intake.data) throw new ClinicServiceError("not_found", "Application was not found.");
  const registration = intake.data.registration_id ? await db.from("clinic_registrations").select("contact_name").eq("id", String(intake.data.registration_id)).maybeSingle() : null;
  return {
    intakeId,
    eventId: String(intake.data.event_id),
    applicantName: registration?.data?.contact_name ? String(registration.data.contact_name) : "Registered applicant",
    tasks: (tasks.data ?? []).map((entry) => mapTask(entry as Record<string, unknown>)),
    executedDocuments: (docs.data ?? []).map((entry) => mapDocument(entry as Record<string, unknown>)),
    permissions
  };
}

function rpcText(result: { data: unknown; error: { message?: string } | null }, unavailable: string): string {
  if (result.error) {
    const message = result.error.message ?? "";
    if (message.includes("forbidden")) throw new ClinicServiceError("forbidden", "You are not assigned to take this action.");
    if (message.includes("not_found")) throw new ClinicServiceError("not_found", "The record was not found.");
    if (message.includes("not_reviewable") || message.includes("not_editable") || message.includes("invalid")) throw new ClinicServiceError("conflict", "This action is not available for the application's current state.");
    throw new ClinicServiceError("unavailable", unavailable);
  }
  return String(result.data);
}

function assertOutcome(outcome: string) {
  if (outcome === "forbidden") throw new ClinicServiceError("forbidden", "You are not assigned to take this action.");
  if (outcome === "not_found") throw new ClinicServiceError("not_found", "The record was not found.");
  if (outcome === "invalid_transition" || outcome === "invalid_status") throw new ClinicServiceError("conflict", "That step is not available from the current status.");
  return outcome;
}

export async function requestInformation(intakeId: string, actorUserId: string, requestText: string): Promise<string> {
  const text = requestText.trim();
  if (text.length < 3 || text.length > 1200) throw new ClinicServiceError("conflict", "Write a short, participant-safe request (3 to 1,200 characters).");
  const db = requireLegalAidDatabase();
  return rpcText(await db.rpc("legal_aid_request_information", { p_intake_id: intakeId, p_actor_user_id: actorUserId, p_request_text: text }), "The request could not be saved.");
}

export async function withdrawInformationRequest(requestId: string, actorUserId: string): Promise<string> {
  const db = requireLegalAidDatabase();
  return assertOutcome(rpcText(await db.rpc("legal_aid_withdraw_information_request", { p_request_id: requestId, p_actor_user_id: actorUserId }), "The request could not be withdrawn."));
}

export async function startReview(intakeId: string, actorUserId: string): Promise<string> {
  const db = requireLegalAidDatabase();
  return assertOutcome(rpcText(await db.rpc("legal_aid_start_review", { p_intake_id: intakeId, p_actor_user_id: actorUserId }), "Review could not be started."));
}

export async function setAttorneyReview(intakeId: string, actorUserId: string, status: "assigned" | "in_review"): Promise<string> {
  const db = requireLegalAidDatabase();
  return assertOutcome(rpcText(await db.rpc("legal_aid_set_attorney_review", { p_intake_id: intakeId, p_actor_user_id: actorUserId, p_status: status }), "Attorney review could not be updated."));
}

export async function recordDecision(input: { intakeId: string; actorUserId: string; decisionType: ReviewDecision["decisionType"]; outcome: string; rationale: string; policyBasis: string | null; evidence: Record<string, unknown> }): Promise<string> {
  const rationale = input.rationale.trim();
  if (rationale.length < 3 || rationale.length > 4000) throw new ClinicServiceError("conflict", "Record the reason for the decision (3 to 4,000 characters).");
  const db = requireLegalAidDatabase();
  return rpcText(await db.rpc("legal_aid_record_decision", {
    p_intake_id: input.intakeId, p_actor_user_id: input.actorUserId, p_decision_type: input.decisionType, p_outcome: input.outcome,
    p_rationale: rationale, p_policy_basis: input.policyBasis, p_evidence: input.evidence
  }), "The decision could not be recorded.");
}

export async function revealSsn(intakeId: string, actorUserId: string, purpose: string): Promise<string> {
  const db = requireLegalAidDatabase();
  const result = await db.rpc("legal_aid_reveal_restricted_field", { p_intake_id: intakeId, p_actor_user_id: actorUserId, p_field_key: SSN_FIELD_KEY, p_purpose: purpose });
  if (result.error) {
    if (result.error.message?.includes("restricted_forbidden")) throw new ClinicServiceError("forbidden", "Only the assigned attorney or coordinator can reveal this field.");
    if (result.error.message?.includes("purpose_required")) throw new ClinicServiceError("conflict", "State why you need the protected value.");
    throw new ClinicServiceError("unavailable", "The protected field is temporarily unavailable.");
  }
  const row = (Array.isArray(result.data) ? result.data[0] : result.data) as { ciphertext?: string; key_version?: string } | undefined;
  if (!row?.ciphertext || !row.key_version) throw new ClinicServiceError("not_found", "No protected value has been entered.");
  try {
    return decryptRestrictedValue({ ciphertext: row.ciphertext, keyVersion: row.key_version });
  } catch (error) {
    if (error instanceof RestrictedFieldError) throw new ClinicServiceError("unavailable", "The protected value cannot be decrypted with the configured key.");
    throw error;
  }
}

export async function createDocumentTask(input: { intakeId: string; actorUserId: string; documentKey: string; title: string; requiredSigner: string; executionMethod: string; authorityNote: string | null; templateVersion: string | null; unsignedRenderJobId: string | null; unsignedArtifactSha256: string | null }): Promise<string> {
  const db = requireLegalAidDatabase();
  return rpcText(await db.rpc("legal_aid_create_document_task", {
    p_intake_id: input.intakeId, p_actor_user_id: input.actorUserId, p_document_key: input.documentKey, p_title: input.title,
    p_required_signer: input.requiredSigner, p_execution_method: input.executionMethod, p_authority_note: input.authorityNote,
    p_template_version: input.templateVersion, p_unsigned_render_job_id: input.unsignedRenderJobId, p_unsigned_artifact_sha256: input.unsignedArtifactSha256
  }), "The document task could not be created.");
}

export async function transitionDocumentTask(input: { taskId: string; actorUserId: string; status: DocumentTask["status"]; executedDocumentId: string | null; note: string | null }): Promise<string> {
  const db = requireLegalAidDatabase();
  return assertOutcome(rpcText(await db.rpc("legal_aid_transition_document_task", {
    p_task_id: input.taskId, p_actor_user_id: input.actorUserId, p_status: input.status, p_executed_document_id: input.executedDocumentId, p_note: input.note
  }), "The document task could not be updated."));
}

export async function replaceDocumentArtifact(input: { taskId: string; actorUserId: string; unsignedRenderJobId: string | null; unsignedArtifactSha256: string }): Promise<string> {
  const db = requireLegalAidDatabase();
  return assertOutcome(rpcText(await db.rpc("legal_aid_replace_document_artifact", {
    p_task_id: input.taskId, p_actor_user_id: input.actorUserId, p_unsigned_render_job_id: input.unsignedRenderJobId, p_unsigned_artifact_sha256: input.unsignedArtifactSha256
  }), "The document artifact could not be replaced."));
}

export async function saveNextStep(input: { nextStepId: string | null; intakeId: string; actorUserId: string; title: string; detail: string | null; dueAt: string | null; ownerEventStaffId: string | null; status: NextStep["status"] }): Promise<string> {
  const title = input.title.trim();
  if (title.length < 3 || title.length > 160) throw new ClinicServiceError("conflict", "Give the next step a short title.");
  const db = requireLegalAidDatabase();
  return rpcText(await db.rpc("legal_aid_save_next_step", {
    p_next_step_id: input.nextStepId, p_intake_id: input.intakeId, p_actor_user_id: input.actorUserId, p_title: title, p_detail: input.detail,
    p_due_at: input.dueAt, p_owner_event_staff_id: input.ownerEventStaffId, p_status: input.status
  }), "The next step could not be saved.");
}

export async function setExternalCaseReference(intakeId: string, actorUserId: string, reference: string | null): Promise<string> {
  const db = requireLegalAidDatabase();
  return assertOutcome(rpcText(await db.rpc("legal_aid_set_external_case_reference", { p_intake_id: intakeId, p_actor_user_id: actorUserId, p_reference: reference }), "The case reference could not be saved."));
}

/** Resolves the participant's own render jobs for a submitted intake so an execution copy can be bound to the applicant's packet, never to another person's. */
export async function listApplicantRenderJobs(intakeId: string, actorUserId: string): Promise<{ id: string; status: string; outputSha256: string | null; createdAt: string }[]> {
  const permissions = await intakePermissionsFor(intakeId, actorUserId);
  if (!permissions.includes("attorney") && !permissions.includes("coordinator")) throw new ClinicServiceError("forbidden", "You are not assigned to prepare documents.");
  const db = requireLegalAidDatabase();
  const intake = await db.from("legal_aid_intakes").select("participant_user_id,clinic_case_id").eq("id", intakeId).maybeSingle();
  if (intake.error || !intake.data?.participant_user_id) return [];
  // A paid packet is bound through consumer_auth_user_id; a clinic-sponsored
  // packet (the MVLP case) is bound through sponsored_consumer_auth_user_id
  // only. Both are the applicant's own; the participant id is a UUID already
  // validated by the intake row, never free text.
  const participantUserId = String(intake.data.participant_user_id);
  const jobs = await db.from("packet_render_jobs").select("id,status,output_sha256,created_at")
    .or(`consumer_auth_user_id.eq.${participantUserId},sponsored_consumer_auth_user_id.eq.${participantUserId}`)
    .in("status", ["artifact_validated", "delivered"]).order("created_at", { ascending: false }).limit(10);
  if (jobs.error) return [];
  return (jobs.data ?? []).map((job) => ({ id: String(job.id), status: String(job.status), outputSha256: job.output_sha256 ? String(job.output_sha256) : null, createdAt: String(job.created_at) }));
}

export async function getEventForStaff(eventId: string, actorUserId: string) {
  const permissions = await eventPermissionsFor(eventId, actorUserId);
  if (permissions.length === 0) throw new ClinicServiceError("forbidden", "You are not assigned to this clinic.");
  const event = await getLegalAidEventById(eventId);
  if (!event) throw new ClinicServiceError("not_found", "Clinic event was not found.");
  return { event, permissions };
}

export async function getParticipantContextForEvent(eventId: string, userId: string) {
  const [registration, intake] = await Promise.all([getParticipantRegistration(eventId, userId), getParticipantIntake(eventId, userId)]);
  return { registration, intake };
}

export function intakeSchemaVersion() {
  return INTAKE_SCHEMA_VERSION;
}

// ---------------------------------------------------------------------------
// Row projections
// ---------------------------------------------------------------------------

function mapSignature(row: Record<string, unknown>, currentHash: string | null): IntakeSignatureSummary {
  return {
    id: String(row.id), statementKey: String(row.statement_key), statementVersion: String(row.statement_version),
    answersVersion: Number(row.answers_version), answersHash: String(row.answers_hash), signerName: String(row.signer_name),
    signatureMethod: String(row.signature_method) as "typed" | "drawn", signedAt: String(row.signed_at),
    status: String(row.status) as "active" | "superseded", current: row.status === "active" && currentHash !== null && row.answers_hash === currentHash
  };
}

export function mapDocument(row: Record<string, unknown>): IntakeDocument {
  return {
    id: String(row.id), category: String(row.category) as IntakeDocument["category"], originalFilename: String(row.original_filename),
    contentType: String(row.content_type), sizeBytes: Number(row.size_bytes), uploadedRole: String(row.uploaded_role) as "participant" | "staff",
    createdAt: String(row.created_at), removedAt: row.removed_at ? String(row.removed_at) : null
  };
}

function mapRequest(row: Record<string, unknown>): InformationRequest {
  return { id: String(row.id), requestText: String(row.request_text), status: String(row.status) as InformationRequest["status"], createdAt: String(row.created_at), fulfilledAt: row.fulfilled_at ? String(row.fulfilled_at) : null };
}

function mapNextStep(row: Record<string, unknown>): NextStep {
  return { id: String(row.id), title: String(row.title), detail: row.detail ? String(row.detail) : null, status: String(row.status) as NextStep["status"], dueAt: row.due_at ? String(row.due_at) : null, ownerEventStaffId: row.owner_event_staff_id ? String(row.owner_event_staff_id) : null, completedAt: row.completed_at ? String(row.completed_at) : null };
}

function mapTask(row: Record<string, unknown>): DocumentTask {
  return {
    id: String(row.id), documentKey: String(row.document_key), title: String(row.title), requiredSigner: String(row.required_signer), executionMethod: String(row.execution_method),
    authorityNote: row.authority_note ? String(row.authority_note) : null, templateVersion: row.template_version ? String(row.template_version) : null,
    status: String(row.status) as DocumentTask["status"], unsignedArtifactSha256: row.unsigned_artifact_sha256 ? String(row.unsigned_artifact_sha256) : null,
    unsignedRenderJobId: row.unsigned_render_job_id ? String(row.unsigned_render_job_id) : null, executedDocumentId: row.executed_document_id ? String(row.executed_document_id) : null,
    reviewedAt: row.reviewed_at ? String(row.reviewed_at) : null, filedAt: row.filed_at ? String(row.filed_at) : null, filingNote: row.filing_note ? String(row.filing_note) : null, createdAt: String(row.created_at)
  };
}

function mapDecision(row: Record<string, unknown>): ReviewDecision {
  return { id: String(row.id), decisionType: String(row.decision_type) as ReviewDecision["decisionType"], outcome: String(row.outcome), rationale: String(row.rationale), policyBasis: row.policy_basis ? String(row.policy_basis) : null, reviewerPermission: String(row.reviewer_permission), decidedAt: String(row.decided_at) };
}

export type { IntakeAnswers };

/** Approved event staff with their emails, so next-step owners and follow-up owners are chosen by person, not identifier. */
export async function listEventStaffDirectory(eventId: string, actorUserId: string): Promise<{ eventStaffId: string; email: string; role: string; permissions: string[] }[]> {
  const permissions = await eventPermissionsFor(eventId, actorUserId);
  if (permissions.length === 0) throw new ClinicServiceError("forbidden", "You are not assigned to this clinic.");
  const db = requireLegalAidDatabase();
  const staff = await db.from("clinic_event_staff").select("id,partner_user_id,permissions").eq("event_id", eventId).eq("status", "approved");
  if (staff.error) throw new ClinicServiceError("unavailable", "Clinic staff are temporarily unavailable.");
  const ids = (staff.data ?? []).map((row) => String(row.partner_user_id));
  const users = ids.length ? await db.from("partner_users").select("id,invited_email,role").in("id", ids) : { data: [], error: null };
  if (users.error) throw new ClinicServiceError("unavailable", "Clinic staff are temporarily unavailable.");
  const byId = new Map((users.data ?? []).map((row) => [String(row.id), row]));
  return (staff.data ?? []).map((row) => {
    const user = byId.get(String(row.partner_user_id));
    return { eventStaffId: String(row.id), email: user?.invited_email ? String(user.invited_email) : "(email not recorded)", role: user?.role ? String(user.role) : "partner_staff", permissions: (row.permissions as string[]) ?? [] };
  });
}

/**
 * The unsigned execution copy of a court document, for the attorney,
 * coordinator or notary on the application. It is the participant's own
 * prepared packet: the render job must belong to the applicant and its
 * stored bytes must match the hash recorded on the task. The read is
 * recorded in the access log; nothing about delivery entitlement changes.
 */
export async function openUnsignedArtifact(taskId: string, actorUserId: string): Promise<{ bytes: Uint8Array; filename: string }> {
  const db = requireLegalAidDatabase();
  const task = await db.from("legal_aid_document_tasks").select("id,intake_id,title,unsigned_render_job_id,unsigned_artifact_sha256").eq("id", taskId).maybeSingle();
  if (task.error) throw new ClinicServiceError("unavailable", "The document is temporarily unavailable.");
  if (!task.data) throw new ClinicServiceError("not_found", "Document task was not found.");
  const intakeId = String(task.data.intake_id);
  const permissions = await intakePermissionsFor(intakeId, actorUserId);
  if (!permissions.includes("attorney") && !permissions.includes("coordinator") && !permissions.includes("notary")) throw new ClinicServiceError("forbidden", "You are not assigned to this document.");
  if (!task.data.unsigned_render_job_id || !task.data.unsigned_artifact_sha256) throw new ClinicServiceError("not_found", "No prepared copy is attached to this document yet.");
  const [{ getRenderJob }, { getPacketArtifactStorage }] = await Promise.all([import("@/lib/rcap/render/job-queue"), import("@/lib/rcap/render/artifact-storage")]);
  const intake = await db.from("legal_aid_intakes").select("participant_user_id").eq("id", intakeId).maybeSingle();
  const job = await getRenderJob(String(task.data.unsigned_render_job_id));
  const jobOwner = job?.consumerAuthUserId ?? job?.sponsoredConsumerAuthUserId ?? null;
  if (!job || !intake.data?.participant_user_id || jobOwner !== String(intake.data.participant_user_id)) throw new ClinicServiceError("not_found", "The prepared copy does not belong to this applicant.");
  if (!job.outputStoragePath || job.outputSha256 !== String(task.data.unsigned_artifact_sha256)) throw new ClinicServiceError("conflict", "The prepared copy no longer matches the copy recorded on this document.");
  const storage = getPacketArtifactStorage();
  if (!storage) throw new ClinicServiceError("unavailable", "Packet storage is not configured.");
  const buffer = await storage.read(job.outputStoragePath);
  if (!buffer) throw new ClinicServiceError("not_found", "The prepared copy could not be read.");
  const bytes = new Uint8Array(buffer);
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== job.outputSha256) throw new ClinicServiceError("unavailable", "The prepared copy failed its integrity check.");
  // Fail closed: a read that cannot be recorded in the access log is not served.
  const audit = await db.rpc("legal_aid_record_access", { p_intake_id: intakeId, p_actor_user_id: actorUserId, p_action: "unsigned_copy_opened", p_metadata: { task_id: taskId, render_job_id: job.id, sha256: actual } });
  if (audit.error) throw new ClinicServiceError("unavailable", "The access log could not be written, so the copy was not opened.");
  return { bytes, filename: `${String(task.data.title).replace(/[^\w. -]/g, "_").slice(0, 80)} (unsigned).pdf` };
}
