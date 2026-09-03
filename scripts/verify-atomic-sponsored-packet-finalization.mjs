#!/usr/bin/env node

// Focused database proof for the bounded MVL sponsored finalizer. The harness
// starts a private Unix-socket PostgreSQL cluster, installs only the existing
// records the function consumes, applies the real forward migration, and then
// exercises its success, retry, refusal, and rollback boundaries.

import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ephemeralPgAvailable, startEphemeralPg } from "./lib/rcap-ephemeral-pg.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const provenanceMigration = path.join(root, "supabase/migrations/20260901115000_consumer_packet_artifact_provenance.sql");
const migration = path.join(root, "supabase/migrations/20260903130000_atomic_sponsored_packet_finalization.sql");

if (!ephemeralPgAvailable()) {
  console.error("verify-atomic-sponsored-packet-finalization requires a local PostgreSQL toolchain.");
  process.exit(1);
}

const ids = {
  userA: "10000000-0000-4000-8000-00000000000a",
  userB: "10000000-0000-4000-8000-00000000000b",
  itemA: "20000000-0000-4000-8000-00000000000a",
  itemB: "20000000-0000-4000-8000-00000000000b",
  sessionA: "30000000-0000-4000-8000-00000000000a",
  sessionB: "30000000-0000-4000-8000-00000000000b",
  pendingA: "40000000-0000-4000-8000-00000000000a",
  eventA: "50000000-0000-4000-8000-00000000000a",
  caseA: "60000000-0000-4000-8000-00000000000a"
};
const verificationHash = "a".repeat(64);
const otherHash = "b".repeat(64);
const artifactSha = "c".repeat(64);
const specificationSha = "3a1bed79e3760feb84563a638893942ab557683f6bbe7fb0fddec7e74723257f";

const db = startEphemeralPg();
const checks = [];
function check(label, condition) {
  assert.equal(Boolean(condition), true, label);
  checks.push(label);
  console.log(`ok ${checks.length} - ${label}`);
}
function literal(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}
function json(sql) {
  return db.json(`select to_jsonb(x) from (${sql}) x`);
}
function artifact(overrides = {}) {
  return {
    provider: "rcap_grade_a_composer_v1",
    packetId: ids.itemA,
    fileName: "mississippi-non-conviction-expungement-packet.pdf",
    contentType: "application/pdf",
    generatedAt: "2026-09-03T12:00:00.000Z",
    source: "grade_a_packet_specification",
    packetSpecificationId: "ms-nonconviction-expungement-99-19-71-4",
    packetSpecificationVersion: "2.0.0",
    packetSpecificationSha256: specificationSha,
    packetFamily: "ms-nonconv-set",
    documentCount: 5,
    verificationHash,
    downloadPath: `/api/expungement-ai/packet/${ids.itemA}/download`,
    artifactSha256: artifactSha,
    pageCount: 12,
    ...overrides
  };
}

function seed(overrides = {}) {
  const value = {
    itemUser: ids.userA,
    itemJurisdiction: "MS",
    verificationOwner: ids.userA,
    verificationMatter: ids.itemA,
    verificationStatus: "verified",
    verificationHash,
    verificationJurisdiction: "MS",
    verificationPathway: "non-conviction-expungement-for-dismissal-no-disposition-or-acquittal",
    claimedMatter: ids.itemA,
    claimedUser: ids.userA,
    sourceSession: ids.sessionA,
    sourceProduct: "rcap_partner",
    sourcePartner: "mvl-demo",
    sourceJurisdiction: "MS",
    sessionPartner: "mvl-demo",
    sessionJurisdiction: "MS",
    partnerBenefit: true,
    claimedSlotState: "claimed",
    caseParticipant: ids.userA,
    caseSession: ids.sessionA,
    caseMatter: ids.itemA,
    caseJurisdiction: "MS",
    routeDisposition: "packet",
    eventPartner: "mvl-demo",
    eventName: "Mississippi Volunteer Lawyers Clinic Mode Demo",
    eventJurisdiction: "MS",
    eventStatus: "published",
    eventAllocation: 2,
    used: 0,
    allowed: 2,
    pauseAtCap: true,
    overageEnabled: false,
    ...overrides
  };
  db.sql(`
    truncate public.rcap_record_events, public.rcap_screening_analytics_events,
      public.consumer_packet_artifact_provenance, public.clinic_cases,
      public.clinic_events, public.consumer_packet_verifications,
      public.consumer_pending_screening_results, public.screening_sessions,
      public.partner_entitlement, public.consumer_briefcase_items;
    insert into public.consumer_briefcase_items
      (id,user_id,jurisdiction,source_pending_result_id,artifact_refs_json,packet_status)
    values ('${ids.itemA}','${value.itemUser}','${value.itemJurisdiction}','${ids.pendingA}','{}','generating');
    insert into public.consumer_packet_verifications
      (briefcase_item_id,consumer_auth_user_id,matter_id,status,verification_hash,verification_snapshot)
    values (
      '${ids.itemA}','${value.verificationOwner}','${value.verificationMatter}',
      '${value.verificationStatus}','${value.verificationHash}',
      ${literal(JSON.stringify({
        schemaVersion: "expungement-ai/final-verification/v1",
        jurisdiction: value.verificationJurisdiction,
        pathwayId: value.verificationPathway
      }))}::jsonb
    );
    insert into public.consumer_pending_screening_results
      (pending_id,status,claimed_matter_id,claimed_user_id,anonymous_session_id,
       product,partner_slug,jurisdiction,event_id)
    values (
      '${ids.pendingA}','CLAIMED','${value.claimedMatter}','${value.claimedUser}',
      '${value.sourceSession}','${value.sourceProduct}','${value.sourcePartner}',
      '${value.sourceJurisdiction}','${ids.eventA}'
    );
    insert into public.screening_sessions
      (session_id,flow_mode,partner_benefit_active,partner_slug,jurisdiction,
       claimed_slot_state,status)
    values (
      '${ids.sessionA}','rcap',${value.partnerBenefit},'${value.sessionPartner}',
      '${value.sessionJurisdiction}','${value.claimedSlotState}','in_progress'
    );
    insert into public.clinic_events
      (id,partner_slug,name,jurisdiction,status,sponsorship_allocation)
    values (
      '${ids.eventA}','${value.eventPartner}',${literal(value.eventName)},
      '${value.eventJurisdiction}','${value.eventStatus}',${value.eventAllocation}
    );
    insert into public.clinic_cases
      (id,event_id,participant_user_id,screening_session_id,matter_id,
       jurisdiction,route_disposition,queue_status)
    values (
      '${ids.caseA}','${ids.eventA}','${value.caseParticipant}','${value.caseSession}',
      '${value.caseMatter}','${value.caseJurisdiction}','${value.routeDisposition}','in_progress'
    );
    insert into public.partner_entitlement
      (partner_slug,screenings_used,screenings_allowed,pause_at_cap,overage_enabled)
    values ('mvl-demo',${value.used},${value.allowed},${value.pauseAtCap},${value.overageEnabled});
  `);
}

function call({ sessionId = ids.sessionA, itemId = ids.itemA, hash = verificationHash, packet = artifact() } = {}) {
  return json(`select * from public.finalize_sponsored_packet_generation_if_verified(
    '${sessionId}','${itemId}','${hash}',${literal(JSON.stringify(packet))}::jsonb)`);
}

function state() {
  return json(`select
    (select screenings_used from public.partner_entitlement where partner_slug='mvl-demo') as used,
    (select overage_packets from public.partner_entitlement where partner_slug='mvl-demo') as overages,
    (select claimed_slot_state from public.screening_sessions where session_id='${ids.sessionA}') as slot,
    (select packet_status from public.consumer_briefcase_items where id='${ids.itemA}') as packet_status,
    (select count(*)::integer from public.consumer_packet_artifact_provenance) as provenance,
    (select count(*)::integer from public.rcap_screening_analytics_events where event_type='packet_generated') as generated_events`);
}

function refusal(label, overrides, callOverrides, reason) {
  seed(overrides);
  const before = state();
  const result = call(callOverrides);
  const after = state();
  check(`${label} refuses with ${reason}`, result.ok === false && result.recorded === false && result.reason === reason);
  check(`${label} performs no partial mutation`, JSON.stringify(after) === JSON.stringify(before));
}

try {
  db.sql(baseline());
  db.applyFile(provenanceMigration);
  db.applyFile(migration);

  check(
    "function is SECURITY DEFINER with an empty search_path",
    db.scalar(`select prosecdef and proconfig = array['search_path=""']::text[]
      from pg_proc where oid='public.finalize_sponsored_packet_generation_if_verified(uuid,uuid,text,jsonb)'::regprocedure`) === "t"
  );
  check(
    "only service_role can execute the finalizer",
    db.scalar(`select
      has_function_privilege('service_role','public.finalize_sponsored_packet_generation_if_verified(uuid,uuid,text,jsonb)','EXECUTE')
      and not has_function_privilege('anon','public.finalize_sponsored_packet_generation_if_verified(uuid,uuid,text,jsonb)','EXECUTE')
      and not has_function_privilege('authenticated','public.finalize_sponsored_packet_generation_if_verified(uuid,uuid,text,jsonb)','EXECUTE')`) === "t"
  );
  check(
    "browser roles have no protected verification or provenance table privileges",
    db.scalar(`select not has_table_privilege('anon','public.consumer_packet_verifications','SELECT,INSERT,UPDATE,DELETE')
      and not has_table_privilege('authenticated','public.consumer_packet_verifications','SELECT,INSERT,UPDATE,DELETE')
      and not has_table_privilege('anon','public.consumer_packet_artifact_provenance','SELECT,INSERT,UPDATE,DELETE')
      and not has_table_privilege('authenticated','public.consumer_packet_artifact_provenance','SELECT,INSERT,UPDATE,DELETE')`) === "t"
  );

  refusal("verification mismatch", {}, { hash: otherHash }, "verification_mismatch");
  refusal("wrong owner", { claimedUser: ids.userB }, {}, "wrong_owner");
  refusal("wrong matter", { verificationMatter: ids.itemB }, {}, "wrong_matter");
  refusal("wrong item binding", { claimedMatter: ids.itemB }, {}, "wrong_item");
  refusal("wrong session", {}, { sessionId: ids.sessionB }, "wrong_session");
  refusal("wrong partner", { sourcePartner: "other-demo" }, {}, "wrong_partner");
  refusal("wrong jurisdiction", { eventJurisdiction: "AL" }, {}, "wrong_jurisdiction_or_route");
  refusal("inactive sponsorship", { partnerBenefit: false }, {}, "sponsorship_inactive");
  refusal("malformed artifact", {}, { packet: artifact({ artifactSha256: "not-a-sha" }) }, "malformed_artifact");
  refusal("non-PDF artifact", {}, { packet: artifact({ contentType: "text/plain" }) }, "malformed_artifact");
  refusal("hard-cap exhaustion", { used: 2, allowed: 2, pauseAtCap: true }, {}, "paused_at_cap");

  seed();
  const success = call();
  check("valid sponsored finalization succeeds and records once", success.ok === true && success.recorded === true && success.counted_as === "included");
  const successfulState = state();
  check(
    "success consumes one allowance and makes Ready only with provenance",
    successfulState.used === 1
      && successfulState.overages === 0
      && successfulState.slot === "consumed"
      && successfulState.packet_status === "ready"
      && successfulState.provenance === 1
      && successfulState.generated_events === 1
  );
  check(
    "protected provenance binds owner, matter, verification, sponsorship and exact artifact",
    db.scalar(`select count(*)=1 from public.consumer_packet_artifact_provenance
      where briefcase_item_id='${ids.itemA}' and consumer_auth_user_id='${ids.userA}'
        and matter_id='${ids.itemA}' and verification_hash='${verificationHash}'
        and entitlement_source='partner_sponsorship'
        and artifact=${literal(JSON.stringify(artifact()))}::jsonb`) === "t"
  );
  const retry = call();
  check("identical retry succeeds without recording again", retry.ok === true && retry.recorded === false && retry.reason === "already_finalized");
  check("identical retry and repeat delivery do not recount", state().used === 1 && state().generated_events === 1);
  const conflictBefore = state();
  const conflict = call({ packet: artifact({ artifactSha256: "d".repeat(64) }) });
  check("conflicting retry refuses", conflict.ok === false && conflict.reason === "artifact_conflict");
  check("conflicting retry changes no row", JSON.stringify(state()) === JSON.stringify(conflictBefore));

  seed();
  db.sql(`create function public.reject_provenance_fixture() returns trigger language plpgsql as $$
    begin raise exception 'fixture provenance failure'; end $$;
    create trigger reject_provenance_fixture before insert on public.consumer_packet_artifact_provenance
      for each row execute function public.reject_provenance_fixture()`);
  const beforeFailure = state();
  check(
    "a provenance failure raises instead of returning a partial success",
    /fixture provenance failure/.test(db.sqlExpectError(`select * from public.finalize_sponsored_packet_generation_if_verified(
      '${ids.sessionA}','${ids.itemA}','${verificationHash}',${literal(JSON.stringify(artifact()))}::jsonb)`))
  );
  check("a downstream failure rolls back credit, provenance, event and Ready", JSON.stringify(state()) === JSON.stringify(beforeFailure));
  db.sql("drop trigger reject_provenance_fixture on public.consumer_packet_artifact_provenance; drop function public.reject_provenance_fixture()");

  check(
    "participant-B owner filter cannot select participant-A provenance",
    db.scalar(`select count(*)=0 from public.consumer_packet_artifact_provenance
      where briefcase_item_id='${ids.itemA}' and consumer_auth_user_id='${ids.userB}'`) === "t"
  );
} finally {
  db.stop();
}

console.log(`Atomic sponsored packet finalization: PASS — ${checks.length}/${checks.length} focused PostgreSQL checks.`);

function baseline() {
  return `
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin;

    create table public.consumer_briefcase_items (
      id uuid primary key, user_id uuid not null, jurisdiction text not null,
      source_pending_result_id uuid, artifact_refs_json jsonb not null default '{}',
      packet_status text not null default 'not_started', updated_at timestamptz not null default now()
    );
    create table public.packet_render_jobs (id uuid primary key);
    create function public.consumer_matter_id_for_briefcase_item(p_item_id uuid)
    returns uuid language sql immutable set search_path='' as $$ select p_item_id $$;
    create table public.consumer_packet_verifications (
      briefcase_item_id uuid primary key, consumer_auth_user_id uuid not null,
      matter_id uuid not null, status text not null, verification_hash text,
      verification_snapshot jsonb
    );
    create table public.consumer_pending_screening_results (
      pending_id uuid primary key, status text not null, claimed_matter_id uuid,
      claimed_user_id uuid, anonymous_session_id uuid, product text,
      partner_slug text, jurisdiction text, event_id uuid
    );
    create table public.screening_sessions (
      session_id uuid primary key, flow_mode text, partner_benefit_active boolean,
      partner_slug text, jurisdiction text, claimed_slot_state text, status text,
      updated_at timestamptz not null default now(), partner_access_code_id uuid,
      campaign_name text
    );
    create table public.clinic_events (
      id uuid primary key, partner_slug text, name text, jurisdiction text,
      status text, sponsorship_allocation integer
    );
    create table public.clinic_cases (
      id uuid primary key, event_id uuid, participant_user_id uuid,
      screening_session_id uuid, matter_id uuid, jurisdiction text,
      route_disposition text, queue_status text, last_activity_at timestamptz default now(),
      updated_at timestamptz default now()
    );
    create table public.partner_entitlement (
      partner_slug text primary key, screenings_used integer not null default 0,
      screenings_allowed integer not null default 0, pause_at_cap boolean not null default false,
      overage_enabled boolean not null default false, overage_packets integer not null default 0,
      overage_amount_cents integer not null default 0,
      overage_packet_price_cents integer not null default 5000,
      updated_at timestamptz not null default now()
    );
    create table public.rcap_record_events (
      id uuid primary key default gen_random_uuid(), record_type text, record_id text,
      partner_slug text, event_type text, occurred_at timestamptz, actor text, metadata jsonb
    );
    create table public.rcap_screening_analytics_events (
      id uuid primary key default gen_random_uuid(), session_id uuid, partner_slug text,
      partner_access_code_id uuid, campaign_name text, event_type text,
      packet_route_available boolean, occurred_at timestamptz, metadata jsonb
    );
  `;
}
