import type { MnPathway } from "./pathways";

// Required-field keys derived from the Minnesota Expungement Reference for Wilma
// (the § 609A.03 petition content requirements, the intake script in section 10,
// and the filing-packet checklist in section 14). These describe the data each
// Minnesota pathway needs; they are not a field map to the EXP PDFs (no PDF field
// map exists yet) and no renderer is wired.
export type MnDocumentFieldKey =
  | "petitionerName"
  | "petitionerAliases"
  | "dateOfBirth"
  | "addressHistory"
  | "county"
  | "judicialDistrict"
  | "courtFileNumber"
  | "arrestingAgency"
  | "prosecutor"
  | "chargeStatutes"
  | "offenseLevel"
  | "finalDisposition"
  | "convictionDate"
  | "sentenceDischargeDate"
  | "restitutionStatus"
  | "probationStatus"
  | "newConvictionsSinceDischarge"
  | "pendingChargesCheck"
  | "cannabisRelatedFlag"
  | "mistakenIdentityFlag"
  | "registrationOffenseCheck"
  | "reasonForExpungement"
  | "rehabilitationEvidence"
  | "agencyAccessConcerns"
  | "agencyServiceList"
  | "victimNoticeIssue"
  | "feeWaiverRequest"
  | "proposedOrderForm";

export const mnRequiredFields: Record<MnPathway, MnDocumentFieldKey[]> = {
  arrest_record_destruction: [
    "petitionerName",
    "dateOfBirth",
    "arrestingAgency",
    "chargeStatutes",
    "finalDisposition",
    "newConvictionsSinceDischarge"
  ],
  mistaken_identity_automatic: [
    "petitionerName",
    "dateOfBirth",
    "county",
    "courtFileNumber",
    "chargeStatutes",
    "finalDisposition",
    "mistakenIdentityFlag"
  ],
  automatic_clean_slate: [
    "petitionerName",
    "dateOfBirth",
    "county",
    "courtFileNumber",
    "offenseLevel",
    "finalDisposition",
    "sentenceDischargeDate",
    "newConvictionsSinceDischarge",
    "pendingChargesCheck"
  ],
  cannabis_automatic: [
    "petitionerName",
    "dateOfBirth",
    "courtFileNumber",
    "chargeStatutes",
    "offenseLevel",
    "cannabisRelatedFlag",
    "finalDisposition"
  ],
  cannabis_board_review: [
    "petitionerName",
    "dateOfBirth",
    "courtFileNumber",
    "chargeStatutes",
    "offenseLevel",
    "cannabisRelatedFlag",
    "convictionDate"
  ],
  prosecutor_agreement: [
    "petitionerName",
    "county",
    "courtFileNumber",
    "chargeStatutes",
    "finalDisposition",
    "prosecutor",
    "victimNoticeIssue"
  ],
  petition_based_expungement: [
    "petitionerName",
    "petitionerAliases",
    "dateOfBirth",
    "addressHistory",
    "county",
    "judicialDistrict",
    "courtFileNumber",
    "arrestingAgency",
    "prosecutor",
    "chargeStatutes",
    "offenseLevel",
    "finalDisposition",
    "convictionDate",
    "sentenceDischargeDate",
    "restitutionStatus",
    "probationStatus",
    "newConvictionsSinceDischarge",
    "pendingChargesCheck",
    "registrationOffenseCheck",
    "reasonForExpungement",
    "rehabilitationEvidence",
    "agencyAccessConcerns",
    "agencyServiceList",
    "victimNoticeIssue",
    "feeWaiverRequest",
    "proposedOrderForm"
  ],
  needs_review: ["chargeStatutes", "offenseLevel", "finalDisposition"]
};

export const mnFieldLabels: Record<MnDocumentFieldKey, string> = {
  petitionerName: "Petitioner full legal name",
  petitionerAliases: "Prior names / aliases",
  dateOfBirth: "Date of birth",
  addressHistory: "Current address and prior addresses since the offense",
  county: "County of the case",
  judicialDistrict: "Judicial district",
  courtFileNumber: "Court file number",
  arrestingAgency: "Arresting agency",
  prosecutor: "Prosecutor's office",
  chargeStatutes: "Charge statute numbers",
  offenseLevel: "Offense level (petty misdemeanor / misdemeanor / gross misdemeanor / felony)",
  finalDisposition:
    "Final disposition (dismissed, acquitted, diversion, stay of adjudication, conviction, vacated, cannabis-related, etc.)",
  convictionDate: "Conviction date, if any",
  sentenceDischargeDate: "Sentence discharge date (full completion, not the conviction date)",
  restitutionStatus: "Restitution status",
  probationStatus: "Probation status / completion proof",
  newConvictionsSinceDischarge: "Whether there have been new convictions since discharge",
  pendingChargesCheck: "Whether any charges are pending now",
  cannabisRelatedFlag: "Whether the charge was related to cannabis, marijuana, or THC",
  mistakenIdentityFlag: "Whether the dismissal was due to mistaken identity (§ 609A.017)",
  registrationOffenseCheck:
    "Whether the conviction requires predatory/sex-offender registration under § 243.166 (barred)",
  reasonForExpungement:
    "Reason for expungement (employment, housing, school, licensing, immigration, family, etc.)",
  rehabilitationEvidence: "Rehabilitation evidence (for conviction petitions)",
  agencyAccessConcerns:
    "Whether DHS, DCYF, Department of Health, PELSB, licensing, or background-study access matters",
  agencyServiceList: "List of agencies to be served",
  victimNoticeIssue: "Whether victim notice applies (EXP103)",
  feeWaiverRequest: "Whether a filing-fee waiver is requested",
  proposedOrderForm: "Proposed order form (EXP105, EXP106, or EXP107)"
};
