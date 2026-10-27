import assert from 'node:assert/strict';
import { captureOriginalResponseOnce, openScreeningWithProfile, runScreeningFromOriginalProfile, saveScreeningAndClaim } from './rcap-clinic-screening-profile.mjs';
import { createOriginalResponseObserver, originalResponseOperation, observedOriginalResponse } from './rcap-clinic-original-response.mjs';
import { answerBuilderStep } from './rcap-packet-builder-filler.mjs';
import { MS_NONCONVICTION_ROUTE, MS_NONCONVICTION_SCREENING_ANSWERS, MS_NONCONVICTION_PACKET_ANSWERS } from './lib/rcap-ms-nonconviction-fixture.mjs';

export const ORDINARY_PARTNER = 'legalease-ordinary-qa-20261024';
export const ORDINARY_PARTICIPANT = 'b6dc86a3-12bb-490d-b130-48d95d426a1e';
const priorMatters = ['d13233f6-d9c7-41e1-9bb5-8a454d747503', '6765fcb9-586d-4abe-bc60-9f77f6a11e16'];
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const hash = value => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
export function assertNewOrdinaryMatter(itemId) {
  assert.ok(uuid(itemId));
  assert.ok(!priorMatters.includes(itemId), 'Ordinary flow must use its own new matter');
}

// Native reader executes this exact query in the admitted acceptance project.
// The transaction is read-only; no answers from the protected packet are exported.
export function ordinaryReadbackSql(itemId, sessionId) {
  assertNewOrdinaryMatter(itemId); assert.ok(uuid(sessionId));
  return `BEGIN READ ONLY;
SELECT current_database() AS database_name, current_user AS database_user,
 current_setting('transaction_read_only') AS transaction_read_only,
 (SELECT jsonb_build_object('id',i.id,'user_id',i.user_id,'source_session_id',i.source_session_id,'jurisdiction',i.jurisdiction,'payment_allowed',i.payment_allowed,'payment_status',i.payment_status,'packet_status',i.packet_status) FROM public.consumer_briefcase_items i WHERE i.id='${itemId}') AS item,
 (SELECT jsonb_build_object('consumer_auth_user_id',s.consumer_auth_user_id,'briefcase_item_id',s.briefcase_item_id,'claimed_user_id',s.claimed_user_id,'claimed_at',s.claimed_at,'product',s.product,'partner_slug',s.partner_slug,'partner_benefit_active',s.partner_benefit_active,'jurisdiction',s.jurisdiction,'profile_version',s.profile_version,'screening_answers',s.screening_answers) FROM public.get_consumer_briefcase_presentation_source('${ORDINARY_PARTICIPANT}','${itemId}') s) AS source,
 (SELECT to_jsonb(a) FROM public.sponsored_packet_render_authority('${MS_NONCONVICTION_ROUTE.routeId}','${sessionId}','${itemId}','${ORDINARY_PARTICIPANT}') a) AS authority,
 (SELECT jsonb_build_object('consumer_auth_user_id',v.consumer_auth_user_id,'briefcase_item_id',v.briefcase_item_id,'revision',v.revision,'status',v.status,'verification_hash',v.verification_hash,'jurisdiction',coalesce(v.verification_snapshot,v.draft_snapshot)->>'jurisdiction','pathwayId',coalesce(v.verification_snapshot,v.draft_snapshot)->>'pathwayId') FROM public.consumer_packet_verifications v WHERE v.briefcase_item_id='${itemId}') AS verification,
 (SELECT coalesce(jsonb_agg(jsonb_build_object('id',j.id,'route_id',j.route_id,'renderer_kind',j.renderer_kind,'status',j.status,'attempt_count',j.attempt_count,'briefcase_item_id',j.briefcase_item_id,'sponsored_consumer_briefcase_item_id',j.sponsored_consumer_briefcase_item_id,'sponsored_consumer_auth_user_id',j.sponsored_consumer_auth_user_id,'sponsored_session_id',j.sponsored_session_id,'sponsored_clinic_event_id',j.sponsored_clinic_event_id,'sponsored_route_key',j.sponsored_route_key,'sponsored_verification_hash',j.sponsored_verification_hash,'output_storage_path',j.output_storage_path,'output_sha256',j.output_sha256) ORDER BY j.created_at,j.id),'[]'::jsonb) FROM public.packet_render_jobs j WHERE j.briefcase_item_id='${itemId}' OR j.sponsored_consumer_briefcase_item_id='${itemId}') AS jobs;
COMMIT;`;
}

export function assertOrdinarySavedState(row, itemId, sessionId, enqueued = false) {
  assertNewOrdinaryMatter(itemId); assert.ok(uuid(sessionId));
  assert.equal(row.transaction_read_only, 'on');
  assert.equal(row.database_name, 'postgres'); assert.equal(row.database_user, 'postgres');
  assert.equal(row.item?.id, itemId); assert.equal(row.item.user_id, ORDINARY_PARTICIPANT);
  assert.equal(row.item.source_session_id, sessionId); assert.equal(row.item.jurisdiction, 'MS');
  assert.equal(row.item.payment_allowed, false); assert.equal(row.item.payment_status, 'not_applicable');
  const s = row.source;
  assert.equal(s?.consumer_auth_user_id, ORDINARY_PARTICIPANT);
  assert.equal(s.claimed_user_id, ORDINARY_PARTICIPANT); assert.equal(s.briefcase_item_id, itemId);
  assert.ok(s.claimed_at); assert.equal(s.product, 'rcap_partner');
  assert.equal(s.partner_slug, ORDINARY_PARTNER); assert.equal(s.partner_benefit_active, true);
  assert.equal(s.jurisdiction, 'MS'); assert.equal(s.profile_version, MS_NONCONVICTION_ROUTE.profileVersion);
  assert.deepEqual(s.screening_answers, MS_NONCONVICTION_SCREENING_ANSWERS);
  assert.equal(row.authority?.valid, true); assert.equal(row.authority.partner_slug, ORDINARY_PARTNER);
  assert.equal(row.authority.clinic_event_id, null); assert.equal(row.authority.clinic_case_id, null);
  assert.ok(uuid(row.authority.partner_id));
  if (!enqueued) { assert.equal(row.jobs.length, 0); return; }
  const v = row.verification;
  assert.equal(v?.consumer_auth_user_id, ORDINARY_PARTICIPANT); assert.equal(v.briefcase_item_id, itemId);
  assert.equal(v.status, 'verified'); assert.ok(Number.isInteger(v.revision) && v.revision > 0);
  assert.ok(hash(v.verification_hash)); assert.equal(v.jurisdiction, 'MS');
  assert.equal(v.pathwayId, MS_NONCONVICTION_ROUTE.pathwayId);
  assert.equal(row.jobs.length, 1);
  const j = row.jobs[0]; assert.ok(uuid(j.id));
  assert.equal(j.briefcase_item_id, itemId); assert.equal(j.sponsored_consumer_briefcase_item_id, itemId);
  assert.equal(j.sponsored_consumer_auth_user_id, ORDINARY_PARTICIPANT);
  assert.equal(j.sponsored_session_id, sessionId); assert.equal(j.sponsored_clinic_event_id, null);
  assert.equal(j.route_id, MS_NONCONVICTION_ROUTE.routeId); assert.equal(j.sponsored_route_key, j.route_id);
  assert.equal(j.sponsored_verification_hash, v.verification_hash);
  assert.equal(j.renderer_kind, 'packet_document_v1'); assert.equal(j.status, 'queued');
  assert.equal(j.attempt_count, 0); assert.equal(j.output_storage_path, null); assert.equal(j.output_sha256, null);
}

export function ordinaryRequestAllowed({url,method,body}, {origin,targetItemId,sessionId,generationAllowed,generationCount}) {
  const u=new URL(url);
  if(method==='PUT')return u.origin===origin&&!u.username&&!u.password&&!u.hash&&!u.search&&u.pathname==='/api/expungement-ai/screening/progress'
    &&uuid(sessionId)&&body?.sessionId===sessionId&&Object.keys(body).sort().join(',')==='answers,currentQuestionId,profileVersion,sessionId,version'
    &&body.answers!==null&&typeof body.answers==='object'&&!Array.isArray(body.answers)&&typeof body.currentQuestionId==='string'&&body.currentQuestionId.length>0
    &&typeof body.profileVersion==='string'&&body.profileVersion.length>0&&hash(body.version);
  if (/(^|\.)stripe\.com$/i.test(u.hostname) || /\/(checkout|stripe)(\/|$)/i.test(u.pathname) || /\/api\/rcap\/packets\/[^/]+\/download$/.test(u.pathname) || /^\/api\/expungement-ai\/packet\/(download(?:-link)?|render)(?:\/|$)/.test(u.pathname)) return false;
  if (method==='POST' && u.pathname==='/api/expungement-ai/packet/generate') return u.origin===origin && generationAllowed===true && generationCount===1 && uuid(targetItemId) && body?.briefcaseItemId===targetItemId && Object.keys(body).length===1;
  return true;
}

import {NORMAL_RECOVERY,requireNormalRecoveryAdmission} from './ordinary-normal-recovery-profile.mjs';
export const ORDINARY_APPLICATION_SHA = '9aadacd0c5a7fac90a1662f1928b7b86f8685c7a';
const matches = (r, path) => r.request().method() === 'POST' && new URL(r.url()).pathname === path;
const authOrigin = 'https://hyflxnlhpmiqxvvcoiia.supabase.co';
const itemFromPath = path => /^\/briefcase\/matters\/([0-9a-f-]{36})$/i.exec(path)?.[1];
export function assertOrdinaryAdmission(binding,origin,profile) {
  assert(profile===undefined||profile===NORMAL_RECOVERY);if(profile)requireNormalRecoveryAdmission(binding);
  assert.equal(binding?.actualStartSucceeded,true,'Actual current normal Start binding is required');
  assert.equal(binding.applicationSha,profile?.app??ORDINARY_APPLICATION_SHA);assert.equal(binding.origin,origin);
  assert.equal(binding.partnerSlug,ORDINARY_PARTNER);assert.equal(binding.participantUserId,ORDINARY_PARTICIPANT);
  assert.match(binding.deploymentId??'',/^dpl_[A-Za-z0-9]+$/);assert.ok(hash(binding.sourceBindingSha256));
}
export function ordinaryClaimReconciliationSql(sessionId) {
  assert.ok(uuid(sessionId));
  return `BEGIN READ ONLY; SET LOCAL statement_timeout='15s';
SELECT current_database() AS database_name,current_user AS database_user,current_setting('transaction_read_only') AS transaction_read_only,
(SELECT coalesce(jsonb_agg(jsonb_build_object('itemId',i.id,'sessionId',p.anonymous_session_id,'owner',i.user_id,'product',p.product,'partnerSlug',p.partner_slug,'eventId',p.event_id,'status',p.status) ORDER BY i.id),'[]'::jsonb)
 FROM public.consumer_pending_screening_results p JOIN public.consumer_briefcase_items i ON i.id=p.claimed_matter_id AND i.source_pending_result_id=p.pending_id
 WHERE p.anonymous_session_id='${sessionId}' AND p.status='CLAIMED' AND p.claimed_user_id=i.user_id) AS matches; COMMIT;`;
}

// Resume only the accepted empty session checkpoint; never reserve another slot.
const EMPTY_SESSION_ID='951130b5-c793-48b1-ab4c-a1e6404d42e3';
const EMPTY_SESSION_REQUEST_ID='1f45c858-8d6b-459d-a761-40a4fc4019da';
export function ordinaryEmptySessionReconciliationSql(sessionId){
  assert.equal(sessionId,EMPTY_SESSION_ID,'Only the actual preserved empty screening may resume');
  return `BEGIN READ ONLY; SET LOCAL statement_timeout='15s'; SELECT current_database() AS database_name,current_user AS database_user,now() AS observed_at,current_setting('transaction_read_only') AS read_only,
    s.session_id,s.created_at,s.updated_at,s.jurisdiction,s.partner_slug,s.flow_mode,s.status,s.claimed_slot_state,s.partner_benefit_active,s.current_question_id,s.furthest_stage,s.last_drop_question,
    (SELECT count(*) FROM jsonb_object_keys(coalesce(s.answers,'{}'::jsonb))) AS answer_count,
    (SELECT coalesce(jsonb_agg(k ORDER BY k),'[]'::jsonb) FROM jsonb_object_keys(coalesce(s.answers,'{}'::jsonb)) k) AS answer_ids,
    encode(extensions.digest(convert_to(coalesce(s.answers,'{}'::jsonb)::text,'utf8'),'sha256'),'hex') AS answers_sha256,
    s.resume_email IS NOT NULL AS has_resume_email,s.resume_token_hash IS NOT NULL AS has_resume_token,s.entry_request_hash IS NOT NULL AS has_entry_request_hash,s.entry_request_fingerprint IS NOT NULL AS has_entry_fingerprint,
    (SELECT count(*) FROM public.consumer_pending_screening_results p WHERE p.anonymous_session_id::text=s.session_id::text) AS pending_count,
    (SELECT count(*) FROM public.consumer_briefcase_items i WHERE i.source_session_id::text=s.session_id::text) AS claimed_item_count,
    (SELECT count(*) FROM public.packet_render_jobs j WHERE j.sponsored_session_id::text=s.session_id::text) AS job_count,
    (SELECT count(*) FROM public.clinic_assisted_sessions c WHERE c.screening_session_id::text=s.session_id::text) AS clinic_association_count
    FROM public.screening_sessions s WHERE s.session_id='${sessionId}'; COMMIT;`;
}
export function assertEmptyOrdinarySessionResume(custody,row){
  assert.equal(custody.stage,'ordinary_session_started');assert.equal(custody.sessionId,EMPTY_SESSION_ID);assert.equal(custody.intakeRequestId,EMPTY_SESSION_REQUEST_ID);
  assert.equal(custody.sourceBindingSha256,'f89b4595532bcefd72fe06b67505370858d9e96e73c11f9b677cfd48b3076d34');assert.equal(custody.itemId,null);assert.equal(custody.firstEnqueueCapableActionAt,null);assert.equal(custody.generationRequests,0);
  for(const[k,v]of Object.entries({read_only:'on',database_name:'postgres',database_user:'postgres',session_id:EMPTY_SESSION_ID,jurisdiction:'MS',partner_slug:ORDINARY_PARTNER,flow_mode:'rcap',status:'in_progress',claimed_slot_state:'claimed',partner_benefit_active:true,current_question_id:null,furthest_stage:null,last_drop_question:null,has_resume_email:false,has_resume_token:false,has_entry_request_hash:true,has_entry_fingerprint:true}))assert.equal(row[k],v,k);
  for(const k of ['answer_count','pending_count','claimed_item_count','job_count','clinic_association_count'])assert.equal(row[k],0,k);
  assert.deepEqual(row.answer_ids,[]);assert.equal(row.answers_sha256,'44136fa355b3678a1146ad16f7e8649e94fb4fc21fe77e8310c060f61caaff8a');
  const created=Date.parse(row.created_at);assert(Number.isFinite(created));assert.equal(Date.parse(row.updated_at),created);
  const observed=Date.parse(row.observed_at);assert(Number.isFinite(observed)&&observed<=Date.now()&&Date.now()-observed<120000,'Fresh exact-session reconciliation required');
}

function assertCustody(record,binding) {
  assert.equal(record?.schema,'ordinary-participant-private-custody/v1');
  for(const key of ['origin','applicationSha','deploymentId','sourceBindingSha256'])assert.equal(record[key],binding[key],'Custody belongs to a different admitted release');
  assert.equal(record.participantUserId,ORDINARY_PARTICIPANT);assert.equal(record.partnerSlug,ORDINARY_PARTNER);
  assert.equal(typeof record.stage,'string');assert.ok(Number.isInteger(record.generationRequests)&&record.generationRequests>=0&&record.generationRequests<=1);
  if(record.itemId!==null)assertNewOrdinaryMatter(record.itemId);if(record.sessionId!==null)assert.ok(uuid(record.sessionId));
}

// The controller owns durable private custody, actual live admission and strict
// actor/origin policy. Imports do not create a case, claim, verify or run a worker.
export async function runOrdinaryParticipant({page,anonymousPage,strangerPage,origin,email,password,admit,assertExclusiveWindow,verifyPreparedImageBeforeVerify,readNative,checkpoint,loadCustody,authorizeRequest,bypass='',profile,onParticipantPhase,onParticipantObservation}) {
  for(const fn of [admit,assertExclusiveWindow,verifyPreparedImageBeforeVerify,readNative,checkpoint,loadCustody,authorizeRequest])assert.equal(typeof fn,'function');
  assert.equal(typeof RegExp.escape,'function','Accepted screening driver requires a supported runtime before any intake action');
  assert.equal(new URL(origin).origin,origin);assert.equal(new URL(origin).protocol,'https:');assert.ok(email&&password);
  const phase=async name=>{if(onParticipantPhase)await onParticipantPhase(name);};
  await phase('participant_admission');const binding=await admit();assertOrdinaryAdmission(binding,origin,profile);
  await phase('participant_custody');const previous=await loadCustody();if(previous)assertCustody(previous,binding);
  let sessionId=previous?.sessionId??null,targetItemId=previous?.itemId??null,intakeRequestId=previous?.intakeRequestId??null;
  let firstEnqueueCapableActionAt=previous?.firstEnqueueCapableActionAt??null,generationRequests=previous?.generationRequests??0;
  if(previous&&!targetItemId)assert.ok(uuid(sessionId),'Uncertain intake requires native reconciliation; never start again');
  let generationAllowed=false,generationCount=0,pendingCount=0,claimCount=0,unexpectedRequest=false,resumeEmptySession=false;
  const save=async(stage,details={})=>{
    const record={schema:'ordinary-participant-private-custody/v1',origin,applicationSha:binding.applicationSha,deploymentId:binding.deploymentId,sourceBindingSha256:binding.sourceBindingSha256,participantUserId:ORDINARY_PARTICIPANT,partnerSlug:ORDINARY_PARTNER,sessionId,itemId:targetItemId,intakeRequestId,firstEnqueueCapableActionAt,generationRequests,stage,...details};
    await checkpoint(record);assert.deepEqual(await loadCustody(),record,'Private checkpoint must be durable before forwarding');return record;
  };
  const config={origin,authOrigin};
  const observer=createOriginalResponseObserver(config,{bypass,...(onParticipantObservation?{onStage:e=>{if(e.operation==='signin'&&Number.isInteger(e.httpStatus))onParticipantObservation({authRequestStatus:e.httpStatus});}}:{})});
  const guard=async route=>{
    const request=route.request(),u=new URL(request.url()),method=request.method();
    const generate=method==='POST'&&u.pathname==='/api/expungement-ai/packet/generate';
    if(generate){generationCount++;generationRequests++;}
    let body=null;try{body=request.postDataJSON();}catch{}
    if(!ordinaryRequestAllowed({url:request.url(),method,body},{origin,targetItemId,sessionId,generationAllowed,generationCount:generationRequests})||await authorizeRequest(request,{origin,participantUserId:ORDINARY_PARTICIPANT,targetItemId,sessionId})!==true){unexpectedRequest=true;await route.abort();return;}
    if(method==='POST'&&u.origin===origin&&u.pathname==='/api/expungement-ai/screening/pending'){
      pendingCount++;if((previous&&!resumeEmptySession)||pendingCount!==1||body?.anonymousSessionId!==sessionId){unexpectedRequest=true;await route.abort();return;}
    }
    if(method==='POST'&&u.origin===origin&&u.pathname==='/api/expungement-ai/screening/pending/claim'){
      claimCount++;if((previous&&!resumeEmptySession)||claimCount!==1){unexpectedRequest=true;await route.abort();return;}
    }
    if(generate)await save('ordinary_generate_before_forward');
    if(!originalResponseOperation(request,config))return route.fallback();
    return observer({request:()=>request,fetch:options=>route.fetch(options),abort:reason=>route.abort(reason),fallback:()=>route.fallback(),fulfill:async value=>{
      const observed=observedOriginalResponse(request);
      if(observed?.operation==='claim'&&observed.accepted){assertNewOrdinaryMatter(observed.matterId);targetItemId=observed.matterId;await save('ordinary_claim_response_observed');}
      return route.fulfill(value);
    }});
  };
  await phase('participant_routes');await page.route('**/*',guard);
  try {
    await phase('owner_signin_observer');const signin=captureOriginalResponseOnce(page,'signin',config);
    try {
      await phase('owner_signin_navigation');await page.goto(`${origin}/expungement-ai/sign-in?mode=signin&next=%2Fbriefcase`);
      if(onParticipantObservation)onParticipantObservation(await page.evaluate(()=>{const form=document.querySelector('form:has(input[name="password"])');const button=Array.from(document.querySelectorAll('button')).find(b=>b.textContent?.trim()==='Sign in');return{formHandlerReady:form?.getAttribute('data-handler-ready')==='true',signInButtonEnabled:!!button&&!button.disabled};}));
      await phase('owner_signin_fill_email');await page.locator('input[name="email"]').fill(email);await phase('owner_signin_fill_password');await page.locator('input[name="password"]').fill(password);
      await phase('owner_signin_click');await page.getByRole('button',{name:'Sign in',exact:true}).click();
      await phase('owner_signin_response');assert.equal((await signin.read()).userId,ORDINARY_PARTICIPANT,'Normal sign-in must resolve to the approved owner');
      await phase('owner_briefcase_navigation');await page.waitForURL(u=>u.origin===origin&&u.pathname==='/briefcase');
    }finally{signin.dispose();}
    if(previous){
      if(!targetItemId){
        assert.ok(uuid(sessionId),'Uncertain intake requires native reconciliation; never start again');
        const reconciled=await readNative(ordinaryClaimReconciliationSql(sessionId));
        assert.equal(reconciled.transaction_read_only,'on');assert.equal(reconciled.database_name,'postgres');assert.equal(reconciled.database_user,'postgres');assert.ok(Array.isArray(reconciled.matches));
        if(reconciled.matches.length===0&&previous.stage==='ordinary_session_started'){
          const native=await readNative(ordinaryEmptySessionReconciliationSql(sessionId));assertEmptyOrdinarySessionResume(previous,native);resumeEmptySession=true;
        }else{
        assert.equal(reconciled.matches.length,1,'Uncertain result must not repeat screening or claim');
        const matched=reconciled.matches[0];assert.equal(matched.sessionId,sessionId);assert.equal(matched.owner,ORDINARY_PARTICIPANT);assert.equal(matched.partnerSlug,ORDINARY_PARTNER);assert.equal(matched.product,'rcap_partner');assert.equal(matched.eventId,null);assert.equal(matched.status,'CLAIMED');assertNewOrdinaryMatter(matched.itemId);targetItemId=matched.itemId;
        await save('ordinary_claim_reconciled_same_owned_case');
        }
      }
    }
    if(!previous||resumeEmptySession){
      let captured;
      if(resumeEmptySession){
        captured=await openScreeningWithProfile(page,config,async()=>{
          const response=await page.goto(`${origin}/expungement-ai/screening/ms?session=${sessionId}`);assert.equal(response.status(),200);
          await page.waitForURL(u=>u.origin===origin&&u.pathname==='/expungement-ai/screening/ms'&&u.searchParams.getAll('session').length===1&&u.searchParams.get('session')===sessionId);
          await save('ordinary_empty_session_resumed');
        });
      }else{
      await phase('public_landing_navigation');const landing=await page.goto(`${origin}/p/${ORDINARY_PARTNER}`);assert.equal(landing.status(),200);
      await phase('intake_get_navigation');await page.locator(`a[href="/intake/${ORDINARY_PARTNER}"]`).first().click();await page.waitForURL(u=>u.origin===origin&&u.pathname===`/intake/${ORDINARY_PARTNER}`);
      await phase('intake_request_id_read');intakeRequestId=await page.locator('input[name="requestId"]').inputValue();assert.ok(uuid(intakeRequestId));
      await phase('before_durable_intake_checkpoint');
      await save('ordinary_before_intake_start');
      captured=await openScreeningWithProfile(page,config,async()=>{
        await page.getByRole('button',{name:'Start free screening',exact:true}).click();
        await page.waitForURL(u=>u.origin===origin&&u.pathname==='/expungement-ai/screening/ms');
        const url=new URL(page.url());assert.equal(url.searchParams.getAll('session').length,1);sessionId=url.searchParams.get('session');assert.ok(uuid(sessionId));await save('ordinary_session_started');
      });
      }
      try{const screening=await runScreeningFromOriginalProfile(page,captured);await save('ordinary_screening_completed',{answeredQuestionIds:screening.answeredQuestionIds,omittedQuestionIds:screening.omittedQuestionIds});}finally{captured.dispose();}
      await page.locator('[data-partner-context="saved"]').waitFor();await save('ordinary_before_pending_and_claim');
      const {claimed}=await saveScreeningAndClaim(page,config);assertNewOrdinaryMatter(claimed.matterId);assert.equal(claimed.redirectTo,`/briefcase/matters/${claimed.matterId}`);
      await page.waitForURL(u=>u.origin===origin&&itemFromPath(u.pathname)===claimed.matterId);
      targetItemId=claimed.matterId;await save('ordinary_matter_claimed');
    }
    const itemId=targetItemId;assertNewOrdinaryMatter(itemId);assert.ok(uuid(sessionId));
    const native=async enqueued=>{const row=await readNative(ordinaryReadbackSql(itemId,sessionId));assertOrdinarySavedState(row,itemId,sessionId,enqueued);return row;};
    const existing=await readNative(ordinaryReadbackSql(itemId,sessionId));
    if(existing.jobs?.length){
      assertOrdinarySavedState(existing,itemId,sessionId,true);assert(previous,'New flow must not borrow an existing job');assert.ok(Number.isFinite(Date.parse(firstEnqueueCapableActionAt))&&Date.parse(firstEnqueueCapableActionAt)<=Date.now(),'Original enqueue boundary custody required');
      await assertExclusiveWindow();
      const receipt={stage:'ordinary_enqueued_worker_handoff_required',itemId,sessionId,participantUserId:ORDINARY_PARTICIPANT,partnerSlug:ORDINARY_PARTNER,eventId:null,jobId:existing.jobs[0].id,verificationHash:existing.verification.verification_hash,revision:existing.verification.revision,generationRequests,generationRequestsThisInvocation:0,firstEnqueueCapableActionAt,saves:0,journeyComplete:false,resumed:true};await save(receipt.stage,receipt);return receipt;
    }
    assertOrdinarySavedState(existing,itemId,sessionId,false);
    assert.equal(generationRequests,0,'Uncertain prior generation requires reconciliation, never re-enqueue');
    assert.notEqual(existing.verification?.status,'verified','Verified-but-not-queued outcome requires reconciliation, never repeat Verify');
    const endpoint=`/api/expungement-ai/briefcase/${itemId}/packet-information`;
    const readOwner = async () => page.evaluate(async path=>{const r=await fetch(path,{cache:'no-store'});return {status:r.status,body:await r.json()};},endpoint);
    const apiStatus = async other => other.evaluate(async path=>(await fetch(path,{cache:'no-store'})).status,`${origin}${endpoint}`);
    await anonymousPage.goto(`${origin}/briefcase`);
    await strangerPage.goto(`${origin}/briefcase`);
    assert.equal(await apiStatus(anonymousPage),401);assert.equal(await apiStatus(strangerPage),404);
    if(previous)await page.goto(`${origin}/briefcase/${itemId}/packet-information`);
    else await page.getByRole('link',{name:'Complete packet information',exact:true}).click();
    await page.waitForURL(u=>u.origin===origin && u.pathname===`/briefcase/${itemId}/packet-information`);
    let saves=0;
    for(;saves<80 && new URL(page.url()).pathname.endsWith('/packet-information');saves++) {
      await answerBuilderStep(page,{routeKey:MS_NONCONVICTION_ROUTE.routeId});
      const review=page.getByRole('button',{name:'Review packet facts',exact:true});
      const continueButton=await review.isVisible() ? review : page.getByRole('button',{name:'Save and continue',exact:true});
      await save('ordinary_packet_save_pending',{saveIndex:saves});
      let request,saved;
      const observed={buttonVisible:null,buttonEnabled:null,clickStarted:false,clickReturned:false,saveRequestObserved:false,responseObserved:false,responseStatus:null,responseWaitMatched:false,requestFailure:null};
      const exactSaveRequest=r=>{try{const u=new URL(r.url());return r.method()==='POST'&&u.origin===origin&&u.pathname===endpoint&&!u.search&&!u.hash&&!u.username&&!u.password;}catch{return false;}};
      const onSaveRequest=r=>{if(exactSaveRequest(r))observed.saveRequestObserved=true;};
      const onSaveResponse=r=>{if(exactSaveRequest(r.request())){observed.responseObserved=true;const status=r.status();observed.responseStatus=Number.isInteger(status)&&status>=100&&status<=599?status:null;}};
      const onSaveFailed=r=>{if(exactSaveRequest(r)){observed.saveRequestObserved=true;observed.requestFailure=r.failure()?.errorText==='net::ERR_ABORTED'?'netERR_ABORTED':'transport_other';}};
      page.on('request',onSaveRequest);page.on('response',onSaveResponse);page.on('requestfailed',onSaveFailed);
      try {
        observed.buttonVisible=await continueButton.isVisible();observed.buttonEnabled=await continueButton.isEnabled();
        [request,saved]=await Promise.all([
          page.waitForRequest(r=>r.method()==='POST' && new URL(r.url()).pathname===endpoint),
          page.waitForResponse(r=>matches(r,endpoint)).then(r=>{observed.responseWaitMatched=true;return r;}),
          (async()=>{observed.clickStarted=true;await continueButton.click();observed.clickReturned=true;})()
        ]);
      } finally {
        page.off('request',onSaveRequest);page.off('response',onSaveResponse);page.off('requestfailed',onSaveFailed);
        const validation=await page.locator("[data-packet-information-builder='active']").evaluate((node,knownIds)=>{
          const visible=element=>{const box=element.getBoundingClientRect();return box.width>0&&box.height>0;};
          const invalid=[...node.querySelectorAll('[aria-invalid="true"]')].filter(visible);
          const invalidIds=invalid.map(element=>element.closest('[data-packet-question]')?.getAttribute('data-packet-question'));
          const errors=[...node.querySelectorAll('[role="alert"][id^="q-"][id$="-error"]')].filter(visible);
          const requiredCopy=['Please answer this question. You can choose an unsure option when available.','Responda esta pregunta. Si no sabe la respuesta, puede elegir la opción que lo indica cuando esté disponible.'];
          const reviewCopy=['Review this answer.','Revise esta respuesta.'];
          const validationCodes=errors.map(element=>({questionId:element.id.slice(2,-6),code:requiredCopy.includes(element.textContent?.trim())?'required_answer':reviewCopy.includes(element.textContent?.trim())?'review_answer':'unrecognized_validation'})).filter(value=>knownIds.includes(value.questionId));
          const knownQuestionIds=[...node.querySelectorAll('[data-packet-question]')].filter(visible).map(element=>element.getAttribute('data-packet-question')).filter(id=>knownIds.includes(id));
          const requiredValidationQuestionIds=[...new Set(validationCodes.filter(value=>value.code==='required_answer').map(value=>value.questionId))];
          return {visibleKnownQuestionIds:[...new Set(knownQuestionIds)],visibleInvalidControlCount:invalid.length,invalidQuestionIds:[...new Set(invalidIds.filter(id=>knownIds.includes(id)))],visibleValidationErrorCount:errors.length,requiredValidationQuestionIds,visibleRequiredValidationCount:requiredValidationQuestionIds.length,validationCodes};
        },Object.keys(MS_NONCONVICTION_PACKET_ANSWERS)).catch(()=>null);
        const classification=observed.responseObserved?(observed.responseWaitMatched?'response_matched':'response_unmatched'):observed.requestFailure?'post_failed':!observed.saveRequestObserved?(validation&&(validation.visibleInvalidControlCount>0||validation.visibleValidationErrorCount>0)?'client_validation':'button_no_post'):null;
        await checkpoint({schemaVersion:'ordinary-packet-save-observation/v1',saveIndex:saves,...observed,classification,validationObservationAvailable:validation!==null,...validation});
      }
      const submitted=request.postDataJSON();
      assert.ok(Number.isInteger(submitted.expectedRevision));assert.ok(!submitted.verify);
      assert.equal(saved.status(),200);
      const body=await saved.json();assert.equal(body.ok,true);assert.ok(body.revision>=submitted.expectedRevision);
      await save('ordinary_packet_saved',{expectedRevision:submitted.expectedRevision,revision:body.revision,saveIndex:saves});
      // Server owner read + reload proves persistence and ordinary save/resume.
      const before=await readOwner();assert.equal(before.status,200);assert.equal(before.body.revision,body.revision);
      await page.reload();
      const after=await readOwner();assert.equal(after.status,200);assert.deepEqual(after.body.answers,before.body.answers);assert.equal(after.body.revision,before.body.revision);
    }
    await page.waitForURL(u=>u.origin===origin && u.pathname===`/briefcase/${itemId}/review`);
    assert.equal(await page.locator('[data-packet-verification-state]').getAttribute('data-packet-verification-state'),'unverified');
    assert.equal(generationCount,0);assert.equal(unexpectedRequest,false);
    await native(false);
    // Sponsored Verify auto-enqueues. Hold the entire producer/consumer window first.
    const currentBinding=await admit();assertOrdinaryAdmission(currentBinding,origin,profile);for(const key of ['applicationSha','origin','deploymentId','sourceBindingSha256'])assert.equal(currentBinding[key],binding[key],'Admission changed during the owned case');await assertExclusiveWindow();await verifyPreparedImageBeforeVerify();
    firstEnqueueCapableActionAt=new Date().toISOString();await save('ordinary_verification_and_enqueue_pending');
    generationAllowed=true;
    const verification=page.waitForResponse(r=>matches(r,endpoint));
    const generation=page.waitForResponse(r=>matches(r,'/api/expungement-ai/packet/generate'));
    await page.getByRole('button',{name:'Verify and prepare clinic packet',exact:true}).click();
    const verified=await verification;assert.equal(verified.status(),200);
    const vb=await verified.json();assert.equal(vb.ok,true);assert.equal(vb.readyToGenerate,true);assert.equal(vb.commercialActions?.generationAllowed,true);assert.equal(vb.commercialActions?.checkoutAllowed,false);
    const generated=await generation;assert.equal(generated.status(),200);
    const gb=await generated.json();assert.equal(gb.briefcaseItemId,itemId);assert.equal(gb.packetStatus,'generating');assert.equal(gb.canDownload,false);
    generationAllowed=false;assert.equal(generationCount,1);assert.equal(unexpectedRequest,false);
    const queued=await native(true);await assertExclusiveWindow();
    const receipt={stage:'ordinary_enqueued_worker_handoff_required',itemId,sessionId,participantUserId:ORDINARY_PARTICIPANT,partnerSlug:ORDINARY_PARTNER,eventId:null,jobId:queued.jobs[0].id,verificationHash:queued.verification.verification_hash,revision:queued.verification.revision,generationRequests,generationRequestsThisInvocation:generationCount,firstEnqueueCapableActionAt,saves,journeyComplete:false};
    await save(receipt.stage,receipt);return receipt;
  } finally {
    // A delayed retry must remain blocked until the controller closes this context.
    generationAllowed=false;
  }
}
