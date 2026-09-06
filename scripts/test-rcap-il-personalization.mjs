import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { register } from 'node:module';
import { ephemeralPgAvailable, startEphemeralPg } from './lib/rcap-ephemeral-pg.mjs';
register('./lib/ts-esm-loader.mjs', import.meta.url);
const { withIllinoisRegistry } = await import('./test-rcap-il-authority-fixture.mjs');
register('./lib/consumer-payment-test-loader.mjs', import.meta.url);
register('./test-rcap-il-delivery-loader.mjs', import.meta.url);
const { bindEphemeralDb } = await import('./lib/consumer-payment-test-doubles.mjs');
const { bindDeliveryDb, literal: q, sponsoredItems } = await import('./test-rcap-il-delivery-boundaries.mjs');
const { generatePaidConsumerPacket, getConsumerPacketStatus } = await import('../src/lib/expungement-ai/packet-generation.ts');
const { consumerMatterIdForItem, consumerPersonMatchKey } = await import('../src/lib/expungement-ai/consumer-identity.ts');
const { preparePersonalizedPacket } = await import('../src/lib/rcap/render/personalized-packet.ts');
const { renderClaimPacket } = await import('./rcap-render-worker.mjs');
const { runWorkerCycle } = await import('../src/lib/rcap/render/render-worker.ts');
const { getRenderJob, finalizeRenderJob } = await import('../src/lib/rcap/render/job-queue.ts');
const { authorizePacketDownload, streamAuthorizedPacket } = await import('../src/lib/rcap/render/packet-delivery.ts');
const { computeNormalizedFingerprint } = await import('../src/lib/rcap/render/job-contract.ts');
assert.equal(ephemeralPgAvailable(), true, 'ephemeral PostgreSQL required');
const previousNodeEnv = process.env.NODE_ENV;
process.env.NODE_ENV = 'test';
const db = startEphemeralPg();
const output = fs.mkdtempSync(path.join(os.tmpdir(), 'il-personalization-'));
const hash = (v) => createHash('sha256').update(typeof v === 'string' || Buffer.isBuffer(v) ? v : JSON.stringify(v)).digest('hex');
const storage = {
  async upload(relative, bytes) { const full = path.join(output, relative); fs.mkdirSync(path.dirname(full), { recursive: true });
    try { fs.writeFileSync(full, bytes, { flag: 'wx' }); return { ok: true }; } catch (e) { return { ok: false, reason: e.code === 'EEXIST' ? '409 exists' : e.message }; } },
  async read(relative) { try { return fs.readFileSync(path.join(output, relative)); } catch { return null; } }
};
function setup() {
  db.sql(`create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
    alter default privileges in schema public grant all on tables to service_role;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    create table partner_records(id uuid primary key,partner_slug text unique not null);
    create table rcap_persons(id uuid primary key default gen_random_uuid(),partner_slug text not null,match_key text not null,unique(partner_slug,match_key));
    create table rcap_document_packets(id uuid primary key default gen_random_uuid(),partner_slug text,user_id uuid,briefcase_id uuid,person_id uuid,
      state text,jurisdiction text,document_type text,pathway text,status text,petitioner_first_name text,petitioner_last_name text,
      petitioner_city text,petitioner_county text,court_county text,court_name text,cause_number text,charge text,offense_date text,
      arrest_date text,arresting_agency text,agency_case_number text,disposition_date text,conviction_date text,sentence_completion_date text,
      needs_record_review boolean,generated_plain_text text,filing_instructions text[],county_court_instructions text[],missing_fields text[],safety_disclaimer text);
    create table rcap_document_packet_inputs(document_packet_id uuid primary key,partner_slug text,input_payload jsonb);`);
  for (const phase of ['26-consumer-briefcase-items','27-consumer-checkout-metadata','28-consumer-packet-generation-status',
    '49-rcap-packet-render-jobs','50-rcap-packet-delivery-hardening','51-rcap-consumer-payment-gate',
    '52-rcap-consumer-payment-authority','53-rcap-consumer-job-binding','54-rcap-person-namespace-hardening','55-expungement-matter-payment-binding']) db.applyFile(`supabase/phase-${phase}.sql`);
  db.sql(`create schema if not exists extensions; create extension if not exists pgcrypto with schema extensions;
    alter table consumer_briefcase_items add column if not exists source_pending_result_id uuid;
    create table consumer_pending_screening_results(pending_id uuid primary key,status text,claimed_matter_id uuid references consumer_briefcase_items(id),
      claimed_user_id uuid,claimed_at timestamptz,anonymous_session_id uuid,product text,partner_slug text,jurisdiction text,profile_version text,
      candidate_route_context jsonb,screening_answers jsonb,event_id uuid);`);
  db.sql(`    create table screening_sessions(session_id uuid primary key, flow_mode text, partner_benefit_active boolean,
      partner_slug text, jurisdiction text, claimed_slot_state text, status text,
      updated_at timestamptz not null default now(), partner_access_code_id uuid, campaign_name text);
    create table clinic_events(id uuid primary key, partner_slug text, program_key text not null default 'record-clearing',
      name text, jurisdiction text, status text, sponsorship_allocation integer);
    create table clinic_cases(id uuid primary key, event_id uuid, participant_user_id uuid,
      screening_session_id uuid, matter_id uuid, jurisdiction text, route_disposition text,
      queue_status text, last_activity_at timestamptz default now(), updated_at timestamptz default now());
    create table partner_entitlement(partner_slug text primary key, screenings_used integer not null default 0,
      screenings_allowed integer not null default 0, pause_at_cap boolean not null default false,
      overage_enabled boolean not null default false, overage_packets integer not null default 0,
      overage_amount_cents integer not null default 0, overage_packet_price_cents integer not null default 5000,
      updated_at timestamptz not null default now());
    create table rcap_record_events(id uuid primary key default gen_random_uuid(), record_type text,
      record_id text, partner_slug text, event_type text, occurred_at timestamptz, actor text, metadata jsonb);
    create table rcap_screening_analytics_events(id uuid primary key default gen_random_uuid(), session_id uuid,
      partner_slug text, partner_access_code_id uuid, campaign_name text, event_type text,
      packet_route_available boolean, occurred_at timestamptz, metadata jsonb);
`);
  for (const migration of ['20260901115000_consumer_packet_artifact_provenance','20260901120000_dtc_consumer_launch_rails',
    '20260901130000_consumer_private_delivery','20260901140000_tighten_consumer_artifact_authorization',
    '20260903130000_atomic_sponsored_packet_finalization','20260906120000_sponsored_route_render_transaction']) db.applyFile(`supabase/migrations/${migration}.sql`);
  db.sql(`insert into partner_records values(${q(partnerId)},'il-clinic-sponsor');
    insert into partner_packet_entitlement(partner_id,packet_cap,overage_enabled,overage_cap) values(${q(partnerId)},20,false,0);
    insert into partner_entitlement(partner_slug,screenings_used,screenings_allowed,pause_at_cap,overage_enabled)
      values('il-clinic-sponsor',0,20,true,false);
    insert into clinic_events(id,partner_slug,name,jurisdiction,status,sponsorship_allocation)
      values(${q(eventId)},'il-clinic-sponsor','Synthetic Illinois Clinic','IL','published',20);`);
  bindEphemeralDb(db); bindDeliveryDb(db);
}
const cases = [];
const partnerId=randomUUID(), eventId=randomUUID();
function seed(name, address, sponsored=false) {
  const userId = randomUUID(), itemId = randomUUID(), personId = randomUUID();
  const matterId = consumerMatterIdForItem(itemId);
  const facts = { participant_full_legal_name: name, mailing_address: address, phone_number: '217-555-0100', email_address: `${name.split(' ')[0].toLowerCase()}@example.test`,
    conviction_county: 'Synthetic County', case_number: `SYN-${name.split(' ')[0]}`, conviction_date: '2010-01-01', conviction_as_worded: 'Synthetic conviction',
    sentence_completion_date: '2012-01-01', adverse_consequences: 'Synthetic employment consequences.', trafficking_status: 'No' };
  const snapshot = { schemaVersion: 'expungement-ai/final-verification/v1', jurisdiction: 'IL', pathwayId: 'felony-prostitution-relief',
    selectedTrackId: 'il-prostitution-j-vacate', verifiedAt: '2026-09-05T00:00:00.000Z', profileVersion: '2026-06-19-source-conversion-1',
    profileSourceFingerprint: hash('synthetic-source'), profileAuthorityFingerprint: hash('synthetic-authority'), requiredInputIds: Object.keys(facts),
    packetFamilyIdentifiers: { mode: 'custom_pleading', sourceFormIds: [] }, paymentAllowed: true, resultCode: 'packet_ready',
    dependencies: {}, screeningAnswers: {}, prefilledAnswers: {}, serverFacts: {}, packetAnswers: facts };
  const verificationHash = hash(snapshot);
  const draft = { ...snapshot, schemaVersion: 'expungement-ai/protected-packet-draft/v1', capturedAt: snapshot.verifiedAt };
  db.sql(`insert into auth.users values(${q(userId)});
    insert into rcap_persons(id,partner_slug,match_key) values(${q(personId)},'expungement-ai-consumer',${q(consumerPersonMatchKey(userId))});
    insert into consumer_briefcase_items(id,user_id,item_type,status,jurisdiction,pathway_label,result_code,packet_type,payment_allowed,payment_status,packet_status)
      values(${q(itemId)},${q(userId)},'result','packet_ready','IL','felony-prostitution-relief','packet_ready','custom_pleading',true,'unpaid','not_started');
    insert into consumer_packet_verifications(briefcase_item_id,consumer_auth_user_id,matter_id,status,reason,verification_hash,verification_snapshot,draft_hash,draft_snapshot,revision)
      values(${q(itemId)},${q(userId)},${q(matterId)},'verified','synthetic fixture',${q(verificationHash)},${q(JSON.stringify(snapshot))},${q(hash(draft))},${q(JSON.stringify(draft))},1);`);
  let sourceSessionId=null;
  if (sponsored) {
    sourceSessionId=randomUUID(); const pendingId=randomUUID();
    db.sql(`update consumer_briefcase_items set source_pending_result_id=${q(pendingId)} where id=${q(itemId)};
      insert into consumer_pending_screening_results(pending_id,status,claimed_matter_id,claimed_user_id,claimed_at,anonymous_session_id,product,partner_slug,jurisdiction,event_id)
        values(${q(pendingId)},'CLAIMED',${q(itemId)},${q(userId)},now(),${q(sourceSessionId)},'rcap_partner','il-clinic-sponsor','IL',${q(eventId)});
      insert into screening_sessions(session_id,flow_mode,partner_benefit_active,partner_slug,jurisdiction,claimed_slot_state,status)
        values(${q(sourceSessionId)},'rcap',true,'il-clinic-sponsor','IL','claimed','in_progress');
      insert into clinic_cases(id,event_id,participant_user_id,screening_session_id,matter_id,jurisdiction,route_disposition,queue_status)
        values(${q(randomUUID())},${q(eventId)},${q(userId)},${q(sourceSessionId)},${q(itemId)},'IL','packet','packet_information');`);
    sponsoredItems.set(itemId,sourceSessionId);
  } else {
  assert.equal(db.scalar(`select ok from bind_consumer_checkout_verification(${q(userId)},${q(itemId)},${q('cs-'+itemId)},'stripe','expungement_packet',${q(personId)},${q(matterId)},${q(verificationHash)})`), 't');
  assert.equal(db.scalar(`select outcome from record_consumer_packet_payment(${q(itemId)},'paid',5000,'usd','stripe',${q('evt-'+itemId)},${q('cs-'+itemId)},null,null,'server_webhook','synthetic-local-test','expungement_packet',${q(personId)},${q(matterId)},${q(verificationHash)})`), 'recorded_paid');
  }
  const c = { userId, itemId, personId, matterId, snapshot, verificationHash, sponsored, sourceSessionId }; cases.push(c); return c;
}
const queue = {
  async claim(worker) {
    const r = db.json(`select row_to_json(t) from (select * from claim_packet_render_job(${q(worker)},null,60)) t`);
    if (!r) return null;
    return Object.fromEntries(Object.entries({ id:'id',packetId:'packet_id',routeId:'route_id',rendererKind:'renderer_kind',rendererVersion:'renderer_version',sourceSha256:'source_sha256',profileId:'profile_id',profileVersion:'profile_version',inputHash:'input_hash',attemptCount:'attempt_count',maxAttempts:'max_attempts',partnerId:'partner_id',personId:'person_id',matterId:'matter_id',fencingToken:'fencing_token',claimExpiresAt:'claim_expires_at' }).map(([key,col]) => [key,r[col]]));
  },
  async startRender(id,token) { return db.scalar(`select start_packet_render(${q(id)},${q(token)})`) === 't'; },
  async startValidation(id,token) { return db.scalar(`select start_packet_validation(${q(id)},${q(token)})`) === 't'; },
  async fail(id,token,code,detail,retryable) { console.error('Worker failure:',code,detail); return db.scalar(`select fail_packet_render_job(${q(id)},${q(token)},${q(code)},${q(detail)},${retryable})`); },
  finalize: finalizeRenderJob,
  async releaseExpired(){ return Number(db.scalar('select release_expired_packet_render_claims()')); },
  async requeueRetryable(){ return Number(db.scalar('select requeue_retryable_packet_render_jobs()')); }
};
const deps = { queue, storage, renderer: { render: renderClaimPacket }, allowlists: { allowedSourceShas:new Set(),knownProfileVersions:new Set(['2026-06-19-source-conversion-1']),supportedRendererKinds:new Set(['packet_document_v1']) }, workerId:'personalization-test',containerDigest:'sha256:local-personalization-test' };
const ports = {
  getJob: getRenderJob, storage,
  async userOwnsBriefcaseItem(userId,itemId) { return db.scalar(`select exists(select 1 from consumer_briefcase_items where id=${q(itemId)} and user_id=${q(userId)})`) === 't'; },
  async getCurrentVerification(itemId) {
    const r=db.json(`select row_to_json(t) from (select * from consumer_packet_verifications where briefcase_item_id=${q(itemId)} and status='verified') t`);
    return r && { snapshot:r.verification_snapshot, hash:r.verification_hash, ownerUserId:r.consumer_auth_user_id,matterId:r.matter_id,alreadyDownloaded:false };
  },
  async recordEvent(i) { return db.scalar(`select record_packet_delivery_event(${q(i.jobId)},${q(i.eventType)},${q(i.actorUserId)},'{}')`); }
};
function accounting(){return db.json(`select json_build_object('consumerConsumptions',(select count(*) from consumer_packet_payment_consumption),
  'sponsoredLedgerConsumptions',(select count(*) from packet_credit_ledger where event_type='consumed'),
  'clinicAllowance',(select screenings_used from partner_entitlement where partner_slug='il-clinic-sponsor'),
  'clinicEvents',(select count(*) from rcap_screening_analytics_events where event_type='packet_generated'))`);}
const evidence = { participants:[], failures:[] };
const verifyFailure = process.argv.includes('--verify-fail-closed');
if(verifyFailure) deps.renderer={render:async()=>{throw new Error('synthetic render failure boundary');}};
try {
  setup();
  await withIllinoisRegistry(async () => {
    const alice=seed('Alice Example', '101 First Street');
    const bob=seed('Bruno Sample', '202 Second Street');
    const claire=seed('Claire Sponsored', '404 Third Street', true);
    const diego=seed('Diego Sponsored', '505 Fourth Street', true);
    const participants=[alice,bob,claire,diego];
    process.env.RCAP_CONSUMER_DELIVERY_ROUTE_STATE='staging_scoped';
    process.env.RCAP_CONSUMER_DELIVERY_STAGING_SCOPE=participants.map(c=>c.userId).join(',');
    for (const c of participants) {
      const result=await generatePaidConsumerPacket({userId:c.userId,briefcaseItemId:c.itemId});
      assert.equal(result.packetStatus,'generating'); assert.equal(result.canDownload,false); assert.ok(result.renderJobId);
      c.jobId=result.renderJobId;
      const repeat=await generatePaidConsumerPacket({userId:c.userId,briefcaseItemId:c.itemId});
      assert.equal(repeat.renderJobId,c.jobId,'duplicate request reuses job');
      const cycle=await runWorkerCycle(deps);
      if (verifyFailure) {
        assert.equal(cycle.outcome, 'failed', 'real renderer dependency must never yield Ready');
        assert.equal(cycle.errorCode, 'render_failed');
        const job = await getRenderJob(c.jobId);
        assert.equal(job.status, 'failed'); assert.equal(job.outputSha256, null);
        assert.equal((await getConsumerPacketStatus({userId:c.userId,briefcaseItemId:c.itemId})).canDownload, false);
        assert.equal((await authorizePacketDownload(ports,{jobId:c.jobId,userId:c.userId})).ok, false);
        const prepared = preparePersonalizedPacket({authUserId:c.userId,briefcaseItemId:c.itemId,personId:c.personId,matterId:c.matterId,verificationHash:c.verificationHash,snapshot:c.snapshot});
        const stored = db.json(`select input_payload from rcap_document_packet_inputs where document_packet_id=${q(job.packetId)}`);
        assert.deepEqual(stored, prepared.payload.renderInputPayload);
        assert.ok(JSON.stringify(prepared.packet).includes(c.snapshot.packetAnswers.participant_full_legal_name));
        assert.equal(stored.snapshot.packetAnswers.mailing_address, c.snapshot.packetAnswers.mailing_address);
        assert.equal(stored.snapshot.packetAnswers.participant_full_legal_name, c.snapshot.packetAnswers.participant_full_legal_name);
        continue;
      }
      assert.equal(cycle.outcome,'finalized',JSON.stringify(cycle)); assert.equal(cycle.accountingResult,c.sponsored?'consumed':'zero_charge');
      const job=await getRenderJob(c.jobId);
      assert.equal(job.matterId,c.matterId); assert.equal(c.sponsored?job.sponsoredBinding.authUserId:job.consumerAuthUserId,c.userId); assert.equal(c.sponsored?job.sponsoredBinding.verificationHash:job.consumerVerificationHash,c.verificationHash);
      assert.equal(job.personalizedBinding.packetFamilyId,'il-prostitution-j-vacate-set');
      const ready=await getConsumerPacketStatus({userId:c.userId,briefcaseItemId:c.itemId});
      assert.equal(ready.canDownload,true);
      const before=accounting();
      for (let repeat=0;repeat<2;repeat++) {
        const decision=await authorizePacketDownload({...ports,getCurrentVerification:async(id)=>({...await ports.getCurrentVerification(id),alreadyDownloaded:repeat>0})},{jobId:c.jobId,userId:c.userId});
        assert.equal(decision.ok,true,JSON.stringify(decision));
        const response=await streamAuthorizedPacket(ports,decision,{userId:c.userId});
        c.bytes=Buffer.from(await response.arrayBuffer());
      }
      assert.deepEqual(accounting(),before);
      assert.equal((await authorizePacketDownload(ports,{jobId:c.jobId,userId:c===alice?bob.userId:alice.userId})).ok,false);
      const pdf=path.join(output,`${c.itemId}.pdf`);fs.writeFileSync(pdf,c.bytes);
      c.text=execFileSync('pdftotext',['-layout',pdf,'-'],{encoding:'utf8'});
      assert.ok(c.text.includes(c.snapshot.packetAnswers.participant_full_legal_name));
      assert.ok(c.text.includes(c.snapshot.packetAnswers.mailing_address));
      evidence.participants.push({mode:c.sponsored?'sponsored':'consumer',matterId:c.matterId,jobId:c.jobId,packetId:job.packetId,participant:c.snapshot.packetAnswers.participant_full_legal_name,expectedAddress:c.snapshot.packetAnswers.mailing_address,sha256:hash(c.bytes),verificationHash:c.verificationHash});
    }
    if (verifyFailure) {
      assert.equal(db.scalar('select count(*) from packet_render_jobs'),'4');
      assert.equal(db.scalar('select count(*) from consumer_packet_artifact_provenance'),'0');
      assert.equal(db.scalar('select count(*) from consumer_packet_payment_consumption'),'0');
      assert.equal(db.scalar('select count(*) from packet_credit_ledger'),'0');
      assert.equal(db.scalar('select count(*) from packet_render_jobs where output_storage_path is not null'),'0');
      db.sql(`update packet_render_jobs set next_attempt_at=now()-interval '1 second' where id=${q(alice.jobId)}`);
      const retry=await generatePaidConsumerPacket({userId:alice.userId,briefcaseItemId:alice.itemId});
      assert.equal(retry.renderJobId,alice.jobId);
      assert.equal((await runWorkerCycle(deps)).outcome,'failed');
      assert.equal(db.scalar('select count(*) from packet_render_jobs'),'4');
      await assert.rejects(()=>generatePaidConsumerPacket({userId:bob.userId,briefcaseItemId:alice.itemId}), /not found/i);
      await assert.rejects(()=>generatePaidConsumerPacket({userId:bob.userId,briefcaseItemId:claire.itemId}), /not found/i);
      evidence.result='FAIL-CLOSED checks PASS; explicit renderer failure double, no artifact or Ready';
      evidence.inputs=cases.map(c=>({participant:c.snapshot.packetAnswers.participant_full_legal_name,expectedAddress:c.snapshot.packetAnswers.mailing_address,matterId:c.matterId,jobId:c.jobId,verificationHash:c.verificationHash}));
      evidence.artifacts=0; evidence.consumerConsumptions=0; evidence.sponsoredConsumptions=0;
      return;
    }
    assert.ok(!alice.text.includes('Bruno Sample'));assert.ok(!bob.text.includes('Alice Example'));
    const prepared=preparePersonalizedPacket({authUserId:alice.userId,briefcaseItemId:alice.itemId,personId:alice.personId,matterId:alice.matterId,verificationHash:alice.verificationHash,snapshot:alice.snapshot});
    const { renderGradeAPacketPdf } = await import('../src/lib/rcap/grade-a/renderer.ts');
    assert.deepEqual(await renderGradeAPacketPdf(prepared.packet),alice.bytes,'identical inputs reproduce exact bytes');
    assert.equal(await computeNormalizedFingerprint(await renderGradeAPacketPdf(prepared.packet)),await computeNormalizedFingerprint(alice.bytes));
    assert.equal(db.scalar('select count(*) from packet_render_jobs'),'4');
    assert.equal(db.scalar('select count(*) from consumer_packet_artifact_provenance'),'4');
    assert.equal(db.scalar('select count(*) from consumer_packet_payment_consumption'),'2');
    for(const c of participants) {
      for(const other of participants.filter(p=>p!==c)) assert.ok(!c.text.includes(other.snapshot.packetAnswers.participant_full_legal_name));
      const before=accounting();
      const retry=await generatePaidConsumerPacket({userId:c.userId,briefcaseItemId:c.itemId});
      assert.equal(retry.canDownload,true);assert.equal(retry.artifactRefs.renderJobId,c.jobId);assert.deepEqual(accounting(),before);
    }
    assert.equal(db.scalar("select screenings_used from partner_entitlement where partner_slug='il-clinic-sponsor'"),'2');
    assert.equal(db.scalar("select count(*) from packet_credit_ledger where event_type='consumed'"),'2');
    assert.equal(db.scalar("select count(*) from rcap_screening_analytics_events where event_type='packet_generated'"),'2');
    evidence.initialAccounting=accounting();
    // Material edits close old delivery and change actual rendered text.
    const changed={...alice.snapshot,packetAnswers:{...alice.snapshot.packetAnswers,mailing_address:'303 Changed Avenue'}};
    const changedHash=hash(changed);
    db.sql(`update consumer_packet_verifications set verification_snapshot=${q(JSON.stringify(changed))},verification_hash=${q(changedHash)} where briefcase_item_id=${q(alice.itemId)}`);
    assert.equal((await authorizePacketDownload(ports,{jobId:alice.jobId,userId:alice.userId})).ok,false,'old bytes cannot use a new verification');
    try {
    const changedRequest=await generatePaidConsumerPacket({userId:alice.userId,briefcaseItemId:alice.itemId});
    assert.equal(changedRequest.canDownload,false); assert.notEqual(changedRequest.renderJobId,alice.jobId);
    const changedCycle=await runWorkerCycle(deps); assert.equal(changedCycle.outcome,'finalized',JSON.stringify(changedCycle));
    const changedJob=await getRenderJob(changedRequest.renderJobId);
    const changedPdf=path.join(output,'changed.pdf');fs.writeFileSync(changedPdf,await storage.read(changedJob.outputStoragePath));
    const changedText=execFileSync('pdftotext',['-layout',changedPdf,'-'],{encoding:'utf8'});
    assert.ok(changedText.includes('303 Changed Avenue'));assert.ok(!changedText.includes('101 First Street'));
    assert.equal(db.scalar('select count(*) from consumer_packet_payment_consumption'),'2','regeneration does not charge again');
    evidence.changedFact={field:'mailing_address',before:'101 First Street',after:'303 Changed Avenue',contentChanged:true,jobId:changedRequest.renderJobId};
    const changedReady=await getConsumerPacketStatus({userId:alice.userId,briefcaseItemId:alice.itemId});
    assert.equal(changedReady.canDownload,true,'changed verification must publish current protected provenance');
    assert.equal(changedReady.artifactRefs.renderJobId,changedRequest.renderJobId);
    evidence.regeneration='PASS';
    } catch(error) { evidence.failures.push({check:'consumer changed-verification regeneration',error:error.message}); }
    for(const selectedTrackId of [null,'*','il-prostitution-j-auto']) {
      const bad={...changed,selectedTrackId};
      assert.throws(()=>preparePersonalizedPacket({authUserId:alice.userId,briefcaseItemId:alice.itemId,personId:alice.personId,matterId:alice.matterId,verificationHash:hash(bad),snapshot:bad}));
    }
    const wrongFamily={...ports,getJob:async(id)=>{ const j=await getRenderJob(id);return {...j,personalizedBinding:{...j.personalizedBinding,packetFamilyId:'il-prostitution-j-auto-set'}};}};
    assert.equal((await authorizePacketDownload(wrongFamily,{jobId:bob.jobId,userId:bob.userId})).ok,false);
    const beforeWrongEvent=accounting();
    db.sql(`update clinic_events set jurisdiction='WI' where id=${q(eventId)}`);
    const denied=seed('Wrong Event Participant','707 Denied Street',true);
    process.env.RCAP_CONSUMER_DELIVERY_STAGING_SCOPE+=','+denied.userId;
    const countBefore=db.scalar('select count(*) from packet_render_jobs');
    await assert.rejects(()=>generatePaidConsumerPacket({userId:denied.userId,briefcaseItemId:denied.itemId}),/sponsored render queue refused/);
    assert.equal(db.scalar('select count(*) from packet_render_jobs'),countBefore);
    assert.equal((await authorizePacketDownload(ports,{jobId:claire.jobId,userId:claire.userId})).ok,false);
    assert.equal((await getConsumerPacketStatus({userId:claire.userId,briefcaseItemId:claire.itemId})).canDownload,false);
    db.sql(`update clinic_events set jurisdiction='IL' where id=${q(eventId)}`);
    assert.deepEqual(accounting(),beforeWrongEvent);
    const sponsorChanged={...claire.snapshot,packetAnswers:{...claire.snapshot.packetAnswers,mailing_address:'606 Sponsor Change'}};
    db.sql(`update consumer_packet_verifications set verification_snapshot=${q(JSON.stringify(sponsorChanged))},verification_hash=${q(hash(sponsorChanged))} where briefcase_item_id=${q(claire.itemId)}`);
    assert.equal((await authorizePacketDownload(ports,{jobId:claire.jobId,userId:claire.userId})).ok,false);
    try {
      const changedSponsor=await generatePaidConsumerPacket({userId:claire.userId,briefcaseItemId:claire.itemId});
      assert.ok(changedSponsor.renderJobId); assert.notEqual(changedSponsor.renderJobId,claire.jobId);
      const cycle=await runWorkerCycle(deps); assert.equal(cycle.outcome,'finalized',JSON.stringify(cycle));
      const ready=await getConsumerPacketStatus({userId:claire.userId,briefcaseItemId:claire.itemId});
      assert.equal(ready.canDownload,true,'sponsored regeneration must publish protected provenance');
      assert.equal(ready.artifactRefs.renderJobId,changedSponsor.renderJobId);
      assert.deepEqual(accounting(),beforeWrongEvent,'sponsored regeneration consumes no additional allowance');
    }catch(error){
      evidence.failures.push({check:'sponsored changed-verification regeneration',error:error.message});
      const latest=db.json(`select row_to_json(j) from packet_render_jobs j where sponsored_consumer_briefcase_item_id=${q(claire.itemId)} and sponsored_verification_hash=${q(hash(sponsorChanged))}`);
      const old=db.json(`select artifact from consumer_packet_artifact_provenance where briefcase_item_id=${q(claire.itemId)}`);
      const attempted={...old,verificationHash:hash(sponsorChanged),artifactSha256:latest.output_sha256,renderJobId:latest.id};
      evidence.sponsoredRegenerationRefusal=db.json(`select row_to_json(f) from finalize_sponsored_packet_generation_for_route('IL:felony-prostitution-relief',${q(claire.sourceSessionId)},${q(claire.itemId)},${q(hash(sponsorChanged))},${q(JSON.stringify(attempted))},${q(latest.id)}) f`);
    }
    evidence.localOnly=true;
  });
  assert.equal((await authorizePacketDownload(ports,{jobId:cases[0].jobId,userId:cases[0].userId})).ok,false,'committed revoked authority never delivers');
  console.log(JSON.stringify(evidence,null,2));
  assert.equal(evidence.failures.length,0,JSON.stringify(evidence.failures));
  console.log(verifyFailure ? 'Consumer and sponsored entry, immutable inputs, explicit renderer failure and no false Ready PASS' : 'Personalized consumer generation -> real verified enqueue -> real worker adapter -> filesystem -> owner/repeat download PASS (local only)');
} finally {
  delete process.env.RCAP_CONSUMER_DELIVERY_ROUTE_STATE;delete process.env.RCAP_CONSUMER_DELIVERY_STAGING_SCOPE;
  if (previousNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousNodeEnv;
  fs.writeFileSync(path.join(output,'evidence.json'),JSON.stringify(evidence,null,2));
  console.log('Synthetic artifacts:',output);
  db.stop();
}
