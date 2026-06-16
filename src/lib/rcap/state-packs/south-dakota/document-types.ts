// South Dakota document types — the official UJS expungement packet documents a
// South Dakota record-clearing matter uses. South Dakota provides an official
// Unified Judicial System expungement packet (UJS-390 instructions plus UJS-232
// and UJS-391 through UJS-395), so these map to official forms rather than a
// custom pleading. See official-forms.ts.
export type SdDocumentType =
  | "sd_ujs_390_instructions_for_expungement"
  | "sd_ujs_232_case_filing_statement"
  | "sd_ujs_391_motion_for_expungement_and_statement_of_mailing"
  | "sd_ujs_392_waiver_of_expungement_hearing"
  | "sd_ujs_393_notice_of_hearing_for_expungement"
  | "sd_ujs_394_order_of_expungement"
  | "sd_ujs_395_notice_of_entry_of_expungement_order"
  | "sd_proof_of_disposition_or_no_accusatory_instrument"
  | "sd_diversion_dismissal_and_completion_notice"
  | "sd_sis_discharge_and_dismissal_order"
  | "sd_pardon_chapter_24_14_materials"
  | "sd_fee_waiver_indigency_request"
  | "sd_filing_instructions";

export const sdDocumentTypes: SdDocumentType[] = [
  "sd_ujs_390_instructions_for_expungement",
  "sd_ujs_232_case_filing_statement",
  "sd_ujs_391_motion_for_expungement_and_statement_of_mailing",
  "sd_ujs_392_waiver_of_expungement_hearing",
  "sd_ujs_393_notice_of_hearing_for_expungement",
  "sd_ujs_394_order_of_expungement",
  "sd_ujs_395_notice_of_entry_of_expungement_order",
  "sd_proof_of_disposition_or_no_accusatory_instrument",
  "sd_diversion_dismissal_and_completion_notice",
  "sd_sis_discharge_and_dismissal_order",
  "sd_pardon_chapter_24_14_materials",
  "sd_fee_waiver_indigency_request",
  "sd_filing_instructions"
];
