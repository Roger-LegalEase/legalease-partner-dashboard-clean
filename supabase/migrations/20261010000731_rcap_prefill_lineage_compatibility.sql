-- Correct the demonstrated Production 42703 in the workspace prefill reader.
-- Reuse the existing reviewed lineage behavior; no stored answers, approvals,
-- policy versions or commercial rows are changed by this migration.
-- Existing application code remains compatible. No auth/RLS policy changes.
begin;
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

-- The view runs as its caller, so a partner reading it must be able to read every column it
-- names, including the one it now filters on. Partner reads of this table are column-level
-- by design and already cover the twelve the projection exposes; this adds the thirteenth,
-- which says only that a preparation was replaced by a later one. Nothing here widens the
-- rows a partner can reach: row level security still limits them to their own workspace.
grant select (superseded_at)
  on public.partner_onboarding_prefill_values to authenticated;


commit;
