import type { RcapIntakeSession } from "@/lib/rcap-intake/types";
import type { RcapDocumentPacketStatus, RcapFilingNextStepsPacket } from "@/lib/rcap/documents/mississippi/types";
import type { TexasHarrisDocumentType } from "@/lib/rcap/state-packs/texas-harris/document-types";
import type { TexasHarrisDocumentFieldKey } from "@/lib/rcap/state-packs/texas-harris/required-fields";
import type { TexasHarrisEligibilitySignal, TexasHarrisPathway, TexasHarrisRemedyType } from "@/lib/rcap/state-packs/texas-harris/pathways";

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

export type TexasHarrisCourtType = "district" | "county_criminal" | "municipal_class_c" | "justice" | "unknown";

export type TexasHarrisDocumentPacketInput = {
  partnerSlug: string;
  intakeSessionId?: string;
  userId?: string;
  briefcaseId?: string;
  state?: string;
  county?: string;
  courtType?: TexasHarrisCourtType;
  courtName?: string;
  caseNumber?: string;
  petitionerFirstName?: string;
  petitionerLastName?: string;
  petitionerAddress?: string;
  petitionerDateOfBirth?: string;
  petitionerDriverLicenseOrId?: string;
  petitionerSsnLastFour?: string;
  otherNamesUsed?: string;
  arrestDate?: string;
  arrestingAgency?: string;
  agencyCaseNumber?: string;
  charge?: string;
  statuteOrOffenseCode?: string;
  disposition?: string;
  dispositionDate?: string;
  dispositionRoute?: TexasHarrisDispositionRoute;
  statutoryRoute?: string;
  waitingPeriodFacts?: string;
  dpsCriminalHistoryReady?: boolean;
  certifiedDispositionReady?: boolean;
  noPendingCharges?: boolean;
  noDisqualifyingHistory?: boolean;
  disqualifierNotes?: string;
  harrisDaNotice?: boolean;
  includeHoustonPoliceDepartment?: boolean;
  additionalAgencies?: string[];
  verificationReady?: boolean;
  feeWaiverRequested?: boolean;
  caseOutcome?: RcapIntakeSession["caseOutcome"];
  recordType?: RcapIntakeSession["recordType"];
};

export type TexasHarrisMappedDocumentFields = TexasHarrisDocumentPacketInput & {
  pathway: TexasHarrisPathway;
  remedyType: TexasHarrisRemedyType;
  documentTypes: TexasHarrisDocumentType[];
  eligibilitySignal: TexasHarrisEligibilitySignal;
  missingFields: TexasHarrisDocumentFieldKey[];
  noticeParties: string[];
  needsRecordReview: boolean;
};

export type TexasHarrisDocumentGenerationResult = {
  state: "TX";
  county: "Harris";
  remedyType: TexasHarrisRemedyType;
  pathway: TexasHarrisPathway;
  documentTypes: TexasHarrisDocumentType[];
  eligibilitySignal: TexasHarrisEligibilitySignal;
  status: RcapDocumentPacketStatus;
  missingFields: TexasHarrisDocumentFieldKey[];
  draftTitle: string;
  draftHtml: string;
  draftPlainText: string;
  filingInstructions: string[];
  countyCourtInstructions: string[];
  filingNextStepsPacket: RcapFilingNextStepsPacket;
  safetyDisclaimer: string;
  nextStep: string;
  briefcaseItemTitle: string;
  fields: TexasHarrisMappedDocumentFields;
};
