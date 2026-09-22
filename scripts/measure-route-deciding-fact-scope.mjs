#!/usr/bin/env node
/**
 * The #63 acceptance instrument.
 *
 * routeDecidingFactIds in src/lib/rcap-engine/route-fact-relevance.ts scopes
 * decision rules by candidatePathwayIds, then sweeps exclusionRules and
 * waitingPeriodRules wholesale into every route. So a rule that decides one
 * route lands in the deciding set of every other route in the jurisdiction.
 *
 * This measures that, per route and per jurisdiction, so the fix can be checked
 * against the real population rather than against a sample. It changes nothing.
 *
 * Two ways to use it:
 *
 *   node scripts/measure-route-deciding-fact-scope.mjs
 *       Print the current injection census.
 *
 *   node scripts/measure-route-deciding-fact-scope.mjs --baseline <file.json>
 *       Compare against a recorded census and print what moved. This is the
 *       review mode: it names routes whose deciding set shrank, and separates
 *       the shrink that removed a foreign fact from the shrink that removed an
 *       exclusion fact the route may genuinely need.
 *
 *   node scripts/measure-route-deciding-fact-scope.mjs --emit <file.json>
 *       Write the census for later comparison.
 *
 * The direction matters more than the count. Over-inclusion asks a participant
 * for a fact that does not decide their route, which is a friction defect.
 * Under-inclusion drops a rule that does decide it, which can offer a route to
 * someone an exclusion should have stopped. A fix that shrinks deciding sets is
 * only correct where each removed fact genuinely does not bear on that route,
 * so every removal of an exclusion-derived fact is listed for reading rather
 * than counted as progress.
 */
import fs from "node:fs";
import path from "node:path";

const PROFILE_DIR = "src/lib/rcap-engine/compiled/profiles";

// Mirrors collectFieldIds in route-fact-relevance.ts. Kept as an independent
// transcription on purpose: importing the module under test would make this
// instrument agree with a regression by construction.
const FIELD_KEYS = ["fields", "fieldIds", "fieldsReferenced", "triggerFields", "requiredFields", "requiredInputIds", "questionIds"];
function collectFieldIds(value, into) {
  if (!value) return;
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === "string") into.add(entry);
      else collectFieldIds(entry, into);
    }
    return;
  }
  if (typeof value !== "object") return;
  for (const key of FIELD_KEYS) {
    const entry = value[key];
    if (Array.isArray(entry)) for (const id of entry) if (typeof id === "string") into.add(id);
  }
  for (const entry of Object.values(value)) if (entry && typeof entry === "object") collectFieldIds(entry, into);
}

// The universal prepay facts every route legitimately carries. Transcribed from
// UNIVERSAL_PREPAY_FACT_IDS; these are never counted as injected.
const UNIVERSAL = new Set(["state_exclusion_categories", "new_convictions_during_waiting_period"]);

function census() {
  const routes = [];
  for (const file of fs.readdirSync(PROFILE_DIR).filter((f) => f.endsWith(".json")).sort()) {
    const profile = JSON.parse(fs.readFileSync(path.join(PROFILE_DIR, file), "utf8"));
    const code = profile.jurisdiction?.code ?? file.replace(/\.json$/, "");

    const fromExclusions = new Set();
    collectFieldIds(profile.exclusionRules, fromExclusions);
    const fromWaiting = new Set();
    collectFieldIds(profile.waitingPeriodRules, fromWaiting);

    for (const pathway of profile.pathways ?? []) {
      // What the route would decide on if the sweep were scoped: its own
      // clauses plus the decision rules that actually name it.
      const own = new Set();
      collectFieldIds(pathway, own);
      for (const rule of profile.orderedDecisionRules ?? []) {
        const candidates = rule.candidatePathwayIds ?? [];
        if (candidates.length === 0 || candidates.includes(pathway.id)) collectFieldIds(rule, own);
      }
      const injectedExclusion = [...fromExclusions].filter((id) => !own.has(id) && !UNIVERSAL.has(id));
      const injectedWaiting = [...fromWaiting].filter((id) => !own.has(id) && !UNIVERSAL.has(id));
      const injected = [...new Set([...injectedExclusion, ...injectedWaiting])].sort();
      routes.push({
        jurisdiction: code,
        pathwayId: pathway.id,
        ownFacts: own.size,
        injected,
        injectedFromExclusions: injectedExclusion.sort(),
        injectedFromWaiting: injectedWaiting.sort()
      });
    }
  }
  return routes;
}

const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };

const rows = census();
const affected = rows.filter((r) => r.injected.length > 0);
const byJurisdiction = new Map();
for (const row of rows) {
  const entry = byJurisdiction.get(row.jurisdiction) ?? { routes: 0, affected: 0 };
  entry.routes += 1;
  if (row.injected.length > 0) entry.affected += 1;
  byJurisdiction.set(row.jurisdiction, entry);
}

const emit = flag("--emit");
if (emit) {
  fs.writeFileSync(emit, `${JSON.stringify({ measuredAt: new Date().toISOString().slice(0, 10), routes: rows }, null, 2)}\n`);
  console.log(`census written to ${emit}`);
}

const baselineFile = flag("--baseline");
if (!baselineFile) {
  console.log("#63 route deciding-fact scope — current census\n");
  console.log(`  jurisdictions                        ${byJurisdiction.size}`);
  console.log(`  routes                               ${rows.length}`);
  console.log(`  routes carrying injected facts       ${affected.length}`);
  const counts = affected.map((r) => r.injected.length).sort((a, b) => a - b);
  console.log(`  median injected facts on those       ${counts.length ? counts[Math.floor(counts.length / 2)] : 0}`);
  console.log(`  worst single route                   ${counts.length ? counts[counts.length - 1] : 0}`);
  console.log(`\n  jurisdictions fully clean            ${[...byJurisdiction.values()].filter((e) => e.affected === 0).length} of ${byJurisdiction.size}`);
  console.log("\nworst routes:");
  for (const row of [...affected].sort((a, b) => b.injected.length - a.injected.length).slice(0, 8)) {
    console.log(`  ${String(row.injected.length).padStart(3)}  ${row.jurisdiction}:${row.pathwayId}`);
  }
  process.exit(0);
}

// Review mode.
const baseline = JSON.parse(fs.readFileSync(baselineFile, "utf8"));
const before = new Map(baseline.routes.map((r) => [`${r.jurisdiction}:${r.pathwayId}`, r]));
const after = new Map(rows.map((r) => [`${r.jurisdiction}:${r.pathwayId}`, r]));

const missingRoutes = [...before.keys()].filter((k) => !after.has(k));
const newRoutes = [...after.keys()].filter((k) => !before.has(k));
const improved = [];
const worsened = [];
const exclusionRemovals = [];

for (const [key, was] of before) {
  const now = after.get(key);
  if (!now) continue;
  const wasSet = new Set(was.injected);
  const nowSet = new Set(now.injected);
  const removed = [...wasSet].filter((id) => !nowSet.has(id));
  const added = [...nowSet].filter((id) => !wasSet.has(id));
  if (removed.length) improved.push({ key, removed });
  if (added.length) worsened.push({ key, added });
  const removedExclusion = (was.injectedFromExclusions ?? []).filter((id) => !nowSet.has(id));
  if (removedExclusion.length) exclusionRemovals.push({ key, removedExclusion });
}

console.log(`#63 review — current tree against ${baselineFile}\n`);
console.log(`  routes in baseline                   ${before.size}`);
console.log(`  routes now                           ${after.size}`);
console.log(`  routes with injection removed        ${improved.length}`);
console.log(`  routes still carrying injection      ${affected.length}`);
console.log(`  routes that got WORSE                ${worsened.length}`);
if (missingRoutes.length) console.log(`  routes that DISAPPEARED              ${missingRoutes.length}  ${missingRoutes.slice(0, 5).join(", ")}`);
if (newRoutes.length) console.log(`  routes that APPEARED                 ${newRoutes.length}  ${newRoutes.slice(0, 5).join(", ")}`);

const untouchedJurisdictions = [...byJurisdiction.entries()].filter(([, e]) => e.affected > 0).map(([c]) => c);
console.log(`\n  jurisdictions still carrying injection ${untouchedJurisdictions.length} of ${byJurisdiction.size}`);
if (untouchedJurisdictions.length) console.log(`    ${untouchedJurisdictions.join(" ")}`);

if (worsened.length) {
  console.log("\nROUTES THAT GOT WORSE — a fix must not add foreign facts:");
  for (const row of worsened.slice(0, 10)) console.log(`  ${row.key}  +${row.added.join(", ")}`);
}

if (exclusionRemovals.length) {
  console.log(`\nEXCLUSION-DERIVED FACTS REMOVED FROM ${exclusionRemovals.length} ROUTE(S) — read each one.`);
  console.log("An exclusion exists to stop a sale. Removing one from a route's deciding set is");
  console.log("correct only where that exclusion genuinely does not reach that route, and the");
  console.log("basis has to be stated per route rather than assumed from the pattern.");
  for (const row of exclusionRemovals.slice(0, 15)) console.log(`  ${row.key}  -${row.removedExclusion.join(", ")}`);
  if (exclusionRemovals.length > 15) console.log(`  ... and ${exclusionRemovals.length - 15} more`);
}

const incomplete = untouchedJurisdictions.length > 0;
console.log("");
if (worsened.length > 0) { console.log("VERDICT: regression present. Do not integrate."); process.exit(1); }
if (incomplete) { console.log(`VERDICT: partial. ${untouchedJurisdictions.length} jurisdiction(s) still sweep unscoped — check this is a stated boundary, not under-collection.`); process.exit(2); }
console.log("VERDICT: no route carries injected facts, and no route got worse.");
console.log("Completeness is proved. Correctness of each removal still needs the per-route basis above.");
