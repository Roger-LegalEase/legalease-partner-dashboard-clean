-- Phase 14 partner onboarding persistence fields.
-- Safe additive migration: preserves existing partner_records data.

alter table partner_records
  add column if not exists organization_name text,
  add column if not exists legal_name text,
  add column if not exists primary_contact_name text,
  add column if not exists primary_contact_title text,
  add column if not exists primary_contact_email text,
  add column if not exists primary_contact_phone text,
  add column if not exists program_name text,
  add column if not exists program_description text,
  add column if not exists target_state text,
  add column if not exists target_county text,
  add column if not exists target_city text,
  add column if not exists service_area text,
  add column if not exists expected_monthly_participants integer,
  add column if not exists expected_launch_date date,
  add column if not exists referral_sources text,
  add column if not exists audience_description text,
  add column if not exists branding_notes text,
  add column if not exists logo_url text,
  add column if not exists onboarding_status text not null default 'not_started',
  add column if not exists onboarding_started_at timestamptz,
  add column if not exists onboarding_completed_at timestamptz;

create index if not exists partner_records_onboarding_status_idx
  on partner_records(onboarding_status);

comment on column partner_records.onboarding_status is
  'Partner-submitted onboarding profile status: not_started, in_progress, submitted, needs_review, or approved.';

comment on column partner_records.onboarding_started_at is
  'First timestamp when a paid partner saved onboarding data.';

comment on column partner_records.onboarding_completed_at is
  'Timestamp when a paid partner submitted onboarding for LegalEase review.';
