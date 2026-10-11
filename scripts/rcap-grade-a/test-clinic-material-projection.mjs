// Execute the shipped SQL projection. This is an engineering security test,
// not browser, packet rendering, payment, or commercial acceptance evidence.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {PGlite} from '@electric-sql/pglite';
const db=new PGlite();
const migration=fs.readFileSync('supabase/migrations/20261010194800_rcap_integrated_clinic_controls.sql','utf8');
const start=migration.indexOf('create or replace function public.rcap_clinic_case_materials');
const end=migration.indexOf('do $migration$',start);
assert.ok(start>0&&end>start);
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
await db.exec(`
 create role anon; create role authenticated; create role service_role;
 create table public.clinic_cases(id uuid primary key,matter_id uuid,participant_user_id uuid);
 create table public.consumer_briefcase_items(id uuid primary key,user_id uuid);
 create table public.consumer_packet_artifact_provenance(briefcase_item_id uuid,consumer_auth_user_id uuid,matter_id uuid,render_job_id uuid,verification_hash text,entitlement_source text);
 create table public.consumer_packet_verifications(briefcase_item_id uuid,consumer_auth_user_id uuid,matter_id uuid,status text,verification_hash text);
 create table public.packet_render_jobs(id uuid primary key,status text,delivery_eligibility text,output_storage_path text,output_sha256 text);
`);
await db.exec(migration.slice(start,end));
await db.query('insert into public.clinic_cases values($1,$2,$3)',[id(1),id(2),id(3)]);
const read=async()=> (await db.query('select public.rcap_clinic_case_materials($1) as result',[id(1)])).rows[0].result;
assert.deepEqual(await read(),{saved:false,packet:false});
await db.query('insert into public.consumer_briefcase_items values($1,$2)',[id(2),id(9)]);
assert.deepEqual(await read(),{saved:false,packet:false},'Another account’s saved matter is not this participant’s result');
await db.query('update public.consumer_briefcase_items set user_id=$1',[id(3)]);
assert.deepEqual(await read(),{saved:true,packet:false});
await db.query('insert into public.consumer_packet_artifact_provenance values($1,$2,$3,$4,$5,$6)',[id(2),id(3),id(4),id(5),'current','partner_sponsorship']);
await db.query('insert into public.consumer_packet_verifications values($1,$2,$3,$4,$5)',[id(2),id(3),id(4),'verified','current']);
await db.query('insert into public.packet_render_jobs values($1,$2,$3,$4,$5)',[id(5),'delivered','eligible','private/synthetic-test.pdf','test-output-hash']);
assert.deepEqual(await read(),{saved:true,packet:true},'Exact completed, eligible, owned and currently verified packet is reflected');
for(const [sql,params] of [
 ['update public.consumer_packet_verifications set status=$1',['invalidated']],
 ['update public.consumer_packet_verifications set verification_hash=$1',['stale']],
 ['update public.consumer_packet_verifications set matter_id=$1',[id(8)]],
 ['update public.consumer_packet_artifact_provenance set consumer_auth_user_id=$1',[id(8)]],
 ['update public.consumer_packet_artifact_provenance set briefcase_item_id=$1',[id(8)]],
 ['update public.consumer_packet_artifact_provenance set entitlement_source=$1',['legacy_backfill']],
 ['update public.packet_render_jobs set status=$1',['rendering']],
 ['update public.packet_render_jobs set delivery_eligibility=$1',['ineligible']],
 ['update public.packet_render_jobs set output_storage_path=$1',[null]],
 ['update public.packet_render_jobs set output_sha256=$1',[null]]
]) {
 await db.exec('begin');await db.query(sql,params);assert.equal((await read()).packet,false,sql);await db.exec('rollback');
}
for(const role of ['anon','authenticated']){
 await db.exec(`set role ${role}`);
 await assert.rejects(()=>read(),/permission denied/);
 await assert.rejects(()=>db.query('select public.rcap_clinic_queue_materials($1::uuid[])',[[id(1)]]),/permission denied/);
 await db.exec('reset role');
}
await db.exec('set role service_role');
await assert.rejects(()=>db.query('select * from public.consumer_packet_artifact_provenance'),/permission denied/);
assert.deepEqual(await read(),{saved:true,packet:true});
const batch=await db.query('select public.rcap_clinic_queue_materials($1::uuid[]) as result',[[id(1)]]);
assert.deepEqual(batch.rows[0].result,{[id(1)]:{saved:true,packet:true}});
await db.close();
console.log(JSON.stringify({kind:'ENGINEERING_SQL_NOT_FUNCTIONAL_ACCEPTANCE',result:'PASS',checks:['owned saved matter','exact current verification and artifact','10 stale/foreign/incomplete denial mutations','anonymous and authenticated execute denial','service-only booleans without provenance table access']}));
