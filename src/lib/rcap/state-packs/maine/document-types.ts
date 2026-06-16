// Maine document types — the official Maine Judicial Branch forms a sealing
// matter uses, plus non-court routes. Maine uses official statewide forms, so the
// court routes map to official forms rather than a custom pleading. See
// official-forms.ts for the catalog.
export type MeDocumentType =
  | "me_cr218_motion_to_seal_criminal_history"
  | "me_cr289_motion_to_seal_engaging_in_prostitution"
  | "me_jv043_petition_to_seal_juvenile_records"
  | "me_cv067_application_to_proceed_without_fees"
  | "me_cv191_financial_affidavit"
  | "me_section_2262b_survivor_sealing_motion"
  | "me_confidential_criminal_history_route"
  | "me_filing_instructions";

export const meDocumentTypes: MeDocumentType[] = [
  "me_cr218_motion_to_seal_criminal_history",
  "me_cr289_motion_to_seal_engaging_in_prostitution",
  "me_jv043_petition_to_seal_juvenile_records",
  "me_cv067_application_to_proceed_without_fees",
  "me_cv191_financial_affidavit",
  "me_section_2262b_survivor_sealing_motion",
  "me_confidential_criminal_history_route",
  "me_filing_instructions"
];
