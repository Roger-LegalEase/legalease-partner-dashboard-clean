import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { packetApplicationTestDatabase } from './rcap-packet-database-reference.mjs';
import { TARGET as CLINIC, AUTHORIZATION, inventorySql, classifyInventory, applySql, run } from './rcap-clinic-failed-target-reconciliation.mjs';
const measured=JSON.parse(fs.readFileSync('docs/rcap/grade-a/handoffs/CLINIC_RUNTIME_36204248464_INVENTORY.json')).inventory;
const options={project:'hyflxnlhpmiqxvvcoiia',apply:true,ownerAuthorization:AUTHORIZATION};
const sqlLiteral=x=>"'"+String(x).replaceAll("'","''")+"'";
function setupDatabase(db) {
  db.sql(`alter table auth.users add column email text;
   alter table rcap_document_packets add column user_id uuid,add column briefcase_id uuid,add column partner_slug text;
   create table clinic_packet_reservations(id uuid primary key,render_job_id uuid references packet_render_jobs(id));
   create table legal_aid_document_tasks(id uuid primary key,unsigned_render_job_id uuid references packet_render_jobs(id),matter_id uuid);
   alter table rcap_record_events add column from_status text,add column to_status text;
   alter table rcap_record_events alter column id set default gen_random_uuid();
   create function immutable_test_audit() returns trigger language plpgsql as $$begin raise exception 'immutable';end$$;
   create trigger immutable_test_audit before update or delete on rcap_record_events for each row execute function immutable_test_audit();`);
  // Data fixture setup only; the actual apply runs with every runtime guard on.
  db.sql(`set session_replication_role=replica;
    insert into auth.users(id,email) values ('b6dc86a3-12bb-490d-b130-48d95d426a1e','acceptance-consumer-a@rcap-acceptance.test'),('${CLINIC.user}','synthetic-clinic@test.invalid');
    insert into consumer_briefcase_items(id,user_id,item_type,jurisdiction,pathway_label,result_code,packet_type,payment_allowed,status,source_session_id,payment_status,packet_status)
      values('${CLINIC.item}','${CLINIC.user}','result','MS','test','packet_ready','custom_pleading',false,'packet_ready','${CLINIC.session}','not_applicable','not_started');
    insert into screening_sessions(session_id,partner_slug,claimed_slot_state) values('${CLINIC.session}','mvl-demo','claimed');
    insert into clinic_events(id,partner_slug,status) values('${CLINIC.event}','mvl-demo','published');
    insert into consumer_pending_screening_results(pending_id,status,claimed_matter_id,claimed_user_id,anonymous_session_id,event_id) values('${measured.clinic.pending[0].id}','CLAIMED','${CLINIC.item}','${CLINIC.user}','${CLINIC.session}','${CLINIC.event}');
    insert into clinic_cases(id,matter_id,participant_user_id,screening_session_id,event_id) values('${measured.clinic.cases[0].id}','${CLINIC.item}','${CLINIC.user}','${CLINIC.session}','${CLINIC.event}');
    insert into partner_entitlement(partner_slug) values('mvl-demo');
    insert into sponsored_packet_render_routes(route_key,jurisdiction,pathway_id,registry_track_id,packet_family_id,packet_specification_id,packet_specification_version,packet_specification_sha256,artifact_provider,artifact_source,artifact_content_type,partner_slug,program_key,clinic_event_name,active)
      values('MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal','MS','non-conviction-expungement-for-dismissal-no-disposition-or-acquittal','test','test','test','1',repeat('a',64),'test','test','application/pdf','mvl-demo','test','test',true) on conflict do nothing;
    ${measured.rows.map(r=>`insert into rcap_document_packets(id,user_id,briefcase_id,partner_slug) values('${r.job.packet_id}','${r.packet_user}','${r.packet_item}','expungement-ai-consumer') on conflict do nothing;
    insert into packet_render_jobs select * from jsonb_populate_record(null::packet_render_jobs,${sqlLiteral(JSON.stringify(r.job))}::jsonb);`).join('\n')}
    set session_replication_role=origin;`);
  db.sql(`set session_replication_role=replica; update packet_render_jobs set fencing_token='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' where id='${CLINIC.id}';set session_replication_role=origin;`);
}

test('read-only default, explicit authorization, exact project and live drift refusals',async()=>{
  const calls=[];const query=async q=>{calls.push(q);return [{inventory:measured}];};
  const result=await run({project:options.project,query});assert.equal(result.mode,'read-only');assert.equal(result.report.applyAllowed,true,JSON.stringify(result.report.refusals));
  assert.equal(calls.length,1);assert.match(calls[0],/^begin read only;/);
  for(const patch of [{project:'wwtwtsmywnckfkdaqqeg'},{apply:true},{ownerAuthorization:AUTHORIZATION},{apply:true,ownerAuthorization:'wrong'}]){
    calls.length=0;await assert.rejects(run({project:options.project,query,...patch}));assert.equal(calls.length,0);
  }
  const changes=[s=>s.releaseEligible.push('other'),s=>s.housekeeping.push('other'),s=>s.claimOrder.push('other'),s=>s.leaseExpired=false,
    s=>s.rows.at(-1).job.attempt_count=2,s=>s.rows.at(-1).job.status='claimed',s=>s.rows.at(-1).job.sponsored_session_id='other',
    s=>s.rows.at(-1).provenance=1,s=>s.rows.at(-1).delivery_events=1,s=>s.rows.at(-1).credit_ledger=1,
    s=>s.rows.at(-1).reservations=1,s=>s.clinic.entitlement.used=1,s=>s.clinic.generated=1,
    s=>s.functions.release_expired_packet_render_claims='wrong',s=>s.foreignKeys.push({table:'unknown'})];
  for(const change of changes){const s=structuredClone(measured);change(s);await assert.rejects(applySql(s,options),change.toString());}
});

test('disposable PostgreSQL: fenced expiry, exact impact, rollback, preservation and idempotence',async()=>{
  const db=packetApplicationTestDatabase(process.cwd());
  try {
    setupDatabase(db);
    db.sql(`insert into partner_records(id,partner_slug) values('bc1ed720-681e-4da5-9964-acb2affd5b12','mvl-demo') on conflict do nothing;
      ${[...new Set(measured.rows.map(r=>r.job.person_id))].map(id=>`insert into rcap_persons(id,partner_slug,match_key) values('${id}','mvl-demo','${id}') on conflict do nothing;`).join('\n')}`);
    const read=async()=>db.json(`select inventory from (${await inventorySql()}) q`);
    // Reproduce the measured dependency catalog in this disposable fixture.
    db.sql(`do $$ declare r record; begin for r in select conrelid::regclass as t,conname from pg_constraint where contype='f' and confrelid in ('public.packet_render_jobs'::regclass,'public.consumer_briefcase_items'::regclass) loop execute format('alter table %s drop constraint %I',r.t,r.conname);end loop;end $$;
      ${measured.foreignKeys.map((f,i)=>`alter table ${f.table} add constraint fixture_fk_${String(i).padStart(2,'0')} ${f.definition};`).join('\n')}`);
    const original=await read();assert.equal(classifyInventory(original).applyAllowed,true,JSON.stringify(classifyInventory(original).refusals));
    assert.match(db.sqlExpectError(`update packet_render_jobs set status='failed' where id='${CLINIC.id}'`),/authority|transition/i);
    assert.match(db.sqlExpectError(`select public.fail_packet_render_job('${CLINIC.id}','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','render_failed','test',false)`),/expired/i);
    db.sql(`update packet_render_jobs set next_attempt_at='infinity' where id='${CLINIC.id}'`);
    assert.deepEqual((await read()).releaseEligible,[CLINIC.id],'infinity does not evade canonical housekeeping');
    db.sql(`update packet_render_jobs set next_attempt_at=null where id='${CLINIC.id}'`);
    const other=structuredClone(measured.rows.at(-1).job);other.id='ffffffff-ffff-4fff-8fff-ffffffffffff';other.input_hash='f'.repeat(64);
    db.sql(`set session_replication_role=replica;insert into packet_render_jobs select * from jsonb_populate_record(null::packet_render_jobs,${sqlLiteral(JSON.stringify(other))}::jsonb);set session_replication_role=origin;`);
    await assert.rejects(applySql(await read(),options),/impact|housekeeping/);
    db.sql(`set session_replication_role=replica;update packet_render_jobs set status='queued',claim_expires_at=null,next_attempt_at='infinity' where id='${other.id}';set session_replication_role=origin;`);
    const before=await read();const command=await applySql(before,options);
    db.sql(`update packet_render_jobs set next_attempt_at=now() where id='${other.id}'`);
    assert.match(db.sqlExpectError(command),/inventory drift/);
    assert.equal(db.scalar(`select count(*) from rcap_record_events where event_type='acceptance_synthetic_queue_reconciled_36204248464'`),'0');
    db.sql(`update packet_render_jobs set next_attempt_at='infinity' where id='${other.id}'`);
    // A fault after canonical expiry must roll back the transition and audit.
    const fresh=await read();const sql=await applySql(fresh,options);
    assert.match(db.sqlExpectError(sql.replace("if n<>1", "if n<>2")),/release impact mismatch/);
    assert.deepEqual(await read(),fresh);
    db.sql(sql);
    const after=await read(),report=classifyInventory(after);assert.equal(report.applyAllowed,true,JSON.stringify(report.refusals));assert.equal(report.alreadyApplied,true);
    assert.equal(after.unrelatedJobsHash,fresh.unrelatedJobsHash);assert.deepEqual(after.clinic,fresh.clinic);
    assert.deepEqual(after.claimOrder,[]);assert.deepEqual(after.housekeeping,[]);
    const old=fresh.rows.find(r=>r.job.id===CLINIC.id).job,job=after.rows.find(r=>r.job.id===CLINIC.id).job;
    for(const k of Object.keys(old))if(!['status','failure_disposition','error_code','last_error_detail','next_attempt_at','claim_expires_at','retry_reconciliation_history','updated_at'].includes(k))assert.deepEqual(job[k],old[k],k);
    assert.equal(job.attempt_count,1);assert.equal(job.failure_disposition,'terminal');assert.equal(job.next_attempt_at,null);
    assert.equal(job.retry_reconciliation_history[0].prior_status,'validating');assert.equal(job.retry_reconciliation_history[0].claim_expires_at,old.claim_expires_at);
    db.sql(await applySql(after,options));assert.deepEqual(await read(),after);
    assert.match(db.sqlExpectError(`delete from rcap_record_events where event_type='acceptance_synthetic_queue_reconciled_36204248464'`),/immutable/);
  }finally{db.stop();}
});
