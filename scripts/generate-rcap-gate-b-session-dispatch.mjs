#!/usr/bin/env node
// Which numbered session owns which existing assignment.
//
//   node scripts/generate-rcap-gate-b-session-dispatch.mjs
//   node scripts/generate-rcap-gate-b-session-dispatch.mjs --check
//
// A map, not a new architecture. The eleven assignment files already carry the
// asset ids, family ids, allowed and prohibited paths; this names the session
// that owns each and pins the remote tip that session is continuing from, so a
// lane resuming work knows whether the base moved underneath it.
//
// Nothing here may alter assignment membership. The generator reads the
// assignments and fails if a mapped file is missing, if two sessions claim one
// assignment, or if the assignment set has drifted from the canonical
// denominator — a dispatch record that disagrees with the queue would send a
// session after assets that are no longer retained.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const ASSIGNMENTS = "data/rcap-all50/gate-b-assignments";
const LEDGER = "data/rcap-all50/pdf-independent-reviews/inventory-closure-ledger.json";
const QUEUE = "data/rcap-all50/gate-b-81-terminalization-queue.json";
const OUT = `${ASSIGNMENTS}/session-dispatch.json`;
const OUT_MD = "docs/record-clearing/gate-b-session-dispatch.md";

const abs = (rel) => path.join(rootDir, rel);
const readJson = (rel) => JSON.parse(fs.readFileSync(abs(rel), "utf8"));
const fail = (m) => { console.error(`FAIL session dispatch — ${m}`); process.exit(1); };
const git = (...a) => { try { return execFileSync("git", a, { cwd: rootDir }).toString().trim(); } catch { return null; } };

const ledger = readJson(LEDGER);
const queue = readJson(QUEUE);

/** The remote tip each active lane is continuing from. */
const LANE_BRANCHES = {
  7: "claude/rcap-gate-b-family-rerender-1-cac37584",
  8: "claude/rcap-gate-b-family-rerender-2-cac37584",
  6: "claude/rcap-gate-b-shared-hotfix-after-lane1",
  9: "claude/rcap-gate-b-sidecars-lane2-batch01-corrected",
  10: "claude/rcap-gate-b-visual-lane2-batch01-clean",
  11: "claude/official-pdf-urls-hash-f9s8u9",
  12: "claude/landing-page-resolution-g4zrto",
  13: "claude/rcap-retirement-corpus-guard"
};

const MAP = [
  { session: 1, role: "captain / integration", assignment: null },
  { session: 2, role: "independent review", assignment: "reviewer-a.json" },
  { session: 3, role: "independent review", assignment: "reviewer-b.json" },
  { session: 4, role: "independent review", assignment: "reviewer-c.json" },
  { session: 5, role: "independent review", assignment: "reviewer-d.json" },
  { session: 6, role: "shared code and source-pack factory", assignment: null },
  { session: 7, role: "family rerender", assignment: "family-rerender-1.json" },
  { session: 8, role: "family rerender", assignment: "family-rerender-2.json" },
  { session: 9, role: "provenance sidecars", assignment: "evidence-sidecars.json" },
  { session: 10, role: "all-page visual evidence", assignment: "evidence-visual.json" },
  { session: 11, role: "source acquisition", assignment: "source-direct.json" },
  { session: 12, role: "source resolution", assignment: "source-resolution.json" },
  { session: 13, role: "retirement and repoint", assignment: "retirement-repoint.json" }
];

const claimed = new Map();
const sessions = MAP.map((entry) => {
  let assetIds = [];
  let familyIds = [];
  let allowedPaths = [];
  let prohibitedPaths = [];
  if (entry.assignment) {
    const rel = `${ASSIGNMENTS}/${entry.assignment}`;
    if (!fs.existsSync(abs(rel))) fail(`Session ${entry.session} is mapped to ${entry.assignment}, which does not exist`);
    if (claimed.has(entry.assignment)) {
      fail(`${entry.assignment} is claimed by Sessions ${claimed.get(entry.assignment)} and ${entry.session}`);
    }
    claimed.set(entry.assignment, entry.session);
    const body = readJson(rel);
    assetIds = body.assetIds ?? [];
    familyIds = body.familyIds ?? [];
    allowedPaths = body.allowedPaths ?? [];
    prohibitedPaths = body.prohibitedPaths ?? [];
  }
  const branch = LANE_BRANCHES[entry.session] ?? null;
  const tip = branch ? git("rev-parse", `origin/${branch}`) : null;
  if (branch && !tip) fail(`Session ${entry.session}: origin/${branch} is not reachable in this clone`);
  return {
    session: entry.session,
    role: entry.role,
    assignment: entry.assignment,
    currentRemoteBranch: branch,
    currentRemoteTip: tip,
    currentRemoteTipSubject: tip ? git("log", "-1", "--format=%s", tip) : null,
    assetCount: assetIds.length,
    assetIds,
    familyIds,
    allowedPaths,
    prohibitedPaths
  };
});

// Membership is read, never rewritten. If the assignments no longer cover the
// canonical denominator, the dispatch record would be pointing sessions at a
// set the queue has moved past.
const assignedAssets = sessions.filter((s) => s.assignment && !s.assignment.startsWith("evidence-"))
  .flatMap((s) => s.assetIds);
const unique = new Set(assignedAssets);
if (unique.size !== queue.totals.queued) {
  fail(`the assignments cover ${unique.size} unique assets and the queue holds ${queue.totals.queued}`);
}
if (unique.size !== assignedAssets.length) fail("an asset is claimed by two primary assignments");

const pathOwner = new Map();
let pathOverlaps = 0;
for (const s of sessions) {
  for (const p of s.allowedPaths) {
    if (p.includes("<own-batch>")) continue;
    if (pathOwner.has(p) && pathOwner.get(p) !== s.session) { pathOverlaps += 1; fail(`Sessions ${pathOwner.get(p)} and ${s.session} both claim ${p}`); }
    pathOwner.set(p, s.session);
  }
}

const record = {
  schemaVersion: "rcap-gate-b-session-dispatch/v1",
  generatedBy: "scripts/generate-rcap-gate-b-session-dispatch.mjs",
  captainHead: git("rev-parse", "HEAD"),
  thisIsAMapNotAnArchitecture:
    "The eleven assignment files are unchanged. This names the session that owns each and pins the remote tip it continues from; no asset id, family id, allowed path, prohibited path or denominator membership is altered here.",
  denominator: {
    platform_ready: ledger.equation.platformReady,
    retired: ledger.equation.retired,
    retained_problematic: ledger.equation.retainedProblematic,
    retained_missing: ledger.retainedBreakdown.retainedMissing
  },
  cancelled: {
    what: "the pdf-lane-2..7 reset and reviewer-8..11 queues",
    why: "superseded by this dispatch over the existing eleven assignments; the files and their generator are removed so no session can pick up a cancelled assignment",
    keptFromThatWork: "the shared finalizer hotfix, ownership/index corrections and source-pack factory imported into this base, which are independent of the lane recut"
  },
  totals: {
    sessions: sessions.length,
    assignmentsMapped: claimed.size,
    uniqueAssetsAssigned: unique.size,
    pathOverlaps,
    activeLaneTipsRecorded: sessions.filter((s) => s.currentRemoteTip).length
  },
  sessions
};

function markdown() {
  const lines = [];
  lines.push("# Gate B numbered-session dispatch");
  lines.push("");
  lines.push(record.thisIsAMapNotAnArchitecture);
  lines.push("");
  lines.push("| session | role | assignment | assets | continuing from |");
  lines.push("| ---: | --- | --- | ---: | --- |");
  for (const s of sessions) {
    lines.push(`| ${s.session} | ${s.role} | ${s.assignment ? `\`${s.assignment}\`` : "—"} | ${s.assetCount} | ${s.currentRemoteTip ? `\`${s.currentRemoteTip.slice(0, 12)}\`` : "—"} |`);
  }
  lines.push("");
  return lines.join("\n");
}

const outputs = [[OUT, `${JSON.stringify(record, null, 2)}\n`], [OUT_MD, markdown()]];
let stale = 0;
for (const [rel, content] of outputs) {
  const file = abs(rel);
  const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (current === content) continue;
  stale += 1;
  if (checkOnly) { console.error(`  stale: ${rel}`); continue; }
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
if (checkOnly && stale) fail(`${stale} output(s) are stale; re-run scripts/generate-rcap-gate-b-session-dispatch.mjs`);

console.log(
  `OK session dispatch — ${record.totals.sessions} sessions, ${record.totals.assignmentsMapped} assignments mapped, ` +
    `${record.totals.uniqueAssetsAssigned} unique assets, ${record.totals.pathOverlaps} path overlap(s), ` +
    `${record.totals.activeLaneTipsRecorded} active lane tip(s) pinned`
);
