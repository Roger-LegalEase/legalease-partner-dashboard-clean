export type DcDocumentType =
  | "dc_motion_to_seal"
  | "dc_motion_to_expunge"
  | "dc_statement_of_points_and_authorities"
  | "dc_proposed_order"
  | "dc_certificate_of_service"
  | "dc_filing_instructions";

export const dcDocumentTypes: DcDocumentType[] = [
  "dc_motion_to_seal",
  "dc_motion_to_expunge",
  "dc_statement_of_points_and_authorities",
  "dc_proposed_order",
  "dc_certificate_of_service",
  "dc_filing_instructions"
];
