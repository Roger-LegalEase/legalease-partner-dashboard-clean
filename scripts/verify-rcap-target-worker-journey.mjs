#!/usr/bin/env node
// The hosted payment harness must follow THIS RUN'S job, and must know when it
// is not.
//
//   node scripts/verify-rcap-target-worker-journey.mjs
//   node scripts/verify-rcap-target-worker-journey.mjs --mutations
//
// Hosted run 32393413747 spent a real Stripe Sandbox Checkout, a signed
// webhook, a durable render job and four worker cycles, and then reported
// `profile_version_unknown` against a profile version the published image
// demonstrably admits. The image was never at fault. `claim_packet_render_job`
// is UNSCOPED to the acceptance run:
//
//   where status = 'queued'
//     and (next_attempt_at is null or next_attempt_at <= now())
//     and renderer_kind = any (...)
//   order by created_at
//   for update skip locked
//   limit 1
//
// It hands out the oldest currently-claimable job in the whole project. Jobs
// abandoned by earlier runs are still queued, still claimable and still older,
// so a fresh run's first cycles are spent on other runs' backlog — and the run
// then read those cycles as though they were its own.
//
// Four things must hold for that to be impossible rather than unlikely:
//
//   1. the target is the id the paid render 202 returned, and nothing else;
//   2. every cycle is attributed to a specific row BEFORE it is interpreted;
//   3. only a cycle proven to have claimed the target may satisfy or fail a
//      target case, or supply artifact, delivery or replay evidence;
//   4. the number of cycles is DERIVED from the measured backlog, with an
//      explicit wait budget, and every giving-up path has a name.
//
// Each check below is bound to the comparison that decides the behaviour, not
// to a mention of it. A check satisfied by a comment, a declaration or a call
// site would pass while the behaviour it polices was deleted — this file has
// been rewritten twice for exactly that reason.
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

function failures(harness) {
  const out = [];
  const fail = (condition, message) => { if (!condition) out.push(message); };

  // --- 1. the target comes from the 202, and from nowhere else ---------------
  fail(/targetJobId = returnedJobId/.test(harness),
    "the target job id is not taken from the paid render response");
  fail(/const returnedJobId = typeof res\.json\?\.jobId === "string"/.test(harness),
    "the paid render response's jobId is not read as an exact string identity");
  // A 202 with no job id must stop the run: there would be nothing to follow.
  fail(/if \(res\.status !== 202 \|\| returnedJobId === null\) finish\(\);/.test(harness),
    "a paid render that names no job does not stop the run, so the journey below would have to guess which row is the target");
  // The job read is by identity. Reading by briefcase item silently switches
  // rows when a webhook replay enqueues a second job for the same item.
  fail(/from public\.packet_render_jobs\s*\n\s*where id = '\$\{sqlText\(jobId\)\}'/.test(harness),
    "the job read is not bound to the exact target job id");
  fail(!/from public\.packet_render_jobs\s*\n\s*where briefcase_item_id = '\$\{sqlText\(itemId\)\}'\s*\n\s*order by created_at desc/.test(harness),
    "the job read still selects the newest job for the briefcase item, which changes row when a replay enqueues a second one");

  // --- 2. every cycle is attributed before it is interpreted ----------------
  fail(/function classifyCycle\(/.test(harness) && /classifyCycle\(cycleResult, changedRows, jobId\)/.test(harness),
    "cycles are not classified against the target");
  for (const classification of ["target_cycle", "backlog_cycle", "no_job", "claimed_identity_unproven"]) {
    fail(harness.includes(`"${classification}"`), `the cycle classification vocabulary is missing ${classification}`);
  }
  // Identity from the worker's own account first, the row-state diff second.
  fail(/claimedJobId: fromStdout/.test(harness),
    "the claimed job id is not taken from the worker's own cycle result");
  fail(/function rowsThatChanged\(/.test(harness) && /rowsThatChanged\(claimBefore, claimAfter\)/.test(harness),
    "there is no row-state fallback for a cycle that emitted nothing parsable");
  // More than one row moved => unprovable, never a guess at the likeliest.
  fail(/changedRows\.length === 1/.test(harness),
    "the row-state fallback does not require exactly one row to have moved");
  fail(/classification: "claimed_identity_unproven"[\s\S]{0,120}\};\s*\n\}/.test(harness)
    || /\$\{changedRows\.length\} job rows moved/.test(harness),
    "a cycle in which several rows moved is not reported as unattributable");

  // --- 3. a backlog cycle may not mean anything about this run --------------
  // The decisive line: finalCycleResult is assigned from the journey's
  // target-only cycle result, never from whatever the last cycle emitted.
  fail(/finalCycleResult = journey\.targetCycleResult;/.test(harness),
    "the run's cycle result is not restricted to a cycle that provably claimed the target");
  fail(!/if \(cycleResult\) finalCycleResult = cycleResult;/.test(harness),
    "the run still adopts any cycle's result as its own, so a backlog job's failure can be reported as this run's");
  fail(/journey\.targetCycles \+= 1;\s*\n\s*journey\.targetCycleResult = cycleResult;/.test(harness),
    "the target cycle result is not set at the point a cycle is proven to have claimed the target");
  fail(/target_cycle_observed: journey\.targetCycles > 0/.test(harness),
    "the worker verdict does not require a cycle that provably claimed the target");
  fail(/every_cycle_attributed_to_a_job: journey\.unprovenCycles === 0/.test(harness),
    "the worker verdict tolerates a cycle that could not be attributed to any job");
  // The delivery case must ask for the target, not for whatever was last read.
  fail(/const jobId = targetJobId;/.test(harness),
    "the delivery case does not download the target job");
  fail(!/const jobId = finalJob\?\.id \?\? evidence\.render\?\.jobId/.test(harness),
    "the delivery case still falls back to the last job the journey looked at");

  // --- 4. the bound is derived, the budget is explicit, failures are typed ---
  fail(!/for \(let cycle = 1; cycle <= 4; cycle \+= 1\)/.test(harness),
    "the worker still runs a hardcoded four cycles rather than a bound derived from the backlog");
  fail(/boundCeiling = initialClaimablePredecessors \+ 1 \+ QUEUE_CHURN_ALLOWANCE/.test(harness),
    "the cycle bound is not derived from the measured claimable predecessors plus one target cycle plus a declared churn allowance");
  fail(/cycleBound = Math\.min\(boundCeiling,/.test(harness),
    "the cycle bound is not recomputed against the declared ceiling after each cycle");
  // The predicate must mirror the live claim function, all three conditions in
  // order. Checking them separately, or anywhere in the file, is satisfied by
  // the comment that quotes the function and by a second query that happens to
  // filter on renderer_kind for its own reasons — so the whole predicate is
  // matched as one shape, in the place that feeds the claim-order read.
  fail(/status = 'queued'\s*\n\s+and \(next_attempt_at is null or next_attempt_at <= now\(\)\)\s*\n\s+\$\{rendererKind \? `and renderer_kind = '\$\{sqlText\(rendererKind\)\}'` : ""\}/.test(harness),
    "the claimable predicate does not apply, in order, the exact three conditions the live claim function applies — queued alone over-counts the backlog, and dropping the renderer-kind filter counts jobs this worker would never be handed");
  fail(/order by created_at\s*\n\s*limit 200/.test(harness),
    "the claim order is not read in the order the claim function walks it");
  // Waiting is to a canonical instant, inside a declared budget.
  fail(/function canonicalWakeInstant\(/.test(harness) && /await canonicalWakeInstant\(jobId, journey\.rendererKind\)/.test(harness),
    "the journey does not sleep to an instant the queue itself is waiting on");
  fail(/journey\.waitedMs \+ waitMs > WAIT_BUDGET_MS/.test(harness),
    "there is no declared wait budget bounding how long the journey may sleep");
  for (const code of [
    "acceptance_backlog_did_not_converge",
    "acceptance_backlog_predecessor_repeated",
    "acceptance_target_claim_identity_unproven",
    "acceptance_target_terminal_failure",
    "acceptance_wait_budget_exhausted"
  ]) fail(harness.includes(code), `the journey has no typed failure named ${code}`);

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
    ["the target is inferred from the worker cycle instead of the 202", (h) =>
      h.replace("finalCycleResult = journey.targetCycleResult;", "finalCycleResult = journey.targetCycleResult ?? null;\n  if (diagnostics.cycles.at(-1)?.cycleResult) finalCycleResult = diagnostics.cycles.at(-1).cycleResult;")],
    ["a backlog cycle's result is adopted as this run's", (h) =>
      h.replace("    journey.targetCycleResult = cycleResult;", "    journey.targetCycleResult = cycleResult;\n    if (cycleResult) finalCycleResult = cycleResult;")],
    ["the job read goes back to the newest job for the briefcase item", (h) =>
      h.replace("     where id = '${sqlText(jobId)}'", "     where briefcase_item_id = '${sqlText(itemId)}'\n     order by created_at desc limit 1")],
    ["the delivery case falls back to the last job the journey read", (h) =>
      h.replace("  const jobId = targetJobId;", "  const jobId = finalJob?.id ?? evidence.render?.jobId ?? null;")],
    ["the cycle bound is hardcoded to four again", (h) =>
      h.replace("boundCeiling = initialClaimablePredecessors + 1 + QUEUE_CHURN_ALLOWANCE", "boundCeiling = 4")],
    ["the bound stops being recomputed against its ceiling", (h) =>
      h.replace("cycleBound = Math.min(boundCeiling,", "cycleBound = Math.max(boundCeiling,")],
    // Anchored on the newline so the mutation lands on the PREDICATE and not on
    // the comment above it that quotes the same SQL. A mutation that edits a
    // comment proves nothing about behaviour.
    ["the claimable predicate drops next_attempt_at", (h) =>
      h.replace("\n       and (next_attempt_at is null or next_attempt_at <= now())", "")],
    ["the claimable predicate drops the renderer-kind filter", (h) =>
      h.replace("\n       ${rendererKind ? `and renderer_kind = '${sqlText(rendererKind)}'` : \"\"}", "")],
    ["a verdict no longer requires a cycle that claimed the target", (h) =>
      h.replace("target_cycle_observed: journey.targetCycles > 0", "target_cycle_observed: true")],
    ["an unattributable cycle stops failing the verdict", (h) =>
      h.replace("every_cycle_attributed_to_a_job: journey.unprovenCycles === 0", "every_cycle_attributed_to_a_job: true")],
    ["the row-state fallback accepts several moved rows", (h) =>
      h.replace("  if (changedRows.length === 1) {", "  if (changedRows.length >= 1) {")],
    ["the wait budget stops bounding the journey", (h) =>
      h.replace("if (journey.waitedMs + waitMs > WAIT_BUDGET_MS) {", "if (false) {")],
    ["a 202 that names no job no longer stops the run", (h) =>
      h.replace("  if (res.status !== 202 || returnedJobId === null) finish();", "")],
    ["the backlog-convergence failure loses its name", (h) =>
      h.replace(/acceptance_backlog_did_not_converge/g, "failed")]
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
    console.error(`\nverify-rcap-target-worker-journey FAILED — ${undetected} mutation(s) undetected.`);
    process.exit(1);
  }
  console.log(`\nThe hosted harness cannot report another run's job as its own (${M.length}/${M.length}).`);
  process.exit(0);
}

if (base.length > 0) {
  console.error(`verify-rcap-target-worker-journey FAILED — ${base.length} problem(s):\n`);
  for (const p of base) console.error(` - ${p}`);
  process.exit(1);
}

console.log("verify-rcap-target-worker-journey passed.");
console.log("  The target is the job id the paid render 202 returned, and nothing may infer it from a worker cycle.");
console.log("  Every cycle is attributed to a row before it is interpreted; an unattributable cycle fails rather than passing.");
console.log("  Only a cycle proven to have claimed the target may satisfy or fail a target case.");
console.log("  The cycle count is derived from the measured claimable backlog, and every giving-up path has a typed name.");
