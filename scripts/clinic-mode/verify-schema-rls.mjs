import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
// Import the package's stable CJS entry directly so focused verification can
// run in sprint worktrees whose interrupted npm extraction omitted the package
// metadata file. A complete `npm ci` installs this same entrypoint.
import { PGlite } from "../../node_modules/@electric-sql/pglite/dist/index.cjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const migrationPaths = [
  "supabase/migrations/20260825120000_clinic_mode_core.sql",
  "supabase/migrations/20260825121000_clinic_mode_security.sql"
];
const tableNames = [
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
];
const functionNames = [
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
  "clinic_release_packet_credit"
];
const ids = {
  internal: "10000000-0000-4000-8000-000000000001",
  adminA: "10000000-0000-4000-8000-000000000002",
  staffA: "10000000-0000-4000-8000-000000000003",
  adminB: "10000000-0000-4000-8000-000000000004",
  participantA: "10000000-0000-4000-8000-000000000005",
  participantB: "10000000-0000-4000-8000-000000000006",
  eventA: "20000000-0000-4000-8000-000000000001",
  eventB: "20000000-0000-4000-8000-000000000002",
  eventStaffA: "30000000-0000-4000-8000-000000000001",
  screeningA: "40000000-0000-4000-8000-000000000001",
  matterA: "50000000-0000-4000-8000-000000000001",
  renderA: "60000000-0000-4000-8000-000000000001",
  ledgerA: "70000000-0000-4000-8000-000000000001"
};

const migrations = migrationPaths.map(read);
verifySource(migrations.join("\n"));

const db = new PGlite();
try {
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls;");
  await db.exec(authAndDependencyStubs());
  await db.exec(migrations.join("\n"));
  await seed(db);
  await verifyRlsAndPrivileges(db);
  await verifyTenantAndParticipantIsolation(db);
  await verifyMutationBoundary(db);
  await verifyAccountingIdempotency(db);
} finally {
  await db.close();
}

console.log("Clinic Mode schema/RLS: isolated migration and mutation suite passed.");
console.log("Production/external databases used: none.");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function verifySource(source) {
  for (const table of tableNames) {
    assert.match(source, new RegExp(`create table(?: if not exists)? public\\.${table}`, "iu"), `${table} table missing`);
    assert.match(source, new RegExp(`alter table public\\.${table} enable row level security`, "iu"), `${table} RLS missing`);
    assert.match(source, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated`, "iu"), `${table} browser mutation revoke missing`);
  }
  for (const fn of functionNames) {
    assert.match(source, new RegExp(`create or replace function public\\.${fn}\\(`, "iu"), `${fn} missing`);
  }
  assert.ok(!/alter\s+table\s+public\.(?!clinic_)/iu.test(stripComments(source)), "Clinic migrations must not alter non-Clinic tables");
  assert.ok(!/drop\s+(table|column)/iu.test(stripComments(source)), "Clinic migrations must be additive");
  assert.match(source, /grant select on public\.clinic_events[\s\S]*?to authenticated/iu);
  assert.match(source, /revoke all on function public\.clinic_reserve_packet_credit/iu);
  assert.match(source, /grant execute on function public\.clinic_reserve_packet_credit[\s\S]*?to service_role/iu);
  for (const forbidden of ["user_metadata", "app_metadata", "current_setting('request.jwt.claims", "email like", "@legalease"]) {
    assert.ok(!source.toLowerCase().includes(forbidden), `forbidden identity authority: ${forbidden}`);
  }
}

async function verifyRlsAndPrivileges(db) {
  for (const table of tableNames) {
    assert.equal(await scalar(db, `select relrowsecurity from pg_class where oid='public.${table}'::regclass`), true, `${table} must enforce RLS`);
    assert.equal(await scalar(db, `select has_table_privilege('authenticated','public.${table}','INSERT')`), false, `${table} authenticated INSERT leaked`);
    assert.equal(await scalar(db, `select has_table_privilege('authenticated','public.${table}','UPDATE')`), false, `${table} authenticated UPDATE leaked`);
    assert.equal(await scalar(db, `select has_table_privilege('authenticated','public.${table}','DELETE')`), false, `${table} authenticated DELETE leaked`);
  }
  for (const fn of functionNames) {
    const definition = await scalar(db, `select pg_get_functiondef(p.oid) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='${fn}' limit 1`);
    assert.ok(definition?.includes("SET search_path TO ''"), `${fn} must pin search_path`);
  }
}

async function verifyTenantAndParticipantIsolation(db) {
  assert.deepEqual(await idsVisibleAs(db, ids.adminA, "select id from public.clinic_events order by id"), [ids.eventA]);
  assert.deepEqual(await idsVisibleAs(db, ids.adminB, "select id from public.clinic_events order by id"), [ids.eventB]);
  assert.deepEqual(await idsVisibleAs(db, ids.staffA, "select id from public.clinic_events order by id"), [ids.eventA]);
  assert.deepEqual(await idsVisibleAs(db, ids.internal, "select id from public.clinic_events order by id"), [ids.eventA, ids.eventB]);
  assert.equal((await asUser(db, ids.participantA, "select participant_user_id from public.clinic_cases"))[0]?.participant_user_id, ids.participantA);
  assert.equal((await asUser(db, ids.participantB, "select count(*)::int as count from public.clinic_cases"))[0]?.count, 0);
  assert.equal((await asUser(db, ids.participantA, "select count(*)::int as count from public.clinic_event_access_codes"))[0]?.count, 0, "participant read code hashes");
}

async function verifyMutationBoundary(db) {
  await assertDenied(db, ids.staffA, `update public.clinic_events set status='closed' where id='${ids.eventA}'`, "staff directly changed event state");
  await assertDenied(db, ids.staffA, `insert into public.clinic_packet_reservations (event_id, clinic_case_id, render_job_id, participant_user_id, status) values ('${ids.eventA}', (select id from public.clinic_cases limit 1), '${ids.renderA}', '${ids.participantA}', 'reserved')`, "staff wrote packet accounting");
  await assertDenied(db, ids.participantA, `update public.clinic_cases set participant_user_id='${ids.participantB}'`, "participant reassigned matter ownership");
}

async function verifyAccountingIdempotency(db) {
  const caseId = await scalar(db, `select id from public.clinic_cases where event_id='${ids.eventA}'`);
  const first = await serviceCall(db, `select * from public.clinic_reserve_packet_credit('${caseId}','${ids.renderA}')`, true);
  assert.equal(first[0]?.outcome, "reserved");
  const replay = await serviceCall(db, `select * from public.clinic_reserve_packet_credit('${caseId}','${ids.renderA}')`);
  assert.equal(replay[0]?.outcome, "already_reserved");
  assert.equal(first[0]?.reservation_id, replay[0]?.reservation_id);
  assert.equal(await scalar(db, `select count(*)::int from public.clinic_packet_reservations where clinic_case_id='${caseId}'`), 1);

  const premature = await serviceCall(db, `select * from public.clinic_finalize_packet_credit('${ids.renderA}')`);
  assert.equal(premature[0]?.outcome, "artifact_not_validated");
  await db.exec(`update public.packet_render_jobs set status='artifact_validated', accounting_result='consumed', credit_ledger_id='${ids.ledgerA}' where id='${ids.renderA}'`);
  const finalized = await serviceCall(db, `select * from public.clinic_finalize_packet_credit('${ids.renderA}')`, true);
  assert.equal(finalized[0]?.outcome, "consumed");
  const finalizedReplay = await serviceCall(db, `select * from public.clinic_finalize_packet_credit('${ids.renderA}')`);
  assert.equal(finalizedReplay[0]?.outcome, "already_consumed");

  const noCreditCase = await scalar(db, `insert into public.clinic_cases (event_id, participant_user_id, queue_status, route_disposition, jurisdiction) values ('${ids.eventA}','${ids.participantB}','referred','referral','WI') returning id`);
  const noCredit = await serviceCall(db, `select * from public.clinic_reserve_packet_credit('${noCreditCase}', gen_random_uuid())`, true);
  assert.equal(noCredit[0]?.outcome, "no_credit_route");
}

async function seed(db) {
  await db.exec(`
    insert into auth.users(id) values ('${ids.internal}'),('${ids.adminA}'),('${ids.staffA}'),('${ids.adminB}'),('${ids.participantA}'),('${ids.participantB}');
    insert into public.partner_records(id, partner_slug) values
      ('80000000-0000-4000-8000-000000000001','tenant-a'),
      ('80000000-0000-4000-8000-000000000002','tenant-b');
    insert into public.partner_users(id, auth_user_id, partner_slug, role, status) values
      ('90000000-0000-4000-8000-000000000001','${ids.internal}',null,'internal_admin','active'),
      ('90000000-0000-4000-8000-000000000002','${ids.adminA}','tenant-a','partner_admin','active'),
      ('90000000-0000-4000-8000-000000000003','${ids.staffA}','tenant-a','partner_staff','active'),
      ('90000000-0000-4000-8000-000000000004','${ids.adminB}','tenant-b','partner_admin','active');
    insert into public.clinic_events(id, partner_slug, public_slug, name, starts_at, ends_at, timezone, location_name, geography, capacity, status, created_by) values
      ('${ids.eventA}','tenant-a','tenant-a-clinic','Tenant A clinic','2026-09-01T13:00:00Z','2026-09-01T20:00:00Z','America/New_York','Library','CO',100,'published','${ids.adminA}'),
      ('${ids.eventB}','tenant-b','tenant-b-clinic','Tenant B clinic','2026-09-02T13:00:00Z','2026-09-02T20:00:00Z','America/Chicago','Center','MS',100,'published','${ids.adminB}');
    insert into public.clinic_event_staff(id, event_id, partner_user_id, approved_by, status) values
      ('${ids.eventStaffA}','${ids.eventA}','90000000-0000-4000-8000-000000000003','${ids.adminA}','approved');
    insert into public.screening_sessions(session_id) values ('${ids.screeningA}');
    insert into public.consumer_briefcase_items(id,user_id) values ('${ids.matterA}','${ids.participantA}');
    insert into public.clinic_cases(event_id, participant_user_id, screening_session_id, matter_id, queue_status, route_disposition, jurisdiction) values
      ('${ids.eventA}','${ids.participantA}','${ids.screeningA}','${ids.matterA}','packet_ready','packet','CO');
    insert into public.packet_credit_ledger(id) values ('${ids.ledgerA}');
    insert into public.packet_render_jobs(id, status, accounting_result) values ('${ids.renderA}','validating',null);
  `);
}

function authAndDependencyStubs() {
  return `
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    create table public.partner_records(id uuid primary key, partner_slug text unique not null);
    create table public.partner_users(id uuid primary key, auth_user_id uuid unique not null references auth.users(id), partner_slug text references public.partner_records(partner_slug), role text not null, status text not null);
    create table public.screening_sessions(session_id uuid primary key);
    create table public.consumer_briefcase_items(id uuid primary key, user_id uuid not null references auth.users(id));
    create table public.packet_credit_ledger(id uuid primary key);
    create table public.packet_render_jobs(id uuid primary key, status text not null, accounting_result text, credit_ledger_id uuid references public.packet_credit_ledger(id));
    grant usage on schema public to anon, authenticated, service_role;
    grant usage on schema auth to anon, authenticated, service_role;
    grant select on auth.users, public.partner_records, public.partner_users, public.screening_sessions, public.consumer_briefcase_items, public.packet_render_jobs, public.packet_credit_ledger to service_role;
  `;
}

async function idsVisibleAs(db, userId, sql) {
  return (await asUser(db, userId, sql)).map((row) => row.id);
}

async function asUser(db, userId, sql) {
  return asRole(db, "authenticated", userId, sql);
}

async function serviceCall(db, sql, commit = false) {
  return asRole(db, "service_role", null, sql, commit);
}

async function asRole(db, role, userId, sql, commit = false) {
  await db.exec("begin");
  try {
    await db.exec(`set local role ${role}`);
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? ""]);
    const result = await db.query(sql);
    await db.exec(commit ? "commit" : "rollback");
    return result.rows;
  } catch (error) {
    await db.exec("rollback");
    throw error;
  }
}

async function assertDenied(db, userId, sql, message) {
  await assert.rejects(() => asUser(db, userId, sql), undefined, message);
}

async function scalar(db, sql) {
  const result = await db.query(sql);
  const row = result.rows[0];
  return row ? Object.values(row)[0] : undefined;
}

function stripComments(sql) {
  return sql.replace(/--.*$/gmu, "").replace(/\/\*[\s\S]*?\*\//gu, "");
}
