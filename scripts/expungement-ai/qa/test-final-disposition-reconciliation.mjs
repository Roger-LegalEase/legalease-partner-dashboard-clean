#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const outputDir = path.join(root, "data/expungement-ai/flow-audit");
const summary = JSON.parse(
  fs.readFileSync(path.join(outputDir, "FINAL_CANDIDATE_RECONCILIATION.json"), "utf8")
);
const manifest = JSON.parse(
  fs.readFileSync(path.join(outputDir, "flow-manifest.json"), "utf8")
);
const dispositions = JSON.parse(
  fs.readFileSync(
    path.join(outputDir, "phase4-corrections/final-flow-dispositions.json"),
    "utf8"
  )
);

assert.equal(summary.schemaVersion, "expai-final-candidate-reconciliation/v1");
assert.equal(summary.flows, 356);
assert.equal(summary.originalExecutableDeviceVariants, 650);
assert.equal(summary.originalExecutableDeviceVariantsPassed, 650);
assert.equal(summary.formerlyHeldDeviceVariants, 62);
assert.equal(summary.formerlyHeldDeviceVariantsResolved, 62);
assert.equal(summary.totalConcreteDeviceVariants, 712);
assert.equal(summary.browserRequiredVariants, 650);
assert.equal(summary.runtimeReconciledVariants, 62);
assert.deepEqual(summary.remainingHolds, {
  legal: 0,
  correction: 0,
  environment: 0,
  replayMismatch: 0
});
assert.deepEqual(summary.intendedPathwayReplay, { passed: 356, failed: 0 });
assert.equal(manifest.flows.length, 356);
assert.equal(dispositions.rows.length, 356);
assert.equal(manifest.flows.every((flow) => flow.fixture.reproducesTerminal), true);
assert.equal(
  dispositions.rows.every(
    (row) => row.disposition === "READY_FOR_HOSTED_ACCEPTANCE"
  ),
  true
);

const allowed = new Set([
  "packet",
  "guidance",
  "automatic_no_filing",
  "attorney_review_referral",
  "not_yet",
  "needs_information",
  "intentionally_unsupported_complete_service_path"
]);
assert.equal(
  summary.rows.every((row) => allowed.has(row.serviceBehavior)),
  true,
  "every flow must have an approved concrete service behavior"
);
assert.equal(
  summary.rows.some((row) => /hold/i.test(row.serviceBehavior)),
  false,
  "a hold cannot be renamed into a service behavior"
);

const formerMismatchCounts = summary.rows
  .filter((row) => row.formerReplayMismatch)
  .reduce((counts, row) => {
    counts[row.serviceBehavior] = (counts[row.serviceBehavior] ?? 0) + 1;
    return counts;
  }, {});
assert.deepEqual(formerMismatchCounts, {
  attorney_review_referral: 15,
  guidance: 14,
  packet: 2
});

for (const flowId of [
  "EXPAI-DC-ce1b907b71",
  "EXPAI-PA-b248648fdc",
  "EXPAI-PA-4d793b6257"
]) {
  const row = summary.rows.find((candidate) => candidate.flowId === flowId);
  assert.ok(row, `${flowId} must be in the final reconciliation`);
  assert.equal(row.runtimeReplayPassed, true, `${flowId} must replay exactly`);
}

console.log(
  "final-disposition-reconciliation: GREEN "
    + "(356 flows; 650/650 original variants; 62/62 former holds resolved)"
);
