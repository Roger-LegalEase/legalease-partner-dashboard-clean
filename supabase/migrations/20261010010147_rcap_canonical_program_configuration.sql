-- One ordinary configuration command for both administrator experiences.
-- No prefill records, approvals, agreements, policy upgrades or entitlements are written.
begin;
create function public.rcap_service_get_program_configuration(p_slug text,p_actor uuid) returns jsonb
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
 return jsonb_build_object('workspaceId',w.id,'partnerSlug',p_slug,'version',w.aggregate_version,'policyVersion',w.rcap_policy_version,'status',w.status,'data',d,
 'legalIdentityLocked',w.agreement_status='signed' or exists(select 1 from public.rcap_commercial_authorizations where workspace_id=w.id));
end $$;

create function public.rcap_service_save_program_configuration(p_slug text,p_actor uuid,p_version bigint,p_changes jsonb,p_request uuid) returns jsonb
language plpgsql security invoker set search_path='' as $$
declare w public.partner_onboarding%rowtype; snapshot jsonb; item jsonb; k text; section_name text; stored jsonb; proposed jsonb; value jsonb;
 previous public.partner_onboarding_idempotency%rowtype; fingerprint text; changed jsonb:='[]'; internal_actor boolean;
 allowed constant jsonb:='{
 "organization_contacts":["legal_organization_name","public_organization_name","public_program_name","website","primary_address","contacts"],
 "program_goals":["participation_mode","target_population"],
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
 if w.aggregate_version<>p_version then raise exception 'configuration revision conflict' using errcode='40001';end if;
 if w.status in ('paused','closed') then raise exception 'program not editable' using errcode='55000';end if;
 if (select count(distinct v->>'section') from jsonb_array_elements(p_changes) v)<>jsonb_array_length(p_changes) then raise exception 'duplicate sections' using errcode='22023';end if;
 for item in select v from jsonb_array_elements(p_changes) v loop
  section_name:=item->>'section';
  if not allowed ? section_name or jsonb_typeof(item->'values') is distinct from 'object' or jsonb_typeof(item->'base') is distinct from 'object' then raise exception 'invalid configuration section' using errcode='22023';end if;
  stored:=coalesce(snapshot#>array['data',section_name],'{}');
  proposed:=stored||(item->'values');
  for k,value in select * from jsonb_each(item->'values') loop
   if not (allowed->section_name) ? k then raise exception 'protected configuration field' using errcode='42501';end if;
   if coalesce(stored->k,'null') is distinct from coalesce(item->'base'->k,'null') and coalesce(stored->k,'null') is distinct from value then raise exception 'field revision conflict' using errcode='40001';end if;
   if value is not distinct from coalesce(stored->k,'null') then continue;end if;
   if k='legal_organization_name' and coalesce(stored->>k,'')<>'' and (snapshot->>'legalIdentityLocked')::boolean then raise exception 'protected legal identity' using errcode='42501';end if;
   -- A live scope change needs a separate authorized publication transition.
   if w.status='live' and (section_name in ('geography_audience_language_accessibility','access_sponsorship_capacity') or k='participation_mode') then raise exception 'live service scope is protected' using errcode='55000';end if;
   if k='participation_mode' and (jsonb_typeof(value)<>'string' or value#>>'{}' not in ('online','clinics','both')) then raise exception 'invalid participation mode' using errcode='22023';end if;
   if k='participant_access_model' and (jsonb_typeof(value)<>'string' or value#>>'{}' not in ('open','optional_code','required_code','invite_only')) then raise exception 'invalid access model' using errcode='22023';end if;
   if k='jurisdictions' then
    if jsonb_typeof(value)<>'array' then raise exception 'invalid jurisdictions' using errcode='22023';end if;
    if exists(select 1 from jsonb_array_elements_text(value) code where code<>all(array['AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'])) then raise exception 'invalid jurisdiction' using errcode='22023';end if;
   end if;
  end loop;
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
  insert into public.partner_events(id,partner_slug,event_type,event_label,event_payload) values(p_request,p_slug,'rcap_program_configuration_saved','Program configuration saved',jsonb_build_object('actor',p_actor,'role',case when internal_actor then 'internal_admin' else 'partner_admin' end,'workspaceId',w.id,'policyVersion',w.rcap_policy_version,'sourceVersion',p_version,'resultVersion',w.aggregate_version,'changes',changed));
 end if;
 insert into public.partner_onboarding_idempotency(workspace_id,operation_key,request_id,actor_user_id,payload_hash,result_status,result_workspace_version,expires_at,completed_at)
 values(w.id,'program_configuration',p_request,p_actor,fingerprint,'succeeded',w.aggregate_version,now()+interval '24 hours',now());
 return public.rcap_service_get_program_configuration(p_slug,p_actor);
end $$;
revoke all on function public.rcap_service_get_program_configuration(text,uuid) from public,anon,authenticated;
revoke all on function public.rcap_service_save_program_configuration(text,uuid,bigint,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.rcap_service_get_program_configuration(text,uuid) to service_role;
grant execute on function public.rcap_service_save_program_configuration(text,uuid,bigint,jsonb,uuid) to service_role;
-- Recording an executed agreement is preparation, not commercial clearance.
-- RCAP2 must be able to record evidence before commercial authority exists.
-- Preserve the legacy guard and every signed-document, actor and version check.
create or replace function public.rcap_service_record_signed_agreement(
  p_slug text, p_actor uuid, p_expected_version bigint, p_request uuid,
  p_agreement_type text, p_asset uuid, p_new_asset boolean,
  p_object_path text, p_filename text, p_media_type text,
  p_extension text, p_byte_size bigint, p_sha256 text,
  p_effective_date date, p_review_reason text, p_confirmed boolean
) returns table(workspace_version bigint, document_id uuid, duplicate boolean)
language plpgsql security invoker set search_path='' as $$
declare
  w public.partner_onboarding%rowtype;
  prior public.rcap_signed_agreement_receipts%rowtype;
  doc public.partner_onboarding_assets%rowtype;
  previous_doc public.partner_onboarding_assets%rowtype;
  previous_agreement jsonb;
  contract_changed boolean;
begin
  perform public.rcap_service_assert_internal_actor(p_actor);
  if p_confirmed is distinct from true or p_new_asset is null
     or p_request is null or p_asset is null or p_agreement_type is null
     or p_sha256 is null or p_agreement_type not in ('order_form','master_services_agreement')
     or p_effective_date is null or p_effective_date>current_date
     or length(btrim(coalesce(p_review_reason,''))) not between 10 and 5000
     or p_sha256 !~ '^[a-f0-9]{64}$' then
    raise exception 'A reviewed, executed agreement and signed document are required' using errcode='22023';
  end if;

  select * into strict w from public.partner_onboarding
    where partner_slug=p_slug for update;
  select * into prior from public.rcap_signed_agreement_receipts where id=p_request;
  if found then
    if prior.workspace_id<>w.id or prior.partner_slug<>p_slug
       or prior.actor_auth_user_id<>p_actor or prior.agreement_type<>p_agreement_type
       or (not p_new_asset and prior.asset_id is distinct from p_asset)
       or prior.asset_sha256<>p_sha256
       or prior.effective_date<>p_effective_date
       or prior.reviewed_reason<>btrim(p_review_reason) then
       raise exception 'Executed agreement request was reused with different inputs' using errcode='23505';
    end if;
    return query select prior.workspace_version,prior.asset_id,true;
    return;
  end if;

  if w.aggregate_version is distinct from p_expected_version
     or w.status in ('live','paused','closed')
     or (w.rcap_policy_version<>'rcap2.2' and w.commercial_gate_status='blocked') then
    -- A stale user snapshot is not a retryable database serialization failure.
    raise exception 'Current unpublished agreement workspace required' using errcode='55000';
  end if;

  if p_new_asset then
    if not exists(select 1 from storage.objects o join storage.buckets b on b.id=o.bucket_id
      where o.bucket_id='rcap-partner-onboarding-private' and o.name=p_object_path and b.public=false) then
      raise exception 'Executed copy is absent from private storage' using errcode='55000';
    end if;
    if p_media_type is null or p_extension is null
       or p_object_path is null or p_filename is null or p_byte_size is null
       or p_media_type not in (
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) or (p_media_type='application/pdf' and p_extension<>'pdf')
       or (p_media_type<>'application/pdf' and p_extension<>'docx')
       or p_byte_size<1 or p_byte_size>20971520
       or length(p_filename) not between 1 and 240
       or p_object_path<>('partners/'||w.partner_record_id::text||
       '/onboarding/'||w.id::text||'/procurement_document/'||p_asset::text||'.'||p_extension)
    then raise exception 'Signed file identity or document type is invalid' using errcode='22023';
    end if;
    select * into previous_doc from public.partner_onboarding_assets
      where workspace_id=w.id and category='procurement_document'
        and lifecycle_status in ('active','pending_review') and deleted_at is null for update;
    if found then
      -- Retain the original object and agreement evidence; only its current
      -- procurement slot is superseded by this executed copy.
      update public.partner_onboarding_assets set lifecycle_status='superseded',
        updated_at=now() where id=previous_doc.id;
    end if;
    insert into public.partner_onboarding_assets(
      id,workspace_id,partner_record_id,category,object_path,original_filename,
      safe_filename,media_type,file_extension,byte_size,sha256_hex,
      lifecycle_status,review_status,review_reason,uploaded_by
    ) values(
      p_asset,w.id,w.partner_record_id,'procurement_document',p_object_path,
      p_filename,'signed-agreement.'||p_extension,p_media_type,p_extension,
      p_byte_size,p_sha256,'active','approved',
      'Executed signed agreement inspected and certified by Platform Admin',p_actor
    );
  end if;

  select * into doc from public.partner_onboarding_assets
    where id=p_asset and workspace_id=w.id
      and category='procurement_document' and deleted_at is null
      and lifecycle_status='active' and review_status='approved'
      and sha256_hex=p_sha256 for update;
  if not found then
    raise exception 'An active, approved, matching signed agreement document is required' using errcode='55000';
  end if;
  if doc.media_type not in ('application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document')
     or not exists(select 1 from storage.objects o join storage.buckets b on b.id=o.bucket_id
       where o.bucket_id=doc.bucket_id and o.name=doc.object_path
         and b.id='rcap-partner-onboarding-private' and b.public=false) then
    raise exception 'The executed document must exist in private storage' using errcode='55000';
  end if;

  select to_jsonb(a) into previous_agreement from public.partner_onboarding_agreements a
    where a.workspace_id=w.id and a.agreement_type=p_agreement_type;
  contract_changed := previous_agreement is null
    or previous_agreement->>'status' is distinct from 'executed'
    or previous_agreement->>'finalized_asset_id' is distinct from doc.id::text
    or previous_agreement->>'effective_date' is distinct from p_effective_date::text
    or previous_agreement->>'signed_asset_sha256' is distinct from p_sha256
    or previous_agreement->>'signed_receipt_id' is null;
  insert into public.rcap_signed_agreement_receipts(
    id,workspace_id,partner_slug,actor_auth_user_id,agreement_type,asset_id,
    asset_sha256,effective_date,reviewed_reason,workspace_version,previous_agreement
  ) values(p_request,w.id,p_slug,p_actor,p_agreement_type,doc.id,
    p_sha256,p_effective_date,btrim(p_review_reason),w.aggregate_version+1,previous_agreement);

  insert into public.partner_onboarding_agreements(
    workspace_id,agreement_type,status,is_required,partner_safe_detail,
    finalized_asset_id,effective_date,recorded_by,recorded_at,signed_receipt_id,signed_asset_sha256
  ) values(
    w.id,p_agreement_type,'executed',true,
    'Executed agreement verified by LegalEase',doc.id,
    p_effective_date,p_actor,now(),p_request,p_sha256
  ) on conflict(workspace_id,agreement_type) do update set
    status='executed',is_required=true,partner_safe_detail=excluded.partner_safe_detail,
    finalized_asset_id=excluded.finalized_asset_id,
    effective_date=excluded.effective_date,
    recorded_by=excluded.recorded_by,recorded_at=excluded.recorded_at,
    signed_receipt_id=excluded.signed_receipt_id,
    signed_asset_sha256=excluded.signed_asset_sha256;

  perform set_config('rcap.agreement_projection',p_request::text,true);
  update public.partner_onboarding set agreement_status='signed',
    agreement_date=p_effective_date,aggregate_version=aggregate_version+1,
    last_meaningful_activity_at=now()
    where id=w.id returning aggregate_version into workspace_version;
  perform set_config('rcap.agreement_projection','',true);



  -- Preserve unrelated staff-training and operational attestations. Only
  -- launch decisions tied to changed contractual authority are renewed.
  if contract_changed then
  update public.partner_onboarding_launch_checks set
    invalidated_at=now(),invalidated_reason='Executed agreement changed'
    where workspace_id=w.id
      and check_key in ('legalease_final_review_complete','partner_launch_approval_received')
      and invalidated_at is null;
  update public.partner_onboarding_launch_approvals set
    invalidated_at=now() where workspace_id=w.id and invalidated_at is null;
  end if;

  document_id:=doc.id;
  duplicate:=false;
  return next;
end $$;
commit;
