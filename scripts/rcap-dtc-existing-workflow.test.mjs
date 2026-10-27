import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import YAML from 'yaml';
import {DTC} from './rcap-hosted-saved-dtc-contracts.mjs';
const TOOLS='3050c1b49187584bd040558393e9689ab121c84c',MODE='dtc_saved_existing_fulfillment',file='.github/workflows/rcap-f1-ephemeral-staging.yml';
const original=execFileSync('git',['show',TOOLS+':'+file],{encoding:'utf8',maxBuffer:1048576}),raw=fs.readFileSync(file,'utf8'),workflow=YAML.parse(raw),before=YAML.parse(original),job=workflow.jobs[MODE],steps=job.steps,old=before.jobs.dtc_saved_fulfillment;
const guard=steps.find(s=>s.name?.startsWith('Require exact saved-case')),windowGuard=steps.find(s=>s.id==='window_guard'),copy=steps.find(s=>s.name?.startsWith('Copy only six'));
const sourcePins=JSON.parse(/Object\.entries\((\{"scripts\/rcap-hosted-saved-dtc-controls\.test\.mjs".*?\})\)/.exec(guard.run)[1]);
const recordPins=script=>JSON.parse(/const sourceRecords=(\{.*?\});/.exec(script)[1]);
const payload={mode:MODE,application_sha:DTC.app,tools_sha:DTC.tools,worker_source_sha:DTC.worker,worker_digest:DTC.digest,supabase_project_ref:DTC.project,preview_deployment_id:DTC.deploymentId,preview_hostname:new URL(DTC.origin).hostname,preview_creation_run_id:'40441747499',resume_matter_id:DTC.item};
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),env={...process.env,PATH:path.dirname(process.execPath)+':'+process.env.PATH,GITHUB_REPOSITORY:'Roger-LegalEase/legalease-partner-dashboard-clean',GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_RUN_ATTEMPT:'1',GITHUB_REF_NAME:'codex/f-vercel-raw-readonly-20261026',GITHUB_SHA:sha,GITHUB_WORKFLOW_SHA:sha};
const run=(script,cwd,input=payload,extra={})=>spawnSync('/bin/bash',['-e','-o','pipefail','-c',script],{cwd,env:{...env,DISPATCH_INPUTS:JSON.stringify(input),...extra},encoding:'utf8',timeout:15000,maxBuffer:1048576});
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
test('one exclusive new job and mode option leave every old job and all other workflow bytes unchanged',()=>{
 const start=raw.indexOf('  '+MODE+':\n'),tail=raw.slice(start+3).search(/^  [A-Za-z0-9_-]+:\n/m),end=tail<0?raw.length:start+3+tail;const stripped=(raw.slice(0,start)+raw.slice(end)).replace('options: ['+MODE+', ','options: [');assert.equal(stripped,original);
 const next=structuredClone(workflow);delete next.jobs[MODE];next.on.workflow_dispatch.inputs.mode.options=next.on.workflow_dispatch.inputs.mode.options.filter(x=>x!==MODE);assert.deepEqual(next,before);assert.equal(workflow.on.workflow_dispatch.inputs.mode.options.filter(x=>x===MODE).length,1);
 for(const mode of workflow.on.workflow_dispatch.inputs.mode.options){const selected=Object.entries(workflow.jobs).filter(([,j])=>Function('inputs','startsWith','return '+j.if)({mode},(a,b)=>a.startsWith(b))).map(([name])=>name);if(mode===MODE)assert.deepEqual(selected,[MODE]);else assert(!selected.includes(MODE));}
});
test('frozen source closure pins current bytes including the dependency-free helper and prior accepted implementation',()=>{
 for(const [file,pin]of Object.entries(sourcePins))assert.equal(hash(fs.readFileSync(file)),pin,file);for(const f of ['scripts/rcap-dtc-existing-fulfillment.mjs','scripts/rcap-dtc-existing-session-readonly.mjs','scripts/rcap-dtc-existing-precredential.test.mjs','scripts/rcap-dtc-existing-workflow.test.mjs'])assert(sourcePins[f]);
});
test('real precredential source guard passes exact actual noPay bytes without packages, refuses wrong dispatch/source',()=>{
 assert(process.env.DTC_NO_PAY_EVIDENCE_FILE);const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'b-dtc-job-source-nodeps-'));
 try{
  for(const f of Object.keys(sourcePins)){fs.mkdirSync(path.dirname(path.join(tmp,f)),{recursive:true});fs.copyFileSync(f,path.join(tmp,f));}fs.copyFileSync('vercel.json',path.join(tmp,'vercel.json'));
  const actual=fs.readFileSync(process.env.DTC_NO_PAY_EVIDENCE_FILE);fs.writeFileSync(path.join(tmp,'scripts/dtc-existing-session-no-pay-result.json'),actual);fs.writeFileSync(path.join(tmp,'scripts/dtc-existing-session-no-pay-result.sha256'),hash(actual)+'\n');
  const valid=run(guard.run,tmp);assert.equal(valid.status,0,valid.stderr);assert(!fs.existsSync(path.join(tmp,'node_modules')));
  for(const change of [{mode:'dtc_saved_fulfillment'},{application_sha:'0'.repeat(40)},{resume_matter_id:'wrong'},{promotion_code:'discount'},{sponsor_fulfillment:true}])assert.notEqual(run(guard.run,tmp,{...payload,...change}).status,0);
  assert.notEqual(run(guard.run,tmp,payload,{GITHUB_WORKFLOW_SHA:'f'.repeat(40)}).status,0);
  fs.appendFileSync(path.join(tmp,'scripts/rcap-dtc-existing-fulfillment.mjs'),'\n');assert.notEqual(run(guard.run,tmp).status,0);
 }finally{fs.rmSync(tmp,{recursive:true,force:true});}
});
test('all six source records are hash-bound before credentials and copied only into immutable admitted tools',()=>{
 const a=recordPins(windowGuard.run),b=recordPins(copy.run);assert.deepEqual(a,b);assert.deepEqual(Object.keys(a),['dtc-controlled-window.json','dtc-controlled-window.sha256','dtc-fulfillment-custody.json','dtc-fulfillment-custody.sha256','dtc-existing-session-no-pay-result.json','dtc-existing-session-no-pay-result.sha256']);
 assert.equal(a['dtc-existing-session-no-pay-result.json'],'7f86e1bca776f3cfef11792c8baa49dc0c744acad0761fc5cd15ab420583aac4');
 if(Object.values(a).some(v=>v===null)){const held=run(windowGuard.run,process.cwd());assert.notEqual(held.status,0);assert.match(held.stderr,/ACTUAL_FRESH_SOURCE_RECORD_NOT_BOUND/);}
 const firstCredential=steps.findIndex(s=>Object.values(s.env??{}).some(v=>/secrets\.|github.token/.test(String(v))));assert(steps.indexOf(guard)<firstCredential);assert(steps.indexOf(windowGuard)<firstCredential);
 const checkouts=steps.filter(s=>s.uses==='actions/checkout@v4');assert.deepEqual(checkouts.map(s=>[s.with.path,s.with.ref]),[['carrier','${{ github.sha }}'],['admitted-controller','3bcfda1b814b7499d29cfa2817af2373493b68b6'],['admitted-tools',TOOLS]]);assert(checkouts.every(s=>s.with['persist-credentials']===false));assert(copy.run.includes("fs.copyFileSync"));assert(copy.run.includes('0o600'));assert(copy.run.includes("'admitted-tools'"));assert(!copy.run.includes('node_modules'));
});
test('one existing dependency install and image pull/inspect precede preparation and new-tools entry',()=>{
 const installs=steps.filter(s=>s.run?.startsWith('npm ci')),pulls=steps.filter(s=>s.run?.startsWith('docker pull '));assert.equal(installs.length,1);assert.equal(pulls.length,1);assert.equal(pulls[0].run.trim(),'docker pull ghcr.io/roger-legalease/rcap-render-worker@'+DTC.digest);assert(installs[0].run.includes('ln -s ../admitted-controller/node_modules ../admitted-tools/node_modules'));
 const entry=steps.find(s=>s.run?.includes('node scripts/rcap-hosted-saved-dtc-entry.mjs')),prepare=steps.find(s=>s.id==='retarget_prepare'),inspect=steps.find(s=>s.name?.startsWith('Inspect exact'));
 assert(steps.indexOf(copy)<steps.indexOf(installs[0]));assert(steps.indexOf(pulls[0])<steps.indexOf(inspect));assert(steps.indexOf(inspect)<steps.indexOf(prepare));assert(steps.indexOf(prepare)<steps.indexOf(entry));assert.equal(entry['working-directory'],'admitted-tools');assert.equal(entry.if,"success() && steps.retarget_prepare.outcome == 'success'");assert(!entry['continue-on-error']);assert(!steps.some(s=>/docker (?:build|run)|npm run build|playwright install/.test(s.run??'')));assert.equal(job['timeout-minutes'],45);assert.deepEqual(job.permissions,old.permissions);
});
test('existing retarget/inverse body, environment, native paths and failure/cancellation safety remain exact',()=>{
 const prepare=steps.find(s=>s.id==='retarget_prepare'),inverse=steps.find(s=>s.run?.includes('paid-dtc-retarget-operator.mjs restore')),entry=steps.find(s=>s.run?.includes('node scripts/rcap-hosted-saved-dtc-entry.mjs'));assert.deepEqual(prepare,old.steps.find(s=>s.id==='retarget_prepare'));assert.deepEqual(inverse,old.steps.find(s=>s.run?.includes('paid-dtc-retarget-operator.mjs restore')));assert.equal(entry.env.DTC_RETARGET_NATIVE_FILE,'${{ github.workspace }}/admitted-controller/hosted-acceptance-evidence/stripe-webhook-retarget.json');
 for(const outcome of ['success','failure','cancelled','skipped']){const state={window_guard:{outcome:'success'},retarget_prepare:{outcome}};assert.equal(Function('steps','always','return '+inverse.if)(state,()=>true),['success','failure','cancelled'].includes(outcome));assert.equal(Function('steps','success','return '+entry.if)(state,()=>outcome==='success'),outcome==='success');state.window_guard.outcome='failure';assert.equal(Function('steps','always','return '+inverse.if)(state,()=>true),false);}
});
test('always artifact allowlist uses only new safe directory plus exact existing native receipts',()=>{
 const upload=steps.find(s=>s.uses==='actions/upload-artifact@v4');assert.equal(upload.if,'always()');assert.deepEqual(upload.with.path.split('\n'),['admitted-controller/hosted-acceptance-evidence/stripe-webhook-retarget.json','admitted-controller/hosted-acceptance-evidence/stripe-webhook-retarget-attempt-start.json','admitted-controller/hosted-acceptance-evidence/stripe-webhook-retarget-inverse.json','admitted-tools/dtc-saved-existing-fulfillment-evidence/checkpoint-*.json','admitted-tools/dtc-saved-existing-fulfillment-evidence/result.json']);assert(!/runner.temp|\.pdf|private|stdout|stderr|dtc-saved-fulfillment-evidence/.test(upload.with.path));
});
