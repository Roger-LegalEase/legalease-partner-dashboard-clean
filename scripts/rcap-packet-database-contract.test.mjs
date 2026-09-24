import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { register } from 'node:module';
import ts from 'typescript';
import { PDFDocument } from 'pdf-lib';
import { packetTestDatabase, readPacketCatalog, buildPacketReference } from './rcap-packet-database-reference.mjs';
import { REPAIR_PATH, CONTRACT_PATH, packetCatalogQuery, comparePacketCatalog, digest } from './rcap-packet-database-contract.mjs';

register('./lib/ts-esm-loader.mjs',import.meta.url);
const { runWorkerCycle } = await import('../src/lib/rcap/render/render-worker.ts');
const root=process.cwd();
const sql = v => v === null ? 'null' : `'${String(v).replaceAll("'","''")}'`;
const partner='11111111-1111-1111-1111-111111111111';
const person='aaaaaaaa-1111-1111-1111-111111111111';
function setup(repaired=true) {
  const db=packetTestDatabase(root);
  if(repaired) db.applyFile(path.join(root,REPAIR_PATH));
  db.sql(`insert into partner_records values ('${partner}','retry-test');
    insert into rcap_persons values ('${person}','retry-test','a');
    insert into partner_packet_entitlement(partner_id,packet_cap) values ('${partner}',100);`);
  return db;
}
const row=(db,id)=>db.json(`select to_jsonb(j) from packet_render_jobs j where id=${sql(id)}`);
function seed(db,{packet=randomUUID(),hash=digest(randomUUID()),status='failed',attempts=1,max=5,next="now()-interval '1 second'",created='now()'}={}) {
  const id=randomUUID();
  // Historical fixtures are inserted through the same trigger coordination
  // required by the canonical functions. Tests never disable a constraint.
  db.sql(`insert into rcap_document_packets(id) values (${sql(packet)}) on conflict do nothing;
    select set_config('rcap.packet_mutation_authority','enqueue_packet_render_job',false);
    insert into packet_render_jobs(id,packet_id,route_id,renderer_kind,renderer_version,profile_id,profile_version,input_hash,partner_id,person_id,matter_id,max_attempts,created_at,status,error_code)
    values (${sql(id)},${sql(packet)},'MS:retry-test','packet_document_v1','1.0.0','MS','1.3.0',${sql(hash)},'${partner}','${person}',${sql(randomUUID())},${max},${created},${sql(status)},${status==='failed'?"'storage_write_failed'":'null'});
    select set_config('rcap.packet_mutation_authority','fail_packet_render_job',false);
    update packet_render_jobs set status=${sql(status)},attempt_count=${attempts},failure_disposition=${status==='failed'?"'retryable'":'null'},
      error_code=${status==='failed'?"'storage_write_failed'":'null'},next_attempt_at=${next} where id=${sql(id)};`);
  return id;
}
function retireQueued(db) {
  db.sql('update packet_render_jobs set attempt_count=max_attempts where status=\'queued\'; select release_expired_packet_render_claims()');
}

test('real database retry lifecycle, collisions and attempt limits',async t=>{
  const db=setup(false); t.after(()=>db.stop());
  db.applyFile(path.join(root,'supabase/phase-49-rcap-packet-render-jobs.sql')); // Reproduce the surviving obsolete objects.
  const packet=randomUUID(),hash=digest('collision');
  const a=seed(db,{packet,hash,created:"now()-interval '2 hours'"});
  const b=seed(db,{packet,hash,created:"now()-interval '1 hour'"});
  const target=seed(db);
  await t.test('original bulk requeue raises 23505 and rolls back unrelated target',()=>{
    assert.match(db.sqlExpectError('select requeue_retryable_packet_render_jobs()'),/packet_render_jobs_input_hash_live_unique/);
    assert.equal(row(db,target).status,'failed');
  });
  await t.test('original constraint refuses the current worker profile_version_unknown code',()=>{
    assert.match(db.sqlExpectError(`update packet_render_jobs set error_code='profile_version_unknown' where id=${sql(target)}`),/packet_render_jobs_error_code_check/);
  });
  db.applyFile(path.join(root,REPAIR_PATH));
  await t.test('duplicate siblings cannot abort unrelated retry; deterministic one-live winner',()=>{
    assert.equal(db.scalar('select requeue_retryable_packet_render_jobs()'),'2');
    assert.equal(row(db,a).status,'queued');
    assert.equal(row(db,b).failure_disposition,'terminal');
    assert.equal(row(db,target).status,'queued');
    assert.equal(db.scalar(`select count(*) from packet_render_jobs where packet_id=${sql(packet)} and input_hash=${sql(hash)} and status<>'failed'`),'1');
  });
  await t.test('duplicate history preserves row, original error, attempts and canonical winner',()=>{
    const r=row(db,b);assert.equal(r.attempt_count,1);assert.equal(r.error_code,'storage_write_failed');
    assert.equal(r.retry_reconciliation_history[0].canonical_job_id,a);
    assert.equal(r.retry_reconciliation_history[0].prior_failure_disposition,'retryable');
  });
  await t.test('live sibling prevents any second live sibling',()=>{
    const c=seed(db,{packet,hash});
    assert.equal(db.scalar('select requeue_retryable_packet_render_jobs()'),'0');
    assert.equal(row(db,c).failure_disposition,'terminal');
  });
  await t.test('future canonical retry instant is never bypassed by a later due sibling',()=>{
    const p=randomUUID(),h=digest('future');
    const first=seed(db,{packet:p,hash:h,next:"now()+interval '10 minutes'",created:"now()-interval '1 hour'"});
    const later=seed(db,{packet:p,hash:h});
    const before=row(db,first).next_attempt_at;
    db.scalar('select requeue_retryable_packet_render_jobs()');
    assert.equal(row(db,first).next_attempt_at,before);assert.equal(row(db,first).status,'failed');
    assert.equal(row(db,later).failure_disposition,'terminal');
  });
  await t.test('missing retry instant fails closed into retained terminal history',()=>{
    const id=seed(db,{next:'null'});db.scalar('select requeue_retryable_packet_render_jobs()');
    assert.equal(row(db,id).failure_disposition,'terminal');
  });
  await t.test('failed retry at max attempts is terminal, never queued',()=>{
    const id=seed(db,{attempts:5});db.scalar('select requeue_retryable_packet_render_jobs()');
    assert.equal(row(db,id).failure_disposition,'terminal');assert.equal(row(db,id).attempt_count,5);
  });
  retireQueued(db);
  await t.test('claim itself refuses queued over-limit history before housekeeping',()=>{
    const id=seed(db,{status:'queued',attempts:39,next:'null'});
    assert.equal(db.scalar("select count(*) from claim_packet_render_job('test',null,600)"),'0');
    db.scalar('select release_expired_packet_render_claims()');
    assert.equal(row(db,id).status,'failed');assert.equal(row(db,id).failure_disposition,'terminal');
    assert.equal(row(db,id).attempt_count,39);
  });
  await t.test('expired 23/5 and 39/5 claims become terminal once and cannot cycle',()=>{
    for(const attempts of [23,39]) {
      const id=seed(db,{status:'queued',attempts:0,next:'null'});
      db.scalar("select count(*) from claim_packet_render_job('test',null,600)");
      db.sql(`update packet_render_jobs set attempt_count=${attempts},claim_expires_at=now()-interval '1 second' where id=${sql(id)}`);
      assert.equal(db.scalar('select release_expired_packet_render_claims()'),'1');
      assert.equal(db.scalar('select release_expired_packet_render_claims()'),'0');
      assert.equal(db.scalar('select requeue_retryable_packet_render_jobs()'),'0');
      assert.equal(row(db,id).failure_disposition,'terminal');assert.equal(row(db,id).attempt_count,attempts);
      assert.equal(row(db,id).retry_reconciliation_history.length,1);
      assert.equal(db.scalar("select count(*) from claim_packet_render_job('test',null,600)"),'0');
    }
  });
  await t.test('mid-render lease timeout preserves canonical backoff and retires fencing',()=>{
    const id=seed(db,{status:'queued',attempts:0,next:'null'});
    const claim=db.json("select to_jsonb(c) from claim_packet_render_job('test',null,600) c");
    db.scalar(`select start_packet_render(${sql(id)},${sql(claim.fencing_token)})`);
    db.sql(`update packet_render_jobs set claim_expires_at=now()-interval '1 second' where id=${sql(id)}`);
    db.scalar('select release_expired_packet_render_claims()');
    const r=row(db,id);assert.equal(r.failure_disposition,'retryable');assert.equal(r.fencing_token,null);
    assert.ok(Date.parse(r.next_attempt_at)>Date.now()+55000);
    assert.equal(db.scalar('select requeue_retryable_packet_render_jobs()'),'0');
    assert.match(db.sqlExpectError(`select start_packet_render(${sql(id)},${sql(claim.fencing_token)})`),/fencing token/);
  });
  await t.test('concurrent housekeepers preserve one-live uniqueness and progress',async()=>{
    const p=randomUUID(),h=digest('concurrency'); seed(db,{packet:p,hash:h});seed(db,{packet:p,hash:h});
    const unrelated=seed(db);
    const results=await Promise.all([db.sqlAsync('select requeue_retryable_packet_render_jobs()'),db.sqlAsync('select requeue_retryable_packet_render_jobs()')]);
    assert.ok(results.every(r=>r.ok),JSON.stringify(results));
    assert.equal(db.scalar(`select count(*) from packet_render_jobs where packet_id=${sql(p)} and status<>'failed'`),'1');
    assert.equal(row(db,unrelated).status,'queued');
  });
  await t.test('history cannot be overwritten even by owner without canonical append',()=>{
    assert.match(db.sqlExpectError(`update packet_render_jobs set retry_reconciliation_history='[]' where id=${sql(b)}`),/retry history/);
  });
  await t.test('concurrent enqueue collision is isolated to that input, not the unrelated retry',async()=>{
    const p=randomUUID(),h=digest('enqueue-race'),loser=seed(db,{packet:p,hash:h}),unrelated=seed(db);
    db.sql(`create function test_pause_retry() returns trigger language plpgsql as $$ begin
      if new.input_hash=${sql(h)} and old.status='failed' and new.status='queued' then
        perform pg_advisory_xact_lock(93450345); perform pg_sleep(1);
      end if; return new; end $$;
      create trigger zz_test_pause_retry before update on packet_render_jobs for each row execute function test_pause_retry();`);
    const running=db.sqlAsync('select requeue_retryable_packet_render_jobs()');
    let paused=false;
    for(let i=0;i<30;i++) {
      paused=db.scalar("select exists(select 1 from pg_locks where locktype='advisory' and objid=93450345 and granted)")==='t';
      if(paused)break;
      await new Promise(resolve=>setTimeout(resolve,10));
    }
    assert.ok(paused,'requeue reached the index-race barrier');
    const winner=seed(db,{packet:p,hash:h,status:'queued',attempts:0,next:'null'});
    const result=await running;assert.equal(result.ok,true,result.err);
    assert.equal(row(db,loser).failure_disposition,'terminal');
    assert.equal(row(db,loser).retry_reconciliation_history.at(-1).reason,'concurrent_live_sibling_won');
    assert.equal(row(db,winner).status,'queued');assert.equal(row(db,unrelated).status,'queued');
    db.sql('drop trigger zz_test_pause_retry on packet_render_jobs; drop function test_pause_retry()');
  });
  await t.test('one historical row rejected by another guard cannot roll back unrelated work',()=>{
    const poison=seed(db),target=seed(db);
    db.sql(`create function test_reject_retry() returns trigger language plpgsql as $$ begin
      if new.id=${sql(poison)} and new.status='queued' then raise exception 'historical row refused'; end if;
      return new; end $$;
      create trigger zz_test_reject_retry before update on packet_render_jobs for each row execute function test_reject_retry();`);
    db.scalar('select requeue_retryable_packet_render_jobs()');
    assert.equal(row(db,target).status,'queued');assert.equal(row(db,poison).failure_disposition,'terminal');
    assert.equal(row(db,poison).retry_reconciliation_history.at(-1).requeue_sqlstate,'P0001');
    assert.equal(row(db,poison).error_code,'storage_write_failed');
    db.sql('drop trigger zz_test_reject_retry on packet_render_jobs; drop function test_reject_retry()');
  });
  await t.test('a row refusing even terminal bookkeeping stays failed without rolling back another input',()=>{
    const poison=seed(db),target=seed(db);
    db.sql(`create function test_reject_all_updates() returns trigger language plpgsql as $$ begin
      if new.id=${sql(poison)} then raise exception 'historical row refused'; end if; return new; end $$;
      create trigger zz_test_reject_all_updates before update on packet_render_jobs for each row execute function test_reject_all_updates();`);
    db.scalar('select requeue_retryable_packet_render_jobs()');
    assert.equal(row(db,target).status,'queued');assert.equal(row(db,poison).status,'failed');
    db.sql('drop trigger zz_test_reject_all_updates on packet_render_jobs; drop function test_reject_all_updates()');
  });
});

function workerCodes() {
  const source=fs.readFileSync('src/lib/rcap/render/job-contract.ts','utf8');
  const ast=ts.createSourceFile('contract.ts',source,ts.ScriptTarget.Latest,true);
  const alias=ast.statements.find(n=>ts.isTypeAliasDeclaration(n)&&n.name.text==='RenderErrorCode');
  assert.ok(alias&&ts.isUnionTypeNode(alias.type));
  const codes=alias.type.types.map(n=>{assert.ok(ts.isLiteralTypeNode(n)&&ts.isStringLiteral(n.literal));return n.literal.text;});
  const worker=ts.createSourceFile('worker.ts',fs.readFileSync('src/lib/rcap/render/render-worker.ts','utf8'),ts.ScriptTarget.Latest,true);
  const expressions=[];
  function visit(n) {
    if(ts.isCallExpression(n)&&n.expression.getText(worker)==='deps.queue.fail') {
      const arg=n.arguments[2];
      if(ts.isStringLiteral(arg)) codes.push(arg.text);
      else expressions.push(arg.getText(worker));
    }
    ts.forEachChild(n,visit);
  } visit(worker);
  // These two dynamic producers are the typed contract error and validation
  // result above. A new producer must be traced before this test can pass.
  assert.deepEqual(expressions.sort(),['code','local.errorCode']);
  codes.push('render_failed');
  return [...new Set(codes)].sort();
}

test('unchanged production worker with real queue RPCs and persisted failure vocabulary',async t=>{
  const db=setup();t.after(()=>db.stop());
  const id=seed(db,{status:'queued',attempts:0,next:'null'});
  const before=row(db,id), objects=new Map(); let uploads=0;
  const pdf=await PDFDocument.create();pdf.addPage([612,792]);const bytes=Buffer.from(await pdf.save());
  const queue={
    async releaseExpired(){return Number(db.scalar('select release_expired_packet_render_claims()'));},
    async requeueRetryable(){return Number(db.scalar('select requeue_retryable_packet_render_jobs()'));},
    async claim(){const r=db.json("select to_jsonb(c) from claim_packet_render_job('test',null,600) c");return r&&Object.fromEntries(Object.entries(r).map(([k,v])=>[k.replace(/_([a-z])/g,(_,c)=>c.toUpperCase()),v]));},
    async startRender(j,f){return db.scalar(`select start_packet_render(${sql(j)},${sql(f)})`)==='t';},
    async startValidation(j,f){return db.scalar(`select start_packet_validation(${sql(j)},${sql(f)})`)==='t';},
    async fail(j,f,c,d,r){return db.scalar(`select fail_packet_render_job(${sql(j)},${sql(f)},${sql(c)},${sql(d)},${r})`);},
    async finalize(i){const r=db.json(`select to_jsonb(f) from finalize_packet_render_job(${[i.jobId,i.fencingToken,i.outputStoragePath,i.localSha256,i.localNormalizedSha256,i.storedSha256,i.storedNormalizedSha256].map(sql)},${i.outputByteCount},${i.outputPageCount},${sql(i.containerDigest)}) f`);return {accountingResult:r.accounting_result,deliveryEligibility:r.delivery_eligibility};}
  };
  const deps={queue,workerId:'test',containerDigest:'sha256:'+'a'.repeat(64),
    allowlists:{allowedSourceShas:new Set(),knownProfileVersions:new Set(['1.3.0']),supportedRendererKinds:new Set(['packet_document_v1'])},
    renderer:{async render(){return bytes;}},storage:{
      async upload(p,b){uploads++;if(uploads===1)return {ok:false,reason:'HTTP 520'};objects.set(p,b);return {ok:true};},
      async read(p){return objects.get(p)??null;}
    }};
  await t.test('first actual worker upload 520 is recorded retryably',async()=>{
    const result=await runWorkerCycle(deps);assert.deepEqual(result,{outcome:'failed',jobId:id,errorCode:'storage_write_failed',disposition:'retryable'});
    assert.equal(row(db,id).attempt_count,1);assert.equal(objects.size,0);
  });
  await t.test('actual worker cannot claim target before its canonical 60-second backoff',async()=>{
    const r=row(db,id);assert.ok(Date.parse(r.next_attempt_at)>Date.now()+55000);
    assert.deepEqual(await runWorkerCycle(deps),{outcome:'idle'});assert.equal(uploads,1);
    // Advance only this disposable database's fixture time, never hosted time.
    db.sql(`update packet_render_jobs set next_attempt_at=now()-interval '1 millisecond' where id=${sql(id)}`);
  });
  await t.test('due same target renders, re-reads stored bytes and finalizes once',async()=>{
    const r=await runWorkerCycle(deps);assert.equal(r.outcome,'finalized');assert.equal(r.jobId,id);
    const j=row(db,id);assert.equal(j.status,'artifact_validated');assert.equal(j.attempt_count,2);
    for(const k of ['id','packet_id','input_hash','partner_id','person_id','matter_id'])assert.equal(j[k],before[k]);
    assert.equal(objects.size,1);assert.equal(db.scalar('select count(*) from packet_render_jobs'),'1');
    assert.equal(db.scalar('select count(*) from rcap_document_packets'),'1');
    assert.equal(db.scalar('select count(*) from packet_credit_ledger'),'1');
    assert.equal(j.output_sha256,digest(bytes));assert.ok(j.normalized_output_sha256);
    assert.deepEqual(await runWorkerCycle(deps),{outcome:'idle'});assert.equal(uploads,2);
  });
  const historical=fs.readFileSync('supabase/phase-49-rcap-packet-render-jobs.sql','utf8').match(/constraint packet_render_jobs_error_code_check[\s\S]*?\n  \)/i)?.[0];
  assert.ok(historical,'historical error constraint must be found');
  const codes=[...new Set([...workerCodes(),...[...historical.matchAll(/'([a-z_]+)'/g)].map(m=>m[1]),'participant_deletion_cancelled'])].sort();
  for(const code of codes)await t.test(`real fail RPC persists ${code}`,()=>{
    const job=seed(db,{status:'queued',attempts:0,next:'null'});
    const c=db.json("select to_jsonb(c) from claim_packet_render_job('codes',null,600) c");
    assert.equal(c.id,job);assert.equal(db.scalar(`select fail_packet_render_job(${sql(job)},${sql(c.fencing_token)},${sql(code)},'test',false)`),'terminal');
    assert.equal(row(db,job).error_code,code);
  });
  await t.test('unknown codes remain rejected; catalog constraint is the exact derived union',()=>{
    const def=readPacketCatalog(db)['constraint:packet_render_jobs.packet_render_jobs_error_code_check'].definition;
    const declared=[...new Set([...def.matchAll(/'([a-z_]+)'/g)].map(m=>m[1]))].sort();assert.deepEqual(declared,codes);
    const job=seed(db,{status:'queued',attempts:0,next:'null'}),c=db.json("select to_jsonb(c) from claim_packet_render_job('codes',null,600) c");
    assert.match(db.sqlExpectError(`select fail_packet_render_job(${sql(job)},${sql(c.fencing_token)},'invented_code','test',false)`),/packet_render_jobs_error_code_check/);
    db.scalar(`select fail_packet_render_job(${sql(job)},${sql(c.fencing_token)},'render_failed','test cleanup',false)`);
  });
  await t.test('real failed attempts stop at max_attempts with exponential canonical backoff',()=>{
    const job=seed(db,{status:'queued',attempts:0,max:3,next:'null'});
    for(let attempt=1;attempt<=3;attempt++) {
      const c=db.json("select to_jsonb(c) from claim_packet_render_job('cap',null,600) c");assert.equal(c.id,job);
      const disposition=db.scalar(`select fail_packet_render_job(${sql(job)},${sql(c.fencing_token)},'storage_write_failed','HTTP 520',true)`);
      const r=row(db,job);assert.equal(r.attempt_count,attempt);
      if(attempt<3) {
        assert.equal(disposition,'retryable');assert.ok(Date.parse(r.next_attempt_at)>Date.now()+30*2**attempt*1000-2000);
        assert.equal(db.scalar('select requeue_retryable_packet_render_jobs()'),'0');
        db.sql(`update packet_render_jobs set next_attempt_at=now()-interval '1 millisecond' where id=${sql(job)}`);
        assert.equal(db.scalar('select requeue_retryable_packet_render_jobs()'),'1');
      } else {assert.equal(disposition,'terminal');assert.equal(r.next_attempt_at,null);}
    }
    assert.equal(db.scalar('select requeue_retryable_packet_render_jobs()'),'0');
    assert.equal(db.scalar("select count(*) from claim_packet_render_job('cap',null,600)"),'0');
  });
});

test('source-derived Phase-50 complete postcondition authority',async t=>{
  const reference=buildPacketReference(root),committed=JSON.parse(fs.readFileSync(CONTRACT_PATH,'utf8'));
  assert.deepEqual(reference,committed,'committed catalog must reproduce from exact source, never from live acceptance');
  for(const [name,value] of Object.entries(reference.current))await t.test(`mutation rejects missing ${name}`,()=>{
    const changed=structuredClone(reference.current);delete changed[name];
    assert.ok(comparePacketCatalog(reference.current,changed).some(r=>r.name===name));
    if(value&&typeof value==='object') {changed[name]={};assert.ok(comparePacketCatalog(reference.current,changed).length>0||Object.keys(value).length===0);}
  });
  const db=setup();t.after(()=>db.stop());
  await t.test('exact repaired database passes; worker/browser/server grants remain separated',()=>{
    assert.deepEqual(comparePacketCatalog(reference.current,readPacketCatalog(db)),[]);
    for(const role of ['anon','authenticated'])assert.match(db.sqlExpectError(`set role ${role}; select requeue_retryable_packet_render_jobs()`),/permission denied/);
    assert.equal(db.scalar("select has_function_privilege('rcap_render_worker','requeue_retryable_packet_render_jobs()','EXECUTE')"),'t');
    assert.equal(db.scalar("select has_function_privilege('rcap_packet_delivery','requeue_retryable_packet_render_jobs()','EXECUTE')"),'f');
  });
  const mutations=[
    ['obsolete unfenced claim',"create function public.claim_packet_render_job(text,text[]) returns integer language sql security definer as 'select 0'"],
    ['browser replacement wrapper',"create function public.unsafe_retry_wrapper() returns integer language sql security definer as 'select public.requeue_retryable_packet_render_jobs()'"],
    ['obsolete credit RPC',"create function public.consume_rcap_packet_credit(text,text,uuid) returns integer language sql security definer as 'select 0'"],
    ['anon worker execution','grant execute on function public.fail_packet_render_job(uuid,uuid,text,text,boolean) to anon'],
    ['authenticated worker execution','grant execute on function public.claim_packet_render_job(text,text[],integer) to authenticated'],
    ['PUBLIC worker execution','grant execute on function public.requeue_retryable_packet_render_jobs() to public'],
    ['stale retry body',"create or replace function public.requeue_retryable_packet_render_jobs() returns integer language sql security definer as 'select 0'"],
    ['wrong claim signature','drop function claim_packet_render_job(text,text[],integer)'],
    ['wrong claim body',db.scalar("select pg_get_functiondef('claim_packet_render_job(text,text[],integer)'::regprocedure)").replace('and j.attempt_count < j.max_attempts','and true')],
    ['stale lease release',fs.readFileSync('supabase/phase-50-rcap-packet-delivery-hardening.sql','utf8').split('create or replace function public.release_expired_packet_render_claims()')[1].split('create or replace function public.requeue_retryable_packet_render_jobs()')[0].replace(/^/, 'create or replace function public.release_expired_packet_render_claims()')],
    ['missing fencing trigger','alter table packet_render_jobs disable trigger guard_packet_render_job_transition'],
    ['missing lease column','alter table packet_render_jobs drop column claim_expires_at'],
    ['stale error constraint',"alter table packet_render_jobs drop constraint packet_render_jobs_error_code_check; alter table packet_render_jobs add constraint packet_render_jobs_error_code_check check(error_code is null or error_code='render_failed')"],
    ['missing one-live uniqueness','drop index packet_render_jobs_input_hash_live_unique'],
    ['public artifact bucket',"update storage.buckets set public=true where id='rcap-packet-artifacts-private'"],
    ['wrong artifact size',"update storage.buckets set file_size_limit=1048576 where id='rcap-packet-artifacts-private'"],
    ['wrong artifact MIME',"update storage.buckets set allowed_mime_types=array['text/plain'] where id='rcap-packet-artifacts-private'"],
    ['missing artifact bucket',"delete from storage.buckets where id='rcap-packet-artifacts-private'"],
    ['browser direct DML','grant update on packet_render_jobs to authenticated'],
    ['restored obsolete policy','create policy packet_render_jobs_service_role_all on packet_render_jobs for all to service_role using(true) with check(true)']
  ];
  for(const [name,mutation] of mutations)await t.test(`real catalog mutation: ${name}`,()=>{
    const result=db.sql(`begin; ${mutation}; ${packetCatalogQuery()} rollback;`).trim().split('\n').find(line=>line.startsWith('{'));
    const raw=JSON.parse(result);
    for(const [key,value] of Object.entries(raw))if(key.startsWith('functions:'))for(const fn of Object.values(value)){fn.definitionSha256=digest(fn.definition);delete fn.definition;}
    assert.ok(comparePacketCatalog(reference.current,raw).length>0,`${name} was falsely certified`);
  });
});
