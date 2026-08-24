// New York (NY) — county and court binding for the Expungement.ai packet.
//
// Phase 3 SHARD-1 state binding for UX-COURT-001.
//
// The Phase 1 audit filed these as
// `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`: the shared controlled
// dataset and the selector branch in the shared question renderer come first,
// and the per-state binding — which court designations are correct for this
// jurisdiction, and what the source says the venue is — comes second. Phase 2
// did not build the shared half, so this module is the state half, standing
// ready and consuming nothing yet.
//
// Every value below is transcribed from New York's own compiled profile
// (src/lib/rcap-engine/compiled/profiles/NY-new-york.json). Nothing here is
// authored from outside the repository.

export const newYorkCourtDesignations = [
  { value: "Court of conviction (the court that decided this case)", sourceQuote: "File the application in the court of conviction — for multiple eligible offenses, the court where the most serious offense was decided (or, if equal class, where last convicted)." }
] as const;

export type NewYorkCourtDesignation = "Court of conviction (the court that decided this case)";

export const newYorkCountyCourtBinding = {
  jurisdiction: { code: "NY", name: "New York" },
  issueIds: ["UX-COURT-001"] as const,
  sourceProfile: "src/lib/rcap-engine/compiled/profiles/NY-new-york.json",

  /** Quoted verbatim from that profile's `packetGenerator.filingDestinationRules`. */
  venueRule: {
    quote: "File the application in the court of conviction — for multiple eligible offenses, the court where the most serious offense was decided (or, if equal class, where last convicted).",
    sourceField: "packetGenerator.filingDestinationRules"
  },

  /**
   * UX-COURT-001. The controlled court dataset for this state, at the level the
   * source text actually settles: the court designation the packet's `court`
   * field must resolve to. Each entry carries the sentence it came from.
   */
  courtDataset: {
    packetFactId: "court",
    status: "derived_from_compiled_profile_source_text",
    values: newYorkCourtDesignations,
    manualEntryFallbackLabel: "My court is not listed — let me type it in"
  },

  /**
   * New York does not carry `county` as a packet required input, so
   * UX-COUNTY-001 does not bind here. `county_or_filing_location` is asked in
   * the compiled profile but has no eligibility, form, packet-selection or
   * escalation consumer — that is UX-CONTENT-001, recorded and not acted on
   * this phase.
   */
  countyDataset: null,

  /**
   * Why the compiled-profile question is still `text`.
   *
   * Rebinding `court` to a selector means changing that question's
   * `type` and `options` in the compiled profile.
   * `scripts/verify-expungement-plain-language-values.mjs` asserts, against
   * `origin/main`, that no compiled-profile question changes its `type`,
   * `options`, `required` or `contextOnly`. The only sanctioned exemption is a
   * reviewed entry in `data/expungement-ai/screening-parity-approved-deltas.json`,
   * which is a prohibited path for a Phase 3 shard and requires the owner's
   * authorisation. The rebind is therefore proposed in
   * `data/expungement-ai/flow-audit/shard-results/SHARD-1.json`, not performed
   * here.
   */
  rebindBlockedBy: {
    verifier: "scripts/verify-expungement-plain-language-values.mjs",
    assertion: "compiled-profile questions may not change type, options, required or contextOnly",
    approvalRecord: "data/expungement-ai/screening-parity-approved-deltas.json",
    approvalRecordIsProhibitedForThisShard: true
  }
} as const;

/**
 * The instruction lines the packet and the guidance surface should carry for a
 * New York filing. Prose only, transcribed from the profile: this states the
 * venue, it does not decide eligibility.
 */
export function getNewYorkCountyCourtInstructions(input?: {
  county?: string;
  courtDesignation?: NewYorkCourtDesignation;
}): string[] {
  const county = input?.county?.trim();
  const designation = input?.courtDesignation;
  return [
    county
      ? `Start from ${county} when identifying the court of origin for this case.`
      : "Confirm the county the case was decided in before filing.",
    designation
      ? `Confirm the case belongs in the ${designation}.`
      : "Confirm which court designation this case belongs to before filing.",
    "File the application in the court of conviction — for multiple eligible offenses, the court where the most serious offense was decided (or, if equal class, where last convicted).",
    "Ask the clerk what copies, certified dispositions, or local cover pages are required.",
    "Do not rely on this module for clerk addresses or local fees; those are not in the source."
  ];
}
