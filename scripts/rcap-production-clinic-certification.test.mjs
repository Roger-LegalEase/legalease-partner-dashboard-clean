import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {
 CLINIC_SOURCE_FILES,clinicSourceTestDatabase,clinicSourceCatalogQuery,
 buildClinicSourceReference,certifyClinicSourceCatalog,
} from './rcap-production-migration-contract.mjs';
import {migrationCertification} from './rcap-migration-certification.mjs';

const root=process.cwd();
const directory='scripts/fixtures/production-clinic-36625443428';
const fixture=JSON.parse(fs.readFileSync(`${directory}/catalog.json`));
const zip=fs.readFileSync(`${directory}/11061205252.zip`);
assert.equal(createHash('sha256').update(zip).digest('hex'),'4346001f78554a92035a882f1dc55e5e97f4f99acfb282724a3de86c3ccb2779');
const captured=JSON.parse(execFileSync('python3',['-c',"import sys,zipfile; z=zipfile.ZipFile(sys.argv[1]); assert z.namelist()==['production-clinic-migrate.json']; print(z.read('production-clinic-migrate.json').decode())",`${directory}/11061205252.zip`],{encoding:'utf8',maxBuffer:2*1024*1024}));
const prefix='clinic_source_postconditions_failed:legal_aid:catalog_key_set_mismatch;clinic_jurisdiction:migration_not_certified: ';
const suffix=';clinic_base:catalog_key_set_mismatch';
assert.ok(captured.failure.startsWith(prefix)&&captured.failure.endsWith(suffix));
const mismatches=JSON.parse(captured.failure.slice(prefix.length,-suffix.length));
const reference=await buildClinicSourceReference(root);
const quote=s=>'"'+s.replaceAll('"','""')+'"';

async function jurisdictionDatabase(){
 const db=await clinicSourceTestDatabase();
 try{for(const file of CLINIC_SOURCE_FILES.slice(0,4))await db.exec(fs.readFileSync(file,'utf8'));return db;}
 catch(error){await db.close();throw error;}
}

test('native run fixture binds all 11 observed differences and explicitly identifies reconstructed matching keys',()=>{
 assert.equal(fixture.provenance.runId,36625443428);assert.equal(fixture.provenance.artifactId,11061205252);
 assert.equal(fixture.provenance.artifactSha256,'sha256:'+createHash('sha256').update(zip).digest('hex'));
 assert.equal(captured.migrationApplied,false);assert.equal(captured.productionDatabaseMutated,false);assert.equal(captured.passed,false);
 assert.equal(captured.releaseTuple.toolsSha,fixture.provenance.toolsSha);
 assert.equal(captured.applicationSha,fixture.provenance.applicationSha);
 assert.equal(captured.verdicts.find(v=>v.caseId==='baseline_phases_49_55_readback_passed').passed,true);
 assert.equal(captured.verdicts.find(v=>v.caseId==='clinic_schema_initial_state_is_empty_or_complete').observed,'empty=false; complete=true; tables=10; RLS=10; functions=22');
 assert.equal(mismatches.length,11);assert.deepEqual(fixture.provenance.capturedMismatchKeys,mismatches.map(m=>m.name));
 for(const m of mismatches)assert.deepEqual(fixture.catalog[m.name],m.actual,`unaltered captured value ${m.name}`);
 const capturedKeys=new Set(mismatches.map(m=>m.name));
 for(const [key,value]of Object.entries(fixture.catalog))if(!capturedKeys.has(key))assert.deepEqual(value,reference.snapshots.clinic_jurisdiction[key],`source-equal reconstructed value ${key}`);
 assert.match(fixture.provenance.reconstruction,/not independently captured/);
});

test('captured Production-shaped catalog certifies specifically as clinic_jurisdiction',()=>{
 const result=certifyClinicSourceCatalog(reference,fixture.catalog);
 assert.equal(result.certified,true);assert.equal(result.stage,'clinic_jurisdiction');
 assert.throws(()=>certifyClinicSourceCatalog(reference,fixture.catalog,{legalAid:true}),/clinic_source_postconditions_failed/);
 console.log('Run 36625443428 sanitized catalog replay: stage=clinic_jurisdiction');
});

test('frozen Supabase baseline grants, not observed Production grants, define the disposable service-role defaults',()=>{
 const baseline=execFileSync('git',['show',`${fixture.provenance.applicationSha}:supabase/migrations/20260728213131_remote_schema.sql`],{encoding:'utf8',maxBuffer:4*1024*1024});
 for(const type of ['TABLES','FUNCTIONS'])assert.ok(baseline.includes(`ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON ${type} TO "service_role";`));
 for(const [key,value]of Object.entries(reference.snapshots.clinic_jurisdiction))if(key.startsWith('table:'))assert.ok(Object.values(value.grants.service_role).every(v=>v===true));
 assert.equal(reference.snapshots.clinic_jurisdiction['function:clinic_sync_packet_reservation()'].execute.service_role,true);
});

test('old disposable defaults and duplicate NOT NULL catalog reproduce the exact 11 native failures',async()=>{
 const db=await clinicSourceTestDatabase();
 try{
  // Counterfactual replay of the defective Captain model; never a runtime option.
  await db.exec('alter default privileges for role postgres in schema public revoke all on tables from service_role; alter default privileges for role postgres in schema public revoke all on functions from service_role;');
  for(const file of CLINIC_SOURCE_FILES.slice(0,4))await db.exec(fs.readFileSync(file,'utf8'));
  const oldQuery=clinicSourceCatalogQuery.replace(" and contype <> 'n'",'');assert.notEqual(oldQuery,clinicSourceCatalogQuery);
  const expected=(await db.query(oldQuery)).rows[0].catalog;
  const result=migrationCertification({expected,actual:fixture.catalog});assert.equal(result.certified,false);
  assert.equal(result.failures.length,11);
  for(const mismatch of mismatches)assert.deepEqual(result.failures.find(f=>f.name===mismatch.name),mismatch);
 }finally{await db.close();}
});

test('all three source stages retain their original fallback order and exact key-set requirement',()=>{
 for(const stage of ['legal_aid','clinic_jurisdiction','clinic_base'])assert.equal(certifyClinicSourceCatalog(reference,reference.snapshots[stage]).stage,stage);
 const same={snapshots:Object.fromEntries(['legal_aid','clinic_jurisdiction','clinic_base'].map(s=>[s,fixture.catalog])),sources:reference.sources};
 assert.equal(certifyClinicSourceCatalog(same,fixture.catalog).stage,'legal_aid');
 for(const key of ['table:clinic_unexpected','table:legal_aid_unexpected','function:clinic_unexpected()','function:legal_aid_unexpected()']){
  assert.throws(()=>certifyClinicSourceCatalog(reference,{...fixture.catalog,[key]:{}}),/catalog_key_set_mismatch/);
 }
 const partial=structuredClone(fixture.catalog);delete partial['table:clinic_cases'];
 assert.throws(()=>certifyClinicSourceCatalog(reference,partial),/catalog_key_set_mismatch/);
});

test('real disposable catalog mutations cannot weaken constraints, security, columns, or function identity',async t=>{
 const db=await jurisdictionDatabase();
 try{
  const catalog=async()=>(await db.query(clinicSourceCatalogQuery)).rows[0].catalog;
  const original=await catalog();assert.equal(certifyClinicSourceCatalog(reference,original).stage,'clinic_jurisdiction');
  // CHECK expressions containing IS NOT NULL are real constraints, not contype=n.
  assert.ok(Object.values(original).some(v=>Object.values(v?.constraints??{}).some(def=>def.startsWith('CHECK')&&def.includes('IS NOT NULL'))));
  const constraints=(await db.query("select c.relname as table_name,k.conname as name,k.contype as type,pg_get_constraintdef(k.oid) as definition from pg_constraint k join pg_class c on c.oid=k.conrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'clinic_%' order by c.relname,k.conname")).rows;
  assert.ok(constraints.some(c=>c.type==='n'),'this PGlite exposes duplicate NOT NULL constraints');
  for(const v of Object.values(original))for(const def of Object.values(v?.constraints??{}))assert.ok(!def.startsWith('NOT NULL'),'contype=n is excluded, attnotnull remains');
  const mutations=[];
  for(const [type,label]of [['p','PK'],['f','FK'],['u','UNIQUE'],['c','CHECK']]){
   const c=constraints.find(c=>c.type===type);assert.ok(c,label);
   const drop=`alter table public.${quote(c.table_name)} drop constraint ${quote(c.name)} cascade;`;
   mutations.push([`remove ${label}`,drop]);
   const definition=type==='c'?'CHECK (false)':c.definition+' DEFERRABLE INITIALLY DEFERRED';
   mutations.push([`change ${label}`,drop+` alter table public.${quote(c.table_name)} add constraint ${quote(c.name)} ${definition};`]);
  }
  const policy=(await db.query("select c.relname as table_name,p.polname as name from pg_policy p join pg_class c on c.oid=p.polrelid where c.relname like 'clinic_%' order by c.relname,p.polname limit 1")).rows[0];
  const index=(await db.query("select c.relname as table_name,i.relname as name from pg_index x join pg_class c on c.oid=x.indrelid join pg_class i on i.oid=x.indexrelid where c.relname like 'clinic_%' and not exists(select 1 from pg_constraint k where k.conindid=x.indexrelid) order by i.relname limit 1")).rows[0];
  mutations.push(
   ['remove policy',`drop policy ${quote(policy.name)} on public.${quote(policy.table_name)}`],
   ['change policy',`alter policy ${quote(policy.name)} on public.${quote(policy.table_name)} using(false)`],
   ['remove index',`drop index public.${quote(index.name)}`],
   ['change index',`drop index public.${quote(index.name)};create index ${quote(index.name)} on public.${quote(index.table_name)} (id)`],
   ['remove trigger','drop trigger clinic_sync_packet_reservation_after_job on public.packet_render_jobs'],
   ['disable trigger','alter table public.packet_render_jobs disable trigger clinic_sync_packet_reservation_after_job'],
   ['change function body',"create or replace function public.clinic_sync_packet_reservation() returns trigger language plpgsql as $$ begin return new; end $$"],
   ['change function owner','alter function public.clinic_sync_packet_reservation() owner to service_role'],
   ['disable RLS','alter table public.clinic_events disable row level security'],
   ['change forced RLS','alter table public.clinic_events force row level security'],
   ['drop column NOT NULL','alter table public.clinic_cases alter column created_at drop not null'],
   ['change column default',"alter table public.clinic_cases alter column queue_status set default 'drift'"],
   ['revoke service table default','revoke insert on public.clinic_cases from service_role'],
   ['revoke service function default','revoke execute on function public.clinic_sync_packet_reservation() from service_role'],
   ['grant anonymous table access','grant select on public.clinic_cases to anon'],
   ['grant public function access','grant execute on function public.clinic_sync_packet_reservation() to public'],
   ['extra Clinic table','create table public.clinic_unexpected(id uuid)'],
   ['extra Legal Aid table','create table public.legal_aid_unexpected(id uuid)'],
   ['partial Clinic tables','drop table public.clinic_incidents cascade'],
  );
  for(const [name,sql]of mutations)await t.test(name,async()=>{
   await db.exec('begin');
   try{await db.exec(sql);const actual=await catalog();assert.notDeepEqual(actual,original,'mutation must change the certified catalog');assert.throws(()=>certifyClinicSourceCatalog(reference,actual),/clinic_source_postconditions_failed/);}
   finally{await db.exec('rollback');}
  });
  assert.deepEqual(await catalog(),original,'all local mutations rolled back');
 }finally{await db.close();}
});
