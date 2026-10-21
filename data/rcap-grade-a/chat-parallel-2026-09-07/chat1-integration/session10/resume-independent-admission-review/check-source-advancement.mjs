/** Independent in-memory controls; never mutate the shared source registry. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { sourceDispositionAdvancement } from '../../../../../../scripts/grade-a-packet-factory-24h/source-disposition-advancement.mjs';

const root = process.cwd();
const out = path.dirname(new URL(import.meta.url).pathname);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const decisionsPath = 'data/rcap-grade-a/source-wave-integration/CAPTAIN_SOURCE_IDENTITY_DETERMINATIONS.json';
const decisionsBytes = fs.readFileSync(path.join(root, decisionsPath));
const decisions = JSON.parse(decisionsBytes).reconciliation42.families;
const master = JSON.parse(fs.readFileSync(path.join(root, 'data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json')));
const meId = 'census-pending-family:ME:juvenile-sealing';
const waId = 'census-pending-family:WA:juvenile-record-sealing-under-rcw-13-50-260';
const checks = [];
const check = (name, test) => { test(); checks.push({ name, passed: true }); };
const decision = id => decisions.find(row => row.familyId === id);
const family = id => structuredClone(master.families.find(row => row.familyId === id));
const call = (id, f) => sourceDispositionAdvancement(root, decision(id), f);
const me = call(meId, family(meId));
const wa = call(waId, family(waId));
check('Maine exact retained held-source adoption advances only source readiness', () => {
  assert.equal(me.effectiveDisposition, 'SOURCE_READY');
  assert.equal(me.evidenceSha256, 'd4a23c2e0872a83a0b51fe3985a7cf23b555681c91a2b855e4b52a75950ee8c9');
});
check('Washington reviewed court-initiated guidance keeps participant motion undischarged', () => {
  assert.equal(wa.effectiveDisposition, 'GUIDANCE_READY');
  assert.equal(wa.participantMotionDischarged, false);
});
for (const [name, mutate] of [
  ['ready flag absent', f => { f.sourceReadiness.ready = false; }],
  ['source hash replaced', f => { f.sourceReadiness.boundSources[0].sha256 = '0'.repeat(64); }],
  ['source path replaced', f => { f.sourceReadiness.boundSources[0].path = 'other.pdf'; }],
  ['source evidence replaced', f => { f.sourceReadiness.boundSources[0].evidencePath = 'other.json'; }],
  ['bound source omitted', f => { f.sourceReadiness.boundSources = []; }],
  ['bound source duplicated', f => { f.sourceReadiness.boundSources.push(f.sourceReadiness.boundSources[0]); }],
]) check(`Maine ${name} refused`, () => { const f = family(meId); mutate(f); assert.equal(call(meId, f), null); });
check('Washington participant-motion substitution refused', () => {
  const f = family(waId); f.sourceReconciliation.disposition = 'SOURCE_READY'; assert.equal(call(waId, f), null);
});
check('Washington bare generated ready flag cannot advance another state', () => {
  const f = family(waId); f.state = 'SOURCE_READY'; assert.equal(call(waId, f), null);
});
check('Unrelated family receives no source exception', () => {
  assert.equal(sourceDispositionAdvancement(root, { familyId: 'unknown', disposition: 'SOURCE_BLOCKED' }, family(meId)), null);
});
check('Original decisions and attribution bytes are unchanged', () => {
  assert.equal(sha(fs.readFileSync(path.join(root, decisionsPath))), sha(decisionsBytes));
  assert.equal(decision(meId).disposition, 'SOURCE_BLOCKED');
  assert.equal(decision(waId).disposition, 'SOURCE_BLOCKED');
});
const result = { scope: 'Independent source advancement code review and in-memory negative controls',
  candidateCommit: '774e1c3e3fa7ffd8e4f2aefea384440e4b1dab90', reviewedDecisionsSha256: sha(decisionsBytes),
  checks, total: checks.length, passed: checks.length, advances: [me, wa],
  originalDecisionsRewritten: false, independentSemanticReviewCreated: false, runtimeChanged: false, productionChanged: false };
fs.writeFileSync(path.join(out, 'source-advancement-controls.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ passed: checks.length, total: checks.length, output: path.join(out, 'source-advancement-controls.json') }));
