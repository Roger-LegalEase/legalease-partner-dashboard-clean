import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {nativeDecisionTime,historicalCheckTime,verifyHistoricalRelease} from './verify-historical-release.mjs';
import {assertCommittedPredecessor,assertForwardHosted,verifyPinnedForwardBinding,CANDIDATE,PENDING,TOOLS,PUBLICATION} from './verify-pinned-worker-successor.mjs';
import {pinnedRecords} from './prepare-pinned-worker-successor.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
// Synthetic native decision fixtures exercise integrity and chronology only;
// they cannot mint the private context or admit production.
function fixture(){
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-history-time-'));
 const prefix='hosted-acceptance-evidence/synthetic/';fs.mkdirSync(path.join(root,prefix),{recursive:true});
 const ref={runId:1,jobId:2,workflowSourceSha:'a'.repeat(40),runPath:prefix+'run.json',jobsPath:prefix+'jobs.json',receiptPath:prefix+'receipt.json',files:[]};
 const docs={run:{id:1,head_sha:ref.workflowSourceSha,status:'completed',conclusion:'success',event:'workflow_dispatch',repository:{full_name:'Roger-LegalEase/legalease-partner-dashboard-clean'}},jobs:{jobs:[{id:2,run_id:1,status:'completed',conclusion:'success',started_at:'2020-01-01T00:00:00Z',completed_at:'2020-01-01T00:01:00Z'}]},receipt:{capturedAt:'2020-01-01T00:00:30Z'}};
 const write=()=>{ref.files=[];for(const [key,doc]of Object.entries(docs)){const rel=ref[key+'Path'],bytes=Buffer.from(JSON.stringify(doc));fs.writeFileSync(path.join(root,rel),bytes);ref.files.push({path:rel,bytes:bytes.length,sha256:hash(bytes)});}};
 write();return {root,ref,docs,write,close:()=>fs.rmSync(root,{recursive:true,force:true})};
}
test('intact native historical decision does not expire with today',()=>{const f=fixture();try{assert.deepEqual(nativeDecisionTime(f.root,f.ref),{start:Date.parse('2020-01-01T00:00:00Z'),end:Date.parse('2020-01-01T00:01:00Z')});}finally{f.close();}});
for(const mode of ['missing','tampered','wrong run','wrong source','failed result','reversed chronology','stale at decision','future decision'])test('historical native decision refuses '+mode,()=>{
 const f=fixture();try{
 if(mode==='missing')fs.unlinkSync(path.join(f.root,f.ref.receiptPath));
 else if(mode==='tampered')fs.appendFileSync(path.join(f.root,f.ref.receiptPath),' ');
 else{if(mode==='wrong run')f.docs.jobs.jobs[0].run_id=3;
 if(mode==='wrong source')f.docs.run.head_sha='b'.repeat(40);
 if(mode==='failed result')f.docs.run.conclusion='failure';
 if(mode==='reversed chronology')f.docs.jobs.jobs[0].started_at='2020-01-02T00:00:00Z';
 if(mode==='stale at decision')f.docs.receipt.capturedAt='2019-12-30T00:00:00Z';
 if(mode==='future decision')f.docs.jobs.jobs[0].completed_at='2999-01-01T00:00:00Z';f.write();}
 assert.throws(()=>nativeDecisionTime(f.root,f.ref));
 }finally{f.close();}
});
test('caller-selected historical clocks cannot authorize current checks',()=>{assert.throws(()=>historicalCheckTime({time:0},process.cwd()),/private historical/);assert.throws(()=>assertForwardHosted({capturedAt:'2020-01-01T00:00:00Z'},{},undefined,process.cwd()),/fresh hosted/);});
test('historical snapshot preserves actual origin and canonical ref rather than its local branch',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-history-ref-'));
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:'pipe'}).trim();
 try{
  git(['init','--quiet']);git(['remote','add','origin','https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean']);
  fs.mkdirSync(path.join(root,'scripts/grade-a-launch-control'),{recursive:true});fs.mkdirSync(path.join(root,path.dirname(CANDIDATE)),{recursive:true});
  fs.writeFileSync(path.join(root,CANDIDATE),'{}');
  // Synthetic validator checks clone transport only; it supplies no real release evidence.
  fs.writeFileSync(path.join(root,'scripts/grade-a-launch-control/verify-release-candidate-binding.mjs'),`import {execFileSync} from 'node:child_process';import assert from 'node:assert/strict';export function verifyReleaseCandidateBinding(root){const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();assert.equal(git(['remote','get-url','origin']),'https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean');assert.equal(git(['rev-parse','refs/remotes/origin/captain-release']),git(['rev-parse','HEAD']));return {current:true,status:'CURRENT'};}`);
  git(['add','--',CANDIDATE,'scripts/grade-a-launch-control/verify-release-candidate-binding.mjs']);git(['-c','user.name=Synthetic Test','-c','user.email=synthetic@example.test','commit','--quiet','-m','synthetic historical ref fixture']);
  const base=git(['rev-parse','HEAD']);git(['update-ref','refs/remotes/origin/captain-release',base]);
  fs.writeFileSync(path.join(root,'unrelated-local-branch'),'synthetic');git(['add','--','unrelated-local-branch']);git(['-c','user.name=Synthetic Test','-c','user.email=synthetic@example.test','commit','--quiet','-m','unrelated synthetic local captain']);git(['branch','-f','captain-release','HEAD']);
  assert.notEqual(git(['rev-parse','captain-release']),base);
  git(['update-ref','-d','refs/remotes/origin/captain-release']);
  assert.throws(()=>assertCommittedPredecessor(root,base),/rev-parse/,'missing canonical ref cannot fall back to the local branch');
  git(['update-ref','refs/remotes/origin/captain-release',base]);
  assert.deepEqual(assertCommittedPredecessor(root,base),{historyValid:true,current:false,productionAuthorized:false});
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('forward caller verifies native-held predecessor in its own snapshot and retains native refusal',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-forward-context-'));
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:'pipe'}).trim();
 const write=(p,v)=>{fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),JSON.stringify(v));};
 const commit=()=>{git(['add','--','scripts/grade-a-launch-control/verify-release-candidate-binding.mjs',PENDING,CANDIDATE,TOOLS,PUBLICATION]);git(['-c','user.name=Synthetic Test','-c','user.email=synthetic@example.test','commit','--quiet','-m','synthetic context only']);return git(['rev-parse','HEAD']);};
 try{
  git(['init','--quiet']);git(['remote','add','origin','https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean']);
  fs.mkdirSync(path.join(root,'scripts/grade-a-launch-control'),{recursive:true});
  // The double proves snapshot selection only; the real publication guard must still refuse.
  fs.writeFileSync(path.join(root,'scripts/grade-a-launch-control/verify-release-candidate-binding.mjs'),`import fs from 'node:fs';import assert from 'node:assert/strict';export function verifyReleaseCandidateBinding(){assert.equal(JSON.parse(fs.readFileSync('${TOOLS}')).context,'native-held');return {bindingVerified:true,current:false,productionAuthorized:false,status:'SUCCESSOR_ACCEPTED_PREVIEW_AND_RESUME_PENDING'};}`);
  const held={status:'SUCCESSOR_ACCEPTED_PREVIEW_AND_RESUME_PENDING',runtimeAccepted:true,previewExecution:'held',productionAuthorized:false,deploymentAuthorized:false,clinicDispatchReady:false};
  write(CANDIDATE,held);write(TOOLS,{context:'native-held'});write(PENDING,{});write(PUBLICATION,{synthetic:'prior-publication'});const base=commit();
  const prior={schemaVersion:'synthetic-context-only',applicationSource:'pinned-source',runtimeAccepted:true,releaseBaseSha:base,sourceCommit:base};
  write(PENDING,prior);const nativeHeld=commit();git(['update-ref','refs/remotes/origin/captain-release',nativeHeld]);
  write(TOOLS,{context:'forward'});write(PENDING,{applicationSource:'pinned-source-forward',releaseBaseSha:nativeHeld,applicationSha:nativeHeld,toolsSha:nativeHeld,supersededRecord:prior});
  write(PUBLICATION,{supersededPublication:{synthetic:'deliberately-wrong'}});
  const result=verifyPinnedForwardBinding(root,{});
  assert.equal(result.bindingVerified,undefined);assert.equal(result.status,'INVALID_FORWARD_BINDING');
  assert.match(result.reasons.join(),/full publication predecessor preserved/,'actual caller passed its own saved context, then refused invalid native history');
  write(TOOLS,{context:'native-held'});write(PENDING,prior);
  for(const [key,value]of [['productionAuthorized',true],['deploymentAuthorized',true],['clinicDispatchReady',true],['runtimeAccepted',false]]){
   write(CANDIDATE,{...held,[key]:value});const invalid=commit();
   assert.throws(()=>assertCommittedPredecessor(root,invalid),'held historical context cannot grant '+key);
  }
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('real committed predecessor chain is history and new canonical preparation is HELD',()=>{
 const root=process.cwd(),base='9794f078553d8cd95aec47518ac773ee3e968fdc';
 assert.deepEqual(assertCommittedPredecessor(root,base),{historyValid:true,current:false,productionAuthorized:false});
 const records=pinnedRecords(root,{sourceSha:'b0b721470ea38455d8429c45300c9b3127bfe780',sourceRangeBaseSha:base,releaseBaseSha:base,toolsSha:'6c2f4c29b8cd9a80815dee13ffa15d912da5b59e'});
 assert.equal(records[PENDING].previewExecution,'held');assert.equal(records[PENDING].productionAuthorized,false);assert.equal(records[CANDIDATE].productionAuthorization,null);
});
