import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {readQualifiedDatabaseNoEffectRearm,QUALIFIED_DATABASE_NO_EFFECT} from './grade-a-launch-control/qualified-production-database-binding.mjs';
import {assertForwardSingleAttempt} from './grade-a-launch-control/forward-production-single-attempt.mjs';
const rearm=readQualifiedDatabaseNoEffectRearm(process.cwd()),original='2026-10-28T00:40:16.119879+00:00',head='a'.repeat(40),tools='b'.repeat(40),currentId=40619999999;
const candidate={toolsSha:tools,qualifiedWorkerDatabase:{technicalAdmissionAt:original,priorNoEffectRearm:rearm}},env={RCAP_PRODUCTION_PHASE:'forward_chain_migrate',GITHUB_TOKEN:'synthetic-inventory-token',GITHUB_RUN_ID:String(currentId),GITHUB_SHA:head};
const repo={full_name:'Roger-LegalEase/legalease-partner-dashboard-clean'},label='Apply and directly read back the exact Production forward migration chain';
// Synthetic native inventory only; the no-effect acceptance/result bytes above are actual independently preserved evidence.
function transport({known=true,other=false,runChange={},stepChange={},jobChange={},currentChange={}}={}){
 const current={id:currentId,head_sha:head,run_attempt:1,event:'workflow_dispatch',path:'.github/workflows/rcap-f1-ephemeral-staging.yml',head_branch:'captain-release',repository:repo,created_at:'2026-10-28T01:20:00Z',...currentChange};
 const prior={id:rearm.runId,head_sha:rearm.executionSha,run_attempt:1,event:'workflow_dispatch',path:current.path,head_branch:'captain-release',repository:repo,status:'completed',conclusion:'failure',created_at:'2026-10-28T01:11:40Z',...runChange};
 return async(url,options)=>{assert.equal(options.method,'GET');let body;if(url.includes('/jobs?'))body={jobs:[{id:rearm.jobId,...jobChange,steps:[{name:label,number:20,status:'completed',conclusion:'failure',...stepChange}]}]};else if(url.includes('/workflows/'))body={workflow_runs:[current,...(known?[prior]:[]),...(other?[{...prior,id:rearm.runId-1,created_at:'2026-10-28T00:50:00Z'}]:[])]};else body=current;return new Response(JSON.stringify(body),{status:200});};
}
test('actual C186 and raw zero-wire result required; missing/changed evidence refuses',()=>{
 assert.equal(rearm.runId,40613540061);const dir=fs.mkdtempSync(path.join(os.tmpdir(),'qualified-rearm-evidence-'));try{
  assert.throws(()=>readQualifiedDatabaseNoEffectRearm(dir));const file=path.join(dir,QUALIFIED_DATABASE_NO_EFFECT.path);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'{}');assert.throws(()=>readQualifiedDatabaseNoEffectRearm(dir),{code:'ERR_ASSERTION'});
 }finally{fs.rmSync(dir,{recursive:true});}
});
test('known failed step remains positively accounted, preserving original admission cutoff',async()=>{
 const result=await assertForwardSingleAttempt(candidate,{env,fetchImpl:transport()});assert.equal(result.originalTechnicalAdmissionAt,original);assert.equal(result.knownAttempts[0].classification,'KNOWN_ACCEPTED_NO_EFFECT');assert.equal(result.knownAttempts[0].runId,rearm.runId);assert.equal(result.knownAttempts[0].disposition.sha256,'186ee65aa9d932f58bbb8456f3860a03470782649c878b540abfafaf84c45aed');
});
test('any other attempted run remains blocking even before the new disposition time',()=>assert.rejects(assertForwardSingleAttempt(candidate,{env,fetchImpl:transport({other:true})})));
test('absent known history or changed old run/job/step identities cannot be silently skipped',async()=>{
 for(const change of [{known:false},{runChange:{head_sha:'c'.repeat(40)}},{runChange:{run_attempt:2}},{jobChange:{id:1}},{stepChange:{number:19}},{stepChange:{conclusion:'success'}}])await assert.rejects(assertForwardSingleAttempt(candidate,{env,fetchImpl:transport(change)}));
});
test('current old controller/tools or ambiguous same-second timestamp refuse rearm',async()=>{
 await assert.rejects(assertForwardSingleAttempt({...candidate,toolsSha:rearm.toolsSha},{env,fetchImpl:transport()}));
 await assert.rejects(assertForwardSingleAttempt(candidate,{env:{...env,GITHUB_SHA:rearm.executionSha},fetchImpl:transport({currentChange:{head_sha:rearm.executionSha}})}));
 await assert.rejects(assertForwardSingleAttempt(candidate,{env,fetchImpl:transport({currentChange:{created_at:'2026-10-28T01:18:06Z'}})}));
});
