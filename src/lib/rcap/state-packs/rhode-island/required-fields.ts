import type { RiPathway } from "./pathways";

// Required-field keys derived from the "Rhode Island Expungement / Sealing
// Reference for Wilma" (the filing packet checklist in sections 9 and 13, plus
// the official Motion to Expunge or Seal Record / Affidavit fields described in
// section 5). These describe the data each Rhode Island pathway needs; they are
// not a finalized field map to the court-form PDFs (per-form review is still
// required) and no renderer is wired.
export type RiDocumentFieldKey =
  | "petitionerName"
  | "dateOfBirth"
  | "mailingAddress"
  | "phoneEmail"
  | "bciNumber"
  | "filingCourt"
  | "courtType"
  | "caseNumber"
  | "chargingPoliceDepartment"
  | "countNumber"
  | "chargeAndStatute"
  | "offenseLevel"
  | "dispositionType"
  | "convictionDate"
  | "sentenceCompletionDate"
  | "probationCompletionDate"
  | "sealOrExpungeSelection"
  | "firstOffenderStatus"
  | "crimeOfViolenceFlag"
  | "domesticViolenceDuiRefusalFlag"
  | "priorConvictionsOrProbation"
  | "misdemeanorCountForMultiplePath"
  | "lookbackArrestConvictionCheck"
  | "pendingProceedingCheck"
  | "financialObligationsStatus"
  | "goodMoralCharacter"
  | "deferredAgreementAndCompletion"
  | "filedComplaintStatus"
  | "domesticViolenceFilingThreeYearRule"
  | "marijuanaPossessionOnlyFlag"
  | "decriminalizedOffenseFlag"
  | "commercialSexualActivityFlag"
  | "noticeToAttorneyGeneral"
  | "noticeToChargingPolice"
  | "proposedOrderForHearing"
  | "certifiedOrderDeliveryPlan";

export const riRequiredFields: Record<RiPathway, RiDocumentFieldKey[]> = {
  first_offender_conviction_expungement: [
    "petitionerName",
    "dateOfBirth",
    "mailingAddress",
    "phoneEmail",
    "bciNumber",
    "filingCourt",
    "courtType",
    "caseNumber",
    "chargingPoliceDepartment",
    "countNumber",
    "chargeAndStatute",
    "offenseLevel",
    "convictionDate",
    "sentenceCompletionDate",
    "sealOrExpungeSelection",
    "firstOffenderStatus",
    "crimeOfViolenceFlag",
    "priorConvictionsOrProbation",
    "lookbackArrestConvictionCheck",
    "pendingProceedingCheck",
    "financialObligationsStatus",
    "goodMoralCharacter",
    "noticeToAttorneyGeneral",
    "noticeToChargingPolice",
    "proposedOrderForHearing",
    "certifiedOrderDeliveryPlan"
  ],
  multiple_misdemeanor_expungement: [
    "petitionerName",
    "dateOfBirth",
    "bciNumber",
    "filingCourt",
    "courtType",
    "caseNumber",
    "chargingPoliceDepartment",
    "chargeAndStatute",
    "offenseLevel",
    "sentenceCompletionDate",
    "sealOrExpungeSelection",
    "misdemeanorCountForMultiplePath",
    "priorConvictionsOrProbation",
    "domesticViolenceDuiRefusalFlag",
    "lookbackArrestConvictionCheck",
    "pendingProceedingCheck",
    "financialObligationsStatus",
    "goodMoralCharacter",
    "noticeToAttorneyGeneral",
    "noticeToChargingPolice",
    "proposedOrderForHearing",
    "certifiedOrderDeliveryPlan"
  ],
  deferred_sentence_expungement: [
    "petitionerName",
    "bciNumber",
    "filingCourt",
    "courtType",
    "caseNumber",
    "chargingPoliceDepartment",
    "chargeAndStatute",
    "offenseLevel",
    "sealOrExpungeSelection",
    "deferredAgreementAndCompletion",
    "crimeOfViolenceFlag",
    "financialObligationsStatus",
    "pendingProceedingCheck",
    "goodMoralCharacter",
    "noticeToAttorneyGeneral",
    "noticeToChargingPolice",
    "proposedOrderForHearing"
  ],
  non_conviction_sealing: [
    "petitionerName",
    "bciNumber",
    "filingCourt",
    "courtType",
    "caseNumber",
    "chargingPoliceDepartment",
    "chargeAndStatute",
    "dispositionType",
    "sealOrExpungeSelection",
    "noticeToAttorneyGeneral",
    "noticeToChargingPolice",
    "proposedOrderForHearing"
  ],
  filed_complaint_expungement: [
    "petitionerName",
    "bciNumber",
    "filingCourt",
    "courtType",
    "caseNumber",
    "chargingPoliceDepartment",
    "chargeAndStatute",
    "filedComplaintStatus",
    "domesticViolenceFilingThreeYearRule"
  ],
  marijuana_possession_automatic_expungement: [
    "petitionerName",
    "bciNumber",
    "filingCourt",
    "caseNumber",
    "chargeAndStatute",
    "offenseLevel",
    "convictionDate",
    "marijuanaPossessionOnlyFlag"
  ],
  decriminalized_offense_expungement: [
    "petitionerName",
    "bciNumber",
    "filingCourt",
    "courtType",
    "caseNumber",
    "chargeAndStatute",
    "convictionDate",
    "sentenceCompletionDate",
    "decriminalizedOffenseFlag",
    "financialObligationsStatus",
    "proposedOrderForHearing"
  ],
  commercial_sexual_activity_relief: [
    "petitionerName",
    "bciNumber",
    "filingCourt",
    "courtType",
    "caseNumber",
    "chargeAndStatute",
    "sentenceCompletionDate",
    "commercialSexualActivityFlag",
    "financialObligationsStatus",
    "proposedOrderForHearing"
  ],
  crime_of_violence_bar: [
    "chargeAndStatute",
    "offenseLevel",
    "dispositionType",
    "crimeOfViolenceFlag"
  ],
  needs_review: ["chargeAndStatute", "dispositionType", "offenseLevel", "convictionDate"]
};

export const riFieldLabels: Record<RiDocumentFieldKey, string> = {
  petitionerName: "Full legal name (defendant)",
  dateOfBirth: "Date of birth",
  mailingAddress: "Current mailing address",
  phoneEmail: "Phone and email",
  bciNumber: "BCI number (Bureau of Criminal Identification), if known",
  filingCourt: "Court where the case occurred / motion is filed",
  courtType: "Court type (District Court / Superior Court / Family Court)",
  caseNumber: "Case number",
  chargingPoliceDepartment: "Police department that brought the charge",
  countNumber: "Count number(s)",
  chargeAndStatute: "Charge name and statute, if known",
  offenseLevel: "Offense level (misdemeanor / felony / civil violation)",
  dispositionType:
    "Disposition (convicted / dismissed / acquitted / no true bill / no information / filed / deferred)",
  convictionDate: "Conviction date, if any",
  sentenceCompletionDate: "Sentence completion date",
  probationCompletionDate: "Probation completion date, if any",
  sealOrExpungeSelection: "Whether the filer is asking to SEAL or to EXPUNGE",
  firstOffenderStatus: "First-offender status (no prior felony/misdemeanor conviction or probation)",
  crimeOfViolenceFlag: "Whether the offense is a crime of violence (bar to conviction expungement)",
  domesticViolenceDuiRefusalFlag:
    "Whether any conviction is domestic violence (Title 12 ch. 29), DUI (§ 31-27-2), or chemical-test refusal (§ 31-27-2.1) — excluded from the multiple-misdemeanor path",
  priorConvictionsOrProbation: "Any prior conviction of, or probation for, a felony or misdemeanor",
  misdemeanorCountForMultiplePath:
    "Number of misdemeanor convictions (more than one but fewer than six; no felony) for the multiple-misdemeanor path",
  lookbackArrestConvictionCheck:
    "Any felony/misdemeanor arrest or conviction during the lookback period (5 years misdemeanor / 10 years felony / 10 years multiple-misdemeanor)",
  pendingProceedingCheck: "Whether any criminal proceeding is pending now",
  financialObligationsStatus:
    "Whether all fines, fees, costs, assessments, charges, and restitution are paid, waived, or reduced by court order",
  goodMoralCharacter: "Good moral character / rehabilitation showing",
  deferredAgreementAndCompletion:
    "Whether there was a written deferral agreement and a court finding of completion of all terms",
  filedComplaintStatus: "Whether the complaint was placed on file under § 12-10-12 and the filing-period status",
  domesticViolenceFilingThreeYearRule:
    "For a domestic-violence filing: whether any new DV charge occurred during the 3-year period after filing",
  marijuanaPossessionOnlyFlag:
    "Whether the offense was marijuana possession only (not intent to deliver, distribution, weapons, violence, or non-marijuana counts)",
  decriminalizedOffenseFlag: "Whether the offense was decriminalized after the date of conviction",
  commercialSexualActivityFlag:
    "Whether the offense is under § 11-34.1-2 or § 11-34.1-4 (commercial-sexual-activity relief, § 11-34.1-5)",
  noticeToAttorneyGeneral: "Notice of the hearing date to the Rhode Island Department of Attorney General (at least 10 days)",
  noticeToChargingPolice: "Notice of the hearing date to the charging police department (at least 10 days)",
  proposedOrderForHearing: "Proposed order to bring to the hearing",
  certifiedOrderDeliveryPlan:
    "Plan to deliver certified copies of the granted order to the Attorney General's BCI unit and the charging police department"
};
