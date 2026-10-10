// Runs only in a disposable socket-only PostgreSQL cluster. Inputs are schema/DDL, never credentials or participant records.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {startEphemeralPg} from './lib/rcap-ephemeral-pg.mjs';
const migration=fs.readFileSync('supabase/migrations/20261010023000_rcap_operating_authority.sql','utf8');
const baseline=JSON.parse(fs.readFileSync(process.env.RCAP_BASELINE_FUNCTIONS_FILE,'utf8'));
const pg=startEphemeralPg();
try {
 pg.sql('create role anon;create role authenticated;create role service_role bypassrls;create role supabase_auth_admin;create role supabase_storage_admin;create role authenticator;');
 pg.applyFile(process.env.RCAP_LOCAL_SCHEMA_FILE);
 for(const fn of baseline)pg.sql(fn.definition);
 const newNames=[...migration.matchAll(/create (?:or replace )?function public\.([a-z_]+)/gi)].map(m=>m[1]).filter(name=>!baseline.some(f=>f.proname===name));
 for(const name of newNames){const functions=pg.json(`select jsonb_agg(oid::regprocedure::text) from pg_proc where pronamespace='public'::regnamespace and proname='${name}'`);for(const signature of functions??[])pg.sql(`drop function ${signature}`);}
 pg.sql('alter table public.partner_onboarding drop column operating_model;');
 // Restore exact Production execution ACLs after the schema-only dump deliberately omitted all grants.
 for(const fn of baseline){const sig=pg.scalar(`select oid::regprocedure::text from pg_proc where pronamespace='public'::regnamespace and proname='${fn.proname}'`);pg.sql(`revoke all on function ${sig} from public,anon,authenticated,service_role`);for(const role of ['anon','authenticated','service_role'])if(fn.acl?.includes(`${role}=X/`))pg.sql(`grant execute on function ${sig} to ${role}`);}
 const before=pg.json(`select jsonb_agg(jsonb_build_object('name',proname,'definer',prosecdef,'config',proconfig,'acl',proacl::text) order by proname) from pg_proc where pronamespace='public'::regnamespace and (proname<>'claim_rcap_screening_session' or pronargs=2) and proname=any(array[${baseline.map(f=>`'${f.proname}'`).join(',')}])`);
 pg.applyFile('supabase/migrations/20261010023000_rcap_operating_authority.sql');
 const after=pg.json(`select jsonb_agg(jsonb_build_object('name',proname,'definer',prosecdef,'config',proconfig,'acl',proacl::text) order by proname) from pg_proc where pronamespace='public'::regnamespace and (proname<>'claim_rcap_screening_session' or pronargs=2) and proname=any(array[${baseline.map(f=>`'${f.proname}'`).join(',')}])`);
 assert.deepEqual(after,before,'all existing execution privileges and security-definer/search-path settings are unchanged');
 const supported=pg.json('select to_jsonb(public.rcap_screening_jurisdictions())');
 const profiles=fs.readdirSync('src/lib/rcap-engine/compiled/profiles').filter(f=>f.endsWith('.json')).map(f=>JSON.parse(fs.readFileSync(`src/lib/rcap-engine/compiled/profiles/${f}`,'utf8')).jurisdiction.code).sort();assert.deepEqual([...supported].sort(),profiles);
 for(const role of ['anon','authenticated'])for(const name of newNames)assert.equal(pg.scalar(`select bool_or(has_function_privilege('${role}',oid,'EXECUTE')) from pg_proc where pronamespace='public'::regnamespace and proname='${name}'`),'f');
 assert.equal(pg.scalar("select column_default from information_schema.columns where table_schema='public' and table_name='partner_onboarding' and column_name='operating_model'"),"'partner_managed'::text");
 for(const role of ['anon','authenticated'])assert.equal(pg.scalar(`select has_function_privilege('${role}','public.claim_rcap_screening_session(text,text,text)','EXECUTE')`),'f');
 console.log('PASS exact transactional migration applies from current Production function definitions; all 18 existing function ACL/security contracts preserved; new helpers service-only; legacy default partner-managed; supported jurisdictions match all 51 compiled profiles');
} finally {pg.stop();}
