// West Virginia record-clearing pathways.
// Source of truth: "West Virginia Expungement Reference for Wilma" (Nationwide
// Record Clearing / LegalEase West Virginia), corroborated by the cited West
// Virginia Code (W. Va. Code § 61-11-25 acquittal/dismissal/diversion; §§ 61-11-22
// / 61-11-22a diversion and deferred adjudication; § 61-11-26 conviction
// expungement; § 61-11-26a accelerated route; § 61-11-26b CDL/DUI limit; § 60A-4-407
// first-offense drug possession; § 5-1-16a pardon; § 61-14-9 trafficking-victim;
// § 49-5-104 juvenile) and the West Virginia Judiciary's official SCA-C forms.
// Citations are W. Va. Code unless otherwise noted. No content here is derived from
// any modeled form or legacy generator.

export type WvRemedyType =
  | "non_conviction_expungement"
  | "diversion_deferred_expungement"
  | "misdemeanor_conviction_expungement"
  | "nonviolent_felony_conviction_expungement"
  | "accelerated_expungement"
  | "drug_conditional_discharge_expungement"
  | "pardon_based_expungement"
  | "trafficking_victim_vacatur_expungement"
  | "juvenile_confidentiality_sealing"
  | "needs_review";

export type WvPathway =
  | "non_conviction_acquittal_dismissal_expungement"
  | "pretrial_diversion_deferred_expungement"
  | "misdemeanor_conviction_expungement"
  | "nonviolent_felony_conviction_expungement"
  | "accelerated_treatment_job_readiness_expungement"
  | "first_offense_drug_possession_conditional_discharge"
  | "pardon_based_expungement"
  | "trafficking_victim_vacatur_expungement"
  | "juvenile_confidentiality_sealing"
  | "needs_review";

export type WvEligibilitySignal =
  | "likely_eligible_acquittal_60_days"
  | "likely_eligible_dismissal_60_days"
  | "likely_eligible_pretrial_diversion_completion"
  | "likely_eligible_deferred_adjudication_completion"
  | "not_eligible_dismissed_in_exchange_for_guilty_plea"
  | "not_eligible_prior_felony_for_61_11_25"
  | "likely_eligible_single_misdemeanor_1_year"
  | "likely_eligible_multiple_misdemeanors_2_years"
  | "likely_eligible_nonviolent_felony_5_years"
  | "possible_one_time_expungement_limit_issue"
  | "possible_accelerated_treatment_or_job_readiness"
  | "possible_first_offense_drug_possession_conditional_discharge"
  | "possible_pardon_based_expungement"
  | "possible_trafficking_victim_vacatur_expungement"
  | "possible_juvenile_confidential_sealing_by_operation"
  | "legal_review_required_unclear_exclusion"
  | "needs_more_information";

export const wvPathwayLabels: Record<WvPathway, string> = {
  non_conviction_acquittal_dismissal_expungement:
    "No-conviction expungement — found not guilty or charges dismissed (not in exchange for a guilty plea to another conviction); civil petition in the circuit court of filing no sooner than 60 days after the order, no filing fees; a prior felony conviction blocks this route (W. Va. Code § 61-11-25)",
  pretrial_diversion_deferred_expungement:
    "Diversion / deferred-adjudication expungement — charges dismissed after successful pretrial diversion (§ 61-11-22) or deferred adjudication (§ 61-11-22a); petition to expunge all same-transaction charges (W. Va. Code § 61-11-25)",
  misdemeanor_conviction_expungement:
    "Misdemeanor conviction expungement — single misdemeanor after 1 year, multiple misdemeanors after 2 years (from the later of conviction/incarceration/supervision completion), by verified petition with clear-and-convincing burden (W. Va. Code § 61-11-26)",
  nonviolent_felony_conviction_expungement:
    "Nonviolent felony conviction expungement — eligible nonviolent felony/felonies from the same transaction or series after 5 years (from the later of conviction/incarceration/supervision completion) (W. Va. Code § 61-11-26)",
  accelerated_treatment_job_readiness_expungement:
    "Accelerated treatment/job-readiness expungement — for an otherwise § 61-11-26-eligible person with documented treatment/recovery compliance or a DOE-approved job-readiness certificate; single misdemeanor after 90 days, multiple misdemeanors after 1 year, nonviolent felony after 3 years; $100 State Police fee waived (W. Va. Code § 61-11-26a)",
  first_offense_drug_possession_conditional_discharge:
    "First-offense drug-possession conditional discharge — deferral and dismissal without adjudication of guilt; apply to expunge at least 6 months after probation ends if no serious/repeated violations; one-time use (W. Va. Code § 60A-4-407)",
  pardon_based_expungement:
    "Pardon-based expungement — full and unconditional Governor's pardon; petition in the county of conviction at least 1 year after the pardon and 5 years after sentence discharge; unavailable for first-degree murder, treason, kidnapping, or Article 8B felony sex offenses (W. Va. Code § 5-1-16a)",
  trafficking_victim_vacatur_expungement:
    "Sex-trafficking victim vacatur/expungement — prostitution conviction/adjudication that was a direct result of being trafficked may be vacated and expunged; no rehabilitation requirement; route to legal aid/attorney (W. Va. Code § 61-14-9)",
  juvenile_confidentiality_sealing:
    "Juvenile confidentiality/sealing — juvenile proceeding records kept confidential one year after the 18th birthday or one year after jurisdiction ends (whichever is later); not available for a juvenile convicted under adult criminal jurisdiction (W. Va. Code § 49-5-104)",
  needs_review: "More information, the disposition/order, or attorney review needed"
};

export const wvPathways: Array<{
  pathway: WvPathway;
  label: string;
  remedyType: WvRemedyType;
  citation: string;
}> = [
  {
    pathway: "non_conviction_acquittal_dismissal_expungement",
    label: wvPathwayLabels.non_conviction_acquittal_dismissal_expungement,
    remedyType: "non_conviction_expungement",
    citation: "W. Va. Code § 61-11-25"
  },
  {
    pathway: "pretrial_diversion_deferred_expungement",
    label: wvPathwayLabels.pretrial_diversion_deferred_expungement,
    remedyType: "diversion_deferred_expungement",
    citation: "W. Va. Code § 61-11-25; §§ 61-11-22 / 61-11-22a"
  },
  {
    pathway: "misdemeanor_conviction_expungement",
    label: wvPathwayLabels.misdemeanor_conviction_expungement,
    remedyType: "misdemeanor_conviction_expungement",
    citation: "W. Va. Code § 61-11-26"
  },
  {
    pathway: "nonviolent_felony_conviction_expungement",
    label: wvPathwayLabels.nonviolent_felony_conviction_expungement,
    remedyType: "nonviolent_felony_conviction_expungement",
    citation: "W. Va. Code § 61-11-26"
  },
  {
    pathway: "accelerated_treatment_job_readiness_expungement",
    label: wvPathwayLabels.accelerated_treatment_job_readiness_expungement,
    remedyType: "accelerated_expungement",
    citation: "W. Va. Code § 61-11-26a"
  },
  {
    pathway: "first_offense_drug_possession_conditional_discharge",
    label: wvPathwayLabels.first_offense_drug_possession_conditional_discharge,
    remedyType: "drug_conditional_discharge_expungement",
    citation: "W. Va. Code § 60A-4-407"
  },
  {
    pathway: "pardon_based_expungement",
    label: wvPathwayLabels.pardon_based_expungement,
    remedyType: "pardon_based_expungement",
    citation: "W. Va. Code § 5-1-16a"
  },
  {
    pathway: "trafficking_victim_vacatur_expungement",
    label: wvPathwayLabels.trafficking_victim_vacatur_expungement,
    remedyType: "trafficking_victim_vacatur_expungement",
    citation: "W. Va. Code § 61-14-9"
  },
  {
    pathway: "juvenile_confidentiality_sealing",
    label: wvPathwayLabels.juvenile_confidentiality_sealing,
    remedyType: "juvenile_confidentiality_sealing",
    citation: "W. Va. Code § 49-5-104"
  },
  {
    pathway: "needs_review",
    label: wvPathwayLabels.needs_review,
    remedyType: "needs_review",
    citation: "W. Va. Code § 61-11-26"
  }
];
