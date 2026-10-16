#!/usr/bin/env node
// Deterministic public witness answer sets, one per intended-paid pathway.
//
//   node scripts/generate-rcap-public-witness-answer-sets.mjs
//   node scripts/generate-rcap-public-witness-answer-sets.mjs --check
//   node scripts/generate-rcap-public-witness-answer-sets.mjs --output /absolute/private/file.json
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
// This changes no runtime and decides nothing. It records what the current local
// evaluator does under these synthetic premises.

process.env.RCAP_EVALUATOR_TODAY = process.env.RCAP_EVALUATOR_TODAY ?? "2026-07-01";

import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
register("./lib/ts-esm-loader.mjs", import.meta.url);

const CHECK = process.argv.includes("--check");
const OUT = "data/rcap-ledger/public-witness-answer-sets.json";
const args = process.argv.slice(2);
const separateOutput = args.length === 2 && args[0] === "--output";
if (!(args.length === 0 || args.length === 1 && args[0] === "--check" || separateOutput)
  || separateOutput && !path.isAbsolute(args[1])) {
  throw new Error("Usage: generator [--check | --output ABSOLUTE_PATH]; --output is write-only and cannot be combined with --check.");
}
const outputPath = separateOutput ? args[1] : path.join(rootDir, OUT);


const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");
const { evaluateAuthoritativeScreeningResult } = await import("../src/lib/expungement-ai/authoritative-screening-result.ts");

const closure = JSON.parse(fs.readFileSync(path.join(rootDir, "data/rcap-ledger/sellable-pathway-closure.json"), "utf8"));
const intended = closure.pathways.filter((p) => p.category === "paid_packet_intended");

// Historical generic synthetic premises, not facts of a real participant and
// not a promise that every legal route fits this record. Keep their unresolved
// counterexamples; source-bound variants below are explicitly separate.
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

// These six additional factual examples come from existing targeted tests.
// They do not replace the historical generic record or turn missing facts into
// real participant facts. Expected outcomes are separate from observed results.
const CA_CONDUCT_PREMISE = {
  case_outcome: "Felony conviction", offense_level: "Felony", charge: "HSC11357", court: "California trial court",
  ca_prop64_record_section: "11357", ca_prop64_next_step: "apply",
  ca_prop64_offense_date: "2000-01-01", ca_prop64_age_at_offense: 21,
  ca_prop64_court_type: "adult", ca_prop64_existing_relief: "none",
  ca_prop64_substance: "flower", ca_prop64_flower_grams: 28.5,
  ca_prop64_possession_context: "ordinary"
};
const MS_COMPLETED_PROGRAM_PREMISE = {
  case_outcome: "Diversion, deferred disposition, supervision, or similar program",
  ms_program_record_status: "completed_and_closed", ms_program_final_disposition: "dismissed_and_closed",
  court_requirements_completed: "yes", ms_program_arrest_release: "arrested_and_released"
};
const SOURCE_BOUND_PREMISES = {
  "CA:prop-64-currently-serving-petition-11361-8": {
    references: ["scripts/test-ca-prop64-integration.mjs", "scripts/fixtures/ca-prop64-protected-baseline/currently-serving.json", "src/lib/rcap-engine/california-prop64-facts.ts"],
    facts: { ...CA_CONDUCT_PREMISE, sentence_completion_date: "No", ca_prop64_branch: "currently-serving petition", ca_prop64_relief_requested: "dismissal and sealing" },
    expectedResultCodes: ["packet_ready_with_caution"]
  },
  "CA:prop-64-completed-sentence-application-11361-8": {
    references: ["scripts/test-ca-prop64-integration.mjs", "scripts/fixtures/ca-prop64-protected-baseline/completed.json", "src/lib/rcap-engine/california-prop64-facts.ts"],
    facts: { ...CA_CONDUCT_PREMISE, sentence_completion_date: "Yes", ca_prop64_branch: "completed-sentence application", ca_prop64_relief_requested: "dismissal/sealing" },
    expectedResultCodes: ["packet_ready"]
  },
  "GA:restriction-and-sealing-of-a-pardoned-felony": {
    references: ["scripts/test-ga-pardon-facts.mjs", "src/lib/rcap-engine/georgia-pardon-facts.ts"],
    facts: { case_outcome: "Misdemeanor conviction", offense_level: "Misdemeanor", ga_original_first_offender: "no", ga_record_help: "pardon_record", pardon_status: "Yes", ga_board_pardon: "yes", ga_pardon_date: "2021-01-02", ga_pardoned_offense_section: "16-8-14(a)", ga_convictions_since_pardon: "none", ga_pardon_pending_charges: "no" },
    expectedResultCodes: ["needs_review"]
  },
  "MS:nonadjudication-under-99-15-26": {
    references: ["scripts/test-ms-program-completion-events.mjs", "src/lib/rcap-engine/mississippi-program-completion.ts"],
    facts: { ...MS_COMPLETED_PROGRAM_PREMISE, ms_program_order: "99-15-26" }, expectedResultCodes: ["packet_ready_with_caution"]
  },
  "MS:pretrial-intervention-or-diversion-expungement": {
    references: ["scripts/test-ms-program-completion-events.mjs", "src/lib/rcap-engine/mississippi-program-completion.ts"],
    facts: { ...MS_COMPLETED_PROGRAM_PREMISE, ms_program_order: "99-15-101" }, expectedResultCodes: ["packet_ready_with_caution"]
  },
  "MS:first-offense-controlled-substance-conditional-discharge-relief": {
    references: ["scripts/test-ms-conditional-discharge-event.mjs", "src/lib/rcap-engine/mississippi-conditional-discharge.ts"],
    facts: { ...MS_COMPLETED_PROGRAM_PREMISE, ms_program_order: "41-29-150", ms_program_final_disposition: "discharged_and_dismissed", ms_drug_subsection: "41-29-139(c)", ms_prior_drug_conviction: "no", ms_prior_conditional_discharge: "no", ms_adjudication_deferred: "yes", discharge_date: "2012-06-01" },
    expectedResultCodes: ["packet_ready", "packet_ready_with_caution", "needs_review"]
  }
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

/** One synthetic input exchange, settled or explicitly unresolved, kept in full. */
function converge(state, profile, questions, seedAnswers, explicitPremises = {}) {
  const answers = { ...seedAnswers };
  const transcript = [];
  let lastEvaluation = null;
  const seenAnswers = new Set();
  for (let round = 0; round < 24; round += 1) {
    const answerState = JSON.stringify(Object.entries(answers).sort(([a], [b]) => a.localeCompare(b)));
    if (seenAnswers.has(answerState)) return { answers, transcript, evaluation: null, unresolvedEvaluation: lastEvaluation,
      convergenceStatus: "unresolved_repeated_answer_state", error: "Synthetic answers returned to a previously unresolved state." };
    seenAnswers.add(answerState);
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
        return { answers, transcript, evaluation: null, unresolvedEvaluation: lastEvaluation, convergenceStatus: "evaluation_error", error: String(error?.message ?? error) };
      }
      // Packet-completion fields are not evaluator questions; drop exactly those.
      for (const id of error.invalidQuestionIds) delete answers[id];
      transcript.push({ round, droppedAsNotEvaluatorQuestions: [...error.invalidQuestionIds].sort() });
      continue;
    }
    lastEvaluation = evaluation;
    const missing = [...(evaluation.missingQuestionIds ?? [])].sort();
    if (missing.length === 0) return { answers, transcript, evaluation, error: null };
    const supplied = Object.fromEntries(missing.map(id => [id, Object.hasOwn(explicitPremises, id) ? explicitPremises[id] : answerFor(questions.get(id), id)]));
    const changed = missing.some(id => JSON.stringify(answers[id]) !== JSON.stringify(supplied[id]));
    transcript.push({ round, requested: missing, supplied });
    if (!changed) return { answers, transcript, evaluation: null, unresolvedEvaluation: evaluation,
      convergenceStatus: "unresolved_unchanged_answers", error: "Required facts remain unresolved under these exact synthetic premises." };
    Object.assign(answers, supplied);
  }
  return { answers, transcript, evaluation: null, unresolvedEvaluation: lastEvaluation,
    convergenceStatus: "unresolved_iteration_limit", error: "did not settle in 24 rounds" };
}

function unresolvedFields(run) {
  return run.error ? {
    convergenceStatus: run.convergenceStatus,
    unresolvedEvaluation: run.unresolvedEvaluation ?? null
  } : {};
}
function sourceBoundWitness(entry, profile, questions, seedAnswers) {
  const premise = SOURCE_BOUND_PREMISES[entry.pathwayKey];
  if (!premise) return {};
  const seed = { ...seedAnswers, ...premise.facts };
  const run = converge(entry.jurisdiction, profile, questions, seed, premise.facts);
  return { sourceBoundSyntheticWitness: {
    kind: "new_synthetic_factual_example_not_historical_or_participant_evidence",
    references: premise.references.map(file => ({ file, sha256: createHash("sha256").update(fs.readFileSync(path.join(rootDir, file))).digest("hex") })),
    explicitPremises: premise.facts,
    expectedTreatment: { pathwayId: entry.pathwayId, resultCodes: premise.expectedResultCodes, qualification: "Existing targeted legal-rule expectation; this does not establish a current commercial offer, document acceptance or authenticated delivery." },
    seedAnswers: seed, rounds: run.transcript, finalAnswers: Object.fromEntries(Object.entries(run.answers).sort(([a], [b]) => a.localeCompare(b))),
    convergenceStatus: run.convergenceStatus ?? (run.evaluation ? "settled_observation" : "evaluation_error"),
    actualEvaluation: run.evaluation ?? run.unresolvedEvaluation ?? null,
    error: run.error
  } };
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
      ...unresolvedFields(run),
      ...(code === "AR" ? { syntheticOriginPremise: { value: run.answers.ar_record_origin ?? null, basis: "The generic first-option rule supplies an explicit Arkansas origin for this NEW synthetic example. It is not inferred from a historical State/local, residence or venue answer; old missing-origin witnesses remain separate." } } : {}),
      ...sourceBoundWitness(entry, profile, questions, seedAnswers),
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
  changesNothing: "Records the current local evaluator under explicit synthetic premises. No hosted observation, participant fact, runtime change, classification, approval or commercial authority is established.",
  totals: {
    pathways: witnesses.length,
    settledOnATerminalEvaluation: settled.length,
    unresolvedPathways: witnesses.filter(w => w.convergenceStatus).length,
    additionalSourceBoundSyntheticWitnesses: witnesses.filter(w => w.sourceBoundSyntheticWitness).length,
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
fs.writeFileSync(outputPath, text, separateOutput ? { flag: "wx", mode: 0o600 } : undefined);
console.log(`wrote ${separateOutput ? outputPath : OUT}`);
console.log(`  ${witnesses.length} pathways, ${settled.length} settled, ${landed.length} landed on their own pathway`);
console.log(`  terminal result codes: ${JSON.stringify(resultCodes)}`);
