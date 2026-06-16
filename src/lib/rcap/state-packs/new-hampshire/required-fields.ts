import type { NhPathway } from "./pathways";

// Required-field keys derived from the New Hampshire Expungement / Annulment
// Reference for Wilma (the filing-packet checklist in section 17 and the intake
// questions in section 13). These describe the data each New Hampshire pathway
// needs; they are not a field map to the NHJB form PDFs (no field map exists yet)
// and no renderer is wired.
export type NhDocumentFieldKey =
  | "petitionerName"
  | "dateOfBirth"
  | "mailingAddress"
  | "phoneEmail"
  | "court"
  | "countyOrLocation"
  | "caseNumber"
  | "chargeName"
  | "rsaStatute"
  | "offenseLevel"
  | "arrestDate"
  | "dispositionType"
  | "dispositionDate"
  | "convictionDate"
  | "sentenceTerms"
  | "sentenceCompletionDate"
  | "finesRestitutionProof"
  | "probationCompletionProof"
  | "otherConvictions"
  | "pendingChargesCheck"
  | "priorAnnulmentPetitionHistory"
  | "barredOffenseCheck"
  | "marijuanaAmountAndDate"
  | "dwiFlag"
  | "vacaturOrderAndDate"
  | "reasonForAnnulment"
  | "rehabilitationEvidence"
  | "feeWaiverRequest";

export const nhRequiredFields: Record<NhPathway, NhDocumentFieldKey[]> = {
  favorable_outcome_annulment: [
    "petitionerName",
    "dateOfBirth",
    "court",
    "countyOrLocation",
    "caseNumber",
    "chargeName",
    "rsaStatute",
    "dispositionType",
    "dispositionDate"
  ],
  vacated_conviction_annulment: [
    "petitionerName",
    "dateOfBirth",
    "court",
    "caseNumber",
    "chargeName",
    "rsaStatute",
    "vacaturOrderAndDate"
  ],
  conviction_annulment: [
    "petitionerName",
    "dateOfBirth",
    "mailingAddress",
    "court",
    "countyOrLocation",
    "caseNumber",
    "chargeName",
    "rsaStatute",
    "offenseLevel",
    "convictionDate",
    "sentenceTerms",
    "sentenceCompletionDate",
    "finesRestitutionProof",
    "otherConvictions",
    "pendingChargesCheck",
    "barredOffenseCheck",
    "priorAnnulmentPetitionHistory",
    "reasonForAnnulment",
    "rehabilitationEvidence",
    "feeWaiverRequest"
  ],
  marijuana_possession_annulment: [
    "petitionerName",
    "dateOfBirth",
    "court",
    "caseNumber",
    "chargeName",
    "arrestDate",
    "marijuanaAmountAndDate"
  ],
  dwi_annulment: [
    "petitionerName",
    "dateOfBirth",
    "court",
    "caseNumber",
    "chargeName",
    "rsaStatute",
    "convictionDate",
    "sentenceCompletionDate",
    "dwiFlag",
    "otherConvictions"
  ],
  out_of_state_federal_unavailable: ["chargeName", "rsaStatute", "dispositionType"],
  needs_review: ["chargeName", "rsaStatute", "dispositionType", "offenseLevel"]
};

export const nhFieldLabels: Record<NhDocumentFieldKey, string> = {
  petitionerName: "Full legal name",
  dateOfBirth: "Date of birth",
  mailingAddress: "Mailing address",
  phoneEmail: "Phone and email",
  court: "Court name (Circuit/District Division, Superior, etc.)",
  countyOrLocation: "County or court location",
  caseNumber: "Case number",
  chargeName: "Charge name",
  rsaStatute: "RSA statute number",
  offenseLevel: "Offense level (violation / Class B or A misdemeanor / Class B or A felony)",
  arrestDate: "Arrest date",
  dispositionType:
    "Final outcome (arrest only, dismissed, not prosecuted, not guilty, vacated conviction, conviction)",
  dispositionDate: "Disposition date",
  convictionDate: "Conviction date, if any",
  sentenceTerms: "Sentence terms",
  sentenceCompletionDate: "Date all sentence terms were completed",
  finesRestitutionProof: "Proof of payment of fines/restitution",
  probationCompletionProof: "Proof of probation completion",
  otherConvictions: "List of all other convictions (all must be eligible)",
  pendingChargesCheck: "Whether any criminal charges are pending now",
  priorAnnulmentPetitionHistory: "Whether a prior annulment petition was denied",
  barredOffenseCheck:
    "Whether the offense is barred (violent crime, felony obstruction of justice, or extended-term sentence)",
  marijuanaAmountAndDate:
    "Marijuana amount (3/4 ounce or less) and that the offense was before September 16, 2017 (RSA 651:5-b)",
  dwiFlag: "Whether the offense is DWI/DUI (special 10-year rule, RSA 265-A:21)",
  vacaturOrderAndDate: "The vacatur/reversal order and its date",
  reasonForAnnulment: "Reason for annulment (employment, housing, licensing, school, etc.)",
  rehabilitationEvidence: "Rehabilitation evidence",
  feeWaiverRequest: "Whether a fee waiver based on inability to pay is requested"
};
