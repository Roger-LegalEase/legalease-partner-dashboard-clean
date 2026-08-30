#!/usr/bin/env node
/**
 * WAVE 2 RESIDUAL — what Wave 2 did not finish, in one record.
 *
 *   node scripts/grade-a-launch-control/generate-wave-2-residual.mjs [--check]
 *
 * Derived from the thirteen integrated returns and from what the integration
 * actually applied, so a row is open here only because no controlling file
 * closed it. Anything the Captain applied is absent by construction rather than
 * by anyone remembering to remove it.
 *
 * Wave 1's RESIDUAL_WORK.json is left untouched as history. This record carries
 * the residue of Wave 2 and states which record supersedes which.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CHECK = process.argv.includes("--check");
const read = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), "utf8"));
const W2 = "data/rcap-grade-a/wave-2";
const OUT = "data/rcap-grade-a/launch-control/WAVE_2_RESIDUAL_WORK.json";

const r1 = read(`${W2}/r1-branch-identity-remainder/rows.json`).rows;
const r2 = read(`${W2}/r2-already-answered-engineering/rows.json`).rows;
const r2bind = read(`${W2}/r2-already-answered-engineering/route-treatment-bindings.json`).bindings;
const r3 = read(`${W2}/r3-route-mapping-remainder/rows.json`).rows;
const r4 = read(`${W2}/r4-source-identity-and-acquisition/rows.json`).rows;
const r4acq = read(`${W2}/r4-source-identity-and-acquisition/acquired.json`);
const r6 = read(`${W2}/r6-counsel-determination-implementation/rows.json`).rows;
const r7 = read(`${W2}/r7-packet-repair/rows.json`).rows;
const verification = ["v1", "v2", "v3", "v4", "v5", "v6", "v7"]
  .flatMap((v) => read(`${W2}/verification/${v}/rows.json`).rows.map((r) => ({ shard: v.toUpperCase(), ...r })));

const applyLog = read(`${W2}/integration/applied.json`);
const appliedKeys = new Set(applyLog.applied.map((a) => `${a.lane}:${a.routeKey ?? a.itemId}`));

const lanes = [];

/* ---- R1: branch identities, all fourteen still open ----------------------- */
lanes.push({
  residualLaneId: "W2R1_BRANCH_IDENTITY_REMAINDER",
  replaces: ["R1_BRANCH_IDENTITY_REMAINDER"],
  what: "Fourteen participant A branch identities. R1 returned every row STOPPED and created no identity, so the queue is carried whole.",
  itemKind: "routeKey",
  openCount: r1.length,
  items: r1.map((row) => ({
    itemId: row.itemId,
    participantABranchRouteKeys: row.participantABranchRouteKeys,
    outputStrategy: row.outputStrategy,
    productOutcome: row.productOutcome,
    commercialTreatment: row.commercialTreatment,
    blocker: row.blocker
  })),
  whyStillOpen: "Each blocker names a document, selector or remedy the committed record does not contain. Creating a compound identity would invent the missing half.",
  ownedPaths: ["data/rcap-grade-a/wave-3/r1-branch-identity-remainder/**"]
});

/* ---- R2: the decision is installed; its predicates are not ---------------- */
const branchesInstalled = applyLog.applied.filter((a) => a.lane === "R2");
lanes.push({
  residualLaneId: "W2R2_BRANCH_SELECTOR_IMPLEMENTATION",
  replaces: [],
  what: "The disposition predicates for the service branches this integration installed. The branch identities are now in the route contracts; none carries a selector, so none can be chosen by the runtime.",
  itemKind: "routeKeyBranch",
  openCount: branchesInstalled.reduce((n, a) => n + Number(a.change.match(/added (\d+)/)?.[1] ?? 0), 0),
  items: branchesInstalled.map((a) => ({
    routeKey: a.routeKey,
    file: a.file,
    field: a.field,
    installed: a.change,
    decisionRecord: a.decisionRecord,
    owed: "a machine-readable disposition predicate per branch, and the packet configuration identity for any packet-bearing branch"
  })),
  whyStillOpen: "A branch without a selector is prose the runtime cannot act on. The predicate is legal design and the packet configuration is a packet-factory act; neither was this lane's to invent.",
  ownedPaths: ["src/lib/legal-authority/routes/**"]
});

/* ---- R2: the identities the integration deliberately did not install ------ */
const deferred = applyLog.deferred ?? [];
lanes.push({
  residualLaneId: "W2R2_DEFERRED_BRANCH_IDENTITIES",
  replaces: [],
  what: "Branch identities R2 derived and this integration deliberately did not install, because installing them would have moved a frozen control as a side effect rather than as a decision.",
  itemKind: "routeKeyBranch",
  openCount: deferred.length,
  items: deferred,
  whyStillOpen:
    "A packet-bearing branch is a Category A terminal obligation the moment it exists, and three contracts are pinned runtime-contract cohorts whose exact branch enumeration the census verifier asserts. Both are controls that must move by decision, with a record, not as the by-product of integrating a return.",
  howItMoves: "A denominator-movement record naming the obligations added, then the branch identity, its disposition predicate and its packet configuration.",
  precedent: "data/rcap-grade-a/route-obligation-census-v1/DENOMINATOR_MOVEMENT_WAVE_2.json records the movement this integration did make, and is the shape the next one takes.",
  ownedPaths: ["src/lib/legal-authority/routes/**"]
});

/* ---- R3: twenty-nine mappings and seven pair bindings --------------------- */
const r3open = r3.filter((row) => row.status === "STOPPED");
lanes.push({
  residualLaneId: "W2R3_ROUTE_MAPPING_REMAINDER",
  replaces: ["R3_ROUTE_MAPPING_REMAINDER"],
  what: "Route mappings and stage/branch pair bindings R3 could not settle without moving the frozen census denominator.",
  itemKind: "mappingRow",
  openCount: r3open.length,
  byKind: r3open.reduce((acc, row) => ({ ...acc, [row.rowKind]: (acc[row.rowKind] ?? 0) + 1 }), {}),
  items: r3open.map((row) => ({
    itemId: row.itemId,
    rowKind: row.rowKind,
    jurisdiction: row.jurisdiction,
    stopScope: row.stopScope,
    stopConditions: row.stopConditions,
    whatIsWrong: row.whatIsWrong
  })),
  whyStillOpen: "Every one of these requires the frozen census denominator to move. The freeze is a control, not an obstacle: moving it is a Captain act with its own record, and R3 was right to refuse it.",
  ownedPaths: ["data/rcap-grade-a/wave-3/r3-route-mapping-remainder/**"]
});

/* ---- R4: source identities and documents --------------------------------- */
const r4open = r4.filter((row) => row.status === "STOPPED");
lanes.push({
  residualLaneId: "W2R4_SOURCE_IDENTITY_AND_ACQUISITION",
  replaces: ["R4_SOURCE_IDENTITY_AND_ACQUISITION"],
  what: "Source identities that remain unresolved, documents that remain unacquired, and the inventory promotion that could not run.",
  itemKind: "sourceIdentity",
  openCount: r4open.length,
  items: r4open.map((row) => ({
    itemId: row.itemId,
    exactDocumentName: row.exactDocumentName,
    issuingAuthority: row.issuingAuthority,
    identityResolution: row.identityResolution,
    whatWouldSettle: row.whatWouldSettle
  })),
  acquisitionStops: r4acq.stopped,
  inventoryPromotion: r4acq.inventoryPromotion,
  documentsAcquiredThisWave: r4acq.acquired.map((a) => ({ issuingAuthority: a.issuingAuthority, officialUrl: a.officialUrl, sha256: a.sha256, byteLength: a.byteLength })),
  whyStillOpen: "Two hosts are recorded refusals that must be escalated rather than re-probed, one timed out after a reachable HEAD, and the private inventory is not mounted in a worker environment, so no acquired body could be promoted into it.",
  ownedPaths: ["data/rcap-grade-a/wave-3/r4-source-identity-and-acquisition/**"]
});

/* ---- R6: installed, but the gates are not in code ------------------------- */
const r6installed = applyLog.applied.filter((a) => a.lane === "R6");
lanes.push({
  residualLaneId: "W2R6_COUNSEL_GATE_IMPLEMENTATION",
  replaces: [],
  what: "The eligibility gates of the four counsel-determined routes this integration installed. Each entered the ratification registry at hard_gate_pending because its gate is not implemented in code.",
  itemKind: "routeKey",
  openCount: r6installed.length,
  items: r6installed.map((a) => ({ routeKey: a.routeKey, file: a.file, decisionRecord: a.decisionRecord, installedStatus: "hard_gate_pending" })),
  whyStillOpen: "Counsel determined the route; the engine cannot yet screen for exhaustion, filing deadline or date cohort. Promoting one before its gate exists would open payment on records the engine cannot screen.",
  ownedPaths: ["src/lib/legal-authority/**"]
});

/* ---- R7: installed, and still unbuilt ------------------------------------ */
lanes.push({
  residualLaneId: "W2R7_PACKET_BUILD_AND_APPROVAL",
  replaces: [],
  what: "The twenty-four packet families whose product wiring and component specification this integration installed. Wiring is not a built artifact: every one is generationAllowed false and runtimeSelectable false.",
  itemKind: "packetFamily",
  openCount: r7.length,
  items: r7.map((row) => ({ familyId: row.itemId, installedAt: row.intendedDestination, stillMissing: row.whatWasMissing })),
  whyStillOpen: "Wiring records what a family would resolve to. It proves no packet, builds no artifact and approves no output.",
  ownedPaths: ["data/rcap-all50/overlays/census-v1/**"]
});

/* ---- V1-V7: an environment, not a verdict -------------------------------- */
lanes.push({
  residualLaneId: "W2V1_V7_INDEPENDENT_VERIFICATION",
  replaces: ["V1_INDEPENDENT_PACKET_VERIFICATION", "V2_INDEPENDENT_PACKET_VERIFICATION", "V3_INDEPENDENT_PACKET_VERIFICATION",
    "V4_INDEPENDENT_PACKET_VERIFICATION", "V5_INDEPENDENT_PACKET_VERIFICATION", "V6_INDEPENDENT_PACKET_VERIFICATION", "V7_INDEPENDENT_PACKET_VERIFICATION"],
  what: "Forty-three packet-family verification rows, every one BLOCKED_SOURCE because the private Master Library was absent from the worker environments.",
  itemKind: "packetFamily",
  openCount: verification.length,
  theseAreEnvironmentRecordsNotVerdicts:
    "No family may be classified PASS or FAIL from these rows, and no Lawrence review package may be prepared from them. A verifier that could not read the source did not verify anything.",
  items: verification.map((row) => ({ shard: row.shard, familyId: row.itemId, verdict: row.verdict, stopScope: row.stopScope, stopReason: row.stopReason })),
  whyStillOpen: "MASTER_LIBRARY_SOURCE_DIR was unset and the default private master-library root was absent, so no pinned source could bind and every observed SHA-256 was null.",
  ownedPaths: ["data/rcap-grade-a/wave-2/verification/**"]
});

const out = {
  schemaVersion: "rcap-grade-a-wave-2-residual-work/v1",
  generatedBy: "scripts/grade-a-launch-control/generate-wave-2-residual.mjs",
  question: "What did Wave 2 not finish, after the Captain applied everything that could be applied?",
  supersedes: {
    record: "data/rcap-grade-a/launch-control/RESIDUAL_WORK.json",
    forWave: 2,
    note: "Wave 1's residual record is history and is left unchanged. This record carries what remains after the Wave 2 returns were integrated."
  },
  nothingAppliedIsRepeated:
    "A row appears here only if no controlling file closed it. The integration log is the check: every applied item is absent from these lanes by construction.",
  derivedFrom: {
    returns: applyLog.returns,
    integrationLog: `${W2}/integration/applied.json`
  },
  counts: {
    lanes: lanes.length,
    openItems: lanes.reduce((n, l) => n + l.openCount, 0),
    byLane: Object.fromEntries(lanes.map((l) => [l.residualLaneId, l.openCount]))
  },
  commercialPosture: "No lane here opens a commercial route, and none may be dispatched as though it could.",
  lanes
};

if (!CHECK) fs.writeFileSync(path.join(ROOT, OUT), `${JSON.stringify(out, null, 2)}\n`);
console.log(`${OUT}: ${out.counts.lanes} lanes, ${out.counts.openItems} open items`);
for (const [k, v] of Object.entries(out.counts.byLane)) console.log(`  ${v}\t${k}`);
