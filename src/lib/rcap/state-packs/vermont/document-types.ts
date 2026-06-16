// Vermont document types — the documents a Vermont record-clearing matter uses.
// Vermont provides official Vermont Judiciary petition, stipulation, response, and
// fee-waiver forms, so these map to official forms rather than a custom pleading.
// See official-forms.ts.
export type VtDocumentType =
  | "vt_200_00129_petition_to_expunge_criminal_history"
  | "vt_200_00130_petition_to_seal_criminal_history"
  | "vt_200_00130a_filing_guide"
  | "vt_200_00131_response_to_petition"
  | "vt_200_00132_stipulation_to_seal_plus_order"
  | "vt_200_00132a_stipulation_to_expunge_plus_order"
  | "vt_200_00631_request_for_sealing_order_special_index"
  | "vt_400_00171_petition_to_expunge_juvenile_diversion"
  | "vt_600_00229_application_to_waive_filing_fees"
  | "vt_200_00331_criminal_record_check_request"
  | "vt_vcic_conviction_record_report"
  | "vt_proposed_order"
  | "vt_filing_instructions";

export const vtDocumentTypes: VtDocumentType[] = [
  "vt_200_00129_petition_to_expunge_criminal_history",
  "vt_200_00130_petition_to_seal_criminal_history",
  "vt_200_00130a_filing_guide",
  "vt_200_00131_response_to_petition",
  "vt_200_00132_stipulation_to_seal_plus_order",
  "vt_200_00132a_stipulation_to_expunge_plus_order",
  "vt_200_00631_request_for_sealing_order_special_index",
  "vt_400_00171_petition_to_expunge_juvenile_diversion",
  "vt_600_00229_application_to_waive_filing_fees",
  "vt_200_00331_criminal_record_check_request",
  "vt_vcic_conviction_record_report",
  "vt_proposed_order",
  "vt_filing_instructions"
];
