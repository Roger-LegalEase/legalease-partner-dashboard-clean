-- RCAP Clinic launch rails: explicit assistance scope and revocation evidence.
-- Participant ownership, matter ownership, packet authority and commercial routes
-- are unchanged.

begin;

alter table public.clinic_assisted_sessions
  add column if not exists consent_scope text[] not null
    default array['screening_navigation', 'screening_answers']::text[],
  add column if not exists consent_matter_id uuid
    references public.consumer_briefcase_items(id) on delete set null,
  add column if not exists consent_revoked_at timestamptz,
  add column if not exists consent_revoked_by uuid references auth.users(id) on delete set null,
  add column if not exists consent_revocation_reason text;

alter table public.clinic_assisted_sessions
  drop constraint if exists clinic_assisted_sessions_consent_scope_check;
alter table public.clinic_assisted_sessions
  add constraint clinic_assisted_sessions_consent_scope_check
  check (
    cardinality(consent_scope) between 1 and 4
    and consent_scope <@ array[
      'screening_navigation',
      'screening_answers',
      'packet_information',
      'filing_follow_up'
    ]::text[]
  );

create or replace function public.clinic_start_scoped_assisted_session(
  p_event_id uuid,
  p_event_staff_id uuid,
  p_participant_user_id uuid,
  p_screening_session_id uuid,
  p_handoff_token_hash text,
  p_device_nonce_hash text,
  p_consent_version text,
  p_consent_scope text[],
  p_consented_at timestamptz,
  p_ttl_minutes integer default 30
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_partner_slug text;
begin
  if p_consented_at is null or p_consented_at > now() then
    raise exception 'clinic_consent_required';
  end if;
  if p_ttl_minutes < 5 or p_ttl_minutes > 120 then
    raise exception 'clinic_session_ttl_invalid';
  end if;
  if cardinality(p_consent_scope) < 1
     or not (p_consent_scope <@ array[
       'screening_navigation', 'screening_answers', 'packet_information', 'filing_follow_up'
     ]::text[]) then
    raise exception 'clinic_consent_scope_invalid';
  end if;

  select event.partner_slug into v_partner_slug
  from public.clinic_events event
  where event.id = p_event_id
    and event.status in ('published', 'paused');
  if not found then raise exception 'clinic_event_unavailable'; end if;

  if not exists (
    select 1
    from public.clinic_event_staff staff
    join public.partner_users membership on membership.id = staff.partner_user_id
    where staff.id = p_event_staff_id
      and staff.event_id = p_event_id
      and staff.status = 'approved'
      and 'assist' = any(staff.permissions)
      and membership.status = 'active'
      and membership.role in ('partner_admin', 'partner_staff')
      and membership.partner_slug = v_partner_slug
  ) then
    raise exception 'clinic_staff_not_approved';
  end if;

  if not exists (select 1 from auth.users where id = p_participant_user_id) then
    raise exception 'clinic_participant_not_found';
  end if;
  if not exists (
    select 1
    from public.screening_sessions screening
    where screening.session_id = p_screening_session_id
      and screening.partner_slug = v_partner_slug
      and screening.flow_mode = 'rcap'
      and screening.partner_benefit_active is true
  ) then
    raise exception 'clinic_screening_scope_mismatch';
  end if;

  insert into public.clinic_assisted_sessions(
    event_id, event_staff_id, participant_user_id, screening_session_id,
    handoff_token_hash, device_nonce_hash, consent_version, consent_scope,
    consented_at, expires_at
  ) values (
    p_event_id, p_event_staff_id, p_participant_user_id, p_screening_session_id,
    lower(p_handoff_token_hash), lower(p_device_nonce_hash), trim(p_consent_version),
    array(select distinct scope from unnest(p_consent_scope) scope order by 1),
    p_consented_at, now() + make_interval(mins => p_ttl_minutes)
  ) returning id into v_id;

  insert into public.clinic_event_audit(
    event_id, actor_user_id, action, target_type, target_id, metadata
  ) values (
    p_event_id, p_participant_user_id, 'assistance_consented', 'assisted_session', v_id,
    jsonb_build_object(
      'consent_version', p_consent_version,
      'scope_count', cardinality(p_consent_scope)
    )
  );
  return v_id;
end;
$$;

create or replace function public.clinic_end_assisted_session(
  p_session_id uuid,
  p_actor_user_id uuid,
  p_reason text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.clinic_assisted_sessions%rowtype;
begin
  select * into v_session
  from public.clinic_assisted_sessions
  where id = p_session_id
  for update;
  if not found then return 'not_found'; end if;
  if v_session.status in ('ended', 'expired', 'reset') then return 'already_ended'; end if;

  if p_actor_user_id <> v_session.participant_user_id and not exists (
    select 1
    from public.clinic_event_staff staff
    join public.partner_users membership on membership.id = staff.partner_user_id
    where staff.event_id = v_session.event_id
      and staff.status = 'approved'
      and membership.auth_user_id = p_actor_user_id
      and membership.status = 'active'
      and membership.partner_slug = (
        select event.partner_slug from public.clinic_events event where event.id = v_session.event_id
      )
  ) then
    return 'forbidden';
  end if;

  update public.clinic_assisted_sessions
  set status = case when p_reason in ('staff_reset', 'security_reset') then 'reset' else 'ended' end,
      ended_at = now(),
      ended_reason = p_reason,
      consent_revoked_at = now(),
      consent_revoked_by = p_actor_user_id,
      consent_revocation_reason = p_reason,
      updated_at = now()
  where id = p_session_id;

  insert into public.clinic_event_audit(
    event_id, actor_user_id, action, target_type, target_id, metadata
  ) values (
    v_session.event_id, p_actor_user_id, 'assistance_consent_revoked',
    'assisted_session', p_session_id, jsonb_build_object('reason', p_reason)
  );
  return 'ended';
end;
$$;

create or replace function public.bind_clinic_consent_matter()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.matter_id is not null and new.assisted_session_id is not null then
    update public.clinic_assisted_sessions session
    set consent_matter_id = new.matter_id, updated_at = now()
    where session.id = new.assisted_session_id
      and session.participant_user_id = new.participant_user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists bind_clinic_consent_matter on public.clinic_cases;
create trigger bind_clinic_consent_matter
after insert or update of matter_id on public.clinic_cases
for each row execute function public.bind_clinic_consent_matter();

create or replace function public.clinic_export_event_report(
  p_event_id uuid,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_report jsonb;
begin
  v_report := public.clinic_get_event_report(p_event_id, p_actor_user_id);
  insert into public.clinic_event_audit(
    event_id, actor_user_id, action, target_type, target_id, metadata
  ) values (
    p_event_id, p_actor_user_id, 'report_exported', 'event', p_event_id,
    jsonb_build_object('format', 'aggregate_csv')
  );
  return v_report;
end;
$$;

revoke all on function public.clinic_start_scoped_assisted_session(
  uuid, uuid, uuid, uuid, text, text, text, text[], timestamptz, integer
) from public, anon, authenticated;
grant execute on function public.clinic_start_scoped_assisted_session(
  uuid, uuid, uuid, uuid, text, text, text, text[], timestamptz, integer
) to service_role;
revoke all on function public.clinic_export_event_report(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.clinic_export_event_report(uuid, uuid)
  to service_role;

commit;
