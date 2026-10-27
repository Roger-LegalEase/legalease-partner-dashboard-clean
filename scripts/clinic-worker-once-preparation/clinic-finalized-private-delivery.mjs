// Existing finalized Clinic packet only. This factory exposes no worker, funding, Verify or enqueue operation.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {CLINIC} from '../rcap-hosted-existing-clinic-readonly.mjs';
import {CLINIC_RECOVERY_FIXED_TARGET,validateRecoveryTarget,RECOVERY_JOB} from './clinic-failed-job-recovery.mjs';
import {RECOVERY_IMAGE} from './clinic-recovery-image.mjs';
import {clinicReceiptQuery,clinicDetailsQuery,assertClinicPoststate,verifyClinicOwnerPrivateAccess} from './clinic-worker-binding.mjs';
import {waitSameJobEvents} from '../rcap-hosted-saved-dtc-ports.mjs';
const hash=b=>createHash('sha256').update(b).digest('hex');
export function admitFinalizedClinicDetails(target,details){
 validateRecoveryTarget(target);assertClinicPoststate(target,details,RECOVERY_IMAGE);
 assert.equal(details.job.attempt_count,3);assert.equal(details.job.claim_expires_at,null);assert.equal(details.job.fencing_token,null);
 assert.equal(details.job.output_sha256,'19cee80c62c5343d73bed77e2396319e439e989a24f9e3b20482921d66d90900');
 assert.equal(details.job.output_byte_count,69285);assert.equal(details.job.page_count,16);
 return {sha256:details.job.output_sha256,byteCount:details.job.output_byte_count,storagePath:details.job.output_storage_path};
}
export function createFinalizedClinicDeliveryBinding({assertContinuousWindow,assertSourceTarget,queryRows,checkpoint,publicObjectGet}){
 let target,artifactMetadata,ready=false;
 return{
  async reconcileExistingFinalizedPacket(window){
   assert.equal(window.recoveryOperation,'finalized_attempt3_private_only');assert.equal(ready,false);
   const source=await assertSourceTarget();assert.equal(source.applicationSha,CLINIC.app);assert.equal(source.clinicPurposeVerified,true);assert.equal(source.runtimeSourceIdentityVerified,true);
   await assertContinuousWindow({phase:'during_fulfillment'});
   const rows=await queryRows(clinicReceiptQuery());assert.equal(rows.length,1);const n=rows[0].clinic_actual_worker_receipt;
   assert.equal(n.readOnly,'on');assert(Date.now()-Date.parse(n.observedAt)<120000);const receipt=n.receipt;
   assert.equal(receipt.jobs.length,1);assert.equal(receipt.jobs[0].id,RECOVERY_JOB);
   assert.equal(receipt.verification.status,'verified');assert.equal(receipt.verification.revision,1);assert.equal(receipt.verification.verification_hash,CLINIC_RECOVERY_FIXED_TARGET.verificationHash);
   for(const[k,v]of Object.entries({acquisition_mode:'clinic',funding_mode:'sponsored',packet_entitlement_id:CLINIC_RECOVERY_FIXED_TARGET.entitlementId,initial_verification_hash:CLINIC_RECOVERY_FIXED_TARGET.verificationHash}))assert.equal(receipt.funding[k],v);
   target=Object.freeze({...CLINIC_RECOVERY_FIXED_TARGET,protectedReceiptSha256:hash(JSON.stringify(receipt))});
   const details=await queryRows(clinicDetailsQuery(target));assert.equal(details.length,1);artifactMetadata=admitFinalizedClinicDetails(target,details[0].ordinary_worker_details);ready=true;
   const result={phase:'EXISTING_JOB_FINALIZED_POSTSTATE_VERIFIED',attemptCount:3,workerInvocations:0,alreadyFinalized:true,protectedDeliveryProven:false,artifactSha256:artifactMetadata.sha256,byteCount:artifactMetadata.byteCount,pageCount:16};checkpoint(result);return result;
  },
  async retrieveRecoveredPrivateArtifact(downloadPorts){
   assert(ready&&target&&artifactMetadata);
   const readDeliveryEvents=async id=>{assert.equal(id,RECOVERY_JOB);return queryRows(`BEGIN READ ONLY; SET LOCAL statement_timeout='15s'; SELECT e.id,e.render_job_id,e.event_type,e.actor_user_id,e.created_at FROM public.packet_delivery_events e JOIN public.packet_render_jobs j ON j.id=e.render_job_id WHERE j.id='${RECOVERY_JOB}'::uuid AND j.sponsored_consumer_briefcase_item_id='${CLINIC.item}'::uuid AND j.sponsored_consumer_auth_user_id='${CLINIC.owner}'::uuid AND j.sponsored_clinic_event_id='${CLINIC.event}'::uuid ORDER BY e.created_at,e.id; COMMIT;`);};
   return verifyClinicOwnerPrivateAccess({target,artifactMetadata,assertContinuousWindow,checkpoint,...downloadPorts,publicObjectGet,readDeliveryEvents,waitDeliveryEvents:args=>waitSameJobEvents({...args,readEvents:readDeliveryEvents,sleep:ms=>new Promise(r=>setTimeout(r,ms))})});
  },
  getRecoveryTarget(){assert(ready);return target;}
 };
}
