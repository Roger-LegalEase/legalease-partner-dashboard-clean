import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { register } from 'node:module';
import vm from 'node:vm';
import ts from 'typescript';
import { AsyncLocalStorage } from 'node:async_hooks';
import { PDFDocument } from 'pdf-lib';
import { packetTestDatabase, packetApplicationTestDatabase, applyPacketApplicationDependencies, readPacketCatalog, buildPacketReference } from './rcap-packet-database-reference.mjs';
import { REPAIR_PATH, CORRECTION_PATH, CONTRACT_PATH, packetCatalogQuery, queueHealthQuery, comparePacketCatalog, digest } from './rcap-packet-database-contract.mjs';
import { packetDatabaseReadback } from './verify-rcap-packet-database.mjs';
import { buildMsNonConvictionVerification, MS_NONCONVICTION_ROUTE } from './lib/rcap-ms-nonconviction-fixture.mjs';

register('./lib/ts-esm-loader.mjs',import.meta.url);
globalThis.AsyncLocalStorage ??= AsyncLocalStorage;
const { AfterContext } = await import('next/dist/server/after/after-context.js');
const { workAsyncStorage } = await import('next/dist/server/app-render/work-async-storage.external.js');
const { after } = await import('./lib/next-server-esm-bridge.mjs');
const { runWorkerCycle } = await import('../src/lib/rcap/render/render-worker.ts');
const root=process.cwd();
const sql = v => v === null ? 'null' : `'${String(v).replaceAll("'","''")}'`;
const partner='11111111-1111-1111-1111-111111111111';
const person='aaaaaaaa-1111-1111-1111-111111111111';

// Compile the entire shipped module, replacing only its external clients.
// This executes getRenderJob and the actual HTTP GET, never a restatement of
// either. Unknown dependencies fail the test rather than silently becoming a
// permissive stub.
function sourceModule(relative, imports, source=fs.readFileSync(path.join(root,relative),'utf8')) {
  const compiled=ts.transpileModule(source,{fileName:relative,compilerOptions:{
    module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022
  }}).outputText;
  const loaded={exports:{}};
  const require=name=>{
    if(name==='server-only')return {};
    assert.ok(Object.hasOwn(imports,name),`unexpected dependency in ${relative}: ${name}`);
    return imports[name];
  };
  new Function('require','module','exports',compiled)(require,loaded,loaded.exports);
  return loaded.exports;
}

// The installed Next after()/AfterContext executes unchanged. Only the host's
// waitUntil transport is captured, so a late receipt must retain a real task.
function deliveryRequestScope() {
  const tasks=[],errors=[];
  const afterContext=new AfterContext({waitUntil:task=>tasks.push(task),onClose(){},onTaskError:error=>errors.push(error)});
  return {tasks,errors,run:fn=>workAsyncStorage.run({afterContext},fn)};
}
const deferred=()=>Promise.withResolvers();

// Run these exact assertions against historical source via the optional ref;
// never edit the old counterexample's defect-positive expectations.
test('delivery receipt lifetime survives response completion and exposes receipt failures',async t=>{
  const relative='src/lib/rcap/render/packet-delivery.ts';
  const source=process.env.PACKET_DELIVERY_SOURCE_REF
    ?execFileSync('git',['show',`${process.env.PACKET_DELIVERY_SOURCE_REF}:${relative}`],{encoding:'utf8'})
    :fs.readFileSync(relative,'utf8');
  const parsed=ts.createSourceFile(relative,source,ts.ScriptTarget.Latest,true);
  const declaration=parsed.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='streamAuthorizedPacket');
  assert.ok(declaration);
  const {streamAuthorizedPacket}=sourceModule(relative,{},declaration.getText(parsed));
  const bytes=Buffer.from('%PDF-1.7\n'+'existing artifact bytes\n'.repeat(20));
  const decision={ok:true,job:{id:randomUUID()},bytes,filename:'packet.pdf'};
  const input={userId:randomUUID(),waitUntil:after,chunkSize:16};

  await t.test('real Next waitUntil remains pending until the delayed completion receipt persists',async()=>{
    const scope=deliveryRequestScope(),gate=deferred(),entered=deferred(),events=[];
    const response=await scope.run(()=>streamAuthorizedPacket({async recordEvent({eventType}){
      if(eventType==='transmission_completed'){entered.resolve();await gate.promise;}
      events.push(eventType);return randomUUID();
    }},decision,input));
    assert.equal(scope.tasks.length,1,'register the lifetime task in request scope before returning');
    let finished=false;scope.tasks[0].then(()=>{finished=true;});
    assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);
    await entered.promise;
    assert.equal(finished,false,'response completion cannot release pending receipt work');
    assert.deepEqual(events,['delivery_authorized','transmission_started']);
    gate.resolve();await Promise.all(scope.tasks);
    assert.deepEqual(events,['delivery_authorized','transmission_started','transmission_completed']);
    assert.deepEqual(scope.errors,[]);
  });

  for(const eventType of ['delivery_authorized','transmission_started','transmission_completed','transmission_aborted']) {
    for(const mode of ['null','throw']) await t.test(`${eventType} ${mode} cannot fabricate a successful receipt`,async t=>{
      const scope=deliveryRequestScope(),events=[];
      t.mock.method(console,'error',()=>{}); // Next reports the same error through onTaskError below.
      const ports={async recordEvent(event){
        if(event.eventType===eventType){if(mode==='throw')throw new Error('injected receipt failure');return null;}
        events.push(event.eventType);return randomUUID();
      }};
      const start=()=>scope.run(()=>streamAuthorizedPacket(ports,decision,input));
      if(eventType==='delivery_authorized')await assert.rejects(start,/receipt.*fail/);
      else {
        const response=await start();
        assert.equal(scope.tasks.length,1);
        if(eventType==='transmission_started')await assert.rejects(response.arrayBuffer(),/receipt.*fail/);
        else if(eventType==='transmission_aborted'){
          const reader=response.body.getReader();await reader.read();
          await assert.rejects(reader.cancel(),/receipt.*fail/);
        } else assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);
        await Promise.all(scope.tasks);
        assert.equal(scope.errors.length,1,'Next must observe the receipt failure');
        assert.match(scope.errors[0].message,/receipt.*fail/);
      }
      assert.ok(!events.includes(eventType));
      assert.ok(!events.includes('transmission_completed'),'failed/aborted delivery never manufactures completion');
    });
  }

  await t.test('cancel during pending start preserves event order and waits for the abort receipt',async()=>{
    const scope=deliveryRequestScope(),start=deferred(),abort=deferred(),events=[];
    const response=await scope.run(()=>streamAuthorizedPacket({async recordEvent({eventType}){
      if(eventType==='transmission_started')await start.promise;
      if(eventType==='transmission_aborted')await abort.promise;
      events.push(eventType);return randomUUID();
    }},decision,input));
    assert.equal(scope.tasks.length,1);
    const reader=response.body.getReader(),read=reader.read(),cancel=reader.cancel();
    let finished=false;scope.tasks[0].then(()=>{finished=true;});
    start.resolve();await read;await new Promise(resolve=>setImmediate(resolve));
    assert.equal(finished,false);
    assert.deepEqual(events,['delivery_authorized','transmission_started']);
    abort.resolve();await cancel;await Promise.all(scope.tasks);
    assert.deepEqual(events,['delivery_authorized','transmission_started','transmission_aborted']);
    assert.deepEqual(scope.errors,[]);
  });
});

test('missing sponsored reader dependency blocks pre-charge; legitimate correction restores the actual owner GET',async t=>{
  const configured=['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  const priorEnv=Object.fromEntries(configured.map(key=>[key,process.env[key]]));
  process.env.NEXT_PUBLIC_SUPABASE_URL='http://ephemeral-database.invalid';
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='local-transport-only';
  t.after(()=>{for(const key of configured)if(priorEnv[key]===undefined)delete process.env[key];else process.env[key]=priorEnv[key];});
  register('./lib/consumer-payment-test-loader.mjs',import.meta.url);
  const doubles=await import('./lib/consumer-payment-test-doubles.mjs');
  const [briefcase,packetInformation,identity,deliveryControl,delivery,nextServer,screening]=await Promise.all([
    import('../src/lib/expungement-ai/briefcase.ts'),
    import('../src/lib/expungement-ai/packet-information.ts'),
    import('../src/lib/expungement-ai/consumer-identity.ts'),
    import('../src/lib/rcap/render/consumer-delivery-control.ts'),
    import('../src/lib/rcap/render/packet-delivery.ts'),
    import('./lib/next-server-esm-bridge.mjs'),
    import('../src/lib/expungement-ai/authoritative-screening-result.ts')
  ]);
  const db=packetApplicationTestDatabase(root);t.after(()=>{doubles.bindEphemeralDb(null);doubles.setSession(null);db.stop();});
  doubles.bindEphemeralDb(db);
  const owner=randomUUID(),stranger=randomUUID(),item=randomUUID(),consumerPerson=randomUUID(),packet=randomUUID();
  const matter=identity.consumerMatterIdForItem(item);
  const participant=buildMsNonConvictionVerification({
    ...packetInformation,...screening,matterId:matter
  });
  const jsql=value=>`${sql(JSON.stringify(value))}::jsonb`;
  db.sql(`insert into auth.users values(${sql(owner)}),(${sql(stranger)});
    insert into consumer_briefcase_items(id,user_id,item_type,jurisdiction,pathway_label,result_code,packet_type,payment_allowed,status,payment_status,artifact_refs_json)
      values(${sql(item)},${sql(owner)},'result','MS',${sql(participant.item.pathwayLabel)},${sql(participant.item.resultCode)},${sql(participant.item.packetType)},true,'packet_ready','unpaid',${jsql(participant.item.artifactRefs)});
    insert into rcap_persons(id,partner_slug,match_key) values(${sql(consumerPerson)},'expungement-ai-consumer',${sql(identity.consumerPersonMatchKey(owner))});
    insert into consumer_packet_verifications(briefcase_item_id,consumer_auth_user_id,matter_id,status,reason,verification_hash,verification_snapshot,draft_hash,draft_snapshot,revision)
      values(${sql(item)},${sql(owner)},${sql(matter)},'verified','independent local delivery proof',${sql(participant.hash)},${jsql(participant.snapshot)},${sql(participant.verification.draftHash)},${jsql(participant.verification.draftSnapshot)},${participant.verification.revision});
    insert into rcap_document_packets(id) values(${sql(packet)});`);
  const binding=db.json(`select to_jsonb(b) from bind_consumer_checkout_verification(${sql(owner)},${sql(item)},'cs_test_local_reader_proof','stripe','expungement_packet',${sql(consumerPerson)},${sql(matter)},${sql(participant.hash)}) b`);
  assert.equal(binding.ok,true,JSON.stringify(binding));
  const payment=db.json(`select to_jsonb(p) from record_consumer_packet_payment(${sql(item)},'paid',0,5000,5000,'usd','stripe','evt_local_reader_proof','cs_test_local_reader_proof',null,null,'server_webhook','independent-local-proof','expungement_packet',${sql(consumerPerson)},${sql(matter)},${sql(participant.hash)}) p`);
  assert.equal(payment.outcome,'recorded_paid');
  const id=db.scalar(`select id from enqueue_packet_render_job(${sql(packet)},${sql(MS_NONCONVICTION_ROUTE.routeId)},'packet_document_v1','1.0.0',null,'MS',${sql(MS_NONCONVICTION_ROUTE.profileVersion)},${sql(digest('reader-proof-input'))},${sql(item)},null,${sql(consumerPerson)},${sql(matter)},5,${sql(item)},${sql(owner)})`);
  db.sql(`update packet_render_jobs set consumer_verification_hash=${sql(participant.hash)} where id=${sql(id)}`);
  const claim=db.json("select to_jsonb(c) from claim_packet_render_job('download-proof',array['packet_document_v1'],600) c");
  assert.equal(claim.id,id);
  db.scalar(`select start_packet_render(${sql(id)},${sql(claim.fencing_token)})`);
  db.scalar(`select start_packet_validation(${sql(id)},${sql(claim.fencing_token)})`);
  const pdf=await PDFDocument.create();pdf.addPage([612,792]);const bytes=Buffer.from(await pdf.save());
  const hash=digest(bytes),storagePath=`packet-artifacts/consumer/${matter}/${id}/${hash}.pdf`;
  const final=db.json(`select to_jsonb(f) from finalize_packet_render_job(${sql(id)},${sql(claim.fencing_token)},${sql(storagePath)},${sql(hash)},${sql(hash)},${sql(hash)},${sql(hash)},${bytes.length},1,${sql('sha256:'+digest('local-container'))}) f`);
  assert.equal(final.delivery_eligibility,'eligible');
  assert.equal(db.scalar('select count(*) from consumer_packet_payment_consumption'),'1');

  const queueImports={'@/lib/supabase/server':doubles};
  const currentQueue=sourceModule('src/lib/rcap/render/job-queue.ts',queueImports);
  const frozenSource=execFileSync('git',['show','4f7d209de11265d0793b7b74c728eab4efde1aa5:src/lib/rcap/render/job-queue.ts'],{cwd:root,encoding:'utf8'});
  const frozenQueue=sourceModule('src/lib/rcap/render/job-queue.ts',queueImports,frozenSource);
  assert.equal(currentQueue.getRenderJob.toString(),frozenQueue.getRenderJob.toString(),'current reader must preserve the frozen application SELECT and mapping');
  let reads=0;
  const storage=sourceModule('src/lib/rcap/render/artifact-storage.ts',{
    '@/lib/rcap/render/job-contract':await import('../src/lib/rcap/render/job-contract.ts'),
    '@/lib/supabase/server':{getSupabaseAdminClient:()=>({storage:{from(bucket){
      assert.equal(bucket,'rcap-packet-artifacts-private');
      return {async download(objectPath){reads++;assert.equal(objectPath,storagePath);return {error:null,data:new Blob([bytes],{type:'application/pdf'})};}};
    }}})}
  });
  const route=sourceModule('src/app/api/rcap/packets/[jobId]/download/route.ts',{
    'next/server':nextServer,
    '@/lib/rcap/briefcase/auth':doubles,
    '@/lib/expungement-ai/briefcase':briefcase,
    '@/lib/expungement-ai/packet-information':packetInformation,
    '@/lib/expungement-ai/consumer-identity':identity,
    '@/lib/rcap/render/consumer-delivery-control':deliveryControl,
    '@/lib/rcap/render/artifact-storage':storage,
    '@/lib/rcap/render/job-queue':{...currentQueue,getRenderJob:frozenQueue.getRenderJob},
    '@/lib/rcap/render/packet-delivery':delivery
  });
  let requestScope;
  const request=()=>{
    requestScope=deliveryRequestScope();
    return requestScope.run(()=>route.GET(new Request(`https://local.invalid/api/rcap/packets/${id}/download`),{params:Promise.resolve({jobId:id})}));
  };
  const contract=buildPacketReference(root);
  const gate=()=>packetDatabaseReadback(contract,
    JSON.parse(db.sql(packetCatalogQuery()).trim().split('\n').at(-1)),
    JSON.parse(db.sql(queueHealthQuery).trim()));
  await t.test('a missing current reader column refuses payment readiness and reproduces the actual owner 404',async()=>{
    db.sql('alter table packet_render_jobs drop column sponsored_consumer_auth_user_id');
    assert.equal(gate().passed,false);
    assert.ok(gate().failures.some(f=>f.name==='column:packet_render_jobs.sponsored_consumer_auth_user_id'));
    assert.equal(await frozenQueue.getRenderJob(id),null);
    doubles.setSession({isAuthenticated:true,userId:owner});
    assert.equal((await request()).status,404);
    assert.equal(reads,0);
  });
  db.applyFile(path.join(root,CORRECTION_PATH));
  await t.test('correct legitimate dependency passes the current pre-charge gate and the frozen reader returns the known row',async()=>{
    const readback=gate();assert.equal(readback.passed,true,JSON.stringify(readback.failures));
    const job=await frozenQueue.getRenderJob(id);
    assert.equal(job?.id,id);assert.equal(job.outputSha256,hash);assert.equal(job.consumerAuthUserId,owner);
  });
  await t.test('actual owner handler returns 200 and precisely the finalized PDF bytes and hash',async()=>{
    doubles.setSession({isAuthenticated:true,userId:owner});
    const response=await request();
    assert.equal(response.status,200,response.status===200?'':await response.text());
    assert.match(response.headers.get('content-type'),/application\/pdf/);
    const returned=Buffer.from(await response.arrayBuffer());
    assert.deepEqual(returned,bytes);assert.equal(digest(returned),hash);
    assert.equal(requestScope.tasks.length,1,'actual download handler binds Next receipt lifetime');
    await Promise.all(requestScope.tasks);assert.deepEqual(requestScope.errors,[]);
    assert.equal(db.scalar(`select status from packet_render_jobs where id=${sql(id)}`),'delivered');
    assert.equal(db.scalar(`select count(*) from packet_delivery_events where render_job_id=${sql(id)} and event_type='transmission_completed'`),'1');
    assert.equal(db.scalar('select count(*) from consumer_packet_payment_consumption'),'1');
  });
  await t.test('actual consumer grant handler binds the same Next lifetime and persists its completion receipt',async()=>{
    const grantRoute=sourceModule('src/app/api/expungement-ai/packet/artifacts/[itemId]/route.ts',{
      'next/server':nextServer,
      '@/lib/expungement-ai/briefcase':briefcase,
      '@/lib/expungement-ai/packet-information':packetInformation,
      '@/lib/expungement-ai/consumer-identity':identity,
      '@/lib/expungement-ai/privacy/api-session':{requireConsumerBriefcaseApiSession:async()=>({ok:true,userId:owner})},
      '@/lib/expungement-ai/private-delivery':{authorizeConsumerArtifactDownload:async()=>({renderJobId:id,storagePath,expectedSha256:hash,grantId:randomUUID(),fileName:'packet.pdf'})},
      '@/lib/rcap/render/artifact-storage':storage,
      '@/lib/rcap/render/job-queue':currentQueue,
      '@/lib/rcap/render/packet-delivery':delivery
    });
    const scope=deliveryRequestScope();
    const response=await scope.run(()=>grantRoute.GET(new nextServer.NextRequest(`https://local.invalid/api/expungement-ai/packet/artifacts/${item}?grant=local`),{params:Promise.resolve({itemId:item})}));
    assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),bytes);
    assert.equal(scope.tasks.length,1,'actual grant handler binds Next receipt lifetime');
    await Promise.all(scope.tasks);assert.deepEqual(scope.errors,[]);
    assert.equal(db.scalar(`select count(*) from packet_delivery_events where render_job_id=${sql(id)} and event_type='transmission_completed'`),'2');
    assert.equal(db.scalar('select count(*) from consumer_packet_payment_consumption'),'1');
  });
  await t.test('stranger and anonymous GET requests remain denied before reading storage',async()=>{
    const priorReads=reads;
    doubles.setSession({isAuthenticated:true,userId:stranger});assert.equal((await request()).status,403);
    doubles.setSession(null);assert.equal((await request()).status,401);
    assert.equal(reads,priorReads);
  });
});

function sourceDeclarations(relative,names) {
  const source=fs.readFileSync(path.join(root,relative),'utf8');
  const parsed=ts.createSourceFile(relative,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  return names.map(name=>{
    const matches=[];
    const visit=node=>{
      if((ts.isFunctionDeclaration(node)||ts.isVariableDeclaration(node))&&node.name?.getText(parsed)===name)matches.push(node);
      ts.forEachChild(node,visit);
    };
    visit(parsed);assert.equal(matches.length,1,`expected one current-source ${name}`);
    return ts.isFunctionDeclaration(matches[0])?matches[0].getText(parsed):`const ${matches[0].getText(parsed)};`;
  }).join('\n');
}

function setup(repaired=true) {
  const db=repaired?packetApplicationTestDatabase(root):packetTestDatabase(root,55,true);
  if(!repaired) applyPacketApplicationDependencies(db,root);
  db.sql(`insert into partner_records values ('${partner}','retry-test');
    insert into rcap_persons values ('${person}','retry-test','a');
    insert into partner_packet_entitlement(partner_id,packet_cap) values ('${partner}',100);`);
  return db;
}
const row=(db,id)=>db.json(`select to_jsonb(j) from packet_render_jobs j where id=${sql(id)}`);
function seed(db,{id=randomUUID(),packet=randomUUID(),hash=digest(randomUUID()),status='failed',attempts=1,max=5,next="now()-interval '1 second'",created='now()',renderer='packet_document_v1'}={}) {
  // Historical fixtures are inserted through the same trigger coordination
  // required by the canonical functions. Tests never disable a constraint.
  db.sql(`insert into rcap_document_packets(id) values (${sql(packet)}) on conflict do nothing;
    select set_config('rcap.packet_mutation_authority','enqueue_packet_render_job',false);
    insert into packet_render_jobs(id,packet_id,route_id,renderer_kind,renderer_version,source_sha256,profile_id,profile_version,input_hash,partner_id,person_id,matter_id,max_attempts,created_at,status,error_code)
    values (${sql(id)},${sql(packet)},'MS:retry-test',${sql(renderer)},'1.0.0',${renderer==='packet_document_v1'?'null':sql(digest('source-fixture'))},'MS','1.3.0',${sql(hash)},'${partner}','${person}',${sql(randomUUID())},${max},${created},${sql(status)},${status==='failed'?"'storage_write_failed'":'null'});
    select set_config('rcap.packet_mutation_authority','fail_packet_render_job',false);
    update packet_render_jobs set status=${sql(status)},attempt_count=${attempts},failure_disposition=${status==='failed'?"'retryable'":'null'},
      error_code=${status==='failed'?"'storage_write_failed'":'null'},next_attempt_at=${next} where id=${sql(id)};`);
  return id;
}
function retireQueued(db) {
  db.sql('update packet_render_jobs set attempt_count=max_attempts where status=\'queued\'; select release_expired_packet_render_claims()');
}

test('sponsored regeneration preserves durable attribution and idempotent accounting',async t=>{
  const db=packetApplicationTestDatabase(root);t.after(()=>db.stop());
  const migration=path.join(root,'supabase/migrations/20260924172645_preserve_sponsored_regeneration_attribution.sql');
  const signature='public.finalize_sponsored_packet_generation_for_route(text,uuid,uuid,text,jsonb,uuid)';
  const jsql=value=>`${sql(JSON.stringify(value))}::jsonb`;
  const route=db.json("select to_jsonb(r) from sponsored_packet_render_routes r where route_key='IL:felony-prostitution-relief'");
  const sponsor=randomUUID(),event=randomUUID(),sponsorPerson=randomUUID();
  db.sql(`insert into partner_records values(${sql(sponsor)},${sql(route.partner_slug)});
    insert into rcap_persons values(${sql(sponsorPerson)},${sql(route.partner_slug)},'regeneration-attribution-test');
    insert into partner_packet_entitlement(partner_id,packet_cap) values(${sql(sponsor)},20);
    insert into partner_entitlement(partner_slug,screenings_allowed) values(${sql(route.partner_slug)},20);
    insert into clinic_events(id,partner_slug,name,jurisdiction,status,sponsorship_allocation)
      values(${sql(event)},${sql(route.partner_slug)},'Synthetic regeneration proof','IL','published',20);`);
  const accounting=()=>db.json(`select jsonb_build_object(
    'entitlement',(select to_jsonb(e) from partner_entitlement e where partner_slug=${sql(route.partner_slug)}),
    'credits',(select jsonb_agg(to_jsonb(l) order by id) from packet_credit_ledger l),
    'events',(select jsonb_agg(to_jsonb(e) order by id) from rcap_record_events e),
    'analytics',(select jsonb_agg(to_jsonb(a) order by id) from rcap_screening_analytics_events a))`);
  function participant(refs){
    const owner=randomUUID(),item=randomUUID(),session=randomUUID(),pending=randomUUID();
    const matter=db.scalar(`select consumer_matter_id_for_briefcase_item(${sql(item)})`);
    db.sql(`insert into auth.users values(${sql(owner)});
      insert into consumer_briefcase_items(id,user_id,item_type,jurisdiction,status,artifact_refs_json,source_pending_result_id)
        values(${sql(item)},${sql(owner)},'result','IL','packet_ready',${jsql(refs)},${sql(pending)});
      insert into consumer_pending_screening_results(pending_id,status,claimed_matter_id,claimed_user_id,anonymous_session_id,product,partner_slug,jurisdiction,event_id)
        values(${sql(pending)},'CLAIMED',${sql(item)},${sql(owner)},${sql(session)},'rcap_partner',${sql(route.partner_slug)},'IL',${sql(event)});
      insert into screening_sessions(session_id,flow_mode,partner_benefit_active,partner_slug,jurisdiction,claimed_slot_state,status)
        values(${sql(session)},'rcap',true,${sql(route.partner_slug)},'IL','claimed','in_progress');
      insert into clinic_cases(id,event_id,participant_user_id,screening_session_id,matter_id,jurisdiction,route_disposition)
        values(${sql(randomUUID())},${sql(event)},${sql(owner)},${sql(session)},${sql(item)},'IL','packet');`);
    return {owner,item,session,matter};
  }
  function validatedArtifact(p,revision){
    const verification=digest(`${p.item}:verification:${revision}`),packet=randomUUID(),sha=digest(`${p.item}:artifact:${revision}`);
    const snapshot={schemaVersion:'expungement-ai/final-verification/v1',jurisdiction:'IL',pathwayId:route.pathway_id,selectedTrackId:route.registry_track_id,revision};
    db.sql(`insert into consumer_packet_verifications(briefcase_item_id,consumer_auth_user_id,matter_id,status,reason,verification_hash,verification_snapshot,draft_hash,draft_snapshot,revision)
      values(${sql(p.item)},${sql(p.owner)},${sql(p.matter)},'verified','synthetic regeneration proof',${sql(verification)},${jsql(snapshot)},${sql(verification)},'{"schemaVersion":"expungement-ai/protected-packet-draft/v1"}',${revision})
      on conflict(briefcase_item_id) do update set verification_hash=excluded.verification_hash,verification_snapshot=excluded.verification_snapshot,revision=excluded.revision;
      insert into rcap_document_packets(id) values(${sql(packet)});`);
    const job=db.scalar(`select id from enqueue_packet_render_job(
      p_packet_id=>${sql(packet)},p_route_id=>${sql(route.route_key)},p_renderer_kind=>'packet_document_v1',p_renderer_version=>'1.0.0',
      p_source_sha256=>null,p_profile_id=>'IL',p_profile_version=>'synthetic',p_input_hash=>${sql(verification)},
      p_briefcase_item_id=>${sql(p.item)},p_partner_id=>${sql(sponsor)},p_person_id=>${sql(sponsorPerson)},p_matter_id=>${sql(p.matter)},
      p_max_attempts=>5,p_consumer_briefcase_item_id=>null,p_expected_consumer_auth_user_id=>null)`);
    db.sql(`update packet_render_jobs set sponsored_route_key=${sql(route.route_key)},sponsored_session_id=${sql(p.session)},
      sponsored_clinic_event_id=${sql(event)},sponsored_consumer_briefcase_item_id=${sql(p.item)},
      sponsored_consumer_auth_user_id=${sql(p.owner)},sponsored_verification_hash=${sql(verification)} where id=${sql(job)}`);
    const claim=db.json("select to_jsonb(j) from claim_packet_render_job('attribution-proof',array['packet_document_v1'],600) j");
    assert.equal(claim.id,job);
    assert.equal(db.scalar(`select start_packet_render(${sql(job)},${sql(claim.fencing_token)})`),'t');
    assert.equal(db.scalar(`select start_packet_validation(${sql(job)},${sql(claim.fencing_token)})`),'t');
    const storagePath=`packet-artifacts/${sponsor}/${p.matter}/${job}/${sha}.pdf`;
    assert.equal(db.scalar(`select delivery_eligibility from finalize_packet_render_job(${sql(job)},${sql(claim.fencing_token)},${sql(storagePath)},${sql(sha)},${sql(sha)},${sql(sha)},${sql(sha)},128,1,'synthetic-database-proof')`),'eligible');
    return {provider:route.artifact_provider,source:route.artifact_source,contentType:route.artifact_content_type,
      packetId:p.item,renderJobId:job,verificationHash:verification,packetSpecificationId:route.packet_specification_id,
      packetSpecificationVersion:route.packet_specification_version,packetSpecificationSha256:route.packet_specification_sha256,
      packetFamily:route.packet_family_id,artifactSha256:sha,storagePath,pageCount:1,documentCount:1};
  }
  const finalize=(p,a)=>db.json(`select to_jsonb(f) from finalize_sponsored_packet_generation_for_route(
    ${sql(route.route_key)},${sql(p.session)},${sql(p.item)},${sql(a.verificationHash)},${jsql(a)},${sql(a.renderJobId)}) f`);
  const refs=p=>db.json(`select artifact_refs_json from consumer_briefcase_items where id=${sql(p.item)}`);
  const provenance=p=>db.json(`select to_jsonb(p) from consumer_packet_artifact_provenance p where briefcase_item_id=${sql(p.item)}`);
  const attribution={locale:'en',source:'synthetic-existing-claim',nested:{retained:['whole','object']}};

  await t.test('historical finalizer loses attribution after successful regeneration',()=>{
    const p=participant({attribution});
    assert.equal(finalize(p,validatedArtifact(p,1)).recorded,true);
    assert.deepEqual(refs(p).attribution,attribution);
    const next=validatedArtifact(p,2);
    assert.equal(finalize(p,next).reason,'regenerated');
    assert.equal(Object.hasOwn(refs(p),'attribution'),false);
  });
  const beforeCatalog=readPacketCatalog(db);
  const beforeRows=db.json('select jsonb_agg(to_jsonb(i) order by id) from consumer_briefcase_items i');
  db.applyFile(migration);
  const successorCatalog=readPacketCatalog(db);
  assert.deepEqual(Object.keys(successorCatalog).filter(key=>JSON.stringify(successorCatalog[key])!==JSON.stringify(beforeCatalog[key])),
    ['functions:finalize_sponsored_packet_generation_for_route'],'only the finalizer changes');
  assert.deepEqual(db.json('select jsonb_agg(to_jsonb(i) order by id) from consumer_briefcase_items i'),beforeRows,'migration does not rewrite existing metadata');
  db.applyFile(migration);
  assert.deepEqual(readPacketCatalog(db),successorCatalog,'migration safely accepts its exact successor');

  for(const [name,initial] of [['whole attribution',{attribution}],['missing attribution',{}],['JSON null attribution',{attribution:null}]]) {
    await t.test(name,()=>{
      const p=participant(initial),first=validatedArtifact(p,1);
      assert.deepEqual(refs(p),initial);
      assert.equal(finalize(p,first).recorded,true);
      assert.deepEqual(refs(p).attribution,initial.attribution);
      const prior=provenance(p),next={...validatedArtifact(p,2),attribution:{locale:'es',source:'must-not-replace-durable-attribution'}};
      const money=accounting();
      assert.deepEqual(finalize(p,next),{ok:true,recorded:false,counted_as:'included',reason:'regenerated'});
      const metadata={...next};delete metadata.attribution;
      assert.deepEqual(refs(p),{...metadata,...initial},'only existing attribution is combined with new artifact metadata');
      assert.deepEqual(accounting(),money,'regeneration never recounts sponsorship or credits');
      const current=provenance(p);
      assert.equal(current.revision,2);assert.equal(current.render_job_id,next.renderJobId);
      assert.equal(current.superseded_artifacts.length,1);
      assert.deepEqual(current.superseded_artifacts[0].artifact,prior.artifact);
      assert.deepEqual(finalize(p,next),{ok:true,recorded:false,counted_as:'included',reason:'already_finalized'});
      assert.deepEqual(provenance(p),current,'exact replay leaves revision/history unchanged');
      assert.deepEqual(accounting(),money,'exact replay consumes nothing');
      assert.deepEqual(refs(p),{...metadata,...initial});
      if(!Object.hasOwn(initial,'attribution'))assert.equal(Object.hasOwn(refs(p),'attribution'),false,'missing attribution is never invented');
    });
  }
  const functionDefinition=db.scalar(`select pg_get_functiondef(${sql(signature)}::regprocedure)`);
  db.sql(functionDefinition.replace('AS $function$','AS $function$\n-- unrecognized successor\n'));
  assert.match(db.sqlExpectError(fs.readFileSync(migration,'utf8')),/unrecognized current authority/);
});

test('forward delta repairs the legitimate predecessor without replaying later payment authority or changing historical rows',t=>{
  const db=packetApplicationTestDatabase(root,{corrected:false,deliverySuccessors:false});t.after(()=>db.stop());
  db.sql(`insert into partner_records values('${partner}','retry-test');
    insert into rcap_persons values('${person}','retry-test','a');`);
  for(let i=0;i<22;i++)seed(db);
  const priorRows=db.json('select jsonb_agg(to_jsonb(j) order by id) from packet_render_jobs j');
  const before=readPacketCatalog(db);
  const paymentKeys=Object.keys(before).filter(k=>k.startsWith('functions:')&&/payment|checkout|verification_authority|persist_consumer|paid_matter|consumption_binding/.test(k));
  assert.equal(before['column:packet_render_jobs.sponsored_consumer_auth_user_id'],undefined);
  db.applyFile(path.join(root,CORRECTION_PATH));
  const after=readPacketCatalog(db);
  assert.deepEqual(comparePacketCatalog(JSON.parse(fs.readFileSync(CONTRACT_PATH,'utf8')).current,after),[]);
  for(const key of paymentKeys)assert.deepEqual(after[key],before[key],key);
  const projected=db.json(`select jsonb_agg(to_jsonb(j)-array['sponsored_route_key','sponsored_session_id','sponsored_clinic_event_id','sponsored_consumer_briefcase_item_id','sponsored_consumer_auth_user_id','sponsored_verification_hash'] order by id) from packet_render_jobs j`);
  assert.deepEqual(projected,priorRows,'no job reset, retirement, deletion, attempt change or reconciliation during DDL');
  assert.equal(db.scalar('select count(*) from sponsored_packet_render_routes'),'0','DDL does not replay historical registrations or entitlements');
  assert.equal(db.scalar('select count(*) from consumer_packet_payment_consumption'),'0');
  const authority=db.scalar("select pg_get_functiondef('get_consumer_packet_artifact_authority(uuid,uuid)'::regprocedure)");
  db.sql(authority.replace('AS $function$','AS $function$\n-- unknown successor\n'));
  assert.match(db.sqlExpectError(fs.readFileSync(CORRECTION_PATH,'utf8')),/unrecognized current authority/);
});

async function actualClaimOrder(db,jobId,rendererKind='packet_document_v1') {
  const declarations=sourceDeclarations('scripts/rcap-hosted-acceptance-payment.mjs',['claimablePredicate','readClaimOrder']);
  const context={jobId,rendererKind,itemId:null,sqlText:value=>String(value).replaceAll("'","''"),redactSecrets:String,
    async sql(query) {
      assert.match(query.trim(),/^(select|with)\b/i);
      assert.doesNotMatch(query,/\b(insert|update|delete|call|release_expired_packet_render_claims|requeue_retryable_packet_render_jobs)\s*\(/i);
      try {
        const result=db.sql(`begin read only; select coalesce(json_agg(q),'[]') from (${query.trim().replace(/;$/,'')}) q; rollback;`);
        return {ok:true,status:200,json:JSON.parse(result.split('\n').filter(line=>!['BEGIN','ROLLBACK',''].includes(line)).join('\n'))};
      } catch(error) {return {ok:false,status:400,json:{message:String(error.stderr??error.message)}};}
    }
  };
  return JSON.parse(JSON.stringify(await vm.runInNewContext(`${declarations}\nreadClaimOrder(jobId,rendererKind)`,context)));
}

test('actual read-only claim-order diagnostic matches the canonical housekeeping then claim sequence',async t=>{
  const db=setup();t.after(()=>db.stop());
  const expired=seed(db,{status:'queued',attempts:0,next:'null',created:"'2020-01-01'"});
  assert.equal(db.scalar("select id from claim_packet_render_job('diagnostic',array['packet_document_v1'],600)"),expired);
  db.sql(`update packet_render_jobs set claim_expires_at=now()-interval '1 second' where id=${sql(expired)}`);
  const high='eeeeeeee-2222-4222-8222-222222222222',low='22222222-2222-4222-8222-222222222222';
  seed(db,{id:high,status:'queued',attempts:0,next:'null',created:"'2020-02-01'"});
  seed(db,{id:low,status:'queued',attempts:0,next:'null',created:"'2020-02-01'"});
  const due=seed(db,{created:"'2020-01-15'"});
  const exhausted=seed(db,{status:'queued',attempts:5,next:'null',created:"'2019-01-01'"});
  seed(db,{status:'queued',attempts:0,next:"now()+interval '1 hour'",created:"'2018-01-01'"});
  seed(db,{status:'queued',attempts:0,next:'null',created:"'2017-01-01'",renderer:'official_pdf_overlay'});
  const target=seed(db,{status:'queued',attempts:0,next:'null',created:"'2020-03-01'"});
  const before=db.json('select json_agg(j order by id) from packet_render_jobs j');
  const diagnostic=await actualClaimOrder(db,target);
  assert.equal(diagnostic.readOutcome,'read',JSON.stringify(diagnostic));
  assert.deepEqual(db.json('select json_agg(j order by id) from packet_render_jobs j'),before,'diagnostic must not mutate the queue');
  await t.test('future retries, exhausted queued rows and unsupported renderers are excluded',()=>{
    assert.equal(diagnostic.currentlyClaimable,5);
    assert.equal(diagnostic.targetClaimRank,5);
  });
  await t.test('expired claims and due failed predecessors are included before housekeeping executes',()=>{
    assert.deepEqual(diagnostic.predecessors.map(r=>r.id),[expired,due,low,high]);
  });
  await t.test('equal timestamps break ties by id exactly as the actual claim RPC does',()=>{
    db.scalar('select release_expired_packet_render_claims()');
    db.scalar('select requeue_retryable_packet_render_jobs()');
    const actual=[];
    for(let i=0;i<5;i++)actual.push(db.scalar("select id from claim_packet_render_job('diagnostic',array['packet_document_v1'],600)"));
    assert.deepEqual(actual,[expired,due,low,high,target]);
    assert.deepEqual([diagnostic.predictedFirstClaim,...diagnostic.predecessors.slice(1).map(r=>r.id),target],actual);
    assert.equal(row(db,exhausted).failure_disposition,'terminal');
    assert.equal(db.scalar("select count(*) from claim_packet_render_job('diagnostic',array['packet_document_v1'],600)"),'0');
  });
});

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
  db.applyFile(path.join(root,CORRECTION_PATH));
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
  await t.test('unexpected guard failure rejects retry without retiring history or reporting progress',()=>{
    const poison=seed(db),target=seed(db);
    db.sql(`create function test_reject_retry() returns trigger language plpgsql as $$ begin
      if new.id=${sql(poison)} and new.status='queued' then raise exception 'historical row refused'; end if;
      return new; end $$;
      create trigger zz_test_reject_retry before update on packet_render_jobs for each row execute function test_reject_retry();`);
    const before=[row(db,poison),row(db,target)];
    try {
      assert.match(db.sqlExpectError('select requeue_retryable_packet_render_jobs()'),/historical row refused/);
      assert.deepEqual([row(db,poison),row(db,target)],before);
    } finally { db.sql('drop trigger zz_test_reject_retry on packet_render_jobs; drop function test_reject_retry()'); }
  });
  await t.test('a row refusing every update causes failure instead of warning-only zero-work success',()=>{
    const poison=seed(db),target=seed(db);
    db.sql(`create function test_reject_all_updates() returns trigger language plpgsql as $$ begin
      if new.id=${sql(poison)} then raise exception 'historical row refused'; end if; return new; end $$;
      create trigger zz_test_reject_all_updates before update on packet_render_jobs for each row execute function test_reject_all_updates();`);
    const before=[row(db,poison),row(db,target)];
    try {
      assert.match(db.sqlExpectError('select requeue_retryable_packet_render_jobs()'),/historical row refused/);
      assert.deepEqual([row(db,poison),row(db,target)],before);
    } finally { db.sql('drop trigger zz_test_reject_all_updates on packet_render_jobs; drop function test_reject_all_updates()'); }
  });
  for (const [label,schema,tableName,constraint] of [
    ['unrelated unique constraint','public','unrelated_retry_fixture','unrelated_retry_unique'],
    ['same constraint name on another relation','retry_fixture','other_jobs','packet_render_jobs_input_hash_live_unique'],
    ['same relation and constraint names in another schema','retry_fixture','packet_render_jobs','packet_render_jobs_input_hash_live_unique']
  ]) await t.test(`${label} is not the expected live-input collision`,()=>{
    const poison=seed(db),target=seed(db);
    db.sql(`create schema if not exists ${schema};
      create table ${schema}.${tableName}(id integer constraint ${constraint} unique);
      insert into ${schema}.${tableName} values(1);
      create function test_unrelated_retry_unique() returns trigger language plpgsql as $$ begin
        if new.id=${sql(poison)} and new.status='queued' then insert into ${schema}.${tableName} values(1); end if;
        return new; end $$;
      create trigger zz_test_unrelated_retry_unique before update on packet_render_jobs for each row execute function test_unrelated_retry_unique();`);
    const before=[row(db,poison),row(db,target)];
    try {
      assert.match(db.sqlExpectError('select requeue_retryable_packet_render_jobs()'),new RegExp(constraint));
      assert.deepEqual([row(db,poison),row(db,target)],before);
    } finally {
      db.sql(`drop trigger zz_test_unrelated_retry_unique on packet_render_jobs; drop function test_unrelated_retry_unique(); drop table ${schema}.${tableName}`);
    }
  });
});

test('the actual queue adapter exposes SQL errors through the actual worker cycle',async t=>{
  const db=setup();t.after(()=>db.stop());
  const calls=[];
  const adapter=sourceModule('src/lib/rcap/render/job-queue.ts',{
    '@/lib/supabase/server':{getSupabaseAdminClient:()=>({
      async rpc(name) {
        assert.ok(['release_expired_packet_render_claims','requeue_retryable_packet_render_jobs'].includes(name));
        calls.push(name);
        try {
          const value=db.sql(`set role service_role; select ${name}()`).trim().split('\n').at(-1);
          return {data:Number(value),error:null};
        } catch(error) {
          return {data:null,error:{message:String(error.stderr??error.message)}};
        }
      }
    })}
  });
  await t.test('a successful empty queue remains a genuine zero-work result',async()=>{
    assert.equal(await adapter.releaseExpiredRenderClaims(),0);
    assert.equal(await adapter.requeueRetryableRenderJobs(),0);
  });
  const poison=seed(db);
  db.sql(`create function test_adapter_rejection() returns trigger language plpgsql as $$ begin
    if new.id=${sql(poison)} and new.status='queued' then raise exception 'adapter SQL failure must remain visible'; end if;
    return new; end $$;
    create trigger zz_test_adapter_rejection before update on packet_render_jobs for each row execute function test_adapter_rejection();`);
  const before=row(db,poison);
  await t.test('RPC error cannot be mapped to zero by the application adapter',async()=>{
    await assert.rejects(adapter.requeueRetryableRenderJobs(),error=>{
      assert.match(error.message,/requeue_retryable_packet_render_jobs/);
      assert.match(error.cause?.message??error.message,/adapter SQL failure must remain visible/);return true;
    });
    assert.deepEqual(row(db,poison),before);
  });
  await t.test('worker housekeeping error cannot become an idle successful cycle',async()=>{
    await assert.rejects(runWorkerCycle({containerDigest:'sha256:'+digest('local-container'),queue:{
      releaseExpired:adapter.releaseExpiredRenderClaims,
      requeueRetryable:adapter.requeueRetryableRenderJobs,
      claim:async()=>assert.fail('claim must not execute after failed housekeeping')
    }}),error=>{
      assert.match(error.message,/requeue_retryable_packet_render_jobs/);
      assert.match(error.cause?.message??error.message,/adapter SQL failure must remain visible/);return true;
    });
    assert.deepEqual(row(db,poison),before);
    assert.deepEqual(calls.slice(-2),['release_expired_packet_render_claims','requeue_retryable_packet_render_jobs']);
  });
  await t.test('release RPC permission errors are surfaced too',async()=>{
    db.sql('revoke execute on function release_expired_packet_render_claims() from service_role');
    await assert.rejects(adapter.releaseExpiredRenderClaims(),error=>{
      assert.match(error.message,/release_expired_packet_render_claims/);
      assert.match(error.cause?.message??error.message,/permission denied/);return true;
    });
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

test('actual worker cycle with real queue RPCs and persisted failure vocabulary',async t=>{
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
    assert.equal((await actualClaimOrder(db,id)).targetClaimRank,null);
    assert.deepEqual(await runWorkerCycle(deps),{outcome:'idle'});assert.equal(uploads,1);
    // Advance only this disposable database's fixture time, never hosted time.
    db.sql(`update packet_render_jobs set next_attempt_at=now()-interval '1 millisecond' where id=${sql(id)}`);
    const due=await actualClaimOrder(db,id);assert.equal(due.targetClaimRank,1);assert.equal(due.predictedFirstClaim,id);
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

test('source-derived current delivery and worker postcondition authority',async t=>{
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
