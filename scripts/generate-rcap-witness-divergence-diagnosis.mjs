#!/usr/bin/env node
// Deterministic reachability evidence for Session A's canonical graph.
//
//   node scripts/generate-rcap-witness-divergence-diagnosis.mjs
//   node scripts/generate-rcap-witness-divergence-diagnosis.mjs --check
//
// Consumes Session A's current canonical pathway-family graph and asks one
// question of each of its 284 intended-paid pathways: can the deployed public
// evaluator, driven only by answers a genuinely clearable record would give,
// actually reach this pathway today?
//
// Two passes, both deterministic and both reproducible:
//
//   baseline   the first-option rule already committed in
//              data/rcap-ledger/public-witness-answer-sets.json
//   corrected  the same clearable record, with the route-selecting questions
//              enumerated in a fixed order instead of taken first-option
//
// The baseline mattered: its rule answered resolved_timing_bucket with the
// FIRST option, which is "lt_1_year" — the least clearable answer in the list —
// so every route with a waiting period failed closed on an anchor it could never
// satisfy. That is a defect in the witness, not in the evaluator, and reporting
// it as a runtime bug would have sent Session A chasing ~92 phantom patches.
// The corrected pass separates the two.
//
// Only what survives the corrected pass is reported as a runtime defect, and
// those are clustered by shared cause so one correction closes a class.
//
// Changes no runtime, no package file and no denominator. Session A owns all
// three.

process.env.RCAP_EVALUATOR_TODAY = process.env.RCAP_EVALUATOR_TODAY ?? "2026-07-01";

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
register("./lib/ts-esm-loader.mjs", import.meta.url);

const CHECK = process.argv.includes("--check");
const SESSION_A_COMMIT = process.env.RCAP_SESSION_A_COMMIT ?? "a28ad8c1c41685eb68f42325ce694679d5db53dd";
const GRAPH_PATH = "data/rcap-ledger/paid-pathway-legal-join.json";

const DIAGNOSIS_OUT = "data/rcap-ledger/witness-divergence-diagnosis.json";
const FIXTURES_OUT = "data/rcap-ledger/public-witness-fixtures.json";
const MD_OUT = "docs/record-clearing/witness-divergence-diagnosis.md";

const read = (p) => fs.readFileSync(path.join(rootDir, p), "utf8");
const readJson = (p) => JSON.parse(read(p));
const sha256 = (v) => crypto.createHash("sha256").update(v).digest("hex");
const git = (args) => execFileSync("git", args, { cwd: rootDir, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });

const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { projectPublicProfile } = await import("../src/lib/rcap-engine/public-profile-projection.ts");
const { evaluateAuthoritativeScreeningResult } = await import("../src/lib/expungement-ai/authoritative-screening-result.ts");

const graphRaw = fs.existsSync(path.join(rootDir, GRAPH_PATH)) ? read(GRAPH_PATH) : git(["show", `${SESSION_A_COMMIT}:${GRAPH_PATH}`]);
const graph = JSON.parse(graphRaw);
const graphSource = fs.existsSync(path.join(rootDir, GRAPH_PATH)) ? "working_tree" : `session_a_commit@${SESSION_A_COMMIT.slice(0, 8)}`;

const baselineWitness = readJson("data/rcap-ledger/public-witness-answer-sets.json");
const baselineByKey = new Map(baselineWitness.witnesses.map((w) => [w.pathwayKey, w]));

// --------------------------------------------------------------------------- the clearable record
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
  record_documents: "Yes"
};

// Options whose ORDER encodes severity or elapsed time. Taking the first option
// is taking the worst one, so these are answered by name.
const ORDERED_PREFERENCE = {
  resolved_timing_bucket: ["gt_10_years", "years_7_to_10", "years_5_to_7", "years_3_to_5", "years_2_to_3", "years_1_to_2"]
};

// The questions that select a route rather than describe the record. These are
// enumerated rather than guessed.
const ROUTE_SELECTING = ["case_outcome", "offense_level", "actual_innocence_basis", "dc_offense_severity_group"];

function questionIndex(profile) {
  const index = new Map();
  (function walk(node) {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (typeof node.id === "string" && typeof node.type === "string" && (node.prompt || node.label) && !index.has(node.id)) index.set(node.id, node);
    Object.values(node).forEach(walk);
  })(projectPublicProfile(profile));
  return index;
}

function clearableAnswer(question, id) {
  if (CLEAR_RECORD[id] !== undefined) return CLEAR_RECORD[id];
  if (!question) return "No";
  if (ORDERED_PREFERENCE[id] && question.options?.length) {
    const pick = ORDERED_PREFERENCE[id].find((o) => question.options.includes(o));
    if (pick) return pick;
  }
  if (question.options?.length) {
    if (question.type === "multi_select") return [question.options.find((o) => /^none/i.test(o)) ?? question.options[0]];
    return question.options.find((o) => /^(no\b|none|yes)/i.test(o)) ?? question.options[0];
  }
  if (question.type === "date_or_unknown") return "2012-06-01";
  if (question.type === "number_or_range") return "30";
  if (question.type?.startsWith("yes_no")) return "Yes";
  return "unknown";
}

function converge(state, profile, questions, seedAnswers, answerFor) {
  const answers = { ...seedAnswers };
  const transcript = [];
  for (let round = 0; round < 24; round += 1) {
    let evaluation;
    try {
      evaluation = evaluateAuthoritativeScreeningResult({ jurisdiction: state, profileVersion: profile.profileVersion, matterId: "reachability", answers }).evaluation;
    } catch (error) {
      if (!error?.invalidQuestionIds?.length) return { answers, transcript, evaluation: null, error: String(error?.message ?? error) };
      for (const id of error.invalidQuestionIds) delete answers[id];
      transcript.push({ round, droppedAsNotEvaluatorQuestions: [...error.invalidQuestionIds].sort() });
      continue;
    }
    const missing = [...(evaluation.missingQuestionIds ?? [])].sort();
    if (missing.length === 0) return { answers, transcript, evaluation, error: null };
    const supplied = {};
    for (const id of missing) { answers[id] = answerFor(questions.get(id), id); supplied[id] = answers[id]; }
    transcript.push({ round, requested: missing, supplied });
  }
  return { answers, transcript, evaluation: null, error: "did not settle in 24 rounds" };
}

/** Deterministic enumeration of the route-selecting answers, in profile order. */
function routeSelectingCombos(questions) {
  const dims = ROUTE_SELECTING
    .map((id) => ({ id, options: questions.get(id)?.options ?? null }))
    .filter((d) => Array.isArray(d.options) && d.options.length > 0);
  if (dims.length === 0) return [{}];
  let combos = [{}];
  for (const dim of dims) {
    const next = [];
    for (const combo of combos) for (const option of dim.options) next.push({ ...combo, [dim.id]: option });
    combos = next;
    if (combos.length > 240) break; // bounded, and the bound is reported
  }
  return combos;
}

// --------------------------------------------------------------------------- run
const byJurisdiction = new Map();
for (const pathway of graph.pathways) {
  if (!byJurisdiction.has(pathway.jurisdiction)) byJurisdiction.set(pathway.jurisdiction, []);
  byJurisdiction.get(pathway.jurisdiction).push(pathway);
}

const records = [];
const fixtures = [];
let combosTried = 0;

for (const [code, pathways] of [...byJurisdiction.entries()].sort()) {
  const profile = getProfileByJurisdiction(code);
  if (!profile) {
    for (const p of pathways) records.push({ pathwayKey: p.pathwayKey, jurisdiction: code, outcome: "non_converging", diagnosis: { firstDivergence: "no compiled profile for the jurisdiction" } });
    continue;
  }
  const questions = questionIndex(profile);
  const contextOptions = questions.get("possible_pathway_context")?.options ?? [];
  const combos = routeSelectingCombos(questions);

  for (const pathway of pathways.sort((a, b) => a.pathwayKey.localeCompare(b.pathwayKey))) {
    const context = contextOptions.find((o) => o === pathway.pathwayLabel)
      ?? contextOptions.find((o) => typeof o === "string" && o.includes(pathway.pathwayLabel))
      ?? null;
    const base = { ...CLEAR_RECORD, ...(context ? { possible_pathway_context: context } : {}) };

    let landed = null;
    const attempts = [];
    for (const combo of combos) {
      combosTried += 1;
      const run = converge(code, profile, questions, { ...base, ...combo }, clearableAnswer);
      attempts.push({ combo, resultCode: run.evaluation?.resultCode ?? null, pathwayId: run.evaluation?.pathwayId ?? null, reasonCodes: (run.evaluation?.reasons ?? []).map((r) => r.code).sort(), error: run.error });
      if (run.evaluation?.pathwayId === pathway.pathwayId) { landed = { combo, run }; break; }
    }

    const settled = attempts.filter((a) => a.resultCode !== null);
    const baselineRun = baselineByKey.get(pathway.pathwayKey) ?? null;

    if (landed) {
      const answers = Object.fromEntries(Object.entries(landed.run.answers).sort(([a], [b]) => a.localeCompare(b)));
      records.push({
        pathwayKey: pathway.pathwayKey,
        jurisdiction: code,
        pathwayId: pathway.pathwayId,
        pathwayLabel: pathway.pathwayLabel,
        sessionADisposition: pathway.disposition,
        outcome: "correct_pathway",
        reachedBy: landed.combo,
        baselineOutcome: baselineRun?.landedOnThisPathway ? "correct_pathway" : (baselineRun?.terminalEvaluation ? "wrong_path" : "non_converging"),
        correctedByFixtureAlone: !baselineRun?.landedOnThisPathway,
        terminalEvaluation: {
          resultCode: landed.run.evaluation.resultCode,
          pathwayId: landed.run.evaluation.pathwayId,
          paymentAllowed: landed.run.evaluation.paymentAllowed === true,
          reasonCodes: (landed.run.evaluation.reasons ?? []).map((r) => r.code).sort()
        },
        combosTried: attempts.length
      });
      fixtures.push({
        pathwayKey: pathway.pathwayKey,
        jurisdiction: code,
        pathwayId: pathway.pathwayId,
        profileVersion: profile.profileVersion,
        publicRoute: `/expungement-ai/screening/${profile.jurisdiction.slug}`,
        evaluationEndpoint: "POST /api/expungement-ai/screening",
        answers,
        rounds: landed.run.transcript,
        expected: {
          pathwayId: landed.run.evaluation.pathwayId,
          resultCode: landed.run.evaluation.resultCode,
          paymentAllowed: landed.run.evaluation.paymentAllowed === true
        }
      });
      continue;
    }

    // ---------------------------------------------------------------- diagnosis
    const allReasons = [...new Set(attempts.flatMap((a) => a.reasonCodes))];
    const normalized = [...new Set(allReasons.map((r) => r.replace(/^[a-z]{2}\./, "")))];
    const actualPathways = [...new Set(attempts.map((a) => a.pathwayId).filter(Boolean))];
    const firstSettled = settled[0] ?? null;

    const repeatedMissing = {};
    for (const round of baselineRun?.rounds ?? []) for (const id of round.requested ?? []) repeatedMissing[id] = (repeatedMissing[id] ?? 0) + 1;

    // A differentiating question is missing when the intended pathway is named
    // by a compiled decision rule whose referenced fields the public projection
    // never asks for.
    const rulesForPathway = (profile.orderedDecisionRules ?? []).filter((r) => (r.candidatePathwayIds ?? []).includes(pathway.pathwayId));
    const referencedFields = [...new Set(rulesForPathway.flatMap((r) => [...(r.when?.fieldsReferenced ?? []), ...(r.when?.requiredFields ?? [])]))];
    const missingDifferentiators = referencedFields.filter((f) => !questions.has(f));

    // A priority conflict is a rule that outranks every rule naming this pathway
    // and that the answer set satisfies by construction.
    const bestPriority = rulesForPathway.length ? Math.min(...rulesForPathway.map((r) => r.priority ?? 1e9)) : null;
    const outranking = (profile.orderedDecisionRules ?? [])
      .filter((r) => bestPriority !== null && (r.priority ?? 1e9) < bestPriority && !(r.candidatePathwayIds ?? []).includes(pathway.pathwayId))
      .slice(0, 5)
      .map((r) => ({ id: r.id, priority: r.priority, candidatePathwayIds: r.candidatePathwayIds ?? [] }));

    const vocabularyMismatch = [];
    for (const round of baselineRun?.rounds ?? []) {
      for (const [id, value] of Object.entries(round.supplied ?? {})) {
        const q = questions.get(id);
        if (!q?.options?.length) continue;
        const values = Array.isArray(value) ? value : [value];
        for (const v of values) if (!q.options.includes(v)) vocabularyMismatch.push({ questionId: id, supplied: v, options: q.options.slice(0, 6) });
      }
    }

    const waitingFailure = normalized.filter((r) => /waiting|timing/.test(r));

    records.push({
      pathwayKey: pathway.pathwayKey,
      jurisdiction: code,
      pathwayId: pathway.pathwayId,
      pathwayLabel: pathway.pathwayLabel,
      sessionADisposition: pathway.disposition,
      outcome: settled.length === 0 ? "non_converging" : "wrong_path",
      baselineOutcome: baselineRun?.landedOnThisPathway ? "correct_pathway" : (baselineRun?.terminalEvaluation ? "wrong_path" : "non_converging"),
      combosTried: attempts.length,
      diagnosis: {
        intendedPathway: pathway.pathwayId,
        actualPathway: actualPathways.length ? actualPathways : null,
        actualResultCodes: [...new Set(attempts.map((a) => a.resultCode).filter(Boolean))],
        firstDivergence: firstSettled
          ? `the evaluator settled on ${firstSettled.pathwayId ?? "no pathway"} with resultCode ${firstSettled.resultCode} while the participant was steered at ${pathway.pathwayId}`
          : "the exchange never settled on a terminal evaluation",
        missingDifferentiatingQuestion: missingDifferentiators.length ? missingDifferentiators : null,
        repeatedMissingFact: Object.entries(repeatedMissing).filter(([, n]) => n > 1).map(([id, n]) => ({ questionId: id, timesRequested: n })),
        waitingRuleFailure: waitingFailure.length ? waitingFailure : null,
        answerVocabularyMismatch: vocabularyMismatch.length ? vocabularyMismatch.slice(0, 5) : null,
        pathwayPriorityConflict: outranking.length ? { intendedRuleBestPriority: bestPriority, outrankedBy: outranking } : null,
        reasonCodes: allReasons,
        normalizedReasonCodes: normalized
      }
    });
  }
}

// --------------------------------------------------------------------------- clusters
// One cause, one correction. A cluster is named by the normalized reason code
// that every member shares, so a fix is scoped to a class rather than a pathway.
const CLUSTER_RULES = [
  { id: "waiting_anchor_never_determined", match: (r) => r.includes("waiting_anchor_not_determined"),
    cause: "The public intake asks whether the sentence is complete but never asks WHEN, so no anchor date exists and every route carrying a waiting period fails closed.",
    correction: "One evaluator/projection correction: supply a waiting-period anchor date from the public intake — an anchor-date question, or accept resolved_timing_bucket as the anchor — so specialRouteTiming can execute instead of failing closed. It is one correction for the whole class, not one per route." },
  { id: "waiting_rule_not_executed", match: (r) => r.includes("waiting_rule_not_executed"),
    cause: "A waiting rule exists for the route but never runs on the supplied facts.",
    correction: "Same class as the anchor defect: execute the route's waiting rule once an anchor is available, rather than returning needs_review." },
  { id: "timing_bucket_unsatisfiable", match: (r) => r.includes("timing_bucket_too_recent") || r.includes("timing_bucket_overlaps_waiting_period"),
    cause: "The coarse timing bucket cannot satisfy the route's waiting period even at its most favourable value.",
    correction: "Either the bucket vocabulary needs a value long enough for the route, or the route needs a real anchor date. Both are the same anchor correction." },
  { id: "selected_pathway_rule_not_matched", match: (r) => r.includes("selected_pathway_rule_not_matched"),
    cause: "The participant named this route and no compiled decision rule matched the supplied facts, so nothing selected it.",
    correction: "The route's compiled decision rule needs the facts the public intake actually collects, or the intake needs the fact the rule references." },
  { id: "compiled_rule_matched_another_route", match: (r) => r.some((x) => x.startsWith("compiled_rule_match.")),
    cause: "A compiled rule matched and selected a different route than the one the participant named.",
    correction: "A pathway-priority decision: either the matched rule should not outrank the named route, or the named route is genuinely unreachable on these facts and Session A should say so." },
  { id: "guidance_only_route", match: (r) => r.includes("guidance_only_no_user_filed_court_petition"),
    cause: "The evaluator classifies the route as guidance with no participant filing.",
    correction: "A classification question for Session A and counsel, not an evaluator patch." }
];

const failing = records.filter((r) => r.outcome !== "correct_pathway");
// A partition, not overlapping tags. A pathway belongs to the first cluster that
// claims it, in the order above, so the counts add up to the failing set and a
// cluster means "fix this and these pathways are done" rather than "these
// pathways mention this".
const clusterMembers = new Map(CLUSTER_RULES.map((r) => [r.id, []]));
const unclustered = [];
for (const record of failing) {
  const codes = record.diagnosis?.normalizedReasonCodes ?? [];
  const rule = CLUSTER_RULES.find((r) => r.match(codes));
  if (rule) clusterMembers.get(rule.id).push(record);
  else unclustered.push(record);
}
const clusters = CLUSTER_RULES.map((rule) => {
  const members = clusterMembers.get(rule.id);
  const alsoCarrying = [...new Set(members.flatMap((m) => m.diagnosis?.normalizedReasonCodes ?? []))].sort();
  return {
    id: rule.id,
    cause: rule.cause,
    exactSharedRuntimeCorrection: rule.correction,
    pathways: members.length,
    jurisdictions: [...new Set(members.map((m) => m.jurisdiction))].sort(),
    secondaryReasonCodesSeenInThisCluster: alsoCarrying,
    pathwayKeys: members.map((m) => m.pathwayKey).sort()
  };
}).filter((c) => c.pathways > 0);

const outcomes = records.reduce((m, r) => { m[r.outcome] = (m[r.outcome] ?? 0) + 1; return m; }, {});
const correctedByFixture = records.filter((r) => r.outcome === "correct_pathway" && r.correctedByFixtureAlone).length;

const diagnosis = {
  schemaVersion: "rcap-witness-divergence-diagnosis/v1",
  generatedBy: "scripts/generate-rcap-witness-divergence-diagnosis.mjs",
  canonicalGraph: { path: GRAPH_PATH, source: graphSource, sha256: sha256(graphRaw), pathways: graph.pathways.length, dispositions: graph.counts ?? null },
  createsNoDenominator: "The pathway set is Session A's graph, consumed as-is. No pathway is added, dropped or reclassified here.",
  changesNoRuntime: true,
  determinism: { evaluatorToday: process.env.RCAP_EVALUATOR_TODAY, randomness: "none", routeSelectingEnumerationBound: 240, combosTried },
  passes: {
    baseline: "the committed first-option rule in data/rcap-ledger/public-witness-answer-sets.json",
    corrected: "the same clearable record, with resolved_timing_bucket answered by elapsed-time preference and the route-selecting questions enumerated in profile order"
  },
  baselineWasWrongAboutItself:
    "The baseline rule answered resolved_timing_bucket with the first option, lt_1_year — the least clearable value in the list — so every route with a waiting period failed closed on an anchor it could never satisfy. Those were witness defects, not evaluator defects. Reporting them as runtime bugs would have sent Session A after roughly 92 patches that do not exist.",
  totals: {
    pathways: records.length,
    ...outcomes,
    baselineOutcomes: records.reduce((m, r) => { m[r.baselineOutcome] = (m[r.baselineOutcome] ?? 0) + 1; return m; }, {}),
    correctedByFixtureAlone: correctedByFixture,
    failing: failing.length,
    clusters: clusters.length,
    unclustered: unclustered.length,
    clusterPartitionSumsToFailing: clusters.reduce((n, c) => n + c.pathways, 0) + unclustered.length === failing.length
  },
  clusters,
  unclusteredFailures: unclustered.map((r) => ({ pathwayKey: r.pathwayKey, reasonCodes: r.diagnosis?.normalizedReasonCodes ?? [] })),
  records
};

const fixturePacket = {
  schemaVersion: "rcap-public-witness-fixtures/v1",
  generatedBy: "scripts/generate-rcap-witness-divergence-diagnosis.mjs",
  purpose: "A deterministic, replayable fixture for every pathway the existing runtime can already reach correctly. Each carries the exact answer map and the terminal result it must produce, so a regression shows up as a fixture failure rather than as a lost route.",
  changesNoRuntime: true,
  evaluatorToday: process.env.RCAP_EVALUATOR_TODAY,
  canonicalGraphSha256: sha256(graphRaw),
  totals: { fixtures: fixtures.length, correctedByFixtureAlone: correctedByFixture },
  fixtures
};

function md() {
  const l = [];
  l.push("# Witness divergence diagnosis");
  l.push("");
  l.push(`All **${records.length}** intended-paid pathways from Session A's canonical graph (\`${sha256(graphRaw).slice(0, 16)}…\`).`);
  l.push("");
  l.push("| Outcome | Pathways |");
  l.push("|---|---|");
  for (const k of ["correct_pathway", "wrong_path", "non_converging"]) l.push(`| \`${k}\` | ${outcomes[k] ?? 0} |`);
  l.push("");
  l.push("## The baseline was wrong about itself");
  l.push("");
  l.push("The committed witness answered `resolved_timing_bucket` with the **first** option,");
  l.push("`lt_1_year` — the least clearable value in a list ordered shortest to longest. Every route");
  l.push("carrying a waiting period therefore failed closed on an anchor it could never satisfy.");
  l.push("");
  l.push(`**${correctedByFixture}** pathways move from wrong-path to correct once the witness answers like a`);
  l.push("genuinely clearable record. Those were never runtime defects, and reporting them as such");
  l.push("would have sent Session A after patches that do not exist.");
  l.push("");
  l.push("## Shared defect clusters");
  l.push("");
  l.push("What survives the corrected pass, grouped by cause. One correction per cluster.");
  l.push("");
  l.push("Each pathway belongs to exactly one cluster, so the counts add up to the failing set and");
  l.push("a cluster means \"fix this and these are done\".");
  l.push("");
  l.push("| Cluster | Pathways | Jurisdictions |");
  l.push("|---|---|---|");
  for (const c of clusters.sort((a, b) => b.pathways - a.pathways)) l.push(`| \`${c.id}\` | ${c.pathways} | ${c.jurisdictions.length} |`);
  if (unclustered.length) l.push(`| _(unclustered)_ | ${unclustered.length} | — |`);
  l.push("");
  for (const c of clusters) {
    l.push(`### \`${c.id}\` — ${c.pathways} pathway(s)`);
    l.push("");
    l.push(`**Cause.** ${c.cause}`);
    l.push("");
    l.push(`**Exact shared runtime correction.** ${c.exactSharedRuntimeCorrection}`);
    l.push("");
  }
  l.push("## Fixtures");
  l.push("");
  l.push(`\`data/rcap-ledger/public-witness-fixtures.json\` carries **${fixtures.length}** replayable fixtures — every`);
  l.push("pathway the existing runtime already reaches, with the exact answers and the terminal");
  l.push("result each must produce. A regression shows up as a fixture failure rather than a lost route.");
  l.push("");
  l.push("Regenerate with `node scripts/generate-rcap-witness-divergence-diagnosis.mjs`.");
  return l.join("\n") + "\n";
}

const diagText = JSON.stringify(diagnosis, null, 2) + "\n";
const fixText = JSON.stringify(fixturePacket, null, 2) + "\n";
const mdText = md();

if (CHECK) {
  const problems = [];
  if (read(DIAGNOSIS_OUT) !== diagText) problems.push(`${DIAGNOSIS_OUT} is stale.`);
  if (read(FIXTURES_OUT) !== fixText) problems.push(`${FIXTURES_OUT} is stale.`);
  if (read(MD_OUT) !== mdText) problems.push(`${MD_OUT} is stale.`);
  if (problems.length) { console.error(problems.join("\n")); process.exit(1); }
  console.log(`witness divergence diagnosis current: ${records.length} pathway(s), ${fixtures.length} fixture(s).`);
  process.exit(0);
}

fs.writeFileSync(path.join(rootDir, DIAGNOSIS_OUT), diagText);
fs.writeFileSync(path.join(rootDir, FIXTURES_OUT), fixText);
fs.writeFileSync(path.join(rootDir, MD_OUT), mdText);
console.log(`wrote ${DIAGNOSIS_OUT}, ${FIXTURES_OUT} and ${MD_OUT}`);
console.log(`  graph: ${graphSource}, ${graph.pathways.length} pathways`);
console.log(`  outcomes: ${JSON.stringify(outcomes)}`);
console.log(`  corrected by fixture alone: ${correctedByFixture}`);
console.log(`  clusters: ${clusters.map((c) => `${c.id}=${c.pathways}`).join(", ")}; unclustered ${unclustered.length}`);
console.log(`  combos tried: ${combosTried}`);
