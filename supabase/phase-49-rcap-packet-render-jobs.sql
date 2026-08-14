-- Phase 49: durable packet render jobs and artifact-gated credit movement.
--
-- Migration file only; do not run against any database until authorized through
-- Roger's authorization queue. Forward-only and additive.
--
-- Apply after phase-48-rcap-document-artifact-storage.sql where that migration
-- is present. This file deliberately takes no foreign key on
-- rcap_document_artifacts so it can be applied independently: the job row
-- carries its own output_storage_path and output_sha256, which is what the
-- worker contract requires. Where phase 48 is applied, the artifact row and the
-- job row describe the same bytes and agree on checksum.
--
-- WHY THIS EXISTS
-- ---------------
-- Today a sponsored packet credit is consumed with no validated artifact in
-- existence. In src/app/api/expungement-ai/packet/generate/route.ts a credit is
-- recorded when packetStatus reaches 'ready':
--
--     if (packet.packetStatus === "ready" && isPartnerSponsored && partnerSessionId) {
--       await recordPartnerPacketGeneration(partnerSessionId);
--     }
--
-- and 'ready' is reached in src/lib/expungement-ai/packet-generation.ts by
-- buildConsumerPacketArtifact(), which returns an in-memory string with
-- contentType 'text/plain'. No PDF is produced, nothing is written to storage,
-- and nothing is parsed back. A partner's finite sponsored allocation is
-- therefore spent on an artifact that was never stored and may never have been
-- renderable.
--
-- The pdf-lib renderer on the captain branch does not close this: it is wired to
-- /api/rcap/documents/[packetId]/pdf/[pdfType], a different route. The
-- credit-consuming path is untouched by it.
--
-- This migration makes credit movement impossible without validated bytes:
--
--   * packet_render_jobs is the durable unit of work, with an explicit status
--     machine enforced by a trigger rather than by convention.
--   * Credit is consumed only by consume_rcap_packet_credit(), which refuses
--     unless the named job is in artifact_validated or delivered and carries a
--     real output checksum.
--   * One credit per distinct sponsored matter, enforced by a unique index, so
--     retries, re-downloads, corrected versions and failed attempts consume
--     nothing. This encodes the resolved We Must Vote allocation ruling.

begin;

-------------------------------------------------------------------------------
-- 1. Durable render jobs.
-------------------------------------------------------------------------------

create table if not exists public.packet_render_jobs (
  id uuid primary key default gen_random_uuid(),
  packet_id uuid not null
    references public.rcap_document_packets(id) on delete cascade,

  -- Which resolved route produced this job. Recorded so a defective route can
  -- be paused and its jobs identified without inspecting participant data.
  route_id text not null,

  -- Which renderer implementation is permitted to claim it. A worker claims
  -- only kinds it is built for; an unknown kind is never dispatched.
  renderer_kind text not null,

  -- Exact official source identity. The worker accepts only whitelisted SHAs,
  -- so a drifted or substituted source cannot be rendered silently.
  source_sha256 text not null,
  profile_id text not null,
  profile_version text not null,

  -- Hash of the server-derived render inputs. Two requests with identical
  -- inputs are the same job; this is the idempotency key for retries.
  input_hash text not null,

  status text not null default 'queued',
  attempt_count integer not null default 0,

  -- Populated only once bytes exist and have been parsed back.
  output_storage_path text,
  output_sha256 text,
  -- Content fingerprint with harmless metadata variance normalized away, so a
  -- byte-level difference in a timestamp does not read as a changed document.
  normalized_output_sha256 text,
  page_count integer,

  -- Non-identifying failure reason. Never a message, stack trace or PII.
  error_code text,

  -- Opaque worker identity holding the current claim.
  claimed_by text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  claimed_at timestamptz,
  rendering_at timestamptz,
  validating_at timestamptz,
  artifact_validated_at timestamptz,
  delivered_at timestamptz,

  constraint packet_render_jobs_status_check check (
    status in (
      'queued',
      'claimed',
      'rendering',
      'validating',
      'artifact_validated',
      'delivered',
      'failed'
    )
  ),
  constraint packet_render_jobs_attempt_count_check
    check (attempt_count >= 0),
  constraint packet_render_jobs_source_sha_check
    check (source_sha256 ~ '^[0-9a-f]{64}$'),
  constraint packet_render_jobs_input_hash_check
    check (input_hash ~ '^[0-9a-f]{64}$'),
  constraint packet_render_jobs_output_sha_check
    check (output_sha256 is null or output_sha256 ~ '^[0-9a-f]{64}$'),
  constraint packet_render_jobs_normalized_sha_check
    check (normalized_output_sha256 is null or normalized_output_sha256 ~ '^[0-9a-f]{64}$'),
  constraint packet_render_jobs_page_count_check
    check (page_count is null or page_count > 0),
  constraint packet_render_jobs_error_code_check check (
    error_code is null or error_code in (
      'source_not_whitelisted',
      'profile_unknown',
      'render_failed',
      'invalid_pdf_output',
      'page_count_mismatch',
      'protected_field_populated',
      'storage_write_failed',
      'storage_readback_failed',
      'checksum_mismatch',
      'timeout',
      'worker_crashed'
    )
  ),

  -- A validated job must be able to prove itself: the terminal success states
  -- are unreachable without a stored path and a checksum. This is the database
  -- half of "ready means stored bytes exist".
  constraint packet_render_jobs_validated_requires_output check (
    status not in ('artifact_validated', 'delivered')
    or (
      output_storage_path is not null
      and output_storage_path <> ''
      and output_sha256 is not null
    )
  ),
  constraint packet_render_jobs_failed_requires_code check (
    status <> 'failed' or error_code is not null
  )
);

-- Idempotency. One live job per identical input; a retry finds the existing row
-- instead of creating a second unit of work that could be credited twice.
-- Failed jobs are excluded so a genuine retry after failure is permitted.
create unique index if not exists packet_render_jobs_input_hash_live_unique
  on public.packet_render_jobs(packet_id, input_hash)
  where status <> 'failed';

-- Claim scan: oldest queued job of a renderer kind the worker supports.
create index if not exists packet_render_jobs_claimable_idx
  on public.packet_render_jobs(renderer_kind, created_at)
  where status = 'queued';

create index if not exists packet_render_jobs_packet_idx
  on public.packet_render_jobs(packet_id, created_at);

comment on table public.packet_render_jobs is
  'Durable unit of packet rendering work. Terminal success requires stored bytes that were read back and checksummed; credit movement is gated on it.';
comment on column public.packet_render_jobs.input_hash is
  'Hash of server-derived render inputs. Idempotency key: identical inputs are the same job, so a retry cannot double-consume credit.';
comment on column public.packet_render_jobs.normalized_output_sha256 is
  'Content fingerprint with harmless metadata variance normalized away, so benign byte differences do not read as a changed document.';

-------------------------------------------------------------------------------
-- 2. Status machine.
--
--    Enforced by trigger. A boolean edit cannot skip validation and land a job
--    in a creditable state.
-------------------------------------------------------------------------------

create or replace function public.packet_render_jobs_guard_transition()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  allowed text[];
begin
  if new.status = old.status then
    new.updated_at := now();
    return new;
  end if;

  allowed := case old.status
    when 'queued'             then array['claimed', 'failed']
    when 'claimed'            then array['rendering', 'failed', 'queued']
    when 'rendering'          then array['validating', 'failed']
    when 'validating'         then array['artifact_validated', 'failed']
    when 'artifact_validated' then array['delivered']
    when 'delivered'          then array[]::text[]
    when 'failed'             then array['queued']
    else array[]::text[]
  end;

  if not (new.status = any (allowed)) then
    raise exception
      'illegal packet_render_jobs transition % -> %', old.status, new.status
      using errcode = 'check_violation';
  end if;

  -- Stamp the timestamp for the state being entered.
  new.claimed_at            := case when new.status = 'claimed'            then now() else new.claimed_at end;
  new.rendering_at          := case when new.status = 'rendering'          then now() else new.rendering_at end;
  new.validating_at         := case when new.status = 'validating'         then now() else new.validating_at end;
  new.artifact_validated_at := case when new.status = 'artifact_validated' then now() else new.artifact_validated_at end;
  new.delivered_at          := case when new.status = 'delivered'          then now() else new.delivered_at end;

  -- Releasing a claim clears the holder so the job is claimable again.
  if new.status = 'queued' then
    new.claimed_by := null;
    new.claimed_at := null;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists packet_render_jobs_guard_transition on public.packet_render_jobs;
create trigger packet_render_jobs_guard_transition
before update on public.packet_render_jobs
for each row
execute function public.packet_render_jobs_guard_transition();

-------------------------------------------------------------------------------
-- 3. Atomic claim.
--
--    FOR UPDATE SKIP LOCKED so parallel workers never claim the same job and a
--    slow worker never blocks the queue.
-------------------------------------------------------------------------------

create or replace function public.claim_packet_render_job(
  p_worker_id text,
  p_renderer_kinds text[]
)
returns setof public.packet_render_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_worker text;
  v_id uuid;
begin
  v_worker := nullif(trim(p_worker_id), '');
  if v_worker is null then
    raise exception 'worker id is required';
  end if;
  if p_renderer_kinds is null or array_length(p_renderer_kinds, 1) is null then
    raise exception 'at least one renderer kind is required';
  end if;

  select id into v_id
  from public.packet_render_jobs
  where status = 'queued'
    and renderer_kind = any (p_renderer_kinds)
  order by created_at
  for update skip locked
  limit 1;

  if v_id is null then
    return;
  end if;

  return query
  update public.packet_render_jobs
  set status = 'claimed',
      claimed_by = v_worker,
      attempt_count = attempt_count + 1
  where id = v_id
  returning *;
end;
$$;

comment on function public.claim_packet_render_job(text, text[]) is
  'Atomically claims one queued job for a worker. SKIP LOCKED: parallel workers never claim the same job.';

-------------------------------------------------------------------------------
-- 4. Sponsored allocation, separate from the screening-shaped entitlement row.
--
--    partner_entitlement counts screenings and must not be overloaded to count
--    packets: the reporting ruling keeps unique participants, completed
--    screenings, supported matters and packet sets as four separate numbers.
-------------------------------------------------------------------------------

create table if not exists public.rcap_partner_packet_allocation (
  partner_slug text primary key
    references public.partner_records(partner_slug) on delete restrict,
  packets_allowed integer not null default 0,
  contract_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint rcap_partner_packet_allocation_allowed_check
    check (packets_allowed >= 0)
);

comment on table public.rcap_partner_packet_allocation is
  'Contracted sponsored packet sets per partner. Separate from partner_entitlement, which counts screenings; the two are never blended in reporting.';

-------------------------------------------------------------------------------
-- 5. Credit movement, gated on a validated artifact.
--
--    Implements the resolved sponsored allocation ruling: one unit per distinct
--    supported matter, consumed on the first validated packet set. Retries,
--    downloads, re-downloads, corrected versions and failed attempts consume
--    nothing, because consumption is keyed on the matter and requires a
--    validated job.
-------------------------------------------------------------------------------

create table if not exists public.rcap_packet_credit_consumptions (
  id uuid primary key default gen_random_uuid(),
  partner_slug text not null
    references public.partner_records(partner_slug) on delete restrict,

  -- One distinct supported matter. A participant with several matters consumes
  -- one unit per matter; the same matter never consumes twice.
  matter_id text not null,

  -- The validated job that justified this consumption. Evidence, not decoration:
  -- consume_rcap_packet_credit() will not write a row without one.
  render_job_id uuid not null
    references public.packet_render_jobs(id) on delete restrict,

  -- 'included' within contracted allocation, 'overage' inside the internal
  -- continuity reserve. Overage is delivered, non-billable, and never presented
  -- to the partner as capacity.
  consumption_class text not null,

  consumed_at timestamptz not null default now(),

  constraint rcap_packet_credit_consumptions_class_check
    check (consumption_class in ('included', 'overage')),
  constraint rcap_packet_credit_consumptions_matter_check
    check (matter_id <> ''),
  -- The idempotency guarantee for credit: one unit per partner per matter.
  constraint rcap_packet_credit_consumptions_matter_unique
    unique (partner_slug, matter_id)
);

create index if not exists rcap_packet_credit_consumptions_partner_idx
  on public.rcap_packet_credit_consumptions(partner_slug, consumed_at);

comment on table public.rcap_packet_credit_consumptions is
  'One sponsored unit per distinct supported matter, each justified by a validated render job. Retries, re-downloads and failures never appear here.';

create or replace function public.consume_rcap_packet_credit(
  p_partner_slug text,
  p_matter_id text,
  p_render_job_id uuid
)
returns table (
  ok boolean,
  reason text,
  consumption_class text,
  units_used integer
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_partner text;
  v_matter text;
  v_status text;
  v_output text;
  v_allowed integer;
  v_used integer;
  v_class text;
begin
  v_partner := nullif(trim(p_partner_slug), '');
  v_matter := nullif(trim(p_matter_id), '');

  if v_partner is null or v_matter is null then
    return query select false, 'invalid_input'::text, null::text, null::integer;
    return;
  end if;

  -- The gate. Credit cannot move ahead of validated, stored bytes.
  select status, output_sha256 into v_status, v_output
  from public.packet_render_jobs
  where id = p_render_job_id;

  if v_status is null then
    return query select false, 'render_job_not_found'::text, null::text, null::integer;
    return;
  end if;

  if v_status not in ('artifact_validated', 'delivered') or v_output is null then
    return query select false, 'artifact_not_validated'::text, null::text, null::integer;
    return;
  end if;

  -- Already consumed for this matter: report success without moving anything.
  -- A retry is not an error and must not spend a second unit.
  -- Column is qualified: consumption_class is also an OUT parameter of this
  -- function, and an unqualified reference is ambiguous.
  select c.consumption_class into v_class
  from public.rcap_packet_credit_consumptions c
  where c.partner_slug = v_partner and c.matter_id = v_matter;

  if v_class is not null then
    select count(*)::integer into v_used
    from public.rcap_packet_credit_consumptions c
    where c.partner_slug = v_partner;
    return query select true, 'already_consumed'::text, v_class, v_used;
    return;
  end if;

  select a.packets_allowed into v_allowed
  from public.rcap_partner_packet_allocation a
  where a.partner_slug = v_partner;

  -- No allocation row means no sponsored capacity was ever granted. Fail closed
  -- rather than inventing one.
  if v_allowed is null then
    return query select false, 'no_allocation'::text, null::text, null::integer;
    return;
  end if;

  select count(*)::integer into v_used
  from public.rcap_packet_credit_consumptions c
  where c.partner_slug = v_partner;

  if v_used < v_allowed then
    v_class := 'included';
  elsif v_used < v_allowed + 10 then
    -- Internal continuity reserve. Delivered and non-billable; never surfaced
    -- to the partner as available capacity.
    v_class := 'overage';
  else
    return query select false, 'reserve_exhausted'::text, null::text, v_used;
    return;
  end if;

  insert into public.rcap_packet_credit_consumptions
    (partner_slug, matter_id, render_job_id, consumption_class)
  values (v_partner, v_matter, p_render_job_id, v_class)
  on conflict (partner_slug, matter_id) do nothing;

  select count(*)::integer into v_used
  from public.rcap_packet_credit_consumptions c
  where c.partner_slug = v_partner;

  return query select true, 'consumed'::text, v_class, v_used;
end;
$$;

comment on function public.consume_rcap_packet_credit(text, text, uuid) is
  'The only sanctioned path for sponsored credit movement. Refuses unless the named render job reached artifact_validated with a stored checksum.';

-------------------------------------------------------------------------------
-- 6. Row level security. Server-only, as with the artifact tables.
-------------------------------------------------------------------------------

alter table public.packet_render_jobs enable row level security;
alter table public.rcap_packet_credit_consumptions enable row level security;
alter table public.rcap_partner_packet_allocation enable row level security;

drop policy if exists packet_render_jobs_service_role_all on public.packet_render_jobs;
create policy packet_render_jobs_service_role_all
  on public.packet_render_jobs for all to service_role
  using (true) with check (true);

drop policy if exists rcap_packet_credit_consumptions_service_role_all
  on public.rcap_packet_credit_consumptions;
create policy rcap_packet_credit_consumptions_service_role_all
  on public.rcap_packet_credit_consumptions for all to service_role
  using (true) with check (true);

drop policy if exists rcap_partner_packet_allocation_service_role_all
  on public.rcap_partner_packet_allocation;
create policy rcap_partner_packet_allocation_service_role_all
  on public.rcap_partner_packet_allocation for all to service_role
  using (true) with check (true);

commit;

-- Rollback notes
-- --------------
-- Additive; reversible without data loss to pre-existing tables:
--   1. drop function if exists public.consume_rcap_packet_credit(text, text, uuid);
--   2. drop function if exists public.claim_packet_render_job(text, text[]);
--   3. drop table if exists public.rcap_packet_credit_consumptions;
--   4. drop table if exists public.rcap_partner_packet_allocation;
--   5. drop trigger if exists packet_render_jobs_guard_transition on public.packet_render_jobs;
--      drop function if exists public.packet_render_jobs_guard_transition();
--   6. drop table if exists public.packet_render_jobs;
