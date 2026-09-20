-- Grade-A fulfillment authority — MIGRATION PATCH PROPOSAL (not applied, not numbered)
--
-- Unnumbered and outside supabase/migrations/ on purpose. Migration numbering and
-- apply order are captain-owned; this lane does not write into them.
--
-- WHY A DATABASE SIDE EXISTS
--
--   src/lib/rcap/fulfillment/ is the authority the product reads, and it is
--   correct. These objects exist for the reason phase 52's payment RPC exists:
--   the check that actually defends the money is the one that holds when the
--   application is wrong. An admission point that forgets to call
--   admitCommercial() should still be unable to record a commercial consumption
--   against a route nobody proved.
--
--   The two are duplicated on purpose and neither substitutes for the other. The
--   application check produces a typed, participant-facing refusal; this one
--   produces a hard refusal nobody can route around.
--
-- WHAT THIS DOES NOT DECIDE
--
--   Only the ROUTE half. The participant half — matter ownership, the stage-8
--   verification snapshot, entitlement idempotency, private storage — is a fact
--   about a matter, not a route, and it already lives in consumer_briefcase_items,
--   the render-job tables and the phase-52/53/55 bindings. Duplicating it here
--   would create a second answer to a question those tables already answer
--   correctly. rcap_grade_a_admits() therefore answers "may this ROUTE be sold to
--   anyone", and the caller still has to have proven "may THIS participant buy it".
--
-- WHAT IT CHANGES BEFORE ANYTHING CALLS IT
--
--   Nothing. Two tables and two functions, all new. No existing RLS policy,
--   grant, column or function is altered. Every existing admission stays exactly
--   as permissive as it is today until a route is wired to call
--   rcap_grade_a_admits(), which is a separate authorized change.
--
-- Applied after: 51, 52, 53, 55. It references no earlier object.

begin;

-------------------------------------------------------------------------------
-- 1. The controlling registry.
--
-- One row per (route_id, version); exactly one non-superseded version per route,
-- enforced by a partial unique index rather than by application discipline. Two
-- live versions is an ambiguous authority, and an ambiguous authority must bind
-- nothing rather than bind arbitrarily.
--
-- Proof identities are hashes, not booleans. A boolean "reviewed" column is
-- exactly the assertable authority this contract removes: a hash can be
-- re-derived and disagreed with, a boolean cannot.
-------------------------------------------------------------------------------

create table if not exists public.rcap_grade_a_fulfillment_records (
  id                               uuid primary key default gen_random_uuid(),
  schema_version                   text        not null,
  record_id                        text        not null unique,
  route_id                         text        not null,
  jurisdiction                     text        not null,
  pathway_id                       text        not null,
  packet_family_id                 text,
  service_disposition              text        not null,
  version                          integer     not null,
  effective_from                   date        not null,
  superseded_by                    text,
  superseded_at                    timestamptz,

  revoked                          boolean     not null default false,
  revocation_reason                text,
  revoked_at                       timestamptz,
  revoked_by                       text,

  legal_authority_record_id        text        not null,
  legal_authority_version          text        not null,
  legal_authority_status           text        not null,
  legal_authority_effective_date   date        not null,
  legal_authority_scope_sha256     text        not null,

  packet_specification_id          text        not null,
  packet_specification_sha256      text        not null,
  packet_specification_complete    boolean     not null,

  -- [{ sourceId, sha256, heldInRepository }]
  official_sources                 jsonb       not null default '[]'::jsonb,

  provider_id                      text        not null,
  renderer_kind                    text        not null,
  renderer_version                 text        not null,
  provider_image_digest            text        not null,

  fixture_id                       text        not null,
  fixture_sha256                   text        not null,
  fixture_deterministic            boolean     not null,

  artifact_validation_state        text        not null,
  artifact_sha256                  text,
  artifact_validated_at            timestamptz,

  -- The fileability proof, added with schema v2. A packet can be perfectly
  -- provenanced and still unfileable: a motion with no proposed order where one
  -- is required, a filing with no service list, an application with no
  -- destination or fee instructions. Stored as one jsonb document keyed by
  -- dimension, each { state, basis }, because the set of dimensions is a product
  -- decision that will grow and a column per dimension would make growing it a
  -- migration every time.
  packet_completeness              jsonb,

  visual_review_state              text        not null,
  visual_pages_reviewed            integer     not null default 0,
  visual_page_count                integer     not null default 0,
  visual_evidence_sha256           text,
  visual_reviewed_by               text,
  visual_reviewed_at               timestamptz,

  output_legal_review_state        text        not null,
  output_legal_reviewer_id         text,
  output_legal_decided_at          timestamptz,
  output_legal_scope_sha256        text,

  final_verification_state         text        not null,
  final_verification_verifier_id   text,
  final_verification_inputs_sha256 text,
  final_verification_at            timestamptz,

  record_sha256                    text        not null,
  created_at                       timestamptz not null default now(),

  constraint rcap_grade_a_version_positive
    check (version >= 1),
  constraint rcap_grade_a_route_matches_jurisdiction
    check (route_id = jurisdiction || ':' || pathway_id),
  constraint rcap_grade_a_schema_known
    check (schema_version in (
      'rcap-grade-a-fulfillment-authority/v1',
      'rcap-grade-a-fulfillment-authority/v2')),
  -- v2 is the schema that HAS the fileability proof, so a v2 row without one is
  -- refused at write time rather than evaluated and puzzled over.
  constraint rcap_grade_a_v2_carries_completeness
    check (schema_version <> 'rcap-grade-a-fulfillment-authority/v2' or packet_completeness is not null),
  constraint rcap_grade_a_service_disposition_known
    check (service_disposition in (
      'paid_packet_intended', 'non_filing_guidance', 'product_scope_exclusion',
      'legally_unavailable', 'exact_external_deferral')),
  constraint rcap_grade_a_legal_status_known
    check (legal_authority_status in (
      'approved_by_decision_owner', 'pending', 'withdrawn', 'superseded')),
  constraint rcap_grade_a_artifact_state_known
    check (artifact_validation_state in ('validated', 'failed', 'not_run')),
  constraint rcap_grade_a_review_states_known
    check (visual_review_state in ('passed', 'failed', 'pending', 'not_required')
       and output_legal_review_state in ('passed', 'failed', 'pending', 'not_required')),
  constraint rcap_grade_a_final_verification_state_known
    check (final_verification_state in ('bound', 'unbound', 'failed')),
  -- A revocation nobody signed and gave no reason for is not a revocation anyone
  -- can audit.
  constraint rcap_grade_a_revocation_is_attributed
    check (not revoked or (revocation_reason is not null and revoked_by is not null and revoked_at is not null)),
  constraint rcap_grade_a_unique_route_version unique (route_id, version)
);

create unique index if not exists rcap_grade_a_one_current_version_per_route
  on public.rcap_grade_a_fulfillment_records (route_id)
  where superseded_by is null;

-------------------------------------------------------------------------------
-- 2. Immutable, hash-chained history.
--
-- Append-only by trigger, not by convention. Each row names the record hash it
-- produced and the hash it superseded, so a rewritten past is a broken link
-- rather than a plausible story. History that can be edited answers no audit
-- question, so UPDATE and DELETE are refused outright.
-------------------------------------------------------------------------------

create table if not exists public.rcap_grade_a_fulfillment_history (
  id                        uuid primary key default gen_random_uuid(),
  record_id                 text        not null,
  route_id                  text        not null,
  version                   integer     not null,
  change_kind               text        not null,
  changed_at                timestamptz not null default now(),
  changed_by                text        not null,
  reason                    text        not null,
  record_sha256             text        not null,
  supersedes_record_sha256  text,

  constraint rcap_grade_a_history_change_kind_known
    check (change_kind in ('created', 'proof_added', 'proof_invalidated', 'revoked', 'superseded', 'reinstated')),
  constraint rcap_grade_a_history_is_attributed
    check (btrim(changed_by) <> '' and btrim(reason) <> ''),
  constraint rcap_grade_a_history_unique_version unique (record_id, version)
);

create or replace function public.rcap_grade_a_history_is_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception 'rcap_grade_a_fulfillment_history is append-only; % is refused', tg_op;
end;
$$;

drop trigger if exists rcap_grade_a_history_no_update on public.rcap_grade_a_fulfillment_history;
create trigger rcap_grade_a_history_no_update
  before update on public.rcap_grade_a_fulfillment_history
  for each row execute function public.rcap_grade_a_history_is_append_only();

drop trigger if exists rcap_grade_a_history_no_delete on public.rcap_grade_a_fulfillment_history;
create trigger rcap_grade_a_history_no_delete
  before delete on public.rcap_grade_a_fulfillment_history
  for each row execute function public.rcap_grade_a_history_is_append_only();

-------------------------------------------------------------------------------
-- 3. The eligibility function.
--
-- The same rule the application states, expressed where it cannot be skipped.
-- Returns a state rather than a bare boolean, so a caller wanting "why" does not
-- have to guess.
--
-- What it deliberately does NOT consult: a jurisdiction allow-list, a legacy
-- generator, a profile flag, or a packet-family name. A legacy generator's
-- existence is not commercial permission and a family name is not proof.
-------------------------------------------------------------------------------

-- The nine specification dimensions, each { state, basis }. A dimension that is
-- absent, missing, or asserted with no basis is a gap; a dimension nobody stated
-- a basis for is a dimension nobody looked at. filingApplication may never be
-- waived — a packet with no filing is not a packet.
create or replace function public.rcap_grade_a_completeness_gap_count(p_completeness jsonb)
returns integer
language sql
immutable
set search_path = public, pg_temp
as $$
  with dimensions as (
    select unnest(array[
      'filingApplication', 'proposedOrder', 'attachmentsAndSchedules',
      'serviceAndNotice', 'filingDestination', 'feeAndWaiverInstructions',
      'copyRequirements', 'postFilingSteps', 'hearingAndObjectionStopConditions'
    ]) as dimension
  ),
  entries as (
    select
      d.dimension,
      p_completeness -> d.dimension                             as entry,
      p_completeness -> d.dimension ->> 'state'                 as state,
      btrim(coalesce(p_completeness -> d.dimension ->> 'basis', '')) as basis
    from dimensions d
  ),
  dimension_gaps as (
    select count(*)::integer as n
    from entries
    where entry is null                                        -- nobody answered
       or state not in ('covered', 'not_required')             -- missing, or a state we do not know
       or (state = 'not_required' and dimension = 'filingApplication')  -- never waivable
       or basis = ''                                           -- answered with nothing behind it
  ),
  pleading_gap as (
    select case
      when (p_completeness -> 'customPleadingAuthority' ->> 'required')::boolean is true
       and ((p_completeness -> 'customPleadingAuthority' ->> 'approved')::boolean is not true
            or btrim(coalesce(p_completeness -> 'customPleadingAuthority' ->> 'authorityId', '')) = '')
      then 1 else 0
    end as n
  ),
  artifact_gap as (
    select case
      when lower(coalesce(p_completeness -> 'filingFormatArtifact' ->> 'format', '')) <> 'pdf'
        or btrim(coalesce(p_completeness -> 'filingFormatArtifact' ->> 'sha256', '')) = ''
        or coalesce((p_completeness -> 'filingFormatArtifact' ->> 'pageCount')::integer, 0) <= 0
      then 1 else 0
    end as n
  )
  -- A null document, or one with no specification hash, is not "zero gaps"; it
  -- is a document that proves nothing. 999 rather than 0 so a caller comparing
  -- "> 0" cannot read absence as completeness.
  select case
    when p_completeness is null then 999
    when btrim(coalesce(p_completeness ->> 'specificationSha256', '')) = '' then 999
    else (select n from dimension_gaps)
       + (select n from pleading_gap)
       + (select n from artifact_gap)
  end;
$$;

create or replace function public.rcap_grade_a_authority_state(p_route_id text)
returns text
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select coalesce((
    select case
      when r.superseded_by is not null then 'SUPERSEDED'
      when r.revoked then 'REVOKED'
      when r.service_disposition <> 'paid_packet_intended' then 'INCOMPLETE'
      when r.legal_authority_status <> 'approved_by_decision_owner' then 'INCOMPLETE'
      when not r.packet_specification_complete then 'INCOMPLETE'
      when coalesce(r.packet_specification_sha256, '') = '' then 'INCOMPLETE'
      when jsonb_array_length(r.official_sources) = 0 then 'INCOMPLETE'
      when exists (
        select 1 from jsonb_array_elements(r.official_sources) as s
        where coalesce((s ->> 'heldInRepository')::boolean, false) is not true
           or coalesce(s ->> 'sha256', '') = ''
      ) then 'INCOMPLETE'
      when coalesce(r.provider_image_digest, '') = '' or coalesce(r.renderer_version, '') = '' then 'INCOMPLETE'
      when not r.fixture_deterministic or coalesce(r.fixture_sha256, '') = '' then 'INCOMPLETE'
      when r.artifact_validation_state <> 'validated' or coalesce(r.artifact_sha256, '') = '' then 'INCOMPLETE'
      -- Fileability, for the schema that carries it. A v1 row is not forgiven
      -- for lacking it: rcap_grade_a_admits() refuses every v1 row outright.
      when r.schema_version = 'rcap-grade-a-fulfillment-authority/v2'
           and public.rcap_grade_a_completeness_gap_count(r.packet_completeness) > 0 then 'INCOMPLETE'
      -- 'not_required' is a legitimate visual-review outcome elsewhere in this
      -- product. Not here: a Grade-A packet is filed with a court, and every page
      -- of it is reviewed.
      when r.visual_review_state <> 'passed' then 'INCOMPLETE'
      when r.visual_page_count <= 0 or r.visual_pages_reviewed < r.visual_page_count then 'INCOMPLETE'
      when coalesce(r.visual_reviewed_by, '') = '' or coalesce(r.visual_evidence_sha256, '') = '' then 'INCOMPLETE'
      when r.output_legal_review_state <> 'passed' then 'INCOMPLETE'
      when coalesce(r.output_legal_reviewer_id, '') = '' or coalesce(r.output_legal_scope_sha256, '') = '' then 'INCOMPLETE'
      when r.final_verification_state <> 'bound' then 'INCOMPLETE'
      when coalesce(r.final_verification_inputs_sha256, '') = '' or coalesce(r.final_verification_verifier_id, '') = '' then 'INCOMPLETE'
      else 'COMPLETE_PACKET_PROVEN'
    end
    from public.rcap_grade_a_fulfillment_records r
    where r.route_id = p_route_id
      and r.superseded_by is null
    limit 1
  ), 'NO_RECORD');
$$;

-- The one boolean, derived from the one state, plus the admission schema floor.
-- A route with no record is false: "unsupported routes fail closed" at the
-- database too. A v1 row is false whatever its state — being evaluable is not
-- being sellable, and a row written before fileability was a question cannot
-- answer it.
--
-- Staleness is NOT evaluated here: the observation of the current world lives in
-- the repository, not in this database, so a row that passes this function may
-- still be STALE at the application. The asymmetry is intentional and safe in one
-- direction only — the database is never MORE permissive than the application,
-- because every application denial is also a denial here.
create or replace function public.rcap_grade_a_admits(p_route_id text)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.rcap_grade_a_fulfillment_records r
    where r.route_id = p_route_id
      and r.superseded_by is null
      and r.schema_version = 'rcap-grade-a-fulfillment-authority/v2'
  ) and public.rcap_grade_a_authority_state(p_route_id) = 'COMPLETE_PACKET_PROVEN';
$$;

-------------------------------------------------------------------------------
-- 4. Privileges.
--
-- Writes are not granted to anon or authenticated at all: a participant cannot
-- create, amend or revoke an authority over their own route, which is the point.
-- With RLS enabled and no policy, anon and authenticated see nothing and write
-- nothing; service_role bypasses RLS. A read policy for an internal-admin role is
-- a separate, explicitly authorized change.
-------------------------------------------------------------------------------

revoke all on public.rcap_grade_a_fulfillment_records from anon, authenticated;
revoke all on public.rcap_grade_a_fulfillment_history from anon, authenticated;

alter table public.rcap_grade_a_fulfillment_records enable row level security;
alter table public.rcap_grade_a_fulfillment_history enable row level security;

commit;
