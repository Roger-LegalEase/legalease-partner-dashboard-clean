// Arkansas controlled county and court directory for the Expungement.ai
// screening and packet flow (Phase 3, SHARD-5; issues UX-COUNTY-001 and
// UX-COURT-001).
//
// WHY THIS FILE EXISTS. The Phase 1 flow audit recorded that county and court
// were collected as free text with "no controlled dataset behind it", so a
// misspelling reached a court filing unchecked. Phase 2 declared the dataset
// state-specific and left it to the state shards. This is Arkansas's half.
//
// WHAT IS AUTHORITATIVE HERE, AND WHAT IS NOT.
//   * `arkansasCounties` is the complete set of Arkansas counties. It is
//     public administrative reference data, not legal content, and it is
//     exhaustive: every Arkansas case sits in exactly one of these.
//   * `arkansasCourtOptions` is NOT exhaustive. Each entry carries the quote
//     from this repository that supports it. A court this repository does not
//     name is deliberately absent rather than invented, which is why the
//     manual-entry fallback below is part of the contract and not a nicety.
//
// This module authors no waiting period, no eligibility rule and no legal
// conclusion. It is reference data plus its provenance.

export type ArkansasCourtOption = {
  /** The value offered to the participant and bound into the packet. */
  readonly value: string;
  /** Verbatim supporting text already present in this repository. */
  readonly sourceQuote: string;
  /** Where that text lives, so a reviewer can check it without searching. */
  readonly sourceRef: string;
};

/** All 75 Arkansas counties, in the order the state publishes them. */
export const arkansasCounties: readonly string[] = [
  "Arkansas",
  "Ashley",
  "Baxter",
  "Benton",
  "Boone",
  "Bradley",
  "Calhoun",
  "Carroll",
  "Chicot",
  "Clark",
  "Clay",
  "Cleburne",
  "Cleveland",
  "Columbia",
  "Conway",
  "Craighead",
  "Crawford",
  "Crittenden",
  "Cross",
  "Dallas",
  "Desha",
  "Drew",
  "Faulkner",
  "Franklin",
  "Fulton",
  "Garland",
  "Grant",
  "Greene",
  "Hempstead",
  "Hot Spring",
  "Howard",
  "Independence",
  "Izard",
  "Jackson",
  "Jefferson",
  "Johnson",
  "Lafayette",
  "Lawrence",
  "Lee",
  "Lincoln",
  "Little River",
  "Logan",
  "Lonoke",
  "Madison",
  "Marion",
  "Miller",
  "Mississippi",
  "Monroe",
  "Montgomery",
  "Nevada",
  "Newton",
  "Ouachita",
  "Perry",
  "Phillips",
  "Pike",
  "Poinsett",
  "Polk",
  "Pope",
  "Prairie",
  "Pulaski",
  "Randolph",
  "St. Francis",
  "Saline",
  "Scott",
  "Searcy",
  "Sebastian",
  "Sevier",
  "Sharp",
  "Stone",
  "Union",
  "Van Buren",
  "Washington",
  "White",
  "Woodruff",
  "Yell",
];

/**
 * The courts this repository names for Arkansas record-clearing filings.
 * Not a complete directory of Arkansas courts - see the file header.
 */
export const arkansasCourtOptions: readonly ArkansasCourtOption[] = [
  {
    value: "Circuit Court",
    sourceQuote: "File in the circuit or district court that handled the case.",
    sourceRef: "AR-arkansas.json#packetGenerator.filingDestinationRules"
  },
  {
    value: "District Court",
    sourceQuote: "File in the circuit or district court that handled the case.",
    sourceRef: "AR-arkansas.json#packetGenerator.filingDestinationRules"
  },
];

/**
 * The clearly-labelled fallbacks UX-COUNTY-001 and UX-COURT-001 require. A
 * participant whose answer is not on a list must always have a way through
 * that does not make them guess.
 */
export const arkansasDirectoryFallbacks = {
  countyNotSure: "I am not sure which county handled the case",
  countyManualEntry: "My county is not listed - I will provide it with my documents",
  courtNotSure: "I am not sure which court handled the case",
  courtManualEntry: "My court is not listed - I will provide the exact court name with my documents"
} as const;

/** The option list bound into the compiled profile's county question. */
export const arkansasCountySelectorOptions: readonly string[] = [
  ...arkansasCounties,
  arkansasDirectoryFallbacks.countyNotSure,
  arkansasDirectoryFallbacks.countyManualEntry
];

/** The option list bound into the compiled profile's court question. */
export const arkansasCourtSelectorOptions: readonly string[] = [
  ...arkansasCourtOptions.map((option) => option.value),
  arkansasDirectoryFallbacks.courtNotSure,
  arkansasDirectoryFallbacks.courtManualEntry
];

export const arkansasDirectoryProvenance = {
  jurisdiction: "AR",
  issues: ["UX-COUNTY-001", "UX-COURT-001"],
  shard: "SHARD-5",
  countyCount: 75,
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
