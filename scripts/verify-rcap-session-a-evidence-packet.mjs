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
//   3. Legal status comes from the owner's recorded decision and nothing else.
//      An approved pathway is one whose packet family the decision names, or one
//      whose every track carries an exact legal-design packet set the decision
//      applies. Nothing may be approved on a weaker basis, no counsel queue may
//      reappear, and a genuinely new substantive legal choice must escalate.
//   4. The public witness is deterministic and matches the committed answer sets.
//   5. Every input resolved from the working tree. A release artifact that
//      silently read a stale commit would report an unreproducible denominator.

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

const graph = readJson(packet.canonicalGraph.path);

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
    fail(record.ownerApprovedLegal.basis !== "owner_approved_packet_family",
      `${record.pathwayKey}: a bridge import must not turn into a family-level adoption answer`);
  }
  fail(!/covered|adopt(ed|ion) (now )?(applies|reaches)/i.test(packet.packetFamilyBridgeReconciliation.effect.replace(/never|not\b/gi, "")),
    "the bridge reconciliation must not describe the import as establishing coverage");

  // 3. legal status comes from the owner's decision and nothing else
  const APPROVED = "approved_by_decision_owner";
  const PENDING = "owner_approval_pending";
  const APPROVED_BASES = new Set([
    "owner_approved_packet_family",
    "owner_approved_existing_legal_design_packet_set",
    "owner_approved_exception_annex"
  ]);
  const decisionRecorded = packet.ownerLegalDecision?.approved === true;
  const graphByKeyForLegal = new Map(graph.pathways.map((p) => [p.pathwayKey, p]));
  for (const record of packet.records) {
    const legal = record.ownerApprovedLegal;
    fail(legal.status === APPROVED || legal.status === PENDING,
      `${record.pathwayKey}: legal status ${legal.status} is neither ${APPROVED} nor ${PENDING}`);
    if (legal.status === APPROVED) {
      fail(decisionRecorded, `${record.pathwayKey}: approved with no owner decision recorded in the packet`);
      fail(APPROVED_BASES.has(legal.basis),
        `${record.pathwayKey}: approved on basis ${legal.basis}, which is not one the owner's decision supports`);
      if (legal.basis === "owner_approved_packet_family") {
        const source = graphByKeyForLegal.get(record.pathwayKey);
        fail(source?.legalStatus === APPROVED && (source?.ownerApprovedFamilies ?? []).length > 0,
          `${record.pathwayKey}: claims family-level owner approval that the canonical graph does not record against a named family`);
      }
      if (legal.basis === "owner_approved_exception_annex") {
        const source = graphByKeyForLegal.get(record.pathwayKey);
        fail(source?.legalStatus === APPROVED,
          `${record.pathwayKey}: claims annex approval that the canonical graph does not record`);
        const sets = record.packetFamilyBridge.packetSets ?? [];
        const tracks = record.sessionAGraph.registryTrackIds ?? [];
        fail(!(sets.length > 0 && sets.length === tracks.length),
          `${record.pathwayKey}: every track carries a packet set, so the annex is the weaker basis and must not be the one claimed`);
      }
      if (legal.basis === "owner_approved_existing_legal_design_packet_set") {
        const sets = record.packetFamilyBridge.packetSets ?? [];
        const tracks = record.sessionAGraph.registryTrackIds ?? [];
        fail(sets.length > 0 && sets.length === tracks.length,
          `${record.pathwayKey}: approved on an exact packet set, but ${sets.length} set(s) cover ${tracks.length} track(s)`);
      }
      fail(legal.escalationRequired !== true,
        `${record.pathwayKey}: approved and escalating at the same time`);
    }
  }
  // No counsel queue may reappear under another name.
  fail(!("genuineNewCounselExceptions" in packet),
    "the packet must not publish a counsel-exception queue");
  const escalationKeys = new Set((packet.escalationsToTheDecisionOwner ?? []).map((e) => e.pathwayKey));
  const recordsEscalating = packet.records.filter((r) => r.ownerApprovedLegal.escalationRequired).map((r) => r.pathwayKey);
  fail(escalationKeys.size === recordsEscalating.length && recordsEscalating.every((k) => escalationKeys.has(k)),
    "the escalation list must match the records that carry one");
  fail(packet.totals.ownerApprovedLegal === packet.records.filter((r) => r.ownerApprovedLegal.status === APPROVED).length,
    "the owner-approved total must match the records");

  // 5. no stale input crept in
  for (const [name, input] of Object.entries(packet.inputs ?? {})) {
    fail(input.source === "working_tree", `input ${name} resolved from ${input.source} rather than the working tree`);
    fail(input.ref == null, `input ${name} pins a commit ref; a release artifact reads HEAD only`);
    fail(typeof input.sha256 === "string" && input.sha256.length === 64, `input ${name} carries no sha256`);
  }

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
    ["a bridge import turned into a family-level adoption answer", (d) => {
      const r = d.packet.records.find((x) => x.bridgeImportEffect.changed);
      r.ownerApprovedLegal = { status: "approved_by_decision_owner", basis: "owner_approved_packet_family", escalationRequired: false, statement: "x" };
    }],
    ["a pathway approved on a basis the owner's decision does not support", (d) => {
      const r = d.packet.records.find((x) => x.ownerApprovedLegal.status !== "approved_by_decision_owner");
      r.ownerApprovedLegal = { status: "approved_by_decision_owner", basis: "renderer_available", escalationRequired: false, statement: "x" };
    }],
    ["a packet-set approval claimed without a packet set for every track", (d) => {
      const r = d.packet.records.find((x) => x.ownerApprovedLegal.basis === "owner_approved_existing_legal_design_packet_set");
      r.packetFamilyBridge.packetSets = [];
    }],
    ["an approval standing while the owner decision is absent", (d) => { d.packet.ownerLegalDecision = { approved: false, reason: "x" }; }],
    ["a counsel-exception queue reintroduced", (d) => { d.packet.genuineNewCounselExceptions = [{ pathwayKey: "ZZ:x" }]; }],
    ["an escalation hidden from the escalation list", (d) => {
      d.packet.records[0].ownerApprovedLegal.escalationRequired = true;
    }],
    ["the owner-approved total inflated", (d) => { d.packet.totals.ownerApprovedLegal += 1; }],
    ["an input silently read from a stale commit", (d) => {
      d.packet.inputs.sessionAPathwayFamilyGraph.source = "session_a_commit";
      d.packet.inputs.sessionAPathwayFamilyGraph.ref = "4072b6189c0cde20ab43673a9f0569d2b8d20752";
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
  `${packet.totals.ownerApprovedLegal} owner-approved legal; ` +
  `${packet.totals.escalationsToTheDecisionOwner} escalation(s); ` +
  `${packet.totals.publicWitness.settled} deterministic witness(es) settled.`
);
if (problems.length > 0) {
  console.error(`\nverify-rcap-session-a-evidence-packet FAILED — ${problems.length} problem(s):\n`);
  for (const p of problems.slice(0, 40)) console.error(` - ${p}`);
  if (problems.length > 40) console.error(` … and ${problems.length - 40} more`);
  process.exit(1);
}
console.log("The packet consumes Session A's graph, imports the bridge without inventing coverage, derives every legal status from the owner's recorded decision, reads every input from the working tree, and its witness matches the committed answer sets.");
