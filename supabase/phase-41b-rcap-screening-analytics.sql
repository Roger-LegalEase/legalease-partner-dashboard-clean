-- Phase 41B RCAP screening analytics events (privacy-conscious, append-only).
-- Migration file only; do not run against production until reviewed through the DB process.
--
-- Purpose: code/campaign-level partner reporting (screenings started/completed,
-- eligibility outcome categories, packets generated, credits used, overage) WITHOUT
-- storing screening answers or criminal-record detail. Each row carries only:
--   session_id, partner attribution (slug/code/campaign), an event type, a coarse
--   outcome category, and whether a packet route was available.
--
-- Non-breaking and additive:
--   * New append-only table + immutability triggers (same pattern as rcap_record_events).
--   * screening_started is emitted by an AFTER INSERT trigger on partner-benefit sessions,
--     so the phase-41 claim RPCs are not modified.
--   * screening_completed / eligibility_result_recorded are emitted by a gated helper RPC
--     from the existing partner completion + save-result server paths.
--   * packet_generated / packet_overage_recorded are emitted inside the phase-41
--     record_partner_packet_generation RPC, atomically with credit consumption.
--   * Analytics events are only ever written for partner-benefit sessions, so DTC
--     consumer sessions and un-attributed (required-code-rejected) sessions never appear.
--   * No change to DTC flow, packet-cap rules, overage billing, or code validation.

-------------------------------------------------------------------------------
-- 1. Append-only analytics event table.
-------------------------------------------------------------------------------

create table if not exists public.rcap_screening_analytics_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  partner_slug text not null,
  partner_access_code_id uuid,
  campaign_name text,
  event_type text not null,
  outcome_category text,
  packet_route_available boolean,
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  constraint rcap_screening_analytics_events_event_type_check
    check (event_type in (
      'screening_started',
      'screening_completed',
      'eligibility_result_recorded',
      'guidance_only_result',
      'packet_ready_result',
      'packet_generated',
      'packet_overage_recorded'
    )),
  constraint rcap_screening_analytics_events_outcome_category_check
    check (outcome_category is null or outcome_category in (
      'eligible_packet',
      'eligible_packet_with_caution',
      'guidance_only',
      'ineligible',
      'incomplete'
    ))
);

create index if not exists rcap_screening_analytics_events_partner_idx
  on public.rcap_screening_analytics_events(partner_slug, occurred_at);
create index if not exists rcap_screening_analytics_events_code_idx
  on public.rcap_screening_analytics_events(partner_access_code_id);
create index if not exists rcap_screening_analytics_events_session_idx
  on public.rcap_screening_analytics_events(session_id, event_type);

create or replace function public.prevent_rcap_screening_analytics_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'rcap_screening_analytics_events is append-only';
end;
$$;

drop trigger if exists rcap_screening_analytics_prevent_update on public.rcap_screening_analytics_events;
create trigger rcap_screening_analytics_prevent_update
before update on public.rcap_screening_analytics_events
for each row execute function public.prevent_rcap_screening_analytics_mutation();

drop trigger if exists rcap_screening_analytics_prevent_delete on public.rcap_screening_analytics_events;
create trigger rcap_screening_analytics_prevent_delete
before delete on public.rcap_screening_analytics_events
for each row execute function public.prevent_rcap_screening_analytics_mutation();

comment on table public.rcap_screening_analytics_events is
  'Append-only partner screening analytics. Coarse outcome categories only; contains no screening answers, charges, or direct PII.';

-------------------------------------------------------------------------------
-- 2. screening_started via AFTER INSERT trigger (partner-benefit sessions only).
-------------------------------------------------------------------------------

create or replace function public.emit_rcap_screening_started_event()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.flow_mode = 'rcap'
     and new.partner_slug is not null
     and new.partner_benefit_active is true then
    insert into public.rcap_screening_analytics_events
      (session_id, partner_slug, partner_access_code_id, campaign_name, event_type, occurred_at)
    values
      (new.session_id, new.partner_slug, new.partner_access_code_id, new.campaign_name, 'screening_started', now());
  end if;
  return new;
end;
$$;

drop trigger if exists rcap_screening_started_event on public.screening_sessions;
create trigger rcap_screening_started_event
after insert on public.screening_sessions
for each row execute function public.emit_rcap_screening_started_event();

-------------------------------------------------------------------------------
-- 3. Gated helper RPC for completion + eligibility events.
--    Writes nothing for DTC/non-benefit sessions.
-------------------------------------------------------------------------------

create or replace function public.record_rcap_screening_analytics_event(
  p_session_id uuid,
  p_event_type text,
  p_outcome_category text default null,
  p_packet_route_available boolean default null,
  p_now timestamptz default now()
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.screening_sessions%rowtype;
begin
  if p_event_type not in ('screening_completed', 'eligibility_result_recorded', 'guidance_only_result', 'packet_ready_result') then
    raise exception 'unsupported analytics event type: %', p_event_type;
  end if;

  select * into v_session
  from public.screening_sessions ss
  where ss.session_id = p_session_id
  limit 1;

  -- Partner-benefit gate: DTC and un-attributed sessions produce no analytics.
  if not found
     or v_session.flow_mode <> 'rcap'
     or v_session.partner_slug is null
     or v_session.partner_benefit_active is not true then
    return false;
  end if;

  insert into public.rcap_screening_analytics_events
    (session_id, partner_slug, partner_access_code_id, campaign_name, event_type, outcome_category, packet_route_available, occurred_at)
  values
    (v_session.session_id, v_session.partner_slug, v_session.partner_access_code_id, v_session.campaign_name,
     p_event_type, p_outcome_category, p_packet_route_available, p_now);

  return true;
end;
$$;

comment on function public.record_rcap_screening_analytics_event(uuid, text, text, boolean, timestamptz) is
  'Appends a partner screening analytics event for partner-benefit sessions only. No-op for DTC/un-attributed sessions.';

-------------------------------------------------------------------------------
-- 4. Emit packet_generated / packet_overage_recorded atomically with credit
--    consumption. Same billing behavior as phase-41; only adds analytics inserts.
-------------------------------------------------------------------------------

create or replace function public.record_partner_packet_generation(
  p_session_id uuid,
  p_now timestamptz default now()
)
returns table (
  recorded boolean,
  counted_as text,
  reason text,
  partner_slug text,
  screenings_used integer,
  screenings_allowed integer,
  overage_packets integer,
  overage_amount_cents integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_session public.screening_sessions%rowtype;
  v_ent public.partner_entitlement%rowtype;
  v_counted text;
  v_price integer;
begin
  select * into v_session
  from public.screening_sessions ss
  where ss.session_id = p_session_id
  limit 1;

  if not found
     or v_session.flow_mode <> 'rcap'
     or v_session.partner_slug is null
     or v_session.partner_benefit_active is not true then
    return query select false, 'not_counted'::text, 'not_partner_benefit'::text,
                        v_session.partner_slug, null::integer, null::integer, null::integer, null::integer;
    return;
  end if;

  if v_session.claimed_slot_state is distinct from 'claimed' then
    return query select false, 'not_counted'::text, 'already_recorded'::text,
                        v_session.partner_slug, null::integer, null::integer, null::integer, null::integer;
    return;
  end if;

  select * into v_ent
  from public.partner_entitlement pe
  where pe.partner_slug = v_session.partner_slug
  for update;

  if not found then
    return query select false, 'not_counted'::text, 'no_entitlement'::text,
                        v_session.partner_slug, null::integer, null::integer, null::integer, null::integer;
    return;
  end if;

  if v_ent.screenings_used < v_ent.screenings_allowed then
    update public.partner_entitlement pe
    set screenings_used = pe.screenings_used + 1, updated_at = now()
    where pe.partner_slug = v_ent.partner_slug
    returning pe.screenings_used, pe.screenings_allowed, pe.overage_packets, pe.overage_amount_cents
    into v_ent.screenings_used, v_ent.screenings_allowed, v_ent.overage_packets, v_ent.overage_amount_cents;
    v_counted := 'included';
  elsif v_ent.pause_at_cap then
    insert into public.rcap_record_events (record_type, record_id, partner_slug, event_type, occurred_at, actor, metadata)
    values ('partner_entitlement', v_ent.partner_slug, v_ent.partner_slug, 'partner_packet_cap_reached', p_now, 'system',
            jsonb_build_object('session_id', p_session_id, 'paused', true));
    return query select false, 'capped'::text, 'paused_at_cap'::text,
                        v_ent.partner_slug, v_ent.screenings_used, v_ent.screenings_allowed,
                        v_ent.overage_packets, v_ent.overage_amount_cents;
    return;
  elsif v_ent.overage_enabled then
    v_price := v_ent.overage_packet_price_cents;
    update public.partner_entitlement pe
    set overage_packets = pe.overage_packets + 1,
        overage_amount_cents = pe.overage_amount_cents + v_price,
        updated_at = now()
    where pe.partner_slug = v_ent.partner_slug
    returning pe.screenings_used, pe.screenings_allowed, pe.overage_packets, pe.overage_amount_cents
    into v_ent.screenings_used, v_ent.screenings_allowed, v_ent.overage_packets, v_ent.overage_amount_cents;
    v_counted := 'overage';
  else
    update public.screening_sessions ss
    set claimed_slot_state = 'consumed', status = 'completed', updated_at = now()
    where ss.session_id = p_session_id;
    insert into public.rcap_record_events (record_type, record_id, partner_slug, event_type, occurred_at, actor, metadata)
    values ('partner_entitlement', v_ent.partner_slug, v_ent.partner_slug, 'partner_packet_cap_reached', p_now, 'system',
            jsonb_build_object('session_id', p_session_id, 'paused', false, 'overage_enabled', false));
    return query select false, 'not_counted'::text, 'cap_reached_no_overage'::text,
                        v_ent.partner_slug, v_ent.screenings_used, v_ent.screenings_allowed,
                        v_ent.overage_packets, v_ent.overage_amount_cents;
    return;
  end if;

  update public.screening_sessions ss
  set claimed_slot_state = 'consumed', status = 'completed', updated_at = now()
  where ss.session_id = p_session_id;

  insert into public.rcap_record_events (record_type, record_id, partner_slug, event_type, occurred_at, actor, metadata)
  values ('partner_entitlement', v_ent.partner_slug, v_ent.partner_slug,
          case when v_counted = 'overage' then 'partner_packet_overage_recorded' else 'partner_packet_credit_consumed' end,
          p_now, 'system', jsonb_build_object('session_id', p_session_id, 'counted_as', v_counted));

  -- Analytics: one packet_generated per successful credit (included or overage),
  -- plus packet_overage_recorded for overage. Fires once (slot just consumed).
  insert into public.rcap_screening_analytics_events
    (session_id, partner_slug, partner_access_code_id, campaign_name, event_type, packet_route_available, occurred_at, metadata)
  values
    (v_session.session_id, v_session.partner_slug, v_session.partner_access_code_id, v_session.campaign_name,
     'packet_generated', true, p_now, jsonb_build_object('counted_as', v_counted));

  if v_counted = 'overage' then
    insert into public.rcap_screening_analytics_events
      (session_id, partner_slug, partner_access_code_id, campaign_name, event_type, occurred_at, metadata)
    values
      (v_session.session_id, v_session.partner_slug, v_session.partner_access_code_id, v_session.campaign_name,
       'packet_overage_recorded', p_now, jsonb_build_object('overage_packet_price_cents', v_price));
  end if;

  return query select true, v_counted, null::text,
                      v_ent.partner_slug, v_ent.screenings_used, v_ent.screenings_allowed,
                      v_ent.overage_packets, v_ent.overage_amount_cents;
end;
$$;

comment on function public.record_partner_packet_generation(uuid, timestamptz) is
  'Consumes exactly one partner packet credit (included or overage) per successful partner-benefit packet, idempotently, and emits packet_generated / packet_overage_recorded analytics. Respects pause_at_cap and overage_enabled.';

-------------------------------------------------------------------------------
-- 5. Per-code aggregation for the partner dashboard.
-------------------------------------------------------------------------------

create or replace function public.get_partner_code_analytics(
  p_partner_slug text
)
returns table (
  partner_access_code_id uuid,
  screenings_started bigint,
  screenings_completed bigint,
  eligible_packet bigint,
  guidance_only bigint,
  ineligible bigint,
  packets_generated bigint,
  overage_packets bigint
)
language sql
security definer
set search_path = ''
as $$
  select
    e.partner_access_code_id,
    count(*) filter (where e.event_type = 'screening_started'),
    count(*) filter (where e.event_type = 'screening_completed'),
    count(*) filter (where e.event_type = 'eligibility_result_recorded'
                       and e.outcome_category in ('eligible_packet', 'eligible_packet_with_caution')),
    count(*) filter (where e.event_type = 'eligibility_result_recorded'
                       and e.outcome_category = 'guidance_only'),
    count(*) filter (where e.event_type = 'eligibility_result_recorded'
                       and e.outcome_category = 'ineligible'),
    count(*) filter (where e.event_type = 'packet_generated'),
    count(*) filter (where e.event_type = 'packet_overage_recorded')
  from public.rcap_screening_analytics_events e
  where e.partner_slug = nullif(trim(p_partner_slug), '')
  group by e.partner_access_code_id;
$$;

comment on function public.get_partner_code_analytics(text) is
  'Aggregates partner screening analytics per access code (NULL row = direct partner-page attribution). Read-only.';

-------------------------------------------------------------------------------
-- 6. RLS (partner-scoped reads; internal admin). Mutations are service-role only.
-------------------------------------------------------------------------------

alter table public.rcap_screening_analytics_events enable row level security;

drop policy if exists rcap_screening_analytics_select_own_partner on public.rcap_screening_analytics_events;
create policy rcap_screening_analytics_select_own_partner
on public.rcap_screening_analytics_events
for select
to authenticated
using (partner_slug = public.current_partner_slug());

drop policy if exists rcap_screening_analytics_select_internal_admin on public.rcap_screening_analytics_events;
create policy rcap_screening_analytics_select_internal_admin
on public.rcap_screening_analytics_events
for select
to authenticated
using (public.is_internal_admin());

-------------------------------------------------------------------------------
-- 7. Grants.
-------------------------------------------------------------------------------

revoke all on function public.record_rcap_screening_analytics_event(uuid, text, text, boolean, timestamptz) from public, anon, authenticated;
revoke all on function public.get_partner_code_analytics(text) from public, anon, authenticated;

grant execute on function public.record_rcap_screening_analytics_event(uuid, text, text, boolean, timestamptz) to service_role;
grant execute on function public.get_partner_code_analytics(text) to service_role;
