import { getPartnerRepositoryMode } from "@/lib/partners/partner-repository";
import { getRcapIntakeSession } from "@/lib/rcap-intake/repository";
import { getSupabaseAdminClient } from "@/lib/supabase/server";
import type { RcapDocumentPacket } from "@/lib/rcap/documents/mississippi/types";
import { generateIllinoisDocumentDraft } from "./generator";
import type { IllinoisDocumentPacketInput } from "./types";

export async function createIllinoisDocumentPacket(input: IllinoisDocumentPacketInput): Promise<{ ok: true; packet: RcapDocumentPacket; persisted: boolean } | { ok: false; error: string }> {
  if (!input.intakeSessionId) return { ok: false, error: "An intake session is required before document preparation starts." };
  const session = await getRcapIntakeSession(input.intakeSessionId);
  if (!session || session.partnerSlug !== input.partnerSlug) return { ok: false, error: "Intake session not found for this partner." };
  if (!isIllinois(session.state ?? input.state)) return { ok: false, error: "Document generation for this state is not available yet." };

  const generated = generateIllinoisDocumentDraft(session, input);
  const packet: RcapDocumentPacket = {
    id: crypto.randomUUID(),
    partnerSlug: input.partnerSlug,
    intakeSessionId: input.intakeSessionId,
    userId: input.userId,
    briefcaseId: input.briefcaseId,
    state: "IL",
    county: generated.fields.county,
    documentType: "illinois_request_to_expungeseal_packet",
    pathway: generated.pathway,
    status: generated.status,
    petitionerFirstName: generated.fields.petitionerFirstName,
    petitionerLastName: generated.fields.petitionerLastName,
    courtType: "Circuit Court",
    courtCounty: generated.fields.county,
    jurisdiction: generated.fields.cookCountyDistrict,
    causeNumber: generated.fields.caseOrArrestNumber,
    charge: generated.fields.charge,
    arrestDate: generated.fields.arrestDate,
    arrestingAgency: generated.fields.arrestingAgency,
    dispositionDate: generated.fields.dispositionDate,
    sentenceCompletionDate: generated.fields.sentenceTerminationDate,
    needsRecordReview: generated.fields.needsRecordReview,
    hasCourtDocuments: generated.fields.hasRapSheet,
    excludedOffenseScreening: generated.fields.excludedOffenseSignal,
    generatedHtml: generated.draftHtml,
    generatedPlainText: generated.draftPlainText,
    filingInstructions: generated.filingInstructions,
    countyCourtInstructions: generated.countyCourtInstructions,
    missingFields: generated.missingFields,
    safetyDisclaimer: generated.safetyDisclaimer
  };

  if ((await getPartnerRepositoryMode()) !== "supabase") return { ok: true, packet, persisted: false };
  const supabase = getSupabaseAdminClient();
  if (!supabase) return { ok: false, error: "Supabase is not configured." };

  const { data, error } = await supabase.from("rcap_document_packets").insert(toRow(packet)).select("*").single();
  if (error || !data) return { ok: false, error: error?.message ?? "Unable to create Illinois document packet." };
  const savedPacket = mapRow(data as PacketRow);
  await savePacketInputs(savedPacket.id, input);
  await upsertBriefcaseItem(savedPacket, generated.briefcaseItemTitle);
  return { ok: true, packet: savedPacket, persisted: true };
}

type PacketRow = Record<string, string | boolean | string[] | null>;

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
    jurisdiction: packet.jurisdiction ?? null,
    document_type: packet.documentType ?? null,
    pathway: packet.pathway,
    status: packet.status,
    petitioner_first_name: packet.petitionerFirstName ?? null,
    petitioner_last_name: packet.petitionerLastName ?? null,
    cause_number: packet.causeNumber ?? null,
    charge: packet.charge ?? null,
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
  return {
    id: row.id as string,
    partnerSlug: row.partner_slug as string,
    intakeSessionId: (row.intake_session_id as string | null) ?? undefined,
    userId: (row.user_id as string | null) ?? undefined,
    briefcaseId: (row.briefcase_id as string | null) ?? undefined,
    state: "IL",
    county: (row.county as string | null) ?? undefined,
    documentType: row.document_type as RcapDocumentPacket["documentType"],
    pathway: row.pathway as RcapDocumentPacket["pathway"],
    status: row.status as RcapDocumentPacket["status"],
    petitionerFirstName: (row.petitioner_first_name as string | null) ?? undefined,
    petitionerLastName: (row.petitioner_last_name as string | null) ?? undefined,
    courtType: (row.court_type as string | null) ?? undefined,
    courtCounty: (row.court_county as string | null) ?? undefined,
    jurisdiction: (row.jurisdiction as string | null) ?? undefined,
    causeNumber: (row.cause_number as string | null) ?? undefined,
    charge: (row.charge as string | null) ?? undefined,
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
}

async function savePacketInputs(packetId: string, input: Partial<IllinoisDocumentPacketInput>) {
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
    county: packet.county ?? packet.courtCounty ?? null,
    document_type: packet.documentType ?? null,
    updated_at: new Date().toISOString()
  }, { onConflict: "document_packet_id" });
}

function isIllinois(state?: string) {
  return state?.toLowerCase() === "illinois" || state?.toUpperCase() === "IL";
}
