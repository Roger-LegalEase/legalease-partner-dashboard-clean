// Montana record-clearing pathways.
// Source of truth: "Montana Expungement Reference for Wilma" (Nationwide Record
// Clearing / LegalEase Montana), corroborated by the cited Montana Code Annotated
// (MCA Title 46, ch. 18, part 11; § 44-5-202; § 46-18-204; § 16-12-113 MMRTA),
// Montana DOJ / CRISS and Montana Judicial Branch guidance, plus the official
// court packet/forms (srmisexp2025 misdemeanor packet; MMRTA Form A/B; DOJ
// Expungement/Removal Request) present in the source folder. Montana record-
// clearing is not one pathway: misdemeanor conviction expungement, non-conviction
// removal/sealing, deferred-sentence dismissal/confidentiality, and marijuana
// relief are distinct. Citations are Mont. Code Ann. unless otherwise noted. No
// content here is derived from any modeled form or legacy generator.

export type MtRemedyType =
  | "court_petition_expungement"
  | "agency_non_conviction_removal"
  | "deferred_dismissal_confidential"
  | "marijuana_expungement_resentencing_redesignation"
  | "needs_review";

export type MtPathway =
  | "misdemeanor_conviction_expungement"
  | "non_conviction_removal"
  | "deferred_sentence_dismissal"
  | "marijuana_relief"
  | "felony_non_marijuana_unavailable"
  | "needs_review";

export type MtEligibilitySignal =
  | "possible_misdemeanor_expungement"
  | "not_eligible_yet_five_year_clean_period"
  | "not_presumed_offense_category"
  | "prior_misdemeanor_expungement_used_block"
  | "possible_non_conviction_removal"
  | "possible_deferred_dismissal_confidential"
  | "deferred_not_yet_dismissed"
  | "possible_marijuana_relief"
  | "felony_non_marijuana_escalation"
  | "out_of_state_tribal_federal_block"
  | "attorney_or_legal_aid_review"
  | "needs_more_information";

export const mtPathwayLabels: Record<MtPathway, string> = {
  misdemeanor_conviction_expungement:
    "Misdemeanor conviction expungement — petition a District Court to expunge Montana misdemeanor records; 5-year clean period; once in a lifetime (Mont. Code Ann. Title 46, ch. 18, part 11; § 46-18-1104)",
  non_conviction_removal:
    "Non-conviction removal/sealing — dismissed, acquitted, dropped, not filed, or deferred-prosecution-dismissed records removed by Montana DOJ / CRISS (Mont. Code Ann. § 44-5-202)",
  deferred_sentence_dismissal:
    "Deferred-sentence dismissal — after the court dismisses a deferred imposition of sentence, records become confidential criminal justice information (Mont. Code Ann. § 46-18-204)",
  marijuana_relief:
    "Marijuana-related expungement, resentencing, or redesignation under the Montana Marijuana Regulation and Taxation Act; MMRTA Form A (currently serving) / Form B (completed) (Mont. Code Ann. § 16-12-113)",
  felony_non_marijuana_unavailable:
    "Non-marijuana felony convictions — no general Montana expungement path through the misdemeanor packet; escalate (deferred-dismissal, marijuana, or pardon only)",
  needs_review: "More information, a CRISS record/final judgment, or attorney review needed"
};

export const mtPathways: Array<{
  pathway: MtPathway;
  label: string;
  remedyType: MtRemedyType;
  citation: string;
}> = [
  {
    pathway: "misdemeanor_conviction_expungement",
    label: mtPathwayLabels.misdemeanor_conviction_expungement,
    remedyType: "court_petition_expungement",
    citation: "Mont. Code Ann. § 46-18-1104"
  },
  {
    pathway: "non_conviction_removal",
    label: mtPathwayLabels.non_conviction_removal,
    remedyType: "agency_non_conviction_removal",
    citation: "Mont. Code Ann. § 44-5-202"
  },
  {
    pathway: "deferred_sentence_dismissal",
    label: mtPathwayLabels.deferred_sentence_dismissal,
    remedyType: "deferred_dismissal_confidential",
    citation: "Mont. Code Ann. § 46-18-204"
  },
  {
    pathway: "marijuana_relief",
    label: mtPathwayLabels.marijuana_relief,
    remedyType: "marijuana_expungement_resentencing_redesignation",
    citation: "Mont. Code Ann. § 16-12-113"
  },
  {
    pathway: "felony_non_marijuana_unavailable",
    label: mtPathwayLabels.felony_non_marijuana_unavailable,
    remedyType: "needs_review",
    citation: "Mont. Code Ann. Title 46, ch. 18, part 11"
  },
  {
    pathway: "needs_review",
    label: mtPathwayLabels.needs_review,
    remedyType: "needs_review",
    citation: "Mont. Code Ann. Title 46, ch. 18, part 11"
  }
];
