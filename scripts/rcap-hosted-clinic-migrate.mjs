#!/usr/bin/env node

// Exact, isolated Clinic Preview schema apply for the named nonproduction
// acceptance project. SQL is read from the frozen application commit with
// `git show`; the working tree is never treated as migration authority. The
// migration identities must independently agree with the existing staging
// readiness record before the first database write.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { packetCatalogQuery, normalizeCatalog, comparePacketCatalog, loadPacketContract } from "./rcap-packet-database-contract.mjs";

import { prepareHostedAcceptanceEvidenceLayout } from "./rcap-hosted-acceptance-evidence-layout.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { root: evidenceDir } = prepareHostedAcceptanceEvidenceLayout({ rootDir });
const evidencePath = path.join(evidenceDir, "clinic-migrate.json");

const REQUIRED_PROJECT_REF = "hyflxnlhpmiqxvvcoiia";
const READINESS_PATH = "data/rcap-staging-authorization-readiness.json";
const APPLICATION_SHA = (process.env.HOSTED_APPLICATION_SHA ?? "").trim();
const PROJECT_REF = (process.env.ACCEPTANCE_SUPABASE_PROJECT_REF ?? "").trim();
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";

const APPLICATION_MIGRATIONS = Object.freeze([
  Object.freeze({
    sequencePosition: 1,
    path: "supabase/migrations/20260825120000_clinic_mode_core.sql",
    sha256: "5e3df0a7f49aae3ebbec10b7392acd331e9ca91b2ffa11c7ee16b3e996f3ddef"
  }),
  Object.freeze({
    sequencePosition: 2,
    path: "supabase/migrations/20260825121000_clinic_mode_security.sql",
    sha256: "9a0af066fbe2d47c82f259e6998a7056a2f8c377c8e6875f143d40fd11f18835"
  }),
  Object.freeze({
    sequencePosition: 3,
    path: "supabase/migrations/20260825122000_clinic_mode_accounting_reporting.sql",
    sha256: "9fb46113fbb87eb75b1502f7cb85c9c27a36bac284888202b64baa63398f8010"
  }),
  Object.freeze({
    sequencePosition: 4,
    path: "supabase/migrations/20260828100000_shared_pending_result_and_atomic_claim.sql",
    sha256: "9d4cfcc1849585ad609fe04547cdaf2186582e7369fac1c4868d414de1f9113c"
  }),
  Object.freeze({
    sequencePosition: 5,
    path: "supabase/migrations/20260901115000_consumer_packet_artifact_provenance.sql",
    sha256: "eb4969342a488c281152323693f4ef90732026a16f443218e53231e09cf78132"
  }),
  Object.freeze({
    sequencePosition: 6,
    path: "supabase/migrations/20260901120000_dtc_consumer_launch_rails.sql",
    sha256: "510883d3aa6b0b34140b7b1d09ecaf9662cd45915e6a1ea4d657e85e0f84ffeb"
  }),
  Object.freeze({
    sequencePosition: 7,
    path: "supabase/migrations/20260901130000_consumer_private_delivery.sql",
    sha256: "ab3c23fa13bc52bbf9604e1811e5fec989a7291fb840e1ae5994a12100395621"
  }),
  Object.freeze({
    sequencePosition: 8,
    path: "supabase/migrations/20260901140000_tighten_consumer_artifact_authorization.sql",
    sha256: "cb0c3289f91b2eb5381fc663217149818ef2bfb0460e420c48f1091f87caf424"
  }),
  Object.freeze({
    sequencePosition: 9,
    path: "supabase/migrations/20260903120000_clinic_event_jurisdiction_lock.sql",
    sha256: "2ce9864b23b628d83ea6ac8583d53928623845f4e3a10bc79644d1b54a1ea39e"
  }),
  Object.freeze({
    sequencePosition: 10,
    path: "supabase/migrations/20260903130000_atomic_sponsored_packet_finalization.sql",
    sha256: "5e032d60f605850538efac1039995ed95c30b6e37babeb83a9240a9ef47888e4"
  }),
  // Promotion codes. The acceptance project needs the reconciling payment
  // writer, the regular-price and discount columns and the entitlement probe
  // that reads them, or a discounted order cannot be recorded there at all.
  Object.freeze({
    sequencePosition: 11,
    path: "supabase/migrations/20260917090000_consumer_promotion_codes.sql",
    sha256: "27be177ca6f35e4dd3b0db56ccbc2f9fef4dd03b5108a8690b2bb8fd13299369"
  }),
  Object.freeze({
    sequencePosition: 13,
    path: "supabase/migrations/20260925134704_canonical_consumer_presentation_matter.sql",
    sha256: "378af4a07b2c02a5405eb5d9c02e4b2b47165485283deaeabeaf01c069f378bc"
  })
]);

// Historical hosted receipt: required, immutable, and never loaded or replayed
// from the current application (which does not contain this migration blob).
const HISTORICAL_MIGRATION = Object.freeze({
  sequencePosition: 12,
  path: "supabase/migrations/20260917200000_consumer_checkout_session_replacement.sql",
  sha256: "0d368236f48402bb27953d9b2426e35026ff5d00286f06889ead543c5a32b128",
  applicationSha: "62425c837b5edf3d7e22b110910885abdaec1692"
});
const EXPECTED_LEDGER = Object.freeze([
  ...APPLICATION_MIGRATIONS.slice(0, 11),
  HISTORICAL_MIGRATION,
  APPLICATION_MIGRATIONS[11]
]);

function ledgerRowMatches(actual, expected) {
  return Number(actual.sequence_position) === expected.sequencePosition
    && actual.migration_path === expected.path
    && actual.sha256 === expected.sha256
    && /^[0-9a-f]{40}$/.test(String(actual.application_sha))
    && (!expected.applicationSha || actual.application_sha === expected.applicationSha);
}

const REQUIRED_TABLES = Object.freeze([
  "clinic_events",
  "clinic_event_staff",
  "clinic_event_access_codes",
  "clinic_event_access_redemptions",
  "clinic_assisted_sessions",
  "clinic_cases",
  "clinic_follow_ups",
  "clinic_incidents",
  "clinic_event_audit",
  "clinic_packet_reservations",
  "consumer_pending_screening_results",
  "participant_claim_events",
  "consumer_packet_verifications",
  "consumer_packet_artifact_provenance",
  "consumer_artifact_download_grants"
]);

const REQUIRED_FUNCTIONS = Object.freeze([
  "clinic_create_event",
  "clinic_set_event_staff",
  "clinic_create_access_code",
  "clinic_set_event_status",
  "clinic_redeem_event_code",
  "clinic_start_assisted_session",
  "clinic_end_assisted_session",
  "clinic_upsert_case",
  "clinic_transition_case",
  "clinic_upsert_follow_up",
  "clinic_record_incident",
  "clinic_reserve_packet_credit",
  "clinic_finalize_packet_credit",
  "clinic_release_packet_credit",
  "clinic_reserve_participant_packet_credit",
  "clinic_sync_packet_reservation",
  "clinic_actor_can_event",
  "clinic_upsert_event_follow_up",
  "clinic_get_event_queue",
  "clinic_transition_event_case",
  "clinic_get_follow_ups",
  "clinic_get_event_report",
  "claim_pending_screening_result",
  "participant_claim_events_append_only",
  "attach_consumer_packet_artifact_if_verified",
  "bind_consumer_checkout_verification",
  "consumer_canonical_json",
  "consumer_render_job_verification_guard",
  "enqueue_verified_consumer_packet_render",
  "get_consumer_briefcase_presentation_source",
  "get_consumer_packet_artifact_authority",
  "get_consumer_packet_verification_authority",
  "persist_consumer_packet_verification",
  "record_consumer_packet_payment",
  "rcap_participant_erasure_authority",
  "consumer_packet_artifact_provenance_immutable",
  "finalize_sponsored_packet_generation_if_verified",
  "authorize_consumer_artifact_download",
  "issue_consumer_artifact_download_grant",
  "publish_validated_consumer_render_artifact",
  "revoke_consumer_artifact_download_grant"
]);

const secrets = [SUPABASE_ACCESS_TOKEN].filter(Boolean);
function sanitize(value) {
  let text = String(value ?? "");
  for (const secret of secrets) text = text.split(secret).join("***REDACTED***");
  return text.replace(/eyJ[A-Za-z0-9_.-]{20,}/g, "***REDACTED***");
}

const evidence = {
  schemaVersion: "rcap-hosted-clinic-migrate/v3",
  applicationSha: APPLICATION_SHA || null,
  acceptanceProjectRef: PROJECT_REF || null,
  migrationApplied: false,
  productionTouched: false,
  exactSequence: EXPECTED_LEDGER.map((entry) => ({ ...entry })),
  migrations: [],
  cases: {}
};

class ClinicMigrationFailure extends Error {
  constructor(caseId, message) {
    super(`${caseId}: ${sanitize(message)}`);
    this.name = "ClinicMigrationFailure";
    this.caseId = caseId;
  }
}

function record(caseId, passed, observed) {
  evidence.cases[caseId] = { passed, observed: sanitize(observed) };
  console.log(`  ${passed ? "ok  " : "FAIL"} ${caseId} — ${sanitize(observed)}`);
  if (!passed) throw new ClinicMigrationFailure(caseId, observed);
}

function writeEvidence(passed, error = null) {
  evidence.passed = passed;
  if (error) {
    evidence.failure = {
      caseId: error instanceof ClinicMigrationFailure ? error.caseId : null,
      message: sanitize(error instanceof Error ? error.message : error)
    };
  }
  fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
}

function sqlText(value) {
  return String(value).split("'").join("''");
}

function sorted(values) {
  return [...values].map(String).sort((a, b) => a.localeCompare(b));
}

function equalLists(actual, expected) {
  return JSON.stringify(sorted(actual)) === JSON.stringify(sorted(expected));
}

// Supabase Management API may encode PostgreSQL arrays as text (`{a,b}`)
// instead of JSON arrays. Parse that wire shape explicitly before comparing
// catalog names; treating the string as an array counts characters, not rows.
function postgresArray(value) {
  if (Array.isArray(value)) return value.map(String);
  if (value === null || value === undefined || value === "{}") return [];
  if (typeof value !== "string" || !value.startsWith("{") || !value.endsWith("}")) return [];

  const items = [];
  let token = "";
  let quoted = false;
  let escaped = false;
  for (const character of value.slice(1, -1)) {
    if (escaped) {
      token += character;
      escaped = false;
    } else if (character === "\\") {
      escaped = true;
    } else if (character === '"') {
      quoted = !quoted;
    } else if (character === "," && !quoted) {
      items.push(token);
      token = "";
    } else {
      token += character;
    }
  }
  items.push(token);
  return items;
}

function truthy(value) {
  return value === true || value === "true" || value === "t";
}

async function managementQuery(query, caseId = "acceptance_database_query_succeeded") {
  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ query })
  });
  const text = await response.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* reported below */ }
  if (!response.ok) {
    throw new ClinicMigrationFailure(caseId, `HTTP ${response.status}: ${sanitize(json?.message ?? text).slice(0, 400)}`);
  }
  return json;
}

function frozenMigrationBytes(migration) {
  const result = spawnSync("git", ["show", `${APPLICATION_SHA}:${migration.path}`], {
    cwd: rootDir,
    encoding: null,
    maxBuffer: 20 * 1024 * 1024
  });
  if (result.status !== 0 || !Buffer.isBuffer(result.stdout)) {
    throw new ClinicMigrationFailure("frozen_candidate_migration_hashes_and_order_exact", `git could not read ${migration.path} from ${APPLICATION_SHA}`);
  }
  const hash = crypto.createHash("sha256").update(result.stdout).digest("hex");
  if (hash !== migration.sha256) {
    throw new ClinicMigrationFailure("frozen_candidate_migration_hashes_and_order_exact", `${migration.path} hash ${hash} does not equal authorized ${migration.sha256}`);
  }
  return result.stdout.toString("utf8");
}

async function main() {
  record(
    "exact_nonproduction_inputs_present",
    /^[0-9a-f]{40}$/.test(APPLICATION_SHA) && PROJECT_REF === REQUIRED_PROJECT_REF && Boolean(SUPABASE_ACCESS_TOKEN),
    `application is a full frozen SHA=${/^[0-9a-f]{40}$/.test(APPLICATION_SHA)}; acceptance project exact=${PROJECT_REF === REQUIRED_PROJECT_REF}; credential supplied=${Boolean(SUPABASE_ACCESS_TOKEN)}`
  );

  const loaded = APPLICATION_MIGRATIONS.map((migration) => ({
    ...migration, sql: frozenMigrationBytes(migration)
  }));
  record(
    "frozen_candidate_migration_hashes_and_order_exact",
    loaded.length === APPLICATION_MIGRATIONS.length,
    `${loaded.length}/${APPLICATION_MIGRATIONS.length} application-owned files read directly from ${APPLICATION_SHA}; exact order and SHA-256 values verified before the first database write`
  );

  const readiness = JSON.parse(fs.readFileSync(path.join(rootDir, READINESS_PATH), "utf8"));
  const independent = readiness.clinicModePreviewMigrationAuthorization;
  const independentSequence = independent?.migrationsInApplyOrder ?? [];
  const independentExact = independent?.status === "authorized_nonproduction_acceptance_only"
    && independent?.acceptanceProjectRef === REQUIRED_PROJECT_REF
    && independent?.productionAuthorized === false
    && independentSequence.length === EXPECTED_LEDGER.length
    && independentSequence.every((entry, index) => entry.sequencePosition === EXPECTED_LEDGER[index].sequencePosition
      && entry.path === EXPECTED_LEDGER[index].path
      && entry.sha256 === EXPECTED_LEDGER[index].sha256
      && entry.applicationSha === EXPECTED_LEDGER[index].applicationSha);
  record(
    "independent_readiness_hashes_and_order_exact",
    independentExact,
    `${independentSequence.length}/${EXPECTED_LEDGER.length} readiness identities agree; acceptance project exact=${independent?.acceptanceProjectRef === REQUIRED_PROJECT_REF}; Production authorized=${independent?.productionAuthorized === true}`
  );

  await managementQuery(`
    create table if not exists public.rcap_acceptance_clinic_migration_ledger (
      sequence_position smallint primary key check (sequence_position between 1 and 13),
      migration_path text not null unique,
      sha256 text not null unique check (sha256 ~ '^[0-9a-f]{64}$'),
      application_sha text not null check (application_sha ~ '^[0-9a-f]{40}$'),
      applied_at timestamptz not null default now()
    );
    revoke all on public.rcap_acceptance_clinic_migration_ledger from anon, authenticated;
    alter table public.rcap_acceptance_clinic_migration_ledger enable row level security;

    do $$ begin
      if exists (
        select 1 from pg_constraint
        where conrelid = 'public.rcap_acceptance_clinic_migration_ledger'::regclass
          and conname = 'rcap_acceptance_clinic_migration_ledger_sequence_position_check'
          and pg_get_constraintdef(oid) <> 'CHECK (((sequence_position >= 1) AND (sequence_position <= 13)))'
      ) then
        alter table public.rcap_acceptance_clinic_migration_ledger
          drop constraint rcap_acceptance_clinic_migration_ledger_sequence_position_check;
        alter table public.rcap_acceptance_clinic_migration_ledger
          add constraint rcap_acceptance_clinic_migration_ledger_sequence_position_check
          check (sequence_position between 1 and 13);
      end if;
    end $$;

    create or replace function public.clinic_acceptance_ledger_immutable()
    returns trigger language plpgsql set search_path = ''
    as $$ begin raise exception 'clinic_acceptance_ledger_immutable'; end $$;
    revoke all on function public.clinic_acceptance_ledger_immutable() from public, anon, authenticated;
    do $$ begin
      if not exists (
        select 1 from pg_trigger
        where tgname = 'clinic_acceptance_ledger_immutable'
          and tgrelid = 'public.rcap_acceptance_clinic_migration_ledger'::regclass
          and not tgisinternal
      ) then
        create trigger clinic_acceptance_ledger_immutable
        before update or delete on public.rcap_acceptance_clinic_migration_ledger
        for each row execute function public.clinic_acceptance_ledger_immutable();
      end if;
    end $$;
  `, "immutable_clinic_migration_ledger_ready");

  const existingRows = await managementQuery(`
    select sequence_position, migration_path, sha256, application_sha
    from public.rcap_acceptance_clinic_migration_ledger
    order by sequence_position
  `, "immutable_clinic_migration_ledger_readable");
  const existing = Array.isArray(existingRows) ? existingRows : [];
  if (existing.length > EXPECTED_LEDGER.length) {
    throw new ClinicMigrationFailure("existing_ledger_is_exact_prefix", `unexpected ledger row count ${existing.length}`);
  }
  for (let index = 0; index < existing.length; index += 1) {
    const actual = existing[index];
    const expected = EXPECTED_LEDGER[index];
    const exact = ledgerRowMatches(actual, expected);
    if (!exact) {
      throw new ClinicMigrationFailure("existing_ledger_is_exact_prefix", `existing ledger is not an exact prefix; unexpected ledger row at position ${index + 1}`);
    }
  }
  if (!existing.some((row) => ledgerRowMatches(row, HISTORICAL_MIGRATION))) {
    throw new ClinicMigrationFailure("existing_ledger_is_exact_prefix", "required historical ledger row at position 12 absent; historical SQL must not be reconstructed or reapplied");
  }
  record("existing_ledger_is_exact_prefix", true, `${existing.length}/${EXPECTED_LEDGER.length} immutable entries already present and exact`);

  for (const expected of EXPECTED_LEDGER.slice(existing.length)) {
    const migration = loaded.find((entry) => entry.sequencePosition === expected.sequencePosition);
    if (!migration) throw new ClinicMigrationFailure("existing_ledger_is_exact_prefix", `no application-owned migration at position ${expected.sequencePosition}`);
    await managementQuery(migration.sql, `clinic_migration_${migration.sequencePosition}_applied`);
    await managementQuery(`
      insert into public.rcap_acceptance_clinic_migration_ledger
        (sequence_position, migration_path, sha256, application_sha)
      values (
        ${migration.sequencePosition},
        '${sqlText(migration.path)}',
        '${migration.sha256}',
        '${APPLICATION_SHA}'
      )
    `, `clinic_migration_${migration.sequencePosition}_ledger_recorded`);
    evidence.migrationApplied = true;
    evidence.migrations.push({
      sequencePosition: migration.sequencePosition,
      path: migration.path,
      sha256: migration.sha256,
      disposition: "applied_from_frozen_candidate_and_ledgered"
    });
  }
  for (let index = 0; index < existing.length; index += 1) {
    const migration = EXPECTED_LEDGER[index];
    evidence.migrations.push({
      sequencePosition: migration.sequencePosition,
      path: migration.path,
      sha256: migration.sha256,
      disposition: "already_applied_at_exact_hash"
    });
  }
  evidence.migrations.sort((a, b) => a.sequencePosition - b.sequencePosition);

  const names = (values) => values.map((value) => `'${sqlText(value)}'`).join(",");
  const readbackRows = await managementQuery(`
    select
      array(
        select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and c.relkind='r' and c.relname in (${names(REQUIRED_TABLES)})
        order by c.relname
      ) as tables,
      array(
        select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and c.relkind='r' and c.relrowsecurity and c.relname in (${names(REQUIRED_TABLES)})
        order by c.relname
      ) as rls_tables,
      array(
        select distinct p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname='public' and p.proname in (${names(REQUIRED_FUNCTIONS)})
        order by p.proname
      ) as functions,
      to_regprocedure('public.claim_pending_screening_result(text,uuid,jsonb,text)') is not null as atomic_claim_present,
      to_regprocedure('public.enqueue_verified_consumer_packet_render(uuid,text,text,text,text,text,text,text,uuid,uuid,uuid,integer,uuid,uuid,text,jsonb,jsonb)') is not null as verified_enqueue_present,
      to_regprocedure('public.authorize_consumer_artifact_download(uuid,uuid,text)') is not null as private_download_present,
      to_regprocedure('public.clinic_create_event(uuid,text,text,text,timestamptz,timestamptz,text,text,text,integer,integer,text)') is not null as jurisdiction_create_present,
      to_regprocedure('public.finalize_sponsored_packet_generation_if_verified(uuid,uuid,text,jsonb)') is not null as sponsored_finalizer_present,
      exists(
        select 1 from information_schema.columns
        where table_schema='public' and table_name='clinic_events' and column_name='jurisdiction'
      ) as jurisdiction_column_present,
      (
        select count(*) = 12
          and count(*) filter (where column_name='briefcase_item_id' and ordinal_position=1 and udt_name='uuid' and is_nullable='NO') = 1
          and count(*) filter (where column_name='consumer_auth_user_id' and ordinal_position=2 and udt_name='uuid' and is_nullable='NO') = 1
          and count(*) filter (where column_name='matter_id' and ordinal_position=3 and udt_name='uuid' and is_nullable='NO') = 1
          and count(*) filter (where column_name='render_job_id' and ordinal_position=4 and udt_name='uuid' and is_nullable='YES') = 1
          and count(*) filter (where column_name='verification_hash' and ordinal_position=5 and udt_name='text' and is_nullable='YES') = 1
          and count(*) filter (where column_name='entitlement_source' and ordinal_position=6 and udt_name='text' and is_nullable='NO') = 1
          and count(*) filter (where column_name='artifact' and ordinal_position=7 and udt_name='jsonb' and is_nullable='NO') = 1
          and count(*) filter (where column_name='legacy_evidence' and ordinal_position=8 and udt_name='jsonb' and is_nullable='YES') = 1
          and count(*) filter (where column_name='revision' and ordinal_position=9 and udt_name='int4' and is_nullable='NO') = 1
          and count(*) filter (where column_name='created_at' and ordinal_position=10 and udt_name='timestamptz' and is_nullable='NO') = 1
          and count(*) filter (where column_name='updated_at' and ordinal_position=11 and udt_name='timestamptz' and is_nullable='NO') = 1
          and count(*) filter (where column_name='superseded_artifacts' and ordinal_position=12 and udt_name='jsonb' and is_nullable='NO') = 1
        from information_schema.columns
        where table_schema='public' and table_name='consumer_packet_artifact_provenance'
      ) as provenance_columns_exact,
      (
        select count(*) = 8
          and count(*) filter (where conname='consumer_packet_artifact_provenance_pkey' and pg_get_constraintdef(oid)='PRIMARY KEY (briefcase_item_id)') = 1
          and count(*) filter (where conname='consumer_packet_artifact_provenance_briefcase_item_id_fkey' and pg_get_constraintdef(oid)='FOREIGN KEY (briefcase_item_id) REFERENCES consumer_briefcase_items(id) ON DELETE CASCADE') = 1
          and count(*) filter (where conname='consumer_packet_artifact_provenance_render_job_id_fkey' and pg_get_constraintdef(oid)='FOREIGN KEY (render_job_id) REFERENCES packet_render_jobs(id)') = 1
          and count(*) filter (where conname='consumer_packet_artifact_provenance_verification_hash_check' and pg_get_constraintdef(oid)='CHECK (((verification_hash IS NULL) OR (verification_hash ~ ''^[a-f0-9]{64}$''::text)))') = 1
          and count(*) filter (where conname='consumer_packet_artifact_provenance_entitlement_source_check' and pg_get_constraintdef(oid)='CHECK ((entitlement_source = ANY (ARRAY[''consumer_payment''::text, ''partner_sponsorship''::text, ''legacy_backfill''::text])))') = 1
          and count(*) filter (where conname='consumer_packet_artifact_provenance_revision_check' and pg_get_constraintdef(oid)='CHECK ((revision >= 1))') = 1
          and count(*) filter (where conname='consumer_packet_artifact_provenance_superseded_artifacts_check' and pg_get_constraintdef(oid)='CHECK ((jsonb_typeof(superseded_artifacts) = ''array''::text))') = 1
          and count(*) filter (where conname='consumer_packet_artifact_provenance_legacy_evidence_required' and pg_get_constraintdef(oid)='CHECK (((entitlement_source <> ''legacy_backfill''::text) OR (legacy_evidence IS NOT NULL)))') = 1
        from pg_constraint
        where conrelid='public.consumer_packet_artifact_provenance'::regclass
      ) as provenance_constraints_exact,
      exists(
        select 1 from pg_index i join pg_class x on x.oid=i.indexrelid
        where i.indrelid='public.consumer_packet_artifact_provenance'::regclass
          and x.relname='consumer_packet_artifact_provenance_user_idx'
          and i.indisvalid and not i.indisunique
          and i.indnkeyatts=1 and i.indpred is null and i.indexprs is null
          and pg_get_indexdef(i.indexrelid)='CREATE INDEX consumer_packet_artifact_provenance_user_idx ON public.consumer_packet_artifact_provenance USING btree (consumer_auth_user_id)'
      ) as provenance_owner_index_exact,
      exists(
        select 1 from pg_trigger
        where tgname='consumer_packet_artifact_provenance_immutable'
          and tgrelid='public.consumer_packet_artifact_provenance'::regclass
          and not tgisinternal
      ) and not exists(
        select 1 from pg_policy
        where polrelid='public.consumer_packet_artifact_provenance'::regclass
      ) as provenance_immutable_and_policyless,
      pg_get_functiondef(to_regprocedure('public.authorize_consumer_artifact_download(uuid,uuid,text)')) like '%p.consumer_auth_user_id = g.consumer_auth_user_id%'
        and pg_get_functiondef(to_regprocedure('public.authorize_consumer_artifact_download(uuid,uuid,text)')) like '%order by p.revision desc%'
        and pg_get_functiondef(to_regprocedure('public.authorize_consumer_artifact_download(uuid,uuid,text)')) like '%limit 1%'
        as tightened_private_download_present,
      not exists (
        select 1 from information_schema.role_table_grants g
        where g.table_schema='public'
          and g.grantee in ('PUBLIC','anon','authenticated')
          and g.table_name in (
            'consumer_pending_screening_results','participant_claim_events',
            'consumer_packet_verifications','consumer_packet_artifact_provenance',
            'consumer_artifact_download_grants'
          )
          and g.privilege_type in ('SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER')
      ) as protected_table_grants_tight,
      coalesce(has_function_privilege('service_role',to_regprocedure('public.claim_pending_screening_result(text,uuid,jsonb,text)'),'EXECUTE'),false)
        and not coalesce(has_function_privilege('anon',to_regprocedure('public.claim_pending_screening_result(text,uuid,jsonb,text)'),'EXECUTE'),false)
        and not coalesce(has_function_privilege('authenticated',to_regprocedure('public.claim_pending_screening_result(text,uuid,jsonb,text)'),'EXECUTE'),false)
        and coalesce(has_function_privilege('service_role',to_regprocedure('public.enqueue_verified_consumer_packet_render(uuid,text,text,text,text,text,text,text,uuid,uuid,uuid,integer,uuid,uuid,text,jsonb,jsonb)'),'EXECUTE'),false)
        and not coalesce(has_function_privilege('anon',to_regprocedure('public.enqueue_verified_consumer_packet_render(uuid,text,text,text,text,text,text,text,uuid,uuid,uuid,integer,uuid,uuid,text,jsonb,jsonb)'),'EXECUTE'),false)
        and not coalesce(has_function_privilege('authenticated',to_regprocedure('public.enqueue_verified_consumer_packet_render(uuid,text,text,text,text,text,text,text,uuid,uuid,uuid,integer,uuid,uuid,text,jsonb,jsonb)'),'EXECUTE'),false)
        and coalesce(has_function_privilege('service_role',to_regprocedure('public.authorize_consumer_artifact_download(uuid,uuid,text)'),'EXECUTE'),false)
        and not coalesce(has_function_privilege('anon',to_regprocedure('public.authorize_consumer_artifact_download(uuid,uuid,text)'),'EXECUTE'),false)
        and not coalesce(has_function_privilege('authenticated',to_regprocedure('public.authorize_consumer_artifact_download(uuid,uuid,text)'),'EXECUTE'),false)
        and coalesce(has_function_privilege('service_role',to_regprocedure('public.clinic_create_event(uuid,text,text,text,timestamp with time zone,timestamp with time zone,text,text,text,integer,integer,text)'),'EXECUTE'),false)
        and not coalesce(has_function_privilege('anon',to_regprocedure('public.clinic_create_event(uuid,text,text,text,timestamp with time zone,timestamp with time zone,text,text,text,integer,integer,text)'),'EXECUTE'),false)
        and not coalesce(has_function_privilege('authenticated',to_regprocedure('public.clinic_create_event(uuid,text,text,text,timestamp with time zone,timestamp with time zone,text,text,text,integer,integer,text)'),'EXECUTE'),false)
        and coalesce(has_function_privilege('service_role',to_regprocedure('public.finalize_sponsored_packet_generation_if_verified(uuid,uuid,text,jsonb)'),'EXECUTE'),false)
        and not coalesce(has_function_privilege('anon',to_regprocedure('public.finalize_sponsored_packet_generation_if_verified(uuid,uuid,text,jsonb)'),'EXECUTE'),false)
        and not coalesce(has_function_privilege('authenticated',to_regprocedure('public.finalize_sponsored_packet_generation_if_verified(uuid,uuid,text,jsonb)'),'EXECUTE'),false)
        and not exists (
          select 1 from information_schema.routine_privileges rp
          where rp.routine_schema='public'
            and rp.routine_name='finalize_sponsored_packet_generation_if_verified'
            and rp.grantee='PUBLIC' and rp.privilege_type='EXECUTE'
        )
        and coalesce(has_function_privilege('service_role',to_regprocedure('public.rcap_participant_erasure_authority()'),'EXECUTE'),false)
        and not coalesce(has_function_privilege('anon',to_regprocedure('public.rcap_participant_erasure_authority()'),'EXECUTE'),false)
        and not coalesce(has_function_privilege('authenticated',to_regprocedure('public.rcap_participant_erasure_authority()'),'EXECUTE'),false)
        and coalesce(has_function_privilege('service_role',to_regprocedure('public.consumer_packet_artifact_provenance_immutable()'),'EXECUTE'),false)
        and not coalesce(has_function_privilege('anon',to_regprocedure('public.consumer_packet_artifact_provenance_immutable()'),'EXECUTE'),false)
        and not coalesce(has_function_privilege('authenticated',to_regprocedure('public.consumer_packet_artifact_provenance_immutable()'),'EXECUTE'),false)
        and not exists (
          select 1 from information_schema.routine_privileges rp
          where rp.routine_schema='public'
            and rp.routine_name in ('rcap_participant_erasure_authority','consumer_packet_artifact_provenance_immutable')
            and rp.grantee='PUBLIC' and rp.privilege_type='EXECUTE'
        )
        as key_function_grants_tight,
      exists(
        select 1 from pg_trigger
        where tgname='clinic_acceptance_ledger_immutable'
          and tgrelid='public.rcap_acceptance_clinic_migration_ledger'::regclass
          and not tgisinternal
      ) as ledger_immutable
  `, "clinic_schema_catalog_readback_succeeded");
  // The entry point is a wrapper. Reuse Grade-A's exact current definitions,
  // signatures and effective security/grants for it and its route finalizer.
  const finalizerKeys = ["functions:finalize_sponsored_packet_generation_if_verified", "functions:finalize_sponsored_packet_generation_for_route"];
  const packetContract = loadPacketContract(rootDir);
  const finalizerQuery = packetCatalogQuery().replace("as catalog from entries;",
    `as catalog from entries where key in (${finalizerKeys.map(key => "'" + sqlText(key) + "'").join(",")});`);
  const finalizerRows = await managementQuery(finalizerQuery, "current_sponsored_finalizer_catalog_readback_succeeded");
  const finalizerExpected = Object.fromEntries(finalizerKeys.map(key => [key, packetContract.current[key]]));
  const finalizerFailures = comparePacketCatalog(finalizerExpected, normalizeCatalog(finalizerRows?.[0]?.catalog ?? {}));
  const currentSponsoredFinalizerExact = finalizerKeys.every(key => packetContract.current[key] && Object.keys(packetContract.current[key]).length === 1)
    && finalizerFailures.length === 0;
  evidence.sponsoredFinalizerCertification = {
    authority: "data/rcap-grade-a/launch-control/PACKET_DATABASE_CONTRACT.json",
    exactCurrentFunctions: finalizerKeys,
    passed: currentSponsoredFinalizerExact,
    mismatches: finalizerFailures.map(failure => failure.name)
  };
  const readback = Array.isArray(readbackRows) ? readbackRows[0] ?? {} : {};
  const tableNames = postgresArray(readback.tables);
  const rlsTableNames = postgresArray(readback.rls_tables);
  const functionNames = postgresArray(readback.functions);
  const tablesAndRlsExact = equalLists(tableNames, REQUIRED_TABLES) && equalLists(rlsTableNames, REQUIRED_TABLES);
  record(
    "all_required_tables_exist_with_rls_enabled",
    tablesAndRlsExact,
    `all ${REQUIRED_TABLES.length} required tables exist with RLS enabled=${tablesAndRlsExact}; tables=${tableNames.length}; RLS=${rlsTableNames.length}`
  );
  record(
    "all_required_functions_exist",
    equalLists(functionNames, REQUIRED_FUNCTIONS),
    `all ${REQUIRED_FUNCTIONS.length} required functions exist=${equalLists(functionNames, REQUIRED_FUNCTIONS)}; functions=${functionNames.length}`
  );
  const provenancePrerequisiteExact = truthy(readback.provenance_columns_exact)
    && truthy(readback.provenance_constraints_exact)
    && truthy(readback.provenance_owner_index_exact)
    && truthy(readback.provenance_immutable_and_policyless);
  record(
    "consumer_artifact_provenance_prerequisite_exact",
    provenancePrerequisiteExact,
    `columns=${truthy(readback.provenance_columns_exact)}; constraints=${truthy(readback.provenance_constraints_exact)}; owner index=${truthy(readback.provenance_owner_index_exact)}; immutable trigger and no direct policy=${truthy(readback.provenance_immutable_and_policyless)}`
  );
  const currentContractsPresent = truthy(readback.atomic_claim_present)
    && truthy(readback.verified_enqueue_present)
    && truthy(readback.private_download_present)
    && truthy(readback.jurisdiction_create_present)
    && truthy(readback.sponsored_finalizer_present)
    && truthy(readback.jurisdiction_column_present)
    && truthy(readback.tightened_private_download_present)
    && currentSponsoredFinalizerExact
    && provenancePrerequisiteExact
    && truthy(readback.protected_table_grants_tight)
    && truthy(readback.key_function_grants_tight);
  record(
    "all_seven_current_demo_migration_families_read_back",
    currentContractsPresent,
    `atomic claim=${truthy(readback.atomic_claim_present)}; launch rails=${truthy(readback.verified_enqueue_present)}; private delivery=${truthy(readback.private_download_present)}; tightened authorization=${truthy(readback.tightened_private_download_present)}; atomic sponsored finalization=${currentSponsoredFinalizerExact}; protected table grants=${truthy(readback.protected_table_grants_tight)}; key function grants=${truthy(readback.key_function_grants_tight)}; jurisdiction lock=${truthy(readback.jurisdiction_create_present) && truthy(readback.jurisdiction_column_present)}`
  );

  const finalLedgerRows = await managementQuery(`
    select sequence_position, migration_path, sha256, application_sha
    from public.rcap_acceptance_clinic_migration_ledger
    order by sequence_position
  `, "final_clinic_migration_ledger_readback_succeeded");
  const finalLedger = Array.isArray(finalLedgerRows) ? finalLedgerRows : [];
  const ledgerExact = finalLedger.length === EXPECTED_LEDGER.length
    && finalLedger.every((row, index) => ledgerRowMatches(row, EXPECTED_LEDGER[index]))
    && truthy(readback.ledger_immutable);
  record(
    "ledger_records_all_10_exact_frozen_migrations",
    ledgerExact,
    `ledger records all 13 exact immutable positions=${ledgerExact}; immutable trigger=${truthy(readback.ledger_immutable)}`
  );
}

try {
  await main();
  writeEvidence(true);
  console.log("\nHOSTED CLINIC MIGRATE: PASS — 13 immutable ledger positions / 12 application-owned blobs / one historical ledger-only position is present on acceptance only");
} catch (error) {
  writeEvidence(false, error);
  console.error(`\nHOSTED CLINIC MIGRATE: FAIL — ${sanitize(error instanceof Error ? error.message : error)}`);
  process.exitCode = 1;
}
