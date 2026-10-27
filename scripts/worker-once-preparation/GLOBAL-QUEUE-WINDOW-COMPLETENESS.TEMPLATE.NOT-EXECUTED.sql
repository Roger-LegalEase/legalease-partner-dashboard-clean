-- SOURCE ONLY. Bind literal WINDOW_END from the Captain's actual bounded window; never execute this unbound template.
-- Complements existing aggregate a976 and queued-reason9c995; no RPC invocation or row payload.
BEGIN READ ONLY;
SET LOCAL statement_timeout='15s';
WITH boundary AS (SELECT '__WINDOW_END_UTC__'::timestamptz AS ends_at), jobs AS (
 SELECT status,renderer_kind,attempt_count,max_attempts,next_attempt_at,claim_expires_at,claimed_at,claimed_by,fencing_token,failure_disposition
 FROM public.packet_render_jobs
)
SELECT jsonb_build_object(
 'observedAt',now(),'readOnly',current_setting('transaction_read_only'),
 'validWindow', (SELECT isfinite(ends_at) AND ends_at>now() FROM boundary),
 'unknownOrNullStatus',count(*) FILTER(WHERE status IS NULL OR status NOT IN ('queued','claimed','rendering','validating','artifact_validated','delivered','failed')),
 'mutableMalformedAttemptBounds',count(*) FILTER(WHERE (status IN ('queued','claimed','rendering','validating') OR (status='failed' AND failure_disposition='retryable')) AND (attempt_count IS NULL OR max_attempts IS NULL OR attempt_count<0 OR max_attempts<=0 OR attempt_count>max_attempts)),
 'queuedFiniteFutureInsideWindow',count(*) FILTER(WHERE status='queued' AND isfinite(next_attempt_at) AND next_attempt_at>now() AND next_attempt_at<=(SELECT ends_at FROM boundary)),
 'queuedFiniteFutureBeyondWindow',count(*) FILTER(WHERE status='queued' AND isfinite(next_attempt_at) AND next_attempt_at>(SELECT ends_at FROM boundary)),
 'queuedPositiveInfinity',count(*) FILTER(WHERE status='queued' AND next_attempt_at='infinity'::timestamptz),
 'queuedNegativeInfinity',count(*) FILTER(WHERE status='queued' AND next_attempt_at='-infinity'::timestamptz),
 'activeMissingOrNonfiniteLease',count(*) FILTER(WHERE status IN ('claimed','rendering','validating') AND (claim_expires_at IS NULL OR NOT isfinite(claim_expires_at))),
 'activeMalformedClaimIdentity',count(*) FILTER(WHERE status IN ('claimed','rendering','validating') AND (claimed_at IS NULL OR NOT isfinite(claimed_at) OR claimed_at>now() OR nullif(claimed_by,'') IS NULL OR fencing_token IS NULL)),
 'nonterminalUnknownRenderer',count(*) FILTER(WHERE status IN ('queued','claimed','rendering','validating') AND (renderer_kind IS NULL OR renderer_kind NOT IN ('packet_document_v1','official_pdf_overlay_v1','xfa_static_variant_v1')))
) AS global_queue_window_completeness FROM jobs;
COMMIT;
