#!/usr/bin/env node
// Phase 2 — author src/lib/rcap-engine/waiting-rule-bindings.json.
//
// The binding table is the explicit pathway-to-rule reference the evaluator
// reads instead of matching display prose. Every entry is built from
// data/expungement-ai/phase2/waiting-rule-binding-evidence.json, which was
// produced by sweeping the rule ids each jurisdiction's OWN compiled profile
// already publishes.
//
// This script copies rule ids and quotes rule text. It never writes a duration,
// never reorders one, and never authors a rule that does not already exist.

import { ROOT_DIR, readJson, stableJson, gitSha, getProfileByJurisdiction } from "../flow-audit/lib/engine.mjs";
import fs from "node:fs";
import path from "node:path";

const OUT = "src/lib/rcap-engine/waiting-rule-bindings.json";
const evidence = readJson("data/expungement-ai/phase2/waiting-rule-binding-evidence.json");
const prior = readJson("data/expungement-ai/phase2/prior-waiting-rule-selection.json");

/**
 * DC is authored as an explicit no-waiting-period route rather than as a rule
 * reference, because the jurisdiction's own pathway content says so in terms:
 * "No ordinary waiting period; packet requires actual-innocence facts that the
 * offense did not occur." Binding it to a 90-day service rule would assert a
 * waiting period the source denies. This is the defect the audit named: the
 * duration parser recognises "no waiting period" and not "No ordinary waiting
 * period", so the route fell out of the candidate set entirely.
 */
const EXPLICIT = {
  "DC:dc_actual_innocence_expungement_16_803": {
    resolution: "no_waiting_period",
    provenanceQuote: "No ordinary waiting period; packet requires actual-innocence facts that the offense did not occur.",
    provenanceSource: "compiled pathway dc_actual_innocence_expungement_16_803 waitingRules[0]"
  }
};

const bindings = {};
for (const row of evidence.jurisdictions) {
  const code = row.jurisdiction;
  const pathwayId = row.intendedPathwayIds[0];
  if (!pathwayId) continue;
  const key = `${code}:${pathwayId}`;
  const profile = getProfileByJurisdiction(code);
  const byId = new Map((profile.waitingPeriodRules ?? []).map((r) => [r.id, r]));

  if (EXPLICIT[key]) {
    bindings[key] = {
      jurisdiction: code,
      pathwayId,
      ...EXPLICIT[key],
      reviewStatus: "derived_from_phase1b_evidence_pending_counsel_confirmation",
      correctsIssue: "UX-GLOBAL-013"
    };
    continue;
  }

  // Only rules that BOTH reach the intended terminal and carry a structured
  // duration the profile already publishes.
  const bound = row.sweep
    .filter((s) => s.reachesPacketReady && s.duration && typeof s.duration.value === "number")
    .map((s) => s.waitingRuleId);

  if (bound.length === 0) {
    bindings[key] = {
      jurisdiction: code, pathwayId,
      resolution: "legal_review_required",
      why: "No rule this jurisdiction publishes both reaches the intended terminal and carries a structured duration.",
      reviewStatus: "requires_counsel",
      correctsIssue: "UX-GLOBAL-013"
    };
    continue;
  }

  bindings[key] = {
    jurisdiction: code,
    pathwayId,
    resolution: "rules",
    ruleRefs: bound,
    // The repository's existing policy, preserved rather than replaced: the
    // longest bound period wins. Conservative by construction — a longer
    // required wait can only delay a packet, never open one early.
    disambiguation: "longest_bound_duration",
    provenance: bound.map((id) => {
      const rule = byId.get(id);
      return {
        ruleId: id,
        duration: rule?.duration ?? null,
        anchor: rule?.anchor ?? null,
        quote: String(rule?.ruleText ?? "").replace(/\s+/g, " ").trim().slice(0, 240)
      };
    }),
    reviewStatus: "derived_from_phase1b_evidence_pending_counsel_confirmation",
    correctsIssue: "UX-GLOBAL-013"
  };
}

/*
 * Continuity: every route the pre-correction search actually resolved must keep
 * resolving. A lookup that drops one of them is a regression, not a fix. The
 * 292 routes the old selector left "ambiguous" are NOT bound here — they never
 * produced a usable duration, and the resolver now says configuration_ambiguous
 * instead of asking the participant for a detail that would not have helped.
 */
for (const row of prior.rows) {
  if (row.outcome !== "selected") continue;
  const key = `${row.jurisdiction}:${row.pathwayId}`;
  if (bindings[key]) continue; // a Phase 1B correction outranks prior behaviour
  const profile = getProfileByJurisdiction(row.jurisdiction);
  const byId = new Map((profile.waitingPeriodRules ?? []).map((r) => [r.id, r]));

  if (row.selectedRuleIsProfileRule) {
    const rule = byId.get(row.selectedRuleId);
    bindings[key] = {
      jurisdiction: row.jurisdiction,
      pathwayId: row.pathwayId,
      resolution: "rules",
      ruleRefs: [row.selectedRuleId],
      disambiguation: "single_bound_rule",
      provenance: [{
        ruleId: row.selectedRuleId,
        duration: rule?.duration ?? null,
        anchor: rule?.anchor ?? null,
        quote: String(rule?.ruleText ?? "").replace(/\s+/g, " ").trim().slice(0, 240)
      }],
      reviewStatus: "materialised_from_pre_correction_selector",
      continuity: "This route resolved to this exact rule before the correction and still does."
    };
    continue;
  }

  // The old selector chose a rule the PATHWAY carries rather than one the
  // profile publishes. Its duration is materialised here, once, from the same
  // pathway text, so the runtime never parses prose again.
  const pathway = (profile.pathways ?? []).find((x) => x.id === row.pathwayId);
  const index = Number(String(row.selectedRuleId).replace("pathway-wait-", ""));
  const quote = String((pathway?.waitingRules ?? [])[index] ?? "").replace(/\s+/g, " ").trim();
  bindings[key] = {
    jurisdiction: row.jurisdiction,
    pathwayId: row.pathwayId,
    resolution: "inline",
    inlineRule: {
      id: row.selectedRuleId,
      duration: row.duration,
      quote: quote.slice(0, 240)
    },
    reviewStatus: "materialised_from_pre_correction_selector",
    continuity: "This route resolved to its own pathway-level waiting rule before the correction. The duration is materialised here so the runtime does not parse display prose.",
    provenanceSource: `compiled pathway ${row.pathwayId} waitingRules[${index}]`
  };
}

const payload = {
  schemaVersion: "rcap-waiting-rule-bindings/v1",
  generatedBy: "scripts/expungement-ai/phase2/author-waiting-rule-bindings.mjs",
  head: gitSha(),
  contract: {
    purpose: "The explicit pathway-to-waiting-rule reference the evaluator resolves. Replaces prose matching in bestWaitingRuleForPathway.",
    keys: "<JURISDICTION_CODE>:<compiled pathway id>",
    resolutions: {
      rules: "ruleRefs name ids in the jurisdiction's own profile.waitingPeriodRules; disambiguation picks among them deterministically",
      no_waiting_period: "the source states there is no ordinary waiting period for this route",
      inline: "the route's waiting rule is carried by the pathway rather than the profile rule list; its structured duration is materialised here",
      legal_review_required: "the binding cannot be settled from repository content and needs counsel"
    },
    invariant: "Every duration referenced here already exists in the jurisdiction's compiled profile. This file authors no waiting period."
  },
  bindings
};

fs.writeFileSync(path.join(ROOT_DIR, OUT), stableJson(payload));
const kinds = Object.values(bindings).reduce((a, b) => { a[b.resolution] = (a[b.resolution] ?? 0) + 1; return a; }, {});
console.log(`wrote ${OUT}`);
console.log(`  ${Object.keys(bindings).length} binding(s): ${JSON.stringify(kinds)}`);
for (const [k, v] of Object.entries(bindings)) {
  console.log(`   ${k.padEnd(72)} ${v.resolution}${v.ruleRefs ? ` [${v.ruleRefs.join(",")}]` : ""}`);
}
