import type { TexasHarrisPathway } from "./pathways";

export type TexasHarrisDocumentFieldKey =
  | "petitionerName"
  | "petitionerIdentifyingInformation"
  | "harrisCountyCourtSelection"
  | "caseNumber"
  | "arrestDate"
  | "arrestingAgency"
  | "charge"
  | "disposition"
  | "dispositionDate"
  | "statutoryRoute"
  | "waitingPeriodFacts"
  | "disqualifierChecks"
  | "agencyNoticeParties"
  | "verificationReady";

const expunctionBase: TexasHarrisDocumentFieldKey[] = [
  "petitionerName",
  "petitionerIdentifyingInformation",
  "harrisCountyCourtSelection",
  "arrestDate",
  "arrestingAgency",
  "charge",
  "disposition",
  "statutoryRoute",
  "agencyNoticeParties",
  "verificationReady"
];

const nondisclosureBase: TexasHarrisDocumentFieldKey[] = [
  "petitionerName",
  "petitionerIdentifyingInformation",
  "harrisCountyCourtSelection",
  "caseNumber",
  "charge",
  "disposition",
  "dispositionDate",
  "statutoryRoute",
  "waitingPeriodFacts",
  "disqualifierChecks",
  "agencyNoticeParties",
  "verificationReady"
];

export const texasHarrisRequiredFields: Record<TexasHarrisPathway, TexasHarrisDocumentFieldKey[]> = {
  expunction_acquittal_not_guilty: [...expunctionBase, "caseNumber", "dispositionDate"],
  expunction_arrest_no_charge: [...expunctionBase, "waitingPeriodFacts"],
  expunction_dismissal_or_quashed: [...expunctionBase, "caseNumber", "dispositionDate", "waitingPeriodFacts"],
  expunction_limitations_expired: [...expunctionBase, "waitingPeriodFacts"],
  expunction_pardon_actual_innocence: [...expunctionBase, "caseNumber", "dispositionDate"],
  expunction_class_c_deferred_completed: [...expunctionBase, "caseNumber", "dispositionDate", "waitingPeriodFacts"],
  nondisclosure_deferred_adjudication_completed: nondisclosureBase,
  nondisclosure_eligible_conviction: nondisclosureBase,
  nondisclosure_first_offense_dwi: nondisclosureBase,
  final_conviction_pardon_review: ["petitionerName", "petitionerIdentifyingInformation", "charge", "disposition", "disqualifierChecks"],
  more_information_needed: ["petitionerName", "charge", "disposition"]
};

export const texasHarrisFieldLabels: Record<TexasHarrisDocumentFieldKey, string> = {
  petitionerName: "Petitioner first and last name",
  petitionerIdentifyingInformation: "Petitioner identifying information",
  harrisCountyCourtSelection: "Harris County court type selection",
  caseNumber: "Case or cause number",
  arrestDate: "Arrest date",
  arrestingAgency: "Arresting agency",
  charge: "Charge/offense details",
  disposition: "Disposition details",
  dispositionDate: "Disposition date",
  statutoryRoute: "Texas statutory route/basis",
  waitingPeriodFacts: "Waiting-period facts",
  disqualifierChecks: "Disqualifier checks",
  agencyNoticeParties: "Agency/notice party list",
  verificationReady: "Signature and notary/verification readiness"
};
