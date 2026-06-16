// Rhode Island record-clearing pathways.
// Source of truth: "Rhode Island Expungement / Sealing Reference for Wilma"
// (Nationwide Record Clearing / LegalEase Rhode Island), corroborated by the
// cited Rhode Island General Laws (R.I. Gen. Laws ch. 12-1.3; §§ 12-1-12,
// 12-1-12.1; § 12-19-19; § 12-10-12; § 12-1.3-5; § 11-34.1-5), the Rhode Island
// Judiciary expungement/sealing guidance, and the official court Motion to
// Expunge or Seal Record / Affidavit forms (DC-33, Superior-55, the Superior
// Court misdemeanor motion, and the Family Court motion; revised February 2025)
// present in the source folder. Rhode Island uses BOTH "expungement" (usually
// for convictions and probation, ch. 12-1.3) and "sealing"/destruction (usually
// for acquittals, dismissals, no true bills, no information, and other
// exonerated cases, §§ 12-1-12 / 12-1-12.1); they are distinct and must not be
// treated as identical. Citations are R.I. Gen. Laws unless otherwise noted. No
// content here is derived from any modeled form or legacy generator.

export type RiRemedyType =
  | "court_motion_conviction_expungement"
  | "court_motion_sealing_or_destruction"
  | "automatic_expungement"
  | "automatic_sealing"
  | "deferred_sentence_expungement"
  | "filed_complaint_expungement"
  | "violence_bar_flag"
  | "needs_review";

export type RiPathway =
  | "first_offender_conviction_expungement"
  | "multiple_misdemeanor_expungement"
  | "deferred_sentence_expungement"
  | "non_conviction_sealing"
  | "filed_complaint_expungement"
  | "marijuana_possession_automatic_expungement"
  | "decriminalized_offense_expungement"
  | "commercial_sexual_activity_relief"
  | "crime_of_violence_bar"
  | "needs_review";

export type RiEligibilitySignal =
  | "possible_first_offender_expungement"
  | "not_eligible_yet_waiting_period"
  | "possible_multiple_misdemeanor_expungement"
  | "multiple_misdemeanor_exclusion_flag"
  | "possible_deferred_sentence_expungement"
  | "deferred_terms_not_yet_completed"
  | "possible_non_conviction_sealing"
  | "automatic_sealing_rule_48a"
  | "possible_filed_complaint_expungement"
  | "possible_marijuana_automatic_expungement"
  | "possible_decriminalized_offense_expungement"
  | "possible_commercial_sexual_activity_relief"
  | "crime_of_violence_bar_flag"
  | "out_of_state_federal_tribal_block"
  | "attorney_or_legal_aid_review"
  | "needs_more_information";

export const riPathwayLabels: Record<RiPathway, string> = {
  first_offender_conviction_expungement:
    "First-offender conviction expungement — a first offender with no crime of violence may move to expunge a single misdemeanor (5 years from completion of sentence) or felony (10 years from completion of sentence) conviction in the court of conviction (R.I. Gen. Laws ch. 12-1.3; § 12-1.3-2)",
  multiple_misdemeanor_expungement:
    "Multiple-misdemeanor expungement — more than one but fewer than six misdemeanors and no felony; motion 10 years after completion of the last sentence; excludes domestic violence (Title 12 ch. 29), DUI (§ 31-27-2), and chemical-test refusal (§ 31-27-2.1) (R.I. Gen. Laws § 12-1.3-3)",
  deferred_sentence_expungement:
    "Deferred-sentence expungement — after completion of a written deferral agreement and a court finding of compliance with all terms, the person is immediately eligible for consideration for expungement (R.I. Gen. Laws § 12-19-19; § 12-1.3-2(e))",
  non_conviction_sealing:
    "Non-conviction sealing / destruction — acquittals, dismissals, no true bills, no information, and other exonerated cases; ID records destroyed and court/BCI records sealed; Rule 48(a) dismissals on/after Jan. 1, 2023 are sealed automatically (R.I. Gen. Laws § 12-1-12 and § 12-1-12.1)",
  filed_complaint_expungement:
    "Filed-complaint expungement — a complaint placed on file is automatically expunged if no action is taken during the filing period; a domestic-violence filing is expunged if no new DV charge in the 3-year period after filing (R.I. Gen. Laws § 12-10-12)",
  marijuana_possession_automatic_expungement:
    "Marijuana possession-only automatic expungement — a civil violation, misdemeanor, or felony for possession only of a now-decriminalized marijuana offense is entitled to automatic expungement; amount presumed 2 oz. or less if unstated (R.I. Gen. Laws § 12-1.3-5)",
  decriminalized_offense_expungement:
    "Decriminalized-offense expungement — a person may move to expunge an offense decriminalized after the date of conviction; court orders expungement without cost if sentence conditions and required financial obligations are complete (R.I. Gen. Laws ch. 12-1.3; § 12-1.3-2(g) / § 12-1.3-3(e))",
  commercial_sexual_activity_relief:
    "Commercial-sexual-activity relief — records under § 11-34.1-2 or § 11-34.1-4 (conviction, probation, or filed under § 12-10-12) may be expunged one year after completion of sentence, regardless of first-offender status (R.I. Gen. Laws § 11-34.1-5)",
  crime_of_violence_bar:
    "Crime-of-violence bar — a person convicted of a crime of violence is barred from conviction expungement (including deferred-sentence expungement); attorney review required (R.I. Gen. Laws § 12-1.3-1; § 12-1.3-2)",
  needs_review:
    "More information, the official court record / final disposition / BCI report, or attorney review needed"
};

export const riPathways: Array<{
  pathway: RiPathway;
  label: string;
  remedyType: RiRemedyType;
  citation: string;
}> = [
  {
    pathway: "first_offender_conviction_expungement",
    label: riPathwayLabels.first_offender_conviction_expungement,
    remedyType: "court_motion_conviction_expungement",
    citation: "R.I. Gen. Laws § 12-1.3-2"
  },
  {
    pathway: "multiple_misdemeanor_expungement",
    label: riPathwayLabels.multiple_misdemeanor_expungement,
    remedyType: "court_motion_conviction_expungement",
    citation: "R.I. Gen. Laws § 12-1.3-3"
  },
  {
    pathway: "deferred_sentence_expungement",
    label: riPathwayLabels.deferred_sentence_expungement,
    remedyType: "deferred_sentence_expungement",
    citation: "R.I. Gen. Laws § 12-19-19"
  },
  {
    pathway: "non_conviction_sealing",
    label: riPathwayLabels.non_conviction_sealing,
    remedyType: "court_motion_sealing_or_destruction",
    citation: "R.I. Gen. Laws § 12-1-12 and § 12-1-12.1"
  },
  {
    pathway: "filed_complaint_expungement",
    label: riPathwayLabels.filed_complaint_expungement,
    remedyType: "filed_complaint_expungement",
    citation: "R.I. Gen. Laws § 12-10-12"
  },
  {
    pathway: "marijuana_possession_automatic_expungement",
    label: riPathwayLabels.marijuana_possession_automatic_expungement,
    remedyType: "automatic_expungement",
    citation: "R.I. Gen. Laws § 12-1.3-5"
  },
  {
    pathway: "decriminalized_offense_expungement",
    label: riPathwayLabels.decriminalized_offense_expungement,
    remedyType: "court_motion_conviction_expungement",
    citation: "R.I. Gen. Laws ch. 12-1.3 (§ 12-1.3-2(g) / § 12-1.3-3(e))"
  },
  {
    pathway: "commercial_sexual_activity_relief",
    label: riPathwayLabels.commercial_sexual_activity_relief,
    remedyType: "court_motion_conviction_expungement",
    citation: "R.I. Gen. Laws § 11-34.1-5"
  },
  {
    pathway: "crime_of_violence_bar",
    label: riPathwayLabels.crime_of_violence_bar,
    remedyType: "violence_bar_flag",
    citation: "R.I. Gen. Laws § 12-1.3-2"
  },
  {
    pathway: "needs_review",
    label: riPathwayLabels.needs_review,
    remedyType: "needs_review",
    citation: "R.I. Gen. Laws ch. 12-1.3"
  }
];
