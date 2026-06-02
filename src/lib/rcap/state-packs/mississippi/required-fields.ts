import type { MississippiPathway } from "./pathways";

export type MississippiDocumentFieldKey =
  | "petitionerName"
  | "county"
  | "courtType"
  | "causeNumber"
  | "charge"
  | "arrestDate"
  | "offenseDate"
  | "arrestingAgency"
  | "dispositionType"
  | "dispositionDate"
  | "convictionDate"
  | "firstOffenderSignal"
  | "nonTrafficSignal"
  | "sentenceCompletionDate"
  | "hasZeroBalance"
  | "excludedOffenseScreening"
  | "oneFelonyExpungementSignal"
  | "districtAttorneyNotice";

export const mississippiRequiredFields: Record<MississippiPathway, MississippiDocumentFieldKey[]> = {
  non_conviction: ["petitionerName", "county", "courtType", "causeNumber", "charge", "dispositionType", "dispositionDate"],
  misdemeanor_conviction: [
    "petitionerName",
    "county",
    "courtType",
    "causeNumber",
    "charge",
    "convictionDate",
    "firstOffenderSignal",
    "nonTrafficSignal",
    "sentenceCompletionDate",
    "hasZeroBalance"
  ],
  felony_conviction: [
    "petitionerName",
    "county",
    "courtType",
    "causeNumber",
    "charge",
    "convictionDate",
    "sentenceCompletionDate",
    "hasZeroBalance",
    "excludedOffenseScreening",
    "oneFelonyExpungementSignal",
    "districtAttorneyNotice"
  ],
  more_information_needed: ["county", "courtType", "causeNumber", "charge"]
};

export const mississippiFieldLabels: Record<MississippiDocumentFieldKey, string> = {
  petitionerName: "Petitioner name",
  county: "Court county",
  courtType: "Court type",
  causeNumber: "Cause or case number",
  charge: "Charge or case type",
  arrestDate: "Arrest date, if known",
  offenseDate: "Offense date, if known",
  arrestingAgency: "Arresting agency, if known",
  dispositionType: "How the case ended",
  dispositionDate: "Disposition date",
  convictionDate: "Conviction date",
  firstOffenderSignal: "Whether this was a first-offender misdemeanor",
  nonTrafficSignal: "Whether the misdemeanor was non-traffic",
  sentenceCompletionDate: "Date all sentence terms were completed",
  hasZeroBalance: "Whether fines, costs, fees, and restitution are paid",
  excludedOffenseScreening: "Felony excluded-offense review",
  oneFelonyExpungementSignal: "Whether this is the only felony expungement request",
  districtAttorneyNotice: "District attorney notice information"
};
