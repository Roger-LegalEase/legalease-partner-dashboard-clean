// Florida (FL) — source-backed filing-target payload for UX-COUNTY-001 and
// UX-COURT-001. This is deliberately state-pack data only. The shared public
// profile projection and question renderer do not consume it yet.

export const floridaFilingTargetDataset = {
  jurisdiction: { code: "FL", name: "Florida" },
  issueIds: ["UX-COUNTY-001", "UX-COURT-001"] as const,
  sourceProfile: "src/lib/rcap-engine/compiled/profiles/FL-florida.json",
  sourceCorpusSha256: "ae42a03eae275b18bc5bb384e16d793ea9ac9b3290daa561579350c9cd9974d7",

  venueRule: {
    quote:
      "After FDLE issues the certificate, the user files the petition, sworn statement/affidavit, certificate, and proposed order in the court with jurisdiction over the arrest, usually the county where the arrest occurred.",
    sourceField: "packetGenerator.filingDestinationRules"
  },

  /**
   * The repository source identifies the county basis but does not publish a
   * controlled 67-county directory or bind a county to a current clerk/court.
   * Keeping values empty is intentional: inventing a directory would turn an
   * unverified list into filing advice.
   */
  countyDataset: {
    packetFactId: "county",
    status: "venue_rule_present_controlled_directory_absent",
    values: [] as const,
    basis: "county where the arrest occurred",
    manualEntryFallbackLabel: "My county is not listed — let me type it in"
  },

  /**
   * These are source-backed filing-target TYPES, not a complete court-name
   * directory. They preserve the two-stage Florida sequence without claiming
   * that a local court address or clerk has been verified.
   */
  courtDataset: {
    packetFactId: "court",
    status: "source_backed_target_types_only_local_directory_absent",
    values: [
      {
        value: "Florida Department of Law Enforcement (certificate stage)",
        sourceQuote: "For normal sealing/expunction, the user submits the FDLE Certificate of Eligibility application"
      },
      {
        value: "Circuit court in the circuit where the arrest occurred",
        sourceQuote: "the circuit/county court where the arrest occurred for the order"
      },
      {
        value: "County court in the circuit where the arrest occurred",
        sourceQuote: "the circuit/county court where the arrest occurred for the order"
      }
    ] as const,
    manualEntryFallbackLabel: "My court or agency is not listed — let me type it in"
  },

  readyToApplyProjectionPayload: {
    county: {
      type: "controlled_combobox_with_manual_entry",
      optionsFrom: "floridaFilingTargetDataset.countyDataset.values",
      manualEntryFallback: true
    },
    court: {
      type: "controlled_combobox_with_manual_entry",
      optionsFrom: "floridaFilingTargetDataset.courtDataset.values",
      manualEntryFallback: true
    }
  },

  blockedBySharedPhase2: {
    classification: "SHARED_PHASE2_BLOCKER",
    projection: "src/lib/rcap-engine/public-profile-projection.ts",
    renderer: "src/components/expungement-ai/screening/QuestionField.tsx",
    parityVerifier: "scripts/verify-expungement-plain-language-values.mjs",
    parityApprovalRecord: "data/expungement-ai/screening-parity-approved-deltas.json",
    reason:
      "The current renderer has no controlled combobox plus manual-entry branch, and changing county/court type or options requires a reviewed parity projection. All of those paths are prohibited to this shard."
  }
} as const;
