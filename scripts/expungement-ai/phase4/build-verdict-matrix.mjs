#!/usr/bin/env node
/**
 * Phase 4 verdict matrix: exactly one verdict for every manifest row.
 *
 * Every input is a frozen artifact or a Phase 4 measurement made earlier in this
 * pass. Nothing here re-decides a shard's legal research, and nothing repairs a
 * finding: a reproduced wrong-outcome becomes CORRECTION_REQUIRED and a hold,
 * never a fix.
 *
 * Precedence, highest first, so a row can only ever carry one verdict:
 *   1 CORRECTION_REQUIRED            a defect this pass reproduced or proved in data
 *   2 LEGAL_OWNER_DECISION_REQUIRED  a route counsel must decide
 *   3 ENVIRONMENT_BLOCKED            verification needs an environment that does not exist
 *   4 APPROVED                       nothing above applies and the row is inert or clean
 */
import { readJson, writeArtifact, gitSha } from "../flow-audit/lib/engine.mjs";

const MANIFEST = readJson("data/expungement-ai/flow-audit/flow-manifest.json");
const ASSIGNMENT = readJson("data/expungement-ai/flow-audit/shard-assignment.json");
const REGISTER = readJson("data/expungement-ai/flow-audit/issue-register.json");
const BINDINGS = readJson("src/lib/rcap-engine/waiting-rule-bindings.json");
const INTEGRITY = readJson("data/expungement-ai/flow-audit/phase4/binding-integrity.json");
const TIMING = readJson("data/expungement-ai/flow-audit/phase4/timing-gate-sweep.json");
const AMBIGUITY = readJson("data/expungement-ai/flow-audit/phase4/route-irrelevant-ambiguity.json");

/** Route -> shard disposition, rebuilt from the six frozen shard files. */
const DISPOSITIONS = {};
for (let index = 1; index <= 6; index += 1) {
  const shard = readJson(`data/expungement-ai/flow-audit/shard-results/SHARD-${index}.json`);
  for (const [route, value] of Object.entries(shard.waitingRuleDispositions ?? {})) {
    DISPOSITIONS[route] = { shard: `SHARD-${index}`, ...value };
  }
}
const SHARD_OF_JURISDICTION = {};
for (const shard of ASSIGNMENT.shards ?? []) {
  for (const code of shard.stateList ?? []) SHARD_OF_JURISDICTION[code] = shard.shardId;
}

/** Routes this pass measured as premature-payment or timing-inert risks. */
const PREMATURE_PAYMENT = new Set();
const TIMING_INERT = new Set();
for (const [route, value] of Object.entries(TIMING.routes ?? {})) {
  if (value.paymentAtShortestBucket || value.paymentWhileCaseStillOpen) PREMATURE_PAYMENT.add(route);
  if (value.timingAnswerInert) TIMING_INERT.add(route);
}
/** Committed bindings this pass found materially defective. */
const DEFECTIVE_BINDINGS = new Set(
  Object.entries(INTEGRITY.bindings ?? {}).filter(([, value]) => value.materialFindingCount > 0).map(([key]) => key)
);
/** The seven required P0 holds, expressed as the jurisdictions they name. */
const P0_JURISDICTIONS = new Set(["HI", "NV", "LA", "MO", "PA", "CA"]);
/** Explicitly measured route-level P0 confirmations. */
const P0_ROUTES = new Set([
  "HI:dui-under-21-conviction", "HI:first-time-drug-conviction", "HI:nonconviction-arrest-expungement",
  "NV:general-conviction-record-sealing-under-nrs-179-245",
  "LA:non-conviction-arrest-expungement", "LA:misdemeanor-article-894-b-set-aside-followed-by-expungement",
  "LA:felony-article-893-e-set-aside-followed-by-expungement",
  "MO:marijuana-expungement-under-missouri-constitution-article-xiv",
  "PA:path-e-age-70-expungement",
  "CA:tool-1-dismissal-set-aside", "CA:tool-4-arrest-record-sealing"
]);
/** Jurisdictions where an optional route-scoped question closes a payable route. */
const AMBIGUITY_JURISDICTIONS = new Set(
  Object.entries(AMBIGUITY.jurisdictions ?? {})
    .filter(([, value]) => (value.rows ?? []).some((row) => row.blocksAnUnrelatedRoute))
    .map(([code]) => code)
);
/** Flows whose recorded fixture does not reproduce its recorded terminal. */
const FIXTURE_DRIFT = new Set((MANIFEST.totals?.flowsWhoseFixtureDoesNotReproduceTheirTerminal ?? []).map((row) => row.flowId));
/** Flow ids the issue register names. */
const REGISTERED_FLOWS = new Map();
for (const issue of REGISTER.issues ?? []) {
  for (const flowId of issue.affectedFlowIds ?? []) {
    if (!REGISTERED_FLOWS.has(flowId)) REGISTERED_FLOWS.set(flowId, []);
    REGISTERED_FLOWS.get(flowId).push(issue.findingId);
  }
}

function waitingRuleResolution(code, pathwayId) {
  if (!pathwayId) return "no_route_resolved";
  const key = `${code}:${pathwayId}`;
  const binding = BINDINGS.bindings?.[key];
  if (binding) {
    if (binding.resolution === "no_waiting_period") return "committed_authored_no_waiting_rule";
    if (binding.resolution === "inline") return "committed_inline_structured_rule";
    if (binding.resolution === "legal_review_required") return "committed_legal_review_required";
    return "committed_explicit_binding";
  }
  if ((BINDINGS.unresolvedAtBase?.keys ?? []).includes(key)) return "provisional_prose_fallback_no_candidate";
  return "provisional_prose_fallback";
}

const PACKET_TERMINALS = new Set(["packet_ready", "packet_ready_with_caution"]);

function verdictFor(flow) {
  const code = flow.jurisdiction;
  const pathwayId = flow.remedy?.pathwayId ?? null;
  const route = pathwayId ? `${code}:${pathwayId}` : null;
  const isProbe = flow.flowKey.includes("_probe_");
  const disposition = route ? DISPOSITIONS[route] : undefined;
  const resolution = waitingRuleResolution(code, pathwayId);
  const paymentAllowed = flow.terminalOutcome?.paymentAllowedAtEvaluator === true;
  const reasons = [];
  const evidence = [];

  // 1 — CORRECTION_REQUIRED
  if (route && P0_ROUTES.has(route)) {
    reasons.push("Route is one of the required P0 release holds and this pass reproduced its evidence directly.");
    evidence.push("data/expungement-ai/flow-audit/phase4/p0-pinned-reproduction.json", "data/expungement-ai/flow-audit/phase4/timing-gate-sweep.json");
  }
  if (route && PREMATURE_PAYMENT.has(route)) {
    reasons.push("Payment opens at the shortest timing bucket, or while the participant says the case is still open.");
    evidence.push("data/expungement-ai/flow-audit/phase4/timing-gate-sweep.json");
  }
  if (route && DEFECTIVE_BINDINGS.has(route)) {
    reasons.push("The committed waiting-rule binding for this route carries a material duration-provenance defect.");
    evidence.push("data/expungement-ai/flow-audit/phase4/binding-integrity.json");
  }
  if (disposition?.disposition === "HELD_FOR_CORRECTION") {
    reasons.push(`Shard ${disposition.shard} held this route for correction and the candidate applies no correction.`);
    evidence.push(`data/expungement-ai/flow-audit/shard-results/${disposition.shard}.json`);
  }
  if (disposition?.disposition === "EXPLICIT_BINDING_PROPOSED" || disposition?.disposition === "EXPLICIT_CONDITIONAL_BINDING_PROPOSED") {
    reasons.push(`Shard ${disposition.shard} proposed a ${disposition.disposition === "EXPLICIT_BINDING_PROPOSED" ? "direct" : "conditional"} binding that is not applied; the route still resolves through the provisional prose fallback.`);
    evidence.push(`data/expungement-ai/flow-audit/shard-results/${disposition.shard}.json`, "src/lib/rcap-engine/waiting-rule-bindings.json#unresolvedPreserved");
  }
  if (FIXTURE_DRIFT.has(flow.flowId)) {
    reasons.push("The flow's recorded fixture does not reproduce its recorded terminal (FA-23).");
    evidence.push("data/expungement-ai/flow-audit/phase4/verifier-parity.json");
  }
  if (AMBIGUITY_JURISDICTIONS.has(code) && paymentAllowed) {
    reasons.push("An optional route-scoped question in this jurisdiction closes this payable route when answered 'I'm not sure', though it belongs to a different remedy.");
    evidence.push("data/expungement-ai/flow-audit/phase4/route-irrelevant-ambiguity.json");
  }
  if (reasons.length > 0) return { verdict: "CORRECTION_REQUIRED", reasons, evidence, resolution, disposition };

  // 2 — LEGAL_OWNER_DECISION_REQUIRED
  if (disposition?.disposition === "LEGAL_OWNER_DECISION_REQUIRED") {
    return {
      verdict: "LEGAL_OWNER_DECISION_REQUIRED",
      reasons: [`Shard ${disposition.shard} classified this route LEGAL_OWNER_DECISION_REQUIRED and the candidate contains no deterministic authority resolving it.`],
      evidence: [`data/expungement-ai/flow-audit/shard-results/${disposition.shard}.json`],
      resolution, disposition
    };
  }
  if (REGISTERED_FLOWS.has(flow.flowId) && (REGISTER.issues ?? []).some((issue) => (issue.affectedFlowIds ?? []).includes(flow.flowId) && issue.legalReviewRequired === true)) {
    return {
      verdict: "LEGAL_OWNER_DECISION_REQUIRED",
      reasons: [`Issue register entries ${REGISTERED_FLOWS.get(flow.flowId).join(", ")} mark this flow as requiring legal review.`],
      evidence: ["data/expungement-ai/flow-audit/issue-register.json"],
      resolution, disposition
    };
  }

  // 3 — ENVIRONMENT_BLOCKED
  if (paymentAllowed || flow.paymentMode === "dtc_paid" || flow.sponsorshipMode !== "none_direct_to_consumer") {
    return {
      verdict: "ENVIRONMENT_BLOCKED",
      reasons: ["This row's acceptance depends on a paid, sponsored or discounted checkout, duplicate-payment and entitlement behaviour, and cross-user privacy, none of which can be exercised without a hosted Preview, a staging Supabase project and synthetic authenticated users."],
      evidence: ["data/expungement-ai/flow-audit/phase4/environment-blockers.json", "data/expungement-ai/flow-audit/hosted-acceptance-record.json"],
      resolution, disposition
    };
  }
  if (resolution === "provisional_prose_fallback_no_candidate") {
    return {
      verdict: "CORRECTION_REQUIRED",
      reasons: ["The route reaches the prose fallback and the fallback finds no candidate rule at all, so no waiting period is executed."],
      evidence: ["src/lib/rcap-engine/waiting-rule-bindings.json#unresolvedAtBase"],
      resolution, disposition
    };
  }

  // 4 — APPROVED
  return {
    verdict: "APPROVED",
    reasons: [isProbe
      ? "Synthetic probe row: it carries no participant-reachable remedy, reaches a non-purchasable terminal, and this pass measured no defect against it."
      : "Non-purchasable route with no reproduced defect, no unapplied binding proposal and no open legal-owner decision. Approved as a verification record only."],
    evidence: ["data/expungement-ai/flow-audit/phase4/timing-gate-sweep.json"],
    resolution, disposition
  };
}

const ROLLOUT = {
  APPROVED: "ELIGIBLE_FOR_CONTROLLED_ROLLOUT_ONCE_THE_HOSTED_GATE_PASSES",
  CORRECTION_REQUIRED: "HOLD — MUST_NOT_BE_RECOMMENDED_ACTIVE",
  LEGAL_OWNER_DECISION_REQUIRED: "HOLD — AWAITING_LEGAL_OWNER",
  ENVIRONMENT_BLOCKED: "HOLD — NOT_VERIFIABLE_WITHOUT_A_STAGING_ENVIRONMENT"
};
const PACKET_OF_REASON = [
  [/required P0 release holds/, "CP-01"],
  [/Payment opens at the shortest/, "CP-01"],
  [/proposed a direct binding/, "CP-02"],
  [/proposed a conditional binding/, "CP-03"],
  [/duration-provenance defect/, "CP-04"],
  [/LEGAL_OWNER_DECISION_REQUIRED/, "CP-05"],
  [/no candidate rule at all/, "CP-06"],
  [/route-scoped question/, "CP-08"],
  [/held this route for correction/, "CP-01"],
  [/fixture does not reproduce/, "CP-09"],
  [/hosted Preview/, "CP-10"]
];

const rows = [];
const counts = { APPROVED: 0, CORRECTION_REQUIRED: 0, LEGAL_OWNER_DECISION_REQUIRED: 0, ENVIRONMENT_BLOCKED: 0 };
for (const flow of MANIFEST.flows) {
  const isProbe = flow.flowKey.includes("_probe_");
  const result = verdictFor(flow);
  counts[result.verdict] += 1;
  const packets = [...new Set(result.reasons.flatMap((reason) => PACKET_OF_REASON.filter(([pattern]) => pattern.test(reason)).map(([, id]) => id)))];
  rows.push({
    flowId: flow.flowId,
    flowKey: flow.flowKey,
    flowClass: isProbe ? "synthetic_probe" : "real_participant",
    jurisdiction: flow.jurisdiction,
    jurisdictionName: flow.jurisdictionName,
    remedy: flow.remedy?.pathwayId ?? flow.remedy?.kind ?? null,
    remedyLabel: flow.remedy?.pathwayLabel ?? null,
    terminal: flow.terminalOutcome?.effectiveTerminal ?? flow.terminalOutcome?.resultCode ?? null,
    resultCode: flow.terminalOutcome?.resultCode ?? null,
    paymentMode: flow.paymentMode ?? null,
    sponsorshipMode: flow.sponsorshipMode ?? null,
    audience: flow.audience ?? null,
    purchasable: flow.terminalOutcome?.paymentAllowedAtEvaluator === true,
    operationallySellable: flow.launchGovernance?.operationallySellable ?? null,
    waitingRuleResolution: result.resolution,
    shardDisposition: result.disposition?.disposition ?? null,
    phase3Shard: SHARD_OF_JURISDICTION[flow.jurisdiction] ?? result.disposition?.shard ?? "unassigned",
    verdict: result.verdict,
    reason: result.reasons.join(" "),
    evidence: [...new Set(result.evidence)],
    correctionPacketIds: packets,
    rolloutRecommendation: ROLLOUT[result.verdict]
  });
}

const real = rows.filter((row) => row.flowClass === "real_participant");
const probe = rows.filter((row) => row.flowClass === "synthetic_probe");
const out = {
  schemaVersion: "expai-phase4-verdict-matrix/v1",
  candidateSha: gitSha("HEAD"),
  phase2ProductHead: "93e05e945a52cfa1cdd2ab590636290875a48f68",
  vocabulary: ["APPROVED", "CORRECTION_REQUIRED", "LEGAL_OWNER_DECISION_REQUIRED", "ENVIRONMENT_BLOCKED"],
  precedence: "CORRECTION_REQUIRED > LEGAL_OWNER_DECISION_REQUIRED > ENVIRONMENT_BLOCKED > APPROVED",
  totals: {
    manifestRows: rows.length,
    realParticipantFlows: real.length,
    syntheticProbeFlows: probe.length,
    jurisdictions: new Set(rows.map((row) => row.jurisdiction)).size,
    duplicateFlowIds: rows.length - new Set(rows.map((row) => row.flowId)).size,
    duplicateRealFlowKeys: real.length - new Set(real.map((row) => row.flowKey)).size,
    verdicts: counts,
    verdictsOnRealFlows: real.reduce((accumulator, row) => { accumulator[row.verdict] = (accumulator[row.verdict] ?? 0) + 1; return accumulator; }, {}),
    purchasableRowsApproved: rows.filter((row) => row.purchasable && row.verdict === "APPROVED").length,
    p0RiskRowsRecommendedActive: rows.filter((row) => row.correctionPacketIds.includes("CP-01") && row.rolloutRecommendation.startsWith("ELIGIBLE")).length
  },
  rows
};
writeArtifact("data/expungement-ai/flow-audit/phase4/verdict-matrix.json", out);
console.log(JSON.stringify(out.totals, null, 1));
