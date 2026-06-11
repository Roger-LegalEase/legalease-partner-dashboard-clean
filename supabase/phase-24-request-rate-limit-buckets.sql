create table if not exists public.request_rate_limit_buckets (
  scope text not null,
  bucket_key text not null,
  window_start timestamptz not null,
  window_seconds integer not null,
  count integer not null default 0,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope, bucket_key, window_start)
);

create index if not exists request_rate_limit_buckets_expires_at_idx
  on public.request_rate_limit_buckets (expires_at);

create index if not exists request_rate_limit_buckets_scope_bucket_window_idx
  on public.request_rate_limit_buckets (scope, bucket_key, window_start);

alter table public.request_rate_limit_buckets enable row level security;

create or replace function public.increment_request_rate_limit_bucket(
  p_scope text,
  p_bucket_key text,
  p_window_start timestamptz,
  p_window_seconds integer,
  p_limit integer
)
returns table (
  allowed boolean,
  count integer,
  remaining integer,
  reset_at timestamptz
)
language plpgsql
as $$
declare
  v_count integer;
  v_reset_at timestamptz;
begin
  if p_scope is null or length(trim(p_scope)) = 0 then
    raise exception 'rate limit scope is required';
  end if;

  if p_bucket_key is null or length(trim(p_bucket_key)) = 0 then
    raise exception 'rate limit bucket key is required';
  end if;

  if p_window_seconds is null or p_window_seconds <= 0 then
    raise exception 'rate limit window must be positive';
  end if;

  if p_limit is null or p_limit <= 0 then
    raise exception 'rate limit must be positive';
  end if;

  v_reset_at := p_window_start + make_interval(secs => p_window_seconds);

  delete from public.request_rate_limit_buckets
  where expires_at < now();

  insert into public.request_rate_limit_buckets (
    scope,
    bucket_key,
    window_start,
    window_seconds,
    count,
    expires_at
  )
  values (
    p_scope,
    p_bucket_key,
    p_window_start,
    p_window_seconds,
    1,
    v_reset_at
  )
  on conflict (scope, bucket_key, window_start)
  do update set
    count = public.request_rate_limit_buckets.count + 1,
    window_seconds = excluded.window_seconds,
    expires_at = excluded.expires_at,
    updated_at = now()
  returning public.request_rate_limit_buckets.count into v_count;

  return query
  select
    v_count <= p_limit,
    v_count,
    greatest(p_limit - v_count, 0),
    v_reset_at;
end;
$$;

revoke all on function public.increment_request_rate_limit_bucket(text, text, timestamptz, integer, integer) from public;
revoke all on function public.increment_request_rate_limit_bucket(text, text, timestamptz, integer, integer) from anon;
revoke all on function public.increment_request_rate_limit_bucket(text, text, timestamptz, integer, integer) from authenticated;

grant execute on function public.increment_request_rate_limit_bucket(
  text,
  text,
  timestamptz,
  integer,
  integer
) to service_role;
