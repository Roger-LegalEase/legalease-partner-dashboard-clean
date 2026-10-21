#!/usr/bin/env node

// Focused PostgreSQL regression for the hosted Clinic prefix that stopped after
// migration four.  It derives the suffix from the existing protected
// authorization record, proves the exact launch-rails failure without the
// provenance prerequisite, then applies and replays the authorized suffix on
// a private disposable cluster.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ephemeralPgAvailable, startEphemeralPg } from "./lib/rcap-ephemeral-pg.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readiness = JSON.parse(fs.readFileSync(path.join(root, "data/rcap-staging-authorization-readiness.json"), "utf8"));
const sequence = readiness.clinicModePreviewMigrationAuthorization?.migrationsInApplyOrder ?? [];
const prerequisitePath = "supabase/migrations/20260901115000_consumer_packet_artifact_provenance.sql";
const launchPath = "supabase/migrations/20260901120000_dtc_consumer_launch_rails.sql";

assert.equal(ephemeralPgAvailable(), true, "a local PostgreSQL toolchain is required");
assert.equal(sequence.length, 10, "protected Clinic authorization must contain exactly ten migrations");
assert.deepEqual(sequence.map((entry) => entry.sequencePosition), [1,2,3,4,5,6,7,8,9,10]);
assert.equal(sequence[4]?.path, prerequisitePath);
assert.equal(sequence[5]?.path, launchPath);

const checks = [];
function check(label, condition) {
  assert.equal(Boolean(condition), true, label);
  checks.push(label);
  console.log(`ok ${checks.length} - ${label}`);
}

const db = startEphemeralPg();
try {
  db.sql(baseline());
  seedHostedPrefixLedger(db);

  const launchAuthority = extractLaunchArtifactAuthority();
  const originalFailure = db.sqlExpectError(launchAuthority);
  check(
    "the exact launch-rails authority turns red when the prerequisite is omitted",
    /relation "public\.consumer_packet_artifact_provenance" does not exist/.test(originalFailure)
  );
  check("the failed launch fragment leaves no authority function", db.scalar(
    "select to_regprocedure('public.get_consumer_packet_artifact_authority(uuid,uuid)') is null"
  ) === "t");

  applyAuthorizedSuffix(db);
  check("the hosted four-entry prefix upgrades through all ten authorized identities", db.scalar(
    "select count(*)=10 and min(sequence_position)=1 and max(sequence_position)=10 from public.rcap_acceptance_clinic_migration_ledger"
  ) === "t");
  verifyProvenanceAuthority(db);
  verifyCurrentSuffixObjects(db);

  const beforeReplay = state(db);
  applyAuthorizedSuffix(db);
  const afterReplay = state(db);
  check("an exact-prefix rerun is readback-only and creates no duplicate authority or ledger rows", JSON.stringify(afterReplay) === JSON.stringify(beforeReplay));
} finally {
  db.stop();
}

const incompatible = startEphemeralPg();
try {
  incompatible.sql(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin;
    create table public.consumer_briefcase_items(id uuid primary key);
    create table public.packet_render_jobs(id uuid primary key);
    create table public.consumer_packet_artifact_provenance(briefcase_item_id uuid primary key);
  `);
  const error = incompatible.sqlExpectError(`\\i ${path.join(root, prerequisitePath)}`);
  check("an incompatible preexisting provenance table is refused", /incompatible column shape/.test(error));
  check("shape refusal rolls back prerequisite helper creation", incompatible.scalar(
    "select to_regprocedure('public.rcap_participant_erasure_authority()') is null"
  ) === "t");
} finally {
  incompatible.stop();
}

const compatible = startEphemeralPg();
try {
  compatible.sql(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin;
    create table public.consumer_briefcase_items(id uuid primary key);
    create table public.packet_render_jobs(id uuid primary key);
  `);
  compatible.sql(extractOriginalAuthoritativeTableDefinition());
  compatible.applyFile(path.join(root, prerequisitePath));
  check("the prerequisite accepts the original authoritative participant-data-rights schema", compatible.scalar(`
    select count(*)=11 from information_schema.columns
    where table_schema='public' and table_name='consumer_packet_artifact_provenance'
  `) === "t");
} finally {
  compatible.stop();
}

console.log(`Clinic provenance prefix upgrade: PASS — ${checks.length}/${checks.length}; disposable PostgreSQL only.`);

function extractLaunchArtifactAuthority() {
  const launch = fs.readFileSync(path.join(root, launchPath), "utf8");
  const match = launch.match(/create or replace function public\.get_consumer_packet_artifact_authority\([\s\S]*?\n\$artifact\$;/u);
  assert.ok(match, "launch-rails artifact-authority function must remain discoverable");
  return match[0];
}

function extractOriginalAuthoritativeTableDefinition() {
  const source = fs.readFileSync(path.join(root, "supabase/migrations/20260830120000_participant_data_rights.sql"), "utf8");
  const match = source.match(/create table if not exists public\.consumer_packet_artifact_provenance[\s\S]*?revoke all on table public\.consumer_packet_artifact_provenance from authenticated;/u);
  assert.ok(match, "original authoritative provenance table definition must remain discoverable");
  return match[0];
}

function seedHostedPrefixLedger(database) {
  database.sql(`
    create table public.rcap_acceptance_clinic_migration_ledger (
      sequence_position smallint primary key check (sequence_position between 1 and 10),
      migration_path text not null unique,
      sha256 text not null unique,
      application_sha text not null,
      applied_at timestamptz not null default now()
    );
  `);
  for (const entry of sequence.slice(0, 4)) {
    database.sql(`insert into public.rcap_acceptance_clinic_migration_ledger
      (sequence_position,migration_path,sha256,application_sha)
      values (${entry.sequencePosition},${literal(entry.path)},${literal(entry.sha256)},${literal(entry.sequencePosition === 4
        ? "3285b6606605549c4ea730610f2c3e55c1e32859"
        : "441ee3188ee52047a012232d8d11f890a09b4ac5")})`);
  }
}

function applyAuthorizedSuffix(database) {
  const present = Number(database.scalar("select count(*) from public.rcap_acceptance_clinic_migration_ledger"));
  for (const entry of sequence.slice(present)) {
    const migration = path.join(root, entry.path);
    database.applyFile(migration);
    database.sql(`insert into public.rcap_acceptance_clinic_migration_ledger
      (sequence_position,migration_path,sha256,application_sha)
      values (${entry.sequencePosition},${literal(entry.path)},${literal(entry.sha256)},'f000000000000000000000000000000000000000')`);
  }
}

function verifyProvenanceAuthority(database) {
  check("provenance carries the authoritative eleven-column schema", database.scalar(`
    select count(*)=11 from information_schema.columns
    where table_schema='public' and table_name='consumer_packet_artifact_provenance'
  `) === "t");
  check("provenance primary key, foreign keys and four checks are exact", database.scalar(`
    select count(*)=7
      and count(*) filter (where contype='p')=1
      and count(*) filter (where contype='f')=2
      and count(*) filter (where contype='c')=4
    from pg_constraint where conrelid='public.consumer_packet_artifact_provenance'::regclass
  `) === "t");
  check("provenance owner index exists and is valid", database.scalar(`
    select exists(select 1 from pg_index i join pg_class x on x.oid=i.indexrelid
      where i.indrelid='public.consumer_packet_artifact_provenance'::regclass
        and x.relname='consumer_packet_artifact_provenance_user_idx'
        and i.indisvalid and not i.indisunique)
  `) === "t");
  check("provenance enforces RLS with no participant-readable policy", database.scalar(`
    select c.relrowsecurity and not exists(select 1 from pg_policy p where p.polrelid=c.oid)
    from pg_class c where c.oid='public.consumer_packet_artifact_provenance'::regclass
  `) === "t");
  check("public and browser roles cannot read or mutate provenance", database.scalar(`
    select not exists(select 1 from information_schema.role_table_grants
        where table_schema='public' and table_name='consumer_packet_artifact_provenance'
          and grantee in ('PUBLIC','anon','authenticated'))
      and not has_table_privilege('anon','public.consumer_packet_artifact_provenance','SELECT,INSERT,UPDATE,DELETE')
      and not has_table_privilege('authenticated','public.consumer_packet_artifact_provenance','SELECT,INSERT,UPDATE,DELETE')
  `) === "t");
  check("only service_role can execute provenance support functions", database.scalar(`
    select has_function_privilege('service_role','public.rcap_participant_erasure_authority()','EXECUTE')
      and not has_function_privilege('anon','public.rcap_participant_erasure_authority()','EXECUTE')
      and not has_function_privilege('authenticated','public.rcap_participant_erasure_authority()','EXECUTE')
      and has_function_privilege('service_role','public.consumer_packet_artifact_provenance_immutable()','EXECUTE')
      and not has_function_privilege('anon','public.consumer_packet_artifact_provenance_immutable()','EXECUTE')
      and not has_function_privilege('authenticated','public.consumer_packet_artifact_provenance_immutable()','EXECUTE')
  `) === "t");
  check("provenance immutable trigger is installed exactly once", database.scalar(`
    select count(*)=1 from pg_trigger
    where tgrelid='public.consumer_packet_artifact_provenance'::regclass
      and tgname='consumer_packet_artifact_provenance_immutable' and not tgisinternal
  `) === "t");

  database.sql(`
    insert into public.consumer_briefcase_items(id,user_id,jurisdiction)
      values ('10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','MS');
    insert into public.consumer_packet_artifact_provenance(
      briefcase_item_id,consumer_auth_user_id,matter_id,verification_hash,entitlement_source,artifact
    ) values (
      '10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002',
      '10000000-0000-4000-8000-000000000001',repeat('a',64),'partner_sponsorship','{}'
    );
  `);
  check("issued artifact bindings cannot be rewritten", /issued artifact provenance is immutable/.test(database.sqlExpectError(`
    update public.consumer_packet_artifact_provenance
    set matter_id='10000000-0000-4000-8000-000000000003'
    where briefcase_item_id='10000000-0000-4000-8000-000000000001'
  `)));
}

function verifyCurrentSuffixObjects(database) {
  check("launch rails apply after provenance", database.scalar(
    "select to_regprocedure('public.get_consumer_packet_artifact_authority(uuid,uuid)') is not null and to_regclass('public.consumer_packet_verifications') is not null"
  ) === "t");
  check("private delivery and tightened authorization apply", database.scalar(
    "select to_regclass('public.consumer_artifact_download_grants') is not null and pg_get_functiondef('public.authorize_consumer_artifact_download(uuid,uuid,text)'::regprocedure) like '%order by p.revision desc%'"
  ) === "t");
  check("Clinic jurisdiction lock applies", database.scalar(
    "select exists(select 1 from information_schema.columns where table_schema='public' and table_name='clinic_events' and column_name='jurisdiction')"
  ) === "t");
  check("atomic sponsored finalization applies service-role-only", database.scalar(`
    select to_regprocedure('public.finalize_sponsored_packet_generation_if_verified(uuid,uuid,text,jsonb)') is not null
      and has_function_privilege('service_role','public.finalize_sponsored_packet_generation_if_verified(uuid,uuid,text,jsonb)','EXECUTE')
      and not has_function_privilege('anon','public.finalize_sponsored_packet_generation_if_verified(uuid,uuid,text,jsonb)','EXECUTE')
      and not has_function_privilege('authenticated','public.finalize_sponsored_packet_generation_if_verified(uuid,uuid,text,jsonb)','EXECUTE')
  `) === "t");
}

function state(database) {
  return {
    ledger: database.scalar("select count(*) from public.rcap_acceptance_clinic_migration_ledger"),
    provenanceRows: database.scalar("select count(*) from public.consumer_packet_artifact_provenance"),
    verificationRows: database.scalar("select count(*) from public.consumer_packet_verifications"),
    downloadGrantRows: database.scalar("select count(*) from public.consumer_artifact_download_grants"),
    partnerAllowanceRows: database.scalar("select count(*) from public.partner_entitlement"),
    creditEventRows: database.scalar("select count(*) from public.rcap_record_events"),
    analyticsRows: database.scalar("select count(*) from public.rcap_screening_analytics_events"),
    provenanceIndexes: database.scalar("select count(*) from pg_index where indrelid='public.consumer_packet_artifact_provenance'::regclass"),
    provenanceTriggers: database.scalar("select count(*) from pg_trigger where tgrelid='public.consumer_packet_artifact_provenance'::regclass and not tgisinternal"),
    verificationTables: database.scalar("select count(*) from pg_class where oid in ('public.consumer_packet_verifications'::regclass,'public.consumer_artifact_download_grants'::regclass)"),
    finalizers: database.scalar("select count(*) from pg_proc where oid='public.finalize_sponsored_packet_generation_if_verified(uuid,uuid,text,jsonb)'::regprocedure")
  };
}

function literal(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function baseline() {
  return `
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin;
    create schema extensions;
    create extension pgcrypto with schema extensions;

    create table public.consumer_briefcase_items (
      id uuid primary key, user_id uuid not null, jurisdiction text not null default 'MS',
      source_pending_result_id uuid, summary_json jsonb not null default '{}',
      artifact_refs_json jsonb not null default '{}', packet_status text not null default 'not_started',
      payment_allowed boolean not null default true, payment_status text not null default 'unpaid',
      checkout_session_id text, payment_provider text, payment_product_id text,
      payment_person_id uuid, payment_matter_id uuid, amount_cents integer,
      updated_at timestamptz not null default now()
    );
    create table public.packet_render_jobs (
      id uuid primary key default gen_random_uuid(), packet_id uuid, partner_id uuid,
      consumer_briefcase_item_id uuid, consumer_auth_user_id uuid, person_id uuid, matter_id uuid,
      status text not null default 'queued', delivery_eligibility text, accounting_result text,
      output_storage_path text, output_sha256 text, page_count integer
    );
    create table public.consumer_pending_screening_results (
      pending_id uuid primary key, status text not null, claimed_matter_id uuid
        constraint consumer_pending_screening_results_claimed_matter_id_fkey references public.consumer_briefcase_items(id),
      claimed_user_id uuid, claimed_at timestamptz, anonymous_session_id uuid, product text,
      partner_slug text, jurisdiction text, profile_version text,
      candidate_route_context jsonb, screening_answers jsonb, event_id uuid
    );
    create table public.rcap_document_packet_inputs(document_packet_id uuid, partner_slug text, input_payload jsonb);
    create table public.rcap_document_packets (
      id uuid primary key, partner_slug text, user_id uuid, briefcase_id uuid, person_id uuid,
      state text, jurisdiction text, document_type text, pathway text, status text,
      petitioner_first_name text, petitioner_last_name text, petitioner_city text, petitioner_county text,
      court_county text, court_name text, cause_number text, charge text, offense_date text,
      arrest_date text, arresting_agency text, agency_case_number text, disposition_date text,
      conviction_date text, sentence_completion_date text, needs_record_review boolean,
      generated_plain_text text, filing_instructions text[], county_court_instructions text[],
      missing_fields text[], safety_disclaimer text
    );
    create function public.consumer_matter_id_for_briefcase_item(p_item uuid)
      returns uuid language sql immutable set search_path='' as $$ select p_item $$;
    create function public.expungement_packet_product_id()
      returns text language sql immutable set search_path='' as $$ select 'expungement_packet'::text $$;
    create function public.consumer_packet_payment_authority(uuid,uuid,text,uuid,uuid)
      returns table(valid boolean) language sql stable set search_path='' as $$ select true $$;
    create function public.record_consumer_packet_payment(uuid,text,integer,text,text,text,text,text,text,text,text,text,uuid,uuid)
      returns table(outcome text,briefcase_item_id uuid,provider_event_id text)
      language sql set search_path='' as $$ select 'recorded_paid'::text,$1,$6 $$;
    create function public.enqueue_packet_render_job(uuid,text,text,text,text,text,text,text,uuid,uuid,uuid,uuid,integer,uuid,uuid)
      returns setof public.packet_render_jobs language sql set search_path='' as $$ select * from public.packet_render_jobs where false $$;

    create table public.screening_sessions (
      session_id uuid primary key, flow_mode text, partner_benefit_active boolean,
      partner_slug text, jurisdiction text, claimed_slot_state text, status text,
      updated_at timestamptz not null default now(), partner_access_code_id uuid, campaign_name text
    );
    create table public.partner_users(auth_user_id uuid, partner_slug text, role text, status text);
    create table public.clinic_events (
      id uuid primary key default gen_random_uuid(), partner_slug text, public_slug text, name text,
      starts_at timestamptz, ends_at timestamptz, timezone text, location_name text, geography text,
      capacity integer, sponsorship_allocation integer, created_by uuid, status text
    );
    create table public.clinic_event_audit (
      id uuid primary key default gen_random_uuid(), event_id uuid, actor_user_id uuid,
      action text, target_type text, target_id uuid
    );
    create table public.clinic_cases (
      id uuid primary key default gen_random_uuid(), event_id uuid, participant_user_id uuid,
      screening_session_id uuid, matter_id uuid, jurisdiction text, route_disposition text,
      queue_status text, last_activity_at timestamptz default now(), updated_at timestamptz default now()
    );
    create table public.partner_entitlement (
      partner_slug text primary key, screenings_used integer not null default 0,
      screenings_allowed integer not null default 0, pause_at_cap boolean not null default false,
      overage_enabled boolean not null default false, overage_packets integer not null default 0,
      overage_amount_cents integer not null default 0, overage_packet_price_cents integer not null default 5000,
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
