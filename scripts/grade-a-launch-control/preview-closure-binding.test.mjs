import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {prepareClosureControl,CLOSURE_CONTROL_PATHS,verifyClosureControl} from './preview-closure-control.mjs';
import {PREVIEW_ADMISSION_SCHEMA,PREVIEW_CREATION_RUN,ACCEPTANCE_PROJECT,PRODUCTION_BASELINE,assertNativePreviewCreation} from './preview-closure-contract.mjs';
import {PENDING,CANDIDATE,TOOLS,verifyPinnedForwardBinding,assertClosureApplicationInputs} from './verify-pinned-worker-successor.mjs';
import {requireCurrentReleaseCandidate} from './verify-release-candidate-binding.mjs';
import {HOSTED_VERCEL_PROJECT_ID} from '../rcap-hosted-acceptance-vercel-identity.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
test('complete synthetic native v3 closure reaches CURRENT through real successor binding; history and authority stay held',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-preview-binding-'));
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024}).trim();
 const write=(p,d)=>{fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),JSON.stringify(d,null,2)+'\n');};
 const read=p=>JSON.parse(fs.readFileSync(path.join(root,p)));
 const commit=msg=>git(['-c','user.name=Synthetic Closure Test','-c','user.email=synthetic@example.invalid','commit','--quiet','-m',msg]);
 try{
  // The synthetic clone sees the parent's local branches, not its remote-tracking
  // refs. Preserve the *actual* canonical ref from the full checkout before
  // verifying predecessor history; never fabricate a passing release identity.
  const sourceRoot=process.cwd();
  const canonicalRef='refs/remotes/origin/captain-release';
  const canonicalSha=execFileSync('git',['rev-parse','--verify',`${canonicalRef}^{commit}`],{cwd:sourceRoot,encoding:'utf8'}).trim();
  const originUrl=execFileSync('git',['remote','get-url','origin'],{cwd:sourceRoot,encoding:'utf8'}).trim();
  execFileSync('git',['clone','--quiet','--shared','--no-checkout',sourceRoot,root]);
  git(['remote','set-url','origin',originUrl]);
  git(['update-ref',canonicalRef,canonicalSha]);
  const predecessorSha='eb9564de96b2514cf6d972f7a5cb5b6d8c4675a3';git(['checkout','--quiet','--detach',predecessorSha]);fs.symlinkSync(fs.realpathSync('node_modules'),path.join(root,'node_modules'));
  for(const p of CLOSURE_CONTROL_PATHS)fs.copyFileSync(p,path.join(root,p));
  const vercel=read('vercel.json');vercel.git.deploymentEnabled['codex-f/synthetic-closure-disabled']=false;write('vercel.json',vercel);
  git(['add','--',...CLOSURE_CONTROL_PATHS]);commit('synthetic closure-only control correction');const sourceSha=git(['rev-parse','HEAD']);
  const closureControl=prepareClosureControl(root,{predecessorSha,sourceSha});for(const p of [PENDING,CANDIDATE,TOOLS])write(p,{...read(p),closureControl});
  const c=read(CANDIDATE),tuple=Object.fromEntries(['applicationSha','workerSourceSha','workerDigest','workerInputFingerprint','toolsSha'].map(k=>[k,c[k]]));
  assert.equal(verifyClosureControl(root,c).size,Object.keys(closureControl.files).length);
  const prefix='hosted-acceptance-evidence/successor-closure/synthetic-preview-v3/';fs.mkdirSync(path.join(root,prefix),{recursive:true});
  const aliases=[{alias:'synthetic-production.invalid',redirect:null}],domains=[{name:'synthetic-production.invalid',redirect:null,redirectStatusCode:null,gitBranch:null,customEnvironmentId:null}];
  const creationRun={id:PREVIEW_CREATION_RUN,head_sha:predecessorSha,status:'completed',conclusion:'success',run_attempt:1,event:'workflow_dispatch',path:'.github/workflows/rcap-f1-ephemeral-staging.yml',repository:{full_name:'Roger-LegalEase/legalease-partner-dashboard-clean'}};
  const creationJobs={jobs:[{run_id:creationRun.id,status:'completed',conclusion:'success',steps:['Require exact current release or HELD acceptance Preview tuple','Require CURRENT authority except exact HELD acceptance Preview creation','Read the existing sandbox catalog for the replacement Preview','Deploy the frozen application SHA to Vercel Preview','Upload the hosted acceptance evidence'].map(name=>({name,conclusion:'success'}))}]};
  const metadata={rcapApplicationSha:c.applicationSha,rcapWorkerSourceSha:c.workerSourceSha,rcapWorkerDigest:c.workerDigest,rcapWorkerInputFingerprint:c.workerInputFingerprint,rcapAcceptanceProjectRef:ACCEPTANCE_PROJECT};
  const deploy={schemaVersion:'rcap-hosted-acceptance-deploy/v1',passed:true,applicationSha:c.applicationSha,acceptanceProjectRef:ACCEPTANCE_PROJECT,neverPassedProdFlag:true,neverWroteProjectLevelEnv:true,productionBefore:{aliases:[],environmentShape:[]},productionAfter:{aliases:[],environmentShape:[]},requiredCases:['deployed_to_preview_not_production','deployment_carries_the_final_application_sha','deployment_carries_the_accepted_worker_binding','bound_to_the_acceptance_supabase_project_only','production_aliases_unchanged','production_environment_variables_unchanged'],failedCases:[],deployment:{id:'dpl_SyntheticPreview',immutableHostname:'synthetic-preview.vercel.app',target:null,readyState:'READY',projectId:HOSTED_VERCEL_PROJECT_ID,gitSourceSha:c.applicationSha,metadata}};
  const preflight={schemaVersion:'rcap-hosted-acceptance-preflight/v1',passed:true,acceptanceProjectRef:ACCEPTANCE_PROJECT,cases:{projectIdentity:{status:'ACTIVE_HEALTHY'}}};
  const creationTmp=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-synthetic-creation-'));fs.writeFileSync(path.join(creationTmp,'deploy.json'),JSON.stringify(deploy));fs.writeFileSync(path.join(creationTmp,'preflight.json'),JSON.stringify(preflight));const creationZip=path.join(root,prefix,'preview-creation-native.zip');execFileSync('zip',['-q',creationZip,'deploy.json','preflight.json'],{cwd:creationTmp});fs.rmSync(creationTmp,{recursive:true,force:true});
  const creationArtifact={id:123,name:`rcap-hosted-replace_preview-${creationRun.id}`,workflow_run:{id:creationRun.id,head_sha:creationRun.head_sha},digest:'sha256:'+hash(fs.readFileSync(creationZip))};
  const previewCreation=assertNativePreviewCreation({run:creationRun,jobs:creationJobs,artifact:creationArtifact,archiveDigest:creationArtifact.digest,deploy,preflight,creationCandidate:JSON.parse(git(['show',`${predecessorSha}:${CANDIDATE}`]))},tuple,{creationRunId:creationRun.id,deploymentId:deploy.deployment.id,hostname:deploy.deployment.immutableHostname});
  const h={schemaVersion:PREVIEW_ADMISSION_SCHEMA,...tuple,closureControlSha:sourceSha,capturedAt:new Date().toISOString(),workflowSourceSha:sourceSha,runId:111,jobId:222,artifactId:333,previewCreation,deploymentId:previewCreation.deploymentId,hostname:previewCreation.hostname,projectId:HOSTED_VERCEL_PROJECT_ID,acceptanceProjectRef:ACCEPTANCE_PROJECT,productionRollback:'dpl_3j4Dr4GHyXmwmrFCTZ6orNNNP7sc',productionBaseline:PRODUCTION_BASELINE,productionDeploymentAliases:aliases,productionProjectDomains:domains,productionDeploymentAliasesUnchanged:true,productionProjectDomainsUnchanged:true,productionEnvironmentUnchanged:true,projectLevelProductionEnvironmentMutations:0,autoAssignCustomDomains:false,signupVerified:true,workerRollbackVerified:true,queueSafetyVerified:true,sharedHostRoutingVerified:true,sharedHostRoutingMethod:'frozen-proxy-map-and-staged-targets',productionWrites:false,target:null,readyState:'READY',liveAuthCalls:0,productionAuthorized:false,newDeploymentCreated:false,workerClaims:0,realPayments:0,participantWrites:0};
  const entries={'candidate-ready.json':{id:h.deploymentId,url:h.hostname,target:h.target,readyState:h.readyState,projectId:h.projectId,applicationSha:h.applicationSha,meta:metadata},'candidate-aliases.json':{aliases:[]},'acceptance-project-state.json':{projectRef:ACCEPTANCE_PROJECT,status:'ACTIVE_HEALTHY'},'admission.json':h,'preview-creation-run.json':creationRun,'preview-creation-jobs.json':creationJobs,'preview-creation-artifact.json':creationArtifact,'worker-rollback.json':{passed:true,readOnly:true},'queue-safety.json':{passed:true,readOnly:true,queue:{stale_queued:0,queued:0,claimed:0,terminal_failed:0}},'shared-host-routing.json':{passed:true,source:c.applicationSha,cases:[['expungement.ai','/','/expungement-ai'],['legalease.com','/','/static/legalease/index.html'],['legaleasepartner.com','/','/partners']]},'browser-results.json':['en','es'].flatMap(locale=>[375,1440].map(width=>({locale,width,status:'PASS',auth:'MOCKED: NO LIVE AUTH',claim:'MOCKED: NO LIVE CLAIM'}))),'production-baseline-before.json':PRODUCTION_BASELINE,'production-baseline-after.json':PRODUCTION_BASELINE,'production-aliases-before.json':aliases,'production-aliases-after.json':aliases,'production-project-domains-before.json':domains,'production-project-domains-after.json':domains,'production-environment-before.json':[],'production-environment-after.json':[]};
  for(const [n,d]of Object.entries(entries))write(prefix+n,d);execFileSync('zip',['-q',path.join(root,prefix,'native.zip'),...Object.keys(entries),'preview-creation-native.zip'],{cwd:path.join(root,prefix)});
  write(prefix+'run.json',{...creationRun,id:h.runId,head_sha:sourceSha});write(prefix+'jobs.json',{jobs:[{id:h.jobId,run_id:h.runId,status:'completed',conclusion:'success',steps:['Install frozen dependencies','Install browser for mocked signup only','Verify exact forward controls before provider credentials','Stage exact application without aliases and read worker rollback','Upload non-production closure evidence'].map(name=>({name,conclusion:'success'}))}]});write(prefix+'artifact.json',{id:h.artifactId,workflow_run:{id:h.runId,head_sha:sourceSha},digest:'sha256:'+hash(fs.readFileSync(path.join(root,prefix,'native.zip')))});
  const hosted={...h,receipt:h,runPath:prefix+'run.json',jobsPath:prefix+'jobs.json',artifactPath:prefix+'artifact.json',receiptPath:prefix+'admission.json',archivePath:prefix+'native.zip',files:fs.readdirSync(path.join(root,prefix)).map(n=>{const b=fs.readFileSync(path.join(root,prefix,n));return {path:prefix+n,bytes:b.length,sha256:hash(b)};})};
  for(const p of [PENDING,CANDIDATE,TOOLS])write(p,{...read(p),hostedAdmission:hosted});
  const result=verifyPinnedForwardBinding(root,read(CANDIDATE));assert.equal(result.current,true,JSON.stringify(result));assert.equal(result.status,'CURRENT');assert.equal(result.productionAuthorized,false);assert.equal(requireCurrentReleaseCandidate(root).productionAuthorized,false);
  const altered=read(CANDIDATE);altered.productionAuthorized=true;write(CANDIDATE,altered);assert.throws(()=>verifyClosureControl(root,altered),'CURRENT cannot inherit Production authority');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('isolated Preview closure admits exactly four added paths and still rejects unrelated script and application changes',()=>{
 const added=['scripts/rcap-hosted-acceptance-vercel-identity.mjs','scripts/rcap-hosted-vercel-rest-transport.mjs','scripts/rcap-hosted-vercel-rest-transport.test.mjs','scripts/rcap-isolated-clinic-environment.test.mjs'];
 const prior=['.github/workflows/rcap-f1-ephemeral-staging.yml','scripts/rcap-successor-nonproduction-closure.mjs','scripts/grade-a-launch-control/verify-pinned-worker-successor.mjs','scripts/grade-a-launch-control/preview-closure-contract.mjs','scripts/grade-a-launch-control/preview-closure-contract.test.mjs','scripts/grade-a-launch-control/preview-closure-control.mjs','scripts/grade-a-launch-control/preview-closure-binding.test.mjs','scripts/rcap-worker-identity-readonly.mjs','scripts/rcap-worker-identity-readonly.test.mjs','vercel.json','scripts/grade-a-launch-control/require-preview-preparation.mjs','scripts/rcap-hosted-acceptance-deploy.mjs','scripts/rcap-configured-sandbox-preview-contract.mjs','scripts/rcap-configured-sandbox-preview.mjs','scripts/rcap-configured-sandbox-preview.test.mjs','scripts/rcap-hosted-existing-dtc-continuation.mjs','scripts/rcap-hosted-existing-dtc-continuation.test.mjs'];
 assert.equal(new Set(CLOSURE_CONTROL_PATHS).size,CLOSURE_CONTROL_PATHS.length);
 assert.deepEqual([...CLOSURE_CONTROL_PATHS].sort(),[...prior,...added].sort());
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'f-four-closure-paths-'));
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
 const write=(name,text)=>{const target=path.join(root,name);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,text);};
 const commit=()=>{git(['add','.']);git(['-c','user.name=Synthetic Closure Test','-c','user.email=synthetic@example.invalid','commit','--quiet','-m','synthetic isolated fixture']);return git(['rev-parse','HEAD']);};
 try {
  git(['init','--quiet']);
  for(const name of ['PENDING_WORKER_SUCCESSOR','RELEASE_CANDIDATE_BINDING','HOSTED_TOOLS_BINDING'])write('data/rcap-grade-a/launch-control/'+name+'.json','{}\n');
  const predecessorSha=commit();for(const name of added)write(name,'synthetic reviewed control\n');const sourceSha=commit();
  const manifest=prepareClosureControl(root,{predecessorSha,sourceSha});assert.deepEqual(Object.keys(manifest.files).sort(),[...added].sort());
  for(const name of added)assert.equal(manifest.files[name],hash('synthetic reviewed control\n'));
  write('scripts/unreviewed-extra.mjs','unapproved\n');const unrelated=commit();assert.throws(()=>prepareClosureControl(root,{predecessorSha,sourceSha:unrelated}),/only authorized closure control correction/);
  git(['rm','scripts/unreviewed-extra.mjs']);write('src/unreviewed.ts','unapproved\n');const application=commit();assert.throws(()=>prepareClosureControl(root,{predecessorSha,sourceSha:application}),/only authorized closure control correction/);
 } finally {fs.rmSync(root,{recursive:true,force:true});}
});


test('closure application binding permits only manifest-bound literal branch disable additions',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'f-disable-only-binding-'));
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:'pipe'}).trim();
 const write=(file,text)=>{fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),text);};
 const baseline={$schema:'https://openapi.vercel.sh/vercel.json',git:{deploymentEnabled:{main:false,existing:true}},buildCommand:'npm run build'};
 const config=extra=>({...baseline,git:{deploymentEnabled:{...baseline.git.deploymentEnabled,...extra}}});
 const save=value=>write('vercel.json',JSON.stringify(value)+'\n');
 const commit=()=>{git(['add','.']);git(['-c','user.name=Synthetic Closure Test','-c','user.email=synthetic@example.invalid','commit','--quiet','--allow-empty','-m','synthetic disable-only fixture']);return git(['rev-parse','HEAD']);};
 try {
  git(['init','--quiet']);save(baseline);write('src/app.ts','export const frozen=true;\n');const app=commit();
  const bound=new Set(['vercel.json']);
  const check=(value,prepare=()=>{})=>{git(['reset','--hard',app]);save(value);prepare();commit();assertClosureApplicationInputs(root,app,bound);};
  check(config({'codex-b/isolated-sponsored-control-20261025':false}));
  assert.throws(()=>assertClosureApplicationInputs(root,app,new Set()),/verified closure control/);
  save(config({'codex-b/isolated-sponsored-control-20261025':false,uncommitted:false}));
  assert.throws(()=>assertClosureApplicationInputs(root,app,bound),/working Vercel bytes match HEAD/);
  for(const value of [
   config({newbranch:true}),config({newbranch:null}),config({'*':false}),config({'feature/*':false}),config({'feature/?':false}),config({'feature/[x]':false}),config({'bad..branch':false}),
   {...config({newbranch:false}),git:{deploymentEnabled:{newbranch:false}}},config({main:true,newbranch:false}),
   {...config({newbranch:false}),env:{PRIVATE:'changed'}},{...config({newbranch:false}),buildCommand:'changed'},
   {...config({newbranch:false}),functions:{'api/x':{runtime:'changed'}}},{...config({newbranch:false}),git:{deploymentEnabled:false}}
  ])assert.throws(()=>check(value));
  assert.throws(()=>check(config({newbranch:false}),()=>write('src/app.ts','export const frozen=false;\n')),/application inputs/);
  assert.throws(()=>check(config({newbranch:false}),()=>fs.chmodSync(path.join(root,'vercel.json'),0o755)),/file mode/);
  git(['reset','--hard',app]);write('src/app.ts','uncommitted application drift;\n');assert.throws(()=>assertClosureApplicationInputs(root,app,new Set()),/working application inputs/);
  git(['reset','--hard',app]);assertClosureApplicationInputs(root,app,new Set());
 } finally {fs.rmSync(root,{recursive:true,force:true});}
});


test('closure application binding admits only exact historical workflow and Eg2 collector bytes and rejects control or runtime drift',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'f-historical-identity-binding-'));
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:'pipe'}).trim();
 const source=(sha,file)=>execFileSync('git',['show',`${sha}:${file}`],{cwd:process.cwd()});
 const app='4feb8e94b3dee4085fe05ea75d78853fe21e5097',reviewed='f614b6c77111d844e6f051a69344a9b093f7158e';
 const identity='scripts/rcap-hosted-acceptance-vercel-identity.mjs',history='data/rcap-grade-a/participant-data-rights/vercel-only-recheck-preparation-20260914.json',workflow='.github/workflows/rcap-f1-ephemeral-staging.yml';
 const write=(file,bytes)=>{fs.mkdirSync(path.dirname(path.join(root,file)),{recursive:true});fs.writeFileSync(path.join(root,file),bytes);};
 const commit=()=>{git(['add','.']);git(['-c','user.name=Synthetic Closure Test','-c','user.email=synthetic@example.invalid','commit','--quiet','-m','synthetic historical reference fixture']);return git(['rev-parse','HEAD']);};
 try {
  git(['init','--quiet']);
  write('next.config.ts',"import './scripts/fixture-reader.mjs';\n");
  write('scripts/fixture-reader.mjs',"import path from 'node:path';export const files=path.join(process.cwd(),'data/rcap-grade-a/participant-data-rights');\n");
  write('src/app.ts','export const frozen=true;\n');
  for(const file of [identity,history,workflow])write(file,source(app,file));
  const baseline=commit(),bound=new Set([identity,workflow]);
  const check=prepare=>{git(['reset','--hard',baseline]);write(identity,source(reviewed,identity));write(workflow,source(reviewed,workflow));prepare?.();commit();assertClosureApplicationInputs(root,baseline,bound);};
  check();
  assert.throws(()=>assertClosureApplicationInputs(root,baseline,new Set()),/verified closure control/);
  assert.throws(()=>assertClosureApplicationInputs(root,baseline,new Set([identity])),/verified closure control/);
  write(identity,Buffer.concat([source(reviewed,identity),Buffer.from('\n// working drift\n')]));
  assert.throws(()=>assertClosureApplicationInputs(root,baseline,bound),/working historical control/);
  assert.throws(()=>check(()=>write(identity,source(reviewed,identity).toString().replace('dpl_Eg2n58h38JhnU9uuXQ7Nk46QXGuL','dpl_WrongPreview'))),/reviewed historical control/);
  assert.throws(()=>check(()=>write(workflow,Buffer.concat([source(reviewed,workflow),Buffer.from('\n# arbitrary workflow drift\n')]))),/reviewed historical control/);
  assert.throws(()=>check(()=>write('src/app.ts',"import '../scripts/rcap-hosted-acceptance-vercel-identity.mjs';\n")),/runtime consumer|application inputs/);
  assert.throws(()=>check(()=>fs.chmodSync(path.join(root,identity),0o755)),/file mode/);
  assert.throws(()=>check(()=>write(history,source(app,history).toString().replace('historicalPreparationOnly','runtimeAuthority'))),/historical preparation/);
  assert.throws(()=>check(()=>write('data/rcap-grade-a/participant-data-rights/runtime-authority.json','{"active":true}\n')),/application inputs/);
  assert.throws(()=>check(()=>write('next.config.ts',"import './scripts/fixture-reader.mjs';export default {env:{changed:'true'}};\n")),/application inputs/);
 } finally {fs.rmSync(root,{recursive:true,force:true});}
});
