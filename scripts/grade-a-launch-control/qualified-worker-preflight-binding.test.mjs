import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {prepareQualifiedWorkerPreflightRecords,readQualifiedPreflightEvidence,QUALIFIED_PREFLIGHT_EVIDENCE,verifyQualifiedWorkerPreflightBinding} from './qualified-worker-preflight-binding.mjs';
import {requireCurrentReleaseCandidate} from './verify-release-candidate-binding.mjs';
import {requireProductionPhaseAuthorization} from './production-preflight-authorization.mjs';
import {requireProductionMigrationRelease,requireProductionReleaseTuple} from '../rcap-production-migration-contract.mjs';
const root=process.cwd(),candidatePath='data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json';
const head=()=>execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const candidate=()=>JSON.parse(fs.readFileSync(candidatePath));
const altered=(file,change,check)=>{const bytes=fs.readFileSync(file);try{fs.writeFileSync(file,change(bytes));check();}finally{fs.writeFileSync(file,bytes);}};
test('actual C54 and all three journeys are mandatory; absent or modified closure refuses',()=>{
 const evidence=readQualifiedPreflightEvidence(root);assert.equal(evidence.closure.counts.closed,54);assert.equal(evidence.closure.counts.hostedComplete,3);
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'qualified-closure-test-'));
 try{
  for(const [key,ref]of Object.entries(QUALIFIED_PREFLIGHT_EVIDENCE)){if(key==='closure')continue;const dest=path.join(dir,ref.path);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(ref.path,dest);}
  assert.throws(()=>readQualifiedPreflightEvidence(dir),{code:'ENOENT'});
 }finally{fs.rmSync(dir,{recursive:true});}
 altered(QUALIFIED_PREFLIGHT_EVIDENCE.closure.path,()=>Buffer.from('{}'),()=>assert.throws(()=>readQualifiedPreflightEvidence(root),{code:'ERR_ASSERTION'}));
});
test('pure generator preserves predecessor and canonical mismatch and grants only existing first preflight',()=>{
 const records=prepareQualifiedWorkerPreflightRecords(root,{toolsSha:head(),releaseBaseSha:'0cd12827498a582b8558c312d8d5eae7076e7c3a'}),c=records[candidatePath];
 assert.equal(Object.keys(records).length,3);assert.equal(c.canonicalSourceEquivalent,false);assert.equal(c.canonicalRebuildRequired,true);assert.equal(c.workerRebuildRequired,true);assert.equal(c.candidateCanonicalFingerprint,null);
 assert.deepEqual(c.productionAuthorization.phases,['preflight']);assert.equal(c.productionAuthorization.recordedAt,'2026-10-26T02:07:42.386Z');assert.equal(c.qualifiedWorkerPreflight.evidence.authority.sha256,'cc11ef00c38aa787847d06aeb20a0323e526afc5cbd9f2c9aef6903deba04e2e');
 for(const key of ['stagedDeploymentId','rollbackDeploymentId','smokeReceipt','activationReceipt'])assert.equal(Object.hasOwn(c,key),false);
 assert.equal(c.supersededRecord.productionAuthorized,false);
});
if(process.env.QUALIFIED_BINDING_CONTROLLER_TEST==='1'){
 test('existing general release and migration caller admits exact frozen first-preflight controller',()=>{
  const c=requireCurrentReleaseCandidate(root);assert.equal(verifyQualifiedWorkerPreflightBinding(root,c).status,'CURRENT');
  const env={RCAP_APPLICATION_SHA:c.applicationSha,RCAP_WORKER_SOURCE_SHA:c.workerSourceSha,RCAP_WORKER_DIGEST:c.workerDigest,RCAP_TOOLS_SHA:c.toolsSha,RCAP_PRODUCTION_PROJECT_REF:c.productionProjectRef,GITHUB_SHA:head(),RCAP_PRODUCTION_PHASE:'preflight'};
  assert.deepEqual(requireProductionMigrationRelease(root,env),c);assert.deepEqual(requireProductionPhaseAuthorization(c,'preflight'),c.productionAuthorization);
  for(const key of ['RCAP_APPLICATION_SHA','RCAP_WORKER_SOURCE_SHA','RCAP_WORKER_DIGEST','RCAP_TOOLS_SHA','RCAP_PRODUCTION_PROJECT_REF','GITHUB_SHA'])assert.throws(()=>requireProductionReleaseTuple(c,c,{...env,[key]:'wrong'}));
  for(const phase of ['restage','smoke','activate','production_worker_deploy','public_verify','clinic_migrate'])assert.throws(()=>requireProductionPhaseAuthorization(c,phase),/Only the first preflight/);
 });
 test('forged authority, changed closure, executable drift and uncommitted records refuse current release',()=>{
  for(const ref of [QUALIFIED_PREFLIGHT_EVIDENCE.authority,QUALIFIED_PREFLIGHT_EVIDENCE.closure])altered(ref.path,()=>Buffer.from('{}'),()=>assert.equal(verifyQualifiedWorkerPreflightBinding(root,candidate()).current,false));
  altered('scripts/grade-a-launch-control/qualified-worker-preflight-binding.mjs',b=>Buffer.concat([b,Buffer.from('\n// drift\n')]),()=>assert.equal(verifyQualifiedWorkerPreflightBinding(root,candidate()).current,false));
  altered(candidatePath,b=>Buffer.from(JSON.stringify({...JSON.parse(b),productionAuthorization:{...JSON.parse(b).productionAuthorization,phases:['preflight','activate']}})),()=>assert.equal(verifyQualifiedWorkerPreflightBinding(root,candidate()).current,false));
 });
}
