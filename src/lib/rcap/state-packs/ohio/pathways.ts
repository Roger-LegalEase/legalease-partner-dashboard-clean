// Ohio record-clearing pathways.
// Source of truth: "Ohio Sealing & Expungement — Wilma Agent Training Reference"
// (Nationwide Record Clearing / LegalEase Ohio), corroborated by the cited Ohio
// Revised Code (§§ 2953.31-2953.34, 2953.321, 2953.35, 2953.36, 2953.39,
// 2953.521, 2953.61; juvenile §§ 2151.356, 2151.358) and Ohio Legal Help / Ohio
// Attorney General guidance, plus the official sealing/expungement application
// PDFs in the source folder. Ohio has BOTH sealing (hides from most public
// access) and expungement (stronger — destroy/delete/erase, with limited BCI
// retention for some § 2953.32 conviction expungements). Citations are Ohio Rev.
// Code unless otherwise noted. No content here is derived from any modeled form
// or legacy generator.

export type OhRemedyType =
  | "conviction_sealing_or_expungement"
  | "non_conviction_sealing_or_expungement"
  | "marijuana_expungement"
  | "trafficking_survivor_expungement"
  | "firearm_offense_expungement"
  | "prosecutor_initiated"
  | "juvenile_sealing_expungement"
  | "needs_review";

export type OhPathway =
  | "adult_conviction_sealing_expungement"
  | "non_conviction_sealing_expungement"
  | "marijuana_hashish_expungement"
  | "trafficking_survivor_conviction_expungement"
  | "trafficking_survivor_non_conviction_expungement"
  | "firearm_carry_expungement"
  | "prosecutor_low_level_controlled_substance"
  | "juvenile_sealing_expungement"
  | "needs_review";

export type OhEligibilitySignal =
  | "possible_conviction_sealing"
  | "possible_conviction_expungement"
  | "not_eligible_yet_waiting_period"
  | "excluded_conviction_category"
  | "possible_non_conviction_sealing_expungement"
  | "dismissal_without_prejudice_sol_check"
  | "multiple_charges_same_act_block"
  | "possible_marijuana_hashish_expungement"
  | "possible_trafficking_survivor_expungement"
  | "possible_firearm_carry_expungement"
  | "prosecutor_initiated_route"
  | "juvenile_route"
  | "attorney_or_legal_aid_review"
  | "needs_more_information";

export const ohPathwayLabels: Record<OhPathway, string> = {
  adult_conviction_sealing_expungement:
    "Adult conviction sealing or expungement — eligible misdemeanor/F4/F5 and some F3; waiting period depends on offense level and whether sealing or expungement is sought (Ohio Rev. Code § 2953.32)",
  non_conviction_sealing_expungement:
    "Non-conviction sealing or expungement — not guilty, dismissal, grand-jury no bill, or pardon (Ohio Rev. Code § 2953.33)",
  marijuana_hashish_expungement:
    "Marijuana/hashish possession expungement — specific route effective March 20, 2026 (Ohio Rev. Code § 2953.321)",
  trafficking_survivor_conviction_expungement:
    "Human-trafficking-survivor conviction expungement — prostitution-related or misdemeanor/F4/F5 where participation resulted from trafficking (Ohio Rev. Code § 2953.36)",
  trafficking_survivor_non_conviction_expungement:
    "Human-trafficking-survivor non-conviction expungement — not guilty or dismissal resulting from trafficking victimization (Ohio Rev. Code § 2953.521)",
  firearm_carry_expungement:
    "Certain older firearm/carry-conviction expungement (Ohio Rev. Code § 2953.35)",
  prosecutor_low_level_controlled_substance:
    "Prosecutor-initiated sealing/expungement of a low-level controlled-substance offense (Ohio Rev. Code § 2953.39)",
  juvenile_sealing_expungement:
    "Juvenile sealing then later expungement (Ohio Rev. Code §§ 2151.356, 2151.358)",
  needs_review: "More information, a BCI record/full docket, or attorney review needed"
};

export const ohPathways: Array<{
  pathway: OhPathway;
  label: string;
  remedyType: OhRemedyType;
  citation: string;
}> = [
  {
    pathway: "adult_conviction_sealing_expungement",
    label: ohPathwayLabels.adult_conviction_sealing_expungement,
    remedyType: "conviction_sealing_or_expungement",
    citation: "Ohio Rev. Code § 2953.32"
  },
  {
    pathway: "non_conviction_sealing_expungement",
    label: ohPathwayLabels.non_conviction_sealing_expungement,
    remedyType: "non_conviction_sealing_or_expungement",
    citation: "Ohio Rev. Code § 2953.33"
  },
  {
    pathway: "marijuana_hashish_expungement",
    label: ohPathwayLabels.marijuana_hashish_expungement,
    remedyType: "marijuana_expungement",
    citation: "Ohio Rev. Code § 2953.321"
  },
  {
    pathway: "trafficking_survivor_conviction_expungement",
    label: ohPathwayLabels.trafficking_survivor_conviction_expungement,
    remedyType: "trafficking_survivor_expungement",
    citation: "Ohio Rev. Code § 2953.36"
  },
  {
    pathway: "trafficking_survivor_non_conviction_expungement",
    label: ohPathwayLabels.trafficking_survivor_non_conviction_expungement,
    remedyType: "trafficking_survivor_expungement",
    citation: "Ohio Rev. Code § 2953.521"
  },
  {
    pathway: "firearm_carry_expungement",
    label: ohPathwayLabels.firearm_carry_expungement,
    remedyType: "firearm_offense_expungement",
    citation: "Ohio Rev. Code § 2953.35"
  },
  {
    pathway: "prosecutor_low_level_controlled_substance",
    label: ohPathwayLabels.prosecutor_low_level_controlled_substance,
    remedyType: "prosecutor_initiated",
    citation: "Ohio Rev. Code § 2953.39"
  },
  {
    pathway: "juvenile_sealing_expungement",
    label: ohPathwayLabels.juvenile_sealing_expungement,
    remedyType: "juvenile_sealing_expungement",
    citation: "Ohio Rev. Code §§ 2151.356, 2151.358"
  },
  {
    pathway: "needs_review",
    label: ohPathwayLabels.needs_review,
    remedyType: "needs_review",
    citation: "Ohio Rev. Code § 2953.31"
  }
];
