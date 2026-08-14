-- screenings_allowed audit — READ-ONLY PRODUCTION OBSERVATION VARIANT.
--
-- This is the file to run in Roger's authorized window against production. It
-- is a single SELECT and touches nothing: no table is created, no row is
-- written, and it runs to completion inside `set transaction read only`.
--
-- Why a separate file from scripts/rcap-audit-screenings-allowed.sql
-- ------------------------------------------------------------------
-- The full audit left-joins public.rcap_audit_authority, the contract-of-record
-- table an operator loads before a correction run. That table does not exist in
-- production and cannot be created there by a read-only session — PostgreSQL
-- refuses CREATE TABLE in a read-only transaction, including for TEMP tables.
-- So the full audit cannot run read-only against production at all; running it
-- would require a write first, which is exactly what this observation is meant
-- to avoid.
--
-- The split is not a loss of rigour. It separates two different questions:
--
--   what is true in production   <- this file, read-only, no contract needed
--   what should be true          <- the contract of record, held outside the DB
--
-- The comparison happens offline, against the JSON this emits. Nothing is
-- classified as correctable here, because a correction proposal requires the
-- authoritative value and this file deliberately has no access to one.
--
-- What it emits per partner
-- -------------------------
--   * current screenings_allowed / screenings_used
--   * cas_operand — the value a later backfill must compare-and-swap against
--   * phase41_columns_present — whether the overage columns exist
--   * record_event_sink_admits_partner_onboarding — whether the event sink
--     could record a cap-configure event at all
--   * cap_configure_events / audited_packet_cap / last_cap_configure_at
--   * overwrite_suspected — phase-41 columns present, a cap event exists, and
--     screenings_allowed equals the packet cap that event carried
--   * evidence_quality — see below
--
-- evidence_quality is the corrected evidence rule, carried over intact:
-- the absence of a partner_onboarding event is NOT evidence that
-- configurePacketCap was never used, when the event sink or its constraint did
-- not accept that event. Those rows read 'sink_unavailable_absence_proves_
-- nothing' and must never be auto-classified or auto-changed downstream.
--
-- Exact invocation (see docs/RCAP_SCREENINGS_ALLOWED_AUDIT_PLAN.md):
--   psql "$RCAP_AUDIT_READONLY_URL" -X --no-psqlrc -v ON_ERROR_STOP=1 -A -t \
--     -c 'set transaction read only' \
--     -f scripts/rcap-audit-screenings-allowed-readonly.sql \
--     -o artifacts/screenings-allowed-production-audit.json
--
-- Preflight (run first; if either is null, stop and record why):
--   select to_regclass('public.rcap_record_events')  as record_events_present,
--          to_regclass('public.partner_entitlement') as partner_entitlement_present;

with phase41 as (
  select
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'partner_entitlement'
        and column_name = 'overage_enabled'
    ) as columns_present
),
sink as (
  -- True when every check constraint on rcap_record_events.record_type admits
  -- 'partner_onboarding', and vacuously true when no such constraint exists.
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
    count(*) as cap_configure_events,
    max(e.occurred_at) as last_cap_configure_at
  from public.rcap_record_events e
  where e.record_type = 'partner_onboarding'
    and e.event_type = 'partner_packet_cap_configured'
  group by e.partner_slug
)
select jsonb_pretty(coalesce(jsonb_agg(jsonb_build_object(
  'partner_record_id', pr.id,
  'partner_slug', pr.partner_slug,           -- display only, never a key
  'entitlement_scope', 'screenings',
  'current_screenings_allowed', pe.screenings_allowed,
  'current_screenings_used', pe.screenings_used,
  -- Copy verbatim into rcap_audit_authority.audited_wrong_value for the rows
  -- Roger approves. The backfill re-asserts it as a CAS operand at write time,
  -- so a row that drifts between this read and that window is refused.
  'cas_operand', pe.screenings_allowed,
  'phase41_columns_present', p41.columns_present,
  'record_event_sink_admits_partner_onboarding', snk.admits_partner_onboarding,
  'cap_configure_events', coalesce(cw.cap_configure_events, 0),
  'last_cap_configure_at', cw.last_cap_configure_at,
  'audited_packet_cap', cw.audited_packet_cap,
  'overwrite_suspected',
    p41.columns_present
    and coalesce(cw.cap_configure_events, 0) > 0
    and pe.screenings_allowed = cw.audited_packet_cap,
  'evidence_quality', case
    when not snk.admits_partner_onboarding
      then 'sink_unavailable_absence_proves_nothing'
    when coalesce(cw.cap_configure_events, 0) > 0 and not p41.columns_present
      then 'cap_event_without_phase41_columns_ambiguous'
    when coalesce(cw.cap_configure_events, 0) > 0
      then 'cap_event_recorded'
    else 'no_cap_event_and_sink_was_available'
  end
)), '[]'::jsonb)) as production_audit_readonly
from public.partner_records pr
left join public.partner_entitlement pe on pe.partner_slug = pr.partner_slug
left join cap_writes cw on cw.partner_slug = pr.partner_slug
cross join phase41 p41
cross join sink snk;
