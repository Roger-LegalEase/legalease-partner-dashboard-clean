import type { VtPathway } from "./pathways";

// Required-field keys derived from the "Vermont Expungement & Sealing — Wilma Agent
// Training Reference" (the intake questions in section 15 and the route logic in
// sections 4–13). These describe the data each Vermont pathway needs; they are not
// a field map to the official Vermont Judiciary PDFs (no overlay is built and no
// renderer is wired).
export type VtDocumentFieldKey =
  | "petitionerName"
  | "formerNamesAliases"
  | "dateOfBirth"
  | "mailingAddress"
  | "phoneEmail"
  | "ageAtOffense"
  | "filingCourt"
  | "county"
  | "docketNumber"
  | "offenseAndStatute"
  | "sameIncidentCharges"
  | "disposition"
  | "convictionDate"
  | "sentenceCompletionDate"
  | "restitutionSurchargesStatus"
  | "pendingChargesCheck"
  | "laterConvictionsCheck"
  | "conductNoLongerCriminal"
  | "qualifyingCrimeCheck"
  | "duiStatus"
  | "cdlStatus"
  | "listedCrimeHistory"
  | "rehabilitationEvidence"
  | "prosecutorStipulation"
  | "victimIssue"
  | "feeWaiverRequest";

export const vtRequiredFields: Record<VtPathway, VtDocumentFieldKey[]> = {
  adult_expungement_conduct_no_longer_criminal: [
    "petitionerName",
    "county",
    "filingCourt",
    "docketNumber",
    "offenseAndStatute",
    "conductNoLongerCriminal",
    "disposition",
    "convictionDate",
    "sentenceCompletionDate",
    "restitutionSurchargesStatus",
    "pendingChargesCheck"
  ],
  misdemeanor_sealing: [
    "petitionerName",
    "county",
    "filingCourt",
    "docketNumber",
    "offenseAndStatute",
    "qualifyingCrimeCheck",
    "convictionDate",
    "sentenceCompletionDate",
    "restitutionSurchargesStatus",
    "pendingChargesCheck",
    "prosecutorStipulation"
  ],
  felony_sealing: [
    "petitionerName",
    "county",
    "filingCourt",
    "docketNumber",
    "offenseAndStatute",
    "qualifyingCrimeCheck",
    "convictionDate",
    "sentenceCompletionDate",
    "restitutionSurchargesStatus",
    "pendingChargesCheck",
    "prosecutorStipulation"
  ],
  dui_sealing: [
    "petitionerName",
    "county",
    "filingCourt",
    "docketNumber",
    "offenseAndStatute",
    "duiStatus",
    "ageAtOffense",
    "cdlStatus",
    "sentenceCompletionDate",
    "restitutionSurchargesStatus",
    "pendingChargesCheck",
    "feeWaiverRequest"
  ],
  non_conviction_sealing: [
    "petitionerName",
    "county",
    "filingCourt",
    "docketNumber",
    "offenseAndStatute",
    "disposition",
    "prosecutorStipulation",
    "victimIssue"
  ],
  young_adult_18_21_sealing: [
    "petitionerName",
    "ageAtOffense",
    "county",
    "filingCourt",
    "docketNumber",
    "offenseAndStatute",
    "qualifyingCrimeCheck",
    "sentenceCompletionDate",
    "restitutionSurchargesStatus",
    "prosecutorStipulation"
  ],
  under_25_sealing: [
    "petitionerName",
    "ageAtOffense",
    "county",
    "filingCourt",
    "docketNumber",
    "offenseAndStatute",
    "sentenceCompletionDate",
    "listedCrimeHistory",
    "pendingChargesCheck",
    "rehabilitationEvidence"
  ],
  juvenile_sealing: [
    "petitionerName",
    "dateOfBirth",
    "county",
    "filingCourt",
    "docketNumber",
    "disposition",
    "sentenceCompletionDate",
    "listedCrimeHistory",
    "rehabilitationEvidence"
  ],
  needs_review: ["offenseAndStatute", "disposition", "docketNumber", "sentenceCompletionDate"]
};

export const vtFieldLabels: Record<VtDocumentFieldKey, string> = {
  petitionerName: "Full legal name",
  formerNamesAliases: "Former names and aliases",
  dateOfBirth: "Date of birth",
  mailingAddress: "Current mailing address",
  phoneEmail: "Phone and email",
  ageAtOffense: "Age when the offense happened",
  filingCourt: "Criminal Division of the Vermont Superior Court that handled the case",
  county: "County",
  docketNumber: "Docket number",
  offenseAndStatute: "Exact offense and Vermont statute",
  sameIncidentCharges: "Whether all charges arose from the same incident (one petition may cover them)",
  disposition: "Disposition (conviction / dismissed before trial / acquittal / no probable cause / never charged)",
  convictionDate: "Conviction date, if any",
  sentenceCompletionDate: "Date every part of the sentence was completed (probation, supervision, jail, fines, restitution, surcharges)",
  restitutionSurchargesStatus: "Whether restitution and surcharges are paid or waived",
  pendingChargesCheck: "Whether any criminal charges are pending anywhere in Vermont",
  laterConvictionsCheck: "Whether there have been any later convictions",
  conductNoLongerCriminal: "Whether the conviction was for conduct that is no longer a crime (e.g., certain cannabis conduct)",
  qualifyingCrimeCheck: "Whether the offense is within Vermont's qualifying-crime definition (not an excluded category)",
  duiStatus: "Whether the offense was a DUI",
  cdlStatus: "Whether the person holds a commercial driver's license or commercial permit",
  listedCrimeHistory: "Listed-crime conviction/adjudication history and any pending listed-crime proceeding",
  rehabilitationEvidence: "Rehabilitation evidence",
  prosecutorStipulation: "Whether the prosecutor (State's Attorney or Attorney General) would stipulate",
  victimIssue: "Whether there is a victim who must be notified",
  feeWaiverRequest: "Whether an Application to Waive Filing Fees and Service Costs is filed (DUI sealing fee)"
};
