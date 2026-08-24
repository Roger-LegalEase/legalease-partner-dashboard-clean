#!/usr/bin/env node
/**
 * Phase 4 whole-product timing-gate sweep.
 *
 * For every jurisdiction and every pathway it publishes, drive the committed
 * evaluator once per published timing bucket and record whether the timing
 * answer changes anything and whether payment opens at the shortest bucket.
 *
 * This is the independent evidence for the P0 holds: a route whose outcome is
 * identical across every bucket is a route whose waiting rule never ran, and a
 * route that allows payment at lt_1_year or while the case is still open is a
 * premature-payment risk regardless of which shard first reported it.
 *
 * Read-only. Synthetic answers, no network, no payment call.
 */
import {
  getProfileByJurisdiction, getAllJurisdictionProfiles, projectPublicProfile,
  CLEAR_RECORD, questionIndex, converge, writeArtifact, gitSha, readJson
} from "../flow-audit/lib/engine.mjs";

const BINDINGS = readJson("src/lib/rcap-engine/waiting-rule-bindings.json");
const PAYING_TERMINALS = new Set(["packet_ready", "packet_ready_with_caution"]);

function resolutionType(code, pathwayId) {
  const key = `${code}:${pathwayId}`;
  const binding = BINDINGS.bindings?.[key];
  if (binding) return `committed_${binding.resolution}`;
  if ((BINDINGS.unresolvedAtBase?.keys ?? []).includes(key)) return "provisional_prose_fallback_no_candidate";
  if ((BINDINGS.unresolvedPreserved?.keys ?? []).includes(key)) return "provisional_prose_fallback";
  return "no_recorded_resolution";
}

const out = {
  schemaVersion: "expai-phase4-timing-gate-sweep/v1",
  candidateSha: gitSha("HEAD"),
  evaluatorToday: "2026-07-01",
  method: "one converged synthetic participant per (jurisdiction, pathway, published timing bucket); pathway pinned through the profile's own possible_pathway_context option",
  totals: { jurisdictions: 0, routesSwept: 0, timingInert: 0, paymentAtShortestBucket: 0, paymentWhileCaseStillOpen: 0 },
  routes: {}
};

for (const profileEntry of getAllJurisdictionProfiles()) {
  const code = profileEntry.jurisdiction?.code ?? profileEntry.code;
  if (!code) continue;
  let profile;
  try { profile = getProfileByJurisdiction(code); } catch { continue; }
  out.totals.jurisdictions += 1;
  const publicProfile = projectPublicProfile(profile);
  const questions = questionIndex(publicProfile);
  const bucketQuestion = questions.get("resolved_timing_bucket");
  const buckets = Array.isArray(bucketQuestion?.options) && bucketQuestion.options.length > 0 ? bucketQuestion.options : [];
  const contextQuestion = questions.get("possible_pathway_context");
  const contextOptions = Array.isArray(contextQuestion?.options) ? contextQuestion.options : [];

  for (const pathway of profile.pathways ?? []) {
    // The context option the profile itself publishes for this pathway, matched
    // by label so nothing here invents an option the flow would not render.
    const context = contextOptions.find((option) => option === pathway.label)
      ?? contextOptions.find((option) => typeof option === "string" && pathway.label && option.startsWith(String(pathway.label).slice(0, 24)));
    const rows = [];
    for (const bucket of (buckets.length > 0 ? buckets : ["__no_timing_question__"])) {
      const overrides = {};
      if (bucket !== "__no_timing_question__") overrides.resolved_timing_bucket = bucket;
      if (context) overrides.possible_pathway_context = context;
      let run;
      try {
        run = converge({ jurisdiction: code, profile, questions, seedAnswers: { ...CLEAR_RECORD, ...overrides }, overrides, maxRounds: 16 });
      } catch (error) { rows.push({ bucket, error: String(error?.message ?? error) }); continue; }
      const evaluation = run.evaluation;
      rows.push({
        bucket,
        error: run.error,
        resultCode: evaluation?.resultCode ?? null,
        paymentAllowed: evaluation?.paymentAllowed ?? null,
        landedPathwayId: evaluation?.pathwayId ?? evaluation?.selectedPathwayId ?? null,
        reasonCode: evaluation?.reason?.code ?? null
      });
    }
    const settled = rows.filter((r) => !r.error && r.resultCode);
    const onRoute = settled.filter((r) => r.landedPathwayId === pathway.id);
    const distinct = new Set(onRoute.map((r) => `${r.resultCode}:${r.paymentAllowed}`));
    const shortest = onRoute.find((r) => r.bucket === "lt_1_year");
    const stillOpen = onRoute.find((r) => r.bucket === "still_open");
    const inert = onRoute.length > 1 && distinct.size === 1;
    const payShort = shortest?.paymentAllowed === true && PAYING_TERMINALS.has(shortest.resultCode);
    const payOpen = stillOpen?.paymentAllowed === true && PAYING_TERMINALS.has(stillOpen.resultCode);
    if (onRoute.length === 0) continue;
    out.totals.routesSwept += 1;
    if (inert) out.totals.timingInert += 1;
    if (payShort) out.totals.paymentAtShortestBucket += 1;
    if (payOpen) out.totals.paymentWhileCaseStillOpen += 1;
    out.routes[`${code}:${pathway.id}`] = {
      jurisdiction: code,
      pathwayId: pathway.id,
      pathwayLabel: pathway.label ?? null,
      contextOptionUsed: context ?? null,
      waitingRuleResolution: resolutionType(code, pathway.id),
      timingAnswerInert: inert,
      distinctOutcomesOnRoute: [...distinct],
      paymentAtShortestBucket: payShort,
      paymentWhileCaseStillOpen: payOpen,
      rows
    };
  }
}

writeArtifact("data/expungement-ai/flow-audit/phase4/timing-gate-sweep.json", out);
console.log(JSON.stringify(out.totals, null, 1));
const risky = Object.entries(out.routes).filter(([, v]) => v.paymentAtShortestBucket || v.paymentWhileCaseStillOpen);
console.log(`ROUTES WITH A PREMATURE-PAYMENT SIGNAL: ${risky.length}`);
for (const [key, value] of risky.slice(0, 60)) {
  console.log(`  ${key} inert=${value.timingAnswerInert} lt1=${value.paymentAtShortestBucket} stillOpen=${value.paymentWhileCaseStillOpen} res=${value.waitingRuleResolution}`);
}
