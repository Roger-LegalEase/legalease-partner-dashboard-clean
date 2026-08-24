// Controlled filing-location dataset for Delaware (DE).
//
// Phase 3 SHARD-6 addresses UX-COUNTY-001 and UX-COURT-001 for this state: county
// and court were collected as free text with no state-aware selector and no
// controlled dataset behind them, so a misspelling could reach a court filing
// unchecked. This module supplies the controlled dataset half of that fix.
//
// It authors no legal rule, no waiting period and no eligibility test. It records
// which counties exist in Delaware and which courts and agencies handle
// record-clearing matters, so a selector can offer a closed list instead of a text
// box. Manual entry stays available and is labelled, because a participant whose
// court is not on the list must still be able to say so.
//
// Binding this dataset to a rendered selector is a shared-renderer change and is
// not made here.

export type DelawareFilingLocationQualifier = "county" | "statewide";

export interface DelawareRecordClearingCourt {
  /** Stable identifier for this venue; never shown to a participant. */
  readonly id: string;
  /** The name a participant sees in the selector. */
  readonly label: string;
  /** Which local unit qualifies the venue, or "statewide" when none does. */
  readonly qualifiedBy: DelawareFilingLocationQualifier;
}

/** Every county in Delaware, in alphabetical order. */
export const delawareFilingLocalUnits = [
  "Kent",
  "New Castle",
  "Sussex",
] as const;

/** Courts and agencies that handle Delaware record-clearing matters. */
export const delawareRecordClearingCourts: readonly DelawareRecordClearingCourt[] = [
  { id: "superior-court", label: "Superior Court", qualifiedBy: "county" },
  { id: "court-of-common-pleas", label: "Court of Common Pleas", qualifiedBy: "county" },
  { id: "family-court", label: "Family Court", qualifiedBy: "county" },
  { id: "justice-of-the-peace-court", label: "Justice of the Peace Court", qualifiedBy: "county" },
  { id: "state-bureau-of-identification", label: "State Bureau of Identification (SBI)", qualifiedBy: "statewide" },
];

/**
 * The controlled dataset a state-aware county/court selector reads, with the
 * manual-entry fallback it must offer alongside it.
 */
export const delawareRecordClearingFilingLocations = {
  jurisdiction: { code: "DE", name: "Delaware", slug: "delaware" },
  localUnitLabel: "County",
  localUnitPlural: "counties",
  localUnitCount: 3,
  localUnits: delawareFilingLocalUnits,
  courts: delawareRecordClearingCourts,
  note: "Delaware has three counties. Adult expungement petitions under 11 Del. C. §§ 4374 and 4375 are filed in the court that heard the case; juvenile petitions under 10 Del. C. §§ 1017-1019 / 1017A are filed in Family Court. Mandatory and automatic expungement under §§ 4373 / 4373A is processed by the State Bureau of Identification rather than by a court filing.",
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
    verifiedAgainst: "Compiled profile pathway and source references for DE at PHASE2_PRODUCT_HEAD.",
  },
} as const;
