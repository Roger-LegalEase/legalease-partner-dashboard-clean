import type { RcapIntakeSession } from "@/lib/rcap-intake/types";
import type { DcDocumentType } from "@/lib/rcap/state-packs/dc/document-types";
import type { DcDocumentFieldKey } from "@/lib/rcap/state-packs/dc/required-fields";
import type { DcEligibilitySignal, DcPathway, DcRemedyType } from "@/lib/rcap/state-packs/dc/pathways";
import type { RcapDocumentPacketStatus } from "@/lib/rcap/documents/mississippi/types";

export type DcReliefTrack =
  | "automatic_expungement"
  | "automatic_sealing"
  | "actual_innocence_expungement"
  | "interests_of_justice_sealing"
  | "needs_review";

export type DcConvictionLevel = "misdemeanor" | "felony" | "unknown";

export type DcDocumentPacketInput = {
  partnerSlug: string;
  intakeSessionId?: string;
  userId?: string;
  briefcaseId?: string;
  state?: string;
  county?: string;
  petitionerFirstName?: string;
  petitionerLastName?: string;
  caseNumber?: string;
  charge?: string;
  arrestingAgency?: string;
  offenseDate?: string;
  arrestDate?: string;
  disposition?: string;
  dispositionDate?: string;
  sentenceCompletionDate?: string;
  convictionLevel?: DcConvictionLevel;
  reliefTrack?: DcReliefTrack;
  prosecutorOffice?: "USAO" | "OAG" | "unknown";
  serviceMethod?: "email" | "mail" | "hand_delivery" | "unknown";
  hasMpdRecord?: boolean;
  hasCourtDisposition?: boolean;
  openOrPendingCharges?: boolean;
  masterGridGroupOneToThree?: boolean;
  automaticExcludedOffenseConcern?: boolean;
  decriminalizedLegalizedOrUnconstitutionalOffense?: boolean;
  marijuanaRelatedSignal?: boolean;
  actualInnocenceStatement?: string;
  interestsOfJusticeStatement?: string;
  motionArgument?: string;
  caseOutcome?: RcapIntakeSession["caseOutcome"];
  recordType?: RcapIntakeSession["recordType"];
};

export type DcMappedDocumentFields = DcDocumentPacketInput & {
  pathway: DcPathway;
  remedyType: DcRemedyType;
  documentTypes: DcDocumentType[];
  eligibilitySignal: DcEligibilitySignal;
  missingFields: DcDocumentFieldKey[];
  needsRecordReview: boolean;
};

export type DcDocumentGenerationResult = {
  state: "DC";
  remedyType: DcRemedyType;
  pathway: DcPathway;
  documentTypes: DcDocumentType[];
  eligibilitySignal: DcEligibilitySignal;
  status: RcapDocumentPacketStatus;
  missingFields: DcDocumentFieldKey[];
  draftTitle: string;
  draftHtml: string;
  draftPlainText: string;
  filingInstructions: string[];
  countyCourtInstructions: string[];
  safetyDisclaimer: string;
  nextStep: string;
  briefcaseItemTitle: string;
  fields: DcMappedDocumentFields;
};
