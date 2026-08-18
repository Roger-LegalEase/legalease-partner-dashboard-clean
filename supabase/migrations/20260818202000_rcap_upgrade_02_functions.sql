-- Forward-only step 2 of 8 in the Production schema upgrade.
--
-- Start: supabase/migrations/20260728213131_remote_schema.sql, the recovered and
--        validated Production baseline (44 tables, 35 functions, 5 views, 44 RLS
--        tables, 1 forced-RLS table, 73 policies).
-- End:   the accepted repository schema — that baseline with every repository SQL
--        input in supabase/ applied on top, in the order
--        scripts/rcap-schema-upgrade-lab.sh implements.
--
-- The chain was derived by diffing the two locally built databases, not by hand,
-- and is proven by replay in scripts/verify-rcap-production-schema-upgrade.mjs.
-- Steps are split by dependency order: tables, functions, constraints and indexes,
-- views, triggers, RLS and policies, grants, storage.
--
-- Creates or replaces 88 functions. `check_function_bodies` is off for the same
-- reason the generator emits it: a function body may reference an object a later
-- step in this chain creates.

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.assert_packet_render_job_fencing(p_job packet_render_jobs, p_fencing_token uuid)
 RETURNS void
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if p_job.fencing_token is null or p_fencing_token is null
     or p_job.fencing_token <> p_fencing_token then
    raise exception 'packet_render_jobs: fencing token is not the active claim';
  end if;
  if p_job.claim_expires_at is null or p_job.claim_expires_at < now() then
    raise exception 'packet_render_jobs: claim lease has expired';
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.claim_packet_render_job(p_worker_id text, p_renderer_kinds text[], p_claim_seconds integer DEFAULT 600)
 RETURNS TABLE(id uuid, packet_id uuid, route_id text, renderer_kind text, renderer_version text, source_sha256 text, profile_id text, profile_version text, input_hash text, attempt_count integer, max_attempts integer, partner_id uuid, person_id uuid, matter_id uuid, fencing_token uuid, claim_expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.claim_partner_screening_session(p_partner_slug text, p_jurisdiction text, p_code_hash text DEFAULT NULL::text, p_now timestamp with time zone DEFAULT now())
 RETURNS TABLE(ok boolean, session_id uuid, reason text, benefit_active boolean, attribution_source text, campaign_name text, access_mode text, code_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_partner_slug text;
  v_jurisdiction text;
  v_code_hash text;
  v_access_mode text;
  v_session_id uuid;
  v_code_id uuid;
  v_code_campaign text;
  v_code_valid boolean := false;
  v_code_reason text;
  v_code_type text;
  v_effective_max integer;
  v_rows integer;
  v_benefit boolean := false;
  v_source text;
  v_reason text;
begin
  v_partner_slug := nullif(trim(p_partner_slug), '');
  v_jurisdiction := upper(nullif(trim(p_jurisdiction), ''));
  v_code_hash := nullif(trim(p_code_hash), '');

  if v_jurisdiction is null or v_jurisdiction !~ '^[A-Z]{2,3}$' then
    raise exception 'jurisdiction must be a 2-3 letter uppercase code';
  end if;

  if v_partner_slug is null then
    return query select false, null::uuid, 'partner_inactive'::text, false, null::text, null::text, null::text, null::uuid;
    return;
  end if;

  -- Partner must be active to grant any partner benefit.
  if not exists (
    select 1 from public.partner_records pr
    where pr.partner_slug = v_partner_slug
      and pr.payment_status in ('paid', 'demo_paid')
      and pr.qualification_status = 'qualified'
      and pr.provisioning_status in ('provisioned', 'active')
  ) then
    return query select false, null::uuid, 'partner_inactive'::text, false, null::text, null::text, null::text, null::uuid;
    return;
  end if;

  select pr.access_mode into v_access_mode
  from public.partner_records pr
  where pr.partner_slug = v_partner_slug;
  v_access_mode := coalesce(v_access_mode, 'open');

  -- An entitlement row must exist for the partner to sponsor packets.
  if not exists (
    select 1 from public.partner_entitlement pe where pe.partner_slug = v_partner_slug
  ) then
    return query select false, null::uuid, 'partner_inactive'::text, false, null::text, null::text, v_access_mode, null::uuid;
    return;
  end if;

  -- Resolve the code (validation only; redemption happens atomically below).
  if v_code_hash is not null then
    select v.valid, v.reason, v.campaign_name, v.code_id, v.code_type
    into v_code_valid, v_code_reason, v_code_campaign, v_code_id, v_code_type
    from public.validate_partner_access_code(v_partner_slug, v_code_hash, p_now) v;
  end if;

  -- Decide benefit + attribution source per access mode.
  if v_access_mode = 'open' then
    v_benefit := true;
    if v_code_valid then
      v_source := 'partner_code';
    else
      v_source := 'partner_page';
      v_code_id := null;
      v_code_campaign := null;
    end if;
  elsif v_access_mode = 'optional_code' then
    if v_code_hash is not null and not v_code_valid then
      -- A code was entered but is not valid: surface the error, do not attribute.
      return query select false, null::uuid, coalesce(v_code_reason, 'invalid')::text, false, null::text, null::text, v_access_mode, null::uuid;
      return;
    end if;
    v_benefit := true;
    if v_code_valid then
      v_source := 'partner_code';
    else
      v_source := 'partner_page';
      v_code_id := null;
      v_code_campaign := null;
    end if;
  else
    -- required_code and invite_only: a valid code is mandatory for partner benefit.
    if not v_code_valid then
      return query select false, null::uuid, coalesce(v_code_reason, 'code_required')::text, false, null::text, null::text, v_access_mode, null::uuid;
      return;
    end if;
    v_benefit := true;
    v_source := 'partner_code';
  end if;

  -- Atomically redeem a limited/single-use code as part of the claim.
  if v_benefit and v_source = 'partner_code' and v_code_id is not null then
    v_effective_max := case
      when v_code_type = 'single_use' then 1
      when v_code_type = 'limited_use' then (select c.max_uses from public.partner_access_codes c where c.id = v_code_id)
      else null
    end;

    update public.partner_access_codes c
    set uses_count = c.uses_count + 1,
        last_used_at = p_now,
        updated_at = now()
    where c.id = v_code_id
      and (v_effective_max is null or c.uses_count < v_effective_max);

    get diagnostics v_rows = row_count;

    if v_rows = 0 then
      -- Lost a race for the last remaining use.
      return query select false, null::uuid, 'exhausted'::text, false, null::text, null::text, v_access_mode, null::uuid;
      return;
    end if;
  end if;

  -- Create the attributed session.
  v_session_id := gen_random_uuid();
  insert into public.screening_sessions (
    session_id, jurisdiction, answers, current_question_id, furthest_stage,
    status, last_drop_question, partner_slug, flow_mode, claimed_slot_state,
    partner_access_code_id, campaign_name, attribution_source, partner_benefit_active
  )
  values (
    v_session_id, v_jurisdiction, '{}'::jsonb, null, null,
    'in_progress', null, v_partner_slug, 'rcap', 'claimed',
    v_code_id, v_code_campaign, v_source, true
  );

  -- Audit.
  if v_code_id is not null then
    insert into public.rcap_record_events (record_type, record_id, partner_slug, event_type, occurred_at, actor, metadata)
    values ('partner_access_code', v_code_id::text, v_partner_slug, 'partner_code_used', p_now, 'system',
            jsonb_build_object('session_id', v_session_id, 'campaign_name', v_code_campaign));
  end if;

  return query select true, v_session_id, null::text, v_benefit, v_source, v_code_campaign, v_access_mode, v_code_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.consumer_matter_id_for_briefcase_item(p_item_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 IMMUTABLE
 SET search_path TO ''
AS $function$
declare
  v_hash text;
  v_variant text;
begin
  if p_item_id is null then return null; end if;
  v_hash := encode(
    extensions.digest(convert_to('rcap:consumer-matter:v1:' || p_item_id::text, 'utf8'), 'sha256'),
    'hex'
  );
  v_variant := to_hex(((get_byte(decode(substr(v_hash, 17, 2), 'hex'), 0) >> 4) & 3) + 8);
  return (
    substr(v_hash, 1, 8) || '-' || substr(v_hash, 9, 4) || '-4' ||
    substr(v_hash, 14, 3) || '-' || v_variant || substr(v_hash, 18, 3) || '-' ||
    substr(v_hash, 21, 12)
  )::uuid;
end;
$function$;

CREATE OR REPLACE FUNCTION public.consumer_packet_payment_authority(p_briefcase_item_id uuid, p_consumer_auth_user_id uuid)
 RETURNS TABLE(valid boolean, reason text, provider_event_id text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_product text;
  v_person uuid;
  v_matter uuid;
begin
  if to_regclass('public.consumer_briefcase_items') is null then
    return query select false, 'no_payment_storage'::text, null::text;
    return;
  end if;
  execute
    'select b.payment_product_id, b.payment_person_id, b.payment_matter_id
       from public.consumer_briefcase_items b where b.id = $1'
  into v_product, v_person, v_matter
  using p_briefcase_item_id;
  return query select * from public.consumer_packet_payment_authority(
    p_briefcase_item_id, p_consumer_auth_user_id, v_product, v_person, v_matter
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.consumer_packet_payment_authority(p_briefcase_item_id uuid, p_consumer_auth_user_id uuid, p_product_id text, p_person_id uuid, p_matter_id uuid)
 RETURNS TABLE(valid boolean, reason text, provider_event_id text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_status text;
  v_amount integer;
  v_currency text;
  v_owner uuid;
  v_event text;
  v_authority text;
  v_session text;
  v_product text;
  v_person uuid;
  v_matter uuid;
begin
  if p_briefcase_item_id is null then return query select false, 'no_briefcase_item'::text, null::text; return; end if;
  if p_consumer_auth_user_id is null then return query select false, 'no_consumer_binding'::text, null::text; return; end if;
  if to_regclass('public.consumer_briefcase_items') is null then return query select false, 'no_payment_storage'::text, null::text; return; end if;

  execute
    'select b.payment_status, b.amount_cents, b.currency, b.user_id,
            b.provider_event_id, b.payment_authority, b.checkout_session_id,
            b.payment_product_id, b.payment_person_id, b.payment_matter_id
       from public.consumer_briefcase_items b where b.id = $1'
  into v_status, v_amount, v_currency, v_owner, v_event, v_authority,
       v_session, v_product, v_person, v_matter
  using p_briefcase_item_id;

  if v_status is null and v_owner is null then return query select false, 'item_not_found'::text, null::text; return; end if;
  if v_owner is distinct from p_consumer_auth_user_id then return query select false, 'owner_mismatch'::text, null::text; return; end if;
  if v_status is distinct from 'paid' then return query select false, ('payment_status_' || coalesce(v_status, 'null'))::text, null::text; return; end if;
  if v_amount is distinct from 5000 then return query select false, 'amount_not_product_price'::text, null::text; return; end if;
  if lower(coalesce(v_currency, '')) <> 'usd' then return query select false, 'currency_not_usd'::text, null::text; return; end if;
  if v_authority is null or nullif(trim(coalesce(v_event, '')), '') is null then return query select false, 'no_server_payment_evidence'::text, null::text; return; end if;
  if nullif(trim(coalesce(v_session, '')), '') is null then return query select false, 'no_checkout_session'::text, null::text; return; end if;
  if v_product is distinct from p_product_id or p_product_id is distinct from 'expungement_packet' then return query select false, 'product_mismatch'::text, null::text; return; end if;
  if v_person is distinct from p_person_id then return query select false, 'person_mismatch'::text, null::text; return; end if;
  if v_matter is distinct from p_matter_id or p_matter_id is distinct from public.consumer_matter_id_for_briefcase_item(p_briefcase_item_id) then return query select false, 'matter_mismatch'::text, null::text; return; end if;

  return query select true, 'authorized'::text, v_event;
end;
$function$;

CREATE OR REPLACE FUNCTION public.consumer_packet_payment_valid(p_briefcase_item_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.consumer_payment_consumption_binding_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_valid boolean;
  v_reason text;
  v_session text;
begin
  if tg_op = 'UPDATE' then
    if new.consumer_briefcase_item_id is distinct from old.consumer_briefcase_item_id
       or new.consumer_auth_user_id is distinct from old.consumer_auth_user_id
       or new.provider_event_id is distinct from old.provider_event_id
       or new.person_id is distinct from old.person_id
       or new.matter_id is distinct from old.matter_id
       or new.product_id is distinct from old.product_id
       or new.checkout_session_id is distinct from old.checkout_session_id
       or new.amount_cents is distinct from old.amount_cents
       or new.currency is distinct from old.currency then
      raise exception 'consumer payment consumption binding is immutable';
    end if;
    -- A refund removes authority for new work, but Phase 52 deliberately keeps
    -- an already-delivered artifact and its consumption evidence. A benign
    -- maintenance update therefore must not re-run current payment authority.
    return new;
  end if;

  select a.valid, a.reason, b.checkout_session_id
    into v_valid, v_reason, v_session
    from public.consumer_briefcase_items b
    cross join lateral public.consumer_packet_payment_authority(
      new.consumer_briefcase_item_id,
      new.consumer_auth_user_id,
      public.expungement_packet_product_id(),
      new.person_id,
      new.matter_id
    ) a
   where b.id = new.consumer_briefcase_item_id;
  if not coalesce(v_valid, false) then
    raise exception 'consumer payment consumption binding refused (%)', coalesce(v_reason, 'unknown');
  end if;
  new.product_id := public.expungement_packet_product_id();
  new.checkout_session_id := v_session;
  new.amount_cents := 5000;
  new.currency := 'usd';
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.emit_rcap_screening_started_event()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if new.flow_mode = 'rcap'
     and new.partner_slug is not null
     and new.partner_benefit_active is true then
    insert into public.rcap_screening_analytics_events
      (session_id, partner_slug, partner_access_code_id, campaign_name, event_type, occurred_at)
    values
      (new.session_id, new.partner_slug, new.partner_access_code_id, new.campaign_name, 'screening_started', now());
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.enqueue_packet_render_job(p_packet_id uuid, p_route_id text, p_renderer_kind text, p_renderer_version text, p_source_sha256 text, p_profile_id text, p_profile_version text, p_input_hash text, p_briefcase_item_id uuid, p_partner_id uuid, p_person_id uuid, p_matter_id uuid, p_max_attempts integer, p_consumer_briefcase_item_id uuid, p_expected_consumer_auth_user_id uuid)
 RETURNS SETOF packet_render_jobs
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_existing public.packet_render_jobs%rowtype;
  v_canonical_user uuid;
  v_item_found boolean;
  v_consumer_item uuid;
begin
  if p_packet_id is null then
    raise exception 'packet id is required';
  end if;
  if nullif(trim(p_input_hash), '') is null or p_input_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'input hash must be a sha256 hex digest';
  end if;

  -----------------------------------------------------------------------------
  -- Mode validation. Neither mode may borrow the other's fields.
  -----------------------------------------------------------------------------
  if p_partner_id is not null then
    if p_consumer_briefcase_item_id is not null or p_expected_consumer_auth_user_id is not null then
      raise exception 'packet_render_jobs: a sponsored job must not carry consumer binding fields';
    end if;
  else
    if p_consumer_briefcase_item_id is null then
      raise exception 'packet_render_jobs: an unsponsored consumer job requires a consumer briefcase item';
    end if;
    if p_expected_consumer_auth_user_id is null then
      raise exception 'packet_render_jobs: an unsponsored consumer job requires the expected consumer user id';
    end if;
    if p_person_id is null then
      raise exception 'packet_render_jobs: an unsponsored consumer job requires a person id';
    end if;
    if p_matter_id is null then
      raise exception 'packet_render_jobs: an unsponsored consumer job requires a matter id';
    end if;

    ---------------------------------------------------------------------------
    -- Ownership. Resolved dynamically for the same reason Phase 51's probe is:
    -- consumer_briefcase_items references auth.users and is absent from
    -- partner-only schemas. Absent, a consumer job cannot be created at all,
    -- which is the fail-closed answer rather than a crash.
    ---------------------------------------------------------------------------
    if to_regclass('public.consumer_briefcase_items') is null then
      raise exception 'packet_render_jobs: consumer payment storage is absent; a consumer job cannot be bound';
    end if;

    execute
      'select true, b.user_id from public.consumer_briefcase_items b where b.id = $1'
    into v_item_found, v_canonical_user
    using p_consumer_briefcase_item_id;

    if not coalesce(v_item_found, false) then
      raise exception 'packet_render_jobs: consumer briefcase item % does not exist', p_consumer_briefcase_item_id;
    end if;

    if v_canonical_user is null then
      raise exception 'packet_render_jobs: consumer briefcase item % has no owner', p_consumer_briefcase_item_id;
    end if;

    -- The comparison is the whole point: a server that derives the user from a
    -- verified session and a database that independently confirms the item
    -- belongs to that user must agree, or nothing is created.
    if v_canonical_user is distinct from p_expected_consumer_auth_user_id then
      raise exception 'packet_render_jobs: consumer briefcase item % is not owned by the expected user', p_consumer_briefcase_item_id;
    end if;
  end if;

  -----------------------------------------------------------------------------
  -- Idempotency is unchanged: an identical request returns the live or
  -- completed job rather than queueing a second one that could deliver twice.
  -----------------------------------------------------------------------------
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

  -- Phase 52 falls back to briefcase_item_id when the phase-53 column is
  -- absent on an older row; keeping both in step means a consumer job created
  -- here satisfies either read.
  v_consumer_item := coalesce(p_briefcase_item_id, p_consumer_briefcase_item_id);

  perform set_config('rcap.packet_mutation_authority', 'enqueue_packet_render_job', true);
  return query
  insert into public.packet_render_jobs (
    packet_id, route_id, renderer_kind, renderer_version, source_sha256,
    profile_id, profile_version, input_hash, briefcase_item_id,
    partner_id, person_id, matter_id, max_attempts,
    -- Bound in the same statement that creates the row. There is no window in
    -- which the job exists unbound, so Phase 52's immutability trigger has
    -- nothing to guard against and no null-to-value transition to permit.
    consumer_briefcase_item_id, consumer_auth_user_id
  ) values (
    p_packet_id, trim(p_route_id), p_renderer_kind, p_renderer_version, p_source_sha256,
    p_profile_id, p_profile_version, p_input_hash, v_consumer_item,
    p_partner_id, p_person_id, p_matter_id, coalesce(p_max_attempts, 5),
    p_consumer_briefcase_item_id, v_canonical_user
  )
  returning *;
  perform set_config('rcap.packet_mutation_authority', '', true);
end;
$function$;

CREATE OR REPLACE FUNCTION public.expungement_packet_product_id()
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$ select 'expungement_packet'::text $function$;

CREATE OR REPLACE FUNCTION public.fail_packet_render_job(p_job_id uuid, p_fencing_token uuid, p_error_code text, p_error_detail text, p_retryable boolean)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.finalize_packet_render_job(p_job_id uuid, p_fencing_token uuid, p_output_storage_path text, p_local_sha256 text, p_local_normalized_sha256 text, p_stored_sha256 text, p_stored_normalized_sha256 text, p_output_byte_count integer, p_output_page_count integer, p_container_digest text)
 RETURNS TABLE(accounting_result text, delivery_eligibility text, consumption_unit_hash text, credit_ledger_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_partner_code_analytics(p_partner_slug text)
 RETURNS TABLE(partner_access_code_id uuid, screenings_started bigint, screenings_completed bigint, eligible_packet bigint, guidance_only bigint, ineligible bigint, packets_generated bigint, overage_packets bigint)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select
    e.partner_access_code_id,
    count(*) filter (where e.event_type = 'screening_started'),
    count(*) filter (where e.event_type = 'screening_completed'),
    count(*) filter (where e.event_type = 'eligibility_result_recorded'
                       and e.outcome_category in ('eligible_packet', 'eligible_packet_with_caution')),
    count(*) filter (where e.event_type = 'eligibility_result_recorded'
                       and e.outcome_category = 'guidance_only'),
    count(*) filter (where e.event_type = 'eligibility_result_recorded'
                       and e.outcome_category = 'ineligible'),
    count(*) filter (where e.event_type = 'packet_generated'),
    count(*) filter (where e.event_type = 'packet_overage_recorded')
  from public.rcap_screening_analytics_events e
  where e.partner_slug = nullif(trim(p_partner_slug), '')
  group by e.partner_access_code_id;
$function$;

CREATE OR REPLACE FUNCTION public.guard_packet_credit_ledger()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'INSERT' then
    if public.rcap_packet_mutation_authority() <> 'finalize_packet_render_job' then
      raise exception 'packet_credit_ledger: entries are appended only by finalize_packet_render_job';
    end if;
    return new;
  end if;
  raise exception 'packet_credit_ledger: append-only; % is never permitted', tg_op;
end;
$function$;

CREATE OR REPLACE FUNCTION public.guard_packet_delivery_events()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'INSERT' then
    if public.rcap_packet_mutation_authority() <> 'record_packet_delivery_event' then
      raise exception 'packet_delivery_events: events are recorded only by record_packet_delivery_event';
    end if;
    return new;
  end if;
  raise exception 'packet_delivery_events: append-only; % is never permitted', tg_op;
end;
$function$;

CREATE OR REPLACE FUNCTION public.guard_packet_render_job_delete()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  raise exception 'packet_render_jobs: rows are never deleted';
end;
$function$;

CREATE OR REPLACE FUNCTION public.guard_packet_render_job_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if public.rcap_packet_mutation_authority() <> 'enqueue_packet_render_job' then
    raise exception 'packet_render_jobs: rows are created only through enqueue_packet_render_job';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.guard_packet_render_job_transition()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.packet_entitlement_balance(p_entitlement_id uuid)
 RETURNS TABLE(packet_cap integer, overage_cap integer, consumed_units bigint, overage_units bigint, remaining_units bigint)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.packet_render_jobs_consumer_binding_immutable()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.packet_render_jobs_paid_matter_guard()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_valid boolean;
  v_reason text;
begin
  if new.partner_id is not null then return new; end if;
  select a.valid, a.reason into v_valid, v_reason
    from public.consumer_packet_payment_authority(
      new.consumer_briefcase_item_id,
      new.consumer_auth_user_id,
      public.expungement_packet_product_id(),
      new.person_id,
      new.matter_id
    ) a;
  if not coalesce(v_valid, false) then
    raise exception 'packet_render_jobs: consumer payment binding refused (%)', coalesce(v_reason, 'unknown');
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.prevent_rcap_screening_analytics_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  raise exception 'rcap_screening_analytics_events is append-only';
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_consumer_person_namespace()
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO ''
AS $function$ select 'expungement-ai-consumer'::text $function$;

CREATE OR REPLACE FUNCTION public.rcap_guard_reserved_partner_slug()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.partner_slug = public.rcap_consumer_person_namespace() then
    raise exception
      'partner_records: % is the reserved direct-to-consumer person namespace and cannot be registered as a partner slug',
      new.partner_slug;
  end if;
  return new;
end
$function$;

CREATE OR REPLACE FUNCTION public.rcap_onboarding_derive_authorization_actor()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_actor_id uuid;
  v_actor_email text;
begin
  -- Only the service-role submission function can insert authorization rows.
  -- It supplies the actor resolved from the server session; this trigger then
  -- independently revalidates active partner-admin membership, normalizes the
  -- server-session work email, and derives the server timestamp.
  v_actor_id := new.approver_user_id;
  v_actor_email := lower(btrim(new.approver_work_email));

  perform 1
  from public.partner_users pu
  join public.partner_onboarding po
    on po.id = new.workspace_id
   and po.partner_slug = pu.partner_slug
  where pu.auth_user_id = v_actor_id
    and pu.status = 'active'
    and pu.role = 'partner_admin';

  if not found
     or v_actor_id is null
     or nullif(v_actor_email, '') is null
     or char_length(v_actor_email) > 254 then
    raise exception using
      errcode = '42501',
      message = 'Active partner administrator authorization is required';
  end if;

  new.approver_user_id := v_actor_id;
  new.approver_work_email := v_actor_email;
  new.authorization_timestamp := now();
  new.created_at := now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_onboarding_derive_idempotency_actor()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if current_user <> 'authenticated' then
    if new.actor_user_id is null then
      raise exception using
        errcode = '23502',
        message = 'Idempotency actor is required';
    end if;
  elsif public.is_internal_admin() then
    if new.actor_user_id is null then
      new.actor_user_id := auth.uid();
    end if;
  else
    if public.current_partner_role() <> 'partner_admin' then
      raise exception using
        errcode = '42501',
        message = 'Active partner administrator is required';
    end if;
    new.actor_user_id := auth.uid();
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_onboarding_guard_change_request_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.id <> old.id
     or new.workspace_id <> old.workspace_id
     or new.section_id <> old.section_id
     or new.requested_by <> old.requested_by
     or new.requested_at <> old.requested_at
     or new.created_at <> old.created_at then
    raise exception using
      errcode = '23514',
      message = 'Immutable change-request identity cannot be changed';
  end if;

  if public.current_partner_role() = 'partner_admin'
     and not public.is_internal_admin() then
    if old.status not in ('open', 'partner_responded')
       or new.status <> 'partner_responded'
       or new.partner_safe_instructions <> old.partner_safe_instructions
       or new.resolved_by is distinct from old.resolved_by
       or new.resolved_at is distinct from old.resolved_at
       or new.resolution_reason is distinct from old.resolution_reason then
      raise exception using
        errcode = '42501',
        message = 'Partner actors may only respond to an open change request';
    end if;
    new.responded_by := auth.uid();
    new.responded_at := now();
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_onboarding_guard_idempotency_update()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.id <> old.id
     or new.workspace_id <> old.workspace_id
     or new.operation_key <> old.operation_key
     or new.request_id <> old.request_id
     or new.actor_user_id <> old.actor_user_id
     or new.payload_hash <> old.payload_hash
     or new.expires_at <> old.expires_at
     or new.created_at <> old.created_at then
    raise exception using
      errcode = '23514',
      message = 'Idempotency request identity cannot be changed';
  end if;

  if old.result_status <> 'started'
     or new.result_status not in ('succeeded', 'failed')
     or new.completed_at is null then
    raise exception using
      errcode = '23514',
      message = 'Invalid idempotency result transition';
  end if;

  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_onboarding_guard_partner_row_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'UPDATE' then
    if new.workspace_id <> old.workspace_id
       or new.id <> old.id
       or new.created_at <> old.created_at then
      raise exception using
        errcode = '23514',
        message = 'Immutable onboarding row identity cannot be changed';
    end if;

    if new.revision <> old.revision + 1 then
      raise exception using
        errcode = '40001',
        message = 'Onboarding row revision conflict';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_onboarding_guard_section_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if tg_op = 'UPDATE' then
    if new.workspace_id <> old.workspace_id
       or new.section_key <> old.section_key
       or new.created_at <> old.created_at then
      raise exception using
        errcode = '23514',
        message = 'Immutable onboarding section identity cannot be changed';
    end if;

    if new.revision <> old.revision + 1 then
      raise exception using
        errcode = '40001',
        message = 'Onboarding section revision conflict';
    end if;

    if public.current_partner_role() = 'partner_admin'
       and not public.is_internal_admin()
       and (
         new.status in ('approved', 'waived', 'not_applicable')
         or new.approved_at is distinct from old.approved_at
         or new.approved_by is distinct from old.approved_by
         or new.waived_at is distinct from old.waived_at
         or new.waived_by is distinct from old.waived_by
         or new.waiver_reason is distinct from old.waiver_reason
         or new.reviewed_at is distinct from old.reviewed_at
         or new.reviewed_by is distinct from old.reviewed_by
       ) then
      raise exception using
        errcode = '42501',
        message = 'Partner actors cannot set internal section review fields';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_onboarding_prefill_current_value(p_workspace_id uuid, p_section_key text, p_field_key text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
declare
  v_value jsonb;
begin
  if p_field_key = 'contacts' and p_section_key = 'organization_contacts' then
    select coalesce(jsonb_agg(
      jsonb_strip_nulls(jsonb_build_object(
        'stable_row_id', c.id,
        'role', c.role,
        'name', c.name,
        'title', c.title,
        'organization', c.organization,
        'work_email', c.work_email,
        'phone', c.phone
      ))
      order by c.created_at, c.id
    ), '[]'::jsonb)
      into v_value
    from public.partner_onboarding_contacts c
    where c.workspace_id = p_workspace_id
      and c.deleted_at is null;
    return v_value;
  end if;

  if p_field_key = 'planned_users'
     and p_section_key = 'staff_dashboard_plan' then
    select coalesce(jsonb_agg(
      jsonb_build_object(
        'stable_row_id', u.id,
        'name', u.name,
        'work_email', u.work_email,
        'requested_role', u.requested_role,
        'special_permissions', to_jsonb(u.special_permissions),
        'training_attendee', u.training_attendee
      )
      order by u.created_at, u.id
    ), '[]'::jsonb)
      into v_value
    from public.partner_onboarding_planned_users u
    where u.workspace_id = p_workspace_id
      and u.deleted_at is null;
    return v_value;
  end if;

  if p_field_key = 'report_recipients'
     and p_section_key = 'support_referrals_reporting' then
    select coalesce(jsonb_agg(
      jsonb_strip_nulls(jsonb_build_object(
        'stable_row_id', r.id,
        'name', r.name,
        'work_email', r.work_email
      ))
      order by r.created_at, r.id
    ), '[]'::jsonb)
      into v_value
    from public.partner_onboarding_report_recipients r
    where r.workspace_id = p_workspace_id
      and r.deleted_at is null;
    return v_value;
  end if;

  select coalesce(s.response_data -> p_field_key, 'null'::jsonb)
    into v_value
  from public.partner_onboarding_sections s
  where s.workspace_id = p_workspace_id
    and s.section_key = p_section_key;
  return coalesce(v_value, 'null'::jsonb);
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_onboarding_prevent_append_only_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  raise exception using
    errcode = '55000',
    message = tg_table_name || ' is append-only';
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_onboarding_prevent_authorization_mutation()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  raise exception using
    errcode = '55000',
    message = 'Onboarding authorizations are append-only';
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_onboarding_resolve_partner_record()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_partner_record_id uuid;
  v_partner_slug text;
begin
  select pr.id, pr.partner_slug
    into v_partner_record_id, v_partner_slug
  from public.partner_records pr
  where pr.partner_slug = new.partner_slug
     or (new.partner_record_id is not null and pr.id = new.partner_record_id)
  order by (pr.partner_slug = new.partner_slug) desc
  limit 1;

  if v_partner_record_id is null then
    raise exception using
      errcode = '23503',
      message = 'Unknown partner for onboarding workspace';
  end if;

  if v_partner_slug <> new.partner_slug then
    raise exception using
      errcode = '23514',
      message = 'Workspace partner identifiers do not match';
  end if;

  if new.partner_record_id is not null
     and new.partner_record_id <> v_partner_record_id then
    raise exception using
      errcode = '23514',
      message = 'Workspace partner identifiers do not match';
  end if;

  new.partner_record_id := v_partner_record_id;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_onboarding_validate_agreement_asset()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.finalized_asset_id is not null and not exists (
    select 1
    from public.partner_onboarding_assets a
    where a.id = new.finalized_asset_id
      and a.workspace_id = new.workspace_id
      and a.deleted_at is null
      and a.review_status = 'approved'
  ) then
    raise exception using
      errcode = '23514',
      message = 'Finalized agreement asset must be an approved asset in this workspace';
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_onboarding_validate_asset_metadata()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_workspace_partner_id uuid;
  v_expected_path text;
begin
  select coalesce(po.partner_record_id, pr.id)
    into v_workspace_partner_id
  from public.partner_onboarding po
  join public.partner_records pr on pr.partner_slug = po.partner_slug
  where po.id = new.workspace_id;

  if v_workspace_partner_id is null
     or v_workspace_partner_id <> new.partner_record_id then
    raise exception using
      errcode = '23514',
      message = 'Asset partner does not match onboarding workspace';
  end if;

  v_expected_path :=
    'partners/' || new.partner_record_id::text ||
    '/onboarding/' || new.workspace_id::text ||
    '/' || new.category ||
    '/' || new.id::text || '.' || new.file_extension;

  if new.object_path <> v_expected_path then
    raise exception using
      errcode = '23514',
      message = 'Asset object path is not server canonical';
  end if;

  if (
    new.media_type = 'image/png' and new.file_extension <> 'png'
  ) or (
    new.media_type = 'image/jpeg' and new.file_extension not in ('jpg', 'jpeg')
  ) or (
    new.media_type = 'image/webp' and new.file_extension <> 'webp'
  ) or (
    new.media_type = 'application/pdf' and new.file_extension <> 'pdf'
  ) or (
    new.media_type = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    and new.file_extension <> 'docx'
  ) then
    raise exception using
      errcode = '23514',
      message = 'Asset media type and extension do not match';
  end if;

  if new.category in (
    'transparent_logo',
    'hero_or_community_image',
    'organizer_or_program_lead_image'
  ) and new.media_type not in ('image/png', 'image/jpeg', 'image/webp') then
    raise exception using
      errcode = '23514',
      message = 'Image asset category requires a supported raster image';
  end if;

  if new.category in (
    'brand_guide',
    'approved_partner_description_attachment',
    'procurement_document'
  ) and new.media_type not in (
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ) then
    raise exception using
      errcode = '23514',
      message = 'Document asset category requires PDF or DOCX';
  end if;

  if new.media_type like 'image/%' and new.byte_size > 10485760 then
    raise exception using
      errcode = '23514',
      message = 'Image asset exceeds the 10 MiB limit';
  end if;

  if tg_op = 'UPDATE' then
    if new.id <> old.id
       or new.workspace_id <> old.workspace_id
       or new.partner_record_id <> old.partner_record_id
       or new.bucket_id <> old.bucket_id
       or new.object_path <> old.object_path
       or new.original_filename <> old.original_filename
       or new.safe_filename <> old.safe_filename
       or new.media_type <> old.media_type
       or new.file_extension <> old.file_extension
       or new.byte_size <> old.byte_size
       or new.uploaded_by <> old.uploaded_by
       or new.uploaded_at <> old.uploaded_at
       or new.created_at <> old.created_at then
      raise exception using
        errcode = '23514',
        message = 'Stored asset identity and file facts are immutable';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_onboarding_validate_change_request_section()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if not exists (
    select 1
    from public.partner_onboarding_sections s
    where s.id = new.section_id
      and s.workspace_id = new.workspace_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'Change request section must belong to this workspace';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_onboarding_validate_event_workspace()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if not exists (
    select 1
    from public.partner_onboarding po
    join public.partner_records pr on pr.partner_slug = po.partner_slug
    where po.id = new.workspace_id
      and pr.id = new.partner_record_id
  ) then
    raise exception using
      errcode = '23514',
      message = 'Integration event partner does not match workspace';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_onboarding_validate_recipient_contact()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  if new.contact_id is not null and not exists (
    select 1
    from public.partner_onboarding_contacts c
    where c.id = new.contact_id
      and c.workspace_id = new.workspace_id
      and c.deleted_at is null
  ) then
    raise exception using
      errcode = '23514',
      message = 'Report recipient contact must belong to this workspace';
  end if;
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_packet_mutation_authority()
 RETURNS text
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
  select coalesce(current_setting('rcap.packet_mutation_authority', true), '');
$function$;

CREATE OR REPLACE FUNCTION public.rcap_service_apply_onboarding_prefill(p_partner_slug text, p_actor_user_id uuid, p_workspace_id uuid, p_expected_workspace_version bigint, p_selected_value_ids uuid[], p_section_updates jsonb, p_workspace_completion integer, p_blocker_code text, p_next_action_code text, p_next_action_owner text, p_request_id uuid, p_payload_hash text)
 RETURNS TABLE(workspace_aggregate_version bigint, result jsonb, duplicate boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_workspace public.partner_onboarding%rowtype;
  v_existing public.partner_onboarding_idempotency%rowtype;
  v_value public.partner_onboarding_prefill_values%rowtype;
  v_section public.partner_onboarding_sections%rowtype;
  v_update jsonb;
  v_value_id uuid;
  v_applied uuid[] := '{}'::uuid[];
  v_conflicts uuid[] := '{}'::uuid[];
  v_skipped uuid[] := '{}'::uuid[];
  v_update_ids uuid[];
  v_new_revision bigint;
  v_applied_count integer := 0;
  v_conflict_count integer := 0;
begin
  perform public.rcap_service_assert_internal_actor(p_actor_user_id);
  if p_expected_workspace_version < 1
     or p_selected_value_ids is null
     or cardinality(p_selected_value_ids) < 1
     or cardinality(p_selected_value_ids) > 200
     or p_section_updates is null
     or jsonb_typeof(p_section_updates) <> 'array'
     or p_workspace_completion not between 0 and 100
     or p_next_action_owner not in ('partner', 'legalease', 'none')
     or p_payload_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid prefill apply request';
  end if;

  select *
    into v_existing
  from public.partner_onboarding_idempotency i
  where i.request_id = p_request_id
  for update;
  if found then
    if v_existing.workspace_id <> p_workspace_id
       or v_existing.operation_key <> 'prefill_apply'
       or v_existing.actor_user_id <> p_actor_user_id
       or v_existing.payload_hash <> p_payload_hash then
      raise exception using
        errcode = '23505',
        message = 'Idempotency request does not match original mutation';
    end if;
    if v_existing.result_status = 'succeeded' then
      workspace_aggregate_version := v_existing.result_workspace_version;
      result := jsonb_build_object(
        'appliedIds', '[]'::jsonb,
        'conflictIds', '[]'::jsonb,
        'skippedIds', '[]'::jsonb,
        'replayed', true
      );
      duplicate := true;
      return next;
      return;
    end if;
  end if;

  select po.*
    into v_workspace
  from public.partner_onboarding po
  where po.id = p_workspace_id
    and po.partner_slug = p_partner_slug
  for update of po;
  if not found or v_workspace.partner_record_id is null then
    raise exception using errcode = 'P0002', message = 'Onboarding workspace not found';
  end if;
  if v_workspace.aggregate_version <> p_expected_workspace_version then
    raise exception using errcode = '40001', message = 'Onboarding workspace revision conflict';
  end if;
  if v_workspace.status not in ('draft', 'commercially_blocked', 'setup_in_progress') then
    raise exception using errcode = '55000', message = 'Onboarding workspace is not eligible for prefill';
  end if;

  insert into public.partner_onboarding_idempotency (
    workspace_id,
    operation_key,
    request_id,
    actor_user_id,
    payload_hash,
    expires_at
  ) values (
    p_workspace_id,
    'prefill_apply',
    p_request_id,
    p_actor_user_id,
    p_payload_hash,
    now() + interval '24 hours'
  );

  foreach v_value_id in array p_selected_value_ids loop
    select pv.*
      into v_value
    from public.partner_onboarding_prefill_values pv
    where pv.id = v_value_id
      and pv.workspace_id = p_workspace_id
    for update;

    if not found
       or v_value.review_status <> 'approved'
       or v_value.superseded_at is not null
       or v_value.partner_review_status <> 'not_applied' then
      v_skipped := array_append(v_skipped, v_value_id);
      continue;
    end if;

    select s.*
      into v_section
    from public.partner_onboarding_sections s
    where s.workspace_id = p_workspace_id
      and s.section_key = v_value.section_key
    for update;

    if not found
       or v_section.status not in ('not_started', 'in_progress')
       or v_section.revision <> v_value.base_section_revision then
      update public.partner_onboarding_prefill_values
      set
        review_status = 'conflict',
        reviewed_by = p_actor_user_id,
        reviewed_at = now()
      where id = v_value_id;
      v_conflicts := array_append(v_conflicts, v_value_id);
      v_conflict_count := v_conflict_count + 1;
      continue;
    end if;
  end loop;

  for v_update in
    select item
    from jsonb_array_elements(p_section_updates) item
  loop
    select coalesce(array_agg(value::uuid), '{}'::uuid[])
      into v_update_ids
    from jsonb_array_elements_text(
      coalesce(v_update->'valueIds', '[]'::jsonb)
    ) value;

    if cardinality(v_update_ids) = 0
       or v_update_ids && v_conflicts
       or v_update_ids && v_skipped then
      continue;
    end if;

    select s.*
      into v_section
    from public.partner_onboarding_sections s
    where s.workspace_id = p_workspace_id
      and s.section_key = v_update->>'sectionKey'
    for update;
    if not found
       or v_section.status not in ('not_started', 'in_progress')
       or v_section.revision <> (v_update->>'expectedRevision')::bigint then
      update public.partner_onboarding_prefill_values
      set
        review_status = 'conflict',
        reviewed_by = p_actor_user_id,
        reviewed_at = now()
      where id = any(v_update_ids)
        and review_status = 'approved';
      v_conflicts := v_conflicts || v_update_ids;
      v_conflict_count := v_conflict_count + cardinality(v_update_ids);
      continue;
    end if;

    foreach v_value_id in array v_update_ids loop
      select pv.*
        into v_value
      from public.partner_onboarding_prefill_values pv
      where pv.id = v_value_id
        and pv.workspace_id = p_workspace_id
        and pv.review_status = 'approved'
      for update;

      if not found
         or not (coalesce(v_update->'baseValues', '{}'::jsonb) ? v_value_id::text)
         or public.rcap_onboarding_prefill_current_value(
           p_workspace_id, v_value.section_key, v_value.field_key
         ) is distinct from v_update->'baseValues'->v_value_id::text then
        update public.partner_onboarding_prefill_values
        set
          review_status = 'conflict',
          reviewed_by = p_actor_user_id,
          reviewed_at = now()
        where id = v_value_id
          and review_status = 'approved';
        v_conflicts := array_append(v_conflicts, v_value_id);
        v_conflict_count := v_conflict_count + 1;
      end if;
    end loop;

    if v_update_ids && v_conflicts then
      continue;
    end if;

    v_new_revision := v_section.revision + 1;
    update public.partner_onboarding_sections
    set
      response_data = v_update->'responseData',
      revision = v_new_revision,
      status = 'in_progress',
      completion_percentage = (v_update->>'completionPercentage')::integer,
      missing_required_keys = coalesce(
        array(
          select jsonb_array_elements_text(
            coalesce(v_update->'missingRequiredKeys', '[]'::jsonb)
          )
        ),
        '{}'::text[]
      ),
      first_started_at = coalesce(first_started_at, now())
    where id = v_section.id;

    if v_section.section_key = 'organization_contacts' then
      update public.partner_onboarding_contacts c
      set deleted_at = now(), revision = c.revision + 1
      where c.workspace_id = p_workspace_id
        and c.deleted_at is null
        and not exists (
          select 1
          from jsonb_array_elements(
            coalesce(v_update->'collections'->'contacts', '[]'::jsonb)
          ) item
          where item->>'stable_row_id' = c.id::text
        );
      insert into public.partner_onboarding_contacts (
        id, workspace_id, role, name, title, organization, work_email, phone
      )
      select
        (item->>'stable_row_id')::uuid,
        p_workspace_id,
        item->>'role',
        item->>'name',
        item->>'title',
        nullif(item->>'organization', ''),
        lower(item->>'work_email'),
        nullif(item->>'phone', '')
      from jsonb_array_elements(
        coalesce(v_update->'collections'->'contacts', '[]'::jsonb)
      ) item
      on conflict (id) do update
      set
        role = excluded.role,
        name = excluded.name,
        title = excluded.title,
        organization = excluded.organization,
        work_email = excluded.work_email,
        phone = excluded.phone,
        revision = public.partner_onboarding_contacts.revision + 1,
        deleted_at = null
      where public.partner_onboarding_contacts.workspace_id = p_workspace_id;
    elsif v_section.section_key = 'staff_dashboard_plan' then
      update public.partner_onboarding_planned_users u
      set deleted_at = now(), revision = u.revision + 1
      where u.workspace_id = p_workspace_id
        and u.deleted_at is null
        and not exists (
          select 1
          from jsonb_array_elements(
            coalesce(v_update->'collections'->'planned_users', '[]'::jsonb)
          ) item
          where item->>'stable_row_id' = u.id::text
        );
      insert into public.partner_onboarding_planned_users (
        id, workspace_id, name, work_email, requested_role,
        special_permissions, training_attendee
      )
      select
        (item->>'stable_row_id')::uuid,
        p_workspace_id,
        item->>'name',
        lower(item->>'work_email'),
        item->>'requested_role',
        coalesce(array(
          select jsonb_array_elements_text(
            coalesce(item->'special_permissions', '[]'::jsonb)
          )
        ), '{}'::text[]),
        coalesce((item->>'training_attendee')::boolean, false)
      from jsonb_array_elements(
        coalesce(v_update->'collections'->'planned_users', '[]'::jsonb)
      ) item
      on conflict (id) do update
      set
        name = excluded.name,
        work_email = excluded.work_email,
        requested_role = excluded.requested_role,
        special_permissions = excluded.special_permissions,
        training_attendee = excluded.training_attendee,
        revision = public.partner_onboarding_planned_users.revision + 1,
        deleted_at = null
      where public.partner_onboarding_planned_users.workspace_id = p_workspace_id;
    elsif v_section.section_key = 'support_referrals_reporting' then
      update public.partner_onboarding_report_recipients r
      set deleted_at = now(), revision = r.revision + 1
      where r.workspace_id = p_workspace_id
        and r.deleted_at is null
        and not exists (
          select 1
          from jsonb_array_elements(
            coalesce(v_update->'collections'->'report_recipients', '[]'::jsonb)
          ) item
          where item->>'stable_row_id' = r.id::text
        );
      insert into public.partner_onboarding_report_recipients (
        id, workspace_id, name, work_email
      )
      select
        (item->>'stable_row_id')::uuid,
        p_workspace_id,
        nullif(item->>'name', ''),
        lower(item->>'work_email')
      from jsonb_array_elements(
        coalesce(v_update->'collections'->'report_recipients', '[]'::jsonb)
      ) item
      on conflict (id) do update
      set
        name = excluded.name,
        work_email = excluded.work_email,
        revision = public.partner_onboarding_report_recipients.revision + 1,
        deleted_at = null
      where public.partner_onboarding_report_recipients.workspace_id = p_workspace_id;
    end if;

    update public.partner_onboarding_prefill_values
    set
      review_status = 'applied',
      applied_value_hash = proposed_value_hash,
      applied_section_revision = v_new_revision,
      applied_workspace_version = p_expected_workspace_version + 1,
      partner_review_status = 'pending',
      applied_at = now()
    where id = any(v_update_ids)
      and review_status = 'approved';

    v_applied := v_applied || v_update_ids;
    v_applied_count := v_applied_count + cardinality(v_update_ids);
  end loop;

  foreach v_value_id in array p_selected_value_ids loop
    if not (v_value_id = any(v_applied))
       and not (v_value_id = any(v_conflicts))
       and not (v_value_id = any(v_skipped)) then
      update public.partner_onboarding_prefill_values
      set
        review_status = 'conflict',
        reviewed_by = p_actor_user_id,
        reviewed_at = now()
      where id = v_value_id
        and workspace_id = p_workspace_id
        and review_status = 'approved';
      if found then
        v_conflicts := array_append(v_conflicts, v_value_id);
        v_conflict_count := v_conflict_count + 1;
      else
        v_skipped := array_append(v_skipped, v_value_id);
      end if;
    end if;
  end loop;

  if v_applied_count > 0 then
    update public.partner_onboarding
    set
      aggregate_version = aggregate_version + 1,
      completion_percentage = p_workspace_completion,
      blocker_code = p_blocker_code,
      next_action_code = p_next_action_code,
      next_action_owner = p_next_action_owner,
      last_meaningful_activity_at = now()
    where id = p_workspace_id
    returning aggregate_version into workspace_aggregate_version;

    update public.partner_onboarding_prefill_values
    set applied_workspace_version = workspace_aggregate_version
    where id = any(v_applied);

    update public.partner_onboarding_prefill_batches b
    set
      aggregate_version = aggregate_version + 1,
      status = case
        when exists (
          select 1 from public.partner_onboarding_prefill_values pv
          where pv.batch_id = b.id
            and pv.review_status in ('proposed', 'approved', 'conflict')
        ) then 'partially_applied'
        else 'applied'
      end,
      applied_at = coalesce(applied_at, now())
    where exists (
      select 1
      from public.partner_onboarding_prefill_values pv
      where pv.batch_id = b.id
        and pv.id = any(v_applied)
    );

    insert into public.partner_onboarding_activity (
      workspace_id, event_type, status_code, summary_code, owner_type,
      actor_user_id, request_id, dedupe_key
    ) values (
      p_workspace_id, 'prefill_applied', 'pending_partner_review',
      'prefill_applied', 'legalease', p_actor_user_id, p_request_id,
      p_request_id::text || ':prefill_applied'
    );

    insert into public.partner_onboarding_integration_events (
      workspace_id, partner_record_id, event_type,
      workspace_aggregate_version, workspace_status,
      completion_percentage, blocker_code, next_action_code,
      next_action_owner, target_launch_date, idempotency_key
    )
    select
      po.id, po.partner_record_id, 'rcap_onboarding_prefill_applied',
      po.aggregate_version, po.status, po.completion_percentage,
      po.blocker_code, po.next_action_code, po.next_action_owner,
      po.target_launch_date, p_request_id::text || ':prefill_applied'
    from public.partner_onboarding po
    where po.id = p_workspace_id;
  else
    workspace_aggregate_version := v_workspace.aggregate_version;
  end if;

  if v_conflict_count > 0 then
    insert into public.partner_onboarding_activity (
      workspace_id, event_type, status_code, summary_code, owner_type,
      actor_user_id, request_id, dedupe_key
    ) values (
      p_workspace_id, 'prefill_apply_conflict', 'conflict',
      'prefill_apply_conflict', 'legalease', p_actor_user_id, p_request_id,
      p_request_id::text || ':prefill_apply_conflict'
    );
  end if;

  result := jsonb_build_object(
    'appliedIds', to_jsonb(v_applied),
    'conflictIds', to_jsonb(v_conflicts),
    'skippedIds', to_jsonb(v_skipped)
  );
  update public.partner_onboarding_idempotency
  set
    result_status = 'succeeded',
    result_workspace_version = workspace_aggregate_version,
    completed_at = now()
  where request_id = p_request_id;
  duplicate := false;
  return next;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_service_assert_internal_actor(p_actor_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
begin
  if p_actor_user_id is null
     or not exists (
       select 1
       from public.partner_users pu
       where pu.auth_user_id = p_actor_user_id
         and pu.partner_slug is null
         and pu.role = 'internal_admin'
         and pu.status = 'active'
     ) then
    raise exception using
      errcode = '42501',
      message = 'Active internal administrator is required';
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_service_assert_partner_actor(p_partner_slug text, p_actor_user_id uuid, p_workspace_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 STABLE
 SET search_path TO ''
AS $function$
begin
  if p_partner_slug is null
     or p_actor_user_id is null
     or p_workspace_id is null
     or not exists (
       select 1
       from public.partner_users pu
       join public.partner_onboarding po
         on po.partner_slug = pu.partner_slug
       where pu.auth_user_id = p_actor_user_id
         and pu.partner_slug = p_partner_slug
         and pu.role = 'partner_admin'
         and pu.status = 'active'
         and po.id = p_workspace_id
     ) then
    raise exception using
      errcode = '42501',
      message = 'Active partner administrator does not match onboarding workspace';
  end if;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_service_create_onboarding_workspace(p_partner_slug text, p_actor_user_id uuid, p_request_id uuid, p_target_launch_date date, p_schema_version text, p_payload_hash text)
 RETURNS TABLE(workspace_id uuid, workspace_status text, created boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_partner public.partner_records%rowtype;
  v_workspace public.partner_onboarding%rowtype;
  v_existing public.partner_onboarding_idempotency%rowtype;
  v_created boolean := false;
  v_gate text;
  v_status text;
begin
  perform public.rcap_service_assert_internal_actor(p_actor_user_id);
  if nullif(btrim(p_partner_slug), '') is null
     or nullif(btrim(p_schema_version), '') is null
     or p_payload_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid workspace creation request';
  end if;

  select *
    into v_partner
  from public.partner_records pr
  where pr.partner_slug = p_partner_slug
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Partner not found';
  end if;

  select *
    into v_existing
  from public.partner_onboarding_idempotency i
  where i.request_id = p_request_id
  for update;
  if found then
    if v_existing.operation_key <> 'workspace:create:' || p_partner_slug
       or v_existing.actor_user_id <> p_actor_user_id
       or v_existing.payload_hash <> p_payload_hash then
      raise exception using errcode = '23505', message = 'Idempotency request mismatch';
    end if;
    return query
    select
      po.id,
      po.status,
      false
    from public.partner_onboarding po
    where po.id = v_existing.workspace_id;
    return;
  end if;

  select *
    into v_workspace
  from public.partner_onboarding po
  where po.partner_slug = p_partner_slug
  for update;

  v_gate := case
    when v_partner.payment_status = 'paid' then 'cleared_by_paid_invoice'
    else 'blocked'
  end;
  v_status := case
    when v_gate = 'blocked' then 'commercially_blocked'
    else 'setup_in_progress'
  end;

  if not found then
    insert into public.partner_onboarding (
      partner_slug,
      partner_record_id,
      status,
      schema_version,
      aggregate_version,
      completion_percentage,
      blocker_code,
      next_action_code,
      next_action_owner,
      target_launch_date,
      target_launch_date_reason,
      target_launch_date_changed_at,
      target_launch_date_changed_by,
      commercial_gate_status,
      commercial_gate_evidence_reference,
      commercial_gate_changed_at,
      commercial_gate_changed_by,
      last_meaningful_activity_at
    ) values (
      p_partner_slug,
      v_partner.id,
      v_status,
      p_schema_version,
      1,
      0,
      case when v_gate = 'blocked' then 'commercial_gate_blocked' end,
      case
        when v_gate = 'blocked' then 'complete_commercial_requirements'
        else 'complete_section'
      end,
      'partner',
      p_target_launch_date,
      case
        when p_target_launch_date is not null then 'Set during workspace creation.'
        else null
      end,
      case when p_target_launch_date is not null then now() else null end,
      case when p_target_launch_date is not null then p_actor_user_id else null end,
      v_gate,
      case
        when v_gate = 'cleared_by_paid_invoice'
          then 'partner_record:' || v_partner.id::text
        else null
      end,
      now(),
      p_actor_user_id,
      now()
    )
    returning * into v_workspace;
    v_created := true;
  else
    update public.partner_onboarding
    set
      partner_record_id = v_partner.id,
      schema_version = p_schema_version,
      target_launch_date = coalesce(p_target_launch_date, target_launch_date),
      target_launch_date_reason = case
        when p_target_launch_date is not null then 'Set during workspace creation.'
        else target_launch_date_reason
      end,
      target_launch_date_changed_at = case
        when p_target_launch_date is not null then now()
        else target_launch_date_changed_at
      end,
      target_launch_date_changed_by = case
        when p_target_launch_date is not null then p_actor_user_id
        else target_launch_date_changed_by
      end,
      status = case
        when status in ('draft', 'commercially_blocked') then v_status
        else status
      end,
      commercial_gate_status = case
        when status in ('draft', 'commercially_blocked')
             or commercial_gate_changed_at is null then v_gate
        else commercial_gate_status
      end,
      commercial_gate_evidence_reference = case
        when status in ('draft', 'commercially_blocked')
             and v_gate = 'cleared_by_paid_invoice'
          then 'partner_record:' || v_partner.id::text
        when commercial_gate_changed_at is null
             and v_gate = 'cleared_by_paid_invoice'
          then 'partner_record:' || v_partner.id::text
        when status in ('draft', 'commercially_blocked') then null
        when commercial_gate_changed_at is null then null
        else commercial_gate_evidence_reference
      end,
      blocker_code = case
        when (
          status in ('draft', 'commercially_blocked')
          or commercial_gate_changed_at is null
        ) and v_gate = 'blocked'
          then 'commercial_gate_blocked'
        when status in ('live', 'paused', 'closed', 'ready_for_review', 'ready_to_launch')
             and commercial_gate_changed_at is null then null
        when status in ('draft', 'commercially_blocked')
             or commercial_gate_changed_at is null
          then 'required_section_incomplete'
        else blocker_code
      end,
      next_action_code = case
        when (
          status in ('draft', 'commercially_blocked')
          or commercial_gate_changed_at is null
        ) and v_gate = 'blocked'
          then 'complete_commercial_requirements'
        when status = 'ready_for_review'
             and commercial_gate_changed_at is null
          then 'await_legalease_review'
        when status = 'ready_to_launch'
             and commercial_gate_changed_at is null
          then 'prepare_for_launch'
        when status = 'live'
             and commercial_gate_changed_at is null
          then 'program_live'
        when status = 'paused'
             and commercial_gate_changed_at is null
          then 'program_paused'
        when status = 'closed'
             and commercial_gate_changed_at is null
          then 'onboarding_closed'
        when status in ('draft', 'commercially_blocked')
             or commercial_gate_changed_at is null
          then 'complete_section'
        else next_action_code
      end,
      next_action_owner = case
        when (
          status in ('draft', 'commercially_blocked')
          or commercial_gate_changed_at is null
        ) and v_gate = 'blocked'
          then 'partner'
        when status in ('ready_for_review', 'ready_to_launch', 'paused')
             and commercial_gate_changed_at is null
          then 'legalease'
        when status in ('live', 'closed')
             and commercial_gate_changed_at is null
          then 'none'
        when status in ('draft', 'commercially_blocked')
             or commercial_gate_changed_at is null
          then 'partner'
        else next_action_owner
      end,
      commercial_gate_changed_at = case
        when status in ('draft', 'commercially_blocked')
             or commercial_gate_changed_at is null then now()
        else commercial_gate_changed_at
      end,
      commercial_gate_changed_by = case
        when status in ('draft', 'commercially_blocked')
             or commercial_gate_changed_at is null then p_actor_user_id
        else commercial_gate_changed_by
      end,
      aggregate_version = aggregate_version + 1,
      last_meaningful_activity_at = coalesce(last_meaningful_activity_at, now())
    where id = v_workspace.id
    returning * into v_workspace;
  end if;

  insert into public.partner_onboarding_sections (
    workspace_id,
    section_key,
    response_data,
    revision,
    status,
    completion_percentage,
    missing_required_keys
  )
  select
    v_workspace.id,
    section_key,
    '{}'::jsonb,
    1,
    'not_started',
    0,
    '{}'::text[]
  from unnest(array[
    'organization_contacts',
    'program_goals',
    'geography_audience_language_accessibility',
    'access_sponsorship_capacity',
    'brand_public_page',
    'staff_dashboard_plan',
    'support_referrals_reporting',
    'review_authorization'
  ]::text[]) section_key
  on conflict on constraint partner_onboarding_sections_workspace_key_unique
  do nothing;

  insert into public.partner_onboarding_idempotency (
    workspace_id,
    operation_key,
    request_id,
    actor_user_id,
    payload_hash,
    result_status,
    result_workspace_version,
    expires_at,
    completed_at
  ) values (
    v_workspace.id,
    'workspace:create:' || p_partner_slug,
    p_request_id,
    p_actor_user_id,
    p_payload_hash,
    'succeeded',
    v_workspace.aggregate_version,
    now() + interval '24 hours',
    now()
  );

  insert into public.partner_onboarding_activity (
    workspace_id,
    event_type,
    status_code,
    summary_code,
    owner_type,
    actor_user_id,
    request_id,
    dedupe_key
  ) values (
    v_workspace.id,
    'workspace_created',
    v_workspace.status,
    'workspace_created',
    'legalease',
    p_actor_user_id,
    p_request_id,
    'workspace-created'
  )
  on conflict do nothing;

  insert into public.partner_onboarding_integration_events (
    workspace_id,
    partner_record_id,
    event_type,
    workspace_aggregate_version,
    workspace_status,
    completion_percentage,
    blocker_code,
    next_action_code,
    next_action_owner,
    target_launch_date,
    idempotency_key
  ) values (
    v_workspace.id,
    v_partner.id,
    'rcap_partner_workspace_created',
    v_workspace.aggregate_version,
    v_workspace.status,
    v_workspace.completion_percentage,
    v_workspace.blocker_code,
    v_workspace.next_action_code,
    v_workspace.next_action_owner,
    v_workspace.target_launch_date,
    p_request_id::text || ':workspace-created'
  )
  on conflict do nothing;

  workspace_id := v_workspace.id;
  workspace_status := v_workspace.status;
  created := v_created;
  return next;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_service_delete_onboarding_asset(p_partner_slug text, p_actor_user_id uuid, p_workspace_id uuid, p_asset_id uuid, p_expected_workspace_version bigint, p_payload_hash text, p_workspace_completion integer, p_blocker_code text, p_next_action_code text, p_next_action_owner text, p_request_id uuid)
 RETURNS TABLE(object_path text, workspace_aggregate_version bigint, duplicate boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_workspace public.partner_onboarding%rowtype;
  v_asset public.partner_onboarding_assets%rowtype;
  v_existing public.partner_onboarding_idempotency%rowtype;
  v_partner_record_id uuid;
begin
  perform public.rcap_service_assert_partner_actor(
    p_partner_slug, p_actor_user_id, p_workspace_id
  );
  if p_expected_workspace_version < 1
     or p_payload_hash !~ '^[0-9a-f]{64}$'
     or p_workspace_completion not between 0 and 100
     or p_next_action_owner not in ('partner', 'legalease', 'none') then
    raise exception using
      errcode = '22023',
      message = 'Invalid organizational asset deletion summary';
  end if;

  select *
    into v_existing
  from public.partner_onboarding_idempotency i
  where i.request_id = p_request_id
  for update;
  if found then
    if v_existing.workspace_id <> p_workspace_id
       or v_existing.operation_key <> 'asset:delete'
       or v_existing.actor_user_id <> p_actor_user_id
       or v_existing.payload_hash <> p_payload_hash then
      raise exception using errcode = '23505', message = 'Idempotency request mismatch';
    end if;
    return query
    select
      a.object_path,
      v_existing.result_workspace_version,
      true
    from public.partner_onboarding_assets a
    where a.id = p_asset_id
      and a.workspace_id = p_workspace_id;
    return;
  end if;

  select *
    into v_workspace
  from public.partner_onboarding po
  where po.id = p_workspace_id
    and po.partner_slug = p_partner_slug
  for update;
  if not found
     or v_workspace.commercial_gate_status = 'blocked'
     or v_workspace.status not in ('setup_in_progress', 'waiting_on_partner') then
    raise exception using errcode = '55000', message = 'Workspace is not editable';
  end if;
  if v_workspace.aggregate_version <> p_expected_workspace_version then
    raise exception using
      errcode = '40001',
      message = 'Onboarding workspace revision conflict';
  end if;
  select coalesce(v_workspace.partner_record_id, pr.id)
    into v_partner_record_id
  from public.partner_records pr
  where pr.partner_slug = p_partner_slug;

  select *
    into v_asset
  from public.partner_onboarding_assets a
  where a.id = p_asset_id
    and a.workspace_id = p_workspace_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Organizational asset not found';
  end if;
  if exists (
    select 1
    from public.partner_onboarding_agreements agreement
    where agreement.finalized_asset_id = v_asset.id
  ) then
    raise exception using
      errcode = '55000',
      message = 'A finalized agreement document cannot be removed';
  end if;

  insert into public.partner_onboarding_idempotency (
    workspace_id,
    operation_key,
    request_id,
    actor_user_id,
    payload_hash,
    expires_at
  ) values (
    p_workspace_id,
    'asset:delete',
    p_request_id,
    p_actor_user_id,
    p_payload_hash,
    now() + interval '24 hours'
  );

  if v_asset.deleted_at is null then
    update public.partner_onboarding_assets
    set
      lifecycle_status = 'deleted',
      deleted_by = p_actor_user_id,
      deleted_at = now(),
      deletion_reason = 'partner_removed',
      updated_at = now()
    where id = p_asset_id;

    update public.partner_onboarding
    set
      aggregate_version = aggregate_version + 1,
      completion_percentage = p_workspace_completion,
      blocker_code = p_blocker_code,
      next_action_code = p_next_action_code,
      next_action_owner = p_next_action_owner,
      last_meaningful_activity_at = now()
    where id = p_workspace_id
    returning aggregate_version into workspace_aggregate_version;

    insert into public.partner_onboarding_activity (
      workspace_id,
      event_type,
      section_key,
      status_code,
      summary_code,
      owner_type,
      actor_user_id,
      request_id,
      dedupe_key
    ) values (
      p_workspace_id,
      'required_asset_deleted',
      'brand_public_page',
      'deleted',
      'required_asset_deleted',
      'partner',
      p_actor_user_id,
      p_request_id,
      p_request_id::text || ':asset-delete'
    )
    on conflict do nothing;

    insert into public.partner_onboarding_integration_events (
      workspace_id,
      partner_record_id,
      event_type,
      workspace_aggregate_version,
      workspace_status,
      completion_percentage,
      blocker_code,
      next_action_code,
      next_action_owner,
      target_launch_date,
      section_key,
      artifact_category,
      artifact_status,
      idempotency_key
    )
    select
      po.id,
      v_partner_record_id,
      'rcap_brand_configuration_changed',
      po.aggregate_version,
      po.status,
      po.completion_percentage,
      po.blocker_code,
      po.next_action_code,
      po.next_action_owner,
      po.target_launch_date,
      'brand_public_page',
      v_asset.category,
      'deleted',
      p_request_id::text || ':asset-delete'
    from public.partner_onboarding po
    where po.id = p_workspace_id
    on conflict do nothing;
  else
    workspace_aggregate_version := v_workspace.aggregate_version;
  end if;

  update public.partner_onboarding_idempotency
  set
    result_status = 'succeeded',
    result_workspace_version = workspace_aggregate_version,
    completed_at = now()
  where request_id = p_request_id;

  object_path := v_asset.object_path;
  duplicate := v_asset.deleted_at is not null;
  return next;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_service_ensure_onboarding_artifacts(p_partner_slug text, p_workspace_id uuid, p_generatable_types text[])
 RETURNS SETOF partner_onboarding_artifacts
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_partner_record_id uuid;
  v_type text;
begin
  select po.partner_record_id into v_partner_record_id
  from public.partner_onboarding po
  where po.id = p_workspace_id
    and po.partner_slug = p_partner_slug;

  if v_partner_record_id is null then
    raise exception 'workspace_not_found' using errcode = 'P0002';
  end if;

  foreach v_type in array array[
    'implementation_brief',
    'operations_escalation_plan',
    'dashboard_user_reporting_matrix',
    'staff_quick_start_guide',
    'partner_launch_kit',
    'co_branded_page_configuration'
  ]
  loop
    insert into public.partner_onboarding_artifacts (
      workspace_id, partner_record_id, artifact_type, lifecycle_status
    )
    values (
      p_workspace_id,
      v_partner_record_id,
      v_type,
      case when v_type = any(p_generatable_types)
        then 'not_generated'
        else 'unavailable_in_release'
      end
    )
    on conflict (workspace_id, artifact_type) do nothing;
  end loop;

  -- A type that gains a generator in a later release stops being unavailable.
  update public.partner_onboarding_artifacts
  set lifecycle_status = 'not_generated'
  where workspace_id = p_workspace_id
    and lifecycle_status = 'unavailable_in_release'
    and artifact_type = any(p_generatable_types);

  return query
  select *
  from public.partner_onboarding_artifacts
  where workspace_id = p_workspace_id;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_service_generate_onboarding_artifact_version(p_partner_slug text, p_actor_user_id uuid, p_workspace_id uuid, p_artifact_type text, p_request_id uuid, p_source_workspace_version bigint, p_source_section_revisions jsonb, p_source_asset_versions jsonb, p_normalized_snapshot jsonb, p_snapshot_hash text, p_generator_version text, p_rendered_content jsonb, p_generation_status text, p_generation_error_code text)
 RETURNS TABLE(version_id uuid, version_number integer, duplicate boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_artifact public.partner_onboarding_artifacts%rowtype;
  v_existing public.partner_onboarding_artifact_versions%rowtype;
  v_next integer;
  v_new public.partner_onboarding_artifact_versions%rowtype;
begin
  if p_generation_status not in ('succeeded', 'failed') then
    raise exception 'invalid_generation_status' using errcode = '22023';
  end if;

  select a.* into v_artifact
  from public.partner_onboarding_artifacts a
  join public.partner_onboarding po on po.id = a.workspace_id
  where a.workspace_id = p_workspace_id
    and a.artifact_type = p_artifact_type
    and po.partner_slug = p_partner_slug
  for update of a;

  if v_artifact.id is null then
    raise exception 'artifact_not_found' using errcode = 'P0002';
  end if;

  if v_artifact.lifecycle_status = 'unavailable_in_release' then
    raise exception 'artifact_generator_unavailable' using errcode = '0A000';
  end if;

  -- Idempotency: the same request id returns the version it already created.
  select v.* into v_existing
  from public.partner_onboarding_artifact_versions v
  where v.artifact_id = v_artifact.id
    and v.request_id = p_request_id;

  if v_existing.id is not null then
    version_id := v_existing.id;
    version_number := v_existing.version_number;
    duplicate := true;
    return next;
    return;
  end if;

  select coalesce(max(v.version_number), 0) + 1 into v_next
  from public.partner_onboarding_artifact_versions v
  where v.artifact_id = v_artifact.id;

  insert into public.partner_onboarding_artifact_versions (
    artifact_id, workspace_id, version_number,
    source_workspace_version, source_section_revisions, source_asset_versions,
    normalized_snapshot, snapshot_hash, generator_version, rendered_content,
    generation_status, generation_error_code,
    approval_status, generated_by, request_id
  )
  values (
    v_artifact.id, p_workspace_id, v_next,
    p_source_workspace_version, p_source_section_revisions, p_source_asset_versions,
    p_normalized_snapshot, p_snapshot_hash, p_generator_version, p_rendered_content,
    p_generation_status, p_generation_error_code,
    case when p_generation_status = 'failed' then 'generation_failed' else 'draft' end,
    p_actor_user_id, p_request_id
  )
  returning * into v_new;

  -- A superseded prior version stays readable in history; it is never rewritten.
  update public.partner_onboarding_artifact_versions
  set approval_status = 'superseded',
      superseded_at = now()
  where artifact_id = v_artifact.id
    and id <> v_new.id
    and approval_status <> 'generation_failed'
    and superseded_at is null;

  update public.partner_onboarding_artifacts
  set current_version_id = v_new.id,
      lifecycle_status = case
        when p_generation_status = 'failed' then 'generation_failed'
        else 'draft'
      end
  where id = v_artifact.id;

  insert into public.partner_onboarding_activity (
    workspace_id, event_type, owner_type, summary_code, status_code,
    artifact_version_id
  )
  values (
    p_workspace_id,
    case when p_generation_status = 'failed'
      then 'artifact_generation_failed'
      else 'artifact_generated'
    end,
    'legalease',
    p_artifact_type,
    p_generation_status,
    v_new.id
  );

  version_id := v_new.id;
  version_number := v_new.version_number;
  duplicate := false;
  return next;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_service_invalidate_onboarding_artifact_version(p_partner_slug text, p_artifact_version_id uuid, p_current_snapshot_hash text, p_drift_fields text[])
 RETURNS TABLE(invalidated boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_updated public.partner_onboarding_artifact_versions%rowtype;
  v_artifact_type text;
begin
  update public.partner_onboarding_artifact_versions v
  set source_drift_invalidated_at = now(),
      source_drift_fields = p_drift_fields,
      invalidated_against_snapshot_hash = p_current_snapshot_hash
  from public.partner_onboarding po
  where v.id = p_artifact_version_id
    and po.id = v.workspace_id
    and po.partner_slug = p_partner_slug
    and v.generation_status = 'succeeded'
    and v.source_drift_invalidated_at is null
    and v.snapshot_hash <> p_current_snapshot_hash
  returning v.* into v_updated;

  if v_updated.id is null then
    invalidated := false;
    return next;
    return;
  end if;

  select a.artifact_type into v_artifact_type
  from public.partner_onboarding_artifacts a
  where a.id = v_updated.artifact_id;

  insert into public.partner_onboarding_activity (
    workspace_id, event_type, owner_type, summary_code, status_code,
    artifact_version_id
  )
  values (
    v_updated.workspace_id,
    'artifact_approval_invalidated',
    'system',
    v_artifact_type,
    'source_changed',
    v_updated.id
  )
  on conflict do nothing;

  invalidated := true;
  return next;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_service_invalidate_onboarding_launch_checks(p_partner_slug text, p_workspace_id uuid, p_invalidate_partner_owned boolean, p_reason text)
 RETURNS TABLE(invalidated_count integer)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_count integer;
begin
  if p_reason is null or char_length(btrim(p_reason)) = 0 then
    raise exception 'invalidation_reason_required' using errcode = '22023';
  end if;

  with updated as (
    update public.partner_onboarding_launch_checks c
    set invalidated_at = now(),
        invalidated_reason = p_reason
    from public.partner_onboarding po
    where c.workspace_id = p_workspace_id
      and po.id = c.workspace_id
      and po.partner_slug = p_partner_slug
      and c.invalidated_at is null
      and c.status in ('passing', 'waived', 'not_applicable')
      and (p_invalidate_partner_owned or c.owner_type = 'legalease')
    returning c.id
  )
  select count(*)::integer into v_count from updated;

  if v_count > 0 then
    insert into public.partner_onboarding_activity (
      workspace_id, event_type, owner_type, summary_code, status_code
    )
    values (
      p_workspace_id, 'launch_check_invalidated', 'system',
      case when p_invalidate_partner_owned then 'all_owners' else 'legalease_only' end,
      'source_changed'
    );
  end if;

  invalidated_count := v_count;
  return next;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_service_prepare_onboarding_prefill(p_partner_slug text, p_actor_user_id uuid, p_workspace_id uuid, p_request_id uuid, p_payload_hash text, p_source_summary text, p_batch_status text, p_origin text, p_suggestions jsonb)
 RETURNS TABLE(batch_id uuid, batch_aggregate_version bigint, suggestion_count integer, duplicate boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_workspace public.partner_onboarding%rowtype;
  v_existing public.partner_onboarding_idempotency%rowtype;
  v_batch public.partner_onboarding_prefill_batches%rowtype;
  v_count integer;
begin
  perform public.rcap_service_assert_internal_actor(p_actor_user_id);

  if p_batch_status not in ('draft', 'ready_for_review')
     or p_origin not in ('manual', 'import')
     or p_payload_hash !~ '^[0-9a-f]{64}$'
     or char_length(p_source_summary) not between 1 and 500
     or p_suggestions is null
     or jsonb_typeof(p_suggestions) <> 'array'
     or jsonb_array_length(p_suggestions) < 1
     or jsonb_array_length(p_suggestions) > 200 then
    raise exception using
      errcode = '22023',
      message = 'Invalid onboarding prefill preparation';
  end if;

  select *
    into v_existing
  from public.partner_onboarding_idempotency i
  where i.request_id = p_request_id
  for update;

  if found then
    if v_existing.workspace_id <> p_workspace_id
       or v_existing.operation_key <> 'prefill_prepare'
       or v_existing.actor_user_id <> p_actor_user_id
       or v_existing.payload_hash <> p_payload_hash then
      raise exception using
        errcode = '23505',
        message = 'Idempotency request does not match original mutation';
    end if;
    if v_existing.result_status = 'succeeded' then
      select *
        into v_batch
      from public.partner_onboarding_prefill_batches b
      where b.request_id = p_request_id;
      return query
      select
        v_batch.id,
        v_batch.aggregate_version,
        (
          select count(*)::integer
          from public.partner_onboarding_prefill_values pv
          where pv.batch_id = v_batch.id
        ),
        true;
      return;
    end if;
    raise exception using
      errcode = '55000',
      message = 'Idempotent request is still in progress';
  end if;

  select po.*
    into v_workspace
  from public.partner_onboarding po
  where po.id = p_workspace_id
    and po.partner_slug = p_partner_slug
  for update of po;

  if not found or v_workspace.partner_record_id is null then
    raise exception using
      errcode = 'P0002',
      message = 'Onboarding workspace not found';
  end if;
  if v_workspace.status in ('ready_to_launch', 'live', 'paused', 'closed') then
    raise exception using
      errcode = '55000',
      message = 'Onboarding workspace no longer accepts prefill suggestions';
  end if;

  insert into public.partner_onboarding_idempotency (
    workspace_id,
    operation_key,
    request_id,
    actor_user_id,
    payload_hash,
    expires_at
  ) values (
    p_workspace_id,
    'prefill_prepare',
    p_request_id,
    p_actor_user_id,
    p_payload_hash,
    now() + interval '24 hours'
  );

  insert into public.partner_onboarding_prefill_batches (
    workspace_id,
    partner_record_id,
    status,
    source_summary,
    created_by,
    request_id
  ) values (
    p_workspace_id,
    v_workspace.partner_record_id,
    p_batch_status,
    p_source_summary,
    p_actor_user_id,
    p_request_id
  )
  returning * into v_batch;

  insert into public.partner_onboarding_prefill_values (
    id,
    batch_id,
    workspace_id,
    section_key,
    field_key,
    proposed_value,
    source_type,
    source_reference_id,
    source_label,
    confidence,
    base_value_hash,
    proposed_value_hash,
    base_section_revision,
    created_by
  )
  select
    coalesce(nullif(item->>'id', '')::uuid, gen_random_uuid()),
    v_batch.id,
    p_workspace_id,
    item->>'sectionKey',
    item->>'fieldKey',
    item->'proposedValue',
    item->>'sourceType',
    nullif(item->>'sourceReferenceId', ''),
    item->>'sourceLabel',
    case
      when item ? 'confidence' and item->'confidence' <> 'null'::jsonb
        then (item->>'confidence')::numeric
      else null
    end,
    item->>'baseValueHash',
    item->>'proposedValueHash',
    (item->>'baseSectionRevision')::bigint,
    p_actor_user_id
  from jsonb_array_elements(p_suggestions) item;

  get diagnostics v_count = row_count;

  insert into public.partner_onboarding_activity (
    workspace_id,
    event_type,
    summary_code,
    owner_type,
    actor_user_id,
    request_id,
    dedupe_key
  ) values (
    p_workspace_id,
    'prefill_batch_created',
    'prefill_batch_created',
    'legalease',
    p_actor_user_id,
    p_request_id,
    p_request_id::text || ':prefill_batch_created'
  );

  if p_origin = 'import' then
    insert into public.partner_onboarding_activity (
      workspace_id,
      event_type,
      summary_code,
      owner_type,
      actor_user_id,
      request_id,
      dedupe_key
    ) values (
      p_workspace_id,
      'prefill_known_data_imported',
      'prefill_known_data_imported',
      'legalease',
      p_actor_user_id,
      p_request_id,
      p_request_id::text || ':prefill_known_data_imported'
    );
  end if;

  insert into public.partner_onboarding_integration_events (
    workspace_id,
    partner_record_id,
    event_type,
    workspace_aggregate_version,
    workspace_status,
    completion_percentage,
    blocker_code,
    next_action_code,
    next_action_owner,
    target_launch_date,
    idempotency_key
  ) values (
    v_workspace.id,
    v_workspace.partner_record_id,
    'rcap_onboarding_prefill_prepared',
    v_workspace.aggregate_version,
    v_workspace.status,
    v_workspace.completion_percentage,
    v_workspace.blocker_code,
    v_workspace.next_action_code,
    v_workspace.next_action_owner,
    v_workspace.target_launch_date,
    p_request_id::text || ':prefill_prepared'
  );

  update public.partner_onboarding_idempotency
  set
    result_status = 'succeeded',
    result_workspace_version = v_workspace.aggregate_version,
    result_section_revision = v_batch.aggregate_version,
    completed_at = now()
  where request_id = p_request_id;

  batch_id := v_batch.id;
  batch_aggregate_version := v_batch.aggregate_version;
  suggestion_count := v_count;
  duplicate := false;
  return next;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_service_record_onboarding_asset(p_partner_slug text, p_actor_user_id uuid, p_workspace_id uuid, p_asset_id uuid, p_expected_workspace_version bigint, p_category text, p_object_path text, p_original_filename text, p_safe_filename text, p_media_type text, p_file_extension text, p_byte_size bigint, p_width_pixels integer, p_height_pixels integer, p_sha256_hex text, p_payload_hash text, p_workspace_completion integer, p_blocker_code text, p_next_action_code text, p_next_action_owner text, p_request_id uuid)
 RETURNS TABLE(asset_id uuid, superseded_object_path text, workspace_aggregate_version bigint, duplicate boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_workspace public.partner_onboarding%rowtype;
  v_existing_asset public.partner_onboarding_assets%rowtype;
  v_existing_request public.partner_onboarding_idempotency%rowtype;
  v_partner_record_id uuid;
begin
  perform public.rcap_service_assert_partner_actor(
    p_partner_slug, p_actor_user_id, p_workspace_id
  );
  if p_category not in (
    'transparent_logo',
    'brand_guide',
    'hero_or_community_image',
    'organizer_or_program_lead_image',
    'approved_partner_description_attachment',
    'procurement_document',
    'other_approved_organizational_asset'
  )
     or p_expected_workspace_version < 1
     or p_sha256_hex !~ '^[0-9a-f]{64}$'
     or p_payload_hash !~ '^[0-9a-f]{64}$'
     or p_workspace_completion not between 0 and 100
     or p_next_action_owner not in ('partner', 'legalease', 'none') then
    raise exception using errcode = '22023', message = 'Invalid organizational asset metadata';
  end if;

  select *
    into v_existing_request
  from public.partner_onboarding_idempotency i
  where i.request_id = p_request_id
  for update;
  if found then
    if v_existing_request.workspace_id <> p_workspace_id
       or v_existing_request.operation_key <> 'asset:record:' || p_category
       or v_existing_request.actor_user_id <> p_actor_user_id
       or v_existing_request.payload_hash <> p_payload_hash then
      raise exception using errcode = '23505', message = 'Idempotency request mismatch';
    end if;
    if v_existing_request.result_status = 'succeeded' then
      return query
      select
        a.id,
        null::text,
        v_existing_request.result_workspace_version,
        true
      from public.partner_onboarding_assets a
      where a.id = p_asset_id
        and a.workspace_id = p_workspace_id;
      return;
    end if;
    raise exception using errcode = '55000', message = 'Idempotent request is still in progress';
  end if;

  select *
    into v_workspace
  from public.partner_onboarding po
  where po.id = p_workspace_id
    and po.partner_slug = p_partner_slug
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Onboarding workspace not found';
  end if;
  if v_workspace.aggregate_version <> p_expected_workspace_version then
    raise exception using
      errcode = '40001',
      message = 'Onboarding workspace revision conflict';
  end if;
  if v_workspace.commercial_gate_status = 'blocked'
     or v_workspace.status not in ('setup_in_progress', 'waiting_on_partner') then
    raise exception using errcode = '55000', message = 'Workspace is not editable';
  end if;
  select coalesce(v_workspace.partner_record_id, pr.id)
    into v_partner_record_id
  from public.partner_records pr
  where pr.partner_slug = p_partner_slug;

  insert into public.partner_onboarding_idempotency (
    workspace_id,
    operation_key,
    request_id,
    actor_user_id,
    payload_hash,
    expires_at
  ) values (
    p_workspace_id,
    'asset:record:' || p_category,
    p_request_id,
    p_actor_user_id,
    p_payload_hash,
    now() + interval '24 hours'
  );

  select *
    into v_existing_asset
  from public.partner_onboarding_assets a
  where a.workspace_id = p_workspace_id
    and a.category = p_category
    and a.deleted_at is null
    and a.lifecycle_status in ('pending_review', 'active')
  for update;

  if found then
    if exists (
      select 1
      from public.partner_onboarding_agreements agreement
      where agreement.finalized_asset_id = v_existing_asset.id
    ) then
      raise exception using
        errcode = '55000',
        message = 'A finalized agreement document cannot be replaced';
    end if;
    update public.partner_onboarding_assets
    set
      lifecycle_status = 'superseded',
      updated_at = now()
    where id = v_existing_asset.id;
  end if;

  insert into public.partner_onboarding_assets (
    id,
    workspace_id,
    partner_record_id,
    category,
    object_path,
    original_filename,
    safe_filename,
    media_type,
    file_extension,
    byte_size,
    width_pixels,
    height_pixels,
    sha256_hex,
    lifecycle_status,
    review_status,
    uploaded_by
  ) values (
    p_asset_id,
    p_workspace_id,
    v_partner_record_id,
    p_category,
    p_object_path,
    p_original_filename,
    p_safe_filename,
    p_media_type,
    p_file_extension,
    p_byte_size,
    p_width_pixels,
    p_height_pixels,
    p_sha256_hex,
    'pending_review',
    'pending',
    p_actor_user_id
  );

  if v_existing_asset.id is not null then
    update public.partner_onboarding_assets
    set replaced_by_asset_id = p_asset_id
    where id = v_existing_asset.id;
  end if;

  update public.partner_onboarding
  set
    aggregate_version = aggregate_version + 1,
    completion_percentage = p_workspace_completion,
    blocker_code = p_blocker_code,
    next_action_code = p_next_action_code,
    next_action_owner = p_next_action_owner,
    last_meaningful_activity_at = now()
  where id = p_workspace_id
  returning aggregate_version into workspace_aggregate_version;

  insert into public.partner_onboarding_activity (
    workspace_id,
    event_type,
    section_key,
    status_code,
    summary_code,
    owner_type,
    actor_user_id,
    request_id,
    dedupe_key
  ) values (
    p_workspace_id,
    case
      when v_existing_asset.id is null then 'required_asset_uploaded'
      else 'required_asset_replaced'
    end,
    'brand_public_page',
    'pending_review',
    case
      when v_existing_asset.id is null then 'required_asset_uploaded'
      else 'required_asset_replaced'
    end,
    'partner',
    p_actor_user_id,
    p_request_id,
    p_request_id::text || ':asset-record'
  )
  on conflict do nothing;

  insert into public.partner_onboarding_integration_events (
    workspace_id,
    partner_record_id,
    event_type,
    workspace_aggregate_version,
    workspace_status,
    completion_percentage,
    blocker_code,
    next_action_code,
    next_action_owner,
    target_launch_date,
    section_key,
    artifact_category,
    artifact_status,
    idempotency_key
  )
  select
    po.id,
    v_partner_record_id,
    'rcap_brand_configuration_changed',
    po.aggregate_version,
    po.status,
    po.completion_percentage,
    po.blocker_code,
    po.next_action_code,
    po.next_action_owner,
    po.target_launch_date,
    'brand_public_page',
    p_category,
    'pending_review',
    p_request_id::text || ':asset-record'
  from public.partner_onboarding po
  where po.id = p_workspace_id
  on conflict do nothing;

  update public.partner_onboarding_idempotency
  set
    result_status = 'succeeded',
    result_workspace_version = workspace_aggregate_version,
    completed_at = now()
  where request_id = p_request_id;

  asset_id := p_asset_id;
  superseded_object_path := v_existing_asset.object_path;
  duplicate := false;
  return next;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_service_record_onboarding_launch_approval(p_partner_slug text, p_actor_user_id uuid, p_reviewer_type text, p_workspace_id uuid, p_approval_type text, p_decision text, p_comments text, p_request_id uuid)
 RETURNS TABLE(approval_id uuid, duplicate boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_partner_record_id uuid;
  v_existing uuid;
  v_row public.partner_onboarding_launch_approvals%rowtype;
  v_check_key text;
  v_owner text;
begin
  if p_decision not in ('approve', 'withdraw') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;

  if p_approval_type = 'partner_launch_approval' then
    v_check_key := 'partner_launch_approval_received';
    v_owner := 'partner';
  elsif p_approval_type = 'legalease_final_review' then
    v_check_key := 'legalease_final_review_complete';
    v_owner := 'legalease';
  else
    raise exception 'invalid_approval_type' using errcode = '22023';
  end if;

  if p_reviewer_type <> v_owner then
    raise exception 'reviewer_does_not_own_approval' using errcode = '42501';
  end if;

  select po.partner_record_id into v_partner_record_id
  from public.partner_onboarding po
  where po.id = p_workspace_id
    and po.partner_slug = p_partner_slug;

  if v_partner_record_id is null then
    raise exception 'workspace_not_found' using errcode = 'P0002';
  end if;

  select a.id into v_existing
  from public.partner_onboarding_launch_approvals a
  where a.workspace_id = p_workspace_id
    and a.request_id = p_request_id;

  if v_existing is not null then
    approval_id := v_existing;
    duplicate := true;
    return next;
    return;
  end if;

  insert into public.partner_onboarding_launch_approvals (
    workspace_id, approval_type, reviewer_type, reviewer_user_id,
    decision, comments, request_id
  )
  values (
    p_workspace_id, p_approval_type, p_reviewer_type, p_actor_user_id,
    p_decision, p_comments, p_request_id
  )
  returning * into v_row;

  insert into public.partner_onboarding_launch_checks (
    workspace_id, partner_record_id, check_key, category, owner_type,
    determination, blocking, status, evidence_summary, evidence_reference,
    checked_at, checked_by, request_id
  )
  values (
    p_workspace_id, v_partner_record_id, v_check_key, 'approvals', v_owner,
    'manual', true,
    case when p_decision = 'approve' then 'passing' else 'failing' end,
    case when p_decision = 'approve'
      then 'Launch approval recorded.'
      else 'Launch approval withdrawn.'
    end,
    'launch_approval',
    case when p_decision = 'approve' then now() else null end,
    case when p_decision = 'approve' then p_actor_user_id else null end,
    p_request_id
  )
  on conflict (workspace_id, check_key) do update
  set status = excluded.status,
      evidence_summary = excluded.evidence_summary,
      checked_at = excluded.checked_at,
      checked_by = excluded.checked_by,
      invalidated_at = null,
      invalidated_reason = null,
      request_id = excluded.request_id;

  insert into public.partner_onboarding_activity (
    workspace_id, event_type, owner_type, summary_code, status_code
  )
  values (
    p_workspace_id, 'launch_approval_recorded',
    case when p_reviewer_type = 'partner' then 'partner' else 'legalease' end,
    p_approval_type, p_decision
  );

  approval_id := v_row.id;
  duplicate := false;
  return next;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_service_record_onboarding_launch_check(p_partner_slug text, p_actor_user_id uuid, p_reviewer_type text, p_workspace_id uuid, p_check_key text, p_category text, p_owner_type text, p_blocking boolean, p_status text, p_evidence_summary text, p_request_id uuid)
 RETURNS TABLE(check_id uuid, check_status text, duplicate boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_partner_record_id uuid;
  v_existing public.partner_onboarding_launch_checks%rowtype;
  v_row public.partner_onboarding_launch_checks%rowtype;
begin
  if p_reviewer_type not in ('legalease', 'partner') then
    raise exception 'invalid_reviewer_type' using errcode = '22023';
  end if;
  if p_status not in ('passing', 'needs_review', 'waived', 'not_applicable') then
    raise exception 'invalid_launch_check_status' using errcode = '22023';
  end if;
  -- Only LegalEase may waive a check or mark one not applicable.
  if p_reviewer_type = 'partner'
     and p_status in ('waived', 'not_applicable') then
    raise exception 'waiver_requires_legalease' using errcode = '42501';
  end if;
  -- A reviewer may only decide a check its own side owns.
  if p_reviewer_type <> p_owner_type then
    raise exception 'reviewer_does_not_own_check' using errcode = '42501';
  end if;

  select po.partner_record_id into v_partner_record_id
  from public.partner_onboarding po
  where po.id = p_workspace_id
    and po.partner_slug = p_partner_slug;

  if v_partner_record_id is null then
    raise exception 'workspace_not_found' using errcode = 'P0002';
  end if;

  select c.* into v_existing
  from public.partner_onboarding_launch_checks c
  where c.workspace_id = p_workspace_id
    and c.request_id = p_request_id;

  if v_existing.id is not null then
    check_id := v_existing.id;
    check_status := v_existing.status;
    duplicate := true;
    return next;
    return;
  end if;

  insert into public.partner_onboarding_launch_checks (
    workspace_id, partner_record_id, check_key, category, owner_type,
    determination, blocking, status, evidence_summary, evidence_reference,
    checked_at, checked_by, request_id
  )
  values (
    p_workspace_id, v_partner_record_id, p_check_key, p_category, p_owner_type,
    'manual', p_blocking, p_status, p_evidence_summary, 'manual_review',
    now(), p_actor_user_id, p_request_id
  )
  on conflict (workspace_id, check_key) do update
  set status = excluded.status,
      evidence_summary = excluded.evidence_summary,
      checked_at = excluded.checked_at,
      checked_by = excluded.checked_by,
      blocking = excluded.blocking,
      category = excluded.category,
      -- Recording a fresh decision clears the previous invalidation.
      invalidated_at = null,
      invalidated_reason = null,
      request_id = excluded.request_id
  returning * into v_row;

  insert into public.partner_onboarding_activity (
    workspace_id, event_type, owner_type, summary_code, status_code
  )
  values (
    p_workspace_id,
    'launch_check_recorded',
    case when p_reviewer_type = 'partner' then 'partner' else 'legalease' end,
    p_check_key,
    p_status
  );

  check_id := v_row.id;
  check_status := v_row.status;
  duplicate := false;
  return next;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_service_record_onboarding_launch_readiness(p_partner_slug text, p_workspace_id uuid, p_state text)
 RETURNS TABLE(changed boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_updated public.partner_onboarding%rowtype;
begin
  if p_state not in ('ready', 'not_ready') then
    raise exception 'invalid_readiness_state' using errcode = '22023';
  end if;

  update public.partner_onboarding po
  set launch_readiness_state = p_state
  where po.id = p_workspace_id
    and po.partner_slug = p_partner_slug
    and po.launch_readiness_state is distinct from p_state
  returning * into v_updated;

  if v_updated.id is null then
    changed := false;
    return next;
    return;
  end if;

  insert into public.partner_onboarding_activity (
    workspace_id, event_type, owner_type, summary_code, status_code
  )
  values (
    p_workspace_id,
    case when p_state = 'ready'
      then 'launch_readiness_achieved'
      else 'launch_readiness_lost'
    end,
    'system',
    'launch_readiness',
    p_state
  );

  changed := true;
  return next;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_service_review_onboarding(p_partner_slug text, p_actor_user_id uuid, p_workspace_id uuid, p_expected_workspace_version bigint, p_request_id uuid, p_payload_hash text, p_operation jsonb)
 RETURNS TABLE(workspace_aggregate_version bigint, workspace_status text, duplicate boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_workspace public.partner_onboarding%rowtype;
  v_existing public.partner_onboarding_idempotency%rowtype;
  v_section public.partner_onboarding_sections%rowtype;
  v_action text;
  v_section_key text;
  v_reason text;
  v_partner_record_id uuid;
  v_partner_payment_status text;
  v_activity_type text;
  v_activity_summary text;
  v_event_type text := 'rcap_onboarding_progressed';
  v_derived_completion integer;
  v_derived_blocker text;
  v_derived_next_action text;
  v_derived_next_owner text;
begin
  perform public.rcap_service_assert_internal_actor(p_actor_user_id);
  if p_operation is null
     or jsonb_typeof(p_operation) <> 'object'
     or p_payload_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid review operation';
  end if;
  v_action := p_operation->>'action';
  if v_action not in (
    'target_launch_date',
    'commercial_gate',
    'agreement',
    'request_changes',
    'approve_section',
    'waive_section',
    'ready_for_launch',
    'close'
  ) then
    raise exception using errcode = '22023', message = 'Unknown review operation';
  end if;

  select *
    into v_existing
  from public.partner_onboarding_idempotency i
  where i.request_id = p_request_id
  for update;
  if found then
    if v_existing.workspace_id <> p_workspace_id
       or v_existing.operation_key <> 'review:' || v_action
       or v_existing.actor_user_id <> p_actor_user_id
       or v_existing.payload_hash <> p_payload_hash then
      raise exception using errcode = '23505', message = 'Idempotency request mismatch';
    end if;
    if v_existing.result_status = 'succeeded' then
      return query
      select
        v_existing.result_workspace_version,
        po.status,
        true
      from public.partner_onboarding po
      where po.id = p_workspace_id;
      return;
    end if;
    raise exception using errcode = '55000', message = 'Idempotent request is still in progress';
  end if;

  select *
    into v_workspace
  from public.partner_onboarding po
  where po.id = p_workspace_id
    and po.partner_slug = p_partner_slug
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Onboarding workspace not found';
  end if;
  if v_workspace.aggregate_version <> p_expected_workspace_version then
    raise exception using errcode = '40001', message = 'Onboarding workspace revision conflict';
  end if;
  select
    coalesce(v_workspace.partner_record_id, pr.id),
    pr.payment_status
    into v_partner_record_id, v_partner_payment_status
  from public.partner_records pr
  where pr.partner_slug = p_partner_slug;

  insert into public.partner_onboarding_idempotency (
    workspace_id,
    operation_key,
    request_id,
    actor_user_id,
    payload_hash,
    expires_at
  ) values (
    p_workspace_id,
    'review:' || v_action,
    p_request_id,
    p_actor_user_id,
    p_payload_hash,
    now() + interval '24 hours'
  );

  if v_action = 'target_launch_date' then
    v_reason := nullif(btrim(p_operation->>'reason'), '');
    if v_reason is null or char_length(v_reason) > 5000 then
      raise exception using errcode = '22023', message = 'Target-date reason is required';
    end if;
    update public.partner_onboarding
    set
      target_launch_date = nullif(p_operation->>'targetLaunchDate', '')::date,
      target_launch_date_reason = v_reason,
      target_launch_date_changed_at = now(),
      target_launch_date_changed_by = p_actor_user_id
    where id = p_workspace_id;
  elsif v_action = 'commercial_gate' then
    if p_operation->>'outcome' not in (
      'blocked',
      'cleared_by_paid_invoice',
      'cleared_by_approved_purchase_order',
      'cleared_by_authorized_internal_override'
    ) then
      raise exception using errcode = '22023', message = 'Invalid commercial gate outcome';
    end if;
    if (
      p_operation->>'outcome' = 'cleared_by_approved_purchase_order'
      and nullif(btrim(p_operation->>'evidenceReference'), '') is null
    ) then
      raise exception using errcode = '22023', message = 'Commercial evidence reference is required';
    end if;
    if p_operation->>'outcome' = 'cleared_by_paid_invoice'
       and v_partner_payment_status <> 'paid' then
      raise exception using
        errcode = '23514',
        message = 'Paid-invoice outcome requires authoritative paid partner status';
    end if;
    if p_operation->>'outcome' = 'cleared_by_authorized_internal_override'
       and nullif(btrim(p_operation->>'overrideReason'), '') is null then
      raise exception using errcode = '22023', message = 'Commercial override reason is required';
    end if;
    if coalesce(char_length(p_operation->>'evidenceReference'), 0) > 500
       or coalesce(char_length(p_operation->>'overrideReason'), 0) > 5000 then
      raise exception using errcode = '22023', message = 'Commercial evidence is too long';
    end if;
    if jsonb_typeof(p_operation->'systemDerived') <> 'object' then
      raise exception using
        errcode = '22023',
        message = 'Server-derived commercial summary is required';
    end if;
    v_derived_completion :=
      (p_operation->'systemDerived'->>'completionPercentage')::integer;
    v_derived_blocker :=
      nullif(p_operation->'systemDerived'->>'blockerCode', '');
    v_derived_next_action :=
      nullif(p_operation->'systemDerived'->>'nextActionCode', '');
    v_derived_next_owner :=
      nullif(p_operation->'systemDerived'->>'nextActionOwner', '');
    if v_derived_completion not between 0 and 100
       or v_derived_next_action is null
       or v_derived_next_owner not in ('partner', 'legalease', 'none')
       or (
         v_derived_blocker is not null
         and v_derived_blocker !~ '^[a-z0-9_]{1,120}$'
       )
       or v_derived_next_action !~ '^[a-z0-9_]{1,120}$' then
      raise exception using
        errcode = '22023',
        message = 'Server-derived commercial summary is invalid';
    end if;
    update public.partner_onboarding
    set
      commercial_gate_status = p_operation->>'outcome',
      commercial_gate_evidence_reference = case
        when p_operation->>'outcome' = 'cleared_by_paid_invoice'
          then 'partner_record:' || v_partner_record_id::text
        else nullif(btrim(p_operation->>'evidenceReference'), '')
      end,
      commercial_gate_override_reason = case
        when p_operation->>'outcome' = 'cleared_by_authorized_internal_override'
          then nullif(btrim(p_operation->>'overrideReason'), '')
        else null
      end,
      commercial_gate_changed_at = now(),
      commercial_gate_changed_by = p_actor_user_id,
      status = case
        when p_operation->>'outcome' = 'blocked'
          and status in ('draft', 'setup_in_progress') then 'commercially_blocked'
        when p_operation->>'outcome' <> 'blocked'
          and status in ('draft', 'commercially_blocked') then 'setup_in_progress'
        else status
      end,
      completion_percentage = v_derived_completion,
      blocker_code = v_derived_blocker,
      next_action_code = v_derived_next_action,
      next_action_owner = v_derived_next_owner
    where id = p_workspace_id;
    v_activity_type := 'commercial_gate_changed';
    v_activity_summary := 'commercial_gate_changed';
    v_event_type := 'rcap_commercial_gate_changed';
  elsif v_action = 'agreement' then
    if p_operation->>'agreementType' not in (
      'order_form',
      'master_services_agreement',
      'data_privacy_security_addendum',
      'procurement_requirements'
    )
       or p_operation->>'status' not in (
         'not_required',
         'not_started',
         'requested',
         'under_review',
         'finalized',
         'executed',
         'approved',
         'waived'
       ) then
      raise exception using errcode = '22023', message = 'Invalid agreement metadata';
    end if;
    if jsonb_typeof(p_operation->'systemDerived') <> 'object' then
      raise exception using
        errcode = '22023',
        message = 'Server-derived agreement summary is required';
    end if;
    v_derived_completion :=
      (p_operation->'systemDerived'->>'completionPercentage')::integer;
    v_derived_blocker :=
      nullif(p_operation->'systemDerived'->>'blockerCode', '');
    v_derived_next_action :=
      nullif(p_operation->'systemDerived'->>'nextActionCode', '');
    v_derived_next_owner :=
      nullif(p_operation->'systemDerived'->>'nextActionOwner', '');
    if v_derived_completion not between 0 and 100
       or v_derived_next_action is null
       or v_derived_next_owner not in ('partner', 'legalease', 'none')
       or (
         v_derived_blocker is not null
         and v_derived_blocker !~ '^[a-z0-9_]{1,120}$'
       )
       or v_derived_next_action !~ '^[a-z0-9_]{1,120}$' then
      raise exception using
        errcode = '22023',
        message = 'Server-derived agreement summary is invalid';
    end if;
    if nullif(p_operation->>'finalizedAssetId', '') is not null
       and p_operation->>'status' not in ('finalized', 'executed', 'approved') then
      raise exception using
        errcode = '22023',
        message = 'A finalized agreement document requires a finalized partner-safe status';
    end if;
    if nullif(p_operation->>'finalizedAssetId', '') is not null then
      update public.partner_onboarding_assets
      set
        lifecycle_status = 'active',
        review_status = 'approved',
        review_reason = 'authorized_as_finalized_agreement_document',
        updated_at = now()
      where id = (p_operation->>'finalizedAssetId')::uuid
        and workspace_id = p_workspace_id
        and deleted_at is null
        and lifecycle_status in ('pending_review', 'active')
        and media_type in (
          'application/pdf',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );
      if not found then
        raise exception using
          errcode = '23514',
          message = 'Finalized agreement document is not an eligible private workspace asset';
      end if;
    end if;
    insert into public.partner_onboarding_agreements (
      workspace_id,
      agreement_type,
      status,
      is_required,
      partner_safe_detail,
      finalized_asset_id,
      effective_date,
      recorded_by,
      recorded_at
    ) values (
      p_workspace_id,
      p_operation->>'agreementType',
      p_operation->>'status',
      coalesce((p_operation->>'required')::boolean, false),
      nullif(btrim(p_operation->>'partnerSafeDetail'), ''),
      nullif(p_operation->>'finalizedAssetId', '')::uuid,
      nullif(p_operation->>'effectiveDate', '')::date,
      p_actor_user_id,
      now()
    )
    on conflict (workspace_id, agreement_type) do update
    set
      status = excluded.status,
      is_required = excluded.is_required,
      partner_safe_detail = excluded.partner_safe_detail,
      finalized_asset_id = excluded.finalized_asset_id,
      effective_date = excluded.effective_date,
      recorded_by = excluded.recorded_by,
      recorded_at = excluded.recorded_at;
    update public.partner_onboarding
    set
      completion_percentage = v_derived_completion,
      blocker_code = v_derived_blocker,
      next_action_code = v_derived_next_action,
      next_action_owner = v_derived_next_owner
    where id = p_workspace_id;
  elsif v_action in ('request_changes', 'approve_section', 'waive_section') then
    v_section_key := p_operation->>'sectionKey';
    if v_section_key not in (
      'organization_contacts',
      'program_goals',
      'geography_audience_language_accessibility',
      'access_sponsorship_capacity',
      'brand_public_page',
      'staff_dashboard_plan',
      'support_referrals_reporting',
      'review_authorization'
    ) then
      raise exception using errcode = '22023', message = 'Invalid section review key';
    end if;
    select *
      into v_section
    from public.partner_onboarding_sections s
    where s.workspace_id = p_workspace_id
      and s.section_key = v_section_key
    for update;
    if not found then
      raise exception using errcode = 'P0002', message = 'Onboarding section not found';
    end if;

    if v_action = 'request_changes' then
      v_reason := nullif(btrim(p_operation->>'instructions'), '');
      if v_workspace.status <> 'ready_for_review'
         or v_reason is null
         or char_length(v_reason) > 5000 then
        raise exception using errcode = '55000', message = 'Partner-safe change request is invalid';
      end if;
      update public.partner_onboarding_sections
      set
        revision = revision + 1,
        status = 'needs_changes',
        reviewed_at = now(),
        reviewed_by = p_actor_user_id,
        review_reason = v_reason
      where id = v_section.id;
      update public.partner_onboarding_change_requests
      set
        status = 'resolved',
        resolved_by = p_actor_user_id,
        resolved_at = now(),
        resolution_reason = 'Additional changes requested by LegalEase.',
        updated_at = now()
      where section_id = v_section.id
        and status = 'partner_responded';
      insert into public.partner_onboarding_change_requests (
        workspace_id,
        section_id,
        status,
        partner_safe_instructions,
        requested_by
      ) values (
        p_workspace_id,
        v_section.id,
        'open',
        v_reason,
        p_actor_user_id
      );
      update public.partner_onboarding
      set
        status = 'waiting_on_partner',
        blocker_code = 'partner_changes_requested',
        next_action_code = 'address_change_request',
        next_action_owner = 'partner'
      where id = p_workspace_id;
      v_activity_type := 'section_change_requested';
      v_activity_summary := 'section_change_requested';
    else
      v_reason := nullif(btrim(p_operation->>'reason'), '');
      if v_reason is null or char_length(v_reason) > 5000 then
        raise exception using errcode = '22023', message = 'Section review reason is required';
      end if;
      if v_action = 'approve_section' and v_section.status not in ('submitted', 'needs_changes') then
        raise exception using errcode = '55000', message = 'Section is not ready for approval';
      end if;
      update public.partner_onboarding_sections
      set
        revision = revision + 1,
        status = case
          when v_action = 'approve_section' then 'approved'
          else 'waived'
        end,
        approved_at = case
          when v_action = 'approve_section' then now()
          else approved_at
        end,
        approved_by = case
          when v_action = 'approve_section' then p_actor_user_id
          else approved_by
        end,
        waived_at = case
          when v_action = 'waive_section' then now()
          else waived_at
        end,
        waived_by = case
          when v_action = 'waive_section' then p_actor_user_id
          else waived_by
        end,
        waiver_reason = case
          when v_action = 'waive_section' then v_reason
          else waiver_reason
        end,
        reviewed_at = now(),
        reviewed_by = p_actor_user_id,
        review_reason = v_reason
      where id = v_section.id;
      update public.partner_onboarding_change_requests
      set
        status = 'resolved',
        resolved_by = p_actor_user_id,
        resolved_at = now(),
        resolution_reason = v_reason,
        updated_at = now()
      where section_id = v_section.id
        and status in ('open', 'partner_responded');
      update public.partner_onboarding
      set
        status = case
          when exists (
            select 1
            from public.partner_onboarding_change_requests cr
            where cr.workspace_id = p_workspace_id
              and cr.status = 'open'
          ) then 'waiting_on_partner'
          else 'ready_for_review'
        end,
        blocker_code = case
          when exists (
            select 1
            from public.partner_onboarding_change_requests cr
            where cr.workspace_id = p_workspace_id
              and cr.status = 'open'
          ) then 'partner_changes_requested'
          else null
        end,
        next_action_code = case
          when exists (
            select 1
            from public.partner_onboarding_change_requests cr
            where cr.workspace_id = p_workspace_id
              and cr.status = 'open'
          ) then 'address_change_request'
          else 'await_legalease_review'
        end,
        next_action_owner = case
          when exists (
            select 1
            from public.partner_onboarding_change_requests cr
            where cr.workspace_id = p_workspace_id
              and cr.status = 'open'
          ) then 'partner'
          else 'legalease'
        end
      where id = p_workspace_id;
      v_activity_type := case
        when v_action = 'approve_section' then 'section_approved'
        else 'section_waived'
      end;
      v_activity_summary := v_activity_type;
    end if;
    v_event_type := 'rcap_section_review_changed';
  elsif v_action = 'ready_for_launch' then
    v_reason := nullif(btrim(p_operation->>'reason'), '');
    if v_reason is null
       or char_length(v_reason) > 5000
       or v_workspace.status <> 'ready_for_review'
       or v_workspace.commercial_gate_status = 'blocked'
       or exists (
         select 1
         from public.partner_onboarding_change_requests cr
         where cr.workspace_id = p_workspace_id
           and cr.status in ('open', 'partner_responded')
       )
       or (
         select count(*)
         from public.partner_onboarding_sections s
         where s.workspace_id = p_workspace_id
           and s.status in ('approved', 'waived', 'not_applicable')
       ) <> 8 then
      raise exception using errcode = '55000', message = 'Workspace is not approved for launch preparation';
    end if;
    update public.partner_onboarding
    set
      status = 'ready_to_launch',
      blocker_code = null,
      next_action_code = 'prepare_for_launch',
      next_action_owner = 'legalease',
      internal_approved_at = now(),
      internal_approved_by = p_actor_user_id,
      internal_approval_reason = v_reason
    where id = p_workspace_id;
    v_activity_type := 'ready_for_launch_decided';
    v_activity_summary := 'ready_for_launch_decided';
    v_event_type := 'rcap_section_review_changed';
  elsif v_action = 'close' then
    v_reason := nullif(btrim(p_operation->>'reason'), '');
    if v_reason is null
       or char_length(v_reason) > 5000
       or v_workspace.status not in (
         'draft',
         'commercially_blocked',
         'setup_in_progress',
         'waiting_on_partner',
         'ready_for_review',
         'ready_to_launch'
       ) then
      raise exception using errcode = '55000', message = 'Workspace cannot be closed';
    end if;
    update public.partner_onboarding
    set
      status = 'closed',
      blocker_code = null,
      next_action_code = 'onboarding_closed',
      next_action_owner = 'none',
      closed_at = now(),
      closed_by = p_actor_user_id,
      closed_reason = v_reason
    where id = p_workspace_id;
  end if;

  update public.partner_onboarding
  set
    aggregate_version = aggregate_version + 1,
    last_meaningful_activity_at = case
      when v_activity_type is not null then now()
      else last_meaningful_activity_at
    end
  where id = p_workspace_id
  returning aggregate_version, status
    into workspace_aggregate_version, workspace_status;

  if v_activity_type is not null then
    insert into public.partner_onboarding_activity (
      workspace_id,
      event_type,
      section_key,
      status_code,
      summary_code,
      owner_type,
      actor_user_id,
      request_id,
      dedupe_key
    ) values (
      p_workspace_id,
      v_activity_type,
      v_section_key,
      workspace_status,
      v_activity_summary,
      'legalease',
      p_actor_user_id,
      p_request_id,
      p_request_id::text || ':' || v_activity_type
    )
    on conflict do nothing;
  end if;

  insert into public.partner_onboarding_integration_events (
    workspace_id,
    partner_record_id,
    event_type,
    workspace_aggregate_version,
    workspace_status,
    completion_percentage,
    blocker_code,
    next_action_code,
    next_action_owner,
    target_launch_date,
    section_key,
    section_status,
    idempotency_key
  )
  select
    po.id,
    v_partner_record_id,
    v_event_type,
    po.aggregate_version,
    po.status,
    po.completion_percentage,
    po.blocker_code,
    po.next_action_code,
    po.next_action_owner,
    po.target_launch_date,
    v_section_key,
    case when v_section_key is null then null else (
      select s.status
      from public.partner_onboarding_sections s
      where s.workspace_id = po.id
        and s.section_key = v_section_key
    ) end,
    p_request_id::text || ':review'
  from public.partner_onboarding po
  where po.id = p_workspace_id
  on conflict do nothing;

  update public.partner_onboarding_idempotency
  set
    result_status = 'succeeded',
    result_workspace_version = workspace_aggregate_version,
    completed_at = now()
  where request_id = p_request_id;

  duplicate := false;
  return next;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_service_review_onboarding_artifact(p_partner_slug text, p_actor_user_id uuid, p_reviewer_type text, p_artifact_version_id uuid, p_decision text, p_comments text, p_partner_visible_instructions text, p_request_id uuid)
 RETURNS TABLE(approval_status text, partner_review_status text, duplicate boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_version public.partner_onboarding_artifact_versions%rowtype;
  v_artifact public.partner_onboarding_artifacts%rowtype;
  v_existing uuid;
begin
  if p_reviewer_type not in ('legalease', 'partner') then
    raise exception 'invalid_reviewer_type' using errcode = '22023';
  end if;
  if p_decision not in ('approve', 'request_changes', 'reject') then
    raise exception 'invalid_decision' using errcode = '22023';
  end if;

  select v.* into v_version
  from public.partner_onboarding_artifact_versions v
  join public.partner_onboarding po on po.id = v.workspace_id
  where v.id = p_artifact_version_id
    and po.partner_slug = p_partner_slug
  for update of v;

  if v_version.id is null then
    raise exception 'artifact_version_not_found' using errcode = 'P0002';
  end if;

  select a.* into v_artifact
  from public.partner_onboarding_artifacts a
  where a.id = v_version.artifact_id;

  select r.id into v_existing
  from public.partner_onboarding_artifact_reviews r
  where r.artifact_version_id = p_artifact_version_id
    and r.request_id = p_request_id;

  if v_existing is not null then
    approval_status := v_version.approval_status;
    partner_review_status := v_version.partner_review_status;
    duplicate := true;
    return next;
    return;
  end if;

  -- A failed generation is not reviewable.
  if v_version.generation_status <> 'succeeded' then
    raise exception 'artifact_generation_failed' using errcode = '0A000';
  end if;

  -- A stale version cannot be approved. It stays readable and can still be
  -- rejected or have changes requested, but approval requires regeneration.
  if p_decision = 'approve' and v_version.source_drift_invalidated_at is not null then
    raise exception 'artifact_version_stale' using errcode = '55000';
  end if;

  if v_version.approval_status = 'superseded' and p_decision = 'approve' then
    raise exception 'artifact_version_superseded' using errcode = '55000';
  end if;

  insert into public.partner_onboarding_artifact_reviews (
    artifact_version_id, workspace_id, reviewer_type, reviewer_user_id,
    decision, comments, request_id
  )
  values (
    p_artifact_version_id, v_version.workspace_id, p_reviewer_type,
    p_actor_user_id, p_decision, p_comments, p_request_id
  );

  if p_reviewer_type = 'legalease' then
    -- LegalEase controls the document's own approval state and retains control
    -- of legal and platform language. The partner review state is untouched
    -- except that requesting changes routes the version back to the partner.
    -- The alias is required: this function's OUT parameters share names with
    -- these columns, so unqualified references would be ambiguous.
    update public.partner_onboarding_artifact_versions v
    set approval_status = case p_decision
          when 'approve' then 'approved'
          when 'request_changes' then 'changes_requested'
          else 'changes_requested'
        end,
        partner_visible_instructions = coalesce(
          p_partner_visible_instructions, v.partner_visible_instructions
        ),
        partner_review_status = case
          when p_decision = 'approve' and v.partner_review_status = 'not_requested'
            then 'awaiting_partner'
          else v.partner_review_status
        end
    where v.id = p_artifact_version_id
    returning v.* into v_version;
  else
    -- The partner approves only partner-owned factual and branding content. It
    -- cannot move approval_status, publish, or activate anything.
    update public.partner_onboarding_artifact_versions v
    set partner_review_status = case p_decision
          when 'approve' then 'approved'
          else 'changes_requested'
        end
    where v.id = p_artifact_version_id
    returning v.* into v_version;
  end if;

  update public.partner_onboarding_artifacts
  set lifecycle_status = case
        when v_version.approval_status = 'approved' then 'approved'
        when v_version.approval_status = 'changes_requested' then 'in_review'
        else lifecycle_status
      end
  where id = v_artifact.id;

  insert into public.partner_onboarding_activity (
    workspace_id, event_type, owner_type, summary_code, status_code,
    artifact_version_id
  )
  values (
    v_version.workspace_id,
    case
      when p_reviewer_type = 'partner' then 'artifact_partner_reviewed'
      when p_decision = 'approve' then 'artifact_approved'
      else 'artifact_changes_requested'
    end,
    case when p_reviewer_type = 'partner' then 'partner' else 'legalease' end,
    v_artifact.artifact_type,
    p_decision,
    p_artifact_version_id
  )
  on conflict do nothing;

  approval_status := v_version.approval_status;
  partner_review_status := v_version.partner_review_status;
  duplicate := false;
  return next;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_service_review_onboarding_prefill(p_partner_slug text, p_actor_user_id uuid, p_workspace_id uuid, p_value_id uuid, p_expected_batch_version bigint, p_action text, p_request_id uuid, p_payload_hash text)
 RETURNS TABLE(batch_aggregate_version bigint, review_status text, duplicate boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_workspace public.partner_onboarding%rowtype;
  v_batch public.partner_onboarding_prefill_batches%rowtype;
  v_value public.partner_onboarding_prefill_values%rowtype;
  v_existing public.partner_onboarding_idempotency%rowtype;
  v_status text;
  v_event_type text;
begin
  perform public.rcap_service_assert_internal_actor(p_actor_user_id);
  if p_action not in ('approve', 'reject', 'supersede')
     or p_expected_batch_version < 1
     or p_payload_hash !~ '^[0-9a-f]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid prefill review';
  end if;

  select *
    into v_existing
  from public.partner_onboarding_idempotency i
  where i.request_id = p_request_id
  for update;
  if found then
    if v_existing.workspace_id <> p_workspace_id
       or v_existing.operation_key <> 'prefill_review:' || p_value_id::text
       or v_existing.actor_user_id <> p_actor_user_id
       or v_existing.payload_hash <> p_payload_hash then
      raise exception using
        errcode = '23505',
        message = 'Idempotency request does not match original mutation';
    end if;
    if v_existing.result_status = 'succeeded' then
      select pv.review_status, b.aggregate_version
        into v_status, batch_aggregate_version
      from public.partner_onboarding_prefill_values pv
      join public.partner_onboarding_prefill_batches b on b.id = pv.batch_id
      where pv.id = p_value_id;
      review_status := v_status;
      duplicate := true;
      return next;
      return;
    end if;
  end if;

  select po.*
    into v_workspace
  from public.partner_onboarding po
  where po.id = p_workspace_id
    and po.partner_slug = p_partner_slug;
  if not found then
    raise exception using errcode = 'P0002', message = 'Onboarding workspace not found';
  end if;

  select pv.*
    into v_value
  from public.partner_onboarding_prefill_values pv
  where pv.id = p_value_id
    and pv.workspace_id = p_workspace_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Prefill suggestion not found';
  end if;

  select *
    into v_batch
  from public.partner_onboarding_prefill_batches b
  where b.id = v_value.batch_id
    and b.workspace_id = p_workspace_id
  for update;
  if v_batch.aggregate_version <> p_expected_batch_version then
    raise exception using errcode = '40001', message = 'Prefill batch revision conflict';
  end if;
  if v_value.review_status not in ('proposed', 'approved', 'conflict') then
    raise exception using errcode = '55000', message = 'Suggestion is no longer reviewable';
  end if;

  insert into public.partner_onboarding_idempotency (
    workspace_id,
    operation_key,
    request_id,
    actor_user_id,
    payload_hash,
    expires_at
  ) values (
    p_workspace_id,
    'prefill_review:' || p_value_id::text,
    p_request_id,
    p_actor_user_id,
    p_payload_hash,
    now() + interval '24 hours'
  );

  v_status := case p_action
    when 'approve' then 'approved'
    when 'reject' then 'rejected'
    else 'superseded'
  end;
  v_event_type := case p_action
    when 'approve' then 'prefill_suggestion_approved'
    when 'reject' then 'prefill_suggestion_rejected'
    else 'prefill_suggestion_superseded'
  end;

  update public.partner_onboarding_prefill_values
  set
    review_status = v_status,
    reviewed_by = p_actor_user_id,
    reviewed_at = now(),
    superseded_at = case when v_status = 'superseded' then now() end
  where id = p_value_id;

  update public.partner_onboarding_prefill_batches
  set
    aggregate_version = aggregate_version + 1,
    status = case
      when v_status = 'approved' then 'approved'
      when not exists (
        select 1
        from public.partner_onboarding_prefill_values pv
        where pv.batch_id = v_batch.id
          and pv.id <> p_value_id
          and pv.review_status in ('proposed', 'approved', 'applied', 'conflict')
      ) then case
        when v_status = 'superseded' then 'superseded'
        else 'rejected'
      end
      else status
    end,
    approved_by = case when v_status = 'approved' then p_actor_user_id else approved_by end,
    approved_at = case when v_status = 'approved' then coalesce(approved_at, now()) else approved_at end,
    superseded_at = case when v_status = 'superseded' then now() else superseded_at end
  where id = v_batch.id
  returning aggregate_version into batch_aggregate_version;

  insert into public.partner_onboarding_activity (
    workspace_id,
    event_type,
    section_key,
    status_code,
    summary_code,
    owner_type,
    actor_user_id,
    request_id,
    dedupe_key
  ) values (
    p_workspace_id,
    v_event_type,
    v_value.section_key,
    v_status,
    v_event_type,
    'legalease',
    p_actor_user_id,
    p_request_id,
    p_request_id::text || ':' || v_event_type
  );

  update public.partner_onboarding_idempotency
  set
    result_status = 'succeeded',
    result_workspace_version = v_workspace.aggregate_version,
    result_section_revision = batch_aggregate_version,
    completed_at = now()
  where request_id = p_request_id;

  review_status := v_status;
  duplicate := false;
  return next;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_service_save_onboarding_section(p_partner_slug text, p_actor_user_id uuid, p_workspace_id uuid, p_section_key text, p_expected_revision bigint, p_expected_workspace_version bigint, p_response_data jsonb, p_collections jsonb, p_mode text, p_section_completion integer, p_missing_required_keys text[], p_workspace_completion integer, p_blocker_code text, p_next_action_code text, p_next_action_owner text, p_request_id uuid, p_payload_hash text)
 RETURNS TABLE(section_revision bigint, workspace_aggregate_version bigint, section_status text, duplicate boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_workspace public.partner_onboarding%rowtype;
  v_section public.partner_onboarding_sections%rowtype;
  v_existing public.partner_onboarding_idempotency%rowtype;
  v_next_status text;
  v_next_revision bigint;
  v_first_started boolean := false;
  v_completed boolean := false;
  v_resubmitted boolean := false;
  v_partner_review_pending boolean := false;
  v_event_type text;
  v_event_summary text;
  v_partner_record_id uuid;
begin
  perform public.rcap_service_assert_partner_actor(
    p_partner_slug, p_actor_user_id, p_workspace_id
  );

  if p_section_key not in (
    'organization_contacts',
    'program_goals',
    'geography_audience_language_accessibility',
    'access_sponsorship_capacity',
    'brand_public_page',
    'staff_dashboard_plan',
    'support_referrals_reporting',
    'review_authorization'
  )
     or p_mode not in ('draft_save', 'section_complete')
     or p_expected_revision < 0
     or p_expected_workspace_version < 1
     or p_response_data is null
     or jsonb_typeof(p_response_data) <> 'object'
     or p_collections is null
     or jsonb_typeof(p_collections) <> 'object'
     or octet_length(p_response_data::text) > 65536
     or p_section_completion not between 0 and 100
     or p_workspace_completion not between 0 and 100
     or p_next_action_owner not in ('partner', 'legalease', 'none')
     or p_payload_hash !~ '^[0-9a-f]{64}$' then
    raise exception using
      errcode = '22023',
      message = 'Invalid onboarding section mutation';
  end if;

  select *
    into v_existing
  from public.partner_onboarding_idempotency i
  where i.request_id = p_request_id
  for update;

  if found then
    if v_existing.workspace_id <> p_workspace_id
       or v_existing.operation_key <> 'section:' || p_section_key
       or v_existing.actor_user_id <> p_actor_user_id
       or v_existing.payload_hash <> p_payload_hash then
      raise exception using
        errcode = '23505',
        message = 'Idempotency request does not match original mutation';
    end if;
    if v_existing.result_status = 'succeeded' then
      return query
      select
        v_existing.result_section_revision,
        v_existing.result_workspace_version,
        coalesce((
          select s.status
          from public.partner_onboarding_sections s
          where s.workspace_id = p_workspace_id
            and s.section_key = p_section_key
        ), 'in_progress'),
        true;
      return;
    end if;
    raise exception using
      errcode = '55000',
      message = 'Idempotent request is still in progress';
  end if;

  select po.*
    into v_workspace
  from public.partner_onboarding po
  where po.id = p_workspace_id
    and po.partner_slug = p_partner_slug
  for update of po;

  if not found then
    raise exception using errcode = 'P0002', message = 'Onboarding workspace not found';
  end if;
  if v_workspace.aggregate_version <> p_expected_workspace_version then
    raise exception using
      errcode = '40001',
      message = 'Onboarding workspace revision conflict';
  end if;
  select coalesce(v_workspace.partner_record_id, pr.id)
    into v_partner_record_id
  from public.partner_records pr
  where pr.partner_slug = p_partner_slug;
  if v_workspace.commercial_gate_status = 'blocked' then
    raise exception using errcode = '55000', message = 'Commercial gate is blocked';
  end if;
  if v_workspace.status not in ('setup_in_progress', 'waiting_on_partner') then
    raise exception using errcode = '55000', message = 'Onboarding workspace is not editable';
  end if;

  insert into public.partner_onboarding_idempotency (
    workspace_id,
    operation_key,
    request_id,
    actor_user_id,
    payload_hash,
    expires_at
  ) values (
    p_workspace_id,
    'section:' || p_section_key,
    p_request_id,
    p_actor_user_id,
    p_payload_hash,
    now() + interval '24 hours'
  );

  select *
    into v_section
  from public.partner_onboarding_sections s
  where s.workspace_id = p_workspace_id
    and s.section_key = p_section_key
  for update;

  if found then
    if v_section.status in ('approved', 'waived', 'not_applicable') then
      raise exception using
        errcode = '42501',
        message = 'Reviewed onboarding section is not partner-editable';
    end if;
    if v_section.revision <> p_expected_revision then
      raise exception using
        errcode = '40001',
        message = 'Onboarding section revision conflict';
    end if;
    v_next_revision := v_section.revision + 1;
    v_first_started := v_section.status = 'not_started';
    v_resubmitted :=
      p_mode = 'section_complete'
      and (
        v_section.status = 'needs_changes'
        or exists (
          select 1
          from public.partner_onboarding_change_requests cr
          where cr.section_id = v_section.id
            and cr.status = 'open'
        )
      );
    v_completed :=
      p_mode = 'section_complete'
      and v_section.status not in ('submitted', 'approved', 'waived', 'not_applicable');
    v_next_status := case
      when p_mode = 'section_complete' then 'submitted'
      when v_section.status = 'needs_changes' then 'in_progress'
      when v_section.status in ('approved', 'waived', 'not_applicable') then v_section.status
      else 'in_progress'
    end;

    update public.partner_onboarding_sections
    set
      response_data = p_response_data,
      revision = v_next_revision,
      status = v_next_status,
      completion_percentage = p_section_completion,
      missing_required_keys = coalesce(p_missing_required_keys, '{}'::text[]),
      first_started_at = coalesce(first_started_at, now()),
      completed_at = case
        when p_mode = 'section_complete' then now()
        else completed_at
      end,
      submitted_at = case
        when p_mode = 'section_complete' then now()
        else submitted_at
      end,
      approved_at = case when v_next_status = 'submitted' then null else approved_at end,
      approved_by = case when v_next_status = 'submitted' then null else approved_by end,
      reviewed_at = case when v_next_status = 'submitted' then null else reviewed_at end,
      reviewed_by = case when v_next_status = 'submitted' then null else reviewed_by end,
      review_reason = case when v_next_status = 'submitted' then null else review_reason end
    where id = v_section.id;
  else
    if p_expected_revision <> 0 then
      raise exception using
        errcode = '40001',
        message = 'Onboarding section revision conflict';
    end if;
    v_next_revision := 1;
    v_first_started := true;
    v_completed := p_mode = 'section_complete';
    v_next_status := case
      when p_mode = 'section_complete' then 'submitted'
      else 'in_progress'
    end;

    insert into public.partner_onboarding_sections (
      workspace_id,
      section_key,
      response_data,
      revision,
      status,
      completion_percentage,
      missing_required_keys,
      first_started_at,
      completed_at,
      submitted_at
    ) values (
      p_workspace_id,
      p_section_key,
      p_response_data,
      v_next_revision,
      v_next_status,
      p_section_completion,
      coalesce(p_missing_required_keys, '{}'::text[]),
      now(),
      case when p_mode = 'section_complete' then now() end,
      case when p_mode = 'section_complete' then now() end
    )
    returning * into v_section;
  end if;

  if p_section_key = 'organization_contacts' then
    if jsonb_typeof(coalesce(p_collections->'contacts', '[]'::jsonb)) <> 'array' then
      raise exception using errcode = '22023', message = 'Contacts must be an array';
    end if;
    if exists (
      select 1
      from jsonb_array_elements(coalesce(p_collections->'contacts', '[]'::jsonb)) item
      join public.partner_onboarding_contacts existing
        on existing.id = (item->>'stable_row_id')::uuid
      where existing.workspace_id <> p_workspace_id
    ) then
      raise exception using errcode = '42501', message = 'Contact identity belongs to another workspace';
    end if;

    update public.partner_onboarding_contacts c
    set deleted_at = now(), revision = c.revision + 1
    where c.workspace_id = p_workspace_id
      and c.deleted_at is null
      and not exists (
        select 1
        from jsonb_array_elements(coalesce(p_collections->'contacts', '[]'::jsonb)) item
        where item->>'stable_row_id' = c.id::text
      );

    insert into public.partner_onboarding_contacts (
      id, workspace_id, role, name, title, organization, work_email, phone
    )
    select
      (item->>'stable_row_id')::uuid,
      p_workspace_id,
      item->>'role',
      item->>'name',
      item->>'title',
      nullif(item->>'organization', ''),
      lower(item->>'work_email'),
      nullif(item->>'phone', '')
    from jsonb_array_elements(coalesce(p_collections->'contacts', '[]'::jsonb)) item
    on conflict (id) do update
    set
      role = excluded.role,
      name = excluded.name,
      title = excluded.title,
      organization = excluded.organization,
      work_email = excluded.work_email,
      phone = excluded.phone,
      revision = public.partner_onboarding_contacts.revision + 1,
      deleted_at = null
    where public.partner_onboarding_contacts.workspace_id = p_workspace_id;
  elsif p_section_key = 'staff_dashboard_plan' then
    if jsonb_typeof(coalesce(p_collections->'planned_users', '[]'::jsonb)) <> 'array' then
      raise exception using errcode = '22023', message = 'Planned users must be an array';
    end if;
    if exists (
      select 1
      from jsonb_array_elements(coalesce(p_collections->'planned_users', '[]'::jsonb)) item
      join public.partner_onboarding_planned_users existing
        on existing.id = (item->>'stable_row_id')::uuid
      where existing.workspace_id <> p_workspace_id
    ) then
      raise exception using errcode = '42501', message = 'Planned user identity belongs to another workspace';
    end if;

    update public.partner_onboarding_planned_users u
    set deleted_at = now(), revision = u.revision + 1
    where u.workspace_id = p_workspace_id
      and u.deleted_at is null
      and not exists (
        select 1
        from jsonb_array_elements(coalesce(p_collections->'planned_users', '[]'::jsonb)) item
        where item->>'stable_row_id' = u.id::text
      );

    insert into public.partner_onboarding_planned_users (
      id,
      workspace_id,
      name,
      work_email,
      requested_role,
      special_permissions,
      training_attendee
    )
    select
      (item->>'stable_row_id')::uuid,
      p_workspace_id,
      item->>'name',
      lower(item->>'work_email'),
      item->>'requested_role',
      coalesce(
        array(
          select jsonb_array_elements_text(
            coalesce(item->'special_permissions', '[]'::jsonb)
          )
        ),
        '{}'::text[]
      ),
      coalesce((item->>'training_attendee')::boolean, false)
    from jsonb_array_elements(coalesce(p_collections->'planned_users', '[]'::jsonb)) item
    on conflict (id) do update
    set
      name = excluded.name,
      work_email = excluded.work_email,
      requested_role = excluded.requested_role,
      special_permissions = excluded.special_permissions,
      training_attendee = excluded.training_attendee,
      revision = public.partner_onboarding_planned_users.revision + 1,
      deleted_at = null
    where public.partner_onboarding_planned_users.workspace_id = p_workspace_id;
  elsif p_section_key = 'support_referrals_reporting' then
    if jsonb_typeof(coalesce(p_collections->'report_recipients', '[]'::jsonb)) <> 'array' then
      raise exception using errcode = '22023', message = 'Report recipients must be an array';
    end if;
    if exists (
      select 1
      from jsonb_array_elements(coalesce(p_collections->'report_recipients', '[]'::jsonb)) item
      join public.partner_onboarding_report_recipients existing
        on existing.id = (item->>'stable_row_id')::uuid
      where existing.workspace_id <> p_workspace_id
    ) then
      raise exception using errcode = '42501', message = 'Report recipient identity belongs to another workspace';
    end if;

    update public.partner_onboarding_report_recipients r
    set deleted_at = now(), revision = r.revision + 1
    where r.workspace_id = p_workspace_id
      and r.deleted_at is null
      and not exists (
        select 1
        from jsonb_array_elements(coalesce(p_collections->'report_recipients', '[]'::jsonb)) item
        where item->>'stable_row_id' = r.id::text
      );

    insert into public.partner_onboarding_report_recipients (
      id, workspace_id, name, work_email
    )
    select
      (item->>'stable_row_id')::uuid,
      p_workspace_id,
      nullif(item->>'name', ''),
      lower(item->>'work_email')
    from jsonb_array_elements(coalesce(p_collections->'report_recipients', '[]'::jsonb)) item
    on conflict (id) do update
    set
      name = excluded.name,
      work_email = excluded.work_email,
      revision = public.partner_onboarding_report_recipients.revision + 1,
      deleted_at = null
    where public.partner_onboarding_report_recipients.workspace_id = p_workspace_id;
  end if;

  if p_mode = 'section_complete' then
    update public.partner_onboarding_change_requests
    set
      status = 'partner_responded',
      partner_response = 'Updated section submitted for review.',
      responded_by = p_actor_user_id,
      responded_at = now(),
      updated_at = now()
    where workspace_id = p_workspace_id
      and section_id = v_section.id
      and status = 'open';

    v_partner_review_pending :=
      v_resubmitted
      and not exists (
        select 1
        from public.partner_onboarding_change_requests cr
        where cr.workspace_id = p_workspace_id
          and cr.status = 'open'
      );
  end if;

  update public.partner_onboarding
  set
    status = case
      when v_partner_review_pending then 'ready_for_review'
      when exists (
        select 1
        from public.partner_onboarding_change_requests cr
        where cr.workspace_id = p_workspace_id
          and cr.status = 'open'
      ) then 'waiting_on_partner'
      when status = 'waiting_on_partner' then 'setup_in_progress'
      else status
    end,
    aggregate_version = aggregate_version + 1,
    completion_percentage = p_workspace_completion,
    blocker_code = case
      when v_partner_review_pending then null
      else p_blocker_code
    end,
    next_action_code = case
      when v_partner_review_pending then 'await_legalease_review'
      else p_next_action_code
    end,
    next_action_owner = case
      when v_partner_review_pending then 'legalease'
      else p_next_action_owner
    end,
    last_meaningful_activity_at = case
      when v_first_started or v_completed or v_resubmitted then now()
      else last_meaningful_activity_at
    end
  where id = p_workspace_id
  returning aggregate_version into workspace_aggregate_version;

  if v_resubmitted then
    v_event_type := 'section_resubmitted';
    v_event_summary := 'section_resubmitted';
  elsif v_completed then
    v_event_type := 'section_completed';
    v_event_summary := 'section_completed';
  elsif v_first_started then
    v_event_type := 'section_started';
    v_event_summary := 'section_started';
  end if;

  if v_event_type is not null then
    insert into public.partner_onboarding_activity (
      workspace_id,
      event_type,
      section_key,
      status_code,
      summary_code,
      owner_type,
      actor_user_id,
      request_id,
      dedupe_key
    ) values (
      p_workspace_id,
      v_event_type,
      p_section_key,
      v_next_status,
      v_event_summary,
      'partner',
      p_actor_user_id,
      p_request_id,
      p_request_id::text || ':' || v_event_type
    )
    on conflict do nothing;

    insert into public.partner_onboarding_integration_events (
      workspace_id,
      partner_record_id,
      event_type,
      workspace_aggregate_version,
      workspace_status,
      completion_percentage,
      blocker_code,
      next_action_code,
      next_action_owner,
      target_launch_date,
      section_key,
      section_status,
      idempotency_key
    )
    select
      po.id,
      v_partner_record_id,
      case
        when p_section_key = 'brand_public_page' then 'rcap_brand_configuration_changed'
        when p_section_key = 'staff_dashboard_plan' then 'rcap_team_configuration_changed'
        when p_blocker_code is not null then 'rcap_onboarding_blocked'
        else 'rcap_onboarding_progressed'
      end,
      po.aggregate_version,
      po.status,
      po.completion_percentage,
      po.blocker_code,
      po.next_action_code,
      po.next_action_owner,
      po.target_launch_date,
      p_section_key,
      v_next_status,
      p_request_id::text || ':progress'
    from public.partner_onboarding po
    where po.id = p_workspace_id
    on conflict do nothing;
  end if;

  update public.partner_onboarding_idempotency
  set
    result_status = 'succeeded',
    result_workspace_version = workspace_aggregate_version,
    result_section_revision = v_next_revision,
    completed_at = now()
  where request_id = p_request_id;

  section_revision := v_next_revision;
  section_status := v_next_status;
  duplicate := false;
  return next;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_service_save_onboarding_section_with_prefill(p_partner_slug text, p_actor_user_id uuid, p_workspace_id uuid, p_section_key text, p_expected_revision bigint, p_expected_workspace_version bigint, p_response_data jsonb, p_collections jsonb, p_mode text, p_section_completion integer, p_missing_required_keys text[], p_workspace_completion integer, p_blocker_code text, p_next_action_code text, p_next_action_owner text, p_request_id uuid, p_payload_hash text)
 RETURNS TABLE(section_revision bigint, workspace_aggregate_version bigint, section_status text, duplicate boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_saved record;
  v_pending integer := 0;
  v_modified integer := 0;
  v_partner_record_id uuid;
begin
  select *
    into v_saved
  from public.rcap_service_save_onboarding_section(
    p_partner_slug,
    p_actor_user_id,
    p_workspace_id,
    p_section_key,
    p_expected_revision,
    p_expected_workspace_version,
    p_response_data,
    p_collections,
    p_mode,
    p_section_completion,
    p_missing_required_keys,
    p_workspace_completion,
    p_blocker_code,
    p_next_action_code,
    p_next_action_owner,
    p_request_id,
    p_payload_hash
  );

  if p_mode = 'section_complete' and not v_saved.duplicate then
    select count(*)::integer
      into v_pending
    from public.partner_onboarding_prefill_values pv
    where pv.workspace_id = p_workspace_id
      and pv.section_key = p_section_key
      and pv.review_status = 'applied'
      and pv.partner_review_status = 'pending';

    if v_pending > 0 then
      update public.partner_onboarding_prefill_values pv
      set
        partner_review_status = case
          when public.rcap_onboarding_prefill_current_value(
            p_workspace_id, p_section_key, pv.field_key
          ) = pv.proposed_value then 'confirmed'
          when public.rcap_onboarding_prefill_current_value(
            p_workspace_id, p_section_key, pv.field_key
          ) in ('null'::jsonb, '""'::jsonb, '[]'::jsonb) then 'rejected'
          else 'modified'
        end,
        partner_reviewed_at = now(),
        partner_reviewed_section_revision = v_saved.section_revision,
        partner_modified = public.rcap_onboarding_prefill_current_value(
          p_workspace_id, p_section_key, pv.field_key
        ) <> pv.proposed_value
      where pv.workspace_id = p_workspace_id
        and pv.section_key = p_section_key
        and pv.review_status = 'applied'
        and pv.partner_review_status = 'pending';

      select count(*)::integer
        into v_modified
      from public.partner_onboarding_prefill_values pv
      where pv.workspace_id = p_workspace_id
        and pv.section_key = p_section_key
        and pv.review_status = 'applied'
        and pv.partner_reviewed_section_revision = v_saved.section_revision
        and pv.partner_review_status in ('modified', 'rejected');

      insert into public.partner_onboarding_activity (
        workspace_id, event_type, section_key, status_code, summary_code,
        owner_type, actor_user_id, request_id, dedupe_key
      ) values (
        p_workspace_id,
        case when v_modified > 0
          then 'prefill_section_modified'
          else 'prefill_section_confirmed'
        end,
        p_section_key,
        case when v_modified > 0
          then 'partner_modified'
          else 'partner_confirmed'
        end,
        case when v_modified > 0
          then 'prefill_section_modified'
          else 'prefill_section_confirmed'
        end,
        'partner',
        p_actor_user_id,
        p_request_id,
        p_request_id::text || ':prefill_reviewed'
      )
      on conflict do nothing;

      select po.partner_record_id
        into v_partner_record_id
      from public.partner_onboarding po
      where po.id = p_workspace_id;

      insert into public.partner_onboarding_integration_events (
        workspace_id, partner_record_id, event_type,
        workspace_aggregate_version, workspace_status,
        completion_percentage, blocker_code, next_action_code,
        next_action_owner, target_launch_date, section_key,
        section_status, idempotency_key
      )
      select
        po.id, v_partner_record_id, 'rcap_onboarding_prefill_reviewed',
        po.aggregate_version, po.status, po.completion_percentage,
        po.blocker_code, po.next_action_code, po.next_action_owner,
        po.target_launch_date, p_section_key, v_saved.section_status,
        p_request_id::text || ':prefill_reviewed'
      from public.partner_onboarding po
      where po.id = p_workspace_id
      on conflict do nothing;
    end if;
  end if;

  section_revision := v_saved.section_revision;
  workspace_aggregate_version := v_saved.workspace_aggregate_version;
  section_status := v_saved.section_status;
  duplicate := v_saved.duplicate;
  return next;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_service_submit_onboarding(p_partner_slug text, p_actor_user_id uuid, p_actor_work_email text, p_workspace_id uuid, p_expected_workspace_version bigint, p_request_id uuid, p_payload_hash text, p_schema_version text, p_authorization jsonb)
 RETURNS TABLE(workspace_aggregate_version bigint, submitted_at timestamp with time zone, duplicate boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_workspace public.partner_onboarding%rowtype;
  v_existing public.partner_onboarding_idempotency%rowtype;
  v_partner_record_id uuid;
begin
  perform public.rcap_service_assert_partner_actor(
    p_partner_slug, p_actor_user_id, p_workspace_id
  );
  if p_authorization is null
     or jsonb_typeof(p_authorization) <> 'object'
     or nullif(lower(btrim(p_actor_work_email)), '') is null
     or char_length(p_actor_work_email) > 254
     or p_payload_hash !~ '^[0-9a-f]{64}$'
     or nullif(btrim(p_schema_version), '') is null then
    raise exception using errcode = '22023', message = 'Invalid onboarding submission';
  end if;

  select *
    into v_existing
  from public.partner_onboarding_idempotency i
  where i.request_id = p_request_id
  for update;
  if found then
    if v_existing.workspace_id <> p_workspace_id
       or v_existing.operation_key <> 'submit'
       or v_existing.actor_user_id <> p_actor_user_id
       or v_existing.payload_hash <> p_payload_hash then
      raise exception using errcode = '23505', message = 'Idempotency request mismatch';
    end if;
    if v_existing.result_status = 'succeeded' then
      return query
      select
        v_existing.result_workspace_version,
        po.submitted_at,
        true
      from public.partner_onboarding po
      where po.id = p_workspace_id;
      return;
    end if;
    raise exception using errcode = '55000', message = 'Idempotent request is still in progress';
  end if;

  select po.*
    into v_workspace
  from public.partner_onboarding po
  where po.id = p_workspace_id
    and po.partner_slug = p_partner_slug
  for update of po;

  if not found then
    raise exception using errcode = 'P0002', message = 'Onboarding workspace not found';
  end if;
  select coalesce(v_workspace.partner_record_id, pr.id)
    into v_partner_record_id
  from public.partner_records pr
  where pr.partner_slug = p_partner_slug;
  if v_workspace.aggregate_version <> p_expected_workspace_version then
    raise exception using errcode = '40001', message = 'Onboarding workspace revision conflict';
  end if;
  if v_workspace.commercial_gate_status = 'blocked' then
    raise exception using errcode = '55000', message = 'Commercial gate is blocked';
  end if;
  if v_workspace.status <> 'setup_in_progress' then
    raise exception using errcode = '55000', message = 'Workspace is not ready for partner submission';
  end if;
  if (
    select count(*)
    from public.partner_onboarding_sections s
    where s.workspace_id = p_workspace_id
      and (
        s.status in ('submitted', 'approved', 'waived', 'not_applicable')
        and (
          s.completion_percentage = 100
          or s.status in ('waived', 'not_applicable')
        )
      )
  ) <> 8 then
    raise exception using errcode = '55000', message = 'Active partner requirements are incomplete';
  end if;
  if exists (
    select 1
    from public.partner_onboarding_change_requests cr
    where cr.workspace_id = p_workspace_id
      and cr.status in ('open', 'partner_responded')
  ) then
    raise exception using errcode = '55000', message = 'Requested changes remain unresolved';
  end if;
  if not exists (
    select 1
    from public.partner_onboarding_assets a
    where a.workspace_id = p_workspace_id
      and a.category = 'transparent_logo'
      and a.deleted_at is null
      and a.lifecycle_status in ('pending_review', 'active')
  ) then
    raise exception using errcode = '55000', message = 'Required organizational asset is missing';
  end if;

  insert into public.partner_onboarding_idempotency (
    workspace_id,
    operation_key,
    request_id,
    actor_user_id,
    payload_hash,
    expires_at
  ) values (
    p_workspace_id,
    'submit',
    p_request_id,
    p_actor_user_id,
    p_payload_hash,
    now() + interval '24 hours'
  );

  insert into public.partner_onboarding_authorizations (
    workspace_id,
    organization_information_accurate,
    program_scope_approved_for_configuration,
    brand_assets_authorized_for_use,
    no_eligibility_or_outcome_guarantee_understood,
    contested_and_representation_matters_follow_escalation_plan,
    dashboard_users_authorized,
    legalease_may_prepare_draft_implementation_materials,
    approver_name,
    approver_title,
    approver_user_id,
    approver_work_email,
    authorization_timestamp,
    terms_or_schema_version,
    request_id
  ) values (
    p_workspace_id,
    coalesce((p_authorization->>'organization_information_accurate')::boolean, false),
    coalesce((p_authorization->>'program_scope_approved_for_configuration')::boolean, false),
    coalesce((p_authorization->>'brand_assets_authorized_for_use')::boolean, false),
    coalesce((p_authorization->>'no_eligibility_or_outcome_guarantee_understood')::boolean, false),
    coalesce((p_authorization->>'contested_and_representation_matters_follow_escalation_plan')::boolean, false),
    coalesce((p_authorization->>'dashboard_users_authorized')::boolean, false),
    coalesce((p_authorization->>'legalease_may_prepare_draft_implementation_materials')::boolean, false),
    p_authorization->>'approver_name',
    p_authorization->>'approver_title',
    p_actor_user_id,
    lower(btrim(p_actor_work_email)),
    now(),
    p_schema_version,
    p_request_id
  );

  update public.partner_onboarding
  set
    status = 'ready_for_review',
    aggregate_version = aggregate_version + 1,
    blocker_code = null,
    next_action_code = 'await_legalease_review',
    next_action_owner = 'legalease',
    submitted_at = now(),
    submitted_by = p_actor_user_id,
    submission_request_id = p_request_id,
    submitted_schema_version = p_schema_version,
    last_meaningful_activity_at = now()
  where id = p_workspace_id
  returning aggregate_version, partner_onboarding.submitted_at
    into workspace_aggregate_version, submitted_at;

  insert into public.partner_onboarding_activity (
    workspace_id,
    event_type,
    status_code,
    summary_code,
    owner_type,
    actor_user_id,
    request_id,
    dedupe_key
  ) values (
    p_workspace_id,
    'onboarding_submitted',
    'ready_for_review',
    'onboarding_submitted',
    'partner',
    p_actor_user_id,
    p_request_id,
    p_request_id::text || ':submitted'
  )
  on conflict do nothing;

  insert into public.partner_onboarding_integration_events (
    workspace_id,
    partner_record_id,
    event_type,
    workspace_aggregate_version,
    workspace_status,
    completion_percentage,
    blocker_code,
    next_action_code,
    next_action_owner,
    target_launch_date,
    idempotency_key
  )
  select
    po.id,
    v_partner_record_id,
    'rcap_onboarding_submitted',
    po.aggregate_version,
    po.status,
    po.completion_percentage,
    po.blocker_code,
    po.next_action_code,
    po.next_action_owner,
    po.target_launch_date,
    p_request_id::text || ':submitted'
  from public.partner_onboarding po
  where po.id = p_workspace_id
  on conflict do nothing;

  update public.partner_onboarding_idempotency
  set
    result_status = 'succeeded',
    result_workspace_version = workspace_aggregate_version,
    completed_at = now()
  where request_id = p_request_id;

  duplicate := false;
  return next;
end;
$function$;

CREATE OR REPLACE FUNCTION public.rcap_service_supersede_onboarding_artifact_version(p_partner_slug text, p_actor_user_id uuid, p_artifact_version_id uuid)
 RETURNS TABLE(superseded boolean)
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare
  v_updated public.partner_onboarding_artifact_versions%rowtype;
  v_artifact_type text;
begin
  update public.partner_onboarding_artifact_versions v
  set approval_status = 'superseded',
      superseded_at = now()
  from public.partner_onboarding po
  where v.id = p_artifact_version_id
    and po.id = v.workspace_id
    and po.partner_slug = p_partner_slug
    and v.superseded_at is null
    and v.generation_status = 'succeeded'
  returning v.* into v_updated;

  if v_updated.id is null then
    superseded := false;
    return next;
    return;
  end if;

  select a.artifact_type into v_artifact_type
  from public.partner_onboarding_artifacts a
  where a.id = v_updated.artifact_id;

  update public.partner_onboarding_artifacts
  set lifecycle_status = 'superseded'
  where id = v_updated.artifact_id
    and current_version_id = v_updated.id;

  insert into public.partner_onboarding_activity (
    workspace_id, event_type, owner_type, summary_code, status_code,
    artifact_version_id
  )
  values (
    v_updated.workspace_id, 'artifact_superseded', 'legalease',
    v_artifact_type, 'superseded', v_updated.id
  )
  on conflict do nothing;

  superseded := true;
  return next;
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_consumer_packet_payment(p_briefcase_item_id uuid, p_payment_status text, p_amount_cents integer, p_currency text, p_payment_provider text, p_provider_event_id text, p_checkout_session_id text, p_payment_intent_id text, p_receipt_url text, p_authority text, p_recorded_by text, p_product_id text, p_person_id uuid, p_matter_id uuid)
 RETURNS TABLE(outcome text, briefcase_item_id uuid, provider_event_id text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_found boolean;
  v_owner uuid;
  v_status text;
  v_existing_event text;
  v_existing_session text;
  v_existing_product text;
  v_existing_person uuid;
  v_existing_matter uuid;
  v_existing_amount integer;
  v_existing_currency text;
  v_payment_allowed boolean;
  v_source_session_id text;
  v_item_type text;
  v_jurisdiction text;
  v_pathway_label text;
  v_result_code text;
  v_packet_type text;
  v_item_status text;
  v_sponsored boolean := false;
  v_expected_match_key text;
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
    'select true, b.user_id, b.payment_status, b.provider_event_id,
            b.checkout_session_id, b.payment_product_id, b.payment_person_id,
            b.payment_matter_id, b.amount_cents, b.currency,
            b.payment_allowed, b.source_session_id, b.item_type,
            b.jurisdiction, b.pathway_label, b.result_code,
            b.packet_type, b.status
       from public.consumer_briefcase_items b
      where b.id = $1 for update'
  into v_found, v_owner, v_status, v_existing_event, v_existing_session,
       v_existing_product, v_existing_person, v_existing_matter,
       v_existing_amount, v_existing_currency, v_payment_allowed,
       v_source_session_id, v_item_type, v_jurisdiction,
       v_pathway_label, v_result_code, v_packet_type, v_item_status
  using p_briefcase_item_id;

  if not coalesce(v_found, false) then
    return query select 'item_not_found'::text, p_briefcase_item_id, null::text;
    return;
  end if;

  if p_payment_status = 'paid' then
    -- RCAP sponsorship and DTC payment are separate entitlement sources. Even
    -- the security-definer writer must not turn a sponsored item into a paid
    -- consumer item if an application caller is compromised or regresses.
    if v_payment_allowed is not true then
      return query select 'payment_not_allowed'::text, p_briefcase_item_id, null::text;
      return;
    end if;

    if v_item_type not in ('result', 'packet')
       or nullif(trim(coalesce(v_jurisdiction, '')), '') is null
       or nullif(trim(coalesce(v_pathway_label, '')), '') is null
       or v_result_code not in ('packet_ready', 'packet_ready_with_caution')
       or v_packet_type not in ('official_pdf_overlay', 'custom_pleading', 'legacy_packet')
       or v_item_status is distinct from 'packet_ready' then
      return query select 'invalid_item'::text, p_briefcase_item_id, null::text;
      return;
    end if;

    if to_regclass('public.screening_sessions') is not null
       and exists (
         select 1
           from information_schema.columns c
          where c.table_schema = 'public'
            and c.table_name = 'screening_sessions'
            and c.column_name in ('session_id', 'flow_mode', 'partner_slug', 'partner_benefit_active')
          group by c.table_schema, c.table_name
         having count(*) = 4
       ) then
      execute
        'select exists (
           select 1 from public.screening_sessions s
            where s.session_id::text = nullif(trim($1), '''')
              and s.flow_mode = ''rcap''
              and nullif(trim(coalesce(s.partner_slug, '''')), '''') is not null
              and s.partner_benefit_active is true
         )'
      into v_sponsored
      using v_source_session_id;
    end if;

    if coalesce(v_sponsored, false) then
      return query select 'sponsored_item'::text, p_briefcase_item_id, null::text;
      return;
    end if;

    if p_amount_cents is distinct from 5000
       or lower(coalesce(p_currency, '')) <> 'usd'
       or nullif(trim(coalesce(p_provider_event_id, '')), '') is null
       or nullif(trim(coalesce(p_checkout_session_id, '')), '') is null
       or p_product_id is distinct from 'expungement_packet'
       or p_person_id is null
       or p_matter_id is distinct from public.consumer_matter_id_for_briefcase_item(p_briefcase_item_id) then
      return query select 'invalid_payment_evidence'::text, p_briefcase_item_id, null::text;
      return;
    end if;

    v_expected_match_key := 'consumer:' || encode(
      extensions.digest(convert_to('rcap:consumer-person:v1:' || v_owner::text, 'utf8'), 'sha256'),
      'hex'
    );
    if not exists (
      select 1 from public.rcap_persons p
       where p.id = p_person_id
         and p.partner_slug = 'expungement-ai-consumer'
         and p.match_key = v_expected_match_key
    ) then
      return query select 'invalid_payment_identity'::text, p_briefcase_item_id, null::text;
      return;
    end if;

    -- The session was stored when Checkout began. A signed event may confirm
    -- that session; it may not swing the entitlement to a different one.
    if v_existing_session is distinct from p_checkout_session_id
       or v_existing_product is distinct from p_product_id
       or v_existing_person is distinct from p_person_id
       or v_existing_matter is distinct from p_matter_id then
      return query select 'checkout_binding_mismatch'::text, p_briefcase_item_id, null::text;
      return;
    end if;

    -- A second signed event for the same already-paid Session is an idempotent
    -- success. Preserve the first authoritative provider receipt.
    if v_status = 'paid' then
      if v_existing_amount = 5000
         and lower(coalesce(v_existing_currency, '')) = 'usd'
         and nullif(trim(coalesce(v_existing_event, '')), '') is not null then
        return query select 'already_paid'::text, p_briefcase_item_id, v_existing_event;
      end if;
      return query select 'payment_conflict'::text, p_briefcase_item_id, v_existing_event;
      return;
    end if;

    begin
      execute
        'update public.consumer_briefcase_items
            set payment_status = ''paid'', amount_cents = 5000, currency = ''usd'',
                payment_provider = coalesce($2, payment_provider),
                payment_intent_id = coalesce($3, payment_intent_id),
                receipt_url = coalesce($4, receipt_url), provider_event_id = $5,
                payment_authority = $6, payment_recorded_at = now(),
                payment_recorded_by = $7, payment_product_id = $8,
                payment_person_id = $9, payment_matter_id = $10
          where id = $1'
      using p_briefcase_item_id, p_payment_provider, p_payment_intent_id,
            p_receipt_url, trim(p_provider_event_id), p_authority, p_recorded_by,
            p_product_id, p_person_id, p_matter_id;
    exception when unique_violation then
      -- This event or Session belongs to another item. Exact same-item replay
      -- returned already_paid above, so this outcome is never safe to accept.
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

  execute
    'update public.consumer_briefcase_items
        set payment_status = $2, payment_authority = $3,
            payment_recorded_at = now(), payment_recorded_by = $4
      where id = $1'
  using p_briefcase_item_id, p_payment_status, p_authority, p_recorded_by;

  return query select ('recorded_' || p_payment_status)::text, p_briefcase_item_id, v_existing_event;
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_packet_delivery_event(p_job_id uuid, p_event_type text, p_actor_user_id uuid, p_request_context jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.record_partner_packet_generation(p_session_id uuid, p_now timestamp with time zone DEFAULT now())
 RETURNS TABLE(recorded boolean, counted_as text, reason text, partner_slug text, screenings_used integer, screenings_allowed integer, overage_packets integer, overage_amount_cents integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_session public.screening_sessions%rowtype;
  v_ent public.partner_entitlement%rowtype;
  v_counted text;
  v_price integer;
begin
  select * into v_session
  from public.screening_sessions ss
  where ss.session_id = p_session_id
  limit 1;

  if not found
     or v_session.flow_mode <> 'rcap'
     or v_session.partner_slug is null
     or v_session.partner_benefit_active is not true then
    return query select false, 'not_counted'::text, 'not_partner_benefit'::text,
                        v_session.partner_slug, null::integer, null::integer, null::integer, null::integer;
    return;
  end if;

  if v_session.claimed_slot_state is distinct from 'claimed' then
    return query select false, 'not_counted'::text, 'already_recorded'::text,
                        v_session.partner_slug, null::integer, null::integer, null::integer, null::integer;
    return;
  end if;

  select * into v_ent
  from public.partner_entitlement pe
  where pe.partner_slug = v_session.partner_slug
  for update;

  if not found then
    return query select false, 'not_counted'::text, 'no_entitlement'::text,
                        v_session.partner_slug, null::integer, null::integer, null::integer, null::integer;
    return;
  end if;

  if v_ent.screenings_used < v_ent.screenings_allowed then
    update public.partner_entitlement pe
    set screenings_used = pe.screenings_used + 1, updated_at = now()
    where pe.partner_slug = v_ent.partner_slug
    returning pe.screenings_used, pe.screenings_allowed, pe.overage_packets, pe.overage_amount_cents
    into v_ent.screenings_used, v_ent.screenings_allowed, v_ent.overage_packets, v_ent.overage_amount_cents;
    v_counted := 'included';
  elsif v_ent.pause_at_cap then
    insert into public.rcap_record_events (record_type, record_id, partner_slug, event_type, occurred_at, actor, metadata)
    values ('partner_entitlement', v_ent.partner_slug, v_ent.partner_slug, 'partner_packet_cap_reached', p_now, 'system',
            jsonb_build_object('session_id', p_session_id, 'paused', true));
    return query select false, 'capped'::text, 'paused_at_cap'::text,
                        v_ent.partner_slug, v_ent.screenings_used, v_ent.screenings_allowed,
                        v_ent.overage_packets, v_ent.overage_amount_cents;
    return;
  elsif v_ent.overage_enabled then
    v_price := v_ent.overage_packet_price_cents;
    update public.partner_entitlement pe
    set overage_packets = pe.overage_packets + 1,
        overage_amount_cents = pe.overage_amount_cents + v_price,
        updated_at = now()
    where pe.partner_slug = v_ent.partner_slug
    returning pe.screenings_used, pe.screenings_allowed, pe.overage_packets, pe.overage_amount_cents
    into v_ent.screenings_used, v_ent.screenings_allowed, v_ent.overage_packets, v_ent.overage_amount_cents;
    v_counted := 'overage';
  else
    update public.screening_sessions ss
    set claimed_slot_state = 'consumed', status = 'completed', updated_at = now()
    where ss.session_id = p_session_id;
    insert into public.rcap_record_events (record_type, record_id, partner_slug, event_type, occurred_at, actor, metadata)
    values ('partner_entitlement', v_ent.partner_slug, v_ent.partner_slug, 'partner_packet_cap_reached', p_now, 'system',
            jsonb_build_object('session_id', p_session_id, 'paused', false, 'overage_enabled', false));
    return query select false, 'not_counted'::text, 'cap_reached_no_overage'::text,
                        v_ent.partner_slug, v_ent.screenings_used, v_ent.screenings_allowed,
                        v_ent.overage_packets, v_ent.overage_amount_cents;
    return;
  end if;

  update public.screening_sessions ss
  set claimed_slot_state = 'consumed', status = 'completed', updated_at = now()
  where ss.session_id = p_session_id;

  insert into public.rcap_record_events (record_type, record_id, partner_slug, event_type, occurred_at, actor, metadata)
  values ('partner_entitlement', v_ent.partner_slug, v_ent.partner_slug,
          case when v_counted = 'overage' then 'partner_packet_overage_recorded' else 'partner_packet_credit_consumed' end,
          p_now, 'system', jsonb_build_object('session_id', p_session_id, 'counted_as', v_counted));

  -- Analytics: one packet_generated per successful credit (included or overage),
  -- plus packet_overage_recorded for overage. Fires once (slot just consumed).
  insert into public.rcap_screening_analytics_events
    (session_id, partner_slug, partner_access_code_id, campaign_name, event_type, packet_route_available, occurred_at, metadata)
  values
    (v_session.session_id, v_session.partner_slug, v_session.partner_access_code_id, v_session.campaign_name,
     'packet_generated', true, p_now, jsonb_build_object('counted_as', v_counted));

  if v_counted = 'overage' then
    insert into public.rcap_screening_analytics_events
      (session_id, partner_slug, partner_access_code_id, campaign_name, event_type, occurred_at, metadata)
    values
      (v_session.session_id, v_session.partner_slug, v_session.partner_access_code_id, v_session.campaign_name,
       'packet_overage_recorded', p_now, jsonb_build_object('overage_packet_price_cents', v_price));
  end if;

  return query select true, v_counted, null::text,
                      v_ent.partner_slug, v_ent.screenings_used, v_ent.screenings_allowed,
                      v_ent.overage_packets, v_ent.overage_amount_cents;
end;
$function$;

CREATE OR REPLACE FUNCTION public.record_rcap_screening_analytics_event(p_session_id uuid, p_event_type text, p_outcome_category text DEFAULT NULL::text, p_packet_route_available boolean DEFAULT NULL::boolean, p_now timestamp with time zone DEFAULT now())
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_session public.screening_sessions%rowtype;
begin
  if p_event_type not in ('screening_completed', 'eligibility_result_recorded', 'guidance_only_result', 'packet_ready_result') then
    raise exception 'unsupported analytics event type: %', p_event_type;
  end if;

  select * into v_session
  from public.screening_sessions ss
  where ss.session_id = p_session_id
  limit 1;

  -- Partner-benefit gate: DTC and un-attributed sessions produce no analytics.
  if not found
     or v_session.flow_mode <> 'rcap'
     or v_session.partner_slug is null
     or v_session.partner_benefit_active is not true then
    return false;
  end if;

  insert into public.rcap_screening_analytics_events
    (session_id, partner_slug, partner_access_code_id, campaign_name, event_type, outcome_category, packet_route_available, occurred_at)
  values
    (v_session.session_id, v_session.partner_slug, v_session.partner_access_code_id, v_session.campaign_name,
     p_event_type, p_outcome_category, p_packet_route_available, p_now);

  return true;
end;
$function$;

CREATE OR REPLACE FUNCTION public.release_expired_packet_render_claims()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.requeue_packet_render_job_manual(p_job_id uuid, p_authorized_by text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.requeue_retryable_packet_render_jobs()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.set_partner_access_codes_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_partner_onboarding_artifact_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_partner_onboarding_launch_check_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_partner_onboarding_prefill_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_partner_onboarding_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_partner_packet_entitlement_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.start_packet_render(p_job_id uuid, p_fencing_token uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.start_packet_validation(p_job_id uuid, p_fencing_token uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.validate_partner_access_code(p_partner_slug text, p_code_hash text, p_now timestamp with time zone DEFAULT now())
 RETURNS TABLE(valid boolean, reason text, campaign_name text, code_id uuid, code_type text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_partner_slug text;
  v_code_hash text;
  v_code public.partner_access_codes%rowtype;
  v_effective_max integer;
begin
  v_partner_slug := nullif(trim(p_partner_slug), '');
  v_code_hash := nullif(trim(p_code_hash), '');

  if v_partner_slug is null or v_code_hash is null then
    return query select false, 'invalid'::text, null::text, null::uuid, null::text;
    return;
  end if;

  select * into v_code
  from public.partner_access_codes c
  where c.partner_slug = v_partner_slug
    and c.code_hash = v_code_hash
  limit 1;

  if not found then
    return query select false, 'invalid'::text, null::text, null::uuid, null::text;
    return;
  end if;

  if not v_code.is_active then
    return query select false, 'inactive'::text, null::text, v_code.id, v_code.code_type;
    return;
  end if;

  if v_code.starts_at is not null and p_now < v_code.starts_at then
    return query select false, 'inactive'::text, null::text, v_code.id, v_code.code_type;
    return;
  end if;

  if v_code.expires_at is not null and p_now >= v_code.expires_at then
    return query select false, 'expired'::text, null::text, v_code.id, v_code.code_type;
    return;
  end if;

  v_effective_max := case
    when v_code.code_type = 'single_use' then 1
    when v_code.code_type = 'limited_use' then v_code.max_uses
    else null
  end;

  if v_effective_max is not null and v_code.uses_count >= v_effective_max then
    return query select false, 'exhausted'::text, null::text, v_code.id, v_code.code_type;
    return;
  end if;

  return query select true, null::text, v_code.campaign_name, v_code.id, v_code.code_type;
end;
$function$;

CREATE OR REPLACE FUNCTION public.claim_rcap_screening_session(p_partner_slug text, p_jurisdiction text)
 RETURNS TABLE(ok boolean, session_id uuid, reason text, screenings_used integer, screenings_allowed integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_partner_slug text;
  v_jurisdiction text;
  v_session_id uuid;
  v_screenings_used integer;
  v_screenings_allowed integer;
begin
  v_partner_slug := nullif(trim(p_partner_slug), '');
  v_jurisdiction := upper(nullif(trim(p_jurisdiction), ''));

  if v_partner_slug is null then
    return query select false, null::uuid, 'partner_inactive'::text, null::integer, null::integer;
    return;
  end if;

  if v_jurisdiction is null or v_jurisdiction !~ '^[A-Z]{2,3}$' then
    raise exception 'jurisdiction must be a 2-3 letter uppercase code';
  end if;

  if not exists (
    select 1
    from public.partner_records pr
    where pr.partner_slug = v_partner_slug
      and pr.payment_status in ('paid', 'demo_paid')
      and pr.qualification_status = 'qualified'
      and pr.provisioning_status in ('provisioned', 'active')
  ) then
    return query select false, null::uuid, 'partner_inactive'::text, null::integer, null::integer;
    return;
  end if;

  select pe.screenings_used, pe.screenings_allowed
  into v_screenings_used, v_screenings_allowed
  from public.partner_entitlement pe
  where pe.partner_slug = v_partner_slug;

  if v_screenings_allowed is null then
    return query select false, null::uuid, 'partner_inactive'::text, null::integer, null::integer;
    return;
  end if;

  v_session_id := gen_random_uuid();

  insert into public.screening_sessions (
    session_id, jurisdiction, answers, current_question_id, furthest_stage,
    status, last_drop_question, partner_slug, flow_mode, claimed_slot_state,
    attribution_source, partner_benefit_active
  )
  values (
    v_session_id, v_jurisdiction, '{}'::jsonb, null, null,
    'in_progress', null, v_partner_slug, 'rcap', 'claimed',
    'partner_page', true
  );

  return query
  select true, v_session_id, null::text, v_screenings_used, v_screenings_allowed;
end;
$function$;

CREATE OR REPLACE FUNCTION public.consume_rcap_screening_session(p_session_id uuid)
 RETURNS TABLE(consumed boolean, partner_slug text, claimed_slot_state text, status text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with consumed_session as (
    update public.screening_sessions ss
    set status = 'completed',
        updated_at = now()
    where ss.session_id = p_session_id
      and ss.flow_mode = 'rcap'
      and ss.partner_slug is not null
      and ss.status <> 'completed'
    returning ss.partner_slug, ss.claimed_slot_state, ss.status
  )
  select true, cs.partner_slug, cs.claimed_slot_state, cs.status
  from consumed_session cs
  union all
  select false, ss.partner_slug, ss.claimed_slot_state, ss.status
  from public.screening_sessions ss
  where ss.session_id = p_session_id
    and ss.flow_mode = 'rcap'
    and not exists (select 1 from consumed_session)
  limit 1;
$function$;

CREATE OR REPLACE FUNCTION public.current_partner_role()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select pu.role
  from public.partner_users pu
  where pu.auth_user_id = auth.uid()
    and pu.status = 'active'
$function$;

CREATE OR REPLACE FUNCTION public.current_partner_slug()
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select pu.partner_slug
  from public.partner_users pu
  where pu.auth_user_id = auth.uid()
    and pu.status = 'active'
    and pu.role in ('partner_admin', 'partner_staff')
$function$;

CREATE OR REPLACE FUNCTION public.is_internal_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  select exists (
    select 1
    from public.partner_users pu
    where pu.auth_user_id = auth.uid()
      and pu.status = 'active'
      and pu.role = 'internal_admin'
      and pu.partner_slug is null
  )
$function$;

CREATE OR REPLACE FUNCTION public.recompute_rcap_partner_entitlements(p_partner_slug text DEFAULT NULL::text, p_now timestamp with time zone DEFAULT now())
 RETURNS TABLE(partner_slug text, screenings_used integer, screenings_allowed integer, ledger_count integer, period_label text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with ledger as (
    select
      pe.partner_slug,
      count(ss.session_id)::integer as ledger_count
    from public.partner_entitlement pe
    left join public.screening_sessions ss
      on ss.partner_slug = pe.partner_slug
     and ss.flow_mode = 'rcap'
     and ss.claimed_slot_state = 'consumed'
    where p_partner_slug is null
       or pe.partner_slug = p_partner_slug
    group by pe.partner_slug
  ),
  updated_entitlements as (
    update public.partner_entitlement pe
    set screenings_used = l.ledger_count,
        updated_at = now()
    from ledger l
    where pe.partner_slug = l.partner_slug
    returning pe.partner_slug, pe.screenings_used, pe.screenings_allowed, l.ledger_count, pe.period_label
  )
  select ue.partner_slug, ue.screenings_used, ue.screenings_allowed, ue.ledger_count, ue.period_label
  from updated_entitlements ue
  order by ue.partner_slug;
$function$;

CREATE OR REPLACE FUNCTION public.record_rcap_partner_packet_generation(p_session_id uuid)
 RETURNS TABLE(recorded boolean, partner_slug text, claimed_slot_state text, status text, screenings_used integer, screenings_allowed integer)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with counted_session as (
    update public.screening_sessions ss
    set claimed_slot_state = 'consumed',
        status = 'completed',
        updated_at = now()
    where ss.session_id = p_session_id
      and ss.flow_mode = 'rcap'
      and ss.partner_slug is not null
      and ss.claimed_slot_state = 'claimed'
      and exists (
        select 1
        from public.partner_entitlement pe
        where pe.partner_slug = ss.partner_slug
          and pe.screenings_used < pe.screenings_allowed
      )
    returning ss.partner_slug, ss.claimed_slot_state, ss.status
  ),
  incremented_entitlement as (
    update public.partner_entitlement pe
    set screenings_used = pe.screenings_used + 1,
        updated_at = now()
    from counted_session cs
    where pe.partner_slug = cs.partner_slug
      and pe.screenings_used < pe.screenings_allowed
    returning pe.partner_slug, pe.screenings_used, pe.screenings_allowed
  )
  select
    true,
    cs.partner_slug,
    cs.claimed_slot_state,
    cs.status,
    ie.screenings_used,
    ie.screenings_allowed
  from counted_session cs
  join incremented_entitlement ie on ie.partner_slug = cs.partner_slug
  union all
  select
    false,
    ss.partner_slug,
    ss.claimed_slot_state,
    ss.status,
    pe.screenings_used,
    pe.screenings_allowed
  from public.screening_sessions ss
  left join public.partner_entitlement pe on pe.partner_slug = ss.partner_slug
  where ss.session_id = p_session_id
    and ss.flow_mode = 'rcap'
    and not exists (select 1 from counted_session)
  limit 1;
$function$;

CREATE OR REPLACE FUNCTION public.release_expired_rcap_screening_slots(p_now timestamp with time zone DEFAULT now())
 RETURNS TABLE(partner_slug text, released_count integer, screenings_used integer, screenings_allowed integer, period_label text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
  with released_sessions as (
    update public.screening_sessions ss
    set claimed_slot_state = 'released',
        updated_at = now()
    where ss.flow_mode = 'rcap'
      and ss.partner_slug is not null
      and ss.claimed_slot_state = 'claimed'
      and public.rcap_screening_session_is_release_expired(
        ss.status,
        ss.created_at,
        ss.resume_token_expires_at,
        p_now
      )
    returning ss.partner_slug
  ),
  release_counts as (
    select rs.partner_slug, count(*)::integer as released_count
    from released_sessions rs
    group by rs.partner_slug
  )
  select pe.partner_slug, rc.released_count, pe.screenings_used, pe.screenings_allowed, pe.period_label
  from release_counts rc
  join public.partner_entitlement pe on pe.partner_slug = rc.partner_slug
  order by pe.partner_slug;
$function$;

CREATE OR REPLACE FUNCTION public.set_partner_users_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.set_rcap_document_packets_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;
