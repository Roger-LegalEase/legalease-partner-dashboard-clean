import assert from 'node:assert/strict';
import {CLINIC,hash} from './rcap-hosted-existing-clinic-readonly.mjs';
import {completeClinicFlow} from './rcap-hosted-clinic-full-journey-entry.mjs';
const jobId='11111111-1111-4111-8111-111111111111',calls=[],checkpoints=[];
const target={jobId,receiptBytes:Buffer.from('mock protected receipt'),receiptSha256:'a'.repeat(64),firstEnqueueCapableActionAt:'2026-10-27T10:00:00Z'};
const callbacks=Object.fromEntries(['ownerDownload','repeatOwnerDownload','freshOwnerDownload','anonymousDownload','strangerDownload'].map(name=>[name,async()=>{throw Error('test must not access a live download');}]));
const queued={result:{phase:'CLINIC_ONE_QUEUED_JOB_STOP',jobSha256:hash(jobId)},target,downloadPorts:callbacks};
function fixture({imageBad=false,reviewHeld=false,workerHeld=false,wrongJob=false,deliveryBad=false}={}){
 const own=[];const window={custodyReceiptSha256:'b'.repeat(64)};
 const ports={window,verifyPreparedImageBeforeVerify:async()=>{own.push('image');return {digest:imageBad?'sha256:bad':CLINIC.digest,sourceSha:CLINIC.worker,nonRoot:true,ephemeralGithubExecutor:true};},
 runOnceAfterActualGenerate:async input=>{own.push('worker');assert.equal(input.window,window);assert.equal(input.receiptBytes,target.receiptBytes);assert.equal(input.firstEnqueueCapableActionAt,target.firstEnqueueCapableActionAt);return {schemaVersion:'clinic-worker-once-safe/v1',image:'ghcr.io/roger-legalease/rcap-render-worker@'+CLINIC.digest,windowReceiptSha256:window.custodyReceiptSha256,status:workerHeld?'STOP_UNCERTAIN_NO_RETRY':'TARGET_FINALIZED_POSTSTATE_VERIFIED',targetJobSha256:wrongJob?'c'.repeat(64):hash(jobId),workerSourceSha:CLINIC.worker,attempted:true};},
 retrieveOwnerPrivateArtifact:async input=>{own.push('delivery');assert.equal(input,callbacks);return {ownerPrivateRetrievalProven:!deliveryBad,repeatOwnerAccessProven:true,freshOwnerAccessProven:true,anonymousDenied:true,strangerDenied:true,publicObjectDenied:true,ownerReadCount:3,naturalDeliveryEventsAdded:9,targetJobSha256:hash(jobId)};}};
 return {own,args:{ports,review:async()=>{own.push('review');return reviewHeld?{result:{phase:'HOLD_RECONCILE_NO_RETRY'}}:queued;},checkpoint:value=>checkpoints.push(value)}};
}
let checks=0;const ok=fixture(),result=await completeClinicFlow(ok.args);assert.equal(result.phase,'CLINIC_PROTECTED_DELIVERY_OBSERVED');checks++;
assert.deepEqual(ok.own,['image','review','worker','delivery']);checks++;
assert(!Object.hasOwn(result,'target')&&!Object.hasOwn(result,'downloadPorts'));checks++;
const image=fixture({imageBad:true});await assert.rejects(()=>completeClinicFlow(image.args));assert.deepEqual(image.own,['image']);checks++;
const review=fixture({reviewHeld:true});assert.equal((await completeClinicFlow(review.args)).phase,'HOLD_RECONCILE_NO_RETRY');assert.deepEqual(review.own,['image','review']);checks++;
const worker=fixture({workerHeld:true});assert.equal((await completeClinicFlow(worker.args)).phase,'STOP_WORKER_RECONCILIATION_NO_RETRY');assert.deepEqual(worker.own,['image','review','worker']);checks++;
const mismatch=fixture({wrongJob:true});await assert.rejects(()=>completeClinicFlow(mismatch.args));assert.deepEqual(mismatch.own,['image','review','worker']);checks++;
const delivery=fixture({deliveryBad:true});await assert.rejects(()=>completeClinicFlow(delivery.args));assert.deepEqual(delivery.own,['image','review','worker','delivery']);checks++;
console.log(`${checks} focused exact Clinic image/review/one-worker/private-delivery composition and failure-stop checks PASS; all ports mocked, no live calls.`);
