import type { OkPathway } from "./pathways";

export type OkDocumentFieldKey =
  | "petitionerName"
  | "petitionerAliases"
  | "dateOfBirth"
  | "ssnLastFour"
  | "address"
  | "okSidNumber"
  | "countyName"
  | "courtName"
  | "caseNumber"
  | "arrestDate"
  | "arrestingAgency"
  | "prosecutingAgency"
  | "originalCharge"
  | "finalCharge"
  | "disposition"
  | "dispositionDate"
  | "sentenceCompletionDate"
  | "restitutionStatus"
  | "treatmentCompletion"
  | "deferredCompletion"
  | "reclassifiedToMisdemeanor"
  | "priorFelonyCheck"
  | "pendingChargesCheck"
  | "otherAgenciesHoldingRecords"
  | "serviceMethod";

export const okRequiredFields: Record<OkPathway, OkDocumentFieldKey[]> = {
  section_18_19_acquittal_or_dismissal: [
    "petitionerName",
    "dateOfBirth",
    "ssnLastFour",
    "address",
    "countyName",
    "courtName",
    "caseNumber",
    "arrestDate",
    "arrestingAgency",
    "originalCharge",
    "disposition",
    "dispositionDate",
    "priorFelonyCheck",
    "pendingChargesCheck",
    "otherAgenciesHoldingRecords",
    "serviceMethod"
  ],
  section_18_19_no_charges_filed: [
    "petitionerName",
    "dateOfBirth",
    "countyName",
    "courtName",
    "arrestDate",
    "arrestingAgency",
    "prosecutingAgency",
    "originalCharge",
    "pendingChargesCheck",
    "serviceMethod"
  ],
  section_18_19_misdemeanor_deferred_dismissal: [
    "petitionerName",
    "countyName",
    "courtName",
    "caseNumber",
    "originalCharge",
    "disposition",
    "dispositionDate",
    "deferredCompletion",
    "priorFelonyCheck",
    "pendingChargesCheck",
    "serviceMethod"
  ],
  section_18_19_felony_deferred_dismissal: [
    "petitionerName",
    "countyName",
    "courtName",
    "caseNumber",
    "originalCharge",
    "disposition",
    "dispositionDate",
    "deferredCompletion",
    "priorFelonyCheck",
    "pendingChargesCheck",
    "serviceMethod"
  ],
  section_18_19_misdemeanor_conviction: [
    "petitionerName",
    "countyName",
    "courtName",
    "caseNumber",
    "finalCharge",
    "disposition",
    "sentenceCompletionDate",
    "restitutionStatus",
    "priorFelonyCheck",
    "pendingChargesCheck",
    "serviceMethod"
  ],
  section_18_19_felony_conviction: [
    "petitionerName",
    "countyName",
    "courtName",
    "caseNumber",
    "finalCharge",
    "disposition",
    "sentenceCompletionDate",
    "restitutionStatus",
    "priorFelonyCheck",
    "pendingChargesCheck",
    "serviceMethod"
  ],
  section_18_19_reclassified_felony: [
    "petitionerName",
    "countyName",
    "courtName",
    "caseNumber",
    "finalCharge",
    "reclassifiedToMisdemeanor",
    "sentenceCompletionDate",
    "restitutionStatus",
    "treatmentCompletion",
    "serviceMethod"
  ],
  section_18_19_pardon: [
    "petitionerName",
    "countyName",
    "courtName",
    "caseNumber",
    "finalCharge",
    "disposition",
    "serviceMethod"
  ],
  section_18_19_identity_theft: [
    "petitionerName",
    "countyName",
    "courtName",
    "caseNumber",
    "originalCharge",
    "disposition",
    "serviceMethod"
  ],
  section_991c_deferred_court_record: [
    "petitionerName",
    "countyName",
    "courtName",
    "caseNumber",
    "originalCharge",
    "deferredCompletion",
    "restitutionStatus"
  ],
  vpo_expungement: ["petitionerName", "countyName", "courtName", "caseNumber", "disposition", "dispositionDate"],
  juvenile_expungement: ["petitionerName", "countyName", "courtName", "caseNumber", "disposition"],
  trafficking_survivor: ["petitionerName", "countyName", "courtName", "caseNumber", "originalCharge"],
  clean_slate_automatic: ["petitionerName", "countyName", "caseNumber", "disposition"],
  needs_review: ["originalCharge", "disposition"]
};

export const okFieldLabels: Record<OkDocumentFieldKey, string> = {
  petitionerName: "Petitioner full legal name",
  petitionerAliases: "Prior names / aliases",
  dateOfBirth: "Date of birth",
  ssnLastFour: "Social Security number or last four digits",
  address: "Current address",
  okSidNumber: "Oklahoma SID number, if known",
  countyName: "County of arrest / filing",
  courtName: "District court where the case was filed",
  caseNumber: "Case number",
  arrestDate: "Arrest date",
  arrestingAgency: "Arresting agency",
  prosecutingAgency: "Prosecuting agency",
  originalCharge: "Original charge",
  finalCharge: "Final charge",
  disposition: "Disposition",
  dispositionDate: "Date of dismissal, acquittal, conviction, pardon, reversal, or sentence completion",
  sentenceCompletionDate: "Sentence-completion date",
  restitutionStatus: "Restitution status",
  treatmentCompletion: "Treatment-program completion, if reclassified felony",
  deferredCompletion: "Proof the deferred judgment or delayed sentence was successfully completed",
  reclassifiedToMisdemeanor: "Whether the felony was later reclassified as a misdemeanor",
  priorFelonyCheck: "Whether any prior felony conviction exists",
  pendingChargesCheck: "Whether any misdemeanor or felony charge is pending",
  otherAgenciesHoldingRecords: "Any state or local agency holding a record of the case",
  serviceMethod: "Service / notice method to the district attorney, arresting agency, and OSBI"
};
