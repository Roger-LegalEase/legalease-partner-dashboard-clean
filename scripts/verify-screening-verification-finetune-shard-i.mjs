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
const { ROUTE_ESCALATION_FACT_IDS } = await import("../src/lib/rcap-engine/route-fact-relevance.ts");

const ROOT = process.cwd();
const PROFILE_ROOT = path.join(ROOT, "src/lib/rcap-engine/compiled/profiles");
const EVIDENCE_PATH = path.join(ROOT, "data/expungement-ai/screening-verification-finetune/shard-i.json");
const MANIFEST_PATH = path.join(ROOT, "data/expungement-ai/flow-audit/flow-manifest.json");
const RECONCILIATION_PATH = path.join(ROOT, "data/expungement-ai/flow-audit/FINAL_CANDIDATE_RECONCILIATION.json");

const expected = {
  TX: { file: "TX-texas.json", routeConsumers: {}, exactPacketFactIds: ["disposition_date", "arrest_date", "court", "charge", "record_documents", "county_or_filing_location", "case_identifier"], completionAliasIds: ["financial_obligations"] },
  UT: { file: "UT-utah.json", routeConsumers: {}, exactPacketFactIds: [], completionAliasIds: [] },
  VT: { file: "VT-vermont.json", routeConsumers: {}, exactPacketFactIds: ["disposition_date", "court", "charge", "record_documents", "county_or_filing_location", "case_identifier"], completionAliasIds: ["sentence_completion_date", "financial_obligations"] },
  VA: { file: "VA-virginia.json", routeConsumers: {}, exactPacketFactIds: ["disposition_date", "court", "charge", "record_documents", "county_or_filing_location", "case_identifier"], completionAliasIds: [] },
  WA: { file: "WA-washington.json", routeConsumers: {}, exactPacketFactIds: ["court", "charge", "record_documents", "county_or_filing_location", "case_identifier"], completionAliasIds: [] },
  WV: { file: "WV-west-virginia.json", routeConsumers: {}, exactPacketFactIds: ["disposition_date", "arrest_date", "county", "court", "case_number", "charge", "record_documents"], completionAliasIds: ["sentence_completion_date", "financial_obligations"] },
  WI: {
    file: "WI-wisconsin.json",
    routeConsumers: {
      wi_expungement_ordered_at_sentencing: ["adult-conviction-expungement-under-wis-stat-973-015"],
      wi_no_probation_jail_prison: ["adult-conviction-expungement-under-wis-stat-973-015"]
    },
    exactPacketFactIds: ["criminal_history", "disposition_date", "court", "charge", "record_documents", "county_or_filing_location", "case_identifier"],
    completionAliasIds: ["sentence_completion_date"]
  },
  WY: { file: "WY-wyoming.json", routeConsumers: {}, exactPacketFactIds: ["disposition_date", "court", "charge", "record_documents", "county_or_filing_location", "case_identifier"], completionAliasIds: ["sentence_completion_date", "financial_obligations"] }
};

const legalSurfaceHashes = {
  TX: "e2d2f62a2b22caf056af647baa0d02126a9a38601c81aa5bc4c65d6ec130caf8",
  UT: "44f48d4c835ef99be0eb77d790dcfd709fff5b3c017d4fa86db31cf75b968963",
  VT: "cb1d2f5afadcd70bfef34e3d5423b2958ade24691eae60abf87d3cb08bd7b3cc",
  VA: "36d7c2dc9ca1e237dae1e3d391051fff3f363fb1722032d4cea4c0a1fd7fa771",
  WA: "bdd98fdb5f06d1cd2b92a4d72fe93be7a82ca1e1abbc75bf950b908b2ff7cad8",
  // Rehashed for Batch C: four West Virginia routes gained their first contracts.
  WV: "cee7fcd4a6ee3c73984e844afcbd9becfc5922fca6a4c458a27b24af5c4bb7c6",
  WI: "3a4ebcdaaa8347aae86c2c9701b9cd0a22062404c71f17619f31c9c07d51c2af",
  WY: "450d20d246814def7bea66b56d1da73a62f34d923ac37fa2cdd914532cfb93a2"
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
  const pathwayIds = new Set(profile.pathways.map((pathway) => pathway.id));
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
    check(publicQuestionIds.has(questionId), `${state}:${questionId}: route fact is not a public profile question`);
    check(!emptyContextIds.has(questionId), `${state}:${questionId}: route fact leaked into empty-context screening`);
    for (const pathwayId of consumers) {
      check(pathwayIds.has(pathwayId), `${state}:${questionId}: unknown pathway ${pathwayId}`);
      check((ROUTE_ESCALATION_FACT_IDS[`${state}:${pathwayId}`] ?? []).includes(questionId), `${state}:${questionId}: ${pathwayId} lacks approved route-escalation support`);
      check(pathwaySelections.get(pathwayId)?.has(questionId), `${state}:${questionId}: missing from exact pathway ${pathwayId}`);
    }
    for (const [pathwayId, selectedIds] of pathwaySelections) {
      if (!consumers.includes(pathwayId)) check(!selectedIds.has(questionId), `${state}:${questionId}: leaked into unrelated pathway ${pathwayId}`);
    }
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
  if (state === "UT") equal(lifecycle, { routeConsumers: {}, exactPacketFactIds: [], completionAliasIds: [] }, "UT: six-question free check gained route details");
// The legal/route/packet surface, minus two fields it is not about.
//
// questionLifecycle was already excluded. lawrenceRatification is excluded now
// for the same kind of reason and a stronger one: it is listed in
// INTERNAL_LEAK_MARKERS, so it never reaches the public projection and cannot
// change a question, a route selection or a packet fact — and since it became a
// generated projection of the ratification registry, leaving it inside this pin
// meant every counsel decision churned fifty-one hashes that this verifier is
// not about. Ratification changes are caught where they belong, by
// scripts/generate-route-ratification-projections.mjs --check.
  const legalSurface = structuredClone(profile);
  delete legalSurface.questionLifecycle;
  for (const pathway of legalSurface.pathways ?? []) delete pathway.lawrenceRatification;
  const hash = crypto.createHash("sha256").update(JSON.stringify(legalSurface)).digest("hex");
  check(hash === legalSurfaceHashes[state], `${state}: legal/route/packet profile surface changed (${hash})`);
}

const manifest = readJson(MANIFEST_PATH);
const reconciliation = readJson(RECONCILIATION_PATH);
const stateSet = new Set(Object.keys(expected));
const flows = manifest.flows.filter((flow) => stateSet.has(flow.jurisdiction));
const reconciliationRows = reconciliation.rows.filter((row) => stateSet.has(row.jurisdiction));
check(flows.length === 58, `Lane I flow count changed: expected 58, got ${flows.length}`);
check(reconciliationRows.filter((row) => row.browserRequired).length * 2 === 98, "Lane I browser witness count changed from 98");
for (const flow of flows) {
  const profile = getProfileByJurisdiction(flow.jurisdiction);
  const result = evaluateScreening({ jurisdiction: flow.jurisdiction, profileVersion: profile.profileVersion, matterId: `shard-i-${flow.flowId}`, answers: flow.fixture.answers });
  check(result.pathwayId === flow.remedy.pathwayId, `${flow.flowId}: pathway ${result.pathwayId} != ${flow.remedy.pathwayId}`);
  check(result.resultCode === flow.terminalOutcome.effectiveTerminal, `${flow.flowId}: terminal ${result.resultCode} != ${flow.terminalOutcome.effectiveTerminal}`);
  check(result.paymentAllowed === (flow.paymentMode === "dtc_paid"), `${flow.flowId}: payment witness changed`);
  if (["packet_ready", "packet_ready_with_caution"].includes(result.resultCode)) check(result.packetPlan?.pathwayId === flow.remedy.pathwayId, `${flow.flowId}: packet witness missing or changed`);
}

const representativeSelectedFlowIds = ["EXPAI-UT-124f0e6624", "EXPAI-VA-121670834f", "EXPAI-WA-24a861f8e0"];
for (const flowId of representativeSelectedFlowIds) {
  const flow = flows.find((candidate) => candidate.flowId === flowId);
  check(Boolean(flow), `${flowId}: representative selected-answer flow is missing`);
  if (!flow) continue;
  const profile = getProfileByJurisdiction(flow.jurisdiction);
  const selectedIds = new Set(selectPublicQuestionIds(profile, projectPublicProfile(profile), flow.fixture.answers.possible_pathway_context));
  const selectedAnswers = Object.fromEntries(Object.entries(flow.fixture.answers).filter(([questionId]) => selectedIds.has(questionId)));
  const result = evaluateScreening({ jurisdiction: flow.jurisdiction, profileVersion: profile.profileVersion, matterId: `shard-i-selected-${flowId}`, answers: selectedAnswers });
  check(result.pathwayId === flow.remedy.pathwayId, `${flowId}: selected-answer pathway changed`);
  check(result.resultCode === flow.terminalOutcome.effectiveTerminal, `${flowId}: selected-answer terminal changed`);
  check(result.paymentAllowed === (flow.paymentMode === "dtc_paid"), `${flowId}: selected-answer payment changed`);
}

if (!fs.existsSync(EVIDENCE_PATH)) failures.push("Lane I evidence/status file is missing");
else {
  const evidence = readJson(EVIDENCE_PATH);
  equal(evidence.states, Object.keys(expected), "evidence state order changed");
  equal(evidence.before, { flows: 58, browserWitnessVariants: 98, freeQuestions: 93, completionOverlaps: 8, genericSpecialRouteAsks: 21, rawPacketFields: 38 }, "evidence baseline changed");
  equal(evidence.after, { flows: 58, browserWitnessVariants: 98, freeQuestions: { emptyContext: 83, maxExactRoute: 85 }, routeConsumerFacts: 2, routeConsumerEdges: 2, exactPacketFactIds: 44, completionAliasIds: 8 }, "evidence result counts changed");
  equal(evidence.selectedQuestionCounts, selectedQuestionCounts, "evidence selected-question counts changed");
  equal(evidence.representativeSelectedFlowIds, representativeSelectedFlowIds, "evidence selected-answer witnesses changed");
  check(evidence.utFreeCheckQuestions === 6, "UT six-question evidence changed");
}

if (failures.length) {
  console.error(`Lane I screening-verification verifier failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Lane I screening-verification verifier passed.");
console.log("8 states, 58 terminal/payment flow witnesses, 98 browser variants, 83 empty-context / 85 max-route questions, 44 exact packet facts, 2 route-consumer edges, 8 completion aliases.");
