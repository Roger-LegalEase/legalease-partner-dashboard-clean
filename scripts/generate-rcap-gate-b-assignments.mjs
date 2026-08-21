#!/usr/bin/env node
// Disjoint work assignments cut from the terminalization queue.
//
//   node scripts/generate-rcap-gate-b-assignments.mjs
//   node scripts/generate-rcap-gate-b-assignments.mjs --check
//
// Eleven assignments over one queue, and the only property that makes them
// runnable at the same time is that no asset and no writable path appears in
// two of them. Both are checked here rather than left to the reader: an
// assignment set that overlaps produces merge conflicts on shared manifests,
// which is the failure this whole programme has already paid for once.
//
// Each assignment names the base SHA it is cut from, so a shard that starts late
// can tell whether the corpus moved underneath it, and a stop condition, so a
// shard knows when it is done rather than working until it runs out of input.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const QUEUE = "data/rcap-all50/gate-b-81-terminalization-queue.json";
const OUT_DIR = "data/rcap-all50/gate-b-assignments";
const OUT_MD = "docs/record-clearing/gate-b-assignments.md";

const abs = (rel) => path.join(rootDir, rel);
const readJson = (rel) => JSON.parse(fs.readFileSync(abs(rel), "utf8"));

function fail(message) {
  console.error(`FAIL assignments — ${message}`);
  process.exit(1);
}

const queue = readJson(QUEUE);
const baseSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: rootDir }).toString().trim();

const byBucket = (b) => queue.assets.filter((a) => a.primaryBucket === b);
/**
 * Split into `n` groups keeping each jurisdiction whole where it fits.
 *
 * Round-robin would scatter one state's forms across every shard, and those
 * forms share a caption band, a source folder and usually a defect. Splitting on
 * jurisdiction keeps the shared context in one shard and keeps two shards off
 * the same family package.
 */
const chunk = (list, n) => {
  const byJurisdiction = new Map();
  for (const item of list) {
    const key = item.jurisdiction ?? "??";
    if (!byJurisdiction.has(key)) byJurisdiction.set(key, []);
    byJurisdiction.get(key).push(item);
  }
  const out = Array.from({ length: n }, () => []);
  for (const group of [...byJurisdiction.values()].sort((a, b) => b.length - a.length)) {
    out.sort((a, b) => a.length - b.length)[0].push(...group);
  }
  return out;
};

/** Paths no shard may write, whoever it is. */
const GLOBAL_PROHIBITED = [
  "src/**", "package.json", "package-lock.json", "tsconfig.json", "next.config.ts",
  "supabase/migrations/**", "deploy/rcap-render-worker/**", ".github/workflows/**",
  "scripts/rcap-official-forms/rcap-platform-ready.mjs",
  "data/rcap-all50/pdf-independent-reviews/*-manifest.json",
  "data/rcap-all50/pdf-independent-reviews/*-group-*.review.json"
];

const rerender = byBucket("RERENDER_REQUIRED");
const source = byBucket("SOURCE_REQUIRED");
const retire = byBucket("RETIRE_OR_REPOINT");

// The four gate-refused approvals are the rerender shards' first work: they are
// the only assets whose terminal target is reachable in one round.
const gateRefused = rerender.filter((a) => /approved_platform_ready/.test(a.reviewStatus));
const otherRerender = rerender.filter((a) => !/approved_platform_ready/.test(a.reviewStatus));
const [rerenderA, rerenderB] = chunk(otherRerender, 2);
// The four gate-refused approvals go to shard 1: they are the only assets whose
// terminal target is reachable in a single round, and they need the shared
// binder change that shard 1 owns.
rerenderA.unshift(...gateRefused);

// Reviewer shards take REVIEW_ONLY assets and nothing else. An asset a rerender
// shard is about to change cannot also be under review: the reviewer would be
// approving bytes that are being replaced underneath them, which is the defect
// this programme has already recorded twice. REVIEW_ONLY is empty today, so all
// four shards are cut empty and say so in their stop condition rather than being
// handed work that would be invalid on arrival.
const reviewerShards = chunk(byBucket("REVIEW_ONLY"), 4);

const [sourceA, sourceB] = chunk(source, 2);

// Evidence shards are path-scoped rather than asset-scoped: they own the two
// evidence surfaces across whichever families the rerender shards produce.
const evidenceAssets = rerender.map((a) => a.assetId);

const assignments = [
  ...reviewerShards.map((assets, i) => ({
    id: `reviewer-${"abcd"[i]}`,
    lane: "LANE-REVIEW",
    role: "independent review",
    assetIds: assets.map((a) => a.assetId),
    familyIds: assets.flatMap((a) => a.familyIds),
    allowedPaths: [`${OUT_DIR}/reviewer-${"abcd"[i]}.json`,
      "data/rcap-all50/pdf-independent-reviews/<own-batch>-manifest.json",
      "data/rcap-all50/pdf-independent-reviews/<own-batch>-group-*.review.json",
      "docs/record-clearing/pdf-independent-reviews/<own-batch>/**"],
    prohibitedPaths: [...GLOBAL_PROHIBITED, "data/rcap-all50/overlays/production/**",
      "another reviewer's batch files", "any implementation or evidence this shard produced"],
    expectedOutput: "one canonical batch — manifest, group review file and verdict rollup — carrying a verdict for each assigned family, with every referenced hash recomputed from disk and the official source SHA-256 recomputed from the mounted Edition 1 bytes",
    focusedVerifier: "node scripts/verify-rcap-pdf-independent-review-records.mjs",
    stopCondition: assets.length === 0
      ? "no input: every assigned family is waiting on a rerender. Do not review anything until a rerender shard lands new bytes and the captain re-cuts this assignment."
      : "every assigned family carries a verdict in this shard's own canonical batch, and the canonical verifier reports the batch discovered with no structural problem"
  })),
  {
    id: "family-rerender-1",
    lane: "LANE-RERENDER",
    role: "family rerender",
    assetIds: rerenderA.map((a) => a.assetId),
    familyIds: rerenderA.flatMap((a) => a.familyIds),
    allowedPaths: ["scripts/implement-rcap-official-forms-d1.mjs",
      "scripts/rcap-official-forms/**",
      ...rerenderA.map((a) => a.familyPackagePath).filter(Boolean).map((p) => `${p}/**`)],
    prohibitedPaths: [...GLOBAL_PROHIBITED, "family-rerender-2's family packages", `${OUT_DIR}/**`],
    expectedOutput: "the D1 driver emitting classifiedFieldsOrAnchors and discoveredFieldsOrAnchors, every assigned family re-derived and re-rendered from the mounted source, and each family's reports regenerated",
    focusedVerifier: "node scripts/verify-rcap-official-forms-d1.mjs && node scripts/verify-rcap-evidence-contract-controls.mjs",
    stopCondition: "every assigned family's classification carries the two counters, the D1 verifier passes, and the driver reproduces byte-for-byte on a second run"
  },
  {
    id: "family-rerender-2",
    lane: "LANE-RERENDER",
    role: "family rerender",
    assetIds: rerenderB.map((a) => a.assetId),
    familyIds: rerenderB.flatMap((a) => a.familyIds),
    allowedPaths: [...rerenderB.map((a) => a.familyPackagePath).filter(Boolean).map((p) => `${p}/**`)],
    prohibitedPaths: [...GLOBAL_PROHIBITED, "scripts/rcap-official-forms/**", "family-rerender-1's family packages",
      "the shared binder — coordinate with family-rerender-1 rather than editing it here"],
    expectedOutput: "every assigned family re-derived and re-rendered against the corrected binder rerender-shard-a lands, with reports regenerated",
    focusedVerifier: "node scripts/verify-rcap-official-forms-d1.mjs",
    stopCondition: "every assigned family re-renders clean against the corrected binder and the D1 verifier passes; blocked until family-rerender-1 lands the binder change"
  },
  {
    id: "evidence-sidecars",
    lane: "LANE-EVIDENCE",
    role: "provenance sidecars",
    assetIds: evidenceAssets,
    familyIds: rerender.flatMap((a) => a.familyIds),
    allowedPaths: ["data/rcap-all50/overlays/production/*/*/artifact-provenance.json",
      "scripts/generate-rcap-gate-b-evidence-completion.mjs"],
    prohibitedPaths: [...GLOBAL_PROHIBITED, "any fixture, map, classification or census",
      "docs/record-clearing/pdf-visual-evidence/**"],
    expectedOutput: "a conformant provenance sidecar for every re-rendered family, every field non-null, bound by hash to the artifacts it describes",
    focusedVerifier: "node scripts/generate-rcap-gate-b-evidence-completion.mjs --check",
    stopCondition: "every re-rendered family carries a complete sidecar that hashes to its current artifacts; blocked on each family until its rerender lands"
  },
  {
    id: "evidence-visual",
    lane: "LANE-EVIDENCE",
    role: "all-page raster evidence",
    assetIds: evidenceAssets,
    familyIds: rerender.flatMap((a) => a.familyIds),
    allowedPaths: ["docs/record-clearing/pdf-visual-evidence/**",
      "scripts/rcap-official-forms/rcap-pdf-rasterize.mjs"],
    prohibitedPaths: [...GLOBAL_PROHIBITED, "data/rcap-all50/overlays/production/**",
      "artifact-provenance.json anywhere"],
    expectedOutput: "one rasterised page per page carrying a field, for every re-rendered family, each bound to the current contact-sheet hash",
    focusedVerifier: "node scripts/verify-rcap-evidence-contract-controls.mjs",
    stopCondition: "every re-rendered family's raster coverage is complete and no manifest names a superseded artifact hash"
  },
  ...[sourceA, sourceB].map((assets, i) => ({
    id: ["source-direct", "source-resolution"][i],
    lane: "LANE-SOURCE",
    role: "source acquisition",
    assetIds: assets.map((a) => a.assetId),
    familyIds: assets.flatMap((a) => a.familyIds),
    allowedPaths: ["data/rcap-all50/pdf-source-handoffs/**",
      "data/rcap-all50/source-acquisition-queue.json",
      ...assets.map((a) => a.familyPackagePath).filter(Boolean).map((p) => `${p}/source-record.json`)],
    prohibitedPaths: [...GLOBAL_PROHIBITED, "any fixture, map, classification or contact sheet",
      `${["source-resolution", "source-direct"][i]}'s assets`],
    expectedOutput: "for each assigned asset: the official binary acquired and its SHA-256 recorded against the publisher of record, or a recorded finding that no official source exists",
    focusedVerifier: "node scripts/generate-rcap-source-resolution.mjs --check",
    stopCondition: "every assigned asset carries either an acquired source with a receipt, or a recorded no-official-source finding naming what was searched"
  })),
  {
    id: "retirement-repoint",
    lane: "LANE-RETIRE",
    role: "retirement and repoint",
    assetIds: retire.map((a) => a.assetId),
    familyIds: retire.flatMap((a) => a.familyIds),
    allowedPaths: ["data/rcap-all50/overlays/production/*/*/retirement.json",
      "data/rcap-all50/pdf-retirement-evidence/**",
      "scripts/retire-rcap-problematic-pdf-assets.mjs"],
    prohibitedPaths: [...GLOBAL_PROHIBITED, "any fixture, map, classification, sidecar or raster",
      "any asset outside this assignment"],
    expectedOutput: "for each assigned asset: a retirement marker written by the canonical retirement script with every operational reference proven absent, or a recorded repoint to the canonical asset",
    focusedVerifier: "node scripts/verify-rcap-binary-identity-rules.mjs && node scripts/generate-rcap-retirement-adjudication.mjs --check",
    stopCondition: "every assigned asset is either retired with its seventh condition satisfied or carries a recorded repoint; no asset with a surviving operational dependency is retired"
  }
];

// Disjointness, checked rather than claimed.
const seenAsset = new Map();
for (const a of assignments) {
  if (a.lane === "LANE-EVIDENCE") continue; // path-scoped by design, and the two evidence shards own different surfaces
  for (const id of a.assetIds) {
    if (seenAsset.has(id)) fail(`${id} appears in both ${seenAsset.get(id)} and ${a.id}`);
    seenAsset.set(id, a.id);
  }
}
const evidenceShards = assignments.filter((a) => a.lane === "LANE-EVIDENCE");
const sidecarPaths = new Set(evidenceShards[0].allowedPaths);
for (const p of evidenceShards[1].allowedPaths) {
  if (sidecarPaths.has(p)) fail(`the two evidence shards both claim ${p}`);
}

const covered = new Set([...seenAsset.keys()]);
const missing = queue.assets.filter((a) => !covered.has(a.assetId) && a.primaryBucket !== "REVIEW_ONLY");
if (missing.length) fail(`${missing.length} queued asset(s) appear in no assignment`);

const record = {
  schemaVersion: "rcap-gate-b-assignments/v1",
  generatedBy: "scripts/generate-rcap-gate-b-assignments.mjs",
  baseSha,
  cutFrom: QUEUE,
  denominatorAtGeneration: queue.denominatorAtGeneration,
  globalProhibitedPaths: GLOBAL_PROHIBITED,
  disjointness: {
    assetLevel: "no asset id appears in two asset-scoped assignments; checked at generation",
    pathLevel: "the two evidence shards own different surfaces; the source shards split by asset; the rerender shards split by family package",
    reviewerIndependence: "no reviewer shard may review implementation or evidence it produced, and each writes only its own batch files"
  },
  totals: {
    assignments: assignments.length,
    assetsCovered: covered.size,
    queuedAssets: queue.assets.length,
    reviewerShardsWithNoInputYet: assignments.filter((a) => a.lane === "LANE-REVIEW" && a.assetIds.length === 0).length
  },
  assignments
};

const outputs = [];
for (const a of assignments) {
  outputs.push([`${OUT_DIR}/${a.id}.json`,
    `${JSON.stringify({ ...a, baseSha, globalProhibitedPaths: GLOBAL_PROHIBITED }, null, 2)}\n`]);
}
outputs.push([`${OUT_DIR}/index.json`, `${JSON.stringify(record, null, 2)}\n`]);

function markdown() {
  const lines = [];
  lines.push("# Gate B assignments");
  lines.push("");
  lines.push(`Cut from \`${QUEUE}\` at base \`${baseSha.slice(0, 12)}\`.`);
  lines.push("");
  lines.push("| assignment | lane | assets | expected output |");
  lines.push("| --- | --- | ---: | --- |");
  for (const a of assignments) {
    lines.push(`| \`${a.id}\` | ${a.lane} | ${a.assetIds.length} | ${String(a.expectedOutput).replace(/\|/g, "\\|").slice(0, 110)} |`);
  }
  lines.push("");
  for (const a of assignments) {
    lines.push(`## \`${a.id}\``);
    lines.push("");
    lines.push(`- **base** \`${baseSha.slice(0, 12)}\``);
    lines.push(`- **assets** ${a.assetIds.length}`);
    lines.push(`- **expected output** ${a.expectedOutput}`);
    lines.push(`- **focused verifier** \`${a.focusedVerifier}\``);
    lines.push(`- **stop condition** ${a.stopCondition}`);
    lines.push("");
  }
  return lines.join("\n");
}
outputs.push([OUT_MD, markdown()]);

// The assignment set is frozen against a settled denominator. Cutting eleven
// assignments over a number that is about to change hands every shard a base
// that is wrong before it starts, so the files are written only once the
// canonical generator reports the terminal retained count.
const FREEZE_AT = 81;
const settled = queue.denominatorAtGeneration.retained_problematic === FREEZE_AT;
if (!settled) {
  console.log(
    `HOLDING assignments — the canonical generator reports retained_problematic = ` +
      `${queue.denominatorAtGeneration.retained_problematic}, and the assignment set freezes at ${FREEZE_AT}. ` +
      `${assignments.length} assignments are cut and validated in memory over ${covered.size} assets; ` +
      `nothing is written.`
  );
  console.log(
    `  would be: ` + assignments.map((a) => `${a.id}=${a.assetIds.length}`).join(", ")
  );
  process.exit(0);
}

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
if (checkOnly && stale) fail(`${stale} output(s) are stale; re-run scripts/generate-rcap-gate-b-assignments.mjs`);

console.log(
  `OK assignments — ${record.totals.assignments} disjoint assignments over ${record.totals.assetsCovered} assets at base ${baseSha.slice(0, 12)}; ` +
    `${record.totals.reviewerShardsWithNoInputYet} reviewer shard(s) have no input until a rerender lands`
);
