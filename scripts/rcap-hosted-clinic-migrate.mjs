#!/usr/bin/env node

// Exact, isolated Clinic schema apply for the named nonproduction acceptance
// project. The SQL is read from the frozen application commit with `git show`;
// the working tree is never treated as migration authority.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { prepareHostedAcceptanceEvidenceLayout } from "./rcap-hosted-acceptance-evidence-layout.mjs";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const { root: evidenceDir } = prepareHostedAcceptanceEvidenceLayout({ rootDir });
const evidencePath = path.join(evidenceDir, "clinic-migrate.json");

const REQUIRED_APPLICATION_SHA = "441ee3188ee52047a012232d8d11f890a09b4ac5";
const REQUIRED_PROJECT_REF = "hyflxnlhpmiqxvvcoiia";
const APPLICATION_SHA = (process.env.HOSTED_APPLICATION_SHA ?? "").trim();
const PROJECT_REF = (process.env.ACCEPTANCE_SUPABASE_PROJECT_REF ?? "").trim();
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";

const MIGRATIONS = Object.freeze([
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
  })
]);

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
  "clinic_packet_reservations"
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
  "clinic_get_event_report"
]);

const secrets = [SUPABASE_ACCESS_TOKEN].filter(Boolean);
function sanitize(value) {
  let text = String(value ?? "");
  for (const secret of secrets) text = text.split(secret).join("***REDACTED***");
  return text.replace(/eyJ[A-Za-z0-9_.-]{20,}/g, "***REDACTED***");
}

const evidence = {
  schemaVersion: "rcap-hosted-clinic-migrate/v1",
  applicationSha: APPLICATION_SHA || null,
  acceptanceProjectRef: PROJECT_REF || null,
  migrationApplied: false,
  productionTouched: false,
  exactSequence: MIGRATIONS.map(({ sequencePosition, path: migrationPath, sha256 }) => ({ sequencePosition, path: migrationPath, sha256 })),
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
    APPLICATION_SHA === REQUIRED_APPLICATION_SHA && PROJECT_REF === REQUIRED_PROJECT_REF && Boolean(SUPABASE_ACCESS_TOKEN),
    `application exact=${APPLICATION_SHA === REQUIRED_APPLICATION_SHA}; acceptance project exact=${PROJECT_REF === REQUIRED_PROJECT_REF}; credential supplied=${Boolean(SUPABASE_ACCESS_TOKEN)}`
  );

  const loaded = MIGRATIONS.map((migration, index) => {
    if (migration.sequencePosition !== index + 1) {
      throw new ClinicMigrationFailure("frozen_candidate_migration_hashes_and_order_exact", `migration order drift at position ${index + 1}`);
    }
    return { ...migration, sql: frozenMigrationBytes(migration) };
  });
  record(
    "frozen_candidate_migration_hashes_and_order_exact",
    loaded.length === 3,
    `3/3 files read directly from ${APPLICATION_SHA}; exact order and SHA-256 values verified before the first database write`
  );

  await managementQuery(`
    create table if not exists public.rcap_acceptance_clinic_migration_ledger (
      sequence_position smallint primary key check (sequence_position between 1 and 3),
      migration_path text not null unique,
      sha256 text not null unique check (sha256 ~ '^[0-9a-f]{64}$'),
      application_sha text not null check (application_sha ~ '^[0-9a-f]{40}$'),
      applied_at timestamptz not null default now()
    );
    revoke all on public.rcap_acceptance_clinic_migration_ledger from anon, authenticated;
    alter table public.rcap_acceptance_clinic_migration_ledger enable row level security;

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
  if (existing.length > MIGRATIONS.length) {
    throw new ClinicMigrationFailure("existing_ledger_is_exact_prefix", `unexpected ledger row count ${existing.length}`);
  }
  for (let index = 0; index < existing.length; index += 1) {
    const actual = existing[index];
    const expected = MIGRATIONS[index];
    const exact = Number(actual.sequence_position) === expected.sequencePosition
      && actual.migration_path === expected.path
      && actual.sha256 === expected.sha256
      && actual.application_sha === APPLICATION_SHA;
    if (!exact) {
      throw new ClinicMigrationFailure("existing_ledger_is_exact_prefix", `existing ledger is not an exact prefix; unexpected ledger row at position ${index + 1}`);
    }
  }
  record("existing_ledger_is_exact_prefix", true, `${existing.length}/3 immutable entries already present and exact`);

  for (let index = existing.length; index < loaded.length; index += 1) {
    const migration = loaded[index];
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
    const migration = MIGRATIONS[index];
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
      exists(
        select 1 from pg_trigger
        where tgname='clinic_acceptance_ledger_immutable'
          and tgrelid='public.rcap_acceptance_clinic_migration_ledger'::regclass
          and not tgisinternal
      ) as ledger_immutable
  `, "clinic_schema_catalog_readback_succeeded");
  const readback = Array.isArray(readbackRows) ? readbackRows[0] ?? {} : {};
  const tableNames = postgresArray(readback.tables);
  const rlsTableNames = postgresArray(readback.rls_tables);
  const functionNames = postgresArray(readback.functions);
  const tablesAndRlsExact = equalLists(tableNames, REQUIRED_TABLES) && equalLists(rlsTableNames, REQUIRED_TABLES);
  record(
    "all_10_clinic_tables_exist_with_rls_enabled",
    tablesAndRlsExact,
    `all 10 Clinic tables exist with RLS enabled=${tablesAndRlsExact}; tables=${tableNames.length}; RLS=${rlsTableNames.length}`
  );
  record(
    "all_22_clinic_functions_exist",
    equalLists(functionNames, REQUIRED_FUNCTIONS),
    `all 22 Clinic functions exist=${equalLists(functionNames, REQUIRED_FUNCTIONS)}; functions=${functionNames.length}`
  );

  const finalLedgerRows = await managementQuery(`
    select sequence_position, migration_path, sha256, application_sha
    from public.rcap_acceptance_clinic_migration_ledger
    order by sequence_position
  `, "final_clinic_migration_ledger_readback_succeeded");
  const finalLedger = Array.isArray(finalLedgerRows) ? finalLedgerRows : [];
  const ledgerExact = finalLedger.length === MIGRATIONS.length
    && finalLedger.every((row, index) => Number(row.sequence_position) === MIGRATIONS[index].sequencePosition
      && row.migration_path === MIGRATIONS[index].path
      && row.sha256 === MIGRATIONS[index].sha256
      && row.application_sha === APPLICATION_SHA)
    && truthy(readback.ledger_immutable);
  record(
    "ledger_records_all_3_exact_frozen_migrations",
    ledgerExact,
    `ledger records all 3 exact frozen migrations=${ledgerExact}; immutable trigger=${truthy(readback.ledger_immutable)}`
  );
}

try {
  await main();
  writeEvidence(true);
  console.log("\nHOSTED CLINIC MIGRATE: PASS — exact frozen three-file Clinic sequence is present on acceptance only");
} catch (error) {
  writeEvidence(false, error);
  console.error(`\nHOSTED CLINIC MIGRATE: FAIL — ${sanitize(error instanceof Error ? error.message : error)}`);
  process.exitCode = 1;
}
