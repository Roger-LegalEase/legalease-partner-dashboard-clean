import type { RcapIntakeSession } from "@/lib/rcap-intake/types";
import type { MississippiDocumentType } from "@/lib/rcap/state-packs/mississippi/document-types";
import type { MississippiDocumentFieldKey } from "@/lib/rcap/state-packs/mississippi/required-fields";
import type { MississippiEligibilitySignal, MississippiPathway } from "@/lib/rcap/state-packs/mississippi/pathways";

export type RcapDocumentPacketStatus =
  | "draft_started"
  | "form_in_progress"
  | "saved_for_later"
  | "missing_information"
  | "ready_for_review"
  | "preview_generated"
  | "exported"
  | "blocked_review_required";

export type MississippiDocumentPacketInput = {
  partnerSlug: string;
  intakeSessionId?: string;
  userId?: string;
  briefcaseId?: string;
  state?: string;
  county?: string;
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
  dispositionType?: string;
  dispositionDate?: string;
  convictionDate?: string;
  sentenceCompletionDate?: string;
  hasZeroBalance?: boolean;
  hasCourtDocuments?: boolean;
  firstOffenderSignal?: boolean;
  nonTrafficSignal?: boolean;
  excludedOffenseScreening?: boolean;
  oneFelonyExpungementSignal?: boolean;
  petitionerFirstName?: string;
  petitionerLastName?: string;
  petitionerCity?: string;
  petitionerCounty?: string;
  caseOutcome?: RcapIntakeSession["caseOutcome"];
  recordType?: RcapIntakeSession["recordType"];
  convictionLevel?: "misdemeanor" | "felony" | "unknown";
};

export type MississippiMappedDocumentFields = MississippiDocumentPacketInput & {
  pathway: MississippiPathway;
  documentType?: MississippiDocumentType;
  eligibilitySignal: MississippiEligibilitySignal;
  missingFields: MississippiDocumentFieldKey[];
  needsRecordReview: boolean;
};

export type MississippiDocumentGenerationResult = {
  pathway: MississippiPathway;
  documentType?: MississippiDocumentType;
  eligibilitySignal: MississippiEligibilitySignal;
  status: RcapDocumentPacketStatus;
  missingFields: MississippiDocumentFieldKey[];
  draftTitle: string;
  draftHtml: string;
  draftPlainText: string;
  filingInstructions: string[];
  countyCourtInstructions: string[];
  safetyDisclaimer: string;
  nextStep: string;
  briefcaseItemTitle: string;
  fields: MississippiMappedDocumentFields;
};

export type RcapDocumentPacket = {
  id: string;
  partnerSlug: string;
  intakeSessionId?: string;
  userId?: string;
  briefcaseId?: string;
  state: "MS";
  county?: string;
  documentType?: MississippiDocumentType;
  pathway: MississippiPathway;
  status: RcapDocumentPacketStatus;
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
  missingFields: MississippiDocumentFieldKey[];
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
  documentType?: MississippiDocumentType;
  lastOpenedAt?: string;
  createdAt?: string;
  updatedAt?: string;
};
