-- Phase 35d RCAP partner-mode claimed-slot lifecycle.
-- Migration file only; do not run against production until reviewed through the DB process.
-- Release, completion, and recompute all use the same expiry predicate.

create or replace function public.rcap_screening_session_is_release_expired(
  p_status text,
  p_created_at timestamptz,
  p_resume_token_expires_at timestamptz,
  p_now timestamptz default now()
)
returns boolean
language sql
immutable
as $$
  select
    p_status in ('in_progress', 'resumed')
    and coalesce(p_resume_token_expires_at, p_created_at + interval '7 days') <= p_now;
$$;

comment on function public.rcap_screening_session_is_release_expired(text, timestamptz, timestamptz, timestamptz) is
  'Shared RCAP slot expiry predicate. Mirrors the 7-day resume-token window, falling back to created_at for sessions with no resume token.';

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
  ),
  updated_entitlements as (
    update public.partner_entitlement pe
    set screenings_used = greatest(pe.screenings_used - rc.released_count, 0),
        updated_at = now()
    from release_counts rc
    where pe.partner_slug = rc.partner_slug
      and pe.screenings_used > 0
    returning pe.partner_slug, rc.released_count, pe.screenings_used, pe.screenings_allowed, pe.period_label
  )
  select ue.partner_slug, ue.released_count, ue.screenings_used, ue.screenings_allowed, ue.period_label
  from updated_entitlements ue
  order by ue.partner_slug;
$$;

comment on function public.release_expired_rcap_screening_slots(timestamptz) is
  'Atomically flips expired unfinished RCAP screening sessions from claimed to released and decrements partner_entitlement once per released slot.';

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
      and ss.claimed_slot_state = 'claimed'
    returning ss.partner_slug, ss.claimed_slot_state, ss.status
  )
  select true, cs.partner_slug, cs.claimed_slot_state, cs.status
  from consumed_session cs
  union all
  select false, ss.partner_slug, ss.claimed_slot_state, ss.status
  from public.screening_sessions ss
  where ss.session_id = p_session_id
    and ss.flow_mode = 'rcap'
    and not exists (select 1 from consumed_session)
  limit 1;
$$;

comment on function public.consume_rcap_screening_session(uuid) is
  'Marks an already-claimed RCAP screening session as consumed/completed without changing the entitlement counter.';

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
     and ss.claimed_slot_state <> 'released'
     and (
       ss.claimed_slot_state = 'consumed'
       or ss.status = 'completed'
       or (
         ss.claimed_slot_state = 'claimed'
         and not public.rcap_screening_session_is_release_expired(
           ss.status,
           ss.created_at,
           ss.resume_token_expires_at,
           p_now
         )
       )
     )
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
  'Rebuilds partner_entitlement.screenings_used from the RCAP screening session ledger using the shared slot expiry predicate.';

revoke all on function public.rcap_screening_session_is_release_expired(text, timestamptz, timestamptz, timestamptz) from public;
revoke all on function public.release_expired_rcap_screening_slots(timestamptz) from public;
revoke all on function public.consume_rcap_screening_session(uuid) from public;
revoke all on function public.recompute_rcap_partner_entitlements(text, timestamptz) from public;

revoke all on function public.rcap_screening_session_is_release_expired(text, timestamptz, timestamptz, timestamptz) from anon;
revoke all on function public.release_expired_rcap_screening_slots(timestamptz) from anon;
revoke all on function public.consume_rcap_screening_session(uuid) from anon;
revoke all on function public.recompute_rcap_partner_entitlements(text, timestamptz) from anon;

revoke all on function public.rcap_screening_session_is_release_expired(text, timestamptz, timestamptz, timestamptz) from authenticated;
revoke all on function public.release_expired_rcap_screening_slots(timestamptz) from authenticated;
revoke all on function public.consume_rcap_screening_session(uuid) from authenticated;
revoke all on function public.recompute_rcap_partner_entitlements(text, timestamptz) from authenticated;

grant execute on function public.rcap_screening_session_is_release_expired(text, timestamptz, timestamptz, timestamptz) to service_role;
grant execute on function public.release_expired_rcap_screening_slots(timestamptz) to service_role;
grant execute on function public.consume_rcap_screening_session(uuid) to service_role;
grant execute on function public.recompute_rcap_partner_entitlements(text, timestamptz) to service_role;
