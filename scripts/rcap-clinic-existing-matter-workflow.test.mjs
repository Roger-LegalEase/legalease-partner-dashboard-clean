import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {test} from 'node:test';
const YAML=createRequire(import.meta.url)('yaml');
const workflow=YAML.parse(fs.readFileSync(new URL('../.github/workflows/rcap-f1-ephemeral-staging.yml',import.meta.url),'utf8'));
const mode='clinic_owned_matter_packet', job=workflow.jobs[mode];
function selected(value){return Object.entries(workflow.jobs).filter(([,job])=>!job.if||vm.runInNewContext(job.if,{inputs:{mode:value},startsWith:(s,p)=>s.startsWith(p)})).map(([name])=>name);}
test('only the exact existing-matter job schedules; fresh intake/deploy/full/production jobs stay excluded',()=>{
 assert.deepEqual(selected(mode),[mode]);assert.equal(workflow.on.workflow_dispatch.inputs.mode.options.filter(v=>v===mode).length,1);
 for(const value of ['clinic_setup_only','clinic_owned_matter_readonly','hosted_clinic_preview','hosted_full','ephemeral'])assert.equal(selected(value).includes(mode),false);
 assert.equal(job.steps[0].with['fetch-depth'],0);assert.equal(job.steps[0].with['persist-credentials'],false);
});
test('existing job binds provided runtime IDs, saved credentials and fixed matter/scope with no code/seed/reset/worker step',()=>{
 const run=job.steps.find(s=>s.run==='node scripts/verify-rcap-commercial-browser.mjs');assert.ok(run);
 assert.equal(run.env.RCAP_BROWSER_EXISTING_CLINIC_MATTER_ID,'${{ inputs.resume_matter_id }}');
 assert.equal(run.env.RCAP_BROWSER_BASE_URL,'https://${{ inputs.preview_hostname }}');assert.equal(run.env.RCAP_BROWSER_PREVIEW_DEPLOYMENT_ID,'${{ inputs.preview_deployment_id }}');
 assert.equal(run.env.RCAP_BROWSER_PASSWORD,'${{ secrets.HOSTED_CLINIC_DEMO_PASSWORD }}');
 assert.equal(run.env.RCAP_BROWSER_CLINIC_ACCESS_CODE,'');assert.equal(run.env.RCAP_BROWSER_CLINIC_SETUP_ONLY,'0');assert.equal(run.env.RCAP_BROWSER_ISSUE_CLINIC_CODE,'0');
 const commands=job.steps.map(s=>s.run??'').join('\n');assert.doesNotMatch(commands,/db-seed|seed-clinic|issue-access-code|--once|docker|--after|hosted-acceptance-deploy|live-prerequisites\.mjs/);
 assert.ok(job.steps.findIndex(s=>s.uses==='actions/download-artifact@v4')<job.steps.indexOf(run));
 assert.equal(job.steps.find(s=>s.uses==='actions/download-artifact@v4').with['run-id'],'${{ inputs.preview_creation_run_id }}');
 assert.ok(Object.hasOwn(run.env,'RCAP_BROWSER_EXPECTED_SCOPE_SHA256'));assert.match(run.env.RCAP_BROWSER_EXPECTED_SCOPE_SHA256,/^[a-f0-9]{64}$/);
 assert.doesNotMatch(commands,/verify-release-candidate-binding/);
 assert.equal(job.steps.at(-1).if,'always()');
});
test('full native command includes accepted Clinic, canonical filler and new real-HTTP/workflow tests',()=>{
 const step=job.steps.find(s=>s.name==='Verify the full Clinic suite and actual existing-matter local HTTP orchestration');assert.equal(step.env.RCAP_BROWSER_CHROMIUM,'/usr/bin/google-chrome');
 for(const file of ['rcap-clinic-owned-matter-prerequisites.test.mjs','rcap-clinic-owned-matter-readonly.test.mjs','rcap-clinic-setup-request-guard.test.mjs','rcap-clinic-existing-matter-continuation.test.mjs','rcap-clinic-existing-matter-workflow.test.mjs','test-rcap-packet-builder-filler.mjs'])assert.ok(step.run.includes(file));
 assert.doesNotMatch(step.run,/--test-name-pattern|--test-skip-pattern|\|\| true/);
});
test('actual workflow inline dispatch guard refuses wrong matter, fresh attempt, missing runtime and different control head',()=>{
 const step=job.steps.find(s=>s.name==='Require exact existing matter inputs and disabled control-branch deployment');
 const code=step.run.split("<<'JS'\n")[1].split('\nJS')[0];assert.ok(code);
 const inputs={mode,resume_matter_id:'6765fcb9-586d-4abe-bc60-9f77f6a11e16',application_sha:'4feb8e94b3dee4085fe05ea75d78853fe21e5097',worker_source_sha:'16908485a94f475448657cea90583a4d352da9a3',worker_digest:'sha256:4f8c71c3630e6c110427d111518be149f3c74d46c856633fc5536a8065bc17af',supabase_project_ref:'hyflxnlhpmiqxvvcoiia',tools_sha:'a'.repeat(40),preview_deployment_id:'dpl_Synthetic',preview_creation_run_id:'40299999999',preview_hostname:'synthetic.vercel.app'};
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'existing-packet-dispatch-'));
 try{fs.writeFileSync(path.join(dir,'vercel.json'),JSON.stringify({git:{deploymentEnabled:{fixturecontrol:false}}}));
 const run=patch=>spawnSync(process.execPath,['--input-type=module','-'],{cwd:dir,input:code,encoding:'utf8',env:{...process.env,GITHUB_SHA:'a'.repeat(40),GITHUB_REF_NAME:'fixturecontrol',GITHUB_RUN_ATTEMPT:'1',DISPATCH_INPUTS:JSON.stringify({...inputs,...patch})}}).status;
 assert.equal(run({}),0);for(const patch of [{mode:'hosted_full'},{resume_matter_id:'wrong'},{clinic_attempt_id:'spent'},{preview_deployment_id:''},{preview_creation_run_id:''},{preview_creation_run_id:'40057159400'},{preview_hostname:'production.example.com'},{tools_sha:'b'.repeat(40)}])assert.notEqual(run(patch),0);
 }finally{fs.rmSync(dir,{recursive:true});}
});
