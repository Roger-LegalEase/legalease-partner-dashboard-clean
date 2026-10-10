-- Existing isolated application database only. Every mutation rolls back.
\set ON_ERROR_STOP on
begin;
select set_config('rcap.test.slug', :'slug', true);
do $$
declare w public.partner_onboarding%rowtype; actor uuid; code uuid:=gen_random_uuid(); code_hash text:=encode(sha256(gen_random_uuid()::text::bytea),'hex'); row record; j text; before_count integer; before_finance jsonb; after_finance jsonb; foreign_workspace public.partner_onboarding%rowtype; snapshot jsonb; clinic public.clinic_events%rowtype; clinic_code uuid:=gen_random_uuid(); clinic_hash text:=encode(sha256(gen_random_uuid()::text::bytea),'hex');
begin
 if current_database()<>'rcap' then raise exception 'isolated database required';end if;
 select * into strict w from public.partner_onboarding where partner_slug=current_setting('rcap.test.slug');
 if w.operating_model<>'legalease_managed' or w.status<>'live' then raise exception 'real browser publication must complete first';end if;
 select auth_user_id into strict actor from public.partner_users where role='internal_admin' and partner_slug is null and status='active' limit 1;
 assert public.rcap_program_screening_jurisdictions(w.partner_slug)=array['DC','MD','VA'],'full published scope';
 assert not public.rcap_program_packet_authorized(w.partner_slug,'MD'),'screening authority is not packet funding';
 for j in select unnest(array['anon','authenticated']) loop
  assert not has_function_privilege(j,'public.claim_rcap_screening_session(text,text)','EXECUTE'),'ordinary claim service-only';
  assert not has_function_privilege(j,'public.claim_partner_screening_session(text,text,text,timestamptz)','EXECUTE'),'code claim service-only';
  assert not has_function_privilege(j,'public.rcap_service_record_program_decision(text,uuid,text,text,bigint,jsonb,uuid)','EXECUTE'),'final authority service-only';
 end loop;
 assert (select bool_and(p.prosecdef and p.proconfig=array['search_path=""']) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('claim_rcap_screening_session','claim_partner_screening_session')),'claim execution security preserved';
 before_finance:=jsonb_build_object('record',(select to_jsonb(r) from public.partner_records r where id=w.partner_record_id),'legacy',(select to_jsonb(e) from public.partner_entitlement e where partner_slug=w.partner_slug),'packets',(select coalesce(jsonb_agg(e),'[]') from public.partner_packet_entitlement e where partner_id=w.partner_record_id));
 insert into public.partner_access_codes(id,partner_slug,code_hash,code_type,max_uses) values(code,w.partner_slug,code_hash,'limited_use',3);
 select count(*) into before_count from public.screening_sessions where partner_slug=w.partner_slug;
 select * into row from public.claim_rcap_screening_session(w.partner_slug,'NY'); assert not row.ok and row.reason='jurisdiction_not_authorized';
 select * into row from public.claim_partner_screening_session(w.partner_slug,'NY',code_hash,now()); assert not row.ok and row.reason='jurisdiction_not_authorized';
 select * into row from public.claim_partner_screening_session(w.partner_slug,'XX',code_hash,now()); assert not row.ok and row.reason='jurisdiction_not_authorized';
 assert (select uses_count=0 from public.partner_access_codes where id=code),'denied states cannot redeem a code';
 assert (select count(*)=before_count from public.screening_sessions where partner_slug=w.partner_slug),'denials cannot insert a session';
 foreach j in array array['MD','DC','VA'] loop
  select * into row from public.claim_rcap_screening_session(w.partner_slug,j);assert row.ok,'ordinary three-state claim';
  assert (select jurisdiction=j from public.screening_sessions where session_id=row.session_id),'ordinary session state persisted';
  select * into row from public.record_partner_packet_generation(row.session_id,now());assert not row.recorded and row.reason='packet_authority_required','unfunded packet denied';
  select * into row from public.claim_partner_screening_session(w.partner_slug,j,code_hash,now());assert row.ok and row.attribution_source='partner_code','code transaction per state';
  assert (select jurisdiction=j and partner_access_code_id=code from public.screening_sessions where session_id=row.session_id),'code state and attribution persisted';
 end loop;
 assert (select uses_count=3 from public.partner_access_codes where id=code),'atomic code use count';
 select * into row from public.claim_partner_screening_session(w.partner_slug,'MD',code_hash,now());
 assert (w.partner_slug is not null) and not row.ok and row.reason='exhausted','exhausted optional code refused';
 after_finance:=jsonb_build_object('record',(select to_jsonb(r) from public.partner_records r where id=w.partner_record_id),'legacy',(select to_jsonb(e) from public.partner_entitlement e where partner_slug=w.partner_slug),'packets',(select coalesce(jsonb_agg(e),'[]') from public.partner_packet_entitlement e where partner_id=w.partner_record_id));
 assert before_finance=after_finance,'claims and denied packets preserve all financial source data';
 -- An external partner cannot be reclassified just by selecting another operator.
 select * into foreign_workspace from public.partner_onboarding where operating_model='partner_managed' and status<>'live' and public.rcap_program_external_rights_present(id) limit 1;
 assert foreign_workspace.id is not null,'existing partner-managed fixture';
 snapshot:=public.rcap_service_get_program_configuration(foreign_workspace.partner_slug,actor);
 begin
  perform public.rcap_service_save_program_configuration(foreign_workspace.partner_slug,actor,foreign_workspace.aggregate_version,
    jsonb_build_array(jsonb_build_object('section','program_goals','values',jsonb_build_object('operating_model','legalease_managed'),'base',snapshot#>'{data,program_goals}')), gen_random_uuid());
  raise exception 'external operating rights transferred';
 exception when insufficient_privilege then null;end;
 begin perform public.rcap_service_get_program_configuration(w.partner_slug,gen_random_uuid());raise exception 'unauthorized actor accepted';exception when insufficient_privilege then null;end;
 -- Existing Clinic capacity, consent and staff protections remain real database boundaries.
 select * into clinic from public.clinic_events where partner_slug=w.partner_slug and status='published' and jurisdiction='MD' order by created_at desc limit 1;
 assert clinic.id is not null,'browser-created published Clinic required';
 insert into public.clinic_event_access_codes(id,event_id,code_hash,code_hint,max_uses,created_by) values(clinic_code,clinic.id,clinic_hash,'LOCAL',1,actor);
 select * into row from public.clinic_redeem_event_code(clinic.public_slug,clinic_hash,repeat('a',64));assert row.outcome='redeemed';
 select * into row from public.claim_rcap_screening_session(w.partner_slug,'MD',repeat('a',64));assert row.ok,'redeemed Clinic code permits scoped screening without packet funding';
 select * into row from public.claim_rcap_screening_session(w.partner_slug,'DC',repeat('a',64));assert not row.ok,'Clinic code cannot authorize another state';
 select * into row from public.claim_rcap_screening_session(w.partner_slug,'MD',repeat('f',64));assert not row.ok,'invented Clinic context cannot bypass access controls';
 select * into row from public.clinic_redeem_event_code(clinic.public_slug,clinic_hash,repeat('a',64));assert row.outcome='already_redeemed';
 select * into row from public.clinic_redeem_event_code(clinic.public_slug,clinic_hash,repeat('b',64));assert row.outcome='code_unavailable';
 begin
  perform public.clinic_start_assisted_session(clinic.id,gen_random_uuid(),actor,gen_random_uuid(),repeat('c',64),repeat('d',64),'current',null,30);
  raise exception 'missing consent accepted';
 exception when raise_exception then if sqlerrm<>'clinic_consent_required' then raise;end if;end;
 begin
  perform public.clinic_start_assisted_session(clinic.id,gen_random_uuid(),actor,gen_random_uuid(),repeat('c',64),repeat('d',64),'current',now(),30);
  raise exception 'unapproved staff accepted';
 exception when raise_exception then if sqlerrm<>'clinic_staff_not_approved' then raise;end if;end;
 -- Exact scope revocation is enforced even if the legacy paid flag remains intact.
 snapshot:=public.rcap_service_get_program_configuration(w.partner_slug,actor);
 perform public.rcap_service_record_program_decision(w.partner_slug,actor,'legalease_final_review','withdraw',(snapshot->>'version')::bigint,jsonb_build_object('policy_version','rcap2.2','scope_hash',public.rcap_program_launch_scope(w.id),'authority_basis','Isolated revocation regression; transaction rolls back'),gen_random_uuid());
 assert cardinality(public.rcap_program_screening_jurisdictions(w.partner_slug))=0,'withdrawn operating authority closes new benefits';
 select * into row from public.claim_rcap_screening_session(w.partner_slug,'VA');assert not row.ok;
 select * into row from public.claim_partner_screening_session(w.partner_slug,'VA',code_hash,now());assert not row.ok;
 select * into row from public.clinic_redeem_event_code(clinic.public_slug,clinic_hash,repeat('e',64));assert row.outcome='event_unavailable','revoked program closes Clinic entry before redemption';
 assert (select uses_count=1 from public.clinic_event_access_codes where id=clinic_code),'denied Clinic attempts preserve atomic capacity';
 raise notice 'PASS Clinic scope, consent, staff, atomic code use, and revoked authority; both service-only claim transactions: MD/DC/VA, invalid state, exhausted code, scope revocation, funding refusal, external rights, and immutable finance';
end $$;
rollback;
