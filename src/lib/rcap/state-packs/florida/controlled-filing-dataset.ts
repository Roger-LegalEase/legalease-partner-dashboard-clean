// Florida controlled county/court dataset — Expungement.ai Phase 3, SHARD-2.
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
// directory: the repository holds no courthouse list for Florida, and inventing
// one would be the same class of fabrication this phase forbids for waiting
// periods. Every option carries the quote it came from.

export const flControlledFilingDataset = {
  schema: "rcap-controlled-filing-dataset/v1",
  jurisdiction: "FL",
  jurisdictionName: "Florida",
  issueIds: ["UX-COURT-001", "UX-COUNTY-001"],
  status: "READY_TO_APPLY_BLOCKED_ON_SHARED_LAYER",
  consumedBy: "none_yet — the served profile and renderer do not read this",
  reviewStatus: "requires_dataset_owner_confirmation",

  courtDestinations: [
    {
      value: "Florida court with jurisdiction over the arrest (usually the county where the arrest occurred)",
      quotedFrom: "packetGenerator.filingDestinationRules",
      quote: "After FDLE issues the certificate, the user files the petition, sworn statement/affidavit, certificate, and proposed order in the court with jurisdiction over the arrest, usually the county where the arrest occurred."
    },
    {
      value: "Florida Department of Law Enforcement (FDLE)",
      quotedFrom: "packetGenerator.filingDestinationRules",
      quote: "For normal sealing/expunction, the user submits the FDLE Certificate of Eligibility application with certified disposition, fingerprints, notarized signature, and $75 fee."
    },
    {
      value: "A court in the circuit of arrest (human-trafficking victim expunction, § 943.0583)",
      quotedFrom: "packetGenerator.filingDestinationRules",
      quote: "human-trafficking victim expunction (§ 943.0583) is filed in a court in the circuit of arrest with no clerk fee"
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
      quote: "the user files the petition, sworn statement/affidavit, certificate, and proposed order in the court with jurisdiction over the arrest, usually the county where the arrest occurred"
    },
  ],

  filingLocationManualEntry: {
    label: "My filing location is not on this list",
    helperText: "LegalEase will confirm the filing county with you before your packet is filed.",
    rendersAs: "not_yet_renderable — see SHARD2-BLOCKER-3"
  }
} as const;
