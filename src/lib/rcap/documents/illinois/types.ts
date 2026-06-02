import type { RcapIntakeSession } from "@/lib/rcap-intake/types";
import type { IllinoisDocumentType } from "@/lib/rcap/state-packs/illinois/document-types";
import type { IllinoisDocumentFieldKey } from "@/lib/rcap/state-packs/illinois/required-fields";
import type { IllinoisEligibilitySignal, IllinoisPathway, IllinoisRemedyType } from "@/lib/rcap/state-packs/illinois/pathways";
import type { RcapDocumentPacketStatus } from "@/lib/rcap/documents/mississippi/types";

export type IllinoisDocumentPacketInput = {
  partnerSlug: string;
  intakeSessionId?: string;
  userId?: string;
  briefcaseId?: string;
  state?: string;
  county?: string;
  courtType?: string;
  cookCountyDistrict?: string;
  caseOrArrestNumber?: string;
  arrestingAgency?: string;
  arrestDate?: string;
  charge?: string;
  disposition?: string;
  dispositionDate?: string;
  supervisionCompletedDate?: string;
  qualifiedProbationCompletedDate?: string;
  sentenceTerminationDate?: string;
  educationWaiverSignal?: boolean;
  cannabisSignal?: boolean;
  excludedOffenseSignal?: boolean;
  hasRapSheet?: boolean;
  needsRapSheet?: boolean;
  feeWaiverRequested?: boolean;
  petitionerFirstName?: string;
  petitionerLastName?: string;
  otherNamesUsed?: string;
  remedyType?: IllinoisRemedyType;
  caseOutcome?: RcapIntakeSession["caseOutcome"];
  recordType?: RcapIntakeSession["recordType"];
};

export type IllinoisMappedDocumentFields = IllinoisDocumentPacketInput & {
  pathway: IllinoisPathway;
  remedyType: IllinoisRemedyType;
  documentTypes: IllinoisDocumentType[];
  eligibilitySignal: IllinoisEligibilitySignal;
  missingFields: IllinoisDocumentFieldKey[];
  needsRecordReview: boolean;
};

export type IllinoisDocumentGenerationResult = {
  state: "IL";
  remedyType: IllinoisRemedyType;
  pathway: IllinoisPathway;
  documentTypes: IllinoisDocumentType[];
  eligibilitySignal: IllinoisEligibilitySignal;
  status: RcapDocumentPacketStatus;
  missingFields: IllinoisDocumentFieldKey[];
  draftTitle: string;
  draftHtml: string;
  draftPlainText: string;
  filingInstructions: string[];
  countyCourtInstructions: string[];
  safetyDisclaimer: string;
  nextStep: string;
  briefcaseItemTitle: string;
  fields: IllinoisMappedDocumentFields;
};
