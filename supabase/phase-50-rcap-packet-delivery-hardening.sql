-- Phase 50: packet delivery hardening on the phase-49 base.
-- Migration file only; do not run against any shared database until authorized
-- through Roger's queue. Apply strictly after
-- supabase/phase-49-rcap-packet-render-jobs.sql. Ephemeral local application
-- for tests is permitted.
--
-- RECONCILIATION RECORD
-- ---------------------
-- Two lanes independently built durable render jobs. Phase 49 (PR #91, owner-
-- authorized, hash-pinned) is the canonical base: its packet_render_jobs table,
-- state machine and numbering stand. This follow-on adds only what phase 49
-- does not have: fencing tokens, retry exhaustion with terminal dispositions,
-- the atomic finalization transaction, delivery events, and packet accounting
-- keyed on immutable IDs.
--
-- One deliberate supersession, stated loudly rather than hidden: phase 49's
-- rcap_partner_packet_allocation and rcap_packet_credit_consumptions key the
-- accounting boundary on partner_slug — a mutable display identifier — with a
-- free-text matter and no person or program dimension. The accounting unit
-- must be immutable database IDs (partner_records.id, the entitlement id, the
-- person id, the matter id), so this migration drops those two empty tables
-- and consume_rcap_packet_credit, and creates the canonical entitlement and
-- append-only ledger in their place. Both migrations are unapplied everywhere;
-- the drop happens before any row could exist. The phase-49 FILE is untouched
-- and its authorization stands.
--
-- THE SECURITY BOUNDARY, STATED EXACTLY
-- -------------------------------------
-- The mutation boundary is role grants plus owner-executed SECURITY DEFINER
-- functions, not the authority GUC. Runtime roles (service_role included) hold
-- SELECT and EXECUTE only on these objects: their INSERT/UPDATE/DELETE on the
-- protected tables is revoked below, so a runtime credential that sets
-- rcap.packet_mutation_authority by hand still cannot write the tables
-- directly. The GUC is trigger coordination — it routes writes through the
-- intended function — and is verified as forgeable-but-useless by
-- scripts/verify-rcap-mutation-authority.mjs. partner_packet_entitlement is
-- configuration, not accounting evidence, and remains service-role writable.

begin;

-- pgcrypto provides digest(). Supabase installs extensions into the
-- `extensions` schema; a bare test cluster gets the same layout so the
-- schema-qualified calls below work identically in both.
create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

-------------------------------------------------------------------------------
-- 1. Harden packet_render_jobs (additive columns on the phase-49 table).
-------------------------------------------------------------------------------

alter table public.packet_render_jobs
  add column if not exists renderer_version text not null default '0.0.0',
  add column if not exists briefcase_item_id uuid,
  add column if not exists partner_id uuid references public.partner_records(id) on delete restrict,
  add column if not exists person_id uuid references public.rcap_persons(id) on delete restrict,
  add column if not exists matter_id uuid,
  add column if not exists max_attempts integer not null default 5,
  add column if not exists next_attempt_at timestamptz,
  add column if not exists claim_expires_at timestamptz,
  add column if not exists fencing_token uuid,
  add column if not exists failure_disposition text,
  add column if not exists last_error_detail text,
  add column if not exists manual_requeue_authorized_by text,
  add column if not exists output_byte_count integer,
  add column if not exists container_digest text,
  add column if not exists delivery_eligibility text not null default 'not_evaluated',
  add column if not exists accounting_result text,
  add column if not exists credit_ledger_id uuid;

alter table public.packet_render_jobs
  drop constraint if exists packet_render_jobs_max_attempts_check,
  add constraint packet_render_jobs_max_attempts_check check (max_attempts between 1 and 50);

alter table public.packet_render_jobs
  drop constraint if exists packet_render_jobs_failure_disposition_check,
  add constraint packet_render_jobs_failure_disposition_check check (
    failure_disposition is null or failure_disposition in ('retryable', 'terminal')
  );

alter table public.packet_render_jobs
  drop constraint if exists packet_render_jobs_delivery_eligibility_check,
  add constraint packet_render_jobs_delivery_eligibility_check check (
    delivery_eligibility in ('not_evaluated', 'eligible', 'accounting_blocked')
  );

alter table public.packet_render_jobs
  drop constraint if exists packet_render_jobs_accounting_result_check,
  add constraint packet_render_jobs_accounting_result_check check (
    accounting_result is null or accounting_result in (
      'consumed', 'already_consumed', 'overage_consumed', 'zero_charge',
      'cap_reached', 'not_validated', 'not_found', 'unauthorized'
    )
  );

-- A partner-sponsored job must carry the full immutable accounting identity.
alter table public.packet_render_jobs
  drop constraint if exists packet_render_jobs_partner_identity_check,
  add constraint packet_render_jobs_partner_identity_check check (
    partner_id is null or (person_id is not null and matter_id is not null)
  );

-- Delivery eligibility exists only on a validated artifact with an authorized
-- accounting result. Artifact integrity and delivery eligibility stay distinct.
alter table public.packet_render_jobs
  drop constraint if exists packet_render_jobs_eligible_requires_accounting_check,
  add constraint packet_render_jobs_eligible_requires_accounting_check check (
    delivery_eligibility <> 'eligible'
    or (
      status in ('artifact_validated', 'delivered')
      and accounting_result in ('consumed', 'already_consumed', 'overage_consumed', 'zero_charge')
    )
  );

-- Phase 49 requires a source SHA on every job. A renderer that composes its
-- own document (packet_document_v1) has no source binary to pin, so the column
-- relaxes to nullable with a compensating constraint: null is legal only for
-- that renderer kind. Every other kind still requires an admitted source.
alter table public.packet_render_jobs
  alter column source_sha256 drop not null;
alter table public.packet_render_jobs
  drop constraint if exists packet_render_jobs_source_sha_check,
  add constraint packet_render_jobs_source_sha_check check (
    source_sha256 is null or source_sha256 ~ '^[0-9a-f]{64}$'
  ),
  drop constraint if exists packet_render_jobs_source_presence_check,
  add constraint packet_render_jobs_source_presence_check check (
    renderer_kind = 'packet_document_v1' or source_sha256 is not null
  );

-- Terminal success now also proves its container and normalized fingerprint.
alter table public.packet_render_jobs
  drop constraint if exists packet_render_jobs_validated_requires_output,
  add constraint packet_render_jobs_validated_requires_output check (
    status not in ('artifact_validated', 'delivered')
    or (
      output_storage_path is not null and output_storage_path <> ''
      and output_sha256 is not null
      and normalized_output_sha256 is not null
      and container_digest is not null
    )
  );

create index if not exists packet_render_jobs_partner_idx
  on public.packet_render_jobs(partner_id, created_at desc)
  where partner_id is not null;

-------------------------------------------------------------------------------
-- 2. Canonical packet accounting on immutable IDs.
--
-- Supersedes the slug-keyed phase-49 accounting pair, dropped here while
-- provably empty (neither migration has ever been applied to a shared
-- environment; this runs in the same forward sequence).
-------------------------------------------------------------------------------

drop function if exists public.consume_rcap_packet_credit(text, text, uuid);
drop table if exists public.rcap_packet_credit_consumptions;
drop table if exists public.rcap_partner_packet_allocation;

create table if not exists public.partner_packet_entitlement (
  id uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partner_records(id) on delete restrict,
  -- Program scope. Two programs under one partner are two entitlements, and
  -- their allocations never cross-consume because the consumption unit is
  -- keyed on the entitlement id.
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
  constraint partner_packet_entitlement_scope_nonempty_check check (length(trim(entitlement_scope)) > 0)
);

-- One ACTIVE entitlement per partner and program. Expired periods keep their
-- rows (and their consumed history) while a successor period takes over; the
-- unit hash embeds the entitlement id, so periods remain separate.
create unique index if not exists partner_packet_entitlement_active_unique
  on public.partner_packet_entitlement(partner_id, entitlement_scope)
  where expires_at is null;

create table if not exists public.packet_credit_ledger (
  id uuid primary key default gen_random_uuid(),
  entitlement_id uuid references public.partner_packet_entitlement(id) on delete restrict,
  partner_id uuid references public.partner_records(id) on delete restrict,
  person_id uuid references public.rcap_persons(id) on delete restrict,
  matter_id uuid,
  render_job_id uuid not null references public.packet_render_jobs(id) on delete restrict,
  event_type text not null,
  -- sha256 over partner_id : entitlement_id : person_id : matter_id — the
  -- uniqueness boundary for exactly-once consumption, immutable IDs only.
  consumption_unit_hash text not null,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,

  constraint packet_credit_ledger_event_type_check check (
    event_type in ('consumed', 'overage_consumed', 'zero_charge')
  ),
  constraint packet_credit_ledger_hash_shape_check check (
    consumption_unit_hash ~ '^[0-9a-f]{64}$'
  ),
  constraint packet_credit_ledger_consuming_identity_check check (
    event_type = 'zero_charge'
    or (entitlement_id is not null and partner_id is not null and person_id is not null and matter_id is not null)
  )
);

create unique index if not exists packet_credit_ledger_consumption_unit_idx
  on public.packet_credit_ledger(consumption_unit_hash)
  where event_type in ('consumed', 'overage_consumed');

create index if not exists packet_credit_ledger_entitlement_idx
  on public.packet_credit_ledger(entitlement_id, event_type)
  where entitlement_id is not null;

create index if not exists packet_credit_ledger_job_idx
  on public.packet_credit_ledger(render_job_id);

-------------------------------------------------------------------------------
-- 3. Delivery evidence.
--
-- Written only through record_packet_delivery_event, which is invoked by the
-- authenticated download route. Delivery is not a worker action: no function
-- here accepts a fencing token, and a worker token is never authority to
-- record transmission.
--
--   delivery_authorized     authorization passed and the stored object was
--                           opened and hash-verified
--   transmission_started    the response stream began producing bytes
--   transmission_completed  the stream closed cleanly (never on client abort)
--   transmission_aborted    the client went away mid-stream
--   transmission_failed     the pipeline broke for any other reason
--
-- Server stream completion never implies a human opened or saved the file.
-------------------------------------------------------------------------------

create table if not exists public.packet_delivery_events (
  id uuid primary key default gen_random_uuid(),
  render_job_id uuid not null references public.packet_render_jobs(id) on delete restrict,
  event_type text not null,
  actor_user_id uuid,
  request_context jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),

  constraint packet_delivery_events_event_type_check check (
    event_type in ('delivery_authorized', 'transmission_started', 'transmission_completed', 'transmission_aborted', 'transmission_failed')
  )
);

create index if not exists packet_delivery_events_job_idx
  on public.packet_delivery_events(render_job_id, created_at);

-------------------------------------------------------------------------------
-- 4. Mutation-authority coordination and guard triggers.
--
-- Coordination only: the enforcement boundary is the grant model in section 8.
-------------------------------------------------------------------------------

create or replace function public.rcap_packet_mutation_authority()
returns text
language sql
stable
set search_path = ''
as $$
  select coalesce(current_setting('rcap.packet_mutation_authority', true), '');
$$;

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

-- Replaces the phase-49 transition guard with the hardened version: the same
-- fixture transitions, plus write-authority routing, per-state timestamp
-- stamping (carried over from phase 49), accounting-field protection, and
-- identity immutability.
drop trigger if exists packet_render_jobs_guard_transition on public.packet_render_jobs;
drop function if exists public.packet_render_jobs_guard_transition();

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

    -- Per-state timestamps, carried over from the phase-49 guard.
    new.claimed_at            := case when new.status = 'claimed'            then now() else new.claimed_at end;
    new.rendering_at          := case when new.status = 'rendering'          then now() else new.rendering_at end;
    new.validating_at         := case when new.status = 'validating'         then now() else new.validating_at end;
    new.artifact_validated_at := case when new.status = 'artifact_validated' then now() else new.artifact_validated_at end;
    new.delivered_at          := case when new.status = 'delivered'          then now() else new.delivered_at end;

    if new.status = 'queued' then
      new.claimed_by := null;
      new.claimed_at := null;
    end if;
  end if;

  if (new.delivery_eligibility is distinct from old.delivery_eligibility
      or new.accounting_result is distinct from old.accounting_result
      or new.credit_ledger_id is distinct from old.credit_ledger_id)
     and v_authority <> 'finalize_packet_render_job' then
    raise exception 'packet_render_jobs: accounting fields are written only by finalize_packet_render_job';
  end if;

  if (new.output_storage_path is distinct from old.output_storage_path
      or new.output_sha256 is distinct from old.output_sha256
      or new.normalized_output_sha256 is distinct from old.normalized_output_sha256
      or new.container_digest is distinct from old.container_digest)
     and v_authority <> 'finalize_packet_render_job' then
    raise exception 'packet_render_jobs: artifact evidence is written only by finalize_packet_render_job';
  end if;

  if old.partner_id is not null and new.partner_id is distinct from old.partner_id then
    raise exception 'packet_render_jobs: partner_id is immutable';
  end if;
  if old.person_id is not null and new.person_id is distinct from old.person_id then
    raise exception 'packet_render_jobs: person_id is immutable';
  end if;
  if old.matter_id is not null and new.matter_id is distinct from old.matter_id then
    raise exception 'packet_render_jobs: matter_id is immutable';
  end if;

  new.updated_at := now();
  return new;
end;
$$;

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
-- 5. Enqueue, claim (with fencing and lease), worker transitions, failure,
--    requeue. The phase-49 claim (no lease, no token) is superseded.
-------------------------------------------------------------------------------

drop function if exists public.claim_packet_render_job(text, text[]);

create or replace function public.enqueue_packet_render_job(
  p_packet_id uuid,
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
  if p_packet_id is null then
    raise exception 'packet id is required';
  end if;
  if nullif(trim(p_input_hash), '') is null or p_input_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'input hash must be a sha256 hex digest';
  end if;

  select * into v_existing
  from public.packet_render_jobs j
  where j.packet_id = p_packet_id
    and j.input_hash = p_input_hash
    and j.status <> 'failed'
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
    p_packet_id, trim(p_route_id), p_renderer_kind, p_renderer_version, p_source_sha256,
    p_profile_id, p_profile_version, p_input_hash, p_briefcase_item_id,
    p_partner_id, p_person_id, p_matter_id, coalesce(p_max_attempts, 5)
  )
  returning *;
  perform set_config('rcap.packet_mutation_authority', '', true);
end;
$$;

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
      error_code = left(coalesce(nullif(trim(p_error_code), ''), 'render_failed'), 120),
      last_error_detail = left(coalesce(p_error_detail, ''), 2000),
      next_attempt_at = case
        when v_disposition = 'retryable'
        then now() + make_interval(secs => least(3600, 30 * power(2, v_job.attempt_count))::integer)
        else null
      end,
      fencing_token = null,
      claim_expires_at = null
  where id = p_job_id;
  perform set_config('rcap.packet_mutation_authority', '', true);
  return v_disposition;
end;
$$;

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

  -- A job stuck in claimed goes straight back to the queue.
  update public.packet_render_jobs j
  set status = 'queued',
      claim_expires_at = null,
      fencing_token = null
  where j.status = 'claimed'
    and j.claim_expires_at is not null
    and j.claim_expires_at < now();
  get diagnostics v_count = row_count;
  v_released := v_released + v_count;

  -- A job that died mid-render or mid-validation fails retryably (or
  -- terminally once attempts are exhausted) so its history stays visible.
  update public.packet_render_jobs j
  set status = 'failed',
      failure_disposition = case when j.attempt_count < j.max_attempts then 'retryable' else 'terminal' end,
      error_code = 'timeout',
      last_error_detail = 'claim lease expired before the worker finished',
      next_attempt_at = case
        when j.attempt_count < j.max_attempts
        then now() + make_interval(secs => least(3600, 30 * power(2, j.attempt_count))::integer)
        else null
      end,
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
-- 6. Canonical finalization: fencing, stored-byte identity, artifact evidence,
--    the exactly-once ledger event, the typed result, delivery eligibility —
--    one transaction. Replaces consume_rcap_packet_credit as the only path by
--    which sponsored credit moves.
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

  -- The stored bytes must be the rendered bytes: the re-read check, inside the
  -- transaction. A raw or normalized mismatch means the object in storage is
  -- not the artifact, and the job fails closed.
  if p_local_sha256 is null or p_local_sha256 !~ '^[0-9a-f]{64}$'
     or p_stored_sha256 is distinct from p_local_sha256
     or p_local_normalized_sha256 is null or p_local_normalized_sha256 !~ '^[0-9a-f]{64}$'
     or p_stored_normalized_sha256 is distinct from p_local_normalized_sha256 then
    perform set_config('rcap.packet_mutation_authority', 'finalize_packet_render_job', true);
    update public.packet_render_jobs
    set status = 'failed',
        failure_disposition = case when attempt_count < max_attempts then 'retryable' else 'terminal' end,
        error_code = 'checksum_mismatch',
        last_error_detail = 'stored bytes did not match rendered bytes on re-read',
        next_attempt_at = case
          when attempt_count < max_attempts
          then now() + make_interval(secs => least(3600, 30 * power(2, attempt_count))::integer)
          else null
        end,
        fencing_token = null,
        claim_expires_at = null
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
      page_count = p_output_page_count,
      container_digest = p_container_digest
  where id = p_job_id;

  if v_job.partner_id is null then
    -- Consumer-paid or otherwise non-sponsored: an explicit zero-charge
    -- disposition, recorded in the ledger for audit, consuming nothing. It is
    -- reachable only for a job enqueued without partner sponsorship — a
    -- partner-sponsored job whose entitlement lookup fails lands in
    -- 'unauthorized' below, never here.
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
      and e.effective_at <= now()
      and (e.expires_at is null or e.expires_at > now())
    order by e.effective_at desc
    limit 1
    for update;

    if not found then
      v_result := 'unauthorized';
      v_eligibility := 'accounting_blocked';
    else
      -- The consumption unit: immutable IDs only, including the entitlement
      -- id, so two programs or two periods under one partner never
      -- cross-consume.
      v_unit_hash := encode(extensions.digest(convert_to(
        v_entitlement.partner_id::text || ':' || v_entitlement.id::text || ':'
          || v_job.person_id::text || ':' || v_job.matter_id::text,
        'utf8'), 'sha256'), 'hex');

      if exists (
        select 1 from public.packet_credit_ledger l
        where l.consumption_unit_hash = v_unit_hash
          and l.event_type in ('consumed', 'overage_consumed')
      ) then
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
            jsonb_build_object('packet_id', v_job.packet_id, 'route_id', v_job.route_id, 'entitlement_scope', v_entitlement.entitlement_scope)
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
      claim_expires_at = null
  where id = p_job_id;

  perform set_config('rcap.packet_mutation_authority', '', true);
  return query select v_result, v_eligibility, v_unit_hash, v_ledger_id;
end;
$$;

-------------------------------------------------------------------------------
-- 7. Delivery events. No fencing token: delivery is never worker authority.
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
  if p_event_type not in ('delivery_authorized', 'transmission_started', 'transmission_completed', 'transmission_aborted', 'transmission_failed') then
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

  if p_event_type = 'transmission_completed' and v_job.status = 'artifact_validated' then
    update public.packet_render_jobs
    set status = 'delivered'
    where id = p_job_id;
  end if;
  perform set_config('rcap.packet_mutation_authority', '', true);

  return v_event_id;
end;
$$;

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
-- 8. Storage bucket and the grant model — the actual mutation boundary.
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

-- Roles. Browser roles and the dedicated runtime roles exist on Supabase; a
-- bare test cluster creates them so the grant surface tested locally is the
-- grant surface that ships. The worker and delivery roles are DB-level
-- authority separation: each holds EXECUTE on its own function set only.
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'rcap_render_worker') then
    create role rcap_render_worker nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'rcap_packet_delivery') then
    create role rcap_packet_delivery nologin;
  end if;
end;
$$;

-- Drop the phase-49 service_role FOR ALL policies: direct DML for runtime
-- roles is exactly what the boundary forbids. RLS stays enabled with no
-- permissive policy for any runtime role.
drop policy if exists packet_render_jobs_service_role_all on public.packet_render_jobs;
drop policy if exists rcap_packet_credit_consumptions_service_role_all on public.rcap_packet_credit_consumptions;
drop policy if exists rcap_partner_packet_allocation_service_role_all on public.rcap_partner_packet_allocation;

alter table public.partner_packet_entitlement enable row level security;
alter table public.packet_credit_ledger enable row level security;
alter table public.packet_delivery_events enable row level security;

-- Table privileges. Supabase default privileges grant runtime roles broad
-- access on new tables; every write privilege is revoked here explicitly.
-- service_role keeps SELECT (reporting reads) and, on the entitlement table
-- only, INSERT/UPDATE (cap configuration is administrative config, not
-- accounting evidence; the ledger and jobs stay function-only).
do $$
declare
  v_table text;
  v_role text;
begin
  foreach v_table in array array[
    'public.packet_render_jobs',
    'public.partner_packet_entitlement',
    'public.packet_credit_ledger',
    'public.packet_delivery_events'
  ]
  loop
    execute format('revoke all on table %s from public', v_table);
    execute format('revoke all on table %s from anon', v_table);
    execute format('revoke all on table %s from authenticated', v_table);
    execute format('revoke all on table %s from rcap_render_worker', v_table);
    execute format('revoke all on table %s from rcap_packet_delivery', v_table);
    begin
      execute format('revoke all on table %s from service_role', v_table);
      execute format('grant select on table %s to service_role', v_table);
    exception when undefined_object then
      null; -- bare cluster without service_role
    end;
  end loop;

  begin
    execute 'grant insert, update on table public.partner_packet_entitlement to service_role';
  exception when undefined_object then
    null;
  end;
end;
$$;

-- Function execution. Worker functions to the worker role, delivery to the
-- delivery role; service_role holds both until the dedicated worker credential
-- ships (recorded in the worker deployment specification), and browser roles
-- hold none.
do $$
declare
  v_fn text;
  v_worker_fns text[] := array[
    'public.claim_packet_render_job(text, text[], integer)',
    'public.start_packet_render(uuid, uuid)',
    'public.start_packet_validation(uuid, uuid)',
    'public.fail_packet_render_job(uuid, uuid, text, text, boolean)',
    'public.finalize_packet_render_job(uuid, uuid, text, text, text, text, text, integer, integer, text)',
    'public.release_expired_packet_render_claims()',
    'public.requeue_retryable_packet_render_jobs()'
  ];
  v_delivery_fns text[] := array[
    'public.record_packet_delivery_event(uuid, text, uuid, jsonb)'
  ];
  v_server_fns text[] := array[
    'public.enqueue_packet_render_job(uuid, text, text, text, text, text, text, text, uuid, uuid, uuid, uuid, integer)',
    'public.requeue_packet_render_job_manual(uuid, text)',
    'public.packet_entitlement_balance(uuid)'
  ];
begin
  foreach v_fn in array v_worker_fns || v_delivery_fns || v_server_fns
  loop
    execute format('revoke all on function %s from public', v_fn);
    execute format('revoke all on function %s from anon', v_fn);
    execute format('revoke all on function %s from authenticated', v_fn);
    execute format('revoke all on function %s from rcap_render_worker', v_fn);
    execute format('revoke all on function %s from rcap_packet_delivery', v_fn);
    begin
      execute format('grant execute on function %s to service_role', v_fn);
    exception when undefined_object then
      null;
    end;
  end loop;

  foreach v_fn in array v_worker_fns
  loop
    execute format('grant execute on function %s to rcap_render_worker', v_fn);
  end loop;
  foreach v_fn in array v_delivery_fns
  loop
    execute format('grant execute on function %s to rcap_packet_delivery', v_fn);
  end loop;
end;
$$;

comment on table public.partner_packet_entitlement is
  'Packet-set capacity per partner and program, keyed on immutable partner_records.id. One active row per (partner, program); expired periods keep their history. Extends, never replaces, the screening-shaped partner_entitlement.';
comment on table public.packet_credit_ledger is
  'Append-only packet credit ledger. Balances derive from it; one consuming event per distinct supported matter, keyed on partner_id:entitlement_id:person_id:matter_id.';
comment on table public.packet_delivery_events is
  'Append-only transmission evidence recorded by the authenticated download route. transmission_completed is written only when the response stream closes cleanly; server completion never implies a human opened the file.';
comment on function public.finalize_packet_render_job(uuid, uuid, text, text, text, text, text, integer, integer, text) is
  'The canonical finalization: fencing, stored-byte re-read verification, artifact evidence, the exactly-once ledger event, the typed accounting result and delivery eligibility, in one transaction. The only path by which sponsored credit moves.';

commit;

-- Rollback notes
-- --------------
-- Forward-only companion to phase 49. To reverse phase 50 alone on an
-- environment where no packet rows exist:
--   1. drop the delivery/finalize/requeue/fail/start/claim/enqueue functions
--      and assert_packet_render_job_fencing, rcap_packet_mutation_authority;
--   2. drop packet_delivery_events, packet_credit_ledger,
--      partner_packet_entitlement and the guard trigger functions;
--   3. recreate the phase-49 claim function, transition guard and the two
--      accounting tables by re-running sections 2-5 of phase 49;
--   4. re-add the not null on source_sha256 and drop the phase-50 columns.
-- All phase-50 objects are new or empty at apply time; no pre-existing row is
-- affected.
