// New Mexico document types — the official statewide Rules of Court 4-95x
// expungement petition forms and related notices/affirmations present in the
// source folder, plus the cannabis AOC and DNA non-court routes. New Mexico uses
// mandatory statewide forms, so these map to official forms rather than a custom
// pleading. See official-forms.ts for the form catalog.
export type NmDocumentType =
  | "nm_4_951_petition_identity_theft"
  | "nm_4_952_petition_release_without_conviction"
  | "nm_4_953_petition_upon_conviction"
  | "nm_4_955_certificate_of_service_release_without_conviction"
  | "nm_4_958_notice_of_non_objection"
  | "nm_4_959_notice_of_completion_of_briefing"
  | "nm_4_960_1_notice_of_hearing"
  | "nm_4_960_2_affirmation_in_support"
  | "nm_cannabis_aoc_application"
  | "nm_dna_expungement_request"
  | "nm_filing_instructions";

export const nmDocumentTypes: NmDocumentType[] = [
  "nm_4_951_petition_identity_theft",
  "nm_4_952_petition_release_without_conviction",
  "nm_4_953_petition_upon_conviction",
  "nm_4_955_certificate_of_service_release_without_conviction",
  "nm_4_958_notice_of_non_objection",
  "nm_4_959_notice_of_completion_of_briefing",
  "nm_4_960_1_notice_of_hearing",
  "nm_4_960_2_affirmation_in_support",
  "nm_cannabis_aoc_application",
  "nm_dna_expungement_request",
  "nm_filing_instructions"
];
