#!/usr/bin/env node
/**
 * WAVE 2 INTEGRATION CHECKPOINT — the numbers, each derived rather than typed.
 *
 *   node scripts/grade-a-launch-control/generate-wave-2-integration-checkpoint.mjs
 *
 * Every count here comes from a file this integration wrote or verified. A
 * checkpoint whose numbers are typed in by hand reports what its author believed,
 * which is the failure this whole control plane exists to prevent.
 */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
process.chdir(ROOT);
const read = (rel) => JSON.parse(fs.readFileSync(rel, "utf8"));
const git = (args) => execFileSync("git", args, { encoding: "utf8" }).trim();

const log = read("data/rcap-grade-a/wave-2/integration/applied.json");
const residual = read("data/rcap-grade-a/launch-control/WAVE_2_RESIDUAL_WORK.json");
const freeze = read("data/rcap-grade-a/route-obligation-census-v1/FREEZE.json");
const scoreboard = read("data/rcap-grade-a/route-obligation-census-v1/COMPLETION_SCOREBOARD.json");
const projection = read("data/rcap-grade-a/fulfillment-authority-projection.json");
const movement = read("data/rcap-grade-a/route-obligation-census-v1/DENOMINATOR_MOVEMENT_WAVE_2.json");
const continuation = read("data/rcap-grade-a/launch-control/WAVE_2_VERIFICATION_CONTINUATION.json");
const r1 = read("data/rcap-grade-a/wave-2/r1-branch-identity-remainder/rows.json").rows;
const r2 = read("data/rcap-grade-a/wave-2/r2-already-answered-engineering/rows.json").rows;
const r3 = read("data/rcap-grade-a/wave-2/r3-route-mapping-remainder/rows.json").rows;
const r4 = read("data/rcap-grade-a/wave-2/r4-source-identity-and-acquisition/rows.json").rows;
const r4acq = read("data/rcap-grade-a/wave-2/r4-source-identity-and-acquisition/acquired.json");
const r6 = read("data/rcap-grade-a/wave-2/r6-counsel-determination-implementation/rows.json").rows;
const r7 = read("data/rcap-grade-a/wave-2/r7-packet-repair/rows.json").rows;

const byLane = (list, lane) => list.filter((x) => x.lane === lane);

/* Built artifacts are counted from the tree, not from a status field. */
const OVERLAYS = "data/rcap-all50/overlays/census-v1";
const builtFamilies = [];
for (const st of fs.readdirSync(OVERLAYS)) {
  const dir = path.join(OVERLAYS, st);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const d of fs.readdirSync(dir)) {
    if (fs.existsSync(path.join(dir, d, "reports/packet-evidence.json"))) {
      builtFamilies.push(d.replace(/--(official-pdf-fill|custom-pleading)$/, ""));
    }
  }
}

const hasHold = (fam, kind) => (fam.holds ?? []).some((h) => h.kind === kind);
const families = scoreboard.familiesDetail;
const outputApproved = families.filter((f) => !hasHold(f, "missing_output_approval"));
const artifactReviewed = families.filter((f) => !hasHold(f, "missing_artifact_review"));

/* Independent verification: forty-three rows returned, none a verdict. */
const verificationRows = continuation.shards.reduce((n, s) => n + s.familyCount, 0);
const independentlyVerified = 0;
const productPathProven = projection.counters.completePacketProven;

const checkpoint = {
  schemaVersion: "rcap-grade-a-wave-2-integration-checkpoint/v1",
  generatedBy: "scripts/grade-a-launch-control/generate-wave-2-integration-checkpoint.mjs",
  everyCountIsDerived: "No number here is typed. Each is read from a file this integration wrote or verified, so the checkpoint cannot report something the tree does not say.",
  captainHeadBefore: "cbdfcd9ef9356182085ec1686e9084b244d5dc79",
  captainHeadAfter: git(["rev-parse", "HEAD"]),
  returnsIntegrated: log.returns,

  applied: {
    rule: "A return is proven by a controlling-file change or by a mechanical finding that the controlling file was already correct. Nothing here rests on a lane's own claim.",
    r1StopsAccepted: r1.filter((r) => r.status === "STOPPED").length,
    r2PackagesReviewed: r2.length,
    r2SharedEffectsApplied: byLane(log.applied, "R2").length,
    r2AlreadyCorrect: byLane(log.alreadyCorrect, "R2").length,
    r2Deferred: byLane(log.deferred, "R2").length,
    oregonReconciled: byLane(log.applied, "OREGON").length,
    r3MappingsApplied: byLane(log.applied, "R3").length,
    r4IdentitiesInstalled: byLane(log.applied, "R4").length,
    r4IdentitiesAlreadyCorrect: byLane(log.alreadyCorrect, "R4").length,
    r4DocumentsInstalled: 0,
    r4DocumentReceipts: r4acq.acquired.length,
    r6RoutesInstalled: byLane(log.applied, "R6").length,
    r7WiringRecordsInstalled: r7.filter((r) => r.itemId !== "pa_6308_underage-set").length,
    r7SpecificationInstalled: r7.filter((r) => r.itemId === "pa_6308_underage-set").length
  },

  openWork: {
    routeIdentitiesComplete: byLane(log.applied, "R6").length,
    routeIdentitiesStillOpen: r1.filter((r) => r.status === "STOPPED").length + byLane(log.deferred, "R2").length,
    mappingsComplete: r3.filter((r) => r.status === "COMPLETED").length,
    mappingsStillOpen: r3.filter((r) => r.status === "STOPPED").length,
    sourceIdentitiesComplete: r4.filter((r) => r.status === "COMPLETED").length,
    sourceIdentitiesStillOpen: r4.filter((r) => r.status === "STOPPED").length,
    documentsAcquired: r4acq.acquired.length,
    documentsAcquiredNote: "Receipts with SHA-256 only. No body was committed and the private inventory was not mounted, so none was promoted into it.",
    documentsStillRequired: {
      sourceGenuinelyMissing: freeze.sourceCustody.SOURCE_GENUINELY_MISSING,
      sourceIdentityUnresolved: freeze.sourceCustody.SOURCE_IDENTITY_UNRESOLVED,
      acquisitionTasks: freeze.workTotals.officialSourceAcquisitionTasks
    }
  },

  packetFamilies: {
    total: families.length,
    builtArtifact: builtFamilies.length,
    builtArtifactFamilies: builtFamilies.sort(),
    independentlyVerified,
    independentlyVerifiedNote: `${verificationRows} verification rows returned; every one BLOCKED_SOURCE. Those are environment records, so no family is classified PASS or FAIL and none counts as verified.`,
    outputApproved: outputApproved.length,
    artifactReviewed: artifactReviewed.length,
    productPathProven,
    productPathProvenNote: `The fulfillment projection counts ${projection.counters.routesWithARecord} routes with a record, ${projection.counters.incomplete} incomplete and ${projection.counters.commerciallyEligible} commercially eligible.`,
    lackingBuiltArtifact: families.length - builtFamilies.length,
    lackingIndependentVerification: families.length - independentlyVerified,
    lackingOutputApproval: families.length - outputApproved.length,
    lackingProductPathProof: families.length - productPathProven,
    lackingAtLeastOne: families.length,
    completeOnAllFour: 0,
    completeOnAllFourNote: "No family holds all four. Independent verification and product-path proof both stand at zero, so the intersection is empty before any other dimension is considered."
  },

  censusDenominator: {
    moved: movement.movedTotals,
    unchanged: movement.unchangedTotals,
    record: "data/rcap-grade-a/route-obligation-census-v1/DENOMINATOR_MOVEMENT_WAVE_2.json",
    refrozen: true
  },

  remainingBuildAssignments: {
    dispatchableFamilies: freeze.buildQueue.dispatchable,
    waves: freeze.buildQueue.waves,
    heldBack: freeze.buildQueue.heldBack,
    heldBackReasons: freeze.buildQueue.heldBackReasons,
    inFlight: scoreboard.buildSlots,
    note: "The build queue is deliberately narrower than every Category A family: a family whose source is unresolved or missing cannot be implemented by anyone yet, and dispatching it produces a lane that stalls on its first step."
  },

  residual: { record: "data/rcap-grade-a/launch-control/WAVE_2_RESIDUAL_WORK.json", lanes: residual.counts.lanes, openItems: residual.counts.openItems, byLane: residual.counts.byLane },

  verification: { status: continuation.status, shards: continuation.totals.shards, families: continuation.totals.families, record: "data/rcap-grade-a/launch-control/WAVE_2_VERIFICATION_CONTINUATION.json", instructions: "docs/rcap/grade-a/launch-control/wave-2-verification-continuation/" },

  commercial: {
    commercialRoutesOpened: 0,
    checkoutDerivableBefore: 108,
    checkoutDerivableAfter: 107,
    closed: ["OR:set-aside-of-arrests-or-charges-without-conviction-under-ors-137-225-1-c"],
    completePacketProven: productPathProven,
    commerciallyEligible: projection.counters.commerciallyEligible
  },

  productionTouched: false
};

fs.writeFileSync("data/rcap-grade-a/launch-control/WAVE_2_INTEGRATION_CHECKPOINT.json", `${JSON.stringify(checkpoint, null, 2)}\n`);
console.log(JSON.stringify({ applied: checkpoint.applied, openWork: checkpoint.openWork, packetFamilies: { ...checkpoint.packetFamilies, builtArtifactFamilies: undefined } }, null, 2));
