import type { RcapIntakeSession } from "@/lib/rcap-intake/types";
import { mississippiDocumentTypes } from "@/lib/rcap/state-packs/mississippi/document-types";
import { mississippiRequiredFields, type MississippiDocumentFieldKey } from "@/lib/rcap/state-packs/mississippi/required-fields";
import type { MississippiPathway } from "@/lib/rcap/state-packs/mississippi/pathways";
import type { MississippiDocumentPacketInput, MississippiMappedDocumentFields } from "./types";

export function mapMississippiIntakeToDocumentFields(
  session: RcapIntakeSession,
  packet: Partial<MississippiDocumentPacketInput> = {}
): MississippiMappedDocumentFields {
  const pathway = selectMississippiPathway({
    ...packet,
    convictionLevel: packet.convictionLevel,
    caseOutcome: packet.caseOutcome ?? session.caseOutcome,
    recordType: packet.recordType ?? session.recordType
  });
  const documentType = pathway === "more_information_needed" ? undefined : mississippiDocumentTypes[pathway].type;
  const mapped: MississippiDocumentPacketInput = {
    partnerSlug: session.partnerSlug,
    intakeSessionId: session.id,
    state: "MS",
    county: packet.county ?? session.county,
    courtCounty: packet.courtCounty ?? packet.county ?? session.county,
    charge: packet.charge ?? session.chargeOrCaseType,
    hasCourtDocuments: packet.hasCourtDocuments ?? session.hasDocuments,
    petitionerFirstName: packet.petitionerFirstName ?? session.userFirstName,
    petitionerLastName: packet.petitionerLastName ?? session.userLastName,
    caseOutcome: packet.caseOutcome ?? session.caseOutcome,
    recordType: packet.recordType ?? session.recordType,
    ...packet
  };
  const missingFields = findMissingFields(pathway, mapped);

  return {
    ...mapped,
    pathway,
    documentType,
    eligibilitySignal: pathway === "more_information_needed" || missingFields.length > 0 ? "needs_more_information" : "possible_pathway",
    missingFields,
    needsRecordReview: pathway === "more_information_needed" || pathway === "felony_conviction" || session.needsRecordCheck === true || missingFields.length > 0
  };
}

export function selectMississippiPathway(input: Pick<MississippiDocumentPacketInput, "caseOutcome" | "recordType" | "convictionLevel">): MississippiPathway {
  if (input.caseOutcome === "dismissed" || input.caseOutcome === "not_prosecuted" || input.recordType === "charged_not_convicted" || input.recordType === "old_arrest") {
    return "non_conviction";
  }

  if (input.convictionLevel === "felony") {
    return "felony_conviction";
  }

  if (input.caseOutcome === "convicted" || input.caseOutcome === "completed_sentence" || input.recordType === "past_conviction") {
    return "misdemeanor_conviction";
  }

  return "more_information_needed";
}

export function findMissingFields(pathway: MississippiPathway, input: MississippiDocumentPacketInput): MississippiDocumentFieldKey[] {
  const missing: MississippiDocumentFieldKey[] = [];
  for (const field of mississippiRequiredFields[pathway]) {
    if (!hasFieldValue(field, input)) {
      missing.push(field);
    }
  }
  return missing;
}

function hasFieldValue(field: MississippiDocumentFieldKey, input: MississippiDocumentPacketInput): boolean {
  if (field === "petitionerName") {
    return Boolean(input.petitionerFirstName?.trim() && input.petitionerLastName?.trim());
  }
  if (field === "county") {
    return Boolean(input.courtCounty?.trim() || input.county?.trim());
  }
  if (field === "dispositionType") {
    return Boolean(input.dispositionType?.trim() || input.caseOutcome === "dismissed" || input.caseOutcome === "not_prosecuted");
  }
  if (field === "hasZeroBalance") {
    return input.hasZeroBalance === true;
  }
  if (field === "firstOffenderSignal") {
    return typeof input.firstOffenderSignal === "boolean";
  }
  if (field === "nonTrafficSignal") {
    return typeof input.nonTrafficSignal === "boolean";
  }
  if (field === "excludedOffenseScreening") {
    return typeof input.excludedOffenseScreening === "boolean";
  }
  if (field === "oneFelonyExpungementSignal") {
    return typeof input.oneFelonyExpungementSignal === "boolean";
  }
  if (field === "districtAttorneyNotice") {
    return input.recordType === "past_conviction";
  }
  return Boolean(String(input[field as keyof MississippiDocumentPacketInput] ?? "").trim());
}
