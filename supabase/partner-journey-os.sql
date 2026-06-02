-- Partner Journey OS persistence schema.
-- This schema prepares LegalEase partner records, assets, metrics, and events
-- for Supabase-backed persistence while the application keeps local seeded
-- data as the default development/build source.

create table if not exists partner_records (
  id uuid primary key default gen_random_uuid(),
  partner_id text unique not null,
  partner_slug text unique not null,
  partner_name text not null,
  contact_name text,
  contact_email text,
  organization_name text,
  legal_name text,
  primary_contact_name text,
  primary_contact_title text,
  primary_contact_email text,
  primary_contact_phone text,
  website text,
  organization_type text,
  program_name text,
  program_description text,
  target_state text,
  target_county text,
  target_city text,
  service_area text,
  expected_monthly_participants integer,
  expected_launch_date date,
  referral_sources text,
  audience_description text,
  branding_notes text,
  logo_url text,
  onboarding_status text not null default 'not_started',
  onboarding_started_at timestamptz,
  onboarding_completed_at timestamptz,
  region text,
  state text,
  estimated_users_90_days integer,
  record_clearing_needs text[] default '{}',
  program_goal text,
  program_tier text not null,
  selected_package_id text,
  selected_package_name text,
  payment_status text not null default 'unpaid',
  qualification_status text not null default 'request_received',
  provisioning_status text not null default 'blocked_payment_required',
  stripe_checkout_session_id text,
  stripe_customer_id text,
  stripe_payment_intent_id text,
  paid_at timestamptz,
  payment_amount integer,
  payment_currency text,
  assigned_owner text,
  launch_date_target date,
  compliance_notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

comment on table partner_records is
  'Partner Journey OS canonical partner records for LegalEase partner persistence.';

alter table partner_records
  add column if not exists selected_package_id text,
  add column if not exists selected_package_name text,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_payment_intent_id text,
  add column if not exists paid_at timestamptz,
  add column if not exists payment_amount integer,
  add column if not exists payment_currency text,
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

create table if not exists partner_assets (
  id uuid primary key default gen_random_uuid(),
  partner_slug text not null references partner_records(partner_slug) on delete cascade,
  asset_key text not null,
  label text not null,
  description text,
  status text not null default 'locked',
  route text,
  owner text,
  next_action text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(partner_slug, asset_key)
);

comment on table partner_assets is
  'Partner Journey OS generated and provisioned assets for each partner.';

create table if not exists partner_metrics (
  id uuid primary key default gen_random_uuid(),
  partner_slug text unique not null references partner_records(partner_slug) on delete cascade,
  referrals integer default 0,
  screenings integer default 0,
  likely_eligible integer default 0,
  product_starts integer default 0,
  packets_ready integer default 0,
  filings integer default 0,
  outcomes_available integer default 0,
  updated_at timestamptz default now()
);

comment on table partner_metrics is
  'Partner Journey OS aggregate partner metrics used by diagnostics and future reporting.';

create table if not exists partner_events (
  id uuid primary key default gen_random_uuid(),
  partner_slug text not null references partner_records(partner_slug) on delete cascade,
  event_type text not null,
  event_label text not null,
  event_payload jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

comment on table partner_events is
  'Partner Journey OS event timeline for future partner provisioning and lifecycle activity.';

create index if not exists partner_records_partner_slug_idx on partner_records(partner_slug);
create index if not exists partner_records_payment_status_idx on partner_records(payment_status);
create index if not exists partner_records_provisioning_status_idx on partner_records(provisioning_status);
create index if not exists partner_records_onboarding_status_idx on partner_records(onboarding_status);
create index if not exists partner_assets_partner_slug_idx on partner_assets(partner_slug);
create index if not exists partner_events_partner_slug_idx on partner_events(partner_slug);
create index if not exists partner_events_created_at_idx on partner_events(created_at);
