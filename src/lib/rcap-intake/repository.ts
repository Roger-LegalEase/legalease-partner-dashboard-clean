import { getPartnerRecordBySlug, getPartnerRepositoryMode } from "@/lib/partners/partner-repository";
import type { PartnerWriteResult } from "@/lib/partners/types";
import { resolveRcapPersonId } from "@/lib/rcap/person-identity";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { getNextRcapIntakeStep } from "./questions";
import { generateRcapPathwaySummary } from "./pathway-summary";
import type {
  RcapContactInput,
  RcapIntakeResponseInput,
  RcapIntakeSession,
  RcapIntakeStepId,
  RcapPathwaySummary
} from "./types";

type RcapSessionRow = {
  id: string;
  partner_slug: string;
  partner_id: string | null;
  status: string;
  current_step: string;
  user_first_name: string | null;
  user_last_name: string | null;
  user_email: string | null;
  user_phone: string | null;
  person_id: string | null;
  state: string | null;
  county: string | null;
  record_type: string | null;
  charge_or_case_type: string | null;
  case_outcome: string | null;
  approximate_case_year: string | null;
  has_documents: boolean | null;
  needs_record_check: boolean | null;
  pathway_summary: string | null;
  suggested_next_step: string | null;
  eligibility_signal: string | null;
  legal_disclaimer_accepted: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
};

type RcapAuditEventInput = {
  recordId: string;
  partnerSlug: string;
  partnerId?: string | null;
  eventType: "created" | "status_changed" | "completed";
  fromStatus?: string | null;
  toStatus?: string | null;
  metadata?: Record<string, string | boolean | null>;
};

export type RcapIntakeActivitySummary = {
  totalSessions: number;
  completedSessions: number;
  needsReviewSessions: number;
  latestIntakeDate?: string;
  pathwaySummaryCounts: Record<string, number>;
};

export async function startRcapIntakeSession({
  partnerSlug,
  legalDisclaimerAccepted
}: {
  partnerSlug: string;
  legalDisclaimerAccepted: boolean;
}): Promise<{ ok: true; session: RcapIntakeSession; persisted: boolean } | { ok: false; error: string }> {
  if (!isSafeSlug(partnerSlug)) {
    return { ok: false, error: "A valid partner slug is required." };
  }

  if (!legalDisclaimerAccepted) {
    return { ok: false, error: "The legal disclaimer must be acknowledged before intake starts." };
  }

  const partner = await getPartnerRecordBySlug(partnerSlug);
  if (!partner) {
    return { ok: false, error: "Partner not found." };
  }

  const mode = await getPartnerRepositoryMode();
  if (mode !== "supabase") {
    return {
      ok: true,
      persisted: false,
      session: {
        id: crypto.randomUUID(),
        partnerSlug,
        partnerId: partner.partnerId,
        status: "started",
        currentStep: "understand_goal",
        state: partner.targetState ?? partner.state,
        county: partner.targetCounty,
        legalDisclaimerAccepted
      }
    };
  }

  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return { ok: false, error: "Supabase is not configured." };
    }

    const { data, error } = await supabase
      .from("rcap_intake_sessions")
      .insert({
        partner_slug: partnerSlug,
        partner_id: partner.partnerId,
        status: "started",
        current_step: "understand_goal",
        state: partner.targetState ?? partner.state ?? null,
        county: partner.targetCounty ?? null,
        legal_disclaimer_accepted: legalDisclaimerAccepted
      })
      .select("*")
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Unable to start intake session." };
    }

    const eventError = await writeRcapIntakeAuditEvent(supabase, {
      recordId: data.id,
      partnerSlug,
      partnerId: partner.partnerId,
      eventType: "created",
      toStatus: "started",
      metadata: {
        to_step: "understand_goal",
        state: partner.targetState ?? partner.state ?? null,
        county: partner.targetCounty ?? null,
        source: "rcap_intake_repository"
      }
    });
    if (eventError) return { ok: false, error: eventError };

    return { ok: true, persisted: true, session: mapSessionRow(data as RcapSessionRow) };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error) };
  }
}

export async function respondToRcapIntake(
  input: RcapIntakeResponseInput
): Promise<{ ok: true; session: RcapIntakeSession; persisted: boolean } | { ok: false; error: string }> {
  if (!isSafeUuid(input.sessionId)) {
    return { ok: false, error: "A valid intake session is required." };
  }

  const mode = await getPartnerRepositoryMode();
  if (mode !== "supabase") {
    return { ok: false, error: "Supabase persistence is required to resume this intake session." };
  }

  try {
    const session = await getRcapIntakeSession(input.sessionId);
    if (!session) {
      return { ok: false, error: "Intake session not found." };
    }

    if (session.status === "completed") {
      return { ok: false, error: "This intake session is already completed." };
    }

    if (session.currentStep !== input.stepId) {
      return { ok: false, error: "This response does not match the current intake step." };
    }

    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return { ok: false, error: "Supabase is not configured." };
    }

    const fieldUpdates = responseFieldUpdates(input.stepId, input.value);
    if (input.stepId === "contact_information") {
      const person = await resolveRcapPersonId(supabase, {
        partnerSlug: session.partnerSlug,
        email: stringOrNull(fieldUpdates.user_email),
        firstName: stringOrNull(fieldUpdates.user_first_name),
        lastName: stringOrNull(fieldUpdates.user_last_name)
      });
      if ("error" in person) return { ok: false, error: person.error };
      if (person.personId) fieldUpdates.person_id = person.personId;
    }
    const nextStep = getNextRcapIntakeStep(input.stepId);

    const { error: responseError } = await supabase.from("rcap_intake_responses").upsert(
      {
        session_id: input.sessionId,
        partner_slug: session.partnerSlug,
        question_key: input.stepId,
        response_value: safeJsonValue(input.value)
      },
      { onConflict: "session_id,question_key" }
    );

    if (responseError) {
      return { ok: false, error: responseError.message };
    }

    const { data, error } = await supabase
      .from("rcap_intake_sessions")
      .update({
        ...fieldUpdates,
        status: "in_progress",
        current_step: nextStep,
        updated_at: new Date().toISOString()
      })
      .eq("id", input.sessionId)
      .select("*")
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Unable to save intake response." };
    }

    const savedSession = mapSessionRow(data as RcapSessionRow);
    const statusChanged = session.status !== savedSession.status;
    const stepChanged = session.currentStep !== savedSession.currentStep;
    if (statusChanged || stepChanged) {
      const eventError = await writeRcapIntakeAuditEvent(supabase, {
        recordId: savedSession.id,
        partnerSlug: savedSession.partnerSlug,
        partnerId: savedSession.partnerId,
        eventType: "status_changed",
        fromStatus: session.status,
        toStatus: savedSession.status,
        metadata: {
          from_step: session.currentStep,
          to_step: savedSession.currentStep,
          state: savedSession.state ?? null,
          county: savedSession.county ?? null,
          source: "rcap_intake_repository"
        }
      });
      if (eventError) return { ok: false, error: eventError };
    }

    return { ok: true, persisted: true, session: savedSession };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error) };
  }
}

export async function completeRcapIntakeSession(
  sessionId: string
): Promise<{ ok: true; session: RcapIntakeSession; summary: RcapPathwaySummary; persisted: boolean } | { ok: false; error: string }> {
  if (!isSafeUuid(sessionId)) {
    return { ok: false, error: "A valid intake session is required." };
  }

  const session = await getRcapIntakeSession(sessionId);
  if (!session) {
    return { ok: false, error: "Intake session not found." };
  }

  const summary = generateRcapPathwaySummary(session);
  const mode = await getPartnerRepositoryMode();
  if (mode !== "supabase") {
    return {
      ok: true,
      persisted: false,
      summary,
      session: {
        ...session,
        status: "completed",
        currentStep: "completed",
        pathwaySummary: summary.pathwaySummary,
        suggestedNextStep: summary.suggestedNextStep,
        eligibilitySignal: summary.eligibilitySignal
      }
    };
  }

  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return { ok: false, error: "Supabase is not configured." };
    }

    const { data, error } = await supabase
      .from("rcap_intake_sessions")
      .update({
        status: summary.eligibilitySignal === "human_review_recommended" ? "needs_review" : "completed",
        current_step: "completed",
        pathway_summary: summary.pathwaySummary,
        suggested_next_step: summary.suggestedNextStep,
        eligibility_signal: summary.eligibilitySignal,
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq("id", sessionId)
      .select("*")
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message ?? "Unable to complete intake session." };
    }

    const savedSession = mapSessionRow(data as RcapSessionRow);
    const statusChanged = session.status !== savedSession.status;
    const stepChanged = session.currentStep !== savedSession.currentStep;
    if (statusChanged || stepChanged) {
      const eventError = await writeRcapIntakeAuditEvent(supabase, {
        recordId: savedSession.id,
        partnerSlug: savedSession.partnerSlug,
        partnerId: savedSession.partnerId,
        eventType: "completed",
        fromStatus: session.status,
        toStatus: savedSession.status,
        metadata: {
          from_step: session.currentStep,
          to_step: savedSession.currentStep,
          state: savedSession.state ?? null,
          county: savedSession.county ?? null,
          eligibility_signal: savedSession.eligibilitySignal ?? null,
          source: "rcap_intake_repository"
        }
      });
      if (eventError) return { ok: false, error: eventError };
    }

    return { ok: true, persisted: true, summary, session: savedSession };
  } catch (error) {
    return { ok: false, error: getErrorMessage(error) };
  }
}

export async function getRcapIntakeSession(sessionId: string): Promise<RcapIntakeSession | undefined> {
  if (!isSafeUuid(sessionId)) {
    return undefined;
  }

  const mode = await getPartnerRepositoryMode();
  if (mode !== "supabase") {
    return undefined;
  }

  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return undefined;
    }

    const { data, error } = await supabase.from("rcap_intake_sessions").select("*").eq("id", sessionId).maybeSingle();
    if (error || !data) {
      return undefined;
    }

    return mapSessionRow(data as RcapSessionRow);
  } catch {
    return undefined;
  }
}

export async function getPartnerIntakeActivitySummary(partnerSlug: string): Promise<RcapIntakeActivitySummary> {
  const emptySummary: RcapIntakeActivitySummary = {
    totalSessions: 0,
    completedSessions: 0,
    needsReviewSessions: 0,
    pathwaySummaryCounts: {}
  };

  if (!isSafeSlug(partnerSlug) || (await getPartnerRepositoryMode()) !== "supabase") {
    return emptySummary;
  }

  try {
    const supabase = getSupabaseAdminClient();
    if (!supabase) {
      return emptySummary;
    }

    const { data, error } = await supabase
      .from("rcap_intake_sessions")
      .select("status, eligibility_signal, created_at, completed_at")
      .eq("partner_slug", partnerSlug)
      .order("created_at", { ascending: false })
      .limit(250);

    if (error || !data) {
      return emptySummary;
    }

    const rows = data as Array<{ status: string | null; eligibility_signal: string | null; created_at: string | null; completed_at: string | null }>;
    const pathwaySummaryCounts: Record<string, number> = {};
    for (const row of rows) {
      const key = row.eligibility_signal ?? "not_completed";
      pathwaySummaryCounts[key] = (pathwaySummaryCounts[key] ?? 0) + 1;
    }

    return {
      totalSessions: rows.length,
      completedSessions: rows.filter((row) => row.status === "completed" || row.completed_at).length,
      needsReviewSessions: rows.filter((row) => row.status === "needs_review" || row.eligibility_signal === "human_review_recommended").length,
      latestIntakeDate: rows[0]?.created_at ?? undefined,
      pathwaySummaryCounts
    };
  } catch {
    return emptySummary;
  }
}

export function intakeWriteFailure(partnerSlug: string, action: string, error: string): PartnerWriteResult {
  return {
    success: false,
    persisted: false,
    mode: "supabase",
    partnerSlug,
    action,
    message: "RCAP intake write failed.",
    error
  };
}

function responseFieldUpdates(stepId: RcapIntakeStepId, value: unknown): Record<string, string | boolean | null> {
  if (stepId === "contact_information") {
    const contact = readContact(value);
    return {
      user_first_name: contact.firstName ?? null,
      user_last_name: contact.lastName ?? null,
      user_email: contact.email ?? null,
      user_phone: contact.phone ?? null
    };
  }

  if (stepId === "has_documents") {
    return { has_documents: Boolean(value) };
  }

  if (stepId === "needs_record_check") {
    return { needs_record_check: Boolean(value) };
  }

  const textValue = typeof value === "string" ? value.trim().slice(0, 160) : "";
  const fieldMap: Record<Exclude<RcapIntakeStepId, "contact_information" | "has_documents" | "needs_record_check">, string> = {
    understand_goal: "record_type",
    state: "state",
    county: "county",
    case_outcome: "case_outcome",
    approximate_case_year: "approximate_case_year"
  };

  return { [fieldMap[stepId]]: textValue || null };
}

function readContact(value: unknown): RcapContactInput {
  if (!value || typeof value !== "object") {
    return {};
  }

  const input = value as Record<string, unknown>;
  return {
    firstName: readShortText(input.firstName),
    lastName: readShortText(input.lastName),
    email: readShortText(input.email),
    phone: readShortText(input.phone)
  };
}

function readShortText(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 160) : undefined;
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function safeJsonValue(value: unknown): unknown {
  if (typeof value === "string") {
    return value.trim().slice(0, 500);
  }

  if (typeof value === "boolean") {
    return value;
  }

  if (value && typeof value === "object") {
    return readContact(value);
  }

  return null;
}

async function writeRcapIntakeAuditEvent(supabase: ReturnType<typeof getSupabaseAdminClient>, event: RcapAuditEventInput): Promise<string | null> {
  if (!supabase) return "Supabase is not configured.";
  const { error } = await supabase.from("rcap_record_events").insert({
    record_type: "intake_session",
    record_id: event.recordId,
    partner_slug: event.partnerSlug,
    partner_id: event.partnerId ?? null,
    event_type: event.eventType,
    from_status: event.fromStatus ?? null,
    to_status: event.toStatus ?? null,
    actor: "system",
    metadata: event.metadata ?? null
  });
  return error?.message ?? null;
}

function mapSessionRow(row: RcapSessionRow): RcapIntakeSession {
  return {
    id: row.id,
    partnerSlug: row.partner_slug,
    partnerId: row.partner_id ?? undefined,
    status: row.status as RcapIntakeSession["status"],
    currentStep: row.current_step as RcapIntakeSession["currentStep"],
    userFirstName: row.user_first_name ?? undefined,
    userLastName: row.user_last_name ?? undefined,
    userEmail: row.user_email ?? undefined,
    userPhone: row.user_phone ?? undefined,
    personId: row.person_id ?? undefined,
    state: row.state ?? undefined,
    county: row.county ?? undefined,
    recordType: row.record_type as RcapIntakeSession["recordType"],
    chargeOrCaseType: row.charge_or_case_type ?? undefined,
    caseOutcome: row.case_outcome as RcapIntakeSession["caseOutcome"],
    approximateCaseYear: row.approximate_case_year ?? undefined,
    hasDocuments: row.has_documents ?? undefined,
    needsRecordCheck: row.needs_record_check ?? undefined,
    pathwaySummary: row.pathway_summary ?? undefined,
    suggestedNextStep: row.suggested_next_step ?? undefined,
    eligibilitySignal: row.eligibility_signal as RcapIntakeSession["eligibilitySignal"],
    legalDisclaimerAccepted: row.legal_disclaimer_accepted === true,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    completedAt: row.completed_at ?? undefined
  };
}

function isSafeSlug(value: string) {
  return /^[a-zA-Z0-9_-]+$/.test(value);
}

function isSafeUuid(value: string) {
  return /^[0-9a-fA-F-]{36}$/.test(value);
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown RCAP intake persistence error.";
}
