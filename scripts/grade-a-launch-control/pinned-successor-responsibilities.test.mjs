import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {requirePreviewPreparation} from './require-preview-preparation.mjs';
import {acceptedPinnedRecords,writePinnedRecords,forwardPinnedRecords} from './prepare-pinned-worker-successor.mjs';
import {CANDIDATE,PENDING,TOOLS,PUBLICATION,verifyPinnedForwardBinding,verifyPinnedBinding,verifyPinnedSuccessor} from './verify-pinned-worker-successor.mjs';
import {verifyReleaseCandidateBinding,requireCurrentReleaseCandidate} from './verify-release-candidate-binding.mjs';
const applicationSha='7a8c6a4da102bfd9691a6260d7bb117829cf4019',sourceSha='b0b721470ea38455d8429c45300c9b3127bfe780',releaseBaseSha='9794f078553d8cd95aec47518ac773ee3e968fdc';
const controls=['prepare-pinned-worker-successor.mjs','verify-pinned-worker-successor.mjs','pinned-successor-responsibilities.mjs','require-preview-preparation.mjs'].map(p=>'scripts/grade-a-launch-control/'+p).concat('.github/workflows/rcap-hosted-acceptance-staging.yml','scripts/rcap-hosted-vercel-rest-transport.mjs','scripts/rcap-hosted-vercel-rest-transport.test.mjs','scripts/rcap-hosted-acceptance-preflight.test.mjs');
test('real full preparation binds history, reviewed range, native accepted image and runtime successor through Preview creation without authority',async()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-complete-preparation-'));
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:'pipe',maxBuffer:64*1024*1024}).trim();
 const read=p=>JSON.parse(fs.readFileSync(path.join(root,p)));
 const commit=message=>git(['-c','user.name=Synthetic Control Test','-c','user.email=synthetic@example.test','commit','--quiet','-m',message]);
 try{
  execFileSync('git',['clone','--quiet','--shared',process.cwd(),root],{stdio:'pipe'});git(['checkout','--quiet','--detach','b157e668ec95ad55b61da4d1a81ce2494940972f']);fs.symlinkSync(fs.realpathSync('node_modules'),path.join(root,'node_modules'));
  for(const rel of controls)fs.copyFileSync(rel,path.join(root,rel));
  git(['add','--',...controls]);commit('synthetic exact proposed release controls');let toolsSha=git(['rev-parse','HEAD']);
  const pub=read(PUBLICATION),receipt=read('hosted-acceptance-evidence/worker/acceptance-37630815977/verification-receipt.json');assert.equal(pub.immutableRegistryDigest,receipt.digest);assert.equal(pub.sourceSha,receipt.sourceSha);assert.equal(receipt.conclusion,'success');
  const records=acceptedPinnedRecords(root,{sourceSha,releaseBaseSha,toolsSha,sourceRangeBaseSha:releaseBaseSha,applicationSuccessorSha:applicationSha});
  const categories=records[TOOLS].successorInputs;assert.equal(categories.applicationSha,applicationSha);
  assert.equal(Object.keys(categories.runtimeFiles).length,13);assert.equal(Object.keys(categories.nativeFiles).length,9);
  for(const p of Object.keys(categories.nativeFiles))assert(Object.hasOwn(categories.runtimeFiles,p),'native evidence retains overlapping runtime checks');
  for(const p of Object.keys(records[TOOLS].successorTools.files))assert(!p.startsWith('data/')&&!p.startsWith('hosted-acceptance-evidence/'));
  const accepted=writePinnedRecords(root,records);assert.equal(accepted.bindingVerified,true);assert.equal(accepted.current,false);assert.equal(accepted.productionAuthorized,false);
  let refusals=0;
  const mutate=(rel,change)=>{const bytes=fs.readFileSync(path.join(root,rel));try{const record=JSON.parse(bytes);change(record);fs.writeFileSync(path.join(root,rel),JSON.stringify(record));assert.notEqual(verifyReleaseCandidateBinding(root,read(CANDIDATE)).bindingVerified,true);refusals++;}finally{fs.writeFileSync(path.join(root,rel),bytes);}};
  mutate(TOOLS,t=>delete t.successorInputs.runtimeFiles['data/rcap-grade-a/fulfillment-authority-registry.json']);
  mutate(TOOLS,t=>delete t.successorInputs.nativeFiles[Object.keys(t.successorInputs.nativeFiles)[0]]);
  mutate(TOOLS,t=>t.successorInputs.applicationSha=sourceSha);
  mutate(TOOLS,t=>t.successorInputs.executedControls['.github/workflows/publish-rcap-render-worker.yml'].workflowSourceSha=toolsSha);
  mutate(TOOLS,t=>t.successorInputs.executedControls['.github/workflows/publish-rcap-render-worker.yml'].files['scripts/verify-rcap-worker-tag-integrity.mjs']='0'.repeat(64));
  mutate(TOOLS,t=>t.successorTools.files['src/unreviewed.ts']='0'.repeat(64));
  mutate(PUBLICATION,e=>e.immutableRegistryDigest='sha256:'+'0'.repeat(64));
  mutate(PUBLICATION,e=>e.imageAcceptance.digest='sha256:'+'0'.repeat(64));
  mutate(CANDIDATE,c=>c.productionAuthorized=true);
  for(const rel of [Object.keys(categories.nativeFiles)[0],Object.keys(categories.runtimeFiles)[0],'scripts/grade-a-launch-control/prepare-pinned-worker-successor.mjs']){const bytes=fs.readFileSync(path.join(root,rel));try{fs.appendFileSync(path.join(root,rel),'\nchanged');assert.notEqual(verifyReleaseCandidateBinding(root,read(CANDIDATE)).bindingVerified,true);refusals++;}finally{fs.writeFileSync(path.join(root,rel),bytes);}}
  {const rel=Object.keys(categories.nativeFiles)[0],bytes=fs.readFileSync(path.join(root,rel));try{fs.unlinkSync(path.join(root,rel));assert.notEqual(verifyReleaseCandidateBinding(root,read(CANDIDATE)).bindingVerified,true);refusals++;}finally{fs.writeFileSync(path.join(root,rel),bytes);}}
  const unknown='data/rcap-grade-a/unbound-runtime.json';fs.writeFileSync(path.join(root,unknown),'{}');assert.notEqual(verifyReleaseCandidateBinding(root,read(CANDIDATE)).bindingVerified,true);fs.unlinkSync(path.join(root,unknown));refusals++;
  git(['add','--',PENDING,CANDIDATE,TOOLS]);commit('synthetic native accepted source binding held');const acceptedSha=git(['rev-parse','HEAD']);
  // Model this checkpoint: accepted source custody precedes the final Preview
  // control freeze. That freeze is distinct from the later evidence head.
  fs.appendFileSync(path.join(root,'scripts/grade-a-launch-control/require-preview-preparation.mjs'),'\n// Synthetic final Preview control freeze.\n');git(['add','--','scripts/grade-a-launch-control/require-preview-preparation.mjs']);commit('synthetic final Preview controls');toolsSha=git(['rev-parse','HEAD']);
  const forward=forwardPinnedRecords(root,{applicationSha,releaseBaseSha:acceptedSha,toolsSha});for(const [p,r]of Object.entries(forward))fs.writeFileSync(path.join(root,p),JSON.stringify(r,null,2)+'\n');
  git(['add','--',PENDING,CANDIDATE,TOOLS]);commit('synthetic HELD runtime successor evidence head');
  const held=verifyPinnedForwardBinding(root,read(CANDIDATE));assert.equal(held.bindingVerified,true,JSON.stringify(held));assert.equal(held.current,false);assert.equal(held.productionAuthorized,false);assert.equal(held.applicationSha,applicationSha);assert.equal(held.workerSourceSha,sourceSha);assert.equal(held.workerDigest,receipt.digest);assert.equal(held.status,'FORWARD_BOUND_HOSTED_PENDING');assert.throws(()=>requireCurrentReleaseCandidate(root));
  const inputs={phase:'replace_preview',applicationSha,workerSourceSha:sourceSha,workerDigest:receipt.digest,toolsSha,workflowSourceSha:git(['rev-parse','HEAD'])};
  const preview=requirePreviewPreparation(root,inputs);assert.equal(preview.previewOnly,true);assert.equal(preview.productionAuthorized,false);assert.equal(preview.current,false);
  for(const key of ['applicationSha','workerSourceSha','workerDigest','toolsSha'])assert.throws(()=>requirePreviewPreparation(root,{...inputs,[key]:'wrong'}));
  for(const phase of ['full','accept','payment','production_activate','publication','worker_claim','aliases','domains'])assert.throws(()=>requirePreviewPreparation(root,{...inputs,phase}));
  for(const [key,value]of [['deploymentAuthorized',true],['productionAuthorization',{}],['hostedAdmission',{}],['runtimeAccepted',false],['workerRebuildRequired',true],['status','CURRENT'],['publicationAuthorized',true],['paymentAuthorized',true],['workerClaimsAuthorized',true]]){const before=fs.readFileSync(path.join(root,CANDIDATE));try{const c=read(CANDIDATE);c[key]=value;fs.writeFileSync(path.join(root,CANDIDATE),JSON.stringify(c));assert.throws(()=>requirePreviewPreparation(root,inputs),key);}finally{fs.writeFileSync(path.join(root,CANDIDATE),before);}}
  for(const rel of [git(['ls-files','src']).split('\n')[0],'scripts/rcap-render-worker.mjs']){const before=fs.readFileSync(path.join(root,rel));try{fs.appendFileSync(path.join(root,rel),'\nstale input');assert.throws(()=>requirePreviewPreparation(root,inputs),rel);}finally{fs.writeFileSync(path.join(root,rel),before);}}
  const transport=await import(pathToFileURL(path.join(root,'scripts/rcap-hosted-vercel-rest-transport.mjs')).href);
  const identity=await import(pathToFileURL(path.join(root,'scripts/rcap-hosted-acceptance-vercel-identity.mjs')).href);
  assert.equal(transport.FROZEN_APPLICATION_SHA,applicationSha);assert.equal(transport.FROZEN_WORKER_METADATA.rcapWorkerDigest,receipt.digest);
  const meta={...transport.FROZEN_WORKER_METADATA,rcapApplicationSha:applicationSha,rcapAcceptanceProjectRef:'hyflxnlhpmiqxvvcoiia',rcapReturnOrigin:identity.expectedHostedReturnOrigin(applicationSha),rcapStripeConfigured:'false',rcapRouteState:'disabled',rcapClinicDemoMode:'none',rcapStagingScopeSha256:'0'.repeat(64)};
  const options={identity:{teamId:identity.HOSTED_VERCEL_TEAM_ID,projectId:identity.HOSTED_VERCEL_PROJECT_ID,projectName:identity.HOSTED_VERCEL_PROJECT_NAME},applicationSha,token:'synthetic-preview-only-token',runtimeEnv:{SUPABASE_URL:'https://hyflxnlhpmiqxvvcoiia.supabase.co',NEXT_PUBLIC_SUPABASE_URL:'https://hyflxnlhpmiqxvvcoiia.supabase.co'},buildEnv:{NEXT_PUBLIC_SUPABASE_URL:'https://hyflxnlhpmiqxvvcoiia.supabase.co'},meta};
  const calls=[];const created=await transport.createRestPreview(options,{fetchImpl:async(url,init)=>{calls.push({url,init});return {ok:true,status:200,json:async()=>({id:'dpl_SyntheticHeldPreview',url:'synthetic-held.vercel.app',target:null,readyState:'READY',projectId:identity.HOSTED_VERCEL_PROJECT_ID,gitSource:{sha:applicationSha},meta})}}});
  assert.equal(calls.length,1);const body=JSON.parse(calls[0].init.body);assert.equal(body.gitSource.sha,applicationSha);assert.equal(body.meta.rcapWorkerDigest,receipt.digest);assert.equal(body.target,undefined);assert.equal(body.alias,undefined);assert.equal(body.customEnvironmentSlugOrId,undefined);assert.equal(created.target,null);
  for(const key of ['rcapApplicationSha','rcapWorkerSourceSha','rcapWorkerDigest'])assert.throws(()=>transport.assertPreviewResponse({id:created.id,url:'synthetic-held.vercel.app',target:null,projectId:identity.HOSTED_VERCEL_PROJECT_ID,gitSource:{sha:applicationSha},meta:{...meta,[key]:'wrong'}},meta));
  assert.throws(()=>requireCurrentReleaseCandidate(root),'Preview readback alone is not admission');
  const childEnv={...process.env};delete childEnv.NODE_TEST_CONTEXT;
  const hostedTests=execFileSync(process.execPath,['--test','--test-isolation=none','scripts/rcap-hosted-acceptance-preflight.test.mjs','scripts/rcap-hosted-acceptance-redaction.test.mjs'],{cwd:root,env:childEnv,encoding:'utf8',maxBuffer:8*1024*1024});
  assert.match(hostedTests,/(?:#|ℹ) tests [1-9][0-9]*/);assert.match(hostedTests,/(?:#|ℹ) fail 0/);assert.doesNotMatch(hostedTests,/skipping running files/);
  console.log(hostedTests);
  // Synthetic complete native admission exercises the unchanged CURRENT gate.
  // A Preview creation receipt alone never asserts these additional results.
  const prefix='hosted-acceptance-evidence/successor-closure/synthetic-held-preview/';fs.mkdirSync(path.join(root,prefix),{recursive:true});
  const h={schemaVersion:'rcap-readonly-successor-admission/v1',...Object.fromEntries(['applicationSha','workerSourceSha','workerDigest','workerInputFingerprint','toolsSha'].map(k=>[k,held[k]])),capturedAt:new Date().toISOString(),workflowSourceSha:inputs.workflowSourceSha,runId:111,jobId:222,artifactId:333,deploymentId:'dpl_SyntheticStaged',productionRollback:'dpl_3j4Dr4GHyXmwmrFCTZ6orNNNP7sc',productionAliasesUnchanged:true,autoAssignCustomDomains:false,sharedHostRoutingMethod:'frozen-proxy-map-and-staged-targets',workerRollbackVerified:true,signupVerified:true,sharedHostRoutingVerified:true,productionWrites:false,target:'production',readyState:'READY',liveAuthCalls:0,productionAuthorized:false};
  const admission=path.join(root,prefix,'admission.json'),rollback=path.join(root,prefix,'worker-rollback.json'),archive=path.join(root,prefix,'native.zip');fs.writeFileSync(admission,JSON.stringify(h));fs.writeFileSync(rollback,JSON.stringify({passed:true}));execFileSync('zip',['-q',archive,'admission.json','worker-rollback.json'],{cwd:path.join(root,prefix)});
  const docs={run:{id:h.runId,head_sha:h.workflowSourceSha,path:'.github/workflows/rcap-f1-ephemeral-staging.yml',conclusion:'success',status:'completed',repository:{full_name:'Roger-LegalEase/legalease-partner-dashboard-clean'},event:'workflow_dispatch',run_attempt:1},jobs:{jobs:[{id:h.jobId,run_id:h.runId,status:'completed',conclusion:'success',steps:['Install frozen dependencies','Install browser for mocked signup only','Verify exact forward controls before provider credentials','Stage exact application without aliases and read worker rollback','Upload non-production closure evidence'].map(name=>({name,conclusion:'success'}))}]},artifact:{id:h.artifactId,workflow_run:{id:h.runId,head_sha:h.workflowSourceSha},digest:'sha256:'+createHash('sha256').update(fs.readFileSync(archive)).digest('hex')}};
  for(const [name,doc]of Object.entries(docs))fs.writeFileSync(path.join(root,prefix,name+'.json'),JSON.stringify(doc));
  const hosted={...h,receipt:h,runPath:prefix+'run.json',jobsPath:prefix+'jobs.json',artifactPath:prefix+'artifact.json',receiptPath:prefix+'admission.json',archivePath:prefix+'native.zip',files:['run.json','jobs.json','artifact.json','admission.json','worker-rollback.json','native.zip'].map(name=>{const bytes=fs.readFileSync(path.join(root,prefix,name));return {path:prefix+name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')}})};
  for(const p of [PENDING,CANDIDATE,TOOLS]){const c=read(p);c.hostedAdmission=hosted;fs.writeFileSync(path.join(root,p),JSON.stringify(c));}
  const current=verifyReleaseCandidateBinding(root,read(CANDIDATE));assert.equal(current.current,true,JSON.stringify(current));assert.equal(current.productionAuthorized,false);assert.equal(requireCurrentReleaseCandidate(root).applicationSha,applicationSha);assert.throws(()=>requirePreviewPreparation(root,inputs),'CURRENT is not a reusable HELD grant');
  for(const [key,value]of [['applicationSha','0'.repeat(40)],['workerSourceSha','0'.repeat(40)],['workerDigest','sha256:'+'0'.repeat(64)],['toolsSha','0'.repeat(40)],['capturedAt',new Date(Date.now()-86400001).toISOString()]]){const c=read(CANDIDATE);c.hostedAdmission[key]=value;assert.equal(verifyReleaseCandidateBinding(root,c).current,false,key);}
  console.log(JSON.stringify({fullPreparation:'PASS',applicationSha,workerSourceSha:sourceSha,workerDigest:receipt.digest,heldStatus:held.status,productionAuthorized:false,mutationRefusals:refusals,rebuildRequired:false}));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
