#!/usr/bin/env node
// The route-hold record may only ever say things the maintenance discipline
// allows it to say.
//
// data/rcap-grade-a/maintenance/route-holds.json is the single route-scoped
// hold carrier (the path-wide kill switch and the deployment-readiness record
// cannot hold one route). Because the runtime availability derivation consumes
// it, a malformed or over-broad row is not a data-quality nit — it is either a
// hold that silently holds nothing (a typo'd routeId) or a hold that holds far
// more than the person writing it decided to hold (a jurisdiction-wide or
// path-wide expression). Both are refused here, before the file is committed.
//
// What this enforces:
//   1. schema: every row carries routeId, holdType, reason, evidence,
//      placedAt, releasedAt; timestamps parse; holdType is in the vocabulary.
//   2. exact scope: routeId is an exact launch-graph pathwayKey. Wildcards,
//      bare jurisdiction codes, "ALL"/"*" and unknown routes are refused with
//      messages naming the anti-pattern. Holds name exact routeIds only.
//   3. release discipline: a released hold (releasedAt != null) must carry a
//      reacceptance reference — the evidence that the route was re-verified.
//      Routes come back through fresh evidence, never through hold deletion.
//   4. no duplicate ACTIVE holds of the same type on the same route.
//
//   node scripts/verify-rcap-route-holds.mjs
//   node scripts/verify-rcap-route-holds.mjs --mutations
//
// --mutations proves each refusal actually fires: it stages mutated copies of
// the record in a temp directory (tracked files are never touched) and checks
// that every planted defect is detected.

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MUTATIONS = process.argv.includes("--mutations");

const HOLDS_PATH = "data/rcap-grade-a/maintenance/route-holds.json";
const LAUNCH_GRAPH_PATH = "data/rcap-ledger/launch-graph.json";
const HOLD_TYPES = new Set(["MAINTENANCE_HOLD", "LEGAL_HOLD"]);

function loadKnownRouteIds() {
  const graph = JSON.parse(fs.readFileSync(path.join(rootDir, LAUNCH_GRAPH_PATH), "utf8"));
  const keys = new Set((graph.rows ?? []).map((r) => r.pathwayKey).filter(Boolean));
  if (keys.size === 0) throw new Error(`${LAUNCH_GRAPH_PATH} has no rows with pathwayKey`);
  return keys;
}

function parseIso(value) {
  if (typeof value !== "string") return null;
  const t = Date.parse(value);
  return Number.isNaN(t) ? null : t;
}

/**
 * Validates one route-holds document against the launch graph.
 * Returns a list of failure strings; empty means the record is acceptable.
 */
export function validateRouteHolds(doc, knownRouteIds) {
  const failures = [];
  const fail = (m) => failures.push(m);

  if (!doc || typeof doc !== "object") return ["route-holds record is not a JSON object"];
  if (doc.schemaVersion !== "rcap-route-holds/v1") fail(`schemaVersion is ${JSON.stringify(doc.schemaVersion)}, expected "rcap-route-holds/v1"`);
  if (!Array.isArray(doc.holds)) return [...failures, "holds is not an array"];

  const activeByRouteAndType = new Map();
  doc.holds.forEach((row, i) => {
    const at = `holds[${i}]`;
    if (!row || typeof row !== "object") { fail(`${at} is not an object`); return; }

    // ---- exact scope -------------------------------------------------------
    const routeId = row.routeId;
    if (typeof routeId !== "string" || routeId.trim() === "") {
      fail(`${at} has no routeId`);
    } else if (/[*?]/.test(routeId) || /^ALL$/i.test(routeId.trim())) {
      fail(`${at} routeId ${JSON.stringify(routeId)} is a wildcard / path-wide expression; holds name exact routeIds only — the path-wide switch is ConsumerDeliveryRouteState, not this record`);
    } else if (/^[A-Z]{2}$/.test(routeId.trim()) || /^[A-Z]{2}:\s*$/.test(routeId)) {
      fail(`${at} routeId ${JSON.stringify(routeId)} is jurisdiction-wide; jurisdiction-scoped holds are the documented anti-pattern — name each affected route's exact pathwayKey`);
    } else if (!knownRouteIds.has(routeId)) {
      fail(`${at} routeId ${JSON.stringify(routeId)} is not a pathwayKey in ${LAUNCH_GRAPH_PATH}; an unknown routeId is a hold that holds nothing`);
    }

    // ---- schema ------------------------------------------------------------
    if (!HOLD_TYPES.has(row.holdType)) fail(`${at} holdType ${JSON.stringify(row.holdType)} is not MAINTENANCE_HOLD or LEGAL_HOLD`);
    if (typeof row.reason !== "string" || row.reason.trim().length < 10) fail(`${at} reason is missing or too thin to act on`);
    const evidenceOk = (typeof row.evidence === "string" && row.evidence.trim() !== "") ||
      (Array.isArray(row.evidence) && row.evidence.length > 0 && row.evidence.every((e) => typeof e === "string" && e.trim() !== ""));
    if (!evidenceOk) fail(`${at} evidence is missing; a hold with no evidence reference cannot be reviewed`);
    const placedAt = parseIso(row.placedAt);
    if (placedAt === null) fail(`${at} placedAt ${JSON.stringify(row.placedAt)} is not an RFC3339 timestamp`);
    if (!("releasedAt" in row)) fail(`${at} has no releasedAt field (must be null while active)`);

    // ---- release discipline ------------------------------------------------
    if (row.releasedAt !== null && row.releasedAt !== undefined) {
      const releasedAt = parseIso(row.releasedAt);
      if (releasedAt === null) {
        fail(`${at} releasedAt ${JSON.stringify(row.releasedAt)} is neither null nor an RFC3339 timestamp`);
      } else if (placedAt !== null && releasedAt < placedAt) {
        fail(`${at} releasedAt precedes placedAt`);
      }
      const ref = row.reacceptance?.reference;
      if (typeof ref !== "string" || ref.trim() === "") {
        fail(`${at} is released without a reacceptance reference; routes come back through re-verified evidence, never through deleting or blanking the hold`);
      } else if (/[/\\]/.test(ref) && /\.(json|md|txt|csv)$/i.test(ref) && !fs.existsSync(path.join(rootDir, ref))) {
        fail(`${at} reacceptance.reference ${JSON.stringify(ref)} looks like a repository path but no such file exists`);
      }
    } else {
      // Active hold: must not carry reacceptance evidence yet.
      if (row.reacceptance !== null && row.reacceptance !== undefined) {
        fail(`${at} is active (releasedAt null) but carries a reacceptance record; reacceptance belongs on release`);
      }
      const key = `${routeId}::${row.holdType}`;
      if (activeByRouteAndType.has(key)) fail(`${at} duplicates active ${row.holdType} on ${routeId} (first at holds[${activeByRouteAndType.get(key)}])`);
      else activeByRouteAndType.set(key, i);
    }
  });

  return failures;
}

function checkFile(filePath, knownRouteIds) {
  let doc;
  try { doc = JSON.parse(fs.readFileSync(filePath, "utf8")); }
  catch (e) { return [`${filePath} did not parse as JSON: ${e.message}`]; }
  return validateRouteHolds(doc, knownRouteIds);
}

const knownRouteIds = loadKnownRouteIds();

if (!MUTATIONS) {
  const failures = checkFile(path.join(rootDir, HOLDS_PATH), knownRouteIds);
  if (failures.length) {
    console.error(`FAIL route-holds — ${HOLDS_PATH}`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  const doc = JSON.parse(fs.readFileSync(path.join(rootDir, HOLDS_PATH), "utf8"));
  const active = doc.holds.filter((h) => h.releasedAt == null).length;
  console.log(`OK route-holds — ${doc.holds.length} row(s), ${active} active, every routeId exact and every release reaccepted.`);
  process.exit(0);
}

// ---- mutation harness -------------------------------------------------------
// Each mutation plants one defect the checks above claim to refuse. The base
// document is a synthetic valid record (so detection does not depend on what
// the committed file happens to contain today), staged in a temp directory —
// tracked files are never modified.
const [anyRoute, secondRoute] = [...knownRouteIds];
const validRow = {
  routeId: anyRoute,
  holdType: "MAINTENANCE_HOLD",
  reason: "Synthetic hold used only by the mutation harness of verify-rcap-route-holds.mjs.",
  evidence: ["data/rcap-grade-a/maintenance/review-tasks/"],
  placedBy: "mutation-harness",
  placedAt: "2026-09-01T00:00:00Z",
  releasedAt: null,
  reacceptance: null
};
const base = () => ({ schemaVersion: "rcap-route-holds/v1", holds: [structuredClone(validRow)] });

const MUTANTS = [
  ["wildcard-routeId", (d) => { d.holds[0].routeId = "*"; }],
  ["jurisdiction-wide-routeId", (d) => { d.holds[0].routeId = "CA"; }],
  ["jurisdiction-star-routeId", (d) => { d.holds[0].routeId = "CA:*"; }],
  ["all-routes-expression", (d) => { d.holds[0].routeId = "ALL"; }],
  ["unknown-routeId", (d) => { d.holds[0].routeId = "ZZ:route-that-does-not-exist"; }],
  ["bad-holdType", (d) => { d.holds[0].holdType = "SOFT_HOLD"; }],
  ["empty-reason", (d) => { d.holds[0].reason = ""; }],
  ["missing-evidence", (d) => { d.holds[0].evidence = []; }],
  ["released-without-reacceptance", (d) => { d.holds[0].releasedAt = "2026-09-02T00:00:00Z"; }],
  ["released-before-placed", (d) => { d.holds[0].releasedAt = "2020-01-01T00:00:00Z"; d.holds[0].reacceptance = { reference: "reacceptance-run-1" }; }],
  ["reacceptance-path-missing", (d) => { d.holds[0].releasedAt = "2026-09-02T00:00:00Z"; d.holds[0].reacceptance = { reference: "data/rcap-grade-a/maintenance/no-such-reacceptance.json" }; }],
  ["duplicate-active-hold", (d) => { d.holds.push(structuredClone(validRow)); }],
  ["active-with-reacceptance", (d) => { d.holds[0].reacceptance = { reference: "premature" }; }],
  ["wrong-schema-version", (d) => { d.schemaVersion = "rcap-route-holds/v0"; }]
];

// The valid base must pass, or every mutant "detection" is meaningless.
{
  const baseFailures = validateRouteHolds(base(), knownRouteIds);
  if (baseFailures.length) {
    console.error("FAIL route-holds mutations — the harness's valid base document does not pass:");
    for (const f of baseFailures) console.error(`  - ${f}`);
    process.exit(1);
  }
  // And a two-route active pair must be allowed (only same-route+type duplicates are refused).
  const two = base();
  if (secondRoute) {
    two.holds.push({ ...structuredClone(validRow), routeId: secondRoute });
    if (validateRouteHolds(two, knownRouteIds).length) {
      console.error("FAIL route-holds mutations — two active holds on DIFFERENT routes were refused; the duplicate check is over-broad");
      process.exit(1);
    }
  }
}

const stage = fs.mkdtempSync(path.join(os.tmpdir(), "route-holds-mutations-"));
let undetected = 0;
for (const [name, mutate] of MUTANTS) {
  const doc = base();
  mutate(doc);
  const file = path.join(stage, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(doc, null, 2));
  const caught = checkFile(file, knownRouteIds).length > 0;
  console.log(`  ${caught ? "detected " : "UNDETECTED"} ${name}`);
  if (!caught) undetected += 1;
}
fs.rmSync(stage, { recursive: true, force: true });
console.log("");
if (undetected) { console.error(`FAIL route-holds mutations (${undetected}/${MUTANTS.length} undetected)`); process.exit(1); }
console.log(`OK route-holds mutations — ${MUTANTS.length}/${MUTANTS.length} planted defects are catchable.`);
