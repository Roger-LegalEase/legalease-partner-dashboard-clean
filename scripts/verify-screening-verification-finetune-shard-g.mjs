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
const EVIDENCE_PATH = path.join(ROOT, "data/expungement-ai/screening-verification-finetune/shard-g.json");
const MANIFEST_PATH = path.join(ROOT, "data/expungement-ai/flow-audit/flow-manifest.json");
const RECONCILIATION_PATH = path.join(ROOT, "data/expungement-ai/flow-audit/FINAL_CANDIDATE_RECONCILIATION.json");

const expected = {
  NE: {
    file: "NE-nebraska.json",
    routeConsumers: {},
    exactPacketFactIds: ["criminal_history", "disposition_date", "arrest_date", "county", "court", "charge", "record_documents", "case_identifier"],
    completionAliasIds: ["sentence_completion_date", "financial_obligations"]
  },
  NV: {
    file: "NV-nevada.json",
    routeConsumers: {},
    exactPacketFactIds: ["criminal_history", "disposition_date", "arrest_date", "court", "charge", "record_documents", "county_or_filing_location", "case_identifier"],
    completionAliasIds: []
  },
  NH: {
    file: "NH-new-hampshire.json",
    routeConsumers: {},
    exactPacketFactIds: [],
    completionAliasIds: []
  },
  NJ: {
    file: "NJ-new-jersey.json",
    routeConsumers: {},
    exactPacketFactIds: ["court", "charge", "record_documents", "county_or_filing_location", "case_identifier"],
    completionAliasIds: ["sentence_completion_date", "financial_obligations"]
  },
  NM: {
    file: "NM-new-mexico.json",
    routeConsumers: {},
    exactPacketFactIds: ["disposition_date", "arrest_date", "court", "charge", "record_documents", "county_or_filing_location", "case_identifier"],
    completionAliasIds: ["sentence_completion_date", "financial_obligations"]
  },
  NY: {
    file: "NY-new-york.json",
    routeConsumers: {
      ny_16059_total_eligible_convictions: ["discretionary-conviction-sealing-by-petition-under-cpl-160-59"],
      ny_16059_felony_convictions: ["discretionary-conviction-sealing-by-petition-under-cpl-160-59"],
      ny_16059_ineligible_offense: ["discretionary-conviction-sealing-by-petition-under-cpl-160-59"],
      ny_16059_sex_offender_registration: ["discretionary-conviction-sealing-by-petition-under-cpl-160-59"],
      ny_16059_pending_charge: ["discretionary-conviction-sealing-by-petition-under-cpl-160-59"],
      ny_16059_post_last_conviction_crime: ["discretionary-conviction-sealing-by-petition-under-cpl-160-59"],
      ny_16059_prior_sealing: ["discretionary-conviction-sealing-by-petition-under-cpl-160-59"],
      ny_16058_treatment_program_completed: ["conditional-treatment-sealing-under-cpl-160-58"]
    },
    exactPacketFactIds: ["criminal_history", "disposition_date", "court", "charge", "record_documents", "county_or_filing_location", "case_identifier"],
    completionAliasIds: ["sentence_completion_date"]
  },
  NC: {
    file: "NC-north-carolina.json",
    routeConsumers: {},
    exactPacketFactIds: ["disposition_date", "court", "charge", "record_documents", "county_or_filing_location", "case_identifier"],
    completionAliasIds: ["sentence_completion_date", "financial_obligations"]
  },
  ND: {
    file: "ND-north-dakota.json",
    routeConsumers: {},
    exactPacketFactIds: [],
    completionAliasIds: []
  }
};

const legalSurfaceHashes = {
  NE: "e4c4f4fe2c270bdfb06ceb801ce6befd12f064b78957d51685e44810698cd89b",
  NV: "e1d0fdd0e147ac189fd6b5ec663a9e2409d5b031ea954d86e045cf9f657da684",
  NH: "12d77e5323730b2351af5c9fa4c8e5050e49b2ad8ed43c19360ce7d277bf1d7e",
  NJ: "56e43a3cdbad72044f3d7070f084b6603ada8d942ccae7a1922d77f70d0d3986",
  NM: "99214ff031a52719839f074646fc1a76e4dae8ef7bb278bd7291104cdad8b072",
  // Rehashed for Batch C: New York carried no route contract of any kind before CPL § 160.55.
  NY: "a29fc976093c99d419fb8e225db396999472ae4119e5c455067dc012a3c8073f",
  NC: "407817cdb07738d6cfa9d960f116f0eec3f96f22438490e93cf6645b0194cfb4",
  // Rehashed for Batch A: the § 12-60.1-05 contract split the route into a pre- and post-2025-08-01 branch.
  ND: "5cb71700b927885a231558e102f5d3d9587952bc328e1e71945c56b5272b7544"
};

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const equal = (actual, wanted, message) => {
  try { assert.deepEqual(actual, wanted); } catch { failures.push(`${message}: got ${JSON.stringify(actual)}`); }
};
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

  if (state === "NY") {
    check(rawQuestionById.has("pending_cases"), "NY: generic pending_cases evaluator input was removed");
    check(publicQuestionIds.has("ny_16059_pending_charge"), "NY: route-scoped pending-charge input is missing");
    check(!Object.hasOwn(lifecycle.routeConsumers, "pending_cases"), "NY: generic pending_cases must remain universal");
    check(!lifecycle.completionAliasIds.includes("ny_16059_pending_charge"), "NY: pending-charge duplicate cannot use the completion-alias contract");
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
check(flows.length === 49, `Lane G flow count changed: expected 49, got ${flows.length}`);
check(reconciliationRows.filter((row) => row.browserRequired).length * 2 === 96, "Lane G browser witness count changed from 96");

for (const flow of flows) {
  const profile = getProfileByJurisdiction(flow.jurisdiction);
  const result = evaluateScreening({ jurisdiction: flow.jurisdiction, profileVersion: profile.profileVersion, matterId: `shard-g-${flow.flowId}`, answers: flow.fixture.answers });
  check(result.pathwayId === flow.remedy.pathwayId, `${flow.flowId}: pathway ${result.pathwayId} != ${flow.remedy.pathwayId}`);
  check(result.resultCode === flow.terminalOutcome.effectiveTerminal, `${flow.flowId}: terminal ${result.resultCode} != ${flow.terminalOutcome.effectiveTerminal}`);
  check(result.paymentAllowed === (flow.paymentMode === "dtc_paid"), `${flow.flowId}: payment witness changed`);
  if (["packet_ready", "packet_ready_with_caution"].includes(result.resultCode)) check(result.packetPlan?.pathwayId === flow.remedy.pathwayId, `${flow.flowId}: packet witness missing or changed`);
}

const representativeSelectedFlowIds = ["EXPAI-NV-0691a5dd95", "EXPAI-NH-1703afdc6a", "EXPAI-ND-1084bad037"];
for (const flowId of representativeSelectedFlowIds) {
  const flow = flows.find((candidate) => candidate.flowId === flowId);
  check(Boolean(flow), `${flowId}: representative selected-answer flow is missing`);
  if (!flow) continue;
  const profile = getProfileByJurisdiction(flow.jurisdiction);
  const selectedIds = new Set(selectPublicQuestionIds(profile, projectPublicProfile(profile), flow.fixture.answers.possible_pathway_context));
  const selectedAnswers = Object.fromEntries(Object.entries(flow.fixture.answers).filter(([questionId]) => selectedIds.has(questionId)));
  const result = evaluateScreening({ jurisdiction: flow.jurisdiction, profileVersion: profile.profileVersion, matterId: `shard-g-selected-${flowId}`, answers: selectedAnswers });
  check(result.pathwayId === flow.remedy.pathwayId, `${flowId}: selected-answer pathway changed`);
  check(result.resultCode === flow.terminalOutcome.effectiveTerminal, `${flowId}: selected-answer terminal changed`);
  check(result.paymentAllowed === (flow.paymentMode === "dtc_paid"), `${flowId}: selected-answer payment changed`);
}

if (!fs.existsSync(EVIDENCE_PATH)) {
  failures.push("Lane G evidence/status file is missing");
} else {
  const evidence = readJson(EVIDENCE_PATH);
  equal(evidence.states, Object.keys(expected), "evidence state order changed");
  equal(evidence.before, { flows: 49, browserWitnessVariants: 96, freeQuestions: 93, completionOverlaps: 9, genericSpecialRouteAsks: 11, rawPacketFields: 36 }, "evidence baseline changed");
  equal(evidence.after, { flows: 49, browserWitnessVariants: 96, freeQuestions: { emptyContext: 76, maxExactRoute: 83 }, routeConsumerFacts: 8, routeConsumerEdges: 8, exactPacketFactIds: 41, completionAliasIds: 9 }, "evidence result counts changed");
  equal(evidence.selectedQuestionCounts, selectedQuestionCounts, "evidence selected-question counts changed");
  equal(evidence.representativeSelectedFlowIds, representativeSelectedFlowIds, "evidence selected-answer witnesses changed");
  equal(evidence.semanticDuplicate, { genericFactId: "pending_cases", routeScopedFactId: "ny_16059_pending_charge", treatment: "preserve_both_route_scope_specific_only" }, "NY pending-charge evidence changed");
}

if (failures.length) {
  console.error(`Lane G screening-verification verifier failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Lane G screening-verification verifier passed.");
console.log("8 states, 49 terminal/payment flow witnesses, 96 browser variants, 76 empty-context / 83 max-route questions, 41 exact packet facts, 8 route-consumer edges, 9 completion aliases.");
