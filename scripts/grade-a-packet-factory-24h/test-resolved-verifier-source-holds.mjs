#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (name) => JSON.parse(fs.readFileSync(path.join(
  ROOT, "data/rcap-grade-a/packet-factory-24h", name), "utf8"));
const master = read("MASTER_QUEUE.json");
const checkpoint = read("CHECKPOINT.json");
const byId = new Map(master.families.map((family) => [family.familyId, family]));

const expected = new Map([
  ["ca-prop64-set", "LEGAL_BLOCKED"],
  ["tx_exp_acquittal-set", "FAIL_REPAIR_REQUIRED"],
  ["tx_nd_conviction_no_supervision-set", "FAIL_REPAIR_REQUIRED"],
]);

for (const [familyId, expectedState] of expected) {
  const family = byId.get(familyId);
  assert(family, `${familyId} is absent from MASTER_QUEUE.json`);
  assert.equal(family.sourceReadiness?.ready, true,
    `${familyId} is not a resolved-source test subject`);
  assert.equal(family.selectedIndependentVerdict?.verdict, "BLOCKED_SOURCE",
    `${familyId} no longer carries the verifier source hold this regression exercises`);
  assert.equal(family.state, expectedState,
    `${familyId} kept stale state ${family.state} after central custody resolved its source`);
}

assert.equal(checkpoint.sourceBlocked, checkpoint.states.SOURCE_BLOCKED,
  "CHECKPOINT top-level sourceBlocked disagrees with states.SOURCE_BLOCKED");
console.log("OK resolved verifier source holds leave SOURCE_BLOCKED without losing real packet or legal defects");
