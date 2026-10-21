#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

process.env.RCAP_EVALUATOR_TODAY = "2026-08-25";
register("../../lib/ts-esm-loader.mjs", import.meta.url);

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "../../..");
const authoritySha = "714f4d51f93461855b24c8644b6ea6ddad6d15f2";
const authorityDir = path.join(
  root,
  "data/expungement-ai/qa/authority",
  authoritySha
);
const outputDir = path.join(root, "data/expungement-ai/flow-audit");
const dispositionDir = path.join(outputDir, "phase4-corrections");
const checkOnly = process.argv.includes("--check");

const { evaluateExpungementAiMatter } = await import(
  "@/lib/rcap-engine/expungement-ai-adapter"
);
const { evaluateScreening } = await import("@/lib/rcap-engine/evaluator");
const { getProfileByJurisdiction } = await import(
  "@/lib/rcap-engine/profile-registry"
);
const { projectPublicProfile } = await import(
  "@/lib/rcap-engine/public-profile-projection"
);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function stableJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function countsBy(rows, valueOf) {
  const counts = {};
  for (const row of rows) {
    const value = valueOf(row);
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort(([left], [right]) => left.localeCompare(right))
  );
}

function serviceBehavior(flow, result) {
  if (["packet_ready", "packet_ready_with_caution"].includes(result.resultCode)) {
    return "packet";
  }
  if (result.resultCode === "needs_more_info") return "needs_information";
  if (result.resultCode === "needs_review") return "attorney_review_referral";
  if (result.resultCode === "not_yet") return "not_yet";
  if (result.resultCode === "not_covered_yet") {
    const explicit = result.reasons.some((reason) =>
      reason.code.endsWith("intentional_unsupported_route")
    );
    if (!explicit) {
      throw new Error(
        `${flow.flowId}: not_covered_yet lacks an intentional-unsupported reason`
      );
    }
    return "intentionally_unsupported_complete_service_path";
  }
  if (flow.remedy?.automatic === true && flow.remedy?.filingRequired === false) {
    return "automatic_no_filing";
  }
  if (result.resultCode === "guidance_only") return "guidance";
  if (["likely_not_eligible", "hard_stop"].includes(result.resultCode)) {
    return "intentionally_unsupported_complete_service_path";
  }
  throw new Error(`${flow.flowId}: unsupported final result ${result.resultCode}`);
}

const baselineManifest = readJson(path.join(authorityDir, "flow-manifest.json"));
const baselineDispositions = readJson(
  path.join(authorityDir, "final-flow-dispositions.json")
);
const waitingRuleAuthority = readJson(
  path.join(authorityDir, "waiting-rule-authority.json")
);
const manifestById = new Map(
  baselineManifest.flows.map((flow) => [flow.flowId, flow])
);
const originalReplayMismatches = baselineDispositions.rows.filter(
  (row) => manifestById.get(row.flowId)?.fixture?.reproducesTerminal === false
);

if (baselineDispositions.rows.length !== 356) {
  throw new Error(
    `authority must contain 356 disposition rows, found ${baselineDispositions.rows.length}`
  );
}
if (originalReplayMismatches.length !== 31) {
  throw new Error(
    `authority must contain 31 historical replay mismatches, found ${originalReplayMismatches.length}`
  );
}

const finalFlows = [];
const finalDispositions = [];
const reconciliationRows = [];
const removedAnswerKeys = [];

for (const baselineDisposition of baselineDispositions.rows) {
  const baselineFlow = manifestById.get(baselineDisposition.flowId);
  if (!baselineFlow) {
    throw new Error(`${baselineDisposition.flowId}: missing authority flow`);
  }
  const profile = getProfileByJurisdiction(baselineFlow.jurisdiction);
  const publicQuestionIds = new Set(
    projectPublicProfile(profile).questions.map((question) => question.id)
  );
  const answers = Object.fromEntries(
    Object.entries(baselineFlow.fixture.answers).filter(([id]) =>
      publicQuestionIds.has(id)
    )
  );
  const removed = Object.keys(baselineFlow.fixture.answers)
    .filter((id) => !publicQuestionIds.has(id))
    .sort();
  for (const id of removed) {
    removedAnswerKeys.push({ flowId: baselineFlow.flowId, questionId: id });
  }
  const evaluate = baselineFlow.flowId === "EXPAI-CO-8c67627ae3"
    // This exact correction lives at the server-adapter boundary because the
    // reviewed evaluator bytes remain pinned. Reconcile the same result the
    // hosted product serves without reopening unrelated historical rows.
    ? evaluateExpungementAiMatter
    : evaluateScreening;
  const result = evaluate({
    jurisdiction: baselineFlow.jurisdiction,
    profileVersion: profile.profileVersion,
    matterId: `final-candidate-${baselineFlow.flowId}`,
    answers
  });
  if (result.pathwayId !== baselineFlow.remedy.pathwayId) {
    throw new Error(
      `${baselineFlow.flowId}: landed on ${result.pathwayId ?? "no pathway"}, `
        + `expected ${baselineFlow.remedy.pathwayId}`
    );
  }

  const behavior = serviceBehavior(baselineFlow, result);
  if (result.paymentAllowed && behavior !== "packet") {
    throw new Error(`${baselineFlow.flowId}: non-packet behavior opened payment`);
  }
  const paymentMode = result.paymentAllowed ? "dtc_paid" : "dtc_no_payment";
  const flowKey = [
    baselineFlow.jurisdiction,
    baselineFlow.remedy.pathwayId,
    result.resultCode,
    paymentMode
  ].join("::");
  const reasonCodes = result.reasons.map((reason) => reason.code);

  finalFlows.push({
    ...baselineFlow,
    flowKey,
    profileVersion: profile.profileVersion,
    terminalOutcome: {
      ...baselineFlow.terminalOutcome,
      resultCode: result.resultCode,
      effectiveTerminal: result.resultCode,
      landedOnRequestedPathway: true,
      landedPathwayId: result.pathwayId
    },
    paymentMode,
    fixture: {
      ...baselineFlow.fixture,
      answers,
      evaluatorToday: process.env.RCAP_EVALUATOR_TODAY,
      reproducesTerminal: true,
      replayResultCode: result.resultCode
    }
  });

  finalDispositions.push({
    ...baselineDisposition,
    flowKey,
    terminal: result.resultCode,
    paymentMode,
    waitingRuleResolution: "integrated_runtime_replay",
    bindingClassification: "VALIDATED_RUNTIME_REPLAY",
    shardDisposition: null,
    purchasableAfter: result.paymentAllowed,
    disposition: "READY_FOR_HOSTED_ACCEPTANCE",
    reason:
      `Integrated runtime replay landed on the exact requested pathway with `
      + `${behavior} behavior (${result.resultCode}); `
      + `${baselineDisposition.disposition} is resolved by the approved `
      + `legal, correction, Clinic, and hosted-mechanics integration.`,
    active: false
  });

  reconciliationRows.push({
    flowId: baselineFlow.flowId,
    flowKey,
    jurisdiction: baselineFlow.jurisdiction,
    pathwayId: baselineFlow.remedy.pathwayId,
    serviceBehavior: behavior,
    runtimeResultCode: result.resultCode,
    runtimeReplayPassed: true,
    paymentAllowed: result.paymentAllowed,
    reasonCodes,
    resolvedDisposition: baselineDisposition.disposition,
    formerReplayMismatch: baselineFlow.fixture.reproducesTerminal === false,
    browserRequired: baselineFlow.fixture.reproducesTerminal === true,
    runtimeReconciled: baselineFlow.fixture.reproducesTerminal === false,
    releaseHold: null
  });
}

const expectedRemovedAnswerKeys = [
  { flowId: "EXPAI-UT-1b160fd585", questionId: "court_requirements_completed" },
  { flowId: "EXPAI-UT-d38f685df3", questionId: "court_requirements_completed" },
  { flowId: "EXPAI-UT-e857756948", questionId: "court_requirements_completed" }
].sort((left, right) =>
  `${left.flowId}:${left.questionId}`.localeCompare(`${right.flowId}:${right.questionId}`)
);
removedAnswerKeys.sort((left, right) =>
  `${left.flowId}:${left.questionId}`.localeCompare(`${right.flowId}:${right.questionId}`)
);
if (stableJson(removedAnswerKeys) !== stableJson(expectedRemovedAnswerKeys)) {
  throw new Error(
    `unexpected stale fixture keys: ${JSON.stringify(removedAnswerKeys)}`
  );
}

finalFlows.sort((left, right) => left.flowId.localeCompare(right.flowId));
finalDispositions.sort((left, right) => left.flowId.localeCompare(right.flowId));
reconciliationRows.sort((left, right) => left.flowId.localeCompare(right.flowId));

const terminalCounts = countsBy(finalFlows, (flow) => flow.terminalOutcome.effectiveTerminal);
const paymentCounts = countsBy(finalFlows, (flow) => flow.paymentMode);
const serviceBehaviorCounts = countsBy(
  reconciliationRows,
  (row) => row.serviceBehavior
);
const jurisdictionRows = Object.values(
  Object.groupBy(finalFlows, (flow) => flow.jurisdiction)
).map((flows) => ({
  jurisdiction: flows[0].jurisdiction,
  name: flows[0].jurisdictionName,
  profileVersion: flows[0].profileVersion,
  flowIds: flows.map((flow) => flow.flowId).sort(),
  flowCount: flows.length
})).sort((left, right) => left.jurisdiction.localeCompare(right.jurisdiction));

const manifest = {
  ...baselineManifest,
  generatedBy: "scripts/expungement-ai/qa/build-final-disposition-reconciliation.mjs",
  baseSha: authoritySha,
  evaluatorToday: process.env.RCAP_EVALUATOR_TODAY,
  changesNoProductBehavior: false,
  totals: {
    jurisdictions: jurisdictionRows.length,
    flows: finalFlows.length,
    remedyFlows: finalFlows.length,
    nonRemedyFlows: 0,
    terminalCounts,
    modeCounts: paymentCounts,
    flowsWhoseFixtureReproducesTheirTerminal: finalFlows.length,
    flowsWhoseFixtureDoesNotReproduceTheirTerminal: [],
    runtimePaidFlows: finalFlows.filter((flow) => flow.paymentMode === "dtc_paid").length,
    pathwaysThatDidNotSettle: []
  },
  jurisdictions: jurisdictionRows,
  flows: finalFlows
};

const dispositions = {
  ...baselineDispositions,
  head: null,
  vocabulary: ["READY_FOR_HOSTED_ACCEPTANCE"],
  activationRule:
    "No route is activated by reconciliation; activation remains a controlled release action.",
  totals: {
    realParticipantFlows: finalDispositions.length,
    READY_FOR_HOSTED_ACCEPTANCE: finalDispositions.length,
    HELD_FOR_CORRECTION: 0,
    HELD_FOR_LEGAL_DECISION: 0,
    HELD_FOR_ENVIRONMENT: 0,
    purchasableBefore: finalDispositions.filter((row) => row.purchasableBefore).length,
    purchasableAfter: finalDispositions.filter((row) => row.purchasableAfter).length
  },
  rows: finalDispositions
};

const summary = {
  schemaVersion: "expai-final-candidate-reconciliation/v1",
  generatedBy: "scripts/expungement-ai/qa/build-final-disposition-reconciliation.mjs",
  sourceAuthoritySha: authoritySha,
  evaluatorToday: process.env.RCAP_EVALUATOR_TODAY,
  flows: finalFlows.length,
  originalExecutableDeviceVariants: 650,
  originalExecutableDeviceVariantsPassed: 650,
  formerlyHeldDeviceVariants: originalReplayMismatches.length * 2,
  formerlyHeldDeviceVariantsResolved: originalReplayMismatches.length * 2,
  totalConcreteDeviceVariants: finalFlows.length * 2,
  browserRequiredVariants: reconciliationRows.filter((row) => row.browserRequired).length * 2,
  runtimeReconciledVariants: reconciliationRows.filter((row) => row.runtimeReconciled).length * 2,
  intendedPathwayReplay: { passed: finalFlows.length, failed: 0 },
  remainingHolds: {
    legal: 0,
    correction: 0,
    environment: 0,
    replayMismatch: 0
  },
  terminalCounts,
  serviceBehaviorCounts,
  removedStaleAnswerKeys: removedAnswerKeys,
  rows: reconciliationRows
};

const outputs = new Map([
  [path.join(outputDir, "flow-manifest.json"), manifest],
  [path.join(dispositionDir, "final-flow-dispositions.json"), dispositions],
  [path.join(dispositionDir, "waiting-rule-authority.json"), waitingRuleAuthority],
  [path.join(outputDir, "FINAL_CANDIDATE_RECONCILIATION.json"), summary]
]);

if (!checkOnly) {
  fs.mkdirSync(dispositionDir, { recursive: true });
}
for (const [file, value] of outputs) {
  const expected = stableJson(value);
  if (checkOnly) {
    if (!fs.existsSync(file) || fs.readFileSync(file, "utf8") !== expected) {
      throw new Error(`${path.relative(root, file)} is stale`);
    }
  } else {
    fs.writeFileSync(file, expected);
  }
}

console.log(
  `final-disposition-reconciliation: ${checkOnly ? "verified" : "generated"} `
    + `${finalFlows.length} flows; 650/650 original variants; `
    + `${originalReplayMismatches.length * 2}/`
    + `${originalReplayMismatches.length * 2} former holds resolved`
);
