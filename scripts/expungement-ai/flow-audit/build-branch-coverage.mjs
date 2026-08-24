#!/usr/bin/env node
// One synthetic fixture per branch edge in the Expungement.ai screening flow.
//
//   node scripts/expungement-ai/flow-audit/build-branch-coverage.mjs
//   node scripts/expungement-ai/flow-audit/build-branch-coverage.mjs --check
//
// A branch edge is one selectable value of one rendered consumer screen. The
// fixture holds every other screen at the pinned clear-record answer and varies
// exactly that one edge, so the terminal a given answer produces is attributable
// to that answer and nothing else.
//
// This is also where the "known fact re-asked as blank" and "dead-end next
// action" checks get their evidence: an edge whose terminal asks for a question
// id the flow never renders cannot be satisfied from the UI, and the result
// page's "Add these details" action would return the participant to the same
// screen set forever.

import {
  read, readJson, gitSha, writeArtifact, stableJson, EVALUATOR_TODAY,
  getAllJurisdictionProfiles, projectPublicProfile, deriveScreens,
  evaluateAuthoritativeScreeningResult, questionIndex, answerFor
} from "./lib/engine.mjs";

const CHECK = process.argv.includes("--check");
const OUT = "data/expungement-ai/flow-audit/branch-coverage.json";

const YES_NO_UNSURE_OPTIONS = ["Yes", "No", "I am not sure"];
const YES_NO_PREFER_NOT_OPTIONS = ["Yes", "No", "Prefer not to say"];
const OPEN_FIELD_EDGES = {
  text: ["typed_value"],
  text_or_unknown: ["typed_value", "unknown_affordance"],
  number_or_range: ["typed_value", "unknown_affordance"],
  date_or_unknown: ["typed_value", "unknown_affordance"]
};

/** The values the rendered control actually offers for one question. */
function edgeValuesFor(question) {
  if (question.type === "yes_no_unsure") return YES_NO_UNSURE_OPTIONS.map((v) => ({ edge: v, value: v }));
  if (question.type === "yes_no_prefer_not_to_say") return YES_NO_PREFER_NOT_OPTIONS.map((v) => ({ edge: v, value: v }));
  if (Array.isArray(question.options) && question.options.length > 0) {
    return question.options.map((option) => ({
      edge: option,
      value: question.type === "multi_select" ? [option] : option
    }));
  }
  const shapes = OPEN_FIELD_EDGES[question.type] ?? ["typed_value"];
  return shapes.map((shape) => ({
    edge: shape,
    value: shape === "unknown_affordance"
      ? "I am not sure"
      : question.type === "number_or_range" ? "30"
        : question.type === "date_or_unknown" ? "2012-06-01"
          : "typed record wording"
  }));
}

const witnessFixtures = readJson("data/rcap-ledger/public-witness-fixtures.json");
const witnessesByJurisdiction = new Map();
for (const witness of witnessFixtures.fixtures) {
  if (!witnessesByJurisdiction.has(witness.jurisdiction)) witnessesByJurisdiction.set(witness.jurisdiction, []);
  witnessesByJurisdiction.get(witness.jurisdiction).push(witness);
}
for (const list of witnessesByJurisdiction.values()) list.sort((a, b) => a.pathwayKey.localeCompare(b.pathwayKey));

const rows = [];
const perJurisdiction = [];

for (const profile of getAllJurisdictionProfiles().slice().sort((a, b) => a.jurisdiction.code.localeCompare(b.jurisdiction.code))) {
  const code = profile.jurisdiction.code;
  const publicProfile = projectPublicProfile(profile);
  const screens = deriveScreens(publicProfile);
  const screenIds = new Set(screens.map((q) => q.id));
  const index = questionIndex(publicProfile);

  // The baseline every edge varies from.
  //
  // A generic pinned answer for every screen lands 46 of 51 states on
  // needs_review before a single edge is varied, which makes every edge's
  // terminal unattributable. So the baseline is a VIABLE participant where the
  // repository already records one: the answers of this state's first
  // packet-ready public witness, narrowed to the rendered screens and topped up
  // with the pinned rule for any screen the witness did not answer. States with
  // no recorded packet-ready witness keep the pinned baseline, and the baseline
  // terminal is recorded either way so every edge stays interpretable.
  const viableWitness = witnessesByJurisdiction.get(code)?.find(
    (w) => w.expected?.resultCode === "packet_ready" || w.expected?.resultCode === "packet_ready_with_caution"
  ) ?? null;
  const baseline = {};
  for (const question of screens) {
    const fromWitness = viableWitness?.answers?.[question.id];
    baseline[question.id] = fromWitness !== undefined ? fromWitness : answerFor(index.get(question.id), question.id);
  }

  let baselineTerminal = "evaluator_error";
  let baselinePathwayId = null;
  try {
    const baseEvaluation = evaluateAuthoritativeScreeningResult({
      jurisdiction: code,
      profileVersion: profile.profileVersion,
      matterId: "expai-branch-baseline",
      answers: { ...baseline }
    }).evaluation;
    baselineTerminal = baseEvaluation.resultCode;
    baselinePathwayId = baseEvaluation.pathwayId ?? null;
  } catch { /* recorded as evaluator_error above */ }

  let edgeCount = 0;
  let unreachableMissingEdges = 0;

  for (const question of screens) {
    for (const { edge, value } of edgeValuesFor(question)) {
      edgeCount += 1;
      const answers = { ...baseline, [question.id]: value };
      let evaluation = null;
      let error = null;
      try {
        evaluation = evaluateAuthoritativeScreeningResult({
          jurisdiction: code,
          profileVersion: profile.profileVersion,
          matterId: "expai-branch-edge",
          answers
        }).evaluation;
      } catch (thrown) {
        error = String(thrown?.message ?? thrown).slice(0, 200);
      }
      const missing = [...(evaluation?.missingQuestionIds ?? [])].sort();
      const missingNotRendered = missing.filter((id) => !screenIds.has(id));
      if (missingNotRendered.length > 0) unreachableMissingEdges += 1;

      rows.push({
        branchId: `${code}:${question.id}:${String(edge).replace(/\s+/g, "_").slice(0, 60)}`,
        jurisdiction: code,
        questionId: question.id,
        questionType: question.type,
        edge: String(edge),
        selectedValue: value,
        terminalResultCode: evaluation?.resultCode ?? "evaluator_error",
        baselineTerminalResultCode: baselineTerminal,
        changesTheTerminal: (evaluation?.resultCode ?? "evaluator_error") !== baselineTerminal,
        pathwayId: evaluation?.pathwayId ?? null,
        paymentAllowed: evaluation?.paymentAllowed === true,
        missingQuestionIds: missing,
        missingQuestionIdsTheFlowNeverRenders: missingNotRendered,
        reasonCodes: (evaluation?.reasons ?? []).map((r) => r.code).sort(),
        error,
        fixture: { answers, evaluatorToday: EVALUATOR_TODAY, synthetic: true }
      });
    }
  }

  perJurisdiction.push({
    jurisdiction: code,
    screens: screens.length,
    branchEdges: edgeCount,
    baselineSource: viableWitness ? `public-witness-fixtures:${viableWitness.pathwayKey}` : "pinned_clear_record",
    baselineTerminalResultCode: baselineTerminal,
    baselinePathwayId,
    edgesWhoseTerminalAsksForAnUnrenderedQuestion: unreachableMissingEdges
  });
}

const terminalCounts = {};
for (const row of rows) terminalCounts[row.terminalResultCode] = (terminalCounts[row.terminalResultCode] ?? 0) + 1;

const coverage = {
  schemaVersion: "expai-branch-coverage/v1",
  generatedBy: "scripts/expungement-ai/flow-audit/build-branch-coverage.mjs",
  baseSha: gitSha("origin/main"),
  evaluatorToday: EVALUATOR_TODAY,
  changesNoProductBehavior: true,
  branchEdgeDefinition: "one selectable value of one rendered consumer screen, with every other rendered screen held at the pinned clear-record answer",
  totals: {
    jurisdictions: perJurisdiction.length,
    branchEdges: rows.length,
    edgesWithAFixture: rows.length,
    edgesWithoutAFixture: 0,
    edgesThatThrew: rows.filter((r) => r.error).length,
    edgesWhoseTerminalAsksForAnUnrenderedQuestion: rows.filter((r) => r.missingQuestionIdsTheFlowNeverRenders.length > 0).length,
    edgesThatChangeTheTerminal: rows.filter((r) => r.changesTheTerminal).length,
    jurisdictionsWithAViableBaseline: perJurisdiction.filter((j) => j.baselineSource !== "pinned_clear_record").length,
    jurisdictionsWhoseBaselineIsNotPacketReady: perJurisdiction.filter((j) => !["packet_ready", "packet_ready_with_caution"].includes(j.baselineTerminalResultCode)).map((j) => ({ jurisdiction: j.jurisdiction, baselineTerminalResultCode: j.baselineTerminalResultCode })),
    terminalCounts
  },
  perJurisdiction,
  branches: rows
};

const text = stableJson(coverage);
if (CHECK) {
  if (read(OUT) !== text) {
    console.error(`${OUT} is stale or non-deterministic; re-run without --check.`);
    process.exit(1);
  }
  console.log(`branch coverage current and deterministic: ${rows.length} edge(s).`);
  process.exit(0);
}
const written = writeArtifact(OUT, text);
console.log(`wrote ${written.path} (${written.bytes} bytes)`);
console.log(`  branch edges: ${rows.length}  errors: ${coverage.totals.edgesThatThrew}  unrenderable-missing: ${coverage.totals.edgesWhoseTerminalAsksForAnUnrenderedQuestion}`);
console.log(`  terminals: ${JSON.stringify(terminalCounts)}`);
