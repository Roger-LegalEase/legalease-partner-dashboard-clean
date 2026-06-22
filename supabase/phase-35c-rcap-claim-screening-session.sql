-- Phase 35c RCAP partner-mode atomic screening session claim.
-- Migration file only; do not run against production until reviewed through the DB process.
-- The slot claim and screening_sessions insert happen in one database transaction.

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

  update public.partner_entitlement pe
  set screenings_used = pe.screenings_used + 1
  where pe.partner_slug = v_partner_slug
    and pe.screenings_used < pe.screenings_allowed
  returning pe.screenings_used, pe.screenings_allowed
    into v_screenings_used, v_screenings_allowed;

  if not found then
    select pe.screenings_used, pe.screenings_allowed
    into v_screenings_used, v_screenings_allowed
    from public.partner_entitlement pe
    where pe.partner_slug = v_partner_slug;

    return query
    select false, null::uuid, 'capacity_full'::text, v_screenings_used, v_screenings_allowed;
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
  'Atomically validates an active RCAP partner, claims one available entitlement slot, creates the initial input-only screening session, and returns only claim metadata.';

revoke all on function public.claim_rcap_screening_session(text, text) from public;
revoke all on function public.claim_rcap_screening_session(text, text) from anon;
revoke all on function public.claim_rcap_screening_session(text, text) from authenticated;

grant execute on function public.claim_rcap_screening_session(text, text) to service_role;
