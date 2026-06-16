// Rhode Island document types — the official court Motion to Expunge or Seal
// Record / Affidavit documents a Rhode Island record-clearing matter uses. Rhode
// Island provides court-specific official forms (District Court DC-33, Superior
// Court felony Superior-55, Superior Court misdemeanor motion, Family Court
// misdemeanor motion; revised February 2025) plus a proposed order, so these map
// to official forms rather than a custom pleading. See official-forms.ts.
export type RiDocumentType =
  | "ri_district_court_motion_and_affidavit_to_expunge_or_seal_dc33"
  | "ri_superior_court_motion_to_expunge_or_seal_felony_superior55"
  | "ri_superior_court_motion_to_expunge_or_seal_misdemeanor"
  | "ri_family_court_motion_and_affidavit_to_expunge_or_seal_misdemeanor"
  | "ri_affidavit_in_support"
  | "ri_proposed_order"
  | "ri_notice_to_attorney_general"
  | "ri_notice_to_charging_police_department"
  | "ri_filing_instructions";

export const riDocumentTypes: RiDocumentType[] = [
  "ri_district_court_motion_and_affidavit_to_expunge_or_seal_dc33",
  "ri_superior_court_motion_to_expunge_or_seal_felony_superior55",
  "ri_superior_court_motion_to_expunge_or_seal_misdemeanor",
  "ri_family_court_motion_and_affidavit_to_expunge_or_seal_misdemeanor",
  "ri_affidavit_in_support",
  "ri_proposed_order",
  "ri_notice_to_attorney_general",
  "ri_notice_to_charging_police_department",
  "ri_filing_instructions"
];
