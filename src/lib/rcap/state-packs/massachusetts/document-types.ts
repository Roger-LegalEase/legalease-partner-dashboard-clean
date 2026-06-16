// Massachusetts document types — the official Massachusetts Trial Court /
// Probation Service forms a sealing or expungement matter uses, plus the CORI
// request. Massachusetts uses official statewide forms, so these map to official
// forms rather than a custom pleading. See official-forms.ts for the catalog.
export type MaDocumentType =
  | "ma_petition_to_seal_conviction_records"
  | "ma_petition_to_seal_nolle_prosequi_or_dismissal"
  | "ma_petition_to_expunge_time_based"
  | "ma_petition_for_expungement_non_time_based"
  | "ma_petition_for_expungement_of_marijuana_offenses"
  | "ma_ocp004_opt_out_of_sealing_notice"
  | "ma_icori_request"
  | "ma_filing_instructions";

export const maDocumentTypes: MaDocumentType[] = [
  "ma_petition_to_seal_conviction_records",
  "ma_petition_to_seal_nolle_prosequi_or_dismissal",
  "ma_petition_to_expunge_time_based",
  "ma_petition_for_expungement_non_time_based",
  "ma_petition_for_expungement_of_marijuana_offenses",
  "ma_ocp004_opt_out_of_sealing_notice",
  "ma_icori_request",
  "ma_filing_instructions"
];
