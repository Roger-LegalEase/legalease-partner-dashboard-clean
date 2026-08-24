// Controlled filing-location dataset for Kentucky (KY).
//
// Phase 3 SHARD-6 addresses UX-COUNTY-001 and UX-COURT-001 for this state: county
// and court were collected as free text with no state-aware selector and no
// controlled dataset behind them, so a misspelling could reach a court filing
// unchecked. This module supplies the controlled dataset half of that fix.
//
// It authors no legal rule, no waiting period and no eligibility test. It records
// which counties exist in Kentucky and which courts and agencies handle
// record-clearing matters, so a selector can offer a closed list instead of a text
// box. Manual entry stays available and is labelled, because a participant whose
// court is not on the list must still be able to say so.
//
// Binding this dataset to a rendered selector is a shared-renderer change and is
// not made here.

export type KentuckyFilingLocationQualifier = "county" | "statewide";

export interface KentuckyRecordClearingCourt {
  /** Stable identifier for this venue; never shown to a participant. */
  readonly id: string;
  /** The name a participant sees in the selector. */
  readonly label: string;
  /** Which local unit qualifies the venue, or "statewide" when none does. */
  readonly qualifiedBy: KentuckyFilingLocationQualifier;
}

/** Every county in Kentucky, in alphabetical order. */
export const kentuckyFilingLocalUnits = [
  "Adair",
  "Allen",
  "Anderson",
  "Ballard",
  "Barren",
  "Bath",
  "Bell",
  "Boone",
  "Bourbon",
  "Boyd",
  "Boyle",
  "Bracken",
  "Breathitt",
  "Breckinridge",
  "Bullitt",
  "Butler",
  "Caldwell",
  "Calloway",
  "Campbell",
  "Carlisle",
  "Carroll",
  "Carter",
  "Casey",
  "Christian",
  "Clark",
  "Clay",
  "Clinton",
  "Crittenden",
  "Cumberland",
  "Daviess",
  "Edmonson",
  "Elliott",
  "Estill",
  "Fayette",
  "Fleming",
  "Floyd",
  "Franklin",
  "Fulton",
  "Gallatin",
  "Garrard",
  "Grant",
  "Graves",
  "Grayson",
  "Green",
  "Greenup",
  "Hancock",
  "Hardin",
  "Harlan",
  "Harrison",
  "Hart",
  "Henderson",
  "Henry",
  "Hickman",
  "Hopkins",
  "Jackson",
  "Jefferson",
  "Jessamine",
  "Johnson",
  "Kenton",
  "Knott",
  "Knox",
  "Larue",
  "Laurel",
  "Lawrence",
  "Lee",
  "Leslie",
  "Letcher",
  "Lewis",
  "Lincoln",
  "Livingston",
  "Logan",
  "Lyon",
  "Madison",
  "Magoffin",
  "Marion",
  "Marshall",
  "Martin",
  "Mason",
  "McCracken",
  "McCreary",
  "McLean",
  "Meade",
  "Menifee",
  "Mercer",
  "Metcalfe",
  "Monroe",
  "Montgomery",
  "Morgan",
  "Muhlenberg",
  "Nelson",
  "Nicholas",
  "Ohio",
  "Oldham",
  "Owen",
  "Owsley",
  "Pendleton",
  "Perry",
  "Pike",
  "Powell",
  "Pulaski",
  "Robertson",
  "Rockcastle",
  "Rowan",
  "Russell",
  "Scott",
  "Shelby",
  "Simpson",
  "Spencer",
  "Taylor",
  "Todd",
  "Trigg",
  "Trimble",
  "Union",
  "Warren",
  "Washington",
  "Wayne",
  "Webster",
  "Whitley",
  "Wolfe",
  "Woodford",
] as const;

/** Courts and agencies that handle Kentucky record-clearing matters. */
export const kentuckyRecordClearingCourts: readonly KentuckyRecordClearingCourt[] = [
  { id: "circuit-court", label: "Circuit Court", qualifiedBy: "county" },
  { id: "district-court", label: "District Court", qualifiedBy: "county" },
  { id: "family-court", label: "Circuit Court — Family Court Division", qualifiedBy: "county" },
  { id: "aoc-expungement-certification", label: "Administrative Office of the Courts — expungement certification", qualifiedBy: "statewide" },
];

/**
 * The controlled dataset a state-aware county/court selector reads, with the
 * manual-entry fallback it must offer alongside it.
 */
export const kentuckyRecordClearingFilingLocations = {
  jurisdiction: { code: "KY", name: "Kentucky", slug: "kentucky" },
  localUnitLabel: "County",
  localUnitPlural: "counties",
  localUnitCount: 120,
  localUnits: kentuckyFilingLocalUnits,
  courts: kentuckyRecordClearingCourts,
  note: "Kentucky has 120 counties. Felony vacatur and expungement under KRS 431.073 is filed in the Circuit Court for the county of conviction; misdemeanor, violation, and traffic expungement under KRS 431.078 and non-conviction expungement under KRS 431.076 are filed in the court that handled the case, which is usually the District Court.",
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
    verifiedAgainst: "Compiled profile pathway and source references for KY at PHASE2_PRODUCT_HEAD.",
  },
} as const;
