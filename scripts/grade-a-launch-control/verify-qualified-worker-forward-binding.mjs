// Reuse the accepted canonical plan and actual qualified image; no provider operation or permission upgrade.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {admitQualifiedWorkerImage,QUALIFIED_WORKER_IMAGE} from '../worker-once-preparation/qualified-worker-image.mjs';
import {applicationInputEquivalence,applicationInputManifest} from '../rcap-application-inputs.mjs';
export const QUALIFIED_FORWARD_APP='4c189b682d0a9225a21b9fdf8a2ebc50500029d6';
const PUBLIC_PAGE_APP='68784f1d89c1f2120a7f4c385569f8918d1492d1';
const QUALIFIED_BASELINE_APP='ed8d0902a99c5326f75987a942eb507b6cfb16cf';
const PRIOR_CONTROLLER='165be1485de8002496b0b36e406ec3a31980f974';
export const QUALIFIED_FORWARD_FINGERPRINT='sha256:6d082ab7f7f07745a0e69a886fb59e9d396e3aa29233422a072b16edbd794cc2';
const DIR='data/rcap-grade-a/launch-control/',PLAN=DIR+'QUALIFIED_WORKER_SOURCE_EQUIVALENCE.json';
const records=['PENDING_WORKER_SUCCESSOR','RELEASE_CANDIDATE_BINDING','HOSTED_TOOLS_BINDING'].map(n=>DIR+n+'.json');
const hash=b=>createHash('sha256').update(b).digest('hex');
export function verifyQualifiedWorkerForwardBinding(root,candidate){
 try{
  const read=p=>fs.readFileSync(path.join(root,p));
  const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024}).trim();
  const at=(sha,p)=>execFileSync('git',['show',sha+':'+p],{cwd:root,maxBuffer:64*1024*1024});
  const native=n=>read('scripts/dtc-qualified-worker-'+n+'.json');
  const identity=admitQualifiedWorkerImage({publicationBytes:native('publication'),publicationRun:JSON.parse(native('publication-run')),qualificationBytes:native('qualification'),qualificationAcceptanceBytes:native('qualification-acceptance')});
  assert.equal(identity,QUALIFIED_WORKER_IMAGE);
  const planBytes=read(PLAN);assert.equal(hash(planBytes),'0f2153d9bcf7da350b80e209118aa615fd97a37f668e7740765296d389d319fa');
  const plan=JSON.parse(planBytes);
  assert.equal(plan.candidateSha,QUALIFIED_BASELINE_APP);assert.equal(plan.acceptedSourceSha,identity.source);assert.equal(plan.acceptedDigest,identity.digest);
  assert.equal(plan.comparedInputs.length,116);assert.equal(plan.rebuildRequired,false);assert.deepEqual(plan.changedPaths,[]);assert.deepEqual(plan.missingCanonicalInputs,[]);assert.equal(plan.aggregateInputSha256,QUALIFIED_FORWARD_FINGERPRINT);
  const compatibilityPath=DIR+'QUALIFIED_WORKER_APP_COMPATIBILITY.json',proofPath=DIR+'QUALIFIED_WORKER_IMPORT_CLOSURE.json';
  const compatibilityBytes=read(compatibilityPath),compatibility=JSON.parse(compatibilityBytes),proofBytes=read(proofPath),proof=JSON.parse(proofBytes);
  assert.equal(hash(proofBytes),'e8e8e2bad83c9b307e589f2f6b3944862345564fcfeef7ee0f41422eb7fa24d0');
  assert.equal(compatibility.schemaVersion,'rcap-exact-publication-metadata-worker-compatibility/v1');assert.equal(compatibility.applicationSha,QUALIFIED_FORWARD_APP);assert.equal(compatibility.baselineApplicationSha,QUALIFIED_BASELINE_APP);
  assert.equal(compatibility.workerSourceSha,identity.source);assert.equal(compatibility.workerDigest,identity.digest);assert.equal(compatibility.workerSourceFingerprint,QUALIFIED_FORWARD_FINGERPRINT);
  assert.equal(compatibility.canonicalSourceEquivalent,false);assert.equal(compatibility.canonicalRebuildRequired,true);assert.equal(compatibility.candidateCanonicalFingerprint,null);assert.equal(compatibility.workerExecutableClosureChanged,false);assert.equal(compatibility.legalAndRenderDataChanged,false);
  assert.deepEqual(compatibility.futureCreator,{deploymentId:null,url:null,runId:null,nativeSha256:null});assert.equal(compatibility.customerRuntimeAccepted,false);assert.equal(compatibility.workerClaimAuthorized,false);
  assert.deepEqual(compatibility.qualifiedImportProof,{path:proofPath,sha256:hash(proofBytes)});assert.deepEqual(proof.unresolved,[]);assert.equal(proof.source,identity.source);assert.equal(proof.app,PUBLIC_PAGE_APP);assert.equal(proof.baseline,QUALIFIED_BASELINE_APP);
  const changed=['src/app/p/[partnerSlug]/page.tsx','src/lib/partners/onboarding/public-page-configuration.ts'];assert.deepEqual(git(['diff','--name-only',QUALIFIED_BASELINE_APP,PUBLIC_PAGE_APP]).split('\n').filter(Boolean).sort(),changed.slice().sort());
  assert.deepEqual(compatibility.changes,proof.scope);assert.equal(proof.scope.length,2);
  for(const entry of proof.scope){assert(changed.includes(entry.path));assert.equal(entry.inQualifiedWorkerImportClosure,false);assert(!Object.hasOwn(proof.closure,entry.path));assert.equal(git(['rev-parse',identity.source+':'+entry.path]),entry.qualifiedBlob);assert.equal(git(['rev-parse',PUBLIC_PAGE_APP+':'+entry.path]),entry.appBlob);}
  assert.equal(compatibility.publicPageApplicationSha,PUBLIC_PAGE_APP);
  const publicationPath=DIR+'QUALIFIED_WORKER_PUBLICATION_COMPATIBILITY.json',publicationBytes=read(publicationPath),publicationProof=JSON.parse(publicationBytes);
  assert.equal(hash(publicationBytes),'a3ba0bd62554edfc72a4197b8fe28d84e58c08ade42444aabce47b40936bd2ea');assert.deepEqual(compatibility.publicationOnlyProof,{path:publicationPath,sha256:hash(publicationBytes)});
  assert.equal(publicationProof.applicationSha,QUALIFIED_FORWARD_APP);assert.equal(publicationProof.baselineApplicationSha,PUBLIC_PAGE_APP);assert.equal(publicationProof.qualifiedWorkerSourceSha,identity.source);assert.equal(publicationProof.qualifiedWorkerDigest,identity.digest);
  const publicationChanges=['data/rcap-grade-a/fulfillment-authority-projection.json','data/rcap-grade-a/fulfillment-authority-registry.json','data/rcap-grade-a/fulfillment-observation-snapshot.json','data/rcap-render/worker-publication-evidence.json','scripts/generate-rcap-grade-a-fulfillment-authority.mjs'];
  assert.deepEqual(git(['diff','--name-only',PUBLIC_PAGE_APP,QUALIFIED_FORWARD_APP]).split('\n').filter(Boolean).sort(),publicationChanges.slice().sort());
  assert.deepEqual(publicationProof.changes.map(e=>e.path).sort(),publicationChanges.slice().sort());
  for(const entry of publicationProof.changes){assert.equal(entry.inQualifiedWorkerImportClosure,false);assert(!Object.hasOwn(proof.closure,entry.path));assert.equal(hash(at(PUBLIC_PAGE_APP,entry.path)),entry.baselineSha256);assert.equal(hash(at(QUALIFIED_FORWARD_APP,entry.path)),entry.applicationSha256);}
  const staticPath='data/rcap-grade-a/worker-static-authority.json',staticSha='c69f70f7f13a55253c143aba86490922812c53510f8f7d50fb24fa0e91986a55';
  for(const source of [identity.source,PUBLIC_PAGE_APP,QUALIFIED_FORWARD_APP])assert.equal(hash(at(source,staticPath)),staticSha);
  for(const [name,pin]of Object.entries(publicationProof.nativeEvidence))assert.equal(hash(native(name)),pin);
  const publicationEvidence=JSON.parse(at(QUALIFIED_FORWARD_APP,'data/rcap-render/worker-publication-evidence.json'));
  assert.equal(publicationEvidence.sourceSha,identity.source);assert.equal(publicationEvidence.immutableRegistryDigest,identity.digest);assert.equal(publicationEvidence.workflowConclusion,'success');assert.equal(publicationEvidence.runtimeAccepted,true);assert.equal(publicationEvidence.imageAcceptance.sourceSha,identity.source);assert.equal(publicationEvidence.imageAcceptance.digest,identity.digest);assert.equal(publicationEvidence.imageAcceptance.runId,40505631029);
  const compatibilityBinding={path:compatibilityPath,sha256:hash(compatibilityBytes)};
  assert.match(candidate.toolsSha??'',/^[a-f0-9]{40}$/);
  const expected={applicationSha:QUALIFIED_FORWARD_APP,workerSourceSha:identity.source,workerDigest:identity.digest,workerInputFingerprint:QUALIFIED_FORWARD_FINGERPRINT,toolsSha:candidate.toolsSha};
  const publication={runId:40504068956,workflowSourceSha:identity.source,artifactId:12733289924,digest:identity.digest};
  const acceptance={runId:40505631029,jobId:122194096589,workflowSourceSha:'7fe7265f9bb3d2f1dfb481d87e6faa54c26768bc',digest:identity.digest};
  for(const rel of records){
   const r=JSON.parse(read(rel));for(const[k,v]of Object.entries(expected))assert.equal(r[k],v,rel+':'+k);
   assert.equal(r.status,'FORWARD_BOUND_HOSTED_PENDING');assert.equal(r.runtimeAccepted,true);assert.equal(r.workerRebuildRequired,true);assert.deepEqual(r.workerCompatibility,compatibilityBinding);assert.equal(r.previewExecution,'held');
   assert.equal(r.productionAuthorized,false);assert.equal(r.productionAuthorization,null);assert.equal(r.deploymentAuthorized,false);assert.equal(r.hostedAdmission,null);assert.equal(r.resume,null);assert.equal(r.clinicDispatchReady,false);
   assert.deepEqual(r.publication,publication);assert.deepEqual(r.readOnlyImageAcceptance,acceptance);
   assert.equal(r.releaseBaseSha,PRIOR_CONTROLLER);const prior=at(PRIOR_CONTROLLER,rel);assert.deepEqual(r.supersededRecord,JSON.parse(prior));assert.equal(r.supersededRecordSha256,hash(prior));
  }
  git(['merge-base','--is-ancestor',QUALIFIED_FORWARD_APP,candidate.toolsSha]);git(['merge-base','--is-ancestor',candidate.toolsSha,'HEAD']);
  assert.equal(git(['diff','--name-only',QUALIFIED_FORWARD_APP,'HEAD','--',...plan.comparedInputs]),'','current application inputs remain frozen');
  assert(applicationInputEquivalence(root,QUALIFIED_FORWARD_APP,'HEAD').equivalent,'exact frozen application');
  const runtime=new Set(applicationInputManifest(root,QUALIFIED_FORWARD_APP).files.map(f=>f.path));assert(git(['diff','--name-only',QUALIFIED_FORWARD_APP]).split('\n').every(p=>!runtime.has(p)),'working application unchanged');
  const tools=JSON.parse(read(records[2])),manifest=tools.successorTools;assert.equal(manifest.baseSha,QUALIFIED_FORWARD_APP);
  const delta=git(['diff','--name-only',QUALIFIED_FORWARD_APP,candidate.toolsSha]).split('\n').filter(p=>p.startsWith('scripts/')||p.startsWith('.github/')).sort();assert.deepEqual(Object.keys(manifest.files).sort(),delta);
  for(const[p,pin]of Object.entries(manifest.files)){assert.equal(hash(at(candidate.toolsSha,p)),pin);assert.equal(hash(read(p)),pin,'frozen controls '+p);}
  for(const p of [PLAN,compatibilityPath,proofPath,publicationPath])assert.equal(hash(read(p)),hash(at(candidate.toolsSha,p)));
  const allowed=new Set(records);assert(git(['diff','--name-only',candidate.toolsSha]).split('\n').filter(Boolean).every(p=>allowed.has(p)),'only three controller records after frozen tools');
  const untracked=git(['ls-files','--others','--exclude-standard','--','scripts','.github','src','data']).split('\n').filter(Boolean);assert(untracked.every(p=>allowed.has(p)),'no unbound source');
  return {...expected,current:false,bindingVerified:true,status:'FORWARD_BOUND_HOSTED_PENDING',productionAuthorized:false,reasons:['Existing qualified worker retained by preserved public-page and exact publication-only compatibility proofs; canonical source differs. Preview creation only, no customer runtime or worker claim acceptance.']};
 }catch(error){return {current:false,bindingVerified:false,status:'INVALID_QUALIFIED_WORKER_FORWARD_BINDING',reasons:[error.message]};}
}
