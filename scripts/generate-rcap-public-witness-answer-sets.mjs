#!/usr/bin/env node
// Deterministic public witness answer sets, one per intended-paid pathway.
//
//   node scripts/generate-rcap-public-witness-answer-sets.mjs
//   node scripts/generate-rcap-public-witness-answer-sets.mjs --check
//
// A witness is only a witness if someone else can re-run it and get the same
// answer. Every answer here is chosen by a pinned rule — never randomly — so the
// recorded exchange reproduces byte for byte on any checkout at this commit.
//
// What each record preserves: the exact seed answers, every round of the
// exchange (which question ids the evaluator asked for and exactly what was
// supplied), the final answer map, and the terminal evaluation the public
// evaluator returned. That is the participant's route through the public guided
// check, written down.
//
// This changes no runtime and decides nothing. It records what the deployed
// evaluator does today.

process.env.RCAP_EVALUATOR_TODAY = process.env.RCAP_EVALUATOR_TODAY ?? "2026-07-01";

import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
register("./lib/ts-esm-loader.mjs", import.meta.url);

const CHECK = process.argv.includes("--check");
const OUT = "data/rcap-ledger/public-witness-answer-sets.json";

const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");
const { evaluateAuthoritativeScreeningResult } = await import("../src/lib/expungement-ai/authoritative-screening-result.ts");

const closure = JSON.parse(fs.readFileSync(path.join(rootDir, "data/rcap-ledger/sellable-pathway-closure.json"), "utf8"));
const intended = closure.pathways.filter((p) => p.category === "paid_packet_intended");

// The answers a genuinely clearable record gives. Pinned so a pathway is never
// recorded unreachable because of a disqualifier nobody chose deliberately.
// Same constant the route-reachability report uses, so the two agree.
const CLEAR_RECORD = {
  ownership_scope: "Yes",
  jurisdiction_scope: "State or local",
  state_exclusion_categories: ["None of these"],
  pending_cases: "No",
  new_convictions_during_waiting_period: "No",
  sentence_completion_date: "Yes",
  financial_obligations: "Yes",
  court_requirements_completed: "yes",
  special_preconditions_confirmed: "Yes",
  trafficking_status: "No",
  pardon_status: "No",
  record_documents: "Yes",
  // The same premise as the pinned 2012-06-01 anchor date, expressed in the
  // coarse bucket the evaluator falls back to. Without it the generic
  // single-select rule would pick the first option, lt_1_year, and record a
  // clearable record as still inside its waiting period — an answer the pinned
  // dates directly contradict.
  resolved_timing_bucket: "gt_10_years"
};

const ANSWER_RULE = {
  clearRecordConstant: "answers pinned above win for their question id",
  multiSelect: "the option matching /^none/i, else the first option",
  singleSelect: "the first option matching /^(no\\b|none|yes)/i, else the first option",
  dateOrUnknown: "2012-06-01",
  numberOrRange: "30",
  yesNo: "Yes",
  fallback: "unknown"
};

function questionIndex(profile) {
  const index = new Map();
  (function walk(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (typeof node.id === "string" && typeof node.type === "string" && (node.prompt || node.label)) {
      if (!index.has(node.id)) index.set(node.id, node);
    }
    Object.values(node).forEach(walk);
  })(projectPublicProfile(profile));
  return index;
}

function answerFor(question, id) {
  if (CLEAR_RECORD[id] !== undefined) return CLEAR_RECORD[id];
  if (!question) return "No";
  if (question.options?.length) {
    if (question.type === "multi_select") {
      return [question.options.find((o) => /^none/i.test(o)) ?? question.options[0]];
    }
    return question.options.find((o) => /^(no\b|none|yes)/i.test(o)) ?? question.options[0];
  }
  if (question.type === "date_or_unknown") return "2012-06-01";
  if (question.type === "number_or_range") return "30";
  if (question.type?.startsWith("yes_no")) return "Yes";
  return "unknown";
}

/** One participant driven to a terminal evaluation, with the whole exchange kept. */
function converge(state, profile, questions, seedAnswers) {
  const answers = { ...seedAnswers };
  const transcript = [];
  for (let round = 0; round < 24; round += 1) {
    let evaluation;
    try {
      evaluation = evaluateAuthoritativeScreeningResult({
        jurisdiction: state,
        profileVersion: profile.profileVersion,
        matterId: "public-witness",
        answers
      }).evaluation;
    } catch (error) {
      if (!error?.invalidQuestionIds?.length) {
        return { answers, transcript, evaluation: null, error: String(error?.message ?? error) };
      }
      // Packet-completion fields are not evaluator questions; drop exactly those.
      for (const id of error.invalidQuestionIds) delete answers[id];
      transcript.push({ round, droppedAsNotEvaluatorQuestions: [...error.invalidQuestionIds].sort() });
      continue;
    }
    const missing = [...(evaluation.missingQuestionIds ?? [])].sort();
    if (missing.length === 0) return { answers, transcript, evaluation, error: null };
    const supplied = {};
    for (const id of missing) {
      answers[id] = answerFor(questions.get(id), id);
      supplied[id] = answers[id];
    }
    transcript.push({ round, requested: missing, supplied });
  }
  return { answers, transcript, evaluation: null, error: "did not settle in 24 rounds" };
}

const byJurisdiction = new Map();
for (const entry of intended) {
  if (!byJurisdiction.has(entry.jurisdiction)) byJurisdiction.set(entry.jurisdiction, []);
  byJurisdiction.get(entry.jurisdiction).push(entry);
}

const witnesses = [];
for (const [code, entries] of [...byJurisdiction.entries()].sort()) {
  const profile = getProfileByJurisdiction(code);
  if (!profile) {
    for (const entry of entries) {
      witnesses.push({ pathwayKey: entry.pathwayKey, jurisdiction: code, pathwayId: entry.pathwayId, reachable: false, error: "no compiled profile" });
    }
    continue;
  }
  const questions = questionIndex(profile);
  const contextOptions = questions.get("possible_pathway_context")?.options ?? [];

  for (const entry of entries.sort((a, b) => a.pathwayKey.localeCompare(b.pathwayKey))) {
    // The one deliberate steer: name the pathway the participant believes
    // applies, when the public profile offers that question. Everything after it
    // is the pinned rule above.
    const context = contextOptions.find((option) => option === entry.pathwayLabel)
      ?? contextOptions.find((option) => typeof option === "string" && option.includes(entry.pathwayLabel))
      ?? null;
    const seedAnswers = { ...CLEAR_RECORD, ...(context ? { possible_pathway_context: context } : {}) };
    const run = converge(code, profile, questions, seedAnswers);

    witnesses.push({
      pathwayKey: entry.pathwayKey,
      jurisdiction: code,
      pathwayId: entry.pathwayId,
      pathwayLabel: entry.pathwayLabel,
      profileVersion: profile.profileVersion,
      publicRoute: `/expungement-ai/screening/${profile.jurisdiction.slug}`,
      evaluationEndpoint: "POST /api/expungement-ai/screening",
      seedAnswers,
      pathwayContextOffered: context,
      rounds: run.transcript,
      finalAnswers: Object.fromEntries(Object.entries(run.answers).sort(([a], [b]) => a.localeCompare(b))),
      terminalEvaluation: run.evaluation
        ? {
          resultCode: run.evaluation.resultCode,
          pathwayId: run.evaluation.pathwayId ?? null,
          pathwayLabel: run.evaluation.pathwayLabel ?? null,
          paymentAllowed: run.evaluation.paymentAllowed === true,
          treatmentClassification: run.evaluation.treatmentClassification ?? null,
          selectedTrackId: run.evaluation.selectedTrackId ?? null,
          reasonCodes: (run.evaluation.reasons ?? []).map((r) => r.code).sort(),
          missingQuestionIds: [...(run.evaluation.missingQuestionIds ?? [])].sort()
        }
        : null,
      landedOnThisPathway: run.evaluation?.pathwayId === entry.pathwayId,
      error: run.error
    });
  }
}

const settled = witnesses.filter((w) => w.terminalEvaluation !== null);
const landed = witnesses.filter((w) => w.landedOnThisPathway);
const resultCodes = {};
for (const w of settled) resultCodes[w.terminalEvaluation.resultCode] = (resultCodes[w.terminalEvaluation.resultCode] ?? 0) + 1;

const packet = {
  schemaVersion: "rcap-public-witness-answer-sets/v1",
  generatedBy: "scripts/generate-rcap-public-witness-answer-sets.mjs",
  determinism: {
    evaluatorToday: process.env.RCAP_EVALUATOR_TODAY,
    randomness: "none",
    answerRule: ANSWER_RULE,
    clearRecord: CLEAR_RECORD,
    note: "Re-running this generator on the same commit reproduces this file byte for byte. --check proves it."
  },
  changesNothing: "Records what the deployed public evaluator does today. No runtime change, no classification, no approval.",
  totals: {
    pathways: witnesses.length,
    settledOnATerminalEvaluation: settled.length,
    landedOnTheirOwnPathway: landed.length,
    terminalResultCodes: resultCodes,
    paymentAllowedAtTheEvaluator: settled.filter((w) => w.terminalEvaluation.paymentAllowed).length
  },
  witnesses
};

const text = JSON.stringify(packet, null, 2) + "\n";
if (CHECK) {
  const current = fs.readFileSync(path.join(rootDir, OUT), "utf8");
  if (current !== text) {
    console.error(`${OUT} is stale or non-deterministic; re-run without --check.`);
    process.exit(1);
  }
  console.log(`public witness answer sets current and deterministic: ${witnesses.length} pathway(s).`);
  process.exit(0);
}
fs.writeFileSync(path.join(rootDir, OUT), text);
console.log(`wrote ${OUT}`);
console.log(`  ${witnesses.length} pathways, ${settled.length} settled, ${landed.length} landed on their own pathway`);
console.log(`  terminal result codes: ${JSON.stringify(resultCodes)}`);
