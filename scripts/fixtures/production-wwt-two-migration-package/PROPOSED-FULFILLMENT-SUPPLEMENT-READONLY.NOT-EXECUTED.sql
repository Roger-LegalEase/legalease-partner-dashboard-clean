-- NEW SUPPLEMENT; no 39 accepted function-body requery except an explicit new root dependency.
-- PROPOSAL ONLY: A executes once only after E review. No business rows or calls to program functions.
BEGIN READ ONLY;
SET LOCAL statement_timeout='30s';
SET LOCAL lock_timeout='1s';
WITH RECURSIVE
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
) AS ordinary_fulfillment_supplement;
COMMIT;
