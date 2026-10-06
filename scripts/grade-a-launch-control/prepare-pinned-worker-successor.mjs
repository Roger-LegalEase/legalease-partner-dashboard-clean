import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createWorkerInputPlan} from '../rcap-hosted-acceptance-worker-input-plan.mjs';
import {PENDING,PUBLICATION,CANDIDATE,TOOLS,verifyPinnedSuccessor,verifyPinnedBinding,assertCommittedPredecessor} from './verify-pinned-worker-successor.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:'pipe',maxBuffer:64*1024*1024}).trim();
const at=(root,sha,rel)=>JSON.parse(git(root,['show',`${sha}:${rel}`]));
const read=(root,rel)=>JSON.parse(fs.readFileSync(path.join(root,rel)));
const write=(root,rel,value)=>fs.writeFileSync(path.join(root,rel),JSON.stringify(value,null,2)+'\n');

export function pinnedRecords(root,{sourceSha,releaseBaseSha,toolsSha}){
 for(const sha of [sourceSha,releaseBaseSha,toolsSha])assert.match(sha,/^[a-f0-9]{40}$/);
 assertCommittedPredecessor(root,releaseBaseSha);
 const previous=at(root,releaseBaseSha,PUBLICATION);
 const plan=createWorkerInputPlan({rootDir:root,acceptedSourceSha:previous.sourceSha,acceptedDigest:previous.immutableRegistryDigest,candidateSha:sourceSha});
 const parent=git(root,['rev-parse',`${sourceSha}^`]);
 const files=Object.fromEntries(git(root,['diff','--name-only',parent,sourceSha]).split('\n').filter(Boolean).map(rel=>[rel,hash(execFileSync('git',['show',`${sourceSha}:${rel}`],{cwd:root}))]));
 const supersededRecord=at(root,releaseBaseSha,PENDING);
 const p={schemaVersion:supersededRecord.schemaVersion,status:'AWAITING_WORKER_PUBLICATION',releaseBaseSha,sourceCommit:sourceSha,parent,applicationSource:'pinned-source',workerSource:'sourceCommit',applicationSha:sourceSha,workerSourceSha:sourceSha,workerDigest:null,workerInputFingerprint:plan.aggregateInputSha256,canonicalWorkerInputs:plan.canonicalInputs,workerChangedPaths:git(root,['diff','--name-only',previous.sourceSha,sourceSha,'--',...plan.canonicalInputs]).split('\n').filter(Boolean).sort(),files,workerRebuildRequired:true,publication:'pending',acceptance:'pending',runtimeAccepted:false,previewExecution:'held',productionAuthorized:false,resume:null,historicalWorker:{sourceSha:previous.sourceSha,digest:previous.immutableRegistryDigest,fingerprint:previous.workerInputFingerprint},supersededRecord,supersededRecordSha256:hash(execFileSync('git',['show',`${releaseBaseSha}:${PENDING}`],{cwd:root}))};
 const tuple={status:p.status,applicationSha:sourceSha,workerSourceSha:sourceSha,workerDigest:null,workerInputFingerprint:p.workerInputFingerprint,toolsSha,runtimeAccepted:false,previewExecution:'held',resume:null,productionAuthorized:false,productionAuthorization:null,deploymentAuthorized:false,clinicDispatchReady:false};
 const controls=git(root,['diff','--name-only',releaseBaseSha,toolsSha]).split('\n').filter(Boolean).filter(f=>!Object.hasOwn(files,f));
 const tools={schemaVersion:'rcap-exact-hosted-tools-binding/v1',...tuple,successorTools:{schemaVersion:'rcap-successor-resume-tools/v1',baseSha:releaseBaseSha,files:Object.fromEntries(controls.map(rel=>[rel,hash(execFileSync('git',['show',`${toolsSha}:${rel}`],{cwd:root}))]))},supersededRecord:at(root,releaseBaseSha,TOOLS)};
 const candidate={schemaVersion:at(root,releaseBaseSha,CANDIDATE).schemaVersion,...tuple,publication:null,readOnlyImageAcceptance:null,supersededRecord:at(root,releaseBaseSha,CANDIDATE)};
 return {[PENDING]:p,[TOOLS]:tools,[CANDIDATE]:candidate};
}
// Advance only using evidence independently downloaded from successful native
// runs. A failed validation restores the prior records; no partial acceptance.
export function writePinnedRecords(root,records){
 const before=Object.fromEntries(Object.keys(records).map(rel=>[rel,fs.readFileSync(path.join(root,rel))]));
 try{
  for(const [rel,value]of Object.entries(records))write(root,rel,value);
  const pending=verifyPinnedSuccessor(root);assert.notEqual(pending.status,'INVALID_PENDING_PUBLICATION',pending.reasons.join('; '));
  const binding=verifyPinnedBinding(root,read(root,CANDIDATE),pending);assert.notEqual(binding.status,'INVALID_PINNED_BINDING',binding.reasons.join('; '));
  assert.equal(binding.productionAuthorized,false);return binding;
 }catch(error){for(const [rel,bytes]of Object.entries(before))fs.writeFileSync(path.join(root,rel),bytes);throw error;}
}
export function advancePinnedRecords(root,evidence){
 const p=read(root,PENDING),candidate=read(root,CANDIDATE),tools=read(root,TOOLS);
 assert(['AWAITING_WORKER_PUBLICATION','AWAITING_WORKER_ACCEPTANCE'].includes(p.status),'accepted records cannot be replayed');
 assert.equal(evidence.sourceSha,p.sourceCommit);
 assert.equal(evidence.runtimeAccepted,p.status==='AWAITING_WORKER_ACCEPTANCE','one actual lifecycle transition at a time');
 const status=evidence.runtimeAccepted?'SUCCESSOR_ACCEPTED_PREVIEW_AND_RESUME_PENDING':'AWAITING_WORKER_ACCEPTANCE';
 const change={status,workerDigest:evidence.immutableRegistryDigest,runtimeAccepted:evidence.runtimeAccepted};
 return writePinnedRecords(root,{[PUBLICATION]:evidence,[PENDING]:{...p,...change,workerRebuildRequired:false,publication:'complete',acceptance:evidence.runtimeAccepted?'complete':'pending'},[TOOLS]:{...tools,...change},[CANDIDATE]:{...candidate,...change,publication:{runId:evidence.workflowRunId,workflowSourceSha:evidence.workflowSourceSha,artifactId:evidence.publicationArtifactId,digest:evidence.immutableRegistryDigest},readOnlyImageAcceptance:evidence.runtimeAccepted?{runId:evidence.imageAcceptance.runId,jobId:evidence.imageAcceptance.jobId,workflowSourceSha:evidence.imageAcceptance.workflowSourceSha,digest:evidence.immutableRegistryDigest}:null}});
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 try{
  const [sourceSha,releaseBaseSha,toolsSha]=process.argv.slice(2);const root=process.cwd();
  console.log(JSON.stringify(writePinnedRecords(root,pinnedRecords(root,{sourceSha,releaseBaseSha,toolsSha})),null,2));
 }catch(error){console.error(error.message);process.exitCode=1;}
}

export function forwardPinnedRecords(root,{applicationSha,releaseBaseSha,toolsSha}) {
 const prior=at(root,releaseBaseSha,PENDING),priorCandidate=at(root,releaseBaseSha,CANDIDATE);
 assert.equal(prior.applicationSource,'pinned-source');assert.equal(prior.runtimeAccepted,true);
 const plan=createWorkerInputPlan({rootDir:root,candidateSha:applicationSha,acceptedSourceSha:prior.workerSourceSha,acceptedDigest:prior.workerDigest});
 assert.equal(plan.rebuildRequired,false);assert.deepEqual(plan.missingCanonicalInputs,[]);assert.equal(plan.aggregateInputSha256,prior.workerInputFingerprint);
 const tuple={status:'FORWARD_BOUND_HOSTED_PENDING',applicationSha,workerSourceSha:prior.workerSourceSha,workerDigest:prior.workerDigest,workerInputFingerprint:prior.workerInputFingerprint,toolsSha,publication:priorCandidate.publication,readOnlyImageAcceptance:priorCandidate.readOnlyImageAcceptance,runtimeAccepted:true,workerRebuildRequired:false,previewExecution:'held',resume:null,productionAuthorized:false,productionAuthorization:null,deploymentAuthorized:false,clinicDispatchReady:false,hostedAdmission:null};
 const records={};
 for(const rel of [PENDING,CANDIDATE,TOOLS])records[rel]={schemaVersion:at(root,releaseBaseSha,rel).schemaVersion,...tuple,releaseBaseSha,supersededRecord:at(root,releaseBaseSha,rel),supersededRecordSha256:hash(execFileSync('git',['show',`${releaseBaseSha}:${rel}`],{cwd:root}))};
 records[PENDING].applicationSource='pinned-source-forward';
 const controls=git(root,['diff','--name-only',releaseBaseSha,toolsSha]).split('\n').filter(f=>f.startsWith('scripts/')||f.startsWith('.github/'));
 records[TOOLS].successorTools={schemaVersion:'rcap-successor-resume-tools/v1',baseSha:releaseBaseSha,files:Object.fromEntries(controls.map(rel=>[rel,hash(execFileSync('git',['show',`${toolsSha}:${rel}`],{cwd:root}))]))};
 return records;
}
