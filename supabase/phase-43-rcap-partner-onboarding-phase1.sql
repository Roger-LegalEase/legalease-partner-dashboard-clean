-- Phase 43: RCAP Partner Onboarding Phase 1.
--
-- Forward-only, additive foundation for the authenticated partner onboarding
-- workspace introduced in Phase 42. This migration deliberately does not create
-- or backfill workspaces for existing partners. Existing Phase 42 rows remain
-- dormant unless the server-side rollout gate makes the feature applicable.
--
-- Apply after:
--   * partner-journey-os.sql
--   * phase-21-partner-auth-rls-foundation.sql
--   * phase-28-rcap-record-audit-trail.sql
--   * phase-42-partner-onboarding.sql

-------------------------------------------------------------------------------
-- 1. Extend the existing workspace without duplicating partner truth.
-------------------------------------------------------------------------------

alter table public.partner_onboarding
  add column if not exists partner_record_id uuid
    references public.partner_records(id) on delete cascade,
  add column if not exists schema_version text not null default 'rcap-partner-onboarding-v1',
  add column if not exists aggregate_version bigint not null default 1,
  add column if not exists completion_percentage integer not null default 0,
  add column if not exists blocker_code text,
  add column if not exists next_action_code text,
  add column if not exists next_action_owner text not null default 'partner',
  add column if not exists target_launch_date date,
  add column if not exists target_launch_date_reason text,
  add column if not exists target_launch_date_changed_at timestamptz,
  add column if not exists target_launch_date_changed_by uuid references auth.users(id),
  add column if not exists commercial_gate_status text not null default 'blocked',
  add column if not exists commercial_gate_evidence_reference text,
  add column if not exists commercial_gate_override_reason text,
  add column if not exists commercial_gate_changed_at timestamptz,
  add column if not exists commercial_gate_changed_by uuid references auth.users(id),
  add column if not exists submitted_at timestamptz,
  add column if not exists submitted_by uuid references auth.users(id),
  add column if not exists submission_request_id uuid,
  add column if not exists submitted_schema_version text,
  add column if not exists internal_approved_by uuid references auth.users(id),
  add column if not exists internal_approval_reason text,
  add column if not exists closed_at timestamptz,
  add column if not exists closed_by uuid references auth.users(id),
  add column if not exists closed_reason text,
  add column if not exists last_meaningful_activity_at timestamptz;

alter table public.partner_onboarding
  drop constraint if exists partner_onboarding_status_check,
  drop constraint if exists partner_onboarding_aggregate_version_check,
  drop constraint if exists partner_onboarding_completion_percentage_check,
  drop constraint if exists partner_onboarding_next_action_owner_check,
  drop constraint if exists partner_onboarding_commercial_gate_status_check,
  drop constraint if exists partner_onboarding_commercial_gate_evidence_check,
  drop constraint if exists partner_onboarding_internal_reason_lengths_check,
  drop constraint if exists partner_onboarding_target_launch_audit_check,
  drop constraint if exists partner_onboarding_submission_consistency_check,
  drop constraint if exists partner_onboarding_closed_consistency_check;

alter table public.partner_onboarding
  add constraint partner_onboarding_status_check
    check (status in (
      'draft',
      'commercially_blocked',
      'setup_in_progress',
      'waiting_on_partner',
      'ready_for_review',
      'ready_to_launch',
      'live',
      'paused',
      'closed'
    )),
  add constraint partner_onboarding_aggregate_version_check
    check (aggregate_version > 0),
  add constraint partner_onboarding_completion_percentage_check
    check (completion_percentage between 0 and 100),
  add constraint partner_onboarding_next_action_owner_check
    check (next_action_owner in ('partner', 'legalease', 'none')),
  add constraint partner_onboarding_commercial_gate_status_check
    check (commercial_gate_status in (
      'blocked',
      'cleared_by_paid_invoice',
      'cleared_by_approved_purchase_order',
      'cleared_by_authorized_internal_override'
    )),
  add constraint partner_onboarding_commercial_gate_evidence_check
    check (
      (
        commercial_gate_status not in (
          'cleared_by_paid_invoice',
          'cleared_by_approved_purchase_order'
        )
        or nullif(btrim(commercial_gate_evidence_reference), '') is not null
      )
      and (
        commercial_gate_status <> 'cleared_by_authorized_internal_override'
        or nullif(btrim(commercial_gate_override_reason), '') is not null
      )
    ),
  add constraint partner_onboarding_internal_reason_lengths_check
    check (
      coalesce(char_length(target_launch_date_reason), 0) <= 5000
      and coalesce(char_length(commercial_gate_evidence_reference), 0) <= 500
      and coalesce(char_length(commercial_gate_override_reason), 0) <= 5000
      and coalesce(char_length(internal_approval_reason), 0) <= 5000
      and coalesce(char_length(closed_reason), 0) <= 5000
    ),
  add constraint partner_onboarding_target_launch_audit_check
    check (
      (
        target_launch_date_reason is null
        and target_launch_date_changed_at is null
        and target_launch_date_changed_by is null
      )
      or (
        nullif(btrim(target_launch_date_reason), '') is not null
        and target_launch_date_changed_at is not null
        and target_launch_date_changed_by is not null
      )
    ),
  add constraint partner_onboarding_submission_consistency_check
    check (
      (submitted_at is null and submitted_by is null and submission_request_id is null)
      or
      (submitted_at is not null and submitted_by is not null and submission_request_id is not null)
    ),
  add constraint partner_onboarding_closed_consistency_check
    check (
      (status <> 'closed' and closed_at is null and closed_by is null)
      or
      (status = 'closed' and closed_at is not null and closed_by is not null)
    );

create unique index if not exists partner_onboarding_partner_record_id_unique
  on public.partner_onboarding(partner_record_id)
  where partner_record_id is not null;

create unique index if not exists partner_onboarding_submission_request_unique
  on public.partner_onboarding(submission_request_id)
  where submission_request_id is not null;

create index if not exists partner_onboarding_target_launch_date_idx
  on public.partner_onboarding(target_launch_date)
  where status not in ('live', 'closed');

create or replace function public.rcap_onboarding_resolve_partner_record()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_partner_record_id uuid;
  v_partner_slug text;
begin
  select pr.id, pr.partner_slug
    into v_partner_record_id, v_partner_slug
  from public.partner_records pr
  where pr.partner_slug = new.partner_slug
     or (new.partner_record_id is not null and pr.id = new.partner_record_id)
  order by (pr.partner_slug = new.partner_slug) desc
  limit 1;

  if v_partner_record_id is null then
    raise exception using
      errcode = '23503',
      message = 'Unknown partner for onboarding workspace';
  end if;

  if v_partner_slug <> new.partner_slug then
    raise exception using
      errcode = '23514',
      message = 'Workspace partner identifiers do not match';
  end if;

  if new.partner_record_id is not null
     and new.partner_record_id <> v_partner_record_id then
    raise exception using
      errcode = '23514',
      message = 'Workspace partner identifiers do not match';
  end if;

  new.partner_record_id := v_partner_record_id;
  return new;
end;
$$;

drop trigger if exists rcap_onboarding_resolve_partner_record
  on public.partner_onboarding;
create trigger rcap_onboarding_resolve_partner_record
before insert or update of partner_slug, partner_record_id
on public.partner_onboarding
for each row execute function public.rcap_onboarding_resolve_partner_record();

comment on column public.partner_onboarding.aggregate_version is
  'Monotonic aggregate version returned by authoritative onboarding mutations.';
comment on column public.partner_onboarding.completion_percentage is
  'Server-derived active partner requirement completion. Never accepted from a browser payload.';
comment on column public.partner_onboarding.commercial_gate_status is
  'Internal/system-owned commercial truth; partner actors cannot update it.';

-------------------------------------------------------------------------------
-- 2. Versioned section state.
-------------------------------------------------------------------------------

create table public.partner_onboarding_sections (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null
    references public.partner_onboarding(id) on delete cascade,
  section_key text not null,
  response_data jsonb not null default '{}'::jsonb,
  revision bigint not null default 1,
  status text not null default 'not_started',
  completion_percentage integer not null default 0,
  missing_required_keys text[] not null default '{}',
  first_started_at timestamptz,
  completed_at timestamptz,
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  waived_at timestamptz,
  waived_by uuid references auth.users(id),
  waiver_reason text,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_onboarding_sections_workspace_key_unique
    unique (workspace_id, section_key),
  constraint partner_onboarding_sections_key_check
    check (section_key in (
      'organization_contacts',
      'program_goals',
      'geography_audience_language_accessibility',
      'access_sponsorship_capacity',
      'brand_public_page',
      'staff_dashboard_plan',
      'support_referrals_reporting',
      'review_authorization'
    )),
  constraint partner_onboarding_sections_status_check
    check (status in (
      'not_started',
      'in_progress',
      'submitted',
      'needs_changes',
      'approved',
      'waived',
      'not_applicable'
    )),
  constraint partner_onboarding_sections_revision_check check (revision > 0),
  constraint partner_onboarding_sections_completion_check
    check (completion_percentage between 0 and 100),
  constraint partner_onboarding_sections_response_size_check
    check (octet_length(response_data::text) <= 65536),
  constraint partner_onboarding_sections_waiver_check
    check (
      status <> 'waived'
      or (waived_at is not null and waived_by is not null and nullif(btrim(waiver_reason), '') is not null)
    )
);

create index partner_onboarding_sections_workspace_status_idx
  on public.partner_onboarding_sections(workspace_id, status);

create or replace function public.rcap_onboarding_guard_section_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.workspace_id <> old.workspace_id
       or new.section_key <> old.section_key
       or new.created_at <> old.created_at then
      raise exception using
        errcode = '23514',
        message = 'Immutable onboarding section identity cannot be changed';
    end if;

    if new.revision <> old.revision + 1 then
      raise exception using
        errcode = '40001',
        message = 'Onboarding section revision conflict';
    end if;

    if public.current_partner_role() = 'partner_admin'
       and not public.is_internal_admin()
       and (
         new.status in ('approved', 'waived', 'not_applicable')
         or new.approved_at is distinct from old.approved_at
         or new.approved_by is distinct from old.approved_by
         or new.waived_at is distinct from old.waived_at
         or new.waived_by is distinct from old.waived_by
         or new.waiver_reason is distinct from old.waiver_reason
         or new.reviewed_at is distinct from old.reviewed_at
         or new.reviewed_by is distinct from old.reviewed_by
       ) then
      raise exception using
        errcode = '42501',
        message = 'Partner actors cannot set internal section review fields';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists rcap_onboarding_guard_section_mutation
  on public.partner_onboarding_sections;
create trigger rcap_onboarding_guard_section_mutation
before update on public.partner_onboarding_sections
for each row execute function public.rcap_onboarding_guard_section_mutation();

-------------------------------------------------------------------------------
-- 3. Normalized partner-entered contacts, planned users, and report recipients.
-------------------------------------------------------------------------------

create table public.partner_onboarding_contacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null
    references public.partner_onboarding(id) on delete cascade,
  role text not null,
  name text not null,
  title text not null,
  organization text,
  work_email text not null,
  phone text,
  revision bigint not null default 1,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_onboarding_contacts_role_check
    check (role in (
      'executive_sponsor',
      'program_operator',
      'communications_lead',
      'reporting_evaluation_lead',
      'legal_services_referral_contact',
      'finance_procurement_contact',
      'technical_security_contact'
    )),
  constraint partner_onboarding_contacts_revision_check check (revision > 0),
  constraint partner_onboarding_contacts_name_check
    check (char_length(name) between 1 and 120),
  constraint partner_onboarding_contacts_title_check
    check (char_length(title) between 1 and 120),
  constraint partner_onboarding_contacts_organization_check
    check (organization is null or char_length(organization) <= 200),
  constraint partner_onboarding_contacts_email_check
    check (
      char_length(work_email) between 3 and 254
      and work_email = lower(work_email)
      and work_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    ),
  constraint partner_onboarding_contacts_phone_check
    check (phone is null or char_length(phone) <= 32)
);

create unique index partner_onboarding_contacts_active_role_unique
  on public.partner_onboarding_contacts(workspace_id, role)
  where deleted_at is null;
create index partner_onboarding_contacts_workspace_idx
  on public.partner_onboarding_contacts(workspace_id)
  where deleted_at is null;

create table public.partner_onboarding_planned_users (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null
    references public.partner_onboarding(id) on delete cascade,
  name text not null,
  work_email text not null,
  requested_role text not null,
  special_permissions text[] not null default '{}',
  training_attendee boolean not null default false,
  revision bigint not null default 1,
  training_status text not null default 'not_started',
  training_completed_at timestamptz,
  invitation_status text not null default 'not_invited',
  membership_status text not null default 'planned',
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_onboarding_planned_users_role_check
    check (requested_role in (
      'partner_administrator',
      'program_staff',
      'reporting_viewer'
    )),
  constraint partner_onboarding_planned_users_permissions_check
    check (
      special_permissions <@ array[
        'manage_codes',
        'view_reports',
        'export_reports',
        'manage_users'
      ]::text[]
    ),
  constraint partner_onboarding_planned_users_revision_check check (revision > 0),
  constraint partner_onboarding_planned_users_name_check
    check (char_length(name) between 1 and 120),
  constraint partner_onboarding_planned_users_email_check
    check (
      char_length(work_email) between 3 and 254
      and work_email = lower(work_email)
      and work_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    ),
  constraint partner_onboarding_planned_users_training_status_check
    check (training_status in ('not_started', 'scheduled', 'in_progress', 'complete')),
  constraint partner_onboarding_planned_users_invitation_status_check
    check (invitation_status in ('not_invited', 'planned', 'released')),
  constraint partner_onboarding_planned_users_membership_status_check
    check (membership_status in ('planned', 'active', 'disabled'))
);

create unique index partner_onboarding_planned_users_active_email_unique
  on public.partner_onboarding_planned_users(workspace_id, lower(work_email))
  where deleted_at is null;
create index partner_onboarding_planned_users_workspace_idx
  on public.partner_onboarding_planned_users(workspace_id)
  where deleted_at is null;

create table public.partner_onboarding_report_recipients (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null
    references public.partner_onboarding(id) on delete cascade,
  contact_id uuid references public.partner_onboarding_contacts(id),
  name text,
  work_email text not null,
  revision bigint not null default 1,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_onboarding_report_recipients_revision_check check (revision > 0),
  constraint partner_onboarding_report_recipients_name_check
    check (name is null or char_length(name) <= 120),
  constraint partner_onboarding_report_recipients_email_check
    check (
      char_length(work_email) between 3 and 254
      and work_email = lower(work_email)
      and work_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
    )
);

create unique index partner_onboarding_report_recipients_active_email_unique
  on public.partner_onboarding_report_recipients(workspace_id, lower(work_email))
  where deleted_at is null;
create index partner_onboarding_report_recipients_workspace_idx
  on public.partner_onboarding_report_recipients(workspace_id)
  where deleted_at is null;

create or replace function public.rcap_onboarding_guard_partner_row_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.workspace_id <> old.workspace_id
       or new.id <> old.id
       or new.created_at <> old.created_at then
      raise exception using
        errcode = '23514',
        message = 'Immutable onboarding row identity cannot be changed';
    end if;

    if new.revision <> old.revision + 1 then
      raise exception using
        errcode = '40001',
        message = 'Onboarding row revision conflict';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger rcap_onboarding_guard_contact_mutation
before update on public.partner_onboarding_contacts
for each row execute function public.rcap_onboarding_guard_partner_row_mutation();

create trigger rcap_onboarding_guard_planned_user_mutation
before update on public.partner_onboarding_planned_users
for each row execute function public.rcap_onboarding_guard_partner_row_mutation();

create trigger rcap_onboarding_guard_report_recipient_mutation
before update on public.partner_onboarding_report_recipients
for each row execute function public.rcap_onboarding_guard_partner_row_mutation();

create or replace function public.rcap_onboarding_validate_recipient_contact()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.contact_id is not null and not exists (
    select 1
    from public.partner_onboarding_contacts c
    where c.id = new.contact_id
      and c.workspace_id = new.workspace_id
      and c.deleted_at is null
  ) then
    raise exception using
      errcode = '23514',
      message = 'Report recipient contact must belong to this workspace';
  end if;
  return new;
end;
$$;

create trigger rcap_onboarding_validate_recipient_contact
before insert or update of contact_id, workspace_id
on public.partner_onboarding_report_recipients
for each row execute function public.rcap_onboarding_validate_recipient_contact();

-------------------------------------------------------------------------------
-- 4. Section change requests. Internal notes are physically separated.
-------------------------------------------------------------------------------

create table public.partner_onboarding_change_requests (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null
    references public.partner_onboarding(id) on delete cascade,
  section_id uuid not null
    references public.partner_onboarding_sections(id) on delete cascade,
  status text not null default 'open',
  partner_safe_instructions text not null,
  requested_by uuid not null references auth.users(id),
  requested_at timestamptz not null default now(),
  partner_response text,
  responded_by uuid references auth.users(id),
  responded_at timestamptz,
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  resolution_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_onboarding_change_requests_status_check
    check (status in ('open', 'partner_responded', 'resolved', 'cancelled')),
  constraint partner_onboarding_change_requests_instructions_check
    check (char_length(partner_safe_instructions) between 1 and 5000),
  constraint partner_onboarding_change_requests_response_check
    check (partner_response is null or char_length(partner_response) <= 5000),
  constraint partner_onboarding_change_requests_response_consistency
    check (
      (responded_at is null and responded_by is null)
      or
      (responded_at is not null and responded_by is not null and partner_response is not null)
    ),
  constraint partner_onboarding_change_requests_resolution_consistency
    check (
      (resolved_at is null and resolved_by is null)
      or
      (resolved_at is not null and resolved_by is not null)
    )
);

create unique index partner_onboarding_change_requests_one_open_per_section
  on public.partner_onboarding_change_requests(section_id)
  where status in ('open', 'partner_responded');
create index partner_onboarding_change_requests_workspace_status_idx
  on public.partner_onboarding_change_requests(workspace_id, status, requested_at desc);

create table public.partner_onboarding_change_request_internal_notes (
  id uuid primary key default gen_random_uuid(),
  change_request_id uuid not null
    references public.partner_onboarding_change_requests(id) on delete cascade,
  note text not null check (char_length(note) between 1 and 5000),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create index partner_onboarding_change_request_internal_notes_request_idx
  on public.partner_onboarding_change_request_internal_notes(change_request_id, created_at);

create or replace function public.rcap_onboarding_validate_change_request_section()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.partner_onboarding_sections s
    where s.id = new.section_id
      and s.workspace_id = new.workspace_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'Change request section must belong to this workspace';
  end if;
  return new;
end;
$$;

create trigger rcap_onboarding_validate_change_request_section
before insert or update of section_id, workspace_id
on public.partner_onboarding_change_requests
for each row execute function public.rcap_onboarding_validate_change_request_section();

create or replace function public.rcap_onboarding_guard_change_request_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id
     or new.workspace_id <> old.workspace_id
     or new.section_id <> old.section_id
     or new.requested_by <> old.requested_by
     or new.requested_at <> old.requested_at
     or new.created_at <> old.created_at then
    raise exception using
      errcode = '23514',
      message = 'Immutable change-request identity cannot be changed';
  end if;

  if public.current_partner_role() = 'partner_admin'
     and not public.is_internal_admin() then
    if old.status not in ('open', 'partner_responded')
       or new.status <> 'partner_responded'
       or new.partner_safe_instructions <> old.partner_safe_instructions
       or new.resolved_by is distinct from old.resolved_by
       or new.resolved_at is distinct from old.resolved_at
       or new.resolution_reason is distinct from old.resolution_reason then
      raise exception using
        errcode = '42501',
        message = 'Partner actors may only respond to an open change request';
    end if;
    new.responded_by := auth.uid();
    new.responded_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger rcap_onboarding_guard_change_request_update
before update on public.partner_onboarding_change_requests
for each row execute function public.rcap_onboarding_guard_change_request_update();

-------------------------------------------------------------------------------
-- 5. Private organizational asset metadata and agreement/procurement metadata.
-------------------------------------------------------------------------------

create table public.partner_onboarding_assets (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null
    references public.partner_onboarding(id) on delete cascade,
  partner_record_id uuid not null
    references public.partner_records(id) on delete cascade,
  category text not null,
  bucket_id text not null default 'rcap-partner-onboarding-private',
  object_path text not null,
  original_filename text not null,
  safe_filename text not null,
  media_type text not null,
  file_extension text not null,
  byte_size bigint not null,
  width_pixels integer,
  height_pixels integer,
  sha256_hex text,
  lifecycle_status text not null default 'pending_review',
  review_status text not null default 'pending',
  review_reason text,
  replaced_by_asset_id uuid references public.partner_onboarding_assets(id),
  uploaded_by uuid not null references auth.users(id),
  uploaded_at timestamptz not null default now(),
  deleted_by uuid references auth.users(id),
  deleted_at timestamptz,
  deletion_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_onboarding_assets_category_check
    check (category in (
      'transparent_logo',
      'brand_guide',
      'hero_or_community_image',
      'organizer_or_program_lead_image',
      'approved_partner_description_attachment',
      'procurement_document',
      'other_approved_organizational_asset'
    )),
  constraint partner_onboarding_assets_bucket_check
    check (bucket_id = 'rcap-partner-onboarding-private'),
  constraint partner_onboarding_assets_media_type_check
    check (media_type in (
      'image/png',
      'image/jpeg',
      'image/webp',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    )),
  constraint partner_onboarding_assets_extension_check
    check (file_extension in ('png', 'jpg', 'jpeg', 'webp', 'pdf', 'docx')),
  constraint partner_onboarding_assets_byte_size_check
    check (byte_size > 0 and byte_size <= 20971520),
  constraint partner_onboarding_assets_dimensions_check
    check (
      (width_pixels is null and height_pixels is null)
      or
      (width_pixels between 1 and 20000 and height_pixels between 1 and 20000)
    ),
  constraint partner_onboarding_assets_sha256_check
    check (sha256_hex is null or sha256_hex ~ '^[0-9a-f]{64}$'),
  constraint partner_onboarding_assets_lifecycle_check
    check (lifecycle_status in ('pending_review', 'active', 'superseded', 'deleted')),
  constraint partner_onboarding_assets_review_check
    check (review_status in ('pending', 'approved', 'rejected')),
  constraint partner_onboarding_assets_deleted_consistency
    check (
      (deleted_at is null and deleted_by is null)
      or
      (deleted_at is not null and deleted_by is not null and lifecycle_status = 'deleted')
    )
);

create unique index partner_onboarding_assets_object_path_unique
  on public.partner_onboarding_assets(object_path);
create unique index partner_onboarding_assets_current_category_unique
  on public.partner_onboarding_assets(workspace_id, category)
  where lifecycle_status in ('pending_review', 'active') and deleted_at is null;
create index partner_onboarding_assets_workspace_idx
  on public.partner_onboarding_assets(workspace_id, uploaded_at desc);

create or replace function public.rcap_onboarding_validate_asset_metadata()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_workspace_partner_id uuid;
  v_expected_path text;
begin
  select coalesce(po.partner_record_id, pr.id)
    into v_workspace_partner_id
  from public.partner_onboarding po
  join public.partner_records pr on pr.partner_slug = po.partner_slug
  where po.id = new.workspace_id;

  if v_workspace_partner_id is null
     or v_workspace_partner_id <> new.partner_record_id then
    raise exception using
      errcode = '23514',
      message = 'Asset partner does not match onboarding workspace';
  end if;

  v_expected_path :=
    'partners/' || new.partner_record_id::text ||
    '/onboarding/' || new.workspace_id::text ||
    '/' || new.category ||
    '/' || new.id::text || '.' || new.file_extension;

  if new.object_path <> v_expected_path then
    raise exception using
      errcode = '23514',
      message = 'Asset object path is not server canonical';
  end if;

  if (
    new.media_type = 'image/png' and new.file_extension <> 'png'
  ) or (
    new.media_type = 'image/jpeg' and new.file_extension not in ('jpg', 'jpeg')
  ) or (
    new.media_type = 'image/webp' and new.file_extension <> 'webp'
  ) or (
    new.media_type = 'application/pdf' and new.file_extension <> 'pdf'
  ) or (
    new.media_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    and new.file_extension <> 'docx'
  ) then
    raise exception using
      errcode = '23514',
      message = 'Asset media type and extension do not match';
  end if;

  if new.category in (
    'transparent_logo',
    'hero_or_community_image',
    'organizer_or_program_lead_image'
  ) and new.media_type not in ('image/png', 'image/jpeg', 'image/webp') then
    raise exception using
      errcode = '23514',
      message = 'Image asset category requires a supported raster image';
  end if;

  if new.category in (
    'brand_guide',
    'approved_partner_description_attachment',
    'procurement_document'
  ) and new.media_type not in (
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) then
    raise exception using
      errcode = '23514',
      message = 'Document asset category requires PDF or DOCX';
  end if;

  if new.media_type like 'image/%' and new.byte_size > 10485760 then
    raise exception using
      errcode = '23514',
      message = 'Image asset exceeds the 10 MiB limit';
  end if;

  if tg_op = 'UPDATE' then
    if new.id <> old.id
       or new.workspace_id <> old.workspace_id
       or new.partner_record_id <> old.partner_record_id
       or new.bucket_id <> old.bucket_id
       or new.object_path <> old.object_path
       or new.original_filename <> old.original_filename
       or new.safe_filename <> old.safe_filename
       or new.media_type <> old.media_type
       or new.file_extension <> old.file_extension
       or new.byte_size <> old.byte_size
       or new.uploaded_by <> old.uploaded_by
       or new.uploaded_at <> old.uploaded_at
       or new.created_at <> old.created_at then
      raise exception using
        errcode = '23514',
        message = 'Stored asset identity and file facts are immutable';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger rcap_onboarding_validate_asset_metadata
before insert or update on public.partner_onboarding_assets
for each row execute function public.rcap_onboarding_validate_asset_metadata();

create table public.partner_onboarding_agreements (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null
    references public.partner_onboarding(id) on delete cascade,
  agreement_type text not null,
  status text not null default 'not_required',
  is_required boolean not null default false,
  partner_safe_detail text,
  finalized_asset_id uuid references public.partner_onboarding_assets(id),
  internal_reference text,
  internal_notes text,
  effective_date date,
  recorded_by uuid references auth.users(id),
  recorded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_onboarding_agreements_workspace_type_unique
    unique (workspace_id, agreement_type),
  constraint partner_onboarding_agreements_type_check
    check (agreement_type in (
      'order_form',
      'master_services_agreement',
      'data_privacy_security_addendum',
      'procurement_requirements'
    )),
  constraint partner_onboarding_agreements_status_check
    check (status in (
      'not_required',
      'not_started',
      'requested',
      'under_review',
      'finalized',
      'executed',
      'approved',
      'waived'
    )),
  constraint partner_onboarding_agreements_detail_check
    check (partner_safe_detail is null or char_length(partner_safe_detail) <= 5000),
  constraint partner_onboarding_agreements_recorded_consistency
    check (
      (recorded_at is null and recorded_by is null)
      or
      (recorded_at is not null and recorded_by is not null)
    )
);

create index partner_onboarding_agreements_workspace_status_idx
  on public.partner_onboarding_agreements(workspace_id, status);

create or replace function public.rcap_onboarding_validate_agreement_asset()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.finalized_asset_id is not null and not exists (
    select 1
    from public.partner_onboarding_assets a
    where a.id = new.finalized_asset_id
      and a.workspace_id = new.workspace_id
      and a.deleted_at is null
      and a.review_status = 'approved'
  ) then
    raise exception using
      errcode = '23514',
      message = 'Finalized agreement asset must be an approved asset in this workspace';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger rcap_onboarding_validate_agreement_asset
before insert or update on public.partner_onboarding_agreements
for each row execute function public.rcap_onboarding_validate_agreement_asset();

-------------------------------------------------------------------------------
-- 6. Partner authorization, safe activity, local events, and idempotency.
-------------------------------------------------------------------------------

create table public.partner_onboarding_authorizations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null
    references public.partner_onboarding(id) on delete cascade,
  organization_information_accurate boolean not null,
  program_scope_approved_for_configuration boolean not null,
  brand_assets_authorized_for_use boolean not null,
  no_eligibility_or_outcome_guarantee_understood boolean not null,
  contested_and_representation_matters_follow_escalation_plan boolean not null,
  dashboard_users_authorized boolean not null,
  legalease_may_prepare_draft_implementation_materials boolean not null,
  approver_name text not null,
  approver_title text not null,
  approver_user_id uuid not null references auth.users(id),
  approver_work_email text not null,
  authorization_timestamp timestamptz not null,
  terms_or_schema_version text not null,
  request_id uuid not null,
  created_at timestamptz not null default now(),
  constraint partner_onboarding_authorizations_workspace_request_unique
    unique (workspace_id, request_id),
  constraint partner_onboarding_authorizations_name_check
    check (char_length(approver_name) between 1 and 120),
  constraint partner_onboarding_authorizations_title_check
    check (char_length(approver_title) between 1 and 120),
  constraint partner_onboarding_authorizations_all_acknowledged_check
    check (
      organization_information_accurate
      and program_scope_approved_for_configuration
      and brand_assets_authorized_for_use
      and no_eligibility_or_outcome_guarantee_understood
      and contested_and_representation_matters_follow_escalation_plan
      and dashboard_users_authorized
      and legalease_may_prepare_draft_implementation_materials
    )
);

create index partner_onboarding_authorizations_workspace_time_idx
  on public.partner_onboarding_authorizations(workspace_id, authorization_timestamp desc);

create or replace function public.rcap_onboarding_derive_authorization_actor()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor_id uuid;
  v_actor_email text;
begin
  -- Only the service-role submission function can insert authorization rows.
  -- It supplies the actor resolved from the server session; this trigger then
  -- independently revalidates active partner-admin membership, normalizes the
  -- server-session work email, and derives the server timestamp.
  v_actor_id := new.approver_user_id;
  v_actor_email := lower(btrim(new.approver_work_email));

  perform 1
  from public.partner_users pu
  join public.partner_onboarding po
    on po.id = new.workspace_id
   and po.partner_slug = pu.partner_slug
  where pu.auth_user_id = v_actor_id
    and pu.status = 'active'
    and pu.role = 'partner_admin';

  if not found
     or v_actor_id is null
     or nullif(v_actor_email, '') is null
     or char_length(v_actor_email) > 254 then
    raise exception using
      errcode = '42501',
      message = 'Active partner administrator authorization is required';
  end if;

  new.approver_user_id := v_actor_id;
  new.approver_work_email := v_actor_email;
  new.authorization_timestamp := now();
  new.created_at := now();
  return new;
end;
$$;

revoke all on function public.rcap_onboarding_derive_authorization_actor()
  from public, anon, authenticated;

create trigger rcap_onboarding_derive_authorization_actor
before insert on public.partner_onboarding_authorizations
for each row execute function public.rcap_onboarding_derive_authorization_actor();

create or replace function public.rcap_onboarding_prevent_authorization_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using
    errcode = '55000',
    message = 'Onboarding authorizations are append-only';
end;
$$;

create trigger rcap_onboarding_authorizations_prevent_update
before update on public.partner_onboarding_authorizations
for each row execute function public.rcap_onboarding_prevent_authorization_mutation();
create trigger rcap_onboarding_authorizations_prevent_delete
before delete on public.partner_onboarding_authorizations
for each row execute function public.rcap_onboarding_prevent_authorization_mutation();

create table public.partner_onboarding_activity (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null
    references public.partner_onboarding(id) on delete cascade,
  event_type text not null,
  section_key text,
  status_code text,
  summary_code text not null,
  owner_type text not null default 'partner',
  actor_user_id uuid references auth.users(id),
  request_id uuid,
  dedupe_key text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint partner_onboarding_activity_event_type_check
    check (event_type in (
      'workspace_created',
      'commercial_gate_changed',
      'section_started',
      'section_completed',
      'section_change_requested',
      'section_resubmitted',
      'required_asset_uploaded',
      'required_asset_replaced',
      'required_asset_deleted',
      'onboarding_submitted',
      'section_approved',
      'section_waived',
      'ready_for_launch_decided'
    )),
  constraint partner_onboarding_activity_section_key_check
    check (
      section_key is null or section_key in (
        'organization_contacts',
        'program_goals',
        'geography_audience_language_accessibility',
        'access_sponsorship_capacity',
        'brand_public_page',
        'staff_dashboard_plan',
        'support_referrals_reporting',
        'review_authorization'
      )
    ),
  constraint partner_onboarding_activity_owner_check
    check (owner_type in ('partner', 'legalease', 'system')),
  constraint partner_onboarding_activity_summary_check
    check (
      char_length(summary_code) between 1 and 120
      and summary_code ~ '^[a-z0-9_]+$'
    ),
  constraint partner_onboarding_activity_status_code_check
    check (
      status_code is null
      or (
        char_length(status_code) between 1 and 120
        and status_code ~ '^[a-z0-9_]+$'
      )
    )
);

create unique index partner_onboarding_activity_dedupe_unique
  on public.partner_onboarding_activity(workspace_id, dedupe_key)
  where dedupe_key is not null;
create index partner_onboarding_activity_workspace_time_idx
  on public.partner_onboarding_activity(workspace_id, occurred_at desc);

create table public.partner_onboarding_integration_events (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null
    references public.partner_onboarding(id) on delete cascade,
  partner_record_id uuid not null
    references public.partner_records(id) on delete cascade,
  event_type text not null,
  event_schema_version text not null default '1',
  workspace_aggregate_version bigint not null,
  workspace_status text not null,
  completion_percentage integer not null,
  blocker_code text,
  next_action_code text,
  next_action_owner text not null,
  target_launch_date date,
  section_key text,
  section_status text,
  artifact_category text,
  artifact_status text,
  idempotency_key text not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint partner_onboarding_integration_events_type_check
    check (event_type in (
      'rcap_partner_workspace_created',
      'rcap_commercial_gate_changed',
      'rcap_onboarding_progressed',
      'rcap_onboarding_blocked',
      'rcap_onboarding_submitted',
      'rcap_team_configuration_changed',
      'rcap_brand_configuration_changed',
      'rcap_section_review_changed'
    )),
  constraint partner_onboarding_integration_events_version_check
    check (workspace_aggregate_version > 0),
  constraint partner_onboarding_integration_events_completion_check
    check (completion_percentage between 0 and 100),
  constraint partner_onboarding_integration_events_owner_check
    check (next_action_owner in ('partner', 'legalease', 'none')),
  constraint partner_onboarding_integration_events_code_check
    check (
      (blocker_code is null or (
        char_length(blocker_code) between 1 and 120
        and blocker_code ~ '^[a-z0-9_]+$'
      ))
      and
      (next_action_code is null or (
        char_length(next_action_code) between 1 and 120
        and next_action_code ~ '^[a-z0-9_]+$'
      ))
    ),
  constraint partner_onboarding_integration_events_idempotency_check
    check (
      char_length(idempotency_key) between 1 and 200
      and idempotency_key ~ '^[A-Za-z0-9:_-]+$'
    )
);

create unique index partner_onboarding_integration_events_idempotency_unique
  on public.partner_onboarding_integration_events(idempotency_key);
create index partner_onboarding_integration_events_workspace_version_idx
  on public.partner_onboarding_integration_events(
    workspace_id,
    workspace_aggregate_version,
    occurred_at
  );

create table public.partner_onboarding_idempotency (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null
    references public.partner_onboarding(id) on delete cascade,
  operation_key text not null,
  request_id uuid not null,
  actor_user_id uuid not null references auth.users(id),
  payload_hash text not null,
  result_status text not null default 'started',
  result_workspace_version bigint,
  result_section_revision bigint,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint partner_onboarding_idempotency_workspace_operation_request_unique
    unique (workspace_id, operation_key, request_id),
  constraint partner_onboarding_idempotency_request_unique unique (request_id),
  constraint partner_onboarding_idempotency_operation_key_check
    check (
      char_length(operation_key) between 1 and 120
      and operation_key ~ '^[a-z0-9:_-]+$'
    ),
  constraint partner_onboarding_idempotency_payload_hash_check
    check (payload_hash ~ '^[0-9a-f]{64}$'),
  constraint partner_onboarding_idempotency_result_status_check
    check (result_status in ('started', 'succeeded', 'failed')),
  constraint partner_onboarding_idempotency_expiry_check
    check (expires_at > created_at)
);

create index partner_onboarding_idempotency_workspace_created_idx
  on public.partner_onboarding_idempotency(workspace_id, created_at desc);
create index partner_onboarding_idempotency_expiry_idx
  on public.partner_onboarding_idempotency(expires_at);

create or replace function public.rcap_onboarding_prevent_append_only_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception using
    errcode = '55000',
    message = tg_table_name || ' is append-only';
end;
$$;

create trigger rcap_onboarding_activity_prevent_update
before update on public.partner_onboarding_activity
for each row execute function public.rcap_onboarding_prevent_append_only_mutation();
create trigger rcap_onboarding_activity_prevent_delete
before delete on public.partner_onboarding_activity
for each row execute function public.rcap_onboarding_prevent_append_only_mutation();
create trigger rcap_onboarding_integration_events_prevent_update
before update on public.partner_onboarding_integration_events
for each row execute function public.rcap_onboarding_prevent_append_only_mutation();
create trigger rcap_onboarding_integration_events_prevent_delete
before delete on public.partner_onboarding_integration_events
for each row execute function public.rcap_onboarding_prevent_append_only_mutation();
create trigger rcap_onboarding_change_request_notes_prevent_update
before update on public.partner_onboarding_change_request_internal_notes
for each row execute function public.rcap_onboarding_prevent_append_only_mutation();
create trigger rcap_onboarding_change_request_notes_prevent_delete
before delete on public.partner_onboarding_change_request_internal_notes
for each row execute function public.rcap_onboarding_prevent_append_only_mutation();

create or replace function public.rcap_onboarding_guard_idempotency_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id <> old.id
     or new.workspace_id <> old.workspace_id
     or new.operation_key <> old.operation_key
     or new.request_id <> old.request_id
     or new.actor_user_id <> old.actor_user_id
     or new.payload_hash <> old.payload_hash
     or new.expires_at <> old.expires_at
     or new.created_at <> old.created_at then
    raise exception using
      errcode = '23514',
      message = 'Idempotency request identity cannot be changed';
  end if;

  if old.result_status <> 'started'
     or new.result_status not in ('succeeded', 'failed')
     or new.completed_at is null then
    raise exception using
      errcode = '23514',
      message = 'Invalid idempotency result transition';
  end if;

  return new;
end;
$$;

create trigger rcap_onboarding_guard_idempotency_update
before update on public.partner_onboarding_idempotency
for each row execute function public.rcap_onboarding_guard_idempotency_update();

create or replace function public.rcap_onboarding_derive_idempotency_actor()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' then
    if new.actor_user_id is null then
      raise exception using
        errcode = '23502',
        message = 'Idempotency actor is required';
    end if;
  elsif public.is_internal_admin() then
    if new.actor_user_id is null then
      new.actor_user_id := auth.uid();
    end if;
  else
    if public.current_partner_role() <> 'partner_admin' then
      raise exception using
        errcode = '42501',
        message = 'Active partner administrator is required';
    end if;
    new.actor_user_id := auth.uid();
  end if;
  return new;
end;
$$;

create trigger rcap_onboarding_derive_idempotency_actor
before insert on public.partner_onboarding_idempotency
for each row execute function public.rcap_onboarding_derive_idempotency_actor();

create or replace function public.rcap_onboarding_validate_event_workspace()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if not exists (
    select 1
    from public.partner_onboarding po
    join public.partner_records pr on pr.partner_slug = po.partner_slug
    where po.id = new.workspace_id
      and pr.id = new.partner_record_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'Integration event partner does not match workspace';
  end if;
  return new;
end;
$$;

create trigger rcap_onboarding_validate_event_workspace
before insert on public.partner_onboarding_integration_events
for each row execute function public.rcap_onboarding_validate_event_workspace();

-------------------------------------------------------------------------------
-- 7. RLS. Partner identity always comes from the active server-side session.
-------------------------------------------------------------------------------

alter table public.partner_onboarding enable row level security;
alter table public.partner_onboarding_sections enable row level security;
alter table public.partner_onboarding_contacts enable row level security;
alter table public.partner_onboarding_planned_users enable row level security;
alter table public.partner_onboarding_report_recipients enable row level security;
alter table public.partner_onboarding_change_requests enable row level security;
alter table public.partner_onboarding_change_request_internal_notes enable row level security;
alter table public.partner_onboarding_assets enable row level security;
alter table public.partner_onboarding_agreements enable row level security;
alter table public.partner_onboarding_authorizations enable row level security;
alter table public.partner_onboarding_activity enable row level security;
alter table public.partner_onboarding_integration_events enable row level security;
alter table public.partner_onboarding_idempotency enable row level security;

-- Phase 42 owns the partner and internal read policies. Add only internal
-- workspace creation/update; partners never mutate aggregate or commercial truth.
drop policy if exists partner_onboarding_insert_internal_admin
  on public.partner_onboarding;
create policy partner_onboarding_insert_internal_admin
on public.partner_onboarding
for insert
to authenticated
with check (public.is_internal_admin());

drop policy if exists partner_onboarding_update_internal_admin
  on public.partner_onboarding;
create policy partner_onboarding_update_internal_admin
on public.partner_onboarding
for update
to authenticated
using (public.is_internal_admin())
with check (public.is_internal_admin());

drop policy if exists partner_onboarding_sections_select_partner
  on public.partner_onboarding_sections;
create policy partner_onboarding_sections_select_partner
on public.partner_onboarding_sections
for select
to authenticated
using (
  exists (
    select 1
    from public.partner_onboarding po
    where po.id = workspace_id
      and po.partner_slug = public.current_partner_slug()
  )
);

drop policy if exists partner_onboarding_sections_select_internal
  on public.partner_onboarding_sections;
create policy partner_onboarding_sections_select_internal
on public.partner_onboarding_sections
for select
to authenticated
using (public.is_internal_admin());

drop policy if exists partner_onboarding_sections_all_internal
  on public.partner_onboarding_sections;
create policy partner_onboarding_sections_all_internal
on public.partner_onboarding_sections
for all
to authenticated
using (public.is_internal_admin())
with check (public.is_internal_admin());

-- The same partner row policies apply to contacts, planned users, and report
-- recipients. Each statement is explicit so policy behavior remains auditable.
drop policy if exists partner_onboarding_contacts_select_partner
  on public.partner_onboarding_contacts;
create policy partner_onboarding_contacts_select_partner
on public.partner_onboarding_contacts
for select
to authenticated
using (
  exists (
    select 1 from public.partner_onboarding po
    where po.id = workspace_id
      and po.partner_slug = public.current_partner_slug()
  )
);
drop policy if exists partner_onboarding_contacts_all_internal
  on public.partner_onboarding_contacts;
create policy partner_onboarding_contacts_all_internal
on public.partner_onboarding_contacts
for all
to authenticated
using (public.is_internal_admin())
with check (public.is_internal_admin());

drop policy if exists partner_onboarding_planned_users_select_partner
  on public.partner_onboarding_planned_users;
create policy partner_onboarding_planned_users_select_partner
on public.partner_onboarding_planned_users
for select
to authenticated
using (
  exists (
    select 1 from public.partner_onboarding po
    where po.id = workspace_id
      and po.partner_slug = public.current_partner_slug()
  )
);
drop policy if exists partner_onboarding_planned_users_all_internal
  on public.partner_onboarding_planned_users;
create policy partner_onboarding_planned_users_all_internal
on public.partner_onboarding_planned_users
for all
to authenticated
using (public.is_internal_admin())
with check (public.is_internal_admin());

drop policy if exists partner_onboarding_report_recipients_select_partner
  on public.partner_onboarding_report_recipients;
create policy partner_onboarding_report_recipients_select_partner
on public.partner_onboarding_report_recipients
for select
to authenticated
using (
  exists (
    select 1 from public.partner_onboarding po
    where po.id = workspace_id
      and po.partner_slug = public.current_partner_slug()
  )
);
drop policy if exists partner_onboarding_report_recipients_all_internal
  on public.partner_onboarding_report_recipients;
create policy partner_onboarding_report_recipients_all_internal
on public.partner_onboarding_report_recipients
for all
to authenticated
using (public.is_internal_admin())
with check (public.is_internal_admin());

drop policy if exists partner_onboarding_change_requests_select_partner
  on public.partner_onboarding_change_requests;
create policy partner_onboarding_change_requests_select_partner
on public.partner_onboarding_change_requests
for select
to authenticated
using (
  exists (
    select 1 from public.partner_onboarding po
    where po.id = workspace_id
      and po.partner_slug = public.current_partner_slug()
  )
);
drop policy if exists partner_onboarding_change_requests_update_partner_admin
  on public.partner_onboarding_change_requests;
create policy partner_onboarding_change_requests_update_partner_admin
on public.partner_onboarding_change_requests
for update
to authenticated
using (
  status in ('open', 'partner_responded')
  and public.current_partner_role() = 'partner_admin'
  and exists (
    select 1 from public.partner_onboarding po
    where po.id = workspace_id
      and po.partner_slug = public.current_partner_slug()
  )
)
with check (
  status = 'partner_responded'
  and public.current_partner_role() = 'partner_admin'
  and exists (
    select 1 from public.partner_onboarding po
    where po.id = workspace_id
      and po.partner_slug = public.current_partner_slug()
  )
);
drop policy if exists partner_onboarding_change_requests_all_internal
  on public.partner_onboarding_change_requests;
create policy partner_onboarding_change_requests_all_internal
on public.partner_onboarding_change_requests
for all
to authenticated
using (public.is_internal_admin())
with check (public.is_internal_admin());

drop policy if exists partner_onboarding_change_request_notes_all_internal
  on public.partner_onboarding_change_request_internal_notes;
create policy partner_onboarding_change_request_notes_all_internal
on public.partner_onboarding_change_request_internal_notes
for all
to authenticated
using (public.is_internal_admin())
with check (public.is_internal_admin());

drop policy if exists partner_onboarding_assets_select_partner
  on public.partner_onboarding_assets;
create policy partner_onboarding_assets_select_partner
on public.partner_onboarding_assets
for select
to authenticated
using (
  exists (
    select 1 from public.partner_onboarding po
    where po.id = workspace_id
      and po.partner_slug = public.current_partner_slug()
  )
);
drop policy if exists partner_onboarding_assets_all_internal
  on public.partner_onboarding_assets;
create policy partner_onboarding_assets_all_internal
on public.partner_onboarding_assets
for all
to authenticated
using (public.is_internal_admin())
with check (public.is_internal_admin());

drop policy if exists partner_onboarding_agreements_select_partner
  on public.partner_onboarding_agreements;
create policy partner_onboarding_agreements_select_partner
on public.partner_onboarding_agreements
for select
to authenticated
using (
  exists (
    select 1 from public.partner_onboarding po
    where po.id = workspace_id
      and po.partner_slug = public.current_partner_slug()
  )
);
drop policy if exists partner_onboarding_agreements_all_internal
  on public.partner_onboarding_agreements;
create policy partner_onboarding_agreements_all_internal
on public.partner_onboarding_agreements
for all
to authenticated
using (public.is_internal_admin())
with check (public.is_internal_admin());

drop policy if exists partner_onboarding_authorizations_select_partner
  on public.partner_onboarding_authorizations;
create policy partner_onboarding_authorizations_select_partner
on public.partner_onboarding_authorizations
for select
to authenticated
using (
  exists (
    select 1 from public.partner_onboarding po
    where po.id = workspace_id
      and po.partner_slug = public.current_partner_slug()
  )
);
drop policy if exists partner_onboarding_authorizations_insert_partner_admin
  on public.partner_onboarding_authorizations;
drop policy if exists partner_onboarding_authorizations_all_internal
  on public.partner_onboarding_authorizations;
create policy partner_onboarding_authorizations_all_internal
on public.partner_onboarding_authorizations
for all
to authenticated
using (public.is_internal_admin())
with check (public.is_internal_admin());

drop policy if exists partner_onboarding_activity_select_partner
  on public.partner_onboarding_activity;
create policy partner_onboarding_activity_select_partner
on public.partner_onboarding_activity
for select
to authenticated
using (
  exists (
    select 1 from public.partner_onboarding po
    where po.id = workspace_id
      and po.partner_slug = public.current_partner_slug()
  )
);
drop policy if exists partner_onboarding_activity_all_internal
  on public.partner_onboarding_activity;
create policy partner_onboarding_activity_all_internal
on public.partner_onboarding_activity
for all
to authenticated
using (public.is_internal_admin())
with check (public.is_internal_admin());

drop policy if exists partner_onboarding_integration_events_all_internal
  on public.partner_onboarding_integration_events;
create policy partner_onboarding_integration_events_all_internal
on public.partner_onboarding_integration_events
for all
to authenticated
using (public.is_internal_admin())
with check (public.is_internal_admin());

drop policy if exists partner_onboarding_idempotency_all_internal
  on public.partner_onboarding_idempotency;
create policy partner_onboarding_idempotency_all_internal
on public.partner_onboarding_idempotency
for all
to authenticated
using (public.is_internal_admin())
with check (public.is_internal_admin());

-- Structured questionnaire and idempotency writes are owned by the validated
-- server mutation boundary. Partner policies are read-only.

-------------------------------------------------------------------------------
-- 8. Partner-safe projections and least-privilege grants.
-------------------------------------------------------------------------------

create or replace view public.partner_onboarding_workspace_safe
with (security_barrier = true, security_invoker = true)
as
select
  po.id,
  po.partner_slug,
  po.partner_record_id,
  po.status,
  po.schema_version,
  po.aggregate_version,
  po.completion_percentage,
  po.blocker_code,
  po.next_action_code,
  po.next_action_owner,
  po.target_launch_date,
  po.commercial_gate_status,
  po.commercial_gate_changed_at,
  po.agreement_status,
  po.agreement_date,
  po.billing_contact_name,
  po.billing_contact_email,
  po.package_name,
  po.public_display_name,
  po.public_headline,
  po.public_subheadline,
  po.support_instructions,
  po.show_partner_logo,
  po.show_powered_by,
  po.profile_ready,
  po.billing_ready,
  po.access_controls_ready,
  po.landing_page_ready,
  po.admin_users_ready,
  po.launch_materials_ready,
  po.training_review_ready,
  po.internal_approved_at,
  po.submitted_at,
  po.submitted_schema_version,
  po.launched_at,
  po.paused_at,
  po.closed_at,
  po.last_meaningful_activity_at,
  po.created_at,
  po.updated_at
from public.partner_onboarding po;

create or replace view public.partner_onboarding_tasks_safe
with (security_barrier = true, security_invoker = true)
as
select
  pot.id,
  pot.partner_slug,
  pot.task_key,
  pot.title,
  pot.description,
  pot.status,
  pot.owner,
  pot.required,
  pot.completed_at,
  pot.created_at,
  pot.updated_at
from public.partner_onboarding_tasks pot;

create or replace view public.partner_onboarding_change_requests_safe
with (security_barrier = true, security_invoker = true)
as
select
  cr.id,
  cr.workspace_id,
  cr.section_id,
  cr.status,
  cr.partner_safe_instructions,
  cr.requested_at,
  cr.partner_response,
  cr.responded_at,
  cr.resolved_at,
  cr.created_at,
  cr.updated_at
from public.partner_onboarding_change_requests cr;

create or replace view public.partner_onboarding_assets_safe
with (security_barrier = true, security_invoker = true)
as
select
  a.id,
  a.workspace_id,
  a.category,
  a.original_filename,
  a.safe_filename,
  a.media_type,
  a.file_extension,
  a.byte_size,
  a.width_pixels,
  a.height_pixels,
  a.lifecycle_status,
  a.review_status,
  a.replaced_by_asset_id,
  a.uploaded_at,
  a.deleted_at,
  a.created_at,
  a.updated_at
from public.partner_onboarding_assets a;

create or replace view public.partner_onboarding_agreements_safe
with (security_barrier = true, security_invoker = true)
as
select
  a.id,
  a.workspace_id,
  a.agreement_type,
  a.status,
  a.is_required,
  a.partner_safe_detail,
  a.finalized_asset_id,
  a.effective_date,
  a.recorded_at,
  a.created_at,
  a.updated_at
from public.partner_onboarding_agreements a;

revoke all on table public.partner_onboarding from public, anon, authenticated;
revoke all on table public.partner_onboarding_tasks from public, anon, authenticated;
revoke all on table public.partner_onboarding_sections from public, anon, authenticated;
revoke all on table public.partner_onboarding_contacts from public, anon, authenticated;
revoke all on table public.partner_onboarding_planned_users from public, anon, authenticated;
revoke all on table public.partner_onboarding_report_recipients from public, anon, authenticated;
revoke all on table public.partner_onboarding_change_requests from public, anon, authenticated;
revoke all on table public.partner_onboarding_change_request_internal_notes from public, anon, authenticated;
revoke all on table public.partner_onboarding_assets from public, anon, authenticated;
revoke all on table public.partner_onboarding_agreements from public, anon, authenticated;
revoke all on table public.partner_onboarding_authorizations from public, anon, authenticated;
revoke all on table public.partner_onboarding_activity from public, anon, authenticated;
revoke all on table public.partner_onboarding_integration_events from public, anon, authenticated;
revoke all on table public.partner_onboarding_idempotency from public, anon, authenticated;

revoke all on table public.partner_onboarding_workspace_safe from public, anon;
revoke all on table public.partner_onboarding_tasks_safe from public, anon;
revoke all on table public.partner_onboarding_change_requests_safe from public, anon;
revoke all on table public.partner_onboarding_assets_safe from public, anon;
revoke all on table public.partner_onboarding_agreements_safe from public, anon;

-- Safe workspace/task projections fix Phase 42's table-level internal-note
-- exposure while preserving RLS-backed partner status reads.
grant select (
  id,
  partner_slug,
  partner_record_id,
  status,
  schema_version,
  aggregate_version,
  completion_percentage,
  blocker_code,
  next_action_code,
  next_action_owner,
  target_launch_date,
  commercial_gate_status,
  commercial_gate_changed_at,
  agreement_status,
  agreement_date,
  billing_contact_name,
  billing_contact_email,
  package_name,
  public_display_name,
  public_headline,
  public_subheadline,
  support_instructions,
  show_partner_logo,
  show_powered_by,
  profile_ready,
  billing_ready,
  access_controls_ready,
  landing_page_ready,
  admin_users_ready,
  launch_materials_ready,
  training_review_ready,
  internal_approved_at,
  submitted_at,
  submitted_schema_version,
  launched_at,
  paused_at,
  closed_at,
  last_meaningful_activity_at,
  created_at,
  updated_at
) on public.partner_onboarding to authenticated;
grant select on public.partner_onboarding_workspace_safe to authenticated;

-- Required by child-table/storage ownership checks and the authenticated
-- partner shell. RLS still limits every row to the active partner, while this
-- column grant excludes billing, entitlement, and internal provisioning data.
grant select (
  id,
  partner_slug,
  organization_name,
  partner_name,
  program_name,
  selected_package_id
) on public.partner_records to authenticated;

-- Capacity and overage truth remains owned by partner_entitlement. Expose only
-- the partner-safe planning columns to the session-scoped portal and keep the
-- enforcement ledger/mutation surface private.
alter table public.partner_entitlement enable row level security;

drop policy if exists rcap_onboarding_entitlement_select_partner
  on public.partner_entitlement;
create policy rcap_onboarding_entitlement_select_partner
on public.partner_entitlement
for select
to authenticated
using (partner_slug = public.current_partner_slug());

drop policy if exists rcap_onboarding_entitlement_select_internal
  on public.partner_entitlement;
create policy rcap_onboarding_entitlement_select_internal
on public.partner_entitlement
for select
to authenticated
using (public.is_internal_admin());

revoke all on public.partner_entitlement from anon, authenticated;
grant select (
  partner_slug,
  screenings_allowed,
  screenings_used,
  overage_enabled,
  pause_at_cap
) on public.partner_entitlement to authenticated;

grant select (
  id,
  partner_slug,
  task_key,
  title,
  description,
  status,
  owner,
  required,
  completed_at,
  created_at,
  updated_at
) on public.partner_onboarding_tasks to authenticated;
grant select on public.partner_onboarding_tasks_safe to authenticated;

-- Phase 1 mutations run only through the typed service-role functions in
-- section 10. Authenticated browser roles retain read-only access.

grant select on public.partner_onboarding_sections to authenticated;
-- No authenticated section DML grant is intentional. The server mutation
-- boundary validates canonical field ownership before using its privileged
-- persistence path; a browser session cannot write arbitrary JSON directly.

grant select on public.partner_onboarding_contacts to authenticated;

grant select (
  id,
  workspace_id,
  name,
  work_email,
  requested_role,
  special_permissions,
  training_attendee,
  revision,
  training_status,
  training_completed_at,
  invitation_status,
  membership_status,
  deleted_at,
  created_at,
  updated_at
) on public.partner_onboarding_planned_users to authenticated;

grant select on public.partner_onboarding_report_recipients to authenticated;

grant select (
  id,
  workspace_id,
  section_id,
  status,
  partner_safe_instructions,
  requested_at,
  partner_response,
  responded_at,
  resolved_at,
  created_at,
  updated_at
) on public.partner_onboarding_change_requests to authenticated;
grant select on public.partner_onboarding_change_requests_safe to authenticated;

-- This table has internal-admin-only RLS. Partner sessions receive no rows.
grant select on public.partner_onboarding_change_request_internal_notes
  to authenticated;

grant select (
  id,
  workspace_id,
  category,
  original_filename,
  safe_filename,
  media_type,
  file_extension,
  byte_size,
  width_pixels,
  height_pixels,
  lifecycle_status,
  review_status,
  replaced_by_asset_id,
  uploaded_at,
  deleted_at,
  created_at,
  updated_at
) on public.partner_onboarding_assets to authenticated;
grant select on public.partner_onboarding_assets_safe to authenticated;

grant select (
  id,
  workspace_id,
  agreement_type,
  status,
  is_required,
  partner_safe_detail,
  finalized_asset_id,
  effective_date,
  recorded_at,
  created_at,
  updated_at
) on public.partner_onboarding_agreements to authenticated;
grant select on public.partner_onboarding_agreements_safe to authenticated;

grant select on public.partner_onboarding_authorizations to authenticated;

grant select (
  id,
  workspace_id,
  event_type,
  section_key,
  status_code,
  summary_code,
  owner_type,
  occurred_at,
  created_at
) on public.partner_onboarding_activity to authenticated;

-- Idempotency rows are server-owned. Authenticated browser sessions have no
-- direct table privileges, even though RLS remains enabled as defense in depth.

-------------------------------------------------------------------------------
-- 9. Private Supabase Storage bucket and immutable-ID object policies.
-------------------------------------------------------------------------------

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'rcap-partner-onboarding-private',
  'rcap-partner-onboarding-private',
  false,
  20971520,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table storage.objects enable row level security;

drop policy if exists rcap_onboarding_storage_all_internal
  on storage.objects;

-- Object operations are issued only by the authorized server storage helper as
-- narrow signed operations. Browser JWT roles receive neither object-list nor
-- object-mutation policies for this bucket. Existing global Storage grants and
-- unrelated bucket policies remain untouched.

comment on table public.partner_onboarding_sections is
  'Eight canonical, independently versioned onboarding sections. response_data contains section-owned partner fields only.';
comment on table public.partner_onboarding_change_request_internal_notes is
  'Internal-only notes stored separately so partner-safe projections cannot accidentally expose them.';
comment on table public.partner_onboarding_assets is
  'Private organizational asset metadata. object_path is server-canonical and is never a public URL.';
comment on table public.partner_onboarding_activity is
  'Append-only partner-safe meaningful activity. No questionnaire values or contact PII.';
comment on table public.partner_onboarding_integration_events is
  'Append-only local event ledger only. Phase 1 has no delivery worker, webhook, scheduler, or network dispatch.';

-------------------------------------------------------------------------------
-- 10. Transactional server-only Phase 1 mutation functions.
--
-- These functions are SECURITY INVOKER and executable only by service_role.
-- The HTTP service resolves and revalidates the Supabase session before calling
-- them. Each function independently rechecks the stable actor/partner/workspace
-- relationship and performs CAS + idempotency inside one database transaction.
-- Browser roles retain no direct DML privilege on authoritative response data.
-------------------------------------------------------------------------------

alter table public.partner_onboarding_sections
  add column if not exists review_reason text;

alter table public.partner_onboarding_sections
  drop constraint if exists partner_onboarding_sections_review_reason_check;
alter table public.partner_onboarding_sections
  add constraint partner_onboarding_sections_review_reason_check
    check (review_reason is null or char_length(review_reason) between 1 and 5000);

create or replace function public.rcap_service_assert_partner_actor(
  p_partner_slug text,
  p_actor_user_id uuid,
  p_workspace_id uuid
)
returns void
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if p_partner_slug is null
     or p_actor_user_id is null
     or p_workspace_id is null
     or not exists (
       select 1
       from public.partner_users pu
       join public.partner_onboarding po
         on po.partner_slug = pu.partner_slug
       where pu.auth_user_id = p_actor_user_id
         and pu.partner_slug = p_partner_slug
         and pu.role = 'partner_admin'
         and pu.status = 'active'
         and po.id = p_workspace_id
     ) then
    raise exception using
      errcode = '42501',
      message = 'Active partner administrator does not match onboarding workspace';
  end if;
end;
$$;

create or replace function public.rcap_service_assert_internal_actor(
  p_actor_user_id uuid
)
returns void
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if p_actor_user_id is null
     or not exists (
       select 1
       from public.partner_users pu
       where pu.auth_user_id = p_actor_user_id
         and pu.partner_slug is null
         and pu.role = 'internal_admin'
         and pu.status = 'active'
     ) then
    raise exception using
      errcode = '42501',
      message = 'Active internal administrator is required';
  end if;
end;
$$;

create or replace function public.rcap_service_save_onboarding_section(
  p_partner_slug text,
  p_actor_user_id uuid,
  p_workspace_id uuid,
  p_section_key text,
  p_expected_revision bigint,
  p_expected_workspace_version bigint,
  p_response_data jsonb,
  p_collections jsonb,
  p_mode text,
  p_section_completion integer,
  p_missing_required_keys text[],
  p_workspace_completion integer,
  p_blocker_code text,
  p_next_action_code text,
  p_next_action_owner text,
  p_request_id uuid,
  p_payload_hash text
)
returns table (
  section_revision bigint,
  workspace_aggregate_version bigint,
  section_status text,
  duplicate boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_workspace public.partner_onboarding%rowtype;
  v_section public.partner_onboarding_sections%rowtype;
  v_existing public.partner_onboarding_idempotency%rowtype;
  v_next_status text;
  v_next_revision bigint;
  v_first_started boolean := false;
  v_completed boolean := false;
  v_resubmitted boolean := false;
  v_partner_review_pending boolean := false;
  v_event_type text;
  v_event_summary text;
  v_partner_record_id uuid;
begin
  perform public.rcap_service_assert_partner_actor(
    p_partner_slug, p_actor_user_id, p_workspace_id
  );

  if p_section_key not in (
    'organization_contacts',
    'program_goals',
    'geography_audience_language_accessibility',
    'access_sponsorship_capacity',
    'brand_public_page',
    'staff_dashboard_plan',
    'support_referrals_reporting',
    'review_authorization'
  )
     or p_mode not in ('draft_save', 'section_complete')
     or p_expected_revision < 0
     or p_expected_workspace_version < 1
     or p_response_data is null
     or jsonb_typeof(p_response_data) <> 'object'
     or p_collections is null
     or jsonb_typeof(p_collections) <> 'object'
     or octet_length(p_response_data::text) > 65536
     or p_section_completion not between 0 and 100
     or p_workspace_completion not between 0 and 100
     or p_next_action_owner not in ('partner', 'legalease', 'none')
     or p_payload_hash !~ '^[0-9a-f]{64}$' then
    raise exception using
      errcode = '22023',
      message = 'Invalid onboarding section mutation';
  end if;

  select *
    into v_existing
  from public.partner_onboarding_idempotency i
  where i.request_id = p_request_id
  for update;

  if found then
    if v_existing.workspace_id <> p_workspace_id
       or v_existing.operation_key <> 'section:' || p_section_key
       or v_existing.actor_user_id <> p_actor_user_id
       or v_existing.payload_hash <> p_payload_hash then
      raise exception using
        errcode = '23505',
        message = 'Idempotency request does not match original mutation';
    end if;
    if v_existing.result_status = 'succeeded' then
      return query
      select
        v_existing.result_section_revision,
        v_existing.result_workspace_version,
        coalesce((
          select s.status
          from public.partner_onboarding_sections s
          where s.workspace_id = p_workspace_id
            and s.section_key = p_section_key
        ), 'in_progress'),
        true;
      return;
    end if;
    raise exception using
      errcode = '55000',
      message = 'Idempotent request is still in progress';
  end if;

  select po.*
    into v_workspace
  from public.partner_onboarding po
  where po.id = p_workspace_id
    and po.partner_slug = p_partner_slug
  for update of po;

  if not found then
    raise exception using errcode = 'P0002', message = 'Onboarding workspace not found';
  end if;
  if v_workspace.aggregate_version <> p_expected_workspace_version then
    raise exception using
      errcode = '40001',
      message = 'Onboarding workspace revision conflict';
  end if;
  select coalesce(v_workspace.partner_record_id, pr.id)
    into v_partner_record_id
  from public.partner_records pr
  where pr.partner_slug = p_partner_slug;
  if v_workspace.commercial_gate_status = 'blocked' then
    raise exception using errcode = '55000', message = 'Commercial gate is blocked';
  end if;
  if v_workspace.status not in ('setup_in_progress', 'waiting_on_partner') then
    raise exception using errcode = '55000', message = 'Onboarding workspace is not editable';
  end if;

  insert into public.partner_onboarding_idempotency (
    workspace_id,
    operation_key,
    request_id,
    actor_user_id,
    payload_hash,
    expires_at
  ) values (
    p_workspace_id,
    'section:' || p_section_key,
    p_request_id,
    p_actor_user_id,
    p_payload_hash,
    now() + interval '24 hours'
  );

  select *
    into v_section
  from public.partner_onboarding_sections s
  where s.workspace_id = p_workspace_id
    and s.section_key = p_section_key
  for update;

  if found then
    if v_section.status in ('approved', 'waived', 'not_applicable') then
      raise exception using
        errcode = '42501',
        message = 'Reviewed onboarding section is not partner-editable';
    end if;
    if v_section.revision <> p_expected_revision then
      raise exception using
        errcode = '40001',
        message = 'Onboarding section revision conflict';
    end if;
    v_next_revision := v_section.revision + 1;
    v_first_started := v_section.status = 'not_started';
    v_resubmitted :=
      p_mode = 'section_complete'
      and (
        v_section.status = 'needs_changes'
        or exists (
          select 1
          from public.partner_onboarding_change_requests cr
          where cr.section_id = v_section.id
            and cr.status = 'open'
        )
      );
    v_completed :=
      p_mode = 'section_complete'
      and v_section.status not in ('submitted', 'approved', 'waived', 'not_applicable');
    v_next_status := case
      when p_mode = 'section_complete' then 'submitted'
      when v_section.status = 'needs_changes' then 'in_progress'
      when v_section.status in ('approved', 'waived', 'not_applicable') then v_section.status
      else 'in_progress'
    end;

    update public.partner_onboarding_sections
    set
      response_data = p_response_data,
      revision = v_next_revision,
      status = v_next_status,
      completion_percentage = p_section_completion,
      missing_required_keys = coalesce(p_missing_required_keys, '{}'::text[]),
      first_started_at = coalesce(first_started_at, now()),
      completed_at = case
        when p_mode = 'section_complete' then now()
        else completed_at
      end,
      submitted_at = case
        when p_mode = 'section_complete' then now()
        else submitted_at
      end,
      approved_at = case when v_next_status = 'submitted' then null else approved_at end,
      approved_by = case when v_next_status = 'submitted' then null else approved_by end,
      reviewed_at = case when v_next_status = 'submitted' then null else reviewed_at end,
      reviewed_by = case when v_next_status = 'submitted' then null else reviewed_by end,
      review_reason = case when v_next_status = 'submitted' then null else review_reason end
    where id = v_section.id;
  else
    if p_expected_revision <> 0 then
      raise exception using
        errcode = '40001',
        message = 'Onboarding section revision conflict';
    end if;
    v_next_revision := 1;
    v_first_started := true;
    v_completed := p_mode = 'section_complete';
    v_next_status := case
      when p_mode = 'section_complete' then 'submitted'
      else 'in_progress'
    end;

    insert into public.partner_onboarding_sections (
      workspace_id,
      section_key,
      response_data,
      revision,
      status,
      completion_percentage,
      missing_required_keys,
      first_started_at,
      completed_at,
      submitted_at
    ) values (
      p_workspace_id,
      p_section_key,
      p_response_data,
      v_next_revision,
      v_next_status,
      p_section_completion,
      coalesce(p_missing_required_keys, '{}'::text[]),
      now(),
      case when p_mode = 'section_complete' then now() end,
      case when p_mode = 'section_complete' then now() end
    )
    returning * into v_section;
  end if;

  if p_section_key = 'organization_contacts' then
    if jsonb_typeof(coalesce(p_collections->'contacts', '[]'::jsonb)) <> 'array' then
      raise exception using errcode = '22023', message = 'Contacts must be an array';
    end if;
    if exists (
      select 1
      from jsonb_array_elements(coalesce(p_collections->'contacts', '[]'::jsonb)) item
      join public.partner_onboarding_contacts existing
        on existing.id = (item->>'stable_row_id')::uuid
      where existing.workspace_id <> p_workspace_id
    ) then
      raise exception using errcode = '42501', message = 'Contact identity belongs to another workspace';
    end if;

    update public.partner_onboarding_contacts c
    set deleted_at = now(), revision = c.revision + 1
    where c.workspace_id = p_workspace_id
      and c.deleted_at is null
      and not exists (
        select 1
        from jsonb_array_elements(coalesce(p_collections->'contacts', '[]'::jsonb)) item
        where item->>'stable_row_id' = c.id::text
      );

    insert into public.partner_onboarding_contacts (
      id, workspace_id, role, name, title, organization, work_email, phone
    )
    select
      (item->>'stable_row_id')::uuid,
      p_workspace_id,
      item->>'role',
      item->>'name',
      item->>'title',
      nullif(item->>'organization', ''),
      lower(item->>'work_email'),
      nullif(item->>'phone', '')
    from jsonb_array_elements(coalesce(p_collections->'contacts', '[]'::jsonb)) item
    on conflict (id) do update
    set
      role = excluded.role,
      name = excluded.name,
      title = excluded.title,
      organization = excluded.organization,
      work_email = excluded.work_email,
      phone = excluded.phone,
      revision = public.partner_onboarding_contacts.revision + 1,
      deleted_at = null
    where public.partner_onboarding_contacts.workspace_id = p_workspace_id;
  elsif p_section_key = 'staff_dashboard_plan' then
    if jsonb_typeof(coalesce(p_collections->'planned_users', '[]'::jsonb)) <> 'array' then
      raise exception using errcode = '22023', message = 'Planned users must be an array';
    end if;
    if exists (
      select 1
      from jsonb_array_elements(coalesce(p_collections->'planned_users', '[]'::jsonb)) item
      join public.partner_onboarding_planned_users existing
        on existing.id = (item->>'stable_row_id')::uuid
      where existing.workspace_id <> p_workspace_id
    ) then
      raise exception using errcode = '42501', message = 'Planned user identity belongs to another workspace';
    end if;

    update public.partner_onboarding_planned_users u
    set deleted_at = now(), revision = u.revision + 1
    where u.workspace_id = p_workspace_id
      and u.deleted_at is null
      and not exists (
        select 1
        from jsonb_array_elements(coalesce(p_collections->'planned_users', '[]'::jsonb)) item
        where item->>'stable_row_id' = u.id::text
      );

    insert into public.partner_onboarding_planned_users (
      id,
      workspace_id,
      name,
      work_email,
      requested_role,
      special_permissions,
      training_attendee
    )
    select
      (item->>'stable_row_id')::uuid,
      p_workspace_id,
      item->>'name',
      lower(item->>'work_email'),
      item->>'requested_role',
      coalesce(
        array(
          select jsonb_array_elements_text(
            coalesce(item->'special_permissions', '[]'::jsonb)
          )
        ),
        '{}'::text[]
      ),
      coalesce((item->>'training_attendee')::boolean, false)
    from jsonb_array_elements(coalesce(p_collections->'planned_users', '[]'::jsonb)) item
    on conflict (id) do update
    set
      name = excluded.name,
      work_email = excluded.work_email,
      requested_role = excluded.requested_role,
      special_permissions = excluded.special_permissions,
      training_attendee = excluded.training_attendee,
      revision = public.partner_onboarding_planned_users.revision + 1,
      deleted_at = null
    where public.partner_onboarding_planned_users.workspace_id = p_workspace_id;
  elsif p_section_key = 'support_referrals_reporting' then
    if jsonb_typeof(coalesce(p_collections->'report_recipients', '[]'::jsonb)) <> 'array' then
      raise exception using errcode = '22023', message = 'Report recipients must be an array';
    end if;
    if exists (
      select 1
      from jsonb_array_elements(coalesce(p_collections->'report_recipients', '[]'::jsonb)) item
      join public.partner_onboarding_report_recipients existing
        on existing.id = (item->>'stable_row_id')::uuid
      where existing.workspace_id <> p_workspace_id
    ) then
      raise exception using errcode = '42501', message = 'Report recipient identity belongs to another workspace';
    end if;

    update public.partner_onboarding_report_recipients r
    set deleted_at = now(), revision = r.revision + 1
    where r.workspace_id = p_workspace_id
      and r.deleted_at is null
      and not exists (
        select 1
        from jsonb_array_elements(coalesce(p_collections->'report_recipients', '[]'::jsonb)) item
        where item->>'stable_row_id' = r.id::text
      );

    insert into public.partner_onboarding_report_recipients (
      id, workspace_id, name, work_email
    )
    select
      (item->>'stable_row_id')::uuid,
      p_workspace_id,
      nullif(item->>'name', ''),
      lower(item->>'work_email')
    from jsonb_array_elements(coalesce(p_collections->'report_recipients', '[]'::jsonb)) item
    on conflict (id) do update
    set
      name = excluded.name,
      work_email = excluded.work_email,
      revision = public.partner_onboarding_report_recipients.revision + 1,
      deleted_at = null
    where public.partner_onboarding_report_recipients.workspace_id = p_workspace_id;
  end if;

  if p_mode = 'section_complete' then
    update public.partner_onboarding_change_requests
    set
      status = 'partner_responded',
      partner_response = 'Updated section submitted for review.',
      responded_by = p_actor_user_id,
      responded_at = now(),
      updated_at = now()
    where workspace_id = p_workspace_id
      and section_id = v_section.id
      and status = 'open';

    v_partner_review_pending :=
      v_resubmitted
      and not exists (
        select 1
        from public.partner_onboarding_change_requests cr
        where cr.workspace_id = p_workspace_id
          and cr.status = 'open'
      );
  end if;

  update public.partner_onboarding
  set
    status = case
      when v_partner_review_pending then 'ready_for_review'
      when exists (
        select 1
        from public.partner_onboarding_change_requests cr
        where cr.workspace_id = p_workspace_id
          and cr.status = 'open'
      ) then 'waiting_on_partner'
      when status = 'waiting_on_partner' then 'setup_in_progress'
      else status
    end,
    aggregate_version = aggregate_version + 1,
    completion_percentage = p_workspace_completion,
    blocker_code = case
      when v_partner_review_pending then null
      else p_blocker_code
    end,
    next_action_code = case
      when v_partner_review_pending then 'await_legalease_review'
      else p_next_action_code
    end,
    next_action_owner = case
      when v_partner_review_pending then 'legalease'
      else p_next_action_owner
    end,
    last_meaningful_activity_at = case
      when v_first_started or v_completed or v_resubmitted then now()
      else last_meaningful_activity_at
    end
  where id = p_workspace_id
  returning aggregate_version into workspace_aggregate_version;

  if v_resubmitted then
    v_event_type := 'section_resubmitted';
    v_event_summary := 'section_resubmitted';
  elsif v_completed then
    v_event_type := 'section_completed';
    v_event_summary := 'section_completed';
  elsif v_first_started then
    v_event_type := 'section_started';
    v_event_summary := 'section_started';
  end if;

  if v_event_type is not null then
    insert into public.partner_onboarding_activity (
      workspace_id,
      event_type,
      section_key,
      status_code,
      summary_code,
      owner_type,
      actor_user_id,
      request_id,
      dedupe_key
    ) values (
      p_workspace_id,
      v_event_type,
      p_section_key,
      v_next_status,
      v_event_summary,
      'partner',
      p_actor_user_id,
      p_request_id,
      p_request_id::text || ':' || v_event_type
    )
    on conflict do nothing;

    insert into public.partner_onboarding_integration_events (
      workspace_id,
      partner_record_id,
      event_type,
      workspace_aggregate_version,
      workspace_status,
      completion_percentage,
      blocker_code,
      next_action_code,
      next_action_owner,
      target_launch_date,
      section_key,
      section_status,
      idempotency_key
    )
    select
      po.id,
      v_partner_record_id,
      case
        when p_section_key = 'brand_public_page' then 'rcap_brand_configuration_changed'
        when p_section_key = 'staff_dashboard_plan' then 'rcap_team_configuration_changed'
        when p_blocker_code is not null then 'rcap_onboarding_blocked'
        else 'rcap_onboarding_progressed'
      end,
      po.aggregate_version,
      po.status,
      po.completion_percentage,
      po.blocker_code,
      po.next_action_code,
      po.next_action_owner,
      po.target_launch_date,
      p_section_key,
      v_next_status,
      p_request_id::text || ':progress'
    from public.partner_onboarding po
    where po.id = p_workspace_id
    on conflict do nothing;
  end if;

  update public.partner_onboarding_idempotency
  set
    result_status = 'succeeded',
    result_workspace_version = workspace_aggregate_version,
    result_section_revision = v_next_revision,
    completed_at = now()
  where request_id = p_request_id;

  section_revision := v_next_revision;
  section_status := v_next_status;
  duplicate := false;
  return next;
end;
$$;

create or replace function public.rcap_service_submit_onboarding(
  p_partner_slug text,
  p_actor_user_id uuid,
  p_actor_work_email text,
  p_workspace_id uuid,
  p_expected_workspace_version bigint,
  p_request_id uuid,
  p_payload_hash text,
  p_schema_version text,
  p_authorization jsonb
)
returns table (
  workspace_aggregate_version bigint,
  submitted_at timestamptz,
  duplicate boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_workspace public.partner_onboarding%rowtype;
  v_existing public.partner_onboarding_idempotency%rowtype;
  v_partner_record_id uuid;
begin
  perform public.rcap_service_assert_partner_actor(
    p_partner_slug, p_actor_user_id, p_workspace_id
  );
  if p_authorization is null
     or jsonb_typeof(p_authorization) <> 'object'
     or nullif(lower(btrim(p_actor_work_email)), '') is null
     or char_length(p_actor_work_email) > 254
     or p_payload_hash !~ '^[0-9a-f]{64}$'
     or nullif(btrim(p_schema_version), '') is null then
    raise exception using errcode = '22023', message = 'Invalid onboarding submission';
  end if;

  select *
    into v_existing
  from public.partner_onboarding_idempotency i
  where i.request_id = p_request_id
  for update;
  if found then
    if v_existing.workspace_id <> p_workspace_id
       or v_existing.operation_key <> 'submit'
       or v_existing.actor_user_id <> p_actor_user_id
       or v_existing.payload_hash <> p_payload_hash then
      raise exception using errcode = '23505', message = 'Idempotency request mismatch';
    end if;
    if v_existing.result_status = 'succeeded' then
      return query
      select
        v_existing.result_workspace_version,
        po.submitted_at,
        true
      from public.partner_onboarding po
      where po.id = p_workspace_id;
      return;
    end if;
    raise exception using errcode = '55000', message = 'Idempotent request is still in progress';
  end if;

  select po.*
    into v_workspace
  from public.partner_onboarding po
  where po.id = p_workspace_id
    and po.partner_slug = p_partner_slug
  for update of po;

  if not found then
    raise exception using errcode = 'P0002', message = 'Onboarding workspace not found';
  end if;
  select coalesce(v_workspace.partner_record_id, pr.id)
    into v_partner_record_id
  from public.partner_records pr
  where pr.partner_slug = p_partner_slug;
  if v_workspace.aggregate_version <> p_expected_workspace_version then
    raise exception using errcode = '40001', message = 'Onboarding workspace revision conflict';
  end if;
  if v_workspace.commercial_gate_status = 'blocked' then
    raise exception using errcode = '55000', message = 'Commercial gate is blocked';
  end if;
  if v_workspace.status <> 'setup_in_progress' then
    raise exception using errcode = '55000', message = 'Workspace is not ready for partner submission';
  end if;
  if (
    select count(*)
    from public.partner_onboarding_sections s
    where s.workspace_id = p_workspace_id
      and (
        s.status in ('submitted', 'approved', 'waived', 'not_applicable')
        and (
          s.completion_percentage = 100
          or s.status in ('waived', 'not_applicable')
        )
      )
  ) <> 8 then
    raise exception using errcode = '55000', message = 'Active partner requirements are incomplete';
  end if;
  if exists (
    select 1
    from public.partner_onboarding_change_requests cr
    where cr.workspace_id = p_workspace_id
      and cr.status in ('open', 'partner_responded')
  ) then
    raise exception using errcode = '55000', message = 'Requested changes remain unresolved';
  end if;
  if not exists (
    select 1
    from public.partner_onboarding_assets a
    where a.workspace_id = p_workspace_id
      and a.category = 'transparent_logo'
      and a.deleted_at is null
      and a.lifecycle_status in ('pending_review', 'active')
  ) then
    raise exception using errcode = '55000', message = 'Required organizational asset is missing';
  end if;

  insert into public.partner_onboarding_idempotency (
    workspace_id,
    operation_key,
    request_id,
    actor_user_id,
    payload_hash,
    expires_at
  ) values (
    p_workspace_id,
    'submit',
    p_request_id,
    p_actor_user_id,
    p_payload_hash,
    now() + interval '24 hours'
  );

  insert into public.partner_onboarding_authorizations (
    workspace_id,
    organization_information_accurate,
    program_scope_approved_for_configuration,
    brand_assets_authorized_for_use,
    no_eligibility_or_outcome_guarantee_understood,
    contested_and_representation_matters_follow_escalation_plan,
    dashboard_users_authorized,
    legalease_may_prepare_draft_implementation_materials,
    approver_name,
    approver_title,
    approver_user_id,
    approver_work_email,
    authorization_timestamp,
    terms_or_schema_version,
    request_id
  ) values (
    p_workspace_id,
    coalesce((p_authorization->>'organization_information_accurate')::boolean, false),
    coalesce((p_authorization->>'program_scope_approved_for_configuration')::boolean, false),
    coalesce((p_authorization->>'brand_assets_authorized_for_use')::boolean, false),
    coalesce((p_authorization->>'no_eligibility_or_outcome_guarantee_understood')::boolean, false),
    coalesce((p_authorization->>'contested_and_representation_matters_follow_escalation_plan')::boolean, false),
    coalesce((p_authorization->>'dashboard_users_authorized')::boolean, false),
    coalesce((p_authorization->>'legalease_may_prepare_draft_implementation_materials')::boolean, false),
    p_authorization->>'approver_name',
    p_authorization->>'approver_title',
    p_actor_user_id,
    lower(btrim(p_actor_work_email)),
    now(),
    p_schema_version,
    p_request_id
  );

  update public.partner_onboarding
  set
    status = 'ready_for_review',
    aggregate_version = aggregate_version + 1,
    blocker_code = null,
    next_action_code = 'await_legalease_review',
    next_action_owner = 'legalease',
    submitted_at = now(),
    submitted_by = p_actor_user_id,
    submission_request_id = p_request_id,
    submitted_schema_version = p_schema_version,
    last_meaningful_activity_at = now()
  where id = p_workspace_id
  returning aggregate_version, partner_onboarding.submitted_at
    into workspace_aggregate_version, submitted_at;

  insert into public.partner_onboarding_activity (
    workspace_id,
    event_type,
    status_code,
    summary_code,
    owner_type,
    actor_user_id,
    request_id,
    dedupe_key
  ) values (
    p_workspace_id,
    'onboarding_submitted',
    'ready_for_review',
    'onboarding_submitted',
    'partner',
    p_actor_user_id,
    p_request_id,
    p_request_id::text || ':submitted'
  )
  on conflict do nothing;

  insert into public.partner_onboarding_integration_events (
    workspace_id,
    partner_record_id,
    event_type,
    workspace_aggregate_version,
    workspace_status,
    completion_percentage,
    blocker_code,
    next_action_code,
    next_action_owner,
    target_launch_date,
    idempotency_key
  )
  select
    po.id,
    v_partner_record_id,
    'rcap_onboarding_submitted',
    po.aggregate_version,
    po.status,
    po.completion_percentage,
    po.blocker_code,
    po.next_action_code,
    po.next_action_owner,
    po.target_launch_date,
    p_request_id::text || ':submitted'
  from public.partner_onboarding po
  where po.id = p_workspace_id
  on conflict do nothing;

  update public.partner_onboarding_idempotency
  set
    result_status = 'succeeded',
    result_workspace_version = workspace_aggregate_version,
    completed_at = now()
  where request_id = p_request_id;

  duplicate := false;
  return next;
end;
$$;

create or replace function public.rcap_service_create_onboarding_workspace(
  p_partner_slug text,
  p_actor_user_id uuid,
  p_request_id uuid,
  p_target_launch_date date,
  p_schema_version text,
  p_payload_hash text
)
returns table (
  workspace_id uuid,
  workspace_status text,
  created boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_partner public.partner_records%rowtype;
  v_workspace public.partner_onboarding%rowtype;
  v_existing public.partner_onboarding_idempotency%rowtype;
  v_created boolean := false;
  v_gate text;
  v_status text;
begin
  perform public.rcap_service_assert_internal_actor(p_actor_user_id);
  if nullif(btrim(p_partner_slug), '') is null
     or nullif(btrim(p_schema_version), '') is null
     or p_payload_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid workspace creation request';
  end if;

  select *
    into v_partner
  from public.partner_records pr
  where pr.partner_slug = p_partner_slug
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Partner not found';
  end if;

  select *
    into v_existing
  from public.partner_onboarding_idempotency i
  where i.request_id = p_request_id
  for update;
  if found then
    if v_existing.operation_key <> 'workspace:create:' || p_partner_slug
       or v_existing.actor_user_id <> p_actor_user_id
       or v_existing.payload_hash <> p_payload_hash then
      raise exception using errcode = '23505', message = 'Idempotency request mismatch';
    end if;
    return query
    select
      po.id,
      po.status,
      false
    from public.partner_onboarding po
    where po.id = v_existing.workspace_id;
    return;
  end if;

  select *
    into v_workspace
  from public.partner_onboarding po
  where po.partner_slug = p_partner_slug
  for update;

  v_gate := case
    when v_partner.payment_status = 'paid' then 'cleared_by_paid_invoice'
    else 'blocked'
  end;
  v_status := case
    when v_gate = 'blocked' then 'commercially_blocked'
    else 'setup_in_progress'
  end;

  if not found then
    insert into public.partner_onboarding (
      partner_slug,
      partner_record_id,
      status,
      schema_version,
      aggregate_version,
      completion_percentage,
      blocker_code,
      next_action_code,
      next_action_owner,
      target_launch_date,
      target_launch_date_reason,
      target_launch_date_changed_at,
      target_launch_date_changed_by,
      commercial_gate_status,
      commercial_gate_evidence_reference,
      commercial_gate_changed_at,
      commercial_gate_changed_by,
      last_meaningful_activity_at
    ) values (
      p_partner_slug,
      v_partner.id,
      v_status,
      p_schema_version,
      1,
      0,
      case when v_gate = 'blocked' then 'commercial_gate_blocked' end,
      case
        when v_gate = 'blocked' then 'complete_commercial_requirements'
        else 'complete_section'
      end,
      'partner',
      p_target_launch_date,
      case
        when p_target_launch_date is not null then 'Set during workspace creation.'
        else null
      end,
      case when p_target_launch_date is not null then now() else null end,
      case when p_target_launch_date is not null then p_actor_user_id else null end,
      v_gate,
      case
        when v_gate = 'cleared_by_paid_invoice'
          then 'partner_record:' || v_partner.id::text
        else null
      end,
      now(),
      p_actor_user_id,
      now()
    )
    returning * into v_workspace;
    v_created := true;
  else
    update public.partner_onboarding
    set
      partner_record_id = v_partner.id,
      schema_version = p_schema_version,
      target_launch_date = coalesce(p_target_launch_date, target_launch_date),
      target_launch_date_reason = case
        when p_target_launch_date is not null then 'Set during workspace creation.'
        else target_launch_date_reason
      end,
      target_launch_date_changed_at = case
        when p_target_launch_date is not null then now()
        else target_launch_date_changed_at
      end,
      target_launch_date_changed_by = case
        when p_target_launch_date is not null then p_actor_user_id
        else target_launch_date_changed_by
      end,
      status = case
        when status in ('draft', 'commercially_blocked') then v_status
        else status
      end,
      commercial_gate_status = case
        when status in ('draft', 'commercially_blocked')
             or commercial_gate_changed_at is null then v_gate
        else commercial_gate_status
      end,
      commercial_gate_evidence_reference = case
        when status in ('draft', 'commercially_blocked')
             and v_gate = 'cleared_by_paid_invoice'
          then 'partner_record:' || v_partner.id::text
        when commercial_gate_changed_at is null
             and v_gate = 'cleared_by_paid_invoice'
          then 'partner_record:' || v_partner.id::text
        when status in ('draft', 'commercially_blocked') then null
        when commercial_gate_changed_at is null then null
        else commercial_gate_evidence_reference
      end,
      blocker_code = case
        when (
          status in ('draft', 'commercially_blocked')
          or commercial_gate_changed_at is null
        ) and v_gate = 'blocked'
          then 'commercial_gate_blocked'
        when status in ('live', 'paused', 'closed', 'ready_for_review', 'ready_to_launch')
             and commercial_gate_changed_at is null then null
        when status in ('draft', 'commercially_blocked')
             or commercial_gate_changed_at is null
          then 'required_section_incomplete'
        else blocker_code
      end,
      next_action_code = case
        when (
          status in ('draft', 'commercially_blocked')
          or commercial_gate_changed_at is null
        ) and v_gate = 'blocked'
          then 'complete_commercial_requirements'
        when status = 'ready_for_review'
             and commercial_gate_changed_at is null
          then 'await_legalease_review'
        when status = 'ready_to_launch'
             and commercial_gate_changed_at is null
          then 'prepare_for_launch'
        when status = 'live'
             and commercial_gate_changed_at is null
          then 'program_live'
        when status = 'paused'
             and commercial_gate_changed_at is null
          then 'program_paused'
        when status = 'closed'
             and commercial_gate_changed_at is null
          then 'onboarding_closed'
        when status in ('draft', 'commercially_blocked')
             or commercial_gate_changed_at is null
          then 'complete_section'
        else next_action_code
      end,
      next_action_owner = case
        when (
          status in ('draft', 'commercially_blocked')
          or commercial_gate_changed_at is null
        ) and v_gate = 'blocked'
          then 'partner'
        when status in ('ready_for_review', 'ready_to_launch', 'paused')
             and commercial_gate_changed_at is null
          then 'legalease'
        when status in ('live', 'closed')
             and commercial_gate_changed_at is null
          then 'none'
        when status in ('draft', 'commercially_blocked')
             or commercial_gate_changed_at is null
          then 'partner'
        else next_action_owner
      end,
      commercial_gate_changed_at = case
        when status in ('draft', 'commercially_blocked')
             or commercial_gate_changed_at is null then now()
        else commercial_gate_changed_at
      end,
      commercial_gate_changed_by = case
        when status in ('draft', 'commercially_blocked')
             or commercial_gate_changed_at is null then p_actor_user_id
        else commercial_gate_changed_by
      end,
      aggregate_version = aggregate_version + 1,
      last_meaningful_activity_at = coalesce(last_meaningful_activity_at, now())
    where id = v_workspace.id
    returning * into v_workspace;
  end if;

  insert into public.partner_onboarding_sections (
    workspace_id,
    section_key,
    response_data,
    revision,
    status,
    completion_percentage,
    missing_required_keys
  )
  select
    v_workspace.id,
    section_key,
    '{}'::jsonb,
    1,
    'not_started',
    0,
    '{}'::text[]
  from unnest(array[
    'organization_contacts',
    'program_goals',
    'geography_audience_language_accessibility',
    'access_sponsorship_capacity',
    'brand_public_page',
    'staff_dashboard_plan',
    'support_referrals_reporting',
    'review_authorization'
  ]::text[]) section_key
  on conflict on constraint partner_onboarding_sections_workspace_key_unique
  do nothing;

  insert into public.partner_onboarding_idempotency (
    workspace_id,
    operation_key,
    request_id,
    actor_user_id,
    payload_hash,
    result_status,
    result_workspace_version,
    expires_at,
    completed_at
  ) values (
    v_workspace.id,
    'workspace:create:' || p_partner_slug,
    p_request_id,
    p_actor_user_id,
    p_payload_hash,
    'succeeded',
    v_workspace.aggregate_version,
    now() + interval '24 hours',
    now()
  );

  insert into public.partner_onboarding_activity (
    workspace_id,
    event_type,
    status_code,
    summary_code,
    owner_type,
    actor_user_id,
    request_id,
    dedupe_key
  ) values (
    v_workspace.id,
    'workspace_created',
    v_workspace.status,
    'workspace_created',
    'legalease',
    p_actor_user_id,
    p_request_id,
    'workspace-created'
  )
  on conflict do nothing;

  insert into public.partner_onboarding_integration_events (
    workspace_id,
    partner_record_id,
    event_type,
    workspace_aggregate_version,
    workspace_status,
    completion_percentage,
    blocker_code,
    next_action_code,
    next_action_owner,
    target_launch_date,
    idempotency_key
  ) values (
    v_workspace.id,
    v_partner.id,
    'rcap_partner_workspace_created',
    v_workspace.aggregate_version,
    v_workspace.status,
    v_workspace.completion_percentage,
    v_workspace.blocker_code,
    v_workspace.next_action_code,
    v_workspace.next_action_owner,
    v_workspace.target_launch_date,
    p_request_id::text || ':workspace-created'
  )
  on conflict do nothing;

  workspace_id := v_workspace.id;
  workspace_status := v_workspace.status;
  created := v_created;
  return next;
end;
$$;

create or replace function public.rcap_service_review_onboarding(
  p_partner_slug text,
  p_actor_user_id uuid,
  p_workspace_id uuid,
  p_expected_workspace_version bigint,
  p_request_id uuid,
  p_payload_hash text,
  p_operation jsonb
)
returns table (
  workspace_aggregate_version bigint,
  workspace_status text,
  duplicate boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_workspace public.partner_onboarding%rowtype;
  v_existing public.partner_onboarding_idempotency%rowtype;
  v_section public.partner_onboarding_sections%rowtype;
  v_action text;
  v_section_key text;
  v_reason text;
  v_partner_record_id uuid;
  v_partner_payment_status text;
  v_activity_type text;
  v_activity_summary text;
  v_event_type text := 'rcap_onboarding_progressed';
  v_derived_completion integer;
  v_derived_blocker text;
  v_derived_next_action text;
  v_derived_next_owner text;
begin
  perform public.rcap_service_assert_internal_actor(p_actor_user_id);
  if p_operation is null
     or jsonb_typeof(p_operation) <> 'object'
     or p_payload_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid review operation';
  end if;
  v_action := p_operation->>'action';
  if v_action not in (
    'target_launch_date',
    'commercial_gate',
    'agreement',
    'request_changes',
    'approve_section',
    'waive_section',
    'ready_for_launch',
    'close'
  ) then
    raise exception using errcode = '22023', message = 'Unknown review operation';
  end if;

  select *
    into v_existing
  from public.partner_onboarding_idempotency i
  where i.request_id = p_request_id
  for update;
  if found then
    if v_existing.workspace_id <> p_workspace_id
       or v_existing.operation_key <> 'review:' || v_action
       or v_existing.actor_user_id <> p_actor_user_id
       or v_existing.payload_hash <> p_payload_hash then
      raise exception using errcode = '23505', message = 'Idempotency request mismatch';
    end if;
    if v_existing.result_status = 'succeeded' then
      return query
      select
        v_existing.result_workspace_version,
        po.status,
        true
      from public.partner_onboarding po
      where po.id = p_workspace_id;
      return;
    end if;
    raise exception using errcode = '55000', message = 'Idempotent request is still in progress';
  end if;

  select *
    into v_workspace
  from public.partner_onboarding po
  where po.id = p_workspace_id
    and po.partner_slug = p_partner_slug
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Onboarding workspace not found';
  end if;
  if v_workspace.aggregate_version <> p_expected_workspace_version then
    raise exception using errcode = '40001', message = 'Onboarding workspace revision conflict';
  end if;
  select
    coalesce(v_workspace.partner_record_id, pr.id),
    pr.payment_status
    into v_partner_record_id, v_partner_payment_status
  from public.partner_records pr
  where pr.partner_slug = p_partner_slug;

  insert into public.partner_onboarding_idempotency (
    workspace_id,
    operation_key,
    request_id,
    actor_user_id,
    payload_hash,
    expires_at
  ) values (
    p_workspace_id,
    'review:' || v_action,
    p_request_id,
    p_actor_user_id,
    p_payload_hash,
    now() + interval '24 hours'
  );

  if v_action = 'target_launch_date' then
    v_reason := nullif(btrim(p_operation->>'reason'), '');
    if v_reason is null or char_length(v_reason) > 5000 then
      raise exception using errcode = '22023', message = 'Target-date reason is required';
    end if;
    update public.partner_onboarding
    set
      target_launch_date = nullif(p_operation->>'targetLaunchDate', '')::date,
      target_launch_date_reason = v_reason,
      target_launch_date_changed_at = now(),
      target_launch_date_changed_by = p_actor_user_id
    where id = p_workspace_id;
  elsif v_action = 'commercial_gate' then
    if p_operation->>'outcome' not in (
      'blocked',
      'cleared_by_paid_invoice',
      'cleared_by_approved_purchase_order',
      'cleared_by_authorized_internal_override'
    ) then
      raise exception using errcode = '22023', message = 'Invalid commercial gate outcome';
    end if;
    if (
      p_operation->>'outcome' = 'cleared_by_approved_purchase_order'
      and nullif(btrim(p_operation->>'evidenceReference'), '') is null
    ) then
      raise exception using errcode = '22023', message = 'Commercial evidence reference is required';
    end if;
    if p_operation->>'outcome' = 'cleared_by_paid_invoice'
       and v_partner_payment_status <> 'paid' then
      raise exception using
        errcode = '23514',
        message = 'Paid-invoice outcome requires authoritative paid partner status';
    end if;
    if p_operation->>'outcome' = 'cleared_by_authorized_internal_override'
       and nullif(btrim(p_operation->>'overrideReason'), '') is null then
      raise exception using errcode = '22023', message = 'Commercial override reason is required';
    end if;
    if coalesce(char_length(p_operation->>'evidenceReference'), 0) > 500
       or coalesce(char_length(p_operation->>'overrideReason'), 0) > 5000 then
      raise exception using errcode = '22023', message = 'Commercial evidence is too long';
    end if;
    if jsonb_typeof(p_operation->'systemDerived') <> 'object' then
      raise exception using
        errcode = '22023',
        message = 'Server-derived commercial summary is required';
    end if;
    v_derived_completion :=
      (p_operation->'systemDerived'->>'completionPercentage')::integer;
    v_derived_blocker :=
      nullif(p_operation->'systemDerived'->>'blockerCode', '');
    v_derived_next_action :=
      nullif(p_operation->'systemDerived'->>'nextActionCode', '');
    v_derived_next_owner :=
      nullif(p_operation->'systemDerived'->>'nextActionOwner', '');
    if v_derived_completion not between 0 and 100
       or v_derived_next_action is null
       or v_derived_next_owner not in ('partner', 'legalease', 'none')
       or (
         v_derived_blocker is not null
         and v_derived_blocker !~ '^[a-z0-9_]{1,120}$'
       )
       or v_derived_next_action !~ '^[a-z0-9_]{1,120}$' then
      raise exception using
        errcode = '22023',
        message = 'Server-derived commercial summary is invalid';
    end if;
    update public.partner_onboarding
    set
      commercial_gate_status = p_operation->>'outcome',
      commercial_gate_evidence_reference = case
        when p_operation->>'outcome' = 'cleared_by_paid_invoice'
          then 'partner_record:' || v_partner_record_id::text
        else nullif(btrim(p_operation->>'evidenceReference'), '')
      end,
      commercial_gate_override_reason = case
        when p_operation->>'outcome' = 'cleared_by_authorized_internal_override'
          then nullif(btrim(p_operation->>'overrideReason'), '')
        else null
      end,
      commercial_gate_changed_at = now(),
      commercial_gate_changed_by = p_actor_user_id,
      status = case
        when p_operation->>'outcome' = 'blocked'
          and status in ('draft', 'setup_in_progress') then 'commercially_blocked'
        when p_operation->>'outcome' <> 'blocked'
          and status in ('draft', 'commercially_blocked') then 'setup_in_progress'
        else status
      end,
      completion_percentage = v_derived_completion,
      blocker_code = v_derived_blocker,
      next_action_code = v_derived_next_action,
      next_action_owner = v_derived_next_owner
    where id = p_workspace_id;
    v_activity_type := 'commercial_gate_changed';
    v_activity_summary := 'commercial_gate_changed';
    v_event_type := 'rcap_commercial_gate_changed';
  elsif v_action = 'agreement' then
    if p_operation->>'agreementType' not in (
      'order_form',
      'master_services_agreement',
      'data_privacy_security_addendum',
      'procurement_requirements'
    )
       or p_operation->>'status' not in (
         'not_required',
         'not_started',
         'requested',
         'under_review',
         'finalized',
         'executed',
         'approved',
         'waived'
       ) then
      raise exception using errcode = '22023', message = 'Invalid agreement metadata';
    end if;
    if jsonb_typeof(p_operation->'systemDerived') <> 'object' then
      raise exception using
        errcode = '22023',
        message = 'Server-derived agreement summary is required';
    end if;
    v_derived_completion :=
      (p_operation->'systemDerived'->>'completionPercentage')::integer;
    v_derived_blocker :=
      nullif(p_operation->'systemDerived'->>'blockerCode', '');
    v_derived_next_action :=
      nullif(p_operation->'systemDerived'->>'nextActionCode', '');
    v_derived_next_owner :=
      nullif(p_operation->'systemDerived'->>'nextActionOwner', '');
    if v_derived_completion not between 0 and 100
       or v_derived_next_action is null
       or v_derived_next_owner not in ('partner', 'legalease', 'none')
       or (
         v_derived_blocker is not null
         and v_derived_blocker !~ '^[a-z0-9_]{1,120}$'
       )
       or v_derived_next_action !~ '^[a-z0-9_]{1,120}$' then
      raise exception using
        errcode = '22023',
        message = 'Server-derived agreement summary is invalid';
    end if;
    if nullif(p_operation->>'finalizedAssetId', '') is not null
       and p_operation->>'status' not in ('finalized', 'executed', 'approved') then
      raise exception using
        errcode = '22023',
        message = 'A finalized agreement document requires a finalized partner-safe status';
    end if;
    if nullif(p_operation->>'finalizedAssetId', '') is not null then
      update public.partner_onboarding_assets
      set
        lifecycle_status = 'active',
        review_status = 'approved',
        review_reason = 'authorized_as_finalized_agreement_document',
        updated_at = now()
      where id = (p_operation->>'finalizedAssetId')::uuid
        and workspace_id = p_workspace_id
        and deleted_at is null
        and lifecycle_status in ('pending_review', 'active')
        and media_type in (
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );
      if not found then
        raise exception using
          errcode = '23514',
          message = 'Finalized agreement document is not an eligible private workspace asset';
      end if;
    end if;
    insert into public.partner_onboarding_agreements (
      workspace_id,
      agreement_type,
      status,
      is_required,
      partner_safe_detail,
      finalized_asset_id,
      effective_date,
      recorded_by,
      recorded_at
    ) values (
      p_workspace_id,
      p_operation->>'agreementType',
      p_operation->>'status',
      coalesce((p_operation->>'required')::boolean, false),
      nullif(btrim(p_operation->>'partnerSafeDetail'), ''),
      nullif(p_operation->>'finalizedAssetId', '')::uuid,
      nullif(p_operation->>'effectiveDate', '')::date,
      p_actor_user_id,
      now()
    )
    on conflict (workspace_id, agreement_type) do update
    set
      status = excluded.status,
      is_required = excluded.is_required,
      partner_safe_detail = excluded.partner_safe_detail,
      finalized_asset_id = excluded.finalized_asset_id,
      effective_date = excluded.effective_date,
      recorded_by = excluded.recorded_by,
      recorded_at = excluded.recorded_at;
    update public.partner_onboarding
    set
      completion_percentage = v_derived_completion,
      blocker_code = v_derived_blocker,
      next_action_code = v_derived_next_action,
      next_action_owner = v_derived_next_owner
    where id = p_workspace_id;
  elsif v_action in ('request_changes', 'approve_section', 'waive_section') then
    v_section_key := p_operation->>'sectionKey';
    if v_section_key not in (
      'organization_contacts',
      'program_goals',
      'geography_audience_language_accessibility',
      'access_sponsorship_capacity',
      'brand_public_page',
      'staff_dashboard_plan',
      'support_referrals_reporting',
      'review_authorization'
    ) then
      raise exception using errcode = '22023', message = 'Invalid section review key';
    end if;
    select *
      into v_section
    from public.partner_onboarding_sections s
    where s.workspace_id = p_workspace_id
      and s.section_key = v_section_key
    for update;
    if not found then
      raise exception using errcode = 'P0002', message = 'Onboarding section not found';
    end if;

    if v_action = 'request_changes' then
      v_reason := nullif(btrim(p_operation->>'instructions'), '');
      if v_workspace.status <> 'ready_for_review'
         or v_reason is null
         or char_length(v_reason) > 5000 then
        raise exception using errcode = '55000', message = 'Partner-safe change request is invalid';
      end if;
      update public.partner_onboarding_sections
      set
        revision = revision + 1,
        status = 'needs_changes',
        reviewed_at = now(),
        reviewed_by = p_actor_user_id,
        review_reason = v_reason
      where id = v_section.id;
      update public.partner_onboarding_change_requests
      set
        status = 'resolved',
        resolved_by = p_actor_user_id,
        resolved_at = now(),
        resolution_reason = 'Additional changes requested by LegalEase.',
        updated_at = now()
      where section_id = v_section.id
        and status = 'partner_responded';
      insert into public.partner_onboarding_change_requests (
        workspace_id,
        section_id,
        status,
        partner_safe_instructions,
        requested_by
      ) values (
        p_workspace_id,
        v_section.id,
        'open',
        v_reason,
        p_actor_user_id
      );
      update public.partner_onboarding
      set
        status = 'waiting_on_partner',
        blocker_code = 'partner_changes_requested',
        next_action_code = 'address_change_request',
        next_action_owner = 'partner'
      where id = p_workspace_id;
      v_activity_type := 'section_change_requested';
      v_activity_summary := 'section_change_requested';
    else
      v_reason := nullif(btrim(p_operation->>'reason'), '');
      if v_reason is null or char_length(v_reason) > 5000 then
        raise exception using errcode = '22023', message = 'Section review reason is required';
      end if;
      if v_action = 'approve_section' and v_section.status not in ('submitted', 'needs_changes') then
        raise exception using errcode = '55000', message = 'Section is not ready for approval';
      end if;
      update public.partner_onboarding_sections
      set
        revision = revision + 1,
        status = case
          when v_action = 'approve_section' then 'approved'
          else 'waived'
        end,
        approved_at = case
          when v_action = 'approve_section' then now()
          else approved_at
        end,
        approved_by = case
          when v_action = 'approve_section' then p_actor_user_id
          else approved_by
        end,
        waived_at = case
          when v_action = 'waive_section' then now()
          else waived_at
        end,
        waived_by = case
          when v_action = 'waive_section' then p_actor_user_id
          else waived_by
        end,
        waiver_reason = case
          when v_action = 'waive_section' then v_reason
          else waiver_reason
        end,
        reviewed_at = now(),
        reviewed_by = p_actor_user_id,
        review_reason = v_reason
      where id = v_section.id;
      update public.partner_onboarding_change_requests
      set
        status = 'resolved',
        resolved_by = p_actor_user_id,
        resolved_at = now(),
        resolution_reason = v_reason,
        updated_at = now()
      where section_id = v_section.id
        and status in ('open', 'partner_responded');
      update public.partner_onboarding
      set
        status = case
          when exists (
            select 1
            from public.partner_onboarding_change_requests cr
            where cr.workspace_id = p_workspace_id
              and cr.status = 'open'
          ) then 'waiting_on_partner'
          else 'ready_for_review'
        end,
        blocker_code = case
          when exists (
            select 1
            from public.partner_onboarding_change_requests cr
            where cr.workspace_id = p_workspace_id
              and cr.status = 'open'
          ) then 'partner_changes_requested'
          else null
        end,
        next_action_code = case
          when exists (
            select 1
            from public.partner_onboarding_change_requests cr
            where cr.workspace_id = p_workspace_id
              and cr.status = 'open'
          ) then 'address_change_request'
          else 'await_legalease_review'
        end,
        next_action_owner = case
          when exists (
            select 1
            from public.partner_onboarding_change_requests cr
            where cr.workspace_id = p_workspace_id
              and cr.status = 'open'
          ) then 'partner'
          else 'legalease'
        end
      where id = p_workspace_id;
      v_activity_type := case
        when v_action = 'approve_section' then 'section_approved'
        else 'section_waived'
      end;
      v_activity_summary := v_activity_type;
    end if;
    v_event_type := 'rcap_section_review_changed';
  elsif v_action = 'ready_for_launch' then
    v_reason := nullif(btrim(p_operation->>'reason'), '');
    if v_reason is null
       or char_length(v_reason) > 5000
       or v_workspace.status <> 'ready_for_review'
       or v_workspace.commercial_gate_status = 'blocked'
       or exists (
         select 1
         from public.partner_onboarding_change_requests cr
         where cr.workspace_id = p_workspace_id
           and cr.status in ('open', 'partner_responded')
       )
       or (
         select count(*)
         from public.partner_onboarding_sections s
         where s.workspace_id = p_workspace_id
           and s.status in ('approved', 'waived', 'not_applicable')
       ) <> 8 then
      raise exception using errcode = '55000', message = 'Workspace is not approved for launch preparation';
    end if;
    update public.partner_onboarding
    set
      status = 'ready_to_launch',
      blocker_code = null,
      next_action_code = 'prepare_for_launch',
      next_action_owner = 'legalease',
      internal_approved_at = now(),
      internal_approved_by = p_actor_user_id,
      internal_approval_reason = v_reason
    where id = p_workspace_id;
    v_activity_type := 'ready_for_launch_decided';
    v_activity_summary := 'ready_for_launch_decided';
    v_event_type := 'rcap_section_review_changed';
  elsif v_action = 'close' then
    v_reason := nullif(btrim(p_operation->>'reason'), '');
    if v_reason is null
       or char_length(v_reason) > 5000
       or v_workspace.status not in (
         'draft',
         'commercially_blocked',
         'setup_in_progress',
         'waiting_on_partner',
         'ready_for_review',
         'ready_to_launch'
       ) then
      raise exception using errcode = '55000', message = 'Workspace cannot be closed';
    end if;
    update public.partner_onboarding
    set
      status = 'closed',
      blocker_code = null,
      next_action_code = 'onboarding_closed',
      next_action_owner = 'none',
      closed_at = now(),
      closed_by = p_actor_user_id,
      closed_reason = v_reason
    where id = p_workspace_id;
  end if;

  update public.partner_onboarding
  set
    aggregate_version = aggregate_version + 1,
    last_meaningful_activity_at = case
      when v_activity_type is not null then now()
      else last_meaningful_activity_at
    end
  where id = p_workspace_id
  returning aggregate_version, status
    into workspace_aggregate_version, workspace_status;

  if v_activity_type is not null then
    insert into public.partner_onboarding_activity (
      workspace_id,
      event_type,
      section_key,
      status_code,
      summary_code,
      owner_type,
      actor_user_id,
      request_id,
      dedupe_key
    ) values (
      p_workspace_id,
      v_activity_type,
      v_section_key,
      workspace_status,
      v_activity_summary,
      'legalease',
      p_actor_user_id,
      p_request_id,
      p_request_id::text || ':' || v_activity_type
    )
    on conflict do nothing;
  end if;

  insert into public.partner_onboarding_integration_events (
    workspace_id,
    partner_record_id,
    event_type,
    workspace_aggregate_version,
    workspace_status,
    completion_percentage,
    blocker_code,
    next_action_code,
    next_action_owner,
    target_launch_date,
    section_key,
    section_status,
    idempotency_key
  )
  select
    po.id,
    v_partner_record_id,
    v_event_type,
    po.aggregate_version,
    po.status,
    po.completion_percentage,
    po.blocker_code,
    po.next_action_code,
    po.next_action_owner,
    po.target_launch_date,
    v_section_key,
    case when v_section_key is null then null else (
      select s.status
      from public.partner_onboarding_sections s
      where s.workspace_id = po.id
        and s.section_key = v_section_key
    ) end,
    p_request_id::text || ':review'
  from public.partner_onboarding po
  where po.id = p_workspace_id
  on conflict do nothing;

  update public.partner_onboarding_idempotency
  set
    result_status = 'succeeded',
    result_workspace_version = workspace_aggregate_version,
    completed_at = now()
  where request_id = p_request_id;

  duplicate := false;
  return next;
end;
$$;

create or replace function public.rcap_service_record_onboarding_asset(
  p_partner_slug text,
  p_actor_user_id uuid,
  p_workspace_id uuid,
  p_asset_id uuid,
  p_expected_workspace_version bigint,
  p_category text,
  p_object_path text,
  p_original_filename text,
  p_safe_filename text,
  p_media_type text,
  p_file_extension text,
  p_byte_size bigint,
  p_width_pixels integer,
  p_height_pixels integer,
  p_sha256_hex text,
  p_payload_hash text,
  p_workspace_completion integer,
  p_blocker_code text,
  p_next_action_code text,
  p_next_action_owner text,
  p_request_id uuid
)
returns table (
  asset_id uuid,
  superseded_object_path text,
  workspace_aggregate_version bigint,
  duplicate boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_workspace public.partner_onboarding%rowtype;
  v_existing_asset public.partner_onboarding_assets%rowtype;
  v_existing_request public.partner_onboarding_idempotency%rowtype;
  v_partner_record_id uuid;
begin
  perform public.rcap_service_assert_partner_actor(
    p_partner_slug, p_actor_user_id, p_workspace_id
  );
  if p_category not in (
    'transparent_logo',
    'brand_guide',
    'hero_or_community_image',
    'organizer_or_program_lead_image',
    'approved_partner_description_attachment',
    'procurement_document',
    'other_approved_organizational_asset'
  )
     or p_expected_workspace_version < 1
     or p_sha256_hex !~ '^[0-9a-f]{64}$'
     or p_payload_hash !~ '^[0-9a-f]{64}$'
     or p_workspace_completion not between 0 and 100
     or p_next_action_owner not in ('partner', 'legalease', 'none') then
    raise exception using errcode = '22023', message = 'Invalid organizational asset metadata';
  end if;

  select *
    into v_existing_request
  from public.partner_onboarding_idempotency i
  where i.request_id = p_request_id
  for update;
  if found then
    if v_existing_request.workspace_id <> p_workspace_id
       or v_existing_request.operation_key <> 'asset:record:' || p_category
       or v_existing_request.actor_user_id <> p_actor_user_id
       or v_existing_request.payload_hash <> p_payload_hash then
      raise exception using errcode = '23505', message = 'Idempotency request mismatch';
    end if;
    if v_existing_request.result_status = 'succeeded' then
      return query
      select
        a.id,
        null::text,
        v_existing_request.result_workspace_version,
        true
      from public.partner_onboarding_assets a
      where a.id = p_asset_id
        and a.workspace_id = p_workspace_id;
      return;
    end if;
    raise exception using errcode = '55000', message = 'Idempotent request is still in progress';
  end if;

  select *
    into v_workspace
  from public.partner_onboarding po
  where po.id = p_workspace_id
    and po.partner_slug = p_partner_slug
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Onboarding workspace not found';
  end if;
  if v_workspace.aggregate_version <> p_expected_workspace_version then
    raise exception using
      errcode = '40001',
      message = 'Onboarding workspace revision conflict';
  end if;
  if v_workspace.commercial_gate_status = 'blocked'
     or v_workspace.status not in ('setup_in_progress', 'waiting_on_partner') then
    raise exception using errcode = '55000', message = 'Workspace is not editable';
  end if;
  select coalesce(v_workspace.partner_record_id, pr.id)
    into v_partner_record_id
  from public.partner_records pr
  where pr.partner_slug = p_partner_slug;

  insert into public.partner_onboarding_idempotency (
    workspace_id,
    operation_key,
    request_id,
    actor_user_id,
    payload_hash,
    expires_at
  ) values (
    p_workspace_id,
    'asset:record:' || p_category,
    p_request_id,
    p_actor_user_id,
    p_payload_hash,
    now() + interval '24 hours'
  );

  select *
    into v_existing_asset
  from public.partner_onboarding_assets a
  where a.workspace_id = p_workspace_id
    and a.category = p_category
    and a.deleted_at is null
    and a.lifecycle_status in ('pending_review', 'active')
  for update;

  if found then
    if exists (
      select 1
      from public.partner_onboarding_agreements agreement
      where agreement.finalized_asset_id = v_existing_asset.id
    ) then
      raise exception using
        errcode = '55000',
        message = 'A finalized agreement document cannot be replaced';
    end if;
    update public.partner_onboarding_assets
    set
      lifecycle_status = 'superseded',
      updated_at = now()
    where id = v_existing_asset.id;
  end if;

  insert into public.partner_onboarding_assets (
    id,
    workspace_id,
    partner_record_id,
    category,
    object_path,
    original_filename,
    safe_filename,
    media_type,
    file_extension,
    byte_size,
    width_pixels,
    height_pixels,
    sha256_hex,
    lifecycle_status,
    review_status,
    uploaded_by
  ) values (
    p_asset_id,
    p_workspace_id,
    v_partner_record_id,
    p_category,
    p_object_path,
    p_original_filename,
    p_safe_filename,
    p_media_type,
    p_file_extension,
    p_byte_size,
    p_width_pixels,
    p_height_pixels,
    p_sha256_hex,
    'pending_review',
    'pending',
    p_actor_user_id
  );

  if v_existing_asset.id is not null then
    update public.partner_onboarding_assets
    set replaced_by_asset_id = p_asset_id
    where id = v_existing_asset.id;
  end if;

  update public.partner_onboarding
  set
    aggregate_version = aggregate_version + 1,
    completion_percentage = p_workspace_completion,
    blocker_code = p_blocker_code,
    next_action_code = p_next_action_code,
    next_action_owner = p_next_action_owner,
    last_meaningful_activity_at = now()
  where id = p_workspace_id
  returning aggregate_version into workspace_aggregate_version;

  insert into public.partner_onboarding_activity (
    workspace_id,
    event_type,
    section_key,
    status_code,
    summary_code,
    owner_type,
    actor_user_id,
    request_id,
    dedupe_key
  ) values (
    p_workspace_id,
    case
      when v_existing_asset.id is null then 'required_asset_uploaded'
      else 'required_asset_replaced'
    end,
    'brand_public_page',
    'pending_review',
    case
      when v_existing_asset.id is null then 'required_asset_uploaded'
      else 'required_asset_replaced'
    end,
    'partner',
    p_actor_user_id,
    p_request_id,
    p_request_id::text || ':asset-record'
  )
  on conflict do nothing;

  insert into public.partner_onboarding_integration_events (
    workspace_id,
    partner_record_id,
    event_type,
    workspace_aggregate_version,
    workspace_status,
    completion_percentage,
    blocker_code,
    next_action_code,
    next_action_owner,
    target_launch_date,
    section_key,
    artifact_category,
    artifact_status,
    idempotency_key
  )
  select
    po.id,
    v_partner_record_id,
    'rcap_brand_configuration_changed',
    po.aggregate_version,
    po.status,
    po.completion_percentage,
    po.blocker_code,
    po.next_action_code,
    po.next_action_owner,
    po.target_launch_date,
    'brand_public_page',
    p_category,
    'pending_review',
    p_request_id::text || ':asset-record'
  from public.partner_onboarding po
  where po.id = p_workspace_id
  on conflict do nothing;

  update public.partner_onboarding_idempotency
  set
    result_status = 'succeeded',
    result_workspace_version = workspace_aggregate_version,
    completed_at = now()
  where request_id = p_request_id;

  asset_id := p_asset_id;
  superseded_object_path := v_existing_asset.object_path;
  duplicate := false;
  return next;
end;
$$;

create or replace function public.rcap_service_delete_onboarding_asset(
  p_partner_slug text,
  p_actor_user_id uuid,
  p_workspace_id uuid,
  p_asset_id uuid,
  p_expected_workspace_version bigint,
  p_payload_hash text,
  p_workspace_completion integer,
  p_blocker_code text,
  p_next_action_code text,
  p_next_action_owner text,
  p_request_id uuid
)
returns table (
  object_path text,
  workspace_aggregate_version bigint,
  duplicate boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_workspace public.partner_onboarding%rowtype;
  v_asset public.partner_onboarding_assets%rowtype;
  v_existing public.partner_onboarding_idempotency%rowtype;
  v_partner_record_id uuid;
begin
  perform public.rcap_service_assert_partner_actor(
    p_partner_slug, p_actor_user_id, p_workspace_id
  );
  if p_expected_workspace_version < 1
     or p_payload_hash !~ '^[0-9a-f]{64}$'
     or p_workspace_completion not between 0 and 100
     or p_next_action_owner not in ('partner', 'legalease', 'none') then
    raise exception using
      errcode = '22023',
      message = 'Invalid organizational asset deletion summary';
  end if;

  select *
    into v_existing
  from public.partner_onboarding_idempotency i
  where i.request_id = p_request_id
  for update;
  if found then
    if v_existing.workspace_id <> p_workspace_id
       or v_existing.operation_key <> 'asset:delete'
       or v_existing.actor_user_id <> p_actor_user_id
       or v_existing.payload_hash <> p_payload_hash then
      raise exception using errcode = '23505', message = 'Idempotency request mismatch';
    end if;
    return query
    select
      a.object_path,
      v_existing.result_workspace_version,
      true
    from public.partner_onboarding_assets a
    where a.id = p_asset_id
      and a.workspace_id = p_workspace_id;
    return;
  end if;

  select *
    into v_workspace
  from public.partner_onboarding po
  where po.id = p_workspace_id
    and po.partner_slug = p_partner_slug
  for update;
  if not found
     or v_workspace.commercial_gate_status = 'blocked'
     or v_workspace.status not in ('setup_in_progress', 'waiting_on_partner') then
    raise exception using errcode = '55000', message = 'Workspace is not editable';
  end if;
  if v_workspace.aggregate_version <> p_expected_workspace_version then
    raise exception using
      errcode = '40001',
      message = 'Onboarding workspace revision conflict';
  end if;
  select coalesce(v_workspace.partner_record_id, pr.id)
    into v_partner_record_id
  from public.partner_records pr
  where pr.partner_slug = p_partner_slug;

  select *
    into v_asset
  from public.partner_onboarding_assets a
  where a.id = p_asset_id
    and a.workspace_id = p_workspace_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Organizational asset not found';
  end if;
  if exists (
    select 1
    from public.partner_onboarding_agreements agreement
    where agreement.finalized_asset_id = v_asset.id
  ) then
    raise exception using
      errcode = '55000',
      message = 'A finalized agreement document cannot be removed';
  end if;

  insert into public.partner_onboarding_idempotency (
    workspace_id,
    operation_key,
    request_id,
    actor_user_id,
    payload_hash,
    expires_at
  ) values (
    p_workspace_id,
    'asset:delete',
    p_request_id,
    p_actor_user_id,
    p_payload_hash,
    now() + interval '24 hours'
  );

  if v_asset.deleted_at is null then
    update public.partner_onboarding_assets
    set
      lifecycle_status = 'deleted',
      deleted_by = p_actor_user_id,
      deleted_at = now(),
      deletion_reason = 'partner_removed',
      updated_at = now()
    where id = p_asset_id;

    update public.partner_onboarding
    set
      aggregate_version = aggregate_version + 1,
      completion_percentage = p_workspace_completion,
      blocker_code = p_blocker_code,
      next_action_code = p_next_action_code,
      next_action_owner = p_next_action_owner,
      last_meaningful_activity_at = now()
    where id = p_workspace_id
    returning aggregate_version into workspace_aggregate_version;

    insert into public.partner_onboarding_activity (
      workspace_id,
      event_type,
      section_key,
      status_code,
      summary_code,
      owner_type,
      actor_user_id,
      request_id,
      dedupe_key
    ) values (
      p_workspace_id,
      'required_asset_deleted',
      'brand_public_page',
      'deleted',
      'required_asset_deleted',
      'partner',
      p_actor_user_id,
      p_request_id,
      p_request_id::text || ':asset-delete'
    )
    on conflict do nothing;

    insert into public.partner_onboarding_integration_events (
      workspace_id,
      partner_record_id,
      event_type,
      workspace_aggregate_version,
      workspace_status,
      completion_percentage,
      blocker_code,
      next_action_code,
      next_action_owner,
      target_launch_date,
      section_key,
      artifact_category,
      artifact_status,
      idempotency_key
    )
    select
      po.id,
      v_partner_record_id,
      'rcap_brand_configuration_changed',
      po.aggregate_version,
      po.status,
      po.completion_percentage,
      po.blocker_code,
      po.next_action_code,
      po.next_action_owner,
      po.target_launch_date,
      'brand_public_page',
      v_asset.category,
      'deleted',
      p_request_id::text || ':asset-delete'
    from public.partner_onboarding po
    where po.id = p_workspace_id
    on conflict do nothing;
  else
    workspace_aggregate_version := v_workspace.aggregate_version;
  end if;

  update public.partner_onboarding_idempotency
  set
    result_status = 'succeeded',
    result_workspace_version = workspace_aggregate_version,
    completed_at = now()
  where request_id = p_request_id;

  object_path := v_asset.object_path;
  duplicate := v_asset.deleted_at is not null;
  return next;
end;
$$;

revoke all on function public.rcap_service_assert_partner_actor(text, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.rcap_service_assert_internal_actor(uuid)
  from public, anon, authenticated;
revoke all on function public.rcap_service_save_onboarding_section(
  text, uuid, uuid, text, bigint, bigint, jsonb, jsonb, text, integer, text[],
  integer, text, text, text, uuid, text
) from public, anon, authenticated;
revoke all on function public.rcap_service_submit_onboarding(
  text, uuid, text, uuid, bigint, uuid, text, text, jsonb
) from public, anon, authenticated;
revoke all on function public.rcap_service_create_onboarding_workspace(
  text, uuid, uuid, date, text, text
) from public, anon, authenticated;
revoke all on function public.rcap_service_review_onboarding(
  text, uuid, uuid, bigint, uuid, text, jsonb
) from public, anon, authenticated;
revoke all on function public.rcap_service_record_onboarding_asset(
  text, uuid, uuid, uuid, bigint, text, text, text, text, text, text, bigint,
  integer, integer, text, text, integer, text, text, text, uuid
) from public, anon, authenticated;
revoke all on function public.rcap_service_delete_onboarding_asset(
  text, uuid, uuid, uuid, bigint, text, integer, text, text, text, uuid
) from public, anon, authenticated;

grant execute on function public.rcap_service_assert_partner_actor(text, uuid, uuid)
  to service_role;
grant execute on function public.rcap_service_assert_internal_actor(uuid)
  to service_role;
grant execute on function public.rcap_service_save_onboarding_section(
  text, uuid, uuid, text, bigint, bigint, jsonb, jsonb, text, integer, text[],
  integer, text, text, text, uuid, text
) to service_role;
grant execute on function public.rcap_service_submit_onboarding(
  text, uuid, text, uuid, bigint, uuid, text, text, jsonb
) to service_role;
grant execute on function public.rcap_service_create_onboarding_workspace(
  text, uuid, uuid, date, text, text
) to service_role;
grant execute on function public.rcap_service_review_onboarding(
  text, uuid, uuid, bigint, uuid, text, jsonb
) to service_role;
grant execute on function public.rcap_service_record_onboarding_asset(
  text, uuid, uuid, uuid, bigint, text, text, text, text, text, text, bigint,
  integer, integer, text, text, integer, text, text, text, uuid
) to service_role;
grant execute on function public.rcap_service_delete_onboarding_asset(
  text, uuid, uuid, uuid, bigint, text, integer, text, text, text, uuid
) to service_role;

grant select on public.partner_records, public.partner_users,
  public.partner_entitlement to service_role;
grant select, insert, update on public.partner_onboarding to service_role;
grant select, insert, update on public.partner_onboarding_sections to service_role;
grant select, insert, update on public.partner_onboarding_contacts to service_role;
grant select, insert, update on public.partner_onboarding_planned_users to service_role;
grant select, insert, update on public.partner_onboarding_report_recipients to service_role;
grant select, insert, update on public.partner_onboarding_change_requests to service_role;
grant select, insert, update on public.partner_onboarding_assets to service_role;
grant select, insert, update on public.partner_onboarding_agreements to service_role;
grant select, insert on public.partner_onboarding_authorizations to service_role;
grant select, insert on public.partner_onboarding_activity to service_role;
grant select, insert on public.partner_onboarding_integration_events to service_role;
grant select, insert, update on public.partner_onboarding_idempotency to service_role;
