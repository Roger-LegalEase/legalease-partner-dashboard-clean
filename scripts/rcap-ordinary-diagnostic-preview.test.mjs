import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {DIAGNOSTIC_APP,DIAGNOSTIC_STATUS,DIAGNOSTIC_WORKER_METADATA} from './grade-a-launch-control/require-ordinary-diagnostic-preview.mjs';
const read=p=>fs.readFileSync(p,'utf8');
const dataImport=source=>import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const scriptUrl=pathToFileURL(path.resolve('scripts/')+'/');
function absoluteImports(source,base){return source.replace(/from\s*(['"])(\.[^'"]+)\1/g,(_m,_q,p)=>'from '+JSON.stringify(new URL(p,base).href));}
const tools='1'.repeat(40),head='2'.repeat(40);
const schemas={PENDING_WORKER_SUCCESSOR:'rcap-pending-worker-successor/v1',HOSTED_TOOLS_BINDING:'rcap-exact-hosted-tools-binding/v1',RELEASE_CANDIDATE_BINDING:'rcap-release-candidate-binding/v1'};
function record(schemaVersion){return{schemaVersion,status:DIAGNOSTIC_STATUS,applicationSha:DIAGNOSTIC_APP,toolsSha:tools,workerSourceSha:null,workerDigest:null,workerInputFingerprint:null,publication:null,readOnlyImageAcceptance:null,runtimeAccepted:false,workerRebuildRequired:true,previewExecution:'held',resume:null,productionAuthorized:false,productionAuthorization:null,deploymentAuthorized:false,clinicDispatchReady:false,hostedAdmission:null,releaseBaseSha:'9aadacd0c5a7fac90a1662f1928b7b86f8685c7a',supersededRecord:{historical:true},supersededRecordSha256:createHash('sha256').update(JSON.stringify({historical:true})).digest('hex')};}
const inputs={phase:'managed_start_source_successor',applicationSha:DIAGNOSTIC_APP,workerSourceSha:'',workerDigest:'',toolsSha:tools,workflowSourceSha:head};
test('isolated APP-only admission rejects worker claims, wrong purpose, record drift, permissions and controller drift',async()=>{
 const source=read('scripts/grade-a-launch-control/require-ordinary-diagnostic-preview.mjs').replace("import {execFileSync} from 'node:child_process';",`const execFileSync=(_cmd,args)=>args[0]==='rev-parse'?'${head}':'';`);
 const module=await dataImport(source);const root=fs.mkdtempSync(path.join(os.tmpdir(),'b-diag-admission-test-'));const dir=path.join(root,'data/rcap-grade-a/launch-control');fs.mkdirSync(dir,{recursive:true});
 const write=(name,mutate=()=>{})=>{const d=record(schemas[name]);mutate(d);fs.writeFileSync(path.join(dir,name+'.json'),JSON.stringify(d));};
 try{
  for(const name of Object.keys(schemas))write(name);
  const result=module.requireOrdinaryDiagnosticPreview(root,inputs);assert.equal(result.appOnlyDiagnostic,true);assert.equal(result.current,false);assert.equal(result.runtimeAccepted,false);assert.equal(result.workerDigest,null);
  for(const change of [{phase:'managed_start_preview'},{applicationSha:'9'.repeat(40)},{workerSourceSha:'3'.repeat(40)},{workerDigest:'sha256:'+'c'.repeat(64)},{workflowSourceSha:'4'.repeat(40)}])assert.throws(()=>module.requireOrdinaryDiagnosticPreview(root,{...inputs,...change}));
  for(const name of Object.keys(schemas))for(const mutate of [d=>d.runtimeAccepted=true,d=>d.workerRebuildRequired=false,d=>d.workerInputFingerprint='sha256:fake',d=>d.status='FORWARD_BOUND_HOSTED_PENDING',d=>d.productionAuthorized=true,d=>d.deploymentAuthorized=true,d=>d.hostedAdmission={},d=>d.extra=true,d=>d.toolsSha='4'.repeat(40),d=>d.supersededRecordSha256='bad']){write(name,mutate);assert.throws(()=>module.requireOrdinaryDiagnosticPreview(root,inputs));write(name);}
 }finally{fs.rmSync(root,{recursive:true});}
});
test('existing transport emits only HELD diagnostic metadata and refuses accepted worker claims; normal accepted binding remains required',async()=>{
 const transport=read('scripts/rcap-hosted-vercel-rest-transport.mjs');
 async function moduleFor(release){return dataImport(absoluteImports(transport.replace("const release = loadPreviewTransportIdentity(fileURLToPath(new URL('..', import.meta.url)));",'const release = '+JSON.stringify(release)+';'),scriptUrl));}
 const release={applicationSha:DIAGNOSTIC_APP,appOnlyDiagnostic:true,workerSourceSha:null,workerDigest:null,workerInputFingerprint:null};
 const m=await moduleFor(release);assert.deepEqual(m.PREVIEW_WORKER_METADATA,DIAGNOSTIC_WORKER_METADATA);
 const meta={...DIAGNOSTIC_WORKER_METADATA,rcapApplicationSha:DIAGNOSTIC_APP,rcapAcceptanceProjectRef:'hyflxnlhpmiqxvvcoiia',rcapPreviewPurpose:'managed_start',rcapReturnOrigin:'https://legalease-rcap-managed-b8b980c5b95b-roger947s-projects.vercel.app',rcapStripeConfigured:'false',rcapRouteState:'staging_scoped',rcapClinicDemoMode:'none',rcapStagingScopeSha256:'scope'};
 const opts={identity:{teamId:'team_K9irXvmYJ5W5ZTCE9FhlBRFK',projectId:'prj_cdgwGzFqIHgEUlzEburSLaZETdQV',projectName:'legalease-partner-dashboard-clean'},applicationSha:DIAGNOSTIC_APP,runtimeEnv:{SUPABASE_URL:'https://hyflxnlhpmiqxvvcoiia.supabase.co',NEXT_PUBLIC_SUPABASE_URL:'https://hyflxnlhpmiqxvvcoiia.supabase.co'},buildEnv:{NEXT_PUBLIC_SUPABASE_URL:'https://hyflxnlhpmiqxvvcoiia.supabase.co'},meta};
 // Use actual pinned provider identity; no provider request is made.
 const identity=await import('./rcap-hosted-acceptance-vercel-identity.mjs');opts.identity.teamId=identity.HOSTED_VERCEL_TEAM_ID;
 const request=m.createPreviewRequest(opts);assert.equal(request.gitSource.sha,DIAGNOSTIC_APP);assert.ok(!Object.keys(request.meta).some(k=>['rcapWorkerSourceSha','rcapWorkerDigest','rcapWorkerInputFingerprint'].includes(k)));
 const deployment={id:'dpl_Test',url:'example.vercel.app',target:null,projectId:opts.identity.projectId,gitSource:{sha:DIAGNOSTIC_APP},meta};assert.equal(m.assertPreviewResponse(deployment,meta).id,'dpl_Test');
 for(const key of ['rcapWorkerSourceSha','rcapWorkerDigest','rcapWorkerInputFingerprint']){assert.throws(()=>m.createPreviewRequest({...opts,meta:{...meta,[key]:'claimed'}}),/WORKER_CLAIM/);assert.throws(()=>m.assertPreviewResponse({...deployment,meta:{...meta,[key]:'claimed'}},meta),/WORKER_CLAIM/);}
 const normal=await moduleFor({...release,appOnlyDiagnostic:false,workerSourceSha:'accepted',workerDigest:'digest',workerInputFingerprint:'fingerprint'});assert.deepEqual(normal.PREVIEW_WORKER_METADATA,normal.FROZEN_WORKER_METADATA);assert.throws(()=>normal.createPreviewRequest(opts),/ACCEPTED_WORKER/);
});
test('diagnostic source successor selects unique identity, held metadata, and refuses accepted-worker release',async()=>{
 process.env.APPLICATION_SHA_INPUT=DIAGNOSTIC_APP;
 try{
  const m=await import('./rcap-managed-start-source-successor-contract.mjs?diagnostic-test');assert.equal(m.SOURCE_SUCCESSOR_APP,DIAGNOSTIC_APP);const meta=m.sourceSuccessorMetadata('https://'+m.SOURCE_SUCCESSOR_ALIAS);assert.equal(meta.rcapWorkerState,'HELD');assert.ok(!Object.hasOwn(meta,'rcapWorkerDigest'));assert.equal(meta.rcapSourcePredecessor,'dpl_DVC1stkcRAySuJ33KxnfqEcKPR1D');
  const env={...inputs,PHASE_INPUT:inputs.phase,GITHUB_ACTIONS:'true',GITHUB_EVENT_NAME:'workflow_dispatch',GITHUB_RUN_ATTEMPT:'1',GITHUB_REPOSITORY:'Roger-LegalEase/legalease-partner-dashboard-clean',GITHUB_REF_NAME:'codex/f-vercel-raw-readonly-20261026',GITHUB_SHA:head,GITHUB_WORKFLOW_SHA:head,RCAP_ADMITTED_CONTROLLER_SHA:head,APPLICATION_SHA_INPUT:DIAGNOSTIC_APP,TOOLS_SHA_INPUT:tools,WORKER_SOURCE_SHA_INPUT:'',WORKER_DIGEST_INPUT:'',ACCEPTANCE_SUPABASE_PROJECT_REF:'hyflxnlhpmiqxvvcoiia'};
  const release={applicationSha:DIAGNOSTIC_APP,toolsSha:tools,workerSourceSha:null,workerDigest:null,workerInputFingerprint:null,runtimeAccepted:false,workerRebuildRequired:true,appOnlyDiagnostic:true,current:false,previewOnly:true,productionAuthorized:false,deploymentAuthorized:false};m.assertSourceSuccessorRelease(release,env,head);assert.throws(()=>m.assertSourceSuccessorRelease({...release,runtimeAccepted:true},env,head));
 }finally{delete process.env.APPLICATION_SHA_INPUT;}
});
