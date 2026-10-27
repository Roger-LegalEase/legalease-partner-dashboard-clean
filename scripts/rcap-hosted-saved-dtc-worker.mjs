import {requireQualifiedWorkerImage} from './worker-once-preparation/qualified-worker-image.mjs';
// Bind F's unchanged accepted paid-DTC once/receipt/snapshot ports. No worker operation during import/construction.
import assert from 'node:assert/strict';
import {hash} from './rcap-hosted-saved-dtc-contracts.mjs';
import {buildActualPaidTarget} from './paid-dtc-worker-once-preparation/paid-dtc-actual-target.mjs';
import {executeAdmittedPaidDtcOnce} from './paid-dtc-worker-once-preparation/paid-dtc-worker-once.mjs';
import {createPaidDtcGhaWorkerPorts} from './paid-dtc-worker-once-preparation/paid-dtc-gha-worker-ports.mjs';
import {createPaidDtcSnapshotPort,createActualPaidReceiptAssertion} from './paid-dtc-worker-once-preparation/paid-dtc-snapshot-ports.mjs';
import {dockerOnceInvocation} from './worker-once-preparation/ordinary-worker-once.mjs';
export function createSavedDtcWorkerBinding({env,runId,assertContinuousWindow,checkpoint,runCommand,identity}){
 if(identity!==undefined)requireQualifiedWorkerImage(identity);
 assert.equal(typeof assertContinuousWindow,'function');assert.equal(typeof checkpoint,'function');
 // Reads actual supplied dual hyfl URLs and existing service-role JWT claims/expiry; never returns the key/token.
 const assertServiceRoleTargetIdentity=async()=>{void dockerOnceInvocation(env,runId,identity);};
 const gha=createPaidDtcGhaWorkerPorts({env,runId,assertContinuousWindow,identity,...(runCommand?{runCommand}:{})});let completed=null;
 return {
  verifyPreparedImageBeforePurchase:async()=>{await assertServiceRoleTargetIdentity();const image=await gha.verifyPreparedImage();await checkpoint({phase:'accepted_image_readonly_verified',workerSourceSha:image.sourceSha,digest:image.digest,nonRoot:image.nonRoot});return image;},
  workerFactory:({queryRows,readTargetJobAndProvenance,getActualPaidInputs})=>{
   const readSnapshot=createPaidDtcSnapshotPort({queryRows,readTargetJobAndProvenance,assertServiceRoleTargetIdentity,checkpoint,identity}),assertActualPaidReceipt=createActualPaidReceiptAssertion({getActualPaidInputs});
   return {buildActualPaidTarget,runAdmittedPaidOnce:async({target,window})=>{const receipt=await executeAdmittedPaidDtcOnce({target,window,env,runId,identity,ports:{...gha,assertContinuousWindow,readSnapshot,assertActualPaidReceipt}});completed=receipt;return receipt;},loadWorkerReceipt:async jobId=>{assert(completed&&completed.targetJobSha256===hash(jobId),'no accepted prior native worker receipt bound; reconcile, never repeat once');return completed;}};
  }
 };
}
