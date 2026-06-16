// South Dakota record-clearing pathways.
// Source of truth: "South Dakota Expungement Reference for Wilma" (Nationwide
// Record Clearing / LegalEase South Dakota), corroborated by the cited South
// Dakota Codified Laws (SDCL §§ 23A-3-26 to 23A-3-32 and § 23A-3-27 arrest
// expungement; §§ 23A-3-35 to 23A-3-37 diversion; § 23A-3-34 minor-case removal;
// §§ 23A-27-13 to 23A-27-17 suspended imposition of sentence; § 23A-27-53 drug
// deferred route; SDCL § 24-14-11 / Chapter 24-14 pardon sealing; §§ 26-7A-115 to
// 26-7A-116 juvenile delinquency sealing; § 26-7A-115.1 juvenile trafficking),
// the official South Dakota Unified Judicial System (UJS) expungement packet/forms
// (UJS-390 instructions, UJS-232, UJS-391 through UJS-395) present in the source
// folder. South Dakota is NARROW: the main adult "expungement" route is for
// arrest / non-conviction records, NOT broad adult conviction expungement.
// Separate sealing/removal routes exist for diversion, minor cases, suspended
// imposition of sentence, drug deferred cases, pardons, and juvenile records.
// Citations are SDCL unless otherwise noted. No content here is derived from any
// modeled form or legacy generator.

export type SdRemedyType =
  | "court_motion_arrest_expungement"
  | "automatic_diversion_expungement"
  | "automatic_minor_record_removal"
  | "sis_discharge_and_sealing"
  | "drug_deferred_dismissal"
  | "pardon_sealing"
  | "juvenile_sealing"
  | "juvenile_trafficking_expungement"
  | "needs_review";

export type SdPathway =
  | "adult_arrest_record_expungement"
  | "diversion_expungement"
  | "minor_case_automatic_removal"
  | "suspended_imposition_sealing"
  | "drug_deferred_dismissal"
  | "pardon_sealing"
  | "juvenile_delinquency_sealing"
  | "juvenile_trafficking_expungement"
  | "needs_review";

export type SdEligibilitySignal =
  | "likely_eligible_no_accusatory_instrument_1_year"
  | "likely_eligible_formal_dismissal_1_year"
  | "likely_eligible_acquittal_anytime"
  | "possible_compelling_necessity_dismissal_within_1_year"
  | "not_eligible_yet_waiting_period"
  | "needs_disposition_or_dismissal_order"
  | "likely_eligible_diversion_auto_expungement"
  | "possible_auto_public_record_removal_minor_offense_5_years"
  | "possible_sis_discharge_and_sealing"
  | "possible_drug_deferred_imposition_23a_27_53"
  | "possible_pardon_sealing_chapter_24_14"
  | "possible_juvenile_delinquency_sealing"
  | "possible_juvenile_trafficking_expungement"
  | "attorney_or_legal_aid_review"
  | "needs_more_information";

export const sdPathwayLabels: Record<SdPathway, string> = {
  adult_arrest_record_expungement:
    "Adult arrest-record expungement — motion to the court with jurisdiction to seal an arrest/non-conviction record where no accusatory instrument was filed (1 yr from arrest), the case was formally dismissed (1 yr from dismissal, or within 1 yr on compelling necessity), or the person was acquitted (anytime); clear-and-convincing standard (SDCL §§ 23A-3-26 to 23A-3-32; § 23A-3-27)",
  diversion_expungement:
    "Diversion expungement — automatic expungement of the entire arrest record after successful diversion if no new crime (other than petty/minor traffic) within 1 year and 30 days; State's Attorney files dismissal + completion notice and the court grants without a motion (SDCL §§ 23A-3-35 to 23A-3-37)",
  minor_case_automatic_removal:
    "Automatic public-record removal for minor cases — petty offense, municipal ordinance violation, or Class 2 misdemeanor as highest charge removed from the public record after 5 years if conditions satisfied and no new convictions; record may still be used by the court or to enhance later penalties (SDCL § 23A-3-34)",
  suspended_imposition_sealing:
    "Suspended imposition of sentence (SIS) sealing — after discharge and dismissal on a completed suspended imposition, the court seals official records other than retained nonpublic DCI records; once per felony and once per misdemeanor (SDCL §§ 23A-27-13 to 23A-27-17)",
  drug_deferred_dismissal:
    "Controlled-substance deferred route — for certain drug cases, the court may defer and, after 1 year plus treatment/condition completion, must dismiss the original charge; not available with aggravating circumstances or while serving an executive-branch sentence (SDCL § 23A-27-53)",
  pardon_sealing:
    "Pardon-based sealing — a Governor's pardon through the Chapter 24-14 Board of Pardons and Paroles process; the Governor orders related records sealed; a pardon is NOT expungement and may still count as a prior conviction in later sentencing (SDCL § 24-14-11; Chapter 24-14)",
  juvenile_delinquency_sealing:
    "Juvenile delinquency sealing — petition to seal juvenile delinquency records, filed only after 1 year from unconditional release / DOC discharge, with no later adjudication, no pending serious proceeding, and a rehabilitation showing (SDCL §§ 26-7A-115 to 26-7A-116)",
  juvenile_trafficking_expungement:
    "Juvenile trafficking expungement — a child who was a victim of human trafficking or sexual exploitation may petition to expunge a delinquency record that resulted from it; expungement vacates the underlying delinquency proceeding (SDCL § 26-7A-115.1)",
  needs_review: "More information, a disposition/dismissal order, or attorney review needed"
};

export const sdPathways: Array<{
  pathway: SdPathway;
  label: string;
  remedyType: SdRemedyType;
  citation: string;
}> = [
  {
    pathway: "adult_arrest_record_expungement",
    label: sdPathwayLabels.adult_arrest_record_expungement,
    remedyType: "court_motion_arrest_expungement",
    citation: "SDCL § 23A-3-27"
  },
  {
    pathway: "diversion_expungement",
    label: sdPathwayLabels.diversion_expungement,
    remedyType: "automatic_diversion_expungement",
    citation: "SDCL §§ 23A-3-35 to 23A-3-37"
  },
  {
    pathway: "minor_case_automatic_removal",
    label: sdPathwayLabels.minor_case_automatic_removal,
    remedyType: "automatic_minor_record_removal",
    citation: "SDCL § 23A-3-34"
  },
  {
    pathway: "suspended_imposition_sealing",
    label: sdPathwayLabels.suspended_imposition_sealing,
    remedyType: "sis_discharge_and_sealing",
    citation: "SDCL §§ 23A-27-13 to 23A-27-17"
  },
  {
    pathway: "drug_deferred_dismissal",
    label: sdPathwayLabels.drug_deferred_dismissal,
    remedyType: "drug_deferred_dismissal",
    citation: "SDCL § 23A-27-53"
  },
  {
    pathway: "pardon_sealing",
    label: sdPathwayLabels.pardon_sealing,
    remedyType: "pardon_sealing",
    citation: "SDCL § 24-14-11"
  },
  {
    pathway: "juvenile_delinquency_sealing",
    label: sdPathwayLabels.juvenile_delinquency_sealing,
    remedyType: "juvenile_sealing",
    citation: "SDCL §§ 26-7A-115 to 26-7A-116"
  },
  {
    pathway: "juvenile_trafficking_expungement",
    label: sdPathwayLabels.juvenile_trafficking_expungement,
    remedyType: "juvenile_trafficking_expungement",
    citation: "SDCL § 26-7A-115.1"
  },
  {
    pathway: "needs_review",
    label: sdPathwayLabels.needs_review,
    remedyType: "needs_review",
    citation: "SDCL §§ 23A-3-26 to 23A-3-32"
  }
];
