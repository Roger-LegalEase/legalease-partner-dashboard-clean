-- PROPOSAL ONLY: A executes once only after E review. No business rows or calls to program functions.
BEGIN READ ONLY;
SET LOCAL statement_timeout='30s';
SET LOCAL lock_timeout='1s';
WITH RECURSIVE
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
) AS ordinary_full_chain_catalog;
COMMIT;
