import fs from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import { spawn, execFileSync } from 'node:child_process';
import { once } from 'node:events';
import { packetApplicationTestDatabase } from './rcap-packet-database-reference.mjs';
import { normalizeCatalog, loadPacketContract, comparePacketCatalog } from './rcap-packet-database-contract.mjs';
import { buildCorrection, readRaw, equal, correctionPrerequisites } from './rcap-production-packet-forward-correction.mjs';
// The full funding ACL includes PostgreSQL17 MAINTAIN, verified natively on
// Production. PostgreSQL16 cannot model that catalog; an explicit skip is not
// transaction or concurrency evidence. PGlite18 coverage is in the sibling test.
let nativeMajor=0;
try {
 const candidates=[];
 try{candidates.push(execFileSync('sh',['-c','command -v initdb'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim());}catch{}
 candidates.push('/usr/lib/postgresql/16/bin/initdb');
 if(fs.existsSync('/usr/lib/postgresql'))for(const entry of fs.readdirSync('/usr/lib/postgresql'))candidates.push('/usr/lib/postgresql/'+entry+'/bin/initdb');
 const executable=candidates.find(p=>p&&fs.existsSync(p));
 if(executable)nativeMajor=Number(execFileSync(executable,['--version'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}).match(/PostgreSQL\) (\d+)/)?.[1]??0);
}catch{}
if(nativeMajor<17){
 test('native PostgreSQL17+ packet/funding correction and concurrent-lock suite',{skip:'installed native PostgreSQL '+nativeMajor+' cannot represent Production MAINTAIN ACL; run committed PGlite18 suite; native concurrency not executed'},()=>{});
}else{
const root=process.cwd();
const correction=buildCorrection(root);
function apply(db,sql=correction.sql) { try { return execFileSync('psql',['-h',db.root,'-p',String(db.port),'-U','postgres','-d','postgres','-X','-At','-v','ON_ERROR_STOP=1'],{input:sql,encoding:'utf8'}); } catch(error) { throw new Error(error.stderr || error.message); } }
function productionShaped(db) {
  db.sql('drop function allocate_clinic_packet_funding(uuid,uuid,text); drop function clinic_packet_dtc_authorized(uuid,uuid); drop function clinic_entry_sponsor_capacity(uuid,text); drop table clinic_packet_funding;');
  db.sql(correction.canonicalFull.data[0].definition);
  db.sql('revoke all on function get_consumer_briefcase_presentation_source(uuid,uuid) from public, anon, authenticated; grant execute on function get_consumer_briefcase_presentation_source(uuid,uuid) to service_role;');
  // These dependencies are outside packet certification. Preserve their exact triggers;
  // local inert bodies supply type dependencies only, never a runtime certificate.
  db.sql(`create function reject_tombstoned_participant_write() returns trigger language plpgsql as $$begin return new; end$$;
    create function clinic_sync_packet_reservation() returns trigger language plpgsql as $$begin return new; end$$;
    ${correction.before['trigger:consumer_briefcase_items.reject_tombstoned_consumer_briefcase_writes'].definition};
    ${correction.before['trigger:packet_render_jobs.clinic_sync_packet_reservation_after_job'].definition};`);
  db.sql(`drop trigger guard_packet_render_job_retry_history on packet_render_jobs;
    alter table packet_render_jobs drop column retry_reconciliation_history;
    drop function guard_packet_render_job_retry_history();
    alter table packet_render_jobs drop constraint packet_render_jobs_error_code_check;
    alter table packet_render_jobs add constraint packet_render_jobs_error_code_check ${correction.before['constraint:packet_render_jobs.packet_render_jobs_error_code_check'].definition};`);
  for(const key of correction.changed.filter(key=>key.startsWith('functions:')))
    for(const [signature,fn] of Object.entries(correction.before[key]??{})) {
      if(equal(fn,correction.after[key]?.[signature]))continue;
      db.sql(fn.definition+';');
      if(fn.publicExecute)db.sql(`grant execute on function public.${signature} to public;`);
    }
  const prereqs=correctionPrerequisites(root),actual=JSON.parse(db.sql(`select to_jsonb(source) from (${prereqs.query}) source`).trim());
  for(const[name,expected]of Object.entries(prereqs.expected.relations)){
    const prior=actual.relations[name];
    if(name==='processed_stripe_events'&&prior.columns.some(c=>c.name==='event_id')){db.sql('alter table processed_stripe_events rename column event_id to stripe_event_id');prior.columns.find(c=>c.name==='event_id').name='stripe_event_id';}
    for(const col of expected.columns){const existing=prior.columns.find(c=>c.name===col.name);
      if(!existing)db.sql(`alter table public.${name} add column "${col.name}" ${col.type}${col.notNull?' not null':''}`);
      else{assert.equal(existing.type,col.type);if(existing.notNull!==col.notNull)db.sql(`alter table public.${name} alter column "${col.name}" ${col.notNull?'set':'drop'} not null`);}
    }
    assert.deepEqual(prior.columns.filter(c=>!expected.columns.some(e=>e.name===c.name)),[],name+' unexpected fixture columns');
    if(prior.rls!==expected.rls)db.sql(`alter table public.${name} ${expected.rls?'enable':'disable'} row level security`);
  }
  assert.deepEqual(JSON.parse(db.sql(`select to_jsonb(source) from (${prereqs.query}) source`).trim()),prereqs.expected);
  assert.deepEqual(readRaw(db),correction.before,'local database exactly reproduces the full captured catalog');
}
test('proposed bytes derive from frozen sources and exactly nineteen captured differences',()=>{
  assert.equal(correction.sql,fs.readFileSync('scripts/fixtures/production-packet-forward-correction/proposed-forward-delta.sql','utf8'));
  assert.equal(correction.changed.length,19);
  assert.equal(correction.functions.length,15);
  assert.deepEqual(comparePacketCatalog(loadPacketContract(root).current,normalizeCatalog(correction.after)),[]);
});
test('actual PostgreSQL forward delta restores exact frozen contract and preserves correct objects/data',()=>{
 const db=packetApplicationTestDatabase(root);
 try {
  productionShaped(db);
  db.sql("create table forward_correction_unrelated_sentinel(id integer primary key, value text not null); insert into forward_correction_unrelated_sentinel values(1,'preserved');");
  // Local-only fixture insertion bypasses guards solely to seed an inert existing job.
  db.sql(`begin; set local session_replication_role=replica;
    insert into rcap_document_packets(id) values('11111111-1111-1111-1111-111111111111');
    insert into packet_render_jobs(packet_id,route_id,renderer_kind,profile_id,profile_version,input_hash,source_sha256)
      values('11111111-1111-1111-1111-111111111111','fixture-route','official_pdf','fixture-profile','1',repeat('a',64),repeat('b',64)); commit;`);
  const existingRow=db.sql('select to_jsonb(j) from packet_render_jobs j').trim();
  const before=readRaw(db);
  apply(db);
  assert.equal(db.sql("select to_jsonb(j)-'retry_reconciliation_history' from packet_render_jobs j").trim(),existingRow);
  assert.equal(db.sql('select retry_reconciliation_history from packet_render_jobs').trim(),'[]');
  const after=readRaw(db);
  assert.deepEqual(after,correction.after);
  assert.deepEqual(JSON.parse(db.sql(`select to_jsonb(c) from (${correction.canonical.query}) c`).trim()),correction.canonicalAfter);
  for(const key of Object.keys(before).filter(key=>!correction.changed.includes(key)))assert.deepEqual(after[key],before[key],key);
  assert.equal(db.sql('select value from forward_correction_unrelated_sentinel where id=1').trim(),'preserved');
  assert.throws(()=>apply(db),/packet_forward_precondition_changed/,'a repeat apply refuses instead of replaying');
 } finally {db.stop();}
});
test('catalog changes and partial repair fail before correction writes',async t=>{
 const mutations={
  'partial column':"alter table packet_render_jobs add column retry_reconciliation_history jsonb not null default '[]'::jsonb",
  'unexpected column':'alter table packet_render_jobs add column surprise integer',
  'RLS changed':'alter table packet_render_jobs disable row level security',
  'function body changed':"create or replace function public.guard_packet_delivery_events() returns trigger language plpgsql set search_path='' as $$begin return new; end$$",
  'grant changed':'grant execute on function claim_packet_render_job(text,text[],integer) to anon',
  'canonical security changed':'alter function get_consumer_briefcase_presentation_source(uuid,uuid) volatile',
  'CHECK removed':'alter table packet_render_jobs drop constraint packet_render_jobs_error_code_check',
 };
 for(const [name,sql]of Object.entries(mutations))await t.test(name,()=>{
  const db=packetApplicationTestDatabase(root);
  try {productionShaped(db);db.sql(sql);const before=readRaw(db);assert.throws(()=>apply(db),/(?:packet|canonical)_forward_precondition_changed/);assert.deepEqual(readRaw(db),before);}finally{db.stop();}
 });
});
test('concurrent transaction holding a target table prevents correction before writes',async()=>{
 const db=packetApplicationTestDatabase(root);let child;
 try{
  productionShaped(db);
  child=spawn('psql',['-h',db.root,'-p',String(db.port),'-U','postgres','-d','postgres','-X','-At'],{stdio:['pipe','pipe','pipe']});
  const ready=new Promise((resolve,reject)=>{child.stdout.on('data',b=>{if(b.toString().includes('LOCK_HELD'))resolve();});child.on('error',reject);});
  child.stdin.write("begin; lock table public.packet_render_jobs in row exclusive mode; select 'LOCK_HELD';\n");
  await ready;
  assert.throws(()=>apply(db),/could not obtain lock/);
  child.stdin.end('rollback;\n');await once(child,'exit');child=null;
  assert.deepEqual(readRaw(db),correction.before);
 }finally{if(child)child.kill();db.stop();}
});

test('postcondition failure rolls every preceding correction statement back',()=>{
 const db=packetApplicationTestDatabase(root);
 try {productionShaped(db);
 const corrupted=correction.sql.replace("default '[]'::jsonb;","default '[1]'::jsonb;");
 assert.notEqual(corrupted,correction.sql);
 assert.throws(()=>apply(db,corrupted),/packet_forward_postcondition_failed/);
 assert.deepEqual(readRaw(db),correction.before);
 assert.deepEqual(JSON.parse(db.sql(`select to_jsonb(c) from (${correction.canonicalFull.query}) c`).trim()),correction.canonicalFull.data[0]);
 }finally{db.stop();}
});

}
