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
const { getRenderJob } = await import("../src/lib/rcap/render/job-queue.ts");
const { authorizePacketDownload, streamAuthorizedPacket } = await import("../src/lib/rcap/render/packet-delivery.ts");
const { consumerPersonMatchKey, consumerMatterIdForItem } = await import("../src/lib/expungement-ai/consumer-identity.ts");

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
const FIXTURE = path.join(root, "data/rcap-all50/overlays/census-v1/il/il-prostitution-j-vacate-set--custom-pleading/fixtures/canonical.pdf");

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

const db = startEphemeralPg();
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
    const row = db.json(`select row_to_json(t) from (select * from claim_packet_render_job(${q(worker)},null,60)) t`);
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
  async finalize(input) {
    const row = db.json(`select row_to_json(t) from (select * from finalize_packet_render_job(${q(input.jobId)},${q(input.fencingToken)},${q(input.outputStoragePath)},${q(input.localSha256)},${q(input.localNormalizedSha256)},${q(input.storedSha256)},${q(input.storedNormalizedSha256)},${input.outputByteCount},${input.outputPageCount},${q(input.containerDigest)})) t`);
    return row && {
      accountingResult: row.accounting_result, deliveryEligibility: row.delivery_eligibility,
      consumptionUnitHash: row.consumption_unit_hash, creditLedgerId: row.credit_ledger_id
    };
  },
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

function seedParticipant({ jurisdiction, pathway, track, event = eventId }) {
  const userId = randomUUID(), itemId = randomUUID(), personId = randomUUID();
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
        'rcap_partner',${q(PARTNER_SLUG)},${q(jurisdiction)},${q(event)});
    insert into screening_sessions(session_id,flow_mode,partner_benefit_active,partner_slug,jurisdiction,
      claimed_slot_state,status) values(${q(sessionId)},'rcap',true,${q(PARTNER_SLUG)},${q(jurisdiction)},'claimed','in_progress');
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
  db.sql(baseline());
  for (const phase of ["26-consumer-briefcase-items", "27-consumer-checkout-metadata",
    "28-consumer-packet-generation-status", "49-rcap-packet-render-jobs",
    "50-rcap-packet-delivery-hardening", "51-rcap-consumer-payment-gate",
    "52-rcap-consumer-payment-authority", "53-rcap-consumer-job-binding",
    "54-rcap-person-namespace-hardening", "55-expungement-matter-payment-binding"]) {
    db.applyFile(path.join(root, `supabase/phase-${phase}.sql`));
  }
  db.sql(clinicFixtures());
  for (const migration of ["supabase/migrations/20260901115000_consumer_packet_artifact_provenance.sql",
    "supabase/migrations/20260901120000_dtc_consumer_launch_rails.sql",
    "supabase/migrations/20260901130000_consumer_private_delivery.sql",
    "supabase/migrations/20260901140000_tighten_consumer_artifact_authorization.sql",
    "supabase/migrations/20260903130000_atomic_sponsored_packet_finalization.sql",
    "supabase/migrations/20260906120000_sponsored_route_render_transaction.sql",
    "supabase/migrations/20260906130000_verified_artifact_regeneration.sql"]) {
    db.applyFile(path.join(root, migration));
  }
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

    const queued = await getRenderJob(aliceJob);
    check("getRenderJob surfaces the binding for a non-Illinois partner job from the row, naming the route it was bound to",
      queued?.partnerId === partnerId && queued.sponsoredBinding?.routeKey === ROUTE
        && queued.sponsoredBinding.verificationHash === alice.verificationHash
        && queued.sponsoredBinding.authUserId === alice.userId
        && queued.sponsoredBinding.briefcaseItemId === alice.itemId
        && queued.sponsoredBinding.sourceSessionId === alice.sessionId
        && queued.sponsoredBinding.clinicEventId === eventId, queued?.sponsoredBinding);
    check("the Illinois personalized binding is not invented for another route", queued.personalizedBinding === undefined);

    const cycle = await runWorkerCycle(deps);
    check("the worker finalizes the sponsored job", cycle.outcome === "finalized" && cycle.jobId === aliceJob
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

  console.log(`Sponsored delivery binding: ${checks.length} checks PASS on the shipped job loader, publication check and delivery core (local ephemeral PostgreSQL; the non-Illinois registration is a test-only fixture row)`);
} finally {
  db.stop();
  fs.rmSync(storageRoot, { recursive: true, force: true });
}
