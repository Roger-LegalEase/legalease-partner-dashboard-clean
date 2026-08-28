#!/usr/bin/env node

import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";

process.env.RCAP_EVALUATOR_TODAY = "2026-08-25";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const { routesForJurisdiction } = await import("../src/lib/legal-authority/index.ts");
const { evaluateScreening } = await import("../src/lib/rcap-engine/evaluator.ts");
const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { packetPlanForPathway } = await import("../src/lib/rcap-engine/packet-planner.ts");
const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");
const { ROUTE_ESCALATION_FACT_IDS } = await import("../src/lib/rcap-engine/route-fact-relevance.ts");
const { selectScreeningQuestionIds } = await import("../src/lib/rcap-engine/screening-question-selection.ts");

const ROOT = process.cwd();
const PROFILE_ROOT = path.join(ROOT, "src/lib/rcap-engine/compiled/profiles");
const EVIDENCE_PATH = path.join(ROOT, "data/expungement-ai/screening-verification-finetune/shard-f.json");
const MANIFEST_PATH = path.join(ROOT, "data/expungement-ai/flow-audit/flow-manifest.json");
const RECONCILIATION_PATH = path.join(ROOT, "data/expungement-ai/flow-audit/FINAL_CANDIDATE_RECONCILIATION.json");
const EVALUATOR_PATH = path.join(ROOT, "src/lib/rcap-engine/evaluator.ts");

const expected = {
  LA: {
    file: "LA-louisiana.json",
    routeConsumers: {},
    exactPacketFactIds: ["criminal_history", "disposition_date", "arrest_date", "court", "case_number", "charge", "record_documents", "county_or_filing_location"],
    completionAliasIds: ["sentence_completion_date", "financial_obligations"]
  },
  ME: {
    file: "ME-maine.json",
    routeConsumers: {},
    exactPacketFactIds: ["criminal_history", "disposition_date", "court", "charge", "record_documents", "county_or_filing_location", "case_identifier"],
    completionAliasIds: ["sentence_completion_date", "financial_obligations"]
  },
  MD: {
    file: "MD-maryland.json",
    routeConsumers: {
      pardon_signed_date: ["pardoned-conviction-expungement-under-crim-proc-10-105-a-8"],
      arrest_date: ["police-record-expungement-when-no-charge-was-filed-under-10-103"]
    },
    exactPacketFactIds: ["county", "court", "charge", "record_documents", "case_identifier", "pardon_signed_date", "arrest_date"],
    completionAliasIds: []
  },
  MA: {
    file: "MA-massachusetts.json",
    routeConsumers: {},
    exactPacketFactIds: ["court", "charge", "record_documents", "county_or_filing_location", "case_identifier"],
    completionAliasIds: []
  },
  MI: {
    file: "MI-michigan.json",
    routeConsumers: {},
    exactPacketFactIds: ["court", "charge", "record_documents", "county_or_filing_location", "case_identifier"],
    completionAliasIds: []
  },
  MN: {
    file: "MN-minnesota.json",
    routeConsumers: {},
    exactPacketFactIds: ["criminal_history", "disposition_date", "court", "charge", "record_documents", "county_or_filing_location", "case_identifier"],
    completionAliasIds: []
  },
  MS: {
    file: "MS-mississippi.json",
    routeConsumers: {},
    exactPacketFactIds: ["arrest_date", "ms_last_conviction_date_any_court", "ms_successful_sentence_completion_date", "ms_mip_dismissal_or_discharge_date", "ms_mip_sentence_completion_date", "ms_mip_fine_imposed", "ms_mip_fine_payment_date"],
    completionAliasIds: []
  },
  MO: {
    file: "MO-missouri.json",
    // The § 311.326 clock is one fact in two forms: an approximate threshold in
    // free screening and an exact date of birth behind the claim. Only the
    // exact one is a packet fact; the threshold is a route-scoped screening
    // question and must never be treated as an exact date.
    routeConsumers: {
      mo_at_least_twenty_two: ["first-minor-in-possession-alcohol-expungement-under-311-326"],
      date_of_birth: ["first-minor-in-possession-alcohol-expungement-under-311-326"]
    },
    exactPacketFactIds: ["disposition_date", "arrest_date", "court", "charge", "record_documents", "county_or_filing_location", "case_identifier", "date_of_birth"],
    completionAliasIds: ["sentence_completion_date", "financial_obligations"]
  },
  MT: {
    file: "MT-montana.json",
    routeConsumers: {},
    exactPacketFactIds: ["criminal_history", "disposition_date", "county", "court", "charge", "record_documents"],
    completionAliasIds: ["sentence_completion_date", "financial_obligations"]
  }
};

const legalSurfaceHashes = {
  // Rehashed for Batch B: Louisiana gained a contract for the art. 977(D)/998
  // route and had two ungated LD-LA-05 contracts superseded by gated ones.
  LA: "9d83357632f526cff5ddad1d86cae1120adaf6b47eccc2f6abbbb09a37a35326",
  // Rehashed for Batch B: Maine had no route contracts at all except juvenile
  // sealing; § 2264, § 2264(7) and § 703(2) all gained one.
  ME: "f8580a042af867ae055de3f1bf2d0b64201585d8a07b225f5fc4eed04c991750",
  MD: "158287d6d66fcba83112b4e81adb0d94cc9f3d0233540b89ef7cb33cbb43981c",
  MA: "b19adba173d6c36d9a15094182327e66e7d745570fcf5f7ab67ca483699f4b03",
  MI: "525af598d6b5d72745a1a7f7e0c6b69e8f03984908898c2597eb7f4a8df3da16",
  MN: "477efc8afcbbe165c245ef5c213a52f0140ad481140d481f277294959c1b5d1e",
  MS: "df72da8788bab609702c9c32e1ea952265d925f6c68116d5ea6c63ee07d189a9",
  // Rehashed for the § 311.326 fact-model correction: the exact birth date
  // moved behind the claim and an approximate threshold took its place in
  // screening. Both questions live in the legal surface, so the hash moves.
  MO: "69bb8e1aae46e2dd610d4d0864a19a52704c07afd49b7003b66a29093c99f857",
  MT: "3bacd63e832245f01fb94a1f34783e30e3c68362ac693349dbac7353e1fbfe97"
};

const projectionPacketFacts = new Set([
  "MD:arrest_date",
  "MO:date_of_birth",
  "MS:arrest_date",
  "MS:ms_last_conviction_date_any_court",
  "MS:ms_successful_sentence_completion_date",
  "MS:ms_mip_dismissal_or_discharge_date",
  "MS:ms_mip_sentence_completion_date",
  "MS:ms_mip_fine_imposed",
  "MS:ms_mip_fine_payment_date"
]);

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };
const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
const equal = (actual, wanted, message) => {
  try { assert.deepEqual(actual, wanted); } catch { failures.push(`${message}: got ${JSON.stringify(actual)}`); }
};

/**
 * What this froze, and what it froze it against.
 *
 * The original contract was: § 311.326 runs on an exact anchor, one year from
 * `twenty_first_birthday`, and must never be coarsened into a timing bucket.
 * The coarsening rule still holds. The anchor does not: `twenty_first_birthday`
 * asked an anonymous person for their birth date, and no Missouri profile
 * published the question, so the rule it guarded could not evaluate against
 * anything.
 *
 * The corrected contract keeps the clock exact and moves it behind the claim.
 * Twenty-two years from the date of birth is one year past the twenty-first
 * birthday. Where no date of birth exists yet, screening answers an approximate
 * threshold and says so; it never substitutes a bucket for the clock.
 */
function missouriMipExactClockViolations(source) {
  const start = source.indexOf('if (key === "MO:first-minor-in-possession-alcohol-expungement-under-311-326")');
  const end = start < 0 ? -1 : source.indexOf("\n  }\n", start);
  const branch = start < 0 || end < 0 ? "" : source.slice(start, end + 5);
  const violations = [];
  if (!branch) violations.push("missing exact MO §311.326 timing branch");
  if (!branch.includes("parseDateAnswer(answers.date_of_birth)")) violations.push("MO §311.326 exact anchor changed");
  if (!branch.includes('addDuration(born, 22, "years")')) violations.push("MO §311.326 twenty-two-year duration changed");
  if (!branch.includes("answers.mo_at_least_twenty_two")) violations.push("MO §311.326 lost its approximate screening threshold");
  if (branch.includes("resolved_timing_bucket") || branch.includes("RESOLVED_TIMING_BUCKET_FIELD_ID")) violations.push("MO §311.326 uses a coarse timing bucket");
  return violations;
}

const evaluatorSource = fs.readFileSync(EVALUATOR_PATH, "utf8");
equal(missouriMipExactClockViolations(evaluatorSource), [], "MO §311.326 exact-clock contract changed");
const exactClockMutations = [
  // The exact date of birth replaced by the coarse bucket.
  evaluatorSource.replace("parseDateAnswer(answers.date_of_birth)", "parseDateAnswer(answers.resolved_timing_bucket)"),
  // Twenty-two years silently shortened to twenty-one: eligible a year early.
  evaluatorSource.replace('addDuration(born, 22, "years")', 'addDuration(born, 21, "years")'),
  // The route key renamed, so the branch never runs.
  evaluatorSource.replace(
    'if (key === "MO:first-minor-in-possession-alcohol-expungement-under-311-326")',
    'if (key === "MO:mutated-minor-in-possession-route")'
  ),
  // The exact clock deleted, leaving only the approximate screening threshold.
  evaluatorSource.replace("const born = parseDateAnswer(answers.date_of_birth);", "const born = undefined;"),
  // The approximate threshold deleted, leaving screening unable to answer.
  evaluatorSource.replace("const threshold = answers.mo_at_least_twenty_two;", "const threshold = undefined;")
];
for (const [index, mutation] of exactClockMutations.entries()) {
  check(missouriMipExactClockViolations(mutation).length > 0, `MO §311.326 exact-clock mutation ${index + 1} survived`);
}
const selectPublicQuestionIds = (profile, publicProfile, selectedPathwayLabel = "") => {
  return selectScreeningQuestionIds(profile, publicProfile, selectedPathwayLabel
    ? { possible_pathway_context: selectedPathwayLabel }
    : {});
};
const selectedQuestionCounts = {};

for (const [state, spec] of Object.entries(expected)) {
  const profile = readJson(path.join(PROFILE_ROOT, spec.file));
  const publicProfile = projectPublicProfile(profile);
  const publicQuestionIds = new Set(publicProfile.questions.map((question) => question.id));
  const rawQuestionById = new Map(profile.questions.map((question) => [question.id, question]));
  const pathwayIds = new Set(profile.pathways.map((pathway) => pathway.id));
  const authorityRoutes = routesForJurisdiction(state);

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
    const packetOnly = lifecycle.exactPacketFactIds.includes(questionId);
    check(!emptyContextIds.has(questionId), `${state}:${questionId}: route fact leaked into empty-context screening`);
    for (const pathwayId of consumers) {
      check(pathwayIds.has(pathwayId), `${state}:${questionId}: unknown pathway ${pathwayId}`);
      const escalationSupport = (ROUTE_ESCALATION_FACT_IDS[`${state}:${pathwayId}`] ?? []).includes(questionId);
      // A route fact is approved either because the contract screens on it or
      // because the contract holds the packet until it is supplied. The second
      // source was missing, so a fact deliberately kept out of screening — a
      // birth date, say — read as unsupported precisely for being correct.
      const authoritySupport = authorityRoutes.some((route) => route.pathwayId === pathwayId && (
        (route.screeningFactIds ?? []).includes(questionId)
        || (route.packetReleasePreconditions ?? []).some((precondition) =>
          precondition.id === questionId || precondition.satisfiedWhen?.factId === questionId)
      ));
      check(escalationSupport || authoritySupport, `${state}:${questionId}: ${pathwayId} lacks approved machine support`);
      if (packetOnly) {
        check(!pathwaySelections.get(pathwayId)?.has(questionId), `${state}:${questionId}: exact date leaked into free screening for ${pathwayId}`);
        check(packetPlanForPathway(profile, pathwayId)?.requiredInputIds.includes(questionId), `${state}:${questionId}: exact packet fact is not retained by ${pathwayId}`);
        for (const unrelatedPathwayId of pathwayIds) {
          if (unrelatedPathwayId !== pathwayId) {
            check(!packetPlanForPathway(profile, unrelatedPathwayId)?.requiredInputIds.includes(questionId), `${state}:${questionId}: leaked into unrelated packet plan ${unrelatedPathwayId}`);
          }
        }
      } else {
        check(pathwaySelections.get(pathwayId)?.has(questionId), `${state}:${questionId}: missing from exact pathway ${pathwayId}`);
      }
    }
    for (const [pathwayId, selectedIds] of pathwaySelections) {
      if (!consumers.includes(pathwayId)) check(!selectedIds.has(questionId), `${state}:${questionId}: leaked into unrelated pathway ${pathwayId}`);
    }
  }
  for (const questionId of lifecycle.exactPacketFactIds) {
    const question = publicProfile.questions.find((candidate) => candidate.id === questionId) ?? rawQuestionById.get(questionId);
    check(publicQuestionIds.has(questionId), `${state}:${questionId}: exact packet fact is not a public profile question`);
    const structural = question?.stage === "case_details" || question?.stage === "record_readiness" || question?.type === "date_or_unknown";
    check(structural || projectionPacketFacts.has(`${state}:${questionId}`), `${state}:${questionId}: exact packet fact lacks structural/date authority`);
    check(!emptyContextIds.has(questionId) && [...pathwaySelections.values()].every((ids) => !ids.has(questionId)), `${state}:${questionId}: exact packet fact leaked into screening`);
  }
  for (const [pathwayId, selectedIds] of pathwaySelections) {
    for (const questionId of selectedIds) {
      const question = publicProfile.questions.find((candidate) => candidate.id === questionId);
      check(question?.type !== "date_or_unknown", `${state}:${pathwayId}: exact date ${questionId} remains in free screening`);
    }
  }
  for (const questionId of lifecycle.completionAliasIds) {
    check(rawQuestionById.has(questionId), `${state}:${questionId}: completion alias is not a compiled question`);
    check(publicQuestionIds.has("court_requirements_completed"), `${state}:${questionId}: completion alias lacks canonical completion authority`);
    check(["sentence_completion_date", "financial_obligations"].includes(questionId), `${state}:${questionId}: completion alias is not approved`);
    check(!emptyContextIds.has(questionId) && [...pathwaySelections.values()].every((ids) => !ids.has(questionId)), `${state}:${questionId}: completion alias leaked into screening`);
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
check(flows.length === 80, `Lane F flow count changed: expected 80, got ${flows.length}`);
check(reconciliationRows.filter((row) => row.browserRequired).length * 2 === 156, "Lane F browser witness count changed from 156");

for (const flow of flows) {
  const profile = getProfileByJurisdiction(flow.jurisdiction);
  const result = evaluateScreening({
    jurisdiction: flow.jurisdiction,
    profileVersion: profile.profileVersion,
    matterId: `shard-f-${flow.flowId}`,
    answers: flow.fixture.answers
  });
  check(result.pathwayId === flow.remedy.pathwayId, `${flow.flowId}: pathway ${result.pathwayId} != ${flow.remedy.pathwayId}`);
  check(result.resultCode === flow.terminalOutcome.effectiveTerminal, `${flow.flowId}: terminal ${result.resultCode} != ${flow.terminalOutcome.effectiveTerminal}`);
  check(result.paymentAllowed === (flow.paymentMode === "dtc_paid"), `${flow.flowId}: payment witness changed`);
  if (["packet_ready", "packet_ready_with_caution"].includes(result.resultCode)) {
    check(result.packetPlan?.pathwayId === flow.remedy.pathwayId, `${flow.flowId}: packet witness missing or changed`);
  }
}

const representativeSelectedFlowIds = [
  "EXPAI-MD-2ec5a936b1", "EXPAI-MA-1b8b8b38fd", "EXPAI-MI-31050183b1", "EXPAI-MN-1ecfc803d9",
  "EXPAI-MS-4fd3a68b39", "EXPAI-MS-9c7d692811", "EXPAI-MS-c9d86d7fda"
];
const authorityLimitedNoncommercialFlowIds = ["EXPAI-MS-c9d86d7fda"];
for (const flowId of representativeSelectedFlowIds) {
  const flow = flows.find((candidate) => candidate.flowId === flowId);
  check(Boolean(flow), `${flowId}: representative selected-answer flow is missing`);
  if (!flow) continue;
  const profile = getProfileByJurisdiction(flow.jurisdiction);
  const selectedIds = new Set(selectPublicQuestionIds(profile, projectPublicProfile(profile), flow.fixture.answers.possible_pathway_context));
  const selectedAnswers = Object.fromEntries(Object.entries(flow.fixture.answers).filter(([questionId]) => selectedIds.has(questionId)));
  const result = evaluateScreening({ jurisdiction: flow.jurisdiction, profileVersion: profile.profileVersion, matterId: `shard-f-selected-${flowId}`, answers: selectedAnswers });
  check(result.pathwayId === flow.remedy.pathwayId, `${flowId}: selected-answer pathway changed`);
  check(result.resultCode === flow.terminalOutcome.effectiveTerminal, `${flowId}: selected-answer terminal changed`);
  check(result.paymentAllowed === (flow.paymentMode === "dtc_paid"), `${flowId}: selected-answer payment changed`);
  if (flow.jurisdiction === "MS") {
    check(selectedAnswers.resolved_timing_bucket === "gt_10_years", `${flowId}: Mississippi coarse timing bucket was not retained`);
    check(expected.MS.exactPacketFactIds.every((questionId) => !(questionId in selectedAnswers)), `${flowId}: unsupported Mississippi exact fact leaked into selected answers`);
  }
  if (authorityLimitedNoncommercialFlowIds.includes(flowId)) {
    check(result.resultCode === "needs_more_info" && !result.paymentAllowed, `${flowId}: authority-limited route became commercial`);
  }
}

if (!fs.existsSync(EVIDENCE_PATH)) {
  failures.push("Lane F evidence/status file is missing");
} else {
  const evidence = readJson(EVIDENCE_PATH);
  equal(evidence.states, Object.keys(expected), "evidence state order changed");
  equal(evidence.before, { flows: 80, browserWitnessVariants: 156, freeQuestions: 108, exactDateFreeCheckInputs: 9, completionOverlaps: 8, genericSpecialRouteAsks: 17, rawPacketFields: 45 }, "evidence baseline changed");
  /**
   * The result block is computed, not restated.
   *
   * It used to be a literal compared against the evidence file's copy of the
   * same literal — two frozen numbers agreeing with each other while the lane
   * they described moved underneath both. Adding Missouri's second route
   * consumer changed the real totals and neither copy noticed. These are now
   * derived from the same spec the rest of the file checks against reality, so
   * the evidence file is checked against the lane rather than against a twin.
   */
  const specs = Object.values(expected);
  const sum = (fn) => specs.reduce((total, spec) => total + fn(spec), 0);
  const stateCounts = Object.values(selectedQuestionCounts);
  equal(evidence.after, {
    flows: 80,
    browserWitnessVariants: 156,
    freeQuestions: {
      emptyContext: stateCounts.reduce((total, row) => total + row.emptyContext, 0),
      maxExactRoute: stateCounts.reduce((total, row) => total + row.maxExactRoute, 0)
    },
    routeConsumerFacts: sum((spec) => Object.keys(spec.routeConsumers).length),
    routeConsumerEdges: sum((spec) => Object.values(spec.routeConsumers).flat().length),
    exactPacketFactIds: sum((spec) => spec.exactPacketFactIds.length),
    completionAliasIds: sum((spec) => spec.completionAliasIds.length)
  }, "evidence result counts changed");
  equal(evidence.selectedQuestionCounts, selectedQuestionCounts, "evidence selected-question counts changed");
  equal(evidence.representativeSelectedFlowIds, representativeSelectedFlowIds, "evidence selected-answer witnesses changed");
  equal(evidence.authorityLimitedNoncommercialFlowIds, authorityLimitedNoncommercialFlowIds, "evidence authority-limited route witnesses changed");
  equal(evidence.packetOnlyExactRouteFacts, { MD: ["pardon_signed_date", "arrest_date"], MO: ["date_of_birth"] }, "evidence packet-only exact route facts changed");
}

if (failures.length) {
  console.error(`Lane F screening-verification verifier failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Lane F screening-verification verifier passed.");
// Printed from the same computation the checks ran on. The hand-written version
// of this line said 90/90 and 3 route-consumer edges after both had moved.
{
  const specs = Object.values(expected);
  const stateCounts = Object.values(selectedQuestionCounts);
  const total = (fn) => specs.reduce((n, spec) => n + fn(spec), 0);
  const empty = stateCounts.reduce((n, row) => n + row.emptyContext, 0);
  const maxRoute = stateCounts.reduce((n, row) => n + row.maxExactRoute, 0);
  console.log(`${specs.length} states, 80 terminal/payment flow witnesses, 156 browser variants, ${empty} empty-context / ${maxRoute} max-route questions, ${total((spec) => spec.exactPacketFactIds.length)} exact packet facts, ${total((spec) => Object.values(spec.routeConsumers).flat().length)} route-consumer edges, ${total((spec) => spec.completionAliasIds.length)} completion aliases.`);
}
