// Controlled filing-location dataset for Vermont (VT).
//
// Phase 3 SHARD-6 addresses UX-COUNTY-001 and UX-COURT-001 for this state: county
// and court were collected as free text with no state-aware selector and no
// controlled dataset behind them, so a misspelling could reach a court filing
// unchecked. This module supplies the controlled dataset half of that fix.
//
// It authors no legal rule, no waiting period and no eligibility test. It records
// which counties exist in Vermont and which courts and agencies handle
// record-clearing matters, so a selector can offer a closed list instead of a text
// box. Manual entry stays available and is labelled, because a participant whose
// court is not on the list must still be able to say so.
//
// Binding this dataset to a rendered selector is a shared-renderer change and is
// not made here.

export type VermontFilingLocationQualifier = "county" | "statewide";

export interface VermontRecordClearingCourt {
  /** Stable identifier for this venue; never shown to a participant. */
  readonly id: string;
  /** The name a participant sees in the selector. */
  readonly label: string;
  /** Which local unit qualifies the venue, or "statewide" when none does. */
  readonly qualifiedBy: VermontFilingLocationQualifier;
}

/** Every county in Vermont, in alphabetical order. */
export const vermontFilingLocalUnits = [
  "Addison",
  "Bennington",
  "Caledonia",
  "Chittenden",
  "Essex",
  "Franklin",
  "Grand Isle",
  "Lamoille",
  "Orange",
  "Orleans",
  "Rutland",
  "Washington",
  "Windham",
  "Windsor",
] as const;

/** Courts and agencies that handle Vermont record-clearing matters. */
export const vermontRecordClearingCourts: readonly VermontRecordClearingCourt[] = [
  { id: "superior-court-criminal-division", label: "Superior Court — Criminal Division", qualifiedBy: "county" },
  { id: "superior-court-family-division", label: "Superior Court — Family Division", qualifiedBy: "county" },
  { id: "judicial-bureau", label: "Judicial Bureau", qualifiedBy: "statewide" },
  { id: "vermont-crime-information-center", label: "Vermont Crime Information Center", qualifiedBy: "statewide" },
];

/**
 * The controlled dataset a state-aware county/court selector reads, with the
 * manual-entry fallback it must offer alongside it.
 */
export const vermontRecordClearingFilingLocations = {
  jurisdiction: { code: "VT", name: "Vermont", slug: "vermont" },
  localUnitLabel: "County",
  localUnitPlural: "counties",
  localUnitCount: 14,
  localUnits: vermontFilingLocalUnits,
  courts: vermontRecordClearingCourts,
  note: "Vermont has 14 counties. Sealing and expungement petitions under 13 V.S.A. §§ 7601-7609 are filed in the Superior Court, Criminal Division, for the county that handled the case; juvenile sealing under 33 V.S.A. § 5119 is handled by the Family Division.",
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
    verifiedAgainst: "Compiled profile pathway and source references for VT at PHASE2_PRODUCT_HEAD.",
  },
} as const;
