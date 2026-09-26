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
  const binding=JSON.parse(fs.readFileSync(toolsPath));
  git(['checkout','--detach',binding.successorTools.correctionBaseSha??base]);const files=[toolsPath,...Object.keys(binding.successorTools.files)];
  for(const rel of files){fs.mkdirSync(path.dirname(path.join(root,rel)),{recursive:true});fs.copyFileSync(rel,path.join(root,rel));}
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
   [toolsPath,[p=>p.successorTools.files={},p=>p.applicationSha='0'.repeat(40),p=>p.toolsSha='0'.repeat(40),p=>p.productionAuthorized=true,p=>p.deploymentAuthorized=true,p=>p.clinicDispatchReady=true,p=>p.supersededRecord.status='rewritten']]
  ]){
   const file=path.join(root,rel),before=fs.readFileSync(file);
   for(const mutate of mutations){const value=JSON.parse(before);mutate(value);fs.writeFileSync(file,JSON.stringify(value));assert.equal(release().current,false,rel);fs.writeFileSync(file,before);}
  }
  for(const rel of ['.github/workflows/rcap-hosted-acceptance-staging.yml','scripts/rcap-hosted-clinic-resume.mjs','src/lib/rcap/render/packet-delivery.ts','hosted-acceptance-evidence/worker/image-acceptance-36247303667/native.log']){
   const file=path.join(root,rel),before=fs.readFileSync(file);fs.appendFileSync(file,'\n// drift\n');assert.equal(release().current,false,rel);fs.writeFileSync(file,before);
  }
  const unknown=path.join(root,'scripts/unbound-resume.mjs');fs.writeFileSync(unknown,'// unbound');assert.equal(release().current,false);fs.unlinkSync(unknown);check();
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
