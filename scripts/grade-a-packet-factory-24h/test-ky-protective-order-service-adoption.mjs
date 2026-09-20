#!/usr/bin/env node
import assert from "node:assert/strict";
import {
  BUILD_SCRIPT,
  FAMILY_ID,
  OWNER_ADOPTION_PATH,
  build,
  componentPromisesGeneratedCertificate,
  loadControllingRecord,
  renderServiceGuidance
} from "../../scripts/build-census-v1-ky_protective_order_record_expungement-set.mjs";

const record = loadControllingRecord();
const adoption = record.ownerAdoption;
assert.equal(FAMILY_ID, "ky_protective_order_record_expungement-set");
assert.equal(OWNER_ADOPTION_PATH,
  "data/rcap-grade-a/legal-decisions/KY_PROTECTIVE_ORDER_SERVICE_OWNER_ADOPTION_2026-09-12.json");
assert.equal(adoption.path, OWNER_ADOPTION_PATH);
assert.equal(adoption.decisionId, "KY-PROTECTIVE-ORDER-SERVICE-PROOF-OWNER-ADOPTION-20260912");
assert.deepEqual(adoption.adoptedRevisionNumbers, [1, 2, 3, 4, 5]);
assert.equal(adoption.governingMemoPath, "data/record-clearing/legal-design-intake/KY.memo.json");

const serviceComponent = record.components.find((row) => row.role === "service_instructions");
assert.deepEqual(
  { role: serviceComponent.role, requirement: serviceComponent.requirement, outputStrategy: serviceComponent.outputStrategy },
  { role: "service_instructions", requirement: "required", outputStrategy: "process_guidance" }
);
assert.match(serviceComponent.notes, /CR 5\.03 where applicable/);
assert.match(serviceComponent.notes, /neither is a certificate/);
assert.match(serviceComponent.notes, /No proof obligation is waived/);
assert.match(record.manualCompletionItems[1].whereInPacket, /AOC-275\.18 notification-of-expungement-hearing section/);
assert.match(record.manualCompletionItems[1].whereInPacket, /Copies to distribution list/);
assert.match(record.manualCompletionItems[1].whereInPacket, /not proof of completed service/);

/* The historical defect is an affirmative generated-certificate promise. */
assert.equal(componentPromisesGeneratedCertificate(
  "The packet tells the movant how to serve and provides the certificate."), true);
/* The adopted note's certificate/proof mentions are safeguards and pathways. */
assert.equal(componentPromisesGeneratedCertificate(serviceComponent.notes), false);
assert.equal(componentPromisesGeneratedCertificate(
  "The packet does not provide a certificate; actual proof remains required."), false);

const serviceGuidance = renderServiceGuidance().join("\n").replace(/\s+/g, " ");
assert.match(serviceGuidance, /CR 5\.03 where applicable/);
assert.match(serviceGuidance, /AOC-275\.18\s+notification-of-expungement-hearing section/);
assert.match(serviceGuidance, /not proof of completed service/);
assert.match(serviceGuidance, /participant must not certify the clerk's actions/);
assert.doesNotMatch(serviceGuidance, /provides the certificate/);
assert.doesNotMatch(serviceGuidance, /data\/record-clearing|data\/rcap-grade-a|SHA-256/);
assert.match(serviceGuidance, /If you have not\s+already served the copies, the clerk serves them/);
assert.match(serviceGuidance, /before\s+court or party action/);
assert.match(serviceGuidance, /affidavit by the person who served the papers/);
assert.match(serviceGuidance, /other proof satisfactory to the court/);
assert.match(serviceGuidance, /does not supply a\s+completed proof document or require an affidavit in every case/);

const check = await build({ check: true });
assert.equal(check.familyId, FAMILY_ID);
assert.deepEqual(check.blocking, []);
assert.deepEqual(check.requiredComponentsNotDelivered, []);
assert.equal(check.ownerAdoption.path, OWNER_ADOPTION_PATH);
assert.equal(check.ownerAdoption.decisionId, adoption.decisionId);
assert.equal(check.ownerAdoption.sha256, adoption.sha256);

console.log(JSON.stringify({
  status: "PASS",
  familyId: FAMILY_ID,
  buildScript: BUILD_SCRIPT,
  ownerAdoption: adoption,
  requiredComponentsNotDelivered: check.requiredComponentsNotDelivered,
  blocking: check.blocking,
  packetAcceptance: false,
  rasterMeasured: false
}, null, 2));
