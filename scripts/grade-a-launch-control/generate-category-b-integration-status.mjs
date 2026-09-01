#!/usr/bin/env node
// One canonical answer for what the branch-identity wave actually finished.
//
//   node scripts/grade-a-launch-control/generate-category-b-integration-status.mjs [--check]
//
// WHY THIS EXISTS
//
// Seven lanes returned the same two required filenames in seven different
// shapes. The array is called branchIdentities, routes or records; the status
// field is implementationStatus, completionStatus, status, a nested
// implementationStop object, or absent entirely; the status vocabulary runs from
// COMPLETED to COMPLETE_NEW_IDENTITY_RECORDED_WITH_ROUTE_BOUNDARIES. That is a
// dispatch defect -- the assignment named files and prose, never a schema -- and
// the cost is that nothing downstream can read the wave uniformly and no
// verifier can prove a route was completed rather than merely mentioned.
//
// So each lane gets an explicit adapter that says, in one place, what that
// lane's words mean. The adapters are deliberately narrow: an unrecognised
// status REFUSES rather than defaulting. Defaulting an unknown status to
// STOPPED would understate the wave; defaulting it to COMPLETED would let an
// unfinished route be counted as done, which is the expensive direction.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CHECK = process.argv.includes("--check");
const MUTATIONS = process.argv.includes("--mutations");
const OUT = "data/rcap-grade-a/launch-control/CATEGORY_B_INTEGRATION_STATUS.json";
const LC = "data/rcap-grade-a/launch-control";
const BASE = "data/rcap-grade-a/category-b-integration";

const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

const delta = read(`${LC}/CATEGORY_B_REVALIDATION_INTEGRATION_DELTA.json`);
const dispatch = read(`${LC}/ACTIVE_CODEX_ASSIGNMENTS.json`);
const deltaByKey = new Map(delta.rows.map((r) => [r.originalRouteKey, r]));

/**
 * A lane adapter.
 *
 * `dir`      the lane's owned directory
 * `array`    the array in branch-identities.json that holds one row per route
 * `key`      the field on that row carrying the route key
 * `status`   how to read the lane's own completion word for a row
 * `branch`   how to read the participant A branch route key or keys it settled
 *             on. An array, because a scenario split legitimately binds one
 *             stage to more than one existing Category A route -- Maryland's
 *             pre-service route resolves to the ordinary and the early § 10-105
 *             petitions depending on timing, and collapsing that to one key
 *             would drop a real branch.
 * `stop`     how to read why it stopped, when it did
 */
const ADAPTERS = {
  C1_SPLIT_AUTOMATIC_CORRECTION_STATUS: {
    dir: "c1-split-automatic-correction-status", array: "branchIdentities", key: "originalRouteKey",
    status: (r) => r.implementationStatus,
    branch: (r) => (r.requiredABranchIdentity?.proposedRouteKey ? [r.requiredABranchIdentity.proposedRouteKey] : []),
    stop: (r) => r.requiredABranchIdentity?.stopReason ?? r.stopReason ?? null
  },
  C2_SPLIT_AUTOMATIC_COURT_PETITION: {
    dir: "c2-split-automatic-court-petition", array: "routes", key: "routeKey",
    status: (r) => r.status,
    branch: (r) => [r.participantABranch?.identity?.routeKey, r.participantABranch?.routeKey, ...(r.participantABranch?.identity?.routeKeys ?? [])].filter(Boolean),
    stop: (r) => (r.stopReasons ?? []).join(" ") || null
  },
  C3_SPLIT_AGENCY_PROSECUTOR_APPLICATION: {
    dir: "c3-split-agency-prosecutor-application", array: "records", key: "originalRouteKey",
    status: (r) => r.completionStatus,
    branch: (r) => [r.participantABranch?.routeKey].filter(Boolean),
    stop: (r) => r.participantABranch?.stopReason ?? r.stopReason ?? null
  },
  C4_SPLIT_OBJECTION_HEARING_APPEAL: {
    dir: "c4-split-objection-hearing-appeal", array: "records", key: "originalRouteKey",
    // This lane wrote no status field. Its single route carries a fully
    // specified participant branch and a crosswalk confirmation, so a present
    // branch identity IS its completion statement; a row without one refuses
    // rather than being read as complete.
    status: (r) => (r.participantABranch?.routeKey ? "COMPLETE_NO_STATUS_FIELD_BRANCH_PRESENT" : "UNSTATED_AND_NO_BRANCH"),
    branch: (r) => [r.participantABranch?.routeKey].filter(Boolean),
    stop: () => null
  },
  C5_SPLIT_POST_ORDER_ENFORCEMENT: {
    dir: "c5-split-post-order-enforcement", array: "records", key: "routeKey",
    status: (r) => r.completionStatus,
    branch: (r) => [r.participantABranch?.identity?.routeKey, r.participantABranch?.routeKey, ...(r.participantABranch?.identity?.routeKeys ?? [])].filter(Boolean),
    stop: (r) => (Array.isArray(r.unresolved) ? r.unresolved.join(" ") : (r.unresolved?.reason ?? null)) || null
  },
  C6_CONVERT_ALL_TO_A: {
    dir: "c6-convert-all-to-a", array: "records", key: "originalRouteKey",
    // STOPPED_BEFORE_PACKET_IMPLEMENTATION is a SCOPE BOUNDARY, not a failure:
    // this lane was told to create identity and explicitly not to create packet
    // families. Reading it as a stop would report three finished conversions as
    // three failures.
    status: (r) => r.implementationStop?.status ?? "UNSTATED",
    branch: (r) => [r.participantABranch?.routeKey].filter(Boolean),
    stop: () => null
  },
  C7_CONFIRM_B_GUIDANCE: {
    dir: "c7-confirm-b-guidance", array: "routes", key: "routeKey",
    // A confirmed exclusion has no participant filing by definition, so the
    // completion test is the retained B stage, not an A branch.
    status: (r) => (r.retainedBStage ? "CONFIRM_B_GUIDANCE_RECORDED" : "UNSTATED_AND_NO_RETAINED_STAGE"),
    branch: () => [],
    stop: () => null
  }
};

/** What each lane's word means, stated once. Anything absent refuses. */
const CANONICAL = {
  COMPLETED: "COMPLETED",
  COMPLETE_NEW_IDENTITY: "COMPLETED",
  COMPLETE_REUSED_BRANCH: "COMPLETED",
  COMPLETE_NEW_IDENTITY_RECORDED: "COMPLETED",
  COMPLETE_NEW_IDENTITY_RECORDED_WITH_ROUTE_BOUNDARIES: "COMPLETED",
  COMPLETE_NO_STATUS_FIELD_BRANCH_PRESENT: "COMPLETED",
  COMPLETED_WITH_SCENARIO_SPLIT: "COMPLETED",
  COMPLETED_WITH_SELF_HELP_STOPS: "COMPLETED",
  CONFIRM_B_GUIDANCE_RECORDED: "COMPLETED",
  STOPPED_BEFORE_PACKET_IMPLEMENTATION: "COMPLETED",
  STOPPED_UNRESOLVED: "STOPPED",
  STOPPED_PARTIAL_INSTRUMENT_IDENTITY: "STOPPED",
  STOPPED_UNRESOLVED_INSTRUMENT_IDENTITY: "STOPPED",
  STOPPED_UNRESOLVED_CROSSWALK: "STOPPED",
  STOPPED_PARTIAL_CROSSWALK: "STOPPED",
  STOPPED_EXISTING_ROUTE_OVERLAP: "STOPPED"
};
/** Why a word maps the way it does, where the mapping is not obvious. */
const MAPPING_NOTE = {
  STOPPED_BEFORE_PACKET_IMPLEMENTATION:
    "C6 was told to create identity and explicitly not to create packet families. This is the lane's scope boundary, so the route's assigned work is complete and the packet remains a later wave's.",
  COMPLETED_WITH_SELF_HELP_STOPS:
    "C5 completed the branch identity and recorded where a participant must be handed off rather than helped further. The identity is done; the handoff is copy, not an open route.",
  COMPLETED_WITH_SCENARIO_SPLIT:
    "C5 completed the identity and recorded that one route serves more than one participant scenario. The split is a downstream selector question, not unfinished identity work.",
  COMPLETE_NO_STATUS_FIELD_BRANCH_PRESENT:
    "C4 wrote no status field at all. Completion is inferred from a fully specified participant branch plus a confirmed crosswalk; a row lacking a branch refuses instead."
};

const problems = [];
const rows = [];
const laneSummaries = [];

for (const [laneKey, adapter] of Object.entries(ADAPTERS)) {
  const file = `${BASE}/${adapter.dir}/branch-identities.json`;
  const assigned = (dispatch.assignments.find((a) => a.assignmentId === laneKey)?.routeKeys ?? []).slice().sort();
  if (!exists(file)) {
    problems.push(`${laneKey}: ${file} is missing; the lane's return is not integrated`);
    continue;
  }
  const doc = read(file);
  const arr = doc[adapter.array];
  if (!Array.isArray(arr)) { problems.push(`${laneKey}: ${file} has no array at "${adapter.array}"`); continue; }

  const seen = new Set();
  for (const record of arr) {
    const routeKey = record[adapter.key];
    if (!routeKey) { problems.push(`${laneKey}: a record has no ${adapter.key}`); continue; }
    seen.add(routeKey);
    const laneWord = adapter.status(record);
    const canonical = CANONICAL[laneWord];
    if (!canonical) {
      problems.push(`${laneKey}: ${routeKey} carries the status "${laneWord}", which no adapter maps. Add it to CANONICAL deliberately rather than letting it default.`);
      continue;
    }
    const deltaRow = deltaByKey.get(routeKey);
    if (!deltaRow) { problems.push(`${laneKey}: ${routeKey} is not one of the 55 classified routes`); continue; }
    const branch = [...new Set(adapter.branch(record))];
    if (canonical === "COMPLETED" && deltaRow.finalDecision !== "CONFIRM_B" && branch.length === 0) {
      problems.push(`${laneKey}: ${routeKey} is reported complete but names no participant A branch`);
    }
    rows.push({
      routeKey,
      jurisdiction: deltaRow.jurisdiction,
      publicLabel: deltaRow.publicLabel,
      laneKey,
      finalDecision: deltaRow.finalDecision,
      dispatchedReuseDecision: deltaRow.reuseDecision.decision,
      laneReportedStatus: laneWord,
      integrationStatus: canonical,
      mappingNote: MAPPING_NOTE[laneWord] ?? null,
      participantABranchRouteKeys: branch,
      packetFamilyNamedNotCreated: deltaRow.requiredParticipantPacketFamily ?? deltaRow.existingPacketFamilyId ?? null,
      stopReason: canonical === "STOPPED" ? (adapter.stop(record) ?? "the lane reported a stop without a machine-readable reason") : null,
      residual: canonical === "STOPPED"
    });
  }

  const missing = assigned.filter((k) => !seen.has(k));
  const extra = [...seen].filter((k) => !assigned.includes(k));
  if (missing.length > 0) problems.push(`${laneKey}: ${missing.length} assigned route(s) absent from the return: ${missing.slice(0, 3).join(", ")}`);
  if (extra.length > 0) problems.push(`${laneKey}: ${extra.length} route(s) returned that were never assigned to it: ${extra.slice(0, 3).join(", ")}`);

  const laneRows = rows.filter((r) => r.laneKey === laneKey);
  laneSummaries.push({
    laneKey,
    assigned: assigned.length,
    returned: seen.size,
    completed: laneRows.filter((r) => r.integrationStatus === "COMPLETED").length,
    stopped: laneRows.filter((r) => r.integrationStatus === "STOPPED").length,
    returnFile: file
  });
}

// Every one of the 55 must be accounted for. A route in no lane's return is not
// "pending": it is a route nobody is holding, which is how work disappears.
const accounted = new Set(rows.map((r) => r.routeKey));
const unaccounted = delta.rows.map((r) => r.originalRouteKey).filter((k) => !accounted.has(k));
if (unaccounted.length > 0) problems.push(`${unaccounted.length} classified route(s) appear in no lane return: ${unaccounted.slice(0, 3).join(", ")}`);

if (problems.length > 0) {
  console.error(`category B integration status: ${problems.length} problem(s)`);
  for (const p of problems.slice(0, 12)) console.error(`  - ${p}`);
  process.exit(1);
}

rows.sort((a, b) => a.jurisdiction.localeCompare(b.jurisdiction) || a.routeKey.localeCompare(b.routeKey));

const completed = rows.filter((r) => r.integrationStatus === "COMPLETED");
const stopped = rows.filter((r) => r.integrationStatus === "STOPPED");
const newIdentities = completed.filter((r) => r.dispatchedReuseDecision === "NO_EXISTING_WORK" && r.participantABranchRouteKeys.length > 0);
const crosswalks = completed.filter((r) => r.dispatchedReuseDecision === "REUSE_AS_IS" && r.participantABranchRouteKeys.length > 0);
const guidance = completed.filter((r) => r.finalDecision === "CONFIRM_B");

const doc = {
  schemaVersion: "rcap-category-b-integration-status/v1",
  generatedBy: "scripts/grade-a-launch-control/generate-category-b-integration-status.mjs",
  question: "Of the 55 classified Category B routes, which now have an integrated branch identity and which are still open?",
  whyAdaptersAndNotOneSchema:
    "The dispatch named required output FILES and never an output SCHEMA, so seven lanes returned seven shapes for the same fact. Each lane's words are translated once, here, in an adapter that refuses an unrecognised status rather than defaulting it. The next dispatch states the schema so this translation layer stops growing.",
  integrationOpensNothing:
    "An integrated branch identity is an identity. It opens no commercial route, proves no packet, consumes no packet credit and creates no packet family. Every fail-closed commercial gate stands unchanged.",
  counts: {
    classifiedRoutes: delta.counts.rows,
    accountedFor: rows.length,
    completed: completed.length,
    stopped: stopped.length,
    newBranchIdentitiesIntegrated: newIdentities.length,
    crosswalksIntegrated: crosswalks.length,
    confirmedBGuidanceIdentitiesIntegrated: guidance.length,
    packetFamiliesNamedNotCreated: new Set(rows.map((r) => r.packetFamilyNamedNotCreated).filter(Boolean)).size,
    packetFamiliesCreated: 0
  },
  byLane: laneSummaries,
  statusVocabularyObserved: Object.fromEntries(Object.entries(
    rows.reduce((acc, r) => { (acc[r.laneReportedStatus] ??= []).push(r.integrationStatus); return acc; }, {})
  ).map(([word, list]) => [word, { canonical: list[0], rows: list.length }])),
  rows
};

const serialized = JSON.stringify(doc, null, 2) + "\n";
const outPath = path.join(ROOT, OUT);

if (CHECK) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : null;
  if (current !== serialized) { console.error(`${OUT} is stale or missing. Run the generator.`); process.exit(1); }
  console.log(`category B integration status current: ${completed.length} completed, ${stopped.length} stopped of ${rows.length}.`);
  process.exit(0);
}

if (MUTATIONS) {
  const original = fs.readFileSync(outPath);
  const cases = [
    { name: "a stopped route reported as completed is caught", mutate: (j) => { const r = j.rows.find((x) => x.integrationStatus === "STOPPED"); r.integrationStatus = "COMPLETED"; r.residual = false; return j; } },
    { name: "a dropped route is caught", mutate: (j) => { j.rows.shift(); return j; } },
    { name: "an inflated completion count is caught", mutate: (j) => { j.counts.completed = 55; return j; } },
    { name: "a packet family reported as created is caught", mutate: (j) => { j.counts.packetFamiliesCreated = 20; return j; } },
    { name: "a completed route stripped of its A branch is caught", mutate: (j) => { const r = j.rows.find((x) => x.integrationStatus === "COMPLETED" && x.participantABranchRouteKeys.length > 0); r.participantABranchRouteKeys = []; return j; } },
    { name: "a scenario split collapsed to one branch is caught", mutate: (j) => { const r = j.rows.find((x) => x.participantABranchRouteKeys.length > 1); if (r) r.participantABranchRouteKeys = [r.participantABranchRouteKeys[0]]; return j; } }
  ];
  let undetected = 0;
  console.log("mutations:");
  try {
    for (const testCase of cases) {
      fs.writeFileSync(outPath, JSON.stringify(testCase.mutate(JSON.parse(original.toString("utf8"))), null, 2) + "\n");
      let caught = false;
      try { execFileSync(process.execPath, [fileURLToPath(import.meta.url), "--check"], { cwd: ROOT, stdio: "pipe" }); } catch { caught = true; }
      console.log(`  ${caught ? "detected " : "MISSED   "} ${testCase.name}`);
      if (!caught) undetected += 1;
      fs.writeFileSync(outPath, original);
    }
  } finally { fs.writeFileSync(outPath, original); }
  const restored = fs.readFileSync(outPath).equals(original);
  console.log(`\n  every mutated file restored byte-for-byte: ${restored}`);
  if (!restored || undetected > 0) { console.error("the integration status proves less than it claims."); process.exit(1); }
  console.log(`\nOK integration status mutations — ${cases.length} case(s), every mutation caught.`);
  process.exit(0);
}

fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, serialized);
console.log(`Wrote ${OUT}\n`);
for (const l of laneSummaries) console.log(`  ${l.laneKey.padEnd(42)} ${String(l.completed).padStart(2)} completed / ${String(l.stopped).padStart(2)} stopped of ${l.assigned}`);
console.log(`\n  ${completed.length} completed · ${stopped.length} stopped · ${newIdentities.length} new identities · ${crosswalks.length} crosswalks · ${guidance.length} guidance`);
