#!/usr/bin/env node
/**
 * Phase 4 correction: the waiting-rule authority.
 *
 * Audits all 43 committed bindings, corrects or withdraws the defective ones,
 * and applies a Phase 3 proposal only when the repository itself settles it.
 * Nothing here authors a waiting period: a binding that cannot be settled from
 * committed content becomes `legal_review_required`, which the evaluator already
 * treats as a configuration failure and which the checkout authority treats as
 * non-purchasable.
 *
 * Emits the corrected src/lib/rcap-engine/waiting-rule-bindings.json and the
 * audit record behind it.
 */
import fs from "node:fs";
import path from "node:path";
import { getProfileByJurisdiction, readJson, ROOT_DIR, writeArtifact, gitSha } from "../flow-audit/lib/engine.mjs";

const BINDINGS = readJson("src/lib/rcap-engine/waiting-rule-bindings.json");

const WORD_NUMBERS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fifteen: 15, eighteen: 18, twenty: 20, thirty: 30, sixty: 60, ninety: 90, "one hundred eighty": 180
};
const DURATION_PATTERN = /\b(\d{1,3}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|eighteen|twenty|thirty|sixty|ninety)[\s-]+(day|days|month|months|year|years)\b/gi;

function durationsIn(text) {
  const found = [];
  let match;
  DURATION_PATTERN.lastIndex = 0;
  while ((match = DURATION_PATTERN.exec(String(text))) !== null) {
    const raw = match[1].toLowerCase();
    const value = /^\d+$/.test(raw) ? Number(raw) : WORD_NUMBERS[raw];
    if (value === undefined) continue;
    found.push({ value, unit: `${match[2].toLowerCase().replace(/s$/, "")}s`, at: match.index, phrase: match[0] });
  }
  return found;
}

const AGE = /\b(?:age|aged|years of age|or older|turns?|turned|reaching age)\b/i;
const LOOKBACK = /\b(?:lookback|look-back|within the (?:past|last|preceding)|during the (?:past|preceding)|preceding)\b/i;
const TERM = /\b(?:sentence of at least|term of imprisonment|probation(?:ary)? (?:term|period)|maximum penalty|punishable by|max penalty|no more than \d+ years? imprisonment)\b/i;
const DISQUALIFY = /\b(?:unless|not eligible|ineligible|excluded|disqualif|may object|objection)/i;
const SEVERITY = /\b(?:class [1-9a-f]\b|level [1-6]\b|felony punishable|misdemeanor punishable|offense punishable)/i;

/**
 * Is the number the binding took the operative wait, or something else in the
 * same sentence? Returns the exact flags, so a withdrawal can say why.
 */
function classifyDuration(quote, duration) {
  const text = String(quote ?? "");
  const flags = [];
  const stated = durationsIn(text);
  const match = stated.find((entry) => entry.value === duration.value && entry.unit === duration.unit);
  if (stated.length === 0) flags.push("quote_states_no_duration");
  else if (!match) flags.push("quote_does_not_state_this_duration");
  if (stated.length > 1) flags.push("quote_states_multiple_durations");
  const window = match ? text.slice(Math.max(0, match.at - 70), match.at + match.phrase.length + 70) : text;
  if (AGE.test(window)) flags.push("age_threshold");
  if (LOOKBACK.test(window)) flags.push("lookback_window");
  if (TERM.test(window)) flags.push("sentence_or_probation_term");
  if (DISQUALIFY.test(window)) flags.push("disqualifying_historical_window");
  if (SEVERITY.test(window)) flags.push("offense_severity_qualifier");
  if (duration.unit === "years" && duration.value >= 25) flags.push("implausible_as_a_waiting_period");
  return { flags, statedDurations: stated.map((entry) => `${entry.value} ${entry.unit}`), operative: flags.length === 0 };
}

/**
 * Statute citations a piece of text makes, normalised. "610.130", "§ 15-27-2(c)"
 * and "CPL 160.59" all reduce to a comparable token.
 */
function citationsIn(text) {
  const found = new Set();
  for (const match of String(text ?? "").matchAll(/\b(\d{1,3})[.\u2013-](\d{1,4})(?:[.\u2013-](\d{1,4}))?\b/g)) {
    found.add([match[1], match[2], match[3]].filter(Boolean).join("."));
  }
  return found;
}

/**
 * Does the bound rule speak about THIS route, or about a different one the same
 * profile publishes?
 *
 * The Missouri marijuana binding is the case this exists for: it binds a rule
 * whose own text is "First intoxication-related traffic/boating offense 610.130
 * ... after 10 years", and 610.130 is the citation of a different Missouri
 * pathway. A duration can be perfectly well-formed and still belong to another
 * remedy, and no amount of checking the number catches that.
 */
function routeRelevance(profile, pathwayId, ruleText) {
  const pathways = profile?.pathways ?? [];
  const self = pathways.find((pathway) => pathway.id === pathwayId);
  const ruleCitations = citationsIn(ruleText);
  if (ruleCitations.size === 0) return { supported: true, reason: "the rule cites no statute, so it cannot cite another route's" };
  const selfCitations = citationsIn(`${self?.id ?? ""} ${self?.label ?? ""} ${self?.summary ?? ""} ${self?.sourceRef ?? ""}`);
  for (const citation of ruleCitations) if (selfCitations.has(citation)) {
    return { supported: true, reason: `the rule cites ${citation}, which is this route's own statute` };
  }
  const foreign = [];
  for (const pathway of pathways) {
    if (pathway.id === pathwayId) continue;
    const other = citationsIn(`${pathway.id} ${pathway.label} ${pathway.summary} ${pathway.sourceRef ?? ""}`);
    for (const citation of ruleCitations) if (other.has(citation)) foreign.push({ citation, pathwayId: pathway.id });
  }
  if (foreign.length > 0) {
    return { supported: false, reason: `the rule cites ${foreign.map((entry) => `${entry.citation} (${entry.pathwayId})`).join(", ")}, which belong to other routes this profile publishes, and none of this route's own`, foreign };
  }
  return { supported: true, reason: "the rule cites no statute belonging to another published route" };
}

const profileCache = new Map();
function profileFor(code) {
  if (!profileCache.has(code)) {
    try { profileCache.set(code, getProfileByJurisdiction(code)); } catch { profileCache.set(code, null); }
  }
  return profileCache.get(code);
}
const rulesOf = (profile) => new Map((profile?.waitingPeriodRules ?? []).map((rule) => [String(rule.id), rule]));
const normalize = (text) => String(text ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/* ------------------------------------------------------------------ *
 * Part 1 — audit the 43 committed bindings.
 * ------------------------------------------------------------------ */
const audit = {};
const corrected = {};
let validatedExplicit = 0, validatedInline = 0, correctionRequired = 0, legalOwner = 0;

for (const [key, binding] of Object.entries(BINDINGS.bindings ?? {})) {
  const code = key.split(":")[0];
  const pathwayId = key.slice(code.length + 1);
  const profile = profileFor(code);
  const byId = rulesOf(profile);
  const pathwayExists = (profile?.pathways ?? []).some((pathway) => pathway.id === pathwayId);
  const findings = [];
  let classification;
  let output = { ...binding };

  if (!profile || !pathwayExists) {
    classification = "CORRECTION_REQUIRED";
    findings.push({ code: "ROUTE_NOT_IN_PROFILE", detail: `${code} publishes no pathway ${pathwayId}` });
    output = { ...binding, resolution: "legal_review_required" };
  } else if (binding.resolution === "no_waiting_period") {
    // An authored "no ordinary waiting period" is a source statement. It is kept
    // only when the binding carries the quote that says so.
    if (binding.provenanceQuote) { classification = "VALIDATED_EXPLICIT_BINDING"; validatedExplicit += 1; }
    else {
      classification = "LEGAL_OWNER_DECISION_REQUIRED";
      findings.push({ code: "NO_WAITING_PERIOD_WITHOUT_A_QUOTE", detail: key });
      output = { ...binding, resolution: "legal_review_required" };
    }
  } else if (binding.resolution === "inline") {
    const duration = binding.inlineRule?.duration;
    const quote = binding.inlineRule?.quote ?? "";
    if (!duration || typeof duration.value !== "number") {
      classification = "CORRECTION_REQUIRED";
      findings.push({ code: "INLINE_RULE_CARRIES_NO_DURATION", detail: key });
      output = { ...binding, resolution: "legal_review_required" };
    } else {
      const classified = classifyDuration(quote, duration);
      const relevance = routeRelevance(profile, pathwayId, quote);
      if (classified.operative && relevance.supported) { classification = "VALIDATED_INLINE_RULE"; validatedInline += 1; }
      else if (!relevance.supported) {
        classification = "CORRECTION_REQUIRED";
        findings.push({ code: "INLINE_RULE_GOVERNS_A_DIFFERENT_ROUTE", detail: relevance.reason, duration, quote: quote.slice(0, 240) });
        output = { ...binding, resolution: "legal_review_required", withdrawnInlineRule: binding.inlineRule };
        delete output.inlineRule;
      }
      else {
        classification = "CORRECTION_REQUIRED";
        findings.push({ code: "INLINE_DURATION_IS_NOT_THE_OPERATIVE_WAIT", detail: binding.inlineRule?.id ?? "inline", duration, ...classified, quote: quote.slice(0, 240) });
        // Withdrawn, not rewritten: choosing a different number here would be
        // authoring a waiting period from a defective source.
        output = { ...binding, resolution: "legal_review_required", withdrawnInlineRule: binding.inlineRule };
        delete output.inlineRule;
      }
    }
  } else if (binding.resolution === "rules") {
    const keptRefs = [];
    const withdrawnRefs = [];
    for (const ref of binding.ruleRefs ?? []) {
      const rule = byId.get(ref);
      if (!rule) { withdrawnRefs.push({ ref, reason: "RULE_ID_NOT_IN_JURISDICTION" }); continue; }
      if (!rule.duration || typeof rule.duration.value !== "number") { withdrawnRefs.push({ ref, reason: "RULE_CARRIES_NO_STRUCTURED_DURATION" }); continue; }
      const declared = (binding.provenance ?? []).find((entry) => entry.ruleId === ref);
      if (!declared) { withdrawnRefs.push({ ref, reason: "NO_PROVENANCE_FOR_BOUND_RULE" }); continue; }
      if (JSON.stringify(declared.duration) !== JSON.stringify(rule.duration)) {
        withdrawnRefs.push({ ref, reason: "PROVENANCE_DURATION_DISAGREES_WITH_PROFILE" });
        continue;
      }
      const classified = classifyDuration(declared.quote ?? rule.ruleText, rule.duration);
      if (!classified.operative) {
        withdrawnRefs.push({ ref, reason: "DURATION_IS_NOT_THE_OPERATIVE_WAIT", flags: classified.flags, duration: rule.duration, quote: String(declared.quote ?? "").slice(0, 200) });
        continue;
      }
      const relevance = routeRelevance(profile, pathwayId, `${declared.quote ?? ""} ${rule.ruleText ?? ""}`);
      if (!relevance.supported) {
        withdrawnRefs.push({ ref, reason: "RULE_GOVERNS_A_DIFFERENT_ROUTE", detail: relevance.reason, duration: rule.duration, quote: String(declared.quote ?? "").slice(0, 200) });
        continue;
      }
      keptRefs.push(ref);
    }
    const keptDurations = new Set(keptRefs.map((ref) => {
      const duration = byId.get(ref).duration;
      return `${duration.value} ${duration.unit}`;
    }));
    if (withdrawnRefs.length > 0) findings.push({ code: "DEFECTIVE_RULE_REFS_WITHDRAWN", withdrawnRefs });
    if (keptRefs.length === 0) {
      classification = "LEGAL_OWNER_DECISION_REQUIRED";
      findings.push({ code: "NO_OPERATIVE_RULE_SURVIVES", detail: `every bound rule for ${key} carried a non-operative duration` });
      output = { ...binding, resolution: "legal_review_required", withdrawnRuleRefs: withdrawnRefs };
      delete output.ruleRefs;
      delete output.provenance;
      delete output.disambiguation;
    } else if (keptDurations.size > 1) {
      // Several offence classes still collapse into one answer. `longest` can
      // never open a packet early, so the route stays usable for guidance, but a
      // duration that is one branch of a multi-class rule is not validated and
      // the checkout authority refuses it.
      classification = "CORRECTION_REQUIRED";
      findings.push({ code: "MULTI_CLASS_BINDING_NOT_SPLIT_BY_CLASS", detail: `${keptRefs.length} rules, ${keptDurations.size} distinct durations: ${[...keptDurations].join(", ")}`, keptRefs });
      output = {
        ...binding,
        ruleRefs: keptRefs,
        provenance: (binding.provenance ?? []).filter((entry) => keptRefs.includes(entry.ruleId)),
        disambiguation: "longest_bound_duration",
        ...(withdrawnRefs.length > 0 ? { withdrawnRuleRefs: withdrawnRefs } : {})
      };
    } else {
      classification = withdrawnRefs.length > 0 ? "VALIDATED_EXPLICIT_BINDING" : "VALIDATED_EXPLICIT_BINDING";
      validatedExplicit += 1;
      output = {
        ...binding,
        ruleRefs: keptRefs,
        provenance: (binding.provenance ?? []).filter((entry) => keptRefs.includes(entry.ruleId)),
        disambiguation: keptRefs.length > 1 ? "longest_bound_duration" : "single_bound_rule",
        ...(withdrawnRefs.length > 0 ? { withdrawnRuleRefs: withdrawnRefs } : {})
      };
    }
  } else {
    classification = "LEGAL_OWNER_DECISION_REQUIRED";
    findings.push({ code: "UNRECOGNISED_RESOLUTION", detail: binding.resolution });
    output = { ...binding, resolution: "legal_review_required" };
  }

  if (classification === "CORRECTION_REQUIRED") correctionRequired += 1;
  if (classification === "LEGAL_OWNER_DECISION_REQUIRED") legalOwner += 1;
  output.phase4Classification = classification;
  output.phase4AuditedAt = "phase-4-corrections";
  audit[key] = { classification, findings, resolutionBefore: binding.resolution, resolutionAfter: output.resolution };
  corrected[key] = output;
}

/* ------------------------------------------------------------------ *
 * Part 2 — the 87 Phase 3 proposals, tested against the repository.
 * ------------------------------------------------------------------ */
const DO_NOT_BIND = /do not bind|fidelityWarning|must not be bound|not safe to bind/i;

/** One shape for a proposal, whatever shape its shard wrote it in. */
function normalizeProposal(route, raw) {
  const nested = raw.proposal ?? raw.proposedBinding ?? raw.proposedConditionalBinding ?? {};
  const resolution = raw.proposedResolution ?? nested.resolution ?? nested.proposedResolution
    ?? (raw.ruleRefs || nested.ruleRefs ? "rules" : undefined);
  const ruleRefs = raw.ruleRefs ?? nested.ruleRefs ?? raw.proposedRuleRefs ?? nested.proposedRuleRefs ?? [];
  const quote = raw.quote ?? nested.quote ?? raw.evidence?.quote ?? raw.corroboratingQuote ?? nested.corroboratingQuote ?? "";
  const duration = raw.durationAsProfileStatesIt ?? raw.durationAsTheProfileStatesIt
    ?? nested.durationAsProfileStatesIt ?? nested.durationAsTheProfileStatesIt ?? nested.duration ?? null;
  const selectingField = raw.selectingFieldId ?? raw.fieldId ?? raw.selectingField ?? nested.selectingFieldId ?? nested.fieldId ?? null;
  const branches = raw.branches ?? raw.proposedBranches ?? nested.branches ?? null;
  const counselOpen = raw.openQuestionsForCounsel ?? nested.openQuestionsForCounsel ?? null;
  const caveat = raw.caveat ?? nested.caveat ?? raw.fidelityWarningForTheCaptain ?? nested.fidelityWarningForTheCaptain ?? null;
  return { route, resolution, ruleRefs: Array.isArray(ruleRefs) ? ruleRefs : [ruleRefs].filter(Boolean), quote, duration, selectingField, branches, counselOpen, caveat, raw };
}

const proposalDecisions = {};
let applied = 0, held = 0;
for (let index = 1; index <= 6; index += 1) {
  const shard = readJson(`data/expungement-ai/flow-audit/shard-results/SHARD-${index}.json`);
  for (const [route, value] of Object.entries(shard.waitingRuleDispositions ?? {})) {
    if (!/BINDING_PROPOSED/.test(value.disposition)) continue;
    const proposal = normalizeProposal(route, value);
    const code = route.split(":")[0];
    const pathwayId = route.slice(code.length + 1);
    const profile = profileFor(code);
    const byId = rulesOf(profile);
    const publishedQuestionIds = new Set((profile?.questions ?? []).map((question) => question.id));
    const blockers = [];

    if (!profile) blockers.push("JURISDICTION_NOT_RESOLVABLE");
    else if (!(profile.pathways ?? []).some((pathway) => pathway.id === pathwayId)) blockers.push("ROUTE_NOT_IN_PROFILE");
    if (corrected[route]) blockers.push("ROUTE_ALREADY_CARRIES_A_COMMITTED_BINDING");
    if (proposal.counselOpen && (Array.isArray(proposal.counselOpen) ? proposal.counselOpen.length > 0 : true)) blockers.push("PROPOSAL_LEAVES_QUESTIONS_OPEN_FOR_COUNSEL");
    if (proposal.caveat && DO_NOT_BIND.test(String(proposal.caveat))) blockers.push("SHARD_WARNED_AGAINST_BINDING_AS_PROPOSED");
    if (value.disposition === "EXPLICIT_CONDITIONAL_BINDING_PROPOSED") {
      // A conditional binding needs its selecting fact to be a question the flow
      // actually publishes, and the binding schema to be able to express it.
      if (!proposal.selectingField) blockers.push("CONDITIONAL_PROPOSAL_NAMES_NO_SELECTING_FACT");
      else if (!publishedQuestionIds.has(proposal.selectingField)) blockers.push(`SELECTING_FACT_NOT_PUBLISHED: ${proposal.selectingField}`);
      if (!proposal.branches) blockers.push("CONDITIONAL_PROPOSAL_NAMES_NO_BRANCHES");
    }

    let outputBinding = null;
    if (proposal.resolution === "no_waiting_period") {
      const quote = String(proposal.quote ?? "");
      if (!quote) blockers.push("NO_WAITING_PERIOD_PROPOSAL_CARRIES_NO_QUOTE");
      else if (!/\b(none|no waiting period|immediately|at disposition|upon disposition|no ordinary waiting)\b/i.test(quote)) {
        blockers.push("QUOTE_DOES_NOT_STATE_THAT_THERE_IS_NO_WAITING_PERIOD");
      }
      if (blockers.length === 0) outputBinding = { jurisdiction: code, pathwayId, resolution: "no_waiting_period", provenanceQuote: quote };
    } else if (proposal.resolution === "rules" || proposal.ruleRefs.length > 0) {
      if (proposal.ruleRefs.length === 0) blockers.push("PROPOSAL_NAMES_NO_RULE");
      const provenance = [];
      for (const ref of proposal.ruleRefs) {
        const rule = byId.get(ref);
        if (!rule) { blockers.push(`RULE_ID_NOT_IN_JURISDICTION: ${ref}`); continue; }
        if (!rule.duration || typeof rule.duration.value !== "number") { blockers.push(`BOUND_RULE_CARRIES_NO_DURATION: ${ref}`); continue; }
        if (proposal.duration && typeof proposal.duration === "object" && JSON.stringify(proposal.duration) !== JSON.stringify(rule.duration)) {
          blockers.push(`PROPOSED_DURATION_DISAGREES_WITH_THE_PROFILE: ${ref}`);
          continue;
        }
        const quote = String(proposal.quote ?? rule.ruleText ?? "");
        if (!normalize(rule.ruleText).includes(normalize(quote).slice(0, 40)) && !normalize(quote).includes(normalize(rule.ruleText).slice(0, 40))) {
          blockers.push(`QUOTE_NOT_TRACEABLE_TO_THE_NAMED_RULE: ${ref}`);
          continue;
        }
        const classified = classifyDuration(quote, rule.duration);
        if (!classified.operative) { blockers.push(`PROPOSED_DURATION_IS_NOT_THE_OPERATIVE_WAIT: ${ref} (${classified.flags.join(", ")})`); continue; }
        const relevance = routeRelevance(profile, pathwayId, `${quote} ${rule.ruleText ?? ""}`);
        if (!relevance.supported) { blockers.push(`PROPOSED_RULE_GOVERNS_A_DIFFERENT_ROUTE: ${ref} — ${relevance.reason}`); continue; }
        provenance.push({ ruleId: ref, duration: rule.duration, anchor: rule.anchor ?? null, quote: String(quote).slice(0, 400) });
      }
      const distinct = new Set(provenance.map((entry) => `${entry.duration.value} ${entry.duration.unit}`));
      if (provenance.length > 1 && distinct.size > 1) blockers.push("PROPOSAL_COLLAPSES_SEVERAL_CLASSES_INTO_ONE_DURATION");
      if (blockers.length === 0 && provenance.length > 0) {
        outputBinding = {
          jurisdiction: code, pathwayId, resolution: "rules",
          ruleRefs: provenance.map((entry) => entry.ruleId),
          disambiguation: provenance.length > 1 ? "longest_bound_duration" : "single_bound_rule",
          provenance
        };
      }
    } else {
      blockers.push("PROPOSAL_NAMES_NO_APPLICABLE_RESOLUTION");
    }

    if (outputBinding && blockers.length === 0) {
      outputBinding.reviewStatus = "applied_by_phase_4_corrections";
      outputBinding.appliedFrom = `SHARD-${index}`;
      outputBinding.phase4Classification = outputBinding.resolution === "no_waiting_period" ? "VALIDATED_EXPLICIT_BINDING" : "VALIDATED_EXPLICIT_BINDING";
      corrected[route] = outputBinding;
      applied += 1;
      proposalDecisions[route] = { shard: `SHARD-${index}`, disposition: value.disposition, decision: "APPLIED", resolution: outputBinding.resolution, ruleRefs: outputBinding.ruleRefs ?? null };
    } else {
      held += 1;
      proposalDecisions[route] = { shard: `SHARD-${index}`, disposition: value.disposition, decision: "HELD", blockers };
    }
  }
}

/* ------------------------------------------------------------------ *
 * Part 3 — write the corrected binding table and the audit record.
 * ------------------------------------------------------------------ */
const boundRoutes = new Set(Object.keys(corrected));
const stillOnFallback = [...new Set([
  ...(BINDINGS.unresolvedPreserved?.keys ?? []),
  ...(BINDINGS.unresolvedAtBase?.keys ?? [])
])].filter((route) => !boundRoutes.has(route)).sort();

const output = {
  ...BINDINGS,
  head: gitSha("HEAD"),
  generatedBy: "scripts/expungement-ai/phase4-corrections/build-waiting-rule-authority.mjs",
  contract: {
    ...BINDINGS.contract,
    phase4: "Every binding here has been audited for duration provenance. `phase4Classification` names the outcome. A route classified anything other than VALIDATED_* is refused consumer payment by src/lib/rcap-engine/checkout-authority.ts, and a route with no binding at all is refused payment outright — the provisional prose fallback still decides guidance and referral behaviour, but it can no longer reach checkout.",
    resolutions: { ...BINDINGS.contract.resolutions, legal_review_required: "the binding could not be settled from committed repository content; the route is held and is not purchasable" }
  },
  bindings: Object.fromEntries(Object.keys(corrected).sort().map((key) => [key, corrected[key]])),
  unresolvedPreserved: {
    ...BINDINGS.unresolvedPreserved,
    contract: "Routes with no authored binding. The pre-correction prose selector still decides them for guidance and referral, and the checkout authority refuses payment on every one of them. This is the counsel queue.",
    keys: stillOnFallback
  },
  unresolvedAtBase: {
    ...BINDINGS.unresolvedAtBase,
    keys: (BINDINGS.unresolvedAtBase?.keys ?? []).filter((route) => !boundRoutes.has(route))
  }
};
fs.writeFileSync(path.join(ROOT_DIR, "src/lib/rcap-engine/waiting-rule-bindings.json"), `${JSON.stringify(output, null, 2)}\n`);

const record = {
  schemaVersion: "expai-phase4-waiting-rule-authority/v1",
  generatedBy: "scripts/expungement-ai/phase4-corrections/build-waiting-rule-authority.mjs",
  contract: "Nothing here authors a waiting period. A defective duration is withdrawn, never rewritten; a route with nothing operative left is held for legal review.",
  committedBindingAudit: {
    total: Object.keys(audit).length,
    VALIDATED_EXPLICIT_BINDING: validatedExplicit,
    VALIDATED_INLINE_RULE: validatedInline,
    CORRECTION_REQUIRED: correctionRequired,
    LEGAL_OWNER_DECISION_REQUIRED: legalOwner,
    perBinding: audit
  },
  proposals: {
    total: Object.keys(proposalDecisions).length,
    applied, held,
    perProposal: proposalDecisions
  },
  routesStillOnTheProseFallback: stillOnFallback.length,
  bindingsAfter: Object.keys(corrected).length
};
writeArtifact("data/expungement-ai/flow-audit/phase4-corrections/waiting-rule-authority.json", record);
console.log(JSON.stringify({ ...record.committedBindingAudit, perBinding: undefined }, null, 1));
console.log(JSON.stringify({ proposalsApplied: applied, proposalsHeld: held, bindingsAfter: Object.keys(corrected).length, stillOnFallback: stillOnFallback.length }, null, 1));
