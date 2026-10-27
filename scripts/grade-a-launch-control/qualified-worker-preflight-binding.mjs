// The accepted compatibility proof grants no permission; this branch consumes retained owner authority and actual C closure.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {assertQualifiedWorkerCompatibility,QUALIFIED_FORWARD_APP,QUALIFIED_FORWARD_FINGERPRINT} from './verify-qualified-worker-forward-binding.mjs';
import {applicationInputEquivalence} from '../rcap-application-inputs.mjs';
const DIR='data/rcap-grade-a/launch-control/',EVIDENCE=DIR+'qualified-release-evidence/';
const RECORDS=['PENDING_WORKER_SUCCESSOR','RELEASE_CANDIDATE_BINDING','HOSTED_TOOLS_BINDING'].map(n=>DIR+n+'.json');
const hash=b=>createHash('sha256').update(b).digest('hex');
const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const blob=(root,sha,p)=>execFileSync('git',['show',sha+':'+p],{cwd:root,maxBuffer:64*1024*1024});
const PROJECT='wwtwtsmywnckfkdaqqeg';
export const QUALIFIED_PREFLIGHT_STATUS='QUALIFIED_HOSTED_ACCEPTED_PREFLIGHT_ONLY';
export const QUALIFIED_PREFLIGHT_EVIDENCE={
 authority:{path:EVIDENCE+'OWNER-EXECUTION-ORDER39318.json',sha256:'cc11ef00c38aa787847d06aeb20a0323e526afc5cbd9f2c9aef6903deba04e2e'},
 preview:{path:EVIDENCE+'C-READY4C-PREVIEW.json',sha256:'a1aef11e72a2a113ea22507e0561a6f49494ba052f9446be81b9e256427dffbd'},
 closure:{path:EVIDENCE+'C-ORIGINAL54-CLOSURE.json',sha256:'d4d2864753b0f1a23cbe9c08da15de53f7719640fa1a888a7364f5a8a7dc3e97'},
 journeys:{path:EVIDENCE+'C-THREE-JOURNEYS.json',sha256:'93bf17d830b75baf8ae7982a8bb02c8ac0e2ae1cdb48a62f73fd934893e0805d'},
};
export function readQualifiedPreflightEvidence(root){
 const documents={};
 assert(QUALIFIED_PREFLIGHT_EVIDENCE.closure,'Actual independent C54 closure must be source-pinned before binding');
 for(const [key,ref] of Object.entries(QUALIFIED_PREFLIGHT_EVIDENCE)){
  const bytes=fs.readFileSync(path.join(root,ref.path));assert.equal(hash(bytes),ref.sha256,'Actual accepted evidence '+key);documents[key]=JSON.parse(bytes);
 }
 assert.equal(documents.authority.nativeOwner.sha256IncludingLF,'52e7e12f79a25734fa9903499a2fc2d98c117dab25d3a1f6227d4e15abb4579a');
 assert.equal(documents.journeys.authority,'CODEX C');assert.equal(documents.journeys.counts.hostedComplete,3);assert.equal(documents.journeys.counts.hostedTotal,3);
 assert.equal(documents.closure.schemaVersion,'original54-final-independent-acceptance/v1');assert.equal(documents.closure.authority,'CODEX C');assert.equal(documents.closure.original54Complete,true);assert.equal(documents.closure.wholeOriginalFindingsClosed,54);assert.deepEqual(documents.closure.openOriginalFindings,[]);assert.deepEqual(documents.closure.counts,{closed:54,open:0,hostedComplete:3,hostedTotal:3});
 assert.deepEqual(Object.keys(documents.closure.hostedJourneys).sort(),['DTC','consentedClinic','ordinaryRCAP']);for(const journey of Object.values(documents.closure.hostedJourneys))assert.equal(journey.complete,true);
 assert.equal(documents.closure.releaseTuple.canonicalSourceEquivalent,false);assert.equal(documents.closure.releaseTuple.canonicalRebuildRequired,true);
 assert.equal(documents.journeys.applicationSha,QUALIFIED_FORWARD_APP);assert.equal(documents.journeys.target.status,'delivered');
 return documents;
}
function qualifiedRecordFields(root,{toolsSha,releaseBaseSha}){
 for(const sha of [toolsSha,releaseBaseSha])assert.match(sha??'',/^[a-f0-9]{40}$/);
 const {identity}=assertQualifiedWorkerCompatibility(root),evidence=readQualifiedPreflightEvidence(root);
 for(const [key,value] of Object.entries({workerSourceSha:identity.source,workerDigest:identity.digest}))assert.equal(evidence.journeys[key],value);
 assert.equal(evidence.preview.application,QUALIFIED_FORWARD_APP);
 for(const [key,value] of Object.entries({applicationSha:QUALIFIED_FORWARD_APP,workerSourceSha:identity.source,workerDigest:identity.digest,workerInputFingerprint:QUALIFIED_FORWARD_FINGERPRINT}))assert.equal(evidence.closure.releaseTuple[key],value);
 const tuple={applicationSha:QUALIFIED_FORWARD_APP,workerSourceSha:identity.source,workerDigest:identity.digest,workerInputFingerprint:QUALIFIED_FORWARD_FINGERPRINT,toolsSha};
 const authorization={authorized:true,...tuple,productionProjectRef:PROJECT,recordedBy:'Roger Roman',recordedAt:'2026-10-26T02:07:42.386Z',phases:['preflight'],
  authority:QUALIFIED_PREFLIGHT_EVIDENCE.authority,note:'Derived from retained owner execution order 39318 and independently accepted C closure. Only the existing first preflight: capture current READY rollback, inspect or stage the exact Production candidate without moving aliases. No later phase, migration, environment change, worker placement or customer transaction.'};
 const held=JSON.parse(blob(root,releaseBaseSha,RECORDS[1]));
 return {schemaVersion:held.schemaVersion,status:QUALIFIED_PREFLIGHT_STATUS,...tuple,acceptanceProjectRef:'hyflxnlhpmiqxvvcoiia',productionProjectRef:PROJECT,
  runtimeAccepted:true,workerRebuildRequired:true,canonicalSourceEquivalent:false,canonicalRebuildRequired:true,candidateCanonicalFingerprint:null,
  productionAuthorized:true,productionAuthorization:authorization,deploymentAuthorized:false,clinicDispatchReady:false,previewExecution:'held',resume:null,
  publication:{runId:40504068956,workflowSourceSha:identity.source,artifactId:12733289924,digest:identity.digest},
  readOnlyImageAcceptance:{runId:40505631029,jobId:122194096589,workflowSourceSha:'7fe7265f9bb3d2f1dfb481d87e6faa54c26768bc',digest:identity.digest},
  qualifiedWorkerPreflight:{schemaVersion:'qualified-worker-first-preflight/v1',releaseBaseSha,evidence:QUALIFIED_PREFLIGHT_EVIDENCE},
  hostedAcceptance:{preview:{...tuple,acceptanceProjectRef:'hyflxnlhpmiqxvvcoiia',deploymentId:evidence.preview.deploymentId,target:null,readyState:'READY'}},
 };
}
// Pure preparation: no records, owner decisions or receipts are written here.
export function prepareQualifiedWorkerPreflightRecords(root,options){
 const fields=qualifiedRecordFields(root,options),records={};
 for(const rel of RECORDS){const bytes=blob(root,options.releaseBaseSha,rel);records[rel]={...fields,schemaVersion:JSON.parse(bytes).schemaVersion,supersededRecord:JSON.parse(bytes),supersededRecordSha256:hash(bytes)};}
 return records;
}
export function verifyQualifiedWorkerPreflightBinding(root,candidate){
 try{
  const q=candidate.qualifiedWorkerPreflight;assert.equal(q?.schemaVersion,'qualified-worker-first-preflight/v1');
  const expected=prepareQualifiedWorkerPreflightRecords(root,{toolsSha:candidate.toolsSha,releaseBaseSha:q.releaseBaseSha});
  for(const rel of RECORDS)assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,rel))),expected[rel],'Exact generated release record '+rel);
  assert.deepEqual(candidate,expected[RECORDS[1]]);
  assert(applicationInputEquivalence(root,QUALIFIED_FORWARD_APP,'HEAD').equivalent,'Exact frozen 4c application');
  const head=git(root,['rev-parse','HEAD']);git(root,['merge-base','--is-ancestor',candidate.toolsSha,head]);
  assert.equal(git(root,['diff','--name-only',candidate.toolsSha,head,'--','scripts','.github']),'','Frozen executable controls');
  const changed=git(root,['diff','--name-only',candidate.toolsSha,head]).split('\n').filter(Boolean);
  assert(changed.every(p=>RECORDS.includes(p)),'Only generated release records after frozen tools');
  assert.equal(git(root,['status','--porcelain']),'','Clean committed execution checkout');
  for(const ref of Object.values(QUALIFIED_PREFLIGHT_EVIDENCE))assert.equal(hash(fs.readFileSync(path.join(root,ref.path))),hash(blob(root,candidate.toolsSha,ref.path)),'Evidence frozen with tools');
  return {current:true,bindingVerified:true,status:'CURRENT',qualifiedPreflightStatus:QUALIFIED_PREFLIGHT_STATUS,productionAuthorized:true,...Object.fromEntries(['applicationSha','workerSourceSha','workerDigest','workerInputFingerprint','toolsSha'].map(k=>[k,candidate[k]])),reasons:[]};
 }catch(error){return {current:false,bindingVerified:false,status:'INVALID_QUALIFIED_WORKER_PREFLIGHT_BINDING',reasons:[error.message]};}
}
export function requireQualifiedWorkerPreflightPhase(candidate,phase,root=process.cwd()){
 const result=verifyQualifiedWorkerPreflightBinding(root,candidate);assert.equal(result.current,true,result.reasons.join('; '));
 assert.equal(phase,'preflight','Only the first preflight is admitted; later phases require actual readbacks, verified rollback and separate exact technical admission');
 return candidate.productionAuthorization;
}
