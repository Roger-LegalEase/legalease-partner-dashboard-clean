-- Run only against the dedicated fictional loopback acceptance workspace. All tests roll back.
\set ON_ERROR_STOP on
begin;
select set_config('rcap.rights.slug', :'slug', true);
create function pg_temp.convert_operator(p_slug text,p_actor uuid,p_request uuid default gen_random_uuid()) returns jsonb
language plpgsql as $$
declare snapshot jsonb;
begin
 snapshot:=public.rcap_service_get_program_configuration(p_slug,p_actor);
 return public.rcap_service_save_program_configuration(p_slug,p_actor,(snapshot->>'version')::bigint,
  jsonb_build_array(jsonb_build_object('section','program_goals','base',snapshot#>'{data,program_goals}',
   'values',jsonb_build_object('operating_model','legalease_managed','external_agreement_applicability','not_applicable',
    'service_mode','screening_only','operator_authority_reference','Owner-designated fictional organization with no independent external rights.'))),p_request);
end $$;
do $$
declare w public.partner_onboarding%rowtype; actor uuid; member uuid; agreement uuid; status_value text; request uuid:=gen_random_uuid(); result jsonb; protected_before jsonb; protected_after jsonb; asset uuid:=gen_random_uuid(); evidence jsonb;
begin
 assert current_database()='rcap' and current_setting('rcap.rights.slug') like 'operating-rights-%','isolated fictional fixture required';
 select * into strict w from public.partner_onboarding where partner_slug=current_setting('rcap.rights.slug');
 assert w.operating_model='partner_managed' and w.status<>'live','unconverted existing fixture required';
 select auth_user_id into strict actor from public.partner_users where partner_slug is null and role='internal_admin' and status='active' limit 1;
 select auth_user_id into strict member from public.partner_users where partner_slug=w.partner_slug and role='partner_admin' and status='active' limit 1;
 select id into strict agreement from public.partner_onboarding_agreements where workspace_id=w.id and agreement_type='order_form';
 assert (select count(*)=2 from public.partner_onboarding_agreements where workspace_id=w.id and status='not_required' and recorded_by is not null and finalized_asset_id is null and signed_receipt_id is null),'exact recorded Not Required state';
 assert not public.rcap_program_external_rights_present(w.id),'membership and administrative metadata are not operating rights';
 protected_before:=jsonb_build_object('members',(select jsonb_agg(u order by id) from public.partner_users u where partner_slug=w.partner_slug),'agreements',(select jsonb_agg(g order by id) from public.partner_onboarding_agreements g where workspace_id=w.id),'approvals',(select jsonb_agg(a order by id) from public.partner_onboarding_launch_approvals a where workspace_id=w.id),'money',(select to_jsonb(r) from public.partner_records r where id=w.partner_record_id),'packets',(select jsonb_agg(p order by id) from public.partner_packet_entitlement p where partner_id=w.partner_record_id));
 -- Pending administrative workflow also cannot manufacture executed rights.
 foreach status_value in array array['not_required','not_started','requested','under_review','waived'] loop
  begin
   update public.partner_onboarding_agreements set status=status_value where id=agreement;
   assert not public.rcap_program_external_rights_present(w.id),'nonexecuted metadata is not a contract';
   raise exception using errcode='Z0001';
  exception when sqlstate 'Z0001' then null;end;
 end loop;
 foreach status_value in array array['finalized','executed','approved'] loop
  begin
   update public.partner_onboarding_agreements set status=status_value where id=agreement;
   assert public.rcap_program_external_rights_present(w.id),'recorded agreement authority protected';
   begin perform pg_temp.convert_operator(w.partner_slug,actor);raise exception 'genuine agreement rights bypassed';
   exception when insufficient_privilege then assert sqlerrm='rcap_external_operating_rights';end;
   assert (select operating_model='partner_managed' from public.partner_onboarding where id=w.id),'refusal is atomic';
   raise exception using errcode='Z0001';
  exception when sqlstate 'Z0001' then null;end;
 end loop;
 -- Contradictory Not Required metadata cannot hide actual document evidence.
 begin
  insert into public.partner_onboarding_assets(id,workspace_id,partner_record_id,category,object_path,original_filename,safe_filename,media_type,file_extension,byte_size,sha256_hex,uploaded_by,lifecycle_status,review_status)
   values(asset,w.id,w.partner_record_id,'procurement_document','partners/'||w.partner_record_id||'/onboarding/'||w.id||'/procurement_document/'||asset||'.pdf','isolated.pdf','isolated.pdf','application/pdf','pdf',100,repeat('a',64),actor,'active','approved');
  update public.partner_onboarding_agreements set finalized_asset_id=asset where id=agreement;
  begin perform pg_temp.convert_operator(w.partner_slug,actor);raise exception 'document evidence bypassed';exception when insufficient_privilege then assert sqlerrm='rcap_external_operating_rights';end;
  raise exception using errcode='Z0001';
 exception when sqlstate 'Z0001' then null;end;
 begin
  update public.partner_onboarding_agreements set signed_asset_sha256=repeat('a',64) where id=agreement;
  begin perform pg_temp.convert_operator(w.partner_slug,actor);raise exception 'signature evidence bypassed';exception when insufficient_privilege then assert sqlerrm='rcap_external_operating_rights';end;
  raise exception using errcode='Z0001';
 exception when sqlstate 'Z0001' then null;end;
 assert exists(select 1 from public.partner_onboarding where agreement_status='signed'),'existing verified signed-agreement fixture required';
 assert not exists(select 1 from public.partner_onboarding where agreement_status='signed' and not public.rcap_program_external_rights_present(id)),'existing verified legacy signed agreements remain protected';
 begin
  insert into public.partner_onboarding_launch_approvals(workspace_id,approval_type,reviewer_type,reviewer_user_id,decision,request_id)
   values(w.id,'partner_launch_approval','partner',member,'approve',gen_random_uuid());
  begin perform pg_temp.convert_operator(w.partner_slug,actor);raise exception 'partner authority bypassed';exception when insufficient_privilege then assert sqlerrm='rcap_external_operating_rights';end;
  raise exception using errcode='Z0001';
 exception when sqlstate 'Z0001' then null;end;
 assert not exists(select 1 from public.rcap_commercial_authorizations a where not public.rcap_program_external_rights_present(a.workspace_id)),'all existing commercial authority remains protected';
 begin perform pg_temp.convert_operator(w.partner_slug,member);raise exception 'partner elevated to Platform Admin';exception when insufficient_privilege then null;end;
 begin perform pg_temp.convert_operator(w.partner_slug,gen_random_uuid());raise exception 'unknown actor accepted';exception when insufficient_privilege then null;end;
 result:=pg_temp.convert_operator(w.partner_slug,actor,request);
 assert result->>'operatingModel'='legalease_managed' and result->>'policyVersion'='rcap2.2','authorized conversion persists';
 assert result#>>'{data,program_goals,external_agreement_applicability}'='not_applicable' and result#>>'{data,program_goals,service_mode}'='screening_only';
 select event_payload->'operatingResponsibilityDecision' into strict evidence from public.partner_events where id=request;
 assert evidence->>'from'='partner_managed' and evidence->>'to'='legalease_managed' and evidence->>'actor'=actor::text and evidence->'externalRights'='[]'::jsonb,'explicit auditable responsibility decision';
 protected_after:=jsonb_build_object('members',(select jsonb_agg(u order by id) from public.partner_users u where partner_slug=w.partner_slug),'agreements',(select jsonb_agg(g order by id) from public.partner_onboarding_agreements g where workspace_id=w.id),'approvals',(select jsonb_agg(a order by id) from public.partner_onboarding_launch_approvals a where workspace_id=w.id),'money',(select to_jsonb(r) from public.partner_records r where id=w.partner_record_id),'packets',(select jsonb_agg(p order by id) from public.partner_packet_entitlement p where partner_id=w.partner_record_id));
 assert protected_after=protected_before,'all memberships, agreement/approval history and financial rows preserved';
 assert not public.rcap_program_packet_authorized(w.partner_slug,'MD'),'operator selection creates no packet funding';
 raise notice 'PASS exact existing-workspace conversion, all nonexecuted metadata, genuine agreement/document/signature/partner/commercial refusal, role denial, audit and preservation';
end $$;
rollback;
