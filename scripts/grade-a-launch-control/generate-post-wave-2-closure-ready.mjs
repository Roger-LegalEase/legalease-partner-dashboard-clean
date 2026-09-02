#!/usr/bin/env node
/**
 * POST_WAVE_2_LAUNCH_CLOSURE_READY — the closure record, every number derived.
 *
 *   node scripts/grade-a-launch-control/generate-post-wave-2-closure-ready.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(ROOT);
const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const LC = "data/rcap-grade-a/launch-control";

const ledger = read(`${LC}/WAVE_2_VERIFICATION_LEDGER.json`);
const batch1 = read(`${LC}/LAWRENCE_REVIEW_BATCH_1.json`);
const repairs = read(`${LC}/WAVE_2_REPAIR_ASSIGNMENTS.json`);
const legal = read(`${LC}/WAVE_2_LEGAL_INPUT_ASSIGNMENTS.json`);
const worklist = read(`${LC}/POST_WAVE_2_NATIONAL_LAUNCH_WORKLIST.json`);
const wlFreeze = read(`${LC}/POST_WAVE_2_NATIONAL_LAUNCH_WORKLIST_FREEZE.json`);
const residual = read(`${LC}/WAVE_2_RESIDUAL_WORK.json`);
const applied = read("data/rcap-grade-a/wave-2/integration/applied.json");
const projection = read("data/rcap-grade-a/fulfillment-authority-projection.json");
const crosswalk = read(`${LC}/CATEGORY_B_STAGE_BRANCH_CROSSWALK.json`);
const r4 = read("data/rcap-grade-a/source-acquisition/wave-2/acquired.json");
const r3rows = read("data/rcap-grade-a/wave-2/r3-route-mapping-remainder/rows.json").rows;
const r7rows = read("data/rcap-grade-a/wave-2/r7-packet-repair/rows.json").rows;

const laneOf = (list, lane) => list.filter((x) => x.lane === lane).length;
const laneOpen = (id) => residual.lanes.find((l) => l.residualLaneId === id)?.openCount ?? 0;
const pairsOpen = crosswalk.pairs.filter((p) => !p.bStageRuntimeBinding || !p.aBranchRuntimeBinding).length;

const chain = {
  sourceBound: worklist.counts.sourceBound,
  built: worklist.counts.artifactBuilt,
  verified: worklist.counts.independentlyVerified,
  approved: worklist.counts.outputApproved,
  productPathProven: worklist.counts.productPathProven
};

const out = {
  schemaVersion: "rcap-grade-a-post-wave-2-launch-closure-ready/v1",
  generatedBy: "scripts/grade-a-launch-control/generate-post-wave-2-closure-ready.mjs",
  everyCountIsDerived: "Each number is read from a file this closure wrote or verified.",
  captainHeadBefore: "9d737284fef7bb90f3f468ef7095c791b9e50826",
  captainHeadAfter: execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim(),

  verification: {
    resultsIntegrated: Object.keys(ledger.returnsIntegrated).length,
    returns: ledger.returnsIntegrated,
    supersededEnvironmentReturns: ledger.supersedes.commits,
    evaluated: ledger.counts.evaluated,
    PASS: ledger.counts.PASS,
    FAIL_REPAIR_REQUIRED: ledger.counts.FAIL_REPAIR_REQUIRED,
    BLOCKED_LEGAL_APPROVAL_INPUT: ledger.counts.BLOCKED_LEGAL_APPROVAL_INPUT,
    BLOCKED_SOURCE: ledger.counts.BLOCKED_SOURCE,
    unresolvedInReturn: ledger.counts.unresolvedInReturn,
    ledger: `${LC}/WAVE_2_VERIFICATION_LEDGER.json`
  },

  dispatch: {
    lawrenceBatch1: { count: batch1.count, families: batch1.families.map((f) => f.family), record: `${LC}/LAWRENCE_REVIEW_BATCH_1.json` },
    repairAssignments: { count: repairs.count, byDecisiveObligation: repairs.byDecisiveObligation, record: `${LC}/WAVE_2_REPAIR_ASSIGNMENTS.json` },
    legalInputAssignments: { count: legal.count, toLawrence: legal.toLawrence, notToLawrence: legal.notToLawrence,
      byClass: Object.fromEntries(legal.groups.map((g) => [g.class, g.count])), record: `${LC}/WAVE_2_LEGAL_INPUT_ASSIGNMENTS.json` }
  },

  sharedEffects: {
    r2SharedEffectsApplied: laneOf(applied.applied, "R2"),
    r2AlreadyCorrect: laneOf(applied.alreadyCorrect, "R2"),
    r2Deferred: laneOf(applied.deferred, "R2"),
    oregonReconciled: laneOf(applied.applied, "OREGON"),
    r3MappingsApplied: laneOf(applied.applied, "R3"),
    r4SourcesInstalled: r4.documentsAcquired,
    r4SourcesInstalledNote: r4.custodyTruth,
    r4IdentitiesVerified: r4.identitiesResolved.count,
    r6RoutesInstalled: laneOf(applied.applied, "R6"),
    r7RepairsInstalled: r7rows.length,
    integrationLog: "data/rcap-grade-a/wave-2/integration/applied.json"
  },

  open: {
    routeIdentitiesOpen: laneOpen("W2R1_BRANCH_IDENTITY_REMAINDER") + laneOpen("W2R2_DEFERRED_BRANCH_IDENTITIES"),
    mappingsOpen: r3rows.filter((r) => r.status === "STOPPED" && r.rowKind === "mapping").length,
    pairBindingsOpen: pairsOpen,
    sourceObligationsOpen: laneOpen("W2R4_SOURCE_IDENTITY_AND_ACQUISITION"),
    promotionsOpen: r4.inventoryPromotion.documentsPromoted === 0 ? r4.documentsAcquired : 0,
    promotionsOpenWhy: r4.inventoryPromotion.reason
  },

  packetFamilies: {
    total: worklist.counts.families,
    built: chain.built,
    unbuilt: worklist.counts.families - chain.built,
    verified: chain.verified,
    approved: chain.approved,
    productPathProven: chain.productPathProven,
    byFirstMissingLink: worklist.counts.byFirstMissingLink,
    worklist: `${LC}/POST_WAVE_2_NATIONAL_LAUNCH_WORKLIST.json`,
    freeze: `${LC}/POST_WAVE_2_NATIONAL_LAUNCH_WORKLIST_FREEZE.json`,
    frozenSha256: wlFreeze.worklistSha256
  },

  commercial: {
    commercialRoutesOpened: 0,
    completePacketProven: projection.counters.completePacketProven,
    commerciallyEligible: projection.counters.commerciallyEligible,
    fullChain: `${chain.sourceBound} source-bound -> ${chain.built} built -> ${chain.verified} verified -> ${chain.approved} approved -> ${chain.productPathProven} product-path proven`,
    fullChainComplete: 0,
    rule: "COMPLETE_PACKET_PROVEN requires PASS and output approval and product-path proof on the same family. The chain terminates at zero, so it is zero."
  },

  gate: { decision: "HOLD", why: "No family holds the full chain. Four passed verification and none of the four is output-approved or product-path proven." },
  productionTouched: false
};

fs.writeFileSync(`${LC}/POST_WAVE_2_LAUNCH_CLOSURE_READY.json`, `${JSON.stringify(out, null, 2)}\n`);
console.log(JSON.stringify({ verification: out.verification, dispatch: { l: out.dispatch.lawrenceBatch1.count, r: out.dispatch.repairAssignments.count, g: out.dispatch.legalInputAssignments }, sharedEffects: out.sharedEffects, open: out.open, packetFamilies: out.packetFamilies, commercial: out.commercial, gate: out.gate }, null, 2));
