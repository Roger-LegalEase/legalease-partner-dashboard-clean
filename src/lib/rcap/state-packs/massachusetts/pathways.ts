// Massachusetts record-clearing pathways.
// Source of truth: "Massachusetts Sealing & Expungement — Wilma Agent Training
// Reference" (Nationwide Record Clearing / LegalEase Massachusetts), corroborated
// by the cited Massachusetts General Laws, c. 276, §§ 100A-100T (Massachusetts
// General Court), and Massachusetts Trial Court / Probation Service guidance, plus
// the official Trial Court petition PDFs present in the source folder. In
// Massachusetts the primary adult remedy is SEALING; EXPUNGEMENT (permanent
// erasure/destruction) exists but is narrow. Citations are M.G.L. c. 276 unless
// otherwise noted. No content here is derived from any modeled form or legacy
// generator.

export type MaRemedyType =
  | "conviction_sealing"
  | "non_conviction_sealing"
  | "juvenile_sealing"
  | "time_based_expungement"
  | "non_time_based_expungement"
  | "marijuana_expungement"
  | "needs_review";

export type MaPathway =
  | "adult_conviction_sealing"
  | "non_conviction_sealing"
  | "juvenile_sealing"
  | "time_based_expungement"
  | "non_time_based_expungement"
  | "marijuana_expungement"
  | "needs_review";

export type MaEligibilitySignal =
  | "possible_adult_conviction_sealing"
  | "not_eligible_yet_sealing_wait"
  | "possible_non_conviction_sealing"
  | "possible_juvenile_sealing"
  | "possible_time_based_expungement"
  | "possible_non_time_based_expungement"
  | "possible_marijuana_expungement"
  | "excluded_offense_block"
  | "sex_offense_or_firearm_block"
  | "attorney_or_legal_aid_review"
  | "needs_more_information";

export const maPathwayLabels: Record<MaPathway, string> = {
  adult_conviction_sealing:
    "Adult conviction sealing — Petition to Seal Conviction Records; generally 3-year (misdemeanor) or 7-year (felony) wait (M.G.L. c. 276, § 100A)",
  non_conviction_sealing:
    "Non-conviction sealing — not guilty / no bill / no probable cause should seal; dismissal / nolle prosequi require a court substantial-justice finding (M.G.L. c. 276, § 100C)",
  juvenile_sealing:
    "Juvenile delinquency/youthful-offender record sealing, 3-year wait (M.G.L. c. 276, § 100B)",
  time_based_expungement:
    "Time-based expungement — under-21 offenses, no more than 2 records, non-excluded offense (M.G.L. c. 276, §§ 100F-100J)",
  non_time_based_expungement:
    "Non-time-based expungement — record created by false ID, identity theft, error, fraud, or an offense no longer a crime (M.G.L. c. 276, § 100K)",
  marijuana_expungement:
    "Marijuana-only expungement — Petition for Expungement of Marijuana Offenses for decriminalized/legalized conduct (M.G.L. c. 276, § 100K logic)",
  needs_review: "More information, a CORI report, or attorney/legal-aid review needed"
};

export const maPathways: Array<{
  pathway: MaPathway;
  label: string;
  remedyType: MaRemedyType;
  citation: string;
}> = [
  {
    pathway: "adult_conviction_sealing",
    label: maPathwayLabels.adult_conviction_sealing,
    remedyType: "conviction_sealing",
    citation: "M.G.L. c. 276, § 100A"
  },
  {
    pathway: "non_conviction_sealing",
    label: maPathwayLabels.non_conviction_sealing,
    remedyType: "non_conviction_sealing",
    citation: "M.G.L. c. 276, § 100C"
  },
  {
    pathway: "juvenile_sealing",
    label: maPathwayLabels.juvenile_sealing,
    remedyType: "juvenile_sealing",
    citation: "M.G.L. c. 276, § 100B"
  },
  {
    pathway: "time_based_expungement",
    label: maPathwayLabels.time_based_expungement,
    remedyType: "time_based_expungement",
    citation: "M.G.L. c. 276, §§ 100F-100J"
  },
  {
    pathway: "non_time_based_expungement",
    label: maPathwayLabels.non_time_based_expungement,
    remedyType: "non_time_based_expungement",
    citation: "M.G.L. c. 276, § 100K"
  },
  {
    pathway: "marijuana_expungement",
    label: maPathwayLabels.marijuana_expungement,
    remedyType: "marijuana_expungement",
    citation: "M.G.L. c. 276, § 100K"
  },
  {
    pathway: "needs_review",
    label: maPathwayLabels.needs_review,
    remedyType: "needs_review",
    citation: "M.G.L. c. 276"
  }
];
