#!/usr/bin/env node
/**
 * Phase 4 P0 reproduction, pinned to the exact route each hold names.
 *
 * The unpinned sweep converges on whichever remedy the clear-record participant
 * ranks first, which is not always the held route. This pins the route through
 * the profile's own pathway-context option and an outcome consistent with it,
 * then sweeps the published timing buckets. Read-only.
 */
import {
  getProfileByJurisdiction, projectPublicProfile, CLEAR_RECORD, questionIndex, converge,
  writeArtifact, gitSha, readJson
} from "../flow-audit/lib/engine.mjs";

const BINDINGS = readJson("src/lib/rcap-engine/waiting-rule-bindings.json");

const CASES = [
  { id: "HI:dui-under-21-conviction", jurisdiction: "HI", pathwayId: "dui-under-21-conviction",
    context: "DUI under age 21 conviction expungement", caseOutcome: "Misdemeanor conviction" },
  { id: "HI:first-time-drug-conviction", jurisdiction: "HI", pathwayId: "first-time-drug-conviction",
    context: "First-time drug-offender conviction expungement", caseOutcome: "Misdemeanor conviction" },
  { id: "NV:general-conviction-record-sealing", jurisdiction: "NV", pathwayId: "general-conviction-record-sealing-under-nrs-179-245",
    context: "General conviction-record sealing under NRS 179.245", caseOutcome: "Felony conviction" },
  { id: "LA:five-year-clean-period", jurisdiction: "LA", pathwayId: null, context: null, caseOutcome: "Misdemeanor conviction" },
  { id: "MO:marijuana-expungement", jurisdiction: "MO", pathwayId: "marijuana-expungement-under-missouri-constitution-article-xiv",
    context: "Marijuana expungement under Missouri Constitution article XIV", caseOutcome: "Misdemeanor conviction" },
  { id: "PA:path-e-age-70-expungement", jurisdiction: "PA", pathwayId: "path-e-age-70-expungement",
    context: "Path E — Age-70 expungement", caseOutcome: "Misdemeanor conviction" },
  { id: "PA:path-c-summary-conviction", jurisdiction: "PA", pathwayId: "path-c-summary-conviction-expungement",
    context: "Path C — Summary-conviction expungement", caseOutcome: "Misdemeanor conviction" }
];

function resolutionType(code, pathwayId) {
  if (!pathwayId) return { type: "not_pinned" };
  const key = `${code}:${pathwayId}`;
  const binding = BINDINGS.bindings?.[key];
  if (binding) return { key, type: `committed_${binding.resolution}`, ruleRefs: binding.ruleRefs ?? null, disambiguation: binding.disambiguation ?? null };
  if ((BINDINGS.unresolvedAtBase?.keys ?? []).includes(key)) return { key, type: "provisional_prose_fallback_no_candidate" };
  return { key, type: "provisional_prose_fallback" };
}

const out = {
  schemaVersion: "expai-phase4-p0-pinned/v1",
  candidateSha: gitSha("HEAD"),
  method: "pathway pinned through the profile's own possible_pathway_context option; synthetic answers only",
  cases: {}
};

for (const testCase of CASES) {
  const profile = getProfileByJurisdiction(testCase.jurisdiction);
  const publicProfile = projectPublicProfile(profile);
  const questions = questionIndex(publicProfile);
  const bucketQuestion = questions.get("resolved_timing_bucket");
  const buckets = Array.isArray(bucketQuestion?.options) && bucketQuestion.options.length > 0
    ? bucketQuestion.options : ["lt_1_year", "gt_10_years"];
  const rows = [];
  for (const bucket of buckets) {
    const overrides = { resolved_timing_bucket: bucket, case_outcome: testCase.caseOutcome };
    if (testCase.context) overrides.possible_pathway_context = testCase.context;
    const run = converge({
      jurisdiction: testCase.jurisdiction, profile, questions,
      seedAnswers: { ...CLEAR_RECORD, ...overrides }, overrides
    });
    const evaluation = run.evaluation;
    rows.push({
      bucket,
      error: run.error,
      resultCode: evaluation?.resultCode ?? null,
      paymentAllowed: evaluation?.paymentAllowed ?? null,
      pathwayId: evaluation?.pathwayId ?? evaluation?.selectedPathwayId ?? null,
      landedOnPinnedRoute: (evaluation?.pathwayId ?? evaluation?.selectedPathwayId ?? null) === testCase.pathwayId,
      waitingRuleId: evaluation?.waitingRule?.id ?? null,
      waitingRuleDuration: evaluation?.waitingRule?.duration ?? null,
      reasonCode: evaluation?.reason?.code ?? null
    });
  }
  const distinctOutcomes = new Set(rows.filter((r) => !r.error).map((r) => `${r.resultCode}:${r.paymentAllowed}`));
  const earliest = rows.find((r) => /^(lt_1_year|less)/i.test(r.bucket));
  out.cases[testCase.id] = {
    pinnedPathway: testCase.pathwayId,
    resolution: resolutionType(testCase.jurisdiction, testCase.pathwayId),
    timingAnswerInert: distinctOutcomes.size === 1,
    distinctOutcomes: [...distinctOutcomes],
    paymentOpenAtShortestBucket: earliest?.paymentAllowed === true,
    shortestBucket: earliest?.bucket ?? null,
    rows
  };
}

writeArtifact("data/expungement-ai/flow-audit/phase4/p0-pinned-reproduction.json", out);
for (const [id, value] of Object.entries(out.cases)) {
  console.log(`${id}\n   pinnedLanded=${value.rows.some((r) => r.landedOnPinnedRoute)} inert=${value.timingAnswerInert} payAtShortest=${value.paymentOpenAtShortestBucket} outcomes=${JSON.stringify(value.distinctOutcomes)} resolution=${value.resolution.type}`);
}
