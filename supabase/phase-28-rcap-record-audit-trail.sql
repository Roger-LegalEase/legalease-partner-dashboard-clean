-- Phase 28: append-only RCAP record audit trail.
-- Apply after Phase 27 source document persistence.
-- This starts the verifiable outcomes trail from the time it is applied; no
-- historical backfill is required or performed.

create table if not exists rcap_record_events (
  id uuid primary key default gen_random_uuid(),
  record_type text not null check (record_type in ('intake_session', 'document_packet')),
  record_id text not null,
  partner_slug text not null,
  partner_id text,
  event_type text not null,
  from_status text,
  to_status text,
  occurred_at timestamptz not null default now(),
  actor text not null default 'system',
  metadata jsonb
);

create index if not exists rcap_record_events_record_idx
  on rcap_record_events(record_type, record_id, occurred_at);

create index if not exists rcap_record_events_partner_idx
  on rcap_record_events(partner_slug, occurred_at);

create or replace function prevent_rcap_record_events_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'rcap_record_events is append-only';
end;
$$;

drop trigger if exists rcap_record_events_prevent_update on rcap_record_events;
create trigger rcap_record_events_prevent_update
before update on rcap_record_events
for each row execute function prevent_rcap_record_events_mutation();

drop trigger if exists rcap_record_events_prevent_delete on rcap_record_events;
create trigger rcap_record_events_prevent_delete
before delete on rcap_record_events
for each row execute function prevent_rcap_record_events_mutation();

revoke all on table rcap_record_events from public;
revoke all on table rcap_record_events from anon;
revoke all on table rcap_record_events from authenticated;

grant select, insert on table rcap_record_events to authenticated;

comment on table rcap_record_events is
  'Append-only immutable RCAP audit log for intake/session and document packet status changes. Contains no SSN, DOB, or direct PII.';
