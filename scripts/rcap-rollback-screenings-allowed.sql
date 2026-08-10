-- screenings_allowed backfill rollback (EXECUTION QUEUED — runs only in
-- Roger's authorized window).
--
-- Inverts one named batch of scripts/rcap-backfill-screenings-allowed.sql from
-- the pre-images captured in rcap_audit_rollback_screenings_allowed. The batch
-- label is required — rollback never guesses which batch to invert:
--   set rcap.backfill_batch_label = 'window-2026-08-11';
--
-- CAS on the way back too: a row is restored only while its current value
-- still equals the value the backfill wrote (new_screenings_allowed). A row
-- someone changed after the backfill is refused and reported, never
-- overwritten. screenings_used is never modified.
--
-- Packet-entitlement seeds are NOT dropped here: partner_packet_entitlement
-- rows may have accrued packet_credit_ledger history (restrict FKs), and
-- removing capacity is a product decision. Seeded-and-unwanted rows are listed
-- in the report for an explicit human decision.
--
-- Fixture-proven by scripts/verify-rcap-screenings-allowed-audit.mjs.

begin;

do $$
begin
  if nullif(current_setting('rcap.backfill_batch_label', true), '') is null then
    raise exception 'set rcap.backfill_batch_label to the batch label to roll back';
  end if;
  if not exists (
    select 1 from public.rcap_audit_rollback_screenings_allowed r
    where r.batch_label = current_setting('rcap.backfill_batch_label', true)
  ) then
    raise exception 'no captured rows for batch label %',
      current_setting('rcap.backfill_batch_label', true);
  end if;
end;
$$;

update public.partner_entitlement pe
set screenings_allowed = r.prev_screenings_allowed
from public.rcap_audit_rollback_screenings_allowed r
where r.batch_label = current_setting('rcap.backfill_batch_label', true)
  and pe.partner_slug = r.partner_slug
  and pe.screenings_allowed = r.new_screenings_allowed;   -- CAS: refuse post-backfill edits

-- Report: every captured row and whether it was restored this run.
select jsonb_pretty(coalesce(jsonb_agg(jsonb_build_object(
  'partner_record_id', r.partner_record_id,
  'partner_slug', r.partner_slug,
  'batch_label', r.batch_label,
  'prev_screenings_allowed', r.prev_screenings_allowed,
  'backfill_wrote', r.new_screenings_allowed,
  'current_screenings_allowed', pe.screenings_allowed,
  'disposition', case
    when pe.screenings_allowed = r.prev_screenings_allowed then 'restored'
    else 'cas_refused_row_changed_after_backfill_untouched'
  end
)), '[]'::jsonb)) as rollback_report
from public.rcap_audit_rollback_screenings_allowed r
join public.partner_entitlement pe on pe.partner_slug = r.partner_slug
where r.batch_label = current_setting('rcap.backfill_batch_label', true);

commit;
