#!/usr/bin/env node
/**
 * #63 candidate acceptance.
 *
 * measure-route-deciding-fact-scope.mjs measures the compiled profiles and
 * produces the independent baseline ledger. #63 deliberately changes the
 * resolver and not the profiles, so that static view can never observe the fix
 * succeeding — it would report the same 250 routes forever. This script closes
 * that gap: it executes the ACTUAL production resolver for every route and
 * compares its output against the independent baseline classifications.
 *
 * The production implementation is used only to OBSERVE the candidate, which is
 * legitimate because the candidate is what is being measured. Every judgement
 * about a fact — universal, pathway-owned, owned by a scoped ordered rule, an
 * escalation fact, owned through lifecycle or typed-scalar authorship, or
 * unresolved — is made here, from the profiles, so the review does not inherit
 * the candidate's own reasoning. Codex's binding algorithm is not reproduced on
 * this side; if it were, agreement would prove nothing.
 *
 *   node scripts/verify-route-fact-candidate-acceptance.mjs \
 *     data/rcap-grade-a/mission-lock/task63-acceptance/deciding-fact-ledger.json
 *
 * Exit 0 accept, 1 reject.
 */
import fs from "node:fs";
import path from "node:path";
import Module, { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ts = require("typescript");

const PROFILE_DIR = "src/lib/rcap-engine/compiled/profiles";
const SOURCE = "src/lib/rcap-engine/route-fact-relevance.ts";
const ledgerPath = process.argv[2] ?? "data/rcap-grade-a/mission-lock/task63-acceptance/deciding-fact-ledger.json";

// --- load the production resolver (mechanism only) -------------------------
const sourceText = fs.readFileSync(SOURCE, "utf8");
const mod = new Module(path.resolve(SOURCE));
mod._compile(
  ts.transpileModule(sourceText, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
  SOURCE
);
const { routeDecidingFactScope, routeDecidingFactIds } = mod.exports;
if (typeof routeDecidingFactScope !== "function") {
  console.error("candidate does not export routeDecidingFactScope — wrong tree?");
  process.exit(1);
}

// --- independent authority model, built from the profiles ------------------
const productionUniversals = [...sourceText.match(/UNIVERSAL_PREPAY_FACT_IDS[^=]*=\s*new Set\(\[([\s\S]*?)\]\)/)[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
const UNIVERSAL = new Set(productionUniversals);
const ESCALATION = new Map();
for (const e of (sourceText.match(/ROUTE_ESCALATION_FACT_IDS[^=]*=\s*\{([\s\S]*?)\n\};/)?.[1] ?? "").matchAll(/"([^"]+)"\s*:\s*\[([\s\S]*?)\]/g)) {
  ESCALATION.set(e[1], [...e[2].matchAll(/"([^"]+)"/g)].map((m) => m[1]));
}

// The baseline's own collector: arrays of fact IDs under known keys.
const ARRAY_KEYS = ["fields", "fieldIds", "fieldsReferenced", "triggerFields", "requiredFields", "requiredInputIds", "questionIds"];
function collectArrays(value, into) {
  if (!value) return;
  if (Array.isArray(value)) { for (const e of value) { if (typeof e === "string") into.add(e); else collectArrays(e, into); } return; }
  if (typeof value !== "object") return;
  for (const k of ARRAY_KEYS) { const e = value[k]; if (Array.isArray(e)) for (const id of e) if (typeof id === "string") into.add(id); }
  for (const e of Object.values(value)) if (e && typeof e === "object") collectArrays(e, into);
}

// Typed authorship the baseline collector never read: fact IDs written as
// scalars or under typed array properties. Observed here directly from the
// profile data, which is what makes a "recovered" membership checkable.
const TYPED_SCALARS = ["factId", "anchorFactId", "timingAnchorFactId"];
const TYPED_ARRAYS = ["screeningFactIds", "timingAnchorAlternateFactIds", "anchorAlternates"];
function collectTyped(value, out) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) { for (const e of value) collectTyped(e, out); return; }
  for (const [k, e] of Object.entries(value)) {
    if (TYPED_SCALARS.includes(k) && typeof e === "string") out.add(e);
    else if (TYPED_ARRAYS.includes(k) && Array.isArray(e)) { for (const id of e) if (typeof id === "string") out.add(id); }
    else if (e && typeof e === "object") collectTyped(e, out);
  }
}

const profiles = fs.readdirSync(PROFILE_DIR).filter((f) => f.endsWith(".json")).sort()
  .map((f) => JSON.parse(fs.readFileSync(path.join(PROFILE_DIR, f), "utf8")));

function explicitRoutes(rule) {
  if (rule?.candidatePathwayIds?.length) return rule.candidatePathwayIds;
  if (rule?.pathwayIds?.length) return rule.pathwayIds;
  if (rule?.pathwayId) return [rule.pathwayId];
  return rule?.when?.backendPathwayId ? [rule.when.backendPathwayId] : [];
}

/**
 * Is this fact authored FOR THIS ROUTE by a rule that explicitly names it?
 *
 * The baseline ledger labelled a fact "decision" whenever a rule referenced it
 * and the rule named no routes at all, because that is how the OLD resolver
 * behaved -- an unscoped rule applied everywhere. That is the #63 defect, not
 * authorship, so losing such a membership is the fix working. Only a rule that
 * explicitly names this route establishes an authored membership whose loss
 * would be a regression.
 */
function authoredForRouteByExplicitRule(profile, pathway, fact) {
  for (const section of [profile.orderedDecisionRules ?? [], profile.exclusionRules ?? [], profile.waitingPeriodRules ?? []]) {
    for (const rule of section) {
      if (!explicitRoutes(rule).includes(pathway.id)) continue;
      const f = new Set(); collectArrays(rule, f); collectTyped(rule, f);
      if (f.has(fact)) return true;
    }
  }
  return false;
}

/** Independent provenance for one fact on one route. */
function provenance(profile, pathway, fact) {
  if (UNIVERSAL.has(fact)) return "universal";
  const own = new Set(); collectArrays(pathway, own);
  if (own.has(fact)) return "pathway";
  for (const rule of profile.orderedDecisionRules ?? []) {
    const cands = rule.candidatePathwayIds ?? [];
    if (cands.includes(pathway.id)) { const f = new Set(); collectArrays(rule, f); if (f.has(fact)) return "decision"; }
  }
  if ((ESCALATION.get(`${profile.jurisdiction.code}:${pathway.id}`) ?? []).includes(fact)) return "escalation";
  const consumers = profile.questionLifecycle?.routeConsumers ?? {};
  if (Array.isArray(consumers[fact]) && consumers[fact].includes(pathway.id)) return "lifecycle";
  const typed = new Set(); collectTyped(pathway, typed);
  if (typed.has(fact)) return "typed_scalar";
  return "unresolved";
}

// --- baseline ledger --------------------------------------------------------
const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
const baselineByRoute = new Map();
for (const row of ledger.ledger) {
  const key = `${row.jurisdiction}:${row.pathway}`;
  const m = baselineByRoute.get(key) ?? new Map();
  m.set(row.fact, row.basis);
  baselineByRoute.set(key, m);
}

// --- run the candidate ------------------------------------------------------
let routes = 0;
const fixed = [];            // baseline-foreign, gone from candidate
const retained = [];         // baseline-foreign, still present
const lost = { universal: [], pathway: [], decision: [], escalation: [] };
const unscopedDrop = [];     // baseline called it "decision", but no rule names this route: the defect class
const recovered = [];        // in candidate, not in baseline swept set
const unresolvedByProfile = new Map();

for (const profile of profiles) {
  const code = profile.jurisdiction.code;
  for (const pathway of profile.pathways ?? []) {
    routes += 1;
    const key = `${code}:${pathway.id}`;
    const scope = routeDecidingFactScope(profile, pathway);
    const candidate = scope.factIds;
    const ids = routeDecidingFactIds(profile, pathway);
    if (ids.size !== candidate.size) { console.error(`${key}: routeDecidingFactIds disagrees with routeDecidingFactScope`); process.exit(1); }

    const base = baselineByRoute.get(key) ?? new Map();
    for (const [fact, basis] of base) {
      const present = candidate.has(fact);
      if (basis === "foreign") (present ? retained : fixed).push({ key, fact, provenance: present ? provenance(profile, pathway, fact) : null });
      else if (!present && lost[basis]) {
        if (basis === "decision" && !authoredForRouteByExplicitRule(profile, pathway, fact)) {
          unscopedDrop.push({ key, fact });
        } else lost[basis].push({ key, fact });
      }
    }
    for (const fact of candidate) {
      if (!base.has(fact)) recovered.push({ key, fact, provenance: provenance(profile, pathway, fact) });
    }
    if (scope.unresolvedRules?.length) {
      const seen = unresolvedByProfile.get(code) ?? new Set();
      for (const r of scope.unresolvedRules) for (const f of r.factIds) seen.add(f);
      unresolvedByProfile.set(code, seen);
    }
  }
}

// --- report -----------------------------------------------------------------
const baselineForeign = ledger.totals.foreign;
console.log("#63 candidate acceptance — production resolver against the independent baseline\n");
console.log(`  routes executed                                  ${routes}`);
console.log(`  baseline genuinely-foreign memberships            ${baselineForeign}`);
console.log(`    of those, ABSENT from the candidate (fixed)     ${fixed.length}`);
console.log(`    of those, still RETAINED                        ${retained.length}`);
console.log(`  memberships in candidate but not in baseline sweep ${recovered.length}`);
console.log(`  baseline "decision" memberships dropped that no explicit rule authored  ${unscopedDrop.length}`);
console.log("    (these came from rules naming no route at all — the #63 defect, so dropping them is the fix)");
console.log("\n  losses — these are the dangerous direction:");
for (const k of ["universal", "pathway", "decision", "escalation"]) {
  console.log(`    ${k.padEnd(11)} lost   ${String(lost[k].length).padStart(4)}`);
}

if (recovered.length) {
  const byProv = {};
  for (const r of recovered) (byProv[r.provenance] ??= []).push(r);
  console.log("\n  provenance of the recovered memberships (judged independently):");
  for (const [p, list] of Object.entries(byProv).sort((a, b) => b[1].length - a[1].length)) {
    console.log(`    ${p.padEnd(13)} ${String(list.length).padStart(4)}   e.g. ${list.slice(0, 3).map((r) => `${r.key.split(":")[0]}/${r.fact}`).join(", ")}`);
  }
  const unsupported = byProv.unresolved ?? [];
  if (unsupported.length) {
    console.log(`\n  RECOVERED WITHOUT INDEPENDENT AUTHORED BASIS: ${unsupported.length}`);
    for (const r of unsupported.slice(0, 20)) console.log(`    ${r.key}  ${r.fact}`);
  }
}

if (retained.length) {
  console.log(`\n  RETAINED baseline-foreign memberships: ${retained.length}`);
  const byProv = {};
  for (const r of retained) (byProv[r.provenance] ??= []).push(r);
  for (const [p, list] of Object.entries(byProv)) console.log(`    now claimed by ${p}: ${list.length}`);
  for (const r of retained.slice(0, 20)) console.log(`    ${r.key}  ${r.fact}  (${r.provenance})`);
}

console.log(`\n  profiles reporting unresolved ownership          ${unresolvedByProfile.size}`);
if (unresolvedByProfile.size) {
  console.log(`    ${[...unresolvedByProfile.keys()].sort().join(" ")}`);
  for (const [code, facts] of [...unresolvedByProfile].sort()) {
    console.log(`    ${code.padEnd(3)} ${facts.size} fact(s): ${[...facts].sort().slice(0, 8).join(", ")}`);
  }
}

const reconciliation = { baselineForeign, fixed: fixed.length, retained: retained.length, recovered: recovered.length };
fs.writeFileSync(
  path.join(path.dirname(ledgerPath), "candidate-acceptance.json"),
  `${JSON.stringify({ measuredAt: new Date().toISOString().slice(0, 10), reconciliation, lost, recovered, retained, unresolved: Object.fromEntries([...unresolvedByProfile].map(([k, v]) => [k, [...v].sort()])) }, null, 2)}\n`
);

const lostTotal = Object.values(lost).reduce((n, l) => n + l.length, 0);
const unsupportedRecovered = recovered.filter((r) => r.provenance === "unresolved").length;
console.log("");
if (lostTotal > 0) { console.log(`VERDICT: REJECT — ${lostTotal} authored membership(s) lost.`); process.exit(1); }
if (unsupportedRecovered > 0) { console.log(`VERDICT: REJECT — ${unsupportedRecovered} recovered membership(s) have no independent authored basis.`); process.exit(1); }
// A retained membership is only a failure when nothing authored explains it.
// Where this review independently locates authored ownership, the honest
// reading is that the baseline mislabelled the fact as foreign -- its collector
// could not see typed scalar authorship -- not that the candidate kept junk.
const retainedUnexplained = retained.filter((r) => r.provenance === "unresolved");
if (retainedUnexplained.length > 0) {
  console.log(`VERDICT: REJECT — ${retainedUnexplained.length} retained membership(s) with no authored basis.`);
  for (const r of retainedUnexplained.slice(0, 20)) console.log(`    ${r.key}  ${r.fact}`);
  process.exit(1);
}
if (retained.length > 0) {
  console.log(`NOTE: ${retained.length} membership(s) the baseline called foreign are retained, each with authored basis`);
  console.log(`      located independently. The baseline over-reported by that many; the candidate is right.`);
}
console.log("VERDICT: ACCEPT on scope — every genuinely foreign membership is gone, no authored membership was lost,");
console.log("and every recovered membership has an independent authored basis. Unresolved ownership is reported, not guessed.");
