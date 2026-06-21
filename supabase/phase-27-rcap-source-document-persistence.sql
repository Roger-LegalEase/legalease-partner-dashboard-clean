-- Phase 27: durable RCAP source-driven document packet persistence.
-- Apply after Phase 19, Phase 19I, and Phase 20.
-- This does not change packet generation behavior; it only permits the existing
-- source-driven packet records to be stored for reporting and audit use.

alter table rcap_document_packets drop constraint if exists rcap_document_packets_state_check;
alter table rcap_document_packets add constraint rcap_document_packets_state_check check (state in ('MS', 'IL', 'DC', 'PA', 'TX'));

alter table rcap_document_packets drop constraint if exists rcap_document_packets_document_type_check;
alter table rcap_document_packets add constraint rcap_document_packets_document_type_check check (
  document_type is null or document_type in (
    'source_driven_packet',
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
    'illinois_fee_waiver_instructions',
    'dc_motion_to_seal',
    'dc_motion_to_expunge',
    'dc_statement_of_points_and_authorities',
    'dc_proposed_order',
    'dc_certificate_of_service',
    'dc_filing_instructions'
  )
);

alter table rcap_document_packets drop constraint if exists rcap_document_packets_pathway_check;
alter table rcap_document_packets add constraint rcap_document_packets_pathway_check check (
  pathway in (
    'source_engine_packet_plan',
    'non_conviction',
    'misdemeanor_conviction',
    'felony_conviction',
    'more_information_needed',
    'expungement_non_conviction',
    'expungement_supervision_or_qualified_probation',
    'sealing_conviction',
    'excluded_or_needs_review',
    'needs_rap_sheet',
    'automatic_expungement',
    'automatic_sealing',
    'motion_actual_innocence_expungement',
    'motion_interests_of_justice_sealing',
    'needs_review'
  )
);

create index if not exists rcap_document_packets_source_state_idx
  on rcap_document_packets(state, created_at)
  where document_type = 'source_driven_packet';

comment on table rcap_document_packets is
  'RCAP document packet foundation for durable source-driven draft/preparation-aid packets. No SSN is collected by this persistence layer.';
