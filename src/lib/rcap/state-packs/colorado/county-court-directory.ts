// Colorado controlled county and court directory for the Expungement.ai
// screening and packet flow (Phase 3, SHARD-5; issues UX-COUNTY-001 and
// UX-COURT-001).
//
// WHY THIS FILE EXISTS. The Phase 1 flow audit recorded that county and court
// were collected as free text with "no controlled dataset behind it", so a
// misspelling reached a court filing unchecked. Phase 2 declared the dataset
// state-specific and left it to the state shards. This is Colorado's half.
//
// WHAT IS AUTHORITATIVE HERE, AND WHAT IS NOT.
//   * `coloradoCounties` is the complete set of Colorado counties. It is
//     public administrative reference data, not legal content, and it is
//     exhaustive: every Colorado case sits in exactly one of these.
//   * `coloradoCourtOptions` is NOT exhaustive. Each entry carries the quote
//     from this repository that supports it. A court this repository does not
//     name is deliberately absent rather than invented, which is why the
//     manual-entry fallback below is part of the contract and not a nicety.
//
// This module authors no waiting period, no eligibility rule and no legal
// conclusion. It is reference data plus its provenance.

export type ColoradoCourtOption = {
  /** The value offered to the participant and bound into the packet. */
  readonly value: string;
  /** Verbatim supporting text already present in this repository. */
  readonly sourceQuote: string;
  /** Where that text lives, so a reviewer can check it without searching. */
  readonly sourceRef: string;
};

/** All 64 Colorado counties, in the order the state publishes them. */
export const coloradoCounties: readonly string[] = [
  "Adams",
  "Alamosa",
  "Arapahoe",
  "Archuleta",
  "Baca",
  "Bent",
  "Boulder",
  "Broomfield",
  "Chaffee",
  "Cheyenne",
  "Clear Creek",
  "Conejos",
  "Costilla",
  "Crowley",
  "Custer",
  "Delta",
  "Denver",
  "Dolores",
  "Douglas",
  "Eagle",
  "Elbert",
  "El Paso",
  "Fremont",
  "Garfield",
  "Gilpin",
  "Grand",
  "Gunnison",
  "Hinsdale",
  "Huerfano",
  "Jackson",
  "Jefferson",
  "Kiowa",
  "Kit Carson",
  "Lake",
  "La Plata",
  "Larimer",
  "Las Animas",
  "Lincoln",
  "Logan",
  "Mesa",
  "Mineral",
  "Moffat",
  "Montezuma",
  "Montrose",
  "Morgan",
  "Otero",
  "Ouray",
  "Park",
  "Phillips",
  "Pitkin",
  "Prowers",
  "Pueblo",
  "Rio Blanco",
  "Rio Grande",
  "Routt",
  "Saguache",
  "San Juan",
  "San Miguel",
  "Sedgwick",
  "Summit",
  "Teller",
  "Washington",
  "Weld",
  "Yuma",
];

/**
 * The courts this repository names for Colorado record-clearing filings.
 * Not a complete directory of Colorado courts - see the file header.
 */
export const coloradoCourtOptions: readonly ColoradoCourtOption[] = [
  {
    value: "District Court",
    sourceQuote: "Example A — Motion to Seal Conviction Records (JDF 612, § 24-72-706) DISTRICT COURT, EL PASO COUNTY, COLORADO",
    sourceRef: "CO-colorado.json#sourceSections (JDF 612 sample caption)"
  },
];

/**
 * The clearly-labelled fallbacks UX-COUNTY-001 and UX-COURT-001 require. A
 * participant whose answer is not on a list must always have a way through
 * that does not make them guess.
 */
export const coloradoDirectoryFallbacks = {
  countyNotSure: "I am not sure which county handled the case",
  countyManualEntry: "My county is not listed - I will provide it with my documents",
  courtNotSure: "I am not sure which court handled the case",
  courtManualEntry: "My court is not listed - I will provide the exact court name with my documents"
} as const;

/** The option list bound into the compiled profile's county question. */
export const coloradoCountySelectorOptions: readonly string[] = [
  ...coloradoCounties,
  coloradoDirectoryFallbacks.countyNotSure,
  coloradoDirectoryFallbacks.countyManualEntry
];

/** The option list bound into the compiled profile's court question. */
export const coloradoCourtSelectorOptions: readonly string[] = [
  ...coloradoCourtOptions.map((option) => option.value),
  coloradoDirectoryFallbacks.courtNotSure,
  coloradoDirectoryFallbacks.courtManualEntry
];

export const coloradoDirectoryProvenance = {
  jurisdiction: "CO",
  issues: ["UX-COUNTY-001", "UX-COURT-001"],
  shard: "SHARD-5",
  countyCount: 64,
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
