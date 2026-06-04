import type { RcapIntakeSession } from "@/lib/rcap-intake/types";
import type { TexasHarrisDocumentType } from "@/lib/rcap/state-packs/texas-harris/document-types";
import { texasHarrisRequiredFields, type TexasHarrisDocumentFieldKey } from "@/lib/rcap/state-packs/texas-harris/required-fields";
import type { TexasHarrisEligibilitySignal, TexasHarrisPathway, TexasHarrisRemedyType } from "@/lib/rcap/state-packs/texas-harris/pathways";
import type { TexasHarrisDocumentPacketInput, TexasHarrisDispositionRoute, TexasHarrisMappedDocumentFields } from "./types";

export function mapTexasHarrisIntakeToDocumentFields(
  session: RcapIntakeSession,
  packet: Partial<TexasHarrisDocumentPacketInput> = {}
): TexasHarrisMappedDocumentFields {
  const dispositionRoute = packet.dispositionRoute ?? inferDispositionRoute(session, packet);
  const merged: TexasHarrisDocumentPacketInput = {
    partnerSlug: session.partnerSlug,
    intakeSessionId: session.id,
    state: "TX",
    county: "Harris",
    courtType: packet.courtType ?? inferCourtType(packet),
    petitionerFirstName: packet.petitionerFirstName ?? session.userFirstName,
    petitionerLastName: packet.petitionerLastName ?? session.userLastName,
    charge: packet.charge ?? session.chargeOrCaseType,
    disposition: packet.disposition ?? session.caseOutcome,
    dispositionRoute,
    dpsCriminalHistoryReady: packet.dpsCriminalHistoryReady ?? session.hasDocuments,
    certifiedDispositionReady: packet.certifiedDispositionReady ?? session.hasDocuments,
    caseOutcome: packet.caseOutcome ?? session.caseOutcome,
    recordType: packet.recordType ?? session.recordType,
    ...packet
  };
  const pathway = selectTexasHarrisPathway(merged);
  const remedyType = selectRemedyType(pathway);
  const documentTypes = selectDocumentTypes(remedyType, pathway);
  const missingFields = findMissingFields(pathway, merged);
  const noticeParties = buildNoticeParties(merged);
  const eligibilitySignal = selectEligibilitySignal(pathway, remedyType, merged, missingFields);
  return {
    ...merged,
    pathway,
    remedyType,
    documentTypes,
    eligibilitySignal,
    missingFields,
    noticeParties,
    needsRecordReview: pathway === "more_information_needed" || pathway === "final_conviction_pardon_review" || missingFields.length > 0
  };
}

export function selectTexasHarrisPathway(input: TexasHarrisDocumentPacketInput): TexasHarrisPathway {
  if (input.dispositionRoute === "acquittal_not_guilty") return "expunction_acquittal_not_guilty";
  if (input.dispositionRoute === "arrest_no_charge") return "expunction_arrest_no_charge";
  if (input.dispositionRoute === "dismissal_or_quashed") return "expunction_dismissal_or_quashed";
  if (input.dispositionRoute === "limitations_expired") return "expunction_limitations_expired";
  if (input.dispositionRoute === "pardon_actual_innocence") return "expunction_pardon_actual_innocence";
  if (input.dispositionRoute === "class_c_deferred_completed") return "expunction_class_c_deferred_completed";
  if (input.dispositionRoute === "deferred_adjudication_completed") return "nondisclosure_deferred_adjudication_completed";
  if (input.dispositionRoute === "eligible_conviction") return "nondisclosure_eligible_conviction";
  if (input.dispositionRoute === "first_offense_dwi") return "nondisclosure_first_offense_dwi";
  if (input.dispositionRoute === "final_conviction") return "final_conviction_pardon_review";
  return "more_information_needed";
}

function selectRemedyType(pathway: TexasHarrisPathway): TexasHarrisRemedyType {
  if (pathway.startsWith("expunction_")) return "expunction";
  if (pathway.startsWith("nondisclosure_")) return "nondisclosure";
  return "needs_review";
}

function selectDocumentTypes(remedyType: TexasHarrisRemedyType, pathway: TexasHarrisPathway): TexasHarrisDocumentType[] {
  const shared: TexasHarrisDocumentType[] = ["texas_harris_verification", "texas_harris_agency_notice_party_list", "texas_harris_filing_next_steps"];
  if (remedyType === "expunction") return ["texas_harris_petition_for_expunction", "texas_harris_proposed_order_of_expunction", ...shared];
  if (remedyType === "nondisclosure") return ["texas_harris_petition_for_order_of_nondisclosure", "texas_harris_proposed_order_of_nondisclosure", ...shared];
  if (pathway === "final_conviction_pardon_review") return ["texas_harris_petition_for_order_of_nondisclosure", "texas_harris_agency_notice_party_list", "texas_harris_filing_next_steps"];
  return shared;
}

function findMissingFields(pathway: TexasHarrisPathway, input: TexasHarrisDocumentPacketInput): TexasHarrisDocumentFieldKey[] {
  const missing: TexasHarrisDocumentFieldKey[] = [];
  for (const field of texasHarrisRequiredFields[pathway]) {
    if (!hasFieldValue(field, input)) missing.push(field);
  }
  return missing;
}

function hasFieldValue(field: TexasHarrisDocumentFieldKey, input: TexasHarrisDocumentPacketInput) {
  if (field === "petitionerName") return Boolean(input.petitionerFirstName?.trim() && input.petitionerLastName?.trim());
  if (field === "petitionerIdentifyingInformation") return Boolean(input.petitionerDateOfBirth?.trim() || input.petitionerDriverLicenseOrId?.trim() || input.petitionerSsnLastFour?.trim());
  if (field === "harrisCountyCourtSelection") return Boolean(input.courtType && input.courtType !== "unknown");
  if (field === "caseNumber") return Boolean(input.caseNumber?.trim());
  if (field === "statutoryRoute") return Boolean(input.statutoryRoute?.trim());
  if (field === "waitingPeriodFacts") return Boolean(input.waitingPeriodFacts?.trim());
  if (field === "disqualifierChecks") return input.noDisqualifyingHistory === true || Boolean(input.disqualifierNotes?.trim());
  if (field === "agencyNoticeParties") return buildNoticeParties(input).length > 0;
  if (field === "verificationReady") return input.verificationReady === true;
  return Boolean(String(input[field as keyof TexasHarrisDocumentPacketInput] ?? "").trim());
}

function selectEligibilitySignal(
  pathway: TexasHarrisPathway,
  remedyType: TexasHarrisRemedyType,
  input: TexasHarrisDocumentPacketInput,
  missingFields: TexasHarrisDocumentFieldKey[]
): TexasHarrisEligibilitySignal {
  if (pathway === "final_conviction_pardon_review") return "likely_no_relief_except_pardon";
  if (pathway === "more_information_needed" || missingFields.length > 0) return "needs_more_information";
  if (input.noDisqualifyingHistory === false) return "disqualifier_review_needed";
  if (remedyType === "expunction") return "possible_expunction_path";
  if (remedyType === "nondisclosure") return "possible_nondisclosure_path";
  return "needs_more_information";
}

function inferDispositionRoute(session: RcapIntakeSession, packet: Partial<TexasHarrisDocumentPacketInput>): TexasHarrisDispositionRoute {
  const text = `${packet.disposition ?? session.caseOutcome ?? ""} ${packet.charge ?? session.chargeOrCaseType ?? ""}`.toLowerCase();
  if (/not guilty|acquitt/.test(text) || session.caseOutcome === "not_guilty") return "acquittal_not_guilty";
  if (/no charge|no charges|not filed/.test(text) || session.caseOutcome === "no_charges_filed") return "arrest_no_charge";
  if (/dismiss|quash/.test(text) || session.caseOutcome === "dismissed") return "dismissal_or_quashed";
  if (/limitation/.test(text)) return "limitations_expired";
  if (/pardon|actual innocence/.test(text)) return "pardon_actual_innocence";
  if (/class c|municipal/.test(text) && /deferred/.test(text)) return "class_c_deferred_completed";
  if (/deferred adjudication/.test(text)) return "deferred_adjudication_completed";
  if (/first.*dwi|dwi.*first/.test(text)) return "first_offense_dwi";
  if (/eligible conviction/.test(text)) return "eligible_conviction";
  if (/convict|final/.test(text) || session.caseOutcome === "convicted") return "final_conviction";
  return "unknown";
}

function inferCourtType(input: Partial<TexasHarrisDocumentPacketInput>) {
  if (input.dispositionRoute === "class_c_deferred_completed") return "municipal_class_c";
  return "unknown";
}

function buildNoticeParties(input: TexasHarrisDocumentPacketInput) {
  const parties = [
    "Texas Department of Public Safety",
    "Harris County District Attorney",
    "Harris County District Clerk",
    "Harris County Sheriff",
    input.includeHoustonPoliceDepartment || /houston police/i.test(input.arrestingAgency ?? "") ? "Houston Police Department" : undefined,
    input.arrestingAgency && !/houston police|harris county sheriff/i.test(input.arrestingAgency) ? input.arrestingAgency : undefined,
    ...(input.additionalAgencies ?? [])
  ].filter(Boolean) as string[];
  return Array.from(new Set(parties));
}
