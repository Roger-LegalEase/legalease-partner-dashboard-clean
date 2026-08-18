-- Phase 56: public-view and default-privilege hardening.
--
-- Codifies the Security Advisor remediation validated in the legalease-rcap-acceptance
-- project, in the canonical schema source rather than in a dashboard or in that project
-- alone. The forward migration chain carries the identical statements as
-- supabase/migrations/20260818209000_rcap_upgrade_09_security_hardening.sql.
--
-- Three findings are addressed:
--
--   1. RLS disabled in public. Four tables carried table privileges but no row level
--      security. Two of them exist only in an acceptance environment, so they are
--      hardened where they exist rather than created here.
--
--   2. security_definer_view. The five content_public_* views ran with their owner's
--      rights and read straight past RLS. Phase 43 chose that deliberately — the base
--      tables had no anon grant at all, so the view's WHERE clause was the only row
--      filter. The remediation inverts it: the views become security_invoker, the base
--      tables gain anon SELECT on exactly the columns those views read, and anon RLS
--      policies restate each view's predicate so the published row sets are unchanged.
--      The explicit column list in each view still means a column added tomorrow is not
--      public until a human adds it here.
--
--   3. Default privileges granting ALL on every future object in public to anon and
--      authenticated. That is what made "withholding a policy" insufficient in the first
--      place, and it silently re-arms on every table anyone adds later.
--
-- What this deliberately does NOT do: it does not revoke authenticated's existing table
-- privileges on the content tables. The internal CMS reads and writes them as
-- authenticated, gated by the content_can_edit_any() policies, and removing those grants
-- would break editing rather than harden anything.

begin;

-- -------------------------------------------------------------------------------------
-- 1. Row level security on the four named tables
-- -------------------------------------------------------------------------------------
--
-- partner_entitlement and rcap_record_events already have it in the accepted schema;
-- stating it here makes the guarantee explicit and idempotent rather than incidental.

alter table public.partner_entitlement enable row level security;
alter table public.rcap_record_events enable row level security;

-- The acceptance marker and ledger are created at run time by
-- scripts/rcap-hosted-acceptance-migrate.mjs and exist only in an acceptance environment.
-- Creating them here would put acceptance bookkeeping into Production, so they are
-- hardened only where they are actually present. No browser role has any business
-- reading either one; the revokes restate what the acceptance script already does.
do $$
begin
  if to_regclass('public.rcap_acceptance_environment_marker') is not null then
    execute 'alter table public.rcap_acceptance_environment_marker enable row level security';
    execute 'revoke all on public.rcap_acceptance_environment_marker from anon';
    execute 'revoke all on public.rcap_acceptance_environment_marker from authenticated';
  end if;
  if to_regclass('public.rcap_acceptance_migration_ledger') is not null then
    execute 'alter table public.rcap_acceptance_migration_ledger enable row level security';
    execute 'revoke all on public.rcap_acceptance_migration_ledger from anon';
    execute 'revoke all on public.rcap_acceptance_migration_ledger from authenticated';
  end if;
end;
$$;

-- -------------------------------------------------------------------------------------
-- 2. Anonymous read policies: each one restates its view's predicate exactly
-- -------------------------------------------------------------------------------------
--
-- Effective rows for anon become (policy predicate AND view predicate). The two are the
-- same expression, so the public row sets are byte-for-byte what they were while the
-- views ran as their owner:
--
--   authors          active only
--   posts            published or updated, published_at set and not in the future
--   state editorial  published only
--   testimonials     approved only
--   media            not archived, and referenced by an eligible public record
--
-- Every policy is SELECT-only and scoped to anon. None of them touches an existing
-- policy, so no other role's access changes.

drop policy if exists content_authors_anon_public_read on public.content_authors;
create policy content_authors_anon_public_read on public.content_authors
  for select to anon
  using (is_active);

drop policy if exists content_posts_anon_public_read on public.content_posts;
create policy content_posts_anon_public_read on public.content_posts
  for select to anon
  using (
    status in ('published', 'updated')
    and published_at is not null
    and published_at <= now()
  );

drop policy if exists content_state_editorial_anon_public_read on public.content_state_editorial;
create policy content_state_editorial_anon_public_read on public.content_state_editorial
  for select to anon
  using (status = 'published');

drop policy if exists content_testimonials_anon_public_read on public.content_testimonials;
create policy content_testimonials_anon_public_read on public.content_testimonials
  for select to anon
  using (approved);

-- A usage row is public exactly when the post it points at is public. The sub-select is
-- itself filtered by the anon policy above, which admits the same rows, so the two agree.
drop policy if exists content_media_usages_anon_public_read on public.content_media_usages;
create policy content_media_usages_anon_public_read on public.content_media_usages
  for select to anon
  using (
    exists (
      select 1
      from public.content_posts p
      where p.post_id = content_media_usages.post_id
        and p.status in ('published', 'updated')
        and p.published_at is not null
        and p.published_at <= now()
    )
  );

-- The same publication rule the content_public_media view applies, restated as a policy.
drop policy if exists content_media_anon_public_read on public.content_media;
create policy content_media_anon_public_read on public.content_media
  for select to anon
  using (
    not archived
    and (
      exists (
        select 1
        from public.content_media_usages u
        join public.content_posts p on p.post_id = u.post_id
        where u.media_id = content_media.media_id
          and p.status in ('published', 'updated')
          and p.published_at is not null
          and p.published_at <= now()
      )
      or exists (
        select 1
        from public.content_posts p
        where (p.featured_media_id = content_media.media_id or p.og_media_id = content_media.media_id)
          and p.status in ('published', 'updated')
          and p.published_at is not null
          and p.published_at <= now()
      )
      or exists (
        select 1
        from public.content_state_editorial e
        where (e.featured_media_id = content_media.media_id or e.og_media_id = content_media.media_id)
          and e.status = 'published'
      )
      or exists (
        select 1 from public.content_testimonials t
        where t.media_id = content_media.media_id and t.approved
      )
    )
  );

-- -------------------------------------------------------------------------------------
-- 3. Anonymous privileges on the six underlying content tables
-- -------------------------------------------------------------------------------------
--
-- Revoke first, unconditionally, so this holds regardless of what a default privilege or
-- an earlier phase left behind. Then grant SELECT on named columns only — never
-- table-level SELECT, so a column added later is not readable by anon until someone adds
-- it here on purpose.
--
-- The granted set is exactly the columns the five views read. That includes the columns
-- each view filters on (is_active, status, published_at, archived, approved) and
-- content_posts.updated_at, which the posts view reads to expose "last updated" only for
-- posts in the updated state. A security_invoker view checks column privileges for every
-- column it references, filter columns included, so these cannot be withheld. The
-- residual is that anon can read those filter columns directly for rows that are already
-- public — never for a draft, an inactive author, an archived asset or an unapproved
-- testimonial, because RLS admits none of those to anon.

revoke all on public.content_authors from anon;
revoke all on public.content_posts from anon;
revoke all on public.content_media from anon;
revoke all on public.content_media_usages from anon;
revoke all on public.content_state_editorial from anon;
revoke all on public.content_testimonials from anon;

grant select (
  author_id, slug, name, title, organization, bio, avatar_media_id, is_active
) on public.content_authors to anon;

grant select (
  post_id, destination, locale, content_type, slug, title, subtitle, excerpt,
  rendered_html, reading_minutes, author_id, category_id, featured_media_id, og_media_id,
  jurisdiction_code, partner_slug, seo_title, seo_description, canonical_url, og_title,
  og_description, published_at, status, updated_at
) on public.content_posts to anon;

grant select (
  media_id, mime_type, width, height, alt_text, caption, credit, archived
) on public.content_media to anon;

grant select (media_id, post_id) on public.content_media_usages to anon;

grant select (
  jurisdiction_code, intro, overview, featured_media_id, faqs, related_slugs,
  partner_quote, partner_slug, announcement, seo_title, seo_description, og_media_id,
  cta_label, cta_href, status
) on public.content_state_editorial to anon;

grant select (
  testimonial_id, quote, attribution, role_title, partner_slug, media_id, approved
) on public.content_testimonials to anon;

-- -------------------------------------------------------------------------------------
-- 4. The five public views become security_invoker
-- -------------------------------------------------------------------------------------
--
-- security_barrier keeps a caller-supplied predicate from being pushed below the view's
-- own filtering, which matters more once the view no longer runs as its owner.

alter view public.content_public_authors         set (security_invoker = true, security_barrier = true);
alter view public.content_public_posts           set (security_invoker = true, security_barrier = true);
alter view public.content_public_media           set (security_invoker = true, security_barrier = true);
alter view public.content_public_state_editorial set (security_invoker = true, security_barrier = true);
alter view public.content_public_testimonials    set (security_invoker = true, security_barrier = true);

-- -------------------------------------------------------------------------------------
-- 5. Default privileges for future objects
-- -------------------------------------------------------------------------------------
--
-- The recovered Production baseline carries twelve ALTER DEFAULT PRIVILEGES statements
-- for role postgres in schema public, granting ALL on tables, sequences and functions to
-- postgres, anon, authenticated and service_role. The anon and authenticated halves mean
-- every table anyone adds later is browser-reachable the moment it exists, before anyone
-- writes a policy — the exact shape of the finding above. Those six are withdrawn here.
--
-- postgres and service_role keep theirs: postgres owns the schema, and service_role is
-- the server-side boundary the application already depends on for new objects. Objects
-- that exist today are unaffected — this changes only what future objects inherit — and
-- every grant the accepted schema needs is stated explicitly in the privilege step.

alter default privileges for role postgres in schema public revoke all on tables from anon;
alter default privileges for role postgres in schema public revoke all on tables from authenticated;
alter default privileges for role postgres in schema public revoke all on sequences from anon;
alter default privileges for role postgres in schema public revoke all on sequences from authenticated;
alter default privileges for role postgres in schema public revoke all on functions from anon;
alter default privileges for role postgres in schema public revoke all on functions from authenticated;

commit;
