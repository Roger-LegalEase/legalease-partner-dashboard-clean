// Florida document types — the documents a Florida matter may involve. Florida's
// normal route is a two-stage process: an FDLE Certificate of Eligibility
// application first, then a court petition (Petition to Seal or Expunge + sworn
// statement + proposed order). Special routes use their own FDLE applications.
// See official-forms.ts for the form catalog.
export type FlDocumentType =
  | "fl_fdle_application_certificate_of_eligibility"
  | "fl_prosecutor_written_certified_statement"
  | "fl_petition_to_seal_or_expunge"
  | "fl_sworn_statement_affidavit"
  | "fl_proposed_order"
  | "fl_human_trafficking_victim_expunction_petition"
  | "fl_lawful_self_defense_expungement_application"
  | "fl_juvenile_diversion_expungement_application"
  | "fl_early_juvenile_expungement_application"
  | "fl_administrative_expunction_request"
  | "fl_filing_instructions";

export const flDocumentTypes: FlDocumentType[] = [
  "fl_fdle_application_certificate_of_eligibility",
  "fl_prosecutor_written_certified_statement",
  "fl_petition_to_seal_or_expunge",
  "fl_sworn_statement_affidavit",
  "fl_proposed_order",
  "fl_human_trafficking_victim_expunction_petition",
  "fl_lawful_self_defense_expungement_application",
  "fl_juvenile_diversion_expungement_application",
  "fl_early_juvenile_expungement_application",
  "fl_administrative_expunction_request",
  "fl_filing_instructions"
];
