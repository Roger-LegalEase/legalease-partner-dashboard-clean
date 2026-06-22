-- Phase 35 RCAP partner entitlement.
-- Migration file only; do not run against production until reviewed through the DB process.
-- Capacity is enforced by claim_rcap_screening_session(), not by an upper-bound CHECK.

create table if not exists public.partner_entitlement (
  partner_slug text not null unique references public.partner_records(partner_slug) on delete restrict,
  screenings_allowed integer not null default 0,
  screenings_used integer not null default 0,
  contract_note text,
  period_label text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_entitlement_screenings_allowed_nonnegative_check check (screenings_allowed >= 0),
  constraint partner_entitlement_screenings_used_nonnegative_check check (screenings_used >= 0)
);

create index if not exists partner_entitlement_partner_slug_idx
  on public.partner_entitlement(partner_slug);

create or replace function public.set_partner_entitlement_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_partner_entitlement_updated_at on public.partner_entitlement;

create trigger set_partner_entitlement_updated_at
before update on public.partner_entitlement
for each row
execute function public.set_partner_entitlement_updated_at();

comment on table public.partner_entitlement is
  'RCAP partner-mode screening capacity ledger. screenings_used may exceed screenings_allowed after an ops allowance reduction; claims are gated by the RPC.';

comment on column public.partner_entitlement.screenings_allowed is
  'Current RCAP screening slot allowance for the entitlement period.';

comment on column public.partner_entitlement.screenings_used is
  'Claimed RCAP screening slots. Updated only by database primitives or controlled ops repair.';
