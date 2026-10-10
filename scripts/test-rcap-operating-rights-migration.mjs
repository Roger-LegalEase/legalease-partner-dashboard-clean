import assert from 'node:assert/strict';
import fs from 'node:fs';
import {startEphemeralPg} from './lib/rcap-ephemeral-pg.mjs';
const migration='supabase/migrations/20261010074948_rcap_operating_responsibility_rights.sql';
assert.ok(process.env.RCAP_LOCAL_SCHEMA_FILE,'Existing isolated schema required');
const pg=startEphemeralPg();
try {
 pg.sql('create role anon;create role authenticated;create role service_role bypassrls;create role supabase_auth_admin;create role supabase_storage_admin;create role authenticator;');
 pg.applyFile(process.env.RCAP_LOCAL_SCHEMA_FILE);
 const names=['rcap_program_external_rights_present','rcap_service_save_program_configuration'];
 const signatures=pg.json(`select jsonb_agg(oid::regprocedure::text) from pg_proc where pronamespace='public'::regnamespace and proname in (${names.map(n=>`'${n}'`).join(',')})`);
 for(const signature of signatures)pg.sql(`revoke all on function ${signature} from public,anon,authenticated;grant execute on function ${signature} to service_role;`);
 const security=()=>pg.json(`select jsonb_agg(jsonb_build_object('name',proname,'acl',proacl::text,'definer',prosecdef,'config',proconfig) order by proname) from pg_proc where pronamespace='public'::regnamespace and proname in (${names.map(n=>`'${n}'`).join(',')})`);
 const before=security();
 pg.applyFile(migration);
 assert.deepEqual(security(),before);
 for(const role of ['anon','authenticated'])assert.equal(pg.scalar(`select has_function_privilege('${role}','public.rcap_program_external_rights_evidence(uuid)','EXECUTE')`),'f');
 assert.equal(pg.scalar("select has_function_privilege('service_role','public.rcap_program_external_rights_evidence(uuid)','EXECUTE')"),'t');
 assert.equal(pg.scalar("select public.rcap_program_external_rights_present('00000000-0000-0000-0000-000000000001')"),'f');
 assert.doesNotMatch(fs.readFileSync(migration,'utf8'),/\b(?:delete from|truncate|disable trigger|security definer)\b/i);
 console.log('PASS correction applies to the existing schema; replaced function ACLs and security settings preserved; new evaluator service-only; no data migration');
} finally {pg.stop();}
