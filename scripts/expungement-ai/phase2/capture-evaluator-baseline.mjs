#!/usr/bin/env node
// Phase 2 — capture the evaluator's output across all 51 jurisdictions.
//
// Run once before the change and once after. The diff of the two files is the
// complete set of behaviour changes this branch makes; anything in that diff and
// not in the reviewed correction allowlist is a failure.
//
// Deterministic: pinned evaluator clock, pinned answer set, no network.
//
//   node scripts/expungement-ai/phase2/capture-evaluator-baseline.mjs <out.json>

import {
  ROOT_DIR, EVALUATOR_TODAY, getAllJurisdictionProfiles, getProfileByJurisdiction,
  projectPublicProfile, deriveScreens, evaluateAuthoritativeScreeningResult,
  packetPlanForPathway, CLEAR_RECORD, converge, questionIndex, stableJson, gitSha
} from "../flow-audit/lib/engine.mjs";
import fs from "node:fs";
import path from "node:path";

const out = process.argv[2] ?? "data/expungement-ai/phase2/evaluator-baseline.json";

const profiles = getAllJurisdictionProfiles();
const rows = [];

for (const profile of profiles) {
  const code = profile.jurisdiction.code;
  const publicProfile = projectPublicProfile(profile);
  const questions = questionIndex(publicProfile);
  const screens = deriveScreens(publicProfile);

  // The rendered-screens-only answer set: exactly what a participant can supply.
  const converged = converge({ jurisdiction: code, profile, questions, seedAnswers: {} });
  const answers = converged.answers;
  const evaluation = evaluateAuthoritativeScreeningResult({
    jurisdiction: code,
    profileVersion: profile.profileVersion,
    matterId: "expai-phase2-baseline",
    answers
  }).evaluation;
  const result = evaluation;

  const pathwayId = result?.pathwayId ?? null;
  const pathway = (profile.pathways ?? []).find((p) => p.id === pathwayId) ?? null;
  let plan = null;
  try { plan = pathway ? packetPlanForPathway(profile, pathway) : null; } catch { plan = null; }

  rows.push({
    jurisdiction: code,
    resultCode: result?.resultCode ?? null,
    pathwayId,
    paymentAllowed: result?.paymentAllowed ?? null,
    reasonCodes: (result?.reasons ?? []).map((r) => r?.code ?? r?.reasonCode ?? String(r)).sort(),
    missingQuestionIds: [...(result?.missingQuestionIds ?? [])].sort(),
    // The legal decision graph: which routes the profile offers and how each is typed.
    decisionGraph: (profile.pathways ?? []).map((p) => ({
      id: p.id,
      routeType: p.routeType ?? null,
      automatic: p.automatic ?? null,
      filingRequired: p.filingRequired ?? null,
      suggestedResultCode: p.suggestedResultCode ?? null,
      caseOutcomes: [...(p.caseOutcomes ?? [])].sort()
    })),
    packetFamily: plan?.family ?? plan?.mode ?? null,
    formSet: (plan?.forms ?? plan?.documents ?? []).map((f) => f?.id ?? f?.formId ?? String(f)).sort(),
    renderedScreenCount: screens.length,
    renderedQuestionIds: screens.map((s) => s.id ?? s.questionId).filter(Boolean).sort()
  });
}

rows.sort((a, b) => a.jurisdiction.localeCompare(b.jurisdiction));

const payload = {
  schemaVersion: "expai-phase2-evaluator-baseline/v1",
  evaluatorToday: EVALUATOR_TODAY,
  head: gitSha(),
  jurisdictions: rows.length,
  totals: {
    packetReady: rows.filter((r) => String(r.resultCode).startsWith("packet_ready")).length,
    paymentAllowed: rows.filter((r) => r.paymentAllowed === true).length,
    byResultCode: rows.reduce((acc, r) => { acc[r.resultCode] = (acc[r.resultCode] ?? 0) + 1; return acc; }, {})
  },
  rows
};

fs.mkdirSync(path.join(ROOT_DIR, path.dirname(out)), { recursive: true });
fs.writeFileSync(path.join(ROOT_DIR, out), stableJson(payload));
console.log(`wrote ${out}`);
console.log(`  ${rows.length} jurisdictions | packet-ready ${payload.totals.packetReady} | paymentAllowed ${payload.totals.paymentAllowed}`);
console.log(`  by result code: ${JSON.stringify(payload.totals.byResultCode)}`);
