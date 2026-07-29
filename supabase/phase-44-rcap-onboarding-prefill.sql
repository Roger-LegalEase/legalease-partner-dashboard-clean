-- Phase 44: RCAP Partner Onboarding Phase 1.1 prefill and confirmation.
--
-- Forward-only and additive. This migration stores reviewed, structured
-- suggestions beside the existing Phase 1 workspace. It does not create a
-- second onboarding store, apply a migration remotely, invite users, publish
-- pages, alter payments/entitlements, or activate a program.
--
-- Apply after phase-43-rcap-partner-onboarding-phase1.sql.

begin;

-------------------------------------------------------------------------------
-- 1. Reviewed prefill batches and values.
-------------------------------------------------------------------------------

create table public.partner_onboarding_prefill_batches (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null
    references public.partner_onboarding(id) on delete cascade,
  partner_record_id uuid not null
    references public.partner_records(id) on delete cascade,
  status text not null default 'draft',
  source_summary text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_by uuid references auth.users(id),
  approved_at timestamptz,
  applied_at timestamptz,
  superseded_at timestamptz,
  aggregate_version bigint not null default 1,
  request_id uuid not null,
  constraint partner_onboarding_prefill_batches_status_check
    check (status in (
      'draft',
      'ready_for_review',
      'approved',
      'partially_applied',
      'applied',
      'rejected',
      'superseded'
    )),
  constraint partner_onboarding_prefill_batches_source_summary_check
    check (
      char_length(source_summary) between 1 and 500
      and source_summary !~ '[[:cntrl:]]'
    ),
  constraint partner_onboarding_prefill_batches_version_check
    check (aggregate_version > 0),
  constraint partner_onboarding_prefill_batches_approval_check
    check (
      (approved_at is null and approved_by is null)
      or (approved_at is not null and approved_by is not null)
    ),
  constraint partner_onboarding_prefill_batches_request_unique
    unique (request_id)
);

create index partner_onboarding_prefill_batches_workspace_time_idx
  on public.partner_onboarding_prefill_batches(workspace_id, created_at desc);
create index partner_onboarding_prefill_batches_partner_status_idx
  on public.partner_onboarding_prefill_batches(partner_record_id, status);

create table public.partner_onboarding_prefill_values (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null
    references public.partner_onboarding_prefill_batches(id) on delete cascade,
  workspace_id uuid not null
    references public.partner_onboarding(id) on delete cascade,
  section_key text not null,
  field_key text not null,
  proposed_value jsonb not null,
  source_type text not null,
  source_reference_id text,
  source_label text not null,
  confidence numeric(5,4),
  review_status text not null default 'proposed',
  base_value_hash text not null,
  proposed_value_hash text not null,
  base_section_revision bigint not null,
  applied_value_hash text,
  applied_section_revision bigint,
  applied_workspace_version bigint,
  partner_review_status text not null default 'not_applied',
  partner_reviewed_at timestamptz,
  partner_reviewed_section_revision bigint,
  partner_modified boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  applied_at timestamptz,
  superseded_at timestamptz,
  constraint partner_onboarding_prefill_values_section_check
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
  constraint partner_onboarding_prefill_values_field_key_check
    check (
      char_length(field_key) between 1 and 120
      and field_key ~ '^[a-z0-9_]+$'
    ),
  constraint partner_onboarding_prefill_values_source_type_check
    check (source_type in (
      'partner_record',
      'contact_record',
      'order_form',
      'agreement',
      'proposal',
      'meeting',
      'email',
      'kickoff',
      'manual',
      'other'
    )),
  constraint partner_onboarding_prefill_values_source_reference_check
    check (
      source_reference_id is null
      or (
        char_length(source_reference_id) between 1 and 200
        and source_reference_id !~ '[[:cntrl:]]'
      )
    ),
  constraint partner_onboarding_prefill_values_source_label_check
    check (
      char_length(source_label) between 1 and 200
      and source_label !~ '[[:cntrl:]]'
    ),
  constraint partner_onboarding_prefill_values_confidence_check
    check (confidence is null or confidence between 0 and 1),
  constraint partner_onboarding_prefill_values_review_status_check
    check (review_status in (
      'proposed',
      'approved',
      'rejected',
      'applied',
      'conflict',
      'superseded'
    )),
  constraint partner_onboarding_prefill_values_partner_review_status_check
    check (partner_review_status in (
      'not_applied',
      'pending',
      'confirmed',
      'modified',
      'rejected'
    )),
  constraint partner_onboarding_prefill_values_hash_check
    check (
      base_value_hash ~ '^[0-9a-f]{64}$'
      and proposed_value_hash ~ '^[0-9a-f]{64}$'
      and (
        applied_value_hash is null
        or applied_value_hash ~ '^[0-9a-f]{64}$'
      )
    ),
  constraint partner_onboarding_prefill_values_revision_check
    check (
      base_section_revision >= 0
      and (
        applied_section_revision is null
        or applied_section_revision > 0
      )
      and (
        applied_workspace_version is null
        or applied_workspace_version > 0
      )
      and (
        partner_reviewed_section_revision is null
        or partner_reviewed_section_revision > 0
      )
    ),
  constraint partner_onboarding_prefill_values_size_check
    check (octet_length(proposed_value::text) <= 65536),
  constraint partner_onboarding_prefill_values_review_actor_check
    check (
      (reviewed_at is null and reviewed_by is null)
      or (reviewed_at is not null and reviewed_by is not null)
    ),
  constraint partner_onboarding_prefill_values_apply_check
    check (
      (
        review_status <> 'applied'
        and applied_at is null
        and applied_value_hash is null
        and applied_section_revision is null
        and applied_workspace_version is null
        and partner_review_status = 'not_applied'
        and partner_reviewed_at is null
      )
      or (
        review_status = 'applied'
        and applied_at is not null
        and applied_value_hash is not null
        and applied_section_revision is not null
        and applied_workspace_version is not null
        and partner_review_status in (
          'pending',
          'confirmed',
          'modified',
          'rejected'
        )
      )
    ),
  constraint partner_onboarding_prefill_values_partner_review_check
    check (
      (
        partner_review_status in ('not_applied', 'pending')
        and partner_reviewed_at is null
        and partner_reviewed_section_revision is null
      )
      or (
        partner_review_status in ('confirmed', 'modified', 'rejected')
        and partner_reviewed_at is not null
        and partner_reviewed_section_revision is not null
      )
    )
);

create index partner_onboarding_prefill_values_workspace_status_idx
  on public.partner_onboarding_prefill_values(
    workspace_id,
    review_status,
    partner_review_status
  );
create index partner_onboarding_prefill_values_batch_status_idx
  on public.partner_onboarding_prefill_values(batch_id, review_status);
create index partner_onboarding_prefill_values_section_pending_idx
  on public.partner_onboarding_prefill_values(
    workspace_id,
    section_key,
    partner_review_status
  )
  where review_status = 'applied';
create unique index partner_onboarding_prefill_values_active_field_unique
  on public.partner_onboarding_prefill_values(
    workspace_id,
    section_key,
    field_key
  )
  where review_status in ('proposed', 'approved', 'applied', 'conflict')
    and superseded_at is null;

create or replace function public.set_partner_onboarding_prefill_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_partner_onboarding_prefill_batches_updated_at
before update on public.partner_onboarding_prefill_batches
for each row execute function public.set_partner_onboarding_prefill_updated_at();

comment on table public.partner_onboarding_prefill_batches is
  'Internal review batches of structured onboarding suggestions. Never exposed directly to partner roles.';
comment on table public.partner_onboarding_prefill_values is
  'Canonical field suggestions with internal provenance and independent partner confirmation state.';
comment on column public.partner_onboarding_prefill_values.proposed_value is
  'A canonical structured field value only; raw notes, messages, transcripts, and source documents are prohibited.';

-------------------------------------------------------------------------------
-- 2. RLS and column-bounded partner-safe reads.
-------------------------------------------------------------------------------

alter table public.partner_onboarding_prefill_batches enable row level security;
alter table public.partner_onboarding_prefill_values enable row level security;

create policy partner_onboarding_prefill_batches_all_internal
on public.partner_onboarding_prefill_batches
for all
to authenticated
using (public.is_internal_admin())
with check (public.is_internal_admin());

create policy partner_onboarding_prefill_values_all_internal
on public.partner_onboarding_prefill_values
for all
to authenticated
using (public.is_internal_admin())
with check (public.is_internal_admin());

create policy partner_onboarding_prefill_values_select_applied_partner
on public.partner_onboarding_prefill_values
for select
to authenticated
using (
  review_status = 'applied'
  and exists (
    select 1
    from public.partner_onboarding po
    where po.id = workspace_id
      and po.partner_slug = public.current_partner_slug()
  )
);

create or replace view public.partner_onboarding_prefill_values_safe
with (security_barrier = true, security_invoker = true)
as
select
  id,
  batch_id,
  workspace_id,
  section_key,
  field_key,
  review_status,
  partner_review_status,
  partner_reviewed_at,
  partner_modified,
  applied_at,
  applied_section_revision,
  partner_reviewed_section_revision
from public.partner_onboarding_prefill_values
where review_status = 'applied';

revoke all on table public.partner_onboarding_prefill_batches
  from public, anon, authenticated;
revoke all on table public.partner_onboarding_prefill_values
  from public, anon, authenticated;
revoke all on table public.partner_onboarding_prefill_values_safe
  from public, anon, authenticated;

grant select (
  id,
  batch_id,
  workspace_id,
  section_key,
  field_key,
  review_status,
  partner_review_status,
  partner_reviewed_at,
  partner_modified,
  applied_at,
  applied_section_revision,
  partner_reviewed_section_revision
) on public.partner_onboarding_prefill_values to authenticated;
grant select on public.partner_onboarding_prefill_values_safe to authenticated;

-------------------------------------------------------------------------------
-- 3. Bounded activity and local integration event vocabulary.
-------------------------------------------------------------------------------

alter table public.partner_onboarding_activity
  drop constraint if exists partner_onboarding_activity_event_type_check;
alter table public.partner_onboarding_activity
  add constraint partner_onboarding_activity_event_type_check
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
      'ready_for_launch_decided',
      'prefill_batch_created',
      'prefill_known_data_imported',
      'prefill_suggestion_approved',
      'prefill_suggestion_rejected',
      'prefill_suggestion_superseded',
      'prefill_apply_conflict',
      'prefill_applied',
      'prefill_section_confirmed',
      'prefill_section_modified'
    ));

alter table public.partner_onboarding_integration_events
  drop constraint if exists partner_onboarding_integration_events_type_check;
alter table public.partner_onboarding_integration_events
  add constraint partner_onboarding_integration_events_type_check
    check (event_type in (
      'rcap_partner_workspace_created',
      'rcap_commercial_gate_changed',
      'rcap_onboarding_progressed',
      'rcap_onboarding_blocked',
      'rcap_onboarding_submitted',
      'rcap_team_configuration_changed',
      'rcap_brand_configuration_changed',
      'rcap_section_review_changed',
      'rcap_onboarding_prefill_prepared',
      'rcap_onboarding_prefill_applied',
      'rcap_onboarding_prefill_reviewed'
    ));

-------------------------------------------------------------------------------
-- 4. Internal helpers. Every helper is service-role-only.
-------------------------------------------------------------------------------

create or replace function public.rcap_onboarding_prefill_current_value(
  p_workspace_id uuid,
  p_section_key text,
  p_field_key text
)
returns jsonb
language plpgsql
security invoker
stable
set search_path = ''
as $$
declare
  v_value jsonb;
begin
  if p_field_key = 'contacts' and p_section_key = 'organization_contacts' then
    select coalesce(jsonb_agg(
      jsonb_strip_nulls(jsonb_build_object(
        'stable_row_id', c.id,
        'role', c.role,
        'name', c.name,
        'title', c.title,
        'organization', c.organization,
        'work_email', c.work_email,
        'phone', c.phone
      ))
      order by c.created_at, c.id
    ), '[]'::jsonb)
      into v_value
    from public.partner_onboarding_contacts c
    where c.workspace_id = p_workspace_id
      and c.deleted_at is null;
    return v_value;
  end if;

  if p_field_key = 'planned_users'
     and p_section_key = 'staff_dashboard_plan' then
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'stable_row_id', u.id,
        'name', u.name,
        'work_email', u.work_email,
        'requested_role', u.requested_role,
        'special_permissions', to_jsonb(u.special_permissions),
        'training_attendee', u.training_attendee
      )
      order by u.created_at, u.id
    ), '[]'::jsonb)
      into v_value
    from public.partner_onboarding_planned_users u
    where u.workspace_id = p_workspace_id
      and u.deleted_at is null;
    return v_value;
  end if;

  if p_field_key = 'report_recipients'
     and p_section_key = 'support_referrals_reporting' then
    select coalesce(jsonb_agg(
      jsonb_strip_nulls(jsonb_build_object(
        'stable_row_id', r.id,
        'name', r.name,
        'work_email', r.work_email
      ))
      order by r.created_at, r.id
    ), '[]'::jsonb)
      into v_value
    from public.partner_onboarding_report_recipients r
    where r.workspace_id = p_workspace_id
      and r.deleted_at is null;
    return v_value;
  end if;

  select coalesce(s.response_data -> p_field_key, 'null'::jsonb)
    into v_value
  from public.partner_onboarding_sections s
  where s.workspace_id = p_workspace_id
    and s.section_key = p_section_key;
  return coalesce(v_value, 'null'::jsonb);
end;
$$;

revoke execute on function public.rcap_onboarding_prefill_current_value(
  uuid, text, text
) from public, anon, authenticated;
grant execute on function public.rcap_onboarding_prefill_current_value(
  uuid, text, text
) to service_role;

-------------------------------------------------------------------------------
-- 5. Prepare/import reviewed structured suggestions without applying them.
-------------------------------------------------------------------------------

create or replace function public.rcap_service_prepare_onboarding_prefill(
  p_partner_slug text,
  p_actor_user_id uuid,
  p_workspace_id uuid,
  p_request_id uuid,
  p_payload_hash text,
  p_source_summary text,
  p_batch_status text,
  p_origin text,
  p_suggestions jsonb
)
returns table (
  batch_id uuid,
  batch_aggregate_version bigint,
  suggestion_count integer,
  duplicate boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_workspace public.partner_onboarding%rowtype;
  v_existing public.partner_onboarding_idempotency%rowtype;
  v_batch public.partner_onboarding_prefill_batches%rowtype;
  v_count integer;
begin
  perform public.rcap_service_assert_internal_actor(p_actor_user_id);

  if p_batch_status not in ('draft', 'ready_for_review')
     or p_origin not in ('manual', 'import')
     or p_payload_hash !~ '^[0-9a-f]{64}$'
     or char_length(p_source_summary) not between 1 and 500
     or p_suggestions is null
     or jsonb_typeof(p_suggestions) <> 'array'
     or jsonb_array_length(p_suggestions) < 1
     or jsonb_array_length(p_suggestions) > 200 then
    raise exception using
      errcode = '22023',
      message = 'Invalid onboarding prefill preparation';
  end if;

  select *
    into v_existing
  from public.partner_onboarding_idempotency i
  where i.request_id = p_request_id
  for update;

  if found then
    if v_existing.workspace_id <> p_workspace_id
       or v_existing.operation_key <> 'prefill_prepare'
       or v_existing.actor_user_id <> p_actor_user_id
       or v_existing.payload_hash <> p_payload_hash then
      raise exception using
        errcode = '23505',
        message = 'Idempotency request does not match original mutation';
    end if;
    if v_existing.result_status = 'succeeded' then
      select *
        into v_batch
      from public.partner_onboarding_prefill_batches b
      where b.request_id = p_request_id;
      return query
      select
        v_batch.id,
        v_batch.aggregate_version,
        (
          select count(*)::integer
          from public.partner_onboarding_prefill_values pv
          where pv.batch_id = v_batch.id
        ),
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

  if not found or v_workspace.partner_record_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'Onboarding workspace not found';
  end if;
  if v_workspace.status in ('ready_to_launch', 'live', 'paused', 'closed') then
    raise exception using
      errcode = '55000',
      message = 'Onboarding workspace no longer accepts prefill suggestions';
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
    'prefill_prepare',
    p_request_id,
    p_actor_user_id,
    p_payload_hash,
    now() + interval '24 hours'
  );

  insert into public.partner_onboarding_prefill_batches (
    workspace_id,
    partner_record_id,
    status,
    source_summary,
    created_by,
    request_id
  ) values (
    p_workspace_id,
    v_workspace.partner_record_id,
    p_batch_status,
    p_source_summary,
    p_actor_user_id,
    p_request_id
  )
  returning * into v_batch;

  insert into public.partner_onboarding_prefill_values (
    id,
    batch_id,
    workspace_id,
    section_key,
    field_key,
    proposed_value,
    source_type,
    source_reference_id,
    source_label,
    confidence,
    base_value_hash,
    proposed_value_hash,
    base_section_revision,
    created_by
  )
  select
    coalesce(nullif(item->>'id', '')::uuid, gen_random_uuid()),
    v_batch.id,
    p_workspace_id,
    item->>'sectionKey',
    item->>'fieldKey',
    item->'proposedValue',
    item->>'sourceType',
    nullif(item->>'sourceReferenceId', ''),
    item->>'sourceLabel',
    case
      when item ? 'confidence' and item->'confidence' <> 'null'::jsonb
        then (item->>'confidence')::numeric
      else null
    end,
    item->>'baseValueHash',
    item->>'proposedValueHash',
    (item->>'baseSectionRevision')::bigint,
    p_actor_user_id
  from jsonb_array_elements(p_suggestions) item;

  get diagnostics v_count = row_count;

  insert into public.partner_onboarding_activity (
    workspace_id,
    event_type,
    summary_code,
    owner_type,
    actor_user_id,
    request_id,
    dedupe_key
  ) values (
    p_workspace_id,
    'prefill_batch_created',
    'prefill_batch_created',
    'legalease',
    p_actor_user_id,
    p_request_id,
    p_request_id::text || ':prefill_batch_created'
  );

  if p_origin = 'import' then
    insert into public.partner_onboarding_activity (
      workspace_id,
      event_type,
      summary_code,
      owner_type,
      actor_user_id,
      request_id,
      dedupe_key
    ) values (
      p_workspace_id,
      'prefill_known_data_imported',
      'prefill_known_data_imported',
      'legalease',
      p_actor_user_id,
      p_request_id,
      p_request_id::text || ':prefill_known_data_imported'
    );
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
    idempotency_key
  ) values (
    v_workspace.id,
    v_workspace.partner_record_id,
    'rcap_onboarding_prefill_prepared',
    v_workspace.aggregate_version,
    v_workspace.status,
    v_workspace.completion_percentage,
    v_workspace.blocker_code,
    v_workspace.next_action_code,
    v_workspace.next_action_owner,
    v_workspace.target_launch_date,
    p_request_id::text || ':prefill_prepared'
  );

  update public.partner_onboarding_idempotency
  set
    result_status = 'succeeded',
    result_workspace_version = v_workspace.aggregate_version,
    result_section_revision = v_batch.aggregate_version,
    completed_at = now()
  where request_id = p_request_id;

  batch_id := v_batch.id;
  batch_aggregate_version := v_batch.aggregate_version;
  suggestion_count := v_count;
  duplicate := false;
  return next;
end;
$$;

-------------------------------------------------------------------------------
-- 6. Explicit suggestion review.
-------------------------------------------------------------------------------

create or replace function public.rcap_service_review_onboarding_prefill(
  p_partner_slug text,
  p_actor_user_id uuid,
  p_workspace_id uuid,
  p_value_id uuid,
  p_expected_batch_version bigint,
  p_action text,
  p_request_id uuid,
  p_payload_hash text
)
returns table (
  batch_aggregate_version bigint,
  review_status text,
  duplicate boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_workspace public.partner_onboarding%rowtype;
  v_batch public.partner_onboarding_prefill_batches%rowtype;
  v_value public.partner_onboarding_prefill_values%rowtype;
  v_existing public.partner_onboarding_idempotency%rowtype;
  v_status text;
  v_event_type text;
begin
  perform public.rcap_service_assert_internal_actor(p_actor_user_id);
  if p_action not in ('approve', 'reject', 'supersede')
     or p_expected_batch_version < 1
     or p_payload_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid prefill review';
  end if;

  select *
    into v_existing
  from public.partner_onboarding_idempotency i
  where i.request_id = p_request_id
  for update;
  if found then
    if v_existing.workspace_id <> p_workspace_id
       or v_existing.operation_key <> 'prefill_review:' || p_value_id::text
       or v_existing.actor_user_id <> p_actor_user_id
       or v_existing.payload_hash <> p_payload_hash then
      raise exception using
        errcode = '23505',
        message = 'Idempotency request does not match original mutation';
    end if;
    if v_existing.result_status = 'succeeded' then
      select pv.review_status, b.aggregate_version
        into v_status, batch_aggregate_version
      from public.partner_onboarding_prefill_values pv
      join public.partner_onboarding_prefill_batches b on b.id = pv.batch_id
      where pv.id = p_value_id;
      review_status := v_status;
      duplicate := true;
      return next;
      return;
    end if;
  end if;

  select po.*
    into v_workspace
  from public.partner_onboarding po
  where po.id = p_workspace_id
    and po.partner_slug = p_partner_slug;
  if not found then
    raise exception using errcode = 'P0002', message = 'Onboarding workspace not found';
  end if;

  select pv.*
    into v_value
  from public.partner_onboarding_prefill_values pv
  where pv.id = p_value_id
    and pv.workspace_id = p_workspace_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Prefill suggestion not found';
  end if;

  select *
    into v_batch
  from public.partner_onboarding_prefill_batches b
  where b.id = v_value.batch_id
    and b.workspace_id = p_workspace_id
  for update;
  if v_batch.aggregate_version <> p_expected_batch_version then
    raise exception using errcode = '40001', message = 'Prefill batch revision conflict';
  end if;
  if v_value.review_status not in ('proposed', 'approved', 'conflict') then
    raise exception using errcode = '55000', message = 'Suggestion is no longer reviewable';
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
    'prefill_review:' || p_value_id::text,
    p_request_id,
    p_actor_user_id,
    p_payload_hash,
    now() + interval '24 hours'
  );

  v_status := case p_action
    when 'approve' then 'approved'
    when 'reject' then 'rejected'
    else 'superseded'
  end;
  v_event_type := case p_action
    when 'approve' then 'prefill_suggestion_approved'
    when 'reject' then 'prefill_suggestion_rejected'
    else 'prefill_suggestion_superseded'
  end;

  update public.partner_onboarding_prefill_values
  set
    review_status = v_status,
    reviewed_by = p_actor_user_id,
    reviewed_at = now(),
    superseded_at = case when v_status = 'superseded' then now() end
  where id = p_value_id;

  update public.partner_onboarding_prefill_batches
  set
    aggregate_version = aggregate_version + 1,
    status = case
      when v_status = 'approved' then 'approved'
      when not exists (
        select 1
        from public.partner_onboarding_prefill_values pv
        where pv.batch_id = v_batch.id
          and pv.id <> p_value_id
          and pv.review_status in ('proposed', 'approved', 'applied', 'conflict')
      ) then case
        when v_status = 'superseded' then 'superseded'
        else 'rejected'
      end
      else status
    end,
    approved_by = case when v_status = 'approved' then p_actor_user_id else approved_by end,
    approved_at = case when v_status = 'approved' then coalesce(approved_at, now()) else approved_at end,
    superseded_at = case when v_status = 'superseded' then now() else superseded_at end
  where id = v_batch.id
  returning aggregate_version into batch_aggregate_version;

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
    v_value.section_key,
    v_status,
    v_event_type,
    'legalease',
    p_actor_user_id,
    p_request_id,
    p_request_id::text || ':' || v_event_type
  );

  update public.partner_onboarding_idempotency
  set
    result_status = 'succeeded',
    result_workspace_version = v_workspace.aggregate_version,
    result_section_revision = batch_aggregate_version,
    completed_at = now()
  where request_id = p_request_id;

  review_status := v_status;
  duplicate := false;
  return next;
end;
$$;

-------------------------------------------------------------------------------
-- 7. Atomic internal apply with CAS, conflict reporting, and no overwrite.
-------------------------------------------------------------------------------

create or replace function public.rcap_service_apply_onboarding_prefill(
  p_partner_slug text,
  p_actor_user_id uuid,
  p_workspace_id uuid,
  p_expected_workspace_version bigint,
  p_selected_value_ids uuid[],
  p_section_updates jsonb,
  p_workspace_completion integer,
  p_blocker_code text,
  p_next_action_code text,
  p_next_action_owner text,
  p_request_id uuid,
  p_payload_hash text
)
returns table (
  workspace_aggregate_version bigint,
  result jsonb,
  duplicate boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_workspace public.partner_onboarding%rowtype;
  v_existing public.partner_onboarding_idempotency%rowtype;
  v_value public.partner_onboarding_prefill_values%rowtype;
  v_section public.partner_onboarding_sections%rowtype;
  v_update jsonb;
  v_value_id uuid;
  v_applied uuid[] := '{}'::uuid[];
  v_conflicts uuid[] := '{}'::uuid[];
  v_skipped uuid[] := '{}'::uuid[];
  v_update_ids uuid[];
  v_new_revision bigint;
  v_applied_count integer := 0;
  v_conflict_count integer := 0;
begin
  perform public.rcap_service_assert_internal_actor(p_actor_user_id);
  if p_expected_workspace_version < 1
     or p_selected_value_ids is null
     or cardinality(p_selected_value_ids) < 1
     or cardinality(p_selected_value_ids) > 200
     or p_section_updates is null
     or jsonb_typeof(p_section_updates) <> 'array'
     or p_workspace_completion not between 0 and 100
     or p_next_action_owner not in ('partner', 'legalease', 'none')
     or p_payload_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid prefill apply request';
  end if;

  select *
    into v_existing
  from public.partner_onboarding_idempotency i
  where i.request_id = p_request_id
  for update;
  if found then
    if v_existing.workspace_id <> p_workspace_id
       or v_existing.operation_key <> 'prefill_apply'
       or v_existing.actor_user_id <> p_actor_user_id
       or v_existing.payload_hash <> p_payload_hash then
      raise exception using
        errcode = '23505',
        message = 'Idempotency request does not match original mutation';
    end if;
    if v_existing.result_status = 'succeeded' then
      workspace_aggregate_version := v_existing.result_workspace_version;
      result := jsonb_build_object(
        'appliedIds', '[]'::jsonb,
        'conflictIds', '[]'::jsonb,
        'skippedIds', '[]'::jsonb,
        'replayed', true
      );
      duplicate := true;
      return next;
      return;
    end if;
  end if;

  select po.*
    into v_workspace
  from public.partner_onboarding po
  where po.id = p_workspace_id
    and po.partner_slug = p_partner_slug
  for update of po;
  if not found or v_workspace.partner_record_id is null then
    raise exception using errcode = 'P0002', message = 'Onboarding workspace not found';
  end if;
  if v_workspace.aggregate_version <> p_expected_workspace_version then
    raise exception using errcode = '40001', message = 'Onboarding workspace revision conflict';
  end if;
  if v_workspace.status not in ('draft', 'commercially_blocked', 'setup_in_progress') then
    raise exception using errcode = '55000', message = 'Onboarding workspace is not eligible for prefill';
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
    'prefill_apply',
    p_request_id,
    p_actor_user_id,
    p_payload_hash,
    now() + interval '24 hours'
  );

  foreach v_value_id in array p_selected_value_ids loop
    select pv.*
      into v_value
    from public.partner_onboarding_prefill_values pv
    where pv.id = v_value_id
      and pv.workspace_id = p_workspace_id
    for update;

    if not found
       or v_value.review_status <> 'approved'
       or v_value.superseded_at is not null
       or v_value.partner_review_status <> 'not_applied' then
      v_skipped := array_append(v_skipped, v_value_id);
      continue;
    end if;

    select s.*
      into v_section
    from public.partner_onboarding_sections s
    where s.workspace_id = p_workspace_id
      and s.section_key = v_value.section_key
    for update;

    if not found
       or v_section.status not in ('not_started', 'in_progress')
       or v_section.revision <> v_value.base_section_revision then
      update public.partner_onboarding_prefill_values
      set
        review_status = 'conflict',
        reviewed_by = p_actor_user_id,
        reviewed_at = now()
      where id = v_value_id;
      v_conflicts := array_append(v_conflicts, v_value_id);
      v_conflict_count := v_conflict_count + 1;
      continue;
    end if;
  end loop;

  for v_update in
    select item
    from jsonb_array_elements(p_section_updates) item
  loop
    select coalesce(array_agg(value::uuid), '{}'::uuid[])
      into v_update_ids
    from jsonb_array_elements_text(
      coalesce(v_update->'valueIds', '[]'::jsonb)
    ) value;

    if cardinality(v_update_ids) = 0
       or v_update_ids && v_conflicts
       or v_update_ids && v_skipped then
      continue;
    end if;

    select s.*
      into v_section
    from public.partner_onboarding_sections s
    where s.workspace_id = p_workspace_id
      and s.section_key = v_update->>'sectionKey'
    for update;
    if not found
       or v_section.status not in ('not_started', 'in_progress')
       or v_section.revision <> (v_update->>'expectedRevision')::bigint then
      update public.partner_onboarding_prefill_values
      set
        review_status = 'conflict',
        reviewed_by = p_actor_user_id,
        reviewed_at = now()
      where id = any(v_update_ids)
        and review_status = 'approved';
      v_conflicts := v_conflicts || v_update_ids;
      v_conflict_count := v_conflict_count + cardinality(v_update_ids);
      continue;
    end if;

    foreach v_value_id in array v_update_ids loop
      select pv.*
        into v_value
      from public.partner_onboarding_prefill_values pv
      where pv.id = v_value_id
        and pv.workspace_id = p_workspace_id
        and pv.review_status = 'approved'
      for update;

      if not found
         or not (coalesce(v_update->'baseValues', '{}'::jsonb) ? v_value_id::text)
         or public.rcap_onboarding_prefill_current_value(
           p_workspace_id, v_value.section_key, v_value.field_key
         ) is distinct from v_update->'baseValues'->v_value_id::text then
        update public.partner_onboarding_prefill_values
        set
          review_status = 'conflict',
          reviewed_by = p_actor_user_id,
          reviewed_at = now()
        where id = v_value_id
          and review_status = 'approved';
        v_conflicts := array_append(v_conflicts, v_value_id);
        v_conflict_count := v_conflict_count + 1;
      end if;
    end loop;

    if v_update_ids && v_conflicts then
      continue;
    end if;

    v_new_revision := v_section.revision + 1;
    update public.partner_onboarding_sections
    set
      response_data = v_update->'responseData',
      revision = v_new_revision,
      status = 'in_progress',
      completion_percentage = (v_update->>'completionPercentage')::integer,
      missing_required_keys = coalesce(
        array(
          select jsonb_array_elements_text(
            coalesce(v_update->'missingRequiredKeys', '[]'::jsonb)
          )
        ),
        '{}'::text[]
      ),
      first_started_at = coalesce(first_started_at, now())
    where id = v_section.id;

    if v_section.section_key = 'organization_contacts' then
      update public.partner_onboarding_contacts c
      set deleted_at = now(), revision = c.revision + 1
      where c.workspace_id = p_workspace_id
        and c.deleted_at is null
        and not exists (
          select 1
          from jsonb_array_elements(
            coalesce(v_update->'collections'->'contacts', '[]'::jsonb)
          ) item
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
      from jsonb_array_elements(
        coalesce(v_update->'collections'->'contacts', '[]'::jsonb)
      ) item
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
    elsif v_section.section_key = 'staff_dashboard_plan' then
      update public.partner_onboarding_planned_users u
      set deleted_at = now(), revision = u.revision + 1
      where u.workspace_id = p_workspace_id
        and u.deleted_at is null
        and not exists (
          select 1
          from jsonb_array_elements(
            coalesce(v_update->'collections'->'planned_users', '[]'::jsonb)
          ) item
          where item->>'stable_row_id' = u.id::text
        );
      insert into public.partner_onboarding_planned_users (
        id, workspace_id, name, work_email, requested_role,
        special_permissions, training_attendee
      )
      select
        (item->>'stable_row_id')::uuid,
        p_workspace_id,
        item->>'name',
        lower(item->>'work_email'),
        item->>'requested_role',
        coalesce(array(
          select jsonb_array_elements_text(
            coalesce(item->'special_permissions', '[]'::jsonb)
          )
        ), '{}'::text[]),
        coalesce((item->>'training_attendee')::boolean, false)
      from jsonb_array_elements(
        coalesce(v_update->'collections'->'planned_users', '[]'::jsonb)
      ) item
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
    elsif v_section.section_key = 'support_referrals_reporting' then
      update public.partner_onboarding_report_recipients r
      set deleted_at = now(), revision = r.revision + 1
      where r.workspace_id = p_workspace_id
        and r.deleted_at is null
        and not exists (
          select 1
          from jsonb_array_elements(
            coalesce(v_update->'collections'->'report_recipients', '[]'::jsonb)
          ) item
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
      from jsonb_array_elements(
        coalesce(v_update->'collections'->'report_recipients', '[]'::jsonb)
      ) item
      on conflict (id) do update
      set
        name = excluded.name,
        work_email = excluded.work_email,
        revision = public.partner_onboarding_report_recipients.revision + 1,
        deleted_at = null
      where public.partner_onboarding_report_recipients.workspace_id = p_workspace_id;
    end if;

    update public.partner_onboarding_prefill_values
    set
      review_status = 'applied',
      applied_value_hash = proposed_value_hash,
      applied_section_revision = v_new_revision,
      applied_workspace_version = p_expected_workspace_version + 1,
      partner_review_status = 'pending',
      applied_at = now()
    where id = any(v_update_ids)
      and review_status = 'approved';

    v_applied := v_applied || v_update_ids;
    v_applied_count := v_applied_count + cardinality(v_update_ids);
  end loop;

  foreach v_value_id in array p_selected_value_ids loop
    if not (v_value_id = any(v_applied))
       and not (v_value_id = any(v_conflicts))
       and not (v_value_id = any(v_skipped)) then
      update public.partner_onboarding_prefill_values
      set
        review_status = 'conflict',
        reviewed_by = p_actor_user_id,
        reviewed_at = now()
      where id = v_value_id
        and workspace_id = p_workspace_id
        and review_status = 'approved';
      if found then
        v_conflicts := array_append(v_conflicts, v_value_id);
        v_conflict_count := v_conflict_count + 1;
      else
        v_skipped := array_append(v_skipped, v_value_id);
      end if;
    end if;
  end loop;

  if v_applied_count > 0 then
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

    update public.partner_onboarding_prefill_values
    set applied_workspace_version = workspace_aggregate_version
    where id = any(v_applied);

    update public.partner_onboarding_prefill_batches b
    set
      aggregate_version = aggregate_version + 1,
      status = case
        when exists (
          select 1 from public.partner_onboarding_prefill_values pv
          where pv.batch_id = b.id
            and pv.review_status in ('proposed', 'approved', 'conflict')
        ) then 'partially_applied'
        else 'applied'
      end,
      applied_at = coalesce(applied_at, now())
    where exists (
      select 1
      from public.partner_onboarding_prefill_values pv
      where pv.batch_id = b.id
        and pv.id = any(v_applied)
    );

    insert into public.partner_onboarding_activity (
      workspace_id, event_type, status_code, summary_code, owner_type,
      actor_user_id, request_id, dedupe_key
    ) values (
      p_workspace_id, 'prefill_applied', 'pending_partner_review',
      'prefill_applied', 'legalease', p_actor_user_id, p_request_id,
      p_request_id::text || ':prefill_applied'
    );

    insert into public.partner_onboarding_integration_events (
      workspace_id, partner_record_id, event_type,
      workspace_aggregate_version, workspace_status,
      completion_percentage, blocker_code, next_action_code,
      next_action_owner, target_launch_date, idempotency_key
    )
    select
      po.id, po.partner_record_id, 'rcap_onboarding_prefill_applied',
      po.aggregate_version, po.status, po.completion_percentage,
      po.blocker_code, po.next_action_code, po.next_action_owner,
      po.target_launch_date, p_request_id::text || ':prefill_applied'
    from public.partner_onboarding po
    where po.id = p_workspace_id;
  else
    workspace_aggregate_version := v_workspace.aggregate_version;
  end if;

  if v_conflict_count > 0 then
    insert into public.partner_onboarding_activity (
      workspace_id, event_type, status_code, summary_code, owner_type,
      actor_user_id, request_id, dedupe_key
    ) values (
      p_workspace_id, 'prefill_apply_conflict', 'conflict',
      'prefill_apply_conflict', 'legalease', p_actor_user_id, p_request_id,
      p_request_id::text || ':prefill_apply_conflict'
    );
  end if;

  result := jsonb_build_object(
    'appliedIds', to_jsonb(v_applied),
    'conflictIds', to_jsonb(v_conflicts),
    'skippedIds', to_jsonb(v_skipped)
  );
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

-------------------------------------------------------------------------------
-- 8. Partner section confirmation, atomically joined to the existing save.
-------------------------------------------------------------------------------

create or replace function public.rcap_service_save_onboarding_section_with_prefill(
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
  v_saved record;
  v_pending integer := 0;
  v_modified integer := 0;
  v_partner_record_id uuid;
begin
  select *
    into v_saved
  from public.rcap_service_save_onboarding_section(
    p_partner_slug,
    p_actor_user_id,
    p_workspace_id,
    p_section_key,
    p_expected_revision,
    p_expected_workspace_version,
    p_response_data,
    p_collections,
    p_mode,
    p_section_completion,
    p_missing_required_keys,
    p_workspace_completion,
    p_blocker_code,
    p_next_action_code,
    p_next_action_owner,
    p_request_id,
    p_payload_hash
  );

  if p_mode = 'section_complete' and not v_saved.duplicate then
    select count(*)::integer
      into v_pending
    from public.partner_onboarding_prefill_values pv
    where pv.workspace_id = p_workspace_id
      and pv.section_key = p_section_key
      and pv.review_status = 'applied'
      and pv.partner_review_status = 'pending';

    if v_pending > 0 then
      update public.partner_onboarding_prefill_values pv
      set
        partner_review_status = case
          when public.rcap_onboarding_prefill_current_value(
            p_workspace_id, p_section_key, pv.field_key
          ) = pv.proposed_value then 'confirmed'
          when public.rcap_onboarding_prefill_current_value(
            p_workspace_id, p_section_key, pv.field_key
          ) in ('null'::jsonb, '""'::jsonb, '[]'::jsonb) then 'rejected'
          else 'modified'
        end,
        partner_reviewed_at = now(),
        partner_reviewed_section_revision = v_saved.section_revision,
        partner_modified = public.rcap_onboarding_prefill_current_value(
          p_workspace_id, p_section_key, pv.field_key
        ) <> pv.proposed_value
      where pv.workspace_id = p_workspace_id
        and pv.section_key = p_section_key
        and pv.review_status = 'applied'
        and pv.partner_review_status = 'pending';

      select count(*)::integer
        into v_modified
      from public.partner_onboarding_prefill_values pv
      where pv.workspace_id = p_workspace_id
        and pv.section_key = p_section_key
        and pv.review_status = 'applied'
        and pv.partner_reviewed_section_revision = v_saved.section_revision
        and pv.partner_review_status in ('modified', 'rejected');

      insert into public.partner_onboarding_activity (
        workspace_id, event_type, section_key, status_code, summary_code,
        owner_type, actor_user_id, request_id, dedupe_key
      ) values (
        p_workspace_id,
        case when v_modified > 0
          then 'prefill_section_modified'
          else 'prefill_section_confirmed'
        end,
        p_section_key,
        case when v_modified > 0
          then 'partner_modified'
          else 'partner_confirmed'
        end,
        case when v_modified > 0
          then 'prefill_section_modified'
          else 'prefill_section_confirmed'
        end,
        'partner',
        p_actor_user_id,
        p_request_id,
        p_request_id::text || ':prefill_reviewed'
      )
      on conflict do nothing;

      select po.partner_record_id
        into v_partner_record_id
      from public.partner_onboarding po
      where po.id = p_workspace_id;

      insert into public.partner_onboarding_integration_events (
        workspace_id, partner_record_id, event_type,
        workspace_aggregate_version, workspace_status,
        completion_percentage, blocker_code, next_action_code,
        next_action_owner, target_launch_date, section_key,
        section_status, idempotency_key
      )
      select
        po.id, v_partner_record_id, 'rcap_onboarding_prefill_reviewed',
        po.aggregate_version, po.status, po.completion_percentage,
        po.blocker_code, po.next_action_code, po.next_action_owner,
        po.target_launch_date, p_section_key, v_saved.section_status,
        p_request_id::text || ':prefill_reviewed'
      from public.partner_onboarding po
      where po.id = p_workspace_id
      on conflict do nothing;
    end if;
  end if;

  section_revision := v_saved.section_revision;
  workspace_aggregate_version := v_saved.workspace_aggregate_version;
  section_status := v_saved.section_status;
  duplicate := v_saved.duplicate;
  return next;
end;
$$;

-------------------------------------------------------------------------------
-- 9. Least-privilege execution and table grants.
-------------------------------------------------------------------------------

revoke execute on function public.rcap_service_prepare_onboarding_prefill(
  text, uuid, uuid, uuid, text, text, text, text, jsonb
) from public, anon, authenticated;
revoke execute on function public.rcap_service_review_onboarding_prefill(
  text, uuid, uuid, uuid, bigint, text, uuid, text
) from public, anon, authenticated;
revoke execute on function public.rcap_service_apply_onboarding_prefill(
  text, uuid, uuid, bigint, uuid[], jsonb, integer, text, text, text, uuid, text
) from public, anon, authenticated;
revoke execute on function public.rcap_service_save_onboarding_section_with_prefill(
  text, uuid, uuid, text, bigint, bigint, jsonb, jsonb, text, integer, text[],
  integer, text, text, text, uuid, text
) from public, anon, authenticated;

grant execute on function public.rcap_service_prepare_onboarding_prefill(
  text, uuid, uuid, uuid, text, text, text, text, jsonb
) to service_role;
grant execute on function public.rcap_service_review_onboarding_prefill(
  text, uuid, uuid, uuid, bigint, text, uuid, text
) to service_role;
grant execute on function public.rcap_service_apply_onboarding_prefill(
  text, uuid, uuid, bigint, uuid[], jsonb, integer, text, text, text, uuid, text
) to service_role;
grant execute on function public.rcap_service_save_onboarding_section_with_prefill(
  text, uuid, uuid, text, bigint, bigint, jsonb, jsonb, text, integer, text[],
  integer, text, text, text, uuid, text
) to service_role;

grant select, insert, update on public.partner_onboarding_prefill_batches
  to service_role;
grant select, insert, update on public.partner_onboarding_prefill_values
  to service_role;

commit;
