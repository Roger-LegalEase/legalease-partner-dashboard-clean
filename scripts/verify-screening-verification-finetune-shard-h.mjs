#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";

process.env.RCAP_EVALUATOR_TODAY = "2026-08-25";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { evaluateScreening } = await import("../src/lib/rcap-engine/evaluator.ts");
const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");

const ROOT = process.cwd();
const PROFILE_ROOT = path.join(ROOT, "src/lib/rcap-engine/compiled/profiles");
const EVIDENCE_PATH = path.join(ROOT, "data/expungement-ai/screening-verification-finetune/shard-h.json");
const MANIFEST_PATH = path.join(ROOT, "data/expungement-ai/flow-audit/flow-manifest.json");
const RECONCILIATION_PATH = path.join(ROOT, "data/expungement-ai/flow-audit/FINAL_CANDIDATE_RECONCILIATION.json");

const expected = {
  OH: { file: "OH-ohio.json", routeConsumers: {}, exactPacketFactIds: ["court", "charge", "record_documents", "county_or_filing_location", "case_identifier"], completionAliasIds: [] },
  OK: { file: "OK-oklahoma.json", routeConsumers: {}, exactPacketFactIds: ["disposition_date", "court", "charge", "record_documents", "county_or_filing_location", "case_identifier"], completionAliasIds: ["sentence_completion_date", "financial_obligations"] },
  OR: { file: "OR-oregon.json", routeConsumers: {}, exactPacketFactIds: ["disposition_date", "county", "court", "charge", "record_documents", "case_identifier"], completionAliasIds: ["sentence_completion_date", "financial_obligations"] },
  PA: { file: "PA-pennsylvania.json", routeConsumers: {}, exactPacketFactIds: [], completionAliasIds: [] },
  RI: { file: "RI-rhode-island.json", routeConsumers: {}, exactPacketFactIds: [], completionAliasIds: [] },
  SC: { file: "SC-south-carolina.json", routeConsumers: {}, exactPacketFactIds: ["criminal_history", "disposition_date", "court", "charge", "record_documents", "county_or_filing_location", "case_identifier"], completionAliasIds: ["sentence_completion_date", "financial_obligations"] },
  SD: { file: "SD-south-dakota.json", routeConsumers: {}, exactPacketFactIds: ["disposition_date", "court", "charge", "record_documents", "county_or_filing_location", "case_identifier"], completionAliasIds: ["sentence_completion_date", "financial_obligations"] },
  TN: { file: "TN-tennessee.json", routeConsumers: {}, exactPacketFactIds: ["criminal_history", "disposition_date", "court", "charge", "record_documents", "county_or_filing_location", "case_identifier"], completionAliasIds: ["sentence_completion_date", "financial_obligations"] }
};

const legalSurfaceHashes = {
  // Rehashed for Batch C: Ohio carried no route contract of any kind before R.C. 2953.321.
  OH: "985ba7ba9b3abba0a95912c5e78c02380d4f5fd846b2a46b2463cdfe96bdc088",
  OK: "1dbd794fe15353d78b0608205ad17a121045a2bdcf594b9c31388af8be01d7d3",
  OR: "64d229122d770035509af18ca2a18b8650ba5f3ff6cbe9dd4a00be0c74171491",
  PA: "d5381a433907fe0b13b12d3272d8ad58d1568a06713ff457fae1948e302a01d8",
  RI: "57bef89bba43d4402ac31570310c34bbf94cbce67adb381672d60997a177b8c2",
  // Rehashed for Batch A: § 17-22-150 became solicitor-administered guidance.
  SC: "c175898cccb446d3b9240e0c0cda0a5c4324e5c7bec5666f0409a108b0dbdfe5",
  SD: "87f16c212694416bdb0f7c04788fc2b6447e406ec9c23ec9e014998989bf0163",
  TN: "6596366cfe2b0b5c243c91d24f9146658b435fabb29da5bb086daaaa2ecd34cd"
};

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const equal = (actual, wanted, message) => { try { assert.deepEqual(actual, wanted); } catch { failures.push(`${message}: got ${JSON.stringify(actual)}`); } };
const stageOrder = new Map([
  ["record_readiness", 0], ["identity_and_history", 1], ["jurisdiction_and_venue", 2],
  ["eligibility_timing", 3], ["mandatory_exclusions", 4], ["remedy_specific", 5],
  ["case_details", 6], ["packet_information", 7]
]);
const selectPublicQuestionIds = (profile, publicProfile, selectedPathwayLabel = "") => {
  const lifecycle = profile.questionLifecycle;
  const selectedPathway = selectedPathwayLabel ? profile.pathways.find((pathway) => pathway.label === selectedPathwayLabel) : undefined;
  const rows = publicProfile.questions.map((question, sourceIndex) => ({ question, sourceIndex }))
    .filter(({ question }) => !lifecycle.exactPacketFactIds.includes(question.id) && !lifecycle.completionAliasIds.includes(question.id))
    .filter(({ question }) => question.lifecyclePhase?.startsWith("prepay_") ?? !["record_readiness", "case_details", "packet_information"].includes(question.stage))
    .filter(({ question }) => {
      const consumers = lifecycle.routeConsumers[question.id] ?? [];
      return consumers.length === 0 || Boolean(selectedPathway && consumers.includes(selectedPathway.id));
    })
    .sort((left, right) => (stageOrder.get(left.question.stage) ?? 99) - (stageOrder.get(right.question.stage) ?? 99) || left.sourceIndex - right.sourceIndex);
  return [...new Set(rows.map(({ question }) => question.id))];
};
const selectedQuestionCounts = {};

for (const [state, spec] of Object.entries(expected)) {
  const profile = readJson(path.join(PROFILE_ROOT, spec.file));
  const publicProfile = projectPublicProfile(profile);
  const publicQuestionIds = new Set(publicProfile.questions.map((question) => question.id));
  const rawQuestionById = new Map(profile.questions.map((question) => [question.id, question]));
  const lifecycle = profile.questionLifecycle;
  check(Boolean(lifecycle), `${state}: missing questionLifecycle`);
  if (!lifecycle) continue;
  equal(Object.keys(lifecycle).sort(), ["completionAliasIds", "exactPacketFactIds", "routeConsumers"], `${state}: lifecycle envelope keys changed`);
  equal(lifecycle.routeConsumers, spec.routeConsumers, `${state}: routeConsumers mismatch`);
  equal(lifecycle.exactPacketFactIds, spec.exactPacketFactIds, `${state}: exactPacketFactIds mismatch`);
  equal(lifecycle.completionAliasIds, spec.completionAliasIds, `${state}: completionAliasIds mismatch`);
  const emptyContextIds = new Set(selectPublicQuestionIds(profile, publicProfile));
  const pathwaySelections = new Map(profile.pathways.map((pathway) => [pathway.id, new Set(selectPublicQuestionIds(profile, publicProfile, pathway.label))]));
  selectedQuestionCounts[state] = {
    emptyContext: emptyContextIds.size,
    maxExactRoute: Math.max(emptyContextIds.size, ...[...pathwaySelections.values()].map((ids) => ids.size))
  };
  for (const [questionId, consumers] of Object.entries(lifecycle.routeConsumers)) {
    check(!emptyContextIds.has(questionId), `${state}:${questionId}: route fact leaked into empty-context screening`);
    for (const pathwayId of consumers) check(pathwaySelections.get(pathwayId)?.has(questionId), `${state}:${questionId}: missing from exact pathway ${pathwayId}`);
    for (const [pathwayId, selectedIds] of pathwaySelections) if (!consumers.includes(pathwayId)) check(!selectedIds.has(questionId), `${state}:${questionId}: leaked into unrelated pathway ${pathwayId}`);
  }
  for (const questionId of lifecycle.exactPacketFactIds) {
    const question = rawQuestionById.get(questionId);
    check(Boolean(question), `${state}:${questionId}: exact packet fact is not a compiled question`);
    check(question?.stage === "case_details" || question?.stage === "record_readiness" || question?.type === "date_or_unknown", `${state}:${questionId}: exact packet fact lacks structural/date support`);
    check(!emptyContextIds.has(questionId) && [...pathwaySelections.values()].every((ids) => !ids.has(questionId)), `${state}:${questionId}: exact packet fact leaked into screening`);
  }
  for (const questionId of lifecycle.completionAliasIds) {
    check(rawQuestionById.has(questionId), `${state}:${questionId}: completion alias is not a compiled question`);
    check(publicQuestionIds.has("court_requirements_completed"), `${state}:${questionId}: completion alias lacks canonical completion authority`);
    check(["sentence_completion_date", "financial_obligations"].includes(questionId), `${state}:${questionId}: completion alias is not approved`);
    check(!emptyContextIds.has(questionId) && [...pathwaySelections.values()].every((ids) => !ids.has(questionId)), `${state}:${questionId}: completion alias leaked into screening`);
  }
  if (["PA", "RI"].includes(state)) {
    equal(lifecycle, { routeConsumers: {}, exactPacketFactIds: [], completionAliasIds: [] }, `${state}: seven-question free check gained route details`);
  }
  const legalSurface = structuredClone(profile);
  delete legalSurface.questionLifecycle;
  const hash = crypto.createHash("sha256").update(JSON.stringify(legalSurface)).digest("hex");
  check(hash === legalSurfaceHashes[state], `${state}: legal/route/packet profile surface changed (${hash})`);
}

const manifest = readJson(MANIFEST_PATH);
const reconciliation = readJson(RECONCILIATION_PATH);
const stateSet = new Set(Object.keys(expected));
const flows = manifest.flows.filter((flow) => stateSet.has(flow.jurisdiction));
const reconciliationRows = reconciliation.rows.filter((row) => stateSet.has(row.jurisdiction));
check(flows.length === 67, `Lane H flow count changed: expected 67, got ${flows.length}`);
check(reconciliationRows.filter((row) => row.browserRequired).length * 2 === 108, "Lane H browser witness count changed from 108");

for (const flow of flows) {
  const profile = getProfileByJurisdiction(flow.jurisdiction);
  const result = evaluateScreening({ jurisdiction: flow.jurisdiction, profileVersion: profile.profileVersion, matterId: `shard-h-${flow.flowId}`, answers: flow.fixture.answers });
  check(result.pathwayId === flow.remedy.pathwayId, `${flow.flowId}: pathway ${result.pathwayId} != ${flow.remedy.pathwayId}`);
  check(result.resultCode === flow.terminalOutcome.effectiveTerminal, `${flow.flowId}: terminal ${result.resultCode} != ${flow.terminalOutcome.effectiveTerminal}`);
  check(result.paymentAllowed === (flow.paymentMode === "dtc_paid"), `${flow.flowId}: payment witness changed`);
  if (["packet_ready", "packet_ready_with_caution"].includes(result.resultCode)) check(result.packetPlan?.pathwayId === flow.remedy.pathwayId, `${flow.flowId}: packet witness missing or changed`);
}

const representativeSelectedFlowIds = ["EXPAI-OH-268c3ff28c", "EXPAI-PA-28d0faee89", "EXPAI-RI-0122f25b76"];
for (const flowId of representativeSelectedFlowIds) {
  const flow = flows.find((candidate) => candidate.flowId === flowId);
  check(Boolean(flow), `${flowId}: representative selected-answer flow is missing`);
  if (!flow) continue;
  const profile = getProfileByJurisdiction(flow.jurisdiction);
  const selectedIds = new Set(selectPublicQuestionIds(profile, projectPublicProfile(profile), flow.fixture.answers.possible_pathway_context));
  const selectedAnswers = Object.fromEntries(Object.entries(flow.fixture.answers).filter(([questionId]) => selectedIds.has(questionId)));
  const result = evaluateScreening({ jurisdiction: flow.jurisdiction, profileVersion: profile.profileVersion, matterId: `shard-h-selected-${flowId}`, answers: selectedAnswers });
  check(result.pathwayId === flow.remedy.pathwayId, `${flowId}: selected-answer pathway changed`);
  check(result.resultCode === flow.terminalOutcome.effectiveTerminal, `${flowId}: selected-answer terminal changed`);
  check(result.paymentAllowed === (flow.paymentMode === "dtc_paid"), `${flowId}: selected-answer payment changed`);
}

if (!fs.existsSync(EVIDENCE_PATH)) {
  failures.push("Lane H evidence/status file is missing");
} else {
  const evidence = readJson(EVIDENCE_PATH);
  equal(evidence.states, Object.keys(expected), "evidence state order changed");
  equal(evidence.before, { flows: 67, browserWitnessVariants: 108, freeQuestions: 85, completionOverlaps: 10, genericSpecialRouteAsks: 14, rawPacketFields: 32 }, "evidence baseline changed");
  equal(evidence.after, { flows: 67, browserWitnessVariants: 108, freeQuestions: { emptyContext: 75, maxExactRoute: 75 }, routeConsumerFacts: 0, routeConsumerEdges: 0, exactPacketFactIds: 37, completionAliasIds: 10 }, "evidence result counts changed");
  equal(evidence.selectedQuestionCounts, selectedQuestionCounts, "evidence selected-question counts changed");
  equal(evidence.representativeSelectedFlowIds, representativeSelectedFlowIds, "evidence selected-answer witnesses changed");
  equal(evidence.shortFreeChecksPreserved, { PA: 7, RI: 7 }, "PA/RI short-check evidence changed");
}

if (failures.length) {
  console.error(`Lane H screening-verification verifier failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Lane H screening-verification verifier passed.");
console.log("8 states, 67 terminal/payment flow witnesses, 108 browser variants, 75 empty-context / 75 max-route questions, 37 exact packet facts, 0 route-consumer edges, 10 completion aliases.");
