import { getPartnerRepositoryMode } from "@/lib/partners/partner-repository";
import { getRcapIntakeSession } from "@/lib/rcap-intake/repository";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { generateMississippiPetitionDraft } from "./generator";
import type { RcapDocumentPacket, MississippiDocumentPacketInput } from "./types";

type PacketRow = {
  id: string;
  partner_slug: string;
  intake_session_id: string | null;
  user_id: string | null;
  briefcase_id: string | null;
  state: string | null;
  county: string | null;
  court_name: string | null;
  jurisdiction: string | null;
  document_type: string | null;
  pathway: string | null;
  status: string | null;
  petitioner_first_name: string | null;
  petitioner_last_name: string | null;
  petitioner_city: string | null;
  petitioner_county: string | null;
  court_type: string | null;
  court_county: string | null;
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

export async function createMississippiDocumentPacket(input: MississippiDocumentPacketInput): Promise<{ ok: true; packet: RcapDocumentPacket; persisted: boolean } | { ok: false; error: string }> {
  if (!input.intakeSessionId) {
    return { ok: false, error: "An intake session is required before document preparation starts." };
  }
  const session = await getRcapIntakeSession(input.intakeSessionId);
  if (!session || session.partnerSlug !== input.partnerSlug) {
    return { ok: false, error: "Intake session not found for this partner." };
  }
  if ((session.state ?? input.state ?? "").toLowerCase() !== "mississippi" && (session.state ?? input.state ?? "").toUpperCase() !== "MS") {
    return { ok: false, error: "Document generation for this state is not available yet." };
  }

  const generated = generateMississippiPetitionDraft(session, input);
  const packet: RcapDocumentPacket = {
    id: crypto.randomUUID(),
    partnerSlug: input.partnerSlug,
    intakeSessionId: input.intakeSessionId,
    userId: input.userId,
    briefcaseId: input.briefcaseId,
    state: "MS",
    county: generated.fields.county,
    documentType: generated.documentType,
    pathway: generated.pathway,
    status: generated.status,
    petitionerFirstName: generated.fields.petitionerFirstName,
    petitionerLastName: generated.fields.petitionerLastName,
    petitionerCity: generated.fields.petitionerCity,
    petitionerCounty: generated.fields.petitionerCounty,
    courtType: generated.fields.courtType,
    courtCounty: generated.fields.courtCounty,
    courtName: generated.fields.courtName,
    jurisdiction: generated.fields.jurisdiction,
    causeNumber: generated.fields.causeNumber,
    charge: generated.fields.charge,
    offenseDate: generated.fields.offenseDate,
    arrestDate: generated.fields.arrestDate,
    arrestingAgency: generated.fields.arrestingAgency,
    agencyCaseNumber: generated.fields.agencyCaseNumber,
    dispositionDate: generated.fields.dispositionDate,
    convictionDate: generated.fields.convictionDate,
    sentenceCompletionDate: generated.fields.sentenceCompletionDate,
    hasZeroBalance: generated.fields.hasZeroBalance,
    hasCourtDocuments: generated.fields.hasCourtDocuments,
    firstOffenderSignal: generated.fields.firstOffenderSignal,
    nonTrafficSignal: generated.fields.nonTrafficSignal,
    excludedOffenseScreening: generated.fields.excludedOffenseScreening,
    oneFelonyExpungementSignal: generated.fields.oneFelonyExpungementSignal,
    needsRecordReview: generated.fields.needsRecordReview,
    generatedHtml: generated.draftHtml,
    generatedPlainText: generated.draftPlainText,
    filingInstructions: generated.filingInstructions,
    countyCourtInstructions: generated.countyCourtInstructions,
    missingFields: generated.missingFields,
    safetyDisclaimer: generated.safetyDisclaimer
  };

  if ((await getPartnerRepositoryMode()) !== "supabase") {
    return { ok: true, packet, persisted: false };
  }

  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const { data, error } = await supabase.from("rcap_document_packets").insert(toRow(packet)).select("*").single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Unable to create document packet." };
  }
  const savedPacket = mapPacketRow(data as PacketRow);
  await savePacketInputs(savedPacket.id, input);
  await upsertBriefcaseItem(savedPacket, generated.briefcaseItemTitle);
  return { ok: true, packet: savedPacket, persisted: true };
}

export async function saveMississippiDocumentPacketInputs(
  packetId: string,
  input: Partial<MississippiDocumentPacketInput>
): Promise<{ ok: true; packet: RcapDocumentPacket; persisted: boolean } | { ok: false; error: string }> {
  const packet = await getRcapDocumentPacket(packetId);
  if (!packet) {
    return { ok: false, error: "Document packet not found." };
  }
  const merged = mergePacketInput(packet, input);
  const session = packet.intakeSessionId ? await getRcapIntakeSession(packet.intakeSessionId) : undefined;
  if (!session) {
    return { ok: false, error: "Intake session not found for this packet." };
  }
  const generated = generateMississippiPetitionDraft(session, merged);
  const updated: RcapDocumentPacket = {
    ...packet,
    ...input,
    state: "MS",
    county: merged.county ?? packet.county,
    courtCounty: merged.courtCounty ?? packet.courtCounty,
    documentType: generated.documentType,
    pathway: generated.pathway,
    status: "saved_for_later",
    generatedHtml: generated.draftHtml,
    generatedPlainText: generated.draftPlainText,
    filingInstructions: generated.filingInstructions,
    countyCourtInstructions: generated.countyCourtInstructions,
    missingFields: generated.missingFields,
    safetyDisclaimer: generated.safetyDisclaimer,
    needsRecordReview: generated.fields.needsRecordReview
  };

  if ((await getPartnerRepositoryMode()) !== "supabase") {
    return { ok: true, packet: updated, persisted: false };
  }
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }
  const { data, error } = await supabase.from("rcap_document_packets").update(toRow(updated)).eq("id", packetId).select("*").single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Unable to save document inputs." };
  }
  const savedPacket = mapPacketRow(data as PacketRow);
  await savePacketInputs(packetId, merged);
  await upsertBriefcaseItem(savedPacket, generated.briefcaseItemTitle);
  return { ok: true, packet: savedPacket, persisted: true };
}

export async function generateSavedMississippiDocumentPacket(packetId: string): Promise<{ ok: true; packet: RcapDocumentPacket; persisted: boolean } | { ok: false; error: string }> {
  const packet = await getRcapDocumentPacket(packetId);
  if (!packet?.intakeSessionId) {
    return { ok: false, error: "Document packet not found." };
  }
  const session = await getRcapIntakeSession(packet.intakeSessionId);
  if (!session) {
    return { ok: false, error: "Intake session not found for this packet." };
  }
  const generated = generateMississippiPetitionDraft(session, mergePacketInput(packet, {}));
  const nextStatus = generated.missingFields.length > 0 ? "missing_information" : "preview_generated";
  const updated: RcapDocumentPacket = {
    ...packet,
    documentType: generated.documentType,
    pathway: generated.pathway,
    status: nextStatus,
    generatedHtml: generated.draftHtml,
    generatedPlainText: generated.draftPlainText,
    filingInstructions: generated.filingInstructions,
    countyCourtInstructions: generated.countyCourtInstructions,
    missingFields: generated.missingFields,
    safetyDisclaimer: generated.safetyDisclaimer,
    needsRecordReview: generated.fields.needsRecordReview
  };

  if ((await getPartnerRepositoryMode()) !== "supabase") {
    return { ok: true, packet: updated, persisted: false };
  }
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return { ok: false, error: "Supabase is not configured." };
  }
  const { data, error } = await supabase.from("rcap_document_packets").update(toRow(updated)).eq("id", packetId).select("*").single();
  if (error || !data) {
    return { ok: false, error: error?.message ?? "Unable to generate document packet." };
  }
  const savedPacket = mapPacketRow(data as PacketRow);
  await upsertBriefcaseItem(savedPacket, generated.briefcaseItemTitle);
  return { ok: true, packet: savedPacket, persisted: true };
}

export async function getRcapDocumentPacket(packetId: string): Promise<RcapDocumentPacket | undefined> {
  if (!/^[0-9a-fA-F-]{36}$/.test(packetId) || (await getPartnerRepositoryMode()) !== "supabase") {
    return undefined;
  }
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return undefined;
  }
  const { data, error } = await supabase.from("rcap_document_packets").select("*").eq("id", packetId).maybeSingle();
  if (error || !data) {
    return undefined;
  }
  return mapPacketRow(data as PacketRow);
}

export async function getPartnerDocumentActivitySummary(partnerSlug: string) {
  const empty = { totalPackets: 0, missingInformationPackets: 0, readyForReviewPackets: 0, latestPacketDate: undefined as string | undefined, pathwayBreakdown: {} as Record<string, number>, stateBreakdown: {} as Record<string, number>, briefcaseItems: 0, state: "MS/IL" };
  if (!/^[a-zA-Z0-9_-]+$/.test(partnerSlug) || (await getPartnerRepositoryMode()) !== "supabase") {
    return empty;
  }
  const supabase = getSupabaseAdminClient();
  if (!supabase) {
    return empty;
  }
  const { data, error } = await supabase.from("rcap_document_packets").select("status,pathway,state,created_at").eq("partner_slug", partnerSlug).order("created_at", { ascending: false }).limit(250);
  if (error || !data) {
    return empty;
  }
  const rows = data as Array<{ status: string | null; pathway: string | null; state: string | null; created_at: string | null }>;
  const pathwayBreakdown: Record<string, number> = {};
  const stateBreakdown: Record<string, number> = {};
  for (const row of rows) {
    const key = row.pathway ?? "unknown";
    pathwayBreakdown[key] = (pathwayBreakdown[key] ?? 0) + 1;
    const stateKey = row.state ?? "unknown";
    stateBreakdown[stateKey] = (stateBreakdown[stateKey] ?? 0) + 1;
  }
  const { count } = await supabase.from("rcap_briefcase_items").select("id", { count: "exact", head: true }).eq("partner_slug", partnerSlug);
  return {
    totalPackets: rows.length,
    missingInformationPackets: rows.filter((row) => row.status === "missing_information").length,
    readyForReviewPackets: rows.filter((row) => row.status === "ready_for_review" || row.status === "preview_generated").length,
    latestPacketDate: rows[0]?.created_at ?? undefined,
    pathwayBreakdown,
    stateBreakdown,
    briefcaseItems: count ?? 0,
    state: "MS/IL"
  };
}

function toRow(packet: RcapDocumentPacket) {
  return {
    id: packet.id,
    partner_slug: packet.partnerSlug,
    intake_session_id: packet.intakeSessionId,
    user_id: packet.userId ?? null,
    briefcase_id: packet.briefcaseId ?? null,
    state: packet.state,
    county: packet.county ?? null,
    document_type: packet.documentType ?? null,
    pathway: packet.pathway,
    status: packet.status,
    petitioner_first_name: packet.petitionerFirstName ?? null,
    petitioner_last_name: packet.petitionerLastName ?? null,
    petitioner_city: packet.petitionerCity ?? null,
    petitioner_county: packet.petitionerCounty ?? null,
    court_type: packet.courtType ?? null,
    court_county: packet.courtCounty ?? null,
    court_name: packet.courtName ?? null,
    jurisdiction: packet.jurisdiction ?? null,
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
    safety_disclaimer: packet.safetyDisclaimer
  };
}

function mapPacketRow(row: PacketRow): RcapDocumentPacket {
  return {
    id: row.id,
    partnerSlug: row.partner_slug,
    intakeSessionId: row.intake_session_id ?? undefined,
    userId: row.user_id ?? undefined,
    briefcaseId: row.briefcase_id ?? undefined,
    state: row.state === "IL" ? "IL" : "MS",
    county: row.county ?? undefined,
    documentType: row.document_type as RcapDocumentPacket["documentType"],
    pathway: row.pathway as RcapDocumentPacket["pathway"],
    status: row.status as RcapDocumentPacket["status"],
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
    needsRecordReview: row.needs_record_review === true,
    generatedHtml: row.generated_html ?? "",
    generatedPlainText: row.generated_plain_text ?? "",
    filingInstructions: row.filing_instructions ?? [],
    countyCourtInstructions: row.county_court_instructions ?? [],
    missingFields: row.missing_fields as RcapDocumentPacket["missingFields"],
    safetyDisclaimer: row.safety_disclaimer ?? "",
    createdAt: row.created_at ?? undefined,
    updatedAt: row.updated_at ?? undefined,
    completedAt: row.completed_at ?? undefined
  };
}

function mergePacketInput(packet: RcapDocumentPacket, input: Partial<MississippiDocumentPacketInput>): MississippiDocumentPacketInput {
  return {
    partnerSlug: packet.partnerSlug,
    intakeSessionId: packet.intakeSessionId,
    userId: packet.userId,
    briefcaseId: packet.briefcaseId,
    state: "MS",
    county: input.county ?? packet.county,
    courtType: input.courtType ?? packet.courtType,
    courtCounty: input.courtCounty ?? packet.courtCounty,
    courtName: input.courtName ?? packet.courtName,
    jurisdiction: input.jurisdiction ?? packet.jurisdiction,
    causeNumber: input.causeNumber ?? packet.causeNumber,
    charge: input.charge ?? packet.charge,
    offenseDate: input.offenseDate ?? packet.offenseDate,
    arrestDate: input.arrestDate ?? packet.arrestDate,
    arrestingAgency: input.arrestingAgency ?? packet.arrestingAgency,
    agencyCaseNumber: input.agencyCaseNumber ?? packet.agencyCaseNumber,
    dispositionDate: input.dispositionDate ?? packet.dispositionDate,
    convictionDate: input.convictionDate ?? packet.convictionDate,
    sentenceCompletionDate: input.sentenceCompletionDate ?? packet.sentenceCompletionDate,
    hasZeroBalance: input.hasZeroBalance ?? packet.hasZeroBalance,
    hasCourtDocuments: input.hasCourtDocuments ?? packet.hasCourtDocuments,
    firstOffenderSignal: input.firstOffenderSignal ?? packet.firstOffenderSignal,
    nonTrafficSignal: input.nonTrafficSignal ?? packet.nonTrafficSignal,
    excludedOffenseScreening: input.excludedOffenseScreening ?? packet.excludedOffenseScreening,
    oneFelonyExpungementSignal: input.oneFelonyExpungementSignal ?? packet.oneFelonyExpungementSignal,
    petitionerFirstName: input.petitionerFirstName ?? packet.petitionerFirstName,
    petitionerLastName: input.petitionerLastName ?? packet.petitionerLastName,
    petitionerCity: input.petitionerCity ?? packet.petitionerCity,
    petitionerCounty: input.petitionerCounty ?? packet.petitionerCounty,
    convictionLevel: input.convictionLevel
  };
}

async function savePacketInputs(packetId: string, input: Partial<MississippiDocumentPacketInput>) {
  if ((await getPartnerRepositoryMode()) !== "supabase") return;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;
  await supabase.from("rcap_document_packet_inputs").upsert({
    document_packet_id: packetId,
    partner_slug: input.partnerSlug,
    intake_session_id: input.intakeSessionId ?? null,
    input_payload: input,
    updated_at: new Date().toISOString()
  }, { onConflict: "document_packet_id" });
}

async function upsertBriefcaseItem(packet: RcapDocumentPacket, title: string) {
  if ((await getPartnerRepositoryMode()) !== "supabase") return;
  const supabase = getSupabaseAdminClient();
  if (!supabase) return;
  await supabase.from("rcap_briefcase_items").upsert({
    user_id: packet.userId ?? null,
    partner_slug: packet.partnerSlug,
    intake_session_id: packet.intakeSessionId ?? null,
    document_packet_id: packet.id,
    item_type: "document_packet",
    title,
    status: packet.status,
    state: packet.state,
    county: packet.county ?? packet.courtCounty ?? null,
    document_type: packet.documentType ?? null,
    updated_at: new Date().toISOString()
  }, { onConflict: "document_packet_id" });
}
