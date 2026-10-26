import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sponsoredCounterRestoration} from './sponsored-cleanup.mjs';

// Pure teardown-planner controls. No database mutation or actual compensation
// is claimed by these fixtures; genuine render-dependent cleanup is NOT_RUN.
function input(){
  const before={'public.partner_entitlement':[{partner_slug:'qa-synthetic',screenings_used:3,screenings_allowed:10,
    overage_packets:0,overage_amount_cents:0,updated_at:'2026-10-13T20:00:00+00:00'}]};
  const after=structuredClone(before),stamp='2026-10-13T21:00:00+00:00',sha='a'.repeat(64);
  after['public.partner_entitlement'][0].screenings_used=4;after['public.partner_entitlement'][0].updated_at=stamp;
  const storagePath=`packet-artifacts/program-id/derived-matter/job-id/${sha}.pdf`;
  after['public.consumer_packet_artifact_provenance']=[{briefcase_item_id:'item-id',consumer_auth_user_id:'owner-id',matter_id:'derived-matter',
    render_job_id:'job-id',verification_hash:'b'.repeat(64),entitlement_source:'partner_sponsorship',artifact:{renderJobId:'job-id',artifactSha256:sha,storagePath}}];
  after['public.packet_render_jobs']=[{id:'job-id',partner_id:'program-id',sponsored_consumer_auth_user_id:'owner-id',
    sponsored_consumer_briefcase_item_id:'item-id',sponsored_verification_hash:'b'.repeat(64),matter_id:'derived-matter',
    sponsored_session_id:'session-id',sponsored_clinic_event_id:'event-id',status:'delivered',delivery_eligibility:'eligible',accounting_result:'consumed',output_sha256:sha}];
  after['public.packet_credit_ledger']=[{id:'credit-id',render_job_id:'job-id',partner_id:'program-id',matter_id:'derived-matter',event_type:'consumed',entitlement_id:'temporary-allocation'}];
  after['public.rcap_screening_analytics_events']=[{id:'analytics-id',event_type:'packet_generated',partner_slug:'qa-synthetic',session_id:'session-id',occurred_at:stamp,
    metadata:{clinic_event_id:'event-id',counted_as:'included'}}];
  after['public.rcap_record_events']=[{id:'audit-id',event_type:'partner_packet_credit_consumed',partner_slug:'qa-synthetic',metadata:{briefcase_item_id:'item-id',session_id:'session-id',clinic_event_id:'event-id',counted_as:'included'}}];
  return {before,after,program:'qa-synthetic',partnerId:'program-id',actorIds:new Set(['owner-id']),
    knownIds:new Set(['item-id','session-id','event-id']),allocationIds:new Set(['temporary-allocation'])};
}
test('unchanged allowance needs no compensation',()=>{
  const x=input();x.after=structuredClone(x.before);assert.equal(sponsoredCounterRestoration(x),null);
});
test('exact run-owned finalization/accounting permits only its captured one-credit compensation',()=>{
  const x=input(),snapshot=JSON.stringify(x),plan=sponsoredCounterRestoration(x);
  assert.equal(plan.delta,1);assert.equal(plan.table,'public.partner_entitlement');
  assert.deepEqual(plan.before,x.before[plan.table][0]);assert.deepEqual(plan.after,x.after[plan.table][0]);
  assert.match(plan.proofSha256,/^[a-f0-9]{64}$/);assert.equal(JSON.stringify(x),snapshot,'Planning cannot mutate a baseline');
});
for(const [name,change,reason] of [
  ['unattributed counter increment',x=>x.after['public.partner_entitlement'][0].screenings_used++,/one new run-owned finalized artifact/],
  ['too many credits',x=>x.after['public.partner_entitlement'][0].screenings_used=8,/four-packet/],
  ['changed financial terms',x=>x.after['public.partner_entitlement'][0].screenings_allowed++,/other changed program fields/],
  ['any overage',x=>x.after['public.partner_entitlement'][0].overage_packets++,/other changed program fields/],
  ['external counter timestamp',x=>x.after['public.partner_entitlement'][0].updated_at='2026-10-13T21:00:01+00:00',/unexplained program update/],
  ['unrelated participant',x=>x.actorIds.clear(),/one new run-owned finalized artifact/],
  ['unrelated program job',x=>x.after['public.packet_render_jobs'][0].partner_id='different',/Exact new run-owned/],
  ['pre-existing render job',x=>x.before['public.packet_render_jobs']=structuredClone(x.after['public.packet_render_jobs']),/Exact new run-owned/],
  ['unfinalized job',x=>x.after['public.packet_render_jobs'][0].status='queued',/Exact new run-owned/],
  ['wrong verification',x=>x.after['public.packet_render_jobs'][0].sponsored_verification_hash='c'.repeat(64),/Exact new run-owned/],
  ['unrelated event',x=>x.knownIds.delete('event-id'),/Exact new run-owned/],
  ['existing allocation',x=>x.allocationIds.clear(),/run-created simulated allocation/],
  ['pre-existing credit',x=>x.before['public.packet_credit_ledger']=structuredClone(x.after['public.packet_credit_ledger']),/run-created simulated allocation/],
  ['missing finalizer audit',x=>x.after['public.rcap_record_events']=[],/audit receipt/],
  ['duplicate analytics',x=>x.after['public.rcap_screening_analytics_events'].push({...x.after['public.rcap_screening_analytics_events'][0],id:'duplicate'}),/analytics/],
  ['missing baseline allowance',x=>x.before['public.partner_entitlement']=[],/Exactly one existing/],
  ['missing existing allowance',x=>x.after['public.partner_entitlement']=[],/must remain present/]
])test(`compensation refuses ${name}`,()=>{const x=input();change(x);assert.throws(()=>sponsoredCounterRestoration(x),reason);});
