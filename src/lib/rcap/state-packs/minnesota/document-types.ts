// Minnesota document types — the official MN Judicial Branch EXP forms a
// petition packet uses, plus non-court routes. Minnesota uses mandatory
// statewide forms, so these map to official forms rather than a custom pleading.
// See official-forms.ts for the form catalog.
export type MnDocumentType =
  | "mn_exp101_instructions"
  | "mn_exp102_notice_of_hearing_and_petition"
  | "mn_exp103_notice_to_crime_victim"
  | "mn_exp104_proof_of_service"
  | "mn_exp105_order_subd3"
  | "mn_exp106_order_subd1_or_2"
  | "mn_exp107_order_judicial_records_only"
  | "mn_arrest_record_destruction_request"
  | "mn_filing_instructions";

export const mnDocumentTypes: MnDocumentType[] = [
  "mn_exp101_instructions",
  "mn_exp102_notice_of_hearing_and_petition",
  "mn_exp103_notice_to_crime_victim",
  "mn_exp104_proof_of_service",
  "mn_exp105_order_subd3",
  "mn_exp106_order_subd1_or_2",
  "mn_exp107_order_judicial_records_only",
  "mn_arrest_record_destruction_request",
  "mn_filing_instructions"
];
