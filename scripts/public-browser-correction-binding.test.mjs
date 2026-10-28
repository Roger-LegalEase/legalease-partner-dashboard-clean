import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {readQualifiedPublicBrowserCorrection,prepareQualifiedPublicVerificationRecords} from './grade-a-launch-control/qualified-production-database-binding.mjs';
import {assertForwardSingleAttempt} from './grade-a-launch-control/forward-production-single-attempt.mjs';
const head=()=>execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),base='909b83fce17244b49e59341ca82f0c1cf9c5b097';
test('corrected public binding pins actual failed readonly attempt and ten accepted native verdicts without inventing browser completion',()=>{
 const prior=readQualifiedPublicBrowserCorrection(process.cwd());assert.equal(prior.runId,40635569139);assert.equal(prior.stepNumber,8);assert.equal(prior.acceptedLiveVerdicts,10);
 const records=prepareQualifiedPublicVerificationRecords(process.cwd(),{toolsSha:head(),releaseBaseSha:base});assert.equal(Object.keys(records).length,3);for(const r of Object.values(records)){assert.deepEqual(r.productionAuthorization.phases,['public_verify']);assert.deepEqual(r.qualifiedWorkerDatabase.priorPublicAttempt,prior);assert.equal(r.supersededRecord.toolsSha,'aecdf1948215562589370a39a8cc4f6e6302b32e');assert.equal(r.qualifiedWorkerDatabase.completedWorker.historicalCleanExitObserved,false);assert.equal(r.canonicalSourceEquivalent,false);}
});
test('native inventory accounts only exact failed public job step8 and refuses missing, altered or additional attempts',async()=>{
 const candidate=JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json')),prior=readQualifiedPublicBrowserCorrection(process.cwd()),sha='e'.repeat(40),id=40636669999;candidate.toolsSha=sha;candidate.qualifiedWorkerDatabase.priorPublicAttempt=prior;
 const current={id,head_sha:sha,run_attempt:1,event:'workflow_dispatch',path:'.github/workflows/rcap-f1-ephemeral-staging.yml',head_branch:'captain-release',repository:{full_name:'Roger-LegalEase/legalease-partner-dashboard-clean'},created_at:'2026-10-28T05:20:00Z'},failed={...current,id:prior.runId,head_sha:prior.executionSha,status:'completed',conclusion:'failure',created_at:'2026-10-28T05:00:00Z'},step={name:'Verify the activated release on the public domain',number:8,status:'completed',conclusion:'failure'};
 const env={RCAP_PRODUCTION_PHASE:'public_verify',GITHUB_TOKEN:'fixture',GITHUB_RUN_ID:String(id),GITHUB_SHA:sha};
 const request=mode=>async(url,{method})=>{assert.equal(method,'GET');const extra={...failed,id:prior.runId+1};let body=url.includes('/workflows/')?{workflow_runs:[current,...(mode==='missing'?[]:[failed]),...(mode==='extra'?[extra]:[])]}:url.includes('/jobs?')?{jobs:[{id:prior.jobId,steps:[{...step,number:mode==='wrong-step'?9:8}]}]}:current;return new Response(JSON.stringify(body),{status:200});};
 const result=await assertForwardSingleAttempt(candidate,{env,fetchImpl:request('exact')});assert.equal(result.knownAttempts[0].runId,prior.runId);for(const mode of ['missing','wrong-step','extra'])await assert.rejects(assertForwardSingleAttempt(candidate,{env,fetchImpl:request(mode)}));
});
