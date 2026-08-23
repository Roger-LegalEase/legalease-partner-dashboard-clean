/**
 * Applies the real internal-admin hardening migration in isolated PGlite and
 * exercises the affected functions, RLS policies, service boundary, public
 * views, tenant policies, and data-preservation contract.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationPath = "supabase/migrations/20260823171000_internal_admin_authority_hardening.sql";
const migration = read(migrationPath);

const ids = {
  internal: "40000000-0000-4000-8000-000000000001",
  inactive: "40000000-0000-4000-8000-000000000002",
  revoked: "40000000-0000-4000-8000-000000000003",
  contentOnly: "40000000-0000-4000-8000-000000000004",
  viewer: "40000000-0000-4000-8000-000000000005",
  staff: "40000000-0000-4000-8000-000000000006",
  partnerAdmin: "40000000-0000-4000-8000-000000000007",
  participant: "40000000-0000-4000-8000-000000000008",
  external: "40000000-0000-4000-8000-000000000009",
  corporate: "40000000-0000-4000-8000-000000000010",
  tenantBAdmin: "40000000-0000-4000-8000-000000000011"
};

verifyMigrationSource();

const db = new PGlite();
try {
  await db.exec("create role anon; create role authenticated; create role service_role bypassrls;");
  await db.exec(authSchemaStub());
  await db.exec(`
    grant usage on schema public to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant usage, select on sequences to anon, authenticated, service_role;
    alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  `);
  await db.exec(read("supabase/partner-journey-os.sql"));
  await db.exec(read("supabase/phase-21-partner-auth-rls-foundation.sql"));
  await db.exec(read("supabase/phase-29-consumer-wilma-telemetry.sql"));
  await db.exec(read("supabase/phase-31-legalease-os-support-queue.sql"));
  await db.exec(read("supabase/phase-43-content-platform.sql"));
  await seed(db);

  const historicalBefore = await historicalSnapshot(db);
  await db.exec(migration);
  const historicalAfter = await historicalSnapshot(db);
  assert.deepEqual(historicalAfter, historicalBefore, "migration must not rewrite historical rows");

  await verifyPolicyShape(db);
  await verifyIdentityMatrix(db);
  await verifyInternalAdminAccess(db);
  await verifyServiceRole(db);
  await verifyPublicView(db);
  await verifyTenantIsolation(db);
} finally {
  await db.close();
}

console.log("Internal admin RLS hardening: isolated migration boundary suite passed.");
console.log("Production/external databases used: none.");

function verifyMigrationSource() {
  for (const marker of [
    "create or replace function public.content_current_role()",
    "when public.is_internal_admin() then 'primary_admin'::text",
    "else null::text",
    'drop policy if exists "consumer wilma telemetry internal safety select"',
    "using (public.is_internal_admin())",
    "drop policy if exists legalease_os_support_items_internal_admin_all",
    "with check (public.is_internal_admin())"
  ]) {
    assert.ok(migration.includes(marker), `migration missing ${marker}`);
  }
  assert.ok(!/content_admin_users\s+cau/iu.test(migration), "content role table must not authorize the resolver");
  assert.ok(!/^\s*(insert|update|delete|truncate)\s/imu.test(stripSqlComments(migration)), "migration must not mutate data rows");
  assert.ok(!/^\s*(drop\s+(table|column)|alter\s+table[\s\S]*?drop\s+column)\b/imu.test(stripSqlComments(migration)), "migration must not remove schema objects");
  for (const forbidden of ["user_metadata", "app_metadata", "@legalease", "@gmail", "email like", "email ="] ) {
    assert.ok(!migration.toLowerCase().includes(forbidden), `migration must not authorize through ${forbidden}`);
  }
}

async function verifyPolicyShape(db) {
  const fn = await one(db, `select pg_get_functiondef('public.content_current_role()'::regprocedure) as definition`);
  assert.ok(fn.definition.includes("public.is_internal_admin()"));
  assert.ok(!fn.definition.includes("content_admin_users"));
  assert.ok(fn.definition.includes("SET search_path TO ''"));

  const wilma = await policy(db, "consumer_wilma_telemetry", "consumer wilma telemetry internal safety select");
  assert.match(wilma.qual, /is_internal_admin/u);
  assert.ok(!wilma.qual.includes("partner_users"));
  assert.deepEqual(wilma.roles, ["authenticated"]);

  const support = await policy(db, "legalease_os_support_items", "legalease_os_support_items_internal_admin_all");
  assert.match(support.qual, /is_internal_admin/u);
  assert.match(support.with_check, /is_internal_admin/u);
  assert.ok(!support.qual.includes("partner_users"));
  assert.deepEqual(support.roles, ["authenticated"]);
}

async function verifyIdentityMatrix(db) {
  for (const [id, label] of [
    [ids.contentOnly, "content primary_admin row without internal membership"],
    [ids.inactive, "inactive internal administrator"],
    [ids.revoked, "revoked internal administrator"],
    [ids.viewer, "partner viewer"],
    [ids.staff, "partner staff"],
    [ids.partnerAdmin, "partner administrator"],
    [ids.participant, "ordinary participant"],
    [ids.external, "external-email authenticated user"],
    [ids.corporate, "corporate-domain user without membership"]
  ]) {
    assert.equal(await scalarAs(db, "authenticated", id, "select public.content_current_role()"), null, `${label} obtained a privileged content role`);
    assert.equal(await countAs(db, "authenticated", id, "select id from public.consumer_wilma_telemetry"), 0, `${label} read Wilma telemetry`);
    assert.equal(await countAs(db, "authenticated", id, "select id from public.legalease_os_support_items"), 0, `${label} read support records`);
  }

  assert.equal(await countAs(db, "anon", null, "select id from public.consumer_wilma_telemetry"), 0, "unauthenticated user read telemetry");
  assert.equal(await countAs(db, "anon", null, "select id from public.legalease_os_support_items"), 0, "unauthenticated user read support records");

  const forgedMetadataRole = await scalarAs(db, "authenticated", ids.external, "select public.content_current_role()");
  assert.equal(forgedMetadataRole, null, "client-controlled metadata manufactured internal access");
  assert.equal(await countAs(db, "authenticated", ids.contentOnly, "select post_id from public.content_posts"), 0, "content-only identity read an internal draft/base table");
  await assertDenied(db, "authenticated", ids.contentOnly, `
    insert into public.content_posts
      (slug, destination, content_type, status, title, doc)
    values ('forbidden-content-write','expungement_ai','blog_article','draft','Forbidden',
      '{"type":"doc","content":[]}'::jsonb)
  `, "content-role-only identity wrote an internal content row");
  await assertDenied(db, "authenticated", ids.external, `
    insert into public.legalease_os_support_items
      (source, channel, type, category, status, priority, email, message_redacted, route_submitted_from)
    values ('expungement_ai','web_support_form','support_request','general_contact','new','normal',
      'forbidden@personal.test','Forbidden metadata-claim write','/synthetic-forbidden')
  `, "metadata-claim identity wrote a support row");
  await assertDenied(db, "authenticated", ids.external,
    `update auth.users set raw_app_meta_data='{"role":"internal_admin"}'::jsonb where id='${ids.external}'`,
    "authenticated client wrote Auth claims");
}

async function verifyInternalAdminAccess(db) {
  assert.equal(await scalarAs(db, "authenticated", ids.internal, "select public.content_current_role()"), "primary_admin");
  assert.equal(await countAs(db, "authenticated", ids.internal, "select id from public.consumer_wilma_telemetry"), 1);
  assert.equal(await countAs(db, "authenticated", ids.internal, "select id from public.legalease_os_support_items"), 1);

  const inserted = await asRole(db, "authenticated", ids.internal, `
    insert into public.legalease_os_support_items
      (source, channel, type, category, status, priority, email, message_redacted, route_submitted_from)
    values
      ('expungement_ai', 'web_support_form', 'support_request', 'technical_issue', 'new', 'normal',
       'synthetic-admin-operation@example.test', 'Synthetic support row', '/synthetic')
    returning id
  `, { commit: true });
  assert.equal(inserted.length, 1, "active internal admin could not insert support record");
  const insertedId = inserted[0].id;
  assert.equal((await asRole(db, "authenticated", ids.internal,
    `update public.legalease_os_support_items set status='in_review' where id='${insertedId}' returning status`,
    { commit: true }))[0]?.status, "in_review");
  assert.equal((await asRole(db, "authenticated", ids.internal,
    `delete from public.legalease_os_support_items where id='${insertedId}' returning id`,
    { commit: true })).length, 1);
}

async function verifyServiceRole(db) {
  assert.equal(await countAs(db, "service_role", null, "select id from public.consumer_wilma_telemetry"), 1);
  assert.equal(await countAs(db, "service_role", null, "select id from public.legalease_os_support_items"), 1);
  assert.ok(await countAs(db, "service_role", null, "select post_id from public.content_posts") >= 2);

  const supportInsert = await asRole(db, "service_role", null, `
    insert into public.legalease_os_support_items
      (source, channel, type, category, status, priority, email, message_redacted, route_submitted_from)
    values ('expungement_ai', 'web_support_form', 'support_request', 'general_contact', 'new', 'normal',
      'synthetic-service@example.test', 'Synthetic service row', '/synthetic-service') returning id
  `);
  assert.equal(supportInsert.length, 1, "service role support insert failed");
}

async function verifyPublicView(db) {
  const rows = await asRole(db, "anon", null, "select slug from public.content_public_posts order by slug");
  assert.deepEqual(rows.map((row) => row.slug), ["public-synthetic-post"]);
}

async function verifyTenantIsolation(db) {
  const own = await asRole(db, "authenticated", ids.partnerAdmin,
    "select partner_slug from public.partner_records order by partner_slug");
  assert.deepEqual(own.map((row) => row.partner_slug), ["synthetic-a"]);
  const other = await asRole(db, "authenticated", ids.partnerAdmin,
    "select partner_slug from public.partner_records where partner_slug='synthetic-b'");
  assert.equal(other.length, 0, "partner admin crossed tenant boundary");
  const staff = await asRole(db, "authenticated", ids.staff,
    "select partner_slug from public.partner_records order by partner_slug");
  assert.deepEqual(staff.map((row) => row.partner_slug), ["synthetic-a"]);
}

async function seed(db) {
  await db.query(`
    insert into auth.users (id, email, raw_app_meta_data, raw_user_meta_data)
    values
      ($1,'internal@synthetic.test','{}','{}'),
      ($2,'inactive@synthetic.test','{}','{}'),
      ($3,'revoked@synthetic.test','{}','{}'),
      ($4,'content@synthetic.test','{}','{}'),
      ($5,'viewer@synthetic.test','{}','{}'),
      ($6,'staff@synthetic.test','{}','{}'),
      ($7,'partner-admin@synthetic.test','{}','{}'),
      ($8,'participant@synthetic.test','{}','{}'),
      ($9,'external@personal.test','{"role":"internal_admin"}','{"role":"internal_admin"}'),
      ($10,'employee@legalease.test','{}','{}'),
      ($11,'other-admin@synthetic.test','{}','{}')
  `, Object.values(ids));
  await db.exec(`
    insert into public.partner_records (partner_id, partner_slug, partner_name, program_tier)
    values
      ('synthetic-a','synthetic-a','Synthetic A','pilot'),
      ('synthetic-b','synthetic-b','Synthetic B','pilot');

    insert into public.partner_users (auth_user_id, partner_slug, role, status) values
      ('${ids.internal}',null,'internal_admin','active'),
      ('${ids.inactive}',null,'internal_admin','disabled'),
      ('${ids.revoked}',null,'internal_admin','disabled'),
      ('${ids.staff}','synthetic-a','partner_staff','active'),
      ('${ids.partnerAdmin}','synthetic-a','partner_admin','active'),
      ('${ids.tenantBAdmin}','synthetic-b','partner_admin','active');

    insert into public.content_admin_users (auth_user_id, content_role, status) values
      ('${ids.contentOnly}','primary_admin','active'),
      ('${ids.viewer}','viewer','active');

    insert into public.consumer_wilma_telemetry
      (exchange_id, session_id, occurred_at, state, user_message_redacted, wilma_response_redacted,
       model_version, system_prompt_version)
    values ('synthetic-exchange','synthetic-session',now(),'MS','question','answer','synthetic-model','synthetic-prompt');

    insert into public.legalease_os_support_items
      (source, channel, type, category, status, priority, email, message_redacted, route_submitted_from)
    values ('expungement_ai','web_support_form','support_request','general_contact','new','normal',
      'synthetic-customer@example.test','Synthetic redacted message','/synthetic-support');

    insert into public.content_posts
      (slug, destination, content_type, status, title, doc, rendered_html, published_at)
    values
      ('public-synthetic-post','expungement_ai','blog_article','published','Public synthetic post',
       '{"type":"doc","content":[]}'::jsonb,'<p>Public</p>',now() - interval '1 day'),
      ('draft-synthetic-post','expungement_ai','blog_article','draft','Draft synthetic post',
       '{"type":"doc","content":[]}'::jsonb,null,null);
  `);
}

async function historicalSnapshot(db) {
  const result = await db.query(`
    select 'content_roles' as source, count(*)::int as row_count,
           coalesce(jsonb_agg(jsonb_build_object('auth_user_id',auth_user_id,'content_role',content_role,'status',status) order by auth_user_id), '[]') as rows
      from public.content_admin_users
    union all
    select 'support', count(*)::int,
           coalesce(jsonb_agg(jsonb_build_object('id',id,'status',status,'source',source) order by id), '[]')
      from public.legalease_os_support_items
    union all
    select 'wilma', count(*)::int,
           coalesce(jsonb_agg(jsonb_build_object('id',id,'exchange_id',exchange_id) order by id), '[]')
      from public.consumer_wilma_telemetry
    order by source
  `);
  return result.rows;
}

async function policy(db, table, name) {
  return one(db, `select roles, qual, with_check from pg_policies where schemaname='public' and tablename='${table}' and policyname='${name}'`);
}

async function scalarAs(db, role, userId, sql) {
  const rows = await asRole(db, role, userId, sql);
  return Object.values(rows[0] ?? {})[0] ?? null;
}

async function countAs(db, role, userId, sql) {
  return (await asRole(db, role, userId, sql)).length;
}

async function assertDenied(db, role, userId, sql, message) {
  let denied = false;
  try {
    await asRole(db, role, userId, sql, { commit: true });
  } catch {
    denied = true;
  }
  assert.equal(denied, true, message);
}

async function asRole(db, role, userId, sql, { commit = false } = {}) {
  await db.exec("begin");
  try {
    await db.query("select set_config('request.jwt.claim.role', $1, true)", [role]);
    await db.query("select set_config('request.jwt.claim.sub', $1, true)", [userId ?? ""]);
    await db.exec(`set local role ${role}`);
    const result = await db.query(sql);
    await db.exec(commit ? "commit" : "rollback");
    return result.rows;
  } catch (error) {
    await db.exec("rollback");
    throw error;
  }
}

async function one(db, sql) {
  const result = await db.query(sql);
  assert.equal(result.rows.length, 1, `expected exactly one row for ${sql}`);
  return result.rows[0];
}

function authSchemaStub() {
  return `
    create schema if not exists auth;
    create table auth.users (
      id uuid primary key,
      email text,
      raw_app_meta_data jsonb not null default '{}'::jsonb,
      raw_user_meta_data jsonb not null default '{}'::jsonb
    );
    create or replace function auth.uid()
    returns uuid language sql stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    create or replace function auth.role()
    returns text language sql stable
    as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;
    grant usage on schema auth to anon, authenticated, service_role;
  `;
}

function stripSqlComments(value) {
  return value.replace(/^\s*--.*$/gmu, "");
}

function read(relative) {
  return fs.readFileSync(path.join(root, relative), "utf8");
}
