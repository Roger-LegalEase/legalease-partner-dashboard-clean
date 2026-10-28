-- PROPOSED / NOT EXECUTED. Root+C fresh recovery authority required; NEVER automatic retry/inverse.
BEGIN;
SET LOCAL statement_timeout='30s'; SET LOCAL lock_timeout='1s'; SET LOCAL idle_in_transaction_session_timeout='30s';
LOCK TABLE public.clinic_packet_funding,public.ordinary_sponsored_packet_routes IN ACCESS EXCLUSIVE MODE NOWAIT;
LOCK TABLE public.packet_render_jobs IN SHARE MODE NOWAIT;
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
 IF receipt->>'schemaVersion'<>'wwt-two-migration-schema-native-receipt/v1' OR (receipt->>'step')::integer<>0 OR receipt->>'canonicalSha256'<>'ffbb587fec452fc360668e63936eccad773125b77821790e1f1ed2571045c738' OR receipt->'transactionLocalPreimageAndPreservationGuardPassed'<>'true'::jsonb THEN RAISE EXCEPTION 'wwt_recovery_native_receipt_missing';END IF;
 IF (receipt->>'catalogOwnerXid')!~'^[0-9]+$' OR (receipt->>'appliedTransactionStart')::timestamptz>clock_timestamp() OR (receipt->>'appliedTransactionStart')::timestamptz<=clock_timestamp()-interval '15 minutes' THEN RAISE EXCEPTION 'wwt_recovery_receipt_stale';END IF;
 apply_xid:=((receipt->>'catalogOwnerXid')::numeric%4294967296)::text::xid;
 PERFORM set_config('search_path',current_state->'core'->>'search_path',true);
 IF pg_temp.wwt_state(pg_temp.wwt_capture()) IS DISTINCT FROM pg_temp.wwt_state(current_state) THEN RAISE EXCEPTION 'wwt_recovery_postimage_cas_failed';END IF;
 IF (SELECT xmin FROM pg_class WHERE oid='public.ordinary_sponsored_packet_routes'::regclass) IS DISTINCT FROM apply_xid THEN RAISE EXCEPTION 'wwt_registry_apply_xid_changed';END IF;
 IF EXISTS(SELECT 1 FROM public.ordinary_sponsored_packet_routes) THEN RAISE EXCEPTION 'wwt_ordinary_registry_used_no_inverse';END IF;
 IF EXISTS(SELECT 1 FROM public.clinic_packet_funding WHERE acquisition_mode<>'clinic' OR event_id IS NULL OR age(xmin)<=age(apply_xid)) OR EXISTS(SELECT 1 FROM public.packet_render_jobs WHERE age(xmin)<=age(apply_xid)) THEN RAISE EXCEPTION 'wwt_funding_or_job_use_no_inverse';END IF;
 FOREACH signature IN ARRAY ARRAY['public.allocate_clinic_packet_funding(uuid,uuid,text)','public.consumer_render_job_verification_guard()','public.enqueue_verified_sponsored_packet_render(text,uuid,uuid,text,text,text,text,text,text,text,uuid,uuid,uuid,integer,uuid,text,jsonb,jsonb)','public.finalize_sponsored_packet_generation_for_route(text,uuid,uuid,text,jsonb,uuid)','public.sponsored_packet_render_authority(text,uuid,uuid,uuid)', 'public.sponsored_packet_route_for_source(text,uuid,uuid,uuid)'] LOOP
 IF (SELECT xmin FROM pg_proc WHERE oid=to_regprocedure(signature)) IS DISTINCT FROM apply_xid THEN RAISE EXCEPTION 'wwt_source_function_apply_xid_changed:%',signature;END IF;
 END LOOP;
END $recovery_guard$;

CREATE OR REPLACE FUNCTION public.allocate_clinic_packet_funding(p_briefcase_item_id uuid, p_consumer_auth_user_id uuid, p_expected_verification_hash text)
 RETURNS TABLE(funding_mode text, reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_item public.consumer_briefcase_items%rowtype;
  v_verification public.consumer_packet_verifications%rowtype;
  v_source public.consumer_pending_screening_results%rowtype;
  v_session public.screening_sessions%rowtype;
  v_case public.clinic_cases%rowtype;
  v_event public.clinic_events%rowtype;
  v_entitlement public.partner_entitlement%rowtype;
  v_choice public.clinic_packet_funding%rowtype;
  v_packet_entitlement public.partner_packet_entitlement%rowtype;
  v_packet_used bigint;
  v_route public.sponsored_packet_render_routes%rowtype;
  v_scope record;
  v_event_used bigint;
  v_partner_reserved bigint;
  v_mode text := 'sponsored';
  v_reason text := 'slot_reserved';
begin
  -- Match the canonical finalizer lock order. No client-selected sponsor/event.
  select * into v_item from public.consumer_briefcase_items
    where id=p_briefcase_item_id and user_id=p_consumer_auth_user_id for update;
  if not found then return query select 'denied'::text,'wrong_owner'::text; return; end if;
  select * into v_verification from public.consumer_packet_verifications
    where briefcase_item_id=v_item.id for update;
  if not found or v_verification.consumer_auth_user_id is distinct from v_item.user_id
     or v_verification.matter_id is distinct from public.consumer_matter_id_for_briefcase_item(v_item.id)
     or v_verification.status is distinct from 'verified'
     or v_verification.verification_hash is distinct from p_expected_verification_hash
     or p_expected_verification_hash is null then
    return query select 'denied'::text,'verification_mismatch'::text; return;
  end if;
  select * into v_source from public.consumer_pending_screening_results
    where pending_id=v_item.source_pending_result_id for update;
  if not found or v_source.product is distinct from 'rcap_partner'
     or v_source.claimed_user_id is distinct from v_item.user_id
     or v_source.claimed_matter_id is distinct from v_item.id or v_source.status is distinct from 'CLAIMED' then
    return query select 'denied'::text,'source_mismatch'::text; return;
  end if;
  select * into v_session from public.screening_sessions
    where session_id=v_source.anonymous_session_id for update;
  select * into v_case from public.clinic_cases
    where matter_id=v_item.id and participant_user_id=v_item.user_id
      and screening_session_id=v_source.anonymous_session_id and event_id=v_source.event_id for update;
  if not found then return query select 'denied'::text,'clinic_scope_mismatch'::text; return; end if;
  select * into v_event from public.clinic_events where id=v_case.event_id for update;
  select * into v_route from public.sponsored_packet_render_routes
    where route_key=(v_verification.verification_snapshot->>'jurisdiction')||':'||
      (v_verification.verification_snapshot->>'pathwayId') and active;
  if not found or (v_route.registry_track_id is not null and v_route.registry_track_id is distinct from
       v_verification.verification_snapshot->>'selectedTrackId') then
    return query select 'denied'::text,'route_mismatch'::text; return;
  end if;
  select * into v_scope from public.sponsored_packet_render_authority(
    v_route.route_key, v_source.anonymous_session_id, v_item.id, v_item.user_id);
  if not coalesce(v_scope.valid,false) then return query select 'denied'::text,v_scope.reason; return; end if;
  select * into v_choice from public.clinic_packet_funding where briefcase_item_id=v_item.id;
  if found then
    if v_choice.consumer_auth_user_id is distinct from v_item.user_id
       or v_choice.source_session_id is distinct from v_source.anonymous_session_id
       or v_choice.event_id is distinct from v_event.id or v_choice.partner_slug is distinct from v_event.partner_slug
       or v_choice.route_key is distinct from v_route.route_key or v_choice.packet_family_id is distinct from v_route.packet_family_id then
      return query select 'denied'::text,'funding_binding_mismatch'::text; return;
    end if;
    return query select v_choice.funding_mode,v_choice.reason; return;
  end if;
  -- Reuse delivered Applicant A and other already-consumed packets read-only.
  if exists(select 1 from public.consumer_packet_artifact_provenance p where p.briefcase_item_id=v_item.id
      and p.consumer_auth_user_id=v_item.user_id and p.entitlement_source='partner_sponsorship') then
    return query select 'sponsored'::text,'already_consumed'::text; return;
  end if;
  if v_session.claimed_slot_state is distinct from 'claimed' then
    return query select 'denied'::text,'sponsorship_inactive'::text; return;
  end if;
  -- Event and partner locks serialize all contenders, including different
  -- events sharing the final partner slot. Count reserved OR consumed once.
  select * into v_entitlement from public.partner_entitlement where partner_slug=v_event.partner_slug for update;
  if not found then return query select 'denied'::text,'no_entitlement'::text; return; end if;
  select count(*) into v_event_used from (
    select p.briefcase_item_id from public.consumer_packet_artifact_provenance p
      join public.clinic_cases c on c.matter_id=p.briefcase_item_id
      where c.event_id=v_event.id and p.entitlement_source='partner_sponsorship'
    union
    select f.briefcase_item_id from public.clinic_packet_funding f
      where f.event_id=v_event.id and f.funding_mode='sponsored'
  ) used;
  select count(*) into v_partner_reserved from public.clinic_packet_funding f
    where f.partner_slug=v_event.partner_slug and f.funding_mode='sponsored'
      and not exists(select 1 from public.consumer_packet_artifact_provenance p
        where p.briefcase_item_id=f.briefcase_item_id and p.entitlement_source='partner_sponsorship');
  select * into v_packet_entitlement from public.partner_packet_entitlement e
    where e.partner_id=v_scope.partner_id and e.effective_at<=now()
      and (e.expires_at is null or e.expires_at>now()) order by e.effective_at desc limit 1 for update;
  if not found then return query select 'denied'::text,'no_entitlement'::text; return; end if;
  select count(*) into v_packet_used from (
    select l.matter_id from public.packet_credit_ledger l where l.entitlement_id=v_packet_entitlement.id
      and l.event_type in ('consumed','overage_consumed')
    union
    select public.consumer_matter_id_for_briefcase_item(f.briefcase_item_id) from public.clinic_packet_funding f
      where f.packet_entitlement_id=v_packet_entitlement.id and f.funding_mode='sponsored'
  ) used;
  if v_event_used >= v_event.sponsorship_allocation then v_mode:='dtc'; v_reason:='event_cap_exhausted';
  elsif v_entitlement.screenings_used+v_partner_reserved >= v_entitlement.screenings_allowed
     or v_packet_used >= v_packet_entitlement.packet_cap then
    v_mode:='dtc'; v_reason:='partner_cap_exhausted';
  end if;
  insert into public.clinic_packet_funding(briefcase_item_id,consumer_auth_user_id,source_session_id,event_id,
    partner_slug,packet_entitlement_id,route_key,packet_family_id,initial_verification_hash,funding_mode,reason)
    values(v_item.id,v_item.user_id,v_source.anonymous_session_id,v_event.id,v_event.partner_slug,
      v_packet_entitlement.id,v_route.route_key,v_route.packet_family_id,p_expected_verification_hash,v_mode,v_reason);
  return query select v_mode,v_reason;
end;
$function$;

CREATE OR REPLACE FUNCTION public.consumer_render_job_verification_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_hash text;
begin
  if tg_op = 'UPDATE' and (
       (old.sponsored_route_key is not null and new.sponsored_route_key is distinct from old.sponsored_route_key)
    or (old.sponsored_session_id is not null and new.sponsored_session_id is distinct from old.sponsored_session_id)
    or (old.sponsored_clinic_event_id is not null and new.sponsored_clinic_event_id is distinct from old.sponsored_clinic_event_id)
    or (old.sponsored_consumer_briefcase_item_id is not null
        and new.sponsored_consumer_briefcase_item_id is distinct from old.sponsored_consumer_briefcase_item_id)
    or (old.sponsored_consumer_auth_user_id is not null
        and new.sponsored_consumer_auth_user_id is distinct from old.sponsored_consumer_auth_user_id)
    or (old.sponsored_verification_hash is not null
        and new.sponsored_verification_hash is distinct from old.sponsored_verification_hash)
  ) then
    raise exception 'sponsored render binding is immutable';
  end if;

  if new.sponsored_route_key is not null then
    if new.partner_id is null
       or new.sponsored_session_id is null
       or new.sponsored_clinic_event_id is null
       or new.sponsored_consumer_briefcase_item_id is null
       or new.sponsored_consumer_auth_user_id is null
       or new.sponsored_verification_hash is null then
      raise exception 'sponsored render job binding is incomplete';
    end if;
    if not exists (
      select 1 from public.sponsored_packet_render_routes r
      where r.route_key = new.sponsored_route_key and r.active
    ) then
      raise exception 'sponsored render route is not registered';
    end if;
    if new.status in ('artifact_validated', 'delivered') then
      select v.verification_hash into v_hash from public.consumer_packet_verifications v
        where v.briefcase_item_id = new.sponsored_consumer_briefcase_item_id
          and v.consumer_auth_user_id = new.sponsored_consumer_auth_user_id
          and v.status = 'verified';
      if v_hash is null or v_hash is distinct from new.sponsored_verification_hash then
        raise exception 'sponsored render job has stale verification authority';
      end if;
    end if;
    return new;
  end if;

  if new.partner_id is not null then return new; end if;
  if tg_op = 'UPDATE' and old.consumer_verification_hash is not null
     and new.consumer_verification_hash is distinct from old.consumer_verification_hash then
    raise exception 'consumer render verification binding is immutable';
  end if;
  if new.status in ('artifact_validated', 'delivered') then
    select v.verification_hash into v_hash from public.consumer_packet_verifications v
      where v.briefcase_item_id = new.consumer_briefcase_item_id
        and v.consumer_auth_user_id = new.consumer_auth_user_id
        and v.status = 'verified';
    if v_hash is null or v_hash is distinct from new.consumer_verification_hash then
      raise exception 'consumer render job has stale verification authority';
    end if;
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.enqueue_verified_sponsored_packet_render(p_route_key text, p_session_id uuid, p_packet_id uuid, p_route_id text, p_renderer_kind text, p_renderer_version text, p_source_sha256 text, p_profile_id text, p_profile_version text, p_input_hash text, p_briefcase_item_id uuid, p_person_id uuid, p_matter_id uuid, p_max_attempts integer, p_expected_consumer_auth_user_id uuid, p_expected_verification_hash text, p_render_packet jsonb, p_render_input_payload jsonb)
 RETURNS SETOF packet_render_jobs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_route public.sponsored_packet_render_routes%rowtype;
  v_authority record;
  v_hash text;
  v_job public.packet_render_jobs%rowtype;
  v_existing_payload jsonb;
begin
  select * into v_route from public.sponsored_packet_render_routes r
   where r.route_key = p_route_key and r.active;
  if not found then
    raise exception 'sponsored render route is not registered';
  end if;

  -- The render input is the participant's document. Every identity inside it
  -- must equal the registration and the caller's claimed binding, or nothing
  -- is created.
  if p_render_packet ->> 'id' is distinct from p_packet_id::text
     or p_render_packet ->> 'user_id' is distinct from p_expected_consumer_auth_user_id::text
     or p_render_packet ->> 'briefcase_id' is distinct from p_briefcase_item_id::text
     or p_render_packet ->> 'person_id' is distinct from p_person_id::text
     or p_render_input_payload ->> 'authUserId' is distinct from p_expected_consumer_auth_user_id::text
     or p_render_input_payload ->> 'briefcaseItemId' is distinct from p_briefcase_item_id::text
     or p_render_input_payload ->> 'matterId' is distinct from p_matter_id::text
     or p_render_input_payload ->> 'verificationHash' is distinct from p_expected_verification_hash
     or p_render_input_payload ->> 'inputHash' is distinct from p_input_hash then
    raise exception 'sponsored render payload binding mismatch';
  end if;
  if trim(coalesce(p_route_id, '')) is distinct from v_route.route_key
     or p_render_input_payload ->> 'routeId' is distinct from v_route.route_key
     or p_render_input_payload ->> 'packetFamilyId' is distinct from v_route.packet_family_id
     or p_render_input_payload ->> 'specificationId' is distinct from v_route.packet_specification_id
     or p_render_input_payload ->> 'specificationVersion' is distinct from v_route.packet_specification_version
     or p_render_input_payload ->> 'specificationSha256' is distinct from v_route.packet_specification_sha256
     or (v_route.registry_track_id is not null
         and p_render_input_payload ->> 'trackId' is distinct from v_route.registry_track_id)
     or p_render_input_payload -> 'snapshot' ->> 'jurisdiction' is distinct from v_route.jurisdiction
     or p_render_input_payload -> 'snapshot' ->> 'pathwayId' is distinct from v_route.pathway_id
     or (v_route.registry_track_id is not null
         and p_render_input_payload -> 'snapshot' ->> 'selectedTrackId' is distinct from v_route.registry_track_id) then
    raise exception 'sponsored render route binding mismatch';
  end if;

  select v.verification_hash into v_hash from public.consumer_packet_verifications v
    where v.briefcase_item_id = p_briefcase_item_id
      and v.consumer_auth_user_id = p_expected_consumer_auth_user_id
      and v.status = 'verified' for update;
  if v_hash is null or v_hash is distinct from p_expected_verification_hash then
    raise exception 'sponsored render verification changed';
  end if;

  select * into v_authority from public.sponsored_packet_render_authority(
    p_route_key, p_session_id, p_briefcase_item_id, p_expected_consumer_auth_user_id
  );
  if not coalesce(v_authority.valid, false) then
    raise exception 'sponsored render authority missing: %', coalesce(v_authority.reason, 'unknown');
  end if;
  if p_matter_id is distinct from public.consumer_matter_id_for_briefcase_item(p_briefcase_item_id) then
    raise exception 'sponsored render matter binding mismatch';
  end if;

  if not exists(select 1 from public.allocate_clinic_packet_funding(
    p_briefcase_item_id,p_expected_consumer_auth_user_id,p_expected_verification_hash) f where f.funding_mode='sponsored') then
    raise exception 'sponsor_capacity_requires_dtc';
  end if;

  insert into public.rcap_document_packets (
    id, partner_slug, user_id, briefcase_id, person_id, state, jurisdiction,
    document_type, pathway, status, petitioner_first_name, petitioner_last_name,
    petitioner_city, petitioner_county, court_county, court_name, cause_number,
    charge, offense_date, arrest_date, arresting_agency, agency_case_number,
    disposition_date, conviction_date, sentence_completion_date,
    needs_record_review, generated_plain_text, filing_instructions,
    county_court_instructions, missing_fields, safety_disclaimer
  ) values (
    p_packet_id, 'expungement-ai-consumer', p_expected_consumer_auth_user_id,
    p_briefcase_item_id, p_person_id,
    p_render_packet ->> 'state', p_render_packet ->> 'jurisdiction',
    p_render_packet ->> 'document_type', p_render_packet ->> 'pathway',
    coalesce(p_render_packet ->> 'status', 'ready_for_review'),
    p_render_packet ->> 'petitioner_first_name', p_render_packet ->> 'petitioner_last_name',
    p_render_packet ->> 'petitioner_city', p_render_packet ->> 'petitioner_county',
    p_render_packet ->> 'court_county', p_render_packet ->> 'court_name',
    p_render_packet ->> 'cause_number', p_render_packet ->> 'charge',
    p_render_packet ->> 'offense_date', p_render_packet ->> 'arrest_date',
    p_render_packet ->> 'arresting_agency', p_render_packet ->> 'agency_case_number',
    p_render_packet ->> 'disposition_date', p_render_packet ->> 'conviction_date',
    p_render_packet ->> 'sentence_completion_date',
    coalesce((p_render_packet ->> 'needs_record_review')::boolean, true),
    p_render_packet ->> 'generated_plain_text',
    array(select jsonb_array_elements_text(coalesce(p_render_packet -> 'filing_instructions', '[]'::jsonb))),
    array(select jsonb_array_elements_text(coalesce(p_render_packet -> 'county_court_instructions', '[]'::jsonb))),
    array(select jsonb_array_elements_text(coalesce(p_render_packet -> 'missing_fields', '[]'::jsonb))),
    p_render_packet ->> 'safety_disclaimer'
  ) on conflict (id) do nothing;

  select i.input_payload into v_existing_payload from public.rcap_document_packet_inputs i
    where i.document_packet_id = p_packet_id and i.partner_slug = 'expungement-ai-consumer' for update;
  if found and v_existing_payload is distinct from p_render_input_payload then
    raise exception 'sponsored render input payload is immutable';
  end if;
  if not found then
    insert into public.rcap_document_packet_inputs(document_packet_id, partner_slug, input_payload)
      values (p_packet_id, 'expungement-ai-consumer', p_render_input_payload);
  end if;

  select * into v_job from public.enqueue_packet_render_job(
    p_packet_id, p_route_id, p_renderer_kind, p_renderer_version,
    p_source_sha256, p_profile_id, p_profile_version, p_input_hash,
    p_briefcase_item_id, v_authority.partner_id, p_person_id, p_matter_id,
    p_max_attempts, null, null
  );
  if v_job.id is null then raise exception 'sponsored render enqueue failed'; end if;

  update public.packet_render_jobs j set
    sponsored_route_key = v_route.route_key,
    sponsored_session_id = p_session_id,
    sponsored_clinic_event_id = v_authority.clinic_event_id,
    sponsored_consumer_briefcase_item_id = p_briefcase_item_id,
    sponsored_consumer_auth_user_id = p_expected_consumer_auth_user_id,
    sponsored_verification_hash = p_expected_verification_hash
  where j.id = v_job.id and j.sponsored_route_key is null;

  select * into v_job from public.packet_render_jobs j where j.id = v_job.id;
  if v_job.sponsored_route_key is distinct from v_route.route_key
     or v_job.sponsored_consumer_briefcase_item_id is distinct from p_briefcase_item_id
     or v_job.sponsored_consumer_auth_user_id is distinct from p_expected_consumer_auth_user_id
     or v_job.sponsored_verification_hash is distinct from p_expected_verification_hash
     or v_job.sponsored_session_id is distinct from p_session_id then
    raise exception 'sponsored render job is bound to a different participant or route';
  end if;
  return next v_job;
end;
$function$;

CREATE OR REPLACE FUNCTION public.finalize_sponsored_packet_generation_for_route(p_route_key text, p_session_id uuid, p_briefcase_item_id uuid, p_expected_verification_hash text, p_packet_artifact jsonb, p_render_job_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(ok boolean, recorded boolean, counted_as text, reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_route public.sponsored_packet_render_routes%rowtype;
  v_item public.consumer_briefcase_items%rowtype;
  v_verification public.consumer_packet_verifications%rowtype;
  v_source public.consumer_pending_screening_results%rowtype;
  v_session public.screening_sessions%rowtype;
  v_case public.clinic_cases%rowtype;
  v_event public.clinic_events%rowtype;
  v_entitlement public.partner_entitlement%rowtype;
  v_provenance public.consumer_packet_artifact_provenance%rowtype;
  v_job public.packet_render_jobs%rowtype;
  v_matter_id uuid;
  v_event_artifact_count integer;
  v_counted_as text;
begin
  -- Refuse malformed caller values before taking a lock or changing a row.
  if p_route_key is null
     or p_session_id is null
     or p_briefcase_item_id is null
     or p_expected_verification_hash !~ '^[a-f0-9]{64}$'
     or jsonb_typeof(p_packet_artifact) is distinct from 'object' then
    return query select false, false, 'not_counted'::text, 'invalid_input'::text;
    return;
  end if;

  select * into v_route from public.sponsored_packet_render_routes r
   where r.route_key = p_route_key and r.active;
  if not found then
    return query select false, false, 'not_counted'::text, 'route_not_registered'::text;
    return;
  end if;

  -- The canonical matter is the first lock. The function never accepts an
  -- owner, matter, route, partner, event, or entitlement from its caller.
  select * into v_item
  from public.consumer_briefcase_items i
  where i.id = p_briefcase_item_id
  for update;
  if not found then
    return query select false, false, 'not_counted'::text, 'wrong_item'::text;
    return;
  end if;
  v_matter_id := public.consumer_matter_id_for_briefcase_item(v_item.id);

  -- Lock the protected verification row immediately after the matter. Display
  -- JSON and packet_status are intentionally not verification authority.
  select * into v_verification
  from public.consumer_packet_verifications v
  where v.briefcase_item_id = v_item.id
  for update;
  if not found
     or v_verification.status <> 'verified'
     or v_verification.verification_hash is distinct from p_expected_verification_hash then
    return query select false, false, 'not_counted'::text, 'verification_mismatch'::text;
    return;
  end if;
  if v_verification.consumer_auth_user_id is distinct from v_item.user_id then
    return query select false, false, 'not_counted'::text, 'wrong_owner'::text;
    return;
  end if;
  if v_verification.matter_id is distinct from v_matter_id then
    return query select false, false, 'not_counted'::text, 'wrong_matter'::text;
    return;
  end if;
  if v_item.jurisdiction <> v_route.jurisdiction
     or v_verification.verification_snapshot ->> 'jurisdiction' <> v_route.jurisdiction
     or v_verification.verification_snapshot ->> 'pathwayId' <> v_route.pathway_id
     or (v_route.registry_track_id is not null
         and v_verification.verification_snapshot ->> 'selectedTrackId' is distinct from v_route.registry_track_id) then
    return query select false, false, 'not_counted'::text, 'wrong_jurisdiction_or_route'::text;
    return;
  end if;

  -- Reconstruct the same protected claimed source used by the server-side
  -- presentation authority. It binds owner, item, anonymous source session,
  -- partner product, and Clinic event without trusting request JSON.
  select * into v_source
  from public.consumer_pending_screening_results p
  where p.pending_id = v_item.source_pending_result_id
  for update;
  if not found or v_source.status <> 'CLAIMED'
     or v_source.claimed_matter_id is distinct from v_item.id then
    return query select false, false, 'not_counted'::text, 'wrong_item'::text;
    return;
  end if;
  if v_source.claimed_user_id is distinct from v_item.user_id then
    return query select false, false, 'not_counted'::text, 'wrong_owner'::text;
    return;
  end if;
  if v_source.anonymous_session_id is distinct from p_session_id then
    return query select false, false, 'not_counted'::text, 'wrong_session'::text;
    return;
  end if;
  if v_source.product <> 'rcap_partner'
     or v_source.partner_slug is distinct from v_route.partner_slug then
    return query select false, false, 'not_counted'::text, 'wrong_partner'::text;
    return;
  end if;
  if v_source.jurisdiction <> v_route.jurisdiction then
    return query select false, false, 'not_counted'::text, 'wrong_jurisdiction_or_route'::text;
    return;
  end if;

  select * into v_session
  from public.screening_sessions s
  where s.session_id = p_session_id
  for update;
  if not found
     or v_session.flow_mode <> 'rcap'
     or v_session.partner_benefit_active is not true then
    return query select false, false, 'not_counted'::text, 'sponsorship_inactive'::text;
    return;
  end if;
  if v_session.partner_slug is distinct from v_source.partner_slug then
    return query select false, false, 'not_counted'::text, 'wrong_partner'::text;
    return;
  end if;
  if v_session.jurisdiction <> v_route.jurisdiction then
    return query select false, false, 'not_counted'::text, 'wrong_jurisdiction_or_route'::text;
    return;
  end if;

  select c.* into v_case
  from public.clinic_cases c
  where c.event_id = v_source.event_id
    and c.participant_user_id = v_item.user_id
    and c.screening_session_id = p_session_id
    and c.matter_id = v_item.id
  for update;
  if not found then
    return query select false, false, 'not_counted'::text, 'clinic_scope_mismatch'::text;
    return;
  end if;
  if v_case.jurisdiction <> v_route.jurisdiction or v_case.route_disposition <> 'packet' then
    return query select false, false, 'not_counted'::text, 'wrong_jurisdiction_or_route'::text;
    return;
  end if;

  select * into v_event
  from public.clinic_events e
  where e.id = v_case.event_id
  for update;
  if not found
     or v_event.partner_slug is distinct from v_route.partner_slug
     or v_event.program_key is distinct from v_route.program_key
     or (v_route.clinic_event_name is not null and v_event.name is distinct from v_route.clinic_event_name) then
    return query select false, false, 'not_counted'::text, 'clinic_scope_mismatch'::text;
    return;
  end if;
  if v_event.jurisdiction is distinct from v_route.jurisdiction then
    return query select false, false, 'not_counted'::text, 'wrong_jurisdiction_or_route'::text;
    return;
  end if;
  if v_event.status <> 'published'
     or v_event.sponsorship_allocation is null
     or v_event.sponsorship_allocation <= 0 then
    return query select false, false, 'not_counted'::text, 'sponsorship_inactive'::text;
    return;
  end if;

  -- A participant-deliverable artifact is a Grade-A PDF bound to this exact
  -- item, verification, specification, family, and immutable byte hash.
  if p_packet_artifact ->> 'provider' <> v_route.artifact_provider
     or p_packet_artifact ->> 'source' <> v_route.artifact_source
     or p_packet_artifact ->> 'contentType' <> v_route.artifact_content_type
     or p_packet_artifact ->> 'packetId' <> v_item.id::text
     or p_packet_artifact ->> 'verificationHash' <> p_expected_verification_hash
     or p_packet_artifact ->> 'packetSpecificationId' <> v_route.packet_specification_id
     or p_packet_artifact ->> 'packetSpecificationVersion' <> v_route.packet_specification_version
     or p_packet_artifact ->> 'packetSpecificationSha256' <> v_route.packet_specification_sha256
     or p_packet_artifact ->> 'packetFamily' <> v_route.packet_family_id
     or p_packet_artifact ->> 'artifactSha256' !~ '^[a-f0-9]{64}$'
     or coalesce((p_packet_artifact ->> 'pageCount') ~ '^[1-9][0-9]*$', false) is not true
     or coalesce((p_packet_artifact ->> 'documentCount') ~ '^[1-9][0-9]*$', false) is not true then
    return query select false, false, 'not_counted'::text, 'malformed_artifact'::text;
    return;
  end if;

  -- An optional render job. When the caller names one it must be this
  -- participant's own sponsored job for this exact route, session and
  -- verification, and it must already hold validated, deliverable bytes.
  if p_render_job_id is not null then
    select * into v_job
    from public.packet_render_jobs j
    where j.id = p_render_job_id
    for update;
    if not found
       or v_job.sponsored_route_key is distinct from v_route.route_key
       or v_job.sponsored_session_id is distinct from p_session_id
       or v_job.sponsored_consumer_briefcase_item_id is distinct from v_item.id
       or v_job.sponsored_consumer_auth_user_id is distinct from v_item.user_id
       or v_job.sponsored_verification_hash is distinct from p_expected_verification_hash
       or v_job.matter_id is distinct from v_matter_id
       or v_job.status not in ('artifact_validated', 'delivered')
       or v_job.delivery_eligibility <> 'eligible'
       or coalesce(v_job.output_sha256, '') <> (p_packet_artifact ->> 'artifactSha256') then
      return query select false, false, 'not_counted'::text, 'render_job_mismatch'::text;
      return;
    end if;
  end if;

  -- Lock existing provenance before reading the allowance. An exact retry is
  -- successful and never approaches the credit counter. A changed verification
  -- may publish another validated job for the same matter without recounting.
  select * into v_provenance
  from public.consumer_packet_artifact_provenance p
  where p.briefcase_item_id = v_item.id
  for update;
  if found then
    if v_provenance.consumer_auth_user_id = v_item.user_id
       and v_provenance.matter_id = v_matter_id
       and v_provenance.verification_hash = p_expected_verification_hash
       and v_provenance.entitlement_source = 'partner_sponsorship'
       and v_provenance.render_job_id is not distinct from p_render_job_id
       and v_provenance.artifact = p_packet_artifact then
      select a.metadata ->> 'counted_as' into v_counted_as
      from public.rcap_screening_analytics_events a
      where a.session_id = p_session_id and a.partner_slug = v_route.partner_slug
        and a.event_type = 'packet_generated'
      order by a.occurred_at asc, a.id asc
      limit 1;
      return query select true, false, coalesce(v_counted_as, 'not_counted'), 'already_finalized'::text;
      return;
    end if;
    -- A new protected verification can replace the current artifact for the
    -- same sponsored matter. Every claim/event/route/job check above still ran.
    -- Existing allowance evidence is reused; no counter or analytics event is
    -- written on this path. Same-verification byte changes remain conflicts.
    if p_render_job_id is not null and v_provenance.render_job_id is not null
       and v_provenance.consumer_auth_user_id = v_item.user_id
       and v_provenance.matter_id = v_matter_id
       and v_provenance.entitlement_source = 'partner_sponsorship'
       and v_provenance.verification_hash is distinct from p_expected_verification_hash
       and exists (
         select 1 from public.packet_render_jobs previous
         where previous.id = v_provenance.render_job_id
           and previous.sponsored_route_key = p_route_key
           and previous.sponsored_session_id = p_session_id
           and previous.sponsored_clinic_event_id = v_event.id
           and previous.partner_id = v_job.partner_id
       ) then
      select a.metadata ->> 'counted_as' into v_counted_as
      from public.rcap_screening_analytics_events a
      where a.session_id = p_session_id and a.partner_slug = v_route.partner_slug
        and a.event_type = 'packet_generated'
        and a.metadata ->> 'clinic_event_id' = v_event.id::text
      order by a.occurred_at asc, a.id asc limit 1;
      if v_counted_as not in ('included', 'overage') or v_counted_as is null
         or v_session.claimed_slot_state is distinct from 'consumed' then
        return query select false, false, 'not_counted'::text, 'prior_consumption_missing'::text;
        return;
      end if;
      update public.consumer_packet_artifact_provenance
      set render_job_id = p_render_job_id,
          verification_hash = p_expected_verification_hash,
          artifact = p_packet_artifact
      where briefcase_item_id = v_item.id;
      update public.consumer_briefcase_items
      set artifact_refs_json = (p_packet_artifact - 'attribution') || case
            when v_item.artifact_refs_json ? 'attribution'
              then jsonb_build_object('attribution', v_item.artifact_refs_json -> 'attribution')
            else '{}'::jsonb
          end,
          packet_status = 'ready', updated_at = now()
      where id = v_item.id and user_id = v_item.user_id;
      update public.clinic_cases
      set queue_status = 'packet_ready', last_activity_at = now(), updated_at = now()
      where id = v_case.id;
      return query select true, false, v_counted_as, 'regenerated'::text;
      return;
    end if;
    return query select false, false, 'not_counted'::text, 'artifact_conflict'::text;
    return;
  end if;
  if v_session.claimed_slot_state is distinct from 'claimed' then
    return query select false, false, 'not_counted'::text, 'sponsorship_already_consumed'::text;
    return;
  end if;

  if not exists(select 1 from public.allocate_clinic_packet_funding(
    v_item.id,v_item.user_id,p_expected_verification_hash) f where f.funding_mode='sponsored') then
    return query select false,false,'capped'::text,'sponsor_capacity_requires_dtc'::text; return;
  end if;

  -- The event allocation is a second, narrower cap around the partner usage
  -- window. Count only protected sponsored provenance for matters in this
  -- exact event; a repeat was returned above and therefore cannot recount.
  select count(*)::integer into v_event_artifact_count
  from public.consumer_packet_artifact_provenance p
  join public.clinic_cases c on c.matter_id = p.briefcase_item_id
  where c.event_id = v_event.id
    and p.entitlement_source = 'partner_sponsorship';
  if v_event_artifact_count >= v_event.sponsorship_allocation then
    return query select false, false, 'capped'::text, 'event_sponsorship_exhausted'::text;
    return;
  end if;

  select * into v_entitlement
  from public.partner_entitlement pe
  where pe.partner_slug = v_event.partner_slug
  for update;
  if not found then
    return query select false, false, 'not_counted'::text, 'no_entitlement'::text;
    return;
  end if;
  if v_entitlement.screenings_used < v_entitlement.screenings_allowed then
    v_counted_as := 'included';
  elsif v_entitlement.pause_at_cap then
    return query select false, false, 'capped'::text, 'paused_at_cap'::text;
    return;
  elsif v_entitlement.overage_enabled then
    v_counted_as := 'overage';
  else
    return query select false, false, 'not_counted'::text, 'cap_reached_no_overage'::text;
    return;
  end if;

  -- All refusal branches are above this line. Any unexpected failure below is
  -- raised so PostgreSQL rolls back the complete transaction rather than
  -- returning a partially-mutated refusal.
  if v_counted_as = 'included' then
    update public.partner_entitlement pe
    set screenings_used = pe.screenings_used + 1, updated_at = now()
    where pe.partner_slug = v_entitlement.partner_slug;
  else
    update public.partner_entitlement pe
    set overage_packets = pe.overage_packets + 1,
        overage_amount_cents = pe.overage_amount_cents + pe.overage_packet_price_cents,
        updated_at = now()
    where pe.partner_slug = v_entitlement.partner_slug;
  end if;

  update public.screening_sessions s
  set claimed_slot_state = 'consumed', status = 'completed', updated_at = now()
  where s.session_id = p_session_id and s.claimed_slot_state = 'claimed';
  if not found then raise exception 'sponsored finalization lost its locked session'; end if;

  insert into public.rcap_record_events
    (record_type, record_id, partner_slug, event_type, occurred_at, actor, metadata)
  values
    ('partner_entitlement', v_event.partner_slug, v_event.partner_slug,
     case when v_counted_as = 'overage'
       then 'partner_packet_overage_recorded' else 'partner_packet_credit_consumed' end,
     now(), 'system', jsonb_build_object(
       'session_id', p_session_id,
       'briefcase_item_id', v_item.id,
       'counted_as', v_counted_as,
       'clinic_event_id', v_event.id
     ));

  insert into public.rcap_screening_analytics_events
    (session_id, partner_slug, partner_access_code_id, campaign_name,
     event_type, packet_route_available, occurred_at, metadata)
  values
    (v_session.session_id, v_session.partner_slug,
     v_session.partner_access_code_id, v_session.campaign_name,
     'packet_generated', true, now(),
     jsonb_build_object('counted_as', v_counted_as, 'clinic_event_id', v_event.id));
  if v_counted_as = 'overage' then
    insert into public.rcap_screening_analytics_events
      (session_id, partner_slug, partner_access_code_id, campaign_name,
       event_type, packet_route_available, occurred_at, metadata)
    values
      (v_session.session_id, v_session.partner_slug,
       v_session.partner_access_code_id, v_session.campaign_name,
       'packet_overage_recorded', true, now(),
       jsonb_build_object(
         'overage_packet_price_cents', v_entitlement.overage_packet_price_cents,
         'clinic_event_id', v_event.id
       ));
  end if;

  insert into public.consumer_packet_artifact_provenance(
    briefcase_item_id, consumer_auth_user_id, matter_id, render_job_id,
    verification_hash, entitlement_source, artifact
  ) values (
    v_item.id, v_item.user_id, v_matter_id, p_render_job_id,
    p_expected_verification_hash, 'partner_sponsorship', p_packet_artifact
  );

  update public.consumer_briefcase_items i
  set artifact_refs_json = coalesce(i.artifact_refs_json, '{}'::jsonb) || p_packet_artifact,
      packet_status = 'ready', updated_at = now()
  where i.id = v_item.id and i.user_id = v_item.user_id;
  if not found then raise exception 'sponsored finalization lost its locked matter'; end if;

  update public.clinic_cases c
  set queue_status = 'packet_ready', last_activity_at = now(), updated_at = now()
  where c.id = v_case.id;

  return query select true, true, v_counted_as, null::text;
end;
$function$;

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

DROP FUNCTION public.sponsored_packet_route_for_source(text,uuid,uuid,uuid) RESTRICT;
ALTER TABLE public.clinic_packet_funding DROP CONSTRAINT sponsored_funding_acquisition_scope,ALTER COLUMN event_id SET NOT NULL,DROP COLUMN acquisition_mode RESTRICT;
DROP TABLE public.ordinary_sponsored_packet_routes RESTRICT;

DO $restored$ BEGIN IF pg_temp.wwt_state(pg_temp.wwt_capture()) IS DISTINCT FROM pg_temp.wwt_state(current_setting('legalease.wwt.expected_restore')::jsonb) THEN RAISE EXCEPTION 'wwt_recovery_full_restore_preservation_failed';END IF;END $restored$;
SELECT jsonb_build_object('schemaVersion','wwt-two-migration-before-use-recovery-receipt/v1','step',0,'sourceCanonicalSha256','ffbb587fec452fc360668e63936eccad773125b77821790e1f1ed2571045c738','recoveryTransactionXid',pg_current_xact_id()::text,'originalNativeReceipt',current_setting('legalease.wwt.native_receipt')::jsonb,'restoredCatalogCompared',true,'noBusinessRowsDeleted',true) AS wwt_schema_recovery_receipt;
COMMIT;
