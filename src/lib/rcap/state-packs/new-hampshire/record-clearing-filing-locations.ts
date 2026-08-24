// Controlled filing-location dataset for New Hampshire (NH).
//
// Phase 3 SHARD-6 addresses UX-COUNTY-001 and UX-COURT-001 for this state: county
// and court were collected as free text with no state-aware selector and no
// controlled dataset behind them, so a misspelling could reach a court filing
// unchecked. This module supplies the controlled dataset half of that fix.
//
// It authors no legal rule, no waiting period and no eligibility test. It records
// which counties exist in New Hampshire and which courts and agencies handle
// record-clearing matters, so a selector can offer a closed list instead of a text
// box. Manual entry stays available and is labelled, because a participant whose
// court is not on the list must still be able to say so.
//
// Binding this dataset to a rendered selector is a shared-renderer change and is
// not made here.

export type NewHampshireFilingLocationQualifier = "county" | "statewide";

export interface NewHampshireRecordClearingCourt {
  /** Stable identifier for this venue; never shown to a participant. */
  readonly id: string;
  /** The name a participant sees in the selector. */
  readonly label: string;
  /** Which local unit qualifies the venue, or "statewide" when none does. */
  readonly qualifiedBy: NewHampshireFilingLocationQualifier;
}

/** Every county in New Hampshire, in alphabetical order. */
export const newHampshireFilingLocalUnits = [
  "Belknap",
  "Carroll",
  "Cheshire",
  "Coos",
  "Grafton",
  "Hillsborough",
  "Merrimack",
  "Rockingham",
  "Strafford",
  "Sullivan",
] as const;

/** Courts and agencies that handle New Hampshire record-clearing matters. */
export const newHampshireRecordClearingCourts: readonly NewHampshireRecordClearingCourt[] = [
  { id: "circuit-court-district-division", label: "Circuit Court — District Division", qualifiedBy: "county" },
  { id: "superior-court", label: "Superior Court", qualifiedBy: "county" },
  { id: "circuit-court-family-division", label: "Circuit Court — Family Division", qualifiedBy: "county" },
  { id: "new-hampshire-state-police-criminal-records", label: "New Hampshire State Police — Criminal Records Unit", qualifiedBy: "statewide" },
];

/**
 * The controlled dataset a state-aware county/court selector reads, with the
 * manual-entry fallback it must offer alongside it.
 */
export const newHampshireRecordClearingFilingLocations = {
  jurisdiction: { code: "NH", name: "New Hampshire", slug: "new-hampshire" },
  localUnitLabel: "County",
  localUnitPlural: "counties",
  localUnitCount: 10,
  localUnits: newHampshireFilingLocalUnits,
  courts: newHampshireRecordClearingCourts,
  note: "New Hampshire has 10 counties. An annulment petition under RSA 651:5 is filed in the court that entered the conviction: the Circuit Court - District Division for violations and misdemeanors, and the Superior Court for felonies. RSA 651:5-b marijuana-possession annulments are filed in the court where the arrest or conviction occurred.",
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
    verifiedAgainst: "Compiled profile pathway and source references for NH at PHASE2_PRODUCT_HEAD.",
  },
} as const;
