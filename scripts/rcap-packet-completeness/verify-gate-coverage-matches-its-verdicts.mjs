#!/usr/bin/env node
/*
 * THE QUEUE MAY NOT ASSERT SOMETHING THE GATE'S OWN VERDICT REFUTES.
 *
 * RASTER_QUEUE.json describes, per family, which declared fixtures the visual
 * gate did not render. That description used to be derived from an assumption
 * about the gate -- "it renders the canonical documents and nothing else" --
 * rather than from the gate. The assumption went stale when
 * scripts/rcap-raster-batch.mjs started building its targets from the row's
 * whole `documents` array, every role included.
 *
 * The two records then contradicted each other on live data. The clean case is
 * az_certificate_second_chance-set: run 34364359375 wrote a verdict naming
 * documentsRendered [canonical.pdf, boundary.pdf] and measured ten pages, five
 * to each, with no problems -- while the row derived from that same run said
 * the gate did not render boundary.pdf. Thirty-two families carried that
 * contradiction, and it is the kind that survives review because each record is
 * internally coherent and nobody opens both.
 *
 * This refuses whenever a row names a document as unrendered that a verdict
 * from that family says it rendered. It reads only committed evidence, renders
 * nothing, and decides nothing about whether a packet is correct.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = process.env.RCAP_GATE_COVERAGE_ROOT
  ?? path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const QUEUE = path.join(ROOT, "data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json");
const RUNS = path.join(ROOT, "data/rcap-grade-a/packet-factory-24h/raster-runs");

export function verdictsOnDisk(runsDir) {
  const byFamily = new Map();
  if (!fs.existsSync(runsDir)) return byFamily;
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(p); continue; }
      if (!entry.name.endsWith(".verdict.json")) continue;
      let v;
      try { v = JSON.parse(fs.readFileSync(p, "utf8")); } catch { continue; }
      if (!v?.familyId) continue;
      const rendered = Array.isArray(v.documentsRendered)
        ? v.documentsRendered.map((d) => d?.document).filter(Boolean)
        : [];
      /* A verdict with no documentsRendered predates the field. It proves
       * nothing either way and must not be read as proof that nothing was
       * rendered -- that would be the same overclaim in a new place. */
      if (!Array.isArray(v.documentsRendered)) continue;
      const list = byFamily.get(v.familyId) ?? [];
      list.push({ path: path.relative(ROOT, p), runId: v.workflowRunId ?? null, rendered });
      byFamily.set(v.familyId, list);
    }
  };
  walk(runsDir);
  return byFamily;
}

export function contradictions(queue, byFamily) {
  const out = [];
  for (const row of queue.rows ?? []) {
    const verdicts = byFamily.get(row.familyId);
    if (!verdicts?.length) continue;
    const claimedUnrendered = new Set([
      ...(row.coverage?.notRenderedByThisGate ?? []),
      ...(row.rasterReceipt?.whatThisGateDidNotRender ?? []),
    ]);
    if (claimedUnrendered.size === 0) continue;
    for (const v of verdicts) {
      /* Exact document names only. A substring test would flag Hawaii, whose
       * row truthfully names ten route fixtures it never queues while a verdict
       * rendered the two documents it does. */
      const refuted = v.rendered.filter((name) => claimedUnrendered.has(name));
      if (refuted.length) {
        out.push({ familyId: row.familyId, verdictPath: v.path, runId: v.runId, refuted });
      }
    }
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const queue = JSON.parse(fs.readFileSync(QUEUE, "utf8"));
  const byFamily = verdictsOnDisk(RUNS);
  const found = contradictions(queue, byFamily);
  const rowsChecked = (queue.rows ?? []).filter((r) => byFamily.has(r.familyId)).length;
  if (found.length === 0) {
    console.log(`gate coverage agrees with its own verdicts: ${rowsChecked} row(s) have an on-disk verdict naming what it rendered, and none of them names a document its row calls unrendered.`);
    process.exit(0);
  }
  console.error(`${found.length} row(s) claim the gate did not render a document the gate's own verdict says it rendered:`);
  for (const f of found) {
    console.error(`  ${f.familyId}: run ${f.runId} rendered ${f.refuted.join(", ")} (${f.verdictPath})`);
  }
  console.error("The verdict is the gate's record of what it did. A row that contradicts it is describing a gate that no longer exists.");
  process.exit(1);
}
