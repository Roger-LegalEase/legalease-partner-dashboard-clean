// All newly created run IDs/digests below are SYNTHETIC LOCAL FIXTURES, never
// publication or acceptance evidence for a real release.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {PENDING,PUBLICATION,CANDIDATE,TOOLS,verifyPinnedSuccessor,verifyPinnedPublication,verifyPinnedBinding,assertCommittedPredecessor,reviewedSourceFiles,rehearsalContainment} from './verify-pinned-worker-successor.mjs';
import {pinnedRecords,writePinnedRecords,advancePinnedRecords} from './prepare-pinned-worker-successor.mjs';
import {successorResponsibilities,verifySuccessorResponsibilities} from './pinned-successor-responsibilities.mjs';
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
  const extra=['scripts/grade-a-launch-control/pinned-successor-responsibilities.mjs','scripts/grade-a-launch-control/verify-historical-release.mjs','scripts/grade-a-launch-control/verify-pinned-worker-successor.mjs','scripts/grade-a-launch-control/prepare-pinned-worker-successor.mjs','scripts/grade-a-launch-control/verify-pinned-worker-successor.test.mjs','scripts/rcap-worker-identity-readonly.mjs','scripts/rcap-worker-identity-readonly.test.mjs','.github/workflows/rcap-worker-identity-readonly.yml'];
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
  for(const fn of [p=>p.sourceSha=base,p=>p.immutableRegistryDigest='sha256:'+'b'.repeat(64),p=>p.workflowSourceSha=source,p=>p.runtimeAccepted=true,p=>p.requestedIntegrationSha='',p=>p.tagReplacementAuthorization='invented',p=>p.supersededChain=[],p=>p.supersededPublication.status='altered',p=>p.nativeRunMetadata.sha256='0'.repeat(64),p=>p.containedIn='pull/268',p=>p.rehearsalOnly=true])mutate(PUBLICATION,fn);
  { // A candidate publication of an open pull request is held as rehearsal-only: identical identity checks, never a current release publication.
   const rehearsalArtifact={...artifact,containedIn:'pull/268'};const rehearsalOriginal=ref(prefix+'rehearsal/rcap-render-worker-publication.json',JSON.stringify(rehearsalArtifact));
   const rehearsalArchive=prefix+'rehearsal/publication.zip';execFileSync('zip',['-q','-j',path.join(root,rehearsalArchive),path.join(root,rehearsalOriginal.path)]);const rehearsalBytes=fs.readFileSync(path.join(root,rehearsalArchive));
   const before=fs.readFileSync(path.join(root,PUBLICATION));
   write(PUBLICATION,{...e,containedIn:'pull/268',rehearsalOnly:true,originalPublicationPath:rehearsalOriginal.path,originalPublicationBytes:rehearsalOriginal.bytes,originalPublicationSha256:rehearsalOriginal.sha256,originalArchivePath:rehearsalArchive,nativeArchive:{path:rehearsalArchive,bytes:rehearsalBytes.length,sha256:hash(rehearsalBytes)},publicationArtifactSha256:'sha256:'+hash(rehearsalBytes)});
   const held=verifyPinnedPublication(root);assert.equal(held.current,false,JSON.stringify(held));assert.equal(held.rehearsalOnly,true,JSON.stringify(held));assert.equal(held.workerDigest,digest);
   const pending=verifyPinnedSuccessor(root);assert.equal(pending.current,false);assert.equal(pending.rehearsalOnly,true);assert.equal(pending.status,'AWAITING_WORKER_ACCEPTANCE');assert.match(pending.reasons.join(),/rehearsal-only/);
   assert.throws(()=>requireCurrentReleaseCandidate(root),'a rehearsal-only candidate publication must never become the release candidate');
   fs.writeFileSync(path.join(root,PUBLICATION),before);fs.rmSync(path.join(root,prefix+'rehearsal'),{recursive:true,force:true});assert.equal(verifyPinnedPublication(root).current,true);
  }
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

test('explicit review bases require ancestry and enumerate the complete deletion and rename delta',()=>{
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
  assert.deepEqual(reviewedSourceFiles(root,{...options,sourceSha:git(['rev-parse','HEAD'])}),['product.txt','renamed.txt']);
  git(['rm','renamed.txt']);git(['commit','--quiet','-m','synthetic deletion']);
  assert.deepEqual(reviewedSourceFiles(root,{...options,sourceSha:git(['rev-parse','HEAD'])}),['product.txt']);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('rehearsal containment admits pull/<number> only with the rehearsal-only mark and never relabels a release',()=>{
 assert.equal(rehearsalContainment({containedIn:'captain-release'}),false);
 assert.equal(rehearsalContainment({containedIn:'pull/268',rehearsalOnly:true}),true);
 assert.throws(()=>rehearsalContainment({containedIn:'pull/268'}),/rehearsal-only import/);
 assert.throws(()=>rehearsalContainment({containedIn:'captain-release',rehearsalOnly:true}),/cannot be marked rehearsal-only/);
 for(const containedIn of ['main','pull/','pull/268x','refs/pull/268/head',undefined])assert.throws(()=>rehearsalContainment({containedIn,rehearsalOnly:true}),/captain-release or pull/);
});

test('publication ancestry, exact checkout and immutable tag overwrite guards remain present',()=>{
 const workflow=fs.readFileSync('.github/workflows/publish-rcap-render-worker.yml','utf8');
 assert(workflow.includes('git merge-base --is-ancestor'));assert(workflow.includes('RELEASE_INTEGRATION_BRANCH: captain-release'));
 assert(workflow.includes('git checkout --detach "$WORKER_BUILD_SHA"'));
 assert.equal((workflow.match(/verify-rcap-worker-tag-integrity\.mjs --guard/g)??[]).length,2);
});


test('successor custody preserves deleted source and separately binds narrow runtime replacements',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'rcap-responsibility-custody-'));
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:'pipe'}).trim();
 const pendingPaths=new Set();
 const write=(rel,bytes)=>{fs.mkdirSync(path.dirname(path.join(root,rel)),{recursive:true});fs.writeFileSync(path.join(root,rel),bytes);pendingPaths.add(rel);};
 const commit=message=>{git(['add','--',...pendingPaths]);pendingPaths.clear();git(['commit','--quiet','-m',message]);return git(['rev-parse','HEAD']);};
 const oldBase='94003a1a5b2059eb3a8d8978e68056f05071dc4a';
 const prefix='data/rcap-all50/overlays/census-v1/ca/ca-prop64-set--official-pdf-fill/fixtures/hs-11361-8-completed-sentence-application-boundary/';
 const deleted=[prefix+'cr-401-unchanged-official.pdf',prefix+'cr-403-unchanged-official.pdf'];
 const oldBytes=Object.fromEntries(deleted.map(rel=>[rel,execFileSync('git',['show',`${oldBase}:${rel}`])]));
 let refusals=0;
 try{
  git(['init','--quiet']);git(['config','user.name','Synthetic Test']);git(['config','user.email','synthetic@example.test']);
  for(const rel of deleted)write(rel,oldBytes[rel]);
  write(PUBLICATION,'{}\n');write('src/app/page.ts',`export const publication = '${PUBLICATION}';\n`);
  write('product.txt','historical product\n');
  for(const rel of ['.github/workflows/publish-rcap-render-worker.yml','.github/workflows/rcap-worker-image-acceptance.yml'])write(rel,'# Synthetic workflow custody bytes only\n');
  const releaseBaseSha=commit('synthetic historical source with real preserved fixture bytes');
  for(const rel of deleted){fs.unlinkSync(path.join(root,rel));pendingPaths.add(rel);}
  write(PUBLICATION,'{"syntheticHistoricalSource":true}\n');write('product.txt',Buffer.alloc(1024*1024+137,'s'));
  const sourceSha=commit('synthetic reviewed source removes historical copies');
  const reviewedFiles=Object.fromEntries([...deleted.map(rel=>[rel,{deleted:true,sha256:hash(oldBytes[rel])}]),
   ...[PUBLICATION,'product.txt'].map(rel=>[rel,hash(fs.readFileSync(path.join(root,rel)))])]);
  const originalSourceCustody=structuredClone(reviewedFiles);
  assert(fs.statSync(path.join(root,'product.txt')).size>1024*1024,'real Git blob custody exceeds the default child-process buffer');
  const evidence='hosted-acceptance-evidence/worker/synthetic-responsibility-custody/';
  const ref=name=>{const rel=evidence+name,bytes=JSON.stringify({synthetic:true,notNativeEvidence:true,name});write(rel,bytes);return {path:rel,bytes:Buffer.byteLength(bytes),sha256:hash(bytes)};};
  const publication={sourceSha,runtimeAccepted:true,immutableRegistryDigest:digest,workflowSourceSha:sourceSha,
   nativeArchive:ref('archive.txt'),nativeRunMetadata:ref('run.json'),nativeJobMetadata:ref('jobs.json'),nativeLog:ref('log.txt')};
  const original=ref('original.json');Object.assign(publication,{originalPublicationPath:original.path,originalPublicationBytes:original.bytes,originalPublicationSha256:original.sha256});
  publication.imageAcceptance={sourceSha,digest,conclusion:'success',workflowSourceSha:sourceSha,verificationReceipt:ref('receipt.json')};
  write(PUBLICATION,JSON.stringify(publication));
  const applicationSha=commit('synthetic runtime publication and scoped native-file custody');
  const control='scripts/grade-a-launch-control/synthetic-custody-control.mjs';write(control,'// Synthetic bounded control.\n');
  const toolsSha=commit('synthetic bounded tooling');
  const options={releaseBaseSha,sourceSha,toolsSha,applicationSha,reviewedFiles};
  const categories=successorResponsibilities(root,options);
  assert.deepEqual(reviewedFiles,originalSourceCustody,'classification preserves original source hashes and deletion objects');
  assert.equal(categories.inputs.runtimeFiles[PUBLICATION],hash(fs.readFileSync(path.join(root,PUBLICATION))));
  assert.notEqual(categories.inputs.runtimeFiles[PUBLICATION],reviewedFiles[PUBLICATION],'old source bytes and new runtime bytes are distinct');
  assert.deepEqual(Object.keys(categories.controlFiles),[control]);
  for(const rel of deleted)assert(!Object.hasOwn(categories.inputs.runtimeFiles,rel)&&!Object.hasOwn(categories.controlFiles,rel),'deletion creates no runtime or control authority');
  const pending={releaseBaseSha,sourceCommit:sourceSha,files:reviewedFiles};
  const tools={toolsSha,successorInputs:categories.inputs,successorTools:{files:categories.controlFiles}};
  assert.deepEqual(verifySuccessorResponsibilities(root,pending,tools),categories.inputs);
  const refuse=(fn,reason)=>{assert.throws(fn,reason);refusals++;};
  for(const rel of deleted){
   const missing=structuredClone(reviewedFiles);delete missing[rel];
   refuse(()=>successorResponsibilities(root,{...options,reviewedFiles:missing}),/requires reviewed source custody/);
   const changed=structuredClone(reviewedFiles);changed[rel].deleted=false;
   refuse(()=>successorResponsibilities(root,{...options,reviewedFiles:changed}),/requires reviewed source custody/);
  }
  for(const field of ['runtimeFiles','nativeFiles']){
   const changed=structuredClone(tools),rel=Object.keys(changed.successorInputs[field])[0];delete changed.successorInputs[field][rel];
   refuse(()=>verifySuccessorResponsibilities(root,pending,changed),/complete runtime\/native\/executed responsibility manifest/);
  }
  for(const [rel,bytes,reason]of [
   ['product.txt','unreviewed product change\n',/unclassified successor path/],
   ['data/rcap-grade-a/unclassified-custody.json','{}\n',/unclassified successor path/],
   [PUBLICATION,'{"syntheticWrongRuntime":true}\n',/frozen application input/],
   [publication.nativeRunMetadata.path,'{"syntheticChangedNative":true}\n',/frozen application input/],
  ]){
   try{write(rel,bytes);const changed=commit('synthetic forbidden post-application change');refuse(()=>successorResponsibilities(root,{...options,toolsSha:changed}),reason);}
   finally{git(['reset','--hard',toolsSha]);} // Only this disposable synthetic repository.
  }
  try{
   fs.chmodSync(path.join(root,'product.txt'),0o755);pendingPaths.add('product.txt');const modeChanged=commit('synthetic forbidden source file-mode change');
   assert.equal(git(['rev-parse',`${sourceSha}:product.txt`]),git(['rev-parse',`${modeChanged}:product.txt`]),'mode-only change keeps the same file bytes');
   assert.match(git(['diff','--summary',sourceSha,modeChanged,'--','product.txt']),/mode change 100644 => 100755/);
   refuse(()=>successorResponsibilities(root,{...options,toolsSha:modeChanged}),/unclassified successor path/);
  }finally{git(['reset','--hard',toolsSha]);} // Only this disposable synthetic repository.
  for(const rel of [PUBLICATION,publication.nativeRunMetadata.path]){
   const before=fs.readFileSync(path.join(root,rel));
   try{write(rel,'{"syntheticCurrentDrift":true}\n');refuse(()=>verifySuccessorResponsibilities(root,pending,tools),/frozen runtime bytes/);}
   finally{fs.writeFileSync(path.join(root,rel),before);pendingPaths.clear();}
  }
  for(const rel of deleted){
   try{write(rel,oldBytes[rel]);const restored=commit('synthetic forbidden deleted-source restoration');refuse(()=>successorResponsibilities(root,{...options,toolsSha:restored}),/deleted source|deletion|unclassified successor path/);}
   finally{git(['reset','--hard',toolsSha]);} // Only this disposable synthetic repository.
  }
  try{write(deleted[0],oldBytes[deleted[0]]);refuse(()=>successorResponsibilities(root,options),/deleted source cannot reappear in worktree/);}
  finally{fs.unlinkSync(path.join(root,deleted[0]));pendingPaths.clear();}
  assert.deepEqual(successorResponsibilities(root,options),categories,'positive restored after all semantic negatives');
  console.log(JSON.stringify({scope:'SYNTHETIC RESPONSIBILITY CUSTODY ONLY',realHistoricalFixtureBytes:deleted.length,refusals,nativeExecuted:false,authorityCreated:false}));
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
