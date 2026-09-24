import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
export const REPAIR_PATH = 'supabase/migrations/20260924111541_packet_render_retry_and_phase50_reconciliation.sql';
export const CORRECTION_PATH = 'supabase/migrations/20260924120347_packet_delivery_dependency_and_retry_errors.sql';
export const CONTRACT_PATH = 'data/rcap-grade-a/launch-control/PACKET_DATABASE_CONTRACT.json';
export const digest = s => crypto.createHash('sha256').update(s).digest('hex');
// Exact catalog values and effective privileges, not object existence markers.
export const packetCatalogQuery = () => `set search_path = public, pg_catalog;
    with relations as (select * from pg_class where relnamespace = 'public'::regnamespace and relname in ('packet_render_jobs','partner_packet_entitlement','packet_credit_ledger','packet_delivery_events','consumer_briefcase_items','consumer_packet_payment_consumption','consumer_packet_verifications','consumer_packet_artifact_provenance','consumer_artifact_download_grants','sponsored_packet_render_routes')),
    functions as (select * from pg_proc where pronamespace = 'public'::regnamespace and proname in ('rcap_packet_mutation_authority','set_partner_packet_entitlement_updated_at','guard_packet_render_job_insert','guard_packet_render_job_transition','guard_packet_render_job_delete','guard_packet_credit_ledger','guard_packet_delivery_events','assert_packet_render_job_fencing','enqueue_packet_render_job','claim_packet_render_job','start_packet_render','start_packet_validation','fail_packet_render_job','release_expired_packet_render_claims','requeue_retryable_packet_render_jobs','requeue_packet_render_job_manual','finalize_packet_render_job','record_packet_delivery_event','packet_entitlement_balance','consume_rcap_packet_credit','packet_render_jobs_guard_transition','guard_packet_render_job_retry_history','consumer_render_job_verification_guard','get_consumer_packet_verification_authority','persist_consumer_packet_verification','consumer_packet_artifact_provenance_immutable','publish_validated_consumer_render_artifact','get_consumer_packet_artifact_authority','authorize_consumer_artifact_download','issue_consumer_artifact_download_grant','revoke_consumer_artifact_download_grant','sponsored_packet_render_authority','enqueue_verified_sponsored_packet_render','finalize_sponsored_packet_generation_for_route','finalize_sponsored_packet_generation_if_verified','consumer_packet_payment_authority','record_consumer_packet_payment','replace_consumer_checkout_session','bind_consumer_checkout_verification','enqueue_verified_consumer_packet_render','consumer_matter_id_for_briefcase_item','expungement_packet_product_id','packet_render_jobs_paid_matter_guard','packet_render_jobs_consumer_binding_immutable','consumer_payment_consumption_binding_guard','rcap_participant_erasure_authority')),
    entries as (
      select 'table:' || c.relname as key, jsonb_build_object('owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity,
        'privileges',(select jsonb_object_agg(r, (select jsonb_object_agg(priv,has_table_privilege(r,c.oid,priv))
          from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) priv)) from unnest(array['anon','authenticated','service_role','rcap_render_worker','rcap_packet_delivery']) r),
        'publicAcl',(select coalesce(jsonb_agg(privilege_type order by privilege_type),'[]') from aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) where grantee=0)) as value
      from relations c
      union all select 'column:'||c.relname||'.'||a.attname, jsonb_build_object('type',format_type(a.atttypid,a.atttypmod),
        'notNull',a.attnotnull,'identity',a.attidentity,'generated',a.attgenerated,'default',pg_get_expr(d.adbin,d.adrelid),
        'privileges',(select jsonb_object_agg(r, (select jsonb_object_agg(priv,has_column_privilege(r,c.oid,a.attnum,priv))
          from unnest(array['SELECT','INSERT','UPDATE','REFERENCES']) priv)) from unnest(array['anon','authenticated','service_role','rcap_render_worker','rcap_packet_delivery']) r))
      from relations c join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped
      left join pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum
      union all select 'constraint:'||c.relname||'.'||x.conname, jsonb_build_object('definition',pg_get_constraintdef(x.oid),'validated',x.convalidated,'deferrable',x.condeferrable)
      from relations c join pg_constraint x on x.conrelid=c.oid
      union all select 'index:'||c.relname||'.'||i.relname, jsonb_build_object('definition',pg_get_indexdef(i.oid),'valid',x.indisvalid,'ready',x.indisready)
      from relations c join pg_index x on x.indrelid=c.oid join pg_class i on i.oid=x.indexrelid
      union all select 'trigger:'||c.relname||'.'||t.tgname, jsonb_build_object('definition',pg_get_triggerdef(t.oid),'enabled',t.tgenabled)
      from relations c join pg_trigger t on t.tgrelid=c.oid and not t.tgisinternal
      union all select 'policies:'||c.relname, coalesce((select jsonb_agg(jsonb_build_object('name',p.polname,'permissive',p.polpermissive,'command',p.polcmd,
        'roles',(select jsonb_agg(case when r=0 then 'PUBLIC' else pg_get_userbyid(r) end order by r) from unnest(p.polroles) r),
        'using',pg_get_expr(p.polqual,p.polrelid),'check',pg_get_expr(p.polwithcheck,p.polrelid)) order by p.polname)
        from pg_policy p where p.polrelid=c.oid),'[]') from relations c
      union all select 'functions:'||name, coalesce((select jsonb_object_agg(p.oid::regprocedure::text,
        jsonb_build_object('owner',pg_get_userbyid(p.proowner),'definition',pg_get_functiondef(p.oid),'securityDefiner',p.prosecdef,'config',p.proconfig,
        'grantOptions',(select jsonb_object_agg(r,has_function_privilege(r,p.oid,'EXECUTE WITH GRANT OPTION')) from unnest(array['anon','authenticated','service_role','rcap_render_worker','rcap_packet_delivery']) r),
        'execute',(select jsonb_object_agg(r,has_function_privilege(r,p.oid,'EXECUTE')) from unnest(array['anon','authenticated','service_role','rcap_render_worker','rcap_packet_delivery']) r),
        'publicExecute',exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) where grantee=0 and privilege_type='EXECUTE')))
        from functions p where p.proname=name),'{}') from unnest(array['rcap_packet_mutation_authority','set_partner_packet_entitlement_updated_at','guard_packet_render_job_insert','guard_packet_render_job_transition','guard_packet_render_job_delete','guard_packet_credit_ledger','guard_packet_delivery_events','assert_packet_render_job_fencing','enqueue_packet_render_job','claim_packet_render_job','start_packet_render','start_packet_validation','fail_packet_render_job','release_expired_packet_render_claims','requeue_retryable_packet_render_jobs','requeue_packet_render_job_manual','finalize_packet_render_job','record_packet_delivery_event','packet_entitlement_balance','consume_rcap_packet_credit','packet_render_jobs_guard_transition','guard_packet_render_job_retry_history','consumer_render_job_verification_guard','get_consumer_packet_verification_authority','persist_consumer_packet_verification','consumer_packet_artifact_provenance_immutable','publish_validated_consumer_render_artifact','get_consumer_packet_artifact_authority','authorize_consumer_artifact_download','issue_consumer_artifact_download_grant','revoke_consumer_artifact_download_grant','sponsored_packet_render_authority','enqueue_verified_sponsored_packet_render','finalize_sponsored_packet_generation_for_route','finalize_sponsored_packet_generation_if_verified','consumer_packet_payment_authority','record_consumer_packet_payment','replace_consumer_checkout_session','bind_consumer_checkout_verification','enqueue_verified_consumer_packet_render','consumer_matter_id_for_briefcase_item','expungement_packet_product_id','packet_render_jobs_paid_matter_guard','packet_render_jobs_consumer_binding_immutable','consumer_payment_consumption_binding_guard','rcap_participant_erasure_authority']) name
      union all select 'browserMutationRpcs', coalesce((select jsonb_agg(p.oid::regprocedure::text order by p.oid::regprocedure::text)
        from pg_proc p where p.pronamespace='public'::regnamespace and p.prosecdef
        and (has_function_privilege('anon',p.oid,'EXECUTE') or has_function_privilege('authenticated',p.oid,'EXECUTE'))
        and (p.prosrc ~* '(insert[[:space:]]+into|update|delete[[:space:]]+from)[[:space:]]+(public[.])?(packet_render_jobs|packet_credit_ledger|packet_delivery_events|partner_packet_entitlement|rcap_packet_credit_consumptions|rcap_partner_packet_allocation)([[:space:]]|[(])'
          or p.prosrc ~* '(claim_packet_render_job|start_packet_render|start_packet_validation|fail_packet_render_job|finalize_packet_render_job|release_expired_packet_render_claims|requeue_retryable_packet_render_jobs)[[:space:]]*[(]')), '[]')
      union all select 'absent:phase49_accounting', jsonb_build_object(
        'rcap_packet_credit_consumptions',to_regclass('public.rcap_packet_credit_consumptions') is null,
        'rcap_partner_packet_allocation',to_regclass('public.rcap_partner_packet_allocation') is null,
        'packet_render_jobs_guard_transition',not exists(select 1 from pg_trigger where tgrelid='public.packet_render_jobs'::regclass and tgname='packet_render_jobs_guard_transition'))
      union all select 'bucket:rcap-packet-artifacts-private', coalesce((select jsonb_build_object('public',public,'fileSizeLimit',file_size_limit,'allowedMimeTypes',allowed_mime_types)
        from storage.buckets where id='rcap-packet-artifacts-private'),'null')
    ) select jsonb_object_agg(key,value order by key) as catalog from entries;`;
export const queueHealthQuery = `select jsonb_build_object(
  'dueRetryable', (select count(*) from public.packet_render_jobs where status='failed' and failure_disposition='retryable' and attempt_count<max_attempts and next_attempt_at<=now()),
  'duplicateRetryGroups', (select count(*) from (select packet_id,input_hash from public.packet_render_jobs where status='failed' and failure_disposition='retryable' group by packet_id,input_hash having count(*)>1) s),
  'retryGroupsWithLiveSibling', (select count(*) from public.packet_render_jobs f where f.status='failed' and f.failure_disposition='retryable' and exists(select 1 from public.packet_render_jobs l where l.packet_id=f.packet_id and l.input_hash=f.input_hash and l.status<>'failed')),
  'expiredOverLimit', (select count(*) from public.packet_render_jobs where status in ('claimed','rendering','validating') and claim_expires_at<now() and attempt_count>=max_attempts),
  'queuedOverLimit', (select count(*) from public.packet_render_jobs where status='queued' and attempt_count>=max_attempts),
  'rows', (select coalesce(jsonb_agg(jsonb_build_object('id',id,'packetId',packet_id,'inputHash',input_hash,'status',status,'failureDisposition',failure_disposition,'attemptCount',attempt_count,'maxAttempts',max_attempts,'nextAttemptAt',next_attempt_at,'claimExpiresAt',claim_expires_at,'errorCode',error_code,'profileId',profile_id,'profileVersion',profile_version,'createdAt',created_at,
    'authorityFingerprint',md5((to_jsonb(packet_render_jobs)-array['status','failure_disposition','next_attempt_at','claim_expires_at','fencing_token','claimed_by','claimed_at','updated_at','error_code','last_error_detail','retry_reconciliation_history'])::text)) order by created_at,id),'[]') from public.packet_render_jobs),
  'oldClaim', to_regprocedure('public.claim_packet_render_job(text,text[])')::text,
  'oldCredit', to_regprocedure('public.consume_rcap_packet_credit(text,text,uuid)')::text
) as health;`;
export function normalizeCatalog(catalog) {
 const out=structuredClone(catalog);
 for (const [key,value] of Object.entries(out)) if(key.startsWith('functions:')) for(const fn of Object.values(value)) {
  fn.definitionSha256=digest(fn.definition); delete fn.definition;
 }
 return out;
}
const stable=value=>JSON.stringify(value,(_,v)=>v && !Array.isArray(v) && typeof v==='object' ? Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))) : v);
export function comparePacketCatalog(expected,actual) {
 return Object.entries(expected).flatMap(([name,value])=>stable(value)===stable(actual?.[name]) ? [] : [{name,expected:value,actual:actual?.[name]??null}]);
}
export function loadPacketContract(root) {
 const contract=JSON.parse(fs.readFileSync(path.join(root,CONTRACT_PATH),'utf8'));
 for (const source of contract.sources) if(digest(fs.readFileSync(path.join(root,source.path)))!==source.sha256) throw new Error(`contract_source_drift:${source.path}`);
 return contract;
}
