import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';
import {PENDING,verifyPendingWorkerSuccessor} from './verify-pending-worker-successor.mjs';import {verifyReleaseCandidateBinding,requireCurrentReleaseCandidate} from './verify-release-candidate-binding.mjs';
test('pending successor binds exact source/tools/full worker inputs and cannot authorize dispatch or reuse old digest',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-pending-binding-'));const original=JSON.parse(fs.readFileSync(PENDING));
 const git=a=>execFileSync('git',a,{cwd:root,encoding:'utf8',stdio:'pipe'}).trim();
 try{
 execFileSync('git',['clone','--quiet','--shared',process.cwd(),root],{stdio:'pipe'});git(['checkout','--detach',original.parent]);
 for(const p of [...Object.keys(original.files),PENDING]){fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.copyFileSync(p,path.join(root,p));}
 git(['add','--',...Object.keys(original.files),PENDING]);
 assert.equal(verifyPendingWorkerSuccessor(root).status,'LOCAL_SUCCESSOR_AWAITING_COMMIT');
 git(['-c','user.name=Synthetic Test','-c','user.email=synthetic@example.test','commit','--quiet','-m','synthetic pending successor fixture']);
 const source=git(['rev-parse','HEAD']),result=verifyPendingWorkerSuccessor(root);assert.equal(result.status,'AWAITING_WORKER_PUBLICATION');assert.equal(result.applicationSha,source);assert.equal(result.workerSourceSha,source);assert.equal(result.workerDigest,null);assert.equal(result.workerRebuildRequired,true);assert.equal(result.current,false);
 const historical=JSON.parse(fs.readFileSync(path.join(root,'data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json')));
 assert.equal(verifyReleaseCandidateBinding(root,historical).status,'AWAITING_WORKER_PUBLICATION');assert.throws(()=>requireCurrentReleaseCandidate(root));
 for(const change of [p=>p.workerRebuildRequired=false,p=>p.workerDigest=p.historicalWorker.digest,p=>p.productionAuthorized=true,p=>p.publication='success',p=>p.acceptance='accepted',p=>p.previewExecution='ready',p=>p.workerInputFingerprint=p.historicalWorker.fingerprint,p=>p.workerChangedPaths=[],p=>p.sourceCommit='HEAD']){
 const p=structuredClone(original);change(p);fs.writeFileSync(path.join(root,PENDING),JSON.stringify(p));assert.equal(verifyPendingWorkerSuccessor(root).status,'INVALID_PENDING_PUBLICATION');fs.copyFileSync(PENDING,path.join(root,PENDING));}
 const ui=path.join(root,'src/app/briefcase/[packetId]/page.tsx');const before=fs.readFileSync(ui);fs.appendFileSync(ui,'\n// unrecorded change\n');assert.equal(verifyPendingWorkerSuccessor(root).status,'INVALID_PENDING_PUBLICATION');fs.writeFileSync(ui,before);assert.equal(verifyPendingWorkerSuccessor(root).status,'AWAITING_WORKER_PUBLICATION');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
