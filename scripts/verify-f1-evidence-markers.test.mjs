#!/usr/bin/env node
// Regression tests for the phase-list rule in verify-f1-evidence-markers.
//
// The rule was `doc.migrations.length !== 6`, a literal that went stale the
// moment phase 55 joined the sequence: run 34293728568 applied all seven phases
// with every hash matching and was failed for listing seven. The rule now takes
// the expected phases from the committed staging action, so it cannot rot — and
// these tests exist so it cannot be loosened by accident either. A short phase
// list, a reordered one, a missing recomputed hash and a drifted hash must all
// still be rejected.
//
//   node --test scripts/verify-f1-evidence-markers.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VERIFIER = path.join(ROOT, "scripts/verify-f1-evidence-markers.mjs");
const ACTION = JSON.parse(fs.readFileSync(path.join(ROOT, "data/rcap-staging-action.json"), "utf8"));
const DECLARED = (ACTION.migrationsInApplyOrder ?? ACTION.migrations ?? []).map((m) => ({
  phase: m.phase,
  path: m.path,
  sha256: m.sha256,
}));

/* The marker verifier reads a file; each case writes one and runs it. The
 * evidence body is otherwise a faithful copy of what the stack emits, so a
 * failure here is about the phase rule and not about some unrelated marker. */
const MANDATORY = [
  "baseline_schema_complete", "migration_hashes_match", "migrations_apply_in_order",
  "auth_healthy_real_users", "email_captured_mailpit", "sponsored_partner_seeded",
  "browser_role_person_access_denied", "cross_tenant_access_denied",
  "payment_write_denied_to_participant", "storage_healthy_private", "corruption_detected",
  "worker_digest_runs_and_drains", "route_disabled_by_default",
  "scoped_refused_in_production_runtime", "route_scoped_refuses_outsiders",
  "rollback_restores_disabled",
];

function evidence({ migrations }) {
  const cases = Object.fromEntries(MANDATORY.map((id) => [id, { result: "pass", observed: "measured" }]));
  return {
    schemaVersion: "rcap-f1-stack-evidence/v2",
    generatedAtUtc: "2026-09-09T00:00:00.000Z",
    stagingEnvironmentName: "rcap-ci-staging",
    workflowRunId: "1",
    toolsSha: "0".repeat(40),
    applicationSha: "0".repeat(40),
    workerSourceSha: "0".repeat(40),
    workerDigest: `sha256:${"0".repeat(64)}`,
    baselineSchemaComplete: {
      result: "pass",
      observed: "pre-sequence baseline complete",
      detail: { tables: [], consumerItemColumns: [], missing: [], assertedBeforePhase49: true },
    },
    migrations,
    cases,
    totals: { required: MANDATORY.length, recorded: MANDATORY.length, passed: MANDATORY.length, failed: 0, skipped: 0 },
    results: {},
    syntheticIds: {},
    missingCases: [],
    failedCases: [],
  };
}

function run(migrations) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "f1-markers-"));
  const file = path.join(dir, "evidence.txt");
  const doc = evidence({ migrations });
  fs.writeFileSync(file, `F1_EVIDENCE_JSON_BEGIN\n${JSON.stringify(doc, null, 2)}\nF1_EVIDENCE_JSON_END\n`);
  const r = spawnSync(process.execPath, [VERIFIER, file], { encoding: "utf8" });
  fs.rmSync(dir, { recursive: true, force: true });
  return { code: r.status, out: `${r.stdout}${r.stderr}` };
}

const honest = () => DECLARED.map((m) => ({ phase: m.phase, path: m.path, recorded: m.sha256, actual: m.sha256 }));

test("the exact phase list the staging action declares is accepted", () => {
  const { code, out } = run(honest());
  assert.equal(code, 0, `expected acceptance, got:\n${out}`);
});

test("a short phase list is refused", () => {
  const { code, out } = run(honest().slice(0, -1));
  assert.notEqual(code, 0);
  assert.match(out, /migrations must list exactly/);
});

test("a reordered phase list is refused", () => {
  const swapped = honest();
  [swapped[0], swapped[1]] = [swapped[1], swapped[0]];
  const { code, out } = run(swapped);
  assert.notEqual(code, 0);
  assert.match(out, /migrations must list exactly/);
});

test("a missing recomputed hash is refused", () => {
  const m = honest();
  m[0] = { ...m[0], actual: "" };
  const { code, out } = run(m);
  assert.notEqual(code, 0);
  assert.match(out, /no recomputed sha256/);
});

test("hash drift is refused", () => {
  const m = honest();
  m[0] = { ...m[0], actual: "f".repeat(64) };
  const { code, out } = run(m);
  assert.notEqual(code, 0);
  assert.match(out, /hash drift/);
});

test("the rule tracks the action rather than a literal count", () => {
  assert.ok(DECLARED.length >= 7, `the action declares ${DECLARED.length} phases; this test exists because the rule was pinned to 6`);
  const source = fs.readFileSync(VERIFIER, "utf8");
  assert.ok(!/migrations\.length !== 6/.test(source), "the stale literal count is back");
});
