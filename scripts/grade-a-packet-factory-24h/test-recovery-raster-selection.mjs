import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { selectNewPendingRasterFamilies as select, dispatchStepStarted, sameRasterInputs } from './recovery-raster-selection.mjs';
const manifest = 'data/rcap-grade-a/packet-factory-24h/RASTER_QUEUE.json';
const previous = JSON.parse(execFileSync('git', ['show', `774e1c3e3fa7ffd8e4f2aefea384440e4b1dab90:${manifest}`], { maxBuffer: 20_000_000 }));
const current = JSON.parse(execFileSync('git', ['show', `1c6d648f6721de0de0f1a57d25dc37e1ff51a62f:${manifest}`], { maxBuffer: 20_000_000 }));
assert.deepEqual(select(current, previous), ['ia-901c2-set']);
assert.deepEqual(select(current, current), []);
const base = { familyId: 'fixture', currentRasterState: 'RASTER_PENDING', documentsDigest: 'a', canonicalPdfSha256: 'b', boundaryPdfSha256: 'c' };
const queue = row => ({ rows: [row] });
let cases = 2;
for (const key of ['documentsDigest', 'canonicalPdfSha256', 'boundaryPdfSha256']) {
  assert.deepEqual(select(queue({ ...base, [key]: 'changed' }), queue(base)), ['fixture']); cases++;
}
assert.deepEqual(select(queue(base), { rows: [] }), ['fixture']); cases++;
assert.deepEqual(select(queue(base), queue({ ...base, currentRasterState: 'RASTER_FAIL' })), ['fixture']); cases++;
assert.deepEqual(select(queue(base), queue({ ...base, currentRasterState: 'RASTER_PASS' })), []); cases++;
for (const state of ['RASTER_PASS', 'RASTER_FAIL']) {
  assert.deepEqual(select(queue({ ...base, currentRasterState: state }), queue(base)), []); cases++;
}
assert.deepEqual(select(queue({ ...base, packetCommitSha: 'new' }), queue({ ...base, packetCommitSha: 'old' })), []); cases++;
assert(sameRasterInputs(base, { ...base, packetCommitSha: 'new' })); cases++;
assert(!sameRasterInputs(base, { ...base, boundaryPdfSha256: 'new' })); cases++;
for (const conclusion of ['success', 'failure', 'cancelled', null]) {
  assert(dispatchStepStarted([{ steps: [{ name: 'Dispatch eligible families through the existing central raster workflow', started_at: '2026-09-08', status: conclusion ? 'completed' : 'in_progress', conclusion }] }])); cases++;
}
assert(!dispatchStepStarted([{ steps: [{ name: 'Dispatch eligible families through the existing central raster workflow', status: 'pending', started_at: null }] }])); cases++;
console.log(JSON.stringify({ cases, actualNewFamilies: ['ia-901c2-set'], unchangedCtAndCompletedSixSkipped: true }));
