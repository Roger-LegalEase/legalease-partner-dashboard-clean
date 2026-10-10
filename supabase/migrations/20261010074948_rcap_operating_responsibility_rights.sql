-- Correct the external-rights proxy. No workspace, membership, agreement,
-- approval, entitlement or financial source rows are migrated.
begin;

-- Membership grants application access; it is not independent operating authority.
-- A recorded Not Required decision records non-applicability, not execution.
-- Preserve conservative protection for actual agreement evidence, affirmative
-- partner authority and commercial rights, including conflicting historical evidence.
create or replace function public.rcap_program_external_rights_evidence(p_workspace uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
 select coalesce(jsonb_agg(evidence order by evidence->>'kind',evidence->>'id'),'[]'::jsonb)
 from (
  select jsonb_build_object('kind','agreement_evidence','id',g.id,'agreementType',g.agreement_type,
    'status',g.status,'assetId',g.finalized_asset_id,'receiptId',g.signed_receipt_id) evidence
   from public.partner_onboarding_agreements g where g.workspace_id=p_workspace
   and (g.status in ('finalized','executed','approved') or g.finalized_asset_id is not null
     or g.signed_receipt_id is not null or nullif(btrim(g.signed_asset_sha256),'') is not null)
  union all
  select jsonb_build_object('kind','partner_operating_approval','id',a.id)
   from public.partner_onboarding_launch_approvals a where a.workspace_id=p_workspace
   and a.approval_type='partner_launch_approval' and a.decision='approve'
  union all
  select jsonb_build_object('kind','commercial_authority','id',a.id)
   from public.rcap_commercial_authorizations a where a.workspace_id=p_workspace
 ) rights
$$;
revoke all on function public.rcap_program_external_rights_evidence(uuid) from public,anon,authenticated;
grant execute on function public.rcap_program_external_rights_evidence(uuid) to service_role;

create or replace function public.rcap_program_external_rights_present(p_workspace uuid) returns boolean
language sql stable security invoker set search_path='' as $$
 select jsonb_array_length(public.rcap_program_external_rights_evidence(p_workspace))>0
$$;

create or replace function public.rcap_service_save_program_configuration(p_slug text,p_actor uuid,p_version bigint,p_changes jsonb,p_request uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare w public.partner_onboarding%rowtype; snapshot jsonb; item jsonb; k text; section_name text; stored jsonb; proposed jsonb; value jsonb;
 previous public.partner_onboarding_idempotency%rowtype; fingerprint text; changed jsonb:='[]'; internal_actor boolean; external_rights jsonb:='[]'; operating_decision jsonb;
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
   -- An operator selection is an explicit Platform Admin responsibility decision,
   -- not a mutation of memberships, agreement history, consent or financial rights.
   external_rights:=public.rcap_program_external_rights_evidence(w.id);
   if proposed->>'operating_model'='legalease_managed' then
    if jsonb_array_length(external_rights)>0 then
     raise exception 'rcap_external_operating_rights' using errcode='42501',detail=external_rights::text;
    end if;
    if coalesce(length(btrim(proposed->>'operator_authority_reference')),0)<10 then
     raise exception 'Operating responsibility must identify the actual LegalEase operating basis' using errcode='22023';
    end if;
   end if;
   operating_decision:=jsonb_build_object('actor',p_actor,'role','internal_admin','at',now(),
    'from',w.operating_model,'to',proposed->>'operating_model','basis',proposed->>'operator_authority_reference',
    'externalRights',external_rights,'evaluationVersion','external-rights-v2',
    'membershipsPreserved',true,'agreementHistoryPreserved',true,'approvalHistoryPreserved',true);
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
  insert into public.partner_events(id,partner_slug,event_type,event_label,event_payload) values(p_request,p_slug,'rcap_program_configuration_saved','Program configuration saved',jsonb_build_object('actor',p_actor,'role',case when internal_actor then 'internal_admin' else 'partner_admin' end,'workspaceId',w.id,'policyVersion',w.rcap_policy_version,'sourceVersion',p_version,'resultVersion',w.aggregate_version,'changes',changed,'operatingModelBefore',snapshot->>'operatingModel','operatingModel',w.operating_model,'policyBefore',snapshot->>'policyVersion','operatorAuthority',public.rcap_program_policy_source(w.id)#>>'{program_goals,operator_authority_reference}','operatingResponsibilityDecision',operating_decision));
 end if;
 insert into public.partner_onboarding_idempotency(workspace_id,operation_key,request_id,actor_user_id,payload_hash,result_status,result_workspace_version,expires_at,completed_at)
 values(w.id,'program_configuration',p_request,p_actor,fingerprint,'succeeded',w.aggregate_version,now()+interval '24 hours',now());
 return public.rcap_service_get_program_configuration(p_slug,p_actor);
end $$;

commit;
