// Montana document types — the official court packet documents and DOJ forms a
// Montana record-clearing matter uses. Montana provides official self-represented
// packets (misdemeanor; MMRTA marijuana) plus a DOJ removal request, so these map
// to official forms rather than a custom pleading. See official-forms.ts.
export type MtDocumentType =
  | "mt_petition_for_expungement_of_misdemeanor_records"
  | "mt_order_expunging_misdemeanor_records"
  | "mt_statement_of_inability_to_pay"
  | "mt_order_regarding_statement_of_inability_to_pay"
  | "mt_mmrta_form_a_currently_serving"
  | "mt_mmrta_form_b_completed_sentence"
  | "mt_mmrta_proposed_order"
  | "mt_mmrta_certificate_of_service"
  | "mt_doj_expungement_removal_request"
  | "mt_criss_non_conviction_removal_request"
  | "mt_filing_instructions";

export const mtDocumentTypes: MtDocumentType[] = [
  "mt_petition_for_expungement_of_misdemeanor_records",
  "mt_order_expunging_misdemeanor_records",
  "mt_statement_of_inability_to_pay",
  "mt_order_regarding_statement_of_inability_to_pay",
  "mt_mmrta_form_a_currently_serving",
  "mt_mmrta_form_b_completed_sentence",
  "mt_mmrta_proposed_order",
  "mt_mmrta_certificate_of_service",
  "mt_doj_expungement_removal_request",
  "mt_criss_non_conviction_removal_request",
  "mt_filing_instructions"
];
