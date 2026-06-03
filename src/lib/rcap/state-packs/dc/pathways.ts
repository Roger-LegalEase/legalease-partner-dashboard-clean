export type DcRemedyType = "expungement" | "sealing" | "automatic_review" | "needs_review";

export type DcPathway =
  | "automatic_expungement"
  | "automatic_sealing"
  | "motion_actual_innocence_expungement"
  | "motion_interests_of_justice_sealing"
  | "needs_review";

export type DcEligibilitySignal =
  | "possible_expungement_path"
  | "possible_sealing_path"
  | "needs_more_information"
  | "human_review_recommended"
  | "excluded_or_blocked_review_needed"
  | "future_eligibility_update";

export const dcPathways: Array<{ pathway: DcPathway; label: string; remedyType: DcRemedyType }> = [
  { pathway: "automatic_expungement", label: "Possible automatic expungement review", remedyType: "automatic_review" },
  { pathway: "automatic_sealing", label: "Possible automatic sealing review", remedyType: "automatic_review" },
  { pathway: "motion_actual_innocence_expungement", label: "Motion to expunge based on actual innocence", remedyType: "expungement" },
  { pathway: "motion_interests_of_justice_sealing", label: "Motion to seal based on interests of justice", remedyType: "sealing" },
  { pathway: "needs_review", label: "More information or record review needed", remedyType: "needs_review" }
];
