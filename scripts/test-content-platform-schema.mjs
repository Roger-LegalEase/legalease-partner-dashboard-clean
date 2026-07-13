/**
 * Phase 43 content platform — hermetic schema + RLS verification.
 *
 * Runs the REAL migration (supabase/phase-43-content-platform.sql, on top of its real phase-21
 * dependency) inside an isolated in-memory PGlite Postgres, then exercises the policies as an
 * actual unprivileged role.
 *
 * Why this goes further than the existing PGlite verifiers: those skip any migration touching
 * auth.* because PGlite has no Supabase auth schema, which means RLS is only ever string-asserted.
 * Here we stub `auth` (users table + uid()/role() reading request.jwt.claim.*) and then
 * `set role anon` / `set role authenticated`, so RLS is genuinely ENFORCED rather than inspected.
 * PGlite's default session is superuser, which bypasses RLS — every RLS assertion below therefore
 * runs inside a transaction under an explicit non-superuser role.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

const ADMIN_USER = "11111111-1111-4111-8111-111111111111";
const EDITOR_USER = "22222222-2222-4222-8222-222222222222";
const PARTNER_A_USER = "33333333-3333-4333-8333-333333333333";
const PARTNER_B_USER = "44444444-4444-4444-8444-444444444444";
const LEGAL_USER = "55555555-5555-4555-8555-555555555555";

try {
  const db = new PGlite();
  await db.exec("create role anon; create role authenticated; create role service_role;");
  await db.exec(authSchemaStub());
  await db.exec(read("supabase/partner-journey-os.sql"));
  await db.exec(read("supabase/phase-21-partner-auth-rls-foundation.sql"));
  await db.exec(read("supabase/phase-43-content-platform.sql"));

  // Supabase grants table privileges to anon/authenticated; RLS then narrows them. Mirror that,
  // otherwise a denial below could be a missing GRANT rather than the policy we mean to test.
  await db.exec(`
    grant usage on schema public to anon, authenticated;
    grant select, insert, update, delete on all tables in schema public to authenticated;
    grant select on all tables in schema public to anon;
  `);

  await seed(db);

  await verifySchemaShape(db);
  await verifyLegalReviewBackstop(db);
  await verifySlugUniqueness(db);
  await verifyUpdatedAtTrigger(db);
  await verifyAuditAppendOnly(db);
  await verifyPublicCannotSeeNonPublic(db);
  await verifyPartnerContributorScoping(db);
  await verifyOutboxIsServiceRoleOnly(db);
  await verifyOutboxIdempotency(db);
  await verifyTestimonialConsentBackstop(db);

  await db.close();
} catch (error) {
  failures.push(error instanceof Error ? (error.stack ?? error.message) : String(error));
}

if (failures.length) {
  console.error("Content platform schema verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Content platform schema verification passed.");
console.log("Real storage: phase-21 + phase-43 migrations executed in isolated PGlite PostgreSQL.");
console.log("RLS enforced under a real unprivileged role: anon cannot read draft/scheduled/in-review/archived posts.");
console.log("Partner contributors are row-scoped to their own organization and cannot read another partner's draft.");
console.log("Legal-review, testimonial-consent, slug-uniqueness, and append-only-audit backstops are DB-enforced.");

// --- verifications ------------------------------------------------------------------------------

async function verifySchemaShape(db) {
  const expectedTables = [
    "content_admin_users",
    "content_authors",
    "content_categories",
    "content_tags",
    "content_post_tags",
    "content_posts",
    "content_post_versions",
    "content_media",
    "content_media_usages",
    "content_testimonials",
    "content_state_editorial",
    "content_reviews",
    "content_publications",
    "content_social_drafts",
    "content_social_assets",
    "content_campaigns",
    "content_campaign_channels",
    "content_promotion_outbox",
    "content_audit_events"
  ];

  const result = await db.query(
    `select table_name from information_schema.tables
     where table_schema = 'public' and table_name like 'content_%'`
  );
  const present = new Set(result.rows.map((row) => row.table_name));
  for (const table of expectedTables) {
    assert(present.has(table), `Missing table public.${table}.`);
  }

  // Every content table must have RLS enabled — a table without it is a silent public read.
  const rls = await db.query(
    `select c.relname, c.relrowsecurity
     from pg_class c
     join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname like 'content_%' and c.relkind = 'r'`
  );
  for (const row of rls.rows) {
    assert(row.relrowsecurity === true, `RLS is not enabled on public.${row.relname}.`);
  }
}

async function verifyLegalReviewBackstop(db) {
  // A state_resource cannot be published without a recorded legal approval.
  await rejects(
    db,
    `insert into public.content_posts (slug, destination, content_type, status, title, published_at)
     values ('illegal-state-post', 'expungement_ai', 'state_resource', 'published', 'Nope', now())`,
    "A state_resource must not be publishable without legal_approved_at."
  );

  // Same for a legal_sensitive blog article.
  await rejects(
    db,
    `insert into public.content_posts (slug, destination, content_type, status, title, published_at, legal_sensitive)
     values ('illegal-sensitive', 'expungement_ai', 'blog_article', 'published', 'Nope', now(), true)`,
    "A legal_sensitive post must not be publishable without legal_approved_at."
  );

  // With legal approval recorded, it is allowed.
  await db.query(
    `insert into public.content_posts (slug, destination, content_type, status, title, published_at, legal_approved_at)
     values ('legal-ok', 'expungement_ai', 'state_resource', 'published', 'OK', now(), now())`
  );

  // A non-legal blog article needs no legal approval.
  await db.query(
    `insert into public.content_posts (slug, destination, content_type, status, title, published_at)
     values ('plain-ok', 'expungement_ai', 'blog_article', 'published', 'OK', now())`
  );
}

async function verifySlugUniqueness(db) {
  await db.query(
    `insert into public.content_posts (slug, destination, content_type, status, title)
     values ('dupe', 'expungement_ai', 'blog_article', 'draft', 'One')`
  );
  await rejects(
    db,
    `insert into public.content_posts (slug, destination, content_type, status, title)
     values ('dupe', 'expungement_ai', 'blog_article', 'draft', 'Two')`,
    "Slug must be unique per (destination, locale)."
  );
  // The same slug on the OTHER destination is a different article and must be allowed.
  await db.query(
    `insert into public.content_posts (slug, destination, content_type, status, title)
     values ('dupe', 'legalease_partner', 'partner_insight', 'draft', 'Different site')`
  );
}

async function verifyUpdatedAtTrigger(db) {
  const before = await one(db, `select updated_at from public.content_posts where slug = 'dupe' and destination = 'expungement_ai'`);
  await db.query(`update public.content_posts set title = 'One (edited)' where slug = 'dupe' and destination = 'expungement_ai'`);
  const after = await one(db, `select updated_at from public.content_posts where slug = 'dupe' and destination = 'expungement_ai'`);
  assert(
    new Date(after.updated_at).getTime() >= new Date(before.updated_at).getTime(),
    "set_content_posts_updated_at trigger must advance updated_at."
  );
}

async function verifyAuditAppendOnly(db) {
  await db.query(
    `insert into public.content_audit_events (action, entity_type, entity_id)
     values ('published', 'content_post', 'abc')`
  );
  // Superuser here — so this proves the TRIGGER blocks mutation, not merely a missing RLS policy.
  await rejects(
    db,
    `update public.content_audit_events set action = 'tampered'`,
    "content_audit_events must reject UPDATE even for a superuser/service_role caller."
  );
  await rejects(
    db,
    `delete from public.content_audit_events`,
    "content_audit_events must reject DELETE even for a superuser/service_role caller."
  );
}

async function verifyPublicCannotSeeNonPublic(db) {
  // Seed one row in every non-public status, plus a future-dated "published" row.
  await db.query(`
    insert into public.content_posts (slug, destination, content_type, status, title, scheduled_for, published_at)
    values
      ('s-draft',      'expungement_ai', 'blog_article', 'draft',              'Draft',     null, null),
      ('s-editorial',  'expungement_ai', 'blog_article', 'in_editorial_review','Editorial', null, null),
      ('s-legal',      'expungement_ai', 'blog_article', 'in_legal_review',    'Legal',     null, null),
      ('s-approved',   'expungement_ai', 'blog_article', 'approved',           'Approved',  null, null),
      ('s-scheduled',  'expungement_ai', 'blog_article', 'scheduled',          'Scheduled', now() + interval '1 day', null),
      ('s-archived',   'expungement_ai', 'blog_article', 'archived',           'Archived',  null, null),
      ('s-future',     'expungement_ai', 'blog_article', 'published',          'Future',    null, now() + interval '1 day')
  `);

  const visible = await asRole(db, "anon", null, `select slug from public.content_posts order by slug`);
  const slugs = visible.map((row) => row.slug);

  for (const hidden of ["s-draft", "s-editorial", "s-legal", "s-approved", "s-scheduled", "s-archived", "s-future"]) {
    assert(!slugs.includes(hidden), `anon must not be able to read a '${hidden}' post through RLS.`);
  }
  assert(slugs.includes("plain-ok"), "anon must be able to read a genuinely published post.");
  assert(slugs.includes("legal-ok"), "anon must be able to read a legally-approved published post.");
}

async function verifyPartnerContributorScoping(db) {
  await db.query(`
    insert into public.content_posts (slug, destination, content_type, status, title, partner_slug, created_by)
    values
      ('partner-a-draft', 'legalease_partner', 'partner_story', 'draft', 'A draft', 'partner-a', $1),
      ('partner-b-draft', 'legalease_partner', 'partner_story', 'draft', 'B draft', 'partner-b', $2)
  `, [PARTNER_A_USER, PARTNER_B_USER]);

  const aSees = await asRole(db, "authenticated", PARTNER_A_USER, `select slug from public.content_posts order by slug`);
  const aSlugs = aSees.map((row) => row.slug);

  assert(aSlugs.includes("partner-a-draft"), "partner-a contributor must see their own draft.");
  assert(
    !aSlugs.includes("partner-b-draft"),
    "partner-a contributor MUST NOT see partner-b's draft (cross-partner leak)."
  );
  assert(
    !aSlugs.includes("s-draft"),
    "partner contributor must not see LegalEase internal drafts."
  );

  // An editor sees everything.
  const editorSees = await asRole(db, "authenticated", EDITOR_USER, `select slug from public.content_posts`);
  const editorSlugs = editorSees.map((row) => row.slug);
  assert(editorSlugs.includes("partner-a-draft") && editorSlugs.includes("s-draft"), "An editor must see all drafts.");

  // A partner contributor must not be able to write a row for another partner.
  await rejectsAsRole(
    db,
    "authenticated",
    PARTNER_A_USER,
    `insert into public.content_posts (slug, destination, content_type, status, title, partner_slug)
     values ('steal', 'legalease_partner', 'partner_story', 'draft', 'Steal', 'partner-b')`,
    "partner-a contributor must not be able to insert a post owned by partner-b."
  );

  // ...and must not be able to publish even their own post.
  await rejectsAsRole(
    db,
    "authenticated",
    PARTNER_A_USER,
    `update public.content_posts set status = 'published', published_at = now() where slug = 'partner-a-draft'`,
    "partner contributor must not be able to publish."
  );
}

async function verifyOutboxIsServiceRoleOnly(db) {
  await db.query(
    `insert into public.content_promotion_outbox (event_type, idempotency_key, payload)
     values ('content.promotion.requested', 'key-1', '{"a":1}'::jsonb)`
  );

  // Even a primary admin's browser session must not read delivery state.
  const adminSees = await asRole(db, "authenticated", ADMIN_USER, `select event_id from public.content_promotion_outbox`);
  assert(adminSees.length === 0, "The outbox must be invisible to an authenticated primary_admin session (service-role only).");

  const anonSees = await asRole(db, "anon", null, `select event_id from public.content_promotion_outbox`);
  assert(anonSees.length === 0, "The outbox must be invisible to anon.");
}

async function verifyOutboxIdempotency(db) {
  await rejects(
    db,
    `insert into public.content_promotion_outbox (event_type, idempotency_key, payload)
     values ('content.promotion.requested', 'key-1', '{"a":2}'::jsonb)`,
    "Outbox idempotency_key must be unique so a retry cannot enqueue a duplicate delivery."
  );
}

async function verifyTestimonialConsentBackstop(db) {
  await rejects(
    db,
    `insert into public.content_testimonials (quote, attribution, approved, consent_status)
     values ('Great', 'Someone', true, 'unknown')`,
    "A testimonial must not be approvable without a recorded consent basis."
  );
  await db.query(
    `insert into public.content_testimonials (quote, attribution, approved, consent_status)
     values ('Great', 'Someone', true, 'written_consent')`
  );
}

// --- harness ------------------------------------------------------------------------------------

async function seed(db) {
  await db.query(`insert into auth.users (id) values ($1), ($2), ($3), ($4), ($5)`, [
    ADMIN_USER,
    EDITOR_USER,
    PARTNER_A_USER,
    PARTNER_B_USER,
    LEGAL_USER
  ]);

  await db.query(
    `insert into public.content_admin_users (auth_user_id, content_role, partner_slug)
     values ($1, 'primary_admin', null),
            ($2, 'editor', null),
            ($3, 'partner_contributor', 'partner-a'),
            ($4, 'partner_contributor', 'partner-b'),
            ($5, 'legal_reviewer', null)`,
    [ADMIN_USER, EDITOR_USER, PARTNER_A_USER, PARTNER_B_USER, LEGAL_USER]
  );
}

/**
 * Run a query as a real unprivileged Postgres role with a Supabase-shaped JWT claim set, inside a
 * transaction so the role reset cannot leak into the next assertion. This is what makes RLS
 * actually apply (PGlite's default session is superuser and bypasses it).
 */
async function asRole(db, role, userId, sql, params = []) {
  await db.exec("begin");
  try {
    await db.query(`select set_config('request.jwt.claim.role', $1, true)`, [role]);
    await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? ""]);
    await db.exec(`set local role ${role}`);
    const result = await db.query(sql, params);
    return result.rows;
  } finally {
    await db.exec("rollback");
  }
}

async function rejectsAsRole(db, role, userId, sql, message) {
  let rejected = false;
  try {
    await asRole(db, role, userId, sql);
  } catch {
    rejected = true;
  }
  assert(rejected, message);
}

async function rejects(db, sql, message) {
  let rejected = false;
  await db.exec("begin");
  try {
    await db.query(sql);
  } catch {
    rejected = true;
  } finally {
    await db.exec("rollback");
  }
  assert(rejected, message);
}

async function one(db, sql, params = []) {
  const result = await db.query(sql, params);
  assert(result.rows.length === 1, `Expected exactly one row for: ${sql}`);
  return result.rows[0];
}

/**
 * Minimal Supabase-shaped auth schema. auth.uid()/auth.role() read the same request.jwt.claim.*
 * GUCs Supabase sets, so the migration's policies run unmodified.
 */
function authSchemaStub() {
  return `
    create schema if not exists auth;
    create table if not exists auth.users (id uuid primary key);

    create or replace function auth.uid()
    returns uuid
    language sql
    stable
    as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

    create or replace function auth.role()
    returns text
    language sql
    stable
    as $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;

    grant usage on schema auth to anon, authenticated, service_role;
  `;
}

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}
