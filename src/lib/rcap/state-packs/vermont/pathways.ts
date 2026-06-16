// Vermont record-clearing pathways.
// Source of truth: "Vermont Expungement & Sealing — Wilma Agent Training
// Reference" (Nationwide Record Clearing / LegalEase Vermont), corroborated by the
// cited Vermont Statutes Annotated (13 V.S.A. §§ 7601–7611 adult sealing/
// expungement, § 7602 expungement/sealing requirements, § 7601(4)(B) qualifying
// felony list, § 7609 age 18–21 sealing; 23 V.S.A. § 1201(a) DUI; 33 V.S.A. § 5119
// youth/juvenile sealing) and Vermont Judiciary guidance. Vermont is SEALING-FIRST
// and expungement-NARROW after July 1, 2025. Citations are V.S.A. unless otherwise
// noted. No content here is derived from any modeled form or legacy generator.

export type VtRemedyType =
  | "expungement_conduct_no_longer_criminal"
  | "sealing_misdemeanor"
  | "sealing_felony"
  | "sealing_dui"
  | "sealing_non_conviction"
  | "sealing_young_adult_18_21"
  | "sealing_under_25"
  | "juvenile_sealing"
  | "needs_review";

export type VtPathway =
  | "adult_expungement_conduct_no_longer_criminal"
  | "misdemeanor_sealing"
  | "felony_sealing"
  | "dui_sealing"
  | "non_conviction_sealing"
  | "young_adult_18_21_sealing"
  | "under_25_sealing"
  | "juvenile_sealing"
  | "needs_review";

export type VtEligibilitySignal =
  | "possible_expungement_conduct_no_longer_criminal"
  | "likely_misdemeanor_sealing_3_years"
  | "possible_felony_sealing_7_years_qualifying_list"
  | "possible_dui_sealing_10_years_no_cdl"
  | "likely_non_conviction_sealing_60_days"
  | "possible_young_adult_18_21_sealing_30_days"
  | "possible_under_25_sealing_2_years"
  | "possible_juvenile_sealing"
  | "not_eligible_excluded_qualifying_crime"
  | "blocked_pending_charge"
  | "blocked_denied_petition_2_year_wait"
  | "attorney_or_legal_aid_review"
  | "needs_more_information";

export const vtPathwayLabels: Record<VtPathway, string> = {
  adult_expungement_conduct_no_longer_criminal:
    "Adult conviction expungement (narrow) — only where the underlying conduct is no longer prohibited or no longer a criminal offense; granted after sentence/supervision complete and restitution/surcharges paid (or waived). Expungement annuls the record and the case file is destroyed when all docket charges are expunged (13 V.S.A. § 7602)",
  misdemeanor_sealing:
    "Adult misdemeanor sealing — qualifying misdemeanors sealable 3 years after sentence completion, restitution/surcharges paid (or waived), unless the prosecutor shows sealing is contrary to the interests of justice; excluded qualifying-crime categories do not qualify (13 V.S.A. § 7602(c))",
  felony_sealing:
    "Adult felony sealing — only felonies on the qualifying list (certain burglary, designated property offenses, certain regulated-drug offenses, or any offense with a Governor's unconditional pardon) sealable 7 years after sentence completion (13 V.S.A. § 7602(d); § 7601(4)(B))",
  dui_sealing:
    "DUI sealing — a qualifying DUI misdemeanor sealable 10 years after sentence completion if the person is not a CDL/commercial-permit holder; a DUI committed under age 25 may use the under-25 route instead (13 V.S.A. § 7602(e); 23 V.S.A. § 1201(a))",
  non_conviction_sealing:
    "Non-conviction sealing — court should seal within 60 days after final disposition (no probable cause at arraignment, dismissal before trial, or acquittal) unless a party objects in the interests of justice; a petition or prosecutor stipulation can also be filed at any time (13 V.S.A. §§ 7601–7611)",
  young_adult_18_21_sealing:
    "Young adult sealing (age 18–21) — petition to seal a qualifying crime 30 days after completing the sentence, restitution/surcharges paid or waived; a docket mixing qualifying and nonqualifying offenses is not eligible (13 V.S.A. § 7609)",
  under_25_sealing:
    "Under-25 sealing — court shall seal a Vermont crime committed before age 25 if 2 years have passed since final discharge, no listed-crime conviction/adjudication in the prior 10 years, no pending listed-crime proceeding, and rehabilitation is shown (33 V.S.A. § 5119(g))",
  juvenile_sealing:
    "Juvenile sealing — delinquency records generally sealed 2 years after final discharge (adjudications on/after July 1, 1996) absent a State's Attorney objection and listed-crime/rehabilitation finding; dismissed juvenile matters sealed immediately or after 2 years for older cases (33 V.S.A. § 5119)",
  needs_review: "More information, the docket/disposition, a VCIC record check, or attorney review needed"
};

export const vtPathways: Array<{
  pathway: VtPathway;
  label: string;
  remedyType: VtRemedyType;
  citation: string;
}> = [
  {
    pathway: "adult_expungement_conduct_no_longer_criminal",
    label: vtPathwayLabels.adult_expungement_conduct_no_longer_criminal,
    remedyType: "expungement_conduct_no_longer_criminal",
    citation: "13 V.S.A. § 7602"
  },
  {
    pathway: "misdemeanor_sealing",
    label: vtPathwayLabels.misdemeanor_sealing,
    remedyType: "sealing_misdemeanor",
    citation: "13 V.S.A. § 7602(c)"
  },
  {
    pathway: "felony_sealing",
    label: vtPathwayLabels.felony_sealing,
    remedyType: "sealing_felony",
    citation: "13 V.S.A. § 7602(d); § 7601(4)(B)"
  },
  {
    pathway: "dui_sealing",
    label: vtPathwayLabels.dui_sealing,
    remedyType: "sealing_dui",
    citation: "13 V.S.A. § 7602(e); 23 V.S.A. § 1201(a)"
  },
  {
    pathway: "non_conviction_sealing",
    label: vtPathwayLabels.non_conviction_sealing,
    remedyType: "sealing_non_conviction",
    citation: "13 V.S.A. §§ 7601–7611"
  },
  {
    pathway: "young_adult_18_21_sealing",
    label: vtPathwayLabels.young_adult_18_21_sealing,
    remedyType: "sealing_young_adult_18_21",
    citation: "13 V.S.A. § 7609"
  },
  {
    pathway: "under_25_sealing",
    label: vtPathwayLabels.under_25_sealing,
    remedyType: "sealing_under_25",
    citation: "33 V.S.A. § 5119(g)"
  },
  {
    pathway: "juvenile_sealing",
    label: vtPathwayLabels.juvenile_sealing,
    remedyType: "juvenile_sealing",
    citation: "33 V.S.A. § 5119"
  },
  {
    pathway: "needs_review",
    label: vtPathwayLabels.needs_review,
    remedyType: "needs_review",
    citation: "13 V.S.A. §§ 7601–7611"
  }
];
