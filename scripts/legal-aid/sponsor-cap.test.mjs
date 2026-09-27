import assert from 'node:assert/strict';
import test from 'node:test';
import { randomUUID } from 'node:crypto';
import { createFundingFixture, IL_ROUTE } from './sponsor-funding-fixture.mjs';
import { buildPaymentAdapter, eligibleItem, loadTsWithMocks } from '../test-expungement-checkout-guards.mjs';
// These deterministic boundaries isolate payment dispatch from hosted release
// observations; they do not assert a route is approved to sell. The production
// admission call still executes and must receive the same verified route.
const admissionCalls=[];
const dispatchMocks={
 '@/lib/expungement-ai/packet-fulfillment-authority':{assertPacketFulfillmentProven:()=>{},packetFulfillmentAuthority:()=>({allowed:true})},
 '@/lib/rcap/render/commercial-admission':{
  governCommercialAdmission:(point,identity,context)=>admissionCalls.push({point,identity,context}),
  governSponsoredEntitlement:(identity,context)=>admissionCalls.push({point:'sponsored_entitlement',identity,context}),
  governPacketCreditAdmission:(identity,context)=>admissionCalls.push({point:'packet_credit_admission',identity,context}),
  commercialRouteIdentity:({jurisdiction,pathwayId})=>({routeId:`${jurisdiction}:${pathwayId}`,packetFamilyId:'il-prostitution-j-vacate-set'}),
  fulfillmentRequestContext:x=>x,finalVerificationSnapshotFrom:x=>x
 },
 '@/lib/expungement-ai/render-preflight':{renderPreflight:async()=>({ok:true}),readyToPurchase:()=>({ready:true})},
 '@/lib/expungement-ai/ready-to-purchase':{readyToPurchase:()=>({ready:true})}
};
const q=v=>v==null?'null':"'"+String(v).replaceAll("'","''")+"'";

test('Clinic / Legal Aid funding: final slot, same matter, exact owner and unchanged intake', async t => {
 const f=createFundingFixture(), {db}=f;
 try {
  const allocate=p=>`select row_to_json(f) from allocate_clinic_packet_funding(${q(p.itemId)},${q(p.userId)},${q(p.verificationHash)}) f`;
  const choice=p=>db.json(allocate(p));
  const dtc=p=>db.scalar(`select clinic_packet_dtc_authorized(${q(p.itemId)},${q(p.userId)})`)==='t';
  const snapshot=p=>db.json(`select jsonb_build_object('item',to_jsonb(i),'source',to_jsonb(s),'verification',to_jsonb(v),'case',to_jsonb(c)) from consumer_briefcase_items i join consumer_pending_screening_results s on s.pending_id=i.source_pending_result_id join consumer_packet_verifications v on v.briefcase_item_id=i.id join clinic_cases c on c.matter_id=i.id where i.id=${q(p.itemId)}`);
  await t.test('entry capacity is read-only and exact event/partner scoped',()=>{
   assert.equal(db.scalar(`select clinic_entry_sponsor_capacity(${q(f.eventId)},'il-clinic-sponsor')`),'t');
   assert.match(db.sqlExpectError(`select clinic_entry_sponsor_capacity(${q(f.eventId)},'wrong-partner')`),/invalid_event_scope/);
   assert.equal(db.scalar('select count(*) from clinic_packet_funding'),'0');
  });
  const a=f.seedParticipant(), b=f.seedParticipant();
  const original=[snapshot(a),snapshot(b)];
  const results=await Promise.all([db.sqlAsync(allocate(a)),db.sqlAsync(allocate(b))]);
  assert.ok(results.every(r=>r.ok),JSON.stringify(results));
  const modes=results.map(r=>JSON.parse(r.out).funding_mode);
  assert.deepEqual([...modes].sort(),['dtc','sponsored']);
  const winner=modes[0]==='sponsored'?a:b, loser=modes[0]==='dtc'?a:b;
  await t.test('reservation race leaves one winner and one DTC choice; no duplicate matter, entitlement or repeated intake',()=>{
   assert.equal(db.scalar(`select clinic_entry_sponsor_capacity(${q(f.eventId)},'il-clinic-sponsor')`),'f');
   assert.deepEqual([snapshot(a),snapshot(b)],original);
   assert.equal(db.scalar('select count(*) from consumer_briefcase_items'),'2');
   assert.equal(db.scalar("select count(*) from clinic_packet_funding where funding_mode='sponsored'"),'1');
   assert.equal(db.scalar('select count(*) from clinic_packet_funding'),'2');
   assert.equal(db.scalar('select sum(screenings_used) from partner_entitlement'),'0');
   assert.equal(db.scalar('select count(*) from packet_credit_ledger'),'0');
   assert.equal(db.scalar('select count(*) from packet_render_jobs'),'0');
   assert.equal(choice(winner).funding_mode,'sponsored');assert.equal(choice(loser).funding_mode,'dtc');
   assert.equal(db.scalar('select count(*) from clinic_packet_funding'),'2');
  });
  await t.test('O-2 funding survives generation delay and capacity refill without oscillation',()=>{
   const before=db.scalar('select jsonb_agg(to_jsonb(f) order by briefcase_item_id) from clinic_packet_funding f');
   db.sql(`update clinic_events set sponsorship_allocation=20 where id=${q(f.eventId)}; update partner_entitlement set screenings_allowed=20; update partner_packet_entitlement set packet_cap=20`);
   assert.equal(choice(winner).funding_mode,'sponsored');assert.equal(choice(loser).funding_mode,'dtc');
   assert.equal(db.scalar('select jsonb_agg(to_jsonb(f) order by briefcase_item_id) from clinic_packet_funding f'),before);
   assert.equal(db.scalar('select count(*) from packet_credit_ledger'),'0');
   db.sql(`update clinic_events set sponsorship_allocation=1 where id=${q(f.eventId)}; update partner_entitlement set screenings_allowed=1; update partner_packet_entitlement set packet_cap=1`);
  });
  await t.test('COM-02 committed SPONSORED choice survives a later real typed admission refusal unchanged',async()=>{
   const before=db.scalar(`select row_to_json(f) from clinic_packet_funding f where briefcase_item_id=${q(winner.itemId)}`);
   const {CommercialAdmissionDeniedError}=loadTsWithMocks('src/lib/rcap/render/commercial-admission.ts',{});
   const error=new CommercialAdmissionDeniedError({admissionPoint:'packet_credit_admission',denialCode:'fulfillment_stale',reason:'stale publication',contextDenials:[]});
   let writes=0;
   const lifecycle=loadTsWithMocks('src/lib/expungement-ai/rcap-slot-lifecycle.ts',{
    '@/lib/rcap/render/commercial-admission':{governPacketCreditAdmission:()=>{throw error;}},
    '@/lib/supabase/server':{getSupabaseAdminClient:()=>{writes++;throw Error('refusal must precede writes');}}
   });
   await assert.rejects(lifecycle.finalizeSponsoredPacketGeneration({sessionId:winner.sessionId,briefcaseItemId:winner.itemId,admission:{identity:{routeId:IL_ROUTE},context:{}}}),e=>e===error&&e.denialCode==='fulfillment_stale');
   assert.equal(writes,0);assert.equal(choice(winner).funding_mode,'sponsored');
   assert.equal(db.scalar(`select row_to_json(f) from clinic_packet_funding f where briefcase_item_id=${q(winner.itemId)}`),before);
   assert.equal(db.scalar('select count(*) from clinic_packet_funding'),'2');assert.equal(db.scalar('select count(*) from packet_render_jobs'),'0');
  });
  await t.test('available sponsorship refuses Stripe creation even if caller invokes payment adapter directly', async()=>{
   const h=buildPaymentAdapter({sponsoredCheck:async()=>!dtc(winner)});
   await assert.rejects(h.adapter.createConsumerPacketCheckout({userId:winner.userId,item:eligibleItem({id:winner.itemId})}), /not allowed/i);
   assert.equal(h.createCalls.length,0);assert.equal(h.retrieveCalls.length,0);
  });
  await t.test('cap loser is offered ordinary price on same owner/matter; no sponsored enqueue before payment', async()=>{
   assert.equal(dtc(loser),true);assert.equal(dtc(winner),false);
   assert.match(db.sqlExpectError(f.enqueueSql(loser,f.renderPayload(loser))),/sponsor_capacity_requires_dtc/);
   const h=buildPaymentAdapter({sponsoredCheck:async()=>!dtc(loser),matterId:loser.matterId,verificationSnapshotOverrides:loser.snapshot,dependencyMocks:dispatchMocks});
   const checkout=await h.adapter.createConsumerPacketCheckout({userId:loser.userId,item:eligibleItem({id:loser.itemId})});
   assert.equal(checkout.briefcaseItemId,loser.itemId);assert.equal(checkout.amountCents,5000);
   assert.equal(h.createCalls.length,1);
   assert.equal(admissionCalls.at(-1).identity.routeId,IL_ROUTE);
   assert.equal(admissionCalls.at(-1).identity.packetFamilyId,'il-prostitution-j-vacate-set');
   assert.equal(h.createCalls[0].params.metadata.briefcase_item_id,loser.itemId);
   assert.deepEqual(snapshot(loser),original[modes.indexOf('dtc')]);
  });
  const consumerEnqueue=(p,r)=>`select id from enqueue_verified_consumer_packet_render(${q(r.packetId)},${q(IL_ROUTE)},'packet_document_v1','1.0.0',null,'IL','2026-06-19-source-conversion-1',${q(r.inputHash)},${q(p.itemId)},${q(p.personId)},${q(p.matterId)},5,${q(p.itemId)},${q(p.userId)},${q(p.verificationHash)},${q(JSON.stringify(r.packet))}::jsonb,${q(JSON.stringify(r.payload))}::jsonb)`;
  const loserRender=f.renderPayload(loser);
  await t.test('DTC choice is not entitlement: real consumer enqueue refuses until verified provider payment',()=>{
   assert.match(db.sqlExpectError(consumerEnqueue(loser,loserRender)),/consumer render entitlement missing/);
   assert.equal(db.scalar('select count(*) from packet_render_jobs'),'0');
  });
  const payment=p=>`select outcome from record_consumer_packet_payment(${q(p.itemId)},'paid',5000,5000,0,'usd','stripe',${q('evt_'+p.itemId)},${q('cs_'+p.itemId)},${q('pi_'+p.itemId)},null,'server_webhook','synthetic signed-provider boundary','expungement_packet',${q(p.personId)},${q(p.matterId)})`;
  const bind=p=>db.json(`select row_to_json(b) from bind_consumer_checkout_verification(${q(p.userId)},${q(p.itemId)},${q('cs_'+p.itemId)},'stripe','expungement_packet',${q(p.personId)},${q(p.matterId)},${q(p.verificationHash)}) b`);
  await t.test('sponsored reservation reaches existing atomic finalizer once, reuse is read-only',async()=>{
   const r=f.renderPayload(winner), job=db.scalar(f.enqueueSql(winner,r));
   // Claim exactly this job, independently of the pending DTC job.
   const claim=db.json(`select row_to_json(j) from claim_packet_render_job('cap-test',null,60) j`);
   assert.equal(claim.id,job);
   assert.equal(db.scalar(`select start_packet_render(${q(job)},${q(claim.fencing_token)})`),'t');
   assert.equal(db.scalar(`select start_packet_validation(${q(job)},${q(claim.fencing_token)})`),'t');
   const digest='c'.repeat(64);
   const output=db.json(`select row_to_json(r) from finalize_packet_render_job(${q(job)},${q(claim.fencing_token)},${q(job+'/'+digest+'.pdf')},${q(digest)},${q(digest)},${q(digest)},${q(digest)},100,2,'sha256:synthetic-test') r`);
   assert.equal(output.accounting_result,'consumed');
   const artifact=f.artifactFor(winner,digest);
   const finalizeSql=`select recorded from finalize_sponsored_packet_generation_for_route(${q(IL_ROUTE)},${q(winner.sessionId)},${q(winner.itemId)},${q(winner.verificationHash)},${q(JSON.stringify(artifact))}::jsonb,${q(job)})`;
   const completed=await Promise.all([db.sqlAsync(finalizeSql),db.sqlAsync(finalizeSql)]);
   assert.ok(completed.every(r=>r.ok),JSON.stringify(completed));
   assert.deepEqual(completed.map(r=>r.out).sort(),['f','t']);
   assert.equal(db.scalar('select sum(screenings_used) from partner_entitlement'),'1');
   assert.equal(db.scalar("select count(*) from packet_credit_ledger where event_type='consumed'"),'1');
   assert.equal(db.scalar("select count(*) from consumer_packet_artifact_provenance where entitlement_source='partner_sponsorship'"),'1');
   const before=db.scalar(`select row_to_json(f) from clinic_packet_funding f where briefcase_item_id=${q(winner.itemId)}`);
   assert.equal(choice(winner).funding_mode,'sponsored');
   assert.equal(db.scalar(`select row_to_json(f) from clinic_packet_funding f where briefcase_item_id=${q(winner.itemId)}`),before);
  });
  await t.test('canceled/failed payment leaves same verified matter unpaid and allows ordinary checkout retry',async()=>{
   assert.equal(bind(loser).ok,true);
   assert.equal(db.scalar(payment(loser).replace("'paid',5000","'unpaid',5000")),'recorded_unpaid');
   assert.match(db.sqlExpectError(consumerEnqueue(loser,loserRender)),/consumer render entitlement missing/);
   assert.equal(dtc(loser),true);
   const state=snapshot(loser),prior=original[modes.indexOf('dtc')];
   assert.equal(state.item.id,prior.item.id);assert.deepEqual(state.source,prior.source);assert.deepEqual(state.verification,prior.verification);
   const h=buildPaymentAdapter({sponsoredCheck:async()=>!dtc(loser),matterId:loser.matterId,verificationSnapshotOverrides:loser.snapshot,dependencyMocks:dispatchMocks,
    retrievedSession:{id:'cs_canceled',mode:'payment',status:'expired',payment_status:'unpaid',url:null}});
   await h.adapter.createConsumerPacketCheckout({userId:loser.userId,item:eligibleItem({id:loser.itemId,checkoutSessionId:'cs_canceled'})});
   assert.equal(h.createCalls.length,1);assert.equal(h.createCalls[0].params.metadata.briefcase_item_id,loser.itemId);
   assert.equal(db.scalar('select sum(screenings_used) from partner_entitlement'),'1');
   assert.equal(db.scalar(`select count(*) from consumer_packet_artifact_provenance where briefcase_item_id=${q(loser.itemId)}`),'0');
  });
  await t.test('same-matter Stripe completion admits DTC only; sponsored winner cannot be marked paid',()=>{
   assert.equal(bind(loser).ok,true);
   assert.equal(db.scalar(payment(loser)),'recorded_paid');
   assert.equal(db.scalar(payment(loser)),'already_paid');
   // Bind a malicious server request to the still-sponsored item: the protected
   // payment writer must still reject it even if HTTP protection is skipped.
   assert.equal(bind(winner).ok,true);
   assert.equal(db.scalar(payment(winner)),'sponsored_item');
   const now=snapshot(loser), before=original[modes.indexOf('dtc')];
   assert.deepEqual(now.source,before.source);assert.deepEqual(now.verification,before.verification);assert.deepEqual(now.case,before.case);
   assert.equal(now.item.id,before.item.id);assert.equal(now.item.user_id,before.item.user_id);
   const job=db.scalar(consumerEnqueue(loser,loserRender));
   assert.equal(db.scalar(consumerEnqueue(loser,loserRender)),job);
   assert.equal(db.scalar(`select count(*) from packet_render_jobs where consumer_briefcase_item_id=${q(loser.itemId)}`),'1');
   const claim=db.json(`select row_to_json(j) from claim_packet_render_job('cap-dtc-test',null,60) j`);
   assert.equal(claim.id,job);
   assert.equal(db.scalar(`select start_packet_render(${q(job)},${q(claim.fencing_token)})`),'t');
   assert.equal(db.scalar(`select start_packet_validation(${q(job)},${q(claim.fencing_token)})`),'t');
   const digest='d'.repeat(64);
   const finished=db.json(`select row_to_json(r) from finalize_packet_render_job(${q(job)},${q(claim.fencing_token)},${q(job+'/'+digest+'.pdf')},${q(digest)},${q(digest)},${q(digest)},${q(digest)},100,2,'sha256:synthetic-test') r`);
   assert.notEqual(finished.accounting_result,'blocked_cap');
   assert.equal(db.scalar('select sum(screenings_used) from partner_entitlement'),'1');
   assert.equal(db.scalar("select count(*) from packet_credit_ledger where event_type in ('consumed','overage_consumed')"),'1','DTC completion never consumes another sponsor credit');
   assert.equal(db.scalar(`select count(*) from packet_render_jobs where status='blocked'`),'0');

  });
  await t.test('wrong participant, sponsor, event and track refuse without creating a financial choice',()=>{
   const badOwner=f.seedParticipant();assert.equal(choice({...badOwner,userId:randomUUID()}).funding_mode,'denied');
   for(const options of [{partnerSlug:'wrong-partner'},{event:f.otherEventId},{caseEvent:f.otherEventId},{track:'il-prostitution-j-auto'}]){
    const p=f.seedParticipant(options);assert.equal(choice(p).funding_mode,'denied');assert.equal(dtc(p),false);
   }
   assert.equal(db.scalar('select count(*) from clinic_packet_funding'),'2');
   assert.equal(dtc({...loser,userId:randomUUID()}),false);
  });
  await t.test('zero allocation transitions, but inactive sponsor / missing authority never impersonates exhaustion',()=>{
   db.sql(`update clinic_events set sponsorship_allocation=0 where id=${q(f.eventId)}`);
   const p=f.seedParticipant();assert.equal(choice(p).funding_mode,'dtc');
   const inactive=f.seedParticipant({benefit:false});assert.equal(choice(inactive).funding_mode,'denied');
   db.sql(`update clinic_events set sponsorship_allocation=1 where id=${q(f.eventId)}`);
  });
  await t.test('two events competing for final partner capacity cannot overbook or switch source tenants',async()=>{
   const secondEvent=randomUUID();
   db.sql(`update clinic_events set sponsorship_allocation=2 where id=${q(f.eventId)};
     update partner_entitlement set screenings_allowed=2,overage_enabled=true,pause_at_cap=false;
     update partner_packet_entitlement set packet_cap=2,overage_enabled=true,overage_cap=10;
     insert into clinic_events(id,partner_slug,name,jurisdiction,status,sponsorship_allocation) values
       (${q(secondEvent)},'il-clinic-sponsor','Synthetic Legal Aid event','IL','published',2)`);
   const x=f.seedParticipant(),y=f.seedParticipant({event:secondEvent});
   const results=await Promise.all([db.sqlAsync(allocate(x)),db.sqlAsync(allocate(y))]);
   assert.ok(results.every(r=>r.ok),JSON.stringify(results));
   const choices=results.map(r=>JSON.parse(r.out));
   assert.deepEqual(choices.map(r=>r.funding_mode).sort(),['dtc','sponsored']);
   assert.equal(choices.find(r=>r.funding_mode==='dtc').reason,'partner_cap_exhausted');
   assert.equal(db.scalar("select count(*) from clinic_packet_funding where funding_mode='sponsored'"),'2');
   assert.equal(db.scalar('select sum(overage_packets) from partner_entitlement'),'0');
  });
  await t.test('already-delivered Applicant-A shape is reused without a new reservation or counter write',()=>{
   // Synthetic delivered row predating the new table: the real historical
   // Applicant A packet and its six events are never opened by this suite.
   db.sql(`delete from clinic_packet_funding where briefcase_item_id=${q(winner.itemId)}`);
   const counts=db.scalar("select count(*)||':'||(select sum(screenings_used) from partner_entitlement) from clinic_packet_funding");
   const result=choice(winner);assert.equal(result.funding_mode,'sponsored');assert.equal(result.reason,'already_consumed');
   assert.equal(db.scalar("select count(*)||':'||(select sum(screenings_used) from partner_entitlement) from clinic_packet_funding"),counts);
  });
  await t.test('browser roles cannot forge financial choice or execute allocation',()=>{
   for(const role of ['anon','authenticated']){
    assert.equal(db.scalar(`select has_table_privilege('${role}','clinic_packet_funding','INSERT')`),'f');
    assert.equal(db.scalar(`select has_function_privilege('${role}','allocate_clinic_packet_funding(uuid,uuid,text)','EXECUTE')`),'f');
   }
  });
 } finally {db.stop();}
});
