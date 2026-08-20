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
  "milestone_flip",
  // A source file under a restricted prefix, named by exact path and pinned to
  // exact bytes. Distinct from route_enablement on purpose: that kind means a
  // route may serve traffic somewhere, and reusing it for "this file may exist
  // in the repository" would let a later reader take the existence of the file
  // as permission to turn it on.
  "restricted_path_source_change",
  // A legal decision made by the decision owner, recorded here because this is
  // the register where Roger's decisions live. Deliberately not a
  // route_enablement or a flag_change: approving the legal design and completed
  // output of a packet family says nothing about whether that family may render,
  // sell or be reached, and a later reader must not be able to take the legal
  // approval as permission to turn anything on.
  "owner_legal_decision"
]);
const VALID_STATUS = new Set([
  "pending_authorization",
  // Authorized for some environments and still queued for others. The split is
  // the normal case for a migration: local and staging can be cleared long
  // before production, and collapsing that into one boolean loses the part that
  // matters.
  "authorized_scoped",
  "authorized",
  "executed",
  "declined"
]);

const AUTHORIZED_STATUSES = new Set(["authorized", "authorized_scoped", "executed"]);

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
  if (entry.status === "authorized_scoped") {
    const scope = entry.scopedAuthorization;
    if (!scope || typeof scope !== "object" || Object.keys(scope).length === 0) {
      failures.push(`${id}: authorized_scoped requires a scopedAuthorization map naming each environment`);
    } else if (!Object.values(scope).some((v) => String(v).includes("queued"))) {
      failures.push(
        `${id}: authorized_scoped but no environment is still queued; use "authorized" instead`
      );
    }
  }

  if (AUTHORIZED_STATUSES.has(entry.status)) {
    if (!entry.authorizedBy) failures.push(`${id}: status ${entry.status} with no authorizedBy`);
    if (!entry.authorizedAt) failures.push(`${id}: status ${entry.status} with no authorizedAt`);
  }
  // A legal decision is only usable downstream if it names the owner, the
  // result and the exact scope. Without all three a generator reading this
  // entry would be guessing at what was approved.
  if (entry.kind === "owner_legal_decision") {
    if (!entry.decisionOwner) failures.push(`${id}: owner_legal_decision with no decisionOwner`);
    if (!entry.legalApprovalResult) failures.push(`${id}: owner_legal_decision with no legalApprovalResult`);
    if (!entry.authority) failures.push(`${id}: owner_legal_decision with no stated authority`);
    if (!entry.effectiveDate) failures.push(`${id}: owner_legal_decision with no effectiveDate`);
    const scope = entry.decisionScope;
    if (!scope || typeof scope !== "object") {
      failures.push(`${id}: owner_legal_decision with no decisionScope`);
    } else if (!Array.isArray(scope.completedOutputPacketFamilies) || scope.completedOutputPacketFamilies.length === 0) {
      failures.push(`${id}: owner_legal_decision names no packet families in decisionScope`);
    }
    // The decision closes a legal gate. It must not be readable as permission
    // to deploy, enable a route or flip the launch.
    const denied = new Set((entry.doesNotAuthorize || []).map((s) => String(s).toLowerCase()));
    if (denied.size === 0) {
      failures.push(`${id}: owner_legal_decision must state what it does not authorize`);
    }
  }

  if (entry.status === "executed" && !entry.executedAt) {
    failures.push(`${id}: executed with no executedAt`);
  }
  if (entry.status === "pending_authorization" && (entry.authorizedBy || entry.executedAt)) {
    failures.push(`${id}: pending_authorization but carries authorization or execution marks`);
  }

  // An entry whose artifacts were moved to a dedicated branch cannot point at
  // an in-tree path. It must instead name the branch and pull request, so the
  // work is still traceable from here.
  const offBranch = Boolean(entry.branch);
  if (offBranch && !entry.pullRequest) {
    failures.push(`${id}: records a branch but no pullRequest`);
  }

  for (const artifact of entry.artifacts || []) {
    artifactsInQueue.add(artifact);
    if (offBranch) continue;
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
const scoped = entries.filter((e) => e.status === "authorized_scoped");
if (scoped.length > 0) {
  console.log("");
  console.log("Scoped authorizations (some environments still queued):");
  for (const entry of scoped) {
    console.log(`  - ${entry.id}${entry.pullRequest ? ` (PR #${entry.pullRequest})` : ""}`);
    for (const [env, state] of Object.entries(entry.scopedAuthorization || {})) {
      console.log(`      ${env}: ${state}`);
    }
  }
}

const pending = entries.filter((e) => e.status === "pending_authorization");
if (pending.length > 0) {
  console.log("");
  console.log("Awaiting Roger's authorization:");
  for (const entry of pending) console.log(`  - ${entry.id}: ${entry.title}`);
}
