import {assertFrozenForwardExecution} from './grade-a-launch-control/forward-production-execution.mjs';
import {loadProductionCandidate,requireHotfixPhase,verifyHotfixControl} from './grade-a-launch-control/hotfix-production-contract.mjs';
import {requireProductionPhaseAuthorization,PRODUCTION_PROJECT_REF} from './grade-a-launch-control/production-preflight-authorization.mjs';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { requireCurrentReleaseCandidate } from './grade-a-launch-control/verify-release-candidate-binding.mjs';
import { requireMigrationCertification } from './rcap-migration-certification.mjs';
import { LEGAL_AID_MIGRATION } from './rcap-legal-aid/contract.mjs';
import { fundingCatalogQuery, expectedFundingCatalog, certifyFundingCatalog, SOURCE_PATH as FUNDING_SOURCE_PATH, SOURCE_SHA as FUNDING_SOURCE_SHA } from './rcap-production-funding-dependency-contract.mjs';

export {requireProductionPhaseAuthorization,PRODUCTION_PROJECT_REF};
export const CLINIC_SOURCE_FILES = Object.freeze([
  'supabase/migrations/20260825120000_clinic_mode_core.sql',
  'supabase/migrations/20260825121000_clinic_mode_security.sql',
  'supabase/migrations/20260825122000_clinic_mode_accounting_reporting.sql',
  'supabase/migrations/20260903120000_clinic_event_jurisdiction_lock.sql',
  LEGAL_AID_MIGRATION.path,
]);

// Release identity follows the existing successor binding. An accepted hosted
// tuple supplies identity; it never supplies permission to operate Production.
export function requireProductionReleaseTuple(candidate, binding, env) {
  const inputs = {
    applicationSha: env.RCAP_APPLICATION_SHA,
    workerSourceSha: env.RCAP_WORKER_SOURCE_SHA,
    workerDigest: env.RCAP_WORKER_DIGEST,
  };
  for (const [key, actual] of Object.entries(inputs)) {
    const shape = key === 'workerDigest' ? /^sha256:[0-9a-f]{64}$/ : /^[0-9a-f]{40}$/;
    if (!shape.test(actual ?? '') || actual !== candidate?.[key] || actual !== binding?.[key]) {
      throw new Error(`production_release_tuple_mismatch:${key}`);
    }
  }
  if (candidate?.productionProjectRef !== PRODUCTION_PROJECT_REF
    || env.RCAP_PRODUCTION_PROJECT_REF !== PRODUCTION_PROJECT_REF) {
    throw new Error('production_release_project_mismatch');
  }
  if (!/^[0-9a-f]{40}$/.test(env.RCAP_TOOLS_SHA ?? '')
    || (candidate?.forwardProduction ? (env.RCAP_TOOLS_SHA !== candidate.toolsSha || env.RCAP_TOOLS_SHA !== binding.toolsSha || !/^[0-9a-f]{40}$/.test(env.GITHUB_SHA ?? '')) : (env.GITHUB_SHA && env.RCAP_TOOLS_SHA !== env.GITHUB_SHA))) {
    throw new Error('production_execution_tools_mismatch');
  }
  return candidate;
}


export function requireProductionDeploymentBinding(candidate, phase) {
  const authorization = requireProductionPhaseAuthorization(candidate, phase);
  if (phase === 'preflight') {
    const preview = candidate.hostedAcceptance?.preview;
    if (!/^dpl_[A-Za-z0-9]+$/.test(preview?.deploymentId ?? '') || preview.applicationSha !== candidate.applicationSha
      || preview.acceptanceProjectRef !== candidate.acceptanceProjectRef
      || preview.workerSourceSha !== candidate.workerSourceSha || preview.workerDigest !== candidate.workerDigest
      || (preview.target !== null && preview.target !== 'preview') || preview.readyState !== 'READY') {
      throw new Error('production_preflight_preview_binding_missing');
    }
  }
  if (phase === 'smoke' || phase === 'activate' || phase === 'public_verify') {
    if (!/^dpl_[A-Za-z0-9]+$/.test(authorization.stagedDeploymentId ?? '')
      || !/^dpl_[A-Za-z0-9]+$/.test(authorization.rollbackDeploymentId ?? '')
      || authorization.stagedDeploymentId === authorization.rollbackDeploymentId) {
      throw new Error('production_deployment_binding_missing');
    }
    if (phase === 'activate' && (!/^[0-9]{6,}$/.test(String(authorization.smokeRunId ?? ''))
      || !/^[0-9a-f]{64}$/.test(authorization.smokeArtifactSha256 ?? ''))) {
      throw new Error('production_smoke_receipt_binding_missing');
    }
  }
  return authorization;
}

export function requireProductionMigrationRelease(root, env = process.env) {
  if(env.RCAP_HOTFIX_JOURNAL){
    const candidate=loadProductionCandidate(root,env);verifyHotfixControl(root,env);
    for(const [key,input]of [['applicationSha','RCAP_APPLICATION_SHA'],['workerSourceSha','RCAP_WORKER_SOURCE_SHA'],['workerDigest','RCAP_WORKER_DIGEST'],['toolsSha','RCAP_TOOLS_SHA'],['productionProjectRef','RCAP_PRODUCTION_PROJECT_REF']])if(candidate[key]!==env[input])throw new Error('production_hotfix_tuple_mismatch:'+key);
    requireHotfixPhase(candidate,env.RCAP_PRODUCTION_PHASE);requireProductionDeploymentBinding(candidate,env.RCAP_PRODUCTION_PHASE);return candidate;
  }
  const candidate = requireCurrentReleaseCandidate(root);
  const binding = JSON.parse(fs.readFileSync(path.join(root, 'data/rcap-grade-a/launch-control/HOSTED_TOOLS_BINDING.json'), 'utf8'));
  requireProductionReleaseTuple(candidate, binding, env);
  if(candidate.forwardProduction) assertFrozenForwardExecution(root,candidate,{toolsSha:env.RCAP_TOOLS_SHA,executionSha:env.GITHUB_SHA});
  else if (execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim() !== env.RCAP_TOOLS_SHA) {
    throw new Error('production_execution_tools_are_not_checked_out');
  }
  requireProductionPhaseAuthorization(candidate, env.RCAP_PRODUCTION_PHASE);
  requireProductionDeploymentBinding(candidate, env.RCAP_PRODUCTION_PHASE);
  return candidate;
}

// This is deliberately the Clinic/Legal Aid catalog only. Its expected bytes
// come from the existing five source migrations in a disposable PostgreSQL
// instance, with the same prerequisite shim as rcap-legal-aid/self-test.mjs.
// No Production catalog or asserted receipt can become expected authority.
// NOT NULL is compared once, through pg_attribute.attnotnull. PostgreSQL 18
// also exposes contype='n' constraints; their names are not portable catalog
// identity. All other constraint types remain in the exact comparison.
const clinicCoreCatalogQuery = `with relations as (
  select c.* from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='public' and c.relkind='r'
    and (c.relname like 'clinic\\_%' escape '\\' or c.relname like 'legal\\_aid\\_%' escape '\\')
), functions as (
  select p.* from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='public'
    and (p.proname like 'clinic\\_%' escape '\\' or p.proname like 'legal\\_aid\\_%' escape '\\' or p.proname='allocate_clinic_packet_funding')
), entries as (
  select 'table:'||c.relname as key, jsonb_build_object(
    'rls',c.relrowsecurity,'forceRls',c.relforcerowsecurity,
    'columns',(select jsonb_agg(jsonb_build_object('name',a.attname,'type',format_type(a.atttypid,a.atttypmod),'notNull',a.attnotnull,'default',pg_get_expr(d.adbin,d.adrelid)) order by a.attname)
      from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=c.oid and a.attnum>0 and not a.attisdropped),
    'constraints',coalesce((select jsonb_object_agg(conname,pg_get_constraintdef(oid)) from pg_constraint where conrelid=c.oid and contype <> 'n'),'{}'),
    'indexes',coalesce((select jsonb_object_agg(ci.relname,pg_get_indexdef(i.indexrelid)) from pg_index i join pg_class ci on ci.oid=i.indexrelid where i.indrelid=c.oid),'{}'),
    'policies',coalesce((select jsonb_object_agg(polname,jsonb_build_object('command',polcmd,'permissive',polpermissive,'roles',(select jsonb_agg(case when r=0 then 'public' else pg_get_userbyid(r) end order by case when r=0 then 'public' else pg_get_userbyid(r) end) from unnest(polroles) r),'using',pg_get_expr(polqual,polrelid),'check',pg_get_expr(polwithcheck,polrelid))) from pg_policy where polrelid=c.oid),'{}'),
    'triggers',coalesce((select jsonb_object_agg(tgname,jsonb_build_object('enabled',tgenabled,'definition',pg_get_triggerdef(oid))) from pg_trigger where tgrelid=c.oid and not tgisinternal),'{}'),
    'grants',(select jsonb_object_agg(r,(select jsonb_object_agg(v,has_table_privilege(r,c.oid,v)) from unnest(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) v)) from unnest(array['anon','authenticated','service_role']) r)
  ) as value from relations c
  union all select 'function:'||p.oid::regprocedure::text, jsonb_build_object(
    'definition',pg_get_functiondef(p.oid),'owner',pg_get_userbyid(p.proowner),
    'execute',(select jsonb_object_agg(r,has_function_privilege(r,p.oid,'EXECUTE')) from unnest(array['anon','authenticated','service_role']) r),
    'publicExecute',exists(select 1 from aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) where grantee=0 and privilege_type='EXECUTE')
  ) from functions p
  union all select 'bucket:rcap-legal-aid-private',coalesce((select jsonb_build_object('public',public,'fileSizeLimit',file_size_limit,'allowedMimeTypes',allowed_mime_types) from storage.buckets where id='rcap-legal-aid-private'),'null')
  union all select 'trigger:packet_render_jobs.clinic_sync_packet_reservation_after_job',
    coalesce((select jsonb_build_object('enabled',tgenabled,'definition',pg_get_triggerdef(oid)) from pg_trigger
      where tgrelid='public.packet_render_jobs'::regclass and tgname='clinic_sync_packet_reservation_after_job' and not tgisinternal),'null')
) select coalesce(jsonb_object_agg(key,value order by key),'{}') as catalog from entries`;

// A complete funding overlay is a frozen application dependency, not a new
// Clinic stage. Its full independent catalog retains owners, every overload,
// all constraints and all relevant privileges. Only these four known core
// representations are replaced by the stronger full funding representation.
const FUNDING_CORE_KEYS = [
  'table:clinic_packet_funding',
  'function:allocate_clinic_packet_funding(uuid,uuid,text)',
  'function:clinic_packet_dtc_authorized(uuid,uuid)',
  'function:clinic_entry_sponsor_capacity(uuid,text)',
];
export const clinicSourceCatalogQuery = `select
  (core.catalog - array[${FUNDING_CORE_KEYS.map(key=>"'"+key+"'").join(',')}]) ||
  case when to_regclass('public.clinic_packet_funding') is not null or exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'
      and p.proname in ('allocate_clinic_packet_funding','clinic_packet_dtc_authorized','clinic_entry_sponsor_capacity')
  ) then funding.catalog else '{}'::jsonb end as catalog
  from (${clinicCoreCatalogQuery}) core cross join (${fundingCatalogQuery}) funding`;

export async function clinicSourceTestDatabase() {
  const { PGlite } = await import('@electric-sql/pglite');
  const db = new PGlite();
  try {
    // These defaults are part of the frozen Supabase baseline
    // (20260728213131_remote_schema.sql), not grants inferred from Production.
    await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
      create role rcap_render_worker; create role rcap_packet_delivery;
      alter default privileges for role postgres in schema public grant all on tables to service_role;
      alter default privileges for role postgres in schema public grant all on functions to service_role;
      create schema auth; create table auth.users(id uuid primary key);
      create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
      create schema storage; create table storage.buckets(id text primary key,name text,public boolean default false,file_size_limit bigint,allowed_mime_types text[]);
      create table public.partner_records(id uuid primary key,partner_slug text unique not null);
      create table public.partner_users(id uuid primary key,auth_user_id uuid unique not null references auth.users(id),partner_slug text references public.partner_records(partner_slug),role text not null,status text not null);
      create table public.screening_sessions(session_id uuid primary key);
      create table public.consumer_briefcase_items(id uuid primary key,user_id uuid not null references auth.users(id));
      create table public.packet_credit_ledger(id uuid primary key);
      create table public.packet_render_jobs(id uuid primary key,status text not null,accounting_result text,failure_disposition text,credit_ledger_id uuid references public.packet_credit_ledger(id),partner_id uuid references public.partner_records(id),matter_id uuid,consumer_auth_user_id uuid references auth.users(id));
      grant usage on schema public,auth,storage to anon,authenticated,service_role;`);
    return db;
  } catch (error) {
    await db.close();
    throw error;
  }
}

export async function buildClinicSourceReference(root) {
  const db = await clinicSourceTestDatabase();
  try {
    const snapshots = {};
    const sources = [];
    for (const [index, file] of CLINIC_SOURCE_FILES.entries()) {
      const sql = fs.readFileSync(path.join(root, file), 'utf8');
      sources.push({ path: file, sha256: createHash('sha256').update(sql).digest('hex') });
      await db.exec(sql);
      if (index >= 2) snapshots[['clinic_base', 'clinic_jurisdiction', 'legal_aid'][index - 2]] = (await db.query(clinicSourceCatalogQuery)).rows[0].catalog;
    }
    return { sources, snapshots, funding: expectedFundingCatalog(root) };
  } finally {
    await db.close();
  }
}

export function certifyClinicSourceCatalog(reference, actual, { legalAid = false } = {}) {
  let core = actual;
  let fundingDisposition = 'absent';
  const fundingKeys = Object.keys(reference.funding ?? {});
  const hasFunding = fundingKeys.some(key=>Object.hasOwn(actual ?? {},key));
  if(hasFunding) {
    try {
      const funding = Object.fromEntries(fundingKeys.filter(key=>Object.hasOwn(actual,key)).map(key=>[key,actual[key]]));
      certifyFundingCatalog(funding,reference.funding);
      core = Object.fromEntries(Object.entries(actual).filter(([key])=>!fundingKeys.includes(key)));
      fundingDisposition = 'exact_frozen_overlay';
    } catch(error) { throw new Error(`clinic_source_postconditions_failed:funding_overlay:${error.message}`); }
  }
  const stages = legalAid ? ['legal_aid'] : ['legal_aid', 'clinic_jurisdiction', 'clinic_base'];
  const failures = [];
  for (const stage of stages) {
    try {
      // Require the exact scoped key set as well: an extra overload/table is
      // not a source-derived successor simply because expected keys survive.
      if (JSON.stringify(Object.keys(reference.snapshots[stage]).sort()) !== JSON.stringify(Object.keys(core ?? {}).sort())) throw new Error('catalog_key_set_mismatch');
      const certificate = requireMigrationCertification({ expected: reference.snapshots[stage], actual: core });
      return { ...certificate, stage, sources: reference.sources, fundingDisposition, fundingSource: fundingDisposition === 'exact_frozen_overlay' ? { path: FUNDING_SOURCE_PATH, sha256: FUNDING_SOURCE_SHA } : null };
    } catch (error) { failures.push(`${stage}:${error.message}`); }
  }
  throw new Error(`clinic_source_postconditions_failed:${failures.join(';')}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  try {
    const candidate = requireProductionMigrationRelease(root);
    if (process.env.GITHUB_ENV) fs.appendFileSync(process.env.GITHUB_ENV,
      `APPLICATION_SHA=${candidate.applicationSha}\nWORKER_SOURCE_SHA=${candidate.workerSourceSha}\nWORKER_DIGEST=${candidate.workerDigest}\n`
      + (process.env.RCAP_PRODUCTION_PHASE === 'activate' ? `PRODUCTION_SMOKE_RUN_ID=${candidate.productionAuthorization.smokeRunId}\n` : ''));
    console.log('Production release tuple and separate phase authorization are exact. No remote operation performed.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
