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
