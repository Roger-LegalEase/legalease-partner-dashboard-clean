-- Phase 47: RCAP Partner Onboarding Phase 2A launch readiness.
--
-- Forward-only and additive. This migration stores the *recorded* half of
-- launch readiness: human decisions about manual checks, the two launch
-- approvals, and the invalidation of both when source data moves. Automated
-- check state is never stored — it is computed on every read from the same
-- canonical projection the artifact generators use, exactly as staleness is,
-- so an unchanged readiness read issues no statement at all.
--
-- It does not apply a migration remotely, invite users, publish a page,
-- release access codes, alter payments or entitlements, or activate, pause or
-- reactivate a program. It adds no capability to do any of those.
--
-- Apply after phase-46-rcap-onboarding-media-contact-role.sql.

begin;

-------------------------------------------------------------------------------
-- 1. Last observed readiness state, so a transition can be detected without a
--    second read and without writing on an unchanged read.
-------------------------------------------------------------------------------

alter table public.partner_onboarding
  add column if not exists launch_readiness_state text;

alter table public.partner_onboarding
  drop constraint if exists partner_onboarding_launch_readiness_state_check;
alter table public.partner_onboarding
  add constraint partner_onboarding_launch_readiness_state_check
    check (launch_readiness_state is null
      or launch_readiness_state in ('ready', 'not_ready'));

comment on column public.partner_onboarding.launch_readiness_state is
  'Last readiness state observed by an internal read. Records the transition only; readiness itself is always recomputed and is never served from this column.';

-- Appended to the end of the existing partner-safe view. `create or replace
-- view` permits appending columns and preserves the existing grants.
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
  po.created_at,
  po.updated_at,
  po.launch_readiness_state
from public.partner_onboarding po;

-------------------------------------------------------------------------------
-- 2. Recorded launch checks.
--
-- One row per check that has actually been decided or invalidated. The check
-- catalogue itself — key, category, owner, automated or manual, blocking —
-- lives in application code beside the generators, the same way the artifact
-- registry does. The descriptive columns are denormalized onto the row so the
-- record says what was decided at the time it was decided.
-------------------------------------------------------------------------------

create table public.partner_onboarding_launch_checks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null
    references public.partner_onboarding(id) on delete cascade,
  partner_record_id uuid not null
    references public.partner_records(id) on delete cascade,

  check_key text not null,
  category text not null,
  owner_type text not null,
  determination text not null,
  blocking boolean not null,

  status text not null default 'not_started',
  evidence_summary text,
  evidence_reference text,

  checked_at timestamptz,
  checked_by uuid references auth.users(id),

  invalidated_at timestamptz,
  invalidated_reason text,

  request_id uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint partner_onboarding_launch_checks_workspace_key_unique
    unique (workspace_id, check_key),
  constraint partner_onboarding_launch_checks_request_unique
    unique (workspace_id, request_id),
  constraint partner_onboarding_launch_checks_key_check
    check (check_key ~ '^[a-z0-9_]{3,80}$'),
  constraint partner_onboarding_launch_checks_category_check
    check (category in (
      'commercial_and_procurement',
      'configuration',
      'page_and_brand',
      'partner_team_and_reporting',
      'participant_journey',
      'training_and_resources',
      'approvals'
    )),
  constraint partner_onboarding_launch_checks_owner_check
    check (owner_type in ('legalease', 'partner')),
  constraint partner_onboarding_launch_checks_determination_check
    check (determination in ('automated', 'manual')),
  constraint partner_onboarding_launch_checks_status_check
    check (status in (
      'not_started',
      'passing',
      'failing',
      'needs_review',
      'waived',
      'not_applicable'
    )),
  -- A satisfied check must say who satisfied it and when. A decorative
  -- checkbox with no reviewer is exactly what this table exists to prevent.
  constraint partner_onboarding_launch_checks_reviewer_required_check
    check (
      status not in ('passing', 'waived', 'not_applicable')
      or (checked_by is not null and checked_at is not null)
    ),
  -- Invalidation is a pair: the moment and the reason travel together.
  constraint partner_onboarding_launch_checks_invalidation_pair_check
    check (
      (invalidated_at is null and invalidated_reason is null)
      or (invalidated_at is not null and invalidated_reason is not null)
    ),
  constraint partner_onboarding_launch_checks_evidence_length_check
    check (
      (evidence_summary is null or char_length(evidence_summary) between 1 and 2000)
      and (evidence_reference is null or char_length(evidence_reference) between 1 and 500)
    )
);

create index partner_onboarding_launch_checks_workspace_idx
  on public.partner_onboarding_launch_checks(workspace_id);
create index partner_onboarding_launch_checks_partner_idx
  on public.partner_onboarding_launch_checks(partner_record_id);

comment on table public.partner_onboarding_launch_checks is
  'Recorded launch-check decisions only. Automated check state is recomputed on every read and is never served from this table.';

-------------------------------------------------------------------------------
-- 3. Launch approvals.
--
-- The audit trail behind the two approval checks. The reviewer type is tied to
-- the approval type by constraint, so a partner cannot record a LegalEase
-- approval even if application code were wrong.
-------------------------------------------------------------------------------

create table public.partner_onboarding_launch_approvals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null
    references public.partner_onboarding(id) on delete cascade,
  approval_type text not null,
  reviewer_type text not null,
  reviewer_user_id uuid not null references auth.users(id),
  decision text not null,
  comments text,
  recorded_at timestamptz not null default now(),
  invalidated_at timestamptz,
  request_id uuid not null,

  constraint partner_onboarding_launch_approvals_request_unique
    unique (workspace_id, request_id),
  constraint partner_onboarding_launch_approvals_type_check
    check (approval_type in (
      'partner_launch_approval',
      'legalease_final_review'
    )),
  constraint partner_onboarding_launch_approvals_reviewer_type_check
    check (reviewer_type in ('legalease', 'partner')),
  constraint partner_onboarding_launch_approvals_decision_check
    check (decision in ('approve', 'withdraw')),
  constraint partner_onboarding_launch_approvals_comments_check
    check (comments is null or char_length(comments) between 1 and 5000),
  -- The partner approves its own launch; LegalEase performs the final review.
  -- Neither side can record the other's decision.
  constraint partner_onboarding_launch_approvals_owner_match_check
    check (
      (approval_type = 'partner_launch_approval' and reviewer_type = 'partner')
      or (approval_type = 'legalease_final_review' and reviewer_type = 'legalease')
    )
);

create index partner_onboarding_launch_approvals_workspace_idx
  on public.partner_onboarding_launch_approvals(workspace_id, recorded_at desc);

-------------------------------------------------------------------------------
-- 4. Activity vocabulary.
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
      'prefill_section_modified',
      'artifact_generated',
      'artifact_generation_failed',
      'artifact_changes_requested',
      'artifact_approved',
      'artifact_superseded',
      'artifact_partner_reviewed',
      'artifact_approval_invalidated',
      -- Added by this migration.
      'launch_check_recorded',
      'launch_check_invalidated',
      'launch_approval_recorded',
      'launch_readiness_achieved',
      'launch_readiness_lost'
    ));

-------------------------------------------------------------------------------
-- 5. RLS and column-bounded partner reads.
-------------------------------------------------------------------------------

alter table public.partner_onboarding_launch_checks enable row level security;
alter table public.partner_onboarding_launch_approvals enable row level security;

create policy partner_onboarding_launch_checks_all_internal
on public.partner_onboarding_launch_checks
for all
to authenticated
using (public.is_internal_admin())
with check (public.is_internal_admin());

create policy partner_onboarding_launch_approvals_all_internal
on public.partner_onboarding_launch_approvals
for all
to authenticated
using (public.is_internal_admin())
with check (public.is_internal_admin());

-- Tenant scoping. A partner reads only its own workspace's checks, and only
-- the checks it owns: an internal-only check is never visible to a partner.
-- Anonymous access is denied because every policy targets authenticated only.
create policy partner_onboarding_launch_checks_select_partner
on public.partner_onboarding_launch_checks
for select
to authenticated
using (
  owner_type = 'partner'
  and exists (
    select 1
    from public.partner_onboarding po
    where po.id = workspace_id
      and po.partner_slug = public.current_partner_slug()
  )
);

create policy partner_onboarding_launch_approvals_select_partner
on public.partner_onboarding_launch_approvals
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

revoke all on table public.partner_onboarding_launch_checks
  from public, anon, authenticated;
revoke all on table public.partner_onboarding_launch_approvals
  from public, anon, authenticated;

-- request_id, partner_record_id and the internal reviewer identity stay
-- server-side.
grant select (
  id,
  workspace_id,
  check_key,
  category,
  owner_type,
  determination,
  blocking,
  status,
  evidence_summary,
  evidence_reference,
  checked_at,
  invalidated_at,
  invalidated_reason,
  created_at,
  updated_at
) on public.partner_onboarding_launch_checks to authenticated;

grant select (
  id,
  workspace_id,
  approval_type,
  reviewer_type,
  decision,
  comments,
  recorded_at,
  invalidated_at
) on public.partner_onboarding_launch_approvals to authenticated;

commit;

begin;

-------------------------------------------------------------------------------
-- 6. Service-only mutation surface.
--
-- Every function is SECURITY INVOKER with an empty fixed search_path, revoked
-- from public/anon/authenticated, and granted only to service_role. Each does
-- one named thing. None of them publishes, activates, pauses, invites, sends,
-- or releases anything.
-------------------------------------------------------------------------------

create or replace function public.set_partner_onboarding_launch_check_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger partner_onboarding_launch_checks_updated_at
before update on public.partner_onboarding_launch_checks
for each row
execute function public.set_partner_onboarding_launch_check_updated_at();

-- Records one manual launch-check decision.
--
-- The reviewer type must match the check's owner: a partner administrator can
-- satisfy a partner-owned check and nothing else, and can never waive one.
-- Waiving is reserved to LegalEase.
create or replace function public.rcap_service_record_onboarding_launch_check(
  p_partner_slug text,
  p_actor_user_id uuid,
  p_reviewer_type text,
  p_workspace_id uuid,
  p_check_key text,
  p_category text,
  p_owner_type text,
  p_blocking boolean,
  p_status text,
  p_evidence_summary text,
  p_request_id uuid
)
returns table (
  check_id uuid,
  check_status text,
  duplicate boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_partner_record_id uuid;
  v_existing public.partner_onboarding_launch_checks%rowtype;
  v_row public.partner_onboarding_launch_checks%rowtype;
begin
  if p_reviewer_type not in ('legalease', 'partner') then
    raise exception 'invalid_reviewer_type' using errcode = '22023';
  end if;
  if p_status not in ('passing', 'needs_review', 'waived', 'not_applicable') then
    raise exception 'invalid_launch_check_status' using errcode = '22023';
  end if;
  -- Only LegalEase may waive a check or mark one not applicable.
  if p_reviewer_type = 'partner'
     and p_status in ('waived', 'not_applicable') then
    raise exception 'waiver_requires_legalease' using errcode = '42501';
  end if;
  -- A reviewer may only decide a check its own side owns.
  if p_reviewer_type <> p_owner_type then
    raise exception 'reviewer_does_not_own_check' using errcode = '42501';
  end if;

  select po.partner_record_id into v_partner_record_id
  from public.partner_onboarding po
  where po.id = p_workspace_id
    and po.partner_slug = p_partner_slug;

  if v_partner_record_id is null then
    raise exception 'workspace_not_found' using errcode = 'P0002';
  end if;

  select c.* into v_existing
  from public.partner_onboarding_launch_checks c
  where c.workspace_id = p_workspace_id
    and c.request_id = p_request_id;

  if v_existing.id is not null then
    check_id := v_existing.id;
    check_status := v_existing.status;
    duplicate := true;
    return next;
    return;
  end if;

  insert into public.partner_onboarding_launch_checks (
    workspace_id, partner_record_id, check_key, category, owner_type,
    determination, blocking, status, evidence_summary, evidence_reference,
    checked_at, checked_by, request_id
  )
  values (
    p_workspace_id, v_partner_record_id, p_check_key, p_category, p_owner_type,
    'manual', p_blocking, p_status, p_evidence_summary, 'manual_review',
    now(), p_actor_user_id, p_request_id
  )
  on conflict (workspace_id, check_key) do update
  set status = excluded.status,
      evidence_summary = excluded.evidence_summary,
      checked_at = excluded.checked_at,
      checked_by = excluded.checked_by,
      blocking = excluded.blocking,
      category = excluded.category,
      -- Recording a fresh decision clears the previous invalidation.
      invalidated_at = null,
      invalidated_reason = null,
      request_id = excluded.request_id
  returning * into v_row;

  insert into public.partner_onboarding_activity (
    workspace_id, event_type, owner_type, summary_code, status_code
  )
  values (
    p_workspace_id,
    'launch_check_recorded',
    case when p_reviewer_type = 'partner' then 'partner' else 'legalease' end,
    p_check_key,
    p_status
  );

  check_id := v_row.id;
  check_status := v_row.status;
  duplicate := false;
  return next;
end;
$$;

-- Records a launch approval and the check row that mirrors it.
create or replace function public.rcap_service_record_onboarding_launch_approval(
  p_partner_slug text,
  p_actor_user_id uuid,
  p_reviewer_type text,
  p_workspace_id uuid,
  p_approval_type text,
  p_decision text,
  p_comments text,
  p_request_id uuid
)
returns table (
  approval_id uuid,
  duplicate boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_partner_record_id uuid;
  v_existing uuid;
  v_row public.partner_onboarding_launch_approvals%rowtype;
  v_check_key text;
  v_owner text;
begin
  if p_decision not in ('approve', 'withdraw') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;

  if p_approval_type = 'partner_launch_approval' then
    v_check_key := 'partner_launch_approval_received';
    v_owner := 'partner';
  elsif p_approval_type = 'legalease_final_review' then
    v_check_key := 'legalease_final_review_complete';
    v_owner := 'legalease';
  else
    raise exception 'invalid_approval_type' using errcode = '22023';
  end if;

  if p_reviewer_type <> v_owner then
    raise exception 'reviewer_does_not_own_approval' using errcode = '42501';
  end if;

  select po.partner_record_id into v_partner_record_id
  from public.partner_onboarding po
  where po.id = p_workspace_id
    and po.partner_slug = p_partner_slug;

  if v_partner_record_id is null then
    raise exception 'workspace_not_found' using errcode = 'P0002';
  end if;

  select a.id into v_existing
  from public.partner_onboarding_launch_approvals a
  where a.workspace_id = p_workspace_id
    and a.request_id = p_request_id;

  if v_existing is not null then
    approval_id := v_existing;
    duplicate := true;
    return next;
    return;
  end if;

  insert into public.partner_onboarding_launch_approvals (
    workspace_id, approval_type, reviewer_type, reviewer_user_id,
    decision, comments, request_id
  )
  values (
    p_workspace_id, p_approval_type, p_reviewer_type, p_actor_user_id,
    p_decision, p_comments, p_request_id
  )
  returning * into v_row;

  insert into public.partner_onboarding_launch_checks (
    workspace_id, partner_record_id, check_key, category, owner_type,
    determination, blocking, status, evidence_summary, evidence_reference,
    checked_at, checked_by, request_id
  )
  values (
    p_workspace_id, v_partner_record_id, v_check_key, 'approvals', v_owner,
    'manual', true,
    case when p_decision = 'approve' then 'passing' else 'failing' end,
    case when p_decision = 'approve'
      then 'Launch approval recorded.'
      else 'Launch approval withdrawn.'
    end,
    'launch_approval',
    case when p_decision = 'approve' then now() else null end,
    case when p_decision = 'approve' then p_actor_user_id else null end,
    p_request_id
  )
  on conflict (workspace_id, check_key) do update
  set status = excluded.status,
      evidence_summary = excluded.evidence_summary,
      checked_at = excluded.checked_at,
      checked_by = excluded.checked_by,
      invalidated_at = null,
      invalidated_reason = null,
      request_id = excluded.request_id;

  insert into public.partner_onboarding_activity (
    workspace_id, event_type, owner_type, summary_code, status_code
  )
  values (
    p_workspace_id, 'launch_approval_recorded',
    case when p_reviewer_type = 'partner' then 'partner' else 'legalease' end,
    p_approval_type, p_decision
  );

  approval_id := v_row.id;
  duplicate := false;
  return next;
end;
$$;

-- Invalidates recorded checks after a material source change.
--
-- The UPDATE is conditional, so a second observer of the same drift updates no
-- row and inserts no event. Ownership follows the artifact rule: a change the
-- partner owns invalidates both sides, a LegalEase-only change invalidates the
-- LegalEase-owned checks and leaves the partner's own decisions standing.
create or replace function public.rcap_service_invalidate_onboarding_launch_checks(
  p_partner_slug text,
  p_workspace_id uuid,
  p_invalidate_partner_owned boolean,
  p_reason text
)
returns table (
  invalidated_count integer
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_count integer;
begin
  if p_reason is null or char_length(btrim(p_reason)) = 0 then
    raise exception 'invalidation_reason_required' using errcode = '22023';
  end if;

  with updated as (
    update public.partner_onboarding_launch_checks c
    set invalidated_at = now(),
        invalidated_reason = p_reason
    from public.partner_onboarding po
    where c.workspace_id = p_workspace_id
      and po.id = c.workspace_id
      and po.partner_slug = p_partner_slug
      and c.invalidated_at is null
      and c.status in ('passing', 'waived', 'not_applicable')
      and (p_invalidate_partner_owned or c.owner_type = 'legalease')
    returning c.id
  )
  select count(*)::integer into v_count from updated;

  if v_count > 0 then
    insert into public.partner_onboarding_activity (
      workspace_id, event_type, owner_type, summary_code, status_code
    )
    values (
      p_workspace_id, 'launch_check_invalidated', 'system',
      case when p_invalidate_partner_owned then 'all_owners' else 'legalease_only' end,
      'source_changed'
    );
  end if;

  invalidated_count := v_count;
  return next;
end;
$$;

-- Records a readiness transition. The UPDATE is conditional on the state
-- actually differing, so an unchanged read writes nothing and emits no event.
create or replace function public.rcap_service_record_onboarding_launch_readiness(
  p_partner_slug text,
  p_workspace_id uuid,
  p_state text
)
returns table (
  changed boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_updated public.partner_onboarding%rowtype;
begin
  if p_state not in ('ready', 'not_ready') then
    raise exception 'invalid_readiness_state' using errcode = '22023';
  end if;

  update public.partner_onboarding po
  set launch_readiness_state = p_state
  where po.id = p_workspace_id
    and po.partner_slug = p_partner_slug
    and po.launch_readiness_state is distinct from p_state
  returning * into v_updated;

  if v_updated.id is null then
    changed := false;
    return next;
    return;
  end if;

  insert into public.partner_onboarding_activity (
    workspace_id, event_type, owner_type, summary_code, status_code
  )
  values (
    p_workspace_id,
    case when p_state = 'ready'
      then 'launch_readiness_achieved'
      else 'launch_readiness_lost'
    end,
    'system',
    'launch_readiness',
    p_state
  );

  changed := true;
  return next;
end;
$$;

revoke execute on function public.rcap_service_record_onboarding_launch_check(
  text, uuid, text, uuid, text, text, text, boolean, text, text, uuid
) from public, anon, authenticated;
revoke execute on function public.rcap_service_record_onboarding_launch_approval(
  text, uuid, text, uuid, text, text, text, uuid
) from public, anon, authenticated;
revoke execute on function public.rcap_service_invalidate_onboarding_launch_checks(
  text, uuid, boolean, text
) from public, anon, authenticated;
revoke execute on function public.rcap_service_record_onboarding_launch_readiness(
  text, uuid, text
) from public, anon, authenticated;

grant execute on function public.rcap_service_record_onboarding_launch_check(
  text, uuid, text, uuid, text, text, text, boolean, text, text, uuid
) to service_role;
grant execute on function public.rcap_service_record_onboarding_launch_approval(
  text, uuid, text, uuid, text, text, text, uuid
) to service_role;
grant execute on function public.rcap_service_invalidate_onboarding_launch_checks(
  text, uuid, boolean, text
) to service_role;
grant execute on function public.rcap_service_record_onboarding_launch_readiness(
  text, uuid, text
) to service_role;

grant select, insert, update on public.partner_onboarding_launch_checks to service_role;
grant select, insert on public.partner_onboarding_launch_approvals to service_role;

commit;
