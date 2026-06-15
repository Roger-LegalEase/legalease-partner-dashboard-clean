// Nevada document types — the components of a Nevada record-sealing packet. Nevada
// procedures vary by county and Nevada does not publish a single mandatory
// statewide numbered form set the way some states do; the packet is a set of
// pleadings (petition, affidavit, stipulation, proposed order) prepared from the
// verified criminal-history record. See official-forms.ts for the source PDFs.
export type NvDocumentType =
  | "nv_petition_to_seal_records"
  | "nv_affidavit_or_declaration_in_support"
  | "nv_stipulation_to_seal_records"
  | "nv_order_to_seal_records"
  | "nv_verified_criminal_history_report"
  | "nv_agency_custodian_list"
  | "nv_favorable_disposition_repository_request"
  | "nv_filing_instructions";

export const nvDocumentTypes: NvDocumentType[] = [
  "nv_petition_to_seal_records",
  "nv_affidavit_or_declaration_in_support",
  "nv_stipulation_to_seal_records",
  "nv_order_to_seal_records",
  "nv_verified_criminal_history_report",
  "nv_agency_custodian_list",
  "nv_favorable_disposition_repository_request",
  "nv_filing_instructions"
];
