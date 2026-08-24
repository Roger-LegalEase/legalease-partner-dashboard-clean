#!/usr/bin/env node
/**
 * Phase 4: the cross-state form of the route-irrelevant ambiguity defect.
 *
 * EXPAI-FA-022 records that every jurisdiction's public profile carries other
 * states' route-scoped questions. EXPAI-FA-015 records that route-scoped
 * questions are asked before the route is known. `ambiguityReason` treats an
 * explicit "unknown" on ANY rendered prepayment question as ambiguity. Composed,
 * those three mean a participant in one state can be blocked by a question that
 * belongs to a different state's remedy.
 *
 * This drives every jurisdiction's own best route twice: once clean, once with a
 * single foreign state's question answered "I'm not sure". Read-only.
 */
import {
  getAllJurisdictionProfiles, getProfileByJurisdiction, projectPublicProfile,
  CLEAR_RECORD, questionIndex, converge, writeArtifact, gitSha
} from "../flow-audit/lib/engine.mjs";

const UNKNOWN_BY_TYPE = { yes_no_unsure: "I'm not sure", text_or_unknown: "unknown", date_or_unknown: "unknown" };

const out = {
  schemaVersion: "expai-phase4-cross-state-ambiguity/v1",
  candidateSha: gitSha("HEAD"),
  composedFrom: ["EXPAI-FA-015", "EXPAI-FA-022", "src/lib/rcap-engine/evaluator.ts ambiguityReason()"],
  totals: { jurisdictionsTested: 0, jurisdictionsCarryingForeignQuestions: 0, jurisdictionsWhereAForeignAnswerChangesTheOutcome: 0, jurisdictionsWhereAForeignAnswerClosesPayment: 0 },
  jurisdictions: {}
};

for (const entry of getAllJurisdictionProfiles()) {
  const code = entry.jurisdiction?.code ?? entry.code;
  if (!code) continue;
  let profile;
  try { profile = getProfileByJurisdiction(code); } catch { continue; }
  const publicProfile = projectPublicProfile(profile);
  const questions = questionIndex(publicProfile);
  const own = `${code.toLowerCase()}_`;
  const foreign = publicProfile.questions.filter((question) => /^[a-z]{2}_/.test(question.id) && !question.id.startsWith(own));
  out.totals.jurisdictionsTested += 1;
  if (foreign.length === 0) { out.jurisdictions[code] = { foreignQuestionCount: 0 }; continue; }
  out.totals.jurisdictionsCarryingForeignQuestions += 1;

  const baseline = converge({ jurisdiction: code, profile, questions, seedAnswers: { ...CLEAR_RECORD }, overrides: {} });
  const baseResult = baseline.evaluation?.resultCode ?? null;
  const basePayment = baseline.evaluation?.paymentAllowed ?? null;
  const probes = [];
  for (const question of foreign) {
    const unknownAnswer = UNKNOWN_BY_TYPE[question.type] ?? "unknown";
    const run = converge({
      jurisdiction: code, profile, questions,
      seedAnswers: { ...CLEAR_RECORD, [question.id]: unknownAnswer }, overrides: { [question.id]: unknownAnswer }
    });
    probes.push({
      foreignQuestionId: question.id,
      foreignQuestionOwner: question.id.slice(0, 2).toUpperCase(),
      resultCode: run.evaluation?.resultCode ?? null,
      paymentAllowed: run.evaluation?.paymentAllowed ?? null,
      changedTheOutcome: (run.evaluation?.resultCode ?? null) !== baseResult,
      closedPayment: basePayment === true && run.evaluation?.paymentAllowed !== true
    });
  }
  const changed = probes.filter((probe) => probe.changedTheOutcome);
  const closed = probes.filter((probe) => probe.closedPayment);
  if (changed.length > 0) out.totals.jurisdictionsWhereAForeignAnswerChangesTheOutcome += 1;
  if (closed.length > 0) out.totals.jurisdictionsWhereAForeignAnswerClosesPayment += 1;
  out.jurisdictions[code] = {
    foreignQuestionCount: foreign.length,
    routeUnderTest: baseline.evaluation?.pathwayId ?? baseline.evaluation?.selectedPathwayId ?? null,
    baseline: { resultCode: baseResult, paymentAllowed: basePayment },
    foreignQuestionsThatChangeTheOutcome: changed.map((probe) => probe.foreignQuestionId),
    foreignQuestionsThatClosePayment: closed.map((probe) => probe.foreignQuestionId),
    probes
  };
}

writeArtifact("data/expungement-ai/flow-audit/phase4/cross-state-ambiguity.json", out);
console.log(JSON.stringify(out.totals, null, 1));
const worst = Object.entries(out.jurisdictions)
  .filter(([, value]) => (value.foreignQuestionsThatClosePayment ?? []).length > 0);
console.log(`JURISDICTIONS WHERE ANOTHER STATE'S QUESTION CLOSES PAYMENT: ${worst.length}`);
for (const [code, value] of worst) console.log(`  ${code} route=${value.routeUnderTest} base=${value.baseline.resultCode}/${value.baseline.paymentAllowed} closedBy=${value.foreignQuestionsThatClosePayment.join(", ")}`);
