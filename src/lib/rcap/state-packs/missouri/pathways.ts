// Missouri record-clearing pathways.
// Source of truth: "Missouri Expungement Reference for Wilma" (Nationwide Record
// Clearing / LegalEase Missouri), corroborated by the cited Missouri Revised
// Statutes (Revisor of Statutes) and the Missouri Constitution Art. XIV, plus
// official Missouri court form PDFs in the source folder. Missouri's main
// statute is RSMo § 610.140 (effective January 1, 2025). Citations are RSMo
// (Mo. Rev. Stat.) unless noted. No content here is derived from the
// "Modified-MSPD" pro se form or any legacy generator.

export type MoRemedyType =
  | "court_petition_expungement"
  | "automatic_closure"
  | "arrest_record_destruction"
  | "marijuana_vacatur_expungement"
  | "identity_correction_expungement"
  | "needs_review";

export type MoPathway =
  | "general_expungement"
  | "arrest_only_expungement"
  | "closed_record"
  | "false_information_arrest"
  | "first_intoxication_offense"
  | "marijuana_expungement"
  | "identity_theft_mistaken_identity"
  | "minor_in_possession_alcohol"
  | "needs_review";

export type MoEligibilitySignal =
  | "possible_general_expungement"
  | "possible_arrest_only_18_months"
  | "possible_already_closed_610_105"
  | "possible_false_information_arrest"
  | "possible_first_intoxication_offense"
  | "possible_marijuana_relief"
  | "possible_identity_mistaken_identity"
  | "possible_minor_in_possession"
  | "excluded_offense_block"
  | "lifetime_limit_review"
  | "attorney_or_legal_aid_review"
  | "needs_more_information";

export const moPathwayLabels: Record<MoPathway, string> = {
  general_expungement:
    "General expungement of arrest/charge/plea/trial/conviction records (Mo. Rev. Stat. § 610.140)",
  arrest_only_expungement:
    "Arrest-only expungement, no earlier than 18 months from arrest with no charge/conviction since (Mo. Rev. Stat. § 610.140)",
  closed_record:
    "Closed-record outcome by operation of law — nolle prosequi, dismissal, not guilty, or SIS after final termination (Mo. Rev. Stat. § 610.105)",
  false_information_arrest:
    "Arrest expungement — false-information / no-probable-cause arrest, or qualifying dismissed/not-guilty moving violation (Mo. Rev. Stat. §§ 610.122-610.123)",
  first_intoxication_offense:
    "First intoxication-related traffic/boating offense expungement after 10 years (Mo. Rev. Stat. § 610.130)",
  marijuana_expungement:
    "Marijuana expungement — automatic and petition-based relief, including vacatur (Mo. Const. Art. XIV, § 2)",
  identity_theft_mistaken_identity:
    "Stolen or mistaken identity expungement — wrong person named (Mo. Rev. Stat. § 610.145)",
  minor_in_possession_alcohol:
    "First-time minor-in-possession-of-alcohol expungement (Mo. Rev. Stat. § 311.326)",
  needs_review: "More information, certified court disposition, or attorney review needed"
};

export const moPathways: Array<{
  pathway: MoPathway;
  label: string;
  remedyType: MoRemedyType;
  citation: string;
}> = [
  {
    pathway: "general_expungement",
    label: moPathwayLabels.general_expungement,
    remedyType: "court_petition_expungement",
    citation: "Mo. Rev. Stat. § 610.140"
  },
  {
    pathway: "arrest_only_expungement",
    label: moPathwayLabels.arrest_only_expungement,
    remedyType: "court_petition_expungement",
    citation: "Mo. Rev. Stat. § 610.140"
  },
  {
    pathway: "closed_record",
    label: moPathwayLabels.closed_record,
    remedyType: "automatic_closure",
    citation: "Mo. Rev. Stat. § 610.105"
  },
  {
    pathway: "false_information_arrest",
    label: moPathwayLabels.false_information_arrest,
    remedyType: "arrest_record_destruction",
    citation: "Mo. Rev. Stat. §§ 610.122, 610.123"
  },
  {
    pathway: "first_intoxication_offense",
    label: moPathwayLabels.first_intoxication_offense,
    remedyType: "court_petition_expungement",
    citation: "Mo. Rev. Stat. § 610.130"
  },
  {
    pathway: "marijuana_expungement",
    label: moPathwayLabels.marijuana_expungement,
    remedyType: "marijuana_vacatur_expungement",
    citation: "Mo. Const. Art. XIV, § 2"
  },
  {
    pathway: "identity_theft_mistaken_identity",
    label: moPathwayLabels.identity_theft_mistaken_identity,
    remedyType: "identity_correction_expungement",
    citation: "Mo. Rev. Stat. § 610.145"
  },
  {
    pathway: "minor_in_possession_alcohol",
    label: moPathwayLabels.minor_in_possession_alcohol,
    remedyType: "court_petition_expungement",
    citation: "Mo. Rev. Stat. § 311.326"
  },
  {
    pathway: "needs_review",
    label: moPathwayLabels.needs_review,
    remedyType: "needs_review",
    citation: "N/A"
  }
];
