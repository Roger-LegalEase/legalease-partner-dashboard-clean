import type { NdPathway } from "./pathways";

export type NdDocumentFieldKey =
  | "petitionerName"
  | "petitionerAliases"
  | "dateOfBirth"
  | "addressHistory"
  | "courtName"
  | "countyName"
  | "judicialDistrict"
  | "caseNumber"
  | "charge"
  | "statuteSection"
  | "offenseLevel"
  | "convictionDate"
  | "sentenceCompletionDate"
  | "restitutionStatus"
  | "newConvictionCheck"
  | "fullCriminalHistory"
  | "pendingCharges"
  | "priorReliefRequests"
  | "reasonsForSealing"
  | "rehabilitationEvidence"
  | "prosecutorOffice"
  | "serviceMethod"
  | "firstDuiDate"
  | "commercialDriverStatus"
  | "marijuanaAmount"
  | "firstOffenseStatus";

export const ndRequiredFields: Record<NdPathway, NdDocumentFieldKey[]> = {
  conviction_sealing_misdemeanor: [
    "petitionerName",
    "petitionerAliases",
    "addressHistory",
    "courtName",
    "countyName",
    "caseNumber",
    "charge",
    "statuteSection",
    "offenseLevel",
    "convictionDate",
    "sentenceCompletionDate",
    "restitutionStatus",
    "newConvictionCheck",
    "fullCriminalHistory",
    "pendingCharges",
    "priorReliefRequests",
    "reasonsForSealing",
    "rehabilitationEvidence",
    "prosecutorOffice",
    "serviceMethod"
  ],
  conviction_sealing_felony: [
    "petitionerName",
    "petitionerAliases",
    "addressHistory",
    "courtName",
    "countyName",
    "caseNumber",
    "charge",
    "statuteSection",
    "offenseLevel",
    "convictionDate",
    "sentenceCompletionDate",
    "restitutionStatus",
    "newConvictionCheck",
    "fullCriminalHistory",
    "pendingCharges",
    "priorReliefRequests",
    "reasonsForSealing",
    "rehabilitationEvidence",
    "prosecutorOffice",
    "serviceMethod"
  ],
  conviction_sealing_pardon_supported: [
    "petitionerName",
    "courtName",
    "countyName",
    "caseNumber",
    "charge",
    "convictionDate",
    "reasonsForSealing",
    "prosecutorOffice",
    "serviceMethod"
  ],
  nonconviction_closing_automatic: ["courtName", "countyName", "caseNumber", "charge"],
  nonconviction_closing_petition: [
    "petitionerName",
    "courtName",
    "countyName",
    "judicialDistrict",
    "caseNumber",
    "charge"
  ],
  dui_sealing: [
    "petitionerName",
    "courtName",
    "countyName",
    "caseNumber",
    "charge",
    "firstDuiDate",
    "newConvictionCheck",
    "commercialDriverStatus",
    "prosecutorOffice",
    "serviceMethod"
  ],
  deferred_imposition_dismissal: [
    "petitionerName",
    "courtName",
    "countyName",
    "caseNumber",
    "charge",
    "convictionDate"
  ],
  marijuana_first_offense_sealing: [
    "petitionerName",
    "courtName",
    "countyName",
    "caseNumber",
    "charge",
    "marijuanaAmount",
    "firstOffenseStatus",
    "convictionDate"
  ],
  marijuana_summary_pardon: ["petitionerName", "charge", "convictionDate", "newConvictionCheck"],
  trafficking_victim_vacatur: ["petitionerName", "courtName", "caseNumber", "charge"],
  juvenile_dna_unconstitutional: ["petitionerName", "courtName", "caseNumber", "charge"],
  needs_review: ["charge", "offenseLevel"]
};

export const ndFieldLabels: Record<NdDocumentFieldKey, string> = {
  petitionerName: "Petitioner full legal name",
  petitionerAliases: "All other legal names or aliases",
  dateOfBirth: "Date of birth",
  addressHistory: "Address history from offense date to petition date",
  courtName: "North Dakota court (municipal or district)",
  countyName: "County",
  judicialDistrict: "Judicial district",
  caseNumber: "Case number",
  charge: "Charge name",
  statuteSection: "N.D.C.C. section",
  offenseLevel: "Offense level (misdemeanor / felony / infraction / DUI)",
  convictionDate: "Conviction or judgment date",
  sentenceCompletionDate: "Sentence and probation completion date",
  restitutionStatus: "Restitution payment status",
  newConvictionCheck: "New-conviction check for the applicable waiting period",
  fullCriminalHistory:
    "Full criminal history (North Dakota, other states, federal court, and foreign countries)",
  pendingCharges: "All prior and pending charges",
  priorReliefRequests:
    "Prior pardon, expungement, sealing, or return-of-arrest-record requests in any forum",
  reasonsForSealing: "Reasons why sealing should be granted",
  rehabilitationEvidence: "Rehabilitation, employment, housing, school, or community-support evidence",
  prosecutorOffice: "Prosecuting attorney to serve",
  serviceMethod: "Service method",
  firstDuiDate: "First DUI violation date",
  commercialDriverStatus: "Commercial driver's license status",
  marijuanaAmount: "Amount of marijuana or THC",
  firstOffenseStatus: "First-offense status"
};
