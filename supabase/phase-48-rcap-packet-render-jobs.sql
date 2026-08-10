-- Phase 48 RCAP durable packet render jobs.
-- Migration file only; do not run against production until reviewed through the
-- DB process. Queued for Roger's authorization window; no agent applies it.
--
-- Why this exists: packet rendering used to happen inline in a request handler
-- with no record that it had happened. There was no way to retry a failed
-- render without risking a second charge, no way to prove an artifact had been
-- validated before a credit moved, and no way to run the renderer anywhere
-- other than the request path.
--
-- The invariant this table enforces: sponsored allocation and paid entitlement
-- are consumed only after a job reaches artifact_validated. A job that has not
-- validated an artifact has never consumed anything, no matter how many times
-- it was attempted.

create table if not exists public.packet_render_jobs (
  id uuid primary key default gen_random_uuid(),

  -- What is being rendered, and for whom.
  packet_id text not null,
  route_id text not null,
  briefcase_item_id uuid,
  partner_slug text references public.partner_records(partner_slug) on delete restrict,

  -- Exact identity of everything that determined the output. These are
  -- server-derived; the worker never supplies them.
  renderer_kind text not null,
  renderer_version text not null,
  source_sha256 text,
  profile_id text not null,
  profile_version text not null,
  input_hash text not null,

  -- Lifecycle.
  status text not null default 'queued',
  attempt_count integer not null default 0,
  claimed_by text,
  claimed_at timestamptz,
  claim_expires_at timestamptz,

  -- Output, written only by the worker that holds the claim.
  output_storage_path text,
  output_sha256 text,
  normalized_output_sha256 text,
  output_byte_count integer,
  output_page_count integer,
  container_digest text,

  -- Failure, recorded as a code rather than free text so it can be counted.
  error_code text,
  error_detail text,

  -- Consumption. Set once, and only from artifact_validated onward.
  consumed_credit boolean not null default false,
  consumed_credit_at timestamptz,
  consumption_unit_key text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  validated_at timestamptz,
  delivered_at timestamptz,

  constraint packet_render_jobs_status_check check (
    status in ('queued', 'claimed', 'rendering', 'validating', 'artifact_validated', 'delivered', 'failed')
  ),
  constraint packet_render_jobs_renderer_kind_check check (
    renderer_kind in ('packet_document_v1', 'official_pdf_overlay_v1', 'xfa_static_variant_v1')
  ),
  constraint packet_render_jobs_attempt_count_check check (attempt_count >= 0),
  constraint packet_render_jobs_sha_shape_check check (
    (source_sha256 is null or source_sha256 ~ '^[0-9a-f]{64}$')
    and (output_sha256 is null or output_sha256 ~ '^[0-9a-f]{64}$')
    and (normalized_output_sha256 is null or normalized_output_sha256 ~ '^[0-9a-f]{64}$')
  ),

  -- A validated artifact must carry its proof. Without a stored path and a hash
  -- there is nothing to re-read, so the row cannot claim validation.
  constraint packet_render_jobs_validated_has_artifact_check check (
    status not in ('artifact_validated', 'delivered')
    or (output_storage_path is not null and output_sha256 is not null and normalized_output_sha256 is not null and validated_at is not null)
  ),

  -- The load-bearing one: a credit can never be consumed by a job that has not
  -- validated an artifact.
  constraint packet_render_jobs_credit_requires_validation_check check (
    consumed_credit = false
    or (status in ('artifact_validated', 'delivered') and consumed_credit_at is not null and consumption_unit_key is not null)
  )
);

-- One consumed credit per distinct sponsored matter, enforced by the database
-- rather than by the caller remembering to check. Retries, re-downloads and
-- corrected versions reuse the same unit key and therefore cannot double-count.
create unique index if not exists packet_render_jobs_consumption_unit_idx
  on public.packet_render_jobs(consumption_unit_key)
  where consumed_credit = true;

-- One live job per packet plus input. A retry of an identical input finds the
-- existing job instead of creating a second one that could deliver twice.
create unique index if not exists packet_render_jobs_live_input_idx
  on public.packet_render_jobs(packet_id, input_hash)
  where status in ('queued', 'claimed', 'rendering', 'validating');

create index if not exists packet_render_jobs_claimable_idx
  on public.packet_render_jobs(status, created_at)
  where status = 'queued';

create index if not exists packet_render_jobs_partner_idx
  on public.packet_render_jobs(partner_slug, created_at desc);

create index if not exists packet_render_jobs_packet_idx
  on public.packet_render_jobs(packet_id, created_at desc);

create or replace function public.set_packet_render_jobs_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_packet_render_jobs_updated_at on public.packet_render_jobs;
create trigger set_packet_render_jobs_updated_at
before update on public.packet_render_jobs
for each row
execute function public.set_packet_render_jobs_updated_at();

-- The state machine, enforced in the database. An out-of-order transition is an
-- error, not a silently accepted write, because the credit rule is only as
-- strong as the statuses it reads.
create or replace function public.guard_packet_render_job_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = old.status then
    return new;
  end if;

  if not (
    (old.status = 'queued' and new.status in ('claimed', 'failed'))
    or (old.status = 'claimed' and new.status in ('rendering', 'failed', 'queued'))
    or (old.status = 'rendering' and new.status in ('validating', 'failed'))
    or (old.status = 'validating' and new.status in ('artifact_validated', 'failed'))
    or (old.status = 'artifact_validated' and new.status = 'delivered')
    or (old.status = 'failed' and new.status = 'queued')
  ) then
    raise exception 'packet_render_jobs: illegal transition % -> %', old.status, new.status;
  end if;

  -- A consumed credit is never released by a later status change.
  if old.consumed_credit = true and new.consumed_credit = false then
    raise exception 'packet_render_jobs: a consumed credit cannot be released';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_packet_render_job_transition on public.packet_render_jobs;
create trigger guard_packet_render_job_transition
before update on public.packet_render_jobs
for each row
execute function public.guard_packet_render_job_transition();

-- Atomic claim. skip locked means two workers racing for the same job cannot
-- both win it; the loser takes the next one instead of blocking.
create or replace function public.claim_packet_render_job(
  p_worker_id text,
  p_renderer_kinds text[],
  p_claim_seconds integer default 600
)
returns table (
  id uuid,
  packet_id text,
  route_id text,
  renderer_kind text,
  renderer_version text,
  source_sha256 text,
  profile_id text,
  profile_version text,
  input_hash text,
  attempt_count integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_worker_id text;
  v_job_id uuid;
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
    and (p_renderer_kinds is null or j.renderer_kind = any (p_renderer_kinds))
  order by j.created_at
  for update skip locked
  limit 1;

  if v_job_id is null then
    return;
  end if;

  return query
  update public.packet_render_jobs j
  set status = 'claimed',
      claimed_by = v_worker_id,
      claimed_at = now(),
      claim_expires_at = now() + make_interval(secs => p_claim_seconds),
      attempt_count = j.attempt_count + 1
  where j.id = v_job_id
  returning j.id, j.packet_id, j.route_id, j.renderer_kind, j.renderer_version,
            j.source_sha256, j.profile_id, j.profile_version, j.input_hash, j.attempt_count;
end;
$$;

-- Reclaims jobs whose worker died mid-render. The attempt count is not reset,
-- so a job that keeps dying is visible rather than retrying forever unnoticed.
create or replace function public.release_expired_packet_render_claims()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_released integer;
begin
  update public.packet_render_jobs j
  set status = 'queued',
      claimed_by = null,
      claimed_at = null,
      claim_expires_at = null
  where j.status in ('claimed', 'rendering', 'validating')
    and j.claim_expires_at is not null
    and j.claim_expires_at < now();

  get diagnostics v_released = row_count;
  return v_released;
end;
$$;

-- Consumption, in one statement so it cannot interleave. Returns false when the
-- job has not validated an artifact or has already consumed, which is what makes
-- a retry safe.
create or replace function public.consume_packet_render_credit(
  p_job_id uuid,
  p_consumption_unit_key text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key text;
  v_updated integer;
begin
  v_key := nullif(trim(p_consumption_unit_key), '');
  if v_key is null then
    raise exception 'a consumption unit key is required';
  end if;

  -- Already consumed for this matter, by this job or an earlier one. Not an
  -- error: the caller asked for a unit that is already accounted for.
  if exists (
    select 1 from public.packet_render_jobs j
    where j.consumption_unit_key = v_key and j.consumed_credit = true
  ) then
    return false;
  end if;

  update public.packet_render_jobs j
  set consumed_credit = true,
      consumed_credit_at = now(),
      consumption_unit_key = v_key
  where j.id = p_job_id
    and j.consumed_credit = false
    and j.status in ('artifact_validated', 'delivered');

  get diagnostics v_updated = row_count;
  return v_updated = 1;
end;
$$;

alter table public.packet_render_jobs enable row level security;

-- No policy is created for anon or authenticated. Render jobs are service-role
-- only: the worker and the server read and write them, participants never do.
-- Partner-facing counts are reported through the accounting layer, not by
-- exposing this table.

revoke all on table public.packet_render_jobs from anon;
revoke all on table public.packet_render_jobs from authenticated;

revoke all on function public.claim_packet_render_job(text, text[], integer) from anon;
revoke all on function public.claim_packet_render_job(text, text[], integer) from authenticated;
revoke all on function public.claim_packet_render_job(text, text[], integer) from public;

revoke all on function public.release_expired_packet_render_claims() from anon;
revoke all on function public.release_expired_packet_render_claims() from authenticated;
revoke all on function public.release_expired_packet_render_claims() from public;

revoke all on function public.consume_packet_render_credit(uuid, text) from anon;
revoke all on function public.consume_packet_render_credit(uuid, text) from authenticated;
revoke all on function public.consume_packet_render_credit(uuid, text) from public;

comment on table public.packet_render_jobs is
  'Durable packet render jobs. Sponsored allocation and paid entitlement are consumed only after a job reaches artifact_validated; the credit constraint and consume_packet_render_credit enforce that a retry cannot double-consume.';
