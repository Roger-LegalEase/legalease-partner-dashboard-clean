-- Forward correction of the already-applied 20260924111541 source.
-- No historical job, attempt, payment, receipt or route registration is removed.
-- Only the known live-input unique-index race is recoverable; other SQL errors
-- abort and remain observable at the actual RPC caller.
begin;

create or replace function public.requeue_retryable_packet_render_jobs()
returns integer language plpgsql security definer set search_path = '' as $$
declare
  v_key record;
  v_job public.packet_render_jobs%rowtype;
  v_winner uuid;
  v_live uuid;
  v_reason text;
  v_constraint text;
  v_sqlstate text;
  v_schema text;
  v_table text;
  v_count integer := 0;
begin
  perform set_config('rcap.packet_mutation_authority', 'requeue_retryable_packet_render_jobs', true);
  for v_key in
    select distinct packet_id, input_hash from public.packet_render_jobs
    where status = 'failed' and failure_disposition = 'retryable'
    order by packet_id, input_hash
  loop
    -- Housekeepers serialize by logical input, not the whole queue. A busy input
    -- does not block unrelated inputs. The unique index also arbitrates enqueue.
    if not pg_try_advisory_xact_lock(hashtextextended(v_key.packet_id::text || ':' || v_key.input_hash, 0)) then
      continue;
    end if;
    select id into v_live from public.packet_render_jobs
    where packet_id = v_key.packet_id and input_hash = v_key.input_hash and status <> 'failed';
    select id into v_winner from public.packet_render_jobs
    where packet_id = v_key.packet_id and input_hash = v_key.input_hash
      and status = 'failed' and failure_disposition = 'retryable' and attempt_count < max_attempts
      and next_attempt_at is not null and isfinite(next_attempt_at)
    order by created_at, id limit 1;

    for v_job in
      select * from public.packet_render_jobs
      where packet_id = v_key.packet_id and input_hash = v_key.input_hash
        and status = 'failed' and failure_disposition = 'retryable'
      order by created_at, id for update
    loop
      v_sqlstate := null;
      v_constraint := null;
      v_reason := case
        when v_job.attempt_count >= v_job.max_attempts then 'attempt_limit_reached'
        when v_live is not null then 'live_sibling_exists'
        when v_job.next_attempt_at is null or not isfinite(v_job.next_attempt_at) then 'canonical_retry_time_missing'
        when v_job.id is distinct from v_winner then 'duplicate_retry_superseded'
        else null end;
      if v_reason is null and v_job.next_attempt_at <= now() then
        begin
          update public.packet_render_jobs j
          set status = 'queued', failure_disposition = null,
              retry_reconciliation_history = j.retry_reconciliation_history || jsonb_build_array(jsonb_build_object(
                'authority', 'requeue_retryable_packet_render_jobs', 'at', now(), 'reason', 'canonical_retry_due',
                'prior_status', j.status, 'prior_failure_disposition', j.failure_disposition,
                'prior_error_code', j.error_code, 'attempt_count', j.attempt_count,
                'max_attempts', j.max_attempts, 'next_attempt_at', j.next_attempt_at,
                'claimed_by', j.claimed_by, 'claimed_at', j.claimed_at))
          where j.id = v_job.id;
          v_count := v_count + 1;
          v_live := v_job.id;
        exception when unique_violation then
          get stacked diagnostics v_constraint = constraint_name, v_sqlstate = returned_sqlstate,
            v_schema = schema_name, v_table = table_name;
          if v_sqlstate = '23505' and v_constraint = 'packet_render_jobs_input_hash_live_unique'
             and v_schema = 'public' and v_table = 'packet_render_jobs' then
            -- A concurrent enqueue won. Only this row's attempted requeue is
            -- rolled back; other logical inputs still make progress.
            select id into v_live from public.packet_render_jobs
            where packet_id = v_key.packet_id and input_hash = v_key.input_hash and status <> 'failed';
            if v_live is null then raise; end if;
            v_reason := 'concurrent_live_sibling_won';
          else
            -- A trigger or another relation's constraint is not this race.
            raise;
          end if;
        end;
      end if;
      if v_reason is not null then
        update public.packet_render_jobs j
        set failure_disposition = 'terminal', next_attempt_at = null,
            retry_reconciliation_history = j.retry_reconciliation_history || jsonb_build_array(jsonb_build_object(
              'authority', 'requeue_retryable_packet_render_jobs', 'at', now(), 'reason', v_reason,
              'canonical_job_id', coalesce(v_live, v_winner),
              'requeue_sqlstate', v_sqlstate, 'requeue_constraint', v_constraint,
              'prior_status', j.status, 'prior_failure_disposition', j.failure_disposition,
              'prior_error_code', j.error_code, 'attempt_count', j.attempt_count,
              'max_attempts', j.max_attempts, 'next_attempt_at', j.next_attempt_at,
                'claimed_by', j.claimed_by, 'claimed_at', j.claimed_at))
        where j.id = v_job.id;
      end if;
    end loop;
  end loop;
  perform set_config('rcap.packet_mutation_authority', '', true);
  return v_count;
end;
$$;

revoke all on function public.requeue_retryable_packet_render_jobs() from public, anon, authenticated, rcap_packet_delivery;
grant execute on function public.requeue_retryable_packet_render_jobs() to service_role, rcap_render_worker;

-- Source custody: exact objects from 20260906120000, with 20260906130000
-- successors for regeneration. No historical route/specification row is replayed.
do $owners$
begin
  if exists (select 1 from pg_proc where pronamespace='public'::regnamespace and proname='sponsored_packet_render_authority' and md5(prosrc) not in ('559161def2a072348d4d4774c9438d1a')) then raise exception 'unrecognized current authority: sponsored_packet_render_authority'; end if;
  if exists (select 1 from pg_proc where pronamespace='public'::regnamespace and proname='enqueue_verified_sponsored_packet_render' and md5(prosrc) not in ('c1c14c83021682f129135bc7eb7f9e5e')) then raise exception 'unrecognized current authority: enqueue_verified_sponsored_packet_render'; end if;
  if exists (select 1 from pg_proc where pronamespace='public'::regnamespace and proname='consumer_render_job_verification_guard' and md5(prosrc) not in ('36abd7b4a417350698b31204882a61c5','58c730eb7c7c6f4a152ad18d13b8539b')) then raise exception 'unrecognized current authority: consumer_render_job_verification_guard'; end if;
  if exists (select 1 from pg_proc where pronamespace='public'::regnamespace and proname='finalize_sponsored_packet_generation_for_route' and md5(prosrc) not in ('172f4d33a1b5dceebb8a465f033fbdfb','5f43717be0f0e59b8f34b6e6bc220a8b')) then raise exception 'unrecognized current authority: finalize_sponsored_packet_generation_for_route'; end if;
  if exists (select 1 from pg_proc where pronamespace='public'::regnamespace and proname='finalize_sponsored_packet_generation_if_verified' and md5(prosrc) not in ('b282f792a0c8cbed08f1b23afd443f0a','df2d28a04d3dd49bd01e2d2faad951c0')) then raise exception 'unrecognized current authority: finalize_sponsored_packet_generation_if_verified'; end if;
  if exists (select 1 from pg_proc where pronamespace='public'::regnamespace and proname='get_consumer_packet_artifact_authority' and md5(prosrc) not in ('284b61b11729c79a638850ee17a0d102','b13cd2b1e572c2cfd646120cb3abbe9b')) then raise exception 'unrecognized current authority: get_consumer_packet_artifact_authority'; end if;
  if exists (select 1 from pg_proc where pronamespace='public'::regnamespace and proname='consumer_packet_artifact_provenance_immutable' and md5(prosrc) not in ('195fbf25e9dedbbcfa232b7db4654dc3','d45fcdff2a6f874f5f54e1444d65b56e')) then raise exception 'unrecognized current authority: consumer_packet_artifact_provenance_immutable'; end if;
  if exists (select 1 from pg_proc where pronamespace='public'::regnamespace and proname='publish_validated_consumer_render_artifact' and md5(prosrc) not in ('e97cb1b63078e0a4013faf8a314b352f','ed59bd717ea5b193e3f791c9e94353e7')) then raise exception 'unrecognized current authority: publish_validated_consumer_render_artifact'; end if;
end;
$owners$;

create table if not exists public.sponsored_packet_render_routes (
  route_key text primary key,
  jurisdiction text not null
    check (jurisdiction = upper(jurisdiction) and length(jurisdiction) between 2 and 3),
  pathway_id text not null check (nullif(trim(pathway_id), '') is not null),
  registry_track_id text check (registry_track_id is null or nullif(trim(registry_track_id), '') is not null),
  packet_family_id text not null check (nullif(trim(packet_family_id), '') is not null),
  packet_specification_id text not null check (nullif(trim(packet_specification_id), '') is not null),
  packet_specification_version text not null check (nullif(trim(packet_specification_version), '') is not null),
  packet_specification_sha256 text not null check (packet_specification_sha256 ~ '^[a-f0-9]{64}$'),
  artifact_provider text not null check (nullif(trim(artifact_provider), '') is not null),
  artifact_source text not null check (nullif(trim(artifact_source), '') is not null),
  artifact_content_type text not null default 'application/pdf',
  partner_slug text not null check (nullif(trim(partner_slug), '') is not null),
  program_key text not null default 'record-clearing',
  clinic_event_name text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sponsored_packet_render_routes_key_shape
    check (route_key = jurisdiction || ':' || pathway_id)
);

alter table public.sponsored_packet_render_routes enable row level security;
revoke all on table public.sponsored_packet_render_routes from public, anon, authenticated;

do $registry_policy$
begin
  if exists (
    select 1 from pg_policy where polrelid = 'public.sponsored_packet_render_routes'::regclass
  ) then
    raise exception 'sponsored_packet_render_routes: a direct RLS policy is incompatible with protected authority';
  end if;
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    execute 'grant select on table public.sponsored_packet_render_routes to service_role';
  end if;
end
$registry_policy$;

comment on table public.sponsored_packet_render_routes is
  'Service-only registration of the exact routes whose sponsored render may reach the protected queue and finalizer. A row is scope, never commercial authority.';

alter table public.packet_render_jobs
  add column if not exists sponsored_route_key text
    references public.sponsored_packet_render_routes(route_key),
  add column if not exists sponsored_session_id uuid,
  add column if not exists sponsored_clinic_event_id uuid,
  add column if not exists sponsored_consumer_briefcase_item_id uuid,
  add column if not exists sponsored_consumer_auth_user_id uuid,
  add column if not exists sponsored_verification_hash text;

alter table public.packet_render_jobs
  drop constraint if exists packet_render_jobs_sponsored_verification_hash_check,
  add constraint packet_render_jobs_sponsored_verification_hash_check
    check (sponsored_verification_hash is null or sponsored_verification_hash ~ '^[a-f0-9]{64}$');

do $sponsored_grants$
declare
  v_role text;
begin
  foreach v_role in array array['anon', 'authenticated'] loop
    if exists (select 1 from pg_roles where rolname = v_role) then
      execute format(
        'revoke insert (sponsored_route_key, sponsored_session_id, sponsored_clinic_event_id,'
        || ' sponsored_consumer_briefcase_item_id, sponsored_consumer_auth_user_id,'
        || ' sponsored_verification_hash),'
        || ' update (sponsored_route_key, sponsored_session_id, sponsored_clinic_event_id,'
        || ' sponsored_consumer_briefcase_item_id, sponsored_consumer_auth_user_id,'
        || ' sponsored_verification_hash) on public.packet_render_jobs from %I', v_role);
    end if;
  end loop;
end
$sponsored_grants$;

create index if not exists packet_render_jobs_sponsored_participant_idx
  on public.packet_render_jobs (sponsored_consumer_briefcase_item_id, sponsored_consumer_auth_user_id)
  where sponsored_route_key is not null;

alter table public.consumer_packet_artifact_provenance
  add column if not exists superseded_artifacts jsonb not null default '[]'::jsonb
    check (jsonb_typeof(superseded_artifacts) = 'array');

create or replace function public.sponsored_packet_render_authority(
  p_route_key text,
  p_session_id uuid,
  p_briefcase_item_id uuid,
  p_consumer_auth_user_id uuid
)
returns table(
  valid boolean,
  reason text,
  partner_slug text,
  partner_id uuid,
  clinic_event_id uuid,
  clinic_case_id uuid
)
language plpgsql
stable
security definer
set search_path = ''
as $authority$
declare
  v_route public.sponsored_packet_render_routes%rowtype;
  v_item public.consumer_briefcase_items%rowtype;
  v_source public.consumer_pending_screening_results%rowtype;
  v_session public.screening_sessions%rowtype;
  v_case public.clinic_cases%rowtype;
  v_event public.clinic_events%rowtype;
  v_partner_id uuid;
begin
  if p_route_key is null or p_session_id is null
     or p_briefcase_item_id is null or p_consumer_auth_user_id is null then
    return query select false, 'invalid_input'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  select * into v_route from public.sponsored_packet_render_routes r
   where r.route_key = p_route_key and r.active;
  if not found then
    return query select false, 'route_not_registered'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  select * into v_item from public.consumer_briefcase_items i
   where i.id = p_briefcase_item_id and i.user_id = p_consumer_auth_user_id;
  if not found then
    return query select false, 'wrong_owner'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;
  if v_item.jurisdiction is distinct from v_route.jurisdiction then
    return query select false, 'wrong_jurisdiction_or_route'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  select * into v_source from public.consumer_pending_screening_results p
   where p.pending_id = v_item.source_pending_result_id;
  if not found or v_source.status <> 'CLAIMED'
     or v_source.claimed_matter_id is distinct from v_item.id
     or v_source.claimed_user_id is distinct from v_item.user_id then
    return query select false, 'wrong_item'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;
  if v_source.anonymous_session_id is distinct from p_session_id then
    return query select false, 'wrong_session'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;
  if v_source.product <> 'rcap_partner'
     or v_source.partner_slug is distinct from v_route.partner_slug then
    return query select false, 'wrong_partner'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;
  if v_source.jurisdiction is distinct from v_route.jurisdiction then
    return query select false, 'wrong_jurisdiction_or_route'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  select * into v_session from public.screening_sessions s where s.session_id = p_session_id;
  if not found or v_session.flow_mode <> 'rcap' or v_session.partner_benefit_active is not true then
    return query select false, 'sponsorship_inactive'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;
  if v_session.partner_slug is distinct from v_route.partner_slug then
    return query select false, 'wrong_partner'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;
  if v_session.jurisdiction is distinct from v_route.jurisdiction then
    return query select false, 'wrong_jurisdiction_or_route'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  select c.* into v_case from public.clinic_cases c
   where c.event_id = v_source.event_id
     and c.participant_user_id = v_item.user_id
     and c.screening_session_id = p_session_id
     and c.matter_id = v_item.id;
  if not found then
    return query select false, 'clinic_scope_mismatch'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;
  if v_case.jurisdiction is distinct from v_route.jurisdiction or v_case.route_disposition <> 'packet' then
    return query select false, 'wrong_jurisdiction_or_route'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  select * into v_event from public.clinic_events e where e.id = v_case.event_id;
  if not found
     or v_event.partner_slug is distinct from v_route.partner_slug
     or v_event.program_key is distinct from v_route.program_key
     or (v_route.clinic_event_name is not null and v_event.name is distinct from v_route.clinic_event_name) then
    return query select false, 'clinic_scope_mismatch'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;
  if v_event.jurisdiction is distinct from v_route.jurisdiction then
    return query select false, 'wrong_jurisdiction_or_route'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;
  if v_event.status <> 'published'
     or v_event.sponsorship_allocation is null or v_event.sponsorship_allocation <= 0 then
    return query select false, 'sponsorship_inactive'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  select pr.id into v_partner_id from public.partner_records pr
   where pr.partner_slug = v_route.partner_slug;
  if v_partner_id is null then
    return query select false, 'no_entitlement'::text, null::text, null::uuid, null::uuid, null::uuid;
    return;
  end if;

  return query select true, null::text, v_route.partner_slug, v_partner_id, v_event.id, v_case.id;
end;
$authority$;

create or replace function public.enqueue_verified_sponsored_packet_render(
  p_route_key text,
  p_session_id uuid,
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
  p_expected_consumer_auth_user_id uuid,
  p_expected_verification_hash text,
  p_render_packet jsonb,
  p_render_input_payload jsonb
)
returns setof public.packet_render_jobs
language plpgsql
security definer
set search_path = ''
as $enqueue$
declare
  v_route public.sponsored_packet_render_routes%rowtype;
  v_authority record;
  v_hash text;
  v_job public.packet_render_jobs%rowtype;
  v_existing_payload jsonb;
begin
  select * into v_route from public.sponsored_packet_render_routes r
   where r.route_key = p_route_key and r.active;
  if not found then
    raise exception 'sponsored render route is not registered';
  end if;

  -- The render input is the participant's document. Every identity inside it
  -- must equal the registration and the caller's claimed binding, or nothing
  -- is created.
  if p_render_packet ->> 'id' is distinct from p_packet_id::text
     or p_render_packet ->> 'user_id' is distinct from p_expected_consumer_auth_user_id::text
     or p_render_packet ->> 'briefcase_id' is distinct from p_briefcase_item_id::text
     or p_render_packet ->> 'person_id' is distinct from p_person_id::text
     or p_render_input_payload ->> 'authUserId' is distinct from p_expected_consumer_auth_user_id::text
     or p_render_input_payload ->> 'briefcaseItemId' is distinct from p_briefcase_item_id::text
     or p_render_input_payload ->> 'matterId' is distinct from p_matter_id::text
     or p_render_input_payload ->> 'verificationHash' is distinct from p_expected_verification_hash
     or p_render_input_payload ->> 'inputHash' is distinct from p_input_hash then
    raise exception 'sponsored render payload binding mismatch';
  end if;
  if trim(coalesce(p_route_id, '')) is distinct from v_route.route_key
     or p_render_input_payload ->> 'routeId' is distinct from v_route.route_key
     or p_render_input_payload ->> 'packetFamilyId' is distinct from v_route.packet_family_id
     or p_render_input_payload ->> 'specificationId' is distinct from v_route.packet_specification_id
     or p_render_input_payload ->> 'specificationVersion' is distinct from v_route.packet_specification_version
     or p_render_input_payload ->> 'specificationSha256' is distinct from v_route.packet_specification_sha256
     or (v_route.registry_track_id is not null
         and p_render_input_payload ->> 'trackId' is distinct from v_route.registry_track_id)
     or p_render_input_payload -> 'snapshot' ->> 'jurisdiction' is distinct from v_route.jurisdiction
     or p_render_input_payload -> 'snapshot' ->> 'pathwayId' is distinct from v_route.pathway_id
     or (v_route.registry_track_id is not null
         and p_render_input_payload -> 'snapshot' ->> 'selectedTrackId' is distinct from v_route.registry_track_id) then
    raise exception 'sponsored render route binding mismatch';
  end if;

  select v.verification_hash into v_hash from public.consumer_packet_verifications v
    where v.briefcase_item_id = p_briefcase_item_id
      and v.consumer_auth_user_id = p_expected_consumer_auth_user_id
      and v.status = 'verified' for update;
  if v_hash is null or v_hash is distinct from p_expected_verification_hash then
    raise exception 'sponsored render verification changed';
  end if;

  select * into v_authority from public.sponsored_packet_render_authority(
    p_route_key, p_session_id, p_briefcase_item_id, p_expected_consumer_auth_user_id
  );
  if not coalesce(v_authority.valid, false) then
    raise exception 'sponsored render authority missing: %', coalesce(v_authority.reason, 'unknown');
  end if;
  if p_matter_id is distinct from public.consumer_matter_id_for_briefcase_item(p_briefcase_item_id) then
    raise exception 'sponsored render matter binding mismatch';
  end if;

  insert into public.rcap_document_packets (
    id, partner_slug, user_id, briefcase_id, person_id, state, jurisdiction,
    document_type, pathway, status, petitioner_first_name, petitioner_last_name,
    petitioner_city, petitioner_county, court_county, court_name, cause_number,
    charge, offense_date, arrest_date, arresting_agency, agency_case_number,
    disposition_date, conviction_date, sentence_completion_date,
    needs_record_review, generated_plain_text, filing_instructions,
    county_court_instructions, missing_fields, safety_disclaimer
  ) values (
    p_packet_id, 'expungement-ai-consumer', p_expected_consumer_auth_user_id,
    p_briefcase_item_id, p_person_id,
    p_render_packet ->> 'state', p_render_packet ->> 'jurisdiction',
    p_render_packet ->> 'document_type', p_render_packet ->> 'pathway',
    coalesce(p_render_packet ->> 'status', 'ready_for_review'),
    p_render_packet ->> 'petitioner_first_name', p_render_packet ->> 'petitioner_last_name',
    p_render_packet ->> 'petitioner_city', p_render_packet ->> 'petitioner_county',
    p_render_packet ->> 'court_county', p_render_packet ->> 'court_name',
    p_render_packet ->> 'cause_number', p_render_packet ->> 'charge',
    p_render_packet ->> 'offense_date', p_render_packet ->> 'arrest_date',
    p_render_packet ->> 'arresting_agency', p_render_packet ->> 'agency_case_number',
    p_render_packet ->> 'disposition_date', p_render_packet ->> 'conviction_date',
    p_render_packet ->> 'sentence_completion_date',
    coalesce((p_render_packet ->> 'needs_record_review')::boolean, true),
    p_render_packet ->> 'generated_plain_text',
    array(select jsonb_array_elements_text(coalesce(p_render_packet -> 'filing_instructions', '[]'::jsonb))),
    array(select jsonb_array_elements_text(coalesce(p_render_packet -> 'county_court_instructions', '[]'::jsonb))),
    array(select jsonb_array_elements_text(coalesce(p_render_packet -> 'missing_fields', '[]'::jsonb))),
    p_render_packet ->> 'safety_disclaimer'
  ) on conflict (id) do nothing;

  select i.input_payload into v_existing_payload from public.rcap_document_packet_inputs i
    where i.document_packet_id = p_packet_id and i.partner_slug = 'expungement-ai-consumer' for update;
  if found and v_existing_payload is distinct from p_render_input_payload then
    raise exception 'sponsored render input payload is immutable';
  end if;
  if not found then
    insert into public.rcap_document_packet_inputs(document_packet_id, partner_slug, input_payload)
      values (p_packet_id, 'expungement-ai-consumer', p_render_input_payload);
  end if;

  select * into v_job from public.enqueue_packet_render_job(
    p_packet_id, p_route_id, p_renderer_kind, p_renderer_version,
    p_source_sha256, p_profile_id, p_profile_version, p_input_hash,
    p_briefcase_item_id, v_authority.partner_id, p_person_id, p_matter_id,
    p_max_attempts, null, null
  );
  if v_job.id is null then raise exception 'sponsored render enqueue failed'; end if;

  update public.packet_render_jobs j set
    sponsored_route_key = v_route.route_key,
    sponsored_session_id = p_session_id,
    sponsored_clinic_event_id = v_authority.clinic_event_id,
    sponsored_consumer_briefcase_item_id = p_briefcase_item_id,
    sponsored_consumer_auth_user_id = p_expected_consumer_auth_user_id,
    sponsored_verification_hash = p_expected_verification_hash
  where j.id = v_job.id and j.sponsored_route_key is null;

  select * into v_job from public.packet_render_jobs j where j.id = v_job.id;
  if v_job.sponsored_route_key is distinct from v_route.route_key
     or v_job.sponsored_consumer_briefcase_item_id is distinct from p_briefcase_item_id
     or v_job.sponsored_consumer_auth_user_id is distinct from p_expected_consumer_auth_user_id
     or v_job.sponsored_verification_hash is distinct from p_expected_verification_hash
     or v_job.sponsored_session_id is distinct from p_session_id then
    raise exception 'sponsored render job is bound to a different participant or route';
  end if;
  return next v_job;
end;
$enqueue$;

create or replace function public.consumer_render_job_verification_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $guard$
declare v_hash text;
begin
  if tg_op = 'UPDATE' and (
       (old.sponsored_route_key is not null and new.sponsored_route_key is distinct from old.sponsored_route_key)
    or (old.sponsored_session_id is not null and new.sponsored_session_id is distinct from old.sponsored_session_id)
    or (old.sponsored_clinic_event_id is not null and new.sponsored_clinic_event_id is distinct from old.sponsored_clinic_event_id)
    or (old.sponsored_consumer_briefcase_item_id is not null
        and new.sponsored_consumer_briefcase_item_id is distinct from old.sponsored_consumer_briefcase_item_id)
    or (old.sponsored_consumer_auth_user_id is not null
        and new.sponsored_consumer_auth_user_id is distinct from old.sponsored_consumer_auth_user_id)
    or (old.sponsored_verification_hash is not null
        and new.sponsored_verification_hash is distinct from old.sponsored_verification_hash)
  ) then
    raise exception 'sponsored render binding is immutable';
  end if;

  if new.sponsored_route_key is not null then
    if new.partner_id is null
       or new.sponsored_session_id is null
       or new.sponsored_clinic_event_id is null
       or new.sponsored_consumer_briefcase_item_id is null
       or new.sponsored_consumer_auth_user_id is null
       or new.sponsored_verification_hash is null then
      raise exception 'sponsored render job binding is incomplete';
    end if;
    if not exists (
      select 1 from public.sponsored_packet_render_routes r
      where r.route_key = new.sponsored_route_key and r.active
    ) then
      raise exception 'sponsored render route is not registered';
    end if;
    if new.status in ('artifact_validated', 'delivered') then
      select v.verification_hash into v_hash from public.consumer_packet_verifications v
        where v.briefcase_item_id = new.sponsored_consumer_briefcase_item_id
          and v.consumer_auth_user_id = new.sponsored_consumer_auth_user_id
          and v.status = 'verified';
      if v_hash is null or v_hash is distinct from new.sponsored_verification_hash then
        raise exception 'sponsored render job has stale verification authority';
      end if;
    end if;
    return new;
  end if;

  if new.partner_id is not null then return new; end if;
  if tg_op = 'UPDATE' and old.consumer_verification_hash is not null
     and new.consumer_verification_hash is distinct from old.consumer_verification_hash then
    raise exception 'consumer render verification binding is immutable';
  end if;
  if new.status in ('artifact_validated', 'delivered') then
    select v.verification_hash into v_hash from public.consumer_packet_verifications v
      where v.briefcase_item_id = new.consumer_briefcase_item_id
        and v.consumer_auth_user_id = new.consumer_auth_user_id
        and v.status = 'verified';
    if v_hash is null or v_hash is distinct from new.consumer_verification_hash then
      raise exception 'consumer render job has stale verification authority';
    end if;
  end if;
  return new;
end;
$guard$;

create or replace function public.finalize_sponsored_packet_generation_for_route(
  p_route_key text,
  p_session_id uuid,
  p_briefcase_item_id uuid,
  p_expected_verification_hash text,
  p_packet_artifact jsonb,
  p_render_job_id uuid default null
)
returns table(ok boolean, recorded boolean, counted_as text, reason text)
language plpgsql
security definer
set search_path = ''
as $finalize$
declare
  v_route public.sponsored_packet_render_routes%rowtype;
  v_item public.consumer_briefcase_items%rowtype;
  v_verification public.consumer_packet_verifications%rowtype;
  v_source public.consumer_pending_screening_results%rowtype;
  v_session public.screening_sessions%rowtype;
  v_case public.clinic_cases%rowtype;
  v_event public.clinic_events%rowtype;
  v_entitlement public.partner_entitlement%rowtype;
  v_provenance public.consumer_packet_artifact_provenance%rowtype;
  v_job public.packet_render_jobs%rowtype;
  v_matter_id uuid;
  v_event_artifact_count integer;
  v_counted_as text;
begin
  -- Refuse malformed caller values before taking a lock or changing a row.
  if p_route_key is null
     or p_session_id is null
     or p_briefcase_item_id is null
     or p_expected_verification_hash !~ '^[a-f0-9]{64}$'
     or jsonb_typeof(p_packet_artifact) is distinct from 'object' then
    return query select false, false, 'not_counted'::text, 'invalid_input'::text;
    return;
  end if;

  select * into v_route from public.sponsored_packet_render_routes r
   where r.route_key = p_route_key and r.active;
  if not found then
    return query select false, false, 'not_counted'::text, 'route_not_registered'::text;
    return;
  end if;

  -- The canonical matter is the first lock. The function never accepts an
  -- owner, matter, route, partner, event, or entitlement from its caller.
  select * into v_item
  from public.consumer_briefcase_items i
  where i.id = p_briefcase_item_id
  for update;
  if not found then
    return query select false, false, 'not_counted'::text, 'wrong_item'::text;
    return;
  end if;
  v_matter_id := public.consumer_matter_id_for_briefcase_item(v_item.id);

  -- Lock the protected verification row immediately after the matter. Display
  -- JSON and packet_status are intentionally not verification authority.
  select * into v_verification
  from public.consumer_packet_verifications v
  where v.briefcase_item_id = v_item.id
  for update;
  if not found
     or v_verification.status <> 'verified'
     or v_verification.verification_hash is distinct from p_expected_verification_hash then
    return query select false, false, 'not_counted'::text, 'verification_mismatch'::text;
    return;
  end if;
  if v_verification.consumer_auth_user_id is distinct from v_item.user_id then
    return query select false, false, 'not_counted'::text, 'wrong_owner'::text;
    return;
  end if;
  if v_verification.matter_id is distinct from v_matter_id then
    return query select false, false, 'not_counted'::text, 'wrong_matter'::text;
    return;
  end if;
  if v_item.jurisdiction <> v_route.jurisdiction
     or v_verification.verification_snapshot ->> 'jurisdiction' <> v_route.jurisdiction
     or v_verification.verification_snapshot ->> 'pathwayId' <> v_route.pathway_id
     or (v_route.registry_track_id is not null
         and v_verification.verification_snapshot ->> 'selectedTrackId' is distinct from v_route.registry_track_id) then
    return query select false, false, 'not_counted'::text, 'wrong_jurisdiction_or_route'::text;
    return;
  end if;

  -- Reconstruct the same protected claimed source used by the server-side
  -- presentation authority. It binds owner, item, anonymous source session,
  -- partner product, and Clinic event without trusting request JSON.
  select * into v_source
  from public.consumer_pending_screening_results p
  where p.pending_id = v_item.source_pending_result_id
  for update;
  if not found or v_source.status <> 'CLAIMED'
     or v_source.claimed_matter_id is distinct from v_item.id then
    return query select false, false, 'not_counted'::text, 'wrong_item'::text;
    return;
  end if;
  if v_source.claimed_user_id is distinct from v_item.user_id then
    return query select false, false, 'not_counted'::text, 'wrong_owner'::text;
    return;
  end if;
  if v_source.anonymous_session_id is distinct from p_session_id then
    return query select false, false, 'not_counted'::text, 'wrong_session'::text;
    return;
  end if;
  if v_source.product <> 'rcap_partner'
     or v_source.partner_slug is distinct from v_route.partner_slug then
    return query select false, false, 'not_counted'::text, 'wrong_partner'::text;
    return;
  end if;
  if v_source.jurisdiction <> v_route.jurisdiction then
    return query select false, false, 'not_counted'::text, 'wrong_jurisdiction_or_route'::text;
    return;
  end if;

  select * into v_session
  from public.screening_sessions s
  where s.session_id = p_session_id
  for update;
  if not found
     or v_session.flow_mode <> 'rcap'
     or v_session.partner_benefit_active is not true then
    return query select false, false, 'not_counted'::text, 'sponsorship_inactive'::text;
    return;
  end if;
  if v_session.partner_slug is distinct from v_source.partner_slug then
    return query select false, false, 'not_counted'::text, 'wrong_partner'::text;
    return;
  end if;
  if v_session.jurisdiction <> v_route.jurisdiction then
    return query select false, false, 'not_counted'::text, 'wrong_jurisdiction_or_route'::text;
    return;
  end if;

  select c.* into v_case
  from public.clinic_cases c
  where c.event_id = v_source.event_id
    and c.participant_user_id = v_item.user_id
    and c.screening_session_id = p_session_id
    and c.matter_id = v_item.id
  for update;
  if not found then
    return query select false, false, 'not_counted'::text, 'clinic_scope_mismatch'::text;
    return;
  end if;
  if v_case.jurisdiction <> v_route.jurisdiction or v_case.route_disposition <> 'packet' then
    return query select false, false, 'not_counted'::text, 'wrong_jurisdiction_or_route'::text;
    return;
  end if;

  select * into v_event
  from public.clinic_events e
  where e.id = v_case.event_id
  for update;
  if not found
     or v_event.partner_slug is distinct from v_route.partner_slug
     or v_event.program_key is distinct from v_route.program_key
     or (v_route.clinic_event_name is not null and v_event.name is distinct from v_route.clinic_event_name) then
    return query select false, false, 'not_counted'::text, 'clinic_scope_mismatch'::text;
    return;
  end if;
  if v_event.jurisdiction is distinct from v_route.jurisdiction then
    return query select false, false, 'not_counted'::text, 'wrong_jurisdiction_or_route'::text;
    return;
  end if;
  if v_event.status <> 'published'
     or v_event.sponsorship_allocation is null
     or v_event.sponsorship_allocation <= 0 then
    return query select false, false, 'not_counted'::text, 'sponsorship_inactive'::text;
    return;
  end if;

  -- A participant-deliverable artifact is a Grade-A PDF bound to this exact
  -- item, verification, specification, family, and immutable byte hash.
  if p_packet_artifact ->> 'provider' <> v_route.artifact_provider
     or p_packet_artifact ->> 'source' <> v_route.artifact_source
     or p_packet_artifact ->> 'contentType' <> v_route.artifact_content_type
     or p_packet_artifact ->> 'packetId' <> v_item.id::text
     or p_packet_artifact ->> 'verificationHash' <> p_expected_verification_hash
     or p_packet_artifact ->> 'packetSpecificationId' <> v_route.packet_specification_id
     or p_packet_artifact ->> 'packetSpecificationVersion' <> v_route.packet_specification_version
     or p_packet_artifact ->> 'packetSpecificationSha256' <> v_route.packet_specification_sha256
     or p_packet_artifact ->> 'packetFamily' <> v_route.packet_family_id
     or p_packet_artifact ->> 'artifactSha256' !~ '^[a-f0-9]{64}$'
     or coalesce((p_packet_artifact ->> 'pageCount') ~ '^[1-9][0-9]*$', false) is not true
     or coalesce((p_packet_artifact ->> 'documentCount') ~ '^[1-9][0-9]*$', false) is not true then
    return query select false, false, 'not_counted'::text, 'malformed_artifact'::text;
    return;
  end if;

  -- An optional render job. When the caller names one it must be this
  -- participant's own sponsored job for this exact route, session and
  -- verification, and it must already hold validated, deliverable bytes.
  if p_render_job_id is not null then
    select * into v_job
    from public.packet_render_jobs j
    where j.id = p_render_job_id
    for update;
    if not found
       or v_job.sponsored_route_key is distinct from v_route.route_key
       or v_job.sponsored_session_id is distinct from p_session_id
       or v_job.sponsored_consumer_briefcase_item_id is distinct from v_item.id
       or v_job.sponsored_consumer_auth_user_id is distinct from v_item.user_id
       or v_job.sponsored_verification_hash is distinct from p_expected_verification_hash
       or v_job.matter_id is distinct from v_matter_id
       or v_job.status not in ('artifact_validated', 'delivered')
       or v_job.delivery_eligibility <> 'eligible'
       or coalesce(v_job.output_sha256, '') <> (p_packet_artifact ->> 'artifactSha256') then
      return query select false, false, 'not_counted'::text, 'render_job_mismatch'::text;
      return;
    end if;
  end if;

  -- Lock existing provenance before reading the allowance. An exact retry is
  -- successful and never approaches the credit counter. A changed verification
  -- may publish another validated job for the same matter without recounting.
  select * into v_provenance
  from public.consumer_packet_artifact_provenance p
  where p.briefcase_item_id = v_item.id
  for update;
  if found then
    if v_provenance.consumer_auth_user_id = v_item.user_id
       and v_provenance.matter_id = v_matter_id
       and v_provenance.verification_hash = p_expected_verification_hash
       and v_provenance.entitlement_source = 'partner_sponsorship'
       and v_provenance.render_job_id is not distinct from p_render_job_id
       and v_provenance.artifact = p_packet_artifact then
      select a.metadata ->> 'counted_as' into v_counted_as
      from public.rcap_screening_analytics_events a
      where a.session_id = p_session_id and a.partner_slug = v_route.partner_slug
        and a.event_type = 'packet_generated'
      order by a.occurred_at asc, a.id asc
      limit 1;
      return query select true, false, coalesce(v_counted_as, 'not_counted'), 'already_finalized'::text;
      return;
    end if;
    -- A new protected verification can replace the current artifact for the
    -- same sponsored matter. Every claim/event/route/job check above still ran.
    -- Existing allowance evidence is reused; no counter or analytics event is
    -- written on this path. Same-verification byte changes remain conflicts.
    if p_render_job_id is not null and v_provenance.render_job_id is not null
       and v_provenance.consumer_auth_user_id = v_item.user_id
       and v_provenance.matter_id = v_matter_id
       and v_provenance.entitlement_source = 'partner_sponsorship'
       and v_provenance.verification_hash is distinct from p_expected_verification_hash
       and exists (
         select 1 from public.packet_render_jobs previous
         where previous.id = v_provenance.render_job_id
           and previous.sponsored_route_key = p_route_key
           and previous.sponsored_session_id = p_session_id
           and previous.sponsored_clinic_event_id = v_event.id
           and previous.partner_id = v_job.partner_id
       ) then
      select a.metadata ->> 'counted_as' into v_counted_as
      from public.rcap_screening_analytics_events a
      where a.session_id = p_session_id and a.partner_slug = v_route.partner_slug
        and a.event_type = 'packet_generated'
        and a.metadata ->> 'clinic_event_id' = v_event.id::text
      order by a.occurred_at asc, a.id asc limit 1;
      if v_counted_as not in ('included', 'overage') or v_counted_as is null
         or v_session.claimed_slot_state is distinct from 'consumed' then
        return query select false, false, 'not_counted'::text, 'prior_consumption_missing'::text;
        return;
      end if;
      update public.consumer_packet_artifact_provenance
      set render_job_id = p_render_job_id,
          verification_hash = p_expected_verification_hash,
          artifact = p_packet_artifact
      where briefcase_item_id = v_item.id;
      update public.consumer_briefcase_items
      set artifact_refs_json = p_packet_artifact, packet_status = 'ready', updated_at = now()
      where id = v_item.id and user_id = v_item.user_id;
      update public.clinic_cases
      set queue_status = 'packet_ready', last_activity_at = now(), updated_at = now()
      where id = v_case.id;
      return query select true, false, v_counted_as, 'regenerated'::text;
      return;
    end if;
    return query select false, false, 'not_counted'::text, 'artifact_conflict'::text;
    return;
  end if;
  if v_session.claimed_slot_state is distinct from 'claimed' then
    return query select false, false, 'not_counted'::text, 'sponsorship_already_consumed'::text;
    return;
  end if;

  -- The event allocation is a second, narrower cap around the partner usage
  -- window. Count only protected sponsored provenance for matters in this
  -- exact event; a repeat was returned above and therefore cannot recount.
  select count(*)::integer into v_event_artifact_count
  from public.consumer_packet_artifact_provenance p
  join public.clinic_cases c on c.matter_id = p.briefcase_item_id
  where c.event_id = v_event.id
    and p.entitlement_source = 'partner_sponsorship';
  if v_event_artifact_count >= v_event.sponsorship_allocation then
    return query select false, false, 'capped'::text, 'event_sponsorship_exhausted'::text;
    return;
  end if;

  select * into v_entitlement
  from public.partner_entitlement pe
  where pe.partner_slug = v_event.partner_slug
  for update;
  if not found then
    return query select false, false, 'not_counted'::text, 'no_entitlement'::text;
    return;
  end if;
  if v_entitlement.screenings_used < v_entitlement.screenings_allowed then
    v_counted_as := 'included';
  elsif v_entitlement.pause_at_cap then
    return query select false, false, 'capped'::text, 'paused_at_cap'::text;
    return;
  elsif v_entitlement.overage_enabled then
    v_counted_as := 'overage';
  else
    return query select false, false, 'not_counted'::text, 'cap_reached_no_overage'::text;
    return;
  end if;

  -- All refusal branches are above this line. Any unexpected failure below is
  -- raised so PostgreSQL rolls back the complete transaction rather than
  -- returning a partially-mutated refusal.
  if v_counted_as = 'included' then
    update public.partner_entitlement pe
    set screenings_used = pe.screenings_used + 1, updated_at = now()
    where pe.partner_slug = v_entitlement.partner_slug;
  else
    update public.partner_entitlement pe
    set overage_packets = pe.overage_packets + 1,
        overage_amount_cents = pe.overage_amount_cents + pe.overage_packet_price_cents,
        updated_at = now()
    where pe.partner_slug = v_entitlement.partner_slug;
  end if;

  update public.screening_sessions s
  set claimed_slot_state = 'consumed', status = 'completed', updated_at = now()
  where s.session_id = p_session_id and s.claimed_slot_state = 'claimed';
  if not found then raise exception 'sponsored finalization lost its locked session'; end if;

  insert into public.rcap_record_events
    (record_type, record_id, partner_slug, event_type, occurred_at, actor, metadata)
  values
    ('partner_entitlement', v_event.partner_slug, v_event.partner_slug,
     case when v_counted_as = 'overage'
       then 'partner_packet_overage_recorded' else 'partner_packet_credit_consumed' end,
     now(), 'system', jsonb_build_object(
       'session_id', p_session_id,
       'briefcase_item_id', v_item.id,
       'counted_as', v_counted_as,
       'clinic_event_id', v_event.id
     ));

  insert into public.rcap_screening_analytics_events
    (session_id, partner_slug, partner_access_code_id, campaign_name,
     event_type, packet_route_available, occurred_at, metadata)
  values
    (v_session.session_id, v_session.partner_slug,
     v_session.partner_access_code_id, v_session.campaign_name,
     'packet_generated', true, now(),
     jsonb_build_object('counted_as', v_counted_as, 'clinic_event_id', v_event.id));
  if v_counted_as = 'overage' then
    insert into public.rcap_screening_analytics_events
      (session_id, partner_slug, partner_access_code_id, campaign_name,
       event_type, packet_route_available, occurred_at, metadata)
    values
      (v_session.session_id, v_session.partner_slug,
       v_session.partner_access_code_id, v_session.campaign_name,
       'packet_overage_recorded', true, now(),
       jsonb_build_object(
         'overage_packet_price_cents', v_entitlement.overage_packet_price_cents,
         'clinic_event_id', v_event.id
       ));
  end if;

  insert into public.consumer_packet_artifact_provenance(
    briefcase_item_id, consumer_auth_user_id, matter_id, render_job_id,
    verification_hash, entitlement_source, artifact
  ) values (
    v_item.id, v_item.user_id, v_matter_id, p_render_job_id,
    p_expected_verification_hash, 'partner_sponsorship', p_packet_artifact
  );

  update public.consumer_briefcase_items i
  set artifact_refs_json = coalesce(i.artifact_refs_json, '{}'::jsonb) || p_packet_artifact,
      packet_status = 'ready', updated_at = now()
  where i.id = v_item.id and i.user_id = v_item.user_id;
  if not found then raise exception 'sponsored finalization lost its locked matter'; end if;

  update public.clinic_cases c
  set queue_status = 'packet_ready', last_activity_at = now(), updated_at = now()
  where c.id = v_case.id;

  return query select true, true, v_counted_as, null::text;
end;
$finalize$;

create or replace function public.finalize_sponsored_packet_generation_if_verified(
  p_session_id uuid,
  p_briefcase_item_id uuid,
  p_expected_verification_hash text,
  p_packet_artifact jsonb
)
returns table(ok boolean, recorded boolean, counted_as text, reason text)
language sql
security definer
set search_path = ''
as $mvl$
  select f.ok, f.recorded, f.counted_as, f.reason
  from public.finalize_sponsored_packet_generation_for_route(
    'MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal',
    p_session_id, p_briefcase_item_id, p_expected_verification_hash,
    p_packet_artifact, null
  ) f;
$mvl$;

create or replace function public.get_consumer_packet_artifact_authority(
  p_consumer_auth_user_id uuid,
  p_briefcase_item_id uuid
)
returns table (
  status text, revision integer, verification_hash text,
  entitlement_source text, artifact jsonb, consumer_auth_user_id uuid,
  briefcase_item_id uuid, matter_id uuid, legacy_evidence jsonb
)
language sql
stable
security definer
set search_path = ''
as $artifact$
  select case when p.briefcase_item_id is null then 'absent' else 'ready' end,
    coalesce(p.revision, 1), p.verification_hash, p.entitlement_source,
    p.artifact, p.consumer_auth_user_id, p.briefcase_item_id, p.matter_id,
    p.legacy_evidence
  from (select 1) one
  left join public.consumer_packet_artifact_provenance p
    on p.briefcase_item_id = p_briefcase_item_id
   and p.consumer_auth_user_id = p_consumer_auth_user_id
   and exists (select 1 from public.consumer_briefcase_items i
     where i.id = p.briefcase_item_id and i.user_id = p_consumer_auth_user_id)
   and (
     (p.entitlement_source = 'legacy_backfill'
       and not exists (select 1 from public.consumer_packet_verifications v where v.briefcase_item_id = p.briefcase_item_id))
     or exists (select 1 from public.consumer_packet_verifications v
       where v.briefcase_item_id = p.briefcase_item_id
         and v.consumer_auth_user_id = p_consumer_auth_user_id
         and v.status = 'verified'
         and v.verification_hash = p.verification_hash)
   )
   and (p.render_job_id is null or exists (select 1 from public.packet_render_jobs j
     where j.id = p.render_job_id
       and (
         (j.consumer_briefcase_item_id = p.briefcase_item_id
           and j.consumer_auth_user_id = p.consumer_auth_user_id)
         or (j.sponsored_route_key is not null
           and j.sponsored_consumer_briefcase_item_id = p.briefcase_item_id
           and j.sponsored_consumer_auth_user_id = p.consumer_auth_user_id)
       )));
$artifact$;

create or replace function public.consumer_packet_artifact_provenance_immutable()
returns trigger
language plpgsql
set search_path = ''
as $provenance$
declare
  v_erasure boolean := public.rcap_participant_erasure_authority() = 'erase_participant_identifiers';
  v_job public.packet_render_jobs%rowtype;
  v_hash text;
  v_valid boolean;
  v_changed boolean;
begin
  if tg_op = 'UPDATE' then
    if new.briefcase_item_id is distinct from old.briefcase_item_id
       or new.matter_id is distinct from old.matter_id
       or new.entitlement_source is distinct from old.entitlement_source
       or new.legacy_evidence is distinct from old.legacy_evidence
       or new.superseded_artifacts is distinct from old.superseded_artifacts then
      raise exception 'consumer_packet_artifact_provenance: identity and history are immutable';
    end if;
    if new.consumer_auth_user_id is distinct from old.consumer_auth_user_id and not v_erasure then
      raise exception 'consumer_packet_artifact_provenance: consumer_auth_user_id is immutable once set';
    end if;
    v_changed := new.render_job_id is distinct from old.render_job_id
      or new.verification_hash is distinct from old.verification_hash
      or new.artifact is distinct from old.artifact;
    if v_changed then
      -- No GUC or caller flag authorizes replacement: the committed job and
      -- current protected verification independently prove its entire identity.
      if v_erasure or old.render_job_id is null or new.render_job_id is null
         or new.render_job_id = old.render_job_id
         or new.verification_hash is not distinct from old.verification_hash
         or new.verification_hash is null then
        raise exception 'consumer_packet_artifact_provenance: replacement requires a new verified job';
      end if;
      select v.verification_hash into v_hash
      from public.consumer_packet_verifications v
      join public.consumer_briefcase_items i
        on i.id = v.briefcase_item_id and i.user_id = v.consumer_auth_user_id
      where v.briefcase_item_id = new.briefcase_item_id
        and v.consumer_auth_user_id = new.consumer_auth_user_id
        and v.matter_id = new.matter_id and v.status = 'verified'
      for update of v;
      if v_hash is distinct from new.verification_hash then
        raise exception 'consumer_packet_artifact_provenance: replacement verification is stale';
      end if;
      select * into v_job from public.packet_render_jobs where id = new.render_job_id;
      if not found or v_job.matter_id is distinct from new.matter_id
         or v_job.status not in ('artifact_validated', 'delivered')
         or v_job.delivery_eligibility is distinct from 'eligible'
         or coalesce(v_job.accounting_result, '') not in ('zero_charge', 'consumed', 'already_consumed', 'overage_consumed')
         or v_job.output_sha256 is null
         or v_job.output_sha256 is distinct from new.artifact ->> 'artifactSha256'
         or v_job.output_storage_path is null
         or v_job.output_storage_path is distinct from new.artifact ->> 'storagePath'
         or v_job.id::text is distinct from new.artifact ->> 'renderJobId'
         or new.artifact ->> 'contentType' is distinct from 'application/pdf'
         or new.artifact ->> 'provider' is distinct from old.artifact ->> 'provider' then
        raise exception 'consumer_packet_artifact_provenance: replacement artifact is not its validated job';
      end if;
      if new.entitlement_source = 'consumer_payment' then
        if v_job.partner_id is not null
           or v_job.consumer_briefcase_item_id is distinct from new.briefcase_item_id
           or v_job.consumer_auth_user_id is distinct from new.consumer_auth_user_id
           or v_job.consumer_verification_hash is distinct from new.verification_hash then
          raise exception 'consumer_packet_artifact_provenance: replacement consumer binding mismatch';
        end if;
        select a.valid into v_valid from public.consumer_packet_payment_authority(
          new.briefcase_item_id, new.consumer_auth_user_id,
          public.expungement_packet_product_id(), v_job.person_id, new.matter_id
        ) a;
      elsif new.entitlement_source = 'partner_sponsorship' then
        if v_job.partner_id is null
           or v_job.sponsored_consumer_briefcase_item_id is distinct from new.briefcase_item_id
           or v_job.sponsored_consumer_auth_user_id is distinct from new.consumer_auth_user_id
           or v_job.sponsored_verification_hash is distinct from new.verification_hash then
          raise exception 'consumer_packet_artifact_provenance: replacement sponsored binding mismatch';
        end if;
        select a.valid into v_valid from public.sponsored_packet_render_authority(
          v_job.sponsored_route_key, v_job.sponsored_session_id,
          new.briefcase_item_id, new.consumer_auth_user_id
        ) a;
      else
        raise exception 'consumer_packet_artifact_provenance: legacy provenance cannot be replaced';
      end if;
      if not coalesce(v_valid, false) then
        raise exception 'consumer_packet_artifact_provenance: replacement entitlement refused';
      end if;
      new.superseded_artifacts := old.superseded_artifacts || jsonb_build_array(
        jsonb_build_object('revision', old.revision, 'renderJobId', old.render_job_id,
          'verificationHash', old.verification_hash, 'entitlementSource', old.entitlement_source,
          'artifact', old.artifact, 'createdAt', old.created_at, 'supersededAt', now()));
      update public.consumer_artifact_download_grants
      set revoked_at = coalesce(revoked_at, now())
      where briefcase_item_id = old.briefcase_item_id and artifact_revision = old.revision;
    end if;
    new.revision := old.revision + 1;
    new.updated_at := now();
  end if;
  return new;
end;
$provenance$;

create or replace function public.publish_validated_consumer_render_artifact()
returns trigger
language plpgsql
security definer
set search_path = ''
as $publish$
declare
  v_verification text;
  v_valid_payment boolean;
  v_artifact jsonb;
begin
  if new.partner_id is not null
     or new.consumer_auth_user_id is null
     or new.consumer_briefcase_item_id is null
     or new.matter_id is null
     or new.consumer_verification_hash is null
     or new.status not in ('artifact_validated', 'delivered')
     or new.delivery_eligibility <> 'eligible'
     or new.accounting_result not in ('zero_charge', 'consumed', 'already_consumed', 'overage_consumed')
     or new.output_storage_path is null
     or new.output_sha256 !~ '^[a-f0-9]{64}$' then
    return new;
  end if;

  select v.verification_hash into v_verification
  from public.consumer_packet_verifications v
  where v.briefcase_item_id = new.consumer_briefcase_item_id
    and v.consumer_auth_user_id = new.consumer_auth_user_id
    and v.status = 'verified'
  for update;
  if v_verification is null or v_verification is distinct from new.consumer_verification_hash then
    return new;
  end if;

  select a.valid into v_valid_payment
  from public.consumer_packet_payment_authority(
    new.consumer_briefcase_item_id,
    new.consumer_auth_user_id,
    public.expungement_packet_product_id(),
    new.person_id,
    new.matter_id
  ) a;
  if not coalesce(v_valid_payment, false) then return new; end if;

  if new.output_storage_path not like
       'packet-artifacts/consumer/' || new.matter_id::text || '/' || new.id::text || '/' || new.output_sha256 || '.pdf'
     or position('..' in new.output_storage_path) > 0 then
    return new;
  end if;

  v_artifact := jsonb_build_object(
    'provider', 'rcap_durable_render_v1',
    'source', 'verified_render_job',
    'packetId', new.packet_id,
    'renderJobId', new.id,
    'artifactSha256', new.output_sha256,
    'storagePath', new.output_storage_path,
    'fileName', 'record-clearing-packet.pdf',
    'contentType', 'application/pdf',
    'generatedAt', new.artifact_validated_at,
    'downloadPath', '/api/expungement-ai/packet/download-link?briefcaseItemId=' || new.consumer_briefcase_item_id::text,
    'pageCount', new.page_count
  );

  insert into public.consumer_packet_artifact_provenance(
    briefcase_item_id, consumer_auth_user_id, matter_id, render_job_id,
    verification_hash, entitlement_source, artifact
  ) values (
    new.consumer_briefcase_item_id, new.consumer_auth_user_id, new.matter_id,
    new.id, new.consumer_verification_hash, 'consumer_payment', v_artifact
    ) on conflict on constraint consumer_packet_artifact_provenance_pkey do update
    set render_job_id = excluded.render_job_id,
        verification_hash = excluded.verification_hash,
        artifact = excluded.artifact
    where consumer_packet_artifact_provenance.consumer_auth_user_id = excluded.consumer_auth_user_id
      and consumer_packet_artifact_provenance.matter_id = excluded.matter_id
      and consumer_packet_artifact_provenance.entitlement_source = excluded.entitlement_source
      and consumer_packet_artifact_provenance.verification_hash is distinct from excluded.verification_hash;

  if exists (
    select 1 from public.consumer_packet_artifact_provenance p
    where p.briefcase_item_id = new.consumer_briefcase_item_id
      and p.consumer_auth_user_id = new.consumer_auth_user_id
      and p.matter_id = new.matter_id
      and p.render_job_id = new.id
      and p.verification_hash = new.consumer_verification_hash
      and p.artifact = v_artifact
  ) then
    update public.consumer_briefcase_items i
    set artifact_refs_json = v_artifact, packet_status = 'ready', updated_at = now()
    where i.id = new.consumer_briefcase_item_id
      and i.user_id = new.consumer_auth_user_id;
  end if;
  return new;
end;
$publish$;
do $grants$
declare
  v_signature text;
  v_signatures text[] := array[
    'public.sponsored_packet_render_authority(text,uuid,uuid,uuid)',
    'public.enqueue_verified_sponsored_packet_render(text,uuid,uuid,text,text,text,text,text,text,text,uuid,uuid,uuid,integer,uuid,text,jsonb,jsonb)',
    'public.finalize_sponsored_packet_generation_for_route(text,uuid,uuid,text,jsonb,uuid)',
    'public.finalize_sponsored_packet_generation_if_verified(uuid,uuid,text,jsonb)',
    'public.get_consumer_packet_artifact_authority(uuid,uuid)',
    'public.consumer_render_job_verification_guard()'
  ];
begin
  foreach v_signature in array v_signatures loop
    execute format('revoke all on function %s from public', v_signature);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on function %s from anon', v_signature);
    end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then
      execute format('revoke all on function %s from authenticated', v_signature);
    end if;
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute format('grant execute on function %s to service_role', v_signature);
    end if;
  end loop;
end
$grants$;


revoke all on function public.consumer_packet_artifact_provenance_immutable(), public.publish_validated_consumer_render_artifact() from public, anon, authenticated;
grant execute on function public.consumer_packet_artifact_provenance_immutable(), public.publish_validated_consumer_render_artifact() to service_role;

commit;
