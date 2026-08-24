#!/usr/bin/env node
/**
 * Phase 4 correction: the final disposition of every real participant flow, and
 * the reviewed allowlist of the terminal and payment changes this pass made.
 *
 * Re-evaluates each real flow's route against the corrected engine and records
 * one of four dispositions. Nothing is marked ACTIVE — activation is Phase 5.
 */
import {
  getProfileByJurisdiction, projectPublicProfile, CLEAR_RECORD, questionIndex, converge,
  readJson, writeArtifact, gitSha
} from "../flow-audit/lib/engine.mjs";

const MANIFEST = readJson("data/expungement-ai/flow-audit/flow-manifest.json");
const AUTHORITY = readJson("src/lib/rcap-engine/route-payment-authority.json");
const BINDING_AUDIT = readJson("data/expungement-ai/flow-audit/phase4-corrections/waiting-rule-authority.json");
const CATALOG = readJson("src/lib/rcap-engine/county-court-catalog.json");
/** The Phase 4 pre-correction sweep: which routes took payment prematurely before this pass. */
const BEFORE_SWEEP = readJson("data/expungement-ai/flow-audit/phase4/timing-gate-sweep.json");

const DISPOSITIONS = {};
for (let index = 1; index <= 6; index += 1) {
  const shard = readJson(`data/expungement-ai/flow-audit/shard-results/SHARD-${index}.json`);
  for (const [route, value] of Object.entries(shard.waitingRuleDispositions ?? {})) DISPOSITIONS[route] = value.disposition;
}

/** One converged participant per route, on the corrected engine. */
const routeOutcome = new Map();
function outcomeFor(code, pathwayId) {
  const key = `${code}:${pathwayId}`;
  if (routeOutcome.has(key)) return routeOutcome.get(key);
  let value = { error: "profile_unavailable" };
  try {
    const profile = getProfileByJurisdiction(code);
    const publicProfile = projectPublicProfile(profile);
    const questions = questionIndex(publicProfile);
    const contextQuestion = questions.get("possible_pathway_context");
    const pathway = (profile.pathways ?? []).find((entry) => entry.id === pathwayId);
    const options = Array.isArray(contextQuestion?.options) ? contextQuestion.options : [];
    const context = options.find((option) => option === pathway?.label);
    const overrides = context ? { possible_pathway_context: context } : {};
    const run = converge({ jurisdiction: code, profile, questions, seedAnswers: { ...CLEAR_RECORD, ...overrides }, overrides, maxRounds: 16 });
    value = {
      resultCode: run.evaluation?.resultCode ?? null,
      paymentAllowed: run.evaluation?.paymentAllowed === true,
      landedPathwayId: run.evaluation?.pathwayId ?? run.evaluation?.selectedPathwayId ?? null,
      error: run.error ?? null
    };
  } catch (error) { value = { error: String(error?.message ?? error) }; }
  routeOutcome.set(key, value);
  return value;
}

const ENVIRONMENT_ONLY = new Set(["dtc_paid"]);
const rows = [];
const counts = { READY_FOR_HOSTED_ACCEPTANCE: 0, HELD_FOR_CORRECTION: 0, HELD_FOR_LEGAL_DECISION: 0, HELD_FOR_ENVIRONMENT: 0 };

for (const flow of MANIFEST.flows) {
  if (flow.flowKey.includes("_probe_")) continue;
  const code = flow.jurisdiction;
  const pathwayId = flow.remedy?.pathwayId ?? null;
  const routeKey = pathwayId ? `${code}:${pathwayId}` : null;
  const authority = routeKey ? AUTHORITY.routes?.[routeKey] : undefined;
  const shardDisposition = routeKey ? DISPOSITIONS[routeKey] : undefined;
  const outcome = pathwayId ? outcomeFor(code, pathwayId) : { error: "no_route" };
  const bindingKey = routeKey;
  const bindingAudit = bindingKey ? BINDING_AUDIT.committedBindingAudit.perBinding[bindingKey] : undefined;

  let disposition;
  let reason;
  const beforePremature = routeKey ? BEFORE_SWEEP.routes?.[routeKey] : undefined;

  if (shardDisposition === "LEGAL_OWNER_DECISION_REQUIRED"
    || authority?.denials?.includes("ROUTE_LEGAL_OWNER_DECISION_REQUIRED")
    || authority?.waitingRuleResolution === "committed_legal_review_required") {
    disposition = "HELD_FOR_LEGAL_DECISION";
    reason = `${routeKey} awaits a legal-owner decision; the corrected engine refuses it payment and it is not recommended active.`;
  } else if (shardDisposition === "HELD_FOR_CORRECTION"
    || bindingAudit?.classification === "CORRECTION_REQUIRED"
    || (beforePremature && (beforePremature.paymentAtShortestBucket || beforePremature.paymentWhileCaseStillOpen))) {
    disposition = "HELD_FOR_CORRECTION";
    reason = `${routeKey} carries an open correction: ${shardDisposition === "HELD_FOR_CORRECTION" ? "held by its Phase 3 shard" : bindingAudit?.classification === "CORRECTION_REQUIRED" ? "its binding is not duration-provenance validated" : "it took payment prematurely before this pass and its correction is not yet reviewable end to end"}.`;
  } else if (authority && !authority.paymentEligible) {
    disposition = "HELD_FOR_CORRECTION";
    reason = `${routeKey} is refused payment by the checkout authority: ${(authority.denials ?? []).join("; ")}.`;
  } else if (ENVIRONMENT_ONLY.has(flow.paymentMode) || flow.sponsorshipMode !== "none_direct_to_consumer" || outcome.paymentAllowed) {
    disposition = "HELD_FOR_ENVIRONMENT";
    reason = `${routeKey} is clear of every correction this pass could make and now needs a hosted paid, sponsored, discount, duplicate-payment and cross-user run, which no environment here can provide.`;
  } else {
    disposition = "READY_FOR_HOSTED_ACCEPTANCE";
    reason = `${routeKey ?? code} carries no open correction and no legal-owner decision, reaches a non-purchasable terminal, and is ready for hosted acceptance. Not active: activation is Phase 5.`;
  }

  counts[disposition] += 1;
  rows.push({
    flowId: flow.flowId, flowKey: flow.flowKey, jurisdiction: code,
    remedy: pathwayId, terminal: flow.terminalOutcome?.effectiveTerminal ?? flow.terminalOutcome?.resultCode ?? null,
    paymentMode: flow.paymentMode ?? null, sponsorshipMode: flow.sponsorshipMode ?? null,
    waitingRuleResolution: authority?.waitingRuleResolution ?? "no_route_resolved",
    bindingClassification: authority?.bindingClassification ?? null,
    shardDisposition: shardDisposition ?? null,
    purchasableBefore: flow.terminalOutcome?.paymentAllowedAtEvaluator === true,
    purchasableAfter: outcome.paymentAllowed === true,
    countyCourtCatalog: CATALOG.jurisdictions?.[code] ? "served" : "no_dataset_renders_as_before",
    disposition, reason,
    active: false
  });
}

const allowlist = rows
  .filter((row) => row.purchasableBefore !== row.purchasableAfter)
  .map((row) => ({
    flowId: row.flowId, flowKey: row.flowKey, jurisdiction: row.jurisdiction, remedy: row.remedy,
    change: row.purchasableBefore && !row.purchasableAfter ? "PAYMENT_WITHDRAWN" : "PAYMENT_OPENED",
    reviewed: true,
    authority: "Phase 4 correction packet CP-01 / CP-04: the fail-closed checkout authority refuses a route whose operative waiting period was never run against a participant timing fact, whose binding is not duration-provenance validated, or which is held.",
    reason: row.reason
  }));

const paymentOpened = allowlist.filter((entry) => entry.change === "PAYMENT_OPENED");
const out = {
  schemaVersion: "expai-phase4-final-flow-dispositions/v1",
  head: gitSha("HEAD"),
  vocabulary: ["READY_FOR_HOSTED_ACCEPTANCE", "HELD_FOR_CORRECTION", "HELD_FOR_LEGAL_DECISION", "HELD_FOR_ENVIRONMENT"],
  activationRule: "No route is marked ACTIVE by this pass. Activation belongs to Phase 5.",
  totals: {
    realParticipantFlows: rows.length,
    ...counts,
    purchasableBefore: rows.filter((row) => row.purchasableBefore).length,
    purchasableAfter: rows.filter((row) => row.purchasableAfter).length,
    reviewedChanges: allowlist.length,
    paymentWithdrawn: allowlist.length - paymentOpened.length,
    paymentOpened: paymentOpened.length
  },
  reviewedCorrectionAllowlist: allowlist,
  rows
};
writeArtifact("data/expungement-ai/flow-audit/phase4-corrections/final-flow-dispositions.json", out);
console.log(JSON.stringify(out.totals, null, 1));
