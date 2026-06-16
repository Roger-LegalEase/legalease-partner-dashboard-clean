import type { WvPathway } from "./pathways";

// Required-field keys derived from the "West Virginia Expungement Reference for
// Wilma" (the intake checklist in section 18 and the petition-contents/packet logic
// in sections 11 and 19). These describe the data each West Virginia pathway needs;
// they are not a field map to the official SCA-C form PDFs (no overlay is built and
// no renderer is wired).
export type WvDocumentFieldKey =
  | "petitionerName"
  | "formerNamesAliases"
  | "dateOfBirth"
  | "ssnOrLastFour"
  | "currentAddress"
  | "addressHistorySinceOffense"
  | "phoneEmail"
  | "county"
  | "court"
  | "caseNumber"
  | "arrestDate"
  | "arrestingAgency"
  | "prosecutingAttorney"
  | "originalCharge"
  | "finalCharge"
  | "statuteNumbers"
  | "disposition"
  | "dispositionDate"
  | "dismissedInExchangeForPlea"
  | "sameTransactionCheck"
  | "diversionOrDeferredCompletion"
  | "convictionCount"
  | "sentenceDate"
  | "incarcerationCompletionDate"
  | "supervisionCompletionDate"
  | "pendingChargesCheck"
  | "priorExpungementCheck"
  | "rehabilitationSteps"
  | "exclusionScreening"
  | "treatmentRecoveryDocumentation"
  | "jobReadinessCertificate"
  | "conditionalDischargeOrder"
  | "probationExpirationDate"
  | "governorPardon"
  | "publicationNotice"
  | "traffickingDocumentation"
  | "juvenileJurisdictionEndDate"
  | "victimNoContactOrders"
  | "feeOrWaiver";

export const wvRequiredFields: Record<WvPathway, WvDocumentFieldKey[]> = {
  non_conviction_acquittal_dismissal_expungement: [
    "petitionerName",
    "county",
    "court",
    "caseNumber",
    "arrestDate",
    "arrestingAgency",
    "originalCharge",
    "statuteNumbers",
    "disposition",
    "dispositionDate",
    "dismissedInExchangeForPlea",
    "pendingChargesCheck"
  ],
  pretrial_diversion_deferred_expungement: [
    "petitionerName",
    "county",
    "court",
    "caseNumber",
    "originalCharge",
    "statuteNumbers",
    "diversionOrDeferredCompletion",
    "sameTransactionCheck",
    "dismissedInExchangeForPlea",
    "pendingChargesCheck"
  ],
  misdemeanor_conviction_expungement: [
    "petitionerName",
    "formerNamesAliases",
    "dateOfBirth",
    "ssnOrLastFour",
    "currentAddress",
    "addressHistorySinceOffense",
    "county",
    "court",
    "caseNumber",
    "arrestDate",
    "arrestingAgency",
    "prosecutingAttorney",
    "originalCharge",
    "finalCharge",
    "statuteNumbers",
    "disposition",
    "convictionCount",
    "sentenceDate",
    "incarcerationCompletionDate",
    "supervisionCompletionDate",
    "pendingChargesCheck",
    "priorExpungementCheck",
    "rehabilitationSteps",
    "exclusionScreening",
    "victimNoContactOrders",
    "feeOrWaiver"
  ],
  nonviolent_felony_conviction_expungement: [
    "petitionerName",
    "formerNamesAliases",
    "dateOfBirth",
    "currentAddress",
    "addressHistorySinceOffense",
    "county",
    "court",
    "caseNumber",
    "originalCharge",
    "finalCharge",
    "statuteNumbers",
    "disposition",
    "sameTransactionCheck",
    "sentenceDate",
    "incarcerationCompletionDate",
    "supervisionCompletionDate",
    "pendingChargesCheck",
    "priorExpungementCheck",
    "rehabilitationSteps",
    "exclusionScreening",
    "victimNoContactOrders",
    "feeOrWaiver"
  ],
  accelerated_treatment_job_readiness_expungement: [
    "petitionerName",
    "county",
    "court",
    "caseNumber",
    "originalCharge",
    "statuteNumbers",
    "convictionCount",
    "supervisionCompletionDate",
    "treatmentRecoveryDocumentation",
    "jobReadinessCertificate",
    "priorExpungementCheck"
  ],
  first_offense_drug_possession_conditional_discharge: [
    "petitionerName",
    "county",
    "court",
    "caseNumber",
    "originalCharge",
    "conditionalDischargeOrder",
    "probationExpirationDate"
  ],
  pardon_based_expungement: [
    "petitionerName",
    "county",
    "court",
    "caseNumber",
    "originalCharge",
    "governorPardon",
    "dispositionDate",
    "publicationNotice"
  ],
  trafficking_victim_vacatur_expungement: [
    "petitionerName",
    "county",
    "court",
    "caseNumber",
    "originalCharge",
    "traffickingDocumentation"
  ],
  juvenile_confidentiality_sealing: [
    "petitionerName",
    "dateOfBirth",
    "county",
    "court",
    "caseNumber",
    "juvenileJurisdictionEndDate"
  ],
  needs_review: ["originalCharge", "statuteNumbers", "disposition", "caseNumber"]
};

export const wvFieldLabels: Record<WvDocumentFieldKey, string> = {
  petitionerName: "Full legal name",
  formerNamesAliases: "All prior names and aliases",
  dateOfBirth: "Date of birth",
  ssnOrLastFour: "Social Security number or last four digits",
  currentAddress: "Current address",
  addressHistorySinceOffense: "All addresses since the date of offense (conviction petitions)",
  phoneEmail: "Phone and email",
  county: "County",
  court: "Court (circuit, magistrate, municipal)",
  caseNumber: "Case number (and any lower-court number)",
  arrestDate: "Arrest date",
  arrestingAgency: "Arresting agency",
  prosecutingAttorney: "Prosecuting attorney",
  originalCharge: "Original charge",
  finalCharge: "Final charge",
  statuteNumbers: "Statute numbers",
  disposition: "Disposition",
  dispositionDate: "Date of acquittal, dismissal, conviction, discharge, or pardon",
  dismissedInExchangeForPlea: "Whether the dismissal was in exchange for a guilty plea to another conviction",
  sameTransactionCheck: "Whether charges arose from the same transaction or occurrence",
  diversionOrDeferredCompletion: "Whether pretrial diversion or deferred adjudication was completed",
  convictionCount: "Single misdemeanor, multiple misdemeanors, or nonviolent felony",
  sentenceDate: "Sentence date",
  incarcerationCompletionDate: "Incarceration completion date",
  supervisionCompletionDate: "Supervision/probation/parole completion date",
  pendingChargesCheck: "Whether any criminal charges are pending",
  priorExpungementCheck: "Whether the person has previously used § 61-11-26 or § 61-11-26a, or other prior relief",
  rehabilitationSteps: "Rehabilitation steps (treatment, work, education, counseling, community service)",
  exclusionScreening: "Exclusion screening (violence, minor victim, sex, deadly weapon, DV/household member, strangulation, DUI, dwelling burglary, sexually motivated, CDL, attempt/conspiracy)",
  treatmentRecoveryDocumentation: "Medical documentation of substance-abuse history and proof of treatment/recovery compliance (§ 61-11-26a)",
  jobReadinessCertificate: "WV Department of Education-approved job-readiness adult training certificate (§ 61-11-26a)",
  conditionalDischargeOrder: "Conditional discharge order under § 60A-4-407",
  probationExpirationDate: "Date probation expired (for the 6-month calculation)",
  governorPardon: "Full and unconditional Governor's pardon",
  publicationNotice: "Class I legal advertisement / publication notice (pardon route)",
  traffickingDocumentation: "Trafficking-supporting documentation (victim route)",
  juvenileJurisdictionEndDate: "Date juvenile/personal jurisdiction ended (and 18th-birthday date)",
  victimNoContactOrders: "Victim, no-contact, protection, restraining, and restitution-order information",
  feeOrWaiver: "Civil filing fee and the $100 State Police processing fee (waived under § 61-11-26a) or a waiver request"
};
