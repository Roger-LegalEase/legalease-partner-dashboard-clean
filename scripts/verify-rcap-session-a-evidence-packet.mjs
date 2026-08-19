#!/usr/bin/env node
// Focused verifier for the Session A evidence packet.
//
//   node scripts/verify-rcap-session-a-evidence-packet.mjs
//   node scripts/verify-rcap-session-a-evidence-packet.mjs --mutations
//
// It checks the four things that would make this packet dangerous rather than
// useful, and nothing else:
//
//   1. It consumes Session A's graph rather than competing with it. Same pathway
//      set, same dispositions, no pathway invented and none dropped.
//   2. Importing the packet-family bridge changed reasons only. No pathway
//      gained adoption coverage from a bridge import.
//   3. Counsel exceptions stay conservative. A pathway is an exception only
//      where its jurisdiction has no bound family at all, or where Session A
//      itself recorded legal_action_required.
//   4. The public witness is deterministic and matches the committed answer sets.

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (p) => JSON.parse(fs.readFileSync(path.join(rootDir, p), "utf8"));
const git = (args) => execFileSync("git", args, { cwd: rootDir, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });

const MUTATIONS = process.argv.includes("--mutations");

const packet = readJson("data/rcap-ledger/session-a-evidence-packet.json");
const witness = readJson("data/rcap-ledger/public-witness-answer-sets.json");

function sessionAGraph() {
  const ref = packet.canonicalGraph;
  if (ref.source === "working_tree") return readJson(ref.path);
  return JSON.parse(git(["show", `${ref.ref}:${ref.path}`]));
}
const graph = sessionAGraph();

function failures({ packet, graph, witness }) {
  const out = [];
  const fail = (ok, message) => { if (!ok) out.push(message); };

  // 1. consumes, does not compete
  fail(packet.createsApproval === false, "the packet must not claim to create an approval");
  fail(packet.changesRuntime === false, "the packet must not claim to change runtime");
  fail(packet.canonicalGraphOwner === "Session A", "the canonical graph owner must be Session A");
  const graphKeys = graph.pathways.map((p) => p.pathwayKey).sort();
  const packetKeys = packet.records.map((r) => r.pathwayKey).sort();
  fail(packetKeys.length === graphKeys.length && packetKeys.every((k, i) => k === graphKeys[i]),
    `the packet's pathway set must be exactly Session A's graph: ${packetKeys.length} records against ${graphKeys.length} graph pathways`);
  const graphByKey = new Map(graph.pathways.map((p) => [p.pathwayKey, p]));
  for (const record of packet.records) {
    const source = graphByKey.get(record.pathwayKey);
    if (!source) continue;
    fail(record.sessionAGraph.disposition === source.disposition,
      `${record.pathwayKey}: disposition ${record.sessionAGraph.disposition} does not match Session A's ${source.disposition}; dispositions are consumed, never recomputed`);
    const a = [...(record.sessionAGraph.registryTrackIds ?? [])].sort().join(",");
    const b = [...(source.registryTrackIds ?? [])].sort().join(",");
    fail(a === b, `${record.pathwayKey}: registry track list differs from Session A's graph`);
  }

  // 2. the bridge import changed reasons only
  for (const record of packet.records) {
    if (!record.bridgeImportEffect.changed) continue;
    fail(record.bridgeImportEffect.sessionADisposition === "family_bridge_missing_no_family",
      `${record.pathwayKey}: a bridge import may only affect a family_bridge_missing_no_family pathway`);
    fail(record.packetFamilyBridge.packetSets.length > 0,
      `${record.pathwayKey}: recorded as bridge-resolved with no packet set to show for it`);
    fail(record.counselException.isGenuineNewException === false || record.counselException.reason !== "existing_counsel_record_exists_reach_is_a_determination",
      `${record.pathwayKey}: a bridge import must not turn into a coverage answer`);
  }
  fail(!/covered|adopt(ed|ion) (now )?(applies|reaches)/i.test(packet.packetFamilyBridgeReconciliation.effect.replace(/never|not\b/gi, "")),
    "the bridge reconciliation must not describe the import as establishing coverage");

  // 3. counsel exceptions stay conservative
  const boundJurisdictions = new Set(
    packet.records.filter((r) => r.adoptionJoin.jurisdictionIsBound).map((r) => r.jurisdiction)
  );
  for (const record of packet.records) {
    const ex = record.counselException;
    if (ex.isGenuineNewException) {
      const allowed = ex.reason === "session_a_recorded_legal_action_required"
        || (ex.reason === "no_bound_family_in_this_jurisdiction" && !boundJurisdictions.has(record.jurisdiction));
      fail(allowed, `${record.pathwayKey}: called a genuine new counsel exception for reason ${ex.reason}, which is not one of the two conservative grounds`);
    } else {
      fail(record.adoptionJoin.jurisdictionIsBound || record.sessionAGraph.disposition === "legal_action_required",
        `${record.pathwayKey}: not called an exception although its jurisdiction carries no bound family`);
    }
  }
  fail(packet.genuineNewCounselExceptions.length === packet.records.filter((r) => r.counselException.isGenuineNewException).length,
    "the exception list must match the records that carry one");

  // 4. every pathway is classified; nothing is left unknown
  const VALID = new Set(["exact_track_and_packet_set", "registry_gap_no_track", "registry_gap_no_packet_set"]);
  for (const record of packet.records) {
    fail(VALID.has(record.registryClassification.kind),
      `${record.pathwayKey}: registry classification ${record.registryClassification.kind} is not one of the three`);
    fail(typeof record.registryClassification.statement === "string" && record.registryClassification.statement.length > 0,
      `${record.pathwayKey}: registry classification carries no statement`);
  }

  // 5. the witness is deterministic and is the committed one
  fail(witness.determinism?.randomness === "none", "the witness answer sets must declare no randomness");
  const witnessByKey = new Map(witness.witnesses.map((w) => [w.pathwayKey, w]));
  for (const record of packet.records) {
    const w = witnessByKey.get(record.pathwayKey);
    fail(Boolean(w), `${record.pathwayKey}: no committed public witness answer set`);
    if (!w || !record.publicWitness) continue;
    fail(record.publicWitness.landedOnThisPathway === w.landedOnThisPathway,
      `${record.pathwayKey}: the packet's witness summary disagrees with the committed answer set`);
    fail(JSON.stringify(record.publicWitness.terminalEvaluation) === JSON.stringify(w.terminalEvaluation),
      `${record.pathwayKey}: the packet's terminal evaluation disagrees with the committed answer set`);
  }

  return out;
}

const documents = { packet, graph, witness };

if (MUTATIONS) {
  const clone = () => JSON.parse(JSON.stringify(documents));
  const base = failures(documents).length;
  const mutations = [
    ["a disposition recomputed instead of consumed", (d) => { d.packet.records[0].sessionAGraph.disposition = "covered_design_but_output_review_pending"; }],
    ["a pathway invented that is not in Session A's graph", (d) => { d.packet.records.push(JSON.parse(JSON.stringify(d.packet.records[0]))); d.packet.records.at(-1).pathwayKey = "ZZ:invented"; }],
    ["a pathway dropped from the graph", (d) => { d.packet.records.pop(); }],
    ["a bridge import turned into a coverage answer", (d) => {
      const r = d.packet.records.find((x) => x.bridgeImportEffect.changed);
      r.counselException = { isGenuineNewException: false, reason: "existing_counsel_record_exists_reach_is_a_determination", statement: "x" };
      r.adoptionJoin.jurisdictionIsBound = false;
    }],
    ["an exception invented on a bound jurisdiction", (d) => {
      const r = d.packet.records.find((x) => x.adoptionJoin.jurisdictionIsBound);
      r.counselException = { isGenuineNewException: true, reason: "renderer_unavailable", statement: "x" };
    }],
    ["an unbound jurisdiction quietly dropped from the exception list", (d) => {
      const r = d.packet.records.find((x) => x.counselException.isGenuineNewException && x.counselException.reason === "no_bound_family_in_this_jurisdiction");
      r.counselException = { isGenuineNewException: false, reason: "existing_counsel_record_exists_reach_is_a_determination", statement: "x" };
    }],
    ["a pathway left unclassified", (d) => { d.packet.records[0].registryClassification = { kind: "unknown", statement: "" }; }],
    ["the witness declared random", (d) => { d.witness.determinism.randomness = "seeded"; }],
    ["a witness result quietly rewritten in the packet", (d) => { d.packet.records[0].publicWitness.landedOnThisPathway = !d.packet.records[0].publicWitness.landedOnThisPathway; }],
    ["the packet claiming it creates an approval", (d) => { d.packet.createsApproval = true; }]
  ];
  let undetected = 0;
  for (const [label, mutate] of mutations) {
    const mutated = clone();
    mutate(mutated);
    const caught = failures(mutated).length > base;
    console.log(`${caught ? "caught  " : "MISSED  "} ${label}`);
    if (!caught) undetected += 1;
  }
  if (undetected > 0) {
    console.error(`\nverify-rcap-session-a-evidence-packet --mutations FAILED — ${undetected} undetected.`);
    process.exit(1);
  }
  console.log(`\nEvery mutation that would make this packet compete with Session A's graph is detected (${mutations.length}/${mutations.length}).`);
  process.exit(0);
}

const problems = failures(documents);
console.log(
  `session A evidence packet: ${packet.records.length} pathway(s) consumed from Session A's graph ` +
  `(${packet.canonicalGraph.source}${packet.canonicalGraph.ref ? ` @ ${packet.canonicalGraph.ref.slice(0, 8)}` : ""}); ` +
  `bridge import resolved ${packet.totals.bridgeImportResolved}; ` +
  `${packet.totals.genuineNewCounselExceptions} genuine new counsel exception(s); ` +
  `${packet.totals.publicWitness.settled} deterministic witness(es) settled.`
);
if (problems.length > 0) {
  console.error(`\nverify-rcap-session-a-evidence-packet FAILED — ${problems.length} problem(s):\n`);
  for (const p of problems.slice(0, 40)) console.error(` - ${p}`);
  if (problems.length > 40) console.error(` … and ${problems.length - 40} more`);
  process.exit(1);
}
console.log("The packet consumes Session A's graph, imports the bridge without inventing coverage, keeps counsel exceptions conservative, and its witness matches the committed answer sets.");
