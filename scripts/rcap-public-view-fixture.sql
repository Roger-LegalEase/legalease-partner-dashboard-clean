-- Deterministic content fixture for the public-view row-set proof.
--
-- Every row exists to be either included or excluded by one of the five content_public_*
-- views, so that "the row sets did not change" is a claim about real edge cases rather
-- than about an empty table: an inactive author, a draft post, a post published in the
-- future, an archived asset, an asset referenced only by a draft, an unapproved
-- testimonial and a draft editorial record all have to stay invisible.
--
-- Loaded into two databases — one built without the hardening phase and one with it — by
-- scripts/verify-rcap-production-schema-upgrade.mjs, which then reads all five views as
-- anon in each and compares. Fixed UUIDs keep the two sides comparable.

insert into public.content_authors (author_id, slug, name, title, organization, bio, avatar_media_id, is_active)
values
  ('a0000000-0000-4000-8000-000000000001', 'active-author', 'Active Author', 'Editor', 'LegalEase', 'Visible byline.', null, true),
  ('a0000000-0000-4000-8000-000000000002', 'inactive-author', 'Inactive Author', 'Former', 'LegalEase', 'Hidden byline.', null, false)
on conflict do nothing;

insert into public.content_media (media_id, storage_path, mime_type, byte_size, alt_text, caption, credit, width, height, archived)
values
  ('11111111-0000-4000-8000-000000000001', 'private/used-by-published.png', 'image/png', 1024, 'used by published', 'cap 1', 'credit 1', 800, 600, false),
  ('11111111-0000-4000-8000-000000000002', 'private/archived.png', 'image/png', 1024, 'archived', 'cap 2', 'credit 2', 800, 600, true),
  ('11111111-0000-4000-8000-000000000003', 'private/unreferenced.png', 'image/png', 1024, 'unreferenced', 'cap 3', 'credit 3', 800, 600, false),
  ('11111111-0000-4000-8000-000000000004', 'private/editorial-featured.png', 'image/png', 1024, 'editorial', 'cap 4', 'credit 4', 800, 600, false),
  ('11111111-0000-4000-8000-000000000005', 'private/testimonial.png', 'image/png', 1024, 'testimonial', 'cap 5', 'credit 5', 800, 600, false),
  ('11111111-0000-4000-8000-000000000006', 'private/draft-only.png', 'image/png', 1024, 'draft only', 'cap 6', 'credit 6', 800, 600, false)
on conflict do nothing;

insert into public.content_posts (
  post_id, slug, destination, content_type, status, locale, title, subtitle, excerpt,
  rendered_html, reading_minutes, author_id, published_at, updated_at, legal_sensitive
)
values
  ('22222222-0000-4000-8000-000000000001', 'published-post', 'expungement_ai', 'blog_article', 'published', 'en',
   'Published post', 'sub', 'excerpt', '<p>published</p>', 3,
   'a0000000-0000-4000-8000-000000000001', timestamptz '2026-01-02 00:00:00+00', timestamptz '2026-01-03 00:00:00+00', false),
  ('22222222-0000-4000-8000-000000000002', 'draft-post', 'expungement_ai', 'blog_article', 'draft', 'en',
   'Draft post', 'sub', 'excerpt', '<p>draft</p>', 3,
   'a0000000-0000-4000-8000-000000000001', null, timestamptz '2026-01-07 00:00:00+00', false),
  ('22222222-0000-4000-8000-000000000003', 'future-post', 'expungement_ai', 'blog_article', 'published', 'en',
   'Future post', 'sub', 'excerpt', '<p>future</p>', 3,
   'a0000000-0000-4000-8000-000000000001', timestamptz '2099-01-01 00:00:00+00', timestamptz '2026-01-08 00:00:00+00', false),
  ('22222222-0000-4000-8000-000000000004', 'updated-post', 'legalease_partner', 'blog_article', 'updated', 'en',
   'Updated post', 'sub', 'excerpt', '<p>updated</p>', 4,
   'a0000000-0000-4000-8000-000000000001', timestamptz '2026-01-05 00:00:00+00', timestamptz '2026-01-06 00:00:00+00', false)
on conflict do nothing;

insert into public.content_media_usages (usage_id, media_id, post_id, usage_kind)
values
  ('44444444-0000-4000-8000-000000000001', '11111111-0000-4000-8000-000000000001', '22222222-0000-4000-8000-000000000001', 'body'),
  ('44444444-0000-4000-8000-000000000002', '11111111-0000-4000-8000-000000000006', '22222222-0000-4000-8000-000000000002', 'body'),
  ('44444444-0000-4000-8000-000000000003', '11111111-0000-4000-8000-000000000002', '22222222-0000-4000-8000-000000000001', 'body')
on conflict do nothing;

-- content_state_editorial_legal_required_check: a published record must carry a legal
-- approval timestamp, so the published fixture row supplies one.
insert into public.content_state_editorial (jurisdiction_code, intro, overview, featured_media_id, status, legal_approved_at)
values
  ('CA', 'Published intro', 'Published overview', '11111111-0000-4000-8000-000000000004', 'published', timestamptz '2026-01-04 00:00:00+00'),
  ('NY', 'Draft intro', 'Draft overview', null, 'draft', null)
on conflict do nothing;

insert into public.content_testimonials (testimonial_id, quote, attribution, role_title, media_id, consent_status, approved)
values
  ('33333333-0000-4000-8000-000000000001', 'Approved quote', 'A. Person', 'Client', '11111111-0000-4000-8000-000000000005', 'written_consent', true),
  ('33333333-0000-4000-8000-000000000002', 'Unapproved quote', 'B. Person', 'Client', null, 'unknown', false)
on conflict do nothing;
