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
const EVIDENCE_PATH = path.join(ROOT, "data/expungement-ai/screening-verification-finetune/shard-e.json");
const MANIFEST_PATH = path.join(ROOT, "data/expungement-ai/flow-audit/flow-manifest.json");
const RECONCILIATION_PATH = path.join(ROOT, "data/expungement-ai/flow-audit/FINAL_CANDIDATE_RECONCILIATION.json");

const expected = {
  FL: {
    file: "FL-florida.json",
    routeConsumers: {},
    exactPacketFactIds: ["criminal_history", "disposition_date", "county", "court", "charge", "record_documents"],
    completionAliasIds: ["sentence_completion_date"]
  },
  GA: {
    file: "GA-georgia.json",
    routeConsumers: {},
    exactPacketFactIds: ["criminal_history", "disposition_date", "arrest_date", "county", "court", "charge", "record_documents", "case_identifier"],
    completionAliasIds: ["sentence_completion_date"]
  },
  HI: {
    file: "HI-hawaii.json",
    routeConsumers: {
      hi_court_order_confirmed: ["nonconviction-arrest-expungement"]
    },
    exactPacketFactIds: ["court", "charge", "record_documents", "county_or_filing_location", "case_identifier"],
    completionAliasIds: []
  },
  ID: {
    file: "ID-idaho.json",
    routeConsumers: {},
    exactPacketFactIds: ["disposition_date", "county", "court", "charge", "record_documents", "case_identifier"],
    completionAliasIds: ["financial_obligations"]
  },
  IL: {
    file: "IL-illinois.json",
    routeConsumers: {},
    exactPacketFactIds: ["disposition_date", "court", "charge", "record_documents", "county_or_filing_location", "case_identifier"],
    completionAliasIds: ["sentence_completion_date"]
  },
  IN: {
    file: "IN-indiana.json",
    routeConsumers: {
      in_prosecutor_consent_confirmed: ["conviction-expungement-with-sealed-confidential-access"],
      eligible_conviction_class: ["conviction-expungement-with-sealed-confidential-access"]
    },
    exactPacketFactIds: ["county", "court", "case_number", "charge", "record_documents"],
    completionAliasIds: []
  },
  IA: {
    file: "IA-iowa.json",
    routeConsumers: {},
    exactPacketFactIds: ["county", "court", "charge", "record_documents", "case_identifier"],
    completionAliasIds: []
  },
  KS: {
    file: "KS-kansas.json",
    routeConsumers: {},
    exactPacketFactIds: ["county", "court", "charge", "record_documents", "case_identifier"],
    completionAliasIds: ["financial_obligations"]
  },
  KY: {
    file: "KY-kentucky.json",
    routeConsumers: {},
    exactPacketFactIds: ["county", "court", "charge", "record_documents", "case_identifier"],
    completionAliasIds: []
  }
};

const legalSurfaceHashes = {
  FL: "e8aac465e89dd9f533db3b0a3a57c25744531235d877308cc667ecd68cb0f992",
  GA: "15ac61e0c0b0794d28de8a2009b3998550716f1f67df90a319de5e1803e33653",
  HI: "6e75e435cd813c392c3f9af38e588786a69ae48bd5952a1b2c762f111c547b2b",
  ID: "0e3dbbd28387e59aa55f935afaa4c57ac52745e88ec4b2dc603fe7952b1826e7",
  IL: "06080b4cdabce9a389aafd64f07a642ceddb32659ae16b23c24c4f3499ec4444",
  IN: "a9c214fc604e1d57230813a783c87a36bbab2fae9a2691e589494bdf33b1040b",
  IA: "98ef98accc8f4939a9e322a8d1fb5d6849c61ea8505a83069a661993101ad145",
  KS: "974f662fdd9a39591cea7d17cf408bc77f71f3bab756446687ed477557e0b2e8",
  KY: "588fce03261c3abb340aa8bb92f6a9c5db27b590c6cfcce8e46fbd3a1fdb5895"
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
    check(publicQuestionIds.has("court_requirements_completed"), `${state}:${questionId}: completion alias lacks canonical completion authority`);
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
check(flows.length === 55, `Lane E flow count changed: expected 55, got ${flows.length}`);
check(reconciliationRows.filter((row) => row.browserRequired).length * 2 === 104, "Lane E browser witness count changed from 104");

for (const flow of flows) {
  const profile = getProfileByJurisdiction(flow.jurisdiction);
  const result = evaluateScreening({
    jurisdiction: flow.jurisdiction,
    profileVersion: profile.profileVersion,
    matterId: `shard-e-${flow.flowId}`,
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
  failures.push("Lane E evidence/status file is missing");
} else {
  const evidence = readJson(EVIDENCE_PATH);
  equal(evidence.states, Object.keys(expected), "evidence state order changed");
  equal(evidence.before, { flows: 55, browserWitnessVariants: 104, freeQuestions: 89, completionOverlaps: 5, genericSpecialRouteAsks: 16, rawPacketFields: 47 }, "evidence baseline changed");
  equal(evidence.after, { flows: 55, browserWitnessVariants: 104, freeQuestions: 89, routeConsumerFacts: 3, routeConsumerEdges: 3, exactPacketFactIds: 51, completionAliasIds: 5 }, "evidence result counts changed");
}

if (failures.length) {
  console.error(`Lane E screening-verification verifier failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Lane E screening-verification verifier passed.");
console.log("9 states, 55 terminal/payment flow witnesses, 104 browser variants, 51 exact packet facts, 3 route-consumer edges, 5 completion aliases.");
