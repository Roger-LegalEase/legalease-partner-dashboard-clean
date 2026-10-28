import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync,spawnSync} from 'node:child_process';
import {parse} from 'yaml';
import {assertForwardSingleAttempt} from './grade-a-launch-control/forward-production-single-attempt.mjs';
const dispatcher=parse(fs.readFileSync('.github/workflows/rcap-f1-ephemeral-staging.yml','utf8')),steps=dispatcher.jobs.production_public_verify.steps;
const ancestry=steps.find(s=>s.name==='Verify ancestry and retain the exact workflow execution commit').run,gate=steps.find(s=>s.name==='Require current release and separate public-verification authorization').run;
const app='4c189b682d0a9225a21b9fdf8a2ebc50500029d6',worker='84a75b6e65dc69e6c371afac44f1284e0debf722',digest='sha256:c574d7ca3864dfcae9de3cb4fc77c8c324ace050310333093042f961e6f0b5f1',tools='a'.repeat(40);
const expand=s=>s.replaceAll('${{ inputs.application_sha }}',app).replaceAll('${{ inputs.worker_source_sha }}',worker).replaceAll('${{ inputs.tools_sha }}',tools);
test('actual public ancestry shell uses only bounded captain/seven refs for qualified tuple and retains strict canonical legacy branch',()=>{
 const prefix=`git(){ case "$1" in rev-parse) printf '%s\\n' "$GITHUB_SHA";; *) printf 'git:%s\\n' "$*";; esac; };\\n`.replaceAll('\\n','\n');
 const env={...process.env,GITHUB_SHA:tools,RCAP_APPLICATION_SHA:app,RCAP_WORKER_SOURCE_SHA:worker,RCAP_WORKER_DIGEST:digest,CANONICAL_INTEGRATION_BRANCH:'canonical-fixture'};
 const q=execFileSync('bash',['-c',prefix+expand(ancestry)],{env,encoding:'utf8'});assert(q.includes('git:fetch --no-tags --depth=257 origin captain-release'));assert.equal(q.split('\n').filter(s=>s.includes('git:cat-file')).length,7);assert(!q.includes('origin/canonical-fixture'));
 const legacy=execFileSync('bash',['-c',prefix+expand(ancestry)],{env:{...env,RCAP_WORKER_SOURCE_SHA:'b'.repeat(40)},encoding:'utf8'});assert(legacy.includes('git:fetch --no-tags origin canonical-fixture'));assert(legacy.includes('origin/canonical-fixture'));assert(legacy.includes('git:diff --quiet'));
});
test('actual public gate always requires current qualified authorization and keeps generic canonical equivalence only on legacy path',()=>{
 const prefix=`node(){ if [ "$1" = -e ]; then return "$IS_QUALIFIED"; fi; printf '%s\\n' "$*"; if [ "$1" = scripts/rcap-production-migration-contract.mjs ] && [ "$DENY_CURRENT" = 1 ]; then return 1; fi; };\\n`.replaceAll('\\n','\n');
 const env={...process.env,IS_QUALIFIED:'0',DENY_CURRENT:'0'};
 const q=execFileSync('bash',['-c',prefix+expand(gate)],{env,encoding:'utf8'});assert(q.includes('scripts/rcap-production-migration-contract.mjs'));assert(!q.includes('scripts/verify-rcap-worker-input-equivalence.mjs'));
 const legacy=execFileSync('bash',['-c',prefix+expand(gate)],{env:{...env,IS_QUALIFIED:'1'},encoding:'utf8'});assert(legacy.includes('scripts/verify-rcap-worker-input-equivalence.mjs'));
 const denied=spawnSync('bash',['-c',prefix+expand(gate)],{env:{...env,DENY_CURRENT:'1'},encoding:'utf8'});assert.notEqual(denied.status,0);assert(!denied.stdout.includes('scripts/verify-rcap-worker-input-equivalence.mjs'));
});

// Synthetic native phase inventory only; no actual activation/public result or permission is manufactured.
test('activation/public inventory retains prior-attempt refusal without demanding migration histories under unrelated step labels',async()=>{
 const candidate=JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json')),currentId=40629999999,sha='c'.repeat(40),repo={full_name:'Roger-LegalEase/legalease-partner-dashboard-clean'};
 for(const phase of ['public_verify']){
  const step=phase==='activate'?'Activate the exact staged Production deployment with rollback protection':'Verify the activated release on the public domain';
  const current={id:currentId,head_sha:sha,run_attempt:1,event:'workflow_dispatch',path:'.github/workflows/rcap-f1-ephemeral-staging.yml',head_branch:'captain-release',repository:repo,created_at:'2026-10-28T03:50:00Z'},prior={...current,id:currentId-1,created_at:'2026-10-28T03:40:00Z'};
  const transport=attempted=>async(url,options)=>{assert.equal(options.method,'GET');const body=url.includes('/workflows/')?{workflow_runs:[current,prior]}:url.includes('/jobs?')?{jobs:[{steps:[{name:attempted?step:'Apply and directly read back the exact Production forward migration chain',number:20,status:'completed',conclusion:'failure'}]}]}:current;return new Response(JSON.stringify(body),{status:200});};
  const env={RCAP_PRODUCTION_PHASE:phase,GITHUB_TOKEN:'synthetic-token',GITHUB_RUN_ID:String(currentId),GITHUB_SHA:sha};await assertForwardSingleAttempt(candidate,{env,fetchImpl:transport(false)});await assert.rejects(assertForwardSingleAttempt(candidate,{env,fetchImpl:transport(true)}));
 }
});
