import assert from 'node:assert/strict';
import fs from 'node:fs';
import { verifySourceClaimDispatch } from './source-claim-dispatch.mjs';
const read = name => JSON.parse(fs.readFileSync(`data/rcap-grade-a/packet-factory-24h/${name}.json`));
const ledger = read('claim-ledger'), active = read('ACTIVE_ASSIGNMENTS'), source = read('SOURCE_CONVEYOR_ASSIGNMENTS');
const original = JSON.stringify(ledger);
const explicit = verifySourceClaimDispatch(ledger, active, source);
assert.deepEqual(explicit.map(c => [c.lane, c.subjectId]).sort(), [
  ['SRC10', 'co_motion_seal_conviction-set'], ['SRC10', 'co_motion_seal_nonconviction-set']
]);
let refused = 0;
for (const claim of explicit) {
  for (const mutate of [
    l => l.grants = l.grants.filter(g => g.subjectId !== claim.subjectId),
    l => l.grants.find(g => g.subjectId === claim.subjectId).reason = '',
    l => l.grants.find(g => g.subjectId === claim.subjectId).lane = 'SRC99',
    l => l.grants.find(g => g.subjectId === claim.subjectId).grantedAt = 'invalid',
    l => l.releases.push({...claim, releasedAt:'2099-01-01T00:00:00Z'}),
  ]) {
    const l = structuredClone(ledger); mutate(l);
    assert.throws(() => verifySourceClaimDispatch(l, active, source)); refused++;
  }
}
const packed = ledger.claims.find(c => c.subjectType === 'source-obligation' && !c.released && c.itemId);
const missing = structuredClone(ledger);
missing.claims = missing.claims.filter(c => c !== missing.claims.find(x => x.subjectId === packed.subjectId && x.lane === packed.lane));
assert.throws(() => verifySourceClaimDispatch(missing, active, source)); refused++;
const orphan = structuredClone(ledger);
orphan.claims.push({...packed, lane:'DISC99', itemId:'invented', subjectId:'invented'});
assert.throws(() => verifySourceClaimDispatch(orphan, active, source)); refused++;
assert.equal(JSON.stringify(ledger), original);
console.log(`SOURCE_CLAIM_DISPATCH_OK: both SRC10 grants recognized; ${refused} missing/foreign/stale provenance controls refused; ledger unchanged`);
