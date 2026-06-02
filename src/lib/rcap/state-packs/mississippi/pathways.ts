export type MississippiPathway =
  | "non_conviction"
  | "misdemeanor_conviction"
  | "felony_conviction"
  | "more_information_needed";

export type MississippiEligibilitySignal =
  | "possible_pathway"
  | "needs_more_information"
  | "blocked_review_required";

export const mississippiPathways = [
  {
    id: "non_conviction" as const,
    label: "Dismissed or non-conviction",
    plainEnglish:
      "Based on what was shared, this may be the kind of case where a court can review a request to clear the record, especially if the charge was dismissed, dropped, ended in not guilty, or did not end in a conviction."
  },
  {
    id: "misdemeanor_conviction" as const,
    label: "Misdemeanor conviction",
    plainEnglish:
      "This may be worth reviewing as a misdemeanor conviction path if the case was not traffic-only and the sentence, fines, and costs have been completed."
  },
  {
    id: "felony_conviction" as const,
    label: "Felony conviction",
    plainEnglish:
      "This may need a careful record review. Mississippi felony conviction requests can depend on the offense type, completion date, waiting period, and notice to the district attorney."
  }
];
