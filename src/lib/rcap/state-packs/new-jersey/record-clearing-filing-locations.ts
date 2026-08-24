// Controlled filing-location dataset for New Jersey (NJ).
//
// Phase 3 SHARD-6 addresses UX-COUNTY-001 and UX-COURT-001 for this state: county
// and court were collected as free text with no state-aware selector and no
// controlled dataset behind them, so a misspelling could reach a court filing
// unchecked. This module supplies the controlled dataset half of that fix.
//
// It authors no legal rule, no waiting period and no eligibility test. It records
// which counties exist in New Jersey and which courts and agencies handle
// record-clearing matters, so a selector can offer a closed list instead of a text
// box. Manual entry stays available and is labelled, because a participant whose
// court is not on the list must still be able to say so.
//
// Binding this dataset to a rendered selector is a shared-renderer change and is
// not made here.

export type NewJerseyFilingLocationQualifier = "county" | "statewide";

export interface NewJerseyRecordClearingCourt {
  /** Stable identifier for this venue; never shown to a participant. */
  readonly id: string;
  /** The name a participant sees in the selector. */
  readonly label: string;
  /** Which local unit qualifies the venue, or "statewide" when none does. */
  readonly qualifiedBy: NewJerseyFilingLocationQualifier;
}

/** Every county in New Jersey, in alphabetical order. */
export const newJerseyFilingLocalUnits = [
  "Atlantic",
  "Bergen",
  "Burlington",
  "Camden",
  "Cape May",
  "Cumberland",
  "Essex",
  "Gloucester",
  "Hudson",
  "Hunterdon",
  "Mercer",
  "Middlesex",
  "Monmouth",
  "Morris",
  "Ocean",
  "Passaic",
  "Salem",
  "Somerset",
  "Sussex",
  "Union",
  "Warren",
] as const;

/** Courts and agencies that handle New Jersey record-clearing matters. */
export const newJerseyRecordClearingCourts: readonly NewJerseyRecordClearingCourt[] = [
  { id: "superior-court-law-division-criminal", label: "Superior Court — Law Division, Criminal Part", qualifiedBy: "county" },
  { id: "superior-court-family-division", label: "Superior Court — Chancery Division, Family Part", qualifiedBy: "county" },
  { id: "municipal-court", label: "Municipal Court", qualifiedBy: "county" },
  { id: "nj-state-police-criminal-information-unit", label: "New Jersey State Police — Criminal Information Unit", qualifiedBy: "statewide" },
];

/**
 * The controlled dataset a state-aware county/court selector reads, with the
 * manual-entry fallback it must offer alongside it.
 */
export const newJerseyRecordClearingFilingLocations = {
  jurisdiction: { code: "NJ", name: "New Jersey", slug: "new-jersey" },
  localUnitLabel: "County",
  localUnitPlural: "counties",
  localUnitCount: 21,
  localUnits: newJerseyFilingLocalUnits,
  courts: newJerseyRecordClearingCourts,
  note: "New Jersey has 21 counties grouped into 15 vicinages. Expungement petitions under N.J.S.A. 2C:52 are filed in the Superior Court, Law Division - Criminal Part, for the county where the arrest or conviction occurred; disorderly-persons and municipal-ordinance matters originate in the Municipal Court of the municipality involved.",
  manualEntry: {
    allowed: true,
    optionLabel: "My county or court is not listed",
    helperText:
      "Type the county and court exactly as they appear on your paperwork. We will " +
      "use what you type and flag it for review before anything is filed.",
  },
  review: {
    /** Build status only. QA, counsel and source-freshness review are tracked separately. */
    buildStatus: "state_built" as const,
    /** The selector itself is a shared-renderer change and is not made in this shard. */
    rendererBindingOwner: "phase_2_shared_renderer" as const,
    verifiedAgainst: "Compiled profile pathway and source references for NJ at PHASE2_PRODUCT_HEAD.",
  },
} as const;
