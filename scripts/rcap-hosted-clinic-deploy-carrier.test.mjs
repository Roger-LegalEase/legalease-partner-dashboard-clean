import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {createHash} from 'node:crypto';
import {test} from 'node:test';
const YAML=createRequire(import.meta.url)('yaml');
const workflow=YAML.parse(fs.readFileSync(new URL('../.github/workflows/rcap-f1-ephemeral-staging.yml',import.meta.url),'utf8'));
const mode='hosted_clinic_deploy',job=workflow.jobs[mode],H='9fe0ea17727339755c10e73c06adb34215ba2a0e';
const carrierBranch='codex/d-clinic-setup-only-20261024';
const expected={mode,tools_sha:H,application_sha:'4feb8e94b3dee4085fe05ea75d78853fe21e5097',worker_source_sha:'16908485a94f475448657cea90583a4d352da9a3',worker_digest:'sha256:4f8c71c3630e6c110427d111518be149f3c74d46c856633fc5536a8065bc17af',supabase_project_ref:'hyflxnlhpmiqxvvcoiia'};
const guard=job.steps.find(s=>s.name==='Require the exact isolated Preview dispatch before private bindings');
const authority=job.steps.find(s=>s.name==='Require the actual admitted controller and unchanged CURRENT authority');
const inline=step=>step.run.split("<<'JS'\n")[1].split('\nJS')[0];
function selected(value){return Object.entries(workflow.jobs).filter(([,j])=>!j.if||vm.runInNewContext(j.if,{inputs:{mode:value},startsWith:(s,p)=>s.startsWith(p)})).map(([name])=>name);}
test('existing deploy mode selects only its dedicated carrier; every other hosted mode retains generic routing',()=>{
 assert.deepEqual(selected(mode),[mode]);
 for(const value of workflow.on.workflow_dispatch.inputs.mode.options.filter(v=>v.startsWith('hosted_')&&v!==mode))assert.deepEqual(selected(value),['hosted']);
 for(const value of ['clinic_owned_matter_packet','clinic_owned_matter_readonly','clinic_setup_only','ephemeral'])assert.equal(selected(value).includes(mode),false);
 assert.equal(workflow.on.workflow_dispatch.inputs.mode.options.filter(v=>v===mode).length,1);
});
test('actual dispatch guard accepts the authorized tuple and rejects each wrong input, repeated attempt and enabled Git deployment',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'clinic-preview-carrier-'));
 try{
  const config=enabled=>fs.writeFileSync(path.join(dir,'vercel.json'),JSON.stringify({git:{deploymentEnabled:{[carrierBranch]:enabled}}}));config(false);
  const run=(patch={},env={})=>spawnSync(process.execPath,['--input-type=module','-'],{cwd:dir,input:inline(guard),encoding:'utf8',env:{...process.env,GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF_NAME:carrierBranch,GITHUB_RUN_ATTEMPT:'1',GITHUB_SHA:'a'.repeat(40),GITHUB_WORKFLOW_SHA:'a'.repeat(40),DISPATCH_INPUTS:JSON.stringify({...expected,...patch}),...env}}).status;
  assert.equal(run(),0);
  for(const key of Object.keys(expected))assert.notEqual(run({[key]:'wrong'}),0,key);
  for(const key of ['preview_hostname','preview_deployment_id','preview_creation_run_id','promotion_code','journey_state','contradiction_job_id','resume_matter_id','clinic_attempt_id','sponsor_case','expected_total_cents','clinic_resume_authorization','clinic_session_closure_authorization'])assert.notEqual(run({[key]:'unexpected'}),0,key);
  assert.notEqual(run({sponsor_items:'["unexpected"]'}),0);assert.notEqual(run({sponsor_fulfillment:true}),0);
  for(const env of [{GITHUB_RUN_ATTEMPT:'2'},{GITHUB_EVENT_NAME:'push'},{GITHUB_REF_NAME:'captain-release'},{GITHUB_SHA:'wrong'},{GITHUB_WORKFLOW_SHA:'b'.repeat(40)}])assert.notEqual(run({},env),0);
  config(true);assert.notEqual(run(),0);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('actual CURRENT tuple guard retains exact admission and does not rewrite the carrier SHA',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'clinic-preview-current-'));
 const release={applicationSha:expected.application_sha,workerSourceSha:expected.worker_source_sha,workerDigest:expected.worker_digest,productionAuthorized:false,verifierCorrection:{predecessorSha:'ad9c26cc9a4b34a04abc3d204a2c687e375cce57',sourceSha:'7b891cefedb4035643a427dff3c1ac4238c7d5f0'},hostedAdmission:{runId:40236198602,workflowSourceSha:'5304c8ff825b9d74996762494ca3ea03815ed3ad',closureControlSha:'a2f1a221c9c17595c494ee7bae75857cd0480a7c'}};
 try{
  fs.mkdirSync(path.join(dir,'scripts/grade-a-launch-control'),{recursive:true});
  fs.writeFileSync(path.join(dir,'scripts/grade-a-launch-control/verify-release-candidate-binding.mjs'),"import fs from 'node:fs';export function requireCurrentReleaseCandidate(){return JSON.parse(fs.readFileSync('release.json'));}\n");
  const run=value=>{fs.writeFileSync(path.join(dir,'release.json'),JSON.stringify(value));return spawnSync(process.execPath,['--input-type=module','-'],{cwd:dir,input:inline(authority),encoding:'utf8',env:{...process.env,GITHUB_SHA:'a'.repeat(40),GITHUB_RUN_ID:'123',GITHUB_RUN_ATTEMPT:'1'}}).status;};
  assert.equal(run(release),0);assert.equal(JSON.parse(fs.readFileSync(path.join(dir,'hosted-acceptance-evidence/carrier.json'))).carrierSha,'a'.repeat(40));
  for(const key of ['applicationSha','workerSourceSha','workerDigest','productionAuthorized'])assert.notEqual(run({...release,[key]:'wrong'}),0,key);
  for(const key of Object.keys(release.verifierCorrection))assert.notEqual(run({...release,verifierCorrection:{...release.verifierCorrection,[key]:'wrong'}}),0,key);
  for(const key of Object.keys(release.hostedAdmission))assert.notEqual(run({...release,hostedAdmission:{...release.hostedAdmission,[key]:'wrong'}}),0,key);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
test('separate exact checkout and original CURRENT plus canonical worker gates precede all private bindings',()=>{
 const checkouts=job.steps.filter(s=>s.uses==='actions/checkout@v4');assert.equal(checkouts.length,2);
 assert.deepEqual(checkouts.map(s=>s.with.path),['carrier','admitted-controller']);
 assert.equal(checkouts[0].with.ref,'${{ github.sha }}');assert.equal(checkouts[1].with.ref,H);assert.equal(checkouts[1].with['fetch-depth'],0);
 for(const step of checkouts)assert.equal(step.with['persist-credentials'],false);
 assert.equal(job.defaults.run['working-directory'],'admitted-controller');assert.equal(guard['working-directory'],'carrier');
 const firstPrivate=job.steps.findIndex(s=>JSON.stringify(s).includes('${{ secrets.'));assert.ok(job.steps.indexOf(guard)<job.steps.indexOf(authority));assert.ok(job.steps.indexOf(authority)<firstPrivate);
 assert.match(authority.run,/test "\$\(git rev-parse HEAD\)" = 9fe0ea17727339755c10e73c06adb34215ba2a0e/);
 assert.ok(authority.run.includes('node scripts/grade-a-launch-control/verify-release-candidate-binding.mjs'));
 assert.ok(authority.run.includes('node scripts/verify-rcap-worker-input-equivalence.mjs --base '+expected.worker_source_sha+' --head '+H+' --label accepted-worker-to-admitted-controller'));
 assert.match(authority.run,/git merge-base --is-ancestor/);
 assert.doesNotMatch(JSON.stringify(job),/GITHUB_SHA\s*[:=]|export GITHUB_SHA|--test-name-pattern|continue-on-error/);
});
test('native preflight and unchanged key continuity precede the single unchanged deploy command',()=>{
 const preflight=job.steps.find(s=>s.run==='node scripts/rcap-hosted-acceptance-preflight.mjs');
 const keys=job.steps.find(s=>s.id==='preserved_acceptance_keys');
 const deploy=job.steps.find(s=>s.run==='node scripts/rcap-hosted-acceptance-deploy.mjs');
 assert.ok(job.steps.indexOf(authority)<job.steps.indexOf(preflight));assert.ok(job.steps.indexOf(preflight)<job.steps.indexOf(keys));assert.ok(job.steps.indexOf(keys)<job.steps.indexOf(deploy));
 assert.equal(preflight.env.PREFLIGHT_SCOPE,'full');assert.equal(preflight.env.HOSTED_TOOLS_SHA,H);assert.equal(preflight.env.ACCEPTANCE_SUPABASE_PROJECT_REF,expected.supabase_project_ref);
 assert.equal(createHash('sha256').update(keys.run).digest('hex'),'3bd555f7167ccf01b8c926f84133a523257ece04b7e022f395f6b61251c31d7c');
 assert.equal(job.steps.filter(s=>s.run==='node scripts/rcap-hosted-acceptance-deploy.mjs').length,1);
 assert.equal(deploy.env.PHASE_INPUT,'clinic_deploy');assert.equal(deploy.env.TOOLS_SHA_INPUT,H);assert.equal(deploy.env.HOSTED_ISOLATED_CLINIC_PREVIEW,'true');assert.equal(deploy.env.HOSTED_ROUTE_STATE,'staging_scoped');assert.equal(deploy.env.HOSTED_EXISTING_PARTICIPANT_ONLY,'true');
 assert.equal(deploy.env.HOSTED_STAGING_SCOPE,'e7c1d76e-dcf2-4d41-b585-ba164806f391,255998e1-eb69-4239-b151-0f8b8935a539');
 for(const key of ['HOSTED_STRIPE_TEST_SECRET','HOSTED_STRIPE_TEST_WEBHOOK_SECRET','HOSTED_STRIPE_CATALOG_PRODUCT_ID','HOSTED_LEGAL_AID_RESEND_API_KEY','HOSTED_LEGAL_AID_TEST_MAILBOX','HOSTED_LEGAL_AID_EMAIL_FROM','HOSTED_PREVIOUS_WEBHOOK_HOST'])assert.equal(deploy.env[key],'');
 assert.doesNotMatch(job.steps.map(s=>s.run??'').join('\n'),/npm run build|docker|flyctl|seed\.mjs|auth-config\.mjs|migrate\.mjs|verify-rcap-commercial-browser|webhook-retarget|resolve-preview|--prod|--once/);
});
test('native artifact retains the exact existing packet consumer name and controller evidence directory even on failure',()=>{
 const upload=job.steps.at(-1);assert.equal(upload.uses,'actions/upload-artifact@v4');assert.equal(upload.if,'always()');assert.equal(upload.with.name,'rcap-hosted-clinic_deploy-${{ github.run_id }}');assert.equal(upload.with.path,'admitted-controller/hosted-acceptance-evidence/');assert.equal(upload.with['if-no-files-found'],'error');
 const consumer=workflow.jobs.clinic_owned_matter_packet.steps.find(s=>s.uses==='actions/download-artifact@v4');assert.equal(consumer.with.name,'rcap-hosted-clinic_deploy-${{ inputs.preview_creation_run_id }}');
});
test('exact preserved-key block and admitted deployer refuse partial or malformed values and preserve complete or historical continuity',()=>{
 const keys=job.steps.find(s=>s.id==='preserved_acceptance_keys');
 const original=spawnSync('git',['show',H+':scripts/rcap-hosted-acceptance-deploy.mjs'],{encoding:'utf8'});assert.equal(original.status,0,'Exact admitted deployer source must be available');
 const ts=createRequire(import.meta.url)('typescript'),ast=ts.createSourceFile('deployer.mjs',original.stdout,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
 const fn=ast.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='preservedDataKeys');assert.ok(fn);
 const validate=new Function(fn.getText(ast)+';return preservedDataKeys;')();
 const names=['HOSTED_LEGAL_AID_RESTRICTED_FIELD_KEY','HOSTED_LEGAL_AID_RESTRICTED_FIELD_KEY_VERSION','HOSTED_PARTICIPANT_PRIVACY_PSEUDONYM_SECRET'];
 const complete={[names[0]]:Buffer.alloc(32,7).toString('base64'),[names[1]]:'v1',[names[2]]:'synthetic-pseudonym-key-material'};
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'clinic-preview-key-continuity-'));
 try{
  const output=path.join(dir,'env');
  const run=values=>{
   fs.rmSync(output,{force:true});
   const result=spawnSync(process.execPath,['--input-type=module','-'],{cwd:dir,input:keys.run.split("<<'NODE'\n")[1].split('\nNODE')[0],encoding:'utf8',env:{PATH:process.env.PATH,GITHUB_ACTIONS:'true',ACCEPTANCE_SUPABASE_PROJECT_REF:expected.supabase_project_ref,GITHUB_ENV:output,HOSTED_CLINIC_DEMO_PASSWORD:'synthetic-history-password-24',...values}});
   const preserved={};
   if(fs.existsSync(output)){
    const lines=fs.readFileSync(output,'utf8').split('\n');
    for(let i=0;i<lines.length;i++)if(lines[i].includes('<<')){const [key,delimiter]=lines[i].split('<<');const value=[];while(lines[++i]!==delimiter&&i<lines.length)value.push(lines[i]);preserved[key]=value.join('\n');}
   }
   return {status:result.status,preserved};
  };
  const normal=run(complete);assert.equal(normal.status,0);assert.deepEqual(normal.preserved,complete);validate(normal.preserved);
  const missing=run({});assert.equal(missing.status,0);validate(missing.preserved);
  const repeated=run({});assert.deepEqual(repeated.preserved,missing.preserved,'Historical continuity must be deterministic');
  assert.notEqual(run({[names[0]]:complete[names[0]]}).status,0,'Partial explicit inputs must refuse');
  for(const values of [{...complete,[names[0]]:'invalid'},{...complete,[names[1]]:'v2'},{...complete,[names[2]]:'short'}]){
   const malformed=run(values);assert.equal(malformed.status,0,'Continuity block preserves explicit bytes for downstream validation');assert.throws(()=>validate(malformed.preserved),'Actual deployer must reject malformed preserved values before provider access');
  }
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});
