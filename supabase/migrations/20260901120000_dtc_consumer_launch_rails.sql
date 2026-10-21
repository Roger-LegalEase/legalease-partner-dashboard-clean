-- Expungement.ai DTC consumer launch rails.
--
-- Forward-only completion of the protected verification call sites already
-- used by the consumer application. This migration does not admit any packet
-- family or commercial route. The existing paid matter row remains the single
-- entitlement; the existing packet_render_jobs table remains the single queue.

begin;

create table if not exists public.consumer_packet_verifications (
  briefcase_item_id uuid primary key
    references public.consumer_briefcase_items(id) on delete cascade,
  consumer_auth_user_id uuid not null,
  matter_id uuid not null,
  status text not null check (status in ('unverified', 'verified', 'invalidated')),
  reason text not null check (nullif(trim(reason), '') is not null),
  verification_hash text check (verification_hash is null or verification_hash ~ '^[a-f0-9]{64}$'),
  verification_snapshot jsonb,
  draft_hash text not null check (draft_hash ~ '^[a-f0-9]{64}$'),
  draft_snapshot jsonb not null,
  revision integer not null check (revision >= 0),
  invalidated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint consumer_packet_verifications_verified_shape check (
    (status = 'verified'
      and verification_hash is not null
      and verification_snapshot ->> 'schemaVersion' = 'expungement-ai/final-verification/v1')
    or
    (status <> 'verified' and verification_hash is null and verification_snapshot is null)
  ),
  constraint consumer_packet_verifications_draft_shape check (
    draft_snapshot ->> 'schemaVersion' = 'expungement-ai/protected-packet-draft/v1'
  )
);

create index if not exists consumer_packet_verifications_owner_idx
  on public.consumer_packet_verifications(consumer_auth_user_id, briefcase_item_id);

alter table public.consumer_packet_verifications enable row level security;
revoke all on table public.consumer_packet_verifications from public, anon, authenticated;

alter table public.packet_render_jobs
  add column if not exists consumer_verification_hash text
    check (consumer_verification_hash is null or consumer_verification_hash ~ '^[a-f0-9]{64}$');

revoke insert (consumer_verification_hash), update (consumer_verification_hash)
  on public.packet_render_jobs from anon, authenticated;

-- The claimed pending row follows its matter during participant deletion. The
-- old SET NULL action was incompatible with the CLAIMED row-shape constraint.
alter table public.consumer_pending_screening_results
  drop constraint if exists consumer_pending_screening_results_claimed_matter_id_fkey;
alter table public.consumer_pending_screening_results
  add constraint consumer_pending_screening_results_claimed_matter_id_fkey
  foreign key (claimed_matter_id) references public.consumer_briefcase_items(id) on delete cascade;

create or replace function public.consumer_canonical_json(p_value jsonb)
returns text
language plpgsql
immutable
strict
set search_path = ''
as $canonical$
declare
  v_type text := jsonb_typeof(p_value);
  v_result text;
begin
  if v_type = 'object' then
    select '{' || coalesce(string_agg(to_jsonb(e.key)::text || ':' || public.consumer_canonical_json(e.value), ',' order by e.key), '') || '}'
      into v_result from jsonb_each(p_value) e;
    return v_result;
  elsif v_type = 'array' then
    select '[' || coalesce(string_agg(public.consumer_canonical_json(e.value), ',' order by e.ordinality), '') || ']'
      into v_result from jsonb_array_elements(p_value) with ordinality e(value, ordinality);
    return v_result;
  end if;
  return p_value::text;
end;
$canonical$;

create or replace function public.get_consumer_packet_verification_authority(
  p_consumer_auth_user_id uuid,
  p_briefcase_item_id uuid
)
returns table (
  status text,
  reason text,
  hash text,
  snapshot jsonb,
  draft_hash text,
  draft_snapshot jsonb,
  revision integer,
  invalidated_at text
)
language sql
stable
security definer
set search_path = ''
as $read$
  select v.status, v.reason, v.verification_hash, v.verification_snapshot,
         v.draft_hash, v.draft_snapshot, v.revision,
         case when v.invalidated_at is null then null else v.invalidated_at::text end
  from public.consumer_packet_verifications v
  join public.consumer_briefcase_items i on i.id = v.briefcase_item_id
  where v.briefcase_item_id = p_briefcase_item_id
    and v.consumer_auth_user_id = p_consumer_auth_user_id
    and i.user_id = p_consumer_auth_user_id;
$read$;

create or replace function public.persist_consumer_packet_verification(
  p_consumer_auth_user_id uuid,
  p_briefcase_item_id uuid,
  p_expected_prior_hash text,
  p_expected_prior_revision integer,
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
returns table (
  status text,
  reason text,
  hash text,
  snapshot jsonb,
  draft_hash text,
  draft_snapshot jsonb,
  revision integer,
  invalidated_at text
)
language plpgsql
security definer
set search_path = ''
as $persist$
declare
  v_item public.consumer_briefcase_items%rowtype;
  v_prior public.consumer_packet_verifications%rowtype;
  v_next_revision integer;
  v_verification_display jsonb;
begin
  if p_consumer_auth_user_id is null or p_briefcase_item_id is null
     or p_expected_prior_revision is null or p_expected_prior_revision < 0
     or p_next_draft_hash !~ '^[a-f0-9]{64}$'
     or p_next_draft_snapshot ->> 'schemaVersion' <> 'expungement-ai/protected-packet-draft/v1'
     or p_next_verification_status not in ('unverified', 'verified', 'invalidated')
     or nullif(trim(coalesce(p_next_verification_reason, '')), '') is null
     or coalesce(jsonb_typeof(p_answer_delta), '') <> 'object'
     or coalesce(jsonb_typeof(p_packet_information_metadata), '') <> 'object' then
    return;
  end if;
  if (p_next_verification_status = 'verified') is distinct from
     coalesce((p_next_verification_hash ~ '^[a-f0-9]{64}$'
      and p_next_verification_snapshot ->> 'schemaVersion' = 'expungement-ai/final-verification/v1'), false) then
    return;
  end if;
  if p_next_verification_status <> 'verified'
     and (p_next_verification_hash is not null or p_next_verification_snapshot is not null) then
    return;
  end if;

  select * into v_item from public.consumer_briefcase_items i
   where i.id = p_briefcase_item_id and i.user_id = p_consumer_auth_user_id for update;
  if not found then return; end if;

  select * into v_prior from public.consumer_packet_verifications v
   where v.briefcase_item_id = p_briefcase_item_id for update;

  if found then
    if v_prior.consumer_auth_user_id is distinct from p_consumer_auth_user_id
       or v_prior.revision is distinct from p_expected_prior_revision
       or (case when v_prior.status = 'verified' then v_prior.verification_hash else null end)
          is distinct from p_expected_prior_hash then
      return;
    end if;
    if p_next_draft_hash = v_prior.draft_hash
       and p_next_verification_status = v_prior.status
       and p_next_verification_hash is not distinct from v_prior.verification_hash
       and p_next_draft_snapshot = v_prior.draft_snapshot
       and p_next_verification_snapshot is not distinct from v_prior.verification_snapshot then
      v_next_revision := v_prior.revision;
    else
      v_next_revision := v_prior.revision + 1;
    end if;
    update public.consumer_packet_verifications v set
      status = p_next_verification_status,
      reason = p_next_verification_reason,
      verification_hash = p_next_verification_hash,
      verification_snapshot = p_next_verification_snapshot,
      draft_hash = p_next_draft_hash,
      draft_snapshot = p_next_draft_snapshot,
      revision = v_next_revision,
      invalidated_at = p_next_verification_invalidated_at,
      updated_at = now()
    where v.briefcase_item_id = p_briefcase_item_id;
  else
    if p_expected_prior_revision <> 0 or p_expected_prior_hash is not null then return; end if;
    v_next_revision := case when p_next_verification_status = 'unverified' then 0 else 1 end;
    insert into public.consumer_packet_verifications (
      briefcase_item_id, consumer_auth_user_id, matter_id, status, reason,
      verification_hash, verification_snapshot, draft_hash, draft_snapshot,
      revision, invalidated_at
    ) values (
      p_briefcase_item_id, p_consumer_auth_user_id,
      public.consumer_matter_id_for_briefcase_item(p_briefcase_item_id),
      p_next_verification_status, p_next_verification_reason,
      p_next_verification_hash, p_next_verification_snapshot,
      p_next_draft_hash, p_next_draft_snapshot, v_next_revision,
      p_next_verification_invalidated_at
    );
  end if;

  v_verification_display := jsonb_strip_nulls(jsonb_build_object(
    'status', p_next_verification_status,
    'reason', p_next_verification_reason,
    'hash', p_next_verification_hash,
    'snapshot', p_next_verification_snapshot,
    'draftHash', p_next_draft_hash,
    'draftSnapshot', p_next_draft_snapshot,
    'revision', v_next_revision,
    'invalidatedAt', p_next_verification_invalidated_at
  ));
  update public.consumer_briefcase_items i set
    summary_json = jsonb_set(
      coalesce(i.summary_json, '{}'::jsonb),
      '{commercialFlow}',
      coalesce(i.summary_json -> 'commercialFlow', '{}'::jsonb)
        || jsonb_build_object(
          'packetInformation', p_packet_information_metadata,
          'verification', v_verification_display
        ),
      true
    ),
    packet_status = case
      when p_next_verification_status <> 'verified' and i.packet_status in ('ready', 'downloaded') then 'pending'
      else i.packet_status
    end,
    updated_at = now()
  where i.id = p_briefcase_item_id;

  return query select v.status, v.reason, v.verification_hash, v.verification_snapshot,
      v.draft_hash, v.draft_snapshot, v.revision,
      case when v.invalidated_at is null then null else v.invalidated_at::text end
    from public.consumer_packet_verifications v
    where v.briefcase_item_id = p_briefcase_item_id;
end;
$persist$;

create or replace function public.get_consumer_briefcase_presentation_source(
  p_consumer_auth_user_id uuid,
  p_briefcase_item_id uuid
)
returns table (
  consumer_auth_user_id uuid,
  briefcase_item_id uuid,
  claimed_user_id uuid,
  claimed_at text,
  source_identity text,
  product text,
  partner_benefit_active boolean,
  partner_slug text,
  jurisdiction text,
  profile_version text,
  matter_id text,
  screening_answers jsonb,
  screening_answers_sha256 text,
  source_linkage_sha256 text
)
language sql
stable
security definer
set search_path = ''
as $source$
  with trusted as (
    select
      i.user_id as consumer_auth_user_id,
      i.id as briefcase_item_id,
      p.claimed_user_id,
      p.claimed_at,
      coalesce(p.anonymous_session_id::text, p.pending_id::text) as source_identity,
      p.product,
      (p.product = 'rcap_partner' and p.partner_slug is not null) as partner_benefit_active,
      p.partner_slug,
      p.jurisdiction,
      p.profile_version,
      coalesce(
        i.summary_json #>> '{commercialFlow,screening,screeningMatterId}',
        p.candidate_route_context ->> 'matterId',
        p.pending_id::text
      ) as matter_id,
      p.screening_answers,
      encode(extensions.digest(convert_to(public.consumer_canonical_json(p.screening_answers), 'utf8'), 'sha256'), 'hex') as answers_hash
    from public.consumer_briefcase_items i
    join public.consumer_pending_screening_results p
      on p.pending_id = i.source_pending_result_id
    where i.id = p_briefcase_item_id
      and i.user_id = p_consumer_auth_user_id
      and p.status = 'CLAIMED'
      and p.claimed_user_id = p_consumer_auth_user_id
      and p.claimed_matter_id = i.id
  )
  select t.consumer_auth_user_id, t.briefcase_item_id, t.claimed_user_id,
    t.claimed_at::text, t.source_identity, t.product, t.partner_benefit_active,
    t.partner_slug, t.jurisdiction, t.profile_version, t.matter_id,
    t.screening_answers, t.answers_hash,
    encode(extensions.digest(convert_to(public.consumer_canonical_json(jsonb_build_object(
      'consumerAuthUserId', t.consumer_auth_user_id::text,
      'briefcaseItemId', t.briefcase_item_id::text,
      'matterId', t.matter_id,
      'sourceIdentity', t.source_identity,
      'claimedAt', t.claimed_at::text,
      'screeningAnswersSha256', t.answers_hash,
      'product', t.product,
      'partnerBenefitActive', t.partner_benefit_active,
      'partnerSlug', t.partner_slug
    )), 'utf8'), 'sha256'), 'hex')
  from trusted t;
$source$;

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
as $bind$
declare
  v_item public.consumer_briefcase_items%rowtype;
  v_hash text;
  v_other uuid;
begin
  select * into v_item from public.consumer_briefcase_items i
   where i.id = p_briefcase_item_id for update;
  if not found or v_item.user_id is distinct from p_consumer_auth_user_id then
    return query select false, 'item_not_found'::text, null::uuid, null::text; return;
  end if;
  select v.verification_hash into v_hash from public.consumer_packet_verifications v
   where v.briefcase_item_id = p_briefcase_item_id and v.status = 'verified' for update;
  if v_hash is distinct from p_expected_verification_hash then
    return query select false, 'verification_changed'::text, p_briefcase_item_id, null::text; return;
  end if;
  if v_item.payment_allowed is not true or v_item.payment_status = 'not_applicable'
     or p_product_id is distinct from public.expungement_packet_product_id()
     or p_matter_id is distinct from public.consumer_matter_id_for_briefcase_item(p_briefcase_item_id)
     or p_person_id is null or p_payment_provider not in ('stripe', 'dry_run')
     or nullif(trim(coalesce(p_checkout_session_id, '')), '') is null then
    return query select false, 'checkout_binding_invalid'::text, p_briefcase_item_id, null::text; return;
  end if;
  select i.id into v_other from public.consumer_briefcase_items i
    where i.checkout_session_id = p_checkout_session_id and i.id <> p_briefcase_item_id limit 1;
  if v_other is not null then
    return query select false, 'checkout_session_in_use'::text, p_briefcase_item_id, null::text; return;
  end if;
  if v_item.checkout_session_id is not null and v_item.checkout_session_id <> p_checkout_session_id then
    return query select false, 'checkout_binding_conflict'::text, p_briefcase_item_id, v_item.checkout_session_id; return;
  end if;
  update public.consumer_briefcase_items i set
    checkout_session_id = p_checkout_session_id,
    payment_provider = p_payment_provider,
    payment_product_id = p_product_id,
    payment_person_id = p_person_id,
    payment_matter_id = p_matter_id,
    payment_status = case when i.payment_status = 'paid' then 'paid' else 'unpaid' end,
    amount_cents = case when i.payment_status = 'paid' then i.amount_cents else null end,
    updated_at = now()
  where i.id = p_briefcase_item_id;
  return query select true, 'bound'::text, p_briefcase_item_id, p_checkout_session_id;
end;
$bind$;

-- The legacy 14-argument writer remains available to its historical callers.
-- The consumer application calls this 15-argument overload, which compares the
-- exact protected verification in the same transaction as payment recording.
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
as $payment$
declare
  v_hash text;
  v_result record;
begin
  select v.verification_hash into v_hash from public.consumer_packet_verifications v
   where v.briefcase_item_id = p_briefcase_item_id and v.status = 'verified' for update;
  if v_hash is null or v_hash is distinct from p_expected_verification_hash then
    return query select 'invalid_payment_evidence'::text, p_briefcase_item_id, null::text; return;
  end if;
  select * into v_result from public.record_consumer_packet_payment(
    p_briefcase_item_id, p_payment_status, p_amount_cents, p_currency,
    p_payment_provider, p_provider_event_id, p_checkout_session_id,
    p_payment_intent_id, p_receipt_url, p_authority, p_recorded_by,
    p_product_id, p_person_id, p_matter_id
  );
  return query select v_result.outcome::text, v_result.briefcase_item_id::uuid,
    v_result.provider_event_id::text;
end;
$payment$;

create unique index if not exists rcap_consumer_document_packet_input_uk
  on public.rcap_document_packet_inputs(document_packet_id)
  where partner_slug = 'expungement-ai-consumer';

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
as $enqueue$
declare
  v_hash text;
  v_authorized boolean;
  v_job public.packet_render_jobs%rowtype;
  v_existing_payload jsonb;
begin
  if p_briefcase_item_id is distinct from p_consumer_briefcase_item_id
     or p_render_packet ->> 'id' is distinct from p_packet_id::text
     or p_render_packet ->> 'user_id' is distinct from p_expected_consumer_auth_user_id::text
     or p_render_packet ->> 'briefcase_id' is distinct from p_consumer_briefcase_item_id::text
     or p_render_packet ->> 'person_id' is distinct from p_person_id::text
     or p_render_input_payload ->> 'authUserId' is distinct from p_expected_consumer_auth_user_id::text
     or p_render_input_payload ->> 'briefcaseItemId' is distinct from p_consumer_briefcase_item_id::text
     or p_render_input_payload ->> 'matterId' is distinct from p_matter_id::text
     or p_render_input_payload ->> 'verificationHash' is distinct from p_expected_verification_hash
     or p_render_input_payload ->> 'inputHash' is distinct from p_input_hash then
    raise exception 'consumer render payload binding mismatch';
  end if;
  select v.verification_hash into v_hash from public.consumer_packet_verifications v
    where v.briefcase_item_id = p_consumer_briefcase_item_id
      and v.consumer_auth_user_id = p_expected_consumer_auth_user_id
      and v.status = 'verified' for update;
  if v_hash is null or v_hash is distinct from p_expected_verification_hash then
    raise exception 'consumer render verification changed';
  end if;
  select a.valid into v_authorized from public.consumer_packet_payment_authority(
    p_consumer_briefcase_item_id, p_expected_consumer_auth_user_id,
    public.expungement_packet_product_id(), p_person_id, p_matter_id
  ) a;
  if not coalesce(v_authorized, false) then raise exception 'consumer render entitlement missing'; end if;

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
    p_consumer_briefcase_item_id, p_person_id,
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
    raise exception 'consumer render input payload is immutable';
  end if;
  if not found then
    insert into public.rcap_document_packet_inputs(document_packet_id, partner_slug, input_payload)
      values (p_packet_id, 'expungement-ai-consumer', p_render_input_payload);
  end if;

  select * into v_job from public.enqueue_packet_render_job(
    p_packet_id, p_route_id, p_renderer_kind, p_renderer_version,
    p_source_sha256, p_profile_id, p_profile_version, p_input_hash,
    p_briefcase_item_id, null, p_person_id, p_matter_id,
    p_max_attempts, p_consumer_briefcase_item_id, p_expected_consumer_auth_user_id
  );
  if v_job.id is null then raise exception 'consumer render enqueue failed'; end if;
  update public.packet_render_jobs j set consumer_verification_hash = p_expected_verification_hash
    where j.id = v_job.id and j.consumer_verification_hash is null;
  select * into v_job from public.packet_render_jobs j where j.id = v_job.id;
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

drop trigger if exists consumer_render_job_verification_guard_trg on public.packet_render_jobs;
create trigger consumer_render_job_verification_guard_trg
  before insert or update on public.packet_render_jobs
  for each row execute function public.consumer_render_job_verification_guard();

create or replace function public.attach_consumer_packet_artifact_if_verified(
  p_consumer_auth_user_id uuid,
  p_briefcase_item_id uuid,
  p_expected_verification_hash text,
  p_entitlement_source text,
  p_artifact jsonb
)
returns table (
  status text, revision integer, verification_hash text,
  entitlement_source text, artifact jsonb, consumer_auth_user_id uuid,
  briefcase_item_id uuid, matter_id uuid, legacy_evidence jsonb
)
language plpgsql
security definer
set search_path = ''
as $attach$
declare
  v_hash text;
  v_authorized boolean;
  v_item public.consumer_briefcase_items%rowtype;
begin
  if p_entitlement_source <> 'consumer_payment' or coalesce(jsonb_typeof(p_artifact), '') <> 'object' then return; end if;
  select * into v_item from public.consumer_briefcase_items i
    where i.id = p_briefcase_item_id and i.user_id = p_consumer_auth_user_id for update;
  if not found then return; end if;
  select v.verification_hash into v_hash from public.consumer_packet_verifications v
    where v.briefcase_item_id = p_briefcase_item_id
      and v.consumer_auth_user_id = p_consumer_auth_user_id
      and v.status = 'verified' for update;
  if v_hash is null or v_hash is distinct from p_expected_verification_hash then return; end if;
  select a.valid into v_authorized from public.consumer_packet_payment_authority(
    p_briefcase_item_id, p_consumer_auth_user_id, public.expungement_packet_product_id(),
    v_item.payment_person_id, public.consumer_matter_id_for_briefcase_item(p_briefcase_item_id)
  ) a;
  if not coalesce(v_authorized, false) then return; end if;

  insert into public.consumer_packet_artifact_provenance(
    briefcase_item_id, consumer_auth_user_id, matter_id, verification_hash,
    entitlement_source, artifact
  ) values (
    p_briefcase_item_id, p_consumer_auth_user_id,
    public.consumer_matter_id_for_briefcase_item(p_briefcase_item_id),
    p_expected_verification_hash, p_entitlement_source, p_artifact
  ) on conflict on constraint consumer_packet_artifact_provenance_pkey do nothing;
  if not exists (
    select 1 from public.consumer_packet_artifact_provenance p
    where p.briefcase_item_id = p_briefcase_item_id
      and p.consumer_auth_user_id = p_consumer_auth_user_id
      and p.verification_hash = p_expected_verification_hash
      and p.artifact = p_artifact
  ) then return; end if;
  update public.consumer_briefcase_items i set artifact_refs_json = p_artifact,
    packet_status = 'ready', updated_at = now() where i.id = p_briefcase_item_id;
  return query select 'ready'::text, p.revision, p.verification_hash,
    p.entitlement_source, p.artifact, p.consumer_auth_user_id,
    p.briefcase_item_id, p.matter_id, p.legacy_evidence
  from public.consumer_packet_artifact_provenance p where p.briefcase_item_id = p_briefcase_item_id;
end;
$attach$;

-- A material edit makes an old artifact absent even though its retained payment
-- stays on the matter. Exact-owner mismatch is also absence, never disclosure.
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
       and j.consumer_briefcase_item_id = p.briefcase_item_id
       and j.consumer_auth_user_id = p.consumer_auth_user_id));
$artifact$;

do $grants$
declare
  v_signature text;
  v_signatures text[] := array[
    'public.get_consumer_packet_verification_authority(uuid,uuid)',
    'public.persist_consumer_packet_verification(uuid,uuid,text,integer,jsonb,jsonb,text,jsonb,text,text,text,jsonb,timestamp with time zone)',
    'public.get_consumer_briefcase_presentation_source(uuid,uuid)',
    'public.bind_consumer_checkout_verification(uuid,uuid,text,text,text,uuid,uuid,text)',
    'public.record_consumer_packet_payment(uuid,text,integer,text,text,text,text,text,text,text,text,text,uuid,uuid,text)',
    'public.enqueue_verified_consumer_packet_render(uuid,text,text,text,text,text,text,text,uuid,uuid,uuid,integer,uuid,uuid,text,jsonb,jsonb)',
    'public.attach_consumer_packet_artifact_if_verified(uuid,uuid,text,text,jsonb)',
    'public.get_consumer_packet_artifact_authority(uuid,uuid)'
  ];
begin
  foreach v_signature in array v_signatures loop
    execute format('revoke all on function %s from public', v_signature);
    if exists (select 1 from pg_roles where rolname = 'anon') then execute format('revoke all on function %s from anon', v_signature); end if;
    if exists (select 1 from pg_roles where rolname = 'authenticated') then execute format('revoke all on function %s from authenticated', v_signature); end if;
    if exists (select 1 from pg_roles where rolname = 'service_role') then execute format('grant execute on function %s to service_role', v_signature); end if;
  end loop;
end;
$grants$;

commit;
