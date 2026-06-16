// South Carolina record-clearing pathways.
// Source of truth: "South Carolina Expungement — Wilma Agent Training Reference"
// (Nationwide Record Clearing / LegalEase South Carolina), corroborated by the
// cited South Carolina Code of Laws sections (S.C. Code §§ 17-22-910, 17-1-40,
// 17-22-950, 17-22-150, 17-22-530, 17-22-330, 22-5-910, 22-5-920, 22-5-930,
// 34-11-90(e), 44-53-450, 56-5-750(F), 17-1-65, 63-19-2050, and the trafficking-
// victim relief provisions), South Carolina Judicial Branch and SLED guidance, plus
// the official SCCA 223-series forms (SCCA 223A1 packet, SCCA 223B1, SCCA 223C,
// SCCA 223D, SCCA 223E, SCCA 492) present in the source folder. South Carolina is
// not one pathway: routing is by disposition + court level + offense type + prior
// record + waiting period. Citations are S.C. Code unless otherwise noted. No
// content here is derived from any modeled form or legacy generator.

export type ScRemedyType =
  | "court_expungement_non_conviction"
  | "diversion_program_expungement"
  | "conditional_discharge_expungement"
  | "court_expungement_conviction"
  | "youthful_offender_expungement"
  | "special_deadline_expungement"
  | "trafficking_survivor_relief"
  | "juvenile_expungement"
  | "pardon_not_expungement"
  | "needs_review";

export type ScPathway =
  | "summary_court_non_conviction"
  | "general_sessions_non_conviction"
  | "pretrial_intervention_completion"
  | "alcohol_education_program"
  | "traffic_education_program"
  | "conditional_discharge_drug"
  | "fraudulent_check_first_offense"
  | "first_low_level_conviction"
  | "youthful_offender_act"
  | "drug_conviction_route"
  | "failure_to_stop_blue_light"
  | "old_unlawful_handgun_possession"
  | "human_trafficking_survivor"
  | "juvenile_expungement"
  | "pardon_not_expungement"
  | "needs_review";

export type ScEligibilitySignal =
  | "possible_summary_court_non_conviction"
  | "possible_general_sessions_non_conviction"
  | "possible_diversion_program_expungement"
  | "possible_conditional_discharge_drug"
  | "possible_fraudulent_check_expungement"
  | "possible_first_low_level_conviction"
  | "possible_youthful_offender_expungement"
  | "possible_drug_conviction_route"
  | "possible_failure_to_stop_expungement"
  | "possible_old_handgun_special_deadline"
  | "possible_trafficking_survivor_relief"
  | "possible_juvenile_expungement"
  | "pardon_is_not_expungement_flag"
  | "not_eligible_yet_waiting_period"
  | "pending_charge_block"
  | "prior_conviction_block"
  | "route_used_before_block"
  | "attorney_or_legal_aid_review"
  | "needs_more_information";

export const scPathwayLabels: Record<ScPathway, string> = {
  summary_court_non_conviction:
    "Summary court non-conviction expungement — magistrate/municipal charge dismissed, nolle prossed, or not guilty; direct summary-court process, usually no cost (S.C. Code § 17-22-950)",
  general_sessions_non_conviction:
    "General Sessions non-conviction expungement — dismissed, nolle prossed, not guilty, discharged, or acquitted; usually through the Solicitor's Office (S.C. Code § 17-1-40)",
  pretrial_intervention_completion:
    "Pretrial Intervention (PTI) completion — noncriminal disposition after successful completion; apply to destroy official arrest records (S.C. Code § 17-22-150)",
  alcohol_education_program:
    "Alcohol Education Program (AEP) completion — noncriminal disposition for eligible underage-alcohol/related offenses; DUI-type offenses excluded (S.C. Code § 17-22-530)",
  traffic_education_program:
    "Traffic Education Program (TEP) completion — noncriminal disposition for qualifying fine-only traffic offenses (four points or less); not available if death/serious bodily injury (S.C. Code § 17-22-330)",
  conditional_discharge_drug:
    "Conditional discharge — eligible drug possession; dismissal/discharge after completion without adjudication; one-time route (S.C. Code § 44-53-450)",
  fraudulent_check_first_offense:
    "First-offense misdemeanor fraudulent check — expungement 1 year after conviction with no other conviction in that year; felony cases excluded; once only (S.C. Code § 34-11-90(e))",
  first_low_level_conviction:
    "First low-level conviction expungement — penalty not more than 30 days or $1,000; 3-year wait; once only; excludes motor-vehicle offenses; DV-3rd has a special 5-year wait (S.C. Code § 22-5-910)",
  youthful_offender_act:
    "Youthful Offender Act expungement — apply 5 years after completing sentence/probation/parole and remaining conviction-free; exclusions apply (S.C. Code § 22-5-920)",
  drug_conviction_route:
    "Drug conviction route — certain first-offense simple possession / possession-with-intent convictions; manual-review until exact statute, level, and dates confirmed (S.C. Code § 22-5-930)",
  failure_to_stop_blue_light:
    "Failure to stop for blue light (non-felony) — first offense expungeable 3 years after completing all sentence terms with no other conviction (S.C. Code § 56-5-750(F))",
  old_unlawful_handgun_possession:
    "Old unlawful handgun possession — special deadline route for pre-Constitutional-Carry convictions; application before March 7, 2029; no prior § 17-1-65 application (S.C. Code § 17-1-65)",
  human_trafficking_survivor:
    "Human trafficking survivor relief — motion to expunge convictions/adjudications directly caused by or interrelated to trafficking; preponderance standard; manual/legal review (S.C. Code trafficking-victim relief provision; exact subsection not stated in the Nationwide source — counsel to confirm)",
  juvenile_expungement:
    "Juvenile expungement — status offense or nonviolent adjudication; Family Court route after statutory conditions; not-guilty in Family Court expunged regardless of age and without fee (S.C. Code § 63-19-2050)",
  pardon_not_expungement:
    "Pardon — state forgiveness through the Department of Probation, Parole and Pardon Services; NOT expungement and does not automatically erase the conviction",
  needs_review:
    "More information, a SLED rap sheet / certified disposition, or attorney review needed"
};

export const scPathways: Array<{
  pathway: ScPathway;
  label: string;
  remedyType: ScRemedyType;
  citation: string;
}> = [
  {
    pathway: "summary_court_non_conviction",
    label: scPathwayLabels.summary_court_non_conviction,
    remedyType: "court_expungement_non_conviction",
    citation: "S.C. Code § 17-22-950"
  },
  {
    pathway: "general_sessions_non_conviction",
    label: scPathwayLabels.general_sessions_non_conviction,
    remedyType: "court_expungement_non_conviction",
    citation: "S.C. Code § 17-1-40"
  },
  {
    pathway: "pretrial_intervention_completion",
    label: scPathwayLabels.pretrial_intervention_completion,
    remedyType: "diversion_program_expungement",
    citation: "S.C. Code § 17-22-150"
  },
  {
    pathway: "alcohol_education_program",
    label: scPathwayLabels.alcohol_education_program,
    remedyType: "diversion_program_expungement",
    citation: "S.C. Code § 17-22-530"
  },
  {
    pathway: "traffic_education_program",
    label: scPathwayLabels.traffic_education_program,
    remedyType: "diversion_program_expungement",
    citation: "S.C. Code § 17-22-330"
  },
  {
    pathway: "conditional_discharge_drug",
    label: scPathwayLabels.conditional_discharge_drug,
    remedyType: "conditional_discharge_expungement",
    citation: "S.C. Code § 44-53-450"
  },
  {
    pathway: "fraudulent_check_first_offense",
    label: scPathwayLabels.fraudulent_check_first_offense,
    remedyType: "court_expungement_conviction",
    citation: "S.C. Code § 34-11-90(e)"
  },
  {
    pathway: "first_low_level_conviction",
    label: scPathwayLabels.first_low_level_conviction,
    remedyType: "court_expungement_conviction",
    citation: "S.C. Code § 22-5-910"
  },
  {
    pathway: "youthful_offender_act",
    label: scPathwayLabels.youthful_offender_act,
    remedyType: "youthful_offender_expungement",
    citation: "S.C. Code § 22-5-920"
  },
  {
    pathway: "drug_conviction_route",
    label: scPathwayLabels.drug_conviction_route,
    remedyType: "court_expungement_conviction",
    citation: "S.C. Code § 22-5-930"
  },
  {
    pathway: "failure_to_stop_blue_light",
    label: scPathwayLabels.failure_to_stop_blue_light,
    remedyType: "court_expungement_conviction",
    citation: "S.C. Code § 56-5-750(F)"
  },
  {
    pathway: "old_unlawful_handgun_possession",
    label: scPathwayLabels.old_unlawful_handgun_possession,
    remedyType: "special_deadline_expungement",
    citation: "S.C. Code § 17-1-65"
  },
  {
    pathway: "human_trafficking_survivor",
    label: scPathwayLabels.human_trafficking_survivor,
    remedyType: "trafficking_survivor_relief",
    // Source gap: the Nationwide Wilma reference describes a "trafficking-victim
    // relief" route but does not state an exact code section. Do not assert a
    // fabricated subsection — flag for counsel to confirm the precise S.C. Code cite.
    citation: "S.C. Code (trafficking-victim expungement provision; exact subsection unconfirmed in Nationwide source)"
  },
  {
    pathway: "juvenile_expungement",
    label: scPathwayLabels.juvenile_expungement,
    remedyType: "juvenile_expungement",
    citation: "S.C. Code § 63-19-2050"
  },
  {
    pathway: "pardon_not_expungement",
    label: scPathwayLabels.pardon_not_expungement,
    remedyType: "pardon_not_expungement",
    citation: "S.C. Code § 17-22-910"
  },
  {
    pathway: "needs_review",
    label: scPathwayLabels.needs_review,
    remedyType: "needs_review",
    citation: "S.C. Code § 17-22-910"
  }
];
