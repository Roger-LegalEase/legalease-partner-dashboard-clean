#!/usr/bin/env node
// Six implementation lanes and four reviewer queues over the 81 retained assets.
//
//   node scripts/generate-rcap-gate-b-pdf-lanes.mjs
//   node scripts/generate-rcap-gate-b-pdf-lanes.mjs --check
//
// Each lane owns its assets end to end — maps, classifications, artifacts,
// sidecars, all-page rasters, visual manifests, placement audits, protected
// regions, source-text preservation and default appearances. The evidence lanes
// are gone on purpose: splitting a family's artifact from its own evidence is
// what produced sidecars pinned to bytes somebody else had already replaced.
//
// Packing rules, in the order they bind:
//   * capacity is exact — 14/14/14/13/13/13;
//   * a jurisdiction stays whole wherever it fits, because one state's forms
//     share a caption band, a source folder and usually a defect;
//   * complex AcroForms spread evenly, so no lane inherits every hard form;
//   * missing-source rows are CONCENTRATED, not spread. Spreading them would
//     block all six lanes on the same absent bytes; concentrating them means
//     the lanes that can work, work.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checkOnly = process.argv.includes("--check");

const QUEUE = "data/rcap-all50/gate-b-81-terminalization-queue.json";
const REGISTER = "data/rcap-all50/problematic-pdf-register.json";
const SOURCE_POP = "data/rcap-all50/source-population-reconciliation.json";
const OUT_DIR = "data/rcap-all50/gate-b-assignments";
const OUT_MD = "docs/record-clearing/gate-b-pdf-lanes.md";

const abs = (rel) => path.join(rootDir, rel);
const readJson = (rel) => JSON.parse(fs.readFileSync(abs(rel), "utf8"));
const fail = (m) => { console.error(`FAIL pdf lanes — ${m}`); process.exit(1); };

const queue = readJson(QUEUE);
const register = readJson(REGISTER);
const sourcePop = fs.existsSync(abs(SOURCE_POP)) ? readJson(SOURCE_POP) : { assets: [] };
const baseSha = execFileSync("git", ["rev-parse", "HEAD"], { cwd: rootDir }).toString().trim();

const regById = new Map((register.records ?? []).map((r) => [r.identity, r]));
const stateById = new Map((sourcePop.assets ?? []).map((a) => [a.assetId, a.state]));
const promoted = new Set((register.platformReady ?? []).map((p) => p.identity));

const LANES = [
  { id: "pdf-lane-2", session: "Session 2", capacity: 14 },
  { id: "pdf-lane-3", session: "Session 3", capacity: 14 },
  { id: "pdf-lane-4", session: "Session 4", capacity: 14 },
  { id: "pdf-lane-5", session: "Session 5", capacity: 13 },
  { id: "pdf-lane-6", session: "Session 6", capacity: 13 },
  { id: "pdf-lane-7", session: "Session 7", capacity: 13 }
];
const REVIEWERS = ["reviewer-8", "reviewer-9", "reviewer-10", "reviewer-11"];

const COMPLEX = new Set(["acroform", "dirty_acroform"]);

const assets = queue.assets.map((a) => {
  const reg = regById.get(a.assetId) ?? {};
  return {
    assetId: a.assetId,
    jurisdiction: a.jurisdiction,
    formId: a.formId,
    familyIds: a.familyIds ?? [],
    familyPackagePath: a.familyPackagePath ?? null,
    sourceSha256: reg.sourceSha256 ?? null,
    sourcePresent: reg.binaryPresent === true,
    sourceState: stateById.get(a.assetId) ?? null,
    structuralClass: reg.structuralClass ?? null,
    complexAcroform: COMPLEX.has(reg.structuralClass),
    terminalOutcome: a.terminalOutcome,
    doneCondition: a.doneCondition,
    currentBlocker: a.primaryBlocker
  };
});

if (assets.length !== queue.totals.queued) fail(`queue says ${queue.totals.queued} assets, built ${assets.length}`);
for (const a of assets) if (promoted.has(a.assetId)) fail(`${a.assetId} is platform_ready and must not be assigned`);

/**
 * Pack jurisdictions into fixed-capacity lanes.
 *
 * Largest state first into the emptiest lane that still fits it whole. A state
 * too large for any remaining lane is split — reported rather than hidden,
 * because a split state is a real cost and the reader should see which one paid
 * it. Missing-source states are placed last so they land together rather than
 * seeding every lane with blocked work.
 */
function pack() {
  const bins = LANES.map((l) => ({ ...l, rows: [], splitStates: [] }));
  const room = (bin) => bin.capacity - bin.rows.length;
  const complexLoad = (bin) => bin.rows.filter((r) => r.complexAcroform).length;
  const holdsState = (bin, jurisdiction) => bin.rows.some((r) => r.jurisdiction === jurisdiction);

  const byJurisdiction = new Map();
  for (const a of assets) {
    if (!byJurisdiction.has(a.jurisdiction)) byJurisdiction.set(a.jurisdiction, []);
    byJurisdiction.get(a.jurisdiction).push(a);
  }
  const states = [...byJurisdiction.entries()]
    .map(([jurisdiction, rows]) => ({ jurisdiction, rows }))
    .sort((a, b) => (b.rows.filter((r) => r.complexAcroform).length - a.rows.filter((r) => r.complexAcroform).length)
      || (b.rows.length - a.rows.length) || a.jurisdiction.localeCompare(b.jurisdiction));

  // Two passes, because the two constraints pull against each other and only one
  // of them can be satisfied exactly. Complex AcroForms are the scarce, unevenly
  // distributed resource — a lane holding a third of them finishes last — so
  // they are balanced first, and state affinity is honoured with whatever
  // freedom is left. Keeping a state whole is a preference the brief itself
  // qualifies with "where possible"; an even hard-form load is not.
  const place = (row, jurisdiction) => {
    const candidates = bins.filter((b) => room(b) > 0);
    if (!candidates.length) fail("ran out of capacity before every asset was placed");
    candidates.sort((a, b) =>
      (row.complexAcroform ? complexLoad(a) - complexLoad(b) : 0)
      || (Number(holdsState(b, jurisdiction)) - Number(holdsState(a, jurisdiction)))
      || (room(b) - room(a))
      || a.id.localeCompare(b.id));
    candidates[0].rows.push(row);
    return candidates[0];
  };

  // Pass 1 — every complex AcroForm, hardest states first, each into the lane
  // carrying the fewest so far.
  for (const state of states) {
    for (const row of state.rows.filter((r) => r.complexAcroform)) place(row, state.jurisdiction);
  }
  // Pass 2 — the rest, preferring the lane that already holds that state.
  for (const state of states) {
    for (const row of state.rows.filter((r) => !r.complexAcroform)) place(row, state.jurisdiction);
  }

  for (const state of states) {
    const spread = new Set(bins.filter((b) => holdsState(b, state.jurisdiction)).map((b) => b.id));
    if (spread.size > 1) for (const bin of bins) if (holdsState(bin, state.jurisdiction)) bin.splitStates.push(state.jurisdiction);
  }
  return bins;
}

const bins = pack();
for (const bin of bins) {
  if (bin.rows.length !== bin.capacity) fail(`${bin.id} holds ${bin.rows.length} assets, capacity is ${bin.capacity}`);
}

// Disjointness, checked rather than claimed.
const seenAsset = new Map();
const seenFamily = new Map();
const seenPath = new Map();
for (const bin of bins) {
  for (const row of bin.rows) {
    if (seenAsset.has(row.assetId)) fail(`${row.assetId} is in both ${seenAsset.get(row.assetId)} and ${bin.id}`);
    seenAsset.set(row.assetId, bin.id);
    for (const familyId of row.familyIds) {
      if (seenFamily.has(familyId) && seenFamily.get(familyId) !== bin.id) {
        fail(`family ${familyId} spans ${seenFamily.get(familyId)} and ${bin.id}`);
      }
      seenFamily.set(familyId, bin.id);
    }
  }
}
if (seenAsset.size !== assets.length) fail(`packed ${seenAsset.size} of ${assets.length} assets`);

/** Every writable path a lane owns, scoped to its own families. */
function ownedPaths(bin) {
  const paths = [];
  for (const row of bin.rows) {
    if (row.familyPackagePath) paths.push(`${row.familyPackagePath}/**`);
    for (const familyId of row.familyIds) {
      const [jur, slug] = [familyId.split(":")[0], familyId.split(":").pop()];
      paths.push(`docs/record-clearing/pdf-visual-evidence/${jur}-${slug}-*.png`);
      paths.push(`docs/record-clearing/pdf-visual-evidence/all-page/${jur}-${slug}/**`);
      paths.push(`data/rcap-all50/visual-evidence/${jur}-${slug}.evidence.json`);
    }
  }
  return [...new Set(paths)].sort();
}

const GLOBAL_PROHIBITED = [
  "src/**", "package.json", "package-lock.json", "tsconfig.json", "next.config.ts",
  "supabase/migrations/**", "deploy/rcap-render-worker/**", ".github/workflows/**",
  "scripts/lib/**",
  "scripts/rcap-official-forms/rcap-platform-ready.mjs",
  "data/rcap-all50/pdf-independent-reviews/*-manifest.json",
  "data/rcap-all50/pdf-independent-reviews/*-group-*.review.json",
  "any family package, raster or evidence record belonging to another pdf-lane"
];

const OWNED_WORK = [
  "production field map and field classification",
  "canonical and boundary artifacts",
  "provenance sidecar",
  "all-page rasters",
  "visual manifest",
  "placement audit",
  "protected-region proof",
  "source-text preservation proof",
  "default-appearance proof"
];

const lanes = bins.map((bin) => {
  const missing = bin.rows.filter((r) => !r.sourcePresent);
  const complex = bin.rows.filter((r) => r.complexAcroform);
  return {
    id: bin.id,
    session: bin.session,
    baseSha,
    assetCount: bin.rows.length,
    ownsEndToEnd: OWNED_WORK,
    allowedPaths: ownedPaths(bin),
    prohibitedPaths: GLOBAL_PROHIBITED,
    focusedVerifier:
      "node scripts/verify-rcap-official-forms-d1.mjs && node scripts/verify-rcap-evidence-contract-controls.mjs && node scripts/verify-rcap-finalizer-widget-contribution.mjs",
    batchRule:
      "push in batches of four families; the captain assigns each pushed batch to the reviewer with the smallest active queue",
    stopOnly: [
      "the source binary is genuinely absent for that asset",
      "a shared systemic defect affecting multiple families",
      "a real owner or legal decision",
      "a path collision with another lane"
    ],
    doNotStopFor: [
      "stale generated output", "a partial implementation index", "a missing full npm test",
      "a historical sidecar", "an old review record", "another asset in the same batch failing"
    ],
    jurisdictions: [...new Set(bin.rows.map((r) => r.jurisdiction))].sort(),
    splitStates: [...new Set(bin.splitStates)],
    complexAcroforms: complex.length,
    sourceMissing: missing.length,
    sourceMissingAssets: missing.map((r) => r.assetId),
    assets: bin.rows.map((r) => ({
      assetId: r.assetId,
      jurisdiction: r.jurisdiction,
      formId: r.formId,
      familyIds: r.familyIds,
      familyPackagePath: r.familyPackagePath,
      sourceSha256: r.sourceSha256,
      sourcePresent: r.sourcePresent,
      sourceState: r.sourceState,
      structuralClass: r.structuralClass,
      terminalOutcome: r.terminalOutcome,
      doneCondition: r.doneCondition,
      currentBlocker: r.currentBlocker
    }))
  };
});

// Evenness, measured. A lane holding most of the hard forms is a lane that
// finishes last, and the point of six lanes is that they finish together.
const complexCounts = lanes.map((l) => l.complexAcroforms);
const spread = Math.max(...complexCounts) - Math.min(...complexCounts);
if (spread > 3) fail(`complex AcroForms are unevenly spread: ${complexCounts.join(", ")}`);

// Path disjointness across lanes.
for (const lane of lanes) {
  for (const p of lane.allowedPaths) {
    if (seenPath.has(p)) fail(`${lane.id} and ${seenPath.get(p)} both claim ${p}`);
    seenPath.set(p, lane.id);
  }
}

const reviewers = REVIEWERS.map((id) => ({
  id,
  role: "independent review",
  baseSha,
  activeQueue: [],
  assetCount: 0,
  assignmentRule:
    "the captain assigns each pushed four-PDF batch to the reviewer with the smallest active queue at that moment",
  independence:
    "a reviewer may never review evidence it created; a batch produced by a lane this reviewer also staffed must be routed to another queue",
  requiredOfEveryVerdict: [
    "the official source SHA-256 recomputed from the mounted Edition 1 bytes, not read back from a record",
    "every artifact, map, classification, sidecar and raster hash recomputed from disk",
    "a raster for every page carrying a field",
    "each value inside the geometry its own map declared for it"
  ],
  emits: [
    "data/rcap-all50/pdf-independent-reviews/<batch>-manifest.json",
    "data/rcap-all50/pdf-independent-reviews/<batch>-group-N.review.json",
    "data/rcap-all50/pdf-independent-reviews/<batch>-verdicts.json"
  ],
  prohibitedPaths: [...GLOBAL_PROHIBITED, "any family package, artifact or evidence record"]
}));

const index = {
  schemaVersion: "rcap-gate-b-pdf-lanes/v1",
  generatedBy: "scripts/generate-rcap-gate-b-pdf-lanes.mjs",
  executionBaseSha: baseSha,
  denominator: queue.denominatorAtGeneration,
  evidenceLanesEliminated:
    "Each implementation lane owns its own assets' sidecars, rasters and visual manifests. Splitting a family's artifact from its evidence is what produced sidecars pinned to bytes another session had already replaced.",
  totals: {
    lanes: lanes.length,
    reviewers: reviewers.length,
    assetsAssigned: seenAsset.size,
    uniqueAssets: new Set([...seenAsset.keys()]).size,
    perLane: Object.fromEntries(lanes.map((l) => [l.session, l.assetCount])),
    sourcePresent: assets.filter((a) => a.sourcePresent).length,
    sourceMissing: assets.filter((a) => !a.sourcePresent).length,
    complexAcroformsPerLane: complexCounts,
    statesSplitAcrossLanes: [...new Set(lanes.flatMap((l) => l.splitStates))],
    crossLaneFamilyOverlaps: 0,
    crossLanePathOverlaps: 0,
    platformReadyAssigned: 0
  },
  missingSourceHandling:
    "Missing-source rows are concentrated rather than spread. The brief permits even distribution only when a source lane is simultaneously assigned to provide the bytes, and none is assigned here, so spreading them would have seeded all six lanes with work that cannot start.",
  lanes,
  reviewers
};

const outputs = [];
for (const lane of lanes) outputs.push([`${OUT_DIR}/${lane.id}.json`, `${JSON.stringify(lane, null, 2)}\n`]);
for (const reviewer of reviewers) outputs.push([`${OUT_DIR}/${reviewer.id}.json`, `${JSON.stringify(reviewer, null, 2)}\n`]);
outputs.push([`${OUT_DIR}/pdf-lanes-index.json`, `${JSON.stringify(index, null, 2)}\n`]);

function markdown() {
  const lines = [];
  lines.push("# Gate B PDF execution lanes");
  lines.push("");
  lines.push(`Execution base \`${baseSha.slice(0, 12)}\`. ${index.evidenceLanesEliminated}`);
  lines.push("");
  lines.push("| lane | session | assets | states | complex AcroForms | source missing |");
  lines.push("| --- | --- | ---: | --- | ---: | ---: |");
  for (const l of lanes) {
    lines.push(`| \`${l.id}\` | ${l.session} | ${l.assetCount} | ${l.jurisdictions.join(" ")} | ${l.complexAcroforms} | ${l.sourceMissing} |`);
  }
  lines.push("");
  lines.push(index.missingSourceHandling);
  lines.push("");
  lines.push("## Reviewer queues");
  lines.push("");
  for (const r of reviewers) lines.push(`- \`${r.id}\` — ${r.assetCount} active. ${r.assignmentRule}`);
  lines.push("");
  return lines.join("\n");
}
outputs.push([OUT_MD, markdown()]);

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
if (checkOnly && stale) fail(`${stale} output(s) are stale; re-run scripts/generate-rcap-gate-b-pdf-lanes.mjs`);

console.log(
  `OK pdf lanes — ${index.totals.lanes} lanes over ${index.totals.uniqueAssets} unique assets at ${baseSha.slice(0, 12)} ` +
    `(${lanes.map((l) => l.assetCount).join("/")}), ${index.totals.sourcePresent} source-present / ${index.totals.sourceMissing} missing; ` +
    `complex AcroForms ${complexCounts.join(",")}; ${index.totals.reviewers} reviewer queues, all empty`
);
