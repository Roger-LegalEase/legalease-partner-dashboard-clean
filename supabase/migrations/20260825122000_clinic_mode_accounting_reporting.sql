-- Nationwide Clinic Mode: active-session hardening, authoritative packet
-- reservation, scoped follow-up reads, and aggregate-only event reporting.
--
-- Forward-only and Clinic-namespaced. No live migration is run by this lane.

begin;

drop policy if exists clinic_assisted_sessions_scoped_read on public.clinic_assisted_sessions;
create policy clinic_assisted_sessions_scoped_read on public.clinic_assisted_sessions
for select to authenticated using (
  public.clinic_is_internal_admin()
  or (
    status in ('active','handed_off') and expires_at > now()
    and (
      participant_user_id = auth.uid()
      or public.clinic_is_event_staff(event_id,'assist')
    )
  )
);

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
    select 1 from public.clinic_event_staff s
    join public.partner_users pu on pu.id=s.partner_user_id
    join public.clinic_events e on e.id=s.event_id
    where s.id=p_event_staff_id and s.event_id=p_event_id and s.status='approved'
      and 'assist'=any(s.permissions) and pu.status='active' and pu.partner_slug=e.partner_slug
      and e.status='published'
  ) then raise exception 'clinic_staff_not_approved'; end if;
  if not exists (select 1 from auth.users where id=p_participant_user_id) then raise exception 'clinic_participant_not_found'; end if;
  if p_screening_session_id is null or not exists (
    select 1 from public.screening_sessions where session_id=p_screening_session_id
  ) then raise exception 'clinic_screening_not_found'; end if;
  insert into public.clinic_assisted_sessions(
    event_id,event_staff_id,participant_user_id,screening_session_id,handoff_token_hash,
    device_nonce_hash,consent_version,consented_at,expires_at
  ) values (
    p_event_id,p_event_staff_id,p_participant_user_id,p_screening_session_id,
    lower(p_handoff_token_hash),lower(p_device_nonce_hash),trim(p_consent_version),
    p_consented_at,now()+make_interval(mins=>p_ttl_minutes)
  ) returning id into v_id;
  insert into public.clinic_event_audit(event_id,action,target_type,target_id,metadata)
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
  if p_reason not in ('participant_handoff','participant_request','staff_reset','inactivity','event_closed','security_reset')
    then return 'invalid_reason'; end if;
  if p_actor_user_id <> v_session.participant_user_id and not exists (
    select 1 from public.clinic_event_staff s
    join public.partner_users pu on pu.id=s.partner_user_id
    join public.clinic_events e on e.id=s.event_id
    where s.event_id=v_session.event_id and s.status='approved' and 'assist'=any(s.permissions)
      and pu.auth_user_id=p_actor_user_id and pu.status='active' and pu.partner_slug=e.partner_slug
  ) then return 'forbidden'; end if;
  update public.clinic_assisted_sessions
  set status=case when p_reason in ('staff_reset','security_reset') then 'reset' else 'ended' end,
    ended_at=now(), ended_reason=p_reason
  where id=p_session_id;
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
  if not exists (
    select 1 from public.clinic_assisted_sessions s
    where s.id=p_assisted_session_id and s.event_id=p_event_id
      and s.participant_user_id=p_participant_user_id
      and s.screening_session_id=p_screening_session_id
      and s.status in ('active','handed_off') and s.expires_at>now()
  ) then raise exception 'clinic_session_owner_mismatch'; end if;
  if p_matter_id is not null and not exists (
    select 1 from public.consumer_briefcase_items b
    where b.id=p_matter_id and b.user_id=p_participant_user_id
  ) then raise exception 'clinic_matter_owner_mismatch'; end if;
  if p_matter_id is not null and exists (
    select 1 from public.clinic_cases c
    where c.event_id=p_event_id and c.participant_user_id=p_participant_user_id
      and c.screening_session_id=p_screening_session_id and c.matter_id is not null
      and c.matter_id is distinct from p_matter_id
  ) then raise exception 'clinic_matter_rebind_forbidden'; end if;
  insert into public.clinic_cases(
    event_id,participant_user_id,assisted_session_id,screening_session_id,
    matter_id,queue_status,route_disposition,jurisdiction
  ) values (
    p_event_id,p_participant_user_id,p_assisted_session_id,p_screening_session_id,
    p_matter_id,p_queue_status,p_route_disposition,upper(p_jurisdiction)
  )
  on conflict(event_id,participant_user_id,screening_session_id) do update set
    assisted_session_id=excluded.assisted_session_id,
    matter_id=coalesce(excluded.matter_id,clinic_cases.matter_id),
    queue_status=excluded.queue_status,route_disposition=excluded.route_disposition,
    last_activity_at=now()
  returning id into v_id;
  return v_id;
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
    join public.clinic_events e on e.id=s.event_id
    where s.event_id=v_case.event_id and s.status='approved' and 'follow_up'=any(s.permissions)
      and pu.auth_user_id=p_actor_user_id and pu.status='active' and pu.partner_slug=e.partner_slug
    union all
    select 1 from public.partner_users pu join public.clinic_events e on e.id=v_case.event_id
    where pu.auth_user_id=p_actor_user_id and pu.status='active' and
      ((pu.role='internal_admin' and pu.partner_slug is null) or
       (pu.role='partner_admin' and pu.partner_slug=e.partner_slug))
  ) then raise exception 'clinic_follow_up_forbidden'; end if;
  if p_owner_event_staff_id is not null and not exists(
    select 1 from public.clinic_event_staff s
    where s.id=p_owner_event_staff_id and s.event_id=v_case.event_id and s.status='approved'
      and 'follow_up'=any(s.permissions)
  ) then raise exception 'clinic_follow_up_owner_invalid'; end if;
  if p_follow_up_id is null then
    insert into public.clinic_follow_ups(
      event_id,clinic_case_id,owner_event_staff_id,due_at,status,communication_state,
      participant_safe_message,internal_notes,created_by,completed_at
    ) values (
      v_case.event_id,p_case_id,p_owner_event_staff_id,p_due_at,p_status,p_communication_state,
      nullif(trim(p_participant_safe_message),''),nullif(trim(p_internal_notes),''),p_actor_user_id,
      case when p_status='completed' then now() else null end
    ) returning id into v_id;
  else
    update public.clinic_follow_ups set
      owner_event_staff_id=p_owner_event_staff_id,due_at=p_due_at,status=p_status,
      communication_state=p_communication_state,
      participant_safe_message=nullif(trim(p_participant_safe_message),''),
      internal_notes=nullif(trim(p_internal_notes),''),
      completed_at=case when p_status='completed' then now() else null end
    where id=p_follow_up_id and clinic_case_id=p_case_id and event_id=v_case.event_id
    returning id into v_id;
  end if;
  if v_id is null then raise exception 'clinic_follow_up_not_found'; end if;
  insert into public.clinic_event_audit(event_id,actor_user_id,action,target_type,target_id)
  values(v_case.event_id,p_actor_user_id,'follow_up_saved','follow_up',v_id);
  return v_id;
end $$;

-- A failed job may be retried with a new job. A consumed or still-reserved case
-- remains exactly-once. The render job itself remains globally unique.
alter table public.clinic_packet_reservations
  drop constraint if exists clinic_packet_reservations_clinic_case_id_key;
create unique index if not exists clinic_packet_reservations_active_case_idx
  on public.clinic_packet_reservations(clinic_case_id)
  where status in ('reserved','consumed');

create or replace function public.clinic_reserve_packet_credit(p_case_id uuid, p_render_job_id uuid)
returns table(outcome text, reservation_id uuid)
language plpgsql security definer set search_path = ''
as $$
declare
  v_case public.clinic_cases%rowtype;
  v_event public.clinic_events%rowtype;
  v_job public.packet_render_jobs%rowtype;
  v_existing public.clinic_packet_reservations%rowtype;
  v_active_count integer;
  v_id uuid;
begin
  select * into v_case from public.clinic_cases where id=p_case_id for update;
  if not found then return query select 'case_not_found'::text,null::uuid; return; end if;
  if v_case.route_disposition <> 'packet' then return query select 'no_credit_route'::text,null::uuid; return; end if;
  if v_case.matter_id is null then return query select 'matter_not_bound'::text,null::uuid; return; end if;

  select * into v_job from public.packet_render_jobs where id=p_render_job_id for update;
  if not found then return query select 'render_job_not_found'::text,null::uuid; return; end if;
  select * into v_event from public.clinic_events where id=v_case.event_id for update;
  if not found or v_event.status not in ('published','paused','closed')
    then return query select 'event_unavailable'::text,null::uuid; return; end if;
  if v_job.matter_id is distinct from v_case.matter_id
    or v_job.partner_id is distinct from (
      select pr.id from public.partner_records pr where pr.partner_slug=v_event.partner_slug
    )
    or (v_job.consumer_auth_user_id is not null and v_job.consumer_auth_user_id is distinct from v_case.participant_user_id)
  then return query select 'render_job_owner_mismatch'::text,null::uuid; return; end if;

  select * into v_existing from public.clinic_packet_reservations
  where render_job_id=p_render_job_id for update;
  if found then
    return query select case v_existing.status
      when 'consumed' then 'already_consumed'
      when 'released' then 'already_released'
      else 'already_reserved' end,v_existing.id;
    return;
  end if;
  select * into v_existing from public.clinic_packet_reservations
  where clinic_case_id=p_case_id and status in ('reserved','consumed') for update;
  if found then
    return query select case when v_existing.status='consumed' then 'already_consumed' else 'already_reserved' end,v_existing.id;
    return;
  end if;

  if v_event.sponsorship_allocation is not null then
    select count(*)::integer into v_active_count
    from public.clinic_packet_reservations
    where event_id=v_event.id and status in ('reserved','consumed');
    if v_active_count >= v_event.sponsorship_allocation
      then return query select 'sponsorship_exhausted'::text,null::uuid; return; end if;
  end if;

  insert into public.clinic_packet_reservations(
    event_id,clinic_case_id,render_job_id,participant_user_id
  ) values (v_case.event_id,v_case.id,p_render_job_id,v_case.participant_user_id)
  returning id into v_id;
  insert into public.clinic_event_audit(event_id,action,target_type,target_id)
  values(v_case.event_id,'packet_credit_reserved','packet_reservation',v_id);
  return query select 'reserved'::text,v_id;
end $$;

create or replace function public.clinic_release_packet_credit(p_render_job_id uuid, p_reason text)
returns table(outcome text, reservation_id uuid)
language plpgsql security definer set search_path = ''
as $$
declare
  v_res public.clinic_packet_reservations%rowtype;
  v_job public.packet_render_jobs%rowtype;
  v_case public.clinic_cases%rowtype;
  v_event public.clinic_events%rowtype;
begin
  select * into v_res from public.clinic_packet_reservations where render_job_id=p_render_job_id for update;
  if not found then return query select 'reservation_not_found'::text,null::uuid; return; end if;
  if v_res.status='consumed' then return query select 'already_consumed'::text,v_res.id; return; end if;
  if v_res.status='released' then return query select 'already_released'::text,v_res.id; return; end if;
  if p_reason not in ('generation_failed','route_changed','event_closed','manual_cancellation')
    then return query select 'invalid_reason'::text,v_res.id; return; end if;
  select * into v_job from public.packet_render_jobs where id=p_render_job_id;
  select * into v_case from public.clinic_cases where id=v_res.clinic_case_id;
  select * into v_event from public.clinic_events where id=v_res.event_id;
  if p_reason='generation_failed' and v_job.status <> 'failed'
    then return query select 'job_not_failed'::text,v_res.id; return; end if;
  if p_reason='route_changed' and v_case.route_disposition='packet'
    then return query select 'route_still_packet'::text,v_res.id; return; end if;
  if p_reason='event_closed' and v_event.status not in ('closed','archived')
    then return query select 'event_still_open'::text,v_res.id; return; end if;
  update public.clinic_packet_reservations
  set status='released',released_at=now(),release_reason=p_reason
  where id=v_res.id;
  insert into public.clinic_event_audit(event_id,action,target_type,target_id,metadata)
  values(v_res.event_id,'packet_credit_released','packet_reservation',v_res.id,jsonb_build_object('reason',p_reason));
  return query select 'released'::text,v_res.id;
end $$;

-- Participant callers supply only the render job id. The database derives the
-- one Clinic case from authenticated ownership, event sponsorship, and the
-- server-owned job matter. A caller-supplied case, matter, event, or tenant id
-- is never an accounting authority.
create or replace function public.clinic_reserve_participant_packet_credit(
  p_render_job_id uuid, p_actor_user_id uuid, p_handoff_token_hash text
)
returns table(outcome text, reservation_id uuid)
language plpgsql security definer set search_path = ''
as $$
declare v_case_id uuid;
begin
  select c.id into v_case_id
  from public.packet_render_jobs j
  join public.partner_records pr on pr.id=j.partner_id
  join public.clinic_events e on e.partner_slug=pr.partner_slug
  join public.clinic_cases c on c.event_id=e.id and c.matter_id=j.matter_id
  join public.clinic_assisted_sessions s on s.id=c.assisted_session_id
  where j.id=p_render_job_id and c.participant_user_id=p_actor_user_id
    and c.route_disposition='packet'
    and s.participant_user_id=p_actor_user_id
    and s.handoff_token_hash=lower(p_handoff_token_hash)
    and s.status in ('active','handed_off') and s.expires_at>now()
    and (j.consumer_auth_user_id is null or j.consumer_auth_user_id=p_actor_user_id)
  limit 1;
  if v_case_id is null then
    return query select 'render_job_owner_mismatch'::text,null::uuid;
    return;
  end if;
  return query select * from public.clinic_reserve_packet_credit(v_case_id,p_render_job_id);
end $$;

create or replace function public.clinic_sync_packet_reservation()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if not exists(select 1 from public.clinic_packet_reservations r where r.render_job_id=new.id and r.status='reserved')
    then return new; end if;
  if new.status='failed' and new.failure_disposition='terminal' then
    perform public.clinic_release_packet_credit(new.id,'generation_failed');
  elsif new.status in ('artifact_validated','delivered')
    and new.accounting_result in ('consumed','already_consumed','overage_consumed')
    and new.credit_ledger_id is not null then
    perform public.clinic_finalize_packet_credit(new.id);
  end if;
  return new;
end $$;

drop trigger if exists clinic_sync_packet_reservation_after_job on public.packet_render_jobs;
create trigger clinic_sync_packet_reservation_after_job
after update of status,accounting_result,credit_ledger_id on public.packet_render_jobs
for each row execute function public.clinic_sync_packet_reservation();

create or replace function public.clinic_actor_can_event(
  p_event_id uuid, p_actor_user_id uuid, p_permission text
)
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.clinic_events e
    join public.partner_users pu on pu.auth_user_id=p_actor_user_id and pu.status='active'
    where e.id=p_event_id and (
      (pu.role='internal_admin' and pu.partner_slug is null)
      or (pu.role='partner_admin' and pu.partner_slug=e.partner_slug)
    )
  ) or exists (
    select 1 from public.clinic_event_staff s
    join public.partner_users pu on pu.id=s.partner_user_id and pu.status='active'
    join public.clinic_events e on e.id=s.event_id and e.partner_slug=pu.partner_slug
    where s.event_id=p_event_id and s.status='approved'
      and pu.auth_user_id=p_actor_user_id and p_permission=any(s.permissions)
  )
$$;

create or replace function public.clinic_upsert_event_follow_up(
  p_event_id uuid, p_follow_up_id uuid, p_case_id uuid, p_actor_user_id uuid,
  p_owner_event_staff_id uuid, p_due_at timestamptz, p_status text,
  p_communication_state text, p_participant_safe_message text, p_internal_notes text
)
returns uuid language plpgsql security definer set search_path = ''
as $$
begin
  if not public.clinic_actor_can_event(p_event_id,p_actor_user_id,'follow_up')
    then raise exception 'clinic_follow_up_forbidden'; end if;
  if not exists(select 1 from public.clinic_cases c where c.id=p_case_id and c.event_id=p_event_id)
    then raise exception 'clinic_follow_up_event_mismatch'; end if;
  return public.clinic_upsert_follow_up(
    p_follow_up_id,p_case_id,p_actor_user_id,p_owner_event_staff_id,p_due_at,
    p_status,p_communication_state,p_participant_safe_message,p_internal_notes
  );
end $$;

create or replace function public.clinic_get_event_queue(p_event_id uuid, p_actor_user_id uuid)
returns table(
  id uuid,event_id uuid,participant_user_id uuid,queue_status text,
  route_disposition text,jurisdiction text,court_identity_verified boolean,
  county_name text,court_name text,follow_up_due_at timestamptz,last_activity_at timestamptz
)
language plpgsql security definer set search_path = ''
as $$
declare v_privileged boolean;
begin
  if not public.clinic_actor_can_event(p_event_id,p_actor_user_id,'queue')
    then raise exception 'clinic_queue_forbidden'; end if;
  select exists(
    select 1 from public.clinic_events e join public.partner_users pu on pu.auth_user_id=p_actor_user_id and pu.status='active'
    where e.id=p_event_id and ((pu.role='internal_admin' and pu.partner_slug is null) or (pu.role='partner_admin' and pu.partner_slug=e.partner_slug))
  ) into v_privileged;
  return query
  select c.id,c.event_id,c.participant_user_id,c.queue_status,c.route_disposition,
    c.jurisdiction,c.court_identity_verified,c.county_name,c.court_name,
    c.follow_up_due_at,c.last_activity_at
  from public.clinic_cases c
  where c.event_id=p_event_id and (
    v_privileged or exists(
      select 1 from public.clinic_assisted_sessions s
      where s.id=c.assisted_session_id and s.event_id=c.event_id
        and s.status in ('active','handed_off') and s.expires_at>now()
    )
  )
  order by c.last_activity_at desc;
end $$;

create or replace function public.clinic_transition_event_case(
  p_event_id uuid,p_case_id uuid,p_actor_user_id uuid,p_queue_status text
)
returns text language plpgsql security definer set search_path = ''
as $$
declare v_privileged boolean;
begin
  if not public.clinic_actor_can_event(p_event_id,p_actor_user_id,'queue')
    then return 'forbidden'; end if;
  if not exists(select 1 from public.clinic_cases c where c.id=p_case_id and c.event_id=p_event_id)
    then return 'not_found'; end if;
  select exists(
    select 1 from public.clinic_events e join public.partner_users pu on pu.auth_user_id=p_actor_user_id and pu.status='active'
    where e.id=p_event_id and ((pu.role='internal_admin' and pu.partner_slug is null) or (pu.role='partner_admin' and pu.partner_slug=e.partner_slug))
  ) into v_privileged;
  if not v_privileged and not exists(
    select 1 from public.clinic_cases c join public.clinic_assisted_sessions s on s.id=c.assisted_session_id
    where c.id=p_case_id and c.event_id=p_event_id and s.status in ('active','handed_off') and s.expires_at>now()
  ) then return 'session_inactive'; end if;
  return public.clinic_transition_case(p_case_id,p_actor_user_id,p_queue_status,null,null);
end $$;

create or replace function public.clinic_get_follow_ups(p_event_id uuid, p_actor_user_id uuid)
returns table(
  id uuid, clinic_case_id uuid, owner_event_staff_id uuid, jurisdiction text,
  due_at timestamptz, status text, communication_state text,
  participant_safe_message text, internal_notes text, updated_at timestamptz
)
language plpgsql security definer set search_path = ''
as $$
begin
  if not public.clinic_actor_can_event(p_event_id,p_actor_user_id,'follow_up')
    then raise exception 'clinic_follow_up_forbidden'; end if;
  return query
  select f.id,f.clinic_case_id,f.owner_event_staff_id,c.jurisdiction,f.due_at,
    f.status,f.communication_state,f.participant_safe_message,f.internal_notes,f.updated_at
  from public.clinic_follow_ups f
  join public.clinic_cases c on c.id=f.clinic_case_id and c.event_id=f.event_id
  where f.event_id=p_event_id
  order by f.due_at nulls last,f.updated_at desc;
end $$;

create or replace function public.clinic_get_event_report(p_event_id uuid, p_actor_user_id uuid)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_report jsonb;
begin
  if not public.clinic_actor_can_event(p_event_id,p_actor_user_id,'reporting')
    then raise exception 'clinic_reporting_forbidden'; end if;
  select jsonb_build_object(
    'eventId',e.id,
    'eventName',e.name,
    'eventStatus',e.status,
    'capacity',e.capacity,
    'entries',(select count(*) from public.clinic_event_access_redemptions r where r.event_id=e.id),
    'participants',(select count(*) from public.clinic_cases c where c.event_id=e.id),
    'queueCounts',coalesce((
      select jsonb_object_agg(q.queue_status,q.total)
      from (select c.queue_status,count(*) as total from public.clinic_cases c where c.event_id=e.id group by c.queue_status) q
    ),'{}'::jsonb),
    'routeCounts',coalesce((
      select jsonb_object_agg(r.route_disposition,r.total)
      from (select c.route_disposition,count(*) as total from public.clinic_cases c where c.event_id=e.id group by c.route_disposition) r
    ),'{}'::jsonb),
    'followUpCounts',coalesce((
      select jsonb_object_agg(f.status,f.total)
      from (select u.status,count(*) as total from public.clinic_follow_ups u where u.event_id=e.id group by u.status) f
    ),'{}'::jsonb),
    'sponsorship',jsonb_build_object(
      'allocation',e.sponsorship_allocation,
      'reserved',(select count(*) from public.clinic_packet_reservations p where p.event_id=e.id and p.status='reserved'),
      'consumed',(select count(*) from public.clinic_packet_reservations p where p.event_id=e.id and p.status='consumed'),
      'released',(select count(*) from public.clinic_packet_reservations p where p.event_id=e.id and p.status='released')
    ),
    'incidents',jsonb_build_object(
      'open',(select count(*) from public.clinic_incidents i where i.event_id=e.id and i.status in ('open','investigating')),
      'resolved',(select count(*) from public.clinic_incidents i where i.event_id=e.id and i.status in ('resolved','closed'))
    )
  ) into v_report
  from public.clinic_events e where e.id=p_event_id;
  if v_report is null then raise exception 'clinic_event_not_found'; end if;
  return v_report;
end $$;

revoke all on function public.clinic_actor_can_event(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.clinic_reserve_participant_packet_credit(uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.clinic_sync_packet_reservation() from public,anon,authenticated;
revoke all on function public.clinic_upsert_event_follow_up(uuid,uuid,uuid,uuid,uuid,timestamptz,text,text,text,text) from public,anon,authenticated;
revoke all on function public.clinic_get_event_queue(uuid,uuid) from public,anon,authenticated;
revoke all on function public.clinic_transition_event_case(uuid,uuid,uuid,text) from public,anon,authenticated;
revoke all on function public.clinic_get_follow_ups(uuid,uuid) from public,anon,authenticated;
revoke all on function public.clinic_get_event_report(uuid,uuid) from public,anon,authenticated;
grant execute on function public.clinic_actor_can_event(uuid,uuid,text) to service_role;
grant execute on function public.clinic_reserve_participant_packet_credit(uuid,uuid,text) to service_role;
grant execute on function public.clinic_upsert_event_follow_up(uuid,uuid,uuid,uuid,uuid,timestamptz,text,text,text,text) to service_role;
grant execute on function public.clinic_get_event_queue(uuid,uuid) to service_role;
grant execute on function public.clinic_transition_event_case(uuid,uuid,uuid,text) to service_role;
grant execute on function public.clinic_get_follow_ups(uuid,uuid) to service_role;
grant execute on function public.clinic_get_event_report(uuid,uuid) to service_role;

commit;
