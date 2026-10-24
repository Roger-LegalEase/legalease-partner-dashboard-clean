import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {changedAcceptanceCycle,retainedVerificationLaneCount} from './verification-cycle.mjs';

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

const live={subjectType:'packet-family',subjectId:'pending',operation:'independent-verification',laneKind:'independent-verification',lane:'VF12',released:false};
test('shrinking queue preserves every occupied ordinary elastic verifier lane',()=>{
  for(const lane of ['VF09','VF10','VF11','VF12'])assert.equal(retainedVerificationLaneCount(8,12,[{...live,lane}],[{familyId:'pending',state:'VERIFY_PENDING'}]),Number(lane.slice(2)));
  assert.equal(retainedVerificationLaneCount(12,12,[],[]),12);
});
test('released or completed work cannot keep elastic capacity alive',()=>{
  for(const patch of [{released:true},{operation:'packet-build'},{laneKind:'packet-build'},{subjectType:'source-obligation'},{subjectId:'other'}])assert.equal(retainedVerificationLaneCount(8,12,[{...live,...patch}],[{familyId:'pending',state:'VERIFY_PENDING'}]),8);
  assert.equal(retainedVerificationLaneCount(8,12,[live],[{familyId:'pending',state:'COMPLETE_PACKET_PROVEN'}]),8);
});
test('exceptional captain grants stay off-roster without being reassigned',()=>{
  assert.equal(retainedVerificationLaneCount(8,12,[{...live,lane:'VF44'}],[{familyId:'pending',state:'VERIFYING'}]),8);
});

test('generator capacity guard accepts only the independently derived retained roster',()=>{
 const source=fs.readFileSync(new URL('./generate.mjs',import.meta.url),'utf8');
 const guard=source.slice(source.indexOf('for (const e of ELASTICITY) {'),source.indexOf('if (problems.length) {',source.indexOf('for (const e of ELASTICITY) {')));
 const run=new Function('ELASTICITY','assignments','PF_LANES','VF_LANES','problems',guard);
 const elasticity=[{id:'verification',triggered:false,creates:['VF09','VF10','VF11','VF12'],lanesWithout:8,measured:17}];
 const assignments=Array.from({length:12},(_,i)=>({assignmentId:`VF${String(i+1).padStart(2,'0')}`,lane:'independent-verification'}));
 const count=retainedVerificationLaneCount(8,12,[live],[{familyId:'pending',state:'VERIFY_PENDING'}]);
 const good=[];run(elasticity,assignments,16,count,good);assert.deepEqual(good,[]);
 const lost=[];run(elasticity,assignments.slice(0,8),16,count,lost);assert.equal(lost.length,1);
 const idle=[];run(elasticity,assignments,16,8,idle);assert.equal(idle.length,1);
});
