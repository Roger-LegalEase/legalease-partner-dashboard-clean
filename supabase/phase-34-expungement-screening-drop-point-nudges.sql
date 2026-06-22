-- Phase 34 Expungement.ai screening drop-point nudges.
-- Migration file only; do not run against production until reviewed through the DB process.
-- Tracks sparse service-recovery nudge state on existing saved screening sessions. No new PII.

alter table public.screening_sessions
  add column if not exists nudge_touch1_sent_at timestamptz,
  add column if not exists nudge_touch2_sent_at timestamptz,
  add column if not exists nudge_touch1_claimed_at timestamptz,
  add column if not exists nudge_touch2_claimed_at timestamptz,
  add column if not exists nudge_opted_out_at timestamptz;

create index if not exists screening_sessions_nudge_due_idx
  on public.screening_sessions (resume_sent_at, status)
  where resume_sent_at is not null
    and resume_email_normalized is not null
    and resume_consent_at is not null
    and nudge_opted_out_at is null;

comment on column public.screening_sessions.nudge_touch1_sent_at is
  'Timestamp for the first saved-progress service-recovery nudge. No message body or PII is stored.';

comment on column public.screening_sessions.nudge_touch2_sent_at is
  'Timestamp for the second and final saved-progress service-recovery nudge. No message body or PII is stored.';

comment on column public.screening_sessions.nudge_opted_out_at is
  'Timestamp when the saved-progress nudge opt-out was received. Resume-link consent fields remain unchanged.';
