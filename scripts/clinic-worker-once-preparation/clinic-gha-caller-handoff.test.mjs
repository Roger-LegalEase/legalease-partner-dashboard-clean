import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import childProcess from 'node:child_process';
import {syncBuiltinESMExports} from 'node:module';

// One connected local regression: actual archived controls, mocked clock/GHA reads/image.
// It proves a caller contract; it never asserts live custody or executes customer work.
const workspace=process.env.CLINIC_HANDOFF_WORKSPACE,resume=process.env.CLINIC_PERSISTED_RESUME_ROOT;
assert(workspace&&resume);const binding=JSON.parse(fs.readFileSync(path.join(workspace,'clinic-worker-input/binding.json')));
const window=JSON.parse(fs.readFileSync(path.join(workspace,'clinic-worker-input',binding.windowFile)));
const originalNow=Date.now,originalFetch=globalThis.fetch,originalExec=childProcess.execFileSync,originalSpawn=childProcess.spawnSync;
const image='ghcr.io/roger-legalease/rcap-render-worker@sha256:cd0d3ab9098ed47028d5d89ae5280904520f28bc7331fc9ca17b2a2978a3f494';
let releaseReads=0,imageInspections=0;const records=[],checkpoint=value=>{records.push(value);};
try{
 Date.now=()=>Date.parse(window.startedAt)+60000;
 childProcess.execFileSync=(command,args)=>{assert.equal(command,'git');assert.deepEqual(args,['rev-parse','HEAD']);return binding.executionToolsSha+'\n';};
 childProcess.spawnSync=(command,args)=>{assert.equal(command,'docker');assert.equal(args[0],'image');assert.equal(args[1],'inspect');imageInspections++;return {status:0,signal:null,error:null,stdout:JSON.stringify({repoDigests:[image],source:'32499751569359315248c2048fa111064a47c67f',user:'1000:1000'})};};
 syncBuiltinESMExports();
 globalThis.fetch=async(url,options)=>{const u=new URL(url);assert.equal(u.origin,'https://api.github.com');assert.equal(options.method,'GET');assert(u.pathname.endsWith('/actions/runs'));const status=u.searchParams.get('status');return new Response(JSON.stringify({workflow_runs:status==='in_progress'?[{id:40486328355,head_sha:binding.executionToolsSha,run_attempt:1,head_branch:'codex/f-vercel-raw-readonly-20261026',status}]:[]}));};
 const {createClinicGhaPorts}=await import('./clinic-gha-ports.mjs');
 const {runClinicReviewSession}=await import('../rcap-hosted-clinic-review-session.mjs');
 const {CLINIC,hash}=await import('../rcap-hosted-existing-clinic-readonly.mjs');
 const fakeJwt='e30.'+Buffer.from(JSON.stringify({ref:CLINIC.project,role:'service_role',exp:Math.floor(Date.now()/1000)+3600})).toString('base64url')+'.local-test-only';
 const env={GITHUB_ACTIONS:'true',RUNNER_ENVIRONMENT:'github-hosted',RUNNER_OS:'Linux',RUNNER_TEMP:workspace,GITHUB_REPOSITORY:'Roger-LegalEase/legalease-partner-dashboard-clean',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_REF_NAME:'codex/f-vercel-raw-readonly-20261026',GITHUB_RUN_ATTEMPT:'1',GITHUB_RUN_ID:'40486328355',GITHUB_SHA:binding.executionToolsSha,GITHUB_WORKSPACE:workspace,CLINIC_WORKER_CONTROL_BINDING_FILE:path.join(workspace,'clinic-worker-input/binding.json'),GITHUB_TOKEN:'local-only',SUPABASE_SERVICE_ROLE_KEY:fakeJwt,SUPABASE_URL:`https://${CLINIC.project}.supabase.co`,NEXT_PUBLIC_SUPABASE_URL:`https://${CLINIC.project}.supabase.co`,ENABLE_SUPABASE_PARTNER_DATA:'true',RCAP_WORKER_CLAIM_SECONDS:'120',RCAP_WORKER_CONTAINER_DIGEST:CLINIC.digest,SUPABASE_ACCESS_TOKEN:'local-only',SUPABASE_ANON_KEY:'local-only',HOSTED_CLINIC_DEMO_PASSWORD:'local-only',VERCEL_AUTOMATION_BYPASS_SECRET:'local-only'};
 const nativeBinding=JSON.parse(fs.readFileSync(new URL('../clinic-readonly-native-binding.json',import.meta.url)));
 const config={origin:nativeBinding.origin,deploymentId:nativeBinding.deploymentId,toolsSha:CLINIC.tools,controllerSha:CLINIC.controller,savedCaseSha256:hash(CLINIC.item),bypass:env.VERCEL_AUTOMATION_BYPASS_SECRET,executionToolsSha:binding.executionToolsSha,workerControlBindingSha256:hash(fs.readFileSync(env.CLINIC_WORKER_CONTROL_BINDING_FILE)),applicationSha:CLINIC.app,creatorNativeSha256:nativeBinding.nativeSha256,clinicNativeAdmissionVerified:true};
 const ports=await createClinicGhaPorts({env,config,checkpoint});assert.equal(ports.checkpoint,checkpoint);await ports.verifyPreparedImageBeforeVerify();assert.equal(imageInspections,1);
 const native=JSON.parse(fs.readFileSync(resume+'/hosted-fulfillment-20261027/clinic-purpose-deploy-execution/run-40448248665/extracted/deploy.json'));
 const recovery=JSON.parse(fs.readFileSync(resume+'/clinic-postsave-get-recovery-actual-execution-20261027/extracted/result.json'));
 const fetcher=async(url,options)=>{assert.equal(new URL(url).pathname,'/api/rcap/release');assert.equal(options.method,'GET');releaseReads++;throw Error('local read-only transport stop');};
 const folder=resume+'/clinic-draft-save-actual-execution-20261027/continuation-after-zero-cas-timeout/extracted/';const read=name=>JSON.parse(fs.readFileSync(folder+name));
 const witness={before:read('checkpoint-05.json'),response:read('checkpoint-06.json'),result:read('result.json')};
 const args={config,native,recovery,witness,env,chromium:{},ports,fetcher};
 const broken={...ports};delete broken.checkpoint;await assert.rejects(()=>runClinicReviewSession({...args,ports:broken}),{name:'AssertionError'});assert.equal(releaseReads,0);
 // Stop at the first read-only release request beyond the fixed handoff.
 const result=await runClinicReviewSession(args);assert.equal(result.result.phase,'HOLD_RECONCILE_NO_RETRY');
 assert.equal(releaseReads,1);assert(records.some(value=>value.phase==='HOLD_RECONCILE_NO_RETRY'));assert(!JSON.stringify(records).includes(fakeJwt));
 console.log('ONE focused real Clinic facade-to-caller checkpoint handoff regression PASS; actual archived controls, mocked clock/GHA/image; customer Auth/writes/worker=0.');
}finally{Date.now=originalNow;globalThis.fetch=originalFetch;childProcess.execFileSync=originalExec;childProcess.spawnSync=originalSpawn;syncBuiltinESMExports();}
