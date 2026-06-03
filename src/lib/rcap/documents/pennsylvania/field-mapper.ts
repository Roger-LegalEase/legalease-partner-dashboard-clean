import type { RcapIntakeSession } from "@/lib/rcap-intake/types";
import type { PennsylvaniaDocumentType } from "@/lib/rcap/state-packs/pennsylvania/document-types";
import { pennsylvaniaRequiredFields, type PennsylvaniaDocumentFieldKey } from "@/lib/rcap/state-packs/pennsylvania/required-fields";
import type { PennsylvaniaEligibilitySignal, PennsylvaniaPathway, PennsylvaniaRemedyType } from "@/lib/rcap/state-packs/pennsylvania/pathways";
import type { PennsylvaniaDocumentPacketInput, PennsylvaniaMappedDocumentFields, PennsylvaniaOffenseGrade } from "./types";

export function mapPennsylvaniaIntakeToDocumentFields(
  session: RcapIntakeSession,
  packet: Partial<PennsylvaniaDocumentPacketInput> = {}
): PennsylvaniaMappedDocumentFields {
  const merged: PennsylvaniaDocumentPacketInput = {
    partnerSlug: session.partnerSlug,
    intakeSessionId: session.id,
    state: "PA",
    county: packet.county ?? session.county,
    charge: packet.charge ?? session.chargeOrCaseType,
    disposition: packet.disposition ?? session.caseOutcome,
    petitionerFirstName: packet.petitionerFirstName ?? session.userFirstName,
    petitionerLastName: packet.petitionerLastName ?? session.userLastName,
    hasPatchReport: packet.hasPatchReport ?? session.hasDocuments,
    caseOutcome: packet.caseOutcome ?? session.caseOutcome,
    recordType: packet.recordType ?? session.recordType,
    offenseGrade: packet.offenseGrade ?? inferGrade(packet.charge ?? session.chargeOrCaseType),
    ...packet
  };
  const pathway = selectPennsylvaniaPathway(merged);
  const remedyType = selectRemedyType(pathway, merged);
  const documentTypes = selectDocumentTypes(pathway, remedyType, merged);
  const missingFields = findMissingFields(pathway, merged);
  const eligibilitySignal = selectEligibilitySignal(pathway, remedyType, merged);
  return {
    ...merged,
    pathway,
    remedyType,
    documentTypes,
    eligibilitySignal,
    missingFields,
    needsRecordReview: pathway === "excluded_or_needs_review" || pathway === "more_information_needed" || missingFields.length > 0
  };
}

export function selectPennsylvaniaPathway(input: PennsylvaniaDocumentPacketInput): PennsylvaniaPathway {
  if (input.federalOrOutOfStateSignal || input.excludedOffenseSignal || input.sexOffenderRegistrationSignal || input.firearmWeaponSignal || input.familyOrDangerToPersonSignal) return "excluded_or_needs_review";
  if (input.fullPardon) return "expungement_pardon";
  if (input.ageSeventyOrOlder) return "expungement_age_70";
  if (input.deceasedThreeYears) return "expungement_deceased";
  if (input.ardCompleted || /ard/i.test(input.disposition ?? "")) return "expungement_ard";
  if (input.caseOutcome === "dismissed" || input.caseOutcome === "not_prosecuted" || input.caseOutcome === "no_charges_filed" || input.caseOutcome === "not_guilty" || input.recordType === "charged_not_convicted") {
    return input.cleanSlateAutomaticSignal ? "clean_slate_automatic_non_conviction" : "expungement_non_conviction";
  }
  if (/no disposition/i.test(input.disposition ?? "") || input.caseOutcome === "not_sure") return "expungement_no_disposition_18_months";
  if (input.offenseGrade === "summary") return input.cleanSlateAutomaticSignal ? "clean_slate_automatic_summary" : "expungement_summary_5_years";
  if (input.offenseGrade === "drug_felony") return "clean_slate_automatic_drug_felony";
  if (input.offenseGrade === "F3_property") return "limited_access_property_felony";
  if (input.offenseGrade === "M1" || input.offenseGrade === "M2" || input.offenseGrade === "M3") {
    if (input.cleanSlateAutomaticSignal) return "clean_slate_automatic_misdemeanor";
    return "limited_access_misdemeanor";
  }
  if (input.caseOutcome === "convicted" || input.caseOutcome === "completed_sentence" || input.recordType === "past_conviction") return "excluded_or_needs_review";
  return "more_information_needed";
}

function selectRemedyType(pathway: PennsylvaniaPathway, input: PennsylvaniaDocumentPacketInput): PennsylvaniaRemedyType {
  if (pathway.startsWith("expungement_")) return "expungement";
  if (pathway.startsWith("limited_access_")) return "limited_access";
  if (pathway.startsWith("clean_slate_")) return "clean_slate";
  return input.remedyType ?? "needs_review";
}

function selectDocumentTypes(pathway: PennsylvaniaPathway, remedyType: PennsylvaniaRemedyType, input: PennsylvaniaDocumentPacketInput): PennsylvaniaDocumentType[] {
  const shared: PennsylvaniaDocumentType[] = ["pennsylvania_patch_attachment_checklist", "pennsylvania_filing_instructions"];
  if (input.commonwealthServiceReady || remedyType !== "clean_slate") shared.push("pennsylvania_commonwealth_service_certificate");
  if (remedyType === "expungement") return ["pennsylvania_rule_790_expungement_petition", ...shared];
  if (remedyType === "limited_access") return ["pennsylvania_limited_access_review_notes", ...shared];
  if (remedyType === "clean_slate") return ["pennsylvania_clean_slate_verification_notes", ...shared];
  if (pathway === "excluded_or_needs_review") return ["pennsylvania_limited_access_review_notes", "pennsylvania_patch_attachment_checklist", "pennsylvania_filing_instructions"];
  return shared;
}

function findMissingFields(pathway: PennsylvaniaPathway, input: PennsylvaniaDocumentPacketInput): PennsylvaniaDocumentFieldKey[] {
  const missing: PennsylvaniaDocumentFieldKey[] = [];
  for (const field of pennsylvaniaRequiredFields[pathway]) {
    if (!hasFieldValue(field, input)) missing.push(field);
  }
  return missing;
}

function hasFieldValue(field: PennsylvaniaDocumentFieldKey, input: PennsylvaniaDocumentPacketInput) {
  if (field === "petitionerName") return Boolean(input.petitionerFirstName?.trim() && input.petitionerLastName?.trim());
  if (field === "patchReport") return input.hasPatchReport === true || Boolean(input.patchMissingReason?.trim());
  if (field === "restitutionStatus") return input.restitutionPaid === true || input.victimRestitutionOwed === false || input.nonRestitutionCostsOnly === true;
  if (field === "waitingPeriod") return input.waitingPeriodSatisfied === true || input.noPendingProceedings === true || input.noArrestOrProsecutionFiveYears === true || input.convictionFreeSevenYears === true || input.convictionFreeTenYears === true;
  if (field === "excludedOffenseScreening") return typeof input.excludedOffenseSignal === "boolean";
  if (field === "commonwealthService") return input.commonwealthServiceReady === true;
  return Boolean(String(input[field as keyof PennsylvaniaDocumentPacketInput] ?? "").trim());
}

function selectEligibilitySignal(pathway: PennsylvaniaPathway, remedyType: PennsylvaniaRemedyType, input: PennsylvaniaDocumentPacketInput): PennsylvaniaEligibilitySignal {
  if (pathway === "excluded_or_needs_review") return "excluded_or_blocked_review_needed";
  if (!input.hasPatchReport && !input.patchMissingReason) return "needs_patch_report";
  if (pathway === "more_information_needed") return "needs_more_information";
  if (remedyType === "limited_access") return "possible_limited_access_path";
  if (remedyType === "clean_slate") return "possible_clean_slate_path";
  return "possible_expungement_path";
}

function inferGrade(value?: string): PennsylvaniaOffenseGrade {
  const lower = value?.toLowerCase() ?? "";
  if (/\bsummary\b/.test(lower)) return "summary";
  if (/\bm1\b|misdemeanor 1|first-degree misdemeanor/.test(lower)) return "M1";
  if (/\bm2\b|misdemeanor 2|second-degree misdemeanor/.test(lower)) return "M2";
  if (/\bm3\b|misdemeanor 3|third-degree misdemeanor/.test(lower)) return "M3";
  if (/third-degree property felony|f3 property|property felony/.test(lower)) return "F3_property";
  if (/drug felony|controlled substance felony/.test(lower)) return "drug_felony";
  if (/felony/.test(lower)) return "felony_other";
  return "unknown";
}
