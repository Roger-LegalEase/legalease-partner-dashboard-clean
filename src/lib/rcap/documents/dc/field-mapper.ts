import type { RcapIntakeSession } from "@/lib/rcap-intake/types";
import { dcDocumentTypes, type DcDocumentType } from "@/lib/rcap/state-packs/dc/document-types";
import type { DcEligibilitySignal, DcPathway, DcRemedyType } from "@/lib/rcap/state-packs/dc/pathways";
import { dcRequiredFields, type DcDocumentFieldKey } from "@/lib/rcap/state-packs/dc/required-fields";
import type { DcDocumentPacketInput, DcMappedDocumentFields } from "./types";

export function mapDcIntakeToDocumentFields(
  session: RcapIntakeSession,
  packet: Partial<DcDocumentPacketInput> = {}
): DcMappedDocumentFields {
  const merged: DcDocumentPacketInput = {
    partnerSlug: session.partnerSlug,
    intakeSessionId: session.id,
    state: "DC",
    county: packet.county ?? session.county ?? "District of Columbia",
    charge: packet.charge ?? session.chargeOrCaseType,
    disposition: packet.disposition ?? session.caseOutcome,
    petitionerFirstName: packet.petitionerFirstName ?? session.userFirstName,
    petitionerLastName: packet.petitionerLastName ?? session.userLastName,
    hasMpdRecord: packet.hasMpdRecord ?? session.hasDocuments,
    hasCourtDisposition: packet.hasCourtDisposition ?? session.hasDocuments,
    caseOutcome: packet.caseOutcome ?? session.caseOutcome,
    recordType: packet.recordType ?? session.recordType,
    ...packet
  };
  const pathway = selectDcPathway(merged);
  const remedyType = selectRemedyType(pathway);
  const documentTypes = selectDocumentTypes(pathway);
  const missingFields = findMissingFields(pathway, merged);
  const eligibilitySignal = selectEligibilitySignal(pathway, merged);

  return {
    ...merged,
    pathway,
    remedyType,
    documentTypes,
    eligibilitySignal,
    missingFields,
    needsRecordReview:
      pathway === "needs_review" ||
      missingFields.length > 0 ||
      merged.openOrPendingCharges === true ||
      merged.masterGridGroupOneToThree === true ||
      merged.automaticExcludedOffenseConcern === true
  };
}

export function selectDcPathway(input: DcDocumentPacketInput): DcPathway {
  if (input.openOrPendingCharges || input.masterGridGroupOneToThree || input.automaticExcludedOffenseConcern) return "needs_review";
  if (input.reliefTrack === "actual_innocence_expungement") return "motion_actual_innocence_expungement";
  if (input.reliefTrack === "interests_of_justice_sealing") return "motion_interests_of_justice_sealing";
  if (input.reliefTrack === "automatic_expungement" || input.decriminalizedLegalizedOrUnconstitutionalOffense || input.marijuanaRelatedSignal) return "automatic_expungement";
  if (input.reliefTrack === "automatic_sealing") return "automatic_sealing";
  if (input.caseOutcome === "convicted" || input.caseOutcome === "completed_sentence" || input.recordType === "past_conviction") return "motion_interests_of_justice_sealing";
  if (input.caseOutcome === "dismissed" || input.caseOutcome === "not_prosecuted" || input.caseOutcome === "no_charges_filed" || input.caseOutcome === "not_guilty" || input.recordType === "charged_not_convicted") return "automatic_sealing";
  return "needs_review";
}

function selectRemedyType(pathway: DcPathway): DcRemedyType {
  if (pathway === "motion_actual_innocence_expungement") return "expungement";
  if (pathway === "motion_interests_of_justice_sealing") return "sealing";
  if (pathway === "automatic_expungement" || pathway === "automatic_sealing") return "automatic_review";
  return "needs_review";
}

function selectDocumentTypes(pathway: DcPathway): DcDocumentType[] {
  if (pathway === "motion_actual_innocence_expungement") {
    return ["dc_motion_to_expunge", "dc_statement_of_points_and_authorities", "dc_proposed_order", "dc_certificate_of_service", "dc_filing_instructions"];
  }
  if (pathway === "motion_interests_of_justice_sealing") {
    return ["dc_motion_to_seal", "dc_statement_of_points_and_authorities", "dc_proposed_order", "dc_certificate_of_service", "dc_filing_instructions"];
  }
  return ["dc_filing_instructions", ...dcDocumentTypes.filter((type) => type !== "dc_filing_instructions")];
}

function findMissingFields(pathway: DcPathway, input: DcDocumentPacketInput): DcDocumentFieldKey[] {
  const missing: DcDocumentFieldKey[] = [];
  for (const field of dcRequiredFields[pathway]) {
    if (!hasFieldValue(field, input)) missing.push(field);
  }
  return missing;
}

function hasFieldValue(field: DcDocumentFieldKey, input: DcDocumentPacketInput) {
  if (field === "petitionerName") return Boolean(input.petitionerFirstName?.trim() && input.petitionerLastName?.trim());
  if (field === "hasMpdRecord") return input.hasMpdRecord === true;
  if (field === "hasCourtDisposition") return input.hasCourtDisposition === true;
  if (field === "prosecutorOffice") return input.prosecutorOffice === "USAO" || input.prosecutorOffice === "OAG";
  if (field === "serviceMethod") return input.serviceMethod === "email" || input.serviceMethod === "mail" || input.serviceMethod === "hand_delivery";
  return Boolean(String(input[field as keyof DcDocumentPacketInput] ?? "").trim());
}

function selectEligibilitySignal(pathway: DcPathway, input: DcDocumentPacketInput): DcEligibilitySignal {
  if (pathway === "needs_review" || input.openOrPendingCharges || input.masterGridGroupOneToThree || input.automaticExcludedOffenseConcern) return "excluded_or_blocked_review_needed";
  if (pathway === "automatic_expungement" || pathway === "automatic_sealing") return "future_eligibility_update";
  if (pathway === "motion_actual_innocence_expungement") return "possible_expungement_path";
  if (pathway === "motion_interests_of_justice_sealing") return "possible_sealing_path";
  return "needs_more_information";
}
