// A commit cannot contain its own SHA. The source pointer is the exact Git
// commit which introduced this pending record, resolved through Git history;
// the recorded parent, exact delta and fingerprints make it non-floating.
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';import {createWorkerInputPlan,aggregateCanonicalInputs} from '../rcap-hosted-acceptance-worker-input-plan.mjs';
export const PENDING='data/rcap-grade-a/launch-control/PENDING_WORKER_SUCCESSOR.json';
export function verifyPendingWorkerSuccessor(root){
 const file=path.join(root,PENDING);if(!fs.existsSync(file))return null;
 const git=a=>execFileSync('git',a,{cwd:root,encoding:'utf8',stdio:'pipe'}).trim();
 try{
 const p=JSON.parse(fs.readFileSync(file));
 const accepted=p.status==='SUCCESSOR_ACCEPTED_PREVIEW_AND_RESUME_PENDING';
 const published=accepted||p.status==='AWAITING_WORKER_ACCEPTANCE';
 assert.equal(p.status,accepted?'SUCCESSOR_ACCEPTED_PREVIEW_AND_RESUME_PENDING':published?'AWAITING_WORKER_ACCEPTANCE':'AWAITING_WORKER_PUBLICATION');assert.equal(p.sourceCommit,'commit-introducing-this-record');assert.equal(p.parent,'dc5124f99565baac004f1260e351209a4518ccf1');assert.equal(p.workerRebuildRequired,!published);assert.equal(p.publication,published?'complete':'pending');assert.equal(p.acceptance,accepted?'complete':'pending');assert.equal(p.previewExecution,'held');assert.equal(p.productionAuthorized,false);if(!published)assert.equal(p.workerDigest,null);
 const source=git(['log','--diff-filter=A','-1','--format=%H','--',PENDING]);
 const committed=Boolean(source);if(committed){assert.equal(git(['rev-parse',`${source}^`]),p.parent);if(!published)assert.equal(git(['rev-parse','HEAD']),source,'pending source must be exact HEAD');if(!published){assert.equal(git(['status','--porcelain']), '','pending source must remain clean');assert.equal(git(['show',`${source}:${PENDING}`]),fs.readFileSync(file,'utf8').trim());}}
 else assert.equal(git(['rev-parse','HEAD']),p.parent);
 for(const [rel,digest]of Object.entries(p.files)){assert.match(rel,/^(src\/|scripts\/)/);assert.equal(createHash('sha256').update(published?execFileSync('git',['show',`${source}:${rel}`],{cwd:root}):fs.readFileSync(path.join(root,rel))).digest('hex'),digest,rel);}
 const changes=git(['diff','--name-only',p.parent]).split('\n').filter(Boolean);const untracked=git(['ls-files','--others','--exclude-standard']).split('\n').filter(Boolean);const committedChanges=committed?git(['diff','--name-only',p.parent,source]).split('\n').filter(Boolean):[];
 const expected=[...Object.keys(p.files),PENDING].sort();assert.deepEqual(published?committedChanges.sort():[...new Set([...changes,...untracked,...committedChanges])].sort(),expected,'exact pending change set');
 if(published){
  assert(committed,'publication requires committed successor');
  const original=JSON.parse(git(['show',`${source}:${PENDING}`]));
  assert.deepEqual(p,{...original,status:'AWAITING_WORKER_ACCEPTANCE',publication:'complete',workerDigest:p.workerDigest,workerRebuildRequired:false,...(accepted?{status:'SUCCESSOR_ACCEPTED_PREVIEW_AND_RESUME_PENDING',acceptance:'complete',runtimeAccepted:true,applicationSha:source,workerSourceSha:source}:{})},'only publication lifecycle fields may change');
  const publication=verifySuccessorPublication(root);assert.equal(publication.current,true,publication.reasons?.join('; '));
  assert.equal(publication.sourceSha,source);assert.equal(publication.workerDigest,p.workerDigest);assert.equal(publication.workerInputFingerprint,p.workerInputFingerprint);
  assert.equal(publication.runtimeAccepted,accepted);
  const toolsPath='data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json';
  const acceptedPaths=accepted?[toolsPath,...Object.keys(JSON.parse(fs.readFileSync(path.join(root,toolsPath))).successorTools?.files??{})]:[];
  const allowed=new Set([...acceptedPaths,PENDING,'data/rcap-render/worker-publication-evidence.json','scripts/grade-a-launch-control/verify-pending-worker-successor.mjs','scripts/grade-a-launch-control/verify-pending-worker-successor.test.mjs',...publication.nativePaths]);
  const delta=git(['diff','--name-only',source]).split('\n').filter(Boolean);
  assert([...delta,...untracked].every(rel=>allowed.has(rel)),'unapproved post-source changes');
 }
 assert.equal(p.historicalWorker.sourceSha,'6ebacdcde8afdf8aa706f16b38e0646babcbdc49');assert.equal(p.historicalWorker.digest,'sha256:74b82e11aac7fa1f850ca52ba1344ca7853fa09120374a83ddb5bbc019f8cdd7');assert.equal(p.historicalWorker.fingerprint,'sha256:c202ebba08c34ce3665f69269fb913078b02188519c5196af7f3639da84dd0d8');
 const historical=createWorkerInputPlan({rootDir:root,acceptedSourceSha:p.historicalWorker.sourceSha,acceptedDigest:p.historicalWorker.digest,candidateSha:p.historicalWorker.sourceSha});assert.equal(historical.canonicalInputs.length,39);assert.deepEqual(p.canonicalWorkerInputs,historical.canonicalInputs);assert.equal(historical.aggregateInputSha256,p.historicalWorker.fingerprint);
 const tree=committed?source:git(['write-tree']);const fingerprint=aggregateCanonicalInputs(root,tree,historical.canonicalInputs);assert.equal(fingerprint,p.workerInputFingerprint);
 const workerChanged=git(['diff','--name-only',p.historicalWorker.sourceSha,tree,'--',...historical.canonicalInputs]).split('\n').filter(Boolean).sort();assert.deepEqual(workerChanged,p.workerChangedPaths);assert.deepEqual(workerChanged,['src/app/briefcase/[packetId]/page.tsx','src/components/expungement-ai/BriefcaseViews.tsx','src/lib/rcap/render/packet-delivery.ts']);
 const appChanged=git(['diff','--name-only',p.parent,tree,'--','src']).split('\n').filter(Boolean).sort();assert.deepEqual(appChanged,['src/app/briefcase/[packetId]/page.tsx','src/components/expungement-ai/BriefcaseViews.tsx','src/lib/rcap/render/packet-delivery.ts']);
 if(committed){const plan=createWorkerInputPlan({rootDir:root,acceptedSourceSha:p.historicalWorker.sourceSha,acceptedDigest:p.historicalWorker.digest,candidateSha:source});assert.equal(plan.aggregateInputSha256,p.workerInputFingerprint);assert.equal(plan.rebuildRequired,true);}
 if(accepted)return {current:true,status:p.status,applicationSha:source,workerSourceSha:source,workerDigest:p.workerDigest,workerInputFingerprint:fingerprint,runtimeAccepted:true,workerRebuildRequired:false,previewExecution:'held',productionAuthorized:false,reasons:[]};
 if(published)return {current:false,status:'AWAITING_WORKER_ACCEPTANCE',applicationSha:source,workerSourceSha:source,workerInputFingerprint:fingerprint,workerRebuildRequired:false,workerDigest:p.workerDigest,reasons:['Successor publication is complete; read-only image acceptance is pending. Preview/resume and hosted execution remain held. Production is not authorized.']};
 return {current:false,status:committed?'AWAITING_WORKER_PUBLICATION':'LOCAL_SUCCESSOR_AWAITING_COMMIT',applicationSha:source||null,workerSourceSha:source||null,workerInputFingerprint:fingerprint,workerRebuildRequired:true,workerDigest:null,reasons:['Successor source requires its own publication and read-only image acceptance. Preview/resume execution held. Historical candidate and digest are prior evidence only.']};
 }catch(e){return {current:false,status:'INVALID_PENDING_PUBLICATION',reasons:[e.message]};}
}

// Publication currentness is distinct from runtime acceptance and release authority.
export function verifySuccessorPublication(root) {
 try {
  const read=rel=>fs.readFileSync(path.join(root,rel));
  const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
  const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:'pipe'}).trim();
  const e=JSON.parse(read('data/rcap-render/worker-publication-evidence.json'));
  const source='af638b61cc4b74afad972fa79c4c1ca3f6709540';
  const digest='sha256:063901962bedf73adedb8a7566da2434539082bd1577051e98e4303c566bb3a5';
  const prefix='hosted-acceptance-evidence/worker/publication-36219916209/';
  assert.equal(e.originalPublicationPath,prefix+'rcap-render-worker-publication.json');
  assert.equal(e.originalArchivePath,prefix+'publication.zip');
  const bytes=read(e.originalPublicationPath),native=JSON.parse(bytes);
  assert.equal(bytes.length,1248);assert.equal(e.originalPublicationBytes,bytes.length);
  assert.equal(hash(bytes),'3aed3c2af3defb953a3de7024a8b86af39914a9729496bc18d57e640f190529f');
  assert.equal(e.originalPublicationSha256,hash(bytes));
  assert.equal('sha256:'+hash(read(e.originalArchivePath)),'sha256:671c4d7fe662a79b2007c1853043536c27267614f6930f294a09a0f45db6f524');
  assert.equal(e.publicationArtifactSha256,'sha256:'+hash(read(e.originalArchivePath)));
  for(const [key,value] of Object.entries(native))assert.deepEqual(e[key],key==='workflowRunId'?Number(value):value,key);
  assert.equal(e.sourceSha,source);assert.equal(e.imageTag,source);assert.equal(e.workflowSourceSha,source);
  assert.equal(e.immutableRegistryDigest,digest);assert.equal(e.digestPinnedReference,`${e.imageRepository}@${digest}`);
  assert.equal(e.workflowRunId,36219916209);assert.equal(e.workflowRunAttempt,1);assert.equal(e.workflowConclusion,'success');
  assert.equal(e.publicationArtifactId,10898382917);assert.equal(e.publicationArtifactName,`rcap-render-worker-publication-${source}`);
  assert.equal(e.containedIn,'captain-release');assert.equal(e.mutableLatestTagCreated,false);assert.equal(e.publishOnlyNoDeploy,true);
  assert.equal(e.workerClaimingStarted,false);assert.equal(e.stagingAndProductionUnchanged,true);
  assert.equal(typeof e.runtimeAccepted,'boolean');
  if(e.runtimeAccepted)assertSuccessorImageAcceptance(root,e);else assert.equal(e.imageAcceptance,undefined);
  for(const [rel,expected] of [[e.dockerfilePath,e.dockerfileSha256],['package-lock.json',e.lockfileSha256]])
   assert.equal(hash(execFileSync('git',['show',`${source}:${rel}`],{cwd:root})),expected);
  assert.deepEqual(e.supersededPublication,JSON.parse(git(['show',`${source}:data/rcap-render/worker-publication-evidence.json`])),'entire historical publication preserved');
  git(['merge-base','--is-ancestor',source,'HEAD']);
  const plan=createWorkerInputPlan({rootDir:root,acceptedSourceSha:source,acceptedDigest:digest,candidateSha:git(['rev-parse','HEAD'])});
  assert.equal(plan.canonicalInputs.length,39);assert.equal(plan.rebuildRequired,false);assert.deepEqual(plan.missingCanonicalInputs,[]);
  assert.equal(plan.aggregateInputSha256,'sha256:a981b7071a0d9d94208e1fa98e89be78ea939da34c778f55b789f97635357677');
  assert.equal(e.workerInputFingerprint,plan.aggregateInputSha256);
  assert.equal(git(['diff','--name-only',source,'--',...plan.canonicalInputs]),'','no worker input drift');
  assert.equal(git(['ls-files','--others','--exclude-standard','--',...plan.canonicalInputs]),'','no untracked worker inputs');
  return {current:true,sourceSha:source,workerDigest:digest,workerInputFingerprint:e.workerInputFingerprint,canonicalWorkerInputs:39,runtimeAccepted:e.runtimeAccepted,nativePaths:[e.originalPublicationPath,e.originalArchivePath,...(e.runtimeAccepted?[e.imageAcceptance.nativeRunMetadata.path,e.imageAcceptance.nativeJobMetadata.path,e.imageAcceptance.nativeLog.path]:[])]};
 }catch(error){return {current:false,reasons:[error.message]};}
}


export function assertSuccessorImageAcceptance(root,e) {
 const a=e.imageAcceptance;
 assert.equal(e.runtimeAccepted,true);
 for(const [key,value] of Object.entries({runId:36247303667,jobId:108418760982,runAttempt:1,conclusion:'success',workflowSourceSha:'c5942743b657b6a17165b72a308efd1cabc2d90e',sourceSha:e.sourceSha,tag:e.sourceSha,digest:e.immutableRegistryDigest,readOnly:true,evidenceBasis:'GitHub Actions run metadata and decoded job log; no artifact'}))assert.equal(a?.[key],value,`acceptance ${key}`);
 const native={};
 for(const [key,name]of [['nativeRunMetadata','run.json'],['nativeJobMetadata','job.json'],['nativeLog','native.log']]){
  const r=a[key];assert.equal(r.path,`hosted-acceptance-evidence/worker/image-acceptance-36247303667/${name}`);
  const bytes=fs.readFileSync(path.join(root,r.path));assert.equal(bytes.length,r.bytes);assert.equal(createHash('sha256').update(bytes).digest('hex'),r.sha256);native[key]=name.endsWith('.json')?JSON.parse(bytes):bytes.toString();
 }
 const run=native.nativeRunMetadata,job=native.nativeJobMetadata;
 assert.equal(run.id,a.runId);assert.equal(run.name,'RCAP worker image acceptance');assert.equal(run.head_sha,a.workflowSourceSha);assert.equal(run.run_attempt,1);assert.equal(run.status,'completed');assert.equal(run.conclusion,'success');
 assert.equal(job.id,a.jobId);assert.equal(job.run_id,a.runId);assert.equal(job.status,'completed');assert.equal(job.conclusion,'success');
 assert.equal(job.steps.length,24);assert(job.steps.every(s=>s.status==='completed'&&s.conclusion==='success'));
 for(const marker of [`accepting ghcr.io/roger-legalease/rcap-render-worker@${e.immutableRegistryDigest} built from ${e.sourceSha}`,`tag currently resolves to: ${e.immutableRegistryDigest}`,'anonymous token refused with HTTP 401','SOURCE BINDING: PASS','OCI REVISION: PRESENT','config env matches: 0','layer history matches: 0'])assert(native.nativeLog.includes(marker),marker);
 const prior=JSON.parse(execFileSync('git',['show',`${a.workflowSourceSha}:data/rcap-render/worker-publication-evidence.json`],{cwd:root}));
 assert.equal(prior.sourceSha,e.sourceSha);assert.equal(prior.immutableRegistryDigest,e.immutableRegistryDigest);assert.equal(prior.runtimeAccepted,false);
 assert.deepEqual(e.supersededPublication,prior.supersededPublication,'historical 6ebac publication and acceptance unchanged');
}
