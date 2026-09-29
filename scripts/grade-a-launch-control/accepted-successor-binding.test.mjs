import {PREACTIVATION_PHASES} from './production-preflight-authorization.mjs';
import {createHash} from 'node:crypto';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {verifyPendingWorkerSuccessor,verifySuccessorPublication,assertSuccessorImageAcceptance} from './verify-pending-worker-successor.mjs';
import {verifyReleaseCandidateBinding,requireCurrentReleaseCandidate} from './verify-release-candidate-binding.mjs';
const toolsPath='data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json';
const candidatePath='data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json';
const publicationPath='data/rcap-render/worker-publication-evidence.json';
const pendingPath='data/rcap-grade-a/launch-control/PENDING_WORKER_SUCCESSOR.json';
const base='c5942743b657b6a17165b72a308efd1cabc2d90e';
test('native acceptance, pending successor, release and exact hosted tools bind; forged identities, drift and execution authority refuse',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-accepted-successor-'));
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:'pipe'}).trim();
 const read=rel=>JSON.parse(fs.readFileSync(path.join(root,rel)));
 try{
  execFileSync('git',['clone','--quiet','--shared','--no-checkout',process.cwd(),root],{stdio:'pipe'});
  git(['sparse-checkout','set','scripts','src','deploy','data/rcap-render','data/rcap-grade-a/launch-control','hosted-acceptance-evidence/worker/publication-36219916209','hosted-acceptance-evidence/worker/image-acceptance-36247303667']);
  const historical='0f23a0ca4d6eac7d50a0466d8f2664f9e63a25c7';
  const binding=JSON.parse(git(['show',`${historical}:${toolsPath}`]));
  git(['checkout','--detach',binding.successorTools.signInCorrectionBaseSha??binding.successorTools.deployedNetworkCorrectionBaseSha??binding.successorTools.orderingCorrectionBaseSha??binding.successorTools.checkpointCorrectionBaseSha??binding.successorTools.networkCorrectionBaseSha??binding.successorTools.correctionBaseSha??base]);const files=[toolsPath,...Object.keys(binding.successorTools.files)];
  for(const rel of files){fs.mkdirSync(path.dirname(path.join(root,rel)),{recursive:true});fs.writeFileSync(path.join(root,rel),execFileSync('git',['show',`${historical}:${rel}`],{cwd:root,maxBuffer:32*1024*1024}));}
  const release=()=>verifyReleaseCandidateBinding(root,read(candidatePath));
  const check=()=>{
   assertSuccessorImageAcceptance(root,read(publicationPath));const publication=verifySuccessorPublication(root);assert.equal(publication.current,true,JSON.stringify(publication));assert.equal(publication.canonicalWorkerInputs,39);assert.equal(publication.runtimeAccepted,true);
   const pending=verifyPendingWorkerSuccessor(root);assert.equal(pending.current,true,JSON.stringify(pending));assert.equal(pending.previewExecution,'held');
   assert.equal(release().current,true,JSON.stringify(release()));assert.equal(requireCurrentReleaseCandidate(root).runtimeAccepted,true);
  };
  check();git(['add','--sparse','-f','--',...files]);git(['-c','user.name=Synthetic Test','-c','user.email=synthetic@example.test','commit','--quiet','-m','synthetic accepted successor']);check();
  for(const [rel,mutations] of [
   [publicationPath,[p=>p.runtimeAccepted=false,p=>p.imageAcceptance.runId=1,p=>p.imageAcceptance.jobId=1,p=>p.imageAcceptance.workflowSourceSha=p.sourceSha,p=>p.imageAcceptance.digest=p.supersededPublication.immutableRegistryDigest,p=>p.imageAcceptance.conclusion='failure',p=>p.supersededPublication.runtimeAccepted=false]],
   [pendingPath,[p=>p.acceptance='pending',p=>p.previewExecution='ready',p=>p.productionAuthorized=true,p=>p.applicationSha='0'.repeat(40)]],
   [candidatePath,[p=>p.workerDigest=p.supersededRecord.workerDigest,p=>p.publication.runId=1,p=>p.readOnlyImageAcceptance.jobId=1,p=>p.hostedAcceptance.preview=p.supersededRecord.hostedAcceptance.preview,p=>p.runtimeAccepted=false]],
   [toolsPath,[p=>p.successorTools.signInCorrectionBaseSha='0'.repeat(40),p=>delete p.successorTools.signInCorrectionBaseSha,p=>p.successorTools.deployedNetworkCorrectionBaseSha='0'.repeat(40),p=>delete p.successorTools.deployedNetworkCorrectionBaseSha,p=>p.successorTools.orderingCorrectionBaseSha='0'.repeat(40),p=>delete p.successorTools.orderingCorrectionBaseSha,p=>p.successorTools.checkpointCorrectionBaseSha='0'.repeat(40),p=>delete p.successorTools.checkpointCorrectionBaseSha,p=>p.successorTools.networkCorrectionBaseSha='0'.repeat(40),p=>delete p.successorTools.networkCorrectionBaseSha,p=>p.successorTools.files={},p=>p.applicationSha='0'.repeat(40),p=>p.toolsSha='0'.repeat(40),p=>p.productionAuthorized=true,p=>p.deploymentAuthorized=true,p=>p.clinicDispatchReady=true,p=>p.supersededRecord.status='rewritten']]
  ]){
   const file=path.join(root,rel),before=fs.readFileSync(file);
   for(const mutate of mutations){const value=JSON.parse(before);mutate(value);fs.writeFileSync(file,JSON.stringify(value));assert.equal(release().current,false,rel);fs.writeFileSync(file,before);}
  }
  for(const rel of ['.github/workflows/rcap-hosted-acceptance-staging.yml','scripts/rcap-hosted-clinic-resume.mjs','scripts/rcap-clinic-resume-network-policy.mjs','scripts/rcap-clinic-resume-captcha.mjs','scripts/rcap-clinic-resume-resource-loading.test.mjs','scripts/rcap-clinic-resume-browser-reset.mjs','scripts/rcap-clinic-resume-contract.mjs','scripts/rcap-clinic-resume-browser-lifecycle.mjs','scripts/rcap-clinic-resume-browser-ports.mjs','scripts/rcap-clinic-resume-sign-in.mjs','src/lib/rcap/render/packet-delivery.ts','hosted-acceptance-evidence/worker/image-acceptance-36247303667/native.log']){
   const file=path.join(root,rel),before=fs.readFileSync(file);fs.appendFileSync(file,'\n// drift\n');assert.equal(release().current,false,rel);fs.writeFileSync(file,before);
  }
  const unknown=path.join(root,'scripts/unbound-resume.mjs');fs.writeFileSync(unknown,'// unbound');assert.equal(release().current,false);fs.unlinkSync(unknown);check();git(['-c','user.name=Synthetic Test','-c','user.email=synthetic@example.test','commit','--allow-empty','--quiet','-m','unauthorized extra correction']);assert.equal(release().current,false,'no arbitrary further tools commit');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

// Current generation fixture uses the exact release base and reviewed manifest;
// predecessor fixtures above retain every historical refusal unchanged.
test('receipt-chain successor binds the current generation before and after one tools commit',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-current-successor-'));
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:'pipe'}).trim();
 const read=rel=>JSON.parse(fs.readFileSync(path.join(root,rel)));
 try{
  execFileSync('git',['clone','--quiet','--shared','--no-checkout',process.cwd(),root],{stdio:'pipe'});
  const binding=JSON.parse(fs.readFileSync(toolsPath));
  git(['checkout','--detach',binding.toolsSha]);
  const generationFiles=[toolsPath,...Object.keys(binding.successorTools.files)];
  for(const rel of generationFiles){fs.mkdirSync(path.dirname(path.join(root,rel)),{recursive:true});fs.copyFileSync(rel,path.join(root,rel));}
  git(['add','-f','--',...generationFiles]);
  const release=()=>verifyReleaseCandidateBinding(root,read(candidatePath));
  const check=()=>{const result=release();assert.equal(result.current,true,JSON.stringify(result));assert.equal(result.status,'CURRENT');assert.equal(requireCurrentReleaseCandidate(root).hostedAcceptance.preview.deploymentId,'dpl_7heA1zUcZ7zs7CciZg8LLdwGiKwT');assert.equal(result.productionAuthorized,true);assert.deepEqual(result.productionPhases,[...PREACTIVATION_PHASES]);};
  check();git(['add','-f','--',...generationFiles]);git(['-c','user.name=Synthetic Test','-c','user.email=synthetic@example.test','commit','--quiet','-m','synthetic generation successor']);check();
  let refused=0;
  const mutations=[
   [publicationPath,[p=>delete p.supersededPublication,p=>delete p.supersededChain,p=>p.sourceSha='0'.repeat(40),p=>p.immutableRegistryDigest='sha256:'+'0'.repeat(64),p=>p.workerInputFingerprint='sha256:'+'0'.repeat(64),p=>p.originalPublicationPath=p.supersededPublication.originalPublicationPath,p=>p.imageAcceptance.runId=36442375228,p=>p.imageAcceptance.digest=p.supersededPublication.immutableRegistryDigest,p=>p.supersededPublication.sourceSha=p.sourceSha,p=>p.imageAcceptanceAttempts=[]]],
   [pendingPath,[p=>delete p.supersededRecord,p=>p.sourceCommit='0'.repeat(40),p=>p.supersededRecordSha256='0'.repeat(64),p=>p.resume='unauthorized historical resume',p=>p.productionAuthorized=false]],
   [candidatePath,[p=>p.hostedAcceptanceStatus='HOSTED_ACCEPTED_PRODUCTION_HELD',p=>p.productionAuthorization.recordedAt='2026-01-01T00:00:00.000Z',p=>p.productionAuthorization.recordedAt='2999-01-01T00:00:00.000Z',p=>p.productionAuthorization.phases.push('activate'),p=>p.productionAuthorization.phases=['smoke'],p=>p.status='HOSTED_ACCEPTED_PRODUCTION_HELD',p=>p.productionAuthorization.stagedDeploymentId='dpl_invented',p=>p.productionAuthorization.rollbackDeploymentId='dpl_invented',p=>p.productionAuthorization.smokeRunId='12345678',p=>p.activationReceipt={passed:true},p=>p.hostedAcceptance.preview={deploymentId:'dpl_invented'},p=>p.hostedAcceptance.manualHostedFullReady=true,p=>p.readOnlyImageAcceptance.runId=36442375228,p=>p.supersededRecord.applicationSha='0'.repeat(40),p=>p.applicationPin.sourceSha='0'.repeat(40),p=>p.productionAuthorized=false,p=>p.productionAuthorization={approved:true},p=>p.hostedAcceptance.journeys[0].runId=1,p=>p.hostedAcceptance.journeys[1].artifactId=1,p=>p.hostedAcceptance.journeys[1].artifactSha256='sha256:'+'0'.repeat(64),p=>p.hostedAcceptance.journeys[1].exactBrowserReturn=false,p=>p.hostedAcceptance.naturalDelivery=null,p=>p.supersededRecordSha256='0'.repeat(64)]],
   [toolsPath,[...(read(toolsPath).successorTools.dependencyOrderCorrectionBaseSha?[p=>p.successorTools.dependencyOrderCorrectionBaseSha='0'.repeat(40),p=>delete p.successorTools.dependencyOrderCorrectionBaseSha]:[]),p=>p.status='HOSTED_ACCEPTED_PRODUCTION_HELD',p=>p.productionAuthorized=false,p=>p.toolsSha='0'.repeat(40),p=>p.successorTools.files={},p=>p.deploymentAuthorized=true,p=>p.clinicDispatchReady=true,p=>p.supersededRecord.status='relabeled']]
  ];
  for(const [rel,changes]of mutations){const file=path.join(root,rel),before=fs.readFileSync(file);for(const change of changes){const value=JSON.parse(before);change(value);assert.notDeepEqual(value,JSON.parse(before),'mutation must change the input');fs.writeFileSync(file,JSON.stringify(value));assert.equal(release().current,false,rel);refused++;fs.writeFileSync(file,before);}}
  // Reseal metadata mutations too: refusals must not depend only on file hashes.
  for(const [rel,changes]of mutations.filter(([p])=>p!==publicationPath&&p!==toolsPath)){
   const file=path.join(root,rel),before=fs.readFileSync(file),toolsBefore=fs.readFileSync(path.join(root,toolsPath));
   for(const change of changes){const value=JSON.parse(before);change(value);assert.notDeepEqual(value,JSON.parse(before),'mutation must change the input');fs.writeFileSync(file,JSON.stringify(value));const tools=JSON.parse(toolsBefore);tools.successorTools.files[rel]=createHash('sha256').update(fs.readFileSync(file)).digest('hex');fs.writeFileSync(path.join(root,toolsPath),JSON.stringify(tools));assert.equal(release().current,false,`resealed ${rel}`);refused++;fs.writeFileSync(file,before);fs.writeFileSync(path.join(root,toolsPath),toolsBefore);}
  }
  for(const rel of ['src/lib/rcap/render/packet-delivery.ts','.github/workflows/rcap-hosted-acceptance-staging.yml',read(publicationPath).imageAcceptance.nativeLog.path]){const file=path.join(root,rel),before=fs.readFileSync(file);fs.appendFileSync(file,'\n');assert.equal(release().current,false,rel);refused++;fs.writeFileSync(file,before);}
  const unknown=path.join(root,'scripts/unbound-successor.mjs');fs.writeFileSync(unknown,'// not authorized');assert.equal(release().current,false);refused++;fs.unlinkSync(unknown);check();
  git(['-c','user.name=Synthetic Test','-c','user.email=synthetic@example.test','commit','--allow-empty','--quiet','-m','unbounded next commit']);assert.equal(release().current,false);refused++;
  console.log(`current-generation refusals: ${refused}`);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
