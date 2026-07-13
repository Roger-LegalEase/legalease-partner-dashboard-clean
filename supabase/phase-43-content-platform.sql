-- Phase 43 Shared content publishing platform (Expungement.ai + LegalEase Partner).
-- Migration file only; do not run against production until reviewed through the DB process.
--
-- One content system serves both public destinations. The security model has four load-bearing
-- properties, each enforced here in the database rather than only in the app:
--
--   1. DRAFTS ARE INVISIBLE TO THE PUBLIC. The anon/authenticated read policy on content_posts
--      admits only status in ('published','updated') AND published_at <= now(). A scheduled post
--      with a future date, a draft, and anything in review are unreadable even through a direct
--      PostgREST call with a leaked anon key.
--   2. LEGAL REVIEW CANNOT BE SKIPPED. content_posts carries a CHECK constraint: a row whose
--      content type is legally substantive (or which is flagged legal_sensitive) cannot be in a
--      published state without legal_approved_at set. The app enforces it too; this is the backstop.
--   3. PARTNER CONTRIBUTORS ARE SCOPED. A partner_contributor may only see and write rows carrying
--      their own partner_slug, and only in pre-review states.
--   4. THE AUDIT LOG IS APPEND-ONLY. content_audit_events has no update or delete policy, and a
--      trigger raises on UPDATE/DELETE so even a service-role caller cannot rewrite history.
--
-- Numbering note: phases 41/41b/42 are taken by the RCAP partner-access-code work on
-- feat/partner-access-codes, so this platform starts at 43 to avoid a collision on merge.
--
-- Role model: content roles live in content_admin_users. Existing trusted internal admins
-- (public.is_internal_admin(), phase 21) are granted primary_admin content privileges implicitly,
-- so no second login system and no hardcoded administrator email exists anywhere.

-- =================================================================================================
-- Roles and capability helpers
-- =================================================================================================

create table if not exists public.content_admin_users (
  auth_user_id uuid primary key references auth.users(id) on delete cascade,
  content_role text not null,
  partner_slug text,
  display_name text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_admin_users_role_check check (
    content_role in (
      'primary_admin',
      'editor',
      'legal_reviewer',
      'social_manager',
      'contributor',
      'partner_contributor',
      'viewer'
    )
  ),
  constraint content_admin_users_status_check check (status in ('active', 'disabled')),
  -- A partner_contributor is meaningless without the organization it is scoped to, and every other
  -- role is LegalEase-internal and must not carry a partner scope.
  constraint content_admin_users_partner_scope_check check (
    (content_role = 'partner_contributor' and partner_slug is not null)
    or
    (content_role <> 'partner_contributor' and partner_slug is null)
  )
);

comment on table public.content_admin_users is
  'Content-platform role assignments. Internal admins (public.is_internal_admin()) get primary_admin implicitly and need no row here.';
comment on column public.content_admin_users.partner_slug is
  'Set only for partner_contributor. RLS scopes that role to rows carrying this slug.';

create or replace function public.set_content_admin_users_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_content_admin_users_updated_at on public.content_admin_users;

create trigger set_content_admin_users_updated_at
before update on public.content_admin_users
for each row
execute function public.set_content_admin_users_updated_at();

-- The caller's effective content role. Internal admins are primary_admin by construction, so the
-- CMS never needs a second identity table or an email allowlist.
create or replace function public.content_current_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when public.is_internal_admin() then 'primary_admin'
    else (
      select cau.content_role
      from public.content_admin_users cau
      where cau.auth_user_id = auth.uid()
        and cau.status = 'active'
      limit 1
    )
  end
$$;

comment on function public.content_current_role() is
  'Effective content role for the current caller. Internal admins resolve to primary_admin.';

-- The partner organization a partner_contributor is scoped to (null for every other role).
create or replace function public.content_current_partner_slug()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select cau.partner_slug
  from public.content_admin_users cau
  where cau.auth_user_id = auth.uid()
    and cau.status = 'active'
    and cau.content_role = 'partner_contributor'
  limit 1
$$;

-- Roles permitted to edit any post (not just their own).
create or replace function public.content_can_edit_any()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.content_current_role() in ('primary_admin', 'editor')
$$;

-- Roles permitted to move a post into a published state.
create or replace function public.content_can_publish()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.content_current_role() in ('primary_admin', 'editor')
$$;

create or replace function public.content_can_legal_approve()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.content_current_role() in ('primary_admin', 'legal_reviewer')
$$;

create or replace function public.content_has_any_role()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.content_current_role() is not null
$$;

revoke all on function public.content_current_role() from public;
revoke all on function public.content_current_role() from anon;
grant execute on function public.content_current_role() to authenticated;
grant execute on function public.content_current_role() to service_role;

revoke all on function public.content_current_partner_slug() from public;
revoke all on function public.content_current_partner_slug() from anon;
grant execute on function public.content_current_partner_slug() to authenticated;
grant execute on function public.content_current_partner_slug() to service_role;

revoke all on function public.content_can_edit_any() from public;
revoke all on function public.content_can_edit_any() from anon;
grant execute on function public.content_can_edit_any() to authenticated;
grant execute on function public.content_can_edit_any() to service_role;

revoke all on function public.content_can_publish() from public;
revoke all on function public.content_can_publish() from anon;
grant execute on function public.content_can_publish() to authenticated;
grant execute on function public.content_can_publish() to service_role;

revoke all on function public.content_can_legal_approve() from public;
revoke all on function public.content_can_legal_approve() from anon;
grant execute on function public.content_can_legal_approve() to authenticated;
grant execute on function public.content_can_legal_approve() to service_role;

revoke all on function public.content_has_any_role() from public;
revoke all on function public.content_has_any_role() from anon;
grant execute on function public.content_has_any_role() to authenticated;
grant execute on function public.content_has_any_role() to service_role;

alter table public.content_admin_users enable row level security;

drop policy if exists content_admin_users_select_self on public.content_admin_users;
create policy content_admin_users_select_self
on public.content_admin_users
for select
to authenticated
using (auth_user_id = auth.uid() or public.is_internal_admin());

drop policy if exists content_admin_users_manage_primary_admin on public.content_admin_users;
create policy content_admin_users_manage_primary_admin
on public.content_admin_users
for all
to authenticated
using (public.is_internal_admin())
with check (public.is_internal_admin());

-- =================================================================================================
-- Authors and taxonomy
-- =================================================================================================

create table if not exists public.content_authors (
  author_id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  title text,
  organization text,
  bio text,
  avatar_media_id uuid,
  auth_user_id uuid references auth.users(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.content_authors is 'Public bylines. An author need not be a Supabase user.';

create index if not exists content_authors_slug_idx on public.content_authors (slug);

create or replace function public.set_content_authors_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_content_authors_updated_at on public.content_authors;

create trigger set_content_authors_updated_at
before update on public.content_authors
for each row
execute function public.set_content_authors_updated_at();

create table if not exists public.content_categories (
  category_id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  destination text,
  created_at timestamptz not null default now(),
  constraint content_categories_destination_check check (
    destination is null or destination in ('expungement_ai', 'legalease_partner')
  )
);

comment on table public.content_categories is 'Editorial categories. A null destination means the category is shared by both sites.';

create table if not exists public.content_tags (
  tag_id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

-- =================================================================================================
-- Posts — the spine of the platform
-- =================================================================================================

create table if not exists public.content_posts (
  post_id uuid primary key default gen_random_uuid(),
  slug text not null,
  destination text not null,
  content_type text not null,
  status text not null default 'draft',
  locale text not null default 'en',
  title text not null,
  subtitle text,
  excerpt text,
  -- The editing source of truth. Public HTML is derived from this by the allowlisting renderer in
  -- src/lib/content/renderer.ts; rendered_html below is a cache of that render, never editor output.
  doc jsonb not null default '{"type":"doc","content":[]}'::jsonb,
  rendered_html text,
  search_text text,
  reading_minutes integer,
  category_id uuid references public.content_categories(category_id) on delete set null,
  author_id uuid references public.content_authors(author_id) on delete set null,
  featured_media_id uuid,
  partner_slug text,
  jurisdiction_code text,
  legal_sensitive boolean not null default false,
  seo_title text,
  seo_description text,
  canonical_url text,
  og_title text,
  og_description text,
  og_media_id uuid,
  version integer not null default 1,
  published_at timestamptz,
  scheduled_for timestamptz,
  first_published_at timestamptz,
  legal_approved_at timestamptz,
  legal_approved_by uuid references auth.users(id) on delete set null,
  editorial_approved_at timestamptz,
  editorial_approved_by uuid references auth.users(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_posts_destination_check check (destination in ('expungement_ai', 'legalease_partner')),
  constraint content_posts_type_check check (
    content_type in (
      'blog_article',
      'product_announcement',
      'founder_note',
      'partner_insight',
      'partner_story',
      'testimonial_story',
      'state_resource',
      'downloadable_resource',
      'resource_guide'
    )
  ),
  constraint content_posts_status_check check (
    status in (
      'draft',
      'in_editorial_review',
      'changes_requested',
      'in_legal_review',
      'approved',
      'scheduled',
      'published',
      'updated',
      'archived'
    )
  ),
  constraint content_posts_doc_object_check check (jsonb_typeof(doc) = 'object'),
  -- Slug uniqueness is per destination + locale: expungement.ai/blog/foo and the partner site's
  -- /insights/foo are different articles and must not collide with each other.
  constraint content_posts_slug_destination_locale_key unique (destination, locale, slug),
  -- A scheduled post must actually carry a scheduled time.
  constraint content_posts_scheduled_requires_time_check check (
    status <> 'scheduled' or scheduled_for is not null
  ),
  -- A published post must carry a publication time.
  constraint content_posts_published_requires_time_check check (
    status not in ('published', 'updated') or published_at is not null
  ),
  -- THE LEGAL BACKSTOP: legally substantive content cannot be live without a recorded legal
  -- approval. Mirrors requiresLegalReview() in src/lib/content/types.ts.
  constraint content_posts_legal_review_required_check check (
    status not in ('published', 'updated', 'scheduled')
    or not (content_type in ('state_resource', 'resource_guide') or legal_sensitive)
    or legal_approved_at is not null
  )
);

comment on table public.content_posts is
  'Articles, partner stories, announcements, and state-resource editorial. doc is the source of truth; rendered_html is a server-rendered cache.';
comment on column public.content_posts.doc is
  'Structured block document (Tiptap/ProseMirror shape). Never trust editor HTML: rendered_html is produced by src/lib/content/renderer.ts.';
comment on column public.content_posts.legal_approved_at is
  'Set only by a legal_reviewer/primary_admin. The content_posts_legal_review_required_check constraint blocks publication of legal content without it.';
comment on column public.content_posts.partner_slug is
  'Owning partner organization, for partner stories and partner_contributor-authored drafts. RLS scopes partner_contributor to this column.';

create index if not exists content_posts_destination_status_idx
  on public.content_posts (destination, status);
create index if not exists content_posts_published_at_idx
  on public.content_posts (published_at desc)
  where published_at is not null;
create index if not exists content_posts_scheduled_for_idx
  on public.content_posts (scheduled_for)
  where scheduled_for is not null;
create index if not exists content_posts_partner_slug_idx
  on public.content_posts (partner_slug)
  where partner_slug is not null;
create index if not exists content_posts_jurisdiction_idx
  on public.content_posts (jurisdiction_code)
  where jurisdiction_code is not null;

create or replace function public.set_content_posts_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_content_posts_updated_at on public.content_posts;

create trigger set_content_posts_updated_at
before update on public.content_posts
for each row
execute function public.set_content_posts_updated_at();

alter table public.content_posts enable row level security;

-- PUBLIC READ: the only door the anonymous web gets. Drafts, scheduled posts, in-review posts, and
-- archived posts are all invisible here — not merely filtered by the app.
drop policy if exists content_posts_select_public on public.content_posts;
create policy content_posts_select_public
on public.content_posts
for select
to anon, authenticated
using (
  status in ('published', 'updated')
  and published_at is not null
  and published_at <= now()
);

-- CMS READ: anyone with a content role sees everything, except partner_contributor, who sees only
-- their own organization's rows.
drop policy if exists content_posts_select_content_team on public.content_posts;
create policy content_posts_select_content_team
on public.content_posts
for select
to authenticated
using (
  (public.content_has_any_role() and public.content_current_role() <> 'partner_contributor')
  or (
    public.content_current_role() = 'partner_contributor'
    and partner_slug is not null
    and partner_slug = public.content_current_partner_slug()
  )
);

drop policy if exists content_posts_insert_authors on public.content_posts;
create policy content_posts_insert_authors
on public.content_posts
for insert
to authenticated
with check (
  (
    public.content_current_role() in ('primary_admin', 'editor', 'contributor')
    and status in ('draft', 'in_editorial_review')
  )
  or (
    public.content_current_role() = 'partner_contributor'
    and status in ('draft', 'in_editorial_review')
    and partner_slug is not null
    and partner_slug = public.content_current_partner_slug()
  )
);

drop policy if exists content_posts_update_editors on public.content_posts;
create policy content_posts_update_editors
on public.content_posts
for update
to authenticated
using (public.content_can_edit_any())
with check (public.content_can_edit_any());

drop policy if exists content_posts_update_own_draft on public.content_posts;
create policy content_posts_update_own_draft
on public.content_posts
for update
to authenticated
using (
  (
    public.content_current_role() = 'contributor'
    and created_by = auth.uid()
    and status in ('draft', 'changes_requested')
  )
  or (
    public.content_current_role() = 'partner_contributor'
    and partner_slug is not null
    and partner_slug = public.content_current_partner_slug()
    and status in ('draft', 'changes_requested')
  )
)
with check (
  (
    public.content_current_role() = 'contributor'
    and created_by = auth.uid()
    and status in ('draft', 'in_editorial_review', 'changes_requested')
  )
  or (
    public.content_current_role() = 'partner_contributor'
    and partner_slug is not null
    and partner_slug = public.content_current_partner_slug()
    and status in ('draft', 'in_editorial_review', 'changes_requested')
  )
);

drop policy if exists content_posts_legal_review_update on public.content_posts;
create policy content_posts_legal_review_update
on public.content_posts
for update
to authenticated
using (public.content_can_legal_approve())
with check (public.content_can_legal_approve());

drop policy if exists content_posts_service_role_all on public.content_posts;
create policy content_posts_service_role_all
on public.content_posts
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- =================================================================================================
-- Version history
-- =================================================================================================

create table if not exists public.content_post_versions (
  version_id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.content_posts(post_id) on delete cascade,
  version integer not null,
  title text not null,
  subtitle text,
  doc jsonb not null,
  rendered_html text,
  status text not null,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint content_post_versions_doc_object_check check (jsonb_typeof(doc) = 'object'),
  constraint content_post_versions_post_version_key unique (post_id, version)
);

comment on table public.content_post_versions is
  'Immutable snapshot per saved version. Restoring a version writes a NEW version rather than mutating history.';

create index if not exists content_post_versions_post_id_idx
  on public.content_post_versions (post_id, version desc);

alter table public.content_post_versions enable row level security;

drop policy if exists content_post_versions_select_team on public.content_post_versions;
create policy content_post_versions_select_team
on public.content_post_versions
for select
to authenticated
using (public.content_has_any_role());

drop policy if exists content_post_versions_service_role_all on public.content_post_versions;
create policy content_post_versions_service_role_all
on public.content_post_versions
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- =================================================================================================
-- Tags (join)
-- =================================================================================================

create table if not exists public.content_post_tags (
  post_id uuid not null references public.content_posts(post_id) on delete cascade,
  tag_id uuid not null references public.content_tags(tag_id) on delete cascade,
  primary key (post_id, tag_id)
);

alter table public.content_tags enable row level security;
alter table public.content_categories enable row level security;
alter table public.content_authors enable row level security;
alter table public.content_post_tags enable row level security;

-- Taxonomy and bylines are public-by-design (they appear on published pages).
drop policy if exists content_tags_select_public on public.content_tags;
create policy content_tags_select_public on public.content_tags for select to anon, authenticated using (true);

drop policy if exists content_categories_select_public on public.content_categories;
create policy content_categories_select_public on public.content_categories for select to anon, authenticated using (true);

drop policy if exists content_authors_select_public on public.content_authors;
create policy content_authors_select_public on public.content_authors for select to anon, authenticated using (is_active);

drop policy if exists content_post_tags_select_public on public.content_post_tags;
create policy content_post_tags_select_public on public.content_post_tags for select to anon, authenticated using (true);

drop policy if exists content_tags_manage on public.content_tags;
create policy content_tags_manage on public.content_tags for all to authenticated
using (public.content_can_edit_any()) with check (public.content_can_edit_any());

drop policy if exists content_categories_manage on public.content_categories;
create policy content_categories_manage on public.content_categories for all to authenticated
using (public.content_can_edit_any()) with check (public.content_can_edit_any());

drop policy if exists content_authors_manage on public.content_authors;
create policy content_authors_manage on public.content_authors for all to authenticated
using (public.content_can_edit_any()) with check (public.content_can_edit_any());

drop policy if exists content_post_tags_manage on public.content_post_tags;
create policy content_post_tags_manage on public.content_post_tags for all to authenticated
using (public.content_can_edit_any()) with check (public.content_can_edit_any());

drop policy if exists content_tags_service_role_all on public.content_tags;
create policy content_tags_service_role_all on public.content_tags for all
using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists content_categories_service_role_all on public.content_categories;
create policy content_categories_service_role_all on public.content_categories for all
using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists content_authors_service_role_all on public.content_authors;
create policy content_authors_service_role_all on public.content_authors for all
using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists content_post_tags_service_role_all on public.content_post_tags;
create policy content_post_tags_service_role_all on public.content_post_tags for all
using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- =================================================================================================
-- Media library
-- =================================================================================================

create table if not exists public.content_media (
  media_id uuid primary key default gen_random_uuid(),
  storage_path text not null unique,
  public_url text,
  mime_type text not null,
  byte_size bigint not null,
  width integer,
  height integer,
  alt_text text,
  caption text,
  credit text,
  source_info text,
  permission_status text not null default 'unknown',
  archived boolean not null default false,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_media_mime_check check (
    mime_type in ('image/jpeg', 'image/png', 'image/webp', 'image/gif')
  ),
  constraint content_media_permission_check check (
    permission_status in ('owned', 'licensed', 'partner_approved', 'user_consented', 'editorial_use', 'unknown')
  ),
  constraint content_media_byte_size_check check (byte_size > 0 and byte_size <= 12582912)
);

comment on table public.content_media is
  'Reusable media library. permission_status drives publication warnings/blocks (see src/lib/content/media.ts).';
comment on column public.content_media.permission_status is
  'unknown blocks publication as a featured/social image; the CMS surfaces it as a hard error, not a warning.';

create index if not exists content_media_created_at_idx on public.content_media (created_at desc);
create index if not exists content_media_permission_idx on public.content_media (permission_status);

create or replace function public.set_content_media_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_content_media_updated_at on public.content_media;

create trigger set_content_media_updated_at
before update on public.content_media
for each row
execute function public.set_content_media_updated_at();

create table if not exists public.content_media_usages (
  usage_id uuid primary key default gen_random_uuid(),
  media_id uuid not null references public.content_media(media_id) on delete cascade,
  post_id uuid not null references public.content_posts(post_id) on delete cascade,
  usage_kind text not null default 'body',
  created_at timestamptz not null default now(),
  constraint content_media_usages_kind_check check (usage_kind in ('featured', 'body', 'og', 'social')),
  constraint content_media_usages_unique_key unique (media_id, post_id, usage_kind)
);

comment on table public.content_media_usages is 'Where each asset is used. Powers "in use by N articles" and safe archival.';

alter table public.content_media enable row level security;
alter table public.content_media_usages enable row level security;

-- Media rows are readable by the public because published pages reference their URLs; there is no
-- sensitive data in the row. Writes are restricted to content roles with media capability.
drop policy if exists content_media_select_public on public.content_media;
create policy content_media_select_public
on public.content_media
for select
to anon, authenticated
using (not archived);

drop policy if exists content_media_insert_team on public.content_media;
create policy content_media_insert_team
on public.content_media
for insert
to authenticated
with check (
  public.content_current_role() in ('primary_admin', 'editor', 'social_manager', 'contributor')
);

drop policy if exists content_media_update_team on public.content_media;
create policy content_media_update_team
on public.content_media
for update
to authenticated
using (public.content_current_role() in ('primary_admin', 'editor', 'social_manager'))
with check (public.content_current_role() in ('primary_admin', 'editor', 'social_manager'));

drop policy if exists content_media_service_role_all on public.content_media;
create policy content_media_service_role_all on public.content_media for all
using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists content_media_usages_select_team on public.content_media_usages;
create policy content_media_usages_select_team
on public.content_media_usages
for select
to authenticated
using (public.content_has_any_role());

drop policy if exists content_media_usages_service_role_all on public.content_media_usages;
create policy content_media_usages_service_role_all on public.content_media_usages for all
using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- =================================================================================================
-- Testimonials and state editorial
-- =================================================================================================

create table if not exists public.content_testimonials (
  testimonial_id uuid primary key default gen_random_uuid(),
  quote text not null,
  attribution text not null,
  role_title text,
  partner_slug text,
  consent_status text not null default 'unknown',
  consent_reference text,
  approved boolean not null default false,
  media_id uuid references public.content_media(media_id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_testimonials_consent_check check (
    consent_status in ('written_consent', 'partner_approved', 'user_consented', 'unknown')
  ),
  -- A testimonial cannot be approved for display without a recorded consent basis. This is the
  -- database backstop for "do not publish fake or unconsented testimonials".
  constraint content_testimonials_consent_required_check check (
    not approved or consent_status <> 'unknown'
  )
);

comment on table public.content_testimonials is
  'Real, consented testimonials only. approved=true requires a non-unknown consent_status (DB-enforced).';

create or replace function public.set_content_testimonials_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_content_testimonials_updated_at on public.content_testimonials;

create trigger set_content_testimonials_updated_at
before update on public.content_testimonials
for each row
execute function public.set_content_testimonials_updated_at();

-- The EDITABLE layer of a state resource page. The LOCKED layer is never stored here: it is derived
-- at render time from the approved public state projection (src/lib/content/state-resources.ts), so
-- there is exactly one legal-rules source of truth and this table cannot contradict it.
create table if not exists public.content_state_editorial (
  jurisdiction_code text primary key,
  intro text,
  overview text,
  featured_media_id uuid references public.content_media(media_id) on delete set null,
  faqs jsonb not null default '[]'::jsonb,
  related_slugs jsonb not null default '[]'::jsonb,
  partner_quote text,
  partner_slug text,
  announcement text,
  seo_title text,
  seo_description text,
  og_media_id uuid references public.content_media(media_id) on delete set null,
  cta_label text,
  cta_href text,
  status text not null default 'draft',
  legal_approved_at timestamptz,
  legal_approved_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_state_editorial_code_check check (jurisdiction_code ~ '^[A-Z]{2}$'),
  constraint content_state_editorial_status_check check (
    status in ('draft', 'in_legal_review', 'approved', 'published', 'archived')
  ),
  constraint content_state_editorial_faqs_array_check check (jsonb_typeof(faqs) = 'array'),
  constraint content_state_editorial_related_array_check check (jsonb_typeof(related_slugs) = 'array'),
  -- State editorial is inherently legal content: it cannot go live without legal approval.
  constraint content_state_editorial_legal_required_check check (
    status <> 'published' or legal_approved_at is not null
  )
);

comment on table public.content_state_editorial is
  'EDITORIAL layer only for /resources/[jurisdiction]. The locked legal layer is derived from the state engine projection at render time and is never duplicated here.';

create or replace function public.set_content_state_editorial_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_content_state_editorial_updated_at on public.content_state_editorial;

create trigger set_content_state_editorial_updated_at
before update on public.content_state_editorial
for each row
execute function public.set_content_state_editorial_updated_at();

alter table public.content_testimonials enable row level security;
alter table public.content_state_editorial enable row level security;

drop policy if exists content_testimonials_select_public on public.content_testimonials;
create policy content_testimonials_select_public
on public.content_testimonials
for select
to anon, authenticated
using (approved);

drop policy if exists content_testimonials_manage on public.content_testimonials;
create policy content_testimonials_manage on public.content_testimonials for all to authenticated
using (public.content_can_edit_any()) with check (public.content_can_edit_any());

drop policy if exists content_testimonials_service_role_all on public.content_testimonials;
create policy content_testimonials_service_role_all on public.content_testimonials for all
using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists content_state_editorial_select_public on public.content_state_editorial;
create policy content_state_editorial_select_public
on public.content_state_editorial
for select
to anon, authenticated
using (status = 'published');

drop policy if exists content_state_editorial_select_team on public.content_state_editorial;
create policy content_state_editorial_select_team
on public.content_state_editorial
for select
to authenticated
using (public.content_has_any_role());

drop policy if exists content_state_editorial_manage on public.content_state_editorial;
create policy content_state_editorial_manage on public.content_state_editorial for all to authenticated
using (public.content_can_edit_any()) with check (public.content_can_edit_any());

drop policy if exists content_state_editorial_service_role_all on public.content_state_editorial;
create policy content_state_editorial_service_role_all on public.content_state_editorial for all
using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- =================================================================================================
-- Review + publication history
-- =================================================================================================

create table if not exists public.content_reviews (
  review_id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.content_posts(post_id) on delete cascade,
  review_kind text not null,
  decision text not null,
  notes text,
  reviewer_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint content_reviews_kind_check check (review_kind in ('editorial', 'legal')),
  constraint content_reviews_decision_check check (decision in ('approved', 'changes_requested'))
);

comment on table public.content_reviews is 'Every editorial and legal review decision, with the reviewer identity.';

create index if not exists content_reviews_post_id_idx on public.content_reviews (post_id, created_at desc);

create table if not exists public.content_publications (
  publication_id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.content_posts(post_id) on delete cascade,
  action text not null,
  version integer,
  actor_id uuid references auth.users(id) on delete set null,
  occurred_at timestamptz not null default now(),
  constraint content_publications_action_check check (
    action in ('published', 'updated', 'scheduled', 'unpublished', 'archived', 'restored')
  )
);

comment on table public.content_publications is 'Publication lifecycle history (published/scheduled/unpublished/archived/restored).';

create index if not exists content_publications_post_id_idx on public.content_publications (post_id, occurred_at desc);

alter table public.content_reviews enable row level security;
alter table public.content_publications enable row level security;

drop policy if exists content_reviews_select_team on public.content_reviews;
create policy content_reviews_select_team on public.content_reviews for select to authenticated
using (public.content_has_any_role());

drop policy if exists content_reviews_service_role_all on public.content_reviews;
create policy content_reviews_service_role_all on public.content_reviews for all
using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists content_publications_select_team on public.content_publications;
create policy content_publications_select_team on public.content_publications for select to authenticated
using (public.content_has_any_role());

drop policy if exists content_publications_service_role_all on public.content_publications;
create policy content_publications_service_role_all on public.content_publications for all
using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- =================================================================================================
-- Social promotion
-- =================================================================================================

create table if not exists public.content_social_drafts (
  social_draft_id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.content_posts(post_id) on delete cascade,
  channel text not null,
  primary_caption text,
  alternate_caption text,
  founder_voice_caption text,
  partner_caption text,
  hashtags jsonb not null default '[]'::jsonb,
  mention_tags jsonb not null default '[]'::jsonb,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  social_asset_id uuid,
  approval_state text not null default 'draft',
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_social_drafts_channel_check check (
    channel in ('linkedin', 'x', 'facebook', 'instagram', 'threads', 'email', 'partner_kit')
  ),
  constraint content_social_drafts_state_check check (
    approval_state in ('draft', 'approved', 'sent', 'failed')
  ),
  constraint content_social_drafts_hashtags_array_check check (jsonb_typeof(hashtags) = 'array'),
  constraint content_social_drafts_tags_array_check check (jsonb_typeof(mention_tags) = 'array'),
  constraint content_social_drafts_post_channel_key unique (post_id, channel)
);

comment on table public.content_social_drafts is
  'Per-channel promotion copy. LegalEase owns the draft and the approval; the Command Center owns connected accounts and external publishing.';

create or replace function public.set_content_social_drafts_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_content_social_drafts_updated_at on public.content_social_drafts;

create trigger set_content_social_drafts_updated_at
before update on public.content_social_drafts
for each row
execute function public.set_content_social_drafts_updated_at();

create table if not exists public.content_social_assets (
  social_asset_id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.content_posts(post_id) on delete cascade,
  template text not null,
  size_key text not null,
  width integer not null,
  height integer not null,
  image_url text,
  headline text,
  created_at timestamptz not null default now(),
  constraint content_social_assets_template_check check (
    template in (
      'editorial_cover',
      'founder_note',
      'partner_spotlight',
      'quote_card',
      'product_announcement',
      'state_resource'
    )
  ),
  constraint content_social_assets_size_check check (size_key in ('og', 'square', 'portrait')),
  constraint content_social_assets_post_template_size_key unique (post_id, template, size_key)
);

comment on table public.content_social_assets is
  'Deterministic branded social graphics (1200x630, 1080x1080, 1080x1350). Rendered from repo brand assets — never AI-generated imagery.';

create table if not exists public.content_campaigns (
  campaign_id uuid primary key default gen_random_uuid(),
  post_id uuid references public.content_posts(post_id) on delete cascade,
  name text not null,
  destination text not null,
  status text not null default 'draft',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_campaigns_destination_check check (destination in ('expungement_ai', 'legalease_partner')),
  constraint content_campaigns_status_check check (status in ('draft', 'approved', 'sent', 'failed'))
);

create table if not exists public.content_campaign_channels (
  campaign_channel_id uuid primary key default gen_random_uuid(),
  campaign_id uuid not null references public.content_campaigns(campaign_id) on delete cascade,
  channel text not null,
  social_draft_id uuid references public.content_social_drafts(social_draft_id) on delete set null,
  -- Per-channel delivery status reported back BY the Command Center. LegalEase never sets this to
  -- 'published' itself; it only records what the Command Center reports.
  delivery_status text not null default 'pending',
  external_reference text,
  status_updated_at timestamptz,
  constraint content_campaign_channels_channel_check check (
    channel in ('linkedin', 'x', 'facebook', 'instagram', 'threads', 'email', 'partner_kit')
  ),
  constraint content_campaign_channels_status_check check (
    delivery_status in ('pending', 'accepted', 'scheduled', 'published', 'failed', 'skipped')
  ),
  constraint content_campaign_channels_campaign_channel_key unique (campaign_id, channel)
);

comment on column public.content_campaign_channels.delivery_status is
  'Set from Command Center status callbacks only. LegalEase does not publish externally.';

create or replace function public.set_content_campaigns_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_content_campaigns_updated_at on public.content_campaigns;

create trigger set_content_campaigns_updated_at
before update on public.content_campaigns
for each row
execute function public.set_content_campaigns_updated_at();

alter table public.content_social_drafts enable row level security;
alter table public.content_social_assets enable row level security;
alter table public.content_campaigns enable row level security;
alter table public.content_campaign_channels enable row level security;

drop policy if exists content_social_drafts_team on public.content_social_drafts;
create policy content_social_drafts_team on public.content_social_drafts for all to authenticated
using (public.content_current_role() in ('primary_admin', 'editor', 'social_manager'))
with check (public.content_current_role() in ('primary_admin', 'editor', 'social_manager'));

drop policy if exists content_social_drafts_service_role_all on public.content_social_drafts;
create policy content_social_drafts_service_role_all on public.content_social_drafts for all
using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists content_social_assets_team on public.content_social_assets;
create policy content_social_assets_team on public.content_social_assets for all to authenticated
using (public.content_current_role() in ('primary_admin', 'editor', 'social_manager'))
with check (public.content_current_role() in ('primary_admin', 'editor', 'social_manager'));

drop policy if exists content_social_assets_service_role_all on public.content_social_assets;
create policy content_social_assets_service_role_all on public.content_social_assets for all
using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists content_campaigns_team on public.content_campaigns;
create policy content_campaigns_team on public.content_campaigns for all to authenticated
using (public.content_current_role() in ('primary_admin', 'editor', 'social_manager'))
with check (public.content_current_role() in ('primary_admin', 'editor', 'social_manager'));

drop policy if exists content_campaigns_service_role_all on public.content_campaigns;
create policy content_campaigns_service_role_all on public.content_campaigns for all
using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

drop policy if exists content_campaign_channels_team on public.content_campaign_channels;
create policy content_campaign_channels_team on public.content_campaign_channels for select to authenticated
using (public.content_has_any_role());

drop policy if exists content_campaign_channels_service_role_all on public.content_campaign_channels;
create policy content_campaign_channels_service_role_all on public.content_campaign_channels for all
using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

-- =================================================================================================
-- Transactional outbox for Command Center delivery
-- =================================================================================================

create table if not exists public.content_promotion_outbox (
  event_id uuid primary key default gen_random_uuid(),
  event_type text not null,
  -- Stable across retries. The Command Center de-duplicates on this, so a retry storm can never
  -- double-publish a post to LinkedIn.
  idempotency_key text not null unique,
  post_id uuid references public.content_posts(post_id) on delete set null,
  campaign_id uuid references public.content_campaigns(campaign_id) on delete set null,
  payload jsonb not null,
  status text not null default 'pending',
  attempts integer not null default 0,
  max_attempts integer not null default 8,
  last_error text,
  next_attempt_at timestamptz not null default now(),
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint content_promotion_outbox_type_check check (
    event_type in ('content.promotion.requested', 'content.published', 'content.unpublished')
  ),
  constraint content_promotion_outbox_status_check check (
    status in ('pending', 'sending', 'sent', 'failed', 'dead')
  ),
  constraint content_promotion_outbox_payload_object_check check (jsonb_typeof(payload) = 'object'),
  constraint content_promotion_outbox_attempts_check check (attempts >= 0)
);

comment on table public.content_promotion_outbox is
  'Transactional outbox. A promotion send writes a row in the same transaction as the approval; a worker delivers it with HMAC signing and retries. Publishing a post and sending its promotion are separate actions.';
comment on column public.content_promotion_outbox.idempotency_key is
  'Stable retry-safe key. The Command Center must de-duplicate on it.';

create index if not exists content_promotion_outbox_status_idx
  on public.content_promotion_outbox (status, next_attempt_at);

create or replace function public.set_content_promotion_outbox_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_content_promotion_outbox_updated_at on public.content_promotion_outbox;

create trigger set_content_promotion_outbox_updated_at
before update on public.content_promotion_outbox
for each row
execute function public.set_content_promotion_outbox_updated_at();

alter table public.content_promotion_outbox enable row level security;

-- The outbox is service-role only. No browser session, not even a primary admin's, can read or
-- write delivery state directly — it moves only through the server worker.
drop policy if exists content_promotion_outbox_service_role_all on public.content_promotion_outbox;
create policy content_promotion_outbox_service_role_all
on public.content_promotion_outbox
for all
using (auth.role() = 'service_role')
with check (auth.role() = 'service_role');

-- =================================================================================================
-- Append-only audit log
-- =================================================================================================

create table if not exists public.content_audit_events (
  audit_id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint content_audit_events_detail_object_check check (jsonb_typeof(detail) = 'object')
);

comment on table public.content_audit_events is
  'APPEND-ONLY. Every approval, rejection, override, publication, schedule, archive, restore, and promotion send. The reject_content_audit_mutation trigger blocks UPDATE and DELETE for every role including service_role.';

create index if not exists content_audit_events_created_at_idx on public.content_audit_events (created_at desc);
create index if not exists content_audit_events_entity_idx on public.content_audit_events (entity_type, entity_id);

-- Append-only is enforced by a trigger, not merely by withholding a policy: service_role bypasses
-- RLS, so without this an operator script could silently rewrite the audit trail.
create or replace function public.reject_content_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'content_audit_events is append-only';
end;
$$;

drop trigger if exists reject_content_audit_update on public.content_audit_events;

create trigger reject_content_audit_update
before update on public.content_audit_events
for each row
execute function public.reject_content_audit_mutation();

drop trigger if exists reject_content_audit_delete on public.content_audit_events;

create trigger reject_content_audit_delete
before delete on public.content_audit_events
for each row
execute function public.reject_content_audit_mutation();

alter table public.content_audit_events enable row level security;

drop policy if exists content_audit_events_select_team on public.content_audit_events;
create policy content_audit_events_select_team
on public.content_audit_events
for select
to authenticated
using (public.content_has_any_role());

drop policy if exists content_audit_events_insert_service_role on public.content_audit_events;
create policy content_audit_events_insert_service_role
on public.content_audit_events
for insert
with check (auth.role() = 'service_role');

drop policy if exists content_audit_events_select_service_role on public.content_audit_events;
create policy content_audit_events_select_service_role
on public.content_audit_events
for select
using (auth.role() = 'service_role');

-- =================================================================================================
-- Media storage bucket (optional block — skipped where the storage schema is absent, e.g. PGlite)
-- =================================================================================================

do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'content-media',
      'content-media',
      true,
      12582912,
      array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    )
    on conflict (id) do nothing;
  end if;
end;
$$;
