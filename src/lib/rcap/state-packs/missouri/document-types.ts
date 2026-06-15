// Missouri document types — the standardized Missouri court forms a matter may
// use, plus automatic routes. Missouri uses statewide CR-series forms, so these
// map to official forms rather than a custom pleading. See official-forms.ts.
export type MoDocumentType =
  | "mo_cr360_petition_for_expungement_610_140"
  | "mo_judgment_and_order_of_expungement_610_140"
  | "mo_petition_for_expungement_of_arrest_records_610_122"
  | "mo_cr300_petition_correction_identity_theft"
  | "mo_cr301_petition_expungement_mistaken_identity"
  | "mo_cr375_petition_expungement_marijuana"
  | "mo_motion_affidavit_poor_person"
  | "mo_confidential_case_filing_info_sheet"
  | "mo_filing_instructions";

export const moDocumentTypes: MoDocumentType[] = [
  "mo_cr360_petition_for_expungement_610_140",
  "mo_judgment_and_order_of_expungement_610_140",
  "mo_petition_for_expungement_of_arrest_records_610_122",
  "mo_cr300_petition_correction_identity_theft",
  "mo_cr301_petition_expungement_mistaken_identity",
  "mo_cr375_petition_expungement_marijuana",
  "mo_motion_affidavit_poor_person",
  "mo_confidential_case_filing_info_sheet",
  "mo_filing_instructions"
];
