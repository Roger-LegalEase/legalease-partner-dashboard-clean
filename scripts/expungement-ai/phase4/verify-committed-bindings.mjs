#!/usr/bin/env node
/**
 * Phase 4 integrity check of every committed waiting-rule binding.
 *
 * For each binding the assignment requires four things: the rule id exists in
 * the same jurisdiction, the quoted source and the structured duration agree,
 * the duration is the operative wait rather than some other number in the same
 * sentence, and the route the binding names actually exists. Read-only; a defect
 * is recorded, never repaired.
 */
import { getProfileByJurisdiction, writeArtifact, gitSha, readJson } from "../flow-audit/lib/engine.mjs";

const BINDINGS = readJson("src/lib/rcap-engine/waiting-rule-bindings.json");

const WORD_NUMBERS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fifteen: 15, twenty: 20, thirty: 30, sixty: 60, ninety: 90
};

/** Every duration a quote states, in the quote's own units. */
function durationsIn(text) {
  const found = [];
  const pattern = /\b(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|sixty|ninety)[\s-]+(day|days|month|months|year|years)\b/gi;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    const raw = match[1].toLowerCase();
    const value = /^\d+$/.test(raw) ? Number(raw) : WORD_NUMBERS[raw];
    if (value === undefined) continue;
    found.push({ value, unit: match[2].toLowerCase().replace(/s$/, "") + "s", at: match.index, phrase: match[0] });
  }
  return found;
}

const AGE = /\b(?:age|aged|years of age|or older|turns?|turned|reaching age)\b/i;
const LOOKBACK = /\b(?:lookback|look-back|within the (?:past|last|preceding)|during the (?:past|preceding)|preceding)\b/i;
const TERM = /\b(?:sentence of at least|term of imprisonment|probation(?:ary)? (?:term|period)|maximum penalty|punishable by|max penalty)\b/i;
const DISQUALIFY = /\b(?:unless|not eligible|ineligible|excluded|disqualif)/i;

/** Classify what the number the binding took actually is, in its own sentence. */
function classifyNumber(quote, value, unit) {
  const flags = [];
  const stated = durationsIn(quote);
  const match = stated.find((d) => d.value === value && d.unit === unit);
  if (stated.length === 0) flags.push("quote_states_no_duration");
  else if (!match) flags.push("quote_does_not_state_this_duration");
  if (stated.length > 1) flags.push("quote_states_multiple_durations");
  const window = match ? quote.slice(Math.max(0, match.at - 70), match.at + match.phrase.length + 70) : quote;
  if (AGE.test(window)) flags.push("age_threshold_in_scope");
  if (LOOKBACK.test(window)) flags.push("lookback_window_in_scope");
  if (TERM.test(window)) flags.push("sentence_or_probation_term_in_scope");
  if (DISQUALIFY.test(window)) flags.push("disqualifying_window_in_scope");
  if (unit === "years" && value >= 25) flags.push("implausible_as_a_waiting_period");
  return { flags, statedDurations: stated.map((d) => `${d.value} ${d.unit}`), matchedInQuote: !!match };
}

const report = {
  schemaVersion: "expai-phase4-binding-integrity/v1",
  candidateSha: gitSha("HEAD"),
  contract: "Every committed binding checked for rule existence, quote/duration agreement, and whether the number taken is the operative wait.",
  totals: { bindings: 0, clean: 0, withFindings: 0, byResolution: {} },
  bindings: {}
};

for (const [key, binding] of Object.entries(BINDINGS.bindings ?? {})) {
  report.totals.bindings += 1;
  report.totals.byResolution[binding.resolution] = (report.totals.byResolution[binding.resolution] ?? 0) + 1;
  const [code, ...rest] = key.split(":");
  const pathwayId = rest.join(":");
  const findings = [];
  let profile = null;
  try { profile = getProfileByJurisdiction(code); } catch { findings.push({ code: "JURISDICTION_NOT_RESOLVABLE", detail: code }); }

  const pathway = (profile?.pathways ?? []).find((p) => p.id === pathwayId);
  if (profile && !pathway) findings.push({ code: "PATHWAY_NOT_IN_PROFILE", detail: `${code} publishes no pathway ${pathwayId}` });
  if (binding.jurisdiction && binding.jurisdiction !== code) findings.push({ code: "JURISDICTION_MISMATCH", detail: `${binding.jurisdiction} vs ${code}` });

  const rules = profile?.waitingPeriodRules ?? [];
  const byId = new Map(rules.map((r) => [String(r.id), r]));

  if (binding.resolution === "rules") {
    for (const ref of binding.ruleRefs ?? []) {
      const rule = byId.get(ref);
      if (!rule) { findings.push({ code: "RULE_ID_NOT_IN_JURISDICTION", detail: `${code} publishes no ${ref}` }); continue; }
      if (!rule.duration || typeof rule.duration.value !== "number") {
        findings.push({ code: "BOUND_RULE_CARRIES_NO_DURATION", detail: ref });
        continue;
      }
      const declared = (binding.provenance ?? []).find((p) => p.ruleId === ref);
      if (!declared) { findings.push({ code: "NO_PROVENANCE_FOR_BOUND_RULE", detail: ref }); continue; }
      if (JSON.stringify(declared.duration) !== JSON.stringify(rule.duration)) {
        findings.push({ code: "PROVENANCE_DURATION_DISAGREES_WITH_PROFILE", detail: `${ref}: binding ${JSON.stringify(declared.duration)} vs profile ${JSON.stringify(rule.duration)}` });
      }
      const quote = String(declared.quote ?? "");
      if (!String(rule.ruleText ?? "").startsWith(quote.slice(0, 60)) && !String(rule.ruleText ?? "").includes(quote.slice(0, 60))) {
        findings.push({ code: "PROVENANCE_QUOTE_NOT_FROM_THE_BOUND_RULE", detail: ref });
      }
      const classified = classifyNumber(quote, rule.duration.value, rule.duration.unit);
      if (classified.flags.length > 0) {
        findings.push({ code: "DURATION_MAY_NOT_BE_THE_OPERATIVE_WAIT", detail: ref, duration: rule.duration, ...classified, quote: quote.slice(0, 240) });
      }
    }
    // Multi-rule bindings that resolve by longest duration can never open early,
    // but they can hold a participant behind a rule from a different class.
    if ((binding.ruleRefs ?? []).length > 1) {
      const durations = (binding.ruleRefs ?? []).map((ref) => byId.get(ref)?.duration).filter(Boolean);
      const distinct = new Set(durations.map((d) => `${d.value} ${d.unit}`));
      if (distinct.size > 1) {
        findings.push({ code: "MULTI_CLASS_BINDING_COLLAPSED_TO_ONE_BRANCH", detail: `${binding.ruleRefs.length} rules, ${distinct.size} distinct durations: ${[...distinct].join(", ")}; disambiguation=${binding.disambiguation ?? "none"}` });
      }
    }
  } else if (binding.resolution === "inline") {
    const duration = binding.inlineRule?.duration;
    const quote = String(binding.inlineRule?.quote ?? "");
    if (!duration || typeof duration.value !== "number") findings.push({ code: "INLINE_RULE_CARRIES_NO_DURATION", detail: key });
    else {
      const classified = classifyNumber(quote, duration.value, duration.unit);
      if (classified.flags.length > 0) {
        findings.push({ code: "DURATION_MAY_NOT_BE_THE_OPERATIVE_WAIT", detail: binding.inlineRule?.id ?? "inline", duration, ...classified, quote: quote.slice(0, 240) });
      }
    }
    // An inline duration is materialised, not published: nothing re-derives it.
    findings.push({ code: "INLINE_DURATION_NOT_TRACEABLE_TO_A_PUBLISHED_RULE_ID", detail: `${key} carries ${JSON.stringify(duration)} outside profile.waitingPeriodRules`, severity: "informational" });
  } else if (binding.resolution === "no_waiting_period") {
    if (!binding.provenanceQuote) findings.push({ code: "NO_WAITING_PERIOD_WITHOUT_A_QUOTE", detail: key });
  }

  const material = findings.filter((f) => f.severity !== "informational");
  if (material.length > 0) report.totals.withFindings += 1; else report.totals.clean += 1;
  report.bindings[key] = { resolution: binding.resolution, ruleRefs: binding.ruleRefs ?? null, findings, materialFindingCount: material.length };
}

report.totals.fallbackDependentRoutes = {
  unresolvedPreserved: (BINDINGS.unresolvedPreserved?.keys ?? []).length,
  unresolvedAtBase: (BINDINGS.unresolvedAtBase?.keys ?? []).length
};

writeArtifact("data/expungement-ai/flow-audit/phase4/binding-integrity.json", report);
console.log(JSON.stringify(report.totals, null, 1));
const codes = {};
for (const value of Object.values(report.bindings)) for (const f of value.findings) codes[f.code] = (codes[f.code] ?? 0) + 1;
console.log("FINDING CODES", JSON.stringify(codes, null, 1));
