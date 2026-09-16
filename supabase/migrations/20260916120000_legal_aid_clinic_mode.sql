-- Legal Aid Clinic Mode: a second partner experience on the existing Clinic
-- Mode foundation. Standard Clinic Mode is unchanged by default: every new
-- column defaults to the standard behaviour, no existing RPC is redefined, and
-- the new records, predicates and RPCs are additive.
--
-- What this adds, in order:
--   1. versioned, partner-approved policy profiles that events pin;
--   2. event configuration for the legal-aid experience (registration window,
--      appointment policy, participant cost note) and a publication guard;
--   3. wider staff assignments (coordinator, intake review, program review,
--      attorney, notary, export) on the existing per-event permissions array;
--   4. clinic registrations with atomic capacity and idempotent submission;
--   5. confidential intakes, restricted (encrypted) fields, signatures bound to
--      the exact answer version, supporting documents, information requests,
--      review decisions, document execution tasks, next steps, case-file
--      exports and an access audit;
--   6. RLS, least-privilege grants and security-definer RPCs in the same shape
--      as the existing clinic_* controls.
--
-- Participant references are nullable and `on delete set null`, with a keyed
-- pseudonym captured at creation, so a participant account erasure keeps
-- working while the partner's separately authorised case file survives.

begin;

-- ---------------------------------------------------------------------------
-- 1. Policy profiles
-- ---------------------------------------------------------------------------

create table public.legal_aid_policy_profiles (
  id uuid primary key default gen_random_uuid(),
  partner_slug text not null references public.partner_records(partner_slug) on delete restrict,
  version integer not null check (version >= 1),
  status text not null default 'draft' check (status in ('draft','approved','retired')),
  intake_schema_version text not null check (length(trim(intake_schema_version)) between 1 and 80),
  profile jsonb not null default '{}'::jsonb check (jsonb_typeof(profile) = 'object'),
  prepared_by uuid not null references auth.users(id) on delete restrict,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  approval_note text check (approval_note is null or length(approval_note) <= 2000),
  retired_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (partner_slug, version),
  check (status <> 'approved' or (approved_at is not null and approved_by is not null)),
  check ((status = 'retired') = (retired_at is not null))
);

create index legal_aid_policy_profiles_partner_status_idx
  on public.legal_aid_policy_profiles(partner_slug, status, version desc);

-- ---------------------------------------------------------------------------
-- 2. Event configuration for the legal-aid experience
-- ---------------------------------------------------------------------------

alter table public.clinic_events
  add column experience text not null default 'standard' check (experience in ('standard','legal_aid')),
  add column policy_profile_id uuid references public.legal_aid_policy_profiles(id) on delete restrict,
  add column registration_opens_at timestamptz,
  add column registration_closes_at timestamptz,
  add column appointment_policy text not null default 'walk_in' check (appointment_policy in ('walk_in','appointment','mixed')),
  add column participant_cost_note text check (participant_cost_note is null or length(participant_cost_note) <= 1500),
  add column public_description text check (public_description is null or length(public_description) <= 3000);

alter table public.clinic_events
  add constraint clinic_events_registration_window_check
    check (registration_opens_at is null or registration_closes_at is null or registration_closes_at > registration_opens_at),
  add constraint clinic_events_legal_aid_profile_check
    check (experience <> 'legal_aid' or policy_profile_id is not null);

-- A legal-aid event may only be published while it pins an approved profile of
-- its own partner. Standard events never enter this branch.
create or replace function public.legal_aid_guard_event_publication()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if new.experience = 'legal_aid' and new.status = 'published'
     and (old.status is distinct from 'published' or old.policy_profile_id is distinct from new.policy_profile_id) then
    if not exists (
      select 1 from public.legal_aid_policy_profiles p
      where p.id = new.policy_profile_id and p.partner_slug = new.partner_slug and p.status = 'approved'
    ) then
      raise exception 'legal_aid_policy_profile_not_approved';
    end if;
  end if;
  return new;
end $$;

create trigger legal_aid_guard_event_publication
  before update on public.clinic_events
  for each row execute function public.legal_aid_guard_event_publication();

-- ---------------------------------------------------------------------------
-- 3. Wider per-event staff assignments and audit targets
-- ---------------------------------------------------------------------------

alter table public.clinic_event_staff drop constraint clinic_event_staff_permissions_check;
alter table public.clinic_event_staff add constraint clinic_event_staff_permissions_check
  check (permissions <@ array[
    'assist','queue','follow_up','reporting','incident',
    'coordinator','intake_review','program_review','attorney','notary','export'
  ]::text[]);

alter table public.clinic_event_audit drop constraint clinic_event_audit_target_type_check;
alter table public.clinic_event_audit add constraint clinic_event_audit_target_type_check
  check (target_type in (
    'event','staff','access_code','assisted_session','case','follow_up','incident','packet_reservation',
    'policy_profile','registration','intake','document','document_task','next_step','export'
  ));

-- ---------------------------------------------------------------------------
-- 4. Registrations
-- ---------------------------------------------------------------------------

create table public.clinic_registrations (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.clinic_events(id) on delete restrict,
  participant_user_id uuid references auth.users(id) on delete set null,
  participant_pseudonym text not null check (participant_pseudonym ~ '^[0-9a-f]{64}$'),
  status text not null default 'received' check (status in ('received','confirmed','waitlisted','cancelled','declined')),
  contact_name text not null check (length(trim(contact_name)) between 2 and 160),
  contact_email text check (contact_email is null or length(contact_email) between 3 and 254),
  contact_phone text check (contact_phone is null or length(contact_phone) between 7 and 40),
  preferred_contact text not null check (preferred_contact in ('email','phone','text','either')),
  language_preference text check (language_preference is null or length(language_preference) <= 80),
  assistance_needs text check (assistance_needs is null or length(assistance_needs) <= 1000),
  source text not null default 'public_web' check (source in ('public_web','staff_assisted')),
  assisted_by_event_staff_id uuid references public.clinic_event_staff(id) on delete set null,
  idempotency_key text not null check (length(idempotency_key) between 8 and 120),
  confirmed_at timestamptz,
  waitlisted_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, participant_pseudonym),
  unique (event_id, idempotency_key),
  check (contact_email is not null or contact_phone is not null),
  check ((status = 'cancelled') = (cancelled_at is not null)),
  check (status <> 'waitlisted' or waitlisted_at is not null)
);

create index clinic_registrations_event_status_idx on public.clinic_registrations(event_id, status, created_at);
create index clinic_registrations_participant_idx on public.clinic_registrations(participant_user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 5. Intakes and everything attached to them
-- ---------------------------------------------------------------------------

create table public.legal_aid_intakes (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.clinic_events(id) on delete restrict,
  registration_id uuid references public.clinic_registrations(id) on delete set null,
  participant_user_id uuid references auth.users(id) on delete set null,
  participant_pseudonym text not null check (participant_pseudonym ~ '^[0-9a-f]{64}$'),
  partner_slug text not null references public.partner_records(partner_slug) on delete restrict,
  policy_profile_id uuid not null references public.legal_aid_policy_profiles(id) on delete restrict,
  intake_schema_version text not null check (length(trim(intake_schema_version)) between 1 and 80),
  status text not null default 'draft' check (status in (
    'draft','submitted','needs_information','staff_review','approved','declined_for_program','referred','withdrawn'
  )),
  answers jsonb not null default '{}'::jsonb check (jsonb_typeof(answers) = 'object'),
  answers_hash text check (answers_hash is null or answers_hash ~ '^[0-9a-f]{64}$'),
  current_version integer not null default 1 check (current_version >= 1),
  submitted_version integer,
  submitted_at timestamptz,
  clinic_case_id uuid references public.clinic_cases(id) on delete set null,
  legal_matter text check (legal_matter is null or legal_matter in ('felony_expungement','misdemeanor_expungement')),
  external_case_reference text check (external_case_reference is null or length(external_case_reference) <= 120),
  program_decision text check (program_decision is null or program_decision in ('approved','declined_for_program','referred')),
  attorney_review_status text not null default 'not_started' check (attorney_review_status in ('not_started','assigned','in_review','reviewed')),
  withdrawn_at timestamptz,
  last_activity_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, participant_pseudonym),
  check (status <> 'draft' or submitted_at is null),
  check (status in ('draft','withdrawn') or submitted_at is not null),
  check ((status = 'withdrawn') = (withdrawn_at is not null))
);

create index legal_aid_intakes_event_status_idx on public.legal_aid_intakes(event_id, status, last_activity_at desc);
create index legal_aid_intakes_participant_idx on public.legal_aid_intakes(participant_user_id, created_at desc);

-- Restricted values are encrypted by the application before they reach the
-- database; the database stores ciphertext, the key version and a display
-- hint only. Nothing here can be read by a browser role.
create table public.legal_aid_restricted_fields (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid not null references public.legal_aid_intakes(id) on delete cascade,
  field_key text not null check (field_key in ('ssn')),
  ciphertext text not null check (length(ciphertext) between 16 and 4096),
  key_version text not null check (length(trim(key_version)) between 1 and 40),
  display_hint text check (display_hint is null or length(display_hint) <= 8),
  updated_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (intake_id, field_key)
);

create table public.legal_aid_intake_signatures (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid not null references public.legal_aid_intakes(id) on delete cascade,
  statement_key text not null check (statement_key in (
    'financial_attestation','citizenship_attestation','noncitizen_review_acknowledgment','information_sharing_consent'
  )),
  statement_version text not null check (length(trim(statement_version)) between 1 and 40),
  statement_hash text not null check (statement_hash ~ '^[0-9a-f]{64}$'),
  answers_hash text not null check (answers_hash ~ '^[0-9a-f]{64}$'),
  answers_version integer not null check (answers_version >= 1),
  signer_user_id uuid references auth.users(id) on delete set null,
  signer_name text not null check (length(trim(signer_name)) between 2 and 160),
  signature_method text not null check (signature_method in ('typed','drawn')),
  signature_data text check (signature_data is null or length(signature_data) <= 60000),
  signed_at timestamptz not null default now(),
  status text not null default 'active' check (status in ('active','superseded')),
  superseded_at timestamptz,
  superseded_reason text check (superseded_reason is null or superseded_reason in ('answers_changed','re_signed','withdrawn')),
  created_at timestamptz not null default now(),
  check ((status = 'superseded') = (superseded_at is not null))
);

create index legal_aid_intake_signatures_intake_idx on public.legal_aid_intake_signatures(intake_id, statement_key, status);

create table public.legal_aid_documents (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid not null references public.legal_aid_intakes(id) on delete restrict,
  category text not null check (category in ('identification','court_record','income','executed_document','other')),
  storage_path text not null unique check (length(storage_path) between 20 and 400),
  original_filename text not null check (length(original_filename) between 1 and 255),
  content_type text not null check (content_type in ('application/pdf','image/jpeg','image/png','image/webp')),
  size_bytes integer not null check (size_bytes > 0 and size_bytes <= 20971520),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_role text not null check (uploaded_role in ('participant','staff')),
  removed_at timestamptz,
  removed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index legal_aid_documents_intake_idx on public.legal_aid_documents(intake_id, category, created_at desc);

create table public.legal_aid_information_requests (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid not null references public.legal_aid_intakes(id) on delete cascade,
  requested_by uuid not null references auth.users(id) on delete restrict,
  request_text text not null check (length(trim(request_text)) between 3 and 1200),
  status text not null default 'open' check (status in ('open','fulfilled','withdrawn')),
  fulfilled_at timestamptz,
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'fulfilled') = (fulfilled_at is not null)),
  check ((status = 'withdrawn') = (withdrawn_at is not null))
);

create index legal_aid_information_requests_intake_idx on public.legal_aid_information_requests(intake_id, status);

create table public.legal_aid_review_decisions (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid not null references public.legal_aid_intakes(id) on delete restrict,
  decision_type text not null check (decision_type in ('program_eligibility','attorney_review','conflict_engagement')),
  outcome text not null check (outcome in ('needs_information','approved','declined_for_program','referred','accepted','not_accepted','reviewed')),
  rationale text not null check (length(trim(rationale)) between 3 and 4000),
  policy_basis text check (policy_basis is null or length(policy_basis) <= 400),
  evidence jsonb not null default '{}'::jsonb check (jsonb_typeof(evidence) = 'object'),
  reviewer_user_id uuid not null references auth.users(id) on delete restrict,
  reviewer_permission text not null check (reviewer_permission in ('program_review','attorney','coordinator','partner_admin','internal_admin')),
  policy_profile_id uuid not null references public.legal_aid_policy_profiles(id) on delete restrict,
  answers_hash text check (answers_hash is null or answers_hash ~ '^[0-9a-f]{64}$'),
  decided_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (decision_type <> 'program_eligibility' or outcome in ('needs_information','approved','declined_for_program','referred')),
  check (decision_type <> 'attorney_review' or outcome in ('needs_information','reviewed')),
  check (decision_type <> 'conflict_engagement' or outcome in ('accepted','not_accepted'))
);

create index legal_aid_review_decisions_intake_idx on public.legal_aid_review_decisions(intake_id, decided_at desc);

create table public.legal_aid_document_tasks (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid not null references public.legal_aid_intakes(id) on delete restrict,
  clinic_case_id uuid references public.clinic_cases(id) on delete set null,
  matter_id uuid references public.consumer_briefcase_items(id) on delete set null,
  document_key text not null check (length(trim(document_key)) between 2 and 120),
  title text not null check (length(trim(title)) between 3 and 200),
  required_signer text not null check (required_signer in ('applicant','attorney','notary','clerk','applicant_and_notary')),
  execution_method text not null check (execution_method in (
    'wet_signature','notary_acknowledgment','notary_jurat','clerk_verification','no_signature_required'
  )),
  authority_note text check (authority_note is null or length(authority_note) <= 600),
  template_version text check (template_version is null or length(template_version) <= 80),
  status text not null default 'draft' check (status in (
    'draft','attorney_reviewed','ready_for_execution','signature_or_notary_pending',
    'executed_copy_received','execution_reviewed','ready_to_file','filed'
  )),
  unsigned_artifact_sha256 text check (unsigned_artifact_sha256 is null or unsigned_artifact_sha256 ~ '^[0-9a-f]{64}$'),
  unsigned_render_job_id uuid references public.packet_render_jobs(id) on delete set null,
  executed_document_id uuid references public.legal_aid_documents(id) on delete set null,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  filed_at timestamptz,
  filing_note text check (filing_note is null or length(filing_note) <= 1200),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status not in ('executed_copy_received','execution_reviewed','ready_to_file','filed') or executed_document_id is not null),
  check ((status = 'filed') = (filed_at is not null))
);

create index legal_aid_document_tasks_intake_idx on public.legal_aid_document_tasks(intake_id, status);

create table public.legal_aid_next_steps (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid not null references public.legal_aid_intakes(id) on delete cascade,
  title text not null check (length(trim(title)) between 3 and 160),
  detail text check (detail is null or length(detail) <= 1200),
  status text not null default 'pending' check (status in ('pending','done','cancelled')),
  due_at timestamptz,
  owner_event_staff_id uuid references public.clinic_event_staff(id) on delete set null,
  created_by uuid not null references auth.users(id) on delete restrict,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'done') = (completed_at is not null))
);

create index legal_aid_next_steps_intake_idx on public.legal_aid_next_steps(intake_id, status, due_at);

create table public.legal_aid_case_exports (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid not null references public.legal_aid_intakes(id) on delete restrict,
  exported_by uuid not null references auth.users(id) on delete restrict,
  export_version integer not null check (export_version >= 1),
  sha256 text not null check (sha256 ~ '^[0-9a-f]{64}$'),
  storage_path text not null check (length(storage_path) between 20 and 400),
  includes_restricted boolean not null default false,
  recipient_note text check (recipient_note is null or length(recipient_note) <= 600),
  created_at timestamptz not null default now()
);

create index legal_aid_case_exports_intake_idx on public.legal_aid_case_exports(intake_id, export_version desc);

create table public.legal_aid_access_audit (
  id uuid primary key default gen_random_uuid(),
  intake_id uuid not null references public.legal_aid_intakes(id) on delete restrict,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (action in (
    'intake_viewed','restricted_written','restricted_revealed','document_downloaded','export_created','export_downloaded'
  )),
  field_key text check (field_key is null or length(field_key) <= 40),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  occurred_at timestamptz not null default now()
);

create index legal_aid_access_audit_intake_idx on public.legal_aid_access_audit(intake_id, occurred_at desc);

create trigger legal_aid_access_audit_append_only
  before update or delete on public.legal_aid_access_audit
  for each row execute function public.clinic_guard_append_only();

create trigger legal_aid_policy_profiles_updated_at before update on public.legal_aid_policy_profiles for each row execute function public.clinic_set_updated_at();
create trigger clinic_registrations_updated_at before update on public.clinic_registrations for each row execute function public.clinic_set_updated_at();
create trigger legal_aid_intakes_updated_at before update on public.legal_aid_intakes for each row execute function public.clinic_set_updated_at();
create trigger legal_aid_restricted_fields_updated_at before update on public.legal_aid_restricted_fields for each row execute function public.clinic_set_updated_at();
create trigger legal_aid_documents_updated_at before update on public.legal_aid_documents for each row execute function public.clinic_set_updated_at();
create trigger legal_aid_information_requests_updated_at before update on public.legal_aid_information_requests for each row execute function public.clinic_set_updated_at();
create trigger legal_aid_document_tasks_updated_at before update on public.legal_aid_document_tasks for each row execute function public.clinic_set_updated_at();
create trigger legal_aid_next_steps_updated_at before update on public.legal_aid_next_steps for each row execute function public.clinic_set_updated_at();

-- ---------------------------------------------------------------------------
-- 6. Predicates
-- ---------------------------------------------------------------------------

-- Effective legal-aid permissions of an actor on an intake. Partner
-- administrators and internal administrators carry every permission on their
-- tenant; everyone else carries exactly the approved per-event assignments.
create or replace function public.legal_aid_actor_permissions(p_intake_id uuid, p_actor_user_id uuid)
returns text[] language sql stable security definer set search_path = ''
as $$
  select coalesce((
    select case
      when exists (
        select 1 from public.legal_aid_intakes i
        join public.partner_users pu on pu.auth_user_id = p_actor_user_id and pu.status = 'active'
        where i.id = p_intake_id and (
          (pu.role = 'internal_admin' and pu.partner_slug is null)
          or (pu.role = 'partner_admin' and pu.partner_slug = i.partner_slug)
        )
      ) then array['coordinator','intake_review','program_review','attorney','notary','follow_up','reporting','export','queue','assist']::text[]
      else (
        select s.permissions
        from public.legal_aid_intakes i
        join public.clinic_event_staff s on s.event_id = i.event_id and s.status = 'approved'
        join public.partner_users pu on pu.id = s.partner_user_id and pu.status = 'active'
        join public.clinic_events e on e.id = i.event_id and e.partner_slug = pu.partner_slug
        where i.id = p_intake_id and pu.auth_user_id = p_actor_user_id
        limit 1
      )
    end
  ), array[]::text[])
$$;

create or replace function public.legal_aid_actor_can_intake(p_intake_id uuid, p_actor_user_id uuid, p_permission text)
returns boolean language sql stable security definer set search_path = ''
as $$
  select p_permission = any(public.legal_aid_actor_permissions(p_intake_id, p_actor_user_id))
$$;

create or replace function public.legal_aid_is_intake_participant(p_intake_id uuid, p_actor_user_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.legal_aid_intakes i
    where i.id = p_intake_id and i.participant_user_id = p_actor_user_id and p_actor_user_id is not null
  )
$$;

-- Browser-role (auth.uid()) form of the review predicate for RLS.
create or replace function public.legal_aid_can_review_intake(p_intake_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.legal_aid_actor_permissions(p_intake_id, auth.uid())
    && array['coordinator','intake_review','program_review','attorney']::text[]
$$;

create or replace function public.legal_aid_audit(
  p_event_id uuid, p_actor_user_id uuid, p_action text, p_target_type text, p_target_id uuid, p_metadata jsonb
) returns void language sql security definer set search_path = ''
as $$
  insert into public.clinic_event_audit(event_id, actor_user_id, action, target_type, target_id, metadata)
  values (p_event_id, p_actor_user_id, p_action, p_target_type, p_target_id, coalesce(p_metadata, '{}'::jsonb))
$$;

-- ---------------------------------------------------------------------------
-- 7. Policy profile and event configuration RPCs
-- ---------------------------------------------------------------------------

create or replace function public.legal_aid_prepare_policy_profile(
  p_actor_user_id uuid, p_partner_slug text, p_intake_schema_version text, p_profile jsonb
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_id uuid; v_version integer;
begin
  if not exists (
    select 1 from public.partner_users pu
    where pu.auth_user_id = p_actor_user_id and pu.status = 'active' and (
      (pu.role = 'internal_admin' and pu.partner_slug is null) or (pu.role = 'partner_admin' and pu.partner_slug = p_partner_slug)
    )
  ) then raise exception 'legal_aid_profile_forbidden'; end if;
  if p_profile is null or jsonb_typeof(p_profile) <> 'object' then raise exception 'legal_aid_profile_invalid'; end if;
  select coalesce(max(version), 0) + 1 into v_version from public.legal_aid_policy_profiles where partner_slug = p_partner_slug;
  insert into public.legal_aid_policy_profiles(partner_slug, version, intake_schema_version, profile, prepared_by)
  values (p_partner_slug, v_version, p_intake_schema_version, p_profile, p_actor_user_id)
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.legal_aid_approve_policy_profile(
  p_actor_user_id uuid, p_profile_id uuid, p_note text
) returns text language plpgsql security definer set search_path = ''
as $$
declare v_profile public.legal_aid_policy_profiles%rowtype;
begin
  select * into v_profile from public.legal_aid_policy_profiles where id = p_profile_id for update;
  if not found then return 'not_found'; end if;
  if not exists (
    select 1 from public.partner_users pu
    where pu.auth_user_id = p_actor_user_id and pu.status = 'active' and (
      (pu.role = 'internal_admin' and pu.partner_slug is null) or (pu.role = 'partner_admin' and pu.partner_slug = v_profile.partner_slug)
    )
  ) then return 'forbidden'; end if;
  if v_profile.status <> 'draft' then return 'not_draft'; end if;
  -- The preparer cannot approve their own profile: approval is a second person's act.
  if v_profile.prepared_by = p_actor_user_id then return 'same_person'; end if;
  update public.legal_aid_policy_profiles
    set status = 'retired', retired_at = now()
    where partner_slug = v_profile.partner_slug and status = 'approved' and id <> p_profile_id;
  update public.legal_aid_policy_profiles
    set status = 'approved', approved_by = p_actor_user_id, approved_at = now(), approval_note = nullif(trim(coalesce(p_note, '')), '')
    where id = p_profile_id;
  return 'approved';
end $$;

create or replace function public.legal_aid_configure_event(
  p_actor_user_id uuid, p_event_id uuid, p_policy_profile_id uuid,
  p_registration_opens_at timestamptz, p_registration_closes_at timestamptz,
  p_appointment_policy text, p_participant_cost_note text, p_public_description text
) returns text language plpgsql security definer set search_path = ''
as $$
declare v_event public.clinic_events%rowtype;
begin
  select * into v_event from public.clinic_events where id = p_event_id for update;
  if not found then return 'not_found'; end if;
  if not exists (
    select 1 from public.partner_users pu
    where pu.auth_user_id = p_actor_user_id and pu.status = 'active' and (
      (pu.role = 'internal_admin' and pu.partner_slug is null) or (pu.role = 'partner_admin' and pu.partner_slug = v_event.partner_slug)
    )
  ) then return 'forbidden'; end if;
  if not exists (
    select 1 from public.legal_aid_policy_profiles p
    where p.id = p_policy_profile_id and p.partner_slug = v_event.partner_slug and p.status in ('draft','approved')
  ) then return 'profile_mismatch'; end if;
  if v_event.status = 'published' and not exists (
    select 1 from public.legal_aid_policy_profiles p where p.id = p_policy_profile_id and p.status = 'approved'
  ) then return 'profile_not_approved'; end if;
  update public.clinic_events set
    experience = 'legal_aid',
    policy_profile_id = p_policy_profile_id,
    registration_opens_at = p_registration_opens_at,
    registration_closes_at = p_registration_closes_at,
    appointment_policy = coalesce(p_appointment_policy, appointment_policy),
    participant_cost_note = nullif(trim(coalesce(p_participant_cost_note, '')), ''),
    public_description = nullif(trim(coalesce(p_public_description, '')), '')
  where id = p_event_id;
  perform public.legal_aid_audit(p_event_id, p_actor_user_id, 'legal_aid_event_configured', 'event', p_event_id,
    jsonb_build_object('status', v_event.status));
  return 'configured';
end $$;

-- ---------------------------------------------------------------------------
-- 8. Registration RPCs
-- ---------------------------------------------------------------------------

create or replace function public.legal_aid_register(
  p_event_id uuid, p_participant_user_id uuid, p_participant_pseudonym text, p_idempotency_key text,
  p_contact_name text, p_contact_email text, p_contact_phone text, p_preferred_contact text,
  p_language_preference text, p_assistance_needs text, p_source text, p_assisted_by_event_staff_id uuid
) returns table(outcome text, registration_id uuid, status text)
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_column
declare v_event public.clinic_events%rowtype; v_existing public.clinic_registrations%rowtype;
        v_active integer; v_status text; v_id uuid;
begin
  if p_participant_user_id is null then raise exception 'legal_aid_participant_required'; end if;
  select * into v_event from public.clinic_events where id = p_event_id for update;
  if not found or v_event.experience <> 'legal_aid' then
    return query select 'event_unavailable'::text, null::uuid, null::text; return;
  end if;
  select * into v_existing from public.clinic_registrations r
    where r.event_id = p_event_id and (r.participant_pseudonym = p_participant_pseudonym or r.idempotency_key = p_idempotency_key);
  if found then
    return query select 'already_registered'::text, v_existing.id, v_existing.status; return;
  end if;
  if v_event.status <> 'published'
     or (v_event.registration_opens_at is not null and v_event.registration_opens_at > now())
     or (v_event.registration_closes_at is not null and v_event.registration_closes_at <= now()) then
    return query select 'registration_closed'::text, null::uuid, null::text; return;
  end if;
  if p_source = 'staff_assisted' and not exists (
    select 1 from public.clinic_event_staff s where s.id = p_assisted_by_event_staff_id and s.event_id = p_event_id and s.status = 'approved'
  ) then raise exception 'legal_aid_staff_not_approved'; end if;
  select count(*) into v_active from public.clinic_registrations r
    where r.event_id = p_event_id and r.status in ('received','confirmed');
  v_status := case when v_active < v_event.capacity then 'received' else 'waitlisted' end;
  insert into public.clinic_registrations(
    event_id, participant_user_id, participant_pseudonym, status, contact_name, contact_email, contact_phone,
    preferred_contact, language_preference, assistance_needs, source, assisted_by_event_staff_id, idempotency_key, waitlisted_at
  ) values (
    p_event_id, p_participant_user_id, p_participant_pseudonym, v_status, trim(p_contact_name),
    nullif(trim(coalesce(p_contact_email, '')), ''), nullif(trim(coalesce(p_contact_phone, '')), ''),
    p_preferred_contact, nullif(trim(coalesce(p_language_preference, '')), ''), nullif(trim(coalesce(p_assistance_needs, '')), ''),
    coalesce(p_source, 'public_web'), p_assisted_by_event_staff_id, p_idempotency_key,
    case when v_status = 'waitlisted' then now() end
  ) returning id into v_id;
  perform public.legal_aid_audit(p_event_id, null, 'registration_received', 'registration', v_id, jsonb_build_object('status', v_status));
  return query select (case when v_status = 'waitlisted' then 'waitlisted' else 'registered' end)::text, v_id, v_status;
end $$;

create or replace function public.legal_aid_set_registration_status(
  p_registration_id uuid, p_actor_user_id uuid, p_status text
) returns text language plpgsql security definer set search_path = ''
as $$
declare v_reg public.clinic_registrations%rowtype; v_is_participant boolean; v_is_staff boolean;
begin
  select * into v_reg from public.clinic_registrations where id = p_registration_id for update;
  if not found then return 'not_found'; end if;
  v_is_participant := v_reg.participant_user_id is not null and v_reg.participant_user_id = p_actor_user_id;
  v_is_staff := public.clinic_actor_can_event(v_reg.event_id, p_actor_user_id, 'coordinator');
  if p_status = 'cancelled' then
    if not (v_is_participant or v_is_staff) then return 'forbidden'; end if;
  elsif p_status in ('confirmed','waitlisted','declined','received') then
    if not v_is_staff then return 'forbidden'; end if;
  else
    return 'invalid_status';
  end if;
  if v_reg.status = p_status then return 'unchanged'; end if;
  update public.clinic_registrations set
    status = p_status,
    confirmed_at = case when p_status = 'confirmed' then now() else confirmed_at end,
    waitlisted_at = case when p_status = 'waitlisted' then now() else waitlisted_at end,
    cancelled_at = case when p_status = 'cancelled' then now() else null end
  where id = p_registration_id;
  perform public.legal_aid_audit(v_reg.event_id, p_actor_user_id, 'registration_status_changed', 'registration', p_registration_id,
    jsonb_build_object('from', v_reg.status, 'to', p_status));
  return 'updated';
end $$;

-- ---------------------------------------------------------------------------
-- 9. Intake RPCs (participant side)
-- ---------------------------------------------------------------------------

create or replace function public.legal_aid_save_intake_draft(
  p_event_id uuid, p_participant_user_id uuid, p_participant_pseudonym text,
  p_answers jsonb, p_answers_hash text, p_legal_matter text, p_expected_version integer
) returns table(outcome text, intake_id uuid, version integer)
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_column
declare v_event public.clinic_events%rowtype; v_intake public.legal_aid_intakes%rowtype; v_reg uuid;
begin
  if p_participant_user_id is null then raise exception 'legal_aid_participant_required'; end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'object' then raise exception 'legal_aid_answers_invalid'; end if;
  select * into v_event from public.clinic_events where id = p_event_id;
  if not found or v_event.experience <> 'legal_aid' or v_event.policy_profile_id is null then
    return query select 'event_unavailable'::text, null::uuid, null::integer; return;
  end if;
  select r.id into v_reg from public.clinic_registrations r
    where r.event_id = p_event_id and r.participant_pseudonym = p_participant_pseudonym and r.status <> 'cancelled';
  if v_reg is null then
    return query select 'registration_required'::text, null::uuid, null::integer; return;
  end if;
  select * into v_intake from public.legal_aid_intakes i
    where i.event_id = p_event_id and i.participant_pseudonym = p_participant_pseudonym for update;
  if not found then
    insert into public.legal_aid_intakes(
      event_id, registration_id, participant_user_id, participant_pseudonym, partner_slug, policy_profile_id,
      intake_schema_version, answers, answers_hash, legal_matter
    )
    select p_event_id, v_reg, p_participant_user_id, p_participant_pseudonym, v_event.partner_slug, v_event.policy_profile_id,
      p.intake_schema_version, p_answers, p_answers_hash, p_legal_matter
    from public.legal_aid_policy_profiles p where p.id = v_event.policy_profile_id
    returning * into v_intake;
    perform public.legal_aid_audit(p_event_id, null, 'intake_started', 'intake', v_intake.id, '{}'::jsonb);
    return query select 'created'::text, v_intake.id, v_intake.current_version; return;
  end if;
  if v_intake.status not in ('draft','needs_information') then
    return query select 'not_editable'::text, v_intake.id, v_intake.current_version; return;
  end if;
  if p_expected_version is not null and p_expected_version <> v_intake.current_version then
    return query select 'version_conflict'::text, v_intake.id, v_intake.current_version; return;
  end if;
  if v_intake.answers_hash is distinct from p_answers_hash then
    -- Material change: every active signature bound to the previous answers
    -- is superseded, so the applicant re-attests before submitting again.
    update public.legal_aid_intake_signatures
      set status = 'superseded', superseded_at = now(), superseded_reason = 'answers_changed'
      where intake_id = v_intake.id and status = 'active';
    update public.legal_aid_intakes set
      answers = p_answers, answers_hash = p_answers_hash, legal_matter = coalesce(p_legal_matter, legal_matter),
      current_version = current_version + 1, last_activity_at = now()
      where id = v_intake.id returning * into v_intake;
  else
    update public.legal_aid_intakes set legal_matter = coalesce(p_legal_matter, legal_matter), last_activity_at = now()
      where id = v_intake.id returning * into v_intake;
  end if;
  return query select 'saved'::text, v_intake.id, v_intake.current_version;
end $$;

create or replace function public.legal_aid_sign_intake(
  p_intake_id uuid, p_participant_user_id uuid, p_statement_key text, p_statement_version text,
  p_statement_hash text, p_signer_name text, p_signature_method text, p_signature_data text
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_intake public.legal_aid_intakes%rowtype; v_id uuid;
begin
  select * into v_intake from public.legal_aid_intakes where id = p_intake_id for update;
  if not found then raise exception 'legal_aid_intake_not_found'; end if;
  -- Only the applicant signs; an assisting volunteer never becomes the signer.
  if v_intake.participant_user_id is null or v_intake.participant_user_id <> p_participant_user_id then
    raise exception 'legal_aid_signer_mismatch';
  end if;
  if v_intake.status not in ('draft','needs_information') then raise exception 'legal_aid_intake_not_editable'; end if;
  if v_intake.answers_hash is null then raise exception 'legal_aid_answers_required'; end if;
  update public.legal_aid_intake_signatures
    set status = 'superseded', superseded_at = now(), superseded_reason = 're_signed'
    where intake_id = p_intake_id and statement_key = p_statement_key and status = 'active';
  insert into public.legal_aid_intake_signatures(
    intake_id, statement_key, statement_version, statement_hash, answers_hash, answers_version,
    signer_user_id, signer_name, signature_method, signature_data
  ) values (
    p_intake_id, p_statement_key, p_statement_version, p_statement_hash, v_intake.answers_hash, v_intake.current_version,
    p_participant_user_id, trim(p_signer_name), p_signature_method, p_signature_data
  ) returning id into v_id;
  update public.legal_aid_intakes set last_activity_at = now() where id = p_intake_id;
  return v_id;
end $$;

create or replace function public.legal_aid_submit_intake(
  p_intake_id uuid, p_participant_user_id uuid, p_required_statement_keys text[]
) returns text language plpgsql security definer set search_path = ''
as $$
declare v_intake public.legal_aid_intakes%rowtype; v_event public.clinic_events%rowtype; v_key text; v_case uuid;
begin
  select * into v_intake from public.legal_aid_intakes where id = p_intake_id for update;
  if not found then return 'not_found'; end if;
  if v_intake.participant_user_id is null or v_intake.participant_user_id <> p_participant_user_id then return 'forbidden'; end if;
  if v_intake.status in ('submitted','staff_review','approved','declined_for_program','referred') then return 'already_submitted'; end if;
  if v_intake.status = 'withdrawn' then return 'withdrawn'; end if;
  if v_intake.answers_hash is null then return 'answers_required'; end if;
  foreach v_key in array coalesce(p_required_statement_keys, array[]::text[]) loop
    if not exists (
      select 1 from public.legal_aid_intake_signatures s
      where s.intake_id = p_intake_id and s.statement_key = v_key and s.status = 'active' and s.answers_hash = v_intake.answers_hash
    ) then return 'signature_required:' || v_key; end if;
  end loop;
  select * into v_event from public.clinic_events where id = v_intake.event_id;
  -- One clinic case per submitted intake, in the existing case model, so the
  -- existing queue, follow-up and sponsored packet controls see the same person.
  if v_intake.clinic_case_id is null then
    select c.id into v_case from public.clinic_cases c
      where c.event_id = v_intake.event_id and c.participant_user_id = p_participant_user_id and c.screening_session_id is null
      limit 1;
    if v_case is null then
      insert into public.clinic_cases(event_id, participant_user_id, queue_status, route_disposition, jurisdiction)
      values (v_intake.event_id, p_participant_user_id, 'needs_information', 'pending', coalesce(v_event.jurisdiction, 'MS'))
      returning id into v_case;
    end if;
  else
    v_case := v_intake.clinic_case_id;
  end if;
  update public.legal_aid_information_requests set status = 'fulfilled', fulfilled_at = now()
    where intake_id = p_intake_id and status = 'open';
  update public.legal_aid_intakes set
    status = 'submitted', submitted_at = now(), submitted_version = current_version,
    clinic_case_id = v_case, last_activity_at = now()
    where id = p_intake_id;
  perform public.legal_aid_audit(v_intake.event_id, null, 'intake_submitted', 'intake', p_intake_id,
    jsonb_build_object('version', v_intake.current_version));
  return 'submitted';
end $$;

create or replace function public.legal_aid_withdraw_intake(p_intake_id uuid, p_participant_user_id uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare v_intake public.legal_aid_intakes%rowtype;
begin
  select * into v_intake from public.legal_aid_intakes where id = p_intake_id for update;
  if not found then return 'not_found'; end if;
  if v_intake.participant_user_id is null or v_intake.participant_user_id <> p_participant_user_id then return 'forbidden'; end if;
  if v_intake.status = 'withdrawn' then return 'unchanged'; end if;
  update public.legal_aid_intake_signatures set status = 'superseded', superseded_at = now(), superseded_reason = 'withdrawn'
    where intake_id = p_intake_id and status = 'active';
  update public.legal_aid_intakes set status = 'withdrawn', withdrawn_at = now(), last_activity_at = now() where id = p_intake_id;
  perform public.legal_aid_audit(v_intake.event_id, null, 'intake_withdrawn', 'intake', p_intake_id, '{}'::jsonb);
  return 'withdrawn';
end $$;

-- ---------------------------------------------------------------------------
-- 10. Restricted fields
-- ---------------------------------------------------------------------------

create or replace function public.legal_aid_set_restricted_field(
  p_intake_id uuid, p_actor_user_id uuid, p_field_key text, p_ciphertext text, p_key_version text, p_display_hint text
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_intake public.legal_aid_intakes%rowtype; v_id uuid;
begin
  select * into v_intake from public.legal_aid_intakes where id = p_intake_id for update;
  if not found then raise exception 'legal_aid_intake_not_found'; end if;
  if not (public.legal_aid_is_intake_participant(p_intake_id, p_actor_user_id)
          or public.legal_aid_actor_can_intake(p_intake_id, p_actor_user_id, 'intake_review')
          or public.legal_aid_actor_can_intake(p_intake_id, p_actor_user_id, 'coordinator')) then
    raise exception 'legal_aid_restricted_forbidden';
  end if;
  if v_intake.status not in ('draft','needs_information') then raise exception 'legal_aid_intake_not_editable'; end if;
  insert into public.legal_aid_restricted_fields(intake_id, field_key, ciphertext, key_version, display_hint, updated_by)
  values (p_intake_id, p_field_key, p_ciphertext, p_key_version, p_display_hint, p_actor_user_id)
  on conflict (intake_id, field_key) do update
    set ciphertext = excluded.ciphertext, key_version = excluded.key_version,
        display_hint = excluded.display_hint, updated_by = excluded.updated_by
  returning id into v_id;
  insert into public.legal_aid_access_audit(intake_id, actor_user_id, action, field_key)
  values (p_intake_id, p_actor_user_id, 'restricted_written', p_field_key);
  update public.legal_aid_intakes set last_activity_at = now() where id = p_intake_id;
  return v_id;
end $$;

-- Reveal is a distinct, audited act reserved for the attorney or coordinator
-- assignment; queue listings, exports and ordinary detail reads never call it.
create or replace function public.legal_aid_reveal_restricted_field(
  p_intake_id uuid, p_actor_user_id uuid, p_field_key text, p_purpose text
) returns table(ciphertext text, key_version text)
language plpgsql security definer set search_path = ''
as $$
#variable_conflict use_column
begin
  if not (public.legal_aid_actor_can_intake(p_intake_id, p_actor_user_id, 'attorney')
          or public.legal_aid_actor_can_intake(p_intake_id, p_actor_user_id, 'coordinator')) then
    raise exception 'legal_aid_restricted_forbidden';
  end if;
  if p_purpose is null or length(trim(p_purpose)) < 3 then raise exception 'legal_aid_purpose_required'; end if;
  insert into public.legal_aid_access_audit(intake_id, actor_user_id, action, field_key, metadata)
  values (p_intake_id, p_actor_user_id, 'restricted_revealed', p_field_key, jsonb_build_object('purpose', left(trim(p_purpose), 200)));
  return query select f.ciphertext, f.key_version from public.legal_aid_restricted_fields f
    where f.intake_id = p_intake_id and f.field_key = p_field_key;
end $$;

-- ---------------------------------------------------------------------------
-- 11. Staff review RPCs
-- ---------------------------------------------------------------------------

create or replace function public.legal_aid_record_intake_view(p_intake_id uuid, p_actor_user_id uuid)
returns void language sql security definer set search_path = ''
as $$
  insert into public.legal_aid_access_audit(intake_id, actor_user_id, action)
  values (p_intake_id, p_actor_user_id, 'intake_viewed')
$$;

create or replace function public.legal_aid_request_information(
  p_intake_id uuid, p_actor_user_id uuid, p_request_text text
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_intake public.legal_aid_intakes%rowtype; v_id uuid;
begin
  select * into v_intake from public.legal_aid_intakes where id = p_intake_id for update;
  if not found then raise exception 'legal_aid_intake_not_found'; end if;
  if not (public.legal_aid_actor_can_intake(p_intake_id, p_actor_user_id, 'intake_review')
          or public.legal_aid_actor_can_intake(p_intake_id, p_actor_user_id, 'program_review')
          or public.legal_aid_actor_can_intake(p_intake_id, p_actor_user_id, 'attorney')
          or public.legal_aid_actor_can_intake(p_intake_id, p_actor_user_id, 'coordinator')) then
    raise exception 'legal_aid_review_forbidden';
  end if;
  if v_intake.status not in ('submitted','needs_information','staff_review') then raise exception 'legal_aid_intake_not_reviewable'; end if;
  insert into public.legal_aid_information_requests(intake_id, requested_by, request_text)
  values (p_intake_id, p_actor_user_id, trim(p_request_text)) returning id into v_id;
  update public.legal_aid_intakes set status = 'needs_information', last_activity_at = now() where id = p_intake_id;
  perform public.legal_aid_audit(v_intake.event_id, p_actor_user_id, 'information_requested', 'intake', p_intake_id, '{}'::jsonb);
  return v_id;
end $$;

create or replace function public.legal_aid_withdraw_information_request(p_request_id uuid, p_actor_user_id uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare v_req public.legal_aid_information_requests%rowtype;
begin
  select * into v_req from public.legal_aid_information_requests where id = p_request_id for update;
  if not found then return 'not_found'; end if;
  if not (public.legal_aid_actor_can_intake(v_req.intake_id, p_actor_user_id, 'intake_review')
          or public.legal_aid_actor_can_intake(v_req.intake_id, p_actor_user_id, 'coordinator')) then return 'forbidden'; end if;
  if v_req.status <> 'open' then return 'not_open'; end if;
  update public.legal_aid_information_requests set status = 'withdrawn', withdrawn_at = now() where id = p_request_id;
  return 'withdrawn';
end $$;

create or replace function public.legal_aid_start_review(p_intake_id uuid, p_actor_user_id uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare v_intake public.legal_aid_intakes%rowtype;
begin
  select * into v_intake from public.legal_aid_intakes where id = p_intake_id for update;
  if not found then return 'not_found'; end if;
  if not (public.legal_aid_actor_can_intake(p_intake_id, p_actor_user_id, 'intake_review')
          or public.legal_aid_actor_can_intake(p_intake_id, p_actor_user_id, 'program_review')
          or public.legal_aid_actor_can_intake(p_intake_id, p_actor_user_id, 'coordinator')) then return 'forbidden'; end if;
  if v_intake.status <> 'submitted' then return 'invalid_transition'; end if;
  update public.legal_aid_intakes set status = 'staff_review', last_activity_at = now() where id = p_intake_id;
  perform public.legal_aid_audit(v_intake.event_id, p_actor_user_id, 'intake_review_started', 'intake', p_intake_id, '{}'::jsonb);
  return 'updated';
end $$;

create or replace function public.legal_aid_set_attorney_review(p_intake_id uuid, p_actor_user_id uuid, p_status text)
returns text language plpgsql security definer set search_path = ''
as $$
declare v_intake public.legal_aid_intakes%rowtype;
begin
  select * into v_intake from public.legal_aid_intakes where id = p_intake_id for update;
  if not found then return 'not_found'; end if;
  if p_status not in ('assigned','in_review') then return 'invalid_status'; end if;
  if not (public.legal_aid_actor_can_intake(p_intake_id, p_actor_user_id, 'attorney')
          or public.legal_aid_actor_can_intake(p_intake_id, p_actor_user_id, 'coordinator')) then return 'forbidden'; end if;
  if v_intake.status not in ('submitted','staff_review','needs_information','approved') then return 'invalid_transition'; end if;
  update public.legal_aid_intakes set attorney_review_status = p_status, last_activity_at = now() where id = p_intake_id;
  perform public.legal_aid_audit(v_intake.event_id, p_actor_user_id, 'attorney_review_status_changed', 'intake', p_intake_id,
    jsonb_build_object('to', p_status));
  return 'updated';
end $$;

-- A decision is a separate record. Program eligibility, attorney review and
-- conflict/engagement never merge into one flag, and none of them touches
-- remedy eligibility, packet verification or sponsorship.
create or replace function public.legal_aid_record_decision(
  p_intake_id uuid, p_actor_user_id uuid, p_decision_type text, p_outcome text,
  p_rationale text, p_policy_basis text, p_evidence jsonb
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_intake public.legal_aid_intakes%rowtype; v_perms text[]; v_permission text; v_id uuid;
begin
  select * into v_intake from public.legal_aid_intakes where id = p_intake_id for update;
  if not found then raise exception 'legal_aid_intake_not_found'; end if;
  v_perms := public.legal_aid_actor_permissions(p_intake_id, p_actor_user_id);
  if p_decision_type = 'program_eligibility' then
    if not ('program_review' = any(v_perms)) then raise exception 'legal_aid_decision_forbidden'; end if;
    v_permission := 'program_review';
  elsif p_decision_type = 'attorney_review' then
    if not ('attorney' = any(v_perms)) then raise exception 'legal_aid_decision_forbidden'; end if;
    v_permission := 'attorney';
  elsif p_decision_type = 'conflict_engagement' then
    if not ('attorney' = any(v_perms) or 'coordinator' = any(v_perms)) then raise exception 'legal_aid_decision_forbidden'; end if;
    v_permission := case when 'attorney' = any(v_perms) then 'attorney' else 'coordinator' end;
  else
    raise exception 'legal_aid_decision_type_invalid';
  end if;
  if v_intake.status not in ('submitted','needs_information','staff_review','approved','referred','declined_for_program') then
    raise exception 'legal_aid_intake_not_reviewable';
  end if;
  insert into public.legal_aid_review_decisions(
    intake_id, decision_type, outcome, rationale, policy_basis, evidence, reviewer_user_id, reviewer_permission,
    policy_profile_id, answers_hash
  ) values (
    p_intake_id, p_decision_type, p_outcome, trim(p_rationale), nullif(trim(coalesce(p_policy_basis, '')), ''),
    coalesce(p_evidence, '{}'::jsonb), p_actor_user_id, v_permission, v_intake.policy_profile_id, v_intake.answers_hash
  ) returning id into v_id;
  if p_decision_type = 'program_eligibility' then
    update public.legal_aid_intakes set
      status = case p_outcome when 'approved' then 'approved' when 'declined_for_program' then 'declined_for_program'
                               when 'referred' then 'referred' else 'needs_information' end,
      program_decision = case when p_outcome in ('approved','declined_for_program','referred') then p_outcome else program_decision end,
      last_activity_at = now()
    where id = p_intake_id;
  elsif p_decision_type = 'attorney_review' then
    update public.legal_aid_intakes set
      attorney_review_status = case when p_outcome = 'reviewed' then 'reviewed' else attorney_review_status end,
      status = case when p_outcome = 'needs_information' then 'needs_information' else status end,
      last_activity_at = now()
    where id = p_intake_id;
  end if;
  perform public.legal_aid_audit(v_intake.event_id, p_actor_user_id, 'decision_recorded', 'intake', p_intake_id,
    jsonb_build_object('decision_type', p_decision_type, 'outcome', p_outcome));
  return v_id;
end $$;

-- ---------------------------------------------------------------------------
-- 12. Documents, execution tasks, next steps, exports
-- ---------------------------------------------------------------------------

create or replace function public.legal_aid_record_document(
  p_intake_id uuid, p_actor_user_id uuid, p_category text, p_storage_path text, p_original_filename text,
  p_content_type text, p_size_bytes integer, p_sha256 text
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_intake public.legal_aid_intakes%rowtype; v_role text; v_id uuid;
begin
  select * into v_intake from public.legal_aid_intakes where id = p_intake_id;
  if not found then raise exception 'legal_aid_intake_not_found'; end if;
  if public.legal_aid_is_intake_participant(p_intake_id, p_actor_user_id) then
    if p_category = 'executed_document' then raise exception 'legal_aid_document_forbidden'; end if;
    v_role := 'participant';
  elsif public.legal_aid_actor_can_intake(p_intake_id, p_actor_user_id, 'intake_review')
     or public.legal_aid_actor_can_intake(p_intake_id, p_actor_user_id, 'coordinator')
     or public.legal_aid_actor_can_intake(p_intake_id, p_actor_user_id, 'notary')
     or public.legal_aid_actor_can_intake(p_intake_id, p_actor_user_id, 'attorney') then
    v_role := 'staff';
  else
    raise exception 'legal_aid_document_forbidden';
  end if;
  if p_storage_path not like 'legal-aid/' || p_intake_id::text || '/%' then raise exception 'legal_aid_storage_path_invalid'; end if;
  insert into public.legal_aid_documents(intake_id, category, storage_path, original_filename, content_type, size_bytes, sha256, uploaded_by, uploaded_role)
  values (p_intake_id, p_category, p_storage_path, p_original_filename, p_content_type, p_size_bytes, p_sha256, p_actor_user_id, v_role)
  returning id into v_id;
  update public.legal_aid_intakes set last_activity_at = now() where id = p_intake_id;
  perform public.legal_aid_audit(v_intake.event_id, case when v_role = 'staff' then p_actor_user_id end, 'document_recorded', 'document', v_id,
    jsonb_build_object('category', p_category));
  return v_id;
end $$;

create or replace function public.legal_aid_remove_document(p_document_id uuid, p_actor_user_id uuid)
returns text language plpgsql security definer set search_path = ''
as $$
declare v_doc public.legal_aid_documents%rowtype;
begin
  select * into v_doc from public.legal_aid_documents where id = p_document_id for update;
  if not found then return 'not_found'; end if;
  if v_doc.removed_at is not null then return 'already_removed'; end if;
  if exists (select 1 from public.legal_aid_document_tasks t where t.executed_document_id = p_document_id) then return 'in_use'; end if;
  if not ((v_doc.uploaded_role = 'participant' and public.legal_aid_is_intake_participant(v_doc.intake_id, p_actor_user_id))
          or public.legal_aid_actor_can_intake(v_doc.intake_id, p_actor_user_id, 'coordinator')) then return 'forbidden'; end if;
  update public.legal_aid_documents set removed_at = now(), removed_by = p_actor_user_id where id = p_document_id;
  return 'removed';
end $$;

create or replace function public.legal_aid_create_document_task(
  p_intake_id uuid, p_actor_user_id uuid, p_document_key text, p_title text, p_required_signer text,
  p_execution_method text, p_authority_note text, p_template_version text,
  p_unsigned_render_job_id uuid, p_unsigned_artifact_sha256 text
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_intake public.legal_aid_intakes%rowtype; v_case public.clinic_cases%rowtype; v_id uuid; v_job_owner uuid; v_job_matter uuid;
begin
  select * into v_intake from public.legal_aid_intakes where id = p_intake_id;
  if not found then raise exception 'legal_aid_intake_not_found'; end if;
  if not (public.legal_aid_actor_can_intake(p_intake_id, p_actor_user_id, 'attorney')
          or public.legal_aid_actor_can_intake(p_intake_id, p_actor_user_id, 'coordinator')) then
    raise exception 'legal_aid_task_forbidden';
  end if;
  if v_intake.clinic_case_id is not null then
    select * into v_case from public.clinic_cases where id = v_intake.clinic_case_id;
  end if;
  if p_unsigned_render_job_id is not null then
    select j.consumer_auth_user_id, j.matter_id into v_job_owner, v_job_matter
      from public.packet_render_jobs j where j.id = p_unsigned_render_job_id;
    if not found then raise exception 'legal_aid_render_job_not_found'; end if;
    -- The unsigned execution copy must be the applicant's own packet.
    if v_job_owner is distinct from v_intake.participant_user_id then raise exception 'legal_aid_render_job_owner_mismatch'; end if;
  end if;
  insert into public.legal_aid_document_tasks(
    intake_id, clinic_case_id, matter_id, document_key, title, required_signer, execution_method, authority_note,
    template_version, unsigned_render_job_id, unsigned_artifact_sha256, created_by
  ) values (
    p_intake_id, v_intake.clinic_case_id, coalesce(v_job_matter, v_case.matter_id), trim(p_document_key), trim(p_title),
    p_required_signer, p_execution_method, nullif(trim(coalesce(p_authority_note, '')), ''),
    nullif(trim(coalesce(p_template_version, '')), ''), p_unsigned_render_job_id, p_unsigned_artifact_sha256, p_actor_user_id
  ) returning id into v_id;
  perform public.legal_aid_audit(v_intake.event_id, p_actor_user_id, 'document_task_created', 'document_task', v_id,
    jsonb_build_object('document_key', trim(p_document_key)));
  return v_id;
end $$;

-- The execution sequence is enforced here. Printing an unsigned copy can move a
-- task no further than "pending signature or notary"; only a received executed
-- copy (an uploaded document of that category, on this intake) can move it on,
-- and only a reviewer can call it reviewed or ready to file.
create or replace function public.legal_aid_transition_document_task(
  p_task_id uuid, p_actor_user_id uuid, p_status text, p_executed_document_id uuid, p_note text
) returns text language plpgsql security definer set search_path = ''
as $$
declare v_task public.legal_aid_document_tasks%rowtype; v_perms text[]; v_allowed boolean := false;
begin
  select * into v_task from public.legal_aid_document_tasks where id = p_task_id for update;
  if not found then return 'not_found'; end if;
  v_perms := public.legal_aid_actor_permissions(v_task.intake_id, p_actor_user_id);
  if v_perms = array[]::text[] then return 'forbidden'; end if;
  if v_task.status = p_status then return 'unchanged'; end if;
  case p_status
    when 'attorney_reviewed' then
      v_allowed := v_task.status = 'draft' and 'attorney' = any(v_perms);
    when 'ready_for_execution' then
      v_allowed := v_task.status = 'attorney_reviewed' and ('attorney' = any(v_perms) or 'coordinator' = any(v_perms));
    when 'signature_or_notary_pending' then
      v_allowed := v_task.status = 'ready_for_execution' and ('attorney' = any(v_perms) or 'coordinator' = any(v_perms) or 'notary' = any(v_perms));
    when 'executed_copy_received' then
      v_allowed := v_task.status in ('ready_for_execution','signature_or_notary_pending')
        and ('notary' = any(v_perms) or 'coordinator' = any(v_perms) or 'attorney' = any(v_perms))
        and p_executed_document_id is not null
        and exists (select 1 from public.legal_aid_documents d where d.id = p_executed_document_id
                    and d.intake_id = v_task.intake_id and d.category = 'executed_document' and d.removed_at is null);
    when 'execution_reviewed' then
      v_allowed := v_task.status = 'executed_copy_received' and 'attorney' = any(v_perms);
    when 'ready_to_file' then
      v_allowed := v_task.status = 'execution_reviewed' and ('attorney' = any(v_perms) or 'coordinator' = any(v_perms));
    when 'filed' then
      v_allowed := v_task.status = 'ready_to_file' and ('coordinator' = any(v_perms) or 'follow_up' = any(v_perms));
    else
      return 'invalid_status';
  end case;
  if not v_allowed then return 'invalid_transition'; end if;
  update public.legal_aid_document_tasks set
    status = p_status,
    executed_document_id = case when p_status = 'executed_copy_received' then p_executed_document_id else executed_document_id end,
    reviewed_by = case when p_status in ('attorney_reviewed','execution_reviewed') then p_actor_user_id else reviewed_by end,
    reviewed_at = case when p_status in ('attorney_reviewed','execution_reviewed') then now() else reviewed_at end,
    filed_at = case when p_status = 'filed' then now() else filed_at end,
    filing_note = case when p_status = 'filed' then nullif(trim(coalesce(p_note, '')), '') else filing_note end
  where id = p_task_id;
  perform public.legal_aid_audit((select i.event_id from public.legal_aid_intakes i where i.id = v_task.intake_id),
    p_actor_user_id, 'document_task_status_changed', 'document_task', p_task_id,
    jsonb_build_object('from', v_task.status, 'to', p_status));
  return 'updated';
end $$;

-- A changed document never inherits an older execution: replacing the unsigned
-- artifact resets any execution progress and detaches the executed copy.
create or replace function public.legal_aid_replace_document_artifact(
  p_task_id uuid, p_actor_user_id uuid, p_unsigned_render_job_id uuid, p_unsigned_artifact_sha256 text
) returns text language plpgsql security definer set search_path = ''
as $$
declare v_task public.legal_aid_document_tasks%rowtype;
begin
  select * into v_task from public.legal_aid_document_tasks where id = p_task_id for update;
  if not found then return 'not_found'; end if;
  if not (public.legal_aid_actor_can_intake(v_task.intake_id, p_actor_user_id, 'attorney')
          or public.legal_aid_actor_can_intake(v_task.intake_id, p_actor_user_id, 'coordinator')) then return 'forbidden'; end if;
  if v_task.unsigned_artifact_sha256 is not distinct from p_unsigned_artifact_sha256 then return 'unchanged'; end if;
  if v_task.status = 'filed' then return 'already_filed'; end if;
  update public.legal_aid_document_tasks set
    unsigned_render_job_id = p_unsigned_render_job_id,
    unsigned_artifact_sha256 = p_unsigned_artifact_sha256,
    executed_document_id = null,
    status = case when status in ('draft','attorney_reviewed') then status else 'attorney_reviewed' end,
    reviewed_by = null, reviewed_at = null
  where id = p_task_id;
  perform public.legal_aid_audit((select i.event_id from public.legal_aid_intakes i where i.id = v_task.intake_id),
    p_actor_user_id, 'document_artifact_replaced', 'document_task', p_task_id,
    jsonb_build_object('from', v_task.status));
  return 'replaced';
end $$;

create or replace function public.legal_aid_save_next_step(
  p_next_step_id uuid, p_intake_id uuid, p_actor_user_id uuid, p_title text, p_detail text,
  p_due_at timestamptz, p_owner_event_staff_id uuid, p_status text
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_intake public.legal_aid_intakes%rowtype; v_id uuid;
begin
  select * into v_intake from public.legal_aid_intakes where id = p_intake_id;
  if not found then raise exception 'legal_aid_intake_not_found'; end if;
  if not (public.legal_aid_actor_can_intake(p_intake_id, p_actor_user_id, 'follow_up')
          or public.legal_aid_actor_can_intake(p_intake_id, p_actor_user_id, 'attorney')
          or public.legal_aid_actor_can_intake(p_intake_id, p_actor_user_id, 'coordinator')) then
    raise exception 'legal_aid_next_step_forbidden';
  end if;
  if p_owner_event_staff_id is not null and not exists (
    select 1 from public.clinic_event_staff s where s.id = p_owner_event_staff_id and s.event_id = v_intake.event_id and s.status = 'approved'
  ) then raise exception 'legal_aid_next_step_owner_invalid'; end if;
  if p_next_step_id is null then
    insert into public.legal_aid_next_steps(intake_id, title, detail, due_at, owner_event_staff_id, created_by, status, completed_at)
    values (p_intake_id, trim(p_title), nullif(trim(coalesce(p_detail, '')), ''), p_due_at, p_owner_event_staff_id, p_actor_user_id,
            coalesce(p_status, 'pending'), case when p_status = 'done' then now() end)
    returning id into v_id;
  else
    update public.legal_aid_next_steps set
      title = trim(p_title), detail = nullif(trim(coalesce(p_detail, '')), ''), due_at = p_due_at,
      owner_event_staff_id = p_owner_event_staff_id, status = coalesce(p_status, status),
      completed_at = case when coalesce(p_status, status) = 'done' then coalesce(completed_at, now()) else null end
    where id = p_next_step_id and intake_id = p_intake_id returning id into v_id;
    if v_id is null then raise exception 'legal_aid_next_step_not_found'; end if;
  end if;
  perform public.legal_aid_audit(v_intake.event_id, p_actor_user_id, 'next_step_saved', 'next_step', v_id, '{}'::jsonb);
  return v_id;
end $$;

create or replace function public.legal_aid_record_export(
  p_intake_id uuid, p_actor_user_id uuid, p_sha256 text, p_storage_path text, p_includes_restricted boolean, p_recipient_note text
) returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_intake public.legal_aid_intakes%rowtype; v_id uuid; v_version integer;
begin
  select * into v_intake from public.legal_aid_intakes where id = p_intake_id;
  if not found then raise exception 'legal_aid_intake_not_found'; end if;
  if not public.legal_aid_actor_can_intake(p_intake_id, p_actor_user_id, 'export') then raise exception 'legal_aid_export_forbidden'; end if;
  if p_includes_restricted and not (public.legal_aid_actor_can_intake(p_intake_id, p_actor_user_id, 'attorney')
                                    or public.legal_aid_actor_can_intake(p_intake_id, p_actor_user_id, 'coordinator')) then
    raise exception 'legal_aid_restricted_forbidden';
  end if;
  select coalesce(max(export_version), 0) + 1 into v_version from public.legal_aid_case_exports where intake_id = p_intake_id;
  insert into public.legal_aid_case_exports(intake_id, exported_by, export_version, sha256, storage_path, includes_restricted, recipient_note)
  values (p_intake_id, p_actor_user_id, v_version, p_sha256, p_storage_path, coalesce(p_includes_restricted, false),
          nullif(trim(coalesce(p_recipient_note, '')), ''))
  returning id into v_id;
  insert into public.legal_aid_access_audit(intake_id, actor_user_id, action, metadata)
  values (p_intake_id, p_actor_user_id, 'export_created', jsonb_build_object('version', v_version, 'includes_restricted', coalesce(p_includes_restricted, false)));
  perform public.legal_aid_audit(v_intake.event_id, p_actor_user_id, 'case_file_exported', 'export', v_id, jsonb_build_object('version', v_version));
  return v_id;
end $$;

create or replace function public.legal_aid_set_external_case_reference(
  p_intake_id uuid, p_actor_user_id uuid, p_reference text
) returns text language plpgsql security definer set search_path = ''
as $$
begin
  if not (public.legal_aid_actor_can_intake(p_intake_id, p_actor_user_id, 'export')
          or public.legal_aid_actor_can_intake(p_intake_id, p_actor_user_id, 'coordinator')) then return 'forbidden'; end if;
  update public.legal_aid_intakes set external_case_reference = nullif(trim(coalesce(p_reference, '')), ''), last_activity_at = now()
    where id = p_intake_id;
  if not found then return 'not_found'; end if;
  return 'updated';
end $$;

create or replace function public.legal_aid_record_access(
  p_intake_id uuid, p_actor_user_id uuid, p_action text, p_metadata jsonb
) returns void language sql security definer set search_path = ''
as $$
  insert into public.legal_aid_access_audit(intake_id, actor_user_id, action, metadata)
  values (p_intake_id, p_actor_user_id, p_action, coalesce(p_metadata, '{}'::jsonb))
$$;

-- ---------------------------------------------------------------------------
-- 13. RLS, grants
-- ---------------------------------------------------------------------------

alter table public.legal_aid_policy_profiles enable row level security;
alter table public.clinic_registrations enable row level security;
alter table public.legal_aid_intakes enable row level security;
alter table public.legal_aid_restricted_fields enable row level security;
alter table public.legal_aid_intake_signatures enable row level security;
alter table public.legal_aid_documents enable row level security;
alter table public.legal_aid_information_requests enable row level security;
alter table public.legal_aid_review_decisions enable row level security;
alter table public.legal_aid_document_tasks enable row level security;
alter table public.legal_aid_next_steps enable row level security;
alter table public.legal_aid_case_exports enable row level security;
alter table public.legal_aid_access_audit enable row level security;

create policy legal_aid_policy_profiles_tenant_read on public.legal_aid_policy_profiles for select to authenticated
using (public.clinic_is_internal_admin() or partner_slug = public.clinic_current_partner_slug());
create policy clinic_registrations_scoped_read on public.clinic_registrations for select to authenticated
using (participant_user_id = auth.uid() or public.clinic_is_internal_admin()
  or public.clinic_is_event_staff(event_id, 'coordinator') or public.clinic_is_event_staff(event_id, 'intake_review')
  or (public.clinic_current_role() = 'partner_admin' and public.clinic_can_read_event(event_id)));
create policy legal_aid_intakes_scoped_read on public.legal_aid_intakes for select to authenticated
using (participant_user_id = auth.uid() or public.legal_aid_can_review_intake(id));
-- Restricted fields carry no browser-role policy at all.
create policy legal_aid_intake_signatures_scoped_read on public.legal_aid_intake_signatures for select to authenticated
using (public.legal_aid_is_intake_participant(intake_id, auth.uid()) or public.legal_aid_can_review_intake(intake_id));
create policy legal_aid_documents_scoped_read on public.legal_aid_documents for select to authenticated
using (public.legal_aid_is_intake_participant(intake_id, auth.uid()) or public.legal_aid_can_review_intake(intake_id)
  or public.legal_aid_actor_can_intake(intake_id, auth.uid(), 'notary'));
create policy legal_aid_information_requests_scoped_read on public.legal_aid_information_requests for select to authenticated
using (public.legal_aid_is_intake_participant(intake_id, auth.uid()) or public.legal_aid_can_review_intake(intake_id));
create policy legal_aid_review_decisions_staff_read on public.legal_aid_review_decisions for select to authenticated
using (public.legal_aid_can_review_intake(intake_id));
create policy legal_aid_document_tasks_scoped_read on public.legal_aid_document_tasks for select to authenticated
using (public.legal_aid_is_intake_participant(intake_id, auth.uid()) or public.legal_aid_can_review_intake(intake_id)
  or public.legal_aid_actor_can_intake(intake_id, auth.uid(), 'notary'));
create policy legal_aid_next_steps_scoped_read on public.legal_aid_next_steps for select to authenticated
using (public.legal_aid_is_intake_participant(intake_id, auth.uid()) or public.legal_aid_can_review_intake(intake_id)
  or public.legal_aid_actor_can_intake(intake_id, auth.uid(), 'follow_up'));
create policy legal_aid_case_exports_admin_read on public.legal_aid_case_exports for select to authenticated
using (public.legal_aid_actor_can_intake(intake_id, auth.uid(), 'export'));
create policy legal_aid_access_audit_admin_read on public.legal_aid_access_audit for select to authenticated
using (public.legal_aid_actor_can_intake(intake_id, auth.uid(), 'coordinator'));

revoke all on table public.legal_aid_policy_profiles from public, anon, authenticated;
revoke all on table public.clinic_registrations from public, anon, authenticated;
revoke all on table public.legal_aid_intakes from public, anon, authenticated;
revoke all on table public.legal_aid_restricted_fields from public, anon, authenticated;
revoke all on table public.legal_aid_intake_signatures from public, anon, authenticated;
revoke all on table public.legal_aid_documents from public, anon, authenticated;
revoke all on table public.legal_aid_information_requests from public, anon, authenticated;
revoke all on table public.legal_aid_review_decisions from public, anon, authenticated;
revoke all on table public.legal_aid_document_tasks from public, anon, authenticated;
revoke all on table public.legal_aid_next_steps from public, anon, authenticated;
revoke all on table public.legal_aid_case_exports from public, anon, authenticated;
revoke all on table public.legal_aid_access_audit from public, anon, authenticated;

grant select on public.legal_aid_policy_profiles, public.clinic_registrations, public.legal_aid_intakes,
  public.legal_aid_intake_signatures, public.legal_aid_documents, public.legal_aid_information_requests,
  public.legal_aid_review_decisions, public.legal_aid_document_tasks, public.legal_aid_next_steps,
  public.legal_aid_case_exports, public.legal_aid_access_audit to authenticated, service_role;
grant select on public.legal_aid_restricted_fields to service_role;

revoke all on function public.legal_aid_actor_permissions(uuid,uuid) from public, anon;
revoke all on function public.legal_aid_actor_can_intake(uuid,uuid,text) from public, anon;
revoke all on function public.legal_aid_is_intake_participant(uuid,uuid) from public, anon;
revoke all on function public.legal_aid_can_review_intake(uuid) from public, anon;
grant execute on function public.legal_aid_actor_permissions(uuid,uuid), public.legal_aid_actor_can_intake(uuid,uuid,text),
  public.legal_aid_is_intake_participant(uuid,uuid), public.legal_aid_can_review_intake(uuid) to authenticated, service_role;

revoke all on function public.legal_aid_audit(uuid,uuid,text,text,uuid,jsonb) from public, anon, authenticated;
revoke all on function public.legal_aid_prepare_policy_profile(uuid,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.legal_aid_approve_policy_profile(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.legal_aid_configure_event(uuid,uuid,uuid,timestamptz,timestamptz,text,text,text) from public, anon, authenticated;
revoke all on function public.legal_aid_register(uuid,uuid,text,text,text,text,text,text,text,text,text,uuid) from public, anon, authenticated;
revoke all on function public.legal_aid_set_registration_status(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.legal_aid_save_intake_draft(uuid,uuid,text,jsonb,text,text,integer) from public, anon, authenticated;
revoke all on function public.legal_aid_sign_intake(uuid,uuid,text,text,text,text,text,text) from public, anon, authenticated;
revoke all on function public.legal_aid_submit_intake(uuid,uuid,text[]) from public, anon, authenticated;
revoke all on function public.legal_aid_withdraw_intake(uuid,uuid) from public, anon, authenticated;
revoke all on function public.legal_aid_set_restricted_field(uuid,uuid,text,text,text,text) from public, anon, authenticated;
revoke all on function public.legal_aid_reveal_restricted_field(uuid,uuid,text,text) from public, anon, authenticated;
revoke all on function public.legal_aid_record_intake_view(uuid,uuid) from public, anon, authenticated;
revoke all on function public.legal_aid_request_information(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.legal_aid_withdraw_information_request(uuid,uuid) from public, anon, authenticated;
revoke all on function public.legal_aid_start_review(uuid,uuid) from public, anon, authenticated;
revoke all on function public.legal_aid_set_attorney_review(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.legal_aid_record_decision(uuid,uuid,text,text,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.legal_aid_record_document(uuid,uuid,text,text,text,text,integer,text) from public, anon, authenticated;
revoke all on function public.legal_aid_remove_document(uuid,uuid) from public, anon, authenticated;
revoke all on function public.legal_aid_create_document_task(uuid,uuid,text,text,text,text,text,text,uuid,text) from public, anon, authenticated;
revoke all on function public.legal_aid_transition_document_task(uuid,uuid,text,uuid,text) from public, anon, authenticated;
revoke all on function public.legal_aid_replace_document_artifact(uuid,uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.legal_aid_save_next_step(uuid,uuid,uuid,text,text,timestamptz,uuid,text) from public, anon, authenticated;
revoke all on function public.legal_aid_record_export(uuid,uuid,text,text,boolean,text) from public, anon, authenticated;
revoke all on function public.legal_aid_set_external_case_reference(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.legal_aid_record_access(uuid,uuid,text,jsonb) from public, anon, authenticated;

grant execute on function
  public.legal_aid_audit(uuid,uuid,text,text,uuid,jsonb),
  public.legal_aid_prepare_policy_profile(uuid,text,text,jsonb),
  public.legal_aid_approve_policy_profile(uuid,uuid,text),
  public.legal_aid_configure_event(uuid,uuid,uuid,timestamptz,timestamptz,text,text,text),
  public.legal_aid_register(uuid,uuid,text,text,text,text,text,text,text,text,text,uuid),
  public.legal_aid_set_registration_status(uuid,uuid,text),
  public.legal_aid_save_intake_draft(uuid,uuid,text,jsonb,text,text,integer),
  public.legal_aid_sign_intake(uuid,uuid,text,text,text,text,text,text),
  public.legal_aid_submit_intake(uuid,uuid,text[]),
  public.legal_aid_withdraw_intake(uuid,uuid),
  public.legal_aid_set_restricted_field(uuid,uuid,text,text,text,text),
  public.legal_aid_reveal_restricted_field(uuid,uuid,text,text),
  public.legal_aid_record_intake_view(uuid,uuid),
  public.legal_aid_request_information(uuid,uuid,text),
  public.legal_aid_withdraw_information_request(uuid,uuid),
  public.legal_aid_start_review(uuid,uuid),
  public.legal_aid_set_attorney_review(uuid,uuid,text),
  public.legal_aid_record_decision(uuid,uuid,text,text,text,text,jsonb),
  public.legal_aid_record_document(uuid,uuid,text,text,text,text,integer,text),
  public.legal_aid_remove_document(uuid,uuid),
  public.legal_aid_create_document_task(uuid,uuid,text,text,text,text,text,text,uuid,text),
  public.legal_aid_transition_document_task(uuid,uuid,text,uuid,text),
  public.legal_aid_replace_document_artifact(uuid,uuid,uuid,text),
  public.legal_aid_save_next_step(uuid,uuid,uuid,text,text,timestamptz,uuid,text),
  public.legal_aid_record_export(uuid,uuid,text,text,boolean,text),
  public.legal_aid_set_external_case_reference(uuid,uuid,text),
  public.legal_aid_record_access(uuid,uuid,text,jsonb)
to service_role;

-- ---------------------------------------------------------------------------
-- 14. Private storage for applicant documents, executed copies and case files
-- ---------------------------------------------------------------------------

do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'rcap-legal-aid-private',
      'rcap-legal-aid-private',
      false,
      20971520,
      array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/json']
    )
    on conflict (id) do update
      set public = false,
          file_size_limit = excluded.file_size_limit,
          allowed_mime_types = excluded.allowed_mime_types;
  end if;
end;
$$;

commit;
