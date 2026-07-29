import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationPath = path.join(
  rootDir,
  "supabase/phase-43-rcap-partner-onboarding-phase1.sql"
);
const migrationSource = fs.readFileSync(migrationPath, "utf8");
const failures = [];

const ids = {
  partnerA: "11111111-1111-4111-8111-111111111111",
  partnerB: "22222222-2222-4222-8222-222222222222",
  partnerC: "33333333-3333-4333-8333-333333333333",
  partnerLive: "44444444-4444-4444-8444-444444444444",
  userA: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  userB: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  userStaff: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
  userInternal: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
  workspaceA: "10000000-0000-4000-8000-000000000001",
  workspaceB: "10000000-0000-4000-8000-000000000002",
  workspaceLive: "10000000-0000-4000-8000-000000000004",
  sectionA: "60000000-0000-4000-8000-000000000001",
  sectionB: "60000000-0000-4000-8000-000000000002",
  changeA: "70000000-0000-4000-8000-000000000001",
  assetA: "50000000-0000-4000-8000-000000000001",
  assetA2: "50000000-0000-4000-8000-000000000002",
  objectA: "90000000-0000-4000-8000-000000000001"
};

const db = new PGlite();

try {
  verifyMigrationSource();
  await preparePostgresStubs();
  await applyMigrations();
  await seedSyntheticTenants();
  await verifySchemaAndGrants();
  await verifyTenantRlsAndRoles();
  await verifyRevisionAndConstraints();
  await verifyChangeRequests();
  await verifyAuthorizationAndIdempotency();
  await verifyActivityAndIntegrationEvents();
  await verifyAssetMetadataAndStorage();
  await verifyServerMutationRpcs();
} catch (error) {
  failures.push(error instanceof Error ? error.stack ?? error.message : String(error));
} finally {
  await db.close();
}

if (failures.length > 0) {
  console.error("RCAP Partner Onboarding Phase 1 database verification failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("RCAP Partner Onboarding Phase 1 database verification passed.");
console.log("1. Phase 43 applies after the existing partner/auth/audit/onboarding migrations.");
console.log("2. Phase 43 performs no partner workspace backfill.");
console.log("3. Two authenticated synthetic tenants are isolated by actual SET ROLE RLS checks.");
console.log("4. Partner staff and anonymous actors cannot mutate onboarding.");
console.log("5. Browser roles cannot directly mutate authoritative onboarding, review, asset, event, or idempotency records.");
console.log("6. Internal notes/object paths are absent from partner-safe projections and column grants.");
console.log("7. Section revisions reject stale writes; uniqueness/idempotency constraints reject duplicates.");
console.log("8. Final authorization identity is revalidated; session email is normalized and timestamped by the database.");
console.log("9. Activity, internal notes, authorizations, and integration events are append-only.");
console.log("10. Service-only RPCs prove transactional creation, CAS saves, review, assets, submission, and retries.");
console.log("11. Private storage paths are immutable-ID scoped; SVG/public bucket access is rejected.");
console.log(
  "PGlite limitation: this proves PostgreSQL DDL, constraints, triggers, grants, and RLS. " +
    "It does not emulate Supabase Storage signed-URL TTLs, Storage API MIME/magic-byte inspection, " +
    "Auth cookies, or upload-orphan compensation in the application service."
);

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function expectRejected(action, message) {
  try {
    await action();
  } catch {
    return;
  }
  throw new Error(message);
}

async function asAuthenticated(userId, action) {
  await db.exec("set role authenticated");
  await db.query(
    "select set_config('request.jwt.claim.sub', $1, false)",
    [userId]
  );
  try {
    return await action();
  } finally {
    await db.exec("reset role");
    await db.query(
      "select set_config('request.jwt.claim.sub', '', false)"
    );
  }
}

async function asAnonymous(action) {
  await db.exec("set role anon");
  try {
    return await action();
  } finally {
    await db.exec("reset role");
  }
}

async function invokeServiceMutation(action) {
  // PGlite does not reproduce Supabase's preconfigured service_role table
  // grants under SET ROLE consistently. The verifier separately proves the
  // exact function/table grants, then invokes transaction logic as DB owner.
  return action();
}

function verifyMigrationSource() {
  const transactionalMutationMarker =
    "-- 10. Transactional server-only Phase 1 mutation functions.";
  const preMutationMigration = migrationSource.slice(
    0,
    migrationSource.indexOf(transactionalMutationMarker)
  );
  assert(
    migrationSource.includes(transactionalMutationMarker) &&
      !/\binsert\s+into\s+public\.partner_onboarding\s*\(/i.test(
        preMutationMigration
      ),
    "Phase 43 must not auto-create or backfill onboarding workspaces outside its explicitly invoked server-only function."
  );
  assert(
    migrationSource.includes(
      "create or replace function public.rcap_service_create_onboarding_workspace"
    ) &&
      migrationSource.includes(
        "grant execute on function public.rcap_service_create_onboarding_workspace"
      ),
    "Workspace creation must be an explicitly invoked service-role-only operation."
  );
  assert(
    migrationSource.includes("security_invoker = true"),
    "Partner-safe views must execute with invoker security."
  );
  assert(
    migrationSource.includes("set search_path = ''"),
    "Database functions must use a fixed empty search_path."
  );

  const definerBlocks = migrationSource.match(
    /create or replace function[\s\S]*?\$\$;[\s\S]*?(?=create|alter|drop|revoke|grant|comment|$)/gi
  ) ?? [];
  const securityDefiners = definerBlocks.filter((block) =>
    /security\s+definer/i.test(block)
  );
  assert(
    securityDefiners.length === 0,
    "Phase 43 must not introduce a SECURITY DEFINER function."
  );
  assert(
    !/\bpublic_url\b/i.test(migrationSource),
    "Private asset schema must not create or return a public URL."
  );
  assert(
    !/create\s+(or\s+replace\s+)?function[^;]+security\s+definer[^;]+returns\s+setof/i.test(
      migrationSource
    ),
    "Phase 43 must not add a broad SECURITY DEFINER data RPC."
  );
}

async function preparePostgresStubs() {
  await db.exec(`
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;

    create schema auth;
    create table auth.users (
      id uuid primary key,
      email text
    );
    create or replace function auth.uid()
    returns uuid
    language sql
    stable
    set search_path = ''
    as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;

    create schema storage;
    create table storage.buckets (
      id text primary key,
      name text not null,
      public boolean not null default false,
      file_size_limit bigint,
      allowed_mime_types text[]
    );
    create table storage.objects (
      id uuid primary key default gen_random_uuid(),
      bucket_id text not null references storage.buckets(id),
      name text not null,
      owner_id uuid,
      metadata jsonb,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      unique (bucket_id, name)
    );
    grant usage on schema storage to anon, authenticated, service_role;
  `);
}

async function applyMigrations() {
  for (const relativePath of [
    "supabase/partner-journey-os.sql",
    "supabase/phase-21-partner-auth-rls-foundation.sql",
    "supabase/phase-28-rcap-record-audit-trail.sql",
    "supabase/phase-35-rcap-partner-entitlement.sql"
  ]) {
    await db.exec(read(relativePath));
  }
  const phase41 = read("supabase/phase-41-rcap-partner-access-codes.sql");
  const accessCodeSection = phase41.indexOf(
    "-- 3. partner_access_codes."
  );
  assert(
    accessCodeSection > 0,
    "Phase 41 prerequisite boundary must be present."
  );
  await db.exec(phase41.slice(0, accessCodeSection));
  await db.exec(read("supabase/phase-42-partner-onboarding.sql"));
  await db.exec(
    read("supabase/phase-43-rcap-partner-onboarding-phase1.sql")
  );
}

async function seedSyntheticTenants() {
  await db.query(
    `insert into public.partner_records
      (id, partner_id, partner_slug, partner_name, program_tier, payment_status,
       qualification_status, provisioning_status)
     values
      ($1, 'partner-a', 'partner-a', 'Partner A', 'implementation', 'paid',
       'qualified', 'ready_for_onboarding'),
      ($2, 'partner-b', 'partner-b', 'Partner B', 'implementation', 'paid',
       'qualified', 'ready_for_onboarding'),
      ($3, 'partner-c', 'partner-c', 'Partner C', 'implementation', 'unpaid',
       'qualified', 'blocked_payment_required')`,
    [ids.partnerA, ids.partnerB, ids.partnerC]
  );
  await db.query(
    `insert into public.partner_entitlement (
       partner_slug, screenings_allowed, screenings_used,
       overage_enabled, pause_at_cap
     ) values
       ('partner-a', 500, 25, true, false),
       ('partner-b', 100, 10, false, true)`
  );

  const noBackfill = await db.query(
    "select count(*)::int as count from public.partner_onboarding"
  );
  assert(
    noBackfill.rows[0].count === 0,
    "Partners created after Phase 43 must not receive automatic workspaces."
  );

  await db.query(
    `insert into auth.users (id, email)
     values
       ($1, 'admin-a@example.test'),
       ($2, 'admin-b@example.test'),
       ($3, 'staff-b@example.test'),
       ($4, 'internal@example.test')`,
    [ids.userA, ids.userB, ids.userStaff, ids.userInternal]
  );
  await db.query(
    `insert into public.partner_users
      (auth_user_id, partner_slug, role, status, invited_email)
     values
       ($1, 'partner-a', 'partner_admin', 'active', 'admin-a@example.test'),
       ($2, 'partner-b', 'partner_admin', 'active', 'admin-b@example.test'),
       ($3, 'partner-b', 'partner_staff', 'active', 'staff-b@example.test'),
       ($4, null, 'internal_admin', 'active', 'internal@example.test')`,
    [ids.userA, ids.userB, ids.userStaff, ids.userInternal]
  );
  await db.query(
    `insert into public.partner_onboarding
      (id, partner_slug, status, commercial_gate_status,
       commercial_gate_evidence_reference, blocker_code,
       next_action_code, next_action_owner)
     values
      ($1, 'partner-a', 'setup_in_progress', 'cleared_by_paid_invoice',
       'synthetic-paid-invoice-a', null,
       'complete_organization_contacts', 'partner'),
      ($2, 'partner-b', 'setup_in_progress', 'cleared_by_approved_purchase_order',
       'synthetic-approved-po-b', null,
       'complete_organization_contacts', 'partner')`,
    [ids.workspaceA, ids.workspaceB]
  );
  await db.query(
    `insert into public.partner_onboarding_sections
      (id, workspace_id, section_key, response_data, status)
     values
      ($1, $2, 'organization_contacts', '{"legal_organization_name":"Partner A"}', 'in_progress'),
      ($3, $4, 'organization_contacts', '{"legal_organization_name":"Partner B"}', 'in_progress')`,
    [ids.sectionA, ids.workspaceA, ids.sectionB, ids.workspaceB]
  );
  await db.query(
    `insert into public.partner_onboarding_tasks
      (partner_slug, task_key, title, owner, notes)
     values
      ('partner-a', 'commercial_review', 'Commercial review', 'legalease', 'internal A note'),
      ('partner-b', 'commercial_review', 'Commercial review', 'legalease', 'internal B note')`
  );
}

async function verifySchemaAndGrants() {
  const expectedTables = [
    "partner_onboarding_sections",
    "partner_onboarding_contacts",
    "partner_onboarding_planned_users",
    "partner_onboarding_report_recipients",
    "partner_onboarding_change_requests",
    "partner_onboarding_change_request_internal_notes",
    "partner_onboarding_assets",
    "partner_onboarding_agreements",
    "partner_onboarding_authorizations",
    "partner_onboarding_activity",
    "partner_onboarding_integration_events",
    "partner_onboarding_idempotency"
  ];
  const found = await db.query(
    `select tablename
     from pg_tables
     where schemaname = 'public' and tablename = any($1::text[])`,
    [expectedTables]
  );
  assert(
    found.rows.length === expectedTables.length,
    "All Phase 1 logical entities must exist."
  );

  const rls = await db.query(
    `select relname
     from pg_class
     where relname = any($1::text[]) and relrowsecurity`,
    [["partner_onboarding", ...expectedTables]]
  );
  assert(
    rls.rows.length === expectedTables.length + 1,
    "RLS must be enabled on every onboarding table."
  );
  const entitlementRls = await db.query(
    `select relrowsecurity
     from pg_class
     where relname = 'partner_entitlement'`
  );
  assert(
    entitlementRls.rows[0]?.relrowsecurity === true,
    "Partner-safe entitlement reads must remain protected by RLS."
  );

  const recipientName = await db.query(
    `select is_nullable
     from information_schema.columns
     where table_schema = 'public'
       and table_name = 'partner_onboarding_report_recipients'
       and column_name = 'name'`
  );
  assert(
    recipientName.rows[0]?.is_nullable === "YES",
    "Report-recipient name must remain optional."
  );

  for (const table of [
    "partner_onboarding",
    "partner_onboarding_sections",
    "partner_onboarding_contacts",
    "partner_onboarding_planned_users",
    "partner_onboarding_report_recipients",
    "partner_onboarding_change_requests",
    "partner_onboarding_change_request_internal_notes",
    "partner_onboarding_assets",
    "partner_onboarding_agreements",
    "partner_onboarding_authorizations",
    "partner_onboarding_activity",
    "partner_onboarding_integration_events",
    "partner_onboarding_idempotency"
  ]) {
    const privileges = await db.query(
      `select
         has_table_privilege('authenticated', $1, 'INSERT') as can_insert,
         has_table_privilege('authenticated', $1, 'UPDATE') as can_update,
         has_table_privilege('authenticated', $1, 'DELETE') as can_delete`,
      [`public.${table}`]
    );
    const row = privileges.rows[0];
    assert(
      row.can_insert === false && row.can_update === false && row.can_delete === false,
      `Authenticated browser sessions must have no direct DML on ${table}.`
    );
  }

  const sensitive = await db.query(
    `select
       has_column_privilege(
         'authenticated', 'public.partner_onboarding', 'internal_notes', 'SELECT'
       ) as workspace_notes,
       has_column_privilege(
         'authenticated', 'public.partner_onboarding', 'internal_billing_notes', 'SELECT'
       ) as billing_notes,
       has_column_privilege(
         'authenticated', 'public.partner_onboarding_tasks', 'notes', 'SELECT'
       ) as task_notes,
       has_column_privilege(
         'authenticated', 'public.partner_onboarding_assets', 'object_path', 'SELECT'
       ) as object_path`
  );
  assert(
    Object.values(sensitive.rows[0]).every((value) => value === false),
    "Authenticated sessions must not have SELECT on internal notes or object paths."
  );
  const entitlementPrivileges = (
    await db.query(
      `select
         has_column_privilege(
           'authenticated', 'public.partner_entitlement',
           'screenings_allowed', 'SELECT'
         ) as safe_capacity,
         has_column_privilege(
           'authenticated', 'public.partner_entitlement',
           'overage_enabled', 'SELECT'
         ) as safe_overage,
         has_column_privilege(
           'authenticated', 'public.partner_entitlement',
           'contract_note', 'SELECT'
         ) as contract_note,
         has_table_privilege(
           'authenticated', 'public.partner_entitlement', 'UPDATE'
         ) as can_update`
    )
  ).rows[0];
  assert(
    entitlementPrivileges.safe_capacity === true &&
      entitlementPrivileges.safe_overage === true &&
      entitlementPrivileges.contract_note === false &&
      entitlementPrivileges.can_update === false,
    "The portal must receive only RLS-scoped partner-safe entitlement columns."
  );

  const agreementViewColumns = await db.query(
    `select column_name
     from information_schema.columns
     where table_schema = 'public'
       and table_name = 'partner_onboarding_agreements_safe'`
  );
  const agreementNames = agreementViewColumns.rows.map((row) => row.column_name);
  assert(
    new Set(agreementNames).size === agreementNames.length &&
      !agreementNames.includes("internal_notes") &&
      !agreementNames.includes("internal_reference"),
    "Agreement safe view must have unique columns and omit internal metadata."
  );
}

async function verifyTenantRlsAndRoles() {
  await asAuthenticated(ids.userA, async () => {
    const workspaces = await db.query(
      "select partner_slug from public.partner_onboarding_workspace_safe order by partner_slug"
    );
    assert(
      workspaces.rows.length === 1 && workspaces.rows[0].partner_slug === "partner-a",
      "Partner A must only read Partner A's workspace."
    );
    const entitlements = await db.query(
      `select partner_slug, screenings_allowed, screenings_used,
              overage_enabled, pause_at_cap
       from public.partner_entitlement`
    );
    assert(
      entitlements.rows.length === 1 &&
        entitlements.rows[0].partner_slug === "partner-a" &&
        entitlements.rows[0].screenings_allowed === 500,
      "Partner A must read only its own safe capacity and overage summary."
    );
    await expectRejected(
      () =>
        db.query(
          "select contract_note from public.partner_entitlement"
        ),
      "Partner sessions must not read entitlement contract notes."
    );

    const ownSections = await db.query(
      "select id from public.partner_onboarding_sections"
    );
    assert(
      ownSections.rows.length === 1 && ownSections.rows[0].id === ids.sectionA,
      "Partner A must only read Partner A's section."
    );

    const tasks = await db.query(
      "select partner_slug from public.partner_onboarding_tasks_safe"
    );
    assert(
      tasks.rows.length === 1 && tasks.rows[0].partner_slug === "partner-a",
      "Partner A must only read Partner A's safe tasks."
    );

    await expectRejected(
      () => db.query("select internal_notes from public.partner_onboarding"),
      "Partner A must not read workspace internal notes."
    );
    await expectRejected(
      () => db.query("select notes from public.partner_onboarding_tasks"),
      "Partner A must not read task internal notes."
    );
    await expectRejected(
      () =>
        db.query(
          `insert into public.partner_onboarding_sections
            (workspace_id, section_key, response_data)
           values ($1, 'program_goals', '{}')`,
          [ids.workspaceA]
        ),
      "Partner A must not directly insert section JSON."
    );
    await expectRejected(
      () =>
        db.query(
          `update public.partner_onboarding
           set commercial_gate_status = 'blocked'
           where id = $1`,
          [ids.workspaceA]
        ),
      "Partner A must not alter commercial truth."
    );
    await expectRejected(
      () =>
        db.query(
          `update public.partner_onboarding
           set status = 'ready_to_launch'
           where id = $1`,
          [ids.workspaceA]
        ),
      "Partner A must not alter workspace state directly."
    );
  });

  await asAuthenticated(ids.userStaff, async () => {
    const workspaces = await db.query(
      "select partner_slug from public.partner_onboarding_workspace_safe"
    );
    assert(
      workspaces.rows.length === 1 && workspaces.rows[0].partner_slug === "partner-b",
      "Partner staff must receive status-only access to their own workspace."
    );
    await expectRejected(
      () =>
        db.query(
          `insert into public.partner_onboarding_sections
            (workspace_id, section_key, response_data)
           values ($1, 'program_goals', '{}')`,
          [ids.workspaceB]
        ),
      "Partner staff must not write onboarding."
    );
  });

  await asAuthenticated(ids.userInternal, async () => {
    const workspaces = await db.query(
      "select partner_slug from public.partner_onboarding_workspace_safe order by partner_slug"
    );
    assert(
      workspaces.rows.length === 2,
      "Internal admin RLS must read both provisioned workspaces."
    );
    await expectRejected(
      () =>
        db.query(
          `update public.partner_onboarding
           set target_launch_date = date '2026-10-01'
           where id = $1`,
          [ids.workspaceA]
        ),
      "Internal browser sessions must use the typed review operation boundary."
    );
  });

  await asAnonymous(async () => {
    await expectRejected(
      () => db.query("select * from public.partner_onboarding_workspace_safe"),
      "Anonymous actors must not read onboarding."
    );
  });
}

async function verifyRevisionAndConstraints() {
  await expectRejected(
    () =>
      db.query(
        `update public.partner_onboarding_sections
         set response_data = '{"legal_organization_name":"stale"}', revision = 1
         where id = $1`,
        [ids.sectionA]
      ),
    "A stale section revision must be rejected."
  );
  await db.query(
    `update public.partner_onboarding_sections
     set response_data = '{"legal_organization_name":"Partner A Updated"}',
         revision = 2
     where id = $1 and revision = 1`,
    [ids.sectionA]
  );
  const staleConditional = await db.query(
    `update public.partner_onboarding_sections
     set response_data = '{}', revision = 2
     where id = $1 and revision = 1
     returning id`,
    [ids.sectionA]
  );
  assert(
    staleConditional.rows.length === 0,
    "A stale expected-revision predicate must overwrite zero rows."
  );

  await expectRejected(
    () =>
      db.query(
        `update public.partner_onboarding
         set completion_percentage = 101
         where id = $1`,
        [ids.workspaceA]
      ),
    "Completion must stay in the 0-100 range."
  );
  await expectRejected(
    () =>
      db.query(
        `update public.partner_onboarding
         set status = 'changes_requested'
         where id = $1`,
        [ids.workspaceA]
      ),
    "Workspace-level changes_requested must not be accepted."
  );

  await db.query(
    `insert into public.partner_onboarding_contacts
      (workspace_id, role, name, title, work_email)
     values ($1, 'executive_sponsor', 'Sponsor A', 'Director', 'sponsor@example.test')`,
    [ids.workspaceA]
  );
  await expectRejected(
    () =>
      db.query(
        `insert into public.partner_onboarding_contacts
          (workspace_id, role, name, title, work_email)
         values ($1, 'executive_sponsor', 'Duplicate', 'Director', 'other@example.test')`,
        [ids.workspaceA]
      ),
    "Only one active contact may own a contact role."
  );
  await db.query(
    `insert into public.partner_onboarding_report_recipients
      (workspace_id, name, work_email)
     values ($1, null, 'reports@example.test')`,
    [ids.workspaceA]
  );
}

async function verifyChangeRequests() {
  await db.query(
    `insert into public.partner_onboarding_change_requests
      (id, workspace_id, section_id, partner_safe_instructions, requested_by)
     values ($1, $2, $3, 'Please confirm the public organization name.', $4)`,
    [ids.changeA, ids.workspaceA, ids.sectionA, ids.userInternal]
  );
  await db.query(
    `insert into public.partner_onboarding_change_request_internal_notes
      (change_request_id, note, created_by)
     values ($1, 'Internal legal review note.', $2)`,
    [ids.changeA, ids.userInternal]
  );

  await asAuthenticated(ids.userA, async () => {
    const rows = await db.query(
      "select partner_safe_instructions from public.partner_onboarding_change_requests_safe"
    );
    assert(
      rows.rows.length === 1 &&
        rows.rows[0].partner_safe_instructions.includes("public organization"),
      "Partner A must read partner-safe change instructions."
    );
    const notes = await db.query(
      "select note from public.partner_onboarding_change_request_internal_notes"
    );
    assert(notes.rows.length === 0, "Partner A must not read internal change-request notes.");

    await expectRejected(
      () =>
        db.query(
          `update public.partner_onboarding_change_requests
           set status = 'partner_responded', partner_response = 'Confirmed.'
           where id = $1`,
          [ids.changeA]
        ),
      "Partner change requests must mutate only through the typed service boundary."
    );
  });

  await asAuthenticated(ids.userB, async () => {
    const rows = await db.query(
      "select id from public.partner_onboarding_change_requests_safe"
    );
    assert(rows.rows.length === 0, "Partner B must not read Partner A change requests.");
  });

  await expectRejected(
    () =>
      db.query(
        `update public.partner_onboarding_change_request_internal_notes
         set note = 'changed'
         where change_request_id = $1`,
        [ids.changeA]
      ),
    "Internal change-request notes must be append-only."
  );
  await db.query(
    `update public.partner_onboarding_change_requests
     set status = 'cancelled',
         resolved_by = $2,
         resolved_at = now(),
         resolution_reason = 'Synthetic isolation fixture completed.',
         updated_at = now()
     where id = $1`,
    [ids.changeA, ids.userInternal]
  );
}

async function verifyAuthorizationAndIdempotency() {
  const requestId = "81000000-0000-4000-8000-000000000001";
  await asAuthenticated(ids.userA, async () => {
    await expectRejected(
      () =>
        db.query(
          `insert into public.partner_onboarding_authorizations (
             workspace_id,
             organization_information_accurate,
             program_scope_approved_for_configuration,
             brand_assets_authorized_for_use,
             no_eligibility_or_outcome_guarantee_understood,
             contested_and_representation_matters_follow_escalation_plan,
             dashboard_users_authorized,
             legalease_may_prepare_draft_implementation_materials,
             approver_name, approver_title, terms_or_schema_version, request_id
           ) values ($1, true, true, true, true, true, true, true,
                     'Admin A', 'Director', 'rcap-partner-onboarding-v1', $2)`,
          [ids.workspaceA, requestId]
        ),
      "A browser session must not create an authorization outside final submission."
    );
  });

  const idempotencyRequest = "82000000-0000-4000-8000-000000000001";
  await db.query(
    `insert into public.partner_onboarding_idempotency
      (workspace_id, operation_key, request_id, actor_user_id, payload_hash, expires_at)
     values ($1, 'section_save', $2, $3, repeat('a', 64), now() + interval '1 hour')`,
    [ids.workspaceA, idempotencyRequest, ids.userA]
  );
  await expectRejected(
    () =>
      db.query(
        `insert into public.partner_onboarding_idempotency
          (workspace_id, operation_key, request_id, actor_user_id, payload_hash, expires_at)
         values ($1, 'section_save', $2, $3, repeat('a', 64), now() + interval '1 hour')`,
        [ids.workspaceA, idempotencyRequest, ids.userA]
      ),
    "Duplicate request IDs must be rejected."
  );
  await asAuthenticated(ids.userA, async () => {
    await expectRejected(
      () => db.query("select * from public.partner_onboarding_idempotency"),
      "Idempotency ledger must not be directly readable by a browser session."
    );
  });
}

async function verifyActivityAndIntegrationEvents() {
  await db.query(
    `insert into public.partner_onboarding_activity
      (workspace_id, event_type, section_key, status_code, summary_code,
       owner_type, actor_user_id, dedupe_key)
     values ($1, 'section_completed', 'organization_contacts', 'submitted',
             'organization_contacts_completed', 'partner', $2, 'section-a-complete')`,
    [ids.workspaceA, ids.userA]
  );
  await expectRejected(
    () =>
      db.query(
        `insert into public.partner_onboarding_activity
          (workspace_id, event_type, status_code, summary_code)
         values ($1, 'section_started', 'Alice Smith', 'contains_pii')`,
        [ids.workspaceA]
      ),
    "Free-form/PII-like activity status values must be rejected."
  );
  await expectRejected(
    () =>
      db.query(
        `update public.partner_onboarding_activity
         set summary_code = 'changed'
         where dedupe_key = 'section-a-complete'`
      ),
    "Activity must be append-only."
  );

  await db.query(
    `insert into public.partner_onboarding_integration_events
      (workspace_id, partner_record_id, event_type, workspace_aggregate_version,
       workspace_status, completion_percentage, next_action_code,
       next_action_owner, idempotency_key)
     values ($1, $2, 'rcap_onboarding_progressed', 2, 'setup_in_progress',
             25, 'complete_program_goals', 'partner', 'workspace-a:v2:progress')`,
    [ids.workspaceA, ids.partnerA]
  );
  await expectRejected(
    () =>
      db.query(
        `insert into public.partner_onboarding_integration_events
          (workspace_id, partner_record_id, event_type, workspace_aggregate_version,
           workspace_status, completion_percentage, next_action_code,
           next_action_owner, idempotency_key)
         values ($1, $2, 'rcap_onboarding_progressed', 2, 'setup_in_progress',
                 25, 'complete_program_goals', 'partner', 'workspace-a:v2:progress')`,
        [ids.workspaceA, ids.partnerA]
      ),
    "Integration event idempotency keys must be unique."
  );
  await expectRejected(
    () =>
      db.query(
        `update public.partner_onboarding_integration_events
         set completion_percentage = 26
         where idempotency_key = 'workspace-a:v2:progress'`
      ),
    "Integration events must be append-only."
  );

  await asAuthenticated(ids.userA, async () => {
    const activity = await db.query(
      "select summary_code from public.partner_onboarding_activity"
    );
    assert(activity.rows.length === 1, "Partner A must read its safe activity.");
    await expectRejected(
      () => db.query("select actor_user_id from public.partner_onboarding_activity"),
      "Partner-safe activity grants must omit actor identifiers."
    );
    await expectRejected(
      () =>
        db.query(
          "select event_type from public.partner_onboarding_integration_events"
        ),
      "Partner sessions must not read the internal event ledger."
    );
  });
  await asAuthenticated(ids.userInternal, async () => {
    await expectRejected(
      () =>
        db.query(
          "select event_type from public.partner_onboarding_integration_events"
        ),
      "Internal browser sessions must use the server operation boundary for the event ledger."
    );
  });
}

async function verifyAssetMetadataAndStorage() {
  const canonicalPath =
    `partners/${ids.partnerA}/onboarding/${ids.workspaceA}/` +
    `transparent_logo/${ids.assetA}.png`;
  await db.query(
    `insert into public.partner_onboarding_assets (
       id, workspace_id, partner_record_id, category, object_path,
       original_filename, safe_filename, media_type, file_extension,
       byte_size, width_pixels, height_pixels, uploaded_by
     ) values (
       $1, $2, $3, 'transparent_logo', $4,
       'partner-logo.png', 'logo.png', 'image/png', 'png',
       2048, 800, 400, $5
     )`,
    [ids.assetA, ids.workspaceA, ids.partnerA, canonicalPath, ids.userA]
  );

  await expectRejected(
    () =>
      db.query(
        `insert into public.partner_onboarding_assets (
           id, workspace_id, partner_record_id, category, object_path,
           original_filename, safe_filename, media_type, file_extension,
           byte_size, uploaded_by
         ) values (
           $1, $2, $3, 'transparent_logo', 'partners/spoofed/logo.svg',
           'logo.svg', 'logo.svg', 'image/svg+xml', 'svg', 100, $4
         )`,
        [ids.assetA2, ids.workspaceA, ids.partnerA, ids.userA]
      ),
    "SVG/spoofed asset paths must be rejected."
  );

  const duplicatePath =
    `partners/${ids.partnerA}/onboarding/${ids.workspaceA}/` +
    `transparent_logo/${ids.assetA2}.png`;
  await expectRejected(
    () =>
      db.query(
        `insert into public.partner_onboarding_assets (
           id, workspace_id, partner_record_id, category, object_path,
           original_filename, safe_filename, media_type, file_extension,
           byte_size, uploaded_by
         ) values (
           $1, $2, $3, 'transparent_logo', $4,
           'second.png', 'second.png', 'image/png', 'png', 100, $5
         )`,
        [ids.assetA2, ids.workspaceA, ids.partnerA, duplicatePath, ids.userA]
      ),
    "Only one current asset per workspace/category may exist."
  );

  await asAuthenticated(ids.userA, async () => {
    const assets = await db.query(
      "select id, category from public.partner_onboarding_assets_safe"
    );
    assert(
      assets.rows.length === 1 && assets.rows[0].id === ids.assetA,
      "Partner A must read its safe asset metadata."
    );
    await expectRejected(
      () => db.query("select object_path from public.partner_onboarding_assets"),
      "Partner A must not read private object paths."
    );
  });
  await asAuthenticated(ids.userB, async () => {
    const assets = await db.query(
      "select id from public.partner_onboarding_assets_safe"
    );
    assert(assets.rows.length === 0, "Partner B must not read Partner A assets.");
  });

  const bucket = (
    await db.query(
      `select public, file_size_limit, allowed_mime_types
       from storage.buckets
       where id = 'rcap-partner-onboarding-private'`
    )
  ).rows[0];
  assert(
    bucket.public === false &&
      Number(bucket.file_size_limit) === 20971520 &&
      !bucket.allowed_mime_types.includes("image/svg+xml"),
    "Onboarding bucket must be private, bounded, and reject SVG."
  );

  const storagePath =
    `partners/${ids.partnerA}/onboarding/${ids.workspaceA}/` +
    `transparent_logo/${ids.objectA}.png`;
  await db.query(
    `insert into storage.objects (bucket_id, name)
     values ('rcap-partner-onboarding-private', $1)`,
    [storagePath]
  );
  await asAuthenticated(ids.userA, async () => {
    await expectRejected(
      () =>
        db.query(
          `select name from storage.objects
           where bucket_id = 'rcap-partner-onboarding-private'`
        ),
      "Partner browser sessions must not list private storage objects."
    );
    await expectRejected(
      () =>
        db.query(
          `insert into storage.objects (bucket_id, name)
           values ('rcap-partner-onboarding-private', $1)`,
          [storagePath.replace(ids.objectA, "90000000-0000-4000-8000-000000000004")]
        ),
      "Partner browser sessions must use the server-issued narrow upload operation."
    );

    const crossPath =
      `partners/${ids.partnerB}/onboarding/${ids.workspaceB}/` +
      `transparent_logo/90000000-0000-4000-8000-000000000002.png`;
    await expectRejected(
      () =>
        db.query(
          `insert into storage.objects (bucket_id, name)
           values ('rcap-partner-onboarding-private', $1)`,
          [crossPath]
        ),
      "Partner A must not create a Partner B storage object."
    );
    await expectRejected(
      () =>
        db.query(
          `insert into storage.objects (bucket_id, name)
           values ('rcap-partner-onboarding-private',
                   'partners/not-a-uuid/onboarding/not-a-workspace/logo.svg')`
        ),
      "Non-canonical storage paths must be rejected."
    );
  });

  await asAuthenticated(ids.userB, async () => {
    await expectRejected(
      () =>
        db.query(
          `select name from storage.objects
           where bucket_id = 'rcap-partner-onboarding-private'`
        ),
      "Partner B must not list private storage objects."
    );
  });
  await asAuthenticated(ids.userStaff, async () => {
    await expectRejected(
      () =>
        db.query(
          `insert into storage.objects (bucket_id, name)
           values ('rcap-partner-onboarding-private', $1)`,
          [
            `partners/${ids.partnerB}/onboarding/${ids.workspaceB}/` +
              "transparent_logo/90000000-0000-4000-8000-000000000003.png"
          ]
        ),
      "Partner staff must not upload organizational assets."
    );
  });
}

async function verifyServerMutationRpcs() {
  const servicePrivileges = (
    await db.query(
      `select
         has_table_privilege('service_role', 'public.partner_records', 'SELECT') as partner_records_select,
         has_table_privilege('service_role', 'public.partner_users', 'SELECT') as partner_users_select,
         has_table_privilege('service_role', 'public.partner_onboarding', 'INSERT') as workspace_insert`
    )
  ).rows[0];
  assert(
    Object.values(servicePrivileges).every((value) => value === true),
    "The server-only mutation role must have only the explicit persistence privileges its invoker RPCs need."
  );
  const rpcPrivileges = (
    await db.query(
      `select
         has_function_privilege(
           'service_role',
           'public.rcap_service_save_onboarding_section(text,uuid,uuid,text,bigint,bigint,jsonb,jsonb,text,integer,text[],integer,text,text,text,uuid,text)',
           'EXECUTE'
         ) as service_can_execute,
         has_function_privilege(
           'authenticated',
           'public.rcap_service_save_onboarding_section(text,uuid,uuid,text,bigint,bigint,jsonb,jsonb,text,integer,text[],integer,text,text,text,uuid,text)',
           'EXECUTE'
         ) as browser_can_execute`
    )
  ).rows[0];
  assert(
    rpcPrivileges.service_can_execute === true &&
      rpcPrivileges.browser_can_execute === false,
    "Transactional mutation RPCs must be executable by service_role only."
  );
  await db.query(
    `insert into public.partner_records
      (id, partner_id, partner_slug, partner_name, program_tier, payment_status,
       qualification_status, provisioning_status)
     values
      ($1, 'partner-live', 'partner-live', 'Partner Live', 'implementation',
       'paid', 'qualified', 'active')`,
    [ids.partnerLive]
  );
  await db.query(
    `insert into public.partner_onboarding (id, partner_slug, status)
     values ($1, 'partner-live', 'live')`,
    [ids.workspaceLive]
  );
  const attachedLive = await invokeServiceMutation(() =>
    db.query(
      `select * from public.rcap_service_create_onboarding_workspace(
         $1, $2, $3, $4, $5, $6
       )`,
      [
        "partner-live",
        ids.userInternal,
        "83000000-0000-4000-8000-000000000098",
        null,
        "rcap_partner_onboarding_phase_1_v1",
        "f".repeat(64)
      ]
    )
  );
  const attachedLiveState = (
    await db.query(
      `select partner_record_id, status, commercial_gate_status,
              commercial_gate_evidence_reference, blocker_code,
              next_action_code, next_action_owner
       from public.partner_onboarding
       where id = $1`,
      [ids.workspaceLive]
    )
  ).rows[0];
  assert(
    attachedLive.rows[0].created === false &&
      attachedLiveState.partner_record_id === ids.partnerLive &&
      attachedLiveState.status === "live" &&
      attachedLiveState.commercial_gate_status ===
        "cleared_by_paid_invoice" &&
      attachedLiveState.commercial_gate_evidence_reference ===
        `partner_record:${ids.partnerLive}` &&
      attachedLiveState.blocker_code === null &&
      attachedLiveState.next_action_code === "program_live" &&
      attachedLiveState.next_action_owner === "none",
    "Attaching Phase 1 to a paid legacy live workspace must preserve live state and initialize authoritative commercial truth."
  );

  const createRequest = "83000000-0000-4000-8000-000000000001";
  const createHash = "c".repeat(64);
  const created = await invokeServiceMutation(() =>
    db.query(
      `select * from public.rcap_service_create_onboarding_workspace(
         $1, $2, $3, $4, $5, $6
       )`,
      [
        "partner-c",
        ids.userInternal,
        createRequest,
        "2026-12-01",
        "rcap_partner_onboarding_phase_1_v1",
        createHash
      ]
    )
  );
  assert(
    created.rows.length === 1 &&
      created.rows[0].created === true &&
      created.rows[0].workspace_status === "commercially_blocked",
    "Internal workspace creation must be explicit and honor authoritative unpaid status."
  );
  const workspaceC = created.rows[0].workspace_id;
  const duplicateCreate = await invokeServiceMutation(() =>
    db.query(
      `select * from public.rcap_service_create_onboarding_workspace(
         $1, $2, $3, $4, $5, $6
       )`,
      [
        "partner-c",
        ids.userInternal,
        createRequest,
        "2026-12-01",
        "rcap_partner_onboarding_phase_1_v1",
        createHash
      ]
    )
  );
  assert(
    duplicateCreate.rows.length === 1 &&
      duplicateCreate.rows[0].workspace_id === workspaceC &&
      duplicateCreate.rows[0].created === false,
    "Duplicate workspace creation must return one durable workspace."
  );
  const phase1Sections = await db.query(
    `select count(*)::int as count
     from public.partner_onboarding_sections
     where workspace_id = $1`,
    [workspaceC]
  );
  assert(
    phase1Sections.rows[0].count === 8,
    "Explicit workspace creation must seed exactly eight canonical sections."
  );

  const paidGateRequest = "83000000-0000-4000-8000-000000000099";
  const paidGate = await invokeServiceMutation(() =>
    db.query(
      `select * from public.rcap_service_review_onboarding(
         $1, $2, $3, $4, $5, $6, $7::jsonb
       )`,
      [
        "partner-b",
        ids.userInternal,
        ids.workspaceB,
        1,
        paidGateRequest,
        "0".repeat(64),
        JSON.stringify({
          action: "commercial_gate",
          outcome: "cleared_by_paid_invoice",
          evidenceReference: "browser-supplied-value-must-not-be-trusted",
          systemDerived: {
            completionPercentage: 0,
            blockerCode: "required_asset_missing",
            nextActionCode: "upload_required_asset",
            nextActionOwner: "partner"
          }
        })
      ]
    )
  );
  const paidGateAudit = (
    await db.query(
      `select commercial_gate_status, commercial_gate_evidence_reference,
              completion_percentage, blocker_code, next_action_code,
              next_action_owner
       from public.partner_onboarding
       where id = $1`,
      [ids.workspaceB]
    )
  ).rows[0];
  assert(
    Number(paidGate.rows[0].workspace_aggregate_version) === 2 &&
      paidGateAudit.commercial_gate_status === "cleared_by_paid_invoice" &&
      paidGateAudit.commercial_gate_evidence_reference ===
        `partner_record:${ids.partnerB}` &&
      Number(paidGateAudit.completion_percentage) === 0 &&
      paidGateAudit.blocker_code === "required_asset_missing" &&
      paidGateAudit.next_action_code === "upload_required_asset" &&
      paidGateAudit.next_action_owner === "partner",
    "Paid-invoice clearance must derive authoritative commercial evidence and persist the CAS-protected server summary."
  );

  const reviewRequest = "83000000-0000-4000-8000-000000000002";
  const review = await invokeServiceMutation(() =>
    db.query(
      `select * from public.rcap_service_review_onboarding(
         $1, $2, $3, $4, $5, $6, $7::jsonb
       )`,
      [
        "partner-c",
        ids.userInternal,
        workspaceC,
        1,
        reviewRequest,
        "d".repeat(64),
        JSON.stringify({
          action: "commercial_gate",
          outcome: "cleared_by_authorized_internal_override",
          overrideReason: "Synthetic local verification",
          systemDerived: {
            completionPercentage: 0,
            blockerCode: "required_asset_missing",
            nextActionCode: "upload_required_asset",
            nextActionOwner: "partner"
          }
        })
      ]
    )
  );
  assert(
    review.rows[0].workspace_status === "setup_in_progress" &&
      Number(review.rows[0].workspace_aggregate_version) === 2,
    "Authorized commercial override must be audited and advance the workspace version."
  );
  const overrideAudit = (
    await db.query(
      `select commercial_gate_override_reason, commercial_gate_changed_by
       from public.partner_onboarding
       where id = $1`,
      [workspaceC]
    )
  ).rows[0];
  assert(
    overrideAudit.commercial_gate_override_reason ===
      "Synthetic local verification" &&
      overrideAudit.commercial_gate_changed_by === ids.userInternal,
    "Commercial override reason and actor must be durable internal audit evidence."
  );

  await expectRejected(
    () =>
      invokeServiceMutation(() =>
        db.query(
          `select * from public.rcap_service_review_onboarding(
             $1, $2, $3, $4, $5, $6, $7::jsonb
           )`,
          [
            "partner-c",
            ids.userInternal,
            workspaceC,
            2,
            "83000000-0000-4000-8000-000000000007",
            "1".repeat(64),
            JSON.stringify({
              action: "commercial_gate",
              outcome: "cleared_by_paid_invoice",
              systemDerived: {
                completionPercentage: 0,
                blockerCode: "required_asset_missing",
                nextActionCode: "upload_required_asset",
                nextActionOwner: "partner"
              }
            })
          ]
        )
      ),
    "An unpaid partner must not spoof paid-invoice clearance."
  );

  const targetDateReview = await invokeServiceMutation(() =>
    db.query(
      `select * from public.rcap_service_review_onboarding(
         $1, $2, $3, $4, $5, $6, $7::jsonb
       )`,
      [
        "partner-c",
        ids.userInternal,
        workspaceC,
        2,
        "83000000-0000-4000-8000-000000000008",
        "2".repeat(64),
        JSON.stringify({
          action: "target_launch_date",
          targetLaunchDate: "2027-01-15",
          reason: "Synthetic launch planning decision"
        })
      ]
    )
  );
  assert(
    Number(targetDateReview.rows[0].workspace_aggregate_version) === 3,
    "Target-date review must advance the workspace version."
  );
  const targetDateAudit = (
    await db.query(
      `select target_launch_date::text, target_launch_date_reason,
              target_launch_date_changed_at, target_launch_date_changed_by
       from public.partner_onboarding
       where id = $1`,
      [workspaceC]
    )
  ).rows[0];
  assert(
    targetDateAudit.target_launch_date === "2027-01-15" &&
      targetDateAudit.target_launch_date_reason ===
        "Synthetic launch planning decision" &&
      targetDateAudit.target_launch_date_changed_at &&
      targetDateAudit.target_launch_date_changed_by === ids.userInternal,
    "Target-date reason, actor, and server timestamp must be durable audit evidence."
  );

  const agreementAssetId = "50000000-0000-4000-8000-000000000003";
  const agreementObjectPath =
    `partners/${ids.partnerC}/onboarding/${workspaceC}/` +
    `procurement_document/${agreementAssetId}.pdf`;
  await db.query(
    `insert into public.partner_onboarding_assets (
       id, workspace_id, partner_record_id, category, object_path,
       original_filename, safe_filename, media_type, file_extension,
       byte_size, sha256_hex, uploaded_by
     ) values (
       $1, $2, $3, 'procurement_document', $4,
       'synthetic-final-order-form.pdf', 'procurement_document.pdf',
       'application/pdf', 'pdf', 1024, $5, $6
     )`,
    [
      agreementAssetId,
      workspaceC,
      ids.partnerC,
      agreementObjectPath,
      "3".repeat(64),
      ids.userInternal
    ]
  );
  const agreementReview = await invokeServiceMutation(() =>
    db.query(
      `select * from public.rcap_service_review_onboarding(
         $1, $2, $3, $4, $5, $6, $7::jsonb
       )`,
      [
        "partner-c",
        ids.userInternal,
        workspaceC,
        3,
        "83000000-0000-4000-8000-000000000009",
        "4".repeat(64),
        JSON.stringify({
          action: "agreement",
          agreementType: "order_form",
          status: "finalized",
          required: true,
          partnerSafeDetail: "Finalized order form is available.",
          finalizedAssetId: agreementAssetId,
          effectiveDate: "2027-01-01",
          systemDerived: {
            completionPercentage: 42,
            blockerCode: "required_section_incomplete",
            nextActionCode: "complete_section",
            nextActionOwner: "partner"
          }
        })
      ]
    )
  );
  assert(
    Number(agreementReview.rows[0].workspace_aggregate_version) === 4,
    "Finalized agreement metadata must advance the workspace version."
  );
  await expectRejected(
    () =>
      invokeServiceMutation(() =>
        db.query(
          `select * from public.rcap_service_review_onboarding(
             $1, $2, $3, $4, $5, $6, $7::jsonb
           )`,
          [
            "partner-c",
            ids.userInternal,
            workspaceC,
            3,
            "83000000-0000-4000-8000-000000000012",
            "8".repeat(64),
            JSON.stringify({
              action: "agreement",
              agreementType: "procurement_requirements",
              status: "requested",
              required: true,
              partnerSafeDetail: "Synthetic stale procurement summary.",
              finalizedAssetId: null,
              effectiveDate: null,
              systemDerived: {
                completionPercentage: 5,
                blockerCode: "required_asset_missing",
                nextActionCode: "upload_required_asset",
                nextActionOwner: "partner"
              }
            })
          ]
        )
      ),
    "A stale agreement/procurement-derived summary must be rejected under the workspace lock."
  );
  await expectRejected(
    () =>
      invokeServiceMutation(() =>
        db.query(
          `select * from public.rcap_service_review_onboarding(
             $1, $2, $3, $4, $5, $6, $7::jsonb
           )`,
          [
            "partner-c",
            ids.userInternal,
            workspaceC,
            3,
            "83000000-0000-4000-8000-000000000009",
            "9".repeat(64),
            JSON.stringify({
              action: "agreement",
              agreementType: "order_form",
              status: "under_review",
              required: true,
              systemDerived: {
                completionPercentage: 1,
                blockerCode: "required_section_incomplete",
                nextActionCode: "complete_section",
                nextActionOwner: "partner"
              }
            })
          ]
        )
      ),
    "A successful review request ID must reject replay with different operation bytes."
  );
  const agreementAudit = (
    await db.query(
      `select agreement.finalized_asset_id, agreement.status,
              asset.review_status, asset.lifecycle_status, asset.review_reason
       from public.partner_onboarding_agreements agreement
       join public.partner_onboarding_assets asset
         on asset.id = agreement.finalized_asset_id
       where agreement.workspace_id = $1
         and agreement.agreement_type = 'order_form'`,
      [workspaceC]
    )
  ).rows[0];
  assert(
    agreementAudit.finalized_asset_id === agreementAssetId &&
      agreementAudit.status === "finalized" &&
      agreementAudit.review_status === "approved" &&
      agreementAudit.lifecycle_status === "active" &&
      agreementAudit.review_reason ===
        "authorized_as_finalized_agreement_document",
    "Attaching a finalized document must authorize only the selected private workspace asset in the same transaction."
  );
  const agreementDerivedState = (
    await db.query(
      `select completion_percentage, blocker_code, next_action_code,
              next_action_owner
       from public.partner_onboarding
       where id = $1`,
      [workspaceC]
    )
  ).rows[0];
  assert(
    agreementDerivedState.completion_percentage === 42 &&
      agreementDerivedState.blocker_code ===
        "required_section_incomplete" &&
      agreementDerivedState.next_action_code === "complete_section" &&
      agreementDerivedState.next_action_owner === "partner",
    "Agreement/procurement changes must atomically persist their server-derived conditional requirement state."
  );

  const workspaceABefore = (
    await db.query(
      "select aggregate_version from public.partner_onboarding where id = $1",
      [ids.workspaceA]
    )
  ).rows[0];
  const sectionABefore = (
    await db.query(
      "select revision from public.partner_onboarding_sections where id = $1",
      [ids.sectionA]
    )
  ).rows[0];
  const saveRequest = "83000000-0000-4000-8000-000000000003";
  const saveHash = "e".repeat(64);

  await expectRejected(
    () =>
      invokeServiceMutation(() =>
        db.query(
          `select * from public.rcap_service_save_onboarding_section(
             $1, $2, $3, 'organization_contacts', $4, $5,
             '{}'::jsonb, '{"contacts":[]}'::jsonb, 'draft_save',
             10, array['legal_organization_name'], 10,
             'required_section_incomplete', 'complete_section', 'partner',
             $6, $7
           )`,
          [
            "partner-b",
            ids.userA,
            ids.workspaceB,
            1,
            1,
            "83000000-0000-4000-8000-000000000004",
            "f".repeat(64)
          ]
        )
      ),
    "A server mutation must reject an actor from another partner tenant."
  );

  const save = await invokeServiceMutation(() =>
    db.query(
      `select * from public.rcap_service_save_onboarding_section(
         $1, $2, $3, 'organization_contacts', $4, $5,
         $6::jsonb, '{"contacts":[]}'::jsonb, 'section_complete',
         100, '{}'::text[], 100, null, 'submit_for_review', 'partner',
         $7, $8
       )`,
      [
        "partner-a",
        ids.userA,
        ids.workspaceA,
        Number(sectionABefore.revision),
        Number(workspaceABefore.aggregate_version),
        JSON.stringify({ legal_organization_name: "Partner A Verified" }),
        saveRequest,
        saveHash
      ]
    )
  );
  assert(
    Number(save.rows[0].section_revision) ===
      Number(sectionABefore.revision) + 1 &&
      Number(save.rows[0].workspace_aggregate_version) ===
        Number(workspaceABefore.aggregate_version) + 1 &&
      save.rows[0].duplicate === false,
    "Section save must atomically advance section and workspace versions."
  );
  const duplicateSave = await invokeServiceMutation(() =>
    db.query(
      `select * from public.rcap_service_save_onboarding_section(
         $1, $2, $3, 'organization_contacts', $4, $5,
         $6::jsonb, '{"contacts":[]}'::jsonb, 'section_complete',
         100, '{}'::text[], 100, null, 'submit_for_review', 'partner',
         $7, $8
       )`,
      [
        "partner-a",
        ids.userA,
        ids.workspaceA,
        Number(sectionABefore.revision),
        Number(workspaceABefore.aggregate_version),
        JSON.stringify({ legal_organization_name: "Partner A Verified" }),
        saveRequest,
        saveHash
      ]
    )
  );
  assert(
    duplicateSave.rows[0].duplicate === true &&
      Number(duplicateSave.rows[0].section_revision) ===
        Number(save.rows[0].section_revision),
    "A retried section request must return its first durable result."
  );
  await expectRejected(
    () =>
      invokeServiceMutation(() =>
        db.query(
          `select * from public.rcap_service_save_onboarding_section(
             $1, $2, $3, 'organization_contacts', $4, $5,
             '{"legal_organization_name":"different replay"}'::jsonb,
             '{"contacts":[]}'::jsonb, 'section_complete',
             100, '{}'::text[], 100, null, 'submit_for_review', 'partner',
             $6, $7
           )`,
          [
            "partner-a",
            ids.userA,
            ids.workspaceA,
            Number(sectionABefore.revision),
            Number(workspaceABefore.aggregate_version),
            saveRequest,
            "a".repeat(64)
          ]
        )
      ),
    "A successful section request ID must reject replay with different bytes."
  );
  await expectRejected(
    () =>
      invokeServiceMutation(() =>
        db.query(
          `select * from public.rcap_service_save_onboarding_section(
             $1, $2, $3, 'organization_contacts', $4, $5,
             '{"legal_organization_name":"stale"}'::jsonb,
             '{"contacts":[]}'::jsonb, 'draft_save',
             20, array['public_organization_name'], 20,
             'required_section_incomplete', 'complete_section', 'partner',
             $6, $7
           )`,
          [
            "partner-a",
            ids.userA,
            ids.workspaceA,
            Number(sectionABefore.revision),
            Number(save.rows[0].workspace_aggregate_version),
            "83000000-0000-4000-8000-000000000005",
            "1".repeat(64)
          ]
        )
      ),
    "A stale expected section revision must not overwrite newer data."
  );
  const persisted = (
    await db.query(
      "select response_data from public.partner_onboarding_sections where id = $1",
      [ids.sectionA]
    )
  ).rows[0];
  assert(
    persisted.response_data.legal_organization_name === "Partner A Verified",
    "Rejected stale writes must preserve the newer persisted response."
  );

  await db.query(
    `insert into public.partner_onboarding_sections (
       workspace_id, section_key, response_data, revision, status
     ) values
       ($1, 'program_goals', '{"primary_goal":"seed program"}'::jsonb, 1, 'in_progress'),
       ($1, 'geography_audience_language_accessibility',
        '{"service_area_description":"seed geography"}'::jsonb, 1, 'in_progress')
     on conflict (workspace_id, section_key) do nothing`,
    [ids.workspaceA]
  );
  const sharedAggregateVersion = Number(
    (
      await db.query(
        "select aggregate_version from public.partner_onboarding where id = $1",
        [ids.workspaceA]
      )
    ).rows[0].aggregate_version
  );
  const concurrentFirst = await invokeServiceMutation(() =>
    db.query(
      `select * from public.rcap_service_save_onboarding_section(
         $1, $2, $3, 'program_goals', 1, $4,
         '{"primary_goal":"first mutation"}'::jsonb, '{}'::jsonb,
         'draft_save', 10, array['definition_of_success'], 20,
         'required_section_incomplete', 'complete_section', 'partner',
         $5, $6
       )`,
      [
        "partner-a",
        ids.userA,
        ids.workspaceA,
        sharedAggregateVersion,
        "83000000-0000-4000-8000-000000000013",
        "b".repeat(64)
      ]
    )
  );
  await expectRejected(
    () =>
      invokeServiceMutation(() =>
        db.query(
          `select * from public.rcap_service_save_onboarding_section(
             $1, $2, $3, 'geography_audience_language_accessibility',
             1, $4, '{"service_area_description":"stale mutation"}'::jsonb,
             '{}'::jsonb, 'draft_save', 10, array['jurisdictions'], 5,
             'required_section_incomplete', 'complete_section', 'partner',
             $5, $6
           )`,
          [
            "partner-a",
            ids.userA,
            ids.workspaceA,
            sharedAggregateVersion,
            "83000000-0000-4000-8000-000000000014",
            "c".repeat(64)
          ]
        )
      ),
    "Two section mutations based on one aggregate version must not silently overwrite derived state."
  );
  const concurrentState = (
    await db.query(
      `select section_key, response_data
       from public.partner_onboarding_sections
       where workspace_id = $1
         and section_key in (
           'program_goals',
           'geography_audience_language_accessibility'
         )
       order by section_key`,
      [ids.workspaceA]
    )
  ).rows;
  assert(
    Number(concurrentFirst.rows[0].workspace_aggregate_version) ===
      sharedAggregateVersion + 1 &&
      concurrentState.find(
        (row) => row.section_key === "program_goals"
      )?.response_data.primary_goal === "first mutation" &&
      concurrentState.find(
        (row) =>
          row.section_key ===
          "geography_audience_language_accessibility"
      )?.response_data.service_area_description === "seed geography",
    "The accepted concurrent mutation must persist while the stale mutation leaves canonical rows untouched."
  );

  const serviceAssetId = "50000000-0000-4000-8000-000000000004";
  const serviceAssetPath =
    `partners/${ids.partnerA}/onboarding/${ids.workspaceA}/` +
    `brand_guide/${serviceAssetId}.pdf`;
  const versionBeforeAsset = Number(
    (
      await db.query(
        "select aggregate_version from public.partner_onboarding where id = $1",
        [ids.workspaceA]
      )
    ).rows[0].aggregate_version
  );
  const staleAssetId = "50000000-0000-4000-8000-000000000005";
  await expectRejected(
    () =>
      invokeServiceMutation(() =>
        db.query(
          `select * from public.rcap_service_record_onboarding_asset(
             $1, $2, $3, $4, $5, 'brand_guide', $6,
             'stale-brand-guide.pdf', 'brand_guide.pdf',
             'application/pdf', 'pdf', 1024, null, null, $7, $8,
             1, 'required_asset_missing', 'upload_required_asset', 'partner',
             $9
           )`,
          [
            "partner-a",
            ids.userA,
            ids.workspaceA,
            staleAssetId,
            sharedAggregateVersion,
            `partners/${ids.partnerA}/onboarding/${ids.workspaceA}/brand_guide/${staleAssetId}.pdf`,
            "d".repeat(64),
            "e".repeat(64),
            "83000000-0000-4000-8000-000000000015"
          ]
        )
      ),
    "A stale asset-derived completion summary must be rejected under the workspace lock."
  );
  const staleAssetCount = await db.query(
    "select count(*)::int as count from public.partner_onboarding_assets where id = $1",
    [staleAssetId]
  );
  assert(
    staleAssetCount.rows[0].count === 0,
    "A rejected stale asset summary must not create active metadata."
  );
  const assetRecord = await invokeServiceMutation(() =>
    db.query(
      `select * from public.rcap_service_record_onboarding_asset(
         $1, $2, $3, $4, $5, 'brand_guide', $6,
         'synthetic-brand-guide.pdf', 'brand_guide.pdf',
         'application/pdf', 'pdf', 2048, null, null, $7, $8,
         73, 'required_section_incomplete', 'complete_section', 'partner', $9
       )`,
      [
        "partner-a",
        ids.userA,
        ids.workspaceA,
        serviceAssetId,
        versionBeforeAsset,
        serviceAssetPath,
        "5".repeat(64),
        "6".repeat(64),
        "83000000-0000-4000-8000-000000000010"
      ]
    )
  );
  const workspaceAfterAssetRecord = (
    await db.query(
      `select completion_percentage, blocker_code, next_action_code,
              next_action_owner
       from public.partner_onboarding
       where id = $1`,
      [ids.workspaceA]
    )
  ).rows[0];
  assert(
    assetRecord.rows[0].duplicate === false &&
      workspaceAfterAssetRecord.completion_percentage === 73 &&
      workspaceAfterAssetRecord.blocker_code ===
        "required_section_incomplete" &&
      workspaceAfterAssetRecord.next_action_code === "complete_section" &&
      workspaceAfterAssetRecord.next_action_owner === "partner",
    "Asset recording must persist the server-derived completion, blocker, and next action in the same transaction."
  );
  const duplicateAssetRecord = await invokeServiceMutation(() =>
    db.query(
      `select * from public.rcap_service_record_onboarding_asset(
         $1, $2, $3, $4, $5, 'brand_guide', $6,
         'synthetic-brand-guide.pdf', 'brand_guide.pdf',
         'application/pdf', 'pdf', 2048, null, null, $7, $8,
         73, 'required_section_incomplete', 'complete_section', 'partner', $9
       )`,
      [
        "partner-a",
        ids.userA,
        ids.workspaceA,
        serviceAssetId,
        versionBeforeAsset,
        serviceAssetPath,
        "5".repeat(64),
        "6".repeat(64),
        "83000000-0000-4000-8000-000000000010"
      ]
    )
  );
  assert(
    duplicateAssetRecord.rows[0].duplicate === true &&
      duplicateAssetRecord.rows[0].asset_id === serviceAssetId,
    "An identical asset-record retry must return the original durable asset."
  );
  await expectRejected(
    () =>
      invokeServiceMutation(() =>
        db.query(
          `select * from public.rcap_service_record_onboarding_asset(
             $1, $2, $3, $4, $5, 'brand_guide', $6,
             'different-brand-guide.pdf', 'brand_guide.pdf',
             'application/pdf', 'pdf', 2048, null, null, $7, $8,
             99, null, 'submit_for_review', 'partner', $9
           )`,
          [
            "partner-a",
            ids.userA,
            ids.workspaceA,
            serviceAssetId,
            versionBeforeAsset,
            serviceAssetPath,
            "5".repeat(64),
            "f".repeat(64),
            "83000000-0000-4000-8000-000000000010"
          ]
        )
      ),
    "An asset request ID replayed with different operation bytes must fail safely."
  );
  const assetDelete = await invokeServiceMutation(() =>
    db.query(
      `select * from public.rcap_service_delete_onboarding_asset(
         $1, $2, $3, $4, $5, $6, 100, null,
         'submit_for_review', 'partner', $7
       )`,
      [
        "partner-a",
        ids.userA,
        ids.workspaceA,
        serviceAssetId,
        Number(assetRecord.rows[0].workspace_aggregate_version),
        "7".repeat(64),
        "83000000-0000-4000-8000-000000000011"
      ]
    )
  );
  const workspaceAfterAssetDelete = (
    await db.query(
      `select completion_percentage, blocker_code, next_action_code,
              next_action_owner
       from public.partner_onboarding
       where id = $1`,
      [ids.workspaceA]
    )
  ).rows[0];
  assert(
    assetDelete.rows[0].duplicate === false &&
      workspaceAfterAssetDelete.completion_percentage === 100 &&
      workspaceAfterAssetDelete.blocker_code === null &&
      workspaceAfterAssetDelete.next_action_code ===
        "submit_for_review" &&
      workspaceAfterAssetDelete.next_action_owner === "partner",
    "Asset deletion must persist the server-derived completion, blocker, and next action in the same transaction."
  );
  const duplicateAssetDelete = await invokeServiceMutation(() =>
    db.query(
      `select * from public.rcap_service_delete_onboarding_asset(
         $1, $2, $3, $4, $5, $6, 100, null,
         'submit_for_review', 'partner', $7
       )`,
      [
        "partner-a",
        ids.userA,
        ids.workspaceA,
        serviceAssetId,
        Number(assetRecord.rows[0].workspace_aggregate_version),
        "7".repeat(64),
        "83000000-0000-4000-8000-000000000011"
      ]
    )
  );
  assert(
    duplicateAssetDelete.rows[0].duplicate === true,
    "An identical asset-delete retry must return the original durable result."
  );
  await expectRejected(
    () =>
      invokeServiceMutation(() =>
        db.query(
          `select * from public.rcap_service_delete_onboarding_asset(
             $1, $2, $3, $4, $5, $6, 1, 'required_asset_missing',
             'upload_required_asset', 'partner', $7
           )`,
          [
            "partner-a",
            ids.userA,
            ids.workspaceA,
            serviceAssetId,
            Number(assetRecord.rows[0].workspace_aggregate_version),
            "0".repeat(64),
            "83000000-0000-4000-8000-000000000011"
          ]
        )
      ),
    "An asset-delete request ID replayed with different operation bytes must fail safely."
  );

  await db.query(
    `insert into public.partner_onboarding_sections (
       workspace_id, section_key, response_data, revision, status,
       completion_percentage, missing_required_keys, completed_at, submitted_at
     )
     select $1, section_key, '{}'::jsonb, 1, 'submitted', 100,
            '{}'::text[], now(), now()
     from unnest(array[
       'program_goals',
       'geography_audience_language_accessibility',
       'access_sponsorship_capacity',
       'brand_public_page',
       'staff_dashboard_plan',
       'support_referrals_reporting',
       'review_authorization'
     ]::text[]) section_key
     on conflict (workspace_id, section_key) do update
       set revision = public.partner_onboarding_sections.revision + 1,
           status = 'submitted',
           completion_percentage = 100,
           missing_required_keys = '{}'::text[],
           completed_at = now(),
           submitted_at = now()`,
    [ids.workspaceA]
  );
  await db.query(
    `update public.partner_onboarding_sections
     set revision = revision + 1,
         status = 'submitted',
         completion_percentage = 100,
         missing_required_keys = '{}'::text[]
     where id = $1`,
    [ids.sectionA]
  );
  const versionForSubmit = (
    await db.query(
      "select aggregate_version from public.partner_onboarding where id = $1",
      [ids.workspaceA]
    )
  ).rows[0].aggregate_version;
  const submitRequest = "83000000-0000-4000-8000-000000000006";
  const authorization = {
    organization_information_accurate: true,
    program_scope_approved_for_configuration: true,
    brand_assets_authorized_for_use: true,
    no_eligibility_or_outcome_guarantee_understood: true,
    contested_and_representation_matters_follow_escalation_plan: true,
    dashboard_users_authorized: true,
    legalease_may_prepare_draft_implementation_materials: true,
    approver_name: "Ignored browser identity",
    approver_title: "Program Director"
  };
  const submit = await invokeServiceMutation(() =>
    db.query(
      `select * from public.rcap_service_submit_onboarding(
         $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb
       )`,
      [
        "partner-a",
        ids.userA,
        "admin-a@example.test",
        ids.workspaceA,
        Number(versionForSubmit),
        submitRequest,
        "2".repeat(64),
        "rcap_partner_onboarding_phase_1_v1",
        JSON.stringify(authorization)
      ]
    )
  );
  assert(
    submit.rows[0].duplicate === false && submit.rows[0].submitted_at,
    "Complete onboarding must submit exactly once."
  );
  const duplicateSubmit = await invokeServiceMutation(() =>
    db.query(
      `select * from public.rcap_service_submit_onboarding(
         $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb
       )`,
      [
        "partner-a",
        ids.userA,
        "admin-a@example.test",
        ids.workspaceA,
        Number(versionForSubmit),
        submitRequest,
        "2".repeat(64),
        "rcap_partner_onboarding_phase_1_v1",
        JSON.stringify(authorization)
      ]
    )
  );
  assert(
    duplicateSubmit.rows[0].duplicate === true,
    "Duplicate final submission must return the first durable result."
  );
  await expectRejected(
    () =>
      invokeServiceMutation(() =>
        db.query(
          `select * from public.rcap_service_submit_onboarding(
             $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb
           )`,
          [
            "partner-a",
            ids.userA,
            "admin-a@example.test",
            ids.workspaceA,
            Number(versionForSubmit),
            submitRequest,
            "3".repeat(64),
            "rcap_partner_onboarding_phase_1_v1",
            JSON.stringify({
              ...authorization,
              approver_title: "Different replay"
            })
          ]
        )
      ),
    "A successful submission request ID must reject replay with different authorization bytes."
  );
  const serverAuthorization = (
    await db.query(
      `select approver_user_id, approver_work_email, authorization_timestamp
       from public.partner_onboarding_authorizations
       where request_id = $1`,
      [submitRequest]
    )
  ).rows[0];
  assert(
    serverAuthorization.approver_user_id === ids.userA &&
      serverAuthorization.approver_work_email === "admin-a@example.test" &&
      serverAuthorization.authorization_timestamp,
    "Final authorization actor, work email, and time must derive from authoritative server data."
  );

  const firstChangeRequest = await invokeServiceMutation(() =>
    db.query(
      `select * from public.rcap_service_review_onboarding(
         $1, $2, $3, $4, $5, $6, $7::jsonb
       )`,
      [
        "partner-a",
        ids.userInternal,
        ids.workspaceA,
        Number(submit.rows[0].workspace_aggregate_version),
        "83000000-0000-4000-8000-000000000016",
        "4".repeat(64),
        JSON.stringify({
          action: "request_changes",
          sectionKey: "organization_contacts",
          instructions: "Confirm the updated public organization details."
        })
      ]
    )
  );
  let lifecycleState = (
    await db.query(
      `select po.status as workspace_status, po.blocker_code,
              po.next_action_code, po.next_action_owner,
              section.status as section_status, section.revision
       from public.partner_onboarding po
       join public.partner_onboarding_sections section
         on section.workspace_id = po.id
        and section.section_key = 'organization_contacts'
       where po.id = $1`,
      [ids.workspaceA]
    )
  ).rows[0];
  assert(
    lifecycleState.workspace_status === "waiting_on_partner" &&
      lifecycleState.blocker_code === "partner_changes_requested" &&
      lifecycleState.next_action_code === "address_change_request" &&
      lifecycleState.next_action_owner === "partner" &&
      lifecycleState.section_status === "needs_changes",
    "LegalEase change requests must move the section and workspace to a partner-owned action."
  );

  const firstPartnerResponse = await invokeServiceMutation(() =>
    db.query(
      `select * from public.rcap_service_save_onboarding_section(
         $1, $2, $3, 'organization_contacts', $4, $5,
         '{"legal_organization_name":"Partner A confirmed"}'::jsonb,
         '{"contacts":[]}'::jsonb, 'section_complete',
         100, '{}'::text[], 100, null,
         'await_legalease_review', 'legalease', $6, $7
       )`,
      [
        "partner-a",
        ids.userA,
        ids.workspaceA,
        Number(lifecycleState.revision),
        Number(firstChangeRequest.rows[0].workspace_aggregate_version),
        "83000000-0000-4000-8000-000000000017",
        "5".repeat(64)
      ]
    )
  );
  lifecycleState = (
    await db.query(
      `select po.status as workspace_status, po.blocker_code,
              po.next_action_code, po.next_action_owner,
              section.status as section_status, section.revision,
              cr.status as change_status
       from public.partner_onboarding po
       join public.partner_onboarding_sections section
         on section.workspace_id = po.id
        and section.section_key = 'organization_contacts'
       join public.partner_onboarding_change_requests cr
         on cr.section_id = section.id
        and cr.status = 'partner_responded'
       where po.id = $1`,
      [ids.workspaceA]
    )
  ).rows[0];
  assert(
    lifecycleState.workspace_status === "ready_for_review" &&
      lifecycleState.blocker_code === null &&
      lifecycleState.next_action_code === "await_legalease_review" &&
      lifecycleState.next_action_owner === "legalease" &&
      lifecycleState.section_status === "submitted" &&
      lifecycleState.change_status === "partner_responded",
    "A partner response must remain operationally unresolved while ownership returns to LegalEase."
  );

  const additionalChanges = await invokeServiceMutation(() =>
    db.query(
      `select * from public.rcap_service_review_onboarding(
         $1, $2, $3, $4, $5, $6, $7::jsonb
       )`,
      [
        "partner-a",
        ids.userInternal,
        ids.workspaceA,
        Number(firstPartnerResponse.rows[0].workspace_aggregate_version),
        "83000000-0000-4000-8000-000000000018",
        "6".repeat(64),
        JSON.stringify({
          action: "request_changes",
          sectionKey: "organization_contacts",
          instructions: "Please add one final confirmation."
        })
      ]
    )
  );
  const changeCounts = (
    await db.query(
      `select status, count(*)::int as count
       from public.partner_onboarding_change_requests
       where workspace_id = $1
         and section_id = $2
       group by status`,
      [ids.workspaceA, ids.sectionA]
    )
  ).rows;
  assert(
    changeCounts.find((row) => row.status === "open")?.count === 1 &&
      changeCounts.find((row) => row.status === "resolved")?.count === 1,
    "Requesting additional changes must resolve the prior response and create one new open request."
  );
  lifecycleState = (
    await db.query(
      `select status as workspace_status, blocker_code,
              next_action_code, next_action_owner
       from public.partner_onboarding
       where id = $1`,
      [ids.workspaceA]
    )
  ).rows[0];
  assert(
    lifecycleState.workspace_status === "waiting_on_partner" &&
      lifecycleState.blocker_code === "partner_changes_requested" &&
      lifecycleState.next_action_owner === "partner",
    "Additional LegalEase changes must return action ownership to the partner."
  );

  const latestSectionRevision = Number(
    (
      await db.query(
        `select revision
         from public.partner_onboarding_sections
         where id = $1`,
        [ids.sectionA]
      )
    ).rows[0].revision
  );
  const secondPartnerResponse = await invokeServiceMutation(() =>
    db.query(
      `select * from public.rcap_service_save_onboarding_section(
         $1, $2, $3, 'organization_contacts', $4, $5,
         '{"legal_organization_name":"Partner A final confirmation"}'::jsonb,
         '{"contacts":[]}'::jsonb, 'section_complete',
         100, '{}'::text[], 100, null,
         'await_legalease_review', 'legalease', $6, $7
       )`,
      [
        "partner-a",
        ids.userA,
        ids.workspaceA,
        latestSectionRevision,
        Number(additionalChanges.rows[0].workspace_aggregate_version),
        "83000000-0000-4000-8000-000000000019",
        "7".repeat(64)
      ]
    )
  );
  const approved = await invokeServiceMutation(() =>
    db.query(
      `select * from public.rcap_service_review_onboarding(
         $1, $2, $3, $4, $5, $6, $7::jsonb
       )`,
      [
        "partner-a",
        ids.userInternal,
        ids.workspaceA,
        Number(secondPartnerResponse.rows[0].workspace_aggregate_version),
        "83000000-0000-4000-8000-000000000020",
        "8".repeat(64),
        JSON.stringify({
          action: "approve_section",
          sectionKey: "organization_contacts",
          reason: "Partner response approved."
        })
      ]
    )
  );
  const resolvedLifecycle = (
    await db.query(
      `select po.status as workspace_status, po.blocker_code,
              po.next_action_code, po.next_action_owner,
              section.status as section_status,
              count(*) filter (
                where cr.status in ('open', 'partner_responded')
              )::int as unresolved_count
       from public.partner_onboarding po
       join public.partner_onboarding_sections section
         on section.workspace_id = po.id
        and section.section_key = 'organization_contacts'
       left join public.partner_onboarding_change_requests cr
         on cr.section_id = section.id
       where po.id = $1
       group by po.status, po.blocker_code, po.next_action_code,
                po.next_action_owner, section.status`,
      [ids.workspaceA]
    )
  ).rows[0];
  assert(
    approved.rows[0].workspace_status === "ready_for_review" &&
      resolvedLifecycle.workspace_status === "ready_for_review" &&
      resolvedLifecycle.blocker_code === null &&
      resolvedLifecycle.next_action_code === "await_legalease_review" &&
      resolvedLifecycle.next_action_owner === "legalease" &&
      resolvedLifecycle.section_status === "approved" &&
      resolvedLifecycle.unresolved_count === 0,
    "LegalEase approval must resolve the operational request and recalculate section/workspace ownership."
  );

  await db.query(
    `update public.partner_onboarding
     set status = 'waiting_on_partner'
     where id = $1`,
    [ids.workspaceA]
  );
  const approvedSectionVersions = (
    await db.query(
      `select po.aggregate_version, section.revision
       from public.partner_onboarding po
       join public.partner_onboarding_sections section
         on section.workspace_id = po.id
        and section.section_key = 'organization_contacts'
       where po.id = $1`,
      [ids.workspaceA]
    )
  ).rows[0];
  await expectRejected(
    () =>
      invokeServiceMutation(() =>
        db.query(
          `select * from public.rcap_service_save_onboarding_section(
             $1, $2, $3, 'organization_contacts', $4, $5,
             '{"legal_organization_name":"Unauthorized approved edit"}'::jsonb,
             '{"contacts":[]}'::jsonb, 'draft_save',
             100, '{}'::text[], 100, null,
             'await_legalease_review', 'legalease', $6, $7
           )`,
          [
            "partner-a",
            ids.userA,
            ids.workspaceA,
            Number(approvedSectionVersions.revision),
            Number(approvedSectionVersions.aggregate_version),
            "83000000-0000-4000-8000-000000000097",
            "9".repeat(64)
          ]
        )
      ),
    "A partner must not alter an approved section even while another requested section makes the workspace editable."
  );
}
