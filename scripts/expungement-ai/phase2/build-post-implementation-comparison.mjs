#!/usr/bin/env node
/**
 * The implementation verification sweep, expressed as one comparison artifact.
 *
 * The audit's own deterministic generators are re-run at this head and their
 * output snapshotted under data/expungement-ai/phase2/post-implementation/. The
 * Phase 1 artifacts stay exactly as imported: they are the baseline, and
 * overwriting them would destroy the thing the implementation is measured
 * against. This reads both and records every total that moved.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
process.chdir(root);
const readJson = (relative) => JSON.parse(fs.readFileSync(relative, "utf8"));
const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();

const ARTIFACTS = ["flow-manifest", "question-inventory", "branch-coverage", "ui-reachability"];

/** Lists become their length: a count that moved is the signal, not its members. */
function summarise(value) {
  if (Array.isArray(value)) return value.length;
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, summarise(entry)]));
  }
  return value;
}

function diffTotals(before, after, prefix = "") {
  const rows = [];
  if (before && typeof before === "object" && !Array.isArray(before) && after && typeof after === "object" && !Array.isArray(after)) {
    for (const key of [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()) {
      rows.push(...diffTotals(before[key], after[key], `${prefix}/${key}`));
    }
    return rows;
  }
  if (JSON.stringify(before) !== JSON.stringify(after)) rows.push({ total: prefix, before: before ?? null, after: after ?? null });
  return rows;
}

const artifacts = ARTIFACTS.map((name) => {
  const before = readJson(`data/expungement-ai/flow-audit/${name}.json`);
  const after = readJson(`data/expungement-ai/phase2/post-implementation/${name}.json`);
  return {
    artifact: name,
    baselineSha: before.baseSha ?? null,
    movedTotals: diffTotals(summarise(before.totals ?? {}), summarise(after.totals ?? {}))
  };
});

const reachBefore = readJson("data/expungement-ai/flow-audit/ui-reachability.json").totals;
const reachAfter = readJson("data/expungement-ai/phase2/post-implementation/ui-reachability.json").totals;
const notBefore = new Set(reachBefore.jurisdictionsNotReachingPacketReady ?? []);
const notAfter = new Set(reachAfter.jurisdictionsNotReachingPacketReady ?? []);

const manifestAfter = readJson("data/expungement-ai/phase2/post-implementation/flow-manifest.json");
const staleFixtures = (manifestAfter.flows ?? [])
  .filter((flow) => flow?.fixture?.reproducesTerminal === false)
  .map((flow) => ({
    jurisdiction: flow.jurisdiction,
    flowId: flow.flowId,
    manifestTerminal: flow.terminalOutcome?.resultCode ?? null,
    fixtureReplayTerminal: flow.fixture?.replayResultCode ?? null
  }))
  .sort((left, right) => left.jurisdiction.localeCompare(right.jurisdiction) || left.flowId.localeCompare(right.flowId));

const artifact = {
  schemaVersion: "expai-phase2-post-implementation-comparison/v1",
  generatedBy: "scripts/expungement-ai/phase2/build-post-implementation-comparison.mjs",
  head,
  evaluatorToday: process.env.RCAP_EVALUATOR_TODAY ?? "2026-07-01",
  note: "Phase 1 artifacts are the baseline and are not modified. The post-implementation snapshot is produced by re-running the same generators at this head.",
  uiReachability: {
    reachingPacketReady: { before: reachBefore.jurisdictionsReachingPacketReady, after: reachAfter.jurisdictionsReachingPacketReady },
    reachingPayment: { before: reachBefore.jurisdictionsReachingPayment, after: reachAfter.jurisdictionsReachingPayment },
    recovered: [...notBefore].filter((code) => !notAfter.has(code)).sort(),
    notFoundAtThisHead: [...notAfter].filter((code) => !notBefore.has(code)).sort(),
    stillNotFound: [...notAfter].filter((code) => notBefore.has(code)).sort(),
    packetReadyButNotPayment: { before: reachBefore.jurisdictionsReachingPacketReadyButNotPayment, after: reachAfter.jurisdictionsReachingPacketReadyButNotPayment }
  },
  staleWitnessFixtures: { count: staleFixtures.length, rows: staleFixtures },
  artifacts
};

fs.mkdirSync("data/expungement-ai/phase2", { recursive: true });
fs.writeFileSync("data/expungement-ai/phase2/post-implementation-comparison.json", `${JSON.stringify(artifact, null, 2)}\n`);
console.log("wrote data/expungement-ai/phase2/post-implementation-comparison.json");
console.log(JSON.stringify({
  recovered: artifact.uiReachability.recovered,
  notFoundAtThisHead: artifact.uiReachability.notFoundAtThisHead,
  staleWitnessFixtures: staleFixtures.length
}, null, 2));
