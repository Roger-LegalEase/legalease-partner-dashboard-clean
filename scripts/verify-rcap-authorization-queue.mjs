// Enforces the authorization queue.
//
// v8 rail: anything production-touching — deploys, migrations, flag changes,
// route enablements, both milestone flips — waits for Roger's authorization.
// A queue that is merely a document drifts the first time someone is in a
// hurry, so this makes the rule machine-checkable:
//
//   1. Every migration at or above queueEnforcedFromPhase has an entry.
//   2. Nothing is marked executed without a recorded authorizer and timestamp.
//   3. Nothing claims authorization without both an authorizer and a date.
//   4. Every entry carries a rollback plan and at least one piece of evidence.
//
// It does not authorize anything and cannot. It only refuses to let an
// unauthorized production-touching change pass as routine.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const queuePath = path.join(rootDir, "data/rcap-authorization-queue.json");
const migrationDir = path.join(rootDir, "supabase");

const failures = [];

if (!fs.existsSync(queuePath)) {
  console.error("Authorization queue missing: data/rcap-authorization-queue.json");
  process.exit(1);
}

const queue = JSON.parse(fs.readFileSync(queuePath, "utf8"));
const entries = Array.isArray(queue.entries) ? queue.entries : [];
const enforcedFrom = Number(queue.queueEnforcedFromPhase);

if (!Number.isFinite(enforcedFrom)) {
  failures.push("queueEnforcedFromPhase must be a number");
}

const VALID_KINDS = new Set([
  "migration",
  "deploy",
  "flag_change",
  "route_enablement",
  "milestone_flip"
]);
const VALID_STATUS = new Set([
  "pending_authorization",
  "authorized",
  "executed",
  "declined"
]);

const artifactsInQueue = new Set();
for (const entry of entries) {
  const id = entry.id || "(entry with no id)";

  if (!entry.id) failures.push("an entry has no id");
  if (!VALID_KINDS.has(entry.kind)) {
    failures.push(`${id}: unknown kind ${JSON.stringify(entry.kind)}`);
  }
  if (!VALID_STATUS.has(entry.status)) {
    failures.push(`${id}: unknown status ${JSON.stringify(entry.status)}`);
  }
  if (!entry.rollback) failures.push(`${id}: no rollback plan`);
  if (!Array.isArray(entry.evidence) || entry.evidence.length === 0) {
    failures.push(`${id}: no evidence recorded`);
  }
  if (!entry.why) failures.push(`${id}: no stated reason`);

  // The load-bearing checks: a claim of authorization must name who and when.
  if (entry.status === "authorized" || entry.status === "executed") {
    if (!entry.authorizedBy) failures.push(`${id}: status ${entry.status} with no authorizedBy`);
    if (!entry.authorizedAt) failures.push(`${id}: status ${entry.status} with no authorizedAt`);
  }
  if (entry.status === "executed" && !entry.executedAt) {
    failures.push(`${id}: executed with no executedAt`);
  }
  if (entry.status === "pending_authorization" && (entry.authorizedBy || entry.executedAt)) {
    failures.push(`${id}: pending_authorization but carries authorization or execution marks`);
  }

  for (const artifact of entry.artifacts || []) {
    artifactsInQueue.add(artifact);
    if (!fs.existsSync(path.join(rootDir, artifact))) {
      failures.push(`${id}: artifact not found in tree: ${artifact}`);
    }
  }
}

// Every migration from the enforcement point onward needs an entry.
const migrations = fs
  .readdirSync(migrationDir)
  .filter((f) => /^phase-\d+.*\.sql$/.test(f))
  .map((f) => ({ file: f, phase: Number(/^phase-(\d+)/.exec(f)[1]) }))
  .filter((m) => Number.isFinite(enforcedFrom) && m.phase >= enforcedFrom);

for (const migration of migrations) {
  const rel = `supabase/${migration.file}`;
  if (!artifactsInQueue.has(rel)) {
    failures.push(
      `${rel} is at or above phase ${enforcedFrom} but has no authorization queue entry`
    );
  }
}

if (failures.length > 0) {
  console.error("Authorization queue verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

const byStatus = {};
for (const entry of entries) byStatus[entry.status] = (byStatus[entry.status] || 0) + 1;

console.log("Authorization queue verification passed.");
console.log(`Entries: ${entries.length}`);
for (const [status, count] of Object.entries(byStatus).sort()) {
  console.log(`  ${status}: ${count}`);
}
console.log(`Migrations enforced from phase ${enforcedFrom}: ${migrations.length} checked`);
const pending = entries.filter((e) => e.status === "pending_authorization");
if (pending.length > 0) {
  console.log("");
  console.log("Awaiting Roger's authorization:");
  for (const entry of pending) console.log(`  - ${entry.id}: ${entry.title}`);
}
