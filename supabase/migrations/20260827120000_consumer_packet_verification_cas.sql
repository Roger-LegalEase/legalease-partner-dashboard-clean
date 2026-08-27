-- Protected packet verification compare-and-swap boundary.
--
-- Forward-only and additive after 20260825122000. This migration reuses the
-- existing Briefcase row, Phase 52/55 payment authority, Phase 49/53 durable
-- render queue, and record_partner_packet_generation accounting writer. It
-- does not promote legacy participant JSON into authority and creates no
-- second matter, payment, entitlement, artifact, or accounting table.

begin;

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

alter table public.consumer_briefcase_items
  add column if not exists packet_verification_revision bigint not null default 0,
  add column if not exists packet_draft_hash text,
  add column if not exists packet_draft_snapshot jsonb,
  add column if not exists packet_verification_status text,
  add column if not exists packet_verification_reason text,
  add column if not exists packet_verification_hash text,
  add column if not exists packet_verification_snapshot jsonb,
  add column if not exists packet_verification_invalidated_at timestamptz,
  add column if not exists packet_checkout_verification_hash text,
  add column if not exists packet_payment_verification_hash text,
  add column if not exists packet_artifact_json jsonb,
  add column if not exists packet_artifact_verification_hash text,
  add column if not exists packet_artifact_entitlement_source text,
  add column if not exists packet_artifact_accounting_result text,
  add column if not exists packet_artifact_revision bigint not null default 0;

alter table public.consumer_briefcase_items
  drop constraint if exists consumer_briefcase_items_packet_verification_revision_check,
  add constraint consumer_briefcase_items_packet_verification_revision_check
    check (packet_verification_revision >= 0),
  drop constraint if exists consumer_briefcase_items_packet_artifact_revision_check,
  add constraint consumer_briefcase_items_packet_artifact_revision_check
    check (packet_artifact_revision >= 0),
  drop constraint if exists consumer_briefcase_items_packet_hashes_check,
  add constraint consumer_briefcase_items_packet_hashes_check check (
    (packet_draft_hash is null or packet_draft_hash ~ '^[0-9a-f]{64}$')
    and (packet_verification_hash is null or packet_verification_hash ~ '^[0-9a-f]{64}$')
    and (packet_checkout_verification_hash is null or packet_checkout_verification_hash ~ '^[0-9a-f]{64}$')
    and (packet_payment_verification_hash is null or packet_payment_verification_hash ~ '^[0-9a-f]{64}$')
    and (packet_artifact_verification_hash is null or packet_artifact_verification_hash ~ '^[0-9a-f]{64}$')
  ),
  drop constraint if exists consumer_briefcase_items_packet_verification_state_check,
  add constraint consumer_briefcase_items_packet_verification_state_check check (
    (packet_verification_status is null
      and packet_draft_hash is null and packet_draft_snapshot is null
      and packet_verification_reason is null and packet_verification_hash is null
      and packet_verification_snapshot is null and packet_verification_invalidated_at is null)
    or
    (packet_verification_status in ('unverified', 'verified', 'invalidated')
      and nullif(trim(coalesce(packet_verification_reason, '')), '') is not null
      and packet_draft_hash is not null and jsonb_typeof(packet_draft_snapshot) = 'object'
      and (
        (packet_verification_status = 'verified'
          and packet_verification_hash is not null
          and jsonb_typeof(packet_verification_snapshot) = 'object'
          and packet_verification_invalidated_at is null)
        or
        (packet_verification_status <> 'verified'
          and packet_verification_hash is null
          and packet_verification_snapshot is null)
      ))
  ),
  drop constraint if exists consumer_briefcase_items_packet_artifact_state_check,
  add constraint consumer_briefcase_items_packet_artifact_state_check check (
    (packet_artifact_json is null and packet_artifact_verification_hash is null
      and packet_artifact_entitlement_source is null and packet_artifact_accounting_result is null)
    or
    (jsonb_typeof(packet_artifact_json) = 'object'
      and packet_artifact_verification_hash is not null
      and packet_artifact_entitlement_source in ('consumer_payment', 'partner_sponsorship', 'legacy_backfill'))
  );

alter table public.packet_render_jobs
  add column if not exists consumer_verification_hash text,
  add column if not exists render_packet_json jsonb,
  add column if not exists render_input_payload_json jsonb;

alter table public.packet_render_jobs
  drop constraint if exists packet_render_jobs_consumer_verification_hash_check,
  add constraint packet_render_jobs_consumer_verification_hash_check
    check (consumer_verification_hash is null or consumer_verification_hash ~ '^[0-9a-f]{64}$'),
  drop constraint if exists packet_render_jobs_verified_payload_check,
  add constraint packet_render_jobs_verified_payload_check check (
    (consumer_verification_hash is null and render_packet_json is null and render_input_payload_json is null)
    or
    (consumer_verification_hash is not null
      and jsonb_typeof(render_packet_json) = 'object'
      and jsonb_typeof(render_input_payload_json) = 'object')
  );

-- Same canonical JSON algorithm as the application: object keys sort, array
-- order is retained, and scalar JSON uses PostgreSQL's JSON encoder.
create or replace function public.consumer_packet_canonical_json(p_value jsonb)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_result text;
begin
  case jsonb_typeof(p_value)
    when 'object' then
      select '{' || coalesce(string_agg(to_jsonb(e.key)::text || ':' || public.consumer_packet_canonical_json(e.value), ',' order by e.key), '') || '}'
        into v_result from jsonb_each(p_value) e;
      return v_result;
    when 'array' then
      select '[' || coalesce(string_agg(public.consumer_packet_canonical_json(a.value), ',' order by a.ordinality), '') || ']'
        into v_result from jsonb_array_elements(p_value) with ordinality a(value, ordinality);
      return v_result;
    else
      return p_value::text;
  end case;
end;
$$;

create or replace function public.consumer_packet_json_sha256(p_value jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(extensions.digest(convert_to(public.consumer_packet_canonical_json(p_value), 'utf8'), 'sha256'), 'hex');
$$;

create or replace function public.packet_render_payload_immutable()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.consumer_verification_hash is not null and (
    new.consumer_verification_hash is distinct from old.consumer_verification_hash
    or new.render_packet_json is distinct from old.render_packet_json
    or new.render_input_payload_json is distinct from old.render_input_payload_json
  ) then
    raise exception 'packet_render_jobs: protected render payload is immutable';
  end if;
  return new;
end;
$$;

drop trigger if exists packet_render_payload_immutable_trg on public.packet_render_jobs;
create trigger packet_render_payload_immutable_trg
  before update on public.packet_render_jobs
  for each row execute function public.packet_render_payload_immutable();

create or replace function public.packet_render_jobs_current_verification_finalize_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current_hash text;
  v_payment_hash text;
  v_status text;
begin
  if new.partner_id is not null or new.status <> 'artifact_validated' then return new; end if;
  select b.packet_verification_hash, b.packet_payment_verification_hash, b.packet_verification_status
    into v_current_hash, v_payment_hash, v_status
    from public.consumer_briefcase_items b
   where b.id = new.consumer_briefcase_item_id
   for share;
  if v_status is distinct from 'verified'
     or v_current_hash is distinct from new.consumer_verification_hash
     or v_payment_hash is distinct from new.consumer_verification_hash then
    raise exception 'packet_render_jobs: current protected verification is required at finalization';
  end if;
  return new;
end;
$$;

drop trigger if exists packet_render_jobs_current_verification_finalize_trg on public.packet_render_jobs;
create trigger packet_render_jobs_current_verification_finalize_trg
  before update of status on public.packet_render_jobs
  for each row
  when (new.partner_id is null and new.status = 'artifact_validated')
  execute function public.packet_render_jobs_current_verification_finalize_guard();

create or replace function public.packet_verification_invalidate_on_fact_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_setting('legalease.packet_cas_authority', true) in ('persist', 'initialize', 'checkout', 'payment') then
    return new;
  end if;
  if new.id is distinct from old.id
     or new.user_id is distinct from old.user_id
     or new.item_type is distinct from old.item_type
     or new.jurisdiction is distinct from old.jurisdiction
     or new.pathway_label is distinct from old.pathway_label
     or new.result_code is distinct from old.result_code
     or new.packet_type is distinct from old.packet_type
     or new.payment_allowed is distinct from old.payment_allowed
     or new.source_session_id is distinct from old.source_session_id
     or new.payment_product_id is distinct from old.payment_product_id
     or new.payment_person_id is distinct from old.payment_person_id
     or new.payment_matter_id is distinct from old.payment_matter_id then
    if old.packet_verification_status is not null then
      new.packet_verification_revision := old.packet_verification_revision + 1;
      new.packet_verification_status := 'invalidated';
      new.packet_verification_reason := 'protected_matter_facts_changed';
      new.packet_verification_hash := null;
      new.packet_verification_snapshot := null;
      new.packet_verification_invalidated_at := now();
      new.packet_checkout_verification_hash := null;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists packet_verification_invalidate_on_fact_change_trg on public.consumer_briefcase_items;
create trigger packet_verification_invalidate_on_fact_change_trg
  before update on public.consumer_briefcase_items
  for each row execute function public.packet_verification_invalidate_on_fact_change();

create or replace function public.get_consumer_packet_verification_authority(
  p_consumer_auth_user_id uuid,
  p_briefcase_item_id uuid
)
returns table(
  status text, reason text, revision bigint, hash text, snapshot jsonb,
  draft_hash text, draft_snapshot jsonb, invalidated_at timestamptz,
  checkout_verification_hash text
)
language sql
stable
security definer
set search_path = ''
as $$
  select b.packet_verification_status, b.packet_verification_reason,
         b.packet_verification_revision, b.packet_verification_hash,
         b.packet_verification_snapshot, b.packet_draft_hash,
         b.packet_draft_snapshot, b.packet_verification_invalidated_at,
         b.packet_checkout_verification_hash
    from public.consumer_briefcase_items b
   where b.id = p_briefcase_item_id
     and b.user_id = p_consumer_auth_user_id
     and b.packet_verification_status is not null;
$$;

create or replace function public.initialize_consumer_packet_verification(
  p_consumer_auth_user_id uuid,
  p_briefcase_item_id uuid,
  p_pending_id uuid,
  p_source_matter_id text,
  p_draft_hash text,
  p_draft_snapshot jsonb
)
returns table(
  status text, reason text, revision bigint, hash text, snapshot jsonb,
  draft_hash text, draft_snapshot jsonb, invalidated_at timestamptz,
  checkout_verification_hash text, initialized boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.consumer_briefcase_items%rowtype;
  v_pending public.consumer_pending_screening_results%rowtype;
  v_partner_active boolean := false;
  v_claimed_at timestamptz;
begin
  if p_consumer_auth_user_id is null or p_briefcase_item_id is null or p_pending_id is null
     or nullif(trim(coalesce(p_source_matter_id, '')), '') is null
     or p_draft_hash !~ '^[0-9a-f]{64}$'
     or jsonb_typeof(p_draft_snapshot) is distinct from 'object' then
    return;
  end if;
  if p_draft_snapshot->>'schemaVersion' <> 'expungement-ai/protected-packet-draft/v1'
     or public.consumer_packet_json_sha256(p_draft_snapshot) is distinct from p_draft_hash then
    return;
  end if;

  select * into v_item
    from public.consumer_briefcase_items b
   where b.id = p_briefcase_item_id
   for update;
  if not found or v_item.user_id is distinct from p_consumer_auth_user_id then return; end if;

  select * into v_pending
    from public.consumer_pending_screening_results p
   where p.pending_id = p_pending_id
   for update;
  if not found
     or (v_pending.claimed_user_id is not null and v_pending.claimed_user_id is distinct from p_consumer_auth_user_id)
     or v_pending.profile_version is null
     or v_pending.matter_id is distinct from p_source_matter_id
     or p_draft_snapshot->>'jurisdiction' is distinct from v_pending.jurisdiction
     or p_draft_snapshot->>'profileVersion' is distinct from v_pending.profile_version
     or p_draft_snapshot->'screeningAnswers' is distinct from v_pending.screening_answers
     or p_draft_snapshot->>'resultCode' is distinct from v_item.result_code
     or p_draft_snapshot->>'packetType' is distinct from v_item.packet_type
     or p_draft_snapshot->>'jurisdiction' is distinct from v_item.jurisdiction then
    return;
  end if;

  if v_pending.product = 'expungement_ai_dtc' then
    if v_item.source_session_id is distinct from v_pending.pending_id::text
       or (p_draft_snapshot->>'paymentAllowed')::boolean is distinct from v_item.payment_allowed
       or p_draft_snapshot->'dependencies'->>'entitlementSource' is distinct from 'consumer_payment'
       or p_draft_snapshot->'dependencies'->>'productId' is distinct from 'expungement_packet' then
      return;
    end if;
  elsif v_pending.product = 'rcap_partner' then
    if v_pending.source_session_id is null
       or v_item.source_session_id is distinct from v_pending.source_session_id::text
       or v_item.payment_allowed is not false
       or p_draft_snapshot->'dependencies'->>'entitlementSource' is distinct from 'partner_sponsorship' then
      return;
    end if;
    select s.flow_mode = 'rcap'
           and nullif(trim(coalesce(s.partner_slug, '')), '') is not null
           and s.partner_benefit_active is true
      into v_partner_active
      from public.screening_sessions s
     where s.session_id = v_pending.source_session_id
     for update;
    if not found or not coalesce(v_partner_active, false) then return; end if;
  else
    return;
  end if;

  -- A source may claim one Briefcase matter. An already-claimed competing
  -- pending row makes the source ambiguous and therefore unusable.
  if exists (
    select 1 from public.consumer_pending_screening_results p
     where p.pending_id <> p_pending_id
       and p.claimed_user_id is not null
       and (
         (v_pending.product = 'expungement_ai_dtc' and p.pending_id::text = v_item.source_session_id)
         or
         (v_pending.product = 'rcap_partner' and p.source_session_id = v_pending.source_session_id)
       )
  ) then return; end if;

  if v_item.packet_verification_status is not null then
    if v_item.packet_verification_revision = 0
       and v_item.packet_draft_hash = p_draft_hash
       and v_item.packet_draft_snapshot = p_draft_snapshot then
      return query select v_item.packet_verification_status, v_item.packet_verification_reason,
        v_item.packet_verification_revision, v_item.packet_verification_hash,
        v_item.packet_verification_snapshot, v_item.packet_draft_hash,
        v_item.packet_draft_snapshot, v_item.packet_verification_invalidated_at,
        v_item.packet_checkout_verification_hash, false;
    end if;
    return;
  end if;

  v_claimed_at := coalesce(v_pending.claimed_at, now());
  update public.consumer_pending_screening_results p
     set claimed_user_id = p_consumer_auth_user_id,
         claimed_at = v_claimed_at,
         updated_at = coalesce(p.updated_at, now())
   where p.pending_id = p_pending_id;

  perform set_config('legalease.packet_cas_authority', 'initialize', true);
  update public.consumer_briefcase_items b
     set packet_verification_revision = 0,
         packet_draft_hash = p_draft_hash,
         packet_draft_snapshot = p_draft_snapshot,
         packet_verification_status = 'unverified',
         packet_verification_reason = 'final_verification_not_completed',
         packet_verification_hash = null,
         packet_verification_snapshot = null,
         packet_verification_invalidated_at = null,
         packet_checkout_verification_hash = null
   where b.id = p_briefcase_item_id;
  perform set_config('legalease.packet_cas_authority', '', true);

  return query
  select b.packet_verification_status, b.packet_verification_reason,
         b.packet_verification_revision, b.packet_verification_hash,
         b.packet_verification_snapshot, b.packet_draft_hash,
         b.packet_draft_snapshot, b.packet_verification_invalidated_at,
         b.packet_checkout_verification_hash, true
    from public.consumer_briefcase_items b where b.id = p_briefcase_item_id;
end;
$$;

create or replace function public.persist_consumer_packet_verification(
  p_consumer_auth_user_id uuid,
  p_briefcase_item_id uuid,
  p_expected_prior_hash text,
  p_expected_prior_revision bigint,
  p_answer_delta jsonb,
  p_packet_information_metadata jsonb,
  p_next_draft_hash text,
  p_next_draft_snapshot jsonb,
  p_next_verification_status text,
  p_next_verification_reason text,
  p_next_verification_hash text,
  p_next_verification_snapshot jsonb,
  p_next_verification_invalidated_at timestamptz
)
returns table(
  status text, reason text, revision bigint, hash text, snapshot jsonb,
  draft_hash text, draft_snapshot jsonb, invalidated_at timestamptz,
  checkout_verification_hash text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.consumer_briefcase_items%rowtype;
  v_expected_current_hash text;
  v_changed boolean;
  v_flow jsonb;
  v_packet_information jsonb;
  v_verification_mirror jsonb;
begin
  if p_expected_prior_revision is null or p_expected_prior_revision < 0
     or jsonb_typeof(coalesce(p_answer_delta, '{}'::jsonb)) <> 'object'
     or jsonb_typeof(coalesce(p_packet_information_metadata, '{}'::jsonb)) <> 'object'
     or p_next_draft_hash !~ '^[0-9a-f]{64}$'
     or jsonb_typeof(p_next_draft_snapshot) is distinct from 'object'
     or p_next_draft_snapshot->>'schemaVersion' <> 'expungement-ai/protected-packet-draft/v1'
     or public.consumer_packet_json_sha256(p_next_draft_snapshot) is distinct from p_next_draft_hash
     or p_next_verification_status not in ('unverified', 'verified', 'invalidated')
     or nullif(trim(coalesce(p_next_verification_reason, '')), '') is null then
    return;
  end if;
  if p_expected_prior_hash is not null and p_expected_prior_hash !~ '^[0-9a-f]{64}$' then return; end if;
  if p_next_verification_status = 'verified' then
    if p_next_verification_hash !~ '^[0-9a-f]{64}$'
       or jsonb_typeof(p_next_verification_snapshot) is distinct from 'object'
       or p_next_verification_snapshot->>'schemaVersion' <> 'expungement-ai/final-verification/v1'
       or public.consumer_packet_json_sha256(p_next_verification_snapshot) is distinct from p_next_verification_hash
       or p_next_verification_invalidated_at is not null then return; end if;
  elsif p_next_verification_hash is not null or p_next_verification_snapshot is not null then
    return;
  end if;

  select * into v_item from public.consumer_briefcase_items b
   where b.id = p_briefcase_item_id for update;
  if not found or v_item.user_id is distinct from p_consumer_auth_user_id
     or v_item.packet_verification_status is null then return; end if;
  v_expected_current_hash := case when v_item.packet_verification_status = 'verified'
    then v_item.packet_verification_hash else null end;
  if v_item.packet_verification_revision is distinct from p_expected_prior_revision
     or v_expected_current_hash is distinct from p_expected_prior_hash then return; end if;

  v_changed := v_item.packet_draft_hash is distinct from p_next_draft_hash
    or v_item.packet_draft_snapshot is distinct from p_next_draft_snapshot
    or v_item.packet_verification_status is distinct from p_next_verification_status
    or v_item.packet_verification_reason is distinct from p_next_verification_reason
    or v_item.packet_verification_hash is distinct from p_next_verification_hash
    or v_item.packet_verification_snapshot is distinct from p_next_verification_snapshot
    or v_item.packet_verification_invalidated_at is distinct from p_next_verification_invalidated_at;

  v_packet_information := coalesce(p_packet_information_metadata, '{}'::jsonb)
    || jsonb_build_object('answers', coalesce(p_next_draft_snapshot->'packetAnswers', '{}'::jsonb));
  v_verification_mirror := jsonb_build_object(
    'status', p_next_verification_status,
    'reason', p_next_verification_reason,
    'revision', case when v_changed then v_item.packet_verification_revision + 1 else v_item.packet_verification_revision end,
    'draftHash', p_next_draft_hash,
    'draftSnapshot', p_next_draft_snapshot
  ) || case when p_next_verification_hash is not null then jsonb_build_object(
    'hash', p_next_verification_hash, 'snapshot', p_next_verification_snapshot
  ) else '{}'::jsonb end
    || case when p_next_verification_invalidated_at is not null then
      jsonb_build_object('invalidatedAt', p_next_verification_invalidated_at) else '{}'::jsonb end;
  v_flow := coalesce(v_item.artifact_refs_json->'commercialFlow', '{}'::jsonb)
    || jsonb_build_object('packetInformation', v_packet_information, 'verification', v_verification_mirror);

  perform set_config('legalease.packet_cas_authority', 'persist', true);
  update public.consumer_briefcase_items b
     set packet_verification_revision = case when v_changed then b.packet_verification_revision + 1 else b.packet_verification_revision end,
         packet_draft_hash = p_next_draft_hash,
         packet_draft_snapshot = p_next_draft_snapshot,
         packet_verification_status = p_next_verification_status,
         packet_verification_reason = p_next_verification_reason,
         packet_verification_hash = p_next_verification_hash,
         packet_verification_snapshot = p_next_verification_snapshot,
         packet_verification_invalidated_at = p_next_verification_invalidated_at,
         packet_checkout_verification_hash = case when v_changed then null else b.packet_checkout_verification_hash end,
         artifact_refs_json = coalesce(b.artifact_refs_json, '{}'::jsonb)
           || jsonb_build_object('commercialFlow', v_flow),
         updated_at = case when v_changed then now() else b.updated_at end
   where b.id = p_briefcase_item_id;
  perform set_config('legalease.packet_cas_authority', '', true);

  return query select b.packet_verification_status, b.packet_verification_reason,
    b.packet_verification_revision, b.packet_verification_hash,
    b.packet_verification_snapshot, b.packet_draft_hash,
    b.packet_draft_snapshot, b.packet_verification_invalidated_at,
    b.packet_checkout_verification_hash
  from public.consumer_briefcase_items b where b.id = p_briefcase_item_id;
end;
$$;

create or replace function public.get_consumer_packet_artifact_authority(
  p_consumer_auth_user_id uuid,
  p_briefcase_item_id uuid
)
returns table(
  status text, revision bigint, verification_hash text,
  entitlement_source text, artifact jsonb,
  consumer_auth_user_id uuid, briefcase_item_id uuid, matter_id uuid
)
language sql
stable
security definer
set search_path = ''
as $$
  select case when b.packet_artifact_json is not null
              then 'ready'::text else 'absent'::text end,
         b.packet_artifact_revision,
         b.packet_artifact_verification_hash,
         b.packet_artifact_entitlement_source,
         b.packet_artifact_json,
         b.user_id, b.id, b.payment_matter_id
    from public.consumer_briefcase_items b
   where b.id = p_briefcase_item_id and b.user_id = p_consumer_auth_user_id;
$$;

create or replace function public.get_consumer_briefcase_presentation_source(
  p_consumer_auth_user_id uuid,
  p_briefcase_item_id uuid
)
returns table(
  consumer_auth_user_id uuid, briefcase_item_id uuid, claimed_user_id uuid,
  claimed_at text, source_identity text, product text,
  partner_benefit_active boolean, partner_slug text,
  jurisdiction text, profile_version text, matter_id text,
  screening_answers jsonb, screening_answers_sha256 text, source_linkage_sha256 text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_count integer;
  v_item public.consumer_briefcase_items%rowtype;
  v_pending public.consumer_pending_screening_results%rowtype;
  v_partner_slug text;
  v_partner_active boolean := false;
  v_claimed_at_text text;
  v_answers_hash text;
  v_linkage jsonb;
begin
  select * into v_item from public.consumer_briefcase_items b
   where b.id = p_briefcase_item_id and b.user_id = p_consumer_auth_user_id;
  if not found or v_item.source_session_id is null then return; end if;

  select count(*)::integer into v_count
    from public.consumer_pending_screening_results p
   where p.claimed_user_id is not null and p.claimed_at is not null
     and (
       (p.product = 'expungement_ai_dtc' and p.pending_id::text = v_item.source_session_id)
       or
       (p.product = 'rcap_partner' and p.source_session_id::text = v_item.source_session_id)
     );
  if v_count <> 1 then return; end if;

  select * into v_pending
    from public.consumer_pending_screening_results p
   where p.claimed_user_id = p_consumer_auth_user_id
     and p.claimed_at is not null
     and (
       (p.product = 'expungement_ai_dtc' and p.pending_id::text = v_item.source_session_id)
       or
       (p.product = 'rcap_partner' and p.source_session_id::text = v_item.source_session_id)
     );
  if v_pending.jurisdiction is distinct from v_item.jurisdiction
     or v_pending.profile_version is null or v_pending.matter_id is null then return; end if;

  if v_pending.product = 'rcap_partner' then
    select s.partner_slug,
           s.flow_mode = 'rcap' and s.partner_benefit_active is true
             and nullif(trim(coalesce(s.partner_slug, '')), '') is not null
      into v_partner_slug, v_partner_active
      from public.screening_sessions s where s.session_id = v_pending.source_session_id;
    if not coalesce(v_partner_active, false) then return; end if;
  elsif v_pending.product <> 'expungement_ai_dtc' then
    return;
  end if;

  v_claimed_at_text := to_char(v_pending.claimed_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"');
  v_answers_hash := public.consumer_packet_json_sha256(v_pending.screening_answers);
  v_linkage := jsonb_build_object(
    'consumerAuthUserId', p_consumer_auth_user_id::text,
    'briefcaseItemId', p_briefcase_item_id::text,
    'matterId', v_pending.matter_id,
    'sourceIdentity', case when v_pending.product = 'rcap_partner'
      then v_pending.source_session_id::text else v_pending.pending_id::text end,
    'claimedAt', v_claimed_at_text,
    'screeningAnswersSha256', v_answers_hash,
    'product', v_pending.product,
    'partnerBenefitActive', v_pending.product = 'rcap_partner',
    'partnerSlug', case when v_pending.product = 'rcap_partner' then v_partner_slug else null end
  );

  return query select p_consumer_auth_user_id, p_briefcase_item_id,
    v_pending.claimed_user_id, v_claimed_at_text,
    case when v_pending.product = 'rcap_partner' then v_pending.source_session_id::text else v_pending.pending_id::text end,
    v_pending.product, v_pending.product = 'rcap_partner',
    case when v_pending.product = 'rcap_partner' then v_partner_slug else null end,
    v_pending.jurisdiction, v_pending.profile_version, v_pending.matter_id,
    v_pending.screening_answers, v_answers_hash,
    public.consumer_packet_json_sha256(v_linkage);
end;
$$;

create or replace function public.bind_consumer_checkout_verification(
  p_consumer_auth_user_id uuid,
  p_briefcase_item_id uuid,
  p_checkout_session_id text,
  p_payment_provider text,
  p_product_id text,
  p_person_id uuid,
  p_matter_id uuid,
  p_expected_verification_hash text
)
returns table(ok boolean, reason text, briefcase_item_id uuid, checkout_session_id text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.consumer_briefcase_items%rowtype;
  v_expected_match_key text;
  v_fresh_binding boolean;
  v_same_binding boolean;
begin
  if p_expected_verification_hash !~ '^[0-9a-f]{64}$'
     or nullif(trim(coalesce(p_checkout_session_id, '')), '') is null
     or p_payment_provider not in ('stripe', 'dry_run')
     or p_product_id is distinct from 'expungement_packet'
     or p_person_id is null or p_matter_id is null then
    return query select false, 'invalid_checkout_binding'::text, p_briefcase_item_id, null::text; return;
  end if;
  select * into v_item from public.consumer_briefcase_items b
   where b.id = p_briefcase_item_id for update;
  if not found then return query select false, 'item_not_found'::text, p_briefcase_item_id, null::text; return; end if;
  if v_item.user_id is distinct from p_consumer_auth_user_id then
    return query select false, 'owner_mismatch'::text, p_briefcase_item_id, null::text; return;
  end if;
  if v_item.packet_verification_status <> 'verified'
     or v_item.packet_verification_hash is distinct from p_expected_verification_hash then
    return query select false, 'verification_mismatch'::text, p_briefcase_item_id, null::text; return;
  end if;
  if p_matter_id is distinct from public.consumer_matter_id_for_briefcase_item(p_briefcase_item_id) then
    return query select false, 'matter_binding_mismatch'::text, p_briefcase_item_id, null::text; return;
  end if;
  v_expected_match_key := 'consumer:' || encode(
    extensions.digest(convert_to('rcap:consumer-person:v1:' || p_consumer_auth_user_id::text, 'utf8'), 'sha256'),
    'hex'
  );
  if not exists (
    select 1 from public.rcap_persons p
     where p.id = p_person_id
       and p.partner_slug = 'expungement-ai-consumer'
       and p.match_key = v_expected_match_key
  ) then
    return query select false, 'matter_binding_mismatch'::text, p_briefcase_item_id, null::text; return;
  end if;
  v_fresh_binding := v_item.payment_person_id is null
    and v_item.payment_matter_id is null
    and v_item.payment_product_id is null;
  v_same_binding := v_item.payment_person_id is not distinct from p_person_id
    and v_item.payment_matter_id is not distinct from p_matter_id
    and v_item.payment_product_id is not distinct from p_product_id;
  if not v_fresh_binding and not v_same_binding then
    return query select false, 'matter_binding_mismatch'::text, p_briefcase_item_id, null::text; return;
  end if;
  if v_item.checkout_session_id = p_checkout_session_id
     and v_item.payment_provider = p_payment_provider
     and v_same_binding
     and v_item.packet_checkout_verification_hash = p_expected_verification_hash then
    return query select true, 'already_bound'::text, v_item.id, v_item.checkout_session_id; return;
  end if;
  if v_item.payment_status = 'paid' or v_item.packet_checkout_verification_hash is not null then
    return query select false, 'checkout_binding_conflict'::text, p_briefcase_item_id, v_item.checkout_session_id; return;
  end if;
  perform set_config('legalease.packet_cas_authority', 'checkout', true);
  update public.consumer_briefcase_items b
     set checkout_session_id = p_checkout_session_id,
         payment_provider = p_payment_provider,
         payment_product_id = p_product_id,
         payment_person_id = p_person_id,
         payment_matter_id = p_matter_id,
         packet_checkout_verification_hash = p_expected_verification_hash,
         updated_at = now()
   where b.id = p_briefcase_item_id;
  perform set_config('legalease.packet_cas_authority', '', true);
  return query select true, 'bound'::text, p_briefcase_item_id, p_checkout_session_id;
end;
$$;

-- Preserve Phase 55's implementation as a private implementation detail, then
-- replace its public signature with the expected-hash form. A service-role
-- caller cannot execute the old bypass signature after this migration.
do $rename_phase55_payment_writer$
begin
  if to_regprocedure('public.record_consumer_packet_payment(uuid,text,integer,text,text,text,text,text,text,text,text,text,uuid,uuid)') is not null
     and to_regprocedure('public.record_consumer_packet_payment_phase55(uuid,text,integer,text,text,text,text,text,text,text,text,text,uuid,uuid)') is null then
    alter function public.record_consumer_packet_payment(
      uuid,text,integer,text,text,text,text,text,text,text,text,text,uuid,uuid
    ) rename to record_consumer_packet_payment_phase55;
  end if;
end
$rename_phase55_payment_writer$;

revoke all on function public.record_consumer_packet_payment_phase55(
  uuid,text,integer,text,text,text,text,text,text,text,text,text,uuid,uuid
) from public, anon, authenticated, service_role;

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
  p_recorded_by text,
  p_product_id text,
  p_person_id uuid,
  p_matter_id uuid,
  p_expected_verification_hash text
)
returns table(outcome text, briefcase_item_id uuid, provider_event_id text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.consumer_briefcase_items%rowtype;
  v_result record;
begin
  select * into v_item from public.consumer_briefcase_items b
   where b.id = p_briefcase_item_id for update;
  if not found then return query select 'item_not_found'::text, p_briefcase_item_id, null::text; return; end if;
  if p_expected_verification_hash !~ '^[0-9a-f]{64}$'
     or v_item.packet_verification_status <> 'verified'
     or v_item.packet_verification_hash is distinct from p_expected_verification_hash
     or v_item.packet_checkout_verification_hash is distinct from p_expected_verification_hash
     or v_item.checkout_session_id is distinct from p_checkout_session_id
     or v_item.payment_product_id is distinct from p_product_id
     or v_item.payment_person_id is distinct from p_person_id
     or v_item.payment_matter_id is distinct from p_matter_id then
    return query select 'verification_required'::text, p_briefcase_item_id, null::text; return;
  end if;
  if v_item.payment_status = 'paid' then
    if v_item.packet_payment_verification_hash is distinct from p_expected_verification_hash then
      return query select 'payment_conflict'::text, p_briefcase_item_id, v_item.provider_event_id; return;
    end if;
    return query select 'already_paid'::text, p_briefcase_item_id, v_item.provider_event_id; return;
  end if;

  perform set_config('legalease.packet_cas_authority', 'payment', true);
  select * into v_result from public.record_consumer_packet_payment_phase55(
    p_briefcase_item_id,p_payment_status,p_amount_cents,p_currency,p_payment_provider,
    p_provider_event_id,p_checkout_session_id,p_payment_intent_id,p_receipt_url,
    p_authority,p_recorded_by,p_product_id,p_person_id,p_matter_id
  );
  if v_result.outcome = 'recorded_paid' then
    update public.consumer_briefcase_items b
       set packet_payment_verification_hash = p_expected_verification_hash
     where b.id = p_briefcase_item_id;
  end if;
  perform set_config('legalease.packet_cas_authority', '', true);
  return query select v_result.outcome::text, v_result.briefcase_item_id::uuid, v_result.provider_event_id::text;
end;
$$;

create or replace function public.attach_consumer_packet_artifact_if_verified(
  p_consumer_auth_user_id uuid,
  p_briefcase_item_id uuid,
  p_expected_verification_hash text,
  p_entitlement_source text,
  p_artifact jsonb
)
returns table(status text, revision bigint, verification_hash text, entitlement_source text, artifact jsonb)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.consumer_briefcase_items%rowtype;
  v_payment_valid boolean := false;
begin
  if p_expected_verification_hash !~ '^[0-9a-f]{64}$'
     or p_entitlement_source <> 'consumer_payment'
     or jsonb_typeof(p_artifact) is distinct from 'object' then return; end if;
  select * into v_item from public.consumer_briefcase_items b
   where b.id = p_briefcase_item_id for update;
  if not found or v_item.user_id is distinct from p_consumer_auth_user_id
     or v_item.packet_verification_status <> 'verified'
     or v_item.packet_verification_hash is distinct from p_expected_verification_hash then return; end if;

  v_payment_valid := v_item.payment_status = 'paid'
    and v_item.packet_payment_verification_hash = p_expected_verification_hash;
  if not v_payment_valid then return; end if;

  if v_item.packet_artifact_json is not null then
    if v_item.packet_artifact_verification_hash = p_expected_verification_hash
       and v_item.packet_artifact_entitlement_source = p_entitlement_source
       and v_item.packet_artifact_json = p_artifact then
      return query select 'ready'::text, v_item.packet_artifact_revision,
        v_item.packet_artifact_verification_hash, v_item.packet_artifact_entitlement_source,
        v_item.packet_artifact_json;
    end if;
    return;
  end if;

  update public.consumer_briefcase_items b
     set packet_artifact_json = p_artifact,
         packet_artifact_verification_hash = p_expected_verification_hash,
         packet_artifact_entitlement_source = p_entitlement_source,
         packet_artifact_revision = b.packet_artifact_revision + 1,
         artifact_refs_json = coalesce(b.artifact_refs_json, '{}'::jsonb) || p_artifact,
         packet_status = 'ready', updated_at = now()
   where b.id = p_briefcase_item_id;
  return query select 'ready'::text, b.packet_artifact_revision,
    b.packet_artifact_verification_hash, b.packet_artifact_entitlement_source,
    b.packet_artifact_json
  from public.consumer_briefcase_items b where b.id = p_briefcase_item_id;
end;
$$;

do $rename_phase53_enqueue$
begin
  if to_regprocedure('public.enqueue_packet_render_job(uuid,text,text,text,text,text,text,text,uuid,uuid,uuid,uuid,integer,uuid,uuid)') is not null
     and to_regprocedure('public.enqueue_packet_render_job_phase53(uuid,text,text,text,text,text,text,text,uuid,uuid,uuid,uuid,integer,uuid,uuid)') is null then
    alter function public.enqueue_packet_render_job(
      uuid,text,text,text,text,text,text,text,uuid,uuid,uuid,uuid,integer,uuid,uuid
    ) rename to enqueue_packet_render_job_phase53;
  end if;
end
$rename_phase53_enqueue$;

revoke all on function public.enqueue_packet_render_job_phase53(
  uuid,text,text,text,text,text,text,text,uuid,uuid,uuid,uuid,integer,uuid,uuid
) from public, anon, authenticated, service_role;

create or replace function public.enqueue_packet_render_job(
  p_packet_id uuid,p_route_id text,p_renderer_kind text,p_renderer_version text,
  p_source_sha256 text,p_profile_id text,p_profile_version text,p_input_hash text,
  p_briefcase_item_id uuid,p_partner_id uuid,p_person_id uuid,p_matter_id uuid,
  p_max_attempts integer,p_consumer_briefcase_item_id uuid,p_expected_consumer_auth_user_id uuid
)
returns setof public.packet_render_jobs
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_partner_id is null
     or p_consumer_briefcase_item_id is not null
     or p_expected_consumer_auth_user_id is not null then
    raise exception 'packet_render_jobs: consumer jobs require enqueue_verified_consumer_packet_render';
  end if;
  return query select * from public.enqueue_packet_render_job_phase53(
    p_packet_id,p_route_id,p_renderer_kind,p_renderer_version,p_source_sha256,
    p_profile_id,p_profile_version,p_input_hash,p_briefcase_item_id,p_partner_id,
    p_person_id,p_matter_id,p_max_attempts,null,null
  );
end;
$$;

revoke all on function public.enqueue_packet_render_job(
  uuid,text,text,text,text,text,text,text,uuid,uuid,uuid,uuid,integer,uuid,uuid
) from public, anon, authenticated, service_role;

create or replace function public.enqueue_verified_consumer_packet_render(
  p_packet_id uuid,
  p_route_id text,
  p_renderer_kind text,
  p_renderer_version text,
  p_source_sha256 text,
  p_profile_id text,
  p_profile_version text,
  p_input_hash text,
  p_briefcase_item_id uuid,
  p_person_id uuid,
  p_matter_id uuid,
  p_max_attempts integer,
  p_consumer_briefcase_item_id uuid,
  p_expected_consumer_auth_user_id uuid,
  p_expected_verification_hash text,
  p_render_packet jsonb,
  p_render_input_payload jsonb
)
returns setof public.packet_render_jobs
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.consumer_briefcase_items%rowtype;
  v_existing public.packet_render_jobs%rowtype;
  v_enqueued public.packet_render_jobs%rowtype;
begin
  if p_packet_id is null or p_input_hash !~ '^[0-9a-f]{64}$'
     or p_expected_verification_hash !~ '^[0-9a-f]{64}$'
     or jsonb_typeof(p_render_packet) is distinct from 'object'
     or jsonb_typeof(p_render_input_payload) is distinct from 'object' then return; end if;
  if p_briefcase_item_id is distinct from p_consumer_briefcase_item_id then return; end if;

  select * into v_item from public.consumer_briefcase_items b
   where b.id = p_consumer_briefcase_item_id for update;
  if not found or v_item.user_id is distinct from p_expected_consumer_auth_user_id
     or v_item.packet_verification_status <> 'verified'
     or v_item.packet_verification_hash is distinct from p_expected_verification_hash
     or v_item.payment_status <> 'paid'
     or v_item.packet_payment_verification_hash is distinct from p_expected_verification_hash
     or v_item.payment_person_id is distinct from p_person_id
     or v_item.payment_matter_id is distinct from p_matter_id then return; end if;

  select * into v_existing from public.packet_render_jobs j
   where j.packet_id = p_packet_id and j.input_hash = p_input_hash and j.status <> 'failed'
   order by j.created_at limit 1 for update;
  if found then
    if v_existing.route_id = trim(p_route_id)
       and v_existing.renderer_kind = p_renderer_kind
       and v_existing.renderer_version = p_renderer_version
       and v_existing.source_sha256 is not distinct from p_source_sha256
       and v_existing.profile_id = p_profile_id
       and v_existing.profile_version = p_profile_version
       and v_existing.consumer_briefcase_item_id = p_consumer_briefcase_item_id
       and v_existing.consumer_auth_user_id = p_expected_consumer_auth_user_id
       and v_existing.person_id = p_person_id and v_existing.matter_id = p_matter_id
       and v_existing.consumer_verification_hash = p_expected_verification_hash
       and v_existing.render_packet_json = p_render_packet
       and v_existing.render_input_payload_json = p_render_input_payload then
      return next v_existing;
    end if;
    return;
  end if;

  select * into v_enqueued from public.enqueue_packet_render_job_phase53(
    p_packet_id,p_route_id,p_renderer_kind,p_renderer_version,p_source_sha256,
    p_profile_id,p_profile_version,p_input_hash,p_briefcase_item_id,null,
    p_person_id,p_matter_id,p_max_attempts,p_consumer_briefcase_item_id,
    p_expected_consumer_auth_user_id
  );
  if v_enqueued.id is null then return; end if;
  update public.packet_render_jobs j
     set consumer_verification_hash = p_expected_verification_hash,
         render_packet_json = p_render_packet,
         render_input_payload_json = p_render_input_payload
   where j.id = v_enqueued.id
   returning * into v_enqueued;
  return next v_enqueued;
end;
$$;

create or replace function public.finalize_sponsored_packet_generation_if_verified(
  p_session_id uuid,
  p_briefcase_item_id uuid,
  p_expected_verification_hash text,
  p_packet_artifact jsonb
)
returns table(ok boolean, recorded boolean, counted_as text, reason text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_item public.consumer_briefcase_items%rowtype;
  v_accounting record;
begin
  if p_session_id is null or p_expected_verification_hash !~ '^[0-9a-f]{64}$'
     or jsonb_typeof(p_packet_artifact) is distinct from 'object' then
    return query select false,false,'not_counted'::text,'invalid_input'::text; return;
  end if;
  select * into v_item from public.consumer_briefcase_items b
   where b.id = p_briefcase_item_id for update;
  if not found or v_item.source_session_id is distinct from p_session_id::text
     or v_item.packet_verification_status <> 'verified'
     or v_item.packet_verification_hash is distinct from p_expected_verification_hash
     or not exists(
       select 1 from public.screening_sessions s where s.session_id = p_session_id
        and s.flow_mode = 'rcap' and s.partner_benefit_active is true
        and nullif(trim(coalesce(s.partner_slug, '')), '') is not null
     ) then
    return query select false,false,'not_counted'::text,'verification_or_source_mismatch'::text; return;
  end if;
  if v_item.packet_artifact_json is not null then
    if v_item.packet_artifact_verification_hash = p_expected_verification_hash
       and v_item.packet_artifact_entitlement_source = 'partner_sponsorship'
       and v_item.packet_artifact_json = p_packet_artifact then
      return query select true,false,coalesce(v_item.packet_artifact_accounting_result,'not_counted'),
        'already_finalized'::text;
    else
      return query select false,false,'not_counted'::text,'artifact_conflict'::text;
    end if;
    return;
  end if;

  select * into v_accounting from public.record_partner_packet_generation(p_session_id);
  if not coalesce(v_accounting.recorded, false) then
    return query select false,false,coalesce(v_accounting.counted_as,'not_counted'),
      coalesce(v_accounting.reason,'sponsored_credit_refused'); return;
  end if;
  update public.consumer_briefcase_items b
     set packet_artifact_json = p_packet_artifact,
         packet_artifact_verification_hash = p_expected_verification_hash,
         packet_artifact_entitlement_source = 'partner_sponsorship',
         packet_artifact_accounting_result = v_accounting.counted_as,
         packet_artifact_revision = b.packet_artifact_revision + 1,
         artifact_refs_json = coalesce(b.artifact_refs_json, '{}'::jsonb) || p_packet_artifact,
         packet_status = 'ready', updated_at = now()
   where b.id = p_briefcase_item_id;
  return query select true,true,v_accounting.counted_as::text,null::text;
end;
$$;

-- Protected columns are never writable by a browser-reachable role. Ordinary
-- display/progress columns remain governed by the existing Phase 52 grants;
-- none of them is consulted as verification, payment, or artifact authority.
do $refresh_consumer_column_grants$
declare
  v_blocked text[] := array[
    'id','user_id','created_at',
    'payment_status','amount_cents','currency','payment_provider','checkout_session_id',
    'payment_intent_id','receipt_url','provider_event_id','payment_authority',
    'payment_recorded_at','payment_recorded_by','payment_product_id','payment_person_id',
    'payment_matter_id','payment_allowed','item_type','jurisdiction','pathway_label',
    'result_code','packet_type','source_session_id',
    'packet_verification_revision','packet_draft_hash','packet_draft_snapshot',
    'packet_verification_status','packet_verification_reason','packet_verification_hash',
    'packet_verification_snapshot','packet_verification_invalidated_at',
    'packet_checkout_verification_hash','packet_payment_verification_hash',
    'packet_artifact_json','packet_artifact_verification_hash',
    'packet_artifact_entitlement_source','packet_artifact_accounting_result',
    'packet_artifact_revision'
  ];
  v_safe text;
begin
  select string_agg(quote_ident(c.column_name), ', ' order by c.ordinal_position)
    into v_safe from information_schema.columns c
   where c.table_schema='public' and c.table_name='consumer_briefcase_items'
     and c.column_name <> all(v_blocked);
  revoke insert, update on public.consumer_briefcase_items from public;
  if exists(select 1 from pg_roles where rolname='anon') then
    revoke insert, update on public.consumer_briefcase_items from anon;
  end if;
  if exists(select 1 from pg_roles where rolname='authenticated') then
    revoke insert, update on public.consumer_briefcase_items from authenticated;
    if v_safe is not null then
      execute format('grant insert (%s), update (%s) on public.consumer_briefcase_items to authenticated', v_safe, v_safe);
    end if;
  end if;
end
$refresh_consumer_column_grants$;

revoke truncate on public.consumer_briefcase_items from public, anon, authenticated;

revoke insert (
  id,user_id,created_at,
  payment_status,amount_cents,currency,payment_provider,checkout_session_id,
  payment_intent_id,receipt_url,provider_event_id,payment_authority,
  payment_recorded_at,payment_recorded_by,payment_product_id,payment_person_id,
  payment_matter_id,payment_allowed,item_type,jurisdiction,pathway_label,
  result_code,packet_type,source_session_id,
  packet_verification_revision,packet_draft_hash,packet_draft_snapshot,
  packet_verification_status,packet_verification_reason,packet_verification_hash,
  packet_verification_snapshot,packet_verification_invalidated_at,
  packet_checkout_verification_hash,packet_payment_verification_hash,
  packet_artifact_json,packet_artifact_verification_hash,
  packet_artifact_entitlement_source,packet_artifact_accounting_result,
  packet_artifact_revision
), update (
  id,user_id,created_at,
  payment_status,amount_cents,currency,payment_provider,checkout_session_id,
  payment_intent_id,receipt_url,provider_event_id,payment_authority,
  payment_recorded_at,payment_recorded_by,payment_product_id,payment_person_id,
  payment_matter_id,payment_allowed,item_type,jurisdiction,pathway_label,
  result_code,packet_type,source_session_id,
  packet_verification_revision,packet_draft_hash,packet_draft_snapshot,
  packet_verification_status,packet_verification_reason,packet_verification_hash,
  packet_verification_snapshot,packet_verification_invalidated_at,
  packet_checkout_verification_hash,packet_payment_verification_hash,
  packet_artifact_json,packet_artifact_verification_hash,
  packet_artifact_entitlement_source,packet_artifact_accounting_result,
  packet_artifact_revision
) on public.consumer_briefcase_items from public, anon, authenticated;

revoke all on function public.consumer_packet_canonical_json(jsonb) from public, anon, authenticated;
revoke all on function public.consumer_packet_json_sha256(jsonb) from public, anon, authenticated;
revoke all on function public.get_consumer_packet_verification_authority(uuid,uuid) from public, anon, authenticated;
revoke all on function public.initialize_consumer_packet_verification(uuid,uuid,uuid,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.persist_consumer_packet_verification(uuid,uuid,text,bigint,jsonb,jsonb,text,jsonb,text,text,text,jsonb,timestamptz) from public, anon, authenticated;
revoke all on function public.get_consumer_packet_artifact_authority(uuid,uuid) from public, anon, authenticated;
revoke all on function public.get_consumer_briefcase_presentation_source(uuid,uuid) from public, anon, authenticated;
revoke all on function public.bind_consumer_checkout_verification(uuid,uuid,text,text,text,uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.record_consumer_packet_payment(uuid,text,integer,text,text,text,text,text,text,text,text,text,uuid,uuid,text) from public, anon, authenticated;
revoke all on function public.attach_consumer_packet_artifact_if_verified(uuid,uuid,text,text,jsonb) from public, anon, authenticated;
revoke all on function public.enqueue_verified_consumer_packet_render(uuid,text,text,text,text,text,text,text,uuid,uuid,uuid,integer,uuid,uuid,text,jsonb,jsonb) from public, anon, authenticated;
revoke all on function public.finalize_sponsored_packet_generation_if_verified(uuid,uuid,text,jsonb) from public, anon, authenticated;
-- Credit accounting is now an internal implementation detail of the atomic
-- verified finalizer; service code cannot consume sponsorship by calling it
-- without the item/hash/artifact boundary.
revoke all on function public.record_partner_packet_generation(uuid,timestamptz) from public, anon, authenticated, service_role;

do $grant_protected_packet_rpcs$
begin
  if exists(select 1 from pg_roles where rolname='service_role') then
    grant execute on function public.enqueue_packet_render_job(uuid,text,text,text,text,text,text,text,uuid,uuid,uuid,uuid,integer,uuid,uuid) to service_role;
    grant execute on function public.get_consumer_packet_verification_authority(uuid,uuid) to service_role;
    grant execute on function public.initialize_consumer_packet_verification(uuid,uuid,uuid,text,text,jsonb) to service_role;
    grant execute on function public.persist_consumer_packet_verification(uuid,uuid,text,bigint,jsonb,jsonb,text,jsonb,text,text,text,jsonb,timestamptz) to service_role;
    grant execute on function public.get_consumer_packet_artifact_authority(uuid,uuid) to service_role;
    grant execute on function public.get_consumer_briefcase_presentation_source(uuid,uuid) to service_role;
    grant execute on function public.bind_consumer_checkout_verification(uuid,uuid,text,text,text,uuid,uuid,text) to service_role;
    grant execute on function public.record_consumer_packet_payment(uuid,text,integer,text,text,text,text,text,text,text,text,text,uuid,uuid,text) to service_role;
    grant execute on function public.attach_consumer_packet_artifact_if_verified(uuid,uuid,text,text,jsonb) to service_role;
    grant execute on function public.enqueue_verified_consumer_packet_render(uuid,text,text,text,text,text,text,text,uuid,uuid,uuid,integer,uuid,uuid,text,jsonb,jsonb) to service_role;
    grant execute on function public.finalize_sponsored_packet_generation_if_verified(uuid,uuid,text,jsonb) to service_role;
  end if;
end
$grant_protected_packet_rpcs$;

comment on column public.consumer_briefcase_items.packet_verification_hash is
  'Current protected final-verification CAS hash. Never derived from artifact_refs_json or another participant-writable display column.';
comment on column public.consumer_briefcase_items.packet_artifact_json is
  'Immutable protected packet artifact authority; artifact_refs_json remains only a display mirror.';
comment on function public.persist_consumer_packet_verification(uuid,uuid,text,bigint,jsonb,jsonb,text,jsonb,text,text,text,jsonb,timestamptz) is
  'Service-only expected-hash plus revision CAS for protected packet facts. Semantic no-ops preserve revision.';

commit;
