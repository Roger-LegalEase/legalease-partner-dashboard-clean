#!/usr/bin/env node
// Focused gate on the canonical launch graph.
//
//   node scripts/verify-rcap-launch-graph.mjs
//   node scripts/verify-rcap-launch-graph.mjs --mutations
//
// The graph exists so there is one place the launch counters come from. The
// failures that would make it worse than useless:
//
//   1. a second denominator. The graph must describe exactly the intended-paid
//      set, and every consumed ledger must describe the same set.
//   2. a counter that does not follow from the rows. A headline number nobody
//      can re-derive from the graph is a claim, not a count.
//   3. operationally sellable weakened. The predicate is nine conditions; a
//      route may not be called sellable with one of them unmet, and the graph
//      may not quietly shrink the predicate.
//   4. an artifact called proven when its official form is not held. Composed
//      text rendering identically twice is not the same as a complete packet.
//   5. a registry-gap route dropped. 41 pathways have no registry track; none
//      may disappear from the denominator because of it.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));

const MUTATIONS = process.argv.includes("--mutations");

const graph = read("data/rcap-ledger/launch-graph.json");
const closure = read("data/rcap-ledger/sellable-pathway-closure.json");

const PREDICATE = [
  "publicWitnessReachesThisPathway",
  "authoritativeIntendedPathway",
  "paymentAllowed",
  "packetSpecificationComplete",
  "ownerApprovedLegalDesign",
  "technicalApprovalCurrent",
  "rendererSelected",
  "deterministicArtifactProven",
  "noProblematicPdfHold"
];

// The resolver's availability vocabulary, restated deliberately: the graph's
// declared vocabulary must match this list exactly, so a word added or dropped
// in either place fails here rather than drifting.
const AVAILABILITY = [
  "PACKET_READY",
  "CUSTOM_PLEADING_READY",
  "GUIDANCE_READY",
  "HANDOFF_READY",
  "MAINTENANCE_HOLD",
  "LEGAL_HOLD",
  "UNFINISHED"
];

function failures({ graph, closure }) {
  const out = [];
  const fail = (ok, message) => { if (!ok) out.push(message); };
  const rows = graph.rows ?? [];

  // D — one denominator.
  const intended = (closure.pathways ?? []).filter((pathway) => pathway.category === "paid_packet_intended");
  const expected = intended.map((pathway) => pathway.pathwayKey).sort().join("\n");
  const actual = rows.map((row) => row.pathwayKey).sort().join("\n");
  fail(expected === actual,
    `D-denominator: the graph describes ${rows.length} pathways against the closure ledger's ${intended.length} intended-paid`);
  fail(graph.oneDenominator?.source === "data/rcap-ledger/sellable-pathway-closure.json",
    "D-source: the graph does not name the closure ledger as its denominator");
  fail(graph.oneDenominator?.pathways === rows.length,
    "D-count: the declared denominator size disagrees with the rows");
  fail(new Set(rows.map((row) => row.pathwayKey)).size === rows.length, "D-unique: a pathway appears twice");

  // C — every counter re-derives from the rows.
  const counters = graph.counters ?? {};
  const derived = {
    intendedPaid: rows.length,
    correctPathwayPublicWitnesses: rows.filter((row) => row.publicWitness?.reachesThisPathway === true).length,
    wrongPathwayWitnesses: rows.filter((row) => row.publicWitness?.settled === true && row.publicWitness?.reachesThisPathway !== true).length,
    nonConvergingWitnesses: rows.filter((row) => row.publicWitness?.settled !== true).length,
    exactTrackAndPacketSet: rows.filter((row) => !row.registryGap && row.packetSpecification?.complete).length,
    registryGapWithPathwayPacketSet: rows.filter((row) => row.registryGap && row.pathwayLevelPacketRecord?.present === true).length,
    ownerApprovedLegal: rows.filter((row) => row.ownerApprovedLegalStatus === "approved_by_decision_owner").length,
    factoryV2Resolved: rows.filter((row) => row.renderer?.routeKind === "factory_v2").length,
    paymentAllowed: rows.filter((row) => row.paymentResult?.allowedAtTheEvaluator === true).length,
    deterministicallyRendered: rows.filter((row) => row.operationalGates?.deterministicArtifactProven === true).length,
    operationallySellable: rows.filter((row) => row.operationallySellable === true).length
  };
  for (const [name, value] of Object.entries(derived)) {
    fail(counters[name] === value, `C-${name}: reported ${counters[name]} against ${value} derived from the rows`);
  }

  // P — the operational predicate is all nine, on every row.
  fail(Array.isArray(graph.operationalPredicate) && graph.operationalPredicate.length === PREDICATE.length,
    `P-shape: the declared predicate has ${graph.operationalPredicate?.length} conditions against ${PREDICATE.length}`);
  for (const row of rows) {
    const gates = row.operationalGates ?? {};
    for (const name of PREDICATE) {
      fail(typeof gates[name] === "boolean", `P-gate ${row.pathwayKey}: ${name} is not recorded`);
    }
    const unmet = PREDICATE.filter((name) => gates[name] !== true);
    fail(typeof row.fulfillmentAuthorityAdmitted === "boolean",
      `P-authority ${row.pathwayKey}: fulfillmentAuthorityAdmitted is not recorded as a boolean`);
    const expectedSellable = unmet.length === 0 && row.fulfillmentAuthorityAdmitted === true;
    fail(row.operationallySellable === expectedSellable,
      `P-sellable ${row.pathwayKey}: operationallySellable=${row.operationallySellable} with ${unmet.length} unmet gate(s) and fulfillmentAuthorityAdmitted=${row.fulfillmentAuthorityAdmitted}`);
    fail(JSON.stringify([...(row.unmetOperationalGates ?? [])].sort()) === JSON.stringify([...unmet].sort()),
      `P-unmet ${row.pathwayKey}: the recorded unmet list does not match the gates`);
  }

  // A — an artifact is proven only when its official forms are held too.
  for (const row of rows) {
    if (row.operationalGates?.deterministicArtifactProven !== true) continue;
    fail(row.artifactResult?.deterministic === true && row.artifactResult?.rendered === true,
      `A-render ${row.pathwayKey}: artifact called proven without a deterministic render`);
    const named = row.sourceAssets?.officialFormIdsNamed ?? [];
    fail(named.length === 0 || row.sourceAssets?.allNamedSourcesHeld === true,
      `A-source ${row.pathwayKey}: artifact called proven while ${named.length} named official form(s) are not held here`);
  }
  fail(typeof counters.deterministicallyRenderedComposedText === "number",
    "A-split: the graph does not separate composed-text determinism from a complete packet");
  fail(counters.deterministicallyRenderedComposedText >= counters.deterministicallyRendered,
    "A-order: more complete packets than composed texts, which cannot be");

  // R — registry-gap routes are preserved rather than dropped.
  const registryGap = rows.filter((row) => row.registryGap === true);
  fail(registryGap.length > 0, "R-present: no registry-gap route survives in the graph");
  for (const row of registryGap) {
    fail((row.registryTracks ?? []).length === 0, `R-track ${row.pathwayKey}: marked registry-gap while carrying a track`);
    fail(row.pathwayLevelPacketRecord !== undefined,
      `R-record ${row.pathwayKey}: registry-gap route carries no pathway-level packet record field`);
  }

  // S — the graph decides nothing.
  fail(graph.createsApproval === false, "S-approval: the graph must not claim to create an approval");
  fail(graph.changesRuntime === false, "S-runtime: the graph must not claim to change runtime");

  // V — availability: every row carries a word from the vocabulary, the totals
  // and per-state counts re-derive from the rows, and a ready word cannot be
  // claimed past the commercial authority.
  fail(JSON.stringify(graph.availability?.vocabulary ?? []) === JSON.stringify(AVAILABILITY),
    "V-vocabulary: the graph's availability vocabulary does not match the resolver's");
  const totals = Object.fromEntries(AVAILABILITY.map((word) => [word, 0]));
  const byState = {};
  for (const row of rows) {
    if (!AVAILABILITY.includes(row.availability)) {
      fail(false, `V-word ${row.pathwayKey}: availability ${JSON.stringify(row.availability)} is not in the vocabulary`);
      continue;
    }
    totals[row.availability] += 1;
    if (!byState[row.jurisdiction]) byState[row.jurisdiction] = Object.fromEntries(AVAILABILITY.map((word) => [word, 0]));
    byState[row.jurisdiction][row.availability] += 1;
    // A ready word is a claim of Grade-A proof, which is strictly stronger than
    // the operational sellability the authority reports on the same row. Zero
    // routes are ready today, and a row that becomes ready without also being
    // operationally sellable is a forged word, not a launch.
    if ((row.availability === "PACKET_READY" || row.availability === "CUSTOM_PLEADING_READY")
      && row.operationallySellable !== true) {
      fail(false, `V-ready ${row.pathwayKey}: reports ${row.availability} while the Grade-A authority does not admit it`);
    }
  }
  for (const word of AVAILABILITY) {
    fail(graph.availability?.totals?.[word] === totals[word],
      `V-total ${word}: reported ${graph.availability?.totals?.[word]} against ${totals[word]} derived from the rows`);
  }
  const reportedStates = Object.keys(graph.availability?.byState ?? {}).sort().join(",");
  fail(reportedStates === Object.keys(byState).sort().join(","),
    "V-states: the per-state availability breakdown does not cover exactly the states the rows cover");
  for (const [state, counts] of Object.entries(byState)) {
    for (const word of AVAILABILITY) {
      fail(graph.availability?.byState?.[state]?.[word] === counts[word],
        `V-state ${state} ${word}: reported ${graph.availability?.byState?.[state]?.[word]} against ${counts[word]} derived from the rows`);
    }
  }

  return out;
}

const documents = { graph, closure };

if (MUTATIONS) {
  const base = failures(documents).length;
  const clone = () => JSON.parse(JSON.stringify(documents));
  const mutations = [
    ["a pathway dropped from the denominator", (d) => { d.graph.rows.pop(); }],
    ["a pathway invented", (d) => {
      const row = JSON.parse(JSON.stringify(d.graph.rows[0]));
      row.pathwayKey = "ZZ:invented";
      d.graph.rows.push(row);
    }],
    ["a counter inflated past the rows", (d) => { d.graph.counters.operationallySellable += 1; }],
    ["a route called sellable with an unmet gate", (d) => {
      const row = d.graph.rows.find((candidate) => candidate.unmetOperationalGates.length > 0);
      row.operationallySellable = true;
    }],
    ["a route called sellable without fulfillment authority", (d) => {
      const row = d.graph.rows[0];
      for (const gate of PREDICATE) row.operationalGates[gate] = true;
      row.unmetOperationalGates = [];
      row.allOperationalGatesMet = true;
      row.fulfillmentAuthorityAdmitted = false;
      row.operationallySellable = true;
    }],
    ["the predicate quietly shortened", (d) => { d.graph.operationalPredicate = d.graph.operationalPredicate.slice(0, 4); }],
    ["a gate removed from a row", (d) => { delete d.graph.rows[0].operationalGates.noProblematicPdfHold; }],
    ["an unmet list that hides a gate", (d) => {
      const row = d.graph.rows.find((candidate) => candidate.unmetOperationalGates.length > 1);
      row.unmetOperationalGates = row.unmetOperationalGates.slice(0, 1);
    }],
    ["an artifact called proven with an unheld official form", (d) => {
      const row = d.graph.rows.find((candidate) => (candidate.sourceAssets.officialFormIdsNamed ?? []).length > 0
        && candidate.sourceAssets.allNamedSourcesHeld !== true);
      row.operationalGates.deterministicArtifactProven = true;
      row.unmetOperationalGates = row.unmetOperationalGates.filter((gate) => gate !== "deterministicArtifactProven");
      d.graph.counters.deterministicallyRendered += 1;
    }],
    ["composed-text determinism reported as a complete packet", (d) => {
      d.graph.counters.deterministicallyRendered = d.graph.counters.deterministicallyRenderedComposedText;
    }],
    ["the composed-text split removed", (d) => { delete d.graph.counters.deterministicallyRenderedComposedText; }],
    ["registry-gap routes dropped", (d) => { d.graph.rows = d.graph.rows.filter((row) => !row.registryGap); }],
    ["a registry-gap route given a track it does not have", (d) => {
      const row = d.graph.rows.find((candidate) => candidate.registryGap);
      row.registryTracks = ["invented-track"];
    }],
    ["the graph claiming it creates an approval", (d) => { d.graph.createsApproval = true; }],
    ["a row's availability forged to PACKET_READY", (d) => {
      const row = d.graph.rows.find((candidate) => candidate.operationallySellable !== true);
      row.availability = "PACKET_READY";
    }],
    ["an availability total inflated past the rows", (d) => { d.graph.availability.totals.PACKET_READY += 1; }],
    ["a row's availability replaced with a word outside the vocabulary", (d) => { d.graph.rows[0].availability = "READY_ENOUGH"; }],
    ["a state's availability breakdown dropped", (d) => {
      delete d.graph.availability.byState[d.graph.rows[0].jurisdiction];
    }],
    ["a state's hold count understated", (d) => {
      const held = d.graph.rows.find((candidate) => candidate.availability === "MAINTENANCE_HOLD");
      d.graph.availability.byState[held.jurisdiction].MAINTENANCE_HOLD -= 1;
      d.graph.availability.byState[held.jurisdiction].UNFINISHED += 1;
    }],
    ["the availability vocabulary quietly shortened", (d) => {
      d.graph.availability.vocabulary = d.graph.availability.vocabulary.filter((word) => word !== "LEGAL_HOLD");
    }]
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
    console.error(`\nverify-rcap-launch-graph --mutations FAILED — ${undetected} undetected.`);
    process.exit(1);
  }
  console.log(`\nEvery way of growing a second denominator, inflating a counter or weakening the sellable predicate is detected (${mutations.length}/${mutations.length}).`);
  process.exit(0);
}

const problems = failures(documents);
const c = graph.counters ?? {};
console.log(
  `launch graph: ${c.intendedPaid} intended-paid; ${c.correctPathwayPublicWitnesses} correct witnesses, ` +
  `${c.wrongPathwayWitnesses} wrong, ${c.nonConvergingWitnesses} non-converging; ${c.factoryV2Resolved} factory_v2; ` +
  `${c.ownerApprovedLegal} owner-approved; ${c.paymentAllowed} payment-allowed; ${c.deterministicallyRendered} complete artifacts; ` +
  `${c.operationallySellable} operationally sellable.`
);
if (problems.length > 0) {
  console.error(`\nverify-rcap-launch-graph FAILED — ${problems.length} problem(s):\n`);
  for (const problem of problems.slice(0, 40)) console.error(` - ${problem}`);
  if (problems.length > 40) console.error(` … and ${problems.length - 40} more`);
  process.exit(1);
}
console.log("One denominator, every counter re-derived from the rows, all nine gates on every route, and no artifact called proven without its official form.");
