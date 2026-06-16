// Louisiana document types — the statutory Code forms a Louisiana expungement
// packet uses. Louisiana's forms are built into the Code of Criminal Procedure
// (art. 986 provides that only the forms in arts. 987-995 and 998 are used for
// standard expungement motions), so these map to official statutory forms rather
// than a custom pleading. See official-forms.ts for the catalog.
export type LaDocumentType =
  | "la_art987_motion_to_set_aside_and_dismiss"
  | "la_art988_certification_of_fee_waiver"
  | "la_art989_motion_for_expungement"
  | "la_art990_affidavit_of_response"
  | "la_art991_order"
  | "la_art992_order_of_expungement"
  | "la_art993_supplemental_forms"
  | "la_art994_motion_for_interim_expungement"
  | "la_art995_order_of_interim_expungement"
  | "la_art998_motion_first_offense_marijuana"
  | "la_art999_1_expedited_order"
  | "la_filing_instructions";

export const laDocumentTypes: LaDocumentType[] = [
  "la_art987_motion_to_set_aside_and_dismiss",
  "la_art988_certification_of_fee_waiver",
  "la_art989_motion_for_expungement",
  "la_art990_affidavit_of_response",
  "la_art991_order",
  "la_art992_order_of_expungement",
  "la_art993_supplemental_forms",
  "la_art994_motion_for_interim_expungement",
  "la_art995_order_of_interim_expungement",
  "la_art998_motion_first_offense_marijuana",
  "la_art999_1_expedited_order",
  "la_filing_instructions"
];
