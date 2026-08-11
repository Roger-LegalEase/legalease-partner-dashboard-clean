-- Phase 53 — consumer job binding at enqueue
--
-- Phase 52 made the consumer payment authority correct and unforgeable. The
-- independent re-audit at 25f6b09 confirms that: 19 of 19 payment-gate cases
-- pass and no bypass remains. What it also found is that the gate is
-- unreachable through the sanctioned path — 0 of 3 reachability cases pass:
--
--   * enqueue_packet_render_job has no parameter for the consumer binding,
--   * service_role cannot UPDATE packet_render_jobs after the insert,
--   * so a legitimate paid consumer job is created with consumer_auth_user_id
--     null, and finalization correctly returns consumer_payment_required.
--
-- That is a functional gap, not a security one, and the fix must not widen the
-- gate to close it. This phase binds consumer identity INSIDE the original
-- insert. There is no post-insert binding RPC, no temporarily unbound job, and
-- no restored UPDATE authority — each of those would reintroduce exactly the
-- window Phase 52's immutability trigger exists to forbid.
--
-- The old 13-argument signature is DROPPED rather than kept alongside. Its two
-- successors are appended WITHOUT defaults, so a 13-argument call no longer
-- resolves to any function. An unbound consumer job is therefore impossible by
-- signature, not merely refused at runtime.
--
-- Applied after: 26, 27, 28, 49, 50, 51, 52.

begin;

-------------------------------------------------------------------------------
-- 1. Remove the old signature.
--
-- Kept alongside, it would remain a service-role path that creates a
-- partner_id-null job with null consumer bindings — the precise shape the
-- re-audit found unreachable-but-creatable. Dropping it makes R11 a property of
-- the schema rather than a behaviour we have to remember to test.
-------------------------------------------------------------------------------

drop function if exists public.enqueue_packet_render_job(
  uuid, text, text, text, text, text, text, text, uuid, uuid, uuid, uuid, integer
);

-------------------------------------------------------------------------------
-- 2. The bound enqueue.
--
-- Two modes, decided by p_partner_id, and each rejects the other's shape:
--
--   sponsored  partner_id present; consumer fields must both be null.
--              Entitlement behaviour is untouched.
--   consumer   partner_id null; consumer item, expected user, person and
--              matter are all required.
--
-- In consumer mode the database does not trust the caller's user id. It loads
-- the Briefcase item, reads that item's canonical user_id, compares it to the
-- server-supplied expectation, and stores the CANONICAL value. A caller that
-- supplies someone else's user id is refused; a caller that supplies the right
-- one gains nothing it did not already have.
--
-- Eligibility is still a Phase 52 finalization decision. This function binds
-- identity. It never inspects payment_status and cannot manufacture paid state.
-------------------------------------------------------------------------------

create or replace function public.enqueue_packet_render_job(
  p_packet_id uuid,
  p_route_id text,
  p_renderer_kind text,
  p_renderer_version text,
  p_source_sha256 text,
  p_profile_id text,
  p_profile_version text,
  p_input_hash text,
  p_briefcase_item_id uuid,
  p_partner_id uuid,
  p_person_id uuid,
  p_matter_id uuid,
  p_max_attempts integer,
  p_consumer_briefcase_item_id uuid,
  p_expected_consumer_auth_user_id uuid
)
returns setof public.packet_render_jobs
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

-------------------------------------------------------------------------------
-- 3. Grants, reapplied for the new signature.
--
-- A changed signature is a new object as far as privileges are concerned, so
-- the phase-50 grant block does not carry over and has to be restated here.
-------------------------------------------------------------------------------

do $grants$
declare
  v_fn text := 'public.enqueue_packet_render_job(uuid, text, text, text, text, text, text, text, uuid, uuid, uuid, uuid, integer, uuid, uuid)';
  v_role text;
begin
  execute format('revoke all on function %s from public', v_fn);
  foreach v_role in array array['anon', 'authenticated', 'rcap_render_worker', 'rcap_packet_delivery']
  loop
    if exists (select 1 from pg_roles where rolname = v_role) then
      execute format('revoke all on function %s from %I', v_fn, v_role);
    end if;
  end loop;

  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute format('grant execute on function %s to service_role', v_fn);
  end if;
end
$grants$;

comment on function public.enqueue_packet_render_job(
  uuid, text, text, text, text, text, text, text, uuid, uuid, uuid, uuid, integer, uuid, uuid) is
  'Creates a render job with its consumer identity bound in the same insert. Sponsored mode requires null consumer fields; consumer mode requires the briefcase item, the expected user, a person and a matter, and stores the item''s canonical owner only after confirming it matches the expectation. Phase 53.';

commit;
