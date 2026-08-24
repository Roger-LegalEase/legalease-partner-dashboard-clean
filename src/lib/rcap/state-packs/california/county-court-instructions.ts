// California (CA) — county and court binding for the Expungement.ai packet.
//
// Phase 3 SHARD-1 state binding for UX-COURT-001 and UX-COUNTY-001.
//
// The Phase 1 audit filed these as
// `PHASE_2_SHARED_DATASET_THEN_PHASE_3_STATE_BINDING`: the shared controlled
// dataset and the selector branch in the shared question renderer come first,
// and the per-state binding — which court designations are correct for this
// jurisdiction, and what the source says the venue is — comes second. Phase 2
// did not build the shared half, so this module is the state half, standing
// ready and consuming nothing yet.
//
// Every value below is transcribed from California's own compiled profile
// (src/lib/rcap-engine/compiled/profiles/CA-california.json). Nothing here is
// authored from outside the repository.

export const californiaCourtDesignations = [
  { value: "Superior Court", sourceQuote: "Venue is the county of conviction's Superior Court — not the county of residence." }
] as const;

export type CaliforniaCourtDesignation = "Superior Court";

export const californiaCountyCourtBinding = {
  jurisdiction: { code: "CA", name: "California" },
  issueIds: ["UX-COUNTY-001", "UX-COURT-001"] as const,
  sourceProfile: "src/lib/rcap-engine/compiled/profiles/CA-california.json",

  /** Quoted verbatim from that profile's `packetGenerator.filingDestinationRules`. */
  venueRule: {
    quote: "Venue is the county of conviction's Superior Court — not the county of residence. A person with cases in multiple counties files separately in each.",
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
    values: californiaCourtDesignations,
    manualEntryFallbackLabel: "My court is not listed — let me type it in"
  },

  /**
   * UX-COUNTY-001. `county` is a required packet input for California and is
   * still collected as free text. No controlled California county list exists in
   * this repository: the Phase 1 audit recorded the county/court data source as
   * `TEST_COUNTY_AND_COURT_DATA_SOURCE`, an owner-supplied input that was never
   * supplied. This shard does not invent one — a county list written from
   * recall is not a controlled dataset, and it would be bound into a court
   * filing. The slot is declared here so the shared selector has somewhere to
   * read from the moment the owner supplies the source.
   */
  countyDataset: {
    packetFactId: "county",
    status: "awaiting_owner_supplied_source",
    values: null,
    blockedBy:
      "TEST_COUNTY_AND_COURT_DATA_SOURCE was never supplied. See docs/expungement-ai/flow-audit/baseline-report.md.",
    manualEntryFallbackLabel: "My county is not listed — let me type it in"
  },

  /**
   * Why the compiled-profile question is still `text`.
   *
   * Rebinding `court` or `county` to a selector means changing that question's
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
 * California filing. Prose only, transcribed from the profile: this states the
 * venue, it does not decide eligibility.
 */
export function getCaliforniaCountyCourtInstructions(input?: {
  county?: string;
  courtDesignation?: CaliforniaCourtDesignation;
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
    "Venue is the county of conviction's Superior Court — not the county of residence. A person with cases in multiple counties files separately in each.",
    "Ask the clerk what copies, certified dispositions, or local cover pages are required.",
    "Do not rely on this module for clerk addresses or local fees; those are not in the source."
  ];
}
