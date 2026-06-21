-- Phase 32 Expungement.ai screening session input persistence.
-- Migration file only; do not run against production until reviewed through the DB process.
-- Persists raw screening inputs and resume position only. Evaluation outputs are intentionally absent.

create table if not exists public.screening_sessions (
  session_id uuid primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  jurisdiction text not null check (jurisdiction = upper(jurisdiction) and length(jurisdiction) between 2 and 3),
  answers jsonb not null default '{}'::jsonb,
  current_question_id text,
  furthest_stage text,
  status text not null default 'in_progress' check (status in ('in_progress', 'resumed', 'completed', 'abandoned')),
  last_drop_question text,
  check (jsonb_typeof(answers) = 'object')
);

alter table public.screening_sessions enable row level security;

comment on table public.screening_sessions is
  'Expungement.ai save-and-resume input persistence. Stores raw screening answers and position only; no resultCode, paymentAllowed, packetPlan, contact, or resume token.';

comment on column public.screening_sessions.answers is
  'Raw screening answer map as jsonb. Evaluation outputs must never be stored here.';
