// Controlled filing-location dataset for Illinois (IL).
//
// Phase 3 SHARD-6 addresses UX-COUNTY-001 and UX-COURT-001 for this state: county
// and court were collected as free text with no state-aware selector and no
// controlled dataset behind them, so a misspelling could reach a court filing
// unchecked. This module supplies the controlled dataset half of that fix.
//
// It authors no legal rule, no waiting period and no eligibility test. It records
// which counties exist in Illinois and which courts and agencies handle
// record-clearing matters, so a selector can offer a closed list instead of a text
// box. Manual entry stays available and is labelled, because a participant whose
// court is not on the list must still be able to say so.
//
// Binding this dataset to a rendered selector is a shared-renderer change and is
// not made here.

export type IllinoisFilingLocationQualifier = "county" | "statewide";

export interface IllinoisRecordClearingCourt {
  /** Stable identifier for this venue; never shown to a participant. */
  readonly id: string;
  /** The name a participant sees in the selector. */
  readonly label: string;
  /** Which local unit qualifies the venue, or "statewide" when none does. */
  readonly qualifiedBy: IllinoisFilingLocationQualifier;
}

/** Every county in Illinois, in alphabetical order. */
export const illinoisFilingLocalUnits = [
  "Adams",
  "Alexander",
  "Bond",
  "Boone",
  "Brown",
  "Bureau",
  "Calhoun",
  "Carroll",
  "Cass",
  "Champaign",
  "Christian",
  "Clark",
  "Clay",
  "Clinton",
  "Coles",
  "Cook",
  "Crawford",
  "Cumberland",
  "De Witt",
  "DeKalb",
  "Douglas",
  "DuPage",
  "Edgar",
  "Edwards",
  "Effingham",
  "Fayette",
  "Ford",
  "Franklin",
  "Fulton",
  "Gallatin",
  "Greene",
  "Grundy",
  "Hamilton",
  "Hancock",
  "Hardin",
  "Henderson",
  "Henry",
  "Iroquois",
  "Jackson",
  "Jasper",
  "Jefferson",
  "Jersey",
  "Jo Daviess",
  "Johnson",
  "Kane",
  "Kankakee",
  "Kendall",
  "Knox",
  "LaSalle",
  "Lake",
  "Lawrence",
  "Lee",
  "Livingston",
  "Logan",
  "Macon",
  "Macoupin",
  "Madison",
  "Marion",
  "Marshall",
  "Mason",
  "Massac",
  "McDonough",
  "McHenry",
  "McLean",
  "Menard",
  "Mercer",
  "Monroe",
  "Montgomery",
  "Morgan",
  "Moultrie",
  "Ogle",
  "Peoria",
  "Perry",
  "Piatt",
  "Pike",
  "Pope",
  "Pulaski",
  "Putnam",
  "Randolph",
  "Richland",
  "Rock Island",
  "Saline",
  "Sangamon",
  "Schuyler",
  "Scott",
  "Shelby",
  "St. Clair",
  "Stark",
  "Stephenson",
  "Tazewell",
  "Union",
  "Vermilion",
  "Wabash",
  "Warren",
  "Washington",
  "Wayne",
  "White",
  "Whiteside",
  "Will",
  "Williamson",
  "Winnebago",
  "Woodford",
] as const;

/** Courts and agencies that handle Illinois record-clearing matters. */
export const illinoisRecordClearingCourts: readonly IllinoisRecordClearingCourt[] = [
  { id: "circuit-court", label: "Circuit Court", qualifiedBy: "county" },
  { id: "circuit-court-of-cook-county", label: "Circuit Court of Cook County", qualifiedBy: "county" },
  { id: "circuit-court-juvenile-division", label: "Circuit Court — Juvenile Division", qualifiedBy: "county" },
  { id: "illinois-state-police-bureau-of-identification", label: "Illinois State Police — Bureau of Identification", qualifiedBy: "statewide" },
];

/**
 * The controlled dataset a state-aware county/court selector reads, with the
 * manual-entry fallback it must offer alongside it.
 */
export const illinoisRecordClearingFilingLocations = {
  jurisdiction: { code: "IL", name: "Illinois", slug: "illinois" },
  localUnitLabel: "County",
  localUnitPlural: "counties",
  localUnitCount: 102,
  localUnits: illinoisFilingLocalUnits,
  courts: illinoisRecordClearingCourts,
  note: "Illinois has 102 counties organised into 25 judicial circuits, with Cook County forming its own circuit. Expungement and sealing petitions under 20 ILCS 2630/5.2 are filed in the Circuit Court of the county where the arrest or case was handled; Cook County filings are additionally routed by district. Automatic relief under the Clean Slate Act is processed by the Illinois State Police rather than by a petition.",
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
    verifiedAgainst: "Compiled profile pathway and source references for IL at PHASE2_PRODUCT_HEAD.",
  },
} as const;
