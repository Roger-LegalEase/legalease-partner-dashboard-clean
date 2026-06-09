-- Phase 21: Partner auth identity and RLS foundation.
--
-- FOUNDATION-ONLY WARNING:
-- RLS is enforced at the database level and proven by the Commit 2 verifier.
-- Existing application read/write paths may still use the service role and are
-- not yet fully RLS-bound. App-layer partner dashboard isolation is Commit 3+.
--
-- Security model:
-- - one auth.users.id maps to one partner_users row;
-- - partner_admin and partner_staff require a non-null partner_slug;
-- - internal_admin requires partner_slug to be null;
-- - partner identity is resolved from auth.uid(), never client-provided input;
-- - SECURITY DEFINER helpers use search_path = '' and fully qualified tables.

create table if not exists public.partner_users (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  partner_slug text references public.partner_records(partner_slug) on delete cascade,
  role text not null,
  status text not null default 'active',
  invited_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.partner_users is
  'Maps one authenticated Supabase user to one LegalEase partner identity or internal admin role.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'partner_users_auth_user_id_unique'
      and conrelid = 'public.partner_users'::regclass
  ) then
    alter table public.partner_users
      add constraint partner_users_auth_user_id_unique unique (auth_user_id);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'partner_users_role_check'
      and conrelid = 'public.partner_users'::regclass
  ) then
    alter table public.partner_users
      add constraint partner_users_role_check
      check (role in ('partner_admin', 'partner_staff', 'internal_admin'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'partner_users_status_check'
      and conrelid = 'public.partner_users'::regclass
  ) then
    alter table public.partner_users
      add constraint partner_users_status_check
      check (status in ('active', 'disabled'));
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'partner_users_role_partner_slug_check'
      and conrelid = 'public.partner_users'::regclass
  ) then
    alter table public.partner_users
      add constraint partner_users_role_partner_slug_check
      check (
        (role in ('partner_admin', 'partner_staff') and partner_slug is not null)
        or
        (role = 'internal_admin' and partner_slug is null)
      );
  end if;
end;
$$;

create index if not exists partner_users_auth_user_id_idx
  on public.partner_users(auth_user_id);

create index if not exists partner_users_partner_slug_idx
  on public.partner_users(partner_slug);

create index if not exists partner_users_auth_status_role_idx
  on public.partner_users(auth_user_id, status, role);

create or replace function public.set_partner_users_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_partner_users_updated_at on public.partner_users;

create trigger set_partner_users_updated_at
before update on public.partner_users
for each row
execute function public.set_partner_users_updated_at();

create or replace function public.current_partner_slug()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select pu.partner_slug
  from public.partner_users pu
  where pu.auth_user_id = auth.uid()
    and pu.status = 'active'
    and pu.role in ('partner_admin', 'partner_staff')
$$;

comment on function public.current_partner_slug() is
  'Returns the active partner slug for the authenticated partner user. NULL intentionally grants no partner-scoped rows.';

create or replace function public.current_partner_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select pu.role
  from public.partner_users pu
  where pu.auth_user_id = auth.uid()
    and pu.status = 'active'
$$;

comment on function public.current_partner_role() is
  'Returns the active partner_users role for auth.uid(), if one exists.';

create or replace function public.is_internal_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.partner_users pu
    where pu.auth_user_id = auth.uid()
      and pu.status = 'active'
      and pu.role = 'internal_admin'
      and pu.partner_slug is null
  )
$$;

comment on function public.is_internal_admin() is
  'Returns true only for an active internal_admin partner_users row with NULL partner_slug.';

revoke all on function public.current_partner_slug() from anon;
revoke all on function public.current_partner_role() from anon;
revoke all on function public.is_internal_admin() from anon;

revoke all on function public.current_partner_slug() from public;
revoke all on function public.current_partner_role() from public;
revoke all on function public.is_internal_admin() from public;

grant execute on function public.current_partner_slug() to authenticated;
grant execute on function public.current_partner_role() to authenticated;
grant execute on function public.is_internal_admin() to authenticated;

alter table public.partner_users enable row level security;

drop policy if exists partner_users_select_own on public.partner_users;
create policy partner_users_select_own
on public.partner_users
for select
to authenticated
using (auth_user_id = auth.uid());

-- Partner-scoped policies intentionally fail closed when current_partner_slug()
-- returns NULL. NULL covers unauthenticated users, internal_admin users,
-- disabled users, users without partner_users rows, and unexpected helper
-- failures. Internal admins must use separate is_internal_admin() policies.
--
-- Optional table policy blocks are applied if the table exists and skipped if absent:
-- partner_metrics, partner_assets, partner_events, partner_email_deliveries,
-- rcap_intake_sessions, rcap_intake_responses, rcap_document_packets,
-- rcap_document_packet_inputs, rcap_briefcase_items.

alter table if exists public.partner_records enable row level security;

drop policy if exists partner_records_select_own_partner on public.partner_records;
create policy partner_records_select_own_partner
on public.partner_records
for select
to authenticated
using (partner_slug = public.current_partner_slug());

drop policy if exists partner_records_select_internal_admin on public.partner_records;
create policy partner_records_select_internal_admin
on public.partner_records
for select
to authenticated
using (public.is_internal_admin());

do $$
begin
  if to_regclass('public.partner_metrics') is not null then
    alter table public.partner_metrics enable row level security;

    drop policy if exists partner_metrics_select_own_partner on public.partner_metrics;
    create policy partner_metrics_select_own_partner
    on public.partner_metrics
    for select
    to authenticated
    using (partner_slug = public.current_partner_slug());

    drop policy if exists partner_metrics_select_internal_admin on public.partner_metrics;
    create policy partner_metrics_select_internal_admin
    on public.partner_metrics
    for select
    to authenticated
    using (public.is_internal_admin());
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.partner_assets') is not null then
    alter table public.partner_assets enable row level security;

    drop policy if exists partner_assets_select_own_partner on public.partner_assets;
    create policy partner_assets_select_own_partner
    on public.partner_assets
    for select
    to authenticated
    using (partner_slug = public.current_partner_slug());

    drop policy if exists partner_assets_select_internal_admin on public.partner_assets;
    create policy partner_assets_select_internal_admin
    on public.partner_assets
    for select
    to authenticated
    using (public.is_internal_admin());
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.partner_events') is not null then
    alter table public.partner_events enable row level security;

    drop policy if exists partner_events_select_own_partner on public.partner_events;
    create policy partner_events_select_own_partner
    on public.partner_events
    for select
    to authenticated
    using (partner_slug = public.current_partner_slug());

    drop policy if exists partner_events_select_internal_admin on public.partner_events;
    create policy partner_events_select_internal_admin
    on public.partner_events
    for select
    to authenticated
    using (public.is_internal_admin());
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.partner_email_deliveries') is not null then
    alter table public.partner_email_deliveries enable row level security;

    drop policy if exists partner_email_deliveries_select_own_partner on public.partner_email_deliveries;
    create policy partner_email_deliveries_select_own_partner
    on public.partner_email_deliveries
    for select
    to authenticated
    using (partner_slug = public.current_partner_slug());

    drop policy if exists partner_email_deliveries_select_internal_admin on public.partner_email_deliveries;
    create policy partner_email_deliveries_select_internal_admin
    on public.partner_email_deliveries
    for select
    to authenticated
    using (public.is_internal_admin());
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.rcap_intake_sessions') is not null then
    alter table public.rcap_intake_sessions enable row level security;

    drop policy if exists rcap_intake_sessions_select_own_partner on public.rcap_intake_sessions;
    create policy rcap_intake_sessions_select_own_partner
    on public.rcap_intake_sessions
    for select
    to authenticated
    using (partner_slug = public.current_partner_slug());

    drop policy if exists rcap_intake_sessions_select_internal_admin on public.rcap_intake_sessions;
    create policy rcap_intake_sessions_select_internal_admin
    on public.rcap_intake_sessions
    for select
    to authenticated
    using (public.is_internal_admin());
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.rcap_intake_responses') is not null then
    alter table public.rcap_intake_responses enable row level security;

    drop policy if exists rcap_intake_responses_select_own_partner on public.rcap_intake_responses;
    create policy rcap_intake_responses_select_own_partner
    on public.rcap_intake_responses
    for select
    to authenticated
    using (partner_slug = public.current_partner_slug());

    drop policy if exists rcap_intake_responses_select_internal_admin on public.rcap_intake_responses;
    create policy rcap_intake_responses_select_internal_admin
    on public.rcap_intake_responses
    for select
    to authenticated
    using (public.is_internal_admin());
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.rcap_document_packets') is not null then
    alter table public.rcap_document_packets enable row level security;

    drop policy if exists rcap_document_packets_select_own_partner on public.rcap_document_packets;
    create policy rcap_document_packets_select_own_partner
    on public.rcap_document_packets
    for select
    to authenticated
    using (partner_slug = public.current_partner_slug());

    drop policy if exists rcap_document_packets_select_internal_admin on public.rcap_document_packets;
    create policy rcap_document_packets_select_internal_admin
    on public.rcap_document_packets
    for select
    to authenticated
    using (public.is_internal_admin());
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.rcap_document_packet_inputs') is not null then
    alter table public.rcap_document_packet_inputs enable row level security;

    drop policy if exists rcap_document_packet_inputs_select_own_partner on public.rcap_document_packet_inputs;
    create policy rcap_document_packet_inputs_select_own_partner
    on public.rcap_document_packet_inputs
    for select
    to authenticated
    using (partner_slug = public.current_partner_slug());

    drop policy if exists rcap_document_packet_inputs_select_internal_admin on public.rcap_document_packet_inputs;
    create policy rcap_document_packet_inputs_select_internal_admin
    on public.rcap_document_packet_inputs
    for select
    to authenticated
    using (public.is_internal_admin());
  end if;
end;
$$;

do $$
begin
  if to_regclass('public.rcap_briefcase_items') is not null then
    alter table public.rcap_briefcase_items enable row level security;

    drop policy if exists rcap_briefcase_items_select_own_partner on public.rcap_briefcase_items;
    create policy rcap_briefcase_items_select_own_partner
    on public.rcap_briefcase_items
    for select
    to authenticated
    using (partner_slug = public.current_partner_slug());

    drop policy if exists rcap_briefcase_items_select_internal_admin on public.rcap_briefcase_items;
    create policy rcap_briefcase_items_select_internal_admin
    on public.rcap_briefcase_items
    for select
    to authenticated
    using (public.is_internal_admin());
  end if;
end;
$$;
