// Maryland record-clearing pathways.
// Source of truth: "Maryland Expungement & Shielding — Wilma Agent Training
// Reference" (Nationwide Record Clearing / LegalEase Maryland). Citations are
// Md. Code, Criminal Procedure unless otherwise noted. No legal content here is
// derived from legacy generators or the LegalEase "modeled" HTML form artifact.

export type MdRemedyType =
  | "adult_expungement"
  | "automatic_expungement"
  | "cannabis_expungement"
  | "police_record_expungement"
  | "second_chance_shielding"
  | "juvenile_expungement"
  | "needs_review";

export type MdPathway =
  | "adult_nonconviction_expungement"
  | "automatic_expungement"
  | "early_favorable_filing"
  | "police_record_expungement"
  | "adult_conviction_expungement"
  | "cannabis_expungement"
  | "second_chance_shielding"
  | "juvenile_expungement"
  | "needs_review";

export type MdEligibilitySignal =
  | "possible_nonconviction_expungement"
  | "possible_automatic_expungement"
  | "possible_conviction_expungement"
  | "possible_cannabis_expungement"
  | "possible_police_record_expungement"
  | "possible_second_chance_shielding"
  | "possible_juvenile_expungement"
  | "unit_rule_manual_review"
  | "needs_more_information"
  | "attorney_or_legal_aid_review";

export const mdPathwayLabels: Record<MdPathway, string> = {
  adult_nonconviction_expungement:
    "Adult non-conviction expungement — acquittal, dismissal, nolle prosequi, PBJ, stet, NCR, juvenile transfer, compromise (Crim. Proc. § 10-105)",
  automatic_expungement:
    "Automatic expungement — all-favorable case on or after Oct. 1, 2021, court-initiated after 3 years (Crim. Proc. § 10-105.1)",
  early_favorable_filing:
    "Early petition for an all-favorable case before the 3-year automatic period, Form CC-DC-CR-072C (Crim. Proc. § 10-105.1)",
  police_record_expungement:
    "Police-record expungement — arrest with no charge filed, after agency denial or no action for more than 60 days, Form DC-CR-071 (Crim. Proc. § 10-103)",
  adult_conviction_expungement:
    "Eligible conviction expungement — exact statute must be on the § 10-110 eligible list (Crim. Proc. § 10-110)",
  cannabis_expungement:
    "Cannabis-specific expungement — possession or possession with intent to distribute, Form CC-DC-CR-072D (Crim. Proc. §§ 10-105, 10-110)",
  second_chance_shielding:
    "Maryland Second Chance Act shielding — public shielding of an eligible conviction, one lifetime petition (Crim. Proc. §§ 10-301 to 10-306)",
  juvenile_expungement:
    "Juvenile / minor record expungement — separate process, no filing fee (Cts. & Jud. Proc. § 3-8A-27.1; Md. Rule 11-506)",
  needs_review: "More information, full case record, or counsel review needed"
};

export const mdPathways: Array<{
  pathway: MdPathway;
  label: string;
  remedyType: MdRemedyType;
  citation: string;
}> = [
  {
    pathway: "adult_nonconviction_expungement",
    label: mdPathwayLabels.adult_nonconviction_expungement,
    remedyType: "adult_expungement",
    citation: "Md. Code, Crim. Proc. § 10-105"
  },
  {
    pathway: "automatic_expungement",
    label: mdPathwayLabels.automatic_expungement,
    remedyType: "automatic_expungement",
    citation: "Md. Code, Crim. Proc. § 10-105.1"
  },
  {
    pathway: "early_favorable_filing",
    label: mdPathwayLabels.early_favorable_filing,
    remedyType: "automatic_expungement",
    citation: "Md. Code, Crim. Proc. § 10-105.1"
  },
  {
    pathway: "police_record_expungement",
    label: mdPathwayLabels.police_record_expungement,
    remedyType: "police_record_expungement",
    citation: "Md. Code, Crim. Proc. § 10-103"
  },
  {
    pathway: "adult_conviction_expungement",
    label: mdPathwayLabels.adult_conviction_expungement,
    remedyType: "adult_expungement",
    citation: "Md. Code, Crim. Proc. § 10-110"
  },
  {
    pathway: "cannabis_expungement",
    label: mdPathwayLabels.cannabis_expungement,
    remedyType: "cannabis_expungement",
    citation: "Md. Code, Crim. Proc. §§ 10-105, 10-110"
  },
  {
    pathway: "second_chance_shielding",
    label: mdPathwayLabels.second_chance_shielding,
    remedyType: "second_chance_shielding",
    citation: "Md. Code, Crim. Proc. §§ 10-301 to 10-306"
  },
  {
    pathway: "juvenile_expungement",
    label: mdPathwayLabels.juvenile_expungement,
    remedyType: "juvenile_expungement",
    citation: "Md. Code, Cts. & Jud. Proc. § 3-8A-27.1"
  },
  {
    pathway: "needs_review",
    label: mdPathwayLabels.needs_review,
    remedyType: "needs_review",
    citation: "N/A"
  }
];
