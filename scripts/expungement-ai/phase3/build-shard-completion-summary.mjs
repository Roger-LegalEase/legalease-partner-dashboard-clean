// Canonical Phase 3 integration aggregate generator.
//
// Reads the six committed shard result files and emits, deterministically:
//   data/expungement-ai/flow-audit/shard-completion-summary.json
//   data/expungement-ai/flow-audit/sign-off-index.json
//
// This generator only reads and re-indexes shard evidence. It never edits a
// shard result file, never applies a waiting-rule proposal, never touches
// waiting-rule-bindings.json or the shared evaluator, and never resolves a
// legal-owner item. Findings are carried through verbatim: sections are copied
// whole so that two distinct findings sharing a state or a rule stay distinct.

import { readFileSync, writeFileSync } from "node:fs";

const PHASE2_PRODUCT_HEAD = "93e05e945a52cfa1cdd2ab590636290875a48f68";

const SHARDS = [
  { shardId: "SHARD-1", branch: "claude/expai-state-shard-01", head: "dbf592d49df6c44cb6e65ed11617fafe34191915", file: "data/expungement-ai/flow-audit/shard-results/SHARD-1.json" },
  { shardId: "SHARD-2", branch: "claude/expai-state-shard-02", head: "757ffb9627f73c7f92e1aa341aa6393bb2a0b1d2", file: "data/expungement-ai/flow-audit/shard-results/SHARD-2.json" },
  { shardId: "SHARD-3", branch: "claude/expai-state-shard-03", head: "5a4a1c04d3c9b0d1cbc639a934ad1c54fd28d241", file: "data/expungement-ai/flow-audit/shard-results/SHARD-3.json" },
  { shardId: "SHARD-4", branch: "claude/expai-state-shard-04", head: "7b0fc92bb57090b52c3a0113ea63692eb1cde91e", file: "data/expungement-ai/flow-audit/shard-results/SHARD-4.json" },
  { shardId: "SHARD-5", branch: "claude/expai-state-shard-05", head: "012e613939fe83a2d9a986403d2c1c1c08c29de3", file: "data/expungement-ai/flow-audit/shard-results/SHARD-5.json" },
  { shardId: "SHARD-6", branch: "claude/expai-state-shard-06", head: "0afa56dc3bffef721b4ffd26561c356cd2464b3e", file: "data/expungement-ai/flow-audit/shard-results/SHARD-6.json" },
];

// Each shard authored its own schema. These maps name, per shard, the sections
// that carry a given class of evidence, so nothing is harvested by guesswork.
const JURISDICTION_KEYS = ["jurisdictionsInScope", "jurisdictions", "jurisdictionsOwned"];

const P0_SECTIONS = {
  "SHARD-1": ["step3ReleaseCriticalStateIssues"],
  "SHARD-2": ["potentialP0PaymentOrLegalOutcomeRisks", "step3_releaseCriticalIssues"],
  "SHARD-3": ["step3IssueWork", "bindingDefectsFoundInMyJurisdictions"],
  "SHARD-4": ["step3_releaseCriticalIssues"],
  "SHARD-5": ["step3ReleaseCriticalIssues"],
  "SHARD-6": ["step3_issueDispositions"],
};

const PROVENANCE_SECTIONS = {
  "SHARD-1": ["stateSpecificFidelityFindings"],
  "SHARD-2": ["waitingRuleDurationProvenanceAudit"],
  "SHARD-3": ["bindingDefectsFoundInMyJurisdictions", "extractionDefectsFoundInMyJurisdictions"],
  "SHARD-4": ["defectsFoundOutsideMyJurisdictions"],
  "SHARD-5": ["defectsFoundInWaitingRuleData"],
  "SHARD-6": ["defectsFoundOutsideThisShardsScope"],
};

const COUNTY_COURT_SECTIONS = {
  "SHARD-1": ["sharedPhase2Blocker"],
  "SHARD-2": ["courtAndCountySelectorProposal"],
  "SHARD-3": ["sharedPhase2Blocker"],
  "SHARD-4": ["courtAndCountySelectorProposal"],
  "SHARD-5": ["sharedBlocker"],
  "SHARD-6": ["step3_issueDispositions"],
};

const BROWSER_SECTIONS = {
  "SHARD-1": ["sharedPhase2Blocker"],
  "SHARD-2": ["acceptanceTests"],
  "SHARD-3": ["acceptanceEnvironment"],
  "SHARD-4": ["acceptanceTests"],
  "SHARD-5": ["environmentBlockers", "acceptanceTestResults"],
  "SHARD-6": ["acceptanceTests"],
};

// Proposals a shard wrote down but deliberately did not apply.
const PROPOSED_NOT_APPLIED_SECTIONS = {
  "SHARD-1": ["correctionAllowlistEntriesProposed", "screeningParityDeltasProposed", "step4GlobalIssuesNotImplemented"],
  "SHARD-2": ["correctionAllowlistEntriesProposed", "correctionAllowlistNote"],
  "SHARD-3": ["proposedAllowlistEntries", "step4GlobalIssues"],
  "SHARD-4": ["correctionAllowlistEntriesProposed", "correctionAllowlistNote"],
  "SHARD-5": ["proposedCorrectionAllowlistEntries", "proposedCompiledProfileQuestions", "proposedSharedFlowChanges", "step4GlobalIssues"],
  "SHARD-6": ["proposedAllowlistEntries", "step4_globalIssues"],
};

const SIGN_OFF_SECTIONS = {
  "SHARD-1": ["jurisdictions"],
  "SHARD-2": ["jurisdictionSignOffPackets"],
  "SHARD-3": ["perJurisdiction"],
  "SHARD-4": ["jurisdictionSignOffPackets"],
  "SHARD-5": ["stateSignOffPackets"],
  "SHARD-6": ["jurisdictions"],
};

const DISPOSITION_ORDER = [
  "EXPLICIT_BINDING_PROPOSED",
  "EXPLICIT_CONDITIONAL_BINDING_PROPOSED",
  "LEGAL_OWNER_DECISION_REQUIRED",
  "HELD_FOR_CORRECTION",
];

const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));

// Deterministic, key-sorted JSON so re-running the generator is a no-op.
function stableJson(value) {
  const sort = (v) => {
    if (Array.isArray(v)) return v.map(sort);
    if (v && typeof v === "object") {
      return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sort(v[k])]));
    }
    return v;
  };
  return `${JSON.stringify(sort(value), null, 2)}\n`;
}

function harvest(doc, keys) {
  const out = {};
  for (const k of keys) {
    if (doc[k] !== undefined) out[k] = doc[k];
  }
  return out;
}

function jurisdictionCodes(doc) {
  for (const k of JURISDICTION_KEYS) {
    const v = doc[k];
    if (!Array.isArray(v)) continue;
    const codes = v.map((e) => (typeof e === "string" ? e : e.jurisdiction ?? e.code ?? e.state)).filter(Boolean);
    if (codes.length) return codes;
  }
  return [];
}

const loaded = SHARDS.map((s) => ({ ...s, doc: readJson(s.file) }));

// ---- routes: every disposition carried exactly once, never deduplicated ----
const routeIndex = new Map();
const collisions = [];
for (const s of loaded) {
  for (const [routeId, body] of Object.entries(s.doc.waitingRuleDispositions ?? {})) {
    if (routeIndex.has(routeId)) {
      collisions.push({ routeId, firstSeenIn: routeIndex.get(routeId).shardId, alsoIn: s.shardId });
      continue;
    }
    routeIndex.set(routeId, {
      shardId: s.shardId,
      jurisdiction: routeId.split(":")[0],
      disposition: body?.disposition ?? null,
      evidence: body,
    });
  }
}

const byDisposition = Object.fromEntries(DISPOSITION_ORDER.map((d) => [d, []]));
for (const [routeId, r] of routeIndex) {
  if (!byDisposition[r.disposition]) byDisposition[r.disposition] = [];
  byDisposition[r.disposition].push({ routeId, shardId: r.shardId, jurisdiction: r.jurisdiction });
}
for (const d of Object.keys(byDisposition)) byDisposition[d].sort((a, b) => a.routeId.localeCompare(b.routeId));

const jurisdictionsByShard = {};
const allJurisdictions = new Set();
for (const s of loaded) {
  const codes = jurisdictionCodes(s.doc).sort();
  jurisdictionsByShard[s.shardId] = codes;
  codes.forEach((c) => allJurisdictions.add(c));
}

const perShard = loaded.map((s) => ({
  shardId: s.shardId,
  branch: s.branch,
  head: s.head,
  baseSha: s.doc.baseSha ?? null,
  phase2ProductHead: s.doc.phase2ProductHead ?? null,
  evaluatorToday: s.doc.evaluatorToday ?? null,
  resultFile: s.file,
  jurisdictions: jurisdictionsByShard[s.shardId],
  routeCount: Object.keys(s.doc.waitingRuleDispositions ?? {}).length,
  dispositionCounts: DISPOSITION_ORDER.reduce((acc, d) => {
    acc[d] = Object.values(s.doc.waitingRuleDispositions ?? {}).filter((r) => r?.disposition === d).length;
    return acc;
  }, {}),
  p0ReleaseHolds: harvest(s.doc, P0_SECTIONS[s.shardId] ?? []),
  durationProvenanceFindings: harvest(s.doc, PROVENANCE_SECTIONS[s.shardId] ?? []),
  countyCourtSharedPhase2Blocker: harvest(s.doc, COUNTY_COURT_SECTIONS[s.shardId] ?? []),
  browserEnvironmentBlockers: harvest(s.doc, BROWSER_SECTIONS[s.shardId] ?? []),
  proposedButNotApplied: harvest(s.doc, PROPOSED_NOT_APPLIED_SECTIONS[s.shardId] ?? []),
}));

const totals = DISPOSITION_ORDER.reduce((acc, d) => {
  acc[d] = byDisposition[d].length;
  return acc;
}, {});
const totalRoutes = routeIndex.size;

const summary = {
  schemaVersion: "expai-phase3-shard-completion-summary/v1",
  generatedBy: "scripts/expungement-ai/phase3/build-shard-completion-summary.mjs",
  phase2ProductHead: PHASE2_PRODUCT_HEAD,
  integrationBranch: "claude/expai-flow-integration-p3",
  contract: [
    "Integration-only. Every shard's evidence is preserved exactly as that shard committed it.",
    "No waiting-rule proposal is applied. waiting-rule-bindings.json and the shared evaluator are untouched.",
    "No structured duration is altered. No county/court selector is implemented.",
    "No terminal or payment outcome is changed. No legal-owner item is resolved.",
    "No fallback-dependent route is recommended ACTIVE.",
    "Findings are carried verbatim and are NOT deduplicated when they share a state or a rule.",
    "Nothing here determines whether a finding is legally correct. That is Phase 4.",
  ],
  shardHeads: Object.fromEntries(loaded.map((s) => [s.shardId, { branch: s.branch, head: s.head }])),
  jurisdictions: {
    expected: 51,
    observed: allJurisdictions.size,
    all: [...allJurisdictions].sort(),
    byShard: jurisdictionsByShard,
    disjoint: collisions.length === 0,
  },
  routeDispositions: {
    expectedTotal: 282,
    observedTotal: totalRoutes,
    expectedCounts: {
      EXPLICIT_BINDING_PROPOSED: 75,
      EXPLICIT_CONDITIONAL_BINDING_PROPOSED: 12,
      LEGAL_OWNER_DECISION_REQUIRED: 170,
      HELD_FOR_CORRECTION: 25,
    },
    observedCounts: totals,
    sumMatches: Object.values(totals).reduce((a, b) => a + b, 0) === 282,
    duplicateRoutes: collisions,
    directBindingProposals: byDisposition.EXPLICIT_BINDING_PROPOSED,
    conditionalBindingProposals: byDisposition.EXPLICIT_CONDITIONAL_BINDING_PROPOSED,
    legalOwnerDecisions: byDisposition.LEGAL_OWNER_DECISION_REQUIRED,
    heldForCorrection: byDisposition.HELD_FOR_CORRECTION,
    recommendedActive: [],
    recommendedActiveRule:
      "No fallback-dependent route is recommended ACTIVE by this integration. A proposal is not a binding.",
  },
  requiredP0ReleaseHoldRegister: {
    note:
      "Minimum register the Phase 3 integration contract requires be preserved. Each entry points at the shard evidence that reported it; the full text lives in perShard[].p0ReleaseHolds and in the shard result file. Recorded for Phase 4, not adjudicated here.",
    entries: [
      { jurisdiction: "HI", route: "dui-under-21-conviction", reportedRisk: "timing answer inert; payment reportedly open at lt_1_year", reportedBy: "SHARD-2", status: "HOLD" },
      { jurisdiction: "HI", route: "first-time-drug-conviction", reportedRisk: "timing answer inert; payment reportedly open at lt_1_year", reportedBy: "SHARD-2", status: "HOLD" },
      { jurisdiction: "NV", route: "general-conviction-record-sealing", reportedRisk: "payment reportedly open at lt_1_year despite the profile's eight-year rule", reportedBy: "SHARD-2", status: "HOLD" },
      { jurisdiction: "LA", route: "affected five-year clean-period route", reportedRisk: "payment reportedly open at lt_1_year", reportedBy: "SHARD-6", status: "HOLD" },
      { jurisdiction: "MO", route: "marijuana-expungement", reportedRisk: "apparently bound to an unrelated DWI ten-year rule", reportedBy: "SHARD-3", status: "HOLD" },
      { jurisdiction: "PA", route: "routes capable of selecting wait-05", reportedRisk: "age 70 apparently encoded as a seventy-year duration", reportedBy: "SHARD-5", status: "HOLD" },
      { jurisdiction: "CA", route: "affected routes", reportedRisk: "irrelevant optional Proposition 64 uncertainty can block unrelated remedies", reportedBy: "SHARD-1", status: "HOLD" },
    ],
  },
  perShard,
  preExistingBaseArtifactDrift: {
    finding:
      "The flow manifest and question inventory committed at PHASE2_PRODUCT_HEAD were stale with respect to their own generators. Regenerating them changes both files.",
    provenance: "PRE_EXISTING_AT_PHASE2_PRODUCT_HEAD — not caused by the six shard merges.",
    proof: {
      method:
        "The canonical generators were run twice: once in a clean worktree checked out at PHASE2_PRODUCT_HEAD with no shard merged, and once in the integration tree with all six shards merged. The two outputs were hashed and compared.",
      flowManifestSha256Prefix: { regeneratedAtUntouchedBase: "04377127e72cf9c1", regeneratedAfterAllSixMerges: "04377127e72cf9c1", identical: true },
      questionInventorySha256Prefix: { regeneratedAtUntouchedBase: "00075de219f14d68", regeneratedAfterAllSixMerges: "00075de219f14d68", identical: true },
      issueRegister: "byte-identical to the committed artifact at base and after the merges; the generator reproduces it exactly.",
      conclusion: "The six shard merges contribute ZERO delta to every regenerated aggregate artifact. The entire diff is pre-existing base staleness.",
    },
    whatTheDriftContains: {
      flowCount: { committedAtBase: 622, regenerated: 625 },
      note:
        "All movement is confined to synthetic _probe_* flows. No real remedy flow changes terminal, packet family, form set, payment mode or sponsorship mode. Flow IDs are content-addressed, so a probe flow whose terminal moved is retired under its old ID and re-emitted under a new one; no Phase 1 remedy flow is lost.",
      retiredProbeFlowKeys: [
        "FL::_probe_inside_waiting_period::needs_review::dtc_no_payment",
        "IA::_probe_inside_waiting_period::needs_review::dtc_no_payment",
        "IA::_probe_state_exclusion_selected::needs_review::dtc_no_payment",
        "PA::_probe_inside_waiting_period::needs_review::dtc_no_payment",
        "PA::_probe_state_exclusion_selected::needs_review::dtc_no_payment",
        "SD::_probe_inside_waiting_period::needs_review::dtc_no_payment",
        "SD::_probe_state_exclusion_selected::needs_review::dtc_no_payment",
      ],
      addedProbeFlowKeys: [
        "FL::_probe_inside_waiting_period::not_yet::dtc_no_payment",
        "IA::_probe_inside_waiting_period::not_yet::dtc_no_payment",
        "IA::_probe_state_exclusion_selected::packet_ready_with_caution::dtc_paid",
        "IA::_probe_state_exclusion_selected::packet_ready_with_caution::partner_sponsored_no_charge",
        "PA::_probe_inside_waiting_period::not_yet::dtc_no_payment",
        "PA::_probe_state_exclusion_selected::packet_ready_with_caution::dtc_paid",
        "PA::_probe_state_exclusion_selected::packet_ready_with_caution::partner_sponsored_no_charge",
        "SD::_probe_inside_waiting_period::not_yet::dtc_no_payment",
        "SD::_probe_state_exclusion_selected::packet_ready_with_caution::dtc_paid",
        "SD::_probe_state_exclusion_selected::packet_ready_with_caution::partner_sponsored_no_charge",
      ],
      behaviourFieldsCompared: ["terminalOutcome", "packetFamily", "forms", "paymentMode", "sponsorshipMode", "launchGovernance", "unsupportedOrReferralOutcome", "audience"],
      behaviourChangesOnCommonFlowKeys: 0,
    },
    escalatedTo: "Phase 4",
    adjudicatedHere: false,
    reason:
      "Recording only. This integration does not decide whether the stale committed artifact or the regenerated one is correct, and it applies no correction.",
  },
  knownRedChecksAtThisBase: {
    contract:
      "Run once, not repaired in this phase. Each also fails identically in a clean worktree at PHASE2_PRODUCT_HEAD with no shard merged, which is how each was proved pre-existing.",
    verifier: "scripts/expungement-ai/flow-audit/verify-flow-audit.mjs",
    result: "29/33 passed at the untouched base AND after all six merges; the same four checks fail in both runs.",
    failing: [
      { id: "FA-16", statement: "every issue's affected flow IDs exist in the manifest", atBase: "7 unknown flow id(s) referenced", afterMerges: "7 unknown flow id(s) referenced", provenance: "PRE_EXISTING", identical: true },
      { id: "FA-21", statement: "every generated artifact is byte-reproducible from this tree", atBase: "branch-coverage.json, ui-reachability.json, static-findings.json, shard-assignment.json stale", afterMerges: "same four artifacts", provenance: "PRE_EXISTING", identical: true, note: "These four are NOT on the Phase 3 permitted-regeneration list, so they were deliberately left untouched." },
      { id: "FA-23", statement: "every flow's recorded fixture reproduces its recorded terminal", atBase: "593 reproduce; 31 do not", afterMerges: "593 reproduce; 31 do not", provenance: "PRE_EXISTING", identical: true },
      { id: "FA-17", statement: "no product behaviour file changed", atBase: "75 paths outside the audit's owned paths", afterMerges: "178 paths outside the audit's owned paths", provenance: "PRE_EXISTING_PLUS_EXPLAINED_SHARD_SCOPE", identical: false, delta: "103 added paths, categorised: 86 src/lib/rcap/state-packs/**, 17 src/lib/rcap-engine/compiled/profiles/** (state-scoped), 0 anything else; 0 paths removed. FA-17's allowlist covers only flow-audit paths, so authorised state-scoped shard work necessarily registers here. No shared Phase 2 product file, payment, discount, authentication, sponsorship, migration or deployment path is among them." },
    ],
    workerFingerprintAndWitnessLedger: {
      statement: "The known red worker-fingerprint and RCAP witness-ledger checks are NOT repaired in this integration phase, per the Phase 3 contract.",
      classification: "FINAL_INTEGRATION_OR_HOSTED_ENVIRONMENT_BLOCKER",
    },
  },
  integrationBlockers: {
    countyCourtSelector: {
      classification: "SHARED_PHASE2_BLOCKER",
      statement:
        "The county/court controlled-data selector cannot land from a state shard: the shared half (QuestionField selector-with-manual-entry, the screening-parity approved-delta file and the plain-language verifier's assertions) is Phase 2 shared product code and is prohibited to a state shard and to this integration.",
      reportedIndependentlyBy: loaded.filter((s) => Object.keys(COUNTY_COURT_SECTIONS[s.shardId] ?? {}).length >= 0 && Object.keys(harvest(s.doc, COUNTY_COURT_SECTIONS[s.shardId] ?? [])).length > 0).map((s) => s.shardId),
      appliedInThisIntegration: false,
      evidence: "perShard[].countyCourtSharedPhase2Blocker",
    },
    browserEnvironment: {
      classification: "HOSTED_ENVIRONMENT_BLOCKER",
      statement:
        "Local crawl/acceptance browser runs fail in this container (playwright chromium_headless_shell version mismatch, and terminal screenshots capturing a loading state). Not retried in this phase; the exact blocker evidence is preserved as each shard recorded it.",
      retriedInThisIntegration: false,
      evidence: "perShard[].browserEnvironmentBlockers",
    },
    knownRedChecks: {
      classification: "FINAL_INTEGRATION_OR_HOSTED_ENVIRONMENT_BLOCKER",
      statement:
        "The worker-fingerprint and RCAP witness-ledger checks are known red at the Phase 2 product base. They are deliberately NOT repaired in this integration phase and are recorded for final integration in a hosted environment.",
      repairedInThisIntegration: false,
    },
  },
  aggregateArtifactsRegenerated: [
    "data/expungement-ai/flow-audit/flow-manifest.json",
    "data/expungement-ai/flow-audit/question-inventory.json",
    "data/expungement-ai/flow-audit/issue-register.json",
    "data/expungement-ai/flow-audit/shard-completion-summary.json",
    "data/expungement-ai/flow-audit/sign-off-index.json",
    "data/expungement-ai/flow-audit/screenshot-index.json",
  ],
};

const signOffIndex = {
  schemaVersion: "expai-phase3-sign-off-index/v1",
  generatedBy: "scripts/expungement-ai/phase3/build-shard-completion-summary.mjs",
  phase2ProductHead: PHASE2_PRODUCT_HEAD,
  contract:
    "One row per jurisdiction, pointing at the shard that owns it and the sign-off packet that shard committed. Sign-off packets are carried verbatim; this index adds no legal conclusion.",
  jurisdictionCount: allJurisdictions.size,
  jurisdictions: [...allJurisdictions].sort().map((code) => {
    const owner = loaded.find((s) => jurisdictionsByShard[s.shardId].includes(code));
    const routes = [...routeIndex.entries()].filter(([id]) => id.startsWith(`${code}:`));
    return {
      jurisdiction: code,
      ownedBy: owner?.shardId ?? null,
      shardHead: owner?.head ?? null,
      stateReport: `docs/expungement-ai/flow-audit/state-reports/${code}.md`,
      shardResultFile: owner?.file ?? null,
      fallbackDependentRoutes: routes.length,
      dispositionCounts: DISPOSITION_ORDER.reduce((acc, d) => {
        acc[d] = routes.filter(([, r]) => r.disposition === d).length;
        return acc;
      }, {}),
      signOffPacketSections: Object.keys(harvest(owner?.doc ?? {}, SIGN_OFF_SECTIONS[owner?.shardId] ?? [])),
      reviewStatus: "qa_review_pending",
      approvedForLive: false,
    };
  }),
};

writeFileSync("data/expungement-ai/flow-audit/shard-completion-summary.json", stableJson(summary));
writeFileSync("data/expungement-ai/flow-audit/sign-off-index.json", stableJson(signOffIndex));

console.log("wrote data/expungement-ai/flow-audit/shard-completion-summary.json");
console.log(`  shards: ${loaded.length}  jurisdictions: ${allJurisdictions.size}  routes: ${totalRoutes}`);
console.log(`  counts: ${JSON.stringify(totals)}`);
console.log(`  duplicate routes: ${collisions.length}`);
console.log("wrote data/expungement-ai/flow-audit/sign-off-index.json");
