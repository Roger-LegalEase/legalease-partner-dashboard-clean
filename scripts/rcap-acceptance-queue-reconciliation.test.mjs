import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { retainPaymentFixture, ACCEPTANCE_PROJECT } from './rcap-acceptance-fixture-retention.mjs';
import { HISTORICAL, CLINIC, AUTHORIZATION, classifyInventory, inventorySql, applySql, run } from './rcap-acceptance-queue-reconciliation.mjs';
import { packetApplicationTestDatabase } from './rcap-packet-database-reference.mjs';
const measured=JSON.parse(fs.readFileSync('docs/rcap/grade-a/handoffs/ACCEPTANCE_QUEUE_36186574507_INVENTORY.json')).inventory;
const options={project:ACCEPTANCE_PROJECT,apply:true,ownerAuthorization:AUTHORIZATION};
const clone=()=>structuredClone(measured);
const sqlLiteral=x=>`'${String(x).replaceAll("'","''")}'`;

test('read-only default, double authorization and exact project guard',async()=>{
 const queries=[];
 const query=async q=>{queries.push(q);return [{inventory:measured}];};
 assert.equal((await run({project:ACCEPTANCE_PROJECT,query})).mode,'read-only');
 assert.equal(queries.length,1);assert.match(queries[0],/^begin read only;/);
 for(const change of [{apply:true},{apply:true,ownerAuthorization:'yes'}, {ownerAuthorization:AUTHORIZATION},
   {project:'wwtwtsmywnckfkdaqqeg'},{project:'another-project'}]) {
   queries.length=0;await assert.rejects(run({project:ACCEPTANCE_PROJECT,query,...change}));assert.equal(queries.length,0);
 }
 await assert.rejects(applySql(measured,{project:ACCEPTANCE_PROJECT,ownerAuthorization:AUTHORIZATION}));
});

test('live inventory classifies all 20, separately binds Clinic, refuses drift',()=>{
 const report=classifyInventory(measured);assert.equal(report.applyAllowed,true);assert.equal(report.orphanCount,20);
 assert.equal(report.classifications.filter(c=>c.classification==='DELIVERY_OR_ACCOUNTING_HISTORY_RETAIN').length,14);
 assert.equal(report.classifications.filter(c=>c.classification==='TERMINAL_SYNTHETIC_HISTORY_RETAIN').length,4);
 const changes=[
  s=>s.rows[2].claimable=false,
  s=>s.rows[0].claimable=true,
  s=>s.rows[2].known_payment_fixture_user=false,
  s=>s.rows[2].job.consumer_auth_user_id=CLINIC.user,
  s=>s.rows[2].job.partner_id=CLINIC.event,
  s=>s.rows[2].provenance=1,
  s=>s.rows[2].delivery_events=1,
  s=>s.rows[2].payment_consumption=1,
  s=>s.rows[2].live_siblings=1,
  s=>s.rows.at(-1).job.attempt_count=1,
  s=>s.rows.at(-1).job.sponsored_session_id=CLINIC.event,
  s=>s.clinic.entitlement.used=1,
  s=>s.clinic.generated=1,
  s=>s.clinic.pending[0].event=CLINIC.session,
  s=>s.functions.claim_packet_render_job='drift',
  s=>s.foreignKeys.push({table:'unknown_dependency'}),
  s=>s.claimOrder.push('unrelated'),
  s=>s.housekeeping.push('unrelated')
 ];
 for(const change of changes){const s=clone();change(s);assert.equal(classifyInventory(s).applyAllowed,false,change.toString());}
});

test('payment retention cannot orphan, delete evidence, affect another run or sponsor; repeat is idempotent',async()=>{
 const namespace={briefcaseItemId:HISTORICAL[0].item,authUserId:'b6dc86a3-12bb-490d-b130-48d95d426a1e',renderJobId:HISTORICAL[0].id};
 for(const status of ['delivered','artifact_validated','failed','queued']) {
  const fixture={ownerMatches:true,jobs:[{id:namespace.renderJobId,status,owner:namespace.authUserId,item:namespace.briefcaseItemId,partner:null,sponsored:null,sponsoredItem:null}],consumptions:status==='delivered'?[{id:'payment-identity',owner:namespace.authUserId,item:namespace.briefcaseItemId,job:namespace.renderJobId}]:[]};
  const before=structuredClone(fixture);
  const sql=async q=>{assert.match(q,/^select /);assert.doesNotMatch(q,/\b(delete|update|insert|truncate)\b/i);assert.ok(q.includes(namespace.briefcaseItemId));assert.ok(q.includes(namespace.authUserId));assert.ok(q.includes(namespace.renderJobId));return {ok:true,json:[{fixture}]};};
  const a=await retainPaymentFixture({project:ACCEPTANCE_PROJECT,namespace,sql});
  assert.deepEqual(await retainPaymentFixture({project:ACCEPTANCE_PROJECT,namespace,sql}),a);
  assert.deepEqual(fixture,before);
  fixture.jobs[0].sponsored=CLINIC.event;await assert.rejects(retainPaymentFixture({project:ACCEPTANCE_PROJECT,namespace,sql}));
  fixture.jobs[0].sponsored=null;fixture.jobs[0].owner=CLINIC.user;await assert.rejects(retainPaymentFixture({project:ACCEPTANCE_PROJECT,namespace,sql}));
 }
 let calls=0;await assert.rejects(retainPaymentFixture({project:'wwtwtsmywnckfkdaqqeg',namespace,sql:()=>{calls++;}}));assert.equal(calls,0);
 const source=fs.readFileSync('scripts/rcap-hosted-acceptance-payment.mjs','utf8');
 assert.doesNotMatch(source,/delete from public\.(consumer_briefcase_items|consumer_packet_payment_consumption)/);
 assert.equal(source.match(/import \{ retainPaymentFixture \}/g)?.length,1,'no tool import inside immutable worker probe');
 assert.match(source,/evidence.fixtureCleanup = await retainPaymentFixture/);
});

test('real PostgreSQL guards: exact three-row reconciliation, retained history, race refusal, idempotence',async()=>{
 const db=packetApplicationTestDatabase(process.cwd());
 try {
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
  const read=async()=>db.json(`select inventory from (${await inventorySql()}) s`);
  const unrelated=structuredClone(measured.rows[2].job);
  unrelated.id='ffffffff-ffff-4fff-8fff-ffffffffffff';unrelated.input_hash='f'.repeat(64);
  unrelated.status='queued';unrelated.failure_disposition=null;unrelated.next_attempt_at='infinity';
  db.sql(`set session_replication_role=replica; insert into packet_render_jobs select * from jsonb_populate_record(null::packet_render_jobs,${sqlLiteral(JSON.stringify(unrelated))}::jsonb); set session_replication_role=origin;`);
  const queuedOther=await read();assert.equal(classifyInventory(queuedOther).applyAllowed,true);
  db.sql(`set session_replication_role=replica; update packet_render_jobs set status='failed',failure_disposition='retryable',next_attempt_at=now() where id='${unrelated.id}';set session_replication_role=origin;`);
  const retryOther=await read();await assert.rejects(applySql(retryOther,options),/set differs|unrelated/);
  assert.equal(db.scalar('select count(*) from rcap_record_events'),'0');
  db.sql(`set session_replication_role=replica; update packet_render_jobs set status='queued',failure_disposition=null,next_attempt_at='infinity' where id='${unrelated.id}';set session_replication_role=origin;`);
  const before=await read();assert.equal(classifyInventory(before).applyAllowed,true,JSON.stringify(classifyInventory(before).refusals));
  const rawBefore=db.json('select jsonb_agg(to_jsonb(j) order by id) from packet_render_jobs j');
  const command=await applySql(before,options);
  // New unrelated due job invalidates the atomic snapshot before any update.
  db.sql(`update packet_render_jobs set next_attempt_at=now()+interval '1 day' where id='${HISTORICAL[0].id}'`);
  assert.match(db.sqlExpectError(command),/inventory drift/);
  db.sql(`update packet_render_jobs set next_attempt_at=${sqlLiteral(before.rows.find(r=>r.job.id===HISTORICAL[0].id).job.next_attempt_at)} where id='${HISTORICAL[0].id}'`);
  const fresh=await read(); db.sql(await applySql(fresh,options));
  const after=await read();assert.equal(classifyInventory(after).applyAllowed,true,JSON.stringify(classifyInventory(after).refusals));
  assert.deepEqual(after.claimOrder,[]);assert.deepEqual(after.housekeeping,[]);
  const rawAfter=db.json('select jsonb_agg(to_jsonb(j) order by id) from packet_render_jobs j');
  const exactIds=[...HISTORICAL.map(j=>j.id),CLINIC.id];
  assert.deepEqual(rawAfter.filter(j=>!exactIds.includes(j.id)),rawBefore.filter(j=>!exactIds.includes(j.id)));
  assert.equal(db.scalar('select count(*) from rcap_record_events'), '3');
  db.sql(await applySql(after,options));
  assert.deepEqual(await read(),after);assert.equal(db.scalar('select count(*) from rcap_record_events'),'3');
  assert.match(db.sqlExpectError(`delete from packet_render_jobs where id='${HISTORICAL[0].id}'`),/never deleted/);
 } finally {db.stop();}
});
