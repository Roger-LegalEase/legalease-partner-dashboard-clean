import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {TUPLE,PREVIEW} from './verify-hosted-acceptance-evidence.mjs';
import {BOUND_PREFLIGHT,PREACTIVATION_BASE,PRODUCTION_PROJECT_REF,STAGED_DEPLOYMENT,ROLLBACK_DEPLOYMENT} from './production-preflight-authorization.mjs';
export const PREFLIGHT_EVIDENCE_FILES=['run.json','jobs.json','artifact.json','11048744402.zip'].map(f=>`${BOUND_PREFLIGHT.evidencePath}/${f}`);
const hashes=['5266d536a1eade77f98d47245bf775153f570e2745d792bdeaa26333bf9e8730','1e5e95d5bc9c11749f54e6d664042b96a3b4baff155e04c55f0fa2e25d6b5de2','f796d13543356036347a277c26163fb32f98a5f1c0ef500194810fe20fb60ca3',BOUND_PREFLIGHT.artifactSha256.slice(7)];
export function loadProductionPreflightDocuments(root){
 const bytes=PREFLIGHT_EVIDENCE_FILES.map((f,i)=>{
  const b=fs.readFileSync(path.join(root,f));
  assert.equal(createHash('sha256').update(b).digest('hex'),hashes[i],`native preflight bytes: ${f}`);return b;
 });
 const body=JSON.parse(execFileSync('python3',['-c',"import json,sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); assert z.namelist()==['production-preflight.json']; assert z.getinfo('production-preflight.json').file_size<8000000; print(z.read('production-preflight.json').decode())",path.join(root,PREFLIGHT_EVIDENCE_FILES[3])],{encoding:'utf8'}));
 return {run:JSON.parse(bytes[0]),jobs:JSON.parse(bytes[1]),artifact:JSON.parse(bytes[2]),body};
}
export function validateProductionPreflightDocuments({run,jobs,artifact,body:b}){
 assert.equal(run.id,BOUND_PREFLIGHT.runId);assert.equal(run.head_sha,PREACTIVATION_BASE);
 assert.equal(run.run_attempt,1);assert.equal(run.status,'completed');assert.equal(run.conclusion,'success');
 assert.equal(run.event,'workflow_dispatch');assert.equal(run.path,'.github/workflows/rcap-f1-ephemeral-staging.yml');
 assert.equal(run.display_title,`RCAP F1 | production_preflight | tools ${PREACTIVATION_BASE} | app ${TUPLE.applicationSha} | cents 5000`);
 assert.equal(run.repository.full_name,'Roger-LegalEase/legalease-partner-dashboard-clean');
 assert.equal(artifact.id,BOUND_PREFLIGHT.artifactId);assert.equal(artifact.name,`rcap-production-preflight-${run.id}`);
 assert.equal(artifact.digest,BOUND_PREFLIGHT.artifactSha256);assert.equal(artifact.expired,false);
 assert.deepEqual(artifact.workflow_run,{id:run.id,repository_id:run.repository.id,head_repository_id:run.repository.id,head_branch:'captain-release',head_sha:PREACTIVATION_BASE});
 const successful=jobs.jobs.filter(j=>j.conclusion==='success');assert.equal(successful.length,1);
 const j=successful[0];assert.equal(j.id,109517735005);assert.equal(j.run_id,run.id);assert.equal(j.head_sha,PREACTIVATION_BASE);assert.equal(j.run_attempt,1);
 assert.equal(j.name,'Read-only Production identity and rollback discovery / Exact Production release phase');
 assert.ok(jobs.jobs.filter(x=>x!==j).every(x=>x.conclusion==='skipped'));
 for(const number of [2,3,4,5,6,8,14,15,24])assert.equal(j.steps.find(s=>s.number===number)?.conclusion,'success',`preflight step ${number}`);
 assert.equal(j.steps.find(s=>s.number===15)?.name,'Discover and record Production identity and rollback');
 assert.equal(j.steps.find(s=>s.number===24)?.name,'Upload the immutable Production preflight evidence');
 for(const number of [7,9,10,11,12,13,16,17,18,19,20,21,22,23])assert.equal(j.steps.find(s=>s.number===number)?.conclusion,'skipped',`non-preflight step ${number}`);
 assert.equal(b.schemaVersion,'rcap-production-preflight/v2');assert.equal(b.phase,'preflight');assert.equal(b.passed,true);assert.equal(b.failure,null);
 assert.deepEqual(b.requestedIdentity,{applicationSha:TUPLE.applicationSha,acceptedToolsSha:PREACTIVATION_BASE,executionToolsSha:PREACTIVATION_BASE,workerSourceSha:TUPLE.workerSourceSha,workerDigest:TUPLE.workerDigest});
 assert.deepEqual(b.projectRefs,{production:PRODUCTION_PROJECT_REF,acceptance:TUPLE.acceptanceProjectRef});
 assert.deepEqual(b.deployments,{rollbackTarget:ROLLBACK_DEPLOYMENT,stagedProduction:STAGED_DEPLOYMENT,acceptedPreview:PREVIEW.deploymentId});
 for(const key of ['productionConfigurationMutationAttempted','environmentVariableChanged','productionAliasChanged','productionDatabaseMutated','applicationChanged','workerChanged','originPersisted','secretsPersisted'])assert.equal(b[key],false,key);
 assert.equal(b.stagedDeploymentCreated,true);
 for(const stem of ['environmentMetadata','productionAliasMapping']){
  assert.match(b.controlHashes[`${stem}BeforeSha256`],/^[a-f0-9]{64}$/);
  assert.equal(b.controlHashes[`${stem}BeforeSha256`],b.controlHashes[`${stem}AfterSha256`]);
 }
 assert.equal(b.runtimeProof.productionProjectRef,PRODUCTION_PROJECT_REF);assert.equal(b.runtimeProof.acceptanceProjectRef,TUPLE.acceptanceProjectRef);
 for(const key of ['exactlyOneProductionOrigin','exactlyOneAcceptanceOrigin','productionProjectMatch','acceptanceProjectMatch'])assert.equal(b.runtimeProof[key],true);
 const expected=['release_identity_is_exact','production_vercel_project_is_exact','rollback_target_recorded_before_mutation','staged_production_deployment_is_exact','accepted_preview_deployment_is_exact','production_runtime_project_is_canonical','acceptance_preview_project_is_exact','production_environment_is_separate_from_acceptance','production_environment_metadata_unchanged','production_aliases_unchanged','preflight_performed_no_production_mutation'];
 assert.deepEqual(b.verdicts.map(v=>v.caseId),expected);assert.ok(b.verdicts.every(v=>v.passed===true));
 assert.ok(Date.parse(b.startedAt)>=Date.parse(j.started_at)&&Date.parse(b.finishedAt)<=Date.parse(j.completed_at));
 return {...BOUND_PREFLIGHT};
}
export function verifyProductionPreflightEvidence(root){return validateProductionPreflightDocuments(loadProductionPreflightDocuments(root));}
