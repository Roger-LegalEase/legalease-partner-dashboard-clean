#!/usr/bin/env node
/**
 * Phase 4 independent reproduction of the seven required P0 release holds.
 *
 * Reads only. Drives the committed evaluator through the same public profile the
 * screening flow projects, sweeping the timing bucket the hold names, and records
 * what the participant would actually be offered. Nothing here repairs anything;
 * a reproduced hold becomes CORRECTION_REQUIRED in the verdict matrix.
 */
import {
  getProfileByJurisdiction, projectPublicProfile, evaluateAuthoritativeScreeningResult,
  CLEAR_RECORD, questionIndex, converge, writeArtifact, gitSha, readJson
} from "../flow-audit/lib/engine.mjs";

const BINDINGS = readJson("src/lib/rcap-engine/waiting-rule-bindings.json");
const TIMING_BUCKETS = ["lt_1_year", "y1_to_3", "y3_to_5", "y5_to_7", "y7_to_10", "gt_10_years"];

/** Every timing bucket the profile actually publishes, in the profile's own order. */
function publishedBuckets(questions) {
  const q = questions.get("resolved_timing_bucket");
  const options = Array.isArray(q?.options) ? q.options : [];
  return options.length > 0 ? options : TIMING_BUCKETS;
}

function paymentOf(evaluation) {
  if (!evaluation) return null;
  return {
    resultCode: evaluation.resultCode ?? null,
    paymentAllowed: evaluation.paymentAllowed ?? null,
    packetFamily: evaluation.packetFamily ?? evaluation.packet?.family ?? null,
    pathwayId: evaluation.pathwayId ?? evaluation.selectedPathwayId ?? null,
    waitingRule: evaluation.waitingRule ?? evaluation.selectedWaitingRule ?? null,
    reasonCode: evaluation.reason?.code ?? evaluation.reasonCode ?? null
  };
}

/** One jurisdiction swept across every published timing bucket. */
function sweep(code, overridesBase = {}) {
  const profile = getProfileByJurisdiction(code);
  const publicProfile = projectPublicProfile(profile);
  const questions = questionIndex(publicProfile);
  const buckets = publishedBuckets(questions);
  const rows = [];
  for (const bucket of buckets) {
    const overrides = { ...overridesBase, resolved_timing_bucket: bucket };
    const run = converge({
      jurisdiction: code, profile, questions,
      seedAnswers: { ...CLEAR_RECORD, ...overrides },
      overrides
    });
    rows.push({ bucket, error: run.error, ...paymentOf(run.evaluation) });
  }
  return { jurisdiction: code, profileVersion: profile.profileVersion, buckets, rows };
}

/** Sweep every published option of one question, holding the rest clear. */
function sweepQuestion(code, questionId, extra = {}) {
  const profile = getProfileByJurisdiction(code);
  const publicProfile = projectPublicProfile(profile);
  const questions = questionIndex(publicProfile);
  const q = questions.get(questionId);
  const options = Array.isArray(q?.options) && q.options.length > 0 ? q.options : ["Yes", "No", "unknown"];
  const rows = [];
  for (const option of options) {
    const overrides = { ...extra, [questionId]: q?.type === "multi_select" ? [option] : option };
    const run = converge({
      jurisdiction: code, profile, questions,
      seedAnswers: { ...CLEAR_RECORD, ...overrides },
      overrides
    });
    rows.push({ option, error: run.error, ...paymentOf(run.evaluation) });
  }
  return { jurisdiction: code, questionId, published: !!q, questionType: q?.type ?? null, options, rows };
}

/** Which profile rules carry a duration whose number is not the operative wait. */
function durationProvenance(code) {
  const profile = getProfileByJurisdiction(code);
  const rules = profile.waitingPeriodRules ?? [];
  const AGE = /\b(?:age|aged|years of age|older|or older|turn(?:s|ed)?)\b/i;
  const LOOKBACK = /\b(?:lookback|look-back|within the (?:past|last|preceding)|prior to|preceding)\b/i;
  const SENTENCE = /\b(?:sentence of at least|term of imprisonment|probation(?:ary)? (?:term|period)|maximum penalty|punishable by)\b/i;
  const findings = [];
  for (const rule of rules) {
    const value = rule?.duration?.value;
    if (typeof value !== "number") continue;
    const text = String(rule.ruleText ?? "");
    const flags = [];
    // The number the extractor took, matched back against the sentence it came from.
    const near = new RegExp(`\\b${value}\\b[^.]{0,60}`, "i");
    const window = (text.match(near) ?? [""])[0];
    const before = text.slice(0, Math.max(0, text.indexOf(String(value)))).slice(-60);
    if (AGE.test(window) || AGE.test(before)) flags.push("age_threshold");
    if (LOOKBACK.test(window) || LOOKBACK.test(before)) flags.push("lookback_window");
    if (SENTENCE.test(window) || SENTENCE.test(before)) flags.push("sentence_or_probation_term");
    if (rule.duration.unit === "years" && value >= 25) flags.push("implausible_as_a_waiting_period");
    if (flags.length > 0) findings.push({ ruleId: rule.id, duration: rule.duration, flags, quote: text.slice(0, 220) });
  }
  return { jurisdiction: code, rulesWithDuration: rules.filter((r) => typeof r?.duration?.value === "number").length, findings };
}

/** Is this route decided by a committed binding, or still by the prose fallback? */
function resolutionType(code, pathwayId) {
  const key = `${code}:${pathwayId}`;
  const binding = BINDINGS.bindings?.[key];
  if (binding) return { key, type: `committed_${binding.resolution}`, ruleRefs: binding.ruleRefs ?? null, disambiguation: binding.disambiguation ?? null };
  if ((BINDINGS.unresolvedAtBase?.keys ?? []).includes(key)) return { key, type: "provisional_prose_fallback_no_candidate" };
  return { key, type: "provisional_prose_fallback" };
}

const record = {
  schemaVersion: "expai-phase4-p0-reproduction/v1",
  phase: 4,
  candidateSha: gitSha("HEAD"),
  method: "committed evaluator + committed public-profile projection, synthetic answers only, no network, no payment call",
  evaluatorToday: "2026-07-01",
  holds: {}
};

// HI — the two routes whose timing answer is reported inert.
record.holds["HI:dui-under-21-conviction"] = {
  reportedRisk: "timing answer inert; payment open at lt_1_year",
  resolution: resolutionType("HI", "dui-under-21-conviction"),
  timingSweep: sweep("HI"),
  durationProvenance: durationProvenance("HI")
};
record.holds["HI:first-time-drug-conviction"] = {
  reportedRisk: "timing answer inert; payment open at lt_1_year",
  resolution: resolutionType("HI", "first-time-drug-conviction"),
  sharedSweepWith: "HI:dui-under-21-conviction"
};
record.holds["NV:general-conviction-record-sealing"] = {
  reportedRisk: "payment open at lt_1_year despite the profile's eight-year rule",
  resolution: resolutionType("NV", "general-conviction-record-sealing"),
  timingSweep: sweep("NV"),
  durationProvenance: durationProvenance("NV")
};
record.holds["LA:five-year-clean-period"] = {
  reportedRisk: "payment open at lt_1_year",
  timingSweep: sweep("LA"),
  durationProvenance: durationProvenance("LA")
};
record.holds["MO:marijuana-expungement"] = {
  reportedRisk: "bound to an unrelated DWI ten-year rule",
  resolution: resolutionType("MO", "marijuana-expungement"),
  allMoBindings: Object.fromEntries(Object.entries(BINDINGS.bindings ?? {}).filter(([k]) => k.startsWith("MO:"))),
  timingSweep: sweep("MO"),
  durationProvenance: durationProvenance("MO")
};
record.holds["PA:wait-05-age-70"] = {
  reportedRisk: "age 70 encoded as a seventy-year duration",
  paBinding: resolutionType("PA", "summary-offense-expungement"),
  everyPaBinding: Object.fromEntries(Object.entries(BINDINGS.bindings ?? {}).filter(([k]) => k.startsWith("PA:"))),
  durationProvenance: durationProvenance("PA"),
  timingSweep: sweep("PA")
};
record.holds["CA:prop-64-ambiguity"] = {
  reportedRisk: "irrelevant optional Proposition 64 uncertainty blocks unrelated remedies",
  prop64Sweeps: {},
  timingSweep: sweep("CA")
};
for (const id of ["ca_prop64_conviction", "ca_prop64_current_relief", "ca_prop64_offense_type", "ca_prop64_sentence_status"]) {
  record.holds["CA:prop-64-ambiguity"].prop64Sweeps[id] = sweepQuestion("CA", id);
}

// The wider duration-provenance reconciliation the assignment names by state.
record.durationProvenanceAcrossNamedStates = {};
for (const code of ["MI", "MN", "ND", "NE", "NY", "OK", "TN", "TX"]) {
  record.durationProvenanceAcrossNamedStates[code] = durationProvenance(code);
}

writeArtifact("data/expungement-ai/flow-audit/phase4/p0-reproduction.json", record);
const reproduced = Object.entries(record.holds).map(([k, v]) => {
  const rows = v.timingSweep?.rows ?? [];
  const early = rows.find((r) => r.bucket === "lt_1_year" && r.paymentAllowed === true);
  return `${k}: ${early ? "PAYMENT OPEN AT lt_1_year" : "no payment at lt_1_year in this sweep"}`;
});
console.log(reproduced.join("\n"));
