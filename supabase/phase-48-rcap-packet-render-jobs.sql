-- Phase 48 RCAP durable packet render jobs, packet accounting, and delivery.
-- Migration file only; do not run against production until reviewed through the
-- DB process. Queued in data/rcap-authorization-queue.json; no agent applies it
-- to a shared environment. Ephemeral local application for tests is permitted.
--
-- Why this exists: packet rendering used to happen inline in a request handler
-- with no record that it had happened. There was no way to retry a failed
-- render without risking a second charge, no way to prove an artifact had been
-- validated before a credit moved, and no way to run the renderer anywhere
-- other than the request path.
--
-- Two facts are kept separate throughout:
--   * artifact integrity  - the stored bytes were re-read and hash-verified
--   * delivery eligibility - accounting authorized this packet to be served
-- A job can hold a perfectly valid artifact and still be non-deliverable
-- (accounting_blocked), and nothing about delivery is ever inferred from the
-- artifact alone.
--
-- The state machine here is verified byte-for-byte against the shared fixture
-- data/rcap-render/state-machine.json by scripts/verify-rcap-render-job-contract.mjs,
-- alongside the TypeScript contract, so SQL and code cannot drift.
--
-- Mutation authority: every write to these tables must arrive through one of
-- the functions below. Each function sets a transaction-local authority marker
-- (rcap.packet_mutation_authority) and the row triggers refuse writes that
-- arrive without the right marker, so a raw UPDATE cannot skip the state
-- machine, forge accounting, or fabricate a delivery event even with table
-- privileges.

-- pgcrypto provides digest(). Supabase installs extensions into the
-- `extensions` schema; a bare test cluster gets the same layout here so the
-- schema-qualified calls below work identically in both.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-------------------------------------------------------------------------------
-- 1. packet_render_jobs
-------------------------------------------------------------------------------

create table if not exists public.packet_render_jobs (
  id uuid primary key default gen_random_uuid(),

  -- What is being rendered, and for whom. Accounting identity is carried as
  -- immutable database IDs; slugs and other display identifiers may appear in
  -- audit metadata only, never as an accounting boundary.
  packet_id text not null,
  route_id text not null,
  briefcase_item_id uuid,
  partner_id uuid references public.partner_records(id) on delete restrict,
  person_id uuid references public.rcap_persons(id) on delete restrict,
  -- The distinct supported matter this packet set belongs to. Usually
  -- rcap_document_packets.id; no FK so consumer matters from other stores can
  -- participate. Required whenever partner_id is present.
  matter_id uuid,

  -- Exact identity of everything that determined the output. Server-derived;
  -- the worker never supplies them.
  renderer_kind text not null,
  renderer_version text not null,
  source_sha256 text,
  profile_id text not null,
  profile_version text not null,
  input_hash text not null,

  -- Lifecycle.
  status text not null default 'queued',
  attempt_count integer not null default 0,
  max_attempts integer not null default 5,
  next_attempt_at timestamptz,
  claimed_by text,
  claimed_at timestamptz,
  claim_expires_at timestamptz,
  -- One active claim = one fencing token. Every worker-owned mutation must
  -- present the current token; a superseded or expired claimant holds a token
  -- that no longer matches and can mutate nothing.
  fencing_token uuid,
  failure_disposition text,
  last_error_code text,
  last_error_detail text,
  manual_requeue_authorized_by text,

  -- Output evidence, written only by the canonical finalization operation.
  output_storage_path text,
  output_sha256 text,
  normalized_output_sha256 text,
  output_byte_count integer,
  output_page_count integer,
  container_digest text,

  -- Accounting outcome, written only by the canonical finalization operation.
  delivery_eligibility text not null default 'not_evaluated',
  accounting_result text,
  credit_ledger_id uuid,

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
  constraint packet_render_jobs_max_attempts_check check (max_attempts between 1 and 50),
  constraint packet_render_jobs_failure_disposition_check check (
    failure_disposition is null or failure_disposition in ('retryable', 'terminal')
  ),
  constraint packet_render_jobs_delivery_eligibility_check check (
    delivery_eligibility in ('not_evaluated', 'eligible', 'accounting_blocked')
  ),
  constraint packet_render_jobs_accounting_result_check check (
    accounting_result is null or accounting_result in (
      'consumed', 'already_consumed', 'overage_consumed', 'zero_charge',
      'cap_reached', 'not_validated', 'not_found', 'unauthorized'
    )
  ),
  constraint packet_render_jobs_sha_shape_check check (
    (source_sha256 is null or source_sha256 ~ '^[0-9a-f]{64}$')
    and (output_sha256 is null or output_sha256 ~ '^[0-9a-f]{64}$')
    and (normalized_output_sha256 is null or normalized_output_sha256 ~ '^[0-9a-f]{64}$')
  ),
  -- A partner-sponsored job must carry the full immutable accounting identity.
  constraint packet_render_jobs_partner_identity_check check (
    partner_id is null or (person_id is not null and matter_id is not null)
  ),
  -- A failed job must say whether it may retry.
  constraint packet_render_jobs_failed_has_disposition_check check (
    status <> 'failed' or failure_disposition is not null
  ),
  -- A validated artifact must carry its proof. Without a stored path and both
  -- hashes there is nothing to re-read, so the row cannot claim validation.
  constraint packet_render_jobs_validated_has_artifact_check check (
    status not in ('artifact_validated', 'delivered')
    or (
      output_storage_path is not null and output_sha256 is not null
      and normalized_output_sha256 is not null and validated_at is not null
      and container_digest is not null
    )
  ),
  -- The load-bearing one: delivery eligibility exists only on a validated
  -- artifact with an authorized accounting result.
  constraint packet_render_jobs_eligible_requires_accounting_check check (
    delivery_eligibility <> 'eligible'
    or (
      status in ('artifact_validated', 'delivered')
      and accounting_result in ('consumed', 'already_consumed', 'overage_consumed', 'zero_charge')
    )
  )
);

-- One live job per packet plus input. A retry of an identical input finds the
-- existing job instead of creating a second one that could deliver twice.
create unique index if not exists packet_render_jobs_live_input_idx
  on public.packet_render_jobs(packet_id, input_hash)
  where status in ('queued', 'claimed', 'rendering', 'validating');

create index if not exists packet_render_jobs_claimable_idx
  on public.packet_render_jobs(status, next_attempt_at, created_at)
  where status = 'queued';

create index if not exists packet_render_jobs_partner_idx
  on public.packet_render_jobs(partner_id, created_at desc)
  where partner_id is not null;

create index if not exists packet_render_jobs_packet_idx
  on public.packet_render_jobs(packet_id, created_at desc);

-------------------------------------------------------------------------------
-- 2. partner_packet_entitlement
--
-- EXTENDS the accounting model; partner_entitlement and every screening flow
-- that reads it are untouched. Packet capacity is a different product fact
-- from screening capacity and gets its own table, keyed on the immutable
-- partner_records.id rather than the mutable slug.
-------------------------------------------------------------------------------

create table if not exists public.partner_packet_entitlement (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partner_records(id) on delete restrict,
  entitlement_scope text not null default 'sponsored_packets',
  packet_cap integer not null,
  overage_enabled boolean not null default false,
  -- Internal continuity reserve past the cap: delivered, marked overage,
  -- non-billable, never shown to the partner as capacity.
  overage_cap integer not null default 0,
  -- Fail closed: reaching the cap pauses new packet accounting by default.
  pause_at_cap boolean not null default true,
  contract_note text,
  effective_at timestamptz not null default now(),
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint partner_packet_entitlement_cap_check check (packet_cap >= 0),
  constraint partner_packet_entitlement_overage_cap_check check (overage_cap >= 0),
  constraint partner_packet_entitlement_scope_check check (
    entitlement_scope in ('sponsored_packets')
  ),
  constraint partner_packet_entitlement_unique unique (partner_id, entitlement_scope)
);

-------------------------------------------------------------------------------
-- 3. packet_credit_ledger
--
-- Append-only. Balances are derived from this ledger inside the finalization
-- transaction; there is no mutable counter to race or drift. One consumed unit
-- means one distinct supported matter, identified only by immutable IDs.
-------------------------------------------------------------------------------

create table if not exists public.packet_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  entitlement_id uuid references public.partner_packet_entitlement(id) on delete restrict,
  partner_id uuid references public.partner_records(id) on delete restrict,
  person_id uuid references public.rcap_persons(id) on delete restrict,
  matter_id uuid,
  render_job_id uuid not null references public.packet_render_jobs(id) on delete restrict,
  event_type text not null,
  -- sha256 over the immutable identity tuple; the uniqueness boundary for
  -- exactly-once consumption.
  consumption_unit_hash text not null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,

  constraint packet_credit_ledger_event_type_check check (
    event_type in ('consumed', 'overage_consumed', 'zero_charge')
  ),
  constraint packet_credit_ledger_hash_shape_check check (
    consumption_unit_hash ~ '^[0-9a-f]{64}$'
  ),
  -- A consuming event must carry the full sponsored identity.
  constraint packet_credit_ledger_consuming_identity_check check (
    event_type = 'zero_charge'
    or (entitlement_id is not null and partner_id is not null and person_id is not null and matter_id is not null)
  )
);

-- Exactly one consuming event per distinct matter, enforced by the database.
create unique index if not exists packet_credit_ledger_consumption_unit_idx
  on public.packet_credit_ledger(consumption_unit_hash)
  where event_type in ('consumed', 'overage_consumed');

create index if not exists packet_credit_ledger_entitlement_idx
  on public.packet_credit_ledger(entitlement_id, event_type)
  where entitlement_id is not null;

create index if not exists packet_credit_ledger_job_idx
  on public.packet_credit_ledger(render_job_id);

-------------------------------------------------------------------------------
-- 4. packet_delivery_events
--
-- Append-only. Written only by the authenticated server download route through
-- record_packet_delivery_event; a worker fencing token is never authority to
-- record delivery, and no function here accepts one for that purpose.
-------------------------------------------------------------------------------

create table if not exists public.packet_delivery_events (
  id uuid primary key default gen_random_uuid(),
  render_job_id uuid not null references public.packet_render_jobs(id) on delete restrict,
  event_type text not null,
  actor_user_id uuid,
  -- Sanitized request context (user agent class, surface). Never tokens,
  -- cookies, or storage paths.
  request_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint packet_delivery_events_event_type_check check (
    event_type in ('delivery_started', 'delivery_completed', 'delivery_failed', 'delivery_aborted', 'delivery_issued')
  )
);

create index if not exists packet_delivery_events_job_idx
  on public.packet_delivery_events(render_job_id, created_at);

-------------------------------------------------------------------------------
-- 5. Mutation-authority triggers
-------------------------------------------------------------------------------

create or replace function public.rcap_packet_mutation_authority()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(current_setting('rcap.packet_mutation_authority', true), '');
$$;

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

create or replace function public.set_partner_packet_entitlement_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_partner_packet_entitlement_updated_at on public.partner_packet_entitlement;
create trigger set_partner_packet_entitlement_updated_at
before update on public.partner_packet_entitlement
for each row
execute function public.set_partner_packet_entitlement_updated_at();

-- Inserts arrive only through enqueue_packet_render_job.
create or replace function public.guard_packet_render_job_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if public.rcap_packet_mutation_authority() <> 'enqueue_packet_render_job' then
    raise exception 'packet_render_jobs: rows are created only through enqueue_packet_render_job';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_packet_render_job_insert on public.packet_render_jobs;
create trigger guard_packet_render_job_insert
before insert on public.packet_render_jobs
for each row
execute function public.guard_packet_render_job_insert();

-- The state machine plus write-authority enforcement, in the database. The
-- transitions here are the shared fixture's transitions exactly; the contract
-- verifier fails if they drift.
create or replace function public.guard_packet_render_job_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_authority text := public.rcap_packet_mutation_authority();
begin
  if new.status <> old.status then
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

    if old.status = 'queued' and new.status = 'claimed'
       and v_authority <> 'claim_packet_render_job' then
      raise exception 'packet_render_jobs: claiming requires claim_packet_render_job';
    end if;

    if new.status = 'artifact_validated'
       and v_authority <> 'finalize_packet_render_job' then
      raise exception 'packet_render_jobs: artifact_validated is written only by finalize_packet_render_job';
    end if;

    if new.status = 'delivered'
       and v_authority <> 'record_packet_delivery_event' then
      raise exception 'packet_render_jobs: delivered is written only by record_packet_delivery_event';
    end if;

    if old.status = 'failed' and new.status = 'queued' then
      if v_authority not in ('requeue_retryable_packet_render_jobs', 'requeue_packet_render_job_manual') then
        raise exception 'packet_render_jobs: failed jobs return to queued only through a requeue function';
      end if;
      if old.failure_disposition = 'terminal'
         and v_authority <> 'requeue_packet_render_job_manual' then
        raise exception 'packet_render_jobs: a terminal failure is requeued only manually with recorded authorization';
      end if;
    end if;

    if new.status in ('rendering', 'validating')
       and v_authority not in ('start_packet_render', 'start_packet_validation') then
      raise exception 'packet_render_jobs: worker transitions require their canonical functions';
    end if;

    if new.status = 'failed'
       and v_authority not in ('fail_packet_render_job', 'release_expired_packet_render_claims', 'finalize_packet_render_job') then
      raise exception 'packet_render_jobs: failure is recorded only through its canonical functions';
    end if;
  end if;

  -- Accounting and eligibility are finalization-owned regardless of status.
  if (new.delivery_eligibility is distinct from old.delivery_eligibility
      or new.accounting_result is distinct from old.accounting_result
      or new.credit_ledger_id is distinct from old.credit_ledger_id)
     and v_authority <> 'finalize_packet_render_job' then
    raise exception 'packet_render_jobs: accounting fields are written only by finalize_packet_render_job';
  end if;

  -- Artifact evidence is finalization-owned.
  if (new.output_storage_path is distinct from old.output_storage_path
      or new.output_sha256 is distinct from old.output_sha256
      or new.normalized_output_sha256 is distinct from old.normalized_output_sha256
      or new.container_digest is distinct from old.container_digest
      or new.validated_at is distinct from old.validated_at)
     and v_authority <> 'finalize_packet_render_job' then
    raise exception 'packet_render_jobs: artifact evidence is written only by finalize_packet_render_job';
  end if;

  -- Accounting identity is immutable once set.
  if old.partner_id is not null and new.partner_id is distinct from old.partner_id then
    raise exception 'packet_render_jobs: partner_id is immutable';
  end if;
  if old.person_id is not null and new.person_id is distinct from old.person_id then
    raise exception 'packet_render_jobs: person_id is immutable';
  end if;
  if old.matter_id is not null and new.matter_id is distinct from old.matter_id then
    raise exception 'packet_render_jobs: matter_id is immutable';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_packet_render_job_transition on public.packet_render_jobs;
create trigger guard_packet_render_job_transition
before update on public.packet_render_jobs
for each row
execute function public.guard_packet_render_job_transition();

create or replace function public.guard_packet_render_job_delete()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'packet_render_jobs: rows are never deleted';
end;
$$;

drop trigger if exists guard_packet_render_job_delete on public.packet_render_jobs;
create trigger guard_packet_render_job_delete
before delete on public.packet_render_jobs
for each row
execute function public.guard_packet_render_job_delete();

-- The credit ledger is append-only and consuming entries are irreversible.
create or replace function public.guard_packet_credit_ledger()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if public.rcap_packet_mutation_authority() <> 'finalize_packet_render_job' then
      raise exception 'packet_credit_ledger: entries are appended only by finalize_packet_render_job';
    end if;
    return new;
  end if;
  raise exception 'packet_credit_ledger: append-only; % is never permitted', tg_op;
end;
$$;

drop trigger if exists guard_packet_credit_ledger on public.packet_credit_ledger;
create trigger guard_packet_credit_ledger
before insert or update or delete on public.packet_credit_ledger
for each row
execute function public.guard_packet_credit_ledger();

-- Delivery events are append-only and written only by the delivery function.
create or replace function public.guard_packet_delivery_events()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if public.rcap_packet_mutation_authority() <> 'record_packet_delivery_event' then
      raise exception 'packet_delivery_events: events are recorded only by record_packet_delivery_event';
    end if;
    return new;
  end if;
  raise exception 'packet_delivery_events: append-only; % is never permitted', tg_op;
end;
$$;

drop trigger if exists guard_packet_delivery_events on public.packet_delivery_events;
create trigger guard_packet_delivery_events
before insert or update or delete on public.packet_delivery_events
for each row
execute function public.guard_packet_delivery_events();

-------------------------------------------------------------------------------
-- 6. Enqueue
-------------------------------------------------------------------------------

create or replace function public.enqueue_packet_render_job(
  p_packet_id text,
  p_route_id text,
  p_renderer_kind text,
  p_renderer_version text,
  p_source_sha256 text,
  p_profile_id text,
  p_profile_version text,
  p_input_hash text,
  p_briefcase_item_id uuid default null,
  p_partner_id uuid default null,
  p_person_id uuid default null,
  p_matter_id uuid default null,
  p_max_attempts integer default 5
)
returns setof public.packet_render_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.packet_render_jobs%rowtype;
begin
  if nullif(trim(p_packet_id), '') is null then
    raise exception 'packet id is required';
  end if;
  if nullif(trim(p_input_hash), '') is null or p_input_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'input hash must be a sha256 hex digest';
  end if;

  -- Idempotent on (packet, input): a live or completed job for identical input
  -- is returned rather than duplicated.
  select * into v_existing
  from public.packet_render_jobs j
  where j.packet_id = p_packet_id
    and j.input_hash = p_input_hash
    and j.status in ('queued', 'claimed', 'rendering', 'validating', 'artifact_validated', 'delivered')
  order by j.created_at
  limit 1;

  if found then
    return next v_existing;
    return;
  end if;

  perform set_config('rcap.packet_mutation_authority', 'enqueue_packet_render_job', true);
  return query
  insert into public.packet_render_jobs (
    packet_id, route_id, renderer_kind, renderer_version, source_sha256,
    profile_id, profile_version, input_hash, briefcase_item_id,
    partner_id, person_id, matter_id, max_attempts
  ) values (
    trim(p_packet_id), trim(p_route_id), p_renderer_kind, p_renderer_version, p_source_sha256,
    p_profile_id, p_profile_version, p_input_hash, p_briefcase_item_id,
    p_partner_id, p_person_id, p_matter_id, coalesce(p_max_attempts, 5)
  )
  returning *;
  perform set_config('rcap.packet_mutation_authority', '', true);
end;
$$;

-------------------------------------------------------------------------------
-- 7. Claim, worker transitions, failure, requeue
-------------------------------------------------------------------------------

-- Atomic claim. skip locked means two workers racing for the same job cannot
-- both win it. Each claim issues a fresh fencing token; the previous token is
-- superseded the moment this commits.
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
    and (j.next_attempt_at is null or j.next_attempt_at <= now())
    and (p_renderer_kinds is null or j.renderer_kind = any (p_renderer_kinds))
  order by j.created_at
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
      claimed_at = now(),
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

-- Shared fencing check for worker-owned mutations: the presented token must be
-- the job's current token and the lease must not have expired.
create or replace function public.assert_packet_render_job_fencing(
  p_job public.packet_render_jobs,
  p_fencing_token uuid
)
returns void
language plpgsql
set search_path = ''
as $$
begin
  if p_job.fencing_token is null or p_fencing_token is null
     or p_job.fencing_token <> p_fencing_token then
    raise exception 'packet_render_jobs: fencing token is not the active claim';
  end if;
  if p_job.claim_expires_at is null or p_job.claim_expires_at < now() then
    raise exception 'packet_render_jobs: claim lease has expired';
  end if;
end;
$$;

create or replace function public.start_packet_render(
  p_job_id uuid,
  p_fencing_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.packet_render_jobs%rowtype;
begin
  select * into v_job from public.packet_render_jobs where id = p_job_id for update;
  if not found then return false; end if;
  perform public.assert_packet_render_job_fencing(v_job, p_fencing_token);
  if v_job.status <> 'claimed' then
    raise exception 'packet_render_jobs: render starts only from claimed, job is %', v_job.status;
  end if;
  perform set_config('rcap.packet_mutation_authority', 'start_packet_render', true);
  update public.packet_render_jobs set status = 'rendering' where id = p_job_id;
  perform set_config('rcap.packet_mutation_authority', '', true);
  return true;
end;
$$;

create or replace function public.start_packet_validation(
  p_job_id uuid,
  p_fencing_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.packet_render_jobs%rowtype;
begin
  select * into v_job from public.packet_render_jobs where id = p_job_id for update;
  if not found then return false; end if;
  perform public.assert_packet_render_job_fencing(v_job, p_fencing_token);
  if v_job.status <> 'rendering' then
    raise exception 'packet_render_jobs: validation starts only from rendering, job is %', v_job.status;
  end if;
  perform set_config('rcap.packet_mutation_authority', 'start_packet_validation', true);
  update public.packet_render_jobs set status = 'validating' where id = p_job_id;
  perform set_config('rcap.packet_mutation_authority', '', true);
  return true;
end;
$$;

-- Worker-reported failure. Retryable failures schedule a backoff; anything at
-- or past max_attempts is terminal and stays visible until a human requeues it
-- with recorded authorization.
create or replace function public.fail_packet_render_job(
  p_job_id uuid,
  p_fencing_token uuid,
  p_error_code text,
  p_error_detail text,
  p_retryable boolean
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.packet_render_jobs%rowtype;
  v_disposition text;
begin
  select * into v_job from public.packet_render_jobs where id = p_job_id for update;
  if not found then return 'not_found'; end if;
  perform public.assert_packet_render_job_fencing(v_job, p_fencing_token);
  if v_job.status not in ('claimed', 'rendering', 'validating') then
    raise exception 'packet_render_jobs: only an in-flight job can fail, job is %', v_job.status;
  end if;

  if coalesce(p_retryable, false) and v_job.attempt_count < v_job.max_attempts then
    v_disposition := 'retryable';
  else
    v_disposition := 'terminal';
  end if;

  perform set_config('rcap.packet_mutation_authority', 'fail_packet_render_job', true);
  update public.packet_render_jobs
  set status = 'failed',
      failure_disposition = v_disposition,
      last_error_code = left(coalesce(p_error_code, 'render_failed'), 120),
      last_error_detail = left(coalesce(p_error_detail, ''), 2000),
      next_attempt_at = case
        when v_disposition = 'retryable'
        then now() + make_interval(secs => least(3600, 30 * power(2, v_job.attempt_count))::integer)
        else null
      end,
      fencing_token = null,
      claim_expires_at = null,
      claimed_by = null
  where id = p_job_id;
  perform set_config('rcap.packet_mutation_authority', '', true);
  return v_disposition;
end;
$$;

-- Lease expiry. A job stuck in claimed goes straight back to the queue; a job
-- that died mid-render or mid-validation fails retryably (or terminally once
-- attempts are exhausted) so its history is visible. Attempt counts are never
-- reset here.
create or replace function public.release_expired_packet_render_claims()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_released integer := 0;
  v_count integer;
begin
  perform set_config('rcap.packet_mutation_authority', 'release_expired_packet_render_claims', true);

  update public.packet_render_jobs j
  set status = 'queued',
      claimed_by = null,
      claimed_at = null,
      claim_expires_at = null,
      fencing_token = null
  where j.status = 'claimed'
    and j.claim_expires_at is not null
    and j.claim_expires_at < now();
  get diagnostics v_count = row_count;
  v_released := v_released + v_count;

  update public.packet_render_jobs j
  set status = 'failed',
      failure_disposition = case when j.attempt_count < j.max_attempts then 'retryable' else 'terminal' end,
      last_error_code = 'timeout',
      last_error_detail = 'claim lease expired before the worker finished',
      next_attempt_at = case
        when j.attempt_count < j.max_attempts
        then now() + make_interval(secs => least(3600, 30 * power(2, j.attempt_count))::integer)
        else null
      end,
      claimed_by = null,
      claimed_at = null,
      claim_expires_at = null,
      fencing_token = null
  where j.status in ('rendering', 'validating')
    and j.claim_expires_at is not null
    and j.claim_expires_at < now();
  get diagnostics v_count = row_count;
  v_released := v_released + v_count;

  perform set_config('rcap.packet_mutation_authority', '', true);
  return v_released;
end;
$$;

-- Automatic requeue reaches only retryable failures whose backoff has passed
-- and whose attempts are not exhausted. Terminal jobs are untouchable here.
create or replace function public.requeue_retryable_packet_render_jobs()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
begin
  perform set_config('rcap.packet_mutation_authority', 'requeue_retryable_packet_render_jobs', true);
  update public.packet_render_jobs j
  set status = 'queued',
      failure_disposition = null
  where j.status = 'failed'
    and j.failure_disposition = 'retryable'
    and j.attempt_count < j.max_attempts
    and (j.next_attempt_at is null or j.next_attempt_at <= now());
  get diagnostics v_count = row_count;
  perform set_config('rcap.packet_mutation_authority', '', true);
  return v_count;
end;
$$;

-- The only path back for a terminal job, and it records who authorized it.
create or replace function public.requeue_packet_render_job_manual(
  p_job_id uuid,
  p_authorized_by text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.packet_render_jobs%rowtype;
begin
  if nullif(trim(p_authorized_by), '') is null then
    raise exception 'a manual requeue requires a named authorizer';
  end if;
  select * into v_job from public.packet_render_jobs where id = p_job_id for update;
  if not found then return false; end if;
  if v_job.status <> 'failed' then
    raise exception 'packet_render_jobs: only a failed job can be requeued manually';
  end if;

  perform set_config('rcap.packet_mutation_authority', 'requeue_packet_render_job_manual', true);
  update public.packet_render_jobs
  set status = 'queued',
      failure_disposition = null,
      next_attempt_at = null,
      manual_requeue_authorized_by = trim(p_authorized_by),
      max_attempts = greatest(max_attempts, attempt_count + 1)
  where id = p_job_id;
  perform set_config('rcap.packet_mutation_authority', '', true);
  return true;
end;
$$;

-------------------------------------------------------------------------------
-- 8. Canonical finalization
--
-- One transaction: fencing, stored-byte identity, artifact evidence, the
-- exactly-once ledger event, the typed accounting result, and delivery
-- eligibility. The worker calls this after it has re-read the stored object;
-- both the local hashes and the re-read hashes come in, and a mismatch fails
-- the job rather than validating it.
-------------------------------------------------------------------------------

create or replace function public.finalize_packet_render_job(
  p_job_id uuid,
  p_fencing_token uuid,
  p_output_storage_path text,
  p_local_sha256 text,
  p_local_normalized_sha256 text,
  p_stored_sha256 text,
  p_stored_normalized_sha256 text,
  p_output_byte_count integer,
  p_output_page_count integer,
  p_container_digest text
)
returns table (
  accounting_result text,
  delivery_eligibility text,
  consumption_unit_hash text,
  credit_ledger_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.packet_render_jobs%rowtype;
  v_entitlement public.partner_packet_entitlement%rowtype;
  v_unit_hash text;
  v_used integer;
  v_overage_used integer;
  v_event_type text;
  v_result text;
  v_eligibility text;
  v_ledger_id uuid;
begin
  select * into v_job from public.packet_render_jobs where id = p_job_id for update;
  if not found then
    return query select 'not_found'::text, 'not_evaluated'::text, null::text, null::uuid;
    return;
  end if;

  -- Idempotent convergence: a worker that crashed after a committed
  -- finalization retries into the recorded outcome, changing nothing.
  if v_job.status in ('artifact_validated', 'delivered') and v_job.accounting_result is not null then
    return query select v_job.accounting_result, v_job.delivery_eligibility,
      (select l.consumption_unit_hash from public.packet_credit_ledger l where l.id = v_job.credit_ledger_id),
      v_job.credit_ledger_id;
    return;
  end if;

  -- A stale or superseded worker cannot finalize.
  perform public.assert_packet_render_job_fencing(v_job, p_fencing_token);

  if v_job.status <> 'validating' then
    return query select 'not_validated'::text, v_job.delivery_eligibility, null::text, null::uuid;
    return;
  end if;

  if p_output_storage_path is null
     or position(v_job.id::text in p_output_storage_path) = 0
     or position(coalesce(p_local_sha256, '') in p_output_storage_path) = 0 then
    raise exception 'packet_render_jobs: storage path must bind the job id and output hash';
  end if;

  -- The stored bytes must be the rendered bytes. This is the re-read check,
  -- inside the transaction: a raw-hash or normalized-hash mismatch means the
  -- object in storage is not the artifact, and the job fails closed.
  if p_local_sha256 is null or p_local_sha256 !~ '^[0-9a-f]{64}$'
     or p_stored_sha256 is distinct from p_local_sha256
     or p_local_normalized_sha256 is null or p_local_normalized_sha256 !~ '^[0-9a-f]{64}$'
     or p_stored_normalized_sha256 is distinct from p_local_normalized_sha256 then
    perform set_config('rcap.packet_mutation_authority', 'finalize_packet_render_job', true);
    update public.packet_render_jobs
    set status = 'failed',
        failure_disposition = case when attempt_count < max_attempts then 'retryable' else 'terminal' end,
        last_error_code = 'checksum_mismatch',
        last_error_detail = 'stored bytes did not match rendered bytes on re-read',
        next_attempt_at = case
          when attempt_count < max_attempts
          then now() + make_interval(secs => least(3600, 30 * power(2, attempt_count))::integer)
          else null
        end,
        fencing_token = null,
        claim_expires_at = null,
        claimed_by = null
    where id = p_job_id;
    perform set_config('rcap.packet_mutation_authority', '', true);
    return query select 'not_validated'::text, 'not_evaluated'::text, null::text, null::uuid;
    return;
  end if;

  if nullif(trim(coalesce(p_container_digest, '')), '') is null then
    raise exception 'packet_render_jobs: a container digest is required to finalize';
  end if;

  perform set_config('rcap.packet_mutation_authority', 'finalize_packet_render_job', true);

  -- Artifact integrity is now a fact and is recorded as one, whatever the
  -- accounting below concludes.
  update public.packet_render_jobs
  set status = 'artifact_validated',
      output_storage_path = p_output_storage_path,
      output_sha256 = p_local_sha256,
      normalized_output_sha256 = p_local_normalized_sha256,
      output_byte_count = p_output_byte_count,
      output_page_count = p_output_page_count,
      container_digest = p_container_digest,
      validated_at = now()
  where id = p_job_id;

  if v_job.partner_id is null then
    -- Consumer-paid or otherwise non-sponsored: an explicit zero-charge
    -- disposition, recorded in the ledger for audit, consuming nothing.
    v_unit_hash := encode(extensions.digest(convert_to('zero_charge:' || v_job.id::text, 'utf8'), 'sha256'), 'hex');
    insert into public.packet_credit_ledger (
      entitlement_id, partner_id, person_id, matter_id, render_job_id,
      event_type, consumption_unit_hash, metadata
    ) values (
      null, null, v_job.person_id, v_job.matter_id, v_job.id,
      'zero_charge', v_unit_hash,
      jsonb_build_object('reason', 'no_partner_sponsorship')
    ) returning id into v_ledger_id;
    v_result := 'zero_charge';
    v_eligibility := 'eligible';
  else
    select * into v_entitlement
    from public.partner_packet_entitlement e
    where e.partner_id = v_job.partner_id
      and e.entitlement_scope = 'sponsored_packets'
      and e.effective_at <= now()
      and (e.expires_at is null or e.expires_at > now())
    order by e.effective_at desc
    limit 1
    for update;

    if not found then
      v_result := 'unauthorized';
      v_eligibility := 'accounting_blocked';
    else
      v_unit_hash := encode(extensions.digest(convert_to(
        v_entitlement.partner_id::text || ':' || v_entitlement.entitlement_scope || ':'
          || v_job.person_id::text || ':' || v_job.matter_id::text,
        'utf8'), 'sha256'), 'hex');

      if exists (
        select 1 from public.packet_credit_ledger l
        where l.consumption_unit_hash = v_unit_hash
          and l.event_type in ('consumed', 'overage_consumed')
      ) then
        -- This matter already consumed its unit; re-renders and corrected
        -- versions ride on it.
        v_result := 'already_consumed';
        v_eligibility := 'eligible';
      else
        select count(*) filter (where l.event_type = 'consumed'),
               count(*) filter (where l.event_type = 'overage_consumed')
        into v_used, v_overage_used
        from public.packet_credit_ledger l
        where l.entitlement_id = v_entitlement.id;

        if v_used < v_entitlement.packet_cap then
          v_event_type := 'consumed';
        elsif v_entitlement.overage_enabled and v_overage_used < v_entitlement.overage_cap then
          v_event_type := 'overage_consumed';
        else
          v_event_type := null;
        end if;

        if v_event_type is null then
          -- The cap race is lost after the bytes were rendered: the artifact
          -- evidence above stands, the job is visibly accounting-blocked, no
          -- credit moves, and the download route will refuse it.
          v_result := 'cap_reached';
          v_eligibility := 'accounting_blocked';
        else
          insert into public.packet_credit_ledger (
            entitlement_id, partner_id, person_id, matter_id, render_job_id,
            event_type, consumption_unit_hash, metadata
          ) values (
            v_entitlement.id, v_entitlement.partner_id, v_job.person_id, v_job.matter_id, v_job.id,
            v_event_type, v_unit_hash,
            jsonb_build_object('packet_id', v_job.packet_id, 'route_id', v_job.route_id)
          ) returning id into v_ledger_id;
          v_result := case when v_event_type = 'consumed' then 'consumed' else 'overage_consumed' end;
          v_eligibility := 'eligible';
        end if;
      end if;
    end if;
  end if;

  update public.packet_render_jobs
  set accounting_result = v_result,
      delivery_eligibility = v_eligibility,
      credit_ledger_id = v_ledger_id,
      fencing_token = null,
      claim_expires_at = null,
      claimed_by = null
  where id = p_job_id;

  perform set_config('rcap.packet_mutation_authority', '', true);
  return query select v_result, v_eligibility, v_unit_hash, v_ledger_id;
end;
$$;

-------------------------------------------------------------------------------
-- 9. Delivery events
--
-- Written only by the authenticated server download route, after its own
-- authorization checks. Deliberately takes no fencing token: delivery is not a
-- worker action, and a worker token is never authority here.
-------------------------------------------------------------------------------

create or replace function public.record_packet_delivery_event(
  p_job_id uuid,
  p_event_type text,
  p_actor_user_id uuid,
  p_request_context jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_job public.packet_render_jobs%rowtype;
  v_event_id uuid;
begin
  if p_event_type not in ('delivery_started', 'delivery_completed', 'delivery_failed', 'delivery_aborted', 'delivery_issued') then
    raise exception 'packet_delivery_events: unknown event type %', p_event_type;
  end if;

  select * into v_job from public.packet_render_jobs where id = p_job_id for update;
  if not found then
    raise exception 'packet_delivery_events: unknown render job';
  end if;

  -- No event of any kind is recorded against a packet that accounting has not
  -- authorized. artifact_validated by itself is never sufficient.
  if v_job.delivery_eligibility <> 'eligible'
     or v_job.status not in ('artifact_validated', 'delivered') then
    raise exception 'packet_delivery_events: job is not delivery-eligible';
  end if;

  perform set_config('rcap.packet_mutation_authority', 'record_packet_delivery_event', true);
  insert into public.packet_delivery_events (render_job_id, event_type, actor_user_id, request_context)
  values (p_job_id, p_event_type, p_actor_user_id, coalesce(p_request_context, '{}'::jsonb))
  returning id into v_event_id;

  if p_event_type = 'delivery_completed' and v_job.status = 'artifact_validated' then
    update public.packet_render_jobs
    set status = 'delivered',
        delivered_at = now()
    where id = p_job_id;
  end if;
  perform set_config('rcap.packet_mutation_authority', '', true);

  return v_event_id;
end;
$$;

-------------------------------------------------------------------------------
-- 10. Reporting
-------------------------------------------------------------------------------

-- Balance for one entitlement, derived from the ledger inside one statement.
-- The overage reserve is internal continuity, never partner-visible capacity;
-- the caller decides what to show, this only reports the numbers separately.
create or replace function public.packet_entitlement_balance(
  p_entitlement_id uuid
)
returns table (
  packet_cap integer,
  overage_cap integer,
  consumed_units bigint,
  overage_units bigint,
  remaining_units bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    e.packet_cap,
    e.overage_cap,
    count(l.id) filter (where l.event_type = 'consumed') as consumed_units,
    count(l.id) filter (where l.event_type = 'overage_consumed') as overage_units,
    greatest(0, e.packet_cap - count(l.id) filter (where l.event_type = 'consumed')) as remaining_units
  from public.partner_packet_entitlement e
  left join public.packet_credit_ledger l on l.entitlement_id = e.id
  where e.id = p_entitlement_id
  group by e.id, e.packet_cap, e.overage_cap;
$$;

-------------------------------------------------------------------------------
-- 11. Storage bucket (private, immutable artifacts)
--
-- Guarded so the migration also applies to a bare PostgreSQL cluster in tests.
-- No browser-role policy is created: object reads and writes happen only
-- through the server's service-role storage client, and the raw path is never
-- sent to a browser.
-------------------------------------------------------------------------------

do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values (
      'rcap-packet-artifacts-private',
      'rcap-packet-artifacts-private',
      false,
      52428800,
      array['application/pdf']::text[]
    )
    on conflict (id) do update
    set public = false,
        file_size_limit = excluded.file_size_limit,
        allowed_mime_types = excluded.allowed_mime_types;
  end if;
end;
$$;

-------------------------------------------------------------------------------
-- 12. Row security and grants
--
-- All four tables are service-role only. No policy is created for anon or
-- authenticated, and their table privileges are revoked, so participants and
-- partners can reach this data only through server code. Function execution is
-- likewise revoked from browser roles; the guarded service functions are the
-- only mutation surface even for the service role.
-------------------------------------------------------------------------------

alter table public.packet_render_jobs enable row level security;
alter table public.partner_packet_entitlement enable row level security;
alter table public.packet_credit_ledger enable row level security;
alter table public.packet_delivery_events enable row level security;

-- Browser roles exist on Supabase; a bare test cluster creates them so the
-- grant surface tested locally is the grant surface that ships.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end;
$$;

revoke all on table public.packet_render_jobs from public;
revoke all on table public.packet_render_jobs from anon;
revoke all on table public.packet_render_jobs from authenticated;
revoke all on table public.partner_packet_entitlement from public;
revoke all on table public.partner_packet_entitlement from anon;
revoke all on table public.partner_packet_entitlement from authenticated;
revoke all on table public.packet_credit_ledger from public;
revoke all on table public.packet_credit_ledger from anon;
revoke all on table public.packet_credit_ledger from authenticated;
revoke all on table public.packet_delivery_events from public;
revoke all on table public.packet_delivery_events from anon;
revoke all on table public.packet_delivery_events from authenticated;

do $$
declare
  v_signature text;
begin
  foreach v_signature in array array[
    'public.enqueue_packet_render_job(text, text, text, text, text, text, text, text, uuid, uuid, uuid, uuid, integer)',
    'public.claim_packet_render_job(text, text[], integer)',
    'public.start_packet_render(uuid, uuid)',
    'public.start_packet_validation(uuid, uuid)',
    'public.fail_packet_render_job(uuid, uuid, text, text, boolean)',
    'public.release_expired_packet_render_claims()',
    'public.requeue_retryable_packet_render_jobs()',
    'public.requeue_packet_render_job_manual(uuid, text)',
    'public.finalize_packet_render_job(uuid, uuid, text, text, text, text, text, integer, integer, text)',
    'public.record_packet_delivery_event(uuid, text, uuid, jsonb)',
    'public.packet_entitlement_balance(uuid)'
  ]
  loop
    execute format('revoke all on function %s from public', v_signature);
    execute format('revoke all on function %s from anon', v_signature);
    execute format('revoke all on function %s from authenticated', v_signature);
    begin
      execute format('grant execute on function %s to service_role', v_signature);
    exception when undefined_object then
      -- Bare PostgreSQL test clusters have no service_role; Supabase does.
      null;
    end;
  end loop;
end;
$$;

comment on table public.packet_render_jobs is
  'Durable packet render jobs. Artifact integrity (re-read, hash-verified stored bytes) and delivery eligibility (typed accounting disposition) are separate facts; a credit moves only inside finalize_packet_render_job, and delivery events exist only for accounting-authorized jobs.';
comment on table public.partner_packet_entitlement is
  'Packet-set capacity per partner, keyed on immutable partner_records.id. Extends, never replaces, the screening-shaped partner_entitlement.';
comment on table public.packet_credit_ledger is
  'Append-only packet credit ledger. Balances derive from it; one consuming event per distinct supported matter, enforced by a partial unique index on the immutable-ID unit hash.';
comment on table public.packet_delivery_events is
  'Append-only delivery evidence recorded by the authenticated download route. delivery_completed is written only after the response pipeline finishes; headersSent alone is never delivery.';

-- Rollback (documented, not executed): drop function public.record_packet_delivery_event,
-- finalize_packet_render_job, requeue_packet_render_job_manual,
-- requeue_retryable_packet_render_jobs, release_expired_packet_render_claims,
-- fail_packet_render_job, start_packet_validation, start_packet_render,
-- claim_packet_render_job, enqueue_packet_render_job, packet_entitlement_balance,
-- assert_packet_render_job_fencing, rcap_packet_mutation_authority and the
-- guard/updated_at trigger functions; then drop table packet_delivery_events,
-- packet_credit_ledger, partner_packet_entitlement, packet_render_jobs. All
-- objects are new in this phase, so no pre-existing row is affected.
