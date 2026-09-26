import assert from 'node:assert/strict';
import fs from 'node:fs';
import { clinicWorkerContext } from './rcap-clinic-worker-context.mjs';
import { PARTNER_ID, EVENT_ID, packetCapacitySql, assertPacketCapacity } from './rcap-clinic-packet-capacity.mjs';
export const FUNCTION_HASHES={
  claim_packet_render_job:'c45a88a19b339ca0e6bfc730b9615450',
  release_expired_packet_render_claims:'12a7d55a1a81b81720686235ef018050',
  requeue_retryable_packet_render_jobs:'818bb49fc7a891df127b42bb76716704',
  finalize_packet_render_job:'124fa3e40a2955cdc361d035b93a14d5',
  sponsored_packet_render_authority:'0f24392f2362c5341a1649320672647e',
  finalize_sponsored_packet_generation_for_route:'e903408707c7bb7ee129251ed06208a2',
  record_packet_delivery_event:'af8bd4a95ecd4422663a2845a4afc442',
  guard_packet_render_job_transition:'282402bd4696c4393f6419a423c7d2ad',
  guard_packet_render_job_retry_history:'b9dada50ae4a49278970e0fee0ef42f4',
  guard_packet_render_job_delete:'4f2c83ee79ab27b76f51968e5f826c3d'};
export function closureAuthority() {
  const read=p=>JSON.parse(fs.readFileSync(p));
  return {candidate:read('data/rcap-grade-a/launch-control/RELEASE_CANDIDATE_BINDING.json'),
    binding:read('data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json'),
    grant:read('data/record-clearing/legal-decisions/2026-09-25-ms-nonconv-sponsored-preview.json'),
    workerStatic:read('data/rcap-grade-a/worker-static-authority.json')};
}
export function downstreamClosureSql(targetId) {
  assert.match(targetId,/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
  return `with target as (select * from public.packet_render_jobs where id='${targetId}')
    select jsonb_build_object('target',(select to_jsonb(j)-'fencing_token' from target j),
    'authority',(select to_jsonb(a) from target j cross join lateral public.sponsored_packet_render_authority(j.sponsored_route_key,j.sponsored_session_id,j.sponsored_consumer_briefcase_item_id,j.sponsored_consumer_auth_user_id) a),
    'route',(select to_jsonb(r) from public.sponsored_packet_render_routes r join target j on j.route_id=r.route_key),
    'verification',(select jsonb_build_object('status',v.status,'hash',v.verification_hash,'owner',v.consumer_auth_user_id,'matter',v.matter_id)
      from public.consumer_packet_verifications v join target j on j.sponsored_consumer_briefcase_item_id=v.briefcase_item_id),
    'namespace',(select jsonb_build_object('item',i.id,'owner',i.user_id,'session',s.session_id,'slot',s.claimed_slot_state,
      'case',c.id,'caseOwner',c.participant_user_id,'caseItem',c.matter_id,'caseSession',c.screening_session_id,'event',c.event_id,
      'eventName',e.name,'eventPartner',e.partner_slug,'sessionPartner',s.partner_slug)
      from target j join public.consumer_briefcase_items i on i.id=j.sponsored_consumer_briefcase_item_id
      join public.screening_sessions s on s.session_id=j.sponsored_session_id
      join public.clinic_cases c on c.matter_id=i.id and c.screening_session_id=s.session_id
      join public.clinic_events e on e.id=c.event_id),
    'capacity',(select capacity from (${packetCapacitySql()}) q),
    'provenance',(select count(*) from public.consumer_packet_artifact_provenance p join target j on p.briefcase_item_id=j.sponsored_consumer_briefcase_item_id or p.render_job_id=j.id),
    'generation',(select count(*) from public.rcap_screening_analytics_events e join target j on e.session_id=j.sponsored_session_id where e.event_type='packet_generated'),
    'delivery',(select count(*) from public.packet_delivery_events e join target j on j.id=e.render_job_id),
    'credit',(select count(*) from public.packet_credit_ledger l join target j on j.id=l.render_job_id),
    'bucket',(select jsonb_build_object('id',id,'public',public,'allowed_mime_types',allowed_mime_types,'file_size_limit',file_size_limit) from storage.buckets where id='rcap-packet-artifacts-private'),
    'functions',(select jsonb_object_agg(proname,md5(pg_get_functiondef(p.oid))) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
      where n.nspname='public' and proname in (${Object.keys(FUNCTION_HASHES).map(k=>`'${k}'`).join(',')}))) as closure`;
}
export function assertDownstreamClosure(s,{target,fixture,preview,runtime,supabaseUrl,claimOrder,housekeeping},authority=closureAuthority()) {
  const {grant,workerStatic}=authority;
  assert.equal(claimOrder.readOutcome,'read');assert.equal(claimOrder.targetIsClaimable,true);assert.equal(claimOrder.predictedFirstClaim,target.id);
  assert.equal(claimOrder.targetClaimRank,1);assert.equal(claimOrder.claimablePredecessors,0);assert.deepEqual(housekeeping,[]);
  const j=s.target;assert.equal(j.id,target.id);assert.equal(j.status,'queued');assert.equal(j.attempt_count,0);
  assert.equal(j.partner_id,PARTNER_ID);assert.equal(j.sponsored_clinic_event_id,EVENT_ID);
  for(const [key,value] of Object.entries({sponsored_consumer_briefcase_item_id:fixture.packetItemId,sponsored_consumer_auth_user_id:fixture.participantUserId,sponsored_session_id:fixture.screeningSessionId,sponsored_verification_hash:target.sponsored_verification_hash}))assert.equal(j[key],value,key);
  assert.equal(j.route_id,grant.routeId);assert.equal(j.sponsored_route_key,grant.routeId);
  const record=workerStatic.entries.find(e=>e.record.routeId===grant.routeId)?.record;
  assert.equal(record?.packetSpecification.sha256,grant.packetSpecificationSha256);
  assert.equal(s.route?.active,true);assert.equal(s.route.route_key,grant.routeId);assert.equal(s.route.partner_slug,grant.partnerSlug);
  assert.equal(s.route.packet_specification_sha256,record.packetSpecification.sha256);
  assert.equal(s.route.clinic_event_name,grant.eventName);
  assert.equal(s.authority?.valid,true,s.authority?.reason);assert.equal(s.authority.partner_id,PARTNER_ID);assert.equal(s.authority.partner_slug,grant.partnerSlug);assert.equal(s.authority.clinic_event_id,EVENT_ID);
  assert.equal(s.verification?.status,'verified');assert.equal(s.verification.hash,j.sponsored_verification_hash);assert.equal(s.verification.owner,fixture.participantUserId);assert.equal(s.verification.matter,j.matter_id);
  const n=s.namespace;assert.equal(n?.item,fixture.packetItemId);assert.equal(n.owner,fixture.participantUserId);assert.equal(n.session,fixture.screeningSessionId);assert.equal(n.slot,'claimed');
  assert.equal(n.case,s.authority.clinic_case_id);assert.equal(n.caseOwner,n.owner);assert.equal(n.caseItem,n.item);assert.equal(n.caseSession,n.session);assert.equal(n.event,EVENT_ID);assert.equal(n.eventName,grant.eventName);assert.equal(n.eventPartner,grant.partnerSlug);assert.equal(n.sessionPartner,grant.partnerSlug);
  const expected=clinicWorkerContext({preview,participantUserId:fixture.participantUserId,partnerSlug:grant.partnerSlug,eventId:EVENT_ID,eventName:grant.eventName},authority);
  assert.deepEqual(runtime,expected);assert.equal(supabaseUrl,`https://${grant.acceptanceProjectRef}.supabase.co`);
  const capacity=assertPacketCapacity(s.capacity);
  for(const k of ['provenance','generation','delivery','credit'])assert.equal(s[k],0,k);
  assert.equal(s.bucket?.id,'rcap-packet-artifacts-private');assert.equal(s.bucket.public,false);assert.deepEqual(s.bucket.allowed_mime_types,['application/pdf']);assert.equal(s.bucket.file_size_limit,52428800);
  assert.deepEqual(s.functions,FUNCTION_HASHES,'live lifecycle/finalizer fingerprint drift');
  return {passed:true,targetId:target.id,capacity,runtime,preview,functions:s.functions,bucket:s.bucket,measured:s};
}
