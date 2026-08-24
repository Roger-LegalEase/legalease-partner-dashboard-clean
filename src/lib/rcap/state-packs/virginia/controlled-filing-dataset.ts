// Virginia controlled filing dataset — Expungement.ai Phase 3, state shard SHARD-3.
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

/** A place a Virginia record-clearing filing or notice actually goes. */
export type VirginiaFilingDestinationKind = "court" | "agency";

export interface VirginiaFilingDestination {
  /** Stable id. Not shown to a participant. */
  readonly id: string;
  /** The label a selector would show. */
  readonly label: string;
  readonly kind: VirginiaFilingDestinationKind;
  /** Where in this repository the name comes from, quoted. */
  readonly provenance: string;
}

export interface VirginiaManualEntryFallback {
  readonly allowed: true;
  /** The label the fallback control carries. Clearly labelled is the requirement. */
  readonly label: string;
  readonly helperText: string;
  /** The question id a manually typed value is stored under. */
  readonly storedAs: string;
}

export interface VirginiaControlledFilingDataset {
  readonly schema: "rcap-controlled-filing-dataset/v1";
  readonly jurisdiction: { readonly code: string; readonly name: string; readonly slug: string };
  /** The compiled-profile question ids a selector built on this dataset would serve. */
  readonly servesQuestionIds: readonly string[];
  readonly courtDestinations: readonly VirginiaFilingDestination[];
  /** Controlled filing-location list, or null when this shard does not own it. */
  readonly filingLocations: readonly string[] | null;
  readonly filingLocationsStatus: string;
  readonly courtManualEntry: VirginiaManualEntryFallback;
  readonly filingLocationManualEntry: VirginiaManualEntryFallback;
  /** What is deliberately not settled here, and who settles it. */
  readonly unresolved: readonly string[];
  readonly issueIds: readonly string[];
  readonly reviewStatus: "requires_dataset_owner_confirmation";
  readonly consumedBy: "none_yet_shared_selector_is_phase_2";
}

export const virginiaControlledFilingDataset: VirginiaControlledFilingDataset = {
  schema: "rcap-controlled-filing-dataset/v1",
  jurisdiction: { code: "VA", name: "Virginia", slug: "virginia" },
  servesQuestionIds: ["court", "county_or_filing_location"],
  courtDestinations: [
    {
      id: "circuit-court",
      label: "Circuit court — expungement (§ 19.2-392.2) and petition-based sealing (§ 19.2-392.12)",
      kind: "court",
      provenance: "VA-virginia.json pathway summaries — \"A petition in circuit court to expunge police and court records\" and \"may petition the circuit court to seal it\""
    },
    {
      id: "general-district-court",
      label: "General District Court — the court that heard the case",
      kind: "court",
      provenance: "VA-virginia.json — \"General District Court\""
    },
    {
      id: "office-of-the-executive-secretary",
      label: "Office of the Executive Secretary of the Supreme Court of Virginia",
      kind: "agency",
      provenance: "VA-virginia.json — \"Executive Secretary of the Supreme Court\""
    },
  ],
  filingLocations: null,
  filingLocationsStatus: "not_in_scope_for_this_shard: UX-COUNTY-001 assigns only IN and MS to SHARD-3, so no Virginia filing-location list is authored here",
  courtManualEntry: {
    allowed: true,
    label: "My court isn't on this list — let me type it",
    helperText: "Type the court exactly as it appears on your paperwork. We will keep what you type and flag the matter for a person to check before anything is filed.",
    storedAs: "court"
  },
  filingLocationManualEntry: {
    allowed: true,
    label: "My county or independent city isn't on this list — let me type it",
    helperText: "Type the county or independent city exactly as it appears on your paperwork. We will keep what you type and flag the matter for a person to check before anything is filed.",
    storedAs: "county_or_filing_location"
  },
  unresolved: [
    "Virginia's Juvenile and Domestic Relations District Court is not named in VA-virginia.json or in the Virginia state pack, so it is not asserted here.",
    "Virginia is a county-and-independent-city filing jurisdiction: an independent city is not inside a county, so a county-only list would be wrong for Virginia. The full filing-location list is UX-COUNTY-001 work and UX-COUNTY-001 assigns only IN and MS to this shard.",
  ],
  issueIds: ["UX-COURT-001"],
  reviewStatus: "requires_dataset_owner_confirmation",
  consumedBy: "none_yet_shared_selector_is_phase_2"
};
