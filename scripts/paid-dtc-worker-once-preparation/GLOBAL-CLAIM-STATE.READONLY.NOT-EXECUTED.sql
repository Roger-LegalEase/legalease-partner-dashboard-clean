-- SOURCE ONLY: fold into the ALREADY REQUIRED full pre/post readonly snapshot port.
-- Global queue identity/lifecycle only; no participant facts or raw fencing token.
BEGIN READ ONLY;
SET LOCAL statement_timeout='15s';
SELECT id,status,attempt_count,max_attempts,claimed_by,claimed_at,claim_expires_at,
 next_attempt_at::text AS next_attempt_at,error_code,failure_disposition,
 rendering_at,validating_at,artifact_validated_at,
 encode(sha256(convert_to(coalesce(fencing_token::text,''),'UTF8')),'hex') AS "fencingTokenSha256"
FROM public.packet_render_jobs ORDER BY id;
COMMIT;
