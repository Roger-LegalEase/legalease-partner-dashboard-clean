-- Phase 30: canonical RCAP person identity for distinct-people counts.
-- Apply after Phase 29 relief outcomes.
-- Identity is derived only from existing email/name fields. No SSN, DOB, phone
-- identity key, or new raw PII field is introduced. No backfill is required.

create table if not exists rcap_persons (
  id uuid primary key default gen_random_uuid(),
  partner_slug text not null,
  match_key text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists rcap_persons_partner_match_key_idx
  on rcap_persons(partner_slug, match_key);

alter table rcap_intake_sessions
  add column if not exists person_id uuid references rcap_persons(id) on delete set null;

alter table rcap_document_packets
  add column if not exists person_id uuid references rcap_persons(id) on delete set null;

create index if not exists rcap_intake_sessions_partner_person_idx
  on rcap_intake_sessions(partner_slug, person_id)
  where person_id is not null;

create index if not exists rcap_document_packets_partner_person_idx
  on rcap_document_packets(partner_slug, person_id)
  where person_id is not null;

create index if not exists rcap_document_packets_partner_outcome_person_idx
  on rcap_document_packets(partner_slug, relief_outcome, person_id)
  where person_id is not null;

create or replace function rcap_partner_person_outcome_counts(input_partner_slug text)
returns table (
  relief_outcome text,
  distinct_people bigint
)
language sql
stable
as $$
  select
    p.relief_outcome,
    count(distinct p.person_id)::bigint as distinct_people
  from rcap_document_packets p
  where p.partner_slug = input_partner_slug
    and p.person_id is not null
  group by p.relief_outcome
  order by p.relief_outcome;
$$;

comment on table rcap_persons is
  'Partner-scoped derived identity keys for distinct RCAP people counts. match_key is lowercased email when available, else normalized existing name; no SSN, DOB, phone-derived key, or new raw PII is stored.';

comment on column rcap_intake_sessions.person_id is
  'Nullable derived-person link set on new writes when existing email/name fields produce a match key. No backfill required.';

comment on column rcap_document_packets.person_id is
  'Nullable derived-person link set on new packet writes when intake/profile/name fields produce a match key. No backfill required.';
