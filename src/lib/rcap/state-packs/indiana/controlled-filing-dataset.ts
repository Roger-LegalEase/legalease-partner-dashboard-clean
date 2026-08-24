// Indiana controlled filing dataset — Expungement.ai Phase 3, state shard SHARD-3.
//
// Why this file exists: UX-COURT-001 (and, for this state, UX-COUNTY-001)
// recorded that court and county are collected as free text with no controlled dataset
// behind them, so a misspelling reaches a court filing unchecked. The audit put the
// remedy in two halves: a shared state-aware selector, which is Phase 2's, and the
// per-state binding, which is this shard's. This is the binding half.
//
// Every court and agency named below is quoted from repository content — this state's
// compiled profile or its own state pack — and each row carries the quotation it came
// from. No filing destination is asserted from outside the repository.
//
// Nothing consumes this yet. The renderer, the public projection and the packet
// questionnaire are all shared paths this shard may not touch, so the dataset is
// published for the selector to bind to and the question keeps its free-text control
// until that shared half lands. The manual-entry fallback below is part of the
// contract, not a concession: a controlled list that cannot be escaped would block a
// filing the list happens to miss.

/** A place a Indiana record-clearing filing or notice actually goes. */
export type IndianaFilingDestinationKind = "court" | "agency";

export interface IndianaFilingDestination {
  /** Stable id. Not shown to a participant. */
  readonly id: string;
  /** The label a selector would show. */
  readonly label: string;
  readonly kind: IndianaFilingDestinationKind;
  /** Where in this repository the name comes from, quoted. */
  readonly provenance: string;
}

export interface IndianaManualEntryFallback {
  readonly allowed: true;
  /** The label the fallback control carries. Clearly labelled is the requirement. */
  readonly label: string;
  readonly helperText: string;
  /** The question id a manually typed value is stored under. */
  readonly storedAs: string;
}

export interface IndianaControlledFilingDataset {
  readonly schema: "rcap-controlled-filing-dataset/v1";
  readonly jurisdiction: { readonly code: string; readonly name: string; readonly slug: string };
  /** The compiled-profile question ids a selector built on this dataset would serve. */
  readonly servesQuestionIds: readonly string[];
  readonly courtDestinations: readonly IndianaFilingDestination[];
  /** Controlled filing-location list, or null when this shard does not own it. */
  readonly filingLocations: readonly string[] | null;
  readonly filingLocationsStatus: string;
  readonly courtManualEntry: IndianaManualEntryFallback;
  readonly filingLocationManualEntry: IndianaManualEntryFallback;
  /** What is deliberately not settled here, and who settles it. */
  readonly unresolved: readonly string[];
  readonly issueIds: readonly string[];
  readonly reviewStatus: "requires_dataset_owner_confirmation";
  readonly consumedBy: "none_yet_shared_selector_is_phase_2";
}

export const indianaControlledFilingDataset: IndianaControlledFilingDataset = {
  schema: "rcap-controlled-filing-dataset/v1",
  jurisdiction: { code: "IN", name: "Indiana", slug: "indiana" },
  servesQuestionIds: ["court", "county"],
  courtDestinations: [
    {
      id: "sentencing-court",
      label: "The trial court that handled the case (sentencing court)",
      kind: "court",
      provenance: "IN-indiana.json — I.C. § 35-38-9-6(c)/(d) order text: \"the records of the sentencing court, a juvenile court, the Court of Appeals of Indiana, and the Indiana Supreme Court\""
    },
    {
      id: "juvenile-court",
      label: "The juvenile court that handled the allegation",
      kind: "court",
      provenance: "IN-indiana.json — same § 35-38-9-6(d) order text, and the CCA-XP juvenile petition set"
    },
    {
      id: "county-prosecutor",
      label: "The county prosecutor's office (service copy)",
      kind: "agency",
      provenance: "IN-indiana.json — CCA-XP certificate of service: \"_______________________ County Prosecutor's Office\""
    },
    {
      id: "trial-court-clerk",
      label: "The trial court clerk (confidential-information filing)",
      kind: "agency",
      provenance: "IN-indiana.json — Form ACR: \"Notice of Exclusion of Confidential Information from Public Access (FILED WITH TRIAL COURT CLERK)\""
    },
  ],
  // 92 counties, the full Indiana set, sorted by String.prototype.localeCompare("en")
  // so the order is reproducible. Administrative geography, not legal content, and
  // still marked for the dataset owner's confirmation before a selector ships on it.
  filingLocations: [
    "Adams", "Allen", "Bartholomew", "Benton",
    "Blackford", "Boone", "Brown", "Carroll",
    "Cass", "Clark", "Clay", "Clinton",
    "Crawford", "Daviess", "Dearborn", "Decatur",
    "DeKalb", "Delaware", "Dubois", "Elkhart",
    "Fayette", "Floyd", "Fountain", "Franklin",
    "Fulton", "Gibson", "Grant", "Greene",
    "Hamilton", "Hancock", "Harrison", "Hendricks",
    "Henry", "Howard", "Huntington", "Jackson",
    "Jasper", "Jay", "Jefferson", "Jennings",
    "Johnson", "Knox", "Kosciusko", "LaGrange",
    "Lake", "LaPorte", "Lawrence", "Madison",
    "Marion", "Marshall", "Martin", "Miami",
    "Monroe", "Montgomery", "Morgan", "Newton",
    "Noble", "Ohio", "Orange", "Owen",
    "Parke", "Perry", "Pike", "Porter",
    "Posey", "Pulaski", "Putnam", "Randolph",
    "Ripley", "Rush", "Scott", "Shelby",
    "Spencer", "St. Joseph", "Starke", "Steuben",
    "Sullivan", "Switzerland", "Tippecanoe", "Tipton",
    "Union", "Vanderburgh", "Vermillion", "Vigo",
    "Wabash", "Warren", "Warrick", "Washington",
    "Wayne", "Wells", "White", "Whitley",
  ],
  filingLocationsStatus: "complete_in_county_list_pending_dataset_owner_confirmation",
  courtManualEntry: {
    allowed: true,
    label: "My court isn't on this list — let me type it",
    helperText: "Type the court exactly as it appears on your paperwork. We will keep what you type and flag the matter for a person to check before anything is filed.",
    storedAs: "court"
  },
  filingLocationManualEntry: {
    allowed: true,
    label: "My county isn't on this list — let me type it",
    helperText: "Type the county exactly as it appears on your paperwork. We will keep what you type and flag the matter for a person to check before anything is filed.",
    storedAs: "county"
  },
  unresolved: [
    "Indiana's trial-court tier names — circuit court, superior court, city court and town court — are not stated anywhere in IN-indiana.json or in the Indiana state pack. The CCA-XP caption leaves them blank (\"IN THE __________________ _________________ COURT\"), so this dataset names the court by its role rather than its tier, and the tier list is left for the dataset owner.",
  ],
  issueIds: ["UX-COURT-001", "UX-COUNTY-001"],
  reviewStatus: "requires_dataset_owner_confirmation",
  consumedBy: "none_yet_shared_selector_is_phase_2"
};
