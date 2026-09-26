import assert from 'node:assert/strict';
import fs from 'node:fs';
import { pathToFileURL } from 'node:url';
import { inventorySql as priorInventorySql, CLINIC as PRIOR } from './rcap-acceptance-queue-reconciliation.mjs';
import { requireAcceptance } from './rcap-acceptance-fixture-retention.mjs';

export const TARGET = Object.freeze({ ...PRIOR, id:'78efc6af-b4fc-4423-8290-0e3c2e34de07',
  item:'77ffebba-2b7b-4bad-8e57-1846cb7b02fe', session:'dec7959c-a4a8-4f96-aaa9-2567338b6761',
  packet:'1a9afd62-b6aa-4b2b-8cb6-b2173fd9d9c3', matter:'767da280-0c06-4a20-906d-73c5e7570a6c' });
export const AUTHORIZATION = 'Roger:acceptance-queue:36204248464:release-expired-exact-clinic-target-and-terminalize';
const EVENT='acceptance_synthetic_queue_reconciled_36204248464';
const STORAGE_PATH='packet-artifacts/bc1ed720-681e-4da5-9964-acb2affd5b12/767da280-0c06-4a20-906d-73c5e7570a6c/78efc6af-b4fc-4423-8290-0e3c2e34de07/733889fff7814678e3ad4b4fbebc280cd98daa049cea5c09c1105eb35b95e149.pdf';
const literal=x=>`'${String(x).replaceAll("'","''")}'`;
const historical=JSON.parse(fs.readFileSync(new URL('../docs/rcap/grade-a/handoffs/ACCEPTANCE_QUEUE_36186574507_INVENTORY.json',import.meta.url))).inventory;

// Reuse the audited read-only dependency/claim projection, substituting only
// this exact fixture namespace and receipt name. No old mutation plan is reused.
export async function inventorySql() {
  let read=await priorInventorySql();
  for(const k of ['id','item','session','packet','matter'])read=read.replaceAll(PRIOR[k],TARGET[k]);
  read=read.replaceAll('acceptance_synthetic_queue_reconciled_36186574507',EVENT);
  return `select inventory || jsonb_build_object(
    'storageResidue',(select coalesce(jsonb_agg(jsonb_build_object('id',id,'bucket_id',bucket_id,'name',name,'metadata',metadata) order by id),'[]') from storage.objects
      where bucket_id='rcap-packet-artifacts-private' and name like '%/${TARGET.id}/%'),
    'storageBucket',(select jsonb_build_object('id',id,'public',public) from storage.buckets where id='rcap-packet-artifacts-private'),
    'leaseExpired',(select claim_expires_at<now() from packet_render_jobs where id='${TARGET.id}'),
    'releaseEligible',(select coalesce(jsonb_agg(id order by id),'[]'::jsonb) from packet_render_jobs where
      (status in ('claimed','rendering','validating') and claim_expires_at is not null and claim_expires_at<now())
      or (status='queued' and attempt_count>=max_attempts)),
    'unrelatedJobsHash',(select md5(coalesce(jsonb_agg(to_jsonb(j) order by id)::text,'[]')) from packet_render_jobs j where id<>'${TARGET.id}'),
    'receipts',(select coalesce(jsonb_agg(metadata order by id),'[]'::jsonb) from rcap_record_events where event_type='${EVENT}' and record_id='${TARGET.packet}')
  ) as inventory from (${read}) snapshot`;
}

export function classifyInventory(s) {
  const errors=[],check=(ok,msg)=>{if(!ok)errors.push(msg);};
  const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  const row=s.rows.find(r=>r.job.id===TARGET.id),j=row?.job,c=s.clinic;
  const done=s.receipts?.length===1;
  check(s.storageBucket?.id==='rcap-packet-artifacts-private'&&s.storageBucket.public===false,'private residue bucket drift');
  check(s.storageResidue?.length===1&&s.storageResidue[0].id==='06bf3d30-54cb-4ae0-a0db-d3b6b201238c'
    &&s.storageResidue[0].bucket_id==='rcap-packet-artifacts-private'&&s.storageResidue[0].name===STORAGE_PATH
    &&s.storageResidue[0].metadata?.size===68881&&s.storageResidue[0].metadata?.mimetype==='application/pdf','pre-finalization private storage residue drift; preserve and remeasure');
  check(same(Object.entries(s.functions??{}).sort(),Object.entries(historical.functions).sort()),'live function drift');
  check(same(s.foreignKeys,historical.foreignKeys),'dependency schema drift');
  check(Boolean(j),'missing exact target');
  if(j){
    const exact={id:TARGET.id,packet_id:TARGET.packet,matter_id:TARGET.matter,briefcase_item_id:TARGET.item,
      sponsored_consumer_briefcase_item_id:TARGET.item,sponsored_consumer_auth_user_id:TARGET.user,
      sponsored_session_id:TARGET.session,sponsored_clinic_event_id:TARGET.event,
      partner_id:'bc1ed720-681e-4da5-9964-acb2affd5b12',attempt_count:1,max_attempts:5,renderer_kind:'packet_document_v1',
      route_id:'MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal',
      consumer_briefcase_item_id:null,consumer_auth_user_id:null,delivery_eligibility:'not_evaluated',
      input_hash:'485ff66c4bf804af567d55bd1533503aa517c4f6133383811c88228aaa2896ce',
      sponsored_verification_hash:'7a59afea70ff768868c5502f0e10b128ad48fa9898bf494f06969dd1d606b79b'};
    for(const[k,v]of Object.entries(exact))check(j[k]===v,`target identity drift: ${k}`);
    check(j.sponsored_route_key===j.route_id,'sponsored route drift');
    check(row.orphan===false&&row.packet_exists&&row.packet_item===TARGET.item&&row.packet_user===TARGET.user,'owner/packet drift');
    for(const k of ['payment_consumption','provenance','delivery_events','credit_ledger','reservations','legal_tasks','download_grants','packet_generated_records','live_siblings'])check(row[k]===0,`evidence present: ${k}`);
    for(const k of ['output_storage_path','output_sha256','normalized_output_sha256','output_byte_count','page_count','artifact_validated_at','delivered_at','accounting_result','credit_ledger_id','container_digest'])check(j[k]===null,`output present: ${k}`);
    check(Boolean(j.claimed_at&&j.claimed_by&&j.rendering_at&&j.validating_at),'missing claimed/rendering/validating history');
    check(j.next_attempt_at===null,'unexpected schedule');
    if(!done){
      check(j.status==='validating'&&j.failure_disposition===null&&j.error_code===null&&j.last_error_detail===null,'unexpected current state');
      check(row.has_fencing_token&&s.leaseExpired===true,'lease is not expired/fenced');
      check(same(j.retry_reconciliation_history,[])&&row.reconciliation_receipts===0,'unexpected prior reconciliation');
    } else {
      const receipt=s.receipts[0],before=receipt.before;
      check(receipt.authorization===AUTHORIZATION&&receipt.jobId===TARGET.id&&receipt.project==='hyflxnlhpmiqxvvcoiia','receipt authority mismatch');
      check(same(receipt.storageResidue,s.storageResidue),'preserved private residue differs from audit');
      check(j.status==='failed'&&j.failure_disposition==='terminal'&&!row.has_fencing_token&&j.claim_expires_at===null,'terminal state mismatch');
      check(j.error_code==='timeout'&&j.last_error_detail==='claim lease expired before the worker finished','canonical expiry outcome mismatch');
      check(j.retry_reconciliation_history?.length===1&&j.retry_reconciliation_history[0].authority==='release_expired_packet_render_claims'&&j.retry_reconciliation_history[0].prior_status==='validating','canonical history mismatch');
      check(before?.status==='validating'&&before?.attempt_count===1&&row.reconciliation_receipts===1,'receipt before-state mismatch');
      if(before)for(const k of Object.keys(before))if(!['status','failure_disposition','error_code','last_error_detail','next_attempt_at','claim_expires_at','retry_reconciliation_history','updated_at'].includes(k))check(same(j[k],before[k]),`preserved history drift: ${k}`);
    }
  }
  check(c?.item?.id===TARGET.item&&c.item.user===TARGET.user&&c.item.session===TARGET.session&&c.item.payment==='not_applicable'&&c.item.packet==='not_started','Clinic item drift');
  check(c?.session?.id===TARGET.session&&c.session.partner==='mvl-demo'&&c.session.state==='claimed','Clinic session drift');
  check(c?.event?.id===TARGET.event&&c.event.partner==='mvl-demo'&&c.event.status==='published','Clinic event drift');
  for(const k of ['pending','cases'])check(c?.[k]?.length===1&&c[k].every(x=>x.item===TARGET.item&&x.user===TARGET.user&&x.event===TARGET.event&&x.session===TARGET.session),'Clinic '+k+' drift');
  check(c?.pending?.[0]?.status==='CLAIMED','pending ownership drift');
  check(c?.pending?.[0]?.id==='28a940d8-8113-4fb0-956f-e4a4f20c3bf5'&&c?.cases?.[0]?.id==='f54da5be-e95d-46c0-88dd-7b3175e2070e','exact case/pending identity drift');
  check(c?.generated===0&&same(c?.entitlement,{used:0,overage:0,overageCents:0}),'sponsorship consumption drift');
  check(same(s.claimOrder,[]),'claimable work exists');
  check(same(s.releaseEligible,done?[]:[TARGET.id]),'release-expired impact is not exactly the target');
  check(same(s.housekeeping,done?[]:[TARGET.id]),'unrelated housekeeping exists');
  check(s.receipts?.length===(done?1:0),'receipt count mismatch');
  return {applyAllowed:errors.length===0,alreadyApplied:done,refusals:errors,target:TARGET.id,
    disposition:'release exact expired validating lease through sanctioned function; terminalize failed synthetic fixture; retain namespace and audit',
    predictedClaimOrder:[],predictedHousekeeping:[]};
}

export async function applySql(s,{project,apply=false,ownerAuthorization}) {
  requireAcceptance(project);assert.equal(apply,true,'explicit --apply required');assert.equal(ownerAuthorization,AUTHORIZATION,'exact owner authorization required');
  const report=classifyInventory(s);assert.equal(report.applyAllowed,true,report.refusals.join('; '));
  const read=await inventorySql();
  return `begin; set local lock_timeout='5s'; set local statement_timeout='30s';
    lock table public.packet_render_jobs,public.consumer_briefcase_items,public.rcap_document_packets,
      public.consumer_packet_payment_consumption,public.consumer_packet_artifact_provenance,public.packet_delivery_events,
      public.packet_credit_ledger,public.clinic_packet_reservations,public.legal_aid_document_tasks,
      public.consumer_packet_verifications,public.consumer_artifact_download_grants,public.screening_sessions,
      public.clinic_events,public.clinic_cases,public.consumer_pending_screening_results,public.partner_entitlement,
      public.rcap_screening_analytics_events,public.rcap_record_events,auth.users,storage.objects,storage.buckets in share row exclusive mode;
    do $repair$ declare snapshot jsonb; after_snapshot jsonb; before_job jsonb; expired_job jsonb; n integer;
    begin
      select inventory into snapshot from (${read}) q;
      if snapshot is distinct from ${literal(JSON.stringify(s))}::jsonb then raise exception 'inventory drift';end if;
      ${report.alreadyApplied?'-- verified idempotent no-op':`
      select to_jsonb(j)-'fencing_token' into before_job from public.packet_render_jobs j where id='${TARGET.id}';
      select public.release_expired_packet_render_claims() into n;
      if n<>1 then raise exception 'release impact mismatch';end if;
      select to_jsonb(j)-'fencing_token' into expired_job from public.packet_render_jobs j where id='${TARGET.id}';
      if expired_job->>'status'<>'failed' or expired_job->>'failure_disposition'<>'retryable'
        or expired_job->>'attempt_count'<>'1' or expired_job->>'claim_expires_at' is not null
        or jsonb_array_length(expired_job->'retry_reconciliation_history')<>1
        or expired_job#>>'{retry_reconciliation_history,0,authority}'<>'release_expired_packet_render_claims'
        or expired_job#>>'{retry_reconciliation_history,0,prior_status}'<>'validating'
      then raise exception 'canonical expiry mismatch';end if;
      update public.packet_render_jobs set failure_disposition='terminal',next_attempt_at=null where id='${TARGET.id}';
      insert into public.rcap_record_events(record_type,record_id,partner_slug,event_type,actor,metadata)
      values('document_packet','${TARGET.packet}','mvl-demo','${EVENT}','owner-authorized-acceptance-reconciliation',
        jsonb_build_object('jobId','${TARGET.id}','project','hyflxnlhpmiqxvvcoiia','authorization',${literal(AUTHORIZATION)},
          'failedRun','36204248464','before',before_job,'storageResidue',snapshot->'storageResidue','afterCanonicalExpiry',expired_job,'operation','release_expired_exact_target_then_terminalize'));
      select inventory into after_snapshot from (${read}) q;
      if after_snapshot->'unrelatedJobsHash' is distinct from snapshot->'unrelatedJobsHash'
        or after_snapshot->'clinic' is distinct from snapshot->'clinic'
        or after_snapshot->'storageResidue' is distinct from snapshot->'storageResidue'
        or after_snapshot->'storageBucket' is distinct from snapshot->'storageBucket'
        or after_snapshot->'claimOrder'<>'[]'::jsonb or after_snapshot->'housekeeping'<>'[]'::jsonb
      then raise exception 'unexpected post-reconciliation state';end if;`}
    end $repair$;commit;`;
}

export async function run({project,apply=false,ownerAuthorization,query}) {
  requireAcceptance(project);
  if(apply)assert.equal(ownerAuthorization,AUTHORIZATION,'exact owner authorization required');
  else assert.equal(ownerAuthorization,undefined,'authorization without apply');
  const rows=await query(`begin read only; ${await inventorySql()};commit;`);assert.equal(rows.length,1);
  const inventory=rows[0].inventory,report=classifyInventory(inventory);
  if(apply)await query(await applySql(inventory,{project,apply,ownerAuthorization}));
  return {project,mode:apply?'apply':'read-only',inventory,report};
}
if(import.meta.url===pathToFileURL(process.argv[1]??'').href){
  let project,apply=false,ownerAuthorization;const args=process.argv.slice(2);
  for(let i=0;i<args.length;i++){if(args[i]==='--project')project=args[++i];else if(args[i]==='--apply')apply=true;else if(args[i]==='--owner-authorization')ownerAuthorization=args[++i];else throw Error('unknown argument');}
  const result=await run({project,apply,ownerAuthorization,query:async query=>{
    assert.ok(process.env.SUPABASE_ACCESS_TOKEN,'Management API token required');
    const response=await fetch(`https://api.supabase.com/v1/projects/${project}/database/query`,{method:'POST',headers:{Authorization:`Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,'Content-Type':'application/json'},body:JSON.stringify({query})});
    assert.ok(response.ok,`Management API HTTP ${response.status}`);return response.json();
  }});console.log(JSON.stringify(result,null,2));if(!result.report.applyAllowed)process.exitCode=1;
}
