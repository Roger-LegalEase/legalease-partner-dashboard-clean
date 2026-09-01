-- RCAP platform launch rails: partner viewer role and atomic membership lifecycle.
--
-- Forward-only and additive. This migration does not publish a partner, activate a
-- program, grant sponsorship, consume packet capacity, or alter participant data.

begin;

alter table public.partner_users
  add column if not exists revoked_at timestamptz,
  add column if not exists revoked_by uuid references auth.users(id) on delete set null,
  add column if not exists role_changed_at timestamptz,
  add column if not exists role_changed_by uuid references auth.users(id) on delete set null;

alter table public.partner_users drop constraint if exists partner_users_role_check;
alter table public.partner_users
  add constraint partner_users_role_check
  check (role in ('partner_admin', 'partner_staff', 'partner_viewer', 'internal_admin'))
  not valid;
alter table public.partner_users validate constraint partner_users_role_check;

alter table public.partner_users drop constraint if exists partner_users_role_partner_slug_check;
alter table public.partner_users
  add constraint partner_users_role_partner_slug_check
  check (
    (role in ('partner_admin', 'partner_staff', 'partner_viewer') and partner_slug is not null)
    or (role = 'internal_admin' and partner_slug is null)
  ) not valid;
alter table public.partner_users validate constraint partner_users_role_partner_slug_check;

comment on column public.partner_users.revoked_at is
  'When partner access was disabled. Session authorization reads status=active, so offboarding is immediate.';
comment on column public.partner_users.revoked_by is
  'Authenticated administrator who disabled the membership.';

create or replace function public.current_partner_slug()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select pu.partner_slug
  from public.partner_users pu
  where pu.auth_user_id = auth.uid()
    and pu.status = 'active'
    and pu.role in ('partner_admin', 'partner_staff', 'partner_viewer')
$$;

create or replace function public.clinic_current_partner_slug()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select pu.partner_slug
  from public.partner_users pu
  where pu.auth_user_id = auth.uid()
    and pu.status = 'active'
    and pu.role in ('partner_admin', 'partner_staff', 'partner_viewer')
$$;

-- Reuse the canonical append-only RCAP audit trail for membership changes.
alter table public.rcap_record_events
  drop constraint if exists rcap_record_events_record_type_check;
alter table public.rcap_record_events
  add constraint rcap_record_events_record_type_check
  check (record_type in (
    'intake_session',
    'document_packet',
    'partner_access_code',
    'partner_entitlement',
    'partner_onboarding',
    'partner_membership'
  )) not valid;
alter table public.rcap_record_events validate constraint rcap_record_events_record_type_check;

create or replace function public.manage_partner_membership(
  p_actor_user_id uuid,
  p_partner_slug text,
  p_member_id uuid,
  p_action text,
  p_role text default null
)
returns table(outcome text, member_id uuid, member_role text, member_status text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor public.partner_users%rowtype;
  v_member public.partner_users%rowtype;
  v_active_admins integer;
  v_role text := nullif(trim(p_role), '');
begin
  if p_actor_user_id is null
     or p_partner_slug is null
     or p_member_id is null
     or p_action not in ('change_role', 'revoke') then
    return query select 'invalid_input'::text, null::uuid, null::text, null::text;
    return;
  end if;

  select * into v_actor
  from public.partner_users pu
  where pu.auth_user_id = p_actor_user_id
    and pu.status = 'active'
    and (
      (pu.role = 'partner_admin' and pu.partner_slug = p_partner_slug)
      or (pu.role = 'internal_admin' and pu.partner_slug is null)
    )
  limit 1;

  if not found then
    return query select 'forbidden'::text, null::uuid, null::text, null::text;
    return;
  end if;

  select * into v_member
  from public.partner_users pu
  where pu.id = p_member_id
  for update;

  if not found
     or v_member.partner_slug is distinct from p_partner_slug
     or v_member.role not in ('partner_admin', 'partner_staff', 'partner_viewer') then
    return query select 'not_found'::text, null::uuid, null::text, null::text;
    return;
  end if;

  if v_actor.id = v_member.id and (
    p_action = 'revoke' or (p_action = 'change_role' and v_role <> 'partner_admin')
  ) then
    return query select 'self_admin_protected'::text, v_member.id, v_member.role, v_member.status;
    return;
  end if;

  if p_action = 'revoke' then
    if v_member.status = 'disabled' then
      return query select 'already_revoked'::text, v_member.id, v_member.role, v_member.status;
      return;
    end if;

    if v_member.role = 'partner_admin' then
      select count(*)::integer into v_active_admins
      from public.partner_users pu
      where pu.partner_slug = p_partner_slug
        and pu.role = 'partner_admin'
        and pu.status = 'active';
      if v_active_admins <= 1 then
        return query select 'last_admin_protected'::text, v_member.id, v_member.role, v_member.status;
        return;
      end if;
    end if;

    update public.partner_users
    set status = 'disabled', revoked_at = now(), revoked_by = p_actor_user_id, updated_at = now()
    where id = v_member.id
    returning * into v_member;

    insert into public.rcap_record_events(
      record_type, record_id, partner_slug, event_type, actor, metadata
    ) values (
      'partner_membership', v_member.id::text, p_partner_slug,
      'partner_membership_revoked', p_actor_user_id::text,
      jsonb_build_object('previous_role', v_member.role, 'status', v_member.status)
    );

    return query select 'revoked'::text, v_member.id, v_member.role, v_member.status;
    return;
  end if;

  if v_role not in ('partner_admin', 'partner_staff', 'partner_viewer') then
    return query select 'invalid_role'::text, v_member.id, v_member.role, v_member.status;
    return;
  end if;

  if v_member.status <> 'active' then
    return query select 'membership_inactive'::text, v_member.id, v_member.role, v_member.status;
    return;
  end if;

  if v_member.role = v_role then
    return query select 'unchanged'::text, v_member.id, v_member.role, v_member.status;
    return;
  end if;

  if v_member.role = 'partner_admin' and v_role <> 'partner_admin' then
    select count(*)::integer into v_active_admins
    from public.partner_users pu
    where pu.partner_slug = p_partner_slug
      and pu.role = 'partner_admin'
      and pu.status = 'active';
    if v_active_admins <= 1 then
      return query select 'last_admin_protected'::text, v_member.id, v_member.role, v_member.status;
      return;
    end if;
  end if;

  insert into public.rcap_record_events(
    record_type, record_id, partner_slug, event_type, actor, metadata
  ) values (
    'partner_membership', v_member.id::text, p_partner_slug,
    'partner_membership_role_changed', p_actor_user_id::text,
    jsonb_build_object('from', v_member.role, 'to', v_role)
  );

  update public.partner_users
  set role = v_role, role_changed_at = now(), role_changed_by = p_actor_user_id, updated_at = now()
  where id = v_member.id
  returning * into v_member;

  return query select 'role_changed'::text, v_member.id, v_member.role, v_member.status;
end;
$$;

revoke all on function public.manage_partner_membership(uuid, text, uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.manage_partner_membership(uuid, text, uuid, text, text)
  to service_role;

-- Access codes have an explicit lifecycle. Creation is draft; activation is a
-- separate, server-authorized transition and requires the partner's independent
-- publication and activation gates. Geography scope is enforced again inside
-- the transaction that creates the attributed screening session.
alter table public.partner_access_codes
  add column if not exists lifecycle_status text not null default 'draft',
  add column if not exists jurisdictions text[] not null default '{}'::text[],
  add column if not exists program_id text,
  add column if not exists event_id uuid references public.clinic_events(id) on delete restrict;

alter table public.screening_sessions
  add column if not exists program_id text,
  add column if not exists event_id uuid references public.clinic_events(id) on delete set null;

update public.partner_access_codes
set lifecycle_status = case when is_active then 'live' else 'paused' end
where lifecycle_status = 'draft';

alter table public.partner_access_codes
  drop constraint if exists partner_access_codes_lifecycle_status_check;
alter table public.partner_access_codes
  add constraint partner_access_codes_lifecycle_status_check
  check (lifecycle_status in ('draft', 'scheduled', 'live', 'paused', 'revoked'));

alter table public.partner_access_codes
  drop constraint if exists partner_access_codes_jurisdictions_check;
alter table public.partner_access_codes
  add constraint partner_access_codes_jurisdictions_check
  check (
    array_position(jurisdictions, null) is null
    and (
      cardinality(jurisdictions) = 0
      or array_to_string(jurisdictions, ',') ~ '^([A-Z]{2,3})(,[A-Z]{2,3})*$'
    )
  );

create or replace function public.sync_partner_access_code_lifecycle()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_event_partner_slug text;
  v_event_program_id text;
begin
  new.jurisdictions := array(
    select distinct upper(trim(value))
    from unnest(coalesce(new.jurisdictions, '{}'::text[])) value
    where trim(value) <> ''
    order by 1
  );
  new.program_id := nullif(trim(new.program_id), '');
  if new.program_id is not null and length(new.program_id) > 120 then
    raise exception 'partner_access_code_program_invalid';
  end if;
  if new.event_id is not null then
    select event.partner_slug, event.program_key
    into v_event_partner_slug, v_event_program_id
    from public.clinic_events event
    where event.id = new.event_id;
    if not found or v_event_partner_slug is distinct from new.partner_slug then
      raise exception 'partner_access_code_event_scope_denied';
    end if;
    if new.program_id is not null and new.program_id is distinct from v_event_program_id then
      raise exception 'partner_access_code_program_scope_denied';
    end if;
    new.program_id := v_event_program_id;
  end if;
  new.is_active := new.lifecycle_status = 'live';
  return new;
end;
$$;

drop trigger if exists sync_partner_access_code_lifecycle on public.partner_access_codes;
create trigger sync_partner_access_code_lifecycle
before insert or update of lifecycle_status, jurisdictions, is_active, program_id, event_id
on public.partner_access_codes
for each row execute function public.sync_partner_access_code_lifecycle();

create or replace function public.enforce_partner_access_code_screening_scope()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_code public.partner_access_codes%rowtype;
begin
  if new.partner_access_code_id is null then
    return new;
  end if;

  select * into v_code
  from public.partner_access_codes code
  where code.id = new.partner_access_code_id;

  if not found
     or v_code.partner_slug is distinct from new.partner_slug
     or v_code.lifecycle_status <> 'live'
     or v_code.is_active is not true
     or (cardinality(v_code.jurisdictions) > 0 and not (upper(new.jurisdiction) = any(v_code.jurisdictions))) then
    raise exception 'partner_access_code_scope_denied';
  end if;
  new.program_id := v_code.program_id;
  new.event_id := v_code.event_id;
  new.campaign_name := v_code.campaign_name;
  return new;
end;
$$;

drop trigger if exists enforce_partner_access_code_screening_scope on public.screening_sessions;
create trigger enforce_partner_access_code_screening_scope
before insert or update of partner_access_code_id, partner_slug, jurisdiction, program_id, event_id
on public.screening_sessions
for each row execute function public.enforce_partner_access_code_screening_scope();

create or replace function public.create_partner_access_code(
  p_actor_user_id uuid,
  p_partner_slug text,
  p_code_hash text,
  p_code_display_hint text,
  p_campaign_name text,
  p_description text,
  p_code_type text,
  p_max_uses integer,
  p_jurisdictions text[],
  p_program_id text,
  p_event_id uuid,
  p_starts_at timestamptz,
  p_expires_at timestamptz
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code_id uuid;
begin
  if not exists (
    select 1
    from public.partner_users actor
    where actor.auth_user_id = p_actor_user_id
      and actor.status = 'active'
      and (
        (actor.role = 'partner_admin' and actor.partner_slug = p_partner_slug)
        or (actor.role = 'internal_admin' and actor.partner_slug is null)
      )
  ) then
    raise exception 'partner_access_code_forbidden';
  end if;

  insert into public.partner_access_codes(
    partner_slug, code_hash, code_display_hint, campaign_name, description,
    code_type, max_uses, lifecycle_status, is_active, jurisdictions,
    program_id, event_id, starts_at, expires_at, created_by
  ) values (
    p_partner_slug, p_code_hash, p_code_display_hint, p_campaign_name, p_description,
    p_code_type, p_max_uses, 'draft', false, coalesce(p_jurisdictions, '{}'::text[]),
    p_program_id, p_event_id, p_starts_at, p_expires_at, p_actor_user_id::text
  ) returning id into v_code_id;

  insert into public.rcap_record_events(
    record_type, record_id, partner_slug, event_type, actor, metadata
  ) values (
    'partner_access_code', v_code_id::text, p_partner_slug,
    'partner_code_created', p_actor_user_id::text,
    jsonb_build_object('campaign_name', p_campaign_name, 'code_type', p_code_type)
  );
  return v_code_id;
end;
$$;

revoke all on function public.create_partner_access_code(
  uuid, text, text, text, text, text, text, integer, text[], text, uuid,
  timestamptz, timestamptz
) from public, anon, authenticated;
grant execute on function public.create_partner_access_code(
  uuid, text, text, text, text, text, text, integer, text[], text, uuid,
  timestamptz, timestamptz
) to service_role;

create or replace function public.set_partner_access_code_lifecycle(
  p_actor_user_id uuid,
  p_partner_slug text,
  p_code_id uuid,
  p_status text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_code public.partner_access_codes%rowtype;
  v_previous text;
begin
  if p_status not in ('scheduled', 'live', 'paused', 'revoked') then
    return 'invalid_status';
  end if;

  if not exists (
    select 1
    from public.partner_users actor
    where actor.auth_user_id = p_actor_user_id
      and actor.status = 'active'
      and (
        (actor.role = 'partner_admin' and actor.partner_slug = p_partner_slug)
        or (actor.role = 'internal_admin' and actor.partner_slug is null)
      )
  ) then
    return 'forbidden';
  end if;

  select * into v_code
  from public.partner_access_codes code
  where code.id = p_code_id and code.partner_slug = p_partner_slug
  for update;
  if not found then return 'not_found'; end if;
  if v_code.lifecycle_status = 'revoked' then return 'already_revoked'; end if;
  if v_code.lifecycle_status = p_status then return 'unchanged'; end if;

  if p_status = 'live' and not exists (
    select 1
    from public.partner_records partner
    join public.partner_onboarding onboarding on onboarding.partner_slug = partner.partner_slug
    where partner.partner_slug = p_partner_slug
      and partner.payment_status in ('paid', 'demo_paid')
      and partner.qualification_status = 'qualified'
      and partner.provisioning_status in ('provisioned', 'active')
      and onboarding.status = 'live'
      and onboarding.landing_page_ready is true
      and onboarding.internal_approved_at is not null
      and onboarding.launched_at is not null
  ) then
    return 'partner_not_launch_ready';
  end if;

  v_previous := v_code.lifecycle_status;
  update public.partner_access_codes
  set lifecycle_status = p_status, updated_at = now()
  where id = v_code.id;

  insert into public.rcap_record_events(
    record_type, record_id, partner_slug, event_type, actor, metadata
  ) values (
    'partner_access_code', v_code.id::text, p_partner_slug,
    case p_status
      when 'live' then 'partner_code_activated'
      when 'revoked' then 'partner_code_revoked'
      else 'partner_code_paused'
    end,
    p_actor_user_id::text,
    jsonb_build_object('from', v_previous, 'to', p_status)
  );
  return 'updated';
end;
$$;

revoke all on function public.set_partner_access_code_lifecycle(uuid, text, uuid, text)
  from public, anon, authenticated;
grant execute on function public.set_partner_access_code_lifecycle(uuid, text, uuid, text)
  to service_role;

commit;
