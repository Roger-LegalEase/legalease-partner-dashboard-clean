import {AUTHORIZED_FORWARD,verifyForwardProductionSuccessor} from './verify-forward-production-successor.mjs';
// Explicit source pins extend the existing successor lifecycle. Historical
// generations continue through their original validators, at their own revision.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {applicationInputEquivalence,applicationInputManifest} from '../rcap-application-inputs.mjs';
import {createWorkerInputPlan} from '../rcap-hosted-acceptance-worker-input-plan.mjs';

export const PENDING='data/rcap-grade-a/launch-control/PENDING_WORKER_SUCCESSOR.json';
export const PUBLICATION='data/rcap-render/worker-publication-evidence.json';
export const CANDIDATE='data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json';
export const TOOLS='data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json';
const hash=b=>createHash('sha256').update(b).digest('hex');
const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:'pipe',maxBuffer:64*1024*1024}).trim();
const at=(root,sha,rel)=>JSON.parse(git(root,['show',`${sha}:${rel}`]));
const read=(root,rel)=>JSON.parse(fs.readFileSync(path.join(root,rel)));
const validSha=s=>assert.match(s,/^[a-f0-9]{40}$/);
const validDigest=s=>assert.match(s,/^sha256:[a-f0-9]{64}$/);
const predecessorCache=new Set();

export function assertCommittedPredecessor(root,base){
 validSha(base);
 const key=git(root,['rev-parse','--git-common-dir'])+base;
 if(predecessorCache.has(key))return;
 // Never validate an old record against the new source/worktree. Use the
 // committed validator and evidence from its own clean historical snapshot.
 const snapshot=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-predecessor-'));
 try{
  execFileSync('git',['clone','--quiet','--shared','--no-checkout',root,snapshot],{stdio:'pipe'});
  git(snapshot,['checkout','--quiet','--detach',base]);
  const dependencies=path.join(root,'node_modules');
  if(fs.existsSync(dependencies))fs.symlinkSync(fs.realpathSync(dependencies),path.join(snapshot,'node_modules'));
  const code="import fs from 'node:fs';import {verifyReleaseCandidateBinding} from './scripts/grade-a-launch-control/verify-release-candidate-binding.mjs';const r=verifyReleaseCandidateBinding(process.cwd(),JSON.parse(fs.readFileSync('data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json')));if(!r.current||r.status!=='CURRENT')throw Error(JSON.stringify(r));console.log('HISTORICAL_PREDECESSOR_VALID');";
  const output=execFileSync(process.execPath,['--input-type=module','-e',code],{cwd:snapshot,encoding:'utf8',stdio:'pipe',maxBuffer:4*1024*1024});
  assert(output.includes('HISTORICAL_PREDECESSOR_VALID'),'historical predecessor validation');
  predecessorCache.add(key);
 }finally{fs.rmSync(snapshot,{recursive:true,force:true});}
}

function native(root,ref){
 assert(ref&&typeof ref.path==='string','native evidence required');
 assert(ref.path.startsWith('hosted-acceptance-evidence/worker/')&&!ref.path.split('/').includes('..'),'scoped native evidence');
 const bytes=fs.readFileSync(path.join(root,ref.path));
 assert.equal(bytes.length,ref.bytes);assert.equal(hash(bytes),ref.sha256,ref.path);return bytes;
}
function held(record){
 assert.equal(record.productionAuthorized,false,'new generation has no production authority');
 assert.equal(record.previewExecution,'held');assert.equal(record.resume,null);
 for(const flag of ['migrationReplayAuthorized','housekeepingReplayAuthorized','additionalWorkerPublicationAuthorized','imageAcceptanceRerunAuthorized','hostedFullReady','deploymentAuthorized','clinicDispatchReady'])if(flag in record)assert.equal(record[flag],false,flag);
 if(record.previewExecutionInstruction)assert.equal(record.previewExecutionInstruction.executionAuthorized,false);
 if('productionAuthorization' in record)assert.equal(record.productionAuthorization,null);
}
function sourcePlan(root,p){
 assert.equal(p.schemaVersion,'rcap-pending-worker-successor/v1');
 validSha(p.releaseBaseSha);validSha(p.sourceCommit);validSha(p.parent);
 assert.equal(p.applicationSource,'pinned-source');assert.equal(p.workerSource,'sourceCommit');
 assert.equal(p.applicationSha,p.sourceCommit);assert.equal(p.workerSourceSha,p.sourceCommit);
 git(root,['merge-base','--is-ancestor',p.releaseBaseSha,'HEAD']);
 git(root,['merge-base','--is-ancestor',p.sourceCommit,'HEAD']);
 assert.equal(git(root,['rev-list','--parents','-n','1',p.sourceCommit]),`${p.sourceCommit} ${p.parent}`,'exact sole source parent');
 assert.deepEqual(p.supersededRecord,at(root,p.releaseBaseSha,PENDING),'entire committed predecessor');
 assert.equal(p.supersededRecordSha256,hash(execFileSync('git',['show',`${p.releaseBaseSha}:${PENDING}`],{cwd:root})));
 assertCommittedPredecessor(root,p.releaseBaseSha);
 const previous=at(root,p.releaseBaseSha,PUBLICATION);
 assert.deepEqual(p.historicalWorker,{sourceSha:previous.sourceSha,digest:previous.immutableRegistryDigest,fingerprint:previous.workerInputFingerprint});
 const plan=createWorkerInputPlan({rootDir:root,acceptedSourceSha:previous.sourceSha,acceptedDigest:previous.immutableRegistryDigest,candidateSha:p.sourceCommit});
 assert.equal(plan.rebuildRequired,true);assert.deepEqual(plan.missingCanonicalInputs,[]);
 assert.equal(p.workerInputFingerprint,plan.aggregateInputSha256);
 assert.deepEqual(p.canonicalWorkerInputs,plan.canonicalInputs);
 const changed=git(root,['diff','--name-only',previous.sourceSha,p.sourceCommit,'--',...plan.canonicalInputs]).split('\n').filter(Boolean).sort();
 assert.deepEqual(p.workerChangedPaths,changed);
 const reviewed=git(root,['diff','--name-only',p.parent,p.sourceCommit]).split('\n').filter(Boolean).sort();
 assert.deepEqual(Object.keys(p.files).sort(),reviewed,'complete reviewed source delta');
 for(const [rel,digest]of Object.entries(p.files))assert.equal(hash(execFileSync('git',['show',`${p.sourceCommit}:${rel}`],{cwd:root})),digest,rel);
 assert.equal(git(root,['diff','--name-only',p.sourceCommit,'HEAD','--',...plan.canonicalInputs]),'','control history cannot change worker inputs');
 assert.equal(git(root,['diff','--name-only',p.sourceCommit,'--',...plan.canonicalInputs]),'','working worker inputs unchanged');
 assert.equal(git(root,['ls-files','--others','--exclude-standard','--',...plan.canonicalInputs]),'','no untracked worker inputs');
 held(p);return plan;
}
function runEvidence(root,e,workflowPath,runName,reviewed=read(root,TOOLS)){
 const run=JSON.parse(native(root,e.nativeRunMetadata));
 const jobs=JSON.parse(native(root,e.nativeJobMetadata));
 const log=native(root,e.nativeLog).toString();
 assert.equal(run.id,e.runId??e.workflowRunId);assert.equal(run.head_sha,e.workflowSourceSha);
 assert.equal(run.run_attempt,e.runAttempt??e.workflowRunAttempt);assert.equal(run.name,runName);
 assert.equal(run.path,workflowPath);assert.equal(run.event,'workflow_dispatch');
 assert.equal(run.repository.full_name.toLowerCase(),'roger-legalease/legalease-partner-dashboard-clean');
 assert.equal(run.status,'completed');assert.equal(run.conclusion,'success');
 const job=(jobs.jobs??[jobs]).find(j=>j.id===e.jobId);assert(job,'exact native job');
 assert.equal(job.run_id,run.id);assert.equal(job.status,'completed');assert.equal(job.conclusion,'success');
 assert(job.steps.every(s=>s.status==='completed'&&s.conclusion==='success'),'all native steps, including checkout/setup, must succeed');
 validSha(reviewed.toolsSha);
 const workflowInputs=[workflowPath,...Object.keys(reviewed.successorTools.files).filter(f=>f.startsWith('scripts/')&& !f.endsWith('.test.mjs')),
  'scripts/verify-rcap-worker-tag-integrity.mjs','scripts/verify-rcap-worker-source-binding-exception.mjs','scripts/verify-rcap-worker-image-revision.mjs'];
 for(const rel of new Set(workflowInputs))assert.equal(git(root,['rev-parse',`${e.workflowSourceSha}:${rel}`]),git(root,['rev-parse',`${reviewed.toolsSha}:${rel}`]),`executed reviewed control ${rel}`);
 const workflow=git(root,['show',`${e.workflowSourceSha}:${workflowPath}`]);
 const required=[...workflow.matchAll(/^\s+- name: (.+)$/gm)].map(m=>m[1]);
 assert(required.length>0);
 for(const name of required){const step=job.steps.find(s=>s.name===name);assert(step,`missing native step ${name}`);assert.equal(step.status,'completed');assert.equal(step.conclusion,'success',name);}
 return {run,job,log};
}
function publication(root,p,reviewed=read(root,TOOLS)){
 const e=read(root,PUBLICATION),prior=at(root,p.releaseBaseSha,PUBLICATION);
 assert.deepEqual(e.supersededPublication,prior,'full publication predecessor preserved');
 assert.deepEqual(e.supersededChain,prior.supersededChain,'retired source-binding anchors preserved');
 assert.equal(e.sourceSha,p.sourceCommit);assert.equal(e.imageTag,p.sourceCommit);validDigest(e.immutableRegistryDigest);
 assert.equal(e.workerInputFingerprint,p.workerInputFingerprint);
 assert.equal(e.imageRepository,'ghcr.io/roger-legalease/rcap-render-worker');
 assert.equal(e.imageReference,`${e.imageRepository}:${e.sourceSha}`);
 assert.equal(e.digestPinnedReference,`${e.imageRepository}@${e.immutableRegistryDigest}`);
 validSha(e.workflowSourceSha);git(root,['merge-base','--is-ancestor',e.workflowSourceSha,'HEAD']);
 git(root,['merge-base','--is-ancestor',e.sourceSha,e.workflowSourceSha]);
 assert.equal(e.containedIn,'captain-release');assert.equal(e.releaseIntegrationBranch,'captain-release');assert.equal(e.canonicalIntegrationBranch,'main');
 assert.equal(e.requestedIntegrationSha,p.sourceCommit);assert.equal(e.tagReplacementAuthorization,'');
 // The publication guard runs after the pinned-source checkout. Its actual
 // source bytes must be the same reviewed guard, not merely the tools copy.
 assert.equal(git(root,['rev-parse',`${e.sourceSha}:scripts/verify-rcap-worker-tag-integrity.mjs`]),git(root,['rev-parse',`${reviewed.toolsSha}:scripts/verify-rcap-worker-tag-integrity.mjs`]),'pinned build tag guard is reviewed');
 for(const [k,v]of Object.entries({publishOnlyNoDeploy:true,mutableLatestTagCreated:false,workerClaimingStarted:false,stagingAndProductionUnchanged:true,workflowConclusion:'success'}))assert.equal(e[k],v,k);
 const bytes=native(root,{path:e.originalPublicationPath,bytes:e.originalPublicationBytes,sha256:e.originalPublicationSha256});
 const artifact=JSON.parse(bytes);
 for(const [key,value]of Object.entries(artifact))assert.deepEqual(e[key],key==='workflowRunId'?Number(value):value,`native publication ${key}`);
 assert.equal(artifact.workflowSourceSha,e.workflowSourceSha);assert.equal(artifact.requestedIntegrationSha,p.sourceCommit);assert.equal(artifact.tagReplacementAuthorization,'');
 assert.equal(e.publicationArtifactName,`rcap-render-worker-publication-${p.sourceCommit}`);assert(Number.isSafeInteger(e.publicationArtifactId)&&e.publicationArtifactId>0);
 const archive=native(root,e.nativeArchive);assert.equal(e.originalArchivePath,e.nativeArchive.path);
 assert.equal(e.publicationArtifactSha256,'sha256:'+hash(archive));
 assert.equal(execFileSync('unzip',['-p',path.join(root,e.originalArchivePath),'rcap-render-worker-publication.json']).toString(),bytes.toString(),'downloaded archive is actual native artifact');
 const evidence=runEvidence(root,e,'.github/workflows/publish-rcap-render-worker.yml','Publish RCAP render worker',reviewed);
 assert(evidence.log.includes(e.sourceSha)&&evidence.log.includes(e.immutableRegistryDigest),'native build subject');
 assert.equal(e.dockerfilePath,'deploy/rcap-render-worker/Dockerfile');
 for(const [rel,digest]of [[e.dockerfilePath,e.dockerfileSha256],['package-lock.json',e.lockfileSha256]])assert.equal(hash(execFileSync('git',['show',`${p.sourceCommit}:${rel}`],{cwd:root})),digest,rel);
 assert.equal(typeof e.runtimeAccepted,'boolean');
 if(e.runtimeAccepted)acceptance(root,e,reviewed);else assert.equal(e.imageAcceptance,undefined,'unaccepted image cannot inherit acceptance');
 return e;
}
function acceptance(root,e,reviewed=read(root,TOOLS)){
 const a=e.imageAcceptance;assert(a,'actual image acceptance required');
 for(const [k,v]of Object.entries({sourceSha:e.sourceSha,tag:e.imageTag,digest:e.immutableRegistryDigest,readOnly:true,conclusion:'success'}))assert.equal(a[k],v,`acceptance ${k}`);
 validSha(a.workflowSourceSha);git(root,['merge-base','--is-ancestor',a.workflowSourceSha,'HEAD']);
 const prior=at(root,a.workflowSourceSha,PUBLICATION);
 assert.equal(prior.sourceSha,e.sourceSha);assert.equal(prior.immutableRegistryDigest,e.immutableRegistryDigest);assert.equal(prior.runtimeAccepted,false);
 assert.deepEqual(prior.supersededPublication,e.supersededPublication,'acceptance predecessor preserved');
 const {log}=runEvidence(root,a,'.github/workflows/rcap-worker-image-acceptance.yml','RCAP worker image acceptance',reviewed);
 for(const marker of [`accepting ${e.digestPinnedReference} built from ${e.sourceSha}`,`tag currently resolves to: ${e.immutableRegistryDigest}`,'anonymous token refused with HTTP 401','SOURCE BINDING: PASS','OCI REVISION: PRESENT','config env matches: 0','layer history matches: 0','acceptance is read-only: no push, no deploy, no claim'])assert(log.includes(marker),marker);
 const receipt=JSON.parse(native(root,a.verificationReceipt));
 for(const [k,v]of Object.entries({runId:a.runId,jobId:a.jobId,workflowSourceSha:a.workflowSourceSha,sourceSha:e.sourceSha,digest:e.immutableRegistryDigest,readOnly:true,conclusion:'success'}))assert.equal(receipt[k],v,`receipt ${k}`);
}
export function verifyPinnedPublication(root){
 try{const p=read(root,PENDING);if(p.applicationSource===AUTHORIZED_FORWARD){const bound=verifyForwardProductionSuccessor(root,read(root,CANDIDATE));assert(bound.current,bound.reasons.join('; '));return {current:true,sourceSha:bound.workerSourceSha,workerDigest:bound.workerDigest,workerInputFingerprint:bound.workerInputFingerprint,runtimeAccepted:true,reasons:[]};}if(p.applicationSource==='pinned-source-forward'){const bound=verifyPinnedForwardBinding(root,read(root,CANDIDATE));assert(bound.bindingVerified,bound.reasons.join('; '));return {current:true,sourceSha:bound.workerSourceSha,workerDigest:bound.workerDigest,workerInputFingerprint:bound.workerInputFingerprint,runtimeAccepted:true,reasons:[]};}sourcePlan(root,p);assert.notEqual(p.publication,'pending','publication absent');const e=publication(root,p);return {current:true,sourceSha:e.sourceSha,workerDigest:e.immutableRegistryDigest,workerInputFingerprint:e.workerInputFingerprint,runtimeAccepted:e.runtimeAccepted,reasons:[]};}
 catch(error){return {current:false,reasons:[error.message]};}
}
export function verifyPinnedSuccessor(root,p=read(root,PENDING)){
 try{
  sourcePlan(root,p);
  const accepted=p.status==='SUCCESSOR_ACCEPTED_PREVIEW_AND_RESUME_PENDING',published=accepted||p.status==='AWAITING_WORKER_ACCEPTANCE';
  assert(['AWAITING_WORKER_PUBLICATION','AWAITING_WORKER_ACCEPTANCE','SUCCESSOR_ACCEPTED_PREVIEW_AND_RESUME_PENDING'].includes(p.status));
  assert.equal(p.publication,published?'complete':'pending');assert.equal(p.acceptance,accepted?'complete':'pending');
  assert.equal(p.runtimeAccepted,accepted);assert.equal(p.workerRebuildRequired,!published);
  if(published){const e=publication(root,p);assert.equal(e.runtimeAccepted,accepted);assert.equal(p.workerDigest,e.immutableRegistryDigest);}
  else {assert.equal(p.workerDigest,null);assert.deepEqual(read(root,PUBLICATION),at(root,p.releaseBaseSha,PUBLICATION),'awaiting publication retains predecessor only');}
  return {current:accepted,applicationSource:'pinned-source',status:p.status,applicationSha:p.applicationSha,workerSourceSha:p.workerSourceSha,workerDigest:p.workerDigest,workerInputFingerprint:p.workerInputFingerprint,runtimeAccepted:accepted,workerRebuildRequired:!published,releaseBaseSha:p.releaseBaseSha,previewExecution:'held',productionAuthorized:false,reasons:accepted?[]:['Publication and actual image acceptance are separate gates; all execution remains held.']};
 }catch(error){return {current:false,applicationSource:'pinned-source',status:'INVALID_PENDING_PUBLICATION',reasons:[error.message]};}
}

export function verifyPinnedBinding(root,candidate,pending){
 try{
  assert.notEqual(pending.status,'INVALID_PENDING_PUBLICATION',pending.reasons.join('; '));
  const p=read(root,PENDING),tools=read(root,TOOLS),base=p.releaseBaseSha;
  for(const record of [candidate,tools]){
   held(record);
   assert.equal(record.status,p.status);assert.equal(record.productionAuthorization,null);
   assert.equal(record.deploymentAuthorized,false);assert.equal(record.clinicDispatchReady,false);
   assert.equal(record.runtimeAccepted,p.runtimeAccepted);
   for(const key of ['applicationSha','workerSourceSha','workerDigest','workerInputFingerprint'])assert.equal(record[key],p[key],key);
  }
  assert.deepEqual(candidate.supersededRecord,at(root,base,CANDIDATE));assert.deepEqual(tools.supersededRecord,at(root,base,TOOLS));
  validSha(tools.toolsSha);assert.equal(candidate.toolsSha,tools.toolsSha);
  git(root,['merge-base','--is-ancestor',tools.toolsSha,'HEAD']);git(root,['merge-base','--is-ancestor',p.sourceCommit,tools.toolsSha]);
  const manifest=tools.successorTools;assert.equal(manifest.schemaVersion,'rcap-successor-resume-tools/v1');assert.equal(manifest.baseSha,base);
  const controlDelta=git(root,['diff','--name-only',base,tools.toolsSha]).split('\n').filter(Boolean);
  assert.deepEqual(Object.keys(manifest.files).sort(),controlDelta.filter(f=>!Object.keys(p.files).includes(f)).sort(),'entire control delta bound');
  for(const [rel,digest]of Object.entries(manifest.files)){
   assert(/^(scripts\/grade-a-launch-control\/|\.github\/workflows\/|scripts\/rcap-worker-identity)/.test(rel),'bounded control paths');
   assert.equal(hash(execFileSync('git',['show',`${tools.toolsSha}:${rel}`],{cwd:root})),digest,rel);
   assert.equal(hash(fs.readFileSync(path.join(root,rel))),digest,'working control bytes');
  }
  const allowed=new Set([PENDING,PUBLICATION,CANDIDATE,TOOLS,...Object.keys(manifest.files)]);
  const pub=p.publication==='complete'?read(root,PUBLICATION):null;
  if(pub){for(const ref of [pub.nativeArchive,pub.nativeRunMetadata,pub.nativeJobMetadata,pub.nativeLog,{path:pub.originalPublicationPath},...Object.values(pub.imageAcceptance??{}).filter(v=>v?.path)])allowed.add(ref.path);}
  const changes=git(root,['diff','--name-only',tools.toolsSha]).split('\n').filter(Boolean);
  const untracked=git(root,['ls-files','--others','--exclude-standard']).split('\n').filter(Boolean);
  assert([...changes,...untracked].every(f=>allowed.has(f)),'unbound post-tools changes');
  if(pub){assert.deepEqual(candidate.publication,{runId:pub.workflowRunId,workflowSourceSha:pub.workflowSourceSha,artifactId:pub.publicationArtifactId,digest:pub.immutableRegistryDigest});}
  else assert.equal(candidate.publication,null);
  if(p.runtimeAccepted)assert.deepEqual(candidate.readOnlyImageAcceptance,{runId:pub.imageAcceptance.runId,jobId:pub.imageAcceptance.jobId,workflowSourceSha:pub.imageAcceptance.workflowSourceSha,digest:pub.immutableRegistryDigest});
  else assert.equal(candidate.readOnlyImageAcceptance,null);
  // Acceptance alone does not admit hosted dispatch. The existing hosted and
  // authorization stages must still be completed by a separately reviewed record.
  return {...pending,current:false,bindingVerified:true,status:p.status,toolsSha:tools.toolsSha,reasons:['Exact successor tuple is held; application/runtime publication compatibility, hosted acceptance and fresh scoped authorization are not granted by image acceptance.']};
 }catch(error){return {current:false,status:'INVALID_PINNED_BINDING',reasons:[error.message]};}
}

// Evidence-only application successors retain the accepted worker and native
// publication/acceptance identities. This stage never inherits activation.
export function assertForwardTuple(record, expected) {
 held(record);
 for(const key of ['applicationSha','workerSourceSha','workerDigest','workerInputFingerprint','toolsSha'])assert.equal(record[key],expected[key],`forward ${key}`);
 assert.deepEqual(record.publication,expected.publication,'actual publication workflow identity');
 assert.deepEqual(record.readOnlyImageAcceptance,expected.readOnlyImageAcceptance,'actual acceptance workflow identity');
 assert.equal(record.productionAuthorized,false,'forward successor cannot authorize production');
 assert.equal(record.productionAuthorization,null,'old production authorization cannot follow');
 assert.equal(record.deploymentAuthorized,false);assert.equal(record.clinicDispatchReady,false);
 assert.equal(record.runtimeAccepted,true);assert.equal(record.workerRebuildRequired,false);
 assert.equal(record.resume,null);assert.equal(record.previewExecution,'held');
}
export function verifyPinnedForwardBinding(root,candidate) {
 try {
  const p=read(root,PENDING),tools=read(root,TOOLS);
  assert.equal(p.applicationSource,'pinned-source-forward');
  validSha(p.releaseBaseSha);validSha(p.applicationSha);validSha(p.toolsSha);
  const prior=at(root,p.releaseBaseSha,PENDING);
  assert.equal(prior.applicationSource,'pinned-source');assert.equal(prior.runtimeAccepted,true);
  assert.deepEqual(p.supersededRecord,prior,'accepted pending history preserved');
  sourcePlan(root,prior);
  const e=publication(root,prior,at(root,p.releaseBaseSha,TOOLS));assert.equal(e.runtimeAccepted,true);
  assert.deepEqual(e,at(root,p.releaseBaseSha,PUBLICATION),'accepted worker evidence remains immutable');
  const expected={applicationSha:p.applicationSha,workerSourceSha:prior.workerSourceSha,
   workerDigest:prior.workerDigest,workerInputFingerprint:prior.workerInputFingerprint,toolsSha:p.toolsSha,
   publication:at(root,p.releaseBaseSha,CANDIDATE).publication,
   readOnlyImageAcceptance:at(root,p.releaseBaseSha,CANDIDATE).readOnlyImageAcceptance};
  for(const [rel,record]of [[PENDING,p],[CANDIDATE,candidate],[TOOLS,tools]]) {
   assertForwardTuple(record,expected);
   assert.deepEqual(record.supersededRecord,at(root,p.releaseBaseSha,rel),'complete forward predecessor');
   assert.equal(record.supersededRecordSha256,hash(execFileSync('git',['show',`${p.releaseBaseSha}:${rel}`],{cwd:root})),'forward predecessor byte hash');
  }
  git(root,['merge-base','--is-ancestor',p.applicationSha,p.toolsSha]);git(root,['merge-base','--is-ancestor',p.toolsSha,'HEAD']);
  assert(applicationInputEquivalence(root,p.applicationSha,'HEAD').equivalent,'current application inputs match frozen successor');
  const runtime=new Set(applicationInputManifest(root,p.applicationSha).files.map(f=>f.path));
  assert(git(root,['diff','--name-only',p.applicationSha]).split('\n').every(f=>!runtime.has(f)),'working application inputs remain frozen');
  const plan=createWorkerInputPlan({rootDir:root,candidateSha:p.applicationSha,acceptedSourceSha:prior.workerSourceSha,acceptedDigest:prior.workerDigest});
  assert.equal(plan.rebuildRequired,false);assert.deepEqual(plan.missingCanonicalInputs,[]);assert.equal(plan.aggregateInputSha256,prior.workerInputFingerprint);
  const manifest=tools.successorTools;
  assert.equal(manifest.baseSha,p.releaseBaseSha);
  const delta=git(root,['diff','--name-only',p.releaseBaseSha,p.toolsSha]).split('\n').filter(f=>f.startsWith('scripts/')||f.startsWith('.github/')).sort();
  assert.deepEqual(Object.keys(manifest.files).sort(),delta,'complete forward control manifest');
  for(const [rel,digest]of Object.entries(manifest.files)) {
   assert.equal(hash(execFileSync('git',['show',`${p.toolsSha}:${rel}`],{cwd:root})),digest,rel);
   assert.equal(hash(fs.readFileSync(path.join(root,rel))),digest,'current control bytes');
  }
  const allowed=new Set([PENDING,CANDIDATE,TOOLS,...(candidate.hostedAdmission?.files??[]).map(f=>f.path)]);
  const post=git(root,['diff','--name-only',p.toolsSha]).split('\n').filter(Boolean);
  assert(post.every(f=>allowed.has(f)),'bounded post-tools forward records');
  const untracked=git(root,['ls-files','--others','--exclude-standard','--','scripts','.github','src','data','hosted-acceptance-evidence']).split('\n').filter(Boolean);
  assert(untracked.every(f=>allowed.has(f)),'no unbound forward inputs');
  if(!candidate.hostedAdmission)return {...expected,current:false,bindingVerified:true,status:'FORWARD_BOUND_HOSTED_PENDING',productionAuthorized:false,reasons:['Fresh exact staged hosted evidence is required; all production execution remains held.']};
  assert.deepEqual(tools.hostedAdmission,candidate.hostedAdmission);assert.deepEqual(p.hostedAdmission,candidate.hostedAdmission);
  const h=candidate.hostedAdmission;
  assert.equal(h.schemaVersion,'rcap-readonly-successor-admission/v1');
  assertForwardHosted(h,expected);
  for(const ref of h.files){assert(ref.path.startsWith('hosted-acceptance-evidence/successor-closure/')&&!ref.path.split('/').includes('..'));const bytes=fs.readFileSync(path.join(root,ref.path));assert.equal(bytes.length,ref.bytes);assert.equal(hash(bytes),ref.sha256);}
  for(const rel of [h.runPath,h.receiptPath,h.jobsPath,h.artifactPath,h.archivePath])assert(h.files.some(f=>f.path===rel),'all native admission inputs are hashed');
  const run=JSON.parse(fs.readFileSync(path.join(root,h.runPath))),receipt=JSON.parse(fs.readFileSync(path.join(root,h.receiptPath)));
  assert.equal(run.id,h.runId);assert.equal(run.head_sha,h.workflowSourceSha);git(root,['merge-base','--is-ancestor',p.toolsSha,h.workflowSourceSha]);assert.equal(git(root,['diff','--name-only',p.toolsSha,h.workflowSourceSha,'--',...Object.keys(manifest.files)]),'','actual workflow control identity');assert.equal(run.path,'.github/workflows/rcap-f1-ephemeral-staging.yml');assert.equal(run.conclusion,'success');assert.equal(run.status,'completed');
  assert.equal(run.repository.full_name.toLowerCase(),'roger-legalease/legalease-partner-dashboard-clean');assert.equal(run.event,'workflow_dispatch');assert.equal(run.run_attempt,1);
  const jobs=JSON.parse(fs.readFileSync(path.join(root,h.jobsPath)));const job=jobs.jobs.find(j=>j.id===h.jobId);assert(job);assert.equal(job.run_id,h.runId);assert.equal(job.conclusion,'success');assert.equal(job.status,'completed');
  for(const name of ['Install frozen dependencies','Install browser for mocked signup only','Verify exact forward controls before provider credentials','Stage exact application without aliases and read worker rollback','Upload non-production closure evidence'])assert.equal(job.steps.find(s=>s.name===name)?.conclusion,'success',name);
  const artifact=JSON.parse(fs.readFileSync(path.join(root,h.artifactPath)));assert.equal(artifact.id,h.artifactId);assert.equal(artifact.workflow_run.id,h.runId);assert.equal(artifact.workflow_run.head_sha,h.workflowSourceSha);assert.equal(artifact.digest,'sha256:'+hash(fs.readFileSync(path.join(root,h.archivePath))));
  const fromArchive=JSON.parse(execFileSync('unzip',['-p',path.join(root,h.archivePath),'admission.json'],{encoding:'utf8'}));assert.deepEqual(fromArchive,receipt,'actual native artifact receipt');
  const rollback=JSON.parse(execFileSync('unzip',['-p',path.join(root,h.archivePath),'worker-rollback.json'],{encoding:'utf8'}));assert.equal(rollback.passed,true,'rollback availability required');
  assert.deepEqual(receipt,h.receipt);assertForwardHosted(receipt,expected);assert.equal(receipt.workflowSourceSha,h.workflowSourceSha);assert.equal(receipt.runId,h.runId);
  return {...expected,current:true,bindingVerified:true,status:'CURRENT',hostedAcceptanceStatus:'READ_ONLY_STAGED_ACCEPTED_PRODUCTION_HELD',productionAuthorized:false,reasons:[]};
 }catch(error){return {current:false,status:'INVALID_FORWARD_BINDING',reasons:[error.message]};}
}
export function assertForwardHosted(h,expected) {
 const age=Date.now()-Date.parse(h.capturedAt);assert(Number.isFinite(age)&&age>=-300000&&age<=86400000,'fresh hosted evidence within 24 hours');
 validSha(h.workflowSourceSha);assert(Number.isSafeInteger(h.runId)&&h.runId>0,'actual hosted run');
 for(const key of ['applicationSha','workerSourceSha','workerDigest','workerInputFingerprint','toolsSha'])assert.equal(h[key],expected[key],`hosted ${key}`);
 assert.match(h.deploymentId,/^dpl_[A-Za-z0-9]+$/);assert.equal(h.productionRollback,'dpl_3j4Dr4GHyXmwmrFCTZ6orNNNP7sc');
 assert.equal(h.productionAliasesUnchanged,true);assert.equal(h.autoAssignCustomDomains,false);
 assert.equal(h.sharedHostRoutingMethod,'frozen-proxy-map-and-staged-targets');assert.equal(h.workerRollbackVerified,true);assert.equal(h.signupVerified,true);assert.equal(h.sharedHostRoutingVerified,true);assert.equal(h.productionWrites,false);
 assert.equal(h.target,'production');assert.equal(h.readyState,'READY');assert.equal(h.liveAuthCalls,0);
 assert.equal(h.productionAuthorized,false);
}
