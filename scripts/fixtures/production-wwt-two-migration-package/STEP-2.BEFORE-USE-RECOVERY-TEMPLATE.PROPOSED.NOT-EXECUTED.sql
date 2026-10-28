-- PROPOSED / NOT EXECUTED. Root+C fresh recovery authority required; NEVER automatic retry/inverse.
BEGIN;
SET LOCAL statement_timeout='30s'; SET LOCAL lock_timeout='1s'; SET LOCAL idle_in_transaction_session_timeout='30s';
LOCK TABLE public.rcap_launch_capacity_events IN ACCESS EXCLUSIVE MODE NOWAIT;
CREATE OR REPLACE FUNCTION pg_temp.wwt_norm(v jsonb,k text DEFAULT '') RETURNS jsonb LANGUAGE plpgsql AS $norm$
DECLARE result jsonb; e record; a jsonb;
BEGIN
 IF jsonb_typeof(v)='object' THEN
  result:='{}';FOR e IN SELECT key,value FROM jsonb_each(v) LOOP result:=result||jsonb_build_object(e.key,pg_temp.wwt_norm(e.value,e.key));END LOOP;RETURN result;
 ELSIF jsonb_typeof(v)='array' THEN
  SELECT coalesce(jsonb_agg(pg_temp.wwt_norm(value,'')),'[]') INTO a FROM jsonb_array_elements(v);
  IF k IN('acl','schema_acl') AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(a) z WHERE jsonb_typeof(z)<>'string') THEN SELECT coalesce(jsonb_agg(value ORDER BY value::text COLLATE "C"),'[]') INTO result FROM jsonb_array_elements(a);RETURN result;END IF;
  IF k='functions' THEN SELECT coalesce(jsonb_agg(value ORDER BY value->>'signature' COLLATE "C"),'[]') INTO result FROM jsonb_array_elements(a);RETURN result;END IF;
  IF k='relations' THEN SELECT coalesce(jsonb_agg(value ORDER BY value->>'schema' COLLATE "C",value->>'name' COLLATE "C"),'[]') INTO result FROM jsonb_array_elements(a);RETURN result;END IF;
  IF k IN('constraints','indexes','policies','triggers') THEN SELECT coalesce(jsonb_agg(value ORDER BY value->>'name' COLLATE "C"),'[]') INTO result FROM jsonb_array_elements(a);RETURN result;END IF;
  RETURN a;
 END IF;RETURN v;
END $norm$;
CREATE OR REPLACE FUNCTION pg_temp.wwt_state(v jsonb) RETURNS jsonb LANGUAGE sql AS $state$
 SELECT pg_temp.wwt_norm(jsonb_object_agg(key,value-ARRAY['observed_at','lock_snapshot','other_active_client_count','transaction_read_only'])) FROM jsonb_each(v)
$state$;
CREATE OR REPLACE FUNCTION pg_temp.wwt_capture() RETURNS jsonb LANGUAGE plpgsql AS $capture$
DECLARE c jsonb;f jsonb;r jsonb;
BEGIN
 SELECT q.ordinary_full_chain_catalog INTO c FROM (WITH RECURSIVE
requested_functions(name) AS (VALUES ('current_partner_role'),('current_partner_slug'),('is_internal_admin'),('rcap_agreement_clearance'),('rcap_guard_agreement_projection'),('rcap_guard_commercial_authorization'),('rcap_guard_launch_authority_event'),('rcap_guard_real_preparation'),('rcap_onboarding_derive_idempotency_actor'),('rcap_onboarding_guard_idempotency_update'),('rcap_onboarding_guard_partner_row_mutation'),('rcap_onboarding_guard_section_mutation'),('rcap_onboarding_prevent_append_only_mutation'),('rcap_onboarding_resolve_partner_record'),('rcap_onboarding_validate_asset_metadata'),('rcap_onboarding_validate_recipient_contact'),('rcap_partner_page_configuration_id'),('rcap_program_commercial_valid'),('rcap_program_dependency_hash'),('rcap_program_external_rights_evidence'),('rcap_program_funding_valid'),('rcap_program_geography_consistent'),('rcap_program_internal_authority'),('rcap_program_launch_scope'),('rcap_program_material_scope'),('rcap_program_partner_jurisdictions'),('rcap_program_policy_source'),('rcap_program_requirement_registry'),('rcap_program_screening_capacity'),('rcap_refuse_audit_rewrite'),('rcap_require_documented_real_agreement'),('rcap_screening_jurisdictions'),('rcap_service_assert_internal_actor'),('rcap_service_assert_partner_actor'),('rcap_service_compensate_real_launch'),('rcap_service_configure_launch_capacity'),('rcap_service_enable_program_policy'),('rcap_service_ensure_onboarding_artifacts'),('rcap_service_evaluate_program'),('rcap_service_generate_onboarding_artifact_version'),('rcap_service_get_program_configuration'),('rcap_service_invalidate_onboarding_artifact_version'),('rcap_service_provision_partner'),('rcap_service_record_program_decision'),('rcap_service_review_onboarding_artifact'),('rcap_service_save_program_configuration'),('rcap_service_stage_program_launch'),('rcap_service_stage_real_launch'),('set_partner_onboarding_artifact_updated_at')),
requested_relations(schema_name,name) AS (VALUES ('public','ordinary_sponsored_packet_routes'),('public','packet_credit_ledger'),('public','partner_entitlement'),('public','partner_events'),('public','partner_onboarding'),('public','partner_onboarding_activity'),('public','partner_onboarding_agreements'),('public','partner_onboarding_agreements_safe'),('public','partner_onboarding_artifact_reviews'),('public','partner_onboarding_artifact_versions'),('public','partner_onboarding_artifacts'),('public','partner_onboarding_assets'),('public','partner_onboarding_assets_safe'),('public','partner_onboarding_contacts'),('public','partner_onboarding_idempotency'),('public','partner_onboarding_launch_approvals'),('public','partner_onboarding_launch_checks'),('public','partner_onboarding_planned_users'),('public','partner_onboarding_report_recipients'),('public','partner_onboarding_sections'),('public','partner_onboarding_tasks'),('public','partner_onboarding_workspace_safe'),('public','partner_packet_entitlement'),('public','partner_records'),('public','partner_users'),('public','rcap_commercial_authorizations'),('public','rcap_launch_capacity_events'),('public','rcap_launch_exception_events'),('public','rcap_launch_operation_events'),('public','rcap_signed_agreement_receipts'),('public','screening_sessions')),
root_relations AS (
 SELECT r.schema_name,r.name,c.oid,c.relkind FROM requested_relations r
 LEFT JOIN pg_namespace n ON n.nspname=r.schema_name
 LEFT JOIN pg_class c ON c.relnamespace=n.oid AND c.relname=r.name
),
relation_oids(oid) AS (
 SELECT oid FROM root_relations WHERE oid IS NOT NULL
 UNION
 SELECT d.refobjid FROM relation_oids s JOIN pg_rewrite w ON w.ev_class=s.oid AND w.rulename='_RETURN'
 JOIN pg_depend d ON d.classid='pg_rewrite'::regclass AND d.objid=w.oid AND d.refclassid='pg_class'::regclass
 JOIN pg_class c ON c.oid=d.refobjid JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN('r','p','v','m','f')
),
selected_relations AS (
 SELECT c.*,n.nspname FROM relation_oids r JOIN pg_class c ON c.oid=r.oid JOIN pg_namespace n ON n.oid=c.relnamespace
),
associated_function_oids(oid) AS (
 SELECT t.tgfoid FROM pg_trigger t JOIN relation_oids r ON r.oid=t.tgrelid WHERE NOT t.tgisinternal
 UNION
 SELECT d.refobjid FROM pg_depend d WHERE d.refclassid='pg_proc'::regclass AND (
 (d.classid='pg_policy'::regclass AND d.objid IN(SELECT p.oid FROM pg_policy p JOIN relation_oids r ON r.oid=p.polrelid)) OR
 (d.classid='pg_rewrite'::regclass AND d.objid IN(SELECT w.oid FROM pg_rewrite w JOIN relation_oids r ON r.oid=w.ev_class)) OR
 (d.classid='pg_attrdef'::regclass AND d.objid IN(SELECT a.oid FROM pg_attrdef a JOIN relation_oids r ON r.oid=a.adrelid)) OR
 (d.classid='pg_constraint'::regclass AND d.objid IN(SELECT k.oid FROM pg_constraint k JOIN relation_oids r ON r.oid=k.conrelid)) OR
 (d.classid='pg_class'::regclass AND d.objid IN(SELECT i.indexrelid FROM pg_index i JOIN relation_oids r ON r.oid=i.indrelid)))
),
function_oids(oid) AS (
 SELECT p.oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN requested_functions r ON r.name=p.proname WHERE n.nspname='public'
 UNION SELECT a.oid FROM associated_function_oids a JOIN pg_proc p ON p.oid=a.oid JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public'
),
functions AS (
 SELECT p.*,n.nspname,l.lanname FROM function_oids f JOIN pg_proc p ON p.oid=f.oid JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang WHERE p.prokind IN('f','p')
)
SELECT jsonb_build_object(
 'scope','Ordinary normal managed provision/configure/one-unit allocation/two-material review/Start catalog preimages only',
 'requested_project_ref','hyflxnlhpmiqxvvcoiia',
 'source_candidate','3b7aaeaf6c0bc9647cbec5a3e8a301106df1537f',
 'accepted_core_sha256','04c68a31b1ac6d583c5e32703e70099c17d40a548122d37ff7406692297ab81b',
 'observed_at',clock_timestamp(),'database',current_database(),'server_version',current_setting('server_version'),
 'current_user',current_user,'session_user',session_user,'transaction_read_only',current_setting('transaction_read_only'),'search_path',current_setting('search_path'),
 'requested_function_presence',(SELECT jsonb_agg(jsonb_build_object('name',r.name,'present',EXISTS(SELECT 1 FROM functions f WHERE f.proname=r.name),'overloads',(SELECT count(*) FROM functions f WHERE f.proname=r.name)) ORDER BY r.name) FROM requested_functions r),
 'requested_relation_presence',(SELECT jsonb_agg(jsonb_build_object('schema',r.schema_name,'name',r.name,'present',r.oid IS NOT NULL,'kind',r.relkind) ORDER BY r.schema_name,r.name) FROM root_relations r),
 'functions',(SELECT coalesce(jsonb_agg(jsonb_build_object(
 'schema',f.nspname,'name',f.proname,'signature',format('%I.%I(%s)',f.nspname,f.proname,oidvectortypes(f.proargtypes)),
 'identity_arguments',pg_get_function_identity_arguments(f.oid),'arguments',pg_get_function_arguments(f.oid),'result',pg_get_function_result(f.oid),
 'kind',f.prokind,'language',f.lanname,'owner',pg_get_userbyid(f.proowner),'security_definer',f.prosecdef,'leakproof',f.proleakproof,'volatility',f.provolatile,'strict',f.proisstrict,'parallel',f.proparallel,'config',f.proconfig,
 'definition',pg_get_functiondef(f.oid),'body_md5',md5(f.prosrc),'definition_md5',md5(pg_get_functiondef(f.oid)),'acl',f.proacl,
 'anon_execute',has_function_privilege('anon',f.oid,'EXECUTE'),'authenticated_execute',has_function_privilege('authenticated',f.oid,'EXECUTE'),'service_execute',has_function_privilege('service_role',f.oid,'EXECUTE')) ORDER BY f.nspname,f.proname,f.oid),'[]'::jsonb) FROM functions f),
 'relations',(SELECT coalesce(jsonb_agg(jsonb_build_object(
 'schema',c.nspname,'name',c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl,'options',c.reloptions,'rls',c.relrowsecurity,'forced_rls',c.relforcerowsecurity,'replica_identity',c.relreplident,
 'view_definition',CASE WHEN c.relkind IN('v','m') THEN pg_get_viewdef(c.oid,false) ELSE NULL END,
 'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('position',a.attnum,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(d.adbin,d.adrelid),'collation',CASE WHEN a.attcollation<>0 THEN a.attcollation::regcollation::text END,'acl',a.attacl,
 'anon_select',has_column_privilege('anon',c.oid,a.attnum,'SELECT'),'authenticated_select',has_column_privilege('authenticated',c.oid,a.attnum,'SELECT'),'authenticated_insert',has_column_privilege('authenticated',c.oid,a.attnum,'INSERT'),'authenticated_update',has_column_privilege('authenticated',c.oid,a.attnum,'UPDATE'),'service_select',has_column_privilege('service_role',c.oid,a.attnum,'SELECT'),'service_insert',has_column_privilege('service_role',c.oid,a.attnum,'INSERT'),'service_update',has_column_privilege('service_role',c.oid,a.attnum,'UPDATE')) ORDER BY a.attnum),'[]'::jsonb) FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',k.conname,'type',k.contype,'definition',pg_get_constraintdef(k.oid,false),'validated',k.convalidated,'deferrable',k.condeferrable,'initially_deferred',k.condeferred,'no_inherit',k.connoinherit) ORDER BY k.conname),'[]'::jsonb) FROM pg_constraint k WHERE k.conrelid=c.oid),
 'indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('schema',ni.nspname,'name',ix.relname,'owner',pg_get_userbyid(ix.relowner),'definition',pg_get_indexdef(i.indexrelid),'unique',i.indisunique,'primary',i.indisprimary,'exclusion',i.indisexclusion,'valid',i.indisvalid,'ready',i.indisready,'live',i.indislive,'nulls_not_distinct',i.indnullsnotdistinct,'predicate',pg_get_expr(i.indpred,i.indrelid),'expressions',pg_get_expr(i.indexprs,i.indrelid),'options',ix.reloptions,'constraint_name',(SELECT k.conname FROM pg_constraint k WHERE k.conindid=i.indexrelid AND k.conrelid=c.oid AND k.contype IN('p','u','x') LIMIT 1)) ORDER BY ni.nspname,ix.relname),'[]'::jsonb) FROM pg_index i JOIN pg_class ix ON ix.oid=i.indexrelid JOIN pg_namespace ni ON ni.oid=ix.relnamespace WHERE i.indrelid=c.oid),
 'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,'roles',(SELECT jsonb_agg(CASE WHEN r.oid=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r.oid) END ORDER BY r.oid) FROM unnest(p.polroles) r(oid)),'using',pg_get_expr(p.polqual,p.polrelid),'with_check',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY p.polname),'[]'::jsonb) FROM pg_policy p WHERE p.polrelid=c.oid),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'definition',pg_get_triggerdef(t.oid,false),'enabled',t.tgenabled,'function',t.tgfoid::regprocedure::text,'internal',t.tgisinternal) ORDER BY t.tgname),'[]'::jsonb) FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal),
 'service_select',has_table_privilege('service_role',c.oid,'SELECT'),'service_insert',has_table_privilege('service_role',c.oid,'INSERT'),'service_update',has_table_privilege('service_role',c.oid,'UPDATE'),'service_delete',has_table_privilege('service_role',c.oid,'DELETE'),'anon_select',has_table_privilege('anon',c.oid,'SELECT'),'authenticated_select',has_table_privilege('authenticated',c.oid,'SELECT'),'authenticated_update',has_table_privilege('authenticated',c.oid,'UPDATE')) ORDER BY c.nspname,c.relname),'[]'::jsonb) FROM selected_relations c),
 'schema_acl',(SELECT jsonb_build_object('name',n.nspname,'owner',pg_get_userbyid(n.nspowner),'acl',n.nspacl) FROM pg_namespace n WHERE n.nspname='public'),
 'default_acls',(SELECT coalesce(jsonb_agg(jsonb_build_object('owner',pg_get_userbyid(d.defaclrole),'schema',n.nspname,'object_type',d.defaclobjtype,'acl',d.defaclacl) ORDER BY d.defaclrole,d.defaclnamespace,d.defaclobjtype),'[]'::jsonb) FROM pg_default_acl d LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace WHERE d.defaclnamespace=0 OR n.nspname='public'),
 'ddl_event_triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',e.evtname,'event',e.evtevent,'enabled',e.evtenabled,'tags',e.evttags,'owner',pg_get_userbyid(e.evtowner),'function',e.evtfoid::regprocedure::text,'function_definition',pg_get_functiondef(e.evtfoid),'function_acl',p.proacl,'function_config',p.proconfig,'security_definer',p.prosecdef) ORDER BY e.evtname),'[]'::jsonb) FROM pg_event_trigger e JOIN pg_proc p ON p.oid=e.evtfoid),
 'lock_snapshot',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',q.relname,'mode',q.mode,'granted',q.granted,'count',q.n) ORDER BY q.relname,q.mode,q.granted),'[]'::jsonb) FROM (SELECT c.relname,l.mode,l.granted,count(*) AS n FROM pg_locks l JOIN selected_relations c ON c.oid=l.relation WHERE l.pid IS DISTINCT FROM pg_backend_pid() GROUP BY c.relname,l.mode,l.granted) q),
 'other_active_client_count',(SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND backend_type='client backend' AND pid<>pg_backend_pid() AND state='active'),
 'limits','Metadata only; no row payload/count/hash or program RPC invocation. Lock snapshot does not guarantee a later writer-free install window. No automatic install/rollback permission or runtime Start readiness.'
) AS ordinary_full_chain_catalog) q;
 SELECT q.ordinary_fulfillment_supplement INTO f FROM (WITH RECURSIVE
requested_functions(signature) AS (VALUES ('public.sponsored_packet_render_authority(text,uuid,uuid,uuid)'),('public.enqueue_verified_sponsored_packet_render(text,uuid,uuid,text,text,text,text,text,text,text,uuid,uuid,uuid,integer,uuid,text,jsonb,jsonb)'),('public.finalize_sponsored_packet_generation_for_route(text,uuid,uuid,text,jsonb,uuid)'),('public.allocate_clinic_packet_funding(uuid,uuid,text)'),('public.consumer_render_job_verification_guard()'),('public.sponsored_packet_route_for_source(text,uuid,uuid,uuid)'),('public.rcap_partner_activation_for_launch(text)'),('public.rcap_program_packet_scope_authorized(text,text)')) ,
requested_presence_only(signature) AS (VALUES ('public.get_consumer_packet_verification_authority(uuid,uuid)'),('public.persist_consumer_packet_verification(uuid,uuid,text,integer,jsonb,jsonb,text,jsonb,text,text,text,jsonb,timestamp with time zone)'),('public.get_consumer_packet_artifact_authority(uuid,uuid)'),('public.consumer_matter_id_for_briefcase_item(uuid)'),('public.enqueue_packet_render_job(uuid,text,text,text,text,text,text,text,uuid,uuid,uuid,uuid,integer,uuid,uuid)')),
requested_relations(schema_name,name) AS (VALUES ('public','sponsored_packet_render_routes'),('public','clinic_packet_funding'),('public','consumer_pending_screening_results'),('public','consumer_briefcase_items'),('public','consumer_packet_verifications'),('public','consumer_packet_artifact_provenance'),('public','clinic_cases'),('public','clinic_events'),('public','packet_render_jobs'),('public','rcap_document_packets'),('public','rcap_document_packet_inputs')),
root_relations AS (
 SELECT r.schema_name,r.name,c.oid,c.relkind FROM requested_relations r
 LEFT JOIN pg_namespace n ON n.nspname=r.schema_name
 LEFT JOIN pg_class c ON c.relnamespace=n.oid AND c.relname=r.name
),
relation_oids(oid) AS (
 SELECT oid FROM root_relations WHERE oid IS NOT NULL
 UNION
 SELECT d.refobjid FROM relation_oids s JOIN pg_rewrite w ON w.ev_class=s.oid AND w.rulename='_RETURN'
 JOIN pg_depend d ON d.classid='pg_rewrite'::regclass AND d.objid=w.oid AND d.refclassid='pg_class'::regclass
 JOIN pg_class c ON c.oid=d.refobjid JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN('r','p','v','m','f')
),
selected_relations AS (
 SELECT c.*,n.nspname FROM relation_oids r JOIN pg_class c ON c.oid=r.oid JOIN pg_namespace n ON n.oid=c.relnamespace
),
associated_function_oids(oid) AS (
 SELECT t.tgfoid FROM pg_trigger t JOIN relation_oids r ON r.oid=t.tgrelid WHERE NOT t.tgisinternal
 UNION
 SELECT d.refobjid FROM pg_depend d WHERE d.refclassid='pg_proc'::regclass AND (
 (d.classid='pg_policy'::regclass AND d.objid IN(SELECT p.oid FROM pg_policy p JOIN relation_oids r ON r.oid=p.polrelid)) OR
 (d.classid='pg_rewrite'::regclass AND d.objid IN(SELECT w.oid FROM pg_rewrite w JOIN relation_oids r ON r.oid=w.ev_class)) OR
 (d.classid='pg_attrdef'::regclass AND d.objid IN(SELECT a.oid FROM pg_attrdef a JOIN relation_oids r ON r.oid=a.adrelid)) OR
 (d.classid='pg_constraint'::regclass AND d.objid IN(SELECT k.oid FROM pg_constraint k JOIN relation_oids r ON r.oid=k.conrelid)) OR
 (d.classid='pg_class'::regclass AND d.objid IN(SELECT i.indexrelid FROM pg_index i JOIN relation_oids r ON r.oid=i.indrelid)))
),
function_oids(oid) AS (
 SELECT to_regprocedure(r.signature)::oid FROM requested_functions r WHERE to_regprocedure(r.signature) IS NOT NULL
 UNION SELECT a.oid FROM associated_function_oids a JOIN pg_proc p ON p.oid=a.oid JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND NOT(p.oid=ANY(ARRAY['public.current_partner_role()','public.current_partner_slug()','public.emit_rcap_screening_started_event()','public.guard_packet_credit_ledger()','public.is_internal_admin()','public.rcap_agreement_clearance(uuid)','public.rcap_clear_withdrawn_signed_agreement()','public.rcap_guard_agreement_projection()','public.rcap_guard_commercial_authorization()','public.rcap_guard_launch_authority_event()','public.rcap_guard_launch_capacity()','public.rcap_guard_real_preparation()','public.rcap_guard_reserved_partner_slug()','public.rcap_onboarding_guard_section_mutation()','public.rcap_onboarding_resolve_partner_record()','public.rcap_onboarding_validate_agreement_asset()','public.rcap_onboarding_validate_asset_metadata()','public.rcap_program_commercial_valid(uuid)','public.rcap_program_dependency_hash(uuid, text[])','public.rcap_program_funding_valid(uuid)','public.rcap_program_geography_consistent(uuid)','public.rcap_program_internal_authority(uuid)','public.rcap_program_launch_scope(uuid)','public.rcap_program_material_scope(uuid, text)','public.rcap_program_policy_source(uuid)','public.rcap_program_requirement_registry()','public.rcap_program_screening_capacity(text)','public.rcap_refuse_audit_rewrite()','public.rcap_require_documented_real_agreement()','public.rcap_screening_jurisdictions()','public.rcap_service_assert_internal_actor(uuid)','public.rcap_service_evaluate_program(text, uuid, text)','public.rcap_validate_signed_agreement_reference()','public.set_partner_entitlement_updated_at()','public.set_partner_onboarding_artifact_updated_at()','public.set_partner_onboarding_launch_check_updated_at()','public.set_partner_onboarding_updated_at()','public.set_partner_packet_entitlement_updated_at()','public.set_partner_users_updated_at()']::regprocedure[]))
),
functions AS (
 SELECT p.*,n.nspname,l.lanname FROM function_oids f JOIN pg_proc p ON p.oid=f.oid JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang WHERE p.prokind IN('f','p')
)
SELECT jsonb_build_object(
 'scope','Finite ordinary sponsorship fulfillment supplement: five existing patch targets, missing route helper, two prerequisite helpers and eleven new relation roots; metadata only',
 'requested_project_ref','hyflxnlhpmiqxvvcoiia',
 'source_candidate','90bde6bbf8bcce4f57ebed3c26cf78061301a06e',
 'accepted_core_sha256','04c68a31b1ac6d583c5e32703e70099c17d40a548122d37ff7406692297ab81b',
 'observed_at',clock_timestamp(),'database',current_database(),'server_version',current_setting('server_version'),
 'current_user',current_user,'session_user',session_user,'transaction_read_only',current_setting('transaction_read_only'),'search_path',current_setting('search_path'),
 'presence_only_functions',(SELECT jsonb_agg(jsonb_build_object('signature',r.signature,'present',to_regprocedure(r.signature) IS NOT NULL) ORDER BY r.signature) FROM requested_presence_only r),
 'requested_function_presence',(SELECT jsonb_agg(jsonb_build_object('signature',r.signature,'present',to_regprocedure(r.signature) IS NOT NULL) ORDER BY r.signature) FROM requested_functions r),
 'requested_relation_presence',(SELECT jsonb_agg(jsonb_build_object('schema',r.schema_name,'name',r.name,'present',r.oid IS NOT NULL,'kind',r.relkind) ORDER BY r.schema_name,r.name) FROM root_relations r),
 'functions',(SELECT coalesce(jsonb_agg(jsonb_build_object(
 'schema',f.nspname,'name',f.proname,'signature',format('%I.%I(%s)',f.nspname,f.proname,oidvectortypes(f.proargtypes)),
 'identity_arguments',pg_get_function_identity_arguments(f.oid),'arguments',pg_get_function_arguments(f.oid),'result',pg_get_function_result(f.oid),
 'kind',f.prokind,'language',f.lanname,'owner',pg_get_userbyid(f.proowner),'security_definer',f.prosecdef,'leakproof',f.proleakproof,'volatility',f.provolatile,'strict',f.proisstrict,'parallel',f.proparallel,'config',f.proconfig,
 'definition',pg_get_functiondef(f.oid),'body_md5',md5(f.prosrc),'definition_md5',md5(pg_get_functiondef(f.oid)),'acl',f.proacl,
 'anon_execute',has_function_privilege('anon',f.oid,'EXECUTE'),'authenticated_execute',has_function_privilege('authenticated',f.oid,'EXECUTE'),'service_execute',has_function_privilege('service_role',f.oid,'EXECUTE')) ORDER BY f.nspname,f.proname,f.oid),'[]'::jsonb) FROM functions f),
 'relations',(SELECT coalesce(jsonb_agg(jsonb_build_object(
 'schema',c.nspname,'name',c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl,'options',c.reloptions,'rls',c.relrowsecurity,'forced_rls',c.relforcerowsecurity,'replica_identity',c.relreplident,
 'view_definition',CASE WHEN c.relkind IN('v','m') THEN pg_get_viewdef(c.oid,false) ELSE NULL END,
 'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('position',a.attnum,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(d.adbin,d.adrelid),'collation',CASE WHEN a.attcollation<>0 THEN a.attcollation::regcollation::text END,'acl',a.attacl,
 'anon_select',has_column_privilege('anon',c.oid,a.attnum,'SELECT'),'authenticated_select',has_column_privilege('authenticated',c.oid,a.attnum,'SELECT'),'authenticated_insert',has_column_privilege('authenticated',c.oid,a.attnum,'INSERT'),'authenticated_update',has_column_privilege('authenticated',c.oid,a.attnum,'UPDATE'),'service_select',has_column_privilege('service_role',c.oid,a.attnum,'SELECT'),'service_insert',has_column_privilege('service_role',c.oid,a.attnum,'INSERT'),'service_update',has_column_privilege('service_role',c.oid,a.attnum,'UPDATE')) ORDER BY a.attnum),'[]'::jsonb) FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',k.conname,'type',k.contype,'definition',pg_get_constraintdef(k.oid,false),'validated',k.convalidated,'deferrable',k.condeferrable,'initially_deferred',k.condeferred,'no_inherit',k.connoinherit) ORDER BY k.conname),'[]'::jsonb) FROM pg_constraint k WHERE k.conrelid=c.oid),
 'indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('schema',ni.nspname,'name',ix.relname,'owner',pg_get_userbyid(ix.relowner),'definition',pg_get_indexdef(i.indexrelid),'unique',i.indisunique,'primary',i.indisprimary,'exclusion',i.indisexclusion,'valid',i.indisvalid,'ready',i.indisready,'live',i.indislive,'nulls_not_distinct',i.indnullsnotdistinct,'predicate',pg_get_expr(i.indpred,i.indrelid),'expressions',pg_get_expr(i.indexprs,i.indrelid),'options',ix.reloptions,'constraint_name',(SELECT k.conname FROM pg_constraint k WHERE k.conindid=i.indexrelid AND k.conrelid=c.oid AND k.contype IN('p','u','x') LIMIT 1)) ORDER BY ni.nspname,ix.relname),'[]'::jsonb) FROM pg_index i JOIN pg_class ix ON ix.oid=i.indexrelid JOIN pg_namespace ni ON ni.oid=ix.relnamespace WHERE i.indrelid=c.oid),
 'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,'roles',(SELECT jsonb_agg(CASE WHEN r.oid=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r.oid) END ORDER BY r.oid) FROM unnest(p.polroles) r(oid)),'using',pg_get_expr(p.polqual,p.polrelid),'with_check',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY p.polname),'[]'::jsonb) FROM pg_policy p WHERE p.polrelid=c.oid),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'definition',pg_get_triggerdef(t.oid,false),'enabled',t.tgenabled,'function',t.tgfoid::regprocedure::text,'internal',t.tgisinternal) ORDER BY t.tgname),'[]'::jsonb) FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal),
 'service_select',has_table_privilege('service_role',c.oid,'SELECT'),'service_insert',has_table_privilege('service_role',c.oid,'INSERT'),'service_update',has_table_privilege('service_role',c.oid,'UPDATE'),'service_delete',has_table_privilege('service_role',c.oid,'DELETE'),'anon_select',has_table_privilege('anon',c.oid,'SELECT'),'authenticated_select',has_table_privilege('authenticated',c.oid,'SELECT'),'authenticated_update',has_table_privilege('authenticated',c.oid,'UPDATE')) ORDER BY c.nspname,c.relname),'[]'::jsonb) FROM selected_relations c),
 'lock_snapshot',(SELECT coalesce(jsonb_agg(jsonb_build_object('relation',q.relname,'mode',q.mode,'granted',q.granted,'count',q.n) ORDER BY q.relname,q.mode,q.granted),'[]'::jsonb) FROM (SELECT c.relname,l.mode,l.granted,count(*) AS n FROM pg_locks l JOIN selected_relations c ON c.oid=l.relation WHERE l.pid IS DISTINCT FROM pg_backend_pid() GROUP BY c.relname,l.mode,l.granted) q),
 'other_active_client_count',(SELECT count(*) FROM pg_stat_activity WHERE datname=current_database() AND backend_type='client backend' AND pid<>pg_backend_pid() AND state='active'),
 'limits','Metadata only; no row payload/count/hash or program RPC invocation. Lock snapshot does not guarantee a later writer-free install window. No automatic install/rollback permission or runtime Start readiness.'
) AS ordinary_fulfillment_supplement) q;
 SELECT q.ordinary_remaining_unknowns INTO r FROM (WITH
requested_functions(signature) AS (VALUES ('public.rcap_service_review_onboarding_artifact(text,uuid,text,uuid,text,text,text,uuid)'),('public.rcap_partner_page_configuration_id(text)'),('public.rcap_onboarding_validate_recipient_contact()'),('public.rcap_service_stage_program_launch(text,uuid,uuid,bigint,text,jsonb,uuid)'),('public.rcap_service_compensate_real_launch(text,uuid,uuid,text)'),('public.rcap_program_partner_jurisdictions(uuid)'),('public.rcap_service_get_program_configuration(text,uuid)'),('public.rcap_service_assert_partner_actor(text,uuid,uuid)'),('public.rcap_service_provision_partner(text,text,text,text,text,text,text,text,uuid,uuid,text,text)'),('public.rcap_service_provision_partner(text,text,text,text,text,text,text,text,uuid,uuid,text,text,jsonb)'),('public.rcap_service_enable_program_policy(text,uuid)'),('public.rcap_service_save_program_configuration(text,uuid,bigint,jsonb,uuid)'),('public.rcap_service_save_program_configuration(text,uuid,bigint,jsonb,uuid,boolean)'),('public.rcap_program_external_rights_evidence(uuid)'),('public.rcap_onboarding_derive_idempotency_actor()'),('public.rcap_service_record_program_decision(text,uuid,text,text,bigint,jsonb,uuid)'),('public.rcap_service_configure_launch_capacity(text,uuid,uuid,text,integer,integer,text,uuid,bigint)'),('public.rcap_onboarding_guard_partner_row_mutation()'),('public.rcap_service_stage_real_launch(text,uuid,uuid,bigint,text,jsonb,uuid)'),('public.rcap_onboarding_guard_idempotency_update()'),('public.rcap_service_generate_onboarding_artifact_version(text,uuid,uuid,text,uuid,bigint,jsonb,jsonb,jsonb,text,text,jsonb,text,text)'),('public.rcap_onboarding_prevent_append_only_mutation()'),('public.rcap_service_ensure_onboarding_artifacts(text,uuid,text[])'),('public.rcap_service_invalidate_onboarding_artifact_version(text,uuid,text,text[])'),('public.rcap_service_reconcile_ordinary_sponsored_route(text,uuid,uuid,boolean)')),
requested_presence_only(signature) AS (VALUES ('public.rcap_guard_launch_capacity()'),('public.rcap_program_funding_valid(uuid)')),
requested_relations(schema_name,name) AS (VALUES ('public','ordinary_sponsored_packet_routes'),('public','partner_onboarding_contacts'),('public','partner_onboarding_activity'),('public','partner_onboarding_idempotency'),('public','partner_onboarding_planned_users'),('public','partner_onboarding_report_recipients'),('public','partner_onboarding_artifact_reviews'),('public','partner_onboarding_workspace_safe'),('public','partner_onboarding_assets_safe'),('public','partner_onboarding_agreements_safe'),('public','partner_onboarding'),('public','rcap_launch_capacity_events')),
requested_parent_columns(name) AS (VALUES ('blocker_code'),('closed_at'),('commercial_gate_changed_at'),('commercial_gate_changed_by'),('commercial_gate_status'),('completion_percentage'),('last_meaningful_activity_at'),('launch_readiness_state'),('next_action_code'),('next_action_owner'),('schema_version'),('submitted_at'),('submitted_schema_version'),('target_launch_date')),
root_relations AS (SELECT r.schema_name,r.name,c.oid,c.relkind FROM requested_relations r LEFT JOIN pg_namespace n ON n.nspname=r.schema_name LEFT JOIN pg_class c ON c.relnamespace=n.oid AND c.relname=r.name),
selected_relations AS (
 SELECT c.*,n.nspname FROM root_relations r JOIN pg_class c ON c.oid=r.oid JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE r.name NOT IN ('partner_onboarding','rcap_launch_capacity_events')
 OR (r.name='partner_onboarding' AND EXISTS(SELECT 1 FROM pg_attribute a JOIN requested_parent_columns expected ON expected.name=a.attname WHERE a.attrelid=c.oid AND NOT a.attisdropped))
 OR (r.name='rcap_launch_capacity_events' AND (NOT EXISTS(SELECT 1 FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attname='document_id' AND NOT a.attisdropped AND a.attnotnull) OR NOT EXISTS(SELECT 1 FROM pg_attribute a WHERE a.attrelid=c.oid AND a.attname='document_hash' AND NOT a.attisdropped AND a.attnotnull)))
),
functions AS (SELECT p.*,n.nspname,l.lanname FROM requested_functions r JOIN pg_proc p ON p.oid=to_regprocedure(r.signature) JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang)

SELECT jsonb_build_object(
 'scope','Only remaining unknown ordinary-registry catalog and declared missing normal chain metadata; current correct fulfillment module is not re-read',
 'observed_at',clock_timestamp(),'database',current_database(),'server_version',current_setting('server_version'),
 'current_user',current_user,'session_user',session_user,'transaction_read_only',current_setting('transaction_read_only'),'search_path',current_setting('search_path'),
 'presence_only_functions',(SELECT jsonb_agg(jsonb_build_object('signature',r.signature,'present',to_regprocedure(r.signature) IS NOT NULL) ORDER BY r.signature) FROM requested_presence_only r),
 'requested_function_presence',(SELECT jsonb_agg(jsonb_build_object('signature',r.signature,'present',to_regprocedure(r.signature) IS NOT NULL) ORDER BY r.signature) FROM requested_functions r),
 'requested_relation_presence',(SELECT jsonb_agg(jsonb_build_object('schema',r.schema_name,'name',r.name,'present',r.oid IS NOT NULL,'kind',r.relkind) ORDER BY r.schema_name,r.name) FROM root_relations r),
 'actual_role',current_setting('role'),
 'planned_existing_update_hashes',(SELECT jsonb_agg(jsonb_build_object('signature',r.signature,'present',p.oid IS NOT NULL,'body_md5',md5(p.prosrc),'definition_sha256',encode(sha256(convert_to(pg_get_functiondef(p.oid),'UTF8')),'hex')) ORDER BY r.signature) FROM requested_presence_only r LEFT JOIN pg_proc p ON p.oid=to_regprocedure(r.signature)),
 'declared_parent_column_presence',(SELECT jsonb_agg(jsonb_build_object('name',expected.name,'present',a.attname IS NOT NULL) ORDER BY expected.name) FROM requested_parent_columns expected LEFT JOIN pg_attribute a ON a.attrelid=to_regclass('public.partner_onboarding') AND a.attname=expected.name AND NOT a.attisdropped),
 'functions',(SELECT coalesce(jsonb_agg(jsonb_build_object(
 'schema',f.nspname,'name',f.proname,'signature',format('%I.%I(%s)',f.nspname,f.proname,oidvectortypes(f.proargtypes)),
 'identity_arguments',pg_get_function_identity_arguments(f.oid),'arguments',pg_get_function_arguments(f.oid),'result',pg_get_function_result(f.oid),
 'kind',f.prokind,'language',f.lanname,'owner',pg_get_userbyid(f.proowner),'security_definer',f.prosecdef,'leakproof',f.proleakproof,'volatility',f.provolatile,'strict',f.proisstrict,'parallel',f.proparallel,'config',f.proconfig,
 'definition_sha256',encode(sha256(convert_to(pg_get_functiondef(f.oid),'UTF8')),'hex'),'body_md5',md5(f.prosrc),'definition_md5',md5(pg_get_functiondef(f.oid)),'acl',f.proacl,
 'anon_execute',has_function_privilege('anon',f.oid,'EXECUTE'),'authenticated_execute',has_function_privilege('authenticated',f.oid,'EXECUTE'),'service_execute',has_function_privilege('service_role',f.oid,'EXECUTE')) ORDER BY f.nspname,f.proname,f.oid),'[]'::jsonb) FROM functions f),
 'relations',(SELECT coalesce(jsonb_agg(jsonb_build_object(
 'schema',c.nspname,'name',c.relname,'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'acl',c.relacl,'options',c.reloptions,'rls',c.relrowsecurity,'forced_rls',c.relforcerowsecurity,'replica_identity',c.relreplident,
 'view_definition',CASE WHEN c.relkind IN('v','m') THEN pg_get_viewdef(c.oid,false) ELSE NULL END,
 'columns',(SELECT coalesce(jsonb_agg(jsonb_build_object('position',a.attnum,'name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'not_null',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(d.adbin,d.adrelid),'collation',CASE WHEN a.attcollation<>0 THEN a.attcollation::regcollation::text END,'acl',a.attacl,
 'anon_select',has_column_privilege('anon',c.oid,a.attnum,'SELECT'),'authenticated_select',has_column_privilege('authenticated',c.oid,a.attnum,'SELECT'),'authenticated_insert',has_column_privilege('authenticated',c.oid,a.attnum,'INSERT'),'authenticated_update',has_column_privilege('authenticated',c.oid,a.attnum,'UPDATE'),'service_select',has_column_privilege('service_role',c.oid,a.attnum,'SELECT'),'service_insert',has_column_privilege('service_role',c.oid,a.attnum,'INSERT'),'service_update',has_column_privilege('service_role',c.oid,a.attnum,'UPDATE')) ORDER BY a.attnum),'[]'::jsonb) FROM pg_attribute a LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
 'constraints',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',k.conname,'type',k.contype,'definition',pg_get_constraintdef(k.oid,false),'validated',k.convalidated,'deferrable',k.condeferrable,'initially_deferred',k.condeferred,'no_inherit',k.connoinherit) ORDER BY k.conname),'[]'::jsonb) FROM pg_constraint k WHERE k.conrelid=c.oid),
 'indexes',(SELECT coalesce(jsonb_agg(jsonb_build_object('schema',ni.nspname,'name',ix.relname,'owner',pg_get_userbyid(ix.relowner),'definition',pg_get_indexdef(i.indexrelid),'unique',i.indisunique,'primary',i.indisprimary,'exclusion',i.indisexclusion,'valid',i.indisvalid,'ready',i.indisready,'live',i.indislive,'nulls_not_distinct',i.indnullsnotdistinct,'predicate',pg_get_expr(i.indpred,i.indrelid),'expressions',pg_get_expr(i.indexprs,i.indrelid),'options',ix.reloptions,'constraint_name',(SELECT k.conname FROM pg_constraint k WHERE k.conindid=i.indexrelid AND k.conrelid=c.oid AND k.contype IN('p','u','x') LIMIT 1)) ORDER BY ni.nspname,ix.relname),'[]'::jsonb) FROM pg_index i JOIN pg_class ix ON ix.oid=i.indexrelid JOIN pg_namespace ni ON ni.oid=ix.relnamespace WHERE i.indrelid=c.oid),
 'policies',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',p.polname,'command',p.polcmd,'permissive',p.polpermissive,'roles',(SELECT jsonb_agg(CASE WHEN r.oid=0 THEN 'PUBLIC' ELSE pg_get_userbyid(r.oid) END ORDER BY r.oid) FROM unnest(p.polroles) r(oid)),'using',pg_get_expr(p.polqual,p.polrelid),'with_check',pg_get_expr(p.polwithcheck,p.polrelid)) ORDER BY p.polname),'[]'::jsonb) FROM pg_policy p WHERE p.polrelid=c.oid),
 'triggers',(SELECT coalesce(jsonb_agg(jsonb_build_object('name',t.tgname,'definition',pg_get_triggerdef(t.oid,false),'enabled',t.tgenabled,'function',t.tgfoid::regprocedure::text,'internal',t.tgisinternal) ORDER BY t.tgname),'[]'::jsonb) FROM pg_trigger t WHERE t.tgrelid=c.oid AND NOT t.tgisinternal),
 'service_select',has_table_privilege('service_role',c.oid,'SELECT'),'service_insert',has_table_privilege('service_role',c.oid,'INSERT'),'service_update',has_table_privilege('service_role',c.oid,'UPDATE'),'service_delete',has_table_privilege('service_role',c.oid,'DELETE'),'anon_select',has_table_privilege('anon',c.oid,'SELECT'),'authenticated_select',has_table_privilege('authenticated',c.oid,'SELECT'),'authenticated_update',has_table_privilege('authenticated',c.oid,'UPDATE')) ORDER BY c.nspname,c.relname),'[]'::jsonb) FROM selected_relations c),
 'limits','Registry full catalog metadata, declared missing normal-chain function signatures/ACLs/descriptor/body hashes only, declared missing relation presence and full metadata if present, conditional parent/capacity metadata only if declared field/nullability changes are present. Two planned existing core updates expose hashes only. No known-six/funding recapture, function bodies, rows, usage counts, locks/activity, RPC, install or inverse.'
) AS ordinary_remaining_unknowns) q;
 RETURN jsonb_build_object('core',c,'fulfillment',f,'ordinaryRegistry',r);
END $capture$;
CREATE OR REPLACE FUNCTION pg_temp.wwt_assert_transition(b jsonb,a jsonb,i integer,effects jsonb) RETURNS void LANGUAGE plpgsql AS $compare$
DECLARE scope text;bc jsonb;ac jsonb;masked jsonb:=a;arr jsonb;rec jsonb;old jsonb;expected jsonb;sig text;want text;key text;cols jsonb;part jsonb;pos integer;seen integer;
BEGIN
 IF i NOT IN(0,1) THEN RAISE EXCEPTION 'wwt_invalid_step';END IF;
 FOREACH scope IN ARRAY ARRAY['core','fulfillment','ordinaryRegistry'] LOOP
  bc:=b->scope;ac:=a->scope;arr:='[]';
  FOR rec IN SELECT value FROM jsonb_array_elements(ac->'functions') LOOP
   sig:=replace(rec->>'signature',' ','');SELECT value INTO old FROM jsonb_array_elements(bc->'functions') WHERE replace(value->>'signature',' ','')=sig;
   IF old IS NOT NULL AND effects->'functions' ? sig THEN
    want:=effects->'functions'->sig->>'definitionSha256';
    IF rec ? 'definition' THEN IF encode(sha256(convert_to(rec->>'definition','UTF8')),'hex') IS DISTINCT FROM want THEN RAISE EXCEPTION 'wwt_wrong_source_function:%',sig;END IF;
    ELSIF rec->>'definition_sha256' IS DISTINCT FROM want THEN RAISE EXCEPTION 'wwt_wrong_source_function_hash:%',sig;END IF;
    IF pg_temp.wwt_norm(rec-ARRAY['definition','definition_md5','body_md5','definition_sha256']) IS DISTINCT FROM pg_temp.wwt_norm(old-ARRAY['definition','definition_md5','body_md5','definition_sha256']) THEN RAISE EXCEPTION 'wwt_function_descriptor_drift:%',sig;END IF;
    arr:=arr||jsonb_build_array(old);
   ELSIF old IS NULL AND i=0 AND scope='fulfillment' AND rec->>'name'='sponsored_packet_route_for_source' THEN
    IF pg_temp.wwt_norm(rec) IS DISTINCT FROM pg_temp.wwt_norm(effects->'helper') THEN RAISE EXCEPTION 'wwt_new_helper_mismatch';END IF;
   ELSE arr:=arr||jsonb_build_array(rec);END IF;
  END LOOP;
  IF i=0 AND scope='fulfillment' THEN SELECT count(*) INTO seen FROM jsonb_array_elements(ac->'functions') WHERE value->>'name'='sponsored_packet_route_for_source';IF seen<>1 THEN RAISE EXCEPTION 'wwt_new_helper_missing_or_duplicate';END IF;END IF;
  masked:=jsonb_set(masked,ARRAY[scope,'functions'],arr);arr:='[]';
  FOR rec IN SELECT value FROM jsonb_array_elements(ac->'relations') LOOP
   SELECT value INTO old FROM jsonb_array_elements(bc->'relations') WHERE value->>'name'=rec->>'name' AND value->>'schema'=rec->>'schema';
   IF i=0 AND rec->>'name'='ordinary_sponsored_packet_routes' AND scope IN('core','ordinaryRegistry') THEN
    IF old IS NOT NULL OR pg_temp.wwt_norm(rec) IS DISTINCT FROM pg_temp.wwt_norm(effects->'registry') THEN RAISE EXCEPTION 'wwt_new_registry_mismatch';END IF;
   ELSIF i=1 AND scope='ordinaryRegistry' AND rec->>'name'='rcap_launch_capacity_events' THEN
    SELECT value INTO expected FROM jsonb_array_elements(a->'core'->'relations') WHERE value->>'schema'='public' AND value->>'name'='rcap_launch_capacity_events';
    IF old IS NOT NULL OR expected IS NULL OR pg_temp.wwt_norm(rec) IS DISTINCT FROM pg_temp.wwt_norm(expected) THEN RAISE EXCEPTION 'wwt_capacity_new_projection_mismatch';END IF;
   ELSIF (i=0 AND scope='fulfillment' AND rec->>'name'='clinic_packet_funding') OR (i=1 AND scope='core' AND rec->>'name'='rcap_launch_capacity_events') THEN
    IF old IS NULL THEN RAISE EXCEPTION 'wwt_mutated_relation_missing_preimage';END IF;expected:=old;cols:='[]';
    FOR part IN SELECT value FROM jsonb_array_elements(old->'columns') LOOP
     IF (i=0 AND part->>'name'='event_id') OR (i=1 AND part->>'name' IN('document_id','document_hash')) THEN part:=jsonb_set(part,'{not_null}','false');END IF;
     cols:=cols||jsonb_build_array(part);
    END LOOP;
    IF i=0 THEN SELECT max((value->>'position')::integer)+1 INTO pos FROM jsonb_array_elements(cols);cols:=cols||jsonb_build_array(jsonb_set(effects->'fundingColumn','{position}',to_jsonb(pos)));key:='fundingConstraint';ELSE key:='capacityConstraint';END IF;
    expected:=jsonb_set(expected,'{columns}',cols);expected:=jsonb_set(expected,'{constraints}',(old->'constraints')||jsonb_build_array(effects->key));
    IF pg_temp.wwt_norm(rec) IS DISTINCT FROM pg_temp.wwt_norm(expected) THEN RAISE EXCEPTION 'wwt_relation_source_effect_mismatch:%',rec->>'name';END IF;arr:=arr||jsonb_build_array(old);
   ELSE arr:=arr||jsonb_build_array(rec);END IF;
  END LOOP;
  IF i=0 AND scope IN('core','ordinaryRegistry') THEN SELECT count(*) INTO seen FROM jsonb_array_elements(ac->'relations') WHERE value->>'name'='ordinary_sponsored_packet_routes';IF seen<>1 THEN RAISE EXCEPTION 'wwt_registry_missing_or_duplicate';END IF;END IF;
  IF i=1 AND scope='ordinaryRegistry' THEN SELECT count(*) INTO seen FROM jsonb_array_elements(ac->'relations') WHERE value->>'name'='rcap_launch_capacity_events';IF seen<>1 THEN RAISE EXCEPTION 'wwt_capacity_projection_missing_or_duplicate';END IF;END IF;
  masked:=jsonb_set(masked,ARRAY[scope,'relations'],arr);
  FOREACH key IN ARRAY ARRAY['requested_relation_presence','requested_function_presence','planned_existing_update_hashes'] LOOP
   IF ac ? key THEN arr:='[]';
    FOR rec IN SELECT value FROM jsonb_array_elements(ac->key) LOOP
     IF i=0 AND key='requested_relation_presence' AND rec->>'name'='ordinary_sponsored_packet_routes' THEN
      IF rec->>'kind'<>'r' OR rec->'present'<>'true'::jsonb THEN RAISE EXCEPTION 'wwt_registry_presence_mismatch';END IF;SELECT value INTO old FROM jsonb_array_elements(bc->key) WHERE value->>'name'=rec->>'name';IF (rec-ARRAY['kind','present']) IS DISTINCT FROM (old-ARRAY['kind','present']) THEN RAISE EXCEPTION 'wwt_registry_presence_descriptor';END IF;rec:=old;
     ELSIF i=0 AND key='requested_function_presence' AND replace(rec->>'signature',' ','')='public.sponsored_packet_route_for_source(text,uuid,uuid,uuid)' THEN
      IF rec->'present'<>'true'::jsonb THEN RAISE EXCEPTION 'wwt_helper_presence_mismatch';END IF;SELECT value INTO old FROM jsonb_array_elements(bc->key) WHERE value->>'signature'=rec->>'signature';IF (rec-'present') IS DISTINCT FROM (old-'present') THEN RAISE EXCEPTION 'wwt_helper_presence_descriptor';END IF;rec:=old;
     ELSIF i=1 AND key='planned_existing_update_hashes' AND effects->'functions' ? replace(rec->>'signature',' ','') THEN
      sig:=replace(rec->>'signature',' ','');IF rec->>'definition_sha256' IS DISTINCT FROM effects->'functions'->sig->>'definitionSha256' OR rec->>'body_md5' IS DISTINCT FROM effects->'functions'->sig->>'bodyMd5' THEN RAISE EXCEPTION 'wwt_capacity_hash_mismatch';END IF;SELECT value INTO old FROM jsonb_array_elements(bc->key) WHERE value->>'signature'=rec->>'signature';IF (rec-ARRAY['definition_sha256','body_md5']) IS DISTINCT FROM (old-ARRAY['definition_sha256','body_md5']) THEN RAISE EXCEPTION 'wwt_capacity_descriptor_mismatch';END IF;rec:=old;
     END IF;arr:=arr||jsonb_build_array(rec);
    END LOOP;masked:=jsonb_set(masked,ARRAY[scope,key],arr);
   END IF;
  END LOOP;
 END LOOP;
 IF pg_temp.wwt_state(masked) IS DISTINCT FROM pg_temp.wwt_state(b) THEN RAISE EXCEPTION 'wwt_undeclared_catalog_preservation_difference';END IF;
END $compare$;

SELECT set_config('legalease.wwt.expected_current',__B_WWT_CURRENT_JSON_LITERAL__,true),set_config('legalease.wwt.expected_restore',__B_WWT_RESTORE_JSON_LITERAL__,true),set_config('legalease.wwt.native_receipt',__B_WWT_NATIVE_RECEIPT_JSON_LITERAL__,true);
DO $recovery_guard$
DECLARE receipt jsonb:=current_setting('legalease.wwt.native_receipt')::jsonb;current_state jsonb:=current_setting('legalease.wwt.expected_current')::jsonb;apply_xid xid;signature text;
BEGIN
 IF current_user<>'postgres' OR session_user<>'postgres' OR current_database()<>'postgres' OR current_setting('transaction_read_only')<>'off' THEN RAISE EXCEPTION 'wwt_recovery_actor_refused';END IF;
 IF receipt->>'schemaVersion'<>'wwt-two-migration-schema-native-receipt/v1' OR (receipt->>'step')::integer<>1 OR receipt->>'canonicalSha256'<>'6fd142707a1fb3b41be0887af38ee2ea7ba0bce7b8400750fcb8e01b44cbfcb4' OR receipt->'transactionLocalPreimageAndPreservationGuardPassed'<>'true'::jsonb THEN RAISE EXCEPTION 'wwt_recovery_native_receipt_missing';END IF;
 IF (receipt->>'catalogOwnerXid')!~'^[0-9]+$' OR (receipt->>'appliedTransactionStart')::timestamptz>clock_timestamp() OR (receipt->>'appliedTransactionStart')::timestamptz<=clock_timestamp()-interval '15 minutes' THEN RAISE EXCEPTION 'wwt_recovery_receipt_stale';END IF;
 apply_xid:=((receipt->>'catalogOwnerXid')::numeric%4294967296)::text::xid;
 PERFORM set_config('search_path',current_state->'core'->>'search_path',true);
 IF pg_temp.wwt_state(pg_temp.wwt_capture()) IS DISTINCT FROM pg_temp.wwt_state(current_state) THEN RAISE EXCEPTION 'wwt_recovery_postimage_cas_failed';END IF;
 IF EXISTS(SELECT 1 FROM public.rcap_launch_capacity_events WHERE document_id IS NULL OR document_hash IS NULL OR age(xmin)<=age(apply_xid)) THEN RAISE EXCEPTION 'wwt_capacity_used_no_inverse';END IF;
 IF (SELECT xmin FROM pg_constraint WHERE conrelid='public.rcap_launch_capacity_events'::regclass AND conname='rcap_capacity_document_pair') IS DISTINCT FROM apply_xid THEN RAISE EXCEPTION 'wwt_capacity_constraint_apply_xid_changed';END IF;
 FOREACH signature IN ARRAY ARRAY['public.rcap_guard_launch_capacity()','public.rcap_program_funding_valid(uuid)','public.rcap_service_configure_launch_capacity(text,uuid,uuid,text,integer,integer,text,uuid,bigint)'] LOOP
 IF (SELECT xmin FROM pg_proc WHERE oid=to_regprocedure(signature)) IS DISTINCT FROM apply_xid THEN RAISE EXCEPTION 'wwt_source_function_apply_xid_changed:%',signature;END IF;
 END LOOP;
END $recovery_guard$;

CREATE OR REPLACE FUNCTION public.rcap_guard_launch_capacity()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
 perform public.rcap_service_assert_internal_actor(new.actor_auth_user_id);
 if not exists(select 1 from public.partner_onboarding_assets d join public.partner_onboarding w on w.id=d.workspace_id where w.id=new.workspace_id and w.status<>'live' and not w.landing_page_ready and w.agreement_status='signed' and d.id=new.document_id and d.sha256_hex=new.document_hash and d.category='procurement_document' and d.review_status='approved' and d.lifecycle_status='active') then raise exception 'current signed procurement authority required'; end if;
 return new;
end $function$;

CREATE OR REPLACE FUNCTION public.rcap_program_funding_valid(p_workspace uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.rcap_service_configure_launch_capacity(p_slug text, p_actor uuid, p_document uuid, p_hash text, p_screenings integer, p_packets integer, p_reference text, p_request uuid, p_version bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare w public.partner_onboarding%rowtype; old public.rcap_launch_capacity_events%rowtype; previous jsonb; begin
 perform public.rcap_service_assert_internal_actor(p_actor);
 select * into strict w from public.partner_onboarding where partner_slug=p_slug for update;
 select * into old from public.rcap_launch_capacity_events where workspace_id=w.id and request_id=p_request;
 if found then if old.actor_auth_user_id<>p_actor or old.document_id<>p_document or old.document_hash<>p_hash or old.screenings_allowed<>p_screenings or old.packet_cap<>p_packets or old.authority_reference<>p_reference then raise exception 'capacity request binding conflict'; end if;return true;end if;
 if w.status='live' or w.landing_page_ready or w.aggregate_version<>p_version then raise exception 'publication or source changed'; end if;
 if exists(select 1 from public.rcap_launch_operation_events e where e.workspace_id=w.id and e.step='prepared' and not exists(select 1 from public.rcap_launch_operation_events t where t.operation_id=e.operation_id and t.step in ('complete','held','failed'))) then raise exception 'launch in progress'; end if;
 perform 1 from public.partner_entitlement where partner_slug=p_slug for update;
 perform 1 from public.partner_packet_entitlement where partner_id=w.partner_record_id and entitlement_scope='sponsored_packets' and expires_at is null for update;
 previous:=jsonb_build_object('screening',(select to_jsonb(e) from public.partner_entitlement e where e.partner_slug=p_slug),'packet',(select to_jsonb(e) from public.partner_packet_entitlement e where e.partner_id=w.partner_record_id and e.entitlement_scope='sponsored_packets' and e.expires_at is null));
 insert into public.rcap_launch_capacity_events(workspace_id,actor_auth_user_id,document_id,document_hash,screenings_allowed,packet_cap,authority_reference,request_id,previous_capacity) values(w.id,p_actor,p_document,p_hash,p_screenings,p_packets,p_reference,p_request,previous);
 insert into public.partner_entitlement(partner_slug,screenings_allowed,contract_note) values(p_slug,p_screenings,p_reference) on conflict(partner_slug) do update set screenings_allowed=excluded.screenings_allowed,contract_note=excluded.contract_note;
 if exists(select 1 from public.partner_packet_entitlement where partner_id=w.partner_record_id and entitlement_scope='sponsored_packets' and expires_at is null) then
 update public.partner_packet_entitlement set packet_cap=p_packets where partner_id=w.partner_record_id and entitlement_scope='sponsored_packets' and expires_at is null;
 else insert into public.partner_packet_entitlement(partner_id,entitlement_scope,packet_cap,contract_note) values(w.partner_record_id,'sponsored_packets',p_packets,p_reference);end if;
 update public.partner_onboarding set aggregate_version=aggregate_version+1 where id=w.id;
 update public.partner_onboarding_launch_checks set invalidated_at=now(),invalidated_reason='Documented allocation changed' where workspace_id=w.id;
 update public.partner_onboarding_launch_approvals set invalidated_at=now() where workspace_id=w.id;
 return true;
end $function$;

ALTER TABLE public.rcap_launch_capacity_events DROP CONSTRAINT rcap_capacity_document_pair,ALTER COLUMN document_id SET NOT NULL,ALTER COLUMN document_hash SET NOT NULL;

DO $restored$ BEGIN IF pg_temp.wwt_state(pg_temp.wwt_capture()) IS DISTINCT FROM pg_temp.wwt_state(current_setting('legalease.wwt.expected_restore')::jsonb) THEN RAISE EXCEPTION 'wwt_recovery_full_restore_preservation_failed';END IF;END $restored$;
SELECT jsonb_build_object('schemaVersion','wwt-two-migration-before-use-recovery-receipt/v1','step',1,'sourceCanonicalSha256','6fd142707a1fb3b41be0887af38ee2ea7ba0bce7b8400750fcb8e01b44cbfcb4','recoveryTransactionXid',pg_current_xact_id()::text,'originalNativeReceipt',current_setting('legalease.wwt.native_receipt')::jsonb,'restoredCatalogCompared',true,'noBusinessRowsDeleted',true) AS wwt_schema_recovery_receipt;
COMMIT;
