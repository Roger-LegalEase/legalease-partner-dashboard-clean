-- Phase 26 Expungement.ai consumer Briefcase persistence.
-- Local migration only until reviewed and applied through the production DB process.
-- This creates consumer-owned records only; it does not alter partner tables or partner RLS policies.

create table if not exists public.consumer_briefcase_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_type text not null check (
    item_type in ('eligibility_check', 'result', 'packet', 'wilma_conversation')
  ),
  jurisdiction text not null,
  pathway_label text,
  result_code text check (
    result_code is null
    or result_code in (
      'packet_ready',
      'packet_ready_with_caution',
      'needs_more_info',
      'not_yet',
      'guidance_only',
      'not_covered_yet',
      'likely_not_eligible',
      'needs_review',
      'hard_stop'
    )
  ),
  packet_type text check (
    packet_type is null
    or packet_type in ('official_pdf_overlay', 'custom_pleading', 'legacy_packet', 'guidance_packet')
  ),
  payment_allowed boolean not null default false,
  status text not null check (
    status in ('check_saved', 'guidance_saved', 'packet_ready', 'needs_info', 'needs_review', 'waiting', 'not_eligible', 'hard_stop')
  ),
  summary_json jsonb not null default '{}'::jsonb,
  next_steps_json jsonb not null default '[]'::jsonb,
  artifact_refs_json jsonb not null default '{}'::jsonb,
  payment_status text not null default 'not_applicable' check (
    payment_status in ('not_applicable', 'unpaid', 'paid', 'refunded')
  ),
  packet_status text not null default 'not_started' check (
    packet_status in ('not_started', 'ready', 'downloaded')
  ),
  reminder_at timestamptz,
  source_session_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists consumer_briefcase_items_user_created_at_idx
  on public.consumer_briefcase_items(user_id, created_at desc);

create index if not exists consumer_briefcase_items_user_status_idx
  on public.consumer_briefcase_items(user_id, status);

create index if not exists consumer_briefcase_items_user_result_code_idx
  on public.consumer_briefcase_items(user_id, result_code);

alter table public.consumer_briefcase_items enable row level security;

drop policy if exists "consumer briefcase select own items" on public.consumer_briefcase_items;
create policy "consumer briefcase select own items"
  on public.consumer_briefcase_items
  for select
  using (auth.uid() = user_id);

drop policy if exists "consumer briefcase insert own items" on public.consumer_briefcase_items;
create policy "consumer briefcase insert own items"
  on public.consumer_briefcase_items
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "consumer briefcase update own items" on public.consumer_briefcase_items;
create policy "consumer briefcase update own items"
  on public.consumer_briefcase_items
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "consumer briefcase delete own items" on public.consumer_briefcase_items;
create policy "consumer briefcase delete own items"
  on public.consumer_briefcase_items
  for delete
  using (auth.uid() = user_id);

comment on table public.consumer_briefcase_items is
  'Expungement.ai consumer-owned Briefcase items. Isolated from partner RCAP records.';

comment on column public.consumer_briefcase_items.user_id is
  'Auth user owner. RLS policies require auth.uid() to match this value for consumer access.';
