begin;
alter table public.packet_render_jobs
  add column if not exists retry_reconciliation_history jsonb not null default '[]'::jsonb;
alter table public.packet_render_jobs
  add constraint packet_render_jobs_retry_history_array
  check (jsonb_typeof(retry_reconciliation_history) = 'array');


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


commit;