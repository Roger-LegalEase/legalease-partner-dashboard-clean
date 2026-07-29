-- Phase 45: RCAP Partner Onboarding Phase 2A artifacts.
--
-- Forward-only and additive. This migration stores versioned partner documents
-- generated from the existing Phase 1 canonical onboarding data. It does not
-- create a second onboarding store, apply a migration remotely, invite users,
-- publish pages, release access codes, alter payments/entitlements, or activate
-- a program. It adds no launch-check or launch-approval table: Lane B2 owns
-- those and will add its own additive migration.
--
-- Apply after phase-44-rcap-onboarding-prefill.sql.

begin;

-------------------------------------------------------------------------------
-- 1. Artifacts, versions, and reviews.
-------------------------------------------------------------------------------

create table public.partner_onboarding_artifacts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null
    references public.partner_onboarding(id) on delete cascade,
  partner_record_id uuid not null
    references public.partner_records(id) on delete cascade,
  artifact_type text not null,
  current_version_id uuid,
  lifecycle_status text not null default 'not_generated',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint partner_onboarding_artifacts_workspace_type_unique
    unique (workspace_id, artifact_type),
  -- All six types are registered now so Lane B2 adds generators rather than
  -- schema. Only implementation_brief has a generator in this release.
  constraint partner_onboarding_artifacts_type_check
    check (artifact_type in (
      'implementation_brief',
      'operations_escalation_plan',
      'dashboard_user_reporting_matrix',
      'staff_quick_start_guide',
      'partner_launch_kit',
      'co_branded_page_configuration'
    )),
  constraint partner_onboarding_artifacts_lifecycle_check
    check (lifecycle_status in (
      'not_generated',
      'unavailable_in_release',
      'draft',
      'in_review',
      'approved',
      'superseded',
      'generation_failed'
    ))
);

create index partner_onboarding_artifacts_workspace_idx
  on public.partner_onboarding_artifacts(workspace_id);
create index partner_onboarding_artifacts_partner_idx
  on public.partner_onboarding_artifacts(partner_record_id);

create table public.partner_onboarding_artifact_versions (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid not null
    references public.partner_onboarding_artifacts(id) on delete cascade,
  workspace_id uuid not null
    references public.partner_onboarding(id) on delete cascade,
  version_number integer not null,

  -- Provenance. These record exactly what the version was generated from. They
  -- are NOT used as a gate on staleness: drift is detected by comparing the
  -- recomputed projection against normalized_snapshot, because values such as
  -- partner_entitlement and partner_records.selected_package_id sit outside the
  -- workspace aggregate and bump no revision counter here.
  source_workspace_version bigint not null,
  source_section_revisions jsonb not null default '{}'::jsonb,
  source_asset_versions jsonb not null default '{}'::jsonb,

  -- The canonical projected value set this version rendered from, and its hash.
  normalized_snapshot jsonb not null default '{}'::jsonb,
  snapshot_hash text not null,

  -- Hand-maintained constant in the generator module. Bumping it is a
  -- fleet-wide invalidation event: every approved artifact of this type for
  -- every partner becomes stale at once. It is pinned by a test so that a bump
  -- cannot ride along in a refactor.
  generator_version text not null,

  rendered_content jsonb not null default '{}'::jsonb,

  generation_status text not null default 'pending',
  generation_error_code text,

  approval_status text not null default 'draft',
  partner_review_status text not null default 'not_requested',
  partner_visible_instructions text,

  source_drift_invalidated_at timestamptz,
  source_drift_fields text[] not null default '{}',
  invalidated_against_snapshot_hash text,

  generated_by uuid not null references auth.users(id),
  generated_at timestamptz not null default now(),
  superseded_at timestamptz,
  request_id uuid not null,

  constraint partner_onboarding_artifact_versions_number_unique
    unique (artifact_id, version_number),
  -- A duplicate generate request is idempotent.
  constraint partner_onboarding_artifact_versions_request_unique
    unique (artifact_id, request_id),
  constraint partner_onboarding_artifact_versions_number_check
    check (version_number > 0),
  constraint partner_onboarding_artifact_versions_generation_check
    check (generation_status in ('pending', 'succeeded', 'failed')),
  constraint partner_onboarding_artifact_versions_approval_check
    check (approval_status in (
      'draft',
      'ready_for_review',
      'changes_requested',
      'approved',
      'superseded',
      'generation_failed'
    )),
  constraint partner_onboarding_artifact_versions_partner_review_check
    check (partner_review_status in (
      'not_requested',
      'awaiting_partner',
      'changes_requested',
      'approved'
    )),
  -- A failed generation can never present as an approvable document.
  constraint partner_onboarding_artifact_versions_failed_consistency_check
    check (
      (generation_status = 'failed') = (approval_status = 'generation_failed')
    ),
  constraint partner_onboarding_artifact_versions_failure_reason_check
    check (
      (generation_status = 'failed') = (generation_error_code is not null)
    ),
  constraint partner_onboarding_artifact_versions_snapshot_hash_check
    check (snapshot_hash ~ '^[a-f0-9]{64}$'),
  constraint partner_onboarding_artifact_versions_generator_version_check
    check (
      char_length(generator_version) between 1 and 120
      and generator_version ~ '^[a-z0-9_]+$'
    ),
  constraint partner_onboarding_artifact_versions_instructions_check
    check (
      partner_visible_instructions is null
      or char_length(partner_visible_instructions) between 1 and 5000
    ),
  constraint partner_onboarding_artifact_versions_drift_pair_check
    check (
      (source_drift_invalidated_at is null
        and invalidated_against_snapshot_hash is null)
      or (source_drift_invalidated_at is not null
        and invalidated_against_snapshot_hash is not null)
    )
);

create index partner_onboarding_artifact_versions_artifact_idx
  on public.partner_onboarding_artifact_versions(artifact_id, version_number desc);
create index partner_onboarding_artifact_versions_workspace_idx
  on public.partner_onboarding_artifact_versions(workspace_id);

alter table public.partner_onboarding_artifacts
  add constraint partner_onboarding_artifacts_current_version_fk
  foreign key (current_version_id)
  references public.partner_onboarding_artifact_versions(id)
  on delete set null;

create table public.partner_onboarding_artifact_reviews (
  id uuid primary key default gen_random_uuid(),
  artifact_version_id uuid not null
    references public.partner_onboarding_artifact_versions(id) on delete cascade,
  workspace_id uuid not null
    references public.partner_onboarding(id) on delete cascade,
  reviewer_type text not null,
  reviewer_user_id uuid not null references auth.users(id),
  decision text not null,
  comments text,
  reviewed_at timestamptz not null default now(),
  request_id uuid not null,
  constraint partner_onboarding_artifact_reviews_request_unique
    unique (artifact_version_id, request_id),
  constraint partner_onboarding_artifact_reviews_reviewer_type_check
    check (reviewer_type in ('legalease', 'partner')),
  constraint partner_onboarding_artifact_reviews_decision_check
    check (decision in ('approve', 'request_changes', 'reject')),
  constraint partner_onboarding_artifact_reviews_comments_check
    check (
      comments is null
      or char_length(comments) between 1 and 5000
    ),
  -- A change request or rejection must say why.
  constraint partner_onboarding_artifact_reviews_reason_required_check
    check (
      decision = 'approve'
      or (comments is not null and char_length(btrim(comments)) > 0)
    )
);

create index partner_onboarding_artifact_reviews_version_idx
  on public.partner_onboarding_artifact_reviews(artifact_version_id, reviewed_at desc);
create index partner_onboarding_artifact_reviews_workspace_idx
  on public.partner_onboarding_artifact_reviews(workspace_id);

comment on column public.partner_onboarding_artifact_versions.generator_version is
  'Hand-maintained generator constant. A bump invalidates every approved artifact of this type for every partner.';
comment on column public.partner_onboarding_artifact_versions.normalized_snapshot is
  'Projected canonical values only. Never document bytes, signed URLs, or internal review comments.';

-------------------------------------------------------------------------------
-- 2. Activity linkage and the one-event-per-invalidation guarantee.
-------------------------------------------------------------------------------

alter table public.partner_onboarding_activity
  add column if not exists artifact_version_id uuid
    references public.partner_onboarding_artifact_versions(id) on delete cascade;

-- Backs the concurrency claim: two internal reads that both observe drift can
-- produce at most one activity event, independent of application code.
create unique index partner_onboarding_activity_artifact_event_unique
  on public.partner_onboarding_activity(artifact_version_id, event_type)
  where artifact_version_id is not null;

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
      'prefill_section_modified',
      'artifact_generated',
      'artifact_generation_failed',
      'artifact_changes_requested',
      'artifact_approved',
      'artifact_superseded',
      'artifact_partner_reviewed',
      'artifact_approval_invalidated'
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
      'rcap_onboarding_prefill_reviewed',
      'rcap_onboarding_artifact_generated',
      'rcap_onboarding_artifact_reviewed',
      'rcap_onboarding_artifact_invalidated'
    ));

-------------------------------------------------------------------------------
-- 3. updated_at maintenance.
-------------------------------------------------------------------------------

create or replace function public.set_partner_onboarding_artifact_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger partner_onboarding_artifacts_updated_at
before update on public.partner_onboarding_artifacts
for each row
execute function public.set_partner_onboarding_artifact_updated_at();

-------------------------------------------------------------------------------
-- 4. RLS and column-bounded partner-safe reads.
-------------------------------------------------------------------------------

alter table public.partner_onboarding_artifacts enable row level security;
alter table public.partner_onboarding_artifact_versions enable row level security;
alter table public.partner_onboarding_artifact_reviews enable row level security;

create policy partner_onboarding_artifacts_all_internal
on public.partner_onboarding_artifacts
for all
to authenticated
using (public.is_internal_admin())
with check (public.is_internal_admin());

create policy partner_onboarding_artifact_versions_all_internal
on public.partner_onboarding_artifact_versions
for all
to authenticated
using (public.is_internal_admin())
with check (public.is_internal_admin());

create policy partner_onboarding_artifact_reviews_all_internal
on public.partner_onboarding_artifact_reviews
for all
to authenticated
using (public.is_internal_admin())
with check (public.is_internal_admin());

-- Tenant scoping. A partner may read only its own workspace's artifacts, and
-- only versions that generated successfully. Anonymous access is denied because
-- every policy targets the authenticated role only.
create policy partner_onboarding_artifacts_select_partner
on public.partner_onboarding_artifacts
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

create policy partner_onboarding_artifact_versions_select_partner
on public.partner_onboarding_artifact_versions
for select
to authenticated
using (
  generation_status = 'succeeded'
  and exists (
    select 1
    from public.partner_onboarding po
    where po.id = workspace_id
      and po.partner_slug = public.current_partner_slug()
  )
);

-- A partner sees only its own review decisions. LegalEase review comments are
-- internal and are never exposed; partner-directed instructions travel through
-- partner_visible_instructions on the version instead.
create policy partner_onboarding_artifact_reviews_select_partner
on public.partner_onboarding_artifact_reviews
for select
to authenticated
using (
  reviewer_type = 'partner'
  and exists (
    select 1
    from public.partner_onboarding po
    where po.id = workspace_id
      and po.partner_slug = public.current_partner_slug()
  )
);

create or replace view public.partner_onboarding_artifact_versions_safe
with (security_barrier = true, security_invoker = true)
as
select
  id,
  artifact_id,
  workspace_id,
  version_number,
  generator_version,
  rendered_content,
  generation_status,
  approval_status,
  partner_review_status,
  partner_visible_instructions,
  source_drift_invalidated_at,
  generated_at,
  superseded_at
from public.partner_onboarding_artifact_versions
where generation_status = 'succeeded';

revoke all on table public.partner_onboarding_artifacts
  from public, anon, authenticated;
revoke all on table public.partner_onboarding_artifact_versions
  from public, anon, authenticated;
revoke all on table public.partner_onboarding_artifact_reviews
  from public, anon, authenticated;
revoke all on table public.partner_onboarding_artifact_versions_safe
  from public, anon, authenticated;

grant select (
  id,
  workspace_id,
  artifact_type,
  current_version_id,
  lifecycle_status,
  created_at,
  updated_at
) on public.partner_onboarding_artifacts to authenticated;

-- normalized_snapshot, source_*, snapshot_hash, generated_by, request_id, and
-- the drift bookkeeping columns are withheld from the browser.
grant select (
  id,
  artifact_id,
  workspace_id,
  version_number,
  generator_version,
  rendered_content,
  generation_status,
  approval_status,
  partner_review_status,
  partner_visible_instructions,
  source_drift_invalidated_at,
  generated_at,
  superseded_at
) on public.partner_onboarding_artifact_versions to authenticated;

grant select (
  id,
  artifact_version_id,
  workspace_id,
  reviewer_type,
  decision,
  comments,
  reviewed_at
) on public.partner_onboarding_artifact_reviews to authenticated;

grant select on public.partner_onboarding_artifact_versions_safe to authenticated;

commit;

begin;

-------------------------------------------------------------------------------
-- 5. Service-only mutation surface.
--
-- Every function is SECURITY INVOKER with an empty fixed search_path, revoked
-- from public/anon/authenticated, and granted only to service_role. There is no
-- generic patch entry point: each function performs one named operation and
-- revalidates the supplied actor against the workspace it names.
-------------------------------------------------------------------------------

-- Registers all six artifact types for a workspace. Types without a generator
-- in this release are registered as unavailable_in_release so the interface can
-- show them honestly instead of rendering a broken or empty row.
create or replace function public.rcap_service_ensure_onboarding_artifacts(
  p_partner_slug text,
  p_workspace_id uuid,
  p_generatable_types text[]
)
returns setof public.partner_onboarding_artifacts
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_partner_record_id uuid;
  v_type text;
begin
  select po.partner_record_id into v_partner_record_id
  from public.partner_onboarding po
  where po.id = p_workspace_id
    and po.partner_slug = p_partner_slug;

  if v_partner_record_id is null then
    raise exception 'workspace_not_found' using errcode = 'P0002';
  end if;

  foreach v_type in array array[
    'implementation_brief',
    'operations_escalation_plan',
    'dashboard_user_reporting_matrix',
    'staff_quick_start_guide',
    'partner_launch_kit',
    'co_branded_page_configuration'
  ]
  loop
    insert into public.partner_onboarding_artifacts (
      workspace_id, partner_record_id, artifact_type, lifecycle_status
    )
    values (
      p_workspace_id,
      v_partner_record_id,
      v_type,
      case when v_type = any(p_generatable_types)
        then 'not_generated'
        else 'unavailable_in_release'
      end
    )
    on conflict (workspace_id, artifact_type) do nothing;
  end loop;

  -- A type that gains a generator in a later release stops being unavailable.
  update public.partner_onboarding_artifacts
  set lifecycle_status = 'not_generated'
  where workspace_id = p_workspace_id
    and lifecycle_status = 'unavailable_in_release'
    and artifact_type = any(p_generatable_types);

  return query
  select *
  from public.partner_onboarding_artifacts
  where workspace_id = p_workspace_id;
end;
$$;

create or replace function public.rcap_service_generate_onboarding_artifact_version(
  p_partner_slug text,
  p_actor_user_id uuid,
  p_workspace_id uuid,
  p_artifact_type text,
  p_request_id uuid,
  p_source_workspace_version bigint,
  p_source_section_revisions jsonb,
  p_source_asset_versions jsonb,
  p_normalized_snapshot jsonb,
  p_snapshot_hash text,
  p_generator_version text,
  p_rendered_content jsonb,
  p_generation_status text,
  p_generation_error_code text
)
returns table (
  version_id uuid,
  version_number integer,
  duplicate boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_artifact public.partner_onboarding_artifacts%rowtype;
  v_existing public.partner_onboarding_artifact_versions%rowtype;
  v_next integer;
  v_new public.partner_onboarding_artifact_versions%rowtype;
begin
  if p_generation_status not in ('succeeded', 'failed') then
    raise exception 'invalid_generation_status' using errcode = '22023';
  end if;

  select a.* into v_artifact
  from public.partner_onboarding_artifacts a
  join public.partner_onboarding po on po.id = a.workspace_id
  where a.workspace_id = p_workspace_id
    and a.artifact_type = p_artifact_type
    and po.partner_slug = p_partner_slug
  for update of a;

  if v_artifact.id is null then
    raise exception 'artifact_not_found' using errcode = 'P0002';
  end if;

  if v_artifact.lifecycle_status = 'unavailable_in_release' then
    raise exception 'artifact_generator_unavailable' using errcode = '0A000';
  end if;

  -- Idempotency: the same request id returns the version it already created.
  select v.* into v_existing
  from public.partner_onboarding_artifact_versions v
  where v.artifact_id = v_artifact.id
    and v.request_id = p_request_id;

  if v_existing.id is not null then
    version_id := v_existing.id;
    version_number := v_existing.version_number;
    duplicate := true;
    return next;
    return;
  end if;

  select coalesce(max(v.version_number), 0) + 1 into v_next
  from public.partner_onboarding_artifact_versions v
  where v.artifact_id = v_artifact.id;

  insert into public.partner_onboarding_artifact_versions (
    artifact_id, workspace_id, version_number,
    source_workspace_version, source_section_revisions, source_asset_versions,
    normalized_snapshot, snapshot_hash, generator_version, rendered_content,
    generation_status, generation_error_code,
    approval_status, generated_by, request_id
  )
  values (
    v_artifact.id, p_workspace_id, v_next,
    p_source_workspace_version, p_source_section_revisions, p_source_asset_versions,
    p_normalized_snapshot, p_snapshot_hash, p_generator_version, p_rendered_content,
    p_generation_status, p_generation_error_code,
    case when p_generation_status = 'failed' then 'generation_failed' else 'draft' end,
    p_actor_user_id, p_request_id
  )
  returning * into v_new;

  -- A superseded prior version stays readable in history; it is never rewritten.
  update public.partner_onboarding_artifact_versions
  set approval_status = 'superseded',
      superseded_at = now()
  where artifact_id = v_artifact.id
    and id <> v_new.id
    and approval_status <> 'generation_failed'
    and superseded_at is null;

  update public.partner_onboarding_artifacts
  set current_version_id = v_new.id,
      lifecycle_status = case
        when p_generation_status = 'failed' then 'generation_failed'
        else 'draft'
      end
  where id = v_artifact.id;

  insert into public.partner_onboarding_activity (
    workspace_id, event_type, owner_type, summary_code, status_code,
    artifact_version_id
  )
  values (
    p_workspace_id,
    case when p_generation_status = 'failed'
      then 'artifact_generation_failed'
      else 'artifact_generated'
    end,
    'legalease',
    p_artifact_type,
    p_generation_status,
    v_new.id
  );

  version_id := v_new.id;
  version_number := v_new.version_number;
  duplicate := false;
  return next;
end;
$$;

create or replace function public.rcap_service_review_onboarding_artifact(
  p_partner_slug text,
  p_actor_user_id uuid,
  p_reviewer_type text,
  p_artifact_version_id uuid,
  p_decision text,
  p_comments text,
  p_partner_visible_instructions text,
  p_request_id uuid
)
returns table (
  approval_status text,
  partner_review_status text,
  duplicate boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_version public.partner_onboarding_artifact_versions%rowtype;
  v_artifact public.partner_onboarding_artifacts%rowtype;
  v_existing uuid;
begin
  if p_reviewer_type not in ('legalease', 'partner') then
    raise exception 'invalid_reviewer_type' using errcode = '22023';
  end if;
  if p_decision not in ('approve', 'request_changes', 'reject') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;

  select v.* into v_version
  from public.partner_onboarding_artifact_versions v
  join public.partner_onboarding po on po.id = v.workspace_id
  where v.id = p_artifact_version_id
    and po.partner_slug = p_partner_slug
  for update of v;

  if v_version.id is null then
    raise exception 'artifact_version_not_found' using errcode = 'P0002';
  end if;

  select a.* into v_artifact
  from public.partner_onboarding_artifacts a
  where a.id = v_version.artifact_id;

  select r.id into v_existing
  from public.partner_onboarding_artifact_reviews r
  where r.artifact_version_id = p_artifact_version_id
    and r.request_id = p_request_id;

  if v_existing is not null then
    approval_status := v_version.approval_status;
    partner_review_status := v_version.partner_review_status;
    duplicate := true;
    return next;
    return;
  end if;

  -- A failed generation is not reviewable.
  if v_version.generation_status <> 'succeeded' then
    raise exception 'artifact_generation_failed' using errcode = '0A000';
  end if;

  -- A stale version cannot be approved. It stays readable and can still be
  -- rejected or have changes requested, but approval requires regeneration.
  if p_decision = 'approve' and v_version.source_drift_invalidated_at is not null then
    raise exception 'artifact_version_stale' using errcode = '55000';
  end if;

  if v_version.approval_status = 'superseded' and p_decision = 'approve' then
    raise exception 'artifact_version_superseded' using errcode = '55000';
  end if;

  insert into public.partner_onboarding_artifact_reviews (
    artifact_version_id, workspace_id, reviewer_type, reviewer_user_id,
    decision, comments, request_id
  )
  values (
    p_artifact_version_id, v_version.workspace_id, p_reviewer_type,
    p_actor_user_id, p_decision, p_comments, p_request_id
  );

  if p_reviewer_type = 'legalease' then
    -- LegalEase controls the document's own approval state and retains control
    -- of legal and platform language. The partner review state is untouched
    -- except that requesting changes routes the version back to the partner.
    -- The alias is required: this function's OUT parameters share names with
    -- these columns, so unqualified references would be ambiguous.
    update public.partner_onboarding_artifact_versions v
    set approval_status = case p_decision
          when 'approve' then 'approved'
          when 'request_changes' then 'changes_requested'
          else 'changes_requested'
        end,
        partner_visible_instructions = coalesce(
          p_partner_visible_instructions, v.partner_visible_instructions
        ),
        partner_review_status = case
          when p_decision = 'approve' and v.partner_review_status = 'not_requested'
            then 'awaiting_partner'
          else v.partner_review_status
        end
    where v.id = p_artifact_version_id
    returning v.* into v_version;
  else
    -- The partner approves only partner-owned factual and branding content. It
    -- cannot move approval_status, publish, or activate anything.
    update public.partner_onboarding_artifact_versions v
    set partner_review_status = case p_decision
          when 'approve' then 'approved'
          else 'changes_requested'
        end
    where v.id = p_artifact_version_id
    returning v.* into v_version;
  end if;

  update public.partner_onboarding_artifacts
  set lifecycle_status = case
        when v_version.approval_status = 'approved' then 'approved'
        when v_version.approval_status = 'changes_requested' then 'in_review'
        else lifecycle_status
      end
  where id = v_artifact.id;

  insert into public.partner_onboarding_activity (
    workspace_id, event_type, owner_type, summary_code, status_code,
    artifact_version_id
  )
  values (
    v_version.workspace_id,
    case
      when p_reviewer_type = 'partner' then 'artifact_partner_reviewed'
      when p_decision = 'approve' then 'artifact_approved'
      else 'artifact_changes_requested'
    end,
    case when p_reviewer_type = 'partner' then 'partner' else 'legalease' end,
    v_artifact.artifact_type,
    p_decision,
    p_artifact_version_id
  )
  on conflict do nothing;

  approval_status := v_version.approval_status;
  partner_review_status := v_version.partner_review_status;
  duplicate := false;
  return next;
end;
$$;

-- Records that a version's source data has drifted. Called only from the
-- internal read path, and only after application code has already established
-- that the recomputed snapshot hash differs. The conditional UPDATE is what
-- makes concurrent callers safe: the second caller's WHERE no longer matches,
-- so it updates nothing and inserts no activity event.
create or replace function public.rcap_service_invalidate_onboarding_artifact_version(
  p_partner_slug text,
  p_artifact_version_id uuid,
  p_current_snapshot_hash text,
  p_drift_fields text[]
)
returns table (
  invalidated boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_updated public.partner_onboarding_artifact_versions%rowtype;
  v_artifact_type text;
begin
  update public.partner_onboarding_artifact_versions v
  set source_drift_invalidated_at = now(),
      source_drift_fields = p_drift_fields,
      invalidated_against_snapshot_hash = p_current_snapshot_hash
  from public.partner_onboarding po
  where v.id = p_artifact_version_id
    and po.id = v.workspace_id
    and po.partner_slug = p_partner_slug
    and v.generation_status = 'succeeded'
    and v.source_drift_invalidated_at is null
    and v.snapshot_hash <> p_current_snapshot_hash
  returning v.* into v_updated;

  if v_updated.id is null then
    invalidated := false;
    return next;
    return;
  end if;

  select a.artifact_type into v_artifact_type
  from public.partner_onboarding_artifacts a
  where a.id = v_updated.artifact_id;

  insert into public.partner_onboarding_activity (
    workspace_id, event_type, owner_type, summary_code, status_code,
    artifact_version_id
  )
  values (
    v_updated.workspace_id,
    'artifact_approval_invalidated',
    'system',
    v_artifact_type,
    'source_changed',
    v_updated.id
  )
  on conflict do nothing;

  invalidated := true;
  return next;
end;
$$;

create or replace function public.rcap_service_supersede_onboarding_artifact_version(
  p_partner_slug text,
  p_actor_user_id uuid,
  p_artifact_version_id uuid
)
returns table (
  superseded boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_updated public.partner_onboarding_artifact_versions%rowtype;
  v_artifact_type text;
begin
  update public.partner_onboarding_artifact_versions v
  set approval_status = 'superseded',
      superseded_at = now()
  from public.partner_onboarding po
  where v.id = p_artifact_version_id
    and po.id = v.workspace_id
    and po.partner_slug = p_partner_slug
    and v.superseded_at is null
    and v.generation_status = 'succeeded'
  returning v.* into v_updated;

  if v_updated.id is null then
    superseded := false;
    return next;
    return;
  end if;

  select a.artifact_type into v_artifact_type
  from public.partner_onboarding_artifacts a
  where a.id = v_updated.artifact_id;

  update public.partner_onboarding_artifacts
  set lifecycle_status = 'superseded'
  where id = v_updated.artifact_id
    and current_version_id = v_updated.id;

  insert into public.partner_onboarding_activity (
    workspace_id, event_type, owner_type, summary_code, status_code,
    artifact_version_id
  )
  values (
    v_updated.workspace_id, 'artifact_superseded', 'legalease',
    v_artifact_type, 'superseded', v_updated.id
  )
  on conflict do nothing;

  superseded := true;
  return next;
end;
$$;

revoke execute on function public.rcap_service_ensure_onboarding_artifacts(
  text, uuid, text[]
) from public, anon, authenticated;
revoke execute on function public.rcap_service_generate_onboarding_artifact_version(
  text, uuid, uuid, text, uuid, bigint, jsonb, jsonb, jsonb, text, text, jsonb, text, text
) from public, anon, authenticated;
revoke execute on function public.rcap_service_review_onboarding_artifact(
  text, uuid, text, uuid, text, text, text, uuid
) from public, anon, authenticated;
revoke execute on function public.rcap_service_invalidate_onboarding_artifact_version(
  text, uuid, text, text[]
) from public, anon, authenticated;
revoke execute on function public.rcap_service_supersede_onboarding_artifact_version(
  text, uuid, uuid
) from public, anon, authenticated;

grant execute on function public.rcap_service_ensure_onboarding_artifacts(
  text, uuid, text[]
) to service_role;
grant execute on function public.rcap_service_generate_onboarding_artifact_version(
  text, uuid, uuid, text, uuid, bigint, jsonb, jsonb, jsonb, text, text, jsonb, text, text
) to service_role;
grant execute on function public.rcap_service_review_onboarding_artifact(
  text, uuid, text, uuid, text, text, text, uuid
) to service_role;
grant execute on function public.rcap_service_invalidate_onboarding_artifact_version(
  text, uuid, text, text[]
) to service_role;
grant execute on function public.rcap_service_supersede_onboarding_artifact_version(
  text, uuid, uuid
) to service_role;

grant select, insert, update on public.partner_onboarding_artifacts to service_role;
grant select, insert, update on public.partner_onboarding_artifact_versions to service_role;
grant select, insert on public.partner_onboarding_artifact_reviews to service_role;

commit;
