// Georgia controlled county and court directory for the Expungement.ai
// screening and packet flow (Phase 3, SHARD-5; issues UX-COUNTY-001 and
// UX-COURT-001).
//
// WHY THIS FILE EXISTS. The Phase 1 flow audit recorded that county and court
// were collected as free text with "no controlled dataset behind it", so a
// misspelling reached a court filing unchecked. Phase 2 declared the dataset
// state-specific and left it to the state shards. This is Georgia's half.
//
// WHAT IS AUTHORITATIVE HERE, AND WHAT IS NOT.
//   * `georgiaCounties` is the complete set of Georgia counties. It is
//     public administrative reference data, not legal content, and it is
//     exhaustive: every Georgia case sits in exactly one of these.
//   * `georgiaCourtOptions` is NOT exhaustive. Each entry carries the quote
//     from this repository that supports it. A court this repository does not
//     name is deliberately absent rather than invented, which is why the
//     manual-entry fallback below is part of the contract and not a nicety.
//
// This module authors no waiting period, no eligibility rule and no legal
// conclusion. It is reference data plus its provenance.

export type GeorgiaCourtOption = {
  /** The value offered to the participant and bound into the packet. */
  readonly value: string;
  /** Verbatim supporting text already present in this repository. */
  readonly sourceQuote: string;
  /** Where that text lives, so a reviewer can check it without searching. */
  readonly sourceRef: string;
};

/** All 159 Georgia counties, in the order the state publishes them. */
export const georgiaCounties: readonly string[] = [
  "Appling",
  "Atkinson",
  "Bacon",
  "Baker",
  "Baldwin",
  "Banks",
  "Barrow",
  "Bartow",
  "Ben Hill",
  "Berrien",
  "Bibb",
  "Bleckley",
  "Brantley",
  "Brooks",
  "Bryan",
  "Bulloch",
  "Burke",
  "Butts",
  "Calhoun",
  "Camden",
  "Candler",
  "Carroll",
  "Catoosa",
  "Charlton",
  "Chatham",
  "Chattahoochee",
  "Chattooga",
  "Cherokee",
  "Clarke",
  "Clay",
  "Clayton",
  "Clinch",
  "Cobb",
  "Coffee",
  "Colquitt",
  "Columbia",
  "Cook",
  "Coweta",
  "Crawford",
  "Crisp",
  "Dade",
  "Dawson",
  "Decatur",
  "DeKalb",
  "Dodge",
  "Dooly",
  "Dougherty",
  "Douglas",
  "Early",
  "Echols",
  "Effingham",
  "Elbert",
  "Emanuel",
  "Evans",
  "Fannin",
  "Fayette",
  "Floyd",
  "Forsyth",
  "Franklin",
  "Fulton",
  "Gilmer",
  "Glascock",
  "Glynn",
  "Gordon",
  "Grady",
  "Greene",
  "Gwinnett",
  "Habersham",
  "Hall",
  "Hancock",
  "Haralson",
  "Harris",
  "Hart",
  "Heard",
  "Henry",
  "Houston",
  "Irwin",
  "Jackson",
  "Jasper",
  "Jeff Davis",
  "Jefferson",
  "Jenkins",
  "Johnson",
  "Jones",
  "Lamar",
  "Lanier",
  "Laurens",
  "Lee",
  "Liberty",
  "Lincoln",
  "Long",
  "Lowndes",
  "Lumpkin",
  "Macon",
  "Madison",
  "Marion",
  "McDuffie",
  "McIntosh",
  "Meriwether",
  "Miller",
  "Mitchell",
  "Monroe",
  "Montgomery",
  "Morgan",
  "Murray",
  "Muscogee",
  "Newton",
  "Oconee",
  "Oglethorpe",
  "Paulding",
  "Peach",
  "Pickens",
  "Pierce",
  "Pike",
  "Polk",
  "Pulaski",
  "Putnam",
  "Quitman",
  "Rabun",
  "Randolph",
  "Richmond",
  "Rockdale",
  "Schley",
  "Screven",
  "Seminole",
  "Spalding",
  "Stephens",
  "Stewart",
  "Sumter",
  "Talbot",
  "Taliaferro",
  "Tattnall",
  "Taylor",
  "Telfair",
  "Terrell",
  "Thomas",
  "Tift",
  "Toombs",
  "Towns",
  "Treutlen",
  "Troup",
  "Turner",
  "Twiggs",
  "Union",
  "Upson",
  "Walker",
  "Walton",
  "Ware",
  "Warren",
  "Washington",
  "Wayne",
  "Webster",
  "Wheeler",
  "White",
  "Whitfield",
  "Wilcox",
  "Wilkes",
  "Wilkinson",
  "Worth",
];

/**
 * The courts this repository names for Georgia record-clearing filings.
 * Not a complete directory of Georgia courts - see the file header.
 */
export const georgiaCourtOptions: readonly GeorgiaCourtOption[] = [
  {
    value: "Superior Court",
    sourceQuote: "File in the Superior/State Court of the county of conviction and pay the filing fee (county-set).",
    sourceRef: "GA-georgia.json#sourceSections; src/lib/rcap/state-packs/georgia/filing-instructions.ts"
  },
  {
    value: "State Court",
    sourceQuote: "File in the Superior/State Court of the county of conviction and pay the filing fee (county-set).",
    sourceRef: "GA-georgia.json#sourceSections; src/lib/rcap/state-packs/georgia/filing-instructions.ts"
  },
  {
    value: "Arresting agency or prosecutor's office (non-conviction restriction — not a court filing)",
    sourceQuote: "Submit the non-conviction application to the arresting agency / prosecutor; the prosecutor completes Section Three (approve or deny).",
    sourceRef: "src/lib/rcap/state-packs/georgia/filing-instructions.ts"
  },
];

/**
 * The clearly-labelled fallbacks UX-COUNTY-001 and UX-COURT-001 require. A
 * participant whose answer is not on a list must always have a way through
 * that does not make them guess.
 */
export const georgiaDirectoryFallbacks = {
  countyNotSure: "I am not sure which county handled the case",
  countyManualEntry: "My county is not listed - I will provide it with my documents",
  courtNotSure: "I am not sure which court handled the case",
  courtManualEntry: "My court is not listed - I will provide the exact court name with my documents"
} as const;

/** The option list bound into the compiled profile's county question. */
export const georgiaCountySelectorOptions: readonly string[] = [
  ...georgiaCounties,
  georgiaDirectoryFallbacks.countyNotSure,
  georgiaDirectoryFallbacks.countyManualEntry
];

/** The option list bound into the compiled profile's court question. */
export const georgiaCourtSelectorOptions: readonly string[] = [
  ...georgiaCourtOptions.map((option) => option.value),
  georgiaDirectoryFallbacks.courtNotSure,
  georgiaDirectoryFallbacks.courtManualEntry
];

export const georgiaDirectoryProvenance = {
  jurisdiction: "GA",
  issues: ["UX-COUNTY-001", "UX-COURT-001"],
  shard: "SHARD-5",
  countyCount: 159,
  countiesAreExhaustive: true,
  courtOptionsAreExhaustive: false,
  selectorIsLosslessIfBound: true,
  boundToRuntimeQuestionAuthority: false,
  authorsLegalContent: false,
  // Not bound to a rendered question yet: the runtime question authority is
  // src/lib/rcap-engine/compiled/all51.json, which is not a state-shard path.
  // See data/expungement-ai/flow-audit/shard-results/SHARD-5.json#sharedBlocker.
  bindingBlockedOn: "src/lib/rcap-engine/compiled/all51.json"
} as const;
