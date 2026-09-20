/**
 * The §7 supplemental participant guide: one shared, source-driven contract.
 *
 * WHY THIS EXISTS
 *
 * Every adopted packet family carries its own filing-instructions page, written
 * in its own voice and living inside the packet PDF. That is how the families
 * were built, and each page's substance is approved. But perpetuating them is
 * how a product ends up with fifty-one legacy guidance documents beside the one
 * guide it actually means to ship, and a participant reading two sets of
 * instructions that drifted apart.
 *
 * So the substance is carried here — route by route, from the adopted material
 * and nothing else — into four sections the whole product shares:
 *
 *   Overview          what this route is and what the relief does.
 *   Next Steps        where it is filed, on whom it is served, what happens next.
 *   Filing Checklist  what the participant must have or do before filing.
 *   Fees & Costs      what it costs and what is not established about cost.
 *
 * Stop conditions are NOT a fifth section. A specification already carries
 * `hearingAndObjectionStops`, and a route's reasons to stop and get a lawyer
 * belong there rather than in a second list that can disagree with the first.
 *
 * WHAT THIS IS NOT
 *
 * It is not a place to write guidance. Every string in a route's guide file is
 * carried from that route's adopted artifact, and the control refuses a guide
 * whose text is not traceable to one. A guide that could be authored here would
 * be participant-facing legal instruction no legal review ever saw, which is the
 * same failure the composer's first rule exists to prevent.
 */

export type SupplementalGuideSection = "overview" | "nextSteps" | "filingChecklist" | "feesAndCosts";

export const SUPPLEMENTAL_GUIDE_SECTIONS: ReadonlyArray<{ id: SupplementalGuideSection; heading: string }> = [
  { id: "overview", heading: "Overview" },
  { id: "nextSteps", heading: "Next Steps" },
  { id: "filingChecklist", heading: "Filing Checklist" },
  { id: "feesAndCosts", heading: "Fees & Costs" }
];

export type SupplementalGuideEntry = {
  /** The adopted sentence or bullet, carried unchanged. */
  text: string;
  /** Where in the adopted artifact it came from, so the carry is checkable. */
  adoptedSource: string;
};

export type SupplementalGuide = {
  schemaVersion: "rcap-supplemental-guide/v1";
  routeKey: string;
  jurisdiction: string;
  /** The adopted artifact digest the substance was carried from. */
  adoptedDigest: string;
  /** The component in the adopted packet this guide replaces, once it ships. */
  supersedesPacketComponent: string | null;
  overview: SupplementalGuideEntry[];
  nextSteps: SupplementalGuideEntry[];
  filingChecklist: SupplementalGuideEntry[];
  feesAndCosts: SupplementalGuideEntry[];
  /**
   * Adopted guidance that is deliberately NOT carried into a guide section,
   * with the reason. Recorded rather than dropped: a line that vanishes in a
   * migration is indistinguishable from a line nobody noticed.
   */
  carriedElsewhere: Array<{ text: string; destination: string; why: string }>;
};

export function guideSectionEntries(guide: SupplementalGuide, section: SupplementalGuideSection): SupplementalGuideEntry[] {
  return guide[section];
}

/** Every entry across the four sections, for counting and for provenance checks. */
export function allGuideEntries(guide: SupplementalGuide): SupplementalGuideEntry[] {
  return SUPPLEMENTAL_GUIDE_SECTIONS.flatMap((section) => guide[section.id]);
}
