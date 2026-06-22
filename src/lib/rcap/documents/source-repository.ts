import "server-only";

import type {
  DcDocumentPacketInput,
  IllinoisDocumentPacketInput,
  MississippiDocumentPacketInput,
  PennsylvaniaDocumentPacketInput,
  RcapDocumentPacket,
  RcapReliefOutcome,
  SourceDocumentPacketInput,
  TexasHarrisDocumentPacketInput
} from "@/lib/rcap/documents/types";
import { rcapReliefOutcomeValues } from "@/lib/rcap/documents/types";
import { getPartnerRepositoryMode } from "@/lib/partners/partner-repository";
import { buildFilingNextStepsPacket } from "@/lib/rcap/documents/filing-next-steps";
import { getSupabaseAdminClient, isSupabaseConfigured } from "@/lib/supabase/server";

const packets = new Map<string, RcapDocumentPacket>();
let fallbackWarningLogged = false;

type PacketResult = Promise<{ ok: true; packet: RcapDocumentPacket; persisted: boolean } | { ok: false; error: string }>;
type PacketAuditEvent =
  | { eventType: "created"; fromStatus?: null; toStatus: RcapDocumentPacket["status"] }
  | { eventType: "status_changed"; fromStatus: RcapDocumentPacket["status"]; toStatus: RcapDocumentPacket["status"] };

export type RcapReliefOutcomeAdminRow = {
  id: string;
  partnerSlug: string;
  state: string;
  county?: string;
  status: RcapDocumentPacket["status"];
  reliefOutcome: RcapReliefOutcome;
  updatedAt?: string;
  createdAt?: string;
};

export async function createMississippiDocumentPacket(input: MississippiDocumentPacketInput): PacketResult {
  return createSourceDocumentPacket({ ...input, state: "MS" });
}

export async function createIllinoisDocumentPacket(input: IllinoisDocumentPacketInput): PacketResult {
  return createSourceDocumentPacket({ ...input, state: "IL" });
}

export async function createDcDocumentPacket(input: DcDocumentPacketInput): PacketResult {
  return createSourceDocumentPacket({ ...input, state: "DC" });
}

export async function createPennsylvaniaDocumentPacket(input: PennsylvaniaDocumentPacketInput): PacketResult {
  return createSourceDocumentPacket({ ...input, state: "PA" });
}

export async function createTexasHarrisDocumentPacket(input: TexasHarrisDocumentPacketInput): PacketResult {
  return createSourceDocumentPacket({ ...input, state: "TX", county: "Harris" });
}

export async function getRcapDocumentPacket(packetId: string) {
  const cached = packets.get(packetId);
  if (cached) return cached;

  const mode = await sourcePacketPersistenceMode();
  if (mode.kind !== "supabase") return null;

  const packet = await readPersistedSourceDocumentPacket(packetId);
  if (packet) packets.set(packet.id, packet);
  return packet;
}

export async function generateSavedMississippiDocumentPacket(packetId: string): PacketResult {
  return generateSavedSourceDocumentPacket(packetId);
}

export async function generateSavedDcDocumentPacket(packetId: string): PacketResult {
  return generateSavedSourceDocumentPacket(packetId);
}

export async function saveMississippiDocumentPacketInputs(packetId: string, input: Partial<MississippiDocumentPacketInput>): PacketResult {
  return saveSourceDocumentPacketInputs(packetId, input);
}

export async function saveDcDocumentPacketInputs(packetId: string, input: Partial<DcDocumentPacketInput>): PacketResult {
  return saveSourceDocumentPacketInputs(packetId, input);
}

export async function getPartnerDocumentActivitySummary(partnerSlug?: string) {
  const mode = await sourcePacketPersistenceMode();
  if (mode.kind === "supabase") {
    const supabase = getSupabaseAdminClient();
    if (supabase) {
      let query = supabase
        .from("rcap_document_packets")
        .select("id, partner_slug, state, county, pathway, status, relief_outcome, briefcase_id, updated_at, created_at");
      if (partnerSlug) query = query.eq("partner_slug", partnerSlug);
      const { data, error } = await query;
      if (!error && data) return documentActivitySummaryFromPackets((data as DocumentActivityPacketRow[]).map(activityPacketFromRow));
    }
  }

  const allPackets = Array.from(packets.values()).filter((packet) => !partnerSlug || packet.partnerSlug === partnerSlug);
  return documentActivitySummaryFromPackets(allPackets);
}

function documentActivitySummaryFromPackets(allPackets: DocumentActivityPacket[]) {
  return {
    totalPackets: allPackets.length,
    missingInformationPackets: allPackets.filter((packet) => packet.status === "missing_information").length,
    readyForReviewPackets: allPackets.filter((packet) => packet.status === "ready_for_review").length,
    blockedReviewRequired: allPackets.filter((packet) => packet.status === "blocked_review_required").length,
    briefcaseItems: allPackets.filter((packet) => packet.briefcaseId).length,
    latestPacketDate: allPackets.map((packet) => packet.updatedAt ?? packet.createdAt).filter(Boolean).sort().at(-1) ?? null,
    actualReliefDeliveredPackets: allPackets.filter((packet) => isDeliveredReliefOutcome(packet.reliefOutcome)).length,
    reliefOutcomeBreakdown: countBy(allPackets.map((packet) => packet.reliefOutcome)),
    pathwayBreakdown: countBy(allPackets.map((packet) => packet.pathway)),
    stateBreakdown: countBy(allPackets.map((packet) => packet.state))
  };
}

export async function getPartnerReliefOutcomeAdminRows(partnerSlug: string, limit = 25): Promise<RcapReliefOutcomeAdminRow[]> {
  const mode = await sourcePacketPersistenceMode();
  if (mode.kind !== "supabase") {
    return Array.from(packets.values())
      .filter((packet) => packet.partnerSlug === partnerSlug)
      .sort((left, right) => String(right.updatedAt ?? right.createdAt).localeCompare(String(left.updatedAt ?? left.createdAt)))
      .slice(0, limit)
      .map(adminRowFromPacket);
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("rcap_document_packets")
    .select("id, partner_slug, state, county, status, relief_outcome, updated_at, created_at")
    .eq("partner_slug", partnerSlug)
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as ReliefOutcomePacketRow[]).map(adminRowFromReliefOutcomeRow);
}

export async function setRcapDocumentPacketReliefOutcome(input: {
  packetId: string;
  partnerSlug: string;
  reliefOutcome: RcapReliefOutcome;
}): Promise<{ ok: true; packet: RcapReliefOutcomeAdminRow; changed: boolean } | { ok: false; error: string }> {
  if (!isRcapReliefOutcome(input.reliefOutcome)) return { ok: false, error: "Unsupported relief outcome." };
  const mode = await sourcePacketPersistenceMode();
  if (mode.kind !== "supabase") {
    return { ok: false, error: "Relief outcome changes require Supabase audit trail persistence." };
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured for RCAP relief outcome persistence." };

  const { data: existing, error: readError } = await supabase
    .from("rcap_document_packets")
    .select("id, partner_slug, state, county, status, relief_outcome, updated_at, created_at")
    .eq("id", input.packetId)
    .maybeSingle();
  if (readError) return { ok: false, error: readError.message };
  if (!existing) return { ok: false, error: "Document packet not found." };

  const current = existing as ReliefOutcomePacketRow;
  if (current.partner_slug !== input.partnerSlug) return { ok: false, error: "Document packet does not belong to this partner." };
  if (current.relief_outcome === input.reliefOutcome) {
    return { ok: true, packet: adminRowFromReliefOutcomeRow(current), changed: false };
  }

  const { data: updated, error: updateError } = await supabase
    .from("rcap_document_packets")
    .update({ relief_outcome: input.reliefOutcome })
    .eq("id", input.packetId)
    .select("id, partner_slug, state, county, status, relief_outcome, updated_at, created_at")
    .single();
  if (updateError) return { ok: false, error: updateError.message };
  const packet = adminRowFromReliefOutcomeRow(updated as ReliefOutcomePacketRow);
  const cached = packets.get(packet.id);
  if (cached) packets.set(packet.id, { ...cached, reliefOutcome: packet.reliefOutcome, updatedAt: packet.updatedAt });
  return { ok: true, packet, changed: true };
}

async function createSourceDocumentPacket(input: SourceDocumentPacketInput): PacketResult {
  if (!input.partnerSlug) return { ok: false, error: "A partner slug is required." };
  const packet = packetFromInput(input);
  packets.set(packet.id, packet);
  const persisted = await persistOrFallback(packet, input, {
    eventType: "created",
    toStatus: packet.status
  });
  if (!persisted.ok) return persisted;
  return { ok: true, packet, persisted: persisted.persisted };
}

async function generateSavedSourceDocumentPacket(packetId: string): PacketResult {
  const packet = await getRcapDocumentPacket(packetId);
  if (!packet) return { ok: false, error: "Document packet not found." };
  const generated = {
    ...packet,
    status: "preview_generated" as const,
    completedAt: new Date().toISOString()
  };
  packets.set(packetId, generated);
  const persisted = await persistOrFallback(generated, undefined, {
    eventType: "status_changed",
    fromStatus: packet.status,
    toStatus: generated.status
  });
  if (!persisted.ok) return persisted;
  return { ok: true, packet: generated, persisted: persisted.persisted };
}

async function saveSourceDocumentPacketInputs(packetId: string, input: Partial<SourceDocumentPacketInput>): PacketResult {
  const packet = await getRcapDocumentPacket(packetId);
  if (!packet) return { ok: false, error: "Document packet not found." };
  const updated = packetFromInput({
    ...packet,
    ...input,
    partnerSlug: packet.partnerSlug,
    state: packet.state
  });
  packets.set(packetId, { ...updated, id: packetId });
  const savedPacket = packets.get(packetId) as RcapDocumentPacket;
  const persisted = await persistOrFallback(
    savedPacket,
    input,
    packet.status === savedPacket.status
      ? undefined
      : {
          eventType: "status_changed",
          fromStatus: packet.status,
          toStatus: savedPacket.status
        }
  );
  if (!persisted.ok) return persisted;
  return { ok: true, packet: savedPacket, persisted: persisted.persisted };
}

async function persistOrFallback(
  packet: RcapDocumentPacket,
  inputPayload?: Partial<SourceDocumentPacketInput>,
  auditEvent?: PacketAuditEvent
): Promise<{ ok: true; persisted: boolean } | { ok: false; error: string }> {
  const mode = await sourcePacketPersistenceMode();
  if (mode.kind === "blocked") return { ok: false, error: mode.error };
  if (mode.kind === "fallback") {
    logPersistenceFallback(mode.reason);
    return { ok: true, persisted: false };
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured for RCAP document packet persistence." };

  const { error: packetError } = await supabase
    .from("rcap_document_packets")
    .upsert(packetRow(packet), { onConflict: "id" });
  if (packetError) return { ok: false, error: packetError.message };

  if (auditEvent) {
    const { error: eventError } = await supabase.from("rcap_record_events").insert(packetAuditEventRow(packet, auditEvent));
    if (eventError) return { ok: false, error: eventError.message };
  }

  if (inputPayload) {
    const { error: inputError } = await supabase
      .from("rcap_document_packet_inputs")
      .upsert(packetInputRow(packet, inputPayload), { onConflict: "document_packet_id" });
    if (inputError) return { ok: false, error: inputError.message };
  }

  if (packet.briefcaseId) {
    const { error: briefcaseError } = await supabase
      .from("rcap_briefcase_items")
      .upsert(briefcaseItemRow(packet), { onConflict: "document_packet_id" });
    if (briefcaseError) return { ok: false, error: briefcaseError.message };
  }

  return { ok: true, persisted: true };
}

async function sourcePacketPersistenceMode(): Promise<
  | { kind: "supabase" }
  | { kind: "fallback"; reason: string }
  | { kind: "blocked"; error: string }
> {
  const mode = await getPartnerRepositoryMode();
  if (mode === "supabase" && isSupabaseConfigured()) return { kind: "supabase" };

  const reason =
    mode === "local_seeded"
      ? "ENABLE_SUPABASE_PARTNER_DATA is not true."
      : "Supabase service configuration is incomplete.";
  if (process.env.NODE_ENV === "production") {
    return {
      kind: "blocked",
      error: `RCAP document packet persistence is required in production. ${reason}`
    };
  }

  return { kind: "fallback", reason };
}

function logPersistenceFallback(reason: string) {
  if (fallbackWarningLogged) return;
  fallbackWarningLogged = true;
  console.warn(`RCAP document packet persistence fallback active; packets are in-memory only. ${reason}`);
}

async function readPersistedSourceDocumentPacket(packetId: string): Promise<RcapDocumentPacket | null> {
  const supabase = getSupabaseAdminClient();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("rcap_document_packets")
    .select("*")
    .eq("id", packetId)
    .maybeSingle();
  if (error || !data) return null;
  return packetFromRow(data as SourceDocumentPacketRow);
}

type SourceDocumentPacketRow = {
  id: string;
  partner_slug: string;
  intake_session_id: string | null;
  user_id: string | null;
  briefcase_id: string | null;
  state: string;
  county: string | null;
  document_type: string | null;
  pathway: string;
  status: string;
  relief_outcome: string | null;
  petitioner_first_name: string | null;
  petitioner_last_name: string | null;
  petitioner_city: string | null;
  petitioner_county: string | null;
  court_type: string | null;
  court_county: string | null;
  court_name: string | null;
  jurisdiction: string | null;
  cause_number: string | null;
  charge: string | null;
  offense_date: string | null;
  arrest_date: string | null;
  arresting_agency: string | null;
  agency_case_number: string | null;
  disposition_date: string | null;
  conviction_date: string | null;
  sentence_completion_date: string | null;
  has_zero_balance: boolean | null;
  has_court_documents: boolean | null;
  first_offender_signal: boolean | null;
  non_traffic_signal: boolean | null;
  excluded_offense_screening: boolean | null;
  one_felony_expungement_signal: boolean | null;
  needs_record_review: boolean | null;
  generated_html: string | null;
  generated_plain_text: string | null;
  filing_instructions: string[] | null;
  county_court_instructions: string[] | null;
  missing_fields: string[] | null;
  safety_disclaimer: string | null;
  created_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
};

type ReliefOutcomePacketRow = {
  id: string;
  partner_slug: string;
  state: string;
  county: string | null;
  status: string;
  relief_outcome: string | null;
  updated_at: string | null;
  created_at: string | null;
};

type DocumentActivityPacketRow = {
  id: string;
  partner_slug: string;
  state: string;
  county: string | null;
  pathway: string | null;
  status: string;
  relief_outcome: string | null;
  briefcase_id: string | null;
  updated_at: string | null;
  created_at: string | null;
};

type DocumentActivityPacket = {
  state: string;
  pathway: string;
  status: RcapDocumentPacket["status"];
  reliefOutcome: RcapReliefOutcome;
  briefcaseId?: string;
  updatedAt?: string;
  createdAt?: string;
};

function packetRow(packet: RcapDocumentPacket) {
  return {
    id: packet.id,
    partner_slug: packet.partnerSlug,
    intake_session_id: packet.intakeSessionId ?? null,
    user_id: packet.userId ?? null,
    briefcase_id: packet.briefcaseId ?? null,
    state: packet.state,
    county: packet.county ?? null,
    court_type: packet.courtType ?? null,
    court_county: packet.courtCounty ?? null,
    court_name: packet.courtName ?? null,
    jurisdiction: packet.jurisdiction ?? null,
    document_type: packet.documentType ?? null,
    pathway: packet.pathway,
    status: packet.status,
    relief_outcome: packet.reliefOutcome,
    petitioner_first_name: packet.petitionerFirstName ?? null,
    petitioner_last_name: packet.petitionerLastName ?? null,
    petitioner_city: packet.petitionerCity ?? null,
    petitioner_county: packet.petitionerCounty ?? null,
    cause_number: packet.causeNumber ?? null,
    charge: packet.charge ?? null,
    offense_date: packet.offenseDate ?? null,
    arrest_date: packet.arrestDate ?? null,
    arresting_agency: packet.arrestingAgency ?? null,
    agency_case_number: packet.agencyCaseNumber ?? null,
    disposition_date: packet.dispositionDate ?? null,
    conviction_date: packet.convictionDate ?? null,
    sentence_completion_date: packet.sentenceCompletionDate ?? null,
    has_zero_balance: packet.hasZeroBalance ?? null,
    has_court_documents: packet.hasCourtDocuments ?? null,
    first_offender_signal: packet.firstOffenderSignal ?? null,
    non_traffic_signal: packet.nonTrafficSignal ?? null,
    excluded_offense_screening: packet.excludedOffenseScreening ?? null,
    one_felony_expungement_signal: packet.oneFelonyExpungementSignal ?? null,
    needs_record_review: packet.needsRecordReview,
    generated_html: packet.generatedHtml,
    generated_plain_text: packet.generatedPlainText,
    filing_instructions: packet.filingInstructions,
    county_court_instructions: packet.countyCourtInstructions,
    missing_fields: packet.missingFields,
    safety_disclaimer: packet.safetyDisclaimer,
    created_at: packet.createdAt ?? new Date().toISOString(),
    updated_at: packet.updatedAt ?? new Date().toISOString(),
    completed_at: packet.completedAt ?? null
  };
}

function packetInputRow(packet: RcapDocumentPacket, inputPayload: Partial<SourceDocumentPacketInput>) {
  return {
    document_packet_id: packet.id,
    partner_slug: packet.partnerSlug,
    intake_session_id: packet.intakeSessionId ?? null,
    input_payload: inputPayload
  };
}

function briefcaseItemRow(packet: RcapDocumentPacket) {
  return {
    id: packet.briefcaseId,
    user_id: packet.userId ?? null,
    partner_slug: packet.partnerSlug,
    intake_session_id: packet.intakeSessionId ?? null,
    document_packet_id: packet.id,
    item_type: "document_packet",
    title: `${jurisdictionLabel(packet.state)} record relief packet`,
    status: packet.status,
    state: packet.state,
    county: packet.county ?? null,
    document_type: packet.documentType ?? null,
    last_opened_at: null,
    updated_at: packet.updatedAt ?? new Date().toISOString()
  };
}

function packetAuditEventRow(packet: RcapDocumentPacket, event: PacketAuditEvent) {
  return {
    record_type: "document_packet",
    record_id: packet.id,
    partner_slug: packet.partnerSlug,
    partner_id: null,
    event_type: event.eventType,
    from_status: event.fromStatus ?? null,
    to_status: event.toStatus,
    actor: "system",
    metadata: {
      state: packet.state,
      county: packet.county ?? null,
      document_type: packet.documentType ?? null,
      pathway: packet.pathway,
      has_briefcase_item: Boolean(packet.briefcaseId),
      source: "rcap_document_packet_repository"
    }
  };
}

function packetFromRow(row: SourceDocumentPacketRow): RcapDocumentPacket {
  const filingInstructions = row.filing_instructions ?? [];
  const countyCourtInstructions = row.county_court_instructions ?? [];
  const safetyDisclaimer = row.safety_disclaimer ?? "This source-driven packet shell is not legal advice and requires review before filing.";
  const filingNextStepsPacket = buildFilingNextStepsPacket({
    state: row.state,
    county: row.county ?? undefined,
    documentType: row.document_type ?? "source_driven_packet",
    pathway: row.pathway,
    filingInstructions,
    countyCourtInstructions,
    safetyDisclaimer
  });
  return {
    id: row.id,
    partnerSlug: row.partner_slug,
    intakeSessionId: row.intake_session_id ?? undefined,
    userId: row.user_id ?? undefined,
    briefcaseId: row.briefcase_id ?? undefined,
    state: row.state,
    county: row.county ?? undefined,
    documentType: row.document_type ?? undefined,
    pathway: row.pathway,
    status: row.status as RcapDocumentPacket["status"],
    reliefOutcome: isRcapReliefOutcome(row.relief_outcome) ? row.relief_outcome : "not_recorded",
    petitionerFirstName: row.petitioner_first_name ?? undefined,
    petitionerLastName: row.petitioner_last_name ?? undefined,
    petitionerCity: row.petitioner_city ?? undefined,
    petitionerCounty: row.petitioner_county ?? undefined,
    courtType: row.court_type ?? undefined,
    courtCounty: row.court_county ?? undefined,
    courtName: row.court_name ?? undefined,
    jurisdiction: row.jurisdiction ?? undefined,
    causeNumber: row.cause_number ?? undefined,
    charge: row.charge ?? undefined,
    offenseDate: row.offense_date ?? undefined,
    arrestDate: row.arrest_date ?? undefined,
    arrestingAgency: row.arresting_agency ?? undefined,
    agencyCaseNumber: row.agency_case_number ?? undefined,
    dispositionDate: row.disposition_date ?? undefined,
    convictionDate: row.conviction_date ?? undefined,
    sentenceCompletionDate: row.sentence_completion_date ?? undefined,
    hasZeroBalance: row.has_zero_balance ?? undefined,
    hasCourtDocuments: row.has_court_documents ?? undefined,
    firstOffenderSignal: row.first_offender_signal ?? undefined,
    nonTrafficSignal: row.non_traffic_signal ?? undefined,
    excludedOffenseScreening: row.excluded_offense_screening ?? undefined,
    oneFelonyExpungementSignal: row.one_felony_expungement_signal ?? undefined,
    needsRecordReview: row.needs_record_review ?? true,
    generatedHtml: row.generated_html ?? "<p>Source-driven packet plan pending review.</p>",
    generatedPlainText: row.generated_plain_text ?? "Source-driven packet plan pending review.",
    filingInstructions,
    countyCourtInstructions,
    filingNextStepsPacket,
    missingFields: row.missing_fields ?? [],
    safetyDisclaimer,
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    completedAt: row.completed_at ?? undefined
  };
}

function packetFromInput(input: SourceDocumentPacketInput): RcapDocumentPacket {
  const state = String(input.state ?? "US").toUpperCase();
  const now = new Date().toISOString();
  const filingNextStepsPacket = buildFilingNextStepsPacket({
    state,
    county: typeof input.county === "string" ? input.county : undefined,
    documentType: "source_driven_packet",
    pathway: "source_engine_packet_plan",
    countyCourtInstructions: ["Confirm court contact and location from the source-driven packet plan."],
    filingInstructions: ["Use the source-driven RCAP engine packet plan for this jurisdiction/pathway."],
    safetyDisclaimer: "This source-driven packet shell is not legal advice and requires review before filing."
  });
  return {
    id: crypto.randomUUID(),
    partnerSlug: input.partnerSlug,
    intakeSessionId: stringValue(input.intakeSessionId),
    userId: stringValue(input.userId),
    briefcaseId: stringValue(input.briefcaseId),
    state,
    county: stringValue(input.county),
    documentType: "source_driven_packet",
    pathway: "source_engine_packet_plan",
    status: "ready_for_review",
    reliefOutcome: "not_recorded",
    petitionerFirstName: stringValue(input.petitionerFirstName),
    petitionerLastName: stringValue(input.petitionerLastName),
    courtType: stringValue(input.courtType),
    courtCounty: stringValue(input.courtCounty),
    courtName: stringValue(input.courtName),
    jurisdiction: stringValue(input.jurisdiction),
    causeNumber: stringValue(input.causeNumber ?? input.caseNumber ?? input.docketNumber),
    charge: stringValue(input.charge),
    offenseDate: stringValue(input.offenseDate),
    arrestDate: stringValue(input.arrestDate),
    arrestingAgency: stringValue(input.arrestingAgency),
    agencyCaseNumber: stringValue(input.agencyCaseNumber),
    dispositionDate: stringValue(input.dispositionDate),
    convictionDate: stringValue(input.convictionDate),
    sentenceCompletionDate: stringValue(input.sentenceCompletionDate),
    hasZeroBalance: booleanValue(input.hasZeroBalance),
    hasCourtDocuments: booleanValue(input.hasCourtDocuments),
    firstOffenderSignal: booleanValue(input.firstOffenderSignal),
    nonTrafficSignal: booleanValue(input.nonTrafficSignal),
    excludedOffenseScreening: booleanValue(input.excludedOffenseScreening),
    oneFelonyExpungementSignal: booleanValue(input.oneFelonyExpungementSignal),
    needsRecordReview: true,
    generatedHtml: "<p>Source-driven packet plan pending review.</p>",
    generatedPlainText: "Source-driven packet plan pending review.",
    filingInstructions: filingNextStepsPacket.afterFiling,
    countyCourtInstructions: filingNextStepsPacket.courtContactOrLocationGuidance,
    filingNextStepsPacket,
    missingFields: [],
    safetyDisclaimer: filingNextStepsPacket.safetyDisclaimer,
    createdAt: now,
    updatedAt: now
  };
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function booleanValue(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function jurisdictionLabel(state: string) {
  if (state === "TX") return "Harris County, Texas";
  if (state === "PA") return "Pennsylvania";
  if (state === "DC") return "District of Columbia";
  if (state === "IL") return "Illinois";
  if (state === "MS") return "Mississippi";
  return state;
}

function adminRowFromPacket(packet: RcapDocumentPacket): RcapReliefOutcomeAdminRow {
  return {
    id: packet.id,
    partnerSlug: packet.partnerSlug,
    state: packet.state,
    county: packet.county,
    status: packet.status,
    reliefOutcome: packet.reliefOutcome,
    updatedAt: packet.updatedAt,
    createdAt: packet.createdAt
  };
}

function adminRowFromReliefOutcomeRow(row: ReliefOutcomePacketRow): RcapReliefOutcomeAdminRow {
  return {
    id: row.id,
    partnerSlug: row.partner_slug,
    state: row.state,
    county: row.county ?? undefined,
    status: row.status as RcapDocumentPacket["status"],
    reliefOutcome: isRcapReliefOutcome(row.relief_outcome) ? row.relief_outcome : "not_recorded",
    updatedAt: row.updated_at ?? undefined,
    createdAt: row.created_at ?? undefined
  };
}

function activityPacketFromRow(row: DocumentActivityPacketRow): DocumentActivityPacket {
  return {
    state: row.state,
    pathway: row.pathway ?? "unknown",
    status: row.status as RcapDocumentPacket["status"],
    reliefOutcome: isRcapReliefOutcome(row.relief_outcome) ? row.relief_outcome : "not_recorded",
    briefcaseId: row.briefcase_id ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    createdAt: row.created_at ?? undefined
  };
}

function isRcapReliefOutcome(value: unknown): value is RcapReliefOutcome {
  return typeof value === "string" && rcapReliefOutcomeValues.includes(value as RcapReliefOutcome);
}

function isDeliveredReliefOutcome(value: RcapReliefOutcome) {
  return value === "relief_granted" || value === "relief_partially_granted";
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}
