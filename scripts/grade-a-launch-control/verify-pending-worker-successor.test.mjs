import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {PENDING,verifyPendingWorkerSuccessor,verifySuccessorPublication} from './verify-pending-worker-successor.mjs';import {verifyReleaseCandidateBinding,requireCurrentReleaseCandidate} from './verify-release-candidate-binding.mjs';
test('pending successor binds exact source/tools/full worker inputs and cannot authorize dispatch or reuse old digest',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-pending-binding-'));const original=JSON.parse(execFileSync('git',['show',`af638b61:${PENDING}`]));
 const git=a=>execFileSync('git',a,{cwd:root,encoding:'utf8',stdio:'pipe'}).trim();
 try{
 execFileSync('git',['clone','--quiet','--shared','--no-checkout',process.cwd(),root],{stdio:'pipe'});git(['sparse-checkout','set','scripts','src','deploy','data/rcap-render','data/rcap-grade-a/launch-control']);git(['checkout','--detach',original.parent]);
 for(const p of [...Object.keys(original.files),PENDING]){fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),execFileSync('git',['show',`af638b61:${p}`]));}
 git(['add','--',...Object.keys(original.files),PENDING]);
 assert.equal(verifyPendingWorkerSuccessor(root).status,'LOCAL_SUCCESSOR_AWAITING_COMMIT');
 git(['-c','user.name=Synthetic Test','-c','user.email=synthetic@example.test','commit','--quiet','-m','synthetic pending successor fixture']);
 const source=git(['rev-parse','HEAD']),result=verifyPendingWorkerSuccessor(root);assert.equal(result.status,'AWAITING_WORKER_PUBLICATION');assert.equal(result.applicationSha,source);assert.equal(result.workerSourceSha,source);assert.equal(result.workerDigest,null);assert.equal(result.workerRebuildRequired,true);assert.equal(result.current,false);
 const historical=JSON.parse(fs.readFileSync(path.join(root,'data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json')));
 assert.equal(verifyReleaseCandidateBinding(root,historical).status,'AWAITING_WORKER_PUBLICATION');assert.throws(()=>requireCurrentReleaseCandidate(root));
 for(const change of [p=>p.workerRebuildRequired=false,p=>p.workerDigest=p.historicalWorker.digest,p=>p.productionAuthorized=true,p=>p.publication='success',p=>p.acceptance='accepted',p=>p.previewExecution='ready',p=>p.workerInputFingerprint=p.historicalWorker.fingerprint,p=>p.workerChangedPaths=[],p=>p.sourceCommit='HEAD']){
 const p=structuredClone(original);change(p);fs.writeFileSync(path.join(root,PENDING),JSON.stringify(p));assert.equal(verifyPendingWorkerSuccessor(root).status,'INVALID_PENDING_PUBLICATION');fs.writeFileSync(path.join(root,PENDING),execFileSync('git',['show',`af638b61:${PENDING}`]));}
 const ui=path.join(root,'src/app/briefcase/[packetId]/page.tsx');const before=fs.readFileSync(ui);fs.appendFileSync(ui,'\n// unrecorded change\n');assert.equal(verifyPendingWorkerSuccessor(root).status,'INVALID_PENDING_PUBLICATION');fs.writeFileSync(ui,before);assert.equal(verifyPendingWorkerSuccessor(root).status,'AWAITING_WORKER_PUBLICATION');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});


test('published successor is current publication only; image acceptance and hosted execution remain held',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-published-binding-'));
 const git=a=>execFileSync('git',a,{cwd:root,encoding:'utf8',stdio:'pipe'}).trim();
 const evidence='data/rcap-render/worker-publication-evidence.json';
 const native='hosted-acceptance-evidence/worker/publication-36219916209/';
 const files=[PENDING,evidence,'scripts/grade-a-launch-control/verify-pending-worker-successor.mjs','scripts/grade-a-launch-control/verify-pending-worker-successor.test.mjs',native+'publication.zip',native+'rcap-render-worker-publication.json'];
 try{
  execFileSync('git',['clone','--quiet','--shared','--no-checkout',process.cwd(),root],{stdio:'pipe'});
  git(['sparse-checkout','set','scripts','src','deploy','data/rcap-render','data/rcap-grade-a/launch-control','hosted-acceptance-evidence/worker/publication-36219916209']);
  git(['checkout','--detach','af638b61']);
  for(const rel of files){fs.mkdirSync(path.dirname(path.join(root,rel)),{recursive:true});fs.copyFileSync(rel,path.join(root,rel));}
  const check=()=>{
   const publication=verifySuccessorPublication(root);assert.equal(publication.current,true,JSON.stringify(publication));assert.equal(publication.runtimeAccepted,false);assert.equal(publication.canonicalWorkerInputs,39);
   const pending=verifyPendingWorkerSuccessor(root);assert.equal(pending.status,'AWAITING_WORKER_ACCEPTANCE',JSON.stringify(pending));assert.equal(pending.current,false);assert.equal(pending.workerRebuildRequired,false);
   const historical=JSON.parse(fs.readFileSync(path.join(root,'data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json')));
   assert.equal(verifyReleaseCandidateBinding(root,historical).status,'AWAITING_WORKER_ACCEPTANCE');assert.throws(()=>requireCurrentReleaseCandidate(root));
  };
  check();git(['add','-f','--',...files]);git(['-c','user.name=Synthetic Test','-c','user.email=synthetic@example.test','commit','--quiet','-m','synthetic publication binding']);check();
  for(const [rel,mutations] of [[PENDING,[p=>p.workerDigest=p.historicalWorker.digest,p=>p.acceptance='accepted',p=>p.previewExecution='ready',p=>p.productionAuthorized=true,p=>p.publication='pending',p=>p.workerRebuildRequired=true,p=>p.files={}]],
   [evidence,[p=>p.runtimeAccepted=true,p=>p.sourceSha='0'.repeat(40),p=>p.immutableRegistryDigest='sha256:'+'0'.repeat(64),p=>p.workerInputFingerprint=p.supersededPublication.workerInputFingerprint,p=>p.publicationArtifactSha256='sha256:'+'0'.repeat(64),p=>p.supersededPublication.runtimeAccepted=false]]]){
   const file=path.join(root,rel),before=fs.readFileSync(file);
   for(const mutate of mutations){const p=JSON.parse(before);mutate(p);fs.writeFileSync(file,JSON.stringify(p));assert.equal(verifyPendingWorkerSuccessor(root).status,'INVALID_PENDING_PUBLICATION');fs.writeFileSync(file,before);}
  }
  for(const rel of [native+'publication.zip',native+'rcap-render-worker-publication.json','src/lib/rcap/render/packet-delivery.ts']){
   const file=path.join(root,rel),before=fs.readFileSync(file);fs.appendFileSync(file,'\n');assert.equal(verifyPendingWorkerSuccessor(root).status,'INVALID_PENDING_PUBLICATION');fs.writeFileSync(file,before);
  }
  const unknown=path.join(root,'scripts/unapproved-successor.mjs');fs.writeFileSync(unknown,'// unauthorized');assert.equal(verifyPendingWorkerSuccessor(root).status,'INVALID_PENDING_PUBLICATION');fs.unlinkSync(unknown);check();
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
