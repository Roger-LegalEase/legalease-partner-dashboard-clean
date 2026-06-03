-- Phase 20: DC RCAP record relief workflow.
-- Apply after Phase 19 and Phase 19I migrations.
-- DC uses source files in reference/dc:
-- - DC-Expungement-Sealing-Agent-Reference.pdf
-- - dc-motion-to-seal-expunge.html
-- No SSN is collected in this phase.

alter table rcap_document_packets drop constraint if exists rcap_document_packets_state_check;
alter table rcap_document_packets add constraint rcap_document_packets_state_check check (state in ('MS', 'IL', 'DC'));

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

create index if not exists rcap_document_packets_dc_pathway_idx on rcap_document_packets(state, pathway) where state = 'DC';

comment on table rcap_document_packets is 'RCAP document packet foundation for Mississippi, Illinois, and DC draft/preparation-aid packets. DC packets use motion pleadings and do not collect SSN.';
