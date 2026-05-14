export const wilmaEligibilityAnswers = ["yes", "no", "unknown"] as const;

export type WilmaEligibilityAnswer = (typeof wilmaEligibilityAnswers)[number];

export const wilmaEligibilityStatuses = [
  "not_started",
  "needs_information",
  "likely_eligible",
  "likely_eligible_for_document_prep",
  "likely_ineligible",
  "manual_review"
] as const;

export type WilmaEligibilityStatus = (typeof wilmaEligibilityStatuses)[number];

export type WilmaApplicantProfile = {
  userId: string;
  state: string;
  county?: string;
  dateOfBirth?: string;
};

export type WilmaCaseProfile = {
  caseId?: string;
  jurisdiction?: string;
  offenseCategory?: string;
  dispositionDate?: string;
  sentenceCompleted: WilmaEligibilityAnswer;
  hasOpenCase: WilmaEligibilityAnswer;
  hasOutstandingBalance: WilmaEligibilityAnswer;
};

export type WilmaEligibilityInput = {
  applicant: WilmaApplicantProfile;
  case: WilmaCaseProfile;
};

export type WilmaEligibilityReason = {
  code: string;
  message: string;
};

export type WilmaEligibilityResult = {
  id?: string;
  status: WilmaEligibilityStatus;
  ruleVersion: string;
  reasons: WilmaEligibilityReason[];
  evaluatedAt: string;
};
