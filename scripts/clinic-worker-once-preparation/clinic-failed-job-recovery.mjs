export const RECOVERY_JOB='7c753a4a-3d71-47c4-a6b9-8f87509544c2';
// Existing failed Clinic job only; no enqueue, Verify, facts, funding or manual RPC ports.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {CLINIC} from '../rcap-hosted-existing-clinic-readonly.mjs';
import {validateWindow,assertSnapshot,rowsThatChanged,parseCycleResult,dockerOnceInvocation} from '../worker-once-preparation/ordinary-worker-once.mjs';
import {createWorkerSnapshotPort} from '../worker-once-preparation/ordinary-worker-binding.mjs';
import {createPaidDtcGhaWorkerPorts} from '../paid-dtc-worker-once-preparation/paid-dtc-gha-worker-ports.mjs';
import {clinicReceiptQuery,clinicDetailsQuery,validateClinicTarget,assertClinicPoststate,verifyClinicOwnerPrivateAccess} from './clinic-worker-binding.mjs';
import {RECOVERY_IMAGE} from './clinic-recovery-image.mjs';
import {waitSameJobEvents} from '../rcap-hosted-saved-dtc-ports.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
const FIXED=Object.freeze({jobId:RECOVERY_JOB,packetId:'a97a35a8-7a3f-40cd-8836-5430597183d7',personId:'56647f61-5f78-4f7c-a445-30116d40ffe1',matterId:'e6450851-89e2-4d77-9ff2-938ec0edaa39',partnerId:'bc1ed720-681e-4da5-9964-acb2affd5b12',inputHash:'63343443c017dc42e296d413912da087e7070231bdc3bd3ebeda9fc2e906ddb6',verificationHash:'7dcfb847305cda102db6acd02168cb52190e5ce31d340e686324311e428f9196',itemId:CLINIC.item,ownerId:CLINIC.owner,sessionId:'56f6cbfa-3dd2-44b1-95bf-84c800396519',entitlementId:'77000000-0000-4000-8000-000000000058',clinicEventId:CLINIC.event,partnerSlug:'mvl-demo',acquisitionMode:'clinic',applicationSha:CLINIC.app,packetNamespace:'expungement-ai-consumer',rendererKind:'packet_document_v1'});
export function validateRecoveryTarget(t){validateClinicTarget(t);for(const[k,v]of Object.entries(FIXED))assert.equal(t[k],v);}
export function bindRecoveryTemplates(target,window){
 validateRecoveryTarget(target);const sub={WINDOW_END_UTC:new Date(window.endsAt).toISOString(),ACTUAL_JOB_UUID:target.jobId,ACTUAL_PACKET_UUID:target.packetId,ACTUAL_ITEM_UUID:target.itemId,ACTUAL_OWNER_UUID:target.ownerId,ACTUAL_SESSION_UUID:target.sessionId,ACTUAL_PERSON_UUID:target.personId,ACTUAL_MATTER_UUID:target.matterId,ACTUAL_ENTITLEMENT_UUID:target.entitlementId,ACTUAL_VERIFICATION_SHA256:target.verificationHash,ACTUAL_INPUT_SHA256:target.inputHash};
 return Object.fromEntries([['../worker-once-preparation/GLOBAL-QUEUE-WINDOW-COMPLETENESS.TEMPLATE.NOT-EXECUTED.sql','787c50a5971f5c2ea7aa82612f966750235681799277b1a6f4b72ebe6fd24684'],['ACTUAL-CLINIC-RETRY-PRECLAIM.TEMPLATE.NOT-EXECUTED.sql','cd8b11c45e47f5f241d13c16a820fd0ca8db63d79931cb6b95f927ae05705f2c']].map(([name,pin])=>{const b=fs.readFileSync(new URL(name,import.meta.url));assert.equal(hash(b),pin);const sql=b.toString().replace(/__([A-Z0-9_]+)__/g,(_,k)=>{assert(Object.hasOwn(sub,k));return sub[k];});assert(!sql.includes('__'));return[name.split('/').at(-1),sql];}));
}
function assertExistingFailure(details){
 const j=details.job;for(const[k,v]of Object.entries({id:FIXED.jobId,packet_id:FIXED.packetId,input_hash:FIXED.inputHash,sponsored_verification_hash:FIXED.verificationHash,status:'failed',attempt_count:1,max_attempts:5,error_code:'render_failed',failure_disposition:'retryable',output_sha256:null,output_storage_path:null}))assert.equal(j?.[k],v);
 assert.equal(details.provenance,null);assert.equal(details.consumed,0);
}
export async function executeClinicFailedJobRecovery({target,window,env,runId,ports,checkpoint}){
 validateRecoveryTarget(target);validateWindow(window,Date.now());
 const result={schemaVersion:'clinic-existing-failed-job-recovery-safe/v1',workerSourceSha:RECOVERY_IMAGE.source,image:RECOVERY_IMAGE.image,targetJobSha256:hash(RECOVERY_JOB),attempted:false,protectedDeliveryProven:false};let stage='prestate';
 try{
  await ports.assertContinuousWindow({stage,target,window});const image=await ports.verifyPreparedImage();assert.equal(image.digest,RECOVERY_IMAGE.digest);assert.equal(image.sourceSha,RECOVERY_IMAGE.source);assert.equal(image.nonRoot,true);assert.equal(image.ephemeralGithubExecutor,true);
  const sql=bindRecoveryTemplates(target,window),before=await ports.readSnapshot({stage,target,window,sql});
  const baseline=assertSnapshot(before,target,0,RECOVERY_IMAGE);assert.equal(before.claimState.size,29);assert.equal(before.target.exactTargetJobCount,1);assert.equal(before.target.exactAllBindingsJoinCount,1);
  for(const k of ['globalEligibleAllKinds','acceptedRendererEligible','targetRankAllKinds','targetRankAcceptedRenderer'])assert.equal(before.target[k],1);
  const invocation=dockerOnceInvocation(env,runId,RECOVERY_IMAGE);validateWindow(window,Date.now());await ports.assertContinuousWindow({stage:'immediately_before_once',target,window});
  // The synchronous durable marker precedes the one operation; any uncertainty consumes this admission.
  checkpoint({...result,phase:'before_existing_failed_job_once',attempted:true});result.attempted=true;stage='once';let run;
  try{run=await ports.invokeOnce(invocation);}catch{run={status:null,error:true};}
  stage='poststate';const after=await ports.readSnapshot({stage,target,window,sql});await ports.assertContinuousWindow({stage,target,window});assert(Date.now()<Date.parse(window.endsAt));
  assert.equal(assertSnapshot(after,target,0),baseline);assert.equal(after.claimState.size,29);assert.deepEqual(rowsThatChanged(before.claimState,after.claimState),[RECOVERY_JOB]);
  const old=before.claimState.get(RECOVERY_JOB),now=after.claimState.get(RECOVERY_JOB);assert.equal(now.attempt_count,2);assert.notEqual(now.fencingTokenSha256,old.fencingTokenSha256);
  const cycle=parseCycleResult(run.stdout);assert.equal(run.status,0);assert.equal(run.signal??null,null);assert.equal(run.error??null,null);assert.equal(cycle?.outcome,'finalized');assert.equal(cycle.jobId,RECOVERY_JOB);
  for(const k of ['finalizedTargetOnly','privateArtifactProvenanceVerified','expectedAccountingAndEligibilityVerified','unrelatedHistoryUnchanged'])assert.equal(after[k],true);assert.equal(after.surpriseIngressCount,0);
  result.phase='EXISTING_JOB_FINALIZED_POSTSTATE_VERIFIED';result.attemptCount=2;result.workerStdoutSha256=hash(String(run.stdout??''));
 }catch{result.phase=result.attempted?'STOP_RECONCILE_NO_RETRY':'HOLD_NO_WORKER';result.failureStage=stage;}
 checkpoint(result);return result;
}
export function createClinicFailedJobRecoveryBinding({env,runId,assertContinuousWindow,assertSourceTarget,queryRows,checkpoint,publicObjectGet,runCommand}){
 let target,artifactMetadata,completed=false;const gha=createPaidDtcGhaWorkerPorts({env,runId,assertContinuousWindow,identity:RECOVERY_IMAGE,...(runCommand?{runCommand}:{})});
 const assertServiceRoleTargetIdentity=async()=>{dockerOnceInvocation(env,runId,RECOVERY_IMAGE);};
 const detailsQuery=t=>clinicDetailsQuery(t);
 const observeDetails=(stage,details,state)=>{
  checkpoint({schemaVersion:'clinic-recovery-observed-poststate-safe/v1',stage,targetJobSha256:hash(RECOVERY_JOB),status:details.job?.status,attemptCount:details.job?.attempt_count,errorCode:details.job?.error_code??null,provenancePresent:!!details.provenance,consumed:details.consumed,claimRows:state.claimState.size,claimStateSha256:hash(JSON.stringify([...state.claimState])),aggregate:state.aggregate});
  if(stage==='prestate')assertExistingFailure(details);
 };
 return{
  async recoverExistingFailedJob(window){
   assert.equal(completed,false);assert.equal(target,undefined);const source=await assertSourceTarget();assert.equal(source.applicationSha,CLINIC.app);assert.equal(source.clinicPurposeVerified,true);assert.equal(source.runtimeSourceIdentityVerified,true);
   await assertContinuousWindow({phase:'during_fulfillment'});const rows=await queryRows(clinicReceiptQuery());assert.equal(rows.length,1);const n=rows[0].clinic_actual_worker_receipt;assert.equal(n?.readOnly,'on');assert(Number.isFinite(Date.parse(n.observedAt))&&Date.now()-Date.parse(n.observedAt)<120000);const receipt=n.receipt;
   assert.equal(receipt.jobs?.length,1);assert.equal(receipt.jobs[0].id,RECOVERY_JOB);assert.equal(receipt.verification?.revision,1);assert.equal(receipt.verification?.status,'verified');assert.equal(receipt.verification?.verification_hash,FIXED.verificationHash);
   const funding=receipt.funding;assert(funding&&!Array.isArray(funding));for(const[k,v]of Object.entries({acquisition_mode:'clinic',funding_mode:'sponsored',packet_entitlement_id:FIXED.entitlementId,initial_verification_hash:FIXED.verificationHash}))assert.equal(funding[k],v);
   target=Object.freeze({...FIXED,protectedReceiptSha256:hash(JSON.stringify(receipt))});validateRecoveryTarget(target);
   const readSnapshot=createWorkerSnapshotPort({queryRows,assertServiceRoleTargetIdentity,checkpoint,validateTarget:validateRecoveryTarget,bindReadOnlyTemplates:bindRecoveryTemplates,targetJoinFile:'ACTUAL-CLINIC-RETRY-PRECLAIM.TEMPLATE.NOT-EXECUTED.sql',targetJoinKey:'actual_clinic_target_preclaim_binding',detailsQuery,observeDetails,assertPoststate:(t,d)=>{const checked=assertClinicPoststate(t,d,RECOVERY_IMAGE);assert.equal(d.job.attempt_count,2);artifactMetadata={sha256:d.job.output_sha256,byteCount:d.job.output_byte_count,storagePath:d.job.output_storage_path};return checked;},receiptSchema:'clinic-recovery-worker-snapshot-safe/v1'});
   const result=await executeClinicFailedJobRecovery({target,window,env,runId,checkpoint,ports:{...gha,assertContinuousWindow,readSnapshot}});completed=result.phase==='EXISTING_JOB_FINALIZED_POSTSTATE_VERIFIED';return result;
  },
  async retrieveRecoveredPrivateArtifact(downloadPorts){
   assert(completed&&target&&artifactMetadata);const readDeliveryEvents=async jobId=>{assert.equal(jobId,RECOVERY_JOB);return queryRows(`BEGIN READ ONLY; SET LOCAL statement_timeout='15s'; SELECT e.id,e.render_job_id,e.event_type,e.actor_user_id,e.created_at FROM public.packet_delivery_events e JOIN public.packet_render_jobs j ON j.id=e.render_job_id WHERE j.id='${RECOVERY_JOB}'::uuid AND j.sponsored_consumer_briefcase_item_id='${CLINIC.item}'::uuid AND j.sponsored_consumer_auth_user_id='${CLINIC.owner}'::uuid AND j.sponsored_clinic_event_id='${CLINIC.event}'::uuid ORDER BY e.created_at,e.id; COMMIT;`);};
   return verifyClinicOwnerPrivateAccess({target,artifactMetadata,assertContinuousWindow,checkpoint,...downloadPorts,publicObjectGet,readDeliveryEvents,waitDeliveryEvents:args=>waitSameJobEvents({...args,readEvents:readDeliveryEvents,sleep:ms=>new Promise(r=>setTimeout(r,ms))})});
  },
  getRecoveryTarget(){assert(completed&&target);return target;}
 };
}
