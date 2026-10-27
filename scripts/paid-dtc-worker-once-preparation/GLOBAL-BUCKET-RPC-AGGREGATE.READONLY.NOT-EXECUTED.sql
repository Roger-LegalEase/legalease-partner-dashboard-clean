BEGIN READ ONLY;
SET LOCAL statement_timeout='15s';
WITH jobs AS (
 SELECT id,packet_id,input_hash,status,renderer_kind,attempt_count,max_attempts,next_attempt_at,claim_expires_at,created_at,failure_disposition,
   CASE WHEN status IN ('queued','claimed','rendering','validating','artifact_validated','delivered','failed') THEN status ELSE '[other_status]' END AS status_category,
   CASE WHEN renderer_kind IN ('packet_document_v1','official_pdf_overlay_v1','xfa_static_variant_v1') THEN renderer_kind ELSE '[other_renderer]' END AS renderer_category
 FROM public.packet_render_jobs
), retry_candidates AS (
 SELECT id,row_number() OVER(PARTITION BY packet_id,input_hash ORDER BY created_at,id) AS candidate_order
 FROM jobs WHERE status='failed' AND failure_disposition='retryable' AND attempt_count<max_attempts AND next_attempt_at IS NOT NULL AND isfinite(next_attempt_at)
), annotated AS (
 SELECT j.*,
   status='queued' AND attempt_count<max_attempts AND (next_attempt_at IS NULL OR next_attempt_at<=now()) AS eligible_now,
   (status IN ('claimed','rendering','validating') AND claim_expires_at IS NOT NULL AND claim_expires_at<now()) AS expired_claim,
   (status='queued' AND attempt_count>=max_attempts) AS queued_at_attempt_limit,
   (status='failed' AND failure_disposition='retryable') AS retryable,
   (r.candidate_order=1 AND j.next_attempt_at<=now() AND NOT EXISTS(SELECT 1 FROM jobs live WHERE live.packet_id=j.packet_id AND live.input_hash=j.input_hash AND live.status<>'failed')) AS canonical_retry_due_no_live_sibling
 FROM jobs j LEFT JOIN retry_candidates r ON r.id=j.id
), grouped AS (
 SELECT status_category,renderer_category,count(*) AS rows,
   count(*) FILTER(WHERE eligible_now) AS eligible_now,
   count(*) FILTER(WHERE queued_at_attempt_limit) AS queued_at_attempt_limit,
   count(*) FILTER(WHERE expired_claim) AS expired_claims,
   count(*) FILTER(WHERE retryable) AS retryable,
   count(*) FILTER(WHERE canonical_retry_due_no_live_sibling) AS canonical_retry_due_no_live_sibling,
   count(*) FILTER(WHERE status IN ('claimed','rendering','validating') AND claim_expires_at>=now()) AS live_claims,
   count(*) FILTER(WHERE status IN ('claimed','rendering','validating') AND claim_expires_at IS NULL) AS active_without_lease,
   count(*) FILTER(WHERE queued_at_attempt_limit OR expired_claim OR retryable) AS housekeeping_scope
 FROM annotated GROUP BY status_category,renderer_category
)
SELECT jsonb_build_object(
 'observedAt',now(),'executionContext',jsonb_build_object('current_user',current_user,'session_user',session_user,'transaction_read_only',current_setting('transaction_read_only')),
 'bucket',(SELECT jsonb_build_object('id','rcap-packet-artifacts-private','matchingRows',count(*),'nonpublicRows',count(*) FILTER(WHERE public=false),'publicRows',count(*) FILTER(WHERE public=true),'privateExactlyOnce',count(*)=1 AND count(*) FILTER(WHERE public=false)=1) FROM storage.buckets WHERE id='rcap-packet-artifacts-private'),
 'aggregate',(SELECT jsonb_build_object('totalRows',count(*),'eligibleAnyRenderer',count(*) FILTER(WHERE eligible_now),'eligibleAcceptedWorkerRenderer',count(*) FILTER(WHERE eligible_now AND renderer_kind='packet_document_v1'),'queuedAtAttemptLimitAnyRenderer',count(*) FILTER(WHERE queued_at_attempt_limit),'expiredClaimsAnyRenderer',count(*) FILTER(WHERE expired_claim),'failedRetryableAnyRenderer',count(*) FILTER(WHERE retryable),'canonicalRetryDueNoLiveSiblingAnyRenderer',count(*) FILTER(WHERE canonical_retry_due_no_live_sibling),'historicalHousekeepingScopeAnyRenderer',count(*) FILTER(WHERE queued_at_attempt_limit OR expired_claim OR retryable),'liveClaimsAnyRenderer',count(*) FILTER(WHERE status IN ('claimed','rendering','validating') AND claim_expires_at>=now()),'activeWithoutLeaseAnyRenderer',count(*) FILTER(WHERE status IN ('claimed','rendering','validating') AND claim_expires_at IS NULL)) FROM annotated),
 'byStatusAndRenderer',(SELECT coalesce(jsonb_agg(to_jsonb(g) ORDER BY status_category,renderer_category),'[]') FROM grouped g),
 'currentQueueRpcBodies',(SELECT jsonb_agg(jsonb_build_object('name',p.proname,'args',pg_get_function_identity_arguments(p.oid),'prosrcSha256',encode(extensions.digest(convert_to(p.prosrc,'utf8'),'sha256'),'hex'))) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname IN ('claim_packet_render_job','release_expired_packet_render_claims','requeue_retryable_packet_render_jobs'))
) AS private_bucket_and_queue_snapshot;
COMMIT;
