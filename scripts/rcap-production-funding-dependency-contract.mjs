// Exact four-object dependency closure from the frozen application; no service access.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
export const SOURCE_PATH = 'supabase/migrations/20260927152649_clinic_packet_funding_choice.sql';
export const SOURCE_SHA = '8c8632dcb8b08ef530eb3843671cee0c785919bf29130936162cba779f7aea75';
export const FUNDING_CORE_KEYS = ['table:clinic_packet_funding','function:allocate_clinic_packet_funding(uuid,uuid,text)','function:clinic_packet_dtc_authorized(uuid,uuid)','function:clinic_entry_sponsor_capacity(uuid,text)'];
const stable = value => JSON.stringify(value, (_,v) => v && typeof v === 'object' && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).sort(([a],[b])=>a.localeCompare(b))) : v);
export function fundingSourcePrefix(root) {
 const source=fs.readFileSync(path.join(root,SOURCE_PATH),'utf8');
 if(createHash('sha256').update(source).digest('hex')!==SOURCE_SHA)throw new Error('funding_frozen_source_changed');
 return source.slice(source.indexOf('create table public.clinic_packet_funding ('),source.indexOf('-- Bounded edits to existing protected transactions.')).trim();
}
export const fundingCatalogQuery = `with objects as (
 select 'table:'||c.relname as key, jsonb_build_object(
 'kind',c.relkind,'owner',pg_get_userbyid(c.relowner),'rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity,
 'columns',coalesce((select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notNull',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid),'identity',a.attidentity,'generated',a.attgenerated,'acl',a.attacl::text) order by a.attnum) from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),'[]'::jsonb),
 'constraints',coalesce((select jsonb_object_agg(conname,jsonb_build_object('type',contype,'definition',pg_get_constraintdef(oid,true),'validated',convalidated)) from pg_constraint where conrelid=c.oid and contype<>'n'),'{}'::jsonb),
 'indexes',coalesce((select jsonb_object_agg(i.relname,jsonb_build_object('definition',pg_get_indexdef(i.oid),'valid',x.indisvalid,'ready',x.indisready)) from pg_index x join pg_class i on i.oid=x.indexrelid where x.indrelid=c.oid),'{}'::jsonb),
 'policies',coalesce((select jsonb_object_agg(polname,jsonb_build_object('permissive',polpermissive,'roles',(select jsonb_agg(case when r=0 then 'public' else pg_get_userbyid(r) end order by case when r=0 then 'public' else pg_get_userbyid(r) end) from unnest(polroles) r),'command',polcmd,'using',pg_get_expr(polqual,polrelid),'check',pg_get_expr(polwithcheck,polrelid))) from pg_policy where polrelid=c.oid),'{}'::jsonb),
 'triggers',coalesce((select jsonb_object_agg(tgname,jsonb_build_object('definition',pg_get_triggerdef(oid,true),'enabled',tgenabled)) from pg_trigger where tgrelid=c.oid and not tgisinternal),'{}'::jsonb),
 'effectivePrivileges',(select jsonb_object_agg(r,(select jsonb_object_agg(priv,jsonb_build_object('allowed',has_table_privilege(r,c.oid,priv),'grantable',has_table_privilege(r,c.oid,priv||' WITH GRANT OPTION'))) from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) priv)) from unnest(array['anon','authenticated','service_role','rcap_render_worker','rcap_packet_delivery']) r),
 'acl',coalesce((select jsonb_agg(jsonb_build_object('role',case when x.grantee=0 then 'public' else pg_get_userbyid(x.grantee) end,'grantor',pg_get_userbyid(x.grantor),'privilege',x.privilege_type,'grantable',x.is_grantable) order by case when x.grantee=0 then 'public' else pg_get_userbyid(x.grantee) end,x.privilege_type,pg_get_userbyid(x.grantor)) from aclexplode(coalesce(c.relacl,acldefault('r',c.relowner))) x),'[]'::jsonb)
 ) value from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='clinic_packet_funding'
 union all
 select 'function:'||p.proname||'('||replace(oidvectortypes(p.proargtypes),', ', ',')||')',jsonb_build_object(
 'kind',p.prokind,'definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),'securityDefiner',p.prosecdef,'config',p.proconfig,'volatility',p.provolatile,'language',l.lanname,
 'acl',coalesce((select jsonb_agg(jsonb_build_object('role',case when x.grantee=0 then 'public' else pg_get_userbyid(x.grantee) end,'grantor',pg_get_userbyid(x.grantor),'privilege',x.privilege_type,'grantable',x.is_grantable) order by case when x.grantee=0 then 'public' else pg_get_userbyid(x.grantee) end,x.privilege_type,pg_get_userbyid(x.grantor)) from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) x),'[]'::jsonb),
 'execute',(select jsonb_object_agg(r,jsonb_build_object('allowed',has_function_privilege(r,p.oid,'EXECUTE'),'grantable',has_function_privilege(r,p.oid,'EXECUTE WITH GRANT OPTION'))) from unnest(array['anon','authenticated','service_role','rcap_render_worker','rcap_packet_delivery']) r)
 ) from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang where n.nspname='public' and p.proname in ('allocate_clinic_packet_funding','clinic_packet_dtc_authorized','clinic_entry_sponsor_capacity')
) select coalesce(jsonb_object_agg(key,value),'{}'::jsonb) as catalog from objects`;
export function expectedFundingCatalog(root) {
 fundingSourcePrefix(root);
 const bytes=fs.readFileSync(path.join(root,'scripts/fixtures/production-packet-forward-correction/expected-funding-catalog.json'),'utf8');
 if(createHash('sha256').update(bytes).digest('hex')!=='0fd4181d4193cb76ef829fbc9f3046f34c0f287c834b63cd1e72d3ed4d6c03e1')throw new Error('funding_source_catalog_changed');
 return JSON.parse(bytes);
}
export function certifyFundingCatalog(actual,expected) {
 if(stable(actual)!==stable(expected))throw new Error('funding_dependency_catalog_mismatch');
 return {pass:true,keys:Object.keys(expected).sort()};
}
