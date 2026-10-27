-- SOURCE ONLY: bind solely from the actual protected paid-DTC receipt, never guessed IDs.
-- Same read-only join before and after once; queue rank is required only at preclaim.
BEGIN READ ONLY;
SET LOCAL statement_timeout='15s';
WITH expected AS (
 SELECT '__jobId__'::uuid job_id,'__packetId__'::uuid packet_id,'__itemId__'::uuid item_id,
 '__ownerId__'::uuid owner_id,'__personId__'::uuid person_id,'__matterId__'::uuid matter_id,
 '__verificationHash__'::text verification_hash,'__inputHash__'::text input_hash,
 '__checkoutSessionId__'::text checkout_session_id,'__paymentIntentId__'::text payment_intent_id,
 '__providerEventId__'::text provider_event_id,'__routeKey__'::text route_key,
 '__packetFamilyId__'::text packet_family_id,'__specificationId__'::text specification_id,
 '__specificationVersion__'::text specification_version,
 '__packetSpecificationSha256__'::text specification_sha256,
 '__packetSpecificationFileSha256__'::text specification_file_sha256
), eligible AS (
 SELECT id,row_number() OVER(ORDER BY created_at,id) rank_all_kinds
 FROM public.packet_render_jobs WHERE status='queued' AND attempt_count<max_attempts
 AND (next_attempt_at IS NULL OR next_attempt_at<=now())
), accepted_eligible AS (
 SELECT id,row_number() OVER(ORDER BY created_at,id) rank_accepted_renderer
 FROM public.packet_render_jobs WHERE status='queued' AND attempt_count<max_attempts
 AND (next_attempt_at IS NULL OR next_attempt_at<=now()) AND renderer_kind='packet_document_v1'
), paid_authority AS (
 SELECT b.id FROM expected e JOIN public.consumer_briefcase_items b ON b.id=e.item_id AND b.user_id=e.owner_id
 AND b.payment_status='paid' AND b.payment_authority='server_webhook'
 AND b.amount_cents=5000 AND b.regular_price_cents=5000 AND b.discount_cents=0 AND b.currency='usd'
 AND b.checkout_session_id=e.checkout_session_id AND b.payment_intent_id=e.payment_intent_id
 AND b.provider_event_id=e.provider_event_id AND b.payment_person_id=e.person_id
 AND b.payment_matter_id=e.matter_id AND b.payment_product_id='expungement_packet'
 AND e.matter_id=public.consumer_matter_id_for_briefcase_item(b.id)
 AND NOT EXISTS(SELECT 1 FROM public.clinic_packet_funding f WHERE f.briefcase_item_id=b.id AND f.funding_mode='sponsored')
 JOIN public.processed_stripe_events ev ON ev.stripe_event_id=e.provider_event_id
 AND ev.event_type='checkout.session.completed' AND ev.related_object_id=e.checkout_session_id
 CROSS JOIN LATERAL public.consumer_packet_payment_authority(b.id,b.user_id,'expungement_packet',e.person_id,e.matter_id) a
 WHERE a.valid AND a.provider_event_id=e.provider_event_id
), protected_input AS (
 SELECT p.id FROM expected e
 JOIN public.rcap_document_packets p ON p.id=e.packet_id AND p.partner_slug='expungement-ai-consumer'
 AND p.user_id=e.owner_id AND p.briefcase_id=e.item_id AND p.person_id=e.person_id
 JOIN public.consumer_packet_verifications v ON v.briefcase_item_id=e.item_id AND v.consumer_auth_user_id=e.owner_id
 AND v.matter_id=e.matter_id AND v.status='verified' AND v.revision=8 AND v.verification_hash=e.verification_hash
 AND v.verification_snapshot->>'schemaVersion'='expungement-ai/final-verification/v1'
 AND v.verification_snapshot->>'jurisdiction'='MS'
 AND ('MS:'||(v.verification_snapshot->>'pathwayId'))=e.route_key
 JOIN public.rcap_document_packet_inputs i ON i.document_packet_id=p.id AND i.partner_slug='expungement-ai-consumer'
 AND i.input_payload->>'schemaVersion'='rcap-personalized-render/v1'
 AND i.input_payload->>'authUserId'=e.owner_id::text AND i.input_payload->>'briefcaseItemId'=e.item_id::text
 AND i.input_payload->>'personId'=e.person_id::text AND i.input_payload->>'matterId'=e.matter_id::text
 AND i.input_payload->>'verificationHash'=e.verification_hash AND i.input_payload->>'inputHash'=e.input_hash
 AND i.input_payload->>'routeId'=e.route_key AND i.input_payload->>'packetFamilyId'=e.packet_family_id
 AND i.input_payload->>'specificationId'=e.specification_id AND i.input_payload->>'specificationVersion'=e.specification_version
 AND i.input_payload->>'specificationSha256'=e.specification_sha256
 AND i.input_payload->>'specificationFileSha256'=e.specification_file_sha256
 AND i.input_payload->'snapshot'=v.verification_snapshot
), exact_join AS (
 SELECT j.id FROM expected e JOIN public.packet_render_jobs j ON j.id=e.job_id AND j.packet_id=e.packet_id
 AND j.input_hash=e.input_hash AND j.consumer_briefcase_item_id=e.item_id AND j.consumer_auth_user_id=e.owner_id
 AND j.briefcase_item_id=e.item_id AND j.person_id=e.person_id AND j.matter_id=e.matter_id
 AND j.consumer_verification_hash=e.verification_hash AND j.route_id=e.route_key
 AND j.partner_id IS NULL AND j.renderer_kind='packet_document_v1'
 JOIN paid_authority a ON a.id=e.item_id JOIN protected_input p ON p.id=e.packet_id
)
SELECT jsonb_build_object('observedAt',now(),'readOnly',current_setting('transaction_read_only'),
 'exactTargetJobCount',(SELECT count(*) FROM public.packet_render_jobs j JOIN expected e ON j.id=e.job_id),
 'exactAllBindingsJoinCount',(SELECT count(*) FROM exact_join),
 'exactPaidAuthorityCount',(SELECT count(*) FROM paid_authority),
 'exactProtectedInputCount',(SELECT count(*) FROM protected_input),
 'globalEligibleAllKinds',(SELECT count(*) FROM eligible),
 'acceptedRendererEligible',(SELECT count(*) FROM accepted_eligible),
 'targetRankAllKinds',(SELECT rank_all_kinds FROM eligible q JOIN expected e ON q.id=e.job_id),
 'targetRankAcceptedRenderer',(SELECT rank_accepted_renderer FROM accepted_eligible q JOIN expected e ON q.id=e.job_id)
) AS actual_paid_dtc_target_binding;
COMMIT;
