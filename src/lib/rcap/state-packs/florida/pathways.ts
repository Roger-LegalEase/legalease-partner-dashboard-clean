// Florida record-clearing pathways.
// Source of truth: "Florida Sealing & Expungement — Wilma Agent Training
// Reference" (Nationwide Record Clearing / LegalEase Florida), corroborated
// throughout by the cited Florida Statutes (Online Sunshine) and FDLE
// seal-and-expunge process pages. Florida's statutory term is "expunction"
// (commonly called expungement); the agency is the Florida Department of Law
// Enforcement (FDLE). Citations are Fla. Stat. unless otherwise noted. No
// content here is derived from the LegalEase "modeled" HTML form artifact or any
// legacy generator.

export type FlRemedyType =
  | "court_ordered_expunction"
  | "court_ordered_sealing"
  | "automatic_sealing"
  | "special_expunction"
  | "administrative_expunction"
  | "needs_review";

export type FlPathway =
  | "court_ordered_expunction"
  | "court_ordered_sealing"
  | "automatic_sealing"
  | "human_trafficking_victim_expunction"
  | "lawful_self_defense_expunction"
  | "juvenile_diversion_expunction"
  | "early_juvenile_expunction"
  | "administrative_expunction"
  | "needs_review";

export type FlEligibilitySignal =
  | "possible_court_ordered_expunction"
  | "possible_court_ordered_sealing"
  | "possible_automatic_sealing"
  | "possible_human_trafficking_expunction"
  | "possible_self_defense_expunction"
  | "possible_juvenile_diversion_expunction"
  | "possible_early_juvenile_expunction"
  | "possible_administrative_expunction"
  | "barred_offense_block"
  | "certificate_of_eligibility_required"
  | "needs_more_information"
  | "attorney_or_legal_aid_review";

export const flPathwayLabels: Record<FlPathway, string> = {
  court_ordered_expunction:
    "Court-ordered expunction — non-conviction cases (no charge, dismissed, nolle prosequi, acquittal, not guilty); FDLE certificate required (Fla. Stat. § 943.0585)",
  court_ordered_sealing:
    "Court-ordered sealing — usually withhold of adjudication; FDLE certificate required (Fla. Stat. § 943.059)",
  automatic_sealing:
    "Automatic sealing — FDLE seals qualifying favorable outcomes after the clerk transmits the certified disposition (Fla. Stat. § 943.0595)",
  human_trafficking_victim_expunction:
    "Human-trafficking victim expunction — can reach records regardless of disposition if tied to trafficking (Fla. Stat. § 943.0583)",
  lawful_self_defense_expunction:
    "Lawful self-defense expunction — prosecutor certifies no-file/dismissal due to lawful self-defense (Fla. Stat. § 943.0578)",
  juvenile_diversion_expunction:
    "Juvenile diversion expunction — minor completed an authorized diversion program (Fla. Stat. § 943.0582)",
  early_juvenile_expunction:
    "Early juvenile expunction — applicant age 18-20 with a 5-year clean period (Fla. Stat. § 943.0515)",
  administrative_expunction:
    "Administrative expunction — arrest made by mistake or contrary to law, via FDLE with agency/prosecutor endorsement (Fla. Stat. § 943.0581)",
  needs_review: "More information, FDLE criminal history, or counsel review needed"
};

export const flPathways: Array<{
  pathway: FlPathway;
  label: string;
  remedyType: FlRemedyType;
  citation: string;
  certificateRequired: boolean;
}> = [
  {
    pathway: "court_ordered_expunction",
    label: flPathwayLabels.court_ordered_expunction,
    remedyType: "court_ordered_expunction",
    citation: "Fla. Stat. § 943.0585",
    certificateRequired: true
  },
  {
    pathway: "court_ordered_sealing",
    label: flPathwayLabels.court_ordered_sealing,
    remedyType: "court_ordered_sealing",
    citation: "Fla. Stat. § 943.059",
    certificateRequired: true
  },
  {
    pathway: "automatic_sealing",
    label: flPathwayLabels.automatic_sealing,
    remedyType: "automatic_sealing",
    citation: "Fla. Stat. § 943.0595",
    certificateRequired: false
  },
  {
    pathway: "human_trafficking_victim_expunction",
    label: flPathwayLabels.human_trafficking_victim_expunction,
    remedyType: "special_expunction",
    citation: "Fla. Stat. § 943.0583",
    certificateRequired: false
  },
  {
    pathway: "lawful_self_defense_expunction",
    label: flPathwayLabels.lawful_self_defense_expunction,
    remedyType: "special_expunction",
    citation: "Fla. Stat. § 943.0578",
    certificateRequired: false
  },
  {
    pathway: "juvenile_diversion_expunction",
    label: flPathwayLabels.juvenile_diversion_expunction,
    remedyType: "special_expunction",
    citation: "Fla. Stat. § 943.0582",
    certificateRequired: false
  },
  {
    pathway: "early_juvenile_expunction",
    label: flPathwayLabels.early_juvenile_expunction,
    remedyType: "special_expunction",
    citation: "Fla. Stat. § 943.0515",
    certificateRequired: false
  },
  {
    pathway: "administrative_expunction",
    label: flPathwayLabels.administrative_expunction,
    remedyType: "administrative_expunction",
    citation: "Fla. Stat. § 943.0581",
    certificateRequired: false
  },
  {
    pathway: "needs_review",
    label: flPathwayLabels.needs_review,
    remedyType: "needs_review",
    citation: "N/A",
    certificateRequired: false
  }
];
