await import("./verify-rcap-il-delivery-binding.mjs");
// SQL <-> fixture <-> TypeScript parity for the packet render job contract.
//
// The shared fixture data/rcap-render/state-machine.json is the single
// contract artifact. The unified migration sequence carries the machine twice
// — phase 49's CASE-form guard and phase 50's replacement clause-form guard —
// and the TypeScript RENDER_JOB_TRANSITIONS map carries it a third time. All
// three are verified against the fixture here, so none can drift. The
// exact-path authorization guard executes this script before it honors any
// authorized supabase/ change, so drift also voids the authorization.
//
// Mutation stance: both SQL comparisons parse the transition rules out of the
// migration text and reconstruct the machine; deleting a guard clause, adding
// a transition, or reordering statuses turns this red.
import fs from "node:fs";
import path from "node:path";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
register("./lib/ts-esm-loader.mjs", import.meta.url);

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
function assert(condition, message) {
  if (!condition) failures.push(message);
}

const fixture = JSON.parse(fs.readFileSync(path.join(rootDir, "data/rcap-render/state-machine.json"), "utf8"));
const sql = fs.readFileSync(path.join(rootDir, "supabase/phase-50-rcap-packet-delivery-hardening.sql"), "utf8");
const sql49 = fs.readFileSync(path.join(rootDir, "supabase/phase-49-rcap-packet-render-jobs.sql"), "utf8");
const contract = await import("../src/lib/rcap/render/job-contract.ts");

const fixtureStatuses = [...fixture.statuses].sort();
const fixtureTransitions = fixture.transitions;

// --- TypeScript against the fixture ----------------------------------------

const tsStatuses = [...contract.RENDER_JOB_STATUSES].sort();
assert(
  JSON.stringify(tsStatuses) === JSON.stringify(fixtureStatuses),
  `TS statuses ${JSON.stringify(tsStatuses)} != fixture ${JSON.stringify(fixtureStatuses)}`
);

for (const status of fixture.statuses) {
  const fixtureTargets = [...(fixtureTransitions[status] ?? [])].sort();
  const tsTargets = [...(contract.RENDER_JOB_TRANSITIONS[status] ?? [])].sort();
  assert(
    JSON.stringify(tsTargets) === JSON.stringify(fixtureTargets),
    `TS transitions from ${status}: ${JSON.stringify(tsTargets)} != fixture ${JSON.stringify(fixtureTargets)}`
  );
}

// canTransition agrees with the fixture over the full status product.
for (const from of fixture.statuses) {
  for (const to of fixture.statuses) {
    const fixtureAllows = from === to || (fixtureTransitions[from] ?? []).includes(to);
    const tsAllows = contract.canTransition(from, to);
    assert(
      fixtureAllows === tsAllows,
      `canTransition(${from}, ${to}) = ${tsAllows}, fixture says ${fixtureAllows}`
    );
  }
}

const fixtureCreditable = [...(fixture.creditableStatuses ?? [])].sort();
const tsCreditable = [...contract.CREDIT_ELIGIBLE_STATUSES].sort();
assert(
  JSON.stringify(tsCreditable) === JSON.stringify(fixtureCreditable),
  `TS creditable statuses ${JSON.stringify(tsCreditable)} != fixture ${JSON.stringify(fixtureCreditable)}`
);

// --- SQL against the fixture ------------------------------------------------

// Reconstruct the machine from the trigger's clauses:
//   (old.status = 'a' and new.status in ('b', 'c'))
//   (old.status = 'a' and new.status = 'b')
const sqlTransitions = {};
for (const status of fixture.statuses) sqlTransitions[status] = new Set();

const clausePattern = /old\.status = '([a-z_]+)' and new\.status (?:in \(([^)]+)\)|= '([a-z_]+)')/g;
const guardSection = sql.slice(sql.indexOf("guard_packet_render_job_transition"), sql.indexOf("guard_packet_render_job_delete"));
// Only the legality block defines the machine; authority clauses reuse the
// same shapes, so restrict to the block before the first authority check.
const legalityBlock = guardSection.slice(0, guardSection.indexOf("claim_packet_render_job"));
let match;
while ((match = clausePattern.exec(legalityBlock)) !== null) {
  const from = match[1];
  const targets = match[3] ? [match[3]] : match[2].split(",").map((part) => part.replaceAll("'", "").trim());
  for (const to of targets) sqlTransitions[from]?.add(to);
}

for (const status of fixture.statuses) {
  const fixtureTargets = [...(fixtureTransitions[status] ?? [])].sort();
  const sqlTargets = [...(sqlTransitions[status] ?? [])].sort();
  assert(
    JSON.stringify(sqlTargets) === JSON.stringify(fixtureTargets),
    `SQL transitions from ${status}: ${JSON.stringify(sqlTargets)} != fixture ${JSON.stringify(fixtureTargets)}`
  );
}

// Phase 49's CASE-form guard also matches the fixture: the sequence carries
// one machine, twice.
{
  const caseBlock = /allowed := case old\.status([\s\S]*?)end;/.exec(sql49);
  assert(caseBlock !== null, "phase-49 transition CASE block must be present");
  if (caseBlock) {
    const sql49Transitions = {};
    for (const m of caseBlock[1].matchAll(/when\s+'([a-z_]+)'\s+then\s+array\[([^\]]*)\]/g)) {
      sql49Transitions[m[1]] = [...m[2].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]).sort();
    }
    for (const status of fixture.statuses) {
      const fixtureTargets = [...(fixtureTransitions[status] ?? [])].sort();
      const got = [...(sql49Transitions[status] ?? [])].sort();
      assert(
        JSON.stringify(got) === JSON.stringify(fixtureTargets),
        `phase-49 transitions from ${status}: ${JSON.stringify(got)} != fixture ${JSON.stringify(fixtureTargets)}`
      );
    }
  }
}

// The status CHECK constraint (defined in phase 49) carries exactly the
// fixture statuses.
const statusCheck = sql49.match(/constraint packet_render_jobs_status_check check \(\s*status in \(([^)]+)\)/s);
assert(statusCheck !== null, "phase-49 must constrain status to the fixture statuses");
if (statusCheck) {
  const sqlStatuses = statusCheck[1].split(",").map((part) => part.replaceAll("'", "").trim()).sort();
  assert(
    JSON.stringify(sqlStatuses) === JSON.stringify(fixtureStatuses),
    `SQL status check ${JSON.stringify(sqlStatuses)} != fixture ${JSON.stringify(fixtureStatuses)}`
  );
}

// Creditable statuses appear in SQL as the delivery-eligibility gate.
assert(
  /status in \('artifact_validated', 'delivered'\)/.test(sql),
  "SQL must gate eligibility on the fixture's creditable statuses"
);

if (failures.length > 0) {
  console.error("verify-rcap-render-job-contract FAILED");
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log("verify-rcap-render-job-contract passed: fixture, SQL and TypeScript agree.");
