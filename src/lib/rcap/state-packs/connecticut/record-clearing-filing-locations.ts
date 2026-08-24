// Controlled filing-location dataset for Connecticut (CT).
//
// Phase 3 SHARD-6 addresses UX-COUNTY-001 and UX-COURT-001 for this state: county
// and court were collected as free text with no state-aware selector and no
// controlled dataset behind them, so a misspelling could reach a court filing
// unchecked. This module supplies the controlled dataset half of that fix.
//
// It authors no legal rule, no waiting period and no eligibility test. It records
// which judicial districts exist in Connecticut and which courts and agencies handle
// record-clearing matters, so a selector can offer a closed list instead of a text
// box. Manual entry stays available and is labelled, because a participant whose
// court is not on the list must still be able to say so.
//
// Binding this dataset to a rendered selector is a shared-renderer change and is
// not made here.

export type ConnecticutFilingLocationQualifier = "judicial_district" | "statewide";

export interface ConnecticutRecordClearingCourt {
  /** Stable identifier for this venue; never shown to a participant. */
  readonly id: string;
  /** The name a participant sees in the selector. */
  readonly label: string;
  /** Which local unit qualifies the venue, or "statewide" when none does. */
  readonly qualifiedBy: ConnecticutFilingLocationQualifier;
}

/** Every judicial district in Connecticut, in alphabetical order. */
export const connecticutFilingLocalUnits = [
  "Ansonia-Milford",
  "Danbury",
  "Fairfield",
  "Hartford",
  "Litchfield",
  "Middlesex",
  "New Britain",
  "New Haven",
  "New London",
  "Stamford-Norwalk",
  "Tolland",
  "Waterbury",
  "Windham",
] as const;

/** Courts and agencies that handle Connecticut record-clearing matters. */
export const connecticutRecordClearingCourts: readonly ConnecticutRecordClearingCourt[] = [
  { id: "superior-court-criminal", label: "Superior Court — Criminal", qualifiedBy: "judicial_district" },
  { id: "superior-court-geographical-area", label: "Superior Court — Geographical Area (G.A.) court", qualifiedBy: "judicial_district" },
  { id: "superior-court-juvenile-matters", label: "Superior Court — Juvenile Matters", qualifiedBy: "judicial_district" },
  { id: "board-of-pardons-and-paroles", label: "Board of Pardons and Paroles", qualifiedBy: "statewide" },
];

/**
 * The controlled dataset a state-aware county/court selector reads, with the
 * manual-entry fallback it must offer alongside it.
 */
export const connecticutRecordClearingFilingLocations = {
  jurisdiction: { code: "CT", name: "Connecticut", slug: "connecticut" },
  localUnitLabel: "Judicial District",
  localUnitPlural: "judicial districts",
  localUnitCount: 13,
  localUnits: connecticutFilingLocalUnits,
  courts: connecticutRecordClearingCourts,
  note: "Connecticut abolished county government in 1960. Criminal cases, including erasure petitions on form JD-CR-202, are heard in the Superior Court for the judicial district (or the Geographical Area court) that handled the case, so the judicial district — not the county — is the controlled filing location.",
  manualEntry: {
    allowed: true,
    optionLabel: "My judicial district or court is not listed",
    helperText:
      "Type the judicial district and court exactly as they appear on your paperwork. We will " +
      "use what you type and flag it for review before anything is filed.",
  },
  review: {
    /** Build status only. QA, counsel and source-freshness review are tracked separately. */
    buildStatus: "state_built" as const,
    /** The selector itself is a shared-renderer change and is not made in this shard. */
    rendererBindingOwner: "phase_2_shared_renderer" as const,
    verifiedAgainst: "Compiled profile pathway and source references for CT at PHASE2_PRODUCT_HEAD.",
  },
} as const;
