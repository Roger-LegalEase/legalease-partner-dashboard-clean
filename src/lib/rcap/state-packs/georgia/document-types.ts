// Georgia document types — the output documents a Georgia matter may involve.
// Georgia uses a GBI agency form for non-conviction restriction and court
// petitions/motions for SB 288 conviction restriction and for sealing. See
// official-forms.ts for the form/petition catalog.
export type GaDocumentType =
  | "ga_request_to_restrict_arrest_record_gbi"
  | "ga_petition_record_restriction_and_sealing_sb288"
  | "ga_pardoned_felony_restriction_petition"
  | "ga_motion_to_seal_court_records_35_3_37_m"
  | "ga_proposed_order_restriction"
  | "ga_proposed_order_sealing"
  | "ga_filing_instructions";

export const gaDocumentTypes: GaDocumentType[] = [
  "ga_request_to_restrict_arrest_record_gbi",
  "ga_petition_record_restriction_and_sealing_sb288",
  "ga_pardoned_felony_restriction_petition",
  "ga_motion_to_seal_court_records_35_3_37_m",
  "ga_proposed_order_restriction",
  "ga_proposed_order_sealing",
  "ga_filing_instructions"
];
