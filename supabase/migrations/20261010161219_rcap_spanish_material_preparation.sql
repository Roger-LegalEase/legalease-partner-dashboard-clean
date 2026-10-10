-- Public-copy provenance and a bounded provider reservation reuse the canonical
-- configuration and idempotency stores. No records or approvals are backfilled.
begin;
create or replace function public.rcap_program_public_copy_source(p_workspace uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 select jsonb_build_object('english',jsonb_build_object(
  'headline',coalesce(s#>>'{brand_public_page,program_headline}',''),
  'subheadline',coalesce(s#>>'{brand_public_page,program_subheadline}',''),
  'organizationDescription',coalesce(s#>>'{brand_public_page,approved_organization_description}',''),
  'primaryActionLabel',coalesce(s#>>'{brand_public_page,primary_cta_label}',''),
  'participantSupportCopy',coalesce(s#>>'{brand_public_page,participant_support_copy}',''),
  'serviceArea',coalesce(s#>>'{geography_audience_language_accessibility,service_area_description}',''),
  'targetAudience',coalesce(s#>>'{program_goals,target_population}','')),
  'identity',jsonb_build_object('organization',coalesce(s#>>'{organization_contacts,public_organization_name}',s#>>'{organization_contacts,legal_organization_name}',''),'program',coalesce(s#>>'{organization_contacts,public_program_name}','')),
  'jurisdictions',coalesce(s#>'{geography_audience_language_accessibility,jurisdictions}','[]'),
  'services',coalesce(s#>>'{program_goals,service_mode}','documented_services'))
 from (select public.rcap_program_policy_source(p_workspace) s) source
$$;
revoke all on function public.rcap_program_public_copy_source(uuid) from public,anon,authenticated;
grant execute on function public.rcap_program_public_copy_source(uuid) to service_role;

create or replace function public.rcap_service_reserve_program_translation(p_slug text,p_actor uuid,p_version bigint,p_source jsonb,p_request uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare w public.partner_onboarding%rowtype; snapshot jsonb;
begin
 select * into strict w from public.partner_onboarding where partner_slug=p_slug for update;
 snapshot:=public.rcap_service_get_program_configuration(p_slug,p_actor);
 if not exists(select 1 from public.partner_users where auth_user_id=p_actor and status='active' and ((partner_slug=p_slug and role='partner_admin') or (partner_slug is null and role='internal_admin'))) then raise exception 'administrator required' using errcode='42501';end if;
 if w.rcap_policy_version<>'rcap2.2' or w.status in ('live','paused','closed') then raise exception 'program not editable' using errcode='55000';end if;
 if p_version is distinct from w.aggregate_version or p_source is distinct from public.rcap_program_public_copy_source(w.id) then raise exception 'public source changed' using errcode='PT409';end if;
 if exists(select 1 from public.partner_onboarding_idempotency where workspace_id=w.id and operation_key='program_translation' and result_status='started' and expires_at>now()) then raise exception 'Spanish preparation is in progress. Retry in a minute.' using errcode='55P03';end if;
 -- Serialize per actor as well as workspace: parallel workspaces cannot evade the limit.
 perform pg_advisory_xact_lock(hashtextextended(p_actor::text,76102));
 if (select count(*) from public.partner_onboarding_idempotency where operation_key='program_translation' and created_at>now()-interval '10 minutes' and (workspace_id=w.id or actor_user_id=p_actor))>=5 then raise exception 'Spanish preparation limit reached. Retry in ten minutes.' using errcode='P0001';end if;
 insert into public.partner_onboarding_idempotency(workspace_id,operation_key,request_id,actor_user_id,payload_hash,result_status,expires_at)
 values(w.id,'program_translation',p_request,p_actor,encode(sha256(convert_to(p_source::text,'UTF8')),'hex'),'started',now()+interval '60 seconds');
end $$;
revoke all on function public.rcap_service_reserve_program_translation(text,uuid,bigint,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.rcap_service_reserve_program_translation(text,uuid,bigint,jsonb,uuid) to service_role;

create or replace function public.rcap_service_save_program_translation(p_slug text,p_actor uuid,p_version bigint,p_source jsonb,p_copy jsonb,p_request uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare w public.partner_onboarding%rowtype; snapshot jsonb; stored jsonb; proposed jsonb; changes jsonb; k text; field_name text; value jsonb; reservation public.partner_onboarding_idempotency%rowtype;
 mapping constant jsonb:='{"headline":"program_headline_es","subheadline":"program_subheadline_es","organizationDescription":"approved_organization_description_es","primaryActionLabel":"primary_cta_label_es","participantSupportCopy":"participant_support_copy_es","serviceArea":"service_area_es","targetAudience":"target_audience_es"}';
begin
 select * into strict w from public.partner_onboarding where partner_slug=p_slug for update;
 snapshot:=public.rcap_service_get_program_configuration(p_slug,p_actor);
 if not exists(select 1 from public.partner_users where auth_user_id=p_actor and status='active' and ((partner_slug=p_slug and role='partner_admin') or (partner_slug is null and role='internal_admin'))) then raise exception 'administrator required' using errcode='42501';end if;
 select * into reservation from public.partner_onboarding_idempotency where request_id=p_request;
 if found then
  if reservation.workspace_id<>w.id or reservation.actor_user_id<>p_actor or reservation.operation_key not in ('program_translation','program_translation_reuse') or reservation.payload_hash<>encode(sha256(convert_to(p_source::text,'UTF8')),'hex') then raise exception 'translation request mismatch' using errcode='42501';end if;
  if reservation.result_status='succeeded' then return snapshot;end if;
  if reservation.result_status<>'started' or reservation.expires_at<=now() then raise exception 'translation attempt expired; retry' using errcode='PT409';end if;
 end if;
 if w.rcap_policy_version<>'rcap2.2' or w.status in ('live','paused','closed') then raise exception 'program not editable' using errcode='55000';end if;
 if p_version is distinct from w.aggregate_version or p_source is distinct from public.rcap_program_public_copy_source(w.id) then raise exception 'public source changed' using errcode='PT409';end if;
 if p_copy is null or jsonb_typeof(p_copy)<>'object' or (select count(*) from jsonb_object_keys(p_copy))<>7 then raise exception 'seven public fields required' using errcode='22023';end if;
 stored:=coalesce(snapshot#>'{data,brand_public_page}','{}');
 select event_payload->'spanishPreparation' into value from public.partner_events where partner_slug=p_slug and event_type='rcap_spanish_draft_prepared' order by created_at desc,id desc limit 1;
 if value is not null then stored:=stored||jsonb_build_object('spanish_preparation',value);end if;
 proposed:=stored;
 for k,field_name in select * from jsonb_each_text(mapping) loop
  value:=p_copy->k;
  if jsonb_typeof(value) is distinct from 'string' or coalesce(length(btrim(value#>>'{}')),0) not between 1 and 4000 then raise exception 'incomplete Spanish copy' using errcode='22023';end if;
  proposed:=jsonb_set(proposed,array[field_name],value);
 end loop;
 proposed:=proposed||jsonb_build_object('spanish_preparation',jsonb_build_object('source',p_source,'copy',p_copy));
 if proposed is distinct from stored then
  changes:=(select jsonb_object_agg(m.field_name,proposed->m.field_name) from jsonb_each_text(mapping) m(k,field_name));
  snapshot:=public.rcap_service_save_program_configuration(p_slug,p_actor,p_version,jsonb_build_array(jsonb_build_object('section','brand_public_page','values',changes,'base',stored)),gen_random_uuid());
  update public.partner_onboarding set aggregate_version=aggregate_version+1 where id=w.id returning aggregate_version into w.aggregate_version;
  insert into public.partner_events(id,partner_slug,event_type,event_label,event_payload) values(p_request,p_slug,'rcap_spanish_draft_prepared','Spanish public-page draft prepared',jsonb_build_object('actor',p_actor,'workspaceId',w.id,'sourceVersion',p_version,'resultVersion',w.aggregate_version,'sourceHash',encode(sha256(convert_to(p_source::text,'UTF8')),'hex'),'requiresFinalReview',true,'spanishPreparation',proposed->'spanish_preparation'));
 end if;
 if reservation.id is not null then update public.partner_onboarding_idempotency set result_status='succeeded',completed_at=now(),result_workspace_version=w.aggregate_version where id=reservation.id;
 else insert into public.partner_onboarding_idempotency(workspace_id,operation_key,request_id,actor_user_id,payload_hash,result_status,result_workspace_version,expires_at,completed_at)
 values(w.id,'program_translation_reuse',p_request,p_actor,encode(sha256(convert_to(p_source::text,'UTF8')),'hex'),'succeeded',w.aggregate_version,now()+interval '24 hours',now());end if;
 return public.rcap_service_get_program_configuration(p_slug,p_actor);
end $$;
revoke all on function public.rcap_service_save_program_translation(text,uuid,bigint,jsonb,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.rcap_service_save_program_translation(text,uuid,bigint,jsonb,jsonb,uuid) to service_role;

create or replace function public.rcap_program_geography_consistent(p_workspace uuid) returns boolean
language sql stable security invoker set search_path='' as $$
 select not ((jsonb_array_length(coalesce(s#>'{geography_audience_language_accessibility,jurisdictions}','[]'))<2 and coalesce(s#>>'{geography_audience_language_accessibility,service_area_description}','') ~* 'multi[ -]?state|multiple states|several states')
 or (jsonb_array_length(coalesce(s#>'{geography_audience_language_accessibility,jurisdictions}','[]'))<51 and coalesce(s#>>'{geography_audience_language_accessibility,service_area_description}','') ~* 'nationwide|all (50|fifty) states|all states|national coverage'))
 from (select public.rcap_program_policy_source(p_workspace) s) source
$$;
revoke all on function public.rcap_program_geography_consistent(uuid) from public,anon,authenticated;
grant execute on function public.rcap_program_geography_consistent(uuid) to service_role;

-- Retain every existing policy check; add the non-waivable geographic discrepancy.
create or replace function public.rcap_service_evaluate_program(p_slug text,p_actor uuid,p_action text) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare w public.partner_onboarding%rowtype; r public.partner_records%rowtype; a public.rcap_commercial_authorizations%rowtype;
 s jsonb; role_name text; facts jsonb; item jsonb; check_ok boolean; exceptions jsonb:='[]'; blockers jsonb:='[]'; requirements jsonb:='[]'; dep text; ev uuid;
 materials_ok boolean; confirmation_ok boolean; internal_ok boolean; scope_hash text; setup_ok boolean; public_ok boolean; business_default boolean; managed boolean; internal_authority uuid; can_confirm boolean;
begin
 if p_action is null or p_action not in ('complete_setup','publish_partner_page','accept_screenings','issue_sponsored_packet','offer_paid_packet','create_clinic','publish_clinic','assist_participant','manage_team','view_reporting') then raise exception 'unknown action' using errcode='22023'; end if;
 select * into strict w from public.partner_onboarding where partner_slug=p_slug;
 select * into strict r from public.partner_records where id=w.partner_record_id;
 select role into role_name from public.partner_users where auth_user_id=p_actor and status='active' and ((partner_slug=p_slug and role in ('partner_admin','partner_staff')) or (partner_slug is null and role='internal_admin')) order by case when role='internal_admin' then 0 else 1 end limit 1;
 if role_name is null then raise exception 'actor or tenant denied' using errcode='42501'; end if;
 if role_name='partner_staff' and p_action not in ('view_reporting','assist_participant','offer_paid_packet') then raise exception 'administrator required' using errcode='42501'; end if;
 managed:=w.operating_model='legalease_managed' and w.rcap_policy_version='rcap2.2';
 internal_authority:=public.rcap_program_internal_authority(w.id);
 s:=public.rcap_program_policy_source(w.id); scope_hash:=public.rcap_program_launch_scope(w.id);
 select * into a from public.rcap_commercial_authorizations where workspace_id=w.id order by created_at desc,id desc limit 1;
 materials_ok:=(select count(*)=2 from public.partner_onboarding_artifacts ar join public.partner_onboarding_artifact_versions v on v.id=ar.current_version_id
 where ar.workspace_id=w.id and ar.artifact_type in ('implementation_brief','co_branded_page_configuration') and v.generation_status='succeeded' and v.superseded_at is null and v.source_drift_invalidated_at is null and v.normalized_snapshot->>'rcap_dependency_hash'=public.rcap_program_material_scope(w.id,ar.artifact_type) and (ar.artifact_type<>'co_branded_page_configuration' or v.rendered_content#>'{pagePreview,missing}'='[]'::jsonb)
 and (v.approval_status='approved' or (v.normalized_snapshot->>'rcap_standard_policy'='rcap2.2' and v.generator_version like '%_rcap2')));
 confirmation_ok:=materials_ok and exists(select 1 from public.partner_onboarding_launch_approvals c join public.partner_users u on u.auth_user_id=c.reviewer_user_id and u.partner_slug=p_slug and u.role='partner_admin' and u.status='active'
 where c.workspace_id=w.id and c.approval_type='partner_launch_approval' and c.decision='approve' and c.invalidated_at is null and c.policy_details->>'policy_version'='rcap2.2'
 and c.policy_details->>'materials_hash'=public.rcap_program_dependency_hash(w.id,array['materials'])
 and not exists(select 1 from public.partner_onboarding_launch_approvals newer where newer.workspace_id=w.id and newer.approval_type='partner_launch_approval' and (newer.recorded_at,newer.id)>(c.recorded_at,c.id)));
 internal_ok:=exists(select 1 from public.partner_onboarding_launch_approvals f join public.partner_users u on u.auth_user_id=f.reviewer_user_id and u.role='internal_admin' and u.partner_slug is null and u.status='active'
 where f.workspace_id=w.id and f.approval_type in ('legalease_final_review','standing_launch_authorization') and f.decision='approve' and f.invalidated_at is null
 and f.policy_details->>'policy_version'='rcap2.2' and f.policy_details->>'scope_hash'=scope_hash
 and f.policy_details->'capabilities' ? 'publish_partner_page' and (f.policy_details->>'expires_at')::timestamptz>now()
 and not exists(select 1 from public.partner_onboarding_launch_approvals newer where newer.workspace_id=w.id and newer.approval_type=f.approval_type and (newer.recorded_at,newer.id)>(f.recorded_at,f.id)));
 if managed then confirmation_ok:=materials_ok; internal_ok:=internal_authority is not null;end if;
 facts:=jsonb_build_object(
 'organization_facts',coalesce(length(btrim(s#>>'{organization_contacts,legal_organization_name}'))>0 and length(btrim(s#>>'{organization_contacts,public_organization_name}'))>0 and length(btrim(s#>>'{organization_contacts,public_program_name}'))>0,false),
 'program_scope',coalesce(jsonb_array_length(s#>'{geography_audience_language_accessibility,jurisdictions}') between 1 and 51
 and not exists(select 1 from jsonb_array_elements_text(s#>'{geography_audience_language_accessibility,jurisdictions}') j where j<>all(public.rcap_screening_jurisdictions()))
 and (select count(distinct j) from jsonb_array_elements_text(s#>'{geography_audience_language_accessibility,jurisdictions}') j)=jsonb_array_length(s#>'{geography_audience_language_accessibility,jurisdictions}')
 and length(btrim(s#>>'{geography_audience_language_accessibility,service_area_description}'))>0 and s#>>'{program_goals,participation_mode}' in ('online','clinics','both') and s#>>'{access_sponsorship_capacity,participant_access_model}' in ('open','optional_code','required_code','invite_only'),false),
 'support_and_referral_contacts_configured',coalesce(s#>>'{support_referrals_reporting,participant_support_email}' ~ '^[^@ ]+@[^@ ]+\.[^@ ]+$' and length(s#>>'{support_referrals_reporting,contested_matter_procedure}')>=20,false),
 'commercial_gate_cleared',public.rcap_program_commercial_valid(w.id),
 'agreements_and_procurement_recorded',(managed and s#>>'{program_goals,external_agreement_applicability}'='not_applicable' and not exists(select 1 from public.partner_onboarding_agreements where workspace_id=w.id and (signed_receipt_id is not null or finalized_asset_id is not null or status in ('executed','approved','finalized')))) or public.rcap_agreement_clearance(w.id) or (a.kind='screening_only' and public.rcap_program_commercial_valid(w.id)),
 'access_model_and_capacity_present',(managed and internal_ok) or coalesce(a.access_mode=s#>>'{access_sponsorship_capacity,participant_access_model}' and exists(select 1 from public.partner_entitlement where partner_slug=p_slug and screenings_allowed>screenings_used),false),
 'packet_entitlement',(managed and s#>>'{program_goals,service_mode}'='sponsored_packets' and public.rcap_program_funding_valid(w.id) and exists(select 1 from public.partner_packet_entitlement e where e.partner_id=w.partner_record_id and e.entitlement_scope='sponsored_packets' and e.expires_at is null and e.packet_cap>(select count(*) from public.packet_credit_ledger l where l.entitlement_id=e.id and l.event_type in ('reserved','consumed')))) or coalesce(not managed and public.rcap_program_funding_valid(w.id) and ((not managed or s#>>'{program_goals,service_mode}'='sponsored_packets') and a.kind<>'screening_only' and exists(select 1 from public.partner_packet_entitlement e where e.id=a.packet_entitlement_id and e.partner_id=r.id and e.entitlement_scope='sponsored_packets' and e.effective_at<=now() and (e.expires_at is null or e.expires_at>now()) and e.packet_cap>(select count(*) from public.packet_credit_ledger l where l.entitlement_id=e.id and l.event_type in ('reserved','consumed')))),false),
 'artifact_versions_current',materials_ok,'partner_launch_approval_received',confirmation_ok,'legalease_final_review_complete',internal_ok,
 'participant_access',false,'paid_packet_verification',false);
 setup_ok:=coalesce((facts->>'organization_facts')::boolean and (facts->>'program_scope')::boolean and (facts->>'support_and_referral_contacts_configured')::boolean,false);
 public_ok:=w.status='live' and w.landing_page_ready and materials_ok and confirmation_ok and public.rcap_program_commercial_valid(w.id) and exists(select 1 from public.rcap_launch_operation_events e where e.workspace_id=w.id and e.operation_id=w.rcap_launch_operation_id and e.step='complete');
 for item in select value from jsonb_array_elements(public.rcap_program_requirement_registry()) loop
  if not item->'actions' ? p_action then continue; end if;
  if managed and item->>'key'='partner_launch_approval_received' then item:=item||jsonb_build_object('label','Current program materials ready for Platform Admin confirmation','owner_domain','legalease_business');end if;
  if managed and item->>'key'='commercial_gate_cleared' then item:=item||jsonb_build_object('label','Confirm LegalEase operating authority with Start Program');end if;
  if managed and item->>'key'='access_model_and_capacity_present' then item:=item||jsonb_build_object('label','Authorize the configured screening access with Start Program');end if;
  if managed and item->>'key'='agreements_and_procurement_recorded' then item:=item||jsonb_build_object('label','External agreement applicability matches genuine operating responsibility');end if;
  dep:=public.rcap_program_dependency_hash(w.id,array(select jsonb_array_elements_text(item->'dependencies')));
  check_ok:=coalesce((facts->>(item->>'key'))::boolean,false);
  business_default:=item->>'owner_domain'='legalease_business' and item->>'permitted_default' is not null;
  ev:=null;
  if not check_ok and item->>'owner_domain'='legalease_business' then
   select e.id into ev from public.rcap_launch_exception_events e where e.workspace_id=w.id and e.partner_slug=p_slug and e.policy_version='rcap2.2'
    and e.kind='grant' and e.requirement_keys @> array[item->>'key'] and e.requested_action=p_action and e.event_id is null
    and e.dependency_hashes->>(item->>'key')=dep and (e.expires_at is null or e.expires_at>now())
    and exists(select 1 from public.partner_users where auth_user_id=e.actor_auth_user_id and partner_slug is null and role='internal_admin' and status='active')
    and not exists(select 1 from public.rcap_launch_exception_events x where x.grant_id=e.id and x.kind='revoke') order by e.created_at desc limit 1;
  end if;
  if ev is not null then exceptions:=exceptions||jsonb_build_array(ev); end if;
  requirements:=requirements||jsonb_build_array(item||jsonb_build_object('passing',check_ok,'effective',check_ok or ev is not null or business_default,'dependency_hash',dep,'exception_id',ev,'default_applied',not check_ok and ev is null and business_default));
  if not check_ok and ev is null and not business_default then blockers:=blockers||jsonb_build_array(item||jsonb_build_object('dependency_hash',dep)); end if;
 end loop;
 if w.status in ('paused','closed') and p_action not in ('view_reporting','manage_team') then blockers:=blockers||jsonb_build_array(jsonb_build_object('key','program_status','label','This program is paused or closed.','owner_domain','security')); end if;
 if p_action in ('accept_screenings','publish_clinic','issue_sponsored_packet') and not public_ok then blockers:=blockers||jsonb_build_array(jsonb_build_object('key','publication','label','Start the parent program first.','owner_domain','security')); end if;
 if p_action='create_clinic' and not setup_ok then blockers:=blockers||jsonb_build_array(jsonb_build_object('key','setup','label','Save the program service area before creating a clinic.','owner_domain','legal')); end if;
 if managed and p_action in ('create_clinic','publish_clinic') and coalesce(s#>>'{program_goals,participation_mode}','') not in ('clinics','both') then blockers:=blockers||jsonb_build_array(jsonb_build_object('key','clinic_scope','label','This program does not include Clinic participation.','owner_domain','legal'));end if;
 if managed and (coalesce(length(btrim(s#>>'{program_goals,operator_authority_reference}')),0)<10 or s#>>'{program_goals,service_mode}' not in ('screening_only','participant_paid','sponsored_packets') or coalesce(s#>>'{program_goals,external_agreement_applicability}','') not in ('not_applicable','required')) then
  blockers:=blockers||jsonb_build_array(jsonb_build_object('key','operating_authority','label','Establish genuine LegalEase operating responsibility without transferring third-party rights.','owner_domain','legal'));
 end if;
 if managed and p_action in ('publish_partner_page','accept_screenings','issue_sponsored_packet','publish_clinic') and s#>>'{program_goals,service_mode}'='sponsored_packets' and not coalesce((facts->>'packet_entitlement')::boolean,false) then blockers:=blockers||jsonb_build_array(jsonb_build_object('key','packet_entitlement','label','Sponsored packets require an actual available funded allocation.','owner_domain','financial'));end if;
 if managed and p_action='offer_paid_packet' and s#>>'{program_goals,service_mode}' is distinct from 'participant_paid' then blockers:=blockers||jsonb_build_array(jsonb_build_object('key','paid_service_scope','label','Participant-paid services are not part of this program. Independent consumer services retain their own payment and verification requirements.','owner_domain','financial'));end if;
 if p_action in ('complete_setup','publish_partner_page') and not public.rcap_program_geography_consistent(w.id) then
  setup_ok:=false;
  item:=jsonb_build_object('key','geographic_presentation','label','Correct the service-area description to match the selected authorized jurisdictions.','owner_domain','legal','classification','hard_stop','passing',false,'effective',false);
  requirements:=requirements||jsonb_build_array(item);blockers:=blockers||jsonb_build_array(item);
 end if;
 can_confirm:=role_name='internal_admin' and setup_ok and materials_ok and not exists(select 1 from jsonb_array_elements(blockers) b where b->>'key'<>all(case when managed then array['commercial_gate_cleared','access_model_and_capacity_present','legalease_final_review_complete'] else array['legalease_final_review_complete'] end));
 return jsonb_build_object('operatingModel',w.operating_model,'canAuthorizeStart',can_confirm,'jurisdictions',s#>'{geography_audience_language_accessibility,jurisdictions}','serviceMode',s#>>'{program_goals,service_mode}','policyVersion',w.rcap_policy_version,'workspaceId',w.id,'partnerSlug',p_slug,'actor',p_actor,'role',role_name,'action',p_action,'allowed',jsonb_array_length(blockers)=0,'requirements',requirements,'blockers',blockers,'activeExceptions',exceptions,'sourceVersion',w.aggregate_version,'scopeHash',scope_hash,'materialsHash',public.rcap_program_dependency_hash(w.id,array['materials']),'authorityId',case when managed then internal_authority else a.id end,'setupComplete',(confirmation_ok and (not managed or internal_ok)) or (w.rcap_policy_version='legacy' and w.status='live'),'configurationComplete',setup_ok,'live',public_ok,'delegated',exists(select 1 from public.partner_onboarding_launch_approvals z where z.workspace_id=w.id and z.approval_type='standing_launch_authorization' and z.decision='approve' and z.invalidated_at is null and z.policy_details->>'scope_hash'=scope_hash and (z.policy_details->>'expires_at')::timestamptz>now() and not exists(select 1 from public.partner_onboarding_launch_approvals n where n.workspace_id=w.id and n.approval_type=z.approval_type and (n.recorded_at,n.id)>(z.recorded_at,z.id))),'status',w.status,'primaryNextAction',coalesce(blockers->0->>'label',case when p_action='complete_setup' then 'Review your program' else 'Continue' end));
end $$;
CREATE OR REPLACE FUNCTION public.rcap_service_generate_onboarding_artifact_version(p_partner_slug text, p_actor_user_id uuid, p_workspace_id uuid, p_artifact_type text, p_request_id uuid, p_source_workspace_version bigint, p_source_section_revisions jsonb, p_source_asset_versions jsonb, p_normalized_snapshot jsonb, p_snapshot_hash text, p_generator_version text, p_rendered_content jsonb, p_generation_status text, p_generation_error_code text)
 RETURNS TABLE(version_id uuid, version_number integer, duplicate boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_artifact public.partner_onboarding_artifacts%rowtype;
  v_existing public.partner_onboarding_artifact_versions%rowtype;
  v_next integer;
  v_new public.partner_onboarding_artifact_versions%rowtype;
begin
  if exists(select 1 from public.partner_onboarding where id=p_workspace_id and partner_slug=p_partner_slug and rcap_policy_version='rcap2.2') then
    if not exists(select 1 from public.partner_users where auth_user_id=p_actor_user_id and status='active' and ((partner_slug=p_partner_slug and role='partner_admin') or (partner_slug is null and role='internal_admin'))) then raise exception 'material actor denied' using errcode='42501';end if;
    perform 1 from public.partner_onboarding where id=p_workspace_id and aggregate_version=p_source_workspace_version for update;
    if not found or p_normalized_snapshot->>'rcap_dependency_hash' is distinct from public.rcap_program_material_scope(p_workspace_id,p_artifact_type) then raise exception 'material source changed' using errcode='40001';end if;
  end if;
  if p_generation_status not in ('succeeded', 'failed') then
    raise exception 'invalid_generation_status' using errcode = '22023';
  end if;

  select a.* into v_artifact
  from public.partner_onboarding_artifacts a
  join public.partner_onboarding po on po.id = a.workspace_id
  where a.workspace_id = p_workspace_id
    and a.artifact_type = p_artifact_type
    and po.partner_slug = p_partner_slug
  for update of a;

  if v_artifact.id is null then
    raise exception 'artifact_not_found' using errcode = 'P0002';
  end if;

  if v_artifact.lifecycle_status = 'unavailable_in_release' then
    raise exception 'artifact_generator_unavailable' using errcode = '0A000';
  end if;

  -- Idempotency: the same request id returns the version it already created.
  select v.* into v_existing
  from public.partner_onboarding_artifact_versions v
  where v.artifact_id = v_artifact.id
    and v.request_id = p_request_id;

  if v_existing.id is not null then
    version_id := v_existing.id;
    version_number := v_existing.version_number;
    duplicate := true;
    return next;
    return;
  end if;

  -- Under the existing artifact lock, identical RCAP materials are a no-op.
  -- Generation success is not completeness; incomplete identical results are
  -- reused too, so a retry cannot manufacture another misleading version.
  if exists(select 1 from public.partner_onboarding where id=p_workspace_id and rcap_policy_version='rcap2.2') then
    select * into v_existing from public.partner_onboarding_artifact_versions
    where id=v_artifact.current_version_id and snapshot_hash=p_snapshot_hash
      and generator_version=p_generator_version and rendered_content=p_rendered_content
      and generation_status=p_generation_status and generation_error_code is not distinct from p_generation_error_code
      and source_drift_invalidated_at is null and superseded_at is null;
    if found then
      version_id:=v_existing.id;version_number:=v_existing.version_number;duplicate:=true;return next;return;
    end if;
  end if;

  select coalesce(max(v.version_number), 0) + 1 into v_next
  from public.partner_onboarding_artifact_versions v
  where v.artifact_id = v_artifact.id;

  insert into public.partner_onboarding_artifact_versions (
    artifact_id, workspace_id, version_number,
    source_workspace_version, source_section_revisions, source_asset_versions,
    normalized_snapshot, snapshot_hash, generator_version, rendered_content,
    generation_status, generation_error_code,
    approval_status, generated_by, request_id
  )
  values (
    v_artifact.id, p_workspace_id, v_next,
    p_source_workspace_version, p_source_section_revisions, p_source_asset_versions,
    p_normalized_snapshot, p_snapshot_hash, p_generator_version, p_rendered_content,
    p_generation_status, p_generation_error_code,
    case when p_generation_status = 'failed' then 'generation_failed' else 'draft' end,
    p_actor_user_id, p_request_id
  )
  returning * into v_new;

  -- A superseded prior version stays readable in history; it is never rewritten.
  update public.partner_onboarding_artifact_versions
  set approval_status = 'superseded',
      superseded_at = now()
  where artifact_id = v_artifact.id
    and id <> v_new.id
    and approval_status <> 'generation_failed'
    and superseded_at is null;

  update public.partner_onboarding_artifacts
  set current_version_id = v_new.id,
      lifecycle_status = case
        when p_generation_status = 'failed' then 'generation_failed'
        else 'draft'
      end
  where id = v_artifact.id;

  insert into public.partner_onboarding_activity (
    workspace_id, event_type, owner_type, summary_code, status_code,
    artifact_version_id
  )
  values (
    p_workspace_id,
    case when p_generation_status = 'failed'
      then 'artifact_generation_failed'
      else 'artifact_generated'
    end,
    'legalease',
    p_artifact_type,
    p_generation_status,
    v_new.id
  );

  version_id := v_new.id;
  version_number := v_new.version_number;
  duplicate := false;
  return next;
end;
$function$
;
commit;
