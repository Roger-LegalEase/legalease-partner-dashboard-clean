import type { WiPathway } from "./pathways";

// Required-field keys derived from the "Wisconsin Expungement — Wilma Agent Training
// Reference" (the record-request data in section 13 and the route logic in sections
// 4–10). These describe the data each Wisconsin pathway needs; they are not a field
// map to the official CR-266/CR-267/JD-1780/DJ-LE-250B forms (no overlay is built
// and no renderer is wired).
export type WiDocumentFieldKey =
  | "petitionerName"
  | "formerNamesAliases"
  | "dateOfBirth"
  | "county"
  | "circuitCourtCaseNumber"
  | "arrestDate"
  | "offenseDate"
  | "chargeAndStatute"
  | "offenseClass"
  | "maximumImprisonment"
  | "ageAtOffense"
  | "sentencingDate"
  | "expungementOrderedAtSentencing"
  | "sentenceType"
  | "sentenceCompletionDate"
  | "probationRevokedCheck"
  | "subsequentConvictionCheck"
  | "certificateOfDischargeStatus"
  | "dispositionForArrestEvent"
  | "allChargesClearedFromArrest"
  | "traffickingNexus"
  | "juvenileAgeAndDispositionStatus"
  | "districtAttorneyRecommendation"
  | "pardonStatus"
  | "feeNote";

export const wiRequiredFields: Record<WiPathway, WiDocumentFieldKey[]> = {
  adult_conviction_expungement_at_sentencing: [
    "petitionerName",
    "county",
    "circuitCourtCaseNumber",
    "chargeAndStatute",
    "offenseClass",
    "maximumImprisonment",
    "ageAtOffense",
    "sentencingDate",
    "expungementOrderedAtSentencing",
    "sentenceType",
    "sentenceCompletionDate",
    "probationRevokedCheck",
    "subsequentConvictionCheck",
    "certificateOfDischargeStatus"
  ],
  youthful_invasion_of_privacy_mandatory_expungement: [
    "petitionerName",
    "county",
    "circuitCourtCaseNumber",
    "chargeAndStatute",
    "ageAtOffense",
    "sentencingDate",
    "expungementOrderedAtSentencing",
    "sentenceCompletionDate"
  ],
  trafficking_victim_prostitution_relief: [
    "petitionerName",
    "county",
    "circuitCourtCaseNumber",
    "chargeAndStatute",
    "traffickingNexus",
    "districtAttorneyRecommendation"
  ],
  non_conviction_arrest_fingerprint_removal: [
    "petitionerName",
    "dateOfBirth",
    "county",
    "circuitCourtCaseNumber",
    "arrestDate",
    "dispositionForArrestEvent",
    "allChargesClearedFromArrest"
  ],
  juvenile_adjudication_expungement: [
    "petitionerName",
    "dateOfBirth",
    "county",
    "circuitCourtCaseNumber",
    "juvenileAgeAndDispositionStatus",
    "districtAttorneyRecommendation"
  ],
  pardon_rights_restoration: [
    "petitionerName",
    "county",
    "circuitCourtCaseNumber",
    "chargeAndStatute",
    "pardonStatus"
  ],
  needs_review: ["chargeAndStatute", "offenseClass", "sentencingDate", "circuitCourtCaseNumber"]
};

export const wiFieldLabels: Record<WiDocumentFieldKey, string> = {
  petitionerName: "Full legal name",
  formerNamesAliases: "Prior names and aliases",
  dateOfBirth: "Date of birth",
  county: "County",
  circuitCourtCaseNumber: "County and circuit court case number",
  arrestDate: "Arrest date",
  offenseDate: "Offense date",
  chargeAndStatute: "Exact charge and statute",
  offenseClass: "Offense class",
  maximumImprisonment: "Maximum possible imprisonment for the offense (must be 6 years or less for § 973.015)",
  ageAtOffense: "Age at the time of the offense (must be under 25 for § 973.015)",
  sentencingDate: "Sentencing date",
  expungementOrderedAtSentencing: "Whether the judge ordered expungement at sentencing (the make-or-break fact)",
  sentenceType: "Sentence type (probation, jail, prison, fine, restitution, community service, supervision)",
  sentenceCompletionDate: "Sentence completion date",
  probationRevokedCheck: "Whether probation was revoked",
  subsequentConvictionCheck: "Whether any subsequent conviction occurred before sentence completion",
  certificateOfDischargeStatus: "Whether DOC/the detaining authority sent the certificate of discharge to the clerk (probation/incarceration cases)",
  dispositionForArrestEvent: "Whether the case was dismissed, no-filed, or acquitted",
  allChargesClearedFromArrest: "Whether ALL charges from the arrest fingerprint event were cleared",
  traffickingNexus: "Whether the prostitution-related case was connected to trafficking, coercion, or exploitation",
  juvenileAgeAndDispositionStatus: "Whether the person is at least 17 and completed the dispositional order",
  districtAttorneyRecommendation: "District attorney recommendation, if required by local practice/form",
  pardonStatus: "Whether a Governor's pardon was issued (pardon is not expungement)",
  feeNote: "Fee note (verify CR-266 court-fee handling with the clerk; DOJ-CIB DJ-LE-250B has no fee)"
};
