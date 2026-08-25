-- Nationwide Clinic Mode: RLS, least-privilege grants, lifecycle mutations,
-- replay-safe access, ephemeral assistance, and exactly-once packet binding.

begin;

create or replace function public.clinic_current_partner_slug()
returns text language sql stable security definer set search_path = ''
as $$
  select pu.partner_slug from public.partner_users pu
  where pu.auth_user_id = auth.uid() and pu.status = 'active'
    and pu.role in ('partner_admin','partner_staff')
$$;

create or replace function public.clinic_current_role()
returns text language sql stable security definer set search_path = ''
as $$
  select pu.role from public.partner_users pu
  where pu.auth_user_id = auth.uid() and pu.status = 'active'
$$;

create or replace function public.clinic_is_internal_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.partner_users pu
    where pu.auth_user_id = auth.uid() and pu.status = 'active'
      and pu.role = 'internal_admin' and pu.partner_slug is null
  )
$$;

create or replace function public.clinic_is_event_staff(p_event_id uuid, p_permission text default null)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.clinic_event_staff ces
    join public.partner_users pu on pu.id = ces.partner_user_id
    join public.clinic_events ce on ce.id = ces.event_id
    where ces.event_id = p_event_id and ces.status = 'approved'
      and pu.auth_user_id = auth.uid() and pu.status = 'active'
      and pu.partner_slug = ce.partner_slug
      and (p_permission is null or p_permission = any(ces.permissions))
  )
$$;

create or replace function public.clinic_can_read_event(p_event_id uuid)
returns boolean language sql stable security definer set search_path = ''
as $$
  select public.clinic_is_internal_admin()
    or exists (
      select 1 from public.clinic_events ce
      where ce.id = p_event_id and ce.partner_slug = public.clinic_current_partner_slug()
    )
$$;

create or replace function public.clinic_set_updated_at()
returns trigger language plpgsql set search_path = ''
as $$ begin new.updated_at = now(); return new; end $$;

create or replace function public.clinic_guard_append_only()
returns trigger language plpgsql set search_path = ''
as $$ begin raise exception '% is append-only', tg_table_name; end $$;

create trigger clinic_events_updated_at before update on public.clinic_events
for each row execute function public.clinic_set_updated_at();
create trigger clinic_event_staff_updated_at before update on public.clinic_event_staff
for each row execute function public.clinic_set_updated_at();
create trigger clinic_event_access_codes_updated_at before update on public.clinic_event_access_codes
for each row execute function public.clinic_set_updated_at();
create trigger clinic_assisted_sessions_updated_at before update on public.clinic_assisted_sessions
for each row execute function public.clinic_set_updated_at();
create trigger clinic_cases_updated_at before update on public.clinic_cases
for each row execute function public.clinic_set_updated_at();
create trigger clinic_follow_ups_updated_at before update on public.clinic_follow_ups
for each row execute function public.clinic_set_updated_at();
create trigger clinic_incidents_updated_at before update on public.clinic_incidents
for each row execute function public.clinic_set_updated_at();
create trigger clinic_packet_reservations_updated_at before update on public.clinic_packet_reservations
for each row execute function public.clinic_set_updated_at();
create trigger clinic_event_audit_append_only before update or delete on public.clinic_event_audit
for each row execute function public.clinic_guard_append_only();
create trigger clinic_access_redemptions_append_only before update or delete on public.clinic_event_access_redemptions
for each row execute function public.clinic_guard_append_only();

create or replace function public.clinic_create_event(
  p_actor_user_id uuid, p_partner_slug text, p_public_slug text, p_name text,
  p_starts_at timestamptz, p_ends_at timestamptz, p_timezone text,
  p_location_name text, p_geography text, p_capacity integer,
  p_sponsorship_allocation integer default null
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  if not exists (
    select 1 from public.partner_users pu where pu.auth_user_id = p_actor_user_id
      and pu.status = 'active'
      and ((pu.role = 'internal_admin' and pu.partner_slug is null)
        or (pu.role = 'partner_admin' and pu.partner_slug = p_partner_slug))
  ) then raise exception 'clinic_event_forbidden'; end if;
  insert into public.clinic_events(
    partner_slug, public_slug, name, starts_at, ends_at, timezone,
    location_name, geography, capacity, sponsorship_allocation, created_by
  ) values (
    p_partner_slug, lower(trim(p_public_slug)), trim(p_name), p_starts_at, p_ends_at,
    trim(p_timezone), trim(p_location_name), trim(p_geography), p_capacity,
    p_sponsorship_allocation, p_actor_user_id
  ) returning id into v_id;
  insert into public.clinic_event_audit(event_id, actor_user_id, action, target_type, target_id)
  values (v_id, p_actor_user_id, 'event_created', 'event', v_id);
  return v_id;
end $$;

create or replace function public.clinic_set_event_staff(
  p_actor_user_id uuid, p_event_id uuid, p_partner_user_id uuid,
  p_status text, p_permissions text[]
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_partner_slug text; v_staff_partner text; v_id uuid;
begin
  select partner_slug into v_partner_slug from public.clinic_events where id = p_event_id;
  if v_partner_slug is null then raise exception 'clinic_event_not_found'; end if;
  if not exists (
    select 1 from public.partner_users pu where pu.auth_user_id = p_actor_user_id
      and pu.status = 'active' and ((pu.role = 'internal_admin' and pu.partner_slug is null)
        or (pu.role = 'partner_admin' and pu.partner_slug = v_partner_slug))
  ) then raise exception 'clinic_staff_forbidden'; end if;
  select partner_slug into v_staff_partner from public.partner_users
    where id = p_partner_user_id and status = 'active' and role in ('partner_admin','partner_staff');
  if v_staff_partner is distinct from v_partner_slug then raise exception 'clinic_staff_cross_tenant'; end if;
  insert into public.clinic_event_staff(event_id, partner_user_id, status, permissions, approved_by, revoked_at)
  values (p_event_id, p_partner_user_id, p_status, p_permissions, p_actor_user_id,
    case when p_status = 'revoked' then now() else null end)
  on conflict (event_id, partner_user_id) do update set
    status = excluded.status, permissions = excluded.permissions,
    approved_by = excluded.approved_by, approved_at = now(), revoked_at = excluded.revoked_at
  returning id into v_id;
  insert into public.clinic_event_audit(event_id, actor_user_id, action, target_type, target_id, metadata)
  values (p_event_id, p_actor_user_id, 'staff_status_changed', 'staff', v_id, jsonb_build_object('status', p_status));
  return v_id;
end $$;

create or replace function public.clinic_create_access_code(
  p_actor_user_id uuid, p_event_id uuid, p_code_hash text, p_code_hint text,
  p_max_uses integer, p_starts_at timestamptz default null, p_expires_at timestamptz default null
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_partner_slug text; v_id uuid;
begin
  select partner_slug into v_partner_slug from public.clinic_events where id = p_event_id;
  if not exists (
    select 1 from public.partner_users pu where pu.auth_user_id = p_actor_user_id
      and pu.status = 'active' and ((pu.role = 'internal_admin' and pu.partner_slug is null)
        or (pu.role = 'partner_admin' and pu.partner_slug = v_partner_slug))
  ) then raise exception 'clinic_code_forbidden'; end if;
  insert into public.clinic_event_access_codes(event_id, code_hash, code_hint, max_uses, starts_at, expires_at, created_by)
  values (p_event_id, lower(p_code_hash), p_code_hint, p_max_uses, p_starts_at, p_expires_at, p_actor_user_id)
  returning id into v_id;
  insert into public.clinic_event_audit(event_id, actor_user_id, action, target_type, target_id)
  values (p_event_id, p_actor_user_id, 'access_code_created', 'access_code', v_id);
  return v_id;
end $$;

create or replace function public.clinic_set_event_status(p_event_id uuid, p_actor_user_id uuid, p_status text)
returns text language plpgsql security definer set search_path = ''
as $$
declare v_event public.clinic_events%rowtype;
begin
  select * into v_event from public.clinic_events where id = p_event_id for update;
  if not found then return 'not_found'; end if;
  if not exists (
    select 1 from public.partner_users pu where pu.auth_user_id = p_actor_user_id
      and pu.status = 'active' and ((pu.role = 'internal_admin' and pu.partner_slug is null)
        or (pu.role = 'partner_admin' and pu.partner_slug = v_event.partner_slug))
  ) then return 'forbidden'; end if;
  if p_status = v_event.status then return 'unchanged'; end if;
  if not ((v_event.status = 'draft' and p_status = 'published')
    or (v_event.status = 'published' and p_status in ('paused','closed'))
    or (v_event.status = 'paused' and p_status in ('published','closed'))
    or (v_event.status = 'closed' and p_status = 'archived')) then return 'invalid_transition'; end if;
  update public.clinic_events set status = p_status where id = p_event_id;
  if p_status in ('closed','archived') then
    update public.clinic_assisted_sessions set status = 'ended', ended_at = now(), ended_reason = 'event_closed'
    where event_id = p_event_id and status in ('active','handed_off');
  end if;
  insert into public.clinic_event_audit(event_id, actor_user_id, action, target_type, target_id, metadata)
  values (p_event_id, p_actor_user_id, 'event_status_changed', 'event', p_event_id,
    jsonb_build_object('from', v_event.status, 'to', p_status));
  return 'updated';
end $$;

create or replace function public.clinic_redeem_event_code(
  p_public_slug text, p_code_hash text, p_redemption_nonce_hash text
)
returns table(outcome text, event_id uuid, partner_slug text)
language plpgsql security definer set search_path = ''
as $$
declare v_event public.clinic_events%rowtype; v_code public.clinic_event_access_codes%rowtype;
begin
  select * into v_event from public.clinic_events where public_slug = p_public_slug for update;
  if not found or v_event.status <> 'published' then return query select 'event_unavailable'::text, null::uuid, null::text; return; end if;
  select * into v_code from public.clinic_event_access_codes
  where clinic_event_access_codes.event_id = v_event.id and code_hash = lower(p_code_hash) for update;
  if not found then return query select 'invalid_code'::text, null::uuid, null::text; return; end if;
  if exists (select 1 from public.clinic_event_access_redemptions r where r.access_code_id = v_code.id and r.redemption_nonce_hash = p_redemption_nonce_hash) then
    return query select 'already_redeemed'::text, v_event.id, v_event.partner_slug; return;
  end if;
  if not v_code.is_active or (v_code.starts_at is not null and now() < v_code.starts_at)
    or (v_code.expires_at is not null and now() >= v_code.expires_at)
    or (v_code.max_uses is not null and v_code.uses_count >= v_code.max_uses)
    or (select count(*) from public.clinic_event_access_redemptions r where r.event_id = v_event.id) >= v_event.capacity
  then return query select 'code_unavailable'::text, null::uuid, null::text; return; end if;
  insert into public.clinic_event_access_redemptions(event_id, access_code_id, redemption_nonce_hash)
  values (v_event.id, v_code.id, lower(p_redemption_nonce_hash));
  update public.clinic_event_access_codes set uses_count = uses_count + 1, last_used_at = now() where id = v_code.id;
  return query select 'redeemed'::text, v_event.id, v_event.partner_slug;
end $$;

create or replace function public.clinic_start_assisted_session(
  p_event_id uuid, p_event_staff_id uuid, p_participant_user_id uuid,
  p_screening_session_id uuid, p_handoff_token_hash text, p_device_nonce_hash text,
  p_consent_version text, p_consented_at timestamptz, p_ttl_minutes integer default 30
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  if p_consented_at is null or p_consented_at > now() then raise exception 'clinic_consent_required'; end if;
  if p_ttl_minutes < 5 or p_ttl_minutes > 120 then raise exception 'clinic_session_ttl_invalid'; end if;
  if not exists (
    select 1 from public.clinic_event_staff s join public.partner_users pu on pu.id=s.partner_user_id
    join public.clinic_events e on e.id=s.event_id
    where s.id=p_event_staff_id and s.event_id=p_event_id and s.status='approved'
      and 'assist'=any(s.permissions) and pu.status='active' and pu.partner_slug=e.partner_slug
      and e.status in ('published','paused')
  ) then raise exception 'clinic_staff_not_approved'; end if;
  if not exists (select 1 from auth.users where id=p_participant_user_id) then raise exception 'clinic_participant_not_found'; end if;
  insert into public.clinic_assisted_sessions(
    event_id,event_staff_id,participant_user_id,screening_session_id,handoff_token_hash,
    device_nonce_hash,consent_version,consented_at,expires_at
  ) values (
    p_event_id,p_event_staff_id,p_participant_user_id,p_screening_session_id,
    lower(p_handoff_token_hash),lower(p_device_nonce_hash),trim(p_consent_version),
    p_consented_at,now()+make_interval(mins=>p_ttl_minutes)
  ) returning id into v_id;
  insert into public.clinic_event_audit(event_id, action, target_type, target_id, metadata)
  values (p_event_id,'assistance_consented','assisted_session',v_id,jsonb_build_object('consent_version',p_consent_version));
  return v_id;
end $$;

create or replace function public.clinic_end_assisted_session(
  p_session_id uuid, p_actor_user_id uuid, p_reason text
)
returns text language plpgsql security definer set search_path = ''
as $$
declare v_session public.clinic_assisted_sessions%rowtype;
begin
  select * into v_session from public.clinic_assisted_sessions where id=p_session_id for update;
  if not found then return 'not_found'; end if;
  if v_session.status in ('ended','expired','reset') then return 'already_ended'; end if;
  if p_actor_user_id <> v_session.participant_user_id and not exists (
    select 1 from public.clinic_event_staff s join public.partner_users pu on pu.id=s.partner_user_id
    where s.event_id=v_session.event_id and s.status='approved' and pu.auth_user_id=p_actor_user_id and pu.status='active'
  ) then return 'forbidden'; end if;
  update public.clinic_assisted_sessions set status=case when p_reason in ('staff_reset','security_reset') then 'reset' else 'ended' end,
    ended_at=now(), ended_reason=p_reason where id=p_session_id;
  insert into public.clinic_event_audit(event_id,actor_user_id,action,target_type,target_id,metadata)
  values(v_session.event_id,p_actor_user_id,'assisted_session_ended','assisted_session',p_session_id,jsonb_build_object('reason',p_reason));
  return 'ended';
end $$;

create or replace function public.clinic_upsert_case(
  p_event_id uuid, p_assisted_session_id uuid, p_participant_user_id uuid,
  p_screening_session_id uuid, p_matter_id uuid, p_queue_status text,
  p_route_disposition text, p_jurisdiction text
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  if not exists (select 1 from public.clinic_assisted_sessions s where s.id=p_assisted_session_id
    and s.event_id=p_event_id and s.participant_user_id=p_participant_user_id
    and s.status in ('active','handed_off') and s.expires_at>now()) then raise exception 'clinic_session_owner_mismatch'; end if;
  if p_matter_id is not null and not exists (select 1 from public.consumer_briefcase_items b where b.id=p_matter_id and b.user_id=p_participant_user_id)
    then raise exception 'clinic_matter_owner_mismatch'; end if;
  insert into public.clinic_cases(event_id,participant_user_id,assisted_session_id,screening_session_id,matter_id,queue_status,route_disposition,jurisdiction)
  values(p_event_id,p_participant_user_id,p_assisted_session_id,p_screening_session_id,p_matter_id,p_queue_status,p_route_disposition,upper(p_jurisdiction))
  on conflict(event_id,participant_user_id,screening_session_id) do update set
    matter_id=excluded.matter_id, queue_status=excluded.queue_status,
    route_disposition=excluded.route_disposition, last_activity_at=now()
  returning id into v_id;
  return v_id;
end $$;

create or replace function public.clinic_transition_case(
  p_case_id uuid, p_actor_user_id uuid, p_queue_status text,
  p_follow_up_owner_staff_id uuid default null, p_follow_up_due_at timestamptz default null
)
returns text language plpgsql security definer set search_path = ''
as $$
declare v_case public.clinic_cases%rowtype;
begin
  select * into v_case from public.clinic_cases where id=p_case_id for update;
  if not found then return 'not_found'; end if;
  if not exists (
    select 1 from public.clinic_events e join public.partner_users pu on
      ((pu.role='internal_admin' and pu.partner_slug is null) or (pu.role='partner_admin' and pu.partner_slug=e.partner_slug))
      where e.id=v_case.event_id and pu.auth_user_id=p_actor_user_id and pu.status='active'
    union all
    select 1 from public.clinic_event_staff s join public.partner_users pu on pu.id=s.partner_user_id
      where s.event_id=v_case.event_id and s.status='approved' and 'queue'=any(s.permissions)
        and pu.auth_user_id=p_actor_user_id and pu.status='active'
  ) then return 'forbidden'; end if;
  if p_follow_up_owner_staff_id is not null and not exists(select 1 from public.clinic_event_staff where id=p_follow_up_owner_staff_id and event_id=v_case.event_id and status='approved')
    then return 'invalid_follow_up_owner'; end if;
  update public.clinic_cases set queue_status=p_queue_status,
    follow_up_owner_staff_id=p_follow_up_owner_staff_id,follow_up_due_at=p_follow_up_due_at,
    closed_at=case when p_queue_status='closed' then now() else null end,last_activity_at=now()
  where id=p_case_id;
  insert into public.clinic_event_audit(event_id,actor_user_id,action,target_type,target_id,metadata)
  values(v_case.event_id,p_actor_user_id,'case_status_changed','case',p_case_id,jsonb_build_object('from',v_case.queue_status,'to',p_queue_status));
  return 'updated';
end $$;

create or replace function public.clinic_upsert_follow_up(
  p_follow_up_id uuid, p_case_id uuid, p_actor_user_id uuid, p_owner_event_staff_id uuid,
  p_due_at timestamptz, p_status text, p_communication_state text,
  p_participant_safe_message text, p_internal_notes text
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_case public.clinic_cases%rowtype; v_id uuid;
begin
  select * into v_case from public.clinic_cases where id=p_case_id;
  if not found or not exists(
    select 1 from public.clinic_event_staff s join public.partner_users pu on pu.id=s.partner_user_id
    where s.event_id=v_case.event_id and s.status='approved' and 'follow_up'=any(s.permissions)
      and pu.auth_user_id=p_actor_user_id and pu.status='active'
    union all select 1 from public.partner_users pu join public.clinic_events e on e.id=v_case.event_id
      where pu.auth_user_id=p_actor_user_id and pu.status='active' and
      ((pu.role='internal_admin' and pu.partner_slug is null) or (pu.role='partner_admin' and pu.partner_slug=e.partner_slug))
  ) then raise exception 'clinic_follow_up_forbidden'; end if;
  if p_follow_up_id is null then
    insert into public.clinic_follow_ups(event_id,clinic_case_id,owner_event_staff_id,due_at,status,communication_state,participant_safe_message,internal_notes,created_by,completed_at)
    values(v_case.event_id,p_case_id,p_owner_event_staff_id,p_due_at,p_status,p_communication_state,p_participant_safe_message,p_internal_notes,p_actor_user_id,case when p_status='completed' then now() else null end)
    returning id into v_id;
  else
    update public.clinic_follow_ups set owner_event_staff_id=p_owner_event_staff_id,due_at=p_due_at,status=p_status,
      communication_state=p_communication_state,participant_safe_message=p_participant_safe_message,internal_notes=p_internal_notes,
      completed_at=case when p_status='completed' then now() else null end
    where id=p_follow_up_id and clinic_case_id=p_case_id returning id into v_id;
  end if;
  if v_id is null then raise exception 'clinic_follow_up_not_found'; end if;
  insert into public.clinic_event_audit(event_id,actor_user_id,action,target_type,target_id)
  values(v_case.event_id,p_actor_user_id,'follow_up_saved','follow_up',v_id);
  return v_id;
end $$;

create or replace function public.clinic_record_incident(
  p_incident_id uuid, p_event_id uuid, p_actor_user_id uuid, p_severity text,
  p_status text, p_category text, p_summary text, p_detail text, p_assigned_to uuid
)
returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_id uuid;
begin
  if not exists(
    select 1 from public.clinic_event_staff s join public.partner_users pu on pu.id=s.partner_user_id
    where s.event_id=p_event_id and s.status='approved' and 'incident'=any(s.permissions)
      and pu.auth_user_id=p_actor_user_id and pu.status='active'
    union all select 1 from public.partner_users pu join public.clinic_events e on e.id=p_event_id
      where pu.auth_user_id=p_actor_user_id and pu.status='active' and
      ((pu.role='internal_admin' and pu.partner_slug is null) or (pu.role='partner_admin' and pu.partner_slug=e.partner_slug))
  ) then raise exception 'clinic_incident_forbidden'; end if;
  if p_incident_id is null then
    insert into public.clinic_incidents(event_id,severity,status,category,summary,detail,reported_by,assigned_to,resolved_at)
    values(p_event_id,p_severity,p_status,p_category,p_summary,p_detail,p_actor_user_id,p_assigned_to,case when p_status in ('resolved','closed') then now() else null end)
    returning id into v_id;
  else
    update public.clinic_incidents set severity=p_severity,status=p_status,category=p_category,summary=p_summary,detail=p_detail,
      assigned_to=p_assigned_to,resolved_at=case when p_status in ('resolved','closed') then now() else null end
    where id=p_incident_id and event_id=p_event_id returning id into v_id;
  end if;
  if v_id is null then raise exception 'clinic_incident_not_found'; end if;
  insert into public.clinic_event_audit(event_id,actor_user_id,action,target_type,target_id)
  values(p_event_id,p_actor_user_id,'incident_saved','incident',v_id);
  return v_id;
end $$;

create or replace function public.clinic_reserve_packet_credit(p_case_id uuid, p_render_job_id uuid)
returns table(outcome text, reservation_id uuid)
language plpgsql security definer set search_path = ''
as $$
declare v_case public.clinic_cases%rowtype; v_existing public.clinic_packet_reservations%rowtype; v_id uuid;
begin
  select * into v_case from public.clinic_cases where id=p_case_id for update;
  if not found then return query select 'case_not_found'::text,null::uuid; return; end if;
  if v_case.route_disposition <> 'packet' then return query select 'no_credit_route'::text,null::uuid; return; end if;
  select * into v_existing from public.clinic_packet_reservations where clinic_case_id=p_case_id or render_job_id=p_render_job_id for update;
  if found then return query select case when v_existing.status='consumed' then 'already_consumed' else 'already_reserved' end,v_existing.id; return; end if;
  if not exists(select 1 from public.packet_render_jobs where id=p_render_job_id) then return query select 'render_job_not_found'::text,null::uuid; return; end if;
  insert into public.clinic_packet_reservations(event_id,clinic_case_id,render_job_id,participant_user_id)
  values(v_case.event_id,v_case.id,p_render_job_id,v_case.participant_user_id) returning id into v_id;
  insert into public.clinic_event_audit(event_id,action,target_type,target_id)
  values(v_case.event_id,'packet_credit_reserved','packet_reservation',v_id);
  return query select 'reserved'::text,v_id;
end $$;

create or replace function public.clinic_finalize_packet_credit(p_render_job_id uuid)
returns table(outcome text, reservation_id uuid)
language plpgsql security definer set search_path = ''
as $$
declare v_res public.clinic_packet_reservations%rowtype; v_job public.packet_render_jobs%rowtype;
begin
  select * into v_res from public.clinic_packet_reservations where render_job_id=p_render_job_id for update;
  if not found then return query select 'reservation_not_found'::text,null::uuid; return; end if;
  if v_res.status='consumed' then return query select 'already_consumed'::text,v_res.id; return; end if;
  if v_res.status='released' then return query select 'reservation_released'::text,v_res.id; return; end if;
  select * into v_job from public.packet_render_jobs where id=p_render_job_id for update;
  if v_job.status not in ('artifact_validated','delivered') then return query select 'artifact_not_validated'::text,v_res.id; return; end if;
  if v_job.accounting_result not in ('consumed','already_consumed','overage_consumed') or v_job.credit_ledger_id is null
    then return query select 'accounting_blocked'::text,v_res.id; return; end if;
  update public.clinic_packet_reservations set status='consumed',packet_credit_ledger_id=v_job.credit_ledger_id,consumed_at=now()
    where id=v_res.id;
  insert into public.clinic_event_audit(event_id,action,target_type,target_id,metadata)
  values(v_res.event_id,'packet_credit_consumed','packet_reservation',v_res.id,jsonb_build_object('ledger_id',v_job.credit_ledger_id));
  return query select 'consumed'::text,v_res.id;
end $$;

create or replace function public.clinic_release_packet_credit(p_render_job_id uuid, p_reason text)
returns table(outcome text, reservation_id uuid)
language plpgsql security definer set search_path = ''
as $$
declare v_res public.clinic_packet_reservations%rowtype;
begin
  select * into v_res from public.clinic_packet_reservations where render_job_id=p_render_job_id for update;
  if not found then return query select 'reservation_not_found'::text,null::uuid; return; end if;
  if v_res.status='consumed' then return query select 'already_consumed'::text,v_res.id; return; end if;
  if v_res.status='released' then return query select 'already_released'::text,v_res.id; return; end if;
  update public.clinic_packet_reservations set status='released',released_at=now(),release_reason=p_reason where id=v_res.id;
  insert into public.clinic_event_audit(event_id,action,target_type,target_id,metadata)
  values(v_res.event_id,'packet_credit_released','packet_reservation',v_res.id,jsonb_build_object('reason',p_reason));
  return query select 'released'::text,v_res.id;
end $$;

alter table public.clinic_events enable row level security;
alter table public.clinic_event_staff enable row level security;
alter table public.clinic_event_access_codes enable row level security;
alter table public.clinic_event_access_redemptions enable row level security;
alter table public.clinic_assisted_sessions enable row level security;
alter table public.clinic_cases enable row level security;
alter table public.clinic_follow_ups enable row level security;
alter table public.clinic_incidents enable row level security;
alter table public.clinic_event_audit enable row level security;
alter table public.clinic_packet_reservations enable row level security;

create policy clinic_events_tenant_read on public.clinic_events for select to authenticated
using (public.clinic_can_read_event(id));
create policy clinic_event_staff_tenant_read on public.clinic_event_staff for select to authenticated
using (public.clinic_can_read_event(event_id));
create policy clinic_event_codes_admin_read on public.clinic_event_access_codes for select to authenticated
using (public.clinic_is_internal_admin() or (public.clinic_current_role()='partner_admin' and public.clinic_can_read_event(event_id)));
create policy clinic_event_redemptions_admin_read on public.clinic_event_access_redemptions for select to authenticated
using (public.clinic_is_internal_admin() or (public.clinic_current_role()='partner_admin' and public.clinic_can_read_event(event_id)));
create policy clinic_assisted_sessions_scoped_read on public.clinic_assisted_sessions for select to authenticated
using (participant_user_id=auth.uid() or public.clinic_is_internal_admin() or public.clinic_is_event_staff(event_id,'assist'));
create policy clinic_cases_scoped_read on public.clinic_cases for select to authenticated
using (participant_user_id=auth.uid() or public.clinic_is_internal_admin() or public.clinic_is_event_staff(event_id,'queue') or (public.clinic_current_role()='partner_admin' and public.clinic_can_read_event(event_id)));
create policy clinic_follow_ups_staff_read on public.clinic_follow_ups for select to authenticated
using (public.clinic_is_internal_admin() or public.clinic_is_event_staff(event_id,'follow_up') or (public.clinic_current_role()='partner_admin' and public.clinic_can_read_event(event_id)));
create policy clinic_incidents_staff_read on public.clinic_incidents for select to authenticated
using (public.clinic_is_internal_admin() or public.clinic_is_event_staff(event_id,'incident') or (public.clinic_current_role()='partner_admin' and public.clinic_can_read_event(event_id)));
create policy clinic_event_audit_admin_read on public.clinic_event_audit for select to authenticated
using (public.clinic_is_internal_admin() or (public.clinic_current_role()='partner_admin' and public.clinic_can_read_event(event_id)));
create policy clinic_packet_reservations_admin_read on public.clinic_packet_reservations for select to authenticated
using (public.clinic_is_internal_admin() or (public.clinic_current_role()='partner_admin' and public.clinic_can_read_event(event_id)));

revoke all on table public.clinic_events from public, anon, authenticated;
revoke all on table public.clinic_event_staff from public, anon, authenticated;
revoke all on table public.clinic_event_access_codes from public, anon, authenticated;
revoke all on table public.clinic_event_access_redemptions from public, anon, authenticated;
revoke all on table public.clinic_assisted_sessions from public, anon, authenticated;
revoke all on table public.clinic_cases from public, anon, authenticated;
revoke all on table public.clinic_follow_ups from public, anon, authenticated;
revoke all on table public.clinic_incidents from public, anon, authenticated;
revoke all on table public.clinic_event_audit from public, anon, authenticated;
revoke all on table public.clinic_packet_reservations from public, anon, authenticated;

grant select on public.clinic_events,public.clinic_event_staff,public.clinic_event_access_codes,
  public.clinic_event_access_redemptions,public.clinic_assisted_sessions,public.clinic_cases,
  public.clinic_follow_ups,public.clinic_incidents,public.clinic_event_audit,
  public.clinic_packet_reservations to authenticated, service_role;

revoke all on function public.clinic_current_partner_slug() from public, anon;
revoke all on function public.clinic_current_role() from public, anon;
revoke all on function public.clinic_is_internal_admin() from public, anon;
revoke all on function public.clinic_is_event_staff(uuid,text) from public, anon;
revoke all on function public.clinic_can_read_event(uuid) from public, anon;
grant execute on function public.clinic_current_partner_slug(),public.clinic_current_role(),public.clinic_is_internal_admin(),public.clinic_is_event_staff(uuid,text),public.clinic_can_read_event(uuid) to authenticated, service_role;

revoke all on function public.clinic_create_event(uuid,text,text,text,timestamptz,timestamptz,text,text,text,integer,integer) from public, anon, authenticated;
revoke all on function public.clinic_set_event_staff(uuid,uuid,uuid,text,text[]) from public, anon, authenticated;
revoke all on function public.clinic_create_access_code(uuid,uuid,text,text,integer,timestamptz,timestamptz) from public, anon, authenticated;
revoke all on function public.clinic_set_event_status(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.clinic_redeem_event_code(text,text,text) from public, anon, authenticated;
revoke all on function public.clinic_start_assisted_session(uuid,uuid,uuid,uuid,text,text,text,timestamptz,integer) from public, anon, authenticated;
revoke all on function public.clinic_end_assisted_session(uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.clinic_upsert_case(uuid,uuid,uuid,uuid,uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.clinic_transition_case(uuid,uuid,text,uuid,timestamptz) from public, anon, authenticated;
revoke all on function public.clinic_upsert_follow_up(uuid,uuid,uuid,uuid,timestamptz,text,text,text,text) from public, anon, authenticated;
revoke all on function public.clinic_record_incident(uuid,uuid,uuid,text,text,text,text,text,uuid) from public, anon, authenticated;
revoke all on function public.clinic_reserve_packet_credit(uuid,uuid) from public, anon, authenticated;
revoke all on function public.clinic_finalize_packet_credit(uuid) from public, anon, authenticated;
revoke all on function public.clinic_release_packet_credit(uuid,text) from public, anon, authenticated;

grant execute on function public.clinic_create_event(uuid,text,text,text,timestamptz,timestamptz,text,text,text,integer,integer),
  public.clinic_set_event_staff(uuid,uuid,uuid,text,text[]),
  public.clinic_create_access_code(uuid,uuid,text,text,integer,timestamptz,timestamptz),
  public.clinic_set_event_status(uuid,uuid,text),public.clinic_redeem_event_code(text,text,text),
  public.clinic_start_assisted_session(uuid,uuid,uuid,uuid,text,text,text,timestamptz,integer),
  public.clinic_end_assisted_session(uuid,uuid,text),public.clinic_upsert_case(uuid,uuid,uuid,uuid,uuid,text,text,text),
  public.clinic_transition_case(uuid,uuid,text,uuid,timestamptz),
  public.clinic_upsert_follow_up(uuid,uuid,uuid,uuid,timestamptz,text,text,text,text),
  public.clinic_record_incident(uuid,uuid,uuid,text,text,text,text,text,uuid),
  public.clinic_reserve_packet_credit(uuid,uuid),public.clinic_finalize_packet_credit(uuid),
  public.clinic_release_packet_credit(uuid,text) to service_role;

-- Keep the accounting authority explicit for review and mutation tests.
grant execute on function public.clinic_reserve_packet_credit(uuid,uuid) to service_role;
grant execute on function public.clinic_finalize_packet_credit(uuid) to service_role;
grant execute on function public.clinic_release_packet_credit(uuid,text) to service_role;

commit;
