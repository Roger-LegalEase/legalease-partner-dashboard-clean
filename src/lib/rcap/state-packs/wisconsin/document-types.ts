// Wisconsin document types — the documents a Wisconsin record-clearing matter uses.
// Wisconsin provides official Wisconsin Court System CR-266/CR-267 forms and the
// DOJ-CIB process (DJ-LE-250B / DJ-LE-247) plus the juvenile JD-1780, so these map
// to official forms/agency processes rather than a custom pleading. See
// official-forms.ts.
export type WiDocumentType =
  | "wi_cr_266_petition_expunge_adult_conviction"
  | "wi_cr_267_order_expunge_adult_conviction"
  | "wi_certificate_of_discharge_for_expungement"
  | "wi_973_015_2m_trafficking_victim_motion"
  | "wi_jd_1780_juvenile_petition_to_expunge"
  | "wi_dj_le_250b_fingerprint_record_removal_request"
  | "wi_dj_le_247_criminal_history_record_challenge"
  | "wi_doj_cib_criminal_history_record"
  | "wi_wcca_ccap_case_record"
  | "wi_proposed_order"
  | "wi_filing_instructions";

export const wiDocumentTypes: WiDocumentType[] = [
  "wi_cr_266_petition_expunge_adult_conviction",
  "wi_cr_267_order_expunge_adult_conviction",
  "wi_certificate_of_discharge_for_expungement",
  "wi_973_015_2m_trafficking_victim_motion",
  "wi_jd_1780_juvenile_petition_to_expunge",
  "wi_dj_le_250b_fingerprint_record_removal_request",
  "wi_dj_le_247_criminal_history_record_challenge",
  "wi_doj_cib_criminal_history_record",
  "wi_wcca_ccap_case_record",
  "wi_proposed_order",
  "wi_filing_instructions"
];
