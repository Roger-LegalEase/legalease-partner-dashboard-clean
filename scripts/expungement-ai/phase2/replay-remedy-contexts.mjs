#!/usr/bin/env node
/**
 * Per-route proof for the 13 corrected waiting-rule bindings.
 *
 * The jurisdiction baseline walks one converged answer set per state, which does
 * not reach every remedy. This replays the SAME participant the Phase 1B
 * reconciliation used for E3/E4 — the best-ranked remedy context from
 * ui-reachability.json, plus the shared facts the flow did not render at base —
 * through the corrected evaluator, and records what each corrected route now
 * returns for that exact participant.
 *
 * No override is supplied. The route resolves its waiting rule through the
 * binding table on its own.
 */
import {
  getProfileByJurisdiction, projectPublicProfile, evaluateAuthoritativeScreeningResult,
  CLEAR_RECORD, gitSha, readJson, writeArtifact, stableJson
} from "../flow-audit/lib/engine.mjs";

const OUT = process.argv[2] ?? "data/expungement-ai/phase2/remedy-context-replay-after.json";
const reach = readJson("data/expungement-ai/flow-audit/ui-reachability.json");
const recon = readJson("data/expungement-ai/flow-audit/reachability-reconciliation.json");
const evidence = readJson("data/expungement-ai/phase2/waiting-rule-binding-evidence.json");
const TARGETS = recon.totals.technicalReachabilityDefects;

const SHARED_UNRENDERED_FACTS = [
  "financial_obligations", "pending_cases", "sentence_completion_date",
  "special_preconditions_confirmed", "new_convictions_during_waiting_period", "record_documents"
];
const TIMING_COMPLETION_GATE_FIELDS = [
  "court_requirements_completed", "sentence_completion_date", "financial_obligations",
  "pending_cases", "new_convictions_during_waiting_period", "resolved_timing_bucket"
];
const RANK = { packet_ready: 0, packet_ready_with_caution: 1, needs_more_info: 2, not_yet: 3, needs_review: 4, guidance_only: 5, likely_not_eligible: 6, hard_stop: 7 };

function e3AnswersFor(code, publicProfile) {
  const contexts = (reach.remedyContexts ?? []).filter((context) => context.jurisdiction === code);
  const best = contexts.slice().sort((a, b) => (RANK[a.bestTerminalResultCode] ?? 9) - (RANK[b.bestTerminalResultCode] ?? 9))[0];
  const answers = { ...(best?.answerSet ?? {}) };
  const declares = (id) => (publicProfile.questions ?? []).some((question) => question.id === id);
  for (const id of SHARED_UNRENDERED_FACTS) if (declares(id)) answers[id] = CLEAR_RECORD[id];
  for (const id of TIMING_COMPLETION_GATE_FIELDS) if (declares(id)) answers[id] = CLEAR_RECORD[id];
  return { answers, contextOption: best?.pathwayContextOption ?? null };
}

/**
 * The projection now renders facts the base did not, and withdraws none that an
 * answer set can carry — but a recorded answer set may still name an id this
 * head does not publish. Dropping exactly the ids the evaluator itself rejects
 * is the same reconciliation the audit harness performs.
 */
function evaluate(code, profile, seed) {
  let answers = { ...seed };
  const dropped = [];
  for (let round = 0; round < 8; round += 1) {
    try {
      return {
        evaluation: evaluateAuthoritativeScreeningResult({
          jurisdiction: code, profileVersion: profile.profileVersion,
          matterId: "expai-phase2-replay", answers
        }).evaluation,
        droppedAsNotPublicQuestions: dropped.sort()
      };
    } catch (error) {
      if (!error?.invalidQuestionIds?.length) return { error: String(error?.message ?? error), droppedAsNotPublicQuestions: dropped.sort() };
      const next = { ...answers };
      for (const id of error.invalidQuestionIds) { delete next[id]; dropped.push(id); }
      answers = next;
    }
  }
  return { error: "did not settle", droppedAsNotPublicQuestions: dropped.sort() };
}

const evidenceByCode = new Map((evidence.jurisdictions ?? []).map((entry) => [entry.jurisdiction, entry]));
const rows = [];
for (const code of TARGETS) {
  const profile = getProfileByJurisdiction(code);
  const publicProfile = projectPublicProfile(profile);
  const { answers, contextOption } = e3AnswersFor(code, publicProfile);
  const { evaluation, error, droppedAsNotPublicQuestions } = evaluate(code, profile, answers);
  const recorded = evidenceByCode.get(code)?.before ?? null;
  rows.push({
    jurisdiction: code,
    remedyContextOption: contextOption,
    intendedPathwayIds: evidenceByCode.get(code)?.intendedPathwayIds ?? [],
    before: recorded,
    after: error
      ? { error }
      : {
          resultCode: evaluation.resultCode,
          pathwayId: evaluation.pathwayId,
          paymentAllowed: evaluation.paymentAllowed,
          reasonCodes: (evaluation.reasons ?? []).map((reason) => reason.code),
          missingQuestionIds: [...(evaluation.missingQuestionIds ?? [])].sort()
        },
    droppedAsNotPublicQuestions,
    pathwayUnchanged: !error && (recorded?.pathwayId ?? null) === (evaluation.pathwayId ?? null),
    terminalMoved: !error && (recorded?.resultCode ?? null) !== (evaluation.resultCode ?? null),
    paymentMoved: !error && (recorded?.paymentAllowed ?? null) !== (evaluation.paymentAllowed ?? null)
  });
}

const totals = {
  routes: rows.length,
  terminalMoved: rows.filter((row) => row.terminalMoved).length,
  paymentOpened: rows.filter((row) => row.paymentMoved && row.after?.paymentAllowed === true).length,
  paymentClosed: rows.filter((row) => row.paymentMoved && row.after?.paymentAllowed === false).length,
  pathwayChanged: rows.filter((row) => !row.pathwayUnchanged).length,
  errors: rows.filter((row) => row.after?.error).length
};

writeArtifact(OUT, {
  schemaVersion: "expai-phase2-remedy-context-replay/v1",
  generatedBy: "scripts/expungement-ai/phase2/replay-remedy-contexts.mjs",
  head: gitSha(),
  evaluatorToday: process.env.RCAP_EVALUATOR_TODAY,
  note: "Same participant as the Phase 1B E3/E4 reconciliation. No waiting_rule_id override is supplied: each route resolves its own binding.",
  totals,
  rows
});
console.log(stableJson(totals));
