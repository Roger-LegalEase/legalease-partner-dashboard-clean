import test from 'node:test';
import assert from 'node:assert/strict';
import { applyNationalReleaseControl, renderNationalReleaseControl } from './apply-national-release-control.mjs';

function inputs() {
  return [{ lineage: { captainSha: 'a'.repeat(40) } }, {
    families: [{ familyId: 'A' }, { familyId: 'B' }], commercial: { commerciallyEligible: 1 },
    releaseReconciliation: { baseline: { status: 'BOUND' }, gaps: [{ familyId: 'A', dimension: 'output_approval' }] }
  }, { families: [{ familyId: 'A', state: 'COMPLETE_PACKET_PROVEN' }, { familyId: 'B', state: 'GUIDANCE_READY' }], totals: { commercialRoutesOpened: 0 } }];
}

test('terminal guidance and proven packet stay distinct from commercial authority', () => {
  const doc = applyNationalReleaseControl(...inputs());
  assert.equal(doc.packetFamilies.terminal, 2);
  assert.equal(doc.packetFamilies.completePacketProven, 1);
  assert.equal(doc.productPath.commercialRoutesOpened, 0);
  assert.equal(doc.launchGate.gateOpen, false);
  assert.equal(doc.goHold.decision, 'HOLD');
  assert.equal(doc.lineage.productionConnected, null);
  assert.match(renderNationalReleaseControl(doc), /\| Terminal \| 2 \|/);
  assert.deepEqual(doc.exactBlockers, [{ familyId: 'A', dimension: 'output_approval' }]);
});

for (const [name, mutate] of [
  ['duplicate factory identity', x => { x[2].families[1].familyId = 'A'; }],
  ['duplicate worklist replacing a missing family', x => { x[1].families[1].familyId = 'A'; }],
  ['unknown worklist family', x => { x[1].families[1].familyId = 'C'; }],
  ['missing family', x => { x[1].families.pop(); }],
  ['missing reconciliation', x => { delete x[1].releaseReconciliation; }],
  ['missing exact gap list', x => { delete x[1].releaseReconciliation.gaps; }]
]) test(`refuses ${name}`, () => { const x = inputs(); mutate(x); assert.throws(() => applyNationalReleaseControl(...x)); });
