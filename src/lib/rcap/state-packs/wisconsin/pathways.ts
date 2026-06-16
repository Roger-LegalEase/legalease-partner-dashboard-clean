// Wisconsin record-clearing pathways.
// Source of truth: "Wisconsin Expungement — Wilma Agent Training Reference"
// (Nationwide Record Clearing / LegalEase Wisconsin), corroborated by the cited
// Wisconsin Statutes (Wis. Stat. § 973.015 adult/youthful expungement and
// § 973.015(2m) trafficking-victim prostitution relief; § 942.08 invasion of
// privacy; § 944.30 prostitution; § 938.355(4m) juvenile adjudication expungement;
// § 165.84 / DOJ-CIB arrest fingerprint removal) and the official Wisconsin Court
// System CR-266/CR-267 forms. Wisconsin is one of the narrowest expungement states
// and adult expungement usually must be ordered AT SENTENCING. Citations are Wis.
// Stat. unless otherwise noted. No content here is derived from any modeled form or
// legacy generator.

export type WiRemedyType =
  | "adult_court_record_expungement"
  | "mandatory_youthful_invasion_of_privacy_expungement"
  | "trafficking_victim_vacate_or_expunge"
  | "doj_cib_arrest_fingerprint_removal"
  | "juvenile_adjudication_expungement"
  | "pardon_rights_restoration"
  | "needs_review";

export type WiPathway =
  | "adult_conviction_expungement_at_sentencing"
  | "youthful_invasion_of_privacy_mandatory_expungement"
  | "trafficking_victim_prostitution_relief"
  | "non_conviction_arrest_fingerprint_removal"
  | "juvenile_adjudication_expungement"
  | "pardon_rights_restoration"
  | "needs_review";

export type WiEligibilitySignal =
  | "possible_adult_expungement_ordered_at_sentencing"
  | "not_eligible_no_expungement_order_at_sentencing"
  | "needs_successful_completion_confirmation"
  | "needs_certificate_of_discharge"
  | "use_cr_266_non_probation_non_incarceration"
  | "possible_mandatory_youthful_invasion_of_privacy"
  | "possible_trafficking_victim_relief_973_015_2m"
  | "possible_doj_cib_arrest_fingerprint_removal"
  | "blocked_doj_removal_conviction_in_arrest_event"
  | "possible_juvenile_adjudication_expungement_after_17"
  | "pardon_not_expungement"
  | "not_eligible_civil_or_traffic_matter"
  | "attorney_or_legal_aid_review"
  | "needs_more_information";

export const wiPathwayLabels: Record<WiPathway, string> = {
  adult_conviction_expungement_at_sentencing:
    "Adult conviction expungement — under 25 at offense, maximum imprisonment 6 years or less, ordered by the judge AT SENTENCING, then effective after successful sentence completion; executed by certificate of discharge (probation/incarceration) or by CR-266/CR-267 (no probation/incarceration) (Wis. Stat. § 973.015)",
  youthful_invasion_of_privacy_mandatory_expungement:
    "Mandatory youthful invasion-of-privacy expungement — for certain § 942.08(2)(b),(c),(d) or (3) conduct committed under age 18, the court SHALL order expungement at sentencing upon successful completion (Wis. Stat. § 973.015; § 942.08)",
  trafficking_victim_prostitution_relief:
    "Human-trafficking / prostitution relief — a § 944.30 prostitution conviction/adjudication/NGI finding that resulted from being a trafficking victim may be vacated or expunged on motion, with DA notice and a benefit/no-harm finding; special manual-review route (Wis. Stat. § 973.015(2m))",
  non_conviction_arrest_fingerprint_removal:
    "Non-conviction arrest fingerprint removal — DOJ-CIB removal where the arrest ended in release without charge, no-file, dismissal, or acquittal and ALL charges from the arrest event are cleared; uses DJ-LE-250B, fingerprints required, no fee (Wis. Stat. § 165.84; Wisconsin DOJ-CIB process)",
  juvenile_adjudication_expungement:
    "Juvenile adjudication expungement — petition after reaching age 17 and satisfactorily completing the dispositional order, with a benefit/no-harm finding; uses JD-1780 (Wis. Stat. § 938.355(4m))",
  pardon_rights_restoration:
    "Pardon / rights restoration (NOT expungement) — a Governor's pardon does not remove the arrest from the criminal-history record; the disposition shows the pardon and may restore certain rights (Wisconsin DOJ pardon / rights-restoration process)",
  needs_review: "More information, the sentencing/order details, the DOJ-CIB record, or attorney review needed"
};

export const wiPathways: Array<{
  pathway: WiPathway;
  label: string;
  remedyType: WiRemedyType;
  citation: string;
}> = [
  {
    pathway: "adult_conviction_expungement_at_sentencing",
    label: wiPathwayLabels.adult_conviction_expungement_at_sentencing,
    remedyType: "adult_court_record_expungement",
    citation: "Wis. Stat. § 973.015"
  },
  {
    pathway: "youthful_invasion_of_privacy_mandatory_expungement",
    label: wiPathwayLabels.youthful_invasion_of_privacy_mandatory_expungement,
    remedyType: "mandatory_youthful_invasion_of_privacy_expungement",
    citation: "Wis. Stat. § 973.015; § 942.08"
  },
  {
    pathway: "trafficking_victim_prostitution_relief",
    label: wiPathwayLabels.trafficking_victim_prostitution_relief,
    remedyType: "trafficking_victim_vacate_or_expunge",
    citation: "Wis. Stat. § 973.015(2m); § 944.30"
  },
  {
    pathway: "non_conviction_arrest_fingerprint_removal",
    label: wiPathwayLabels.non_conviction_arrest_fingerprint_removal,
    remedyType: "doj_cib_arrest_fingerprint_removal",
    citation: "Wis. Stat. § 165.84; Wisconsin DOJ-CIB process"
  },
  {
    pathway: "juvenile_adjudication_expungement",
    label: wiPathwayLabels.juvenile_adjudication_expungement,
    remedyType: "juvenile_adjudication_expungement",
    citation: "Wis. Stat. § 938.355(4m)"
  },
  {
    pathway: "pardon_rights_restoration",
    label: wiPathwayLabels.pardon_rights_restoration,
    remedyType: "pardon_rights_restoration",
    citation: "Wisconsin DOJ pardon / rights-restoration process"
  },
  {
    pathway: "needs_review",
    label: wiPathwayLabels.needs_review,
    remedyType: "needs_review",
    citation: "Wis. Stat. § 973.015"
  }
];
