-- Forward-only step 8 of 8 in the Production schema upgrade.
--
-- Start: supabase/migrations/20260728213131_remote_schema.sql, the recovered and
--        validated Production baseline (44 tables, 35 functions, 5 views, 44 RLS
--        tables, 1 forced-RLS table, 73 policies).
-- End:   the accepted repository schema — that baseline with every repository SQL
--        input in supabase/ applied on top, in the order
--        scripts/rcap-schema-upgrade-lab.sh implements.
--
-- The chain was derived by diffing the two locally built databases, not by hand,
-- and is proven by replay in scripts/verify-rcap-production-schema-upgrade.mjs.
-- Steps are split by dependency order: tables, functions, constraints and indexes,
-- views, triggers, RLS and policies, grants, storage.
--
-- Creates the three private Storage buckets the repository inputs declare, using
-- those inputs' own guarded blocks verbatim.
--
-- All three are created with public = false, and the ON CONFLICT clause re-asserts
-- public = false rather than leaving an existing bucket's flag alone. The
-- Production-only bucket social-public-assets is not referenced, so it is not
-- touched. No Storage policy is created, dropped or changed; Production has none
-- and this chain adds none.

do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'content-media',
      'content-media',
      false,
      12582912,
      array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    )
    on conflict (id) do update
      set public = false,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;
  end if;
end;
$$;

do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'rcap-partner-onboarding-private',
      'rcap-partner-onboarding-private',
      false,
      20971520,
      array[
        'image/png',
        'image/jpeg',
        'image/webp',
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]::text[]
    )
    on conflict (id) do update
      set public = false,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;
  end if;
end;
$$;

do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'rcap-packet-artifacts-private',
      'rcap-packet-artifacts-private',
      false,
      52428800,
      array['application/pdf']::text[]
    )
    on conflict (id) do update
      set public = false,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;
  end if;
end;
$$;
