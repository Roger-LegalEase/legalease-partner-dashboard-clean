// Kansas controlled county and court directory for the Expungement.ai
// screening and packet flow (Phase 3, SHARD-5; issues UX-COUNTY-001 and
// UX-COURT-001).
//
// WHY THIS FILE EXISTS. The Phase 1 flow audit recorded that county and court
// were collected as free text with "no controlled dataset behind it", so a
// misspelling reached a court filing unchecked. Phase 2 declared the dataset
// state-specific and left it to the state shards. This is Kansas's half.
//
// WHAT IS AUTHORITATIVE HERE, AND WHAT IS NOT.
//   * `kansasCounties` is the complete set of Kansas counties. It is
//     public administrative reference data, not legal content, and it is
//     exhaustive: every Kansas case sits in exactly one of these.
//   * `kansasCourtOptions` is NOT exhaustive. Each entry carries the quote
//     from this repository that supports it. A court this repository does not
//     name is deliberately absent rather than invented, which is why the
//     manual-entry fallback below is part of the contract and not a nicety.
//
// This module authors no waiting period, no eligibility rule and no legal
// conclusion. It is reference data plus its provenance.

export type KansasCourtOption = {
  /** The value offered to the participant and bound into the packet. */
  readonly value: string;
  /** Verbatim supporting text already present in this repository. */
  readonly sourceQuote: string;
  /** Where that text lives, so a reviewer can check it without searching. */
  readonly sourceRef: string;
};

/** All 105 Kansas counties, in the order the state publishes them. */
export const kansasCounties: readonly string[] = [
  "Allen",
  "Anderson",
  "Atchison",
  "Barber",
  "Barton",
  "Bourbon",
  "Brown",
  "Butler",
  "Chase",
  "Chautauqua",
  "Cherokee",
  "Cheyenne",
  "Clark",
  "Clay",
  "Cloud",
  "Coffey",
  "Comanche",
  "Cowley",
  "Crawford",
  "Decatur",
  "Dickinson",
  "Doniphan",
  "Douglas",
  "Edwards",
  "Elk",
  "Ellis",
  "Ellsworth",
  "Finney",
  "Ford",
  "Franklin",
  "Geary",
  "Gove",
  "Graham",
  "Grant",
  "Gray",
  "Greeley",
  "Greenwood",
  "Hamilton",
  "Harper",
  "Harvey",
  "Haskell",
  "Hodgeman",
  "Jackson",
  "Jefferson",
  "Jewell",
  "Johnson",
  "Kearny",
  "Kingman",
  "Kiowa",
  "Labette",
  "Lane",
  "Leavenworth",
  "Lincoln",
  "Linn",
  "Logan",
  "Lyon",
  "Marion",
  "Marshall",
  "McPherson",
  "Meade",
  "Miami",
  "Mitchell",
  "Montgomery",
  "Morris",
  "Morton",
  "Nemaha",
  "Neosho",
  "Ness",
  "Norton",
  "Osage",
  "Osborne",
  "Ottawa",
  "Pawnee",
  "Phillips",
  "Pottawatomie",
  "Pratt",
  "Rawlins",
  "Reno",
  "Republic",
  "Rice",
  "Riley",
  "Rooks",
  "Rush",
  "Russell",
  "Saline",
  "Scott",
  "Sedgwick",
  "Seward",
  "Shawnee",
  "Sheridan",
  "Sherman",
  "Smith",
  "Stafford",
  "Stanton",
  "Stevens",
  "Sumner",
  "Thomas",
  "Trego",
  "Wabaunsee",
  "Wallace",
  "Washington",
  "Wichita",
  "Wilson",
  "Woodson",
  "Wyandotte",
];

/**
 * The courts this repository names for Kansas record-clearing filings.
 * Not a complete directory of Kansas courts - see the file header.
 */
export const kansasCourtOptions: readonly KansasCourtOption[] = [
  {
    value: "District Court",
    sourceQuote: "IN THE JUDICIAL DISTRICT DISTRICT COURT OF COUNTY, KANSAS",
    sourceRef: "KS-kansas.json#sourceSections (Petition for Expungement of Conviction or Diversion caption)"
  },
];

/**
 * The clearly-labelled fallbacks UX-COUNTY-001 and UX-COURT-001 require. A
 * participant whose answer is not on a list must always have a way through
 * that does not make them guess.
 */
export const kansasDirectoryFallbacks = {
  countyNotSure: "I am not sure which county handled the case",
  countyManualEntry: "My county is not listed - I will provide it with my documents",
  courtNotSure: "I am not sure which court handled the case",
  courtManualEntry: "My court is not listed - I will provide the exact court name with my documents"
} as const;

/** The option list bound into the compiled profile's county question. */
export const kansasCountySelectorOptions: readonly string[] = [
  ...kansasCounties,
  kansasDirectoryFallbacks.countyNotSure,
  kansasDirectoryFallbacks.countyManualEntry
];

/** The option list bound into the compiled profile's court question. */
export const kansasCourtSelectorOptions: readonly string[] = [
  ...kansasCourtOptions.map((option) => option.value),
  kansasDirectoryFallbacks.courtNotSure,
  kansasDirectoryFallbacks.courtManualEntry
];

export const kansasDirectoryProvenance = {
  jurisdiction: "KS",
  issues: ["UX-COUNTY-001", "UX-COURT-001"],
  shard: "SHARD-5",
  countyCount: 105,
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
