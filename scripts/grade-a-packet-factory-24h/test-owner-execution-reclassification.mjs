#!/usr/bin/env node
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const master = JSON.parse(fs.readFileSync(path.join(root, "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json"), "utf8"));

const genuineLegal = new Set([]);
const approvedFive = new Map([
  ["composed-treatment:nd-nonconviction-auto-close-verify", "FAIL_REPAIR_REQUIRED"],
  ["hi_712_1200_deferred_expungement-set", "SOURCE_READY"],
  ["ky_felony_expungement_after_pardon-set", "SOURCE_BLOCKED"],
  ["ne-trafficking-setaside-and-seal-set", "PRODUCT_PATH_PENDING"],
  ["wa_vac_homicide_victim_prostitution-set", "FAIL_REPAIR_REQUIRED"]
]);
const reclassified = new Set([
  "ca-prop64-set", "in_infraction_nondisclosure-set", "ms-fel-set",
  "sc_17_22_950_summary-set", "ut_pet_limitations-set", "ut_pet_traffic-set",
  "az_record_sealing_arrest_no_charges-set", "az_record_sealing_dismissal_not_guilty-set",
  "co_decriminalized_conduct_seal-set", "ky_misdemeanor_expungement-set",
  "ne-setaside-noncustodial-set", "or_contempt_setaside-set", "pa_6308_underage-set",
  "wa_vac_substance_use_disorder-set", "wi_exp_cr266-set", "wv_nc_acquittal_dismissal-set",
  "co_motion_seal_conviction-set", "ga-jail-k2-set", "ma-bmc-multi-set",
  "vt_seal_under_25-set", "wa_blake_vacatur_and_lfo_refund-set",
  "rcap-oh-custom-pleading-clean-tracks"
]);

const legal = new Set(master.families.filter((f) => f.state === "LEGAL_BLOCKED").map((f) => f.familyId));
assert.deepEqual([...legal].sort(), [...genuineLegal].sort(), "no answered September 4 counsel matter may remain LEGAL_BLOCKED");
for (const [familyId, expectedState] of approvedFive) {
  const row = master.families.find((f) => f.familyId === familyId);
  assert.ok(row, `missing approved family ${familyId}`);
  assert.equal(row.state, expectedState, `${familyId} did not enter its exact approved execution state`);
  assert.equal(row.counselDesignApproval?.reviewer, "Lawrence Blackmon", `${familyId} does not bind the reviewer`);
  assert.equal(row.counselDesignApproval?.outputApprovalRequired, true, `${familyId} must still require exact-output approval`);
  assert.equal(row.counselDesignApproval?.productionAuthorized, false, `${familyId} must remain closed in Production`);
}
for (const familyId of reclassified) {
  const row = master.families.find((f) => f.familyId === familyId);
  assert.ok(row, `missing family ${familyId}`);
  assert.notEqual(row.state, "LEGAL_BLOCKED", `${familyId} was not moved to execution`);
  assert.ok(row.executionOwner || row.activeOwner, `${familyId} has no exact execution owner`);
  assert.ok(row.nextExecutableAction, `${familyId} has no exact next executable action`);
}

const indiana = master.families.find((f) => f.familyId === "in_infraction_nondisclosure-set");
assert.equal(indiana.selectedIndependentVerdict?.verdict, "FAIL_REPAIR_REQUIRED",
  "the post-repair Indiana reread must be selected");
assert.equal(indiana.state, "FAIL_REPAIR_REQUIRED",
  "a returned post-repair FAIL must outrank the historical reread instruction");
console.log("PASS owner moved 22 false legal holds into exact executable ownership");
