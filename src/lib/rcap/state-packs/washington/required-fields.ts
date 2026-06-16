import type { WaPathway } from "./pathways";

// Required-field keys derived from the "Washington State Record Relief — Wilma Agent
// Training Reference" (the intake questions in section 14 and the route logic in
// sections 4–10). These describe the data each Washington pathway needs; they are
// not a field map to the official Washington Courts/WSP forms (no overlay is built
// and no renderer is wired).
export type WaDocumentFieldKey =
  | "petitionerName"
  | "formerNamesAliases"
  | "dateOfBirth"
  | "mailingAddress"
  | "phoneEmail"
  | "courtType"
  | "county"
  | "caseNumber"
  | "chargeAndRcw"
  | "offenseClass"
  | "disposition"
  | "sentencingDate"
  | "releaseFromConfinementDate"
  | "supervisionEndDate"
  | "sentenceTermsComplete"
  | "restitutionToVictim"
  | "pendingChargesCheck"
  | "newConvictionLookback"
  | "duiPriorOffenseCheck"
  | "violentOrBarredOffenseCheck"
  | "protectionOrderCheck"
  | "domesticViolenceFacts"
  | "certificateOfDischarge"
  | "blakeStatuteCheck"
  | "lfoPaidForRefund"
  | "cannabisAgeAndStatute"
  | "victimizationConnection"
  | "juvenileAgeTimingStatus"
  | "firearmRightsQuestion";

export const waRequiredFields: Record<WaPathway, WaDocumentFieldKey[]> = {
  misdemeanor_gross_misdemeanor_vacation: [
    "petitionerName",
    "courtType",
    "county",
    "caseNumber",
    "chargeAndRcw",
    "offenseClass",
    "sentencingDate",
    "releaseFromConfinementDate",
    "supervisionEndDate",
    "sentenceTermsComplete",
    "pendingChargesCheck",
    "newConvictionLookback",
    "duiPriorOffenseCheck",
    "violentOrBarredOffenseCheck",
    "protectionOrderCheck"
  ],
  felony_vacation: [
    "petitionerName",
    "county",
    "caseNumber",
    "chargeAndRcw",
    "offenseClass",
    "sentencingDate",
    "releaseFromConfinementDate",
    "supervisionEndDate",
    "certificateOfDischarge",
    "pendingChargesCheck",
    "newConvictionLookback",
    "violentOrBarredOffenseCheck",
    "duiPriorOffenseCheck"
  ],
  non_conviction_deletion: [
    "petitionerName",
    "dateOfBirth",
    "county",
    "caseNumber",
    "chargeAndRcw",
    "disposition",
    "pendingChargesCheck"
  ],
  blake_drug_possession_vacatur: [
    "petitionerName",
    "courtType",
    "county",
    "caseNumber",
    "chargeAndRcw",
    "blakeStatuteCheck",
    "lfoPaidForRefund"
  ],
  cannabis_misdemeanor_vacation: [
    "petitionerName",
    "courtType",
    "county",
    "caseNumber",
    "cannabisAgeAndStatute",
    "sentenceTermsComplete"
  ],
  victim_survivor_vacation: [
    "petitionerName",
    "county",
    "caseNumber",
    "chargeAndRcw",
    "offenseClass",
    "victimizationConnection",
    "pendingChargesCheck",
    "restitutionToVictim"
  ],
  juvenile_sealing: [
    "petitionerName",
    "dateOfBirth",
    "county",
    "caseNumber",
    "offenseClass",
    "juvenileAgeTimingStatus",
    "restitutionToVictim",
    "pendingChargesCheck"
  ],
  treaty_indian_fishing_vacation: [
    "petitionerName",
    "courtType",
    "county",
    "caseNumber",
    "chargeAndRcw",
    "disposition"
  ],
  needs_review: ["chargeAndRcw", "offenseClass", "disposition", "caseNumber"]
};

export const waFieldLabels: Record<WaDocumentFieldKey, string> = {
  petitionerName: "Full legal name",
  formerNamesAliases: "Former names and aliases",
  dateOfBirth: "Date of birth",
  mailingAddress: "Current mailing address",
  phoneEmail: "Phone and email",
  courtType: "Court that handled the case (district, municipal, superior, or juvenile)",
  county: "County",
  caseNumber: "Case number",
  chargeAndRcw: "Exact charge and RCW/statute",
  offenseClass: "Offense class (misdemeanor, gross misdemeanor, Class B felony, Class C felony, or other)",
  disposition: "Disposition (conviction, dismissal, acquittal, no-charge arrest, diversion/deferred prosecution, pending)",
  sentencingDate: "Sentencing date",
  releaseFromConfinementDate: "Release-from-confinement date",
  supervisionEndDate: "Date probation/supervision/community custody ended",
  sentenceTermsComplete: "Whether all sentence terms are complete, including treatment and required obligations",
  restitutionToVictim: "Whether restitution is owed to an individual victim",
  pendingChargesCheck: "Whether any charges are pending in Washington, another state, federal, or tribal court",
  newConvictionLookback: "Whether there were new convictions in the relevant 3-, 5-, or 10-year period",
  duiPriorOffenseCheck: "Whether the case was DUI, physical control, reckless/negligent driving tied to alcohol/drugs, or another prior offense",
  violentOrBarredOffenseCheck: "Whether the offense is violent, a crime against persons, sex/child-exploitation, obscenity, firearm/deadly-weapon-enhanced, or sexually motivated",
  protectionOrderCheck: "Whether a qualifying protection/no-contact/anti-harassment/civil restraining order or recent violation exists",
  domesticViolenceFacts: "Domestic violence specifics (notice to prosecutor, number of DV convictions, prior disclosure, 5-year completion)",
  certificateOfDischarge: "Certificate of Discharge (felony route, after RCW 9.94A.637 discharge)",
  blakeStatuteCheck: "Whether the conviction was simple possession under RCW 69.50.4013/69.50.4014, a predecessor, or a similar ordinance",
  lfoPaidForRefund: "Whether legal financial obligations were paid (for a Blake refund)",
  cannabisAgeAndStatute: "Whether the person was 21+ at the time and the cannabis statute/date qualifies",
  victimizationConnection: "Whether the offense was committed as a result of trafficking, sexual assault, domestic violence, coercion, or exploitation",
  juvenileAgeTimingStatus: "Juvenile age, timing, supervision status, registration status, and pending proceedings",
  firearmRightsQuestion: "Whether a separate firearm-rights restoration is needed"
};
