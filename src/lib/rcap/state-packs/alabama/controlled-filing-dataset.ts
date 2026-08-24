// Alabama controlled county/court dataset — Expungement.ai Phase 3, SHARD-2.
//
// Issues UX-COURT-001 and UX-COUNTY-001 expect "a state-aware selector sourced
// from a controlled dataset, with a clearly-labelled manual entry fallback".
// This module is the controlled dataset half. It is DATA ONLY and wires no
// renderer: the served question definitions come from the shared all-51 designer
// fixture, and retyping a compiled question is refused by the screening-parity
// gate. Both are prohibited shared paths for a state shard, so the selector
// itself is recorded as SHARED_PHASE2_BLOCKER in
// data/expungement-ai/flow-audit/shard-results/SHARD-2.json.
//
// Granularity is court LEVEL and record-holding AGENCY, not a courthouse
// directory: the repository holds no courthouse list for Alabama, and inventing
// one would be the same class of fabrication this phase forbids for waiting
// periods. Every option carries the quote it came from.

export const alControlledFilingDataset = {
  schema: "rcap-controlled-filing-dataset/v1",
  jurisdiction: "AL",
  jurisdictionName: "Alabama",
  issueIds: ["UX-COURT-001", "UX-COUNTY-001"],
  status: "READY_TO_APPLY_BLOCKED_ON_SHARED_LAYER",
  consumedBy: "none_yet — the served profile and renderer do not read this",
  reviewStatus: "requires_dataset_owner_confirmation",

  courtDestinations: [
    {
      value: "Circuit court (criminal division) of the county where the charges were filed",
      quotedFrom: "packetGenerator.filingDestinationRules",
      quote: "File in the criminal division of the circuit court of the county where the charges were filed, and pay the $500 administrative filing fee (§ 15-27-4) or file an indigency declaration for a waiver."
    },
    {
      value: "Alabama Law Enforcement Agency (ALEA)",
      quotedFrom: "packetGenerator.filingDestinationRules",
      quote: "Request the official ALEA criminal history record (and the court file) to confirm each charge, the disposition, the offense classification, and the conviction or completion dates."
    },
  ],

  courtManualEntry: {
    label: "My court or agency is not on this list",
    helperText: "LegalEase will confirm the exact court with you before your packet is filed, so nothing is guessed.",
    rendersAs: "not_yet_renderable — QuestionField has no arm combining a controlled list with free text; see SHARD2-BLOCKER-3"
  },

  filingLocations: [
    {
      value: "The county where the charges were FILED",
      quotedFrom: "packetGenerator.filingDestinationRules",
      quote: "Venue is the circuit court of the county where the charges were FILED."
    },
  ],

  filingLocationManualEntry: {
    label: "My filing location is not on this list",
    helperText: "LegalEase will confirm the filing county with you before your packet is filed.",
    rendersAs: "not_yet_renderable — see SHARD2-BLOCKER-3"
  }
} as const;
