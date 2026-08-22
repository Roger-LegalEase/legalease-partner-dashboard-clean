-- RCAP onboarding prefill: allow a reviewed reproposal after a value has been applied.
--
-- The lifecycle deadlocked once a prepared value was applied. The partial unique index
-- partner_onboarding_prefill_values_active_field_unique treated an applied row as the one
-- active suggestion for its field, so no later proposal could exist for that field, and
-- rcap_service_review_onboarding_prefill refuses to review an applied row because applied
-- is terminal. The result: after a partner edited a value LegalEase had prepared, LegalEase
-- had no supported way to propose a correction at all — not to overwrite the partner's
-- answer, and not even to suggest one for review.
--
-- This migration separates history from what is currently actionable:
--
--   history          applied, rejected, superseded
--   actionable       proposed, approved, conflict
--
-- One actionable suggestion per field is still the rule. One current applied preparation
-- per field is now its own rule rather than a side effect of sharing an index with the
-- actionable states. Applied rows are never rewritten, re-proposed or deleted: when a newer
-- preparation is applied over one, the earlier row keeps its status, its applied value hash,
-- its timestamps and its operator, and is marked superseded so it reads as the preparation
-- that came before.
--
-- Additive only. No table, column or data is dropped, and nothing here is applied to
-- Production.

-- 1. Lineage. A reproposal names the applied preparation it follows.
alter table public.partner_onboarding_prefill_values
  add column if not exists supersedes_value_id uuid
    references public.partner_onboarding_prefill_values(id);

comment on column public.partner_onboarding_prefill_values.supersedes_value_id is
  'The applied preparation this suggestion was raised against. Null for a first preparation of a field.';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.partner_onboarding_prefill_values'::regclass
      and conname = 'partner_onboarding_prefill_values_supersedes_self_check'
  ) then
    alter table public.partner_onboarding_prefill_values
      add constraint partner_onboarding_prefill_values_supersedes_self_check
      check (supersedes_value_id is null or supersedes_value_id <> id);
  end if;
end $$;

create index if not exists partner_onboarding_prefill_values_supersedes_idx
  on public.partner_onboarding_prefill_values (supersedes_value_id)
  where supersedes_value_id is not null;

-- 2. What "active" means. An applied row is history and must not block a later proposal,
--    but there may still be only one actionable suggestion, and only one current applied
--    preparation, for a given field.
drop index if exists public.partner_onboarding_prefill_values_active_field_unique;

create unique index if not exists partner_onboarding_prefill_values_actionable_field_unique
  on public.partner_onboarding_prefill_values (workspace_id, section_key, field_key)
  where review_status in ('proposed', 'approved', 'conflict')
    and superseded_at is null;

create unique index if not exists partner_onboarding_prefill_values_applied_field_unique
  on public.partner_onboarding_prefill_values (workspace_id, section_key, field_key)
  where review_status = 'applied'
    and superseded_at is null;

-- 3. Applying a newer preparation retires the earlier one instead of colliding with it.
--    BEFORE, so the earlier row is retired before the unique index above is checked for the
--    row being applied. The update below cannot recurse: it leaves review_status alone and
--    sets superseded_at, and this body only acts on a row whose superseded_at is null.
create or replace function public.rcap_onboarding_prefill_supersede_prior_applied()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.review_status = 'applied' and new.superseded_at is null then
    update public.partner_onboarding_prefill_values prior
    set superseded_at = now()
    where prior.workspace_id = new.workspace_id
      and prior.section_key = new.section_key
      and prior.field_key = new.field_key
      and prior.id <> new.id
      and prior.review_status = 'applied'
      and prior.superseded_at is null;
  end if;
  return new;
end;
$$;

revoke execute on function public.rcap_onboarding_prefill_supersede_prior_applied()
  from public, anon, authenticated;

drop trigger if exists rcap_onboarding_prefill_supersede_prior_applied_trg
  on public.partner_onboarding_prefill_values;

create trigger rcap_onboarding_prefill_supersede_prior_applied_trg
  before insert or update on public.partner_onboarding_prefill_values
  for each row
  execute function public.rcap_onboarding_prefill_supersede_prior_applied();

-- 4. The partner-facing projection shows the preparation that is current, not the ones it
--    replaced. Same columns, same security options, one narrower condition.
create or replace view public.partner_onboarding_prefill_values_safe
with (security_barrier = true, security_invoker = true) as
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
where review_status = 'applied'
  and superseded_at is null;

-- 5. Explicit override. A conflicting suggestion may never ride in on the ordinary apply,
--    which compares the partner's current answer against the value the suggestion was
--    raised against and refuses on any difference. Replacing a partner's answer is a
--    separate, deliberate act, and these columns are what make it accountable: who decided,
--    when, why, and exactly which partner value was replaced.
alter table public.partner_onboarding_prefill_values
  add column if not exists override_reason text,
  add column if not exists override_by uuid references auth.users(id),
  add column if not exists override_at timestamptz,
  add column if not exists override_partner_value_hash text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.partner_onboarding_prefill_values'::regclass
      and conname = 'partner_onboarding_prefill_values_override_check'
  ) then
    alter table public.partner_onboarding_prefill_values
      add constraint partner_onboarding_prefill_values_override_check
      check (
        (override_reason is null
          and override_by is null
          and override_at is null
          and override_partner_value_hash is null)
        or (
          override_reason is not null
          and char_length(override_reason) between 10 and 500
          and override_reason !~ '[[:cntrl:]]'
          and override_by is not null
          and override_at is not null
          and override_partner_value_hash ~ '^[0-9a-f]{64}$'
        )
      );
  end if;
end $$;

comment on column public.partner_onboarding_prefill_values.override_partner_value_hash is
  'Fingerprint of the partner answer that a recorded override replaced. Present only on an overridden suggestion.';

-- 6. The override is an event of its own in the append-only activity trail.
alter table public.partner_onboarding_activity
  drop constraint if exists partner_onboarding_activity_event_type_check;

alter table public.partner_onboarding_activity
  add constraint partner_onboarding_activity_event_type_check
  check (event_type = any (array[
    'workspace_created', 'commercial_gate_changed', 'section_started', 'section_completed',
    'section_change_requested', 'section_resubmitted', 'required_asset_uploaded',
    'required_asset_replaced', 'required_asset_deleted', 'onboarding_submitted',
    'section_approved', 'section_waived', 'ready_for_launch_decided', 'prefill_batch_created',
    'prefill_known_data_imported', 'prefill_suggestion_approved', 'prefill_suggestion_rejected',
    'prefill_suggestion_superseded', 'prefill_apply_conflict', 'prefill_applied',
    'prefill_section_confirmed', 'prefill_section_modified', 'prefill_conflict_override_recorded',
    'artifact_generated', 'artifact_generation_failed', 'artifact_changes_requested',
    'artifact_approved', 'artifact_superseded', 'artifact_partner_reviewed',
    'artifact_approval_invalidated', 'launch_check_recorded', 'launch_check_invalidated',
    'launch_approval_recorded', 'launch_readiness_achieved', 'launch_readiness_lost'
  ]));
