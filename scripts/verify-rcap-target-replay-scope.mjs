#!/usr/bin/env node
// The replay case must be about THIS RUN, and about the target it finalized.
//
//   node scripts/verify-rcap-target-replay-scope.mjs
//   node scripts/verify-rcap-target-replay-scope.mjs --mutations
//
// Idempotency is a statement about counts before and after. On a SHARED
// acceptance project that statement is only meaningful when the counts are
// filtered by identities this run owns: the briefcase item it created, the auth
// user it signed in, the render job the paid 202 named. A project-wide count
// moves whenever anything else in the queue moves, and would report another
// run's backlog draining as an idempotency defect in this one.
//
// The converse failure is just as bad. Counting only rows and never the
// target's own finalized identity would miss a replay that re-rendered the
// target, or re-hashed it, or bumped its attempt count — the row count stays at
// one throughout. So the target's status, artifact path, hashes, page count,
// byte count and attempt count are all snapshotted and all required unchanged.
//
// Project-wide movement is still measured, and still reported, because "the
// queue drained while this ran" is worth knowing. It is reported and never
// asserted: other runs' rows are not this run's idempotency.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MUTATIONS = process.argv.includes("--mutations");
const HARNESS = "scripts/rcap-hosted-acceptance-payment.mjs";

const read = (p) => {
  const full = path.join(rootDir, p);
  return fs.existsSync(full) ? fs.readFileSync(full, "utf8") : "";
};

/** The replay block alone. A check that scans the whole file would be satisfied
 *  by the worker journey's own identity plumbing and prove nothing here. */
function replayBlock(harness) {
  const start = harness.indexOf("// --- 10. Replay: Stripe retries, and must change nothing");
  if (start === -1) return null;
  const end = harness.indexOf("event_replay_creates_no_second_entitlement_or_render_job\",", start);
  return end === -1 ? null : harness.slice(start, harness.indexOf("evidence.replay", end));
}

function failures(harness) {
  const out = [];
  const fail = (condition, message) => { if (!condition) out.push(message); };

  const block = replayBlock(harness);
  fail(block !== null, "could not locate the replay case in the harness");
  if (!block) return out;

  // Scoped to identities this run owns.
  fail(/where id = '\$\{sqlText\(targetJobId\)\}'\) as target_job/.test(block),
    "the replay snapshot does not count the target render job by its exact identity");
  fail(/consumer_briefcase_item_id = '\$\{sqlText\(itemId\)\}'/.test(block),
    "the entitlement count is not filtered to this run's briefcase item");
  fail(/render_job_id = '\$\{sqlText\(targetJobId\)\}'\) as target_ledger_events/.test(block),
    "the ledger count is not filtered to the target render job");

  // The target's finalized identity, field by field.
  for (const field of [
    "target_status", "target_output_sha256", "target_storage_path",
    "target_page_count", "target_byte_count", "target_attempt_count"
  ]) {
    fail(block.includes(`as ${field}`), `the replay snapshot does not capture ${field}, so a replay that disturbed it would not be visible`);
    fail(new RegExp(`"${field}"`).test(block), `${field} is captured but not tracked, so a change in it would not fail the case`);
  }

  // The verdict is the conjunction of a 200 and nothing having moved.
  fail(/replayRes\.status === 200 && moved\.length === 0/.test(block),
    "the replay verdict is not the conjunction of an accepted retry and an unchanged namespace");

  // Project-wide movement: measured, reported, never asserted.
  fail(/const projectWide = \(\) => sql\(/.test(block),
    "project-wide movement is not measured alongside the scoped counts");
  fail(/projectMoved/.test(block),
    "project-wide movement is not reported");
  fail(!/moved\.length === 0 && projectMoved\.length === 0/.test(block),
    "project-wide movement is part of the verdict, so another run's backlog draining would fail this run's replay case");

  return out;
}

const harness = read(HARNESS);
const base = failures(harness);

if (MUTATIONS) {
  if (base.length > 0) {
    console.error("baseline is not green; mutations would prove nothing:\n");
    for (const p of base) console.error(` - ${p}`);
    process.exit(1);
  }
  const M = [
    ["the target's finalized identity stops being tracked", (h) =>
      h.replace(`    "target_job", "target_status", "target_output_sha256", "target_storage_path",\n    "target_page_count", "target_byte_count", "target_attempt_count", "target_ledger_events"`,
        `    "target_job"`)],
    ["project-wide backlog movement is folded into the verdict", (h) =>
      h.replace("    replayRes.status === 200 && moved.length === 0,", "    replayRes.status === 200 && moved.length === 0 && projectMoved.length === 0,")],
    ["the ledger count stops being filtered to the target job", (h) =>
      h.replace("      (select count(*) from public.packet_credit_ledger where render_job_id = '${sqlText(targetJobId)}') as target_ledger_events,", "")]
  ];

  let undetected = 0;
  for (const [label, mutate] of M) {
    const mutated = mutate(harness);
    if (mutated === harness) { console.log(`MISSED   ${label} (anchor did not match)`); undetected += 1; continue; }
    let caught;
    try { caught = failures(mutated).length > base.length; } catch { caught = true; }
    console.log(`${caught ? "caught  " : "MISSED  "} ${label}`);
    if (!caught) undetected += 1;
  }
  if (undetected > 0) {
    console.error(`\nverify-rcap-target-replay-scope FAILED — ${undetected} mutation(s) undetected.`);
    process.exit(1);
  }
  console.log(`\nThe replay case is about this run's identities and this run's target (${M.length}/${M.length}).`);
  process.exit(0);
}

if (base.length > 0) {
  console.error(`verify-rcap-target-replay-scope FAILED — ${base.length} problem(s):\n`);
  for (const p of base) console.error(` - ${p}`);
  process.exit(1);
}

console.log("verify-rcap-target-replay-scope passed.");
console.log("  Every asserted count is filtered by this run's briefcase item, auth user or target render job.");
console.log("  The target's finalized identity — status, path, hashes, page count, byte count, attempts — must be unchanged.");
console.log("  Project-wide backlog movement is measured and reported, and can never make this run's replay case red.");
