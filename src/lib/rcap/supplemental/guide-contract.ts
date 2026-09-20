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
 * So the substance lives here instead — route by route, from that route's own
 * authoritative material — in four sections the whole product shares:
 *
 *   Overview          what this route is and what the relief does.
 *   Next Steps        where it is filed, on whom it is served, what happens next.
 *   Filing Checklist  what the participant must have or do before filing.
 *   Fees & Costs      what it costs and what is not established about cost.
 *
 * Stop conditions are NOT a fifth section, and not guide content at all. A
 * specification already carries `hearingAndObjectionStops`, and the renderer
 * DERIVES the stops it shows from that source. Copying them into a guide file
 * would create a second list that can disagree with the first, which is the
 * failure this whole lane exists to avoid.
 *
 * WHAT IT REFUSES, AND WHAT IT DOES NOT
 *
 * The invariant is NO UNSOURCED LEGAL OR PROCEDURAL INSTRUCTION. It is not "no
 * authored sentence", and the difference decides whether this system works
 * nationwide at all. Most routes have no legacy approved guidance page to copy,
 * so requiring every sentence to have appeared in an old PDF would leave them
 * with no guide. A newly written "File the petition with the clerk of the court
 * that handled your case" is fine where the route's own source says that; what
 * is forbidden is asserting it where nothing does.
 *
 * So each entry names what supports it, from a fixed set: adopted artifact
 * text, an authoritative statute, rule, official form or published instruction,
 * an existing source-backed route or owner decision, deterministic route data
 * already established elsewhere, or ordinary non-legal product copy. The last
 * carries no citation because it asserts nothing about the law — and for that
 * reason it may not carry an instruction.
 */

export type SupplementalGuideSection = "overview" | "nextSteps" | "filingChecklist" | "feesAndCosts";

export const SUPPLEMENTAL_GUIDE_SECTIONS: ReadonlyArray<{ id: SupplementalGuideSection; heading: string }> = [
  { id: "overview", heading: "Overview" },
  { id: "nextSteps", heading: "Next Steps" },
  { id: "filingChecklist", heading: "Filing Checklist" },
  { id: "feesAndCosts", heading: "Fees & Costs" }
];

/**
 * What supports a guide entry.
 *
 * `product_copy` is the one kind that needs no citation, because it states
 * nothing about the law — a heading, a greeting, a transition. It is therefore
 * also the one kind that may not carry a legal or procedural instruction, and
 * the control enforces that rather than trusting the label.
 */
export type GuideProvenanceKind =
  | "adopted_artifact"
  | "authoritative_source"
  | "route_decision"
  | "route_data"
  | "product_copy";

export const GUIDE_PROVENANCE_KINDS: ReadonlyArray<GuideProvenanceKind> = [
  "adopted_artifact",
  "authoritative_source",
  "route_decision",
  "route_data",
  "product_copy"
];

export type SupplementalGuideEntry = {
  /** The sentence or bullet the participant reads. */
  text: string;
  provenance: {
    kind: GuideProvenanceKind;
    /** Where it comes from. Required for everything except product copy. */
    cite?: string;
  };
};

export type SupplementalGuide = {
  schemaVersion: "rcap-supplemental-guide/v1";
  routeKey: string;
  jurisdiction: string;
  /**
   * The adopted artifact digest, where this route HAS one and the guide carried
   * substance from it. Absent for a route with no legacy approved guidance
   * page, which is most of them.
   */
  adoptedDigest?: string;
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
