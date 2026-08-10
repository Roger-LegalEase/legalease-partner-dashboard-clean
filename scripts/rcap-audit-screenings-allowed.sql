-- screenings_allowed audit read (DESIGN ARTIFACT — row-level execution against
-- production or staging runs only as a queued authorized read in Roger's
-- window, or against an export he supplies).
--
-- Emits one JSON object per partner with everything the correction decision
-- needs. Packet capacity is NEVER inferred from screenings_allowed alone: the
-- authoritative columns come from a contract-of-record table the operator
-- supplies at run time (:'authoritative_csv' loaded into rcap_audit_authority).
--
-- Companion backfill template: docs/RCAP_SCREENINGS_ALLOWED_AUDIT_PLAN.md.

with phase41 as (
  select
    exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'partner_entitlement'
        and column_name = 'overage_enabled'
    ) as columns_present
),
cap_writes as (
  -- partner_onboarding_audit records partner_packet_cap_configured events; the
  -- defective writer could only have committed where the phase-41 columns
  -- existed at the time of the event.
  select
    a.partner_slug,
    max((a.details ->> 'packet_cap')::integer) as audited_packet_cap,
    count(*) as cap_configure_events,
    max(a.created_at) as last_cap_configure_at
  from public.partner_onboarding_audit a
  where a.action = 'partner_packet_cap_configured'
  group by a.partner_slug
)
select jsonb_pretty(jsonb_agg(jsonb_build_object(
  'partner_record_id', pr.id,
  'partner_slug', pr.partner_slug,           -- display only, never a key
  'entitlement_scope', 'screenings',
  'current_screenings_allowed', pe.screenings_allowed,
  'current_screenings_used', pe.screenings_used,
  'authoritative_screening_allocation', auth.screening_allocation,
  'authoritative_screening_source', auth.screening_source,
  'authoritative_packet_allocation', auth.packet_allocation,
  'authoritative_packet_source', auth.packet_source,
  'phase41_columns_present', p41.columns_present,
  'cap_configure_events', coalesce(cw.cap_configure_events, 0),
  'last_cap_configure_at', cw.last_cap_configure_at,
  'audited_packet_cap', cw.audited_packet_cap,
  'packet_cap_write_possible', p41.columns_present and cw.cap_configure_events > 0,
  'overwrite_occurred',
    p41.columns_present
    and cw.cap_configure_events > 0
    and pe.screenings_allowed = cw.audited_packet_cap,
  'proposed_correction', case
    when auth.screening_allocation is null then 'exception: no authoritative screening value'
    when p41.columns_present and cw.cap_configure_events > 0 and pe.screenings_allowed = cw.audited_packet_cap
      then format('set screenings_allowed = %s (restore) and seed partner_packet_entitlement.packet_cap = %s', auth.screening_allocation, auth.packet_allocation)
    when pe.screenings_allowed is distinct from auth.screening_allocation
      then format('set screenings_allowed = %s (contract correction, non-defect drift)', auth.screening_allocation)
    else 'none'
  end,
  'unresolved_ambiguity',
    auth.screening_allocation is null
    or (cw.cap_configure_events > 0 and not p41.columns_present and pe.screenings_allowed = cw.audited_packet_cap)
)))
from public.partner_records pr
left join public.partner_entitlement pe on pe.partner_slug = pr.partner_slug
left join public.rcap_audit_authority auth on auth.partner_record_id = pr.id
left join cap_writes cw on cw.partner_slug = pr.partner_slug
cross join phase41 p41;
