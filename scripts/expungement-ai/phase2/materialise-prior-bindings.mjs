#!/usr/bin/env node
// Phase 2 — materialise the pre-correction selector's choices as explicit bindings.
//
// The correction replaces a SEARCH with a LOOKUP. A lookup that omits a route
// the search used to resolve is a regression, so this script records, for every
// jurisdiction and every pathway, which waiting rule the old prose-matching
// selector actually chose — and writes that choice out as an explicit binding.
//
// The algorithm below is a faithful transcription of bestWaitingRuleForPathway
// as it stood at the product base f7ed0ad3. It exists here ONLY to read the
// prior behaviour out of the data. No product path imports it, and nothing in
// the shipped evaluator parses prose any more.
//
// Nothing is invented: every id and every duration already exists in the
// jurisdiction's own compiled profile.

import { ROOT_DIR, readJson, stableJson, gitSha, getAllJurisdictionProfiles, projectPublicProfile, CLEAR_RECORD } from "../flow-audit/lib/engine.mjs";
import fs from "node:fs";
import path from "node:path";

const OUT = "data/expungement-ai/phase2/prior-waiting-rule-selection.json";
const reach = readJson("data/expungement-ai/flow-audit/ui-reachability.json");

const SHARED_UNRENDERED_FACTS = ["financial_obligations", "pending_cases", "sentence_completion_date", "special_preconditions_confirmed", "new_convictions_during_waiting_period", "record_documents"];
const TIMING_GATE = ["court_requirements_completed", "sentence_completion_date", "financial_obligations", "pending_cases", "new_convictions_during_waiting_period", "resolved_timing_bucket"];
const RANK = { packet_ready: 0, packet_ready_with_caution: 1, needs_more_info: 2, not_yet: 3, needs_review: 4, guidance_only: 5, likely_not_eligible: 6, hard_stop: 7 };

// ---- verbatim transcription of the pre-correction helpers ------------------
const normalizeDurationUnit = (unit) => {
  const u = String(unit).toLowerCase();
  if (u.startsWith("yr") || u.startsWith("year")) return "years";
  if (u.startsWith("month")) return "months";
  if (u.startsWith("day")) return "days";
  return u;
};
function parseDurationFromText(text) {
  const lower = String(text).toLowerCase();
  const numeric = lower.match(/\b(\d+)\s*(day|days|month|months|year|years|yr|yrs)\b/);
  if (numeric) return { value: Number(numeric[1]), unit: normalizeDurationUnit(numeric[2]), raw: numeric[0] };
  const words = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
  const word = lower.match(/\b(one|two|three|four|five|six|seven|eight|nine|ten)\s*(day|days|month|months|year|years)\b/);
  if (word) return { value: words[word[1]], unit: normalizeDurationUnit(word[2]), raw: word[0] };
  if (/immediate|no waiting period|upon event/.test(lower)) return { value: 0, unit: "days", raw: "immediate/upon event" };
  return undefined;
}
const normalizeDuration = (v) => (v && typeof v === "object" && typeof v.value === "number" && typeof v.unit === "string")
  ? { value: v.value, unit: normalizeDurationUnit(v.unit), ...(typeof v.raw === "string" ? { raw: v.raw } : {}) } : undefined;
const durationDays = (d) => !d ? -1 : d.unit === "years" ? d.value * 365 : d.unit === "months" ? d.value * 30 : d.value;
const textHasMultipleDurations = (t) => (String(t).toLowerCase().match(/\b(\d+)\s*(day|days|month|months|year|years|yr|yrs)\b/g) ?? []).length > 1;
function waitingClassMatches(text, offenseLevel, charge) {
  const n = String(text).toLowerCase();
  if (/class a|class b/.test(charge)) return /class a|class b/.test(n);
  if (/class c/.test(charge)) return /class c/.test(n);
  if (/felony/.test(charge) || offenseLevel.includes("felony")) return /felony/.test(n);
  return false;
}
function waitingTextRelevant(text, pathwayText, offenseLevel, charge, caseOutcome) {
  const n = String(text).toLowerCase();
  const tokens = pathwayText.split(/[^a-z0-9]+/).filter((t) => t.length > 5);
  if (tokens.some((t) => n.includes(t))) return true;
  if (caseOutcome === "arrest_no_charge" && /arrest|no charge|no charges|charge filed/.test(n)) {
    if (/class a|class b/.test(charge)) return /class a|class b|arrest-only|arrest only|offense level/.test(n);
    if (/class c/.test(charge)) return /class c|arrest-only|arrest only|offense level/.test(n);
    if (/felony/.test(charge) || offenseLevel.includes("felony")) return /felony|arrest-only|arrest only|offense level/.test(n);
    return /arrest-only|arrest only|offense level|no charges/.test(n);
  }
  if (caseOutcome === "dismissed" && /dismiss|nolle|non-conviction|nonconviction/.test(n)) return true;
  if (caseOutcome === "acquitted" && /acquit|not guilty/.test(n)) return true;
  if (caseOutcome.includes("convicted") && /conviction|convicted|misdemeanor|felony/.test(n)) {
    if (offenseLevel.includes("felony")) return /felony|conviction|convicted/.test(n);
    if (offenseLevel.includes("misdemeanor")) return /misdemeanor|conviction|convicted/.test(n);
    return true;
  }
  return false;
}
const normalizeCaseOutcome = (v) => String(v ?? "").toLowerCase().replace(/[^a-z]+/g, "_");

function priorSelection(profile, pathway, answers) {
  const texts = `${pathway.id} ${pathway.label} ${pathway.summary}`.toLowerCase();
  const offenseLevel = String(answers.offense_level ?? "").toLowerCase();
  const charge = String(answers.charge ?? "").toLowerCase();
  const caseOutcome = normalizeCaseOutcome(answers.case_outcome);
  const routeTokens = texts.split(/[^a-z0-9]+/).filter((t) => t.length > 5);
  const pathwayRules = Array.isArray(pathway.waitingRules) ? pathway.waitingRules.map(String) : [];
  const candidates = [
    ...(profile.waitingPeriodRules ?? []),
    ...pathwayRules.map((ruleText, i) => ({ id: `pathway-wait-${i}`, ruleText, duration: parseDurationFromText(ruleText), fieldsReferenced: [], anchor: undefined }))
  ]
    .map((rule) => ({
      id: rule.id,
      duration: normalizeDuration(rule.duration) ?? parseDurationFromText(rule.ruleText ?? ""),
      text: String(rule.ruleText ?? ""),
      anchor: typeof rule.anchor === "string" ? rule.anchor : undefined,
      routeScore: routeTokens.filter((t) => String(rule.ruleText ?? "").toLowerCase().includes(t)).length
    }))
    .filter((r) => r.duration)
    .filter((r) => waitingTextRelevant(r.text, texts, offenseLevel, charge, caseOutcome));
  if (candidates.length === 0) return { outcome: "none" };
  const atomic = candidates.filter((c) => !textHasMultipleDurations(c.text));
  const scored = atomic.length > 0 ? atomic : candidates;
  const classSpecific = caseOutcome === "arrest_no_charge" ? scored.find((c) => waitingClassMatches(c.text, offenseLevel, charge)) : undefined;
  if (classSpecific?.duration) return { outcome: "selected", id: classSpecific.id, duration: classSpecific.duration, via: "class_specific" };
  const distinct = new Set(scored.map((c) => c.duration).filter((d) => d && d.value > 0).map((d) => `${d.value}:${d.unit}`));
  if (distinct.size > 1) return { outcome: "ambiguous" };
  scored.sort((l, r) => durationDays(r.duration) - durationDays(l.duration) || r.routeScore - l.routeScore);
  const sel = scored[0];
  return sel?.duration ? { outcome: "selected", id: sel.id, duration: sel.duration, via: "longest_then_route_score" } : { outcome: "none" };
}
// ---------------------------------------------------------------------------

function e3AnswersFor(code, publicProfile) {
  const contexts = (reach.remedyContexts ?? []).filter((c) => c.jurisdiction === code);
  const best = contexts.slice().sort((a, b) => (RANK[a.bestTerminalResultCode] ?? 9) - (RANK[b.bestTerminalResultCode] ?? 9))[0];
  const answers = { ...(best?.answerSet ?? {}) };
  const declares = (id) => (publicProfile.questions ?? []).some((q) => q.id === id);
  for (const id of [...SHARED_UNRENDERED_FACTS, ...TIMING_GATE]) if (declares(id)) answers[id] = CLEAR_RECORD[id];
  return answers;
}

const rows = [];
for (const profile of getAllJurisdictionProfiles()) {
  const code = profile.jurisdiction.code;
  const answers = e3AnswersFor(code, projectPublicProfile(profile));
  const profileRuleIds = new Set((profile.waitingPeriodRules ?? []).map((r) => r.id));
  for (const pathway of (profile.pathways ?? [])) {
    const sel = priorSelection(profile, pathway, answers);
    rows.push({
      jurisdiction: code,
      pathwayId: pathway.id,
      outcome: sel.outcome,
      selectedRuleId: sel.id ?? null,
      selectedRuleIsProfileRule: sel.id ? profileRuleIds.has(sel.id) : false,
      duration: sel.duration ?? null,
      via: sel.via ?? null
    });
  }
}

const counts = rows.reduce((a, r) => { a[r.outcome] = (a[r.outcome] ?? 0) + 1; return a; }, {});
const payload = {
  schemaVersion: "expai-phase2-prior-waiting-rule-selection/v1",
  generatedBy: "scripts/expungement-ai/phase2/materialise-prior-bindings.mjs",
  head: gitSha(),
  note: "A one-time read of what the pre-correction prose-matching selector chose, under the audit's own E3 answer set. Used to guarantee the explicit binding table resolves every route the search used to resolve.",
  totals: { pathways: rows.length, ...counts },
  rows
};
fs.mkdirSync(path.join(ROOT_DIR, path.dirname(OUT)), { recursive: true });
fs.writeFileSync(path.join(ROOT_DIR, OUT), stableJson(payload));
console.log(`wrote ${OUT}`);
console.log(`  ${rows.length} pathways: ${JSON.stringify(counts)}`);
console.log(`  selections naming a profile rule: ${rows.filter((r) => r.selectedRuleIsProfileRule).length}`);
console.log(`  selections naming a pathway-local rule: ${rows.filter((r) => r.outcome === "selected" && !r.selectedRuleIsProfileRule).length}`);
