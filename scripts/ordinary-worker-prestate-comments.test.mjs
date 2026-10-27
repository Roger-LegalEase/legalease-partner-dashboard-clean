import test from 'node:test';
import assert from 'node:assert/strict';
import {assertOrdinaryReadOnlyQuery} from './rcap-hosted-ordinary-full-runtime.mjs';
import {createOrdinarySnapshotPort} from './worker-once-preparation/ordinary-worker-binding.mjs';
import {bindReadOnlyTemplates} from './worker-once-preparation/ordinary-worker-once.mjs';
import {QUALIFIED_WORKER_IMAGE as Q} from './worker-once-preparation/qualified-worker-image.mjs';
import {NORMAL_RECOVERY} from './ordinary-normal-recovery-profile.mjs';
const UUID='11111111-1111-4111-8111-111111111111',SHA='a'.repeat(64);
const target={...Object.fromEntries(['jobId','packetId','itemId','ownerId','sessionId','personId','matterId','entitlementId'].map(k=>[k,UUID])),verificationHash:SHA,inputHash:SHA,protectedReceiptSha256:SHA,packetNamespace:'expungement-ai-consumer',partnerSlug:'legalease-ordinary-qa-20261024',clinicEventId:null,acquisitionMode:'partner',applicationSha:NORMAL_RECOVERY.app,rendererKind:'packet_document_v1',firstEnqueueCapableActionAt:new Date().toISOString()};
const window={endsAt:new Date(Date.now()+900000).toISOString()};
test('actual six-query Ordinary prestate transport admits source comments and retains exact read-only SQL bodies',async()=>{
 const calls=[],checkpoints=[];let identityReads=0;
 const queryRows=async query=>{
  calls.push(query);assertOrdinaryReadOnlyQuery(query);
  if(query.includes(' AS private_bucket_and_queue_snapshot'))return[{private_bucket_and_queue_snapshot:{executionContext:{transaction_read_only:'on'},aggregate:{totalRows:1},bucket:{privateExactlyOnce:true},currentQueueRpcBodies:[]}}];
  if(query.includes(' AS global_queue_window_completeness'))return[{global_queue_window_completeness:{readOnly:'on'}}];
  if(query.includes(' AS actual_ordinary_target_preclaim_binding'))return[{actual_ordinary_target_preclaim_binding:{readOnly:'on',exactAllBindingsJoinCount:1}}];
  if(query.includes('FROM public.packet_render_jobs ORDER BY id'))return[{id:UUID,status:'queued',next_attempt_at:null}];
  if(query.includes(' AS ordinary_unrelated_history'))return[{ordinary_unrelated_history:{ledger:SHA,delivery:SHA,payment:SHA}}];
  if(query.includes(' AS ordinary_worker_details'))return[{ordinary_worker_details:{job:{id:UUID,status:'queued'},consumed:0,provenance:null}}];
  throw Error('Unexpected query');
 };
 const readSnapshot=createOrdinarySnapshotPort({queryRows,assertServiceRoleTargetIdentity:async()=>{identityReads++;},checkpoint:async v=>checkpoints.push(v)},Q,NORMAL_RECOVERY);
 const sql=bindReadOnlyTemplates(target,window,Q,NORMAL_RECOVERY),state=await readSnapshot({stage:'prestate',target,window,sql});
 assert.equal(calls.length,6);assert.equal(calls.filter(q=>q.startsWith('-- SOURCE ONLY')).length,3);assert.equal(identityReads,1);assert.equal(state.claimState.get(UUID).status,'queued');assert.equal(state.target.exactAllBindingsJoinCount,1);assert.equal(checkpoints.length,1);assert.equal(checkpoints[0].stage,'prestate');
 assert(calls.includes(sql['GLOBAL-QUEUE-WINDOW-COMPLETENESS.TEMPLATE.NOT-EXECUTED.sql']));assert(calls.includes(sql['ACTUAL-ORDINARY-TARGET-PRECLAIM-JOIN.TEMPLATE.NOT-EXECUTED.sql']));
});
test('comments cannot authorize a write transaction, pre-transaction executable SQL, or a missing commit',()=>{
 for(const query of ['BEGIN; SELECT 1; COMMIT;','-- note\nBEGIN; SELECT 1; COMMIT;','UPDATE public.packet_render_jobs SET status=\'queued\'; BEGIN READ ONLY; SELECT 1; COMMIT;','-- note\nUPDATE public.packet_render_jobs SET status=\'queued\';\nBEGIN READ ONLY; SELECT 1; COMMIT;','-- note\nBEGIN READ ONLY; SELECT 1;','-- note only'])assert.throws(()=>assertOrdinaryReadOnlyQuery(query));
});
