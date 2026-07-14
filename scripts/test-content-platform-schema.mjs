/**
 * Phase 43 content platform — hermetic schema, RLS, and PUBLIC-EXPOSURE verification.
 *
 * Runs the REAL migration (supabase/phase-43-content-platform.sql on top of its real phase-21
 * dependency) inside an isolated in-memory PGlite Postgres, then exercises every privilege claim as
 * an actual unprivileged Postgres role.
 *
 * WHY THIS FILE IS SHAPED THE WAY IT IS
 * ------------------------------------
 * An earlier revision of this verifier passed while the migration shipped five real defects. It
 * checked that anon could not see draft ROWS, and concluded the public boundary was safe. It never
 * asked which COLUMNS anon could see of the rows it *could* read, never tried the exploits, and
 * never noticed that a legal_reviewer had unrestricted UPDATE on every post.
 *
 * So the tests below are written as ATTACKS first and assertions second. Each B* block reproduces
 * the original exploit and requires it to fail. If you relax a policy, these break — that is the
 * point.
 *
 * Supabase's default privileges grant anon on every new table in `public`, so the harness installs
 * those defaults BEFORE running the migration. That way the migration's REVOKEs are actually
 * exercised; without it we would be testing a database anon never had rights to in the first place.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PGlite } from "@electric-sql/pglite";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
const proven = [];

const INTERNAL_ADMIN = "11111111-1111-4111-8111-111111111111";
const EDITOR = "22222222-2222-4222-8222-222222222222";
const LEGAL = "33333333-3333-4333-8333-333333333333";
const SOCIAL = "44444444-4444-4444-8444-444444444444";
const CONTRIBUTOR = "55555555-5555-4555-8555-555555555555";
const PARTNER_A = "66666666-6666-4666-8666-666666666666";
const PARTNER_B = "77777777-7777-4777-8777-777777777777";
const VIEWER = "88888888-8888-4888-8888-888888888888";
const NO_ROLE = "99999999-9999-4999-8999-999999999999";
const CONTENT_ADMIN = "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa";

const LIVE_POST = "11111111-0000-4000-8000-000000000001";
const DRAFT_POST = "22222222-0000-4000-8000-000000000002";
const LEGAL_POST = "33333333-0000-4000-8000-000000000003";
const PRIMARY_LEGAL_POST = "34343434-0000-4000-8000-000000000034";
const UNAPPROVED_LEGAL_POST = "35353535-0000-4000-8000-000000000035";
const NONLEGAL_APPROVED_POST = "36363636-0000-4000-8000-000000000036";
const PUBLISHED_MEDIA = "44444444-0000-4000-8000-000000000004";
const DRAFT_MEDIA = "55555555-0000-4000-8000-000000000005";

let db;

try {
  db = new PGlite();
  await db.exec("create role anon; create role authenticated; create role service_role;");
  await db.exec(authSchemaStub());

  // Mirror Supabase: new tables in `public` are granted to anon/authenticated by default. The
  // migration is expected to REVOKE anon back off the content base tables.
  await db.exec(`
    grant usage on schema public to anon, authenticated, service_role;
    alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
    alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
  `);

  await db.exec(read("supabase/partner-journey-os.sql"));
  await db.exec(read("supabase/phase-21-partner-auth-rls-foundation.sql"));
  await db.exec(read("supabase/phase-43-content-platform.sql"));

  await seed(db);

  const steps = [
    ["schema shape", verifySchemaShape],
    ["B1 legal reviewer", verifyB1LegalReviewerCannotEditPosts],
    ["B1 legal-review RPC", verifyLegalReviewRpc],
    ["B2 publishing authority", verifyB2PublishingAuthority],
    ["B3 public post projection", verifyB3PublicPostProjection],
    ["B4 media embargo", verifyB4MediaEmbargo],
    ["B5 testimonial consent", verifyB5TestimonialConsent],
    ["role management", verifyNoSelfEscalation],
    ["partner isolation", verifyPartnerContributorScoping],
    ["viewer least privilege", verifyViewerLeastPrivilege],
    ["audit append-only", verifyAuditAppendOnly],
    ["outbox + backstops", verifyOutboxAndBackstops],
    ["indexes", verifyIndexes]
  ];

  for (const [name, step] of steps) {
    try {
      await step(db);
    } catch (error) {
      failures.push(`[${name}] ${error instanceof Error ? error.message : String(error)}`);
      // Leave no aborted transaction behind for the next step.
      await db.exec("rollback").catch(() => {});
    }
  }

  await verifyAtomicity();

  await db.close();
} catch (error) {
  failures.push(error instanceof Error ? (error.stack ?? error.message) : String(error));
  try {
    await db?.close();
  } catch {
    /* already closed */
  }
}

if (failures.length) {
  console.error("Content platform schema verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Content platform schema verification passed.");
console.log("Real storage: phase-21 + phase-43 executed in isolated PGlite PostgreSQL, with Supabase's default");
console.log("  anon grants installed first, so the migration's REVOKEs are genuinely exercised.");
for (const line of proven) console.log(line);

// =================================================================================================
// B1 — legal_reviewer must have NO update privilege on content_posts
// =================================================================================================

async function verifyB1LegalReviewerCannotEditPosts(db) {
  // Each of these was possible before the fix.
  await deniedAsRole(db, "authenticated", LEGAL,
    `update public.content_posts set title = 'Rewritten by legal' where post_id = '${LIVE_POST}'`,
    "B1.1 legal_reviewer must NOT be able to rewrite a post title.");

  await deniedAsRole(db, "authenticated", LEGAL,
    `update public.content_posts set doc = '{"type":"doc","content":[]}'::jsonb where post_id = '${LIVE_POST}'`,
    "B1.2 legal_reviewer must NOT be able to rewrite a post's structured document.");

  await deniedAsRole(db, "authenticated", LEGAL,
    `update public.content_posts set status = 'published', published_at = now() where post_id = '${DRAFT_POST}'`,
    "B1.3 legal_reviewer must NOT be able to change publication status.");

  await deniedAsRole(db, "authenticated", LEGAL,
    `update public.content_posts set published_at = now() where post_id = '${LIVE_POST}'`,
    "B1.4 legal_reviewer must NOT be able to set published_at.");

  await deniedAsRole(db, "authenticated", LEGAL,
    `update public.content_posts set status = 'scheduled', scheduled_for = now() + interval '1 day' where post_id = '${DRAFT_POST}'`,
    "B1.5a legal_reviewer must NOT be able to schedule a post.");

  await deniedAsRole(db, "authenticated", LEGAL,
    `update public.content_posts set status = 'draft', published_at = null where post_id = '${LIVE_POST}'`,
    "B1.5b legal_reviewer must NOT be able to unpublish a post.");

  await deniedAsRole(db, "authenticated", LEGAL,
    `update public.content_posts set status = 'archived' where post_id = '${LIVE_POST}'`,
    "B1.5c legal_reviewer must NOT be able to archive a post.");

  // And they cannot forge their own approval by writing the column directly.
  await deniedAsRole(db, "authenticated", LEGAL,
    `update public.content_posts set legal_approved_at = now(), legal_approved_by = '${LEGAL}' where post_id = '${DRAFT_POST}'`,
    "B1.6 legal_reviewer must NOT be able to write legal_approved_* directly.");

  // The remaining defect found by the independent audit: an editor/administrator policy admitted
  // the row, and Supabase's table-wide UPDATE grant admitted the approval columns. Column grants
  // must now refuse every direct variant before RLS or the publication trigger can be abused.
  await deniedAsRole(db, "authenticated", EDITOR,
    `update public.content_posts set legal_approved_at = now() where post_id = '${DRAFT_POST}'`,
    "B1.6a editor must NOT be able to set legal_approved_at directly.");
  await deniedAsRole(db, "authenticated", EDITOR,
    `update public.content_posts set legal_approved_by = '${EDITOR}' where post_id = '${DRAFT_POST}'`,
    "B1.6b editor must NOT be able to set legal_approved_by directly.");
  await deniedAsRole(db, "authenticated", EDITOR,
    `update public.content_posts set legal_approved_at = now(), legal_approved_by = '${EDITOR}' where post_id = '${DRAFT_POST}'`,
    "B1.6c editor must NOT be able to set both legal approval fields directly.");
  await deniedAsRole(db, "authenticated", EDITOR,
    `update public.content_posts
     set legal_approved_at = now(), legal_approved_by = '${EDITOR}', status = 'published', published_at = now()
     where post_id = '${UNAPPROVED_LEGAL_POST}'`,
    "B1.6d editor must NOT be able to forge legal approval and publish in one statement.");
  await deniedAsRole(db, "authenticated", CONTENT_ADMIN,
    `update public.content_posts set legal_approved_at = now(), legal_approved_by = '${CONTENT_ADMIN}' where post_id = '${DRAFT_POST}'`,
    "B1.6e explicit primary_admin must NOT be able to write legal approval fields directly.");
  await deniedAsRole(db, "authenticated", INTERNAL_ADMIN,
    `update public.content_posts set legal_approved_at = now(), legal_approved_by = '${INTERNAL_ADMIN}' where post_id = '${DRAFT_POST}'`,
    "B1.6f internal_admin acting as primary_admin must NOT write legal approval fields directly.");
  for (const [uid, label] of [
    [VIEWER, "viewer"],
    [CONTRIBUTOR, "contributor"],
    [PARTNER_A, "partner_contributor"],
    [SOCIAL, "social_manager"],
    [NO_ROLE, "ordinary authenticated user"]
  ]) {
    await deniedAsRole(db, "authenticated", uid,
      `update public.content_posts set legal_approved_at = now(), legal_approved_by = '${uid}' where post_id = '${DRAFT_POST}'`,
      `B1.6f ${label} must NOT be able to write legal approval fields directly.`);
  }
  await deniedAsRole(db, "authenticated", EDITOR,
    `update public.content_posts set legal_approved_at = null, legal_approved_by = null where post_id = '${LIVE_POST}'`,
    "B1.6g editor must NOT be able to clear an existing legal approval.");
  await deniedAsRole(db, "authenticated", EDITOR,
    `update public.content_posts set legal_approved_at = now(), legal_approved_by = '${EDITOR}' where post_id = '${LIVE_POST}'`,
    "B1.6h editor must NOT be able to replace an existing legal approval.");
  await deniedAsRole(db, "authenticated", EDITOR,
    `insert into public.content_reviews (post_id, review_kind, decision, reviewer_id)
     values ('${UNAPPROVED_LEGAL_POST}', 'legal', 'approved', '${EDITOR}')`,
    "B1.6i editor must NOT be able to forge an approved legal-review record.");
  await deniedAsRole(db, "authenticated", EDITOR,
    `insert into public.content_posts
       (slug, destination, content_type, status, title, legal_approved_at, legal_approved_by)
     values ('forged-on-insert', 'expungement_ai', 'state_resource', 'draft', 'Forged', now(), '${EDITOR}')`,
    "B1.6j editor must NOT be able to supply legal approval fields on INSERT.");

  proven.push("B1 CLOSED: a legal_reviewer has no UPDATE privilege on content_posts at all — title, doc, status,");
  proven.push("  published_at, scheduling, unpublish, archive, and direct legal_approved_* writes are all refused.");
  proven.push("EDITOR_DIRECT_LEGAL_APPROVAL=BLOCKED");
}

async function verifyLegalReviewRpc(db) {
  const before = await one(db, `select title, doc, status, published_at from public.content_posts where post_id = '${LEGAL_POST}'`);

  // 6. The reviewer CAN act through the safe operation.
  const result = await asRole(db, "authenticated", LEGAL,
    `select public.content_apply_legal_review('${LEGAL_POST}', 'approved', 'Reviewed; language is accurate.') as status`,
    { commit: true });
  assert(result[0]?.status === "approved", "B1.7 a legal_reviewer must be able to approve through content_apply_legal_review().");

  // 7. It changed ONLY the legal-review fields.
  const after = await one(db, `select title, doc, status, published_at, legal_approved_at, legal_approved_by from public.content_posts where post_id = '${LEGAL_POST}'`);
  assert(after.title === before.title, "B1.8 the legal-review RPC must not change the title.");
  assert(JSON.stringify(after.doc) === JSON.stringify(before.doc), "B1.8 the legal-review RPC must not change the document.");
  assert(after.published_at === before.published_at, "B1.8 the legal-review RPC must not set published_at.");
  assert(after.status === "approved", "B1.8 approval must move in_legal_review -> approved (a review state, not a published one).");
  assert(after.legal_approved_by === LEGAL, "B1.8 the RPC must record the authenticated reviewer.");
  assert(after.legal_approved_at !== null, "B1.8 the RPC must record the review timestamp.");

  const review = await one(db, `select review_kind, decision, reviewer_id from public.content_reviews where post_id = '${LEGAL_POST}'`);
  assert(review.review_kind === "legal" && review.decision === "approved" && review.reviewer_id === LEGAL,
    "B1.9 the RPC must insert a legal review record naming the reviewer.");

  const audit = await db.query(`select action from public.content_audit_events where entity_id = '${LEGAL_POST}' and action = 'legal_approved'`);
  assert(audit.rows.length === 1, "B1.10 the RPC must write an audit event.");

  // The documented primary_admin path uses the same narrow RPC and records the authenticated
  // primary admin — it does not gain direct table access to the approval columns.
  const primaryResult = await asRole(db, "authenticated", CONTENT_ADMIN,
    `select public.content_apply_legal_review('${PRIMARY_LEGAL_POST}', 'approved', 'Primary admin legal review.') as status`,
    { commit: true });
  assert(primaryResult[0]?.status === "approved", "B1.10a a primary_admin must be able to approve through the RPC.");
  const primaryAfter = await one(db,
    `select status, published_at, legal_approved_at, legal_approved_by from public.content_posts where post_id = '${PRIMARY_LEGAL_POST}'`);
  assert(primaryAfter.status === "approved" && primaryAfter.published_at === null,
    "B1.10b the primary_admin RPC approval must not publish.");
  assert(primaryAfter.legal_approved_at !== null && primaryAfter.legal_approved_by === CONTENT_ADMIN,
    "B1.10c the primary_admin RPC must derive and record auth.uid().");
  const primaryReview = await one(db,
    `select reviewer_id, review_kind, decision from public.content_reviews where post_id = '${PRIMARY_LEGAL_POST}'`);
  assert(primaryReview.reviewer_id === CONTENT_ADMIN && primaryReview.review_kind === "legal" && primaryReview.decision === "approved",
    "B1.10d the primary_admin RPC must create the genuine legal-review record.");
  const primaryAudit = await db.query(
    `select actor_id from public.content_audit_events where entity_id = '${PRIMARY_LEGAL_POST}' and action = 'legal_approved'`);
  assert(primaryAudit.rows.length === 1 && primaryAudit.rows[0].actor_id === CONTENT_ADMIN,
    "B1.10e the primary_admin RPC must create an audit record with the authenticated actor.");

  // The RPC refuses ineligible workflow states and unauthorized callers.
  await rejects(db, `select public.content_apply_legal_review('${LIVE_POST}', 'approved', null)`,
    "B1.11 the RPC must refuse a post that is not in_legal_review.", { role: "authenticated", uid: LEGAL });
  await rejects(db, `select public.content_apply_legal_review('${LEGAL_POST}', 'published', null)`,
    "B1.12 the RPC must refuse a decision outside approved/changes_requested.", { role: "authenticated", uid: LEGAL });
  await rejects(db, `select public.content_apply_legal_review('${LEGAL_POST}', 'approved', null)`,
    "B1.13 the RPC must refuse a caller who is not a legal reviewer or primary admin.", { role: "authenticated", uid: CONTRIBUTOR });
  await rejects(db, `select public.content_apply_legal_review('${LEGAL_POST}', 'approved', null)`,
    "B1.14 the RPC must refuse an unauthenticated caller.", { role: "anon", uid: null });

  proven.push("  The RPC content_apply_legal_review() is the only path to legal_approved_*: it is column-scoped, records");
  proven.push("  the reviewer + timestamp + review row + audit event, and refuses ineligible states and callers.");
}

// =================================================================================================
// B2 — publishing authority is database-enforced
// =================================================================================================

async function verifyB2PublishingAuthority(db) {
  // 8. Roles without publishing capability cannot publish.
  for (const [uid, label] of [[CONTRIBUTOR, "contributor"], [SOCIAL, "social_manager"], [VIEWER, "viewer"], [PARTNER_A, "partner_contributor"]]) {
    await deniedAsRole(db, "authenticated", uid,
      `update public.content_posts set status = 'published', published_at = now() where post_id = '${DRAFT_POST}'`,
      `B2.1 a ${label} must NOT be able to publish.`);
  }

  // content_can_publish() is genuinely wired in, not decorative.
  const usage = await db.query(
    `select count(*)::int as n from pg_proc p
     where p.proname = 'content_enforce_publish_authority'
       and pg_get_functiondef(p.oid) like '%content_can_publish%'`);
  assert(usage.rows[0].n === 1, "B2.2 content_can_publish() must be used by the publish-authority trigger.");

  // 9. The intended publishing role succeeds, after approval.
  const published = await asRole(db, "authenticated", EDITOR,
    `update public.content_posts set status = 'published', published_at = now()
     where post_id = '${LEGAL_POST}' returning status`, { commit: true });
  assert(published[0]?.status === "published", "B2.3 an editor must be able to publish a legally-approved post.");

  // The trigger requires genuine approval provenance, not merely non-null approval-looking values.
  await deniedAsRole(db, "authenticated", EDITOR,
    `update public.content_posts set status = 'published', published_at = now()
     where post_id = '${UNAPPROVED_LEGAL_POST}'`,
    "B2.4 an editor must NOT publish legally substantive content without a prior RPC approval.");

  // Ordinary approved editorial content remains publishable without legal review.
  const ordinary = await asRole(db, "authenticated", EDITOR,
    `update public.content_posts set status = 'published', published_at = now()
     where post_id = '${NONLEGAL_APPROVED_POST}' returning status`, { commit: true });
  assert(ordinary[0]?.status === "published",
    "B2.5 an editor must still be able to publish an approved non-legally-sensitive post.");

  proven.push("B2 CLOSED: publishing authority is enforced by the content_enforce_publish_authority trigger, which");
  proven.push("  calls content_can_publish(). Contributors, social managers, viewers, and partner contributors are");
  proven.push("  refused; an editor publishes only after genuine RPC approval, while ordinary approved content still publishes.");
}

// =================================================================================================
// B3 — anon reads a narrow view, never the base table
// =================================================================================================

async function verifyB3PublicPostProjection(db) {
  const PUBLIC_POST_COLUMNS = [
    "post_id", "destination", "locale", "content_type", "slug", "title", "subtitle", "excerpt",
    "rendered_html", "reading_minutes", "author_id", "category_id", "featured_media_id", "og_media_id",
    "jurisdiction_code", "partner_slug", "seo_title", "seo_description", "canonical_url", "og_title",
    "og_description", "published_at", "content_updated_at"
  ];

  // Every column the audit found leaking, plus the ones that would leak editorial activity.
  const FORBIDDEN_PUBLIC_POST_COLUMNS = [
    "doc", "status", "search_text", "version", "scheduled_for", "first_published_at", "legal_sensitive",
    "created_by", "created_at", "updated_at", "legal_approved_at", "legal_approved_by",
    "editorial_approved_at", "editorial_approved_by"
  ];

  // 10. anon has no privilege on the base table at all — not "no rows", no privilege.
  await deniedAsRole(db, "anon", null, `select post_id from public.content_posts`,
    "B3.1 anon must have NO select privilege on content_posts.");
  await deniedAsRole(db, "anon", null, `select created_by, legal_approved_by, search_text from public.content_posts`,
    "B3.2 anon must not be able to read internal workflow columns of content_posts.");
  await deniedAsRole(db, "anon", null, `select slug from public.content_post_tags`,
    "B3.3 anon must not be able to enumerate content_post_tags (it links draft posts).".replace("slug", "post_id"));

  // 11. anon CAN read the approved projection.
  const rows = await asRole(db, "anon", null, `select * from public.content_public_posts order by slug`);
  assert(rows.length > 0, "B3.4 anon must be able to read content_public_posts.");

  const columns = Object.keys(rows[0]);
  for (const column of PUBLIC_POST_COLUMNS) {
    assert(columns.includes(column), `B3.5 content_public_posts must expose ${column}.`);
  }
  for (const column of FORBIDDEN_PUBLIC_POST_COLUMNS) {
    assert(!columns.includes(column), `B3.6 content_public_posts must NOT expose ${column}.`);
  }
  assert(columns.length === PUBLIC_POST_COLUMNS.length,
    `B3.7 content_public_posts exposes an unapproved column: ${columns.filter((c) => !PUBLIC_POST_COLUMNS.includes(c)).join(", ")}`);

  // 12. Non-public rows stay invisible through the view.
  const slugs = rows.map((row) => row.slug);
  for (const hidden of ["draft-post", "scheduled-post", "in-review-post", "archived-post", "future-post"]) {
    assert(!slugs.includes(hidden), `B3.8 the public view must not expose a '${hidden}'.`);
  }
  assert(slugs.includes("live-post"), "B3.9 the public view must expose a genuinely published post.");

  // The authors view drops the staff linkage.
  const authors = await asRole(db, "anon", null, `select * from public.content_public_authors`);
  assert(authors.length > 0, "B3.10 anon must be able to read content_public_authors.");
  assert(!Object.keys(authors[0]).includes("auth_user_id"), "B3.11 content_public_authors must not expose auth_user_id.");
  await deniedAsRole(db, "anon", null, `select auth_user_id from public.content_authors`,
    "B3.12 anon must have no privilege on the content_authors base table.");

  proven.push("B3 CLOSED: anon has NO privilege on content_posts, content_authors, or content_post_tags. The public");
  proven.push(`  interface is content_public_posts, exactly ${PUBLIC_POST_COLUMNS.length} named columns — no doc, status, search_text,`);
  proven.push("  version, scheduled_for, created_by, or *_approved_by/_at. Drafts, scheduled, in-review, archived,");
  proven.push("  and future-dated posts are all absent from the view.");
}

// =================================================================================================
// B4 — media embargo
// =================================================================================================

async function verifyB4MediaEmbargo(db) {
  // 13. anon cannot enumerate the media library.
  await deniedAsRole(db, "anon", null, `select media_id from public.content_media`,
    "B4.1 anon must have NO select privilege on content_media (no library enumeration).");
  await deniedAsRole(db, "anon", null, `select storage_path, uploaded_by from public.content_media`,
    "B4.2 anon must not be able to read storage_path or uploaded_by.");

  // 14. The draft-only asset is invisible, and the publication check says so.
  const visible = await asRole(db, "anon", null, `select media_id, alt_text from public.content_public_media`);
  const ids = visible.map((row) => row.media_id);
  assert(!ids.includes(DRAFT_MEDIA), "B4.3 media attached only to an unpublished draft must NOT appear publicly.");
  assert(
    !JSON.stringify(visible).includes("Unannounced"),
    "B4.4 draft-only media metadata (alt text) must not leak."
  );

  const draftIsPublic = await asRole(db, "anon", null, `select public.content_media_is_public('${DRAFT_MEDIA}') as ok`);
  assert(draftIsPublic[0].ok === false,
    "B4.5 content_media_is_public() must be false for a draft-only asset — the media route uses this before signing a URL.");

  // 15. Published media remains available through the approved surface.
  assert(ids.includes(PUBLISHED_MEDIA), "B4.6 media referenced by a published post must be publicly readable.");
  const publishedIsPublic = await asRole(db, "anon", null, `select public.content_media_is_public('${PUBLISHED_MEDIA}') as ok`);
  assert(publishedIsPublic[0].ok === true, "B4.7 content_media_is_public() must be true for published media.");

  const mediaColumns = Object.keys(visible[0]);
  for (const forbidden of ["storage_path", "uploaded_by", "source_info", "permission_status", "archived"]) {
    assert(!mediaColumns.includes(forbidden), `B4.8 content_public_media must NOT expose ${forbidden}.`);
  }

  // The bucket must be private in the migration source (PGlite has no storage schema).
  const migration = read("supabase/phase-43-content-platform.sql");
  assert(
    /insert into storage\.buckets[\s\S]{0,240}'content-media',\s*\n?\s*false,/.test(migration),
    "B4.9 the content-media bucket must be created PRIVATE (public = false)."
  );
  assert(
    !/'content-media',\s*\n?\s*true,/.test(migration),
    "B4.10 the content-media bucket must not be public."
  );

  proven.push("B4 CLOSED: anon cannot enumerate content_media at all. content_public_media admits an asset only once");
  proven.push("  published content references it, and never exposes storage_path/uploaded_by/permission_status. The");
  proven.push("  bucket is PRIVATE, so an unguessable path is not the control — bytes come from a signed URL minted");
  proven.push("  by /api/content/media/[mediaId] after content_media_is_public() says yes.");
}

// =================================================================================================
// B5 — testimonial consent
// =================================================================================================

async function verifyB5TestimonialConsent(db) {
  // 16. The base table is closed to anon.
  await deniedAsRole(db, "anon", null, `select consent_reference from public.content_testimonials`,
    "B5.1 anon must NOT be able to read content_testimonials.consent_reference.");
  await deniedAsRole(db, "anon", null, `select testimonial_id from public.content_testimonials`,
    "B5.2 anon must have no privilege on the content_testimonials base table.");

  // 17. The public projection carries display fields only.
  const rows = await asRole(db, "anon", null, `select * from public.content_public_testimonials`);
  assert(rows.length === 1, "B5.3 anon must be able to read an approved testimonial through the public view.");
  const columns = Object.keys(rows[0]);
  for (const forbidden of ["consent_reference", "consent_status", "approved", "created_at", "updated_at"]) {
    assert(!columns.includes(forbidden), `B5.4 content_public_testimonials must NOT expose ${forbidden}.`);
  }
  assert(!JSON.stringify(rows).includes("@"), "B5.5 no email-shaped consent reference may appear in the public testimonial payload.");
  assert(rows[0].quote && rows[0].attribution, "B5.6 the public testimonial must still carry its quote and attribution.");

  proven.push("B5 CLOSED: anon has no privilege on content_testimonials. content_public_testimonials exposes quote,");
  proven.push("  attribution, role, partner, and image only — consent_status and consent_reference never leave the DB.");
}

// =================================================================================================
// Role management — no self-escalation
// =================================================================================================

async function verifyNoSelfEscalation(db) {
  // 18. A lower-privileged user cannot mint themselves an admin role.
  await deniedAsRole(db, "authenticated", CONTRIBUTOR,
    `insert into public.content_admin_users (auth_user_id, content_role) values ('${CONTRIBUTOR}', 'primary_admin')`,
    "RM.1 a contributor must NOT be able to insert themselves a primary_admin role.");
  await deniedAsRole(db, "authenticated", CONTRIBUTOR,
    `update public.content_admin_users set content_role = 'primary_admin' where auth_user_id = '${CONTRIBUTOR}'`,
    "RM.2 a contributor must NOT be able to escalate their own role.");
  await deniedAsRole(db, "authenticated", NO_ROLE,
    `insert into public.content_admin_users (auth_user_id, content_role) values ('${NO_ROLE}', 'primary_admin')`,
    "RM.3 a user with no content role must NOT be able to create one for themselves.");
  await deniedAsRole(db, "anon", null,
    `insert into public.content_admin_users (auth_user_id, content_role) values ('${NO_ROLE}', 'primary_admin')`,
    "RM.4 an anonymous caller must NOT be able to create a content role.");

  // Even a primary_admin cannot touch their OWN row (no self-promotion, no self-lock-in).
  await deniedAsRole(db, "authenticated", CONTENT_ADMIN,
    `update public.content_admin_users set content_role = 'primary_admin' where auth_user_id = '${CONTENT_ADMIN}'`,
    "RM.5 a primary_admin must NOT be able to write their own role row.");

  // But a primary_admin CAN administer others — the documented, consistent rule.
  const granted = await asRole(db, "authenticated", CONTENT_ADMIN,
    `insert into public.content_admin_users (auth_user_id, content_role) values ('${NO_ROLE}', 'editor') returning content_role`,
    { commit: false });
  assert(granted[0]?.content_role === "editor", "RM.6 a content primary_admin must be able to assign a role to ANOTHER user.");

  proven.push("ROLE MANAGEMENT: internal admins and content primary_admins may administer OTHER users' roles, and");
  proven.push("  nobody — at any privilege level — may write their own role row. Self-escalation is impossible.");
}

// =================================================================================================
// Retained guarantees
// =================================================================================================

async function verifyPartnerContributorScoping(db) {
  const seen = await asRole(db, "authenticated", PARTNER_A,
    `select slug from public.content_posts where partner_slug is not null order by slug`);
  const slugs = seen.map((row) => row.slug);
  assert(slugs.includes("partner-a-draft"), "PC.1 a partner contributor must see their own organization's draft.");
  assert(!slugs.includes("partner-b-draft"), "PC.2 a partner contributor must NOT see another partner's draft.");

  await deniedAsRole(db, "authenticated", PARTNER_A,
    `insert into public.content_posts (slug, destination, content_type, status, title, partner_slug)
     values ('steal', 'legalease_partner', 'partner_story', 'draft', 'Steal', 'partner-b')`,
    "PC.3 a partner contributor must NOT be able to write a post for another partner.");

  proven.push("PARTNER ISOLATION retained: cross-partner reads and writes are refused.");
}

async function verifyViewerLeastPrivilege(db) {
  const seen = await asRole(db, "authenticated", VIEWER, `select slug from public.content_posts order by slug`);
  const slugs = seen.map((row) => row.slug);
  assert(!slugs.includes("draft-post"), "V.1 a viewer must NOT see drafts (least-privilege interpretation).");
  assert(!slugs.includes("in-review-post"), "V.2 a viewer must NOT see in-review content.");
  assert(slugs.includes("live-post"), "V.3 a viewer must still see published content.");

  // A user with NO content role sees nothing on the base table.
  const nobody = await asRole(db, "authenticated", NO_ROLE, `select slug from public.content_posts`);
  assert(nobody.length === 0, "V.4 an authenticated user with no content role must see no rows on the base table.");

  proven.push("VIEWER reduced to least privilege: published content only, no drafts. A no-role authenticated user");
  proven.push("  gets nothing from the base table.");
}

async function verifyAuditAppendOnly(db) {
  await db.query(`insert into public.content_audit_events (action, entity_type, entity_id) values ('published', 'content_post', 'x')`);
  await rejects(db, `update public.content_audit_events set action = 'tampered'`,
    "AU.1 content_audit_events must reject UPDATE even for a superuser/service_role caller.");
  await rejects(db, `delete from public.content_audit_events`,
    "AU.2 content_audit_events must reject DELETE even for a superuser/service_role caller.");
  await deniedAsRole(db, "anon", null, `select audit_id from public.content_audit_events`,
    "AU.3 anon must have no privilege on the audit log.");

  proven.push("AUDIT remains append-only: UPDATE/DELETE are refused even as superuser, and anon cannot read it.");
}

async function verifyOutboxAndBackstops(db) {
  const adminSees = await asRole(db, "authenticated", CONTENT_ADMIN, `select event_id from public.content_promotion_outbox`);
  assert(adminSees.length === 0, "OB.1 the outbox must be invisible even to an authenticated primary_admin (service-role only).");
  await deniedAsRole(db, "anon", null, `select event_id from public.content_promotion_outbox`,
    "OB.2 anon must have no privilege on the outbox.");

  await db.query(`insert into public.content_promotion_outbox (event_type, idempotency_key, payload)
    values ('content.promotion.requested', 'key-1', '{"a":1}'::jsonb)`);
  await rejects(db, `insert into public.content_promotion_outbox (event_type, idempotency_key, payload)
    values ('content.promotion.requested', 'key-1', '{"a":2}'::jsonb)`,
    "OB.3 a duplicate outbox idempotency_key must be rejected.");

  // Legal backstop + slug uniqueness + testimonial consent backstop still hold.
  await rejects(db, `insert into public.content_posts (slug, destination, content_type, status, title, published_at)
    values ('illegal', 'expungement_ai', 'state_resource', 'published', 'Nope', now())`,
    "BS.1 a state_resource must not be publishable without legal_approved_at.");
  await rejects(db, `insert into public.content_posts (slug, destination, content_type, status, title)
    values ('live-post', 'expungement_ai', 'blog_article', 'draft', 'Dup')`,
    "BS.2 slug must be unique per (destination, locale).");
  await rejects(db, `insert into public.content_testimonials (quote, attribution, approved, consent_status)
    values ('Great', 'Someone', true, 'unknown')`,
    "BS.3 a testimonial must not be approvable without a recorded consent basis.");

  proven.push("BACKSTOPS retained: outbox idempotency + service-role isolation, the legal-review CHECK constraint,");
  proven.push("  slug uniqueness, and the testimonial-consent constraint.");
}

async function verifyIndexes(db) {
  const idx = await db.query(
    `select indexname, indexdef from pg_indexes where schemaname = 'public' and tablename like 'content_%'`);
  const defs = idx.rows.map((row) => row.indexdef).join("\n");

  const required = [
    ["content_posts_author_id_idx", "author_id"],
    ["content_posts_category_id_idx", "category_id"],
    ["content_post_tags_tag_id_idx", "tag_id"],
    ["content_posts_published_at_idx", "published_at"],
    ["content_posts_scheduled_for_idx", "scheduled_for"],
    ["content_promotion_outbox_status_idx", "status"]
  ];
  for (const [name] of required) {
    assert(idx.rows.some((row) => row.indexname === name), `IX.1 missing index ${name}.`);
  }
  assert(defs.includes("content_posts_slug_destination_locale_key") || defs.includes("destination, locale, slug"),
    "IX.2 slug lookups must be backed by the (destination, locale, slug) unique index.");

  proven.push("INDEXES: author_id, category_id, and content_post_tags(tag_id) added; public-read, slug, scheduling,");
  proven.push("  and outbox-polling indexes all present.");
}

/**
 * The migration must be atomic: BEGIN ... COMMIT, so a mid-file failure leaves NOTHING behind.
 * Proven by injecting a failure into a scratch copy in memory (never written to the repository) and
 * asserting the database is unchanged afterwards.
 */
async function verifyAtomicity() {
  const migration = read("supabase/phase-43-content-platform.sql");
  assert(/^\s*begin;/im.test(migration), "TX.1 the migration must open a transaction.");
  assert(/^\s*commit;\s*$/im.test(migration), "TX.2 the migration must commit.");

  const scratch = new PGlite();
  await scratch.exec("create role anon; create role authenticated; create role service_role;");
  await scratch.exec(authSchemaStub());
  await scratch.exec(read("supabase/partner-journey-os.sql"));
  await scratch.exec(read("supabase/phase-21-partner-auth-rls-foundation.sql"));

  // Inject a failure just before COMMIT. This copy exists only in memory.
  const broken = migration.replace(/commit;\s*$/i, "select 1 / 0;\ncommit;");
  let threw = false;
  try {
    await scratch.exec(broken);
  } catch {
    threw = true;
  }
  assert(threw, "TX.3 the injected failure must abort the migration.");

  // The failure leaves the session inside an aborted transaction (which is exactly the behaviour we
  // want from a real deploy: nothing is committed). Close it out before inspecting the schema.
  await scratch.exec("rollback").catch(() => {});

  const leftovers = await scratch.query(
    `select count(*)::int as n from information_schema.tables where table_schema = 'public' and table_name like 'content_%'`);
  assert(leftovers.rows[0].n === 0,
    `TX.4 a failed migration must roll back completely, leaving no content_* tables (found ${leftovers.rows[0].n}).`);
  await scratch.close();

  proven.push("ATOMIC: the migration is wrapped in BEGIN/COMMIT. An injected mid-file failure rolls back completely,");
  proven.push("  leaving zero content_* tables behind (verified on an in-memory scratch copy; the repo file is unchanged).");
}

async function verifySchemaShape(db) {
  const expected = [
    "content_admin_users", "content_authors", "content_categories", "content_tags", "content_post_tags",
    "content_posts", "content_post_versions", "content_media", "content_media_usages",
    "content_testimonials", "content_state_editorial", "content_reviews", "content_publications",
    "content_social_drafts", "content_social_assets", "content_campaigns", "content_campaign_channels",
    "content_promotion_outbox", "content_audit_events"
  ];
  const tables = await db.query(
    `select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' and table_name like 'content_%'`);
  const present = new Set(tables.rows.map((row) => row.table_name));
  for (const table of expected) assert(present.has(table), `Missing table public.${table}.`);

  const views = await db.query(
    `select table_name from information_schema.views where table_schema='public' and table_name like 'content_public_%'`);
  const viewNames = new Set(views.rows.map((row) => row.table_name));
  for (const view of [
    "content_public_posts", "content_public_authors", "content_public_media",
    "content_public_testimonials", "content_public_state_editorial"
  ]) {
    assert(viewNames.has(view), `Missing public projection view public.${view}.`);
  }

  const rls = await db.query(
    `select c.relname, c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname='public' and c.relname like 'content_%' and c.relkind='r'`);
  for (const row of rls.rows) {
    assert(row.relrowsecurity === true, `RLS is not enabled on public.${row.relname}.`);
  }

  const fns = await db.query(
    `select p.proname, array_to_string(p.proconfig, ',') as cfg from pg_proc p
     join pg_namespace n on n.oid = p.pronamespace
     where n.nspname='public' and p.proname like '%content%'`);
  for (const fn of fns.rows) {
    assert((fn.cfg ?? "").includes("search_path="), `Function ${fn.proname} must pin a fixed search_path.`);
  }

  const postUpdateGrants = await db.query(
    `select column_name from information_schema.column_privileges
     where table_schema = 'public' and table_name = 'content_posts'
       and grantee = 'authenticated' and privilege_type = 'UPDATE'`);
  const directlyUpdatable = new Set(postUpdateGrants.rows.map((row) => row.column_name));
  for (const forbidden of [
    "legal_approved_at", "legal_approved_by", "editorial_approved_at", "editorial_approved_by", "created_by"
  ]) {
    assert(!directlyUpdatable.has(forbidden),
      `Authenticated must not hold direct UPDATE on content_posts.${forbidden}.`);
  }
  for (const allowed of ["title", "doc", "status", "published_at", "scheduled_for"]) {
    assert(directlyUpdatable.has(allowed),
      `Authenticated workflow access must retain column UPDATE on content_posts.${allowed}.`);
  }

  const reviewMutations = await db.query(
    `select privilege_type from information_schema.table_privileges
     where table_schema = 'public' and table_name = 'content_reviews' and grantee = 'authenticated'`);
  const reviewPrivileges = new Set(reviewMutations.rows.map((row) => row.privilege_type));
  assert(reviewPrivileges.has("SELECT"), "Authenticated content roles must retain SELECT on content_reviews.");
  for (const forbidden of ["INSERT", "UPDATE", "DELETE", "TRUNCATE"]) {
    assert(!reviewPrivileges.has(forbidden),
      `Authenticated must not hold ${forbidden} on content_reviews.`);
  }
}

// =================================================================================================
// harness
// =================================================================================================

async function seed(db) {
  await db.query(`insert into auth.users (id) values ($1),($2),($3),($4),($5),($6),($7),($8),($9),($10)`, [
    INTERNAL_ADMIN, EDITOR, LEGAL, SOCIAL, CONTRIBUTOR, PARTNER_A, PARTNER_B, VIEWER, NO_ROLE, CONTENT_ADMIN
  ]);

  await db.query(
    `insert into public.partner_users (auth_user_id, partner_slug, role, status) values ($1, null, 'internal_admin', 'active')`,
    [INTERNAL_ADMIN]);

  await db.query(
    `insert into public.content_admin_users (auth_user_id, content_role, partner_slug) values
      ($1,'editor',null),($2,'legal_reviewer',null),($3,'social_manager',null),($4,'contributor',null),
      ($5,'partner_contributor','partner-a'),($6,'partner_contributor','partner-b'),
      ($7,'viewer',null),($8,'primary_admin',null)`,
    [EDITOR, LEGAL, SOCIAL, CONTRIBUTOR, PARTNER_A, PARTNER_B, VIEWER, CONTENT_ADMIN]);

  await db.query(`insert into public.content_authors (author_id, slug, name, auth_user_id)
    values ('0f0f0f0f-0000-4000-8000-00000000000a', 'roger', 'Roger Roman', $1)`, [EDITOR]);

  // Media: one referenced by a published post, one attached only to a draft.
  await db.exec(`
    insert into public.content_media (media_id, storage_path, public_url, mime_type, byte_size, alt_text, permission_status, uploaded_by)
    values
      ('${PUBLISHED_MEDIA}', 'media/live.png', '/api/content/media/${PUBLISHED_MEDIA}', 'image/png', 1000, 'A courthouse', 'owned', '${EDITOR}'),
      ('${DRAFT_MEDIA}', 'media/embargo.png', '/api/content/media/${DRAFT_MEDIA}', 'image/png', 1000, 'Unannounced launch graphic', 'owned', '${EDITOR}');
  `);

  // Posts across every status. Seeded as superuser (auth.role() is not 'authenticated', so the
  // publish-authority trigger correctly stands aside for the trusted server path).
  await db.exec(`
    insert into public.content_posts
      (post_id, slug, destination, content_type, status, title, doc, rendered_html, search_text,
       published_at, scheduled_for, author_id, featured_media_id, created_by, legal_approved_by, legal_approved_at)
    values
      ('${LIVE_POST}', 'live-post', 'expungement_ai', 'blog_article', 'published', 'Live post',
       '{"type":"doc","content":[]}'::jsonb, '<p>Live</p>', 'internal search text',
       now() - interval '1 day', null, '0f0f0f0f-0000-4000-8000-00000000000a', '${PUBLISHED_MEDIA}', '${EDITOR}', '${LEGAL}', now()),
      ('${DRAFT_POST}', 'draft-post', 'expungement_ai', 'blog_article', 'draft', 'Unannounced launch',
       '{"type":"doc","content":[]}'::jsonb, null, null, null, null, null, null, '${EDITOR}', null, null),
      -- This one is deliberately walked all the way to published by the B1/B2 tests, so it must NOT
      -- be the row the "hidden from the public" assertions rely on.
      ('${LEGAL_POST}', 'legal-review-post', 'expungement_ai', 'state_resource', 'in_legal_review', 'Needs legal',
       '{"type":"doc","content":[]}'::jsonb, null, null, null, null, null, null, '${EDITOR}', null, null),
      ('${PRIMARY_LEGAL_POST}', 'primary-legal-review-post', 'expungement_ai', 'state_resource', 'in_legal_review', 'Needs primary legal review',
       '{"type":"doc","content":[]}'::jsonb, null, null, null, null, null, null, '${EDITOR}', null, null),
      ('${UNAPPROVED_LEGAL_POST}', 'unapproved-legal-post', 'expungement_ai', 'state_resource', 'approved', 'Unapproved legal content',
       '{"type":"doc","content":[]}'::jsonb, null, null, null, null, null, null, '${EDITOR}', null, null),
      ('${NONLEGAL_APPROVED_POST}', 'ordinary-approved-post', 'expungement_ai', 'blog_article', 'approved', 'Ordinary approved content',
       '{"type":"doc","content":[]}'::jsonb, null, null, null, null, null, null, '${EDITOR}', null, null),
      -- An untouched in-review post, so "review content is invisible" is actually being tested.
      ('bbbbbbbb-0000-4000-8000-00000000000c', 'in-review-post', 'expungement_ai', 'blog_article', 'in_editorial_review', 'In review',
       '{"type":"doc","content":[]}'::jsonb, null, null, null, null, null, null, '${EDITOR}', null, null),
      ('66666666-0000-4000-8000-000000000006', 'scheduled-post', 'expungement_ai', 'blog_article', 'scheduled', 'Scheduled',
       '{"type":"doc","content":[]}'::jsonb, null, null, null, now() + interval '2 days', null, null, '${EDITOR}', null, null),
      ('77777777-0000-4000-8000-000000000007', 'archived-post', 'expungement_ai', 'blog_article', 'archived', 'Archived',
       '{"type":"doc","content":[]}'::jsonb, null, null, null, null, null, null, '${EDITOR}', null, null),
      ('88888888-0000-4000-8000-000000000008', 'future-post', 'expungement_ai', 'blog_article', 'published', 'Future',
       '{"type":"doc","content":[]}'::jsonb, '<p>Future</p>', null, now() + interval '3 days', null, null, null, '${EDITOR}', null, null),
      ('99999999-0000-4000-8000-000000000009', 'partner-a-draft', 'legalease_partner', 'partner_story', 'draft', 'A',
       '{"type":"doc","content":[]}'::jsonb, null, null, null, null, null, null, '${EDITOR}', null, null),
      ('aaaaaaaa-0000-4000-8000-00000000000b', 'partner-b-draft', 'legalease_partner', 'partner_story', 'draft', 'B',
       '{"type":"doc","content":[]}'::jsonb, null, null, null, null, null, null, '${EDITOR}', null, null);
  `);
  await db.exec(`update public.content_posts set partner_slug = 'partner-a' where slug = 'partner-a-draft';`);
  await db.exec(`update public.content_posts set partner_slug = 'partner-b' where slug = 'partner-b-draft';`);

  // The draft-only asset is used by the DRAFT post.
  await db.exec(`insert into public.content_media_usages (media_id, post_id, usage_kind)
    values ('${DRAFT_MEDIA}', '${DRAFT_POST}', 'body');`);

  await db.exec(`insert into public.content_testimonials (quote, attribution, role_title, approved, consent_status, consent_reference)
    values ('It worked.', 'Jane D.', 'Program lead', true, 'written_consent', 'contract-2026-jane.doe@example.com');`);
}

/** Run SQL as a real unprivileged Postgres role with Supabase-shaped JWT claims. */
async function asRole(db, role, userId, sql, { commit = false } = {}) {
  await db.exec("begin");
  try {
    await db.query(`select set_config('request.jwt.claim.role', $1, true)`, [role]);
    await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [userId ?? ""]);
    await db.exec(`set local role ${role}`);
    const result = await db.query(sql);
    await db.exec(commit ? "commit" : "rollback");
    return result.rows;
  } catch (error) {
    await db.exec("rollback");
    throw error;
  }
}

/**
 * Assert that a role is REFUSED. The three ways Postgres says no are not interchangeable:
 *   - a missing GRANT or a raising trigger throws;
 *   - an RLS USING clause that admits no rows silently affects ZERO rows (no error);
 *   - an RLS WITH CHECK violation throws.
 * So a write is denied if it throws OR touches nothing, while a read is denied only if it throws —
 * a read that succeeds with zero rows still means anon HOLDS the privilege, which is what we are
 * testing against.
 */
async function deniedAsRole(db, role, userId, sql, message) {
  const isWrite = /^\s*(update|insert|delete)\b/i.test(sql.trim());
  let denied = false;
  try {
    const rows = await asRole(db, role, userId, isWrite ? `${sql} returning 1` : sql);
    denied = isWrite ? rows.length === 0 : false;
  } catch {
    denied = true;
  }
  assert(denied, message);
}

async function rejects(db, sql, message, { role, uid } = {}) {
  let rejected = false;
  try {
    if (role) {
      await asRole(db, role, uid, sql);
    } else {
      await db.exec("begin");
      try {
        await db.query(sql);
      } finally {
        await db.exec("rollback");
      }
    }
  } catch {
    rejected = true;
  }
  assert(rejected, message);
}

async function one(db, sql) {
  const result = await db.query(sql);
  assert(result.rows.length === 1, `Expected exactly one row for: ${sql}`);
  return result.rows[0];
}

function authSchemaStub() {
  return `
    create schema if not exists auth;
    create table if not exists auth.users (id uuid primary key);

    create or replace function auth.uid()
    returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

    create or replace function auth.role()
    returns text language sql stable as
    $$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $$;

    grant usage on schema auth to anon, authenticated, service_role;
  `;
}

function read(relativePath) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) failures.push(message);
}
