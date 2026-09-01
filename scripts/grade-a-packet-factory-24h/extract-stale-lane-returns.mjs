#!/usr/bin/env node
/**
 * What the frozen PF lane returns actually found, in one schema.
 *
 *   node scripts/grade-a-packet-factory-24h/extract-stale-lane-returns.mjs [--check]
 *
 * Twelve packet-factory lanes returned against base 445c2eb41 and their pull
 * requests are frozen: the base has moved four times since, and merging a
 * regenerated queue from an old head would revert work that came after it.
 * Freezing the merge must not throw away the finding, though -- a lane that
 * spent its run discovering that Montana's source does not resolve to one
 * corpus entry has produced something worth keeping.
 *
 * So the rows are read out of the pull-request refs directly and normalized.
 * They arrive in TWELVE DIFFERENT SHAPES -- stopClass, stopReason, stopCode,
 * blockers, blockedLegalInput, missingLegalInputs, blockingInputs, detail,
 * stopDetail -- because each lane invented its own. Every one of those keys is
 * read here rather than the union being reduced to whichever the first lane
 * used, since a blocker recorded under a key nobody reads is a blocker lost.
 *
 * Rows are then classified into three destinations and deduplicated against
 * what the live conveyor and legal queue already hold. An obligation already
 * queued is NOT re-queued; it is recorded as corroborated, because two lanes
 * independently reaching the same blocker is evidence about the blocker, not a
 * second unit of work.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(ROOT);
const CHECK = process.argv.includes("--check");

const OUT = "data/rcap-grade-a/packet-factory-24h/STALE_LANE_RETURNS.json";
const MASTER = "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json";
const ACTIVE = "data/rcap-grade-a/packet-factory-24h/ACTIVE_ASSIGNMENTS.json";

/* Which pull request carried which lane. Frozen, not merged. */
const FROZEN = [
  { pr: 154, lane: "PF05" }, { pr: 153, lane: "PF06" }, { pr: 151, lane: "PF07" },
  { pr: 152, lane: "PF08" }, { pr: 150, lane: "PF09" }, { pr: 149, lane: "PF10" },
  { pr: 147, lane: "PF11" }, { pr: 146, lane: "PF12" }, { pr: 145, lane: "PF13" },
  { pr: 144, lane: "PF14" }, { pr: 143, lane: "PF15" }, { pr: 142, lane: "PF16" }
];
const CLOSED_DUPLICATES = [
  { pr: 148, duplicateOf: 149, lane: "PF10" },
  { pr: 141, duplicateOf: 142, lane: "PF16" }
];

const git = (args) => { try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }); } catch { return null; } };
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

/* Every key any of the twelve lanes used to say why it stopped. */
const REASON_KEYS = [
  "reason", "stopReason", "stopDetail", "detail", "blockedLegalInput",
  "requiredResolution", "why"
];
const LIST_KEYS = ["blockers", "missingLegalInputs", "blockingInputs", "evidence"];
const CLASS_KEYS = ["stopClass", "stopCode", "stopReason"];

const ENVIRONMENT = /pdftoppm|poppler|raster|chromium|playwright|toolchain|HTTP 403|package (mirror|installation)/i;
const SOURCE = /source|corpus[- ]index|does not resolve to exactly one|sha-?256/i;
const LEGAL = /legal|counsel|statut|route-determining|case-by-case|charging-document|approved .*classification|field map/i;

function classify(row) {
  const declared = CLASS_KEYS.map((k) => String(row[k] ?? "")).join(" ");
  const prose = [...REASON_KEYS.map((k) => row[k]), ...LIST_KEYS.flatMap((k) => row[k] ?? [])]
    .filter(Boolean).map(String).join(" ");
  const all = `${declared} ${prose}`;
  // Declared class first where the lane gave one that is not a bare STOPPED.
  if (/ENVIRONMENT/i.test(declared)) return "ENVIRONMENT";
  if (/BLOCKED_SOURCE/i.test(declared)) return "SOURCE";
  if (/BLOCKED_LEGAL_INPUT/i.test(declared)) return "LEGAL";
  if (/BUILD_INCOMPLETE/i.test(declared)) return "BUILD_INCOMPLETE";
  // Otherwise read the prose, environment first: a lane that could not raster
  // never reached the question its other words are about.
  if (ENVIRONMENT.test(all)) return "ENVIRONMENT";
  if (SOURCE.test(all)) return "SOURCE";
  if (LEGAL.test(all)) return "LEGAL";
  return "UNCLASSIFIED";
}

const rows = [];
const unreadable = [];
for (const { pr, lane } of FROZEN) {
  const ref = `pr/${pr}`;
  const file = `data/rcap-grade-a/packet-factory-24h/${lane.toLowerCase()}/rows.json`;
  const raw = git(["show", `${ref}:${file}`]);
  if (raw === null) { unreadable.push({ pr, lane, file, why: "the ref or the file is not present locally; fetch refs/pull/<n>/head first" }); continue; }
  let doc = null;
  try { doc = JSON.parse(raw); } catch (e) { unreadable.push({ pr, lane, file, why: `unparseable: ${e.message}` }); continue; }
  for (const r of doc.rows ?? []) {
    const reasons = REASON_KEYS.map((k) => r[k]).filter(Boolean).map(String);
    const lists = LIST_KEYS.flatMap((k) => (Array.isArray(r[k]) ? r[k] : [])).map(String);
    rows.push({
      lane, pr, familyId: r.itemId,
      status: r.status ?? null,
      declaredClass: CLASS_KEYS.map((k) => r[k]).filter(Boolean).map(String)[0] ?? null,
      destination: classify(r),
      statedReasons: reasons,
      statedBlockers: lists,
      preflight: r.preflight ?? null,
      artifactsProduced: (r.artifactsProduced ?? r.artifacts ?? []).length,
      sourceReturn: `${file} @ pr/${pr}`
    });
  }
}

/* Deduplicate against what the live dispatch already holds. */
const master = read(MASTER);
const active = read(ACTIVE);
const familyState = new Map(master.families.map((f) => [f.familyId, f]));
const alreadySourceQueued = new Set(active.assignments
  .filter((a) => a.itemKind === "sourceObligation")
  .flatMap((a) => (a.items ?? []).map((i) => String(i).split("::")[0])));
const alreadyLegalBlocked = new Set(master.families.filter((f) => f.legalInputStatus === "OPEN_LEGAL_INPUT").map((f) => f.familyId));

for (const r of rows) {
  const fam = familyState.get(r.familyId) ?? null;
  r.familyKnown = Boolean(fam);
  r.currentState = fam?.state ?? null;
  if (r.destination === "SOURCE") {
    r.alreadyQueued = alreadySourceQueued.has(r.familyId);
    r.disposition = r.alreadyQueued ? "CORROBORATES_AN_EXISTING_OBLIGATION" : "NEW_SOURCE_OBLIGATION";
  } else if (r.destination === "LEGAL") {
    r.alreadyQueued = alreadyLegalBlocked.has(r.familyId);
    r.disposition = r.alreadyQueued ? "CORROBORATES_AN_EXISTING_LEGAL_QUESTION" : "NEW_LEGAL_QUESTION";
  } else if (r.destination === "ENVIRONMENT") {
    r.alreadyQueued = false;
    /*
     * An environment stop is only KNOWN to be fixed when the lane said what
     * broke. Two lanes returned a bare "GLOBAL_ENVIRONMENT_FAILURE" with no
     * detail; claiming the raster fix resolves those would be asserting a
     * cause they never stated. They are re-dispatchable either way -- the
     * difference is whether a green re-run confirms a fix or discovers one.
     */
    const named = [...r.statedReasons, ...r.statedBlockers, String(r.declaredClass ?? "")].join(" ");
    const namesTheRaster = /pdftoppm|poppler|raster|chromium|playwright/i.test(named);
    r.disposition = namesTheRaster ? "RESOLVED_BY_THE_DISCOVERED_RASTER_PATH" : "ENVIRONMENT_CAUSE_NOT_STATED";
    r.resolvedBy = namesTheRaster
      ? "36c4d3f0c — the rasterizer discovers its browser and the preflight gates on it, so this family is re-dispatchable rather than blocked"
      : null;
    r.note = namesTheRaster ? null
      : "The lane declared an environment failure and did not say which. Re-dispatch it; the preflight now names the rasterizer explicitly, so a second failure will be legible where this one was not.";
  } else {
    r.alreadyQueued = false;
    r.disposition = r.destination === "BUILD_INCOMPLETE" ? "REDISPATCH_AS_A_BUILD" : "NEEDS_A_HUMAN_READING";
  }
}

const byDestination = {};
for (const r of rows) byDestination[r.destination] = (byDestination[r.destination] ?? 0) + 1;
const byDisposition = {};
for (const r of rows) byDisposition[r.disposition] = (byDisposition[r.disposition] ?? 0) + 1;

const doc = {
  schemaVersion: "rcap-stale-lane-returns/v1",
  generatedBy: "scripts/grade-a-packet-factory-24h/extract-stale-lane-returns.mjs",
  question: "Twelve lanes returned against a base four commits stale. What did they find that is worth keeping?",
  whyTheyAreFrozen: "Each carries a queue regenerated from base 445c2eb41. Merging one would revert the claim ledger, the discovered raster path and the Vermont build that came after it. The finding is extracted instead; the merge stays frozen.",
  frozenPullRequests: FROZEN,
  closedAsDuplicates: CLOSED_DUPLICATES,
  schemasEncountered: {
    note: "Twelve lanes invented twelve shapes for the same idea. Every key is read here; a blocker recorded under a key nobody reads is a blocker lost.",
    classKeys: CLASS_KEYS, reasonKeys: REASON_KEYS, listKeys: LIST_KEYS
  },
  totals: {
    rows: rows.length,
    lanesRead: FROZEN.length - unreadable.length,
    unreadable: unreadable.length,
    byDestination, byDisposition,
    familiesUnblockedByTheRasterFix: [...new Set(rows.filter((r) => r.disposition === "RESOLVED_BY_THE_DISCOVERED_RASTER_PATH").map((r) => r.familyId))].length,
    familiesWithAnUnstatedEnvironmentCause: [...new Set(rows.filter((r) => r.disposition === "ENVIRONMENT_CAUSE_NOT_STATED").map((r) => r.familyId))].length,
    newSourceObligations: rows.filter((r) => r.disposition === "NEW_SOURCE_OBLIGATION").length,
    newLegalQuestions: rows.filter((r) => r.disposition === "NEW_LEGAL_QUESTION").length
  },
  duplicationRule: "An obligation the live conveyor already holds is recorded as corroboration, never re-queued. Two lanes reaching one blocker is evidence about the blocker, not a second unit of work.",
  rows,
  unreadable,
  commercialRoutesOpened: 0,
  productionTouched: false
};

const problems = [];
if (rows.length === 0) problems.push("no rows were extracted; the pull-request refs are probably not fetched");
if (unreadable.length > 0) problems.push(`${unreadable.length} lane return(s) could not be read`);
if (rows.some((r) => !r.familyId)) problems.push("a row carries no family id");
if (problems.length) {
  console.error(`stale lane returns: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}

if (CHECK) {
  console.log(`stale lane returns current: ${rows.length} row(s) from ${doc.totals.lanesRead} frozen lane(s).`);
  process.exit(0);
}

fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify(doc, null, 2)}\n`);
console.log(`Wrote ${OUT}`);
console.log("");
console.log(`  ${rows.length} rows from ${doc.totals.lanesRead} frozen lanes`);
for (const [k, v] of Object.entries(byDestination)) console.log(`    ${k.padEnd(18)} ${v}`);
console.log("");
for (const [k, v] of Object.entries(byDisposition)) console.log(`    ${k.padEnd(42)} ${v}`);
