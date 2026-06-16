// Washington document types — the documents a Washington record-clearing matter
// uses. Washington provides official Washington Courts vacation/sealing forms
// (CrRLJ/CR/JU), Blake forms, and the WSP non-conviction deletion process, so these
// map to official forms/agency processes rather than a custom pleading. See
// official-forms.ts.
export type WaDocumentType =
  | "wa_crrlj_09_0100_petition_vacate_misdemeanor"
  | "wa_crrlj_09_0200_order_vacate_misdemeanor"
  | "wa_crrlj_09_0300_instructions_vacate_misdemeanor"
  | "wa_crrlj_09_0150_notice_of_hearing"
  | "wa_crrlj_09_0800_petition_vacate_cannabis"
  | "wa_crrlj_09_0870_order_vacate_cannabis"
  | "wa_cr_08_0900_motion_vacate_felony"
  | "wa_cr_08_0920_order_vacate_felony"
  | "wa_cr_08_0930_felony_vacation_information"
  | "wa_ju_10_0300_motion_seal_juvenile"
  | "wa_ju_10_0315_notice_motion_seal_juvenile"
  | "wa_ju_10_0320_order_seal_juvenile"
  | "wa_treaty_fishing_vacation_forms"
  | "wa_blake_motion_and_order_with_lfo_refund"
  | "wa_wsp_non_conviction_deletion_request"
  | "wa_certificate_of_discharge"
  | "wa_filing_instructions";

export const waDocumentTypes: WaDocumentType[] = [
  "wa_crrlj_09_0100_petition_vacate_misdemeanor",
  "wa_crrlj_09_0200_order_vacate_misdemeanor",
  "wa_crrlj_09_0300_instructions_vacate_misdemeanor",
  "wa_crrlj_09_0150_notice_of_hearing",
  "wa_crrlj_09_0800_petition_vacate_cannabis",
  "wa_crrlj_09_0870_order_vacate_cannabis",
  "wa_cr_08_0900_motion_vacate_felony",
  "wa_cr_08_0920_order_vacate_felony",
  "wa_cr_08_0930_felony_vacation_information",
  "wa_ju_10_0300_motion_seal_juvenile",
  "wa_ju_10_0315_notice_motion_seal_juvenile",
  "wa_ju_10_0320_order_seal_juvenile",
  "wa_treaty_fishing_vacation_forms",
  "wa_blake_motion_and_order_with_lfo_refund",
  "wa_wsp_non_conviction_deletion_request",
  "wa_certificate_of_discharge",
  "wa_filing_instructions"
];
