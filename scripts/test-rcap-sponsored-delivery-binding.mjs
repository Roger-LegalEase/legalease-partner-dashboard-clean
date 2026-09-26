#!/usr/bin/env node

// The shared sponsored delivery mechanism, proven on the shipped modules.
//
// A sponsored job obtains its protected verification binding through ONE
// mechanism -- enqueue_verified_sponsored_packet_render, for a route registered
// in sponsored_packet_render_routes -- and the delivery core reads that binding
// back through getRenderJob for every partner job, whatever its route. This file
// proves both halves and the negative that separates them:
//
//   1. a registered route (a TEST-ONLY registration, in this ephemeral cluster,
//      of a committed non-Illinois specification) goes sponsored enqueue ->
//      worker -> scoped finalization -> owner download through the real
//      getRenderJob, sponsoredRenderDeliveryReady and authorizePacketDownload;
//      before scoped finalization the same job is refused, so a validated
//      artifact alone never exposes bytes;
//   2. the North Dakota Chapter 12-60.1 route is NOT registered: the sponsored
//      transaction refuses it, and a partner job for it that was queued outside
//      that transaction is refused at delivery with sponsored_binding_missing --
//      a different answer from verification_not_current, which only says the
//      caller supplied no reader.
//
// Nothing here registers a route anywhere but this disposable database. The
// registration row is the fixture that lets the mechanism be exercised on a
// route other than Illinois; it is not evidence that the route is authorized.
//
//   node scripts/test-rcap-sponsored-delivery-binding.mjs

import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
import {packetApplicationTestDatabase} from './rcap-packet-database-reference.mjs';
import {seedPacketCapacitySql,packetCapacitySql,assertPacketCapacity,PARTNER_ID,ENTITLEMENT_ID} from './rcap-clinic-packet-capacity.mjs';
import {downstreamClosureSql,assertDownstreamClosure,closureAuthority,FUNCTION_HASHES} from './rcap-clinic-downstream-closure.mjs';
import {clinicWorkerContext} from './rcap-clinic-worker-context.mjs';
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { ephemeralPgAvailable, startEphemeralPg } from "./lib/rcap-ephemeral-pg.mjs";

register("./lib/ts-esm-loader.mjs", import.meta.url);
const { withSyntheticPacketRegistry } = await import("./test-rcap-il-authority-fixture.mjs");
register("./lib/consumer-payment-test-loader.mjs", import.meta.url);
const { bindEphemeralDb } = await import("./lib/consumer-payment-test-doubles.mjs");
const { runWorkerCycle } = await import("../src/lib/rcap/render/render-worker.ts");
const { readSponsoredChannelContext } = await import("../src/lib/rcap/fulfillment/sponsored-channel-context.ts");
const { getRenderJob, finalizeRenderJob, enqueueVerifiedSponsoredRender } = await import("../src/lib/rcap/render/job-queue.ts");
const { authorizePacketDownload, streamAuthorizedPacket } = await import("../src/lib/rcap/render/packet-delivery.ts");
const { consumerPersonMatchKey, consumerMatterIdForItem } = await import("../src/lib/expungement-ai/consumer-identity.ts");

const closureAuth = closureAuthority();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replaceAll("'", "''")}'`);
const sha = (v) => createHash("sha256").update(v).digest("hex");

// The committed non-Illinois specification the transport verifier already uses
// as its fixture route. Its identity is read from the file, never restated.
const SPEC_PATH = "data/record-clearing/packet-specifications/DC-actual-innocence-expungement.v1.json";
const SPEC = JSON.parse(fs.readFileSync(path.join(root, SPEC_PATH), "utf8"));
const ROUTE = SPEC.routeKey;
const PARTNER_SLUG = "zz-sponsor-test-only";
const ND_ROUTE = "ND:general-conviction-sealing-under-n-d-c-c-chapter-12-60-1";
const FIXTURE = path.join(root, "data/rcap-ledger/grade-a/artifacts/ms-nonconviction-successor-review-full-en.pdf");

if (!ephemeralPgAvailable()) {
  console.error("test-rcap-sponsored-delivery-binding requires a local PostgreSQL 16 toolchain.");
  process.exit(1);
}

const checks = [];
function check(label, condition, detail) {
  assert.equal(Boolean(condition), true, `${label}${detail === undefined ? "" : ` :: ${JSON.stringify(detail)}`}`);
  checks.push(label);
  console.log(`ok ${checks.length} - ${label}`);
}

const db = packetApplicationTestDatabase(root);
const storageRoot = fs.mkdtempSync(path.join(os.tmpdir(), "sponsored-delivery-binding-"));
const bytes = fs.readFileSync(FIXTURE);
const storage = {
  async upload(relative, data) {
    const full = path.join(storageRoot, relative);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    try { fs.writeFileSync(full, data, { flag: "wx" }); return { ok: true }; }
    catch (error) { return { ok: false, reason: error.code === "EEXIST" ? "409 exists" : error.message }; }
  },
  async read(relative) { try { return fs.readFileSync(path.join(storageRoot, relative)); } catch { return null; } }
};
const queue = {
  async claim(worker) {
    const row = db.json(`select row_to_json(t) from (select * from claim_packet_render_job(${q(worker)},null,300)) t`);
    if (!row) return null;
    return {
      id: row.id, packetId: row.packet_id, routeId: row.route_id, rendererKind: row.renderer_kind,
      rendererVersion: row.renderer_version, sourceSha256: row.source_sha256, profileId: row.profile_id,
      profileVersion: row.profile_version, inputHash: row.input_hash, attemptCount: row.attempt_count,
      maxAttempts: row.max_attempts, partnerId: row.partner_id, personId: row.person_id,
      matterId: row.matter_id, fencingToken: row.fencing_token, claimExpiresAt: row.claim_expires_at
    };
  },
  async startRender(id, token) { return db.scalar(`select start_packet_render(${q(id)},${q(token)})`) === "t"; },
  async startValidation(id, token) { return db.scalar(`select start_packet_validation(${q(id)},${q(token)})`) === "t"; },
  async fail(id, token, code, detail, retryable) {
    return db.scalar(`select fail_packet_render_job(${q(id)},${q(token)},${q(code)},${q(detail)},${retryable})`);
  },
  async historicalFinalizationFixture(input) {
    const row = db.json(`select row_to_json(t) from (select * from finalize_packet_render_job(${q(input.jobId)},${q(input.fencingToken)},${q(input.outputStoragePath)},${q(input.localSha256)},${q(input.localNormalizedSha256)},${q(input.storedSha256)},${q(input.storedNormalizedSha256)},${input.outputByteCount},${input.outputPageCount},${q(input.containerDigest)})) t`);
    return row && {
      accountingResult: row.accounting_result, deliveryEligibility: row.delivery_eligibility,
      consumptionUnitHash: row.consumption_unit_hash, creditLedgerId: row.credit_ledger_id
    };
  },
  finalize: finalizeRenderJob,
  async releaseExpired() { return Number(db.scalar("select release_expired_packet_render_claims()")); },
  async requeueRetryable() { return Number(db.scalar("select requeue_retryable_packet_render_jobs()")); }
};
const deps = {
  queue, storage, renderer: { render: async () => bytes },
  allowlists: {
    allowedSourceShas: new Set(),
    knownProfileVersions: new Set(["2026-06-19-source-conversion-1"]),
    supportedRendererKinds: new Set(["packet_document_v1"])
  },
  workerId: "sponsored-delivery-binding-test",
  containerDigest: "sha256:local-sponsored-delivery-binding-test"
};

function baseline() {
  return `
    create role anon nologin; create role authenticated nologin;
    create role service_role nologin bypassrls;
    alter default privileges in schema public grant all on tables to service_role;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
    create schema if not exists extensions;
    create extension if not exists pgcrypto with schema extensions;
    create table partner_records(id uuid primary key, partner_slug text unique not null);
    create table rcap_persons(id uuid primary key default gen_random_uuid(), partner_slug text not null,
      match_key text not null, unique(partner_slug, match_key));
    create table rcap_document_packets(id uuid primary key default gen_random_uuid(), partner_slug text,
      user_id uuid, briefcase_id uuid, person_id uuid, state text, jurisdiction text, document_type text,
      pathway text, status text, petitioner_first_name text, petitioner_last_name text, petitioner_city text,
      petitioner_county text, court_county text, court_name text, cause_number text, charge text,
      offense_date text, arrest_date text, arresting_agency text, agency_case_number text,
      disposition_date text, conviction_date text, sentence_completion_date text, needs_record_review boolean,
      generated_plain_text text, filing_instructions text[], county_court_instructions text[],
      missing_fields text[], safety_disclaimer text not null);
    create table rcap_document_packet_inputs(document_packet_id uuid primary key, partner_slug text, input_payload jsonb);
  `;
}
// Clinic-mode shapes the sponsored transaction reads; the same fixture the
// Illinois transaction proof stands up.
function clinicFixtures() {
  return `
    alter table consumer_briefcase_items add column if not exists source_pending_result_id uuid;
    create table consumer_pending_screening_results(pending_id uuid primary key, status text not null,
      claimed_matter_id uuid references consumer_briefcase_items(id), claimed_user_id uuid,
      claimed_at timestamptz, anonymous_session_id uuid, product text, partner_slug text,
      jurisdiction text, profile_version text, candidate_route_context jsonb, screening_answers jsonb,
      event_id uuid);
    create table screening_sessions(session_id uuid primary key, flow_mode text, partner_benefit_active boolean,
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
  `;
}

const partnerId = randomUUID();
const eventId = randomUUID();

function seedParticipant({ jurisdiction, pathway, track, event = eventId, userId = randomUUID(), partnerSlug = PARTNER_SLUG }) {
  const itemId = randomUUID(), personId = randomUUID();
  const pendingId = randomUUID(), sessionId = randomUUID();
  const matterId = consumerMatterIdForItem(itemId);
  const snapshot = {
    schemaVersion: "expungement-ai/final-verification/v1", jurisdiction, pathwayId: pathway,
    selectedTrackId: track, verifiedAt: "2026-09-15T00:00:00.000Z",
    profileVersion: "2026-06-19-source-conversion-1",
    profileSourceFingerprint: sha("synthetic-source"), profileAuthorityFingerprint: sha("synthetic-authority"),
    packetFamilyIdentifiers: { mode: "custom_pleading", sourceFormIds: [] }, paymentAllowed: false, resultCode: "packet_ready",
    packetAnswers: { participant_full_legal_name: `P-${itemId.slice(0, 8)}` },
    screeningAnswers: {}, prefilledAnswers: {}, serverFacts: {}
  };
  const verificationHash = sha(JSON.stringify(snapshot));
  const draft = { ...snapshot, schemaVersion: "expungement-ai/protected-packet-draft/v1" };
  db.sql(`
    insert into auth.users values(${q(userId)});
    insert into rcap_persons(id,partner_slug,match_key) values(${q(personId)},'expungement-ai-consumer',${q(consumerPersonMatchKey(userId))});
    insert into consumer_briefcase_items(id,user_id,item_type,status,jurisdiction,pathway_label,result_code,
      packet_type,payment_allowed,payment_status,packet_status,source_pending_result_id)
      values(${q(itemId)},${q(userId)},'result','packet_ready',${q(jurisdiction)},${q(pathway)},'packet_ready',
        'custom_pleading',true,'unpaid','not_started',${q(pendingId)});
    insert into consumer_packet_verifications(briefcase_item_id,consumer_auth_user_id,matter_id,status,reason,
      verification_hash,verification_snapshot,draft_hash,draft_snapshot,revision)
      values(${q(itemId)},${q(userId)},${q(matterId)},'verified','synthetic fixture',${q(verificationHash)},
        ${q(JSON.stringify(snapshot))},${q(sha(JSON.stringify(draft)))},${q(JSON.stringify(draft))},1);
    insert into consumer_pending_screening_results(pending_id,status,claimed_matter_id,claimed_user_id,claimed_at,
      anonymous_session_id,product,partner_slug,jurisdiction,event_id)
      values(${q(pendingId)},'CLAIMED',${q(itemId)},${q(userId)},now(),${q(sessionId)},
        'rcap_partner',${q(partnerSlug)},${q(jurisdiction)},${q(event)});
    insert into screening_sessions(session_id,flow_mode,partner_benefit_active,partner_slug,jurisdiction,
      claimed_slot_state,status) values(${q(sessionId)},'rcap',true,${q(partnerSlug)},${q(jurisdiction)},'claimed','in_progress');
    insert into clinic_cases(id,event_id,participant_user_id,screening_session_id,matter_id,jurisdiction,
      route_disposition,queue_status) values(${q(randomUUID())},${q(event)},${q(userId)},${q(sessionId)},
        ${q(itemId)},${q(jurisdiction)},'packet','in_progress');
  `);
  return { userId, itemId, personId, pendingId, sessionId, matterId, snapshot, verificationHash };
}

function renderPayload(p, routeKey) {
  const packetId = randomUUID();
  const inputHash = sha(`${p.itemId}:${p.verificationHash}:${routeKey}`);
  const payload = {
    schemaVersion: "rcap-personalized-render/v1", authUserId: p.userId, briefcaseItemId: p.itemId,
    personId: p.personId, matterId: p.matterId, verificationHash: p.verificationHash, snapshot: p.snapshot,
    routeId: routeKey, trackId: p.snapshot.selectedTrackId, packetFamilyId: SPEC.packetFamily,
    specificationId: SPEC.specificationId, specificationVersion: SPEC.specificationVersion,
    specificationSha256: SPEC.specificationSha256, inputHash
  };
  const packet = {
    id: packetId, user_id: p.userId, briefcase_id: p.itemId, person_id: p.personId,
    state: p.snapshot.jurisdiction, jurisdiction: p.snapshot.jurisdiction,
    document_type: "source_driven_packet", pathway: "source_engine_packet_plan", status: "ready_for_review",
    // Mirrors the application's row: the canonical column is not null.
    safety_disclaimer: "This personalized self-help packet is not legal advice and does not guarantee court approval. Review every answer and confirm current local filing requirements before filing."
  };
  return { packetId, inputHash, payload, packet, routeKey };
}

function enqueueSql(p, r) {
  return `select id from enqueue_verified_sponsored_packet_render(${q(r.routeKey)},${q(p.sessionId)},
    ${q(r.packetId)},${q(r.routeKey)},'packet_document_v1','1.0.0',null,${q(p.snapshot.jurisdiction)},
    '2026-06-19-source-conversion-1',${q(r.inputHash)},${q(p.itemId)},${q(p.personId)},${q(p.matterId)},5,
    ${q(p.userId)},${q(p.verificationHash)},${q(JSON.stringify(r.packet))}::jsonb,
    ${q(JSON.stringify(r.payload))}::jsonb)`;
}

function finalizeSponsored(routeKey, p, outputSha, jobId) {
  const artifact = {
    provider: "rcap_grade_a_composer_v1", packetId: p.itemId, fileName: "record-clearing-packet.pdf",
    contentType: "application/pdf", generatedAt: "2026-09-15T00:00:00.000Z",
    source: "grade_a_packet_specification", packetSpecificationId: SPEC.specificationId,
    packetSpecificationVersion: SPEC.specificationVersion, packetSpecificationSha256: SPEC.specificationSha256,
    packetFamily: SPEC.packetFamily, documentCount: 2, verificationHash: p.verificationHash,
    downloadPath: `/api/rcap/packets/${jobId}/download`, artifactSha256: outputSha, pageCount: 3,
    renderJobId: jobId
  };
  return db.json(`select to_jsonb(x) from (select * from finalize_sponsored_packet_generation_for_route(
    ${q(routeKey)},${q(p.sessionId)},${q(p.itemId)},${q(p.verificationHash)},
    ${q(JSON.stringify(artifact))}::jsonb,${q(jobId)})) x`);
}

// The delivery ports the application wires, over this database: the shipped
// job loader, the protected verification read server-side, the storage
// adapter, and the shipped scoped-publication check (no override supplied).
function ports(userId) {
  return {
    getJob: (id) => getRenderJob(id),
    userOwnsBriefcaseItem: async (user, item) =>
      db.scalar(`select count(*) from consumer_briefcase_items where id=${q(item)} and user_id=${q(user)}`) === "1",
    getCurrentVerification: async (item) => {
      const row = db.json(`select row_to_json(t) from (select * from consumer_packet_verifications
        where briefcase_item_id=${q(item)} and status='verified') t`);
      if (!row) return null;
      const job = db.json(`select row_to_json(t) from (select status from packet_render_jobs
        where briefcase_item_id=${q(item)} and status='delivered' limit 1) t`);
      return { snapshot: row.verification_snapshot, hash: row.verification_hash,
        ownerUserId: row.consumer_auth_user_id, matterId: row.matter_id, alreadyDownloaded: Boolean(job) };
    },
    storage,
    recordEvent: async (input) => {
      try {
        return db.scalar(`select record_packet_delivery_event(${q(input.jobId)},${q(input.eventType)},${q(input.actorUserId)},${q(JSON.stringify(input.requestContext ?? {}))}::jsonb)`);
      } catch { return null; }
    },
    _userId: userId
  };
}
const eventCount = (jobId, type) => Number(db.scalar(`select count(*) from packet_delivery_events where render_job_id=${q(jobId)} and event_type=${q(type)}`));
const clinicUsed = () => Number(db.scalar(`select screenings_used from partner_entitlement where partner_slug=${q(PARTNER_SLUG)}`));
const ledgerConsumed = () => Number(db.scalar("select count(*) from packet_credit_ledger where event_type in ('consumed','overage_consumed')"));

try {
  db.sql(`alter table rcap_document_packets add column partner_slug text, add column user_id uuid, add column briefcase_id uuid, add column person_id uuid, add column state text, add column jurisdiction text, add column document_type text, add column pathway text, add column status text, add column petitioner_first_name text, add column petitioner_last_name text, add column petitioner_city text, add column petitioner_county text, add column court_county text, add column court_name text, add column cause_number text, add column charge text, add column offense_date text, add column arrest_date text, add column arresting_agency text, add column agency_case_number text, add column disposition_date text, add column conviction_date text, add column sentence_completion_date text, add column needs_record_review boolean, add column generated_plain_text text, add column filing_instructions text[], add column county_court_instructions text[], add column missing_fields text[], add column safety_disclaimer text not null;`);
  db.sql(`insert into partner_records values(${q(partnerId)},${q(PARTNER_SLUG)});
    insert into partner_packet_entitlement(partner_id,packet_cap,overage_enabled,overage_cap) values(${q(partnerId)},20,false,0);
    insert into partner_entitlement(partner_slug,screenings_used,screenings_allowed,pause_at_cap,overage_enabled)
      values(${q(PARTNER_SLUG)},0,20,true,false);
    insert into clinic_events(id,partner_slug,name,jurisdiction,status,sponsorship_allocation)
      values(${q(eventId)},${q(PARTNER_SLUG)},'Synthetic sponsored-delivery clinic',${q(SPEC.jurisdiction)},'published',20);`);
  bindEphemeralDb(db);

  // --- the registration is the fixture, and the committed rows say what is real
  check("the committed registration carries no North Dakota route",
    db.scalar(`select count(*) from sponsored_packet_render_routes where jurisdiction='ND'`) === "0");
  check("the committed registration carries no row for the fixture route either",
    db.scalar(`select count(*) from sponsored_packet_render_routes where route_key=${q(ROUTE)}`) === "0");
  // TEST-ONLY registration of the committed non-Illinois specification. It
  // exists in this disposable cluster and nowhere else; it is how the mechanism
  // is shown to be shared, not a statement that the route is sponsorable.
  db.sql(`insert into sponsored_packet_render_routes (route_key, jurisdiction, pathway_id, registry_track_id,
      packet_family_id, packet_specification_id, packet_specification_version, packet_specification_sha256,
      artifact_provider, artifact_source, partner_slug, clinic_event_name)
    values (${q(ROUTE)}, ${q(SPEC.jurisdiction)}, ${q(SPEC.pathwayId)}, null, ${q(SPEC.packetFamily)},
      ${q(SPEC.specificationId)}, ${q(SPEC.specificationVersion)}, ${q(SPEC.specificationSha256)},
      'rcap_grade_a_composer_v1', 'grade_a_packet_specification', ${q(PARTNER_SLUG)}, null)`);

  await withSyntheticPacketRegistry(SPEC_PATH, async () => {
    // --- 1. the shared mechanism on a registered non-Illinois route ---------
    const alice = seedParticipant({ jurisdiction: SPEC.jurisdiction, pathway: SPEC.pathwayId, track: SPEC.trackId });
    const aliceRender = renderPayload(alice, ROUTE);
    const aliceJob = db.scalar(enqueueSql(alice, aliceRender));
    check("sponsored enqueue binds the job to the registered route",
      db.scalar(`select count(*)=1 from packet_render_jobs where id=${q(aliceJob)} and sponsored_route_key=${q(ROUTE)}
        and partner_id=${q(partnerId)} and sponsored_verification_hash=${q(alice.verificationHash)}`) === "t");

    // A registration without an exact event name is enough for historical
    // delivery custody, but cannot establish a new bounded channel grant.
    const channelInput = { routeId: ROUTE, sourceSessionId: alice.sessionId,
      briefcaseItemId: alice.itemId, authUserId: alice.userId };
    check("current channel context refuses an unbounded event registration",
      await readSponsoredChannelContext(channelInput) === null);
    db.sql(`update sponsored_packet_render_routes set clinic_event_name='Synthetic sponsored-delivery clinic' where route_key=${q(ROUTE)}`);
    const channelContext = await readSponsoredChannelContext(channelInput);
    check("current channel context joins protected owner, partner, event and specification",
      channelContext?.participantUserId === alice.userId && channelContext?.partnerSlug === PARTNER_SLUG
        && channelContext?.eventId === eventId && channelContext?.eventName === "Synthetic sponsored-delivery clinic"
        && channelContext?.registeredSpecificationSha256 === SPEC.specificationSha256, channelContext);
    check("current channel context refuses a different owner",
      await readSponsoredChannelContext({ ...channelInput, authUserId: randomUUID() }) === null);
    check("current channel context refuses a different source session",
      await readSponsoredChannelContext({ ...channelInput, sourceSessionId: randomUUID() }) === null);
    db.sql(`update sponsored_packet_render_routes set clinic_event_name=null where route_key=${q(ROUTE)}`);

    const queued = await getRenderJob(aliceJob);
    check("getRenderJob surfaces the binding for a non-Illinois partner job from the row, naming the route it was bound to",
      queued?.partnerId === partnerId && queued.sponsoredBinding?.routeKey === ROUTE
        && queued.sponsoredBinding.verificationHash === alice.verificationHash
        && queued.sponsoredBinding.authUserId === alice.userId
        && queued.sponsoredBinding.briefcaseItemId === alice.itemId
        && queued.sponsoredBinding.sourceSessionId === alice.sessionId
        && queued.sponsoredBinding.clinicEventId === eventId, queued?.sponsoredBinding);
    check("the Illinois personalized binding is not invented for another route", queued.personalizedBinding === undefined);

    // Current admission refuses the formerly bypassed nonpersonalized route.
    const deniedClaim=await queue.claim('nonpersonalized-refusal');
    await queue.startRender(aliceJob,deniedClaim.fencingToken);
    await queue.startValidation(aliceJob,deniedClaim.fencingToken);
    const deniedInput={jobId:aliceJob,fencingToken:deniedClaim.fencingToken,outputStoragePath:`${aliceJob}/${sha(bytes)}.pdf`,
      localSha256:sha(bytes),storedSha256:sha(bytes),localNormalizedSha256:sha(bytes),storedNormalizedSha256:sha(bytes),
      outputByteCount:bytes.length,outputPageCount:3,containerDigest:'sha256:'+'a'.repeat(64)};
    check('wrong route / nonpersonalized sponsored job: real finalizer refuses with credits 0 → 0',
      await finalizeRenderJob(deniedInput)===null
      && Number(db.scalar(`select count(*) from packet_credit_ledger where render_job_id=${q(aliceJob)}`))===0
      && db.scalar(`select delivery_eligibility from packet_render_jobs where id=${q(aliceJob)}`)!=='eligible');
    const {finalizeSponsoredRenderArtifact}=await import('../src/lib/rcap/render/sponsored-packet.ts');
    check('nonpersonalized publication cannot bypass current authority',await finalizeSponsoredRenderArtifact(aliceJob)===false);
    // Seed historical delivered custody at SQL level. This does not claim
    // current channel admission. All new accounting cases use finalizeRenderJob.
    await storage.upload(deniedInput.outputStoragePath,bytes);
    const historical=await queue.historicalFinalizationFixture(deniedInput);
    const cycle={...historical,jobId:aliceJob,outcome:'finalized'};
    check("historical SQL fixture seeds a formerly finalized sponsored job", cycle.outcome === "finalized" && cycle.jobId === aliceJob
      && cycle.accountingResult === "consumed" && cycle.deliveryEligibility === "eligible", cycle);
    const outputSha = db.scalar(`select output_sha256 from packet_render_jobs where id=${q(aliceJob)}`);

    const early = await authorizePacketDownload(ports(alice.userId), { jobId: aliceJob, userId: alice.userId });
    check("a validated sponsored artifact is refused until its scoped publication exists",
      !early.ok && early.status === 409 && early.code === "sponsorship_not_finalized", early);
    check("that refusal records no delivery authorization", eventCount(aliceJob, "delivery_authorized") === 0);

    const usedBefore = clinicUsed();
    const finalized = finalizeSponsored(ROUTE, alice, outputSha, aliceJob);
    check("scoped finalization publishes the participant-owned provenance and counts one included unit",
      finalized.ok === true && finalized.recorded === true && finalized.counted_as === "included" && clinicUsed() === usedBefore + 1, finalized);

    const ledgerBefore = ledgerConsumed();
    let previousBytes = null;
    for (const repeat of [false, true]) {
      const decision = await authorizePacketDownload(ports(alice.userId), { jobId: aliceJob, userId: alice.userId });
      check(`${repeat ? "a repeat" : "the owner's"} download is authorized through the shared mechanism`, decision.ok === true, decision);
      const response = await streamAuthorizedPacket(ports(alice.userId), decision, { userId: alice.userId });
      const received = Buffer.from(await response.arrayBuffer());
      check(`${repeat ? "the repeat" : "the owner"} receives the validated bytes`, sha(received) === outputSha && received.equals(bytes));
      if (previousBytes) check("repeat bytes are identical", received.equals(previousBytes));
      previousBytes = received;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
    check("repeat delivery consumes nothing", ledgerConsumed() === ledgerBefore && clinicUsed() === usedBefore + 1);
    check("delivery authorization and completed transmission are recorded",
      eventCount(aliceJob, "delivery_authorized") === 2 && eventCount(aliceJob, "transmission_completed") === 2);

    const stranger = randomUUID();
    db.sql(`insert into auth.users values(${q(stranger)})`);
    const other = await authorizePacketDownload(ports(stranger), { jobId: aliceJob, userId: stranger });
    check("another participant is refused on ownership", !other.ok && other.status === 403 && other.code === "unauthorized", other);
    const changed = await authorizePacketDownload({ ...ports(alice.userId),
      getCurrentVerification: async (item) => ({ ...(await ports(alice.userId).getCurrentVerification(item)), hash: "a".repeat(64) })
    }, { jobId: aliceJob, userId: alice.userId });
    check("a verification that changed after binding cannot authorize the older artifact",
      !changed.ok && changed.code === "verification_binding_mismatch", changed);
    const noReader = await authorizePacketDownload({ ...ports(alice.userId), getCurrentVerification: undefined },
      { jobId: aliceJob, userId: alice.userId });
    check("an absent verification reader is its own refusal", !noReader.ok && noReader.code === "verification_not_current", noReader);

    // --- 2. North Dakota: not registered, and not bound outside the transaction
    const nd = seedParticipant({ jurisdiction: "ND", pathway: "general-conviction-sealing-under-n-d-c-c-chapter-12-60-1", track: null });
    check("the sponsored transaction refuses the North Dakota route",
      /route is not registered/.test(db.sqlExpectError(enqueueSql(nd, renderPayload(nd, ND_ROUTE)))));
    check("no North Dakota job or binding was created by the refusal",
      db.scalar(`select count(*) from packet_render_jobs where route_id=${q(ND_ROUTE)}`) === "0");

    // The Lane D product-path fixture's shape: a partner job for the route queued
    // through the plain partner queue, with a current protected verification.
    const ndPacket = db.scalar("with p as (insert into rcap_document_packets (safety_disclaimer) values ('fixture packet: not legal advice') returning id) select id from p");
    const ndJob = db.scalar(`select id from enqueue_packet_render_job(${q(ndPacket)},${q(ND_ROUTE)},'packet_document_v1','1.0.0',null,'ND',
      '2026-06-19-source-conversion-1',${q(sha("nd-input"))},${q(nd.itemId)},${q(partnerId)},${q(nd.personId)},${q(nd.matterId)},5,null,null)`);
    const ndCycle = await runWorkerCycle(deps);
    check("the plain partner queue still validates the North Dakota artifact", ndCycle.outcome === "finalized" && ndCycle.jobId === ndJob, ndCycle);
    const ndLoaded = await getRenderJob(ndJob);
    check("getRenderJob surfaces no sponsored binding for a partner job the transaction never bound",
      ndLoaded?.partnerId === partnerId && ndLoaded.sponsoredBinding === undefined
        && db.scalar(`select sponsored_route_key is null from packet_render_jobs where id=${q(ndJob)}`) === "t");
    const ndDecision = await authorizePacketDownload(ports(nd.userId), { jobId: ndJob, userId: nd.userId });
    check("with the verification reader present, the North Dakota job is refused for holding no authorized sponsored binding",
      !ndDecision.ok && ndDecision.status === 409 && ndDecision.code === "sponsored_binding_missing", ndDecision);
    check("that is a different answer from an absent reader",
      (await authorizePacketDownload({ ...ports(nd.userId), getCurrentVerification: undefined }, { jobId: ndJob, userId: nd.userId })).code === "verification_not_current");
    check("the North Dakota refusal records no delivery authorization and leaves the job undelivered",
      eventCount(ndJob, "delivery_authorized") === 0
        && db.scalar(`select status from packet_render_jobs where id=${q(ndJob)}`) === "artifact_validated");
    check("the sponsored allowance was not touched by the North Dakota job", clinicUsed() === usedBefore + 1);
  });

  // Current authority/accounting boundary: real application finalizer, real
  // product verification, real local RPCs. No synthetic canonical authority.
  const { buildMsNonConvictionVerification } = await import('./lib/rcap-ms-nonconviction-fixture.mjs');
  const { evaluateAuthoritativeScreeningResult } = await import('../src/lib/expungement-ai/authoritative-screening-result.ts');
  const { packetInformationPatch, protectedPacketDraftSeedFromAuthoritative, protectedPacketDraftHash } = await import('../src/lib/expungement-ai/packet-information.ts');
  const { preparePersonalizedPacket, prepareBoundPersonalizedPacket, renderPersonalizedClaim } = await import('../src/lib/rcap/render/personalized-packet.ts');
  const { sponsoredChannelDecisions } = await import('../src/lib/rcap/fulfillment/sponsored-channel-authority.ts');
  const grant = sponsoredChannelDecisions[0];
  const msPartnerId = PARTNER_ID;
  Object.assign(process.env, { VERCEL_ENV: 'preview', VERCEL_TARGET_ENV: 'preview',
    RCAP_SPONSORED_PREVIEW_CHANNEL: grant.channel, RCAP_CONSUMER_DELIVERY_ROUTE_STATE: grant.routeState,
    NEXT_PUBLIC_SUPABASE_URL: `https://${grant.acceptanceProjectRef}.supabase.co`,
    RCAP_CONSUMER_DELIVERY_STAGING_SCOPE: grant.participantUserIds.join(',') });
  db.sql(`insert into partner_records values(${q(msPartnerId)},${q(grant.partnerSlug)});
    insert into partner_entitlement(partner_slug,screenings_allowed,pause_at_cap) values(${q(grant.partnerSlug)},2,true);
    insert into clinic_events(id,partner_slug,name,jurisdiction,status,sponsorship_allocation)
    values(${q(grant.eventId)},${q(grant.partnerSlug)},${q(grant.eventName)},'MS','published',2);
    update sponsored_packet_render_routes set packet_specification_sha256=${q(grant.packetSpecificationSha256)},
      clinic_event_name=${q(grant.eventName)} where route_key=${q(grant.routeId)};`);
  db.sql(seedPacketCapacitySql('hyflxnlhpmiqxvvcoiia'));
  const capacityBefore=db.json(`select capacity from (${packetCapacitySql()}) q`);
  assertPacketCapacity(capacityBefore);
  db.sql(seedPacketCapacitySql('hyflxnlhpmiqxvvcoiia'));
  assert.deepEqual(db.json(`select capacity from (${packetCapacitySql()}) q`),capacityBefore,'reseed before consumption is byte-idempotent');
  const p = seedParticipant({ jurisdiction:'MS', pathway:grant.routeId.split(':')[1], track:grant.trackId,
    event:grant.eventId, userId:grant.participantUserIds[0], partnerSlug:grant.partnerSlug });
  const verified = buildMsNonConvictionVerification({ evaluateAuthoritativeScreeningResult,
    protectedPacketDraftSeedFromAuthoritative, packetInformationPatch, matterId:p.matterId,
    answerOverrides:{release_confirmed:{value:'Yes'},mcic_identifier_delivery_method:{value:'Confidential court-approved MCIC identifier addendum'},
      mcic_identifier_method_confirmation_source:{value:'Confirmed by Jackson Municipal Court Clerk on 2026-09-25'}} });
  p.snapshot=verified.snapshot; p.verificationHash=verified.hash;
  db.sql(`update consumer_briefcase_items set artifact_refs_json='{"attribution":{"locale":"en"}}'::jsonb where id=${q(p.itemId)}`);
  const { verifiedAt, schemaVersion, ...draftFields }=p.snapshot;
  const draft={...draftFields,schemaVersion:'expungement-ai/protected-packet-draft/v1',capturedAt:verifiedAt};
  db.sql(`update consumer_packet_verifications set verification_snapshot=${q(JSON.stringify(p.snapshot))},
    verification_hash=${q(p.verificationHash)},draft_snapshot=${q(JSON.stringify(draft))},draft_hash=${q(protectedPacketDraftHash(draft))}
    where briefcase_item_id=${q(p.itemId)};`);
  const prepared=preparePersonalizedPacket({authUserId:p.userId,briefcaseItemId:p.itemId,personId:p.personId,
    matterId:p.matterId,verificationHash:p.verificationHash,snapshot:p.snapshot,deliveryLocale:'en'});
  // Independent real files: application admission gets release authority;
  // the post-claim worker gets only its packaged runtime closure.
  const runtimeRoot=path.join(storageRoot,'runtime');
  const publicationInputs=['data/rcap-grade-a/fulfillment-authority-registry.json',
    'data/rcap-grade-a/fulfillment-observation-snapshot.json','data/rcap-render/worker-publication-evidence.json'];
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'deploy/rcap-render-worker/runtime-data-manifest.json')));
  for(const file of [...manifest.files.map(f=>f.path),...publicationInputs]) {
    const dest=path.join(runtimeRoot,file);fs.mkdirSync(path.dirname(dest),{recursive:true});const source=path.join(publicationInputs.includes(file) ? root : process.env.RCAP_REVIEW_WORKER_ROOT ?? root,file);
    if(fs.existsSync(source))fs.copyFileSync(source,dest);
    else fs.writeFileSync(dest,execFileSync('git',['show',`HEAD:${file}`],{cwd:root,maxBuffer:32*1024*1024})); // disposable runtime only; sparse checkout stays sparse
  }
  const {resetFulfillmentRegistryCache}=await import('../src/lib/rcap/fulfillment/grade-a-registry.ts');
  const {resetObservationCache}=await import('../src/lib/rcap/fulfillment/grade-a-admission.ts');
  const reset=()=>{resetFulfillmentRegistryCache();resetObservationCache();};
  const identity={authUserId:p.userId,briefcaseItemId:p.itemId,sourceSessionId:p.sessionId,
    partnerSlug:grant.partnerSlug,personId:p.personId,matterId:p.matterId,verificationHash:p.verificationHash};
  process.chdir(runtimeRoot);reset();
  for(const file of publicationInputs) {
    const original=fs.readFileSync(file);fs.unlinkSync(file);reset();
    try {check(`application enqueue refuses absent ${file}`,await enqueueVerifiedSponsoredRender(prepared.spec,identity,prepared.payload)===null
      && db.scalar(`select count(*) from packet_render_jobs where briefcase_item_id=${q(p.itemId)}`)==='0');}
    finally {fs.writeFileSync(file,original);reset();}
  }
  const enqueued=await enqueueVerifiedSponsoredRender(prepared.spec,identity,prepared.payload);
  check('application enqueue succeeds with full commercial, publication and channel authority',Boolean(enqueued));
  const jobId=enqueued.id;
  const fixture={packetItemId:p.itemId,participantUserId:p.userId,screeningSessionId:p.sessionId};
  const preview={previewVerified:true,stripeConfigured:false,productionAliasCount:0,
    applicationSha:closureAuth.candidate.applicationSha,workerSourceSha:closureAuth.candidate.workerSourceSha,workerDigest:closureAuth.candidate.workerDigest,
    deploymentId:closureAuth.binding.deploymentScope.existingDeploymentId,hostname:closureAuth.binding.deploymentScope.existingHostname,
    acceptanceProjectRef:grant.acceptanceProjectRef,clinicDemoMode:grant.channel,routeState:grant.routeState,stagingScopeSha256:grant.participantScopeSha256};
  const runtime=clinicWorkerContext({preview,participantUserId:p.userId,partnerSlug:grant.partnerSlug,eventId:grant.eventId,eventName:grant.eventName},closureAuth);
  const closure=db.json(`select closure from (${downstreamClosureSql(jobId)}) q`);
  const gateInput={target:closure.target,fixture,preview,runtime,supabaseUrl:`https://${grant.acceptanceProjectRef}.supabase.co`,
    claimOrder:{readOutcome:'read',targetIsClaimable:true,predictedFirstClaim:jobId,targetClaimRank:1,claimablePredecessors:0},housekeeping:[]};
  assertDownstreamClosure(closure,gateInput,closureAuth);
  check('entire pre-worker closure passes on current-schema exact sponsored fixture',true);
  const gateMutations=[
    x=>x.capacity.allPartnerRows=[],x=>x.capacity.allPartnerRows[0].active=false,x=>x.capacity.allPartnerRows[0].packet_cap=0,
    x=>x.capacity.allPartnerRows[0].partner_id=randomUUID(),x=>x.capacity.allPartnerRows[0].entitlement_scope='wrong',
    x=>x.capacity.allPartnerRows.push({...x.capacity.allPartnerRows[0],id:randomUUID()}),
    x=>x.capacity.screening.screenings_allowed=0,x=>x.capacity.eventConsumed=2,
    x=>x.route.active=false,x=>x.route.packet_specification_sha256='0'.repeat(64),x=>x.authority.valid=false,
    x=>x.verification.hash='0'.repeat(64),x=>x.verification.status='stale',x=>x.namespace.caseOwner=randomUUID(),
    x=>x.namespace.event=randomUUID(),x=>x.provenance=1,x=>x.generation=1,x=>x.delivery=1,x=>x.credit=1,
    x=>x.bucket.public=true,x=>x.bucket.allowed_mime_types=['text/html'],x=>x.bucket.file_size_limit=1,
    x=>x.functions.finalize_packet_render_job='wrong'
  ];
  for(const mutate of gateMutations){const bad=structuredClone(closure);mutate(bad);assert.throws(()=>assertDownstreamClosure(bad,gateInput,closureAuth),mutate.toString());}
  for(const mutate of [x=>x.claimOrder.targetClaimRank=2,x=>x.claimOrder.claimablePredecessors=1,x=>x.housekeeping=['other'],
    x=>x.preview.previewVerified=false,x=>x.preview.deploymentId='dpl_wrong',x=>x.preview.applicationSha='a'.repeat(40),x=>x.preview.workerDigest='sha256:'+'a'.repeat(64),
    x=>x.supabaseUrl='https://wwtwtsmywnckfkdaqqeg.supabase.co',...Object.keys(runtime).map(k=>x=>x.runtime[k]='wrong')]){
    const bad=structuredClone(gateInput);mutate(bad);assert.throws(()=>assertDownstreamClosure(closure,bad,closureAuth));
  }
  check('every measurable closure class refuses wrong or missing inputs before worker',true);

  for(const file of publicationInputs) fs.unlinkSync(file);
  reset();
  const claim=await queue.claim('current-channel-boundary');
  assert.equal(claim.id,jobId);
  assert.equal(await queue.startRender(jobId,claim.fencingToken),true);
  const msBytes=await renderPersonalizedClaim(claim);
  const {assertValidArtifact}=await import('../src/lib/rcap/render/artifact-validation.ts');
  const msValidation=assertValidArtifact({bytes:msBytes,expectedContentType:'application/pdf'});
  check('current MS claimed fixture renders personalized PDF and passes local artifact validation',msValidation.valid);
  assert.equal(await queue.startValidation(jobId,claim.fencingToken),true);
  const input={jobId,fencingToken:claim.fencingToken,outputStoragePath:`packet-artifacts/${msPartnerId}/${p.matterId}/${jobId}/${sha(msBytes)}.pdf`,
    localSha256:sha(msBytes),storedSha256:sha(msBytes),localNormalizedSha256:sha(msBytes),storedNormalizedSha256:sha(msBytes),
    outputByteCount:msBytes.length,outputPageCount:msValidation.pageCount,containerDigest:'sha256:'+'a'.repeat(64)};
  assert.equal((await storage.upload(input.outputStoragePath,msBytes)).ok,true);
  assert.ok((await storage.read(input.outputStoragePath)).equals(msBytes));
  const counts=()=>({credits:Number(db.scalar(`select count(*) from packet_credit_ledger where render_job_id=${q(jobId)}`)),
    units:Number(db.scalar(`select count(distinct consumption_unit_hash) from packet_credit_ledger where render_job_id=${q(jobId)}`)),
    clinic:Number(db.scalar(`select screenings_used from partner_entitlement where partner_slug=${q(grant.partnerSlug)}`)),
    publication:Number(db.scalar(`select count(*) from consumer_packet_artifact_provenance where briefcase_item_id=${q(p.itemId)}`))});
  async function finalizeWithoutPublication(input) {
    const read=fs.readFileSync, attempted=[];
    // Observe real filesystem reads; never substitute bytes or a decision.
    fs.readFileSync=function(file,...args) {
      if(typeof file==='string' && publicationInputs.includes(path.relative(runtimeRoot,path.resolve(file)))) attempted.push(file);
      return read.call(this,file,...args);
    };
    try {return await finalizeRenderJob(input);}
    finally {fs.readFileSync=read;assert.deepEqual(attempted,[],'worker finalization must never read commercial/publication authority');}
  }
  async function refuses(label, mutate, restore) {
    mutate();
    try {
      const outcome=await finalizeWithoutPublication(input);
      check(`${label}: real finalizer refuses before accounting (0 → 0)`,outcome===null && counts().credits===0 && counts().units===0 && counts().clinic===0 && counts().publication===0,{outcome,counts:counts()});
      check(`${label}: no deliverable artifact`,db.scalar(`select delivery_eligibility from packet_render_jobs where id=${q(jobId)}`)!=='eligible');
    } finally { restore(); }
  }
  const staticPath='data/rcap-grade-a/worker-static-authority.json';
  const staticBytes=fs.readFileSync(staticPath);
  await refuses('missing static authority',()=>fs.unlinkSync(staticPath),()=>fs.writeFileSync(staticPath,staticBytes));
  await refuses('corrupt static authority',()=>fs.writeFileSync(staticPath,'{}'),()=>fs.writeFileSync(staticPath,staticBytes));
  const {staticAuthorityHash}=await import('./lib/worker-static-authority.mjs');
  const wrong=JSON.parse(staticBytes);const entry=wrong.entries.find(e=>e.record.routeId===grant.routeId);
  entry.record.revocation.revoked=true;entry.sha256=staticAuthorityHash({record:entry.record,observation:entry.observation});
  await refuses('revoked static packet authority',()=>fs.writeFileSync(staticPath,JSON.stringify(wrong)),()=>fs.writeFileSync(staticPath,staticBytes));
  const receipt=JSON.parse(fs.readFileSync(path.join(root,publicationInputs[2])));
  const selfReference=JSON.parse(staticBytes);const selfEntry=selfReference.entries.find(e=>e.record.routeId===grant.routeId);
  selfEntry.record.provider.imageDigest=receipt.immutableRegistryDigest;
  selfEntry.observation.provider.imageDigest=receipt.immutableRegistryDigest;
  selfEntry.observation.externalPublication={sourceSha:receipt.sourceSha,immutableRegistryDigest:receipt.immutableRegistryDigest};
  selfEntry.sha256=staticAuthorityHash({record:selfEntry.record,observation:selfEntry.observation});
  assert.notEqual(input.containerDigest,receipt.immutableRegistryDigest);
  await refuses('old published source/digest cannot authorize a different running worker',
    ()=>fs.writeFileSync(staticPath,JSON.stringify(selfReference)),()=>fs.writeFileSync(staticPath,staticBytes));
  await refuses('absent current grant',()=>sponsoredChannelDecisions.pop(),()=>sponsoredChannelDecisions.push(grant));
  await refuses('wrong specification',()=>db.sql(`update sponsored_packet_render_routes set packet_specification_sha256=${q('a'.repeat(64))} where route_key=${q(grant.routeId)}`),
    ()=>db.sql(`update sponsored_packet_render_routes set packet_specification_sha256=${q(grant.packetSpecificationSha256)} where route_key=${q(grant.routeId)}`));
  await refuses('wrong partner',()=>db.sql(`update clinic_events set partner_slug='wrong-partner' where id=${q(grant.eventId)}`),
    ()=>db.sql(`update clinic_events set partner_slug=${q(grant.partnerSlug)} where id=${q(grant.eventId)}`));
  await refuses('wrong event',()=>db.sql(`update clinic_events set name='Wrong Clinic' where id=${q(grant.eventId)}`),
    ()=>db.sql(`update clinic_events set name=${q(grant.eventName)} where id=${q(grant.eventId)}`));
  for(const [label,key,value] of [['wrong participant scope','RCAP_CONSUMER_DELIVERY_STAGING_SCOPE',randomUUID()],
    ['wrong acceptance project','NEXT_PUBLIC_SUPABASE_URL','https://wrong.supabase.co'],
    ['wrong channel','RCAP_SPONSORED_PREVIEW_CHANNEL','hosted_full'],['wrong Preview','VERCEL_ENV','development']]) {
    const old=process.env[key]; await refuses(label,()=>process.env[key]=value,()=>process.env[key]=old);
  }
  await refuses('Production',()=>{process.env.VERCEL_ENV='production';process.env.VERCEL_TARGET_ENV='production';},
    ()=>{process.env.VERCEL_ENV='preview';process.env.VERCEL_TARGET_ENV='preview';});
  await refuses('wrong protected verification',()=>db.sql(`update consumer_packet_verifications set verification_hash=${q('0'.repeat(64))} where briefcase_item_id=${q(p.itemId)}`),
    ()=>db.sql(`update consumer_packet_verifications set verification_hash=${q(p.verificationHash)} where briefcase_item_id=${q(p.itemId)}`));
  check('worker finalization has no committed publication authority files',publicationInputs.every(f=>!fs.existsSync(f)));
  const rawFinalize=`select * from public.finalize_packet_render_job(${q(jobId)},${q(input.fencingToken)},${q(input.outputStoragePath)},${q(input.localSha256)},${q(input.localNormalizedSha256)},${q(input.storedSha256)},${q(input.storedNormalizedSha256)},${input.outputByteCount},${input.outputPageCount},${q(input.containerDigest)})`;
  for(const [label,change,expected] of [
    ['missing entitlement',`delete from partner_packet_entitlement where id=${q(ENTITLEMENT_ID)}`,'unauthorized'],
    ['expired entitlement',`update partner_packet_entitlement set expires_at=now()-interval '1 second' where id=${q(ENTITLEMENT_ID)}`,'unauthorized'],
    ['packet cap reached',`update partner_packet_entitlement set packet_cap=0 where id=${q(ENTITLEMENT_ID)}`,'cap_reached'],
    ['wrong partner id',`update partner_packet_entitlement set partner_id=${q(partnerId)},expires_at=now()+interval '1 day' where id=${q(ENTITLEMENT_ID)}`,'unauthorized']
  ]) {
    db.sql(`begin;${change};do $$ declare r record;again record;begin ${rawFinalize} into r;
      if r.accounting_result<>${q(expected)} or r.delivery_eligibility<>'accounting_blocked' then raise exception 'accounting negative mismatch';end if;
      if exists(select 1 from packet_credit_ledger where render_job_id=${q(jobId)}) then raise exception 'unexpected credit';end if;
      ${rawFinalize} into again;if again.accounting_result<>r.accounting_result then raise exception 'blocked replay differs';end if;
    end $$;rollback;`);
    check(`${label} reproduces ${expected}/accounting_blocked with no consumption and sticky replay`,true);
  }
  const payload=prepared.payload.renderInputPayload;
  const artifact={provider:'rcap_grade_a_composer_v1',source:'grade_a_packet_specification',contentType:'application/pdf',
    packetId:p.itemId,renderPacketId:prepared.spec.packetId,renderJobId:jobId,fileName:'record-clearing-packet.pdf',
    generatedAt:new Date().toISOString(),verificationHash:p.verificationHash,packetSpecificationId:payload.specificationId,
    packetSpecificationVersion:payload.specificationVersion,packetSpecificationSha256:payload.specificationSha256,packetFamily:payload.packetFamilyId,
    artifactSha256:input.localSha256,pageCount:input.outputPageCount,documentCount:prepared.packet.documents.length,
    storagePath:input.outputStoragePath,downloadPath:`/api/rcap/packets/${jobId}/download`};
  const publish=`select * from finalize_sponsored_packet_generation_for_route(${q(grant.routeId)},${q(p.sessionId)},${q(p.itemId)},${q(p.verificationHash)},${q(JSON.stringify(artifact))}::jsonb,${q(jobId)})`;
  for(const [label,change,reason] of [
    ['positive raw full chain','',null],
    ['screening allowance exhausted',`update partner_entitlement set screenings_allowed=screenings_used where partner_slug=${q(grant.partnerSlug)}`,'paused_at_cap'],
    ['event allocation exhausted',`update clinic_events set sponsorship_allocation=1 where id=${q(grant.eventId)};
      insert into clinic_cases(id,event_id,matter_id) select gen_random_uuid(),${q(grant.eventId)},briefcase_item_id from consumer_packet_artifact_provenance where entitlement_source='partner_sponsorship' limit 1;`,'event_sponsorship_exhausted'],
    ['wrong event',`update clinic_events set name='Wrong Clinic' where id=${q(grant.eventId)}`,'clinic_scope_mismatch'],
    ['wrong verification',`update consumer_packet_verifications set verification_hash=${q('0'.repeat(64))} where briefcase_item_id=${q(p.itemId)}`,'verification_mismatch'],
    ['wrong specification',`update sponsored_packet_render_routes set packet_specification_sha256=${q('0'.repeat(64))} where route_key=${q(grant.routeId)}`,'malformed_artifact']
  ]) {
    if(label==='wrong verification') {
      assert.match(db.sqlExpectError(`begin;${change};${rawFinalize};rollback;`),/stale verification authority/);
      check('wrong verification: current SQL guard refuses even before accounting',true);continue;
    }
    db.sql(`begin;${change};do $$ declare r record;pub record;begin ${rawFinalize} into r;
      if r.accounting_result<>'consumed' or r.delivery_eligibility<>'eligible' then raise exception 'packet positive mismatch';end if;
      ${publish} into pub;
      ${reason?`if pub.ok or pub.reason<>${q(reason)} then raise exception 'sponsored negative mismatch: %',row_to_json(pub);end if;
      if exists(select 1 from consumer_packet_artifact_provenance where briefcase_item_id=${q(p.itemId)}) then raise exception 'unexpected publication';end if;`:
      `if not pub.ok or not pub.recorded then raise exception 'full-chain positive mismatch: %',row_to_json(pub);end if;`}
    end $$;rollback;`);
    check(`${label}: current SQL transaction boundary proved and rolled back`,true);
  }
  // Current SQL selects latest active partner entitlement regardless of scope.
  // The new gate, not a fictional SQL scope check, closes this known gap.
  check('wrong entitlement scope is refused by pre-worker closure',true);
  const outcome=await finalizeWithoutPublication(input);
  check('exact approved channel: real finalizer consumes and publishes once',outcome?.accountingResult==='consumed'
    && outcome.deliveryEligibility==='eligible' && counts().credits===1 && counts().units===1 && counts().clinic===1 && counts().publication===1,{outcome,counts:counts()});
  const again=await finalizeWithoutPublication(input);
  check('real finalizer replay adds no credit or publication',again!==null && counts().credits===1 && counts().units===1 && counts().clinic===1 && counts().publication===1,{again,counts:counts()});

  // The worker intentionally lacked release files above. Download is the app
  // surface and must regain its real commercial/publication authority.
  for(const file of publicationInputs)fs.copyFileSync(path.join(root,file),path.join(runtimeRoot,file));reset();
  const generatedCount=()=>Number(db.scalar(`select count(*) from rcap_screening_analytics_events where session_id=${q(p.sessionId)} and event_type='packet_generated'`));
  check('MS finalized session consumed, case packet_ready and one packet_generated',
    db.scalar(`select claimed_slot_state from screening_sessions where session_id=${q(p.sessionId)}`)==='consumed'
    && db.scalar(`select queue_status from clinic_cases where matter_id=${q(p.itemId)}`)==='packet_ready'&&generatedCount()===1);
  const creditsBefore=counts();
  let anonymousStatus;
  for(const userId of [undefined,randomUUID()]) {
    const denied=await authorizePacketDownload(ports(userId),{jobId,userId});assert.equal(denied.ok,false);
    if(userId===undefined){anonymousStatus=denied.status;assert.ok([401,404].includes(anonymousStatus));}
  }
  for(const repeat of [false,true]) {
    const decision=await authorizePacketDownload(ports(p.userId),{jobId,userId:p.userId});assert.equal(decision.ok,true,JSON.stringify(decision));
    const response=await streamAuthorizedPacket(ports(p.userId),decision,{userId:p.userId});const downloaded=Buffer.from(await response.arrayBuffer());
    assert.equal(downloaded.length,input.outputByteCount);assert.equal(sha(downloaded),input.localSha256);assert.ok(downloaded.equals(msBytes));
    await new Promise(resolve=>setTimeout(resolve,50));
    for(const event of ['delivery_authorized','transmission_started','transmission_completed'])assert.equal(eventCount(jobId,event),repeat?2:1,event);
    assert.equal((await getRenderJob(jobId)).status,'delivered');assert.deepEqual(counts(),creditsBefore);assert.equal(generatedCount(),1);
  }
  check('same current MS fixture owner/repeat delivery, anonymous/wrong-owner refusal and three-event completion preserve credits and bytes',true);
  const ledgerBeforeSeed=db.json("select coalesce(jsonb_agg(to_jsonb(l) order by id),'[]'::jsonb) from packet_credit_ledger l");
  const otherEntitlements=db.json(`select jsonb_agg(to_jsonb(e) order by id) from partner_packet_entitlement e where id<>${q(ENTITLEMENT_ID)}`);
  process.chdir(root);
  db.sql(seedPacketCapacitySql('hyflxnlhpmiqxvvcoiia'));const afterSeed=db.json(`select capacity from (${packetCapacitySql()}) q`);
  assert.equal(assertPacketCapacity(afterSeed).remaining,1);assert.equal(afterSeed.allPartnerRows[0].packet_cap,2);
  db.sql(seedPacketCapacitySql('hyflxnlhpmiqxvvcoiia'));assert.deepEqual(db.json(`select capacity from (${packetCapacitySql()}) q`),afterSeed);
  assert.deepEqual(db.json("select coalesce(jsonb_agg(to_jsonb(l) order by id),'[]'::jsonb) from packet_credit_ledger l"),ledgerBeforeSeed);
  assert.deepEqual(db.json(`select jsonb_agg(to_jsonb(e) order by id) from partner_packet_entitlement e where id<>${q(ENTITLEMENT_ID)}`),otherEntitlements);
  assert.throws(()=>seedPacketCapacitySql('wwtwtsmywnckfkdaqqeg'));
  for(const change of [
    `update partner_packet_entitlement set entitlement_scope='wrong' where id=${q(ENTITLEMENT_ID)}`,
    `update partner_packet_entitlement set overage_enabled=true where id=${q(ENTITLEMENT_ID)}`,
    `update partner_entitlement set screenings_allowed=screenings_used where partner_slug=${q(grant.partnerSlug)}`,
    `update clinic_events set sponsorship_allocation=1 where id=${q(grant.eventId)}`
  ])assert.match(db.sqlExpectError(`begin;${change};${seedPacketCapacitySql('hyflxnlhpmiqxvvcoiia')}rollback;`),/drift|exhausted|invalid/);
  // Execute the current audit's database-backed checks against this same fixture.
  // Staff/reset assertions remain separate browser boundaries, not fabricated UI proof.
  const server={event:afterSeed.event,
    clinic_case:db.json(`select to_jsonb(c) from clinic_cases c where matter_id=${q(p.itemId)}`),
    screening:db.json(`select to_jsonb(s) from screening_sessions s where session_id=${q(p.sessionId)}`),
    provenance:db.json(`select to_jsonb(v) from consumer_packet_artifact_provenance v where briefcase_item_id=${q(p.itemId)}`),
    render_jobs:db.json(`select jsonb_agg(to_jsonb(j)) from packet_render_jobs j where id=${q(jobId)}`),
    credit_event_count:generatedCount(),credit_event:db.json(`select jsonb_build_object('counted_as',metadata->>'counted_as','clinic_event_id',metadata->>'clinic_event_id') from rcap_screening_analytics_events where session_id=${q(p.sessionId)} and event_type='packet_generated'`),
    entitlement:afterSeed.screening};
  const browser={screeningSessionId:p.sessionId,artifactSha256:input.localSha256,repeatDownloadSha256:input.localSha256,
    naturalDelivery:{targetRenderJobId:jobId,getRenderJob:await getRenderJob(jobId),completionObservedBeforeRepeatDownload:true,receiptRepairPerformed:false,anonymousStatus}};
  const auditSource=fs.readFileSync(path.join(root,'scripts/rcap-hosted-ms-clinic-preview-audit.mjs'),'utf8');
  const auditBlock=auditSource.slice(auditSource.indexOf('  exactEvent:'),auditSource.indexOf('  eventScopedStaffStatus:'));
  const auditChecks=new Function('server','browser','EVENT_ID','EVENT_NAME','itemId','participantA','provenanceArtifact',`return ({${auditBlock}})`)(server,browser,grant.eventId,grant.eventName,p.itemId,{id:p.userId},server.provenance.artifact);
  assert.ok(Object.values(auditChecks).every(Boolean),JSON.stringify(auditChecks));
  check('current server audit database-backed finalization/delivery checks are satisfiable by the same MS fixture',true);
  process.chdir(runtimeRoot);
  check('post-success reseed preserves stable entitlement, history, other partners and one remaining credit without refill',true);
  const outsider=seedParticipant({jurisdiction:'MS',pathway:grant.routeId.split(':')[1],track:grant.trackId,
    event:grant.eventId,partnerSlug:grant.partnerSlug});
  outsider.snapshot=p.snapshot;outsider.verificationHash=p.verificationHash;
  db.sql(`update consumer_briefcase_items set artifact_refs_json='{"attribution":{"locale":"en"}}'::jsonb where id=${q(outsider.itemId)};
    update consumer_packet_verifications set verification_snapshot=${q(JSON.stringify(p.snapshot))},verification_hash=${q(p.verificationHash)},
    draft_snapshot=${q(JSON.stringify(draft))},draft_hash=${q(protectedPacketDraftHash(draft))} where briefcase_item_id=${q(outsider.itemId)};`);
  const {workerStaticPacketBinding}=await import('../src/lib/rcap/fulfillment/worker-static-authority.ts');
  const outsiderPacket=prepareBoundPersonalizedPacket({authUserId:outsider.userId,briefcaseItemId:outsider.itemId,
    personId:outsider.personId,matterId:outsider.matterId,verificationHash:outsider.verificationHash,snapshot:outsider.snapshot,deliveryLocale:'en'},
    workerStaticPacketBinding(grant.routeId,grant.trackId), "claimed_worker");
  // An otherwise protected registered job cannot rely on registration alone.
  const outsiderJob=db.scalar(enqueueSql(outsider,{routeKey:grant.routeId,packetId:outsiderPacket.spec.packetId,
    inputHash:outsiderPacket.spec.inputHash,packet:outsiderPacket.payload.renderPacket,payload:outsiderPacket.payload.renderInputPayload}));
  const outsiderClaim=await queue.claim('outsider-refusal');assert.equal(outsiderClaim.id,outsiderJob);
  await queue.startRender(outsiderJob,outsiderClaim.fencingToken);await queue.startValidation(outsiderJob,outsiderClaim.fencingToken);
  check('wrong participant refuses before accounting (0 → 0)',await finalizeWithoutPublication({...input,jobId:outsiderJob,
    fencingToken:outsiderClaim.fencingToken,outputStoragePath:`${outsiderJob}/${sha(bytes)}.pdf`})===null
    && db.scalar(`select count(*) from packet_credit_ledger where render_job_id=${q(outsiderJob)}`)==='0'
    && db.scalar(`select count(*) from consumer_packet_artifact_provenance where briefcase_item_id=${q(outsider.itemId)}`)==='0');

  console.log(`Sponsored delivery binding: ${checks.length} checks PASS on the shipped job loader, publication check and delivery core (local ephemeral PostgreSQL; the non-Illinois registration is a test-only fixture row)`);
} finally {
  process.chdir(root);
  db.stop();
  fs.rmSync(storageRoot, { recursive: true, force: true });
}
