import assert from 'node:assert/strict';
import fs from 'node:fs';
import { boundedRepairAuthorization } from './bounded-repair-authorization.mjs';
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const master = read('data/rcap-grade-a/packet-factory-24h/MASTER_QUEUE.json');
const ledger = read('data/rcap-grade-a/packet-factory-24h/claim-ledger.json');
const id = 'composed-treatment:obligation:runtime-only:WY:human-trafficking-victim-vacatur-w-s-6-2-708';
const family = master.families.find(f => f.familyId === id);
const claim = ledger.claims.find(c => c.subjectId === id && c.laneKind === 'repair' && !c.released);
const decisionPath = 'data/record-clearing/legal-decisions/2026-09-06-owner-relayed-research-batch-03.json';
const decision = read(decisionPath);
const original = JSON.stringify({family, claim, ledger, decision});
const fixture = () => structuredClone({family, claim, ledger, decision});
const evaluate = x => boundedRepairAuthorization(x.family, x.claim, x.ledger, p => {
  assert.equal(p, decisionPath); return x.decision;
});
const good = evaluate(fixture());
assert.equal(good?.legalHoldRetained, true);
assert.equal(good?.approvalGranted, false);
assert.equal(good?.lane, 'FIX114');
const rewriteReasons = (x, change) => {
  for (const key of ['transfers', 'reissues', 'grants']) {
    for (const row of x.ledger[key] ?? []) if (row.subjectId === id) row.reason = change(row.reason ?? '');
  }
};
const entry = x => x.decision.entries.find(e => e.family === id);
const cases = [
  ['released claim', x => { x.claim.released = true; }],
  ['unheld family', x => { x.family.state = 'SOURCE_READY'; }],
  ['settled legal status', x => { x.family.legalInputStatus = 'SETTLED'; }],
  ['missing hold evidence', x => { delete x.family.laneReturnLegalHold.evidencePath; }],
  ['missing hold reason', x => { x.family.laneReturnLegalHold.why = ''; }],
  ['wrong subject', x => { x.claim.subjectId = 'not-this-family'; }],
  ['ordinary build grant', x => { x.claim.laneKind = 'packet-build'; }],
  ['ordinary build operation', x => { x.claim.operation = 'packet-build'; }],
  ['missing recorded deal', x => { x.ledger.transfers = []; x.ledger.reissues = []; x.ledger.grants = []; }],
  ['no bounded instruction', x => rewriteReasons(x, s => s.replace(/bounded repair/gi, 'unrestricted work'))],
  ['no retained-hold instruction', x => rewriteReasons(x, s => s.replace(/legal hold stays/gi, 'hold removed'))],
  ['unresolvable decision', x => rewriteReasons(x, s => s.replace('2026-09-06-owner-relayed-research-batch-03.json', 'missing-decision.json'))],
  ['approval-bearing record', x => { x.decision.createsApproval = true; }],
  ['output-approval record', x => { x.decision.createsOutputLevelApproval = true; }],
  ['wrong schema', x => { x.decision.schemaVersion = 'unknown'; }],
  ['ambiguous family entries', x => { x.decision.entries.push(structuredClone(entry(x))); }],
  ['missing direction', x => { entry(x).direction = ''; }],
  ['record without bounded repair', x => { entry(x).applied = ''; entry(x).stillOwed = ''; }],
];
for (const [name, mutate] of cases) {
  const x = fixture(); mutate(x); assert.equal(evaluate(x), null, name);
}
assert.equal(JSON.stringify({family, claim, ledger, decision}), original);
console.log(JSON.stringify({positiveControls:1, negativeControls:cases.length, inputsUnchanged:true, legalHoldRetained:true, approvalGranted:false}));
