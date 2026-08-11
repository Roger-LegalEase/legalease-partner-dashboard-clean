-- Phase 54 — rcap_persons hardening and reserved-namespace enforcement
--
-- What this closes.
--
-- `packet_render_jobs.person_id` is a foreign key to `rcap_persons`, whose
-- `partner_slug` is NOT NULL. Serving a direct-to-consumer user therefore means
-- writing a row into a table built for partner intake. Phase 53's consumer
-- binding made that necessary; the reserved namespace made it possible. Neither
-- made it safe, and the namespace verifier said so rather than pretending
-- otherwise:
--
--   * `rcap_persons` had NO row-level security, NO policies and NO explicit
--     grants anywhere in supabase/. It inherited whatever the project's default
--     privileges hand `anon` and `authenticated` — which on a stock Supabase
--     project is full table access. That predates the consumer namespace and was
--     already wrong for partner intake identities; putting consumer rows beside
--     them made it urgent.
--   * `partner_slug` is free text with no foreign key, so nothing stopped a real
--     partner from registering the reserved slug and pulling every consumer
--     person into their own keyspace, where partner-scoped queries would find
--     them.
--   * Nothing constrained WHICH rows may sit in the reserved namespace, so a
--     partner intake path could write an arbitrary person there and a consumer
--     could be attributed to a partner.
--
-- All three are database-enforced here rather than left to application care.
--
-- Additive. No column is dropped, no row is rewritten, and every existing
-- caller of this table already uses the service-role client, so the revoke
-- below removes no access anything actually relies on.
--
-- Applied after: 26, 27, 28, 49, 50, 51, 52, 53.

begin;

-------------------------------------------------------------------------------
-- 0. Record the privilege surface being changed.
--
-- The point of a migration that takes privileges away is that someone can later
-- see what was there. A notice is not evidence, so the verifier asserts the
-- post-state; this exists so the apply log carries the before-state too.
-------------------------------------------------------------------------------

do $record$
declare
  v_row record;
  v_found boolean := false;
begin
  if to_regclass('public.rcap_persons') is null then
    raise notice 'phase-54: public.rcap_persons is absent; nothing to record';
    return;
  end if;

  for v_row in
    select grantee, string_agg(privilege_type, ', ' order by privilege_type) as privileges
    from information_schema.role_table_grants
    where table_schema = 'public' and table_name = 'rcap_persons'
    group by grantee
  loop
    v_found := true;
    raise notice 'phase-54: pre-change grant on rcap_persons: % -> %', v_row.grantee, v_row.privileges;
  end loop;

  if not v_found then
    raise notice 'phase-54: no explicit table grants on rcap_persons were recorded';
  end if;

  raise notice 'phase-54: pre-change rowsecurity on rcap_persons: %',
    (select relrowsecurity from pg_class where oid = 'public.rcap_persons'::regclass);
end
$record$;

-------------------------------------------------------------------------------
-- 1. The reserved namespace, as a database fact.
--
-- The application already knows this string. Putting it here means the guards
-- below and the application cannot drift to different answers, and a reader of
-- the schema can see which slug is not a partner.
-------------------------------------------------------------------------------

create or replace function public.rcap_consumer_person_namespace()
returns text
language sql
immutable
set search_path = ''
as $$ select 'expungement-ai-consumer'::text $$;

comment on function public.rcap_consumer_person_namespace() is
  'The reserved partner_slug namespace for direct-to-consumer person records. Not a partner: no partner_records row may use it, and it never joins partner reporting or entitlement. Phase 54.';

-------------------------------------------------------------------------------
-- 2. Row-level security.
--
-- Enabled with NO policy for anon or authenticated, which is the fail-closed
-- shape: with RLS on and no policy granting them rows, a browser role sees
-- nothing regardless of what table grants it may pick up from default
-- privileges later. `service_role` is BYPASSRLS on Supabase, so the server-side
-- callers — every existing one — are unaffected.
--
-- Both defences are applied on purpose. RLS alone would leave a confusing
-- grant in place; the revoke alone would be undone by the next `alter default
-- privileges`. Together, adding a policy AND a grant would both be required to
-- reopen this by accident.
-------------------------------------------------------------------------------

do $rls$
begin
  if to_regclass('public.rcap_persons') is null then
    raise notice 'phase-54: public.rcap_persons is absent; RLS and grants skipped';
    return;
  end if;

  execute 'alter table public.rcap_persons enable row level security';

  -- Any policy from an earlier attempt is removed so the end state is exactly
  -- what this file says it is.
  execute 'drop policy if exists rcap_persons_service_role_all on public.rcap_persons';
  execute 'create policy rcap_persons_service_role_all on public.rcap_persons
             for all to service_role using (true) with check (true)';

  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke all on public.rcap_persons from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke all on public.rcap_persons from authenticated';
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant select, insert, update, delete on public.rcap_persons to service_role';
  end if;
end
$rls$;

-------------------------------------------------------------------------------
-- 3. The reserved slug may not be claimed by a real partner.
--
-- `partner_records.partner_slug` is the source of truth for "this is a
-- partner". A row there carrying the reserved slug would silently convert every
-- consumer person into that partner's person: the reporting join in section 5's
-- test would start returning them, and entitlement lookups would follow.
--
-- A trigger rather than a check constraint because the value comes from another
-- function, and because the error message is the thing an operator will read.
-------------------------------------------------------------------------------

create or replace function public.rcap_guard_reserved_partner_slug()
returns trigger
language plpgsql
set search_path = ''
as $guard$
begin
  if new.partner_slug = public.rcap_consumer_person_namespace() then
    raise exception
      'partner_records: % is the reserved direct-to-consumer person namespace and cannot be registered as a partner slug',
      new.partner_slug;
  end if;
  return new;
end
$guard$;

do $trg$
begin
  if to_regclass('public.partner_records') is null then
    raise notice 'phase-54: public.partner_records is absent; reserved-slug guard skipped';
    return;
  end if;

  execute 'drop trigger if exists rcap_guard_reserved_partner_slug_trg on public.partner_records';
  execute 'create trigger rcap_guard_reserved_partner_slug_trg
             before insert or update of partner_slug on public.partner_records
             for each row execute function public.rcap_guard_reserved_partner_slug()';
end
$trg$;

-------------------------------------------------------------------------------
-- 4. The reserved namespace admits only consumer-shaped identities.
--
-- Without this, a partner intake path could write `email:someone@example.com`
-- into the reserved namespace, putting a named partner client into the consumer
-- keyspace; and a consumer-shaped key could be written under a partner slug,
-- making attribution ambiguous in the other direction. The constraint is
-- two-way so neither reading is possible.
--
-- Consumer match keys are `consumer:<sha256 hex>` — a digest, so the row itself
-- names no account. That shape is what is enforced.
-------------------------------------------------------------------------------

do $shape$
begin
  if to_regclass('public.rcap_persons') is null then
    raise notice 'phase-54: public.rcap_persons is absent; namespace shape constraint skipped';
    return;
  end if;

  execute 'alter table public.rcap_persons
             drop constraint if exists rcap_persons_reserved_namespace_shape';
  execute $ddl$
    alter table public.rcap_persons
      add constraint rcap_persons_reserved_namespace_shape
      check (
        (partner_slug = 'expungement-ai-consumer' and match_key ~ '^consumer:[0-9a-f]{64}$')
        or
        (partner_slug <> 'expungement-ai-consumer' and match_key !~ '^consumer:')
      )
  $ddl$;
end
$shape$;

comment on constraint rcap_persons_reserved_namespace_shape on public.rcap_persons is
  'The reserved consumer namespace holds only digest-shaped consumer identities, and no partner namespace may hold one. Keeps attribution unambiguous in both directions. Phase 54.';

commit;
