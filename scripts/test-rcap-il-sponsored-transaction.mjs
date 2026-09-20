#!/usr/bin/env node

// Focused database proof for the scoped sponsored render transaction added by
// supabase/migrations/20260906120000_sponsored_route_render_transaction.sql.
//
// Everything runs in a disposable local PostgreSQL 16 cluster on a private Unix
// socket through the existing scripts/lib/rcap-ephemeral-pg.mjs harness. No
// hosted Supabase, no Production database, no Stripe, no application
// connection. Boundaries replaced by fixtures are named in the return.
//
//   node --import ./scripts/test-rcap-il-delivery-loader.mjs \
//        scripts/test-rcap-il-sponsored-transaction.mjs
//
// (the loader is a no-op for this script's imports; it is accepted so the whole
// Illinois delivery suite runs under one command form.)

import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { register } from "node:module";
import { fileURLToPath } from "node:url";
import { ephemeralPgAvailable, startEphemeralPg } from "./lib/rcap-ephemeral-pg.mjs";

register("./lib/ts-esm-loader.mjs", import.meta.url);
const { runWorkerCycle } = await import("../src/lib/rcap/render/render-worker.ts");
const { consumerPersonMatchKey, consumerMatterIdForItem } = await import("../src/lib/expungement-ai/consumer-identity.ts");

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MIGRATION = "supabase/migrations/20260906120000_sponsored_route_render_transaction.sql";
const REGENERATION_MIGRATION = "supabase/migrations/20260906130000_verified_artifact_regeneration.sql";
const MS_MIGRATION = "supabase/migrations/20260903130000_atomic_sponsored_packet_finalization.sql";
const PROVENANCE_MIGRATION = "supabase/migrations/20260901115000_consumer_packet_artifact_provenance.sql";

const IL_ROUTE = "IL:felony-prostitution-relief";
const IL_TRACK = "il-prostitution-j-vacate";
const IL_FAMILY = "il-prostitution-j-vacate-set";
const IL_SPEC_ID = "il-felony-prostitution-relief";
const IL_SPEC_VERSION = "1.0.0";
const IL_SPEC_SHA = "bc9050e096eeb99677edb9815eacae7c68d22914d8c08a785dfc375c68ed010f";
const IL_PARTNER = "il-clinic-sponsor";
const FIXTURE = path.join(root, "data/rcap-all50/overlays/census-v1/il/il-prostitution-j-vacate-set--custom-pleading/fixtures/canonical.pdf");

if (!ephemeralPgAvailable()) {
  console.error("test-rcap-il-sponsored-transaction requires a local PostgreSQL 16 toolchain.");
  process.exit(1);
}

const checks = [];
function check(label, condition, detail) {
  assert.equal(Boolean(condition), true, `${label}${detail === undefined ? "" : ` :: ${JSON.stringify(detail)}`}`);
  checks.push(label);
  console.log(`ok ${checks.length} - ${label}`);
}
const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replaceAll("'", "''")}'`);
const sha = (v) => createHash("sha256").update(v).digest("hex");

// ---------------------------------------------------------------------------
// Part 1: the assigned Illinois sponsored route on the real queue.
// ---------------------------------------------------------------------------

const db = startEphemeralPg();
const storageRoot = fs.mkdtempSync(path.join(os.tmpdir(), "il-sponsored-artifacts-"));
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

function deps(renderer) {
  return {
    queue, storage, renderer,
    allowlists: {
      allowedSourceShas: new Set(),
      knownProfileVersions: new Set(["2026-06-19-source-conversion-1"]),
      supportedRendererKinds: new Set(["packet_document_v1"])
    },
    workerId: "il-sponsored-test",
    containerDigest: "sha256:local-il-sponsored-test"
  };
}
const goodRenderer = { render: async () => bytes };
const brokenRenderer = { render: async () => { throw new Error("synthetic render failure"); } };

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
      missing_fields text[], safety_disclaimer text);
    create table rcap_document_packet_inputs(document_packet_id uuid primary key, partner_slug text, input_payload jsonb);
  `;
}

// Clinic-mode shapes the sponsored transaction reads. These mirror the columns
// the real clinic-mode migrations define; the real clinic-mode migrations pull
// in partner_users/auth wiring this focused harness does not need.
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
const otherPartnerId = randomUUID();
const eventId = randomUUID();
const otherEventId = randomUUID();

function seedParticipant({ jurisdiction = "IL", track = IL_TRACK, pathway = "felony-prostitution-relief",
  product = "rcap_partner", partnerSlug = IL_PARTNER, event = eventId, caseEvent = event,
  claimedUser = null, disposition = "packet", benefit = true } = {}) {
  const userId = randomUUID();
  const itemId = randomUUID();
  const personId = randomUUID();
  const pendingId = randomUUID();
  const sessionId = randomUUID();
  const matterId = consumerMatterIdForItem(itemId);
  const snapshot = {
    schemaVersion: "expungement-ai/final-verification/v1", jurisdiction, pathwayId: pathway,
    selectedTrackId: track, verifiedAt: "2026-09-06T00:00:00.000Z",
    profileVersion: "2026-06-19-source-conversion-1", packetAnswers: { participant_full_legal_name: `P-${itemId.slice(0, 8)}` },
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
      values(${q(pendingId)},'CLAIMED',${q(itemId)},${q(claimedUser ?? userId)},now(),${q(sessionId)},
        ${q(product)},${q(partnerSlug)},${q(jurisdiction)},${q(event)});
    insert into screening_sessions(session_id,flow_mode,partner_benefit_active,partner_slug,jurisdiction,
      claimed_slot_state,status) values(${q(sessionId)},'rcap',${benefit},${q(partnerSlug)},${q(jurisdiction)},'claimed','in_progress');
    insert into clinic_cases(id,event_id,participant_user_id,screening_session_id,matter_id,jurisdiction,
      route_disposition,queue_status) values(${q(randomUUID())},${q(caseEvent)},${q(userId)},${q(sessionId)},
        ${q(itemId)},${q(jurisdiction)},${q(disposition)},'in_progress');
  `);
  return { userId, itemId, personId, pendingId, sessionId, matterId, snapshot, verificationHash };
}

function renderPayload(p, { routeKey = IL_ROUTE, family = IL_FAMILY, track = IL_TRACK,
  specId = IL_SPEC_ID, specVersion = IL_SPEC_VERSION, specSha = IL_SPEC_SHA } = {}) {
  const packetId = randomUUID();
  const inputHash = sha(`${p.itemId}:${p.verificationHash}:${routeKey}`);
  const payload = {
    schemaVersion: "rcap-personalized-render/v1", authUserId: p.userId, briefcaseItemId: p.itemId,
    personId: p.personId, matterId: p.matterId, verificationHash: p.verificationHash, snapshot: p.snapshot,
    routeId: routeKey, trackId: track, packetFamilyId: family, specificationId: specId,
    specificationVersion: specVersion, specificationSha256: specSha, inputHash
  };
  const packet = {
    id: packetId, user_id: p.userId, briefcase_id: p.itemId, person_id: p.personId,
    state: p.snapshot.jurisdiction, jurisdiction: p.snapshot.jurisdiction,
    document_type: "source_driven_packet", pathway: "source_engine_packet_plan", status: "ready_for_review"
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

function artifactFor(p, outputSha, overrides = {}) {
  return {
    provider: "rcap_grade_a_composer_v1", packetId: p.itemId, fileName: "illinois-record-clearing-packet.pdf",
    contentType: "application/pdf", generatedAt: "2026-09-06T00:00:00.000Z",
    source: "grade_a_packet_specification", packetSpecificationId: IL_SPEC_ID,
    packetSpecificationVersion: IL_SPEC_VERSION, packetSpecificationSha256: IL_SPEC_SHA,
    packetFamily: IL_FAMILY, documentCount: 2, verificationHash: p.verificationHash,
    downloadPath: `/api/expungement-ai/packet/${p.itemId}/download`, artifactSha256: outputSha,
    pageCount: 3, ...overrides
  };
}

function finalize(routeKey, p, artifact, jobId) {
  return db.json(`select to_jsonb(x) from (select * from finalize_sponsored_packet_generation_for_route(
    ${q(routeKey)},${q(p.sessionId)},${q(p.itemId)},${q(p.verificationHash)},
    ${q(JSON.stringify(artifact))}::jsonb,${q(jobId)})) x`);
}

const clinicUsed = () => Number(db.scalar(`select screenings_used from partner_entitlement where partner_slug=${q(IL_PARTNER)}`));
const provenanceCount = () => Number(db.scalar("select count(*) from consumer_packet_artifact_provenance"));
const ledgerConsumed = (jobId) => Number(db.scalar(`select count(*) from packet_credit_ledger where render_job_id=${q(jobId)} and event_type in ('consumed','overage_consumed')`));

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
  for (const migration of [PROVENANCE_MIGRATION, "supabase/migrations/20260901120000_dtc_consumer_launch_rails.sql",
    "supabase/migrations/20260901130000_consumer_private_delivery.sql",
    "supabase/migrations/20260901140000_tighten_consumer_artifact_authorization.sql",
    MS_MIGRATION, MIGRATION, REGENERATION_MIGRATION]) {
    db.applyFile(path.join(root, migration));
  }
  // A forward migration has to be re-runnable; applying it twice must not fail
  // and must not duplicate a registration row.
  db.applyFile(path.join(root, MIGRATION));
  db.applyFile(path.join(root, REGENERATION_MIGRATION));
  check("the migration is re-runnable and does not duplicate a registration",
    db.scalar("select count(*) from sponsored_packet_render_routes") === "2");
  db.sql(`
    insert into partner_records values (${q(partnerId)},${q(IL_PARTNER)}), (${q(otherPartnerId)},'other-sponsor');
    insert into partner_packet_entitlement(partner_id,packet_cap,overage_enabled,overage_cap)
      values (${q(partnerId)},20,false,0),(${q(otherPartnerId)},20,false,0);
    insert into partner_entitlement(partner_slug,screenings_used,screenings_allowed,pause_at_cap,overage_enabled)
      values (${q(IL_PARTNER)},0,10,true,false);
    insert into clinic_events(id,partner_slug,name,jurisdiction,status,sponsorship_allocation)
      values (${q(eventId)},${q(IL_PARTNER)},'Illinois Record Clearing Clinic','IL','published',10),
             (${q(otherEventId)},'other-sponsor','Other Clinic','IL','published',10);
  `);

  // --- registration and surface -------------------------------------------
  check("the assigned Illinois route is registered and the automatic sibling is not",
    db.scalar(`select (select count(*) from sponsored_packet_render_routes where route_key=${q(IL_ROUTE)}
      and registry_track_id=${q(IL_TRACK)} and packet_family_id=${q(IL_FAMILY)} and active)=1
      and (select count(*) from sponsored_packet_render_routes where registry_track_id='il-prostitution-j-auto')=0`) === "t");
  check("every new function is service_role only",
    db.scalar(`select bool_and(has_function_privilege('service_role',s,'EXECUTE')
        and not has_function_privilege('anon',s,'EXECUTE')
        and not has_function_privilege('authenticated',s,'EXECUTE'))
      from unnest(array[
        'public.enqueue_verified_sponsored_packet_render(text,uuid,uuid,text,text,text,text,text,text,text,uuid,uuid,uuid,integer,uuid,text,jsonb,jsonb)',
        'public.finalize_sponsored_packet_generation_for_route(text,uuid,uuid,text,jsonb,uuid)',
        'public.finalize_sponsored_packet_generation_if_verified(uuid,uuid,text,jsonb)',
        'public.sponsored_packet_render_authority(text,uuid,uuid,uuid)']) s`) === "t");
  check("browser roles cannot read the registration or write a sponsored binding",
    db.scalar(`select not has_table_privilege('anon','public.sponsored_packet_render_routes','SELECT')
      and not has_table_privilege('authenticated','public.sponsored_packet_render_routes','SELECT')
      and not has_column_privilege('authenticated','public.packet_render_jobs','sponsored_route_key','UPDATE')
      and not has_column_privilege('authenticated','public.packet_render_jobs','sponsored_verification_hash','UPDATE')`) === "t");

  // --- happy path ----------------------------------------------------------
  const alice = seedParticipant();
  const aliceRender = renderPayload(alice);
  const aliceJob = db.scalar(enqueueSql(alice, aliceRender));
  check("sponsored enqueue creates one durable job bound to participant, session and route",
    db.scalar(`select count(*)=1 from packet_render_jobs where id=${q(aliceJob)}
      and sponsored_route_key=${q(IL_ROUTE)} and sponsored_consumer_briefcase_item_id=${q(alice.itemId)}
      and sponsored_consumer_auth_user_id=${q(alice.userId)} and sponsored_session_id=${q(alice.sessionId)}
      and sponsored_verification_hash=${q(alice.verificationHash)} and sponsored_clinic_event_id=${q(eventId)}
      and partner_id=${q(partnerId)} and consumer_briefcase_item_id is null`) === "t");
  check("no consumer payment was created to reach the queue",
    db.scalar("select count(*) from consumer_packet_payment_consumption") === "0"
    && db.scalar(`select count(*) from consumer_briefcase_items where id=${q(alice.itemId)} and payment_status='paid'`) === "0");

  const aliceCycle = await runWorkerCycle(deps(goodRenderer));
  check("the worker verification guard admits the sponsored job and it finalizes",
    aliceCycle.outcome === "finalized" && aliceCycle.jobId === aliceJob
      && aliceCycle.accountingResult === "consumed" && aliceCycle.deliveryEligibility === "eligible", aliceCycle);
  const aliceOutputSha = db.scalar(`select output_sha256 from packet_render_jobs where id=${q(aliceJob)}`);
  check("the validated bytes are the rendered bytes", aliceOutputSha === sha(bytes));

  const beforeUsed = clinicUsed();
  const aliceFinal = finalize(IL_ROUTE, alice, artifactFor(alice, aliceOutputSha), aliceJob);
  check("finalization consumes exactly one clinic-mode credit and records provenance",
    aliceFinal.ok === true && aliceFinal.recorded === true && aliceFinal.counted_as === "included"
      && clinicUsed() === beforeUsed + 1 && provenanceCount() === 1
      && ledgerConsumed(aliceJob) === 1, aliceFinal);
  check("provenance is participant-owned and names the render job",
    db.scalar(`select count(*)=1 from consumer_packet_artifact_provenance
      where briefcase_item_id=${q(alice.itemId)} and consumer_auth_user_id=${q(alice.userId)}
        and matter_id=${q(alice.matterId)} and verification_hash=${q(alice.verificationHash)}
        and entitlement_source='partner_sponsorship' and render_job_id=${q(aliceJob)}`) === "t");
  check("the participant's own artifact authority reads Ready for the sponsored job",
    db.json(`select to_jsonb(x) from (select * from get_consumer_packet_artifact_authority(
      ${q(alice.userId)},${q(alice.itemId)})) x`).status === "ready");
  check("another participant reads absent, never the owner's artifact",
    db.json(`select to_jsonb(x) from (select * from get_consumer_packet_artifact_authority(
      ${q(randomUUID())},${q(alice.itemId)})) x`).status === "absent");
  check("the item is Ready only because provenance exists",
    db.scalar(`select packet_status from consumer_briefcase_items where id=${q(alice.itemId)}`) === "ready");

  // --- duplicate and concurrent requests -----------------------------------
  const repeatJob = db.scalar(enqueueSql(alice, aliceRender));
  check("an identical enqueue returns the same job", repeatJob === aliceJob
    && db.scalar(`select count(*) from packet_render_jobs where sponsored_consumer_briefcase_item_id=${q(alice.itemId)}`) === "1");
  const usedBeforeRetry = clinicUsed();
  const retryFinal = finalize(IL_ROUTE, alice, artifactFor(alice, aliceOutputSha), aliceJob);
  check("an identical finalization retry succeeds without a second consumption",
    retryFinal.ok === true && retryFinal.recorded === false && retryFinal.reason === "already_finalized"
      && clinicUsed() === usedBeforeRetry && provenanceCount() === 1, retryFinal);
  const jobConflict = finalize(IL_ROUTE, alice, artifactFor(alice, "d".repeat(64)), aliceJob);
  check("an artifact whose bytes are not the job's validated bytes is refused",
    jobConflict.ok === false && jobConflict.reason === "render_job_mismatch", jobConflict);
  const conflict = finalize(IL_ROUTE, alice, artifactFor(alice, "d".repeat(64)), null);
  check("a changed byte is a conflict, never a second delivery",
    conflict.ok === false && conflict.reason === "artifact_conflict" && clinicUsed() === usedBeforeRetry, conflict);

  const bob = seedParticipant();
  const bobRender = renderPayload(bob);
  const concurrent = await Promise.all([
    db.sqlAsync(enqueueSql(bob, bobRender)), db.sqlAsync(enqueueSql(bob, bobRender))
  ]);
  check("two concurrent identical enqueues yield exactly one job",
    concurrent.every((r) => r.ok) && concurrent[0].out === concurrent[1].out
      && db.scalar(`select count(*) from packet_render_jobs where sponsored_consumer_briefcase_item_id=${q(bob.itemId)}`) === "1",
    concurrent);
  const bobJob = concurrent[0].out;
  await runWorkerCycle(deps(goodRenderer));
  const bobSha = db.scalar(`select output_sha256 from packet_render_jobs where id=${q(bobJob)}`);
  const bobUsedBefore = clinicUsed();
  const bobResults = await Promise.all([
    db.sqlAsync(`select recorded from finalize_sponsored_packet_generation_for_route(${q(IL_ROUTE)},
      ${q(bob.sessionId)},${q(bob.itemId)},${q(bob.verificationHash)},
      ${q(JSON.stringify(artifactFor(bob, bobSha)))}::jsonb,${q(bobJob)})`),
    db.sqlAsync(`select recorded from finalize_sponsored_packet_generation_for_route(${q(IL_ROUTE)},
      ${q(bob.sessionId)},${q(bob.itemId)},${q(bob.verificationHash)},
      ${q(JSON.stringify(artifactFor(bob, bobSha)))}::jsonb,${q(bobJob)})`)
  ]);
  check("two concurrent identical finalizations consume exactly one credit",
    bobResults.filter((r) => r.out === "t").length === 1 && clinicUsed() === bobUsedBefore + 1
      && provenanceCount() === 2, bobResults.map((r) => r.out));

  // --- failure and retry ---------------------------------------------------
  const carol = seedParticipant();
  const carolRender = renderPayload(carol);
  const carolJob = db.scalar(enqueueSql(carol, carolRender));
  const failedCycle = await runWorkerCycle(deps(brokenRenderer));
  check("a failed sponsored render consumes nothing",
    failedCycle.outcome === "failed" && clinicUsed() === bobUsedBefore + 1 && provenanceCount() === 2
      && ledgerConsumed(carolJob) === 0, failedCycle);
  db.sql(`update packet_render_jobs set next_attempt_at=now()-interval '1 second' where id=${q(carolJob)}`);
  await queue.requeueRetryable();
  const retryEnqueue = db.scalar(enqueueSql(carol, carolRender));
  check("a retried request reuses the same job rather than queueing a second",
    retryEnqueue === carolJob
      && db.scalar(`select count(*) from packet_render_jobs where sponsored_consumer_briefcase_item_id=${q(carol.itemId)}`) === "1",
    retryEnqueue);
  const carolCycle = await runWorkerCycle(deps(goodRenderer));
  check("the retry finalizes once", carolCycle.outcome === "finalized" && carolCycle.jobId === carolJob, carolCycle);
  const carolSha = db.scalar(`select output_sha256 from packet_render_jobs where id=${q(carolJob)}`);
  const carolFinal = finalize(IL_ROUTE, carol, artifactFor(carol, carolSha), carolJob);
  const carolRepeat = finalize(IL_ROUTE, carol, artifactFor(carol, carolSha), carolJob);
  check("the retried job consumes exactly one credit and delivers once",
    carolFinal.recorded === true && carolRepeat.recorded === false
      && clinicUsed() === bobUsedBefore + 2 && provenanceCount() === 3
      && ledgerConsumed(carolJob) === 1, { carolFinal, carolRepeat });

  // --- wrong owner ---------------------------------------------------------
  const dave = seedParticipant();
  const daveRender = renderPayload(dave);
  check("an enqueue naming a different participant is refused",
    /verification changed|authority missing|binding mismatch/.test(
      db.sqlExpectError(enqueueSql({ ...dave, userId: randomUUID() }, daveRender))));
  const impostor = seedParticipant({ claimedUser: randomUUID() });
  check("finalization refuses when the claimed source names a different owner",
    finalize(IL_ROUTE, impostor, artifactFor(impostor, sha("x")), null).reason === "wrong_owner");

  // --- wrong event ---------------------------------------------------------
  const wrongEvent = seedParticipant({ caseEvent: otherEventId });
  check("an enqueue whose clinic case sits under another event is refused",
    /clinic_scope_mismatch/.test(db.sqlExpectError(enqueueSql(wrongEvent, renderPayload(wrongEvent)))));
  const foreignEvent = seedParticipant({ event: otherEventId, caseEvent: otherEventId });
  check("finalization refuses an event belonging to another program",
    ["clinic_scope_mismatch", "wrong_partner"].includes(
      finalize(IL_ROUTE, foreignEvent, artifactFor(foreignEvent, sha("y")), null).reason));

  // --- stale verification --------------------------------------------------
  const erin = seedParticipant();
  const erinRender = renderPayload(erin);
  const erinJob = db.scalar(enqueueSql(erin, erinRender));
  const staleSnapshot = { ...erin.snapshot, packetAnswers: { participant_full_legal_name: "Changed Name" } };
  const staleHash = sha(JSON.stringify(staleSnapshot));
  db.sql(`update consumer_packet_verifications set verification_snapshot=${q(JSON.stringify(staleSnapshot))},
    verification_hash=${q(staleHash)} where briefcase_item_id=${q(erin.itemId)}`);
  const staleUsed = clinicUsed();
  const staleCycle = await runWorkerCycle(deps(goodRenderer));
  check("a verification changed after enqueue stops the job at the guard",
    staleCycle.outcome !== "finalized"
      && db.scalar(`select status from packet_render_jobs where id=${q(erinJob)}`) !== "delivered", staleCycle);
  check("finalization refuses the superseded verification hash",
    finalize(IL_ROUTE, erin, artifactFor(erin, sha("z")), erinJob).reason === "verification_mismatch"
      && clinicUsed() === staleUsed && provenanceCount() === 3);
  check("finalization with the new hash still refuses because the artifact is not bound to it",
    finalize(IL_ROUTE, { ...erin, verificationHash: staleHash },
      artifactFor({ ...erin, verificationHash: staleHash }, sha("z")), erinJob).reason === "render_job_mismatch");

  // --- invalid authority ---------------------------------------------------
  const frank = seedParticipant();
  const siblingRender = renderPayload(frank, { routeKey: "IL:il-prostitution-j-auto" });
  check("an unregistered route cannot be enqueued",
    /route is not registered/.test(db.sqlExpectError(enqueueSql(frank, siblingRender))));
  check("an unregistered route cannot be finalized",
    finalize("IL:il-prostitution-j-auto", frank, artifactFor(frank, sha("w")), null).reason === "route_not_registered");
  check("the registered route refuses a wrong-family render input",
    /route binding mismatch/.test(db.sqlExpectError(
      enqueueSql(frank, renderPayload(frank, { family: "il-prostitution-j-auto-set" })))));
  check("the registered route refuses a wrong-track render input",
    /route binding mismatch/.test(db.sqlExpectError(
      enqueueSql(frank, renderPayload(frank, { track: "il-prostitution-j-auto" })))));
  check("the registered route refuses a wrong specification digest",
    /route binding mismatch/.test(db.sqlExpectError(
      enqueueSql(frank, renderPayload(frank, { specSha: "a".repeat(64) })))));
  const frankRender = renderPayload(frank);
  const frankJob = db.scalar(enqueueSql(frank, frankRender));
  check("the immutable render input cannot be replaced under the same packet",
    /input payload is immutable/.test(db.sqlExpectError(
      enqueueSql(frank, { ...frankRender, payload: { ...frankRender.payload, matterId: frank.matterId, extra: "tamper" } }))));
  check("the sponsored binding on an existing job is immutable",
    /binding is immutable/.test(db.sqlExpectError(
      `update packet_render_jobs set sponsored_consumer_auth_user_id=${q(randomUUID())} where id=${q(frankJob)}`)));
  const nonSponsored = seedParticipant();
  check("a sponsored finalization refuses a render job belonging to another participant",
    finalize(IL_ROUTE, nonSponsored, artifactFor(nonSponsored, sha("v")), frankJob).reason === "render_job_mismatch");

  console.log(`Illinois sponsored transaction: ${checks.length} local PostgreSQL checks PASS`);
} finally {
  db.stop();
  fs.rmSync(storageRoot, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Part 2: the Mississippi mvl-demo behaviour, re-run with this migration applied.
//
// scripts/verify-atomic-sponsored-packet-finalization.mjs is unchanged and is
// run separately; it does not apply this migration. This section applies the
// same synthetic baseline plus this migration and re-runs the same matrix, so
// the delegation is shown to preserve the Mississippi answers rather than only
// being untested by them.
// ---------------------------------------------------------------------------

const ms = startEphemeralPg();
const msIds = {
  user: "10000000-0000-4000-8000-00000000000a", other: "10000000-0000-4000-8000-00000000000b",
  item: "20000000-0000-4000-8000-00000000000a", otherItem: "20000000-0000-4000-8000-00000000000b",
  session: "30000000-0000-4000-8000-00000000000a", otherSession: "30000000-0000-4000-8000-00000000000b",
  pending: "40000000-0000-4000-8000-00000000000a", event: "50000000-0000-4000-8000-00000000000a",
  case: "60000000-0000-4000-8000-00000000000a"
};
const msHash = "a".repeat(64);
const msSpecSha = "3a1bed79e3760feb84563a638893942ab557683f6bbe7fb0fddec7e74723257f";
function msArtifact(overrides = {}) {
  return {
    provider: "rcap_grade_a_composer_v1", packetId: msIds.item,
    fileName: "mississippi-non-conviction-expungement-packet.pdf", contentType: "application/pdf",
    generatedAt: "2026-09-03T12:00:00.000Z", source: "grade_a_packet_specification",
    packetSpecificationId: "ms-nonconviction-expungement-99-19-71-4", packetSpecificationVersion: "2.0.0",
    packetSpecificationSha256: msSpecSha, packetFamily: "ms-nonconv-set", documentCount: 5,
    verificationHash: msHash, downloadPath: `/api/expungement-ai/packet/${msIds.item}/download`,
    artifactSha256: "c".repeat(64), pageCount: 12, ...overrides
  };
}
function msSeed(overrides = {}) {
  const v = {
    claimedUser: msIds.user, verificationMatter: msIds.item, verificationOwner: msIds.user,
    sourcePartner: "mvl-demo", eventJurisdiction: "MS", partnerBenefit: true, used: 0, allowed: 2,
    pauseAtCap: true, eventName: "Mississippi Volunteer Lawyers Clinic Mode Demo", claimedMatter: msIds.item,
    ...overrides
  };
  ms.sql(`
    truncate public.rcap_record_events, public.rcap_screening_analytics_events,
      public.consumer_packet_artifact_provenance, public.clinic_cases, public.clinic_events,
      public.consumer_packet_verifications, public.consumer_pending_screening_results,
      public.screening_sessions, public.partner_entitlement, public.consumer_briefcase_items;
    insert into public.consumer_briefcase_items(id,user_id,jurisdiction,source_pending_result_id,artifact_refs_json,packet_status)
      values ('${msIds.item}','${msIds.user}','MS','${msIds.pending}','{}','generating');
    insert into public.consumer_packet_verifications(briefcase_item_id,consumer_auth_user_id,matter_id,status,verification_hash,verification_snapshot)
      values ('${msIds.item}','${v.verificationOwner}','${v.verificationMatter}','verified','${msHash}',
        ${q(JSON.stringify({ schemaVersion: "expungement-ai/final-verification/v1", jurisdiction: "MS",
          pathwayId: "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal" }))}::jsonb);
    insert into public.consumer_pending_screening_results(pending_id,status,claimed_matter_id,claimed_user_id,anonymous_session_id,product,partner_slug,jurisdiction,event_id)
      values ('${msIds.pending}','CLAIMED','${v.claimedMatter}','${v.claimedUser}','${msIds.session}','rcap_partner','${v.sourcePartner}','MS','${msIds.event}');
    insert into public.screening_sessions(session_id,flow_mode,partner_benefit_active,partner_slug,jurisdiction,claimed_slot_state,status)
      values ('${msIds.session}','rcap',${v.partnerBenefit},'${v.sourcePartner}','MS','claimed','in_progress');
    insert into public.clinic_events(id,partner_slug,name,jurisdiction,status,sponsorship_allocation)
      values ('${msIds.event}','mvl-demo',${q(v.eventName)},'${v.eventJurisdiction}','published',2);
    insert into public.clinic_cases(id,event_id,participant_user_id,screening_session_id,matter_id,jurisdiction,route_disposition,queue_status)
      values ('${msIds.case}','${msIds.event}','${msIds.user}','${msIds.session}','${msIds.item}','MS','packet','in_progress');
    insert into public.partner_entitlement(partner_slug,screenings_used,screenings_allowed,pause_at_cap,overage_enabled)
      values ('mvl-demo',${v.used},${v.allowed},${v.pauseAtCap},false);
  `);
}
function msCall({ sessionId = msIds.session, itemId = msIds.item, hash = msHash, packet = msArtifact() } = {}) {
  return ms.json(`select to_jsonb(x) from (select * from public.finalize_sponsored_packet_generation_if_verified(
    '${sessionId}','${itemId}','${hash}',${q(JSON.stringify(packet))}::jsonb)) x`);
}
function msState() {
  return ms.json(`select to_jsonb(x) from (select
    (select screenings_used from public.partner_entitlement where partner_slug='mvl-demo') as used,
    (select claimed_slot_state from public.screening_sessions where session_id='${msIds.session}') as slot,
    (select packet_status from public.consumer_briefcase_items where id='${msIds.item}') as packet_status,
    (select count(*)::integer from public.consumer_packet_artifact_provenance) as provenance,
    (select count(*)::integer from public.rcap_screening_analytics_events where event_type='packet_generated') as generated) x`);
}
function msRefusal(label, overrides, callOverrides, reason) {
  msSeed(overrides);
  const before = msState();
  const result = msCall(callOverrides);
  check(`MS preserved: ${label} still refuses with ${reason}`,
    result.ok === false && result.recorded === false && result.reason === reason, result);
  check(`MS preserved: ${label} still performs no partial mutation`,
    JSON.stringify(msState()) === JSON.stringify(before));
}

try {
  ms.sql(msBaseline());
  ms.applyFile(path.join(root, PROVENANCE_MIGRATION));
  ms.applyFile(path.join(root, MS_MIGRATION));
  ms.applyFile(path.join(root, MIGRATION));
  ms.applyFile(path.join(root, REGENERATION_MIGRATION));

  check("MS preserved: the entry point keeps its name, signature, SECURITY DEFINER and empty search_path",
    ms.scalar(`select prosecdef and proconfig = array['search_path=""']::text[]
      from pg_proc where oid='public.finalize_sponsored_packet_generation_if_verified(uuid,uuid,text,jsonb)'::regprocedure`) === "t");
  check("MS preserved: only service_role can execute it",
    ms.scalar(`select has_function_privilege('service_role','public.finalize_sponsored_packet_generation_if_verified(uuid,uuid,text,jsonb)','EXECUTE')
      and not has_function_privilege('anon','public.finalize_sponsored_packet_generation_if_verified(uuid,uuid,text,jsonb)','EXECUTE')
      and not has_function_privilege('authenticated','public.finalize_sponsored_packet_generation_if_verified(uuid,uuid,text,jsonb)','EXECUTE')`) === "t");

  msRefusal("verification mismatch", {}, { hash: "b".repeat(64) }, "verification_mismatch");
  msRefusal("wrong owner", { claimedUser: msIds.other }, {}, "wrong_owner");
  msRefusal("wrong matter", { verificationMatter: msIds.otherItem }, {}, "wrong_matter");
  msRefusal("wrong item binding", { claimedMatter: msIds.otherItem }, {}, "wrong_item");
  msRefusal("wrong session", {}, { sessionId: msIds.otherSession }, "wrong_session");
  msRefusal("wrong partner", { sourcePartner: "other-demo" }, {}, "wrong_partner");
  msRefusal("wrong jurisdiction", { eventJurisdiction: "AL" }, {}, "wrong_jurisdiction_or_route");
  msRefusal("inactive sponsorship", { partnerBenefit: false }, {}, "sponsorship_inactive");
  msRefusal("wrong clinic event", { eventName: "Some Other Clinic" }, {}, "clinic_scope_mismatch");
  msRefusal("malformed artifact", {}, { packet: msArtifact({ artifactSha256: "not-a-sha" }) }, "malformed_artifact");
  msRefusal("non-PDF artifact", {}, { packet: msArtifact({ contentType: "text/plain" }) }, "malformed_artifact");
  msRefusal("hard-cap exhaustion", { used: 2, allowed: 2 }, {}, "paused_at_cap");

  msSeed();
  const success = msCall();
  check("MS preserved: a valid finalization still succeeds and counts one included unit",
    success.ok === true && success.recorded === true && success.counted_as === "included", success);
  const state = msState();
  check("MS preserved: one allowance, consumed slot, Ready, one provenance, one analytics event",
    state.used === 1 && state.slot === "consumed" && state.packet_status === "ready"
      && state.provenance === 1 && state.generated === 1, state);
  check("MS preserved: provenance binds owner, matter, verification and sponsorship with no render job",
    ms.scalar(`select count(*)=1 from public.consumer_packet_artifact_provenance
      where briefcase_item_id='${msIds.item}' and consumer_auth_user_id='${msIds.user}'
        and matter_id='${msIds.item}' and verification_hash='${msHash}'
        and entitlement_source='partner_sponsorship' and render_job_id is null
        and artifact=${q(JSON.stringify(msArtifact()))}::jsonb`) === "t");
  const msRetry = msCall();
  check("MS preserved: an identical retry succeeds without recording again",
    msRetry.ok === true && msRetry.recorded === false && msRetry.reason === "already_finalized"
      && msState().used === 1, msRetry);
  const msConflict = msCall({ packet: msArtifact({ artifactSha256: "d".repeat(64) }) });
  check("MS preserved: a conflicting retry refuses and changes nothing",
    msConflict.ok === false && msConflict.reason === "artifact_conflict" && msState().used === 1, msConflict);

  console.log(`Mississippi mvl-demo preservation under the new migration: PASS`);
} finally {
  ms.stop();
}

console.log(`test-rcap-il-sponsored-transaction: PASS - ${checks.length}/${checks.length} checks (local ephemeral PostgreSQL only).`);

function msBaseline() {
  return `
    create role anon nologin; create role authenticated nologin; create role service_role nologin;
    create table public.consumer_briefcase_items (
      id uuid primary key, user_id uuid not null, jurisdiction text not null,
      source_pending_result_id uuid, artifact_refs_json jsonb not null default '{}',
      packet_status text not null default 'not_started', updated_at timestamptz not null default now());
    create table public.packet_render_jobs (id uuid primary key, partner_id uuid, status text,
      consumer_briefcase_item_id uuid, consumer_auth_user_id uuid, consumer_verification_hash text,
      matter_id uuid, delivery_eligibility text, output_sha256 text);
    create function public.consumer_matter_id_for_briefcase_item(p_item_id uuid)
      returns uuid language sql immutable set search_path='' as $$ select p_item_id $$;
    create table public.consumer_packet_verifications (
      briefcase_item_id uuid primary key, consumer_auth_user_id uuid not null, matter_id uuid not null,
      status text not null, verification_hash text, verification_snapshot jsonb);
    create table public.consumer_pending_screening_results (
      pending_id uuid primary key, status text not null, claimed_matter_id uuid, claimed_user_id uuid,
      anonymous_session_id uuid, product text, partner_slug text, jurisdiction text, event_id uuid);
    create table public.screening_sessions (
      session_id uuid primary key, flow_mode text, partner_benefit_active boolean, partner_slug text,
      jurisdiction text, claimed_slot_state text, status text, updated_at timestamptz not null default now(),
      partner_access_code_id uuid, campaign_name text);
    create table public.clinic_events (
      id uuid primary key, partner_slug text, program_key text not null default 'record-clearing',
      name text, jurisdiction text, status text, sponsorship_allocation integer);
    create table public.clinic_cases (
      id uuid primary key, event_id uuid, participant_user_id uuid, screening_session_id uuid,
      matter_id uuid, jurisdiction text, route_disposition text, queue_status text,
      last_activity_at timestamptz default now(), updated_at timestamptz default now());
    create table public.partner_entitlement (
      partner_slug text primary key, screenings_used integer not null default 0,
      screenings_allowed integer not null default 0, pause_at_cap boolean not null default false,
      overage_enabled boolean not null default false, overage_packets integer not null default 0,
      overage_amount_cents integer not null default 0, overage_packet_price_cents integer not null default 5000,
      updated_at timestamptz not null default now());
    create table public.rcap_record_events (
      id uuid primary key default gen_random_uuid(), record_type text, record_id text, partner_slug text,
      event_type text, occurred_at timestamptz, actor text, metadata jsonb);
    create table public.rcap_screening_analytics_events (
      id uuid primary key default gen_random_uuid(), session_id uuid, partner_slug text,
      partner_access_code_id uuid, campaign_name text, event_type text, packet_route_available boolean,
      occurred_at timestamptz, metadata jsonb);
  `;
}
