// South Carolina document types — the official SCCA expungement forms and orders a
// South Carolina record-clearing matter uses. South Carolina provides official
// Judicial Branch SCCA 223-series forms (plus SCCA 492), so these map to official
// forms rather than a custom pleading. See official-forms.ts.
export type ScDocumentType =
  | "sc_scca223a1_application_for_expungement"
  | "sc_scca223a1a_supplemental"
  | "sc_scca223b1_order_for_expungement"
  | "sc_scca223c_old_handgun_order"
  | "sc_scca223d_notice_of_objection"
  | "sc_scca223e_summary_court_application_not_fingerprinted"
  | "sc_scca492_supporting_form"
  | "sc_juvenile_expungement_petition"
  | "sc_trafficking_survivor_motion"
  | "sc_filing_instructions";

export const scDocumentTypes: ScDocumentType[] = [
  "sc_scca223a1_application_for_expungement",
  "sc_scca223a1a_supplemental",
  "sc_scca223b1_order_for_expungement",
  "sc_scca223c_old_handgun_order",
  "sc_scca223d_notice_of_objection",
  "sc_scca223e_summary_court_application_not_fingerprinted",
  "sc_scca492_supporting_form",
  "sc_juvenile_expungement_petition",
  "sc_trafficking_survivor_motion",
  "sc_filing_instructions"
];
