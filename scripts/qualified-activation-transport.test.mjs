import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {assertForwardSingleAttempt} from './grade-a-launch-control/forward-production-single-attempt.mjs';
// Synthetic native phase inventory only; no actual activation/public result or permission is manufactured.
test('activation/public inventory retains prior-attempt refusal without demanding migration histories under unrelated step labels',async()=>{
 const candidate=JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json')),currentId=40629999999,sha='c'.repeat(40),repo={full_name:'Roger-LegalEase/legalease-partner-dashboard-clean'};
 for(const phase of ['activate']){
  const step=phase==='activate'?'Activate the exact staged Production deployment with rollback protection':'Verify the activated release on the public domain';
  const current={id:currentId,head_sha:sha,run_attempt:1,event:'workflow_dispatch',path:'.github/workflows/rcap-f1-ephemeral-staging.yml',head_branch:'captain-release',repository:repo,created_at:'2026-10-28T03:50:00Z'},prior={...current,id:currentId-1,created_at:'2026-10-28T03:40:00Z'};
  const transport=attempted=>async(url,options)=>{assert.equal(options.method,'GET');const body=url.includes('/workflows/')?{workflow_runs:[current,prior]}:url.includes('/jobs?')?{jobs:[{steps:[{name:attempted?step:'Apply and directly read back the exact Production forward migration chain',number:20,status:'completed',conclusion:'failure'}]}]}:current;return new Response(JSON.stringify(body),{status:200});};
  const env={RCAP_PRODUCTION_PHASE:phase,GITHUB_TOKEN:'synthetic-token',GITHUB_RUN_ID:String(currentId),GITHUB_SHA:sha};await assertForwardSingleAttempt(candidate,{env,fetchImpl:transport(false)});await assert.rejects(assertForwardSingleAttempt(candidate,{env,fetchImpl:transport(true)}));
 }
});
