import { getPartnerRepositoryMode } from "@/lib/partners/partner-repository";
import { getRcapIntakeSession } from "@/lib/rcap-intake/repository";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import { buildFilingNextStepsPacket } from "@/lib/rcap/documents/filing-next-steps";
import type { RcapDocumentPacket } from "@/lib/rcap/documents/mississippi/types";
import { getRcapDocumentPacket } from "@/lib/rcap/documents/mississippi/repository";
import { generateDcDocumentDraft } from "./generator";
import type { DcDocumentPacketInput } from "./types";

type PacketRow = Record<string, string | boolean | string[] | null>;

export async function createDcDocumentPacket(input: DcDocumentPacketInput): Promise<{ ok: true; packet: RcapDocumentPacket; persisted: boolean } | { ok: false; error: string }> {
  if (!input.intakeSessionId) return { ok: false, error: "An intake session is required before document preparation starts." };
  const session = await getRcapIntakeSession(input.intakeSessionId);
  if (!session || session.partnerSlug !== input.partnerSlug) return { ok: false, error: "Intake session not found for this partner." };
  if (!isDc(session.state ?? input.state)) return { ok: false, error: "Document generation for this state is not available yet." };

  const generated = generateDcDocumentDraft(session, input);
  const packet = toPacket(input, generated);

  if ((await getPartnerRepositoryMode()) !== "supabase") return { ok: true, packet, persisted: false };
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const { data, error } = await supabase.from("rcap_document_packets").insert(toRow(packet)).select("*").single();
  if (error || !data) return { ok: false, error: error?.message ?? "Unable to create DC document packet." };
  const savedPacket = mapRow(data as PacketRow);
  await savePacketInputs(savedPacket.id, input);
  await upsertBriefcaseItem(savedPacket, generated.briefcaseItemTitle);
  return { ok: true, packet: savedPacket, persisted: true };
}

export async function saveDcDocumentPacketInputs(packetId: string, input: Partial<DcDocumentPacketInput>): Promise<{ ok: true; packet: RcapDocumentPacket; persisted: boolean } | { ok: false; error: string }> {
  const packet = await getRcapDocumentPacket(packetId);
  if (!packet || packet.state !== "DC") return { ok: false, error: "DC document packet not found." };
  const session = packet.intakeSessionId ? await getRcapIntakeSession(packet.intakeSessionId) : undefined;
  if (!session) return { ok: false, error: "Intake session not found for this packet." };
  const merged = mergePacketInput(packet, input);
  const generated = generateDcDocumentDraft(session, merged);
  const updated = { ...toPacket(merged, generated, packet.id), status: "saved_for_later" as const };
  return persistUpdate(packetId, updated, merged, generated.briefcaseItemTitle, "Unable to save DC document inputs.");
}

export async function generateSavedDcDocumentPacket(packetId: string): Promise<{ ok: true; packet: RcapDocumentPacket; persisted: boolean } | { ok: false; error: string }> {
  const packet = await getRcapDocumentPacket(packetId);
  if (!packet || packet.state !== "DC" || !packet.intakeSessionId) return { ok: false, error: "DC document packet not found." };
  const session = await getRcapIntakeSession(packet.intakeSessionId);
  if (!session) return { ok: false, error: "Intake session not found for this packet." };
  const merged = mergePacketInput(packet, {});
  const generated = generateDcDocumentDraft(session, merged);
  const nextStatus = generated.missingFields.length > 0 ? "missing_information" : "preview_generated";
  const updated = { ...toPacket(merged, generated, packet.id), status: nextStatus as RcapDocumentPacket["status"] };
  return persistUpdate(packetId, updated, merged, generated.briefcaseItemTitle, "Unable to generate DC document packet.");
}

async function persistUpdate(
  packetId: string,
  packet: RcapDocumentPacket,
  input: DcDocumentPacketInput,
  title: string,
  errorMessage: string
) {
  if ((await getPartnerRepositoryMode()) !== "supabase") return { ok: true as const, packet, persisted: false };
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false as const, error: "Supabase is not configured." };
  const { data, error } = await supabase.from("rcap_document_packets").update(toRow(packet)).eq("id", packetId).select("*").single();
  if (error || !data) return { ok: false as const, error: error?.message ?? errorMessage };
  const savedPacket = mapRow(data as PacketRow);
  await savePacketInputs(packetId, input);
  await upsertBriefcaseItem(savedPacket, title);
  return { ok: true as const, packet: savedPacket, persisted: true };
}

function toPacket(input: DcDocumentPacketInput, generated: ReturnType<typeof generateDcDocumentDraft>, id = crypto.randomUUID()): RcapDocumentPacket {
  return {
    id,
    partnerSlug: input.partnerSlug,
    intakeSessionId: input.intakeSessionId,
    userId: input.userId,
    briefcaseId: input.briefcaseId,
    state: "DC",
    county: "District of Columbia",
    documentType: generated.documentTypes[0],
    pathway: generated.pathway,
    status: generated.status,
    petitionerFirstName: generated.fields.petitionerFirstName,
    petitionerLastName: generated.fields.petitionerLastName,
    courtType: "Superior Court",
    courtCounty: "District of Columbia",
    courtName: "Superior Court of the District of Columbia",
    jurisdiction: generated.fields.prosecutorOffice,
    causeNumber: generated.fields.caseNumber,
    charge: generated.fields.charge,
    offenseDate: generated.fields.offenseDate,
    arrestDate: generated.fields.arrestDate,
    arrestingAgency: generated.fields.arrestingAgency,
    dispositionDate: generated.fields.dispositionDate,
    sentenceCompletionDate: generated.fields.sentenceCompletionDate,
    hasCourtDocuments: generated.fields.hasCourtDisposition,
    excludedOffenseScreening: generated.fields.masterGridGroupOneToThree || generated.fields.automaticExcludedOffenseConcern,
    needsRecordReview: generated.fields.needsRecordReview,
    generatedHtml: generated.draftHtml,
    generatedPlainText: generated.draftPlainText,
    filingInstructions: generated.filingInstructions,
    countyCourtInstructions: generated.countyCourtInstructions,
    filingNextStepsPacket: generated.filingNextStepsPacket,
    missingFields: generated.missingFields,
    safetyDisclaimer: generated.safetyDisclaimer
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
    court_type: packet.courtType ?? null,
    court_county: packet.courtCounty ?? null,
    court_name: packet.courtName ?? null,
    jurisdiction: packet.jurisdiction ?? null,
    document_type: packet.documentType ?? null,
    pathway: packet.pathway,
    status: packet.status,
    petitioner_first_name: packet.petitionerFirstName ?? null,
    petitioner_last_name: packet.petitionerLastName ?? null,
    cause_number: packet.causeNumber ?? null,
    charge: packet.charge ?? null,
    offense_date: packet.offenseDate ?? null,
    arrest_date: packet.arrestDate ?? null,
    arresting_agency: packet.arrestingAgency ?? null,
    disposition_date: packet.dispositionDate ?? null,
    sentence_completion_date: packet.sentenceCompletionDate ?? null,
    has_court_documents: packet.hasCourtDocuments ?? null,
    excluded_offense_screening: packet.excludedOffenseScreening ?? null,
    needs_record_review: packet.needsRecordReview,
    generated_html: packet.generatedHtml,
    generated_plain_text: packet.generatedPlainText,
    filing_instructions: packet.filingInstructions,
    county_court_instructions: packet.countyCourtInstructions,
    missing_fields: packet.missingFields,
    safety_disclaimer: packet.safetyDisclaimer
  };
}

function mapRow(row: PacketRow): RcapDocumentPacket {
  const packet: Omit<RcapDocumentPacket, "filingNextStepsPacket"> = {
    id: row.id as string,
    partnerSlug: row.partner_slug as string,
    intakeSessionId: (row.intake_session_id as string | null) ?? undefined,
    userId: (row.user_id as string | null) ?? undefined,
    briefcaseId: (row.briefcase_id as string | null) ?? undefined,
    state: "DC",
    county: (row.county as string | null) ?? undefined,
    documentType: row.document_type as RcapDocumentPacket["documentType"],
    pathway: row.pathway as RcapDocumentPacket["pathway"],
    status: row.status as RcapDocumentPacket["status"],
    petitionerFirstName: (row.petitioner_first_name as string | null) ?? undefined,
    petitionerLastName: (row.petitioner_last_name as string | null) ?? undefined,
    courtType: (row.court_type as string | null) ?? undefined,
    courtCounty: (row.court_county as string | null) ?? undefined,
    courtName: (row.court_name as string | null) ?? undefined,
    jurisdiction: (row.jurisdiction as string | null) ?? undefined,
    causeNumber: (row.cause_number as string | null) ?? undefined,
    charge: (row.charge as string | null) ?? undefined,
    offenseDate: (row.offense_date as string | null) ?? undefined,
    arrestDate: (row.arrest_date as string | null) ?? undefined,
    arrestingAgency: (row.arresting_agency as string | null) ?? undefined,
    dispositionDate: (row.disposition_date as string | null) ?? undefined,
    sentenceCompletionDate: (row.sentence_completion_date as string | null) ?? undefined,
    hasCourtDocuments: (row.has_court_documents as boolean | null) ?? undefined,
    excludedOffenseScreening: (row.excluded_offense_screening as boolean | null) ?? undefined,
    needsRecordReview: row.needs_record_review === true,
    generatedHtml: (row.generated_html as string | null) ?? "",
    generatedPlainText: (row.generated_plain_text as string | null) ?? "",
    filingInstructions: (row.filing_instructions as string[] | null) ?? [],
    countyCourtInstructions: (row.county_court_instructions as string[] | null) ?? [],
    missingFields: row.missing_fields as RcapDocumentPacket["missingFields"],
    safetyDisclaimer: (row.safety_disclaimer as string | null) ?? ""
  };
  return { ...packet, filingNextStepsPacket: buildFilingNextStepsPacket(packet) };
}

function mergePacketInput(packet: RcapDocumentPacket, input: Partial<DcDocumentPacketInput>): DcDocumentPacketInput {
  return {
    partnerSlug: packet.partnerSlug,
    intakeSessionId: packet.intakeSessionId,
    userId: packet.userId,
    briefcaseId: packet.briefcaseId,
    state: "DC",
    county: "District of Columbia",
    petitionerFirstName: input.petitionerFirstName ?? packet.petitionerFirstName,
    petitionerLastName: input.petitionerLastName ?? packet.petitionerLastName,
    caseNumber: input.caseNumber ?? packet.causeNumber,
    charge: input.charge ?? packet.charge,
    arrestingAgency: input.arrestingAgency ?? packet.arrestingAgency,
    offenseDate: input.offenseDate ?? packet.offenseDate,
    arrestDate: input.arrestDate ?? packet.arrestDate,
    dispositionDate: input.dispositionDate ?? packet.dispositionDate,
    sentenceCompletionDate: input.sentenceCompletionDate ?? packet.sentenceCompletionDate,
    hasCourtDisposition: input.hasCourtDisposition ?? packet.hasCourtDocuments,
    ...input
  };
}

async function savePacketInputs(packetId: string, input: Partial<DcDocumentPacketInput>) {
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
    county: packet.county ?? null,
    document_type: packet.documentType ?? null,
    updated_at: new Date().toISOString()
  }, { onConflict: "document_packet_id" });
}

function isDc(state?: string) {
  const normalized = state?.trim().toLowerCase();
  return normalized === "dc" || normalized === "d.c." || normalized === "district of columbia" || normalized === "washington, dc";
}
