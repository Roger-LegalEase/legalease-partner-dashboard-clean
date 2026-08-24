#!/usr/bin/env node
// Can a participant reach each remedy using ONLY the screens the flow renders?
//
//   node scripts/expungement-ai/flow-audit/build-ui-reachability.mjs
//   node scripts/expungement-ai/flow-audit/build-ui-reachability.mjs --check
//
// The repository's existing witness ledger seeds facts a real participant is
// never asked (`financial_obligations`, `pending_cases`, `sentence_completion_date`,
// `special_preconditions_confirmed`, `new_convictions_during_waiting_period`,
// `record_documents` are absent from most states' rendered screen sets). A route
// that is reachable only with those seeds is reachable to the ledger and not to
// a person. This probe closes that gap: it answers ONLY rendered screens.
//
// Search: for each (jurisdiction, pathway-context option) a deterministic
// best-first sweep over the rendered screens. Every screen's options are tried in
// profile order, the option with the best result rank is kept, and the sweep runs
// a fixed number of passes. No randomness, no time dependence — the same commit
// reproduces the same answer.
//
// A negative result is bounded, not absolute: it means this bounded deterministic
// search found no packet-ready answer set. That is recorded as
// `notFoundByBoundedSearch`, never as "impossible".

import {
  read, gitSha, writeArtifact, stableJson, EVALUATOR_TODAY,
  getAllJurisdictionProfiles, projectPublicProfile, deriveScreens,
  evaluateAuthoritativeScreeningResult, questionIndex, answerFor
} from "./lib/engine.mjs";

const CHECK = process.argv.includes("--check");
const OUT = "data/expungement-ai/flow-audit/ui-reachability.json";
const PASSES = 3;

/** Better is lower. Ties break on the earlier profile option, never on chance. */
const RESULT_RANK = {
  packet_ready: 0,
  packet_ready_with_caution: 1,
  needs_more_info: 2,
  not_yet: 3,
  needs_review: 4,
  guidance_only: 5,
  likely_not_eligible: 6,
  hard_stop: 7,
  evaluator_error: 8
};

const YES_NO_UNSURE_OPTIONS = ["Yes", "No", "I am not sure"];
const YES_NO_PREFER_NOT_OPTIONS = ["Yes", "No", "Prefer not to say"];

function candidateValues(question) {
  if (question.type === "yes_no_unsure") return YES_NO_UNSURE_OPTIONS;
  if (question.type === "yes_no_prefer_not_to_say") return YES_NO_PREFER_NOT_OPTIONS;
  if (Array.isArray(question.options) && question.options.length > 0) {
    return question.type === "multi_select" ? question.options.map((o) => [o]) : question.options;
  }
  if (question.type === "number_or_range") return ["30", "18", "I am not sure"];
  if (question.type === "date_or_unknown") return ["2012-06-01", "2024-01-15"];
  return ["typed record wording", "I am not sure"];
}

let evaluationCount = 0;
let observedTerminals = new Set();
function evaluate(code, profile, answers) {
  evaluationCount += 1;
  try {
    const evaluation = evaluateAuthoritativeScreeningResult({
      jurisdiction: code,
      profileVersion: profile.profileVersion,
      matterId: "expai-ui-reachability",
      answers
    }).evaluation;
    observedTerminals.add(evaluation.resultCode);
    return {
      resultCode: evaluation.resultCode,
      pathwayId: evaluation.pathwayId ?? null,
      paymentAllowed: evaluation.paymentAllowed === true,
      missingQuestionIds: [...(evaluation.missingQuestionIds ?? [])].sort()
    };
  } catch (error) {
    return { resultCode: "evaluator_error", pathwayId: null, paymentAllowed: false, missingQuestionIds: [], error: String(error?.message ?? error).slice(0, 200) };
  }
}

function betterThan(a, b) {
  const rankA = RESULT_RANK[a.resultCode] ?? 9;
  const rankB = RESULT_RANK[b.resultCode] ?? 9;
  if (rankA !== rankB) return rankA < rankB;
  if (a.paymentAllowed !== b.paymentAllowed) return a.paymentAllowed;
  return a.missingQuestionIds.length < b.missingQuestionIds.length;
}

const jurisdictionRows = [];
const remedyRows = [];

for (const profile of getAllJurisdictionProfiles().slice().sort((a, b) => a.jurisdiction.code.localeCompare(b.jurisdiction.code))) {
  const code = profile.jurisdiction.code;
  const publicProfile = projectPublicProfile(profile);
  const screens = deriveScreens(publicProfile);
  const index = questionIndex(publicProfile);
  const contextQuestion = index.get("possible_pathway_context");
  const contextOptions = contextQuestion?.options?.length ? contextQuestion.options : [null];

  const pinned = {};
  for (const question of screens) pinned[question.id] = answerFor(index.get(question.id), question.id);

  let jurisdictionBest = null;

  for (const context of contextOptions) {
    let answers = { ...pinned };
    if (context !== null) answers.possible_pathway_context = context;
    observedTerminals = new Set();
    let current = evaluate(code, profile, answers);

    for (let pass = 0; pass < PASSES; pass += 1) {
      let improvedThisPass = false;
      for (const question of screens) {
        if (question.id === "possible_pathway_context" && context !== null) continue;
        const held = answers[question.id];
        let bestValue = held;
        let bestResult = current;
        for (const value of candidateValues(question)) {
          const trial = { ...answers, [question.id]: value };
          const result = evaluate(code, profile, trial);
          if (betterThan(result, bestResult)) {
            bestResult = result;
            bestValue = value;
          }
        }
        if (bestValue !== held) {
          answers = { ...answers, [question.id]: bestValue };
          current = bestResult;
          improvedThisPass = true;
        }
      }
      if (!improvedThisPass) break;
    }

    const packetReady = current.resultCode === "packet_ready" || current.resultCode === "packet_ready_with_caution";
    const row = {
      jurisdiction: code,
      pathwayContextOption: context,
      bestTerminalResultCode: current.resultCode,
      bestPathwayId: current.pathwayId,
      paymentAllowed: current.paymentAllowed,
      packetReadyReachableFromRenderedScreensOnly: packetReady,
      missingQuestionIdsAtBest: current.missingQuestionIds,
      missingQuestionIdsTheFlowNeverRenders: current.missingQuestionIds.filter((id) => !screens.some((q) => q.id === id)),
      terminalsObservedAnywhereInThisSearch: [...observedTerminals].sort(),
      packetReadySeenAnywhereInThisSearch: [...observedTerminals].some((t) => t === "packet_ready" || t === "packet_ready_with_caution"),
      answerSet: Object.fromEntries(Object.entries(answers).sort(([a], [b]) => a.localeCompare(b))),
      searchBound: `best-first over ${screens.length} rendered screen(s), ${PASSES} pass(es), deterministic option order`
    };
    remedyRows.push(row);
    if (!jurisdictionBest || betterThan(current, jurisdictionBest.result)) {
      jurisdictionBest = { result: current, context };
    }
  }

  const jurisdictionRemedies = remedyRows.filter((r) => r.jurisdiction === code);
  jurisdictionRows.push({
    jurisdiction: code,
    name: profile.jurisdiction.name,
    renderedScreens: screens.length,
    renderedScreenIds: screens.map((q) => q.id),
    compiledPathways: profile.pathways.length,
    pathwayContextOptionsOffered: contextOptions.filter(Boolean).length,
    bestTerminalResultCode: jurisdictionBest?.result.resultCode ?? "evaluator_error",
    bestPathwayId: jurisdictionBest?.result.pathwayId ?? null,
    paymentReachableFromRenderedScreensOnly: jurisdictionBest?.result.paymentAllowed === true,
    packetReadyReachableFromRenderedScreensOnly: ["packet_ready", "packet_ready_with_caution"].includes(jurisdictionBest?.result.resultCode ?? ""),
    remedyContextsSearched: jurisdictionRemedies.length,
    remedyContextsReachingPacketReady: jurisdictionRemedies.filter((r) => r.packetReadyReachableFromRenderedScreensOnly).length,
    factsTheEvaluatorUsesThatTheFlowNeverRenders: [
      "financial_obligations", "new_convictions_during_waiting_period", "pending_cases",
      "record_documents", "sentence_completion_date", "special_preconditions_confirmed"
    ].filter((id) => !screens.some((q) => q.id === id) && publicProfile.questions.some((q) => q.id === id))
  });
}

const reachability = {
  schemaVersion: "expai-ui-reachability/v1",
  generatedBy: "scripts/expungement-ai/flow-audit/build-ui-reachability.mjs",
  baseSha: gitSha("origin/main"),
  evaluatorToday: EVALUATOR_TODAY,
  changesNoProductBehavior: true,
  question: "Holding the audit to answers a participant can actually give on a rendered screen, which jurisdictions and remedy contexts can reach a packet-ready outcome, and which can reach payment?",
  boundedSearchDisclaimer: "A jurisdiction reported as not reaching packet-ready was not reached by THIS bounded deterministic search. That is evidence of a reachability problem, not a proof of impossibility.",
  totals: {
    jurisdictions: jurisdictionRows.length,
    evaluations: evaluationCount,
    remedyContextsSearched: remedyRows.length,
    remedyContextsReachingPacketReady: remedyRows.filter((r) => r.packetReadyReachableFromRenderedScreensOnly).length,
    remedyContextsWherePacketReadyWasSeenAnywhereInTheSearch: remedyRows.filter((r) => r.packetReadySeenAnywhereInThisSearch).length,
    jurisdictionsReachingPacketReady: jurisdictionRows.filter((j) => j.packetReadyReachableFromRenderedScreensOnly).length,
    jurisdictionsReachingPayment: jurisdictionRows.filter((j) => j.paymentReachableFromRenderedScreensOnly).length,
    jurisdictionsNotReachingPacketReady: jurisdictionRows.filter((j) => !j.packetReadyReachableFromRenderedScreensOnly).map((j) => j.jurisdiction),
    jurisdictionsReachingPacketReadyButNotPayment: jurisdictionRows.filter((j) => j.packetReadyReachableFromRenderedScreensOnly && !j.paymentReachableFromRenderedScreensOnly).map((j) => j.jurisdiction)
  },
  jurisdictions: jurisdictionRows,
  remedyContexts: remedyRows
};

const text = stableJson(reachability);
if (CHECK) {
  if (read(OUT) !== text) {
    console.error(`${OUT} is stale or non-deterministic; re-run without --check.`);
    process.exit(1);
  }
  console.log(`ui reachability current and deterministic: ${jurisdictionRows.length} jurisdiction(s).`);
  process.exit(0);
}
const written = writeArtifact(OUT, text);
console.log(`wrote ${written.path} (${written.bytes} bytes)`);
console.log(`  evaluations: ${evaluationCount}`);
console.log(`  jurisdictions reaching packet-ready from rendered screens only: ${reachability.totals.jurisdictionsReachingPacketReady}/51`);
console.log(`  jurisdictions reaching payment: ${reachability.totals.jurisdictionsReachingPayment}/51`);
console.log(`  not reaching packet-ready: ${reachability.totals.jurisdictionsNotReachingPacketReady.join(",") || "(none)"}`);
