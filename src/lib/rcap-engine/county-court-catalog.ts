import catalog from "@/lib/rcap-engine/county-court-catalog.json";

/**
 * The controlled county and court data the screening flow serves.
 *
 * The Phase 1 audit recorded county and court as free text "with no controlled
 * dataset behind it", so a misspelling could reach a court filing unchecked. The
 * six Phase 3 shards each authored their state's half, in four different module
 * shapes, and none of it was ever read: the shared half — a projection that
 * publishes it and a renderer that can offer a controlled list alongside a
 * separate manual value — is what was missing. This is that shared half.
 *
 * It publishes an ADDITIVE field on the existing question. No question id, type,
 * stage, options array, required flag or contextOnly flag changes, so the
 * screening-parity gate is untouched and no approved delta is consumed. A
 * jurisdiction with no catalog renders exactly as it did before.
 */

export type ControlledCountyOption = {
  id: string;
  label: string;
  sourceQuote?: string;
  sourceRef?: string;
};

export type ControlledCourtOption = {
  id: string;
  label: string;
  /** Shown next to the name so two similarly named courts can be told apart. */
  courtType?: string;
  location?: string;
  /** County ids this court serves; null means it is offered for every county. */
  counties: string[] | null;
  sourceQuote?: string;
  sourceRef?: string;
};

export type ControlledLocationDataset = {
  kind: "county" | "court";
  jurisdiction: string;
  counties: ControlledCountyOption[];
  courts: ControlledCourtOption[];
  /** Every option carries provenance; a value typed by hand never does. */
  manualEntry: {
    label: string;
    helperText: string;
    /** Never true. A hand-typed location is a hint for confirmation, not a fact. */
    treatedAsVerified: false;
  };
  notSure: { label: string; helperText: string };
};

type CatalogEntry = {
  jurisdiction: string;
  counties: ControlledCountyOption[];
  courts: ControlledCourtOption[];
  countyQuestionIds: string[];
  courtQuestionIds: string[];
};

const CATALOG: Record<string, CatalogEntry> =
  (catalog as { jurisdictions?: Record<string, CatalogEntry> }).jurisdictions ?? {};

export const JURISDICTIONS_PUBLISHING_NO_COUNTY_OR_COURT_QUESTION: readonly string[] =
  (catalog as { jurisdictionsPublishingNoCountyOrCourtQuestion?: string[] }).jurisdictionsPublishingNoCountyOrCourtQuestion ?? [];

const MANUAL_ENTRY = {
  county: {
    label: "My county is not on this list",
    helperText: "Type it and we will confirm the filing county with you before your packet is filed. Nothing you type here is treated as confirmed.",
    treatedAsVerified: false as const
  },
  court: {
    label: "My court or agency is not on this list",
    helperText: "Type it and we will confirm the exact court with you before your packet is filed. Nothing you type here is treated as confirmed.",
    treatedAsVerified: false as const
  }
};

const NOT_SURE = {
  county: { label: "I'm not sure", helperText: "That is fine. We will work the filing county out with you before anything is filed." },
  court: { label: "I'm not sure", helperText: "That is fine. We will work out which court hears this before anything is filed." }
};

/**
 * The dataset for one question, or undefined when this jurisdiction has none —
 * in which case the caller leaves the question exactly as it was.
 */
export function controlledLocationDatasetFor(jurisdiction: string, questionId: string): ControlledLocationDataset | undefined {
  const entry = CATALOG[jurisdiction];
  if (!entry) return undefined;
  const isCounty = entry.countyQuestionIds.includes(questionId);
  const isCourt = entry.courtQuestionIds.includes(questionId);
  if (!isCounty && !isCourt) return undefined;
  if (isCounty && entry.counties.length === 0) return undefined;
  if (isCourt && entry.courts.length === 0) return undefined;
  const kind = isCounty ? "county" : "court";
  return {
    kind,
    jurisdiction,
    counties: entry.counties,
    // A court list is only useful next to the counties it can be filtered by.
    courts: kind === "court" ? entry.courts : [],
    manualEntry: MANUAL_ENTRY[kind],
    notSure: NOT_SURE[kind]
  };
}

/** The courts offered once a county is chosen. Statewide courts always survive. */
export function courtsForCounty(dataset: ControlledLocationDataset, countyId: string | undefined): ControlledCourtOption[] {
  if (!countyId) return dataset.courts;
  const filtered = dataset.courts.filter((court) => court.counties === null || court.counties.includes(countyId));
  // A county with no court mapped to it still needs the statewide options rather
  // than an empty list, which would read as "no court hears this".
  return filtered.length > 0 ? filtered : dataset.courts.filter((court) => court.counties === null);
}
