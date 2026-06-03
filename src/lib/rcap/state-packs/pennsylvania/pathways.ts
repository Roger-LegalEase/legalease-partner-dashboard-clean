export type PennsylvaniaRemedyType = "expungement" | "limited_access" | "clean_slate" | "needs_review";

export type PennsylvaniaPathway =
  | "expungement_non_conviction"
  | "expungement_no_disposition_18_months"
  | "expungement_summary_5_years"
  | "expungement_ard"
  | "expungement_pardon"
  | "expungement_age_70"
  | "expungement_deceased"
  | "limited_access_misdemeanor"
  | "limited_access_property_felony"
  | "clean_slate_automatic_non_conviction"
  | "clean_slate_automatic_summary"
  | "clean_slate_automatic_misdemeanor"
  | "clean_slate_automatic_drug_felony"
  | "excluded_or_needs_review"
  | "more_information_needed";

export type PennsylvaniaEligibilitySignal =
  | "possible_expungement_path"
  | "possible_limited_access_path"
  | "possible_clean_slate_path"
  | "needs_patch_report"
  | "excluded_or_blocked_review_needed"
  | "needs_more_information";

export const pennsylvaniaPathwayLabels: Record<PennsylvaniaPathway, string> = {
  expungement_non_conviction: "Possible expungement - non-conviction",
  expungement_no_disposition_18_months: "Possible expungement - no disposition after 18 months",
  expungement_summary_5_years: "Possible expungement - summary conviction after 5 years",
  expungement_ard: "Possible expungement - successful ARD completion",
  expungement_pardon: "Possible expungement - full gubernatorial pardon",
  expungement_age_70: "Possible expungement - age 70+ pathway",
  expungement_deceased: "Possible expungement - deceased for 3 years",
  limited_access_misdemeanor: "Possible limited access / sealing - misdemeanor",
  limited_access_property_felony: "Possible limited access / sealing - property felony",
  clean_slate_automatic_non_conviction: "Possible automatic Clean Slate sealing - non-conviction",
  clean_slate_automatic_summary: "Possible automatic Clean Slate sealing - summary conviction",
  clean_slate_automatic_misdemeanor: "Possible automatic Clean Slate sealing - misdemeanor",
  clean_slate_automatic_drug_felony: "Possible automatic Clean Slate sealing - eligible drug felony",
  excluded_or_needs_review: "Needs review",
  more_information_needed: "More information needed"
};
