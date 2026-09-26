import {claimOrderSql} from './rcap-acceptance-queue-reconciliation.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {packetCapacitySql,assertPacketCapacity} from './rcap-clinic-packet-capacity.mjs';
export const RESUME=Object.freeze({project:'hyflxnlhpmiqxvvcoiia',priorRun:'36211668984',job:'b7252f57-c042-4d3e-805e-fd783380f246',item:'6e7a0013-f372-438d-9454-6ba6451b290c',session:'6197c927-de98-4aa3-8d47-b08257bc8c62',matter:'22af6e27-778a-4cbf-94b7-737410d5ff6c',clinicCase:'49d85fbd-9c33-471d-b6aa-e656a5a05438',assisted:'fe8e8cee-0c35-40a4-a49e-26b8bc61f91d',owner:'e7c1d76e-dcf2-4d41-b585-ba164806f391',stranger:'255998e1-eb69-4239-b151-0f8b8935a539',event:'77000000-0000-4000-8000-000000000055',partner:'bc1ed720-681e-4da5-9964-acb2affd5b12',verification:'98784f71e1a0a53f8b1aa228d7653543eaaec894243dea341de046d1d0907a54',hash:'a7c3a13672fbcaafb8fa9c7a287894d94786fa9521a3263915ff4aa965bfb453',normalizedHash:'1ff3a88afbaab8373a1049ecffb01081b02b30ce771cadb57aa6d2731f3e5cfb',bytes:68873,pages:16,priorDigest:'sha256:74b82e11aac7fa1f850ca52ba1344ca7853fa09120374a83ddb5bbc019f8cdd7',credit:'0ad561c1-9010-42e6-a2cd-e744be592915'});
export const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function resumeSql(project){assert.equal(project,RESUME.project);const r=RESUME;return `select jsonb_build_object(
 'job',(select to_jsonb(j)-'fencing_token' from public.packet_render_jobs j where id='${r.job}'),
 'item',(select to_jsonb(i) from public.consumer_briefcase_items i where id='${r.item}'),
 'session',(select to_jsonb(s) from public.screening_sessions s where session_id='${r.session}'),
 'case',(select to_jsonb(c) from public.clinic_cases c where id='${r.clinicCase}'),
 'assisted',(select to_jsonb(a)-'device_nonce_hash' from public.clinic_assisted_sessions a where id='${r.assisted}'),
 'sessionAudit',(select coalesce(jsonb_agg(to_jsonb(a)),'[]') from public.clinic_event_audit a where target_id='${r.assisted}' and action='assisted_session_ended'),
 'verification',(select to_jsonb(v) from public.consumer_packet_verifications v where briefcase_item_id='${r.item}'),
 'provenance',(select coalesce(jsonb_agg(to_jsonb(p)),'[]') from public.consumer_packet_artifact_provenance p where briefcase_item_id='${r.item}' or render_job_id='${r.job}'),
 'generation',(select coalesce(jsonb_agg(to_jsonb(e) order by id),'[]') from public.rcap_screening_analytics_events e where session_id='${r.session}' and event_type='packet_generated'),
 'credit',(select coalesce(jsonb_agg(to_jsonb(l) order by id),'[]') from public.packet_credit_ledger l where render_job_id='${r.job}'),
 'delivery',(select coalesce(jsonb_agg(to_jsonb(e) order by created_at,id),'[]') from public.packet_delivery_events e where render_job_id='${r.job}'),
 'capacity',(select capacity from (${packetCapacitySql()}) q),
 'access',(select to_jsonb(c) from public.clinic_event_access_codes c where id='77000000-0000-4000-8000-000000000057'),
 'claimable',(select coalesce(jsonb_agg(id order by created_at,id),'[]') from (${await claimOrderSql()}) q),
 'housekeeping',(select coalesce(jsonb_agg(id order by id),'[]') from public.packet_render_jobs where (status='queued' and attempt_count>=max_attempts) or (status in ('claimed','rendering','validating') and claim_expires_at<now()) or (status='failed' and failure_disposition='retryable'))
 ) as evidence`;}
export function assertResumeState(s,{afterReset=false}={}){
 const r=RESUME,j=s.job;for(const [k,v] of Object.entries({id:r.job,matter_id:r.matter,status:'delivered',attempt_count:1,accounting_result:'consumed',delivery_eligibility:'eligible',output_sha256:r.hash,normalized_output_sha256:r.normalizedHash,output_byte_count:r.bytes,page_count:r.pages,container_digest:r.priorDigest,credit_ledger_id:r.credit,sponsored_consumer_briefcase_item_id:r.item,sponsored_consumer_auth_user_id:r.owner,sponsored_session_id:r.session,sponsored_clinic_event_id:r.event,sponsored_verification_hash:r.verification,partner_id:r.partner,failure_disposition:null,error_code:null}))assert.equal(j?.[k],v,`job ${k}`);
 assert.equal(s.item?.id,r.item);assert.equal(s.item.user_id,r.owner);assert.equal(s.item.source_session_id,r.session);
 assert.equal(s.session?.session_id,r.session);assert.equal(s.session.claimed_slot_state,'consumed');assert.equal(s.session.partner_slug,'mvl-demo');
 for(const [k,v] of Object.entries({id:r.clinicCase,matter_id:r.item,screening_session_id:r.session,assisted_session_id:r.assisted,participant_user_id:r.owner,event_id:r.event,queue_status:'packet_ready',route_disposition:'packet'}))assert.equal(s.case?.[k],v,`case ${k}`);
 for(const [k,v] of Object.entries({id:r.assisted,participant_user_id:r.owner,event_id:r.event,screening_session_id:r.session}))assert.equal(s.assisted?.[k],v,`assisted ${k}`);
 if(afterReset){assert.equal(s.assisted.status,'reset');assert.equal(s.assisted.ended_reason,'staff_reset');assert.ok(s.assisted.ended_at);assert.equal(s.sessionAudit?.length,1);assert.equal(s.sessionAudit[0].target_id,r.assisted);assert.equal(s.sessionAudit[0].event_id,r.event);assert.equal(s.sessionAudit[0].actor_user_id,r.owner);assert.equal(s.sessionAudit[0].metadata?.reason,'staff_reset');}else{assert.equal(s.assisted.status,'active');assert.equal(s.assisted.ended_at,null);assert.equal(s.assisted.ended_reason,null);assert.deepEqual(s.sessionAudit,[]);}
 assert.equal(s.verification?.status,'verified');assert.equal(s.verification.verification_hash,r.verification);assert.equal(s.verification.consumer_auth_user_id,r.owner);assert.equal(s.verification.matter_id,r.matter);
 for(const k of ['provenance','generation','credit'])assert.equal(s[k]?.length,1,k);
 assert.equal(s.provenance[0].render_job_id,r.job);assert.equal(s.provenance[0].verification_hash,r.verification);assert.equal(s.provenance[0].consumer_auth_user_id,r.owner);assert.equal(s.credit[0].id,r.credit);assert.equal(s.credit[0].event_type,'consumed');
 const cap=assertPacketCapacity(s.capacity);assert.equal(s.capacity.allPartnerRows[0].consumed,1);assert.equal(s.capacity.allPartnerRows[0].packet_cap,2);assert.equal(s.capacity.screening.screenings_used,1);assert.equal(s.capacity.screening.screenings_allowed,2);assert.equal(s.capacity.eventConsumed,1);assert.equal(s.capacity.event.sponsorship_allocation,2);
 assert.equal(s.access?.uses_count,2);assert.equal(s.access.max_uses,2);assert.equal(s.access.is_active,true);assert.deepEqual(s.claimable,[]);assert.deepEqual(s.housekeeping,[]);return cap;
}
export function assertNoNewAccounting(before,after){for(const k of ['job','item','session','verification','provenance','generation','credit','capacity','access','claimable','housekeeping'])assert.deepEqual(after[k],before[k],`${k} changed during delivery resume`);}
export function assertPageLoadUnchanged(before,after){assert.deepEqual(after,before,'page load must be read-only, including delivery events');}
export function assertRepeatDelivery(before,after){assertNoNewAccounting(before,after);assert.equal(after.delivery.length,before.delivery.length+3);const old=new Set(before.delivery.map(x=>x.id));for(const e of before.delivery)assert.deepEqual(after.delivery.find(x=>x.id===e.id),e,'prior transmission preserved');const events=after.delivery.filter(x=>!old.has(x.id));assert.deepEqual(events.map(e=>e.event_type),['delivery_authorized','transmission_started','transmission_completed']);}
export function assertResumeBytes(bytes){assert.equal(bytes.length,RESUME.bytes);assert.equal(sha(bytes),RESUME.hash);}
export function requireResumeAuthorization({project,execute,authorization}){assert.equal(project,RESUME.project);if(execute)assert.equal(authorization,'Roger:clinic-resume:36211668984:explicit-download-and-device-reset');return execute===true;}
// Lost-cookie recovery uses the existing sanctioned lifecycle function. No
// token replacement, expiry extension, new session, or access-code redemption.
// This separate authorization is required at FUTURE execution, never implied
// by read-only inventory or authorization to download.
export function exactSessionClosureSql(project,authorization){
 assert.equal(project,RESUME.project);assert.equal(authorization,'Roger:clinic-resume:36211668984:close-exact-lost-cookie-session');const r=RESUME;
 return `do $resume$ declare s public.clinic_assisted_sessions%rowtype; outcome text; begin
 select * into s from public.clinic_assisted_sessions where id='${r.assisted}' for update;
 if not found or s.event_id is distinct from '${r.event}' or s.participant_user_id is distinct from '${r.owner}' or s.screening_session_id is distinct from '${r.session}' then raise exception 'resume session identity drift'; end if;
 if not exists(select 1 from public.clinic_cases where id='${r.clinicCase}' and assisted_session_id=s.id and matter_id='${r.item}' and screening_session_id=s.screening_session_id and participant_user_id=s.participant_user_id and event_id=s.event_id and queue_status='packet_ready') then raise exception 'resume case drift';end if;
 if s.status='reset' and s.ended_reason='staff_reset' and s.ended_at is not null then return;end if;
 if s.status is distinct from 'active' or s.ended_at is not null or s.ended_reason is not null then raise exception 'resume session lifecycle drift';end if;
 outcome:=public.clinic_end_assisted_session(s.id,s.participant_user_id,'staff_reset');
 if outcome<>'ended' then raise exception 'canonical session closure refused: %',outcome;end if;
 end $resume$;`;
}
export async function runResumeProof(p){
 const before=await p.snapshot();assertResumeState(before);assert.equal(before.delivery.length,3);assert.deepEqual(before.delivery.map(e=>e.event_type),['delivery_authorized','transmission_started','transmission_completed']);
 const preview=await p.requireSuccessorPreview();await p.signInOwner();await p.observeBeforeMatter();await p.openReadyMatter();assert.equal(p.downloadRequests(),0);assertPageLoadUnchanged(before,await p.snapshot());assert.equal(p.downloadRequests(),0,'no automatic request immediately before explicit Download');
 const bytes=await p.explicitDownload();assertResumeBytes(bytes);assert.equal(p.downloadRequests(),1);const delivered=await p.snapshot();assertRepeatDelivery(before,delivered);
 const denials=await p.proveDenials();assert.equal(denials.stranger,404);assert.ok([401,404].includes(denials.anonymous));await p.proveExactStaffCase();
 const reset=await p.resetDeviceAndCloseExactSession();assert.equal(reset.signOutConfirmed,true);assert.equal(reset.cookies,0);assert.ok(Object.values(reset.storage).every(x=>x===0));assert.equal(reset.historySafe,true);assert.equal(reset.sameDeviceStranger,404);
 const after=await p.snapshot();assertResumeState(after,{afterReset:true});assertNoNewAccounting(before,after);assert.deepEqual(after.delivery,delivered.delivery);assert.deepEqual(after.case,before.case);
 return {schemaVersion:'rcap-clinic-resume/v1',passed:true,namespace:RESUME,preview,priorTransmission:{run:RESUME.priorRun,trigger:'unintentional Next Link prefetch before deliberate user action',events:before.delivery},successorTransmission:{trigger:'explicit participant download',automaticRequests:0,requests:1,sha256:sha(bytes),bytes:bytes.length,events:delivered.delivery.filter(e=>!before.delivery.some(old=>old.id===e.id))},denials,reset,before,after};
}
