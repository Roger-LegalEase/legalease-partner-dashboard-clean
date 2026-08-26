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
  TX: "b22917254ba43ffefbcc245dcddaf6c2da8ec06e4ed3bc4f19cb2337d11112a5",
  UT: "7222b2b7cf971bf2bbeaffdfabac163b45c911498b6f345b82e610c55a387471",
  VT: "0cdb110eead423dbcccdd7662bb21732873b1145aa939566be3ece556806b37e",
  VA: "c612528beb78c5bf1ea30202cdc0baac615bcf6a6405a6d0ed21b5005c9418dd",
  WA: "728f296a3eb5dbb70c891456468dda178d7022984da41f83b2c15897a91e667a",
  WV: "2c929797e861c783f1a72033a8054e3715c4fd4e95841b2114872b21c3d0b0f6",
  WI: "045f423673a30cc74aea8c891ec501a9c58e16bfc7e714a82571da68c478d452",
  WY: "6b134f4f17ad00409695c2b3c3cec94b94e163a26cafe668c8cf3f6def1efdf4"
};

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const equal = (actual, wanted, message) => { try { assert.deepEqual(actual, wanted); } catch { failures.push(`${message}: got ${JSON.stringify(actual)}`); } };

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
  for (const [questionId, consumers] of Object.entries(lifecycle.routeConsumers)) {
    check(publicQuestionIds.has(questionId), `${state}:${questionId}: route fact is not a public profile question`);
    for (const pathwayId of consumers) {
      check(pathwayIds.has(pathwayId), `${state}:${questionId}: unknown pathway ${pathwayId}`);
      check((ROUTE_ESCALATION_FACT_IDS[`${state}:${pathwayId}`] ?? []).includes(questionId), `${state}:${questionId}: ${pathwayId} lacks approved route-escalation support`);
    }
  }
  for (const questionId of lifecycle.exactPacketFactIds) {
    const question = rawQuestionById.get(questionId);
    check(Boolean(question), `${state}:${questionId}: exact packet fact is not a compiled question`);
    check(question?.stage === "case_details" || question?.stage === "record_readiness" || question?.type === "date_or_unknown", `${state}:${questionId}: exact packet fact lacks structural/date support`);
  }
  for (const questionId of lifecycle.completionAliasIds) {
    check(rawQuestionById.has(questionId), `${state}:${questionId}: completion alias is not a compiled question`);
    check(publicQuestionIds.has("court_requirements_completed"), `${state}:${questionId}: completion alias lacks canonical completion authority`);
    check(["sentence_completion_date", "financial_obligations"].includes(questionId), `${state}:${questionId}: completion alias is not approved`);
  }
  if (state === "UT") equal(lifecycle, { routeConsumers: {}, exactPacketFactIds: [], completionAliasIds: [] }, "UT: six-question free check gained route details");
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

if (!fs.existsSync(EVIDENCE_PATH)) failures.push("Lane I evidence/status file is missing");
else {
  const evidence = readJson(EVIDENCE_PATH);
  equal(evidence.states, Object.keys(expected), "evidence state order changed");
  equal(evidence.before, { flows: 58, browserWitnessVariants: 98, freeQuestions: 93, completionOverlaps: 8, genericSpecialRouteAsks: 21, rawPacketFields: 38 }, "evidence baseline changed");
  equal(evidence.after, { flows: 58, browserWitnessVariants: 98, freeQuestions: 93, routeConsumerFacts: 2, routeConsumerEdges: 2, exactPacketFactIds: 44, completionAliasIds: 8 }, "evidence result counts changed");
  check(evidence.utFreeCheckQuestions === 6, "UT six-question evidence changed");
}

if (failures.length) {
  console.error(`Lane I screening-verification verifier failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Lane I screening-verification verifier passed.");
console.log("8 states, 58 terminal/payment flow witnesses, 98 browser variants, 44 exact packet facts, 2 route-consumer edges, 8 completion aliases.");
