import {requireQualifiedWorkerImage} from '../worker-once-preparation/qualified-worker-image.mjs';
// Source preparation only; no live clients, CLI, pulls, registry login, synthetic admission, or default execution ports.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {IMAGE,SOURCE,dockerOnceInvocation,validateWindow,assertSnapshot,rowsThatChanged,parseCycleResult} from '../worker-once-preparation/ordinary-worker-once.mjs';
const DIGEST=IMAGE.split('@')[1],hash=b=>createHash('sha256').update(b).digest('hex');
const UUID=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,SHA=/^[a-f0-9]{64}$/;
export function validatePaidTarget(t){
 for(const k of ['jobId','packetId','itemId','ownerId','personId','matterId'])assert.match(t[k]??'',UUID);
 assert.equal(hash(t.itemId),'6b280ecd45c49aefc52d0e540ccd2ee3077c954d70dd3f47dd08443d59864171');assert.equal(hash(t.ownerId),'da8d2556ebe1c462a3892d4f17799458724ab301a94323c1e1eccaca48aae038');assert.equal(hash(t.verificationHash),'9cd5917e75506d774e462f4df3ae8d5d6d8290ab5359ca9c025238cc5ca272dd');
 for(const k of ['verificationHash','inputHash','protectedReceiptSha256','providerReceiptSha256','packetSpecificationSha256','packetSpecificationFileSha256'])assert.match(t[k]??'',SHA);
 assert.equal(t.baselineSha256,'8d77d260e07c810584cc23976aaaaf598452ca6002e399f24fa8bcfc80fb5e73');assert.equal(t.revision,8);
 assert.equal(t.applicationSha,'c0052e13d9801d24080275aab02c70c6ea213fa3');assert.equal(t.rendererKind,'packet_document_v1');
 assert.equal(t.routeKey,'MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal');
 assert.equal(t.packetFamilyId,'ms-nonconv-set');assert.equal(t.specificationId,'ms-nonconviction-expungement-99-19-71-4');assert.equal(t.specificationVersion,'2.0.0');for(const k of ['packetSpecificationSha256','packetSpecificationFileSha256'])assert.equal(t[k],'23426df251aa31bfd5215edbfe547d5f56c2349ed4c4bb5e7b407bc25405e126');
 assert.match(t.checkoutSessionId??'',/^cs_test_[A-Za-z0-9]+$/);assert.match(t.paymentIntentId??'',/^pi_[A-Za-z0-9]+$/);assert.match(t.providerEventId??'',/^evt_[A-Za-z0-9]+$/);
 assert.equal(t.amountCents,5000);assert.equal(t.regularPriceCents,5000);assert.equal(t.discountCents,0);assert.equal(t.currency,'usd');assert.equal(t.paymentRequired,true);assert.equal(t.livemode,false);assert.equal(t.productId,'expungement_packet');assert.equal(t.catalogProductId,'prod_VHEHkvH7dSvGv7');assert.equal(t.paymentAuthority,'server_webhook');
 assert.equal(t.partnerId,null);assert.equal(t.clinicEventId,null);assert.equal(t.sponsored,false);
}
export function bindPaidReadOnlyTemplates(target,window){
 validatePaidTarget(target);assert(Number.isFinite(Date.parse(window.endsAt)));
 const values={WINDOW_END_UTC:new Date(window.endsAt).toISOString(),...Object.fromEntries(Object.entries(target).map(([k,v])=>[k,String(v)]))};
 const files=['../worker-once-preparation/GLOBAL-QUEUE-WINDOW-COMPLETENESS.TEMPLATE.NOT-EXECUTED.sql','PAID-DTC-TARGET-JOIN.TEMPLATE.NOT-EXECUTED.sql'];
 return Object.fromEntries(files.map(file=>{const raw=fs.readFileSync(new URL(file,import.meta.url));if(file.startsWith('../'))assert.equal(hash(raw),'787c50a5971f5c2ea7aa82612f966750235681799277b1a6f4b72ebe6fd24684');else assert.equal(hash(raw),'7172e82cc895f21a0a16eab8f25ed54db78b7e74bba01bd2b3dcb040af1bab5e');const sql=raw.toString().replace(/__([A-Za-z0-9_]+)__/g,(_,k)=>{assert(Object.hasOwn(values,k));return values[k];});assert(!sql.includes('__'));return[file,sql];}));
}
export async function executeAdmittedPaidDtcOnce({target,window,env,runId,ports,identity}){
 if(identity!==undefined)requireQualifiedWorkerImage(identity);
 const executionSource=identity?.source??SOURCE,executionImage=identity?.image??IMAGE,executionDigest=identity?.digest??DIGEST;
 validatePaidTarget(target);validateWindow(window,Date.now());
 assert(Number.isFinite(Date.parse(target.firstEnqueueCapableActionAt))&&Date.parse(window.startedAt)<=Date.parse(target.firstEnqueueCapableActionAt)&&Date.parse(target.firstEnqueueCapableActionAt)<=Date.now(),'custody began before the actual first enqueue-capable action');
 for(const k of ['assertContinuousWindow','readSnapshot','verifyPreparedImage','invokeOnce','assertActualPaidReceipt'])assert.equal(typeof ports[k],'function');
 let attempted=false,stage='prestate';
 const receipt={schemaVersion:'paid-dtc-worker-once-safe/v1',status:'HOLD',workerSourceSha:executionSource,image:executionImage,targetReceiptSha256:target.protectedReceiptSha256,targetJobSha256:hash(target.jobId),windowReceiptSha256:window.custodyReceiptSha256,attempted:false,ownerPrivateRetrievalProven:false};
 try{
  await ports.assertContinuousWindow({stage,target,window});
  await ports.assertActualPaidReceipt({target,window});
  const image=await ports.verifyPreparedImage();assert.equal(image.digest,executionDigest);assert.equal(image.sourceSha,executionSource);assert.equal(image.nonRoot,true);assert.equal(image.ephemeralGithubExecutor,true);
  const sql=bindPaidReadOnlyTemplates(target,window),before=await ports.readSnapshot({stage,target,window,sql}),infinityBaseline=assertSnapshot(before,target,1);
  for(const k of ['exactTargetJobCount','exactAllBindingsJoinCount','globalEligibleAllKinds','acceptedRendererEligible','targetRankAllKinds','targetRankAcceptedRenderer'])assert.equal(before.target[k],1,'actual supported paid DTC target must be sole eligible rank1');
  assert.equal(before.target.readOnly,'on');assert.equal(before.target.exactPaidAuthorityCount,1);assert.equal(before.target.exactProtectedInputCount,1);assert.equal(before.claimState.get(target.jobId)?.status,'queued');
  const invocation=dockerOnceInvocation(env,runId,identity);validateWindow(window,Date.now());
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
  assert.equal(after.target.exactAllBindingsJoinCount,1);assert.equal(after.target.exactPaidAuthorityCount,1);assert.equal(after.target.exactProtectedInputCount,1);assert.equal(after.targetJobStatus,'artifact_validated');assert.equal(after.finalizedTargetOnly,true);
  assert.equal(after.privateArtifactProvenanceVerified,true);assert.equal(after.expectedAccountingAndEligibilityVerified,true);
  assert.equal(after.unrelatedHistoryUnchanged,true);assert.equal(after.surpriseIngressCount,0);
  receipt.status='TARGET_FINALIZED_POSTSTATE_VERIFIED';receipt.finalizedJobMatchesTarget=true;
 }catch{
  receipt.status=attempted?'STOP_UNCERTAIN_NO_RETRY':'HOLD_NO_WORKER';receipt.failureStage=stage;
 }
 receipt.attempted=attempted;return Object.freeze(receipt);
}
