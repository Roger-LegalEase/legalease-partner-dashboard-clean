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
export function verifyQualifiedDatabaseBinding(root,candidate){
 try{
  assert.equal(candidate.qualifiedWorkerDatabase?.schemaVersion,'qualified-production-two-migration-binding/v1');
  const prepare=candidate.qualifiedWorkerDatabase.phase==='smoke'?prepareQualifiedSmokeRecords:prepareQualifiedDatabaseRecords;
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
