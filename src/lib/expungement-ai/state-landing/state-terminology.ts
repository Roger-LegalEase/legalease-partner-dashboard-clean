/**
 * Curated, plain-English display terminology for the Expungement.ai state landing pages.
 *
 * WHY THIS EXISTS: the compiled engine profiles store `terminology.primaryConsumerTerm` as
 * "expungement" for every jurisdiction, with the real per-state vocabulary spread across
 * `allowedStateTerms[]` and `pathways[].label`. That is correct for the engine but wrong for a
 * consumer headline — several states do not call the process "expungement" at all. This map is a
 * small PRESENTATION layer (not an eligibility rule) that gives the states with distinctive
 * vocabulary an accurate headline term, grounded in their actual pathway labels.
 *
 * States NOT listed here fall back to a term derived from their `allowedStateTerms` in
 * state-landing-data.ts. Nothing here changes screening, rules, routing, or payment.
 */

export type StateTermOverride = {
  /** Headline term for the hero, e.g. "Record Sealing". */
  termLabel: string;
  /** One plain-English sentence naming the state's specific vocabulary. Copy-safe. */
  termBlurb: string;
};

// Keyed by uppercase jurisdiction code.
export const STATE_TERM_OVERRIDES: Record<string, StateTermOverride> = {
  AK: {
    termLabel: "CourtView Removal & Record Sealing",
    termBlurb:
      "Alaska does not have a single expungement statute — records are cleared through set-asides, sealing, and CourtView Removal."
  },
  NV: {
    termLabel: "Record Sealing",
    termBlurb: "Nevada clears records through Record Sealing under NRS Chapter 179, rather than using the word expungement."
  },
  MA: {
    termLabel: "CORI Sealing & Record Expungement",
    termBlurb:
      "Massachusetts uses CORI Sealing under M.G.L. c. 276 and time-based record expungement, depending on the case."
  },
  PA: {
    termLabel: "Expungement, Sealing & Limited Access",
    termBlurb:
      "In Pennsylvania this can mean Court Case Expungement, Summary Expungement, sealing through Limited Access, or Clean Slate."
  },
  HI: {
    termLabel: "Record Expungement (Administrative Application)",
    termBlurb:
      "Hawaii clears records through a state Administrative Application process rather than a court petition in most cases."
  },
  DE: {
    termLabel: "Mandatory & Discretionary Expungement",
    termBlurb: "Delaware offers mandatory (automatic) expungement and discretionary court expungement, plus Clean Slate."
  },
  TX: {
    termLabel: "Expunction & Nondisclosure",
    termBlurb: "Texas uses Expunction to erase records and Orders of Nondisclosure to seal them from public view."
  },
  CA: {
    termLabel: "Dismissal, Set-Aside & Record Sealing",
    termBlurb: "California uses dismissal / set-aside relief and record sealing rather than the word expungement."
  },
  NY: {
    termLabel: "Record Sealing & Clean Slate",
    termBlurb: "New York clears records through court-ordered Record Sealing and automatic Clean Slate sealing."
  },
  IL: {
    termLabel: "Expungement & Sealing",
    termBlurb: "Illinois separates full expungement from record sealing, and adds automatic Clean Slate relief."
  }
};

export function getStateTermOverride(code: string): StateTermOverride | undefined {
  return STATE_TERM_OVERRIDES[code.toUpperCase()];
}
