-- A destructive account-deletion failure is not an ordinary failed request.
-- Once any ordered step has completed, the durable request must say that work
-- is partial and resumable without claiming completion. This migration changes
-- only that workflow vocabulary and its existing step-recorder transition.

alter table public.participant_privacy_requests
  drop constraint if exists participant_privacy_requests_status_check;

alter table public.participant_privacy_requests
  add constraint participant_privacy_requests_status_check check (
    status in (
      'pending',
      'in_progress',
      'partially_completed',
      'completed',
      'failed',
      'blocked_legal_hold',
      'cancelled'
    )
  );

-- A partially completed account deletion is still live. The original indexes
-- predate that status, so rebuild both predicates in place: the unique index
-- remains account-deletion-only and the resumable index does not make the new
-- status meaningful for any other privacy-request type.
drop index if exists public.participant_privacy_requests_live_account_deletion_uk;
create unique index participant_privacy_requests_live_account_deletion_uk
  on public.participant_privacy_requests(user_id)
  where request_type = 'account_deletion'
    and status in ('pending', 'in_progress', 'partially_completed');

drop index if exists public.participant_privacy_requests_resumable_idx;
create index participant_privacy_requests_resumable_idx
  on public.participant_privacy_requests(status, requested_at)
  where status in ('pending', 'in_progress')
     or (request_type = 'account_deletion' and status = 'partially_completed');

-- Preserve the exact-idempotency behavior for every request type. Account
-- deletion gets one additional rule: a new recent-auth proof and idempotency
-- key resume the one live ledger instead of opening a second ledger beside a
-- partially destructive request. The transaction advisory lock closes the
-- first-open race before the unique index has a row to protect.
create or replace function public.open_participant_privacy_request(
  p_user_id uuid,
  p_request_type text,
  p_idempotency_key text,
  p_subject_pseudonym text,
  p_recent_auth_verified_at timestamptz,
  p_recent_auth_method text,
  p_recent_auth_proof_hash text,
  p_target_matter_item_id uuid,
  p_step_keys text[]
)
returns public.participant_privacy_requests
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.participant_privacy_requests;
  v_key text;
  v_index integer := 0;
begin
  if p_user_id is null then
    raise exception 'a privacy request requires an owner';
  end if;

  select * into v_request
  from public.participant_privacy_requests
  where user_id = p_user_id
    and request_type = p_request_type
    and idempotency_key = p_idempotency_key;

  if v_request.id is null and p_request_type = 'account_deletion' then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended('participant-account-deletion:' || p_user_id::text, 0)
    );

    -- The lock may have waited behind the transaction that opened this exact
    -- request, so repeat the idempotency lookup before looking for another key.
    select * into v_request
    from public.participant_privacy_requests
    where user_id = p_user_id
      and request_type = p_request_type
      and idempotency_key = p_idempotency_key;

    if v_request.id is null then
      select * into v_request
      from public.participant_privacy_requests
      where user_id = p_user_id
        and request_type = 'account_deletion'
        and status in ('pending', 'in_progress', 'partially_completed')
      order by requested_at, id
      limit 1
      for update;

      if v_request.id is not null then
        update public.participant_privacy_requests
        set recent_auth_verified_at = p_recent_auth_verified_at,
            recent_auth_method = p_recent_auth_method,
            recent_auth_proof_hash = p_recent_auth_proof_hash,
            attempt_count = attempt_count + 1,
            updated_at = now()
        where id = v_request.id
        returning * into v_request;
      end if;
    end if;
  end if;

  if v_request.id is null then
    insert into public.participant_privacy_requests (
      user_id, subject_pseudonym, request_type, idempotency_key, status,
      recent_auth_verified_at, recent_auth_method, recent_auth_proof_hash,
      target_matter_item_id
    ) values (
      p_user_id, p_subject_pseudonym, p_request_type, p_idempotency_key, 'pending',
      p_recent_auth_verified_at, p_recent_auth_method, p_recent_auth_proof_hash,
      p_target_matter_item_id
    )
    returning * into v_request;
  end if;

  if p_step_keys is not null then
    foreach v_key in array p_step_keys loop
      v_index := v_index + 1;
      insert into public.participant_privacy_request_steps (request_id, step_key, step_order)
      values (v_request.id, v_key, v_index)
      on conflict (request_id, step_key) do nothing;
    end loop;
  end if;

  return v_request;
end;
$$;

create or replace function public.record_participant_privacy_step(
  p_request_id uuid,
  p_step_key text,
  p_status text,
  p_detail jsonb,
  p_error text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_has_completed_step boolean;
begin
  update public.participant_privacy_request_steps
  set status = p_status,
      started_at = coalesce(started_at, now()),
      completed_at = case when p_status in ('completed', 'skipped') then now() else completed_at end,
      attempt_count = attempt_count + 1,
      detail = coalesce(p_detail, detail),
      error = p_error,
      updated_at = now()
  where request_id = p_request_id
    and step_key = p_step_key;

  select exists (
    select 1
    from public.participant_privacy_request_steps
    where request_id = p_request_id
      and status in ('completed', 'skipped')
  ) into v_has_completed_step;

  update public.participant_privacy_requests
  set status = case
        when p_status = 'failed' and v_has_completed_step then 'partially_completed'
        when p_status = 'failed' then 'failed'
        when status in ('pending', 'failed', 'partially_completed') then 'in_progress'
        else status
      end,
      failure_code = case when p_status = 'failed' then p_step_key else failure_code end,
      last_error = case when p_status = 'failed' then p_error else last_error end,
      updated_at = now()
  where id = p_request_id;
end;
$$;

revoke all on function public.record_participant_privacy_step(uuid, text, text, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.record_participant_privacy_step(uuid, text, text, jsonb, text)
  to service_role;

revoke all on function public.open_participant_privacy_request(
  uuid, text, text, text, timestamptz, text, text, uuid, text[]
) from public, anon, authenticated;
grant execute on function public.open_participant_privacy_request(
  uuid, text, text, text, timestamptz, text, text, uuid, text[]
) to service_role;

-- Exact application/database handshake for this contract. A table probe or a
-- generic recorder call can pass on the immediately preceding schema, so the
-- service role must receive this exact version before deletion can begin.
create or replace function public.participant_account_deletion_contract_version()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select '20260901180000.partial-deletion.v2'::text
$$;

comment on function public.participant_account_deletion_contract_version() is
  'Service-role capability handshake for resumable partial account deletion contract 20260901180000.partial-deletion.v2.';

revoke all on function public.participant_account_deletion_contract_version()
  from public, anon, authenticated;
grant execute on function public.participant_account_deletion_contract_version()
  to service_role;
