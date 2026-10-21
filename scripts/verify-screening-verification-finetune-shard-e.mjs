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
const { selectScreeningQuestionIds } = await import("../src/lib/rcap-engine/screening-question-selection.ts");
const { missingRequiredInputs } = await import("../src/lib/expungement-ai/packet-information.ts");

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
      hi_court_order_confirmed: ["first-time-drug-conviction", "dui-under-21-conviction"]
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
      in_prosecutor_consent_confirmed: ["conviction-expungement-with-sealed-confidential-access"]
    },
    exactPacketFactIds: ["county", "court", "case_number", "charge", "record_documents", "eligible_conviction_class"],
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
  FL: "cac483b9a141b0afd5f2a7fbdd58c34390ed6b0f7d2c79775e612e3a79fefb08",
  GA: "06c54e85636b1aac32652da2d48ef54ca68712199b1141fc83e1a491a760e676",
  HI: "6e75e435cd813c392c3f9af38e588786a69ae48bd5952a1b2c762f111c547b2b",
  ID: "2cbbc09b6dd4b8233ed385ade0926fc105142485b801e9d11254de3df42d0b5b",
  IL: "e6ef09bc6dd2b2be5d4dcee9385e2574974c67982d87367a31445ede568ae70e",
  IN: "9348b47f1ae91d70e56deede2c54b1b04aace4ae7430116de03a11f1ff4f6fb8",
  IA: "d774f41f718f8f28ca2ab1f02b7b87a65eda75d42a247f1dda82f1d776717d2b",
  KS: "ac81294787c28258926bccb04da50205666a1e1ed1da435d2cb3e826ea42e5a8",
  KY: "2e24e1c1394f28ae33d53c94ee8540b3ebad9acfaeb262914112d9819fe9e60e"
};

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const equal = (actual, wanted, message) => {
  try { assert.deepEqual(actual, wanted); } catch { failures.push(`${message}: got ${JSON.stringify(actual)}`); }
};
let emptyContextFreeQuestions = 0;
let maxExactRouteFreeQuestions = 0;

equal(
  ROUTE_ESCALATION_FACT_IDS["HI:nonconviction-arrest-expungement"],
  ["case_outcome"],
  "HI nonconviction route fact set changed"
);
equal(
  ROUTE_ESCALATION_FACT_IDS["HI:first-time-drug-conviction"],
  ["hi_court_order_confirmed"],
  "HI first-time drug conviction route fact set changed"
);
equal(
  ROUTE_ESCALATION_FACT_IDS["HI:dui-under-21-conviction"],
  ["hi_court_order_confirmed"],
  "HI under-21 DUI route fact set changed"
);
equal(
  ROUTE_ESCALATION_FACT_IDS["IN:conviction-expungement-with-sealed-confidential-access"],
  ["in_prosecutor_consent_confirmed"],
  "IN sealed-access route fact set changed"
);

for (const [state, spec] of Object.entries(expected)) {
  const profile = readJson(path.join(PROFILE_ROOT, spec.file));
  const publicProfile = projectPublicProfile(profile);
  const publicQuestionIds = new Set(publicProfile.questions.map((question) => question.id));
  const publicQuestionById = new Map(publicProfile.questions.map((question) => [question.id, question]));
  const rawQuestionById = new Map(profile.questions.map((question) => [question.id, question]));
  const pathwayIds = new Set(profile.pathways.map((pathway) => pathway.id));
  const emptySelection = new Set(selectScreeningQuestionIds(profile, publicProfile, {}));
  const routeSelections = new Map(profile.pathways.map((pathway) => [
    pathway.id,
    new Set(selectScreeningQuestionIds(profile, publicProfile, { possible_pathway_context: pathway.label }))
  ]));
  emptyContextFreeQuestions += emptySelection.size;
  maxExactRouteFreeQuestions += Math.max(emptySelection.size, ...[...routeSelections.values()].map((selection) => selection.size));

  const lifecycle = profile.questionLifecycle;
  check(Boolean(lifecycle), `${state}: missing questionLifecycle`);
  if (!lifecycle) continue;
  equal(Object.keys(lifecycle).sort(), ["completionAliasIds", "exactPacketFactIds", "routeConsumers"], `${state}: lifecycle envelope keys changed`);
  equal(lifecycle.routeConsumers, spec.routeConsumers, `${state}: routeConsumers mismatch`);
  equal(lifecycle.exactPacketFactIds, spec.exactPacketFactIds, `${state}: exactPacketFactIds mismatch`);
  equal(lifecycle.completionAliasIds, spec.completionAliasIds, `${state}: completionAliasIds mismatch`);

  for (const [questionId, consumers] of Object.entries(lifecycle.routeConsumers)) {
    check(publicQuestionIds.has(questionId), `${state}:${questionId}: route fact is not a public profile question`);
    check(!emptySelection.has(questionId), `${state}:${questionId}: route fact leaked into empty-context free screening`);
    for (const pathwayId of consumers) {
      check(pathwayIds.has(pathwayId), `${state}:${questionId}: unknown pathway ${pathwayId}`);
      check((ROUTE_ESCALATION_FACT_IDS[`${state}:${pathwayId}`] ?? []).includes(questionId), `${state}:${questionId}: ${pathwayId} lacks approved route-escalation support`);
    }
    for (const pathway of profile.pathways) {
      check(
        routeSelections.get(pathway.id)?.has(questionId) === consumers.includes(pathway.id),
        `${state}:${questionId}: real selector ${consumers.includes(pathway.id) ? "omitted intended" : "leaked unrelated"} route ${pathway.id}`
      );
    }
  }
  for (const questionId of lifecycle.exactPacketFactIds) {
    const question = rawQuestionById.get(questionId);
    const publicQuestion = publicQuestionById.get(questionId);
    check(Boolean(question || publicQuestion), `${state}:${questionId}: exact packet fact is not an available question`);
    check(
      question?.stage === "case_details"
        || question?.stage === "record_readiness"
        || question?.type === "date_or_unknown"
        || (state === "IN"
          && questionId === "eligible_conviction_class"
          && publicQuestion?.lifecyclePhase === "postpay_packet_field"),
      `${state}:${questionId}: exact packet fact lacks structural packet/date support`
    );
    check(!emptySelection.has(questionId), `${state}:${questionId}: exact packet fact leaked into empty-context free screening`);
    for (const [pathwayId, selection] of routeSelections) {
      check(!selection.has(questionId), `${state}:${questionId}: exact packet fact leaked into ${pathwayId} free screening`);
    }
  }
  for (const questionId of lifecycle.completionAliasIds) {
    check(rawQuestionById.has(questionId), `${state}:${questionId}: completion alias is not a compiled question`);
    check(publicQuestionIds.has("court_requirements_completed"), `${state}:${questionId}: completion alias lacks canonical completion authority`);
    check(["sentence_completion_date", "financial_obligations"].includes(questionId), `${state}:${questionId}: completion alias is not approved`);
  }

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

{
  const profile = readJson(path.join(PROFILE_ROOT, expected.IN.file));
  const pathway = profile.packetGenerator.pathways.find((candidate) => candidate.pathwayId === "conviction-expungement-with-sealed-confidential-access");
  const requiredInputIds = pathway?.requiredInputIds ?? profile.packetGenerator.requiredInputs;
  check(requiredInputIds.includes("eligible_conviction_class"), "IN: sealed-access packet plan does not collect eligible_conviction_class");
  check(missingRequiredInputs(requiredInputIds, {}, {}).includes("eligible_conviction_class"), "IN: missing conviction tier did not block packet completeness");
  check(missingRequiredInputs(requiredInputIds, {}, { eligible_conviction_class: "I am not sure" }).includes("eligible_conviction_class"), "IN: unknown conviction tier did not block packet completeness");
  for (const tier of ["Misdemeanor", "Level 6 felony", "Level 5 felony"]) {
    check(!missingRequiredInputs(["eligible_conviction_class"], {}, { eligible_conviction_class: tier }).includes("eligible_conviction_class"), `IN: known conviction tier ${tier} was rejected`);
  }
}

const manifest = readJson(MANIFEST_PATH);
const reconciliation = readJson(RECONCILIATION_PATH);
const stateSet = new Set(Object.keys(expected));
const flows = manifest.flows.filter((flow) => stateSet.has(flow.jurisdiction));
const reconciliationRows = reconciliation.rows.filter((row) => stateSet.has(row.jurisdiction));
check(flows.length === 55, `Lane E flow count changed: expected 55, got ${flows.length}`);
check(reconciliationRows.filter((row) => row.browserRequired).length * 2 === 104, "Lane E browser witness count changed from 104");
check(emptyContextFreeQuestions === 82, `Lane E empty-context selector count changed: expected 82, got ${emptyContextFreeQuestions}`);
check(maxExactRouteFreeQuestions === 84, `Lane E max-exact-route selector count changed: expected 84, got ${maxExactRouteFreeQuestions}`);

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
  equal(evidence.after, { flows: 55, browserWitnessVariants: 104, freeQuestionsEmptyContext: 82, freeQuestionsMaxExactRoute: 84, routeConsumerFacts: 2, routeConsumerEdges: 3, exactPacketFactIds: 52, completionAliasIds: 5 }, "evidence result counts changed");
}

if (failures.length) {
  console.error(`Lane E screening-verification verifier failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Lane E screening-verification verifier passed.");
console.log("9 states, 55 terminal/payment flow witnesses, 104 browser variants, 52 exact packet facts, 3 route-consumer edges, 5 completion aliases.");
