// Controlled filing-location dataset for Louisiana (LA).
//
// Phase 3 SHARD-6 addresses UX-COUNTY-001 and UX-COURT-001 for this state: county
// and court were collected as free text with no state-aware selector and no
// controlled dataset behind them, so a misspelling could reach a court filing
// unchecked. This module supplies the controlled dataset half of that fix.
//
// It authors no legal rule, no waiting period and no eligibility test. It records
// which parishes exist in Louisiana and which courts and agencies handle
// record-clearing matters, so a selector can offer a closed list instead of a text
// box. Manual entry stays available and is labelled, because a participant whose
// court is not on the list must still be able to say so.
//
// Binding this dataset to a rendered selector is a shared-renderer change and is
// not made here.

export type LouisianaFilingLocationQualifier = "parish" | "statewide";

export interface LouisianaRecordClearingCourt {
  /** Stable identifier for this venue; never shown to a participant. */
  readonly id: string;
  /** The name a participant sees in the selector. */
  readonly label: string;
  /** Which local unit qualifies the venue, or "statewide" when none does. */
  readonly qualifiedBy: LouisianaFilingLocationQualifier;
}

/** Every parish in Louisiana, in alphabetical order. */
export const louisianaFilingLocalUnits = [
  "Acadia",
  "Allen",
  "Ascension",
  "Assumption",
  "Avoyelles",
  "Beauregard",
  "Bienville",
  "Bossier",
  "Caddo",
  "Calcasieu",
  "Caldwell",
  "Cameron",
  "Catahoula",
  "Claiborne",
  "Concordia",
  "De Soto",
  "East Baton Rouge",
  "East Carroll",
  "East Feliciana",
  "Evangeline",
  "Franklin",
  "Grant",
  "Iberia",
  "Iberville",
  "Jackson",
  "Jefferson",
  "Jefferson Davis",
  "La Salle",
  "Lafayette",
  "Lafourche",
  "Lincoln",
  "Livingston",
  "Madison",
  "Morehouse",
  "Natchitoches",
  "Orleans",
  "Ouachita",
  "Plaquemines",
  "Pointe Coupee",
  "Rapides",
  "Red River",
  "Richland",
  "Sabine",
  "St. Bernard",
  "St. Charles",
  "St. Helena",
  "St. James",
  "St. John the Baptist",
  "St. Landry",
  "St. Martin",
  "St. Mary",
  "St. Tammany",
  "Tangipahoa",
  "Tensas",
  "Terrebonne",
  "Union",
  "Vermilion",
  "Vernon",
  "Washington",
  "Webster",
  "West Baton Rouge",
  "West Carroll",
  "West Feliciana",
  "Winn",
] as const;

/** Courts and agencies that handle Louisiana record-clearing matters. */
export const louisianaRecordClearingCourts: readonly LouisianaRecordClearingCourt[] = [
  { id: "judicial-district-court", label: "Judicial District Court", qualifiedBy: "parish" },
  { id: "orleans-parish-criminal-district-court", label: "Orleans Parish Criminal District Court", qualifiedBy: "parish" },
  { id: "municipal-and-traffic-court-new-orleans", label: "Municipal and Traffic Court of New Orleans", qualifiedBy: "parish" },
  { id: "city-court", label: "City Court", qualifiedBy: "parish" },
  { id: "juvenile-court", label: "Juvenile Court", qualifiedBy: "parish" },
  { id: "louisiana-state-police-bci", label: "Louisiana State Police — Bureau of Criminal Identification and Information", qualifiedBy: "statewide" },
];

/**
 * The controlled dataset a state-aware county/court selector reads, with the
 * manual-entry fallback it must offer alongside it.
 */
export const louisianaRecordClearingFilingLocations = {
  jurisdiction: { code: "LA", name: "Louisiana", slug: "louisiana" },
  localUnitLabel: "Parish",
  localUnitPlural: "parishes",
  localUnitCount: 64,
  localUnits: louisianaFilingLocalUnits,
  courts: louisianaRecordClearingCourts,
  note: "Louisiana is divided into 64 parishes rather than counties. Expungement motions under Code of Criminal Procedure Articles 971-995 are filed in the district court of the parish of arrest or conviction; Orleans Parish routes criminal matters through the Orleans Parish Criminal District Court and, for municipal charges, the Municipal and Traffic Court of New Orleans.",
  manualEntry: {
    allowed: true,
    optionLabel: "My parish or court is not listed",
    helperText:
      "Type the parish and court exactly as they appear on your paperwork. We will " +
      "use what you type and flag it for review before anything is filed.",
  },
  review: {
    /** Build status only. QA, counsel and source-freshness review are tracked separately. */
    buildStatus: "state_built" as const,
    /** The selector itself is a shared-renderer change and is not made in this shard. */
    rendererBindingOwner: "phase_2_shared_renderer" as const,
    verifiedAgainst: "Compiled profile pathway and source references for LA at PHASE2_PRODUCT_HEAD.",
  },
} as const;
