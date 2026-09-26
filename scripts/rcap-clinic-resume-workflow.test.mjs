import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {parse} from 'yaml';
const entry=parse(fs.readFileSync('.github/workflows/rcap-f1-ephemeral-staging.yml','utf8'));
const workflow=parse(fs.readFileSync('.github/workflows/rcap-hosted-acceptance-staging.yml','utf8'));
const steps=workflow.jobs.preflight.steps;
const byId=id=>steps.find(s=>s.id===id);
const authorization='Roger:clinic-resume:36211668984:explicit-download-and-device-reset';
const closure='Roger:clinic-resume:36211668984:close-exact-lost-cookie-session';
const source='af638b61cc4b74afad972fa79c4c1ca3f6709540';
const digest='sha256:063901962bedf73adedb8a7566da2434539082bd1577051e98e4303c566bb3a5';
const baseInputs={phase:'clinic_resume',mode:'hosted_clinic_resume',preview_hostname:'',preview_deployment_id:'',promotion_code:'',journey_state:'',contradiction_job_id:'',clinic_resume_authorization:authorization,clinic_session_closure_authorization:closure};
const evaluate=(expression,inputs,states,secrets={})=>new Function('inputs','steps','secrets','always','success',`return (${expression.replace(/^\$\{\{|\}\}$/g,'')});`)(inputs,states,secrets,()=>true,()=>true);
const forbidden=['auth_identities','clinic_seed','clinic_journey','clinic_audit','clinic_database_readback','registry_login','matrix_build','checkout_gate','payment_journey','golden_journey','stripe_fixtures','stripe_retarget','clinic_migrate','legal_aid_migrate','legal_aid_seed','legal_aid_browser','galleries','worker_contract','migrate_readback'];
function contract(inputs){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'clinic-resume-workflow-'));
 try{
  const output=path.join(dir,'outputs');const shell=byId('contract').run.replace(/\$\{\{ inputs\.(\w+) \}\}/g,(_,key)=>inputs[key]??'');
  const r=spawnSync('bash',['-c',shell],{encoding:'utf8',cwd:dir,env:{PATH:process.env.PATH,GITHUB_OUTPUT:output}});
  return {status:r.status,outputs:r.status===0?Object.fromEntries(fs.readFileSync(output,'utf8').trim().split('\n').map(s=>s.split('='))):null};
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
function scheduled(inputs,reused){
 const normalized=contract(inputs);assert.equal(normalized.status,0);
 const states=Object.fromEntries(steps.filter(s=>s.id).map(s=>[s.id,{outcome:'skipped',outputs:{}}]));
 states.contract={outcome:'success',outputs:normalized.outputs};
 for(const step of steps.filter(s=>s.id)){
  if(!step.if||evaluate(step.if,inputs,states))states[step.id].outcome='success';
  if(step.id==='resolve_preview')states.resolve_preview.outputs={reused:String(reused),hostname:reused?'exact.vercel.app':'',deployment_id:reused?'dpl_Exact':''};
 }
 return states;
}
function gate(inputs,states,patch={}){
 const env=Object.fromEntries(Object.entries(byId('antiskip').env).map(([k,v])=>[k,String(evaluate(v,inputs,states))]));
 return spawnSync('bash',['-c',byId('antiskip').run],{encoding:'utf8',env:{PATH:process.env.PATH,...env,...patch}});
}
test('manual mode, authorization inputs and exact release pins reach the reusable phase',()=>{
 assert(entry.on.workflow_dispatch.inputs.mode.options.includes('hosted_clinic_resume'));
 for(const key of ['clinic_resume_authorization','clinic_session_closure_authorization']){
  assert.equal(entry.on.workflow_dispatch.inputs[key].type,'string');assert.equal(workflow.on.workflow_call.inputs[key].type,'string');
  const caller=Object.values(entry.jobs).find(j=>j.uses==='./.github/workflows/rcap-hosted-acceptance-staging.yml');
  assert.equal(caller.with[key],`\${{ inputs.${key} }}`);assert.equal(evaluate(caller.with.phase,baseInputs,{}),'clinic_resume');
 }
 for(const doc of [entry,workflow]){assert.equal(doc.env.AUTHORIZED_WORKER_SOURCE_SHA,source);assert.equal(doc.env.AUTHORIZED_WORKER_DIGEST,digest);}
});
test('missing/wrong owner or closure authorization and partial retry identity refuse in the first step',()=>{
 const first=steps[0];const env={PATH:process.env.PATH,PHASE_INPUT:'clinic_resume',CLINIC_RESUME_AUTHORIZATION:authorization,CLINIC_SESSION_CLOSURE_AUTHORIZATION:closure,PREVIEW_DEPLOYMENT_ID_INPUT:'',PREVIEW_HOSTNAME_INPUT:'',APPLICATION_SHA_INPUT:source,WORKER_SOURCE_SHA_INPUT:source,WORKER_DIGEST_INPUT:digest,AUTHORIZED_WORKER_SOURCE_SHA:source,AUTHORIZED_WORKER_DIGEST:digest,SUPABASE_PROJECT_REF_INPUT:'hyflxnlhpmiqxvvcoiia',AUTHORIZED_ACCEPTANCE_PROJECT_REF:'hyflxnlhpmiqxvvcoiia',TOOLS_SHA_INPUT:source,WORKFLOW_SHA_INPUT:source};
 const run=patch=>spawnSync('bash',['-c',first.run],{encoding:'utf8',env:{...env,...patch}}).status;
 assert.equal(run({}),0);
 for(const key of ['CLINIC_RESUME_AUTHORIZATION','CLINIC_SESSION_CLOSURE_AUTHORIZATION'])for(const value of ['', 'wrong'])assert.notEqual(run({[key]:value}),0);
 for(const patch of [{PREVIEW_HOSTNAME_INPUT:'exact.vercel.app'},{PREVIEW_DEPLOYMENT_ID_INPUT:'dpl_Exact'}])assert.notEqual(run(patch),0);
 const runner=fs.readFileSync('scripts/rcap-hosted-clinic-resume.mjs','utf8');assert(runner.indexOf('const closureSql=')<runner.indexOf("const token=env('SUPABASE_ACCESS_TOKEN')"));
});
for(const reused of [false,true])test(`bounded resume ${reused?'reuses exact Preview without fallback':'creates at most one successor Preview'}; required-step and forbidden-step mutations fail`,()=>{
 const inputs={...baseInputs,...(reused?{preview_hostname:'exact.vercel.app',preview_deployment_id:'dpl_Exact'}:{})};
 const states=scheduled(inputs,reused);
 assert.equal(states.contract.outputs.resume,'true');assert.equal(states.contract.outputs.require_staging_scoped,'true');
 for(const key of ['matrix','gate','retarget','browser','clinic','legal_aid','diagnose'])assert.equal(states.contract.outputs[key],'false');
 assert.equal(states.contract.outputs.deploy,reused?'false':'true');
 for(const id of forbidden)assert.equal(states[id].outcome,'skipped',id);
 assert.equal(states.deploy_preview.outcome,reused?'skipped':'success');
 assert.equal(gate(inputs,states).status,0);
 for(const key of ['O_RELEASE_BINDING','O_RESUME_INVENTORY','O_RESOLVE','O_DEPS','O_RESUME_BROWSER','O_RESUME','O_RESUME_EVIDENCE',...(!reused?['O_DEPLOY']:[])])for(const value of ['skipped','failure','cancelled',''])assert.notEqual(gate(inputs,states,{[key]:value}).status,0,`${key} ${value}`);
 for(const key of ['O_AUTH','O_CLINIC_SEED','O_CLINIC_JOURNEY','O_CLINIC_AUDIT','O_CLINIC_DATABASE','O_REGISTRY','O_BUILD','O_GATE','O_PAYMENT','O_GOLDEN','O_STRIPE_FIXTURES','O_STRIPE_RETARGET','O_CLINIC_MIGRATE','O_LEGAL_AID_MIGRATE','O_LEGAL_AID_SEED','O_LEGAL_AID_BROWSER'])assert.notEqual(gate(inputs,states,{[key]:'success'}).status,0,key);
 if(reused)assert.notEqual(gate(inputs,states,{O_DEPLOY:'success'}).status,0);
 for(const id of ['resolve_preview','deploy_preview']){const bad=structuredClone(states);bad.resume_inventory.outcome='failure';assert.equal(evaluate(byId(id).if,inputs,bad),false);}
 for(const id of ['resolve_preview','deploy_preview']){
  const env=byId(id).env;
  assert.equal(evaluate(env.HOSTED_ISOLATED_CLINIC_PREVIEW,inputs,states),'true');
  assert.equal(evaluate(env.HOSTED_CLINIC_DEMO_MODE,inputs,states),'mississippi_preview');
  for(const key of ['HOSTED_STRIPE_TEST_SECRET','HOSTED_STRIPE_TEST_WEBHOOK_SECRET','HOSTED_STRIPE_CATALOG_PRODUCT_ID'])if(env[key])assert.equal(evaluate(env[key],inputs,states,{HOSTED_STRIPE_TEST_SECRET:'must-not-pass',HOSTED_STRIPE_TEST_WEBHOOK_SECRET:'must-not-pass'}),'');
 }
});
test('read-only inventory precedes Preview; execution and evidence are mandatory before final gate',()=>{
 const index=id=>steps.indexOf(byId(id));
 assert(index('release_binding')<index('resume_inventory'));assert(index('gate_deps')<index('resume_inventory'));assert(index('resume_inventory')<index('resolve_preview'));assert(index('resume_inventory')<index('deploy_preview'));
 assert(!byId('resume_inventory').run.includes('--execute'));assert(byId('resume_inventory').run.includes('rcap-hosted-clinic-resume.mjs'));
 assert(byId('clinic_resume').run.includes('--execute --owner-authorization "$CLINIC_RESUME_AUTHORIZATION" --session-closure-authorization "$CLINIC_SESSION_CLOSURE_AUTHORIZATION"'));
 assert(index('checkout_browser')<index('clinic_resume'));assert(index('clinic_resume')<index('resume_evidence'));assert(index('resume_evidence')<index('antiskip'));assert.equal(byId('resume_evidence').with['if-no-files-found'],'error');
 for(const key of ['HOSTED_CLINIC_DEMO_ACCESS_CODE','HOSTED_STRIPE_TEST_SECRET'])assert.equal(byId('clinic_resume').env[key],undefined);
 for(const key of ['promotion_code','journey_state','contradiction_job_id'])assert.notEqual(contract({...baseInputs,[key]:'unexpected'}).status,0);
});
