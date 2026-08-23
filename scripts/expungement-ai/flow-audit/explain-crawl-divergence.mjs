#!/usr/bin/env node
// Why does the browser reach a different terminal than the manifest?
//
//   node scripts/expungement-ai/flow-audit/explain-crawl-divergence.mjs
//   node scripts/expungement-ai/flow-audit/explain-crawl-divergence.mjs --check
//
// The crawl can only answer what the flow renders. The repository's witness
// ledger, and therefore the manifest fixture built on it, also carries facts the
// flow never renders. Where the two disagree, this replays the browser's exact
// answer set through the real evaluator and records the reason codes, so the
// disagreement is explained rather than filed as noise.
//
// Every divergence is classified as one of:
//   * unrendered_fact_missing  — the manifest fixture supplied a fact the flow
//     never asks, and removing it changes the terminal. A product gap.
//   * crawl_answer_differs     — both answer sets cover the same question ids and
//     still differ. A crawl-driver problem, and the audit's to fix.
//   * evaluator_disagrees      — the replay does not reproduce the browser's own
//     terminal. Recorded loudly; it would mean the audit cannot trust either side.

import {
  read, readJson, exists, gitSha, writeArtifact, stableJson, EVALUATOR_TODAY,
  getProfileByJurisdiction, projectPublicProfile, deriveScreens,
  evaluateAuthoritativeScreeningResult
} from "./lib/engine.mjs";

const CHECK = process.argv.includes("--check");
const OUT = "data/expungement-ai/flow-audit/crawl-divergence.json";
const CRAWL = "data/expungement-ai/flow-audit/evidence/crawl-report.json";

if (!exists(CRAWL)) {
  console.error(`${CRAWL} is absent; run the crawl first.`);
  process.exit(1);
}

const crawl = readJson(CRAWL);
const manifest = readJson("data/expungement-ai/flow-audit/flow-manifest.json");
const flowById = new Map(manifest.flows.map((flow) => [flow.flowId, flow]));

const rows = [];

for (const record of crawl.flows) {
  if (!record.terminal || record.terminal.terminalMatchesManifest !== false) continue;
  const flow = flowById.get(record.flowId);
  if (!flow) continue;
  const profile = getProfileByJurisdiction(record.jurisdiction);
  if (!profile) continue;

  const screenIds = new Set(deriveScreens(projectPublicProfile(profile)).map((question) => question.id));
  const fixtureAnswers = flow.fixture?.answers ?? {};
  const unrenderedFixtureFacts = Object.keys(fixtureAnswers).filter((id) => !screenIds.has(id)).sort();

  // Rebuild what the browser actually supplied, from the screens it walked.
  const browserAnswers = {};
  const screensWithoutARecordedValue = [];
  for (const screen of record.screens) {
    if (!screen.questionId) continue;
    // A context-only screen the crawl deliberately left blank is a recorded
    // decision, not a missing value: the control does not block Continue and the
    // flow's fixture named no steer for it.
    if (screen.selectedAnswerClass === "left_blank_context_only") continue;
    if (screen.selectedValue === undefined || screen.selectedValue === null) {
      screensWithoutARecordedValue.push(screen.questionId);
      continue;
    }
    browserAnswers[screen.questionId] = screen.selectedValue;
  }

  // Replay 1: exactly what the browser supplied.
  const browserReplay = evaluateSafely(record.jurisdiction, profile, browserAnswers);
  // Replay 2: the browser's answers plus the unrendered facts the fixture supplied.
  const toppedUp = { ...browserAnswers };
  for (const id of unrenderedFixtureFacts) toppedUp[id] = fixtureAnswers[id];
  const toppedUpReplay = evaluateSafely(record.jurisdiction, profile, toppedUp);

  const unrenderedFactsChangeTheOutcome = toppedUpReplay.resultCode !== browserReplay.resultCode;

  const classification = screensWithoutARecordedValue.length > 0
    ? "crawl_did_not_record_the_value"
    : browserReplay.resultCode !== record.terminal.observedResultCode
    ? "evaluator_disagrees"
    : unrenderedFixtureFacts.length > 0 && toppedUpReplay.resultCode === record.terminal.expectedResultCode
      ? "unrendered_fact_missing"
      : "crawl_answer_differs";

  rows.push({
    flowId: record.flowId,
    jurisdiction: record.jurisdiction,
    viewport: record.viewport,
    role: record.role,
    observedInBrowser: record.terminal.observedResultCode,
    expectedFromManifest: record.terminal.expectedResultCode,
    classification,
    screensTheFlowRendered: [...screenIds].sort(),
    browserAnswers,
    screensWithoutARecordedValue,
    factsTheFixtureSuppliedThatTheFlowNeverRenders: unrenderedFixtureFacts,
    browserAnswerReplay: {
      resultCode: browserReplay.resultCode,
      pathwayId: browserReplay.pathwayId,
      paymentAllowed: browserReplay.paymentAllowed,
      reasonCodes: browserReplay.reasonCodes,
      reasonText: browserReplay.reasonText
    },
    unrenderedFactsChangeTheOutcome,
    toppedUpReplay: {
      resultCode: toppedUpReplay.resultCode,
      pathwayId: toppedUpReplay.pathwayId,
      paymentAllowed: toppedUpReplay.paymentAllowed,
      reasonCodes: toppedUpReplay.reasonCodes
    }
  });
}

function evaluateSafely(jurisdiction, profile, answers) {
  try {
    const evaluation = evaluateAuthoritativeScreeningResult({
      jurisdiction,
      profileVersion: profile.profileVersion,
      matterId: "expai-divergence-replay",
      answers
    }).evaluation;
    return {
      resultCode: evaluation.resultCode,
      pathwayId: evaluation.pathwayId ?? null,
      paymentAllowed: evaluation.paymentAllowed === true,
      reasonCodes: (evaluation.reasons ?? []).map((reason) => reason.code).sort(),
      reasonText: (evaluation.reasons ?? []).map((reason) => reason.text).slice(0, 2)
    };
  } catch (error) {
    return { resultCode: "evaluator_error", pathwayId: null, paymentAllowed: false, reasonCodes: [], reasonText: [String(error?.message ?? error).slice(0, 200)] };
  }
}

const classificationCounts = {};
for (const row of rows) classificationCounts[row.classification] = (classificationCounts[row.classification] ?? 0) + 1;
const reasonCounts = {};
for (const row of rows) for (const code of row.browserAnswerReplay.reasonCodes) {
  const generic = code.replace(/^[a-z]{2}\./, "").replace(/\.[a-z0-9-]+$/i, "");
  reasonCounts[generic] = (reasonCounts[generic] ?? 0) + 1;
}
const unrenderedFactCounts = {};
for (const row of rows) for (const id of row.factsTheFixtureSuppliedThatTheFlowNeverRenders) {
  unrenderedFactCounts[id] = (unrenderedFactCounts[id] ?? 0) + 1;
}

const packet = {
  schemaVersion: "expai-crawl-divergence/v1",
  generatedBy: "scripts/expungement-ai/flow-audit/explain-crawl-divergence.mjs",
  baseSha: gitSha("origin/main"),
  evaluatorToday: EVALUATOR_TODAY,
  changesNoProductBehavior: true,
  question: "Where the browser reached a different terminal than the manifest predicted, was that the crawl's fault or the product's?",
  classifications: {
    unrendered_fact_missing: "The manifest fixture supplied a fact the flow never renders. Adding it back reproduces the manifest's terminal, so the disagreement is a product gap: the participant cannot supply that fact.",
    crawl_answer_differs: "Both answer sets cover the same question ids and still differ. The crawl driver is responsible.",
    evaluator_disagrees: "Replaying the browser's own answers does not reproduce the browser's own terminal. Neither side can be trusted until this is explained.",
    unrendered_fact_changes_the_outcome: "Adding the unrendered facts back moves the terminal, but not all the way to the manifest's expected value. The product gap is real; something else also differs.",
    crawl_did_not_record_the_value: "The crawl walked a screen without recording which value it chose, so the replay has nothing to reproduce. An audit defect, not a product one."
  },
  totals: {
    divergentRecords: rows.length,
    classificationCounts,
    topBlockingReasonCodes: Object.fromEntries(Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]).slice(0, 10)),
    unrenderedFactFrequency: Object.fromEntries(Object.entries(unrenderedFactCounts).sort((a, b) => b[1] - a[1]))
  },
  divergences: rows
};

const text = stableJson(packet);
if (CHECK) {
  if (read(OUT) !== text) {
    console.error(`${OUT} is stale or non-deterministic; re-run without --check.`);
    process.exit(1);
  }
  console.log(`crawl divergence explanation current: ${rows.length} record(s).`);
  process.exit(0);
}
const written = writeArtifact(OUT, text);
console.log(`wrote ${written.path} (${written.bytes} bytes)`);
console.log(`  divergent records: ${rows.length}`);
console.log(`  classification: ${JSON.stringify(classificationCounts)}`);
console.log(`  unrendered facts: ${JSON.stringify(packet.totals.unrenderedFactFrequency)}`);
