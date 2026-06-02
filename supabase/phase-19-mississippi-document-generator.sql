-- Phase 19: Mississippi RCAP document generator foundation.
-- Apply in the Supabase SQL Editor before live document-packet verification.
-- No SSN is collected in this phase.

create table if not exists rcap_document_packets (
  id uuid primary key default gen_random_uuid(),
  partner_slug text not null,
  intake_session_id uuid references rcap_intake_sessions(id) on delete set null,
  user_id uuid,
  briefcase_id uuid,
  state text not null default 'MS',
  county text,
  court_type text,
  court_county text,
  court_name text,
  jurisdiction text,
  document_type text,
  pathway text not null,
  status text not null default 'draft_started',
  petitioner_first_name text,
  petitioner_last_name text,
  petitioner_city text,
  petitioner_county text,
  cause_number text,
  charge text,
  offense_date text,
  arrest_date text,
  arresting_agency text,
  agency_case_number text,
  disposition_date text,
  conviction_date text,
  sentence_completion_date text,
  has_zero_balance boolean,
  has_court_documents boolean,
  first_offender_signal boolean,
  non_traffic_signal boolean,
  excluded_offense_screening boolean,
  one_felony_expungement_signal boolean,
  needs_record_review boolean not null default true,
  generated_html text,
  generated_plain_text text,
  filing_instructions text[] not null default '{}',
  county_court_instructions text[] not null default '{}',
  missing_fields text[] not null default '{}',
  safety_disclaimer text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint rcap_document_packets_state_check check (state = 'MS'),
  constraint rcap_document_packets_document_type_check check (
    document_type is null or document_type in (
      'mississippi_non_conviction_petition',
      'mississippi_misdemeanor_conviction_petition',
      'mississippi_felony_conviction_petition',
      'mississippi_certificate_of_service',
      'mississippi_proposed_order_placeholder'
    )
  ),
  constraint rcap_document_packets_pathway_check check (
    pathway in ('non_conviction', 'misdemeanor_conviction', 'felony_conviction', 'more_information_needed')
  ),
  constraint rcap_document_packets_status_check check (
    status in (
      'draft_started',
      'form_in_progress',
      'saved_for_later',
      'missing_information',
      'ready_for_review',
      'preview_generated',
      'exported',
      'blocked_review_required'
    )
  )
);

create index if not exists rcap_document_packets_partner_slug_idx on rcap_document_packets(partner_slug);
create index if not exists rcap_document_packets_intake_session_id_idx on rcap_document_packets(intake_session_id);
create index if not exists rcap_document_packets_state_status_idx on rcap_document_packets(state, status);
create index if not exists rcap_document_packets_user_id_idx on rcap_document_packets(user_id);

create or replace function set_rcap_document_packets_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_rcap_document_packets_updated_at on rcap_document_packets;
create trigger set_rcap_document_packets_updated_at
before update on rcap_document_packets
for each row
execute function set_rcap_document_packets_updated_at();

create table if not exists rcap_document_packet_inputs (
  id uuid primary key default gen_random_uuid(),
  document_packet_id uuid not null references rcap_document_packets(id) on delete cascade,
  partner_slug text not null,
  intake_session_id uuid references rcap_intake_sessions(id) on delete set null,
  input_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rcap_document_packet_inputs_packet_unique unique(document_packet_id)
);

create index if not exists rcap_document_packet_inputs_partner_slug_idx on rcap_document_packet_inputs(partner_slug);
create index if not exists rcap_document_packet_inputs_intake_session_id_idx on rcap_document_packet_inputs(intake_session_id);

create table if not exists rcap_user_profiles (
  id uuid primary key default gen_random_uuid(),
  email text,
  display_name text,
  auth_provider text,
  auth_subject text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists rcap_briefcase_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid,
  partner_slug text not null,
  intake_session_id uuid references rcap_intake_sessions(id) on delete set null,
  document_packet_id uuid references rcap_document_packets(id) on delete cascade,
  item_type text not null,
  title text not null,
  status text not null,
  state text,
  county text,
  document_type text,
  last_opened_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rcap_briefcase_items_packet_unique unique(document_packet_id),
  constraint rcap_briefcase_items_type_check check (item_type in ('intake_session', 'document_packet', 'filing_instruction_packet'))
);

create index if not exists rcap_briefcase_items_user_id_idx on rcap_briefcase_items(user_id);
create index if not exists rcap_briefcase_items_partner_slug_idx on rcap_briefcase_items(partner_slug);
create index if not exists rcap_briefcase_items_intake_session_id_idx on rcap_briefcase_items(intake_session_id);
