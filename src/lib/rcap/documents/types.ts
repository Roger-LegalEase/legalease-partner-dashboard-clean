export type RcapDocumentPacketStatus =
  | "draft_started"
  | "form_in_progress"
  | "saved_for_later"
  | "missing_information"
  | "ready_for_review"
  | "preview_generated"
  | "exported"
  | "blocked_review_required";

export const rcapReliefOutcomeValues = [
  "not_recorded",
  "filed_pending",
  "relief_granted",
  "relief_partially_granted",
  "relief_denied",
  "relief_unavailable",
  "withdrawn"
] as const;

export type RcapReliefOutcome = (typeof rcapReliefOutcomeValues)[number];

export type SourceDocumentPacketInput = {
  [key: string]: unknown;
  partnerSlug: string;
  intakeSessionId?: string;
  userId?: string;
  briefcaseId?: string;
  personId?: string;
  state?: string;
  county?: string;
  convictionLevel?: "misdemeanor" | "felony" | "unknown";
};

export type MississippiDocumentPacketInput = SourceDocumentPacketInput;
export type IllinoisDocumentPacketInput = SourceDocumentPacketInput & { remedyType?: "expungement" | "sealing" };
export type DcDocumentPacketInput = SourceDocumentPacketInput & {
  reliefTrack?: "automatic_expungement" | "automatic_sealing" | "actual_innocence_expungement" | "interests_of_justice_sealing" | "needs_review";
  prosecutorOffice?: "USAO" | "OAG" | "unknown";
  serviceMethod?: "email" | "mail" | "hand_delivery" | "unknown";
};
export type PennsylvaniaDocumentPacketInput = SourceDocumentPacketInput;
export type PennsylvaniaOffenseGrade = "summary" | "M3" | "M2" | "M1" | "F3_property" | "drug_felony" | "felony_other" | "unknown";
export type TexasHarrisDocumentPacketInput = SourceDocumentPacketInput;
export type TexasHarrisCourtType = "district" | "county_criminal" | "municipal_class_c" | "justice" | "unknown";
export type TexasHarrisDispositionRoute =
  | "acquittal_not_guilty"
  | "arrest_no_charge"
  | "dismissal_or_quashed"
  | "limitations_expired"
  | "pardon_actual_innocence"
  | "class_c_deferred_completed"
  | "deferred_adjudication_completed"
  | "eligible_conviction"
  | "first_offense_dwi"
  | "final_conviction"
  | "unknown";

export type RcapFilingNextStepsPacket = {
  title: string;
  plainText: string;
  filingLocation: string;
  filingMethod: string;
  requiredDocuments: string[];
  serviceAndCopies: string[];
  feeSummary: string[];
  courtContactOrLocationGuidance: string[];
  afterFiling: string[];
  trackingChecklist: string[];
  workflowGaps: string[];
  safetyDisclaimer: string;
};

export type RcapDocumentPacket = {
  id: string;
  partnerSlug: string;
  intakeSessionId?: string;
  userId?: string;
  briefcaseId?: string;
  personId?: string;
  state: string;
  county?: string;
  documentType?: string;
  pathway: string;
  status: RcapDocumentPacketStatus;
  reliefOutcome: RcapReliefOutcome;
  petitionerFirstName?: string;
  petitionerLastName?: string;
  petitionerCity?: string;
  petitionerCounty?: string;
  courtType?: string;
  courtCounty?: string;
  courtName?: string;
  jurisdiction?: string;
  causeNumber?: string;
  charge?: string;
  offenseDate?: string;
  arrestDate?: string;
  arrestingAgency?: string;
  agencyCaseNumber?: string;
  dispositionDate?: string;
  convictionDate?: string;
  sentenceCompletionDate?: string;
  hasZeroBalance?: boolean;
  hasCourtDocuments?: boolean;
  firstOffenderSignal?: boolean;
  nonTrafficSignal?: boolean;
  excludedOffenseScreening?: boolean;
  oneFelonyExpungementSignal?: boolean;
  needsRecordReview: boolean;
  generatedHtml: string;
  generatedPlainText: string;
  filingInstructions: string[];
  countyCourtInstructions: string[];
  filingNextStepsPacket: RcapFilingNextStepsPacket;
  missingFields: string[];
  safetyDisclaimer: string;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
};

export type RcapBriefcaseItemType = "intake_session" | "document_packet" | "filing_instruction_packet";

export type RcapBriefcaseItem = {
  id: string;
  userId?: string;
  partnerSlug: string;
  intakeSessionId?: string;
  documentPacketId?: string;
  itemType: RcapBriefcaseItemType;
  title: string;
  status: RcapDocumentPacketStatus | "in_progress";
  state?: string;
  county?: string;
  documentType?: string;
  lastOpenedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};
