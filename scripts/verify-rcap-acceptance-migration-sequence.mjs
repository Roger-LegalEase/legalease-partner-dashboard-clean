#!/usr/bin/env node
// The acceptance migration sequence must be exactly 49 → 55, in order, agreeing
// across every record that governs it.
//
// The defect this exists to prevent already existed: the canonical generator's
// SEQUENCE stopped at phase 54 while phase 55 — the migration that binds a
// consumer payment to one matter — sat authorized and frozen on disk. The apply
// path would have run to completion, the readback would have passed, and the
// acceptance environment would have been declared ready while the payment
// binding it exists to prove was simply absent. Stopping one short of the
// security property is worse than not running at all, because it looks green.

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED_PHASES = [49, 50, 51, 52, 53, 54, 55];
const ACCEPTANCE_PROJECT_REF = "hyflxnlhpmiqxvvcoiia";

const failures = [];
let checks = 0;
function check(name, ok, detail) {
  checks += 1;
  if (ok) console.log(`  ok   ${name} — ${detail}`);
  else { failures.push(`${name}: ${detail}`); console.error(`  FAIL ${name} — ${detail}`); }
}

const read = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const sha256File = (rel) => crypto.createHash("sha256").update(fs.readFileSync(path.join(rootDir, rel))).digest("hex");

const action = read("data/rcap-staging-action.json");
const readiness = read("data/rcap-staging-authorization-readiness.json");
const queue = read("data/rcap-authorization-queue.json");
const sequence = action.migrationsInApplyOrder ?? [];

// 1 — exact phases, exact order.
const phases = sequence.map((e) => e.phase);
check(
  "sequence_is_exactly_49_through_55_in_order",
  JSON.stringify(phases) === JSON.stringify(EXPECTED_PHASES),
  `expected ${EXPECTED_PHASES.join(" → ")}; found ${phases.join(" → ") || "(empty)"}`
);

// 2 — the sequence does not stop before the payment binding.
check(
  "sequence_does_not_stop_before_phase_55",
  phases[phases.length - 1] === 55,
  `last phase is ${phases[phases.length - 1] ?? "(none)"}; phase 55 carries the matter-level payment binding and must be last`
);

// 3 — every recorded hash equals the bytes on disk.
const diskDrift = sequence.filter((e) => sha256File(e.path) !== e.sha256);
check(
  "every_recorded_hash_matches_the_bytes_on_disk",
  diskDrift.length === 0,
  diskDrift.length === 0
    ? `${sequence.length} migrations recomputed from disk`
    : `drift: ${diskDrift.map((e) => `phase ${e.phase}`).join(", ")}`
);

// 4 — the independent second opinion covers every phase and agrees.
const secondOpinion = readiness.blockers?.find((b) => b.id === "RCAP-SEC-001")?.resolution?.migrationSha256 ?? {};
const missingSecond = sequence.filter((e) => !secondOpinion[`phase-${e.phase}`]);
const disagreeing = sequence.filter((e) => secondOpinion[`phase-${e.phase}`] && secondOpinion[`phase-${e.phase}`] !== e.sha256);
check(
  "second_opinion_covers_and_agrees_with_every_phase",
  missingSecond.length === 0 && disagreeing.length === 0,
  missingSecond.length === 0 && disagreeing.length === 0
    ? `readiness records all ${sequence.length} hashes and each matches the staging action`
    : `missing: ${missingSecond.map((e) => e.phase).join(", ") || "none"}; disagreeing: ${disagreeing.map((e) => e.phase).join(", ") || "none"}`
);

// 5 — every phase is backed by an approved authorization pinning those bytes.
const byId = new Map((queue.entries ?? []).map((e) => [e.id, e]));
const unauthorized = sequence.filter((e) => {
  const auth = byId.get(e.authorizationId);
  if (!auth || auth.decision !== "approved") return true;
  const idx = (auth.authorizedPaths ?? []).indexOf(e.path);
  return idx < 0 || (auth.authorizedSha256 ?? [])[idx] !== e.sha256;
});
check(
  "every_phase_is_pinned_by_an_approved_authorization",
  unauthorized.length === 0,
  unauthorized.length === 0
    ? `all ${sequence.length} phases pinned by approved authorizations`
    : `unbacked: ${unauthorized.map((e) => `phase ${e.phase}`).join(", ")}`
);

// 6 — the apply tool is pinned to the acceptance project and cannot be pointed
// at another, which is the difference between a staging exercise and an
// unauthorized production migration.
const migrateSource = fs.readFileSync(path.join(rootDir, "scripts/rcap-hosted-acceptance-migrate.mjs"), "utf8");
check(
  "apply_tool_derives_its_sequence_rather_than_hardcoding_one",
  migrateSource.includes("action.migrationsInApplyOrder"),
  "rcap-hosted-acceptance-migrate.mjs reads migrationsInApplyOrder, so extending the canonical sequence extends the apply path"
);
check(
  "acceptance_project_ref_is_pinned_in_the_workflows",
  fs.readFileSync(path.join(rootDir, ".github/workflows/rcap-hosted-acceptance-staging.yml"), "utf8")
    .includes(`AUTHORIZED_ACCEPTANCE_PROJECT_REF: ${ACCEPTANCE_PROJECT_REF}`),
  `the hosted workflow refuses any supabase_project_ref other than ${ACCEPTANCE_PROJECT_REF}`
);

console.log("");
if (failures.length > 0) {
  console.error(`verify-rcap-acceptance-migration-sequence FAILED: ${failures.length} of ${checks}.`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`verify-rcap-acceptance-migration-sequence passed: ${checks}/${checks} — phases ${phases.join(" → ")}.`);
