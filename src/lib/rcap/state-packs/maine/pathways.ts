// Maine record-clearing pathways.
// Source of truth: "Maine Criminal Record Sealing — Wilma Agent Training
// Reference" (Nationwide Record Clearing / LegalEase Maine), corroborated by the
// cited Maine statutes (15 M.R.S. §§ 2261-2265, § 2262-A, § 2262-B, § 3308-C; 16
// M.R.S. §§ 703, 705, 709) and Maine Judicial Branch guidance, plus the official
// Maine Judicial Branch form PDFs (CR-218, CR-289, JV-043) in the source folder.
// In Maine the adult remedy is SEALING, NOT expungement: Maine does not erase or
// expunge adult criminal records; sealing restricts public disclosure while
// courts, criminal-justice agencies, and other authorized entities may still
// access the record. Citations are M.R.S. unless otherwise noted. No content here
// is derived from any modeled form or legacy generator.

export type MeRemedyType =
  | "court_motion_sealing"
  | "survivor_sealing"
  | "automatic_juvenile_sealing"
  | "juvenile_petition_sealing"
  | "confidential_criminal_history"
  | "pardon_confidentiality"
  | "needs_review";

export type MePathway =
  | "general_adult_conviction_sealing"
  | "engaging_in_prostitution_sealing"
  | "trafficking_survivor_sealing"
  | "non_conviction_confidentiality"
  | "pardon_confidentiality"
  | "juvenile_automatic_sealing"
  | "juvenile_petition_sealing"
  | "needs_review";

export type MeEligibilitySignal =
  | "possible_general_adult_sealing"
  | "not_eligible_yet_four_year_wait"
  | "excluded_chapter_11_offense"
  | "possible_engaging_in_prostitution_sealing"
  | "possible_trafficking_survivor_sealing"
  | "likely_confidential_criminal_history_route"
  | "pardon_confidentiality_route"
  | "possible_juvenile_automatic_sealing"
  | "possible_juvenile_petition_sealing"
  | "attorney_or_legal_aid_review"
  | "needs_more_information";

export const mePathwayLabels: Record<MePathway, string> = {
  general_adult_conviction_sealing:
    "General adult conviction sealing — current/former Class E (except Title 17-A ch. 11) or listed pre-2017 marijuana convictions, 4-year clean period (15 M.R.S. §§ 2261-2264; form CR-218)",
  engaging_in_prostitution_sealing:
    "Sealing of a former Class E engaging-in-prostitution conviction, 1-year wait (15 M.R.S. § 2262-A; form CR-289)",
  trafficking_survivor_sealing:
    "Sex-trafficking / sexual-exploitation survivor sealing — any current/former conviction substantially caused by trafficking/exploitation, no ordinary wait (15 M.R.S. § 2262-B; PL 2025 ch. 513)",
  non_conviction_confidentiality:
    "Non-conviction records — handled through Maine's confidential criminal-history framework, not the CR-218 conviction-sealing motion (16 M.R.S. §§ 703, 705)",
  pardon_confidentiality:
    "Pardon route — a full/free pardon makes the conviction confidential criminal-history information; it is not expungement and does not wipe the record clean",
  juvenile_automatic_sealing:
    "Juvenile automatic sealing for Class D/E or civil-type juvenile crimes — sealed within 5 business days after a Notice of Discharge (15 M.R.S. § 3308-C)",
  juvenile_petition_sealing:
    "Juvenile petition sealing for murder/Class A/B/C/OUI juvenile adjudications, 3-year wait (15 M.R.S. § 3308-C; form JV-043)",
  needs_review: "More information, an SBI record, or attorney/legal-aid review needed"
};

export const mePathways: Array<{
  pathway: MePathway;
  label: string;
  remedyType: MeRemedyType;
  citation: string;
}> = [
  {
    pathway: "general_adult_conviction_sealing",
    label: mePathwayLabels.general_adult_conviction_sealing,
    remedyType: "court_motion_sealing",
    citation: "15 M.R.S. §§ 2261-2264"
  },
  {
    pathway: "engaging_in_prostitution_sealing",
    label: mePathwayLabels.engaging_in_prostitution_sealing,
    remedyType: "court_motion_sealing",
    citation: "15 M.R.S. § 2262-A"
  },
  {
    pathway: "trafficking_survivor_sealing",
    label: mePathwayLabels.trafficking_survivor_sealing,
    remedyType: "survivor_sealing",
    citation: "15 M.R.S. § 2262-B"
  },
  {
    pathway: "non_conviction_confidentiality",
    label: mePathwayLabels.non_conviction_confidentiality,
    remedyType: "confidential_criminal_history",
    citation: "16 M.R.S. §§ 703, 705"
  },
  {
    pathway: "pardon_confidentiality",
    label: mePathwayLabels.pardon_confidentiality,
    remedyType: "pardon_confidentiality",
    citation: "16 M.R.S. § 703"
  },
  {
    pathway: "juvenile_automatic_sealing",
    label: mePathwayLabels.juvenile_automatic_sealing,
    remedyType: "automatic_juvenile_sealing",
    citation: "15 M.R.S. § 3308-C"
  },
  {
    pathway: "juvenile_petition_sealing",
    label: mePathwayLabels.juvenile_petition_sealing,
    remedyType: "juvenile_petition_sealing",
    citation: "15 M.R.S. § 3308-C"
  },
  {
    pathway: "needs_review",
    label: mePathwayLabels.needs_review,
    remedyType: "needs_review",
    citation: "15 M.R.S. § 2261"
  }
];
