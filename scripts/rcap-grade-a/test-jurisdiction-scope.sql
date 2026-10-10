-- Isolated transaction test; all fixtures and writes roll back.
\set ON_ERROR_STOP on
begin;
do $$
declare actor uuid:=gen_random_uuid(); admin_actor uuid; w public.partner_onboarding%rowtype; config jsonb; result jsonb; denied boolean; original jsonb;
begin
 if current_database()<>'rcap' then raise exception 'Isolated rcap database required';end if;
 select * into strict w from public.partner_onboarding where partner_slug like 'integrated-create-%' order by created_at desc limit 1;
 select auth_user_id into strict admin_actor from public.partner_users where partner_slug is null and role='internal_admin' and status='active' limit 1;
 insert into auth.users(id,email) values(actor,'scope-'||actor::text||'@example.test');
 insert into public.partner_users(auth_user_id,partner_slug,role,status,invited_email) values(actor,w.partner_slug,'partner_admin','active','scope-'||actor::text||'@example.test');
 original:=public.rcap_program_partner_jurisdictions(w.id);
 if original<>'["CA","DC","VA"]'::jsonb then raise exception 'Expected development fixture CA/DC/VA';end if;
 config:=public.rcap_service_get_program_configuration(w.partner_slug,actor);
 result:=public.rcap_service_save_program_configuration(w.partner_slug,actor,(config->>'version')::bigint,jsonb_build_array(jsonb_build_object('section','geography_audience_language_accessibility','base',config#>'{data,geography_audience_language_accessibility}','values',jsonb_build_object('jurisdictions',jsonb_build_array('CA')))),gen_random_uuid());
 if result#>'{data,geography_audience_language_accessibility,jurisdictions}'<>'["CA"]'::jsonb then raise exception 'Narrowing failed';end if;
 if public.rcap_program_partner_jurisdictions(w.id)<>original then raise exception 'Narrowing lost permitted jurisdictions';end if;
 config:=result;
 result:=public.rcap_service_save_program_configuration(w.partner_slug,actor,(config->>'version')::bigint,jsonb_build_array(jsonb_build_object('section','geography_audience_language_accessibility','base',config#>'{data,geography_audience_language_accessibility}','values',jsonb_build_object('jurisdictions',original))),gen_random_uuid());
 config:=result;
 denied:=false;
 begin
  perform public.rcap_service_save_program_configuration(w.partner_slug,actor,(config->>'version')::bigint,jsonb_build_array(jsonb_build_object('section','geography_audience_language_accessibility','base',config#>'{data,geography_audience_language_accessibility}','values',jsonb_build_object('jurisdictions',jsonb_build_array('TX')))),gen_random_uuid());
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Partner scope expansion was allowed';end if;
 if public.rcap_service_get_program_configuration(w.partner_slug,actor)<>config then raise exception 'Denied request changed configuration';end if;
 denied:=false;
 begin
  perform public.rcap_service_save_onboarding_section(w.partner_slug,actor,w.id,'geography_audience_language_accessibility',1,(config->>'version')::bigint,jsonb_build_object('jurisdictions',jsonb_build_array('TX')),'{}'::jsonb,'draft_save',0,'{}'::text[],0,'not_started','continue_setup','partner',gen_random_uuid(),repeat('a',64));
 exception when insufficient_privilege then denied:=true;end;
 if not denied then raise exception 'Retained section endpoint bypassed jurisdiction scope';end if;
 if has_function_privilege('authenticated','public.rcap_program_partner_jurisdictions(uuid)','execute') or has_function_privilege('anon','public.rcap_program_partner_jurisdictions(uuid)','execute') then raise exception 'Scope helper exposed to untrusted SQL clients';end if;
 -- A genuine Platform Admin can explicitly revise the editing limit. The
 -- unchanged launch evaluator still requires reviewed scope and materials.
 result:=public.rcap_service_save_program_configuration(w.partner_slug,admin_actor,(config->>'version')::bigint,jsonb_build_array(jsonb_build_object('section','geography_audience_language_accessibility','base',config#>'{data,geography_audience_language_accessibility}','values',jsonb_build_object('jurisdictions',jsonb_build_array('CA','TX')))),gen_random_uuid());
 if public.rcap_program_partner_jurisdictions(w.id)<>'["CA","TX"]'::jsonb then raise exception 'New admin scope did not replace prior limit';end if;
 raise notice 'PASS: narrowing, restoration, canonical and legacy expansion denial, unchanged denied state, private RPC grants, explicit admin scope';
end $$;
rollback;
