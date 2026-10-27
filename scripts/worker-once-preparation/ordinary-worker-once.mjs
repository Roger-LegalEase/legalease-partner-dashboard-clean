import {assertOrdinaryWorkerRuntimeContext} from './ordinary-worker-runtime-context.mjs';
import {assertSponsoredWorkerRuntimeContext} from './sponsored-worker-runtime-context.mjs';
import {QUALIFIED_WORKER_IMAGE,requireQualifiedWorkerImage} from './qualified-worker-image.mjs';
const RECOVERY_JOB='7c753a4a-3d71-47c4-a6b9-8f87509544c2';
import {RECOVERY_IMAGE} from '../clinic-worker-once-preparation/clinic-recovery-image.mjs';
// Source preparation only: no CLI, default live ports, pull, login or workflow.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

export const IMAGE='ghcr.io/roger-legalease/rcap-render-worker@sha256:cd0d3ab9098ed47028d5d89ae5280904520f28bc7331fc9ca17b2a2978a3f494';
export const SOURCE='32499751569359315248c2048fa111064a47c67f';
const DB='https://hyflxnlhpmiqxvvcoiia.supabase.co',DIGEST=IMAGE.split('@')[1];
const hash=b=>createHash('sha256').update(b).digest('hex');
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const SHA=/^[0-9a-f]{64}$/;
const RPC={claim_packet_render_job:'53c2a93c5dec98329ff9c71f5576319328224135f6dce39bd9429138eebbe772',release_expired_packet_render_claims:'b645d804ee37c7c59e478bd07c00370dc5647cd8988381c2e377bb9651469649',requeue_retryable_packet_render_jobs:'e92df9f403fb33bf2dc710fb711e82910aeba3b70838be6c7706fd432842d1a3'};
const templateHashes={
 'GLOBAL-QUEUE-WINDOW-COMPLETENESS.TEMPLATE.NOT-EXECUTED.sql':'787c50a5971f5c2ea7aa82612f966750235681799277b1a6f4b72ebe6fd24684',
 'ACTUAL-ORDINARY-TARGET-PRECLAIM-JOIN.TEMPLATE.NOT-EXECUTED.sql':'7b282341840a72d321bf7781afa023a9b5916e4cdaf65d94c6eeaaaef3b2a7ed'
};
const targetFields=['jobId','packetId','itemId','ownerId','sessionId','personId','matterId','entitlementId'];
export function validateTarget(t,identity){
 assert(identity===undefined||identity===QUALIFIED_WORKER_IMAGE);if(identity)requireQualifiedWorkerImage(identity);
 for(const k of targetFields)assert.match(t[k]??'',UUID,'actual ordinary target UUID');
 for(const k of ['verificationHash','inputHash','protectedReceiptSha256'])assert.match(t[k]??'',SHA,'protected actual target custody');
 assert.equal(t.packetNamespace,'expungement-ai-consumer');assert.equal(t.partnerSlug,'legalease-ordinary-qa-20261024');
 assert.equal(t.clinicEventId,null);assert.equal(t.acquisitionMode,'partner');
 assert.equal(t.applicationSha,identity?'ed8d0902a99c5326f75987a942eb507b6cfb16cf':'9aadacd0c5a7fac90a1662f1928b7b86f8685c7a');assert.equal(t.rendererKind,'packet_document_v1');
}
function validateWindow(w,now){
 assert.match(w.custodyReceiptSha256??'',SHA,'actual root/C continuous-window custody');
 assert.equal(w.operator,'root');assert.equal(w.projectRef,'hyflxnlhpmiqxvvcoiia');
 assert(Number.isFinite(Date.parse(w.startedAt))&&Date.parse(w.startedAt)<=now);
 assert(Number.isFinite(Date.parse(w.endsAt))&&Date.parse(w.endsAt)>now+305000,'full five-minute once plus observation remains inside custody');
}
export function bindReadOnlyTemplates(target,window,identity){
 validateTarget(target,identity);assert(Number.isFinite(Date.parse(window.endsAt)));
 const substitutions={WINDOW_END_UTC:new Date(window.endsAt).toISOString(),ACTUAL_JOB_UUID:target.jobId,ACTUAL_PACKET_UUID:target.packetId,ACTUAL_ITEM_UUID:target.itemId,ACTUAL_OWNER_UUID:target.ownerId,ACTUAL_SESSION_UUID:target.sessionId,ACTUAL_PERSON_UUID:target.personId,ACTUAL_MATTER_UUID:target.matterId,ACTUAL_ENTITLEMENT_UUID:target.entitlementId,ACTUAL_VERIFICATION_SHA256:target.verificationHash,ACTUAL_INPUT_SHA256:target.inputHash};
 return Object.fromEntries(Object.entries(templateHashes).map(([file,expected])=>{
  const bytes=fs.readFileSync(new URL(file,import.meta.url));assert.equal(hash(bytes),expected,'accepted I template byte identity');
  const sql=bytes.toString().replace(/__([A-Z0-9_]+)__/g,(_,k)=>{assert(Object.hasOwn(substitutions,k));return substitutions[k];});assert(!sql.includes('__'));return[file,sql];
 }));
}
function assertSnapshot(s,target,eligible,recoveryIdentity,recoveryState){
 assert(recoveryIdentity===undefined||recoveryIdentity===RECOVERY_IMAGE);const retry=!!recoveryIdentity;
 if(retry){assert.equal(target.jobId,RECOVERY_JOB);assert.equal(eligible,0);assert(['expired_attempt2','backoff_attempt2','due_attempt2'].includes(recoveryState));const j=s.claimState.get(RECOVERY_JOB);assert.equal(j.attempt_count,2);assert.equal(j.max_attempts,5);
  if(recoveryState==='expired_attempt2'){assert.equal(j.status,'validating');assert.equal(j.failure_disposition,null);assert(Number.isFinite(Date.parse(j.claim_expires_at))&&Date.parse(j.claim_expires_at)<Date.now());}
  else{assert.equal(j.status,'failed');assert.equal(j.failure_disposition,'retryable');assert(Number.isFinite(Date.parse(j.next_attempt_at)));assert.equal(Date.parse(j.next_attempt_at)<=Date.now(),recoveryState==='due_attempt2');}
 }
 assert.equal(s.projectRef,'hyflxnlhpmiqxvvcoiia');assert.equal(s.serviceRoleTargetIdentityVerified,true);
 assert.equal(s.targetReceiptSha256,target.protectedReceiptSha256);assert.equal(s.readOnly,true);
 assert.equal(s.bucket.privateExactlyOnce,true);
 assert.equal(s.currentQueueRpcBodies.length,3);assert.equal(new Set(s.currentQueueRpcBodies.map(r=>r.name)).size,3);
 assert.deepEqual(Object.fromEntries(s.currentQueueRpcBodies.map(r=>[r.name,r.prosrcSha256])),RPC);
 for(const k of ['queuedAtAttemptLimitAnyRenderer','expiredClaimsAnyRenderer','failedRetryableAnyRenderer','canonicalRetryDueNoLiveSiblingAnyRenderer','historicalHousekeepingScopeAnyRenderer','liveClaimsAnyRenderer','activeWithoutLeaseAnyRenderer'])assert.equal(s.aggregate[k],retry&&(k==='historicalHousekeepingScopeAnyRenderer'||k==='expiredClaimsAnyRenderer'&&recoveryState==='expired_attempt2'||k==='failedRetryableAnyRenderer'&&recoveryState!=='expired_attempt2'||k==='canonicalRetryDueNoLiveSiblingAnyRenderer'&&recoveryState==='due_attempt2')?1:0,'all-kind housekeeping/live work must match the exact admitted target');
 assert.equal(s.aggregate.eligibleAnyRenderer,eligible);assert.equal(s.aggregate.eligibleAcceptedWorkerRenderer,eligible);
 assert.equal(s.completeness.readOnly,'on');assert.equal(s.completeness.validWindow,true);
 for(const k of ['unknownOrNullStatus','mutableMalformedAttemptBounds','queuedFiniteFutureInsideWindow','queuedNegativeInfinity','activeMissingOrNonfiniteLease','activeMalformedClaimIdentity','nonterminalUnknownRenderer'])assert.equal(s.completeness[k],0,'global completeness refuses unknown or later eligible work');
 // Existing accepted9c995/C23f count/class permits one permanently ineligible row.
 // Bind its identity from this already-required full snapshot, not an invented historical ID receipt.
 assert.equal(s.completeness.queuedPositiveInfinity,1);
 // Future work beyond the finite window is recorded, never treated as ingress isolation.
 assert(Number.isSafeInteger(s.completeness.queuedFiniteFutureBeyondWindow)&&s.completeness.queuedFiniteFutureBeyondWindow>=0);
 assert(s.claimState instanceof Map,'reuse complete existing claimStateSnapshot, not a bounded first page');
 const baseline=[...s.claimState].filter(([,r])=>r.status==='queued'&&r.next_attempt_at==='infinity');assert.equal(baseline.length,1);
 return hash(JSON.stringify(baseline));
}
function rowsThatChanged(before,after){
 const fields=['status','attempt_count','claimed_by','claimed_at','claim_expires_at','next_attempt_at','error_code','failure_disposition','rendering_at','validating_at','artifact_validated_at','fencingTokenSha256'];
 const changed=new Set();
 for(const [id,row]of after){const old=before.get(id);if(!old||fields.some(k=>String(old[k]??'')!==String(row[k]??'')))changed.add(id);}
 for(const id of before.keys())if(!after.has(id))changed.add(id);
 return [...changed];
}
function parseCycleResult(stdout){
 // Existing canonical payment runOneCycle reads stdout only; Docker pull stderr is not a worker result.
 const lines=String(stdout??'').split('\n').map(s=>s.trim()).filter(Boolean);
 for(let i=lines.length-1;i>=0;i--)if(lines[i].startsWith('{'))try{const p=JSON.parse(lines[i]);if(p&&typeof p.outcome==='string')return p;}catch{}
 return null;
}
export function dockerOnceInvocation(env,runId,identity,context){
 assert(identity===undefined||identity===RECOVERY_IMAGE||identity===QUALIFIED_WORKER_IMAGE);if(identity===QUALIFIED_WORKER_IMAGE)requireQualifiedWorkerImage(identity);const image=identity?.image??IMAGE,digest=identity?.digest??DIGEST;
 assert.match(runId??'',/^[1-9][0-9]*$/,'actual GHA run ID');
 assert.equal(env.NEXT_PUBLIC_SUPABASE_URL,DB);assert.equal(env.SUPABASE_URL,DB);
 assert.equal(env.ENABLE_SUPABASE_PARTNER_DATA,'true');assert.equal(env.RCAP_WORKER_CLAIM_SECONDS,'120');assert.equal(env.RCAP_WORKER_CONTAINER_DIGEST,digest);
 const jwt=env.SUPABASE_SERVICE_ROLE_KEY?.split('.');assert.equal(jwt?.length,3);
 const claims=JSON.parse(Buffer.from(jwt[1],'base64url'));assert.equal(claims.ref,'hyflxnlhpmiqxvvcoiia');assert.equal(claims.role,'service_role');
 assert(Number.isFinite(claims.exp)&&claims.exp*1000>Date.now()+305000,'existing service credential valid through cycle');
 const names=['NEXT_PUBLIC_SUPABASE_URL','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY','ENABLE_SUPABASE_PARTNER_DATA','RCAP_WORKER_CLAIM_SECONDS','RCAP_WORKER_CONTAINER_DIGEST'];
 if(context!==undefined){assertSponsoredWorkerRuntimeContext(context);assert.equal(identity,QUALIFIED_WORKER_IMAGE);for(const[k,v]of Object.entries(context)){assert.equal(env[k],v);names.push(k);}}
 // Sponsored finalization consumes only the approved preview context; secrets stay in the existing six-field allowlist.
 const childEnv=Object.fromEntries(names.map(k=>[k,env[k]]));
 const args=['run','--rm','--pull=never','--name',`rcap-ordinary-once-${runId}`,...names.flatMap(k=>['-e',k]),image,'node','scripts/rcap-render-worker.mjs','--once'];
 return {command:'docker',args,options:{env:childEnv,encoding:'utf8',timeout:300000,maxBuffer:32*1024*1024}};
}
// Caller supplies only actual root/C-admitted custody and accepted readonly/operator ports.
// There is deliberately no synthetic admission, default live DB client, pull/login or standalone runner.
export async function executeAdmittedOrdinaryOnce(input){const identity=input.identity;if(identity)assertOrdinaryWorkerRuntimeContext(input.context);return executeAdmittedWorkerOnce(input,{validateTarget:t=>validateTarget(t,identity),bindReadOnlyTemplates:(t,w)=>bindReadOnlyTemplates(t,w,identity),receiptSchema:'ordinary-worker-once-safe/v1',identity,context:identity?input.context:undefined});}
export async function executeAdmittedWorkerOnce({target,window,env,runId,ports},{validateTarget,bindReadOnlyTemplates,receiptSchema,identity,context}){
 assert(identity===undefined||identity===QUALIFIED_WORKER_IMAGE);if(identity)requireQualifiedWorkerImage(identity);
 const source=identity?.source??SOURCE,imageReference=identity?.image??IMAGE,digest=identity?.digest??DIGEST;
 validateTarget(target);validateWindow(window,Date.now());
 assert(Number.isFinite(Date.parse(target.firstEnqueueCapableActionAt))&&Date.parse(window.startedAt)<=Date.parse(target.firstEnqueueCapableActionAt)&&Date.parse(target.firstEnqueueCapableActionAt)<=Date.now(),'custody began before the actual first enqueue-capable action');
 for(const k of ['assertContinuousWindow','readSnapshot','verifyPreparedImage','invokeOnce'])assert.equal(typeof ports[k],'function');
 let attempted=false,stage='prestate';
 const receipt={schemaVersion:receiptSchema,status:'HOLD',workerSourceSha:source,image:imageReference,targetReceiptSha256:target.protectedReceiptSha256,targetJobSha256:hash(target.jobId),windowReceiptSha256:window.custodyReceiptSha256,attempted:false,ownerPrivateRetrievalProven:false};
 try{
  await ports.assertContinuousWindow({stage,target,window});
  const image=await ports.verifyPreparedImage();assert.equal(image.digest,digest);assert.equal(image.sourceSha,source);assert.equal(image.nonRoot,true);assert.equal(image.ephemeralGithubExecutor,true);
  const sql=bindReadOnlyTemplates(target,window),before=await ports.readSnapshot({stage,target,window,sql}),infinityBaseline=assertSnapshot(before,target,1);
  for(const k of ['exactTargetJobCount','exactAllBindingsJoinCount','globalEligibleAllKinds','acceptedRendererEligible','targetRankAllKinds','targetRankAcceptedRenderer'])assert.equal(before.target[k],1,'actual supported ordinary target must be sole eligible rank1');
  assert.equal(before.target.readOnly,'on');assert.equal(before.claimState.get(target.jobId)?.status,'queued');
  const invocation=dockerOnceInvocation(env,runId,identity,context);validateWindow(window,Date.now());
  await ports.assertContinuousWindow({stage:'immediately_before_once',target,window});
  stage='once';attempted=true;let run;
  try{run=await ports.invokeOnce(invocation);}catch{run={status:null,signal:null,error:true};}
  // Poststate/custody must be acquired even after an uncertain, timed-out or failed cycle; never retry.
  stage='poststate';const after=await ports.readSnapshot({stage,target,window,sql});await ports.assertContinuousWindow({stage,target,window});
  assert(Date.now()<Date.parse(window.endsAt));assert.equal(assertSnapshot(after,target,0),infinityBaseline,'preserved infinite-row identity/state unchanged');
  const moved=rowsThatChanged(before.claimState,after.claimState),result=parseCycleResult(run.stdout);
  receipt.exitCode=Number.isInteger(run.status)?run.status:null;receipt.stdoutSha256=hash(String(run.stdout??''));receipt.stderrSha256=hash(String(run.stderr??''));receipt.movedRows=moved.length;
  assert.equal(run.status,0);assert.equal(run.signal??null,null);assert.equal(run.error??null,null);
  assert.equal(result?.outcome,'finalized');assert.equal(result.jobId,target.jobId);assert.deepEqual(moved,[target.jobId]);
  assert.equal(after.targetJobStatus,'artifact_validated');assert.equal(after.finalizedTargetOnly,true);
  assert.equal(after.privateArtifactProvenanceVerified,true);assert.equal(after.expectedAccountingAndEligibilityVerified,true);
  assert.equal(after.unrelatedHistoryUnchanged,true);assert.equal(after.surpriseIngressCount,0);
  receipt.status='TARGET_FINALIZED_POSTSTATE_VERIFIED';receipt.finalizedJobMatchesTarget=true;
 }catch{
  receipt.status=attempted?'STOP_UNCERTAIN_NO_RETRY':'HOLD_NO_WORKER';receipt.failureStage=stage;
 }
 receipt.attempted=attempted;return Object.freeze(receipt);
}

// Shared unchanged global safety predicates; paid DTC supplies its own entitlement join.
export {validateWindow,assertSnapshot,rowsThatChanged,parseCycleResult};
