// Maryland document types — the output documents a Maryland packet may include.
// Maryland uses mandatory official Judiciary forms (CC-DC-CR-072 family, etc.),
// so these map to official forms rather than a custom pleading. See
// official-forms.ts for form numbers and authorities.
export type MdDocumentType =
  | "md_petition_expungement_nonconviction_072a"
  | "md_petition_expungement_guilty_072b"
  | "md_petition_expungement_early_favorable_072c"
  | "md_petition_expungement_cannabis_072d"
  | "md_general_waiver_and_release_078"
  | "md_application_expungement_police_record_dc_cr_071"
  | "md_petition_shielding_second_chance_148"
  | "md_juvenile_expungement_petition"
  | "md_order_for_expungement"
  | "md_filing_instructions";

export const mdDocumentTypes: MdDocumentType[] = [
  "md_petition_expungement_nonconviction_072a",
  "md_petition_expungement_guilty_072b",
  "md_petition_expungement_early_favorable_072c",
  "md_petition_expungement_cannabis_072d",
  "md_general_waiver_and_release_078",
  "md_application_expungement_police_record_dc_cr_071",
  "md_petition_shielding_second_chance_148",
  "md_juvenile_expungement_petition",
  "md_order_for_expungement",
  "md_filing_instructions"
];
