import type { MtPathway } from "./pathways";

// Required-field keys derived from the Montana Expungement Reference for Wilma
// (the misdemeanor filing checklist in sections 9 and 16, the marijuana packet,
// and the non-conviction removal list). These describe the data each Montana
// pathway needs; they are not a field map to the court packet PDFs/DOCX (no field
// map exists yet) and no renderer is wired.
export type MtDocumentFieldKey =
  | "petitionerName"
  | "mailingAddress"
  | "phoneEmail"
  | "filingCourt"
  | "convictionsToInclude"
  | "convictionCourt"
  | "county"
  | "chargeAndStatute"
  | "convictionDate"
  | "caseNumber"
  | "sentenceCompletionDate"
  | "finesRestitutionComplete"
  | "probationTreatmentJailComplete"
  | "pendingChargesCheck"
  | "newConvictionsInFiveYears"
  | "priorExpungementHistory"
  | "notPresumedOffenseFlag"
  | "victimIssue"
  | "prosecutorOfficesForService"
  | "crissRecord"
  | "finalJudgments"
  | "dispositionType"
  | "marijuanaRelatedFlag"
  | "sentenceCurrentOrCompleted"
  | "reliefRequestedMarijuana"
  | "deferredSentenceStatus"
  | "feeWaiverRequest";

export const mtRequiredFields: Record<MtPathway, MtDocumentFieldKey[]> = {
  misdemeanor_conviction_expungement: [
    "petitionerName",
    "mailingAddress",
    "phoneEmail",
    "filingCourt",
    "convictionsToInclude",
    "convictionCourt",
    "county",
    "chargeAndStatute",
    "convictionDate",
    "caseNumber",
    "sentenceCompletionDate",
    "finesRestitutionComplete",
    "probationTreatmentJailComplete",
    "pendingChargesCheck",
    "newConvictionsInFiveYears",
    "priorExpungementHistory",
    "notPresumedOffenseFlag",
    "victimIssue",
    "prosecutorOfficesForService",
    "crissRecord",
    "finalJudgments",
    "feeWaiverRequest"
  ],
  non_conviction_removal: [
    "petitionerName",
    "county",
    "convictionCourt",
    "caseNumber",
    "chargeAndStatute",
    "dispositionType",
    "crissRecord"
  ],
  deferred_sentence_dismissal: [
    "petitionerName",
    "county",
    "convictionCourt",
    "caseNumber",
    "chargeAndStatute",
    "deferredSentenceStatus",
    "crissRecord"
  ],
  marijuana_relief: [
    "petitionerName",
    "county",
    "convictionCourt",
    "caseNumber",
    "chargeAndStatute",
    "convictionDate",
    "marijuanaRelatedFlag",
    "sentenceCurrentOrCompleted",
    "reliefRequestedMarijuana",
    "crissRecord"
  ],
  felony_non_marijuana_unavailable: [
    "chargeAndStatute",
    "dispositionType",
    "deferredSentenceStatus"
  ],
  needs_review: ["chargeAndStatute", "dispositionType", "convictionDate"]
};

export const mtFieldLabels: Record<MtDocumentFieldKey, string> = {
  petitionerName: "Full legal name",
  mailingAddress: "Current mailing address",
  phoneEmail: "Phone and email",
  filingCourt: "District Court where the petition is filed",
  convictionsToInclude: "All misdemeanor convictions to include (once-in-a-lifetime — list all)",
  convictionCourt: "Court name for each conviction",
  county: "County",
  chargeAndStatute: "Charge name and statute number",
  convictionDate: "Approximate date of conviction",
  caseNumber: "Case number, if known",
  sentenceCompletionDate: "Date all sentence terms were completed",
  finesRestitutionComplete: "Whether fines/fees/restitution are paid",
  probationTreatmentJailComplete: "Whether probation, treatment, and jail are complete",
  pendingChargesCheck: "Any pending charges or open cases / current detention",
  newConvictionsInFiveYears:
    "Any new convictions (Montana/other state/federal) within five years after completing sentence terms",
  priorExpungementHistory: "Whether Montana misdemeanor expungement was ever successfully used before",
  notPresumedOffenseFlag:
    "Whether any conviction is in a not-presumed category (assault, PFMA, stalking, sexual assault, protective-order violation, DUI, DUI-enhanced)",
  victimIssue: "Whether any offense involved a victim",
  prosecutorOfficesForService:
    "All county attorney / city attorney offices that prosecuted the cases (for service)",
  crissRecord: "Montana DOJ CRISS criminal-history record",
  finalJudgments: "Final judgments from the original courts",
  dispositionType:
    "Disposition type (convicted, dismissed, acquitted, dropped, not filed, deferred prosecution, deferred sentence)",
  marijuanaRelatedFlag: "Whether the conviction was marijuana/cannabis-related",
  sentenceCurrentOrCompleted: "Whether the marijuana sentence is currently being served or completed",
  reliefRequestedMarijuana: "Marijuana relief requested (expungement, resentencing, or redesignation)",
  deferredSentenceStatus: "Whether the sentence was deferred and whether dismissal has been entered",
  feeWaiverRequest: "Whether a Statement of Inability to Pay Court Costs and Fees is filed"
};
