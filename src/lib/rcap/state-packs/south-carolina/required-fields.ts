import type { ScPathway } from "./pathways";

// Required-field keys derived from the "South Carolina Expungement — Wilma Agent
// Training Reference" (the intake/record-request list in section 12 and the
// route-specific conditions in sections 4-9 and 14). These describe the data each
// South Carolina pathway needs; they are not a field map to the SCCA PDF forms (no
// field map is wired here) and no renderer is wired. Supporting form-field detail
// for the SCCA 223-series lives in the south-carolina-* field-map drafts.
export type ScDocumentFieldKey =
  | "petitionerName"
  | "priorNames"
  | "dateOfBirth"
  | "mailingAddress"
  | "phoneEmail"
  | "courtLevel"
  | "county"
  | "courtName"
  | "solicitorOffice"
  | "caseNumber"
  | "arrestDate"
  | "chargeDate"
  | "originalCharge"
  | "finalCharge"
  | "chargeAndStatute"
  | "dispositionType"
  | "fingerprintedFlag"
  | "dismissedAsPartOfPleaFlag"
  | "preliminaryHearingDismissalFlag"
  | "relatedPendingChargesCheck"
  | "convictionDate"
  | "sentenceCompletionDate"
  | "probationParoleCompletionDate"
  | "finesRestitutionFeesPaid"
  | "priorConvictionHistory"
  | "laterConvictionsCheck"
  | "pendingChargesCheck"
  | "priorRouteUsedFlag"
  | "programName"
  | "programCompletionStatus"
  | "ageAtArrest"
  | "motorVehicleOffenseFlag"
  | "domesticViolenceFlag"
  | "violentOffenseFlag"
  | "sexOffenderRegistrationFlag"
  | "firearmWeaponFlag"
  | "drugOffenseType"
  | "felonyMisdemeanorClassification"
  | "youthfulOffenderSentenceFlag"
  | "oldHandgunPreCarryFlag"
  | "traffickingConnectionFlag"
  | "juvenileMatterType"
  | "sledRapSheet"
  | "certifiedDisposition"
  | "feeWaiverRequest";

export const scRequiredFields: Record<ScPathway, ScDocumentFieldKey[]> = {
  summary_court_non_conviction: [
    "petitionerName",
    "dateOfBirth",
    "county",
    "courtName",
    "caseNumber",
    "chargeAndStatute",
    "dispositionType",
    "fingerprintedFlag",
    "preliminaryHearingDismissalFlag",
    "relatedPendingChargesCheck",
    "sledRapSheet",
    "certifiedDisposition"
  ],
  general_sessions_non_conviction: [
    "petitionerName",
    "dateOfBirth",
    "county",
    "solicitorOffice",
    "caseNumber",
    "chargeAndStatute",
    "dispositionType",
    "dismissedAsPartOfPleaFlag",
    "relatedPendingChargesCheck",
    "sledRapSheet",
    "certifiedDisposition"
  ],
  pretrial_intervention_completion: [
    "petitionerName",
    "county",
    "solicitorOffice",
    "caseNumber",
    "chargeAndStatute",
    "programName",
    "programCompletionStatus",
    "sledRapSheet"
  ],
  alcohol_education_program: [
    "petitionerName",
    "county",
    "solicitorOffice",
    "caseNumber",
    "chargeAndStatute",
    "ageAtArrest",
    "programName",
    "programCompletionStatus",
    "priorConvictionHistory",
    "sledRapSheet"
  ],
  traffic_education_program: [
    "petitionerName",
    "county",
    "solicitorOffice",
    "caseNumber",
    "chargeAndStatute",
    "programName",
    "programCompletionStatus",
    "sledRapSheet"
  ],
  conditional_discharge_drug: [
    "petitionerName",
    "courtLevel",
    "county",
    "courtName",
    "caseNumber",
    "chargeAndStatute",
    "drugOffenseType",
    "priorConvictionHistory",
    "programCompletionStatus",
    "priorRouteUsedFlag",
    "sledRapSheet"
  ],
  fraudulent_check_first_offense: [
    "petitionerName",
    "county",
    "courtName",
    "caseNumber",
    "chargeAndStatute",
    "convictionDate",
    "felonyMisdemeanorClassification",
    "priorConvictionHistory",
    "laterConvictionsCheck",
    "priorRouteUsedFlag",
    "sledRapSheet"
  ],
  first_low_level_conviction: [
    "petitionerName",
    "county",
    "courtName",
    "caseNumber",
    "chargeAndStatute",
    "convictionDate",
    "motorVehicleOffenseFlag",
    "domesticViolenceFlag",
    "priorConvictionHistory",
    "laterConvictionsCheck",
    "pendingChargesCheck",
    "priorRouteUsedFlag",
    "sledRapSheet"
  ],
  youthful_offender_act: [
    "petitionerName",
    "county",
    "courtName",
    "caseNumber",
    "chargeAndStatute",
    "youthfulOffenderSentenceFlag",
    "sentenceCompletionDate",
    "probationParoleCompletionDate",
    "laterConvictionsCheck",
    "motorVehicleOffenseFlag",
    "violentOffenseFlag",
    "sexOffenderRegistrationFlag",
    "sledRapSheet"
  ],
  drug_conviction_route: [
    "petitionerName",
    "county",
    "courtName",
    "caseNumber",
    "drugOffenseType",
    "felonyMisdemeanorClassification",
    "convictionDate",
    "sentenceCompletionDate",
    "priorConvictionHistory",
    "laterConvictionsCheck",
    "sledRapSheet"
  ],
  failure_to_stop_blue_light: [
    "petitionerName",
    "county",
    "courtName",
    "caseNumber",
    "chargeAndStatute",
    "felonyMisdemeanorClassification",
    "sentenceCompletionDate",
    "finesRestitutionFeesPaid",
    "laterConvictionsCheck",
    "sledRapSheet"
  ],
  old_unlawful_handgun_possession: [
    "petitionerName",
    "county",
    "courtName",
    "caseNumber",
    "chargeAndStatute",
    "convictionDate",
    "oldHandgunPreCarryFlag",
    "priorRouteUsedFlag",
    "sledRapSheet"
  ],
  human_trafficking_survivor: [
    "petitionerName",
    "courtLevel",
    "county",
    "courtName",
    "caseNumber",
    "chargeAndStatute",
    "traffickingConnectionFlag",
    "sledRapSheet"
  ],
  juvenile_expungement: [
    "petitionerName",
    "dateOfBirth",
    "county",
    "courtName",
    "caseNumber",
    "juvenileMatterType",
    "dispositionType",
    "violentOffenseFlag",
    "laterConvictionsCheck",
    "pendingChargesCheck",
    "sledRapSheet"
  ],
  pardon_not_expungement: [
    "petitionerName",
    "chargeAndStatute",
    "convictionDate",
    "dispositionType"
  ],
  needs_review: [
    "chargeAndStatute",
    "dispositionType",
    "courtLevel",
    "convictionDate"
  ]
};

export const scFieldLabels: Record<ScDocumentFieldKey, string> = {
  petitionerName: "Full legal name",
  priorNames: "Any prior names or aliases",
  dateOfBirth: "Date of birth",
  mailingAddress: "Current mailing address",
  phoneEmail: "Phone and email",
  courtLevel: "Court level (summary/magistrate/municipal, General Sessions, or Family Court)",
  county: "County",
  courtName: "Court name",
  solicitorOffice: "Solicitor's Office for the circuit/county where the charge occurred",
  caseNumber: "Case number, if known",
  arrestDate: "Arrest date",
  chargeDate: "Charge date",
  originalCharge: "Original charge",
  finalCharge: "Final charge (offense pled to or convicted of)",
  chargeAndStatute: "Charge name and statute number",
  dispositionType:
    "Disposition (dismissed, nolle prossed, not guilty, acquitted, discharged, completed diversion, conditional discharge, guilty plea, conviction, YOA sentence, or pending)",
  fingerprintedFlag: "Whether the person was fingerprinted",
  dismissedAsPartOfPleaFlag:
    "Whether the dismissal/nolle was part of a plea arrangement involving a guilty plea on other charges",
  preliminaryHearingDismissalFlag: "Whether the dismissal happened at a preliminary hearing",
  relatedPendingChargesCheck:
    "Whether related charges from the same course of events are still pending in summary court or General Sessions",
  convictionDate: "Date of conviction",
  sentenceCompletionDate: "Date all sentence terms and conditions were completed",
  probationParoleCompletionDate: "Date probation and parole were completed",
  finesRestitutionFeesPaid: "Whether fines, restitution, and program fees are paid",
  priorConvictionHistory: "Prior conviction history (for first-offense / no-prior-conviction routes)",
  laterConvictionsCheck: "Whether there are any later convictions during the clean period",
  pendingChargesCheck: "Whether there are any pending charges",
  priorRouteUsedFlag: "Whether this once-only route was used before",
  programName: "Diversion program name (PTI, AEP, or TEP)",
  programCompletionStatus: "Whether the program was successfully completed",
  ageAtArrest: "Age at arrest (AEP requires at least 17 but under 21)",
  motorVehicleOffenseFlag: "Whether the offense involved operation of a motor vehicle",
  domesticViolenceFlag: "Whether the offense is a domestic-violence offense (and which degree)",
  violentOffenseFlag: "Whether the offense is a violent crime",
  sexOffenderRegistrationFlag: "Whether the offense triggers sex-offender registration",
  firearmWeaponFlag: "Whether the offense involved a firearm or weapon",
  drugOffenseType:
    "Exact drug offense type (simple possession, unlawful prescription drug, first-offense PWID, trafficking, distribution, manufacturing)",
  felonyMisdemeanorClassification: "Whether the offense is a felony or misdemeanor",
  youthfulOffenderSentenceFlag: "Whether the person was actually sentenced under the Youthful Offender Act",
  oldHandgunPreCarryFlag: "Whether the unlawful handgun possession conviction predates the Constitutional Carry Act (before March 7, 2024)",
  traffickingConnectionFlag:
    "Whether the charge was connected to trafficking, coercion, exploitation, or survival circumstances",
  juvenileMatterType:
    "Juvenile matter type (status offense, nonviolent offense, violent offense, dismissal, not guilty, or adjudication)",
  sledRapSheet: "SLED criminal-history report (rap sheet)",
  certifiedDisposition: "Certified disposition from the court",
  feeWaiverRequest: "Whether a fee waiver / indigency relief is requested"
};
