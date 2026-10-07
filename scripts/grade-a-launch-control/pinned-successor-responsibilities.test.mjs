import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {requirePreviewPreparation} from './require-preview-preparation.mjs';
import {acceptedPinnedRecords,writePinnedRecords,forwardPinnedRecords} from './prepare-pinned-worker-successor.mjs';
import {CANDIDATE,PENDING,TOOLS,PUBLICATION,verifyPinnedForwardBinding,verifyPinnedBinding,verifyPinnedSuccessor} from './verify-pinned-worker-successor.mjs';
import {verifyReleaseCandidateBinding,requireCurrentReleaseCandidate} from './verify-release-candidate-binding.mjs';
const applicationSha='7a8c6a4da102bfd9691a6260d7bb117829cf4019',sourceSha='b0b721470ea38455d8429c45300c9b3127bfe780',releaseBaseSha='9794f078553d8cd95aec47518ac773ee3e968fdc';
const controls=['prepare-pinned-worker-successor.mjs','verify-pinned-worker-successor.mjs','pinned-successor-responsibilities.mjs','require-preview-preparation.mjs'].map(p=>'scripts/grade-a-launch-control/'+p).concat('.github/workflows/rcap-hosted-acceptance-staging.yml');
test('real full preparation binds history, reviewed range, native accepted image and runtime successor without authority',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-complete-preparation-'));
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:'pipe',maxBuffer:64*1024*1024}).trim();
 const read=p=>JSON.parse(fs.readFileSync(path.join(root,p)));
 const commit=message=>git(['-c','user.name=Synthetic Control Test','-c','user.email=synthetic@example.test','commit','--quiet','-m',message]);
 try{
  execFileSync('git',['clone','--quiet','--shared',process.cwd(),root],{stdio:'pipe'});fs.symlinkSync(fs.realpathSync('node_modules'),path.join(root,'node_modules'));
  for(const rel of controls)fs.copyFileSync(rel,path.join(root,rel));
  git(['add','--',...controls]);commit('synthetic exact proposed release controls');const toolsSha=git(['rev-parse','HEAD']);
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
  const forward=forwardPinnedRecords(root,{applicationSha,releaseBaseSha:acceptedSha,toolsSha});for(const [p,r]of Object.entries(forward))fs.writeFileSync(path.join(root,p),JSON.stringify(r,null,2)+'\n');
  const held=verifyPinnedForwardBinding(root,read(CANDIDATE));assert.equal(held.bindingVerified,true,JSON.stringify(held));assert.equal(held.current,false);assert.equal(held.productionAuthorized,false);assert.equal(held.applicationSha,applicationSha);assert.equal(held.workerSourceSha,sourceSha);assert.equal(held.workerDigest,receipt.digest);assert.equal(held.status,'FORWARD_BOUND_HOSTED_PENDING');assert.throws(()=>requireCurrentReleaseCandidate(root));
  const inputs={phase:'replace_preview',applicationSha,workerSourceSha:sourceSha,workerDigest:receipt.digest,toolsSha,workflowSourceSha:git(['rev-parse','HEAD'])};
  const preview=requirePreviewPreparation(root,inputs);assert.equal(preview.previewOnly,true);assert.equal(preview.productionAuthorized,false);assert.equal(preview.current,false);
  for(const key of ['applicationSha','workerSourceSha','workerDigest','toolsSha'])assert.throws(()=>requirePreviewPreparation(root,{...inputs,[key]:'wrong'}));
  for(const phase of ['full','accept','payment','production_activate'])assert.throws(()=>requirePreviewPreparation(root,{...inputs,phase}));
  console.log(JSON.stringify({fullPreparation:'PASS',applicationSha,workerSourceSha:sourceSha,workerDigest:receipt.digest,heldStatus:held.status,productionAuthorized:false,mutationRefusals:refusals,rebuildRequired:false}));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
