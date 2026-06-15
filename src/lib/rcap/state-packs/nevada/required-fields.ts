import type { NvPathway } from "./pathways";

// Required-field keys derived from the Nevada Record-Sealing Reference for Wilma
// (the NRS 179.245 / 179.255 petition content requirements and the intake
// checklist in section 17). These describe the data each Nevada pathway needs;
// they are not a field map to any county PDF (no PDF field map exists yet) and no
// renderer is wired.
export type NvDocumentFieldKey =
  | "petitionerName"
  | "petitionerAliases"
  | "dateOfBirth"
  | "currentAddress"
  | "phoneEmail"
  | "nevadaSidNumber"
  | "fbiNumber"
  | "driversLicenseNumber"
  | "county"
  | "courtType"
  | "caseNumber"
  | "arrestDate"
  | "arrestingAgency"
  | "prosecutingAgency"
  | "originalCharge"
  | "finalCharge"
  | "disposition"
  | "convictionCategory"
  | "sentenceDate"
  | "releaseFromCustodyDate"
  | "probationParoleDischargeDate"
  | "suspendedSentenceEndDate"
  | "allTermsCompleted"
  | "pendingChargesCheck"
  | "newConvictionsDuringWaitingPeriod"
  | "openWarrantCheck"
  | "verifiedCriminalHistory"
  | "agencyCustodianList"
  | "excludedOffenseCheck"
  | "stipulationStatus"
  | "traffickingVictimFacts"
  | "reentryProgramCompletion"
  | "deferredOrSpecialtyCompletion"
  | "decriminalizedOffenseBasis"
  | "feeWaiverRequest";

export const nvRequiredFields: Record<NvPathway, NvDocumentFieldKey[]> = {
  conviction_record_sealing: [
    "petitionerName",
    "petitionerAliases",
    "dateOfBirth",
    "currentAddress",
    "nevadaSidNumber",
    "county",
    "courtType",
    "caseNumber",
    "arrestDate",
    "arrestingAgency",
    "originalCharge",
    "finalCharge",
    "disposition",
    "convictionCategory",
    "sentenceDate",
    "releaseFromCustodyDate",
    "probationParoleDischargeDate",
    "suspendedSentenceEndDate",
    "allTermsCompleted",
    "pendingChargesCheck",
    "newConvictionsDuringWaitingPeriod",
    "openWarrantCheck",
    "verifiedCriminalHistory",
    "agencyCustodianList",
    "excludedOffenseCheck",
    "feeWaiverRequest"
  ],
  dismissal_declined_acquittal: [
    "petitionerName",
    "dateOfBirth",
    "county",
    "courtType",
    "caseNumber",
    "arrestDate",
    "arrestingAgency",
    "prosecutingAgency",
    "originalCharge",
    "disposition",
    "verifiedCriminalHistory",
    "agencyCustodianList",
    "stipulationStatus"
  ],
  multiple_records_multiple_courts: [
    "petitionerName",
    "dateOfBirth",
    "county",
    "caseNumber",
    "disposition",
    "verifiedCriminalHistory",
    "agencyCustodianList"
  ],
  deferred_judgment_dismissal: [
    "petitionerName",
    "dateOfBirth",
    "county",
    "courtType",
    "caseNumber",
    "originalCharge",
    "disposition",
    "deferredOrSpecialtyCompletion"
  ],
  probation_specialty_dismissal: [
    "petitionerName",
    "dateOfBirth",
    "county",
    "courtType",
    "caseNumber",
    "originalCharge",
    "disposition",
    "deferredOrSpecialtyCompletion",
    "probationParoleDischargeDate"
  ],
  reentry_program_sealing: [
    "petitionerName",
    "dateOfBirth",
    "county",
    "caseNumber",
    "originalCharge",
    "convictionCategory",
    "reentryProgramCompletion",
    "excludedOffenseCheck"
  ],
  decriminalized_offense: [
    "petitionerName",
    "dateOfBirth",
    "county",
    "courtType",
    "caseNumber",
    "originalCharge",
    "decriminalizedOffenseBasis"
  ],
  controlled_substance_possession: [
    "petitionerName",
    "dateOfBirth",
    "county",
    "courtType",
    "caseNumber",
    "originalCharge",
    "disposition",
    "sentenceDate",
    "allTermsCompleted"
  ],
  trafficking_victim_vacatur: [
    "petitionerName",
    "dateOfBirth",
    "county",
    "caseNumber",
    "originalCharge",
    "disposition",
    "traffickingVictimFacts"
  ],
  favorable_disposition_repository_removal: [
    "petitionerName",
    "dateOfBirth",
    "arrestDate",
    "arrestingAgency",
    "originalCharge",
    "disposition",
    "verifiedCriminalHistory"
  ],
  needs_review: ["originalCharge", "disposition", "convictionCategory"]
};

export const nvFieldLabels: Record<NvDocumentFieldKey, string> = {
  petitionerName: "Petitioner full legal name",
  petitionerAliases: "Prior names / aliases",
  dateOfBirth: "Date of birth",
  currentAddress: "Current address",
  phoneEmail: "Phone / email",
  nevadaSidNumber: "Nevada SID number, if available",
  fbiNumber: "FBI number, if available",
  driversLicenseNumber: "Driver's license number, if traffic/DUI-related",
  county: "County",
  courtType: "Court type (district, justice, or municipal)",
  caseNumber: "Case number",
  arrestDate: "Arrest date",
  arrestingAgency: "Arresting agency",
  prosecutingAgency: "Prosecuting agency",
  originalCharge: "Original charge",
  finalCharge: "Final charge",
  disposition: "Disposition (dismissed, acquitted, declined, convicted, deferred, etc.)",
  convictionCategory:
    "Conviction category (Category A/B/C/D/E felony, gross misdemeanor, or misdemeanor)",
  sentenceDate: "Sentence date",
  releaseFromCustodyDate: "Release-from-custody date",
  probationParoleDischargeDate: "Probation / parole discharge date",
  suspendedSentenceEndDate: "Suspended-sentence end date",
  allTermsCompleted: "Whether the person completed all sentence terms",
  pendingChargesCheck: "Whether there are pending charges anywhere",
  newConvictionsDuringWaitingPeriod:
    "Whether there were new convictions during the waiting period (minor traffic excepted)",
  openWarrantCheck: "Whether any open warrant exists",
  verifiedCriminalHistory:
    "Current verified Nevada criminal-history report from the Central Repository",
  agencyCustodianList: "List of all agencies/custodians reasonably known to hold the records",
  excludedOffenseCheck:
    "Whether the offense is an NRS 179.245 exclusion (child victim, sex offense, home invasion w/ deadly weapon, felony DUI, DUI/vehicular homicide, felony BUI/boating DUI)",
  stipulationStatus: "Whether the prosecutor stipulates to sealing (NRS 179.255)",
  traffickingVictimFacts: "Facts establishing trafficking / involuntary servitude (NRS 179.247)",
  reentryProgramCompletion: "Reentry-program completion proof (NRS 179.259)",
  deferredOrSpecialtyCompletion:
    "Deferred-judgment or specialty-court completion / discharge proof",
  decriminalizedOffenseBasis: "Basis that the offense has been decriminalized (NRS 179.271)",
  feeWaiverRequest: "Whether a fee waiver is requested (if required locally)"
};
