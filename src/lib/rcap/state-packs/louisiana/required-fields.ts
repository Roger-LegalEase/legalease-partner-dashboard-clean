import type { LaPathway } from "./pathways";

// Required-field keys derived from the Louisiana Expungement Reference for Wilma
// (the required intake data in section 7 and the packet logic in section 9).
// These describe the data each Louisiana pathway needs; they are not a field map
// to the statutory Code forms (no PDF/field map exists yet) and no renderer is
// wired.
export type LaDocumentFieldKey =
  | "petitionerName"
  | "dateOfBirth"
  | "ssnLastFour"
  | "raceGender"
  | "driversLicenseNumber"
  | "addressPhoneEmail"
  | "parishOfArrest"
  | "arrestingAgency"
  | "arrestDate"
  | "originalArrestCharge"
  | "arrestNumberAtn"
  | "sidNumber"
  | "agencyItemNumber"
  | "allCounts"
  | "courtParish"
  | "docketNumber"
  | "billOfInformation"
  | "finalDisposition"
  | "minuteEntry"
  | "dispositionType"
  | "convictionClass"
  | "sentenceCompletionDate"
  | "probationParoleCompletionDate"
  | "pendingCharges"
  | "priorFelonyConvictions"
  | "convictionsInLookbackWindow"
  | "setAsideStatus"
  | "firstOffenderPardonStatus"
  | "courtCostsPaid"
  | "offenseFlagsScreen"
  | "rightToReviewRapSheet"
  | "daCertification"
  | "feeWaiverCertification"
  | "dwiOmvProof"
  | "traffickingCertification";

export const laRequiredFields: Record<LaPathway, LaDocumentFieldKey[]> = {
  no_conviction_expungement: [
    "petitionerName",
    "dateOfBirth",
    "parishOfArrest",
    "arrestingAgency",
    "arrestDate",
    "originalArrestCharge",
    "arrestNumberAtn",
    "allCounts",
    "docketNumber",
    "finalDisposition",
    "dispositionType",
    "rightToReviewRapSheet",
    "feeWaiverCertification"
  ],
  misdemeanor_conviction_expungement: [
    "petitionerName",
    "dateOfBirth",
    "parishOfArrest",
    "arrestingAgency",
    "arrestDate",
    "originalArrestCharge",
    "allCounts",
    "courtParish",
    "docketNumber",
    "finalDisposition",
    "convictionClass",
    "sentenceCompletionDate",
    "pendingCharges",
    "priorFelonyConvictions",
    "setAsideStatus",
    "offenseFlagsScreen",
    "rightToReviewRapSheet",
    "daCertification"
  ],
  felony_conviction_expungement: [
    "petitionerName",
    "dateOfBirth",
    "parishOfArrest",
    "arrestingAgency",
    "arrestDate",
    "originalArrestCharge",
    "allCounts",
    "courtParish",
    "docketNumber",
    "billOfInformation",
    "finalDisposition",
    "convictionClass",
    "sentenceCompletionDate",
    "probationParoleCompletionDate",
    "pendingCharges",
    "convictionsInLookbackWindow",
    "setAsideStatus",
    "firstOffenderPardonStatus",
    "courtCostsPaid",
    "offenseFlagsScreen",
    "rightToReviewRapSheet",
    "daCertification"
  ],
  first_offense_marijuana_expungement: [
    "petitionerName",
    "dateOfBirth",
    "courtParish",
    "docketNumber",
    "originalArrestCharge",
    "finalDisposition",
    "convictionClass",
    "rightToReviewRapSheet"
  ],
  interim_expungement: [
    "petitionerName",
    "dateOfBirth",
    "parishOfArrest",
    "arrestingAgency",
    "arrestDate",
    "originalArrestCharge",
    "allCounts",
    "docketNumber",
    "finalDisposition",
    "convictionClass",
    "rightToReviewRapSheet"
  ],
  expungement_by_redaction: [
    "petitionerName",
    "dateOfBirth",
    "parishOfArrest",
    "arrestDate",
    "docketNumber",
    "finalDisposition",
    "rightToReviewRapSheet"
  ],
  human_trafficking_victim: [
    "petitionerName",
    "dateOfBirth",
    "courtParish",
    "docketNumber",
    "originalArrestCharge",
    "finalDisposition",
    "traffickingCertification"
  ],
  automated_expungement: [
    "petitionerName",
    "dateOfBirth",
    "docketNumber",
    "finalDisposition",
    "rightToReviewRapSheet"
  ],
  immediate_expungement_after_program: [
    "petitionerName",
    "dateOfBirth",
    "courtParish",
    "docketNumber",
    "billOfInformation",
    "finalDisposition",
    "minuteEntry"
  ],
  needs_review: ["originalArrestCharge", "finalDisposition", "convictionClass"]
};

export const laFieldLabels: Record<LaDocumentFieldKey, string> = {
  petitionerName: "Full legal name",
  dateOfBirth: "Date of birth",
  ssnLastFour: "Last four digits of SSN",
  raceGender: "Race and gender/sex (as required by the current local form)",
  driversLicenseNumber: "Driver's license number, if available",
  addressPhoneEmail: "Address and phone/email",
  parishOfArrest: "Parish/city of arrest",
  arrestingAgency: "Arresting agency",
  arrestDate: "Arrest date (use rap-sheet booking/fingerprint date when available)",
  originalArrestCharge: "Original arrest charge (NOT the amended charge)",
  arrestNumberAtn: "Arrest number / ATN",
  sidNumber: "SID number, if available",
  agencyItemNumber: "Agency item number, if available",
  allCounts: "All counts from the same arrest",
  courtParish: "Court / parish",
  docketNumber: "Docket / case number",
  billOfInformation: "Bill of information, if any",
  finalDisposition: "Final disposition",
  minuteEntry: "Minute entry showing disposition",
  dispositionType: "Disposition type (dismissed, refused, acquitted, quashed, diverted, or convicted)",
  convictionClass: "If convicted: misdemeanor/felony classification",
  sentenceCompletionDate: "Sentence completion date",
  probationParoleCompletionDate: "Probation/parole completion date",
  pendingCharges: "Any pending charges",
  priorFelonyConvictions: "Any felony convictions (any time)",
  convictionsInLookbackWindow: "Any criminal convictions in the relevant 5-year or 10-year window",
  setAsideStatus: "Whether the conviction was set aside under art. 894(B) or 893(E)",
  firstOffenderPardonStatus: "Whether the person has/qualifies for a first-offender pardon",
  courtCostsPaid: "Whether court costs were paid (required for first-offender pardon)",
  offenseFlagsScreen:
    "Offense screen — DWI, sex offense, domestic abuse battery, stalking, violence, controlled substances, minor victim, or trafficking victimization",
  rightToReviewRapSheet: "Right to Review (fingerprint-based Louisiana criminal-history rap sheet)",
  daCertification: "DA certification (required for the 5-year misdemeanor and 10-year felony routes)",
  feeWaiverCertification: "Fee-waiver certification (art. 988), if eligible",
  dwiOmvProof: "DWI OMV proof letter, if applicable",
  traffickingCertification: "Human-trafficking-victim DA certification, if applicable"
};
