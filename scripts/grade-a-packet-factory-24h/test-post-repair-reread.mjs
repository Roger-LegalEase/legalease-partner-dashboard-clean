#!/usr/bin/env node
import assert from "node:assert/strict";
import { canRereadAfterRepair } from "./post-repair-reread.mjs";

const valid = {
  state: "VERIFY_PENDING",
  completedRepairMatchesFailure: true,
  repairEvidenceChangedAfterVerdict: true,
  artifactsChangedAfterVerdict: true,
  allNineCountersZero: true,
  releasedRepairGrantExists: true,
  liveRepairGrantExists: false,
  liveVerificationGrantExists: true,
  verificationDispatchExists: true
};

assert.equal(canRereadAfterRepair(valid), true, "a fully evidenced reread must remain executable");
for (const key of Object.keys(valid)) {
  const broken = { ...valid };
  broken[key] = key === "state" ? "FAIL_REPAIR_REQUIRED" : !valid[key];
  assert.equal(canRereadAfterRepair(broken), false, `${key} must be required`);
}

console.log("OK post-repair reread requires every causal and executable prerequisite");
