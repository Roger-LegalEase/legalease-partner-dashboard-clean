// West Virginia document types — the documents a West Virginia record-clearing
// matter uses. West Virginia provides official West Virginia Judiciary SCA-C
// expungement forms, so these map to official forms rather than a custom pleading.
// See official-forms.ts.
export type WvDocumentType =
  | "wv_sca_c900_instructions_for_expungement_petition"
  | "wv_sca_c903_motion_expungement_acquittal_or_dismissal"
  | "wv_sca_c906_petition_expungement_misdemeanor_and_traffic"
  | "wv_sca_c907_petition_expungement_felony"
  | "wv_sca_c912_victim_notice_of_opposition"
  | "wv_certified_disposition_or_dismissal_order"
  | "wv_diversion_or_deferred_completion_order"
  | "wv_conditional_discharge_order_60a_4_407"
  | "wv_governor_full_unconditional_pardon"
  | "wv_publication_notice_class_i"
  | "wv_trafficking_supporting_documentation"
  | "wv_rehabilitation_documentation"
  | "wv_treatment_recovery_or_job_readiness_documentation"
  | "wv_proposed_order"
  | "wv_filing_instructions";

export const wvDocumentTypes: WvDocumentType[] = [
  "wv_sca_c900_instructions_for_expungement_petition",
  "wv_sca_c903_motion_expungement_acquittal_or_dismissal",
  "wv_sca_c906_petition_expungement_misdemeanor_and_traffic",
  "wv_sca_c907_petition_expungement_felony",
  "wv_sca_c912_victim_notice_of_opposition",
  "wv_certified_disposition_or_dismissal_order",
  "wv_diversion_or_deferred_completion_order",
  "wv_conditional_discharge_order_60a_4_407",
  "wv_governor_full_unconditional_pardon",
  "wv_publication_notice_class_i",
  "wv_trafficking_supporting_documentation",
  "wv_rehabilitation_documentation",
  "wv_treatment_recovery_or_job_readiness_documentation",
  "wv_proposed_order",
  "wv_filing_instructions"
];
