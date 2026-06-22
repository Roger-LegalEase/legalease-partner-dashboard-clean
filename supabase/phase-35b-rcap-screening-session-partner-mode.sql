-- Phase 35b RCAP partner-mode screening session fields.
-- Migration file only; do not run against production until reviewed through the DB process.
-- Additive only: existing DTC sessions keep flow_mode = 'dtc' and no partner claim state.

alter table public.screening_sessions
  add column if not exists partner_slug text null references public.partner_records(partner_slug) on delete restrict,
  add column if not exists flow_mode text not null default 'dtc',
  add column if not exists claimed_slot_state text null;

alter table public.screening_sessions
  drop constraint if exists screening_sessions_flow_mode_check;

alter table public.screening_sessions
  add constraint screening_sessions_flow_mode_check
  check (flow_mode in ('dtc', 'rcap'));

alter table public.screening_sessions
  drop constraint if exists screening_sessions_claimed_slot_state_check;

alter table public.screening_sessions
  add constraint screening_sessions_claimed_slot_state_check
  check (claimed_slot_state is null or claimed_slot_state in ('claimed', 'consumed', 'released'));

create index if not exists screening_sessions_partner_slug_idx
  on public.screening_sessions(partner_slug)
  where partner_slug is not null;

create index if not exists screening_sessions_flow_mode_idx
  on public.screening_sessions(flow_mode);

comment on column public.screening_sessions.partner_slug is
  'RCAP partner slug for partner-mode screening sessions. NULL for DTC sessions.';

comment on column public.screening_sessions.flow_mode is
  'Screening acquisition mode: dtc for direct-to-consumer, rcap for partner-mode RCAP starts.';

comment on column public.screening_sessions.claimed_slot_state is
  'RCAP slot lifecycle marker. NULL for DTC sessions; partner claims start as claimed.';
