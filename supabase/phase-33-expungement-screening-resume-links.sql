-- Phase 33 Expungement.ai screening resume links.
-- Migration file only; do not run against production until reviewed through the DB process.
-- Adds email-confirmed resume-link metadata to unfinished screening sessions. Stores token hashes only.

alter table public.screening_sessions
  add column if not exists resume_email text,
  add column if not exists resume_email_normalized text,
  add column if not exists resume_token_hash text,
  add column if not exists resume_token_expires_at timestamptz,
  add column if not exists resume_token_rotated_at timestamptz,
  add column if not exists previous_resume_token_hash text,
  add column if not exists previous_resume_token_grace_expires_at timestamptz,
  add column if not exists resume_sent_at timestamptz,
  add column if not exists resume_confirm_failed_attempts integer not null default 0,
  add column if not exists resume_confirm_locked_until timestamptz,
  add column if not exists resume_last_failed_at timestamptz,
  add column if not exists resume_consent_at timestamptz,
  add column if not exists resume_consent_text_version text;

create index if not exists screening_sessions_resume_token_hash_idx
  on public.screening_sessions (resume_token_hash)
  where resume_token_hash is not null;

create index if not exists screening_sessions_previous_resume_token_hash_idx
  on public.screening_sessions (previous_resume_token_hash)
  where previous_resume_token_hash is not null;

create index if not exists screening_sessions_resume_email_normalized_idx
  on public.screening_sessions (resume_email_normalized)
  where resume_email_normalized is not null;

alter table public.screening_sessions
  drop constraint if exists screening_sessions_resume_failed_attempts_check;

alter table public.screening_sessions
  add constraint screening_sessions_resume_failed_attempts_check
  check (resume_confirm_failed_attempts >= 0);

comment on column public.screening_sessions.resume_token_hash is
  'SHA-256 hash of the active resume bearer token. Raw resume tokens must never be stored.';

comment on column public.screening_sessions.previous_resume_token_hash is
  'SHA-256 hash of the previous resume token during the short non-stranding grace window.';
