#!/usr/bin/env node
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  LEGAL_BLOCK_RESOLUTION_PATHS,
  LEGAL_BLOCK_SUPERSESSION_PATHS,
  applyLegalResolutionSupersessions,
  assessLegalResolutionAtReviewBase,
  loadLegalBlockResolutions,
  mergeLegalBlockResolutionRecords
} from "./legal-block-resolution.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const MASTER = "data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json";
const ACTIVE = "data/rcap-grade-a/packet-factory-24h/ACTIVE_ASSIGNMENTS.json";
const LEDGER = "data/rcap-grade-a/packet-factory-24h/claim-ledger.json";
const read = (relative) => JSON.parse(fs.readFileSync(path.join(ROOT, relative), "utf8"));
const originalAtHead = (relative) => JSON.parse(execFileSync("git", ["show", `HEAD:${relative}`], {
  cwd: ROOT, maxBuffer: 1 << 27
}));
const docs = LEGAL_BLOCK_RESOLUTION_PATHS.map((recordPath) => ({ path: recordPath, document: read(recordPath) }));
const attestations = LEGAL_BLOCK_SUPERSESSION_PATHS.map((recordPath) => ({ path: recordPath, document: read(recordPath) }));
const baseResolutions = mergeLegalBlockResolutionRecords(docs);
const resolutions = loadLegalBlockResolutions(ROOT);

assert.equal(baseResolutions.records.length, 2);
assert.deepEqual(baseResolutions.records.map((row) => [row.legalClearFamilies, row.legalHoldFamilies]), [[29, 6], [1, 0]]);
assert.equal(baseResolutions.clearFamilyIds.length, 30);
assert.equal(baseResolutions.holdFamilyIds.length, 6);
assert.equal(resolutions.records.length, 3);
assert.equal(resolutions.clearFamilyIds.length, 36);
assert.equal(resolutions.holdFamilyIds.length, 0);
assert.equal(resolutions.byFamily.size, 36);
assert.equal(new Set([...resolutions.clearFamilyIds, ...resolutions.holdFamilyIds]).size, 36);

const mustRefuse = (name, mutate, match) => {
  const copy = structuredClone(docs);
  mutate(copy);
  assert.throws(() => mergeLegalBlockResolutionRecords(copy), match, name);
};
mustRefuse("unknown schema", (copy) => { copy[0].document.schemaVersion = "unknown"; }, /unsupported schemaVersion/);
mustRefuse("duplicate decision id", (copy) => {
  copy[1].document.decisions[0].decisionId = copy[0].document.decisions[0].decisionId;
}, /duplicate decisionId/);
mustRefuse("conflicting duplicate family", (copy) => {
  const familyId = copy[0].document.legalClearFamilyIds[0];
  copy[1].document.decisions[0].familyIds = [familyId];
  copy[1].document.legalClearFamilyIds = [familyId];
}, /conflicting or duplicate family decision/);
mustRefuse("summary not backed by decisions", (copy) => {
  copy[1].document.legalClearFamilyIds = ["not-the-decided-family"];
}, /decisions do not equal legalClearFamilyIds/);
mustRefuse("clear and hold overlap", (copy) => {
  copy[0].document.legalHoldFamilyIds.push(copy[0].document.legalClearFamilyIds[0]);
}, /clear\/hold lists overlap/);

const exactSupersession = applyLegalResolutionSupersessions(baseResolutions, attestations);
assert.equal(exactSupersession.clearFamilyIds.length, 36);
assert.equal(exactSupersession.holdFamilyIds.length, 0);
for (const familyId of baseResolutions.holdFamilyIds) {
  const effective = exactSupersession.byFamily.get(familyId);
  assert.equal(effective.disposition, "LEGAL_CLEAR");
  assert.equal(effective.evidenceType, "owner_attestation");
  assert.equal(effective.documentaryPermissionStoredInRepository, false);
  assert.equal(effective.supersedesDecisionId, "KS-KJC-COMMERCIAL-REDISTRIBUTION");
}
const mustRefuseAttestation = (name, mutate, match) => {
  const copy = structuredClone(attestations);
  mutate(copy);
  assert.throws(() => applyLegalResolutionSupersessions(baseResolutions, copy), match, name);
};
mustRefuseAttestation("mismatched attestation family scope", (copy) => {
  copy[0].document.familyIds.pop();
  copy[0].document.stateEffect.legalClearFamilies -= 1;
}, /family scope does not exactly equal/);
mustRefuseAttestation("unknown superseded decision", (copy) => {
  copy[0].document.supersedesDecisionId = "NOT-THE-KJC-DECISION";
}, /does not name a base decision/);
mustRefuseAttestation("documentary permission claim", (copy) => {
  copy[0].document.documentaryPermissionStoredInRepository = true;
}, /may not claim documentary permission is stored/);

const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
for (const resolution of baseResolutions.byFamily.values()) assert.equal(
  assessLegalResolutionAtReviewBase(ROOT, head, resolution).available, true,
  `${resolution.familyId}: HEAD must contain the exact base decision bytes`);
const kansasResolution = resolutions.byFamily.get("ks-21-6614-conviction-set");
const attestationCommit = "9d4f81270";
assert.equal(assessLegalResolutionAtReviewBase(ROOT, attestationCommit, kansasResolution).available, true,
  "the owner-attestation commit must contain both exact decision records");
const beforeAttestation = execFileSync("git", ["rev-parse", `${attestationCommit}^`], { cwd: ROOT, encoding: "utf8" }).trim();
assert.equal(assessLegalResolutionAtReviewBase(ROOT, beforeAttestation, kansasResolution).available, false,
  "a review base before the attestation must not authorize Kansas admission");
const kyResolution = resolutions.byFamily.get("ky_misdemeanor_expungement-set");
const kyAddedAt = execFileSync("git", ["log", "--diff-filter=A", "-1", "--format=%H", "--", kyResolution.decisionRecord], {
  cwd: ROOT, encoding: "utf8"
}).trim();
const beforeKyRecord = execFileSync("git", ["rev-parse", `${kyAddedAt}^`], { cwd: ROOT, encoding: "utf8" }).trim();
assert.equal(assessLegalResolutionAtReviewBase(ROOT, beforeKyRecord, kyResolution).available, false,
  "a review base before the additive record must not authorize admission");

if (process.argv.includes("--generated")) {
  const before = originalAtHead(MASTER);
  const after = read(MASTER);
  const active = read(ACTIVE);
  const ledger = read(LEDGER);
  const beforeById = new Map(before.families.map((row) => [row.familyId, row]));
  const afterById = new Map(after.families.map((row) => [row.familyId, row]));
  const inScope = new Set(resolutions.byFamily.keys());
  const packetAdmissionStates = new Set([
    "PASS_COMPLETE", "VERIFIED_PASS", "LEGAL_REVIEW_READY", "LEGAL_APPROVED", "COMPLETE_PACKET_PROVEN"
  ]);

  for (const [familyId, resolution] of resolutions.byFamily) {
    const family = afterById.get(familyId);
    assert.ok(family, `${familyId}: missing generated family row`);
    assert.equal(family.currentLegalResolution.decisionId, resolution.decisionId);
    assert.equal(family.currentLegalResolution.bindingProductRule, resolution.bindingProductRule);
    assert.equal(family.currentLegalResolution.decisionRecord, resolution.decisionRecord);
    assert.ok(family.nextExecutableAction.includes(resolution.bindingProductRule));
    assert.ok(family.nextExecutableAction.includes(resolution.decisionRecord));
    for (const key of ["sourceStatus", "sourceReadiness", "sourceReconciliation", "sourceHashes",
      "rasterEnrolmentRefusal", "selectedIndependentVerdict", "ownerDeliveryTypeRefusal"]) {
      assert.deepEqual(family[key], beforeById.get(familyId)?.[key], `${familyId}: legal resolution changed nonlegal ${key}`);
    }
    if (resolution.disposition === "LEGAL_CLEAR") {
      assert.notEqual(family.state, "LEGAL_BLOCKED");
      assert.equal(family.legalInputStatus, "SETTLED");
      assert.equal(family.legalInputBasis, null);
      if (packetAdmissionStates.has(family.state)) {
        assert.equal(assessLegalResolutionAtReviewBase(ROOT,
          family.selectedIndependentVerdict?.verifiedAtBase, resolution).available, true,
        `${familyId}: admitted without decision-aware independent review`);
      }
    }
    if (resolution.evidenceType === "owner_attestation") {
      assert.equal(family.currentLegalResolution.evidenceType, "owner_attestation");
      assert.equal(family.currentLegalResolution.documentaryPermissionStoredInRepository, false);
      assert.equal(family.currentLegalResolution.supersedesDecisionId, "KS-KJC-COMMERCIAL-REDISTRIBUTION");
      assert.deepEqual(family.currentLegalResolution.decisionRecords, resolution.decisionRecords);
    }
  }

  const changedStatesOutsideScope = after.families.filter((family) =>
    !inScope.has(family.familyId) && beforeById.get(family.familyId)?.state !== family.state);
  assert.deepEqual(changedStatesOutsideScope, [], "an unaffected family changed state");
  const newlyAdmitted = after.families.filter((family) => inScope.has(family.familyId)
    && packetAdmissionStates.has(family.state)
    && !packetAdmissionStates.has(beforeById.get(family.familyId)?.state));
  assert.deepEqual(newlyAdmitted, [], "legal clearance alone created a packet-admission state");

  const southCarolina = afterById.get("rcap-sc-custom-pleading");
  assert.equal(southCarolina.state, "WRONG_DELIVERY_TYPE");
  assert.ok(southCarolina.ownerDeliveryTypeRefusal, "South Carolina owner product refusal was lost");
  assert.deepEqual(southCarolina.sourceReconciliation,
    beforeById.get(southCarolina.familyId).sourceReconciliation,
    "South Carolina's secondary source/custody issue was altered");

  const stateDelta = after.families.filter((family) =>
    beforeById.get(family.familyId)?.state !== family.state);
  assert.ok(stateDelta.every((family) => inScope.has(family.familyId)));
  assert.equal(active.assignments.length > 0, true);
  assert.equal(Array.isArray(ledger.claims), true);
  console.log(`LEGAL_BLOCK_RESOLUTION_GENERATED_OK: exact ${stateDelta.length}-family state delta; 0 unaffected changes; 0 sole-clear admissions; all 36 legally clear; SC source/product gates preserved`);
}

console.log("LEGAL_BLOCK_RESOLUTION_SCHEMA_OK: base 29+1 clear and 6 hold; exact owner-attestation supersession yields 36 clear; malformed/conflicting records refused; exact review-base byte ordering enforced");
