import type { IllinoisPathway } from "./pathways";

export type IllinoisDocumentFieldKey =
  | "petitionerName"
  | "county"
  | "caseOrArrestNumber"
  | "charge"
  | "disposition"
  | "remedyType"
  | "courtType"
  | "arrestingAgency"
  | "arrestDate"
  | "dispositionDate"
  | "supervisionCompletedDate"
  | "qualifiedProbationCompletedDate"
  | "sentenceTerminationDate"
  | "excludedOffenseScreening"
  | "hasRapSheet";

export const illinoisRequiredFields: Record<IllinoisPathway, IllinoisDocumentFieldKey[]> = {
  expungement_non_conviction: ["petitionerName", "county", "charge", "disposition", "remedyType", "hasRapSheet"],
  expungement_supervision_or_qualified_probation: ["petitionerName", "county", "charge", "disposition", "remedyType", "supervisionCompletedDate", "hasRapSheet"],
  sealing_conviction: ["petitionerName", "county", "charge", "disposition", "remedyType", "sentenceTerminationDate", "excludedOffenseScreening", "hasRapSheet"],
  excluded_or_needs_review: ["county", "charge", "disposition", "excludedOffenseScreening"],
  needs_rap_sheet: ["hasRapSheet", "county", "charge", "disposition"],
  more_information_needed: ["county", "charge", "disposition"]
};

export const illinoisFieldLabels: Record<IllinoisDocumentFieldKey, string> = {
  petitionerName: "Petitioner name",
  county: "County where the arrest or charge happened",
  caseOrArrestNumber: "Court case number or arrest number, if known",
  charge: "Charge or case type",
  disposition: "How the case ended",
  remedyType: "Expungement or sealing path",
  courtType: "Circuit Court",
  arrestingAgency: "Arresting agency, if known",
  arrestDate: "Arrest date, if known",
  dispositionDate: "Disposition date, if known",
  supervisionCompletedDate: "Supervision completion date",
  qualifiedProbationCompletedDate: "Qualified probation completion date",
  sentenceTerminationDate: "Date the last part of the sentence was finished",
  excludedOffenseScreening: "Sealing exclusion review",
  hasRapSheet: "Illinois criminal history report / RAP sheet"
};
