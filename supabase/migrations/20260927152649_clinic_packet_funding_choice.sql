-- Roger's cap rule: preserve acquisition and verified matter; choose funding
-- before rendering. Local candidate only. No backfill or historical counters.
begin;

create table public.clinic_packet_funding (
  briefcase_item_id uuid primary key references public.consumer_briefcase_items(id) on delete cascade,
  consumer_auth_user_id uuid not null,
  source_session_id uuid not null,
  event_id uuid not null references public.clinic_events(id),
  partner_slug text not null,
  packet_entitlement_id uuid not null references public.partner_packet_entitlement(id),
  route_key text not null,
  packet_family_id text not null,
  initial_verification_hash text not null check (initial_verification_hash ~ '^[a-f0-9]{64}$'),
  funding_mode text not null check (funding_mode in ('sponsored','dtc')),
  reason text not null check (reason in ('slot_reserved','event_cap_exhausted','partner_cap_exhausted')),
  created_at timestamptz not null default now()
);
alter table public.clinic_packet_funding enable row level security;
revoke all on public.clinic_packet_funding from public, anon, authenticated, service_role;
grant select on public.clinic_packet_funding to service_role;
comment on table public.clinic_packet_funding is
  'One immutable financial choice per owner-bound matter. A sponsored row reserves capacity, not delivered credit. DTC is a cap decision, never payment evidence. Source attribution stays unchanged.';

create function public.allocate_clinic_packet_funding(
  p_briefcase_item_id uuid, p_consumer_auth_user_id uuid, p_expected_verification_hash text
) returns table(funding_mode text, reason text)
language plpgsql security definer set search_path = '' as $funding$
declare
  v_item public.consumer_briefcase_items%rowtype;
  v_verification public.consumer_packet_verifications%rowtype;
  v_source public.consumer_pending_screening_results%rowtype;
  v_session public.screening_sessions%rowtype;
  v_case public.clinic_cases%rowtype;
  v_event public.clinic_events%rowtype;
  v_entitlement public.partner_entitlement%rowtype;
  v_choice public.clinic_packet_funding%rowtype;
  v_packet_entitlement public.partner_packet_entitlement%rowtype;
  v_packet_used bigint;
  v_route public.sponsored_packet_render_routes%rowtype;
  v_scope record;
  v_event_used bigint;
  v_partner_reserved bigint;
  v_mode text := 'sponsored';
  v_reason text := 'slot_reserved';
begin
  -- Match the canonical finalizer lock order. No client-selected sponsor/event.
  select * into v_item from public.consumer_briefcase_items
    where id=p_briefcase_item_id and user_id=p_consumer_auth_user_id for update;
  if not found then return query select 'denied'::text,'wrong_owner'::text; return; end if;
  select * into v_verification from public.consumer_packet_verifications
    where briefcase_item_id=v_item.id for update;
  if not found or v_verification.consumer_auth_user_id is distinct from v_item.user_id
     or v_verification.matter_id is distinct from public.consumer_matter_id_for_briefcase_item(v_item.id)
     or v_verification.status is distinct from 'verified'
     or v_verification.verification_hash is distinct from p_expected_verification_hash
     or p_expected_verification_hash is null then
    return query select 'denied'::text,'verification_mismatch'::text; return;
  end if;
  select * into v_source from public.consumer_pending_screening_results
    where pending_id=v_item.source_pending_result_id for update;
  if not found or v_source.product is distinct from 'rcap_partner'
     or v_source.claimed_user_id is distinct from v_item.user_id
     or v_source.claimed_matter_id is distinct from v_item.id or v_source.status is distinct from 'CLAIMED' then
    return query select 'denied'::text,'source_mismatch'::text; return;
  end if;
  select * into v_session from public.screening_sessions
    where session_id=v_source.anonymous_session_id for update;
  select * into v_case from public.clinic_cases
    where matter_id=v_item.id and participant_user_id=v_item.user_id
      and screening_session_id=v_source.anonymous_session_id and event_id=v_source.event_id for update;
  if not found then return query select 'denied'::text,'clinic_scope_mismatch'::text; return; end if;
  select * into v_event from public.clinic_events where id=v_case.event_id for update;
  select * into v_route from public.sponsored_packet_render_routes
    where route_key=(v_verification.verification_snapshot->>'jurisdiction')||':'||
      (v_verification.verification_snapshot->>'pathwayId') and active;
  if not found or (v_route.registry_track_id is not null and v_route.registry_track_id is distinct from
       v_verification.verification_snapshot->>'selectedTrackId') then
    return query select 'denied'::text,'route_mismatch'::text; return;
  end if;
  select * into v_scope from public.sponsored_packet_render_authority(
    v_route.route_key, v_source.anonymous_session_id, v_item.id, v_item.user_id);
  if not coalesce(v_scope.valid,false) then return query select 'denied'::text,v_scope.reason; return; end if;
  select * into v_choice from public.clinic_packet_funding where briefcase_item_id=v_item.id;
  if found then
    if v_choice.consumer_auth_user_id is distinct from v_item.user_id
       or v_choice.source_session_id is distinct from v_source.anonymous_session_id
       or v_choice.event_id is distinct from v_event.id or v_choice.partner_slug is distinct from v_event.partner_slug
       or v_choice.route_key is distinct from v_route.route_key or v_choice.packet_family_id is distinct from v_route.packet_family_id then
      return query select 'denied'::text,'funding_binding_mismatch'::text; return;
    end if;
    return query select v_choice.funding_mode,v_choice.reason; return;
  end if;
  -- Reuse delivered Applicant A and other already-consumed packets read-only.
  if exists(select 1 from public.consumer_packet_artifact_provenance p where p.briefcase_item_id=v_item.id
      and p.consumer_auth_user_id=v_item.user_id and p.entitlement_source='partner_sponsorship') then
    return query select 'sponsored'::text,'already_consumed'::text; return;
  end if;
  if v_session.claimed_slot_state is distinct from 'claimed' then
    return query select 'denied'::text,'sponsorship_inactive'::text; return;
  end if;
  -- Event and partner locks serialize all contenders, including different
  -- events sharing the final partner slot. Count reserved OR consumed once.
  select * into v_entitlement from public.partner_entitlement where partner_slug=v_event.partner_slug for update;
  if not found then return query select 'denied'::text,'no_entitlement'::text; return; end if;
  select count(*) into v_event_used from (
    select p.briefcase_item_id from public.consumer_packet_artifact_provenance p
      join public.clinic_cases c on c.matter_id=p.briefcase_item_id
      where c.event_id=v_event.id and p.entitlement_source='partner_sponsorship'
    union
    select f.briefcase_item_id from public.clinic_packet_funding f
      where f.event_id=v_event.id and f.funding_mode='sponsored'
  ) used;
  select count(*) into v_partner_reserved from public.clinic_packet_funding f
    where f.partner_slug=v_event.partner_slug and f.funding_mode='sponsored'
      and not exists(select 1 from public.consumer_packet_artifact_provenance p
        where p.briefcase_item_id=f.briefcase_item_id and p.entitlement_source='partner_sponsorship');
  select * into v_packet_entitlement from public.partner_packet_entitlement e
    where e.partner_id=v_scope.partner_id and e.effective_at<=now()
      and (e.expires_at is null or e.expires_at>now()) order by e.effective_at desc limit 1 for update;
  if not found then return query select 'denied'::text,'no_entitlement'::text; return; end if;
  select count(*) into v_packet_used from (
    select l.matter_id from public.packet_credit_ledger l where l.entitlement_id=v_packet_entitlement.id
      and l.event_type in ('consumed','overage_consumed')
    union
    select public.consumer_matter_id_for_briefcase_item(f.briefcase_item_id) from public.clinic_packet_funding f
      where f.packet_entitlement_id=v_packet_entitlement.id and f.funding_mode='sponsored'
  ) used;
  if v_event_used >= v_event.sponsorship_allocation then v_mode:='dtc'; v_reason:='event_cap_exhausted';
  elsif v_entitlement.screenings_used+v_partner_reserved >= v_entitlement.screenings_allowed
     or v_packet_used >= v_packet_entitlement.packet_cap then
    v_mode:='dtc'; v_reason:='partner_cap_exhausted';
  end if;
  insert into public.clinic_packet_funding(briefcase_item_id,consumer_auth_user_id,source_session_id,event_id,
    partner_slug,packet_entitlement_id,route_key,packet_family_id,initial_verification_hash,funding_mode,reason)
    values(v_item.id,v_item.user_id,v_source.anonymous_session_id,v_event.id,v_event.partner_slug,
      v_packet_entitlement.id,v_route.route_key,v_route.packet_family_id,p_expected_verification_hash,v_mode,v_reason);
  return query select v_mode,v_reason;
end;
$funding$;
revoke all on function public.allocate_clinic_packet_funding(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.allocate_clinic_packet_funding(uuid,uuid,text) to service_role;

-- A read cannot allocate a slot, turn a refusal into DTC, or change source.
create function public.clinic_packet_dtc_authorized(p_item uuid,p_owner uuid)
returns boolean language sql stable security definer set search_path='' as $dtc$
  select exists(select 1 from public.clinic_packet_funding f
    join public.consumer_briefcase_items i on i.id=f.briefcase_item_id and i.user_id=f.consumer_auth_user_id
    join public.consumer_pending_screening_results s on s.pending_id=i.source_pending_result_id
      and s.claimed_matter_id=i.id and s.claimed_user_id=i.user_id and s.status='CLAIMED'
      and s.anonymous_session_id=f.source_session_id and s.event_id=f.event_id and s.partner_slug=f.partner_slug
      and s.product='rcap_partner'
    join public.clinic_events e on e.id=f.event_id and e.partner_slug=f.partner_slug
    join public.clinic_cases c on c.event_id=f.event_id and c.matter_id=i.id
      and c.participant_user_id=i.user_id and c.screening_session_id=f.source_session_id
    join public.consumer_packet_verifications v on v.briefcase_item_id=i.id and v.consumer_auth_user_id=i.user_id
      and (v.verification_snapshot->>'jurisdiction')||':'||(v.verification_snapshot->>'pathwayId')=f.route_key
    join public.sponsored_packet_render_routes r on r.route_key=f.route_key and r.packet_family_id=f.packet_family_id
      and (r.registry_track_id is null or r.registry_track_id=v.verification_snapshot->>'selectedTrackId')
    where f.briefcase_item_id=p_item and f.consumer_auth_user_id=p_owner and f.funding_mode='dtc');
$dtc$;
revoke all on function public.clinic_packet_dtc_authorized(uuid,uuid) from public,anon,authenticated;
grant execute on function public.clinic_packet_dtc_authorized(uuid,uuid) to service_role;

-- Entry has no persistent matter yet. This is a read-only availability hint;
-- the allocation transaction remains the final authority under concurrency.
create function public.clinic_entry_sponsor_capacity(p_event uuid,p_partner text)
returns boolean language plpgsql stable security definer set search_path='' as $entry$
declare e public.clinic_events%rowtype; allowance public.partner_entitlement%rowtype;
  event_used bigint; reserved bigint; packet_allowance public.partner_packet_entitlement%rowtype; packet_used bigint;
begin
  select * into e from public.clinic_events where id=p_event and partner_slug=p_partner and status='published';
  if not found then raise exception 'invalid_event_scope'; end if;
  select * into allowance from public.partner_entitlement where partner_slug=e.partner_slug;
  if not found then raise exception 'missing_sponsor_authority'; end if;
  select count(*) into event_used from (
    select f.briefcase_item_id from public.clinic_packet_funding f where f.event_id=e.id and f.funding_mode='sponsored'
    union select p.briefcase_item_id from public.consumer_packet_artifact_provenance p
      join public.clinic_cases c on c.matter_id=p.briefcase_item_id where c.event_id=e.id and p.entitlement_source='partner_sponsorship'
  ) used;
  select count(*) into reserved from public.clinic_packet_funding f where f.partner_slug=e.partner_slug and f.funding_mode='sponsored'
    and not exists(select 1 from public.consumer_packet_artifact_provenance p where p.briefcase_item_id=f.briefcase_item_id and p.entitlement_source='partner_sponsorship');
  select ent.* into packet_allowance from public.partner_packet_entitlement ent join public.partner_records p on p.id=ent.partner_id
    where p.partner_slug=e.partner_slug and ent.effective_at<=now() and (ent.expires_at is null or ent.expires_at>now())
    order by ent.effective_at desc limit 1;
  if not found then raise exception 'missing_sponsor_authority'; end if;
  select count(*) into packet_used from (
    select l.matter_id from public.packet_credit_ledger l where l.entitlement_id=packet_allowance.id and l.event_type in ('consumed','overage_consumed')
    union select public.consumer_matter_id_for_briefcase_item(f.briefcase_item_id) from public.clinic_packet_funding f where f.packet_entitlement_id=packet_allowance.id and f.funding_mode='sponsored'
  ) used;
  return event_used<e.sponsorship_allocation and allowance.screenings_used+reserved<allowance.screenings_allowed and packet_used<packet_allowance.packet_cap;
end;
$entry$;
revoke all on function public.clinic_entry_sponsor_capacity(uuid,text) from public,anon,authenticated;
grant execute on function public.clinic_entry_sponsor_capacity(uuid,text) to service_role;

-- Bounded edits to existing protected transactions. Fail migration on unknown
-- bodies instead of accidentally dropping newer guards or replaying old SQL.
do $integrate$
declare v_oid regprocedure; v_sql text; v_old text; v_new text;
begin
  v_oid:='public.sponsored_packet_render_authority(text,uuid,uuid,uuid)'::regprocedure;
  v_sql:=pg_get_functiondef(v_oid);
  v_old:='v_event.sponsorship_allocation <= 0'; v_new:='v_event.sponsorship_allocation < 0';
  if strpos(v_sql,v_old)=0 then raise exception 'unrecognized sponsored scope cap check'; end if;
  execute replace(v_sql,v_old,v_new);

  v_oid:='public.enqueue_verified_sponsored_packet_render(text,uuid,uuid,text,text,text,text,text,text,text,uuid,uuid,uuid,integer,uuid,text,jsonb,jsonb)'::regprocedure;
  v_sql:=pg_get_functiondef(v_oid);
  v_old:='  insert into public.rcap_document_packets (';
  v_new:=$insert$  if not exists(select 1 from public.allocate_clinic_packet_funding(
    p_briefcase_item_id,p_expected_consumer_auth_user_id,p_expected_verification_hash) f where f.funding_mode='sponsored') then
    raise exception 'sponsor_capacity_requires_dtc';
  end if;

  insert into public.rcap_document_packets ($insert$;
  if strpos(v_sql,v_old)=0 then raise exception 'unrecognized sponsored enqueue'; end if;
  execute replace(v_sql,v_old,v_new);

  v_oid:='public.finalize_sponsored_packet_generation_for_route(text,uuid,uuid,text,jsonb,uuid)'::regprocedure;
  v_sql:=pg_get_functiondef(v_oid);
  v_old:='  -- The event allocation is a second, narrower cap around the partner usage';
  v_new:=$final$  if not exists(select 1 from public.allocate_clinic_packet_funding(
    v_item.id,v_item.user_id,p_expected_verification_hash) f where f.funding_mode='sponsored') then
    return query select false,false,'capped'::text,'sponsor_capacity_requires_dtc'::text; return;
  end if;

  -- The event allocation is a second, narrower cap around the partner usage$final$;
  if strpos(v_sql,v_old)=0 then raise exception 'unrecognized sponsored finalizer'; end if;
  execute replace(v_sql,v_old,v_new);

  v_oid:='public.finalize_packet_render_job(uuid,uuid,text,text,text,text,text,integer,integer,text)'::regprocedure;
  v_sql:=pg_get_functiondef(v_oid);
  v_old:='        if v_used < v_entitlement.packet_cap then';
  v_new:=$ledger$        -- Outstanding Clinic reservations cannot be consumed by another job.
        v_used := v_used + (select count(*) from public.clinic_packet_funding f
          where f.packet_entitlement_id=v_entitlement.id and f.funding_mode='sponsored'
            and public.consumer_matter_id_for_briefcase_item(f.briefcase_item_id) is distinct from v_job.matter_id
            and not exists(select 1 from public.packet_credit_ledger l
              where l.entitlement_id=v_entitlement.id
                and l.matter_id=public.consumer_matter_id_for_briefcase_item(f.briefcase_item_id)
                and l.event_type in ('consumed','overage_consumed')));
        if v_used < v_entitlement.packet_cap then$ledger$;
  if strpos(v_sql,v_old)=0 then raise exception 'unrecognized render accounting cap'; end if;
  execute replace(v_sql,v_old,v_new);

  v_oid:='public.record_consumer_packet_payment(uuid,text,integer,integer,integer,text,text,text,text,text,text,text,text,text,uuid,uuid)'::regprocedure;
  v_sql:=pg_get_functiondef(v_oid);
  v_old:='if coalesce(v_sponsored, false) then';
  v_new:=$payment$if (coalesce(v_sponsored, false) or exists (
      select 1 from public.consumer_briefcase_items i
      join public.consumer_pending_screening_results s on s.pending_id=i.source_pending_result_id
      where i.id=p_briefcase_item_id and s.product='rcap_partner'
    )) and not public.clinic_packet_dtc_authorized(p_briefcase_item_id,v_owner) then$payment$;
  if strpos(v_sql,v_old)=0 then raise exception 'unrecognized consumer sponsored exclusion'; end if;
  execute replace(v_sql,v_old,v_new);
end;
$integrate$;
commit;
