// Pennsylvania controlled county and court directory for the Expungement.ai
// screening and packet flow (Phase 3, SHARD-5; issues UX-COUNTY-001 and
// UX-COURT-001).
//
// WHY THIS FILE EXISTS. The Phase 1 flow audit recorded that county and court
// were collected as free text with "no controlled dataset behind it", so a
// misspelling reached a court filing unchecked. Phase 2 declared the dataset
// state-specific and left it to the state shards. This is Pennsylvania's half.
//
// WHAT IS AUTHORITATIVE HERE, AND WHAT IS NOT.
//   * `pennsylvaniaCounties` is the complete set of Pennsylvania counties. It is
//     public administrative reference data, not legal content, and it is
//     exhaustive: every Pennsylvania case sits in exactly one of these.
//   * `pennsylvaniaCourtOptions` is NOT exhaustive. Each entry carries the quote
//     from this repository that supports it. A court this repository does not
//     name is deliberately absent rather than invented, which is why the
//     manual-entry fallback below is part of the contract and not a nicety.
//
// This module authors no waiting period, no eligibility rule and no legal
// conclusion. It is reference data plus its provenance.

export type PennsylvaniaCourtOption = {
  /** The value offered to the participant and bound into the packet. */
  readonly value: string;
  /** Verbatim supporting text already present in this repository. */
  readonly sourceQuote: string;
  /** Where that text lives, so a reviewer can check it without searching. */
  readonly sourceRef: string;
};

/** All 67 Pennsylvania counties, in the order the state publishes them. */
export const pennsylvaniaCounties: readonly string[] = [
  "Adams",
  "Allegheny",
  "Armstrong",
  "Beaver",
  "Bedford",
  "Berks",
  "Blair",
  "Bradford",
  "Bucks",
  "Butler",
  "Cambria",
  "Cameron",
  "Carbon",
  "Centre",
  "Chester",
  "Clarion",
  "Clearfield",
  "Clinton",
  "Columbia",
  "Crawford",
  "Cumberland",
  "Dauphin",
  "Delaware",
  "Elk",
  "Erie",
  "Fayette",
  "Forest",
  "Franklin",
  "Fulton",
  "Greene",
  "Huntingdon",
  "Indiana",
  "Jefferson",
  "Juniata",
  "Lackawanna",
  "Lancaster",
  "Lawrence",
  "Lebanon",
  "Lehigh",
  "Luzerne",
  "Lycoming",
  "McKean",
  "Mercer",
  "Mifflin",
  "Monroe",
  "Montgomery",
  "Montour",
  "Northampton",
  "Northumberland",
  "Perry",
  "Philadelphia",
  "Pike",
  "Potter",
  "Schuylkill",
  "Snyder",
  "Somerset",
  "Sullivan",
  "Susquehanna",
  "Tioga",
  "Union",
  "Venango",
  "Warren",
  "Washington",
  "Wayne",
  "Westmoreland",
  "Wyoming",
  "York",
];

/**
 * The courts this repository names for Pennsylvania record-clearing filings.
 * Not a complete directory of Pennsylvania courts - see the file header.
 */
export const pennsylvaniaCourtOptions: readonly PennsylvaniaCourtOption[] = [
  {
    value: "Court of Common Pleas",
    sourceQuote: "File petition-based Pennsylvania court relief in the Court of Common Pleas in the county where the case was heard.",
    sourceRef: "src/lib/rcap/state-packs/pennsylvania/filing-instructions.ts; PA-pennsylvania.json#questions source_question_06_court-of-common-pleas"
  },
  {
    value: "Magisterial District Court",
    sourceQuote: "Magisterial District Court",
    sourceRef: "PA-pennsylvania.json#questions source_question_04_magisterial-district-court"
  },
  {
    value: "Philadelphia Municipal Court",
    sourceQuote: "Philadelphia Municipal Court",
    sourceRef: "PA-pennsylvania.json#questions source_question_05_philadelphia-municipal-court"
  },
];

/**
 * The clearly-labelled fallbacks UX-COUNTY-001 and UX-COURT-001 require. A
 * participant whose answer is not on a list must always have a way through
 * that does not make them guess.
 */
export const pennsylvaniaDirectoryFallbacks = {
  countyNotSure: "I am not sure which county handled the case",
  countyManualEntry: "My county is not listed - I will provide it with my documents",
  courtNotSure: "I am not sure which court handled the case",
  courtManualEntry: "My court is not listed - I will provide the exact court name with my documents"
} as const;

/** The option list bound into the compiled profile's county question. */
export const pennsylvaniaCountySelectorOptions: readonly string[] = [
  ...pennsylvaniaCounties,
  pennsylvaniaDirectoryFallbacks.countyNotSure,
  pennsylvaniaDirectoryFallbacks.countyManualEntry
];

/** The option list bound into the compiled profile's court question. */
export const pennsylvaniaCourtSelectorOptions: readonly string[] = [
  ...pennsylvaniaCourtOptions.map((option) => option.value),
  pennsylvaniaDirectoryFallbacks.courtNotSure,
  pennsylvaniaDirectoryFallbacks.courtManualEntry
];

export const pennsylvaniaDirectoryProvenance = {
  jurisdiction: "PA",
  issues: ["UX-COUNTY-001", "UX-COURT-001"],
  shard: "SHARD-5",
  countyCount: 67,
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
