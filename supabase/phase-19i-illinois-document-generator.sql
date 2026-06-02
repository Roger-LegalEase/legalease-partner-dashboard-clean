-- Phase 19I: Illinois RCAP document generator foundation.
-- Apply in the Supabase SQL Editor before live Illinois document-packet verification.
-- No SSN is collected in this phase.

alter table rcap_document_packets add column if not exists remedy_type text;
alter table rcap_document_packets add column if not exists cook_county_district text;
alter table rcap_document_packets add column if not exists other_names_used text;
alter table rcap_document_packets add column if not exists date_of_birth_private_placeholder text;
alter table rcap_document_packets add column if not exists race_private_placeholder text;
alter table rcap_document_packets add column if not exists gender_private_placeholder text;
alter table rcap_document_packets add column if not exists arrest_or_case_numbers text;
alter table rcap_document_packets add column if not exists disposition text;
alter table rcap_document_packets add column if not exists supervision_completed_date text;
alter table rcap_document_packets add column if not exists qualified_probation_completed_date text;
alter table rcap_document_packets add column if not exists sentence_termination_date text;
alter table rcap_document_packets add column if not exists education_waiver_signal boolean;
alter table rcap_document_packets add column if not exists cannabis_signal boolean;
alter table rcap_document_packets add column if not exists excluded_offense_signal boolean;
alter table rcap_document_packets add column if not exists has_rap_sheet boolean;
alter table rcap_document_packets add column if not exists needs_rap_sheet boolean;

alter table rcap_document_packets drop constraint if exists rcap_document_packets_state_check;
alter table rcap_document_packets add constraint rcap_document_packets_state_check check (state in ('MS', 'IL'));

alter table rcap_document_packets drop constraint if exists rcap_document_packets_document_type_check;
alter table rcap_document_packets add constraint rcap_document_packets_document_type_check check (
  document_type is null or document_type in (
    'mississippi_non_conviction_petition',
    'mississippi_misdemeanor_conviction_petition',
    'mississippi_felony_conviction_petition',
    'mississippi_certificate_of_service',
    'mississippi_proposed_order_placeholder',
    'illinois_request_to_expungeseal_packet',
    'illinois_case_list',
    'illinois_additional_arrests_expungement',
    'illinois_additional_arrests_sealing',
    'illinois_order_granting_placeholder',
    'illinois_order_denying_reference',
    'illinois_notice_of_filing_placeholder',
    'illinois_fee_waiver_instructions'
  )
);

alter table rcap_document_packets drop constraint if exists rcap_document_packets_pathway_check;
alter table rcap_document_packets add constraint rcap_document_packets_pathway_check check (
  pathway in (
    'non_conviction',
    'misdemeanor_conviction',
    'felony_conviction',
    'more_information_needed',
    'expungement_non_conviction',
    'expungement_supervision_or_qualified_probation',
    'sealing_conviction',
    'excluded_or_needs_review',
    'needs_rap_sheet'
  )
);

alter table rcap_document_packets add constraint rcap_document_packets_remedy_type_check check (
  remedy_type is null or remedy_type in ('expungement', 'sealing', 'needs_review')
);

alter table rcap_intake_sessions drop constraint if exists rcap_intake_sessions_eligibility_signal_check;
alter table rcap_intake_sessions add constraint rcap_intake_sessions_eligibility_signal_check check (
  eligibility_signal is null or eligibility_signal in (
    'possible_pathway',
    'possible_expungement_path',
    'possible_sealing_path',
    'needs_rap_sheet',
    'needs_more_information',
    'likely_not_available',
    'human_review_recommended',
    'excluded_or_blocked_review_needed',
    'future_eligibility_update'
  )
);

create index if not exists rcap_document_packets_state_pathway_idx on rcap_document_packets(state, pathway);
create index if not exists rcap_document_packets_remedy_type_idx on rcap_document_packets(remedy_type);

comment on column rcap_document_packets.date_of_birth_private_placeholder is 'Phase 19I does not collect DOB. Render [DOB TO BE ADDED BY PETITIONER IF REQUIRED] if needed.';
comment on table rcap_document_packets is 'RCAP document packet foundation for Mississippi and Illinois draft/preparation-aid packets. No SSN is collected.';
