#!/usr/bin/env node
// Proves the acceptance-sequence verifier is load-bearing.
//
// Each case fakes one way the sequence could stop describing the authorized
// seven, and requires the verifier to go red for the RIGHT reason. The first
// case is the defect that actually existed and shipped unnoticed: the sequence
// stopping at phase 54 while phase 55 sat authorized on disk.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { registerMutationRestore } from "./lib/mutation-restore-guard.mjs";
import { registerTrackedMutation } from "./lib/tracked-mutation-guard.mjs";

const ACTION = "data/rcap-staging-action.json";
const READINESS = "data/rcap-staging-authorization-readiness.json";
const QUEUE = "data/rcap-authorization-queue.json";

registerTrackedMutation("test-rcap-acceptance-migration-sequence-mutations.mjs", [ACTION, READINESS, QUEUE]);

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TRACKED = [ACTION, READINESS, QUEUE];
const originals = new Map(TRACKED.map((rel) => [rel, fs.readFileSync(path.join(rootDir, rel))]));
function restore() { for (const [rel, bytes] of originals) fs.writeFileSync(path.join(rootDir, rel), bytes); }
const disposeGuard = registerMutationRestore(restore);

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(rootDir, rel), "utf8"));
const writeJson = (rel, v) => fs.writeFileSync(path.join(rootDir, rel), `${JSON.stringify(v, null, 2)}\n`);

let caught = 0, failed = 0;
function mutation(name, mutate, marker) {
  restore();
  try { mutate(); } catch (error) {
    console.error(`  ERROR    ${name}: ${error.message}`); failed += 1; restore(); return;
  }
  const run = spawnSync(process.execPath, [path.join(rootDir, "scripts/verify-rcap-acceptance-migration-sequence.mjs")],
    { cwd: rootDir, encoding: "utf8", timeout: 120000 });
  restore();
  const output = `${run.stdout ?? ""}${run.stderr ?? ""}`;
  if (run.status === 0) { console.error(`  SURVIVED ${name}`); failed += 1; return; }
  if (!output.includes(marker)) {
    console.error(`  WRONG    ${name}: red, but not for the expected reason`);
    console.error(`           expected: ${marker}`);
    failed += 1; return;
  }
  caught += 1; console.log(`  caught   ${name}`);
}

// 1 — the real defect: the sequence stops at 54.
mutation("the sequence stops at phase 54", () => {
  const a = readJson(ACTION);
  a.migrationsInApplyOrder = a.migrationsInApplyOrder.filter((e) => e.phase !== 55);
  writeJson(ACTION, a);
}, "sequence_is_exactly_49_through_55_in_order");

// 2 — phase 55 present but reordered ahead of its dependencies.
mutation("phase 55 is reordered before phase 54", () => {
  const a = readJson(ACTION);
  const s = a.migrationsInApplyOrder;
  const i55 = s.findIndex((e) => e.phase === 55), i54 = s.findIndex((e) => e.phase === 54);
  [s[i54], s[i55]] = [s[i55], s[i54]];
  writeJson(ACTION, a);
}, "sequence_is_exactly_49_through_55_in_order");

// 3 — phase 55's recorded hash no longer describes the bytes.
mutation("phase 55's recorded hash is altered", () => {
  const a = readJson(ACTION);
  a.migrationsInApplyOrder.find((e) => e.phase === 55).sha256 = "0".repeat(64);
  writeJson(ACTION, a);
}, "every_recorded_hash_matches_the_bytes_on_disk");

// 4 — the independent second opinion loses phase 55, which is what would let a
// changed migration through on a single edited record.
mutation("the readiness second opinion omits phase 55", () => {
  const r = readJson(READINESS);
  delete r.blockers.find((b) => b.id === "RCAP-SEC-001").resolution.migrationSha256["phase-55"];
  writeJson(READINESS, r);
}, "second_opinion_covers_and_agrees_with_every_phase");

// 5 — the two records disagree about the same phase.
mutation("the two records disagree on phase 55", () => {
  const r = readJson(READINESS);
  r.blockers.find((b) => b.id === "RCAP-SEC-001").resolution.migrationSha256["phase-55"] = "1".repeat(64);
  writeJson(READINESS, r);
}, "second_opinion_covers_and_agrees_with_every_phase");

// 6 — phase 55 loses its approved authorization.
mutation("phase 55's authorization is not approved", () => {
  const q = readJson(QUEUE);
  q.entries.find((e) => e.id === "auth-2026-08-16-pr101-release-integration").decision = "pending";
  writeJson(QUEUE, q);
}, "every_phase_is_pinned_by_an_approved_authorization");

// 7 — the authorization stops pinning phase 55's bytes.
mutation("the authorization no longer pins phase 55's bytes", () => {
  const q = readJson(QUEUE);
  const e = q.entries.find((x) => x.id === "auth-2026-08-16-pr101-release-integration");
  const i = e.authorizedPaths.indexOf("supabase/phase-55-expungement-matter-payment-binding.sql");
  e.authorizedSha256[i] = "2".repeat(64);
  writeJson(QUEUE, e && q);
}, "every_phase_is_pinned_by_an_approved_authorization");

// 8 — an empty sequence must never read as "nothing to do".
mutation("the sequence is emptied entirely", () => {
  const a = readJson(ACTION);
  a.migrationsInApplyOrder = [];
  writeJson(ACTION, a);
}, "sequence_is_exactly_49_through_55_in_order");

restore();
disposeGuard();
for (const [rel, bytes] of originals) {
  if (!fs.readFileSync(path.join(rootDir, rel)).equals(bytes)) {
    console.error(`  DIRTY    ${rel} was not restored`); failed += 1;
  }
}
console.log("");
if (failed > 0) { console.error(`test-rcap-acceptance-migration-sequence-mutations FAILED: ${failed} did not hold.`); process.exit(1); }
console.log(`test-rcap-acceptance-migration-sequence-mutations passed: ${caught}/${caught} mutations red, files restored.`);
