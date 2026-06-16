// Louisiana record-clearing pathways.
// Source of truth: "Louisiana Expungement Reference for Wilma" (Nationwide
// Record Clearing / LegalEase Louisiana), corroborated by the cited Louisiana
// Code of Criminal Procedure, Title XXXIV, Articles 971-999.1 (Louisiana State
// Legislature), and Louisiana State Police / BCII guidance, plus the Louisiana
// Laws HTML source files present in the source folder. In Louisiana the remedy
// is EXPUNGEMENT (removal from public access, not destruction); the operative
// filing is a "Motion for Expungement," not a petition, and some convictions
// must first be set aside under Art. 893 (felony) or Art. 894 (misdemeanor).
// Citations are La. Code Crim. Proc. unless otherwise noted. No content here is
// derived from any modeled form or legacy generator.

export type LaRemedyType =
  | "court_motion_expungement"
  | "interim_expungement"
  | "expungement_by_redaction"
  | "automated_expungement"
  | "needs_review";

export type LaPathway =
  | "no_conviction_expungement"
  | "misdemeanor_conviction_expungement"
  | "felony_conviction_expungement"
  | "first_offense_marijuana_expungement"
  | "interim_expungement"
  | "expungement_by_redaction"
  | "human_trafficking_victim"
  | "automated_expungement"
  | "immediate_expungement_after_program"
  | "needs_review";

export type LaEligibilitySignal =
  | "possible_no_conviction_expungement"
  | "not_eligible_yet_dwi_diversion_5_years"
  | "possible_misdemeanor_894_set_aside"
  | "possible_misdemeanor_5_year_clean_period"
  | "possible_first_offense_marijuana_90_days"
  | "possible_felony_893_set_aside"
  | "possible_felony_10_year_clean_period"
  | "possible_felony_first_offender_pardon"
  | "possible_978E_violent_exception_review"
  | "possible_interim_expungement"
  | "possible_redaction_multi_person"
  | "trafficking_victim_certification"
  | "hard_stop_current_hard_labor_custody"
  | "excluded_offense_block"
  | "attorney_or_legal_aid_review"
  | "needs_more_information";

export const laPathwayLabels: Record<LaPathway, string> = {
  no_conviction_expungement:
    "Expungement of an arrest that did not result in conviction — no prosecution / DA refusal / dismissal / quash / acquittal / factual innocence (La. Code Crim. Proc. arts. 976-977)",
  misdemeanor_conviction_expungement:
    "Misdemeanor conviction expungement — after an Art. 894(B) set-aside, or the 5-year clean-period route with DA certification (La. Code Crim. Proc. art. 977)",
  felony_conviction_expungement:
    "Felony conviction expungement — after an Art. 893(E) set-aside, the 10-year clean-period route, or a first-offender pardon, subject to Art. 978 exclusions (La. Code Crim. Proc. art. 978)",
  first_offense_marijuana_expungement:
    "First-offense misdemeanor marijuana/THC possession expungement — may file 90 days after conviction (La. Code Crim. Proc. art. 998)",
  interim_expungement:
    "Interim expungement of a felony arrest entry where the case ended in a misdemeanor conviction (La. Code Crim. Proc. arts. 994-995)",
  expungement_by_redaction:
    "Expungement by redaction where a record names multiple people and only one is eligible (La. Code Crim. Proc. tit. XXXIV)",
  human_trafficking_victim:
    "Human-trafficking-victim route — DA certification waives Art. 977/978 time delays and expungement fees (La. Code Crim. Proc. arts. 977-978)",
  automated_expungement:
    "Automated expungement for qualifying records — subject to legislative appropriation/funding; verify availability (La. Code Crim. Proc. art. 985.2)",
  immediate_expungement_after_program:
    "Immediate expungement by court discretion after completion of a court-ordered probation/alternative-sentencing program (La. Code Crim. Proc. art. 985.3)",
  needs_review: "More information, a Right to Review rap sheet, or attorney review needed"
};

export const laPathways: Array<{
  pathway: LaPathway;
  label: string;
  remedyType: LaRemedyType;
  citation: string;
}> = [
  {
    pathway: "no_conviction_expungement",
    label: laPathwayLabels.no_conviction_expungement,
    remedyType: "court_motion_expungement",
    citation: "La. Code Crim. Proc. arts. 976-977"
  },
  {
    pathway: "misdemeanor_conviction_expungement",
    label: laPathwayLabels.misdemeanor_conviction_expungement,
    remedyType: "court_motion_expungement",
    citation: "La. Code Crim. Proc. art. 977"
  },
  {
    pathway: "felony_conviction_expungement",
    label: laPathwayLabels.felony_conviction_expungement,
    remedyType: "court_motion_expungement",
    citation: "La. Code Crim. Proc. art. 978"
  },
  {
    pathway: "first_offense_marijuana_expungement",
    label: laPathwayLabels.first_offense_marijuana_expungement,
    remedyType: "court_motion_expungement",
    citation: "La. Code Crim. Proc. art. 998"
  },
  {
    pathway: "interim_expungement",
    label: laPathwayLabels.interim_expungement,
    remedyType: "interim_expungement",
    citation: "La. Code Crim. Proc. arts. 994-995"
  },
  {
    pathway: "expungement_by_redaction",
    label: laPathwayLabels.expungement_by_redaction,
    remedyType: "expungement_by_redaction",
    citation: "La. Code Crim. Proc. tit. XXXIV"
  },
  {
    pathway: "human_trafficking_victim",
    label: laPathwayLabels.human_trafficking_victim,
    remedyType: "court_motion_expungement",
    citation: "La. Code Crim. Proc. arts. 977-978"
  },
  {
    pathway: "automated_expungement",
    label: laPathwayLabels.automated_expungement,
    remedyType: "automated_expungement",
    citation: "La. Code Crim. Proc. art. 985.2"
  },
  {
    pathway: "immediate_expungement_after_program",
    label: laPathwayLabels.immediate_expungement_after_program,
    remedyType: "court_motion_expungement",
    citation: "La. Code Crim. Proc. art. 985.3"
  },
  {
    pathway: "needs_review",
    label: laPathwayLabels.needs_review,
    remedyType: "needs_review",
    citation: "La. Code Crim. Proc. tit. XXXIV"
  }
];
