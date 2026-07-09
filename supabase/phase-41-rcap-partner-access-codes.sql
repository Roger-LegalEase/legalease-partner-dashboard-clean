-- Phase 41 RCAP partner access codes, code-level attribution, and packet overage billing.
-- Migration file only; do not run against production until reviewed through the DB process.
--
-- Product rules encoded here:
--   * A partner's packet allocation (partner_entitlement) is consumed only when a
--     partner-benefit-active session successfully generates a packet -- never on
--     page views, signups, screenings, ineligible results, or failed generations.
--   * After the included allocation is exhausted, additional successful partner
--     packets are billed as overage at overage_packet_price_cents (default $50)
--     unless pause_at_cap is set.
--   * Access codes gate partner attribution. Codes are validated server-side by
--     hash; raw codes are never stored. Single-use / limited-use redemption is
--     atomic so a code can never be used past its limit.
--
-- Additive and non-breaking:
--   * partner_records gains access_mode (default 'open' preserves current open-link behavior).
--   * partner_entitlement gains overage/pause settings and an overage ledger.
--     (screenings_allowed == packet_cap, screenings_used == packets_used.)
--   * screening_sessions gains code-level attribution columns; existing rcap sessions
--     are backfilled to partner_benefit_active = true / attribution_source = 'partner_page'.
--   * partner_access_codes is a new hashed, RLS-scoped table.
--   * rcap_record_events gains new record types + event types (append-only preserved).
--   * New SECURITY DEFINER RPCs; the phase-39 RPCs are left intact for back-compat.

-------------------------------------------------------------------------------
-- 1. Partner-level access mode.
-------------------------------------------------------------------------------

alter table public.partner_records
  add column if not exists access_mode text not null default 'open';

alter table public.partner_records
  drop constraint if exists partner_records_access_mode_check;

alter table public.partner_records
  add constraint partner_records_access_mode_check
  check (access_mode in ('open', 'optional_code', 'required_code', 'invite_only'));

comment on column public.partner_records.access_mode is
  'How partner attribution is gated: open (no code), optional_code, required_code, or invite_only. Default open preserves existing open-link partners.';

-------------------------------------------------------------------------------
-- 2. Packet-allocation overage + pause settings and ledger.
--    partner_entitlement.screenings_allowed == packet_cap
--    partner_entitlement.screenings_used    == packets_used
-------------------------------------------------------------------------------

alter table public.partner_entitlement
  add column if not exists overage_enabled boolean not null default false,
  add column if not exists overage_packet_price_cents integer not null default 5000,
  add column if not exists pause_at_cap boolean not null default false,
  add column if not exists overage_packets integer not null default 0,
  add column if not exists overage_amount_cents integer not null default 0;

alter table public.partner_entitlement
  drop constraint if exists partner_entitlement_overage_packets_nonnegative_check;
alter table public.partner_entitlement
  add constraint partner_entitlement_overage_packets_nonnegative_check
  check (overage_packets >= 0);

alter table public.partner_entitlement
  drop constraint if exists partner_entitlement_overage_amount_nonnegative_check;
alter table public.partner_entitlement
  add constraint partner_entitlement_overage_amount_nonnegative_check
  check (overage_amount_cents >= 0);

alter table public.partner_entitlement
  drop constraint if exists partner_entitlement_overage_price_nonnegative_check;
alter table public.partner_entitlement
  add constraint partner_entitlement_overage_price_nonnegative_check
  check (overage_packet_price_cents >= 0);

comment on column public.partner_entitlement.overage_enabled is
  'When true, successful partner packets beyond screenings_allowed are recorded as billable overage.';
comment on column public.partner_entitlement.pause_at_cap is
  'When true, sponsored packet generation is not promised once screenings_used reaches screenings_allowed.';
comment on column public.partner_entitlement.overage_packet_price_cents is
  'Per-packet overage price in cents. Default 5000 == $50 per successful overage packet.';

-------------------------------------------------------------------------------
-- 3. partner_access_codes.
-------------------------------------------------------------------------------

create table if not exists public.partner_access_codes (
  id uuid primary key default gen_random_uuid(),
  partner_slug text not null references public.partner_records(partner_slug) on delete cascade,
  code_hash text not null,
  code_display_hint text,
  campaign_name text,
  description text,
  code_type text not null default 'shared',
  max_uses integer,
  uses_count integer not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  expires_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_used_at timestamptz,
  constraint partner_access_codes_code_type_check
    check (code_type in ('shared', 'single_use', 'limited_use')),
  constraint partner_access_codes_uses_count_nonnegative_check
    check (uses_count >= 0),
  constraint partner_access_codes_max_uses_positive_check
    check (max_uses is null or max_uses > 0),
  constraint partner_access_codes_limited_use_requires_max_check
    check (code_type <> 'limited_use' or max_uses is not null),
  constraint partner_access_codes_uses_within_max_check
    check (max_uses is null or uses_count <= max_uses),
  constraint partner_access_codes_partner_code_unique
    unique (partner_slug, code_hash)
);

create index if not exists partner_access_codes_partner_slug_idx
  on public.partner_access_codes(partner_slug);
create index if not exists partner_access_codes_code_hash_idx
  on public.partner_access_codes(code_hash);
create index if not exists partner_access_codes_partner_active_idx
  on public.partner_access_codes(partner_slug, is_active);
create index if not exists partner_access_codes_campaign_idx
  on public.partner_access_codes(partner_slug, campaign_name);

comment on table public.partner_access_codes is
  'Partner-issued access codes. Codes are stored only as normalized hashes; validation and single-use/limited-use redemption are server-side and atomic.';
comment on column public.partner_access_codes.code_hash is
  'Hash of the normalized (trimmed, spaces removed, uppercased) code. Raw codes are never stored.';
comment on column public.partner_access_codes.code_display_hint is
  'Safe display hint for the dashboard (e.g. last characters). Not sufficient to reconstruct the code.';

create or replace function public.set_partner_access_codes_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_partner_access_codes_updated_at on public.partner_access_codes;
create trigger set_partner_access_codes_updated_at
before update on public.partner_access_codes
for each row
execute function public.set_partner_access_codes_updated_at();

-------------------------------------------------------------------------------
-- 4. Session-level attribution columns.
-------------------------------------------------------------------------------

alter table public.screening_sessions
  add column if not exists partner_access_code_id uuid null references public.partner_access_codes(id) on delete set null,
  add column if not exists campaign_name text null,
  add column if not exists attribution_source text null,
  add column if not exists partner_benefit_active boolean not null default false;

alter table public.screening_sessions
  drop constraint if exists screening_sessions_attribution_source_check;
alter table public.screening_sessions
  add constraint screening_sessions_attribution_source_check
  check (attribution_source is null or attribution_source in ('partner_page', 'partner_code', 'consumer'));

create index if not exists screening_sessions_partner_access_code_idx
  on public.screening_sessions(partner_access_code_id)
  where partner_access_code_id is not null;

-- Backfill: every existing partner-mode session was partner-benefit by construction.
update public.screening_sessions
  set partner_benefit_active = true,
      attribution_source = 'partner_page'
  where flow_mode = 'rcap'
    and partner_slug is not null
    and attribution_source is null;

comment on column public.screening_sessions.partner_benefit_active is
  'True only when the session is validly attributed to a partner and may consume that partner''s packet allocation. Server-resolved; never client-set.';
comment on column public.screening_sessions.attribution_source is
  'How the session was attributed: partner_page (open/general), partner_code (valid code), or consumer (no partner benefit).';

-------------------------------------------------------------------------------
-- 5. Audit event record types.
-------------------------------------------------------------------------------

do $$
declare
  v_conname text;
begin
  select conname into v_conname
  from pg_constraint
  where conrelid = 'public.rcap_record_events'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%record_type%';

  if v_conname is not null then
    execute format('alter table public.rcap_record_events drop constraint %I', v_conname);
  end if;

  alter table public.rcap_record_events
    add constraint rcap_record_events_record_type_check
    check (record_type in ('intake_session', 'document_packet', 'partner_access_code', 'partner_entitlement'));
end;
$$;

-------------------------------------------------------------------------------
-- 6a. Read-only code validation (no redemption, no attribution).
-------------------------------------------------------------------------------

create or replace function public.validate_partner_access_code(
  p_partner_slug text,
  p_code_hash text,
  p_now timestamptz default now()
)
returns table (
  valid boolean,
  reason text,
  campaign_name text,
  code_id uuid,
  code_type text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_partner_slug text;
  v_code_hash text;
  v_code public.partner_access_codes%rowtype;
  v_effective_max integer;
begin
  v_partner_slug := nullif(trim(p_partner_slug), '');
  v_code_hash := nullif(trim(p_code_hash), '');

  if v_partner_slug is null or v_code_hash is null then
    return query select false, 'invalid'::text, null::text, null::uuid, null::text;
    return;
  end if;

  select * into v_code
  from public.partner_access_codes c
  where c.partner_slug = v_partner_slug
    and c.code_hash = v_code_hash
  limit 1;

  if not found then
    return query select false, 'invalid'::text, null::text, null::uuid, null::text;
    return;
  end if;

  if not v_code.is_active then
    return query select false, 'inactive'::text, null::text, v_code.id, v_code.code_type;
    return;
  end if;

  if v_code.starts_at is not null and p_now < v_code.starts_at then
    return query select false, 'inactive'::text, null::text, v_code.id, v_code.code_type;
    return;
  end if;

  if v_code.expires_at is not null and p_now >= v_code.expires_at then
    return query select false, 'expired'::text, null::text, v_code.id, v_code.code_type;
    return;
  end if;

  v_effective_max := case
    when v_code.code_type = 'single_use' then 1
    when v_code.code_type = 'limited_use' then v_code.max_uses
    else null
  end;

  if v_effective_max is not null and v_code.uses_count >= v_effective_max then
    return query select false, 'exhausted'::text, null::text, v_code.id, v_code.code_type;
    return;
  end if;

  return query select true, null::text, v_code.campaign_name, v_code.id, v_code.code_type;
end;
$$;

comment on function public.validate_partner_access_code(text, text, timestamptz) is
  'Read-only code validation by hash. Never redeems, never mutates uses. Returns a minimal status for the server route to relay.';

-------------------------------------------------------------------------------
-- 6b. Atomic claim: resolves attribution by partner access_mode, redeems a code
--     when applicable, and creates an attributed screening session.
-------------------------------------------------------------------------------

create or replace function public.claim_partner_screening_session(
  p_partner_slug text,
  p_jurisdiction text,
  p_code_hash text default null,
  p_now timestamptz default now()
)
returns table (
  ok boolean,
  session_id uuid,
  reason text,
  benefit_active boolean,
  attribution_source text,
  campaign_name text,
  access_mode text,
  code_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_partner_slug text;
  v_jurisdiction text;
  v_code_hash text;
  v_access_mode text;
  v_session_id uuid;
  v_code_id uuid;
  v_code_campaign text;
  v_code_valid boolean := false;
  v_code_reason text;
  v_code_type text;
  v_effective_max integer;
  v_rows integer;
  v_benefit boolean := false;
  v_source text;
  v_reason text;
begin
  v_partner_slug := nullif(trim(p_partner_slug), '');
  v_jurisdiction := upper(nullif(trim(p_jurisdiction), ''));
  v_code_hash := nullif(trim(p_code_hash), '');

  if v_jurisdiction is null or v_jurisdiction !~ '^[A-Z]{2,3}$' then
    raise exception 'jurisdiction must be a 2-3 letter uppercase code';
  end if;

  if v_partner_slug is null then
    return query select false, null::uuid, 'partner_inactive'::text, false, null::text, null::text, null::text, null::uuid;
    return;
  end if;

  -- Partner must be active to grant any partner benefit.
  if not exists (
    select 1 from public.partner_records pr
    where pr.partner_slug = v_partner_slug
      and pr.payment_status in ('paid', 'demo_paid')
      and pr.qualification_status = 'qualified'
      and pr.provisioning_status in ('provisioned', 'active')
  ) then
    return query select false, null::uuid, 'partner_inactive'::text, false, null::text, null::text, null::text, null::uuid;
    return;
  end if;

  select pr.access_mode into v_access_mode
  from public.partner_records pr
  where pr.partner_slug = v_partner_slug;
  v_access_mode := coalesce(v_access_mode, 'open');

  -- An entitlement row must exist for the partner to sponsor packets.
  if not exists (
    select 1 from public.partner_entitlement pe where pe.partner_slug = v_partner_slug
  ) then
    return query select false, null::uuid, 'partner_inactive'::text, false, null::text, null::text, v_access_mode, null::uuid;
    return;
  end if;

  -- Resolve the code (validation only; redemption happens atomically below).
  if v_code_hash is not null then
    select v.valid, v.reason, v.campaign_name, v.code_id, v.code_type
    into v_code_valid, v_code_reason, v_code_campaign, v_code_id, v_code_type
    from public.validate_partner_access_code(v_partner_slug, v_code_hash, p_now) v;
  end if;

  -- Decide benefit + attribution source per access mode.
  if v_access_mode = 'open' then
    v_benefit := true;
    if v_code_valid then
      v_source := 'partner_code';
    else
      v_source := 'partner_page';
      v_code_id := null;
      v_code_campaign := null;
    end if;
  elsif v_access_mode = 'optional_code' then
    if v_code_hash is not null and not v_code_valid then
      -- A code was entered but is not valid: surface the error, do not attribute.
      return query select false, null::uuid, coalesce(v_code_reason, 'invalid')::text, false, null::text, null::text, v_access_mode, null::uuid;
      return;
    end if;
    v_benefit := true;
    if v_code_valid then
      v_source := 'partner_code';
    else
      v_source := 'partner_page';
      v_code_id := null;
      v_code_campaign := null;
    end if;
  else
    -- required_code and invite_only: a valid code is mandatory for partner benefit.
    if not v_code_valid then
      return query select false, null::uuid, coalesce(v_code_reason, 'code_required')::text, false, null::text, null::text, v_access_mode, null::uuid;
      return;
    end if;
    v_benefit := true;
    v_source := 'partner_code';
  end if;

  -- Atomically redeem a limited/single-use code as part of the claim.
  if v_benefit and v_source = 'partner_code' and v_code_id is not null then
    v_effective_max := case
      when v_code_type = 'single_use' then 1
      when v_code_type = 'limited_use' then (select c.max_uses from public.partner_access_codes c where c.id = v_code_id)
      else null
    end;

    update public.partner_access_codes c
    set uses_count = c.uses_count + 1,
        last_used_at = p_now,
        updated_at = now()
    where c.id = v_code_id
      and (v_effective_max is null or c.uses_count < v_effective_max);

    get diagnostics v_rows = row_count;

    if v_rows = 0 then
      -- Lost a race for the last remaining use.
      return query select false, null::uuid, 'exhausted'::text, false, null::text, null::text, v_access_mode, null::uuid;
      return;
    end if;
  end if;

  -- Create the attributed session.
  v_session_id := gen_random_uuid();
  insert into public.screening_sessions (
    session_id, jurisdiction, answers, current_question_id, furthest_stage,
    status, last_drop_question, partner_slug, flow_mode, claimed_slot_state,
    partner_access_code_id, campaign_name, attribution_source, partner_benefit_active
  )
  values (
    v_session_id, v_jurisdiction, '{}'::jsonb, null, null,
    'in_progress', null, v_partner_slug, 'rcap', 'claimed',
    v_code_id, v_code_campaign, v_source, true
  );

  -- Audit.
  if v_code_id is not null then
    insert into public.rcap_record_events (record_type, record_id, partner_slug, event_type, occurred_at, actor, metadata)
    values ('partner_access_code', v_code_id::text, v_partner_slug, 'partner_code_used', p_now, 'system',
            jsonb_build_object('session_id', v_session_id, 'campaign_name', v_code_campaign));
  end if;

  return query select true, v_session_id, null::text, v_benefit, v_source, v_code_campaign, v_access_mode, v_code_id;
end;
$$;

comment on function public.claim_partner_screening_session(text, text, text, timestamptz) is
  'Resolves partner attribution from access_mode, atomically redeems a code when required, and creates an attributed screening session. Does not consume packet allocation.';

-------------------------------------------------------------------------------
-- 6b-i. Back-compat: the existing open-link claim RPC now stamps the new
--       attribution columns so open-link sessions are correctly benefit-flagged.
--       Signature and behavior are otherwise unchanged from phase-39.
-------------------------------------------------------------------------------

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
    session_id, jurisdiction, answers, current_question_id, furthest_stage,
    status, last_drop_question, partner_slug, flow_mode, claimed_slot_state,
    attribution_source, partner_benefit_active
  )
  values (
    v_session_id, v_jurisdiction, '{}'::jsonb, null, null,
    'in_progress', null, v_partner_slug, 'rcap', 'claimed',
    'partner_page', true
  );

  return query
  select true, v_session_id, null::text, v_screenings_used, v_screenings_allowed;
end;
$$;

revoke all on function public.claim_rcap_screening_session(text, text) from public, anon, authenticated;
grant execute on function public.claim_rcap_screening_session(text, text) to service_role;

-------------------------------------------------------------------------------
-- 6c. Overage-aware packet-generation recording. Consumes exactly one credit
--     (included or overage) per successful partner-benefit packet, idempotently.
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

  -- Idempotency / duplicate-retry guard: only a still-claimed slot may be counted.
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
    -- Included allocation.
    update public.partner_entitlement pe
    set screenings_used = pe.screenings_used + 1, updated_at = now()
    where pe.partner_slug = v_ent.partner_slug
    returning pe.screenings_used, pe.screenings_allowed, pe.overage_packets, pe.overage_amount_cents
    into v_ent.screenings_used, v_ent.screenings_allowed, v_ent.overage_packets, v_ent.overage_amount_cents;
    v_counted := 'included';
  elsif v_ent.pause_at_cap then
    -- Sponsored capacity paused at cap: nothing is counted, slot left claimed.
    insert into public.rcap_record_events (record_type, record_id, partner_slug, event_type, occurred_at, actor, metadata)
    values ('partner_entitlement', v_ent.partner_slug, v_ent.partner_slug, 'partner_packet_cap_reached', p_now, 'system',
            jsonb_build_object('session_id', p_session_id, 'paused', true));
    return query select false, 'capped'::text, 'paused_at_cap'::text,
                        v_ent.partner_slug, v_ent.screenings_used, v_ent.screenings_allowed,
                        v_ent.overage_packets, v_ent.overage_amount_cents;
    return;
  elsif v_ent.overage_enabled then
    -- Billable overage packet.
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
    -- Cap reached, overage disabled, not paused: legacy free-overflow (nothing billed).
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

  -- Mark the slot consumed so retries cannot double-count.
  update public.screening_sessions ss
  set claimed_slot_state = 'consumed', status = 'completed', updated_at = now()
  where ss.session_id = p_session_id;

  insert into public.rcap_record_events (record_type, record_id, partner_slug, event_type, occurred_at, actor, metadata)
  values ('partner_entitlement', v_ent.partner_slug, v_ent.partner_slug,
          case when v_counted = 'overage' then 'partner_packet_overage_recorded' else 'partner_packet_credit_consumed' end,
          p_now, 'system', jsonb_build_object('session_id', p_session_id, 'counted_as', v_counted));

  return query select true, v_counted, null::text,
                      v_ent.partner_slug, v_ent.screenings_used, v_ent.screenings_allowed,
                      v_ent.overage_packets, v_ent.overage_amount_cents;
end;
$$;

comment on function public.record_partner_packet_generation(uuid, timestamptz) is
  'Consumes exactly one partner packet credit (included or overage) per successful partner-benefit packet generation, idempotently. Respects pause_at_cap and overage_enabled.';

-------------------------------------------------------------------------------
-- 7. RLS for partner_access_codes (partner-scoped reads; mutations are service-role only).
-------------------------------------------------------------------------------

alter table public.partner_access_codes enable row level security;

drop policy if exists partner_access_codes_select_own_partner on public.partner_access_codes;
create policy partner_access_codes_select_own_partner
on public.partner_access_codes
for select
to authenticated
using (partner_slug = public.current_partner_slug());

drop policy if exists partner_access_codes_select_internal_admin on public.partner_access_codes;
create policy partner_access_codes_select_internal_admin
on public.partner_access_codes
for select
to authenticated
using (public.is_internal_admin());

-------------------------------------------------------------------------------
-- 8. Grants. Validation, claim, and packet recording run only as service_role.
-------------------------------------------------------------------------------

revoke all on function public.validate_partner_access_code(text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.claim_partner_screening_session(text, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.record_partner_packet_generation(uuid, timestamptz) from public, anon, authenticated;

grant execute on function public.validate_partner_access_code(text, text, timestamptz) to service_role;
grant execute on function public.claim_partner_screening_session(text, text, text, timestamptz) to service_role;
grant execute on function public.record_partner_packet_generation(uuid, timestamptz) to service_role;
