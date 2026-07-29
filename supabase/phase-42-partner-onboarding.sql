-- Phase 42 Standardized RCAP partner onboarding workflow.
-- Migration file only; do not run against production until reviewed through the DB process.
--
-- Additive and non-breaking. This layer standardizes partner setup on top of the
-- existing partner_records / partner_entitlement / partner_access_codes systems:
--   * partner_onboarding holds the workflow status, agreement/billing metadata,
--     landing-page copy, section-ready flags, and go-live/pause timestamps.
--   * partner_onboarding_tasks is the standardized launch checklist.
--   * Packet cap and overage settings remain authoritative in partner_entitlement;
--     access mode remains authoritative on partner_records.access_mode; partner
--     users remain in partner_users. Onboarding never duplicates those systems.
--   * Audit events reuse the append-only rcap_record_events table.
--   * No change to the DTC flow, packet-cap/overage rules, or access-code security.

-------------------------------------------------------------------------------
-- 1. partner_onboarding
-------------------------------------------------------------------------------

create table if not exists public.partner_onboarding (
  id uuid primary key default gen_random_uuid(),
  partner_slug text not null unique references public.partner_records(partner_slug) on delete cascade,
  status text not null default 'draft',
  agreement_status text not null default 'not_sent',
  agreement_date date,
  billing_contact_name text,
  billing_contact_email text,
  package_name text,
  internal_billing_notes text,
  internal_notes text,
  public_display_name text,
  public_headline text,
  public_subheadline text,
  support_instructions text,
  show_partner_logo boolean not null default true,
  show_powered_by boolean not null default true,
  profile_ready boolean not null default false,
  billing_ready boolean not null default false,
  access_controls_ready boolean not null default false,
  landing_page_ready boolean not null default false,
  admin_users_ready boolean not null default false,
  launch_materials_ready boolean not null default false,
  training_review_ready boolean not null default false,
  internal_approved_at timestamptz,
  launched_at timestamptz,
  paused_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_onboarding_status_check
    check (status in ('draft', 'setup_in_progress', 'waiting_on_partner', 'ready_for_review', 'ready_to_launch', 'live', 'paused')),
  constraint partner_onboarding_agreement_status_check
    check (agreement_status in ('not_sent', 'sent', 'signed', 'waived_internal'))
);

create index if not exists partner_onboarding_status_idx on public.partner_onboarding(status);

create or replace function public.set_partner_onboarding_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_partner_onboarding_updated_at on public.partner_onboarding;
create trigger set_partner_onboarding_updated_at
before update on public.partner_onboarding
for each row execute function public.set_partner_onboarding_updated_at();

comment on table public.partner_onboarding is
  'Standardized RCAP partner onboarding workflow state. Packet cap/overage live in partner_entitlement; access mode on partner_records; users in partner_users.';
comment on column public.partner_onboarding.internal_notes is
  'Internal-only. Never returned to partner users; partner-facing reads project it out.';

-- Backfill existing partners into a safe onboarding state that reflects reality:
-- already-provisioned/active partners are considered live; everyone else drafts.
-- This is metadata only and never deactivates an existing live partner page.
insert into public.partner_onboarding (partner_slug, status)
select pr.partner_slug,
       case when pr.provisioning_status in ('provisioned', 'active') then 'live' else 'draft' end
from public.partner_records pr
where not exists (
  select 1 from public.partner_onboarding po where po.partner_slug = pr.partner_slug
);

update public.partner_onboarding po
set launched_at = coalesce(po.launched_at, now())
where po.status = 'live' and po.launched_at is null;

-------------------------------------------------------------------------------
-- 2. partner_onboarding_tasks
-------------------------------------------------------------------------------

create table if not exists public.partner_onboarding_tasks (
  id uuid primary key default gen_random_uuid(),
  partner_slug text not null references public.partner_records(partner_slug) on delete cascade,
  task_key text not null,
  title text not null,
  description text,
  status text not null default 'not_started',
  owner text not null default 'legalease',
  required boolean not null default true,
  completed_at timestamptz,
  completed_by text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_onboarding_tasks_status_check
    check (status in ('not_started', 'in_progress', 'complete', 'blocked', 'skipped')),
  constraint partner_onboarding_tasks_owner_check
    check (owner in ('legalease', 'partner')),
  constraint partner_onboarding_tasks_unique unique (partner_slug, task_key)
);

create index if not exists partner_onboarding_tasks_partner_idx on public.partner_onboarding_tasks(partner_slug);

drop trigger if exists set_partner_onboarding_tasks_updated_at on public.partner_onboarding_tasks;
create trigger set_partner_onboarding_tasks_updated_at
before update on public.partner_onboarding_tasks
for each row execute function public.set_partner_onboarding_updated_at();

comment on table public.partner_onboarding_tasks is
  'Standardized partner launch checklist. owner=partner tasks are surfaced to partner admins; notes are internal-only.';

-------------------------------------------------------------------------------
-- 3. Audit event record type.
-------------------------------------------------------------------------------

do $$
declare
  v_conname text;
begin
  select conname into v_conname
  from pg_constraint
  where conrelid = 'public.rcap_record_events'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%record_type%';

  if v_conname is not null then
    execute format('alter table public.rcap_record_events drop constraint %I', v_conname);
  end if;

  alter table public.rcap_record_events
    add constraint rcap_record_events_record_type_check
    check (record_type in ('intake_session', 'document_packet', 'partner_access_code', 'partner_entitlement', 'partner_onboarding'));
end;
$$;

-------------------------------------------------------------------------------
-- 4. RLS: partner-scoped reads + internal admin. Mutations are service-role only.
-------------------------------------------------------------------------------

alter table public.partner_onboarding enable row level security;

drop policy if exists partner_onboarding_select_own_partner on public.partner_onboarding;
create policy partner_onboarding_select_own_partner
on public.partner_onboarding
for select
to authenticated
using (partner_slug = public.current_partner_slug());

drop policy if exists partner_onboarding_select_internal_admin on public.partner_onboarding;
create policy partner_onboarding_select_internal_admin
on public.partner_onboarding
for select
to authenticated
using (public.is_internal_admin());

alter table public.partner_onboarding_tasks enable row level security;

drop policy if exists partner_onboarding_tasks_select_own_partner on public.partner_onboarding_tasks;
create policy partner_onboarding_tasks_select_own_partner
on public.partner_onboarding_tasks
for select
to authenticated
using (partner_slug = public.current_partner_slug());

drop policy if exists partner_onboarding_tasks_select_internal_admin on public.partner_onboarding_tasks;
create policy partner_onboarding_tasks_select_internal_admin
on public.partner_onboarding_tasks
for select
to authenticated
using (public.is_internal_admin());
