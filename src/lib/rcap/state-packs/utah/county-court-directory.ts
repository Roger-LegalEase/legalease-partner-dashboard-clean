// Utah controlled county and court directory for the Expungement.ai
// screening and packet flow (Phase 3, SHARD-5; issues UX-COUNTY-001 and
// UX-COURT-001).
//
// WHY THIS FILE EXISTS. The Phase 1 flow audit recorded that county and court
// were collected as free text with "no controlled dataset behind it", so a
// misspelling reached a court filing unchecked. Phase 2 declared the dataset
// state-specific and left it to the state shards. This is Utah's half.
//
// WHAT IS AUTHORITATIVE HERE, AND WHAT IS NOT.
//   * `utahCounties` is the complete set of Utah counties. It is
//     public administrative reference data, not legal content, and it is
//     exhaustive: every Utah case sits in exactly one of these.
//   * `utahCourtOptions` is NOT exhaustive. Each entry carries the quote
//     from this repository that supports it. A court this repository does not
//     name is deliberately absent rather than invented, which is why the
//     manual-entry fallback below is part of the contract and not a nicety.
//
// This module authors no waiting period, no eligibility rule and no legal
// conclusion. It is reference data plus its provenance.

export type UtahCourtOption = {
  /** The value offered to the participant and bound into the packet. */
  readonly value: string;
  /** Verbatim supporting text already present in this repository. */
  readonly sourceQuote: string;
  /** Where that text lives, so a reviewer can check it without searching. */
  readonly sourceRef: string;
};

/** All 29 Utah counties, in the order the state publishes them. */
export const utahCounties: readonly string[] = [
  "Beaver",
  "Box Elder",
  "Cache",
  "Carbon",
  "Daggett",
  "Davis",
  "Duchesne",
  "Emery",
  "Garfield",
  "Grand",
  "Iron",
  "Juab",
  "Kane",
  "Millard",
  "Morgan",
  "Piute",
  "Rich",
  "Salt Lake",
  "San Juan",
  "Sanpete",
  "Sevier",
  "Summit",
  "Tooele",
  "Uintah",
  "Utah",
  "Wasatch",
  "Washington",
  "Wayne",
  "Weber",
];

/**
 * The courts this repository names for Utah record-clearing filings.
 * Not a complete directory of Utah courts - see the file header.
 */
export const utahCourtOptions: readonly UtahCourtOption[] = [
  {
    value: "District Court",
    sourceQuote: "If charges were never filed, the petition is filed in the district court in the county where the arrest occurred or citation was issued.",
    sourceRef: "UT-utah.json#packetGenerator.filingDestinationRules; src/lib/rcap/state-packs/utah/filing-instructions.ts"
  },
  {
    value: "Juvenile Court",
    sourceQuote: "Juvenile matters: use the juvenile court expungement process, not the adult BCI certificate application; the juvenile court requires an adult Utah criminal-history report from BCI.",
    sourceRef: "src/lib/rcap/state-packs/utah/filing-instructions.ts"
  },
];

/**
 * The clearly-labelled fallbacks UX-COUNTY-001 and UX-COURT-001 require. A
 * participant whose answer is not on a list must always have a way through
 * that does not make them guess.
 */
export const utahDirectoryFallbacks = {
  countyNotSure: "I am not sure which county handled the case",
  countyManualEntry: "My county is not listed - I will provide it with my documents",
  courtNotSure: "I am not sure which court handled the case",
  courtManualEntry: "My court is not listed - I will provide the exact court name with my documents"
} as const;

/** The option list bound into the compiled profile's county question. */
export const utahCountySelectorOptions: readonly string[] = [
  ...utahCounties,
  utahDirectoryFallbacks.countyNotSure,
  utahDirectoryFallbacks.countyManualEntry
];

/** The option list bound into the compiled profile's court question. */
export const utahCourtSelectorOptions: readonly string[] = [
  ...utahCourtOptions.map((option) => option.value),
  utahDirectoryFallbacks.courtNotSure,
  utahDirectoryFallbacks.courtManualEntry
];

export const utahDirectoryProvenance = {
  jurisdiction: "UT",
  issues: ["UX-COUNTY-001", "UX-COURT-001"],
  shard: "SHARD-5",
  countyCount: 29,
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
