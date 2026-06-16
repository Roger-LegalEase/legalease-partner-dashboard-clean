// Ohio document types — the application/petition documents an Ohio sealing or
// expungement matter uses, plus the BCI order-processing form. Ohio does not have
// one mandatory statewide form packet; courts provide their own application forms,
// so these are generic role-based document types. See official-forms.ts for the
// source PDFs present in the folder.
export type OhDocumentType =
  | "oh_application_to_seal_or_expunge_conviction"
  | "oh_application_to_seal_or_expunge_after_dismissal_not_guilty_no_bill"
  | "oh_application_marijuana_hashish_expungement"
  | "oh_application_trafficking_survivor_expungement"
  | "oh_application_firearm_carry_expungement"
  | "oh_juvenile_application_to_seal_or_expunge"
  | "oh_bci_sealing_expungement_request"
  | "oh_cover_sheet_sealing_and_expungement"
  | "oh_filing_instructions";

export const ohDocumentTypes: OhDocumentType[] = [
  "oh_application_to_seal_or_expunge_conviction",
  "oh_application_to_seal_or_expunge_after_dismissal_not_guilty_no_bill",
  "oh_application_marijuana_hashish_expungement",
  "oh_application_trafficking_survivor_expungement",
  "oh_application_firearm_carry_expungement",
  "oh_juvenile_application_to_seal_or_expunge",
  "oh_bci_sealing_expungement_request",
  "oh_cover_sheet_sealing_and_expungement",
  "oh_filing_instructions"
];
