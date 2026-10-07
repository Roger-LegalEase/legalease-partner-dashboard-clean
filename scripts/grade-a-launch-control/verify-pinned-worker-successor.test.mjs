// All newly created run IDs/digests below are SYNTHETIC LOCAL FIXTURES, never
// publication or acceptance evidence for a real release.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {PENDING,PUBLICATION,CANDIDATE,TOOLS,verifyPinnedSuccessor,verifyPinnedPublication,verifyPinnedBinding,assertCommittedPredecessor,reviewedSourceFiles} from './verify-pinned-worker-successor.mjs';
import {pinnedRecords,writePinnedRecords,advancePinnedRecords} from './prepare-pinned-worker-successor.mjs';
import {verifyReleaseCandidateBinding,requireCurrentReleaseCandidate} from './verify-release-candidate-binding.mjs';
const base='121c889e15ac872e8dfbdeff18256551d15642aa',historicalSource='e3ac438da981c84987bd3172751e1a09e3f42309';
const digest='sha256:'+'a'.repeat(64);
const hash=b=>createHash('sha256').update(b).digest('hex');

for(const multi of [false,true])test(`${multi?'explicit multi-commit':'historical one-commit'} pinned lifecycle preserves custody and refuses authority and altered evidence`,()=>{
 let source=historicalSource;
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-pinned-fixture-'));
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:'pipe',maxBuffer:64*1024*1024}).trim();
 const read=rel=>JSON.parse(fs.readFileSync(path.join(root,rel)));
 const write=(rel,value)=>{fs.mkdirSync(path.dirname(path.join(root,rel)),{recursive:true});fs.writeFileSync(path.join(root,rel),JSON.stringify(value,null,2)+'\n');};
 const commit=message=>git(['-c','user.name=Synthetic Test','-c','user.email=synthetic@example.test','commit','--quiet','-m',message]);
 try{
  execFileSync('git',['clone','--quiet','--shared','--no-checkout',process.cwd(),root],{stdio:'pipe'});
  git(['checkout','--quiet','--detach','cea24d73becc8c1d96485ad708b9411df8855a80']);
  fs.symlinkSync(fs.realpathSync('node_modules'),path.join(root,'node_modules'));
  const productPaths=['scripts/synthetic-range-a.mjs','src/lib/rcap/synthetic-range-b.ts','src/lib/rcap/synthetic-range-c.ts'];
  if(multi){
   for(const [i,rel]of productPaths.entries()){
    fs.writeFileSync(path.join(root,rel),`export const syntheticRange${i} = ${i};\n`);
    git(['add','--',rel]);commit(`synthetic reviewed product commit ${i}`);
   }
   source=git(['rev-parse','HEAD']);
  }
  assertCommittedPredecessor(root,base);
  const controls=['scripts/grade-a-launch-control/verify-pending-worker-successor.mjs','scripts/grade-a-launch-control/verify-release-candidate-binding.mjs','.github/workflows/publish-rcap-render-worker.yml'];
  const extra=['scripts/grade-a-launch-control/verify-historical-release.mjs','scripts/grade-a-launch-control/verify-pinned-worker-successor.mjs','scripts/grade-a-launch-control/prepare-pinned-worker-successor.mjs','scripts/grade-a-launch-control/verify-pinned-worker-successor.test.mjs','scripts/rcap-worker-identity-readonly.mjs','scripts/rcap-worker-identity-readonly.test.mjs','.github/workflows/rcap-worker-identity-readonly.yml'];
  for(const rel of [...new Set([...controls,...extra])]){fs.mkdirSync(path.dirname(path.join(root,rel)),{recursive:true});fs.copyFileSync(rel,path.join(root,rel));}
  git(['add','--',...new Set([...controls,...extra])]);commit('synthetic reviewed controls');const toolsSha=git(['rev-parse','HEAD']);
  const options={sourceSha:source,releaseBaseSha:base,toolsSha,...(multi?{sourceRangeBaseSha:base}:{})};
  if(multi){
   const legacy=pinnedRecords(root,{sourceSha:source,releaseBaseSha:base,toolsSha});
   assert(!Object.hasOwn(legacy[PENDING].files,productPaths[0]),'single-commit mode omits earlier product commit');
   assert.throws(()=>writePinnedRecords(root,legacy),/bounded control paths/,'reproduce the original multi-commit failure');
  }
  const initial=pinnedRecords(root,options);
  if(!multi)assert.equal(JSON.stringify(initial),JSON.stringify(pinnedRecords(root,{...options,sourceRangeBaseSha:undefined})),'omitting the option preserves exact serialized records');
  const reviewBase=multi?base:git(['rev-parse',`${source}^`]);
  const expectedFiles=Object.fromEntries(git(['diff','--name-only',reviewBase,source]).split('\n').filter(Boolean).map(rel=>[rel,hash(execFileSync('git',['show',`${source}:${rel}`],{cwd:root}))]));
  assert.deepEqual(initial[PENDING].files,expectedFiles);
  assert.equal(Object.hasOwn(initial[PENDING],'sourceRangeBaseSha'),multi,'default record shape unchanged');
  for(const rel of Object.keys(expectedFiles))assert(!Object.hasOwn(initial[TOOLS].successorTools.files,rel),'reviewed source is not a control');
  for(const rel of controls)assert(Object.hasOwn(initial[TOOLS].successorTools.files,rel),'actual control remains separately bound');
  if(multi){
   for(const rel of productPaths)assert(Object.hasOwn(initial[PENDING].files,rel),'earlier product commits bound');
   const unbounded='scripts/synthetic-unbounded-control.mjs';
   fs.writeFileSync(path.join(root,unbounded),'// Synthetic unreviewed control.\n');
   git(['add','--',unbounded]);commit('synthetic unbounded tool');
   const bad=pinnedRecords(root,{...options,toolsSha:git(['rev-parse','HEAD'])});
   assert(Object.hasOwn(bad[TOOLS].successorTools.files,unbounded));
   assert.throws(()=>writePinnedRecords(root,bad),/bounded control paths/);
   git(['reset','--hard',toolsSha]); // Only this disposable synthetic repository.
  }
  const pending=writePinnedRecords(root,initial);assert.equal(pending.status,'AWAITING_WORKER_PUBLICATION');assert.equal(pending.current,false);assert.equal(pending.workerDigest,null);
  assert.equal(verifyPinnedPublication(root).current,false,'predecessor is not new publication');
  assert.throws(()=>requireCurrentReleaseCandidate(root));
  git(['add','--',PENDING,CANDIDATE,TOOLS]);commit('synthetic pending records');
  let refusals=0;
  function mutate(rel,fn){const before=fs.readFileSync(path.join(root,rel)),value=JSON.parse(before);fn(value);write(rel,value);assert.equal(verifyReleaseCandidateBinding(root,read(CANDIDATE)).current,false);assert.match(verifyReleaseCandidateBinding(root,read(CANDIDATE)).status,/INVALID|STALE/);fs.writeFileSync(path.join(root,rel),before);refusals++;}
  for(const fn of [p=>p.sourceCommit='0'.repeat(40),p=>p.parent=base,p=>p.files={},p=>p.workerInputFingerprint='sha256:'+'0'.repeat(64),p=>p.supersededRecord.status='forged',p=>p.workerChangedPaths=[],p=>p.productionAuthorized=true,p=>p.publication='complete',p=>p.workerDigest=digest,p=>p.runtimeAccepted=true])mutate(PENDING,fn);
  if(multi){
   mutate(PENDING,p=>delete p.files[productPaths[0]]);
   mutate(PENDING,p=>p.files['src/lib/rcap/unreviewed.ts']='0'.repeat(64));
   mutate(PENDING,p=>p.files[productPaths[0]]='0'.repeat(64));
   mutate(PENDING,p=>p.sourceRangeBaseSha=p.parent);
   mutate(PENDING,p=>p.sourceRangeBaseSha='0'.repeat(40));
   const earlier=path.join(root,productPaths[0]),original=fs.readFileSync(earlier);
   fs.appendFileSync(earlier,'// unreviewed post-source alteration\n');
   assert.equal(verifyReleaseCandidateBinding(root,read(CANDIDATE)).status,'INVALID_PINNED_BINDING');
   assert(verifyPinnedSuccessor(root).reasons.some(reason=>reason.includes('cannot change after source approval')));
   fs.writeFileSync(earlier,original);
  }
  for(const rel of [PENDING,CANDIDATE,TOOLS])for(const flag of ['migrationReplayAuthorized','housekeepingReplayAuthorized','additionalWorkerPublicationAuthorized','imageAcceptanceRerunAuthorized','hostedFullReady','deploymentAuthorized','clinicDispatchReady'])mutate(rel,p=>p[flag]=true);
  for(const rel of [PENDING,CANDIDATE,TOOLS])mutate(rel,p=>p.previewExecutionInstruction={executionAuthorized:true});
  mutate(TOOLS,p=>p.toolsSha=base);mutate(TOOLS,p=>p.successorTools.files={});mutate(CANDIDATE,p=>p.productionAuthorization={approved:true});

  const prefix='hosted-acceptance-evidence/worker/synthetic-pinned/';
  function ref(rel,content){fs.mkdirSync(path.dirname(path.join(root,rel)),{recursive:true});fs.writeFileSync(path.join(root,rel),content);return {path:rel,bytes:Buffer.byteLength(content),sha256:hash(content)};}
  function runEvidence(workflow,name,workflowSourceSha,id,log){
   const text=git(['show',`${workflowSourceSha}:${workflow}`]);const names=[...text.matchAll(/^\s+- name: (.+)$/gm)].map(m=>m[1]);
   const run={id,name,head_sha:workflowSourceSha,run_attempt:1,path:workflow,event:'workflow_dispatch',repository:{full_name:'Roger-LegalEase/legalease-partner-dashboard-clean'},status:'completed',conclusion:'success'};
   const job={id:id+1,run_id:id,status:'completed',conclusion:'success',steps:[{name:'Set up job',number:1,status:'completed',conclusion:'success'},{name:'Run actions/checkout@v4',number:2,status:'completed',conclusion:'success'},...names.map((name,i)=>({name,number:i+3,status:'completed',conclusion:'success'}))]};
   return {jobId:job.id,nativeRunMetadata:ref(prefix+id+'/run.json',JSON.stringify(run)),nativeJobMetadata:ref(prefix+id+'/jobs.json',JSON.stringify({jobs:[job]})),nativeLog:ref(prefix+id+'/native.log',log)};
  }
  const previous=read(PUBLICATION),workflowSourceSha=git(['rev-parse','HEAD']);
  const artifact={schemaVersion:'rcap-worker-publication/v1',sourceSha:source,workflowSourceSha,requestedIntegrationSha:source,tagReplacementAuthorization:'',canonicalIntegrationBranch:'main',releaseIntegrationBranch:'captain-release',containedIn:'captain-release',dockerfilePath:'deploy/rcap-render-worker/Dockerfile',dockerfileSha256:hash(execFileSync('git',['show',`${source}:deploy/rcap-render-worker/Dockerfile`],{cwd:root})),lockfileSha256:hash(execFileSync('git',['show',`${source}:package-lock.json`],{cwd:root})),imageRepository:'ghcr.io/roger-legalease/rcap-render-worker',imageTag:source,imageReference:`ghcr.io/roger-legalease/rcap-render-worker:${source}`,immutableRegistryDigest:digest,digestPinnedReference:`ghcr.io/roger-legalease/rcap-render-worker@${digest}`,workflowRunId:'1001',workflowRunUrl:'https://github.com/Roger-LegalEase/legalease-partner-dashboard-clean/actions/runs/1001',mutableLatestTagCreated:false,publishOnlyNoDeploy:true,workerClaimingStarted:false,stagingAndProductionUnchanged:true};
  const original=ref(prefix+'publication/rcap-render-worker-publication.json',JSON.stringify(artifact));
  const archivePath=prefix+'publication/publication.zip';execFileSync('zip',['-q','-j',path.join(root,archivePath),path.join(root,original.path)]);
  const archive=fs.readFileSync(path.join(root,archivePath));
  const e={...artifact,workflowRunId:1001,workflowRunAttempt:1,workflowConclusion:'success',publicationArtifactId:1002,publicationArtifactName:`rcap-render-worker-publication-${source}`,originalPublicationPath:original.path,originalPublicationBytes:original.bytes,originalPublicationSha256:original.sha256,originalArchivePath:archivePath,nativeArchive:{path:archivePath,bytes:archive.length,sha256:hash(archive)},publicationArtifactSha256:'sha256:'+hash(archive),workerInputFingerprint:initial[PENDING].workerInputFingerprint,runtimeAccepted:false,supersededPublication:previous,supersededChain:previous.supersededChain,...runEvidence('.github/workflows/publish-rcap-render-worker.yml','Publish RCAP render worker',workflowSourceSha,1001,`SYNTHETIC BUILD ${source} ${digest}`)};
  const published=advancePinnedRecords(root,e);assert.equal(published.status,'AWAITING_WORKER_ACCEPTANCE');assert.equal(published.current,false);assert.equal(verifyPinnedPublication(root).current,true);assert.equal(verifyPinnedPublication(root).runtimeAccepted,false);assert.notEqual(workflowSourceSha,source);
  assert.equal(verifyReleaseCandidateBinding(root,read(CANDIDATE)).bindingVerified,true);
  execFileSync(process.execPath,['scripts/verify-rcap-worker-source-binding-exception.mjs'],{cwd:root,stdio:'pipe'});
  execFileSync(process.execPath,['scripts/verify-rcap-worker-source-binding-exception.mjs','--mutations'],{cwd:root,stdio:'pipe'});
  for(const fn of [p=>p.sourceSha=base,p=>p.immutableRegistryDigest='sha256:'+'b'.repeat(64),p=>p.workflowSourceSha=source,p=>p.runtimeAccepted=true,p=>p.requestedIntegrationSha='',p=>p.tagReplacementAuthorization='invented',p=>p.supersededChain=[],p=>p.supersededPublication.status='altered',p=>p.nativeRunMetadata.sha256='0'.repeat(64)])mutate(PUBLICATION,fn);
  const nativeRun=e.nativeRunMetadata.path;mutate(nativeRun,p=>p.head_sha=source);
  mutate(e.nativeJobMetadata.path,p=>p.jobs[0].steps[1].conclusion='failure');
  git(['add','-f','--',PENDING,CANDIDATE,TOOLS,PUBLICATION,prefix]);commit('synthetic real-publication fixture');
  const acceptanceSha=git(['rev-parse','HEAD']);
  const acceptance={sourceSha:source,tag:source,digest,readOnly:true,conclusion:'success',workflowSourceSha:acceptanceSha,runId:2001,runAttempt:1,...runEvidence('.github/workflows/rcap-worker-image-acceptance.yml','RCAP worker image acceptance',acceptanceSha,2001,[`accepting ${e.digestPinnedReference} built from ${source}`,`tag currently resolves to: ${digest}`,'anonymous token refused with HTTP 401','SOURCE BINDING: PASS','OCI REVISION: PRESENT','config env matches: 0','layer history matches: 0','acceptance is read-only: no push, no deploy, no claim'].join('\n'))};
  acceptance.verificationReceipt=ref(prefix+'2001/receipt.json',JSON.stringify({runId:2001,jobId:2002,workflowSourceSha:acceptanceSha,sourceSha:source,digest,readOnly:true,conclusion:'success'}));
  const accepted=advancePinnedRecords(root,{...e,runtimeAccepted:true,imageAcceptance:acceptance});assert.equal(accepted.status,'SUCCESSOR_ACCEPTED_PREVIEW_AND_RESUME_PENDING');assert.equal(accepted.runtimeAccepted,true);assert.equal(accepted.current,false);assert.equal(accepted.productionAuthorized,false);assert.throws(()=>requireCurrentReleaseCandidate(root));
  assert.equal(verifyReleaseCandidateBinding(root,read(CANDIDATE)).bindingVerified,true);
  for(const fn of [p=>delete p.imageAcceptance,p=>p.imageAcceptance.conclusion='failure',p=>p.imageAcceptance.sourceSha=base,p=>p.imageAcceptance.digest='sha256:'+'c'.repeat(64),p=>p.imageAcceptance.workflowSourceSha=source,p=>p.imageAcceptance.verificationReceipt.sha256='0'.repeat(64)])mutate(PUBLICATION,fn);
  mutate(acceptance.verificationReceipt.path,p=>p.sourceSha=base);
  mutate(acceptance.nativeJobMetadata.path,p=>p.jobs[0].steps[1].conclusion='failure');
  mutate(acceptance.nativeRunMetadata.path,p=>p.conclusion='failure');
  assert.throws(()=>advancePinnedRecords(root,e),/replayed/);
  console.log(`SYNTHETIC pinned-lifecycle refusals: ${refusals}`);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('explicit review bases resolve, require ancestry, and refuse deletion or rename',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-source-range-'));
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:'pipe'}).trim();
 try{
  git(['init','--quiet']);git(['config','user.name','Synthetic Test']);git(['config','user.email','synthetic@example.test']);
  const commit=()=>{git(['add','--','product.txt']);git(['commit','--quiet','-m','synthetic product']);return git(['rev-parse','HEAD']);};
  fs.writeFileSync(path.join(root,'product.txt'),'base\n');const rangeBase=commit();
  fs.writeFileSync(path.join(root,'product.txt'),'source\n');const sourceSha=commit();
  const options={sourceSha,parent:rangeBase,sourceRangeBaseSha:rangeBase};
  assert.deepEqual(reviewedSourceFiles(root,options),['product.txt']);
  const unrelated=git(['commit-tree',`${sourceSha}^{tree}`,'-m','synthetic unrelated root']);
  for(const wrong of ['main',rangeBase.slice(0,12),'0'.repeat(40),unrelated,null])assert.throws(()=>reviewedSourceFiles(root,{...options,sourceRangeBaseSha:wrong}));
  git(['mv','product.txt','renamed.txt']);git(['commit','--quiet','-m','synthetic rename']);
  assert.throws(()=>reviewedSourceFiles(root,{...options,sourceSha:git(['rev-parse','HEAD'])}),/deletions cannot be represented/);
  git(['rm','renamed.txt']);git(['commit','--quiet','-m','synthetic deletion']);
  assert.throws(()=>reviewedSourceFiles(root,{...options,sourceSha:git(['rev-parse','HEAD'])}),/deletions cannot be represented/);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('publication ancestry, exact checkout and immutable tag overwrite guards remain present',()=>{
 const workflow=fs.readFileSync('.github/workflows/publish-rcap-render-worker.yml','utf8');
 assert(workflow.includes('git merge-base --is-ancestor'));assert(workflow.includes('RELEASE_INTEGRATION_BRANCH: captain-release'));
 assert(workflow.includes('git checkout --detach "$WORKER_BUILD_SHA"'));
 assert.equal((workflow.match(/verify-rcap-worker-tag-integrity\.mjs --guard/g)??[]).length,2);
});
