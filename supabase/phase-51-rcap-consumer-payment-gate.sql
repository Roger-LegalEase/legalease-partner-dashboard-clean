-- Phase 51 — the consumer payment gate on packet delivery.
--
-- Additive follow-on to phase 49 (render jobs) and phase 50 (delivery
-- hardening). Phase 50's files are not modified; their published digests stand.
-- Apply order is 49 -> 50 -> 51.
--
-- The defect this closes
-- ----------------------
-- Phase 50 gave an unsponsored job the accounting result 'zero_charge' and the
-- delivery eligibility 'eligible'. Those are two different facts and only the
-- first was true. 'zero_charge' says no partner credit moved — correct, there
-- is no partner. It says nothing about whether the consumer paid, and the
-- consumer product is paid: consumer_briefcase_items.amount_cents is
-- constrained to 5000 (phase 27), the $50 product price.
--
-- The result was that any job enqueued without partner sponsorship became
-- deliverable on the strength of having no sponsor. The delivery core
-- (src/lib/rcap/render/packet-delivery.ts) gates on authentication, briefcase
-- ownership, delivery_eligibility and artifact hash — none of which is a
-- payment check — so no other layer caught it.
--
-- The rule after this migration
-- -----------------------------
--   unsponsored + no valid consumer payment  -> consumer_payment_required,
--                                               accounting_blocked, no ledger row
--   unsponsored + valid consumer payment     -> zero_charge, eligible,
--                                               and no partner credit consumed
--   sponsored                                -> unchanged phase-50 behaviour
--
-- zero_charge therefore cannot bypass the payment gate: it is now reachable
-- only after the payment is verified, rather than being the thing that made an
-- unpaid job deliverable.
--
-- Fail-closed by construction. The payment probe resolves
-- consumer_briefcase_items dynamically, so on a schema where that table is
-- absent the answer is "cannot prove payment", not an error and not a pass.

begin;

-------------------------------------------------------------------------------
-- 1. The new typed result.
--
-- The phase-50 constraint packet_render_jobs_eligible_requires_accounting_check
-- already restricts 'eligible' to consumed / already_consumed /
-- overage_consumed / zero_charge. Adding consumer_payment_required to the
-- result vocabulary therefore makes it structurally impossible for a
-- payment-blocked job to be marked deliverable, without touching that
-- constraint.
-------------------------------------------------------------------------------

alter table public.packet_render_jobs
  drop constraint if exists packet_render_jobs_accounting_result_check,
  add constraint packet_render_jobs_accounting_result_check check (
    accounting_result is null or accounting_result in (
      'consumed', 'already_consumed', 'overage_consumed', 'zero_charge',
      'cap_reached', 'not_validated', 'not_found', 'unauthorized',
      'consumer_payment_required'
    )
  );

-------------------------------------------------------------------------------
-- 2. The payment probe.
--
-- Dynamic resolution is deliberate. consumer_briefcase_items references
-- auth.users and is not present in every schema this function is exercised
-- against (ephemeral test clusters, partner-only deployments). A static
-- reference would raise at execution time and turn a missing table into a
-- crash; here a missing table is simply "not proven paid", which is the
-- fail-closed answer.
--
-- 'paid' only. 'unpaid', 'refunded' and 'not_applicable' are all
-- non-deliverable, and the amount must be the product price rather than merely
-- non-null, so a mispriced or partially captured checkout cannot open delivery.
-------------------------------------------------------------------------------

create or replace function public.consumer_packet_payment_valid(p_briefcase_item_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $probe$
declare
  v_valid boolean;
begin
  if p_briefcase_item_id is null then
    return false;
  end if;

  if to_regclass('public.consumer_briefcase_items') is null then
    return false;
  end if;

  execute
    'select exists (
       select 1 from public.consumer_briefcase_items b
       where b.id = $1
         and b.payment_status = ''paid''
         and b.amount_cents = 5000
     )'
  into v_valid
  using p_briefcase_item_id;

  return coalesce(v_valid, false);
end;
$probe$;

revoke all on function public.consumer_packet_payment_valid(uuid) from public;
revoke all on function public.consumer_packet_payment_valid(uuid) from anon;

-------------------------------------------------------------------------------
-- 3. Finalization, with the consumer branch gated. Byte-identical to phase 50
--    apart from that branch.
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
    -- Unsponsored, so no partner credit can move. That is not the same as
    -- deliverable: the consumer product is paid, and the payment is the only
    -- authority for an unsponsored delivery. zero_charge describes what the
    -- PARTNER ledger does (nothing); it never described whether the consumer
    -- paid, and phase 50 let that ambiguity read as 'eligible'.
    --
    -- The paid fact lives on consumer_briefcase_items: payment_status 'paid'
    -- at the product price of 5000 cents. It is checked here, fail-closed:
    -- an unsponsored job with no briefcase item, an unpaid or refunded item,
    -- or an amount that is not the product price is accounting-blocked and
    -- never reaches storage.
    if public.consumer_packet_payment_valid(v_job.briefcase_item_id) then
      v_unit_hash := encode(extensions.digest(convert_to('zero_charge:' || v_job.id::text, 'utf8'), 'sha256'), 'hex');
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
    else
      -- No ledger row of any kind: nothing was consumed and nothing was
      -- forgiven. The artifact evidence recorded above still stands.
      v_result := 'consumer_payment_required';
      v_eligibility := 'accounting_blocked';
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

commit;
