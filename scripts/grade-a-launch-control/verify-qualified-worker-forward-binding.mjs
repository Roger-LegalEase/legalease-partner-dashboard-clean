// Reuse the accepted canonical plan and actual qualified image; no provider operation or permission upgrade.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {admitQualifiedWorkerImage,QUALIFIED_WORKER_IMAGE} from '../worker-once-preparation/qualified-worker-image.mjs';
import {applicationInputEquivalence,applicationInputManifest} from '../rcap-application-inputs.mjs';
export const QUALIFIED_FORWARD_APP='ed8d0902a99c5326f75987a942eb507b6cfb16cf';
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
  assert.equal(plan.candidateSha,QUALIFIED_FORWARD_APP);assert.equal(plan.acceptedSourceSha,identity.source);assert.equal(plan.acceptedDigest,identity.digest);
  assert.equal(plan.comparedInputs.length,116);assert.equal(plan.rebuildRequired,false);assert.deepEqual(plan.changedPaths,[]);assert.deepEqual(plan.missingCanonicalInputs,[]);assert.equal(plan.aggregateInputSha256,QUALIFIED_FORWARD_FINGERPRINT);
  assert.match(candidate.toolsSha??'',/^[a-f0-9]{40}$/);
  const expected={applicationSha:QUALIFIED_FORWARD_APP,workerSourceSha:identity.source,workerDigest:identity.digest,workerInputFingerprint:QUALIFIED_FORWARD_FINGERPRINT,toolsSha:candidate.toolsSha};
  const publication={runId:40504068956,workflowSourceSha:identity.source,artifactId:12733289924,digest:identity.digest};
  const acceptance={runId:40505631029,jobId:122194096589,workflowSourceSha:'7fe7265f9bb3d2f1dfb481d87e6faa54c26768bc',digest:identity.digest};
  for(const rel of records){
   const r=JSON.parse(read(rel));for(const[k,v]of Object.entries(expected))assert.equal(r[k],v,rel+':'+k);
   assert.equal(r.status,'FORWARD_BOUND_HOSTED_PENDING');assert.equal(r.runtimeAccepted,true);assert.equal(r.workerRebuildRequired,false);assert.equal(r.previewExecution,'held');
   assert.equal(r.productionAuthorized,false);assert.equal(r.productionAuthorization,null);assert.equal(r.deploymentAuthorized,false);assert.equal(r.hostedAdmission,null);assert.equal(r.resume,null);assert.equal(r.clinicDispatchReady,false);
   assert.deepEqual(r.publication,publication);assert.deepEqual(r.readOnlyImageAcceptance,acceptance);
   assert.equal(r.releaseBaseSha,QUALIFIED_FORWARD_APP);const prior=at(QUALIFIED_FORWARD_APP,rel);assert.deepEqual(r.supersededRecord,JSON.parse(prior));assert.equal(r.supersededRecordSha256,hash(prior));
  }
  git(['merge-base','--is-ancestor',QUALIFIED_FORWARD_APP,candidate.toolsSha]);git(['merge-base','--is-ancestor',candidate.toolsSha,'HEAD']);
  assert.equal(git(['diff','--name-only',QUALIFIED_FORWARD_APP,'HEAD','--',...plan.comparedInputs]),'','current worker inputs remain qualified');
  assert(applicationInputEquivalence(root,QUALIFIED_FORWARD_APP,'HEAD').equivalent,'exact frozen application');
  const runtime=new Set(applicationInputManifest(root,QUALIFIED_FORWARD_APP).files.map(f=>f.path));assert(git(['diff','--name-only',QUALIFIED_FORWARD_APP]).split('\n').every(p=>!runtime.has(p)),'working application unchanged');
  const tools=JSON.parse(read(records[2])),manifest=tools.successorTools;assert.equal(manifest.baseSha,QUALIFIED_FORWARD_APP);
  const delta=git(['diff','--name-only',QUALIFIED_FORWARD_APP,candidate.toolsSha]).split('\n').filter(p=>p.startsWith('scripts/')||p.startsWith('.github/')).sort();assert.deepEqual(Object.keys(manifest.files).sort(),delta);
  for(const[p,pin]of Object.entries(manifest.files)){assert.equal(hash(at(candidate.toolsSha,p)),pin);assert.equal(hash(read(p)),pin,'frozen controls '+p);}
  assert.equal(hash(read(PLAN)),hash(at(candidate.toolsSha,PLAN)));
  const allowed=new Set(records);assert(git(['diff','--name-only',candidate.toolsSha]).split('\n').filter(Boolean).every(p=>allowed.has(p)),'only three controller records after frozen tools');
  const untracked=git(['ls-files','--others','--exclude-standard','--','scripts','.github','src','data']).split('\n').filter(Boolean);assert(untracked.every(p=>allowed.has(p)),'no unbound source');
  return {...expected,current:false,bindingVerified:true,status:'FORWARD_BOUND_HOSTED_PENDING',productionAuthorized:false,reasons:['Qualified image and frozen application bound for Preview creation only; actual final Preview and Start evidence remain required.']};
 }catch(error){return {current:false,bindingVerified:false,status:'INVALID_QUALIFIED_WORKER_FORWARD_BINDING',reasons:[error.message]};}
}
