-- Forward correction for hosted #345. No historical migration is rewritten.
-- The unique live (packet_id,input_hash) index remains the final concurrency authority.
-- Retry siblings are retained: existing live wins, otherwise earliest (created_at,id).
-- Superseded retries and exhausted claims become terminal history. Nothing is deleted.
-- Every housekeeping change appends its prior lifecycle fields to the same row.
begin;

alter table public.packet_render_jobs
  add column if not exists retry_reconciliation_history jsonb not null default '[]'::jsonb;
alter table public.packet_render_jobs
  add constraint packet_render_jobs_retry_history_array
  check (jsonb_typeof(retry_reconciliation_history) = 'array');

-- Union of the accepted worker's RenderErrorCode and queue.fail producers,
-- historical renderer/storage/timeout codes, and participant cancellation.
-- scripts/rcap-packet-database-contract.test.mjs derives and persists this union.
alter table public.packet_render_jobs drop constraint packet_render_jobs_error_code_check;
alter table public.packet_render_jobs add constraint packet_render_jobs_error_code_check check (
  error_code is null or error_code in (
    'source_not_whitelisted', 'profile_unknown', 'render_failed',
    'invalid_pdf_output', 'page_count_mismatch', 'protected_field_populated',
    'storage_write_failed', 'storage_readback_failed', 'checksum_mismatch',
    'timeout', 'worker_crashed', 'participant_deletion_cancelled',
    'output_empty', 'output_not_pdf', 'output_unparseable', 'output_no_pages',
    'output_geometry_unexpected', 'unknown_job', 'job_not_claimable',
    'renderer_kind_unknown', 'source_sha_not_allowed', 'profile_version_unknown',
    'container_digest_missing'
  )
);

-- Complete the explicitly intended post-Phase-50 removals. No CASCADE.
drop function if exists public.claim_packet_render_job(text, text[]);
drop function if exists public.consume_rcap_packet_credit(text, text, uuid);
drop trigger if exists packet_render_jobs_guard_transition on public.packet_render_jobs;
drop function if exists public.packet_render_jobs_guard_transition();
drop policy if exists packet_render_jobs_service_role_all on public.packet_render_jobs;
-- Phase 50 removed these empty obsolete accounting tables. Refuse rather
-- than delete evidence if a different database contains historical rows.
do $$
declare v_table text; v_nonempty boolean;
begin
  foreach v_table in array array['rcap_packet_credit_consumptions', 'rcap_partner_packet_allocation'] loop
    if to_regclass('public.' || v_table) is not null then
      execute format('lock table public.%I in access exclusive mode', v_table);
      execute format('select exists(select 1 from public.%I)', v_table) into v_nonempty;
      if v_nonempty then raise exception 'refusing to remove nonempty obsolete table %', v_table; end if;
      execute format('drop table public.%I', v_table);
    end if;
  end loop;
end;
$$;

create function public.guard_packet_render_job_retry_history()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.retry_reconciliation_history is distinct from old.retry_reconciliation_history then
    if public.rcap_packet_mutation_authority() not in (
      'release_expired_packet_render_claims', 'requeue_retryable_packet_render_jobs'
    ) or jsonb_array_length(new.retry_reconciliation_history) <> jsonb_array_length(old.retry_reconciliation_history) + 1
      or new.retry_reconciliation_history - (jsonb_array_length(new.retry_reconciliation_history) - 1) <> old.retry_reconciliation_history then
      raise exception 'packet_render_jobs: retry history is appended only by canonical housekeeping';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.guard_packet_render_job_retry_history() from public, anon, authenticated, service_role, rcap_render_worker, rcap_packet_delivery;
create trigger guard_packet_render_job_retry_history before update on public.packet_render_jobs
for each row execute function public.guard_packet_render_job_retry_history();

create or replace function public.claim_packet_render_job(
  p_worker_id text,
  p_renderer_kinds text[],
  p_claim_seconds integer default 600
)
returns table (
  id uuid,
  packet_id uuid,
  route_id text,
  renderer_kind text,
  renderer_version text,
  source_sha256 text,
  profile_id text,
  profile_version text,
  input_hash text,
  attempt_count integer,
  max_attempts integer,
  partner_id uuid,
  person_id uuid,
  matter_id uuid,
  fencing_token uuid,
  claim_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_worker_id text;
  v_job_id uuid;
  v_token uuid;
begin
  v_worker_id := nullif(trim(p_worker_id), '');
  if v_worker_id is null then
    raise exception 'a worker id is required to claim a job';
  end if;
  if p_claim_seconds is null or p_claim_seconds < 30 or p_claim_seconds > 3600 then
    raise exception 'claim seconds must be between 30 and 3600';
  end if;

  select j.id into v_job_id
  from public.packet_render_jobs j
  where j.status = 'queued'
    and j.attempt_count < j.max_attempts
    and (j.next_attempt_at is null or j.next_attempt_at <= now())
    and (p_renderer_kinds is null or j.renderer_kind = any (p_renderer_kinds))
  order by j.created_at, j.id
  for update skip locked
  limit 1;

  if v_job_id is null then
    return;
  end if;

  v_token := gen_random_uuid();
  perform set_config('rcap.packet_mutation_authority', 'claim_packet_render_job', true);
  return query
  update public.packet_render_jobs j
  set status = 'claimed',
      claimed_by = v_worker_id,
      claim_expires_at = now() + make_interval(secs => p_claim_seconds),
      fencing_token = v_token,
      attempt_count = j.attempt_count + 1
  where j.id = v_job_id
  returning j.id, j.packet_id, j.route_id, j.renderer_kind, j.renderer_version,
            j.source_sha256, j.profile_id, j.profile_version, j.input_hash,
            j.attempt_count, j.max_attempts, j.partner_id, j.person_id, j.matter_id,
            j.fencing_token, j.claim_expires_at;
  perform set_config('rcap.packet_mutation_authority', '', true);
end;
$$;


create or replace function public.release_expired_packet_render_claims()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_count integer;
begin
  perform set_config('rcap.packet_mutation_authority', 'release_expired_packet_render_claims', true);
  update public.packet_render_jobs j
  set retry_reconciliation_history = j.retry_reconciliation_history || jsonb_build_array(jsonb_build_object(
        'authority', 'release_expired_packet_render_claims', 'at', now(),
        'reason', case when j.attempt_count >= j.max_attempts then 'attempt_limit_reached' else 'lease_expired' end,
        'prior_status', j.status, 'prior_failure_disposition', j.failure_disposition,
        'prior_error_code', j.error_code, 'attempt_count', j.attempt_count,
        'max_attempts', j.max_attempts, 'next_attempt_at', j.next_attempt_at,
        'claim_expires_at', j.claim_expires_at, 'claimed_by', j.claimed_by, 'claimed_at', j.claimed_at)),
      status = case when j.status = 'claimed' and j.attempt_count < j.max_attempts then 'queued' else 'failed' end,
      failure_disposition = case
        when j.status = 'claimed' and j.attempt_count < j.max_attempts then null
        when j.attempt_count < j.max_attempts then 'retryable' else 'terminal' end,
      error_code = case when j.status = 'claimed' and j.attempt_count < j.max_attempts then j.error_code
                        else coalesce(j.error_code, 'timeout') end,
      last_error_detail = coalesce(j.last_error_detail,
        case when j.attempt_count >= j.max_attempts then 'attempt limit reached during lease housekeeping'
             else 'claim lease expired before the worker finished' end),
      next_attempt_at = case
        when j.attempt_count >= j.max_attempts then null
        when j.status = 'claimed' then j.next_attempt_at
        else now() + make_interval(secs => least(3600, 30 * power(2, j.attempt_count))::integer) end,
      claim_expires_at = null,
      fencing_token = null
  where (j.status in ('claimed', 'rendering', 'validating')
         and j.claim_expires_at is not null and j.claim_expires_at < now())
     or (j.status = 'queued' and j.attempt_count >= j.max_attempts);
  get diagnostics v_count = row_count;
  perform set_config('rcap.packet_mutation_authority', '', true);
  return v_count;
end;
$$;

create or replace function public.requeue_retryable_packet_render_jobs()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_key record;
  v_job public.packet_render_jobs%rowtype;
  v_winner uuid;
  v_live uuid;
  v_reason text;
  v_constraint text;
  v_sqlstate text;
  v_count integer := 0;
begin
  perform set_config('rcap.packet_mutation_authority', 'requeue_retryable_packet_render_jobs', true);
  for v_key in
    select distinct packet_id, input_hash from public.packet_render_jobs
    where status = 'failed' and failure_disposition = 'retryable'
    order by packet_id, input_hash
  loop
    -- Housekeepers serialize by logical input, not the whole queue. A busy input
    -- does not block unrelated inputs. The unique index also arbitrates enqueue.
    if not pg_try_advisory_xact_lock(hashtextextended(v_key.packet_id::text || ':' || v_key.input_hash, 0)) then
      continue;
    end if;
    select id into v_live from public.packet_render_jobs
    where packet_id = v_key.packet_id and input_hash = v_key.input_hash and status <> 'failed';
    select id into v_winner from public.packet_render_jobs
    where packet_id = v_key.packet_id and input_hash = v_key.input_hash
      and status = 'failed' and failure_disposition = 'retryable' and attempt_count < max_attempts
      and next_attempt_at is not null and isfinite(next_attempt_at)
    order by created_at, id limit 1;

    for v_job in
      select * from public.packet_render_jobs
      where packet_id = v_key.packet_id and input_hash = v_key.input_hash
        and status = 'failed' and failure_disposition = 'retryable'
      order by created_at, id for update
    loop
      begin
      v_sqlstate := null;
      v_constraint := null;
      v_reason := case
        when v_job.attempt_count >= v_job.max_attempts then 'attempt_limit_reached'
        when v_live is not null then 'live_sibling_exists'
        when v_job.next_attempt_at is null or not isfinite(v_job.next_attempt_at) then 'canonical_retry_time_missing'
        when v_job.id is distinct from v_winner then 'duplicate_retry_superseded'
        else null end;
      if v_reason is null and v_job.next_attempt_at <= now() then
        begin
          update public.packet_render_jobs j
          set status = 'queued', failure_disposition = null,
              retry_reconciliation_history = j.retry_reconciliation_history || jsonb_build_array(jsonb_build_object(
                'authority', 'requeue_retryable_packet_render_jobs', 'at', now(), 'reason', 'canonical_retry_due',
                'prior_status', j.status, 'prior_failure_disposition', j.failure_disposition,
                'prior_error_code', j.error_code, 'attempt_count', j.attempt_count,
                'max_attempts', j.max_attempts, 'next_attempt_at', j.next_attempt_at,
                'claimed_by', j.claimed_by, 'claimed_at', j.claimed_at))
          where j.id = v_job.id;
          v_count := v_count + 1;
          v_live := v_job.id;
        exception when others then
          get stacked diagnostics v_constraint = constraint_name, v_sqlstate = returned_sqlstate;
          if v_sqlstate = '23505' and v_constraint = 'packet_render_jobs_input_hash_live_unique' then
            -- A concurrent enqueue won. Only this row's attempted requeue is
            -- rolled back; other logical inputs still make progress.
            select id into v_live from public.packet_render_jobs
            where packet_id = v_key.packet_id and input_hash = v_key.input_hash and status <> 'failed';
            v_reason := 'concurrent_live_sibling_won';
          else
            -- A row-local guard/constraint refusal cannot roll back unrelated
            -- retries. Keep the original error and record only safe SQL metadata.
            v_reason := 'requeue_rejected';
          end if;
        end;
      end if;
      if v_reason is not null then
        update public.packet_render_jobs j
        set failure_disposition = 'terminal', next_attempt_at = null,
            retry_reconciliation_history = j.retry_reconciliation_history || jsonb_build_array(jsonb_build_object(
              'authority', 'requeue_retryable_packet_render_jobs', 'at', now(), 'reason', v_reason,
              'canonical_job_id', coalesce(v_live, v_winner),
              'requeue_sqlstate', v_sqlstate, 'requeue_constraint', v_constraint,
              'prior_status', j.status, 'prior_failure_disposition', j.failure_disposition,
              'prior_error_code', j.error_code, 'attempt_count', j.attempt_count,
              'max_attempts', j.max_attempts, 'next_attempt_at', j.next_attempt_at,
                'claimed_by', j.claimed_by, 'claimed_at', j.claimed_at))
        where j.id = v_job.id;
      end if;
      exception when others then
        -- Even a broken historical row that refuses terminal bookkeeping must
        -- not undo another input's retry. It remains failed/nonclaimable; the
        -- warning names the row and SQLSTATE, never participant/error prose.
        raise warning 'retry reconciliation refused for job %, SQLSTATE %; historical row retained', v_job.id, SQLSTATE;
      end;
    end loop;
  end loop;
  perform set_config('rcap.packet_mutation_authority', '', true);
  return v_count;
end;
$$;

-- Explicitly restore the intended role separation on every worker mutation,
-- including unchanged fenced start/fail/finalize functions. No browser grant.
do $$
declare v_fn text;
begin
  foreach v_fn in array array[
    'public.claim_packet_render_job(text,text[],integer)',
    'public.start_packet_render(uuid,uuid)',
    'public.start_packet_validation(uuid,uuid)',
    'public.fail_packet_render_job(uuid,uuid,text,text,boolean)',
    'public.finalize_packet_render_job(uuid,uuid,text,text,text,text,text,integer,integer,text)',
    'public.release_expired_packet_render_claims()',
    'public.requeue_retryable_packet_render_jobs()'
  ] loop
    execute format('revoke all on function %s from public, anon, authenticated, rcap_packet_delivery', v_fn);
    execute format('grant execute on function %s to service_role, rcap_render_worker', v_fn);
  end loop;
end;
$$;

comment on column public.packet_render_jobs.retry_reconciliation_history is
  'Append-only lifecycle snapshots written by canonical retry/lease housekeeping; original job, attempt, error and artifact evidence are retained. No new payment or job authority.';
commit;
