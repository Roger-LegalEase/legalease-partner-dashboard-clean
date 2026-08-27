#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";

process.env.RCAP_EVALUATOR_TODAY = "2026-08-25";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { evaluateExpungementAiMatter } = await import("../src/lib/rcap-engine/expungement-ai-adapter.ts");
const { evaluateScreening } = await import("../src/lib/rcap-engine/evaluator.ts");
const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");
const { ROUTE_ESCALATION_FACT_IDS } = await import("../src/lib/rcap-engine/route-fact-relevance.ts");

const ROOT = process.cwd();
const PROFILE_ROOT = path.join(ROOT, "src/lib/rcap-engine/compiled/profiles");
const EVIDENCE_PATH = path.join(ROOT, "data/expungement-ai/screening-verification-finetune/shard-d.json");
const MANIFEST_PATH = path.join(ROOT, "data/expungement-ai/flow-audit/flow-manifest.json");
const RECONCILIATION_PATH = path.join(ROOT, "data/expungement-ai/flow-audit/FINAL_CANDIDATE_RECONCILIATION.json");

const expected = {
  AL: {
    file: "AL-alabama.json",
    routeConsumers: {},
    exactPacketFactIds: ["disposition_date", "court", "charge", "record_documents", "county_or_filing_location", "case_identifier"],
    completionAliasIds: ["sentence_completion_date", "financial_obligations"]
  },
  AK: {
    file: "AK-alaska.json",
    routeConsumers: {},
    exactPacketFactIds: ["criminal_history", "disposition_date", "court", "charge", "record_documents", "county_or_filing_location", "case_identifier"],
    completionAliasIds: ["sentence_completion_date"]
  },
  AZ: {
    file: "AZ-arizona.json",
    routeConsumers: {},
    exactPacketFactIds: ["criminal_history", "disposition_date", "court", "charge", "record_documents", "county_or_filing_location", "case_identifier"],
    completionAliasIds: ["financial_obligations"]
  },
  AR: {
    file: "AR-arkansas.json",
    routeConsumers: {},
    exactPacketFactIds: ["disposition_date", "court", "charge", "record_documents", "county_or_filing_location", "case_identifier"],
    completionAliasIds: ["sentence_completion_date", "financial_obligations"]
  },
  CA: {
    file: "CA-california.json",
    routeConsumers: {
      ca_prop64_branch: ["prop-64-currently-serving-petition-11361-8", "prop-64-completed-sentence-application-11361-8"],
      ca_prop64_qualifying_marijuana_offense: ["prop-64-currently-serving-petition-11361-8", "prop-64-completed-sentence-application-11361-8"],
      ca_prop64_lesser_or_no_offense: ["prop-64-currently-serving-petition-11361-8", "prop-64-completed-sentence-application-11361-8"],
      ca_prop64_relief_requested: ["prop-64-currently-serving-petition-11361-8", "prop-64-completed-sentence-application-11361-8"]
    },
    exactPacketFactIds: ["criminal_history", "county", "court", "charge", "record_documents", "case_identifier"],
    completionAliasIds: []
  },
  CO: {
    file: "CO-colorado.json",
    routeConsumers: {},
    exactPacketFactIds: ["court", "charge", "record_documents", "county_or_filing_location", "case_identifier"],
    completionAliasIds: []
  },
  CT: {
    file: "CT-connecticut.json",
    routeConsumers: {},
    exactPacketFactIds: ["court", "charge", "record_documents", "county_or_filing_location", "case_identifier"],
    completionAliasIds: []
  },
  DE: {
    file: "DE-delaware.json",
    routeConsumers: {},
    exactPacketFactIds: ["court", "charge", "record_documents", "county_or_filing_location", "case_identifier"],
    completionAliasIds: []
  },
  DC: {
    file: "DC-district-of-columbia.json",
    routeConsumers: {
      actual_innocence_basis: ["dc_actual_innocence_expungement_16_803", "dc_motion_seal_felony_conviction_8yr_16_806"],
      dc_offense_severity_group: ["dc_actual_innocence_expungement_16_803", "dc_motion_seal_felony_conviction_8yr_16_806"]
    },
    exactPacketFactIds: ["disposition_date", "court", "charge", "record_documents", "county_or_filing_location", "case_identifier"],
    completionAliasIds: ["sentence_completion_date"]
  }
};

const legalSurfaceHashes = {
  AL: "c2a2410600e944bb92c1d5a1671971597a0b517c2545622f402be53970b16ea0",
  AK: "79aebb8a71cfe3e712a065473cca501f1d605954071bf9e1ba2ed47ba6c5a897",
  AZ: "83959449fac7969c0996ab0649833a04bce971fb5e7fa1dbfd48ce83b002cab9",
  AR: "fe8d24a05e45534af89042ab55a676bca93385fadb6ca3cc8d4a80f4936b7438",
  CA: "26e6639ff62d65ee2d67f601a209c01c068b8d0efb2a2bc3851596826512f970",
  CO: "be5125d07676942e70af4342ebcabf4b3c622b3ebb0646aa9cf218a7e2fc4795",
  CT: "9852996d489bd96ab55603ae3e5ad2f9d7eb0c5c5698944a83c92c475b550504",
  DE: "3730e3758b6bb6f10e95d71c5b30d7abf99ae4c77a6a45c13b1dabb46e07397f",
  DC: "88625dc044ba597b00d20a35bf155c6843777c4a739a34d4f488ce88524724a3"
};

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const equal = (actual, wanted, message) => {
  try { assert.deepEqual(actual, wanted); } catch { failures.push(`${message}: got ${JSON.stringify(actual)}`); }
};

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
    check(question?.stage === "case_details" || question?.stage === "record_readiness" || question?.type === "date_or_unknown", `${state}:${questionId}: exact packet fact lacks structural packet/date support`);
  }
  for (const questionId of lifecycle.completionAliasIds) {
    check(rawQuestionById.has(questionId), `${state}:${questionId}: completion alias is not a compiled question`);
    check(["sentence_completion_date", "financial_obligations"].includes(questionId), `${state}:${questionId}: completion alias is not approved`);
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
check(flows.length === 47, `Lane D flow count changed: expected 47, got ${flows.length}`);
check(reconciliationRows.filter((row) => row.browserRequired).length * 2 === 88, "Lane D browser witness count changed from 88");

for (const flow of flows) {
  const profile = getProfileByJurisdiction(flow.jurisdiction);
  const evaluate = flow.flowId === "EXPAI-CO-8c67627ae3" ? evaluateExpungementAiMatter : evaluateScreening;
  const result = evaluate({
    jurisdiction: flow.jurisdiction,
    profileVersion: profile.profileVersion,
    matterId: `shard-d-${flow.flowId}`,
    answers: flow.fixture.answers
  });
  check(result.pathwayId === flow.remedy.pathwayId, `${flow.flowId}: pathway ${result.pathwayId} != ${flow.remedy.pathwayId}`);
  check(result.resultCode === flow.terminalOutcome.effectiveTerminal, `${flow.flowId}: terminal ${result.resultCode} != ${flow.terminalOutcome.effectiveTerminal}`);
  check(result.paymentAllowed === (flow.paymentMode === "dtc_paid"), `${flow.flowId}: payment witness changed`);
  if (["packet_ready", "packet_ready_with_caution"].includes(result.resultCode)) {
    check(result.packetPlan?.pathwayId === flow.remedy.pathwayId, `${flow.flowId}: packet witness missing or changed`);
  }
}

if (!fs.existsSync(EVIDENCE_PATH)) {
  failures.push("Lane D evidence/status file is missing");
} else {
  const evidence = readJson(EVIDENCE_PATH);
  equal(evidence.states, Object.keys(expected), "evidence state order changed");
  equal(evidence.before, { flows: 47, browserWitnessVariants: 88, freeQuestions: 99, completionOverlaps: 7, specialRouteQuestions: 12, rawPacketFields: 48 }, "evidence baseline changed");
  equal(evidence.after, { flows: 47, browserWitnessVariants: 88, freeQuestions: 99, routeConsumerFacts: 6, routeConsumerEdges: 12, exactPacketFactIds: 53, completionAliasIds: 7 }, "evidence result counts changed");
}

if (failures.length) {
  console.error(`Lane D screening-verification verifier failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Lane D screening-verification verifier passed.");
console.log("9 states, 47 terminal/payment flow witnesses, 88 browser variants, 53 exact packet facts, 12 route-consumer edges, 7 completion aliases.");
