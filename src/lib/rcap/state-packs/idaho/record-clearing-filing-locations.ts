// Controlled filing-location dataset for Idaho (ID).
//
// Phase 3 SHARD-6 addresses UX-COUNTY-001 and UX-COURT-001 for this state: county
// and court were collected as free text with no state-aware selector and no
// controlled dataset behind them, so a misspelling could reach a court filing
// unchecked. This module supplies the controlled dataset half of that fix.
//
// It authors no legal rule, no waiting period and no eligibility test. It records
// which counties exist in Idaho and which courts and agencies handle
// record-clearing matters, so a selector can offer a closed list instead of a text
// box. Manual entry stays available and is labelled, because a participant whose
// court is not on the list must still be able to say so.
//
// Binding this dataset to a rendered selector is a shared-renderer change and is
// not made here.

export type IdahoFilingLocationQualifier = "county" | "statewide";

export interface IdahoRecordClearingCourt {
  /** Stable identifier for this venue; never shown to a participant. */
  readonly id: string;
  /** The name a participant sees in the selector. */
  readonly label: string;
  /** Which local unit qualifies the venue, or "statewide" when none does. */
  readonly qualifiedBy: IdahoFilingLocationQualifier;
}

/** Every county in Idaho, in alphabetical order. */
export const idahoFilingLocalUnits = [
  "Ada",
  "Adams",
  "Bannock",
  "Bear Lake",
  "Benewah",
  "Bingham",
  "Blaine",
  "Boise",
  "Bonner",
  "Bonneville",
  "Boundary",
  "Butte",
  "Camas",
  "Canyon",
  "Caribou",
  "Cassia",
  "Clark",
  "Clearwater",
  "Custer",
  "Elmore",
  "Franklin",
  "Fremont",
  "Gem",
  "Gooding",
  "Idaho",
  "Jefferson",
  "Jerome",
  "Kootenai",
  "Latah",
  "Lemhi",
  "Lewis",
  "Lincoln",
  "Madison",
  "Minidoka",
  "Nez Perce",
  "Oneida",
  "Owyhee",
  "Payette",
  "Power",
  "Shoshone",
  "Teton",
  "Twin Falls",
  "Valley",
  "Washington",
] as const;

/** Courts and agencies that handle Idaho record-clearing matters. */
export const idahoRecordClearingCourts: readonly IdahoRecordClearingCourt[] = [
  { id: "district-court", label: "District Court", qualifiedBy: "county" },
  { id: "magistrate-division", label: "District Court — Magistrate Division", qualifiedBy: "county" },
  { id: "idaho-state-police-bci", label: "Idaho State Police — Bureau of Criminal Identification", qualifiedBy: "statewide" },
];

/**
 * The controlled dataset a state-aware county/court selector reads, with the
 * manual-entry fallback it must offer alongside it.
 */
export const idahoRecordClearingFilingLocations = {
  jurisdiction: { code: "ID", name: "Idaho", slug: "idaho" },
  localUnitLabel: "County",
  localUnitPlural: "counties",
  localUnitCount: 44,
  localUnits: idahoFilingLocalUnits,
  courts: idahoRecordClearingCourts,
  note: "Idaho has 44 counties grouped into seven judicial districts. Petitions run through the District Court (or its Magistrate Division) for the county that handled the case. Non-conviction fingerprint and criminal-history expungement under Idaho Code § 67-3004(10) is a written request to the Idaho State Police rather than a court filing.",
  manualEntry: {
    allowed: true,
    optionLabel: "My county or court is not listed",
    helperText:
      "Type the county and court exactly as they appear on your paperwork. We will " +
      "use what you type and flag it for review before anything is filed.",
  },
  review: {
    /** Build status only. QA, counsel and source-freshness review are tracked separately. */
    buildStatus: "state_built" as const,
    /** The selector itself is a shared-renderer change and is not made in this shard. */
    rendererBindingOwner: "phase_2_shared_renderer" as const,
    verifiedAgainst: "Compiled profile pathway and source references for ID at PHASE2_PRODUCT_HEAD.",
  },
} as const;
