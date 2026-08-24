// Arizona (AZ) — county and court binding for the Expungement.ai packet.
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
// Every value below is transcribed from Arizona's own compiled profile
// (src/lib/rcap-engine/compiled/profiles/AZ-arizona.json). Nothing here is
// authored from outside the repository.

export const arizonaCourtDesignations = [
  { value: "Superior Court", sourceQuote: "File in the court that handled the case (superior, justice, or municipal)." },
  { value: "Justice Court", sourceQuote: "File in the court that handled the case (superior, justice, or municipal)." },
  { value: "Municipal Court", sourceQuote: "File in the court that handled the case (superior, justice, or municipal)." }
] as const;

export type ArizonaCourtDesignation = "Superior Court" | "Justice Court" | "Municipal Court";

export const arizonaCountyCourtBinding = {
  jurisdiction: { code: "AZ", name: "Arizona" },
  issueIds: ["UX-COURT-001"] as const,
  sourceProfile: "src/lib/rcap-engine/compiled/profiles/AZ-arizona.json",

  /** Quoted verbatim from that profile's `packetGenerator.filingDestinationRules`. */
  venueRule: {
    quote: "File in the court that handled the case (superior, justice, or municipal).",
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
    values: arizonaCourtDesignations,
    manualEntryFallbackLabel: "My court is not listed — let me type it in"
  },

  /**
   * Arizona does not carry `county` as a packet required input, so
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
 * Arizona filing. Prose only, transcribed from the profile: this states the
 * venue, it does not decide eligibility.
 */
export function getArizonaCountyCourtInstructions(input?: {
  county?: string;
  courtDesignation?: ArizonaCourtDesignation;
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
    "File in the court that handled the case (superior, justice, or municipal).",
    "Ask the clerk what copies, certified dispositions, or local cover pages are required.",
    "Do not rely on this module for clerk addresses or local fees; those are not in the source."
  ];
}
