// Georgia record-clearing pathways.
// Source of truth: "Georgia Record Restriction & Sealing — Agent Training
// Reference" (Nationwide Record Clearing / LegalEase Georgia), corroborated by
// the official GBI/GCIC page, the Georgia Courts (Georgia Legal Aid) page,
// Georgia.gov, and the official GBI "Request to Restrict Arrest Record" form.
// Georgia does NOT use "expungement": the remedy is RECORD RESTRICTION plus a
// separate SEALING of the clerk of court's file. Citations are O.C.G.A.
// § 35-3-37 unless otherwise noted. No content here is derived from the
// LegalEase "modeled" HTML form artifact or any legacy generator.

export type GaRemedyType =
  | "record_restriction"
  | "automatic_restriction"
  | "record_restriction_and_sealing"
  | "court_record_sealing"
  | "needs_review";

export type GaPathway =
  | "nonconviction_restriction"
  | "automatic_restriction"
  | "sb288_misdemeanor_restriction"
  | "pardoned_felony_restriction"
  | "youthful_first_offender_restriction"
  | "court_record_sealing"
  | "needs_review";

export type GaEligibilitySignal =
  | "possible_nonconviction_restriction"
  | "possible_automatic_restriction"
  | "possible_sb288_restriction"
  | "possible_pardoned_felony_restriction"
  | "possible_first_offender_restriction"
  | "possible_court_record_sealing"
  | "excluded_offense_block"
  | "needs_more_information"
  | "attorney_or_legal_aid_review";

export const gaPathwayLabels: Record<GaPathway, string> = {
  nonconviction_restriction:
    "Non-conviction record restriction — dismissed, nolle prosequi, acquittal, not presented, dead docket, pretrial diversion completed (O.C.G.A. § 35-3-37(h))",
  automatic_restriction:
    "Automatic restriction of certain non-conviction records, no application (O.C.G.A. § 35-3-37(j.1), 2021)",
  sb288_misdemeanor_restriction:
    "SB 288 misdemeanor-conviction restriction and sealing — up to two in a lifetime, court petition (O.C.G.A. § 35-3-37(j)(4))",
  pardoned_felony_restriction:
    "Pardoned-felony restriction — felony pardoned by the State Board of Pardons and Paroles (O.C.G.A. § 35-3-37(j)(7))",
  youthful_first_offender_restriction:
    "Youthful / first-offender restriction — misdemeanor before age 21, or retroactive First Offender discharge (O.C.G.A. §§ 35-3-37, 42-8-66)",
  court_record_sealing:
    "Sealing of the clerk of court's file — separate court order after restriction (O.C.G.A. § 35-3-37(m))",
  needs_review: "More information, GCIC criminal history, or counsel review needed"
};

export const gaPathways: Array<{
  pathway: GaPathway;
  label: string;
  remedyType: GaRemedyType;
  citation: string;
  forum: string;
}> = [
  {
    pathway: "nonconviction_restriction",
    label: gaPathwayLabels.nonconviction_restriction,
    remedyType: "record_restriction",
    citation: "O.C.G.A. § 35-3-37(h)",
    forum: "GBI/GCIC and the prosecuting attorney (agency process)"
  },
  {
    pathway: "automatic_restriction",
    label: gaPathwayLabels.automatic_restriction,
    remedyType: "automatic_restriction",
    citation: "O.C.G.A. § 35-3-37(j.1)",
    forum: "Automatic via GCIC entry — no filing"
  },
  {
    pathway: "sb288_misdemeanor_restriction",
    label: gaPathwayLabels.sb288_misdemeanor_restriction,
    remedyType: "record_restriction_and_sealing",
    citation: "O.C.G.A. § 35-3-37(j)(4)",
    forum: "Superior or State Court of the county of conviction (court petition)"
  },
  {
    pathway: "pardoned_felony_restriction",
    label: gaPathwayLabels.pardoned_felony_restriction,
    remedyType: "record_restriction",
    citation: "O.C.G.A. § 35-3-37(j)(7)",
    forum: "Court petition (after a Board of Pardons and Paroles pardon)"
  },
  {
    pathway: "youthful_first_offender_restriction",
    label: gaPathwayLabels.youthful_first_offender_restriction,
    remedyType: "record_restriction",
    citation: "O.C.G.A. §§ 35-3-37, 42-8-66",
    forum: "Agency/court depending on route (verify per matter)"
  },
  {
    pathway: "court_record_sealing",
    label: gaPathwayLabels.court_record_sealing,
    remedyType: "court_record_sealing",
    citation: "O.C.G.A. § 35-3-37(m)",
    forum: "Superior or State Court that holds the clerk's file (separate motion)"
  },
  {
    pathway: "needs_review",
    label: gaPathwayLabels.needs_review,
    remedyType: "needs_review",
    citation: "N/A",
    forum: "N/A"
  }
];
