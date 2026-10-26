import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync, execFileSync} from 'node:child_process';
import {parse} from 'yaml';

const base='f7beae5daa530228024ffd2b231782b1c6ede66d';
const callerPath='.github/workflows/rcap-f1-ephemeral-staging.yml';
const hostedPath='.github/workflows/rcap-hosted-acceptance-staging.yml';
const caller=parse(fs.readFileSync(callerPath,'utf8'));
const hosted=parse(fs.readFileSync(hostedPath,'utf8'));
const original=rel=>parse(execFileSync('git',['show',`${base}:${rel}`],{encoding:'utf8'}));
const oldCaller=original(callerPath), oldHosted=original(hostedPath);
const step=(w,id)=>w.jobs.preflight.steps.find(s=>s.id===id);
const evaluate=(value,inputs,steps,secrets={})=>typeof value==='string'&&value.startsWith('${{')
  ? new Function('inputs','steps','secrets','always','success','startsWith','env','toJSON',`return (${value.replace(/^\$\{\{|\}\}$/g,'')});`)(inputs,steps,secrets,()=>true,()=>true,(a,b)=>a.startsWith(b),hosted.env,JSON.stringify) : value;
const inputsFor=phase=>({phase,mode:`hosted_${phase}`,preview_hostname:'',preview_deployment_id:'',promotion_code:'',
  journey_state:'',contradiction_job_id:'',expected_total_cents:'',sponsor_case:'',sponsor_items:'[]',sponsor_fulfillment:false,
  clinic_resume_authorization:'',clinic_session_closure_authorization:'',application_sha:'a'.repeat(40),
  worker_source_sha:'b'.repeat(40),worker_digest:`sha256:${'c'.repeat(64)}`,tools_sha:'d'.repeat(40),supabase_project_ref:'hyflxnlhpmiqxvvcoiia'});
function runContract(w,inputs){
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'managed-phase-'));
  try {
    const output=path.join(dir,'outputs');
    const shell=step(w,'contract').run.replace(/\$\{\{ inputs\.(\w+) \}\}/g,(_,key)=>String(inputs[key]??''));
    const contractEnv=Object.fromEntries(Object.entries(step(w,'contract').env??{}).map(([key,value])=>[key,evaluate(value,inputs,{})]));
    const result=spawnSync('bash',['-c',shell],{encoding:'utf8',env:{PATH:process.env.PATH,GITHUB_OUTPUT:output,...contractEnv}});
    return {...result,outputs:fs.existsSync(output)?Object.fromEntries(fs.readFileSync(output,'utf8').trim().split('\n').map(l=>l.split('='))):{}};
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
}
function stateFor(w,inputs){
  const contract=runContract(w,inputs);
  assert.equal(contract.status,0,contract.stdout+contract.stderr);
  const states=Object.fromEntries(w.jobs.preflight.steps.filter(s=>s.id).map(s=>[s.id,{outcome:'skipped',outputs:{}}]));
  states.contract={outcome:'success',outputs:contract.outputs};
  return states;
}
function scheduled(w,inputs,states){
  return w.jobs.preflight.steps.filter(s=>!s.if||evaluate('${{ '+s.if+' }}',inputs,states));
}
const allowedNames=new Set([
  'Refuse any input that is not the authorized pinned value','Check out repository history','Set up Node',
  'Install release verification dependencies from lockfile','Verify ancestry and image-input equivalence of every pinned SHA',
  'Require exact current release or HELD acceptance Preview tuple','Require CURRENT authority except exact HELD acceptance Preview creation',
  'Bind only the admitted managed Preview configuration','Prove credentials and Preview-only deployment boundary',
  'Normalize the execution contract for this phase','Verify frozen application dependencies for the Checkout gate',
  'Verify the managed Preview deploy-only phase contract','Establish preserved Acceptance keys for this deploy',
  'Deploy the frozen application SHA to Vercel Preview','Every required matrix step actually ran',
  'Reprint the sandbox fixture outcome last','Upload the hosted acceptance evidence'
]);
function assertDeployOnly(w){
  const inputs=inputsFor('managed_start_preview'),states=stateFor(w,inputs);
  for(const s of scheduled(w,inputs,states))assert(allowedNames.has(s.name),`unauthorized scheduled step: ${s.name}`);
  for(const id of ['image_inputs','release_binding','authority_gate','managed_start_binding','preview_boundary','gate_deps','verify_managed_start','preserved_acceptance_keys','deploy_preview','antiskip']){
    assert(scheduled(w,inputs,states).includes(step(w,id)),`required step not scheduled: ${id}`);
  }
  return {inputs,states};
}

test('one new caller maps exactly; all existing caller modes are unchanged',()=>{
  const modes=caller.on.workflow_dispatch.inputs.mode.options;
  assert.deepEqual(modes.filter(m=>!oldCaller.on.workflow_dispatch.inputs.mode.options.includes(m)),['hosted_managed_start_preview']);
  assert.equal(evaluate(caller.jobs.hosted.with.phase,inputsFor('managed_start_preview'),{}),'managed_start_preview');
  for(const mode of oldCaller.on.workflow_dispatch.inputs.mode.options)
    assert.equal(evaluate(caller.jobs.hosted.with.phase,{mode},{}),evaluate(oldCaller.jobs.hosted.with.phase,{mode},{}),mode);
});
test('parsed contract enables only deployment with exact scoped purpose',()=>{
  const {inputs,states}=assertDeployOnly(hosted);
  assert.deepEqual(states.contract.outputs,{phase:inputs.phase,deploy:'true',matrix:'false',gate:'false',retarget:'false',browser:'false',
    clinic:'false',resume:'false',legal_aid:'false',sponsor_cap:'false',dtc:'false',diagnose:'false',require_staging_scoped:'true'});
  assert.match(step(hosted,'verify_managed_start').run,/node --test scripts\/rcap-managed-start-preview-phase\.test\.mjs/);
});
test('actual contract refuses unknown phase and every business or reuse input',()=>{
  assert.notEqual(runContract(hosted,inputsFor('not_a_phase')).status,0);
  for(const key of ['preview_hostname','preview_deployment_id','promotion_code','journey_state','expected_total_cents','contradiction_job_id',
    'sponsor_case','clinic_resume_authorization','clinic_session_closure_authorization'])
    assert.notEqual(runContract(hosted,{...inputsFor('managed_start_preview'),[key]:'unexpected'}).status,0,key);
  assert.notEqual(runContract(hosted,{...inputsFor('managed_start_preview'),sponsor_items:'["unexpected"]'}).status,0);
  assert.notEqual(runContract(hosted,{...inputsFor('managed_start_preview'),sponsor_fulfillment:true}).status,0);
});
test('business input remains data and cannot inject a shell write',()=>{
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'managed-untrusted-'));
  try {
    const marker=path.join(dir,'must-not-exist');
    const result=runContract(hosted,{...inputsFor('managed_start_preview'),sponsor_case:`'; touch '${marker}'; #`});
    assert.notEqual(result.status,0);
    assert.equal(fs.existsSync(marker),false);
    assert.equal(step(hosted,'contract').env.MANAGED_START_INPUTS_JSON,'${{ toJSON(inputs) }}');
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
test('all existing parsed phase outputs and scheduled steps are preserved',()=>{
  const phases=['full','sponsor_cap','clinic_resume','clinic_deploy','clinic_preview','legal_aid_browser','deploy','replace_preview','accept',
    'payment','stripe_retarget','checkout_gate','browser','clinic_migrate','migrate','preflight','vercel_identity','vercel_audit','worker_contract','legal_aid_migrate'];
  for(const phase of phases){
    const inputs=inputsFor(phase);
    if(phase==='clinic_resume'){inputs.preview_hostname='legalease-rcap-clinic-af638b61cc4b-roger947s-projects.vercel.app';inputs.preview_deployment_id='dpl_Gf6uwETvQNbKXAMCcxLE6ECxLhNR';}
    if(['clinic_preview','legal_aid_browser','sponsor_cap'].includes(phase)){inputs.preview_hostname='exact.vercel.app';inputs.preview_deployment_id='dpl_Exact';}
    const old=stateFor(oldHosted,inputs),now=stateFor(hosted,inputs);
    assert.deepEqual(now.contract.outputs,old.contract.outputs,phase);
    assert.deepEqual(scheduled(hosted,inputs,now).map(s=>s.name),scheduled(oldHosted,inputs,old).map(s=>s.name),phase);
    const previous=step(oldHosted,'deploy_preview').env,current=step(hosted,'deploy_preview').env;
    for(const key of Object.keys(previous))assert.equal(evaluate(current[key],inputs,now,{HOSTED_STRIPE_TEST_SECRET:'synthetic-test',HOSTED_STRIPE_TEST_WEBHOOK_SECRET:'synthetic-hook'}),
      evaluate(previous[key],inputs,old,{HOSTED_STRIPE_TEST_SECRET:'synthetic-test',HOSTED_STRIPE_TEST_WEBHOOK_SECRET:'synthetic-hook'}),`${phase}/${key}`);
  }
});
test('new deployment has exact b6 scope, no Clinic/Stripe/email, and existing identities only',()=>{
  const {inputs,states}=assertDeployOnly(hosted),env=step(hosted,'deploy_preview').env;
  const read=key=>evaluate(env[key],inputs,states,{HOSTED_STRIPE_TEST_SECRET:'synthetic-test',HOSTED_STRIPE_TEST_WEBHOOK_SECRET:'synthetic-hook',HOSTED_LEGAL_AID_RESEND_API_KEY:'synthetic-mail'});
  assert.equal(read('HOSTED_ROUTE_STATE'),'staging_scoped');
  assert.equal(read('HOSTED_STAGING_SCOPE'),'b6dc86a3-12bb-490d-b130-48d95d426a1e');
  assert.equal(read('HOSTED_EXISTING_PARTICIPANT_ONLY'),'true');
  assert.equal(read('HOSTED_ISOLATED_CLINIC_PREVIEW'),'false');
  for(const key of ['HOSTED_CLINIC_DEMO_MODE','HOSTED_STRIPE_TEST_SECRET','HOSTED_STRIPE_TEST_WEBHOOK_SECRET','HOSTED_STRIPE_CATALOG_PRODUCT_ID',
    'HOSTED_LEGAL_AID_RESEND_API_KEY','HOSTED_LEGAL_AID_EMAIL_FROM','HOSTED_LEGAL_AID_TEST_MAILBOX'])assert.equal(read(key),'',key);
});
test('actual binding producer writes exact six fields only after masking',()=>{
  const producer=step(hosted,'managed_start_binding');
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),'managed-binding-'));
  try {
    const target=path.join(dir,'env');
    const result=spawnSync('bash',['-c',producer.run],{encoding:'utf8',env:{PATH:process.env.PATH,APPLICATION_SHA_INPUT:'a'.repeat(40),
      ACCEPTANCE_SUPABASE_PROJECT_REF:'hyflxnlhpmiqxvvcoiia',GITHUB_ENV:target}});
    assert.equal(result.status,0,result.stderr);
    const value=fs.readFileSync(target,'utf8').split('\n')[1],binding=JSON.parse(value);
    assert.deepEqual(binding,{schema:'rcap-partner-acceptance-launch/v1',applicationSha:'a'.repeat(40),projectId:'prj_cdgwGzFqIHgEUlzEburSLaZETdQV',
      supabaseProjectRef:'hyflxnlhpmiqxvvcoiia',partnerSlug:'legalease-ordinary-qa-20261024',adminAuthUserId:'6574d21e-5e0a-4567-b14e-01447c162f37'});
    assert.equal(result.stdout.trim(),`::add-mask::${value}`);
    assert(producer.run.indexOf("console.log('::add-mask::'")<producer.run.indexOf('appendFileSync(process.env.GITHUB_ENV'));
    const wrong=spawnSync('bash',['-c',producer.run],{encoding:'utf8',env:{PATH:process.env.PATH,APPLICATION_SHA_INPUT:'wrong',ACCEPTANCE_SUPABASE_PROJECT_REF:'hyflxnlhpmiqxvvcoiia',GITHUB_ENV:target}});
    assert.notEqual(wrong.status,0);
  } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
test('future admission is mandatory before provider configuration and retains canonical worker checks',()=>{
  const steps=hosted.jobs.preflight.steps;
  assert.match(step(hosted,'image_inputs').run,/requireManagedStartPreviewAdmission\(process.cwd\(\)/);
  assert.match(step(hosted,'image_inputs').run,/verify-rcap-worker-input-equivalence\.mjs/);
  assert.match(step(hosted,'release_binding').run,/PHASE_INPUT === 'managed_start_preview' \? requireManagedStartPreviewAdmission/);
  assert.match(step(hosted,'authority_gate').run,/managed_start_preview.*then[\s\S]*require-preview-preparation\.mjs/);
  assert(steps.indexOf(step(hosted,'authority_gate'))<steps.indexOf(step(hosted,'managed_start_binding')));
  assert(steps.indexOf(step(hosted,'authority_gate'))<steps.indexOf(step(hosted,'preview_boundary')));
});
test('schedule verifier detects unknown write and accidentally enabled existing business steps',()=>{
  const unknown=structuredClone(hosted);unknown.jobs.preflight.steps.push({id:'new_write',name:'Unexpected provider write',run:'synthetic-write'});
  assert.throws(()=>assertDeployOnly(unknown),/unauthorized scheduled step/);
  for(const id of ['auth_identities','clinic_seed','payment_journey','registry_login','migrate_readback']){
    const changed=structuredClone(hosted);step(changed,id).if="inputs.phase == 'managed_start_preview'";
    assert.throws(()=>assertDeployOnly(changed),/unauthorized scheduled step/,id);
  }
});
test('actual anti-skip shell refuses missing admission, skipped deploy, and any unapproved outcome',()=>{
  const {inputs,states}=assertDeployOnly(hosted);
  for(const s of scheduled(hosted,inputs,states))if(s.id)states[s.id].outcome='success';
  const anti=step(hosted,'antiskip');
  const env=Object.fromEntries(Object.entries(anti.env).map(([key,value])=>[key,String(evaluate(value,inputs,states)??'')]));
  const run=changes=>spawnSync('bash',['-c',anti.run],{encoding:'utf8',env:{PATH:process.env.PATH,...env,...changes}});
  assert.equal(run({}).status,0,run({}).stderr);
  for(const key of ['O_IMAGE_INPUTS','O_RELEASE_BINDING','O_AUTHORITY_GATE','O_MANAGED_BINDING','O_VERIFY_MANAGED','O_PRESERVED_KEYS','O_PREVIEW_BOUNDARY','O_DEPS','O_DEPLOY'])
    assert.notEqual(run({[key]:'skipped'}).status,0,key);
  for(const key of Object.keys(env).filter(k=>k.startsWith('O_')&&env[k]==='skipped'))assert.notEqual(run({[key]:'success'}).status,0,key);
  assert.notEqual(run({O_UNKNOWN_WRITE:'success'}).status,0);
  assert.notEqual(run({O_REUSED:'true'}).status,0);
  assert.notEqual(run({O_CONTRACT:'skipped'}).status,0);
});

function admissionFixture({bindingVerified=true,drift=''}={}) {
  const applicationSha='1'.repeat(40),workerSourceSha='2'.repeat(40),toolsSha='3'.repeat(40),workflowSourceSha='4'.repeat(40);
  const candidate={schemaVersion:'rcap-release-candidate-binding/v1',status:'FORWARD_BOUND_HOSTED_PENDING',
    applicationSha,workerSourceSha,workerDigest:'sha256:'+'5'.repeat(64),workerInputFingerprint:'sha256:'+'6'.repeat(64),toolsSha,
    publication:{},readOnlyImageAcceptance:{},runtimeAccepted:true,workerRebuildRequired:false,previewExecution:'held',resume:null,
    productionAuthorized:false,productionAuthorization:null,deploymentAuthorized:false,clinicDispatchReady:false,hostedAdmission:null,
    releaseBaseSha:'7'.repeat(40),supersededRecord:{},supersededRecordSha256:'8'.repeat(64)};
  const inputs={phase:'managed_start_preview',applicationSha,workerSourceSha,workerDigest:candidate.workerDigest,toolsSha,workflowSourceSha};
  const code=fs.readFileSync('scripts/grade-a-launch-control/require-preview-preparation.mjs','utf8')
    .split('if(process.argv[1]?.endsWith')[0].replace(/^import .*;\n/gm,'').replaceAll('export ','');
  const context={assert,fs:{readFileSync:()=>JSON.stringify(candidate)},CANDIDATE:'data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json',
    verifyReleaseCandidateBinding:()=>({current:false,status:'FORWARD_BOUND_HOSTED_PENDING',bindingVerified}),
    requireCurrentReleaseCandidate:()=>{throw Error('CURRENT must not be invented');},
    execFileSync:(command,args)=>{
      assert.equal(command,'git');
      if(args[0]==='rev-parse')return workflowSourceSha;
      if(args[0]==='merge-base')return '';
      assert.equal(args[0],'diff');assert.deepEqual(Array.from(args.slice(-2)),['scripts','.github']);return drift;
    },process:{env:{PHASE_INPUT:inputs.phase,APPLICATION_SHA_INPUT:applicationSha,WORKER_SOURCE_SHA_INPUT:workerSourceSha,
      WORKER_DIGEST_INPUT:candidate.workerDigest,TOOLS_SHA_INPUT:toolsSha,GITHUB_SHA:workflowSourceSha}}};
  const functions=vm.runInNewContext(code+'\n({requireManagedStartPreviewAdmission,requireHeldPreviewAdmission,loadPreviewTransportIdentity});',context);
  return {candidate,inputs,...functions};
}
test('actual managed HELD admission accepts a verified forward tuple without inheriting permissions',()=>{
  const f=admissionFixture(),result=f.requireManagedStartPreviewAdmission('/synthetic',f.inputs);
  assert.notEqual(result.applicationSha,result.workerSourceSha);
  assert.equal(result.current,false);assert.equal(result.previewOnly,true);assert.equal(result.productionAuthorized,false);assert.equal(result.deploymentAuthorized,false);
  assert(Object.isFrozen(result));assert.equal('publication' in result,false);assert.equal('supersededRecord' in result,false);
  assert.equal(f.loadPreviewTransportIdentity('/synthetic').previewOnly,true);
  assert.equal(f.requireHeldPreviewAdmission('/synthetic',{...f.inputs,phase:'replace_preview'}).previewOnly,true);
});
test('actual managed HELD admission refuses a different phase, tuple, state or permission',()=>{
  for(const patch of [{phase:'replace_preview'},{applicationSha:'9'.repeat(40)},{workerSourceSha:'9'.repeat(40)},
    {workerDigest:'sha256:'+'9'.repeat(64)},{toolsSha:'9'.repeat(40)},{workflowSourceSha:'9'.repeat(40)}]) {
    const f=admissionFixture();assert.throws(()=>f.requireManagedStartPreviewAdmission('/synthetic',{...f.inputs,...patch}));
  }
  for(const patch of [{status:'CURRENT'},{runtimeAccepted:false},{workerRebuildRequired:true},{productionAuthorized:true},
    {deploymentAuthorized:true},{hostedAdmission:{}},{unknownPermission:true}]) {
    const f=admissionFixture();Object.assign(f.candidate,patch);assert.throws(()=>f.requireManagedStartPreviewAdmission('/synthetic',f.inputs));
  }
});
test('actual managed HELD admission requires native binding verification and exact frozen controls',()=>{
  for(const options of [{bindingVerified:false},{drift:'scripts/unreviewed-provider-write.mjs'}]) {
    const f=admissionFixture(options);assert.throws(()=>f.requireManagedStartPreviewAdmission('/synthetic',f.inputs));
  }
});
