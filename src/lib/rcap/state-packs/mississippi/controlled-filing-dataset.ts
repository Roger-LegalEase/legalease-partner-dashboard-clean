// Mississippi controlled filing dataset — Expungement.ai Phase 3, state shard SHARD-3.
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

/** A place a Mississippi record-clearing filing or notice actually goes. */
export type MississippiFilingFilingDestinationKind = "court" | "agency";

export interface MississippiFilingFilingDestination {
  /** Stable id. Not shown to a participant. */
  readonly id: string;
  /** The label a selector would show. */
  readonly label: string;
  readonly kind: MississippiFilingFilingDestinationKind;
  /** Where in this repository the name comes from, quoted. */
  readonly provenance: string;
}

export interface MississippiFilingManualEntryFallback {
  readonly allowed: true;
  /** The label the fallback control carries. Clearly labelled is the requirement. */
  readonly label: string;
  readonly helperText: string;
  /** The question id a manually typed value is stored under. */
  readonly storedAs: string;
}

export interface MississippiFilingControlledFilingDataset {
  readonly schema: "rcap-controlled-filing-dataset/v1";
  readonly jurisdiction: { readonly code: string; readonly name: string; readonly slug: string };
  /** The compiled-profile question ids a selector built on this dataset would serve. */
  readonly servesQuestionIds: readonly string[];
  readonly courtDestinations: readonly MississippiFilingFilingDestination[];
  /** Controlled filing-location list, or null when this shard does not own it. */
  readonly filingLocations: readonly string[] | null;
  readonly filingLocationsStatus: string;
  readonly courtManualEntry: MississippiFilingManualEntryFallback;
  readonly filingLocationManualEntry: MississippiFilingManualEntryFallback;
  /** What is deliberately not settled here, and who settles it. */
  readonly unresolved: readonly string[];
  readonly issueIds: readonly string[];
  readonly reviewStatus: "requires_dataset_owner_confirmation";
  readonly consumedBy: "none_yet_shared_selector_is_phase_2";
}

export const mississippiControlledFilingDataset: MississippiFilingControlledFilingDataset = {
  schema: "rcap-controlled-filing-dataset/v1",
  jurisdiction: { code: "MS", name: "Mississippi", slug: "mississippi" },
  servesQuestionIds: ["source_question_02_2-which-county-and-court-handled-it"],
  courtDestinations: [
    {
      id: "circuit-court",
      label: "Circuit Court",
      kind: "court",
      provenance: "mississippi/county-court-instructions.ts `MississippiCourtType`, and MS-mississippi.json source_question_06 \"Circuit Court?\""
    },
    {
      id: "county-court",
      label: "County Court",
      kind: "court",
      provenance: "mississippi/county-court-instructions.ts `MississippiCourtType`, and MS-mississippi.json source_question_05 \"County Court?\""
    },
    {
      id: "justice-court",
      label: "Justice Court",
      kind: "court",
      provenance: "mississippi/county-court-instructions.ts `MississippiCourtType`, and MS-mississippi.json source_question_03 \"Justice Court?\""
    },
    {
      id: "municipal-court",
      label: "Municipal Court",
      kind: "court",
      provenance: "mississippi/county-court-instructions.ts `MississippiCourtType`, and MS-mississippi.json source_question_04 \"Municipal Court?\""
    },
    {
      id: "youth-court",
      label: "Youth Court",
      kind: "court",
      provenance: "MS-mississippi.json source_question_07 \"Youth Court?\""
    },
    {
      id: "intervention-court",
      label: "Intervention court (drug/veterans/mental-health court)",
      kind: "court",
      provenance: "MS-mississippi.json source_question_17 \"Intervention court?\""
    },
    {
      id: "district-attorney",
      label: "District attorney (10 days' written notice before a felony hearing)",
      kind: "agency",
      provenance: "MS-mississippi.json wait-07/wait-15 — \"The petitioner must give 10 days' written notice to the district attorney before any hearing\""
    },
  ],
  // 82 counties, the full Mississippi set, sorted by String.prototype.localeCompare("en")
  // so the order is reproducible. Administrative geography, not legal content, and
  // still marked for the dataset owner's confirmation before a selector ships on it.
  filingLocations: [
    "Adams", "Alcorn", "Amite", "Attala",
    "Benton", "Bolivar", "Calhoun", "Carroll",
    "Chickasaw", "Choctaw", "Claiborne", "Clarke",
    "Clay", "Coahoma", "Copiah", "Covington",
    "DeSoto", "Forrest", "Franklin", "George",
    "Greene", "Grenada", "Hancock", "Harrison",
    "Hinds", "Holmes", "Humphreys", "Issaquena",
    "Itawamba", "Jackson", "Jasper", "Jefferson",
    "Jefferson Davis", "Jones", "Kemper", "Lafayette",
    "Lamar", "Lauderdale", "Lawrence", "Leake",
    "Lee", "Leflore", "Lincoln", "Lowndes",
    "Madison", "Marion", "Marshall", "Monroe",
    "Montgomery", "Neshoba", "Newton", "Noxubee",
    "Oktibbeha", "Panola", "Pearl River", "Perry",
    "Pike", "Pontotoc", "Prentiss", "Quitman",
    "Rankin", "Scott", "Sharkey", "Simpson",
    "Smith", "Stone", "Sunflower", "Tallahatchie",
    "Tate", "Tippah", "Tishomingo", "Tunica",
    "Union", "Walthall", "Warren", "Washington",
    "Wayne", "Webster", "Wilkinson", "Winston",
    "Yalobusha", "Yazoo",
  ],
  filingLocationsStatus: "complete_ms_county_list_pending_dataset_owner_confirmation",
  courtManualEntry: {
    allowed: true,
    label: "My court isn't on this list — let me type it",
    helperText: "Type the court exactly as it appears on your paperwork. We will keep what you type and flag the matter for a person to check before anything is filed.",
    storedAs: "source_question_02_2-which-county-and-court-handled-it"
  },
  filingLocationManualEntry: {
    allowed: true,
    label: "My county isn't on this list — let me type it",
    helperText: "Type the county exactly as it appears on your paperwork. We will keep what you type and flag the matter for a person to check before anything is filed.",
    storedAs: "source_question_02_2-which-county-and-court-handled-it"
  },
  unresolved: [
  ],
  issueIds: ["UX-COURT-001", "UX-COUNTY-001"],
  reviewStatus: "requires_dataset_owner_confirmation",
  consumedBy: "none_yet_shared_selector_is_phase_2"
};
