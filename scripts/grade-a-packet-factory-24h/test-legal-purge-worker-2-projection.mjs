#!/usr/bin/env node
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const read = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const queue = read("data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json");
const returns = read("data/rcap-grade-a/packet-factory-24h/VERIFIER_RETURNS.json");
const reclassification = read("data/rcap-grade-a/legal-decisions/LEGAL_HOLD_RECLASSIFICATION_2026-09-04.json");

const family = (id) => queue.families.find((row) => row.familyId === id);

const indiana = family("in_infraction_nondisclosure-set");
assert.equal(indiana.state, "VERIFY_PENDING");
assert.equal(indiana.legalInputStatus, "SETTLED");
assert.equal(indiana.legalInputBasis, null);
assert.equal(indiana.ownerCorrectionRequired.fromQuestion, "Q7-required-component-deliberately-absent");
assert.equal(indiana.legalHoldReclassification.disposition, "POST_REPAIR_REREAD_REQUIRED");
assert.equal(indiana.verificationLapsedBecause.lapse, "FAMILY_MOVED_SINCE_THE_VERDICT");

const californiaRows = returns.rows.filter((row) => row.familyId === "ca-prop64-set");
const historicalSourceBlock = californiaRows.find((row) => row.lane === "vf02" && row.verdict === "BLOCKED_SOURCE");
const selectedVf12 = californiaRows.find((row) => row.lane === "vf12" && row.verdict === "PASS_COMPLETE_INDEPENDENT");
assert.equal(historicalSourceBlock.superseded, true);
assert.equal(selectedVf12.superseded, false);
assert.equal(selectedVf12.chronologySelection.disposition, "SELECT_SUBSTANTIVE_VERDICT");

const californiaDecision = reclassification.families.find((row) => row.familyId === "ca-prop64-set");
assert.equal(californiaDecision.historicalVerdictPreserved.verifiedAtBase, historicalSourceBlock.verifiedAtBase);
assert.equal(californiaDecision.selectedVerdict.verifiedAtBase, selectedVf12.verifiedAtBase);
assert.equal(californiaDecision.currentByteBinding.bindsSelectedVerdict, false);
assert.notDeepEqual(
  californiaDecision.currentByteBinding.selectedBasePrimaryHashes,
  californiaDecision.currentByteBinding.currentPrimaryHashes
);
const currentPrimaryPaths = [
  "fixtures/hs-11361-8-completed-sentence-application-canonical/cr-400-filled.pdf",
  "fixtures/hs-11361-8-completed-sentence-application-boundary/cr-400-filled.pdf",
  "fixtures/hs-11361-8-currently-serving-petition-canonical/cr-400-filled.pdf",
  "fixtures/hs-11361-8-currently-serving-petition-boundary/cr-400-filled.pdf"
].map((suffix) => `data/rcap-all50/overlays/census-v1/ca/ca-prop64-set--official-pdf-fill/${suffix}`);
assert.deepEqual(
  currentPrimaryPaths.map((p) => crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex")),
  californiaDecision.currentByteBinding.currentPrimaryHashes
);

const california = family("ca-prop64-set");
assert.deepEqual(
  [california.selectedIndependentVerdict.lane, california.selectedIndependentVerdict.verdict],
  ["vf12", "PASS_COMPLETE_INDEPENDENT"]
);
assert.equal(california.state, "VERIFY_PENDING");
assert.equal(california.legalInputStatus, "SETTLED");
assert.equal(california.legalInputBasis, null);
assert.equal(california.verificationLapsedBecause.lapse, "FAMILY_MOVED_SINCE_THE_VERDICT");
assert.equal(california.legalHoldReclassification.disposition, "SELECT_SUBSTANTIVE_VERDICT");

assert.deepEqual(
  reclassification.families.map((row) => row.familyId).sort(),
  ["ca-prop64-set", "in_infraction_nondisclosure-set"]
);
assert.equal(queue.families.filter((row) =>
  ["ca-prop64-set", "in_infraction_nondisclosure-set"].includes(row.familyId)
  && ["COMPLETE_PACKET_PROVEN", "VERIFIED_PASS", "LEGAL_APPROVED"].includes(row.state)
).length, 0);

console.log("LEGAL_PURGE_WORKER_2_PROJECTION_OK: 2 families routed to independent reread; history preserved; 0 PASS promotions");
