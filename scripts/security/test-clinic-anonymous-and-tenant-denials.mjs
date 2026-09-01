/**
 * Executed denial matrix for the Clinic database boundary.
 *
 * The existing schema verifier asserts the anonymous revokes by reading the
 * migration text. Text is not a runtime proof: this suite applies the real
 * Clinic migrations into an isolated PGlite database and then actually connects
 * as `anon`, as the wrong tenant, as the wrong role and as the wrong event's
 * staff, requiring a denial or an empty result from each.
 *
 * No production or external database is contacted.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (relative) => fs.readFileSync(path.join(root, relative), "utf8");

const migrationPaths = [
  "supabase/migrations/20260825120000_clinic_mode_core.sql",
  "supabase/migrations/20260825121000_clinic_mode_security.sql",
  "supabase/migrations/20260825122000_clinic_mode_accounting_reporting.sql"
];
const migrations = migrationPaths.map(read);
const securitySource = migrations[1];
// The accounting/reporting migration drops and replaces the assisted-session
// read policy, so that file -- not the security migration -- carries the
// effective participant-ownership rule.
const effectiveSessionPolicySource = migrations[2];
const EFFECTIVE_SESSION_POLICY = `create policy clinic_assisted_sessions_scoped_read on public.clinic_assisted_sessions
for select to authenticated using (
  public.clinic_is_internal_admin()
  or (
    status in ('active','handed_off') and expires_at > now()
    and (
      participant_user_id = auth.uid()
      or public.clinic_is_event_staff(event_id,'assist')
    )
  )
);`;

const clinicTables = [
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
const helperFunctions = [
  "clinic_current_partner_slug",
  "clinic_current_role",
  "clinic_is_internal_admin",
  "clinic_can_read_event",
  "clinic_is_event_staff"
];

const ids = {
  internal: "a0000000-0000-4000-8000-000000000001",
  adminA: "a0000000-0000-4000-8000-000000000002",
  staffA: "a0000000-0000-4000-8000-000000000003",
  staffAAssistOnly: "a0000000-0000-4000-8000-000000000004",
  unapprovedA: "a0000000-0000-4000-8000-000000000005",
  adminB: "a0000000-0000-4000-8000-000000000006",
  staffB: "a0000000-0000-4000-8000-000000000007",
  participantA: "a0000000-0000-4000-8000-000000000008",
  participantB: "a0000000-0000-4000-8000-000000000009",
  eventA: "b0000000-0000-4000-8000-000000000001",
  eventA2: "b0000000-0000-4000-8000-000000000002",
  eventB: "b0000000-0000-4000-8000-000000000003",
  staffRowA: "c0000000-0000-4000-8000-000000000001",
  staffRowAAssistOnly: "c0000000-0000-4000-8000-000000000002",
  staffRowB: "c0000000-0000-4000-8000-000000000003",
  screeningA: "d0000000-0000-4000-8000-000000000001",
  screeningB: "d0000000-0000-4000-8000-000000000002",
  screeningA2: "d0000000-0000-4000-8000-000000000003",
  matterA: "e0000000-0000-4000-8000-000000000001",
  matterB: "e0000000-0000-4000-8000-000000000002",
  assistedA: "f0000000-0000-4000-8000-000000000001",
  assistedB: "f0000000-0000-4000-8000-000000000002",
  assistedExpired: "f0000000-0000-4000-8000-000000000003",
  assistedRevoked: "f0000000-0000-4000-8000-000000000004"
};

verifySecuritySource();
assert.throws(
  () => verifySecuritySource(securitySource, effectiveSessionPolicySource.replace(EFFECTIVE_SESSION_POLICY, "")),
  undefined,
  "removing the effective assisted-session policy must make this verifier fail"
);
for (const [label, marker, replacement] of [
  ["anonymous table revoke", "revoke all on table public.clinic_cases from public, anon, authenticated;", ""],
  ["tenant scope on event reads", "using (public.clinic_can_read_event(id));", "using (true);"],
  ["assisting-staff tenant agreement", "and pu.partner_slug = ce.partner_slug", ""]
]) {
  assert.ok(securitySource.includes(marker), `mutation fixture missing for ${label}`);
  assert.throws(() => verifySecuritySource(securitySource.replace(marker, replacement)), undefined,
    `${label} mutation must make this verifier fail`);
}

const db = new PGlite();
try {
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls;");
  await db.exec(dependencyStubs());
  for (const migration of migrations) await db.exec(migration);
  await seed(db);

  await verifyAnonymousDenied(db);
  await verifyCrossTenantDenied(db);
  await verifyWrongRoleDenied(db);
  await verifyCrossEventDenied(db);
  await verifyWrongUserAndMatterDenied(db);
  await verifyConsentLifecycleDenied(db);
  await verifyPrivateObjectsDenied(db);
  await verifyLegitimateAccessPreserved(db);
} finally {
  await db.close();
}

// A source reader can be satisfied by text alone. Re-apply the migrations with
// the participant-ownership policy loosened and require the *executed* checks
// above to reject the result.
await verifyRuntimeMutationIsCaught();

console.log(`Clinic database denials passed: anonymous denied on ${clinicTables.length} tables and ${helperFunctions.length} authorization helpers at runtime; cross-tenant, cross-event, wrong-role, wrong-user, wrong-matter, expired consent, revoked consent and private-object access all denied.`);
console.log("Production/external databases used: none.");

function verifySecuritySource(source = securitySource, effectiveSource = effectiveSessionPolicySource) {
  for (const table of clinicTables) {
    assert.match(source, new RegExp(`alter table public\\.${table} enable row level security`, "u"),
      `${table} must enforce row level security`);
    assert.match(source, new RegExp(`revoke all on table public\\.${table} from public, anon, authenticated`, "u"),
      `${table} must revoke anonymous and browser-client access`);
  }
  assert.ok(effectiveSource.includes(EFFECTIVE_SESSION_POLICY),
    "the effective assisted-session policy must scope reads to the owning participant, an assisting staff member or an internal administrator, and only while consent is live");
  assert.ok(source.includes("using (public.clinic_can_read_event(id));"),
    "event reads must stay scoped to the owning tenant");
  assert.ok(source.includes("and pu.partner_slug = ce.partner_slug"),
    "event staff must belong to the tenant that owns the event");
}

async function verifyAnonymousDenied(db) {
  for (const table of clinicTables) {
    await assertDenied(db, "anon", null, `select * from public.${table}`,
      `anonymous caller read public.${table}`);
    await assertDenied(db, "anon", null, `select count(*) from public.${table}`,
      `anonymous caller counted public.${table}`);
  }
  for (const fn of helperFunctions) {
    const call = fn === "clinic_can_read_event"
      ? `select public.clinic_can_read_event('${ids.eventA}')`
      : fn === "clinic_is_event_staff"
        ? `select public.clinic_is_event_staff('${ids.eventA}', 'queue')`
        : `select public.${fn}()`;
    await assertDenied(db, "anon", null, call, `anonymous caller executed public.${fn}`);
  }
  // Forging a JWT subject claim without an authenticated role changes nothing.
  await assertDenied(db, "anon", ids.adminA, `select * from public.clinic_events`,
    "anonymous caller with a forged subject claim read Clinic events");
}

async function verifyCrossTenantDenied(db) {
  for (const [actor, label] of [[ids.adminB, "tenant-B administrator"], [ids.staffB, "tenant-B staff"]]) {
    assert.equal(await countAs(db, actor, `select id from public.clinic_events where id='${ids.eventA}'`), 0, `${label} read tenant-A's event`);
    assert.equal(await countAs(db, actor, `select id from public.clinic_event_staff where event_id='${ids.eventA}'`), 0, `${label} read tenant-A's staff roster`);
    assert.equal(await countAs(db, actor, `select id from public.clinic_event_access_codes where event_id='${ids.eventA}'`), 0, `${label} read tenant-A's access codes`);
    assert.equal(await countAs(db, actor, `select id from public.clinic_event_access_redemptions where event_id='${ids.eventA}'`), 0, `${label} read tenant-A's redemptions`);
    assert.equal(await countAs(db, actor, `select id from public.clinic_assisted_sessions where event_id='${ids.eventA}'`), 0, `${label} read tenant-A's assisted sessions`);
    assert.equal(await countAs(db, actor, `select id from public.clinic_cases where event_id='${ids.eventA}'`), 0, `${label} read tenant-A's matters`);
    assert.equal(await countAs(db, actor, `select id from public.clinic_follow_ups where event_id='${ids.eventA}'`), 0, `${label} read tenant-A's follow-ups`);
    assert.equal(await countAs(db, actor, `select id from public.clinic_incidents where event_id='${ids.eventA}'`), 0, `${label} read tenant-A's incidents`);
    assert.equal(await countAs(db, actor, `select id from public.clinic_event_audit where event_id='${ids.eventA}'`), 0, `${label} read tenant-A's audit trail`);
    assert.equal(await countAs(db, actor, `select id from public.clinic_packet_reservations where event_id='${ids.eventA}'`), 0, `${label} read tenant-A's packet accounting`);
    assert.equal(await scalarAs(db, actor, `select public.clinic_can_read_event('${ids.eventA}')`), false, `${label} was authorized for tenant-A's event`);
    assert.equal(await scalarAs(db, actor, `select public.clinic_is_event_staff('${ids.eventA}','queue')`), false, `${label} was accepted as tenant-A event staff`);
  }
}

async function verifyWrongRoleDenied(db) {
  // Active tenant-A partner_staff who was never approved onto the event.
  assert.equal(await scalarAs(db, ids.unapprovedA, `select public.clinic_is_event_staff('${ids.eventA}','queue')`), false,
    "unapproved tenant staff was accepted as event staff");
  assert.equal(await countAs(db, ids.unapprovedA, `select id from public.clinic_cases where event_id='${ids.eventA}'`), 0,
    "unapproved tenant staff read the event queue");
  assert.equal(await countAs(db, ids.unapprovedA, `select id from public.clinic_event_access_codes where event_id='${ids.eventA}'`), 0,
    "partner_staff read event access codes");
  assert.equal(await countAs(db, ids.unapprovedA, `select id from public.clinic_event_audit where event_id='${ids.eventA}'`), 0,
    "partner_staff read the event audit trail");

  // Approved with 'assist' only: no queue, follow-up, incident or reporting reach.
  assert.equal(await scalarAs(db, ids.staffAAssistOnly, `select public.clinic_is_event_staff('${ids.eventA}','queue')`), false,
    "assist-only staff was granted queue permission");
  assert.equal(await scalarAs(db, ids.staffAAssistOnly, `select public.clinic_is_event_staff('${ids.eventA}','follow_up')`), false,
    "assist-only staff was granted follow-up permission");
  assert.equal(await countAs(db, ids.staffAAssistOnly, `select id from public.clinic_follow_ups where event_id='${ids.eventA}'`), 0,
    "assist-only staff read event follow-ups");
  assert.equal(await countAs(db, ids.staffAAssistOnly, `select id from public.clinic_incidents where event_id='${ids.eventA}'`), 0,
    "assist-only staff read event incidents");

  // Participants never reach staff surfaces.
  assert.equal(await countAs(db, ids.participantA, `select id from public.clinic_follow_ups`), 0, "participant read staff follow-ups");
  assert.equal(await countAs(db, ids.participantA, `select id from public.clinic_incidents`), 0, "participant read incident records");
  assert.equal(await countAs(db, ids.participantA, `select id from public.clinic_event_audit`), 0, "participant read the audit trail");
  assert.equal(await countAs(db, ids.participantA, `select id from public.clinic_packet_reservations`), 0, "participant read packet accounting");
}

async function verifyCrossEventDenied(db) {
  // Staff approved on event A hold no authority over sibling event A2 in the
  // same tenant: approval is per event, not per tenant.
  assert.equal(await scalarAs(db, ids.staffA, `select public.clinic_is_event_staff('${ids.eventA2}','queue')`), false,
    "event-A staff was accepted as event-A2 staff");
  assert.equal(await countAs(db, ids.staffA, `select id from public.clinic_follow_ups where event_id='${ids.eventA2}'`), 0,
    "event-A staff read event-A2 follow-ups");
  assert.equal(await countAs(db, ids.staffA, `select id from public.clinic_incidents where event_id='${ids.eventA2}'`), 0,
    "event-A staff read event-A2 incidents");
  assert.equal(await countAs(db, ids.staffA, `select id from public.clinic_cases where event_id='${ids.eventB}'`), 0,
    "event-A staff read another tenant's event queue");
}

async function verifyWrongUserAndMatterDenied(db) {
  assert.equal(await countAs(db, ids.participantB, `select id from public.clinic_assisted_sessions where participant_user_id='${ids.participantA}'`), 0,
    "participant B read participant A's assisted session");
  assert.equal(await countAs(db, ids.participantB, `select id from public.clinic_cases where participant_user_id='${ids.participantA}'`), 0,
    "participant B read participant A's matter");
  const ownMatters = await asRole(db, "authenticated", ids.participantA, "select screening_session_id from public.clinic_cases");
  assert.deepEqual(ownMatters.map((row) => row.screening_session_id), [ids.screeningA],
    "participant A's matter view was not confined to their own matter");
  await assertDenied(db, "authenticated", ids.participantA,
    `update public.clinic_cases set participant_user_id='${ids.participantB}'`,
    "participant reassigned matter ownership");
  await assertDenied(db, "authenticated", ids.participantA,
    `insert into public.clinic_cases (event_id, participant_user_id, screening_session_id, jurisdiction) values ('${ids.eventA}','${ids.participantA}','${ids.screeningA2}','CO')`,
    "participant created a matter directly");
}

async function verifyConsentLifecycleDenied(db) {
  // Consent is not a one-time gate: the effective policy withdraws the record
  // the moment consent expires or is revoked, for the owning participant and
  // the assisting staff member alike.
  for (const [actor, label] of [[ids.participantA, "owning participant"], [ids.staffA, "assisting staff"]]) {
    assert.equal(
      await countAs(db, actor, `select id from public.clinic_assisted_sessions where id='${ids.assistedExpired}'`),
      0,
      `${label} read an assisted session whose consent had expired`
    );
    assert.equal(
      await countAs(db, actor, `select id from public.clinic_assisted_sessions where id='${ids.assistedRevoked}'`),
      0,
      `${label} read an assisted session whose consent had been revoked`
    );
  }
  assert.equal(
    await countAs(db, ids.participantA, "select id from public.clinic_assisted_sessions"),
    1,
    "expired and revoked assisted sessions remained visible alongside the live one"
  );
}

async function verifyPrivateObjectsDenied(db) {
  // Handoff and access-code secrets are stored hashed and must never be
  // readable by the participants or staff who present them.
  assert.equal(await countAs(db, ids.participantA, "select id from public.clinic_event_access_codes"), 0,
    "participant read event access-code hashes");
  assert.equal(await countAs(db, ids.staffA, "select id from public.clinic_event_access_codes"), 0,
    "event staff read event access-code hashes");
  assert.equal(await countAs(db, ids.staffA, "select id from public.clinic_event_access_redemptions"), 0,
    "event staff read entry redemption nonces");
  for (const table of clinicTables) {
    for (const privilege of ["INSERT", "UPDATE", "DELETE"]) {
      assert.equal(await scalar(db, `select has_table_privilege('authenticated','public.${table}','${privilege}')`), false,
        `${table} leaked ${privilege} to browser clients`);
      assert.equal(await scalar(db, `select has_table_privilege('anon','public.${table}','${privilege}')`), false,
        `${table} leaked ${privilege} to anonymous callers`);
    }
    assert.equal(await scalar(db, `select has_table_privilege('anon','public.${table}','SELECT')`), false,
      `${table} leaked SELECT to anonymous callers`);
  }
}

async function verifyLegitimateAccessPreserved(db) {
  // A denial suite that denies everything proves nothing. The owning
  // participant, the approved event staff, the owning tenant administrator and
  // the internal administrator must all retain their intended reach.
  assert.equal(await countAs(db, ids.participantA, "select id from public.clinic_cases"), 1,
    "the owning participant lost their own matter");
  assert.equal(await countAs(db, ids.participantA, "select id from public.clinic_assisted_sessions"), 1,
    "the owning participant lost their own assisted session");
  assert.equal(await countAs(db, ids.staffA, `select id from public.clinic_cases where event_id='${ids.eventA}'`), 1,
    "approved queue staff lost their own event queue");
  assert.equal(await countAs(db, ids.adminA, `select id from public.clinic_events where id='${ids.eventA}'`), 1,
    "the owning tenant administrator lost its own event");
  assert.equal(await countAs(db, ids.adminA, `select id from public.clinic_event_audit where event_id='${ids.eventA}'`), 1,
    "the owning tenant administrator lost its own audit trail");
  assert.equal(await countAs(db, ids.internal, "select id from public.clinic_events"), 3,
    "the internal administrator lost cross-tenant oversight");

  // Attribution and sponsorship stay with the partner without becoming
  // ownership: the tenant administrator sees the matter row for reporting but
  // still cannot take it over or read the participant's handoff secret.
  await assertDenied(db, "authenticated", ids.adminA,
    `update public.clinic_cases set participant_user_id='${ids.adminA}'`,
    "tenant administrator claimed a participant's matter");
  assert.equal(await countAs(db, ids.adminA, "select id from public.clinic_event_access_codes where event_id='" + ids.eventA + "'"), 1,
    "the owning tenant administrator lost its own access-code roster");
  const sponsorship = await asRole(db, "authenticated", ids.adminA,
    `select sponsorship_allocation from public.clinic_events where id='${ids.eventA}'`);
  assert.equal(sponsorship[0]?.sponsorship_allocation, 5, "sponsorship allocation is not visible to the sponsoring tenant");
}

async function verifyRuntimeMutationIsCaught() {
  const loosened = effectiveSessionPolicySource.replace(
    EFFECTIVE_SESSION_POLICY,
    "create policy clinic_assisted_sessions_scoped_read on public.clinic_assisted_sessions for select to authenticated using (true);"
  );
  assert.notEqual(loosened, effectiveSessionPolicySource, "runtime mutation fixture did not apply");
  const mutated = new PGlite();
  let caught = false;
  try {
    await mutated.exec("create role anon; create role authenticated; create role service_role bypassrls;");
    await mutated.exec(dependencyStubs());
    await mutated.exec(migrations[0]);
    await mutated.exec(migrations[1]);
    await mutated.exec(loosened);
    await seed(mutated);
    try {
      await verifyWrongUserAndMatterDenied(mutated);
    } catch {
      caught = true;
    }
  } finally {
    await mutated.close();
  }
  assert.ok(caught, "a loosened participant-ownership policy was not caught by the executed denial checks");
}

async function seed(db) {
  await db.exec(`
    insert into auth.users(id) values
      ('${ids.internal}'),('${ids.adminA}'),('${ids.staffA}'),('${ids.staffAAssistOnly}'),('${ids.unapprovedA}'),
      ('${ids.adminB}'),('${ids.staffB}'),('${ids.participantA}'),('${ids.participantB}');
    insert into public.partner_records(id, partner_slug) values
      ('11111111-0000-4000-8000-000000000001','tenant-a'),
      ('11111111-0000-4000-8000-000000000002','tenant-b');
    insert into public.partner_users(id, auth_user_id, partner_slug, role, status) values
      ('22222222-0000-4000-8000-000000000001','${ids.internal}',null,'internal_admin','active'),
      ('22222222-0000-4000-8000-000000000002','${ids.adminA}','tenant-a','partner_admin','active'),
      ('22222222-0000-4000-8000-000000000003','${ids.staffA}','tenant-a','partner_staff','active'),
      ('22222222-0000-4000-8000-000000000004','${ids.staffAAssistOnly}','tenant-a','partner_staff','active'),
      ('22222222-0000-4000-8000-000000000005','${ids.unapprovedA}','tenant-a','partner_staff','active'),
      ('22222222-0000-4000-8000-000000000006','${ids.adminB}','tenant-b','partner_admin','active'),
      ('22222222-0000-4000-8000-000000000007','${ids.staffB}','tenant-b','partner_staff','active');
    insert into public.clinic_events(id, partner_slug, public_slug, name, starts_at, ends_at, timezone, location_name, geography, capacity, status, sponsorship_allocation, created_by) values
      ('${ids.eventA}','tenant-a','tenant-a-clinic','Tenant A clinic','2026-09-01T13:00:00Z','2026-09-01T20:00:00Z','America/New_York','Library','CO',100,'published',5,'${ids.adminA}'),
      ('${ids.eventA2}','tenant-a','tenant-a-second-clinic','Tenant A second clinic','2026-09-08T13:00:00Z','2026-09-08T20:00:00Z','America/New_York','Annex','CO',100,'published',null,'${ids.adminA}'),
      ('${ids.eventB}','tenant-b','tenant-b-clinic','Tenant B clinic','2026-09-02T13:00:00Z','2026-09-02T20:00:00Z','America/Chicago','Center','MS',100,'published',null,'${ids.adminB}');
    insert into public.clinic_event_staff(id, event_id, partner_user_id, approved_by, status, permissions) values
      ('${ids.staffRowA}','${ids.eventA}','22222222-0000-4000-8000-000000000003','${ids.adminA}','approved',array['assist','queue','follow_up','incident','reporting']),
      ('${ids.staffRowAAssistOnly}','${ids.eventA}','22222222-0000-4000-8000-000000000004','${ids.adminA}','approved',array['assist']),
      ('${ids.staffRowB}','${ids.eventB}','22222222-0000-4000-8000-000000000007','${ids.adminB}','approved',array['assist','queue','follow_up','incident']);
    insert into public.screening_sessions(session_id) values ('${ids.screeningA}'),('${ids.screeningB}'),('${ids.screeningA2}');
    insert into public.consumer_briefcase_items(id,user_id) values
      ('${ids.matterA}','${ids.participantA}'),('${ids.matterB}','${ids.participantB}');
    insert into public.clinic_assisted_sessions(id,event_id,event_staff_id,participant_user_id,screening_session_id,handoff_token_hash,device_nonce_hash,consent_version,consented_at,expires_at) values
      ('${ids.assistedA}','${ids.eventA}','${ids.staffRowA}','${ids.participantA}','${ids.screeningA}',repeat('a',64),repeat('b',64),'synthetic-v1',now(),now()+interval '30 minutes'),
      ('${ids.assistedB}','${ids.eventB}','${ids.staffRowB}','${ids.participantB}','${ids.screeningB}',repeat('c',64),repeat('d',64),'synthetic-v1',now(),now()+interval '30 minutes');
    insert into public.clinic_assisted_sessions(id,event_id,event_staff_id,participant_user_id,screening_session_id,handoff_token_hash,device_nonce_hash,consent_version,consented_at,started_at,expires_at,status,ended_at,ended_reason) values
      ('${ids.assistedExpired}','${ids.eventA}','${ids.staffRowA}','${ids.participantA}',null,repeat('e',64),repeat('f',64),'synthetic-v1',now()-interval '2 hours',now()-interval '2 hours',now()-interval '1 hour','active',null,null),
      ('${ids.assistedRevoked}','${ids.eventA}','${ids.staffRowA}','${ids.participantA}',null,repeat('9',64),repeat('8',64),'synthetic-v1',now()-interval '2 hours',now()-interval '2 hours',now()+interval '1 hour','ended',now(),'participant_request');
    insert into public.clinic_cases(event_id, participant_user_id, assisted_session_id, screening_session_id, matter_id, queue_status, route_disposition, jurisdiction) values
      ('${ids.eventA}','${ids.participantA}','${ids.assistedA}','${ids.screeningA}','${ids.matterA}','in_progress','pending','CO'),
      ('${ids.eventB}','${ids.participantB}','${ids.assistedB}','${ids.screeningB}','${ids.matterB}','in_progress','pending','MS');
    insert into public.clinic_event_access_codes(event_id, code_hash, code_hint, created_by) values
      ('${ids.eventA}',repeat('1',64),'AB12','${ids.adminA}'),
      ('${ids.eventB}',repeat('2',64),'CD34','${ids.adminB}');
    insert into public.clinic_event_access_redemptions(event_id, access_code_id, redemption_nonce_hash)
      select '${ids.eventA}', id, repeat('3',64) from public.clinic_event_access_codes where event_id='${ids.eventA}';
    insert into public.clinic_follow_ups(event_id, clinic_case_id, created_by)
      select '${ids.eventA}', id, '${ids.adminA}' from public.clinic_cases where event_id='${ids.eventA}';
    insert into public.clinic_incidents(event_id, severity, category, summary, reported_by) values
      ('${ids.eventA}','low','device','Synthetic shared-device check','${ids.adminA}');
    insert into public.clinic_event_audit(event_id, actor_user_id, action, target_type, target_id) values
      ('${ids.eventA}','${ids.adminA}','event.published','event','${ids.eventA}');
  `);
}

function dependencyStubs() {
  return `
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true),'')::uuid $$;
    create table public.partner_records(id uuid primary key, partner_slug text unique not null);
    create table public.partner_users(id uuid primary key, auth_user_id uuid unique not null references auth.users(id), partner_slug text references public.partner_records(partner_slug), role text not null, status text not null);
    create table public.screening_sessions(session_id uuid primary key);
    create table public.consumer_briefcase_items(id uuid primary key, user_id uuid not null references auth.users(id));
    create table public.packet_credit_ledger(id uuid primary key);
    create table public.packet_render_jobs(
      id uuid primary key,
      status text not null,
      accounting_result text,
      failure_disposition text,
      credit_ledger_id uuid references public.packet_credit_ledger(id),
      partner_id uuid references public.partner_records(id),
      matter_id uuid,
      consumer_auth_user_id uuid references auth.users(id)
    );
    grant usage on schema public to anon, authenticated, service_role;
    grant usage on schema auth to anon, authenticated, service_role;
    grant select on auth.users, public.partner_records, public.partner_users, public.screening_sessions, public.consumer_briefcase_items, public.packet_render_jobs, public.packet_credit_ledger to service_role;
  `;
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

async function countAs(db, userId, sql) {
  return (await asRole(db, "authenticated", userId, sql)).length;
}

async function scalarAs(db, userId, sql) {
  const rows = await asRole(db, "authenticated", userId, sql);
  return rows[0] ? Object.values(rows[0])[0] : undefined;
}

async function scalar(db, sql) {
  const rows = (await db.query(sql)).rows;
  return rows[0] ? Object.values(rows[0])[0] : undefined;
}

async function assertDenied(db, role, userId, sql, message) {
  await assert.rejects(() => asRole(db, role, userId, sql), undefined, message);
}
