#!/usr/bin/env node
// Phase 2 — derive the proven waiting-rule binding for the 13 corrected states.
//
// This does not invent a waiting period. For each corrected pathway it sweeps
// every waiting rule the jurisdiction's OWN compiled profile already publishes,
// supplies that rule id through the evaluator's existing waiting_rule_id
// override, and records which ids reach the intended supported terminal.
//
// The output is evidence, not a decision: `scripts/.../author-waiting-rule-bindings.mjs`
// turns it into the binding table, and every duration in that table is copied
// from an existing `waitingPeriodRules` entry with its text as provenance.

import {
  ROOT_DIR, EVALUATOR_TODAY, getProfileByJurisdiction, projectPublicProfile,
  evaluateAuthoritativeScreeningResult, questionIndex, converge, CLEAR_RECORD,
  stableJson, gitSha, readJson
} from "../flow-audit/lib/engine.mjs";
import fs from "node:fs";
import path from "node:path";

const OUT = "data/expungement-ai/phase2/waiting-rule-binding-evidence.json";
const recon = readJson("data/expungement-ai/flow-audit/reachability-reconciliation.json");
const reach = readJson("data/expungement-ai/flow-audit/ui-reachability.json");
const TARGETS = recon.totals.technicalReachabilityDefects;

// Exactly the answer construction the Phase 1B reconciliation used for E3/E4,
// so this evidence and the audit's evidence describe the same participant.
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
  const contexts = (reach.remedyContexts ?? []).filter((c) => c.jurisdiction === code);
  const best = contexts.slice().sort((a, b) => (RANK[a.bestTerminalResultCode] ?? 9) - (RANK[b.bestTerminalResultCode] ?? 9))[0];
  const answers = { ...(best?.answerSet ?? {}) };
  const declares = (id) => (publicProfile.questions ?? []).some((q) => q.id === id);
  for (const id of SHARED_UNRENDERED_FACTS) if (declares(id)) answers[id] = CLEAR_RECORD[id];
  for (const id of TIMING_COMPLETION_GATE_FIELDS) if (declares(id)) answers[id] = CLEAR_RECORD[id];
  return { answers, contextOption: best?.pathwayContextOption ?? null };
}

const evaluate = (code, profile, answers) => {
  try {
    return evaluateAuthoritativeScreeningResult({
      jurisdiction: code, profileVersion: profile.profileVersion,
      matterId: "expai-phase2-binding", answers
    }).evaluation;
  } catch (error) {
    return { resultCode: `error:${String(error.message).slice(0, 60)}` };
  }
};

const rows = [];
for (const code of TARGETS) {
  const profile = getProfileByJurisdiction(code);
  const publicProfile = projectPublicProfile(profile);
  const { answers: base, contextOption } = e3AnswersFor(code, publicProfile);

  const before = evaluate(code, profile, base);
  const rules = profile.waitingPeriodRules ?? [];

  const sweep = rules.map((rule) => {
    const after = evaluate(code, profile, { ...base, waiting_rule_id: rule.id });
    return {
      waitingRuleId: rule.id,
      duration: rule.duration ?? null,
      anchor: rule.anchor ?? null,
      fieldsReferenced: rule.fieldsReferenced ?? [],
      ruleText: String(rule.ruleText ?? "").replace(/\s+/g, " ").trim(),
      resultCode: after?.resultCode ?? null,
      pathwayId: after?.pathwayId ?? null,
      paymentAllowed: after?.paymentAllowed ?? null,
      reachesPacketReady: String(after?.resultCode ?? "").startsWith("packet_ready")
    };
  });

  const reaching = sweep.filter((s) => s.reachesPacketReady);
  const pathwayIds = [...new Set(reaching.map((r) => r.pathwayId))];
  const durations = [...new Set(reaching.filter((r) => r.duration).map((r) => `${r.duration.value}:${r.duration.unit}`))];

  rows.push({
    jurisdiction: code,
    remedyContextOption: contextOption,
    before: { resultCode: before?.resultCode ?? null, pathwayId: before?.pathwayId ?? null, paymentAllowed: before?.paymentAllowed ?? null, reasonCodes: [...(before?.reasonCodes ?? [])] },
    profileWaitingRuleCount: rules.length,
    reachingCount: reaching.length,
    reachingRuleIds: reaching.map((r) => r.waitingRuleId),
    intendedPathwayIds: pathwayIds,
    distinctDurationsAmongReaching: durations,
    anyReachesPayment: reaching.some((r) => r.paymentAllowed === true),
    sweep
  });
  console.log(`  ${code}: before=${before?.resultCode} | ${reaching.length}/${rules.length} rule ids reach packet-ready | pathways=${pathwayIds.join(",")}`);
}

const payload = {
  schemaVersion: "expai-phase2-waiting-rule-binding-evidence/v1",
  generatedBy: "scripts/expungement-ai/phase2/derive-waiting-rule-bindings.mjs",
  evaluatorToday: EVALUATOR_TODAY,
  head: gitSha(),
  note: "Every rule id below already exists in the jurisdiction's own compiled profile. No waiting period is invented, rewritten or reordered by this sweep.",
  jurisdictions: rows
};
fs.mkdirSync(path.join(ROOT_DIR, path.dirname(OUT)), { recursive: true });
fs.writeFileSync(path.join(ROOT_DIR, OUT), stableJson(payload));
console.log(`\nwrote ${OUT}`);
