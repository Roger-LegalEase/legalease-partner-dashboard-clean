// Missouri controlled filing dataset — Expungement.ai Phase 3, state shard SHARD-3.
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

/** A place a Missouri record-clearing filing or notice actually goes. */
export type MissouriFilingDestinationKind = "court" | "agency";

export interface MissouriFilingDestination {
  /** Stable id. Not shown to a participant. */
  readonly id: string;
  /** The label a selector would show. */
  readonly label: string;
  readonly kind: MissouriFilingDestinationKind;
  /** Where in this repository the name comes from, quoted. */
  readonly provenance: string;
}

export interface MissouriManualEntryFallback {
  readonly allowed: true;
  /** The label the fallback control carries. Clearly labelled is the requirement. */
  readonly label: string;
  readonly helperText: string;
  /** The question id a manually typed value is stored under. */
  readonly storedAs: string;
}

export interface MissouriControlledFilingDataset {
  readonly schema: "rcap-controlled-filing-dataset/v1";
  readonly jurisdiction: { readonly code: string; readonly name: string; readonly slug: string };
  /** The compiled-profile question ids a selector built on this dataset would serve. */
  readonly servesQuestionIds: readonly string[];
  readonly courtDestinations: readonly MissouriFilingDestination[];
  /** Controlled filing-location list, or null when this shard does not own it. */
  readonly filingLocations: readonly string[] | null;
  readonly filingLocationsStatus: string;
  readonly courtManualEntry: MissouriManualEntryFallback;
  readonly filingLocationManualEntry: MissouriManualEntryFallback;
  /** What is deliberately not settled here, and who settles it. */
  readonly unresolved: readonly string[];
  readonly issueIds: readonly string[];
  readonly reviewStatus: "requires_dataset_owner_confirmation";
  readonly consumedBy: "none_yet_shared_selector_is_phase_2";
}

export const missouriControlledFilingDataset: MissouriControlledFilingDataset = {
  schema: "rcap-controlled-filing-dataset/v1",
  jurisdiction: { code: "MO", name: "Missouri", slug: "missouri" },
  servesQuestionIds: ["court", "county_or_filing_location"],
  courtDestinations: [
    {
      id: "circuit-court-of-charge-or-conviction",
      label: "The Missouri circuit court where the person was charged or found guilty",
      kind: "court",
      provenance: "missouri/filing-instructions.ts — \"file in the Missouri court where the person was charged or found guilty\""
    },
    {
      id: "circuit-court-of-arrest-county",
      label: "The circuit court in the county of arrest (arrest-only § 610.140 petitions)",
      kind: "court",
      provenance: "missouri/filing-instructions.ts — \"in a court of competent jurisdiction in the county of arrest\""
    },
    {
      id: "civil-division-circuit-court",
      label: "Civil division of the circuit court in the county of arrest (§§ 610.122–.123)",
      kind: "court",
      provenance: "missouri/filing-instructions.ts — \"file in the civil division of the circuit court in the county of arrest\""
    },
    {
      id: "circuit-clerk",
      label: "The circuit clerk (fees and filing confirmation)",
      kind: "agency",
      provenance: "missouri/filing-instructions.ts — \"Confirm the current fee with the specific circuit clerk before filing\""
    },
  ],
  filingLocations: null,
  filingLocationsStatus: "not_in_scope_for_this_shard: UX-COUNTY-001 assigns only IN and MS to SHARD-3, so no Missouri filing-location list is authored here",
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
    "Missouri municipal courts are implied by the `offense_level` value \"Municipal or ordinance matter\" and by the § 610.140 petition's \"county and municipality where charged\", but no municipal court is named as a filing destination anywhere in the Missouri pack or MO-missouri.json. Left for the dataset owner.",
  ],
  issueIds: ["UX-COURT-001"],
  reviewStatus: "requires_dataset_owner_confirmation",
  consumedBy: "none_yet_shared_selector_is_phase_2"
};
