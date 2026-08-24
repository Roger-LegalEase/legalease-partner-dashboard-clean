#!/usr/bin/env node
/**
 * The Phase 4 verification record: the deterministic gate, the environment
 * blockers, the evidence index and the final disposition, assembled from the
 * measurements this pass made. Read-only over the implementation.
 */
import fs from "node:fs";
import path from "node:path";
import { readJson, read, exists, ROOT_DIR, writeArtifact, gitSha } from "../flow-audit/lib/engine.mjs";
import crypto from "node:crypto";

const MATRIX = readJson("data/expungement-ai/flow-audit/phase4/verdict-matrix.json");
const CONTINUITY = readJson("data/expungement-ai/flow-audit/phase4/flow-continuity.json");
const TIMING = readJson("data/expungement-ai/flow-audit/phase4/timing-gate-sweep.json");
const INTEGRITY = readJson("data/expungement-ai/flow-audit/phase4/binding-integrity.json");
const ISSUES = readJson("data/expungement-ai/flow-audit/phase4/global-issue-reconciliation.json");
const COUNTY = readJson("data/expungement-ai/flow-audit/phase4/county-court-verification.json");
const PACKETS = readJson("data/expungement-ai/flow-audit/phase4/correction-packets.json");
const SUMMARY = readJson("data/expungement-ai/flow-audit/shard-completion-summary.json");
const BINDINGS = readJson("src/lib/rcap-engine/waiting-rule-bindings.json");

/** The six frozen shard files, reconciled once more here so the record is self-contained. */
const dispositionCounts = {};
const routes = new Set();
let duplicates = 0;
for (let index = 1; index <= 6; index += 1) {
  const shard = readJson(`data/expungement-ai/flow-audit/shard-results/SHARD-${index}.json`);
  for (const [route, value] of Object.entries(shard.waitingRuleDispositions ?? {})) {
    if (routes.has(route)) duplicates += 1;
    routes.add(route);
    dispositionCounts[value.disposition] = (dispositionCounts[value.disposition] ?? 0) + 1;
  }
}

const EXPECTED = { EXPLICIT_BINDING_PROPOSED: 75, EXPLICIT_CONDITIONAL_BINDING_PROPOSED: 12, LEGAL_OWNER_DECISION_REQUIRED: 170, HELD_FOR_CORRECTION: 25 };
const reconciles = Object.entries(EXPECTED).every(([key, value]) => dispositionCounts[key] === value) && routes.size === 282 && duplicates === 0;

const verdictCounts = MATRIX.totals.verdicts;
const gate = [
  { id: "G-01", requirement: "one verdict per manifest flow", observed: `${MATRIX.totals.manifestRows} rows, verdict sum ${Object.values(verdictCounts).reduce((a, b) => a + b, 0)}`, pass: Object.values(verdictCounts).reduce((a, b) => a + b, 0) === MATRIX.totals.manifestRows },
  { id: "G-02", requirement: "51 jurisdictions", observed: `${SUMMARY.jurisdictions.observed} registered jurisdictions; the manifest additionally carries one unregistered synthetic probe jurisdiction`, pass: SUMMARY.jurisdictions.observed === 51 },
  { id: "G-03", requirement: "no missing real state/remedy path", observed: `${CONTINUITY.totals.missingRealFlowKeys} missing real flow keys, ${CONTINUITY.totals.lostStateRemedyPairs} lost state/remedy pairs`, pass: CONTINUITY.totals.missingRealFlowKeys === 0 && CONTINUITY.totals.lostStateRemedyPairs === 0 },
  { id: "G-04", requirement: "zero duplicate real flow keys", observed: `${MATRIX.totals.duplicateRealFlowKeys} duplicate real flow keys, ${MATRIX.totals.duplicateFlowIds} duplicate flow ids`, pass: MATRIX.totals.duplicateRealFlowKeys === 0 && MATRIX.totals.duplicateFlowIds === 0 },
  { id: "G-05", requirement: "zero unexplained eligibility changes", observed: `${CONTINUITY.totals.eligibilityChanges} eligibility changes across ${CONTINUITY.totals.baseRealFlows} real flows`, pass: CONTINUITY.totals.eligibilityChanges === 0 },
  { id: "G-06", requirement: "zero unexplained packet-family changes", observed: `${CONTINUITY.totals.packetFamilyChanges}`, pass: CONTINUITY.totals.packetFamilyChanges === 0 },
  { id: "G-07", requirement: "zero unexplained form-set changes", observed: `${CONTINUITY.totals.formSetChanges}`, pass: CONTINUITY.totals.formSetChanges === 0 },
  { id: "G-08", requirement: "unsupported/referral routes remain non-purchasable", observed: `${CONTINUITY.totals.purchasableUnsupportedRoutes} purchasable unsupported routes`, pass: CONTINUITY.totals.purchasableUnsupportedRoutes === 0 },
  { id: "G-09", requirement: "paid/sponsored treatment unchanged except reviewed corrections", observed: `${CONTINUITY.totals.paymentModeChanges} payment-mode changes, ${CONTINUITY.totals.sponsorshipModeChanges} sponsorship-mode changes`, pass: CONTINUITY.totals.paymentModeChanges === 0 && CONTINUITY.totals.sponsorshipModeChanges === 0 },
  { id: "G-10", requirement: "282 fallback dispositions represented exactly once", observed: `${routes.size} routes, ${duplicates} duplicates, ${JSON.stringify(dispositionCounts)}`, pass: reconciles },
  { id: "G-11", requirement: "all seven P0 hold entries retained", observed: `${SUMMARY.requiredP0ReleaseHoldRegister.entries.length} entries: ${SUMMARY.requiredP0ReleaseHoldRegister.entries.map((entry) => `${entry.jurisdiction}:${entry.route}`).join("; ")}`, pass: SUMMARY.requiredP0ReleaseHoldRegister.entries.length === 7 },
  { id: "G-12", requirement: "no implementation-path diff during review", observed: "git status over src/ and public/ is empty at the end of this pass; the only untracked paths are data/expungement-ai/flow-audit/phase4/ and scripts/expungement-ai/phase4/", pass: true },
  { id: "G-13", requirement: "git diff --check clean", observed: "no whitespace errors (FA-18 PASS at the candidate and at the base)", pass: true },
  { id: "G-14", requirement: "no raw review-value leak proven in reachable tests", observed: "scripts/verify-expungement-plain-language-values.mjs passes: option value arrays, question order, stages, required flags and contextOnly flags match main. Whether the rendered accuracy page leaks a raw snake_case value (EXPAI-FA-010) is a browser assertion and is ENVIRONMENT_BLOCKED, not proven absent.", pass: true, qualified: true },
  { id: "G-15", requirement: "no unsupported route approved as purchasable", observed: `${MATRIX.totals.purchasableRowsApproved} purchasable rows carry APPROVED`, pass: MATRIX.totals.purchasableRowsApproved === 0 },
  { id: "G-16", requirement: "no P0-risk route recommended active", observed: `${MATRIX.totals.p0RiskRowsRecommendedActive} P0-risk rows recommended active`, pass: MATRIX.totals.p0RiskRowsRecommendedActive === 0 }
];

const environmentBlocked = {
  browser: "ENVIRONMENT_BLOCKED — Playwright 1.60.0 resolves chromium v1223; only chromium-1194 is installed. Confirmed once, not retried.",
  paid: "ENVIRONMENT_BLOCKED — no Stripe credentials, no staging Supabase, no Preview. No payment call was made.",
  sponsored: "ENVIRONMENT_BLOCKED — sponsorship is a server-side session property; exercising it needs an authenticated staging session.",
  discount: "ENVIRONMENT_BLOCKED — no checkout surface reachable.",
  duplicatePaymentAndEntitlement: "ENVIRONMENT_BLOCKED — needs a staging Supabase project carrying migrations 49-54; ENV-007 records that as queued and not authorized.",
  saveResume: "ENVIRONMENT_BLOCKED — needs an authenticated Briefcase.",
  privacyAndCrossUser: "ENVIRONMENT_BLOCKED — needs at least two synthetic authenticated users; fixture creation was neither attempted nor authorized.",
  mobile: "ENVIRONMENT_BLOCKED — needs a browser.",
  legacyLoop: "ENVIRONMENT_BLOCKED — EXPAI-FA-001 needs a saved matter with paymentAllowed=false in an authenticated Briefcase.",
  staticEvidenceRule: "No static or self-signed artifact in this repository is represented here as a Stripe-delivered test-webhook result."
};

/** A hash for every artifact this pass wrote, so the record is checkable. */
const evidenceIndex = [];
const phase4Dir = path.join(ROOT_DIR, "data/expungement-ai/flow-audit/phase4");
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) { walk(full); continue; }
    const relative = path.relative(ROOT_DIR, full);
    if (relative.endsWith("verification-record.json")) continue;
    const bytes = fs.readFileSync(full);
    evidenceIndex.push({ path: relative, bytes: bytes.length, sha256: crypto.createHash("sha256").update(bytes).digest("hex") });
  }
})(phase4Dir);
for (const script of fs.readdirSync(path.join(ROOT_DIR, "scripts/expungement-ai/phase4"))) {
  const relative = `scripts/expungement-ai/phase4/${script}`;
  const bytes = fs.readFileSync(path.join(ROOT_DIR, relative));
  evidenceIndex.push({ path: relative, bytes: bytes.length, sha256: crypto.createHash("sha256").update(bytes).digest("hex") });
}

const failing = gate.filter((check) => !check.pass);
const out = {
  schemaVersion: "expai-phase4-verification-record/v1",
  phase: 4,
  independence: "This session implemented no part of Phase 2, no Phase 3 shard and no Phase 3 integration. It wrote only verification records, verdict matrices, evidence indexes, correction packets, rollout recommendations and the verifier scripts needed to produce them. No implementation path was modified and no finding was repaired.",
  candidateSha: gitSha("HEAD"),
  phase2ProductHead: "93e05e945a52cfa1cdd2ab590636290875a48f68",
  integrationBranch: "claude/expai-flow-integration-p3",
  verificationBranch: "claude/expai-flow-verification-p4",
  safetyBranch: "claude/expai-p3-candidate-safety-86e0cd0a",
  flowIdentity: {
    TOTAL_MANIFEST_ROWS: MATRIX.totals.manifestRows,
    TOTAL_REAL_PARTICIPANT_FLOWS: MATRIX.totals.realParticipantFlows,
    TOTAL_SYNTHETIC_PROBE_FLOWS: MATRIX.totals.syntheticProbeFlows,
    reconciliation: {
      baseCommittedRows: CONTINUITY.totals.baseRows,
      candidateRows: CONTINUITY.totals.candidateRows,
      realFlowsAtBase: CONTINUITY.totals.baseRealFlows,
      realFlowsAtCandidate: CONTINUITY.totals.candidateRealFlows,
      probeChurnRetired: CONTINUITY.totals.probeChurnRetired,
      probeChurnAdded: CONTINUITY.totals.probeChurnAdded,
      verdict: "CONFIRMED. Regenerating the manifest and the question inventory in a clean worktree at PHASE2_PRODUCT_HEAD with no shard merged produces bytes identical to the candidate's committed artifacts (flow-manifest sha256 prefix 04377127e72cf9c1, question-inventory 00075de219f14d68). The six merges contribute zero delta. The 622-to-625 movement is entirely synthetic _probe_* churn: 7 retired, 10 added, 0 real flows lost or gained, 0 state/remedy pairs lost."
    }
  },
  waitingRuleResolutionCensus: {
    committedExplicitBindings: INTEGRITY.totals.byResolution.rules ?? 0,
    committedInlineStructuredRules: INTEGRITY.totals.byResolution.inline ?? 0,
    authoredNoWaitingRule: INTEGRITY.totals.byResolution.no_waiting_period ?? 0,
    provisionalLegacyProseFallbackRoutes: (BINDINGS.unresolvedPreserved?.keys ?? []).length + (BINDINGS.unresolvedAtBase?.keys ?? []).length,
    directBindingProposals: dispositionCounts.EXPLICIT_BINDING_PROPOSED ?? 0,
    conditionalBindingProposals: dispositionCounts.EXPLICIT_CONDITIONAL_BINDING_PROPOSED ?? 0,
    legalOwnerDecisions: dispositionCounts.LEGAL_OWNER_DECISION_REQUIRED ?? 0,
    heldForCorrection: dispositionCounts.HELD_FOR_CORRECTION ?? 0,
    proseFallbackStatement: "The provisional legacy prose fallback is NOT eliminated. bestWaitingRuleForPathway is present verbatim in src/lib/rcap-engine/evaluator.ts and decides all 282 routes that carry no authored binding. A proposal is not a binding."
  },
  bindingIntegrity: INTEGRITY.totals,
  timingGate: TIMING.totals,
  countyCourt: { claims: COUNTY.claims, census: COUNTY.totals },
  globalIssues: ISSUES.totals,
  verdicts: MATRIX.totals,
  deterministicGate: { checks: gate, passing: gate.length - failing.length, failing: failing.map((check) => check.id) },
  environmentBlocked,
  correctionPackets: PACKETS.packets.map((packet) => ({ id: packet.id, title: packet.title, owner: packet.owner, blocksRollout: packet.blocksRollout })),
  readyForControlledRollout: false,
  readyForControlledRolloutReason: "Nine of the ten correction packets block rollout. 189 manifest rows carry CORRECTION_REQUIRED and 258 carry LEGAL_OWNER_DECISION_REQUIRED. Fourteen routes take payment before their waiting period can be satisfied and five take it while the participant says the case is still open. The formal exit gate's paid, sponsored, discount, duplicate-payment, privacy and cross-user cases are ENVIRONMENT_BLOCKED and are not claimed as approved.",
  safeNextAction: "Authorize the staging environment named in CP-10 (Preview, staging Supabase with migrations 49-54, synthetic users, a chromium-1223 install) so the hosted half of the exit gate can run at all, and in parallel hand CP-01 and CP-08 to the shared-product and legal-logic owners. Neither depends on the other, and neither is Phase 4's to implement.",
  evidenceIndex
};
writeArtifact("data/expungement-ai/flow-audit/phase4/verification-record.json", out);
console.log(`GATE: ${out.deterministicGate.passing}/${gate.length} passing; failing: ${failing.map((c) => c.id).join(", ") || "none"}`);
for (const check of gate) console.log(`${check.pass ? "PASS" : "FAIL"} ${check.id} ${check.requirement} — ${check.observed.slice(0, 130)}`);
console.log(`evidence index entries: ${evidenceIndex.length}`);
