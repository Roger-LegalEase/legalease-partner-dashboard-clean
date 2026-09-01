-- Nationwide Clinic Mode: canonical event, assistance, queue, follow-up,
-- incident, audit, and packet-reservation records.
--
-- Additive only. This migration does not modify existing DTC, partner,
-- Briefcase, packet-worker, entitlement, or ledger objects.

begin;

create table public.clinic_events (
  id uuid primary key default gen_random_uuid(),
  partner_slug text not null references public.partner_records(partner_slug) on delete restrict,
  program_key text not null default 'record-clearing',
  public_slug text not null unique check (public_slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  name text not null check (length(trim(name)) between 3 and 160),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null check (length(trim(timezone)) between 3 and 80),
  location_name text not null check (length(trim(location_name)) between 2 and 180),
  location_details jsonb not null default '{}'::jsonb check (jsonb_typeof(location_details) = 'object'),
  geography text not null check (length(trim(geography)) between 2 and 160),
  capacity integer not null check (capacity between 1 and 100000),
  status text not null default 'draft' check (status in ('draft','published','paused','closed','archived')),
  sponsorship_allocation integer check (sponsorship_allocation is null or sponsorship_allocation >= 0),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index clinic_events_partner_status_idx on public.clinic_events(partner_slug, status, starts_at desc);

create table public.clinic_event_staff (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.clinic_events(id) on delete cascade,
  partner_user_id uuid not null references public.partner_users(id) on delete restrict,
  status text not null default 'approved' check (status in ('approved','suspended','revoked')),
  permissions text[] not null default array['assist','queue']::text[],
  approved_by uuid not null references auth.users(id) on delete restrict,
  approved_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, partner_user_id),
  check (permissions <@ array['assist','queue','follow_up','reporting','incident']::text[]),
  check ((status = 'revoked') = (revoked_at is not null))
);

create index clinic_event_staff_event_status_idx on public.clinic_event_staff(event_id, status);

create table public.clinic_event_access_codes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.clinic_events(id) on delete cascade,
  code_hash text not null check (code_hash ~ '^[0-9a-f]{64}$'),
  code_hint text not null check (length(code_hint) between 2 and 12),
  max_uses integer check (max_uses is null or max_uses > 0),
  uses_count integer not null default 0 check (uses_count >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz,
  unique (event_id, code_hash),
  check (max_uses is null or uses_count <= max_uses),
  check (expires_at is null or starts_at is null or expires_at > starts_at)
);

create index clinic_event_access_codes_active_idx on public.clinic_event_access_codes(event_id, is_active);

create table public.clinic_event_access_redemptions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.clinic_events(id) on delete restrict,
  access_code_id uuid not null references public.clinic_event_access_codes(id) on delete restrict,
  redemption_nonce_hash text not null check (redemption_nonce_hash ~ '^[0-9a-f]{64}$'),
  redeemed_at timestamptz not null default now(),
  unique (access_code_id, redemption_nonce_hash)
);

create index clinic_event_access_redemptions_event_idx on public.clinic_event_access_redemptions(event_id, redeemed_at desc);

create table public.clinic_assisted_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.clinic_events(id) on delete restrict,
  event_staff_id uuid not null references public.clinic_event_staff(id) on delete restrict,
  participant_user_id uuid not null references auth.users(id) on delete restrict,
  screening_session_id uuid references public.screening_sessions(session_id) on delete set null,
  handoff_token_hash text not null unique check (handoff_token_hash ~ '^[0-9a-f]{64}$'),
  device_nonce_hash text not null check (device_nonce_hash ~ '^[0-9a-f]{64}$'),
  consent_version text not null check (length(trim(consent_version)) between 1 and 80),
  consented_at timestamptz not null,
  status text not null default 'active' check (status in ('active','handed_off','ended','expired','reset')),
  started_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now(),
  expires_at timestamptz not null,
  ended_at timestamptz,
  ended_reason text check (ended_reason is null or ended_reason in ('participant_handoff','participant_request','staff_reset','inactivity','event_closed','security_reset')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (expires_at > started_at),
  check ((status in ('ended','expired','reset')) = (ended_at is not null))
);

create index clinic_assisted_sessions_event_status_idx on public.clinic_assisted_sessions(event_id, status, last_activity_at);
create index clinic_assisted_sessions_participant_idx on public.clinic_assisted_sessions(participant_user_id, created_at desc);

create table public.clinic_cases (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.clinic_events(id) on delete restrict,
  participant_user_id uuid not null references auth.users(id) on delete restrict,
  assisted_session_id uuid references public.clinic_assisted_sessions(id) on delete set null,
  screening_session_id uuid references public.screening_sessions(session_id) on delete set null,
  matter_id uuid references public.consumer_briefcase_items(id) on delete set null,
  queue_status text not null default 'started' check (queue_status in ('started','in_progress','needs_information','attorney_review','packet_ready','referred','closed')),
  route_disposition text not null default 'pending' check (route_disposition in ('pending','packet','automatic','no_filing','referral')),
  jurisdiction text not null check (jurisdiction = upper(jurisdiction) and length(jurisdiction) between 2 and 3),
  county_name text,
  court_name text,
  court_identity_verified boolean not null default false,
  follow_up_owner_staff_id uuid references public.clinic_event_staff(id) on delete set null,
  follow_up_due_at timestamptz,
  last_activity_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, participant_user_id, screening_session_id),
  check (court_identity_verified = false or (county_name is not null and court_name is not null)),
  check ((queue_status = 'closed') = (closed_at is not null))
);

create index clinic_cases_event_queue_idx on public.clinic_cases(event_id, queue_status, last_activity_at);
create index clinic_cases_participant_idx on public.clinic_cases(participant_user_id, created_at desc);

create table public.clinic_follow_ups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.clinic_events(id) on delete restrict,
  clinic_case_id uuid not null references public.clinic_cases(id) on delete cascade,
  owner_event_staff_id uuid references public.clinic_event_staff(id) on delete set null,
  due_at timestamptz,
  status text not null default 'open' check (status in ('open','waiting_on_participant','waiting_on_staff','completed','cancelled')),
  communication_state text not null default 'draft' check (communication_state in ('draft','approved','sent','failed','no_contact')),
  participant_safe_message text,
  internal_notes text,
  created_by uuid not null references auth.users(id) on delete restrict,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'completed') = (completed_at is not null))
);

create index clinic_follow_ups_event_status_idx on public.clinic_follow_ups(event_id, status, due_at);
create index clinic_follow_ups_case_idx on public.clinic_follow_ups(clinic_case_id, created_at desc);

create table public.clinic_incidents (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.clinic_events(id) on delete restrict,
  severity text not null check (severity in ('low','medium','high','critical')),
  status text not null default 'open' check (status in ('open','investigating','resolved','closed')),
  category text not null check (category in ('privacy','safety','access','device','network','packet','other')),
  summary text not null check (length(trim(summary)) between 3 and 500),
  detail text,
  reported_by uuid not null references auth.users(id) on delete restrict,
  assigned_to uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status in ('resolved','closed')) = (resolved_at is not null))
);

create index clinic_incidents_event_status_idx on public.clinic_incidents(event_id, status, severity);

create table public.clinic_event_audit (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.clinic_events(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (length(trim(action)) between 3 and 120),
  target_type text not null check (target_type in ('event','staff','access_code','assisted_session','case','follow_up','incident','packet_reservation')),
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default now()
);

create index clinic_event_audit_event_time_idx on public.clinic_event_audit(event_id, occurred_at desc);

create table public.clinic_packet_reservations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.clinic_events(id) on delete restrict,
  clinic_case_id uuid not null unique references public.clinic_cases(id) on delete restrict,
  render_job_id uuid not null unique references public.packet_render_jobs(id) on delete restrict,
  participant_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'reserved' check (status in ('reserved','consumed','released')),
  packet_credit_ledger_id uuid references public.packet_credit_ledger(id) on delete restrict,
  reserved_at timestamptz not null default now(),
  consumed_at timestamptz,
  released_at timestamptz,
  release_reason text check (release_reason is null or release_reason in ('generation_failed','route_changed','event_closed','manual_cancellation')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'consumed') = (consumed_at is not null)),
  check ((status = 'released') = (released_at is not null)),
  check (status <> 'consumed' or packet_credit_ledger_id is not null)
);

create index clinic_packet_reservations_event_status_idx on public.clinic_packet_reservations(event_id, status, created_at);

commit;
