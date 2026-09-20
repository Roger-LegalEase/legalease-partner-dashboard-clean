#!/usr/bin/env node
// Exact Production Clinic schema apply and direct readback.
//
// The only writes are the three frozen, hash-pinned Clinic migrations. No
// ledger, fixture, participant, checkout, deployment, alias, or worker action
// is performed. A partial pre-existing Clinic schema is refused.

import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const APPLICATION_SHA = "441ee3188ee52047a012232d8d11f890a09b4ac5";
const PRODUCTION_PROJECT_REF = "wwtwtsmywnckfkdaqqeg";
const ROOT_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PHASE = (process.env.RCAP_PRODUCTION_PHASE ?? "").trim();
const INPUT_APPLICATION_SHA = (process.env.RCAP_APPLICATION_SHA ?? "").trim();
const INPUT_PROJECT_REF = (process.env.RCAP_PRODUCTION_PROJECT_REF ?? "").trim();
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN ?? "";
const EVIDENCE_DIR = path.resolve(process.env.RCAP_PRODUCTION_EVIDENCE_DIR ?? "production-canary-evidence");
const EVIDENCE_FILE = path.join(EVIDENCE_DIR, "production-clinic-migrate.json");

const MIGRATIONS = Object.freeze([
  Object.freeze({
    position: 1,
    path: "supabase/migrations/20260825120000_clinic_mode_core.sql",
    sha256: "5e3df0a7f49aae3ebbec10b7392acd331e9ca91b2ffa11c7ee16b3e996f3ddef"
  }),
  Object.freeze({
    position: 2,
    path: "supabase/migrations/20260825121000_clinic_mode_security.sql",
    sha256: "9a0af066fbe2d47c82f259e6998a7056a2f8c377c8e6875f143d40fd11f18835"
  }),
  Object.freeze({
    position: 3,
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

fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

const verdicts = [];
const evidence = {
  schemaVersion: "rcap-production-clinic-migrate/v1",
  startedAt: new Date().toISOString(),
  applicationSha: APPLICATION_SHA,
  productionProjectRef: PRODUCTION_PROJECT_REF,
  exactMigrationSequence: MIGRATIONS.map(({ position, path: migrationPath, sha256 }) => ({
    position,
    path: migrationPath,
    sha256
  })),
  migrationApplied: false,
  migrationDisposition: null,
  productionDatabaseMutated: false,
  realParticipantRecordsCreated: false,
  realChargesCreated: false,
  deploymentTriggered: false,
  aliasChanged: false,
  environmentVariableChanged: false,
  applicationChanged: false,
  workerChanged: false,
  readback: null,
  verdicts
};

function record(caseId, passed, observed) {
  verdicts.push({ caseId, passed, observed });
  console.log(`  ${passed ? "ok  " : "FAIL"} ${caseId} — ${observed}`);
  if (!passed) throw new Error(caseId);
}

function persist(passed, failure = null) {
  evidence.finishedAt = new Date().toISOString();
  evidence.passed = passed;
  evidence.failure = failure;
  fs.writeFileSync(EVIDENCE_FILE, `${JSON.stringify(evidence, null, 2)}\n`);
}

function parseJson(text) {
  try { return JSON.parse(text); }
  catch { return null; }
}

async function managementGet(pathname) {
  const response = await fetch(`https://api.supabase.com${pathname}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}` }
  });
  const text = await response.text();
  return { status: response.status, json: parseJson(text) };
}

async function managementQuery(query, caseId) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${PRODUCTION_PROJECT_REF}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ query })
    }
  );
  const text = await response.text();
  const json = parseJson(text);
  if (!response.ok) {
    const safeMessage = String(json?.message ?? "database query failed").slice(0, 240);
    throw new Error(`${caseId}: HTTP ${response.status}: ${safeMessage}`);
  }
  return json;
}

function frozenMigration(migration) {
  const result = spawnSync("git", ["show", `${APPLICATION_SHA}:${migration.path}`], {
    cwd: ROOT_DIR,
    encoding: null,
    maxBuffer: 20 * 1024 * 1024
  });
  if (result.status !== 0 || !Buffer.isBuffer(result.stdout)) {
    throw new Error(`frozen migration unavailable at position ${migration.position}`);
  }
  const actual = createHash("sha256").update(result.stdout).digest("hex");
  if (actual !== migration.sha256) {
    throw new Error(`frozen migration hash mismatch at position ${migration.position}`);
  }
  return { ...migration, sql: result.stdout.toString("utf8") };
}

function postgresArray(value) {
  if (Array.isArray(value)) return value.map(String);
  if (value === null || value === undefined || value === "{}") return [];
  if (typeof value !== "string" || !value.startsWith("{") || !value.endsWith("}")) return [];
  const values = [];
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
      values.push(token);
      token = "";
    } else {
      token += character;
    }
  }
  values.push(token);
  return values;
}

function truthy(value) {
  return value === true || value === "true" || value === "t";
}

function exactNames(actual, expected) {
  const left = [...actual].sort();
  const right = [...expected].sort();
  return JSON.stringify(left) === JSON.stringify(right);
}

function sqlNames(values) {
  return values.map((value) => `'${value.replaceAll("'", "''")}'`).join(",");
}

async function baselineReadback() {
  const rows = await managementQuery(`
    select
      array(
        select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and c.relname in (
          'partner_records','partner_users','screening_sessions',
          'consumer_briefcase_items','packet_render_jobs','packet_credit_ledger'
        ) order by c.relname
      ) as tables,
      array(
        select column_name from information_schema.columns
        where table_schema='public' and table_name='consumer_briefcase_items'
          and column_name in ('payment_product_id','payment_person_id','payment_matter_id')
        order by column_name
      ) as payment_columns,
      array(
        select distinct p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname='public' and p.proname in (
          'expungement_packet_product_id','consumer_matter_id_for_briefcase_item',
          'consumer_packet_payment_authority','record_consumer_packet_payment',
          'enqueue_packet_render_job','finalize_packet_render_job'
        ) order by p.proname
      ) as functions,
      not exists(
        select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname='public' and p.proname='enqueue_packet_render_job' and p.pronargs=13
      ) as legacy_enqueue_absent,
      exists(
        select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and c.relname='packet_render_jobs' and c.relrowsecurity
      ) as render_jobs_rls
  `, "baseline_phases_49_55_readback_passed");
  const row = Array.isArray(rows) ? rows[0] ?? {} : {};
  const tables = postgresArray(row.tables);
  const paymentColumns = postgresArray(row.payment_columns);
  const functions = postgresArray(row.functions);
  const passed = tables.length === 6
    && paymentColumns.length === 3
    && functions.length === 6
    && truthy(row.legacy_enqueue_absent)
    && truthy(row.render_jobs_rls);
  return { passed, tableCount: tables.length, paymentColumnCount: paymentColumns.length, functionCount: functions.length };
}

async function clinicReadback() {
  const rows = await managementQuery(`
    select
      array(
        select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and c.relkind='r' and c.relname in (${sqlNames(REQUIRED_TABLES)})
        order by c.relname
      ) as tables,
      array(
        select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and c.relkind='r' and c.relrowsecurity
          and c.relname in (${sqlNames(REQUIRED_TABLES)})
        order by c.relname
      ) as rls_tables,
      array(
        select distinct p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
        where n.nspname='public' and p.proname in (${sqlNames(REQUIRED_FUNCTIONS)})
        order by p.proname
      ) as functions,
      (select count(*)::int from pg_trigger t join pg_class c on c.oid=t.tgrelid
        join pg_namespace n on n.oid=c.relnamespace
        where n.nspname='public' and not t.tgisinternal
          and t.tgname in ('clinic_event_audit_append_only','clinic_access_redemptions_append_only')) as append_only_triggers
  `, "clinic_catalog_direct_readback");
  const row = Array.isArray(rows) ? rows[0] ?? {} : {};
  return {
    tables: postgresArray(row.tables),
    rlsTables: postgresArray(row.rls_tables),
    functions: postgresArray(row.functions),
    appendOnlyTriggers: Number(row.append_only_triggers ?? 0)
  };
}

try {
  if (PHASE !== "clinic_migrate") throw new Error("only the exact Production Clinic migration phase is enabled");
  if (INPUT_APPLICATION_SHA !== APPLICATION_SHA
    || INPUT_PROJECT_REF !== PRODUCTION_PROJECT_REF
    || !SUPABASE_ACCESS_TOKEN) {
    throw new Error("exact Production Clinic inputs are unavailable");
  }

  const project = await managementGet(`/v1/projects/${encodeURIComponent(PRODUCTION_PROJECT_REF)}`);
  record(
    "canonical_production_project_is_authenticated",
    project.status === 200 && (project.json?.ref ?? project.json?.id) === PRODUCTION_PROJECT_REF,
    `authenticated project ref=${project.json?.ref ?? project.json?.id ?? "unresolved"}`
  );

  const loaded = MIGRATIONS.map((migration, index) => {
    if (migration.position !== index + 1) throw new Error("migration order mismatch");
    return frozenMigration(migration);
  });
  record(
    "frozen_candidate_migration_hashes_and_order_exact",
    loaded.length === 3,
    "3/3 migration files match the authorized SHA-256 values in exact order"
  );

  const baseline = await baselineReadback();
  record(
    "baseline_phases_49_55_readback_passed",
    baseline.passed,
    `tables=${baseline.tableCount}/6; payment columns=${baseline.paymentColumnCount}/3; functions=${baseline.functionCount}/6`
  );

  const before = await clinicReadback();
  const empty = before.tables.length === 0 && before.rlsTables.length === 0 && before.functions.length === 0;
  const complete = exactNames(before.tables, REQUIRED_TABLES)
    && exactNames(before.rlsTables, REQUIRED_TABLES)
    && exactNames(before.functions, REQUIRED_FUNCTIONS)
    && before.appendOnlyTriggers === 2;
  record(
    "clinic_schema_initial_state_is_empty_or_complete",
    empty || complete,
    `empty=${empty}; complete=${complete}; tables=${before.tables.length}; RLS=${before.rlsTables.length}; functions=${before.functions.length}`
  );

  if (empty) {
    for (const migration of loaded) {
      await managementQuery(migration.sql, `clinic_migration_${migration.position}_applied`);
    }
    evidence.migrationApplied = true;
    evidence.productionDatabaseMutated = true;
    evidence.migrationDisposition = "applied_exact_three_file_sequence";
  } else {
    evidence.migrationDisposition = "preexisting_complete_structural_readback";
  }
  record(
    "clinic_migrations_applied_in_exact_order",
    evidence.migrationApplied || complete,
    evidence.migrationDisposition
  );

  const after = await clinicReadback();
  const tablesAndRlsExact = exactNames(after.tables, REQUIRED_TABLES)
    && exactNames(after.rlsTables, REQUIRED_TABLES);
  const functionsExact = exactNames(after.functions, REQUIRED_FUNCTIONS);
  record(
    "all_10_clinic_tables_exist_with_rls_enabled",
    tablesAndRlsExact,
    `tables=${after.tables.length}/10; RLS=${after.rlsTables.length}/10`
  );
  record(
    "all_22_clinic_functions_exist",
    functionsExact && after.appendOnlyTriggers === 2,
    `functions=${after.functions.length}/22; append-only triggers=${after.appendOnlyTriggers}/2`
  );

  evidence.readback = {
    baselinePhases49Through55: baseline.passed,
    clinicTableCount: after.tables.length,
    clinicRlsTableCount: after.rlsTables.length,
    clinicFunctionCount: after.functions.length,
    appendOnlyTriggerCount: after.appendOnlyTriggers,
    exact: tablesAndRlsExact && functionsExact && after.appendOnlyTriggers === 2
  };
  persist(true);
  console.log("PRODUCTION CLINIC MIGRATE PASS — exact frozen Clinic sequence and direct readback are complete");
} catch (error) {
  const failure = error instanceof Error ? error.message : String(error);
  persist(false, failure);
  console.error(`PRODUCTION CLINIC MIGRATE REFUSED — ${failure}`);
  process.exit(1);
}
