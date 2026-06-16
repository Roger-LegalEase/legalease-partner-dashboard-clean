// New Hampshire record-clearing pathways.
// Source of truth: "New Hampshire Expungement / Annulment Reference for Wilma"
// (Nationwide Record Clearing / LegalEase New Hampshire), corroborated by the
// cited New Hampshire statutes (RSA 651:5 Annulment of Criminal Records; RSA
// 651:5-b marijuana; RSA 265-A:21 DWI; RSA 651:6 extended term) and NH Judicial
// Branch / 603 Legal Aid guidance, plus the official NHJB form PDFs in the source
// folder. In New Hampshire the legal term is ANNULMENT, not expungement (users
// may call it expungement/sealing). Citations are RSA unless otherwise noted. No
// content here is derived from any modeled form or legacy generator.

export type NhRemedyType =
  | "court_petition_annulment"
  | "automatic_annulment"
  | "marijuana_annulment"
  | "dwi_annulment"
  | "needs_review";

export type NhPathway =
  | "favorable_outcome_annulment"
  | "vacated_conviction_annulment"
  | "conviction_annulment"
  | "marijuana_possession_annulment"
  | "dwi_annulment"
  | "out_of_state_federal_unavailable"
  | "needs_review";

export type NhEligibilitySignal =
  | "possible_favorable_outcome_annulment"
  | "possible_automatic_annulment_post_2019"
  | "possible_vacated_conviction_annulment"
  | "possible_conviction_annulment"
  | "not_eligible_yet_waiting_period"
  | "multiple_convictions_all_must_be_eligible"
  | "barred_violent_obstruction_extended_term"
  | "possible_marijuana_possession_annulment"
  | "dwi_special_ten_year_review"
  | "out_of_state_federal_block"
  | "attorney_or_legal_aid_review"
  | "needs_more_information";

export const nhPathwayLabels: Record<NhPathway, string> = {
  favorable_outcome_annulment:
    "Favorable-outcome annulment — not guilty, dismissed, or not prosecuted; pre-2019 petition any time, post-2019 generally annulled 30 days after the finding if no appeal (RSA 651:5)",
  vacated_conviction_annulment:
    "Vacated-conviction annulment — annul the arrest and/or court record after a conviction is vacated (RSA 651:5)",
  conviction_annulment:
    "Conviction annulment — after sentence completion and the offense-level waiting period, consistent with rehabilitation and the public welfare (RSA 651:5)",
  marijuana_possession_annulment:
    "Marijuana-possession annulment — possession of 3/4 ounce or less, offense before September 16, 2017 (RSA 651:5-b)",
  dwi_annulment:
    "DWI/DUI annulment — special timing, generally a 10-year waiting period after conviction (RSA 265-A:21; verify)",
  out_of_state_federal_unavailable:
    "Federal, military, Tribal, or out-of-state records — not annullable through a New Hampshire court; jurisdiction-specific review",
  needs_review: "More information, the court disposition, or attorney review needed"
};

export const nhPathways: Array<{
  pathway: NhPathway;
  label: string;
  remedyType: NhRemedyType;
  citation: string;
}> = [
  {
    pathway: "favorable_outcome_annulment",
    label: nhPathwayLabels.favorable_outcome_annulment,
    remedyType: "automatic_annulment",
    citation: "RSA 651:5"
  },
  {
    pathway: "vacated_conviction_annulment",
    label: nhPathwayLabels.vacated_conviction_annulment,
    remedyType: "court_petition_annulment",
    citation: "RSA 651:5"
  },
  {
    pathway: "conviction_annulment",
    label: nhPathwayLabels.conviction_annulment,
    remedyType: "court_petition_annulment",
    citation: "RSA 651:5"
  },
  {
    pathway: "marijuana_possession_annulment",
    label: nhPathwayLabels.marijuana_possession_annulment,
    remedyType: "marijuana_annulment",
    citation: "RSA 651:5-b"
  },
  {
    pathway: "dwi_annulment",
    label: nhPathwayLabels.dwi_annulment,
    remedyType: "dwi_annulment",
    citation: "RSA 265-A:21"
  },
  {
    pathway: "out_of_state_federal_unavailable",
    label: nhPathwayLabels.out_of_state_federal_unavailable,
    remedyType: "needs_review",
    citation: "RSA 651:5"
  },
  {
    pathway: "needs_review",
    label: nhPathwayLabels.needs_review,
    remedyType: "needs_review",
    citation: "RSA 651:5"
  }
];
