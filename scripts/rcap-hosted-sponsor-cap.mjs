#!/usr/bin/env node
// Existing authenticated packet endpoint + read-only protected state. No seed,
// migration, quota change, new acquisition token, or alternative payment path.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { RESUME } from './rcap-clinic-resume-contract.mjs';
import { observeFunding, assertFinalSlot, assertContinuity, assertAccounting, stripeScheduled, assertOneRemainingSlot, assertSynthetic, assertSponsoredGenerated } from './rcap-sponsored-funding-contract.mjs';
const UUID = /^[a-f0-9-]{36}$/;
export function snapshotQuery(itemId) {
  assert.match(itemId, UUID); assert.notEqual(itemId, RESUME.item);
  return `begin transaction read only;
with i as (select * from public.consumer_briefcase_items where id='${itemId}'),
s as (select s.* from public.consumer_pending_screening_results s join i on s.pending_id=i.source_pending_result_id and s.claimed_user_id=i.user_id and s.claimed_matter_id=i.id),
v as (select v.* from public.consumer_packet_verifications v join i on i.id=v.briefcase_item_id and i.user_id=v.consumer_auth_user_id),
f as (select f.* from public.clinic_packet_funding f join i on i.id=f.briefcase_item_id and i.user_id=f.consumer_auth_user_id),
l as (select l.* from public.packet_credit_ledger l join v on v.matter_id=l.matter_id)
select jsonb_build_object(
'item',(select jsonb_build_object('id',id,'user_id',user_id,'source_session_id',source_session_id,'source_pending_result_id',source_pending_result_id,'jurisdiction',jurisdiction,'pathway_label',pathway_label,'artifact_refs_json',jsonb_build_object('attribution',artifact_refs_json->'attribution')) from i),
'source',(select jsonb_build_object('pending_id',pending_id,'claimed_user_id',claimed_user_id,'claimed_matter_id',claimed_matter_id,'anonymous_session_id',anonymous_session_id,'product',product,'partner_slug',partner_slug,'event_id',event_id,'status',status) from s),
'verification',(select jsonb_build_object('briefcase_item_id',briefcase_item_id,'consumer_auth_user_id',consumer_auth_user_id,'matter_id',matter_id,'status',status,'verification_hash',verification_hash,'snapshot',jsonb_build_object('jurisdiction',verification_snapshot->'jurisdiction','pathwayId',verification_snapshot->'pathwayId','selectedTrackId',verification_snapshot->'selectedTrackId','profileVersion',verification_snapshot->'profileVersion')) from v),
'funding',(select coalesce(jsonb_agg(to_jsonb(f)),'[]') from f),
'matterCount',(select count(*) from i),
'sponsoredEntitlements',(select count(*) from f where funding_mode='sponsored'),
'sponsoredConsumed',(select count(*) from l where event_type='consumed'),
'sponsoredProvenance',(select coalesce(jsonb_agg(jsonb_build_object('briefcase_item_id',p.briefcase_item_id,'consumer_auth_user_id',p.consumer_auth_user_id,'matter_id',p.matter_id,'verification_hash',p.verification_hash,'render_job_id',p.render_job_id,'entitlement_source',p.entitlement_source)),'[]') from public.consumer_packet_artifact_provenance p join i on p.briefcase_item_id=i.id where p.entitlement_source='partner_sponsorship'),
'overageConsumed',(select count(*) from l where event_type='overage_consumed'),
'checkoutSessions',(select count(*) from i where checkout_session_id is not null),
'paymentCount',(select count(*) from i where payment_status='paid' and payment_authority='server_webhook' and provider_event_id is not null),
'dtcEntitlements',(select count(*) from i cross join lateral public.consumer_packet_payment_authority(i.id,i.user_id) a where a.valid),
'orphanJobs',(select count(*) from public.packet_render_jobs j join v on j.matter_id=v.matter_id where coalesce(j.consumer_briefcase_item_id,j.sponsored_consumer_briefcase_item_id) is distinct from v.briefcase_item_id)
) as evidence; commit;`;
}
// Read the same reservation/consumption authorities as A's allocation function.
// This observes fixture readiness; only generate + protected choice decides funding.
export function capacityQuery(item) {
  assert.match(item,UUID);assert.notEqual(item,RESUME.item);
  return `begin transaction read only;
with e as (select e.* from public.clinic_events e join public.clinic_cases c on c.event_id=e.id
 join public.consumer_briefcase_items i on i.id=c.matter_id and i.user_id=c.participant_user_id where i.id='${item}'),
p as (select p.* from public.partner_entitlement p join e on p.partner_slug=e.partner_slug),
pe as (select pe.* from public.partner_packet_entitlement pe join public.partner_records partner on partner.id=pe.partner_id
 join e on e.partner_slug=partner.partner_slug where pe.effective_at<=now() and (pe.expires_at is null or pe.expires_at>now()) order by pe.effective_at desc limit 1)
select jsonb_build_object('event',e.id,'partner',e.partner_slug,'packetEntitlement',pe.id,
'eventRemaining',e.sponsorship_allocation-(select count(*) from (
 select pr.briefcase_item_id from public.consumer_packet_artifact_provenance pr join public.clinic_cases c on c.matter_id=pr.briefcase_item_id where c.event_id=e.id and pr.entitlement_source='partner_sponsorship'
 union select f.briefcase_item_id from public.clinic_packet_funding f where f.event_id=e.id and f.funding_mode='sponsored') u),
'partnerRemaining',p.screenings_allowed-p.screenings_used-(select count(*) from public.clinic_packet_funding f where f.partner_slug=e.partner_slug and f.funding_mode='sponsored' and not exists(select 1 from public.consumer_packet_artifact_provenance pr where pr.briefcase_item_id=f.briefcase_item_id and pr.entitlement_source='partner_sponsorship')),
'packetRemaining',pe.packet_cap-(select count(*) from (
 select l.matter_id from public.packet_credit_ledger l where l.entitlement_id=pe.id and l.event_type in ('consumed','overage_consumed')
 union select public.consumer_matter_id_for_briefcase_item(f.briefcase_item_id) from public.clinic_packet_funding f where f.packet_entitlement_id=pe.id and f.funding_mode='sponsored') u)) as evidence
from e cross join p cross join pe; commit;`;
}
export function runContext(env = process.env) {
  assert.match(env.HOSTED_APPLICATION_SHA ?? '', /^[a-f0-9]{40}$/);
  assert.equal(env.ACCEPTANCE_SUPABASE_PROJECT_REF, RESUME.project);
  assert.match(env.HOSTED_PREVIEW_DEPLOYMENT_ID ?? '', /^dpl_[A-Za-z0-9]+$/);
  assert.match(env.HOSTED_PREVIEW_HOSTNAME ?? '', /^[A-Za-z0-9.-]+\.vercel\.app$/);
  return { applicationSha: env.HOSTED_APPLICATION_SHA, project: RESUME.project,
    deploymentId: env.HOSTED_PREVIEW_DEPLOYMENT_ID, hostname: env.HOSTED_PREVIEW_HOSTNAME,
    runId: env.GITHUB_RUN_ID ?? 'local', runAttempt: env.GITHUB_RUN_ATTEMPT ?? '1' };
}
export async function capTransport(env = process.env, fetchImpl = fetch) {
  const context = runContext(env);
  const api = async (suffix, options = {}) => {
    const r = await fetchImpl(`https://api.supabase.com/v1/projects/${context.project}${suffix}`, {
      ...options, headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, 'Content-Type': 'application/json' }, redirect: 'error' });
    assert.ok(r.ok, `management read refused HTTP ${r.status}`); return r.json();
  };
  const sql = async query => {
    assert.match(query.toLowerCase(), /begin transaction read only/);
    return api('/database/query', { method: 'POST', body: JSON.stringify({query}) });
  };
  const read = async item => {
    const rows = await sql(snapshotQuery(item));
    assert.equal(rows.length,1); return rows[0].evidence;
  };
  const keys = await api('/api-keys?reveal=true');
  const anon = keys.find(k=>k.name==='anon')?.api_key;
  const sessions = new Map();
  const authenticate = async item => {
    const state = await read(item);assertSynthetic(state);
    const owner=state.item?.user_id; assert.match(owner ?? '',UUID);
    const rows=await sql(`begin transaction read only; select email from auth.users where id='${owner}'; commit;`);
    assert.equal(rows.length,1); const email=rows[0].email;
    assert.ok(email.endsWith('@rcap-acceptance.test'),'existing synthetic identity only');
    const res=await fetchImpl(`https://${context.project}.supabase.co/auth/v1/token?grant_type=password`,{
      method:'POST',headers:{apikey:anon,'Content-Type':'application/json'},
      body:JSON.stringify({email,password:env.HOSTED_CLINIC_DEMO_PASSWORD}),redirect:'error'});
    assert.ok(res.ok,`synthetic sign-in refused HTTP ${res.status}`);
    const session=await res.json(); assert.equal(session.user?.id,owner);
    const cookieValue=`base64-${Buffer.from(JSON.stringify(session)).toString('base64')}`;
    const chunks=[];for(let i=0;i<cookieValue.length;i+=3180)chunks.push(cookieValue.slice(i,i+3180));
    const cookie=chunks.map((s,i)=>`sb-${context.project}-auth-token${chunks.length>1?'.'+i:''}=${s}`).join('; ');
    sessions.set(item,{email,cookie,owner}); return sessions.get(item);
  };
  const generate = async item => {
    const auth=sessions.get(item) ?? await authenticate(item);
    const response=await fetchImpl(`https://${context.hostname}/api/expungement-ai/packet/generate`,{
      method:'POST',headers:{'Content-Type':'application/json',Cookie:auth.cookie,'x-vercel-protection-bypass':env.VERCEL_AUTOMATION_BYPASS_SECRET ?? ''},
      body:JSON.stringify({briefcaseItemId:item}),redirect:'error'});
    const body=await response.json();
    return {status:response.status,json:{outcome:body.outcome,checkoutRequired:body.checkoutRequired,resultCode:body.resultCode,packetStatus:body.packetStatus}};
  };
  return {context,read,generate,authenticate,capacity:async item=>{const rows=await sql(capacityQuery(item));assert.equal(rows.length,1);return rows[0].evidence;}};
}
export async function main(mode, env = process.env) {
  assert.ok(['observe','payment','accounting','generated'].includes(mode));
  const out=path.resolve('hosted-acceptance-evidence/sponsor-cap');fs.mkdirSync(out,{recursive:true});
  const t=await capTransport(env);
  const evidencePath=path.join(out,'outcome.json');
  if(mode==='observe'){
    assert.ok(!fs.existsSync(evidencePath),'never overwrite/replay a funding decision');
    const itemIds=JSON.parse(env.HOSTED_SPONSOR_ITEMS ?? '[]');
    assert.ok(['sponsored','exhausted','final_slot'].includes(env.HOSTED_SPONSOR_CASE));
    assert.equal(itemIds.length,env.HOSTED_SPONSOR_CASE==='final_slot'?2:1);
    await Promise.all(itemIds.map(t.authenticate));
    const capacity=env.HOSTED_SPONSOR_CASE==='final_slot'?await Promise.all(itemIds.map(t.capacity)):[];
    if(capacity.length)assertOneRemainingSlot(capacity);
    const observations=await observeFunding({itemIds,read:t.read,generate:t.generate,persist:native=>fs.writeFileSync(path.join(out,'native-observations.json'),JSON.stringify({...t.context,capacity,observations:native},null,2),{flag:'wx',mode:0o600})});
    if(env.HOSTED_SPONSOR_CASE==='final_slot') assertFinalSlot(observations);
    else assert.equal(stripeScheduled(observations[0].outcome),env.HOSTED_SPONSOR_CASE==='exhausted');
    const dtc=observations.some(o=>stripeScheduled(o.outcome));
    const evidence={status:'PASS',...t.context,case:env.HOSTED_SPONSOR_CASE,capacity,observations,dtc};
    fs.writeFileSync(evidencePath,JSON.stringify(evidence,null,2),{flag:'wx',mode:0o600});
    if(env.GITHUB_OUTPUT) fs.appendFileSync(env.GITHUB_OUTPUT,`dtc=${dtc}\n`);
    return;
  }
  const evidence=JSON.parse(fs.readFileSync(evidencePath,'utf8'));
  for(const [k,v] of Object.entries(t.context))assert.equal(evidence[k],v,`source/target context ${k}`);
  assert.equal(evidence.status,'PASS');
  if(mode==='generated')assert.ok(evidence.observations.some(o=>o.outcome==='slot_reserved'),'generated proof requires a sponsored matter');
  if(mode==='payment'){
    const losers=evidence.observations.filter(o=>stripeScheduled(o.outcome));assert.equal(losers.length,1);
    const o=losers[0], item=o.before.item.id;
    const current=await t.read(item);assertContinuity(o.after,current);assertAccounting(o.outcome,current);
    const auth=await t.authenticate(item);
    const handoff=path.join(out,'payment-input.json');
    fs.writeFileSync(handoff,JSON.stringify({...t.context,observation:o,email:auth.email}),{mode:0o600,flag:'wx'});
    const result=spawnSync(process.execPath,['scripts/rcap-hosted-acceptance-payment.mjs'],{
      env:{...env,HOSTED_CAP_PAYMENT_INPUT:handoff,HOSTED_STRIPE_PROMOTION_CODE:'',HOSTED_STRIPE_EXPECTED_TOTAL_CENTS:'5000'},stdio:'inherit'});
    assert.equal(result.status,0,'existing DTC payment journey refused; no automatic retry');
    const payment=JSON.parse(fs.readFileSync('hosted-acceptance-evidence/payment.json','utf8'));
    assert.equal(payment.passed,true);
    fs.writeFileSync(path.join(out,'payment.json'),JSON.stringify({status:'PASS',...t.context,item,paymentEvidence:'payment.json'}));
  } else {
    const after=[];
    for(const o of evidence.observations){
      const now=await t.read(o.before.item.id);assertContinuity(o.after,now);
      assertAccounting(o.outcome,now,{paid:stripeScheduled(o.outcome)});
      if(mode==='generated' && o.outcome==='slot_reserved')assertSponsoredGenerated(now);
      after.push(now);
    }
    fs.writeFileSync(path.join(out,mode==='generated'?'generated.json':'accounting.json'),JSON.stringify({status:'PASS',boundary:mode==='generated'?'fulfilled':'reservation',...t.context,after},null,2),{flag:'wx'});
  }
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href)main(process.argv[2]).catch(e=>{console.error(e.message);process.exitCode=1;});
