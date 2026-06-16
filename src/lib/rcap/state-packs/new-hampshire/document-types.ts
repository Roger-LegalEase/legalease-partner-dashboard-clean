// New Hampshire document types — the official NH Judicial Branch annulment forms
// and resources. New Hampshire uses official statewide forms, so the court route
// maps to official forms rather than a custom pleading. See official-forms.ts.
export type NhDocumentType =
  | "nh_nhjb2317_petition_to_annul_record"
  | "nh_annulment_of_criminal_records_checklist"
  | "nh_marijuana_possession_annulment_resource"
  | "nh_fee_waiver_request"
  | "nh_filing_instructions";

export const nhDocumentTypes: NhDocumentType[] = [
  "nh_nhjb2317_petition_to_annul_record",
  "nh_annulment_of_criminal_records_checklist",
  "nh_marijuana_possession_annulment_resource",
  "nh_fee_waiver_request",
  "nh_filing_instructions"
];
