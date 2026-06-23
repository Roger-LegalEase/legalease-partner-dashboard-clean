export const rcapIntakeDisclaimer =
  "This tool does not provide legal advice and does not guarantee eligibility or outcomes.";

export type RcapIntakeStatus = "started" | "in_progress" | "completed" | "abandoned" | "needs_review";

export type RcapEligibilitySignal =
  | "possible_pathway"
  | "possible_expungement_path"
  | "possible_sealing_path"
  | "needs_rap_sheet"
  | "needs_more_information"
  | "likely_not_available"
  | "human_review_recommended"
  | "excluded_or_blocked_review_needed"
  | "future_eligibility_update";

export type RcapIntakeStepId =
  | "understand_goal"
  | "state"
  | "county"
  | "case_outcome"
  | "approximate_case_year"
  | "has_documents"
  | "needs_record_check"
  | "contact_information";

export type RcapRecordType =
  | "old_arrest"
  | "charged_not_convicted"
  | "past_conviction"
  | "not_sure_what_shows"
  | "background_check_concern";

export type RcapCaseOutcome =
  | "dismissed"
  | "not_prosecuted"
  | "convicted"
  | "completed_sentence"
  | "not_sure"
  | "no_charges_filed"
  | "not_guilty"
  | "court_supervision"
  | "qualified_probation";

export type RcapIntakeSession = {
  id: string;
  partnerSlug: string;
  partnerId?: string;
  status: RcapIntakeStatus;
  currentStep: RcapIntakeStepId | "completed";
  userFirstName?: string;
  userLastName?: string;
  userEmail?: string;
  userPhone?: string;
  personId?: string;
  state?: string;
  county?: string;
  recordType?: RcapRecordType;
  chargeOrCaseType?: string;
  caseOutcome?: RcapCaseOutcome;
  approximateCaseYear?: string;
  hasDocuments?: boolean;
  needsRecordCheck?: boolean;
  pathwaySummary?: string;
  suggestedNextStep?: string;
  eligibilitySignal?: RcapEligibilitySignal;
  legalDisclaimerAccepted: boolean;
  createdAt?: string;
  updatedAt?: string;
  completedAt?: string;
};

export type RcapPathwaySummary = {
  eligibilitySignal: RcapEligibilitySignal;
  pathwaySummary: string;
  suggestedNextStep: string;
  recommendedService: "Wilma Intake" | "RecordShield" | "Partner Dashboard";
  disclaimer: typeof rcapIntakeDisclaimer;
};

export type RcapIntakeResponseInput = {
  sessionId: string;
  stepId: RcapIntakeStepId;
  value: unknown;
};

export type RcapContactInput = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
};
