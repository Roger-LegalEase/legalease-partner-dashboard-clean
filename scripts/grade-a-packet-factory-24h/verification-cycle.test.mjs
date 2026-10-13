import {test} from 'node:test';
import assert from 'node:assert/strict';
import {changedAcceptanceCycle} from './verification-cycle.mjs';

const previous={familyId:'accepted-family',state:'COMPLETE_PACKET_PROVEN'};
const evidence={lapse:'BOUND_SOURCE_DRIFTED',path:'reviewed-source.json',pinned:'a'.repeat(64),now:'b'.repeat(64)};
const current={familyId:previous.familyId,state:'VERIFY_PENDING',verificationLapsedBecause:evidence};
test('new source drift reopens only the newly lapsed accepted cycle and preserves its evidence',()=>{
  const result=changedAcceptanceCycle(previous,current);
  assert.deepEqual(result.evidence,evidence);assert.match(result.evidenceSha256,/^[a-f0-9]{64}$/);
  assert.equal(result.previousState,'COMPLETE_PACKET_PROVEN');
});
test('a finished pending cycle is never restarted by the next regeneration',()=>{
  assert.equal(changedAcceptanceCycle(current,current),null);
  assert.equal(changedAcceptanceCycle({...previous,state:'FAIL_REPAIR_REQUIRED'},current),null);
});
test('absent, unrelated or still-accepted identity cannot invent a new cycle',()=>{
  for(const [before,after] of [[null,current],[{...previous,familyId:'other'},current],[previous,previous],[previous,{...current,verificationLapsedBecause:null}]])assert.equal(changedAcceptanceCycle(before,after),null);
});
test('unavailable historical guidance evidence remains explicit, not a substituted approval',()=>{
  const result=changedAcceptanceCycle({...previous,state:'GUIDANCE_READY'},{...current,verificationLapsedBecause:null,reviewedGuidanceAdmission:{eligible:false,reason:'Historical commit is unavailable'}});
  assert.equal(result.evidence.eligible,false);assert.equal(result.evidence.reason,'Historical commit is unavailable');
});
