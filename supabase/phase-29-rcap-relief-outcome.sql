-- Phase 29: definitive RCAP relief outcome tracking.
-- Apply after Phase 28 append-only record audit trail.
-- This does not change packet generation, intake, or eligibility behavior. It
-- adds a verifiable outcome field for impact reporting.

alter table rcap_document_packets
  add column if not exists relief_outcome text not null default 'not_recorded';

alter table rcap_document_packets drop constraint if exists rcap_document_packets_relief_outcome_check;
alter table rcap_document_packets add constraint rcap_document_packets_relief_outcome_check check (
  relief_outcome in (
    'not_recorded',
    'filed_pending',
    'relief_granted',
    'relief_partially_granted',
    'relief_denied',
    'relief_unavailable',
    'withdrawn'
  )
);

create index if not exists rcap_document_packets_relief_outcome_idx
  on rcap_document_packets(partner_slug, relief_outcome, updated_at);

create or replace function write_rcap_document_packet_relief_outcome_event()
returns trigger
language plpgsql
as $$
begin
  if old.relief_outcome is distinct from new.relief_outcome then
    insert into rcap_record_events (
      record_type,
      record_id,
      partner_slug,
      partner_id,
      event_type,
      from_status,
      to_status,
      actor,
      metadata
    )
    values (
      'document_packet',
      new.id::text,
      new.partner_slug,
      null,
      'relief_outcome_changed',
      old.relief_outcome,
      new.relief_outcome,
      coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''), 'system'),
      jsonb_build_object(
        'state', new.state,
        'county', new.county,
        'document_type', new.document_type,
        'pathway', new.pathway,
        'status', new.status,
        'has_briefcase_item', new.briefcase_id is not null,
        'source', 'rcap_document_packets_relief_outcome_trigger'
      )
    );
  end if;

  return new;
end;
$$;

drop trigger if exists rcap_document_packets_relief_outcome_audit on rcap_document_packets;
create trigger rcap_document_packets_relief_outcome_audit
after update of relief_outcome on rcap_document_packets
for each row execute function write_rcap_document_packet_relief_outcome_event();

comment on column rcap_document_packets.relief_outcome is
  'Definitive outcome for impact reporting. Actual relief delivered is counted from relief_granted and relief_partially_granted values; changes are audited in rcap_record_events.';
