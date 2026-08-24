// West Virginia controlled county and court directory for the Expungement.ai
// screening and packet flow (Phase 3, SHARD-5; issues UX-COUNTY-001 and
// UX-COURT-001).
//
// WHY THIS FILE EXISTS. The Phase 1 flow audit recorded that county and court
// were collected as free text with "no controlled dataset behind it", so a
// misspelling reached a court filing unchecked. Phase 2 declared the dataset
// state-specific and left it to the state shards. This is West Virginia's half.
//
// WHAT IS AUTHORITATIVE HERE, AND WHAT IS NOT.
//   * `westVirginiaCounties` is the complete set of West Virginia counties. It is
//     public administrative reference data, not legal content, and it is
//     exhaustive: every West Virginia case sits in exactly one of these.
//   * `westVirginiaCourtOptions` is NOT exhaustive. Each entry carries the quote
//     from this repository that supports it. A court this repository does not
//     name is deliberately absent rather than invented, which is why the
//     manual-entry fallback below is part of the contract and not a nicety.
//
// This module authors no waiting period, no eligibility rule and no legal
// conclusion. It is reference data plus its provenance.

export type WestVirginiaCourtOption = {
  /** The value offered to the participant and bound into the packet. */
  readonly value: string;
  /** Verbatim supporting text already present in this repository. */
  readonly sourceQuote: string;
  /** Where that text lives, so a reviewer can check it without searching. */
  readonly sourceRef: string;
};

/** All 55 West Virginia counties, in the order the state publishes them. */
export const westVirginiaCounties: readonly string[] = [
  "Barbour",
  "Berkeley",
  "Boone",
  "Braxton",
  "Brooke",
  "Cabell",
  "Calhoun",
  "Clay",
  "Doddridge",
  "Fayette",
  "Gilmer",
  "Grant",
  "Greenbrier",
  "Hampshire",
  "Hancock",
  "Hardy",
  "Harrison",
  "Jackson",
  "Jefferson",
  "Kanawha",
  "Lewis",
  "Lincoln",
  "Logan",
  "Marion",
  "Marshall",
  "Mason",
  "McDowell",
  "Mercer",
  "Mineral",
  "Mingo",
  "Monongalia",
  "Monroe",
  "Morgan",
  "Nicholas",
  "Ohio",
  "Pendleton",
  "Pleasants",
  "Pocahontas",
  "Preston",
  "Putnam",
  "Raleigh",
  "Randolph",
  "Ritchie",
  "Roane",
  "Summers",
  "Taylor",
  "Tucker",
  "Tyler",
  "Upshur",
  "Wayne",
  "Webster",
  "Wetzel",
  "Wirt",
  "Wood",
  "Wyoming",
];

/**
 * The courts this repository names for West Virginia record-clearing filings.
 * Not a complete directory of West Virginia courts - see the file header.
 */
export const westVirginiaCourtOptions: readonly WestVirginiaCourtOption[] = [
  {
    value: "Circuit Court",
    sourceQuote: "No-conviction expungement (§ 61-11-25): file a civil petition in the circuit court where the charges were filed, no sooner than 60 days after the acquittal/dismissal order",
    sourceRef: "src/lib/rcap/state-packs/west-virginia/filing-instructions.ts; WV-west-virginia.json#waitingPeriodRules wait-01"
  },
];

/**
 * The clearly-labelled fallbacks UX-COUNTY-001 and UX-COURT-001 require. A
 * participant whose answer is not on a list must always have a way through
 * that does not make them guess.
 */
export const westVirginiaDirectoryFallbacks = {
  countyNotSure: "I am not sure which county handled the case",
  countyManualEntry: "My county is not listed - I will provide it with my documents",
  courtNotSure: "I am not sure which court handled the case",
  courtManualEntry: "My court is not listed - I will provide the exact court name with my documents"
} as const;

/** The option list bound into the compiled profile's county question. */
export const westVirginiaCountySelectorOptions: readonly string[] = [
  ...westVirginiaCounties,
  westVirginiaDirectoryFallbacks.countyNotSure,
  westVirginiaDirectoryFallbacks.countyManualEntry
];

/** The option list bound into the compiled profile's court question. */
export const westVirginiaCourtSelectorOptions: readonly string[] = [
  ...westVirginiaCourtOptions.map((option) => option.value),
  westVirginiaDirectoryFallbacks.courtNotSure,
  westVirginiaDirectoryFallbacks.courtManualEntry
];

export const westVirginiaDirectoryProvenance = {
  jurisdiction: "WV",
  issues: ["UX-COUNTY-001", "UX-COURT-001"],
  shard: "SHARD-5",
  countyCount: 55,
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
