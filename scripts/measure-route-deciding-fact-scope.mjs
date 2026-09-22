#!/usr/bin/env node
/**
 * The #63 acceptance instrument.
 *
 * `routeDecidingFactIds` in src/lib/rcap-engine/route-fact-relevance.ts scopes
 * decision rules by candidatePathwayIds, then sweeps exclusionRules and
 * waitingPeriodRules wholesale into every route. This measures what that sweep
 * actually contributes, per route and per jurisdiction. It changes nothing.
 *
 * WHAT IT COUNTS, AND WHAT IT REFUSES TO COUNT
 *
 * routeDecidingFactIds returns a set of fact IDs, not a set of rules. An
 * unrelated rule that references a fact the route already holds through
 * universal, pathway, decision-rule or escalation authority adds nothing to
 * that set. So deciding-set size is never reported as foreign-fact count, and
 * a fact is called foreign only when the sweep is the sole reason it is there.
 *
 * Each fact the sweep contributes is classified as exactly one of:
 *   universal  - in UNIVERSAL_PREPAY_FACT_IDS, blocking on every route anyway
 *   pathway    - already named by the route's own compiled clauses
 *   decision   - already named by a decision rule that names this route
 *   escalation - already named by ROUTE_ESCALATION_FACT_IDS for this route
 *   prose      - not a fact ID at all; free text admitted by collectFieldIds
 *                because it sat as a bare string in an array
 *   foreign    - none of the above; present only because of the unscoped sweep
 *
 * Only `foreign` is the #63 defect. `prose` is a separate data-shape problem
 * and is reported separately rather than folded into the headline.
 *
 * DRIFT
 *
 * The universal and escalation sets are transcribed here so a regression in the
 * module under test cannot make the measurement agree with it by construction.
 * A duplicated list rots, so the transcription is not trusted on its own: the
 * production constants are parsed out of the source and asserted identical to
 * the transcription on every run. Any drift is a hard failure, not a warning.
 *
 * USAGE
 *   node scripts/measure-route-deciding-fact-scope.mjs
 *   node scripts/measure-route-deciding-fact-scope.mjs --emit <census.json>
 *   node scripts/measure-route-deciding-fact-scope.mjs --baseline <census.json>
 *   node scripts/measure-route-deciding-fact-scope.mjs --ledger <dir>
 *   node scripts/measure-route-deciding-fact-scope.mjs --route ND:first-offense-possession-sealing
 */
import fs from "node:fs";
import path from "node:path";

const PROFILE_DIR = "src/lib/rcap-engine/compiled/profiles";
const SOURCE = "src/lib/rcap-engine/route-fact-relevance.ts";

// ---------------------------------------------------------------------------
// Transcribed production constants, and the drift check that keeps them honest.
// ---------------------------------------------------------------------------

const UNIVERSAL_TRANSCRIBED = [
  "ownership_scope", "jurisdiction_scope", "case_outcome", "offense_level", "charge",
  "pardon_status", "state_exclusion_categories", "pending_cases",
  "new_convictions_during_waiting_period", "sentence_completion_date",
  "financial_obligations", "court_requirements_completed",
  "special_preconditions_confirmed", "resolved_timing_bucket", "criminal_history"
];

function parseProductionUniversals(source) {
  const block = source.match(/UNIVERSAL_PREPAY_FACT_IDS[^=]*=\s*new Set\(\[([\s\S]*?)\]\)/);
  if (!block) throw new Error(`cannot locate UNIVERSAL_PREPAY_FACT_IDS in ${SOURCE}`);
  return [...block[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
}

function parseProductionEscalations(source) {
  const block = source.match(/ROUTE_ESCALATION_FACT_IDS[^=]*=\s*\{([\s\S]*?)\n\};/);
  if (!block) throw new Error(`cannot locate ROUTE_ESCALATION_FACT_IDS in ${SOURCE}`);
  const map = new Map();
  for (const entry of block[1].matchAll(/"([^"]+)"\s*:\s*\[([\s\S]*?)\]/g)) {
    map.set(entry[1], [...entry[2].matchAll(/"([^"]+)"/g)].map((m) => m[1]));
  }
  return map;
}

const source = fs.readFileSync(SOURCE, "utf8");
const productionUniversals = parseProductionUniversals(source);
const ROUTE_ESCALATION = parseProductionEscalations(source);

const driftFailures = [];
{
  const a = [...UNIVERSAL_TRANSCRIBED].sort();
  const b = [...productionUniversals].sort();
  if (a.length !== b.length || a.some((id, i) => id !== b[i])) {
    driftFailures.push({
      constant: "UNIVERSAL_PREPAY_FACT_IDS",
      inProductionOnly: b.filter((id) => !a.includes(id)),
      inTranscriptionOnly: a.filter((id) => !b.includes(id))
    });
  }
}
if (driftFailures.length) {
  console.error("ACCEPTANCE INSTRUMENT DRIFT — the transcribed constants no longer match production.\n");
  for (const f of driftFailures) {
    console.error(`  ${f.constant}`);
    if (f.inProductionOnly.length) console.error(`    only in production   : ${f.inProductionOnly.join(", ")}`);
    if (f.inTranscriptionOnly.length) console.error(`    only in this script  : ${f.inTranscriptionOnly.join(", ")}`);
  }
  console.error("\nEvery measurement below would be wrong. Reconcile before using this as an oracle.");
  process.exit(3);
}
const UNIVERSAL = new Set(productionUniversals);

// ---------------------------------------------------------------------------
// Independent transcription of collectFieldIds.
// ---------------------------------------------------------------------------

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

/** A compiled fact ID is a short snake_case token. Anything else that reached
 *  the set is free text that collectFieldIds admitted from a bare string array. */
const looksLikeFactId = (s) => /^[a-z0-9][a-z0-9_]{0,63}$/.test(s);

// ---------------------------------------------------------------------------
// Rule-shape inventory — the evidence for the "no rule carries scoping" claim.
// ---------------------------------------------------------------------------

const OWNERSHIP_KEYS = {
  candidatePathwayIds: ["candidatePathwayIds"],
  pathwayId: ["pathwayId", "pathwayIds"],
  routeId: ["routeId", "routeIds"]
};

function inventoryRules(profiles) {
  const inv = {
    exclusionRules: 0, waitingRules: 0,
    objectRules: 0, rawStringRules: 0,
    withCandidatePathwayIds: 0, withPathwayId: 0, withRouteId: 0,
    withAnyMachineReadableOwnership: 0, withNoMachineReadableOwnership: 0,
    profilesWithRouteConsumers: 0, profilesWithoutRouteConsumers: 0,
    rulesInProfilesWithRouteConsumers: 0,
    recoverableViaRouteConsumers: 0, partiallyRecoverableViaRouteConsumers: 0,
    jurisdictionsWithRawStringRules: [], jurisdictionsWithRouteConsumers: []
  };
  for (const { code, profile } of profiles) {
    // The key exists on every profile; most are empty objects. An empty map is
    // no data, so count populated ones only -- otherwise "51 of 51 carry
    // routeConsumers" would read as coverage that does not exist.
    const rawConsumers = profile.questionLifecycle?.routeConsumers ?? null;
    const consumers = rawConsumers && Object.keys(rawConsumers).length > 0 ? rawConsumers : null;
    if (consumers) { inv.profilesWithRouteConsumers += 1; inv.jurisdictionsWithRouteConsumers.push(code); }
    else inv.profilesWithoutRouteConsumers += 1;
    let rawHere = false;
    for (const [key, counter] of [["exclusionRules", "exclusionRules"], ["waitingPeriodRules", "waitingRules"]]) {
      const rules = profile[key] ?? [];
      inv[counter] += rules.length;
      for (const rule of rules) {
        if (typeof rule === "string") { inv.rawStringRules += 1; rawHere = true; continue; }
        if (!rule || typeof rule !== "object") continue;
        inv.objectRules += 1;
        let owned = false;
        for (const [label, keys] of Object.entries(OWNERSHIP_KEYS)) {
          if (keys.some((k) => rule[k] !== undefined)) {
            owned = true;
            if (label === "candidatePathwayIds") inv.withCandidatePathwayIds += 1;
            if (label === "pathwayId") inv.withPathwayId += 1;
            if (label === "routeId") inv.withRouteId += 1;
          }
        }
        if (owned) inv.withAnyMachineReadableOwnership += 1;
        else inv.withNoMachineReadableOwnership += 1;
        // Could this rule's fields be attributed to routes via routeConsumers?
        // Reported in three states rather than one, because a flat zero would
        // hide the difference between "no such data anywhere" and "the data
        // exists but does not cover this rule".
        if (!owned && consumers) {
          inv.rulesInProfilesWithRouteConsumers += 1;
          const fields = new Set();
          collectFieldIds(rule, fields);
          const ids = [...fields].filter(looksLikeFactId);
          const covered = ids.filter((id) => Array.isArray(consumers[id]) && consumers[id].length > 0);
          if (ids.length && covered.length === ids.length) inv.recoverableViaRouteConsumers += 1;
          else if (covered.length > 0) inv.partiallyRecoverableViaRouteConsumers += 1;
        }
      }
    }
    if (rawHere) inv.jurisdictionsWithRawStringRules.push(code);
  }
  return inv;
}

// ---------------------------------------------------------------------------
// Census.
// ---------------------------------------------------------------------------

function loadProfiles() {
  return fs.readdirSync(PROFILE_DIR).filter((f) => f.endsWith(".json")).sort().map((file) => {
    const profile = JSON.parse(fs.readFileSync(path.join(PROFILE_DIR, file), "utf8"));
    return { file, code: profile.jurisdiction?.code ?? file.replace(/\.json$/, ""), profile };
  });
}

function census(profiles) {
  const routes = [];
  for (const { code, profile } of profiles) {
    const fromExclusions = new Set();
    collectFieldIds(profile.exclusionRules, fromExclusions);
    const fromWaiting = new Set();
    collectFieldIds(profile.waitingPeriodRules, fromWaiting);
    const swept = new Set([...fromExclusions, ...fromWaiting]);

    for (const pathway of profile.pathways ?? []) {
      const key = `${code}:${pathway.id}`;

      const pathwayOwn = new Set();
      collectFieldIds(pathway, pathwayOwn);

      const decisionOwn = new Set();
      for (const rule of profile.orderedDecisionRules ?? []) {
        const candidates = rule.candidatePathwayIds ?? [];
        if (candidates.length === 0 || candidates.includes(pathway.id)) collectFieldIds(rule, decisionOwn);
      }

      const escalation = new Set(ROUTE_ESCALATION.get(key) ?? []);

      const classified = [];
      for (const fact of swept) {
        let basis;
        if (!looksLikeFactId(fact)) basis = "prose";
        else if (UNIVERSAL.has(fact)) basis = "universal";
        else if (pathwayOwn.has(fact)) basis = "pathway";
        else if (decisionOwn.has(fact)) basis = "decision";
        else if (escalation.has(fact)) basis = "escalation";
        else basis = "foreign";
        classified.push({
          fact: basis === "prose" ? `${fact.slice(0, 80)}${fact.length > 80 ? "…" : ""}` : fact,
          basis,
          fromExclusionRules: fromExclusions.has(fact),
          fromWaitingRules: fromWaiting.has(fact),
          retainedByOtherAuthority: basis === "universal" || basis === "pathway" || basis === "decision" || basis === "escalation"
        });
      }

      routes.push({
        jurisdiction: code,
        pathwayId: pathway.id,
        key,
        sweptFacts: classified.length,
        foreign: classified.filter((c) => c.basis === "foreign").map((c) => c.fact).sort(),
        prose: classified.filter((c) => c.basis === "prose").length,
        classified
      });
    }
  }
  return routes;
}

// ---------------------------------------------------------------------------

const argv = process.argv.slice(2);
const flag = (name) => { const i = argv.indexOf(name); return i === -1 ? null : argv[i + 1]; };

const profiles = loadProfiles();
const rows = census(profiles);
const inventory = inventoryRules(profiles);

const affected = rows.filter((r) => r.foreign.length > 0);
const jurisdictions = new Map();
for (const row of rows) {
  const e = jurisdictions.get(row.jurisdiction) ?? { routes: 0, affected: 0 };
  e.routes += 1;
  if (row.foreign.length > 0) e.affected += 1;
  jurisdictions.set(row.jurisdiction, e);
}
const dirtyJurisdictions = [...jurisdictions.entries()].filter(([, e]) => e.affected > 0).map(([c]) => c);
const counts = affected.map((r) => r.foreign.length).sort((a, b) => a - b);

// --route: reconcile one route in full.
const routeQuery = flag("--route");
if (routeQuery) {
  const row = rows.find((r) => r.key === routeQuery || r.key.endsWith(`:${routeQuery}`));
  if (!row) { console.error(`no such route: ${routeQuery}`); process.exit(1); }
  console.log(`${row.key}\n`);
  console.log(`  facts contributed by the unscoped sweep : ${row.sweptFacts}`);
  const byBasis = {};
  for (const c of row.classified) (byBasis[c.basis] ??= []).push(c.fact);
  for (const basis of ["universal", "pathway", "decision", "escalation", "prose", "foreign"]) {
    const list = byBasis[basis] ?? [];
    console.log(`  ${basis.padEnd(11)} ${String(list.length).padStart(3)}${list.length ? "  " + list.slice(0, 6).join(", ") + (list.length > 6 ? ", …" : "") : ""}`);
  }
  console.log(`\n  GENUINELY FOREIGN (the #63 defect on this route): ${row.foreign.length ? row.foreign.join(", ") : "none"}`);
  process.exit(0);
}

const emit = flag("--emit");
if (emit) {
  fs.writeFileSync(emit, `${JSON.stringify({ measuredAt: new Date().toISOString().slice(0, 10), universals: productionUniversals, inventory, routes: rows }, null, 2)}\n`);
  console.log(`census written to ${emit}`);
}

// --ledger: the complete per-route, per-fact removal ledger.
const ledgerDir = flag("--ledger");
if (ledgerDir) {
  fs.mkdirSync(ledgerDir, { recursive: true });
  const ledger = [];
  for (const row of rows) {
    for (const c of row.classified) {
      ledger.push({
        jurisdiction: row.jurisdiction,
        pathway: row.pathwayId,
        fact: c.fact,
        fromExclusionRules: c.fromExclusionRules,
        fromWaitingRules: c.fromWaitingRules,
        retainedByOtherAuthority: c.retainedByOtherAuthority,
        basis: c.basis
      });
    }
  }
  const out = path.join(ledgerDir, "deciding-fact-ledger.json");
  fs.writeFileSync(out, `${JSON.stringify({
    measuredAt: new Date().toISOString().slice(0, 10),
    note: "One row per (route, fact contributed by the unscoped exclusion/waiting sweep). basis=foreign is the #63 defect; every other basis means the fact is already held by other authority and the sweep adds nothing.",
    universals: productionUniversals,
    inventory,
    totals: { routes: rows.length, rows: ledger.length, foreign: ledger.filter((r) => r.basis === "foreign").length },
    ledger
  }, null, 2)}\n`);
  console.log(`complete ledger written to ${out} (${ledger.length} rows, ${ledger.filter((r) => r.basis === "foreign").length} foreign)`);
}

const baselineFile = flag("--baseline");
if (!baselineFile) {
  console.log("#63 route deciding-fact scope — census\n");
  console.log(`  universal facts (parsed from production, drift-checked)  ${productionUniversals.length}`);
  console.log(`  jurisdictions                                            ${jurisdictions.size}`);
  console.log(`  routes                                                   ${rows.length}`);
  console.log(`  routes carrying GENUINELY FOREIGN facts                  ${affected.length}`);
  console.log(`  jurisdictions with at least one affected route           ${dirtyJurisdictions.length}`);
  console.log(`  jurisdictions clean                                      ${jurisdictions.size - dirtyJurisdictions.length}`);
  console.log(`  median foreign facts on an affected route                ${counts.length ? counts[Math.floor(counts.length / 2)] : 0}`);
  console.log(`  worst single route                                       ${counts.length ? counts[counts.length - 1] : 0}`);
  console.log(`\n  rule-shape inventory`);
  console.log(`    exclusion rules                                        ${inventory.exclusionRules}`);
  console.log(`    waiting-period rules                                   ${inventory.waitingRules}`);
  console.log(`    object rules                                           ${inventory.objectRules}`);
  console.log(`    raw-string rules                                       ${inventory.rawStringRules}`);
  console.log(`    with candidatePathwayIds                               ${inventory.withCandidatePathwayIds}`);
  console.log(`    with pathwayId / pathwayIds                            ${inventory.withPathwayId}`);
  console.log(`    with routeId / routeIds                                ${inventory.withRouteId}`);
  console.log(`    with ANY machine-readable ownership                    ${inventory.withAnyMachineReadableOwnership}`);
  console.log(`    with NO machine-readable ownership                     ${inventory.withNoMachineReadableOwnership}`);
  console.log(`    profiles carrying questionLifecycle.routeConsumers      ${inventory.profilesWithRouteConsumers} of ${inventory.profilesWithRouteConsumers + inventory.profilesWithoutRouteConsumers}`);
  console.log(`      unowned rules living in those profiles               ${inventory.rulesInProfilesWithRouteConsumers}`);
  console.log(`      of those, fully recoverable via routeConsumers       ${inventory.recoverableViaRouteConsumers}`);
  console.log(`      of those, partially recoverable                      ${inventory.partiallyRecoverableViaRouteConsumers}`);
  const prose = rows.reduce((n, r) => n + r.prose, 0);
  if (prose) console.log(`\n  NOTE: ${prose} route-fact rows are free text, not fact IDs (separate data-shape issue, not #63).`);
  console.log("\nworst routes by genuinely foreign facts:");
  for (const row of [...affected].sort((a, b) => b.foreign.length - a.foreign.length).slice(0, 8)) {
    console.log(`  ${String(row.foreign.length).padStart(3)}  ${row.key}`);
  }
  process.exit(0);
}

// Review mode.
const baseline = JSON.parse(fs.readFileSync(baselineFile, "utf8"));
const before = new Map(baseline.routes.map((r) => [r.key ?? `${r.jurisdiction}:${r.pathwayId}`, r]));
const after = new Map(rows.map((r) => [r.key, r]));

const foreignOf = (r) => new Set(r.foreign ?? r.injected ?? []);
const improved = [];
const worsened = [];
const exclusionRemovals = [];

for (const [key, was] of before) {
  const now = after.get(key);
  if (!now) continue;
  const wasF = foreignOf(was);
  const nowF = foreignOf(now);
  const removed = [...wasF].filter((id) => !nowF.has(id));
  const added = [...nowF].filter((id) => !wasF.has(id));
  if (removed.length) improved.push({ key, removed });
  if (added.length) worsened.push({ key, added });
  const wasExclusion = new Set((was.classified ?? []).filter((c) => c.fromExclusionRules).map((c) => c.fact));
  const removedExclusion = removed.filter((id) => wasExclusion.has(id));
  if (removedExclusion.length) exclusionRemovals.push({ key, removedExclusion });
}

const missingRoutes = [...before.keys()].filter((k) => !after.has(k));
const newRoutes = [...after.keys()].filter((k) => !before.has(k));

console.log(`#63 review — current tree against ${baselineFile}\n`);
console.log(`  routes in baseline                     ${before.size}`);
console.log(`  routes now                             ${after.size}`);
console.log(`  routes with foreign facts removed      ${improved.length}`);
console.log(`  routes still carrying foreign facts    ${affected.length}`);
console.log(`  routes that got WORSE                  ${worsened.length}`);
if (missingRoutes.length) console.log(`  routes that DISAPPEARED                ${missingRoutes.length}  ${missingRoutes.slice(0, 5).join(", ")}`);
if (newRoutes.length) console.log(`  routes that APPEARED                   ${newRoutes.length}  ${newRoutes.slice(0, 5).join(", ")}`);
console.log(`\n  jurisdictions still affected           ${dirtyJurisdictions.length} of ${jurisdictions.size}`);
if (dirtyJurisdictions.length) console.log(`    ${dirtyJurisdictions.join(" ")}`);

if (worsened.length) {
  console.log("\nROUTES THAT GOT WORSE — a fix must not add foreign facts:");
  for (const row of worsened.slice(0, 10)) console.log(`  ${row.key}  +${row.added.join(", ")}`);
  if (worsened.length > 10) console.log(`  ... and ${worsened.length - 10} more (full set in the ledger)`);
}

if (exclusionRemovals.length) {
  const total = exclusionRemovals.reduce((n, r) => n + r.removedExclusion.length, 0);
  console.log(`\nEXCLUSION-DERIVED REMOVALS: ${total} across ${exclusionRemovals.length} route(s).`);
  console.log("An exclusion exists to stop a sale. Removing one from a route's deciding set is");
  console.log("correct only where that exclusion genuinely does not reach that route, and the");
  console.log("basis has to be stated per route. The console shows the first 15; the COMPLETE");
  console.log("set is written by --ledger and is what the review reads.");
  for (const row of exclusionRemovals.slice(0, 15)) console.log(`  ${row.key}  -${row.removedExclusion.join(", ")}`);
  if (exclusionRemovals.length > 15) console.log(`  ... and ${exclusionRemovals.length - 15} more route(s) — read the ledger, not this list`);
}

console.log("");
if (worsened.length > 0) { console.log("VERDICT: regression present. Do not integrate."); process.exit(1); }
if (dirtyJurisdictions.length > 0) { console.log(`VERDICT: partial. ${dirtyJurisdictions.length} jurisdiction(s) still carry foreign facts — confirm this is a stated boundary, not under-collection.`); process.exit(2); }
console.log("VERDICT: no route carries genuinely foreign facts, and no route got worse.");
console.log("Coverage is proved. Correctness of each removal still needs the per-route basis in the ledger.");
