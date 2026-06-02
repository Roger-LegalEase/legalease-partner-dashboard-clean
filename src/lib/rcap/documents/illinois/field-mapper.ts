import type { RcapIntakeSession } from "@/lib/rcap-intake/types";
import { illinoisRequiredFields, type IllinoisDocumentFieldKey } from "@/lib/rcap/state-packs/illinois/required-fields";
import type { IllinoisDocumentType } from "@/lib/rcap/state-packs/illinois/document-types";
import type { IllinoisEligibilitySignal, IllinoisPathway, IllinoisRemedyType } from "@/lib/rcap/state-packs/illinois/pathways";
import type { IllinoisDocumentPacketInput, IllinoisMappedDocumentFields } from "./types";

export function mapIllinoisIntakeToDocumentFields(
  session: RcapIntakeSession,
  packet: Partial<IllinoisDocumentPacketInput> = {}
): IllinoisMappedDocumentFields {
  const merged: IllinoisDocumentPacketInput = {
    partnerSlug: session.partnerSlug,
    intakeSessionId: session.id,
    state: "IL",
    county: packet.county ?? session.county,
    courtType: packet.courtType ?? "Circuit Court",
    charge: packet.charge ?? session.chargeOrCaseType,
    disposition: packet.disposition ?? session.caseOutcome,
    petitionerFirstName: packet.petitionerFirstName ?? session.userFirstName,
    petitionerLastName: packet.petitionerLastName ?? session.userLastName,
    hasRapSheet: packet.hasRapSheet ?? session.hasDocuments,
    needsRapSheet: packet.needsRapSheet ?? session.needsRecordCheck,
    caseOutcome: packet.caseOutcome ?? session.caseOutcome,
    recordType: packet.recordType ?? session.recordType,
    ...packet
  };
  const pathway = selectIllinoisPathway(merged);
  const remedyType = selectRemedyType(pathway, merged);
  const documentTypes = selectIllinoisDocumentTypes(pathway, remedyType, merged);
  const missingFields = findMissingFields(pathway, merged, remedyType);
  const eligibilitySignal = selectEligibilitySignal(pathway, remedyType, merged);

  return {
    ...merged,
    pathway,
    remedyType,
    documentTypes,
    eligibilitySignal,
    missingFields,
    needsRecordReview: pathway === "excluded_or_needs_review" || pathway === "needs_rap_sheet" || missingFields.length > 0
  };
}

export function selectIllinoisPathway(input: IllinoisDocumentPacketInput): IllinoisPathway {
  if (input.excludedOffenseSignal) return "excluded_or_needs_review";
  if (input.hasRapSheet === false || input.needsRapSheet === true) return "needs_rap_sheet";
  if (input.caseOutcome === "court_supervision" || input.caseOutcome === "qualified_probation") return "expungement_supervision_or_qualified_probation";
  if (input.caseOutcome === "convicted" || input.caseOutcome === "completed_sentence" || input.recordType === "past_conviction" || input.remedyType === "sealing") return "sealing_conviction";
  if (input.caseOutcome === "dismissed" || input.caseOutcome === "not_prosecuted" || input.caseOutcome === "no_charges_filed" || input.caseOutcome === "not_guilty" || input.recordType === "charged_not_convicted" || input.recordType === "old_arrest") return "expungement_non_conviction";
  return "more_information_needed";
}

function selectRemedyType(pathway: IllinoisPathway, input: IllinoisDocumentPacketInput): IllinoisRemedyType {
  if (pathway === "sealing_conviction") return "sealing";
  if (pathway === "excluded_or_needs_review" || pathway === "more_information_needed" || pathway === "needs_rap_sheet") return input.remedyType ?? "needs_review";
  return "expungement";
}

function selectIllinoisDocumentTypes(pathway: IllinoisPathway, remedyType: IllinoisRemedyType, input: IllinoisDocumentPacketInput): IllinoisDocumentType[] {
  const types: IllinoisDocumentType[] = ["illinois_request_to_expungeseal_packet", "illinois_case_list", "illinois_order_granting_placeholder", "illinois_order_denying_reference", "illinois_notice_of_filing_placeholder"];
  if (remedyType === "expungement") types.push("illinois_additional_arrests_expungement");
  if (remedyType === "sealing") types.push("illinois_additional_arrests_sealing");
  if (input.feeWaiverRequested) types.push("illinois_fee_waiver_instructions");
  if (pathway === "excluded_or_needs_review") return ["illinois_case_list", "illinois_order_denying_reference"];
  return types;
}

function findMissingFields(pathway: IllinoisPathway, input: IllinoisDocumentPacketInput, remedyType: IllinoisRemedyType): IllinoisDocumentFieldKey[] {
  const missing: IllinoisDocumentFieldKey[] = [];
  for (const field of illinoisRequiredFields[pathway]) {
    if (!hasFieldValue(field, input, remedyType)) missing.push(field);
  }
  return missing;
}

function hasFieldValue(field: IllinoisDocumentFieldKey, input: IllinoisDocumentPacketInput, remedyType: IllinoisRemedyType) {
  if (field === "petitionerName") return Boolean(input.petitionerFirstName?.trim() && input.petitionerLastName?.trim());
  if (field === "remedyType") return remedyType !== "needs_review";
  if (field === "hasRapSheet") return input.hasRapSheet === true;
  if (field === "excludedOffenseScreening") return typeof input.excludedOffenseSignal === "boolean";
  if (field === "caseOrArrestNumber") return Boolean(input.caseOrArrestNumber?.trim());
  return Boolean(String(input[field as keyof IllinoisDocumentPacketInput] ?? "").trim());
}

function selectEligibilitySignal(pathway: IllinoisPathway, remedyType: IllinoisRemedyType, input: IllinoisDocumentPacketInput): IllinoisEligibilitySignal {
  if (pathway === "excluded_or_needs_review") return "excluded_or_blocked_review_needed";
  if (pathway === "needs_rap_sheet" || input.hasRapSheet === false) return "needs_rap_sheet";
  if (pathway === "more_information_needed") return "needs_more_information";
  return remedyType === "sealing" ? "possible_sealing_path" : "possible_expungement_path";
}
