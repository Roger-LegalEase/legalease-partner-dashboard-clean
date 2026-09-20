#!/usr/bin/env node
/* Capacity, SLO violations and throughput, measured from the tree rather than
 * declared. A metric nobody can recompute is a claim. */
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FACT = "data/rcap-grade-a/packet-factory-24h";
const CTL = "data/rcap-grade-a/external-worker-control";
const read = (r) => JSON.parse(fs.readFileSync(path.join(ROOT, r), "utf8"));
const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();

const ledger = read(`${FACT}/claim-ledger.json`);
const master = read(`${FACT}/MASTER_QUEUE.json`);
const queue = read(`${FACT}/RASTER_QUEUE.json`);
const index = read(`${CTL}/EXTERNAL_ASSIGNMENTS.json`);

const live = (kinds) => new Set(ledger.claims.filter((c) => kinds.includes(c.laneKind) && c.released !== true).map((c) => c.subjectId));
const liveBuild = live(["packet-build"]), liveRepair = live(["repair", "shared-host-repair"]), liveVerify = live(["independent-verification"]);
const assignedExternally = new Set(index.workers.flatMap((w) => w.subjectIds));

const rasterPass = queue.rows.filter((r) => r.currentRasterState === "RASTER_PASS" && r.coverage?.complete).map((r) => r.familyId);
const sourceReady = master.families.filter((f) => f.state === "SOURCE_READY").map((f) => f.familyId);
const failRepair = master.families.filter((f) => f.state === "FAIL_REPAIR_REQUIRED").map((f) => f.familyId);

const unowned = (ids, held) => ids.filter((f) => !held.has(f) && !assignedExternally.has(f));
const violations = [];
const v = (rule, items, detail) => { if (items.length) violations.push({ rule, count: items.length, items: items.slice(0, 12), detail }); };

v("SOURCE_READY family with no builder and no external assignment", unowned(sourceReady, liveBuild),
  "a family that can be built and is not assigned is idle capacity, not a queue");
v("FAIL_REPAIR_REQUIRED family with no repairer and no external assignment", unowned(failRepair, liveRepair),
  "the repair queue is the largest blocker to any family reaching PASS_COMPLETE");
v("RASTER_PASS family with no verifier and no external assignment", unowned(rasterPass, liveVerify),
  "these need claim.mjs --transfer for a second read; a fresh grant is refused as a duplicate");

const idleWorkers = index.workers.filter((w) => w.subjectCount === 0 && !/RESEARCH/.test(w.mode));
v("external worker with no assignment while eligible work exists", idleWorkers.map((w) => w.workerId),
  "a provisioned slot holding nothing");

const returnsDir = path.join(ROOT, CTL, "returns");
const pendingReturns = fs.existsSync(returnsDir)
  ? fs.readdirSync(returnsDir).filter((d) => fs.existsSync(path.join(returnsDir, d, "RETURN.json")))
  : [];

const metrics = {
  schemaVersion: "rcap-external-metrics/v1",
  measuredAt: now, captainSha: head,
  slots: {
    provisioned: index.workers.length,
    assigned: index.workers.filter((w) => w.subjectCount > 0).length,
    researchOnly: index.workers.filter((w) => /RESEARCH/.test(w.mode)).length,
    idle: idleWorkers.length,
  },
  queueDepth: {
    sourceReadyTotal: sourceReady.length,
    sourceReadyUnowned: unowned(sourceReady, liveBuild).length,
    failRepairTotal: failRepair.length,
    failRepairUnowned: unowned(failRepair, liveRepair).length,
    rasterPassTotal: rasterPass.length,
    rasterPassUnverified: unowned(rasterPass, liveVerify).length,
  },
  throughput: {
    note: "Per-hour rates need two measurements. This is the first; rates appear once a second cycle has a prior METRICS.json to difference against. Publishing a rate from one sample would be inventing a denominator.",
    priorSample: fs.existsSync(path.join(ROOT, CTL, "METRICS.json"))
      ? read(`${CTL}/METRICS.json`).measuredAt ?? null : null,
    cumulative: {
      claimsReleased: ledger.claims.filter((c) => c.released === true).length,
      releasesLogged: (ledger.releases ?? []).length,
      transfersLogged: (ledger.transfers ?? []).length,
      rasterReceipts: queue.rows.filter((r) => r.rasterReceipt).length,
      familiesPassComplete: 0,
      familiesPassCompleteBasis: "GRADE_A_READINESS.json — every independent read so far returned a defect",
    },
  },
  pendingReturnsAwaitingIntegration: pendingReturns,
  sloViolations: violations,
  sloViolationCount: violations.length,
  commercialRoutesOpened: 0,
  productionTouched: false,
};
fs.mkdirSync(path.join(ROOT, CTL), { recursive: true });
fs.writeFileSync(path.join(ROOT, CTL, "METRICS.json"), `${JSON.stringify(metrics, null, 2)}\n`);

console.log(`metrics at ${head.slice(0, 9)}`);
console.log(`  slots ${metrics.slots.assigned}/${metrics.slots.provisioned} assigned, ${metrics.slots.researchOnly} research, ${metrics.slots.idle} idle`);
console.log(`  SLO violations: ${violations.length}`);
for (const x of violations) console.log(`    ${x.count.toString().padStart(3)}  ${x.rule}`);
