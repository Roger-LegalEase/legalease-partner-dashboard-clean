export type WyRemedyType =
  | "adult_expungement_sealing"
  | "juvenile_expungement_destruction"
  | "trafficking_vacatur"
  | "needs_review";

export type WyPathway =
  | "adult_nonconviction_expungement"
  | "adult_misdemeanor_status_offense"
  | "adult_misdemeanor_non_status_offense"
  | "adult_felony_expungement"
  | "juvenile_expungement"
  | "trafficking_victim_vacatur"
  | "needs_review";

export type WyEligibilitySignal =
  | "possible_nonconviction_expungement"
  | "possible_misdemeanor_expungement"
  | "possible_felony_expungement"
  | "possible_juvenile_expungement"
  | "possible_trafficking_vacatur"
  | "deferred_disposition_manual_review"
  | "needs_more_information"
  | "attorney_or_legal_aid_review";

export const wyPathwayLabels: Record<WyPathway, string> = {
  adult_nonconviction_expungement:
    "Adult non-conviction expungement - arrest, dismissal, or acquittal (W.S. § 7-13-1401)",
  adult_misdemeanor_status_offense:
    "Adult misdemeanor expungement - status offense, 1 year (W.S. § 7-13-1501)",
  adult_misdemeanor_non_status_offense:
    "Adult misdemeanor expungement - non-status offense, 5 years (W.S. § 7-13-1501)",
  adult_felony_expungement: "Adult felony expungement - 10 years (W.S. § 7-13-1502)",
  juvenile_expungement: "Juvenile / minor expungement (W.S. § 14-6-241)",
  trafficking_victim_vacatur: "Human-trafficking victim vacatur (W.S. § 6-2-708)",
  needs_review: "More information or record review needed"
};

export const wyPathways: Array<{
  pathway: WyPathway;
  label: string;
  remedyType: WyRemedyType;
  citation: string;
}> = [
  {
    pathway: "adult_nonconviction_expungement",
    label: wyPathwayLabels.adult_nonconviction_expungement,
    remedyType: "adult_expungement_sealing",
    citation: "Wyo. Stat. § 7-13-1401"
  },
  {
    pathway: "adult_misdemeanor_status_offense",
    label: wyPathwayLabels.adult_misdemeanor_status_offense,
    remedyType: "adult_expungement_sealing",
    citation: "Wyo. Stat. § 7-13-1501"
  },
  {
    pathway: "adult_misdemeanor_non_status_offense",
    label: wyPathwayLabels.adult_misdemeanor_non_status_offense,
    remedyType: "adult_expungement_sealing",
    citation: "Wyo. Stat. § 7-13-1501"
  },
  {
    pathway: "adult_felony_expungement",
    label: wyPathwayLabels.adult_felony_expungement,
    remedyType: "adult_expungement_sealing",
    citation: "Wyo. Stat. § 7-13-1502"
  },
  {
    pathway: "juvenile_expungement",
    label: wyPathwayLabels.juvenile_expungement,
    remedyType: "juvenile_expungement_destruction",
    citation: "Wyo. Stat. § 14-6-241"
  },
  {
    pathway: "trafficking_victim_vacatur",
    label: wyPathwayLabels.trafficking_victim_vacatur,
    remedyType: "trafficking_vacatur",
    citation: "Wyo. Stat. § 6-2-708"
  },
  {
    pathway: "needs_review",
    label: wyPathwayLabels.needs_review,
    remedyType: "needs_review",
    citation: "N/A"
  }
];
