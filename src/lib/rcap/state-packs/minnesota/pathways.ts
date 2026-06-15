// Minnesota record-clearing pathways.
// Source of truth: "Minnesota Expungement Reference for Wilma" (Nationwide
// Record Clearing / LegalEase Minnesota), corroborated by the cited Minnesota
// Statutes (Revisor's Office, Chapter 609A) and Minnesota Courts guidance, plus
// the official MN Judicial Branch EXP forms (EXP101-EXP107) present in the
// source folder. In Minnesota, "expungement" means SEALING the record from
// public view, not destruction. Citations are Minn. Stat. unless otherwise
// noted. No content here is derived from any modeled form or legacy generator.

export type MnRemedyType =
  | "court_petition_expungement"
  | "automatic_expungement"
  | "cannabis_relief"
  | "arrest_record_destruction"
  | "prosecutor_agreed_sealing"
  | "needs_review";

export type MnPathway =
  | "arrest_record_destruction"
  | "mistaken_identity_automatic"
  | "automatic_clean_slate"
  | "cannabis_automatic"
  | "cannabis_board_review"
  | "prosecutor_agreement"
  | "petition_based_expungement"
  | "needs_review";

export type MnEligibilitySignal =
  | "possible_arrest_record_destruction"
  | "possible_mistaken_identity_expungement"
  | "possible_automatic_clean_slate"
  | "possible_cannabis_automatic"
  | "possible_cannabis_board_review"
  | "possible_prosecutor_agreement"
  | "possible_petition_expungement"
  | "registration_offense_block"
  | "attorney_escalation_required"
  | "needs_more_information";

export const mnPathwayLabels: Record<MnPathway, string> = {
  arrest_record_destruction:
    "Arrest with no charges filed — request destruction of arrest identification data (Minn. Stat. § 299C.11); not the standard court petition",
  mistaken_identity_automatic:
    "Mistaken-identity dismissal — automatic expungement without a petition (Minn. Stat. § 609A.017)",
  automatic_clean_slate:
    "Automatic Clean Slate expungement — BCA-identified records sealed without a petition (Minn. Stat. § 609A.015)",
  cannabis_automatic:
    "Cannabis automatic expungement — certain nonfelony cannabis records sealed by the BCA (Minn. Stat. § 609A.055)",
  cannabis_board_review:
    "Cannabis Expungement Board review — felony and other cannabis cases reviewed for expungement/vacatur/resentencing (Minn. Stat. § 609A.06)",
  prosecutor_agreement:
    "Prosecutor-agreed sealing without a full petition for a § 609A.02 subd. 3 eligible person (Minn. Stat. § 609A.025)",
  petition_based_expungement:
    "Petition-based expungement — file under Minn. Stat. § 609A.03 if eligible under Minn. Stat. § 609A.02",
  needs_review: "More information, BCA/court record, or attorney review needed"
};

export const mnPathways: Array<{
  pathway: MnPathway;
  label: string;
  remedyType: MnRemedyType;
  citation: string;
  requiresPetition: boolean;
}> = [
  {
    pathway: "arrest_record_destruction",
    label: mnPathwayLabels.arrest_record_destruction,
    remedyType: "arrest_record_destruction",
    citation: "Minn. Stat. § 299C.11",
    requiresPetition: false
  },
  {
    pathway: "mistaken_identity_automatic",
    label: mnPathwayLabels.mistaken_identity_automatic,
    remedyType: "automatic_expungement",
    citation: "Minn. Stat. § 609A.017",
    requiresPetition: false
  },
  {
    pathway: "automatic_clean_slate",
    label: mnPathwayLabels.automatic_clean_slate,
    remedyType: "automatic_expungement",
    citation: "Minn. Stat. § 609A.015",
    requiresPetition: false
  },
  {
    pathway: "cannabis_automatic",
    label: mnPathwayLabels.cannabis_automatic,
    remedyType: "cannabis_relief",
    citation: "Minn. Stat. § 609A.055",
    requiresPetition: false
  },
  {
    pathway: "cannabis_board_review",
    label: mnPathwayLabels.cannabis_board_review,
    remedyType: "cannabis_relief",
    citation: "Minn. Stat. § 609A.06",
    requiresPetition: false
  },
  {
    pathway: "prosecutor_agreement",
    label: mnPathwayLabels.prosecutor_agreement,
    remedyType: "prosecutor_agreed_sealing",
    citation: "Minn. Stat. § 609A.025",
    requiresPetition: false
  },
  {
    pathway: "petition_based_expungement",
    label: mnPathwayLabels.petition_based_expungement,
    remedyType: "court_petition_expungement",
    citation: "Minn. Stat. §§ 609A.02, 609A.03",
    requiresPetition: true
  },
  {
    pathway: "needs_review",
    label: mnPathwayLabels.needs_review,
    remedyType: "needs_review",
    citation: "N/A",
    requiresPetition: false
  }
];
