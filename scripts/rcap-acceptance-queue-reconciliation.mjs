#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { ACCEPTANCE_PROJECT, requireAcceptance } from './rcap-acceptance-fixture-retention.mjs';

export const HISTORICAL = Object.freeze([
  { id:'14c626c2-d287-4d5f-8fef-172fec8e52b9', packet:'eb6e033d-771d-44ba-8055-89243570ad9e', matter:'e214c6fc-3ad8-4e63-a747-50cadf497046', item:'0dcbb137-fd86-4596-82ff-3f9744d44c6c', attempts:3 },
  { id:'e5357bcb-0fb0-45ab-a68e-8ca4eadc6b7d', packet:'fb3fb0df-6fef-4abe-a1f1-6462543c06a4', matter:'56d8927d-09e1-4a1e-8cbd-121023ee6b01', item:'6f163c13-6255-4673-8299-7fd9541da761', attempts:2 }
]);
export const CLINIC = Object.freeze({ id:'dd68fa69-c28b-4867-ac44-d538d83c1162',
  packet:'42f7e1e1-c0c1-44f3-871b-2434705986b8', matter:'db1e9b15-3200-472d-a9f4-f290ad20e4b8',
  item:'8e606570-5d90-4c7b-b554-152be4d14a67', user:'e7c1d76e-dcf2-4d41-b585-ba164806f391',
  session:'a0b919e5-1977-4416-8ab5-f6ed4f239d9c', event:'77000000-0000-4000-8000-000000000055' });
export const AUTHORIZATION = 'Roger:acceptance-queue:36186574507:retire-two-august-retries-and-hold-unstarted-clinic';
const EXPECTED_FUNCTIONS = {"claim_packet_render_job": "c45a88a19b339ca0e6bfc730b9615450", "guard_packet_render_job_delete": "4f2c83ee79ab27b76f51968e5f826c3d", "guard_packet_render_job_retry_history": "b9dada50ae4a49278970e0fee0ef42f4", "guard_packet_render_job_transition": "282402bd4696c4393f6419a423c7d2ad", "release_expired_packet_render_claims": "12a7d55a1a81b81720686235ef018050", "requeue_retryable_packet_render_jobs": "818bb49fc7a891df127b42bb76716704"};
const EVENT = 'acceptance_synthetic_queue_reconciled_36186574507';
const literal = x => `'${String(x).replaceAll("'", "''")}'`;
const ids = [...HISTORICAL.map(j=>j.id),CLINIC.id];

// Execute the SAME read-only projection used by payment and Clinic. No copied
// simplified predicate that forgets leases, duplicate retries or live siblings.
export async function claimOrderSql(rendererKind = 'packet_document_v1') {
  const source=fs.readFileSync(new URL('./rcap-hosted-acceptance-payment.mjs',import.meta.url),'utf8');
  const start=source.indexOf('function claimablePredicate(rendererKind) {');
  const end=source.indexOf('async function canonicalWakeInstant(',start);
  assert.ok(start>0 && end>start);
  const captured=[];
  const reader=new Function('sql','sqlText','redactSecrets','itemId',
    `${source.slice(start,end)}\nreturn readClaimOrder;`)(async q=>{captured.push(q);return {ok:true,json:[]};},
      x=>String(x).replaceAll("'","''"),x=>x,null);
  await reader(null,rendererKind);
  assert.equal(captured.length,2);
  return captured[0];
}

export async function inventorySql() {
  return `with all_claim_order as (${await claimOrderSql(null)}), claim_order as (${await claimOrderSql()}), jobs as (
    select to_jsonb(j)-'fencing_token' as job,
      (j.fencing_token is not null) as has_fencing_token,
      (j.consumer_briefcase_item_id is not null and c.id is null) as orphan,
      exists(select 1 from all_claim_order q where q.id=j.id) as claimable,
      p.id is not null as packet_exists,p.user_id as packet_user,p.briefcase_id as packet_item,p.partner_slug,
      coalesce(u.email='acceptance-consumer-a@rcap-acceptance.test',false) as known_payment_fixture_user,
      (select count(*) from packet_render_jobs x where x.id<>j.id and x.packet_id=j.packet_id and x.input_hash=j.input_hash and x.status<>'failed') as live_siblings,
      (select count(*) from consumer_packet_payment_consumption x where x.consumer_briefcase_item_id=coalesce(j.consumer_briefcase_item_id,j.sponsored_consumer_briefcase_item_id) or x.first_render_job_id=j.id or x.matter_id=j.matter_id) as payment_consumption,
      (select count(*) from consumer_packet_artifact_provenance x where x.render_job_id=j.id or x.briefcase_item_id=coalesce(j.consumer_briefcase_item_id,j.sponsored_consumer_briefcase_item_id)) as provenance,
      (select count(*) from packet_delivery_events x where x.render_job_id=j.id) as delivery_events,
      (select count(*) from packet_credit_ledger x where x.render_job_id=j.id or x.matter_id=j.matter_id) as credit_ledger,
      (select count(*) from clinic_packet_reservations x where x.render_job_id=j.id) as reservations,
      (select count(*) from legal_aid_document_tasks x where x.unsigned_render_job_id=j.id or x.matter_id=coalesce(j.consumer_briefcase_item_id,j.sponsored_consumer_briefcase_item_id)) as legal_tasks,
      (select count(*) from consumer_packet_verifications x where x.briefcase_item_id=coalesce(j.consumer_briefcase_item_id,j.sponsored_consumer_briefcase_item_id)) as verifications,
      (select count(*) from consumer_artifact_download_grants x where x.briefcase_item_id=coalesce(j.consumer_briefcase_item_id,j.sponsored_consumer_briefcase_item_id)) as download_grants,
      (select count(*) from rcap_record_events x where x.record_id=j.packet_id::text and x.event_type='packet_generated') as packet_generated_records,
      (select count(*) from rcap_record_events x where x.record_id=j.packet_id::text and x.event_type='${EVENT}' and x.metadata->>'jobId'=j.id::text) as reconciliation_receipts
    from packet_render_jobs j left join consumer_briefcase_items c on c.id=j.consumer_briefcase_item_id
    left join rcap_document_packets p on p.id=j.packet_id left join auth.users u on u.id=j.consumer_auth_user_id
    where (j.consumer_briefcase_item_id is not null and c.id is null) or j.id='${CLINIC.id}'
  ) select jsonb_build_object(
    'rows',(select coalesce(jsonb_agg(to_jsonb(j) order by j.job->>'created_at',j.job->>'id'),'[]'::jsonb) from jobs j),
    'claimOrder',(select coalesce(jsonb_agg(id order by created_at,id),'[]'::jsonb) from claim_order),
    'housekeeping',(select coalesce(jsonb_agg(id order by id),'[]'::jsonb) from packet_render_jobs where
      (status='queued' and attempt_count>=max_attempts) or (status in ('claimed','rendering','validating') and claim_expires_at<now()) or (status='failed' and failure_disposition='retryable')),
    'foreignKeys',(select jsonb_agg(jsonb_build_object('table',conrelid::regclass::text,'definition',pg_get_constraintdef(oid)) order by conrelid::regclass::text,conname) from pg_constraint where contype='f' and confrelid in ('public.packet_render_jobs'::regclass,'public.consumer_briefcase_items'::regclass)),
    'functions',(select jsonb_object_agg(proname,md5(pg_get_functiondef(p.oid))) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and proname in ('claim_packet_render_job','release_expired_packet_render_claims','requeue_retryable_packet_render_jobs','guard_packet_render_job_transition','guard_packet_render_job_delete','guard_packet_render_job_retry_history')),
    'clinic',jsonb_build_object(
      'item',(select jsonb_build_object('id',id,'user',user_id,'session',source_session_id,'payment',payment_status,'packet',packet_status) from consumer_briefcase_items where id='${CLINIC.item}'),
      'session',(select jsonb_build_object('id',session_id,'partner',partner_slug,'state',claimed_slot_state) from screening_sessions where session_id='${CLINIC.session}'),
      'pending',(select coalesce(jsonb_agg(jsonb_build_object('id',pending_id,'item',claimed_matter_id,'user',claimed_user_id,'session',anonymous_session_id,'event',event_id,'status',status)),'[]'::jsonb) from consumer_pending_screening_results where claimed_matter_id='${CLINIC.item}'),
      'cases',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'event',event_id,'user',participant_user_id,'session',screening_session_id,'item',matter_id)),'[]'::jsonb) from clinic_cases where screening_session_id='${CLINIC.session}' or matter_id='${CLINIC.item}'),
      'event',(select jsonb_build_object('id',id,'partner',partner_slug,'status',status) from clinic_events where id='${CLINIC.event}'),
      'entitlement',(select jsonb_build_object('used',screenings_used,'overage',overage_packets,'overageCents',overage_amount_cents) from partner_entitlement where partner_slug='mvl-demo'),
      'generated',(select count(*) from rcap_screening_analytics_events where session_id='${CLINIC.session}' and event_type='packet_generated')
    )
  ) as inventory`;
}

const emptyEvidence = row => ['payment_consumption','provenance','delivery_events','credit_ledger','reservations','legal_tasks','download_grants','packet_generated_records','live_siblings'].every(k=>row[k]===0)
  && ['output_storage_path','output_sha256','normalized_output_sha256','output_byte_count','page_count','artifact_validated_at','delivered_at','accounting_result','credit_ledger_id','container_digest'].every(k=>row.job[k]===null)
  && row.job.delivery_eligibility==='not_evaluated' && !row.has_fencing_token && row.job.claim_expires_at===null;
const sponsored = j => j.partner_id!==null || Object.keys(j).some(k=>k.startsWith('sponsored_') && j[k]!==null);

export function classifyInventory(inventory) {
  const errors=[];
  const check=(ok,message)=>{if(!ok)errors.push(message);};
  check(JSON.stringify(Object.entries(inventory.functions??{}).sort())===JSON.stringify(Object.entries(EXPECTED_FUNCTIONS).sort()),'live lifecycle function drift: authority review required');
  const rows=inventory.rows;
  assert.ok(Array.isArray(rows));
  const orphans=rows.filter(r=>r.orphan);
  const actual=orphans.filter(r=>r.claimable).map(r=>r.job.id).sort();
  const expected=HISTORICAL.map(r=>r.id).sort();
  const already=ids.every(id=>rows.find(r=>r.job.id===id)?.reconciliation_receipts===1);
  check(JSON.stringify(actual)===JSON.stringify(already?[]:expected),'historical claimable set differs from exact expected pair');
  for (const h of HISTORICAL) {
    const r=rows.find(r=>r.job.id===h.id),j=r?.job;
    check(Boolean(r && r.orphan && r.known_payment_fixture_user && r.packet_exists && !sponsored(j)
      && j.consumer_auth_user_id==='b6dc86a3-12bb-490d-b130-48d95d426a1e'
      && j.packet_id===h.packet && j.matter_id===h.matter && j.consumer_briefcase_item_id===h.item
      && j.briefcase_item_id===h.item && r.packet_item===h.item && r.packet_user===j.consumer_auth_user_id
      && j.status==='failed' && j.failure_disposition===(already?'terminal':'retryable')
      && j.attempt_count===h.attempts && j.max_attempts===5 && j.renderer_kind==='packet_document_v1'
      && j.error_code==='render_failed' && j.last_error_detail===`packet ${h.packet} not found` && emptyEvidence(r)),`historical ownership/evidence drift: ${h.id}`);
  }
  const r=rows.find(r=>r.job.id===CLINIC.id),j=r?.job,c=inventory.clinic;
  check(Boolean(r && !r.orphan && r.packet_exists && emptyEvidence(r) && j.status==='queued' && j.attempt_count===0
    && j.max_attempts===5 && j.claimed_at===null && j.claimed_by===null && j.rendering_at===null && j.validating_at===null
    && j.renderer_kind==='packet_document_v1'
    && j.route_id==='MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal' && j.sponsored_route_key===j.route_id
    && j.consumer_briefcase_item_id===null
    && j.packet_id===CLINIC.packet && j.matter_id===CLINIC.matter && j.briefcase_item_id===CLINIC.item
    && j.sponsored_consumer_briefcase_item_id===CLINIC.item && j.sponsored_consumer_auth_user_id===CLINIC.user
    && j.sponsored_session_id===CLINIC.session && j.sponsored_clinic_event_id===CLINIC.event
    && j.partner_id==='bc1ed720-681e-4da5-9964-acb2affd5b12'
    && r.packet_user===CLINIC.user && r.packet_item===CLINIC.item
    && j.next_attempt_at===(already?'infinity':null)), 'Clinic unstarted target ownership/evidence drift');
  check(c?.item?.id===CLINIC.item && c.item.user===CLINIC.user && c.item.session===CLINIC.session && c.item.payment==='not_applicable' && c.item.packet==='not_started','Clinic owner differs');
  check(c?.session?.id===CLINIC.session && c.session.partner==='mvl-demo' && c.session.state==='claimed','Clinic session differs');
  check(c?.event?.id===CLINIC.event && c.event.partner==='mvl-demo','Clinic event differs');
  for(const key of ['pending','cases']) check(c?.[key]?.length===1 && c[key].every(x=>x.item===CLINIC.item && x.user===CLINIC.user && x.session===CLINIC.session && x.event===CLINIC.event),'Clinic '+key+' ownership differs');
  check(c?.pending?.[0]?.status==='CLAIMED','Clinic pending claim differs');
  check(c?.generated===0 && c?.entitlement?.used===0 && c.entitlement.overage===0 && c.entitlement.overageCents===0,'Clinic sponsorship/generation evidence differs');
  const knownTables=['clinic_cases','consumer_pending_screening_results','consumer_packet_artifact_provenance','consumer_packet_verifications','consumer_artifact_download_grants','packet_credit_ledger','packet_delivery_events','clinic_packet_reservations','legal_aid_document_tasks'];
  check(inventory.foreignKeys?.every(f=>knownTables.includes(f.table.replace(/^public\./,''))), 'unknown dependent relation: schema review required');
  const remaining=inventory.claimOrder.filter(id=>!ids.includes(id));
  const remainingHousekeeping=inventory.housekeeping.filter(id=>!ids.includes(id));
  check(remaining.length===0 && remainingHousekeeping.length===0,'unrelated claimable/housekeeping workload remains; cannot prove next fresh target first');
  return { orphanCount:orphans.length, claimableHistorical:actual, expectedHistorical:expected,
    classifications:orphans.map(r=>({id:r.job.id,classification:
      !r.known_payment_fixture_user?'UNPROVEN_OWNERSHIP_RETAIN':sponsored(r.job)?'SPONSORED_RETAIN':
      ['delivered','artifact_validated'].includes(r.job.status)||r.delivery_events||r.credit_ledger||r.provenance?'DELIVERY_OR_ACCOUNTING_HISTORY_RETAIN':
      expected.includes(r.job.id)?'KNOWN_AUGUST_SYNTHETIC_RETRY_RETAIN_AND_TERMINALIZE':
      r.job.status==='failed'&&r.job.failure_disposition==='terminal'?'TERMINAL_SYNTHETIC_HISTORY_RETAIN':'UNCLASSIFIED_RETAIN'})),
    clinicClassification:'SETUP / QUEUE PRECONDITION FAILURE; unstarted sponsored target, separate from consumer orphans',
    proposedOperations: [ ...HISTORICAL.map(h=>({id:h.id,operation:'set failure_disposition=terminal,next_attempt_at=null; preserve errors/attempts/history; append immutable audit receipt'})),
      {id:CLINIC.id,operation:'set next_attempt_at=infinity (explicit administrative hold); retain queued status, item/session/case, sponsorship and failure evidence; append immutable audit receipt'} ],
    proposedClaimOrder:remaining, remainingHousekeeping, futureFreshTargetCouldBeFirst:remaining.length===0&&remainingHousekeeping.length===0,
    alreadyApplied:already, applyAllowed:errors.length===0, refusals:errors };
}

export function requireMutationAuthorization({project,apply=false,ownerAuthorization}) {
  requireAcceptance(project);
  assert.equal(apply,true,'explicit --apply required');
  assert.equal(ownerAuthorization,AUTHORIZATION,'exact --owner-authorization required');
}

/** Administrative Acceptance-only transaction. No runtime grant/function or
 * trigger changes; no pretending to be a worker, participant, or housekeeper.
 * Existing fail() requires a live fencing token; the cancellation RPC is absent
 * in Acceptance. Thus keep queued Clinic work on an explicit infinite hold,
 * and only change disposition on ALREADY failed consumer rows. Both transitions
 * pass the existing guards without impersonating a mutation authority.
 * Immutable document_packet audit events preserve before/after lifecycle values.
 */
export async function applySql(inventory,options) {
  requireMutationAuthorization(options);
  const report=classifyInventory(inventory);
  assert.equal(report.applyAllowed,true,report.refusals.join('; '));
  const read=await inventorySql();
  const expected=literal(JSON.stringify(inventory));
  return `begin;
    set local lock_timeout='5s';
    set local statement_timeout='30s';
    lock table public.packet_render_jobs, public.consumer_briefcase_items,
      public.consumer_packet_payment_consumption, public.consumer_packet_artifact_provenance,
      public.packet_delivery_events, public.packet_credit_ledger, public.rcap_document_packets,
      public.clinic_packet_reservations, public.legal_aid_document_tasks,
      public.consumer_packet_verifications, public.consumer_artifact_download_grants,
      public.consumer_pending_screening_results, public.clinic_cases, public.clinic_events,
      public.screening_sessions, public.partner_entitlement, public.rcap_screening_analytics_events,
      public.rcap_record_events, auth.users in share row exclusive mode;
    do $repair$
    declare current_inventory jsonb; v_job public.packet_render_jobs%rowtype;
    begin
      select inventory into current_inventory from (${read}) snapshot;
      if current_inventory is distinct from ${expected}::jsonb then
        raise exception 'inventory drift: refusing all writes; remeasure';
      end if;
      ${report.alreadyApplied ? '-- Exact receipt and held/terminal states already verified: idempotent no-op.' : `
      for v_job in select * from public.packet_render_jobs where id in (${ids.map(literal).join(',')}) order by id for update loop
        insert into public.rcap_record_events(record_type,record_id,partner_slug,event_type,actor,metadata)
        values('document_packet',v_job.packet_id::text,'acceptance-synthetic','${EVENT}','owner-authorized-acceptance-reconciliation',
          jsonb_build_object('jobId',v_job.id,'authorization',${literal(AUTHORIZATION)},'project','${ACCEPTANCE_PROJECT}',
            'failedRun','36186574507','before',to_jsonb(v_job)-'fencing_token',
            'operation',case when v_job.id='${CLINIC.id}' then 'hold_unstarted_clinic_at_infinity' else 'terminalize_historical_retry' end));
        if v_job.id='${CLINIC.id}' then
          update public.packet_render_jobs set next_attempt_at='infinity'::timestamptz where id=v_job.id;
        else
          update public.packet_render_jobs set failure_disposition='terminal',next_attempt_at=null where id=v_job.id;
        end if;
      end loop;`}
    end $repair$;
    commit;`;
}

export async function run({project,apply=false,ownerAuthorization,query}) {
  requireAcceptance(project);
  if(apply) requireMutationAuthorization({project,apply,ownerAuthorization});
  else assert.equal(ownerAuthorization,undefined,'authorization supplied without --apply');
  const rows=await query(`begin read only; ${await inventorySql()}; commit;`);
  assert.equal(rows.length,1); const inventory=rows[0].inventory;
  const report=classifyInventory(inventory);
  if(apply) await query(await applySql(inventory,{project,apply,ownerAuthorization}));
  return {project,mode:apply?'apply':'read-only',measuredAt:new Date().toISOString(),inventory,report};
}
if(import.meta.url===pathToFileURL(process.argv[1]??'').href) {
  const args=process.argv.slice(2);let project,apply=false,ownerAuthorization;
  for(let i=0;i<args.length;i++) {
    if(args[i]==='--project') project=args[++i];
    else if(args[i]==='--apply') apply=true;
    else if(args[i]==='--owner-authorization') ownerAuthorization=args[++i];
    else throw new Error('unknown argument: '+args[i]);
  }
  const result=await run({project,apply,ownerAuthorization,query:async query=>{
    assert.ok(process.env.SUPABASE_ACCESS_TOKEN,'Management API token required');
    const response=await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`,{
      method:'POST',headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query})});
    assert.ok(response.ok,`Management API HTTP ${response.status}`);
    return response.json();
  }});
  console.log(JSON.stringify(result,null,2));
  if(!result.report.applyAllowed) process.exitCode=1;
}
