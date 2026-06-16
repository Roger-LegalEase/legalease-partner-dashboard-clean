import type { UtPathway } from "./pathways";

// Required-field keys derived from the "Utah Expungement Reference for Wilma"
// (the intake script in section 6 and the filing-packet checklist in section 10).
// These describe the data each Utah pathway needs; they are not a field map to any
// official PDF (no overlay is built and no renderer is wired).
export type UtDocumentFieldKey =
  | "petitionerName"
  | "formerNamesAliases"
  | "dateOfBirth"
  | "mailingAddress"
  | "phoneEmail"
  | "governmentId"
  | "fingerprints"
  | "filingCourt"
  | "county"
  | "caseNumber"
  | "chargeAndStatute"
  | "offenseLevel"
  | "disposition"
  | "convictionDate"
  | "releaseFromIncarcerationDate"
  | "probationCompletionDate"
  | "paroleCompletionDate"
  | "finesInterestPaid"
  | "restitutionPaid"
  | "bciCertificate"
  | "bciApplication"
  | "thirdPartyRelease"
  | "fullCriminalHistory"
  | "priorExpungements"
  | "pendingChargeCheck"
  | "pendingPleaInAbeyanceCheck"
  | "protectiveOrderCheck"
  | "victimIssue"
  | "trafficOffenseClass"
  | "trafficPendingCheck"
  | "cannabisMedicalCondition"
  | "cannabisFormAndAmount"
  | "juvenileCourtStatus"
  | "adultCriminalHistoryReport"
  | "vacaturOrder"
  | "pardonStatus"
  | "feeWaiverRequest"
  | "certifiedCopyRequest";

export const utRequiredFields: Record<UtPathway, UtDocumentFieldKey[]> = {
  automatic_clean_slate_expungement: [
    "petitionerName",
    "county",
    "caseNumber",
    "chargeAndStatute",
    "offenseLevel",
    "disposition",
    "finesInterestPaid",
    "restitutionPaid",
    "pendingChargeCheck",
    "priorExpungements"
  ],
  petition_certificate_conviction_expungement: [
    "petitionerName",
    "formerNamesAliases",
    "dateOfBirth",
    "mailingAddress",
    "phoneEmail",
    "governmentId",
    "fingerprints",
    "bciApplication",
    "bciCertificate",
    "filingCourt",
    "county",
    "caseNumber",
    "chargeAndStatute",
    "offenseLevel",
    "convictionDate",
    "releaseFromIncarcerationDate",
    "probationCompletionDate",
    "paroleCompletionDate",
    "finesInterestPaid",
    "restitutionPaid",
    "fullCriminalHistory",
    "priorExpungements",
    "pendingChargeCheck",
    "pendingPleaInAbeyanceCheck",
    "protectiveOrderCheck",
    "victimIssue",
    "feeWaiverRequest",
    "certifiedCopyRequest"
  ],
  petition_non_conviction_expungement: [
    "petitionerName",
    "dateOfBirth",
    "governmentId",
    "fingerprints",
    "bciApplication",
    "bciCertificate",
    "filingCourt",
    "county",
    "caseNumber",
    "chargeAndStatute",
    "disposition",
    "pendingChargeCheck",
    "pendingPleaInAbeyanceCheck",
    "protectiveOrderCheck"
  ],
  traffic_expungement: [
    "petitionerName",
    "county",
    "caseNumber",
    "trafficOffenseClass",
    "disposition",
    "trafficPendingCheck",
    "feeWaiverRequest"
  ],
  cannabis_possession_expungement: [
    "petitionerName",
    "county",
    "caseNumber",
    "chargeAndStatute",
    "convictionDate",
    "cannabisMedicalCondition",
    "cannabisFormAndAmount",
    "feeWaiverRequest"
  ],
  pardon_based_expungement: [
    "petitionerName",
    "county",
    "chargeAndStatute",
    "convictionDate",
    "pardonStatus"
  ],
  juvenile_expungement: [
    "petitionerName",
    "dateOfBirth",
    "juvenileCourtStatus",
    "adultCriminalHistoryReport"
  ],
  vacatur_trafficking_expungement: [
    "petitionerName",
    "county",
    "caseNumber",
    "chargeAndStatute",
    "vacaturOrder",
    "bciApplication",
    "fingerprints"
  ],
  needs_review: ["chargeAndStatute", "offenseLevel", "disposition", "caseNumber"]
};

export const utFieldLabels: Record<UtDocumentFieldKey, string> = {
  petitionerName: "Full legal name",
  formerNamesAliases: "Former names and aliases",
  dateOfBirth: "Date of birth",
  mailingAddress: "Current mailing address",
  phoneEmail: "Phone and email",
  governmentId: "Government-issued identification",
  fingerprints: "Fingerprints (required by BCI even if already on file)",
  filingCourt: "Court where the criminal case was filed (or district court of the county of arrest if no charges were filed)",
  county: "County",
  caseNumber: "Case number",
  chargeAndStatute: "Charge name and Utah Code section",
  offenseLevel: "Offense level (felony / Class A / B / C misdemeanor / infraction / traffic / DUI)",
  disposition: "Final disposition (convicted / acquitted / dismissed with or without prejudice / plea in abeyance / no charges / vacated)",
  convictionDate: "Conviction date, if any",
  releaseFromIncarcerationDate: "Release-from-incarceration date",
  probationCompletionDate: "Probation completion date",
  paroleCompletionDate: "Parole completion date",
  finesInterestPaid: "Whether all court-ordered fines and interest are paid",
  restitutionPaid: "Whether restitution is paid",
  bciCertificate: "BCI Certificate of Eligibility or Special Certificate (valid 180 days)",
  bciApplication: "BCI Application for Certificate of Eligibility",
  thirdPartyRelease: "Third-party release, if someone else should receive the certificate",
  fullCriminalHistory: "Full criminal-history information, including other states and prior expungements",
  priorExpungements: "Prior expungements",
  pendingChargeCheck: "Whether any misdemeanor or felony case is pending",
  pendingPleaInAbeyanceCheck: "Whether any plea in abeyance is pending",
  protectiveOrderCheck: "Whether a criminal protective order or stalking injunction is in effect",
  victimIssue: "Whether there is a victim (prosecutor/victim notice and objection windows)",
  trafficOffenseClass: "Traffic offense classification (Class C misdemeanor/infraction or Class B misdemeanor)",
  trafficPendingCheck: "Confirmation of no pending traffic case, no pending traffic plea in abeyance, and not on traffic probation",
  cannabisMedicalCondition: "Qualifying medical condition at the time of the cannabis case",
  cannabisFormAndAmount: "Form and amount of cannabis tied to medicinal treatment of the condition",
  juvenileCourtStatus: "Whether the matter was handled in juvenile court",
  adultCriminalHistoryReport: "Adult Utah criminal-history report required by the juvenile court",
  vacaturOrder: "Vacatur order and supporting trafficking/survivor documentation",
  pardonStatus: "Whether a pardon/Board of Pardons route has been pursued or granted",
  feeWaiverRequest: "Whether a court fee waiver is requested",
  certifiedCopyRequest: "Certified-copy request within 28 days after the order is granted"
};
