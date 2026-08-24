// Massachusetts controlled filing dataset — Expungement.ai Phase 3, state shard SHARD-3.
//
// Why this file exists: UX-COURT-001 (and, for IN and MS, UX-COUNTY-001)
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

/** A place a Massachusetts record-clearing filing or notice actually goes. */
export type MassachusettsFilingDestinationKind = "court" | "agency";

export interface MassachusettsFilingDestination {
  /** Stable id. Not shown to a participant. */
  readonly id: string;
  /** The label a selector would show. */
  readonly label: string;
  readonly kind: MassachusettsFilingDestinationKind;
  /** Where in this repository the name comes from, quoted. */
  readonly provenance: string;
}

export interface MassachusettsManualEntryFallback {
  readonly allowed: true;
  /** The label the fallback control carries. Clearly labelled is the requirement. */
  readonly label: string;
  readonly helperText: string;
  /** The question id a manually typed value is stored under. */
  readonly storedAs: string;
}

export interface MassachusettsControlledFilingDataset {
  readonly schema: "rcap-controlled-filing-dataset/v1";
  readonly jurisdiction: { readonly code: string; readonly name: string; readonly slug: string };
  /** The compiled-profile question ids a selector built on this dataset would serve. */
  readonly servesQuestionIds: readonly string[];
  readonly courtDestinations: readonly MassachusettsFilingDestination[];
  /** Controlled filing-location list, or null when this shard does not own it. */
  readonly filingLocations: readonly string[] | null;
  readonly filingLocationsStatus: string;
  readonly courtManualEntry: MassachusettsManualEntryFallback;
  readonly filingLocationManualEntry: MassachusettsManualEntryFallback;
  /** What is deliberately not settled here, and who settles it. */
  readonly unresolved: readonly string[];
  readonly issueIds: readonly string[];
  readonly reviewStatus: "requires_dataset_owner_confirmation";
  readonly consumedBy: "none_yet_shared_selector_is_phase_2";
}

export const massachusettsControlledFilingDataset: MassachusettsControlledFilingDataset = {
  schema: "rcap-controlled-filing-dataset/v1",
  jurisdiction: { code: "MA", name: "Massachusetts", slug: "massachusetts" },
  servesQuestionIds: ["court", "county_or_filing_location"],
  courtDestinations: [
    {
      id: "district-court",
      label: "District Court — the division where the case started",
      kind: "court",
      provenance: "massachusetts/filing-instructions.ts — \"District Court cases are filed at the clerk's office where the case started\""
    },
    {
      id: "boston-municipal-court",
      label: "Boston Municipal Court — the division where the person lives, or the division the record is from",
      kind: "court",
      provenance: "massachusetts/filing-instructions.ts — \"Boston Municipal Court cases are filed in the BMC division where the person lives\""
    },
    {
      id: "court-connected-to-the-record",
      label: "The court connected to the record (§ 100K and marijuana-only petitions)",
      kind: "court",
      provenance: "massachusetts/filing-instructions.ts — \"file in the court connected to the record\" and \"file in the court that handled the case\""
    },
    {
      id: "commissioner-of-probation",
      label: "Massachusetts Probation Service — Office of the Commissioner of Probation",
      kind: "agency",
      provenance: "massachusetts/filing-instructions.ts — conviction sealing and time-based expungement are filed with the Commissioner of Probation"
    },
  ],
  filingLocations: null,
  filingLocationsStatus: "not_in_scope_for_this_shard: UX-COUNTY-001 assigns only IN and MS to SHARD-3, so no Massachusetts filing-location list is authored here",
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
    storedAs: "county_or_filing_location"
  },
  unresolved: [
    "Massachusetts Juvenile Court is not named in the Massachusetts state pack or in MA-massachusetts.json, even though § 100B is a juvenile route. The § 100B filing destination is left for the dataset owner rather than assumed.",
  ],
  issueIds: ["UX-COURT-001"],
  reviewStatus: "requires_dataset_owner_confirmation",
  consumedBy: "none_yet_shared_selector_is_phase_2"
};
