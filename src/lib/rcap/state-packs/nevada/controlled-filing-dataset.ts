// Nevada controlled county/court dataset — Expungement.ai Phase 3, SHARD-2.
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
// directory: the repository holds no courthouse list for Nevada, and inventing
// one would be the same class of fabrication this phase forbids for waiting
// periods. Every option carries the quote it came from.

export const nvControlledFilingDataset = {
  schema: "rcap-controlled-filing-dataset/v1",
  jurisdiction: "NV",
  jurisdictionName: "Nevada",
  issueIds: ["UX-COURT-001", "UX-COUNTY-001"],
  status: "READY_TO_APPLY_BLOCKED_ON_SHARED_LAYER",
  consumedBy: "none_yet — the served profile and renderer do not read this",
  reviewStatus: "requires_dataset_owner_confirmation",

  courtDestinations: [
    {
      value: "The Nevada court in the jurisdiction where the arrest occurred",
      quotedFrom: "packetGenerator.filingDestinationRules",
      quote: "Nevada State Police says a person should contact the court in the jurisdiction where the arrest occurred and obtain a Nevada criminal-history record to complete court forms."
    },
    {
      value: "Nevada district court (single petition for records across several courts, NRS 179.2595)",
      quotedFrom: "packetGenerator.filingDestinationRules",
      quote: "If a person wants to seal more than one record and would otherwise need to file in more than one court, they may file in district court for sealing of all such records. A district court may also order sealing of records in justice or municipal courts under the Nevada record-sealing statutes."
    },
    {
      value: "Justice or municipal court (records sealed by district-court order under NRS 179.2595)",
      quotedFrom: "packetGenerator.filingDestinationRules",
      quote: "A district court may also order sealing of records in justice or municipal courts under the Nevada record-sealing statutes."
    },
  ],

  courtManualEntry: {
    label: "My court or agency is not on this list",
    helperText: "LegalEase will confirm the exact court with you before your packet is filed, so nothing is guessed.",
    rendersAs: "not_yet_renderable — QuestionField has no arm combining a controlled list with free text; see SHARD2-BLOCKER-3"
  },

  filingLocations: [
    {
      value: "The county where the arrest occurred",
      quotedFrom: "packetGenerator.filingDestinationRules",
      quote: "Nevada State Police says a person should contact the court in the jurisdiction where the arrest occurred"
    },
  ],

  filingLocationManualEntry: {
    label: "My filing location is not on this list",
    helperText: "LegalEase will confirm the filing county with you before your packet is filed.",
    rendersAs: "not_yet_renderable — see SHARD2-BLOCKER-3"
  }
} as const;
