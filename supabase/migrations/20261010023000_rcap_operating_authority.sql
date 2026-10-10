-- Operating responsibility uses the existing workspace, approval and launch journal.
-- Existing programs retain partner-managed authority; no policy/data migration or financial allocation.
begin;
alter table public.partner_onboarding add column operating_model text not null default 'partner_managed'
 check (operating_model in ('partner_managed','legalease_managed'));

-- This is the supported screening universe, not legal eligibility or packet fulfillment authority.
-- Kept in parity with the existing compiled all-51 screening profile registry by the release check.
create function public.rcap_screening_jurisdictions() returns text[]
language sql immutable security invoker set search_path='' as $$
 select array['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY']::text[]
$$;
create function public.rcap_program_external_rights_present(p_workspace uuid) returns boolean
language sql stable security invoker set search_path='' as $$
 select exists(select 1 from public.partner_onboarding w join public.partner_users u on u.partner_slug=w.partner_slug
   where w.id=p_workspace and u.role='partner_admin' and u.status='active')
 or exists(select 1 from public.partner_onboarding_agreements where workspace_id=p_workspace
   and (status in ('requested','under_review','finalized','executed','approved') or finalized_asset_id is not null or signed_receipt_id is not null or recorded_by is not null))
 or exists(select 1 from public.partner_onboarding_launch_approvals where workspace_id=p_workspace and approval_type='partner_launch_approval')
 or exists(select 1 from public.rcap_commercial_authorizations where workspace_id=p_workspace)
$$;

create or replace function public.rcap_service_get_program_configuration(p_slug text,p_actor uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare w public.partner_onboarding%rowtype; d jsonb;
begin
 select * into strict w from public.partner_onboarding where partner_slug=p_slug;
 if exists(select 1 from public.partner_users where auth_user_id=p_actor and partner_slug is null and role='internal_admin' and status='active') then
  perform public.rcap_service_assert_internal_actor(p_actor);
 else perform public.rcap_service_assert_partner_actor(p_slug,p_actor,w.id); end if;
 if w.rcap_policy_version not in ('legacy','rcap2.2') or not exists(select 1 from public.partner_records where id=w.partner_record_id and partner_slug=p_slug) then
  raise exception 'workspace identity invalid' using errcode='P0002';
 end if;
 select coalesce(jsonb_object_agg(section_key,response_data),'{}') into d from public.partner_onboarding_sections where workspace_id=w.id;
 d:=d||jsonb_build_object('organization_contacts',coalesce(d->'organization_contacts','{}')||jsonb_build_object('contacts',coalesce((select jsonb_agg(jsonb_build_object('stable_row_id',id,'role',role,'name',name,'title',title,'organization',organization,'work_email',work_email,'phone',phone) order by created_at,id) from public.partner_onboarding_contacts where workspace_id=w.id and deleted_at is null),'[]')));
 d:=d||jsonb_build_object('program_goals',coalesce(d->'program_goals','{}')||jsonb_build_object('operating_model',w.operating_model));
 return jsonb_build_object('operatingModel',w.operating_model,'workspaceId',w.id,'partnerSlug',p_slug,'version',w.aggregate_version,'policyVersion',w.rcap_policy_version,'status',w.status,'data',d,
 'legalIdentityLocked',w.agreement_status='signed' or exists(select 1 from public.rcap_commercial_authorizations where workspace_id=w.id));
end $$;

create or replace function public.rcap_service_save_program_configuration(p_slug text,p_actor uuid,p_version bigint,p_changes jsonb,p_request uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare w public.partner_onboarding%rowtype; snapshot jsonb; item jsonb; k text; section_name text; stored jsonb; proposed jsonb; value jsonb;
 previous public.partner_onboarding_idempotency%rowtype; fingerprint text; changed jsonb:='[]'; internal_actor boolean;
 allowed constant jsonb:='{
 "organization_contacts":["legal_organization_name","public_organization_name","public_program_name","website","primary_address","contacts"],
 "program_goals":["participation_mode","target_population","operating_model","operator_authority_reference","external_agreement_applicability","service_mode"],
 "geography_audience_language_accessibility":["jurisdictions","service_area_description","counties","primary_language","enable_spanish"],
 "access_sponsorship_capacity":["participant_access_model"],
 "support_referrals_reporting":["participant_support_email","referral_arrangement","contested_matter_procedure"],
 "brand_public_page":["program_headline","program_subheadline","approved_organization_description","primary_cta_label","participant_support_copy","program_headline_es","program_subheadline_es","approved_organization_description_es","primary_cta_label_es","participant_support_copy_es","service_area_es","target_audience_es"]}';
begin
 select * into strict w from public.partner_onboarding where partner_slug=p_slug for update;
 -- Revalidate current membership even for an idempotent replay.
 snapshot:=public.rcap_service_get_program_configuration(p_slug,p_actor);
 internal_actor:=exists(select 1 from public.partner_users where auth_user_id=p_actor and partner_slug is null and role='internal_admin' and status='active');
 if p_request is null or p_version is null or p_version<1 or p_changes is null or jsonb_typeof(p_changes)<>'array' or jsonb_array_length(p_changes)>6 or octet_length(p_changes::text)>131072 then
  raise exception 'invalid configuration request' using errcode='22023';
 end if;
 fingerprint:=encode(sha256(convert_to(jsonb_build_object('version',p_version,'changes',p_changes)::text,'UTF8')),'hex');
 select * into previous from public.partner_onboarding_idempotency where request_id=p_request;
 if found then
  if previous.workspace_id<>w.id or previous.actor_user_id<>p_actor or previous.operation_key<>'program_configuration' or previous.payload_hash<>fingerprint then
   raise exception 'request belongs to another mutation' using errcode='23505';
  end if;
  if previous.result_status<>'succeeded' then raise exception 'request in progress' using errcode='55000';end if;
  return snapshot;
 end if;
 if w.aggregate_version<>p_version then raise exception 'configuration revision conflict' using errcode='PT409';end if;
 if w.status in ('paused','closed') then raise exception 'program not editable' using errcode='55000';end if;
 if (select count(distinct v->>'section') from jsonb_array_elements(p_changes) v)<>jsonb_array_length(p_changes) then raise exception 'duplicate sections' using errcode='22023';end if;
 for item in select v from jsonb_array_elements(p_changes) v loop
  section_name:=item->>'section';
  if not allowed ? section_name or jsonb_typeof(item->'values') is distinct from 'object' or jsonb_typeof(item->'base') is distinct from 'object' then raise exception 'invalid configuration section' using errcode='22023';end if;
  stored:=coalesce(snapshot#>array['data',section_name],'{}');
  proposed:=stored||(item->'values');
  for k,value in select * from jsonb_each(item->'values') loop
   if not (allowed->section_name) ? k then raise exception 'protected configuration field' using errcode='42501';end if;
   if coalesce(stored->k,'null') is distinct from coalesce(item->'base'->k,'null') and coalesce(stored->k,'null') is distinct from value then raise exception 'field revision conflict' using errcode='PT409';end if;
   if value is not distinct from coalesce(stored->k,'null') then continue;end if;
   if k='legal_organization_name' and coalesce(stored->>k,'')<>'' and (snapshot->>'legalIdentityLocked')::boolean then raise exception 'protected legal identity' using errcode='42501';end if;
   -- A live scope change needs a separate authorized publication transition.
   if w.status='live' and (section_name in ('geography_audience_language_accessibility','access_sponsorship_capacity') or k='participation_mode') then raise exception 'live service scope is protected' using errcode='55000';end if;
   if k in ('operating_model','operator_authority_reference','external_agreement_applicability','service_mode') then
    if not internal_actor then raise exception 'Platform Admin operating decision required' using errcode='42501';end if;
    if w.status='live' then raise exception 'published operating scope is protected' using errcode='55000';end if;
    if k='operating_model' and (value#>>'{}' not in ('partner_managed','legalease_managed') or jsonb_typeof(value)<>'string') then raise exception 'invalid operating model' using errcode='22023';end if;
    if k='service_mode' and (value#>>'{}' not in ('screening_only','participant_paid','sponsored_packets') or jsonb_typeof(value)<>'string') then raise exception 'invalid service mode' using errcode='22023';end if;
    if k='external_agreement_applicability' and (value#>>'{}' not in ('not_applicable','required') or jsonb_typeof(value)<>'string') then raise exception 'invalid agreement applicability' using errcode='22023';end if;
    if k='operator_authority_reference' and (jsonb_typeof(value)<>'string' or length(btrim(value#>>'{}')) not between 10 and 1000) then raise exception 'actual operator authority required' using errcode='22023';end if;
   end if;
   if k='participation_mode' and (jsonb_typeof(value)<>'string' or value#>>'{}' not in ('online','clinics','both')) then raise exception 'invalid participation mode' using errcode='22023';end if;
   if k='participant_access_model' and (jsonb_typeof(value)<>'string' or value#>>'{}' not in ('open','optional_code','required_code','invite_only')) then raise exception 'invalid access model' using errcode='22023';end if;
   if k='jurisdictions' then
    if jsonb_typeof(value)<>'array' then raise exception 'invalid jurisdictions' using errcode='22023';end if;
    if exists(select 1 from jsonb_array_elements_text(value) code where code<>all(array['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'])) then raise exception 'invalid jurisdiction' using errcode='22023';end if;
   end if;
  end loop;
  if section_name='program_goals' and item->'values' ? 'operating_model' and proposed->>'operating_model' is distinct from w.operating_model then
   if proposed->>'operating_model'='legalease_managed' and public.rcap_program_external_rights_present(w.id) then
    raise exception 'An external organization retains authority; operator selection cannot transfer its rights' using errcode='42501';end if;
   update public.partner_onboarding set operating_model=proposed->>'operating_model',rcap_policy_version=case when proposed->>'operating_model'='legalease_managed' then 'rcap2.2' else rcap_policy_version end where id=w.id;
   w.operating_model:=proposed->>'operating_model';
   if w.operating_model='legalease_managed' then w.rcap_policy_version:='rcap2.2';end if;
  end if;
  if proposed=stored then continue;end if;
  if item->'values' ? 'contacts' then
   if jsonb_typeof(proposed->'contacts')<>'array' then raise exception 'invalid contacts' using errcode='22023';end if;
   if exists(select 1 from jsonb_array_elements(proposed->'contacts') c join public.partner_onboarding_contacts existing on existing.id=(c->>'stable_row_id')::uuid where existing.workspace_id<>w.id) then raise exception 'contact tenant mismatch' using errcode='42501';end if;
   update public.partner_onboarding_contacts c set deleted_at=now(),revision=revision+1 where workspace_id=w.id and deleted_at is null and not exists(select 1 from jsonb_array_elements(proposed->'contacts') item where item->>'stable_row_id'=c.id::text);
   insert into public.partner_onboarding_contacts(id,workspace_id,role,name,title,organization,work_email,phone)
   select (c->>'stable_row_id')::uuid,w.id,c->>'role',c->>'name',c->>'title',nullif(c->>'organization',''),lower(c->>'work_email'),nullif(c->>'phone','') from jsonb_array_elements(proposed->'contacts') c
   on conflict(id) do update set role=excluded.role,name=excluded.name,title=excluded.title,organization=excluded.organization,work_email=excluded.work_email,phone=excluded.phone,deleted_at=null,revision=public.partner_onboarding_contacts.revision+1
   where public.partner_onboarding_contacts.workspace_id=w.id;
  end if;
  update public.partner_onboarding_sections set response_data=proposed-'contacts',revision=revision+1,
   status=case when status='not_started' then 'in_progress' else status end,first_started_at=coalesce(first_started_at,now())
   where workspace_id=w.id and section_key=section_name;
  if not found then raise exception 'configuration section missing' using errcode='P0002';end if;
  changed:=changed||jsonb_build_array(jsonb_build_object('section',section_name,'fields',(select jsonb_agg(key order by key) from jsonb_object_keys(item->'values') key)));
 end loop;
 if jsonb_array_length(changed)>0 then
  update public.partner_onboarding set aggregate_version=aggregate_version+1 where id=w.id returning aggregate_version into w.aggregate_version;
  insert into public.partner_events(id,partner_slug,event_type,event_label,event_payload) values(p_request,p_slug,'rcap_program_configuration_saved','Program configuration saved',jsonb_build_object('actor',p_actor,'role',case when internal_actor then 'internal_admin' else 'partner_admin' end,'workspaceId',w.id,'policyVersion',w.rcap_policy_version,'sourceVersion',p_version,'resultVersion',w.aggregate_version,'changes',changed,'operatingModelBefore',snapshot->>'operatingModel','operatingModel',w.operating_model,'policyBefore',snapshot->>'policyVersion','operatorAuthority',public.rcap_program_policy_source(w.id)#>>'{program_goals,operator_authority_reference}'));
 end if;
 insert into public.partner_onboarding_idempotency(workspace_id,operation_key,request_id,actor_user_id,payload_hash,result_status,result_workspace_version,expires_at,completed_at)
 values(w.id,'program_configuration',p_request,p_actor,fingerprint,'succeeded',w.aggregate_version,now()+interval '24 hours',now());
 return public.rcap_service_get_program_configuration(p_slug,p_actor);
end $$;

create or replace function public.rcap_program_launch_scope(p_workspace uuid) returns text
language sql stable security invoker set search_path='' as $$
 select case when (select operating_model from public.partner_onboarding where id=p_workspace)='legalease_managed' then
 public.rcap_program_dependency_hash(p_workspace,array['organization_contacts','program_goals','geography_audience_language_accessibility','access_sponsorship_capacity.participant_access_model','support_referrals_reporting','brand_public_page'])
 else public.rcap_program_dependency_hash(p_workspace,array['organization_contacts.legal_organization_name','geography_audience_language_accessibility','program_goals.participation_mode','access_sponsorship_capacity.participant_access_model','support_referrals_reporting.referral_arrangement','support_referrals_reporting.contested_matter_procedure','brand_public_page.program_headline','brand_public_page.program_subheadline','brand_public_page.approved_organization_description','commercial','agreements','screening_capacity','packet_capacity']) end
$$;

create or replace function public.rcap_program_material_scope(p_workspace uuid,p_type text) returns text
language sql stable security invoker set search_path='' as $$
 select case when (select operating_model from public.partner_onboarding where id=p_workspace)='legalease_managed' and p_type='implementation_brief' then
 public.rcap_program_dependency_hash(p_workspace,array['organization_contacts.legal_organization_name','organization_contacts.public_organization_name','organization_contacts.public_program_name','program_goals.operating_model','program_goals.operator_authority_reference','program_goals.external_agreement_applicability','program_goals.service_mode','program_goals.participation_mode','geography_audience_language_accessibility.jurisdictions','geography_audience_language_accessibility.service_area_description','geography_audience_language_accessibility.enable_spanish','access_sponsorship_capacity.participant_access_model','support_referrals_reporting.participant_support_email','support_referrals_reporting.contested_matter_procedure'] || case when public.rcap_program_policy_source(p_workspace)#>>'{program_goals,service_mode}'='sponsored_packets' then array['packet_capacity'] else '{}'::text[] end)
 else public.rcap_program_dependency_hash(p_workspace,array['organization_contacts.legal_organization_name','organization_contacts.public_organization_name','organization_contacts.public_program_name','geography_audience_language_accessibility','program_goals.participation_mode','program_goals.target_population','access_sponsorship_capacity.participant_access_model','support_referrals_reporting.participant_support_email','support_referrals_reporting.contested_matter_procedure','brand_public_page'] || case when p_type='implementation_brief' then array['commercial','screening_capacity','packet_capacity'] else '{}'::text[] end) end
$$;


-- One final decision is the internal authority, in the existing immutable approval history.
create function public.rcap_program_internal_authority(p_workspace uuid) returns uuid
language sql stable security invoker set search_path='' as $$
 select a.id from public.partner_onboarding w
 join public.partner_onboarding_launch_approvals a on a.workspace_id=w.id
 join public.partner_users u on u.auth_user_id=a.reviewer_user_id and u.partner_slug is null and u.role='internal_admin' and u.status='active'
 where w.id=p_workspace and w.rcap_policy_version='rcap2.2' and w.operating_model='legalease_managed'
 and a.approval_type='legalease_final_review' and a.decision='approve' and a.invalidated_at is null
 and a.policy_details->>'policy_version'='rcap2.2' and a.policy_details->>'operator_identity'='LegalEase'
 and a.policy_details->>'operating_model'='legalease_managed'
 and a.policy_details->>'scope_hash'=public.rcap_program_launch_scope(w.id)
 and a.policy_details->>'materials_hash'=public.rcap_program_dependency_hash(w.id,array['materials'])
 and a.policy_details->'jurisdictions'=public.rcap_program_policy_source(w.id)#>'{geography_audience_language_accessibility,jurisdictions}'
 and a.policy_details->'capabilities' ? 'accept_screenings'
 and (select count(*) from public.partner_onboarding_artifacts ar join public.partner_onboarding_artifact_versions v on v.id=ar.current_version_id
 where ar.workspace_id=w.id and ar.artifact_type in ('implementation_brief','co_branded_page_configuration') and v.generation_status='succeeded'
 and v.approval_status='approved' and v.superseded_at is null and v.source_drift_invalidated_at is null
 and v.normalized_snapshot->>'rcap_dependency_hash'=public.rcap_program_material_scope(w.id,ar.artifact_type))=2
 and not exists(select 1 from public.partner_onboarding_launch_approvals newer where newer.workspace_id=w.id and newer.approval_type=a.approval_type and (newer.recorded_at,newer.id)>(a.recorded_at,a.id))
 order by a.recorded_at desc,a.id desc limit 1
$$;

create or replace function public.rcap_program_funding_valid(p_workspace uuid) returns boolean
language sql stable security invoker set search_path='' as $$
 select case when (select operating_model from public.partner_onboarding where id=p_workspace)='legalease_managed' then exists(select 1 from public.partner_onboarding w join public.partner_records r on r.id=w.partner_record_id join lateral(select * from public.rcap_launch_capacity_events where workspace_id=w.id order by created_at desc,id desc limit 1) c on true join public.partner_onboarding_assets d on d.id=c.document_id and d.workspace_id=w.id join public.partner_packet_entitlement e on e.partner_id=r.id and e.entitlement_scope='sponsored_packets' and e.expires_at is null where w.id=p_workspace and c.packet_cap>0 and e.packet_cap=c.packet_cap and e.effective_at<=now() and r.payment_status is distinct from 'demo_paid' and d.sha256_hex=c.document_hash and d.lifecycle_status='active' and d.review_status='approved' and d.deleted_at is null and exists(select 1 from public.partner_users where auth_user_id=c.actor_auth_user_id and role='internal_admin' and partner_slug is null and status='active')) else exists(select 1 from public.partner_onboarding w join public.partner_records r on r.id=w.partner_record_id
 join lateral(select * from public.rcap_commercial_authorizations where workspace_id=w.id order by created_at desc,id desc limit 1) a on true
 join public.partner_onboarding_assets d on d.id=a.document_id and d.workspace_id=w.id
 where w.id=p_workspace and a.expires_at>now()
 and (w.rcap_policy_version<>'rcap2.2' or w.status<>'live' or exists(select 1 from public.rcap_launch_operation_events staged where staged.operation_id=w.rcap_launch_operation_id and staged.workspace_id=w.id and staged.step='prepared' and staged.evidence->'snapshot'->>'scopeHash'=public.rcap_program_launch_scope(w.id))) and (w.operating_model='legalease_managed' or r.qualification_status='qualified') and r.payment_status is distinct from 'demo_paid'
 and ((w.operating_model='legalease_managed' and public.rcap_program_policy_source(w.id)#>>'{access_sponsorship_capacity,participant_access_model}'=a.access_mode) or (r.provisioning_status in ('active','provisioned') and r.access_mode=a.access_mode))
 and d.category='procurement_document' and d.sha256_hex=a.document_hash and d.lifecycle_status='active' and d.review_status='approved' and d.deleted_at is null
 and exists(select 1 from public.partner_users where auth_user_id=a.actor_auth_user_id and partner_slug is null and role='internal_admin' and status='active')
 and not exists(select 1 from public.partner_onboarding_launch_approvals rv where rv.workspace_id=w.id and rv.approval_type='commercial_revocation' and rv.policy_details->>'authority_id'=a.id::text and rv.decision='withdraw')
 and not exists(select 1 from public.rcap_launch_capacity_events ce where ce.workspace_id=w.id and ce.created_at>a.created_at)
 and (a.kind<>'verified_paid' or (r.payment_status='paid' and r.stripe_payment_intent_id ~ '^pi_[A-Za-z0-9]+$' and r.paid_at<=now() and r.payment_amount>0))
 and (public.rcap_agreement_clearance(w.id) or (w.rcap_policy_version='rcap2.2' and a.kind='screening_only' and a.packet_entitlement_id is null
 and a.legal_basis->>'agreement_requirement'='not_required' and length(btrim(a.legal_basis->>'policy_reference'))>=10
 and length(btrim(a.legal_basis->>'effective_conditions'))>=10 and length(btrim(a.legal_basis->>'termination_rule'))>=10
 and a.legal_basis->>'funding_obligation'='none'
 and not exists(select 1 from public.partner_onboarding_agreements g where g.workspace_id=w.id and g.is_required and g.status not in ('not_required','waived')))))
end
$$;

create or replace function public.rcap_program_commercial_valid(p_workspace uuid) returns boolean
language sql stable security invoker set search_path='' as $$
 select case when (select operating_model from public.partner_onboarding where id=p_workspace)='legalease_managed'
 then public.rcap_program_internal_authority(p_workspace) is not null else public.rcap_program_funding_valid(p_workspace) end
$$;

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
 can_confirm:=role_name='internal_admin' and setup_ok and materials_ok and not exists(select 1 from jsonb_array_elements(blockers) b where b->>'key'<>all(case when managed then array['commercial_gate_cleared','access_model_and_capacity_present','legalease_final_review_complete'] else array['legalease_final_review_complete'] end));
 return jsonb_build_object('operatingModel',w.operating_model,'canAuthorizeStart',can_confirm,'jurisdictions',s#>'{geography_audience_language_accessibility,jurisdictions}','serviceMode',s#>>'{program_goals,service_mode}','policyVersion',w.rcap_policy_version,'workspaceId',w.id,'partnerSlug',p_slug,'actor',p_actor,'role',role_name,'action',p_action,'allowed',jsonb_array_length(blockers)=0,'requirements',requirements,'blockers',blockers,'activeExceptions',exceptions,'sourceVersion',w.aggregate_version,'scopeHash',scope_hash,'materialsHash',public.rcap_program_dependency_hash(w.id,array['materials']),'authorityId',case when managed then internal_authority else a.id end,'setupComplete',(confirmation_ok and (not managed or internal_ok)) or (w.rcap_policy_version='legacy' and w.status='live'),'configurationComplete',setup_ok,'live',public_ok,'delegated',exists(select 1 from public.partner_onboarding_launch_approvals z where z.workspace_id=w.id and z.approval_type='standing_launch_authorization' and z.decision='approve' and z.invalidated_at is null and z.policy_details->>'scope_hash'=scope_hash and (z.policy_details->>'expires_at')::timestamptz>now() and not exists(select 1 from public.partner_onboarding_launch_approvals n where n.workspace_id=w.id and n.approval_type=z.approval_type and (n.recorded_at,n.id)>(z.recorded_at,z.id))),'status',w.status,'primaryNextAction',coalesce(blockers->0->>'label',case when p_action='complete_setup' then 'Review your program' else 'Continue' end));
end $$;

create or replace function public.rcap_service_record_program_decision(p_slug text,p_actor uuid,p_type text,p_decision text,p_version bigint,p_details jsonb,p_request uuid) returns uuid
language plpgsql security invoker set search_path='' as $$
declare w public.partner_onboarding%rowtype; old public.partner_onboarding_launch_approvals%rowtype; d jsonb; ident uuid; rt text;
begin
 select * into strict w from public.partner_onboarding where partner_slug=p_slug for update;
 if p_type='partner_launch_approval' then perform public.rcap_service_assert_partner_actor(p_slug,p_actor,w.id);rt:='partner';
 else perform public.rcap_service_assert_internal_actor(p_actor);rt:='legalease';end if;
 if p_type not in ('partner_launch_approval','legalease_final_review','standing_launch_authorization','commercial_revocation') or p_decision not in ('approve','withdraw') or p_details is null then raise exception 'invalid decision';end if;
 select * into old from public.partner_onboarding_launch_approvals where workspace_id=w.id and request_id=p_request;
 if found then
  if old.reviewer_user_id is distinct from p_actor or old.approval_type is distinct from p_type or old.decision is distinct from p_decision or old.policy_details is distinct from p_details then raise exception 'request identity conflict' using errcode='23505'; end if;
  return old.id;
 end if;
 if w.rcap_policy_version<>'rcap2.2' or p_version is null or w.aggregate_version<>p_version or p_details->>'policy_version' is distinct from 'rcap2.2' then raise exception 'source changed' using errcode='PT409';end if;
 if p_decision='approve' then
  if p_type='partner_launch_approval' then
   d:=public.rcap_service_evaluate_program(p_slug,p_actor,'complete_setup');
   if not (d->>'allowed')::boolean or p_details->>'materials_hash' is distinct from d->>'materialsHash' or p_details->>'statement_version' is distinct from 'rcap2-final-review-v1' then raise exception 'current substantive partner review required';end if;
   if (select count(*) from public.partner_onboarding_artifacts ar join public.partner_onboarding_artifact_versions v on v.id=ar.current_version_id where ar.workspace_id=w.id and ar.artifact_type in ('implementation_brief','co_branded_page_configuration') and v.generation_status='succeeded' and v.source_drift_invalidated_at is null and v.superseded_at is null and v.normalized_snapshot->>'rcap_dependency_hash'=public.rcap_program_material_scope(w.id,ar.artifact_type) and (ar.artifact_type<>'co_branded_page_configuration' or v.rendered_content#>'{pagePreview,missing}'='[]'::jsonb))<>2 then raise exception 'two current materials required';end if;
   -- These are real partner reviews of the two exact versions shown, not internal approvals.
   for ident in select current_version_id from public.partner_onboarding_artifacts where workspace_id=w.id and artifact_type in ('implementation_brief','co_branded_page_configuration') loop
    perform public.rcap_service_review_onboarding_artifact(p_slug,p_actor,'partner',ident,'approve','RCAP final factual and brand review',null,p_request);
   end loop;
  elsif w.operating_model='legalease_managed' and p_type='legalease_final_review' then
   d:=public.rcap_service_evaluate_program(p_slug,p_actor,'publish_partner_page');
   if not coalesce((d->>'canAuthorizeStart')::boolean,false)
    or p_details->>'scope_hash' is distinct from d->>'scopeHash'
    or p_details->>'materials_hash' is distinct from d->>'materialsHash'
    or p_details->>'operating_model' is distinct from 'legalease_managed'
    or p_details->>'operator_identity' is distinct from 'LegalEase'
    or p_details->>'authority_basis' is distinct from public.rcap_program_policy_source(w.id)#>>'{program_goals,operator_authority_reference}'
    or p_details->>'service_mode' is distinct from public.rcap_program_policy_source(w.id)#>>'{program_goals,service_mode}'
    or p_details->'jurisdictions' is distinct from d->'jurisdictions'
    or p_details->'spanish_enabled' is distinct from coalesce(public.rcap_program_policy_source(w.id)#>'{geography_audience_language_accessibility,enable_spanish}','false'::jsonb)
    or p_details->>'publication_scope' is distinct from '/p/'||p_slug
    or jsonb_typeof(p_details->'material_versions') is distinct from 'array' or jsonb_array_length(p_details->'material_versions')<>2
    or exists(select 1 from public.partner_onboarding_artifacts ar join public.partner_onboarding_artifact_versions v on v.id=ar.current_version_id where ar.workspace_id=w.id and ar.artifact_type in ('implementation_brief','co_branded_page_configuration') and not exists(select 1 from jsonb_array_elements(p_details->'material_versions') m where m->>'type'=ar.artifact_type and m->>'id'=v.id::text and m->>'hash'=v.snapshot_hash and (m->>'version')::integer=v.version_number))
    or p_details->>'statement_version' is distinct from 'rcap-operating-confirmation-v1'
    or p_details->'capabilities' is distinct from ('["publish_partner_page","accept_screenings"]'::jsonb || case when public.rcap_program_policy_source(w.id)#>>'{program_goals,participation_mode}' in ('clinics','both') then '["create_clinic","publish_clinic"]'::jsonb else '[]'::jsonb end || case public.rcap_program_policy_source(w.id)#>>'{program_goals,service_mode}' when 'participant_paid' then '["offer_paid_packet"]'::jsonb when 'sponsored_packets' then '["issue_sponsored_packet"]'::jsonb else '[]'::jsonb end)
    or jsonb_typeof(p_details->'screening_profiles') is distinct from 'object'
    or exists(select 1 from jsonb_array_elements_text(d->'jurisdictions') j where coalesce(length(p_details->'screening_profiles'->>j),0)=0)
    then raise exception 'current internal operating scope and exact materials required' using errcode='42501';end if;
   for ident in select current_version_id from public.partner_onboarding_artifacts where workspace_id=w.id and artifact_type in ('implementation_brief','co_branded_page_configuration') loop
    perform public.rcap_service_review_onboarding_artifact(p_slug,p_actor,'legalease',ident,'approve','Platform Admin operating and publication confirmation',null,p_request);
   end loop;
  else
   if p_details->>'scope_hash' is distinct from public.rcap_program_launch_scope(w.id) or (p_details->>'expires_at')::timestamptz is null or (p_details->>'expires_at')::timestamptz<=now()
    or coalesce(length(btrim(p_details->>'authority_basis')),0)<10 or p_details->'capabilities' is null or not (p_details->'capabilities' ? 'publish_partner_page')
    or not public.rcap_program_commercial_valid(w.id) then raise exception 'current scoped business authorization required';end if;
   if exists(select 1 from jsonb_array_elements_text(p_details->'capabilities') c where c not in ('publish_partner_page','accept_screenings','create_clinic','publish_clinic')) then raise exception 'delegation cannot grant participant or financial authority';end if;
  end if;
 end if;
 insert into public.partner_onboarding_launch_approvals(workspace_id,approval_type,reviewer_type,reviewer_user_id,decision,comments,request_id,policy_details)
 values(w.id,p_type,rt,p_actor,p_decision,'RCAP 2.0 scoped program decision',p_request,p_details) returning id into ident;
 return ident;
end $$;

create or replace function public.rcap_service_stage_program_launch(p_slug text,p_actor uuid,p_operation uuid,p_version bigint,p_hash text,p_versions jsonb,p_authority uuid) returns boolean
language plpgsql security invoker set search_path='' as $$
declare w public.partner_onboarding%rowtype; d jsonb; prepared public.rcap_launch_operation_events%rowtype; delegated public.partner_onboarding_launch_approvals%rowtype;
begin
 perform public.rcap_service_assert_internal_actor(p_actor);
 select * into strict w from public.partner_onboarding where partner_slug=p_slug for update;
 perform 1 from public.partner_records where id=w.partner_record_id for update;
 perform 1 from public.partner_onboarding_sections where workspace_id=w.id for update;
 perform 1 from public.partner_onboarding_artifacts where workspace_id=w.id for update;
 perform 1 from public.partner_onboarding_artifact_versions where workspace_id=w.id for update;
 perform 1 from public.partner_onboarding_launch_approvals where workspace_id=w.id for update;
 perform 1 from public.partner_onboarding_assets where workspace_id=w.id for update;
 perform 1 from public.partner_entitlement where partner_slug=p_slug for update;
 if w.rcap_policy_version<>'rcap2.2' or w.status in ('live','paused','closed') or w.landing_page_ready or p_version is null or w.aggregate_version<>p_version then raise exception 'source changed' using errcode='PT409';end if;
 select * into strict prepared from public.rcap_launch_operation_events where workspace_id=w.id and operation_id=p_operation and actor_auth_user_id=p_actor and snapshot_hash=p_hash and step='prepared' and evidence->>'mode'='real';
 if (case when w.operating_model='legalease_managed' then prepared.evidence->>'operatingDecisionId' else prepared.evidence->>'commercialAuthorityId' end) is distinct from p_authority::text or coalesce(prepared.evidence->>'releaseAuthorization','') !~ '^release:[a-f0-9]{40}$' then raise exception 'exact release and authority binding required';end if;
 if exists(select 1 from public.partner_records r join public.rcap_launch_operation_events e on e.workspace_id=w.id and e.operation_id=p_operation and e.step='prepared' where r.id=w.partner_record_id and ((e.evidence->'snapshot'->'activationRecord'->>'payment_status') is distinct from r.payment_status or (e.evidence->'snapshot'->'activationRecord'->>'stripe_payment_intent_id') is distinct from r.stripe_payment_intent_id or (e.evidence->'snapshot'->'activationRecord'->>'paid_at')::timestamptz is distinct from r.paid_at or (e.evidence->'snapshot'->'activationRecord'->>'payment_amount')::numeric is distinct from r.payment_amount or (e.evidence->'snapshot'->'activationRecord'->>'qualification_status') is distinct from r.qualification_status)) then raise exception 'financial or activation source changed after snapshot';end if;
 if coalesce(prepared.evidence->'intakeJurisdictions',jsonb_build_array(prepared.evidence->>'intakeJurisdiction')) is distinct from public.rcap_program_policy_source(w.id)#>'{geography_audience_language_accessibility,jurisdictions}' then raise exception 'exact current screening jurisdiction set required';end if;
 d:=public.rcap_service_evaluate_program(p_slug,p_actor,'publish_partner_page');
 if not coalesce((d->>'allowed')::boolean,false) or d->>'authorityId' is distinct from p_authority::text or prepared.evidence->'snapshot'->>'scopeHash' is distinct from d->>'scopeHash' then raise exception 'program capability held' using errcode='42501';end if;
 if prepared.evidence->'snapshot'->>'delegationId' is not null then
 select * into delegated from public.partner_onboarding_launch_approvals where id=(prepared.evidence->'snapshot'->>'delegationId')::uuid and workspace_id=w.id and reviewer_user_id=p_actor and approval_type='standing_launch_authorization' and decision='approve' and invalidated_at is null;
 if delegated.id is null or delegated.policy_details->>'scope_hash' is distinct from d->>'scopeHash' or not delegated.policy_details->'capabilities' ? 'publish_partner_page' or coalesce((delegated.policy_details->>'expires_at')::timestamptz,now())<=now() or exists(select 1 from public.partner_onboarding_launch_approvals n where n.workspace_id=w.id and n.approval_type=delegated.approval_type and (n.recorded_at,n.id)>(delegated.recorded_at,delegated.id)) then raise exception 'standing delegation stale or revoked' using errcode='42501';end if;
 end if;
 if jsonb_typeof(p_versions) is distinct from 'array' or jsonb_array_length(p_versions)<>2 or (select count(distinct item->>'type') from jsonb_array_elements(p_versions) item)<>2 then raise exception 'two exact substantive materials required';end if;
 if exists(select 1 from jsonb_array_elements(p_versions) item where not exists(select 1 from public.partner_onboarding_artifacts ar join public.partner_onboarding_artifact_versions v on v.id=ar.current_version_id where ar.workspace_id=w.id and ar.artifact_type=item->>'type' and ar.artifact_type in ('implementation_brief','co_branded_page_configuration') and v.id::text=item->>'id' and v.snapshot_hash=item->>'hash' and v.normalized_snapshot->>'rcap_dependency_hash'=public.rcap_program_material_scope(w.id,ar.artifact_type) and (ar.artifact_type<>'co_branded_page_configuration' or v.rendered_content#>'{pagePreview,missing}'='[]'::jsonb) and (v.partner_review_status='approved' or (w.operating_model='legalease_managed' and v.approval_status='approved' and public.rcap_program_internal_authority(w.id)=p_authority)) and v.generation_status='succeeded' and v.superseded_at is null and v.source_drift_invalidated_at is null and (v.approval_status='approved' or (v.normalized_snapshot->>'rcap_standard_policy'='rcap2.2' and v.generator_version like '%_rcap2')))) then raise exception 'reviewed materials changed' using errcode='PT409';end if;
 if prepared.evidence->'snapshot'->>'materialsHash' is distinct from d->>'materialsHash' then raise exception 'material snapshot changed';end if;
 update public.partner_records set onboarding_status='approved',onboarding_completed_at=coalesce(onboarding_completed_at,now()) where id=w.partner_record_id;
 update public.partner_onboarding set status='live',landing_page_ready=true,internal_approved_at=now(),launched_at=now(),rcap_launch_operation_id=p_operation where id=w.id;
 insert into public.rcap_launch_operation_events(workspace_id,partner_slug,operation_id,request_id,step,actor_auth_user_id,snapshot_hash,authority_reference,evidence)
 values(w.id,p_slug,p_operation,prepared.request_id,'publication_staged',p_actor,p_hash,prepared.authority_reference,jsonb_build_object('mode','real','operatingDecisionId',case when w.operating_model='legalease_managed' then p_authority else null end,'commercialAuthorityId',case when w.operating_model='partner_managed' then p_authority else null end,'workspaceVersion',p_version,'policyVersion','rcap2.2'));
 return true;
end $$;

CREATE OR REPLACE FUNCTION public.rcap_partner_activation_for_launch(p_slug text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select exists(select 1 from public.partner_onboarding w where w.partner_slug=p_slug and w.operating_model='legalease_managed'
 and w.rcap_policy_version='rcap2.2' and w.status='live' and w.landing_page_ready and w.internal_approved_at is not null and w.launched_at is not null
 and public.rcap_program_internal_authority(w.id) is not null
 and exists(select 1 from public.rcap_launch_operation_events e where e.workspace_id=w.id and e.operation_id=w.rcap_launch_operation_id
 and e.step in ('public_verified','complete') and (e.step='complete' or e.created_at>now()-interval '15 minutes')
 and e.evidence->>'operatingDecisionId'=public.rcap_program_internal_authority(w.id)::text
 and not exists(select 1 from public.rcap_launch_operation_events failed where failed.operation_id=e.operation_id and failed.step in ('held','failed')))) or exists(select 1 from public.partner_records r left join public.partner_onboarding w on w.partner_slug=r.partner_slug
 where r.partner_slug=p_slug and coalesce(w.operating_model,'partner_managed')='partner_managed' and r.qualification_status='qualified' and r.provisioning_status in ('active','provisioned') and
 case when w.rcap_launch_operation_id is null then r.payment_status in ('paid','demo_paid') and not exists(select 1 from public.rcap_commercial_authorizations pending where pending.workspace_id=w.id) else
 r.payment_status is distinct from 'demo_paid' and w.status='live' and w.landing_page_ready and w.internal_approved_at is not null and w.launched_at is not null and (case when w.rcap_policy_version='rcap2.2' then public.rcap_program_commercial_valid(w.id) else w.agreement_status='signed' end) and exists(
 select 1 from public.rcap_launch_operation_events e join public.rcap_commercial_authorizations a on a.id=(e.evidence->>'commercialAuthorityId')::uuid
 join public.partner_onboarding_assets d on d.id=a.document_id and d.workspace_id=w.id and d.sha256_hex=a.document_hash
 where e.workspace_id=w.id and e.operation_id=w.rcap_launch_operation_id and e.step in ('public_verified','complete') and (e.step='complete' or e.created_at>now()-interval '15 minutes') and a.workspace_id=w.id and a.expires_at>now() and a.access_mode=r.access_mode
 and d.lifecycle_status='active' and d.review_status='approved' and (a.kind<>'verified_paid' or (r.payment_status='paid' and r.stripe_payment_intent_id ~ '^pi_[A-Za-z0-9]+$' and r.paid_at<=now() and r.payment_amount>0))
 and not exists(select 1 from public.rcap_launch_operation_events failed where failed.operation_id=e.operation_id and failed.step in ('held','failed')))
 end)
$function$;


-- One published jurisdiction scope, reused by entry, both claims and Clinic.
-- A new publication binds its full set. Older single-state receipts retain only that state.
create function public.rcap_program_screening_jurisdictions(p_slug text) returns text[]
language plpgsql stable security invoker set search_path='' as $$
declare w public.partner_onboarding%rowtype; r public.partner_records%rowtype; configured jsonb; published jsonb; authorized text[];
begin
 if not public.rcap_partner_activation_for_launch(p_slug) then return '{}'::text[];end if;
 select * into r from public.partner_records where partner_slug=p_slug;
 select * into w from public.partner_onboarding where partner_slug=p_slug;
 if w.id is not null and (w.status<>'live' or not w.landing_page_ready) then return '{}'::text[];end if;
 select response_data->'jurisdictions' into configured from public.partner_onboarding_sections
 where workspace_id=w.id and section_key='geography_audience_language_accessibility' and (w.rcap_policy_version='rcap2.2' or status='approved');
 if w.rcap_launch_operation_id is not null then
  select coalesce(evidence->'intakeJurisdictions',jsonb_build_array(evidence->>'intakeJurisdiction')) into published
  from public.rcap_launch_operation_events where operation_id=w.rcap_launch_operation_id and workspace_id=w.id and step='prepared';
 else
  -- Previously published legacy configuration (or the original authorized single-state record).
  configured:=coalesce(configured,jsonb_build_array(coalesce(r.target_state,r.state)));
  published:=configured;
 end if;
 if jsonb_typeof(configured) is distinct from 'array' or jsonb_typeof(published) is distinct from 'array' then return '{}'::text[];end if;
 select coalesce(array_agg(distinct j order by j),'{}') into authorized from jsonb_array_elements_text(configured) j
 where j=any(public.rcap_screening_jurisdictions()) and published ? j;
 return authorized;
end $$;

-- Program attribution is never a sponsored-packet entitlement. Recheck actual funded scope.
create function public.rcap_program_packet_scope_authorized(p_slug text,p_jurisdiction text) returns boolean
language sql stable security invoker set search_path='' as $$
 select coalesce(p_jurisdiction=any(public.rcap_program_screening_jurisdictions(p_slug)) and (
 exists(select 1 from public.partner_entitlement legacy where legacy.partner_slug=p_slug and (legacy.screenings_allowed>0 or (legacy.overage_enabled and not legacy.pause_at_cap)) and not exists(select 1 from public.partner_onboarding where partner_slug=p_slug and rcap_policy_version='rcap2.2'))
 or exists(select 1 from public.partner_onboarding w join public.partner_packet_entitlement e on e.partner_id=w.partner_record_id
 where w.partner_slug=p_slug and public.rcap_program_funding_valid(w.id)
 and ((w.operating_model='legalease_managed' and public.rcap_program_policy_source(w.id)#>>'{program_goals,service_mode}'='sponsored_packets') or (w.operating_model='partner_managed' and e.id=(select a.packet_entitlement_id from public.rcap_commercial_authorizations a where a.workspace_id=w.id order by a.created_at desc,a.id desc limit 1)))
 and e.entitlement_scope='sponsored_packets' and e.effective_at<=now() and (e.expires_at is null or e.expires_at>now()) and e.packet_cap>0)),false)
$$;
create function public.rcap_program_packet_authorized(p_slug text,p_jurisdiction text) returns boolean
language sql stable security invoker set search_path='' as $$
 select public.rcap_program_packet_scope_authorized(p_slug,p_jurisdiction) and (
 exists(select 1 from public.partner_entitlement e where e.partner_slug=p_slug and (e.screenings_allowed>e.screenings_used or (e.overage_enabled and not e.pause_at_cap)) and not exists(select 1 from public.partner_onboarding where partner_slug=p_slug and rcap_policy_version='rcap2.2'))
 or exists(select 1 from public.partner_onboarding w join public.partner_packet_entitlement e on e.partner_id=w.partner_record_id
 where w.partner_slug=p_slug and w.rcap_policy_version='rcap2.2' and e.entitlement_scope='sponsored_packets' and e.effective_at<=now() and (e.expires_at is null or e.expires_at>now())
 and (w.operating_model='legalease_managed' or e.id=(select a.packet_entitlement_id from public.rcap_commercial_authorizations a where a.workspace_id=w.id order by a.created_at desc,a.id desc limit 1))
 and e.packet_cap>(select count(*) from public.packet_credit_ledger l where l.entitlement_id=e.id and l.event_type in ('reserved','consumed'))))
$$;

CREATE OR REPLACE FUNCTION public.claim_rcap_screening_session(p_partner_slug text, p_jurisdiction text, p_clinic_redemption text)
 RETURNS TABLE(ok boolean, session_id uuid, reason text, screenings_used integer, screenings_allowed integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_partner_slug text;
  v_jurisdiction text;
  v_session_id uuid;
  v_screenings_used integer;
  v_screenings_allowed integer;
begin
  v_partner_slug := nullif(trim(p_partner_slug), '');
  v_jurisdiction := upper(nullif(trim(p_jurisdiction), ''));

  if v_partner_slug is null then
    return query select false, null::uuid, 'partner_inactive'::text, null::integer, null::integer;
    return;
  end if;

  if v_jurisdiction is null or v_jurisdiction !~ '^[A-Z]{2,3}$' then
    raise exception 'jurisdiction must be a 2-3 letter uppercase code';
  end if;

  perform 1 from public.partner_onboarding where partner_slug=v_partner_slug for update;
  if v_jurisdiction<>all(public.rcap_program_screening_jurisdictions(v_partner_slug)) then
    return query select false, null::uuid, 'jurisdiction_not_authorized'::text, null::integer, null::integer;
    return;
  end if;
  if p_clinic_redemption is not null and not exists(
    select 1 from public.clinic_event_access_redemptions d join public.clinic_events e on e.id=d.event_id
    where d.redemption_nonce_hash=p_clinic_redemption and d.redeemed_at>now()-interval '8 hours'
    and e.partner_slug=v_partner_slug and e.jurisdiction=v_jurisdiction and e.status='published'
  ) then return query select false,null::uuid,'clinic_entry_required'::text,null::integer,null::integer;return;end if;
  if not exists (
    select 1
    from public.partner_records pr
    where pr.partner_slug = v_partner_slug
      and public.rcap_partner_activation_for_launch(pr.partner_slug)
      and ((pr.qualification_status = 'qualified' and pr.provisioning_status in ('provisioned', 'active')) or exists(select 1 from public.partner_onboarding where partner_slug=v_partner_slug and operating_model='legalease_managed' and public.rcap_program_internal_authority(id) is not null))
  ) then
    return query select false, null::uuid, 'partner_inactive'::text, null::integer, null::integer;
    return;
  end if;

  select pe.screenings_used, pe.screenings_allowed
  into v_screenings_used, v_screenings_allowed
  from public.partner_entitlement pe
  where pe.partner_slug = v_partner_slug;

  if v_screenings_allowed is null and not exists(select 1 from public.partner_onboarding where partner_slug=v_partner_slug and operating_model='legalease_managed') then
    return query select false, null::uuid, 'partner_inactive'::text, null::integer, null::integer;
    return;
  end if;

  if p_clinic_redemption is null and coalesce((select case when w.operating_model='legalease_managed' then public.rcap_program_policy_source(w.id)#>>'{access_sponsorship_capacity,participant_access_model}' else r.access_mode end from public.partner_records r left join public.partner_onboarding w on w.partner_slug=r.partner_slug where r.partner_slug=v_partner_slug),'open') in ('required_code','invite_only') then
    return query select false,null::uuid,'code_required'::text,null::integer,null::integer;return;
  end if;
  v_session_id := gen_random_uuid();

  insert into public.screening_sessions (
    session_id, jurisdiction, answers, current_question_id, furthest_stage,
    status, last_drop_question, partner_slug, flow_mode, claimed_slot_state,
    attribution_source, partner_benefit_active
  )
  values (
    v_session_id, v_jurisdiction, '{}'::jsonb, null, null,
    'in_progress', null, v_partner_slug, 'rcap', 'claimed',
    'partner_page', true
  );

  return query
  select true, v_session_id, null::text, v_screenings_used, v_screenings_allowed;
end;
$function$;

revoke all on function public.claim_rcap_screening_session(text,text,text) from public,anon,authenticated;
 grant execute on function public.claim_rcap_screening_session(text,text,text) to service_role;
 create or replace function public.claim_rcap_screening_session(p_partner_slug text,p_jurisdiction text)
 returns table(ok boolean,session_id uuid,reason text,screenings_used integer,screenings_allowed integer)
 language plpgsql security definer set search_path='' as $$
 begin return query select * from public.claim_rcap_screening_session(p_partner_slug,p_jurisdiction,null::text);end $$;

CREATE OR REPLACE FUNCTION public.claim_partner_screening_session(p_partner_slug text, p_jurisdiction text, p_code_hash text DEFAULT NULL::text, p_now timestamp with time zone DEFAULT now())
 RETURNS TABLE(ok boolean, session_id uuid, reason text, benefit_active boolean, attribution_source text, campaign_name text, access_mode text, code_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_partner_slug text;
  v_jurisdiction text;
  v_code_hash text;
  v_access_mode text;
  v_session_id uuid;
  v_code_id uuid;
  v_code_campaign text;
  v_code_valid boolean := false;
  v_code_reason text;
  v_code_type text;
  v_effective_max integer;
  v_rows integer;
  v_benefit boolean := false;
  v_source text;
  v_reason text;
begin
  v_partner_slug := nullif(trim(p_partner_slug), '');
  v_jurisdiction := upper(nullif(trim(p_jurisdiction), ''));
  v_code_hash := nullif(trim(p_code_hash), '');

  if v_jurisdiction is null or v_jurisdiction !~ '^[A-Z]{2,3}$' then
    raise exception 'jurisdiction must be a 2-3 letter uppercase code';
  end if;

  if v_partner_slug is null then
    return query select false, null::uuid, 'partner_inactive'::text, false, null::text, null::text, null::text, null::uuid;
    return;
  end if;

  perform 1 from public.partner_onboarding where partner_slug=v_partner_slug for update;
  if v_jurisdiction<>all(public.rcap_program_screening_jurisdictions(v_partner_slug)) then
    return query select false, null::uuid, 'jurisdiction_not_authorized'::text, false, null::text, null::text, null::text, null::uuid;
    return;
  end if;
  -- Partner must be active to grant any partner benefit.
  if not exists (
    select 1 from public.partner_records pr
    where pr.partner_slug = v_partner_slug
      and public.rcap_partner_activation_for_launch(pr.partner_slug)
      and ((pr.qualification_status = 'qualified' and pr.provisioning_status in ('provisioned', 'active')) or exists(select 1 from public.partner_onboarding where partner_slug=v_partner_slug and operating_model='legalease_managed' and public.rcap_program_internal_authority(id) is not null))
  ) then
    return query select false, null::uuid, 'partner_inactive'::text, false, null::text, null::text, null::text, null::uuid;
    return;
  end if;

  select pr.access_mode into v_access_mode
  from public.partner_records pr
  where pr.partner_slug = v_partner_slug;
  if exists(select 1 from public.partner_onboarding where partner_slug=v_partner_slug and operating_model='legalease_managed') then
    select public.rcap_program_policy_source(id)#>>'{access_sponsorship_capacity,participant_access_model}' into v_access_mode from public.partner_onboarding where partner_slug=v_partner_slug;
  end if;
  v_access_mode := coalesce(v_access_mode, 'open');

  -- Legacy allocation prerequisites remain intact. Internal screening grants no packet allocation.
  if not exists (
    select 1 from public.partner_entitlement pe where pe.partner_slug = v_partner_slug
  ) and not exists(select 1 from public.partner_onboarding where partner_slug=v_partner_slug and operating_model='legalease_managed') then
    return query select false, null::uuid, 'partner_inactive'::text, false, null::text, null::text, v_access_mode, null::uuid;
    return;
  end if;

  -- Resolve the code (validation only; redemption happens atomically below).
  if v_code_hash is not null then
    select v.valid, v.reason, v.campaign_name, v.code_id, v.code_type
    into v_code_valid, v_code_reason, v_code_campaign, v_code_id, v_code_type
    from public.validate_partner_access_code(v_partner_slug, v_code_hash, p_now) v;
  end if;

  -- Decide benefit + attribution source per access mode.
  if v_access_mode = 'open' then
    v_benefit := true;
    if v_code_valid then
      v_source := 'partner_code';
    else
      v_source := 'partner_page';
      v_code_id := null;
      v_code_campaign := null;
    end if;
  elsif v_access_mode = 'optional_code' then
    if v_code_hash is not null and not v_code_valid then
      -- A code was entered but is not valid: surface the error, do not attribute.
      return query select false, null::uuid, coalesce(v_code_reason, 'invalid')::text, false, null::text, null::text, v_access_mode, null::uuid;
      return;
    end if;
    v_benefit := true;
    if v_code_valid then
      v_source := 'partner_code';
    else
      v_source := 'partner_page';
      v_code_id := null;
      v_code_campaign := null;
    end if;
  else
    -- required_code and invite_only: a valid code is mandatory for partner benefit.
    if not v_code_valid then
      return query select false, null::uuid, coalesce(v_code_reason, 'code_required')::text, false, null::text, null::text, v_access_mode, null::uuid;
      return;
    end if;
    v_benefit := true;
    v_source := 'partner_code';
  end if;

  -- Atomically redeem a limited/single-use code as part of the claim.
  if v_benefit and v_source = 'partner_code' and v_code_id is not null then
    v_effective_max := case
      when v_code_type = 'single_use' then 1
      when v_code_type = 'limited_use' then (select c.max_uses from public.partner_access_codes c where c.id = v_code_id)
      else null
    end;

    update public.partner_access_codes c
    set uses_count = c.uses_count + 1,
        last_used_at = p_now,
        updated_at = now()
    where c.id = v_code_id
      and (v_effective_max is null or c.uses_count < v_effective_max);

    get diagnostics v_rows = row_count;

    if v_rows = 0 then
      -- Lost a race for the last remaining use.
      return query select false, null::uuid, 'exhausted'::text, false, null::text, null::text, v_access_mode, null::uuid;
      return;
    end if;
  end if;

  -- Create the attributed session.
  v_session_id := gen_random_uuid();
  insert into public.screening_sessions (
    session_id, jurisdiction, answers, current_question_id, furthest_stage,
    status, last_drop_question, partner_slug, flow_mode, claimed_slot_state,
    partner_access_code_id, campaign_name, attribution_source, partner_benefit_active
  )
  values (
    v_session_id, v_jurisdiction, '{}'::jsonb, null, null,
    'in_progress', null, v_partner_slug, 'rcap', 'claimed',
    v_code_id, v_code_campaign, v_source, true
  );

  -- Audit.
  if v_code_id is not null then
    insert into public.rcap_record_events (record_type, record_id, partner_slug, event_type, occurred_at, actor, metadata)
    values ('partner_access_code', v_code_id::text, v_partner_slug, 'partner_code_used', p_now, 'system',
            jsonb_build_object('session_id', v_session_id, 'campaign_name', v_code_campaign));
  end if;

  return query select true, v_session_id, null::text, v_benefit, v_source, v_code_campaign, v_access_mode, v_code_id;
end;
$function$;

create or replace function public.rcap_program_clinic_scope(p_slug text,p_actor uuid,p_action text,p_jurisdiction text,p_sponsorship integer) returns text
language plpgsql security invoker set search_path='' as $$
declare w public.partner_onboarding%rowtype; d jsonb; s jsonb; jurisdiction text; available integer;
begin
 select * into strict w from public.partner_onboarding where partner_slug=p_slug for update;
 d:=public.rcap_service_evaluate_program(p_slug,p_actor,p_action);
 if not coalesce((d->>'allowed')::boolean,false) then raise exception 'clinic_parent_program_not_authorized' using errcode='42501';end if;
 s:=public.rcap_program_policy_source(w.id);
 if coalesce(s#>>'{program_goals,participation_mode}','') not in ('clinics','both') then raise exception 'clinic_participation_not_configured';end if;
 jurisdiction:=coalesce(p_jurisdiction,case when jsonb_array_length(s#>'{geography_audience_language_accessibility,jurisdictions}')=1 then s#>>'{geography_audience_language_accessibility,jurisdictions,0}' end);
 if jurisdiction is null or not (s#>'{geography_audience_language_accessibility,jurisdictions}' ? jurisdiction) or jurisdiction<>all(public.rcap_screening_jurisdictions()) then raise exception 'clinic_parent_jurisdiction_required';end if;
 if p_sponsorship is not null and p_sponsorship>0 then
  perform 1 from public.partner_packet_entitlement where partner_id=w.partner_record_id for update;
  select greatest(0,e.packet_cap-(select count(*) from public.packet_credit_ledger l where l.entitlement_id=e.id and l.event_type in ('reserved','consumed'))) into available
  from public.rcap_commercial_authorizations a join public.partner_packet_entitlement e on e.id=a.packet_entitlement_id where a.workspace_id=w.id and a.kind<>'screening_only' and e.effective_at<=now() and (e.expires_at is null or e.expires_at>now()) order by a.created_at desc,a.id desc limit 1;
  if w.operating_model='legalease_managed' then
   select greatest(0,e.packet_cap-(select count(*) from public.packet_credit_ledger l where l.entitlement_id=e.id and l.event_type in ('reserved','consumed'))) into available
   from public.partner_packet_entitlement e where e.partner_id=w.partner_record_id and e.entitlement_scope='sponsored_packets' and e.effective_at<=now() and e.expires_at is null;
  end if;
  if not public.rcap_program_funding_valid(w.id) or (w.operating_model='legalease_managed' and s#>>'{program_goals,service_mode}' is distinct from 'sponsored_packets') or p_sponsorship>coalesce(available,0) then raise exception 'clinic_cannot_add_sponsorship';end if;
 end if;
 return jurisdiction;
end $$;

CREATE OR REPLACE FUNCTION public.clinic_redeem_event_code(p_public_slug text, p_code_hash text, p_redemption_nonce_hash text)
 RETURNS TABLE(outcome text, event_id uuid, partner_slug text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_event public.clinic_events%rowtype; v_code public.clinic_event_access_codes%rowtype;
begin
  select * into v_event from public.clinic_events where public_slug = p_public_slug for update;
  if not found or v_event.status <> 'published' then return query select 'event_unavailable'::text, null::uuid, null::text; return; end if;
  if v_event.jurisdiction is null or v_event.jurisdiction<>all(public.rcap_program_screening_jurisdictions(v_event.partner_slug)) then return query select 'event_unavailable'::text,null::uuid,null::text;return;end if;
  select * into v_code from public.clinic_event_access_codes
  where clinic_event_access_codes.event_id = v_event.id and code_hash = lower(p_code_hash) for update;
  if not found then return query select 'invalid_code'::text, null::uuid, null::text; return; end if;
  if exists (select 1 from public.clinic_event_access_redemptions r where r.access_code_id = v_code.id and r.redemption_nonce_hash = p_redemption_nonce_hash) then
    return query select 'already_redeemed'::text, v_event.id, v_event.partner_slug; return;
  end if;
  if not v_code.is_active or (v_code.starts_at is not null and now() < v_code.starts_at)
    or (v_code.expires_at is not null and now() >= v_code.expires_at)
    or (v_code.max_uses is not null and v_code.uses_count >= v_code.max_uses)
    or (select count(*) from public.clinic_event_access_redemptions r where r.event_id = v_event.id) >= v_event.capacity
  then return query select 'code_unavailable'::text, null::uuid, null::text; return; end if;
  insert into public.clinic_event_access_redemptions(event_id, access_code_id, redemption_nonce_hash)
  values (v_event.id, v_code.id, lower(p_redemption_nonce_hash));
  update public.clinic_event_access_codes set uses_count = uses_count + 1, last_used_at = now() where id = v_code.id;
  return query select 'redeemed'::text, v_event.id, v_event.partner_slug;
end $function$;

CREATE OR REPLACE FUNCTION public.clinic_start_assisted_session(p_event_id uuid, p_event_staff_id uuid, p_participant_user_id uuid, p_screening_session_id uuid, p_handoff_token_hash text, p_device_nonce_hash text, p_consent_version text, p_consented_at timestamp with time zone, p_ttl_minutes integer DEFAULT 30)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_id uuid;
begin
  if p_consented_at is null or p_consented_at > now() then raise exception 'clinic_consent_required'; end if;
  if p_ttl_minutes < 5 or p_ttl_minutes > 120 then raise exception 'clinic_session_ttl_invalid'; end if;
  if not exists (
    select 1 from public.clinic_event_staff s
    join public.partner_users pu on pu.id=s.partner_user_id
    join public.clinic_events e on e.id=s.event_id
    where s.id=p_event_staff_id and s.event_id=p_event_id and s.status='approved'
      and 'assist'=any(s.permissions) and pu.status='active' and pu.partner_slug=e.partner_slug
      and e.status='published'
  ) then raise exception 'clinic_staff_not_approved'; end if;
  if not exists (select 1 from auth.users where id=p_participant_user_id) then raise exception 'clinic_participant_not_found'; end if;
  if p_screening_session_id is null or not exists (
    select 1 from public.screening_sessions where session_id=p_screening_session_id
  ) then raise exception 'clinic_screening_not_found'; end if;
  if not exists(select 1 from public.clinic_events e join public.screening_sessions s on s.session_id=p_screening_session_id
    where e.id=p_event_id and s.partner_slug=e.partner_slug and s.jurisdiction=e.jurisdiction
    and e.jurisdiction=any(public.rcap_program_screening_jurisdictions(e.partner_slug))) then raise exception 'clinic_program_scope_denied' using errcode='42501';end if;
  insert into public.clinic_assisted_sessions(
    event_id,event_staff_id,participant_user_id,screening_session_id,handoff_token_hash,
    device_nonce_hash,consent_version,consented_at,expires_at
  ) values (
    p_event_id,p_event_staff_id,p_participant_user_id,p_screening_session_id,
    lower(p_handoff_token_hash),lower(p_device_nonce_hash),trim(p_consent_version),
    p_consented_at,now()+make_interval(mins=>p_ttl_minutes)
  ) returning id into v_id;
  insert into public.clinic_event_audit(event_id,action,target_type,target_id,metadata)
  values (p_event_id,'assistance_consented','assisted_session',v_id,jsonb_build_object('consent_version',p_consent_version));
  return v_id;
end $function$;

CREATE OR REPLACE FUNCTION public.record_partner_packet_generation(p_session_id uuid, p_now timestamp with time zone DEFAULT now())
 RETURNS TABLE(recorded boolean, counted_as text, reason text, partner_slug text, screenings_used integer, screenings_allowed integer, overage_packets integer, overage_amount_cents integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_session public.screening_sessions%rowtype;
  v_ent public.partner_entitlement%rowtype;
  v_counted text;
  v_price integer;
begin
  select * into v_session
  from public.screening_sessions ss
  where ss.session_id = p_session_id
  limit 1;

  if not found
     or v_session.flow_mode <> 'rcap'
     or v_session.partner_slug is null
     or v_session.partner_benefit_active is not true then
    return query select false, 'not_counted'::text, 'not_partner_benefit'::text,
                        v_session.partner_slug, null::integer, null::integer, null::integer, null::integer;
    return;
  end if;

  perform 1 from public.partner_onboarding locked_workspace where locked_workspace.partner_slug=v_session.partner_slug for update;
  if v_session.jurisdiction<>all(public.rcap_program_screening_jurisdictions(v_session.partner_slug))
    or exists(select 1 from public.partner_onboarding w where w.partner_slug=v_session.partner_slug and w.rcap_policy_version='rcap2.2'
      and not public.rcap_program_packet_scope_authorized(v_session.partner_slug,v_session.jurisdiction)) then
    return query select false,'not_counted'::text,'packet_authority_required'::text,v_session.partner_slug,null::integer,null::integer,null::integer,null::integer;return;
  end if;
  if v_session.claimed_slot_state is distinct from 'claimed' then
    return query select false, 'not_counted'::text, 'already_recorded'::text,
                        v_session.partner_slug, null::integer, null::integer, null::integer, null::integer;
    return;
  end if;

  select * into v_ent
  from public.partner_entitlement pe
  where pe.partner_slug = v_session.partner_slug
  for update;

  if not found then
    return query select false, 'not_counted'::text, 'no_entitlement'::text,
                        v_session.partner_slug, null::integer, null::integer, null::integer, null::integer;
    return;
  end if;

  if v_ent.screenings_used < v_ent.screenings_allowed then
    update public.partner_entitlement pe
    set screenings_used = pe.screenings_used + 1, updated_at = now()
    where pe.partner_slug = v_ent.partner_slug
    returning pe.screenings_used, pe.screenings_allowed, pe.overage_packets, pe.overage_amount_cents
    into v_ent.screenings_used, v_ent.screenings_allowed, v_ent.overage_packets, v_ent.overage_amount_cents;
    v_counted := 'included';
  elsif v_ent.pause_at_cap then
    insert into public.rcap_record_events (record_type, record_id, partner_slug, event_type, occurred_at, actor, metadata)
    values ('partner_entitlement', v_ent.partner_slug, v_ent.partner_slug, 'partner_packet_cap_reached', p_now, 'system',
            jsonb_build_object('session_id', p_session_id, 'paused', true));
    return query select false, 'capped'::text, 'paused_at_cap'::text,
                        v_ent.partner_slug, v_ent.screenings_used, v_ent.screenings_allowed,
                        v_ent.overage_packets, v_ent.overage_amount_cents;
    return;
  elsif v_ent.overage_enabled then
    v_price := v_ent.overage_packet_price_cents;
    update public.partner_entitlement pe
    set overage_packets = pe.overage_packets + 1,
        overage_amount_cents = pe.overage_amount_cents + v_price,
        updated_at = now()
    where pe.partner_slug = v_ent.partner_slug
    returning pe.screenings_used, pe.screenings_allowed, pe.overage_packets, pe.overage_amount_cents
    into v_ent.screenings_used, v_ent.screenings_allowed, v_ent.overage_packets, v_ent.overage_amount_cents;
    v_counted := 'overage';
  else
    update public.screening_sessions ss
    set claimed_slot_state = 'consumed', status = 'completed', updated_at = now()
    where ss.session_id = p_session_id;
    insert into public.rcap_record_events (record_type, record_id, partner_slug, event_type, occurred_at, actor, metadata)
    values ('partner_entitlement', v_ent.partner_slug, v_ent.partner_slug, 'partner_packet_cap_reached', p_now, 'system',
            jsonb_build_object('session_id', p_session_id, 'paused', false, 'overage_enabled', false));
    return query select false, 'not_counted'::text, 'cap_reached_no_overage'::text,
                        v_ent.partner_slug, v_ent.screenings_used, v_ent.screenings_allowed,
                        v_ent.overage_packets, v_ent.overage_amount_cents;
    return;
  end if;

  update public.screening_sessions ss
  set claimed_slot_state = 'consumed', status = 'completed', updated_at = now()
  where ss.session_id = p_session_id;

  insert into public.rcap_record_events (record_type, record_id, partner_slug, event_type, occurred_at, actor, metadata)
  values ('partner_entitlement', v_ent.partner_slug, v_ent.partner_slug,
          case when v_counted = 'overage' then 'partner_packet_overage_recorded' else 'partner_packet_credit_consumed' end,
          p_now, 'system', jsonb_build_object('session_id', p_session_id, 'counted_as', v_counted));

  -- Analytics: one packet_generated per successful credit (included or overage),
  -- plus packet_overage_recorded for overage. Fires once (slot just consumed).
  insert into public.rcap_screening_analytics_events
    (session_id, partner_slug, partner_access_code_id, campaign_name, event_type, packet_route_available, occurred_at, metadata)
  values
    (v_session.session_id, v_session.partner_slug, v_session.partner_access_code_id, v_session.campaign_name,
     'packet_generated', true, p_now, jsonb_build_object('counted_as', v_counted));

  if v_counted = 'overage' then
    insert into public.rcap_screening_analytics_events
      (session_id, partner_slug, partner_access_code_id, campaign_name, event_type, occurred_at, metadata)
    values
      (v_session.session_id, v_session.partner_slug, v_session.partner_access_code_id, v_session.campaign_name,
       'packet_overage_recorded', p_now, jsonb_build_object('overage_packet_price_cents', v_price));
  end if;

  return query select true, v_counted, null::text,
                      v_ent.partner_slug, v_ent.screenings_used, v_ent.screenings_allowed,
                      v_ent.overage_packets, v_ent.overage_amount_cents;
end;
$function$;

CREATE OR REPLACE FUNCTION public.clinic_reserve_packet_credit(p_case_id uuid, p_render_job_id uuid)
 RETURNS TABLE(outcome text, reservation_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_case public.clinic_cases%rowtype;
  v_event public.clinic_events%rowtype;
  v_job public.packet_render_jobs%rowtype;
  v_existing public.clinic_packet_reservations%rowtype;
  v_active_count integer;
  v_id uuid;
begin
  select * into v_case from public.clinic_cases where id=p_case_id for update;
  if not found then return query select 'case_not_found'::text,null::uuid; return; end if;
  if v_case.route_disposition <> 'packet' then return query select 'no_credit_route'::text,null::uuid; return; end if;
  if v_case.matter_id is null then return query select 'matter_not_bound'::text,null::uuid; return; end if;

  select * into v_job from public.packet_render_jobs where id=p_render_job_id for update;
  if not found then return query select 'render_job_not_found'::text,null::uuid; return; end if;
  select * into v_event from public.clinic_events where id=v_case.event_id for update;
  if not found or v_event.status not in ('published','paused','closed')
    then return query select 'event_unavailable'::text,null::uuid; return; end if;
  if v_job.matter_id is distinct from v_case.matter_id
    or v_job.partner_id is distinct from (
      select pr.id from public.partner_records pr where pr.partner_slug=v_event.partner_slug
    )
    or (v_job.consumer_auth_user_id is not null and v_job.consumer_auth_user_id is distinct from v_case.participant_user_id)
  then return query select 'render_job_owner_mismatch'::text,null::uuid; return; end if;

  select * into v_existing from public.clinic_packet_reservations
  where render_job_id=p_render_job_id for update;
  if found then
    return query select case v_existing.status
      when 'consumed' then 'already_consumed'
      when 'released' then 'already_released'
      else 'already_reserved' end,v_existing.id;
    return;
  end if;
  select * into v_existing from public.clinic_packet_reservations
  where clinic_case_id=p_case_id and status in ('reserved','consumed') for update;
  if found then
    return query select case when v_existing.status='consumed' then 'already_consumed' else 'already_reserved' end,v_existing.id;
    return;
  end if;

  if not coalesce(public.rcap_program_packet_authorized(v_event.partner_slug,v_event.jurisdiction),false) then
    return query select 'program_packet_authority_required'::text,null::uuid;return;
  end if;
  if v_event.sponsorship_allocation is not null then
    select count(*)::integer into v_active_count
    from public.clinic_packet_reservations
    where event_id=v_event.id and status in ('reserved','consumed');
    if v_active_count >= v_event.sponsorship_allocation
      then return query select 'sponsorship_exhausted'::text,null::uuid; return; end if;
  end if;

  insert into public.clinic_packet_reservations(
    event_id,clinic_case_id,render_job_id,participant_user_id
  ) values (v_case.event_id,v_case.id,p_render_job_id,v_case.participant_user_id)
  returning id into v_id;
  insert into public.clinic_event_audit(event_id,action,target_type,target_id)
  values(v_case.event_id,'packet_credit_reserved','packet_reservation',v_id);
  return query select 'reserved'::text,v_id;
end $function$;

CREATE OR REPLACE FUNCTION public.sponsored_packet_render_authority(p_route_key text, p_session_id uuid, p_briefcase_item_id uuid, p_consumer_auth_user_id uuid)
 RETURNS TABLE(valid boolean, reason text, partner_slug text, partner_id uuid, clinic_event_id uuid, clinic_case_id uuid)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_route public.sponsored_packet_render_routes%rowtype;
  v_item public.consumer_briefcase_items%rowtype;
  v_source public.consumer_pending_screening_results%rowtype;
  v_session public.screening_sessions%rowtype;
  v_case public.clinic_cases%rowtype;
  v_event public.clinic_events%rowtype;
  v_partner_id uuid;
begin
  if p_route_key is null or p_session_id is null
     or p_briefcase_item_id is null or p_consumer_auth_user_id is null then
    return query select false, 'invalid_input'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  select * into v_route from public.sponsored_packet_render_routes r
   where r.route_key = p_route_key and r.active;
  if not found then
    return query select false, 'route_not_registered'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  select * into v_item from public.consumer_briefcase_items i
   where i.id = p_briefcase_item_id and i.user_id = p_consumer_auth_user_id;
  if not found then
    return query select false, 'wrong_owner'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;
  if v_item.jurisdiction is distinct from v_route.jurisdiction then
    return query select false, 'wrong_jurisdiction_or_route'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  select * into v_source from public.consumer_pending_screening_results p
   where p.pending_id = v_item.source_pending_result_id;
  if not found or v_source.status <> 'CLAIMED'
     or v_source.claimed_matter_id is distinct from v_item.id
     or v_source.claimed_user_id is distinct from v_item.user_id then
    return query select false, 'wrong_item'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;
  if v_source.anonymous_session_id is distinct from p_session_id then
    return query select false, 'wrong_session'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;
  if v_source.product <> 'rcap_partner'
     or v_source.partner_slug is distinct from v_route.partner_slug then
    return query select false, 'wrong_partner'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;
  if v_source.jurisdiction is distinct from v_route.jurisdiction then
    return query select false, 'wrong_jurisdiction_or_route'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  select * into v_session from public.screening_sessions s where s.session_id = p_session_id;
  if not found or v_session.flow_mode <> 'rcap' or v_session.partner_benefit_active is not true then
    return query select false, 'sponsorship_inactive'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;
  if v_session.partner_slug is distinct from v_route.partner_slug then
    return query select false, 'wrong_partner'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;
  if v_session.jurisdiction is distinct from v_route.jurisdiction then
    return query select false, 'wrong_jurisdiction_or_route'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  select c.* into v_case from public.clinic_cases c
   where c.event_id = v_source.event_id
     and c.participant_user_id = v_item.user_id
     and c.screening_session_id = p_session_id
     and c.matter_id = v_item.id;
  if not found then
    return query select false, 'clinic_scope_mismatch'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;
  if v_case.jurisdiction is distinct from v_route.jurisdiction or v_case.route_disposition <> 'packet' then
    return query select false, 'wrong_jurisdiction_or_route'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  select * into v_event from public.clinic_events e where e.id = v_case.event_id;
  if not found
     or v_event.partner_slug is distinct from v_route.partner_slug
     or v_event.program_key is distinct from v_route.program_key
     or (v_route.clinic_event_name is not null and v_event.name is distinct from v_route.clinic_event_name) then
    return query select false, 'clinic_scope_mismatch'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;
  if v_event.jurisdiction is distinct from v_route.jurisdiction then
    return query select false, 'wrong_jurisdiction_or_route'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;
  if v_event.status <> 'published'
     or v_event.sponsorship_allocation is null or v_event.sponsorship_allocation < 0 then
    return query select false, 'sponsorship_inactive'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  if not coalesce(public.rcap_program_packet_scope_authorized(v_session.partner_slug,v_session.jurisdiction),false) then
    return query select false,'program_packet_authority_required'::text,null::text,null::uuid,null::uuid,null::uuid;return;
  end if;
  select pr.id into v_partner_id from public.partner_records pr
   where pr.partner_slug = v_route.partner_slug;
  if v_partner_id is null then
    return query select false, 'no_entitlement'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  return query select true, null::text, v_route.partner_slug, v_partner_id, v_event.id, v_case.id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_service_stage_real_launch(p_slug text, p_actor uuid, p_operation uuid, p_version bigint, p_hash text, p_versions jsonb, p_authority uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare w public.partner_onboarding%rowtype; a public.rcap_commercial_authorizations%rowtype; consent public.partner_onboarding_launch_approvals%rowtype; final_review public.partner_onboarding_launch_approvals%rowtype; begin
 if exists(select 1 from public.partner_onboarding where partner_slug=p_slug and rcap_policy_version='rcap2.2') then return public.rcap_service_stage_program_launch(p_slug,p_actor,p_operation,p_version,p_hash,p_versions,p_authority);end if;
 perform public.rcap_service_assert_internal_actor(p_actor);
 select * into strict w from public.partner_onboarding where partner_slug=p_slug for update;
 perform 1 from public.partner_records where id=w.partner_record_id for update;
 perform 1 from public.partner_onboarding_sections where workspace_id=w.id for update;
 perform 1 from public.partner_onboarding_assets where workspace_id=w.id for update;
 perform 1 from public.partner_onboarding_artifacts where workspace_id=w.id for update;
 perform 1 from public.partner_onboarding_artifact_versions where workspace_id=w.id for update;
 perform 1 from public.partner_onboarding_launch_checks where workspace_id=w.id for update;
 perform 1 from public.partner_onboarding_launch_approvals where workspace_id=w.id for update;
 select * into strict a from public.rcap_commercial_authorizations where id=p_authority and workspace_id=w.id;
 if w.status='live' or w.landing_page_ready or w.aggregate_version<>p_version or w.agreement_status<>'signed' or w.commercial_gate_status='blocked' then raise exception 'stale or unapproved publication source' using errcode='PT409'; end if;
 if not exists(select 1 from public.rcap_launch_operation_events where workspace_id=w.id and operation_id=p_operation and actor_auth_user_id=p_actor and snapshot_hash=p_hash and step='prepared' and evidence->>'mode'='real' and evidence->>'commercialAuthorityId'=a.id::text) then raise exception 'matching real launch authorization required'; end if;
 if exists(select 1 from public.rcap_launch_capacity_events ce where ce.workspace_id=w.id and ce.created_at>a.created_at) then raise exception 'renew commercial authorization after capacity changes';end if;
 if a.expires_at<=now() or not exists(select 1 from public.partner_onboarding_assets where id=a.document_id and workspace_id=w.id and sha256_hex=a.document_hash and lifecycle_status='active' and review_status='approved') then raise exception 'commercial authority expired or withdrawn'; end if;
 if exists(select 1 from public.partner_records r join public.rcap_launch_operation_events e on e.workspace_id=w.id and e.operation_id=p_operation and e.step='prepared' where r.id=w.partner_record_id and ((e.evidence->'snapshot'->'activationRecord'->>'payment_status') is distinct from r.payment_status or (e.evidence->'snapshot'->'activationRecord'->>'stripe_payment_intent_id') is distinct from r.stripe_payment_intent_id or (e.evidence->'snapshot'->'activationRecord'->>'paid_at')::timestamptz is distinct from r.paid_at or (e.evidence->'snapshot'->'activationRecord'->>'payment_amount')::numeric is distinct from r.payment_amount or (e.evidence->'snapshot'->'activationRecord'->>'qualification_status') is distinct from r.qualification_status)) then raise exception 'financial or activation source changed after snapshot';end if;
 if not exists(select 1 from public.partner_records r where r.id=w.partner_record_id and r.qualification_status='qualified' and r.payment_status is distinct from 'demo_paid' and r.provisioning_status in ('active','provisioned') and r.access_mode=a.access_mode and (a.kind<>'verified_paid' or (r.payment_status='paid' and r.stripe_payment_intent_id ~ '^pi_[A-Za-z0-9]+$' and r.paid_at<=now() and r.payment_amount>0))) then raise exception 'activation or payment authority changed'; end if;
 if (select count(*) from public.partner_onboarding_sections where workspace_id=w.id and status='approved')<>8 or not exists(select 1 from public.partner_onboarding_sections where workspace_id=w.id and section_key='access_sponsorship_capacity' and response_data->>'participant_access_model'=a.access_mode) then raise exception 'canonical configuration unapproved or conflicting'; end if;
 if not exists(select 1 from public.partner_onboarding_sections geo join public.partner_records r on r.id=w.partner_record_id join public.rcap_launch_operation_events e on e.operation_id=p_operation and e.step='prepared' where geo.workspace_id=w.id and geo.section_key='geography_audience_language_accessibility' and geo.status='approved' and case when e.evidence ? 'intakeJurisdictions' then
 jsonb_typeof(e.evidence->'intakeJurisdictions')='array' and jsonb_array_length(e.evidence->'intakeJurisdictions')>0
 and e.evidence->'intakeJurisdictions'=(select jsonb_agg(distinct j order by j) from jsonb_array_elements_text(geo.response_data->'jurisdictions') j)
 and not exists(select 1 from jsonb_array_elements_text(geo.response_data->'jurisdictions') j where j<>all(public.rcap_screening_jurisdictions()))
 else case when jsonb_array_length(geo.response_data->'jurisdictions')=1 then geo.response_data->'jurisdictions'->>0 else case when geo.response_data->'jurisdictions' ? coalesce(r.target_state,r.state) then coalesce(r.target_state,r.state) end end=e.evidence->>'intakeJurisdiction' end) then raise exception 'approved screening jurisdiction scope changed or absent';end if;
 perform 1 from public.partner_entitlement where partner_slug=p_slug for update;
 if not exists(select 1 from public.partner_entitlement where partner_slug=p_slug and screenings_allowed>screenings_used) then raise exception 'screening allocation exhausted or absent'; end if;
 perform 1 from public.partner_packet_entitlement where id=a.packet_entitlement_id for update;
 if not exists(select 1 from public.partner_packet_entitlement e where e.id=a.packet_entitlement_id and e.partner_id=w.partner_record_id and e.effective_at<=now() and (e.expires_at is null or e.expires_at>now()) and e.packet_cap>(select count(*) from public.packet_credit_ledger l where l.entitlement_id=e.id and l.event_type='consumed')) then raise exception 'packet allocation exhausted or absent'; end if;
 select * into consent from public.partner_onboarding_launch_approvals where workspace_id=w.id and approval_type='partner_launch_approval' order by recorded_at desc,id desc limit 1;
 select * into final_review from public.partner_onboarding_launch_approvals where workspace_id=w.id and approval_type='legalease_final_review' order by recorded_at desc,id desc limit 1;
 if consent.id is null or consent.decision<>'approve' or consent.invalidated_at is not null or not exists(select 1 from public.partner_users where auth_user_id=consent.reviewer_user_id and partner_slug=p_slug and role='partner_admin' and status='active') or final_review.id is null or final_review.decision<>'approve' or final_review.invalidated_at is not null then raise exception 'current partner consent and final review required'; end if;
 perform public.rcap_service_assert_internal_actor(final_review.reviewer_user_id);
 if not exists(select 1 from public.partner_onboarding_launch_checks where workspace_id=w.id and check_key='staff_training_completed' and status='passing' and invalidated_at is null) then raise exception 'current training review required'; end if;
 if jsonb_typeof(p_versions)<>'array' or jsonb_array_length(p_versions)<>5 or (select count(distinct item->>'type') from jsonb_array_elements(p_versions) item)<>5 then raise exception 'exact five-material package required'; end if;
 if exists(select 1 from jsonb_array_elements(p_versions) item where not exists(select 1 from public.partner_onboarding_artifact_versions v join public.partner_onboarding_artifacts ar on ar.id=v.artifact_id where v.workspace_id=w.id and v.id=(item->>'id')::uuid and ar.current_version_id=v.id and ar.artifact_type=item->>'type' and ar.artifact_type in ('implementation_brief','operations_escalation_plan','dashboard_user_reporting_matrix','staff_quick_start_guide','co_branded_page_configuration') and v.snapshot_hash=item->>'hash' and item->>'freshness'='current' and v.approval_status='approved' and v.generation_status='succeeded' and v.superseded_at is null and v.source_drift_invalidated_at is null and (ar.artifact_type not in ('implementation_brief','co_branded_page_configuration') or v.partner_review_status='approved'))) then raise exception 'approved package changed' using errcode='PT409'; end if;
 if exists(select 1 from public.rcap_launch_operation_events e cross join lateral jsonb_array_elements(e.evidence->'checks') c where e.operation_id=p_operation and e.step='prepared' and exists(select 1 from public.partner_onboarding_launch_checks lc where lc.workspace_id=w.id and lc.check_key=c->>'key' and (lc.status<>c->>'status' or lc.invalidated_at is not null or lc.checked_at is distinct from (c->>'checkedAt')::timestamptz))) then raise exception 'recorded checks changed after snapshot'; end if;
 update public.partner_records set onboarding_status='approved',onboarding_completed_at=coalesce(onboarding_completed_at,now()) where id=w.partner_record_id;
 update public.partner_onboarding set status='live' ,landing_page_ready=true,internal_approved_at=now(),launched_at=now(),rcap_launch_operation_id=p_operation where id=w.id;
 insert into public.rcap_launch_operation_events(workspace_id,partner_slug,operation_id,request_id,step,actor_auth_user_id,snapshot_hash,authority_reference,evidence)
 select workspace_id,partner_slug,operation_id,request_id,'publication_staged',actor_auth_user_id,snapshot_hash,authority_reference,jsonb_build_object('mode','real','commercialAuthorityId',a.id,'workspaceVersion',p_version) from public.rcap_launch_operation_events where workspace_id=w.id and operation_id=p_operation and step='prepared';
 return true;
end $function$;

do $$ declare fn regprocedure;begin
 for fn in select p.oid::regprocedure from pg_proc p join pg_namespace n on n.oid=p.pronamespace
 where n.nspname='public' and p.proname=any(array['rcap_screening_jurisdictions','rcap_program_external_rights_present','rcap_program_internal_authority','rcap_program_screening_jurisdictions','rcap_program_packet_authorized','rcap_program_packet_scope_authorized','rcap_program_funding_valid']) loop
 execute format('revoke all on function %s from public,anon,authenticated',fn);
 execute format('grant execute on function %s to service_role',fn);
 end loop;
end $$;
notify pgrst,'reload schema';
commit;
