#!/usr/bin/env node
/**
 * The queue of open source-support findings, held to the audit it derives from.
 *
 * The audit classifies 935 citations and reports, among them, the ones where
 * the cited source does not support the proposition a finding rests on. Those
 * are the rows somebody has to act on, and a row that lives only inside a
 * 935-entry generated artifact is a row nobody acts on. This queue lifts them
 * out — which immediately creates the failure mode it has to defend against.
 *
 * A hand-maintained list beside a generated one drifts, and it drifts in the
 * comfortable direction: an entry quietly disappears, or its severity is
 * softened, and the artifact that would have contradicted it is 935 rows long
 * and nobody re-reads it. So the queue is not trusted to describe itself. The
 * set is recomputed here from the audit, and:
 *
 *   - every high-severity audit row must appear exactly once;
 *   - nothing that is not a high-severity audit row may appear;
 *   - each entry's classification, supportsProposition and severity must be
 *     the audit's, not a softened restatement;
 *   - the aggregate the queue quotes must be the audit's own count.
 *
 * What the queue may carry that the audit cannot: who owns the finding, what
 * its disposition is, and the instruction that it must not be resolved by
 * adjusting a legal conclusion inside a release lane. Those are decisions. The
 * classification is a measurement, and the measurement wins.
 *
 * Run with --mutations to prove the drift it is built to catch is caught.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const QUEUE = "data/rcap-crosswalk-enrichment/source-support-findings-queue.json";
const AUDIT = "data/rcap-crosswalk-enrichment/e2-source-support-audit.json";

const json = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));

const failures = [];
let checks = 0;
const ok = (label, condition, detail) => {
  checks += 1;
  if (!condition) failures.push(`${label}${detail === undefined ? "" : ` — got ${detail}`}`);
};

/** Every refusal the queue must produce against a given audit. */
function refusals(queue, audit) {
  const found = [];
  const say = (reason) => found.push(reason);

  const high = audit.rows.filter((row) => row.severity === "high");
  const byId = new Map();
  for (const entry of queue.findings ?? []) {
    if (byId.has(entry.findingId)) say(`${entry.findingId} appears more than once`);
    byId.set(entry.findingId, entry);
  }

  const auditIds = new Set(high.map((row) => row.jobId));
  for (const row of high) {
    const entry = byId.get(row.jobId);
    if (!entry) {
      say(`the audit reports ${row.jobId} at high severity and the queue does not carry it`);
      continue;
    }
    for (const field of ["classification", "supportsProposition", "severity"]) {
      if (entry[field] !== row[field]) {
        say(`${row.jobId}: the queue says ${field} ${JSON.stringify(entry[field])}, the audit says ${JSON.stringify(row[field])}`);
      }
    }
    if (entry.sourcePath !== row.sourcePath) {
      say(`${row.jobId}: the queue names a different source than the audit measured`);
    }
  }
  for (const id of byId.keys()) {
    if (!auditIds.has(id)) say(`the queue carries ${id}, which the audit does not report at high severity`);
  }

  // An entry is work only if it says who owns it and whether it is open.
  for (const entry of queue.findings ?? []) {
    if (!String(entry.owner ?? "").trim()) say(`${entry.findingId} names no owner, so it is a note rather than work`);
    if (!String(entry.disposition ?? "").trim()) say(`${entry.findingId} carries no disposition`);
  }

  // The queue's claim about commercial exposure is the one a reader will rely
  // on to decide it can wait, so it must be stated rather than implied.
  if (!String(queue.notCommerciallyExposed?.statement ?? "").trim()) {
    say("the queue does not state whether these findings are commercially exposed");
  }
  if (!String(queue.notCommerciallyExposed?.howItIsKnown ?? "").trim()) {
    say("the queue asserts commercial exposure without saying how it is known");
  }
  return found;
}

const queue = json(QUEUE);
const audit = json(AUDIT);

ok("the queue declares its schema", queue.schemaVersion === "rcap-source-support-findings-queue/v1", queue.schemaVersion);
ok("the queue names the audit it derives from", queue.derivedFrom?.audit === AUDIT);
ok("the queue states the rule that decides its membership", String(queue.derivedFrom?.rule ?? "").includes("severity"));

const live = refusals(queue, audit);
ok("the queue is exactly the audit's open high-severity findings", live.length === 0, live.join("; "));

const high = audit.rows.filter((row) => row.severity === "high");
ok("every high-severity finding is queued", (queue.findings ?? []).length === high.length,
  `${(queue.findings ?? []).length} queued vs ${high.length} in the audit`);
ok("each finding says it is not to be resolved in the release lane",
  (queue.findings ?? []).every((entry) => String(entry.doNotResolveHere ?? "").trim().length > 0));
ok("the queue records the owner instruction it was created under",
  String(queue.authorization ?? "").includes("2026-09-19"));

if (process.argv.includes("--mutations")) {
  const clone = () => JSON.parse(JSON.stringify(queue));
  const cases = [
    ["a finding is quietly dropped", () => { const q = clone(); q.findings.pop(); return q; }],
    ["a finding's severity is softened", () => { const q = clone(); q.findings[0].severity = "medium"; return q; }],
    ["a finding's classification is softened", () => {
      const q = clone(); q.findings[0].classification = "interpretive_conclusion"; return q;
    }],
    ["a finding is reworded to say the source supports it", () => {
      const q = clone(); q.findings[0].supportsProposition = "derivable"; return q;
    }],
    ["a finding is pointed at a different source", () => {
      const q = clone(); q.findings[1].sourcePath = "src/lib/rcap-engine/compiled/profiles/AZ-arizona.json"; return q;
    }],
    ["a finding the audit does not report is added", () => {
      const q = clone();
      q.findings.push({ ...q.findings[0], findingId: "E2-A-XX-invented" });
      return q;
    }],
    ["a finding is listed twice", () => { const q = clone(); q.findings.push(q.findings[0]); return q; }],
    ["a finding loses its owner", () => { const q = clone(); q.findings[0].owner = ""; return q; }],
    ["the commercial-exposure claim is made without evidence", () => {
      const q = clone(); q.notCommerciallyExposed.howItIsKnown = ""; return q;
    }]
  ];
  console.log("\nMutations that must be refused:");
  for (const [name, mutate] of cases) {
    checks += 1;
    const caught = refusals(mutate(), audit);
    if (caught.length === 0) failures.push(`MISSED: ${name}`);
    else console.log(`  refused  ${name}\n             ${caught[0].slice(0, 120)}`);
  }

  // And the other direction: the audit finding something new must not be
  // absorbed silently by a queue that already looks complete.
  checks += 1;
  const grown = JSON.parse(JSON.stringify(audit));
  const promoted = grown.rows.find((row) => row.severity !== "high");
  promoted.severity = "high";
  const caught = refusals(queue, grown);
  if (caught.length === 0) failures.push("MISSED: the audit reports a new high-severity finding the queue does not carry");
  else console.log(`  refused  the audit reports a new high-severity finding\n             ${caught[0].slice(0, 120)}`);
}

if (failures.length > 0) {
  console.error(`\nsource-support findings queue FAILED — ${failures.length} problem(s):`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log(`\nsource-support findings queue — ${checks} checks. ${high.length} open high-severity finding(s), each owned, none resolvable by editing a legal conclusion in a release lane.`);
