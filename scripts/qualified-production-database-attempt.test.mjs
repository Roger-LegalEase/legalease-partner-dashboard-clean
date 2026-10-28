import test from 'node:test';
import assert from 'node:assert/strict';
import {assertForwardSingleAttempt} from './grade-a-launch-control/forward-production-single-attempt.mjs';
const source='a'.repeat(40),when='2026-10-28T00:20:30.900Z',candidate={qualifiedWorkerDatabase:{technicalAdmissionAt:when}},env={RCAP_PRODUCTION_PHASE:'forward_chain_migrate',GITHUB_TOKEN:'synthetic-read-only',GITHUB_RUN_ID:'1000',GITHUB_SHA:source};
const label='Apply and directly read back the exact Production forward migration chain';
function transport(prior=null){return async(url,options)=>{
 assert.equal(options.method,'GET');assert.equal(options.redirect,'error');
 const current={id:1000,head_sha:source,run_attempt:1,event:'workflow_dispatch',path:'.github/workflows/rcap-f1-ephemeral-staging.yml',head_branch:'captain-release',repository:{full_name:'Roger-LegalEase/legalease-partner-dashboard-clean'}};
 const body=url.includes('/jobs?')?{jobs:[{steps:prior?[{name:label,...prior}]:[]}]}:url.includes('/workflows/')?{workflow_runs:[{id:999,created_at:'2026-10-28T00:20:30.000Z'},current]}:current;
 return new Response(JSON.stringify(body),{status:200});
};}
test('first exact current qualified database attempt requires native GET-only inventory',()=>assertForwardSingleAttempt(candidate,{env,fetchImpl:transport()}));
for(const prior of [{status:'completed',conclusion:'failure'},{status:'completed',conclusion:'success'},{status:'in_progress',conclusion:null}])test('a prior current-package attempt consumes the operation even within the same approval second '+prior.status+prior.conclusion,()=>assert.rejects(assertForwardSingleAttempt(candidate,{env,fetchImpl:transport(prior)})));
test('missing native inventory credentials refuses before provider effects',()=>assert.rejects(assertForwardSingleAttempt(candidate,{env:{...env,GITHUB_TOKEN:''},fetchImpl:()=>assert.fail('no fetch')})));
