// Rhode Island controlled county/court dataset — Expungement.ai Phase 3, SHARD-2.
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
// directory: the repository holds no courthouse list for Rhode Island, and inventing
// one would be the same class of fabrication this phase forbids for waiting
// periods. Every option carries the quote it came from.

export const riControlledFilingDataset = {
  schema: "rcap-controlled-filing-dataset/v1",
  jurisdiction: "RI",
  jurisdictionName: "Rhode Island",
  issueIds: ["UX-COURT-001", "UX-COUNTY-001"],
  status: "READY_TO_APPLY_BLOCKED_ON_SHARED_LAYER",
  consumedBy: "none_yet — the served profile and renderer do not read this",
  reviewStatus: "requires_dataset_owner_confirmation",

  courtDestinations: [
    {
      value: "The Rhode Island court where the conviction occurred",
      quotedFrom: "packetGenerator.filingDestinationRules",
      quote: "A conviction expungement motion is filed in the court where the conviction took place. The Rhode Island Judiciary says the motion should be filed in the court where the conviction occurred, and the clerk's office will fill in the hearing date."
    },
    {
      value: "Rhode Island Department of Attorney General (BCI unit)",
      quotedFrom: "packetGenerator.filingDestinationRules",
      quote: "One copy is for the petitioner, one is for the Attorney General's BCI unit, and one is for the police department that charged the case."
    },
  ],

  courtManualEntry: {
    label: "My court or agency is not on this list",
    helperText: "LegalEase will confirm the exact court with you before your packet is filed, so nothing is guessed.",
    rendersAs: "not_yet_renderable — QuestionField has no arm combining a controlled list with free text; see SHARD2-BLOCKER-3"
  },

  filingLocations: [
    {
      value: "Rhode Island is a single statewide judicial system; venue is the court of conviction, not a county",
      quotedFrom: "packetGenerator.filingDestinationRules",
      quote: "A conviction expungement motion is filed in the court where the conviction took place."
    },
  ],

  filingLocationManualEntry: {
    label: "My filing location is not on this list",
    helperText: "LegalEase will confirm the filing county with you before your packet is filed.",
    rendersAs: "not_yet_renderable — see SHARD2-BLOCKER-3"
  }
} as const;
