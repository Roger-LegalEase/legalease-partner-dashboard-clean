import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {OWNED_MATTER,OWNED_CHECKS,OWNED_SQL_SHA,qualifyOwnedMatterRow,readOwnedMatterDatabase,readOwnedMatterGate,assertOwnedMatterReadonlyDispatch} from './rcap-clinic-owned-matter-prerequisites.mjs';
import {CLINIC_SETUP} from './rcap-clinic-setup-only-boundary.mjs';
const identity={ownerId:CLINIC_SETUP.owner,matterId:OWNED_MATTER,pendingId:'98fea483-9e4b-41bf-833b-1bf57e359fa6',screeningId:'56f6cbfa-3dd2-44b1-95bf-84c800396519',clinicCaseId:'31b63a9d-7016-4b71-af1e-8b3426f142cc',assistanceId:'ad03264c-a40b-4217-b724-8851b39ce914',claimAuditId:'292de01d-d377-4b92-b13f-5a49008d4455',eventId:CLINIC_SETUP.event};
function row(){return {execution_context:{current_user:'postgres',session_user:'postgres',transaction_read_only:'on'},checks:Object.fromEntries(OWNED_CHECKS.map(k=>[k,true])),businessFingerprint:'a'.repeat(64),identities:identity,counts:Object.fromEntries(['matterRows','pendingRows','screeningRows','caseRows','assistanceRows','mattersForSession','pendingForSession','casesForSession','screeningAnswerCount','pendingAnswerCount','matterScreeningAnswerCount','historyCodeCount','historyRedemptionCount','historyUseCounters','linkedClaimAuditCount'].map(k=>[k,({screeningAnswerCount:0,pendingAnswerCount:7,matterScreeningAnswerCount:7,historyCodeCount:8,historyRedemptionCount:22,historyUseCounters:9}[k]??1)]))};}
const env={GITHUB_RUN_ID:'42',GITHUB_RUN_ATTEMPT:'1',GITHUB_SHA:'b'.repeat(40)};
function gate(){return {schema:'clinic_owned_matter_readonly/v1',status:'READY',matterId:OWNED_MATTER,projectRef:CLINIC_SETUP.project,applicationSha:CLINIC_SETUP.app,deploymentId:CLINIC_SETUP.deploymentId,controlHead:env.GITHUB_SHA,runId:'42',runAttempt:'1',capturedAt:'2026-10-25T17:00:00Z',blockers:[],checks:[...OWNED_CHECKS,'exact_current_preview','shipped_and_server_captcha'].map(id=>({id,ok:true})),databaseEvidence:{...qualifyOwnedMatterRow(row()),sqlSha256:OWNED_SQL_SHA,httpStatus:201},preview:{previewVerified:true,deploymentId:CLINIC_SETUP.deploymentId,hostname:new URL(CLINIC_SETUP.origin).hostname,applicationSha:CLINIC_SETUP.app,acceptanceProjectRef:CLINIC_SETUP.project,routeState:'disabled',stripeConfigured:false,productionAliasCount:0},captchaPolicy:{project:CLINIC_SETUP.project,serverCaptchaRequired:false,frontend:{applicationSha:CLINIC_SETUP.app,deploymentId:CLINIC_SETUP.deploymentId,clientCaptchaRequired:false,widgetSiteKeyConfigured:true}}};}
function read(g,overrides={}) {const dir=fs.mkdtempSync(path.join(os.tmpdir(),'owned-gate-test-'));try{const file=path.join(dir,'gate.json');fs.writeFileSync(file,JSON.stringify(g));return readOwnedMatterGate(file,{...env,...overrides},Date.parse('2026-10-25T17:01:00Z'));}finally{fs.rmSync(dir,{recursive:true,force:true});}}
test('owned-matter transport sends exact reviewed explicit READ ONLY SQL and accepts documented 201',async()=>{
 let calls=0;const result=await readOwnedMatterDatabase({env:{SUPABASE_ACCESS_TOKEN:'private-test-token'},fetchImpl:async(url,options)=>{calls++;assert.equal(url,`https://api.supabase.com/v1/projects/${CLINIC_SETUP.project}/database/query`);assert.equal(options.method,'POST');assert.equal(options.redirect,'error');const body=JSON.parse(options.body);assert.deepEqual(Object.keys(body),['query']);assert.match(body.query,/begin transaction read only;/);assert.match(body.query,/commit;\s*$/);return {status:201,json:async()=>[{owned_matter_readonly:row()}]};}});
 assert.equal(calls,1);assert.equal(result.httpStatus,201);assert.ok(result.checks.every(c=>c.ok));assert.doesNotMatch(JSON.stringify(result),/private-test-token/);
});
test('owned-matter failures retain permission SQLSTATE/status and never provider contents',async()=>{
 const result=await readOwnedMatterDatabase({env:{SUPABASE_ACCESS_TOKEN:'secret'},fetchImpl:async()=>({status:403,json:async()=>({code:'42501',message:'private database content'})})});assert.equal(result.httpStatus,403);assert.equal(result.sqlstate,'42501');assert.equal(result.checks[0].stage,'database_status');assert.doesNotMatch(JSON.stringify(result),/private database content|secret/);
});
test('owned-matter malformed or wrong-owner response never qualifies',async()=>{
 for(const response of [null,{},[],[{}],[{owned_matter_readonly:{...row(),identities:{...identity,ownerId:OWNED_MATTER}}}]]){const result=await readOwnedMatterDatabase({env:{SUPABASE_ACCESS_TOKEN:'secret'},fetchImpl:async()=>({status:201,json:async()=>response})});assert.equal(result.checks[0].ok,false);assert.equal(result.checks[0].stage,'database_contract');}
});
test('owned-matter role/read-only mismatch and missing answer check remain blocking',()=>{
 for(const patch of [{current_user:'supabase_read_only_user'},{transaction_read_only:'off'}]){const r=row();Object.assign(r.execution_context,patch);assert.equal(qualifyOwnedMatterRow(r).checks.find(c=>c.id==='inspector_readonly').ok,false);}
 const r=row();r.checks.pending_has_seven_answers=false;assert.equal(qualifyOwnedMatterRow(r).checks.find(c=>c.id==='pending_has_seven_answers').ok,false);
});
test('owned-matter gate requires fresh exact source/run/runtime/owner proof, not old READY label',()=>{
 assert.equal(read(gate()).status,'READY');
 for(const change of [g=>g.runId='41',g=>g.controlHead='c'.repeat(40),g=>g.matterId='wrong',g=>g.projectRef='wrong',g=>g.capturedAt='2026-10-25T16:00:00Z',g=>g.capturedAt='2026-10-25T18:00:00Z',g=>g.checks.pop(),g=>g.checks[0].ok=false,g=>g.blockers.push('failure'),g=>g.databaseEvidence.executionContext.current_user='service_role',g=>g.captchaPolicy.serverCaptchaRequired=true,g=>g.captchaPolicy.frontend.clientCaptchaRequired=true,g=>g.preview.routeState='enabled']){const g=gate();change(g);assert.throws(()=>read(g));}
 assert.throws(()=>read(gate(),{GITHUB_RUN_ATTEMPT:'2'}));
});
test('owned-matter dispatch has no intake attempt or different matter/deployment authority',()=>{
 const inputs={mode:'clinic_owned_matter_readonly',resume_matter_id:OWNED_MATTER,clinic_attempt_id:'',application_sha:CLINIC_SETUP.app,worker_source_sha:'16908485a94f475448657cea90583a4d352da9a3',worker_digest:'sha256:4f8c71c3630e6c110427d111518be149f3c74d46c856633fc5536a8065bc17af',tools_sha:'98f89f0db0bcb60088341c35595a072edd9031a4'};
 assertOwnedMatterReadonlyDispatch(inputs);for(const patch of [{mode:'clinic_setup_only'},{resume_matter_id:'different'},{clinic_attempt_id:'spent'},{application_sha:'other'},{preview_deployment_id:'other'}])assert.throws(()=>assertOwnedMatterReadonlyDispatch({...inputs,...patch}));
});
test('owned-matter workflow isolates authenticated read from setup/deployment and always checks post-state',()=>{
 const workflow=fs.readFileSync(new URL('../.github/workflows/rcap-f1-ephemeral-staging.yml',import.meta.url),'utf8');const job=workflow.split('\n  clinic_owned_matter_readonly:\n')[1].split('\n  production_hotfix:')[0];assert.ok(job);assert.match(job,/if: inputs.mode == 'clinic_owned_matter_readonly'/);assert.match(job,/persist-credentials: false/);assert.match(job,/always\(\) && steps.prerequisites.outcome == 'success'/);assert.match(job,/owned-matter-prerequisites.mjs --after/);assert.doesNotMatch(job,/ISSUE_CLINIC_CODE|ALLOW_MUTATION|workflow_dispatch|vercel deploy|npm run build/);
 const browser=job.split('id: reopen')[1].split('- name: Verify business')[0];assert.doesNotMatch(browser,/SUPABASE_ACCESS_TOKEN|VERCEL_TOKEN|STRIPE|FLY_API_TOKEN/);
 assert.equal(JSON.parse(fs.readFileSync(new URL('../vercel.json',import.meta.url))).git.deploymentEnabled['codex/d-clinic-setup-only-20261024'],false);
});

test('owned-matter numeric counts cannot contradict passing SQL flags',()=>{const r=row();r.counts.matterRows=2;assert.equal(qualifyOwnedMatterRow(r).checks.find(c=>c.id==='exact_records_exist').ok,false);r.counts.historyCodeCount=9;assert.equal(qualifyOwnedMatterRow(r).checks.find(c=>c.id==='stored_history_counts_preserved').ok,false);});

test('owned-matter authoritative answer mismatch remains blocking without fabricating session answers',()=>{const r=row();r.checks.pending_saved_answers_match=false;const result=qualifyOwnedMatterRow(r);assert.equal(result.checks.find(c=>c.id==='pending_saved_answers_match').ok,false);assert.equal(result.counts.screeningAnswerCount,0);});
