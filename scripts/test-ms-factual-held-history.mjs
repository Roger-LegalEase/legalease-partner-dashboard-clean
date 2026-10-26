import assert from 'node:assert/strict';
import fs from 'node:fs';
import {register} from 'node:module';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const P = await import('../src/lib/expungement-ai/packet-information.ts');
const {rows} = JSON.parse(fs.readFileSync(new URL('./fixtures/ga17-ms-factual-witness-draft-predecessors.json', import.meta.url)));
const nc = 'non-conviction-expungement-for-dismissal-no-disposition-or-acquittal';
const item = {id:'synthetic-ms-history',jurisdiction:'MS',artifactRefs:{}};
let checks = 0;
function check(name, fn) { fn(); checks++; console.log('PASS '+name); }
for (const row of rows) {
  const snapshot = structuredClone(row.predecessorSnapshot);
  const record = {status:'unverified',revision:0,draftHash:row.predecessorHash,draftSnapshot:snapshot};
  const original = structuredClone(record);
  const label = row.routeKey;
  check(label+'/fresh-facts-are-nonconviction', () => assert.equal(P.evaluateProtectedPacketFacts(snapshot).evaluation.pathwayId,nc));
  check(label+'/held-history-readable', () => {
    const model=P.protectedPacketInformationModelFor(record);
    assert(model); assert.equal(model.msFactualHistoryHeld,true); assert.equal(model.packetPlan,null);
    assert.equal(model.reviewSafety.safe,false); assert.equal(model.stage,'in_progress');
  });
  check(label+'/exact-noop', () => {
    const patch=P.packetInformationPatch({existingItem:item,protectedVerification:record,answers:{}});
    assert.deepEqual(patch.protectedTransition.nextVerification,record); assert.equal(patch.readyToGenerate,false);
  });
  check(label+'/unrelated-save-retains-held-facts', () => {
    const patch=P.packetInformationPatch({existingItem:item,protectedVerification:record,answers:{county:'Synthetic County'}});
    assert(patch); assert.equal(patch.readyToGenerate,false);
    const next=patch.protectedTransition.nextVerification, draft=next.draftSnapshot;
    assert.notEqual(next.status,'verified'); assert.equal(draft.pathwayId,snapshot.pathwayId); assert.equal(draft.paymentAllowed,false);
    assert.equal(P.protectedPacketInformationModelFor(next).msFactualHistoryHeld,true);
    for(const source of ['screeningAnswers','prefilledAnswers','packetAnswers']) for(const [id,value] of Object.entries(snapshot[source]))
      if(id!=='county') assert.deepEqual(draft[source][id],value,source+'/'+id);
    assert.deepEqual(draft.dependencies.semanticAnswerHistory,snapshot.dependencies.semanticAnswerHistory);
    assert.deepEqual(P.packetInformationPatch({existingItem:item,protectedVerification:next,answers:{}}).protectedTransition.nextVerification,next);
    assert.equal(P.packetInformationPatch({existingItem:item,protectedVerification:next,answers:{},verify:true}),null);
  });
  check(label+'/explicit-disposition-correction-uses-current-source', () => {
    const patch=P.packetInformationPatch({existingItem:item,protectedVerification:record,answers:{case_outcome:'Acquitted or found not guilty'}});
    assert(patch); assert.equal(patch.readyToGenerate,false);
    const next=patch.protectedTransition.nextVerification,draft=next.draftSnapshot;
    assert.notEqual(next.status,'verified'); assert.equal(draft.pathwayId,nc);
    assert.equal(P.protectedPacketInformationModelFor(next).msFactualHistoryHeld,undefined);
    assert.equal(draft.packetAnswers.case_outcome,'Acquitted or found not guilty');
    for(const source of ['screeningAnswers','prefilledAnswers','packetAnswers']) if(Object.hasOwn(snapshot[source],'case_outcome'))
      assert(draft.dependencies.semanticAnswerHistory.some(entry=>entry.factId==='case_outcome'&&entry.source===source&&entry.value===snapshot[source].case_outcome));
  });
  check(label+'/held-verification-refused', () => assert.equal(P.packetInformationPatch({existingItem:item,protectedVerification:record,answers:{},verify:true}),null));
  check(label+'/read-and-save-do-not-mutate-original', () => assert.deepEqual(record,original));
}
console.log(JSON.stringify({test:'MS factual held history',checks,passed:true}));
