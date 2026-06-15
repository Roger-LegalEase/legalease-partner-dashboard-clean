import type { WyPathway } from "./pathways";

export type WyDocumentFieldKey =
  | "petitionerName"
  | "petitionerAliases"
  | "dateOfBirth"
  | "countyName"
  | "courtName"
  | "caseNumber"
  | "arrestDate"
  | "chargeDate"
  | "originalCharge"
  | "finalCharge"
  | "disposition"
  | "dispositionDate"
  | "offenseLevel"
  | "statusOffense"
  | "sentenceCompletionDate"
  | "probationCompletionDate"
  | "programCompletionDate"
  | "restitutionStatus"
  | "firearmInvolvement"
  | "deferredDispositionCheck"
  | "priorFelonyCheck"
  | "priorExpungementCheck"
  | "pendingChargesCheck"
  | "sexOffenderRegistrationCheck"
  | "prosecutingAttorney"
  | "serviceMethod";

export const wyRequiredFields: Record<WyPathway, WyDocumentFieldKey[]> = {
  adult_nonconviction_expungement: [
    "petitionerName",
    "dateOfBirth",
    "countyName",
    "courtName",
    "caseNumber",
    "arrestDate",
    "originalCharge",
    "disposition",
    "dispositionDate",
    "deferredDispositionCheck",
    "pendingChargesCheck",
    "prosecutingAttorney",
    "serviceMethod"
  ],
  adult_misdemeanor_status_offense: [
    "petitionerName",
    "countyName",
    "courtName",
    "caseNumber",
    "finalCharge",
    "offenseLevel",
    "statusOffense",
    "sentenceCompletionDate",
    "firearmInvolvement",
    "priorExpungementCheck",
    "prosecutingAttorney",
    "serviceMethod"
  ],
  adult_misdemeanor_non_status_offense: [
    "petitionerName",
    "countyName",
    "courtName",
    "caseNumber",
    "finalCharge",
    "offenseLevel",
    "statusOffense",
    "sentenceCompletionDate",
    "firearmInvolvement",
    "priorExpungementCheck",
    "prosecutingAttorney",
    "serviceMethod"
  ],
  adult_felony_expungement: [
    "petitionerName",
    "countyName",
    "courtName",
    "caseNumber",
    "finalCharge",
    "sentenceCompletionDate",
    "restitutionStatus",
    "firearmInvolvement",
    "priorFelonyCheck",
    "priorExpungementCheck",
    "sexOffenderRegistrationCheck",
    "prosecutingAttorney",
    "serviceMethod"
  ],
  juvenile_expungement: [
    "petitionerName",
    "countyName",
    "courtName",
    "caseNumber",
    "originalCharge",
    "disposition",
    "priorFelonyCheck",
    "pendingChargesCheck"
  ],
  trafficking_victim_vacatur: ["petitionerName", "countyName", "courtName", "caseNumber", "finalCharge"],
  needs_review: ["originalCharge", "disposition"]
};

export const wyFieldLabels: Record<WyDocumentFieldKey, string> = {
  petitionerName: "Petitioner full legal name",
  petitionerAliases: "Prior names / aliases",
  dateOfBirth: "Date of birth",
  countyName: "County",
  courtName: "Wyoming court (district, circuit, municipal, or juvenile)",
  caseNumber: "Case number",
  arrestDate: "Arrest date",
  chargeDate: "Charge date",
  originalCharge: "Original charge",
  finalCharge: "Final charge",
  disposition: "Final disposition",
  dispositionDate: "Disposition date",
  offenseLevel: "Offense level (misdemeanor / felony / municipal / juvenile)",
  statusOffense: "Whether the misdemeanor is a status offense or non-status offense",
  sentenceCompletionDate: "Expiration of all sentence terms, including probation",
  probationCompletionDate: "Probation completion date",
  programCompletionDate: "Court-ordered program completion date",
  restitutionStatus: "Restitution payment status",
  firearmInvolvement: "Whether firearm use or attempted use was involved",
  deferredDispositionCheck:
    "Whether there was a deferred disposition under W.S. 7-13-301, 35-7-1037, or former 7-13-203",
  priorFelonyCheck: "Whether any other felony plea/no-contest/conviction exists",
  priorExpungementCheck: "Whether a prior expungement under the same section was granted",
  pendingChargesCheck: "Whether any charges are pending",
  sexOffenderRegistrationCheck: "Whether any sex-offender registration was required",
  prosecutingAttorney: "Prosecuting attorney to serve (and DCI for conviction routes)",
  serviceMethod: "Service method"
};
