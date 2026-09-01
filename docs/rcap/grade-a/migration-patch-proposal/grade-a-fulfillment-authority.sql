-- Grade-A fulfillment authority — MIGRATION PATCH PROPOSAL (not applied)
--
-- This file is deliberately unnumbered and deliberately outside
-- supabase/migrations/. Shared migration ordering is captain-owned; Lane B does
-- not write into the apply order. Number it and move it when the captain
-- assigns the slot.
--
-- Why the authority wants a database side at all
--
--   The application module in src/lib/rcap/fulfillment/ is the authority the
--   product reads. It is correct today. The database objects below exist for the
--   same reason phase 52's RPC exists: the check that actually defends the money
--   is the one that holds even if the application is wrong. An admission point
--   that forgets to call admitCommercial() should still be unable to record a
--   commercial consumption against an unproven route.
--
--   The two are duplicated on purpose and neither is a substitute for the other.
--   The application check produces a typed, participant-facing refusal; the
--   database check produces a hard refusal nobody can route around.
--
-- What this proposal does NOT do
--
--   It does not touch RLS on any existing table, does not change any existing
--   grant, does not alter Stripe behaviour, and does not modify the consumer
--   payment path. It adds two tables and two functions, all new. Every existing
--   admission stays exactly as permissive as it is today until a separate,
--   explicitly authorized change makes a route call rcap_grade_a_admits().
--
-- Applied after: 51, 52, 53, 55 (it references no earlier object, so the
-- ordering requirement is only that the rcap schema conventions exist).

begin;

-------------------------------------------------------------------------------
-- 1. The controlling registry.
--
-- One row per (route_id, version). Exactly one non-superseded version per route
-- is enforced by a partial unique index rather than by application discipline,
-- because two live versions is an ambiguous authority and an ambiguous authority
-- must bind nothing rather than bind arbitrarily.
--
-- Proof identities are stored as hashes, not as booleans. A boolean "reviewed"
-- column would be exactly the client-controlled authority this contract exists
-- to remove: a hash can be re-derived and disagreed with, a boolean cannot.
-------------------------------------------------------------------------------

create table if not exists public.rcap_grade_a_fulfillment_records (
  id                              uuid primary key default gen_random_uuid(),
  schema_version                  text        not null,
  record_id                       text        not null unique,
  route_id                        text        not null,
  jurisdiction                    text        not null,
  pathway_id                      text        not null,
  packet_family_id                text,
  service_disposition             text        not null,
  version                         integer     not null,
  effective_from                  date        not null,
  superseded_by                   text,
  superseded_at                   timestamptz,

  revoked                         boolean     not null default false,
  revocation_reason               text,
  revoked_at                      timestamptz,
  revoked_by                      text,

  legal_authority_record_id       text        not null,
  legal_authority_version         text        not null,
  legal_authority_status          text        not null,
  legal_authority_effective_date  date        not null,
  legal_authority_scope_sha256    text        not null,

  packet_specification_id         text        not null,
  packet_specification_sha256     text        not null,
  packet_specification_complete   boolean     not null,

  -- [{ sourceId, sha256, heldInRepository }]
  official_sources                jsonb       not null default '[]'::jsonb,

  provider_id                     text        not null,
  renderer_kind                   text        not null,
  renderer_version                text        not null,
  provider_image_digest           text        not null,

  fixture_id                      text        not null,
  fixture_sha256                  text        not null,
  fixture_deterministic           boolean     not null,

  artifact_validation_state       text        not null,
  artifact_sha256                 text,
  artifact_validated_at           timestamptz,

  visual_review_state             text        not null,
  visual_pages_reviewed           integer     not null default 0,
  visual_page_count               integer     not null default 0,
  visual_evidence_sha256          text,
  visual_reviewed_by              text,
  visual_reviewed_at              timestamptz,

  output_legal_review_state       text        not null,
  output_legal_reviewer_id        text,
  output_legal_decided_at         timestamptz,
  output_legal_scope_sha256       text,

  final_verification_state        text        not null,
  final_verification_verifier_id  text,
  final_verification_inputs_sha256 text,
  final_verification_at           timestamptz,

  record_sha256                   text        not null,
  created_at                      timestamptz not null default now(),

  constraint rcap_grade_a_version_positive
    check (version >= 1),
  constraint rcap_grade_a_route_matches_jurisdiction
    check (route_id = jurisdiction || ':' || pathway_id),
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
  -- A revocation with no reason and no author is not a revocation anyone can
  -- audit. It is refused at write time rather than tolerated and puzzled over.
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
-- rather than a plausible story. The two triggers below refuse UPDATE and
-- DELETE outright — history that can be edited answers no audit question.
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
-- The same rule the application module states, expressed where it cannot be
-- skipped. It returns the state, never a bare boolean, so a caller that wants
-- "why" does not have to guess.
--
-- Note what it does NOT do: it does not consult a jurisdiction allow-list, a
-- legacy generator, a profile flag or a packet-family name. A legacy generator's
-- existence is not commercial permission, and a family name is not proof.
-------------------------------------------------------------------------------

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
      -- 'not_required' is a legitimate visual-review outcome elsewhere in this
      -- product. Not here: a Grade-A packet is filed with a court, and every
      -- page of it is reviewed.
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
  ), 'UNSUPPORTED_ROUTE');
$$;

-- The one boolean, derived from the one state. A route with no record is false,
-- which is what "unsupported routes fail closed" means at the database.
--
-- Staleness is NOT evaluated here: the observation of the current world lives in
-- the repository, not in this database, so a row that passes this function may
-- still be STALE at the application. That asymmetry is intentional and safe in
-- one direction only — the database is never more permissive than the
-- application, because every application denial is also a denial here.
create or replace function public.rcap_grade_a_admits(p_route_id text)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select public.rcap_grade_a_authority_state(p_route_id) = 'COMPLETE_PACKET_PROVEN';
$$;

-------------------------------------------------------------------------------
-- 4. Privileges.
--
-- Reads are open to the server roles that make admission decisions. Writes are
-- not granted to anon or authenticated at all: a participant cannot create,
-- amend or revoke an authority over their own route, which is the whole point.
-- Grant writes to the service role only, through whatever seeding path the
-- captain's apply order establishes.
-------------------------------------------------------------------------------

revoke all on public.rcap_grade_a_fulfillment_records from anon, authenticated;
revoke all on public.rcap_grade_a_fulfillment_history from anon, authenticated;

alter table public.rcap_grade_a_fulfillment_records enable row level security;
alter table public.rcap_grade_a_fulfillment_history enable row level security;

-- No policy is created. With RLS enabled and no policy, anon and authenticated
-- see nothing and write nothing; service_role bypasses RLS. A future read
-- policy for an internal-admin role is a separate, explicitly authorized change.

commit;
