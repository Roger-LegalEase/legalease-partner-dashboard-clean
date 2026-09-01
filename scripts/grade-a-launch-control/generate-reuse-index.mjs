#!/usr/bin/env node
// One reuse decision per candidate, so no worker is dispatched to rebuild
// something that already exists.
//
//   node scripts/grade-a-launch-control/generate-reuse-index.mjs [--check]
//
// WHY THE OBVIOUS TEST IS THE WRONG ONE
//
// The first pass asked "is this branch's tip an ancestor of HEAD?". Every
// branch answered no, because work reaches the Captain by cherry-pick: the
// CONTENT lands and the commit does not. So ancestry says "nothing is
// integrated" about a tree where most of it is.
//
// The second pass asked "does this branch's file set differ from HEAD?". That
// conflates two opposite situations. A branch can differ because it holds work
// HEAD never received (pending), or because HEAD moved PAST it (superseded) --
// and six completed packet families were nearly written off as superseded on
// that reading, when in fact their owned paths were absent from HEAD entirely.
// They only looked superseded because they also touch shared files that later
// commits changed.
//
// So the question is asked per FILE, against three points: the branch tip, the
// merge base, and HEAD.
//
//   branch == HEAD                  -> already integrated
//   branch != HEAD and HEAD == base -> HEAD never received it: PENDING
//   branch != HEAD and HEAD != base -> HEAD moved on: SUPERSEDED
//
// and the branch's verdict is driven by its OWNED paths, because a packet
// family's identity is its own directory, not the shared modules it happens to
// touch on the way past.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const OUT = "data/rcap-grade-a/launch-control/EXISTING_WORK_REUSE_INDEX.json";
const CHECK = process.argv.includes("--check");

const REUSE_DECISIONS = {
  REUSE_AS_IS: "The work exists and is already in the Captain tree. Dispatch nothing for it.",
  RESUME_FROM_COMMIT: "Complete or partial work exists on a branch and is NOT in the Captain tree. Integrate or resume that exact commit; do not rebuild.",
  SALVAGE_SPECIFIC_ASSETS: "Some of the work is usable and some is not. The usable assets are named; the rest is not carried forward.",
  SUPERSEDED_DO_NOT_USE: "The Captain tree has moved past this. Using it would revert current work.",
  REBUILD_REQUIRED_WITH_REASON: "Existing work cannot be carried forward, and the reason is recorded.",
  NO_EXISTING_WORK: "Nothing exists yet. Safe to dispatch as new work."
};

const git = (args) => {
  try { return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 29 }).trim(); }
  catch { return null; }
};
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));

const HEAD = git(["rev-parse", "HEAD"]);

/** Remote census-v1 branches, which is where in-flight worker output lives. */
const branches = (git(["for-each-ref", "--format=%(refname:short)", "refs/remotes/origin/claude/census-v1-*"]) ?? "")
  .split("\n").filter(Boolean).map((ref) => ref.replace(/^origin\//, ""));

/** A packet-build branch owns its family directory; that is its identity. */
function ownedPathsFor(files) {
  const owned = files.filter((f) => f.startsWith("data/rcap-all50/overlays/census-v1/"));
  return owned.length > 0 ? owned : files;
}

function classify(branch) {
  const tip = git(["rev-parse", `origin/${branch}`]);
  if (!tip) return null;
  const base = git(["merge-base", "HEAD", tip]);
  const files = (git(["diff", "--name-only", `${base}..${tip}`]) ?? "").split("\n").filter(Boolean);
  const owned = ownedPathsFor(files);

  let pending = 0, superseded = 0, same = 0;
  const pendingFiles = [];
  for (const file of owned) {
    const atBranch = git(["rev-parse", `${tip}:${file}`]) ?? "ABSENT";
    const atHead = git(["rev-parse", `HEAD:${file}`]) ?? "ABSENT";
    const atBase = git(["rev-parse", `${base}:${file}`]) ?? "ABSENT";
    if (atBranch === atHead) { same += 1; continue; }
    if (atHead === atBase) { pending += 1; pendingFiles.push(file); continue; }
    superseded += 1;
  }

  const decision = pending > 0
    ? "RESUME_FROM_COMMIT"
    : superseded > 0 ? "SUPERSEDED_DO_NOT_USE" : "REUSE_AS_IS";

  return {
    branch,
    tip,
    mergeBase: base,
    filesChanged: files.length,
    ownedPathsExamined: owned.length,
    ownedSameAsHead: same,
    ownedPendingInHead: pending,
    ownedSupersededByHead: superseded,
    reuseDecision: decision,
    pendingFiles: pendingFiles.slice(0, 8),
    pendingFilesTruncated: Math.max(0, pendingFiles.length - 8),
    dispatchable: decision === "RESUME_FROM_COMMIT",
    doNotRebuild: decision !== "NO_EXISTING_WORK"
  };
}

const branchRows = branches.map(classify).filter(Boolean)
  .sort((a, b) => a.branch.localeCompare(b.branch));

// ---- packet families: which of the 352 already have built evidence? ----------
const worklist = read("data/rcap-grade-a/route-obligation-census-candidate/packet-family-build-worklist.json");
const overlayRoot = path.join(ROOT, "data/rcap-all50/overlays/census-v1");
const builtInTree = new Set();
if (fs.existsSync(overlayRoot)) {
  for (const state of fs.readdirSync(overlayRoot)) {
    const stateDir = path.join(overlayRoot, state);
    if (!fs.statSync(stateDir).isDirectory()) continue;
    for (const family of fs.readdirSync(stateDir)) builtInTree.add(family.replace(/--official-pdf-fill$/, ""));
  }
}
// A family whose evidence sits on a branch but not in the tree is NOT free to
// dispatch: assigning it would have two workers build the same family.
const builtOnBranch = new Map();
for (const row of branchRows) {
  if (row.reuseDecision !== "RESUME_FROM_COMMIT") continue;
  for (const file of (git(["diff", "--name-only", `${row.mergeBase}..${row.tip}`]) ?? "").split("\n")) {
    const match = file.match(/^data\/rcap-all50\/overlays\/census-v1\/[a-z]{2}\/([^/]+?)--official-pdf-fill\//);
    if (match) builtOnBranch.set(match[1], row.branch);
  }
}

const familyRows = worklist.packetFamilies.map((family) => {
  const id = family.worklistGroupId;
  const normalized = id.replace(/_/g, "-");
  const inTree = builtInTree.has(id) || builtInTree.has(normalized);
  const onBranch = builtOnBranch.get(id) ?? builtOnBranch.get(normalized) ?? null;
  const decision = inTree ? "REUSE_AS_IS" : onBranch ? "RESUME_FROM_COMMIT" : "NO_EXISTING_WORK";
  return {
    worklistGroupId: id,
    jurisdictions: family.jurisdictions ?? [],
    implementationStrategy: family.implementationStrategy ?? null,
    evidenceInCaptainTree: inTree,
    evidenceOnBranch: onBranch,
    reuseDecision: decision,
    freeToDispatch: decision === "NO_EXISTING_WORK"
  };
}).sort((a, b) => a.worklistGroupId.localeCompare(b.worklistGroupId));

const byDecision = (rows) => rows.reduce((acc, row) => {
  acc[row.reuseDecision] = (acc[row.reuseDecision] ?? 0) + 1; return acc;
}, {});

const doc = {
  schemaVersion: "rcap-grade-a-reuse-index/v1",
  generatedBy: "scripts/grade-a-launch-control/generate-reuse-index.mjs",
  question: "For every candidate the first wave might touch, does work already exist, and where?",
  atCaptainHead: HEAD,
  whyAncestryIsNotTheTest:
    "Work reaches the Captain by cherry-pick, so the content lands and the commit does not. Every branch tip fails an ancestry test against HEAD while most of the work is already integrated. Reuse is decided per file against three points -- branch tip, merge base, HEAD -- and a branch's verdict is driven by its owned paths, because a packet family's identity is its own directory rather than the shared modules it touches on the way past.",
  reuseDecisionVocabulary: REUSE_DECISIONS,
  branchCounts: byDecision(branchRows),
  familyCounts: byDecision(familyRows),
  totals: {
    branchesClassified: branchRows.length,
    branchesWithPendingWork: branchRows.filter((r) => r.reuseDecision === "RESUME_FROM_COMMIT").length,
    packetFamilies: familyRows.length,
    familiesWithEvidenceInTree: familyRows.filter((r) => r.evidenceInCaptainTree).length,
    familiesWithEvidenceOnBranch: familyRows.filter((r) => r.evidenceOnBranch).length,
    familiesFreeToDispatch: familyRows.filter((r) => r.freeToDispatch).length
  },
  dispatchRule:
    "No assignment may be dispatched without a reuse record. A packet lane may only receive a family whose reuseDecision is NO_EXISTING_WORK; a family already built in the tree or on a branch is integrated or resumed, never rebuilt.",
  branches: branchRows,
  families: familyRows
};

const serialized = JSON.stringify(doc, null, 2) + "\n";
const outPath = path.join(ROOT, OUT);
if (CHECK) {
  const current = fs.existsSync(outPath) ? fs.readFileSync(outPath, "utf8") : null;
  if (current === null) { console.error(`${OUT} is missing. Run the generator.`); process.exit(1); }
  // atCaptainHead is provenance, not a finding. Committing this file moves HEAD
  // past the value it recorded, so a byte comparison including that field would
  // report the index stale on every commit whether or not a single reuse
  // decision had changed — and the fix a reader would reach for is to
  // regenerate, which churns the file without learning anything.
  //
  // So the FINDINGS are compared byte-for-byte and the recorded head is checked
  // for what it can actually promise: that it is still in this history.
  const committed = JSON.parse(current);
  const strip = (value) => { const copy = { ...value }; delete copy.atCaptainHead; return JSON.stringify(copy, null, 2) + "\n"; };
  if (strip(committed) !== strip(doc)) {
    console.error(`${OUT} is stale: a reuse decision has changed. Run the generator.`);
    process.exit(1);
  }
  const stillInHistory = committed.atCaptainHead === HEAD
    || execFileSync("git", ["merge-base", "--is-ancestor", committed.atCaptainHead, "HEAD"], { cwd: ROOT }) !== undefined;
  if (!stillInHistory) {
    console.error(`${OUT} records ${committed.atCaptainHead}, which is not an ancestor of HEAD.`);
    process.exit(1);
  }
  console.log(`reuse index current: ${branchRows.length} branch(es), ${familyRows.length} family(ies); recorded at ${committed.atCaptainHead.slice(0, 8)}.`);
  process.exit(0);
}
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, serialized);
console.log(`Wrote ${OUT}\n`);
console.log(`  branches: ${JSON.stringify(doc.branchCounts)}`);
console.log(`  families: ${JSON.stringify(doc.familyCounts)}`);
console.log(`  free to dispatch: ${doc.totals.familiesFreeToDispatch} of ${doc.totals.packetFamilies}`);
