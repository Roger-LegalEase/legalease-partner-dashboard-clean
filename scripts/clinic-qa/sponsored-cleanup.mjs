import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

/** Plan compensation of the one existing synthetic program counter changed by
 * real sponsored finalization. No writes here. The fixture applies this with
 * whole-row compare-and-swap inside its existing teardown transaction. */
export function sponsoredCounterRestoration({before,after,program,partnerId,actorIds,knownIds,allocationIds}) {
  const table='public.partner_entitlement';
  const old=(before[table]??[]).filter(row=>row.partner_slug===program);
  const current=(after[table]??[]).filter(row=>row.partner_slug===program);
  assert.equal(old.length,1,'Exactly one existing synthetic program allowance is required');
  assert.equal(current.length,1,'Existing synthetic program allowance must remain present');
  if(JSON.stringify(old[0])===JSON.stringify(current[0]))return null;
  const baseline=old[0],actual=current[0];
  const unchanged=row=>Object.fromEntries(Object.entries(row).filter(([key])=>!['screenings_used','updated_at'].includes(key)));
  assert.deepEqual(unchanged(actual),unchanged(baseline),'Cleanup refuses other changed program fields, financial terms or overage');
  assert(Number.isSafeInteger(baseline.screenings_used)&&Number.isSafeInteger(actual.screenings_used));
  const delta=actual.screenings_used-baseline.screenings_used;
  assert(delta>0&&delta<=4,'Only the authorized temporary four-packet allocation can change this counter');
  const created=(name,key='id')=>{
    const prior=new Set((before[name]??[]).map(row=>row[key]));
    return (after[name]??[]).filter(row=>!prior.has(row[key]));
  };
  const proofs=created('public.consumer_packet_artifact_provenance','briefcase_item_id')
    .filter(row=>row.entitlement_source==='partner_sponsorship'&&actorIds.has(row.consumer_auth_user_id));
  assert.equal(proofs.length,delta,'Counter change requires one new run-owned finalized artifact per included credit');
  const jobs=created('public.packet_render_jobs'),credits=created('public.packet_credit_ledger');
  const analytics=created('public.rcap_screening_analytics_events'),events=created('public.rcap_record_events');
  const receipts=[];
  for(const proof of proofs){
    assert(knownIds.has(proof.briefcase_item_id),'Only a run-owned participant item may explain the counter');
    const job=jobs.find(row=>row.id===proof.render_job_id);
    assert(job&&job.partner_id===partnerId&&job.sponsored_consumer_auth_user_id===proof.consumer_auth_user_id
      &&job.sponsored_consumer_briefcase_item_id===proof.briefcase_item_id
      &&job.sponsored_verification_hash===proof.verification_hash&&job.matter_id===proof.matter_id
      &&knownIds.has(job.sponsored_session_id)&&knownIds.has(job.sponsored_clinic_event_id)
      &&['artifact_validated','delivered'].includes(job.status)&&job.delivery_eligibility==='eligible'
      &&['consumed','already_consumed'].includes(job.accounting_result),'Exact new run-owned sponsored job/accounting is required');
    assert.equal(proof.artifact?.renderJobId,job.id);
    assert.equal(proof.artifact?.artifactSha256,job.output_sha256);
    assert.match(job.output_sha256,/^[a-f0-9]{64}$/);
    assert.equal(proof.artifact?.storagePath,`packet-artifacts/${partnerId}/${proof.matter_id}/${job.id}/${job.output_sha256}.pdf`);
    const credit=credits.filter(row=>row.render_job_id===job.id&&row.partner_id===partnerId&&row.matter_id===proof.matter_id
      &&row.event_type==='consumed'&&allocationIds.has(row.entitlement_id));
    assert.equal(credit.length,1,'Exactly one new credit from the run-created simulated allocation is required');
    const counted=analytics.filter(row=>row.event_type==='packet_generated'&&row.partner_slug===program
      &&row.session_id===job.sponsored_session_id&&row.metadata?.clinic_event_id===job.sponsored_clinic_event_id
      &&row.metadata?.counted_as==='included');
    assert.equal(counted.length,1,'Protected finalizer analytics must independently confirm the included credit');
    const audit=events.filter(row=>row.event_type==='partner_packet_credit_consumed'&&row.partner_slug===program
      &&row.metadata?.briefcase_item_id===proof.briefcase_item_id&&row.metadata?.session_id===job.sponsored_session_id
      &&row.metadata?.clinic_event_id===job.sponsored_clinic_event_id&&row.metadata?.counted_as==='included');
    assert.equal(audit.length,1,'Exact run-owned sponsored finalization audit receipt is required');
    assert(Number.isFinite(Date.parse(counted[0].occurred_at)));
    receipts.push({item:proof.briefcase_item_id,job:job.id,credit:credit[0].id,analytics:counted[0].id,
      audit:audit[0].id,occurredAt:counted[0].occurred_at});
  }
  const last=receipts.map(row=>row.occurredAt).sort((a,b)=>Date.parse(a)-Date.parse(b)||a.localeCompare(b)).at(-1);
  assert.equal(actual.updated_at,last,'No unexplained program update may follow the proven finalizer transaction');
  assert(Date.parse(actual.updated_at)>=Date.parse(baseline.updated_at),'Counter timestamp must advance from the baseline');
  return {table,before:baseline,after:actual,delta,
    proofSha256:createHash('sha256').update(JSON.stringify(receipts)).digest('hex')};
}
