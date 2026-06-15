// New Mexico record-clearing pathways.
// Source of truth: "New Mexico Expungement Reference for Wilma" (Nationwide
// Record Clearing / LegalEase New Mexico), corroborated by the cited New Mexico
// Statutes (Criminal Record Expungement Act, NMSA 1978 §§ 29-3A-1 to 29-3A-9,
// plus § 29-16-10 for DNA), the NM Department of Public Safety and New Mexico
// Courts guidance referenced therein, and the official New Mexico Rules of Court
// 4-95x form PDFs present in the source folder. New Mexico uses the word
// "expungement," but for most non-cannabis records it means removal from public
// access, not destruction. Citations are NMSA 1978 unless otherwise noted. No
// content here is derived from any modeled LegalEase form or legacy generator.

export type NmRemedyType =
  | "court_petition_expungement"
  | "identity_correction_expungement"
  | "cannabis_automatic_expungement"
  | "cannabis_sentence_dismissal_vacatur"
  | "dna_expungement"
  | "needs_review";

export type NmPathway =
  | "identity_theft"
  | "release_without_conviction"
  | "conviction_expungement"
  | "cannabis_automatic"
  | "cannabis_sentence_dismissal"
  | "dna_expungement"
  | "needs_review";

export type NmEligibilitySignal =
  | "possible_identity_theft_expungement"
  | "possible_release_without_conviction"
  | "possible_conviction_expungement"
  | "possible_cannabis_automatic_or_expedited"
  | "possible_cannabis_sentence_dismissal_or_vacatur"
  | "possible_dna_expungement"
  | "excluded_conviction_block"
  | "pending_charge_or_restitution_block"
  | "court_discretion_required"
  | "attorney_or_legal_aid_review"
  | "needs_more_information";

export const nmPathwayLabels: Record<NmPathway, string> = {
  identity_theft:
    "Identity-theft expungement — records that wrongly name a victim of identity theft (NMSA 1978 § 29-3A-3)",
  release_without_conviction:
    "Expungement upon release without conviction — dismissal, acquittal, nolle prosequi, no bill, diversion, conditional discharge, or other discharge (NMSA 1978 § 29-3A-4)",
  conviction_expungement:
    "Conviction expungement — eligible municipal-ordinance, misdemeanor, or felony convictions after the waiting period (NMSA 1978 § 29-3A-5)",
  cannabis_automatic:
    "Cannabis automatic / administrative expungement — cannabis or cannabis-paraphernalia charges no longer criminal or now a lesser offense (NMSA 1978 § 29-3A-8)",
  cannabis_sentence_dismissal:
    "Cannabis sentence dismissal / vacatur for currently or formerly incarcerated people (NMSA 1978 § 29-3A-9)",
  dna_expungement:
    "DNA sample/profile expungement from the state DNA identification system and CODIS (NMSA 1978 § 29-16-10)",
  needs_review:
    "More information, a DPS record of arrest and prosecutions, or attorney review needed"
};

export const nmPathways: Array<{
  pathway: NmPathway;
  label: string;
  remedyType: NmRemedyType;
  citation: string;
}> = [
  {
    pathway: "identity_theft",
    label: nmPathwayLabels.identity_theft,
    remedyType: "identity_correction_expungement",
    citation: "NMSA 1978 § 29-3A-3"
  },
  {
    pathway: "release_without_conviction",
    label: nmPathwayLabels.release_without_conviction,
    remedyType: "court_petition_expungement",
    citation: "NMSA 1978 § 29-3A-4"
  },
  {
    pathway: "conviction_expungement",
    label: nmPathwayLabels.conviction_expungement,
    remedyType: "court_petition_expungement",
    citation: "NMSA 1978 § 29-3A-5"
  },
  {
    pathway: "cannabis_automatic",
    label: nmPathwayLabels.cannabis_automatic,
    remedyType: "cannabis_automatic_expungement",
    citation: "NMSA 1978 § 29-3A-8"
  },
  {
    pathway: "cannabis_sentence_dismissal",
    label: nmPathwayLabels.cannabis_sentence_dismissal,
    remedyType: "cannabis_sentence_dismissal_vacatur",
    citation: "NMSA 1978 § 29-3A-9"
  },
  {
    pathway: "dna_expungement",
    label: nmPathwayLabels.dna_expungement,
    remedyType: "dna_expungement",
    citation: "NMSA 1978 § 29-16-10"
  },
  {
    pathway: "needs_review",
    label: nmPathwayLabels.needs_review,
    remedyType: "needs_review",
    citation: "N/A"
  }
];
