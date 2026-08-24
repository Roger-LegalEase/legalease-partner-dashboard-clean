// South Carolina controlled filing dataset — Expungement.ai Phase 3, state shard SHARD-3.
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

/** A place a South Carolina record-clearing filing or notice actually goes. */
export type SouthCarolinaFilingDestinationKind = "court" | "agency";

export interface SouthCarolinaFilingDestination {
  /** Stable id. Not shown to a participant. */
  readonly id: string;
  /** The label a selector would show. */
  readonly label: string;
  readonly kind: SouthCarolinaFilingDestinationKind;
  /** Where in this repository the name comes from, quoted. */
  readonly provenance: string;
}

export interface SouthCarolinaManualEntryFallback {
  readonly allowed: true;
  /** The label the fallback control carries. Clearly labelled is the requirement. */
  readonly label: string;
  readonly helperText: string;
  /** The question id a manually typed value is stored under. */
  readonly storedAs: string;
}

export interface SouthCarolinaControlledFilingDataset {
  readonly schema: "rcap-controlled-filing-dataset/v1";
  readonly jurisdiction: { readonly code: string; readonly name: string; readonly slug: string };
  /** The compiled-profile question ids a selector built on this dataset would serve. */
  readonly servesQuestionIds: readonly string[];
  readonly courtDestinations: readonly SouthCarolinaFilingDestination[];
  /** Controlled filing-location list, or null when this shard does not own it. */
  readonly filingLocations: readonly string[] | null;
  readonly filingLocationsStatus: string;
  readonly courtManualEntry: SouthCarolinaManualEntryFallback;
  readonly filingLocationManualEntry: SouthCarolinaManualEntryFallback;
  /** What is deliberately not settled here, and who settles it. */
  readonly unresolved: readonly string[];
  readonly issueIds: readonly string[];
  readonly reviewStatus: "requires_dataset_owner_confirmation";
  readonly consumedBy: "none_yet_shared_selector_is_phase_2";
}

export const southCarolinaControlledFilingDataset: SouthCarolinaControlledFilingDataset = {
  schema: "rcap-controlled-filing-dataset/v1",
  jurisdiction: { code: "SC", name: "South Carolina", slug: "south-carolina" },
  servesQuestionIds: ["court", "county_or_filing_location"],
  courtDestinations: [
    {
      id: "magistrate-court",
      label: "Magistrate court (summary court)",
      kind: "court",
      provenance: "south-carolina/filing-instructions.ts — \"summary court (magistrate/municipal) -> check § 17-22-950\", and SC-south-carolina.json source_question_01"
    },
    {
      id: "municipal-court",
      label: "Municipal court (summary court)",
      kind: "court",
      provenance: "south-carolina/filing-instructions.ts — same summary-court routing line"
    },
    {
      id: "general-sessions",
      label: "Court of General Sessions",
      kind: "court",
      provenance: "south-carolina/filing-instructions.ts — \"General Sessions -> check § 17-1-40, diversion, YOA, drug, firearm, and conviction routes\""
    },
    {
      id: "family-court",
      label: "Family Court (juvenile § 63-19-2050)",
      kind: "court",
      provenance: "south-carolina/filing-instructions.ts — \"Family Court -> check juvenile § 63-19-2050\""
    },
    {
      id: "solicitors-office",
      label: "The Solicitor's Office for the circuit/county where the charge occurred",
      kind: "agency",
      provenance: "south-carolina/filing-instructions.ts — \"apply through the Solicitor's Office in the circuit/county where the charge occurred\""
    },
    {
      id: "clerk-of-court",
      label: "Clerk of Court (order filing)",
      kind: "agency",
      provenance: "south-carolina/filing-instructions.ts — \"files the expungement order with the Clerk of Court\""
    },
    {
      id: "sled",
      label: "South Carolina Law Enforcement Division (SLED)",
      kind: "agency",
      provenance: "south-carolina/filing-instructions.ts — \"The Solicitor sends the application to SLED to verify eligibility when required\""
    },
    {
      id: "probation-parole-pardon-services",
      label: "Department of Probation, Parole and Pardon Services (pardon route only — not expungement)",
      kind: "agency",
      provenance: "south-carolina/filing-instructions.ts — \"a pardon is a separate process through the Department of Probation, Parole and Pardon Services and is NOT expungement\""
    },
  ],
  filingLocations: null,
  filingLocationsStatus: "not_in_scope_for_this_shard: UX-COUNTY-001 assigns only IN and MS to SHARD-3, so no South Carolina filing-location list is authored here",
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
  ],
  issueIds: ["UX-COURT-001"],
  reviewStatus: "requires_dataset_owner_confirmation",
  consumedBy: "none_yet_shared_selector_is_phase_2"
};
