#!/usr/bin/env node
/**
 * Phase 4 reproduction of the route-irrelevant ambiguity defect.
 *
 * `ambiguityReason` in the shared evaluator scans every rendered prepayment
 * question for an explicit "unknown" answer and never asks whether the question
 * belongs to the route the participant is actually on. So an optional question
 * scoped to one remedy blocks every other remedy in the same jurisdiction.
 *
 * This drives the same participant twice per route-scoped question: once with
 * the question answered definitely, once with "I'm not sure". Read-only.
 */
import {
  getProfileByJurisdiction, projectPublicProfile, CLEAR_RECORD, questionIndex, converge,
  writeArtifact, gitSha
} from "../flow-audit/lib/engine.mjs";

/** Question ids a profile publishes to everyone but that only one remedy uses. */
function routeScopedQuestionIds(publicProfile) {
  const code = publicProfile.jurisdiction.code.toLowerCase();
  return publicProfile.questions
    .map((question) => question.id)
    .filter((id) => id.startsWith(`${code}_`));
}

const UNKNOWN_BY_TYPE = { yes_no_unsure: "I'm not sure", text_or_unknown: "unknown", date_or_unknown: "unknown" };

const out = {
  schemaVersion: "expai-phase4-route-irrelevant-ambiguity/v1",
  candidateSha: gitSha("HEAD"),
  defect: "src/lib/rcap-engine/evaluator.ts ambiguityReason() filters by lifecycle phase and contextOnly, never by the selected pathway.",
  totals: { jurisdictionsWithRouteScopedQuestions: 0, questionsTested: 0, questionsThatBlockUnrelatedRoutes: 0 },
  jurisdictions: {}
};

for (const code of ["CA", "WI", "HI", "NY", "IN"]) {
  let profile;
  try { profile = getProfileByJurisdiction(code); } catch { continue; }
  const publicProfile = projectPublicProfile(profile);
  const questions = questionIndex(publicProfile);
  const scoped = routeScopedQuestionIds(publicProfile);
  if (scoped.length === 0) continue;
  out.totals.jurisdictionsWithRouteScopedQuestions += 1;
  const rows = [];
  for (const id of scoped) {
    const question = questions.get(id);
    const unknownAnswer = UNKNOWN_BY_TYPE[question?.type] ?? "unknown";
    const baseline = converge({ jurisdiction: code, profile, questions, seedAnswers: { ...CLEAR_RECORD }, overrides: {} });
    const withUnknown = converge({
      jurisdiction: code, profile, questions,
      seedAnswers: { ...CLEAR_RECORD, [id]: unknownAnswer }, overrides: { [id]: unknownAnswer }
    });
    const baselineRoute = baseline.evaluation?.pathwayId ?? baseline.evaluation?.selectedPathwayId ?? null;
    const blocked = baseline.evaluation?.paymentAllowed === true && withUnknown.evaluation?.paymentAllowed !== true;
    out.totals.questionsTested += 1;
    if (blocked) out.totals.questionsThatBlockUnrelatedRoutes += 1;
    rows.push({
      questionId: id,
      questionType: question?.type ?? null,
      required: question?.required ?? null,
      contextOnly: question?.contextOnly ?? null,
      unknownAnswerUsed: unknownAnswer,
      routeUnderTest: baselineRoute,
      questionBelongsToRouteUnderTest: false,
      baseline: { resultCode: baseline.evaluation?.resultCode ?? null, paymentAllowed: baseline.evaluation?.paymentAllowed ?? null },
      withUnknown: {
        resultCode: withUnknown.evaluation?.resultCode ?? null,
        paymentAllowed: withUnknown.evaluation?.paymentAllowed ?? null,
        reasonCode: withUnknown.evaluation?.reason?.code ?? null
      },
      blocksAnUnrelatedRoute: blocked
    });
  }
  out.jurisdictions[code] = { routeScopedQuestionIds: scoped, rows };
}

writeArtifact("data/expungement-ai/flow-audit/phase4/route-irrelevant-ambiguity.json", out);
console.log(JSON.stringify(out.totals, null, 1));
for (const [code, value] of Object.entries(out.jurisdictions)) {
  for (const row of value.rows) {
    console.log(`${code} ${row.questionId.padEnd(42)} route=${String(row.routeUnderTest).slice(0, 26).padEnd(26)} base=${row.baseline.resultCode}/${row.baseline.paymentAllowed} unknown=${row.withUnknown.resultCode}/${row.withUnknown.paymentAllowed} reason=${row.withUnknown.reasonCode} BLOCKS=${row.blocksAnUnrelatedRoute}`);
  }
}
