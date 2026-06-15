import type { NmPathway } from "./pathways";

// Required-field keys derived from the New Mexico Expungement Reference for Wilma
// (the § 29-3A-4 / 29-3A-5 petition content requirements and the intake checklist
// in section 12). These describe the data each New Mexico pathway needs; they are
// not a field map to the official 4-95x PDFs (no PDF field map exists yet) and no
// renderer is wired.
export type NmDocumentFieldKey =
  | "petitionerName"
  | "petitionerAliases"
  | "dateOfBirth"
  | "currentAddress"
  | "addressAtIncident"
  | "phoneEmail"
  | "ssnLastFour"
  | "pictureId"
  | "driversLicenseNumber"
  | "county"
  | "judicialDistrict"
  | "courtName"
  | "caseNumber"
  | "arrestDate"
  | "arrestingAgency"
  | "lawEnforcementCaseNumber"
  | "districtAttorney"
  | "originalCharge"
  | "finalCharge"
  | "disposition"
  | "finalDispositionDate"
  | "convictionFlag"
  | "convictionLevel"
  | "sentenceDate"
  | "sentenceCompletionDate"
  | "probationParoleCompletionDate"
  | "finesFeesPaid"
  | "restitutionStatus"
  | "newConvictionDuringWaitingPeriod"
  | "pendingChargesCheck"
  | "excludedOffenseCheck"
  | "cannabisChargeFlag"
  | "dwiFlag"
  | "identityTheftProof"
  | "justiceServedStatement"
  | "dpsRecordWithin90Days"
  | "certifiedDispositionForDna"
  | "feeWaiverRequest";

export const nmRequiredFields: Record<NmPathway, NmDocumentFieldKey[]> = {
  identity_theft: [
    "petitionerName",
    "dateOfBirth",
    "county",
    "judicialDistrict",
    "caseNumber",
    "arrestDate",
    "arrestingAgency",
    "originalCharge",
    "identityTheftProof"
  ],
  release_without_conviction: [
    "petitionerName",
    "petitionerAliases",
    "dateOfBirth",
    "currentAddress",
    "county",
    "judicialDistrict",
    "courtName",
    "caseNumber",
    "arrestDate",
    "arrestingAgency",
    "districtAttorney",
    "originalCharge",
    "disposition",
    "finalDispositionDate",
    "pendingChargesCheck",
    "dpsRecordWithin90Days",
    "feeWaiverRequest"
  ],
  conviction_expungement: [
    "petitionerName",
    "petitionerAliases",
    "dateOfBirth",
    "currentAddress",
    "county",
    "judicialDistrict",
    "courtName",
    "caseNumber",
    "arrestDate",
    "arrestingAgency",
    "districtAttorney",
    "originalCharge",
    "finalCharge",
    "convictionFlag",
    "convictionLevel",
    "sentenceDate",
    "sentenceCompletionDate",
    "finesFeesPaid",
    "restitutionStatus",
    "newConvictionDuringWaitingPeriod",
    "pendingChargesCheck",
    "excludedOffenseCheck",
    "justiceServedStatement",
    "feeWaiverRequest"
  ],
  cannabis_automatic: [
    "petitionerName",
    "dateOfBirth",
    "ssnLastFour",
    "county",
    "courtName",
    "caseNumber",
    "originalCharge",
    "cannabisChargeFlag",
    "disposition"
  ],
  cannabis_sentence_dismissal: [
    "petitionerName",
    "dateOfBirth",
    "county",
    "courtName",
    "caseNumber",
    "originalCharge",
    "cannabisChargeFlag",
    "convictionFlag",
    "sentenceDate"
  ],
  dna_expungement: [
    "petitionerName",
    "dateOfBirth",
    "caseNumber",
    "arrestDate",
    "originalCharge",
    "disposition",
    "certifiedDispositionForDna",
    "excludedOffenseCheck"
  ],
  needs_review: ["originalCharge", "disposition", "convictionLevel"]
};

export const nmFieldLabels: Record<NmDocumentFieldKey, string> = {
  petitionerName: "Petitioner full legal name",
  petitionerAliases: "Former names / aliases / nicknames",
  dateOfBirth: "Date of birth",
  currentAddress: "Current mailing address",
  addressAtIncident: "Address at time of incident, if known",
  phoneEmail: "Phone and email",
  ssnLastFour: "Last four digits of SSN (especially for the cannabis AOC request)",
  pictureId: "Picture ID",
  driversLicenseNumber: "Driver's license number, if a traffic/DWI/Motor Vehicle Code issue",
  county: "County",
  judicialDistrict: "Judicial district",
  courtName: "Court name (district, magistrate, metropolitan, or municipal)",
  caseNumber: "Case number",
  arrestDate: "Arrest date",
  arrestingAgency: "Arresting law-enforcement agency",
  lawEnforcementCaseNumber: "Law-enforcement agency case number",
  districtAttorney: "District attorney / prosecuting agency",
  originalCharge: "Original charge",
  finalCharge: "Final charge",
  disposition: "Disposition",
  finalDispositionDate: "Final disposition date",
  convictionFlag: "Whether there was a conviction",
  convictionLevel:
    "Conviction level (municipal ordinance, misdemeanor, 4th/3rd/2nd/1st-degree felony)",
  sentenceDate: "Sentence date",
  sentenceCompletionDate: "Sentence completion date (last completion in any jurisdiction)",
  probationParoleCompletionDate: "Probation / parole completion date",
  finesFeesPaid: "Whether fines/fees owed to the state were paid",
  restitutionStatus: "Whether victim restitution was ordered and completed",
  newConvictionDuringWaitingPeriod:
    "Whether any criminal conviction occurred during the applicable waiting period",
  pendingChargesCheck: "Whether any charge or proceeding is pending anywhere",
  excludedOffenseCheck:
    "Whether the offense is a § 29-3A-5 exclusion (child victim, great bodily harm/death, sex offense § 29-11A-3, embezzlement § 30-16-8, or DWI/DUI)",
  cannabisChargeFlag:
    "Whether the case involved cannabis, cannabis paraphernalia, or non-cannabis charges",
  dwiFlag: "Whether the case involved DWI/DUI (note the § 29-3A-2 arrest-records carve-outs)",
  identityTheftProof: "Proof the person is a victim of identity theft (§ 29-3A-3)",
  justiceServedStatement:
    "Statement explaining why justice will be served (court discretion under § 29-3A-5)",
  dpsRecordWithin90Days:
    "DPS record of arrest and prosecutions dated no earlier than 90 days before filing (§ 29-3A-4)",
  certifiedDispositionForDna:
    "Certified disposition or sworn affidavit supporting DNA expungement (§ 29-16-10)",
  feeWaiverRequest: "Whether an indigency / free-process request is made (Form 4-222 NMRA)"
};
