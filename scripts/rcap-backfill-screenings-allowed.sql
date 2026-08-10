-- screenings_allowed deterministic CAS backfill (EXECUTION QUEUED — runs only
-- in Roger's authorized window, after phases 49+50 and after he has reviewed
-- the audit JSON from scripts/rcap-audit-screenings-allowed.sql).
--
-- Deterministic by construction:
--   * Every value written comes from public.rcap_audit_authority — the
--     contract-of-record table the operator loads. Nothing is computed from
--     screenings_allowed, and packet capacity is never inferred from it.
--   * Compare-and-swap: a row is corrected only while its current
--     screenings_allowed still equals the audited_wrong_value recorded from
--     the audit read. A row that drifted since the audit is refused and
--     reported, never overwritten.
--   * Ambiguity exclusion is STRUCTURAL, not procedural: the candidate set
--     recomputes the audit's unresolved_ambiguity clauses at write time, so an
--     ambiguous row is refused even if an operator mistakenly loads an
--     authoritative value and CAS operand for it.
--   * Pre-images of every touched row are captured to
--     rcap_audit_rollback_screenings_allowed before the update, keyed by a
--     batch label; scripts/rcap-rollback-screenings-allowed.sql inverts a
--     batch from that capture.
--   * screenings_used is never modified.
--
-- Batch label: set before running (defaults to a timestamped label):
--   set rcap.backfill_batch_label = 'window-2026-08-11';
--
-- Fixture-proven by scripts/verify-rcap-screenings-allowed-audit.mjs.

begin;

create table if not exists public.rcap_audit_authority (
  partner_record_id uuid primary key,
  screening_allocation integer,
  screening_source text,
  packet_allocation integer,
  packet_source text,
  packet_overage_reserve integer not null default 0,
  audited_wrong_value integer
);

revoke all on table public.rcap_audit_authority from public;
revoke all on table public.rcap_audit_authority from anon;
revoke all on table public.rcap_audit_authority from authenticated;

create table if not exists public.rcap_audit_rollback_screenings_allowed (
  id uuid primary key default gen_random_uuid(),
  batch_label text not null,
  partner_record_id uuid not null,
  partner_slug text not null,
  prev_screenings_allowed integer not null,
  prev_screenings_used integer not null,
  new_screenings_allowed integer not null,
  captured_at timestamptz not null default now()
);

revoke all on table public.rcap_audit_rollback_screenings_allowed from public;
revoke all on table public.rcap_audit_rollback_screenings_allowed from anon;
revoke all on table public.rcap_audit_rollback_screenings_allowed from authenticated;

-- ---------------------------------------------------------------------------
-- 1. Correct screenings_allowed for unambiguous rows only, CAS-guarded,
--    pre-images captured first. The ambiguity CTE mirrors the audit read's
--    unresolved_ambiguity clauses exactly.
-- ---------------------------------------------------------------------------

with batch as (
  select coalesce(
    nullif(current_setting('rcap.backfill_batch_label', true), ''),
    'backfill-' || to_char(now(), 'YYYYMMDD-HH24MISS')
  ) as label
),
phase41 as (
  select
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'partner_entitlement'
        and column_name = 'overage_enabled'
    ) as columns_present
),
sink as (
  select coalesce((
    select bool_and(pg_get_constraintdef(c.oid) ilike '%partner_onboarding%')
    from pg_constraint c
    where c.conrelid = 'public.rcap_record_events'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%record_type%'
  ), true) as admits_partner_onboarding
),
cap_writes as (
  select
    e.partner_slug,
    max((e.metadata ->> 'packet_cap')::integer) as audited_packet_cap,
    count(*) as cap_configure_events
  from public.rcap_record_events e
  where e.record_type = 'partner_onboarding'
    and e.event_type = 'partner_packet_cap_configured'
  group by e.partner_slug
),
ambiguity as (
  -- Same clauses as the audit read. A row flagged here can never be updated.
  select
    pr.id as partner_record_id,
    (
      a.screening_allocation is null
      or (coalesce(cw.cap_configure_events, 0) > 0
          and not p41.columns_present
          and pe.screenings_allowed = cw.audited_packet_cap)
      or (p41.columns_present
          and not snk.admits_partner_onboarding
          and pe.screenings_allowed is distinct from a.screening_allocation)
    ) as is_ambiguous
  from public.partner_records pr
  left join public.partner_entitlement pe on pe.partner_slug = pr.partner_slug
  left join public.rcap_audit_authority a on a.partner_record_id = pr.id
  left join cap_writes cw on cw.partner_slug = pr.partner_slug
  cross join phase41 p41
  cross join sink snk
),
candidates as (
  select
    pr.id as partner_record_id,
    pr.partner_slug,
    pe.screenings_allowed as current_value,
    pe.screenings_used as current_used,
    a.screening_allocation as target_value,
    a.audited_wrong_value
  from public.rcap_audit_authority a
  join public.partner_records pr on pr.id = a.partner_record_id
  join public.partner_entitlement pe on pe.partner_slug = pr.partner_slug
  join ambiguity amb on amb.partner_record_id = pr.id
  where not amb.is_ambiguous                               -- structural exclusion
    and a.screening_allocation is not null
    and a.audited_wrong_value is not null                  -- CAS operand must be explicit
    and pe.screenings_allowed = a.audited_wrong_value      -- CAS: drifted rows refused
    and pe.screenings_allowed is distinct from a.screening_allocation
),
captured as (
  insert into public.rcap_audit_rollback_screenings_allowed
    (batch_label, partner_record_id, partner_slug,
     prev_screenings_allowed, prev_screenings_used, new_screenings_allowed)
  select b.label, c.partner_record_id, c.partner_slug,
         c.current_value, c.current_used, c.target_value
  from candidates c
  cross join batch b
  returning partner_record_id
)
update public.partner_entitlement pe
set screenings_allowed = c.target_value
from candidates c
where pe.partner_slug = c.partner_slug
  and pe.screenings_allowed = c.audited_wrong_value        -- CAS re-asserted at write
  and exists (select 1 from captured cap where cap.partner_record_id = c.partner_record_id);

-- ---------------------------------------------------------------------------
-- 2. Seed packet capacity into partner_packet_entitlement from the contract
--    values only. Never from screenings_allowed. An existing ACTIVE
--    entitlement is never overwritten here — it lands in the exception report
--    for a human decision instead.
--    pause_at_cap stays at its fail-closed default (true); a contract reserve
--    (e.g. 100 + 10) becomes overage_cap with overage_enabled on.
-- ---------------------------------------------------------------------------

insert into public.partner_packet_entitlement
  (partner_id, entitlement_scope, packet_cap, overage_enabled, overage_cap, contract_note)
select
  a.partner_record_id,
  'sponsored_packets',
  a.packet_allocation,
  a.packet_overage_reserve > 0,
  a.packet_overage_reserve,
  coalesce('seeded from contract of record: ' || a.packet_source, 'seeded from contract of record')
from public.rcap_audit_authority a
where a.packet_allocation is not null
  and not exists (
    select 1 from public.partner_packet_entitlement e
    where e.partner_id = a.partner_record_id
      and e.entitlement_scope = 'sponsored_packets'
      and e.expires_at is null
  );

-- ---------------------------------------------------------------------------
-- 3. Exception report: every partner with an entitlement row that was NOT
--    fully corrected this run, with the reason. Ambiguous and drifted rows can
--    only ever appear here.
-- ---------------------------------------------------------------------------

with phase41 as (
  select
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'partner_entitlement'
        and column_name = 'overage_enabled'
    ) as columns_present
),
sink as (
  select coalesce((
    select bool_and(pg_get_constraintdef(c.oid) ilike '%partner_onboarding%')
    from pg_constraint c
    where c.conrelid = 'public.rcap_record_events'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%record_type%'
  ), true) as admits_partner_onboarding
),
cap_writes as (
  select
    e.partner_slug,
    max((e.metadata ->> 'packet_cap')::integer) as audited_packet_cap,
    count(*) as cap_configure_events
  from public.rcap_record_events e
  where e.record_type = 'partner_onboarding'
    and e.event_type = 'partner_packet_cap_configured'
  group by e.partner_slug
)
select jsonb_pretty(coalesce(jsonb_agg(jsonb_build_object(
  'partner_record_id', pr.id,
  'partner_slug', pr.partner_slug,
  'current_screenings_allowed', pe.screenings_allowed,
  'authoritative_screening_allocation', a.screening_allocation,
  'audited_wrong_value', a.audited_wrong_value,
  'disposition', case
    when a.partner_record_id is null or a.screening_allocation is null
      then 'ambiguous_no_authoritative_value_untouched'
    when (coalesce(cw.cap_configure_events, 0) > 0
          and not p41.columns_present
          and pe.screenings_allowed = cw.audited_packet_cap)
      then 'ambiguous_cap_event_without_phase41_columns_untouched'
    when (p41.columns_present
          and not snk.admits_partner_onboarding
          and pe.screenings_allowed is distinct from a.screening_allocation)
      then 'ambiguous_event_sink_unavailable_untouched'
    when a.audited_wrong_value is null then 'no_cas_operand_recorded_untouched'
    when pe.screenings_allowed = a.screening_allocation then 'already_correct'
    when pe.screenings_allowed is distinct from a.audited_wrong_value
      then 'cas_refused_row_drifted_untouched'
  end,
  'packet_seed', case
    when a.partner_record_id is null or a.packet_allocation is null
      then 'no_authoritative_packet_value_not_seeded'
    else 'seed_attempted_see_partner_packet_entitlement'
  end
)), '[]'::jsonb)) as backfill_exception_report
from public.partner_records pr
join public.partner_entitlement pe on pe.partner_slug = pr.partner_slug
left join public.rcap_audit_authority a on a.partner_record_id = pr.id
left join cap_writes cw on cw.partner_slug = pr.partner_slug
cross join phase41 p41
cross join sink snk
where a.partner_record_id is null
   or a.screening_allocation is null
   or a.audited_wrong_value is null
   or pe.screenings_allowed is distinct from a.screening_allocation
   or (coalesce(cw.cap_configure_events, 0) > 0
       and not p41.columns_present
       and pe.screenings_allowed = cw.audited_packet_cap);

commit;
