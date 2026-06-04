export type TexasHarrisRemedyType = "expunction" | "nondisclosure" | "needs_review";

export type TexasHarrisPathway =
  | "expunction_acquittal_not_guilty"
  | "expunction_arrest_no_charge"
  | "expunction_dismissal_or_quashed"
  | "expunction_limitations_expired"
  | "expunction_pardon_actual_innocence"
  | "expunction_class_c_deferred_completed"
  | "nondisclosure_deferred_adjudication_completed"
  | "nondisclosure_eligible_conviction"
  | "nondisclosure_first_offense_dwi"
  | "final_conviction_pardon_review"
  | "more_information_needed";

export type TexasHarrisEligibilitySignal =
  | "possible_expunction_path"
  | "possible_nondisclosure_path"
  | "likely_no_relief_except_pardon"
  | "needs_more_information"
  | "disqualifier_review_needed";

export const texasHarrisPathwayLabels: Record<TexasHarrisPathway, string> = {
  expunction_acquittal_not_guilty: "Possible Harris County expunction - acquittal / not guilty",
  expunction_arrest_no_charge: "Possible Harris County expunction - arrest with no charge filed",
  expunction_dismissal_or_quashed: "Possible Harris County expunction - qualifying dismissal or quashed case",
  expunction_limitations_expired: "Possible Harris County expunction - limitations expired",
  expunction_pardon_actual_innocence: "Possible Harris County expunction - pardon / actual innocence",
  expunction_class_c_deferred_completed: "Possible Harris County expunction - Class C deferred disposition completed",
  nondisclosure_deferred_adjudication_completed: "Possible Harris County nondisclosure - completed deferred adjudication",
  nondisclosure_eligible_conviction: "Possible Harris County nondisclosure - eligible conviction",
  nondisclosure_first_offense_dwi: "Possible Harris County nondisclosure - first-offense DWI",
  final_conviction_pardon_review: "Final conviction - likely no relief except pardon",
  more_information_needed: "More information needed"
};
