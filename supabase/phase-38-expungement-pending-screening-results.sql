-- Phase 38 Expungement.ai DTC pending screening result handoff.
-- Migration file only; do not run against production until reviewed through the DB process.

create table if not exists public.consumer_pending_screening_results (
  pending_id uuid primary key default gen_random_uuid(),
  pending_token_hash text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '24 hours'),
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
  result_payload jsonb not null default '{}'::jsonb,
  profile_version text,
  matter_id text,
  packet_plan jsonb not null default '{}'::jsonb,
  source_session_id uuid,
  check (jsonb_typeof(next_steps) = 'array'),
  check (jsonb_typeof(screening_answers) = 'object'),
  check (jsonb_typeof(result_payload) = 'object'),
  check (jsonb_typeof(packet_plan) = 'object')
);

alter table public.consumer_pending_screening_results enable row level security;

create policy "service role can manage pending screening results"
  on public.consumer_pending_screening_results
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

create index if not exists consumer_pending_screening_results_expires_at_idx
  on public.consumer_pending_screening_results (expires_at);

create index if not exists consumer_pending_screening_results_claimed_user_idx
  on public.consumer_pending_screening_results (claimed_user_id)
  where claimed_user_id is not null;

comment on table public.consumer_pending_screening_results is
  'Short-lived unauthenticated Expungement.ai DTC screening result handoff used to attach a completed possible-path result to a user after email verification.';

comment on column public.consumer_pending_screening_results.screening_answers is
  'Raw answers needed to resume or audit the completed check. The URL carries only pending_id, never answers.';

comment on column public.consumer_pending_screening_results.pending_token_hash is
  'Optional hash for a future opaque pending token. Direct client access is denied by RLS; server claims currently use pending_id only.';
