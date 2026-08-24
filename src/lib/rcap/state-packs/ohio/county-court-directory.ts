// Ohio controlled county and court directory for the Expungement.ai
// screening and packet flow (Phase 3, SHARD-5; issues UX-COUNTY-001 and
// UX-COURT-001).
//
// WHY THIS FILE EXISTS. The Phase 1 flow audit recorded that county and court
// were collected as free text with "no controlled dataset behind it", so a
// misspelling reached a court filing unchecked. Phase 2 declared the dataset
// state-specific and left it to the state shards. This is Ohio's half.
//
// WHAT IS AUTHORITATIVE HERE, AND WHAT IS NOT.
//   * `ohioCounties` is the complete set of Ohio counties. It is
//     public administrative reference data, not legal content, and it is
//     exhaustive: every Ohio case sits in exactly one of these.
//   * `ohioCourtOptions` is NOT exhaustive. Each entry carries the quote
//     from this repository that supports it. A court this repository does not
//     name is deliberately absent rather than invented, which is why the
//     manual-entry fallback below is part of the contract and not a nicety.
//
// This module authors no waiting period, no eligibility rule and no legal
// conclusion. It is reference data plus its provenance.

export type OhioCourtOption = {
  /** The value offered to the participant and bound into the packet. */
  readonly value: string;
  /** Verbatim supporting text already present in this repository. */
  readonly sourceQuote: string;
  /** Where that text lives, so a reviewer can check it without searching. */
  readonly sourceRef: string;
};

/** All 88 Ohio counties, in the order the state publishes them. */
export const ohioCounties: readonly string[] = [
  "Adams",
  "Allen",
  "Ashland",
  "Ashtabula",
  "Athens",
  "Auglaize",
  "Belmont",
  "Brown",
  "Butler",
  "Carroll",
  "Champaign",
  "Clark",
  "Clermont",
  "Clinton",
  "Columbiana",
  "Coshocton",
  "Crawford",
  "Cuyahoga",
  "Darke",
  "Defiance",
  "Delaware",
  "Erie",
  "Fairfield",
  "Fayette",
  "Franklin",
  "Fulton",
  "Gallia",
  "Geauga",
  "Greene",
  "Guernsey",
  "Hamilton",
  "Hancock",
  "Hardin",
  "Harrison",
  "Henry",
  "Highland",
  "Hocking",
  "Holmes",
  "Huron",
  "Jackson",
  "Jefferson",
  "Knox",
  "Lake",
  "Lawrence",
  "Licking",
  "Logan",
  "Lorain",
  "Lucas",
  "Madison",
  "Mahoning",
  "Marion",
  "Medina",
  "Meigs",
  "Mercer",
  "Miami",
  "Monroe",
  "Montgomery",
  "Morgan",
  "Morrow",
  "Muskingum",
  "Noble",
  "Ottawa",
  "Paulding",
  "Perry",
  "Pickaway",
  "Pike",
  "Portage",
  "Preble",
  "Putnam",
  "Richland",
  "Ross",
  "Sandusky",
  "Scioto",
  "Seneca",
  "Shelby",
  "Stark",
  "Summit",
  "Trumbull",
  "Tuscarawas",
  "Union",
  "Van Wert",
  "Vinton",
  "Warren",
  "Washington",
  "Wayne",
  "Williams",
  "Wood",
  "Wyandot",
];

/**
 * The courts this repository names for Ohio record-clearing filings.
 * Not a complete directory of Ohio courts - see the file header.
 */
export const ohioCourtOptions: readonly OhioCourtOption[] = [
  {
    value: "Court of Common Pleas",
    sourceQuote: "An eligible offender may apply to the sentencing court for an Ohio conviction, or to a court of common pleas for an out-of-state or federal conviction.",
    sourceRef: "OH-ohio.json#sourceSections (§ 2953.32)"
  },
  {
    value: "Juvenile Court",
    sourceQuote: "For juvenile expungement, 2151.358 requires the juvenile court to expunge records sealed under 2151.356 five years after the sealing order or upon the person's 23rd birthday, whichever comes earlier.",
    sourceRef: "OH-ohio.json#waitingPeriodRules wait-13"
  },
];

/**
 * The clearly-labelled fallbacks UX-COUNTY-001 and UX-COURT-001 require. A
 * participant whose answer is not on a list must always have a way through
 * that does not make them guess.
 */
export const ohioDirectoryFallbacks = {
  countyNotSure: "I am not sure which county handled the case",
  countyManualEntry: "My county is not listed - I will provide it with my documents",
  courtNotSure: "I am not sure which court handled the case",
  courtManualEntry: "My court is not listed - I will provide the exact court name with my documents"
} as const;

/** The option list bound into the compiled profile's county question. */
export const ohioCountySelectorOptions: readonly string[] = [
  ...ohioCounties,
  ohioDirectoryFallbacks.countyNotSure,
  ohioDirectoryFallbacks.countyManualEntry
];

/** The option list bound into the compiled profile's court question. */
export const ohioCourtSelectorOptions: readonly string[] = [
  ...ohioCourtOptions.map((option) => option.value),
  ohioDirectoryFallbacks.courtNotSure,
  ohioDirectoryFallbacks.courtManualEntry
];

export const ohioDirectoryProvenance = {
  jurisdiction: "OH",
  issues: ["UX-COUNTY-001", "UX-COURT-001"],
  shard: "SHARD-5",
  countyCount: 88,
  countiesAreExhaustive: true,
  courtOptionsAreExhaustive: false,
  selectorIsLosslessIfBound: false,
  boundToRuntimeQuestionAuthority: false,
  authorsLegalContent: false,
  // Not bound to a rendered question yet: the runtime question authority is
  // src/lib/rcap-engine/compiled/all51.json, which is not a state-shard path.
  // See data/expungement-ai/flow-audit/shard-results/SHARD-5.json#sharedBlocker.
  bindingBlockedOn: "src/lib/rcap-engine/compiled/all51.json"
} as const;
