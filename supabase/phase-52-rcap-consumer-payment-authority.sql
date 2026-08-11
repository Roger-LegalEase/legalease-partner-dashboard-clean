-- Phase 52 — consumer payment authority
--
-- Closes the four failures Terminal B proved against the phase-51 gate
-- (data/rcap-render/phase51-consumer-payment-security.json, audit commit
-- f82f842). Phase 51 asked the right question — "is this item paid?" — but
-- trusted an answer the payer could write, and bound the answer to the wrong
-- key. This phase fixes both, additively. Phases 49, 50 and 51 are not
-- rewritten; every object here is created, added or replaced forward.
--
--   G1  / G1b  an authenticated participant wrote payment_status='paid',
--              amount_cents=5000 on their own row and opened delivery. The
--              phase-26 RLS UPDATE policy scopes rows, not columns, so
--              ownership of the row carried the right to assert the payment.
--   G11        one paid item authorized a second distinct matter, because the
--              consumption unit hashed the RENDER JOB ID. Every new job is a
--              new id, so every new job was a new authorization.
--   G12        participant B's paid item authorized a job for participant A:
--              the probe took only the item id and never asked who owned it.
--
-- The corrections, in the same order:
--
--   1. Payment facts become columns anon and authenticated hold no privilege
--      on. RLS keeps deciding WHICH ROW; column grants now decide WHICH
--      FIELDS, and payment is not among them.
--   2. Legitimate payment writes go through one SECURITY DEFINER RPC reachable
--      only by a server role, which stamps its own provider evidence.
--   3. The consumption unit is keyed on the Briefcase item and the provider
--      receipt — the things a payment actually buys — never on a job id.
--   4. Every consumer render job carries an immutable four-tuple, and
--      finalization proves the paid item is the exact item owned by the job's
--      own consumer.
--
-- Applied after: 26, 27, 28, 49, 50, 51.

begin;

-------------------------------------------------------------------------------
-- 1. Currency and server-written provider evidence.
--
-- The audit recorded that consumer_briefcase_items has no currency column, so
-- the USD clause of the payment requirement had nothing to bind to. It does
-- now. provider_event_id is the authoritative receipt identifier; it is unique,
-- so one provider event can never be replayed onto a second item, and it is
-- writable only by the server path in section 3.
-------------------------------------------------------------------------------

-- Guarded on table presence for the same reason phase 51's probe resolves
-- dynamically: consumer_briefcase_items references auth.users and is absent
-- from the partner-only schemas the delivery verifiers build. A missing table
-- must mean "no consumer payment can be proven", which is the fail-closed
-- answer, not a migration that refuses to apply.
do $consumer_columns$
begin
  if to_regclass('public.consumer_briefcase_items') is null then
    raise notice 'phase-52: consumer_briefcase_items absent; payment-fact hardening skipped (fails closed)';
    return;
  end if;

  execute $ddl$
    alter table public.consumer_briefcase_items
      add column if not exists currency text,
      add column if not exists provider_event_id text,
      add column if not exists payment_authority text,
      add column if not exists payment_recorded_at timestamptz,
      add column if not exists payment_recorded_by text
  $ddl$;

  execute $ddl$
    alter table public.consumer_briefcase_items
      drop constraint if exists consumer_briefcase_items_currency_check,
      add constraint consumer_briefcase_items_currency_check
        check (currency is null or currency = 'usd')
  $ddl$;

  execute $ddl$
    alter table public.consumer_briefcase_items
      drop constraint if exists consumer_briefcase_items_payment_authority_check,
      add constraint consumer_briefcase_items_payment_authority_check
        check (payment_authority is null or payment_authority in ('server_webhook', 'server_admin'))
  $ddl$;

  -- A provider receipt is single-use. This is the second of the two keys the
  -- consumption unit may be built on, so it has to be unique at the source.
  execute $ddl$
    create unique index if not exists consumer_briefcase_items_provider_event_uk
      on public.consumer_briefcase_items(provider_event_id)
      where provider_event_id is not null
  $ddl$;

  -- A row that claims to be paid must carry the evidence that it was the server
  -- that said so. This is what makes a hand-written 'paid' insufficient even if
  -- a privilege were ever mis-granted again.
  execute $ddl$
    alter table public.consumer_briefcase_items
      drop constraint if exists consumer_briefcase_items_paid_requires_server_evidence,
      add constraint consumer_briefcase_items_paid_requires_server_evidence
        check (
          payment_status <> 'paid'
          or (
            payment_authority is not null
            and provider_event_id is not null
            and payment_recorded_at is not null
            and amount_cents = 5000
            and currency = 'usd'
          )
        )
  $ddl$;
end
$consumer_columns$;

-------------------------------------------------------------------------------
-- 2. Requirement 1 and 2 — anon and authenticated lose every payment column,
--    and keep everything else.
--
-- Row-level security answers "which rows"; it has never answered "which
-- columns". That is the whole of G1: the participant owned the row, so the
-- policy passed, and payment_status was just another field on it. Column-level
-- privileges are the mechanism Postgres provides for the second question.
--
-- The safe set is computed rather than listed so that a column added by a
-- later phase is granted by default and only the enumerated payment facts are
-- withheld. A future payment column must be added to v_payment_cols; the
-- verifier in scripts/verify-rcap-phase52-consumer-payment-authority.mjs fails
-- if a column matching the payment vocabulary is grantable.
-------------------------------------------------------------------------------

do $grants$
declare
  v_payment_cols text[] := array[
    'payment_status', 'amount_cents', 'currency', 'payment_provider',
    'checkout_session_id', 'payment_intent_id', 'receipt_url',
    'provider_event_id', 'payment_authority', 'payment_recorded_at',
    'payment_recorded_by'
  ];
  v_safe text;
begin
  if to_regclass('public.consumer_briefcase_items') is null then
    raise notice 'phase-52: consumer_briefcase_items absent; column grants skipped';
    return;
  end if;

  -- Table-wide write privilege is withdrawn first: a column grant cannot
  -- narrow an existing table grant, it can only sit beside it.
  if exists (select 1 from pg_roles where rolname = 'anon') then
    execute 'revoke insert, update on public.consumer_briefcase_items from anon';
  end if;
  if exists (select 1 from pg_roles where rolname = 'authenticated') then
    execute 'revoke insert, update on public.consumer_briefcase_items from authenticated';
  else
    raise notice 'phase-52: role authenticated absent; column grants skipped';
    return;
  end if;

  select string_agg(quote_ident(c.column_name), ', ' order by c.ordinal_position)
    into v_safe
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = 'consumer_briefcase_items'
    and c.column_name <> all (v_payment_cols);

  if v_safe is null then
    raise exception 'phase-52: consumer_briefcase_items has no non-payment columns to grant';
  end if;

  -- Requirement 2: the safe nonpayment Briefcase surface stays open, so
  -- creating an item, renaming it, and moving it through its non-payment
  -- status remain ordinary authenticated writes.
  execute format('grant insert (%s) on public.consumer_briefcase_items to authenticated', v_safe);
  execute format('grant update (%s) on public.consumer_briefcase_items to authenticated', v_safe);

  -- anon writes nothing at all. Reads are unchanged and still filtered by RLS.
  execute 'grant select on public.consumer_briefcase_items to authenticated';
end
$grants$;

-------------------------------------------------------------------------------
-- 3. Requirement 3 and 10 — the only path that may write a payment fact.
--
-- SECURITY DEFINER, revoked from public, anon and authenticated, granted to
-- service_role only. The caller supplies the provider's facts; the function
-- supplies the authority stamp, so 'this was recorded by the server' is not
-- something a caller can assert about itself.
--
-- Requirement 10 is enforced here and again in the constraint above: paid
-- status, exactly 5000 cents, USD, and a provider event id that no other row
-- holds.
-------------------------------------------------------------------------------

create or replace function public.record_consumer_packet_payment(
  p_briefcase_item_id uuid,
  p_payment_status text,
  p_amount_cents integer,
  p_currency text,
  p_payment_provider text,
  p_provider_event_id text,
  p_checkout_session_id text,
  p_payment_intent_id text,
  p_receipt_url text,
  p_authority text,
  p_recorded_by text
)
returns table (
  outcome text,
  briefcase_item_id uuid,
  provider_event_id text
)
language plpgsql
security definer
set search_path = ''
as $record$
declare
  -- Scalars, not %rowtype: a composite type declaration is resolved when the
  -- function is CREATED, which would make this migration unappliable to a
  -- partner-only schema. Everything below resolves at call time instead.
  v_existing_event text;
  v_found boolean;
begin
  if to_regclass('public.consumer_briefcase_items') is null then
    return query select 'no_payment_storage'::text, p_briefcase_item_id, null::text;
    return;
  end if;

  if p_briefcase_item_id is null then
    return query select 'invalid_item'::text, null::uuid, null::text;
    return;
  end if;

  if coalesce(p_authority, '') not in ('server_webhook', 'server_admin') then
    return query select 'invalid_authority'::text, p_briefcase_item_id, null::text;
    return;
  end if;

  execute
    'select true, b.provider_event_id from public.consumer_briefcase_items b
      where b.id = $1 for update'
  into v_found, v_existing_event
  using p_briefcase_item_id;

  if not coalesce(v_found, false) then
    return query select 'item_not_found'::text, p_briefcase_item_id, null::text;
    return;
  end if;

  if p_payment_status = 'paid' then
    if p_amount_cents is distinct from 5000
       or lower(coalesce(p_currency, '')) <> 'usd'
       or nullif(trim(coalesce(p_provider_event_id, '')), '') is null then
      return query select 'invalid_payment_evidence'::text, p_briefcase_item_id, null::text;
      return;
    end if;

    -- Requirement 10: the receipt is unique. A replayed provider event is a
    -- typed refusal, never a second authorization and never a raw 23505.
    begin
      execute
        'update public.consumer_briefcase_items
            set payment_status = ''paid'',
                amount_cents = 5000,
                currency = ''usd'',
                payment_provider = coalesce($2, payment_provider),
                checkout_session_id = coalesce($3, checkout_session_id),
                payment_intent_id = coalesce($4, payment_intent_id),
                receipt_url = coalesce($5, receipt_url),
                provider_event_id = $6,
                payment_authority = $7,
                payment_recorded_at = now(),
                payment_recorded_by = $8
          where id = $1'
      using p_briefcase_item_id, p_payment_provider, p_checkout_session_id,
            p_payment_intent_id, p_receipt_url, trim(p_provider_event_id),
            p_authority, p_recorded_by;
    exception when unique_violation then
      return query select 'duplicate_provider_event'::text, p_briefcase_item_id, trim(p_provider_event_id);
      return;
    end;

    return query select 'recorded_paid'::text, p_briefcase_item_id, trim(p_provider_event_id);
    return;
  end if;

  if p_payment_status not in ('not_applicable', 'unpaid', 'refunded') then
    return query select 'invalid_status'::text, p_briefcase_item_id, null::text;
    return;
  end if;

  -- Requirement 11 and 12: a refund is recorded here and nowhere else. The
  -- consumption row written at first delivery is deliberately NOT removed —
  -- see section 6 — so the artifact already delivered survives the refund
  -- while no new authority is created by it.
  execute
    'update public.consumer_briefcase_items
        set payment_status = $2,
            payment_authority = $3,
            payment_recorded_at = now(),
            payment_recorded_by = $4
      where id = $1'
  using p_briefcase_item_id, p_payment_status, p_authority, p_recorded_by;

  return query select ('recorded_' || p_payment_status)::text, p_briefcase_item_id, v_existing_event;
end;
$record$;

revoke all on function public.record_consumer_packet_payment(
  uuid, text, integer, text, text, text, text, text, text, text, text) from public;
revoke all on function public.record_consumer_packet_payment(
  uuid, text, integer, text, text, text, text, text, text, text, text) from anon;
revoke all on function public.record_consumer_packet_payment(
  uuid, text, integer, text, text, text, text, text, text, text, text) from authenticated;

do $grant_server$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant execute on function public.record_consumer_packet_payment('
         || 'uuid, text, integer, text, text, text, text, text, text, text, text) to service_role';
  end if;
end
$grant_server$;

-------------------------------------------------------------------------------
-- 4. Requirement 4 — the immutable consumer binding on the render job.
--
-- person_id and matter_id already exist from phase 50. The two consumer
-- identifiers are added here so that a job states, once and permanently, which
-- Briefcase item and which authenticated participant it renders for. G12 was
-- possible because the job named an item but never named an owner, so any
-- item's payment answered for any job.
-------------------------------------------------------------------------------

alter table public.packet_render_jobs
  add column if not exists consumer_briefcase_item_id uuid,
  add column if not exists consumer_auth_user_id uuid;

create index if not exists packet_render_jobs_consumer_item_idx
  on public.packet_render_jobs(consumer_briefcase_item_id)
  where consumer_briefcase_item_id is not null;

-- Immutable once set. A binding that can be re-pointed after the fact is not a
-- binding: it would let a job be enqueued against an unpaid item and swung onto
-- a paid one before finalization.
create or replace function public.packet_render_jobs_consumer_binding_immutable()
returns trigger
language plpgsql
as $immutable$
begin
  if tg_op = 'UPDATE' then
    if old.consumer_briefcase_item_id is not null
       and new.consumer_briefcase_item_id is distinct from old.consumer_briefcase_item_id then
      raise exception 'packet_render_jobs: consumer_briefcase_item_id is immutable once set';
    end if;
    if old.consumer_auth_user_id is not null
       and new.consumer_auth_user_id is distinct from old.consumer_auth_user_id then
      raise exception 'packet_render_jobs: consumer_auth_user_id is immutable once set';
    end if;
    if old.person_id is not null and new.person_id is distinct from old.person_id then
      raise exception 'packet_render_jobs: person_id is immutable once set';
    end if;
    if old.matter_id is not null and new.matter_id is distinct from old.matter_id then
      raise exception 'packet_render_jobs: matter_id is immutable once set';
    end if;
  end if;
  return new;
end;
$immutable$;

drop trigger if exists packet_render_jobs_consumer_binding_immutable_trg on public.packet_render_jobs;
create trigger packet_render_jobs_consumer_binding_immutable_trg
  before update on public.packet_render_jobs
  for each row
  execute function public.packet_render_jobs_consumer_binding_immutable();

-------------------------------------------------------------------------------
-- 5. Requirement 5 — the owner-scoped payment authority probe.
--
-- Replaces the phase-51 probe's question. Phase 51 asked "is item X paid?".
-- This asks "is item X paid, and is X owned by the participant this job is
-- bound to, and did the server write that payment?". G12 fails at the second
-- clause and a forged row fails at the third.
--
-- Dynamic resolution is kept from phase 51 for the same reason: a schema
-- without consumer_briefcase_items must fail closed rather than raise.
-------------------------------------------------------------------------------

create or replace function public.consumer_packet_payment_authority(
  p_briefcase_item_id uuid,
  p_consumer_auth_user_id uuid
)
returns table (
  valid boolean,
  reason text,
  provider_event_id text
)
language plpgsql
stable
security definer
set search_path = ''
as $authority$
declare
  v_status text;
  v_amount integer;
  v_currency text;
  v_owner uuid;
  v_event text;
  v_authority text;
begin
  if p_briefcase_item_id is null then
    return query select false, 'no_briefcase_item'::text, null::text;
    return;
  end if;

  if p_consumer_auth_user_id is null then
    return query select false, 'no_consumer_binding'::text, null::text;
    return;
  end if;

  if to_regclass('public.consumer_briefcase_items') is null then
    return query select false, 'no_payment_storage'::text, null::text;
    return;
  end if;

  execute
    'select b.payment_status, b.amount_cents, b.currency, b.user_id,
            b.provider_event_id, b.payment_authority
       from public.consumer_briefcase_items b
      where b.id = $1'
  into v_status, v_amount, v_currency, v_owner, v_event, v_authority
  using p_briefcase_item_id;

  if v_status is null and v_owner is null then
    return query select false, 'item_not_found'::text, null::text;
    return;
  end if;

  -- G12: the payment must belong to the participant the job is bound to.
  if v_owner is distinct from p_consumer_auth_user_id then
    return query select false, 'owner_mismatch'::text, null::text;
    return;
  end if;

  -- Requirement 11: refunded, unpaid and not_applicable all block here, before
  -- any consumption row is written.
  if v_status is distinct from 'paid' then
    return query select false, ('payment_status_' || coalesce(v_status, 'null'))::text, null::text;
    return;
  end if;

  if v_amount is distinct from 5000 then
    return query select false, 'amount_not_product_price'::text, null::text;
    return;
  end if;

  if lower(coalesce(v_currency, '')) <> 'usd' then
    return query select false, 'currency_not_usd'::text, null::text;
    return;
  end if;

  -- G1: a payment with no server authority stamp is not a payment.
  if v_authority is null or nullif(trim(coalesce(v_event, '')), '') is null then
    return query select false, 'no_server_payment_evidence'::text, null::text;
    return;
  end if;

  return query select true, 'authorized'::text, v_event;
end;
$authority$;

revoke all on function public.consumer_packet_payment_authority(uuid, uuid) from public;
revoke all on function public.consumer_packet_payment_authority(uuid, uuid) from anon;

-------------------------------------------------------------------------------
-- 6. Requirement 6, 7, 8, 12 — the consumption unit.
--
-- G11's root cause: phase 51 hashed 'zero_charge:' || job.id. A render job id
-- is minted per job, so the unit was unique per job and one payment authorized
-- an unbounded number of them. What a $50 consumer payment buys is a packet for
-- ONE Briefcase item on ONE matter, so that is what the unit records, with the
-- provider receipt carried alongside as the second unique key.
--
-- The row survives a later refund on purpose (requirement 12): it is the
-- evidence that a delivery already happened, so the delivered artifact keeps
-- working while the refunded payment authorizes nothing new.
-------------------------------------------------------------------------------

create table if not exists public.consumer_packet_payment_consumption (
  id uuid primary key default gen_random_uuid(),
  consumer_briefcase_item_id uuid not null,
  consumer_auth_user_id uuid not null,
  provider_event_id text,
  person_id uuid,
  matter_id uuid not null,
  first_render_job_id uuid not null,
  consumption_unit_hash text not null,
  created_at timestamptz not null default now()
);

-- Requirement 6, first key: one Briefcase item authorizes one consumption.
create unique index if not exists consumer_packet_payment_consumption_item_uk
  on public.consumer_packet_payment_consumption(consumer_briefcase_item_id);

-- Requirement 6, second key: one authoritative provider receipt likewise.
create unique index if not exists consumer_packet_payment_consumption_receipt_uk
  on public.consumer_packet_payment_consumption(provider_event_id)
  where provider_event_id is not null;

alter table public.consumer_packet_payment_consumption enable row level security;

-- No policy is created, so with RLS enabled anon and authenticated reach no
-- rows at all. Only SECURITY DEFINER functions and the service role touch this.
revoke all on table public.consumer_packet_payment_consumption from anon;
revoke all on table public.consumer_packet_payment_consumption from authenticated;

-------------------------------------------------------------------------------
-- 7. The typed results.
--
-- The phase-50 constraint packet_render_jobs_eligible_requires_accounting_check
-- restricts 'eligible' to consumed / already_consumed / overage_consumed /
-- zero_charge. Every value added here is therefore structurally incapable of
-- being marked deliverable — the same property phase 51 relied on, extended
-- rather than altered.
--
-- Requirement 8 is consumer_payment_matter_conflict: a typed blocked result,
-- not an error and not a silent pass.
-------------------------------------------------------------------------------

alter table public.packet_render_jobs
  drop constraint if exists packet_render_jobs_accounting_result_check,
  add constraint packet_render_jobs_accounting_result_check check (
    accounting_result is null or accounting_result in (
      'consumed', 'already_consumed', 'overage_consumed', 'zero_charge',
      'cap_reached', 'not_validated', 'not_found', 'unauthorized',
      'consumer_payment_required',
      'consumer_payment_matter_conflict',
      'consumer_payment_owner_mismatch',
      'consumer_payment_conflict'
    )
  );

-------------------------------------------------------------------------------
-- 8. Finalization.
--
-- Identical to phase 51 apart from the unsponsored branch. Requirement 13 is
-- satisfied by that fact: the partner branch below is byte-for-byte the phase-50
-- and phase-51 logic, so sponsored packet accounting is unchanged.
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
  v_auth record;
  v_existing public.consumer_packet_payment_consumption%rowtype;
begin
  select * into v_job from public.packet_render_jobs where id = p_job_id for update;
  if not found then
    return query select 'not_found'::text, 'not_evaluated'::text, null::text, null::uuid;
    return;
  end if;

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
    ---------------------------------------------------------------------------
    -- Unsponsored: the consumer payment is the whole authority.
    --
    -- The item checked is the job's own immutable binding, falling back to the
    -- phase-50 briefcase_item_id only when the phase-52 column was never
    -- populated — an older job, which then has no consumer_auth_user_id and so
    -- fails closed at the owner clause rather than silently reverting to the
    -- phase-51 behaviour.
    ---------------------------------------------------------------------------
    select * into v_auth
    from public.consumer_packet_payment_authority(
      coalesce(v_job.consumer_briefcase_item_id, v_job.briefcase_item_id),
      v_job.consumer_auth_user_id
    );

    -- Requirement 4 is a four-tuple, and a consumer job missing any part of it
    -- is not a consumer job this gate can reason about. A null matter in
    -- particular would make the consumption unit meaningless — every matterless
    -- job would collide on one row — so it is refused in the typed vocabulary
    -- rather than allowed to raise a not-null violation out of the insert.
    if v_auth.valid and v_job.matter_id is null then
      v_result := 'consumer_payment_required';
      v_eligibility := 'accounting_blocked';
    elsif not v_auth.valid then
      v_result := case
        when v_auth.reason = 'owner_mismatch' then 'consumer_payment_owner_mismatch'
        else 'consumer_payment_required'
      end;
      v_eligibility := 'accounting_blocked';

      -- Requirement 12: a refund after delivery must not revoke what was already
      -- delivered. If this exact item and matter already consumed, the delivery
      -- stands and re-finalization converges on it instead of blocking.
      select * into v_existing
      from public.consumer_packet_payment_consumption
      where consumer_briefcase_item_id = coalesce(v_job.consumer_briefcase_item_id, v_job.briefcase_item_id)
        and matter_id = v_job.matter_id;

      if found and v_job.consumer_auth_user_id is not null
         and v_existing.consumer_auth_user_id = v_job.consumer_auth_user_id then
        v_unit_hash := v_existing.consumption_unit_hash;
        v_result := 'zero_charge';
        v_eligibility := 'eligible';
        select l.id into v_ledger_id
        from public.packet_credit_ledger l
        where l.consumption_unit_hash = v_unit_hash
        order by l.created_at
        limit 1;
      end if;
    else
      -- Requirement 6: the unit is the item and the matter. Not the job.
      v_unit_hash := encode(extensions.digest(convert_to(
        'consumer_payment:'
          || coalesce(v_job.consumer_briefcase_item_id, v_job.briefcase_item_id)::text
          || ':' || coalesce(v_auth.provider_event_id, '')
          || ':' || v_job.matter_id::text,
        'utf8'), 'sha256'), 'hex');

      select * into v_existing
      from public.consumer_packet_payment_consumption
      where consumer_briefcase_item_id = coalesce(v_job.consumer_briefcase_item_id, v_job.briefcase_item_id);

      if found then
        if v_existing.matter_id = v_job.matter_id then
          -- Requirement 7: same item, same matter. Idempotent; the original
          -- consumption stands and no second ledger row is written.
          v_unit_hash := v_existing.consumption_unit_hash;
          v_result := 'zero_charge';
          v_eligibility := 'eligible';
          select l.id into v_ledger_id
          from public.packet_credit_ledger l
          where l.consumption_unit_hash = v_unit_hash
          order by l.created_at
          limit 1;
        else
          -- Requirement 8: same item, different matter. This is G11, and it is
          -- now a typed blocked result rather than a second free packet.
          v_result := 'consumer_payment_matter_conflict';
          v_eligibility := 'accounting_blocked';
        end if;
      else
        -- Requirement 9: the insert races. A lost race is a typed result, never
        -- a raw 23505 escaping to the worker and never a stranded job.
        begin
          insert into public.consumer_packet_payment_consumption (
            consumer_briefcase_item_id, consumer_auth_user_id, provider_event_id,
            person_id, matter_id, first_render_job_id, consumption_unit_hash
          ) values (
            coalesce(v_job.consumer_briefcase_item_id, v_job.briefcase_item_id),
            v_job.consumer_auth_user_id,
            v_auth.provider_event_id,
            v_job.person_id, v_job.matter_id, v_job.id, v_unit_hash
          );

          insert into public.packet_credit_ledger (
            entitlement_id, partner_id, person_id, matter_id, render_job_id,
            event_type, consumption_unit_hash, metadata
          ) values (
            null, null, v_job.person_id, v_job.matter_id, v_job.id,
            'zero_charge', v_unit_hash,
            jsonb_build_object('reason', 'consumer_payment_verified')
          ) returning id into v_ledger_id;

          v_result := 'zero_charge';
          v_eligibility := 'eligible';
        exception when unique_violation then
          select * into v_existing
          from public.consumer_packet_payment_consumption
          where consumer_briefcase_item_id = coalesce(v_job.consumer_briefcase_item_id, v_job.briefcase_item_id);

          if found and v_existing.matter_id = v_job.matter_id then
            v_unit_hash := v_existing.consumption_unit_hash;
            v_result := 'zero_charge';
            v_eligibility := 'eligible';
            select l.id into v_ledger_id
            from public.packet_credit_ledger l
            where l.consumption_unit_hash = v_unit_hash
            order by l.created_at
            limit 1;
          elsif found then
            v_result := 'consumer_payment_matter_conflict';
            v_eligibility := 'accounting_blocked';
          else
            v_result := 'consumer_payment_conflict';
            v_eligibility := 'accounting_blocked';
          end if;
        end;
      end if;
    end if;
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

comment on function public.record_consumer_packet_payment(
  uuid, text, integer, text, text, text, text, text, text, text, text) is
  'The only path that may write a consumer payment fact. SECURITY DEFINER, server roles only. Phase 52.';
comment on function public.consumer_packet_payment_authority(uuid, uuid) is
  'Owner-scoped consumer payment probe: paid, 5000 cents, USD, server-written evidence, and owned by the participant the job is bound to. Phase 52.';
comment on table public.consumer_packet_payment_consumption is
  'One row per consumer payment actually consumed, keyed on the Briefcase item and the provider receipt rather than the render job. Survives refund so a delivered artifact is preserved. Phase 52.';

commit;
