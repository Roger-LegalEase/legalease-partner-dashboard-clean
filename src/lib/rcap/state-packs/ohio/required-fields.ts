import type { OhPathway } from "./pathways";

// Required-field keys derived from the Ohio Sealing & Expungement — Wilma Agent
// Training Reference (the record-request list in section 15 and the decision tree
// in section 17). These describe the data each Ohio pathway needs; they are not a
// field map to the court application PDFs (no field map exists yet) and no
// renderer is wired.
export type OhDocumentFieldKey =
  | "applicantName"
  | "priorNames"
  | "dateOfBirth"
  | "countyAndCourt"
  | "caseNumber"
  | "arrestDate"
  | "chargeAndStatute"
  | "finalDisposition"
  | "offenseDegree"
  | "convictionSentenceDate"
  | "finalDischargeDate"
  | "sentenceFinesPaid"
  | "supervisionCompletionDate"
  | "openWarrantsPendingCharges"
  | "multipleChargesSameIncident"
  | "victimAge"
  | "offenseFlagsScreen"
  | "sealingOrExpungementChoice"
  | "fullConvictionList"
  | "dismissalPrejudiceSolCheck"
  | "marijuanaDivisionAndAmount"
  | "traffickingFacts"
  | "biciRecordObtained"
  | "indigencyRequest";

export const ohRequiredFields: Record<OhPathway, OhDocumentFieldKey[]> = {
  adult_conviction_sealing_expungement: [
    "applicantName",
    "priorNames",
    "dateOfBirth",
    "countyAndCourt",
    "caseNumber",
    "chargeAndStatute",
    "finalDisposition",
    "offenseDegree",
    "convictionSentenceDate",
    "finalDischargeDate",
    "sentenceFinesPaid",
    "supervisionCompletionDate",
    "openWarrantsPendingCharges",
    "multipleChargesSameIncident",
    "victimAge",
    "offenseFlagsScreen",
    "sealingOrExpungementChoice",
    "fullConvictionList",
    "biciRecordObtained",
    "indigencyRequest"
  ],
  non_conviction_sealing_expungement: [
    "applicantName",
    "dateOfBirth",
    "countyAndCourt",
    "caseNumber",
    "chargeAndStatute",
    "finalDisposition",
    "dismissalPrejudiceSolCheck",
    "multipleChargesSameIncident",
    "openWarrantsPendingCharges",
    "biciRecordObtained"
  ],
  marijuana_hashish_expungement: [
    "applicantName",
    "dateOfBirth",
    "countyAndCourt",
    "caseNumber",
    "chargeAndStatute",
    "marijuanaDivisionAndAmount",
    "finalDisposition",
    "indigencyRequest"
  ],
  trafficking_survivor_conviction_expungement: [
    "applicantName",
    "dateOfBirth",
    "countyAndCourt",
    "caseNumber",
    "chargeAndStatute",
    "offenseDegree",
    "traffickingFacts"
  ],
  trafficking_survivor_non_conviction_expungement: [
    "applicantName",
    "dateOfBirth",
    "countyAndCourt",
    "caseNumber",
    "chargeAndStatute",
    "finalDisposition",
    "traffickingFacts"
  ],
  firearm_carry_expungement: [
    "applicantName",
    "dateOfBirth",
    "countyAndCourt",
    "caseNumber",
    "chargeAndStatute",
    "convictionSentenceDate",
    "indigencyRequest"
  ],
  prosecutor_low_level_controlled_substance: [
    "applicantName",
    "countyAndCourt",
    "caseNumber",
    "chargeAndStatute",
    "offenseDegree",
    "finalDischargeDate"
  ],
  juvenile_sealing_expungement: [
    "applicantName",
    "dateOfBirth",
    "countyAndCourt",
    "caseNumber",
    "chargeAndStatute",
    "finalDisposition"
  ],
  needs_review: ["chargeAndStatute", "finalDisposition", "offenseDegree"]
};

export const ohFieldLabels: Record<OhDocumentFieldKey, string> = {
  applicantName: "Full legal name",
  priorNames: "Prior names",
  dateOfBirth: "Date of birth",
  countyAndCourt: "County and court",
  caseNumber: "Case number",
  arrestDate: "Arrest date",
  chargeAndStatute: "Each charge and statute",
  finalDisposition: "Each final disposition",
  offenseDegree: "Offense degree (MM/M1-M4/F1-F5)",
  convictionSentenceDate: "Conviction / sentence date",
  finalDischargeDate: "Final discharge date",
  sentenceFinesPaid: "Whether all fines that are part of the sentence were paid",
  supervisionCompletionDate: "Probation, parole, or post-release-control completion date",
  openWarrantsPendingCharges: "Whether there are open warrants or pending charges",
  multipleChargesSameIncident: "Whether there are multiple charges from the same incident (§ 2953.61)",
  victimAge: "Victim age (offenses with a victim under 13 are excluded, except nonsupport § 2919.21)",
  offenseFlagsScreen:
    "Offense screen — violence, sex-offender registration, domestic violence, protection order, traffic/motor-vehicle, theft in office, F1/F2",
  sealingOrExpungementChoice: "Whether the applicant wants sealing or expungement",
  fullConvictionList: "Full list of Ohio, out-of-state, and federal convictions",
  dismissalPrejudiceSolCheck:
    "For dismissals: whether with or without prejudice and whether the statute of limitations has expired",
  marijuanaDivisionAndAmount:
    "The exact § 2925.11 division, substance, and amount (e.g., hashish not more than 15 grams) for § 2953.321",
  traffickingFacts: "Facts connecting the case to human trafficking (trauma-sensitive)",
  biciRecordObtained: "Whether the Ohio BCI criminal history has been obtained",
  indigencyRequest: "Whether an indigency fee waiver is requested"
};
