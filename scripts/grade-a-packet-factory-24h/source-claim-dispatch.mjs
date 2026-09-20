import assert from 'node:assert/strict';
import { captainDealtLiveGrant } from './captain-dealt-grants.mjs';

// The conveyor is authoritative for packed claims. Explicit Captain grants
// have their own recorded provenance, shared with the dispatch generator.
export function verifySourceClaimDispatch(ledger, active, source) {
  const lanes = new Set(source.lanes.filter(l => l.status === 'ACTIVE').map(l => l.assignmentId));
  const expected = active.assignments.filter(a => lanes.has(a.assignmentId))
    .flatMap(a => a.items.map(id => `${a.assignmentId}\0${id}`));
  const claims = ledger.claims.filter(c => c.subjectType === 'source-obligation' && c.released !== true);
  const live = new Set(claims.map(c => `${c.lane}\0${c.itemId}`));
  assert.ok(expected.every(key => live.has(key)), 'source assignment has no live, assertable grant in the ledger');
  const expectedSet = new Set(expected), explicit = [];
  for (const claim of claims) {
    if (expectedSet.has(`${claim.lane}\0${claim.itemId}`)) continue;
    const provenance = captainDealtLiveGrant(ledger, claim);
    assert.ok(provenance && provenance.at > 0,
      `a live source claim is neither dispatched nor explicitly granted: ${claim.lane}:${claim.subjectId}`);
    explicit.push(claim);
  }
  return explicit;
}
