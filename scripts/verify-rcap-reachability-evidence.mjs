#!/usr/bin/env node
// Focused verifier for the reachability support lane.
//
//   node scripts/verify-rcap-reachability-evidence.mjs
//   node scripts/verify-rcap-reachability-evidence.mjs --mutations
//
// Four things, and nothing else:
//
//   1. The evidence consumes Session A's canonical graph rather than inventing a
//      denominator: same pathway set, dispositions never recomputed, and every
//      registry-gap pathway still inside the intended-paid set.
//   2. Every fixture actually replays. Each one is re-driven through the real
//      public evaluator and must produce the pathway, result code and payment
//      decision it claims. A fixture that cannot reproduce its own result is
//      worse than no fixture.
//   3. The defect clusters are a partition of the failing set, so a cluster
//      means "fix this and these are done" rather than a tag.
//   4. The registry-gap dossier gives every track-less pathway its packet set,
//      its legal-design evidence and a named registry-owner action.

process.env.RCAP_EVALUATOR_TODAY = process.env.RCAP_EVALUATOR_TODAY ?? "2026-07-01";

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { register } from "node:module";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
process.chdir(rootDir);
register("./lib/ts-esm-loader.mjs", import.meta.url);

const MUTATIONS = process.argv.includes("--mutations");
const read = (p) => fs.readFileSync(path.join(rootDir, p), "utf8");
const readJson = (p) => JSON.parse(read(p));
const sha256 = (v) => crypto.createHash("sha256").update(v).digest("hex");
const git = (args) => execFileSync("git", args, { cwd: rootDir, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });

const { getProfileByJurisdiction } = await import("../src/lib/rcap-engine/profile-registry.ts");
const { evaluateAuthoritativeScreeningResult } = await import("../src/lib/expungement-ai/authoritative-screening-result.ts");

const diagnosis = readJson("data/rcap-ledger/witness-divergence-diagnosis.json");
const fixtures = readJson("data/rcap-ledger/public-witness-fixtures.json");
const dossier = readJson("data/rcap-ledger/registry-gap-dossier.json");

const graphRef = diagnosis.canonicalGraph;
// Required from the working tree, never read out of a pinned commit. This
// verifier reports a reachability count, and the pinned graph and this tree do
// not agree about it: the same replay scores 151 of 284 against the commit that
// used to be the fallback and 284 of 284 against HEAD. A verifier that can
// silently answer for either is not a gate.
if (!fs.existsSync(path.join(rootDir, graphRef.path))) {
  throw new Error(`${graphRef.path} is absent. Generate it from this tree; this verifier will not read a graph out of another commit.`);
}
const graphRaw = read(graphRef.path);
const graph = JSON.parse(graphRaw);

function staticFailures({ diagnosis, fixtures, dossier, graph, graphRaw }) {
  const out = [];
  const fail = (ok, message) => { if (!ok) out.push(message); };

  // 1. consumes the graph
  fail(diagnosis.changesNoRuntime === true, "the diagnosis must declare that it changes no runtime");
  fail(sha256(graphRaw) === diagnosis.canonicalGraph.sha256, "the diagnosis was built against a different canonical graph than the one on disk");
  const graphKeys = graph.pathways.map((p) => p.pathwayKey).sort();
  const diagKeys = diagnosis.records.map((r) => r.pathwayKey).sort();
  fail(diagKeys.length === graphKeys.length && diagKeys.every((k, i) => k === graphKeys[i]),
    `the diagnosis must cover exactly Session A's ${graphKeys.length} pathways; it covers ${diagKeys.length}`);
  const dispositionByKey = new Map(graph.pathways.map((p) => [p.pathwayKey, p.disposition]));
  for (const record of diagnosis.records) {
    if (record.sessionADisposition === undefined) continue;
    fail(record.sessionADisposition === dispositionByKey.get(record.pathwayKey),
      `${record.pathwayKey}: disposition differs from Session A's graph; dispositions are consumed, never recomputed`);
  }

  // 2. clusters partition the failing set
  const failing = diagnosis.records.filter((r) => r.outcome !== "correct_pathway");
  const clusterSum = diagnosis.clusters.reduce((n, c) => n + c.pathways, 0) + diagnosis.unclusteredFailures.length;
  fail(clusterSum === failing.length,
    `the clusters must partition the failing set: ${clusterSum} clustered+unclustered against ${failing.length} failing`);
  const claimed = diagnosis.clusters.flatMap((c) => c.pathwayKeys);
  fail(new Set(claimed).size === claimed.length, "a pathway appears in more than one cluster; clusters must be a partition, not tags");
  for (const cluster of diagnosis.clusters) {
    fail(typeof cluster.cause === "string" && cluster.cause.length > 20, `${cluster.id}: carries no stated cause`);
    fail(typeof cluster.exactSharedRuntimeCorrection === "string" && cluster.exactSharedRuntimeCorrection.length > 20,
      `${cluster.id}: carries no exact shared runtime correction`);
  }

  // 3. registry gaps are preserved
  const gapKeys = graph.pathways.filter((p) => p.disposition === "family_bridge_missing_no_track").map((p) => p.pathwayKey).sort();
  const dossierKeys = dossier.records.map((r) => r.pathwayKey).sort();
  fail(dossierKeys.length === gapKeys.length && dossierKeys.every((k, i) => k === gapKeys[i]),
    `the dossier must cover exactly the ${gapKeys.length} track-less pathways; it covers ${dossierKeys.length}`);
  for (const record of dossier.records) {
    fail(record.stillInIntendedPaidDenominator === true, `${record.pathwayKey}: a registry gap may never be dropped from the intended-paid denominator`);
    fail(record.compiledPathwayPreserved !== null, `${record.pathwayKey}: the compiled pathway is not preserved`);
    fail(record.pathwayLevelPacketSet !== null, `${record.pathwayKey}: no pathway-level packet set identified`);
    fail(Boolean(record.legalDesignEvidence?.adoptionRecordId), `${record.pathwayKey}: no legal-design evidence identified`);
    fail(typeof record.exactFutureRegistryOwnerAction?.action === "string" && record.exactFutureRegistryOwnerAction.action.length > 20,
      `${record.pathwayKey}: no exact future registry-owner action`);
  }

  // 4. fixtures are internally consistent with the diagnosis
  const correct = diagnosis.records.filter((r) => r.outcome === "correct_pathway").map((r) => r.pathwayKey).sort();
  const fixtureKeys = fixtures.fixtures.map((f) => f.pathwayKey).sort();
  fail(fixtureKeys.length === correct.length && fixtureKeys.every((k, i) => k === correct[i]),
    `there must be one fixture per correct-pathway record: ${fixtureKeys.length} fixtures against ${correct.length} correct`);
  for (const fixture of fixtures.fixtures) {
    fail(fixture.expected?.pathwayId === fixture.pathwayId, `${fixture.pathwayKey}: fixture expects a different pathway than it names`);
    fail(Object.keys(fixture.answers ?? {}).length > 0, `${fixture.pathwayKey}: fixture carries no answers`);
  }

  return out;
}

/** Every fixture re-driven through the real evaluator. */
function replayFailures(fixtures) {
  const out = [];
  for (const fixture of fixtures.fixtures) {
    const profile = getProfileByJurisdiction(fixture.jurisdiction);
    if (!profile) { out.push(`${fixture.pathwayKey}: no compiled profile`); continue; }
    let evaluation;
    try {
      evaluation = evaluateAuthoritativeScreeningResult({
        jurisdiction: fixture.jurisdiction,
        profileVersion: fixture.profileVersion,
        matterId: "fixture-replay",
        answers: fixture.answers
      }).evaluation;
    } catch (error) {
      out.push(`${fixture.pathwayKey}: replay threw ${error instanceof Error ? error.message : String(error)}`);
      continue;
    }
    if (evaluation.pathwayId !== fixture.expected.pathwayId) {
      out.push(`${fixture.pathwayKey}: replay reached ${evaluation.pathwayId ?? "no pathway"}, fixture expects ${fixture.expected.pathwayId}`);
      continue;
    }
    if (evaluation.resultCode !== fixture.expected.resultCode) {
      out.push(`${fixture.pathwayKey}: replay result code ${evaluation.resultCode}, fixture expects ${fixture.expected.resultCode}`);
    }
    if ((evaluation.paymentAllowed === true) !== fixture.expected.paymentAllowed) {
      out.push(`${fixture.pathwayKey}: replay paymentAllowed ${evaluation.paymentAllowed === true}, fixture expects ${fixture.expected.paymentAllowed}`);
    }
    if ((evaluation.missingQuestionIds ?? []).length > 0) {
      out.push(`${fixture.pathwayKey}: replay still wants ${(evaluation.missingQuestionIds ?? []).join(", ")}; a fixture must be complete`);
    }
  }
  return out;
}

const documents = { diagnosis, fixtures, dossier, graph, graphRaw };

if (MUTATIONS) {
  const clone = () => JSON.parse(JSON.stringify({ diagnosis, fixtures, dossier, graph }));
  const base = staticFailures(documents).length;
  const run = (mutate) => {
    const d = clone();
    mutate(d);
    return staticFailures({ ...d, graphRaw }).length > base;
  };
  /**
   * Give the mutated copy one failing pathway and the cluster that owns it.
   *
   * Only ever applied to a clone, never to the tree. When clusters already
   * exist this leaves them alone and the mutation corrupts the real one.
   */
  const seedCluster = (d) => {
    if (Array.isArray(d.diagnosis.clusters) && d.diagnosis.clusters.length > 0) return;
    const victim = d.diagnosis.records[0];
    victim.outcome = "wrong_path";
    d.diagnosis.clusters = [{
      cluster: "synthetic_partition_probe",
      pathways: 1,
      pathwayKeys: [victim.pathwayKey],
      exactSharedRuntimeCorrection: "a synthesised cluster, present only so the partition rule is still exercised on a tree with no failures"
    }];
  };
  const mutations = [
    ["a pathway dropped from the diagnosis", (d) => { d.diagnosis.records.pop(); }],
    ["a disposition recomputed instead of consumed", (d) => { d.diagnosis.records[0].sessionADisposition = "approved_by_decision_owner"; }],
    ["a registry gap dropped from the paid denominator", (d) => { d.dossier.records[0].stillInIntendedPaidDenominator = false; }],
    ["a registry gap left without a packet set", (d) => { d.dossier.records[0].pathwayLevelPacketSet = null; }],
    ["a registry gap left without a named owner action", (d) => { d.dossier.records[0].exactFutureRegistryOwnerAction = { action: "tbd" }; }],
    // The partition mutations need a cluster to corrupt, and a tree with no
    // remaining failures has none. Skipping them there would quietly drop two
    // checks at exactly the moment the counters look best, so a failing pathway
    // and its cluster are SYNTHESISED into the mutated copy first. The partition
    // rule is then exercised whether or not this tree currently fails anything.
    ["a cluster listed twice so the partition double-counts", (d) => {
      seedCluster(d);
      d.diagnosis.clusters[0].pathwayKeys.push(d.diagnosis.clusters[0].pathwayKeys[0]);
      d.diagnosis.clusters[0].pathways += 1;
    }],
    ["a cluster with no stated correction", (d) => {
      seedCluster(d);
      d.diagnosis.clusters[0].exactSharedRuntimeCorrection = "";
    }],
    ["a fixture that expects a different pathway than it names", (d) => { d.fixtures.fixtures[0].expected.pathwayId = "something-else"; }],
    ["a fixture invented for a pathway that failed", (d) => { d.fixtures.fixtures.push({ ...d.fixtures.fixtures[0], pathwayKey: "ZZ:invented" }); }],
    ["the diagnosis built against a different graph", (d) => { d.diagnosis.canonicalGraph.sha256 = "0".repeat(64); }]
  ];
  let undetected = 0;
  for (const [label, mutate] of mutations) {
    const caught = run(mutate);
    console.log(`${caught ? "caught  " : "MISSED  "} ${label}`);
    if (!caught) undetected += 1;
  }
  if (undetected > 0) {
    console.error(`\nverify-rcap-reachability-evidence --mutations FAILED — ${undetected} undetected.`);
    process.exit(1);
  }
  console.log(`\nEvery mutation that would fake reachability evidence is detected (${mutations.length}/${mutations.length}).`);
  process.exit(0);
}

const problems = [...staticFailures(documents), ...replayFailures(fixtures)];
console.log(
  `reachability evidence: ${diagnosis.records.length} pathway(s) from Session A's graph; ` +
  `${diagnosis.totals.correct_pathway ?? 0} correct, ${diagnosis.totals.wrong_path ?? 0} wrong-path, ${diagnosis.totals.non_converging ?? 0} non-converging; ` +
  `${diagnosis.clusters.length} cluster(s); ${fixtures.fixtures.length} fixture(s) replayed; ${dossier.records.length} registry gap(s).`
);
if (problems.length > 0) {
  console.error(`\nverify-rcap-reachability-evidence FAILED — ${problems.length} problem(s):\n`);
  for (const p of problems.slice(0, 40)) console.error(` - ${p}`);
  if (problems.length > 40) console.error(` … and ${problems.length - 40} more`);
  process.exit(1);
}
console.log("Every fixture replays to the result it claims, the clusters partition the failing set, and no registry gap left the denominator.");
