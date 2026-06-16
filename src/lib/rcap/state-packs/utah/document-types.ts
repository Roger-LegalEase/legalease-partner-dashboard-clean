// Utah document types — the documents a Utah record-clearing matter uses. Utah
// uses official Utah Courts forms for traffic and cannabis petitions and the BCI
// certificate process for most adult petitions, plus automatic Clean Slate
// processing handled by the court. These map to official forms/agency processes
// rather than a custom pleading. See official-forms.ts.
export type UtDocumentType =
  | "ut_automatic_clean_slate_status_review"
  | "ut_bci_application_for_certificate_of_eligibility"
  | "ut_petition_to_expunge_records_certificate_based"
  | "ut_order_on_petition_to_expunge"
  | "ut_1002ex_petition_expunge_traffic_conviction"
  | "ut_1022ex_order_traffic_records_conviction"
  | "ut_1003ex_petition_expunge_cannabis_conviction"
  | "ut_1023ex_order_cannabis_conviction"
  | "ut_civil_filing_cover_sheet"
  | "ut_victim_statement"
  | "ut_petitioner_reply"
  | "ut_app_response_request_and_response"
  | "ut_notice_of_hearing"
  | "ut_acceptance_of_service"
  | "ut_consent_and_waiver_of_hearing"
  | "ut_juvenile_expungement_materials"
  | "ut_vacatur_expungement_application"
  | "ut_pardon_board_expungement_materials"
  | "ut_fee_waiver_request"
  | "ut_filing_instructions";

export const utDocumentTypes: UtDocumentType[] = [
  "ut_automatic_clean_slate_status_review",
  "ut_bci_application_for_certificate_of_eligibility",
  "ut_petition_to_expunge_records_certificate_based",
  "ut_order_on_petition_to_expunge",
  "ut_1002ex_petition_expunge_traffic_conviction",
  "ut_1022ex_order_traffic_records_conviction",
  "ut_1003ex_petition_expunge_cannabis_conviction",
  "ut_1023ex_order_cannabis_conviction",
  "ut_civil_filing_cover_sheet",
  "ut_victim_statement",
  "ut_petitioner_reply",
  "ut_app_response_request_and_response",
  "ut_notice_of_hearing",
  "ut_acceptance_of_service",
  "ut_consent_and_waiver_of_hearing",
  "ut_juvenile_expungement_materials",
  "ut_vacatur_expungement_application",
  "ut_pardon_board_expungement_materials",
  "ut_fee_waiver_request",
  "ut_filing_instructions"
];
