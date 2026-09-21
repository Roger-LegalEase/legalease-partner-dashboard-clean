#!/usr/bin/env node
// Receipt-only continuation of #219's mutation control. Mutations are applied
// in memory by its receipt harness, never to a writer's working files.
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
const verifier = "scripts/test-expungement-consumer-payment-receipt.mjs";
function run(mutation) {
  return spawnSync(process.execPath, [verifier], {
    encoding: "utf8", env: { ...process.env, TASK49_RECEIPT_MUTATION: mutation }
  });
}
const baseline = run("");
assert.equal(baseline.status, 0, baseline.stdout + baseline.stderr);
for (const [mutation, expected] of [
  ["owner", "a different user must receive no receipt existence signal"],
  ["refund", "a refund must preserve the owner-scoped payment-history receipt action"],
  ["legal", "receipt authority must resolve even when legal or artifact presentation is unavailable"],
  ["amount", "history displays collected amount, not list price"]
]) {
  const result = run(mutation);
  assert.equal(result.status, 1, `mutation ${mutation} did not fail as expected`);
  assert.match(result.stderr, /AssertionError/);
  assert.ok(result.stderr.includes(expected), result.stderr);
  console.log(`PASS receipt mutation: ${mutation}`);
}
