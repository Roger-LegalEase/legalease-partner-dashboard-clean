-- Exact existing-matter read-only verification; no intake/capacity/code-issuance eligibility gate.
-- A pins hyflxnlhpmiqxvvcoiia externally. Actual normal owner authentication is a separate browser proof.
begin transaction read only;
set local time zone 'UTC';
set local statement_timeout='15s';
with p as(select
 'e7c1d76e-dcf2-4d41-b585-ba164806f391'::uuid owner_id,'6765fcb9-586d-4abe-bc60-9f77f6a11e16'::uuid matter_id,
 '98fea483-9e4b-41bf-833b-1bf57e359fa6'::uuid pending_id,'56f6cbfa-3dd2-44b1-95bf-84c800396519'::uuid screening_id,
 '31b63a9d-7016-4b71-af1e-8b3426f142cc'::uuid case_id,'ad03264c-a40b-4217-b724-8851b39ce914'::uuid assistance_id,
 'fe7933ef-4255-4de2-ae84-0cac47c340ef'::uuid redemption_id,'28d6f858-bdb4-48bd-a3b6-4ea70b626b59'::uuid code_id,
 '292de01d-d377-4b92-b13f-5a49008d4455'::uuid claim_audit_id,'77000000-0000-4000-8000-000000000055'::uuid event_id),
m as(select t.* from public.consumer_briefcase_items t,p where t.id=p.matter_id),
n as(select t.* from public.consumer_pending_screening_results t,p where t.pending_id=p.pending_id),
s as(select t.* from public.screening_sessions t,p where t.session_id=p.screening_id),
cc as(select t.* from public.clinic_cases t,p where t.id=p.case_id),
a as(select t.* from public.clinic_assisted_sessions t,p where t.id=p.assistance_id),
red as(select t.* from public.clinic_event_access_redemptions t,p where t.id=p.redemption_id),
e as(select t.* from public.clinic_events t,p where t.id=p.event_id),
codes as(select t.* from public.clinic_event_access_codes t,p where t.event_id=p.event_id),
redemptions as(select t.* from public.clinic_event_access_redemptions t,p where t.event_id=p.event_id),
claim_events as(select t.* from public.participant_claim_events t,p where t.pending_result_id=p.pending_id or t.matter_id=p.matter_id),
counts as(select
 (select count(*) from m) matterRows,(select count(*) from n) pendingRows,(select count(*) from s) screeningRows,
 (select count(*) from cc) caseRows,(select count(*) from a) assistanceRows,
 (select count(*) from public.consumer_briefcase_items t,p where t.source_session_id=p.screening_id::text) mattersForSession,
 (select count(*) from public.consumer_pending_screening_results t,p where t.anonymous_session_id=p.screening_id) pendingForSession,
 (select count(*) from public.clinic_cases t,p where t.screening_session_id=p.screening_id) casesForSession,
 (select count(*) from s cross join lateral jsonb_object_keys(case when jsonb_typeof(s.answers::jsonb)='object' then s.answers::jsonb else '{}'::jsonb end) k) screeningAnswerCount,
 (select count(*) from n cross join lateral jsonb_object_keys(case when jsonb_typeof(n.screening_answers::jsonb)='object' then n.screening_answers::jsonb else '{}'::jsonb end) k) pendingAnswerCount,
 (select count(*) from m cross join lateral jsonb_object_keys(case when jsonb_typeof(m.artifact_refs_json#>'{commercialFlow,screening,answers}')='object' then m.artifact_refs_json#>'{commercialFlow,screening,answers}' else '{}'::jsonb end) k) matterScreeningAnswerCount,
 (select count(*) from codes) historyCodeCount,(select count(*) from redemptions) historyRedemptionCount,
 (select coalesce(sum(uses_count),0) from codes) historyUseCounters,
 (select count(*) from claim_events) linkedClaimAuditCount),
checks as(select
 current_user='postgres' and session_user='postgres' and current_setting('transaction_read_only')='on' as inspector_readonly,
 exists(select 1 from auth.users u where u.id=p.owner_id and u.email_confirmed_at is not null and u.deleted_at is null
   and coalesce((to_jsonb(u)->>'banned_until')::timestamptz<=now(),true)) as expected_owner_account_usable,
 k.matterRows=1 and k.pendingRows=1 and k.screeningRows=1 and k.caseRows=1 and k.assistanceRows=1 as exact_records_exist,
 k.mattersForSession=1 and k.pendingForSession=1 and k.casesForSession=1 as unique_existing_session_graph,
 exists(select 1 from m,n,s where m.user_id=p.owner_id and m.source_pending_result_id=n.pending_id and m.source_session_id=s.session_id::text
   and n.status='CLAIMED' and n.claimed_user_id=p.owner_id and n.claimed_matter_id=m.id and n.anonymous_session_id=s.session_id) as owned_claimed_source_links,
 exists(select 1 from cc,a,red,codes c where cc.matter_id=p.matter_id and cc.participant_user_id=p.owner_id and cc.screening_session_id=p.screening_id
   and cc.assisted_session_id=a.id and cc.event_id=p.event_id and a.participant_user_id=p.owner_id and a.screening_session_id=p.screening_id
   and a.event_id=p.event_id and red.event_id=p.event_id and red.access_code_id=p.code_id and red.assisted_session_id=a.id
   and c.id=p.code_id and c.event_id=p.event_id) as clinic_owner_event_session_linkage,
 exists(select 1 from a,n where a.participant_user_id=p.owner_id and a.screening_session_id=n.anonymous_session_id
   and a.consented_at is not null and length(btrim(a.consent_version))>0 and a.consented_at<=n.claimed_at and n.claimed_at<a.expires_at
   and(a.ended_at is null or n.claimed_at<a.ended_at)) as valid_recorded_consent_at_claim,
 exists(select 1 from claim_events t where t.id=p.claim_audit_id and t.event='claim_succeeded' and t.actor_user_id=p.owner_id
   and t.pending_result_id=p.pending_id and t.matter_id=p.matter_id) as exact_success_audit,
 exists(select 1 from m,n,cc where m.jurisdiction=n.jurisdiction and n.jurisdiction=cc.jurisdiction and m.jurisdiction='MS'
   and m.artifact_refs_json#>>'{commercialFlow,screening,pathwayId}'=n.result_payload->>'pathwayId'
   and n.result_payload->>'pathwayId'='non-conviction-expungement-for-dismissal-no-disposition-or-acquittal'
   and m.artifact_refs_json->>'selectedTrackId'='ms-nonconv' and m.result_code=n.result_code and m.result_code='packet_ready_with_caution') as canonical_route_matches,
 exists(select 1 from s where status='completed') as screening_completed,
 exists(select 1 from n where jsonb_typeof(screening_answers::jsonb)='object') and k.pendingAnswerCount=7 as pending_has_seven_answers,
 exists(select 1 from n,m where n.screening_answers::jsonb=m.artifact_refs_json#>'{commercialFlow,screening,answers}') as pending_saved_answers_match,
 exists(select 1 from m where jsonb_typeof(artifact_refs_json#>'{commercialFlow,screening,answers}')='object') and k.matterScreeningAnswerCount=7 as matter_has_seven_screening_answers,
 k.historyCodeCount=8 and k.historyRedemptionCount=22 and k.historyUseCounters=9 and k.historyRedemptionCount-k.historyUseCounters=13 as stored_history_counts_preserved
 from p cross join counts k),
business_rows as(select jsonb_build_object(
 'matter',(select to_jsonb(t) from m t),'pending',(select to_jsonb(t) from n t),'screening',(select to_jsonb(t) from s t),
 'case',(select to_jsonb(t) from cc t),'assistance',(select to_jsonb(t) from a t),'event',(select to_jsonb(t) from e t),
 'codes',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]'::jsonb) from codes t),
 'redemptions',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]'::jsonb) from redemptions t),
 'claim_audit',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]'::jsonb) from claim_events t),
 'event_audit',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]'::jsonb) from public.clinic_event_audit t where t.event_id=p.event_id),
 'followups',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]'::jsonb) from public.clinic_follow_ups t where t.clinic_case_id=p.case_id),
 'funding',(select coalesce(jsonb_agg(to_jsonb(t) order by briefcase_item_id),'[]'::jsonb) from public.clinic_packet_funding t where t.event_id=p.event_id),
 'reservations',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]'::jsonb) from public.clinic_packet_reservations t where t.event_id=p.event_id),
 'legacy_entitlement',(select to_jsonb(t) from public.partner_entitlement t where t.partner_slug='mvl-demo'),
 'packet_entitlement',(select to_jsonb(t) from public.partner_packet_entitlement t where t.id='77000000-0000-4000-8000-000000000058'),
 'credit_ledger',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]'::jsonb) from public.packet_credit_ledger t where t.entitlement_id='77000000-0000-4000-8000-000000000058'),
 'render_jobs',(select coalesce(jsonb_agg(to_jsonb(t) order by id),'[]'::jsonb) from public.packet_render_jobs t where t.sponsored_clinic_event_id=p.event_id or t.sponsored_consumer_briefcase_item_id=p.matter_id),
 'artifact_provenance',(select coalesce(jsonb_agg(to_jsonb(t) order by briefcase_item_id,render_job_id),'[]'::jsonb) from public.consumer_packet_artifact_provenance t where t.briefcase_item_id=p.matter_id),
 'verification',(select coalesce(jsonb_agg(to_jsonb(t) order by briefcase_item_id),'[]'::jsonb) from public.consumer_packet_verifications t where t.briefcase_item_id=p.matter_id)
 ) as value from p)
select jsonb_build_object(
 'execution_context',jsonb_build_object('current_user',current_user,'session_user',session_user,'transaction_read_only',current_setting('transaction_read_only')),
 'checks',to_jsonb(c),
 'businessFingerprint',encode(sha256(convert_to(b.value::text,'UTF8')),'hex'),
 'counts',jsonb_build_object('matterRows',k.matterRows,'pendingRows',k.pendingRows,'screeningRows',k.screeningRows,'caseRows',k.caseRows,'assistanceRows',k.assistanceRows,'mattersForSession',k.mattersForSession,'pendingForSession',k.pendingForSession,'casesForSession',k.casesForSession,'screeningAnswerCount',k.screeningAnswerCount,'pendingAnswerCount',k.pendingAnswerCount,'matterScreeningAnswerCount',k.matterScreeningAnswerCount,'historyCodeCount',k.historyCodeCount,'historyRedemptionCount',k.historyRedemptionCount,'historyUseCounters',k.historyUseCounters,'linkedClaimAuditCount',k.linkedClaimAuditCount),
 'identities',jsonb_build_object('ownerId',p.owner_id,'matterId',p.matter_id,'pendingId',p.pending_id,'screeningId',p.screening_id,'clinicCaseId',p.case_id,'assistanceId',p.assistance_id,'claimAuditId',p.claim_audit_id,'eventId',p.event_id),
 'observations',jsonb_build_object('observedAt',now(),'assistanceCurrentlyActive',exists(select 1 from a where status in('active','handed_off') and expires_at>now()),
   'assistanceExpiresAt',(select expires_at from a),'claimedAt',(select claimed_at from n),'matterStatus',(select status from m),
   'packetStatus',(select packet_status from m),'jurisdiction',(select jurisdiction from m),
   'pathwayId',(select artifact_refs_json#>>'{commercialFlow,screening,pathwayId}' from m),'selectedTrackId',(select artifact_refs_json->>'selectedTrackId' from m))
) as owned_matter_readonly from p cross join counts k cross join checks c cross join business_rows b;
commit;
