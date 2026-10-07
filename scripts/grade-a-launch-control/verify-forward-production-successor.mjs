import {historicalCheckTime} from './verify-historical-release.mjs';
import {assertVercelProductionScopes} from './vercel-production-scopes.mjs';
import {assertFrozenForwardExecution} from './forward-production-execution.mjs';
// Future explicit owner authorization is a distinct successor. This module
// creates no authorization and never changes the currently held generation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {assertForwardHosted,assertCommittedPredecessor,PENDING,CANDIDATE,TOOLS} from './verify-pinned-worker-successor.mjs';
import {applicationInputEquivalence,applicationInputManifest} from '../rcap-application-inputs.mjs';
import {createWorkerInputPlan} from '../rcap-hosted-acceptance-worker-input-plan.mjs';
export const AUTHORIZED_FORWARD='pinned-source-forward-authorized';
export const FORWARD_PHASES=['smoke','activate','production_worker_deploy','public_verify'];
const PROJECT='wwtwtsmywnckfkdaqqeg';
const keys=['applicationSha','workerSourceSha','workerDigest','workerInputFingerprint','toolsSha'];
const hash=b=>createHash('sha256').update(b).digest('hex');
const git=(root,args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:'pipe',maxBuffer:64*1024*1024}).trim();
const read=(root,p)=>JSON.parse(fs.readFileSync(path.join(root,p)));
const timestamp=s=>assert(typeof s==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(s)&&new Date(s).toISOString()===s&&Date.parse(s)<=Date.now(),'actual owner timestamp');
export function forwardOwnerNote(held){return `I authorize only smoke, activate, production_worker_deploy and public_verify for application ${held.applicationSha}, worker ${held.workerSourceSha}, digest ${held.workerDigest}, fingerprint ${held.workerInputFingerprint}, tooling ${held.toolsSha}, staged deployment ${held.hostedAdmission.deploymentId}, rollback ${held.hostedAdmission.productionRollback}, and ${held.hostedAdmission.schemaVersion==='rcap-readonly-successor-admission/v2'?'the separate exact deployment-alias and Production project-domain scopes':'the exact alias scope'} in hosted run ${held.hostedAdmission.runId}. Require fresh native smoke before activation, successful consumed activation before worker deployment and public verification, and fail closed on any mismatch. Worker placement may update only the existing nonsecret RCAP_WORKER_CONTAINER_DIGEST release identity to the accepted digest. No migration, key, secret, unrelated environment, auth, payment, participant, packet or extra deployment authority is granted.`;}
export function assertForwardOwner(owner,held){
 assert.equal(held.productionAuthorized,false);assert.equal(held.productionAuthorization,null);
 const split=held.hostedAdmission.schemaVersion==='rcap-readonly-successor-admission/v2';
 if(split){assertVercelProductionScopes(held.hostedAdmission.productionDeploymentAliases,held.hostedAdmission.productionProjectDomains,owner);assert.equal(owner.refusedAttempt?.runId,37476296905,'exact refused prior attempt');assert(Date.parse(owner.recordedAt)>=Date.parse(owner.refusedAttempt.finishedAt),'fresh owner follows refused attempt');}
 const expected={schemaVersion:split?'rcap-forward-owner-authorization/v2':'rcap-forward-owner-authorization/v1',authorized:true,recordedBy:'Roger Roman',recordedAt:owner?.recordedAt,productionProjectRef:PROJECT,...Object.fromEntries(keys.map(k=>[k,held[k]])),stagedDeploymentId:held.hostedAdmission.deploymentId,rollbackDeploymentId:held.hostedAdmission.productionRollback,...(split?{productionDeploymentAliases:held.hostedAdmission.productionDeploymentAliases,productionProjectDomains:held.hostedAdmission.productionProjectDomains,refusedAttempt:owner.refusedAttempt,reason:replacementOwnerReason()}:{productionAliases:held.hostedAdmission.productionAliases}),hostedRunId:held.hostedAdmission.runId,phases:FORWARD_PHASES,maxActivationAttempts:1,maxPublicVerificationAttempts:1,note:forwardOwnerNote(held)};
 assert.deepEqual(owner,expected,'separate exact owner decision; no inherited permissions');timestamp(owner.recordedAt);assert(Date.parse(owner.recordedAt)>=Date.parse(held.hostedAdmission.capturedAt),'owner decision follows held admission');return owner;
}
export function replacementOwnerReason(){return 'Previous attempt 37476296905 refused before promotion; no alias, domain, application or worker mutation occurred. This fresh one-attempt authorization differs only by separately modeled Vercel deployment-alias and Production project-domain scopes and the resulting tooling/execution identities; all product and worker identities remain unchanged.';}
export function forwardAuthorization(owner,receipts={},states={activation:'authorized_not_executed',publicVerification:'authorized_not_executed'}){
 return {...owner,...(receipts.smoke?{smokeRunId:receipts.smoke.runId,smokeArtifactSha256:receipts.smoke.receiptSha256}:{}),activation:{state:states.activation,maxAttempts:1,...(receipts.activate?{activationReceipt:receipts.activate}: {})},publicVerification:{state:states.publicVerification,maxAttempts:1,...(receipts.public_verify?{receipt:receipts.public_verify}:{})}};
}
export function assertForwardPhase(candidate,held,phase){
 const f=candidate.forwardProduction;assert(f,'distinct authorized successor required');assertForwardOwner(f.owner,held);
 assert.equal(candidate.productionAuthorized,true);assert.equal(candidate.productionProjectRef,PROJECT);
 assert.deepEqual(candidate.productionAuthorization,forwardAuthorization(f.owner,f.receipts,f.states),'derived exact phase authority');
 assert(FORWARD_PHASES.includes(phase),'phase not authorized for forward generation');
 for(const [name,state]of Object.entries(f.states)){assert(['activation','publicVerification'].includes(name));assert(['authorized_not_executed','consumed_successfully'].includes(state));}
 assert.deepEqual(Object.keys(f.states).sort(),['activation','publicVerification']);
 assert.equal(f.states.activation==='consumed_successfully',Boolean(f.receipts.activate),'activation consumed only by actual receipt');
 assert.equal(f.states.publicVerification==='consumed_successfully',Boolean(f.receipts.public_verify),'verification consumed only by actual receipt');
 if(phase!=='smoke')assert(f.receipts.smoke,'fresh native successful smoke required');
 if(phase==='smoke'||phase==='activate')assert.equal(f.states.activation,'authorized_not_executed','activation authorization consumed');
 if(phase==='production_worker_deploy'||phase==='public_verify')assert.equal(f.states.activation,'consumed_successfully','activation must precede worker/public verification');
 if(phase==='public_verify')assert.equal(f.states.publicVerification,'authorized_not_executed','public verification authorization consumed');
 return candidate.productionAuthorization;
}
function native(root,ref){assert(ref?.path?.startsWith('hosted-acceptance-evidence/forward-production/')&&!ref.path.split('/').includes('..'));const b=fs.readFileSync(path.join(root,ref.path));assert.equal(b.length,ref.bytes);assert.equal(hash(b),ref.sha256);return b;}
export function validateForwardNativeDocuments({run,jobs,artifact,receipt,receiptBytes,archiveDigest},ref,owner,phase,history,root){
 const steps={smoke:['Verify the exact frozen identity and image-input equivalence','Run the bounded no-alias Production canary smoke','Upload the immutable Production preflight evidence'],activate:['Verify the exact frozen identity and image-input equivalence','Download the exact successful Production smoke evidence','Activate the exact staged Production deployment with rollback protection','Upload the immutable Production preflight evidence'],public_verify:['Require current release and separate public-verification authorization','Verify the activated release on the public domain','Upload the public verification evidence']}[phase];assert(steps);
 assert.equal(run.id,ref.runId);assert.equal(run.head_sha,ref.workflowSourceSha);assert.equal(run.path,'.github/workflows/rcap-f1-ephemeral-staging.yml');assert.equal(run.event,'workflow_dispatch');assert.equal(run.head_branch,'captain-release');assert.equal(run.run_attempt,1);assert.equal(run.conclusion,'success');assert.equal(run.status,'completed');assert.equal(run.repository.full_name.toLowerCase(),'roger-legalease/legalease-partner-dashboard-clean');
 const job=jobs.jobs.find(j=>j.id===ref.jobId);assert(job);assert.equal(job.run_id,run.id);assert.equal(job.head_sha,run.head_sha);assert.equal(job.run_attempt,1);assert.equal(job.conclusion,'success');assert.equal(job.status,'completed');for(const step of steps)assert.equal(job.steps.find(s=>s.name===step)?.conclusion,'success');assert(job.steps.every(s=>['success','skipped'].includes(s.conclusion)));
 assert.equal(artifact.id,ref.artifactId);assert.equal(artifact.expired,false);assert.equal(artifact.workflow_run.id,run.id);assert.equal(artifact.workflow_run.head_sha,run.head_sha);assert.equal(artifact.digest,archiveDigest);assert.equal(hash(receiptBytes),ref.receiptSha256);
 assert.equal(receipt.schemaVersion,{smoke:'rcap-production-canary-smoke/v1',activate:'rcap-production-activation/v1',public_verify:'rcap-production-public-verify/v1'}[phase]);
 for(const k of ['applicationSha','workerSourceSha','workerDigest','productionProjectRef','rollbackDeploymentId'])assert.equal(receipt[k],owner[k],`native ${phase} ${k}`);
 assert.equal(receipt[phase==='public_verify'?'activatedDeploymentId':'stagedDeploymentId'],owner.stagedDeploymentId);
 if(phase==='public_verify'){assert.equal(receipt.originPersisted,false);assert.equal(receipt.secretsPersisted,false);for(const value of Object.values(receipt.mutations??{}))assert.equal(value,false);assert.deepEqual(Object.keys(receipt.mutations??{}).sort(),['deploymentTriggered','productionAliasChanged','environmentVariableChanged','productionDatabaseMutated','accountCreated','checkoutOpened','realChargesCreated'].sort());}
 assert.equal(receipt.passed,true);const time=Date.parse(receipt.finishedAt);assert(Number.isFinite(time)&&time>=Date.parse(owner.recordedAt)&&time<=historicalCheckTime(history,root)+300000&&historicalCheckTime(history,root)-time<=86400000,'fresh post-authorization native receipt');
 if(phase==='smoke'){assert.equal(receipt.transactionalFixtureRolledBack,true);assert.equal(receipt.productionDatabasePersistentlyMutated,false);assert.equal(receipt.realParticipantRecordsCreated,false);assert.equal(receipt.realChargesCreated,false);assert.equal(receipt.workerRun,false);assert.equal(receipt.aliasChanged,false);assert.equal(receipt.deploymentTriggered,false);}
 if(phase==='activate'){assert.equal(receipt.promotionCompleted,true);assert.equal(receipt.automaticRollback?.attempted,false);assert.equal(receipt.realParticipantRecordsCreated,false);assert.equal(receipt.realChargesCreated,false);}
 return receipt;
}
function verifyNative(root,ref,owner,phase,history){
 const files=ref.files;assert(Array.isArray(files));for(const f of files)native(root,f);
 const bytes=p=>{const f=files.find(f=>f.path===p);assert(f,'all native inputs hashed');return native(root,f);};
 const archive=bytes(ref.archivePath),receiptBytes=bytes(ref.receiptPath);const filename={smoke:'production-canary-smoke.json',activate:'production-activation.json',public_verify:'production-public-verify.json'}[phase];assert(filename);assert.equal(ref.archiveEntry,filename);
 const archived=execFileSync('unzip',['-p',path.join(root,ref.archivePath),filename]);assert(archived.equals(receiptBytes),'native ZIP receipt byte identity');
 const receipt=validateForwardNativeDocuments({run:JSON.parse(bytes(ref.runPath)),jobs:JSON.parse(bytes(ref.jobsPath)),artifact:JSON.parse(bytes(ref.artifactPath)),receipt:JSON.parse(receiptBytes),receiptBytes,archiveDigest:'sha256:'+hash(archive)},ref,owner,phase,history,root);
 git(root,['merge-base','--is-ancestor',owner.toolsSha,ref.workflowSourceSha]);assert.equal(git(root,['diff','--name-only',owner.toolsSha,ref.workflowSourceSha,'--','scripts','.github']),'','native production workflow uses frozen controls');return receipt;
}
export function verifyForwardProductionSuccessor(root,candidate,history){
 try{
 const p=read(root,PENDING),tools=read(root,TOOLS),f=candidate.forwardProduction;assert.deepEqual(Object.keys(f??{}).sort(),['heldPredecessorSha','heldRecordHashes','owner','ownerPath','ownerSha256','receipts','states'].sort());assert.equal(p.applicationSource,AUTHORIZED_FORWARD);assert.match(f?.heldPredecessorSha??'',/^[a-f0-9]{40}$/);git(root,['merge-base','--is-ancestor',f.heldPredecessorSha,'HEAD']);assertCommittedPredecessor(root,f.heldPredecessorSha);
 const held={};for(const rel of [PENDING,CANDIDATE,TOOLS]){const b=execFileSync('git',['show',`${f.heldPredecessorSha}:${rel}`],{cwd:root});held[rel]=JSON.parse(b);assert.equal(f.heldRecordHashes[rel],hash(b));assert.equal(held[rel].productionAuthorized,false);assert.equal(held[rel].productionAuthorization,null);assert(held[rel].hostedAdmission);}
 assert.equal(held[PENDING].applicationSource,'pinned-source-forward');const prior=held[CANDIDATE];assertForwardHosted(prior.hostedAdmission,prior,history,root);assertForwardOwner(f.owner,prior);const authorizationBytes=fs.readFileSync(path.join(root,f.ownerPath));assert(f.ownerPath.startsWith('data/rcap-grade-a/launch-control/forward-owner/')&&!f.ownerPath.split('/').includes('..'));assert.equal(hash(authorizationBytes),f.ownerSha256);assert.deepEqual(JSON.parse(authorizationBytes),f.owner);
 for(const [rel,record]of [[PENDING,p],[CANDIDATE,candidate],[TOOLS,tools]])assert.deepEqual(record,{...held[rel],status:'FORWARD_EXPLICIT_PRODUCTION_AUTHORIZED',...(rel===PENDING?{applicationSource:AUTHORIZED_FORWARD}:{}),productionProjectRef:PROJECT,productionAuthorized:true,productionAuthorization:forwardAuthorization(f.owner,f.receipts,f.states),forwardProduction:f},'only explicit future authorization/evidence additions');
 assert(applicationInputEquivalence(root,prior.applicationSha,'HEAD').equivalent);const runtime=new Set(applicationInputManifest(root,prior.applicationSha).files.map(f=>f.path));assert(git(root,['diff','--name-only',prior.applicationSha]).split('\n').every(p=>!runtime.has(p)));
 const plan=createWorkerInputPlan({rootDir:root,candidateSha:git(root,['rev-parse','HEAD']),acceptedSourceSha:prior.workerSourceSha,acceptedDigest:prior.workerDigest});assert.equal(plan.rebuildRequired,false);assert.deepEqual(plan.missingCanonicalInputs,[]);assert.equal(plan.aggregateInputSha256,prior.workerInputFingerprint);
 assert.equal(git(root,['diff','--name-only',f.heldPredecessorSha,'--','scripts','.github']),'','authorized execution cannot change frozen controls');
 if(f.owner.schemaVersion==='rcap-forward-owner-authorization/v2')verifyRefusedForwardAttempt(root,f.owner.refusedAttempt,f.owner);
 const nativeReceipts={};for(const [phase,ref]of Object.entries(f.receipts))nativeReceipts[phase]=verifyNative(root,ref,f.owner,phase,history);
 if(nativeReceipts.activate){assert(nativeReceipts.smoke);assert(Date.parse(nativeReceipts.activate.finishedAt)>=Date.parse(nativeReceipts.smoke.finishedAt));assert.equal(nativeReceipts.activate.smokeRunId,f.receipts.smoke.runId);}
 if(nativeReceipts.public_verify){assert(nativeReceipts.activate);assert(Date.parse(nativeReceipts.public_verify.finishedAt)>=Date.parse(nativeReceipts.activate.finishedAt));}
 assertForwardPhase(candidate,prior,nativeReceipts.activate?'production_worker_deploy':nativeReceipts.smoke?'activate':'smoke');
 assertFrozenForwardExecution(root,candidate,{toolsSha:f.owner.toolsSha,executionSha:git(root,['rev-parse','HEAD'])});
 const allowed=new Set([PENDING,CANDIDATE,TOOLS,f.ownerPath,...(f.owner.refusedAttempt?.files??[]).map(r=>r.path),...Object.values(f.receipts).flatMap(r=>r.files.map(f=>f.path))]);assert(git(root,['diff','--name-only',f.heldPredecessorSha]).split('\n').filter(Boolean).every(p=>allowed.has(p)),'bounded future authorization closure');assert(git(root,['ls-files','--others','--exclude-standard','--','scripts','.github','src','data','hosted-acceptance-evidence']).split('\n').filter(Boolean).every(p=>allowed.has(p)));
 return {current:true,status:'CURRENT',bindingVerified:true,productionAuthorized:true,...Object.fromEntries(keys.map(k=>[k,prior[k]])),reasons:[]};
 }catch(error){return {current:false,status:'INVALID_FORWARD_PRODUCTION_BINDING',reasons:[error.message]};}
}
export function requireForwardProductionPhase(candidate,phase,root=process.cwd()){
 const result=verifyForwardProductionSuccessor(root,candidate);assert.equal(result.current,true,result.reasons.join('; '));const held=JSON.parse(git(root,['show',`${candidate.forwardProduction.heldPredecessorSha}:${CANDIDATE}`]));return assertForwardPhase(candidate,held,phase);
}
// Pure preparation only. The caller must first possess the separately recorded
// exact owner decision; this never writes that decision or release records.
export function prepareExplicitForwardProductionRecords(root,{heldPredecessorSha,ownerPath,receipts={},states={activation:'authorized_not_executed',publicVerification:'authorized_not_executed'}}){
 assert.match(heldPredecessorSha,/^[a-f0-9]{40}$/);assert(ownerPath.startsWith('data/rcap-grade-a/launch-control/forward-owner/')&&!ownerPath.split('/').includes('..'));
 const held={},heldRecordHashes={};for(const rel of [PENDING,CANDIDATE,TOOLS]){const b=execFileSync('git',['show',`${heldPredecessorSha}:${rel}`],{cwd:root});held[rel]=JSON.parse(b);heldRecordHashes[rel]=hash(b);}
 const bytes=fs.readFileSync(path.join(root,ownerPath)),owner=JSON.parse(bytes);assertForwardOwner(owner,held[CANDIDATE]);
 const forwardProduction={heldPredecessorSha,heldRecordHashes,ownerPath,ownerSha256:hash(bytes),owner,receipts,states};
 return Object.fromEntries([PENDING,CANDIDATE,TOOLS].map(rel=>[rel,{...held[rel],status:'FORWARD_EXPLICIT_PRODUCTION_AUTHORIZED',...(rel===PENDING?{applicationSource:AUTHORIZED_FORWARD}:{}),productionProjectRef:PROJECT,productionAuthorized:true,productionAuthorization:forwardAuthorization(owner,receipts,states),forwardProduction}]));
}
// Historical v1 authority retains its original guard; v2 uses separate scopes.
export function assertForwardAliasScope(actual,authorized,domains){assert.deepEqual(actual,authorized,'exact forward alias scope');assert(domains.every(name=>authorized.some(a=>a.alias===name)),'no unapproved Production domain');}
export function verifyRefusedForwardAttempt(root,ref,owner){
 assert.equal(ref?.runId,37476296905);for(const file of ref.files)native(root,file);
 const bytes=p=>{const f=ref.files.find(f=>f.path===p);assert(f,'hashed refused evidence');return native(root,f);};
 const run=JSON.parse(bytes(ref.runPath)),jobs=JSON.parse(bytes(ref.jobsPath)),artifact=JSON.parse(bytes(ref.artifactPath));const receiptBytes=bytes(ref.receiptPath),receipt=JSON.parse(receiptBytes);
 assert.equal(hash(receiptBytes),ref.receiptSha256);assert.equal('sha256:'+hash(bytes(ref.archivePath)),artifact.digest);assert(execFileSync('unzip',['-p',path.join(root,ref.archivePath),'production-activation.json']).equals(receiptBytes));
 return assertRefusedAttemptDocuments({run,jobs,artifact,receipt},ref,owner);
}
export function assertRefusedAttemptDocuments({run,jobs,artifact,receipt},ref,owner){
 assert.equal(run.id,37476296905);assert.equal(run.head_sha,ref.workflowSourceSha);assert.equal(run.head_sha,'c74c05438a5e8ffda496c680c23337cc6748c144');assert.equal(run.status,'completed');assert.equal(run.conclusion,'failure');assert.equal(run.run_attempt,1);assert.equal(run.event,'workflow_dispatch');assert.equal(run.head_branch,'captain-release');assert.equal(run.path,'.github/workflows/rcap-f1-ephemeral-staging.yml');assert.equal(run.repository.full_name.toLowerCase(),'roger-legalease/legalease-partner-dashboard-clean');
 assert.equal(ref.jobId,112312471148);assert.equal(ref.artifactId,11419248711);const job=jobs.jobs.find(j=>j.id===ref.jobId);assert(job);assert.equal(job.status,'completed');assert.equal(job.run_attempt,1);assert.equal(job.run_id,run.id);assert.equal(job.head_sha,run.head_sha);assert.equal(job.conclusion,'failure');assert.equal(job.steps.find(s=>s.name==='Activate the exact staged Production deployment with rollback protection')?.conclusion,'failure');
 assert.equal(artifact.id,ref.artifactId);assert.equal(artifact.expired,false);assert.equal(artifact.digest,'sha256:ff17edf28d9bae0102998d9c73494ec6f8aed4251138a0f2a2a0955dd72b38d4');assert.equal(artifact.workflow_run.id,run.id);assert.equal(artifact.workflow_run.head_sha,run.head_sha);assert.equal(receipt.schemaVersion,'rcap-production-activation/v1');assert.equal(receipt.passed,false);assert.equal(receipt.failure,'no unapproved Production domain');
 for(const k of ['promotionAttempted','promotionCompleted','productionAliasChanged','deploymentTriggered','environmentVariableChanged','productionDatabaseMutated','workerChanged'])assert.equal(receipt[k],false,'prior refusal had no mutation');assert.equal(receipt.automaticRollback.attempted,false);assert.equal(receipt.applicationChanged,false);
 for(const k of ['applicationSha','workerSourceSha','workerDigest','stagedDeploymentId','rollbackDeploymentId','productionProjectRef'])assert.equal(receipt[k],owner[k],'unchanged refused product tuple');assert.equal(receipt.finishedAt,ref.finishedAt);assert(Date.parse(owner.recordedAt)>=Date.parse(receipt.finishedAt));return receipt;
}
