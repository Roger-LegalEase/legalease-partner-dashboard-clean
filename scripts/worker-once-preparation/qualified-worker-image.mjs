// Technical image identity only; no customer, funding, retry or execution admission.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const QUALIFIED_WORKER_IMAGE = Object.freeze({
 source:'84a75b6e65dc69e6c371afac44f1284e0debf722', digest:'sha256:c574d7ca3864dfcae9de3cb4fc77c8c324ace050310333093042f961e6f0b5f1', image:'ghcr.io/roger-legalease/rcap-render-worker@sha256:c574d7ca3864dfcae9de3cb4fc77c8c324ace050310333093042f961e6f0b5f1'
});
export const QUALIFIED_WORKER_EVIDENCE = Object.freeze({
 publicationReceiptSha256:'fe6100d154eb9aa7a17b8899f6395e9466e2a3b4192e23e905fc293a59763e85', publicationRunId:'40504068956', publicationWorkflowSourceSha:'84a75b6e65dc69e6c371afac44f1284e0debf722',
 qualificationReceiptSha256:null, qualificationRunId:null, qualificationAcceptanceSha256:null
});
export function requireQualifiedWorkerImage(identity=QUALIFIED_WORKER_IMAGE) {
 assert.equal(identity,QUALIFIED_WORKER_IMAGE,'Only the source-reviewed technical image identity is accepted');
 assert.match(identity.digest??'',/^sha256:[a-f0-9]{64}$/,'Unpublished or unqualified image: HOLD before authentication');
 assert.equal(identity.image,'ghcr.io/roger-legalease/rcap-render-worker@'+identity.digest);
 for(const key of ['publicationReceiptSha256','qualificationReceiptSha256','qualificationAcceptanceSha256'])
  assert.match(QUALIFIED_WORKER_EVIDENCE[key]??'',/^[a-f0-9]{64}$/,'HOLD before authentication: actual publication and qualification evidence must be source-bound');
 for(const key of ['publicationRunId','qualificationRunId'])assert.match(QUALIFIED_WORKER_EVIDENCE[key]??'',/^[1-9][0-9]*$/);
 assert.match(QUALIFIED_WORKER_EVIDENCE.publicationWorkflowSourceSha??'',/^[a-f0-9]{40}$/);
 return identity;
}
export function admitQualifiedWorkerImage({publicationBytes,qualificationBytes,qualificationAcceptanceBytes,publicationRun}) {
 const identity=requireQualifiedWorkerImage();
 for(const [bytes,key] of [[publicationBytes,'publicationReceiptSha256'],[qualificationBytes,'qualificationReceiptSha256'],[qualificationAcceptanceBytes,'qualificationAcceptanceSha256']])
  assert.equal(createHash('sha256').update(bytes).digest('hex'),QUALIFIED_WORKER_EVIDENCE[key]);
 const p=JSON.parse(publicationBytes);
 for(const [key,value] of Object.entries({sourceSha:identity.source,requestedIntegrationSha:identity.source,immutableRegistryDigest:identity.digest,digestPinnedReference:identity.image,workflowRunId:QUALIFIED_WORKER_EVIDENCE.publicationRunId,workflowSourceSha:QUALIFIED_WORKER_EVIDENCE.publicationWorkflowSourceSha,publishOnlyNoDeploy:true,workerClaimingStarted:false,tagReplacementAuthorization:''}))assert.equal(p[key],value);
 for(const [key,value] of Object.entries({id:Number(QUALIFIED_WORKER_EVIDENCE.publicationRunId),head_sha:p.workflowSourceSha,head_branch:'captain-release',event:'workflow_dispatch',run_attempt:1,status:'completed',conclusion:'success'}))assert.equal(publicationRun[key],value);
 return identity;
}
