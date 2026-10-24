-- Ordinary partner sponsorship uses protected claimed acquisition, never a
-- missing Clinic event as permission. No grant, partner, balance or fixture is seeded.
begin;

do $prerequisites$
declare signature text;
begin
  foreach signature in array array[
    'public.rcap_partner_activation_for_launch(text)',
    'public.rcap_program_packet_scope_authorized(text,text)',
    'public.allocate_clinic_packet_funding(uuid,uuid,text)'
  ] loop
    if to_regprocedure(signature) is null then
      raise exception 'ordinary sponsorship prerequisite is absent: %',signature;
    end if;
  end loop;
end;
$prerequisites$;

create table public.ordinary_sponsored_packet_routes (
  route_key text not null references public.sponsored_packet_render_routes(route_key),
  partner_slug text not null references public.partner_records(partner_slug),
  packet_specification_sha256 text not null check (packet_specification_sha256 ~ '^[a-f0-9]{64}$'),
  active boolean not null default false,
  primary key (route_key, partner_slug)
);
alter table public.ordinary_sponsored_packet_routes enable row level security;
revoke all on public.ordinary_sponsored_packet_routes from public, anon, authenticated, service_role;
grant select on public.ordinary_sponsored_packet_routes to service_role;

-- Keep one reservation ledger so ordinary and Clinic contenders serialize and
-- count the same partner/packet capacity. Existing rows and API remain Clinic.
alter table public.clinic_packet_funding
  add column acquisition_mode text not null default 'clinic',
  alter column event_id drop not null,
  add constraint sponsored_funding_acquisition_scope check (
    (acquisition_mode = 'clinic' and event_id is not null)
    or (acquisition_mode = 'partner' and event_id is null and funding_mode = 'sponsored')
  );

-- Preserve the canonical composition row and its Clinic registration. An exact
-- separately registered partner can use that composition only for its own
-- claimed eventless source. The returned partner is server-resolved, not an alias.
create function public.sponsored_packet_route_for_source(
  p_route text, p_session uuid, p_item uuid, p_owner uuid
) returns setof public.sponsored_packet_render_routes
language plpgsql stable security definer set search_path = '' as $scope$
declare
  v_route public.sponsored_packet_render_routes%rowtype;
  v_source public.consumer_pending_screening_results%rowtype;
begin
  select * into v_route from public.sponsored_packet_render_routes where route_key=p_route and active;
  if not found then return; end if;
  select s.* into v_source from public.consumer_pending_screening_results s
    join public.consumer_briefcase_items i on i.source_pending_result_id=s.pending_id
    where i.id=p_item and i.user_id=p_owner and s.status='CLAIMED'
      and s.claimed_matter_id=i.id and s.claimed_user_id=i.user_id
      and s.anonymous_session_id=p_session and s.product='rcap_partner';
  if not found then return; end if;
  if v_source.event_id is null then
    if exists(select 1 from public.clinic_cases c
      where c.matter_id=p_item or c.screening_session_id=p_session)
      or not exists(select 1 from public.ordinary_sponsored_packet_routes r
        where r.route_key=p_route and r.partner_slug=v_source.partner_slug and r.active
          and r.packet_specification_sha256=v_route.packet_specification_sha256)
      or not coalesce(public.rcap_partner_activation_for_launch(v_source.partner_slug),false)
      or not coalesce(public.rcap_program_packet_scope_authorized(v_source.partner_slug,v_route.jurisdiction),false)
    then return; end if;
    v_route.partner_slug := v_source.partner_slug;
    v_route.clinic_event_name := null;
  elsif v_source.partner_slug is distinct from v_route.partner_slug then return;
  end if;
  return next v_route;
end;
$scope$;
revoke all on function public.sponsored_packet_route_for_source(text,uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.sponsored_packet_route_for_source(text,uuid,uuid,uuid) to service_role;

-- Refuse an unrecognized deployed body rather than overwrite later guards.
create function pg_temp.patch_sponsored_scope(p_signature text,p_old text,p_new text,p_count integer default 1)
returns void language plpgsql as $patch$
declare v_sql text;
begin
  v_sql:=pg_get_functiondef(p_signature::regprocedure);
  if (length(v_sql)-length(replace(v_sql,p_old,'')))/length(p_old) <> p_count then
    raise exception 'unrecognized sponsored scope boundary: %',p_signature;
  end if;
  execute replace(v_sql,p_old,p_new);
end;
$patch$;

select pg_temp.patch_sponsored_scope('public.sponsored_packet_render_authority(text,uuid,uuid,uuid)',$old$  select * into v_route from public.sponsored_packet_render_routes r
   where r.route_key = p_route_key and r.active;$old$,$new$  select * into v_route from public.sponsored_packet_route_for_source(
    p_route_key,p_session_id,p_briefcase_item_id,p_consumer_auth_user_id);$new$,1);

select pg_temp.patch_sponsored_scope('public.enqueue_verified_sponsored_packet_render(text,uuid,uuid,text,text,text,text,text,text,text,uuid,uuid,uuid,integer,uuid,text,jsonb,jsonb)',$old$  select * into v_route from public.sponsored_packet_render_routes r
   where r.route_key = p_route_key and r.active;$old$,$new$  select * into v_route from public.sponsored_packet_route_for_source(
    p_route_key,p_session_id,p_briefcase_item_id,p_expected_consumer_auth_user_id);$new$,1);

select pg_temp.patch_sponsored_scope('public.finalize_sponsored_packet_generation_for_route(text,uuid,uuid,text,jsonb,uuid)',$old$  select * into v_route from public.sponsored_packet_render_routes r
   where r.route_key = p_route_key and r.active;$old$,$new$  select * into v_route from public.sponsored_packet_route_for_source(
    p_route_key,p_session_id,p_briefcase_item_id,(select i.user_id from public.consumer_briefcase_items i where i.id=p_briefcase_item_id));$new$,1);

select pg_temp.patch_sponsored_scope('public.sponsored_packet_render_authority(text,uuid,uuid,uuid)',$old$  select c.* into v_case from public.clinic_cases c
   where c.event_id = v_source.event_id
     and c.participant_user_id = v_item.user_id
     and c.screening_session_id = p_session_id
     and c.matter_id = v_item.id;
  if not found then
    return query select false, 'clinic_scope_mismatch'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;
  if v_case.jurisdiction is distinct from v_route.jurisdiction or v_case.route_disposition <> 'packet' then
    return query select false, 'wrong_jurisdiction_or_route'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  select * into v_event from public.clinic_events e where e.id = v_case.event_id;
  if not found
     or v_event.partner_slug is distinct from v_route.partner_slug
     or v_event.program_key is distinct from v_route.program_key
     or (v_route.clinic_event_name is not null and v_event.name is distinct from v_route.clinic_event_name) then
    return query select false, 'clinic_scope_mismatch'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;
  if v_event.jurisdiction is distinct from v_route.jurisdiction then
    return query select false, 'wrong_jurisdiction_or_route'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;
  if v_event.status <> 'published'
     or v_event.sponsorship_allocation is null or v_event.sponsorship_allocation < 0 then
    return query select false, 'sponsorship_inactive'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;

$old$,$new$  if v_source.event_id is not null then
  select c.* into v_case from public.clinic_cases c
   where c.event_id = v_source.event_id
     and c.participant_user_id = v_item.user_id
     and c.screening_session_id = p_session_id
     and c.matter_id = v_item.id;
  if not found then
    return query select false, 'clinic_scope_mismatch'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;
  if v_case.jurisdiction is distinct from v_route.jurisdiction or v_case.route_disposition <> 'packet' then
    return query select false, 'wrong_jurisdiction_or_route'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  select * into v_event from public.clinic_events e where e.id = v_case.event_id;
  if not found
     or v_event.partner_slug is distinct from v_route.partner_slug
     or v_event.program_key is distinct from v_route.program_key
     or (v_route.clinic_event_name is not null and v_event.name is distinct from v_route.clinic_event_name) then
    return query select false, 'clinic_scope_mismatch'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;
  if v_event.jurisdiction is distinct from v_route.jurisdiction then
    return query select false, 'wrong_jurisdiction_or_route'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;
  if v_event.status <> 'published'
     or v_event.sponsorship_allocation is null or v_event.sponsorship_allocation < 0 then
    return query select false, 'sponsorship_inactive'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  end if;

$new$,1);

select pg_temp.patch_sponsored_scope('public.allocate_clinic_packet_funding(uuid,uuid,text)',$old$  select * into v_case from public.clinic_cases
    where matter_id=v_item.id and participant_user_id=v_item.user_id
      and screening_session_id=v_source.anonymous_session_id and event_id=v_source.event_id for update;
  if not found then return query select 'denied'::text,'clinic_scope_mismatch'::text; return; end if;
  select * into v_event from public.clinic_events where id=v_case.event_id for update;
$old$,$new$  if v_source.event_id is not null then
  select * into v_case from public.clinic_cases
    where matter_id=v_item.id and participant_user_id=v_item.user_id
      and screening_session_id=v_source.anonymous_session_id and event_id=v_source.event_id for update;
  if not found then return query select 'denied'::text,'clinic_scope_mismatch'::text; return; end if;
  select * into v_event from public.clinic_events where id=v_case.event_id for update;
  end if;
$new$,1);

select pg_temp.patch_sponsored_scope('public.allocate_clinic_packet_funding(uuid,uuid,text)',$old$  select * into v_route from public.sponsored_packet_render_routes
    where route_key=(v_verification.verification_snapshot->>'jurisdiction')||':'||
      (v_verification.verification_snapshot->>'pathwayId') and active;$old$,$new$  select * into v_route from public.sponsored_packet_route_for_source(
    (v_verification.verification_snapshot->>'jurisdiction')||':'||
      (v_verification.verification_snapshot->>'pathwayId'),
    v_source.anonymous_session_id,v_item.id,v_item.user_id);$new$,1);

select pg_temp.patch_sponsored_scope('public.allocate_clinic_packet_funding(uuid,uuid,text)',$old$v_event.partner_slug$old$,$new$v_source.partner_slug$new$,4);

select pg_temp.patch_sponsored_scope('public.allocate_clinic_packet_funding(uuid,uuid,text)',$old$       or v_choice.event_id is distinct from v_event.id$old$,$new$        or v_choice.acquisition_mode is distinct from (case when v_source.event_id is null then 'partner' else 'clinic' end)
        or v_choice.event_id is distinct from v_event.id$new$,1);

select pg_temp.patch_sponsored_scope('public.allocate_clinic_packet_funding(uuid,uuid,text)',$old$if v_event_used >= v_event.sponsorship_allocation then$old$,$new$if v_source.event_id is not null and v_event_used >= v_event.sponsorship_allocation then$new$,1);

select pg_temp.patch_sponsored_scope('public.allocate_clinic_packet_funding(uuid,uuid,text)',$old$  insert into public.clinic_packet_funding(briefcase_item_id$old$,$new$  if v_source.event_id is null and v_mode <> 'sponsored' then
    return query select 'denied'::text,v_reason; return;
  end if;
  insert into public.clinic_packet_funding(acquisition_mode,briefcase_item_id$new$,1);

select pg_temp.patch_sponsored_scope('public.allocate_clinic_packet_funding(uuid,uuid,text)',$old$    values(v_item.id,v_item.user_id$old$,$new$    values(case when v_source.event_id is null then 'partner' else 'clinic' end,v_item.id,v_item.user_id$new$,1);

select pg_temp.patch_sponsored_scope('public.finalize_sponsored_packet_generation_for_route(text,uuid,uuid,text,jsonb,uuid)',$old$  select c.* into v_case
  from public.clinic_cases c
  where c.event_id = v_source.event_id
    and c.participant_user_id = v_item.user_id
    and c.screening_session_id = p_session_id
    and c.matter_id = v_item.id
  for update;
  if not found then
    return query select false, false, 'not_counted'::text, 'clinic_scope_mismatch'::text;
    return;
  end if;
  if v_case.jurisdiction <> v_route.jurisdiction or v_case.route_disposition <> 'packet' then
    return query select false, false, 'not_counted'::text, 'wrong_jurisdiction_or_route'::text;
    return;
  end if;

  select * into v_event
  from public.clinic_events e
  where e.id = v_case.event_id
  for update;
  if not found
     or v_event.partner_slug is distinct from v_route.partner_slug
     or v_event.program_key is distinct from v_route.program_key
     or (v_route.clinic_event_name is not null and v_event.name is distinct from v_route.clinic_event_name) then
    return query select false, false, 'not_counted'::text, 'clinic_scope_mismatch'::text;
    return;
  end if;
  if v_event.jurisdiction is distinct from v_route.jurisdiction then
    return query select false, false, 'not_counted'::text, 'wrong_jurisdiction_or_route'::text;
    return;
  end if;
  if v_event.status <> 'published'
     or v_event.sponsorship_allocation is null
     or v_event.sponsorship_allocation <= 0 then
    return query select false, false, 'not_counted'::text, 'sponsorship_inactive'::text;
    return;
  end if;

$old$,$new$  if v_source.event_id is not null then
  select c.* into v_case
  from public.clinic_cases c
  where c.event_id = v_source.event_id
    and c.participant_user_id = v_item.user_id
    and c.screening_session_id = p_session_id
    and c.matter_id = v_item.id
  for update;
  if not found then
    return query select false, false, 'not_counted'::text, 'clinic_scope_mismatch'::text;
    return;
  end if;
  if v_case.jurisdiction <> v_route.jurisdiction or v_case.route_disposition <> 'packet' then
    return query select false, false, 'not_counted'::text, 'wrong_jurisdiction_or_route'::text;
    return;
  end if;

  select * into v_event
  from public.clinic_events e
  where e.id = v_case.event_id
  for update;
  if not found
     or v_event.partner_slug is distinct from v_route.partner_slug
     or v_event.program_key is distinct from v_route.program_key
     or (v_route.clinic_event_name is not null and v_event.name is distinct from v_route.clinic_event_name) then
    return query select false, false, 'not_counted'::text, 'clinic_scope_mismatch'::text;
    return;
  end if;
  if v_event.jurisdiction is distinct from v_route.jurisdiction then
    return query select false, false, 'not_counted'::text, 'wrong_jurisdiction_or_route'::text;
    return;
  end if;
  if v_event.status <> 'published'
     or v_event.sponsorship_allocation is null
     or v_event.sponsorship_allocation <= 0 then
    return query select false, false, 'not_counted'::text, 'sponsorship_inactive'::text;
    return;
  end if;

  end if;

$new$,1);

select pg_temp.patch_sponsored_scope('public.finalize_sponsored_packet_generation_for_route(text,uuid,uuid,text,jsonb,uuid)',$old$previous.sponsored_clinic_event_id = v_event.id$old$,$new$previous.sponsored_clinic_event_id is not distinct from v_event.id$new$,1);

select pg_temp.patch_sponsored_scope('public.finalize_sponsored_packet_generation_for_route(text,uuid,uuid,text,jsonb,uuid)',$old$a.metadata ->> 'clinic_event_id' = v_event.id::text$old$,$new$a.metadata ->> 'clinic_event_id' is not distinct from v_event.id::text$new$,1);

select pg_temp.patch_sponsored_scope('public.finalize_sponsored_packet_generation_for_route(text,uuid,uuid,text,jsonb,uuid)',$old$if v_event_artifact_count >= v_event.sponsorship_allocation then$old$,$new$if v_source.event_id is not null and v_event_artifact_count >= v_event.sponsorship_allocation then$new$,1);

select pg_temp.patch_sponsored_scope('public.finalize_sponsored_packet_generation_for_route(text,uuid,uuid,text,jsonb,uuid)',$old$where pe.partner_slug = v_event.partner_slug$old$,$new$where pe.partner_slug = v_route.partner_slug$new$,1);

select pg_temp.patch_sponsored_scope('public.finalize_sponsored_packet_generation_for_route(text,uuid,uuid,text,jsonb,uuid)',$old$('partner_entitlement', v_event.partner_slug, v_event.partner_slug,$old$,$new$('partner_entitlement', v_route.partner_slug, v_route.partner_slug,$new$,1);

select pg_temp.patch_sponsored_scope('public.finalize_sponsored_packet_generation_for_route(text,uuid,uuid,text,jsonb,uuid)',$old$       'counted_as', v_counted_as,
       'clinic_event_id', v_event.id
     )$old$,$new$       'counted_as', v_counted_as
     ) || case when v_source.event_id is null then '{}'::jsonb
          else jsonb_build_object('clinic_event_id',v_event.id) end$new$,1);

select pg_temp.patch_sponsored_scope('public.finalize_sponsored_packet_generation_for_route(text,uuid,uuid,text,jsonb,uuid)',$old$jsonb_build_object('counted_as', v_counted_as, 'clinic_event_id', v_event.id)$old$,$new$jsonb_build_object('counted_as', v_counted_as) || case when v_source.event_id is null then '{}'::jsonb
       else jsonb_build_object('clinic_event_id',v_event.id) end$new$,1);

select pg_temp.patch_sponsored_scope('public.finalize_sponsored_packet_generation_for_route(text,uuid,uuid,text,jsonb,uuid)',$old$         'overage_packet_price_cents', v_entitlement.overage_packet_price_cents,
         'clinic_event_id', v_event.id
       )$old$,$new$         'overage_packet_price_cents', v_entitlement.overage_packet_price_cents
       ) || case when v_source.event_id is null then '{}'::jsonb
            else jsonb_build_object('clinic_event_id',v_event.id) end$new$,1);

select pg_temp.patch_sponsored_scope('public.finalize_sponsored_packet_generation_for_route(text,uuid,uuid,text,jsonb,uuid)',$old$       or v_job.sponsored_session_id is distinct from p_session_id$old$,$new$       or v_job.sponsored_session_id is distinct from p_session_id
       or v_job.sponsored_clinic_event_id is distinct from v_source.event_id$new$,1);

select pg_temp.patch_sponsored_scope('public.consumer_render_job_verification_guard()',$old$(old.sponsored_clinic_event_id is not null and new.sponsored_clinic_event_id is distinct from old.sponsored_clinic_event_id)$old$,$new$(old.sponsored_route_key is not null and new.sponsored_clinic_event_id is distinct from old.sponsored_clinic_event_id)$new$,1);

select pg_temp.patch_sponsored_scope('public.consumer_render_job_verification_guard()',$old$       or new.sponsored_clinic_event_id is null
$old$,$new$$new$,1);

select pg_temp.patch_sponsored_scope('public.consumer_render_job_verification_guard()',$old$    if new.status in ('artifact_validated', 'delivered') then$old$,$new$    if new.sponsored_clinic_event_id is null and not exists (
      select 1 from public.sponsored_packet_render_authority(new.sponsored_route_key,
        new.sponsored_session_id,new.sponsored_consumer_briefcase_item_id,new.sponsored_consumer_auth_user_id) a
      where a.valid and a.clinic_event_id is null and a.clinic_case_id is null
        and a.partner_id=new.partner_id
    ) then raise exception 'ordinary sponsored render scope mismatch'; end if;
    if new.status in ('artifact_validated', 'delivered') then$new$,1);

drop function pg_temp.patch_sponsored_scope(text,text,text,integer);
commit;
