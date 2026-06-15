// Nevada record-sealing pathways.
// Source of truth: "Nevada Record-Sealing Reference for Wilma" (Nationwide
// Record Clearing / LegalEase Nevada), corroborated by the cited Nevada Revised
// Statutes (NRS) and Nevada State Police / RCCD, Clark County District Attorney,
// and Nevada Legal Services guidance referenced therein, plus the official
// Nevada district-court / justice-court record-sealing form PDFs present in the
// source folder. In Nevada the remedy is RECORD SEALING, not expungement:
// sealing restricts public dissemination but does not destroy the record.
// Citations are NRS unless otherwise noted. No content here is derived from any
// modeled LegalEase form or legacy generator.

export type NvRemedyType =
  | "court_petition_sealing"
  | "deferred_judgment_sealing"
  | "probation_specialty_sealing"
  | "vacatur_and_sealing"
  | "administrative_repository_removal"
  | "needs_review";

export type NvPathway =
  | "conviction_record_sealing"
  | "dismissal_declined_acquittal"
  | "multiple_records_multiple_courts"
  | "deferred_judgment_dismissal"
  | "probation_specialty_dismissal"
  | "reentry_program_sealing"
  | "decriminalized_offense"
  | "controlled_substance_possession"
  | "trafficking_victim_vacatur"
  | "favorable_disposition_repository_removal"
  | "needs_review";

export type NvEligibilitySignal =
  | "possible_conviction_sealing"
  | "possible_dismissed_or_acquitted_no_wait"
  | "possible_declined_prosecution_sol_or_8_years"
  | "possible_single_district_court_petition_multiple_records"
  | "possible_deferred_judgment_dismissal"
  | "possible_probation_or_specialty_sealing"
  | "possible_reentry_program_sealing"
  | "possible_decriminalized_offense"
  | "possible_controlled_substance_possession_sealing"
  | "possible_trafficking_victim_vacatur"
  | "possible_repository_removal_favorable_disposition"
  | "excluded_conviction_block"
  | "pending_charge_or_clean_period_block"
  | "attorney_or_legal_aid_review"
  | "needs_more_information";

export const nvPathwayLabels: Record<NvPathway, string> = {
  conviction_record_sealing:
    "Conviction record sealing for most eligible adult convictions after the waiting period (NRS 179.245)",
  dismissal_declined_acquittal:
    "Sealing after dismissal, declined prosecution, or acquittal — the no-conviction route (NRS 179.255)",
  multiple_records_multiple_courts:
    "Single district-court petition to seal records that would otherwise require multiple courts (NRS 179.2595)",
  deferred_judgment_dismissal:
    "Sealing after a successfully completed deferred judgment and dismissal (NRS 176.211)",
  probation_specialty_dismissal:
    "Sealing after probation discharge, conditional dismissal, or specialty-court set-aside (NRS 176A.245, 176A.265, 176A.295)",
  reentry_program_sealing:
    "Sealing of a single nonviolent felony four years after reentry-program completion (NRS 179.259)",
  decriminalized_offense:
    "Sealing of an offense that has since been decriminalized, excluding traffic offenses (NRS 179.271)",
  controlled_substance_possession:
    "Sealing of certain controlled-substance possession (not for sale) convictions (NRS 453.3365)",
  trafficking_victim_vacatur:
    "Vacatur and sealing for certain convictions resulting from trafficking or involuntary servitude (NRS 179.247)",
  favorable_disposition_repository_removal:
    "Administrative removal of a favorable-disposition record from generally searched repository files (NRS 179A.160)",
  needs_review:
    "More information, a current verified criminal-history record, or attorney review needed"
};

export const nvPathways: Array<{
  pathway: NvPathway;
  label: string;
  remedyType: NvRemedyType;
  citation: string;
}> = [
  {
    pathway: "conviction_record_sealing",
    label: nvPathwayLabels.conviction_record_sealing,
    remedyType: "court_petition_sealing",
    citation: "NRS 179.245"
  },
  {
    pathway: "dismissal_declined_acquittal",
    label: nvPathwayLabels.dismissal_declined_acquittal,
    remedyType: "court_petition_sealing",
    citation: "NRS 179.255"
  },
  {
    pathway: "multiple_records_multiple_courts",
    label: nvPathwayLabels.multiple_records_multiple_courts,
    remedyType: "court_petition_sealing",
    citation: "NRS 179.2595"
  },
  {
    pathway: "deferred_judgment_dismissal",
    label: nvPathwayLabels.deferred_judgment_dismissal,
    remedyType: "deferred_judgment_sealing",
    citation: "NRS 176.211"
  },
  {
    pathway: "probation_specialty_dismissal",
    label: nvPathwayLabels.probation_specialty_dismissal,
    remedyType: "probation_specialty_sealing",
    citation: "NRS 176A.245, 176A.265, 176A.295"
  },
  {
    pathway: "reentry_program_sealing",
    label: nvPathwayLabels.reentry_program_sealing,
    remedyType: "court_petition_sealing",
    citation: "NRS 179.259"
  },
  {
    pathway: "decriminalized_offense",
    label: nvPathwayLabels.decriminalized_offense,
    remedyType: "court_petition_sealing",
    citation: "NRS 179.271"
  },
  {
    pathway: "controlled_substance_possession",
    label: nvPathwayLabels.controlled_substance_possession,
    remedyType: "court_petition_sealing",
    citation: "NRS 453.3365"
  },
  {
    pathway: "trafficking_victim_vacatur",
    label: nvPathwayLabels.trafficking_victim_vacatur,
    remedyType: "vacatur_and_sealing",
    citation: "NRS 179.247"
  },
  {
    pathway: "favorable_disposition_repository_removal",
    label: nvPathwayLabels.favorable_disposition_repository_removal,
    remedyType: "administrative_repository_removal",
    citation: "NRS 179A.160"
  },
  {
    pathway: "needs_review",
    label: nvPathwayLabels.needs_review,
    remedyType: "needs_review",
    citation: "N/A"
  }
];

// Rebuttable presumption in favor of sealing (NRS 179.2445): for petitions under
// NRS 179.245, 179.247, 179.255, 179.259, or 179.2595, records should be sealed
// if the applicant satisfies all statutory requirements. The presumption does
// NOT apply to a defendant who received a dishonorable discharge from probation
// under NRS 176A.850.
export const nvSealingPresumption = {
  citation: "NRS 179.2445",
  appliesToPathwayCitations: ["NRS 179.245", "NRS 179.247", "NRS 179.255", "NRS 179.259", "NRS 179.2595"],
  note: "Rebuttable presumption in favor of sealing when all statutory requirements are met; not an automatic guarantee — a party may object and a hearing may be required. Does not apply to a dishonorable discharge from probation under NRS 176A.850."
};
