-- screenings_allowed audit read (DESIGN ARTIFACT — row-level execution against
-- production or staging runs only as a queued authorized read in Roger's
-- window, or against an export he supplies).
--
-- Emits one JSON object per partner with everything the correction decision
-- needs. Packet capacity is NEVER inferred from screenings_allowed alone: the
-- authoritative columns come from a contract-of-record table the operator
-- supplies at run time (loaded into public.rcap_audit_authority; DDL below).
--
-- Session C row-evidence correction (fixture-proven, see
-- scripts/verify-rcap-screenings-allowed-audit.mjs): the original draft read
-- from public.partner_onboarding_audit (action/details/created_at). No such
-- table exists in any migration. partner_packet_cap_configured events are
-- written by the audit() helper in src/lib/partners/partner-onboarding.ts to
-- public.rcap_record_events with record_type = 'partner_onboarding',
-- event_type, metadata and occurred_at — and only where the phase-42
-- record_type check admits 'partner_onboarding'. Where the sink did not admit
-- that record type, the insert failed silently (audit() swallows errors), so
-- "zero events" is NOT proof no cap-configure happened; the sink probe below
-- feeds that fact into unresolved_ambiguity.
--
-- Preflight (run first; if either is false/null, stop and record why):
--   select to_regclass('public.rcap_record_events')    as record_events_present,
--          to_regclass('public.partner_entitlement')   as partner_entitlement_present;
--
-- Authority table the operator loads before the audit (values from the
-- contract of record; audited_wrong_value is filled from this audit's
-- cas_operand output before the backfill run, never computed in place):
--   create table if not exists public.rcap_audit_authority (
--     partner_record_id uuid primary key,
--     screening_allocation integer,
--     screening_source text,
--     packet_allocation integer,
--     packet_source text,
--     packet_overage_reserve integer not null default 0,
--     audited_wrong_value integer
--   );
--
-- Companion backfill: scripts/rcap-backfill-screenings-allowed.sql
-- Companion rollback: scripts/rcap-rollback-screenings-allowed.sql
-- Plan of record:     docs/RCAP_SCREENINGS_ALLOWED_AUDIT_PLAN.md

with phase41 as (
  select
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'partner_entitlement'
        and column_name = 'overage_enabled'
    ) as columns_present
),
sink as (
  -- Could partner_onboarding events be recorded at all? True when every check
  -- constraint on rcap_record_events.record_type admits 'partner_onboarding'
  -- (phase 42 applied), and vacuously true when no such constraint exists.
  select coalesce((
    select bool_and(pg_get_constraintdef(c.oid) ilike '%partner_onboarding%')
    from pg_constraint c
    where c.conrelid = 'public.rcap_record_events'::regclass
      and c.contype = 'c'
      and pg_get_constraintdef(c.oid) ilike '%record_type%'
  ), true) as admits_partner_onboarding
),
cap_writes as (
  -- partner_packet_cap_configured events as actually written by the onboarding
  -- audit() helper: rcap_record_events, record_type 'partner_onboarding'.
  select
    e.partner_slug,
    max((e.metadata ->> 'packet_cap')::integer) as audited_packet_cap,
    count(*) as cap_configure_events,
    max(e.occurred_at) as last_cap_configure_at
  from public.rcap_record_events e
  where e.record_type = 'partner_onboarding'
    and e.event_type = 'partner_packet_cap_configured'
  group by e.partner_slug
)
select jsonb_pretty(jsonb_agg(jsonb_build_object(
  'partner_record_id', pr.id,
  'partner_slug', pr.partner_slug,           -- display only, never a key
  'entitlement_scope', 'screenings',
  'current_screenings_allowed', pe.screenings_allowed,
  'current_screenings_used', pe.screenings_used,
  -- The CAS operand the backfill will assert against; copy verbatim into
  -- rcap_audit_authority.audited_wrong_value for rows Roger approves.
  'cas_operand', pe.screenings_allowed,
  'authoritative_screening_allocation', auth.screening_allocation,
  'authoritative_screening_source', auth.screening_source,
  'authoritative_packet_allocation', auth.packet_allocation,
  'authoritative_packet_source', auth.packet_source,
  'phase41_columns_present', p41.columns_present,
  'record_event_sink_admits_partner_onboarding', snk.admits_partner_onboarding,
  'cap_configure_events', coalesce(cw.cap_configure_events, 0),
  'last_cap_configure_at', cw.last_cap_configure_at,
  'audited_packet_cap', cw.audited_packet_cap,
  'packet_cap_write_possible', p41.columns_present and coalesce(cw.cap_configure_events, 0) > 0,
  'overwrite_occurred',
    p41.columns_present
    and coalesce(cw.cap_configure_events, 0) > 0
    and pe.screenings_allowed = cw.audited_packet_cap,
  'proposed_correction', case
    when auth.screening_allocation is null then 'exception: no authoritative screening value'
    when p41.columns_present and coalesce(cw.cap_configure_events, 0) > 0 and pe.screenings_allowed = cw.audited_packet_cap
      then format('set screenings_allowed = %s (restore) and seed partner_packet_entitlement.packet_cap = %s', auth.screening_allocation, auth.packet_allocation)
    when pe.screenings_allowed is distinct from auth.screening_allocation
      then format('set screenings_allowed = %s (contract correction, non-defect drift)', auth.screening_allocation)
    else 'none'
  end,
  'unresolved_ambiguity',
    auth.screening_allocation is null
    or (coalesce(cw.cap_configure_events, 0) > 0 and not p41.columns_present and pe.screenings_allowed = cw.audited_packet_cap)
    -- Cap writes were possible but the event sink could not record them:
    -- absence of events proves nothing, so a mismatched row cannot be
    -- auto-classified.
    or (p41.columns_present and not snk.admits_partner_onboarding
        and pe.screenings_allowed is distinct from auth.screening_allocation)
)))
from public.partner_records pr
left join public.partner_entitlement pe on pe.partner_slug = pr.partner_slug
left join public.rcap_audit_authority auth on auth.partner_record_id = pr.id
left join cap_writes cw on cw.partner_slug = pr.partner_slug
cross join phase41 p41
cross join sink snk;
