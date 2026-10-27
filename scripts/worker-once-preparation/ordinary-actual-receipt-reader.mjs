// Read exact normal-journey metadata only; never enqueue, Verify, fund, claim or infer a job.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {buildActualOrdinaryTarget} from './ordinary-worker-binding.mjs';
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
export function ordinaryActualReceiptQuery(handoff){
 assert.equal(handoff.stage,'ordinary_enqueued_worker_handoff_required');assert.equal(handoff.partnerSlug,'legalease-ordinary-qa-20261024');assert.equal(handoff.eventId,null);
 for(const k of ['jobId','itemId','sessionId','participantUserId'])assert.match(handoff[k]??'',UUID,'Actual normal-journey '+k);
 assert.match(handoff.verificationHash??'',/^[a-f0-9]{64}$/);assert.ok(Number.isSafeInteger(handoff.revision)&&handoff.revision>0);const observed=Date.parse(handoff.firstEnqueueCapableActionAt);assert.ok(Number.isFinite(observed)&&observed<=Date.now(),'Durable actual before-Verify timestamp required');
 return `BEGIN READ ONLY; SET LOCAL statement_timeout='15s';
SELECT jsonb_build_object('readOnly',current_setting('transaction_read_only'),'observedAt',now(),'receipt',jsonb_build_object(
'job',(SELECT to_jsonb(j) FROM public.packet_render_jobs j WHERE j.id='${handoff.jobId}'::uuid AND j.sponsored_consumer_briefcase_item_id='${handoff.itemId}'::uuid AND j.sponsored_consumer_auth_user_id='${handoff.participantUserId}'::uuid AND j.sponsored_session_id='${handoff.sessionId}'::uuid AND j.sponsored_clinic_event_id IS NULL AND j.sponsored_verification_hash='${handoff.verificationHash}'),
'funding',(SELECT to_jsonb(f) FROM public.clinic_packet_funding f WHERE f.briefcase_item_id='${handoff.itemId}'::uuid AND f.consumer_auth_user_id='${handoff.participantUserId}'::uuid AND f.source_session_id='${handoff.sessionId}'::uuid AND f.event_id IS NULL AND f.partner_slug='legalease-ordinary-qa-20261024' AND f.acquisition_mode='partner' AND f.funding_mode='sponsored' AND f.initial_verification_hash='${handoff.verificationHash}'),
'verification',(SELECT jsonb_build_object('briefcase_item_id',v.briefcase_item_id,'consumer_auth_user_id',v.consumer_auth_user_id,'verification_hash',v.verification_hash,'status',v.status,'revision',v.revision) FROM public.consumer_packet_verifications v WHERE v.briefcase_item_id='${handoff.itemId}'::uuid AND v.consumer_auth_user_id='${handoff.participantUserId}'::uuid AND v.status='verified' AND v.verification_hash='${handoff.verificationHash}' AND v.revision=${handoff.revision})
)) AS actual_ordinary_worker_receipt; COMMIT;`;
}
export async function readActualOrdinaryReceipt({handoff,queryRows,assertContinuousWindow,checkpoint,identity,profile}){
 for(const f of [queryRows,assertContinuousWindow,checkpoint])assert.equal(typeof f,'function');const sql=ordinaryActualReceiptQuery(handoff);
 await assertContinuousWindow({stage:'ordinary_before_actual_receipt_read'});const rows=await queryRows(sql);assert.ok(Array.isArray(rows)&&rows.length===1);const native=rows[0].actual_ordinary_worker_receipt;assert.equal(native?.readOnly,'on');const observed=Date.parse(native.observedAt);assert.ok(Number.isFinite(observed)&&observed<=Date.now()&&Date.now()-observed<120000);
 const receiptBytes=Buffer.from(JSON.stringify(native.receipt));const receiptSha256=createHash('sha256').update(receiptBytes).digest('hex');const input={receiptBytes,receiptSha256,firstEnqueueCapableActionAt:handoff.firstEnqueueCapableActionAt,...(identity?{identity,profile}:{})};const target=buildActualOrdinaryTarget(input);assert.equal(target.jobId,handoff.jobId);assert.equal(target.itemId,handoff.itemId);assert.equal(target.ownerId,handoff.participantUserId);assert.equal(target.sessionId,handoff.sessionId);assert.equal(target.verificationHash,handoff.verificationHash);assert.equal(native.receipt.verification.revision,handoff.revision);
 await assertContinuousWindow({stage:'ordinary_after_actual_receipt_read'});await checkpoint({schemaVersion:'ordinary-actual-receipt-safe/v1',targetReceiptSha256:receiptSha256,observedAt:native.observedAt,readOnly:true,actualJobPresent:true,firstEnqueueCapableActionAt:handoff.firstEnqueueCapableActionAt});return input;
}
