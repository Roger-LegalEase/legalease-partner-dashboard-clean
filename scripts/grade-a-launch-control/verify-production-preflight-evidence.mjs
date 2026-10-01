import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {TUPLE,PREVIEW} from './verify-hosted-acceptance-evidence.mjs';
import {BOUND_PREFLIGHT,PREACTIVATION_BASE,PRODUCTION_PROJECT_REF,RESTAGE_AUTHORITY,BOUND_RESTAGE,BOUND_SMOKE,BOUND_ACTIVATION,ROLLBACK_DEPLOYMENT} from './production-preflight-authorization.mjs';
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
 assert.deepEqual(b.deployments,{rollbackTarget:ROLLBACK_DEPLOYMENT,stagedProduction:RESTAGE_AUTHORITY.oldStagedDeploymentId,acceptedPreview:PREVIEW.deploymentId});
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

// Native restage evidence follows the same immutable capture pattern as preflight.
// The historical preflight retains its original staged identity; smoke uses the
// replacement only after this successful receipt is bound by the release gate.
export const RESTAGE_EVIDENCE_FILES=['run.json','jobs.json','artifact.json','11119334551.zip'].map(f=>`${BOUND_RESTAGE.evidencePath}/${f}`);
const restageHashes=['8789138eacc40c1e6c0f798f00fa953d2d9cdeae7070a9dd0e5a57f0bad464a5','8772c54312fd8b69b70b189c293018ddc7dff84bdf2e04c5d6389adcfd7f7bc2','71be614e8bb167efca8d9cc9d0527fdb27bcab84b15438dfe4ad834af642d9c6',BOUND_RESTAGE.artifactZipSha256.slice(7)];
export function loadProductionRestageDocuments(root){
 const bytes=RESTAGE_EVIDENCE_FILES.map((f,i)=>{
  const b=fs.readFileSync(path.join(root,f));
  assert.equal(createHash('sha256').update(b).digest('hex'),restageHashes[i],`native restage bytes: ${f}`);return b;
 });
 const body=JSON.parse(execFileSync('python3',['-c',"import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); assert z.namelist()==['production-restage.json']; assert z.getinfo('production-restage.json').file_size<8000000; print(z.read('production-restage.json').decode())",path.join(root,RESTAGE_EVIDENCE_FILES[3])],{encoding:'utf8'}));
 return {run:JSON.parse(bytes[0]),jobs:JSON.parse(bytes[1]),artifact:JSON.parse(bytes[2]),body};
}
export function validateProductionRestageDocuments({run,jobs,artifact,body:b}){
 const r=BOUND_RESTAGE;
 assert.equal(run.id,r.runId);assert.equal(run.head_sha,r.toolsSha);assert.equal(run.head_branch,'captain-release');
 assert.equal(run.run_attempt,r.runAttempt);assert.equal(run.status,'completed');assert.equal(run.conclusion,r.conclusion);
 assert.equal(run.event,'workflow_dispatch');assert.equal(run.path,'.github/workflows/rcap-f1-ephemeral-staging.yml');
 assert.equal(run.display_title,`RCAP F1 | production_restage | tools ${r.toolsSha} | app ${r.applicationSha} | cents 5000`);
 assert.equal(run.repository.full_name,'Roger-LegalEase/legalease-partner-dashboard-clean');
 assert.equal(artifact.id,r.artifactId);assert.equal(artifact.name,r.artifactName);assert.equal(artifact.digest,r.artifactZipSha256);assert.equal(artifact.expired,false);
 assert.deepEqual(artifact.workflow_run,{id:run.id,repository_id:run.repository.id,head_repository_id:run.repository.id,head_branch:'captain-release',head_sha:r.toolsSha});
 assert.equal(jobs.total_count,jobs.jobs.length,'complete jobs evidence');
 const successful=jobs.jobs.filter(j=>j.conclusion==='success');assert.equal(successful.length,1);
 const j=successful[0];assert.equal(j.run_id,r.runId);assert.equal(j.head_sha,r.toolsSha);assert.equal(j.run_attempt,r.runAttempt);
 assert.ok(jobs.jobs.filter(x=>x!==j).every(x=>x.conclusion==='skipped'));
 assert.ok(j.steps.some(s=>s.name==='Create or reuse the authorized post-key Production replacement without aliases'&&s.conclusion==='success'));
 assert.ok(j.steps.every(s=>['success','skipped'].includes(s.conclusion)));
 assert.equal(b.schemaVersion,'rcap-production-restage/v1');assert.equal(b.passed,true);
 for(const k of ['applicationSha','workerSourceSha','workerDigest','productionProjectRef','replacementStagedDeploymentId','rollbackDeploymentId'])assert.equal(b[k],r[k],`restage ${k}`);
 assert.equal(b.oldStagedDeploymentId,RESTAGE_AUTHORITY.oldStagedDeploymentId);
 for(const k of ['keyNamesPresentOnly','replacementCreatedAfterKeys','deploymentCreated','deploymentCreateAttempted'])assert.equal(b[k],true,k);
 for(const k of ['keyValuesRecorded','publicAliasesChanged','environmentMetadataChanged','productionDatabaseMutated','workerChanged','migrationReplayed','keysCreated','reusedExactReplacement'])assert.equal(b[k],false,k);
 assert.ok(b.verdicts.length>0&&b.verdicts.every(v=>v.passed===true));
 for(const id of ['restage_domains_complete','restage_public_direct_domains_present','restage_redirect_target_is_direct_production_domain','restage_replacement_identity','restage_replacement_after_keys','restage_replacement_has_no_public_domain','restage_runtime_production_exact','restage_precreate_mapping_unchanged','restage_precreate_environment_unchanged','restage_environment_metadata_unchanged','restage_public_aliases_unchanged'])assert.ok(b.verdicts.some(v=>v.caseId===id),id);
 assert.deepEqual(b.routingStateBefore,b.routingStateAfter);
 const routingHash='d1ce02212cfd8c7e246c2cdb2b36c0fd30ec35017b3afd0730d12a56b28618bd';
 assert.equal(createHash('sha256').update(JSON.stringify(b.routingStateBefore)).digest('hex'),routingHash);
 assert.equal(b.routingStateBeforeSha256,routingHash);assert.equal(b.routingStateAfterSha256,routingHash);
 assert.deepEqual(b.controlHashes,{environmentBefore:'10e4a010bcb9fde5bd8ac312fddcdddc056b06673852239cf082d48424204cc0',environmentAfter:'10e4a010bcb9fde5bd8ac312fddcdddc056b06673852239cf082d48424204cc0',aliasesBefore:routingHash,aliasesAfter:routingHash});
 return {...r};
}
export function verifyProductionRestageEvidence(root){return validateProductionRestageDocuments(loadProductionRestageDocuments(root));}

// Capture the archive and native GitHub metadata without rewriting either.
// The activation runtime consumes the inner JSON hash, not the ZIP digest.
export const SMOKE_EVIDENCE_FILES=['run.json','jobs.json','artifact.json','11127253731.zip'].map(f=>`${BOUND_SMOKE.evidencePath}/${f}`);
const smokeHashes=['3bf250984fece94d8b365d33c482d6162cb55f1631b24c6a05c24d0d75c1d7e2','667415c27f566de7fae2da14046b42397cd326d0fb39f805bf02b2bb1febc8dc','5b85db11b419cb32a9e815d824a9c80df14475530ed9054c8a89196adc822b31',BOUND_SMOKE.artifactZipSha256.slice(7)];
export function loadProductionSmokeDocuments(root){
 const bytes=SMOKE_EVIDENCE_FILES.map((f,i)=>{
  const b=fs.readFileSync(path.join(root,f));
  assert.equal(createHash('sha256').update(b).digest('hex'),smokeHashes[i],`native smoke bytes: ${f}`);return b;
 });
 const bodyBytes=execFileSync('python3',['-c',"import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); assert z.namelist()==['production-canary-smoke.json']; assert z.getinfo('production-canary-smoke.json').file_size<8000000; sys.stdout.buffer.write(z.read('production-canary-smoke.json'))",path.join(root,SMOKE_EVIDENCE_FILES[3])]);
 assert.equal(createHash('sha256').update(bodyBytes).digest('hex'),BOUND_SMOKE.smokeArtifactSha256,'native smoke inner JSON bytes');
 return {run:JSON.parse(bytes[0]),jobs:JSON.parse(bytes[1]),artifact:JSON.parse(bytes[2]),body:JSON.parse(bodyBytes)};
}
export function validateProductionSmokeDocuments({run,jobs,artifact,body:b}){
 const r=BOUND_SMOKE;
 assert.equal(run.id,r.runId);assert.equal(run.head_sha,r.toolsSha);assert.equal(run.head_branch,'captain-release');
 assert.equal(run.run_attempt,r.runAttempt);assert.equal(run.status,'completed');assert.equal(run.conclusion,r.conclusion);
 assert.equal(run.event,'workflow_dispatch');assert.equal(run.path,'.github/workflows/rcap-f1-ephemeral-staging.yml');
 assert.equal(run.display_title,`RCAP F1 | production_smoke | tools ${r.toolsSha} | app ${r.applicationSha} | cents 5000`);
 assert.equal(run.repository.full_name,'Roger-LegalEase/legalease-partner-dashboard-clean');
 assert.equal(artifact.id,r.artifactId);assert.equal(artifact.name,r.artifactName);assert.equal(artifact.digest,r.artifactZipSha256);assert.equal(artifact.expired,false);
 assert.deepEqual(artifact.workflow_run,{id:run.id,repository_id:run.repository.id,head_repository_id:run.repository.id,head_branch:'captain-release',head_sha:r.toolsSha});
 assert.equal(jobs.total_count,9);assert.equal(jobs.jobs.length,jobs.total_count,'complete smoke jobs evidence');
 const successful=jobs.jobs.filter(j=>j.conclusion==='success');assert.equal(successful.length,1);
 const j=successful[0];assert.equal(j.id,110107512991);assert.equal(j.run_id,r.runId);assert.equal(j.head_sha,r.toolsSha);assert.equal(j.run_attempt,r.runAttempt);
 assert.equal(j.name,'Read-only Production identity and rollback discovery / Exact Production release phase');
 assert.equal(j.status,'completed');assert.ok(jobs.jobs.filter(x=>x!==j).every(x=>x.conclusion==='skipped'));
 for(const number of [1,2,3,4,5,6,8,12,14,23,26,51,52,53])assert.equal(j.steps.find(s=>s.number===number)?.conclusion,'success',`smoke step ${number}`);
 for(const number of [7,9,10,11,13,15,16,17,18,19,20,21,22,24,25])assert.equal(j.steps.find(s=>s.number===number)?.conclusion,'skipped',`non-smoke step ${number}`);
 assert.equal(j.steps.find(s=>s.number===23)?.name,'Run the bounded no-alias Production canary smoke');
 assert.equal(j.steps.find(s=>s.number===26)?.name,'Upload the immutable Production preflight evidence');
 assert.equal(b.schemaVersion,'rcap-production-canary-smoke/v1');assert.equal(b.passed,true);assert.equal(b.failure,null);
 for(const k of ['applicationSha','workerSourceSha','workerDigest','productionProjectRef','stagedDeploymentId','rollbackDeploymentId'])assert.equal(b[k],r[k],`smoke ${k}`);
 assert.deepEqual(b.migrationHashes,['5e3df0a7f49aae3ebbec10b7392acd331e9ca91b2ffa11c7ee16b3e996f3ddef','9a0af066fbe2d47c82f259e6998a7056a2f8c377c8e6875f143d40fd11f18835','9fb46113fbb87eb75b1502f7cb85c9c27a36bac284888202b64baa63398f8010']);
 for(const key of ['realParticipantRecordsCreated','realChargesCreated','checkoutCreated','workerRun','deploymentTriggered','aliasChanged','environmentVariableChanged','productionDatabasePersistentlyMutated','originPersisted','secretsPersisted'])assert.equal(b[key],false,key);
 assert.equal(b.transactionalFixtureRolledBack,true);
 const expected=['exact_staged_application_worker_identity','rollback_target_is_ready_and_still_active','runtime_supabase_origin_is_canonical','staged_health_is_200','production_clinic_schema_direct_readback','save_claim_schema_read_back_exact','transactional_synthetic_fixture_rolled_back','colorado_juvenile_guidance_has_no_commerce','clinic_negative_control_isolated','clinic_reset_boundary_passed'];
 assert.deepEqual(b.verdicts.map(v=>v.caseId),expected);assert.ok(b.verdicts.every(v=>v.passed===true));
 for(const key of ['resetPrepareStatus','resetCloseStatus','resetCompleteStatus'])assert.equal(b[key],200,key);
 for(const key of ['resetPrepared','resetPrepareStateIsNoSession','resetRecoveryCookieIssued','resetCloseSuccess','resetRevocationConfirmed','resetSignOutConfirmed','resetClearSiteDataStorage','resetClinicCookiesCleared','resetCompleteSuccess','resetCleanEntryPathSafe','resetRecoveryRetired'])assert.equal(b[key],true,key);
 assert.equal(b.runtime.exactlyOneSupabaseOrigin,true);assert.equal(b.runtime.productionProjectMatch,true);
 assert.match(b.runtime.supabaseOriginSha256,/^[a-f0-9]{64}$/);
 assert.ok(Date.parse(b.startedAt)>=Date.parse(j.started_at)&&Date.parse(b.finishedAt)<=Date.parse(j.completed_at));
 return {...r};
}
export function verifyProductionSmokeEvidence(root){return validateProductionSmokeDocuments(loadProductionSmokeDocuments(root));}

// Activation closure captures immutable native evidence; never invokes a live control.
export const ACTIVATION_EVIDENCE_FILES=['run.json','jobs.json','artifact.json','11132063144.zip'].map(f=>`${BOUND_ACTIVATION.evidencePath}/${f}`);
const activationHashes=['b6ad2cd09485ea28eee4a09c7a72648bbbc629ddbba84692f8fff156c0eb6bf4','b696e9ff21153932c1671d33875944ca7d14cda579bc47fc900a10a0e8216c3f','859000acc09a14a7061bfeee9595ccae9ad8bdeaecdaf1afee266374e683832b',BOUND_ACTIVATION.artifactZipSha256.slice(7)];
export function validateProductionActivationReceiptBytes(bytes){
 assert.equal(createHash('sha256').update(bytes).digest('hex'),BOUND_ACTIVATION.activationArtifactSha256,'native activation inner JSON bytes');
 return JSON.parse(bytes);
}
export function loadProductionActivationDocuments(root){
 const bytes=ACTIVATION_EVIDENCE_FILES.map((f,i)=>{
  const b=fs.readFileSync(path.join(root,f));
  assert.equal(createHash('sha256').update(b).digest('hex'),activationHashes[i],`native activation bytes: ${f}`);return b;
 });
 const inner=execFileSync('python3',['-c',"import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); assert z.namelist()==['production-activation.json']; assert z.getinfo('production-activation.json').file_size<8000000; sys.stdout.buffer.write(z.read('production-activation.json'))",path.join(root,ACTIVATION_EVIDENCE_FILES[3])]);
 return {run:JSON.parse(bytes[0]),jobs:JSON.parse(bytes[1]),artifact:JSON.parse(bytes[2]),body:validateProductionActivationReceiptBytes(inner)};
}
export function validateProductionActivationDocuments({run,jobs,artifact,body:b}){
 const r=BOUND_ACTIVATION;
 assert.equal(run.id,r.runId);assert.equal(run.head_sha,r.toolsSha);assert.equal(run.head_branch,'captain-release');
 assert.equal(run.run_attempt,r.runAttempt);assert.equal(run.status,'completed');assert.equal(run.conclusion,r.conclusion);
 assert.equal(run.event,'workflow_dispatch');assert.equal(run.path,'.github/workflows/rcap-f1-ephemeral-staging.yml');
 assert.equal(run.display_title,`RCAP F1 | production_activate | tools ${r.toolsSha} | app ${r.applicationSha} | cents 5000`);
 assert.equal(run.repository.full_name,'Roger-LegalEase/legalease-partner-dashboard-clean');
 assert.equal(artifact.id,r.artifactId);assert.equal(artifact.name,r.artifactName);assert.equal(artifact.digest,r.artifactZipSha256);assert.equal(artifact.expired,false);
 assert.deepEqual(artifact.workflow_run,{id:run.id,repository_id:run.repository.id,head_repository_id:run.repository.id,head_branch:'captain-release',head_sha:r.toolsSha});
 assert.equal(jobs.total_count,9);assert.equal(jobs.jobs.length,jobs.total_count,'complete activation jobs evidence');
 const successful=jobs.jobs.filter(j=>j.conclusion==='success');assert.equal(successful.length,1);
 const j=successful[0];assert.equal(j.id,110145007447);assert.equal(j.run_id,r.runId);assert.equal(j.head_sha,r.toolsSha);assert.equal(j.run_attempt,r.runAttempt);
 assert.equal(j.name,'Read-only Production identity and rollback discovery / Exact Production release phase');
 assert.equal(j.status,'completed');assert.ok(jobs.jobs.filter(x=>x!==j).every(x=>x.conclusion==='skipped'));
 for(const number of [1,2,3,4,5,6,8,13,14,24,25,26,51,52,53])assert.equal(j.steps.find(s=>s.number===number)?.conclusion,'success',`activation step ${number}`);
 for(const number of [7,9,10,11,12,15,16,17,18,19,20,21,22,23])assert.equal(j.steps.find(s=>s.number===number)?.conclusion,'skipped',`non-activation step ${number}`);
 assert.equal(j.steps.find(s=>s.number===25)?.name,'Activate the exact staged Production deployment with rollback protection');
 assert.equal(b.schemaVersion,'rcap-production-activation/v1');assert.equal(b.passed,true);assert.equal(b.failure,null);
 for(const k of ['applicationSha','workerSourceSha','workerDigest','productionProjectRef','stagedDeploymentId','rollbackDeploymentId','smokeRunId'])assert.equal(b[k],r[k],`activation ${k}`);
 assert.equal(b.controlHashes.smokeArtifactSha256,r.smokeArtifactSha256);
 assert.deepEqual(b.migrationHashes,['5e3df0a7f49aae3ebbec10b7392acd331e9ca91b2ffa11c7ee16b3e996f3ddef','9a0af066fbe2d47c82f259e6998a7056a2f8c377c8e6875f143d40fd11f18835','9fb46113fbb87eb75b1502f7cb85c9c27a36bac284888202b64baa63398f8010']);
 for(const k of ['promotionAttempted','promotionCompleted','productionAliasChanged'])assert.equal(b[k],true,k);
 for(const k of ['deploymentTriggered','environmentVariableChanged','productionDatabaseMutated','workerChanged','applicationChanged','realParticipantRecordsCreated','realChargesCreated','originPersisted','secretsPersisted'])assert.equal(b[k],false,k);
 assert.deepEqual(b.promotion,{control:'promote',targetDeploymentId:r.stagedDeploymentId,httpStatus:201,ok:true,errorCode:null,errorMessage:null});
 assert.deepEqual(b.automaticRollback,{attempted:false,completed:false,productionMoved:null,control:null,failure:null});
 for(const stem of ['environmentMetadata','deploymentInventory']){
  assert.match(b.controlHashes[`${stem}BeforeSha256`],/^[a-f0-9]{64}$/);
  assert.equal(b.controlHashes[`${stem}BeforeSha256`],b.controlHashes[`${stem}AfterSha256`]);
 }
 const expected=['successful_smoke_artifact_is_exact','exact_vercel_project_is_bound','staged_deployment_identity_is_exact','rollback_is_ready_and_active_before_promotion','production_clinic_schema_is_exact','production_domains_resolve_to_staged_deployment','active_production_health_is_200','active_runtime_project_is_canonical','environment_metadata_is_unchanged','activation_created_no_deployment','rollback_target_remains_ready'];
 assert.deepEqual(b.verdicts.map(v=>v.caseId),expected);assert.ok(b.verdicts.every(v=>v.passed===true));
 assert.deepEqual(b.runtimeProof,{productionProjectMatch:true,exactlyOneOrigin:true,healthyDomainCount:1,productionDomainCount:7,pagesInspected:3,chunksInspected:15});
 assert.ok(Date.parse(b.startedAt)>=Date.parse(j.started_at)&&Date.parse(b.finishedAt)<=Date.parse(j.completed_at));
 return {...r};
}
export function verifyProductionActivationEvidence(root){return validateProductionActivationDocuments(loadProductionActivationDocuments(root));}
