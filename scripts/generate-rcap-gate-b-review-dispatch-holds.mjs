#!/usr/bin/env node
// Batches that are built but must not be reviewed yet.
//
//   node scripts/generate-rcap-gate-b-review-dispatch-holds.mjs
//   node scripts/generate-rcap-gate-b-review-dispatch-holds.mjs --check
//
// A held batch is a dispatch state, not a verdict. No reviewer has looked at
// these artifacts and none is being asked to: the hold says the bytes are known
// defective before review, so sending them out would spend an independent review
// on artifacts that are already scheduled for replacement, and would produce
// correction records against files nobody will file.
//
// The commits are recorded rather than consumed. Their branches are the defect
// evidence and must stay reachable — a held batch whose commits get garbage
// collected loses the proof of why it was held.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const LEDGER = "data/rcap-all50/pdf-independent-reviews/inventory-closure-ledger.json";
const OUT = "data/rcap-all50/gate-b-review-dispatch-holds.json";
const OUT_MD = "docs/record-clearing/gate-b-review-dispatch-holds.md";

const abs = (rel) => path.join(rootDir, rel);
const readJson = (rel) => JSON.parse(fs.readFileSync(abs(rel), "utf8"));

function fail(message) {
  console.error(`FAIL review dispatch holds — ${message}`);
  process.exit(1);
}

const git = (...args) => {
  try { return execFileSync("git", args, { cwd: rootDir }).toString().trim(); }
  catch { return null; }
};

const HOLDS = [
  {
    batchId: "lane-2-batch-01",
    status: "correction_required_before_review",
    heldBy: "Session 1 (integration captain), on Session 10's measured findings",
    reviewersAssigned: [],
    commits: [
      { role: "rerender", sha: "38f1e2e82aad3275b374d49cc74308eda9419b03" },
      { role: "sidecars", sha: "0d1b6704dd4078a6305018215c67802cf9fcc140" },
      { role: "visual", sha: "fb38220b8503e6d2fdbe83cb26e3b26829595ba4" }
    ],
    defects: [
      {
        id: "L2B1-WHITE-RECTANGLES",
        finding: "34 opaque white rectangles cover official source content on the finalized artifacts",
        whyItBlocksReview:
          "A reviewer reading the finalized page cannot see what the rectangles hide, so an approval would attest to a page whose official content is obscured rather than absent."
      },
      {
        id: "L2B1-FLATTEN-RESIDUE",
        finding: "flattened chooser prompts, command buttons and option-list residue reach the filed page",
        whyItBlocksReview:
          "Interface text on a filed pleading is a defect a reviewer would return, and it is already known; the return would tell this programme nothing it does not have."
      }
    ],
    sidecarsAreNotLaunchEvidence:
      "Session 9's sidecars are pinned to artifacts that must be replaced. They are not imported as current launch evidence, because a sidecar is a claim about specific bytes and those bytes are scheduled for replacement; importing them would put a conformant-looking record against files that will not exist.",
    requiredSequenceBeforeReview: [
      "Session 5 — shared finalizer fix",
      "Session 6 — impact census",
      "Session 8 — corrected rerender",
      "Session 9 — new sidecars",
      "Session 10 — new visual evidence",
      "independent review"
    ],
    doNotAssign: ["Reviewer A", "Reviewer B"]
  }
];

const holds = HOLDS.map((hold) => {
  const commits = hold.commits.map((c) => {
    const exists = git("cat-file", "-e", `${c.sha}^{commit}`) !== null;
    if (!exists) fail(`${hold.batchId}: ${c.role} commit ${c.sha.slice(0, 12)} is not reachable in this clone`);
    // A held commit that has been consumed would mean the defective bytes are
    // already in the captain tree, which is the thing the hold prevents.
    const consumed = git("merge-base", "--is-ancestor", c.sha, "HEAD") !== null;
    if (consumed) fail(`${hold.batchId}: ${c.role} commit ${c.sha.slice(0, 12)} is an ancestor of HEAD — the hold has already been breached`);
    const branches = (git("for-each-ref", "--format=%(refname:short)", "refs/remotes/origin") ?? "")
      .split("\n")
      .filter((ref) => ref && git("merge-base", "--is-ancestor", c.sha, ref) !== null);
    return { ...c, subject: git("log", "-1", "--format=%s", c.sha), consumed: false, preservedOn: branches };
  });
  const unpreserved = commits.filter((c) => c.preservedOn.length === 0);
  if (unpreserved.length) {
    fail(`${hold.batchId}: ${unpreserved.length} commit(s) are on no remote branch and would be lost as defect evidence`);
  }
  return { ...hold, commits };
});

const ledger = readJson(LEDGER);

const record = {
  schemaVersion: "rcap-gate-b-review-dispatch-holds/v1",
  generatedBy: "scripts/generate-rcap-gate-b-review-dispatch-holds.mjs",
  head: git("rev-parse", "HEAD"),
  aHoldIsNotAVerdict:
    "Nothing here is a review outcome. No reviewer has seen these artifacts and none is assigned. The status records that the captain will not build a review base from these commits, and why.",
  denominatorUnmoved: {
    platform_ready: ledger.equation.platformReady,
    retired: ledger.equation.retired,
    retained_problematic: ledger.equation.retainedProblematic,
    retained_missing: ledger.retainedBreakdown.retainedMissing,
    because: "a held batch changes no asset's disposition; the families in it stay exactly where the queue already puts them."
  },
  totals: {
    heldBatches: holds.length,
    heldCommits: holds.reduce((n, h) => n + h.commits.length, 0),
    commitsConsumed: 0,
    reviewersAssigned: holds.reduce((n, h) => n + h.reviewersAssigned.length, 0)
  },
  holds
};

function markdown() {
  const lines = [];
  lines.push("# Gate B review dispatch holds");
  lines.push("");
  lines.push(record.aHoldIsNotAVerdict);
  lines.push("");
  for (const hold of holds) {
    lines.push(`## \`${hold.batchId}\` — ${hold.status}`);
    lines.push("");
    lines.push("| role | commit | preserved on |");
    lines.push("| --- | --- | --- |");
    for (const c of hold.commits) {
      lines.push(`| ${c.role} | \`${c.sha.slice(0, 12)}\` | ${c.preservedOn.map((b) => `\`${b}\``).join(", ") || "—"} |`);
    }
    lines.push("");
    for (const d of hold.defects) {
      lines.push(`- **${d.id}** — ${d.finding}`);
      lines.push(`  - ${d.whyItBlocksReview}`);
    }
    lines.push("");
    lines.push(hold.sidecarsAreNotLaunchEvidence);
    lines.push("");
    lines.push("Required before any review base is built:");
    lines.push("");
    for (const step of hold.requiredSequenceBeforeReview) lines.push(`1. ${step}`);
    lines.push("");
  }
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
if (checkOnly && stale) fail(`${stale} output(s) are stale; re-run scripts/generate-rcap-gate-b-review-dispatch-holds.mjs`);

console.log(
  `OK review dispatch holds — ${record.totals.heldBatches} batch(es) held, ` +
    `${record.totals.heldCommits} commit(s) recorded and none consumed, ` +
    `${record.totals.reviewersAssigned} reviewer(s) assigned; denominator unmoved`
);
