-- Scoped sponsored render queue + finalization for a registered route.
--
-- Forward-only generalisation of the two protected mechanisms that already
-- exist:
--
--   * 20260901120000 enqueue_verified_consumer_packet_render, which binds the
--     claimed participant, their current verification and an immutable render
--     input to one durable queue row -- and requires a consumer payment;
--   * 20260903130000 finalize_sponsored_packet_generation_if_verified, which
--     performs the atomic Clinic-Mode allowance consumption and participant
--     provenance write -- and is written against the Mississippi mvl-demo
--     route, family, specification and clinic event as literals.
--
-- Neither is deleted, relaxed or reopened here. The Mississippi entry point
-- keeps its exact name, signature, result shape, refusal vocabulary and
-- refusal order: it becomes a delegation to the parameterised body with the
-- Mississippi scope supplied from a registration row that restates today's
-- literals. Sponsorship for any further route arrives only by registering that
-- route, never by removing a check.
--
-- This migration creates no second queue, ledger, artifact registry or
-- commercial route, opens no route, manufactures no consumer payment, and adds
-- no browser-reachable surface. Every new function is service-role only.

begin;

-------------------------------------------------------------------------------
-- 1. The scope registration.
--
-- A route is sponsorable only if a row here says so. The row carries the exact
-- identities the protected transaction refuses to accept from a caller: the
-- jurisdiction, pathway, registry track, packet family, owner-bound packet
-- specification and the sponsoring program. Nothing about it grants commercial
-- authority: paymentAllowed, sellable and creditConsumable live in the
-- fulfillment record and the launch gates and are untouched by this table.
-------------------------------------------------------------------------------

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

-- The Mississippi row restates the literals already compiled into
-- 20260903130000. It changes no behaviour: it is what that function already
-- enforces, written down so the same body can enforce it for another route.
insert into public.sponsored_packet_render_routes (
  route_key, jurisdiction, pathway_id, registry_track_id, packet_family_id,
  packet_specification_id, packet_specification_version, packet_specification_sha256,
  artifact_provider, artifact_source, partner_slug, clinic_event_name
) values (
  'MS:non-conviction-expungement-for-dismissal-no-disposition-or-acquittal',
  'MS', 'non-conviction-expungement-for-dismissal-no-disposition-or-acquittal',
  null, 'ms-nonconv-set',
  'ms-nonconviction-expungement-99-19-71-4', '2.0.0',
  '3a1bed79e3760feb84563a638893942ab557683f6bbe7fb0fddec7e74723257f',
  'rcap_grade_a_composer_v1', 'grade_a_packet_specification',
  'mvl-demo', 'Mississippi Volunteer Lawyers Clinic Mode Demo'
) on conflict (route_key) do nothing;

-- The assigned Illinois sponsored route: registry track il-prostitution-j-vacate
-- and family il-prostitution-j-vacate-set only. The automatic sibling
-- il-prostitution-j-auto is not registered and therefore cannot be sponsored.
-- clinic_event_name is null: any published event of the sponsoring program in
-- this jurisdiction is in scope, and the event's own jurisdiction lock still
-- has to agree.
insert into public.sponsored_packet_render_routes (
  route_key, jurisdiction, pathway_id, registry_track_id, packet_family_id,
  packet_specification_id, packet_specification_version, packet_specification_sha256,
  artifact_provider, artifact_source, partner_slug, clinic_event_name
) values (
  'IL:felony-prostitution-relief', 'IL', 'felony-prostitution-relief',
  'il-prostitution-j-vacate', 'il-prostitution-j-vacate-set',
  'il-felony-prostitution-relief', '1.0.0',
  'bc9050e096eeb99677edb9815eacae7c68d22914d8c08a785dfc375c68ed010f',
  'rcap_grade_a_composer_v1', 'grade_a_packet_specification',
  'il-clinic-sponsor', null
) on conflict (route_key) do nothing;

-------------------------------------------------------------------------------
-- 2. The sponsored binding columns on the existing queue.
--
-- A sponsored job is a partner job: enqueue_packet_render_job's mode rule
-- ("neither mode may borrow the other's fields") is untouched, and the
-- phase-52 partner accounting branch it reaches is unchanged. What the
-- existing sponsored shape could not express is the participant. These
-- columns express exactly that and nothing else, and the guard below makes
-- them set-once.
-------------------------------------------------------------------------------

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

-------------------------------------------------------------------------------
-- 3. The non-locking scope read used before a job exists.
--
-- The finalizer re-derives every one of these facts under row locks. This read
-- exists so the queue refuses an out-of-scope sponsored request before it
-- creates anything, not so the finalizer can trust it.
-------------------------------------------------------------------------------

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

-------------------------------------------------------------------------------
-- 4. The sponsored enqueue.
--
-- Deliberately the consumer enqueue's shape with one substitution: where the
-- consumer function reads consumer_packet_payment_authority, this reads the
-- sponsored scope above. No consumer payment is manufactured, no consumer
-- binding column is borrowed, and the queue row is created by the same
-- enqueue_packet_render_job -- so its idempotency (packet_id + input_hash) and
-- its partner accounting are the existing ones, unchanged.
-------------------------------------------------------------------------------

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

-------------------------------------------------------------------------------
-- 5. The worker verification guard.
--
-- Byte-for-byte the 20260901120000 guard for consumer jobs and for partner
-- jobs that carry no sponsored binding. What changes is that a sponsored job
-- is no longer skipped: it is admitted, and admitted means checked. Its
-- binding is set-once and its current verification must still be the one it
-- was queued against before it may be validated or delivered.
-------------------------------------------------------------------------------

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

-------------------------------------------------------------------------------
-- 6. The parameterised atomic finalizer.
--
-- The 20260903130000 body with its Mississippi literals replaced by the
-- registration row, and one optional addition: a sponsored render job may be
-- bound into the same transaction, so a participant's provenance names the job
-- that produced the bytes exactly as the consumer publish path does.
--
-- Refusal vocabulary, refusal order, locking order, accounting arithmetic,
-- analytics rows and the Ready mirror are unchanged. route_not_registered is
-- the only new reason and it is reachable only by a caller naming a route the
-- registration table does not carry.
-------------------------------------------------------------------------------

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
  -- successful and never approaches the credit counter; any changed byte or
  -- binding is a hard conflict.
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

-------------------------------------------------------------------------------
-- 7. The Mississippi entry point, preserved as a delegation.
--
-- Same name, same signature, same result columns, same scope. Its callers and
-- its focused verifier cannot tell the difference; the registration row is the
-- literals it used to carry.
-------------------------------------------------------------------------------

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

comment on function public.finalize_sponsored_packet_generation_if_verified(uuid,uuid,text,jsonb) is
  'Service-only atomic MVL Preview finalizer: exact protected claim + verification + Clinic scope + Grade-A PDF + one partner allowance unit + immutable provenance + Ready mirror.';

-------------------------------------------------------------------------------
-- 8. The participant artifact authority learns the sponsored job shape.
--
-- The consumer clause is unchanged. A sponsored job binds its participant in
-- the sponsored columns rather than the consumer ones, so provenance that
-- names such a job must resolve through them or the participant's own Briefcase
-- would read 'absent' for an artifact they own.
-------------------------------------------------------------------------------

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

-------------------------------------------------------------------------------
-- 9. Execute surface. Service role only; no browser role gains anything.
-------------------------------------------------------------------------------

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

-- Restate the protected-table boundary. This migration adds no browser table
-- access and the functions above are the only new executable surface.
revoke all on table public.consumer_packet_verifications from public, anon, authenticated;
revoke all on table public.consumer_packet_artifact_provenance from public, anon, authenticated;

commit;
