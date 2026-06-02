export type IllinoisRemedyType = "expungement" | "sealing" | "needs_review";

export type IllinoisPathway =
  | "expungement_non_conviction"
  | "expungement_supervision_or_qualified_probation"
  | "sealing_conviction"
  | "excluded_or_needs_review"
  | "needs_rap_sheet"
  | "more_information_needed";

export type IllinoisEligibilitySignal =
  | "possible_expungement_path"
  | "possible_sealing_path"
  | "needs_rap_sheet"
  | "needs_more_information"
  | "human_review_recommended"
  | "excluded_or_blocked_review_needed";

export const illinoisPathways = [
  {
    id: "expungement_non_conviction" as const,
    remedyType: "expungement" as const,
    label: "Expungement - case did not end in a conviction",
    plainEnglish:
      "This may be a possible expungement path, especially if the case did not end in a conviction. I do not want to promise anything yet, but we can help organize the next step."
  },
  {
    id: "expungement_supervision_or_qualified_probation" as const,
    remedyType: "expungement" as const,
    label: "Expungement - supervision or qualified probation",
    plainEnglish:
      "This may be worth reviewing for expungement if supervision or a qualified probation program was completed and the case was dismissed."
  },
  {
    id: "sealing_conviction" as const,
    remedyType: "sealing" as const,
    label: "Sealing - conviction review",
    plainEnglish:
      "Based on what you shared, this may be the kind of record where sealing could be worth reviewing. Sealing is different from expungement and may hide the record from most public searches."
  }
];
