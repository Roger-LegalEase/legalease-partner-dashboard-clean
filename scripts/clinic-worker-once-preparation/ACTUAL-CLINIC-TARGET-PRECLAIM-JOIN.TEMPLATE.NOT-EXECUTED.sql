-- SOURCE ONLY. Every placeholder must come from ONE actual normal clinic journey's protected receipts.
-- Fixed existing6765/E7 graph; dynamic job/packet/verification fields require actual protected receipts.
BEGIN READ ONLY;
SET LOCAL statement_timeout='15s';
WITH expected AS (
 SELECT '__ACTUAL_JOB_UUID__'::uuid job_id,'__ACTUAL_PACKET_UUID__'::uuid packet_id,
 '__ACTUAL_ITEM_UUID__'::uuid item_id,'__ACTUAL_OWNER_UUID__'::uuid owner_id,'__ACTUAL_SESSION_UUID__'::uuid session_id,
 '__ACTUAL_PERSON_UUID__'::uuid person_id,'__ACTUAL_MATTER_UUID__'::uuid matter_id,'__ACTUAL_ENTITLEMENT_UUID__'::uuid entitlement_id,
 '__ACTUAL_VERIFICATION_SHA256__'::text verification_hash,'__ACTUAL_INPUT_SHA256__'::text input_hash,
 'mvl-demo'::text slug,
 'MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal'::text route_key
), eligible AS (
 SELECT id,renderer_kind,row_number() OVER(ORDER BY created_at,id) rank_all_kinds
 FROM public.packet_render_jobs WHERE status='queued' AND attempt_count<max_attempts AND (next_attempt_at IS NULL OR next_attempt_at<=now())
), accepted_eligible AS (
 SELECT id,row_number() OVER(ORDER BY created_at,id) rank_accepted_renderer
 FROM public.packet_render_jobs WHERE status='queued' AND attempt_count<max_attempts AND (next_attempt_at IS NULL OR next_attempt_at<=now()) AND renderer_kind='packet_document_v1'
), exact_join AS (
 SELECT j.id FROM expected e
 JOIN public.packet_render_jobs j ON j.id=e.job_id AND j.packet_id=e.packet_id AND j.input_hash=e.input_hash
 AND j.person_id=e.person_id AND j.matter_id=e.matter_id AND j.renderer_kind='packet_document_v1' AND j.route_id=e.route_key AND j.sponsored_route_key=e.route_key
 AND j.sponsored_session_id=e.session_id AND j.sponsored_clinic_event_id='77000000-0000-4000-8000-000000000055'::uuid
 AND j.sponsored_consumer_briefcase_item_id=e.item_id AND j.sponsored_consumer_auth_user_id=e.owner_id AND j.sponsored_verification_hash=e.verification_hash
 JOIN public.rcap_document_packets p ON p.id=j.packet_id AND p.partner_slug='expungement-ai-consumer' AND p.user_id=e.owner_id AND p.briefcase_id=e.item_id AND p.person_id=e.person_id
 JOIN public.consumer_briefcase_items i ON i.id=e.item_id AND i.user_id=e.owner_id
 JOIN public.consumer_pending_screening_results s ON s.pending_id=i.source_pending_result_id
 AND s.status='CLAIMED' AND s.claimed_matter_id=i.id AND s.claimed_user_id=e.owner_id AND s.anonymous_session_id=e.session_id AND s.partner_slug=e.slug AND s.event_id='77000000-0000-4000-8000-000000000055'::uuid
 JOIN public.consumer_packet_verifications v ON v.briefcase_item_id=e.item_id AND v.consumer_auth_user_id=e.owner_id AND v.status='verified' AND v.verification_hash=e.verification_hash
 JOIN public.clinic_packet_funding f ON f.briefcase_item_id=e.item_id AND f.consumer_auth_user_id=e.owner_id AND f.source_session_id=e.session_id AND f.event_id='77000000-0000-4000-8000-000000000055'::uuid AND f.acquisition_mode='clinic' AND f.partner_slug=e.slug AND f.route_key=e.route_key AND f.funding_mode='sponsored' AND f.initial_verification_hash=e.verification_hash AND f.packet_entitlement_id=e.entitlement_id
 JOIN public.sponsored_packet_render_routes r ON r.route_key=e.route_key AND r.active AND r.jurisdiction='MS' AND r.packet_family_id=f.packet_family_id AND r.packet_specification_sha256='23426df251aa31bfd5215edbfe547d5f56c2349ed4c4bb5e7b407bc25405e126'
 JOIN public.clinic_cases cc ON cc.id='31b63a9d-7016-4b71-af1e-8b3426f142cc'::uuid AND cc.matter_id=e.item_id AND cc.participant_user_id=e.owner_id AND cc.screening_session_id=e.session_id AND cc.event_id=f.event_id
 JOIN public.clinic_events ce ON ce.id=f.event_id AND ce.partner_slug=e.slug
 JOIN public.partner_records pr ON pr.id=j.partner_id AND pr.partner_slug=e.slug
)
SELECT jsonb_build_object('observedAt',now(),'readOnly',current_setting('transaction_read_only'),
 'exactTargetJobCount',(SELECT count(*) FROM public.packet_render_jobs j JOIN expected e ON j.id=e.job_id),
 'exactAllBindingsJoinCount',(SELECT count(*) FROM exact_join),
 'globalEligibleAllKinds',(SELECT count(*) FROM eligible),
 'acceptedRendererEligible',(SELECT count(*) FROM accepted_eligible),
 'targetRankAllKinds',(SELECT rank_all_kinds FROM eligible q JOIN expected e ON q.id=e.job_id),
 'targetRankAcceptedRenderer',(SELECT rank_accepted_renderer FROM accepted_eligible q JOIN expected e ON q.id=e.job_id)
) AS actual_clinic_target_preclaim_binding;
COMMIT;
