// Actual release prerequisites only; none of these receipts admits a database write by itself.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {readQualifiedPreflightEvidence,prepareQualifiedWorkerPreflightRecords} from './qualified-worker-preflight-binding.mjs';
import {assertQualifiedWorkerCompatibility,QUALIFIED_FORWARD_APP} from './verify-qualified-worker-forward-binding.mjs';
import {applicationInputEquivalence} from '../rcap-application-inputs.mjs';
import {QUALIFIED_DATABASE_PACKAGE_PATH,readQualifiedDatabasePackage} from '../qualified-production-database-package.mjs';
import {readQualifiedDatabaseAcceptedFirstCommit} from '../qualified-db-accepted-first-commit.mjs';
import {readReadinessPrerequisites,nonsecretRollbackCapsule} from '../qualified-worker-readonly-capture.mjs';
import {readHandoffHistoryInputs,HANDOFF_HISTORY_REFS} from '../worker-handoff-history-readonly.mjs';
const EVIDENCE='data/rcap-grade-a/launch-control/qualified-release-evidence/';
const RECORDS=['PENDING_WORKER_SUCCESSOR','RELEASE_CANDIDATE_BINDING','HOSTED_TOOLS_BINDING'].map(n=>'data/rcap-grade-a/launch-control/'+n+'.json');
const RELEASE_BASE='e49d4fee4d3c082f3be9571f4d3f5d77f5b2f67b';
const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',maxBuffer:64*1024*1024}).trim();
const blob=(root,sha,p)=>execFileSync('git',['show',sha+':'+p],{cwd:root,maxBuffer:64*1024*1024});
const hash=b=>createHash('sha256').update(b).digest('hex');
// This is package technical acceptance; root still requires independent frozen-source/runtime admission.
export const QUALIFIED_DATABASE_ADMISSION={path:EVIDENCE+'C-WWT-TWO-MIGRATION-TECHNICAL-ACCEPTANCE.json',sha256:'66870fde5677c63a4b2e3c1a051f3e4cd58ef917d954956eec64e3e81121aba0'};
export const QUALIFIED_DATABASE_PACKAGE_SHA256='4a3f5a3b79f99d0eeb1678fcce4cbb363a5b45d2ff864a6d68bd34d08cdfaab4';
const ORIGINAL_PACKAGE_SHA256='dad0cd2218ecf6bc8cb490b156c00909520c9185f5423dd0980b304989cd7239';
export const QUALIFIED_DATABASE_NO_EFFECT={path:EVIDENCE+'C-406135-NO-EFFECT-DISPOSITION.json',sha256:'186ee65aa9d932f58bbb8456f3860a03470782649c878b540abfafaf84c45aed'};
const NO_EFFECT_RESULT={path:EVIDENCE+'ACTUAL-406135-RESULT.json',sha256:'08d89d9285e9f26da49c0b687748c5322d55945aaecc9fe553c401d94d7b5521'};
export const QUALIFIED_DATABASE_PREREQUISITES={
 preflight:{path:EVIDENCE+'ACTUAL-PRODUCTION-PREFLIGHT.json',sha256:'0d60dc5a5e736b90e939b14f776a970b1e0244e8229283bf24862835397ce234'},
 acceptance:{path:EVIDENCE+'C-ACTUAL-PRODUCTION-PREFLIGHT.json',sha256:'c281b20fba2e159242126465eae08e668f444dfa49ea6add4ec4c234130d1b41'},
 authority:{path:EVIDENCE+'C-EXISTING-OWNER29223-SCOPE.json',sha256:'01c2d60d1c3cecb48e04e5979f848b057c091d53dbd4ad69d04f1fb245711452'},
};
export function readQualifiedProductionDatabasePrerequisites(root){
 const original=readQualifiedPreflightEvidence(root),{identity}=assertQualifiedWorkerCompatibility(root),documents={};
 for(const [key,ref] of Object.entries(QUALIFIED_DATABASE_PREREQUISITES)){
  const bytes=fs.readFileSync(path.join(root,ref.path));assert.equal(createHash('sha256').update(bytes).digest('hex'),ref.sha256,'Actual release prerequisite '+key);documents[key]=JSON.parse(bytes);
 }
 const {preflight,acceptance,authority}=documents;
 assert.equal(acceptance.schemaVersion,'qualified-production-first-preflight-actual-independent-acceptance/v1');assert.equal(acceptance.authority,'CODEX C');assert.equal(acceptance.runId,40606269080);
 assert.equal(preflight.passed,true);assert.equal(preflight.phase,'preflight');assert.equal(preflight.verdicts.length,11);assert(preflight.verdicts.every(v=>v.passed===true));
 for(const [key,value] of Object.entries({applicationSha:QUALIFIED_FORWARD_APP,workerSourceSha:identity.source,workerDigest:identity.digest}))assert.equal(preflight.requestedIdentity[key],value);
 assert.deepEqual(preflight.deployments,acceptance.deployments);assert.deepEqual(preflight.projectRefs,{production:'wwtwtsmywnckfkdaqqeg',acceptance:'hyflxnlhpmiqxvvcoiia'});
 assert.equal(authority.authority,'CODEX C');assert.equal(authority.nativeOwner.sha256IncludingLF,'49b86d196021f1bcc1251569152b5d803b0dfe6771694c4910eb8171d82b89b6');
 assert.equal(authority.nativeOwner.timestamp,'2026-10-28T00:02:56.591Z');assert.equal(authority.retainedPriorOwnerAuthoritySha256,'cc11ef00c38aa787847d06aeb20a0323e526afc5cbd9f2c9aef6903deba04e2e');
 return {...documents,original,identity};
}
export function readQualifiedDatabaseTechnicalAdmission(root){
 assert(QUALIFIED_DATABASE_ADMISSION,'Actual C technical package admission is required before any database phase');
 const bytes=fs.readFileSync(path.join(root,QUALIFIED_DATABASE_ADMISSION.path));assert.equal(hash(bytes),QUALIFIED_DATABASE_ADMISSION.sha256);
 const admission=JSON.parse(bytes);assert.equal(admission.schemaVersion,'wwt-two-source-migration-package-independent-technical-acceptance/v1');assert.equal(admission.authority,'CODEX C');assert.equal(admission.accepted,true);assert.equal(admission.databaseWriteAdmitted,false);assert.equal(admission.executionAdmitted,false);assert.equal(admission.projectRef,'wwtwtsmywnckfkdaqqeg');assert.equal(admission.applicationSha,QUALIFIED_FORWARD_APP);assert(Number.isFinite(Date.parse(admission.at))&&Date.parse(admission.at)<=Date.now());assert.equal(admission.packageSha256,ORIGINAL_PACKAGE_SHA256);
 return admission;
}
export function readQualifiedDatabaseNoEffectRearm(root){
 const read=ref=>{const bytes=fs.readFileSync(path.join(root,ref.path));assert.equal(hash(bytes),ref.sha256);return JSON.parse(bytes);};
 const c=read(QUALIFIED_DATABASE_NO_EFFECT),result=read(NO_EFFECT_RESULT);
 assert.equal(c.schemaVersion,'qualified-production-migration-actual-readonly-actor-stop-independent-disposition/v1');assert.equal(c.authority,'CODEX C');assert.equal(c.accepted,true);assert.equal(c.runId,40613540061);assert.equal(c.executionSha,'f55de37acde2069f77b2b0891a555249e9f25ec3');assert.equal(c.toolsSha,'be8adb541166e356c4d0cf9039fa1e2b956b3932');
 for(const key of ['databaseMutationRequestSent','boundWireCreated','databaseWriteOccurredThroughThisRun','automaticRetryAdmitted','redispatchUnchangedControllerAdmitted'])assert.equal(c[key],false);
 assert.equal(c.transactionsAttempted,0);assert.equal(c.transactionsCommitted,0);assert.equal(c.actualStage,'before_transaction_1');assert.equal(c.rawResult.sha256,NO_EFFECT_RESULT.sha256);assert.equal(c.artifact.serverDigestVerified,true);assert.equal(c.artifact.independentlyDownloadedByC,true);
 assert(Number.isFinite(Date.parse(c.at))&&Date.parse(c.at)<=Date.now());
 assert.equal(result.schemaVersion,'qualified-production-database-execution/v1');assert.equal(result.status,'HOLD_DATABASE_RECONCILIATION_NO_RETRY');assert.equal(result.stage,c.actualStage);assert.equal(result.attemptedTransactions,0);assert.equal(result.committedTransactions,0);assert.equal(result.runId,c.runId);assert.equal(result.workflowExecutionSha,c.executionSha);assert.equal(result.releaseTuple.toolsSha,c.toolsSha);assert.equal(result.actualTargetProjectRef,'wwtwtsmywnckfkdaqqeg');assert.equal(result.packageSha256,ORIGINAL_PACKAGE_SHA256);
 assert.equal(result.transactions.length,2);for(const t of result.transactions){assert.equal(t.outcome,'not_attempted');assert.equal(t.wireSha256,undefined);assert.equal(t.nativeReceipt,undefined);}
 return {disposition:QUALIFIED_DATABASE_NO_EFFECT,result:NO_EFFECT_RESULT,at:c.at,runId:c.runId,jobId:c.jobId,executionSha:c.executionSha,toolsSha:c.toolsSha,artifactId:c.artifact.id,artifactSha256:c.artifact.zipSha256};
}
// Pure preparation; the consumed preflight is preserved as predecessor evidence, never reused as a phase grant.
export function prepareQualifiedDatabaseRecords(root,{toolsSha,releaseBaseSha}){
 assert.equal(releaseBaseSha,RELEASE_BASE);assert.match(toolsSha??'',/^[a-f0-9]{40}$/);git(root,['merge-base','--is-ancestor',releaseBaseSha,toolsSha]);
 const rearm=readQualifiedDatabaseNoEffectRearm(root);assert.notEqual(toolsSha,rearm.toolsSha,'Prior tools cannot be rearmed unchanged');assert.notEqual(toolsSha,rearm.executionSha,'Prior controller cannot be reused as corrected tools');
 const priorAcceptedCommit=readQualifiedDatabaseAcceptedFirstCommit(root);assert.notEqual(toolsSha,priorAcceptedCommit.toolsSha);assert.notEqual(toolsSha,priorAcceptedCommit.executionSha);
 const admission=readQualifiedDatabaseTechnicalAdmission(root),prerequisites=readQualifiedProductionDatabasePrerequisites(root),source=readQualifiedDatabasePackage(root,QUALIFIED_DATABASE_PACKAGE_SHA256);
 assert.equal(source.manifestSha256,priorAcceptedCommit.correctedPackageSha256);assert.equal(source.manifest.workerSourceSha,prerequisites.identity.source);assert.equal(source.manifest.workerDigest,prerequisites.identity.digest);assert.equal(admission.workerSourceSha,source.manifest.workerSourceSha);assert.equal(admission.workerDigest,source.manifest.workerDigest);assert.equal(admission.beforeStateSha256,source.manifest.beforeStateSha256);assert.equal(admission.comparisonModule.sha256,'833cf0955ab7d7e9371829a9f3973fd11e3ed6ca0c65925d74a898b25f7db07c');assert.equal(source.manifest.comparisonModule.sha256,'c676bcc49e827cd76fb24953bad3fc92e8d03de40a9e2309f2b6c05c0d3836e2');assert.equal(source.manifest.supersedes.packageSha256,admission.packageSha256);
 const original=prepareQualifiedWorkerPreflightRecords(root,{toolsSha,releaseBaseSha:'9c120d99f800c1fcf2ccf5c4b4e5b3eedd75a291'}),records={};
 const profile={schemaVersion:'qualified-production-two-migration-binding/v1',phase:'forward_chain_migrate',releaseBaseSha,package:{path:QUALIFIED_DATABASE_PACKAGE_PATH,sha256:QUALIFIED_DATABASE_PACKAGE_SHA256},technicalAdmission:QUALIFIED_DATABASE_ADMISSION,correctedTechnicalAdmission:priorAcceptedCommit.correctedTechnicalAdmission,technicalAdmissionAt:admission.at,priorNoEffectRearm:rearm,priorAcceptedCommit,prerequisites:QUALIFIED_DATABASE_PREREQUISITES};
 for(const rel of RECORDS){
  const before=blob(root,releaseBaseSha,rel),record={...original[rel]};delete record.qualifiedWorkerPreflight;
  records[rel]={...record,status:'QUALIFIED_PRODUCTION_DATABASE_REMAINING_TRANSACTION_ONLY',qualifiedWorkerDatabase:profile,
   productionAuthorization:{...record.productionAuthorization,recordedAt:prerequisites.authority.nativeOwner.timestamp,phases:['forward_chain_migrate'],stagedDeploymentId:prerequisites.preflight.deployments.stagedProduction,rollbackDeploymentId:prerequisites.preflight.deployments.rollbackTarget,
    authority:QUALIFIED_DATABASE_PREREQUISITES.authority,note:'Derived from retained owner orders and exact C package technical admission. Only remaining canonical index1 after the independently accepted actual index0 commit, with exact fresh post1 CAS and original transaction-local guards. No first replay, retry or inverse; smoke, worker placement and activation remain held.'},
   consumedPreflight:{runId:40606269080,receipt:QUALIFIED_DATABASE_PREREQUISITES.preflight,acceptance:QUALIFIED_DATABASE_PREREQUISITES.acceptance},supersededRecord:JSON.parse(before),supersededRecordSha256:hash(before)};
 }
 return records;
}
export const QUALIFIED_DATABASE_COMPLETION_REFS={
 acceptance:{path:EVIDENCE+'C-406179-FINAL-DATABASE-ACCEPTANCE.json',sha256:'cdd534190abd576171ff6db85c943873e1600ee84e2a5dfad1fbdfa742ac452c'},
 result:{path:EVIDENCE+'ACTUAL-406179-result.json',sha256:'7401d0363a4dbdacfd3c1bc1f8f342e33a4639d58f84b7a00a07db33b1aea042'},
 proof:{path:EVIDENCE+'C-406179-FULL-TRANSITION-PROOF.json',sha256:'0d28100049764a43692cf293a1def35379b9403dfdca25b5abf7ecb170c05858'},
};
const DATABASE_EXECUTION='8b496ce7fb75e241851c301866371473c83c9fd2';
export function readQualifiedDatabaseCompletion(root){
 const documents=Object.fromEntries(Object.entries(QUALIFIED_DATABASE_COMPLETION_REFS).map(([key,ref])=>{const bytes=fs.readFileSync(path.join(root,ref.path));assert.equal(hash(bytes),ref.sha256,'Actual final database evidence '+key);return[key,JSON.parse(bytes)];}));
 const {acceptance:c,result,proof}=documents,prior=readQualifiedDatabaseAcceptedFirstCommit(root);
 assert.equal(c.schemaVersion,'qualified-production-two-required-migrations-final-database-independent-acceptance/v1');assert.equal(c.authority,'CODEX C');assert.equal(c.accepted,true);assert.equal(c.runId,40617912474);assert.equal(c.executionSha,DATABASE_EXECUTION);assert.equal(c.toolsSha,'d1eed693336cfd377caea5845806e9ee3c64a95a');assert(Number.isFinite(Date.parse(c.at))&&Date.parse(c.at)<=Date.now());
 for(const key of ['databaseCompatibilityAccepted','productionDatabaseCompatibilityAccepted','allRequiredTwoMigrationCriteriaAccepted','migrationExecutionComplete','smokeSourcePreparationScopeAccepted'])assert.equal(c[key],true);
 for(const key of ['anyMigrationReplayOrRetryAdmitted','smokeExecutionAdmitted','workerPlacementAdmitted','activationAdmitted','publicVerifyAdmitted','canonicalSourceEquivalent'])assert.equal(c[key],false);assert.equal(c.canonicalRebuildRequired,true);
 assert.equal(c.artifact.serverDigestIndependentlyVerifiedByC,true);assert.equal(c.actualResult.sha256,QUALIFIED_DATABASE_COMPLETION_REFS.result.sha256);assert.equal(c.independentActualProof.sha256,QUALIFIED_DATABASE_COMPLETION_REFS.proof.sha256);assert.equal(c.packageSha256,QUALIFIED_DATABASE_PACKAGE_SHA256);
 assert.equal(result.schemaVersion,'qualified-production-database-execution/v1');assert.equal(result.status,'DATABASE_POSTSTATE_VERIFIED_REQUIRES_C_ACCEPTANCE');assert.equal(result.stage,'complete');assert.equal(result.passed,true);assert.equal(result.runId,c.runId);assert.equal(result.workflowExecutionSha,c.executionSha);assert.equal(result.packageSha256,c.packageSha256);assert.equal(result.attemptedTransactions,1);assert.equal(result.committedTransactions,1);assert.equal(result.automaticRetry,false);assert.equal(result.automaticInverse,false);assert.equal(result.effectsLimitedToCanonicalTransactions,true);assert.equal(result.smokeAuthorized,false);
 for(const key of ['applicationSha','workerSourceSha','workerDigest','workerInputFingerprint','productionProjectRef'])assert.equal(result.releaseTuple[key],c[key]);assert.equal(result.releaseTuple.toolsSha,c.toolsSha);assert.equal(result.actualTargetProjectRef,c.productionProjectRef);
 assert.deepEqual(result.priorAcceptedCommit,prior);assert.equal(result.transactions.length,2);assert.deepEqual(result.transactions[0],{...prior.transaction,outcome:'prior_commit_independently_verified'});
 assert.equal(c.firstAcceptedTransaction.replayedByCurrentRun,false);assert.equal(c.firstAcceptedTransaction.acceptanceSha256,prior.disposition.sha256);assert.deepEqual(c.firstAcceptedTransaction.nativeReceipt,prior.transaction.nativeReceipt);
 const second=result.transactions[1];assert.equal(second.outcome,'poststate_verified');assert.equal(second.nativeReceipt.step,1);assert.equal(second.nativeReceipt.schemaVersion,'wwt-two-migration-schema-native-receipt/v1');assert.equal(second.nativeReceipt.canonicalSha256,second.sha256);assert.equal(second.nativeReceipt.transactionLocalPreimageAndPreservationGuardPassed,true);assert.match(second.nativeReceipt.catalogOwnerXid,/^[1-9][0-9]*$/);assert.deepEqual(second.nativeReceipt,c.secondAcceptedTransaction.nativeReceipt);assert.equal(second.wireSha256,c.secondAcceptedTransaction.boundWireSha256);assert.deepEqual(second.poststate,c.secondAcceptedTransaction.actualPoststate);assert.equal(second.beforeStateSha256,prior.acceptedPoststateSha256);
 assert.equal(proof.schemaVersion,'c-actual-step2-final-source-effects-preservation-proof/v1');assert.equal(proof.runId,c.runId);for(const key of ['actualFreshPost1MatchedTwice','wireAndCanonicalAndRequestVerified','priorFirstCommitPreservedWithoutReplay','originalInventoryBothKnownAccounted','firstTransactionRequestAbsent','allUnrelatedMetadataPreserved'])assert.equal(proof[key],true);assert.equal(proof.productionSQLExecutedByC,false);assert.deepEqual(proof.transitionResult,second.poststate);assert.equal(proof.acceptedFinalStateSha256,c.actualFinalStateSha256);assert.equal(second.poststate.afterStateSha256,c.actualFinalStateSha256);assert.equal(second.poststate.nativePoststate,true);assert.equal(c.totalRequiredAcceptedSourceCommits,2);
 const scope=c.nextStageSourceContract;assert.equal(scope.phase,'smoke');assert.equal(scope.phaseOnly,true);assert.deepEqual(scope.sameReleaseTupleRequired,Object.fromEntries(['applicationSha','workerSourceSha','workerDigest'].map(key=>[key,c[key]])));
 return{...QUALIFIED_DATABASE_COMPLETION_REFS,runId:c.runId,executionSha:c.executionSha,toolsSha:c.toolsSha,at:c.at,artifactId:c.artifact.id,artifactSha256:c.artifact.zipSha256,actualFinalStateSha256:c.actualFinalStateSha256,deployments:scope.sameDeployments};
}
// Pure preparation of the existing smoke phase; actual migration grants remain predecessor evidence.
export function prepareQualifiedSmokeRecords(root,{toolsSha,releaseBaseSha}){
 assert.equal(releaseBaseSha,DATABASE_EXECUTION);git(root,['merge-base','--is-ancestor',releaseBaseSha,toolsSha]);assert.notEqual(toolsSha,releaseBaseSha);
 const completedDatabase=readQualifiedDatabaseCompletion(root),records=prepareQualifiedDatabaseRecords(root,{toolsSha,releaseBaseSha:RELEASE_BASE});
 for(const rel of RECORDS){
  const record=records[rel],before=blob(root,releaseBaseSha,rel),previous=JSON.parse(before);
  assert.equal(previous.toolsSha,completedDatabase.toolsSha);assert.equal(previous.qualifiedWorkerDatabase.phase,'forward_chain_migrate');assert.deepEqual(previous.qualifiedWorkerDatabase.priorAcceptedCommit,record.qualifiedWorkerDatabase.priorAcceptedCommit);
  assert.equal(record.productionAuthorization.stagedDeploymentId,completedDatabase.deployments.stagedProduction);assert.equal(record.productionAuthorization.rollbackDeploymentId,completedDatabase.deployments.rollbackAndCurrentLive);
  records[rel]={...record,status:'QUALIFIED_PRODUCTION_STAGED_SMOKE_ONLY',qualifiedWorkerDatabase:{...record.qualifiedWorkerDatabase,migrationReleaseBaseSha:RELEASE_BASE,releaseBaseSha,phase:'smoke',completedDatabase},
   productionAuthorization:{...record.productionAuthorization,phases:['smoke'],note:'Existing staged smoke only after actual final database compatibility acceptance. Existing synthetic SQL fixture must roll back with zero residue. No migration replay, alias/environment change, worker placement, activation or live customer transaction.'},supersededRecord:previous,supersededRecordSha256:hash(before)};
 }
 return records;
}
export const QUALIFIED_WORKER_READINESS_REFS={
 acceptance:{path:EVIDENCE+'C-406256-READINESS-ACCEPTANCE.json',sha256:'ed60a2b5abc4a4f9cc3b4a30b8e0d0c0aaad0359c0ba65f3f4d81ee0b8d9a07b'},
 identity:{path:EVIDENCE+'ACTUAL-406256-identity.json',sha256:'2b07395c45b6c8f6c8f6e55c40925d9ed0f0959ac866a66177048a6165275073'},
 capsule:{path:EVIDENCE+'ACTUAL-406256-rollback-config.json',sha256:'c1809cb5c0d04b5c43d0c68c2688decbc61e0daca03fa1db30a537860067f760'},
};
const READINESS_EXECUTION='36f0f8ccdd9cd6923686fdd34a1674e53cc9aaf1';
export function readQualifiedWorkerPlacementEvidence(root){
 const documents=Object.fromEntries(Object.entries(QUALIFIED_WORKER_READINESS_REFS).map(([k,ref])=>{const b=fs.readFileSync(path.join(root,ref.path));assert.equal(hash(b),ref.sha256,'Actual accepted worker readiness '+k);return[k,JSON.parse(b)];}));
 const {acceptance:c,identity,capsule}=documents;
 assert.equal(c.schemaVersion,'qualified-production-actual-worker-readiness-custody-independent-acceptance/v1');assert.equal(c.authority,'CODEX C');assert.equal(c.accepted,true);assert.equal(c.runId,40625686732);assert.equal(c.executionSha,READINESS_EXECUTION);assert.equal(c.artifact.serverDigestIndependentlyVerifiedByC,true);assert.equal(c.identity.sha256,QUALIFIED_WORKER_READINESS_REFS.identity.sha256);assert.equal(c.exactDurableNonsecretRollbackCapsule.sha256,QUALIFIED_WORKER_READINESS_REFS.capsule.sha256);
 for(const key of ['actualReadinessAccepted','rollbackCustodyAccepted','effectiveWwtBindingAccepted','queueLifecycleFactsAccepted','nativeStopAndLeaseParametersAccepted'])assert.equal(c[key],true);for(const key of ['workerPlacementAdmitted','actualHandoffAccepted','activationAdmitted'])assert.equal(c[key],false);
 assert.equal(identity.schemaVersion,'qualified-worker-readonly-readiness/v1');assert.equal(identity.status,'READINESS_CAPTURED_REQUIRES_C_REVIEW');assert.equal(identity.runId,c.runId);assert.equal(identity.executionSha,c.executionSha);assert.deepEqual(identity.refusals,[]);assert.equal(identity.machineUnchangedDuringCapture,true);assert.deepEqual(identity.machine,c.acceptedMachine);assert.deepEqual(identity.observations.effectiveWorker,c.acceptedProcess);assert.deepEqual(identity.observations.queue,c.acceptedQueue);assert.equal(identity.rollback.sha256,QUALIFIED_WORKER_READINESS_REFS.capsule.sha256);assert.equal(identity.rollback.configSha256,c.nativeConfigSha256);assert.equal(identity.rollback.durableVerified,true);
 assert.equal(c.nativeStop.signal,'SIGTERM');assert.equal(c.nativeStop.timeout,'30s');assert.equal(c.nativeStop.claimLeaseSeconds,600);assert.equal(c.nativeStop.workerLoopHandlesSignal,true);assert.equal(c.existingExposedWorkCompatibility.acceptedAtCapture,true);assert.equal(c.existingExposedWorkCompatibility.notAnEmptyQueueRequirement,true);assert.equal(c.noFurtherReadinessCaptureRequiredForUnchangedAcceptedFacts,true);
 const safe=nonsecretRollbackCapsule({id:capsule.machineId,instance_id:capsule.instanceId,image_ref:{digest:capsule.imageDigest,labels:{'org.opencontainers.image.revision':capsule.ociRevision}},config:capsule.config});assert.equal(safe.sha256,QUALIFIED_WORKER_READINESS_REFS.capsule.sha256);assert.equal(safe.configSha256,c.nativeConfigSha256);assert.equal(capsule.config.env.RCAP_WORKER_CLAIM_SECONDS,'600');assert.deepEqual(safe.stopConfig,c.acceptedMachine.stopConfig);
 const descriptor={...QUALIFIED_WORKER_READINESS_REFS,runId:c.runId,executionSha:c.executionSha,acceptedMachine:c.acceptedMachine,configSha256:c.nativeConfigSha256,acceptedExposure:c.acceptedQueue.exposed_work,nativeStop:c.nativeStop};
 return{descriptor,identity,capsule,acceptance:c};
}
export function prepareQualifiedWorkerPlacementRecords(root,{toolsSha,releaseBaseSha}){
 assert.equal(releaseBaseSha,READINESS_EXECUTION);assert.notEqual(toolsSha,releaseBaseSha);git(root,['merge-base','--is-ancestor',releaseBaseSha,toolsSha]);
 const evidence=readQualifiedWorkerPlacementEvidence(root),completedSmoke=readReadinessPrerequisites(root),records=prepareQualifiedSmokeRecords(root,{toolsSha,releaseBaseSha:DATABASE_EXECUTION});
 for(const rel of RECORDS){const record=records[rel],before=blob(root,releaseBaseSha,rel),previous=JSON.parse(before);assert.equal(previous.qualifiedWorkerDatabase.phase,'smoke');assert.deepEqual(previous.qualifiedWorkerDatabase.completedDatabase,record.qualifiedWorkerDatabase.completedDatabase);
  records[rel]={...record,status:'QUALIFIED_PRODUCTION_WORKER_PLACEMENT_ONLY',qualifiedWorkerDatabase:{...record.qualifiedWorkerDatabase,smokeReleaseBaseSha:DATABASE_EXECUTION,releaseBaseSha,phase:'production_worker_deploy',completedSmoke,acceptedWorkerReadiness:evidence.descriptor},productionAuthorization:{...record.productionAuthorization,phases:['production_worker_deploy'],note:'Existing exact immutable worker placement only after accepted DB, staged smoke and current rollback/readiness. Require fresh immediate pre-effect identity/config/WWT/exposure checks and actual safe same-machine handoff/postproof. No rebuild, queue reset, blind rollback or app activation.'},supersededRecord:previous,supersededRecordSha256:hash(before)};
 }
 return records;
}
export const QUALIFIED_WORKER_COMPLETION_REFS={
 acceptance:{path:EVIDENCE+'C-406283-406313-SAFE-WORKER-ACCEPTANCE.json',sha256:'01ed18aea807d2ef726676749958d129a795b575ad6a5e3fff65c97354299bee'},
 pre:{path:EVIDENCE+'ACTUAL-406283-pre-identity.json',sha256:'18c8be6b216e2eb0429c06e3e03d4938b655c7d905f5dd85ca3a46861b52fa25'},
 execution:{path:EVIDENCE+'ACTUAL-406283-execution.json',sha256:'670f491f09f88c5f13f1cd4ad3bc6cd683987318186a1c5761d64f454bb6ffbd'},
 history:{path:EVIDENCE+'ACTUAL-406313-history.json',sha256:'a180c259a0860d7bf9aadf67c19cdb261891807faebef7a908b746cbeacf4b66'},
};
const WORKER_EXECUTION='f7c9aaad0b71bc7a5e2b6f511039132d78006548';
export function readQualifiedWorkerCompletion(root){
 const input=readHandoffHistoryInputs(root),d=Object.fromEntries(Object.entries(QUALIFIED_WORKER_COMPLETION_REFS).map(([k,r])=>{const b=fs.readFileSync(path.join(root,r.path));assert.equal(hash(b),r.sha256,'Actual worker completion '+k);return[k,JSON.parse(b)];})),c=d.acceptance;
 assert.equal(c.schemaVersion,'qualified-production-safe-matching-worker-transition-original-scope-independent-acceptance/v1');assert.equal(c.authority,'CODEX C');assert.equal(c.accepted,true);assert(Number.isFinite(Date.parse(c.at))&&Date.parse(c.at)<=Date.now());
 for(const key of ['physicalMatchingWorkerAccepted','wholeMatchingWorkerTransitionAccepted','safeHandoffAccepted','actualHandoffAccepted','noGuardOrNativeHistoryRewritten'])assert.equal(c[key],true);
 for(const key of ['cleanExitCodesObserved','oldExitEventObserved','strictPostGuardPassed','activationAdmitted','repeatWorkerPlacementAdmitted','rollbackAdmitted'])assert.equal(c[key],false);
 assert.equal(c.actualEvidence.placementRunId,40628380931);assert.equal(c.actualEvidence.historyRunId,40631332815);
 for(const [key,ref] of Object.entries({acceptedPhysicalPlacementAndNativeConfig:HANDOFF_HISTORY_REFS.partial,actualPreEffectIdentityQueue:QUALIFIED_WORKER_COMPLETION_REFS.pre,actualPostPlacementIdentityQueue:HANDOFF_HISTORY_REFS.post,actualOldRollbackCapsule:HANDOFF_HISTORY_REFS.oldConfig,actualPostConfig:HANDOFF_HISTORY_REFS.postConfig,actualPlacementIntent:HANDOFF_HISTORY_REFS.intent,actualExecutionEightChecksPass:QUALIFIED_WORKER_COMPLETION_REFS.execution,strictPostGuardResultUnchanged:HANDOFF_HISTORY_REFS.postReceipt,actualHistory:QUALIFIED_WORKER_COMPLETION_REFS.history}))assert.equal(c.actualEvidence[key].sha256,ref.sha256);
 assert.equal(d.pre.runId,40628380931);assert.equal(d.pre.executionSha,WORKER_EXECUTION);assert.deepEqual(d.pre.machine,input.oldIdentity.machine);assert.equal(d.pre.rollback.sha256,HANDOFF_HISTORY_REFS.oldConfig.sha256);
 for(const identity of [d.pre,input.post]){assert.deepEqual(identity.refusals,[]);assert.equal(identity.machineUnchangedDuringCapture,true);const q=identity.observations.queue;assert.deepEqual(q.status_counts,{});assert.deepEqual(q.exposed_work,[]);assert.equal(q.current_user,'postgres');assert.equal(q.session_user,'postgres');assert.equal(q.transaction_read_only,'on');for(const key of ['queued','claimed','rendering','validating','live_leases','expired_leases','missing_leases','eligible_queued','scheduled_queued','retryable_failed','terminal_failed','exposure_group_count'])assert.equal(q[key],0);}
 assert.equal(input.post.observations.effectiveWorker.passed,true);assert.equal(input.post.observations.effectiveWorker.projectRef,'wwtwtsmywnckfkdaqqeg');assert.equal(input.post.observations.effectiveWorker.roleProven,true);assert.equal(input.post.observations.effectiveWorker.queueHeadStatus,200);
 assert.equal(d.execution.result,'PASS');assert.equal(d.execution.checks.length,8);assert(d.execution.checks.every(v=>v.passed===true));assert.equal(d.execution.workerSourceSha,input.post.machine.ociRevision);assert.equal(d.execution.workerDigest,input.post.machine.exportedDigest);
 assert.equal(d.history.runId,40631332815);assert.equal(d.history.executionSha,'70325ad2a0a5b73b186a05ee1b1726ece4e25a08');assert.equal(d.history.status,'HOLD_NATIVE_HANDOFF_HISTORY_UNPROVEN');assert.equal(d.history.handoffVerified,false);assert.equal(d.history.machineUnchangedDuringHistoryRead,true);assert.deepEqual(d.history.currentBefore,d.history.currentAfter);assert.equal(d.history.currentAfter.instanceId,input.post.machine.instanceId);assert.equal(d.history.currentAfter.imageDigest,input.post.machine.imageDigest);assert.equal(d.history.currentAfter.configSha256,input.post.rollback.configSha256);
 return{...QUALIFIED_WORKER_COMPLETION_REFS,placementInputs:HANDOFF_HISTORY_REFS,runId:40628380931,executionSha:WORKER_EXECUTION,historyRunId:40631332815,acceptedAt:c.at,safeTransitionAccepted:true,historicalCleanExitObserved:false,strictPostGuardPassed:false,machine:input.post.machine,configSha256:input.post.rollback.configSha256};
}
// C accepts this actual no-exposed-work transition; the native strict postguard remains failed.
export function prepareQualifiedActivationRecords(root,{toolsSha,releaseBaseSha}){
 assert.equal(releaseBaseSha,WORKER_EXECUTION);assert.notEqual(toolsSha,releaseBaseSha);git(root,['merge-base','--is-ancestor',releaseBaseSha,toolsSha]);
 const completedWorker=readQualifiedWorkerCompletion(root),records=prepareQualifiedWorkerPlacementRecords(root,{toolsSha,releaseBaseSha:READINESS_EXECUTION});
 for(const rel of RECORDS){const record=records[rel],before=blob(root,releaseBaseSha,rel),previous=JSON.parse(before);assert.equal(previous.qualifiedWorkerDatabase.phase,'production_worker_deploy');assert.deepEqual(previous.qualifiedWorkerDatabase.completedSmoke,record.qualifiedWorkerDatabase.completedSmoke);
  records[rel]={...record,status:'QUALIFIED_PRODUCTION_ACTIVATION_ONLY',qualifiedWorkerDatabase:{...record.qualifiedWorkerDatabase,workerPlacementReleaseBaseSha:READINESS_EXECUTION,releaseBaseSha,phase:'activate',completedWorker},productionAuthorization:{...record.productionAuthorization,phases:['activate'],smokeRunId:record.qualifiedWorkerDatabase.completedSmoke.actualSmokeRunId,smokeArtifactSha256:record.qualifiedWorkerDatabase.completedSmoke.refs.smoke.sha256,note:'Existing exact stage activation only after independently accepted actual DB, smoke and safe matching worker transition. Preserve exact rollback, alias/domain scope, single attempt and runtime controls. No migration, worker operation, rebuild, environment change or public-verification grant.'},supersededRecord:previous,supersededRecordSha256:hash(before)};
 }
 return records;
}
export const QUALIFIED_ACTIVATION_COMPLETION_REFS={
 acceptance:{path:EVIDENCE+'C-406341-ACTIVATION-ACCEPTANCE.json',sha256:'348e1e2da7a74a4e398323a50cefc569bd5e1dd96103ffdbb0932ff6b5dc05b5'},
 activation:{path:EVIDENCE+'ACTUAL-406341-activation.json',sha256:'5e5260a8a0f3e089a670624b12f477b57fa2f0d81cf317ded97c2594e66d2611'},
};
const ACTIVATION_EXECUTION='3f9c580e3cac3ce09e43a834edf54ae7c06333de';
export function readQualifiedActivationCompletion(root){
 const d=Object.fromEntries(Object.entries(QUALIFIED_ACTIVATION_COMPLETION_REFS).map(([k,r])=>{const b=fs.readFileSync(path.join(root,r.path));assert.equal(hash(b),r.sha256,'Actual activation completion '+k);return[k,JSON.parse(b)];})),c=d.acceptance,a=d.activation;
 assert.equal(c.schemaVersion,'qualified-production-actual-existing-stage-activation-independent-acceptance/v1');assert.equal(c.authority,'CODEX C');assert.equal(c.accepted,true);assert.equal(c.actualActivationAccepted,true);assert.equal(c.productionActivationComplete,true);assert.equal(c.runId,40634155561);assert.equal(c.executionSha,ACTIVATION_EXECUTION);assert.equal(c.toolsSha,'ba0f2b75693d67c877b11c5b1952d59c03c30d62');assert(Number.isFinite(Date.parse(c.at))&&Date.parse(c.at)<=Date.now());assert.equal(c.publicVerificationSourcePreparationAdmitted,true);assert.equal(c.publicVerificationPhaseExecutionAdmitted,false);assert.equal(c.repeatActivationAdmitted,false);assert.equal(c.priorSafeWorkerAcceptancePreservedSha256,QUALIFIED_WORKER_COMPLETION_REFS.acceptance.sha256);assert.equal(c.nativeCleanExitCodesObserved,false);
 assert.equal(c.artifact.serverDigestIndependentlyVerifiedByC,true);assert.equal(c.artifact.id,12793125557);assert.equal(c.artifact.zipSha256,'e8de75cbcc3647db84c4810e139c7bbf566e8730681932c318227407aec43a45');assert.equal(c.artifact.activationSha256,QUALIFIED_ACTIVATION_COMPLETION_REFS.activation.sha256);
 assert.equal(a.schemaVersion,'rcap-production-activation/v1');assert.equal(a.passed,true);assert.equal(a.failure,null);assert.equal(a.promotionAttempted,true);assert.equal(a.promotionCompleted,true);assert.equal(a.productionAliasChanged,true);assert.equal(a.automaticRollback.attempted,false);assert.equal(a.automaticRollback.completed,false);assert.equal(a.promotion.control,'promote');assert.equal(a.promotion.httpStatus,201);assert.equal(a.promotion.ok,true);assert.equal(a.promotion.targetDeploymentId,a.stagedDeploymentId);
 for(const key of ['deploymentTriggered','environmentVariableChanged','productionDatabaseMutated','applicationChanged','workerChanged','realParticipantRecordsCreated','realChargesCreated','originPersisted','secretsPersisted'])assert.equal(a[key],false);
 const expected={applicationSha:QUALIFIED_FORWARD_APP,workerSourceSha:'84a75b6e65dc69e6c371afac44f1284e0debf722',workerDigest:'sha256:c574d7ca3864dfcae9de3cb4fc77c8c324ace050310333093042f961e6f0b5f1',productionProjectRef:'wwtwtsmywnckfkdaqqeg',rollbackDeploymentId:'dpl_2SRcG3kEvG9UU1udDZ7GZR7naLc6',smokeRunId:40619590234};for(const [key,value] of Object.entries(expected)){assert.equal(a[key],value);assert.equal(c.acceptedIdentity[key],value);}assert.equal(a.stagedDeploymentId,'dpl_8w9xAAvEp45jn8J3PUQn4ibTnzKz');assert.equal(c.acceptedIdentity.liveDeploymentId,a.stagedDeploymentId);
 assert.equal(a.verdicts.length,11);assert(a.verdicts.every(v=>v.passed===true));assert.deepEqual(a.verdicts,c.acceptedActualCriteria.verdicts);assert.deepEqual(a.controlHashes,c.acceptedActualCriteria.controlHashes);assert.equal(a.controlHashes.smokeArtifactSha256,'9fd7702305a6cea54ed1bfaf88b5d4c6aab2c01846aa5628efa28b4f025397e9');assert.equal(a.controlHashes.environmentMetadataBeforeSha256,a.controlHashes.environmentMetadataAfterSha256);assert.equal(a.controlHashes.deploymentInventoryBeforeSha256,a.controlHashes.deploymentInventoryAfterSha256);assert.equal(a.runtimeProof.productionProjectMatch,true);assert.equal(a.runtimeProof.exactlyOneOrigin,true);assert.equal(a.runtimeProof.productionDomainCount,7);
 return{...QUALIFIED_ACTIVATION_COMPLETION_REFS,runId:c.runId,executionSha:c.executionSha,toolsSha:c.toolsSha,acceptedAt:c.at,artifactId:c.artifact.id,artifactSha256:c.artifact.zipSha256,liveDeploymentId:a.stagedDeploymentId,rollbackDeploymentId:a.rollbackDeploymentId};
}
export const QUALIFIED_PUBLIC_BROWSER_CORRECTION_REFS={
 acceptance:{path:EVIDENCE+'C-406355-PUBLIC-PARTIAL-ACCEPTANCE.json',sha256:'84997deeddc874270833931dbac483c886216b37fbeb4d184ee2b4876f97e1ef'},
 result:{path:EVIDENCE+'ACTUAL-406355-public.json',sha256:'a01eb63e78a24a678c0507439947871be9ecca9874cbac1229c0e59544dc8ced'},
};
const PUBLIC_EXECUTION='909b83fce17244b49e59341ca82f0c1cf9c5b097';
export function readQualifiedPublicBrowserCorrection(root){
 const d=Object.fromEntries(Object.entries(QUALIFIED_PUBLIC_BROWSER_CORRECTION_REFS).map(([k,r])=>{const b=fs.readFileSync(path.join(root,r.path));assert.equal(hash(b),r.sha256,'Actual public browser correction '+k);return[k,JSON.parse(b)];})),c=d.acceptance,r=d.result;
 assert.equal(c.schemaVersion,'qualified-production-public-actual-individual-criteria-independent-acceptance/v1');assert.equal(c.authority,'CODEX C');assert.equal(c.accepted,true);assert.equal(c.runId,40635569139);assert.equal(c.jobId,122641621413);assert.equal(c.executionSha,PUBLIC_EXECUTION);assert.equal(c.toolsSha,'aecdf1948215562589370a39a8cc4f6e6302b32e');assert(Number.isFinite(Date.parse(c.at))&&Date.parse(c.at)<=Date.now());assert.equal(c.failedPublicAttemptMustBeAccounted,true);assert.equal(c.browserCorrectionSourcePreparationAdmitted,true);assert.equal(c.unchangedPublicRedispatchAdmitted,false);assert.equal(c.newPublicRuntimeAdmitted,false);assert.equal(c.actualPublicVerificationAccepted,false);
 assert.equal(c.artifact.serverDigestIndependentlyVerifiedByC,true);assert.equal(c.artifact.actualReceipt.sha256,QUALIFIED_PUBLIC_BROWSER_CORRECTION_REFS.result.sha256);assert.equal(r.schemaVersion,'rcap-production-public-verify/v1');assert.equal(r.passed,false);assert.equal(r.screening,null);assert.match(r.failure,/locator\.click: Timeout/);assert.match(r.failure,/element is not visible/);assert.equal(r.verdicts.length,10);assert(r.verdicts.every(v=>v.passed===true));assert.deepEqual(r.verdicts,c.acceptedIndividualCriteria.nativeVerdicts);for(const value of Object.values(r.mutations))assert.equal(value,false);assert.equal(r.originPersisted,false);assert.equal(r.secretsPersisted,false);
 assert.equal(r.applicationSha,QUALIFIED_FORWARD_APP);assert.equal(r.workerSourceSha,'84a75b6e65dc69e6c371afac44f1284e0debf722');assert.equal(r.workerDigest,'sha256:c574d7ca3864dfcae9de3cb4fc77c8c324ace050310333093042f961e6f0b5f1');assert.equal(r.productionProjectRef,'wwtwtsmywnckfkdaqqeg');assert.equal(r.activatedDeploymentId,'dpl_8w9xAAvEp45jn8J3PUQn4ibTnzKz');assert.equal(r.rollbackDeploymentId,'dpl_2SRcG3kEvG9UU1udDZ7GZR7naLc6');
 return{disposition:QUALIFIED_PUBLIC_BROWSER_CORRECTION_REFS.acceptance,result:QUALIFIED_PUBLIC_BROWSER_CORRECTION_REFS.result,at:c.at,runId:c.runId,jobId:c.jobId,executionSha:c.executionSha,toolsSha:c.toolsSha,artifactId:c.artifact.id,artifactSha256:c.artifact.zipSha256,acceptedLiveVerdicts:10,remainingCriterion:'visible optional-help MS screening completion',stepNumber:8};
}
export const QUALIFIED_PUBLIC_PROGRAM_CORRECTION_REFS={
 acceptance:{path:EVIDENCE+'C-406364-PUBLIC-PROGRAM-PARTIAL-ACCEPTANCE.json',sha256:'876ddf287ad8b262a616e51e25f217264db550bc244365a080764c64d08dbb07'},
 result:{path:EVIDENCE+'ACTUAL-406364-public.json',sha256:'3f112403f79a6b1bd7810e399537a51c9909803ebeab44c7a07b1d14e517d9b2'},
};
const PUBLIC_PROGRAM_EXECUTION='7efb315ac5e3b90a84e2590a724a5aaa1813bc15';
export function readQualifiedPublicProgramCorrection(root){
 const previousAttempt=readQualifiedPublicBrowserCorrection(root),d=Object.fromEntries(Object.entries(QUALIFIED_PUBLIC_PROGRAM_CORRECTION_REFS).map(([k,r])=>{const b=fs.readFileSync(path.join(root,r.path));assert.equal(hash(b),r.sha256,'Actual public program correction '+k);return[k,JSON.parse(b)];})),c=d.acceptance,r=d.result;
 assert.equal(c.schemaVersion,'qualified-public-visible-help-actual-continuation-individual-criteria-independent-decision/v1');assert.equal(c.authority,'CODEX C');assert.equal(c.accepted,true);assert.equal(c.runId,40636454619);assert.equal(c.jobId,122644429358);assert.equal(c.executionSha,PUBLIC_PROGRAM_EXECUTION);assert.equal(c.toolsSha,'90420c42b66441452b418a84eee6df7df365712f');assert(Number.isFinite(Date.parse(c.at))&&Date.parse(c.at)<=Date.now());assert.equal(c.sourceCorrectionPreparationAdmitted,true);assert.equal(c.newPublicRuntimeAdmitted,false);assert.equal(c.actualPublicVerificationAccepted,false);assert.equal(c.unchangedRedispatchAdmitted,false);assert.equal(c.acceptedIndividualCriteria.priorTenLiveCriteriaPreservedSha256,previousAttempt.disposition.sha256);assert.equal(c.artifact.serverDigestIndependentlyVerifiedByC,true);assert.equal(c.artifact.actualReceipt.sha256,QUALIFIED_PUBLIC_PROGRAM_CORRECTION_REFS.result.sha256);
 assert.equal(r.schemaVersion,'rcap-production-public-verify/v1');assert.equal(r.passed,false);assert.deepEqual(r.priorPublicAttempt,previousAttempt);assert.equal(r.verdicts.length,13);assert.deepEqual(r.verdicts.slice(0,12),c.acceptedIndividualCriteria.actualFirstTwelvePassingVerdicts);assert(r.verdicts.slice(0,12).every(v=>v.passed===true));assert.equal(r.verdicts[12].caseId,'mississippi_screening_reaches_the_non_conviction_pathway');assert.equal(r.verdicts[12].passed,false);assert.equal(r.screening.reachedResult,false);assert.equal(r.screening.forbiddenPrompt,null);assert.equal(r.screening.unplanned.step,5);assert.match(r.screening.unplanned.headings[0],/^Which program is named in this case/);assert.equal(r.screening.steps[5].clicked,'Non-conviction expungement for dismissal, no disposition, or acquittal');assert.deepEqual(r.screening.externalRequestHosts,[]);for(const value of Object.values(r.mutations))assert.equal(value,false);assert.equal(r.originPersisted,false);assert.equal(r.secretsPersisted,false);
 return{disposition:QUALIFIED_PUBLIC_PROGRAM_CORRECTION_REFS.acceptance,result:QUALIFIED_PUBLIC_PROGRAM_CORRECTION_REFS.result,at:c.at,runId:c.runId,jobId:c.jobId,stepNumber:8,executionSha:c.executionSha,toolsSha:c.toolsSha,artifactId:c.artifact.id,artifactSha256:c.artifact.zipSha256,acceptedLiveVerdicts:12,remainingCriterion:'complete ordinary synthetic no-program-order MS screening',previousAttempt};
}
export function prepareQualifiedPublicVerificationRecords(root,{toolsSha,releaseBaseSha}){
 const correction=releaseBaseSha===PUBLIC_PROGRAM_EXECUTION?readQualifiedPublicProgramCorrection(root):releaseBaseSha===PUBLIC_EXECUTION?readQualifiedPublicBrowserCorrection(root):null;assert.equal(releaseBaseSha,correction?.previousAttempt?PUBLIC_PROGRAM_EXECUTION:correction?PUBLIC_EXECUTION:ACTIVATION_EXECUTION);assert.notEqual(toolsSha,releaseBaseSha);git(root,['merge-base','--is-ancestor',releaseBaseSha,toolsSha]);
 const completedActivation=readQualifiedActivationCompletion(root),records=prepareQualifiedActivationRecords(root,{toolsSha,releaseBaseSha:WORKER_EXECUTION});
 for(const rel of RECORDS){const record=records[rel],before=blob(root,releaseBaseSha,rel),previous=JSON.parse(before);assert.equal(previous.qualifiedWorkerDatabase.phase,correction?'public_verify':'activate');if(correction?.previousAttempt)assert.deepEqual(previous.qualifiedWorkerDatabase.priorPublicAttempt,correction.previousAttempt);assert.deepEqual(previous.qualifiedWorkerDatabase.completedWorker,record.qualifiedWorkerDatabase.completedWorker);assert.equal(previous.productionAuthorization.smokeRunId,record.productionAuthorization.smokeRunId);assert.equal(previous.productionAuthorization.smokeArtifactSha256,record.productionAuthorization.smokeArtifactSha256);
  records[rel]={...record,status:'QUALIFIED_PRODUCTION_PUBLIC_VERIFICATION_ONLY',qualifiedWorkerDatabase:{...record.qualifiedWorkerDatabase,activationReleaseBaseSha:WORKER_EXECUTION,releaseBaseSha,phase:'public_verify',completedActivation,...(correction?{publicVerificationReleaseBaseSha:ACTIVATION_EXECUTION,priorPublicAttempt:correction}:{})},productionAuthorization:{...record.productionAuthorization,phases:['public_verify'],note:'Existing read-only public verification only after actual independently accepted activation. Exact live8w9/App4c, worker84a/c574, WWT and retained rollback2SR. No activation replay, deployment, worker operation, environment/database/customer/payment mutation.'},supersededRecord:previous,supersededRecordSha256:hash(before)};
 }
 return records;
}
export function verifyQualifiedDatabaseBinding(root,candidate){
 try{
  assert.equal(candidate.qualifiedWorkerDatabase?.schemaVersion,'qualified-production-two-migration-binding/v1');
  const prepare=candidate.qualifiedWorkerDatabase.phase==='public_verify'?prepareQualifiedPublicVerificationRecords:candidate.qualifiedWorkerDatabase.phase==='activate'?prepareQualifiedActivationRecords:candidate.qualifiedWorkerDatabase.phase==='production_worker_deploy'?prepareQualifiedWorkerPlacementRecords:candidate.qualifiedWorkerDatabase.phase==='smoke'?prepareQualifiedSmokeRecords:prepareQualifiedDatabaseRecords;
  const expected=prepare(root,{toolsSha:candidate.toolsSha,releaseBaseSha:candidate.qualifiedWorkerDatabase.releaseBaseSha});
  for(const rel of RECORDS)assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root,rel))),expected[rel]);assert.deepEqual(candidate,expected[RECORDS[1]]);
  assert(applicationInputEquivalence(root,QUALIFIED_FORWARD_APP,'HEAD').equivalent,'Exact frozen application');
  const head=git(root,['rev-parse','HEAD']);git(root,['merge-base','--is-ancestor',candidate.toolsSha,head]);
  assert.equal(git(root,['diff','--name-only',candidate.toolsSha,head,'--','scripts','.github']),'','Frozen execution controls');
  assert(git(root,['diff','--name-only',candidate.toolsSha,head]).split('\n').filter(Boolean).every(p=>RECORDS.includes(p)),'Only the three generated records after frozen tools');
  assert.equal(git(root,['status','--porcelain']),'','Clean committed execution checkout');
  return {current:true,bindingVerified:true,status:'CURRENT',productionAuthorized:true,reasons:[]};
 }catch(error){return {current:false,bindingVerified:false,status:'INVALID_QUALIFIED_DATABASE_BINDING',reasons:[error.message]};}
}
export function requireQualifiedDatabasePhase(candidate,phase,root=process.cwd()){
 const result=verifyQualifiedDatabaseBinding(root,candidate);assert.equal(result.current,true,result.reasons.join('; '));
 assert.equal(phase,candidate.qualifiedWorkerDatabase.phase,'Only this exact qualified phase is admitted. Smoke requires actual database poststate/C acceptance and a new phase binding; all other phases remain held');
 return candidate.productionAuthorization;
}
