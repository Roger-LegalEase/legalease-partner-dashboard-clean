// Diagnostic APP-only identity never authorizes a worker or a normal release.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
export const DIAGNOSTIC_APP='b8b980c5b95b3342420b63c60ba3f36d3f7bf85f';
export const DIAGNOSTIC_STATUS='HELD_APP_ONLY_ORDINARY_GUARD_DIAGNOSTIC';
export const DIAGNOSTIC_WORKER_METADATA=Object.freeze({rcapWorkerState:'HELD',rcapWorkerCompatibility:'UNQUALIFIED'});
const names={PENDING_WORKER_SUCCESSOR:'rcap-pending-worker-successor/v1',HOSTED_TOOLS_BINDING:'rcap-exact-hosted-tools-binding/v1',RELEASE_CANDIDATE_BINDING:'rcap-release-candidate-binding/v1'};
const fields=['schemaVersion','status','applicationSha','toolsSha','workerSourceSha','workerDigest','workerInputFingerprint','publication','readOnlyImageAcceptance','runtimeAccepted','workerRebuildRequired','previewExecution','resume','productionAuthorized','productionAuthorization','deploymentAuthorized','clinicDispatchReady','hostedAdmission','releaseBaseSha','supersededRecord','supersededRecordSha256'];
export function requireOrdinaryDiagnosticPreview(root,inputs){
 assert.equal(inputs.phase,'managed_start_source_successor');assert.equal(inputs.applicationSha,DIAGNOSTIC_APP);
 assert.equal(inputs.workerSourceSha,'HELD');assert.equal(inputs.workerDigest,'HELD');assert.match(inputs.toolsSha??'',/^[a-f0-9]{40}$/);
 let candidate;
 for(const[name,schema]of Object.entries(names)){
  const record=JSON.parse(fs.readFileSync(root+'/data/rcap-grade-a/launch-control/'+name+'.json'));
  assert.deepEqual(Object.keys(record).sort(),[...fields].sort());assert.equal(record.schemaVersion,schema);
  assert.equal(record.status,DIAGNOSTIC_STATUS);assert.equal(record.applicationSha,DIAGNOSTIC_APP);assert.equal(record.toolsSha,inputs.toolsSha);
  for(const key of ['workerSourceSha','workerDigest','workerInputFingerprint','publication','readOnlyImageAcceptance','resume','productionAuthorization','hostedAdmission'])assert.equal(record[key],null,key);
  for(const key of ['runtimeAccepted','productionAuthorized','deploymentAuthorized','clinicDispatchReady'])assert.equal(record[key],false,key);
  assert.equal(record.workerRebuildRequired,true);assert.equal(record.previewExecution,'held');assert.equal(record.releaseBaseSha,'9aadacd0c5a7fac90a1662f1928b7b86f8685c7a');
  assert.ok(record.supersededRecord);assert.equal(record.supersededRecordSha256,createHash('sha256').update(JSON.stringify(record.supersededRecord)).digest('hex'));
  candidate=record;
 }
 const git=args=>execFileSync('git',args,{cwd:root,encoding:'utf8'}).trim();
 assert.equal(inputs.workflowSourceSha,git(['rev-parse','HEAD']));git(['merge-base','--is-ancestor',inputs.toolsSha,inputs.workflowSourceSha]);git(['merge-base','--is-ancestor',DIAGNOSTIC_APP,inputs.workflowSourceSha]);
 assert.equal(git(['diff','--name-only',inputs.toolsSha,inputs.workflowSourceSha,'--','scripts','.github']),'');
 return Object.freeze({applicationSha:DIAGNOSTIC_APP,toolsSha:candidate.toolsSha,workerSourceSha:null,workerDigest:null,workerInputFingerprint:null,runtimeAccepted:false,workerRebuildRequired:true,appOnlyDiagnostic:true,current:false,previewOnly:true,productionAuthorized:false,deploymentAuthorized:false});
}
