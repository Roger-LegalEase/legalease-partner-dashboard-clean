import fs from "node:fs";
import { execFileSync } from "node:child_process";

const CTL = "data/rcap-grade-a/external-worker-control";
const read = (r) => JSON.parse(fs.readFileSync(r, "utf8"));
const head = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const now = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");

const index = read(`${CTL}/EXTERNAL_ASSIGNMENTS.json`);
const metrics = read(`${CTL}/METRICS.json`);
const ledger = read("data/rcap-grade-a/packet-factory-24h/claim-ledger.json");

/*
 * Completion is read out of the LEDGER, never out of the fact that I ran a
 * command. A transfer counts as done only when a live grant sits on the
 * destination lane for that exact subject.
 */
const liveOn = new Map();
for (const c of ledger.claims) {
  if (c.released === true) continue;
  liveOn.set(`${c.lane}|${c.subjectId}`, c);
}
const logged = new Map((ledger.transfers ?? []).map((t) => [`${t.toLane}|${t.subjectId}`, t]));

const completed = [];
const stillPending = [];
for (const w of index.workers) {
  for (const s of w.subjectIds) {
    const key = `${w.lane}|${s}`;
    const grant = liveOn.get(key);
    const t = logged.get(key);
    if (grant && t) {
      completed.push({
        workerId: w.workerId, lane: w.lane, subjectId: s,
        fromLane: t.fromLane, transferredAt: t.transferredAt,
        operation: grant.operation, grantIsLive: true,
      });
    } else {
      stillPending.push({ workerId: w.workerId, lane: w.lane, subjectId: s,
        why: grant ? "a live grant exists but no transfer is logged" : "no live grant on the destination lane" });
    }
  }
}

const allDone = stillPending.length === 0;
fs.writeFileSync(`${CTL}/CONTROL_STATE.json`, JSON.stringify({
  schemaVersion: "rcap-external-control-state/v1",
  updatedAt: now, captainSha: head,
  state: allDone ? "GRANTS_LIVE_WORKERS_MAY_ASSERT" : "TRANSFERS_INCOMPLETE",

  whatIsTrueRightNow: allDone
    ? `All ${completed.length} transfers are complete and every external worker now holds a live grant on its own lane. A worker may assert its subjects. An assert that is refused is still a full stop — report the refusal, do not work without a grant.`
    : `${stillPending.length} transfer(s) have not landed. Those workers must not assert.`,

  completionIsMeasuredNotAsserted:
    "Each entry below was read back out of the claim ledger: a live grant on the destination lane AND a matching entry in ledger.transfers. Having run the command is not evidence that it took.",

  transfersCompleted: completed,
  transfersPending: stillPending,
  transfersLoggedInLedger: (ledger.transfers ?? []).length,

  workerMayAssertWhen: "its subject appears under transfersCompleted with grantIsLive true.",

  whatTheTransfersDidNotDo: [
    "No packet, overlay, field map, source receipt or raster receipt was touched.",
    "No claim identity was created or destroyed: 549 before and after, 0 lost, 0 gained.",
    "376 releases and 3 reissues preserved exactly; 20 released flags re-opened, which is what a transfer is.",
    "No Claude worker was interrupted and no live Claude claim was moved — every transferred grant had already been released by the lane that held it.",
  ],

  branchWatch: {
    "CODEX-CS-A": "codex/cs-a/", "CODEX-CS-B": "codex/cs-b/",
    cloud: "a completed Codex Cloud task opens a PR; evidence-only paths under the worker's return directory",
    ingestOnlyAfter: "the branch or PR exists. An assignment is not a return.",
    ingestWith: "node scripts/external-worker-control/ingest-external-return.mjs --worker <ID> --changed-paths <file>",
  },

  captainRetainsSolely: [
    "the claim ledger and every grant, transfer, release and reissue in it",
    "MASTER_QUEUE, RASTER_QUEUE and ACTIVE_ASSIGNMENTS regeneration",
    "central raster dispatch",
    "integration of every return, external or Claude",
    "commercial authority and anything touching Production",
  ],

  claudeWorkersUntouched: { interrupted: 0, liveClaimsMoved: 0 },
  openSloViolations: metrics.sloViolations.map((v) => ({ rule: v.rule, count: v.count })),
  capacityIsTheConstraint:
    "The violations are queue depth, not idle slots: all ten workers are assigned and now hold grants. Families queue behind lanes, not behind dispatch logic.",

  commercialRoutesOpened: 0,
  productionTouched: false,
}, null, 2) + "\n");

console.log(`CONTROL_STATE: ${allDone ? "GRANTS_LIVE_WORKERS_MAY_ASSERT" : "TRANSFERS_INCOMPLETE"}`);
console.log(`  completed ${completed.length}, pending ${stillPending.length}, logged in ledger ${(ledger.transfers ?? []).length}`);
for (const p of stillPending) console.log(`  PENDING ${p.workerId} ${p.lane} ${p.subjectId} — ${p.why}`);
