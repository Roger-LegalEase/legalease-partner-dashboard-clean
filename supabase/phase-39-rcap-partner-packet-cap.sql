-- Phase 39 RCAP partner packet-cap semantics.
-- Migration file only; do not run against production until reviewed through the DB process.
--
-- Updated product rule:
--   * Partner accounts do not consume cap.
--   * Partner screenings do not consume cap.
--   * Non-packet results do not consume cap.
--   * Partner cap is consumed exactly once when a partner-covered packet is generated.

create or replace function public.claim_rcap_screening_session(
  p_partner_slug text,
  p_jurisdiction text
)
returns table (
  ok boolean,
  session_id uuid,
  reason text,
  screenings_used integer,
  screenings_allowed integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_partner_slug text;
  v_jurisdiction text;
  v_session_id uuid;
  v_screenings_used integer;
  v_screenings_allowed integer;
begin
  v_partner_slug := nullif(trim(p_partner_slug), '');
  v_jurisdiction := upper(nullif(trim(p_jurisdiction), ''));

  if v_partner_slug is null then
    return query select false, null::uuid, 'partner_inactive'::text, null::integer, null::integer;
    return;
  end if;

  if v_jurisdiction is null or v_jurisdiction !~ '^[A-Z]{2,3}$' then
    raise exception 'jurisdiction must be a 2-3 letter uppercase code';
  end if;

  if not exists (
    select 1
    from public.partner_records pr
    where pr.partner_slug = v_partner_slug
      and pr.payment_status in ('paid', 'demo_paid')
      and pr.qualification_status = 'qualified'
      and pr.provisioning_status in ('provisioned', 'active')
  ) then
    return query select false, null::uuid, 'partner_inactive'::text, null::integer, null::integer;
    return;
  end if;

  select pe.screenings_used, pe.screenings_allowed
  into v_screenings_used, v_screenings_allowed
  from public.partner_entitlement pe
  where pe.partner_slug = v_partner_slug;

  if v_screenings_allowed is null then
    return query select false, null::uuid, 'partner_inactive'::text, null::integer, null::integer;
    return;
  end if;

  v_session_id := gen_random_uuid();

  insert into public.screening_sessions (
    session_id,
    jurisdiction,
    answers,
    current_question_id,
    furthest_stage,
    status,
    last_drop_question,
    partner_slug,
    flow_mode,
    claimed_slot_state
  )
  values (
    v_session_id,
    v_jurisdiction,
    '{}'::jsonb,
    null,
    null,
    'in_progress',
    null,
    v_partner_slug,
    'rcap',
    'claimed'
  );

  return query
  select true, v_session_id, null::text, v_screenings_used, v_screenings_allowed;
end;
$$;

comment on function public.claim_rcap_screening_session(text, text) is
  'Validates an active RCAP partner and creates an attributed screening session without consuming partner packet capacity.';

create or replace function public.consume_rcap_screening_session(
  p_session_id uuid
)
returns table (
  consumed boolean,
  partner_slug text,
  claimed_slot_state text,
  status text
)
language sql
security definer
set search_path = ''
as $$
  with consumed_session as (
    update public.screening_sessions ss
    set claimed_slot_state = 'consumed',
        status = 'completed',
        updated_at = now()
    where ss.session_id = p_session_id
      and ss.flow_mode = 'rcap'
      and ss.partner_slug is not null
      and ss.claimed_slot_state <> 'consumed'
      and exists (
        select 1
        from public.partner_entitlement pe
        where pe.partner_slug = ss.partner_slug
          and pe.screenings_used < pe.screenings_allowed
      )
    returning ss.partner_slug, ss.claimed_slot_state, ss.status
  ),
  incremented_entitlement as (
    update public.partner_entitlement pe
    set screenings_used = pe.screenings_used + 1,
        updated_at = now()
    from consumed_session cs
    where pe.partner_slug = cs.partner_slug
      and pe.screenings_used < pe.screenings_allowed
    returning pe.partner_slug
  )
  select true, cs.partner_slug, cs.claimed_slot_state, cs.status
  from consumed_session cs
  join incremented_entitlement ie on ie.partner_slug = cs.partner_slug
  union all
  select false, ss.partner_slug, ss.claimed_slot_state, ss.status
  from public.screening_sessions ss
  where ss.session_id = p_session_id
    and ss.flow_mode = 'rcap'
    and not exists (select 1 from consumed_session)
  limit 1;
$$;

comment on function public.consume_rcap_screening_session(uuid) is
  'Consumes one partner packet-cap unit exactly once when a partner-covered packet is generated.';

create or replace function public.release_expired_rcap_screening_slots(
  p_now timestamptz default now()
)
returns table (
  partner_slug text,
  released_count integer,
  screenings_used integer,
  screenings_allowed integer,
  period_label text
)
language sql
security definer
set search_path = ''
as $$
  with released_sessions as (
    update public.screening_sessions ss
    set claimed_slot_state = 'released',
        updated_at = now()
    where ss.flow_mode = 'rcap'
      and ss.partner_slug is not null
      and ss.claimed_slot_state = 'claimed'
      and public.rcap_screening_session_is_release_expired(
        ss.status,
        ss.created_at,
        ss.resume_token_expires_at,
        p_now
      )
    returning ss.partner_slug
  ),
  release_counts as (
    select rs.partner_slug, count(*)::integer as released_count
    from released_sessions rs
    group by rs.partner_slug
  )
  select pe.partner_slug, rc.released_count, pe.screenings_used, pe.screenings_allowed, pe.period_label
  from release_counts rc
  join public.partner_entitlement pe on pe.partner_slug = rc.partner_slug
  order by pe.partner_slug;
$$;

comment on function public.release_expired_rcap_screening_slots(timestamptz) is
  'Marks expired unfinished RCAP screening sessions released without decrementing packet-cap usage.';

create or replace function public.recompute_rcap_partner_entitlements(
  p_partner_slug text default null,
  p_now timestamptz default now()
)
returns table (
  partner_slug text,
  screenings_used integer,
  screenings_allowed integer,
  ledger_count integer,
  period_label text
)
language sql
security definer
set search_path = ''
as $$
  with ledger as (
    select
      pe.partner_slug,
      count(ss.session_id)::integer as ledger_count
    from public.partner_entitlement pe
    left join public.screening_sessions ss
      on ss.partner_slug = pe.partner_slug
     and ss.flow_mode = 'rcap'
     and ss.claimed_slot_state = 'consumed'
    where p_partner_slug is null
       or pe.partner_slug = p_partner_slug
    group by pe.partner_slug
  ),
  updated_entitlements as (
    update public.partner_entitlement pe
    set screenings_used = l.ledger_count,
        updated_at = now()
    from ledger l
    where pe.partner_slug = l.partner_slug
    returning pe.partner_slug, pe.screenings_used, pe.screenings_allowed, l.ledger_count, pe.period_label
  )
  select ue.partner_slug, ue.screenings_used, ue.screenings_allowed, ue.ledger_count, ue.period_label
  from updated_entitlements ue
  order by ue.partner_slug;
$$;

comment on function public.recompute_rcap_partner_entitlements(text, timestamptz) is
  'Rebuilds partner_entitlement.screenings_used from consumed partner packet-generation sessions only.';
