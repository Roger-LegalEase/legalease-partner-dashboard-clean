-- Phase 38 Expungement.ai DTC pending screening result handoff.
-- Migration file only; do not run against production until reviewed through the DB process.

create table if not exists public.consumer_pending_screening_results (
  pending_id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  claimed_user_id uuid references auth.users(id) on delete set null,
  product text not null default 'expungement_ai_dtc' check (product in ('expungement_ai_dtc', 'rcap_partner')),
  jurisdiction text not null,
  result_code text not null,
  pathway_label text,
  packet_type text,
  payment_allowed boolean not null default false,
  summary text not null,
  next_steps jsonb not null default '[]'::jsonb,
  screening_answers jsonb not null default '{}'::jsonb,
  profile_version text,
  matter_id text,
  packet_plan jsonb not null default '{}'::jsonb,
  source_session_id uuid,
  check (jsonb_typeof(next_steps) = 'array'),
  check (jsonb_typeof(screening_answers) = 'object'),
  check (jsonb_typeof(packet_plan) = 'object')
);

alter table public.consumer_pending_screening_results enable row level security;

comment on table public.consumer_pending_screening_results is
  'Short-lived unauthenticated Expungement.ai DTC screening result handoff used to attach a completed possible-path result to a user after email verification.';

comment on column public.consumer_pending_screening_results.screening_answers is
  'Raw answers needed to resume or audit the completed check. The URL carries only pending_id, never answers.';
