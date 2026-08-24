#!/usr/bin/env node
// Reduce the crawl's full capture set to the set worth committing.
//
//   node scripts/expungement-ai/flow-audit/curate-evidence.mjs
//   node scripts/expungement-ai/flow-audit/curate-evidence.mjs --check
//
// The crawl writes one capture per flow per viewport. Committing all of them
// would put tens of megabytes of near-identical PNGs in the history for no
// reviewer benefit. This keeps:
//
//   * both shared surfaces (the state picker and the unregistered-jurisdiction
//     dead end);
//   * every capture from the reference jurisdiction, Mississippi;
//   * one desktop question capture and one desktop terminal capture per distinct
//     rendered result code;
//   * every mobile capture, since the crawl already takes one per unique screen
//     template rather than one per flow;
//   * every capture attached to a finding.
//
// Everything dropped stays in the crawl report by hash, so the index still
// accounts for the whole run and a reader can tell a pruned capture from one
// that never existed.

import fs from "node:fs";
import path from "node:path";
import { ROOT_DIR, readJson, exists, stableJson, writeArtifact } from "./lib/engine.mjs";

const CHECK = process.argv.includes("--check");
const CRAWL = "data/expungement-ai/flow-audit/evidence/crawl-report.json";
const REFERENCE_JURISDICTION = "MS";

if (!exists(CRAWL)) {
  console.error(`${CRAWL} is absent; run the crawl first.`);
  process.exit(1);
}

const crawl = readJson(CRAWL);
const resultCodeByFlow = new Map();
for (const flow of crawl.flows) {
  if (flow.terminal?.observedResultCode) resultCodeByFlow.set(`${flow.flowId}:${flow.viewport}`, flow.terminal.observedResultCode);
}

const keep = new Set();
const reasons = new Map();
function retain(shot, reason) {
  keep.add(shot.sha256);
  if (!reasons.has(shot.sha256)) reasons.set(shot.sha256, []);
  if (!reasons.get(shot.sha256).includes(reason)) reasons.get(shot.sha256).push(reason);
}

const seenTerminalTemplates = new Set();
const seenQuestionTemplates = new Set();

for (const shot of crawl.screenshots) {
  if (shot.flowId.startsWith("EXPAI-SURFACE-")) { retain(shot, "shared surface"); continue; }
  if (shot.jurisdiction === REFERENCE_JURISDICTION) { retain(shot, "reference jurisdiction (Mississippi)"); continue; }
  if (shot.findingIds.length > 0) { retain(shot, `proves ${shot.findingIds.join(", ")}`); continue; }
  if (shot.viewport.startsWith("mobile")) { retain(shot, "mobile screen template"); continue; }

  const resultCode = resultCodeByFlow.get(`${shot.flowId}:${shot.viewport}`) ?? "unknown_result";
  if (shot.label === "terminal") {
    if (!seenTerminalTemplates.has(resultCode)) {
      seenTerminalTemplates.add(resultCode);
      retain(shot, `first desktop terminal rendering result code ${resultCode}`);
    }
    continue;
  }
  if (!seenQuestionTemplates.has(shot.label)) {
    seenQuestionTemplates.add(shot.label);
    retain(shot, `first desktop ${shot.label} capture`);
  }
}

const retained = crawl.screenshots.filter((shot) => keep.has(shot.sha256));
const pruned = crawl.screenshots.filter((shot) => !keep.has(shot.sha256));

if (CHECK) {
  const missing = retained.filter((shot) => !exists(shot.file));
  const stillPresent = pruned.filter((shot) => exists(shot.file));
  if (missing.length > 0 || stillPresent.length > 0) {
    console.error(`evidence set is not curated: ${missing.length} retained capture(s) absent, ${stillPresent.length} pruned capture(s) still on disk.`);
    process.exit(1);
  }
  console.log(`evidence curated: ${retained.length} retained, ${pruned.length} pruned.`);
  process.exit(0);
}

let freedBytes = 0;
for (const shot of pruned) {
  const absolute = path.join(ROOT_DIR, shot.file);
  if (fs.existsSync(absolute)) {
    freedBytes += fs.statSync(absolute).size;
    fs.unlinkSync(absolute);
  }
}

const curation = {
  schemaVersion: "expai-evidence-curation/v1",
  generatedBy: "scripts/expungement-ai/flow-audit/curate-evidence.mjs",
  policy: {
    referenceJurisdiction: REFERENCE_JURISDICTION,
    rules: [
      "both shared surfaces are kept",
      "every capture from the reference jurisdiction is kept",
      "one desktop question capture per label and one desktop terminal capture per distinct rendered result code are kept",
      "every mobile capture is kept, because the crawl already takes one per unique screen template",
      "every capture attached to a finding is kept",
      "an image whose bytes duplicate a kept image was already suppressed at capture time and is recorded as an alias"
    ]
  },
  totals: {
    captured: crawl.screenshots.length,
    retained: retained.length,
    pruned: pruned.length,
    prunedBytes: freedBytes
  },
  retained: retained.map((shot) => ({
    file: shot.file,
    sha256: shot.sha256,
    flowId: shot.flowId,
    jurisdiction: shot.jurisdiction,
    viewport: shot.viewport,
    label: shot.label,
    reasons: reasons.get(shot.sha256) ?? []
  })),
  pruned: pruned.map((shot) => ({
    sha256: shot.sha256,
    flowId: shot.flowId,
    jurisdiction: shot.jurisdiction,
    viewport: shot.viewport,
    label: shot.label,
    note: "captured during the run, pruned before commit; the hash is retained so the run is fully accounted for"
  }))
};

const written = writeArtifact("data/expungement-ai/flow-audit/evidence/curation.json", stableJson(curation));
console.log(`wrote ${written.path}`);
console.log(`  captured ${crawl.screenshots.length}, retained ${retained.length}, pruned ${pruned.length} (${Math.round(freedBytes / 1024)} KiB freed)`);
