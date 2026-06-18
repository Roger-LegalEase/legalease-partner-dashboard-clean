-- Phase 29 Expungement.ai Wilma telemetry foundation.
-- Local migration only until reviewed and applied through the production DB process.
-- Consumer-isolated Wilma safety telemetry; does not alter partner billing, partner RLS, or Stripe invoice tables.

create table if not exists public.consumer_wilma_telemetry (
  id uuid primary key default gen_random_uuid(),
  exchange_id text not null unique,
  session_id text not null,
  occurred_at timestamptz not null,
  state text not null,
  user_message_redacted text not null,
  wilma_response_redacted text not null,
  injected_state_content_ids text[] not null default '{}',
  case_context_present boolean not null default false,
  disposition_type text,
  guard_flags jsonb not null default '[]'::jsonb,
  redirect_occurred boolean not null default false,
  redirect_target text not null default 'none' check (redirect_target in ('screening_tool', 'human_help', 'none')),
  model_version text not null,
  system_prompt_version text not null,
  created_at timestamptz not null default now()
);

alter table public.consumer_wilma_telemetry enable row level security;

drop policy if exists "consumer wilma telemetry internal safety select" on public.consumer_wilma_telemetry;
create policy "consumer wilma telemetry internal safety select"
  on public.consumer_wilma_telemetry
  for select
  using (
    exists (
      select 1
      from public.partner_users pu
      where pu.user_id = auth.uid()
        and pu.role in ('internal_admin', 'safety_reviewer')
    )
  );

comment on table public.consumer_wilma_telemetry is
  'Redacted Expungement.ai Wilma safety telemetry. Consumer-only and internal safety scoped; RCAP partners must not access it.';
