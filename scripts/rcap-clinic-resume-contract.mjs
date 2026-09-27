import {claimOrderSql} from './rcap-acceptance-queue-reconciliation.mjs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {packetCapacitySql,assertPacketCapacity} from './rcap-clinic-packet-capacity.mjs';
export const RESUME=Object.freeze({project:'hyflxnlhpmiqxvvcoiia',priorRun:'36211668984',job:'b7252f57-c042-4d3e-805e-fd783380f246',item:'6e7a0013-f372-438d-9454-6ba6451b290c',session:'6197c927-de98-4aa3-8d47-b08257bc8c62',matter:'22af6e27-778a-4cbf-94b7-737410d5ff6c',clinicCase:'49d85fbd-9c33-471d-b6aa-e656a5a05438',assisted:'fe8e8cee-0c35-40a4-a49e-26b8bc61f91d',owner:'e7c1d76e-dcf2-4d41-b585-ba164806f391',stranger:'255998e1-eb69-4239-b151-0f8b8935a539',event:'77000000-0000-4000-8000-000000000055',partner:'bc1ed720-681e-4da5-9964-acb2affd5b12',verification:'98784f71e1a0a53f8b1aa228d7653543eaaec894243dea341de046d1d0907a54',hash:'a7c3a13672fbcaafb8fa9c7a287894d94786fa9521a3263915ff4aa965bfb453',normalizedHash:'1ff3a88afbaab8373a1049ecffb01081b02b30ce771cadb57aa6d2731f3e5cfb',bytes:68873,pages:16,priorDigest:'sha256:74b82e11aac7fa1f850ca52ba1344ca7853fa09120374a83ddb5bbc019f8cdd7',credit:'0ad561c1-9010-42e6-a2cd-e744be592915'});
export const CHECKPOINT=Object.freeze({sourceRun:'36252986173',artifactId:10910140320,artifactSha256:'sha256:373eebb82194a3e1ebe71d2837081f345a97cfc6faba90f29f697c314972ad70',runStartedAt:'2026-09-26T15:44:28Z',runCompletedAt:'2026-09-26T15:49:59Z',previewId:'dpl_Gf6uwETvQNbKXAMCcxLE6ECxLhNR',hostname:'legalease-rcap-clinic-af638b61cc4b-roger947s-projects.vercel.app',admin:'bf40fd9f-cdb7-4530-be79-5b31f0f13eb1',staff:'87c6502c-af00-40b3-b104-7800e364155d',adminPartnerUser:'8784a02f-479b-4b35-8570-7de5bf91cf89',staffPartnerUser:'a40cacf5-5dcc-4546-a38a-2cb8a4dcd1d8',eventIds:Object.freeze(['fceb6820-51b5-45e2-aed7-42eeb09fe94a','2da21023-0d5b-474b-8a9e-fd17febece70','be7ee193-9893-40b0-b718-0708a495fed4','6064231b-072f-4128-b721-171c20d56d2a','7c27686c-1f38-485d-8e92-d2ec1e3f62fb','6442106f-a412-46b5-82a1-f1220f3ee0a3'])});
export function classifyDeliveryCheckpoint(s){
 const events=s.delivery;assert.ok(Array.isArray(events)&&[3,6].includes(events.length),'exact three- or six-event checkpoint required');
 assert.deepEqual(events.map(e=>e.id),CHECKPOINT.eventIds.slice(0,events.length),'exact pinned delivery IDs and chronological order');
 let previous=-Infinity;
 for(const [i,e] of events.entries()){
  assert.equal(e.event_type,['delivery_authorized','transmission_started','transmission_completed'][i%3]);assert.equal(e.actor_user_id,RESUME.owner);assert.equal(e.render_job_id,RESUME.job);assert.deepEqual(e.request_context,{surface:'briefcase_download',userAgentClass:'desktop'});
  const time=Date.parse(e.created_at);assert.ok(Number.isFinite(time)&&time>previous,'chronological event timestamps');previous=time;
  if(i>=3)assert.ok(time>=Date.parse(CHECKPOINT.runStartedAt)&&time<=Date.parse(CHECKPOINT.runCompletedAt),'explicit delivery must be inside pinned source run');
 }
 return {state:events.length===6?'SUCCESSOR_EXPLICIT_DOWNLOAD_ALREADY_PROVEN':'ORIGINAL_DELIVERY_ONLY',sourceRun:events.length===6?CHECKPOINT.sourceRun:RESUME.priorRun};
}
export function queuePrivacySql(project){assert.equal(project,RESUME.project);return `select jsonb_build_object(
 'observedAt',now(),
 'eventStaff',(select jsonb_build_object('partnerUserId',pu.id,'authUserId',pu.auth_user_id,'partnerSlug',pu.partner_slug,'role',pu.role,'status',pu.status,'eventId',s.event_id,'staffStatus',s.status,'permissions',s.permissions) from public.partner_users pu join public.clinic_event_staff s on s.partner_user_id=pu.id where pu.id='${CHECKPOINT.staffPartnerUser}' and s.event_id='${RESUME.event}'),
 'admin',(select jsonb_build_object('partnerUserId',id,'authUserId',auth_user_id,'partnerSlug',partner_slug,'role',role,'status',status) from public.partner_users where id='${CHECKPOINT.adminPartnerUser}'),
 'assisted',(select jsonb_build_object('id',id,'status',status,'expires_at',expires_at,'ended_at',ended_at,'ended_reason',ended_reason) from public.clinic_assisted_sessions where id='${RESUME.assisted}')
 ) as evidence`;}
export function assertQueuePrivacyPrerequisites(s){
 for(const [key,value] of Object.entries({partnerUserId:CHECKPOINT.staffPartnerUser,authUserId:CHECKPOINT.staff,partnerSlug:'mvl-demo',role:'partner_staff',status:'active',eventId:RESUME.event,staffStatus:'approved'}))assert.equal(s.eventStaff?.[key],value,`staff ${key}`);
 assert.ok(s.eventStaff.permissions.includes('queue'));
 for(const [key,value] of Object.entries({partnerUserId:CHECKPOINT.adminPartnerUser,authUserId:CHECKPOINT.admin,partnerSlug:'mvl-demo',role:'partner_admin',status:'active'}))assert.equal(s.admin?.[key],value,`admin ${key}`);
 assert.equal(s.assisted?.id,RESUME.assisted);assert.equal(s.assisted.status,'active');assert.equal(s.assisted.ended_at,null);assert.equal(s.assisted.ended_reason,null);
 assert.ok(Date.parse(s.assisted.expires_at)<Date.parse(s.observedAt),'ordinary staff absence requires expired assistance');
}
export function assertStaffQueueProof(p){for(const [k,v] of Object.entries({partnerAdminDurableCaseVisible:true,exactCaseId:RESUME.clinicCase,eventStaffAuthorized:true,expiredAssistanceCaseHiddenFromEventStaff:true,eventStaffAuthUserId:CHECKPOINT.staff,adminAuthUserId:CHECKPOINT.admin}))assert.equal(p?.[k],v,`queue proof ${k}`);}
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
 if(afterReset){assert.equal(s.assisted.status,'reset');assert.equal(s.assisted.ended_reason,'staff_reset');assert.ok(s.assisted.ended_at);assert.equal(s.sessionAudit?.length,1,'exactly one closure audit record');const audit=s.sessionAudit[0];assert.equal(audit.target_id,r.assisted);assert.equal(audit.event_id,r.event);assert.equal(audit.actor_user_id,r.owner,'closure actor must be the original owner');assert.equal(audit.action,'assisted_session_ended');assert.equal(audit.target_type,'assisted_session');assert.equal(audit.metadata?.reason,'staff_reset');}else{assert.equal(s.assisted.status,'active');assert.equal(s.assisted.ended_at,null);assert.equal(s.assisted.ended_reason,null);assert.deepEqual(s.sessionAudit,[]);}
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
// Every browser outcome that the receipt reports is asserted here, BEFORE the
// contract lets the one permitted write run. Collecting the fields is not
// enough: a nonzero cookie count, an unsafe history walk, a wrong Participant B
// identity or response, a forbidden request or a replayed download each refuse.
export function assertBrowserCleanupBeforeClosure(r,{expectedDownloads=0}={}){
 assert.equal(r?.signOutConfirmed,true,'server reset must confirm sign-out');
 assert.equal(r.cookies,0,'participant cookies survived the reset');
 // Survival is judged against the pre-reset inventory; emptiness is judged on
 // the clean entry after it initialized AND after Back/Forward, never on an
 // earlier snapshot. This bounded resume runs with the documented analytics
 // opt-out observed on that document, so the counts must be zero as measured.
 assert.deepEqual(r.survived??null,[],'prior participant state survived the reset');
 const areas=Object.values(r.storage??{});assert.ok(areas.length>0&&areas.every(x=>x===0),'browser storage not empty after Back/Forward');
 const entry=Object.values(r.storageAfterEntryInit??{});assert.ok(entry.length>0&&entry.every(x=>x===0),'browser storage not empty after the clean entry initialized');
 assert.equal(r.doNotTrack,'1','bounded no-analytics resume requires the documented opt-out observed on the clean entry');
 assert.equal(r.historySafe,true,'Back/Forward reached participant state');
 assert.ok([401,404].includes(r.revokedStatus),'signed-out owner must be denied');
 assert.equal(r.strangerId,RESUME.stranger,'same-device sign-in must be the exact Participant B');
 assert.equal(r.sameDeviceStranger,404,'Participant B must receive 404');
 assert.equal(r.strangerMatchesMissing,true,'Participant B response must equal a missing-packet response');
 assert.deepEqual(r.violations,[],'resume attempted a forbidden request');
 assert.equal(r.downloadRequests,expectedDownloads,'owner download replay');
}
// Read-only classification of the exact namespace: the active checkpoint, or the
// same checkpoint already reset with its one matching closure audit record.
// Anything else refuses. Neither answer grants acceptance, permits a second
// lifecycle transition, or relaxes an identity check.
export function classifyResumeLifecycle(s){
 classifyDeliveryCheckpoint(s);
 try{assertResumeState(s);return 'EXACT_ACTIVE_CHECKPOINT';}
 catch(active){try{assertResumeState(s,{afterReset:true});return 'EXACT_RESET_CHECKPOINT';}catch(reset){throw new assert.AssertionError({message:`not the exact active checkpoint (${String(active.message).split('\n')[0]}) and not the exact reset checkpoint (${String(reset.message).split('\n')[0]})`,actual:s.assisted?.status,expected:'active or reset with one matching audit record',operator:'classifyResumeLifecycle'});}}
}
export const RESUME_STAGES=Object.freeze(['browser_reset_failed','browser_finish_failed','browser_checks_failed','pre_closure_state_failed','browser_checks_passed','closure_requested','closure_response_lost','closure_committed','readback_failed','readback_verified']);
const RESUME_PORTS=Object.freeze(['snapshot','requireSuccessorPreview','signInOwner','observeBeforeMatter','openReadyMatter','downloadRequests','explicitDownload','proveDenials','proveStaffQueuePrivacy','resetDevice','finishBrowserActivity','assertBrowserFinished','violations','recordProgress','closeExactSession']);
const summarizeReset=r=>({signOutConfirmed:r.signOutConfirmed,cookies:r.cookies,allCookies:r.allCookies??null,storage:r.storage,storageAfterEntryInit:r.storageAfterEntryInit,survived:r.survived,created:r.created,doNotTrack:r.doNotTrack,analyticsProfile:r.analyticsProfile??null,historySafe:r.historySafe,revokedStatus:r.revokedStatus,strangerId:r.strangerId,sameDeviceStranger:r.sameDeviceStranger,strangerMatchesMissing:r.strangerMatchesMissing,violations:r.violations.length,downloadRequests:r.downloadRequests});
export async function runResumeProof(p){
 for(const port of RESUME_PORTS)assert.equal(typeof p?.[port],'function',`resume port ${port} required`);
 const before=await p.snapshot();assertResumeState(before);const checkpoint=classifyDeliveryCheckpoint(before);const alreadyProven=checkpoint.state==='SUCCESSOR_EXPLICIT_DOWNLOAD_ALREADY_PROVEN';
 const preview=await p.requireSuccessorPreview();await p.signInOwner();await p.observeBeforeMatter();await p.openReadyMatter();assert.equal(p.downloadRequests(),0);assertPageLoadUnchanged(before,await p.snapshot());assert.equal(p.downloadRequests(),0,'no automatic request immediately before explicit Download');
 let delivered=before,bytes;
 if(!alreadyProven){bytes=await p.explicitDownload();assertResumeBytes(bytes);assert.equal(p.downloadRequests(),1);delivered=await p.snapshot();assertRepeatDelivery(before,delivered);}
 const denials=await p.proveDenials();assert.equal(denials.stranger,404);assert.ok([401,404].includes(denials.anonymous));assertPageLoadUnchanged(delivered,await p.snapshot());
 const staffQueueProof=await p.proveStaffQueuePrivacy();assertStaffQueueProof(staffQueueProof);assertPageLoadUnchanged(delivered,await p.snapshot());
 if(alreadyProven)assert.equal(p.downloadRequests(),0,'checkpoint must never download again');
 // The one permitted write sits behind every browser assertion, and every
 // stage around it is recorded through the evidence port before the next step
 // runs, so a lost response, a failed readback or a failed evidence write can
 // never hide whether the closure happened.
 const record=async(stage,detail={})=>{assert.ok(RESUME_STAGES.includes(stage));try{await p.recordProgress({stage,at:new Date().toISOString(),...detail});}catch(error){const failure=error instanceof Error?error:new Error(String(error));failure.resumeStage=stage;failure.evidenceWriteFailed=true;throw failure;}};
 const failAt=async(stage,error)=>{const failure=error instanceof Error?error:new Error(String(error));failure.resumeStage=stage;try{await p.recordProgress({stage,at:new Date().toISOString(),error:String(failure.message).split('\n')[0]});}catch(recordError){failure.recordError=String(recordError?.message??recordError).split('\n')[0];}throw failure;};
 let cleanup;try{cleanup=await p.resetDevice();}catch(error){await failAt('browser_reset_failed',error);}
 const reset={...cleanup,violations:p.violations(),downloadRequests:p.downloadRequests()};
 try{assertBrowserCleanupBeforeClosure(reset,{expectedDownloads:alreadyProven?0:1});}catch(error){await failAt('browser_checks_failed',error);}
 try{const current=await p.snapshot();assertResumeState(current);assertNoNewAccounting(before,current);assert.deepEqual(current.delivery,delivered.delivery);assert.deepEqual(current.case,before.case);}catch(error){await failAt('pre_closure_state_failed',error);}
 // Stop all producers and await their handlers before final observations. A
 // read made while the browser was alive cannot authorize the later write.
 let browserCompletion;
 try{browserCompletion=await p.finishBrowserActivity();p.assertBrowserFinished();}catch(error){await failAt('browser_finish_failed',error);}
 const checkFinal=()=>{p.assertBrowserFinished();assertBrowserCleanupBeforeClosure({...cleanup,violations:p.violations(),downloadRequests:p.downloadRequests()},{expectedDownloads:alreadyProven?0:1});};
 try{checkFinal();const current=await p.snapshot();assertResumeState(current);assertNoNewAccounting(before,current);assert.deepEqual(current.delivery,delivered.delivery);assert.deepEqual(current.case,before.case);checkFinal();}catch(error){await failAt('pre_closure_state_failed',error);}
 await record('browser_checks_passed',{lifecycle:'EXACT_ACTIVE_CHECKPOINT',browser:summarizeReset(reset)});
 // The closure names the exact pinned session and its original owner inside
 // the SQL itself; Participant B, signed in on the device by now, never reaches it.
 await record('closure_requested',{session:RESUME.assisted,actor:RESUME.owner,reason:'staff_reset',writeNotYetAttempted:true});
 // Evidence writes are awaited too. No await or live browser producer remains
 // between this last fresh validation and invoking the exact closure port.
 try{checkFinal();}catch(error){await failAt('browser_checks_failed',error);}
 try{await p.closeExactSession();}catch(error){await failAt('closure_response_lost',error);}
 await record('closure_committed');
 let after;try{after=await p.snapshot();assertResumeState(after,{afterReset:true});assertNoNewAccounting(before,after);assert.deepEqual(after.delivery,delivered.delivery);assert.deepEqual(after.case,before.case);assert.equal(after.delivery.length,delivered.delivery.length,'delivery events changed during closure');if(alreadyProven){classifyDeliveryCheckpoint(after);assert.equal(p.downloadRequests(),0);}}catch(error){await failAt('readback_failed',error);}
 await record('readback_verified',{closureAudit:{target_id:after.sessionAudit[0].target_id,actor_user_id:after.sessionAudit[0].actor_user_id,event_id:after.sessionAudit[0].event_id}});
 return {schemaVersion:'rcap-clinic-resume/v2',passed:true,namespace:RESUME,checkpoint,preview,
 originalAccidentalDelivery:{sourceRun:RESUME.priorRun,cause:'Next Link prefetch before deliberate participant action',eventIds:before.delivery.slice(0,3).map(e=>e.id),events:before.delivery.slice(0,3)},
 correctedExplicitDelivery:{sourceRun:alreadyProven?CHECKPOINT.sourceRun:p.sourceRun,preview:alreadyProven?CHECKPOINT.previewId:preview.deploymentId,eventIds:delivered.delivery.slice(3).map(e=>e.id),events:delivered.delivery.slice(3),automaticDownloadRequestsBeforeExplicitAction:0,sha256:RESUME.hash,bytes:RESUME.bytes,...(alreadyProven?{artifactId:CHECKPOINT.artifactId,artifactSha256:CHECKPOINT.artifactSha256,evidenceBasis:'Pinned run reached staff proof only after explicit bytes, accounting and denial assertions passed'}:{})},
 finalCheckpointRun:{sourceRun:p.sourceRun,noNewPacketDownload:alreadyProven,newPacketDownloads:alreadyProven?0:1,staffQueueProof,denials,browserCompletion,reset:{...summarizeReset(reset),originalCookieUnavailable:true,sessionClosure:'separately authorized exact canonical clinic_end_assisted_session',closureActor:RESUME.owner,closureAuditRecords:after.sessionAudit.length},accountingUnchanged:true},staffQueueProof,before,after};
}
