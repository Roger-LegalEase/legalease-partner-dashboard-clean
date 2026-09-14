#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { register } from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { loadMsPaidConsumerSuccessor, MS_PAID_SUCCESSOR_DECISION_PATH: decisionPath, MS_PAID_SUCCESSOR_ROUTE: route } = await import('../src/lib/rcap/fulfillment/paid-consumer-successor.ts');
const root = process.cwd();
const approved = JSON.parse(fs.readFileSync(decisionPath));
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'ms-paid-scope-'));
let passed = 0;
function check(label, run) { run(); passed++; console.log(`PASS ${label}`); }
function writeDecision(decision) { fs.writeFileSync(path.join(scratch, decisionPath), JSON.stringify(decision)); }
try {
  for (const rel of [decisionPath, ...approved.preservedEvidence.map(e => e.path)]) {
    fs.mkdirSync(path.dirname(path.join(scratch, rel)), { recursive: true });
    fs.copyFileSync(path.join(root, rel), path.join(scratch, rel));
  }
  check('new exact approval loads without granting technical acceptance', () => {
    const a = loadMsPaidConsumerSuccessor(scratch);
    assert.equal(a.routeId, route); assert.equal(a.trackId, 'ms-nonconv');
    assert.equal(a.decisionSha256, crypto.createHash('sha256').update(fs.readFileSync(path.join(scratch,decisionPath))).digest('hex'));
  });
  const mutations = {
    'other route': d => d.routeId += '-other', 'other track': d => d.trackId = 'ms-misd-addl',
    'other family': d => d.packetSetId = 'ms-misd-addl-set', 'wrong price': d => d.priceCents = 100,
    'no paid approval': d => d.consumerPaidAuthorized = false,
    'invented prior approval': d => d.priorPaidApprovalInvented = true,
    'security waiver': d => d.paymentSecurityWaived = true,
    'technical waiver': d => d.technicalAcceptanceWaived = true,
    'production scope': d => d.productionAuthorized = true,
    'changed eligibility': d => d.eligibilityChanged = true,
    'changed packet': d => d.packetContentsChanged = true,
    'retirement removed': d => d.legacyRetirementPreserved = false,
    'historical approval overwritten': d => d.historicalSponsoredPreviewApprovalPreserved = false,
    'missing source binding': d => d.preservedEvidence.pop(),
    'duplicate source binding': d => d.preservedEvidence[1] = d.preservedEvidence[0],
    'changed source digest': d => d.preservedEvidence[0].sha256 = '0'.repeat(64)
  };
  for (const [label, mutate] of Object.entries(mutations)) {
    const d = structuredClone(approved); mutate(d); writeDecision(d);
    check(`refuses ${label}`, () => assert.equal(loadMsPaidConsumerSuccessor(scratch), null));
  }
  writeDecision(approved);
  const evidencePath = path.join(scratch, approved.preservedEvidence[0].path);
  fs.appendFileSync(evidencePath, '\n');
  check('refuses changed packet specification bytes', () => assert.equal(loadMsPaidConsumerSuccessor(scratch), null));
  fs.unlinkSync(path.join(scratch, decisionPath));
  check('missing approval fails closed', () => assert.equal(loadMsPaidConsumerSuccessor(scratch), null));
  check('historical sponsored approval remains unpaid', () => {
    const prior = JSON.parse(fs.readFileSync('data/rcap-ledger/grade-a/ms-nonconviction-clinic-demo.artifacts.json'));
    assert.equal(prior.participantDeliveryReview.consumerPaidAuthorized, false);
    assert.equal(prior.outputLegalApproval.consumerPaidAuthorized, false);
  });
} finally { fs.rmSync(scratch, {recursive:true, force:true}); }
const { resolvePacketRoute } = await import('../src/lib/rcap/documents/packet-route-resolver.ts');
check('exact successor resolves through factory and stays technically held', () => {
  const result = resolvePacketRoute({state:'MS', pathway:route.slice(3)});
  assert.equal(result.routeKind, 'factory_v2');
  assert.equal(result.sellable, false);
});
check('unmigrated Mississippi route remains retired', () => {
  const result = resolvePacketRoute({state:'MS', pathway:'felony-expungement-under-99-19-71'});
  assert.equal(result.routeKind, 'legacy_retired');
});
check('new active record binds owner scope and does not invent missing technical proof', () => {
  const registry = JSON.parse(fs.readFileSync('data/rcap-grade-a/fulfillment-authority-registry.json'));
  const current = registry.records.filter(r => r.routeId === route && !r.supersededBy);
  assert.equal(current.length, 1);
  assert.equal(current[0].recordId, 'grade-a-ms-nonconv-paid-consumer-successor-20260914');
  assert.equal(current[0].evidenceBindings.paidConsumerSuccessor.decisionSha256, loadMsPaidConsumerSuccessor().decisionSha256);
  assert.equal(current[0].finalVerification.state, 'unbound');
  assert.equal(current[0].revocation.revoked, false);
});
console.log(`${passed}/${passed} exact-scope controls passed`);
