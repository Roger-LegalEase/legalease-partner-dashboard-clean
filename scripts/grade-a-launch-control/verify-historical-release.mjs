// Historical time is a capability derived from hashed native evidence, never
// a caller-selected clock. No historical result is current execution authority.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const contexts=new WeakMap();
const hash=b=>createHash('sha256').update(b).digest('hex');
export function historicalCheckTime(context,root,kind='receipt'){
 if(context===undefined)return Date.now();
 const bound=contexts.get(context);assert(bound&&bound.root===root,'private historical verification context');return kind==='hosted'?bound.hostedTime:bound.time;
}
export function nativeDecisionTime(root,ref){
 assert(ref&&Array.isArray(ref.files),'independently evidenced historical decision required');
 const bytes=rel=>{
  assert(typeof rel==='string'&&rel.startsWith('hosted-acceptance-evidence/')&&!rel.split('/').includes('..'));
  const f=ref.files.find(f=>f.path===rel);assert(f,'native decision inputs must be hashed');
  const b=fs.readFileSync(path.join(root,rel));assert.equal(b.length,f.bytes);assert.equal(hash(b),f.sha256);return b;
 };
 for(const f of ref.files)bytes(f.path);
 const run=JSON.parse(bytes(ref.runPath)),jobs=JSON.parse(bytes(ref.jobsPath));
 const job=jobs.jobs.find(j=>j.id===ref.jobId);assert(job,'exact native decision job');
 assert.equal(run.id,ref.runId);assert.equal(run.head_sha,ref.workflowSourceSha);assert.equal(run.status,'completed');assert.equal(run.conclusion,'success');assert.equal(run.event,'workflow_dispatch');assert.equal(run.repository.full_name.toLowerCase(),'roger-legalease/legalease-partner-dashboard-clean');
 assert.equal(job.run_id,run.id);if(job.head_sha!==undefined)assert.equal(job.head_sha,run.head_sha);if(job.run_attempt!==undefined)assert.equal(job.run_attempt,run.run_attempt);assert.equal(job.status,'completed');assert.equal(job.conclusion,'success');
 const start=Date.parse(job.started_at),end=Date.parse(job.completed_at);
 assert(Number.isFinite(start)&&Number.isFinite(end)&&start<=end&&end<=Date.now(),'native decision chronology');
 const receipt=JSON.parse(bytes(ref.receiptPath));const captured=Date.parse(receipt.finishedAt??receipt.capturedAt);
 assert(Number.isFinite(captured)&&captured>=start&&captured<=end,'receipt belongs to native decision interval');
 return {start,end};
}
export async function verifyHistoricalRelease(root,candidate){
 const refs=candidate.forwardProduction?Object.values(candidate.forwardProduction.receipts):[candidate.hostedAdmission];
 assert(refs.length>0,'independently evidenced historical decision required');
 const intervals=refs.map(ref=>nativeDecisionTime(root,ref));
 if(candidate.forwardProduction)assert(Date.parse(candidate.forwardProduction.owner.recordedAt)<=Math.min(...intervals.map(t=>t.start)),'owner decision precedes native execution');
 const context={};contexts.set(context,{root,time:Math.max(...intervals.map(t=>t.end)),hostedTime:Math.max(...intervals.map(t=>candidate.forwardProduction?t.start:t.end))});
 try{
  const {verifyReleaseCandidateBinding}=await import('./verify-release-candidate-binding.mjs');
  const result=verifyReleaseCandidateBinding(root,candidate,[],context);
  assert(result.bindingVerified&&result.status==='CURRENT',JSON.stringify(result));
  return {historyValid:true,current:false,status:'HISTORICAL_VALID',productionAuthorized:false};
 }finally{contexts.delete(context);}
}
