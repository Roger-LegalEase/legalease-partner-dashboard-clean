import type { PennsylvaniaPathway } from "./pathways";

export type PennsylvaniaDocumentFieldKey =
  | "petitionerName"
  | "county"
  | "docketNumber"
  | "charge"
  | "grade"
  | "disposition"
  | "dispositionDate"
  | "arrestDate"
  | "arrestingAgency"
  | "patchReport"
  | "restitutionStatus"
  | "waitingPeriod"
  | "excludedOffenseScreening"
  | "commonwealthService";

const baseFields: PennsylvaniaDocumentFieldKey[] = ["petitionerName", "county", "docketNumber", "charge", "disposition", "patchReport"];

export const pennsylvaniaRequiredFields: Record<PennsylvaniaPathway, PennsylvaniaDocumentFieldKey[]> = {
  expungement_non_conviction: [...baseFields, "arrestDate", "arrestingAgency", "commonwealthService"],
  expungement_no_disposition_18_months: [...baseFields, "arrestDate", "waitingPeriod", "commonwealthService"],
  expungement_summary_5_years: [...baseFields, "grade", "waitingPeriod", "commonwealthService"],
  expungement_ard: [...baseFields, "dispositionDate", "commonwealthService"],
  expungement_pardon: [...baseFields, "dispositionDate", "commonwealthService"],
  expungement_age_70: [...baseFields, "waitingPeriod", "commonwealthService"],
  expungement_deceased: [...baseFields, "waitingPeriod", "commonwealthService"],
  limited_access_misdemeanor: [...baseFields, "grade", "restitutionStatus", "waitingPeriod", "excludedOffenseScreening", "commonwealthService"],
  limited_access_property_felony: [...baseFields, "grade", "restitutionStatus", "waitingPeriod", "excludedOffenseScreening", "commonwealthService"],
  clean_slate_automatic_non_conviction: ["petitionerName", "county", "docketNumber", "charge", "disposition", "patchReport"],
  clean_slate_automatic_summary: ["petitionerName", "county", "docketNumber", "charge", "grade", "disposition", "patchReport", "waitingPeriod"],
  clean_slate_automatic_misdemeanor: ["petitionerName", "county", "docketNumber", "charge", "grade", "disposition", "patchReport", "waitingPeriod", "excludedOffenseScreening"],
  clean_slate_automatic_drug_felony: ["petitionerName", "county", "docketNumber", "charge", "grade", "disposition", "patchReport", "waitingPeriod", "excludedOffenseScreening"],
  excluded_or_needs_review: ["petitionerName", "county", "charge", "grade", "disposition", "patchReport", "excludedOffenseScreening"],
  more_information_needed: ["petitionerName", "county", "charge", "disposition", "patchReport"]
};

export const pennsylvaniaFieldLabels: Record<PennsylvaniaDocumentFieldKey, string> = {
  petitionerName: "Petitioner first and last name",
  county: "County where the case was heard",
  docketNumber: "Court docket number",
  charge: "Charge or statute description",
  grade: "Offense grade",
  disposition: "Disposition",
  dispositionDate: "Disposition or sentence completion date",
  arrestDate: "Arrest date",
  arrestingAgency: "Arresting agency",
  patchReport: "PATCH report or reason it is missing",
  restitutionStatus: "Victim restitution status",
  waitingPeriod: "Waiting-period information",
  excludedOffenseScreening: "Excluded-offense screening",
  commonwealthService: "Attorney for the Commonwealth / DA service information"
};
